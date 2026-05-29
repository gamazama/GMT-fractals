#!/usr/bin/env node
// build-symbol-index.mjs
// Emit plans/context-protocol/symbol-index.json — for every heavy context-worthy
// source file (>= the map's threshold), the top-level symbols and their line
// spans. A browsable companion to the on-the-fly slice guide in context-cost;
// lets a reader target line ranges in big files instead of loading them whole.
//
// Run:  npm run context:symbols   (reads context-map.json; run context:map first)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractSymbols } from './symbols.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const MAP_PATH = join(REPO_ROOT, 'plans', 'context-protocol', 'context-map.json');
const OUT = join(REPO_ROOT, 'plans', 'context-protocol', 'symbol-index.json');

const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|mts)$/;

function main() {
  if (!existsSync(MAP_PATH)) {
    process.stderr.write('context-map.json not found. Run: npm run context:map\n');
    process.exit(1);
  }
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const targets = map.entries.filter(
    (e) => e.heavy && e.contextClass === 'source' && SOURCE_RE.test(e.path),
  );

  const files = {};
  let totalSymbols = 0;
  for (const e of targets) {
    let text;
    try { text = readFileSync(join(REPO_ROOT, e.path.split('/').join(sep)), 'utf8'); }
    catch { continue; }
    const symbols = extractSymbols(text).map((s) => ({
      name: s.name, kind: s.kind, exported: s.exported,
      startLine: s.startLine, endLine: s.endLine, lines: s.lines,
    }));
    files[e.path] = { tokens: e.tokens, tier: e.tier, symbols };
    totalSymbols += symbols.length;
  }

  const doc = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    heavy_token_threshold: map.heavy_token_threshold,
    file_count: Object.keys(files).length,
    symbol_count: totalSymbols,
    files,
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  process.stdout.write(
    `Wrote symbol-index.json: ${doc.file_count} heavy source files, ${totalSymbols} symbols.\n`,
  );
}

try { main(); } catch (e) {
  process.stderr.write(`build-symbol-index failed: ${e.stack || e.message}\n`);
  process.exit(1);
}
