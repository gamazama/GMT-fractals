# ADR-0088: MB3D-faithful marcher (compile-gated step dynamics)

**Status:** Accepted — 2026-06-29, superseded in part by ADR-0092 — 2026-07-05. Branch `feat/mb3d-importer`. Implementation landed alongside this ADR; the importer enables it for every real `.m3p` import.

> **Update 2026-07-05 (ADR-0092; dynamics unchanged, gating superseded):** the faithful step is no
> longer compile-gated — ADR-0092 retired GMT's legacy plain sphere step and made these dynamics
> THE marcher (all trace variants + the shadow / PT-visibility marches), with `uFudgeFactor` as
> the unified step divisor (`mb3dStepDiv`/`uMb3dStepDiv` retired; saved scenes migrate at load,
> app-gmt migration v4). The "off-path byte-identical" guarantee and per-scene `quality.mb3dFaithful`
> gate described below no longer exist. The dynamics port, the stepWidth-normalization analysis,
> and the Performance data all still stand and motivated the promotion.

> **Update 2026-07-02 (perf measured; decision unchanged, primary-marcher question answered).** GPU-benchmarked
> compile + per-draw cost (timer-query, RTX 2070 / ANGLE D3D11) — see the **Performance** section below and
> `plans/mb3d/research/faithful-marcher-perf-2026-07-02.md`. Result: **not a perf tax** (compile negligible; GPU
> free on smooth DEs, *faster* on the overshooting DEs it targets). Supports promoting it toward GMT's default
> marcher, not just an importer gate.

## Context

Imported MB3D scenes decode their **math** faithfully (279/0 cross-check), but several render
wrong because GMT and MB3D march that math **differently**. The render-pipeline spec session
(`plans/mb3d/research/`, ADR provenance in `render-pipeline-CORRECTIONS.md`) pinned the live MB3D
marcher as `TMandCalcThread.Execute` (`CalcThread.pas:128-258`) — NOT the dead `RayMarch`
(`Calc.pas:1815`) the importer had historically read. Its per-step update (`CalcThread.pas:196-230`)
differs from GMT's plain sphere-trace (`d += DE·fudge`, `trace.ts`) in three load-bearing ways:

1. **Lipschitz overstep clamp** — a new DE may not exceed `RLastDE + RLastStepWidth`
   (`CalcThread.pas:223`). An over-estimating / discontinuous fused DE that spikes upward is
   distrusted, so the ray can't launch past a thin surface.
2. **RSFmul convergence damper** — when the DE collapsed fast last step, shrink the next step to
   `∈ [0.5, 1]` (`CalcThread.pas:224-230`). The march decelerates onto a surface instead of
   overshooting it.
3. **msDEsub safety-subtraction** — subtract a fraction of the hit threshold from the DE before
   stepping (`CalcThread.pas:200`), gated by header `iOptions` bit 2 (`HeaderTrafos.pas:961-964`).

These three are precisely what stop a non-Lipschitz fused DE from scattering thin surfaces into
**"dust"** (DsyneGrafix-class, Recycledrelatives/Oxnot). GMT's answers to the same problem —
post-hit bisection refine (ADR-0084) and overstep candidate-recovery — are bolt-on band-aids;
MB3D bakes the fix into the step itself.

### The decisive finding: MB3D's marcher units are stepWidth-NORMALIZED, not world

`mVgradsFOV` (the march direction) is built unit-length, then rotated by the **stepWidth-scaled**
`VGrads` navigation matrix (`Calc.pas:1184/1193/1220`; `dStepWidth = 2.1345/(dZoom·Width)`,
`DivUtils.pas:1029`). So `mZZ`, the DE returned to the marcher, `msDEstop`, the `s011 = 0.11` step
floor, and the `mctMH04ZSD` max-step clamp all live in **stepWidth-normalized** units
(`Zend = (dZend−dZstart)/dStepWidth`, `HeaderTrafos.pas:779`). GMT's `h.x` (DE) and `d` are in
**world** units. Therefore porting MB3D's *absolute* step constants against GMT's world-unit DE
would be wrong by a factor of `dStepWidth` — it would render garbage.

But the three mechanisms above are **dimensionless**: the overstep clamp compares same-unit
distances, the RSFmul damper is a ratio of steps, and the safety-subtraction is a fraction of the
*hit threshold*. They port to any unit system unchanged — provided the hit threshold and step
divisor are GMT's own. And GMT already has the world-unit equivalents: `finalEps` (cone-traced,
depth-scaled, and DEstop-calibrated by the importer) is the world-unit twin of MB3D's `msDEstop`;
`floatPrecision` is the world-unit step floor; the importer already maps `sZstepDiv` to the step
divisor. MB3D's depth-scaling of `msDEstop` (`1 + mZZ·mctDEstopFactor`) is already supplied by
GMT's cone tracing (`pixelFootprint ∝ d`).

## Decision

Add a **compile-gated MB3D-faithful marcher** that ports MB3D's three dimensionless convergence
mechanisms onto GMT's existing world-unit threshold and step floor. We deliberately do **not** port
MB3D's absolute constants (`s011`, `msDEstop`, `mctMH04ZSD`) — they are stepWidth-normalized and do
not translate; GMT's `finalEps`/`floatPrecision` are their correct world-unit equivalents.

