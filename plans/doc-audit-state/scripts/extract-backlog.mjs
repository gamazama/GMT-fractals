#!/usr/bin/env node
// extract-backlog.mjs
// Generates dev/docs/modules/backlog.md from two sources:
//   1. "Known issues" sections in dev/docs/modules/**/*.md — cleanup / drift /
//      dead-code entries (not bugs — bugs.md is a separate index).
//   2. Phase 1 survey docs at plans/doc-audit-state/survey/*.md — entries
//      starting with the canonical "Orphan-sweep candidate:" prefix.
//
// Output is a flat worklist for future cleanup/refactor passes.
//
// No npm deps.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const MODULES_DIR = resolve(REPO_ROOT, 'docs/modules');
const ARCHIVE_DIR = resolve(REPO_ROOT, 'docs/audit-2026-05-20/archive');
const POLICY_DIR = resolve(REPO_ROOT, 'docs/policy');
const SURVEYS_DIR = resolve(REPO_ROOT, 'plans/doc-audit-state/survey');
const OUT = resolve(MODULES_DIR, 'backlog.md');

function die(msg, code = 1) {
  process.stderr.write(`extract-backlog: ${msg}\n`);
  process.exit(code);
}

function walk(dir, filter = () => true) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, filter));
    else if (st.isFile() && filter(p)) out.push(p);
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
        break;
      }
    }
    if (inBlock) out.push(ln);
  }
  return out.join('\n').trim();
}

function isCleanupEntry(line) {
  if (!/^\s*[-*|]/.test(line)) return false;
  // Skip explicit bug entries (those live in bugs.md)
  if (/^\s*[-*]\s+\*\*bug:?\*\*/i.test(line)) return false;
  if (/^\s*[-*]\s+\[bug\]/i.test(line)) return false;
  if (/\bproduction\s+bug\b/i.test(line)) return false;
  // Skip entries the cleanup-session pattern has marked as already-done
  // (`(FIXED 2026-...)`, `VERIFIED CLEAN 2026-...`, or `_FIXED 2026-..._`).
  // Cleanup sessions are expected to annotate source module docs' Known Issues
  // entries with one of these markers when an item turns out stale or fixed,
  // and the next regen drops them. See CLAUDE.md Documentation Conventions.
  if (/\b(FIXED|VERIFIED CLEAN|VERIFIED DONE|RESOLVED)\b[_\s—\-]*(20\d{2}-\d{2}-\d{2})?/i.test(line)) return false;
  // Catch dead-code, cleanup, drift, dead-comment, orphan, refactor signals
  return /\bcleanup\b|\bdead[- ]code\b|\bdead[- ]comment\b|\bdrift\b|\borphan\b|\bunused\b|\bvestigial\b|\brefactor[- ]target\b|\bdoc[- ]rewrite[- ]target\b|\bstale\b/i.test(line);
}

function extractFileAnchor(text) {
  const m = /([A-Za-z0-9_./\-]+\.[A-Za-z0-9]+):(\d+)(?:-(\d+))?/.exec(text);
  return m ? `${m[1]}:${m[2]}${m[3] ? '-' + m[3] : ''}` : null;
}

function extractFollowupRefs(text) {
  const refs = new Set();
  const re = /\bq-(\d+)/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.add(`q-${m[1]}`);
  return [...refs];
}

function extractOrphanSweepLines(text) {
  // Canonical prefix per LOOP_PROMPT.md Section 3: "Orphan-sweep candidate: <path>"
  const out = [];
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    if (/Orphan-sweep candidate:/i.test(ln)) {
      out.push(ln.trim());
    } else if (/^\s*[-*]?\s*orphan-sweep:/i.test(ln)) {
      // The lowercase variant (g04-navigation used this form pre-canonicalisation)
      out.push(ln.trim());
    }
  }
  return out;
}

function fmtFollowups(fups) {
  if (!fups.length) return '';
  return ' (' + fups.map(q => `[${q}](../../plans/doc-audit-state/survey/_followups/${q}.md)`).join(', ') + ')';
}

