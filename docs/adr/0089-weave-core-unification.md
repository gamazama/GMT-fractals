# ADR-0089: One engine weave core (WeaveSpec) behind every formula-scheduling front-end

**Date:** 2026-07-04 · **Status:** Accepted · **Branch:** `feat/weave-core`

> **Update 2026-07-04 (P4.2 landed; decision unchanged):** native slots carry a
> DE policy. `writesDeriv` is detected from the formula source (dr-write scan) —
> a weave where NO slot updates the derivative auto-routes to the est7 numeric
> recipe (ADR-0085), the same no-ADE policy as MB3D [CODE] slots; frag/DEC
> import slots (P4.3) inherit this for free. A native slot's tuned preset
> quality subset (`deMeta`: estimator/fudge/metric/bailout/detail) leads the
> fused preset — GENERIC estimators (0–4) only; capability-backed presets
> (cutting-plane/dIFS/numeric) drop the subset whole, since a native
> `shader.getDist` is NOT spliced into weaves (interlace-secondary semantics;
> the estimator dropdown stays the manual escape hatch). Precedence: decompiled
> DE owner → certified intern-box calibration → first native generic subset.
> GPU-certed: mixed native+MB3D weave + AmazingBox-led pair (non-default
> deMeta) render coherently; MB3D corpus byte-identical throughout.