- **`trace.ts`** (`getTraceGLSL`, new `enableMB3DFaithful` param): three compile-gated blocks —
  loop state (`mb3dRLastDE/RLastStep/RSF/Primed`), a pre-hit block (overstep clamp + RSFmul damper),
  and a step block replacing `d += DE·fudge` with
  `step = max(floatPrecision·0.5, (h.x − uMb3dDEsub·finalEps)·uMb3dStepDiv·mb3dRSF)`. When off, every
  block is the empty string → the kernel is byte-identical to the standard march (the ADR-0084
  pattern). Wired into the **Main** trace only (the physics probe + path-tracer lean trace keep the
  standard march, mirroring `enableRefine`).
- **`ShaderBuilder`**: `mb3dFaithful` field + `enableMB3DFaithful()` setter, passed to `getTraceGLSL`.
- **`quality.ts`**: a hidden `mb3dFaithful` compile gate (importer-set) + two hidden uniform params
  `mb3dStepDiv` (`uMb3dStepDiv` ← MB3D `sZstepDiv`) and `mb3dDEsub` (`uMb3dDEsub` ← MB3D `msDEsub`).
- **`emitFusedHybrid.ts`**: every real `.m3p` import (the existing authored-header block) sets
  `mb3dFaithful: true` and derives the two params from header fields `parseMB3D` already reads
  (`zStepDiv`, `iOptions` bit 2 → the `HeaderTrafos.pas:961-964` quadratic remap + `msDEsub`). With
  the faithful step preventing overshoot, the round-2 `overstepTolerance` band-aid is set to 0 so the
  two recovery mechanisms don't compound. **No new header parsing** is required — eliminating the
  byte-offset risk of `bVaryDEstopOnFOV`/`sRaystepLimiter`.

## Consequences

- **Faithful where it matters.** The marcher now reproduces MB3D's surface-convergence behavior —
  the dimension that produces dust/fragmentation — without the unit-conversion fragility of porting
  absolute constants. This is the intended fix for the DsyneGrafix dust class and tightens surfaces
  on every import.
- **Default GMT untouched.** Off-path is byte-identical (verified: faithful-OFF trace GLSL carries
  zero MB3D tokens and retains the original step line; both ON/OFF grammar-parse clean). Native and
  standalone-library scenes (no authored `deStop`/`rStop`) never enter the faithful path.
- **All real imports change** — including the ~19 currently-certified scenes. The clamp+damper only
  *prevent overshoot* (they can't add it), so certified scenes should hold or sharpen, but they need
  a GPU re-glance. The gate is per-scene (`quality.mb3dFaithful`), so any regression can be scoped off.
- **Documented deviations (faithful in dynamics, not in absolute constants):** the `s011` floor is
  replaced by GMT's `floatPrecision` floor; `mctMH04ZSD`'s max-step clamp is omitted (rarely binds;
  GMT's `MAX_DIST`/`uMaxSteps` bound the march); MB3D's iteration-count back-step + in-set
  `RMresult=2` recovery are not ported (GMT's DE returns small distances in-set, so the `h.x<finalEps`
  hit catches them). The depth-scaled threshold uses GMT's cone tracing rather than `mctDEstopFactor`.
- **Step budget.** Fine-step faithful scenes (small `sZstepDiv`) plus the damper take more steps near
  surfaces; Max Steps is a user slider (and the importer's 1500-2000 budget covers the common case).
- **Supersedes the marcher claims** built on the dead `RayMarch` (`render-pipeline-CORRECTIONS.md`).
  @see ADR-0084 (refine band-aid), ADR-0085 (numeric DE), `plans/mb3d/research/render-conversion-plan.md`.

## Performance (measured 2026-07-02)

GPU timer-query bench (`debug/bench-shader.mts`, RTX 2070 / ANGLE D3D11, 1280×720, 600 draws / 100 warmup;
full data + method in `plans/mb3d/research/faithful-marcher-perf-2026-07-02.md`). `StepDiv=1.0` isolates the
marcher's own ALU at equal step count; `StepDiv=0.5` is the authored import default (≈2× steps).

| Formula | OFF | ON @ StepDiv 1.0 | ON @ StepDiv 0.5 |
|---|---|---|---|
| Mandelbulb (smooth DE) | 4330 µs | 4335 µs · **+0.1 %** | 5308 µs · +22.6 % |
| AmazingBox (overshooting DE) | 10117 µs | 8581 µs · **−15.2 %** | 10000 µs · −1.2 % |

- **Compile: negligible.** GLSL compile 14–16 ms both ways (+~1 ms); the ~2 s ANGLE HLSL link swamps the
  faithful blocks' +1.2 KB (+1.3 %) on a 90 KB shader. In/out toggle is a normal recompile.
- **GPU: free-to-faster at equal step size.** The overstep-clamp stops the sphere-tracer sailing past
  overshooting surfaces, so on the hard DEs this marcher targets it *removes* wasted deep marches — the
  cost is highest where the marcher has nothing to do (smooth DEs, +0.1 %) and negative where it does.
- **Only real cost** = the authored StepDiv 0.5 finer stepping (a **runtime** uniform, no recompile), and
  even that is break-even on overshooting DEs. Native scenes at StepDiv 1.0 pay nothing.
- Images matched off↔on (region-MAE to ~2 decimals) — the deltas aren't from rendering less.
- Consequence: the "Default GMT untouched" byte-identical-off guarantee above still holds, but the perf data
  removes the cost objection to making the faithful path the **default** marcher (native StepDiv 1.0). A real
  fused-import A/B and non-NVIDIA/mobile confirmation remain open (caveats in the perf doc).
