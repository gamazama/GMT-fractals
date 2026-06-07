# ADR-0065: Fix the residual deep-zoom colour glitches (auto-reference + stripe/LA gating)

**Status:** Accepted
**Date:** 2026-06-07
**Affects:** `engine/fractal/deepZoom/referenceOrbit.ts` + the worker/runtime contract,
and `engine/fractal/shaders/fractalKernel.ts` (the kernel shared by fluid-toy + the
Gradient Explorer live-fractal mode). Supersedes the ⚡ LA workaround toggle from ADR-0064.

## Context

ADR-0064 fixed the *common* LA→PO "square tile" by threading the orbit reference
index through the LA walk, then shipped an **"⚡ LA" toggle** as a stop-gap for two
**residual** wrong-coloured-block artifacts it couldn't fully solve. Turning LA off
(pure perturbation) made both go away but cost the LA acceleration. The canonical
reference renderer **FractalShark** (`refSoftware/FractalShark`, user-confirmed)
solves both upstream rather than via a toggle. This ADR ports the right techniques so
**LA stays ON and correct**, and removes the toggle.

Two distinct artifacts existed (both reproduced via `debug/repro-gx-glitch.mts` /
`debug/repro-gx-stripe-square.mts` → Read the PNGs):

### Artifact 1 — wrong-coloured square where the reference orbit escapes early
At views where the **view-centre reference orbit escapes early** (e.g. orbitLen 588
while the view has interior/minibrot structure needing far more), the LA tables built
from that short, escaped orbit are an unreliable accelerator for the interior pixels →
a coherent wrong-coloured block in the L∞ (Chebyshev) region where LA applies. Pure PO
(LA off) renders it correctly. Repro view:
`{center:[-0.8647752352263411,0.2422927873189491], zoom:6.87e-8, iterMul:3.25, colorMapping:0}`
(orbitLen 588).

### Artifact 1b — iteration "cliff" / big black sections that pop on a hair of pan
A related facet of the same bad-reference problem (found after the first fix landed):
at a view where the view-centre orbit escapes early, the per-pixel iteration cap is the
reference orbit length, so pixels that escape *later* than the reference are cut off to
the interior colour (black). Because a sub-ulp pan changes where the centre escapes
(orbitLen 3991 ↔ 3822), the cut-off (black) regions jump — flipping ~10% → ~50% of the
frame black between two views that differ only in the DD lo word. Repro views:
`center [-0.6933148194504128, 0.29059116796937007]`, lo `[4.63e-17,1.67e-17]` (good) vs
`[4.77e-17,1.78e-17]` (mostly black), `zoom 1.17e-17, colorMapping 0`.

### Artifact 2 — diagonal colour-offset square in stripe/trap modes
At extreme zoom with **stripe/trap colouring** (`colorMapping` 5-9/13) or the
**derivative** modes (10/11) and a high `gradientRepeat`, a diagonal-edged colour-
offset block appears inside the L∞ LA region — even when the reference does NOT escape
(`relocated:false`). Repro view:
`{center:[-0.9156735264832646,0.2767818751974872], centerLow:[9.86e-20,7.69e-20],
zoom:5.76e-25, colorMapping:9, gradientRepeat:32}` (orbitLen 4722, non-escaping).

## Root causes (diagnosed, reproduced, fixed)

1. **Artifact 1 = bad reference, not bad kernel.** Perturbation + LA are only as good
   as the reference orbit. An *exterior* view centre produces a short escaped orbit
   whose LA linearisation is valid over a tiny dc region with accumulating error for
   the interior pixels. FractalShark addresses reference quality upstream (period
   detection in `RefOrbitCalc.cpp`; the GPU walk wraps `RefIteration % PeriodMaybeZero`
   to extend a periodic orbit). Serious renderers (Kalles Fraktaler / Imagina) also
   *search the view for a deeper reference* than the raw centre.

