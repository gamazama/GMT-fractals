#!/usr/bin/env node
// extract-bugs.mjs
// Generates dev/docs/modules/bugs.md from the "Known issues / Phase 2 carry-in"
// section of every dev/docs/modules/**/*.md, flattening entries categorized as
// "production bug" into a single index with backlinks to the originating module
// doc + the originating followup.
//
// Input: dev/docs/modules/**/*.md (Phase 2 module docs).
// Output: dev/docs/modules/bugs.md
//
// Heuristic for "this is a bug entry":
//   - Lives under a heading matching /known issues|phase 2 carry-in/i.
//   - The entry line starts with "- **Bug:**" OR contains "production bug" inline.
//   - Followup link patterns of the form "(see [q-NNN](...))" are extracted as
//     evidence_refs.
//
// No npm deps.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
// REPO_ROOT is dev/ (the gmt-engine working dir); module docs live at dev/docs/modules/.
const MODULES_DIR = resolve(REPO_ROOT, 'docs/modules');
const ARCHIVE_DIR = resolve(REPO_ROOT, 'docs/audit-2026-05-20/archive');
const POLICY_DIR = resolve(REPO_ROOT, 'docs/policy');
// Source code roots scanned for `@bug PRODUCTION:` JSDoc markers — see scanSourceForBugMarkers().
const SOURCE_ROOTS = [
  resolve(REPO_ROOT, 'engine'),
  resolve(REPO_ROOT, 'engine-gmt'),
  resolve(REPO_ROOT, 'app-gmt'),
  resolve(REPO_ROOT, 'components'),
  resolve(REPO_ROOT, 'hooks'),
  resolve(REPO_ROOT, 'store'),
  resolve(REPO_ROOT, 'utils'),
  resolve(REPO_ROOT, 'fluid-toy'),
  resolve(REPO_ROOT, 'fractal-toy'),
  resolve(REPO_ROOT, 'mesh-export'),
];
const OUT = resolve(MODULES_DIR, 'bugs.md');

function die(msg, code = 1) {
  process.stderr.write(`extract-bugs: ${msg}\n`);
  process.exit(code);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'bugs.md') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile() && name.endsWith('.md')) out.push(p);
  }
  return out;
}

function extractKnownIssuesBlock(text) {
  const lines = text.split(/\r?\n/);
  let inBlock = false;
  let depth = 0;
  const out = [];
  for (const ln of lines) {
    const headingMatch = /^(#+)\s+(.+)$/.exec(ln);
    if (headingMatch) {
      const lvl = headingMatch[1].length;
      const txt = headingMatch[2];
      if (/known\s+issues|phase\s*2\s+carry/i.test(txt)) {
        inBlock = true;
        depth = lvl;
        continue;
      }
      if (inBlock && lvl <= depth) {
        break; // next sibling or higher heading ends the block
      }
    }
    if (inBlock) out.push(ln);
  }
  return out.join('\n').trim();
}

function isBugEntry(line) {
  if (!/^\s*[-*]\s/.test(line)) return false;
  if (/\bproduction\s+bug\b/i.test(line)) return true;
  if (/^\s*[-*]\s+\*\*bug:?\*\*/i.test(line)) return true;
  if (/^\s*[-*]\s+\[bug\]/i.test(line)) return true;
  return false;
}

function extractFollowupRefs(text) {
  const refs = new Set();
  const re = /\bq-(\d+)/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.add(`q-${m[1]}`);
  return [...refs];
}

function extractFileAnchor(text) {
  const m = /([A-Za-z0-9_./\-]+\.[A-Za-z0-9]+):(\d+)(?:-(\d+))?/.exec(text);
  return m ? `${m[1]}:${m[2]}${m[3] ? '-' + m[3] : ''}` : null;
}

// Scan source files for `@bug PRODUCTION:` JSDoc markers. Each marker becomes
// a synthetic bug entry. This is the canonical agent-discoverable bug surface
// per CLAUDE.md Documentation Conventions — `extract-bugs.mjs` walking module
// docs alone misses bugs annotated only at source.
function walkSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const exts = /\.(ts|tsx|js|jsx|mjs)$/;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'build') continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walkSourceFiles(p));
    else if (st.isFile() && exts.test(name)) out.push(p);
  }
  return out;
}

function scanSourceForBugMarkers() {
  const out = []; // {path, line, text}
  for (const root of SOURCE_ROOTS) {
    const files = walkSourceFiles(root);
    for (const abs of files) {
      let text;
      try { text = readFileSync(abs, 'utf8'); } catch { continue; }
      if (!/@bug\s+PRODUCTION:/i.test(text)) continue;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (!/@bug\s+PRODUCTION:/i.test(lines[i])) continue;
        // Capture the @bug line + up to 4 following lines if they continue the JSDoc paragraph
        let entry = lines[i].replace(/^\s*\*?\s*/, '').trim();
        for (let j = 1; j <= 4; j++) {
          const next = lines[i + j];
          if (!next) break;
          // Continue if the next line is JSDoc-comment-shape but doesn't start a new tag
          if (!/^\s*\*/.test(next)) break;
          if (/@\w+/.test(next.replace(/^\s*\*\s*/, ''))) break;
          const trimmed = next.replace(/^\s*\*\s?/, '').trim();
          if (!trimmed) break;
          entry += ' ' + trimmed;
        }
        const rel = relative(REPO_ROOT, abs).replace(/\\/g, '/');
        out.push({ path: rel, line: i + 1, text: entry });
      }
    }
  }
  return out;
}

