# Ramp analysis + deep stop fit — plan

Written 2026-09-12, out of the competitor scan (`plans/ge-v2-research/competitors.md` §5.3, §8.3).
Two features in one doc because they share a measurement core: both sample a 256-step ramp, both
measure it in OKLab, and both want to run once at bake time over the whole catalogue as well as
interactively over one gradient.

Neither is started. This is the design, the seams they land on, and what has to be falsified before
any of it is trustworthy.

---

# Part A — ramp analysis as filter axes

## A1. What already exists (read this before designing anything)

`palette/core/facets.ts` is 80% of this feature and it shipped a while ago. It computes five
normalised 0..1 axes per ramp — `lightness`, `chroma`, `complexity`, `rainbow`, `warmth` — plus a
`raw` block (meanL, meanC, hf, hueSpreadDeg, meanHue, meanA, hueOrder). The plumbing around it:

- `computeFacets(ramp)` — the metric pass. Ported from palette-lab's `refine.py`.
- `FilterWindows` + `passesFilters(facets, windows)` — the predicate.
- `pickerModel.ts` — `windowsFromSlice`, `activeWindowCount`, and the `passesFilters` call that
  carves the wall.
- `QualityRangePadConnected.tsx` / `HueLightnessPad.tsx` — the pad UI.
- **`debug/bake-palette-catalog.mts:170`** — facets are computed **at bake time**, per entry, and
  ride in the `.json.gz` beside the ramps in `.bin.gz`. Runtime cost of an existing facet is zero.

So "add a filter axis" is a known, exercised path: extend `Facets`, extend `computeFacets`, extend
`FilterWindows` + `passesFilters`, re-bake, add a control. That is the whole shape of Part A.

## A2. The honest delta

Two of the metrics from the competitor-scan conversation are **already covered** and must not be
duplicated:

| Proposed | Verdict |
|---|---|
| "hue travel / rainbow-ness" | **already `rainbow`** — chroma-weighted hue spread, 360 − largest empty arc on a 36-bin wheel |
| "complexity / bandedness" | **already `complexity`** — OKLab high-frequency residual after a width-9 low-pass |

What is genuinely absent is everything about **shape and fitness**, as opposed to
**colour content**. Every existing facet answers "what colours are in here". None answers "what does
this ramp do to data laid under it". That is the new axis family:

1. **Lightness monotonicity / shape class**
2. **Perceptual uniformity** (speed flatness)
3. **CVD robustness**
4. **Greyscale survival**
5. **Gamut headroom**

## A3. The metrics, defined

All operate on the same `ramp: RGB[]` (256 samples) `computeFacets` already receives, and reuse
`rgbToOklab` / `oklabDistance` from `palette/core/oklab.ts`. No new dependency.

### A3.1 Lightness profile → `shape`

Take `L[i]` = OKLab L of sample i. Smooth lightly (the same width-9 low-pass `complexity` uses, so
8-bit quantisation noise doesn't create phantom turning points — **reuse it, don't write a second
smoother**). Count sign changes in `dL`, ignoring runs below a noise floor.

- 0 sign changes → **sequential**. L rises (or falls) throughout.
- 1 sign change → **diverging**. One interior extremum: the classic two-ramps-from-a-midpoint shape.
- `|L[0] − L[255]|` small, hue wraps ≥ ~300° → **cyclic**.
- otherwise → **decorative**. Not a criticism — most of the catalogue is art, not a colormap.

Also record `monotonicity` as a continuous 0..1: the fraction of total |dL| travel that moves in the
dominant direction. A ramp that rises 95% of the way and dips once scores 0.9, and stays findable;
a hard enum alone would throw that away.

**Why it matters.** A non-monotonic ramp makes the viewer read every bright region as "high value",
so the colormap invents structure the data doesn't have. This is the standing case against
`jet`/rainbow in scientific imaging (Rogowitz & Treinish), and why matplotlib's default moved to
viridis.

### A3.2 Perceptual uniformity → `uniformity`

`speed[i] = oklabDistance(ramp[i], ramp[i+1])` — 255 values. A perceptually uniform ramp has a flat
speed curve: equal steps in data look like equal steps in colour.

