# Handoff: Nucleus-Reference for Deep-Zoom (Period Detection + Periodic Reference)

**Use this file as the prompt for a fresh execution session.** It is self-contained.
Branch: `exec/livefractal`, worktree `H:/GMT/workspace-gmt/wt-lf`. Read it top to bottom,
then read the files in "Read first" before changing anything.

---

## You are an execution session in GMT (deep-zoom fractal renderer)

GOAL: Replace the current deep-zoom reference-selection *heuristics* with a proper
**periodic (minibrot-nucleus) reference**, the technique FractalShark and Kalles
Fraktaler / Imagina use. This is the unifying fix that should (a) make deep-zoom orbit
builds cheap (one period of orbit + modulo-wrap instead of long/relocated BigInt orbits),
and (b) subsume several of the reference-quality heuristics we currently stack.

This continues a 5-round deep-zoom effort (ADR-0065). The glitches are FIXED already; this
session is about doing it *properly and performantly*, not fixing a visible bug.

### Read first
- `docs/adr/0064-la-po-reference-index-handoff.md` and
  `docs/adr/0065-deep-zoom-auto-reference-glitch-fix.md` — the full history. ADR-0065 is the
  big one: it documents Fixes 1–7 (escaping-ref relocation, iteration cliff, stripe/LA gate,
  iterMul orbit length, interior-ref `laUnsafe`, cursor-zoom, auto-epsilon).
- `engine/fractal/shaders/fractalKernel.ts` — the SHARED kernel (fluid-toy + Gradient
  Explorer). The LA pre-pass + PO loop, including the rebase rules. The kernel rebases the
  reference index to `orbit[0]` when it runs off the end — valid only if the reference is
  periodic with period = orbit length. **This is the crux nucleus-reference fixes.**
- `engine/fractal/deepZoom/referenceOrbit.ts` — orbit builder + the current reference
  heuristics: `searchBetterReference` (deepest-point grid search), `isViewExteriorDominated`
  (the `laUnsafe` ring probe), f64/HP probes. These are the heuristics nucleus-reference
  should largely REPLACE.
- `engine/fractal/deepZoom/laBuilder.ts` + `LAInfoDeep.ts` + `laParameters.ts` — LA
  construction (FractalShark port). Note `periodDetectionThreshold` params already exist;
  the builder DETECTS period for stage construction but we don't yet use a periodic
  reference or modulo-wrap at runtime.
- `engine/fractal/deepZoom/HighPrecComplex.ts` — BigInt fixed-point complex (`HPComplex`,
  `HPReal`). You'll need this for Newton's method on the nucleus.
- `engine/fractal/deepZoom/dd.ts` — double-double helpers (`ddAddF64`, `ddSub`).
- Reference impls in `H:/GMT/refSoftware/FractalShark`: `FractalSharkLib/RefOrbitCalc.cpp`
  (period detection via the derivative/ball criterion, `SetPeriodMaybeZero`),
  `FractalSharkGpuLib/LAKernel.cuh` (the GPU `RefIteration % GetPeriodMaybeZero()` wrap).
  User has confirmed FractalShark is the canonical reference.

### Background reading (already done, summarized)
- Phil Thompson BLA article (philthompson.me/2023/Faster-Mandelbrot-Set-Rendering-with-BLA…):
  picks a minibrot nucleus via **ball-arithmetic period-finding + Newton's method**, computes
  the orbit for **one period only**, and wraps the reference cyclically. That's exactly this
  task. (Its auto-epsilon idea is already implemented as ADR-0065 Fix 7.)

---

## The problem nucleus-reference solves

Perturbation/LA needs ONE reference orbit. Our current approach:
1. Build the orbit at the view centre.
2. If it escapes early → grid-search the view (BigInt probes) for the deepest point and
   rebuild there (`searchBetterReference`).
3. If the centre is interior but the view is exterior → skip LA (`laUnsafe`).
4. Build the orbit long enough to cover `iterMul` (up to 200k), capped.

This works (glitches fixed) but:
- The relocation search + deep/long BigInt orbit builds are the real perf cost on deep views
  (the headless "18 s" was a SwiftShader red herring — measure the worker's internal
  `buildMs`/`laBuildMs`, which are the truth: 6–214 ms on the tested coords, but they grow
  with depth/iterMul and on weaker hardware).
- Rebasing to `orbit[0]` past a non-periodic orbit end is only *approximately* right; a true
  period makes it exact.

A **periodic reference** (a minibrot nucleus near the view) fixes all of this: its orbit is
exactly periodic, so you store **one period** and the kernel wraps `ref = (ref + step) %
period`. Short orbit → cheap build + cheap LA table. Exact wrap → no rebase-past-end
approximation. It's the canonical deep-zoom reference.

---

## Scope / plan (suggested — refine after reading)

1. **Period detection (worker/CPU).** Given the view centre + zoom, find the period of a
   nearby minibrot. FractalShark uses a ball-arithmetic / derivative criterion during the
   reference iteration (`RefOrbitCalc.cpp`, `SetPeriodMaybeZero`); our `laBuilder` already
   has a period-detection ratio. Decide: reuse our LA period detection, or port
   FractalShark's ball criterion. Output: a period `P` (or 0 = none found).