function main() {
  if (!existsSync(MODULES_DIR)) {
    die(`module docs dir does not exist yet: ${MODULES_DIR}\n(this is expected if Phase 2 hasn't started — re-run after at least one module doc is written)`, 0);
  }
  // Walk live module docs + policy docs + archived audit docs (the latter
  // captured the audit's bug findings; archiving moved them but the findings
  // remain authoritative until acted on).
  const docs = [
    ...walk(MODULES_DIR),
    ...walk(POLICY_DIR),
    ...walk(ARCHIVE_DIR),
  ];
  // Also harvest `@bug PRODUCTION:` markers from source — these are the canonical
  // agent-discoverable bug surface and trump anything in module-doc prose.
  const sourceMarkers = scanSourceForBugMarkers();
  if (!docs.length && !sourceMarkers.length) die('no module docs and no source @bug PRODUCTION: markers found', 0);

  const bugsByDoc = [];
  for (const docPath of docs) {
    const text = readFileSync(docPath, 'utf8');
    const block = extractKnownIssuesBlock(text);
    if (!block) continue;
    const bugLines = block.split(/\r?\n/).filter(isBugEntry);
    if (!bugLines.length) continue;
    bugsByDoc.push({ docPath, bugLines });
  }

  let total = 0;
  const sections = [];

  // ── @bug PRODUCTION: markers from source (canonical, agent-discoverable) ──
  if (sourceMarkers.length) {
    sections.push(`## Source-annotated bugs (\`@bug PRODUCTION:\`)`);
    sections.push('');
    sections.push(`_Authoritative — grepped from \`@bug PRODUCTION:\` JSDoc markers at the source site. Remove the marker after the bug is fixed (see CLAUDE.md "Annotation maintenance")._`);
    sections.push('');
    for (const m of sourceMarkers) {
      total++;
      const cleanText = m.text.replace(/^@bug\s+PRODUCTION:\s*/i, '');
      sections.push(`- \`${m.path}:${m.line}\` — ${cleanText}`);
    }
    sections.push('');
  }

  // ── Module-doc Known Issues bullets ──
  for (const { docPath, bugLines } of bugsByDoc) {
    const rel = relative(MODULES_DIR, docPath).replace(/\\/g, '/');
    sections.push(`## ${rel}`);
    for (const ln of bugLines) {
      total++;
      const trimmed = ln.replace(/^\s*[-*]\s+/, '').trim();
      const anchor = extractFileAnchor(trimmed);
      const fups = extractFollowupRefs(trimmed);
      const anchorLine = anchor ? `  - Source: \`${anchor}\`` : '';
      const fupLine = fups.length ? `  - Followups: ${fups.map(q => `[${q}](../../plans/doc-audit-state/survey/_followups/${q}.md)`).join(', ')}` : '';
      sections.push(`- ${trimmed}`);
      if (anchorLine) sections.push(anchorLine);
      if (fupLine) sections.push(fupLine);
    }
    sections.push('');
  }

  if (!total) {
    const empty = `# Production bugs surfaced by Phase 2 module-doc audit\n\n_No source \`@bug PRODUCTION:\` markers or module-doc "Known issues" entries found._\n\n_Regenerated: ${new Date().toISOString()}_\n`;
    if (!existsSync(MODULES_DIR)) mkdirSync(MODULES_DIR, { recursive: true });
    writeFileSync(OUT, empty, 'utf8');
    process.stdout.write(`wrote ${relative(REPO_ROOT, OUT)} (0 bugs)\n`);
    return;
  }

  const fromDocs = total - sourceMarkers.length;
  const header = `# Production bugs surfaced by Phase 2 module-doc audit\n\n_${total} bug entr${total === 1 ? 'y' : 'ies'} — ${sourceMarkers.length} from source \`@bug PRODUCTION:\` markers + ${fromDocs} from ${bugsByDoc.length} module doc${bugsByDoc.length === 1 ? '' : 's'}. Regenerated ${new Date().toISOString()}. Sources of truth: source-site \`@bug PRODUCTION:\` annotations (greppable) + module docs' "Known issues" sections. Generated by \`plans/doc-audit-state/scripts/extract-bugs.mjs\`._\n`;
  const body = sections.join('\n').trim() + '\n';
  if (!existsSync(MODULES_DIR)) mkdirSync(MODULES_DIR, { recursive: true });
  writeFileSync(OUT, header + '\n' + body, 'utf8');
  process.stdout.write(`wrote ${relative(REPO_ROOT, OUT)} (${total} bugs: ${sourceMarkers.length} source-annotated + ${fromDocs} from ${bugsByDoc.length} docs)\n`);
}

main();
