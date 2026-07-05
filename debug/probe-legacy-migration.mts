/**
 * P4.4/P4.5 legacy-absorption round-trip probe.
 *
 * Synthesizes OLD-STYLE legacy scenes (features.interlace / Hybrid Box
 * interleaved geometry state) as real loadable preset JSON files, renders them
 * on the real GPU through the render harness, and writes reference PNGs.
 *
 * Two phases (same script, --migrated flag):
 *   REFERENCE (default) — renders the LEGACY path (interlace/geometry features
 *     drive the shader via configOverrides; the harness never runs loadPreset,
 *     so store-side migration does not interfere). Run BEFORE the migration
 *     lands and keep the PNGs: after step 3 retires the features, the legacy
 *     path cannot be rendered again.
 *   MIGRATED (--migrated) — runs each preset file through the P4.4/P4.5
 *     load-time migration (window.migrateLegacyScenePreset, exposed by the
 *     harness), renders the migrated scene, writes side-by-side PNGs. The
 *     pixel-equivalence verdict on ref vs migrated pairs is the USER's.
 *
 * Requires the dev server (:3400) + HEADED Chromium (real ANGLE/D3D11 GPU).
 *
 *   npx tsx debug/probe-legacy-migration.mts [--port=3400] [--migrated] [--only=id]
 *
 * Output: debug/scratch/p44/scenes/*.json + debug/scratch/p44/{ref,migrated}/*.png
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import '../engine-gmt/formulas/index.ts'; // side-effect: registers native defs

const argVal = (f: string) => process.argv.find((a) => a.startsWith(f + '='))?.split('=')[1];
const PORT = argVal('--port') ?? '3400';
const MIGRATED = process.argv.includes('--migrated');
const ONLY = argVal('--only');

const SCENES_DIR = 'debug/scratch/p44/scenes';
const OUT = MIGRATED ? 'debug/scratch/p44/migrated' : 'debug/scratch/p44/ref';
fs.mkdirSync(SCENES_DIR, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/** Legacy interlace param state for a secondary formula: its declared params'
 *  defaults mapped onto interlace<Slot> keys (what buildInterlaceDefaults did),
 *  with explicit overrides layered on to prove VALUE migration. */
function interlaceParams(secondaryId: string, overrides: Record<string, any> = {}): Record<string, any> {
    const def = registry.get(secondaryId as any);
    if (!def) throw new Error(`not registered: ${secondaryId}`);
    const out: Record<string, any> = {};
    for (const p of def.parameters as any[]) {
        if (!p?.id) continue;
        const key = `interlace${p.id.charAt(0).toUpperCase()}${p.id.slice(1)}`;
        out[key] = p.default;
    }
    return { ...out, ...overrides };
}

/** Old-style scene: the host formula's defaultPreset + legacy feature state. */
function legacyScene(id: string, hostId: string, features: Record<string, any>, extra: Record<string, any> = {}) {
    const def = registry.get(hostId as any);
    if (!def) throw new Error(`not registered: ${hostId}`);
    const preset: any = clone(def.defaultPreset);
    preset.formula = hostId;
    preset.name = `P44 legacy ${id}`;
    preset.features = { ...(preset.features ?? {}), ...features };
    Object.assign(preset, extra);
    return { id, preset };
}