2. **Artifact 2 = LA/AT skip the per-iteration colour accumulator.** The stripe
   (Härkönen sum), orbit-trap (`minT`), and derivative (`dz·dc`) statistics are
   computed **only in the PO loop**, once per iteration. LA and AT skip many iterations
   per step, so an accelerated pixel samples those stats over far fewer iterations than
   the pure-PO surround → a coherent offset inside the LA region. **FractalShark never
   combines stripe colouring with LA** for exactly this reason.

## Decision

**Fix 1 — auto-reference search for the DEEPEST point (worker-only; kernel untouched).**
`computeReferenceOrbit` now, when the Mandelbrot view-centre orbit *escapes early*,
searches the view for the **deepest reference centre** (longest orbit) and rebuilds the
orbit there. A coarse centre-outward grid is followed by local **refine passes** at
finer spacing around the running best (the boundary is fractal — the coarse grid only
approximates the deepest point); probes run to the full `maxIter` so a truly interior
(non-escaping) point is detected and escaping candidates are ranked by true depth. The
deepest point is the right reference for BOTH facets: its orbit outlasts every pixel in
the view, so (1a) the LA tables are a valid accelerator for the interior, and (1b) no
pixel runs past the reference into the escaped orbit tail (the iteration cap = orbit
length now covers the view's latest-escaping pixel) — and because the chosen point is a
stable feature of the view, the cap no longer jitters with sub-ulp pans, killing the
black-section popping. It returns the **reference centre it actually used**
(`refCenterX/Y/LowX/LowY`); both hosts (`FractalColorRenderer`, fluid-toy's
`useDeepZoomOrbit`) pass *that* (not the view centre) to
`DeepZoomController.setReferenceOrbit`. The kernel **already** supports a reference ≠
view centre via `uDeepCenterOffset = (view − ref)` (DD subtraction in `bindUniforms`,
the same machinery that absorbs pan/zoom between rebuilds), so **the shared GLSL kernel
needs no change** — the lowest-risk path for a kernel shared with fluid-toy. The search
is opt-in: a non-escaping centre (seahorse and every well-behaved view) never relocates,
so there is no behaviour change there.

Tunables (`referenceOrbit.ts`): coarse `SEARCH_GRID = 9`, `REFINE_GRID = 5` ×
`REFINE_PASSES = 2`, probe to full `maxIter` (cost is bounded by actual escape times,
not the cap — exterior candidates escape early and an interior point short-circuits).
`RELOCATE_MIN_RATIO = 1.05` / `RELOCATE_MIN_ABS = 64` — relocate readily (the deepest
point is always the better reference) while avoiding churn on a negligible gain. The
candidate carries its `(ox, oy)` offset so the refine pass recentres without a DD
subtraction of two near-equal centres (which cancels catastrophically at deep zoom).
Verified: at the repro pan, both views relocate to a consistent deep point
(orbitLen ≈ 4600–4700 either side) and black coverage drops from 10%/51% → ~5%/~5%.

**Fix 2 — gate LA + AT off for per-iteration colour modes (kernel runtime gate).**
`laActive`/`atActive` now also require `!perIterColor`, where
`perIterColor = (uTrackAccum != 0) || (uTrackDeriv != 0)`. When a stripe/trap/derivative
mode is active the kernel takes the pure-PO path (visits every iteration → correct
accumulators); all other colour modes keep LA/AT. This is a **runtime** gate on existing
uniforms, so it respects the live `colorMapping` knob without a rebuild, and mirrors
FractalShark's "no stripe + LA".

**Fix 3 — build the reference orbit long enough to cover the per-pixel cap
(`iterMul`).** The kernel rebases the reference index to `orbit[0]` when it runs off the
end — valid ONLY if the reference is periodic with period = orbit length. Previously the
orbit was built to the zoom-depth budget but the GPU per-pixel cap was that × `iterMul`,
so at `iterMul > 1` every pixel rebased many times past a non-periodic orbit end →
"crazy artifacts" (and at `iterMul = 1`, a non-escaping reference capped the view at the
zoom-depth budget → cut-off black where the view needed more iters). Now
`FractalColorRenderer` folds `iterMul` into the *build length* (`deepBuildIter =
deepRefIter × iterMul`, capped at `MANDEL_MAX_DEEP_ITER = 200k`) and the GPU cap is just
the orbit length — so the kernel **never iterates past the orbit end**. "More iterations"
means a genuinely longer reference, not a short one reused beyond its validity. `iterMul`
becomes a rebuild trigger at deep zoom (the host wires it). This is the same gap as
FractalShark's period-wrap, solved by sufficient orbit length (works for non-periodic
references too) instead of period detection.

