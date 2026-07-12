/**
 * MB3D hybrid-weave tests (Phase 2): sequencer (pure) + fused emitter.
 * Run: `npm run test:mb3d:weave`  (tsx debug/test-mb3d-weave.mts)
 */
import { buildWeaveSequence, emitWeaveGLSL, weaveSpecFromMB3D } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';
import { emitModuloScheduleGLSL, buildBlockPlan, buildCountsPlan } from '../engine-gmt/engine/weave/schedule.ts';
import { BOUNDS, fitRhythmFromPlan, runsFromRhythm, rhythmPhase, planPhase, simulate } from '../engine-gmt/engine/weave/convert.ts';
import { assembleWeave } from '../engine-gmt/engine/weave/emitWeave.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { resolveNativeSlot } from '../engine-gmt/engine/weave/nativeResolver.ts';
import { getNativeSlotCatalog, nativeSlotReject, nativeSlotShell, isNativeSlot } from '../engine-gmt/engine/weave/nativeSlotCatalog.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { Mandelbulb } from '../engine-gmt/formulas/Mandelbulb.ts';
import { Phoenix } from '../engine-gmt/formulas/Phoenix.ts';
import { Julia3D } from '../engine-gmt/formulas/Julia3D.ts';
import { MandelTerrain } from '../engine-gmt/formulas/MandelTerrain.ts';
import { MengerSponge } from '../engine-gmt/formulas/MengerSponge.ts';
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
    // Box + RealPower woven → each slot BANKS (ADR-0090): slot0's scale reads its bank
    // lane uWs0ParamA (a uniform default in features.weave), not a baked -1.5 literal.
    ck('emit multi-intern banked (uWs0ParamA, not baked)', /uWs0ParamA/.test(fn) && !/-1\.5/.test(fn), 'multi-slot banks each slot');
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
  // (vec3). Rotations bind to the CPU-derived uMb3dRotM* bank (matrix elements in
  // GLSL, angles→mat3 on the CPU); CScale X/Y/Z collapse into one vec3 slider.
  const p = (def?.parameters ?? []) as any[];
  ck('Menger3 exposes 4 params', p.length === 4, p.map((x) => x.label));
  ck('Menger3 param labels', p[0].label === 'Scale' && p[1].label === 'CScale' && p[1].type === 'vec3' && p[2].label === 'Rotation1' && p[3].label === 'Rotation2', p.map((x) => x.label));
  ck('Menger3 binds uniforms + derived rot matrices', !!def && /uParamA/.test(def.shader.function) && /uMb3dRotM0\[/.test(def.shader.function) && /uMb3dRotM1\[/.test(def.shader.function));
  const dr = def?.shader.derivedRotations ?? [];
  ck('Menger3 derivedRotations specs (2× mat3 off vec3 lanes)',
    dr.length === 2 && dr[0].uniform === 'uMb3dRotM0' && dr[1].uniform === 'uMb3dRotM1'
    && dr.every((d: any) => d.convert === 'mb3d-euler-deg-mat3' && d.sources.length === 3 && /^uVec3[BC]\./.test(d.sources[0])), dr);
  ck('Menger3 rotation params carry deg descriptor', p[2].rotation?.units === 'deg' && p[2].rotation?.order === 'mb3d-xyz', p[2].rotation);
  ck('Menger3 no in-shader rotation helper', !!def && !/mb3dRot\(/.test(def.shader.function));
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
  // Multi-slot WOVEN → each MB3D slot BANKS (ADR-0090): Amazing Box (3 params) → bank 0,
  // Real Power (2 params) → bank 1 = 5 live params total, all routed to the `weave`
  // feature; the body reads bank lanes (uWs0ParamA), defaults land in features.weave.
  const { def } = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]));
  const p = (def?.parameters ?? []) as any[];
  ck('multi-slot exposes 5 params', !!def && p.length === 5, p.map((x: any) => x.label));
  ck('multi-slot params banked (feature:weave)', p.every((x: any) => x.feature === 'weave'), p.map((x: any) => `${x.id}/${x.feature}`));
  ck('multi-slot body reads bank uniforms (not baked)', !!def && /uWs0ParamA/.test(def.shader.function) && !/-1\.5/.test(def.shader.function));
  ck('multi-slot bank state seeds scale=-1.5', (def?.defaultPreset as any)?.features?.weave?.ws0ParamA === -1.5, (def?.defaultPreset as any)?.features?.weave);
}

{
  // PER-SLOT BANKS (ADR-0090, extended to MB3D 2026-07-11): four Real Power slots = 8
  // params. The OLD shared dense pool packed 8 scalars into paramA..F + one vec2 lane
  // (and a bigger hybrid overflowed → baked ALL params = "none"). Now each slot banks
  // onto its OWN uWs<k>* pool: 2 plain-scalar params each, no packing, no overflow.
  const { def } = emitFusedHybrid(scene([slot(1, 1, [8, 1]), slot(1, 1, [8, 1]), slot(1, 1, [8, 1]), slot(1, 1, [8, 1])]));
  const p = (def?.parameters ?? []) as any[];
  ck('banks: def not baked (non-null)', !!def);
  ck('banks: exposes 8 params (2 per slot, no packing)', p.length === 8, p.map((x: any) => x.id));
  ck('banks: params spread across ws0..ws3', new Set(p.map((x: any) => x.id.match(/^ws(\d)/)?.[1])).size === 4, p.map((x: any) => x.id));
  ck('banks: every param feature:weave', p.every((x: any) => x.feature === 'weave'), p.map((x: any) => x.feature));
  ck('banks: body reads bank lanes uWs0ParamA / uWs3ParamA', !!def && /uWs0ParamA/.test(def!.shader.function) && /uWs3ParamA/.test(def!.shader.function));
  ck('banks: features.weave seeds ws0ParamA=8', (def?.defaultPreset as any)?.features?.weave?.ws0ParamA === 8, (def?.defaultPreset as any)?.features?.weave?.ws0ParamA);
}
{
  // DEEP: four Amazing Box slots = 12 params (3 each). The OLD dense pool overflowed
  // paramA..F into uVec2/uVec4 component lanes; banks give each slot its own paramA..F,
  // so all 12 stay plain scalars on 4 distinct banks — no overflow, no vec packing.
  const { def } = emitFusedHybrid(scene(Array.from({ length: 4 }, () => slot(1, 4, [2, 0.5, 1]))));
  const p = (def?.parameters ?? []) as any[];
  ck('deep-banks: def not baked', !!def);
  ck('deep-banks: 12 params across ws0..ws3', p.length === 12 && new Set(p.map((x: any) => x.id.match(/^ws(\d)/)?.[1])).size === 4, p.map((x: any) => x.id));
  ck('deep-banks: all plain scalar bank lanes (no vec pack)', p.every((x: any) => /^ws\d(Param[A-F])$/.test(x.id) && (x.type ?? 'float') === 'float'), p.map((x: any) => `${x.id}:${x.type ?? 'float'}`));
  ck('deep-banks: no duplicate param ids', new Set(p.map((x: any) => x.id)).size === p.length, p.map((x: any) => x.id));
}

{
  // Two Menger3 slots, each needing 3 vec3 units (CScale triple + Rotation1 + Rotation2).
  // OLD: 6 vec3 across a shared 3-unit pool overflowed into uVec4 holders. Banks give each
  // slot its OWN uWs<k>Vec3A/B/C, so both fit with ZERO overflow (no vec4 holder).
  const menger = (): MB3DFormulaSlot => ({ iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10, optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0], optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  const { def } = emitFusedHybrid(scene([menger(), menger()]));
  const p = (def?.parameters ?? []) as any[];
  ck('menger-banks: def not baked', !!def);
  // Each slot: Scale (scalar) + CScale (vec3) + Rotation1 (vec3) + Rotation2 (vec3) = 4; ×2 = 8.
  ck('menger-banks: 8 params across ws0/ws1', p.length === 8 && new Set(p.map((x: any) => x.id.match(/^ws(\d)/)?.[1])).size === 2, p.map((x: any) => x.id));
  ck('menger-banks: no vec4 holder (fits own bank vec3 units)', p.every((x: any) => !/Vec4/.test(x.id)), p.map((x: any) => x.id));
  ck('menger-banks: both banks bind their own vec3 units', !!def && /uWs0Vec3A/.test(def!.shader.function) && /uWs1Vec3A/.test(def!.shader.function));
  // Rotations: 2 per slot × 2 slots = 4 derived mat3s, renumbered onto ONE
  // def-global sequence (uMb3dRotM0..3), each sourcing its own slot's bank lanes.
  const dr = (def?.shader.derivedRotations ?? []) as any[];
  ck('menger-banks: 4 derived rotations, globally renumbered',
    dr.length === 4 && new Set(dr.map((d) => d.uniform)).size === 4
    && dr.map((d) => d.uniform).join() === 'uMb3dRotM0,uMb3dRotM1,uMb3dRotM2,uMb3dRotM3', dr.map((d) => d.uniform));
  ck('menger-banks: derived sources point at each slot\'s bank',
    dr.slice(0, 2).every((d) => /^uWs0Vec3/.test(d.sources[0])) && dr.slice(2).every((d) => /^uWs1Vec3/.test(d.sources[0])), dr.map((d) => d.sources[0]));
  ck('menger-banks: GLSL binds renumbered matrices (uMb3dRotM2 present)', !!def && /uMb3dRotM2\[/.test(def!.shader.function));
  ck('menger-banks: no duplicate param ids', new Set(p.map((x: any) => x.id)).size === p.length, p.map((x: any) => x.id));
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

// ── Weave Editor build path: catalog slots → buildWeaveScene → fused def ───────
{
  const { getMB3DCatalog, slotFromCatalogEntry } = await import('../engine-gmt/utils/mb3d/mb3dCatalog.ts');
  const { buildWeaveScene } = await import('../engine-gmt/utils/mb3d/loadMB3DScene.ts');
  const catalog = getMB3DCatalog();
  const flat = catalog.flatMap((g) => g.entries);
  const box = flat.find((e) => e.kind === 'intern' && e.ref === 4)!;
  const bulb = flat.find((e) => e.kind === 'intern' && e.ref === 0)!;
  ck('catalog: intern box + bulb present', !!box && !!bulb);

  const slots = [slotFromCatalogEntry(box, 2), slotFromCatalogEntry(bulb, 1)];
  ck('slotFromCatalogEntry: iterCount applied', slots[0].iterCount === 2 && slots[1].iterCount === 1);

  const weaveScene = buildWeaveScene(slots, 'User Weave Test');
  const { def, ledger } = emitFusedHybrid(weaveScene);
  ck('user weave: emits a def', !!def, ledger.reasons);
  ck('user weave: 2 slots woven', ledger.slotFlags.length === 2, ledger.slotFlags.length);
  ck('user weave: dispatcher + weave LUT emitted', !!def && def.shader.function.includes('_weaveSlot') && def.shader.function.includes('void formula_'));
  // 2+1 cycle: box,box,bulb repeating
  const wPlan = buildWeaveSequence(weaveScene.addon!);
  ck('user weave: schedule is box,box,bulb cycle', expand(wPlan, 6).join(',') === '0,0,1,0,0,1', expand(wPlan, 6));

  const decomp = flat.find((e) => e.kind === 'decompiled');
  if (decomp) {
    const s2 = [slotFromCatalogEntry(box, 1), slotFromCatalogEntry(decomp, 1)];
    const r2 = emitFusedHybrid(buildWeaveScene(s2, 'Mixed Weave'));
    ck(`user weave: intern + decompiled (${decomp.label}) emits`, !!r2.def, r2.ledger.reasons);
  }

  // "Repeat from here" (MB3D repeatFrom nibble): slot 0 runs once as intro,
  // the loop repeats from slot 1.
  const rfScene = buildWeaveScene([slotFromCatalogEntry(box, 2), slotFromCatalogEntry(bulb, 1)], 'RF Weave', undefined, 1);
  const rfPlan = buildWeaveSequence(rfScene.addon!);
  ck('user weave: repeatFrom=1 → box,box intro then bulb loop', expand(rfPlan, 6).join(',') === '0,0,1,1,1,1', expand(rfPlan, 6));
}

// ── Weave core: WeaveSpec adapter + modulo schedule emitter ────────────────────
{
  const { spec, mode } = weaveSpecFromMB3D(addon([2, 3, 0], (1 << 4) | 7, 0));
  ck('spec: mode nibble extracted', mode === 0, mode);
  ck('spec: 6 fixed slots', spec.slots.length === 6, spec.slots.length);
  ck('spec: counts schedule', spec.schedule.kind === 'counts');
  // hybOpt1 endTo nibble = 7, but mode-0 override clamps to the last active slot (1);
  // repeatFrom nibble = 1 stays (≤ endTo, non-empty).
  const sched = spec.schedule as { kind: 'counts'; endTo: number; repeatFrom: number };
  ck('spec: endTo clamped to last active slot', sched.endTo === 1, sched.endTo);
  ck('spec: repeatFrom preserved', sched.repeatFrom === 1, sched.repeatFrom);
  ck('spec: slot sources are mb3d-kind', spec.slots.every((s) => s.source.kind === 'mb3d'));
  ck('spec: iterCounts mirrored', spec.slots.map((s) => s.iterCount).join(',') === '2,3,0,0,0,0');
}
{
  // Modulo schedule (P2 consumers: interlace fold, Hybrid Box interleave).
  const bare = emitModuloScheduleGLSL({ interval: 'uXInterval', startIter: 'uXStart' }, 'T');
  ck('modulo: fnName follows the weave convention', bare.fnName === 'T_weaveSlot', bare.fnName);
  ck('modulo: interval clamps below 1', bare.glsl.includes('if (skip < 1) skip = 1;'));
  ck('modulo: start-relative gate', bare.glsl.includes('int rel = i - int(uXStart);'));
  ck('modulo: primary before start / off-beat', bare.glsl.includes('if (rel < 0 || rel % skip != 0) return 0;'));
  ck('modulo: no enable gate unless asked', !bare.glsl.includes('< 0.5'));
  ck('modulo: no cap unless asked', !bare.glsl.includes('rel / skip'));

  const full = emitModuloScheduleGLSL(
    { enabled: 'uXEnabled', interval: 'uXInterval', startIter: 'uXStart', maxCount: 'uXCount' }, 'T');
  ck('modulo: enable gate emitted', full.glsl.includes('if (uXEnabled < 0.5) return 0;'));
  ck('modulo: invocation cap emitted', full.glsl.includes('if (rel / skip >= int(uXCount)) return 0;'));
}

// ── Rhythm: emitFusedHybrid opts.schedule = modulo (P3b, layered) ──────────────
{
  // 2 active slots + modulo → runtime-uniform layered phase fn, no baked LUT,
  // phases 0/1 (base + layer 1).
  const s = scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  const { def, ledger } = emitFusedHybrid(s, { schedule: { kind: 'modulo' } });
  ck('rhythm: supported', ledger.supported === true && !!def, ledger.reasons);
  if (def) {
    const fn = def.shader.function;
    ck('rhythm: layer 1 reads uWeaveInterval1/StartIter1/Beats1',
      fn.includes('uWeaveInterval1') && fn.includes('uWeaveStartIter1') && fn.includes('uWeaveBeats1'));
    ck('rhythm: no baked counts LUT', !/_WEAVE\[/.test(fn), 'LUT should be absent');
    ck('rhythm: phase fn follows weave convention', /_weaveSlot\(int i\)/.test(fn));
    ck('rhythm: dispatcher phases are 0/1', fn.includes('if (phase == 0)') && fn.includes('if (phase == 1)'));
    ck('rhythm: no slot-index phases beyond 1', !fn.includes('if (phase == 2)'));
    ck('rhythm: beats gate is endless-when-0', fn.includes('int(uWeaveBeats1) <= 0 ||'));
  }
  // Same scene WITHOUT opts stays on the counts LUT (byte-identity backstop —
  // the full 38-scene probe is debug/probe-weave-refactor.mts).
  const base = emitFusedHybrid(s);
  ck('rhythm: opts absent → counts LUT, no rhythm uniforms',
    !!base.def && /_WEAVE\[/.test(base.def.shader.function) && !base.def.shader.function.includes('uWeaveInterval'));
}
{
  // 3 active slots = base + 2 independent layers (the GMT hybrid-box+interlace
  // pattern): phases 0/1/2, each layer on its own uniform set, checked in order.
  const three = emitFusedHybrid(
    scene([slot(1, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1]), slot(1, 0, [8])]), { schedule: { kind: 'modulo' } });
  ck('rhythm: 3 active slots supported (layered)', three.ledger.supported === true && !!three.def, three.ledger.reasons);
  if (three.def) {
    const fn = three.def.shader.function;
    ck('rhythm: layer 2 on its own uniforms', fn.includes('uWeaveInterval2') && fn.includes('uWeaveStartIter2'));
    ck('rhythm: layer 1 checked before layer 2 (precedence)',
      fn.indexOf('uWeaveInterval1') < fn.indexOf('uWeaveInterval2'));
    ck('rhythm: dispatcher phases 0/1/2', fn.includes('if (phase == 2)'));
  }
}
{
  // Rhythm arity: 1 active slot BUILDS as the plain formula (the emit degrades
  // to counts — Live is selectable before more formulas are added, 2026-07-09);
  // its kernel carries no modulo schedule code and it must NOT substitute.
  const one = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1])]), { schedule: { kind: 'modulo' } });
  ck('rhythm: 1 active slot builds as the plain formula', one.ledger.supported === true && !!one.def, one.ledger.reasons);
  ck('rhythm: 1-slot build carries no modulo schedule code', !!one.def && !one.def.shader.function.includes('uWeaveInterval'), undefined);
  ck('rhythm: 1-slot build does not substitute', !one.substitute);
}
{
  // Pure layered emitter: precedence + beats semantics in the GLSL shape.
  const { emitLayeredModuloGLSL } = await import('../engine-gmt/engine/weave/schedule.ts');
  const two = emitLayeredModuloGLSL(
    [{ interval: 'uA', startIter: 'uB', beats: 'uC' }, { interval: 'uD', startIter: 'uE' }], 'L');
  ck('layered: fnName convention', two.fnName === 'L_weaveSlot', two.fnName);
  ck('layered: layer order in body = precedence', two.glsl.indexOf('return 1;') < two.glsl.indexOf('return 2;'));
  ck('layered: beats gate only where given', two.glsl.includes('int(uC) <= 0 ||') && !two.glsl.includes('uE) <= 0'));
  ck('layered: base fallthrough returns 0', two.glsl.trimEnd().endsWith('return 0;\n}'));
  ck('layered: interval clamps below 1', two.glsl.includes('if (skip < 1) skip = 1;'));
}

