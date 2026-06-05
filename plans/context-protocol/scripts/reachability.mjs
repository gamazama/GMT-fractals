// reachability.mjs
// A lightweight import-graph walker. Given an app's entry file(s), BFS the
// static + dynamic + worker import graph and return the set of tracked source
// files the app actually reaches. Used to cost "what the running app needs"
// rather than a whole tier, and to surface dead context (tracked but unreached).
//
// Scope of resolution (matches this repo's actual config — see vite.config.ts,
// tsconfig.json):
//   - relative specifiers  ./x  ../y           → resolved against importer dir
//   - root alias           @/x                 → resolved against repo root
//   - bare specifiers      three, react, ...   → external, not followed
// TS `bundler` resolution: a `./x.js` specifier may mean `./x.ts(x)`; handled.
// Worker entries via `new Worker(new URL('./w.ts', import.meta.url))`: handled.
//
// Zero dependencies. Regex-based extraction — good enough for a reachable-set
// estimate; it is intentionally generous (counts a file as reached if any
// import path mentions it) rather than precise about tree-shaking.

import { readFileSync } from 'node:fs';
import { join, posix, sep } from 'node:path';

export const APP_ENTRYPOINTS = {
  'app-gmt': ['app-gmt/main.tsx'],
  'fluid-toy': ['fluid-toy/main.tsx'],
  'fractal-toy': ['fractal-toy/main.tsx'],
  'mesh-export': ['mesh-export/main.tsx'],
  'gradient-explorer': ['gradient-explorer/main.tsx'],
  'demo': ['index.tsx'],
};

const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.css', '.glsl', '.json'];
const PARSE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs']);

// Strip line and block comments so JSDoc `@example import ...` lines don't
// register as real edges. Crude but adequate: it does not need to be a parser.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Extract every module specifier referenced by `src`. */
export function extractSpecifiers(src) {
  const text = stripComments(src);
  const specs = new Set();
  const patterns = [
    /\bimport\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g, // import x from '...'
    /\bexport\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g, // export ... from '...'
    /\bimport\s*['"]([^'"]+)['"]/g, // side-effect import '...'
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('...')
    /new\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g, // worker URLs
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

function ext(p) {
  const i = p.lastIndexOf('.');
  const slash = p.lastIndexOf('/');
  return i > slash ? p.slice(i) : '';
}

/**
 * Resolve a specifier to a tracked repo-relative file path, or null.
 * `fromRel` is the importing file's repo-relative path. `tracked` is a Set of
 * repo-relative paths (posix separators).
 */
export function resolveSpecifier(spec, fromRel, tracked) {
  // Strip Vite query suffixes (?raw, ?url, ?worker, ?inline) — the file before
  // the '?' is the real module.
  spec = spec.split('?')[0];
  if (!spec) return null;
  let base;
  if (spec.startsWith('@/')) {
    base = spec.slice(2);
  } else if (spec.startsWith('.')) {
    base = posix.normalize(posix.join(posix.dirname(fromRel), spec));
  } else {
    return null; // bare / external
  }
  base = base.replace(/^\.\//, '');

  const candidates = [];
  const e = ext(base);
  if (e) {
    candidates.push(base);
    // bundler resolution: ./x.js may mean ./x.ts(x)
    if (e === '.js') candidates.push(base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
    if (e === '.jsx') candidates.push(base.replace(/\.jsx$/, '.tsx'));
  } else {
    for (const x of RESOLVE_EXTS) candidates.push(base + x);
    for (const x of RESOLVE_EXTS) candidates.push(posix.join(base, 'index') + x);
  }
  for (const c of candidates) {
    if (tracked.has(c)) return c;
  }
  return null;
}

/**
 * Compute the reachable set from one or more entry files.
 * Returns { reachable:Set<string>, unresolved:Array<{from,spec}>, external:Set }.
 */
export function computeReachable(entries, repoRoot, tracked) {
  const reachable = new Set();
  const unresolved = [];
  const external = new Set();
  const queue = [];

  for (const e of entries) {
    if (tracked.has(e)) { reachable.add(e); queue.push(e); }
  }

  while (queue.length) {
    const rel = queue.shift();
    if (!PARSE_EXTS.has(ext(rel))) continue; // leaf (css/glsl/json) — no edges
    let text;
    try { text = readFileSync(join(repoRoot, rel.split('/').join(sep)), 'utf8'); }
    catch { continue; }
    for (const spec of extractSpecifiers(text)) {
      const resolved = resolveSpecifier(spec, rel, tracked);
      if (resolved) {
        if (!reachable.has(resolved)) { reachable.add(resolved); queue.push(resolved); }
      } else if (spec.startsWith('.') || spec.startsWith('@/')) {
        unresolved.push({ from: rel, spec });
      } else {
        external.add(spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/'));
      }
    }
  }
  return { reachable, unresolved, external };
}

/** Convenience: reachable set per app, plus the union across all apps. */
export function reachableByApp(repoRoot, tracked) {
  const perApp = {};
  const union = new Set();
  for (const [app, entries] of Object.entries(APP_ENTRYPOINTS)) {
    const { reachable, unresolved } = computeReachable(entries, repoRoot, tracked);
    perApp[app] = { reachable, unresolved };
    for (const f of reachable) union.add(f);
  }
  return { perApp, union };
}
