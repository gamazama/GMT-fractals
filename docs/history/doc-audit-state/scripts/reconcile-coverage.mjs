#!/usr/bin/env node
// reconcile-coverage.mjs
// Given subsystems.json's files_claimed (which contain globs) and coverage.yaml's
// path list, classify each "uncovered" file from coverage-check into:
//   - claimed-but-not-recorded: matched a subsystem's files_claimed glob but missing
//     from coverage.yaml (orchestrator post-processing failure during Phase 1)
//   - truly-unclaimed: not matched by any subsystem's files_claimed (real audit gap)
//   - out-of-scope: deliberately excluded by convention (root config files, plans/, .github/)

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const STATE_DIR = resolve(__dirname, '..');

const subsystems = JSON.parse(readFileSync(resolve(STATE_DIR, 'subsystems.json'), 'utf8'));
const inventoryText = readFileSync(resolve(STATE_DIR, 'file-inventory.yaml'), 'utf8');
const coverageText = readFileSync(resolve(STATE_DIR, 'coverage.yaml'), 'utf8');

function extractPaths(yaml) {
  const out = new Set();
  for (const m of yaml.matchAll(/-\s*path:\s*([^\r\n]+)/g)) {
    out.add(m[1].trim().replace(/^["']|["']$/g, ''));
  }
  return out;
}

const inventoryPaths = extractPaths(inventoryText);
const coveredPaths = extractPaths(coverageText);
const uncovered = [...inventoryPaths].filter(p => !coveredPaths.has(p));

// Resolve glob patterns in files_claimed to actual file lists.
// We support these glob forms based on what's in subsystems.json:
//   - `path/to/dir/*`      → all files DIRECTLY in dir (one level)
//   - `path/to/dir/**`     → all files recursively
//   - exact path           → that file only
function listDir(dirAbs, recurse) {
  if (!existsSync(dirAbs)) return [];
  const out = [];
  for (const name of readdirSync(dirAbs)) {
    const p = join(dirAbs, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (recurse) out.push(...listDir(p, true));
    } else if (st.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function expandClaim(claim) {
  if (claim.endsWith('/**')) {
    const dir = claim.slice(0, -3);
    const abs = resolve(REPO_ROOT, dir);
    return listDir(abs, true).map(p => relative(REPO_ROOT, p).replace(/\\/g, '/'));
  }
  if (claim.endsWith('/*')) {
    const dir = claim.slice(0, -2);
    const abs = resolve(REPO_ROOT, dir);
    return listDir(abs, false).map(p => relative(REPO_ROOT, p).replace(/\\/g, '/'));
  }
  return [claim];
}

// Build a map: file path -> [subsystem ids that would claim it]
const claimMap = new Map();
for (const s of subsystems) {
  if (!Array.isArray(s.files_claimed)) continue;
  for (const claim of s.files_claimed) {
    for (const f of expandClaim(claim)) {
      if (!claimMap.has(f)) claimMap.set(f, []);
      claimMap.get(f).push(s.id);
    }
  }
}

const OUT_OF_SCOPE_PREFIXES = [
  'plans/',
  '.github/',
  '.clinerules',
  '.gitignore',
  '.nvmrc',
  'LICENSE',
  'CODEBASE_MAP.md',
  'HANDOFF.md',
  'CONTRIBUTING.md',
  'README.md',
  'docs/',                 // existing docs are read-only reference, not audit subjects
  '.vscode',
  '.cursorrules',
  'package.json',
  'package-lock.json',
  'tsconfig',
  'vite.config',
  'eslint',
  '.eslintrc',
];

function isOutOfScope(p) {
  return OUT_OF_SCOPE_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix));
}

const claimedButNotRecorded = [];
const trulyUnclaimed = [];
const outOfScope = [];

for (const p of uncovered) {
  if (isOutOfScope(p)) {
    outOfScope.push(p);
  } else if (claimMap.has(p)) {
    claimedButNotRecorded.push({ path: p, claimedBy: claimMap.get(p) });
  } else {
    trulyUnclaimed.push(p);
  }
}

// Group truly-unclaimed by directory for readability
function topGroup(p) {
  const parts = p.split('/');
  if (parts.length <= 1) return '<root>';
  if (parts.length === 2) return parts[0];
  return parts[0] + '/' + parts[1];
}

const byGroup = {};
for (const p of trulyUnclaimed) {
  const g = topGroup(p);
  if (!byGroup[g]) byGroup[g] = [];
  byGroup[g].push(p);
}

const groupSummary = Object.entries(byGroup).sort((a, b) => b[1].length - a[1].length);

console.log(JSON.stringify({
  inventory_total: inventoryPaths.size,
  covered_total: coveredPaths.size,
  uncovered_total: uncovered.length,
  classified: {
    claimed_but_not_recorded: claimedButNotRecorded.length,
    truly_unclaimed: trulyUnclaimed.length,
    out_of_scope: outOfScope.length,
  },
  claimed_but_not_recorded_top10: claimedButNotRecorded.slice(0, 10),
  truly_unclaimed_by_group: groupSummary.map(([g, files]) => ({ group: g, count: files.length, sample: files.slice(0, 3) })),
  out_of_scope_count_by_prefix: OUT_OF_SCOPE_PREFIXES.reduce((acc, p) => {
    acc[p] = outOfScope.filter(f => f === p || f.startsWith(p)).length;
    return acc;
  }, {}),
}, null, 2));