// ── Base election emit (spec §7): explicit baseRow moves phase 0 to that slot ──
{
  const mk = () => scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  const norm = (fn: string) => fn.replace(/MB3DHybrid\d+/g, 'HYB');
  const d0 = emitFusedHybrid(mk(), { schedule: { kind: 'modulo' } }).def!;
  const dFirst = emitFusedHybrid(mk(), { schedule: { kind: 'modulo', baseRow: 0 } }).def!;
  const d1 = emitFusedHybrid(mk(), { schedule: { kind: 'modulo', baseRow: 1 } }).def!;
  ck('baseRow: absent ≡ baseRow=first active (byte-identical)', norm(d0.shader.function) === norm(dFirst.shader.function));
  ck('baseRow: baseRow=1 changes the emit', norm(d0.shader.function) !== norm(d1.shader.function));
  const phase0Slot = (fn: string) => { const l = fn.split('\n').find((x) => /if \(phase == 0\)/.test(x)) ?? ''; const m = l.match(/_slot(\d+)\(/); return m ? +m[1] : -1; };
  ck('baseRow: default → phase 0 = slot 0', phase0Slot(d0.shader.function) === 0, phase0Slot(d0.shader.function));
  ck('baseRow: baseRow=1 → phase 0 = slot 1', phase0Slot(d1.shader.function) === 1, phase0Slot(d1.shader.function));
}

// ── Whole-weave master gate (P4.4 weaveEnabled, opt-in via opts.enableGate) ────
{
  const s = scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  // Opt-in + modulo: gate first, returns 0 (base slot) when disabled.
  const rhythmGated = emitFusedHybrid(s, { schedule: { kind: 'modulo' }, enableGate: true });
  ck('gate: rhythm phase fn gated on uWeaveEnabled',
    !!rhythmGated.def && rhythmGated.def.shader.function.includes('if (uWeaveEnabled < 0.5) return 0;'));
  // Opt-in + counts: disabled returns the FIRST step's slot (base formula only).
  const countsGated = emitFusedHybrid(s, { enableGate: true });
  ck('gate: counts phase fn gated, disabled → base slot 0',
    !!countsGated.def && countsGated.def.shader.function.includes('if (uWeaveEnabled < 0.5) return 0;'));
  ck('gate: counts LUT still present alongside the gate',
    !!countsGated.def && /_WEAVE\[/.test(countsGated.def.shader.function));
  // Opt-in absent = no gate anywhere (byte-identity invariant).
  const unGated = emitFusedHybrid(s);
  const unGatedRhythm = emitFusedHybrid(s, { schedule: { kind: 'modulo' } });
  ck('gate: opts absent → no uWeaveEnabled (counts)',
    !!unGated.def && !unGated.def.shader.function.includes('uWeaveEnabled'));
  ck('gate: opts absent → no uWeaveEnabled (rhythm)',
    !!unGatedRhythm.def && !unGatedRhythm.def.shader.function.includes('uWeaveEnabled'));
}
{
  // Counts gate with an EMPTY slot 0: disabled must return the first ACTIVE
  // slot's phase (the LUT's first entry), not literal 0.
  const s = scene([slot(0), slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  const { def } = emitFusedHybrid(s, { enableGate: true });
  ck('gate: counts disabled → first ACTIVE slot (1)',
    !!def && def.shader.function.includes('if (uWeaveEnabled < 0.5) return 1;'));
}
{
  // Pure schedule emitters: gate is opt-in and shape-stable.
  const { emitCountsScheduleGLSL, emitLayeredModuloGLSL, buildCountsPlan } = await import('../engine-gmt/engine/weave/schedule.ts');
  const plan = buildCountsPlan({ iterCounts: [2, 1], endTo: 1, repeatFrom: 0 });
  const gated = emitCountsScheduleGLSL(plan, 'G', { enabled: 'uWeaveEnabled' });
  ck('counts emitter: gate line first in fn', /int G_weaveSlot\(int i\) \{\n  if \(uWeaveEnabled < 0\.5\) return 0;/.test(gated.glsl));
  const plain = emitCountsScheduleGLSL(plan, 'G');
  ck('counts emitter: no opts → no gate', !plain.glsl.includes('uWeaveEnabled'));
  const lGated = emitLayeredModuloGLSL([{ interval: 'uA', startIter: 'uB' }], 'G', { enabled: 'uWeaveEnabled' });
  ck('layered emitter: gate line first in fn', /int G_weaveSlot\(int i\) \{\n  if \(uWeaveEnabled < 0\.5\) return 0;/.test(lGated.glsl));
}

// ── Per-option expose/bake directives (P3b Task 2) ─────────────────────────────
{
  // Intern single-slot: bake Scale (option 0) → literal in the body, 2 sliders left,
  // coreMath no longer seeds the baked lane.
  const { def } = emitFusedHybrid(scene([slot(1, 4, [-1.5, 0.4, 1])]), { slotBake: [[true]] });
  const p = (def?.parameters ?? []) as any[];
  ck('bake: intern single-slot def emits', !!def);
  ck('bake: scale baked as literal', !!def && /m = -1\.5 \//.test(def.shader.function));
  ck('bake: 2 sliders remain (MinR, Fold)', p.length === 2 && p[0].label === 'Min Radius' && p[1].label === 'Folding Limit', p.map((x: any) => x.label));
  const cm = (def?.defaultPreset as any)?.features?.coreMath ?? {};
  ck('bake: coreMath drops baked paramA, keeps paramB', cm.paramA === undefined && cm.paramB === 0.4, cm);
}
{
  // Multi-slot: baking one slot's option frees its lane; the rest stay live.
  const s = scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]);
  const withBake = emitFusedHybrid(s, { slotBake: [undefined, [true, false]] });
  const p = (withBake.def?.parameters ?? []) as any[];
  ck('bake: multi-slot 4 sliders (power baked)', p.length === 4, p.map((x: any) => x.label));
  ck('bake: baked power is a literal 8.0', !!withBake.def && /fpow = 8\.0/.test(withBake.def.shader.function));
  ck('bake: box params still live on bank 0', !!withBake.def && /uWs0ParamA/.test(withBake.def.shader.function));
}
{
  // Decompiled: bake the Scale scalar → 3 sliders left (CScale + 2 rotations), no
  // scalar lane used; bake a whole ROTATION group (span 3) → matrix baked as
  // literals, its slider gone, the OTHER rotation still live via the derived bank.
  const menger = (): MB3DFormulaSlot => ({
    iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10,
    optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
    optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  const bs = emitFusedHybrid(scene([menger()]), { slotBake: [[true]] });
  const bp = (bs.def?.parameters ?? []) as any[];
  ck('bake: Menger3 scale baked → 3 sliders', bp.length === 3 && bp[0].label === 'CScale', bp.map((x: any) => x.label));
  ck('bake: Menger3 no scalar lane used', !!bs.def && !/uParamA/.test(bs.def.shader.function));

  const rotBake: boolean[] = []; rotBake[4] = rotBake[5] = rotBake[6] = true;
  const br = emitFusedHybrid(scene([menger()]), { slotBake: [rotBake] });
  const rp = (br.def?.parameters ?? []) as any[];
  ck('bake: Menger3 Rotation1 group baked → 3 sliders', rp.length === 3, rp.map((x: any) => x.label));
  ck('bake: Rotation1 slider gone, Rotation2 live', !rp.some((x: any) => x.label === 'Rotation1') && rp.some((x: any) => x.label === 'Rotation2'), rp.map((x: any) => x.label));
  ck('bake: live rotation still binds derived mat3', !!br.def && /uMb3dRotM0\[/.test(br.def.shader.function)
    && (br.def.shader.derivedRotations ?? []).length === 1);
}
{
  // Option metadata for the editor UI: names, rotation grouping, exposability.
  const { getSlotOptionMeta } = await import('../engine-gmt/utils/mb3d/slotTranspiler.ts');
  const im = getSlotOptionMeta(slot(1, 4, [-1.5, 0.4, 1]));
  ck('meta: intern box 3 options, all exposable', im.length === 3 && im.every((m) => m.exposable && m.span === 1), im);
  ck('meta: intern labels', im.map((m) => m.name).join('|') === 'Scale|Min Radius|Folding Limit', im.map((m) => m.name));
  const dm = getSlotOptionMeta({
    iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10,
    optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
    optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  ck('meta: Menger3 rotations group span 3', dm.filter((m) => m.span === 3).length === 2, dm);
  ck('meta: Menger3 6 logical controls (4 scalars + 2 rotations)', dm.length === 6, dm.map((m) => `${m.name}:${m.span}`));
}

// ── Axis-triple grouping: leading axis + any order (boxIFS "Z/Y/X halfwidth") ──
{
  const { DECOMPILED_DEFAULTS } = await import('../engine-gmt/utils/mb3d/decompiled-formulas.ts');
  const d = (DECOMPILED_DEFAULTS as any)['boxIFS'];
  ck('triple: boxIFS defaults present', !!d);
  if (d) {
    const bslot: MB3DFormulaSlot = {
      iterCount: 1, formulaIndex: 20, name: 'boxIFS',
      optionCount: d.optionCount, optionTypes: d.optionTypes.slice(), optionValues: d.optionValues.slice(),
    };
    // Editor path: pre-bake the non-exposable t14 options (Scale, Z add).
    const bake: boolean[] = [];
    d.optionTypes.forEach((t: number, k: number) => { if (k < d.optionCount && t === 14) bake[k] = true; });
    const { def, ledger } = emitFusedHybrid(scene([bslot]), { slotBake: [bake] });
    ck('triple: boxIFS parametric with t14 baked', ledger.supported === true && !!def, ledger.reasons);
    const p = (def?.parameters ?? []) as any[];
    const hw = p.find((x: any) => x?.label === 'halfwidth');
    ck('triple: Z/Y/X halfwidth groups into ONE vec3', !!hw && hw.type === 'vec3', p.map((x: any) => `${x.id}:${x.type ?? 'float'}:${x.label}`));
    // Component mapping follows each member's OWN axis: option 0 = Z halfwidth,
    // option 2 = X halfwidth — the vec3 default must be axis-correct, not positional.
    const cm3 = (def?.defaultPreset as any)?.features?.coreMath?.[hw?.id] ?? {};
    ck('triple: components bind by axis (x=opt2, z=opt0)',
      cm3.x === d.optionValues[2] && cm3.y === d.optionValues[1] && cm3.z === d.optionValues[0], { cm3, vals: d.optionValues.slice(0, 3) });
    ck('triple: body reads .z for Z halfwidth first-offset', !!def && /uVec3A\.z/.test(def!.shader.function));

    // t14 (.2DOUBLES) is live-mappable — NO directives needed: Scale exposes as a
    // scalar slider and the mixed-shape add triple (Z add = t14) groups into a vec3.
    const auto = emitFusedHybrid(scene([{ ...bslot, optionTypes: bslot.optionTypes.slice(), optionValues: bslot.optionValues.slice() }]));
    const ap = (auto.def?.parameters ?? []) as any[];
    ck('t14: boxIFS fully parametric with zero directives', auto.ledger.supported === true && ap.length > 0, auto.ledger.reasons);
    ck('t14: Scale exposes as a live scalar', ap.some((x: any) => x?.label === 'Scale' && (x.type ?? 'float') === 'float'), ap.map((x: any) => x.label));
    ck('t14: mixed-shape add triple groups into a vec3', ap.some((x: any) => x?.label === 'add' && x.type === 'vec3'), ap.map((x: any) => `${x.label}:${x.type ?? 'float'}`));
  }
}

// ── assembleWeave native-slot seams (P4.0): preCall / call / per-slot loopInit ──
{
  const schedule = emitModuloScheduleGLSL({ interval: 'uT', startIter: 'uS' }, 'T');
  // MB3D-shaped slot (no new fields) — emission shape unchanged.
  const base = assembleWeave({
    id: 'T0',
    schedule,
    slots: [
      { phase: 0, fnName: 'T0_slot0', glsl: 'void T0_slot0(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {}' },
      { phase: 1, fnName: 'T0_slot1', glsl: 'void T0_slot1(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {}' },
    ],
  });
  ck('P4.0: default branch shape unchanged', base.functionGLSL.includes('if (phase == 1) { T0_slot1(z, dr, trap, c); return; }'), base.functionGLSL);

  // Native-shaped slot: preCall + call override + per-slot loopInit contribution.
  const nat = assembleWeave({
    id: 'T1',
    schedule,
    extraLoopInit: 'g_x = 0.0;\n',
    slots: [
      { phase: 0, fnName: 'T1_slot0', glsl: '', scratchVars: ['mb3dVary'] },
      {
        phase: 1,
        fnName: 'T1_slot1',
        glsl: 'void T1_slot1(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 s1_zp) {}',
        preCall: 'vec4 c1 = vec4(c.xyz, uParamB); ',
        call: 'T1_slot1(z, dr, trap, c1, s1_zp);',
        postCall: ' gmt_rotAxis = _p_axis;',
        loopInit: 's1_zp = vec4(0.0);\n',
      },
    ],
  });
  ck('P4.0: native branch emits preCall + call override + postCall',
    nat.functionGLSL.includes('if (phase == 1) { vec4 c1 = vec4(c.xyz, uParamB); T1_slot1(z, dr, trap, c1, s1_zp); gmt_rotAxis = _p_axis; return; }'),
    nat.functionGLSL);
  ck('P4.0: slot loopInit lands after extraLoopInit, before scratch decls',
    nat.loopInit === 'g_x = 0.0;\ns1_zp = vec4(0.0);\nfloat mb3dVary = 0.0;', JSON.stringify(nat.loopInit));
  ck('P4.0: native slot threads no scratch through its own call', !nat.functionGLSL.includes('T1_slot1(z, dr, trap, c1, s1_zp, mb3dVary'), undefined);
}

// ── Native dispatcher slots (P4.1): resolver + emitFusedHybrid wiring ─────────
{
  registry.register(Mandelbulb);
  registry.register(Phoenix);
  registry.register(Julia3D);
  registry.register(MandelTerrain);
  const nslot = (iterCount: number, formula: string): MB3DFormulaSlot =>
    ({ iterCount, formulaIndex: -1, name: formula, optionCount: 0, optionTypes: [], optionValues: [] });

  // Identity pair: Mandelbulb woven with itself, alternating.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Mandelbulb'), nslot(1, 'Mandelbulb')]));
    ck('native: identity pair supported', ledger.supported === true && !!def, ledger.reasons);
    const fn = def?.shader.function ?? '';
    ck('native: per-slot namespaces (ws0_/ws1_) both present', /\bws0_/.test(fn) && /\bws1_/.test(fn), undefined);
    ck('native: branch isolates c (ws0_c)', fn.includes('vec4 ws0_c = vec4(c.xyz,') && fn.includes('(z, dr, trap, ws0_c'), fn);
    ck('native: params exposed on distinct lanes', (def?.parameters?.length ?? 0) >= 2
      && new Set((def?.parameters as any[]).map((p) => p.id)).size === (def?.parameters as any[]).length,
      (def?.parameters as any[])?.map((p: any) => p.id));
    // A2: the slot's formula name rides `group` (Formula-panel divider headers +
    // per-slot modulation category) instead of the old label prefix. Same-name
    // slots are slot-numbered ("Formula 1: Mandelbulb" / "Formula 2: Mandelbulb")
    // so the divider renders once per slot instead of merging.
    ck('native: same-name slots grouped + slot-numbered (Formula 1/2: Mandelbulb)',
      new Set((def?.parameters as any[]).map((p: any) => p.group)).size === 2
      && (def?.parameters as any[]).some((p: any) => p.group === 'Formula 1: Mandelbulb')
      && (def?.parameters as any[]).some((p: any) => p.group === 'Formula 2: Mandelbulb')
      && (def?.parameters as any[]).every((p: any) => !/^Mandelbulb: /.test(p.label)),
      (def?.parameters as any[])?.map((p: any) => `${p.group}/${p.label}`));
    ck('native: ledger tier native', ledger.slotFlags.every((f) => f.tier === 'native'), ledger.slotFlags);
  }

  // Stateful pair: Phoenix twice — loopInit state decls hoisted to globals,
  // per-pixel resets in loopInit, extra args renamed at the call.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Phoenix'), nslot(1, 'Phoenix')]));
    ck('native: Phoenix pair supported', ledger.supported === true && !!def, ledger.reasons);
    const fn = def?.shader.function ?? '';
    const init = def?.shader.loopInit ?? '';
    ck('native: state decl hoisted to global', fn.includes('vec4 ws0_z_prev;') && fn.includes('vec4 ws1_z_prev;'), undefined);
    ck('native: loopInit resets state without redeclaring', init.includes('ws0_z_prev = vec4(0.0);')
      && init.includes('ws1_z_prev = vec4(0.0);') && !/vec4\s+ws\d+_z_prev\s*=/.test(init), init);
    ck('native: call threads renamed extra args', fn.includes('(z, dr, trap, ws0_c, ws0_z_prev, ws0_dr_prev, ws0_z_prev2, ws0_dr_prev2);'), fn);
    ck('native: identity pair prefixes internal helpers', /\bws0_phoenixBulbPow\b/.test(fn) && /\bws1_phoenixBulbPow\b/.test(fn)
      && !/\bphoenixBulbPow\b/.test(fn), undefined);
  }

  // Rotation slot: Julia3D uses gmt_rot* — loopInit save/capture/restore bracket +
  // dispatcher-branch swap-in/out.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Mandelbulb'), nslot(1, 'Julia3D')]));
    ck('native: rotation pair supported', ledger.supported === true && !!def, ledger.reasons);
    const fn = def?.shader.function ?? '';
    const init = def?.shader.loopInit ?? '';
    ck('native: rot capture globals declared', fn.includes('vec3 ws1_rotAxis; float ws1_rotCos; float ws1_rotSin;'), undefined);
    ck('native: loopInit captures + restores shared rot state',
      init.includes('ws1_rotAxis = gmt_rotAxis;') && init.includes('gmt_rotAxis = _ws1_svAxis;'), init);
    ck('native: branch swaps rot state around the call',
      fn.includes('gmt_rotAxis = ws1_rotAxis;') && fn.includes('gmt_rotAxis = _ws1_pAxis;'), fn);
    ck('native: preamble state prefixed (kk_minSurf)', /\bws1_kk_minSurf\b/.test(fn) && /ws1_kk_minSurf = 1e10/.test(init), undefined);
    ck('native: non-rotation slot has no swap', !fn.includes('ws0_rotAxis'), undefined);
  }

  // Mixed weave: native Mandelbulb + MB3D intern Amazing Box (#4) in one dispatcher.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(2, 'Mandelbulb'), slot(1, 4)]));
    ck('mixed: native + MB3D supported', ledger.supported === true && !!def, ledger.reasons);
    const fn = def?.shader.function ?? '';
    ck('mixed: native branch uses its own c', fn.includes('vec4 ws0_c = vec4(c.xyz,'), undefined);
    ck('mixed: MB3D branch shape unchanged', /if \(phase == 1\) \{ MB3DHybrid\d+_slot1\(z, dr, trap, c\); return; \}/.test(fn), fn);
    ck('mixed: tiers native + intern', JSON.stringify(ledger.slotFlags.map((f) => f.tier)) === '["native","intern"]', ledger.slotFlags);
  }

  // Reject: self-contained formulas can't be weave slots.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Mandelbulb'), nslot(1, 'MandelTerrain')]));
    ck('native: self-contained rejected with reason', !def && ledger.supported === false
      && ledger.reasons.some((r) => /self-contained/.test(r)), ledger.reasons);
  }

  // Reject: unregistered formula id.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Mandelbulb'), nslot(1, 'NoSuchFormula')]));
    ck('native: unregistered id rejected', !def && ledger.reasons.some((r) => /not a registered formula/.test(r)), ledger.reasons);
  }

  // ── Native DE policy (P4.2): writesDeriv → est7 last resort; deMeta lead ────
  registry.register(MengerSponge);
  {
    // Synthetic position-only formula: never writes dr → the fused weave must
    // auto-route to the numerical estimator recipe (est7, ADR-0085).
    const NoDr: any = {
      id: 'TestNoDr', name: 'Test NoDr', juliaType: 'offset',
      shader: {
        function: 'void formula_TestNoDr(inout vec4 z, inout float dr, inout float trap, vec4 c) { z.xyz = abs(z.xyz) * uParamA + c.xyz; trap = min(trap, dot(z.xyz, z.xyz)); }',
        loopBody: 'formula_TestNoDr(z, dr, trap, c);',
        capabilities: new Set(['shape:per-iteration']),
      },
      parameters: [{ label: 'Scale', id: 'paramA', min: 0, max: 4, step: 0.01, default: 1.5 }],
      defaultPreset: { formula: 'TestNoDr', features: { coreMath: { paramA: 1.5 } } },
    };
    registry.register(NoDr);
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'TestNoDr'), nslot(1, 'TestNoDr')]));
    const q = (def?.defaultPreset as any)?.features?.quality ?? {};
    // (mb3dFaithful retired by ADR-0092 — the faithful step is the unconditional
    // marcher, so the recipe no longer writes a gate; assert it stays absent.)
    ck('P4.2: no-dr native weave routes to est7 recipe', ledger.supported === true
      && q.estimator === 7.0 && q.numDEeps === 0.3 && q.mb3dFaithful === undefined && q.detail === 1.5, q);
  }
  {
    // dr-writing native pair must NOT route to est7; the lead's tuned quality
    // subset applies (AmazingBox: est 1, fudge 0.5, Chebyshev, detail 2).
    const { def } = emitFusedHybrid(scene([nslot(1, 'AmazingBox'), nslot(1, 'Mandelbulb')]));
    const q = (def?.defaultPreset as any)?.features?.quality ?? {};
    ck('P4.2: native lead deMeta applied (AmazingBox)', q.estimator === 1.0 && q.fudgeFactor === 0.5
      && q.distanceMetric === 1.0 && q.detail === 2, q);
  }
  {
    // Capability-backed estimator preset (MengerSponge est 5 cutting-plane) is
    // dropped whole; the NEXT native slot's generic subset leads instead.
    const { def } = emitFusedHybrid(scene([nslot(1, 'MengerSponge'), nslot(1, 'Mandelbulb')]));
    const q = (def?.defaultPreset as any)?.features?.quality ?? {};
    ck('P4.2: unsafe estimator subset dropped, next lead wins', q.estimator === 0.0 && q.fudgeFactor === 1
      && q.distanceMetric === 0.0, q);
  }
  {
    // Certified intern-box calibration keeps precedence over a native lead.
    const { def } = emitFusedHybrid(scene([slot(1, 4), nslot(1, 'Mandelbulb')]));
    const q = (def?.defaultPreset as any)?.features?.quality ?? {};
    ck('P4.2: intern box calibration outranks native deMeta', q.estimator === 1.0 && q.fudgeFactor === 0.45, q);
  }
}

