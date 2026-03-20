/**
 * DEC Fractal Collection — V3 pipeline test
 *
 * Runs the V3 analyze+generate pipeline on all 339 raw DE functions
 * from the Distance Estimator Compendium. These are standalone GLSL,
 * not Fragmentarium .frag files — no uniforms, presets, or includes.
 *
 * Run:  npx tsx debug/test-dec-formulas.mts
 *   or: npx tsx debug/test-dec-formulas.mts --verbose
 *   or: npx tsx debug/test-dec-formulas.mts Julia
 */

import { parse } from '@shaderfrog/glsl-parser';
import { analyzeSource } from '../features/fragmentarium_import/v3/analyze/index.js';
import { generateFormula } from '../features/fragmentarium_import/v3/generate/index.js';
import { DEC_FRACTALS } from '../features/fragmentarium_import/random-formulas.js';

const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.slice(2).find(a => !a.startsWith('-'));

const ok  = (s: string) => `\x1b[32m✓\x1b[0m  ${s}`;
const err = (s: string) => `\x1b[31m✗\x1b[0m  ${s}`;
const wrn = (s: string) => `\x1b[33m⚠\x1b[0m  ${s}`;
const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

let passed = 0, failed = 0, analyzeErrors = 0, generateErrors = 0, glslErrors = 0;

const failedList: { id: string; stage: string; error: string }[] = [];

for (const fractal of DEC_FRACTALS) {
    if (FILTER && !fractal.id.toLowerCase().includes(FILTER.toLowerCase())) continue;

    const name = fractal.id.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    // ── V3 Analysis ──
    const analysis = analyzeSource(fractal.code, fractal.id);
    if (!analysis.ok) {
        console.log(err(`${fractal.id} — analyze: ${analysis.error}`));
        failedList.push({ id: fractal.id, stage: 'analyze', error: analysis.error });
        analyzeErrors++;
        failed++;
        continue;
    }

    const a = analysis.value;
    const selectedFunc = a.functions.find(f => f.isAutoDetectedDE)?.name
        ?? a.functions.find(f => f.name === 'de')?.name
        ?? a.functions[0]?.name;

    if (!selectedFunc) {
        console.log(err(`${fractal.id} — no function found`));
        failedList.push({ id: fractal.id, stage: 'function-selection', error: 'no function found' });
        failed++;
        continue;
    }

    // ── V3 Generation ──
    const loopMode = a.functions.find(f => f.name === selectedFunc)?.loop ? 'loop' as const : 'single' as const;
    const result = generateFormula(a, selectedFunc, loopMode, name, a.params);

    if (!result.ok) {
        console.log(err(`${fractal.id} — generate: ${result.error} (stage: ${result.stage})`));
        failedList.push({ id: fractal.id, stage: `generate:${result.stage}`, error: result.error });
        generateErrors++;
        failed++;
        continue;
    }

    const v3 = result.value;

    // ── Validate GLSL parses ──
    let glslOk = true;
    try {
        const uniformStubs = (v3.uniformDeclarations || '')
            .split('\n')
            .filter(l => l.trim() && !l.trim().startsWith('//'))
            .join('\n');
        parse(uniformStubs + '\n' + v3.functionCode);
    } catch (e: any) {
        const msg = (e?.message ?? String(e)).split('\n')[0].slice(0, 120);
        console.log(err(`${fractal.id} — GLSL parse: ${msg}`));
        failedList.push({ id: fractal.id, stage: 'glsl-parse', error: msg });
        glslErrors++;
        glslOk = false;
    }

    if (glslOk) {
        const mode = v3.mode;
        const getDist = v3.getDist ? 'yes' : 'no';
        if (VERBOSE) {
            console.log(ok(`${fractal.id}  ${mode}  getDist=${getDist}  warnings=${v3.warnings.length}  by:${fractal.author}`));
            if (v3.warnings.length) v3.warnings.forEach(w => console.log(dim('   ' + w)));
        }
        passed++;
    } else {
        failed++;
    }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed}/${total} passed  (${(passed/total*100).toFixed(1)}%)`);
if (analyzeErrors > 0) console.log(`  ${analyzeErrors} analysis errors`);
if (generateErrors > 0) console.log(`  ${generateErrors} generation errors`);
if (glslErrors > 0) console.log(`  ${glslErrors} GLSL parse errors`);
if (failed > 0) {
    console.log(`\n  Failed formulas:`);
    for (const f of failedList) {
        console.log(`    ${f.id} [${f.stage}]: ${f.error.slice(0, 100)}`);
    }
}
