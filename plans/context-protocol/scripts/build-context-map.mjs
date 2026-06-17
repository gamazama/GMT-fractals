#!/usr/bin/env node
// build-context-map.mjs
// Walk every git-tracked file in dev/, classify it (tier / context-class /
// load-policy), estimate its token cost, and emit:
//   - plans/context-protocol/context-map.json   (machine-readable, full detail)
//   - plans/context-protocol/context-report.md  (human summary)
//
// This is the measurement half of the context-loading protocol. The policy
// half lives in docs/policy/context-loading-protocol.md.
//
// Run:  npm run context:map   (from dev/)
// Zero npm deps; uses git + node fs only.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { estimateDetailed, fmtTokens } from './tokens.mjs';
import {
  classifyFile, LOAD_POLICY, CONTEXT_CLASS, isLoadable, isOrientation, isContextWorthy,
} from './classify.mjs';
import { reachableByApp, APP_ENTRYPOINTS } from './reachability.mjs';

// Tiers whose on-demand source is "app code" — eligible for dead-context flagging.
const APP_CODE_TIERS = new Set([
  'engine-core', 'engine-gmt', 'gmt-app', 'app-gmt',
  'fluid-toy', 'fractal-toy', 'demo', 'mesh-export',
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ -> context-protocol/ -> plans/ -> dev/
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'plans', 'context-protocol');
const JSON_OUT = join(OUT_DIR, 'context-map.json');
const MD_OUT = join(OUT_DIR, 'context-report.md');

// Files this big should be read in sections, never whole, when on-demand.
const HEAVY_TOKEN_THRESHOLD = 4000;
const MAX_READ_BYTES = 2 * 1024 * 1024; // don't slurp anything bigger for counting

function gitLsFiles() {
  const out = execSync('git ls-files', {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return out.split(/\r?\n/).filter(Boolean);
}

function countLines(text) {
  if (!text) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 0x0a) n++;
  if (text.length > 0 && text.charCodeAt(text.length - 1) !== 0x0a) n++;
  return n;
}

function add(map, key, n) {
  map.set(key, (map.get(key) || 0) + n);
}

function main() {
  const argv = process.argv.slice(2);
  const quiet = argv.includes('--quiet');

  const files = gitLsFiles();
  const tracked = new Set(files);

  // Import-graph reachability: which app entrypoints reach each file.
  const { perApp, union } = reachableByApp(REPO_ROOT, tracked);
  const reachIndex = new Map(); // path -> [app, ...]
  for (const [app, v] of Object.entries(perApp)) {
    for (const f of v.reachable) {
      if (!reachIndex.has(f)) reachIndex.set(f, []);
      reachIndex.get(f).push(app);
    }
  }

  const entries = [];

  // Rollup accumulators keyed by dimension.
  const byTierTokens = new Map();
  const byTierFiles = new Map();
  const byClassTokens = new Map();
  const byClassFiles = new Map();
  const byPolicyTokens = new Map();
  const byPolicyFiles = new Map();
  // tier x policy matrix (loadable tokens only)
  const matrix = new Map(); // `${tier}|${policy}` -> tokens

  let totalTokens = 0;
  let loadableTokens = 0;
  let contextWorthyTokens = 0;
  let sourceOfTruthTokens = 0;
  let orientationTokens = 0;
  let totalBytes = 0;

  for (const rel of files) {
    const cls = classifyFile(rel);
    const abs = join(REPO_ROOT, rel.split('/').join(sep));

    let bytes = 0;
    try { bytes = statSync(abs).size; } catch { /* gone */ }

    let detail = { chars: 0, charTokens: 0, structuralTokens: 0, cpt: 0, category: 'binary' };
    let lines = 0;

    const isText = cls.loadPolicy !== LOAD_POLICY.NEVER ||
      cls.contextClass === CONTEXT_CLASS.GENERATED; // count generated text too, just bucket it
    const isBinary = cls.contextClass === CONTEXT_CLASS.ASSET;

    if (!isBinary && bytes > 0 && bytes <= MAX_READ_BYTES) {
      try {
        const text = readFileSync(abs, 'utf8');
        detail = estimateDetailed(text, cls.ext);
        lines = countLines(text);
      } catch { /* unreadable */ }
    }

    const tokens = detail.charTokens;
    const entry = {
      path: rel,
      tier: cls.tier,
      contextClass: cls.contextClass,
      loadPolicy: cls.loadPolicy,
      ext: cls.ext,
      reason: cls.reason,
      bytes,
      lines,
      tokens,
      structuralTokens: detail.structuralTokens,
      cpt: detail.cpt,
      heavy: tokens >= HEAVY_TOKEN_THRESHOLD,
      reachableFrom: reachIndex.get(rel) || [],
    };
    entries.push(entry);

    totalBytes += bytes;
    totalTokens += tokens;
    add(byTierTokens, cls.tier, tokens);
    add(byTierFiles, cls.tier, 1);
    add(byClassTokens, cls.contextClass, tokens);
    add(byClassFiles, cls.contextClass, 1);
    add(byPolicyTokens, cls.loadPolicy, tokens);
    add(byPolicyFiles, cls.loadPolicy, 1);

    if (isLoadable(cls.loadPolicy)) {
      loadableTokens += tokens;
      add(matrix, `${cls.tier}|${cls.loadPolicy}`, tokens);
    }
    if (isContextWorthy(cls.loadPolicy)) contextWorthyTokens += tokens;
    if (cls.loadPolicy === LOAD_POLICY.ON_DEMAND) sourceOfTruthTokens += tokens;
    if (isOrientation(cls.loadPolicy)) orientationTokens += tokens;
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  // Heavy files (the ones to read in sections, not whole). Restricted to
  // context-worthy files — you would not load skip/data/legacy anyway, so
  // flagging them as "read in sections" is noise.
  const heavy = entries
    .filter((e) => isContextWorthy(e.loadPolicy) && e.tokens >= HEAVY_TOKEN_THRESHOLD)
    .sort((a, b) => b.tokens - a.tokens);

  // "Read-for-area" architecture docs total — the cost to understand design.
  const archTokens = byPolicyTokens.get(LOAD_POLICY.READ_FOR_AREA) || 0;

  // Per-app reachable cost: tokens of the source files each app entrypoint
  // actually imports. This is "what the running app needs to be understood",
  // far smaller than its tier.
  const entryByPath = new Map(entries.map((e) => [e.path, e]));
  const byApp = {};
  for (const [app, v] of Object.entries(perApp)) {
    let tokens = 0;
    for (const f of v.reachable) tokens += entryByPath.get(f)?.tokens || 0;
    byApp[app] = { entry: APP_ENTRYPOINTS[app][0], files: v.reachable.size, tokens };
  }
  let unionTokens = 0;
  for (const f of union) unionTokens += entryByPath.get(f)?.tokens || 0;

  // Dead context: app-code source files reachable from NO app entrypoint.
  // Candidates for deletion or, at minimum, never worth loading. (knip is the
  // authority for true orphans; this is a token-weighted view.)
  const deadContext = entries
    .filter((e) => e.contextClass === CONTEXT_CLASS.SOURCE &&
      e.loadPolicy === LOAD_POLICY.ON_DEMAND &&
      APP_CODE_TIERS.has(e.tier) &&
      e.reachableFrom.length === 0)
    .sort((a, b) => b.tokens - a.tokens);
  const deadTokens = deadContext.reduce((s, e) => s + e.tokens, 0);

  const generatedAt = new Date().toISOString();
  const doc = {
    schema_version: 1,
    generated_at: generatedAt,
    repo_root: REPO_ROOT.split(sep).join('/'),
    heavy_token_threshold: HEAVY_TOKEN_THRESHOLD,
    estimator: 'char-ratio-per-filetype (see scripts/tokens.mjs)',
    totals: {
      files: entries.length,
      bytes: totalBytes,
      tokens: totalTokens,
      loadable_tokens: loadableTokens,
      context_worthy_tokens: contextWorthyTokens,
      source_of_truth_tokens: sourceOfTruthTokens,
      orientation_tokens: orientationTokens,
      architecture_tokens: archTokens,
      reachable_union_files: union.size,
      reachable_union_tokens: unionTokens,
      dead_context_files: deadContext.length,
      dead_context_tokens: deadTokens,
    },
    by_app_reachable: byApp,
    dead_context: deadContext.map((e) => ({ path: e.path, tokens: e.tokens, tier: e.tier })),
    by_tier: rollup(byTierTokens, byTierFiles),
    by_context_class: rollup(byClassTokens, byClassFiles),
    by_load_policy: rollup(byPolicyTokens, byPolicyFiles),
    tier_policy_matrix: matrixToObj(matrix),
    heavy_files: heavy.map((e) => ({ path: e.path, tokens: e.tokens, tier: e.tier, loadPolicy: e.loadPolicy })),
    entries,
  };

  writeFileSync(JSON_OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  writeFileSync(MD_OUT, renderReport(doc), 'utf8');

  if (!quiet) {
    process.stdout.write(`Wrote ${rel(JSON_OUT)} and ${rel(MD_OUT)}\n\n`);
    process.stdout.write(headline(doc));
  }
}

function rollup(tokenMap, fileMap) {
  const out = {};
  for (const [k, tokens] of tokenMap) {
    out[k] = { tokens, files: fileMap.get(k) || 0 };
  }
  return out;
}

function matrixToObj(matrix) {
  const out = {};
  for (const [k, tokens] of matrix) {
    const [tier, policy] = k.split('|');
    (out[tier] ||= {})[policy] = tokens;
  }
  return out;
}

function rel(p) {
  return p.replace(REPO_ROOT.split(sep).join('/'), '').replace(/^[\\/]/, '');
}

function headline(doc) {
  const t = doc.totals;
  const lines = [];
  lines.push(`Files tracked:          ${t.files}`);
  lines.push(`Total tokens (all):     ${fmtTokens(t.tokens)}  (${t.tokens})`);
  lines.push(`Context-worthy:         ${fmtTokens(t.context_worthy_tokens)}  (orient + architecture + source; the honest "comprehend the app" ceiling)`);
  lines.push(`  Orientation bundle:   ${fmtTokens(t.orientation_tokens)}  (read-first set)`);
  lines.push(`  Architecture docs:    ${fmtTokens(t.architecture_tokens)}  (read-for-area)`);
  lines.push(`  Source of truth:      ${fmtTokens(t.source_of_truth_tokens)}  (on-demand code)`);
  lines.push(`Loadable (incl. data):  ${fmtTokens(t.loadable_tokens)}  (everything not generated/binary)`);
  lines.push('');
  lines.push('By tier (tokens / files):');
  for (const [tier, v] of sortByTokens(doc.by_tier)) {
    lines.push(`  ${tier.padEnd(14)} ${fmtTokens(v.tokens).padStart(7)}  ${String(v.files).padStart(4)}`);
  }
  lines.push('');
  lines.push('Per-app reachable source (import-graph from entrypoint):');
  for (const [app, v] of Object.entries(doc.by_app_reachable).sort((a, b) => b[1].tokens - a[1].tokens)) {
    lines.push(`  ${app.padEnd(14)} ${fmtTokens(v.tokens).padStart(7)}  ${String(v.files).padStart(4)} files`);
  }
  lines.push(`  ${'(union)'.padEnd(14)} ${fmtTokens(t.reachable_union_tokens).padStart(7)}  ${String(t.reachable_union_files).padStart(4)} files`);
  if (t.dead_context_files) {
    lines.push('');
    lines.push(`Dead context (app source reached by no app): ${t.dead_context_files} files, ${fmtTokens(t.dead_context_tokens)} tokens`);
  }
  return lines.join('\n') + '\n';
}

function sortByTokens(obj) {
  return Object.entries(obj).sort((a, b) => b[1].tokens - a[1].tokens);
}

// ---------------------------------------------------------------------------
// Markdown report.
// ---------------------------------------------------------------------------
function renderReport(doc) {
  const t = doc.totals;
  const L = [];
  L.push('# Context Cost Report');
  L.push('');
  L.push(`> Generated by \`npm run context:map\` at ${doc.generated_at}.`);
  L.push('> Token estimate: char-ratio-per-filetype heuristic (see [scripts/tokens.mjs](scripts/tokens.mjs)). Treat as +/-10-15%.');
  L.push('> Regenerate after material code/doc changes. Do not hand-edit.');
  L.push('');
  L.push('## Headline');
  L.push('');
  L.push('| Metric | Tokens | Notes |');
  L.push('|---|--:|---|');
  L.push(`| Total tracked | ${fmtTokens(t.tokens)} | every git-tracked file, all classes |`);
  L.push(`| **Context-worthy** | **${fmtTokens(t.context_worthy_tokens)}** | orient + architecture + source; the honest "comprehend the app" ceiling (excludes data/legacy/binary) |`);
  L.push(`| &nbsp;&nbsp;Orientation bundle | ${fmtTokens(t.orientation_tokens)} | the \`read-first\` set — load this and you know where everything is |`);
  L.push(`| &nbsp;&nbsp;Architecture docs | ${fmtTokens(t.architecture_tokens)} | \`read-for-area\` — design context for whatever you touch |`);
  L.push(`| &nbsp;&nbsp;Source of truth | ${fmtTokens(t.source_of_truth_tokens)} | \`on-demand\` code — load targeted |`);
  L.push(`| Loadable (incl. data) | ${fmtTokens(t.loadable_tokens)} | everything not generated/binary |`);
  L.push(`| Files | ${t.files} | tracked |`);
  L.push('');
  L.push('**Reading:** orienting on this repo costs ~' + fmtTokens(t.orientation_tokens) +
    ' tokens; fully comprehending all source + design docs would cost ~' + fmtTokens(t.context_worthy_tokens) +
    '. The protocol exists to keep most tasks near the former, not the latter.');
  L.push('');

  L.push('## By load policy');
  L.push('');
  L.push('Load policy is the filter: what to read first, what on demand, what to skip.');
  L.push('');
  L.push('| Policy | Tokens | Files | Meaning |');
  L.push('|---|--:|--:|---|');
  const policyMeaning = {
    [LOAD_POLICY.READ_FIRST]: 'orientation — load at task start',
    [LOAD_POLICY.READ_FOR_AREA]: 'architecture/docs for the subsystem you touch',
    [LOAD_POLICY.ON_DEMAND]: 'source of truth — load targeted, prefer its module doc first',
    [LOAD_POLICY.REFERENCE_ONLY]: 'legacy/historical — only if explicitly relevant',
    [LOAD_POLICY.SKIP]: 'data/fixtures — not context unless the task is about them',
    [LOAD_POLICY.NEVER]: 'generated/binary — never load as text',
  };
  for (const [pol, v] of sortByTokens(doc.by_load_policy)) {
    L.push(`| \`${pol}\` | ${fmtTokens(v.tokens)} | ${v.files} | ${policyMeaning[pol] || ''} |`);
  }
  L.push('');

  L.push('## By tier');
  L.push('');
  L.push('| Tier | Tokens | Files | On-demand source | Architecture |');
  L.push('|---|--:|--:|--:|--:|');
  for (const [tier, v] of sortByTokens(doc.by_tier)) {
    const m = doc.tier_policy_matrix[tier] || {};
    const src = m[LOAD_POLICY.ON_DEMAND] || 0;
    const arch = m[LOAD_POLICY.READ_FOR_AREA] || 0;
    L.push(`| ${tier} | ${fmtTokens(v.tokens)} | ${v.files} | ${fmtTokens(src)} | ${fmtTokens(arch)} |`);
  }
  L.push('');

  L.push('## By context class');
  L.push('');
  L.push('| Class | Tokens | Files |');
  L.push('|---|--:|--:|');
  for (const [cls, v] of sortByTokens(doc.by_context_class)) {
    L.push(`| ${cls} | ${fmtTokens(v.tokens)} | ${v.files} |`);
  }
  L.push('');

  L.push('## Per-app reachable source');
  L.push('');
  L.push('Import-graph walk from each app entrypoint — the source an app actually');
  L.push('pulls in, far less than its whole tier. Query with `context:cost -- app:<name>`.');
  L.push('');
  L.push('| App | Entry | Tokens | Files |');
  L.push('|---|---|--:|--:|');
  for (const [app, v] of Object.entries(doc.by_app_reachable).sort((a, b) => b[1].tokens - a[1].tokens)) {
    L.push(`| ${app} | \`${v.entry}\` | ${fmtTokens(v.tokens)} | ${v.files} |`);
  }
  L.push(`| **union** | all apps | **${fmtTokens(t.reachable_union_tokens)}** | ${t.reachable_union_files} |`);
  L.push('');

  if (doc.dead_context.length) {
    L.push(`## Dead context (${doc.dead_context.length} files, ~${fmtTokens(t.dead_context_tokens)})`);
    L.push('');
    L.push('App-tier source files reached by **no** app entrypoint — never worth loading,');
    L.push('and candidates for deletion. `npm run orphans` (knip) is the authority for true orphans;');
    L.push('this is the token-weighted view. Top 30:');
    L.push('');
    L.push('| File | Tokens | Tier |');
    L.push('|---|--:|---|');
    for (const e of doc.dead_context.slice(0, 30)) {
      L.push(`| [${e.path}](../../${e.path}) | ${fmtTokens(e.tokens)} | ${e.tier} |`);
    }
    if (doc.dead_context.length > 30) L.push(`| _...and ${doc.dead_context.length - 30} more_ | | |`);
    L.push('');
  }

  L.push(`## Heavy files (>= ${fmtTokens(doc.heavy_token_threshold)} tokens)`);
  L.push('');
  L.push('Read these in **sections**, never whole. Each line is a clickable file ref.');
  L.push('');
  L.push('| File | Tokens | Tier | Policy |');
  L.push('|---|--:|---|---|');
  for (const e of doc.heavy_files.slice(0, 40)) {
    L.push(`| [${e.path}](../../${e.path}) | ${fmtTokens(e.tokens)} | ${e.tier} | \`${e.loadPolicy}\` |`);
  }
  if (doc.heavy_files.length > 40) {
    L.push(`| _...and ${doc.heavy_files.length - 40} more_ | | | |`);
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push('_See [README.md](README.md) for how to use this and [../../docs/policy/context-loading-protocol.md](../../docs/policy/context-loading-protocol.md) for the policy._');
  L.push('');
  return L.join('\n');
}

try {
  main();
} catch (e) {
  process.stderr.write(`build-context-map failed: ${e.stack || e.message}\n`);
  process.exit(1);
}