// ── Per-slot param BANKS (ADR-0090): fidelity binding for native slots ────────
{
  registry.register(Mandelbulb);
  registry.register(Phoenix);
  const nslot = (iterCount: number, formula: string): MB3DFormulaSlot =>
    ({ iterCount, formulaIndex: -1, name: formula, optionCount: 0, optionTypes: [], optionValues: [] });

  // Identity pair on DISTINCT banks: each Mandelbulb binds its OWN ws<k> bank —
  // the case no flat namespace can satisfy. No shared coreMath pool touched.
  {
    const { def } = emitFusedHybrid(scene([nslot(1, 'Mandelbulb'), nslot(1, 'Mandelbulb')]));
    const fn = def?.shader.function ?? '';
    const params = (def?.parameters ?? []) as any[];
    ck('banks: slot0 → uWs0*, slot1 → uWs1* (verbatim, distinct banks)',
      /\buWs0ParamA\b/.test(fn) && /\buWs1ParamA\b/.test(fn), (fn.match(/uWs\dParamA/g) || []));
    ck('banks: native slots never touch the coreMath pool (no uParamA/uVec2A)',
      !/\buParamA\b/.test(fn) && !/\buVec2A\b/.test(fn), (fn.match(/uParam[A-F]|uVec\d[ABC]/g) || []));
    ck('banks: params route to weave feature (feature:weave + ws<k> ids)',
      params.length >= 2 && params.every((p) => p.feature === 'weave' && /^ws[01]/.test(p.id)),
      params.map((p) => `${p.id}/${p.feature}`));
    const ids = new Set(params.map((p) => p.id));
    ck('banks: identity pair ids on distinct banks (ws0ParamA + ws1ParamA)',
      ids.has('ws0ParamA') && ids.has('ws1ParamA'), [...ids]);
    // Defaults land in preset.features.weave (Power=8 verbatim), NOT coreMath.
    const w = (def?.defaultPreset as any)?.features?.weave ?? {};
    const cm = (def?.defaultPreset as any)?.features?.coreMath ?? {};
    ck('banks: defaults in features.weave (ws0ParamA=8, ws1ParamA=8)', w.ws0ParamA === 8 && w.ws1ParamA === 8, w);
    ck('banks: native params NOT in coreMath (only iterations)',
      cm.paramA === undefined && cm.ws0ParamA === undefined, cm);
  }

  // vec2 is NOT decomposed: Mandelbulb's Phase (vec2A) binds a REAL vec2 uniform,
  // not two component lanes (the dense pack's decomposition is gone in fidelity).
  {
    const { def } = emitFusedHybrid(scene([nslot(2, 'Mandelbulb')]));
    const fn = def?.shader.function ?? '';
    const params = (def?.parameters ?? []) as any[];
    const v2 = params.find((p) => p.id === 'ws0Vec2A');
    // Fidelity: both components read from ONE coherent vec2 uniform (uWs0Vec2A),
    // never scattered onto unrelated scalar lanes + a vec2(...) reconstruction
    // (which is what the dense pack does when it decomposes a vec2 param).
    ck('banks: vec2 verbatim on its own real vec2 uniform (not decomposed to lanes)',
      /uWs0Vec2A\.x/.test(fn) && /uWs0Vec2A\.y/.test(fn) && !/vec2\(\s*uWs0/.test(fn),
      (fn.match(/u\w*Vec2A[.\w]*/g) || []));
    ck('banks: vec2 param is ONE vec2 entry with the real label', !!v2 && v2.type === 'vec2' && v2.label === 'Phase (θ, φ)', v2);
    const w = (def?.defaultPreset as any)?.features?.weave ?? {};
    ck('banks: vec2 default is a plain {x,y} in features.weave',
      !!w.ws0Vec2B && typeof w.ws0Vec2B.x === 'number' && w.ws0Vec2B.y === 0.5, w.ws0Vec2B);
    // Single-slot NATIVE weave still carries a named group (Formula 1: <name>) so
    // its bank params resolve a named modulation category, not a "Weave" fallback.
    ck('banks: single native slot has a named group (Formula 1: Mandelbulb)',
      params.length > 0 && params.every((p) => p.group === 'Formula 1: Mandelbulb'),
      [...new Set(params.map((p) => p.group))]);
  }

  // Undeclared coreMath uniform → baked LITERAL (never a bank uniform), so a slot
  // can't read a bank lane it didn't declare (or another slot's).
  {
    const Undecl: any = {
      id: 'TestUndecl', name: 'Test Undecl', juliaType: 'offset',
      shader: {
        function: 'void formula_TestUndecl(inout vec4 z, inout float dr, inout float trap, vec4 c) { z.xyz = z.xyz * uParamA + uParamB * c.xyz; dr = dr * uParamA; trap = min(trap, dot(z.xyz, z.xyz)); }',
        loopBody: 'formula_TestUndecl(z, dr, trap, c);',
        capabilities: new Set(['shape:per-iteration']),
      },
      parameters: [{ label: 'Scale', id: 'paramA', min: 0, max: 4, step: 0.01, default: 1.5 }],
      defaultPreset: { formula: 'TestUndecl', features: { coreMath: { paramA: 1.5, paramB: 0.7 } } },
    };
    registry.register(Undecl);
    const { def } = emitFusedHybrid(scene([nslot(2, 'TestUndecl')]));
    const fn = def?.shader.function ?? '';
    ck('banks: declared uParamA → uWs0ParamA (live)', /\buWs0ParamA\b/.test(fn), (fn.match(/uWs0Param[A-F]/g) || []));
    ck('banks: undeclared uParamB baked to preset literal 0.7 (no uWs0ParamB)',
      /0\.7/.test(fn) && !/\buWs0ParamB\b/.test(fn) && !/\buParamB\b/.test(fn), (fn.match(/uWs0Param[A-F]|uParamB|0\.7/g) || []));
  }

  // Phoenix ⊗ Phoenix: the shared pool OVERFLOWS today (9 params/slot: 4 scalars +
  // 2 vec2 + 3 vec3 → 16 scalar lanes + 6 vec3 units collide, bake-everything). On
  // banks EVERY param is live on its own bank — the exit-gate param-rich pair.
  {
    const { def, ledger } = emitFusedHybrid(scene([nslot(1, 'Phoenix'), nslot(1, 'Phoenix')]));
    const params = (def?.parameters ?? []) as any[];
    ck('banks: Phoenix⊗Phoenix exposes all params live (no overflow-bake)',
      ledger.supported && params.length === 18, params.length);
    ck('banks: Phoenix pair params feature:weave, 18 distinct ids',
      params.every((p) => p.feature === 'weave') && new Set(params.map((p) => p.id)).size === 18, undefined);
    ck('banks: Phoenix pair slot-numbered groups (Formula 1/2: Phoenix)',
      new Set(params.map((p) => p.group)).size === 2
      && params.some((p) => p.group === 'Formula 1: Phoenix') && params.some((p) => p.group === 'Formula 2: Phoenix'),
      [...new Set(params.map((p) => p.group))]);
    const ids = new Set(params.map((p) => p.id));
    ck('banks: Phoenix vec3 verbatim on both banks (ws0Vec3A + ws1Vec3A)',
      ids.has('ws0Vec3A') && ids.has('ws1Vec3A'), [...ids]);
  }

  // Mixed native + MB3D: BOTH bank now (ADR-0090 extended to MB3D 2026-07-11) — native
  // on ws0*, MB3D on ws1*, all params on the `weave` feature. The old disjoint split
  // (MB3D on the shared coreMath pool) is retired.
  {
    const { def } = emitFusedHybrid(scene([nslot(2, 'Mandelbulb'), slot(1, 4)]));
    const fn = def?.shader.function ?? '';
    const params = (def?.parameters ?? []) as any[];
    ck('mixed banks: native on ws0, MB3D on ws1 (both banked, no coreMath uParamA)',
      /\buWs0ParamA\b/.test(fn) && /\buWs1ParamA\b/.test(fn) && !/\buParamA\b/.test(fn), undefined);
    ck('mixed banks: every param feature:weave',
      params.length > 0 && params.every((p) => p.feature === 'weave'),
      params.map((p) => `${p.id}/${p.feature ?? 'coreMath'}`));
    ck('mixed banks: native params on ws0, MB3D params on ws1',
      params.some((p) => /^ws0/.test(p.id)) && params.some((p) => /^ws1/.test(p.id)),
      params.map((p) => p.id));
    const w = (def?.defaultPreset as any)?.features?.weave ?? {};
    const cm = (def?.defaultPreset as any)?.features?.coreMath ?? {};
    ck('mixed banks: native ws0ParamA=8 + MB3D ws1ParamA in features.weave, none in coreMath',
      w.ws0ParamA === 8 && w.ws1ParamA !== undefined && cm.paramA === undefined,
      { ws0: w.ws0ParamA, ws1: w.ws1ParamA, cmParamA: cm.paramA });
  }
}

// ── Native + imported slot SOURCES (P4.3): picker catalog + reject parity ────
{
  // nativeSlotShell builds the addon-slot shell the picker appends; it emits
  // through the native resolver exactly like a frag/DEC import (design §1.3 —
  // imports self-limit to global/tracker shapes and take the same path).
  {
    const s0 = nativeSlotShell('Mandelbulb', 2);
    ck('P4.3: shell is native (formulaIndex -1, name = id)',
      s0.formulaIndex === -1 && s0.name === 'Mandelbulb' && s0.optionCount === 0 && isNativeSlot(s0), s0);
    const { def, ledger } = emitFusedHybrid(scene([nativeSlotShell('Mandelbulb', 1), nativeSlotShell('AmazingBox', 1)]));
    ck('P4.3: shells emit through native resolver', ledger.supported === true && !!def
      && ledger.slotFlags[0].tier === 'native', ledger.slotFlags);
  }

  // Reject-greying parity: the picker greys EXACTLY what the resolver rejects.
  // For every registered formula, nativeSlotReject() returns a reason iff
  // resolveNativeSlot(...) is not ok. (The catalog only lists registered defs,
  // so registration itself is not part of the parity check.)
  {
    let mismatches: string[] = [];
    for (const def of registry.getAll()) {
      const greyed = nativeSlotReject(def) !== undefined;
      const rejected = resolveNativeSlot(def, 0, 'probe', { parametric: true }).ok === false;
      if (greyed !== rejected) mismatches.push(`${def.id}: greyed=${greyed} rejected=${rejected}`);
    }
    ck('P4.3: reject-greying set matches engine rejects', mismatches.length === 0, mismatches);
  }

  // Catalog groups the registered natives; self-contained MandelTerrain is
  // greyed with a reason, weavable Mandelbulb is not.
  {
    const groups = getNativeSlotCatalog();
    const flat = groups.flatMap((g) => g.entries);
    const bulb = flat.find((e) => e.id === 'Mandelbulb');
    const terrain = flat.find((e) => e.id === 'MandelTerrain');
    ck('P4.3: catalog lists weavable native enabled', !!bulb && !bulb.disabledReason, bulb);
    ck('P4.3: catalog greys self-contained with reason',
      !!terrain && /self-contained/i.test(terrain.disabledReason ?? ''), terrain);
    ck('P4.3: catalog groups are non-empty', groups.length > 0 && flat.length > 0, groups.map((g) => g.category));
  }
}

// ── Toggle / mixed control modes (A5: boolean + boolean-gates-slider inputs) ──
{
  const { VecControlAccumulator } = await import('../engine-gmt/utils/uniformSlots.ts');
  const p1: any[] = [];
  const a1 = new VecControlAccumulator(p1, {});
  a1.add('vec2A', 'apply scale+add', ['x'], [1], 0, 1, 1, { isBool: true, gates: true });
  a1.add('vec2A', 'Scale', ['y'], [2], -8, 8, 0.001);
  ck('mode: gating bool + slider on vec2 → mixed', p1[0].mode === 'mixed', p1[0].mode);

  const p2: any[] = [];
  const a2 = new VecControlAccumulator(p2, {});
  a2.add('vec2B', 'Sphere or Cylinder', ['x'], [1], 0, 1, 1, { isBool: true });
  a2.add('vec2B', 'Scale', ['y'], [2], -8, 8, 0.001);
  ck('mode: NON-gating bool pair stays normal (mixed would wrongly grey the slider)', p2[0].mode === undefined, p2[0].mode);

  const p3: any[] = [];
  const a3 = new VecControlAccumulator(p3, {});
  a3.add('vec2C', 'Abs X', ['x'], [1], 0, 1, 1, { isBool: true });
  a3.add('vec2C', 'Abs Y', ['y'], [0], 0, 1, 1, { isBool: true });
  ck('mode: all-bool vec2 → per-axis toggles', p3[0].mode === 'toggle', p3[0].mode);

  const { ScalarParamPacker, LaneAllocator } = await import('../engine-gmt/utils/uniformSlots.ts');
  const pk = new ScalarParamPacker(new LaneAllocator());
  pk.scalar('Sphere or Cylinder', 1, 0, 1, 1, { bool: true });
  ck('mode: bool on a paramA..F lane → segmented toggle', pk.params[0]?.mode === 'toggle', pk.params[0]);
}
{
  // t2 .INTEGER control shapes via the emit: "(0 to 3)" ranges become reachable
  // sliders; plain 0/1 integers become toggles. (Probe check: 9 bundled scenes
  // pick these up with ZERO shader changes.)
  const { bindOptions } = await import('../engine-gmt/utils/mb3d/constPacker.ts');
  const { LaneAllocator } = await import('../engine-gmt/utils/uniformSlots.ts');
  const mk = (name: string, val: number) => {
    const alloc = new LaneAllocator();
    const b = bindOptions([val], [2], 1, [{ name } as any], alloc);
    return b?.params[0];
  };
  const ranged = mk('OTrap option (0..3)', 0);
  ck('t2: "(0..3)" range parsed → max 3 (was capped at 1)', !!ranged && ranged.max === 3 && !ranged.mode, ranged);
  const ranged2 = mk('Modes (0 to 3)', 2);
  ck('t2: "(0 to 3)" range parsed', !!ranged2 && ranged2.max === 3, ranged2);
  const boolp = mk('Sphere or Cylinder', 1);
  ck('t2: plain 0/1 integer → toggle', !!boolp && boolp.mode === 'toggle' && boolp.max === 1, boolp);
  const big = mk('Iterations count', 3);
  ck('t2: unhinted value>1 → slider reaching the value', !!big && big.max >= 3 && !big.mode, big);
}

// ── P4.4: lead-slot getDist splice ──────────────────────────────────────────
{
  // Julia3D's custom getDist reads the kk_minSurf accumulator global — as the
  // LEAD slot it must survive onto the fused def, rewritten to the slot's
  // prefixed global (ws0_kk_minSurf) so map()-scope getDist sees slot 0's state.
  const lead = emitFusedHybrid(scene([nativeSlotShell('Julia3D', 1), nativeSlotShell('Mandelbulb', 1)]));
  ck('getDist: native lead splices custom getDist',
    !!lead.def?.shader.getDist && lead.def.shader.getDist.includes('ws0_kk_minSurf'), lead.def?.shader.getDist?.slice(0, 90));
  // Interlace-host semantics: only the LEAD splices — a native SECONDARY's
  // getDist stays out (estimator dropdown remains the escape hatch).
  const second = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1]), nativeSlotShell('Julia3D', 1)]));
  ck('getDist: MB3D lead + native second → no splice', !!second.def && second.def.shader.getDist === undefined);
  // Pure-MB3D weave: unchanged (byte-identity backstop; full probe covers it).
  const pure = emitFusedHybrid(scene([slot(2, 4, [-1.5, 0.5, 1]), slot(1, 1, [8, 1])]));
  ck('getDist: pure MB3D weave → none', !!pure.def && pure.def.shader.getDist === undefined);
  // A lead WITHOUT a custom getDist stays clean.
  const bulbLead = emitFusedHybrid(scene([nativeSlotShell('Mandelbulb', 1), nativeSlotShell('Julia3D', 1)]));
  ck('getDist: native lead without one → none', !!bulbLead.def && bulbLead.def.shader.getDist === undefined);
}