> **Update 2026-07-04 (P4.0+P4.1 landed; decision unchanged):** native formulas
> are now dispatcher-hosted weave slots. The struct-state framework this ADR
> anticipated ("per-iteration state remains flat named floats… the struct-state
> framework (P4) lands inside assembleWeave") was **not needed** — the state
> inventory (plans/mb3d/weave-p4-struct-state-design.md §1) showed native
> cross-iteration state already lives in globals, so the shipped design is
> **namespace-prefixed globals** per slot (`ws<N>_`), the interlace rewriter
> generalized. `assembleWeave` gained per-slot `preCall`/`call`/`loopInit`
> seams (P4.0, byte-identical when absent); `engine/weave/nativeResolver.ts`
> (P4.1) binds one `createNativeSlotRewriter` per slot with a `uniformMap` that
> lands declared params on allocated coreMath lanes (shared LaneAllocator with
> MB3D slots — one budget) and bakes undeclared uniforms to preset defaults,
> hoists loopInit-declared state to globals (Phoenix/Bristorbrot), hosts the
> shared-rotation swap in the dispatcher branch, and isolates c.w per slot
> (z.w rides the shared orbit — interlace semantics). Weave addon slots carry
> natives as `formulaIndex: -1` + `name` = registered formula id
> (`NATIVE_FORMULA_INDEX`); `weaveSource.slots[].kind` gained `'native'`.
> MB3D slots keep the shared `inout float` scratch — two state channels reflect
> two real semantics (shared fused orbit vs independent formulas), one
> dispatcher. GPU canary: identity pair (Mandelbulb⊗Mandelbulb) + mixed
> bulb⊗box render coherently (probe-native-weave.mts); interlace sweep 45/45.

> **Update 2026-07-04 (P3b landed; decision unchanged):** the weaver's opt-in
> **Rhythm (LAYERED modulo) schedule** ships: 2–6 active slots — the first is
> the base (phase 0), each further slot k is an independent rhythm layer reading
> `uWeaveInterval<k>`/`uWeaveStartIter<k>`/`uWeaveBeats<k>` from the DDFS `weave`
> feature (live + keyframable — schedule edits never recompile). Layers are
> checked in slot order, first beat wins — the same precedence rule as the
> `skipMainFormula` arbitration above, so the GMT "Hybrid Box + interlace"
> pattern maps 1:1 onto rhythm layers. `beats` caps a layer after N claims
> (0 = endless); a dense capped layer doubles as a sequence-style intro, which is
> why no baked counts-prefix hybrid schedule was added (deferred to P4 if ever
> needed). Emitters: `emitLayeredModuloGLSL` (weaver) alongside the binary
> `emitModuloScheduleGLSL` (interlace / Hybrid Box bindings, unchanged).
> `emitFusedHybrid(scene, opts)` takes `opts.schedule = {kind:'modulo'}`; opts
> absent stays the counts path, probe-proven byte-identical over all 38 bundled
> scenes. `weaveSource.schedule = {kind:'modulo', layers:[…]}` persists the
> built snapshot; the live values ride feature state. Task 2 adds per-OPTION
> expose/bake directives (`opts.slotBake` → `bindOptions(..., bake)`): baked
> options bind literals via packConstBuffer's math — covering even
> non-live-mappable option types, so one odd option no longer bakes the whole
> slot — and `weaveSource.slots[].bake` persists the choice; the editor's lane
> budget meter dry-runs the same `LaneAllocator` (24 scalar lanes / 6 vec3 units).

> **Update 2026-07-04 (P2/P2.5 landed; decision unchanged):** the interlace rewriter now
> lives at `engine/weave/nativeSlot.ts` (namespace-parameterized `createNativeSlotRewriter`;
> `features/interlace/glslRewriter.ts` is interlace's binding of it), and BOTH interlace and
> Hybrid Box's interleaved mode dispatch through `emitModuloScheduleGLSL` phase functions
> (`Interlace_weaveSlot` / `Hybrid_weaveSlot`, the latter using `maxCount`). The
> `skipMainFormula` arbitration is defined: a weave block claims an iteration only if no
> earlier block did (injection order = precedence). The mesh path shares the same rewriter +
> schedule through the interlace binding. Persisted `interlace*`/`hybrid*` state is
> UNCHANGED — old scenes load as-is; the conversion to weave-native state lands when the
> weaver absorbs those UIs (P4).

## Context

GMT accumulated **three parallel implementations** of "schedule N formulas across the
iteration loop", plus a coupled parameter layer:

1. **Interlace** (`engine-gmt/features/interlace/`) — 2 formulas, runtime modulo
   alternation (`uInterlaceInterval`/`uInterlaceStartIter` are live, keyframable DDFS
   uniforms), inline GLSL rewriting of the secondary formula.
2. **MB3D weave** (`engine-gmt/utils/mb3d/`) — N fixed slots, the `doHybridPas`
   counts cursor precomputed into a baked `const int[]` LUT, mode 0 only (ADR-0083).
3. **Hybrid Box** (`engine-gmt/features/geometry/`) — interleaved mode is a modulo
   schedule with a start offset and an invocation cap; both it and interlace write
   `skipMainFormula` with **no arbitration** (a latent same-iteration conflict).

The engine's own rules forbid this ("genericize, don't fork"; "one source of truth"),
and the planned user-facing weaver would have been a fourth copy.

## Decision

An **engine-level weave core** at `engine-gmt/engine/weave/`:

- **`types.ts` — `WeaveSpec`**, the single contract: ordered slots
  (`source: {kind: 'mb3d' | 'native'}`, per-slot `iterCount`) + a schedule. Every
  front-end (MB3D importer, interlace, Hybrid Box, the weaver UI) *authors a spec*;
  the core compiles it.
- **Two first-class schedule kinds** (confirmed with the owner, 2026-07-03):
  - `counts` — baked `const int[]` LUT phase function; exact, but structure edits
    recompile. (MB3D semantics.)
  - `modulo` — `{interval, startIter, maxCount?}` read from **runtime uniforms**;
    live-editable and keyframable, no recompile. (`maxCount` covers Hybrid Box's
    invocation cap; interlace omits it.)
  Emission is per-spec: a counts weave carries zero modulo code and vice versa; with
  no weave active nothing is emitted (byte-identical no-weave kernel).
- **`schedule.ts`** — `buildCountsPlan` (the cursor walk, generalized input) +
  `emitCountsScheduleGLSL` + `emitModuloScheduleGLSL`, all emitting the same
  `int <id>_weaveSlot(int i)` phase-function shape.
- **`emitWeave.ts` — `assembleWeave`**: phase dispatcher + flat `inout float` scratch
  threading + loopInit/loopBody assembly. Front-end specifics (dIFS folds, Rout
  recompute, scratch seed values, per-iteration refreshes) arrive as data/callbacks —
  the core stays domain-free.
- Front-ends stay thin: `utils/mb3d/weaveSequencer.ts` is the MB3D adapter (nibble
  clamps, mode extraction, `weaveSpecFromMB3D`); `emitFusedHybrid.ts` keeps all MB3D
  scene semantics and assembles through the core.

## Consequences

- The importer migration was proven **byte-identical** over all 38 bundled scenes
  (full emit dump diff) before GPU re-certification — the certified corpus was never
  at risk.
- P2 folds interlace onto a 2-slot modulo WeaveSpec (generalizing its `glslRewriter`
  into the native-slot transpiler) and migrates the mesh-export path; P2.5 folds
  Hybrid Box's interleaved mode, which structurally fixes the `skipMainFormula`
  arbitration hazard (one dispatcher, defined precedence). Hybrid Box's pre-loop
  fast path is a prep pass, not weaving — it stays in geometry.
- **Save migration:** legacy `interlace*`/`hybrid*` feature state must convert into
  the weave-native form at load (the new system is a superset); old-scene round-trip
  is a P2/P2.5 gate.
- Per-iteration state remains flat named floats threaded `inout`; the struct-state
  framework (P4) lands inside `assembleWeave` when it comes.
- The modular graph builder is **not** part of this unification (it composes within
  an iteration — an orthogonal axis; its `uModularParams` packing keeps its ADR-0050
  parity contract). Its compiled formula is slot-shaped, so `source: {kind:'modular'}`
  is a natural post-P4 extension that would also lift the interlace exclusion.

## Related

ADR-0083 (MB3D importer, mode-0 only) · ADR-0087 (cert blind spot — GPU-cert every
weave/emit/DE change) · ADR-0050/0051 (modular) ·
`plans/mb3d/sessions/S-nformula-weave-unification.md` (verified research + confirmed design)
