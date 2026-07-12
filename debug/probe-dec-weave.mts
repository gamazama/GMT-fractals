/**
 * DEC → weave-slot plumbing probe (headless, no GPU).
 *
 * Answers: "can a Workshop-imported DEC formula still be woven?" by mirroring
 * the exact production path:
 *   1. detectFormulaV3 / transformFormulaV3 (the Workshop's V3 import pipeline
 *      — per-iteration mode is what makes an import weavable; V4 self-contained
 *      imports are rejected by design)
 *   2. buildAndRegister equivalent (FormulaWorkshop.tsx) — deriveImportCapabilities
 *      + registry.register
 *   3. nativeSlotReject — the weave picker's greying predicate (undefined = listed
 *      as weavable under "Imported")
 *   4. buildWeaveScene + emitFusedHybrid — the Weave Editor's build path
 *   5. ShaderFactory.generateFragmentShader — full engine shader assembly
 *
 * Gates 1-5 are structural; the real webglCompile gate needs a browser
 * (native-weave-sweep.mts). A native⊗native control pair baselines the gates.
 *
 *   npx tsx debug/probe-dec-weave.mts [decId ...]   (default: a 6-formula sample)
 */
import * as fs from 'fs';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
import { registerFeatures } from '../engine-gmt/features/index.ts';
import '../engine-gmt/formulas/index.ts'; // side-effect: registers native FractalDefinitions
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { buildWeaveScene } from '../engine-gmt/utils/mb3d/sceneSynth.ts';
import { nativeSlotShell, nativeSlotReject } from '../engine-gmt/engine/weave/nativeSlotCatalog.ts';
import { detectFormulaV3, transformFormulaV3 } from '../engine-gmt/features/fragmentarium_import/v3/compat.ts';
import { deriveImportCapabilities } from '../engine-gmt/features/fragmentarium_import/import-capabilities.ts';
import { buildFractalParams, filterDeadParams } from '../engine-gmt/features/fragmentarium_import/workshop/param-builder.ts';
import type { FractalDefinition } from '../engine-gmt/types/fractal.ts';

registerFeatures();

const ok  = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