**Fix 4 — cursor-anchored zoom holds at deep zoom.** `zoomAt` computed the anchor
correction as `canvasToFractal(before) − canvasToFractal(after)`, which adds the pixel
offset to the centre (~0.7) then subtracts two near-equal results — at deep zoom the
offset (≪ the centre's f64 ulp) cancels to ~0, so the zoom drifted toward the centre
instead of the cursor. Rewritten to work in OFFSET space (`(u·2−1)·aspect·(zoomBefore −
zoomAfter)`), never touching the centre — the anchor now holds to the full f64 range
(verified: 0 px drift after 40 zoom-ins to 1e-10).

**Fix 5 — skip LA when an INTERIOR reference meets an EXTERIOR-dominated view.**
A residual square survived the deepest-point search: at views where the centre is a
*genuinely interior* point (non-escaping, even at 4× iterMul) but the surrounding view
is almost all exterior, the LA tables (built from a bounded orbit) mis-accelerate the
exterior pixels in the L∞ region → they never escape → a black square. The deepest-point
search doesn't fire (the centre doesn't escape) and can't help (the interior centre is
already the longest orbit). Pure PO against the same reference renders it correctly
(LA-off proof). So `computeReferenceOrbit` probes a ring of view-boundary points
(`isViewExteriorDominated`); when the reference is interior but a majority of the ring
escapes, it returns `laUnsafe: true` and the worker **skips the LA-table build** — the
kernel falls back to pure PO (correct, just slower). Genuine minibrot dives
(interior-dominated views, ring mostly interior) keep LA. Worker-only, so fluid-toy
benefits identically and the shared kernel is untouched. Verified: at the repro view the
central colour distribution drops from `dominant 0.765` (black square) to `0.354`
(matches the pure-PO baseline exactly). Cost: a bounded ring probe (early-terminates on
verdict) on non-escaping-centre builds only.

**Fix 7 — auto-epsilon: calibrate the LA validity threshold per build.** Our LA tables
used FractalShark's FIXED `laThresholdScale = 2^-24`; Phil Thompson's BLA write-up shows
that's too loose at depth (LA applied where its linearisation is inaccurate). The worker
now binary-searches the LARGEST threshold scale whose LA result still matches pure
perturbation at a grid of view test points — a CPU port of the kernel's LA-walk + PO
tail (`epsilonCalibration.ts`) compared against plain-PO ground truth (escape status,
smoothIter, and the bounded perturbation z). Kept as a SAFETY NET: in our architecture
the gross glitches are already fixed upstream by reference quality (Fixes 1/1b/1e), so
calibration usually returns the loose default (no-op) or tightens with no visible change;
its value is catching subtle LA inaccuracy the reference heuristics miss. Cheap (≈0–15 ms;
the worker compute for a whole build is 6–214 ms — the headless "18 s" was SwiftShader
starving the worker thread, not real cost). The chosen ε is exposed in `lastDeepStats`.
**Render-cost caveat:** when calibration tightens (e.g. -53) the LA *node count* is unchanged but the
validity *thresholds* shrink, so the kernel does more pure-PO and less LA-skipping → slower FRAMES, with
no visible gain where reference quality already handles the view. Gated behind
`FractalColorParams.calibrateLA` (default ON) so it can be A/B'd — `calibrateLA: false` uses the fixed
2^-24 (pre-auto-epsilon frame speed). Whether to keep it ON by default is an open call pending
real-hardware A/B.

**Perf: f64 candidate probes.** The deepest-point search and the exterior-ratio ring
probe now rank candidates in plain f64 where the view resolves in 53 bits
(`f64ProbeOK`) — ~100× faster than the BigInt path — falling back to HP only below
~1e-13. The chosen reference is always rebuilt in full precision, so f64 only affects
ranking.