// ── P4.4: cutting-plane capability UNION from native slots ──────────────────
{
  // A CP-capable slot (MengerSponge) writes the UNPREFIXED engine-owned cp_*
  // accumulators; the fused def must carry estimator:cutting-plane so
  // core_math declares CP_PREAMBLE ('cp_dmin: undeclared identifier' was the
  // repointed sweep's failure class — 12/45 before this union).
  const cp = emitFusedHybrid(scene([nativeSlotShell('Mandelbulb', 1), nativeSlotShell('MengerSponge', 1)]));
  ck('cp-union: CP slot → fused def carries the capability',
    !!cp.def && cp.def.shader.capabilities?.has('estimator:cutting-plane') === true);
  const noCp = emitFusedHybrid(scene([nativeSlotShell('Mandelbulb', 1), nativeSlotShell('AmazingBox', 1)]));
  ck('cp-union: no CP slot → capability absent',
    !!noCp.def && noCp.def.shader.capabilities?.has('estimator:cutting-plane') !== true);
}

// ── P4.4: legacy interlace load-migration ───────────────────────────────────
{
  const { migrateLegacyWeavePreset } = await import('../engine-gmt/utils/weaveMigration.ts');
  const legacy = () => ({
    formula: 'Mandelbulb',
    name: 'legacy test',
    features: {
      coreMath: { iterations: 40, paramA: 9, vec2A: { x: 3, y: 4 } },
      geometry: { juliaMode: false },
      interlace: {
        interlaceCompiled: true, interlaceEnabled: true,
        interlaceFormula: 'AmazingBox', interlaceInterval: 3, interlaceStartIter: 1,
        interlaceParamA: -1.8,
      },
    },
    animations: [
      { id: 'l1', enabled: true, target: 'coreMath.paramA' },
      { id: 'l2', enabled: true, target: 'coreMath.vec2A_x' },
      { id: 'l3', enabled: true, target: 'interlace.interlaceParamA' },
      { id: 'l4', enabled: true, target: 'interlace.interlaceInterval' },
      { id: 'l5', enabled: true, target: 'quality.detail' },
    ],
    sequence: {
      durationFrames: 100,
      tracks: {
        'coreMath.paramA': { id: 'coreMath.paramA', type: 'float', label: 'Power', keyframes: [] },
        'interlace.interlaceVec3A_x': { id: 'interlace.interlaceVec3A_x', type: 'float', label: 'V', keyframes: [] },
      },
    },
  });

  // Happy path — 2-slot weave, banks carry VALUES (not defaults), rhythm layer
  // 1 carries the schedule, gate carries the enable, legacy state cleared.
  {
    const p: any = migrateLegacyWeavePreset(legacy());
    ck('migrate: formula → fused weave id', /^MB3DHybrid/.test(p.formula), p.formula);
    const def = registry.get(p.formula) as any;
    ck('migrate: fused def registered with 2 native weave slots',
      def?.weaveSource?.slots?.length === 2 && def.weaveSource.slots.every((s: any) => s.kind === 'native'),
      def?.weaveSource?.slots?.map((s: any) => s.kind));
    ck('migrate: weaveSource schedule = modulo layer {3,1}',
      def?.weaveSource?.schedule?.kind === 'modulo'
      && def.weaveSource.schedule.layers?.[0]?.interval === 3
      && def.weaveSource.schedule.layers?.[0]?.startIter === 1,
      def?.weaveSource?.schedule);
    ck('migrate: def gated + layered-modulo phase fn',
      !!def && def.shader.function.includes('uWeaveEnabled') && def.shader.function.includes('uWeaveInterval1'));
    const w = p.features.weave;
    ck('migrate: host VALUES on bank 0 (paramA 9, vec2A {3,4})',
      w.ws0ParamA === 9 && w.ws0Vec2A?.x === 3 && w.ws0Vec2A?.y === 4, { a: w.ws0ParamA, v: w.ws0Vec2A });
    ck('migrate: secondary VALUES on bank 1 (Scale −1.8)', w.ws1ParamA === -1.8, w.ws1ParamA);
    ck('migrate: rhythm layer 1 + gate', w.weaveInterval1 === 3 && w.weaveStartIter1 === 1 && w.weaveBeats1 === 0 && w.weaveEnabled === true,
      { i: w.weaveInterval1, s: w.weaveStartIter1, b: w.weaveBeats1, e: w.weaveEnabled });
    ck('migrate: features.interlace cleared', p.features.interlace === undefined);
    ck('migrate: coreMath kernel state untouched', p.features.coreMath.iterations === 40, p.features.coreMath.iterations);
    const targets = p.animations.map((a: any) => a.target);
    ck('migrate: LFO targets retargeted (host, host-axis, secondary, schedule; others untouched)',
      JSON.stringify(targets) === JSON.stringify([
        'weave.ws0ParamA', 'weave.ws0Vec2A_x', 'weave.ws1ParamA', 'weave.weaveInterval1', 'quality.detail',
      ]), targets);
    const keys = Object.keys(p.sequence.tracks).sort();
    ck('migrate: sequence track keys + ids renamed',
      JSON.stringify(keys) === JSON.stringify(['weave.ws0ParamA', 'weave.ws1Vec3A_x'])
      && p.sequence.tracks['weave.ws0ParamA'].id === 'weave.ws0ParamA'
      && p.sequence.tracks['weave.ws1Vec3A_x'].id === 'weave.ws1Vec3A_x', keys);
  }

  // Disabled-but-configured: migrates with the gate OFF (base-only round-trip).
  {
    const src: any = legacy();
    src.features.interlace.interlaceEnabled = false;
    const p: any = migrateLegacyWeavePreset(src);
    ck('migrate: disabled scene → weaveEnabled false', /^MB3DHybrid/.test(p.formula) && p.features.weave.weaveEnabled === false);
  }

  // Configured-but-never-compiled: dead state dropped, nothing else changes.
  {
    const src: any = legacy();
    src.features.interlace.interlaceCompiled = false;
    const p: any = migrateLegacyWeavePreset(src);
    ck('migrate: uncompiled → interlace dropped, formula unchanged',
      p.formula === 'Mandelbulb' && p.features.interlace === undefined && p.features.weave === undefined,
      { f: p.formula, w: p.features.weave });
  }

  // Non-representable scenes stay untouched (state kept for forensics).
  {
    const src: any = legacy();
    src.formula = 'MandelTerrain'; // self-contained host — resolver reject
    const p: any = migrateLegacyWeavePreset(src);
    ck('migrate: self-contained host → untouched', p.formula === 'MandelTerrain' && !!p.features.interlace);
  }
  {
    const src: any = legacy();
    src.features.interlace.interlaceFormula = 'NoSuchFormula';
    const p: any = migrateLegacyWeavePreset(src);
    ck('migrate: unknown secondary → untouched', p.formula === 'Mandelbulb' && !!p.features.interlace);
  }

  // Re-save round-trip: a MIGRATED scene saved as GMF and re-loaded comes back
  // in the NEW format (weaveSource on the def, weave feature state in <Scene>,
  // no legacy interlace anywhere) — and re-running the migration is a no-op.
  {
    const { saveGMFScene, loadGMFScene } = await import('../engine-gmt/utils/FormulaFormat.ts');
    const p: any = migrateLegacyWeavePreset(legacy());
    const gmf = saveGMFScene(p);
    const { def, preset } = loadGMFScene(gmf) as any;
    ck('roundtrip: reloaded def carries weaveSource (2 native slots, modulo)',
      def?.weaveSource?.slots?.length === 2 && def.weaveSource.schedule.kind === 'modulo', def?.weaveSource?.schedule);
    ck('roundtrip: reloaded def keeps the spliced getDist + gated phase fn',
      typeof def?.shader.getDist === 'string' || def?.shader.function.includes('uWeaveEnabled'));
    ck('roundtrip: scene state rides weave feature, no legacy interlace',
      preset.features.weave?.ws1ParamA === -1.8 && preset.features.weave?.weaveInterval1 === 3
      && preset.features.interlace === undefined, preset.features.weave);
    const again: any = migrateLegacyWeavePreset(JSON.parse(JSON.stringify(preset)));
    ck('roundtrip: re-migration is a no-op', again.formula === preset.formula
      && again.features.weave?.ws1ParamA === -1.8);
  }
}