function main() {
  if (!existsSync(MODULES_DIR)) die(`module docs dir does not exist: ${MODULES_DIR}`);
  if (!existsSync(SURVEYS_DIR)) die(`survey dir does not exist: ${SURVEYS_DIR}`);

  // --- Cleanup items from live module docs + policy docs + archived audit docs
  const docs = [
    ...walk(MODULES_DIR, p => p.endsWith('.md') && !p.endsWith('bugs.md') && !p.endsWith('backlog.md')),
    ...walk(POLICY_DIR, p => p.endsWith('.md')),
    ...walk(ARCHIVE_DIR, p => p.endsWith('.md')),
  ];
  const cleanupByDoc = [];
  let totalCleanup = 0;
  for (const docPath of docs) {
    const text = readFileSync(docPath, 'utf8');
    const block = extractKnownIssuesBlock(text);
    if (!block) continue;
    const blockLines = block.split(/\r?\n/);
    const cleanupLines = blockLines.filter(isCleanupEntry);
    if (!cleanupLines.length) continue;
    cleanupByDoc.push({ docPath, cleanupLines });
    totalCleanup += cleanupLines.length;
  }

  // --- Orphan-sweep candidates from Phase 1 surveys
  const surveys = walk(SURVEYS_DIR, p => p.endsWith('.md'));
  const orphansByFile = [];
  let totalOrphans = 0;
  for (const surveyPath of surveys) {
    const text = readFileSync(surveyPath, 'utf8');
    const lines = extractOrphanSweepLines(text);
    if (!lines.length) continue;
    orphansByFile.push({ surveyPath, lines });
    totalOrphans += lines.length;
  }

  // --- Compose output
  const header = `# Cleanup + orphan-sweep backlog\n\n_${totalCleanup} cleanup / drift items aggregated from ${cleanupByDoc.length} module docs; ${totalOrphans} orphan-sweep candidates aggregated from ${orphansByFile.length} Phase 1 surveys. Regenerated ${new Date().toISOString()}. Source of truth is each module doc's "Known issues" section + each Phase 1 survey's "Open questions" — this file is generated by \`plans/doc-audit-state/scripts/extract-backlog.mjs\`._\n\n`;

  const sections = [];

  sections.push(`## Cleanup / drift / dead-code items\n`);
  sections.push(`_Items the module docs flagged as removable, stale, or in need of consolidation. Not production bugs — those live in [bugs.md](./bugs.md)._\n`);
  for (const { docPath, cleanupLines } of cleanupByDoc) {
    const rel = relative(MODULES_DIR, docPath).replace(/\\/g, '/');
    sections.push(`### ${rel}\n`);
    for (const ln of cleanupLines) {
      const trimmed = ln.replace(/^\s*[-*|]\s*/, '').trim();
      const anchor = extractFileAnchor(trimmed);
      const fups = extractFollowupRefs(trimmed);
      const anchorStr = anchor ? ` \`${anchor}\`` : '';
      sections.push(`- ${trimmed}${anchorStr ? '\n  - Source:' + anchorStr : ''}${fups.length ? '\n  - Refs:' + fmtFollowups(fups) : ''}`);
    }
    sections.push('');
  }

  sections.push(`## Orphan-sweep candidates (Phase 1.6)\n`);
  sections.push(`_Files surveyors nominated as belonging to a different subsystem than the one auditing them, or files outside the audited subsystem boundary that warrant a later sweep. Resolve each by either (a) claiming into the appropriate subsystem and re-running its module doc, or (b) deleting if confirmed orphan._\n`);
  for (const { surveyPath, lines } of orphansByFile) {
    const rel = relative(SURVEYS_DIR, surveyPath).replace(/\\/g, '/');
    sections.push(`### ${rel}\n`);
    for (const ln of lines) {
      const trimmed = ln.replace(/^\s*[-*]\s*/, '').trim();
      sections.push(`- ${trimmed}`);
    }
    sections.push('');
  }

  if (!existsSync(MODULES_DIR)) mkdirSync(MODULES_DIR, { recursive: true });
  const body = sections.join('\n').trim() + '\n';
  writeFileSync(OUT, header + body, 'utf8');
  process.stdout.write(`wrote ${relative(REPO_ROOT, OUT)} (${totalCleanup} cleanup across ${cleanupByDoc.length} docs; ${totalOrphans} orphans across ${orphansByFile.length} surveys)\n`);
}

main();
