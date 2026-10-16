// freshMap.mjs
// The context map is a local, git-ignored cache (2026-10-16): nothing commits it.
// Every reader loads it through ensureFreshMap(), which rebuilds it first when it
// is missing, when the file set changed (a file added, deleted or renamed), or when
// any listed file was modified after the map was written. A rebuild takes ~4 s and
// happens on the first query after a change; later queries reuse the cache.
//
// The file set is tracked files PLUS untracked files git does not ignore, so a
// file a session just created counts before it is `git add`ed (the old trap:
// "stage new files before context:map" is gone).
//
// Integration seams: context-cost.mjs (loadMap, --list), context-check.mjs,
// build-symbol-index.mjs. build-context-map.mjs imports listFiles() so the map
// and this staleness test always agree on what "the file set" is.

import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..', '..', '..');
export const MAP_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'context-map.json');
const BUILD = join(__dirname, 'build-context-map.mjs');

/** Tracked + untracked-not-ignored files that exist in the working tree. */
export function listFiles() {
  const out = execSync('git ls-files --cached --others --exclude-standard', {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return [...new Set(out.split(/\r?\n/).filter(Boolean))].filter((p) => existsSync(join(REPO_ROOT, p)));
}

/** Why the map needs a rebuild, or null when it is current. */
export function staleReason(files = listFiles()) {
  if (!existsSync(MAP_PATH)) return 'no map yet';
  let map;
  try { map = JSON.parse(readFileSync(MAP_PATH, 'utf8')); } catch { return 'map unreadable'; }
  const mapped = new Set(map.entries.map((e) => e.path));
  const current = new Set(files);
  const added = files.filter((p) => !mapped.has(p)).length;
  const removed = [...mapped].filter((p) => !current.has(p)).length;
  if (added || removed) return `file set changed (${added} added, ${removed} removed)`;
  const builtAt = statSync(MAP_PATH).mtimeMs;
  for (const p of files) {
    if (statSync(join(REPO_ROOT, p)).mtimeMs > builtAt) return `${p} changed since the map was built`;
  }
  return null;
}

/** The current map, rebuilt first if stale. Rebuild output goes to stderr so --json stays clean. */
export function ensureFreshMap() {
  const reason = staleReason();
  if (reason) {
    process.stderr.write(`context map: ${reason}; rebuilding (~4 s)…\n`);
    execFileSync(process.execPath, [BUILD, '--quiet'], { cwd: REPO_ROOT, stdio: ['ignore', 2, 2] });
  }
  return JSON.parse(readFileSync(MAP_PATH, 'utf8'));
}