// ── P4.5: BoxFold formulas + Hybrid Box interleave migration ────────────────
{
  const { registerBoxFoldFormulas, boxFoldFormulaId } = await import('../engine-gmt/formulas/boxFolds.ts');
  const { FOLD_LIST } = await import('../engine-gmt/features/geometry/folds/index.ts');
  const { migrateLegacyWeavePreset } = await import('../engine-gmt/utils/weaveMigration.ts');
  registerBoxFoldFormulas();

  // All seven fold types register and resolve as weave slots (stable codes;
  // half=2 and decoupled=3 retired 2026-07-05).
  {
    const ids = FOLD_LIST.map((f) => boxFoldFormulaId(f.foldType));
    ck('boxfold: 7 defs registered', ids.length === 7 && ids.every((id) => !!id && !!registry.get(id as any)), ids);
    const rejects = ids.filter((id) => resolveNativeSlot(registry.get(id as any)!, 0, 'p', { parametric: true }).ok === false);
    ck('boxfold: all resolve as weave slots', rejects.length === 0, rejects);
    const std = registry.get(boxFoldFormulaId(0) as any)!;
    ck('boxfold: standard keeps Tglad fold body', std.shader.function.includes('clamp(z, -uVec3A, uVec3A) * 2.0 - z'));
    ck('boxfold: menger selfContained (no sphereFold/outer scale)',
      !registry.get(boxFoldFormulaId(8) as any)!.shader.function.includes('sphereFold('));
    ck('boxfold: KIFS trio selfContained with MB3D offset IFS step', [5, 6, 7].every((t) => {
      const fn = registry.get(boxFoldFormulaId(t) as any)!.shader.function;
      return !fn.includes('sphereFold(') && fn.includes('uVec4A.xyz * (scale - 1.0)');
    }));
    ck('boxfold: retired codes — half → null, decoupled → Standard',
      boxFoldFormulaId(2) === null && boxFoldFormulaId(3) === 'BoxFoldStandard');
    const emit = emitFusedHybrid(scene([nativeSlotShell('Mandelbulb', 1), nativeSlotShell(boxFoldFormulaId(0)!, 1)]));
    ck('boxfold: weaves with a host', emit.ledger.supported === true && !!emit.def
      && emit.def.shader.function.includes('ws1_bfstandard_fold'), emit.ledger.reasons);
  }

  const legacyHb = (over: Record<string, any> = {}, geomOver: Record<string, any> = {}) => ({
    formula: 'Mandelbulb',
    name: 'hb legacy',
    features: {
      coreMath: { iterations: 30, paramA: 8 },
      geometry: {
        juliaMode: false,
        hybridCompiled: true, hybridMode: true, hybridComplex: true,
        hybridSkip: 2, hybridSwap: true, hybridIter: 4, hybridFoldType: 0,
        hybridScale: -1.7, hybridMinR: 0.4, hybridFixedR: 1.1,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        ...geomOver,
      },
    },
    animations: [
      { id: 'h1', enabled: true, target: 'geometry.hybridScale' },
      { id: 'h2', enabled: true, target: 'geometry.hybridSkip' },
      { id: 'h3', enabled: true, target: 'geometry.juliaMode' },
    ],
    ...over,
  });

  // Interleaved-only scene → 2-slot weave with a BoxFold layer.
  {
    const p: any = migrateLegacyWeavePreset(legacyHb());
    ck('hb-migrate: formula → fused weave', /^MB3DHybrid/.test(p.formula), p.formula);
    const w = p.features.weave;
    ck('hb-migrate: skip/swap/iter → interval/startIter/beats',
      w.weaveInterval1 === 2 && w.weaveStartIter1 === 1 && w.weaveBeats1 === 4,
      { i: w.weaveInterval1, s: w.weaveStartIter1, b: w.weaveBeats1 });
    ck('hb-migrate: fold VALUES on bank 1', w.ws1ParamA === -1.7 && w.ws1ParamC === 0.4, { a: w.ws1ParamA, c: w.ws1ParamC });
    ck('hb-migrate: gate from hybridMode', w.weaveEnabled === true);
    const geo = p.features.geometry;
    ck('hb-migrate: interleave state cleared, julia untouched',
      geo.hybridComplex === undefined && geo.hybridSkip === undefined && geo.hybridSwap === undefined
      && geo.hybridCompiled === false && geo.hybridMode === false && geo.juliaMode === false, geo);
    const targets = p.animations.map((a: any) => a.target);
    ck('hb-migrate: tracks retargeted',
      JSON.stringify(targets) === JSON.stringify(['weave.ws1ParamA', 'weave.weaveInterval1', 'geometry.juliaMode']), targets);
    const def = registry.get(p.formula) as any;
    ck('hb-migrate: weaveSource layer carries beats',
      def?.weaveSource?.schedule?.layers?.[0]?.beats === 4, def?.weaveSource?.schedule);
  }

  // Retired folds: decoupled (3) migrates onto the Standard slot; half (2)
  // bails (scene loads unmigrated, legacy state kept for forensics).
  {
    const p3: any = migrateLegacyWeavePreset(legacyHb({}, { hybridFoldType: 3 }));
    const def3 = registry.get(p3.formula) as any;
    ck('hb-migrate: decoupled → Standard fold slot',
      /^MB3DHybrid/.test(p3.formula) && def3?.weaveSource?.slots?.[1]?.ref === 'BoxFoldStandard'
      && p3.features.weave?.ws1ParamA === -1.7,
      def3?.weaveSource?.slots?.map((s: any) => s.ref));
    const p2: any = migrateLegacyWeavePreset(legacyHb({}, { hybridFoldType: 2 }));
    ck('hb-migrate: half bails, scene loads unmigrated',
      p2.formula === 'Mandelbulb' && p2.features.weave === undefined
      && p2.features.geometry.hybridCompiled === true, p2.formula);
  }

  // Fold-specific vec4A (kali constant) carries the SCENE value, not the default.
  {
    const pk: any = migrateLegacyWeavePreset(legacyHb({}, {
      hybridFoldType: 4, hybridKaliConstant: { x: 0.7, y: 0.6, z: -0.5 },
    }));
    const v = pk.features.weave?.ws1Vec4A;
    ck('hb-migrate: kali constant → vec4A bank value',
      /^MB3DHybrid/.test(pk.formula) && v?.x === 0.7 && v?.y === 0.6 && v?.z === -0.5 && v?.w === 0, v);
  }

  // Combined scene, enables AGREE → 3-slot weave, fold layer 1, secondary layer 2.
  {
    const src: any = legacyHb();
    src.features.interlace = {
      interlaceCompiled: true, interlaceEnabled: true,
      interlaceFormula: 'AmazingBox', interlaceInterval: 3, interlaceStartIter: 0,
      interlaceParamA: -1.8,
    };
    src.animations.push({ id: 'c1', enabled: true, target: 'interlace.interlaceInterval' });
    const p: any = migrateLegacyWeavePreset(src);
    const def = registry.get(p.formula) as any;
    const w = p.features.weave;
    ck('combined: 3 native slots, fold before secondary',
      def?.weaveSource?.slots?.length === 3
      && /Box Fold/.test(def.weaveSource.slots[1].label) && /Amazing Box/.test(def.weaveSource.slots[2].label),
      def?.weaveSource?.slots?.map((s: any) => s.label));
    ck('combined: fold = layer 1 (legacy precedence), interlace = layer 2',
      w.weaveInterval1 === 2 && w.weaveBeats1 === 4 && w.weaveInterval2 === 3 && w.weaveBeats2 === 0,
      { i1: w.weaveInterval1, i2: w.weaveInterval2 });
    ck('combined: interlace tracks land on layer 2',
      p.animations.find((a: any) => a.id === 'c1')?.target === 'weave.weaveInterval2');
    ck('combined: secondary VALUES on bank 2', w.ws2ParamA === -1.8, w.ws2ParamA);
    ck('combined: legacy state cleared', p.features.interlace === undefined && p.features.geometry.hybridComplex === undefined);
  }

  // Combined scene, enables DISAGREE → only the enabled system migrates.
  {
    const src: any = legacyHb();
    src.features.interlace = {
      interlaceCompiled: true, interlaceEnabled: false,
      interlaceFormula: 'AmazingBox', interlaceInterval: 3, interlaceStartIter: 0,
    };
    const p: any = migrateLegacyWeavePreset(src);
    const def = registry.get(p.formula) as any;
    ck('disagree: only hybrid migrates (2 slots), interlace dropped',
      def?.weaveSource?.slots?.length === 2 && p.features.interlace === undefined
      && p.features.weave.weaveEnabled === true,
      def?.weaveSource?.slots?.map((s: any) => s.label));
  }

  // Fast path (hybridComplex false) — retired P4.7. Migrates to a COUNTS intro:
  // the fold is slot 0 running hybridIter iterations then STOPPING (repeatFrom =
  // the host, slot 1), NOT a periodic layer. IGNORES the interleave schedule
  // fields (hybridSkip=2 / hybridSwap=true).
  {
    const p: any = migrateLegacyWeavePreset(legacyHb({}, { hybridComplex: false }));
    const def = registry.get(p.formula) as any;
    const ws = def?.weaveSource;
    ck('fastpath: 2-slot COUNTS weave, repeatFrom = host',
      /^MB3DHybrid/.test(p.formula) && ws?.slots?.length === 2
      && ws?.schedule?.kind === 'counts' && ws?.schedule?.repeatFrom === 1,
      { kind: ws?.schedule?.kind, rf: ws?.schedule?.repeatFrom });
    ck('fastpath: fold is intro slot 0 (hybridIter iters), host loops slot 1',
      ws?.slots?.[0]?.ref?.startsWith?.('BoxFold') && ws?.slots?.[0]?.slot?.iterCount === 4
      && ws?.slots?.[1]?.ref === 'Mandelbulb',
      { s0: ws?.slots?.[0]?.ref, n0: ws?.slots?.[0]?.slot?.iterCount, s1: ws?.slots?.[1]?.ref });
    ck('fastpath: enabled, no rhythm layer params (counts not modulo)',
      p.features.weave?.weaveEnabled === true && p.features.weave?.weaveInterval1 === undefined);
    ck('fastpath: legacy geometry state cleared',
      p.features.geometry.hybridCompiled === false && p.features.geometry.hybridComplex === undefined);
  }

  // Disabled fast path (hybridMode off) rendered the host alone → NO weave.
  {
    const p: any = migrateLegacyWeavePreset(legacyHb({}, { hybridComplex: false, hybridMode: false }));
    ck('fastpath disabled: host alone, no weave',
      p.formula === 'Mandelbulb' && p.features.weave === undefined
      && p.features.geometry.hybridCompiled === false);
  }

  // hybridIter < 1: the legacy cap meant the fold NEVER ran — no weave, state off.
  {
    const p: any = migrateLegacyWeavePreset(legacyHb({}, { hybridIter: 0 }));
    ck('hb-iter0: no weave, interleave switched off',
      p.formula === 'Mandelbulb' && p.features.weave === undefined
      && p.features.geometry.hybridComplex === undefined && p.features.geometry.hybridCompiled === false);
  }
}

