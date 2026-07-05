# ADR-0090: Per-slot param BANKS — a native formula keeps its declared slots verbatim in a weave

**Date:** 2026-07-04 · **Status:** Accepted · **Branch:** `feat/weave-core`

> **Update 2026-07-04 (P4.4+P4.5 absorption landed; decision unchanged):** the
> "banks BEFORE P4.4/P4.5" sequencing paid off as planned — legacy interlace
> params migrate straight onto bank 1 (`weave.ws1*`) and the whole `uInterlace*`
> uniform set is DELETED with the feature (one migration, not two); Hybrid Box
> fold params land on the BoxFold slot's bank. See ADR-0091.

> **Update 2026-07-05 (rebuild now preserves + follows banks; decision unchanged):**
> The "reseeds bank defaults on rebuild" behaviour below (Save compat / migration)
> is refined: `loadUserWeave` (`mergeWeaveBanks`) PRESERVES the live `ws<k>*` values
> of each slot, FOLLOWING it across a reorder — a new bank claims the first
> not-yet-claimed OLD bank with the same slot identity (kind:ref) and re-indexes its
> values onto the new bank (duplicates claim left-to-right). It also carries a single
> formula's live coreMath onto bank 0 on its first build. So a Build that only
> reorders/tweaks slots keeps every slot's params; only a genuinely NEW/REPLACED slot
> takes fresh defaults. (The earlier "full per-slot transfer across reorder is P4.6"
> caveat is thus resolved for value transfer; the remaining P4.6 item is keyframe/LFO
> track re-mapping across reorder.)
>
> Same-day rebuild-preservation also widened beyond banks: geometry (Julia/offset,
> burning, rotation), coreMath (iterations floored to min-cover), and all quality
> knobs now carry over on Build — only `quality.estimator` (the DE type) refreshes to
> the rebuilt formula (owner call). See `loadUserWeave` JSDoc.

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
- **UI routing:** a per-param `feature` field (default `coreMath`, `'weave'` for
  banks) routes the Formula panel and the modulation-target picker to the right
  slice/setter/track. A fused weave stamps each slot's params with
  `group = "Formula <n>: <name>"` — the Formula-panel divider AND the modulation
  category, one per slot, identical for native and MB3D slots (imported scenes and
  editor weaves read the same). The picker keys a SINGLE per-formula path on that
  group, routing each param to its own feature (`weave.<id>` / `coreMath.<id>`).

## Future work (not this ADR)

Is `coreMath` redundant now? **No.** It remains the standalone-formula param home
(the non-woven common case), the MB3D dense-pack pool (MB3D slots declare no param
vocabulary), and the kernel-state home (`iterations`, Quaternion 4D seeds,
`uModularParams`). Banks are a per-slot vocabulary for WOVEN NATIVE slots only. The
apparent overlap — a native formula's `paramA` lives on `coreMath` standalone but
on a bank when woven — is inherent context-duality, not accidental redundancy.
Collapsing `coreMath` into banks would mean treating **every** scene as a 1-slot
weave (the ADR-0089 "one weave core behind every formula" endgame): a large refactor
with a one-way save-migration, after which `coreMath` would still survive for kernel
state + the MB3D dense pool. It is a legitimate long-term direction but its own
initiative with its own ADR, not a banks cleanup.

## Related

ADR-0089 (weave core; P4.1 native slots — the packing this supersedes for native
slots) · ADR-0087 (GPU-cert every weave/emit/DE change) ·
`plans/mb3d/weave-slot-fidelity-plan.md` (A3 measurement + A4 decisions) ·
`plans/mb3d/sessions/S-weave-p4-banks.md` (build session)
