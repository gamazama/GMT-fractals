/**
 * MB3D hybrid-weave tests (Phase 2): sequencer (pure) + fused emitter.
 * Run: `npm run test:mb3d:weave`  (tsx debug/test-mb3d-weave.mts)
 */
import { buildWeaveSequence, emitWeaveGLSL } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import type { MB3DAddon, MB3DFormulaSlot, MB3DScene, MB3DHeader } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

registry.register(AmazingBox);

let pass = 0;
const fails: string[] = [];
function ck(name: string, cond: boolean, got?: unknown) {
  if (cond) pass++;
  else fails.push(`${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
}

function slot(iterCount: number, formulaIndex = 0, optionValues: number[] = []): MB3DFormulaSlot {
  const ov = [...optionValues, ...new Array(16).fill(0)].slice(0, 16);
  return { iterCount, formulaIndex, optionCount: optionValues.length, name: '', optionTypes: new Array(16).fill(0), optionValues: ov };
}
function addon(iterCounts: number[], hybOpt1 = 0, options1 = 0): MB3DAddon {
  return { version: 16, options1, options2: 0, options3: 0, formulaCount: iterCounts.length, hybOpt1, hybOpt2: 0, slots: iterCounts.map((c) => slot(c)) };
}
function scene(slots: MB3DFormulaSlot[], header: Partial<MB3DHeader> = {}): MB3DScene {
  const h: MB3DHeader = {
    mandId: 44, width: 800, height: 800, iterations: 30, iOptions: 0, zoom: 1, fovY: 60,
    midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0,
    m3dVersion: 1.89, tilingOptions: 0, ...header,
  };
  return { version: 18, header: h, title: 'WeaveTest', addon: { version: 16, options1: 0, options2: 0, options3: 0, formulaCount: slots.length, hybOpt1: 0, hybOpt2: 0, slots }, raw: new Uint8Array(0) };
}
function expand(plan: ReturnType<typeof buildWeaveSequence>, n: number): number[] {
  const lut = plan.order.map((v) => (v < 0 ? ~v : v));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i < plan.introLen ? lut[i] : lut[plan.introLen + ((i - plan.introLen) % plan.cycleLen)]);
  return out;
}

// ── Sequencer ──────────────────────────────────────────────────────────────
{
  const p = buildWeaveSequence(addon([2, 1]));
  ck('demo order [0,0,1]x3', JSON.stringify(expand(p, 9)) === JSON.stringify([0, 0, 1, 0, 0, 1, 0, 0, 1]), expand(p, 9));
  ck('demo endTo=1', p.endTo === 1, p.endTo);
  ck('demo cycleLen=3', p.cycleLen === 3, p.cycleLen);
}
{
  const p = buildWeaveSequence(addon([1, 1, 1]));
  ck('three-slot [0,1,2]x3', JSON.stringify(expand(p, 9)) === JSON.stringify([0, 1, 2, 0, 1, 2, 0, 1, 2]), expand(p, 9));
}
{
  const p = buildWeaveSequence(addon([1, 2, 1], 0x10));
  ck('intro+cycle endTo=2', p.endTo === 2, p.endTo);
  ck('intro+cycle repeatFrom=1', p.repeatFrom === 1, p.repeatFrom);
  ck('intro+cycle seq', JSON.stringify(expand(p, 10)) === JSON.stringify([0, 1, 1, 2, 1, 1, 2, 1, 1, 2]), expand(p, 10));
}
{
  const p = buildWeaveSequence(addon([2, 0, 1]));
  ck('empty-middle skipped', JSON.stringify(expand(p, 6)) === JSON.stringify([0, 0, 2, 0, 0, 2]), expand(p, 6));
}
{
  const { glsl, fnName } = emitWeaveGLSL(buildWeaveSequence(addon([2, 1])), 'mbX');
  ck('emit const int array', /const int mbX_WEAVE\[3\] = int\[\]\(0, 0, 1\);/.test(glsl), glsl);
  ck('emit fn name', fnName === 'mbX_weaveSlot', fnName);
}

// ── Fused emitter ──────────────────────────────────────────────────────────
{
  // Demo: Amazing Box (#4, x2) + Real Power (#1, x1) — all intern, faithful.
  const s = scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  const { def, ledger } = emitFusedHybrid(s);
  ck('emit supported', ledger.supported === true, ledger.reasons);
  ck('emit def not null', !!def);
  ck('emit all intern', ledger.slotFlags.every((f) => f.tier === 'intern'), ledger.slotFlags);
  if (def) {
    const fn = def.shader.function;
    ck('emit slot0 fn', /_slot0\(inout vec4/.test(fn));
    ck('emit slot1 fn', /_slot1\(inout vec4/.test(fn));
    ck('emit weaveSlot', /_weaveSlot\(int i\)/.test(fn));
    ck('emit dispatcher i-arg', /formula_MB3DHybrid\d+\(inout vec4 z, inout float dr, inout float trap, inout vec4 c, int i\)/.test(fn));
    ck('emit loopBody passes i', /formula_MB3DHybrid\d+\(z, dr, trap, c, i\);/.test(def.shader.loopBody), def.shader.loopBody);
    ck('emit preset camera cloned', !!(def.defaultPreset as any).cameraRot);
    // Box(3 scalars)+RealPower(2) = 5 ≤ 6 → multi-slot parametric: body reads uParamA,
    // the scale is a uniform default (in coreMath), not a baked -1.5 literal.
    ck('emit multi-intern parametric (uParamA, not baked)', /uParamA/.test(fn) && !/-1\.5/.test(fn), 'multi-slot now exposes params');
  }
}
{
  // Non-decompiled external slot -> unsupported (a name not in the library, so
  // it stays "external [CODE]" even as the decompiler corpus grows).
  const ext = slot(1, 20, [1]); ext.name = '__not_a_real_formula__';
  const { def, ledger } = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1]), ext]));
  ck('external -> unsupported', ledger.supported === false && def === null, ledger.reasons);
  ck('external reason mentions CODE/external', ledger.reasons.some((r) => /code|external/i.test(r)), ledger.reasons);
}
{
  // Decompiled external [CODE] formula (Menger3) -> supported, consts resolved.
  const menger: MB3DFormulaSlot = {
    iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10,
    optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
    optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const { def, ledger } = emitFusedHybrid(scene([menger]));
  ck('Menger3 decompiled supported', ledger.supported === true && !!def, ledger.reasons);
  ck('Menger3 tier decompiled', ledger.slotFlags[0]?.tier === 'decompiled', ledger.slotFlags[0]);
  ck('Menger3 no unresolved Cm consts', !!def && !/\bCm\d+\b/.test(def.shader.function));
  ck('Menger3 has abs fold', !!def && /abs\(/.test(def.shader.function));
  // Parametric: Scale (scalar) + CScale (vec3, X/Y/Z grouped) + Rotation1 + Rotation2
  // (vec3), uniforms + in-shader rotation. CScale X/Y/Z collapse into one vec3 slider.
  const p = (def?.parameters ?? []) as any[];
  ck('Menger3 exposes 4 params', p.length === 4, p.map((x) => x.label));
  ck('Menger3 param labels', p[0].label === 'Scale' && p[1].label === 'CScale' && p[1].type === 'vec3' && p[2].label === 'Rotation1' && p[3].label === 'Rotation2', p.map((x) => x.label));
  ck('Menger3 binds uniforms + rotation helper', !!def && /uParamA/.test(def.shader.function) && /mb3dRot/.test(def.shader.function));
  const q = (def?.defaultPreset as any)?.features?.quality ?? {};
  // estimator 2 = r/dr (Sqrt(Rout)/Abs(w)), the source-correct DE for IFS/box folds
  // (doHybridPasDE, formulas.pas:3735; opt 2 falls through to the AmBox+IFS branch).
  // metric 0 = Euclidean: MB3D's DE radius is Sqrt(Rout) with no metric option
  // (formulas.pas:2498); the prior Chebyshev (1) was an unjustified divergence. ADR-0088.
  ck('Menger3 DE applied (fudge 0.2, estimator 2, metric 0=Euclidean)', q.fudgeFactor === 0.2 && q.estimator === 2.0 && q.distanceMetric === 0.0, q);
}
{
  // Single-slot Amazing Box -> editable Scale/MinR/Fold sliders (parametric mode).
  const { def } = emitFusedHybrid(scene([slot(1, 4, [-1.5, 0.4, 1])]));
  ck('single-slot def not null', !!def);
  if (def) {
    const p = def.parameters as any[];
    ck('single-slot exposes 3 params', p.length === 3, p.map((x) => x.id));
    ck('single-slot Scale/MinR/Fold labels', p[0].label === 'Scale' && p[1].label === 'Min Radius' && p[2].label === 'Folding Limit', p.map((x) => x.label));
    ck('single-slot body reads uParamA (not baked)', /uParamA/.test(def.shader.function) && !/m = -1\.5 \//.test(def.shader.function));
    const cm = (def.defaultPreset as any).features.coreMath;
    ck('single-slot coreMath paramA=-1.5', cm.paramA === -1.5, cm.paramA);
    ck('single-slot coreMath paramB=0.4', cm.paramB === 0.4, cm.paramB);
  }
}
{
  // Multi-slot now exposes per-slot params when they fit the shared uniform budget:
  // Amazing Box (3 scalars) + Real Power (2 scalars) = 5 ≤ 6. A cross-slot allocator
  // threads distinct uniforms (Box→paramA/B/C, RealPower→paramD/E), values in coreMath.
  const { def } = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]));
  const p = (def?.parameters ?? []) as any[];
  ck('multi-slot exposes 5 params', !!def && p.length === 5, p.map((x: any) => x.label));
  ck('multi-slot body reads uniforms (not baked)', !!def && /uParamA/.test(def.shader.function) && !/-1\.5/.test(def.shader.function));
  ck('multi-slot coreMath seeds scale=-1.5', (def?.defaultPreset as any)?.features?.coreMath?.paramA === -1.5);
}

{
  // DENSE PARAM-PACKING: a >6-scalar multi-slot hybrid used to BAKE (old budget was
  // 6 scalars paramA..F). Four Real Power slots = 8 scalars: paramA..F fill (6), then
  // the 4th slot's two params pack into the idle uVec2A.{x,y} lanes as ONE combined
  // vec2 slider. Previously this whole scene fell back to baking literals (no sliders).
  const { def } = emitFusedHybrid(scene([slot(1, 1, [8, 1]), slot(1, 1, [8, 1]), slot(1, 1, [8, 1]), slot(1, 1, [8, 1])]));
  const p = (def?.parameters ?? []) as any[];
  ck('dense-pack: def not baked (non-null)', !!def);
  ck('dense-pack: exposes 7 params (6 scalar + 1 packed vec2)', p.length === 7, p.map((x: any) => x.label));
  const v2 = p.find((x: any) => x?.id === 'vec2A');
  ck('dense-pack: a param packs into vec2A', !!v2 && v2.type === 'vec2', p.map((x: any) => `${x.id}:${x.type ?? 'float'}`));
  ck('dense-pack: packed label joins members with " | "', !!v2 && /\|/.test(v2.label), v2?.label);
  ck('dense-pack: body reads uVec2A component lane', !!def && /uVec2A\.[xy]/.test(def!.shader.function));
  ck('dense-pack: still reads paramA..F too', !!def && /uParamA/.test(def!.shader.function) && /uParamF/.test(def!.shader.function));
  ck('dense-pack: coreMath seeds vec2A {x:8,y:1}', (def?.defaultPreset as any)?.features?.coreMath?.vec2A?.x === 8 && (def?.defaultPreset as any)?.features?.coreMath?.vec2A?.y === 1, (def?.defaultPreset as any)?.features?.coreMath?.vec2A);
}
{
  // DEEP dense-pack: four Amazing Box slots = 12 scalars (3 each) overflow paramA..F →
  // uVec2A/B/C → uVec4A. startSlot alignment never splits a vec uniform across two slots
  // (so a slot ending mid-vec wastes the tail rather than colliding), which is why the
  // 12 scalars reach the uVec4 lanes here. Confirms the allocator reaches uVec4 and never
  // emits two params with the same base id.
  const { def } = emitFusedHybrid(scene(Array.from({ length: 4 }, () => slot(1, 4, [2, 0.5, 1]))));
  const p = (def?.parameters ?? []) as any[];
  ck('deep-pack: def not baked', !!def);
  ck('deep-pack: reaches uVec4 lane', !!def && /uVec4A\.[xyzw]/.test(def!.shader.function), p.map((x: any) => x.id));
  ck('deep-pack: no duplicate param ids (vec not split across slots)', new Set(p.map((x: any) => x.id)).size === p.length, p.map((x: any) => x.id));
}

{
  // vec4-AS-vec3 overflow: two Menger3 slots each need 3 vec3 units (CScale triple +
  // Rotation1 + Rotation2) = 6 total. uVec3A/B/C hold 3; the surplus overflows into the
  // shared uVec4* units as .xyz holders (rendered as 3-axis vec3 sliders). Previously a
  // >3-vec3 scene baked outright.
  const menger = (): MB3DFormulaSlot => ({ iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10, optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0], optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  const { def } = emitFusedHybrid(scene([menger(), menger()]));
  const p = (def?.parameters ?? []) as any[];
  ck('vec4-as-vec3: def not baked', !!def);
  const vec4held = p.filter((x: any) => /^vec4[ABC]$/.test(x.id) && x.type === 'vec3');
  ck('vec4-as-vec3: vec3 params overflow into uVec4 holders', vec4held.length >= 1, p.map((x: any) => `${x.id}:${x.type}`));
  ck('vec4-as-vec3: uVec3 units filled first', !!def && /uVec3A/.test(def!.shader.function) && /uVec3C/.test(def!.shader.function));
  ck('vec4-as-vec3: rotation binds mb3dRot(uVec4*.xyz)', !!def && /mb3dRot\(uVec4[ABC]\.xyz/.test(def!.shader.function), 'rotation in a vec4 holder');
  ck('vec4-as-vec3: triple binds uVec4*.x/.y/.z', !!def && /uVec4[ABC]\.x/.test(def!.shader.function));
  ck('vec4-as-vec3: no duplicate param ids', new Set(p.map((x: any) => x.id)).size === p.length, p.map((x: any) => x.id));
}

// ── Standalone catalog coverage ──────────────────────────────────────────────
// Every formula the import modal offers must emit a valid fused def via the
// single-slot synth path (the same one loadDecompiledFormula/loadInternFormula
// use). This catches emit-level breakage across the whole catalog at once.
{
  const { getMB3DCatalog } = await import('../engine-gmt/utils/mb3d/mb3dCatalog.ts');
  const { DECOMPILED_DEFAULTS } = await import('../engine-gmt/utils/mb3d/decompiled-formulas.ts');
  const synthSlot = (e: any): MB3DFormulaSlot => {
    if (e.kind === 'intern') return slot(0, e.ref, e.internDefaults ?? []);
    const d = DECOMPILED_DEFAULTS[e.ref] ?? { optionTypes: [], optionValues: [], optionCount: 0 };
    return { iterCount: 0, formulaIndex: 20, name: e.ref, optionCount: d.optionCount, optionTypes: d.optionTypes, optionValues: d.optionValues };
  };
  const cat = getMB3DCatalog();
  const all = cat.flatMap((g) => g.entries);
  ck('catalog non-empty', all.length >= 70, all.length);
  ck('catalog has intern Amazing Box', all.some((e) => e.kind === 'intern' && e.ref === 4));
  const broken: string[] = [];
  for (const e of all) {
    const { def, ledger } = emitFusedHybrid(scene([synthSlot(e)]));
    const fnOk = !!def && typeof def.shader.function === 'string' && def.shader.function.includes('void formula_');
    if (!def || !ledger.supported || !fnOk) broken.push(`${e.label} [${e.kind}:${e.ref}]`);
  }
  ck(`all ${all.length} catalog formulas emit a valid def`, broken.length === 0, broken.slice(0, 8));
}

console.log(`\n==== MB3D weave: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) {
  console.log('FAILURES:\n - ' + fails.join('\n - '));
  process.exit(1);
}