// ── Loop dividers (P4.7 buildBlockPlan) ──────────────────────────────────────
{
  const str = (p: any) => p.order.map((s: number) => 'ABCDEF'[s < 0 ? ~s : s]).join('');

  // The owner's example: [A×2, B×1] plays ×2, then C, D loop → A A B A A B C D C D…
  const ex = buildBlockPlan({ iterCounts: [2, 1, 1, 1], dividers: [{ afterRow: 1, repeat: 2 }] });
  ck('blockPlan: A A B ×2 then C D loop',
    str(ex) === 'AABAABCD' && ex.introLen === 6 && ex.cycleLen === 2,
    { order: str(ex), intro: ex.introLen, cyc: ex.cycleLen });

  // No dividers ≡ buildCountsPlan repeatFrom 0 (whole sequence loops).
  const nod = buildBlockPlan({ iterCounts: [2, 1], dividers: [] });
  const c0 = buildCountsPlan({ iterCounts: [2, 1], endTo: 1, repeatFrom: 0 });
  ck('blockPlan: no dividers ≡ counts repeatFrom 0',
    JSON.stringify(nod.order) === JSON.stringify(c0.order) && nod.introLen === c0.introLen && nod.cycleLen === c0.cycleLen);

  // A single {afterRow:k, repeat:1} ≡ buildCountsPlan repeatFrom k+1 (the fast-path intro).
  const one = buildBlockPlan({ iterCounts: [3, 1, 1], dividers: [{ afterRow: 0, repeat: 1 }] });
  const cf = buildCountsPlan({ iterCounts: [3, 1, 1], endTo: 2, repeatFrom: 1 });
  ck('blockPlan: one divider ≡ counts repeatFrom (fast-path intro)',
    JSON.stringify(one.order) === JSON.stringify(cf.order) && one.introLen === cf.introLen && one.cycleLen === cf.cycleLen,
    { block: str(one), counts: str(cf) });

  // A divider AT the last active row is dropped (no cycle would remain).
  const degen = buildBlockPlan({ iterCounts: [2, 1], dividers: [{ afterRow: 1, repeat: 3 }] });
  ck('blockPlan: divider at last row dropped (still one loop)', str(degen) === 'AAB' && degen.introLen === 0);
}