`uniformity = 1 − (stdev(speed) / mean(speed))`, clamped — i.e. one minus the coefficient of
variation. Cheap, scale-free, and it degrades gracefully.

Two named failure modes fall straight out of the same array and are worth keeping in `raw`:
- **false boundaries** — `max(speed) / mean(speed)`. A spike is an edge the eye sees where the data
  is smooth.
- **dead zones** — the longest run with `speed < mean/4`. The data changes; the colour doesn't;
  the information is invisible.

This is Kovesi's central metric (*Good Colour Maps: How to Design Them*, 2015) and what `viscm`
plots — it's how viridis was designed.

### A3.3 CVD robustness → `cvdSafe`

Simulate protanopia / deuteranopia / tritanopia (Machado et al. or Viénot — small fixed 3×3
matrices, no dependency needed), then **re-run A3.1 and A3.2 on each simulated ramp**. Score:

`cvdSafe = min over the three of (monotonicity × uniformity)`

Derived, not a separate metric — which is what makes it nearly free. This is ColorBrewer's
"colourblind-safe" flag, computed rather than hand-assigned.

### A3.4 Greyscale survival → `greySafe`

Set chroma to zero, keep L. Score = `monotonicity × (L range retained)`. This is "photocopy-safe",
and it doubles as a decent proxy for whether a gradient has structural integrity or is coasting on
hue alone.

### A3.5 Gamut headroom → `gamut`

Fraction of samples outside sRGB (and, separately, inside P3). GE has sRGB / Linear / ACES output
profiles, so a gradient that sings in ACES and clips in sRGB should say so rather than quietly
flattening. Lowest priority of the five — include the number, skip the filter chip.

## A3.6 Decided 2026-09-12 — `shape` ships as *group by*, and it needs no re-bake

Two decisions from the owner that change this section's cost:

**`shape` is an `Arrange → group by` axis, not a filter chip.** The wall splits into four labelled
bands. This is also the safer first home for a new classifier — a misgrouped gradient is visible and
harmless, where a misfiltered one is invisible — so it doubles as the way to tune the thresholds by
eye before anything depends on them.

**The plumbing is ~30 lines and touches three places:**

| File | Change |
|---|---|
| `palette/features/paletteFilters.ts` (`groupByParam`, line 32) | append `'shape'` to `['none','theme','bundle']` — **append**, so persisted indices in `paletteFiltersPersist` don't shift |
| `palette/core/pickerModel.ts` (~line 265) | the `groupAxis === 'theme' \|\| 'bundle'` branch already groups by an arbitrary string key per entry; add the shape key |
| `palette/core/pickerModel.ts` (~line 282) | the arrange sentence — "by shape" |

**And it does not need the bake.** `shape` can be computed lazily at first use and memoised, the way
`usePickerModel.ts:337` already does for `similarityIndex` — "16 samples per entry pulled straight
out of the packed ramp buffer, O(list) ONCE per anchor change". A shape classifier wants ~32 L
samples, not 256; the subsampling is also a free low-pass that kills the 8-bit quantisation noise
A3.1 would otherwise have to smooth away.

So group-by-shape sidesteps **all** of §A6: no bundle format change, no re-bake, no `facetsVersion`,
no stale-CDN trap. Those return only when an axis needs to be *filtered* at catalogue scale.

The real work is not the plumbing, it's the classifier and its thresholds — §A7 stands unchanged,
and the viridis/jet check is still the thing to write first.

## A4. Minimal shipping set

The ask was "a minimal filter setting". Three axes, not five:

| Axis | Type | Control |
|---|---|---|
| `shape` | enum (sequential / diverging / cyclic / decorative) | four toggle chips, beside the existing source chips |
| `uniformity` | 0..1 | one more range row in QualityRangePad |
| `cvdSafe` | 0..1 | one more range row |

`greySafe` and `gamut` get **computed and stored** in the same pass (they cost nothing once the CVD
simulation is written) but ship without UI. Baking a metric is the expensive, irreversible half —
adding its chip later is an afternoon. Bake all five, expose three.

