#!/usr/bin/env node
// context-check.mjs
// Health report for the context map. The map is a git-ignored cache that
// ensureFreshMap() rebuilds when stale (freshMap.mjs), so staleness is no longer
// a failure mode; this reports what a current map says about the taxonomy.
//
//   npm run context:check          # report; exit 1 on errors
//   npm run context:check -- --strict   # warnings also fail
//
// Checks:
//   [W] taxonomy      — files that fell through to `fallback` classification
//                       (signals an unhandled file type; add a rule in classify.mjs)
//   [i] coverage      — subsystem module docs referenced but not yet written
//   [i] dead context  — app-source files reached by no app entrypoint
//
// Also prints the calibration hint (how to set CONTEXT_CPT_SCALE).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { fmtTokens } from './tokens.mjs';
import { ensureFreshMap, REPO_ROOT } from './freshMap.mjs';

const SUBSYS_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'subsystems.json');

const problems = []; // { level: 'error'|'warn'|'info', msg }
function err(msg) { problems.push({ level: 'error', msg }); }
function warn(msg) { problems.push({ level: 'warn', msg }); }
function info(msg) { problems.push({ level: 'info', msg }); }

function main() {
  const strict = process.argv.includes('--strict');
  const map = ensureFreshMap();

  // 1. Taxonomy — fallback classification.
  const fallbacks = map.entries.filter((e) => e.reason === 'fallback');
  if (fallbacks.length) {
    warn(`${fallbacks.length} file(s) hit \`fallback\` classification — add a rule in classify.mjs:` +
      `\n      ${fallbacks.slice(0, 6).map((e) => e.path).join(', ')}${fallbacks.length > 6 ? ' …' : ''}`);
  }

  // 2. Coverage — referenced-but-missing module docs.
  if (existsSync(SUBSYS_PATH)) {
    const subs = JSON.parse(readFileSync(SUBSYS_PATH, 'utf8'));
    const missing = [];
    for (const s of subs) {
      if (s.module_doc_path && !existsSync(join(REPO_ROOT, s.module_doc_path))) missing.push(s.module_doc_path);
    }
    if (missing.length) info(`${missing.length} subsystem module doc(s) referenced but not written (doc-coverage gap).`);
  }

  // 3. Dead context (informational).
  if (map.totals?.dead_context_files) {
    info(`${map.totals.dead_context_files} app-source files reached by no app entrypoint ` +
      `(~${fmtTokens(map.totals.dead_context_tokens)}). See context-report.md → "Dead context". ` +
      `\`npm run orphans\` is the deletion authority.`);
  }

  return finish(strict, map);
}

function finish(strict, map) {
  const errors = problems.filter((p) => p.level === 'error');
  const warns = problems.filter((p) => p.level === 'warn');
  const infos = problems.filter((p) => p.level === 'info');

  for (const p of problems) {
    const tag = p.level === 'error' ? 'ERROR' : p.level === 'warn' ? 'WARN ' : 'info ';
    process.stdout.write(`[${tag}] ${p.msg}\n`);
  }

  // Calibration hint.
  if (map) {
    process.stdout.write(
      `\nCalibration: estimator is char-ratio (±10–15%). To pin it, measure the real\n` +
      `token count of the orientation bundle (~${fmtTokens(map.totals.orientation_tokens)} est.) once and set\n` +
      `CONTEXT_CPT_SCALE = real / estimate in the environment.\n`,
    );
  }

  const failed = errors.length > 0 || (strict && warns.length > 0);
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s), ${infos.length} info. ` +
    `${failed ? 'FAIL' : 'OK'}${strict ? ' (strict)' : ''}.\n`,
  );
  process.exit(failed ? 1 : 0);
}

try { main(); } catch (e) {
  process.stderr.write(`context-check failed: ${e.stack || e.message}\n`);
  process.exit(1);
}