const scenes = [
    // Visual baseline for the eye + the expectation for il-disabled.
    legacyScene('ref-plain-bulb', 'Mandelbulb', {}),

    // Interlace, generic host: Mandelbulb ⊗ AmazingBox every 2nd iter from 1.
    // Secondary Scale off-default (-1.8) proves VALUE (not default) migration.
    legacyScene('il-bulb-box', 'Mandelbulb', {
        interlace: {
            interlaceCompiled: true, interlaceEnabled: true,
            interlaceFormula: 'AmazingBox', interlaceInterval: 2, interlaceStartIter: 1,
            ...interlaceParams('AmazingBox', { interlaceParamA: -1.8 }),
        },
    }),

    // Interlace, custom-getDist host (the lead-slot getDist splice case): the
    // KleinianMobius DE reads ks_* accumulator globals in getDist — impossible
    // on any generic estimator. VERY sparse secondary (every 16th from 30) so
    // the Kleinian look survives (denser interlace collapses the orbit to fog —
    // faithful but featureless, useless as a comparison target).
    legacyScene('il-kleinian-host', 'KleinianMobius', {
        interlace: {
            interlaceCompiled: true, interlaceEnabled: true,
            interlaceFormula: 'Mandelbulb', interlaceInterval: 16, interlaceStartIter: 30,
            ...interlaceParams('Mandelbulb'),
        },
    }),

    // Second custom-getDist host (Apollonian: getDist reads apo_* inversion
    // globals) — structured at a denser interlace than the Kleinian tolerates.
    legacyScene('il-apollonian-host', 'Apollonian', {
        interlace: {
            interlaceCompiled: true, interlaceEnabled: true,
            interlaceFormula: 'Mandelbulb', interlaceInterval: 6, interlaceStartIter: 4,
            ...interlaceParams('Mandelbulb'),
        },
    }),

    // Disabled-but-configured: must round-trip as base-formula-only
    // (≈ ref-plain-bulb; migrates to weaveEnabled:false).
    legacyScene('il-disabled', 'Mandelbulb', {
        interlace: {
            interlaceCompiled: true, interlaceEnabled: false,
            interlaceFormula: 'AmazingBox', interlaceInterval: 2, interlaceStartIter: 1,
            ...interlaceParams('AmazingBox', { interlaceParamA: -1.8 }),
        },
    }),

    // Hybrid Box INTERLEAVED (hybridComplex) — the P4.5 migration case:
    // fold every 2nd iter from 0, capped at 4 invocations.
    legacyScene('hb-interleaved', 'Mandelbulb', {
        geometry: {
            hybridCompiled: true, hybridMode: true, hybridComplex: true,
            hybridSkip: 2, hybridIter: 4, hybridSwap: false,
            hybridFoldType: 0, hybridScale: 2.0, hybridMinR: 0.5, hybridFixedR: 1.0,
            hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        },
    }),

    // Hybrid Box FAST PATH (pre-loop, !hybridComplex) — retired P4.7. REFERENCE
    // shot renders the legacy pre-loop engine (capture BEFORE retiring it);
    // --migrated renders the dense-intro-layer weave. The ref↔migrated pair is
    // NOT pixel-exact (colour/bailout shift by hybridIter) — the owner's verdict.
    legacyScene('hb-fastpath', 'Mandelbulb', {
        coreMath: { iterations: 12 },
        geometry: {
            hybridCompiled: true, hybridMode: true, hybridComplex: false,
            hybridIter: 3, hybridFoldType: 0, hybridScale: 2.0,
            hybridMinR: 0.5, hybridFixedR: 1.0,
            hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        },
    }, { cameraPos: { x: 0, y: 0, z: 6.5 }, targetDistance: 6.5 }),
].filter((s) => !ONLY || s.id === ONLY);

// Persist the legacy scene files (the artifacts the round-trip gate loads).
for (const s of scenes) {
    fs.writeFileSync(`${SCENES_DIR}/${s.id}.json`, JSON.stringify(s.preset, null, 2));
}

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto(`http://localhost:${PORT}/render-harness.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runRenderTest, { timeout: 60000 });

for (const s of scenes) {
    const p: any = s.preset;
    const spec = {
        id: s.id, formula: p.formula, mode: 'single', size: [480, 480], timeoutMs: 120000, imageFormat: 'png',
        configOverrides: p.features,
        cameraOverrides: {
            pos: [p.cameraPos?.x ?? 0, p.cameraPos?.y ?? 0, p.cameraPos?.z ?? 3],
            rot: [p.cameraRot?.x ?? 0, p.cameraRot?.y ?? 0, p.cameraRot?.z ?? 0, p.cameraRot?.w ?? 1],
            targetDistance: p.targetDistance ?? 3,
            sceneOffset: p.sceneOffset,
        },
    };
    let r: any = {};
    try {
        r = MIGRATED
            ? await pg.evaluate(([pp, sp]) => (window as any).runLegacyMigrationTest(pp, sp), [p, spec] as any)
            : await pg.evaluate((sp) => (window as any).runRenderTest(sp), spec as any);
    } catch (e: any) { r = { error: String(e?.message ?? e) }; }
    const url = r?.thumbnailPNG || r?.imageDataUrl;
    if (url) fs.writeFileSync(`${OUT}/${s.id}.png`, Buffer.from(url.split(',')[1], 'base64'));
    const nb = r?.render?.nonBlackFraction;
    const mig = MIGRATED ? ` → ${r?.migrated ? r?.migratedFormula : 'NOT MIGRATED (legacy path)'}` : '';
    console.log(`${s.id.padEnd(18)} ok=${r?.ok} nb=${nb !== undefined ? nb.toFixed(3) : '-'} sigma=${JSON.stringify(r?.render?.sigma)} compileMs=${r?.compile?.totalMs ?? '-'}${mig} ${r?.error ?? ''}`);
}
await b.close();
console.log(`\n${MIGRATED ? 'migrated' : 'reference'} shots → ${OUT}/  ·  scene files → ${SCENES_DIR}/`);
