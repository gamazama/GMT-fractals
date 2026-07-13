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
import { emitLayeredModuloGLSL, buildBlockPlan } from '../../engine/weave/schedule';
import { resolveNativeSlot, NATIVE_FORMULA_INDEX } from '../../engine/weave/nativeResolver';
import { transpileSlot } from './slotTranspiler';
import type { SlotFlag, TranspiledSlot } from './slotTranspiler';
import { mapDEMeta, DERIVED_ROT_BANKS } from './constPacker';
import type { DerivedRotationSpec } from '../../types/fractal';
import { weaveBankKey } from '../uniformSlots';
import { mapMB3DCamera } from './mapCamera';
import { mapMB3DLighting } from './mapLighting';
import { DECOMPILED_DE_META, MB3D_DE_QUALITY_OVERRIDES } from './mb3dFormulaLibrary';
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
  schedule?: { kind: 'modulo'; baseRow?: number };
  /** LOOP DIVIDERS (P4.7): counts-schedule block boundaries — the block ending
   *  at `afterRow` plays `repeat` times as intro, the tail loops (buildBlockPlan).
   *  When present (and not modulo) they REPLACE the addon's repeatFrom nibble.
   *  Absent = the buildWeaveSequence counts path, byte-identical to the pre-P4.7
   *  emit (MB3D imports never set them). @invariant editor-only channel. */
  dividers?: Array<{ afterRow: number; repeat: number }>;
  /** Per-slot, per-OPTION expose/bake directives (P3b Task 2), indexed by the
   *  addon slot index then the option index: true = bake that option's value as
   *  a literal (frees its uniform lanes). Absent = auto-expose (unchanged). */
  slotBake?: Array<boolean[] | undefined>;
  /** OPT-IN whole-weave master gate (ADR-0089 P4.4 `weaveEnabled`): the phase
   *  function reads `uWeaveEnabled` (DDFS `weave` feature — live, keyframable);
   *  OFF = base slot only, weave dormant (legacy `interlaceEnabled` semantics).
   *  Editor builds + migrated legacy scenes request it; plain MB3D scene imports
   *  don't. @invariant opts absent = no gate emitted, byte-identical to the
   *  pre-gate emit (probe: debug/probe-weave-refactor.mts). */
  enableGate?: boolean;
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

  // Counts plan (default): the addon's repeatFrom cursor walk. LOOP DIVIDERS
  // (P4.7, editor-only) override it — buildBlockPlan expands the block structure
  // into the same {order, introLen, cycleLen} the LUT emitter already consumes.
  const baseSeq = buildWeaveSequence(addon);
  const plan = (opts?.dividers?.length && opts.schedule?.kind !== 'modulo')
    ? { mode: baseSeq.mode, ...buildBlockPlan({ iterCounts: addon.slots.map((s) => s.iterCount ?? 0), dividers: opts.dividers }) }
    : baseSeq;
  const reasons: string[] = [];
  if (plan.mode !== 0) reasons.push(`Weave mode ${plan.mode} (interpolate / CSG / KIFS) isn't supported yet — only mode 0 (alternate).`);
  if (plan.hasSilent) reasons.push('Scene uses negative-iterCount "silent" slots — not supported yet.');

  const id = `MB3DHybrid${seq}`;
  const usedIdx = [...new Set(plan.order.map(stepSlot))].sort((a, b) => a - b);
  // Rhythm (layered modulo) schedule needs 2+ active slots to mean anything — a
  // SINGLE active slot DEGRADES to the plain counts path (the base just runs, so
  // building one formula in "Live" yields that formula, not an error). Upper
  // bound stays 6 — base + 5 layers (the DDFS weave feature declares 5 layer
  // uniform sets); the Weave Editor only requests that range, belt-and-braces.
  const modulo = opts?.schedule?.kind === 'modulo' && usedIdx.length >= 2;
  if (opts?.schedule?.kind === 'modulo' && usedIdx.length > 6) {
    reasons.push(`Live (modulo) scheduling needs 2 to 6 active formula slots — this weave has ${usedIdx.length}.`);
  }
  // Rhythm base (spec §7): an explicit tail slot (schedule.baseRow) if given + valid,
  // else usedIdx[0] (first active slot — byte-identical to the pre-base emit). Layers =
  // the remaining used slots in row order; layer j reads uWeave*{j+1}, phase j+1.
  const baseSlot = modulo && opts?.schedule?.baseRow !== undefined && usedIdx.includes(opts.schedule.baseRow)
    ? opts.schedule.baseRow : usedIdx[0];
  const moduloLayerSlots = usedIdx.filter((idx) => idx !== baseSlot);
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
  // Every slot exposes its options as editable sliders: a lone standalone MB3D slot on
  // the shared coreMath pool (paramA..F → uVec2* comps → uVec4* comps + a 3-unit uVec3*
  // pool), a woven slot on its own private bank (mb3dBankBody, below). Quaternion (#2)
  // reserves the kernel's 4D w-seeds on coreMath paramA/paramB — physically disjoint
  // from a slot's own bank, so a woven Quaternion still exposes its options live.
  const has4D = usedIdx.some((idx) => addon.slots[idx].formulaIndex === 2);

  // A weave slot body: the MB3D transpiler shape, optionally extended with the
  // native dispatcher-slot emission pieces (ADR-0089 P4.1 — nativeResolver.ts).
  type SlotBody = TranspiledSlot & {
    call?: string; preCall?: string; postCall?: string; slotLoopInit?: string;
    /** Native slot's own DE preferences (P4.2) — applied when it leads the weave. */
    deMeta?: Record<string, number>;
    /** Native BANK defaults (ADR-0090) → preset.features.weave. */
    weaveState?: Record<string, any>;
    /** Native slot's rewritten custom getDist body (P4.4) — spliced onto the
     *  fused def when this slot LEADS the weave (slot 0, interlace-host
     *  semantics). */
    getDist?: string;
    /** Native slot's formula supports cutting-plane DE (writes the engine-owned
     *  cp_* accumulators — UNPREFIXED by the rewriter, shared across slots).
     *  Unioned onto the fused def so core_math declares CP_PREAMBLE. */
    supportsCP?: boolean;
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
      deMeta: res.deMeta, getDist: res.getDist,
      supportsCP: !!ndef.shader.capabilities?.has('estimator:cutting-plane'),
    };
  };

  // MB3D slots (ADR-0090, extended from native slots 2026-07-11): a WEAVE (2+ active
  // slots) binds every MB3D slot onto its OWN per-slot BANK (uWs<idx>*) — the exact
  // treatment native slots already get. Each slot transpiles parametrically against a
  // PRIVATE allocator, then mb3dBankBody remaps its coreMath-lane reads onto bank <idx>
  // (uParamA → uWs<idx>ParamA) and routes its params through the `weave` feature. A slot
  // can never overflow (its own 24 lanes) nor drop the WHOLE weave's params (a slot that
  // can't bind bakes only ITS OWN literals). A single active MB3D slot is a plain
  // STANDALONE formula and keeps its params on the shared coreMath pool (byte-identical
  // to the pre-banks single-slot emit + the standalone formula library). RETIRED: the
  // shared cross-slot LaneAllocator dense pack — which overflowed → baked ALL params
  // ("none"), and needed mergeDenseLanes to follow slots on a reorder.
  // @see docs/adr/0090-weave-slot-banks.md
  const mb3dTx = (idx: number, o: Parameters<typeof transpileSlot>[3]): SlotBody =>
    transpileSlot(addon.slots[idx], idx, `${id}_slot${idx}`, { ...o, bake: opts?.slotBake?.[idx] });
  // Def-global derived-rotation cursor: each slot binds against a PRIVATE allocator
  // (its uMb3dRotM*/RotSC*/Rot4D* indices restart at 0), so a woven def renumbers
  // them onto one global sequence here before fusing.
  const derivedCounts: Record<string, number> = {};
  const mb3dBankBody = (idx: number): SlotBody => {
    const t = mb3dTx(idx, { parametric: true });
    // Unsupported / no-param (its own literals already baked) slots pass through unbanked.
    if (!t.glsl || t.tier === 'unsupported' || !t.params?.length) return t;
    // Rebind the shared-pool reads onto bank <idx> (uParamA → uWs<idx>ParamA), move the
    // lane defaults into the bank state, and re-key params to the `weave` feature — the
    // same shape buildBankBindings gives native slots, so mergeWeaveBanks carries MB3D
    // bank values across a reorder identically.
    let glsl = t.glsl.replace(/\bu(Param[A-F]|Vec[234][ABC])\b/g, `uWs${idx}$1`);
    const weaveState: Record<string, any> = {};
    for (const [k, v] of Object.entries(t.coreMath ?? {})) weaveState[weaveBankKey(idx, k)] = v;
    const params = (t.params ?? []).map((p: any) => ({ ...p, id: weaveBankKey(idx, p.id), feature: 'weave' }));
    // Renumber this slot's derived-rotation uniforms onto the def-global sequence
    // and re-point their SOURCES at the bank lanes the rebind above just moved the
    // body's reads onto. Def-global bank exhaustion (a 7th mat3 across slots…)
    // re-transpiles the slot BAKED — its own literals only, same philosophy as a
    // failed bind, never drags the rest of the weave down.
    let derived: DerivedRotationSpec[] | undefined;
    if (t.derivedRotations?.length) {
      const need: Record<string, number> = {};
      for (const s of t.derivedRotations) need[s.convert] = (need[s.convert] ?? 0) + 1;
      const fits = Object.entries(need).every(([k, n]) =>
        (derivedCounts[k] ?? 0) + n <= DERIVED_ROT_BANKS[k as DerivedRotationSpec['convert']].cap);
      if (!fits) return mb3dTx(idx, {});
      const remap: Record<string, string> = {};
      derived = t.derivedRotations.map((spec) => {
        const n = derivedCounts[spec.convert] ?? 0;
        derivedCounts[spec.convert] = n + 1;
        const renamed = `${DERIVED_ROT_BANKS[spec.convert].prefix}${n}`;
        remap[spec.uniform] = renamed;
        return {
          ...spec,
          uniform: renamed,
          sources: spec.sources.map((s) => s.replace(/^u(Param[A-F]|Vec[234][ABC])\b/, `uWs${idx}$1`)),
        };
      });
      // Single pass (simultaneous) — sequential replaces could cascade when an
      // old name equals another spec's new name (M0→M1 then M1→M2 hits both).
      glsl = glsl.replace(/\buMb3dRot(?:M|SC|4D)\d\b/g, (m) => remap[m] ?? m);
    }
    return { ...t, glsl, params: params as any, coreMath: {}, weaveState, derivedRotations: derived };
  };
  const mb3dActive = usedIdx.filter((idx) => !isNative(idx));
  const woven = usedIdx.length >= 2;
  const mb3dBody = new Map<number, SlotBody>();
  // coreMath dense exposure survives ONLY for a lone standalone MB3D slot.
  let mb3dParametric = false;
  if (!woven && mb3dActive.length === 1) {
    mb3dParametric = true;
    mb3dBody.set(mb3dActive[0], mb3dTx(mb3dActive[0], { parametric: true }));
  } else {
    for (const idx of mb3dActive) mb3dBody.set(idx, mb3dBankBody(idx));
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
  // ANALYTIC-over-dIFS (owner report 2026-07-05): dIFS (deOption 20, orbit-trap) is
  // right for a PURE IFS weave, but when the weave ALSO carries a power / analytic
  // slot (one that writes the derivative dr), the analytic DE is the correct choice
  // — the IFS slot must NOT force dIFS. Scoped to EDITOR builds + migrated scenes
  // (opts.enableGate): plain MB3D scene imports never set it, so their DE routing —
  // and the certified corpus emit — is byte-identical.
  const preferAnalytic = !!opts?.enableGate && bodies.some((b) => b.writesDeriv);
  // Prefer the slot that OWNS the dIFS DE (deOption 20) over a transform that merely carries a
  // deOption ≥ 0 (e.g. PolyFold-symIFS = deOption 21). Picking the transform misroutes the scene
  // to estimator 2 (escape r/dr) instead of estimator 6 (orbit-trap dIFS) → black on a bounded
  // IFS orbit (Wada basin). Falls back to the first deOption ≥ 0, then the first candidate.
  // With preferAnalytic, the dIFS owner is skipped entirely — an analytic (dr-writing,
  // non-dIFS) decompiled slot wins, else deSlot stays undefined so the intern-box /
  // native-lead / scaffold estimator (all analytic) applies below.
  const deSlot = preferAnalytic
    ? deCandidates.find((b) => b.writesDeriv && deOpt(b) !== 20)
    : (deCandidates.find((b) => deOpt(b) === 20)
        ?? deCandidates.find((b) => deOpt(b) >= 0)
        ?? deCandidates[0]);
  const deMeta = deSlot ? DECOMPILED_DE_META[deSlot.flag.name] : undefined;
  const isDifs = (deMeta?.deOption ?? -1) === 20
    && allScratch.includes('mb3dRout') && allScratch.includes('mb3dVary');
  // 4D formula (deOption 5/6 + an mb3dDr1 derivative): the DE slot iterates z.w as a real
  // 4th spatial coordinate (wIsCoord in slotTranspiler). MB3D's DE radius + escape bailout
  // are the 4D magnitude (Sqrt(Rout)); GMT's default 3D `length(z.xyz)` drops w-direction
  // surface detail (missing bulbs on ABoxSphereOffset4d). Flags the `render:de-4d` capability
  // so DE_MASTER uses the 4D radius. Coloring/orbit-trap stay on the 3D projection.
  const is4D = (deMeta?.deOption === 5 || deMeta?.deOption === 6) && allScratch.includes('mb3dDr1');

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
  const gate = opts?.enableGate ? { enabled: 'uWeaveEnabled' } : {};
  const weave = modulo
    ? emitLayeredModuloGLSL(
        moduloLayerSlots.map((_, j) => ({
          interval: `uWeaveInterval${j + 1}`,
          startIter: `uWeaveStartIter${j + 1}`,
          beats: `uWeaveBeats${j + 1}`,
        })), id, gate)
    : emitWeaveGLSL(plan, id, gate);
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
    // mapDEMeta derives the estimator from the source deOption; a hand-ported formula may carry
    // an owner-verified estimator override (its source r/dr reads wrong in GMT — see the intern
    // Amazing Box precedent below). Override wins over the deOption-derived value. @see ADR-0101.
    preset.features.quality = {
      ...(preset.features.quality ?? {}),
      ...mapDEMeta(DECOMPILED_DE_META[deSlot.flag.name]),
      ...(MB3D_DE_QUALITY_OVERRIDES[deSlot.flag.name] ?? {}),
    };
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
  //   estimator 7 + numDEeps 0.3 (magnitude) + numDESmooth 2.5 (deep-region flicker).
  //   The marcher's clamp+damper (unconditional since ADR-0092) damps the rough estimate.
  //   Detail is capped to 1.5 (the numeric DE is rougher — a fine authored threshold
  //   makes rays miss). @see docs/adr/0085.
  if (noAnalyticDE) {
    preset.features.quality = {
      ...(preset.features.quality ?? {}),
      estimator: 7.0, numDEeps: 0.3, numDESmooth: 2.5,
      // detail is (re)asserted in the sceneQuality block below when the header carries
      // DE tuning; set it here too so a scene with no authored DEstop/RStop still gets
      // the full est7 recipe (the marcher's clamp+damper — now unconditional, ADR-0092 —
      // damps the over-estimating numeric DE; the rougher DE needs a looser hit
      // threshold than analytic → detail ≤ 1.5).
      detail: 1.5,
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
    // `dTmp * sZstepDiv` (Calc.pas:1878), and GMT's marcher IS the MB3D-faithful
    // step since ADR-0092, so sZstepDiv maps 1:1 onto quality.fudgeFactor — the
    // unified step divisor (the separate mb3dStepDiv param/uniform is retired).
    // MB3D's absolute step constants remain stepWidth-NORMALIZED (don't translate
    // to GMT world units, ADR-0088); only the two dimensionless authored params
    // carry over, both from header fields parseMB3D already reads (no new parse):
    // sZstepDiv and msDEsub. Fall back to the formula DEscale if ZstepDiv is unset.
    let mb3dSZ = Math.max(0.0001, h2.zStepDiv > 0 ? h2.zStepDiv : ((q.fudgeFactor as number) || 0.5));
    let mb3dDEsub = 0;
    // iOptions bit 2 (StepSubDEstop) → msDEsub + sZstepDiv quadratic remap (HeaderTrafos.pas:961-964).
    if ((h2.iOptions & 4) !== 0) {
      mb3dSZ = mb3dSZ * mb3dSZ + 1.2 * mb3dSZ * (1 - mb3dSZ);
      mb3dDEsub = Math.min(0.9, Math.sqrt(mb3dSZ));
    }
    // Floor the authored step at 0.2. A very small authored ZstepDiv makes the
    // march take tiny steps that exhaust the ray budget before reaching the
    // surface → black render (Ellarien 0.05, Hal-Tenny 0.05, Theli-At 0.10 all
    // blacked out from ray exhaustion; Chrystal 0.196 is the smallest authored
    // step that renders, so 0.2 lifts only the three offenders and leaves every
    // scene ≥ 0.2 unchanged). The faithful marcher's clamp+damper (ADR-0092)
    // keeps the coarser step from overshooting thin surfaces.
    sceneQuality.fudgeFactor = Math.min(1.0, Math.max(0.2, mb3dSZ));
    sceneQuality.mb3dDEsub = mb3dDEsub;
    // With the faithful step's clamp+damper preventing overshoot, GMT's own closest-miss
    // recovery band-aid (uOverstepTolerance, the round-2 Theli fix for the plain step) is
    // redundant — turn it off so the two recovery mechanisms don't compound.
    sceneQuality.overstepTolerance = 0;
    // Couple the march budget to the step size: a finer authored step needs a deeper
    // march to cross the volume, else the image renders incomplete (cut-off / sparse —
    // the S1 1c regression). The curve is anchored on a 0.4 step floor (the faithful-
    // marcher-era budgets — keeps every certified scene's budget identical); the 2000
    // cap bounds the fine-step (< 0.4) scenes.
    sceneQuality.maxSteps = Math.min(2000, Math.max(1500, Math.round(750 / Math.max(0.4, sceneQuality.fudgeFactor))));
    // NB: we deliberately do NOT auto-map bStepsafterDEStop (@134) → quality.refineSteps.
    // Surface refinement (ADR-0084) is a NATIVE, opt-in quality control (default 0). A
    // canary bench (2026-06-27) showed it does NOT resolve the DsyneGrafix-class "dust"
    // it was meant for: an exhaustive fine march (fudge 0.05 / 5000 steps) is STILL
    // fragmented, so the dust is a DE-FIDELITY gap (the fused weave produces a fragmented
    // iso-surface), not an overshoot a single-step ray refinement can fix. Auto-enabling
    // it would add ~0.5–2s compile to every import for no benefit on the target scenes,
    // so we leave it off and let the user dial it in the Quality panel for any
    // coherent-but-overshooting formula. @see docs/adr/0084.
    preset.features.quality = { ...q, ...sceneQuality };
  }

  // AUTHORED REFLECTIONS (ADR-0096). The CalcSR.pas "Calculate Reflections" pass params
  // live in the header (SRamount #332, bCalcSRautomatic #336, SRreflectioncount #337 —
  // TypeDefinitions.pas:791-793). bit0 of bCalcSRautomatic = "calc reflections
  // automatically", i.e. the artist made reflections part of the render → enable GMT's
  // Raymarched mode. Manual-calc scenes (bit0 clear) stay on the cheap Env default:
  // SRamount is populated in most headers whether reflections were used or not, so it
  // can't gate by itself.
  //  - SRamount → mixStrength: MB3D scales the reflected-light amount (~0..1 in
  //    practice); GMT's nearest control blends traced reflections against the env
  //    fallback. Not exact — a dim MB3D reflection becomes a partly-env one — but it
  //    tracks the authored intensity.
  //  - SRreflectioncount deliberately UNMAPPED (2026-07-10): GMT Direct reflections
  //    are single-bounce by design — the 'Max Bounces' param was removed (PT owns
  //    bounce recursion; the Direct bounce loop cost +5.2s of cold compile). An
  //    MB3D multi-reflection scene imports with one mirror bounce.
  //  - bit1 (transmission) deliberately unmapped — GMT has no refraction path (parked).
  //  - NOT compensated: MB3D dims its primary lighting when reflections are on
  //    (sObjLightDecreaser = max(0.5, 1 − 0.17·√SRamount), CalcSR.pas:698), so a
  //    reflective import renders slightly brighter in GMT than in MB3D.
  if ((h2.srOptions & 1) !== 0 && h2.srAmount > 0) {
    preset.features.reflections = {
      ...(preset.features.reflections ?? {}),
      reflectionMode: 3.0, // REFL_MODE_RAYMARCH (raw value, matching this file's literal style)
      mixStrength: Math.min(1, Math.max(0, h2.srAmount)),
    };
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
  // threading + loopInit/loopBody). Rotation conversions are CPU-side now — bodies
  // bind directly to the derived uMb3dRot* bank, so no in-shader helper prelude.
  const assembled = assembleWeave({
    id,
    schedule: weave,
    slots: usedIdx.map((idx, k) => ({
      phase: modulo ? (idx === baseSlot ? 0 : moduloLayerSlots.indexOf(idx) + 1) : idx,
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
    prelude: '',
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
  // MB3D params only when they share the dense pool (mb3dParametric). Every slot of
  // a multi-formula weave — native OR MB3D — gets "Formula <n>: <name>" (n = 1-based
  // slot position), so imported scenes and editor-built weaves read identically.
  // The slot number keeps same-name slots distinct (Formula 1: Phoenix / Formula 2:
  // Phoenix). A single NATIVE slot also gets a group (its bank params need a named
  // modulation category); a lone MB3D slot keeps no group — its params live on
  // coreMath's standard "Formula Math" category like any plain formula. The Formula
  // panel suppresses the divider when only one group is present.
  // Every exposed param is stamped with its ADDON SLOT index (`slotIndex` =
  // the weaveSource row it belongs to): dense lanes reallocate in row order, so
  // an editor Rebuild needs the slot identity to carry live values across a
  // reorder (mergeDenseLanes in loadMB3DScene.ts). Def-object-only — no GLSL /
  // preset impact.
  const parameters = bodies.flatMap((b, k) => {
    // Native + banked-MB3D slots always expose (their params carry feature:'weave');
    // a lone standalone MB3D slot exposes when parametric. A woven slot that baked its
    // own literals simply has no params → contributes nothing.
    const exposed = isNative(usedIdx[k]) || woven || mb3dParametric;
    if (!exposed) return [];
    if (usedIdx.length <= 1 && !isNative(usedIdx[k])) {
      return (b.params ?? []).map((pp: any) => ({ ...pp, slotIndex: usedIdx[k] }));
    }
    const group = `Formula ${k + 1}: ${b.flag.name.replace(/^_/, '')}`;
    return (b.params ?? []).map((pp: any) => ({ ...pp, group, slotIndex: usedIdx[k] }));
  }) as any;

  // LEAD-SLOT getDist splice (P4.4): a native FIRST slot keeps its custom
  // distance function — rewritten by the resolver (prefixed ws0_* globals +
  // bank/literal uniforms), visible at map() scope like any standalone
  // formula's. Interlace-host semantics: only the LEAD splices; secondaries
  // run unspliced (estimator dropdown stays the escape hatch). core_math
  // applies it only when quality.estimator < 4.5, so dIFS (6) / numeric (7)
  // scenes are unaffected. Pure-MB3D weaves have no native slots ⇒ undefined
  // ⇒ byte-identical.
  const leadGetDist = isNative(usedIdx[0]) ? bodies[0].getDist : undefined;

  // Capability UNION from native slots (P4.4): a slot's cp_* writes are
  // UNPREFIXED (engine-owned globals, shared across slots on purpose), so any
  // CP-capable slot needs core_math to declare CP_PREAMBLE — under retired
  // interlace the pairHasCapability(primary, secondary) check did this; for a
  // fused def the def's own capability set must carry it. The old sweep's
  // signature failure class ('cp_dmin: undeclared identifier') gates this.
  // Pure-MB3D weaves have no native slots ⇒ set unchanged ⇒ byte-identical.
  const anyCP = bodies.some((b) => b.supportsCP);
  const fusedCaps = new Set<Capability>(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter']);
  if (anyCP) fusedCaps.add('estimator:cutting-plane');
  if (is4D) fusedCaps.add('render:de-4d'); // z.w is a 4th spatial coord → 4D DE radius (see is4D above)

  // CPU-derived rotation uniforms across all slots (already def-globally numbered
  // by mb3dBankBody; a lone standalone slot's fresh-allocator indices ARE global).
  const derivedRotations = bodies.flatMap((b) => b.derivedRotations ?? []);
  // dIFS (DEoption 20): the fused def declares g_difsDE in preamble and writes
  // its running minimum in loopBody; estimator 6 reads it. The token gates both
  // the estimator UI and the compile dispatch, and round-trips via the GMF
  // shaderMeta capabilities stash (parseGMF also self-heals it from g_difsDE
  // in the body, like cp_*).
  if (isDifs) fusedCaps.add('estimator:difs');

  const def: FractalDefinition = {
    id: id as any,
    name: scene.title || 'MB3D Hybrid',
    shortDescription: `Imported Mandelbulb3D hybrid (${usedIdx.length} formula${usedIdx.length === 1 ? '' : 's'}).`,
    description: `A fused Mandelbulb3D hybrid weave (${slotFlags.map((s) => s.name).join(' → ')}).`,
    juliaType: 'offset',
    shader: {
      function: assembled.functionGLSL,
      getDist: leadGetDist,
      preamble: difsPreamble || undefined,
      loopBody: assembled.loopBody,
      loopInit: assembled.loopInit,
      capabilities: fusedCaps,
      derivedRotations: derivedRotations.length ? derivedRotations : undefined,
    },
    parameters,
    defaultPreset: preset,
  };

  return { def, ledger: { mode: plan.mode, supported: true, reasons: [], slotFlags } };
}