`shape` is the one worth leading with: it's categorical, instantly legible, and it's the thing a
visualisation person searches for by name.

## A5. Where the changes land

| File | Change |
|---|---|
| `palette/core/facets.ts` | extend `Facets` (+ `raw`), extend `computeFacets`, extend `FilterWindows` + `passesFilters` |
| `palette/core/cvd.ts` *(new)* | the three simulation matrices — pure, no deps |
| `debug/bake-palette-catalog.mts` | nothing, if the metrics live inside `computeFacets` (line 170 already calls it) |
| `palette/core/pickerModel.ts` | `windowsFromSlice` + `activeWindowCount` for the new windows |
| `palette/components/QualityRangePadConnected.tsx` | two range rows |
| `gradient-explorer/v2/BrowseStage.tsx` | the `shape` chips in the Filters block |

Note the shape of that table: **one new file**. Everything else is an extension of a function that
already exists and is already called from the right place.

## A6. The trap — baked bundles are versioned by nothing

`catalogLoader.ts` loads `core.*` locally and lazy-fetches `softology.*` / `cptcity.*` **from the R2
CDN**. Re-baking produces new `.json.gz` files, but a user's browser (or the CDN edge) can hold an
old one, and the licensed bundles are gitignored out of the public deploy — so the local and CDN
copies drift independently by design.

**A freshly-baked `core` and a stale CDN `softology` will coexist in one merged catalogue**, and
half the wall will have `undefined` where `uniformity` should be. `passesFilters` must treat a
missing metric as **pass, not fail** — a gradient with no data must not silently vanish from an
unrelated filter — and the count badge should say how many entries couldn't be judged.

Cleanest fix: a `facetsVersion` integer in each bundle's `.json`, and the loader flags entries below
the current version. That is genuinely new — nothing versions these today.

## A7. What to falsify before trusting any of it

Per CLAUDE.md, a metric with no failing command behind it is an `@assumption`, not an `@invariant`.
Before any of these get annotated as contracts:

- **Hand-label ~40 catalogue gradients** by shape class and check the classifier against them. The
  noise floor for "ignore this sign change" is the whole ballgame and it cannot be picked from
  first principles — `facets.ts` says its own normalisers were "tuned against the real catalog", and
  this is the same job.
- **Check the knowns.** viridis / magma / cividis must come out sequential, uniform, CVD-safe. A
  synthesised `jet` must come out non-monotonic and CVD-unsafe. If those don't land, the metric is
  wrong, not the colormap. This is the single highest-value test and it belongs in a
  `test:palette`-chain harness.
- **Distribution sanity.** Run over all ~11k and look at the histogram. An axis where 95% of the
  catalogue scores 0.9+ is not a filter, it's a constant — and the normaliser needs work.

---

# Part B — deep stop fit

## B1. What already exists

`palette/core/stopFit.ts` is a strong fitter, documented at the top of its own file:

- corner pre-seed on adjacent OKLab ΔE
- **plateau → step stops** (flat runs become one `step` stop per band, exact by construction)
- **refine-to-worst-rendered-error** — measured against GMT's real interpolation, not a chord
  approximation, which is why the header correctly claims it beats Douglas–Peucker
- **bias + interpolation trial before spending a stop** (`fitBias`): measured 13.3 → 7.4 stops on 40
  synthetic gradients at a *lower* worst error
- `seedStops` to stop interior stops walking on re-bake (measured: 16.9 → 18.8 → 19.2 → 19.6% over
  three bakes without it)
- `measureFit(config, ramp) → { maxDE, meanDE, stops }`

Two gaps, both structural rather than algorithmic:

1. **No user surface.** All eight call sites invoke it implicitly at ingest with hardcoded
   constants — `maxStops: 24` (GeneratorSourceRow), `targetDE: 0.02, maxStops: 32` (ImageStage,
   importGradientFiles, gradientSeam), a detail-derived budget (workingPipeline). Nobody can ask for
   fewer stops, see the count, or see the error.
