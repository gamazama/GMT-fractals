/**
 * Fuse a parsed MB3D scene's formula stack into ONE runtime FractalDefinition.
 *
 * Pipeline: buildWeaveSequence (the per-iteration slot order) → transpileSlot
 * (each slot's MB3D math as a GLSL helper) → assemble a dispatcher that switches
 * on the iteration index `i` (in scope in the kernel loop) → wrap as a
 * FractalDefinition with a renderable preset cloned from Amazing Box.
 *
 * v1 is FAITHFUL-ONLY: if any active slot can't be transpiled from MB3D source
 * (external `[CODE]`, intern #5/#6, weave mode 1-3), the whole scene is reported
 * unsupported with reasons — no silent fallback to a divergent GMT formula.
 *
 * @see plans/mb3d/formula-discrepancies.md
 */
import type { MB3DScene } from './parseMB3D';
import type { FractalDefinition } from '../../types/fractal';
import type { Capability } from '../../types/capabilities';
import { buildWeaveSequence, emitWeaveGLSL, stepSlot } from './weaveSequencer';
import { assembleWeave } from '../../engine/weave/emitWeave';
import { emitLayeredModuloGLSL } from '../../engine/weave/schedule';
import { resolveNativeSlot, NATIVE_FORMULA_INDEX } from '../../engine/weave/nativeResolver';
import { transpileSlot } from './slotTranspiler';
import type { SlotFlag, TranspiledSlot } from './slotTranspiler';
import { mapDEMeta, MB3D_ROT_GLSL } from './constPacker';
import { LaneAllocator } from '../uniformSlots';
import { mapMB3DCamera } from './mapCamera';
import { mapMB3DLighting } from './mapLighting';
import { DECOMPILED_DE_META } from './decompiled-formulas';
import { registry } from '../../engine/FractalRegistry';
import { DEFAULT_HARD_CAP } from '../../../data/constants';

export interface WeaveLedger {
  mode: number;
  supported: boolean;
  reasons: string[];
  slotFlags: SlotFlag[];
}

export interface EmitFusedOptions {
  /** Schedule override (ADR-0089 P3b "Rhythm"). `{kind:'modulo'}` replaces the baked
   *  counts LUT with the LAYERED runtime-uniform phase function: the first active
   *  slot is the base (phase 0); each further active slot k is an independent rhythm
   *  layer reading `uWeaveInterval<k>` / `uWeaveStartIter<k>` / `uWeaveBeats<k>`
   *  (the DDFS `weave` feature — live AND keyframable, schedule edits never
   *  recompile). Layers are checked in slot order, first beat wins (the ADR-0089
   *  arbitration rule). Requires 2–6 active slots; anything else is a ledger reason.
   *  @invariant opts absent (or kind ≠ modulo) = the counts path, byte-identical
   *  to the pre-P3b emit (probe: debug/probe-weave-refactor.mts). */
  schedule?: { kind: 'modulo' };
  /** Per-slot, per-OPTION expose/bake directives (P3b Task 2), indexed by the
   *  addon slot index then the option index: true = bake that option's value as
   *  a literal (frees its uniform lanes). Absent = auto-expose (unchanged). */
  slotBake?: Array<boolean[] | undefined>;
}

export interface EmitResult {
  def: FractalDefinition | null;
  ledger: WeaveLedger;
  /** Best-effort fallback: load this already-registered GMT formula instead of a
   *  fused def (used when a single external [CODE] slot has a same-named GMT
   *  formula). NOT MB3D's math — flagged loudly in the ledger. */
  substitute?: { formulaId: string; preset: any };
}

let seq = 0;
// Honour the scene's authored iteration count up to the kernel's hard cap
// (MAX_HARD_ITERATIONS = DEFAULT_HARD_CAP). The old 500 ceiling truncated deep
// scenes; iterations stay user-adjustable via the slider.
const clampIter = (n: number) => Math.min(DEFAULT_HARD_CAP, Math.max(1, Math.round(n || 16)));

/** Map an external [CODE] formula name to a GMT same-named formula, for the
 *  best-effort substitution path. This is a NAME match only — the math is NOT
 *  verified equal to MB3D's (and usually isn't); every use is flagged. */
function gmtSubId(name: string): string | undefined {
  const k = name.toLowerCase().trim();
  if (/menger/.test(k)) return 'MengerSponge';
  if (/surf/.test(k)) return 'AmazingSurf';
  if (/sierpinski/.test(k)) return 'SierpinskiTetrahedron';
  if (/kleinian|kalibox|kali/.test(k)) return 'Kleinian';
  if (/abox|amazingbox/.test(k)) return 'AmazingBox';
  if (/quat/.test(k)) return 'Quaternion';
  if (/mandelbulb|integer ?power|^bulb/.test(k)) return 'Mandelbulb';
  return undefined;
}

