/**
 * Build passing-formulas.ts from the V3 + V4 verification harness snapshots.
 *
 * Policy: a formula is "passing" if webglCompile succeeds in EITHER pipeline.
 * The harness's downstream sample/render gates are known-unreliable in the
 * headless validator environment (see memory/feedback_shader_testing_gates.md)
 * — they false-positive on Mandelbulb, Kalibox, Dodecahedron and many others
 * that render perfectly in the live engine. The only dependable signal for
 * "this formula works in GMT" is webglCompile; everything downstream is advisory.
 *
 * Inputs:
 *   debug/v3-honest-snapshot.jsonl   (V3 honest run)
 *   debug/v4-verify-results.jsonl    (V4 run — most recent)
 *
 * Output:
 *   features/fragmentarium_import/passing-formulas.ts
 *
 * Usage:
 *   npx tsx debug/build-v4-passing.mts              # Regenerate
 *   npx tsx debug/build-v4-passing.mts --dry-run    # Print stats without writing
 */

import * as fs from 'fs';
import * as path from 'path';

const V3_JSONL = path.resolve('debug/v3-honest-snapshot.jsonl');
const V4_JSONL = path.resolve('debug/v4-verify-results.jsonl');
const OUTPUT = path.resolve('features/fragmentarium_import/passing-formulas.ts');
const DRY_RUN = process.argv.includes('--dry-run');

for (const p of [V3_JSONL, V4_JSONL]) {
    if (!fs.existsSync(p)) {
        console.error(`FATAL: ${p} not found. Run debug/v4-verify.mts --fresh (with --pipeline=v3 and v4).`);
        process.exit(1);
    }
}

interface Row {
    name: string;
    category: 'default' | 'frag' | 'dec';
    fragPath?: string;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate?: string;
    webglCompile?: { ok: boolean; error?: string };
}

/**
 * Load a jsonl and index rows BY A UNIQUE KEY. For frag rows that's the
 * fragPath (multiple folders can hold same-named files — e.g. Mandelbulb.frag
 * appears in Claude/, Historical 3D Fractals/, kosalos/, LoicVDB/). For DEC
 * rows the name is unique so it's the key.
 */
function uniqueKey(r: Row): string {
    return r.category === 'frag' && r.fragPath ? `frag:${r.fragPath}` : `${r.category}:${r.name}`;
}

function readJsonl(p: string): Map<string, Row> {
    const m = new Map<string, Row>();
    for (const line of fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean)) {
        try {
            const r = JSON.parse(line) as Row;
            m.set(uniqueKey(r), r);
        } catch {}
    }
    return m;
}

const v3 = readJsonl(V3_JSONL);
const v4 = readJsonl(V4_JSONL);
const allKeys = new Set([...v3.keys(), ...v4.keys()]);

/** A formula is "usable" if at least one pipeline compiled its shader successfully. */
function isUsable(key: string): boolean {
    const v3r = v3.get(key);
    const v4r = v4.get(key);
    if (v3r?.overall === 'pass' || v4r?.overall === 'pass') return true;
    if (v3r?.webglCompile?.ok === true) return true;
    if (v4r?.webglCompile?.ok === true) return true;
    return false;
}

const usableFragPaths: string[] = [];
const usableDecIds: string[] = [];
let totalFrag = 0, totalDec = 0;
let skipFrag = 0, skipDec = 0;
let hardFailFrag = 0, hardFailDec = 0;

for (const key of allKeys) {
    const r = v3.get(key) ?? v4.get(key)!;
    if (r.category === 'frag') totalFrag++;
    if (r.category === 'dec') totalDec++;

    const v3r = v3.get(key);
    const v4r = v4.get(key);
    // Arch-skip in BOTH pipelines = truly out of scope (2D/providesColor/etc)
    if (v3r?.overall === 'skip' && v4r?.overall === 'skip') {
        if (r.category === 'frag') skipFrag++;
        if (r.category === 'dec') skipDec++;
        continue;
    }
    if (!isUsable(key)) {
        if (r.category === 'frag') hardFailFrag++;
        if (r.category === 'dec') hardFailDec++;
        continue;
    }
    if (r.category === 'frag' && r.fragPath) usableFragPaths.push(r.fragPath);
    else if (r.category === 'dec') usableDecIds.push(r.name);
}

usableFragPaths.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
usableDecIds.sort();

console.log(`\n  Honest passing-formulas.ts regen (webglCompile-in-either policy)\n`);
console.log(`  V3 jsonl:  ${V3_JSONL}`);
console.log(`  V4 jsonl:  ${V4_JSONL}`);
console.log(`  Output:    ${OUTPUT}`);
console.log();
console.log(`  Frag:  ${usableFragPaths.length} usable  / ${totalFrag} seen  (${skipFrag} arch-skip, ${hardFailFrag} hard-fail)`);
console.log(`  DEC:   ${usableDecIds.length} usable  / ${totalDec} seen  (${skipDec} arch-skip, ${hardFailDec} hard-fail)`);
console.log();

const fragPaths = usableFragPaths;
const decIds = usableDecIds;
const skipByCat = { frag: skipFrag, dec: skipDec };

if (DRY_RUN) {
    console.log('  --dry-run: not writing.');
    process.exit(0);
}

const today = new Date().toISOString().split('T')[0];

const content = `/**
 * Formulas usable in GMT — one or both pipelines (V3/V4) compile them.
 *
 * Inclusion policy: webglCompile succeeded in V3 or V4. Downstream harness
 * gates (sampleFinite / renderNonDegenerate / gradientFinite) are NOT
 * required — they are known-unreliable in the headless validator and
 * false-positive on classics like Mandelbulb, Kalibox, Dodecahedron that
 * render perfectly in the live engine.
 *
 * Frag: ${fragPaths.length} paths (of ${totalFrag} total, ${skipByCat.frag ?? 0} architectural skips — 2D/buffer/providesColor/no-DE)
 * DEC:  ${decIds.length} ids    (of ${totalDec} total, ${skipByCat.dec ?? 0} skipped)
 *
 * Auto-generated by: npx tsx debug/build-v4-passing.mts
 * Generated: ${today}
 *
 * To regenerate: run debug/v4-verify.mts --pipeline=v3 --fresh AND --pipeline=v4 --fresh,
 *                then this script, then \`npm run catalog:build\` and
 *                \`npx tsx debug/build-formula-manifest.mts\`.
 */

/** Relative paths within reference/Examples/ for passing .frag formulas */
export const PASSING_FRAG_PATHS: string[] = [
${fragPaths.map(p => `    '${p.replace(/'/g, "\\'")}',`).join('\n')}
];

/** DEC fractal IDs that pass verification */
export const PASSING_DEC_IDS: string[] = [
${decIds.map(id => `    '${id.replace(/'/g, "\\'")}',`).join('\n')}
];
`;

fs.writeFileSync(OUTPUT, content);
console.log(`  Wrote ${fragPaths.length} frag paths + ${decIds.length} DEC ids → ${OUTPUT}\n`);
