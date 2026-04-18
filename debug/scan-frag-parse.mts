/**
 * Walk every frag in the public library and run it through:
 *   1. V3 detect (what the Workshop pre-populates on selection)
 *   2. V4 processFormula (what Workshop uses when auto-picks V4)
 *
 * Reports which formulas fail each path. The union of failures tells us
 * what the Workshop user sees as parse errors on click.
 *
 * Usage: npx tsx debug/scan-frag-parse.mts
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectFormulaV3 } from '../features/fragmentarium_import/v3/compat';
import { processFormula as v4ProcessFormula } from '../features/fragmentarium_import/v4';

const PUB_DIR = path.resolve('public/formulas/frag');

function walk(dir: string): string[] {
    const out: string[] = [];
    (function recur(d: string) {
        if (!fs.existsSync(d)) return;
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const f = path.join(d, e.name);
            if (e.isDirectory()) recur(f);
            else if (e.name.endsWith('.frag')) out.push(f);
        }
    })(dir);
    return out;
}

const files = walk(PUB_DIR).sort();
console.log(`Scanning ${files.length} frags in public/formulas/frag/ ...`);
console.log();

interface Result {
    id: string;
    v3Error?: string;
    v4Error?: string;
}
const results: Result[] = [];

for (const full of files) {
    const rel = path.relative(PUB_DIR, full).replace(/\\/g, '/');
    const basename = path.basename(rel, '.frag');
    const src = fs.readFileSync(full, 'utf8');

    // V3 detect
    let v3Error: string | undefined;
    try {
        const r = detectFormulaV3(src, basename);
        if ('error' in r) v3Error = r.error;
    } catch (e: any) {
        v3Error = e?.message ?? String(e);
    }

    // V4 processFormula
    let v4Error: string | undefined;
    try {
        const r = v4ProcessFormula(src, basename, basename, basename);
        if (!r.ok) v4Error = `${r.error.kind}: ${r.error.message}`;
    } catch (e: any) {
        v4Error = e?.message ?? String(e);
    }

    if (v3Error || v4Error) results.push({ id: rel, v3Error, v4Error });
}

const bothFail = results.filter(r => r.v3Error && r.v4Error);
const onlyV3Fail = results.filter(r => r.v3Error && !r.v4Error);
const onlyV4Fail = results.filter(r => !r.v3Error && r.v4Error);

console.log(`Parse-level summary:`);
console.log(`  V3 fails, V4 ok:     ${onlyV3Fail.length}  (Workshop shows error on select but V4 would work — needs Fix 2)`);
console.log(`  V4 fails, V3 ok:     ${onlyV4Fail.length}  (V3 works; V4 auto-pick would fail — rare)`);
console.log(`  Both fail:           ${bothFail.length}  (unrenderable on selection — should be hidden)`);
console.log();

if (onlyV3Fail.length > 0) {
    console.log(`── V3 fails / V4 ok  (${onlyV3Fail.length}) ──`);
    for (const r of onlyV3Fail) {
        const shortErr = (r.v3Error ?? '').split('\n')[0].slice(0, 100);
        console.log(`  ${r.id}`);
        console.log(`    V3: ${shortErr}`);
    }
    console.log();
}
if (bothFail.length > 0) {
    console.log(`── both fail  (${bothFail.length}) ──`);
    for (const r of bothFail) {
        console.log(`  ${r.id}`);
        console.log(`    V3: ${(r.v3Error ?? '').split('\n')[0].slice(0, 100)}`);
        console.log(`    V4: ${(r.v4Error ?? '').split('\n')[0].slice(0, 100)}`);
    }
}
if (onlyV4Fail.length > 0) {
    console.log(`── V4 fails / V3 ok  (${onlyV4Fail.length}) ──`);
    for (const r of onlyV4Fail) {
        console.log(`  ${r.id}`);
        console.log(`    V4: ${(r.v4Error ?? '').split('\n')[0].slice(0, 100)}`);
    }
}