export function emitFusedHybrid(scene: MB3DScene, opts?: EmitFusedOptions): EmitResult {
  const addon = scene.addon;
  if (!addon) {
    return { def: null, ledger: { mode: -1, supported: false, reasons: ['No formula stack in that block.'], slotFlags: [] } };
  }

  const plan = buildWeaveSequence(addon);
  const reasons: string[] = [];
  if (plan.mode !== 0) reasons.push(`Weave mode ${plan.mode} (interpolate / CSG / KIFS) isn't supported yet — only mode 0 (alternate).`);
  if (plan.hasSilent) reasons.push('Scene uses negative-iterCount "silent" slots — not supported yet.');

  const id = `MB3DHybrid${seq}`;
  const usedIdx = [...new Set(plan.order.map(stepSlot))].sort((a, b) => a - b);
  // Rhythm (layered modulo) schedule: 2–6 active slots — base + up to 5 layers
  // (the DDFS weave feature declares 5 layer uniform sets). The Weave Editor only
  // requests it in that range, so this reason is a belt-and-braces backstop.
  const modulo = opts?.schedule?.kind === 'modulo';
  if (modulo && (usedIdx.length < 2 || usedIdx.length > 6)) {
    reasons.push(`Rhythm (modulo) scheduling needs 2 to 6 active formula slots — this weave has ${usedIdx.length}.`);
  }
  // A hybrid weave must run long enough for every formula slot to execute at least
  // once, else a trailing slot never contributes to the DE. MB3D's authored iteration
  // count can fall below that: Wada basin authored iterations=2 over a 3-slot cycle
  // (PolyFold-symIFS → SphereIFS → SphereIFS), so the 2nd SphereIFS — the small CENTRE
  // sphere — never ran and went missing, while the outer 5 spheres (the 5-fold polar-fold
  // copies of the 1st SphereIFS) rendered fine. Floor the iteration count to the position
  // of the last slot's first appearance in the weave order + 1. This only ever RAISES the
  // count, and only when a slot would otherwise be dropped — every other bundled scene
  // already covers all its slots within the authored count (Dainbramage 200/322-cycle,
  // Lenord 60/65 both first-run every unique slot well inside their count), so they stay
  // byte-identical. (NB: MB3D would drop the trailing slot the same way at MaxIt=2 — the
  // ref was clearly rendered with the full cycle; this restores the artist's intent.)
  const seenSlots = new Set<number>();
  let minCoverIters = 1;
  plan.order.map(stepSlot).forEach((o, i) => { if (!seenSlots.has(o)) { seenSlots.add(o); minCoverIters = i + 1; } });
  // Single-slot scenes expose the formula's options as editable sliders. Multi-slot
  // hybrids now also expose them when every slot's params fit GMT's shared uniform
  // budget: a cross-slot LaneAllocator threads a distinct uniform to each slot's
  // options, packing surplus scalars DENSELY into the otherwise-idle uVec2*/uVec4*
  // component lanes (24 scalar lanes total: paramA..F → uVec2* comps → uVec4* comps)
  // plus a 3-unit uVec3* pool kept for genuine vec3 params (rotations, X/Y/Z triples).
  // The old budget was 6 scalars + 3 vec3, so a 7-scalar hybrid baked despite 18 idle
  // vec lanes; now it packs them. 4D (Quaternion) hybrids reserve paramA/B for the
  // kernel's w-seeds (see has4D below), so they bake. If any slot can't bind or the
  // pool overflows, the whole scene falls back to baking literals.
  const has4D = usedIdx.some((idx) => addon.slots[idx].formulaIndex === 2);

  // A weave slot body: the MB3D transpiler shape, optionally extended with the
  // native dispatcher-slot emission pieces (ADR-0089 P4.1 — nativeResolver.ts).
  type SlotBody = TranspiledSlot & {
    call?: string; preCall?: string; postCall?: string; slotLoopInit?: string;
    /** Native slot's own DE preferences (P4.2) — applied when it leads the weave. */
    deMeta?: Record<string, number>;
    /** Native BANK defaults (ADR-0090) → preset.features.weave. */
    weaveState?: Record<string, any>;
  };

  const isNative = (idx: number) => addon.slots[idx]?.formulaIndex === NATIVE_FORMULA_INDEX;

  // NATIVE slots (formulaIndex -1, name = registered formula id): resolved via the
  // engine weave core's native resolver in BANK (fidelity) mode (ADR-0090) — each
  // slot binds its declared params VERBATIM onto its own per-slot bank (uWs<k>*),
  // so a native slot never shares the coreMath dense pool (that pool is now
  // MB3D-slots-only) and can NEVER overflow. Prefixed globals carry per-slot
  // state; z.w rides the shared orbit; c.w is isolated per slot (interlace
  // semantics). Bank params are always live — independent of has4D / MB3D budget.
  const nativeBody = (idx: number): SlotBody => {
    const slot = addon.slots[idx];
    const fnName = `${id}_slot${idx}`;
    const mkFlag = (tier: SlotFlag['tier'], note: string): SlotFlag =>
      ({ slotIndex: idx, formulaIndex: NATIVE_FORMULA_INDEX, name: slot.name || 'native', tier, note });
    const ndef = registry.get(slot.name ?? '');
    if (!ndef) return { glsl: '', fnName, tier: 'unsupported', flag: mkFlag('unsupported', `"${slot.name}" is not a registered formula.`) };
    const res = resolveNativeSlot(ndef, idx, fnName, { bank: idx });
    if (!res.ok) return { glsl: '', fnName, tier: 'unsupported', flag: mkFlag('unsupported', res.reason) };
    return {
      glsl: res.glsl, fnName, tier: 'native',
      flag: mkFlag('native', 'native GMT formula as a weave slot'),
      params: res.params as any, coreMath: res.coreMath, weaveState: res.weaveState, paramOk: true, writesDeriv: res.writesDeriv,
      call: res.call, preCall: res.preCall, postCall: res.postCall, slotLoopInit: res.loopInit,
      deMeta: res.deMeta,
    };
  };

  // MB3D slots pack the shared coreMath dense pool exactly as before — native
  // slots no longer consume it, so the budget/parametric decision is scoped to the
  // MB3D slots. A pure-MB3D weave reduces to the pre-banks path byte-for-byte
  // (mb3dActive === usedIdx). @invariant emit unchanged when no native slot present.
  const mb3dTx = (idx: number, o: Parameters<typeof transpileSlot>[3]): SlotBody =>
    transpileSlot(addon.slots[idx], idx, `${id}_slot${idx}`, { ...o, bake: opts?.slotBake?.[idx] });
  const mb3dActive = usedIdx.filter((idx) => !isNative(idx));
  const mb3dBody = new Map<number, SlotBody>();
  let mb3dParametric = false;
  if (mb3dActive.length === 1) {
    mb3dParametric = true;
    mb3dBody.set(mb3dActive[0], mb3dTx(mb3dActive[0], { parametric: true }));
  } else if (mb3dActive.length > 1) {
    let shared = false;
    if (!has4D) {
      // startSlot() before each slot keeps a vec uniform from being split across
      // two slots (which would collide on coreMath + emit duplicate vec params);
      // fits() is the 24-lane / 3-vec3 budget gate.
      const alloc = new LaneAllocator();
      const tryB = mb3dActive.map((idx) => { alloc.startSlot(); return mb3dTx(idx, { alloc }); });
      if (tryB.every((b) => b.paramOk !== false) && alloc.fits()) {
        mb3dParametric = true; shared = true;
        mb3dActive.forEach((idx, j) => mb3dBody.set(idx, tryB[j]));
      }
    }
    if (!shared) mb3dActive.forEach((idx) => mb3dBody.set(idx, mb3dTx(idx, {})));
  }

  const bodies = usedIdx.map((idx) => isNative(idx) ? nativeBody(idx) : mb3dBody.get(idx)!);
  const slotFlags = bodies.map((b) => b.flag);
  for (const b of bodies) if (b.tier === 'unsupported') reasons.push(`Slot ${b.flag.slotIndex} (${b.flag.name}): ${b.flag.note}`);

  if (reasons.length > 0) {
    // Best-effort fallback: a SINGLE external [CODE] slot with a GMT same-named
    // formula. We can't fuse it (these GMT formulas carry their own getDist), so
    // we load GMT's native formula at its defaults — explicitly flagged as NOT
    // MB3D's math. Multi-slot external hybrids stay unsupported (DE composition).
    // A modulo-arity failure must NOT fall into substitution — the slot itself may
    // be perfectly transpilable; the schedule request was the problem. Native slots
    // (formulaIndex -1) never substitute either: a name like "MengerSponge" would
    // false-match gmtSubId and silently load the wrong thing.
    if (usedIdx.length === 1 && !modulo && addon.slots[usedIdx[0]].formulaIndex >= 0) {
      const slot = addon.slots[usedIdx[0]];
      const subId = gmtSubId(slot?.name || '');
      const sub = subId ? registry.get(subId) : undefined;
      if (slot && sub?.defaultPreset) {
        const h = scene.header;
        const preset: any = JSON.parse(JSON.stringify(sub.defaultPreset));
        preset.name = scene.title || subId;
        preset.features = preset.features ?? {};
        preset.features.coreMath = { ...(preset.features.coreMath ?? {}), iterations: clampIter(h.iterations) };
        preset.features.geometry = {
          ...(preset.features.geometry ?? {}),
          juliaMode: h.isJulia,
          ...(h.isJulia ? { juliaX: h.jx, juliaY: h.jy, juliaZ: h.jz } : {}),
        };
        const note = `MB3D "${slot.name}" ships as compiled [CODE] — showing GMT's ${subId} at default parameters (NOT MB3D's formula or values).`;
        const flag = { slotIndex: usedIdx[0], formulaIndex: slot.formulaIndex, name: slot.name || `#${slot.formulaIndex}`, tier: 'code-sub' as const, note };
        return { def: null, ledger: { mode: plan.mode, supported: true, reasons: [], slotFlags: [flag] }, substitute: { formulaId: subId!, preset } };
      }
    }
    return { def: null, ledger: { mode: plan.mode, supported: false, reasons, slotFlags } };
  }
  seq++; // consume the id only on success

  // Per-iteration scratch (TIteration3D fields like VaryScale/Dfree, persisted
  // across iterations) — declared once in loopInit, threaded inout into every
  // slot fn + the dispatcher (assembleWeave derives the same union). mb3dVary
  // seeds to 1.0 ("set to 1 on start"), rest 0 — see scratchSeed below.
  const allScratch = [...new Set(bodies.flatMap((b) => b.scratchVars ?? []))];

  // DE slot + dIFS detection (used both for the mb3dRout recompute below and the
  // quality preset further down). Prefer a slot whose formula owns a real DE.
  const deCandidates = bodies.filter((b) => b.flag.tier === 'decompiled' && DECOMPILED_DE_META[b.flag.name]);
  const deOpt = (b: (typeof deCandidates)[number]) => DECOMPILED_DE_META[b.flag.name].deOption ?? -1;
  // Prefer the slot that OWNS the dIFS DE (deOption 20) over a transform that merely carries a
  // deOption ≥ 0 (e.g. PolyFold-symIFS = deOption 21). Picking the transform misroutes the scene
  // to estimator 2 (escape r/dr) instead of estimator 6 (orbit-trap dIFS) → black on a bounded
  // IFS orbit (Wada basin). Falls back to the first deOption ≥ 0, then the first candidate.
  const deSlot = deCandidates.find((b) => deOpt(b) === 20)
    ?? deCandidates.find((b) => deOpt(b) >= 0)
    ?? deCandidates[0];
  const deMeta = deSlot ? DECOMPILED_DE_META[deSlot.flag.name] : undefined;
  const isDifs = (deMeta?.deOption ?? -1) === 20
    && allScratch.includes('mb3dRout') && allScratch.includes('mb3dVary');

  // NO-ANALYTIC-DERIVATIVE detection → auto-route to the numerical estimator (7, ADR-0085).
  // When NO active slot updates the DE derivative (`writesDeriv`) and the scene isn't dIFS, the
  // analytic r/dr degenerates to raw r → blank. This is the no-ADE ESCAPE class MB3D routes to
  // CalcDEnoADE (PseudoXDB/Oxnot, IdesFormula/DsyneGrafix, Recycledrelatives). It is NARROWER
  // than MB3D's "any slot lacks a DE → numeric" (which over-routes — a box/Menger slot's dr
  // still works): we route ONLY when nothing supplies a usable dr, so analytically-fine scenes
  // keep the cheaper analytic estimator. est7 is reliable + GPU-certified now (was black); the
  // ADR-0085 "opt-in only, not statically detectable" stance is superseded FOR THIS SUBSET.
  const anySupported = bodies.some((b) => b.glsl);
  const noAnalyticDE = anySupported && !isDifs && !bodies.some((b) => b.writesDeriv);

  // mb3dRout = the MB3D Rout field (squared radius). In doHybridPasDE (the standard
  // hybrid DE) MB3D recomputes `Rout := x*x+y*y+z*z` after EVERY formula step, so a
  // transform slot that reads Rout (e.g. _SphereFolding1's `f0/Rout` sphere fold)
  // gets the live R². Without this it would read the loopInit 0.0 → divide-by-zero →
  // NaN → blank render. dIFS (doHybridIFS3D) is different: there mb3dRout is the
  // formula's surface-distance OUTPUT (never recomputed from z), so we must NOT
  // overwrite it for dIFS scenes.
  const recomputeRout = !isDifs && allScratch.includes('mb3dRout');

  // Schedule phase function: the baked counts LUT (default), or — Rhythm — the
  // layered runtime-uniform gate (uWeaveInterval<k>/uWeaveStartIter<k>/uWeaveBeats<k>,
  // declared shader-wide by the DDFS `weave` feature; live + keyframable, no
  // recompile). For modulo the dispatcher phases are positional (0 = base, k = layer
  // k), not the slot indices.
  const weave = modulo
    ? emitLayeredModuloGLSL(
        usedIdx.slice(1).map((_, j) => ({
          interval: `uWeaveInterval${j + 1}`,
          startIter: `uWeaveStartIter${j + 1}`,
          beats: `uWeaveBeats${j + 1}`,
        })), id)
    : emitWeaveGLSL(plan, id);
  // dIFS orbit-trap fold (estimator 6): fold mb3dRout/mb3dVary into the running min g_difsDE
  // ONLY right after a dIFS-OWNER slot (deOption 20) ran — never every iteration. A mixed
  // weave with a non-dIFS transform slot (e.g. Wada basin's PolyFold-symIFS, deOption 21,
  // which never writes mb3dRout) would otherwise fold the stale loopInit 0.0 into the min on
  // its iteration → g_difsDE collapses to 0 → DE≈0 → black. Gating per-slot here means the
  // fold only sees the surface distance the dIFS slot just wrote. (all-dIFS scenes like
  // `material colors` fold every iteration as before → unchanged.)
  const difsFold = isDifs ? ` g_difsDE = min(g_difsDE, mb3dRout / max(abs(mb3dVary), 1e-9));` : '';
  // Tier-gated: DECOMPILED_DE_META is keyed by MB3D [CODE] names — a NATIVE slot
  // whose formula shares a name must never inherit the dIFS fold.
  const slotIsDifs = (k: number) => bodies[k].flag.tier === 'decompiled'
    && (DECOMPILED_DE_META[bodies[k].flag.name]?.deOption ?? -1) === 20;

  // Renderable scaffolding — a NEUTRAL preset, not an AmazingBox clone. Cloning
  // AmazingBox dragged in box-specific overrides (tight teal fog, Z-depth coloring
  // tuned to box geometry, Chebyshev/Linear quality, an off-axis camera, intensity-50
  // lights) — exactly why imported bulbs/IFS looked wrong. DDFS backfills every
  // omitted feature param from its neutral default, so a minimal literal renders
  // cleanly; `lights` is omitted on purpose to inherit DEFAULT_LIGHTS (a 3-point rig).
  // Camera: the imported MB3D scene pose (zoom / wRot / fovY / mid → GMT Orbit),
  // with a centered fallback for degenerate headers — see mapCamera.ts +
  // plans/mb3d/camera-import-spec.md.
  const h = scene.header;
  const cam = mapMB3DCamera(h); // imported MB3D scene pose (degenerate → centered default)
  // Imported lights (L1). Empty for a standalone/degenerate header → omit `lighting` so the
  // preset inherits DEFAULT_LIGHTS. Replacing the default 3-point rig with the scene's actual
  // lights fixes the universal neutral-grey look (and the Hyperben2 over-lit washout).
  const lit = mapMB3DLighting(h, cam);
  const preset: any = {
    formula: id,
    name: scene.title || 'MB3D Hybrid',
    features: {
      // Glow OFF. MB3D has no equivalent glow; the importer used to add one
      // (glowIntensity 0.01) as an aesthetic lift when every scene was flat grey, but
      // glow = Σ exp(-sharpness·DE) along the ray accumulates into a white HAZE on
      // deep-zoom scenes (Hyperben2 at zoom 8.89 washed out entirely). Now that the
      // scene's real lights are imported (L1), the surface reads correctly without it.
      // GMT's atmosphere default is already glow-off; we set 0 explicitly to be safe.
      // Imported MB3D depth-cue / dynamic fog merges in (lit.atmosphere) — fades distant
      // surfaces toward DepthCol2/DynFog and fills the black background with the scene's
      // fog colour (TimeMachine's blue sky, Genetic Menger's green). Absent ⇒ no fog.
      atmosphere: { glowIntensity: 0, ...(lit.atmosphere ?? {}) },
      optics: { camFov: cam.fov },         // MB3D fovY (degrees)
      ...(lit.lights.length > 0 ? { lighting: { lights: lit.lights } } : {}),
      ...(lit.material ? { materials: lit.material } : {}),
      ...(lit.coloring ? { coloring: lit.coloring } : {}),
    },
    cameraPos: cam.cameraPos,    // absorbed into sceneOffset on load (so sceneOffset stays zeroed)
    cameraRot: cam.cameraRot,
    sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
    targetDistance: cam.targetDistance,
    cameraMode: 'Orbit',
  };
  preset.features.coreMath = {
    ...(preset.features.coreMath ?? {}),
    // imported MB3D slider defaults — aggregated across the MB3D slots when they
    // share the dense pool (native slots live on their own banks, below).
    ...(mb3dParametric ? Object.assign({}, ...mb3dActive.map((idx) => mb3dBody.get(idx)?.coreMath ?? {})) : {}),
    iterations: Math.max(clampIter(h.iterations), minCoverIters),
  };
  // Native BANK defaults (ADR-0090) → preset.features.weave. Empty for a pure-MB3D
  // weave (no native slots ⇒ features.weave stays absent ⇒ byte-identical probe).
  const weaveDefaults = Object.assign({}, ...bodies.map((b) => b.weaveState ?? {}));
  if (Object.keys(weaveDefaults).length > 0) {
    preset.features.weave = { ...(preset.features.weave ?? {}), ...weaveDefaults };
  }
  preset.features.geometry = {
    ...(preset.features.geometry ?? {}),
    juliaMode: h.isJulia,
    ...(h.isJulia ? { juliaX: h.jx, juliaY: h.jy, juliaZ: h.jz } : {}),
  };

  // 4D formulas (#2 Quaternion) iterate z.w / c.w, which the kernel seeds from
  // uParamB (z.w start) and uParamA (c.w julia constant) — NOT from the formula
  // body. Without this they inherit the cloned scaffold's garbage paramA/B and
  // the 4th dimension degenerates (the scene renders blank). Bake the right seeds.
  // (has4D also gates multi-slot parametric off, above, so these aren't clobbered.)
  if (has4D) {
    preset.features.coreMath.paramA = h.isJulia ? h.jw : 0; // c.w = julia W
    preset.features.coreMath.paramB = 0; // z.w start (slice w = 0)
  }

  // 4D-COORDINATE dIFS/KIFS formulas (DEoption 5/6 — Sierpinski4ex / MixPinski4 / Menger4 /
  // Octahedron4 / HalfOct4*) iterate z.w as the 4th spatial coordinate (slotTranspiler's
  // wIsCoord path) and carry the real derivative in mb3dDr1. Seed z.w (uParamB) to the
  // w-slice — 0 for a plain scene, the julia W for a 4D Julia — so the fold starts on the
  // right slice instead of the scaffold's garbage uParamB. (Distinct from #2 Quaternion's
  // has4D above, which also reserves paramA for c.w; these read c via baked Cm consts.)
  const has4DCoord = bodies.some((b) => {
    const d = DECOMPILED_DE_META[b.flag.name];
    return !!d && (d.deOption === 5 || d.deOption === 6);
  });
  if (has4DCoord && !has4D) {
    preset.features.coreMath.paramB = h.isJulia ? h.jw : 0; // z.w start (4th-coord slice)
  }

  // Decompiled [CODE] formulas carry their own DE (.m3f DEscale/DEoption/RStop);
  // apply it so they render with the right estimator/step/bailout, not the clone's.
  // The DE belongs to the base FRACTAL slot — a transform/inversion slot has
  // DEoption -1 (no DE of its own). Taking the FIRST decompiled slot blindly gave
  // a transform's "estimator 0 / analytic" when slot 0 was a transform, garbling
  // hybrids whose fractal sits behind transforms (Hal-Tenny, BatJorge). Prefer a
  // slot whose formula owns a real DE (DEoption >= 0).
  // dIFS (DEoption 20): MB3D's orbit-trap IFS distance — the chosen DE slot's
  // decompiled body writes a per-iteration surface distance (mb3dRout) and
  // accumulates an absolute scale (mb3dVary); we thread the running minimum of
  // their ratio into g_difsDE for estimator 6 (see the dIFS wiring below).
  // deSlot / deMeta / isDifs are computed above (before the dispatcher).
  if (deSlot) {
    preset.features.quality = { ...(preset.features.quality ?? {}), ...mapDEMeta(DECOMPILED_DE_META[deSlot.flag.name]) };
  } else {
    // Intern formulas (#0..#4) aren't in DECOMPILED_DE_META, so the decompiled-DE
    // path above never fires for them — they'd inherit the scaffold's analytic
    // estimator 0. That's right for the latitude bulbs / Quaternion / Tricorn,
    // but Amazing Box (#4) is a linear box-fold and needs estimator 1, or it
    // renders dark/mushy and rays miss at distance (ABoxScale*Start went "black").
    // Match native GMT AmazingBox (estimator 1, fudge ~0.45). Applies to a box in
    // the weave (single-slot box scenes or box-led hybrids).
    const boxSlot = bodies.find((b) => b.flag.tier === 'intern' && b.flag.formulaIndex === 4);
    if (boxSlot) {
      // Intern Amazing Box (#4) isn't in DECOMPILED_DE_META, so it keeps this separate
      // empirically-calibrated path: estimator 1 + fudge 0.45, intentionally matching
      // native GMT's AmazingBox (est 0 rendered it black). The decompiled-DE path now
      // routes box folds to estimator 2 (r/dr, source-correct) — but est 1 (r-1)/dr and
      // est 2 (r/dr) are visually IDENTICAL on box geometry (verified S1 item 1b on
      // ABoxScale2/3, InAndOutside, Surreal shell), so this divergence is immaterial and
      // we leave the certified est-1 path untouched rather than risk a calibrated value.
      // distanceMetric 0 = Euclidean to match MB3D (`r := Sqrt(Rout)`, no metric option;
      // ADR-0088). est 1 + fudge 0.45 kept (the certified empirical intern-box calibration).
      preset.features.quality = { ...(preset.features.quality ?? {}), estimator: 1.0, fudgeFactor: 0.45, distanceMetric: 0.0 };
    } else {
      // NATIVE DE lead (P4.2): no decompiled DE meta and no intern box in the weave —
      // adopt the first native slot's own tuned quality subset (its preset's
      // estimator/fudge/metric/bailout/detail, generic estimators only; see
      // nativeResolver deMeta). MB3D-only scenes never reach here with a hit
      // (no native slots ⇒ no deMeta ⇒ unchanged), keeping the certified corpus
      // byte-identical.
      const nativeLead = bodies.find((b) => b.deMeta);
      if (nativeLead) {
        preset.features.quality = { ...(preset.features.quality ?? {}), ...nativeLead.deMeta };
      }
    }
  }

  // NO-ANALYTIC-DERIVATIVE AUTO-ROUTE (estimator 7, ADR-0085). When nothing in the weave
  // supplies a usable dr (noAnalyticDE, computed above), the analytic path renders blank —
  // so route to the numerical finite-difference estimator with the certified recipe:
  //   estimator 7 + numDEeps 0.3 (magnitude) + numDESmooth 2.5 (deep-region flicker) + the
  //   mb3dFaithful marcher (set below in the sceneQuality block). Detail is capped to 1.5 there
  //   (the numeric DE is rougher — a fine authored threshold makes rays miss). @see docs/adr/0085.
  if (noAnalyticDE) {
    preset.features.quality = {
      ...(preset.features.quality ?? {}),
      estimator: 7.0, numDEeps: 0.3, numDESmooth: 2.5,
      // mb3dFaithful + detail are (re)asserted in the sceneQuality block below when the header
      // carries DE tuning; set them here too so a scene with no authored DEstop/RStop still gets
      // the full est7 recipe (the faithful marcher damps the over-estimating numeric DE; the
      // rougher DE needs a looser hit threshold than analytic → detail ≤ 1.5).
      mb3dFaithful: true, detail: 1.5,
    };
  }

  // Imported formulas (esp. deep IFS / Menger at high iteration counts) frequently
  // need a deeper ray-march budget than the cloned scaffold's 300 to render fully —
  // rays otherwise give up before reaching the surface and the shape looks cut off
  // or sparse (Theli-At MengerSpheres / Hyperben2 were truncated at 500). 1500 is a
  // balance; the user can trim via the Max Ray Steps slider (max 2000).
  // Base budget 1500; the fudge block below RAISES it for finer authored steps (1d).
  preset.features.quality = { ...(preset.features.quality ?? {}), maxSteps: 1500 };

  // FAITHFUL to the authored scene: override the formula-default DE meta with the
  // artist's own render settings from the .m3p header (mapDEMeta only knew the
  // formula's generic defaults — too conservative, and blind to what the scene set).
  //  - RStop → deBailout: MB3D's runtime r²-space bailout is `Sqr(RStop_header)`
  //    (HeaderTrafos.pas:558, `dRstop := Sqr(RStop)`); the header RStop is the LINEAR
  //    escape radius. GMT's uDeBailout is r²-space too (de.ts:65), so deBailout = RStop².
  //    (mapDEMeta already squares the formula-default RStop the same way.)
  //  - DEstop → Ray detail (uDetail): MB3D's hit offset ≈ `DEstop·0.15·pixelScale`
  //    (Calc.pas:794); GMT's is `pixelThreshold/uDetail·pixelScale`, so a smaller
  //    DEstop maps to a finer GMT epsilon. The default uDetail (1.0) is too coarse
  //    for far/fine detail (Theli's background Menger half-spheres never resolved);
  //    this ties it to what the artist authored. K_DETAIL/cap calibrated to the refs.
  //  - ZstepDiv → fudge: the march step size the artist chose, replacing the
  //    formula's over-conservative DEscale that was saturating the ray-step budget.
  const h2 = scene.header;
  if (h2.deStop > 0 || h2.rStop > 0) {
    const q: any = preset.features.quality ?? {};
    const sceneQuality: Record<string, number> = {};
    // RStop → deBailout = RStop² (MB3D's orbit escapes `Rout > RStop` where the runtime
    // RStop = `dRstop := Sqr(RStop_header)`, HeaderTrafos.pas:558 + formulas.pas:3471).
    // For RStop=1024 that is ~1.05e6. The OLD `Math.min(1000, …)` clamp was a BUG: it
    // assumed bailing at 1000 ≈ running the full orbit, true ONLY for fast-escaping
    // formulas. FOLD formulas (box/IFS) whose orbit oscillates back need the full rStop²
    // bailout or the structure escapes prematurely → blank (Recycledrelatives' "Fractal
    // Fan" only appears at deBailout ≈ rStop², user-verified). Clamp now to the raised
    // slider ceiling (1e7), not 1000. dIFS (estimator 6) is EXEMPT (bounded orbit-trap,
    // never radius-escapes — mapDEMeta keeps its own bailout). @see ADR-0088.
    if (h2.rStop > 0 && !isDifs) sceneQuality.deBailout = Math.min(1.0e7, Math.max(16, h2.rStop * h2.rStop));
    // DEstop → Ray detail (uDetail). uDetail ∝ 1/DEstop (MB3D hit offset ≈ DEstop·0.15,
    // Calc.pas:794), capped at 6 for sane perf. The 3.3 numerator is a ref-CALIBRATED fit
    // (MB3D's hit threshold is world-absolute, GMT's is screen-relative — different spaces,
    // no closed form), not source-derived. S1 item 1e (re-anchor to 1.0/DEstop): DECLINED.
    // Theli's missing background Menger half-spheres were NOT a detail problem — a sweep
    // over detail ∈ {4.1,8,10} left them unchanged; they're grazing high-variance far
    // surfaces that resolve purely with accumulation samples, not a finer hit ε. Lowering
    // the anchor to 1.0 (→ Theli detail 1.25) would only coarsen the resolved structure.
    if (h2.deStop > 0) sceneQuality.detail = Math.min(6, Math.max(1, 3.3 / Math.max(0.1, h2.deStop)));
    // est7 (no-ADE) is a rougher estimator — a fine authored threshold makes rays miss the
    // noisy deep-region surface. Cap detail at 1.5 (the certified recipe); the user can raise it.
    if (noAnalyticDE) sceneQuality.detail = Math.min(sceneQuality.detail ?? 1.5, 1.5);
    // Step size: honour the artist's authored ZstepDiv. MB3D's march advances
    // `dTmp * sZstepDiv` (Calc.pas:1878) — exactly GMT's `d += DE * uFudgeFactor`
    // (trace.ts:213), a 1:1 mapping. The old code ignored the authored value and
    // floored 0.5/ceiled 0.7. Floor at 0.3: MB3D affords a finer march because it
    // binary-searches the surface after crossing DEstop (bStepsafterDEStop); GMT
    // marches to the threshold directly, so a tiny ZstepDiv (Ellarien/Theli 0.05-0.1)
    // would blow the step budget. Fall back to the formula DEscale if ZstepDiv is unset.
    const authoredFudge = h2.zStepDiv > 0 ? h2.zStepDiv : ((q.fudgeFactor as number) || 0.5);
    // Floor raised 0.3 → 0.4 (2026-06-28, round-2 A1). At the old 0.3 floor + the 2000
    // maxSteps cap, the densest IFS/Menger scenes (Theli, TimeMachine) took steps too tiny
    // to cross the whole volume in the budget → the back of the model was cut off. A coarser
    // 0.4 step crosses it, and the overstepTolerance recovery below snaps back onto any thin
    // detail the bigger step would otherwise tunnel through — net: full volume, no lost detail.
    sceneQuality.fudgeFactor = Math.min(1.0, Math.max(0.4, authoredFudge));
    // MB3D-FAITHFUL MARCHER (ADR-0088). Render imports with MB3D's ACTUAL march
    // convergence dynamics — the overstep clamp + RSFmul damper + msDEsub safety-
    // subtraction from the live marcher (CalcThread.pas:196-230) — instead of GMT's
    // plain sphere step. Those three are what stop an over-estimating / discontinuous
    // fused DE from scattering thin surfaces into "dust". MB3D's absolute step
    // constants are stepWidth-NORMALIZED (don't translate to GMT world units), so the
    // port reuses GMT's world-unit hit threshold (finalEps ≈ MB3D msDEstop) + step
    // floor and carries only the two dimensionless authored params, both from header
    // fields parseMB3D already reads (no new parse): sZstepDiv and msDEsub.
    let mb3dSZ = Math.max(0.0001, h2.zStepDiv > 0 ? h2.zStepDiv : 0.5);
    let mb3dDEsub = 0;
    // iOptions bit 2 (StepSubDEstop) → msDEsub + sZstepDiv quadratic remap (HeaderTrafos.pas:961-964).
    if ((h2.iOptions & 4) !== 0) {
      mb3dSZ = mb3dSZ * mb3dSZ + 1.2 * mb3dSZ * (1 - mb3dSZ);
      mb3dDEsub = Math.min(0.9, Math.sqrt(mb3dSZ));
    }
    sceneQuality.mb3dStepDiv = Math.min(1.0, Math.max(0.01, mb3dSZ));
    sceneQuality.mb3dDEsub = mb3dDEsub;
    // With the faithful step's clamp+damper preventing overshoot, GMT's own closest-miss
    // recovery band-aid (uOverstepTolerance, the round-2 Theli fix for the plain step) is
    // redundant — turn it off so the two recovery mechanisms don't compound.
    sceneQuality.overstepTolerance = 0;
    // Couple the march budget to the step size: a finer authored step (fudge < 0.5) needs a
    // deeper march to cross the volume, else the image renders incomplete (cut-off / sparse —
    // the S1 1c regression). Scale maxSteps inversely with fudge but NEVER below the 1500 base,
    // so fudge ≥ 0.5 scenes are byte-identical — purely additive budget for the fine-step scenes.
    sceneQuality.maxSteps = Math.min(2000, Math.max(1500, Math.round(750 / sceneQuality.fudgeFactor)));
    // NB: we deliberately do NOT auto-map bStepsafterDEStop (@134) → quality.refineSteps.
    // Surface refinement (ADR-0084) is a NATIVE, opt-in quality control (default 0). A
    // canary bench (2026-06-27) showed it does NOT resolve the DsyneGrafix-class "dust"
    // it was meant for: an exhaustive fine march (fudge 0.05 / 5000 steps) is STILL
    // fragmented, so the dust is a DE-FIDELITY gap (the fused weave produces a fragmented
    // iso-surface), not an overshoot a single-step ray refinement can fix. Auto-enabling
    // it would add ~0.5–2s compile to every import for no benefit on the target scenes,
    // so we leave it off and let the user dial it in the Quality panel for any
    // coherent-but-overshooting formula. @see docs/adr/0084.
    preset.features.quality = { ...q, ...sceneQuality, mb3dFaithful: true };
  }

  // dIFS DE wiring (estimator 6): declare a file-scope g_difsDE global (preamble),
  // reset it per map()/mapDist() call (loopInit), and after each fused-formula step
  // fold the active IFS slot's surface distance / accumulated scale into the running
  // minimum (loopBody). estimator 6's getDist returns g_difsDE. mb3dRout/mb3dVary are
  // already threaded as inout scratch — see isDifs guard (both present in allScratch).
  // Mirrors MB3D doHybridIFS3D: min over orbit of Rout/VaryScale, init 65535 / 1.0.
  const difsPreamble = isDifs ? 'float g_difsDE;\n' : '';
  const difsInit = isDifs ? 'g_difsDE = 65535.0;\n' : '';
  // (the fold is emitted per-dIFS-slot inside the dispatcher — see difsFold above.)

  // Assemble the kernel GLSL through the engine weave core (dispatcher + scratch
  // threading + loopInit/loopBody). The mb3dRot() helper goes in the prelude — it is
  // emitted ONCE when any slot's parametric body needs it; inlining it per slot would
  // redefine the function (2+ rotation slots → fail).
  const assembled = assembleWeave({
    id,
    schedule: weave,
    slots: usedIdx.map((idx, k) => ({
      phase: modulo ? k : idx,
      fnName: `${id}_slot${idx}`,
      glsl: bodies[k].glsl!,
      scratchVars: bodies[k].scratchVars,
      // Native slots carry their own branch pieces (slot-local c + rotation swap +
      // rewritten call + hoisted loopInit); MB3D slots leave them undefined.
      preCall: bodies[k].preCall,
      call: bodies[k].call,
      loopInit: bodies[k].slotLoopInit,
      postCall: slotIsDifs(k) ? difsFold : bodies[k].postCall,
    })),
    prelude: bodies.some((b) => b.needsRotHelper) ? MB3D_ROT_GLSL : '',
    preDispatch: recomputeRout ? '  mb3dRout = dot(z.xyz, z.xyz);\n' : '',
    // mb3dVary (dIFS absScale) + mb3dDr1 (4D-with-DE derivative, MB3D Deriv1) both seed
    // to 1.0 ("set to 1 on start" / Calc.pas:2732 `Deriv1 := 1`); the rest to 0.
    scratchSeed: (s) => (s === 'mb3dVary' || s === 'mb3dDr1' ? '1.0' : '0.0'),
    extraLoopInit: difsInit,
    // mb3dIter = MB3D's ItResultI (the integer iteration count, `fild [esi-0x18]`),
    // NOT persistent scratch — it's the current loop index, so refresh it to float(i)
    // each iteration before the slot reads it (the MB3D OTrap-on-iterations colour idiom).
    loopBodyPrefix: allScratch.includes('mb3dIter') ? 'mb3dIter = float(i); ' : '',
  });

  // Slider schema + `group` (Formula-panel divider header AND per-slot modulation
  // category). Native BANK params (feature:'weave', ADR-0090) are ALWAYS exposed;
  // MB3D params only when they share the dense pool (mb3dParametric).
  //  - NATIVE slots: "Formula <n>: <name>" (n = 1-based slot position) — the slot
  //    number keeps same-name slots distinct (Formula 1: Phoenix / Formula 2:
  //    Phoenix) AND gives a single native slot a named group, so its bank params
  //    resolve a named modulation category (not a "Weave" fallback).
  //  - MB3D slots: the bare formula name, "(2)"-disambiguated for same-name slots —
  //    imported scenes keep their existing divider labels. A lone MB3D slot carries
  //    no group (no redundant divider on a plain import).
  // The Formula panel suppresses the divider when only one group is present, so a
  // single-formula weave stays clean.
  const seenGroup = new Map<string, number>();
  const parameters = bodies.flatMap((b, k) => {
    const exposed = isNative(usedIdx[k]) || mb3dParametric;
    if (!exposed) return [];
    const base = b.flag.name.replace(/^_/, '');
    let group: string | undefined;
    if (isNative(usedIdx[k])) {
      group = `Formula ${k + 1}: ${base}`;
    } else if (usedIdx.length > 1) {
      const n = (seenGroup.get(base) ?? 0) + 1;
      seenGroup.set(base, n);
      group = n > 1 ? `${base} (${n})` : base;
    }
    return (b.params ?? []).map((pp: any) => (group ? { ...pp, group } : pp));
  }) as any;

  const def: FractalDefinition = {
    id: id as any,
    name: scene.title || 'MB3D Hybrid',
    shortDescription: `Imported Mandelbulb3D hybrid (${usedIdx.length} formula${usedIdx.length === 1 ? '' : 's'}).`,
    description: `A fused Mandelbulb3D hybrid weave (${slotFlags.map((s) => s.name).join(' → ')}).`,
    juliaType: 'offset',
    shader: {
      function: assembled.functionGLSL,
      preamble: difsPreamble || undefined,
      supportsDifs: isDifs || undefined,
      loopBody: assembled.loopBody,
      loopInit: assembled.loopInit,
      capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    } as any,
    parameters,
    defaultPreset: preset,
  };

  return { def, ledger: { mode: plan.mode, supported: true, reasons: [], slotFlags } };
}
