#!/usr/bin/env node
// context-check.mjs
// CI-friendly health gate for the context map. Exits non-zero when the map is
// untrustworthy, so a stale or mis-classified map can't silently mislead.
//
//   npm run context:check          # report; exit 1 on errors
//   npm run context:check -- --strict   # warnings also fail
//
// Checks:
//   [E] freshness     — committed map's file set matches `git ls-files`
//   [W] freshness     — map predates the latest commit (token drift likely)
//   [W] taxonomy      — files that fell through to `fallback` classification
//                       (signals an unhandled file type; add a rule in classify.mjs)
//   [i] coverage      — subsystem module docs referenced but not yet written
//   [i] dead context  — app-source files reached by no app entrypoint
//
// Also prints the calibration hint (how to set CONTEXT_CPT_SCALE).

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fmtTokens } from './tokens.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const MAP_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'context-map.json');
const SUBSYS_PATH = join(REPO_ROOT, 'plans', 'doc-audit-state', 'subsystems.json');

const problems = []; // { level: 'error'|'warn'|'info', msg }
function err(msg) { problems.push({ level: 'error', msg }); }
function warn(msg) { problems.push({ level: 'warn', msg }); }
function info(msg) { problems.push({ level: 'info', msg }); }

function gitLsFiles() {
  return execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/).filter(Boolean);
}

function main() {
  const strict = process.argv.includes('--strict');

  if (!existsSync(MAP_PATH)) {
    err('context-map.json missing — run `npm run context:map`.');
    return finish(strict);
  }
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));

  // 1. Freshness — file-set drift.
  const current = new Set(gitLsFiles());
  const mapped = new Set(map.entries.map((e) => e.path));
  const added = [...current].filter((p) => !mapped.has(p));
  const removed = [...mapped].filter((p) => !current.has(p));
  if (added.length || removed.length) {
    err(`map file-set is stale: ${added.length} added, ${removed.length} removed since last build. ` +
      `Run \`npm run context:map\`.` +
      (added.length ? `\n      e.g. added: ${added.slice(0, 3).join(', ')}${added.length > 3 ? ' …' : ''}` : '') +
      (removed.length ? `\n      e.g. removed: ${removed.slice(0, 3).join(', ')}${removed.length > 3 ? ' …' : ''}` : ''));
  }

  // 2. Freshness — commit time.
  try {
    const lastCommit = execSync('git log -1 --format=%cI', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    if (lastCommit && map.generated_at && lastCommit > map.generated_at) {
      warn(`map (generated ${map.generated_at}) predates the latest commit (${lastCommit}). ` +
        `Token counts may have drifted; consider \`npm run context:map\`.`);
    }
  } catch { /* not in a repo with commits */ }

  // 3. Taxonomy — fallback classification.
  const fallbacks = map.entries.filter((e) => e.reason === 'fallback');
  if (fallbacks.length) {
    warn(`${fallbacks.length} file(s) hit \`fallback\` classification — add a rule in classify.mjs:` +
      `\n      ${fallbacks.slice(0, 6).map((e) => e.path).join(', ')}${fallbacks.length > 6 ? ' …' : ''}`);
  }

  // 4. Coverage — referenced-but-missing module docs.
  if (existsSync(SUBSYS_PATH)) {
    const subs = JSON.parse(readFileSync(SUBSYS_PATH, 'utf8'));
    const missing = [];
    for (const s of subs) {
      if (s.module_doc_path && !existsSync(join(REPO_ROOT, s.module_doc_path))) missing.push(s.module_doc_path);
    }
    if (missing.length) info(`${missing.length} subsystem module doc(s) referenced but not written (doc-coverage gap).`);
  }

  // 5. Dead context (informational).
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
