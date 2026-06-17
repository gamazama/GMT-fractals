# ADR-0066: Minibrot-nucleus (periodic) deep-zoom reference

**Status:** Accepted
**Date:** 2026-06-07
**Affects:** `engine/fractal/deepZoom/{nucleus.ts,referenceOrbit.ts,HighPrecComplex.ts,deepZoomWorker.ts,laRuntime.ts}`,
`engine/fractal/DeepZoomController.ts`, `engine/fractal/FractalColorRenderer.ts`,
`engine/fractal/shaders/fractalKernel.ts` (the kernel shared by fluid-toy + the
Gradient Explorer live-fractal mode), `fluid-toy/useDeepZoomOrbit.ts`.
Builds on ADR-0065 (auto-reference heuristics) — layered in front, not a replacement.

## Context

Perturbation + LA need ONE reference orbit. ADR-0065 made the reference *good*
by heuristics: relocate to the deepest point when the centre escapes, skip LA
when an interior reference meets an exterior view (`laUnsafe`), and build the
orbit long enough (folding `iterMul`) that pixels rarely run off its end —
where the kernel rebases to `orbit[0]`, an approximation valid only if the
reference is periodic with period = orbit length.

The canonical deep-zoom reference (FractalShark, Kalles Fraktaler, Imagina;
Phil Thompson's BLA write-up) is a **minibrot nucleus**: the centre c\* of a
period-P island. Its critical orbit returns to zero exactly every P iterations
(`z_P(c*) = 0`), so it is *exactly periodic*. Store ONE period and wrap the
reference index modulo P and you have an exact reference of unlimited length
from a tiny orbit. That:

- makes the orbit build cheap (P samples, not the multi-thousand zoom-depth
  budget) → cheap LA table too;
- makes the rebase-past-the-end EXACT (`orbit[P] = orbit[0] = 0`) instead of the
  ADR-0065 approximation;
- subsumes the relocation heuristic for interior-structured views — the nucleus
  *is* the deepest, most stable reference.

## Decision

Add a nucleus search, layered in FRONT of the ADR-0065 heuristics (on any
failure we keep the orbit/heuristics from ADR-0065 — zero behaviour change).

**1 — Period detection (`nucleus.ts` `detectPeriod`).** The Pauldelbrot /
atom-domain ball criterion (FractalShark `RefOrbitCalc.cpp`,
`SetPeriodMaybeZero`). Iterate the critical orbit while tracking the
c-derivative `d_{n+1} = 2·z_n·d_n + 1`; the period is the first `n` with
`|z_n|∞ < 2·radius·|d_n|∞`, where `radius` is the view half-diagonal — i.e. the
orbit has fallen back inside the period-n minibrot's atom domain at this view
scale. The comparison is done in EXACT fixed point (`HPComplex.chebyNorm` →
`HPReal.cmp`) so a huge derivative — which overflows f64 well before deep
periods — cannot false-trigger.

**2 — Newton to the nucleus (`nucleus.ts` `newtonNucleus`).** Newton's method on
`z_P(c) = 0`, refining the seed (the centre / relocated deepest point) to the
exact nucleus via `c ← c − z_P / z_P'` (z_P and its c-derivative computed
together). Needs complex division — added to `HighPrecComplex` (`HPReal.div`,
`HPComplex.div`, plus `chebyNorm`, `cmp`, `abs`, `sub`, `toDoubleDouble`).

**3 — One-period reference (`referenceOrbit.ts` `findNucleus`).** Build P+1
samples at the full-HP c\*, verify the defining property (`z_P ≈ 0`,
non-escaping) and that c\* lies inside the view, then adopt exactly ONE period
(indices 0..P-1, `orbit[0]=0`). Returns `period = P` and c\* (as a
double-double) as the reference centre — the kernel's `uDeepCenterOffset =
view − ref` machinery already supports ref ≠ view. Gated to deep
(`zoom < 1e-6`), power-2 Mandelbrot, interior references; only adopted when the
period is meaningfully shorter than the non-periodic orbit and below a work cap
(detection early-returns at the period, so the cost is bounded and usually
small).

**4 — Kernel modulo-period wrap (`fractalKernel.ts`).** New `uRefPeriod`
uniform. In the Mandelbrot PO loop the reference index wraps `ref -= uRefPeriod`
when it reaches the period (orbit[period]=orbit[0]=0, so dz_pert carries across
unchanged — exact), and at the LA→PO hand-off `ref %= uRefPeriod`. The Zhuoran
glitch rebase (`|z| < |dz|`) is unchanged and still applies. `uRefPeriod == 0`
keeps the ADR-0065 non-periodic rebase-to-`orbit[0]` fallback verbatim — so
fluid-toy (which never sets it) and every non-nucleus view are byte-identical.
Mirrors FractalShark's `RefIteration % GetPeriodMaybeZero()` (`LAKernel.cuh`).

**5 — Per-pixel cap = zoom-depth budget when periodic
(`FractalColorRenderer.ts`).** The per-pixel iteration cap was the orbit length
(can't iterate past a non-periodic end). A periodic reference wraps and stays
valid for unlimited iterations, so the cap becomes the full zoom-depth budget
(`deepBuildIter()`) — a deep minibrot view needs far more iters than the short
period to resolve its boundary; capping at the period would cut every
later-escaping pixel to interior (the ADR-0065 Fix-1b iteration cliff). This
also stabilises the cap across sub-ulp pans (it's now a function of zoom, not of
where the orbit escapes).

## Mapping to FractalShark

| FractalShark | GMT |
|---|---|
| `RefOrbitCalc.cpp` derivative ball test → `SetPeriodMaybeZero` | `nucleus.ts` `detectPeriod` (exact fixed-point ball criterion) |
| Newton to nucleus centre | `nucleus.ts` `newtonNucleus` (HPComplex) |
| GPU `RefIteration % GetPeriodMaybeZero()` (`LAKernel.cuh`) | kernel `ref -= uRefPeriod` (PO) / `ref %= uRefPeriod` (LA hand-off) |
| Period-length reference orbit | `findNucleus` one-period orbit (indices 0..P-1) |

## Consequences

- **Exact, cheap reference for minibrot dives.** Interior deep views now build a
  P-sample orbit + a small LA table and wrap it exactly, instead of a
  multi-thousand-sample non-periodic orbit rebased approximately. The render
  matches the non-periodic baseline (verified: interior-ref view, period 168,
  Δ central-dominant ≈ 0.000 LA-on vs LA-off; orbit 8340→168).
- **ADR-0065 heuristics remain** as the fallback (no nucleus found / Newton or
  verification fails / exterior views / power≠2 / Julia / shallow zoom). The
  `laUnsafe` ring probe and deepest-point relocation still run.
- **ADR-0065 Fix 5 (`laUnsafe`) re-scoped:** the "interior reference, exterior
  view → skip LA" case is now usually a *proper nucleus dive* — LA stays on
  against the exact periodic reference and renders correctly. `laUnsafe` still
  fires when no nucleus is found. The glitch smoke's interior-ref assertion was
  updated from a structural "LA skipped" check to a render comparison.
- **Shared kernel:** `uRefPeriod` defaults to 0 → fluid-toy and all non-nucleus
  paths unchanged. fluid-toy threads `res.period` through but only Mandelbrot
  power-2 deep views can produce a non-zero period. **fluid-toy still needs an
  independent visual glance** (deep Mandelbrot zoom) before merge.
- **Perf:** period detection adds one derivative-tracking orbit pass that
  early-returns at the period (cheap when a nucleus exists); Newton adds
  ~period×steps HP iterations (bounded by `NUCLEUS_MAX_PERIOD`). Net win at
  depth: far shorter orbit + LA builds, and a stable iteration cap.

## See also

- `engine/fractal/deepZoom/nucleus.ts` — `detectPeriod` + `newtonNucleus`.
- `engine/fractal/deepZoom/referenceOrbit.ts` — `findNucleus` integration.
- `engine/fractal/shaders/fractalKernel.ts` — the `uRefPeriod` wrap.
- `debug/smoke-deep-zoom-nucleus.mts` — period/Newton + integration smoke.
- `refSoftware/FractalShark/FractalSharkLib/RefOrbitCalc.cpp`,
  `FractalSharkGpuLib/LAKernel.cuh` — reference implementation.
- ADR-0065 — the auto-reference heuristics this layers on top of.
- ADR-0064 — the LA→PO reference-index handoff (the `ref` the wrap acts on).
