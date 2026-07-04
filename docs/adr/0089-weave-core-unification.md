# ADR-0089: One engine weave core (WeaveSpec) behind every formula-scheduling front-end

**Date:** 2026-07-04 · **Status:** Accepted · **Branch:** `feat/weave-core`

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
