#!/usr/bin/env node
// context-cost.mjs
// The "how do I load this efficiently" half of the protocol. Given a target —
// a subsystem id, a tier, or a path/prefix — it prints a LAYERED LOAD PLAN with
// a running token budget, cheapest-leverage-first:
//
//   Layer 0  orientation core      (assume already loaded; shown for context)
//   Layer 1  architecture / docs    read the design doc before the source
//   Layer 2  source of truth        targeted code, ordered, heavy files flagged
//
// The point: most questions are answered by Layer 1 for a fraction of Layer 2's
// cost. The plan makes that trade-off explicit.
//
// Usage (from dev/):
//   npm run context:cost -- <target> [--budget N] [--full]
//   npm run context:cost -- --list
//
//   <target>   a subsystem id (e.g. e01-feature-system), a tier
//              (engine-core | engine-gmt | gmt-app | app-gmt | fluid-toy | ...),
//              or any path / path-prefix / substring (e.g. engine/plugins,
//              FormulaWorkshop, animation).
//   --budget N stop the plan once cumulative tokens exceed N; report the cut.
//   --full     include source files even when a cheaper doc exists.
//   --json     emit the plan as JSON instead of markdown.
//
// Reads plans/context-protocol/context-map.json (run `npm run context:map`
// first). Reads plans/doc-audit-state/subsystems.json for curated bundles.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fmtTokens } from './tokens.mjs';
import { sliceGuide } from './symbols.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const MAP_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'context-map.json');
const SUBSYS_PATH = join(REPO_ROOT, 'plans', 'doc-audit-state', 'subsystems.json');
const PROFILES_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'profiles.json');

const KNOWN_TIERS = new Set([
  'engine-core', 'engine-gmt', 'gmt-app', 'app-gmt', 'fluid-toy',
  'fractal-toy', 'demo', 'mesh-export', 'docs', 'tooling', 'public', 'root',
]);