// ── Sequence ↔ Rhythm conversion (convert.ts) ────────────────────────────────
{
  const lbl = (i: number) => 'ABCDEF'[i] ?? `s${i}`;
  const activeOf = (counts: number[]) => counts.map((c, i) => (c > 0 ? i : -1)).filter((i) => i >= 0);
  const eqLUT = (a: number[], b: number[]) => JSON.stringify(a) === JSON.stringify(b);
  const pairs = (rs: { rowIdx: number; count: number }[]) => rs.map((r) => [r.rowIdx, r.count]);

  const nonBase = (active: number[], base: number) => active.filter((r) => r !== base);

  // -- Sequence → Rhythm fits + LUT preservation --
  {
    const plan = buildBlockPlan({ iterCounts: [1, 1], dividers: [] });
    const fit = fitRhythmFromPlan(plan, activeOf([1, 1]), lbl);
    ck('fit: A×1 B×1 → base 0, B(I2,S1,endless)',
      fit.ok && fit.baseRow === 0 && fit.layers.length === 1 && fit.layers[0].interval === 2 && fit.layers[0].start === 1 && fit.layers[0].beats === 0,
      fit.ok ? { base: fit.baseRow, layers: fit.layers } : fit.reason);
    if (fit.ok) ck('fit: A×1 B×1 LUT equal',
      eqLUT(simulate(planPhase(plan), 40), simulate(rhythmPhase(fit.layers, fit.baseRow, nonBase(activeOf([1, 1]), fit.baseRow)), 40)));
  }
  {
    const counts = [3, 1, 1];
    const plan = buildBlockPlan({ iterCounts: counts, dividers: [] });
    const fit = fitRhythmFromPlan(plan, activeOf(counts), lbl);
    ck('fit: A×3 B×1 C×1 → base 0, B(I5,S3) C(I5,S4)',
      fit.ok && fit.baseRow === 0 && fit.layers[0].interval === 5 && fit.layers[0].start === 3 && fit.layers[1].interval === 5 && fit.layers[1].start === 4,
      fit.ok ? { base: fit.baseRow, layers: fit.layers } : fit.reason);
    if (fit.ok) ck('fit: A×3 B×1 C×1 LUT equal',
      eqLUT(simulate(planPhase(plan), 40), simulate(rhythmPhase(fit.layers, fit.baseRow, nonBase(activeOf(counts), fit.baseRow)), 40)));
  }
  {
    // divider intro: [A×2 B×1]×2 then C D → base 0, B capped (S2,I3,B2); C,D endless
    const counts = [2, 1, 1, 1];
    const plan = buildBlockPlan({ iterCounts: counts, dividers: [{ afterRow: 1, repeat: 2 }] });
    const fit = fitRhythmFromPlan(plan, activeOf(counts), lbl);
    ck('fit: divider intro [A×2 B]×2 then C D (base 0)',
      fit.ok && fit.baseRow === 0 && fit.layers[0].interval === 3 && fit.layers[0].start === 2 && fit.layers[0].beats === 2,
      fit.ok ? { base: fit.baseRow, layers: fit.layers } : fit.reason);
    if (fit.ok) ck('fit: divider-intro LUT equal',
      eqLUT(simulate(planPhase(plan), 60), simulate(rhythmPhase(fit.layers, fit.baseRow, nonBase(activeOf(counts), fit.baseRow)), 60)));
  }

  // -- Base election (spec §7): base is the tail formula, not the first row --
  {
    // Bristorbrot: fold intro A×1 then bristorbrot B loop → base elected = B (row 1),
    // fold becomes a one-shot capped layer (S0,I1,B1). NOT activeRows[0].
    const plan = buildBlockPlan({ iterCounts: [1, 4], dividers: [{ afterRow: 0, repeat: 1 }] });
    const fit = fitRhythmFromPlan(plan, activeOf([1, 4]), lbl);
    ck('elect: fold-intro → base = B (row 1), fold layer S0 I1 B1',
      fit.ok && fit.baseRow === 1 && fit.layers.length === 1
      && fit.layers[0].start === 0 && fit.layers[0].interval === 1 && fit.layers[0].beats === 1,
      fit.ok ? { base: fit.baseRow, layers: fit.layers } : fit.reason);
    ck('elect: elected base ≠ activeRows[0] (regression pin)', fit.ok && fit.baseRow !== activeOf([1, 4])[0]);
    if (fit.ok) ck('elect: Bristorbrot LUT equal',
      eqLUT(simulate(planPhase(plan), 40), simulate(rhythmPhase(fit.layers, fit.baseRow, nonBase(activeOf([1, 4]), fit.baseRow)), 40)));
  }
  {
    // Tie-break: symmetric A×1 B×1 (both tail ½) → earliest row wins (base 0).
    const fit = fitRhythmFromPlan(buildBlockPlan({ iterCounts: [1, 1], dividers: [] }), activeOf([1, 1]), lbl);
    ck('elect: symmetric alternation → base 0 (tie-break earliest)', fit.ok && fit.baseRow === 0);
  }

  // -- Sequence → Rhythm refusals with exact reasons --
  {
    const fit = fitRhythmFromPlan(buildBlockPlan({ iterCounts: [2, 2], dividers: [] }), activeOf([2, 2]), lbl);
    ck('fit refuse: A×2 B×2 uneven gaps', !fit.ok && /unevenly/.test(fit.ok ? '' : fit.reason), fit.ok ? '' : fit.reason);
  }
  {
    const fit = fitRhythmFromPlan(buildBlockPlan({ iterCounts: [2, -1, 1], dividers: [] }), [0, 2], lbl);
    ck('fit refuse: silent slot', !fit.ok && /Silent/.test(fit.ok ? '' : fit.reason), fit.ok ? '' : fit.reason);
  }
  {
    // cycle 33 (A×32 B×1 loops) → B interval 33 > INTERVAL_MAX
    const fit = fitRhythmFromPlan(buildBlockPlan({ iterCounts: [32, 1], dividers: [] }), activeOf([32, 1]), lbl);
    ck('fit refuse: cycle 33 outside interval range', !fit.ok && /range/.test(fit.ok ? '' : fit.reason), fit.ok ? '' : fit.reason);
  }

  // -- Rhythm → Sequence bakes --
  {
    // base-interleave: B(I5,S2) + C(I5,S4) → cycle A A B A C (4 rows, base duplicated)
    const layers = [{ interval: 5, start: 2, beats: 0 }, { interval: 5, start: 4, beats: 0 }];
    const runs = runsFromRhythm(layers, 0, [1, 2], lbl);
    ck('runs: base-interleave → A×2 B A C (dup base, 4 rows)',
      runs.ok && runs.introRuns.length === 0 && eqLUT(pairs(runs.cycleRuns).flat(), [0, 2, 1, 1, 0, 1, 2, 1]),
      runs.ok ? pairs(runs.cycleRuns) : runs.reason);
  }
  {
    // capped-layer intro → divider: base A + B(I1,S0,B2) → B×2 intro, A cycle
    const runs = runsFromRhythm([{ interval: 1, start: 0, beats: 2 }], 0, [1], lbl);
    ck('runs: capped intro → B×2 intro + A cycle',
      runs.ok && eqLUT(pairs(runs.introRuns).flat(), [1, 2]) && eqLUT(pairs(runs.cycleRuns).flat(), [0, 1]),
      runs.ok ? { intro: pairs(runs.introRuns), cyc: pairs(runs.cycleRuns) } : runs.reason);
  }
  {
    // minimal-period reduction: B(I2,S0) + C(I2,S1) → cycle len 2 (B C)
    const runs = runsFromRhythm([{ interval: 2, start: 0, beats: 0 }, { interval: 2, start: 1, beats: 0 }], 0, [1, 2], lbl);
    ck('runs: two I=2 layers → cycle len 2 (B C)',
      runs.ok && runs.introRuns.length === 0 && eqLUT(pairs(runs.cycleRuns).flat(), [1, 1, 2, 1]),
      runs.ok ? pairs(runs.cycleRuns) : runs.reason);
  }

  // -- Rhythm → Sequence refusals --
  {
    // co-prime 2 & 5 with 3 active rows → 10 runs > MAX_ROWS
    const runs = runsFromRhythm([{ interval: 2, start: 0, beats: 0 }, { interval: 5, start: 0, beats: 0 }], 0, [1, 2], lbl);
    ck('runs refuse: co-prime 2&5 over row budget', !runs.ok && /slot rows/.test(runs.ok ? '' : runs.reason), runs.ok ? '' : runs.reason);
  }
  {
    // period lcm(31,32,27)=26784 > W_MAX → refuse before RLE
    const runs = runsFromRhythm(
      [{ interval: 31, start: 0, beats: 0 }, { interval: 32, start: 0, beats: 0 }, { interval: 27, start: 0, beats: 0 }],
      0, [1, 2, 3], lbl);
    ck('runs refuse: period over W_MAX', !runs.ok && /too long to bake/.test(runs.ok ? '' : runs.reason), runs.ok ? '' : runs.reason);
  }

  // -- Property fuzz: fit ok ⇒ LUT certificate holds (the disjointness argument) --
  {
    let ok = true, checked = 0;
    for (let t = 0; t < 400 && ok; t++) {
      const nRows = 2 + Math.floor(Math.random() * 4);
      const counts = Array.from({ length: nRows }, () => 1 + Math.floor(Math.random() * 3));
      const dividers = Math.random() < 0.5 ? [{ afterRow: Math.floor(Math.random() * (nRows - 1)), repeat: 1 + Math.floor(Math.random() * 2) }] : [];
      const plan = buildBlockPlan({ iterCounts: counts, dividers });
      const active = activeOf(counts);
      const fit = fitRhythmFromPlan(plan, active, lbl);
      if (fit.ok) { checked++; if (!eqLUT(simulate(planPhase(plan), 240), simulate(rhythmPhase(fit.layers, fit.baseRow, nonBase(active, fit.baseRow)), 240))) ok = false; }
    }
    ck(`fuzz: fit ok ⇒ LUT equal (${checked} fits)`, ok && checked > 0);
  }
  // -- Property fuzz: runs ok ⇒ replayed plan reproduces the rhythm --
  {
    let ok = true, checked = 0;
    for (let t = 0; t < 400 && ok; t++) {
      const nLayers = 1 + Math.floor(Math.random() * 2);
      const active = Array.from({ length: nLayers + 1 }, (_, i) => i);
      const layers = Array.from({ length: nLayers }, () => ({
        interval: 1 + Math.floor(Math.random() * 5), start: Math.floor(Math.random() * 4),
        beats: Math.random() < 0.4 ? 1 + Math.floor(Math.random() * 3) : 0,
      }));
      const runs = runsFromRhythm(layers, active[0], active.slice(1), lbl);
      if (runs.ok) {
        checked++;
        const all = [...runs.introRuns, ...runs.cycleRuns];
        const p2 = buildBlockPlan({ iterCounts: all.map((r) => r.count), dividers: runs.introRuns.length ? [{ afterRow: runs.introRuns.length - 1, repeat: 1 }] : [] });
        const rows = all.map((r) => r.rowIdx);
        const src = simulate(rhythmPhase(layers, active[0], active.slice(1)), 300);
        const got = simulate((i: number) => rows[planPhase(p2)(i)] ?? rows[0], 300);
        if (!eqLUT(src, got)) ok = false;
      }
    }
    ck(`fuzz: runs ok ⇒ replay equal (${checked} bakes)`, ok && checked > 0);
  }

  // -- Clamp coherence: BOUNDS are the documented values (layerVal imports them) --
  ck('BOUNDS coherent (32/64/64/6/192/4096)',
    BOUNDS.INTERVAL_MAX === 32 && BOUNDS.START_MAX === 64 && BOUNDS.BEATS_MAX === 64 &&
    BOUNDS.MAX_ROWS === 6 && BOUNDS.MAX_LUT === 192 && BOUNDS.W_MAX === 4096);
}

// ── mergeDenseLanes: dense-lane transfer on an editor Rebuild ────────────────
// Live MB3D param values must FOLLOW their slot across a reorder (lanes
// reallocate in row order), a NEW slot must take its formula-file defaults
// (never stale live lane values), and global knobs (iterations) stay the user's.
{
  const { mergeDenseLanes } = await import('../engine-gmt/utils/mb3d/loadMB3DScene.ts');
  const wsSlot = (kind: string, ref: string | number, iter = 2) => ({
    label: String(ref), kind, ref,
    slot: { iterCount: iter, formulaIndex: 0, optionCount: 0, name: '', optionTypes: [], optionValues: [] },
  });
  const mkDef = (slots: any[], parameters: any[]): any => ({
    id: 'X', name: 'X', parameters, shader: {}, defaultPreset: {},
    weaveSource: { version: 1, title: 't', slots, schedule: { kind: 'counts', repeatFrom: 0 } },
  });
  const p = (id: string, label: string, slotIndex?: number, extra: any = {}) =>
    ({ id, label, min: 0, max: 1, step: 0.1, default: 0, slotIndex, ...extra });

  // Reorder [A,B] → [B,A]: each formula keeps ITS live value on its new lane.
  {
    const oldDef = mkDef([wsSlot('intern', 4), wsSlot('decompiled', 'Foo')],
      [p('paramA', 'Scale', 0), p('paramB', 'Fold', 1)]);
    const newDef = mkDef([wsSlot('decompiled', 'Foo'), wsSlot('intern', 4)],
      [p('paramA', 'Fold', 0), p('paramB', 'Scale', 1)]);
    const m = mergeDenseLanes({ paramA: 1, paramB: 2, iterations: 60 }, { paramA: 7, paramB: 9, iterations: 42 }, newDef, oldDef);
    ck('denseLanes: reorder swaps live values onto the new lanes', m.paramA === 9 && m.paramB === 7, [m.paramA, m.paramB]);
    ck("denseLanes: iterations stay the user's on rebuild", m.iterations === 42, m.iterations);
  }
  // Add a new slot: it takes the FRESH (formula-file) default, not the stale live lane.
  {
    const oldDef = mkDef([wsSlot('intern', 4)], [p('paramA', 'Scale', 0)]);
    const newDef = mkDef([wsSlot('intern', 4), wsSlot('decompiled', 'Bar')],
      [p('paramA', 'Scale', 0), p('paramB', 'Twist', 1)]);
    const m = mergeDenseLanes({ paramA: 2, paramB: 5 }, { paramA: 7, paramB: 99 }, newDef, oldDef);
    ck('denseLanes: surviving slot keeps its live value', m.paramA === 7, m.paramA);
    ck('denseLanes: NEW slot gets formula-file defaults', m.paramB === 5, m.paramB);
  }
  // Legacy old def (no slotIndex): "Formula <n>: …" group fallback still transfers.
  {
    const oldDef = mkDef([wsSlot('intern', 4), wsSlot('decompiled', 'Foo')],
      [p('paramA', 'Scale', undefined, { group: 'Formula 1: ABox' }), p('paramB', 'Fold', undefined, { group: 'Formula 2: Foo' })]);
    const newDef = mkDef([wsSlot('decompiled', 'Foo'), wsSlot('intern', 4)],
      [p('paramA', 'Fold', 0), p('paramB', 'Scale', 1)]);
    const m = mergeDenseLanes({ paramA: 1, paramB: 2 }, { paramA: 7, paramB: 9 }, newDef, oldDef);
    ck('denseLanes: legacy group-divider fallback transfers', m.paramA === 9 && m.paramB === 7, [m.paramA, m.paramB]);
  }
  // Vec value crossing lane shapes: vec3 landing on a vec4 unit pins .w to 0.
  {
    const oldDef = mkDef([wsSlot('decompiled', 'Rot'), wsSlot('decompiled', 'Foo')],
      [p('vec3A', 'Rotation', 0, { type: 'vec3' })]);
    const newDef = mkDef([wsSlot('decompiled', 'Foo'), wsSlot('decompiled', 'Rot')],
      [p('vec4B', 'Rotation', 1, { type: 'vec3' })]);
    const m = mergeDenseLanes({ vec4B: { x: 0, y: 0, z: 0, w: 0 } }, { vec3A: { x: 1, y: 2, z: 3 } }, newDef, oldDef);
    ck('denseLanes: vec3 → vec4-held lane pins w=0', JSON.stringify(m.vec4B) === JSON.stringify({ x: 1, y: 2, z: 3, w: 0 }), m.vec4B);
    ck('denseLanes: unused old lane dropped (resets to defaults)', !('vec3A' in m), m.vec3A);
  }
  // No old weaveSource (building from a plain formula): all lanes take fresh defaults.
  {
    const newDef = mkDef([wsSlot('intern', 4)], [p('paramA', 'Scale', 0)]);
    const m = mergeDenseLanes({ paramA: 2 }, { paramA: 7, iterations: 33 }, newDef, undefined);
    ck('denseLanes: plain-formula origin → fresh lane defaults', m.paramA === 2 && m.iterations === 33, [m.paramA, m.iterations]);
  }
}