const DEFAULT_SAMPLE = ['fractal_de', 'fractal_de8', 'fractal_de17', 'fractal_de42', 'fractal_de100', 'gweave'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : DEFAULT_SAMPLE;

const decData = JSON.parse(fs.readFileSync('public/formulas/dec.json', 'utf8')) as Array<{ id: string; author: string; code: string }>;
const catalog = JSON.parse(fs.readFileSync('public/formulas/v3-v4-catalog.json', 'utf8')).byId as Record<string, { v3: string; v4: string }>;

/** Mirror of FormulaWorkshop.buildAndRegister (V3 path). */
function importDecAsV3(decId: string): { def: FractalDefinition; mode: string } | { error: string } {
    const entry = decData.find((d) => d.id === decId);
    if (!entry) return { error: `not in dec.json` };

    const detected = detectFormulaV3(entry.code, decId);
    if ('error' in detected) return { error: `detect: ${detected.error}` };

    const regId = decId.replace(/[^a-zA-Z0-9_]/g, '');
    const result = transformFormulaV3(detected, detected.selectedFunction, detected.loopMode, regId, detected.params);
    if (!result) return { error: 'transform returned null' };

    const allCode = [result.function, result.loopBody, result.getDist, result.loopInit].filter(Boolean).join('\n');
    const liveMappings = filterDeadParams(detected.params, allCode);
    const { uiParams, defaultPreset } = buildFractalParams(liveMappings, regId);
    const shaderGlsl = {
        function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
        loopBody: result.loopBody,
        getDist: result.getDist,
        loopInit: result.loopInit,
    };
    const isFullDe = result.mode === 'full-de';
    const def: FractalDefinition = {
        id: regId as any,
        name: regId,
        description: 'Imported formula',
        shader: {
            ...shaderGlsl,
            capabilities: deriveImportCapabilities(shaderGlsl, isFullDe ? 'self-contained' : 'per-iteration'),
        },
        parameters: uiParams,
        defaultPreset,
        importSource: {
            glsl: entry.code, selectedFunction: detected.selectedFunction,
            loopMode: detected.loopMode, mappings: liveMappings,
        } as any,
    };
    registry.register(def);
    return { def, mode: result.mode };
}

/** Mirror of native-weave-sweep's buildWeaveEngine: fuse + full shader assembly. */
function weaveWith(primaryId: string, secondaryId: string): { fusedOk: boolean; shaderOk: boolean; detail: string } {
    let def: any, ledger: any;
    try {
        ({ def, ledger } = emitFusedHybrid(
            buildWeaveScene([nativeSlotShell(primaryId, 1), nativeSlotShell(secondaryId, 1)], `${primaryId}+${secondaryId}`),
        ));
    } catch (e: any) {
        return { fusedOk: false, shaderOk: false, detail: `emit threw: ${e?.message ?? e}` };
    }
    if (!def) return { fusedOk: false, shaderOk: false, detail: `emit: ${ledger?.reasons?.join('; ')}` };
    registry.register(def);
    try {
        const raw = ShaderFactory.generateFragmentShader(createDefaultShaderConfig(def.id));
        const hasSlot1 = /\bws1_/.test(raw); // slots are 0-based: ws0_ = primary, ws1_ = secondary
        return {
            fusedOk: true, shaderOk: true,
            detail: `shader ${Math.round(raw.length / 1024)}kB, slot-1 prefix ${hasSlot1 ? 'present' : 'MISSING'}`,
        };
    } catch (e: any) {
        return { fusedOk: true, shaderOk: false, detail: `assembly threw: ${e?.message ?? e}` };
    }
}

// ── Census mode: tally V3 emit mode across ALL DEC formulas ──
// Per-iteration mode is the weavable one; full-de → shape:self-contained → greyed.
if (process.argv.includes('--census')) {
    const tally: Record<string, string[]> = { 'per-iteration': [], 'full-de': [], error: [] };
    for (const entry of decData) {
        try {
            const detected = detectFormulaV3(entry.code, entry.id);
            if ('error' in detected) { tally.error.push(entry.id); continue; }
            const regId = 'census_' + entry.id.replace(/[^a-zA-Z0-9_]/g, '');
            const result = transformFormulaV3(detected, detected.selectedFunction, detected.loopMode, regId, detected.params);
            if (!result) { tally.error.push(entry.id); continue; }
            (tally[result.mode] ?? (tally[result.mode] = [])).push(entry.id);
        } catch { tally.error.push(entry.id); }
    }
    for (const [mode, list] of Object.entries(tally)) {
        console.log(`${mode.padEnd(14)} ${String(list.length).padStart(4)}  ${dim(list.slice(0, 10).join(', ') + (list.length > 10 ? ' …' : ''))}`);
    }
    process.exit(0);
}

// ── List mode: all weavable DEC formulas, full-chain-verified, with the
// display name/author/category shown in the Workshop's Browse DEC dialog ──
if (process.argv.includes('--list')) {
    const manifest = JSON.parse(fs.readFileSync('public/formulas/manifest.json', 'utf8')).decs as Array<{ id: string; name: string; author: string; category: string }>;
    const byId = new Map(manifest.map((m) => [m.id, m]));
    const rows: string[] = [];
    let checked = 0;
    for (const entry of decData) {
        // Honest filter: per-iteration alone isn't enough — the Workshop's auto
        // pipeline only routes to V3 when the honest harness says v3 passes GPU
        // compile (recommended:'v3'); v3-fail entries auto-import via V4 →
        // self-contained → "can't weave". Matches the catalog `weavable` flag.
        if (catalog[entry.id]?.v3 !== 'pass') continue;
        const imp = importDecAsV3(entry.id);
        if ('error' in imp || imp.mode !== 'per-iteration') continue;
        if (nativeSlotReject(imp.def)) continue;
        checked++;
        const w = weaveWith('Mandelbulb', imp.def.id);
        if (!w.fusedOk || !w.shaderOk) { console.log(bad(`${entry.id}: ${w.detail}`)); continue; }
        const m = byId.get(entry.id);
        rows.push(`${(m?.name ?? entry.id).padEnd(10)} ${(m?.author ?? entry.author).padEnd(14)} ${m?.category ?? ''}`);
    }
    console.log(`\n${'NAME'.padEnd(10)} ${'AUTHOR'.padEnd(14)} CATEGORY  ${dim('(Browse DEC dialog fields)')}`);
    for (const r of rows) console.log(r);
    console.log(`\n${rows.length}/${checked} per-iteration DEC formulas pass the full weave chain`);
    process.exit(0);
}

// ── Control: native ⊗ native (known-good from native-weave-sweep) ──
console.log('── control: Mandelbulb ⊗ AmazingBox');
{
    const r = weaveWith('Mandelbulb', 'AmazingBox');
    console.log(r.fusedOk && r.shaderOk ? ok(`control weave builds — ${r.detail}`) : bad(`CONTROL FAILED — ${r.detail}`));
}

// ── DEC imports ──
let pass = 0, fail = 0;
for (const decId of ids) {
    const compat = catalog[decId];
    console.log(`\n── dec: ${decId} ${dim(`(catalog v3: ${compat?.v3 ?? 'unknown'})`)}`);

    const imp = importDecAsV3(decId);
    if ('error' in imp) { console.log(bad(imp.error)); fail++; continue; }
    console.log(ok(`V3 import registered as '${imp.def.id}' — mode: ${imp.mode}`));

    const reject = nativeSlotReject(imp.def);
    if (reject) { console.log(bad(`weave picker would GREY this: ${reject}`)); fail++; continue; }
    console.log(ok('weave picker lists it as weavable (Imported group, ungreyed)'));

    const w = weaveWith('Mandelbulb', imp.def.id);
    if (!w.fusedOk || !w.shaderOk) { console.log(bad(w.detail)); fail++; continue; }
    console.log(ok(`Mandelbulb ⊗ ${imp.def.id} fuses + full shader assembles — ${w.detail}`));
    pass++;
}

console.log(`\n${pass}/${pass + fail} DEC formulas pass the full plumbing chain (structural gates; GPU compile gate = native-weave-sweep)`);
process.exit(fail ? 1 : 0);
