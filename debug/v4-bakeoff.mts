/**
 * V3 vs V4 bakeoff — produces the 2×2 outcome matrix for the verified baseline.
 *
 * Inputs:
 *   debug/v4-expected-passing.txt       (V3 baseline, sorted pass names)
 *   debug/v4-verify-results.jsonl        (latest V4 run)
 *
 * Output:
 *   - overall pass/fail deltas
 *   - regressions (V3 pass → V4 fail)
 *   - improvements (V3 fail → V4 pass)
 *   - optional: detailed per-bucket formula lists with failFirstGate
 *
 * Usage:
 *   npx tsx debug/v4-bakeoff.mts                   # summary + top regressions
 *   npx tsx debug/v4-bakeoff.mts --all             # full lists
 *   npx tsx debug/v4-bakeoff.mts --regressions     # only the regression list
 */

import * as fs from 'fs';
import * as path from 'path';

const ALL = process.argv.includes('--all');
const ONLY_REG = process.argv.includes('--regressions');

const V3_PASS_PATH = path.resolve('debug/v4-expected-passing.txt');
const V4_JSONL_PATH = path.resolve('debug/v4-verify-results.jsonl');

if (!fs.existsSync(V3_PASS_PATH)) {
    console.error(`Missing V3 baseline: ${V3_PASS_PATH}`);
    console.error('  (generate with: npx tsx debug/v4-diff-baseline.mts --update-baseline after a V3 run)');
    process.exit(2);
}
if (!fs.existsSync(V4_JSONL_PATH)) {
    console.error(`Missing V4 results: ${V4_JSONL_PATH}`);
    console.error('  (generate with: npx tsx debug/v4-verify.mts --pipeline=v4 --fresh)');
    process.exit(2);
}

const v3Pass = new Set(
    fs.readFileSync(V3_PASS_PATH, 'utf8').split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#')),
);

interface V4Row {
    name: string;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate?: string;
    parse?: { error?: string };
    webglCompile?: { error?: string };
}

const v4Rows: V4Row[] = [];
for (const line of fs.readFileSync(V4_JSONL_PATH, 'utf8').trim().split('\n').filter(Boolean)) {
    try { v4Rows.push(JSON.parse(line)); } catch {}
}
// Dedup by name (last wins, matching existing baseline convention)
const v4Map = new Map<string, V4Row>();
for (const r of v4Rows) v4Map.set(r.name, r);

// ─── 2×2 outcome matrix ─────────────────────────────────────────────────────

const v3PassV4Pass: string[] = [];       // no change (both pass)
const regressions: Array<{ name: string; gate?: string; msg?: string }> = []; // V3 pass → V4 not-pass
const improvements: string[] = [];       // V3 fail/absent → V4 pass
const bothNotPass: string[] = [];        // neither pass (not very interesting)

for (const [name, row] of v4Map) {
    const v3 = v3Pass.has(name);
    const v4 = row.overall === 'pass';
    if (v3 && v4) v3PassV4Pass.push(name);
    else if (v3 && !v4) {
        const msg = row.parse?.error || row.webglCompile?.error || '';
        regressions.push({ name, gate: row.failFirstGate, msg: msg.split('\n')[0].slice(0, 90) });
    }
    else if (!v3 && v4) improvements.push(name);
    else bothNotPass.push(name);
}

// Formulas in V3 baseline but missing from V4 results (e.g. ingest rejected them entirely)
for (const name of v3Pass) {
    if (!v4Map.has(name)) {
        regressions.push({ name, gate: 'missing', msg: 'not in V4 results (ingest-rejected or name mismatch)' });
    }
}

const v4PassTotal = [...v4Map.values()].filter(r => r.overall === 'pass').length;

// ─── Report ─────────────────────────────────────────────────────────────────

console.log(`\n  V3 vs V4 bakeoff`);
console.log(`  V3 baseline passes: ${v3Pass.size}`);
console.log(`  V4 passes:          ${v4PassTotal}`);
console.log();
console.log(`  ┌─────────────────┬───────────┬───────────┐`);
console.log(`  │                 │ V4 pass   │ V4 ¬pass  │`);
console.log(`  ├─────────────────┼───────────┼───────────┤`);
console.log(`  │ V3 pass         │ ${String(v3PassV4Pass.length).padStart(4)} ✓✓   │ ${String(regressions.length).padStart(4)} \x1b[31mREGR\x1b[0m │`);
console.log(`  │ V3 ¬pass        │ ${String(improvements.length).padStart(4)} \x1b[32mIMPR\x1b[0m │ ${String(bothNotPass.length).padStart(4)} ✗✗   │`);
console.log(`  └─────────────────┴───────────┴───────────┘`);
console.log();
console.log(`  Net change: ${v4PassTotal - v3Pass.size >= 0 ? '+' : ''}${v4PassTotal - v3Pass.size} formulas`);

if (regressions.length > 0 && !ONLY_REG) {
    console.log(`\n  Regressions (V3 pass → V4 ¬pass), first ${ALL ? regressions.length : 30}:`);
}
if (regressions.length > 0) {
    // Bucket by gate to see failure distribution
    const gateBuckets: Record<string, number> = {};
    for (const r of regressions) gateBuckets[r.gate ?? 'unknown'] = (gateBuckets[r.gate ?? 'unknown'] || 0) + 1;
    console.log(`\n  Regressions by gate:`);
    for (const [g, n] of Object.entries(gateBuckets).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${g.padEnd(28)} ${n}`);
    }

    console.log();
    const listSize = ALL ? regressions.length : 30;
    for (const r of regressions.slice(0, listSize)) {
        console.log(`    \x1b[31m✗\x1b[0m  ${r.name.padEnd(36)} [${(r.gate ?? '?').padEnd(16)}] ${r.msg ?? ''}`);
    }
    if (regressions.length > listSize) console.log(`    …and ${regressions.length - listSize} more (use --all to see all)`);
}

if (improvements.length > 0 && !ONLY_REG) {
    console.log(`\n  Improvements (V3 ¬pass → V4 pass), first ${ALL ? improvements.length : 30}:`);
    const listSize = ALL ? improvements.length : 30;
    for (const name of improvements.slice(0, listSize)) {
        console.log(`    \x1b[32m✓\x1b[0m  ${name}`);
    }
    if (improvements.length > listSize) console.log(`    …and ${improvements.length - listSize} more`);
}

process.exit(regressions.length > 0 ? 1 : 0);