2. **Newton to the nucleus (worker/CPU, HighPrecComplex).** Refine the view centre to the
   actual minibrot nucleus center `c*` with period `P` via Newton's method on
   `f_P(c) = 0` (the period-P iterate returns to 0). Needs HP complex + derivative. This is
   the mathematically meatiest part.
3. **Build a one-period reference orbit at `c*`.** Reuse `buildOrbitAt`; cap at `P` (+ small
   margin). Return `c*` (DD) as the reference centre (the kernel's `uDeepCenterOffset =
   view − c*` machinery already supports ref ≠ view — see `DeepZoomController.bindUniforms`).
4. **Kernel: modulo-period wrap.** Add a `uRefPeriod` uniform; where the PO/LA path currently
   rebases on `ref >= uRefOrbitLen - 1`, wrap `ref %= uRefPeriod` instead when a period is
   known (no rebase needed for a periodic ref). Keep the existing rebase path for the
   non-periodic fallback. **SHARED KERNEL — gate carefully; fluid-toy uses it too.**
5. **Fallback + integration.** When no period is found (exterior-only views, or Newton
   fails), fall back to the existing relocation/`laUnsafe` heuristics — don't remove them,
   layer nucleus-reference *in front*. Wire the period through worker → runtime →
   DeepZoomController → kernel uniform.
6. **Retire heuristics where the nucleus path supersedes them** (only after it's proven) —
   e.g. the deepest-point grid search may become unnecessary for interior-structured views.

Evaluate doing period-detection-only first (cheap win: cap orbit at period, modulo-wrap)
before the full Newton-nucleus refinement, if Newton proves hard.

---

## Constraints (critical)

- **Shared kernel with fluid-toy.** Any kernel change benefits both but a regression breaks
  both. Gate on: `npm run smoke:deep-zoom-orbit`, `smoke:deep-zoom-la`, `smoke:fluid-toy`,
  `npm run smoke:gx-fractal-glitch` (the deep-zoom glitch regression — escaping-square,
  stripe-square, interior-ref), `npx tsx debug/smoke-gx-fractal-deepzoom.mts`, and `tsc 0`.
  These are algorithmic/structural and won't catch shader-render regressions → **visually
  verify**.
- **Headless GPU is SwiftShader (~1 frame/3 s)** and starves the worker thread — wall-clock
  build times are MEANINGLESS headless (the "18 s" was this). Measure the worker's internal
  `buildMs`/`laBuildMs` (exposed in `lastDeepStats`). For visuals, render via the
  `window.__fractalRenderer` debug handle and Read the PNG.
- **Don't break the existing fixes.** ADR-0065 Fixes 1–7 must keep passing. `calibrateLA`
  stays default ON (user A/B'd it — calibrate was faster on the tested section).

## Verification tooling (already built this session — reuse)
- `debug/repro-gx-epsilon.mts` — stats-only probe across coords (orbitLen, relocated,
  laUnsafe, epsLog2, worker buildMs/laBuildMs). `CALIB=0` env disables calibration.
- `debug/repro-gx-blacksections.mts` — renders two sub-ulp-apart deep coords + blackFrac
  (iteration-cliff / pan stability).
- `debug/repro-gx-deepiter.mts` — black-out / iterMul-artifact coords.
- `debug/repro-gx-check.mts` — single-coord LA-on vs LA-off + central-dominant square detector
  (`ITERMUL`, `ONLY_ON` env).
- `debug/repro-gx-zoomanchor.mts` — cursor-anchored-zoom precision check.
- `debug/smoke-gx-fractal-glitch.mts` — the regression gate (square detector + laUnsafe assert).
- Repro coords (all Mandelbrot, deepZoom on):
  - escaping-square: `center [-0.8647752352263411, 0.2422927873189491], zoom 6.87e-8, iterMul 3.25`
  - interior-ref (laUnsafe): `center [-0.6396519243564869, 0.447970190714411], centerLow [-3.66e-17,-9.39e-18], zoom 5.24e-8`
  - blacksect / iteration-cliff: `center [-0.6933148194504128, 0.29059116796937007], centerLow [4.63e-17,1.67e-17], zoom 1.17e-17`
  - seahorse control (no relocation needed): `center [-0.743643887037151, 0.13182590420533], zoom 1e-9`

Dev server: `npm run dev` (port 3400, gradient-explorer.html). NOTE: editing a store's
exports can wedge Vite HMR (the test's dynamic import resolves to a re-instantiated module) —
restart the dev server if `__fractalRenderer`/overlay stops mounting with no console error.

## Deliverables
- Period detection + (ideally) Newton-nucleus refinement in the worker; one-period reference
  orbit; kernel modulo-period wrap behind a uniform; period threaded through the stack.
- Fallback to existing heuristics when no period found.
- New ADR-0066 documenting the technique + the FractalShark mapping; update ADR-0065 @see.
- A smoke that asserts a known minibrot view gets a periodic reference (short orbit) and
  renders correctly (matches the non-periodic baseline).
- All gates green; surface any fluid-toy uncertainty for independent review before merge.

## State at handoff
Nothing committed — all deep-zoom work sits in the `exec/livefractal` worktree (11 files
changed). See `git -C H:/GMT/workspace-gmt/wt-lf diff` and the memory note
`project_deep_zoom_glitch_fixes.md` for the full picture.