2. **`fitBias` is off by default** — the flag that bought 13.3 → 7.4 — because the legacy GMT seam
   needs crisp bands. Only the v2 working pipeline opts in.

## B2. The blend-space search

The owner's idea, and it's the strongest thing in this document.

`renderStopsToRamp(stops, blendSpace, colorSpace)` is **already parameterised** — `presetCatalog.ts`
calls it as `renderStopsToRamp(p.stops, 'oklab', 'srgb')`. But `stopFit` is hardwired to `'oklab'`
(its header says so in the first paragraph). So the fitter currently answers "fewest stops *in
OkLCh*" and calls it "fewest stops".

Six live spaces to search: `spectral` · `rgb` · `oklab-rect` · `oklab` · `cielch` · `hsv`.
(`hsv-far` is marked retired, renderer-only — exclude.)

**Why this wins.** The interpolator is doing work the stops would otherwise have to pay for. A
rainbow sweep is *two stops* in a polar-hue space (`hsv`, `oklab`, `cielch`) and a dozen in `rgb`,
because polar hue-lerp already traces the arc. Conversely a paint-mixing ramp may fall out of
`spectral` in three stops and need many in any linear space. Every gradient has a space that is its
cheapest description, and we currently guess one for all of them.

### The constraint that makes this subtle

**Changing `blendSpace` changes the gradient's identity, not just its encoding.** Refit a gradient in
`hsv`, export it to CSS — which interpolates in sRGB or OKLab — and the export does not match what
the user saw. The stop list is only half the gradient; the interpolator is the other half.

So the search has two legitimate modes, and they must be distinct in the UI:

- **Cheapest description** — search all six, keep the winner, store `blendSpace` alongside. Valid for
  GMT's own pipeline and any format that carries an interpolation mode. This is the "reduce stops"
  the owner asked for.
- **Fit for target** — fit in the space the *consumer* actually interpolates in, and search only over
  stop count / positions / bias. CSS wants sRGB or OKLab; `.grd` wants Photoshop's; Fractint `.map`
  is 256 explicit entries so the question doesn't arise; `.ugr` wants Ultra Fractal's.

The second mode is the one that quietly fixes export fidelity, and it's a better feature than the
first. It should not be buried: a gradient exported to CSS today is fitted in OkLCh and rendered by
the browser in something else, and **nobody has measured that error**. Measuring it is a half-day and
might be the most valuable single number in this document.

## B3. Three algorithmic upgrades

**Backward elimination.** Greedy insertion converges near-minimal, not minimal. After it settles, try
deleting each stop in turn, re-measure with `measureFit`, keep the deletion if still under tolerance,
repeat to fixpoint. Bounded, trivial to write, strictly non-worsening.

**Exact minimal count by DP.** Precompute `cost[i][j]` = best achievable error on the segment i→j
over {linear, smooth, step} × a bias grid, then dynamic-program the fewest segments whose every cost
≤ ε. 256 samples ≈ 33k candidate segments — milliseconds. This works unusually well *here*: GE's
stops carry **per-segment** bias and interpolation, so segment cost is genuinely local. The coupling
that normally ruins this formulation (shared endpoint colours) is the only one left.

**Let stop colours leave the curve.** A stop currently takes the ramp's colour at its texel. Minimax
approximation theory says the best fitting segment doesn't pass through its endpoints — letting
colours drift slightly off-curve roughly halves max error for the same stop count, hence fewer stops
at the same tolerance. A short Gauss–Newton pass on max-ΔE after the knots are fixed.

Expected stacking, **unmeasured and to be checked rather than believed**: elimination and DP attack
the same slack, so they will not add up; colour refinement is orthogonal to both; the blend-space
search is orthogonal to all three and probably the largest single win.

## B4. Tiering — two fitters, one core

The near-realtime fitter **stays exactly as it is**. `workingStore.ts:580` already notes the profiler
caught `fitRampToStops` live on every pointer move; nothing in this plan goes near that path.

The deep fit is a separate, explicitly-invoked entry point:

