# ADR-0090: Per-slot param BANKS — a native formula keeps its declared slots verbatim in a weave

**Date:** 2026-07-04 · **Status:** Accepted · **Branch:** `feat/weave-core`

## Context

ADR-0089 P4.1 made a registered native GMT formula a dispatcher-hosted weave
slot. Its params were re-packed through the shared dense `LaneAllocator` (the MB3D
multi-slot path): slot 0's scalars kept `paramA…` mostly by accident, **vec2/vec4
params DECOMPOSED into component lanes**, later slots landed wherever was free, and
the two-formula IDENTITY pair (Mandelbulb ⊗ Mandelbulb, both declaring `paramA`)
could not be represented at all. Slider layout, keyframe targets, muscle memory
and saved-preset expectations all broke relative to the standalone formula, and a
param-rich pair (Phoenix ⊗ Phoenix: 4 scalars + 2 vec2 + 3 vec3 per slot)
**overflowed the 24-lane / 6-vec3 shared pool and baked every param to a literal**
— no live sliders at all.

Measurement (A3, `docs/policy/shader-compile-optimization.md` §8.1;
`debug/probe-uniform-headroom.mts`, RTX 2070 / ANGLE-D3D11): +96 float + 24 vec4
UNREAD uniforms cost **~+2% cold compile, FLAT with count, 0 fps** — unread
uniforms are INACTIVE after link (no D3D registers, never synced). So uniform
*count* is ~free; the real price of a wider slot vocabulary is code surface, not
performance.

Options weighed (`plans/mb3d/weave-slot-fidelity-plan.md` §A4): (1) per-slot
banks; (2) affinity/first-declarer-wins on the shared pool; (3) hybrid. **Affinity
was rejected** because it adds ZERO availability — the shared pool stays the
ceiling and a Phoenix pair still overflows. Only per-slot banks make availability
*per-slot* and satisfy identity pairs verbatim.

## Decision

**Each weave slot k gets its own private param BANK** — the full coreMath slot
vocabulary (6 scalars + 3 vec2 + 3 vec3 + 3 vec4 = 15 params) duplicated under a
`ws<k>` prefix: state keys `ws<k>ParamA` … `ws<k>Vec4C`, uniforms `uWs<k>ParamA` …
A native formula woven as slot k binds its declared params **VERBATIM** onto bank
k (`uParamA → uWs<k>ParamA`, `uVec2A → uWs<k>Vec2A`, …) with **no vec
decomposition** — a declared vec2/vec4 binds a real vec2/vec4 uniform. Every other
coreMath uniform the formula references is **baked to its preset-default literal**,
so a slot can never read a bank lane it didn't declare (or another slot's). Bank
mode **never overflows** (a standalone-valid formula's declared ids fit its bank's
mirror by construction), so a native slot is always live.

- **State home = the DDFS `weave` feature** (the P3b loop-generated-params
  pattern). The feature declares 6 banks × 15 params (`WEAVE_BANK_COUNT`);
  keyframes / undo / preset + GMF persistence arrive BY CONSTRUCTION via the
  generic dotted binder (`weave.ws1ParamA` tracks). DDFS labels are generic
  ("Slot 1 Param A") and never surface; the Formula panel shows each formula's
  REAL labels via the fused def's `parameters`, which gained an additive
  **`feature: 'weave'`** routing field (+ a `WeaveBankSlotId` id widening) consumed
  by `FormulaParamsWidget` (read `store.weave` / write `setWeave` / track
  `weave.<id>`). Shared vocabulary helpers (`WEAVE_BANK_COUNT` / `weaveBankKey` /
  `weaveBankUniform`) live in `uniformSlots.ts` so the declaration and the
  resolver's remap stay in one source of truth.

- **Shape = banks-for-all-SIX** (base slot included), decided in-session over the
  base-slot-verbatim alternative. Base-verbatim would let a 1-slot native weave
  keyframe on `coreMath.paramA` like the standalone formula, but in a MIXED weave
  it forces the shared MB3D allocator to RESERVE the base's arbitrary,
  non-contiguous claimed ids (`paramA, paramC, vec3B`) — a new reservation path
  over a dense cursor whose `uVec4` units are already shared between scalar- and
  vec3-overflow — plus positional special-casing of the base (`usedIdx[0]`, not
  necessarily slot 0). Banks-for-all-6 makes the native banks (`uWs*`) and the
  coreMath dense pool (`uParam*`/`uVec*`) **physically disjoint**: zero reservation,
  no base special-case, collision impossible. Its only cost — one extra idle bank
  (~15 uniforms, free per A3) and base params keyframing as `weave.ws0ParamA`
  rather than `coreMath.paramA` — is invisible: the panel shows real labels either
  way, and a woven formula is a synthetic `MB3DHybrid<N>` def (not the standalone
  formula), so no keyframes ever transfer between the two regardless.

- **Fidelity is the default; compact is an AUTOMATIC fallback only, no user
  toggle.** Consequence: a native slot can never overflow in bank mode, so the
  dense/bake path survives ONLY for MB3D slots (option lists → shared coreMath pool
  + P3b expose/bake, unchanged) and as the loader-compat path for defs saved
  pre-banks. The Weave Editor budget meter now meters **only the MB3D dense pool**;
  native rows report as always-live.

- **Sequencing: banks BEFORE P4.4/P4.5** (the old hard gate was lifted). Absorption
  then maps interlace onto a bank and DELETES the `uInterlace*` uniform set (one
  migration, not two); P4.6's animation transfer gets stable per-slot targets
  (reorder = a bank-index rename).

## Consequences

- MB3D-only scenes stay **byte-identical** (probe over all 38 bundled scenes): a
  pure-MB3D weave has no native slots, so the emit reduces to the pre-banks path
  and `preset.features.weave` stays absent. The certified corpus is untouched.
- Native slots resolve in bank mode **independent of `has4D` and the MB3D budget**
  — a mixed native + MB3D-Quaternion weave keeps its native sliders live even
  though the MB3D slots bake (an improvement over P4.1, where `has4D` baked
  everything). GPU-certed (real ANGLE/D3D11): identity pair / bulb ⊗ box / mixed
  native+MB3D compile + render coherently; Phoenix ⊗ Phoenix now exposes all 18
  params live on distinct banks.
- **Save compat / migration:** old saved scenes load their SAVED def (dense lanes
  baked in the GLSL) + coreMath state — untouched, no migration this session. Only
  a REBUILD in the editor moves a weave onto banks; `loadUserWeave` reseeds bank
  defaults on rebuild (like coreMath) while PRESERVING live rhythm params, under
  the existing reorder-keyframe warning until P4.6 turns the reseed into a full
  per-slot transfer.
- The bank uniforms are declared-but-mostly-idle (only the active native slots'
  declared params are live); idle banks are INACTIVE after link and never synced,
  so the ~90 added uniforms cost ~+2% cold compile and 0 fps (A3).

## Related

ADR-0089 (weave core; P4.1 native slots — the packing this supersedes for native
slots) · ADR-0087 (GPU-cert every weave/emit/DE change) ·
`plans/mb3d/weave-slot-fidelity-plan.md` (A3 measurement + A4 decisions) ·
`plans/mb3d/sessions/S-weave-p4-banks.md` (build session)