**Remove the ⚡ LA toggle.** With the artifacts fixed at the source, the toggle is an
obsolete (and now misleading) workaround. Removed from the GX overlay and
`fullscreenStore`; the renderer's internal `useLA` stays default-on. (Fixes 1–5 cover
the escaping-reference square, the iteration cliff, the stripe square, the iterMul
artifacts, and the interior-reference square — the cases the toggle used to work around.)

## Mapping to FractalShark

| FractalShark | GMT |
|---|---|
| `Perturb.cuh` / `LAKernel.cuh` rebase `|Z+dz|² < |dz|²` → `dz←Z+dz; RefIteration=0` (Zhuoran) | already in the kernel PO loop (`zMag2 < dzPertMag2` rebase) — unchanged |
| `RefOrbitCalc.cpp` periodicity → `SetPeriodMaybeZero`; GPU `RefIteration % PeriodMaybeZero` | analogous goal (a reference that doesn't run out); achieved by relocating to a non-escaping centre instead of period-wrapping |
| Reference quality handled upstream of the GPU kernel | auto-reference search in the worker (`searchBetterReference`) |
| Never combines stripe colouring with LA | `perIterColor` gate forces pure PO for accumulator/derivative modes |

A secondary-reference *recompute* (Pauldelbrot flag-and-second-pass) was evaluated and
**not** needed: relocating to one good reference clears Artifact 1 in a single pass, and
the per-iteration-colour modes only need LA disabled, not a second reference.

## Consequences

- **LA stays on and correct.** Verified by screenshot diff: the known-glitch view's
  central region matches the LA-off baseline (`Δ central-dominant ≈ 0.000`), relocating
  588 → 1628 orbit; the stripe view's diagonal block is gone; seahorse + spike +
  elephant unaffected. `debug/smoke-gx-fractal-glitch.mts` is the regression guard
  (programmatic square-detector).
- **fluid-toy benefits identically** — both fixes live in shared code (worker +
  kernel); the same latent bugs existed there. The auto-reference change is gated to
  Mandelbrot-escaping views, and the per-iter-colour gate only changes
  accumulator/derivative modes — but because the kernel is shared, **fluid-toy needs an
  independent visual glance before merge** (deep zoom + a stripe/trap colour mode).
- **Perf:** the auto-reference search adds a bounded set of capped escape probes to the
  off-thread orbit build only when the centre escapes (gesture-settle latency, not
  per-frame). Per-iteration-colour modes lose LA/AT acceleration at deep zoom (pure PO);
  acceptable and matches the reference renderer. All other modes keep full acceleration.
- **Contract change:** `RefOrbitResult` / worker response / `RefOrbitRequest` gained
  `refCenter*` (+ `relocated`, `aspect`, `disableAutoReference`). Both call sites updated.

## See also

- **[ADR-0066](0066-deep-zoom-nucleus-reference.md)** — the minibrot-nucleus
  (periodic) reference, layered IN FRONT of these heuristics: for interior
  minibrot dives it adopts the exact period-P nucleus (a one-period orbit the
  kernel wraps modulo P) instead of relocating to a long non-periodic orbit, and
  re-scopes Fix 5 (`laUnsafe`) — that "interior reference, exterior view" case is
  usually a proper nucleus dive now, where LA stays on and correct.
- `engine/fractal/deepZoom/referenceOrbit.ts` — `searchBetterReference` + `probeOrbitLength`.
- `engine/fractal/shaders/fractalKernel.ts` — the `perIterColor` LA/AT gate.
- `refSoftware/FractalShark/{FractalSharkGpuLib/LAKernel.cuh,Perturb.cuh}`,
  `FractalSharkLib/{LAReference.cpp,RefOrbitCalc.cpp}` — reference implementation.
- ADR-0064 — the LA→PO handoff fix + the (now-removed) ⚡ LA toggle this supersedes.
- ADR-0063 — the fractal-coloring engine carve (this kernel's home).
- `debug/smoke-gx-fractal-glitch.mts` — square-detector regression smoke.