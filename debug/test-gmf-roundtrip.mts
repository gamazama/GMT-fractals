/**
 * GMF scene save → load round-trip regression test.
 *
 * Guards the bug fixed 2026-06-25: the GMF_API_DOCS banner literally mentions
 * `<Metadata>`, `<Shader_Function>` etc. in prose. parseGMF's tag extraction
 * must be LINE-ANCHORED so it grabs the real column-0 blocks, not the indented
 * banner examples. A non-anchored regex parsed banner prose as JSON and broke
 * loading of EVERY newly-saved scene.
 *
 * Run: `npm run test:gmf`  (tsx debug/test-gmf-roundtrip.mts)
 */
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { Mandelbulb } from '../engine-gmt/formulas/Mandelbulb.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { saveGMFScene, loadGMFScene, parseGMF, generateGMF } from '../engine-gmt/utils/FormulaFormat.ts';

registry.register(Mandelbulb);
registry.register(AmazingBox);

let pass = 0;
const fails: string[] = [];
const ck = (name: string, cond: boolean, got?: unknown) => {
    if (cond) pass++;
    else fails.push(`${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
};

for (const def of [Mandelbulb, AmazingBox]) {
    const preset: any = {
        ...(def.defaultPreset || {}),
        formula: def.id,
        cameraPos: { x: 1.2345, y: -0.5, z: 3.0 },
        cameraRot: { x: 0.1, y: 0.2, z: 0.0 },
    };

    // Full scene save → load
    const saved = saveGMFScene(preset);
    ck(`${def.id}: banner present`, /AUTHORING KIT/.test(saved));
    ck(`${def.id}: banner mentions <Metadata>`, saved.includes('<Metadata> ... </Metadata>'));

    let loaded: ReturnType<typeof loadGMFScene> | null = null;
    try {
        loaded = loadGMFScene(saved);
    } catch (e) {
        fails.push(`${def.id}: loadGMFScene threw — ${(e as Error).message}`);
    }
    if (loaded) {
        ck(`${def.id}: def id round-trips`, loaded.def?.id === def.id, loaded.def?.id);
        ck(`${def.id}: shader fn restored`, !!loaded.def?.shader?.function);
        ck(`${def.id}: scene formula round-trips`, (loaded.preset as any).formula === def.id);
        ck(`${def.id}: camera round-trips`, (loaded.preset as any).cameraPos?.x === 1.2345,
            (loaded.preset as any).cameraPos);
    }

    // Formula-only GMF (no <Scene>) must still parse the REAL metadata, not banner prose.
    const formulaOnly = generateGMF(def, def.defaultPreset);
    try {
        const d = parseGMF(formulaOnly);
        ck(`${def.id}: formula-only parseGMF id`, d.id === def.id, d.id);
        ck(`${def.id}: formula-only has parameters array`, Array.isArray(d.parameters));
    } catch (e) {
        fails.push(`${def.id}: parseGMF(formula-only) threw — ${(e as Error).message}`);
    }
}

console.log(`\n==== GMF round-trip: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) {
    for (const f of fails) console.log('  ✗ ' + f);
    process.exit(1);
}
