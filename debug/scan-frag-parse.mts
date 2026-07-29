/**
 * Walk every frag in the public library and run it through:
 *   1. V3 detect (what the Workshop pre-populates on selection)
 *   2. V4 processFormula (what Workshop uses when auto-picks V4)
 *
 * Reports which formulas fail each path. The union of failures tells us
 * what the Workshop user sees as parse errors on click.
 *
 * Usage: npx tsx debug/scan-frag-parse.mts   (or `npm run test:frag:scan`)
 *
 * ─── EXIT CONTRACT — READ BEFORE CITING THIS AS A GUARD ─────────────────
 * This is a REPORT, not a pass/fail gate on the importer. It has no
 * assertion on its own results: every failure it finds is printed and then
 * IGNORED by the exit code, which is 0. Do not cite it as passing evidence.
 * `.claude/rules/scene-and-formula-format.md` says the same, and keeps this
 * script OUT of its Guards block deliberately.
 *
 * FALSIFIED 2026-07-29 (guard sweep). Baseline on a clean tree: 200 frags,
 * "V3 fails / V4 ok" 2, "V4 fails / V3 ok" 42, "both fail" 2, exit 0.
 * Forcing `hasDE = false` in engine-gmt/features/fragmentarium_import/v3/
 * compat.ts — i.e. V3 detect rejects every formula in the library — moved
 * those to 156 / 0 / 44 and still exited 0. Total importer breakage is
 * invisible to this script's exit code. That is by design, but it is the
 * kind of design that gets mis-cited, hence this block.
 *
 * The ONE thing it now does gate is having something to report on at all.
 * `walk()` swallows a missing directory, so before 2026-07-29 repointing
 * PUB_DIR at a path that does not exist printed "Scanning 0 frags", three
 * zero counts, and exit 0 — a vacuous report reading exactly like a clean
 * one. (Same shape as the `test:frag` defect found in batch 3.) It also
 * printed a HARDCODED "public/formulas/frag/" in that line regardless of
 * which directory it had actually walked, so the output named a directory
 * it had not read. Both fixed below; the failure counts are untouched.
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectFormulaV3 } from '../engine-gmt/features/fragmentarium_import/v3/compat';
import { processFormula as v4ProcessFormula } from '../engine-gmt/features/fragmentarium_import/v4';

const PUB_DIR = path.resolve(import.meta.dirname, '..', 'public/formulas/frag');

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
// Print the directory actually walked, not a literal — see the exit-contract
// block at the top of this file.
console.log(`Scanning ${files.length} frags in ${path.relative(process.cwd(), PUB_DIR).replace(/\\/g, '/')}/ ...`);
console.log();

// Zero-coverage gate. The ONLY thing this report exits non-zero on: it found
// nothing to scan, so every count below would be a vacuous 0 that reads like a
// clean run. Baseline is 200 files, so this costs nothing today.
if (files.length === 0) {
    console.error(`❌ no .frag files under ${PUB_DIR} — this is zero coverage, not a clean report.`);
    console.error(`   Did the library move, or is PUB_DIR stale?`);
    process.exit(1);
}

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
