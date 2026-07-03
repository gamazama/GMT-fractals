# Session: MB3D dense param-packing (expose sliders instead of baking)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **Tracker:** `EXECUTION-STATUS.md`

Many multi-slot MB3D scene imports show **no editable sliders** — they "bake all literals" because the
cross-slot allocator runs out of its **6-scalar (paramA..F) + 3-vec3** budget and falls back. Fix: pack
overflow scalar params **densely into the vec uniform lanes** so more hybrids fit and expose sliders.
**Two orchestrator research agents mapped this; their findings are below. The Formula Workshop already
implements the whole pattern — REUSE it, don't reinvent.** App-side only; no kernel/uniform-schema change.

## The current state (why it bakes) — agent A
- `emitFusedHybrid.ts:84-97`: `alloc = {si, vi}`; if `si > 6 || vi > 3 || any slot paramOk===false` → the whole
  scene `tx(idx, {})` bakes literals → `parametric=false` → `parameters: []` → no sliders.
- Per-slot: `constPacker.ts bindOptions` (~:236-342) takes `SCALARS[si++]` per scalar option, `VEC3S[vi++]`
  per rotation / X-Y-Z triple. `slotTranspiler.ts internMultiParam` (~:96-113) is scalar-only and `return null`
  on `si0 + keys > 6` → aborts the parametric attempt.
- **The waste:** `core_math.ts:150-165` declares **6 scalar + 3×vec2 + 3×vec3 + 3×vec4 = 33 float lanes**, all
  already declared in the kernel + synced by UniformManager. MB3D uses only 6 scalar + 9 vec3 lanes; `uVec2*`
  and `uVec4*` (18 lanes) sit idle. A 7-scalar hybrid bakes despite 18 free lanes. Scalars can't spill into vec
  lanes today because the binders emit fixed `uParamA`-style accessors counted against the scalar pool only.

## The Workshop already does this — agent B (REUSE these)
The frag Formula Workshop packs many params into the same uniform set, including **unrelated scalars into one
vec**, and exposes each as an individual slider. Lift / mirror:
- **Slot vocabulary + occupancy algebra** — `features/fragmentarium_import/workshop/param-builder.ts:9-102`:
  component slots (`vec3A.x`, `vec4B.z`), swizzles (`vec4A.xy`), and `getSlotOccupancy` / `componentSlotBase` /
  `buildOccupancyMap` / `isSlotConflict`. **App-agnostic — lift into a shared module both trees consume.**
- **Accessor generation** — `transform/variable-renamer.ts:30-40` `slotToUniform('vec3A.x') → 'uVec3A.x'`
  (component/swizzle aware, with `int(...)`/`(...>0.5)` wrapping for int/bool). MB3D's `bindOptions` builds the
  same `uVec3A.x` string by hand today (`constPacker.ts:217,273`) — replace with `slotToUniform`.
- **Component-slot packing** — `param-builder.ts buildFractalParams:348-429`: groups params per base uniform,
  emits ONE multi-axis control per base, merges per-component defaults/labels (joining names with `" | "`).
- **Per-component sliders — CONFIRMED YES.** A packed vec is rendered by the SHARED `FormulaParamsWidget`
  (`:160-213`) as a `Vector{2,3,4}Input` with per-axis `trackKeys`/`trackLabels`; each axis is a full
  `ScalarInput` (`VectorAxisCell.tsx`), individually editable + animatable/undoable. MB3D fused defs already go
  through this same widget — **no UI work needed.** (MB3D already proves it: X/Y/Z option triple → `vec3A`.)

## Implementation plan (app-side only, in order)
1. **Shared occupancy/accessor module.** Lift `getSlotOccupancy`/`componentSlotBase`/`buildOccupancyMap`/
   `isSlotConflict` (`param-builder.ts:24-102`) + `slotToUniform` (`variable-renamer.ts:30-40`) into a shared
   location both the Workshop and MB3D import (e.g. a `features/.../uniform-slots.ts` or similar). Don't fork
   them — the Workshop must keep working off the same code (run its tests after).
2. **A `LaneAllocator`** replacing `{si, vi}`: a scalar cursor over the lane order **`paramA..F` (6) → `uVec2A/B/C`
   components (6) → `uVec4A/B/C` components (12) = 24 scalar lanes**, plus the **vec3 pool kept for genuine vec3
   params** (rotations, X/Y/Z triples — they need a true `uVec3` unit + the `mb3dRot()` helper). `nextScalar()`
   returns `{accessor, coreKey, component}` via `slotToUniform`; `nextVec3()` as today; `fits()` = the budget gate.
3. **`constPacker.ts bindOptions`** — swap `SCALARS[si++]`/`VEC3S[vi++]` for the allocator. Each scalar option
   (t 0/1/2/7/8/11) → `alloc.nextScalar()`; write the param + the coreMath into the **base vec object** for
   vec-lane scalars (mirror the existing `vec3A` twin write at `:275-276`). Keep X/Y/Z→vec3 (`:262-281`) and
   rotation t===6 on `nextVec3()`. `.BOXSCALE` `prevScalarUni` just stores whatever accessor string came back
   (a `uVec2A.x` divisor is valid GLSL). Wrap int/bool reads (`int(...)`) if packing `.INTEGER` into a vec lane.
4. **`slotTranspiler.ts internMultiParam`** — take the shared `LaneAllocator`; `vars[logical] =
   alloc.nextScalar().accessor`; overflow guard → `alloc.fits()`. So scalar-only interns pack into vec lanes too.
5. **`emitFusedHybrid.ts:91-97`** — replace `alloc.si<=6 && alloc.vi<=3` with the `LaneAllocator` + `fits()`
   (24 scalar lanes + 3 vec3). Keep `has4D` gating + the paramA/B w-seed reservation UNTOUCHED (Quaternion still
   bakes), and start the scalar lane order at `paramA` so single-slot + reserved semantics are byte-identical.

## Caveats to carry over (agent B)
- **Keyframe granularity is whole-vector** — packing *unrelated* scalars into one `vec3A` means one keyframe
  button keys all three. Acceptable; use the Workshop's `" | "` combined label so the packed slider names its
  members (keep MB3D's existing formula-name prefix too).
- **min/max/step collapse to the widest** across a packed vec's members (MB3D options mostly share ±8 → low risk).
- **Defaults**: write per-lane defaults into the same base-vec coreMath object (mirror `constPacker.ts:275-276`).
- **Animation/undo per component is automatic** via `trackKeys` — no extra wiring.

## Gates / verify
- `npm run typecheck`, `npm run test:mb3d` (24), **`npm run test:mb3d:weave`** (42 — extend with a >6-scalar
  multi-slot case that now exposes sliders instead of baking; assert the accessor strings include a `uVec2`/`uVec4`
  lane), and **run the Workshop's own tests** after lifting the shared helpers (don't regress frag).
- **Single-slot scenes must stay byte-identical** (they don't use the allocator; lane order starts at paramA) —
  `test-mb3d-weave.mts` single-slot assertions (`paramA===-1.5`) green.
- Corpus cross-check (293/0) is **untouched** — this is binder/accessor only, no decompiled GLSL bodies change.
- **GPU/visual:** load a previously-baking multi-slot scene (one the contact sheet showed with no sliders) and
  confirm the sliders now appear + drive the render. Report which scenes gained sliders.

## When done
Update `EXECUTION-STATUS.md` (a new "param-packing" row), report: effective capacity before→after, how many
bundled scenes now expose sliders that previously baked, the shared-module location, and confirmation the
Workshop tests + single-slot byte-identity held.
