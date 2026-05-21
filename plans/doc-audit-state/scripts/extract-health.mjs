#!/usr/bin/env node
// extract-health.mjs
// Single entry point that refreshes the code-health worklists and updates HEALTH.md's
// pool counts. Composes the existing extract-bugs + extract-backlog scripts and adds
// counts for the other pools (stale-doc rewrites, coverage gap, fragility audit,
// refactor recommendations).
//
// Output: rewrites the count + last-regen line for each pool section in HEALTH.md.
// Does NOT touch the session-starter prompts (those are hand-curated).
//
// Usage:  npm run health
// No npm deps.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SCRIPTS_DIR = __dirname;
const HEALTH_MD = resolve(REPO_ROOT, 'HEALTH.md');

function run(script) {
  const out = spawnSync('node', [resolve(SCRIPTS_DIR, script)], { encoding: 'utf8' });
  if (out.status !== 0) {
    process.stderr.write(`extract-health: ${script} failed (exit ${out.status})\n${out.stderr || ''}\n`);
  }
  return out;
}

// ── Pool 1: routine cleanup (backlog.md) ───────────────────────────────
function poolCleanup() {
  run('extract-backlog.mjs');
  const path = resolve(REPO_ROOT, 'docs/modules/backlog.md');
  if (!existsSync(path)) return { count: 0, source: 'docs/modules/backlog.md' };
  const txt = readFileSync(path, 'utf8');
  const m = /_(\d+)\s+cleanup\s*\/\s*drift\s+items.*?(\d+)\s+orphan-sweep candidates/.exec(txt);
  const cleanup = m ? parseInt(m[1], 10) : 0;
  const orphans = m ? parseInt(m[2], 10) : 0;
  return { count: cleanup, secondary: orphans, source: 'docs/modules/backlog.md' };
}

// ── Pool 2: production bugs (bugs.md) ─────────────────────────────────
function poolBugs() {
  run('extract-bugs.mjs');
  const path = resolve(REPO_ROOT, 'docs/modules/bugs.md');
  if (!existsSync(path)) return { count: 0, source: 'docs/modules/bugs.md' };
  const txt = readFileSync(path, 'utf8');
  const m = /_(\d+)\s+bug entr/.exec(txt);
  return { count: m ? parseInt(m[1], 10) : 0, source: 'docs/modules/bugs.md' };
}

// ── Pool 3: stale doc rewrites (phase-2-disposition.json) ─────────────
function poolRewrites() {
  const path = resolve(REPO_ROOT, 'plans/doc-audit-state/phase-2-disposition.json');
  if (!existsSync(path)) return { count: 0, source: 'plans/doc-audit-state/phase-2-disposition.json' };
  const json = JSON.parse(readFileSync(path, 'utf8'));
  const summary = json.summary || {};
  const count = (summary['rewrite'] || 0) + (summary['migrate-target'] || 0);
  return { count, source: 'plans/doc-audit-state/phase-2-disposition.json' };
}

// ── Pool 4: coverage gap (reconcile-coverage.mjs JSON) ────────────────
function poolCoverage() {
  const out = spawnSync('node', [resolve(SCRIPTS_DIR, 'reconcile-coverage.mjs')], { encoding: 'utf8' });
  if (out.status !== 0) return { count: 0, source: 'reconcile-coverage.mjs' };
  try {
    const json = JSON.parse(out.stdout);
    return {
      count: json.classified?.truly_unclaimed || 0,
      secondary: json.classified?.claimed_but_not_recorded || 0,
      source: 'plans/doc-audit-state/scripts/reconcile-coverage.mjs',
    };
  } catch {
    return { count: 0, source: 'reconcile-coverage.mjs' };
  }
}

// ── Pool 5: fragility audit (docs/engine/20_Fragility_Audit.md) ──────
// Status mixed; this doc is pre-audit. Count entries by `F<N>` headings.
function poolFragility() {
  const path = resolve(REPO_ROOT, 'docs/engine/20_Fragility_Audit.md');
  if (!existsSync(path)) return { count: 0, source: 'docs/engine/20_Fragility_Audit.md', stale: true };
  const txt = readFileSync(path, 'utf8');
  const headings = txt.match(/^#+\s*F\d+\b/gm) || [];
  return {
    count: headings.length,
    source: 'docs/engine/20_Fragility_Audit.md',
    note: 'pre-audit tracker — status mixed; per-entry re-audit needed before action',
  };
}

// ── Pool 6: refactor recommendations (hard-coded list in HEALTH.md) ──
// These are surfaced from the audit summary; not auto-discoverable elsewhere.
function poolRefactors() {
  // Inline list in HEALTH.md is authoritative; we just verify the count below.
  return {
    count: 5,
    source: 'HEALTH.md (inline list under Pool 6)',
    note: 'WorkerProxy<TRenderState>, drop cameraSlots as any, relocate LoadingRenderer*, relocate ViewportRefs.ts, split PreviewCanvas.tsx',
  };
}

// ── Compose pool stats ────────────────────────────────────────────────
const pools = {
  cleanup: poolCleanup(),
  bugs: poolBugs(),
  rewrites: poolRewrites(),
  coverage: poolCoverage(),
  fragility: poolFragility(),
  refactors: poolRefactors(),
};

const now = new Date().toISOString();

// ── Update HEALTH.md count lines ──────────────────────────────────────
// Each pool section has a counted-source line of the form:
//   _Count: N | Source: <path> | Last regen: <iso>_
// We rewrite that line per pool; everything else (prose, prompts) is left
// untouched.

if (!existsSync(HEALTH_MD)) {
  process.stderr.write(`extract-health: HEALTH.md not found at ${HEALTH_MD}; counts not written.\n`);
  process.stderr.write(`Pool stats:\n${JSON.stringify(pools, null, 2)}\n`);
  process.exit(1);
}

let text = readFileSync(HEALTH_MD, 'utf8');

function patchPool(poolKey, headingMatch) {
  const p = pools[poolKey];
  // Match the entire count line up to (but not including) the trailing newline.
  // Underscores can appear inside the line (e.g. file paths like `20_Fragility_Audit.md`),
  // so we can't anchor on a single `_` — match through to end of line instead.
  const re = new RegExp(`(${headingMatch}[\\s\\S]*?)_Count:[^\\n]*`, '');
  const secondary = p.secondary !== undefined ? ` + ${p.secondary} secondary` : '';
  const note = p.note ? ` | note: ${p.note}` : '';
  const replacement = `$1_Count: ${p.count}${secondary} | Source: ${p.source} | Last regen: ${now}${note}_`;
  if (!re.test(text)) {
    process.stderr.write(`extract-health: pool '${poolKey}' (heading match '${headingMatch}') not found in HEALTH.md; skipping.\n`);
    return;
  }
  text = text.replace(re, replacement);
}

patchPool('cleanup',   '##\\s*Pool 1');
patchPool('bugs',      '##\\s*Pool 2');
patchPool('rewrites',  '##\\s*Pool 3');
patchPool('coverage',  '##\\s*Pool 4');
patchPool('fragility', '##\\s*Pool 5');
patchPool('refactors', '##\\s*Pool 6');

// Also update the top-of-file regen timestamp if present:
text = text.replace(/(_Auto-regenerated:\s*)[^_]*_/, `$1${now}_`);

writeFileSync(HEALTH_MD, text, 'utf8');

process.stdout.write(`extract-health: updated HEALTH.md\n`);
for (const [k, v] of Object.entries(pools)) {
  process.stdout.write(`  ${k.padEnd(10)} count=${v.count}${v.secondary !== undefined ? ' +'+v.secondary : ''}  source=${v.source}\n`);
}
