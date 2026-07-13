#!/usr/bin/env node
// verify-doc.mjs <path-to-module-doc.md>
// Post-write verification for an audit-produced module doc.
// Exit codes:
//   0 PASS
//   1 usage / IO error
//   2 frontmatter missing/malformed (reports missing field)
//   3 symbol verification failure (public_api entry not found in source)
//   4 line-anchor verification failure (citation points to missing file or out-of-range line)
//   5 partial read-range (warning, not hard failure)
//
// No npm deps.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

function die(code, msg) {
  process.stderr.write(`verify-doc: ${msg}\n`);
  process.exit(code);
}

function resolveSource(p) {
  if (isAbsolute(p)) return p;
  return resolve(REPO_ROOT, p);
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  const block = text.slice(3, end).replace(/^\r?\n/, '');
  const body = text.slice(end + 4).replace(/^\r?\n/, '');
  const fm = {};
  // line-by-line, support `key: value` and `key: [a, b, c]` and block lists with leading '-'
  const lines = block.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = m[2];
    if (rest.trim() === '') {
      // block list (lines starting with '- ')
      const list = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        list.push(lines[i].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
        i++;
      }
      fm[key] = list;
      continue;
    }
    if (rest.trim().startsWith('[') && rest.trim().endsWith(']')) {
      const inner = rest.trim().slice(1, -1).trim();
      fm[key] = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      fm[key] = rest.trim().replace(/^["']|["']$/g, '');
    }
    i++;
  }
  return { fm, body };
}

function countLines(absPath) {
  const buf = readFileSync(absPath);
  if (buf.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++;
  if (buf[buf.length - 1] !== 0x0a) n++;
  return n;
}

function checkSymbolInSource(sourceText, symbol) {
  if (symbol === 'default') {
    return /\bexport\s+default\b/.test(sourceText);
  }
  // Allow "type X" or just an identifier
  const cleaned = symbol.replace(/^type\s+/, '').trim();
  // Word-boundary search.
  const re = new RegExp(`\\b${cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return re.test(sourceText);
}

function main() {
  const docPath = process.argv[2];
  if (!docPath) die(1, 'usage: verify-doc.mjs <path-to-doc.md>');
  if (!existsSync(docPath)) die(1, `doc not found: ${docPath}`);

  const text = readFileSync(docPath, 'utf8');
  const parsed = parseFrontmatter(text);
  if (!parsed) die(2, 'missing or malformed frontmatter (no leading --- block)');

  const { fm, body } = parsed;

  // 1. Frontmatter completeness
  const required = ['source', 'lines', 'last_verified_sha', 'audited', 'audited_by', 'public_api', 'depends_on'];
  for (const k of required) {
    if (!(k in fm)) die(2, `missing frontmatter field: ${k}`);
  }
  if (!Array.isArray(fm.public_api)) die(2, 'public_api must be a list');
  if (!Array.isArray(fm.depends_on)) die(2, 'depends_on must be a list');

  // 2. Symbol verification
  // Symbols may live in `source` OR in any file under `additional_sources` (optional list).
  // A symbol passes if it word-boundary-matches in any of those files.
  const sourceAbs = resolveSource(fm.source);
  if (!existsSync(sourceAbs)) die(3, `source file does not exist: ${fm.source}`);
  const additional = Array.isArray(fm.additional_sources) ? fm.additional_sources : [];
  const haystacks = [{ path: fm.source, text: readFileSync(sourceAbs, 'utf8') }];
  for (const p of additional) {
    const abs = resolveSource(p);
    if (!existsSync(abs)) die(3, `additional_sources file does not exist: ${p}`);
    haystacks.push({ path: p, text: readFileSync(abs, 'utf8') });
  }
  const missing = [];
  for (const sym of fm.public_api) {
    if (!sym) continue;
    if (!haystacks.some(h => checkSymbolInSource(h.text, sym))) missing.push(sym);
  }
  if (missing.length) {
    const where = additional.length
      ? `${fm.source} or any of ${additional.join(', ')}`
      : fm.source;
    die(3, `symbols missing from ${where}: ${missing.join(', ')}`);
  }

  // 3. Line-anchor verification
  // Match patterns like `path/to/file.ts:42` or `path/to/file.ts:42-100`.
  // Restrict to paths containing a `/` or starting with a known extension boundary;
  // accept identifiers + dots + slashes before the colon.
  const anchorRe = /([A-Za-z0-9_./\-]+\.[A-Za-z0-9]+):(\d+)(?:-(\d+))?/g;
  const seen = new Set();
  let m;
  while ((m = anchorRe.exec(body)) !== null) {
    const ref = `${m[1]}:${m[2]}${m[3] ? '-' + m[3] : ''}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    const p = m[1];
    const startLn = parseInt(m[2], 10);
    const endLn = m[3] ? parseInt(m[3], 10) : startLn;
    // Skip self-references / non-source-like (heuristic: must look like a project path with a slash, or be a filename we can find)
    const abs = resolveSource(p);
    if (!existsSync(abs)) {
      // Tolerate references that are not relative to repo root but match a known extension only if they exist
      die(4, `line-anchor references missing file: ${ref}`);
    }
    let st;
    try { st = statSync(abs); } catch { die(4, `cannot stat ${ref}`); }
    if (!st.isFile()) die(4, `line-anchor target is not a file: ${ref}`);
    const lc = countLines(abs);
    if (endLn > lc) die(4, `line-anchor ${ref} exceeds file length (${lc} lines)`);
  }

  // 4. Read-range completeness
  // `lines: 1-400` or `lines: 1-612`
  let partial = false;
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(String(fm.lines).trim());
  if (rangeMatch) {
    const declaredEnd = parseInt(rangeMatch[2], 10);
    const actual = countLines(sourceAbs);
    if (declaredEnd < actual) {
      process.stderr.write(`warning: declared range ends at ${declaredEnd} but source has ${actual} lines (partial)\n`);
      partial = true;
    }
  }

  process.stdout.write('PASS\n');
  process.stdout.write('  [x] frontmatter\n');
  process.stdout.write('  [x] symbol verification\n');
  process.stdout.write('  [x] line-anchor verification\n');
  process.stdout.write(`  [${partial ? '!' : 'x'}] read-range completeness${partial ? ' (partial)' : ''}\n`);
  if (partial) process.exit(5);
  process.exit(0);
}

try {
  main();
} catch (e) {
  die(1, e.message);
}
