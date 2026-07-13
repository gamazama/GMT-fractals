// edges.mjs
// Live import-graph edges — forward (deps) and reverse (dependents) — built by
// reusing reachability.mjs's repo-tuned resolver (it already understands `@/`
// aliases, `?raw`/`?worker`/`?url` suffixes, worker `new URL(...)` imports, and
// bundler `.js`→`.ts` resolution). Computed on demand per query: there is NO
// committed edge index to keep fresh. See docs/policy/context-loading-protocol.md.
//
// Only PARSE_EXTS files are read for edges; specifiers resolve to ANY tracked
// file (incl. .css/.glsl/.json), so `dependents foo.glsl` works. Bare/external
// specifiers (react, three, …) are dropped — this is the in-repo graph only.
//
// Zero dependencies. Regex-based (via reachability.mjs) — intentionally generous,
// good enough to answer "what imports X" without an agent fan-out; verify at the
// source when it matters.

import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { extractSpecifiers, resolveSpecifier } from './reachability.mjs';

const PARSE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs']);

function extOf(p) {
  const i = p.lastIndexOf('.');
  const s = p.lastIndexOf('/');
  return i > s ? p.slice(i) : '';
}

/**
 * Build the in-repo import graph over `trackedPaths` (repo-relative, posix).
 * Returns { deps, dependents } as Map<file, Set<file>> — resolved tracked files
 * only. `deps.get(a)` = files a imports; `dependents.get(b)` = files that import b.
 */
export function buildEdges(repoRoot, trackedPaths) {
  const tracked = new Set(trackedPaths);
  const deps = new Map();
  const dependents = new Map();
  for (const rel of trackedPaths) {
    if (!PARSE_EXTS.has(extOf(rel))) continue;
    let text;
    try { text = readFileSync(join(repoRoot, rel.split('/').join(sep)), 'utf8'); }
    catch { continue; }
    const out = deps.get(rel) || new Set();
    for (const spec of extractSpecifiers(text)) {
      const r = resolveSpecifier(spec, rel, tracked);
      if (r && r !== rel) {
        out.add(r);
        let back = dependents.get(r);
        if (!back) { back = new Set(); dependents.set(r, back); }
        back.add(rel);
      }
    }
    deps.set(rel, out);
  }
  return { deps, dependents };
}

/** Transitive closure from `start` over an adjacency Map (excludes `start`). */
export function closure(start, adj) {
  const seen = new Set();
  const queue = [...(adj.get(start) || [])];
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const m of adj.get(n) || []) if (!seen.has(m)) queue.push(m);
  }
  return seen;
}
