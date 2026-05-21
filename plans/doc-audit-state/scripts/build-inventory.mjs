#!/usr/bin/env node
// build-inventory.mjs
// Walks `git ls-files` from the dev/ repo root, applies the exclusion ruleset,
// captures {path, bytes, lines, blob_sha} per surviving file, and writes
// dev/plans/doc-audit-state/file-inventory.yaml.
//
// Run from anywhere. Resolves dev/ as the parent of this script's grandparent.
// No npm deps.

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ -> doc-audit-state/ -> plans/ -> dev/
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const OUTPUT = join(REPO_ROOT, 'plans', 'doc-audit-state', 'file-inventory.yaml');

const MAX_BYTES = 500 * 1024;

const EXCLUDED_PREFIXES = ['debug/', 'dist/', 'node_modules/', 'public/'];
const EXCLUDED_CONTAINS = ['/reference/'];
const EXCLUDED_EXTS = new Set([
  '.frag',
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.webm', '.mp4', '.mp3', '.wav',
  '.ttf', '.woff', '.woff2',
  '.zip', '.bin', '.glb', '.gltf',
]);
const EXCLUDED_BASENAMES = new Set(['package-lock.json']);
// matched by suffix
const EXCLUDED_SUFFIXES = ['.snap', '.lock'];
// exact root-relative paths to exclude (legacy root files preserved but unused per CODEBASE_MAP)
const EXCLUDED_EXACT = new Set([
  'index.html',
  'App.tsx',
  'index.tsx',
  'index.css',
]);

function classify(relPath) {
  const norm = relPath.split(sep).join('/');
  if (EXCLUDED_EXACT.has(norm)) {
    return { excluded: true, rule: `exact:${norm}` };
  }
  for (const p of EXCLUDED_PREFIXES) {
    if (norm.startsWith(p)) return { excluded: true, rule: `prefix:${p}` };
  }
  for (const c of EXCLUDED_CONTAINS) {
    if (norm.includes(c)) return { excluded: true, rule: `contains:${c}` };
  }
  const base = norm.split('/').pop();
  if (EXCLUDED_BASENAMES.has(base)) {
    return { excluded: true, rule: `basename:${base}` };
  }
  const lower = base.toLowerCase();
  for (const suf of EXCLUDED_SUFFIXES) {
    if (lower.endsWith(suf)) return { excluded: true, rule: `suffix:${suf}` };
  }
  const dotIdx = base.lastIndexOf('.');
  if (dotIdx > 0) {
    const ext = base.slice(dotIdx).toLowerCase();
    if (EXCLUDED_EXTS.has(ext)) return { excluded: true, rule: `ext:${ext}` };
  }
  return { excluded: false, rule: null };
}

function gitLsFiles() {
  const out = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split(/\r?\n/).filter(Boolean);
}

function blobSha(absPath) {
  // git hash-object reads the file at path; use relative to be friendly to spaces
  const rel = relative(REPO_ROOT, absPath).split(sep).join('/');
  return execFileSync('git', ['hash-object', '--', rel], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function countLines(absPath, bytes) {
  if (bytes === 0) return 0;
  const buf = readFileSync(absPath);
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++;
  // count trailing line if file doesn't end in \n
  if (buf.length > 0 && buf[buf.length - 1] !== 0x0a) n++;
  return n;
}

function yamlString(s) {
  // Simple YAML string emitter: quote if it contains anything funky
  if (s === '') return '""';
  if (/^[A-Za-z0-9_./\-:+]+$/.test(s)) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function emitYaml(doc) {
  const lines = [];
  lines.push(`schema_version: ${doc.schema_version}`);
  lines.push(`generated_at: ${yamlString(doc.generated_at)}`);
  lines.push(`repo_root: ${yamlString(doc.repo_root)}`);
  lines.push(`total_files: ${doc.total_files}`);
  lines.push(`total_bytes: ${doc.total_bytes}`);
  lines.push('entries:');
  for (const e of doc.entries) {
    lines.push(`  - path: ${yamlString(e.path)}`);
    lines.push(`    bytes: ${e.bytes}`);
    lines.push(`    lines: ${e.lines}`);
    lines.push(`    blob_sha: ${yamlString(e.blob_sha)}`);
  }
  return lines.join('\n') + '\n';
}

function main() {
  const all = gitLsFiles();
  const exclusionBreakdown = new Map();
  const survivors = [];
  let oversize = 0;

  for (const rel of all) {
    const c = classify(rel);
    if (c.excluded) {
      exclusionBreakdown.set(c.rule, (exclusionBreakdown.get(c.rule) || 0) + 1);
      continue;
    }
    const abs = join(REPO_ROOT, rel);
    let st;
    try {
      st = statSync(abs);
    } catch (e) {
      process.stderr.write(`warn: cannot stat ${rel}: ${e.message}\n`);
      continue;
    }
    if (!st.isFile()) continue;
    if (st.size > MAX_BYTES) {
      oversize++;
      exclusionBreakdown.set('size:>500KB', (exclusionBreakdown.get('size:>500KB') || 0) + 1);
      continue;
    }
    survivors.push({ rel, abs, bytes: st.size });
  }

  const entries = [];
  let totalBytes = 0;
  for (const s of survivors) {
    const lines = countLines(s.abs, s.bytes);
    const sha = blobSha(s.abs);
    const path = s.rel.split(sep).join('/');
    entries.push({ path, bytes: s.bytes, lines, blob_sha: sha });
    totalBytes += s.bytes;
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const doc = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    repo_root: REPO_ROOT.split(sep).join('/'),
    total_files: entries.length,
    total_bytes: totalBytes,
    entries,
  };

  writeFileSync(OUTPUT, emitYaml(doc), 'utf8');

  process.stdout.write(`Wrote ${OUTPUT}\n`);
  process.stdout.write(`Total files (included): ${entries.length}\n`);
  process.stdout.write(`Total bytes:            ${totalBytes}\n`);
  process.stdout.write(`Exclusion breakdown:\n`);
  const breakdownEntries = [...exclusionBreakdown.entries()].sort((a, b) => b[1] - a[1]);
  for (const [rule, count] of breakdownEntries) {
    process.stdout.write(`  ${rule}: ${count}\n`);
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`build-inventory failed: ${e.message}\n`);
  process.exit(1);
}
