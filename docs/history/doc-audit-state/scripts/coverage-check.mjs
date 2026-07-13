#!/usr/bin/env node
// coverage-check.mjs
// Diffs file-inventory.yaml against coverage.yaml.
// Reports:
//   - uncovered: in inventory but not in coverage
//   - orphan_claims: in coverage but not in inventory
//   - partial: coverage entries with confidence: partial
//   - percent covered

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = resolve(__dirname, '..');
const INV = resolve(STATE_DIR, 'file-inventory.yaml');
const COV = resolve(STATE_DIR, 'coverage.yaml');

function die(code, msg) {
  process.stderr.write(`coverage-check: ${msg}\n`);
  process.exit(code);
}

// Minimal YAML loader for our known schema (top-level scalars + entries list with `- key: value` lines)
function loadDoc(path) {
  if (!existsSync(path)) die(1, `not found: ${path}`);
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  const doc = { entries: [] };
  let inEntries = false;
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    if (!inEntries) {
      if (/^entries:\s*$/.test(raw)) { inEntries = true; continue; }
      const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(raw);
      if (m) doc[m[1]] = m[2].replace(/^["']|["']$/g, '');
      continue;
    }
    // Inside entries
    const itemStart = /^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(raw);
    const itemCont = /^\s+([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(raw);
    if (itemStart) {
      if (cur) doc.entries.push(cur);
      cur = {};
      cur[itemStart[1]] = itemStart[2].replace(/^["']|["']$/g, '');
    } else if (itemCont && cur) {
      cur[itemCont[1]] = itemCont[2].replace(/^["']|["']$/g, '');
    }
  }
  if (cur) doc.entries.push(cur);
  return doc;
}

function main() {
  const inv = loadDoc(INV);
  const cov = loadDoc(COV);

  const invPaths = new Set(inv.entries.map(e => e.path));
  const covPaths = new Set(cov.entries.map(e => e.path));

  const uncovered = [...invPaths].filter(p => !covPaths.has(p)).sort();
  const orphans = [...covPaths].filter(p => !invPaths.has(p)).sort();
  const partial = cov.entries.filter(e => e.confidence === 'partial').map(e => e.path).sort();

  const pct = invPaths.size === 0 ? 0 : (100 * (invPaths.size - uncovered.length) / invPaths.size);

  const out = {
    summary: {
      inventory: invPaths.size,
      covered: invPaths.size - uncovered.length,
      uncovered: uncovered.length,
      orphan_claims: orphans.length,
      partial: partial.length,
      percent: Number(pct.toFixed(2)),
    },
    uncovered,
    orphan_claims: orphans,
    partial,
  };

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

try { main(); } catch (e) { die(1, e.message); }