// ── P4.6 animation transfer: keyframes/LFOs follow their formulas ────────────
// mergeWeaveBanks emits the routing-string renames its value transfer implies;
// retargetAnimationTargets applies them to BOTH animation stores as one
// simultaneous permutation. The acceptance criterion: after a reorder, a
// keyframed slot param's track and its live value land on the SAME new lane.
{
  const { mergeWeaveBanks } = await import('../engine-gmt/utils/mb3d/loadMB3DScene.ts');
  const { retargetAnimationTargets, findWeaveBankOrphans, removeWeaveOrphans } =
    await import('../engine-gmt/animation/retargetTracks.ts');
  const { useAnimationStore } = await import('../store/animationStore.ts');
  const { useEngineStore } = await import('../store/engineStore.ts');
  type Rename = { from: string; to: string };

  const nSlot = (ref: string) => ({ kind: 'native', ref });
  const defWith = (slots: any[]): any => ({
    id: 'W', name: 'W', shader: {}, defaultPreset: {},
    weaveSource: { version: 1, title: 't', slots: slots.map((s) => ({ ...s, label: String(s.ref), slot: {} })), schedule: { kind: 'counts', repeatFrom: 0 } },
  });

  // Reorder [Bulb, ABox] → [ABox, Bulb]: values re-index AND the rename set
  // carries the full bank vocabulary both ways (a swap, applied simultaneously).
  {
    const renames: Rename[] = [];
    const m = mergeWeaveBanks(
      { ws0ParamA: 0, ws1ParamA: 0 }, { ws0ParamA: 3.3, ws1ParamA: 7 },
      [nSlot('ABox'), nSlot('Bulb')], defWith([nSlot('Bulb'), nSlot('ABox')]), {}, renames,
    );
    ck('banks: reorder re-indexes live values', m.ws0ParamA === 7 && m.ws1ParamA === 3.3, [m.ws0ParamA, m.ws1ParamA]);
    ck('banks: swap emits both directions × full vocabulary (30 renames)', renames.length === 30, renames.length);
    ck('banks: rename set contains ws0→ws1 and ws1→ws0 pairs',
      renames.some((r) => r.from === 'weave.ws0ParamA' && r.to === 'weave.ws1ParamA')
      && renames.some((r) => r.from === 'weave.ws1Vec4C' && r.to === 'weave.ws0Vec4C'));
  }
  // Unchanged order → no renames; append-at-end → no renames for survivors.
  {
    const renames: Rename[] = [];
    mergeWeaveBanks({}, {}, [nSlot('Bulb'), nSlot('ABox')], defWith([nSlot('Bulb'), nSlot('ABox')]), {}, renames);
    ck('banks: identity claim emits no renames', renames.length === 0, renames.length);
    mergeWeaveBanks({}, {}, [nSlot('Bulb'), nSlot('ABox'), nSlot('Koch')], defWith([nSlot('Bulb'), nSlot('ABox')]), {}, renames);
    ck('banks: append-at-end emits no renames', renames.length === 0, renames.length);
  }
  // Delete slot 0 of [Bulb, ABox]: ABox claims bank 0 (ws1→ws0); Bulb's old
  // bank is unclaimed (its tracks become stale occupants for the applier).
  {
    const renames: Rename[] = [];
    mergeWeaveBanks({}, {}, [nSlot('ABox')], defWith([nSlot('Bulb'), nSlot('ABox')]), {}, renames);
    ck('banks: delete shifts the survivor down (15 renames ws1→ws0)',
      renames.length === 15 && renames.every((r) => r.from.startsWith('weave.ws1') && r.to.startsWith('weave.ws0')));
  }
  // First build off a standalone native formula: its live coreMath carries onto
  // bank 0, and the renames follow (only keys the bank vocabulary mirrors).
  {
    const renames: Rename[] = [];
    const m = mergeWeaveBanks(
      { ws0ParamA: 0, ws0Vec2A: { x: 0, y: 0 } }, {},
      [nSlot('Phoenix'), nSlot('ABox')], { id: 'Phoenix' } as any, { paramA: 5, vec2A: { x: 1, y: 2 }, iterations: 60 }, renames,
    );
    ck('banks: coreMath carry moves values onto bank 0', m.ws0ParamA === 5 && m.ws0Vec2A.x === 1);
    ck('banks: coreMath carry renames only bank-vocabulary keys',
      renames.length === 2
      && renames.some((r) => r.from === 'coreMath.paramA' && r.to === 'weave.ws0ParamA')
      && renames.some((r) => r.from === 'coreMath.vec2A' && r.to === 'weave.ws0Vec2A'), renames);
  }

  // Applier: simultaneous swap across both stores, axis variants, selection,
  // timeline-undoability, untouched foreign namespaces.
  const kf = (id: string, v: number) => ({ id, frame: 10, value: v, interpolation: 'Linear' as const });
  const track = (id: string, label: string, v = 1): any => ({ id, type: 'float', label, keyframes: [kf(`${id}-k`, v)] });
  const seed = (tracks: Record<string, any>, sel: string[] = []) =>
    useAnimationStore.setState({
      sequence: { durationFrames: 300, tracks },
      selectedTrackIds: sel,
      selectedKeyframeIds: sel.map((t) => `${t}::${t}-k`),
      undoStack: [], redoStack: [],
    } as any);
  {
    seed({
      'weave.ws0ParamA': track('weave.ws0ParamA', 'Scale', 3.3),
      'weave.ws1ParamA': track('weave.ws1ParamA', 'Fold', 7),
      'weave.ws0Vec2A_x': track('weave.ws0Vec2A_x', 'Julia X'),
      'camera.fov': track('camera.fov', 'FOV'),
    }, ['weave.ws0ParamA']);
    useEngineStore.setState({ animations: [{ id: 'l1', target: 'weave.ws0ParamB', enabled: true } as any] });
    const res = retargetAnimationTargets([
      { from: 'weave.ws0ParamA', to: 'weave.ws1ParamA' }, { from: 'weave.ws1ParamA', to: 'weave.ws0ParamA' },
      { from: 'weave.ws0Vec2A', to: 'weave.ws1Vec2A' }, { from: 'weave.ws0ParamB', to: 'weave.ws1ParamB' },
    ]);
    const a = useAnimationStore.getState() as any;
    const t = a.sequence.tracks;
    ck('retarget: swap applied simultaneously (no chaining)',
      t['weave.ws1ParamA']?.label === 'Scale' && t['weave.ws0ParamA']?.label === 'Fold');
    ck('retarget: keyframe values untouched', t['weave.ws1ParamA']?.keyframes[0]?.value === 3.3);
    ck('retarget: track.id field renamed', t['weave.ws1ParamA']?.id === 'weave.ws1ParamA');
    ck('retarget: vec axis variant follows the base rename', !!t['weave.ws1Vec2A_x'] && !t['weave.ws0Vec2A_x']);
    ck('retarget: foreign namespaces untouched', !!t['camera.fov']);
    ck('retarget: selection remapped',
      a.selectedTrackIds[0] === 'weave.ws1ParamA' && a.selectedKeyframeIds[0] === 'weave.ws1ParamA::weave.ws0ParamA-k');
    ck('retarget: LFO target renamed', (useEngineStore.getState() as any).animations[0].target === 'weave.ws1ParamB');
    ck('retarget: counts', res.tracks === 3 && res.lfos === 1 && res.displaced === 0, res);
    ck('retarget: one timeline-undo step taken', a.undoStack.length === 1, a.undoStack.length);
    a.undo();
    const t2 = (useAnimationStore.getState() as any).sequence.tracks;
    ck('retarget: timeline undo restores the old ids', t2['weave.ws0ParamA']?.label === 'Scale');
  }
  // Displacement: a stale occupant on a rename destination (its slot was
  // deleted) is removed, never left to drive another formula's param.
  {
    seed({
      'weave.ws0ParamA': track('weave.ws0ParamA', 'Deleted slot'),
      'weave.ws1ParamA': track('weave.ws1ParamA', 'Survivor', 7),
    });
    useEngineStore.setState({ animations: [] });
    const res = retargetAnimationTargets([{ from: 'weave.ws1ParamA', to: 'weave.ws0ParamA' }]);
    const t = (useAnimationStore.getState() as any).sequence.tracks;
    ck('retarget: stale occupant displaced, survivor lands on its lane',
      t['weave.ws0ParamA']?.label === 'Survivor' && !t['weave.ws1ParamA'] && res.displaced === 1,
      { labels: Object.keys(t), displaced: res.displaced });
  }
  // Orphans: bank targets the def no longer exposes — rhythm + coreMath are out
  // of scope; axis variants of exposed vec params are valid.
  {
    seed({
      'weave.ws0ParamA': track('weave.ws0ParamA', 'valid'),
      'weave.ws0Vec2A_y': track('weave.ws0Vec2A_y', 'valid axis'),
      'weave.ws3ParamC': track('weave.ws3ParamC', 'orphan'),
      'weave.weaveInterval1': track('weave.weaveInterval1', 'rhythm — skip'),
      'coreMath.paramA': track('coreMath.paramA', 'dense — skip'),
    });
    useEngineStore.setState({ animations: [{ id: 'l2', target: 'weave.ws2ParamA', enabled: true } as any] });
    const def: any = {
      parameters: [
        { id: 'ws0ParamA', feature: 'weave' },
        { id: 'ws0Vec2A', feature: 'weave', type: 'vec2' },
      ],
    };
    const o = findWeaveBankOrphans(def);
    ck('orphans: only unexposed bank targets flagged',
      o.trackIds.length === 1 && o.trackIds[0] === 'weave.ws3ParamC' && o.lfoIds[0] === 'l2', o);
    removeWeaveOrphans(o);
    const t = (useAnimationStore.getState() as any).sequence.tracks;
    ck('orphans: cleanup removes them (valid tracks stay)',
      !t['weave.ws3ParamC'] && !!t['weave.ws0ParamA'] && (useEngineStore.getState() as any).animations.length === 0);
  }
  // Acceptance chain (the P4.6 gate): keyframed slot param + its live value
  // land on the SAME lane after a reorder — the same semantic param animates.
  {
    seed({ 'weave.ws0ParamA': track('weave.ws0ParamA', 'Bulb Power', 8) });
    useEngineStore.setState({ animations: [] });
    const renames: Rename[] = [];
    const m = mergeWeaveBanks(
      { ws0ParamA: 0, ws1ParamA: 0 }, { ws0ParamA: 8 },
      [nSlot('ABox'), nSlot('Bulb')], defWith([nSlot('Bulb'), nSlot('ABox')]), {}, renames,
    );
    retargetAnimationTargets(renames);
    const t = (useAnimationStore.getState() as any).sequence.tracks;
    ck('ACCEPTANCE: track and value follow the slot to the same lane',
      m.ws1ParamA === 8 && t['weave.ws1ParamA']?.keyframes[0]?.value === 8 && !t['weave.ws0ParamA'],
      { value: m.ws1ParamA, tracks: Object.keys(t) });
  }
}

console.log(`\n==== MB3D weave: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) {
  console.log('FAILURES:\n - ' + fails.join('\n - '));
  process.exit(1);
}