| | realtime (today) | deep (new) |
|---|---|---|
| budget | a few ms | seconds, progress-reported |
| invoked | implicitly, at ingest and on drag | from a menu, by the user |
| searches | one space, greedy | 6 spaces × {DP, elimination} × colour refinement |
| output | a `GradientConfig` | a **ranked table** the user picks from |
| runs in | main thread | Worker |

The Worker matters: six spaces × a DP pass × colour refinement is not a frame's work, and this must
never be the thing that makes the hero stutter.

## B5. The surface

A "Reduce stops…" item on the existing Stops menu (which already holds copy / paste / reverse /
distribute / flip), opening a small panel:

- **Quality** — a slider mapped to `targetDE`, labelled in plain language (Identical / Close /
  Loose), not in ΔE. The mapping must be calibrated against real gradients, not asserted.
- **Max stops** — a cap, defaulting to the current call-site value so nothing changes silently.
- **Search blend spaces** — a checklist, all six on by default, with the identity warning from B2
  stated in one line.
- **Fit for** — GMT (keep blendSpace) / CSS / Photoshop / Ultra Fractal. Drives B2 mode two.
- **Allow** — step stops · bias · smooth. `fitBias` becomes visible instead of a hardcoded flag.

Result: a table, one row per candidate — space, stop count, max ΔE, mean ΔE — sorted by stop count,
with the current gradient shown as a row so the comparison is honest. Hover previews the candidate on
the hero; click applies it. One undo step.

**The count belongs in the UI even when nobody opens the panel.** "9 stops" next to the gradient name,
and the whole feature becomes discoverable rather than a menu item nobody finds.

## B6. Why this pays off twice

Beyond the feature itself: `.grd`, `.ugr`, `.ase` and CSS all get ugly and large at 32 stops, and the
stop count an export inherits today is whatever the *ingest path* happened to hardcode — an image
drop gives 32, a generator source gives 24, for no reason the user can see or control. Deep fit is
the lever that makes exports clean, and "fit for target" is the one that makes them *correct*.

## B7. Guard

`debug/test-palette-stopfit.mts` (or an extension of whatever currently exercises `stopFit`) with:

- **the invariant that actually matters**: deep fit never returns more stops or worse max ΔE than the
  realtime fitter on the same input, across the catalogue sample. That is the one command that should
  go red if any of B3 is wrong, and per CLAUDE.md it must be **run against a deliberately broken
  fitter** before it gets cited as proof of anything.
- a fixed corpus (~40 gradients: smooth, banded, rainbow, near-greyscale) with committed expected
  counts per blend space, so a regression in any single space is visible.
- determinism: same input → byte-identical output, matching the existing `rampGeometry` harness's
  contract.

---

# Sequencing

Part A and Part B are independent and can land in either order. If they land together, do A's metric
core first — `oklabDistance` over a ramp, the smoother, the speed array — because B's error reporting
wants the same primitives.

1. **A: metric core + the viridis/jet check.** Worthless without the falsification; do them together.
2. **A: bake + `facetsVersion` + missing-metric-passes.** The compat trap is cheaper to fix now than
   after a stale CDN bundle is in the wild.
3. **A: three chips.** The visible half, and the smallest part of the work.
4. **B: measure the CSS export error** (B2). Half a day, and it decides how loudly "fit for target"
   deserves to be sold.
5. **B: elimination + blend-space search in a Worker**, behind the menu. The two biggest wins.
6. **B: DP + colour refinement**, if 5 leaves anything on the table.

# Open questions for the owner

- **Does `shape` belong as a filter chip or as an `Arrange → group by` axis?** Grouping the wall into
  four labelled bands may read better than filtering it down, and the wall already supports group-by.
  This is a browse-design question, not a technical one.
- **Should deep fit be allowed to change `blendSpace` silently?** It is the cheapest-description win
  and it is also a change to what the gradient *is*. My instinct is that the table shows it and the
  user picks — never automatic — but that makes it a two-click feature rather than one.
- **Does the scientific-viz angle get pursued at all?** A3 is worth building either way for the wall,
  but `shape` + `uniformity` + `cvdSafe` over 11k is also the entire basis of a "colormap finder"
  aimed at an audience GE has never addressed. That's a positioning decision, not a code one.
