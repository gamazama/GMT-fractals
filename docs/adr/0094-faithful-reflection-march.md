# ADR-0094: Reflection march joins the unified marcher (view-cone-continued threshold + MB3D step dynamics)

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Sequel to ADR-0092 (unified step
dynamics) and ADR-0093 (zoom-normalized shadow units) — this ADR closes the last march that had
neither: `traceReflectionRay` (Direct-path raymarched reflections, `features/reflections/shader.ts`).

## Context

After ADR-0092/0093, every march in the engine — primary trace, soft/hard shadows, PT visibility,
env-NEE, fog shadows — used the MB3D-faithful step (fudge divisor + msDEsub safety-subtraction +
Lipschitz overstep clamp + RSFmul damper) on a zoom-aware, footprint-derived hit threshold. The
reflection bounce march did not. It was the last naive sphere tracer: `t += DE` raw, hit when
`DE < 0.002 · t` with `t` measured from the *reflector*.

Two defect classes followed:

1. **Contact reflections missed.** At `t → 0` the threshold collapsed to zero and the raw step
   collapsed with it, so a mirror surface adjacent to other geometry (floors, crevices — the most
   visible reflections) stalled, burned all `uReflSteps` iterations, and returned MISS: env colour
   leaked in exactly where the neighbouring surface should reflect. The threshold also ignored
   `uDetail`/`uPixelThreshold` (Detail slider had no effect on reflections) and had no
   float-precision floor.
2. **Reflection dust on imports.** Non-Lipschitz / over-estimating fused DEs (MB3D hybrids) rely on
   the overstep clamp + damper to not tunnel through thin surfaces. The primary march has them; the
   reflection march didn't — and it stepped *full* DE while the primary steps `DE · fudge ≤ DE`, so
   reflected geometry systematically disagreed with primary geometry on the same scene.

Reading the Mandelbulb3D source settled the fix shape (`h:/tmp/mb3d-probe/CalcSR.pas`, the
"Calculate Reflections" deferred pass):

- MB3D marches reflected rays with **literally the primary march's step code** (`CalcRay`,
  CalcSR.pas:417-478 — same DEstop/DEsub/ZstepDiv/RSFmul/Lipschitz clamp as CalcThread.pas).
- MB3D's reflected hit threshold **continues the primary view depth**:
  `msDEstop = DEstop · (1 + |ZZ| · DEstopFactor)` where `ZZ` starts at the primary hit's view depth
  and advances by `step · cos(viewDir, reflDir)` (CalcSR.pas:393-405). At the reflection origin the
  threshold equals the primary surface's threshold — it never collapses.
- MB3D refines reflected hits with the same `iDEAddSteps` damped bisection as primary hits
  (CalcSR.pas:539-559).

## Decision

`traceReflectionRay(ro, rd)` becomes `traceReflectionRay(ro, rd, dPrimary)` and is rebuilt as a
mini twin of the primary kernel (`trace.ts`):

- **Threshold — view-cone continuation.** Per step,
  `finalEps = max(pixelFootprint · uPixelThreshold/(uDetail/uInternalScale), floatPrecision)` where
  `pixelFootprint = uPixelSizeBase · (dPrimary + t)` (constant for ortho) and `floatPrecision` is
  the standard `PRECISION_RATIO_HIGH` floor at the march point. At `t = 0` this equals the primary
  hit's `finalEps`; growth uses total path length (`dPrimary + t`) rather than MB3D's
  view-projection factor — simpler, monotonic, and equivalent at the origin where the collapse bug
  lived. Reflections now respond to the Detail slider like every other march.
- **Step — the unified MB3D dynamics** (trace.ts `mb3dStep`/`mb3dPreHit` twins): Lipschitz clamp
  `DE ≤ lastDE + lastStep`, RSFmul damper `∈ [0.5, 1]`,
  `step = max(0.5 · floatPrecision, (DE − uMb3dDEsub · finalEps) · uFudgeFactor · RSF)`. No
  stochastic jitter (reflection banding averages out under accumulation; matches MB3D's SR pass).
- **Hit refinement — gated bisection.** Base behaviour stays the cheap half-DE retreat. When the
  quality feature's 'Surface Refinement' gate (`refineEnabled`, ADR-0084) is compiled in, the same
  damped bisection the primary march uses runs on the reflected bracket
  (`REFINE_HARD_CAP` / `uRefineSteps` / `uRefineActive` — one set of controls drives both marches).
  The gate is a TS-level emission gate (kernel.ts invariant): un-refined builds contain **no** extra
  `DE_Dist` call site and are byte-identical there, honouring the rule that compile-time cost rides
  quality paths only. The whole marcher already only compiles under the "Raymarched (Quality)"
  reflection mode — the Balanced/Env path is untouched.
- A contact hit on the first sample returns `max(tHit, floatPrecision)` so a legitimate `t ≈ 0` hit
  still passes the caller's `refHit.x > 0.0` test (scale-aware, unlike a fixed epsilon).

## Consequences

- Contact reflections resolve instead of leaking env colour; reflected geometry on fused MB3D
  imports stops tunneling into dust and matches the primary surface (same step dynamics, same
  threshold model, same `uFudgeFactor`/`uMb3dDEsub` scene tuning).
- Per-step cost adds a `length()` + a few ALU ops — negligible next to `DE_Dist`. Steps shrink by
  the fudge divisor, so rays may spend more of their (unchanged, `uReflSteps`-capped) budget near
  surfaces; expected FPS impact small, unmeasured (owner benches separately).
- `traceReflectionRay` signature changed; its only caller is `REFL_RAYMARCH_SHADING`
  (`features/reflections/index.ts`), which passes the primary hit distance `d`.
- The reflections injector now reads `config.quality.refineEnabled` (plain `ShaderConfig` snapshot —
  inject-time cross-feature reads carry no DDFS store-isolation concerns, and both features read the
  same config so inject order is irrelevant).
- `REFL_HIT_THRESHOLD` (0.002) is gone. Scenes tuned around env-leak-at-contact may look different —
  that is the fix landing, not a regression.
- Not addressed here (tracked from the 2026-07-10 reflection study): the dead `bounces` param /
  `MAX_REFL_BOUNCES` define (single-bounce regardless of setting), fog/volumetrics along reflected
  rays, and trap-data colour at reflected hits.