function loadMap() {
  if (!existsSync(MAP_PATH)) {
    fail(`context-map.json not found. Run:\n  npm run context:map`);
  }
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  // Staleness hint: compare generated_at against latest git commit time.
  try {
    const lastCommit = execSync('git log -1 --format=%cI', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    if (lastCommit && map.generated_at && lastCommit > map.generated_at) {
      process.stderr.write(`note: context-map.json predates the latest commit; consider \`npm run context:map\`.\n`);
    }
  } catch { /* not fatal */ }
  return map;
}

function loadSubsystems() {
  if (!existsSync(SUBSYS_PATH)) return [];
  try { return JSON.parse(readFileSync(SUBSYS_PATH, 'utf8')); } catch { return []; }
}

function loadProfiles() {
  if (!existsSync(PROFILES_PATH)) return {};
  try { return JSON.parse(readFileSync(PROFILES_PATH, 'utf8')).profiles || {}; } catch { return {}; }
}

function byPath(entries) {
  const m = new Map();
  for (const e of entries) m.set(e.path, e);
  return m;
}

function tokensFor(paths, index) {
  let sum = 0;
  const rows = [];
  for (const p of paths) {
    const e = index.get(p);
    if (e) { sum += e.tokens; rows.push(e); }
    else rows.push({ path: p, tokens: 0, loadPolicy: 'missing', heavy: false });
  }
  return { sum, rows };
}

// ---------------------------------------------------------------------------
// Target resolution.
// ---------------------------------------------------------------------------
function resolveTarget(target, map, subsystems) {
  const index = byPath(map.entries);

  // 1. App reachable set (import-graph): app:app-gmt, app:fluid-toy, ...
  if (target.startsWith('app:')) return planFromApp(target.slice(4), map, index, subsystems);

  // 2. Exact subsystem id.
  const sub = subsystems.find((s) => s.id === target);
  if (sub) return planFromSubsystem(sub, index, subsystems);

  // 3. Tier name.
  if (KNOWN_TIERS.has(target)) return planFromTier(target, map, index, subsystems);

  // 3. Path / prefix / substring.
  return planFromPath(target, map, index, subsystems);
}

function planFromSubsystem(sub, index, subsystems) {
  const arch = [];
  if (sub.module_doc_path) arch.push(sub.module_doc_path);
  if (sub.existing_doc_ref) arch.push(stripDevPrefix(sub.existing_doc_ref));
  const source = (sub.files_claimed || []).map(stripDevPrefix);
  return {
    title: `subsystem: ${sub.id} — ${sub.area}`,
    tier: sub.tier,
    archPaths: dedupe(arch),
    sourcePaths: dedupe(source),
    index,
    note: `Curated bundle from subsystems.json (status: ${sub.status || 'n/a'}).`,
  };
}

function planFromApp(app, map, index, subsystems) {
  const apps = Object.keys(map.by_app_reachable || {});
  if (!apps.includes(app)) {
    fail(`unknown app "${app}". Known apps: ${apps.map((a) => 'app:' + a).join(', ')}`);
  }
  const reachable = new Set(
    map.entries.filter((e) => (e.reachableFrom || []).includes(app)).map((e) => e.path),
  );
  const source = [...reachable].filter((p) => {
    const e = index.get(p);
    return e && e.loadPolicy === 'on-demand' && e.contextClass === 'source';
  });
  // Docs that describe files in the reachable set — the cheap way in.
  const docs = [];
  for (const s of subsystems) {
    const covers = (s.files_claimed || []).some((f) => reachable.has(stripDevPrefix(f)));
    if (covers) {
      if (s.module_doc_path) docs.push(s.module_doc_path);
      if (s.existing_doc_ref) docs.push(stripDevPrefix(s.existing_doc_ref));
    }
  }
  const meta = map.by_app_reachable[app];
  return {
    title: `app: ${app} (reachable set)`,
    tier: app,
    archPaths: dedupe(docs),
    sourcePaths: source,
    index,
    note: `Import-graph reachable from \`${meta.entry}\` — ${meta.files} files, ` +
      `~${fmtTokens(meta.tokens)} of source. This is what the running app actually pulls in.`,
  };
}

function planFromTier(tier, map, index, subsystems) {
  const inTier = map.entries.filter((e) => e.tier === tier);
  const archInTier = inTier.filter((e) => e.loadPolicy === 'read-for-area').map((e) => e.path);
  const source = inTier.filter((e) => e.loadPolicy === 'on-demand').map((e) => e.path);
  // Design docs (which live in the docs/ tier) that describe this tier, pulled
  // from subsystems.json so e.g. `engine-core` surfaces docs/engine/* up front.
  const docsForTier = [];
  for (const s of subsystems) {
    if (s.tier !== tier) continue;
    if (s.module_doc_path) docsForTier.push(s.module_doc_path);
    if (s.existing_doc_ref) docsForTier.push(stripDevPrefix(s.existing_doc_ref));
  }
  return {
    title: `tier: ${tier}`,
    tier,
    archPaths: dedupe([...docsForTier, ...archInTier]),
    sourcePaths: source,
    index,
    note: `All on-demand source in tier "${tier}", plus design docs that describe it. Use a narrower path for a focused plan.`,
  };
}

function planFromPath(target, map, index, subsystems) {
  const t = target.replace(/\\/g, '/');
  const matches = map.entries.filter(
    (e) => e.path === t || e.path.startsWith(t) || e.path.includes(t),
  );
  if (matches.length === 0) {
    fail(`no tracked files match "${target}".\nTry a tier (${[...KNOWN_TIERS].join(', ')}), a subsystem id (--list), or a path fragment.`);
  }
  const arch = matches.filter((e) => e.loadPolicy === 'read-for-area').map((e) => e.path);
  const source = matches.filter((e) => e.loadPolicy === 'on-demand').map((e) => e.path);

  // Surface any subsystem docs that claim files under this path — the cheap
  // way in. These are added to the architecture layer.
  const claimedDocs = [];
  for (const s of subsystems) {
    const claimsHere = (s.files_claimed || []).some((f) => stripDevPrefix(f).startsWith(t) || stripDevPrefix(f).includes(t));
    if (claimsHere) {
      if (s.module_doc_path) claimedDocs.push(s.module_doc_path);
      if (s.existing_doc_ref) claimedDocs.push(stripDevPrefix(s.existing_doc_ref));
    }
  }
  return {
    title: `path: ${target}`,
    tier: matches[0]?.tier,
    archPaths: dedupe([...claimedDocs, ...arch]),
    sourcePaths: dedupe(source),
    index,
    note: `${matches.length} files match. Architecture layer includes any subsystem docs that cover this path.`,
    skipped: matches.filter((e) => ['skip', 'reference-only', 'never'].includes(e.loadPolicy)),
  };
}

function stripDevPrefix(p) {
  return p.replace(/^dev\//, '').replace(/\\/g, '/');
}
function dedupe(arr) { return [...new Set(arr)]; }

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------
function render(plan, map, opts) {
  const { index } = plan;
  const orientTokens = map.totals.orientation_tokens;
  const arch = tokensFor(plan.archPaths, index);
  const source = tokensFor(plan.sourcePaths, index);

  if (opts.json) {
    return JSON.stringify({
      target: plan.title,
      orientation_tokens: orientTokens,
      architecture: { tokens: arch.sum, files: arch.rows.map(slim) },
      source: { tokens: source.sum, files: source.rows.map(slim) },
      cheap_path_tokens: orientTokens + arch.sum,
      full_path_tokens: orientTokens + arch.sum + source.sum,
    }, null, 2);
  }

  const L = [];
  L.push(`# Load plan — ${plan.title}`);
  L.push('');
  if (plan.note) L.push(`> ${plan.note}`);
  L.push(`> Token estimates from context-map.json (${map.generated_at}). +/-10-15%.`);
  L.push('');

  // Layer 0
  L.push(`## Layer 0 — orientation  (~${fmtTokens(orientTokens)}, assume loaded)`);
  L.push('CLAUDE.md, CODEBASE_MAP.md, AGENTS.md, docs/DOCS_INDEX.md + the app README. Read once per session.');
  L.push('');

  let cumulative = orientTokens;

  // Layer 1 — architecture (split present docs from planned-but-missing ones).
  const present = arch.rows.filter((r) => r.loadPolicy !== 'missing');
  const missing = arch.rows.filter((r) => r.loadPolicy === 'missing');
  L.push(`## Layer 1 — architecture / docs  (+${fmtTokens(arch.sum)})`);
  if (present.length === 0) {
    L.push('_No design doc maps to this target. You may need to read source directly (Layer 2)._');
  } else {
    L.push('Read these first — they explain the area for a fraction of the source cost.');
    L.push('');
    L.push('| Doc | Tokens | Cumulative |');
    L.push('|---|--:|--:|');
    for (const r of present.sort((a, b) => a.tokens - b.tokens)) {
      cumulative += r.tokens;
      L.push(`| [${r.path}](../../${r.path}) | ${fmtTokens(r.tokens)} | ${fmtTokens(cumulative)} |`);
    }
  }
  if (missing.length) {
    L.push('');
    L.push(`> ⚠ Doc-coverage gap: ${missing.length} module doc(s) referenced but not yet written — ` +
      missing.map((r) => `\`${r.path}\``).join(', ') + '.');
  }
  L.push('');
  const cheapPath = orientTokens + arch.sum;
  L.push(`**Cheap path total: ~${fmtTokens(cheapPath)}** (orientation + docs). Stop here if the docs answer your question.`);
  L.push('');

  // Layer 2 — source
  L.push(`## Layer 2 — source of truth  (+${fmtTokens(source.sum)})`);
  if (source.rows.length === 0) {
    L.push('_No on-demand source files in this target._');
  } else {
    L.push('Load targeted. **Heavy** files (⚠) should be read in sections, not whole.');
    L.push('');
    L.push('| File | Tokens | Cumulative | |');
    L.push('|---|--:|--:|:--|');
    let cut = false;
    for (const r of source.rows.sort((a, b) => a.tokens - b.tokens)) {
      cumulative += r.tokens;
      const flag = r.heavy ? '⚠ sectioned' : '';
      const overBudget = opts.budget && cumulative > opts.budget;
      if (overBudget && !cut) {
        L.push(`| — budget ${fmtTokens(opts.budget)} reached — | | ${fmtTokens(cumulative)} | |`);
        cut = true;
      }
      const mark = cut ? '○' : '●';
      L.push(`| ${mark} [${r.path}](../../${r.path}) | ${fmtTokens(r.tokens)} | ${fmtTokens(cumulative)} | ${flag} |`);
    }
  }
  L.push('');
  const fullPath = orientTokens + arch.sum + source.sum;
  L.push(`**Full path total: ~${fmtTokens(fullPath)}** (orientation + docs + all source).`);

  // Slice guide — for heavy source files, anchor the major symbols so they can
  // be read by line range instead of whole.
  const heavyRows = source.rows.filter((r) => r.heavy && /\.(ts|tsx|js|jsx|mjs|mts)$/.test(r.path));
  if (heavyRows.length) {
    L.push('');
    L.push('## Heavy-file slice guide');
    L.push('Read these by line range, not whole. Largest top-level symbols:');
    for (const r of heavyRows.slice(0, 8)) {
      let guide = [];
      try { guide = sliceGuide(readFileSync(join(REPO_ROOT, r.path.split('/').join(sep)), 'utf8'), 5); }
      catch { /* unreadable */ }
      if (!guide.length) continue;
      L.push('');
      L.push(`**[${r.path}](../../${r.path})** (~${fmtTokens(r.tokens)})`);
      for (const s of guide) {
        L.push(`- \`${s.name}\` (${s.kind}) — [L${s.startLine}-${s.endLine}](../../${r.path}#L${s.startLine}-L${s.endLine}), ${s.lines} lines`);
      }
    }
  }

  if (plan.skipped && plan.skipped.length) {
    const skipTokens = plan.skipped.reduce((s, e) => s + e.tokens, 0);
    L.push('');
    L.push(`## Excluded  (${plan.skipped.length} files, ~${fmtTokens(skipTokens)})`);
    L.push(`Data / fixtures / legacy under this path — not loaded unless your task is about them.`);
  }

  L.push('');
  L.push('---');
  L.push(`_Cheap path is ${pct(cheapPath, fullPath)} of the full path. Prefer Layer 1; reach for Layer 2 only when you need the exact code._`);
  return L.join('\n');
}

// Compact, copy-pasteable ordered reading list that fits a budget. Heavy files
// get a slice suggestion (read the largest symbol's line range first) and a
// proportional slice-token estimate, so the list stays under budget by reading
// big files partially.
function renderPack(plan, map, opts) {
  const { index } = plan;
  const orientTokens = map.totals.orientation_tokens;
  const arch = tokensFor(plan.archPaths.filter((p) => index.has(p)), index);
  const source = tokensFor(plan.sourcePaths, index);
  const budget = opts.budget || Infinity;

  const L = [];
  L.push(`# Reading list — ${plan.title}`);
  L.push(opts.profileNote ? `> ${opts.profileNote}` : '');
  L.push(`> Budget ${opts.budget ? fmtTokens(opts.budget) : 'none'}. Orientation (~${fmtTokens(orientTokens)}) assumed loaded, not counted.`);
  L.push('');

  // Order: cheap architecture docs first, then source smallest-first.
  const items = [
    ...arch.rows.sort((a, b) => a.tokens - b.tokens).map((r) => ({ ...r, layer: 'doc' })),
    ...source.rows.sort((a, b) => a.tokens - b.tokens).map((r) => ({ ...r, layer: 'src' })),
  ];

  let cum = 0;
  const included = [];
  const excluded = [];
  for (const r of items) {
    let cost = r.tokens;
    let suffix = '';
    let ref = r.path;
    // For heavy source files, prefer a slice: read the largest symbol first.
    if (r.layer === 'src' && r.heavy && /\.(ts|tsx|js|jsx|mjs|mts)$/.test(r.path)) {
      let guide = [];
      try { guide = sliceGuide(readFileSync(join(REPO_ROOT, r.path.split('/').join(sep)), 'utf8'), 1); }
      catch { /* ignore */ }
      const fileLines = index.get(r.path)?.lines || 0;
      if (guide.length && fileLines > 0) {
        const s = guide[0];
        cost = Math.max(1, Math.round(r.tokens * (s.lines / fileLines)));
        suffix = ` — slice L${s.startLine}-${s.endLine} (\`${s.name}\`); full file ~${fmtTokens(r.tokens)}`;
        ref = `${r.path}#L${s.startLine}-L${s.endLine}`;
      }
    }
    if (cum + cost > budget) { excluded.push({ ...r, cost }); continue; }
    cum += cost;
    included.push({ r, cost, suffix, ref, cumAt: cum });
  }

  for (const it of included) {
    const tag = it.r.layer === 'doc' ? '📄' : '📐';
    L.push(`- [ ] ${tag} [${it.r.path}](../../${it.ref}) — ${fmtTokens(it.cost)} (Σ ${fmtTokens(it.cumAt)})${it.suffix}`);
  }
  L.push('');
  L.push(`**Fits: ${included.length} items, ~${fmtTokens(cum)}** (over orientation).`);
  if (excluded.length) {
    const exTok = excluded.reduce((s, e) => s + e.cost, 0);
    L.push(`**Excluded by budget: ${excluded.length} items, ~${fmtTokens(exTok)}** — ${excluded.slice(0, 5).map((e) => e.path.split('/').pop()).join(', ')}${excluded.length > 5 ? ' …' : ''}`);
  }
  return L.join('\n');
}

function slim(r) {
  return { path: r.path, tokens: r.tokens, loadPolicy: r.loadPolicy, heavy: !!r.heavy };
}
function pct(a, b) {
  if (!b) return 'n/a';
  return Math.round((a / b) * 100) + '%';
}

function listSubsystems(subsystems, map, profiles) {
  const L = [];
  if (profiles && Object.keys(profiles).length) {
    L.push('Profiles (canned task bundles — `context:cost -- --profile <name>`):', '');
    for (const [name, p] of Object.entries(profiles)) {
      L.push(`    --profile ${name.padEnd(14)} → ${String(p.target).padEnd(20)} (budget ${fmtTokens(p.budget || 0)})  ${p.note}`);
    }
    L.push('');
  }
  const apps = map ? Object.entries(map.by_app_reachable || {}) : [];
  if (apps.length) {
    L.push('Apps (import-graph reachable set — `context:cost -- app:<name>`):', '');
    for (const [app, v] of apps.sort((a, b) => b[1].tokens - a[1].tokens)) {
      L.push(`    app:${app.padEnd(16)} ${v.files} files, ~${fmtTokens(v.tokens)} source`);
    }
    L.push('');
  }
  L.push('Subsystems (curated bundles from subsystems.json):', '');
  const byTier = {};
  for (const s of subsystems) (byTier[s.tier] ||= []).push(s);
  for (const tier of Object.keys(byTier).sort()) {
    L.push(`  [${tier}]`);
    for (const s of byTier[tier].sort((a, b) => a.id.localeCompare(b.id))) {
      L.push(`    ${s.id.padEnd(28)} ${s.area}`);
    }
  }
  L.push('');
  L.push(`Tiers: ${[...KNOWN_TIERS].join(', ')}`);
  return L.join('\n');
}

function fail(msg) {
  process.stderr.write(`context-cost: ${msg}\n`);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { budget: 0, full: false, json: false, pack: false };
  const positional = [];
  let profileName = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--budget') opts.budget = Number(argv[++i]) || 0;
    else if (a === '--full') opts.full = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--pack') opts.pack = true;
    else if (a === '--profile') profileName = argv[++i];
    else if (a === '--list' || a === '--list-subsystems') opts.list = true;
    else positional.push(a);
  }

  const subsystems = loadSubsystems();
  const profiles = loadProfiles();
  if (opts.list) {
    const map = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : null;
    process.stdout.write(listSubsystems(subsystems, map, profiles) + '\n');
    return;
  }

  let target = positional[0];
  // Profile resolves to a target + default budget + note.
  if (profileName) {
    const p = profiles[profileName];
    if (!p) fail(`unknown profile "${profileName}". Known: ${Object.keys(profiles).join(', ')}`);
    target = p.target;
    if (!opts.budget) opts.budget = p.budget || 0;
    opts.profileNote = `Profile "${profileName}": ${p.note}`;
    if (!opts.pack && !opts.json) opts.pack = true; // profiles default to a packed reading list
  }
  if (!target) {
    fail('missing target.\nUsage: npm run context:cost -- <app:name|subsystem-id|tier|path> [--budget N] [--pack] [--json]\n       npm run context:cost -- --profile <name>\n       npm run context:cost -- --list');
  }

  const map = loadMap();
  const plan = resolveTarget(target, map, subsystems);
  const out = opts.pack ? renderPack(plan, map, opts) : render(plan, map, opts);
  process.stdout.write(out + '\n');
}

try {
  main();
} catch (e) {
  fail(e.stack || e.message);
}
