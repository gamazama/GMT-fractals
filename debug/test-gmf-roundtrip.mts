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
import { saveGMFScene, loadGMFScene, parseGMF, generateGMF, isGMFFormat } from '../engine-gmt/utils/FormulaFormat.ts';

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

// ── shaderMeta survival ──────────────────────────────────────────────────
// FormulaFormat's @invariant: shaderMeta is the ONLY survival path for the
// non-GLSL shader fields (preambleVars, capabilities, derivedRotations). A
// field added to the runtime shader object without being added to BOTH the
// stash (generateGMF) and the restore (parseGMF) is silently dropped on save
// — data loss with no error. Non-derivable tokens matter most: the parser
// re-derives cp_* / g_difsDE from the body, but `iter:shared-rotation` and
// `derivedRotations` (MB3D live angle lanes) exist only in shaderMeta.
{
    const probe: any = {
        ...Mandelbulb,
        id: 'ShaderMetaProbe',
        shader: {
            ...Mandelbulb.shader,
            preambleVars: ['float g_probeVar;'],
            capabilities: new Set(['shape:per-iteration', 'iter:shared-rotation']),
            derivedRotations: [{ uniform: 'uMb3dRotA', convert: 'deg-sincos', sources: ['coreMath.paramC'] }],
        },
    };
    const round = parseGMF(generateGMF(probe, probe.defaultPreset)) as any;
    ck('shaderMeta: preambleVars survive',
        JSON.stringify(round.shader.preambleVars) === JSON.stringify(probe.shader.preambleVars),
        round.shader.preambleVars);
    ck('shaderMeta: derivedRotations survive',
        JSON.stringify(round.shader.derivedRotations) === JSON.stringify(probe.shader.derivedRotations),
        round.shader.derivedRotations);
    ck('shaderMeta: non-derivable capability token survives',
        round.shader.capabilities?.has?.('iter:shared-rotation'),
        [...(round.shader.capabilities ?? [])]);
    ck('shaderMeta: capabilities restored as a Set', round.shader.capabilities instanceof Set);
    ck('shaderMeta: stash removed from the returned def', round.shaderMeta === undefined);
}

// ── Retired legacy booleans stay readable forever ────────────────────────
// selfContainedSDE / usesSharedRotation / supportsCuttingPlane are never
// written any more, but old .gmf files (and the ones the GMF_API_DOCS banner
// teaches humans/LLMs to hand-author) carry them and MUST still be promoted
// to capability tokens on parse. Hand-written fixture: this is the shape of
// a file the current generator can no longer produce.
{
    const LEGACY_GMF = `<!--
  GMF: legacy fixture (retired boolean flags)
-->
<Metadata>
{
  "id": "LegacyFlagProbe",
  "name": "Legacy Flag Probe",
  "parameters": [],
  "shaderMeta": { "selfContainedSDE": true, "usesSharedRotation": true, "supportsCuttingPlane": true },
  "defaultPreset": { "formula": "LegacyFlagProbe" }
}
</Metadata>

<Shader_Function>
void formula_LegacyFlagProbe(inout vec4 z, inout float dr, inout float trap, vec4 c) { z.x += c.x; }
</Shader_Function>

<Shader_Loop>
formula_LegacyFlagProbe(z, dr, trap, c);
</Shader_Loop>
`;
    try {
        const d = parseGMF(LEGACY_GMF) as any;
        const caps: Set<string> = d.shader.capabilities;
        ck('legacy: selfContainedSDE → shape:self-contained', caps.has('shape:self-contained'), [...caps]);
        ck('legacy: self-contained excludes shape:per-iteration', !caps.has('shape:per-iteration'), [...caps]);
        ck('legacy: usesSharedRotation → iter:shared-rotation', caps.has('iter:shared-rotation'), [...caps]);
        ck('legacy: supportsCuttingPlane → estimator:cutting-plane', caps.has('estimator:cutting-plane'), [...caps]);
    } catch (e) {
        fails.push(`legacy flag fixture: parseGMF threw — ${(e as Error).message}`);
    }
}

// ── Scene round-trip is STABLE and lossless ──────────────────────────────
// save → load → save must be byte-identical, and fields the current build
// does not know about must survive untouched. A field that normalises on
// load is silent data loss on the NEXT save, which is how a scene degrades
// across edits rather than at once.
{
    const preset: any = {
        ...(Mandelbulb.defaultPreset || {}),
        formula: 'Mandelbulb',
        cameraPos: { x: 1.2345, y: -0.5, z: 3.0 },
        projectSettings: { name: 'roundtrip probe' },
        // Stands in for any field written by a NEWER build than this one.
        __unknownFutureField: { a: 1, b: [1, 2, 3] },
    };
    const s1 = saveGMFScene(preset);
    const r1 = loadGMFScene(s1);
    const s2 = saveGMFScene(r1.preset as any);
    ck('scene: save→load→save is byte-identical', s1 === s2, [s1.length, s2.length]);
    ck('scene: unknown future field survives the round-trip',
        JSON.stringify((r1.preset as any).__unknownFutureField) === JSON.stringify(preset.__unknownFutureField),
        (r1.preset as any).__unknownFutureField);
    ck('scene: projectSettings survives', (r1.preset as any).projectSettings?.name === 'roundtrip probe');
}

// ── isGMFFormat dispatch ─────────────────────────────────────────────────
// trimStart() treats U+FEFF as whitespace (ECMAScript WhiteSpace includes
// <ZWNBSP>), so a BOM-prefixed GMF still dispatches to the GMF branch. Pins
// that, and pins the negative case: plain JSON must NOT take the GMF branch.
{
    const gmf = generateGMF(Mandelbulb, Mandelbulb.defaultPreset);
    ck('isGMFFormat: BOM-prefixed GMF still dispatches as GMF', isGMFFormat('﻿' + gmf));
    ck('isGMFFormat: BOM-prefixed GMF still parses', (() => {
        try { return parseGMF('﻿' + gmf).id === Mandelbulb.id; } catch { return false; }
    })());
    ck('isGMFFormat: plain JSON is not GMF', !isGMFFormat('{"formula":"Mandelbulb"}'));
    ck('isGMFFormat: bare <Metadata> header is GMF', isGMFFormat('<Metadata>\n{}\n</Metadata>'));
}

console.log(`\n==== GMF round-trip: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) {
    for (const f of fails) console.log('  ✗ ' + f);
    process.exit(1);
}
