# The Mandelbox in the deep zoomer - build plan

> **As built, 2026-10-09 (the same day):** stages 1 to 5 are done and the decision is ADR-0135. Stage 0(a)
> was dropped on the owner's word ("dont worry about amazingbox"). What differs from the text below: the
> reference carries BOTH fold planes per axis and both sphere radii as mantissa + exponent (eight numbers,
> not five); the iteration ceiling is 500, not 400 (one place at 7.7e-59 needs about 395); `core.js` grew by
> 631 lines, not 300 to 400; the defaults are the standard Mandelbox (scale 2, min radius 0.5, folding limit
> 1, fixed radius 1). Still open: stages 6 to 8, the formula in a recorded flight, a ray estimate for the
> navigation, the f32 noise line on the GPU.

Written 2026-10-09 after a CPU study. Nothing in the renderer or the shell has been changed for this yet.
The owner's word: "ok lets do the mandelbox, with the negative scale option". MandelBolic
(`MANDELBOLIC.md`, beside this file) is parked, not rejected.

## What is decided

- The formula is GMT's `AmazingBox` (`engine-gmt/formulas/AmazingBox.ts`): pre-rotation, box fold, sphere
  fold, `* scale + c`, with `dr = dr * k * |scale| + 1`.
- **Negative scale is in.** GMT's own Scale row runs 1 to 4; the deep zoomer's runs over negative values too.
  Opening GMT's row is a separate, small change and his call.

## What the CPU study measured (tools: `debug/scratch/formula-study/`, git-ignored, plain node)

| Fact | Number | Tool |
|---|---|---|
| The delta step is exact, fold crossings included | scale 2 at 1e-41: f64 6e-15, 24-bit mantissas 3.5e-6 (the bulb's kernel in the same harness: 9e-5) | `dz-delta-check.mjs box 110` |
| Space is stretched alike on all three axes at every depth | widest / narrowest 1.2 to 1.8 from 1e-3 to 1e-40 (bulb 40 to 100) | `dz-shape-check.mjs box2` |
| GMT's own estimate holds at every depth | 0.45 to 0.67 of the true gradient, 1e-3 to 1e-40 | same |
| Iterations | scale 2: 2.7 to 3.0 a decade; scale -1.5: hits on 81 / 162 / 182 at 3.4e-20 / 2.7e-50 / 1e-58 | same; `box-still.mjs dive` |
| It can be drawn at depth | scale -1.5 at 3.4e-20, 2.7e-50 and 1e-58: clean, intricate (`box-hero-neg15.png`); 20 to 80 steps a ray | `box-still.mjs dive -1.5` |
| Detail depends on the place | scale -1.5, four random surface places: one intricate at all three depths, one intricate at 9e-18 and smooth below, two smooth or streaked throughout. Scale 2, one place: smooth terraced walls at all three depths | `box-dive-s*.png` |
| Too many iterations past the natural count is noise | 24-bit: a cap of 110 clean, 128 noise at 1e-41 (scale 2). A pixel needs about 8 to 21 past the camera's own escape | `dz-delta-check.mjs box 128` |

**Not reproduced:** my CPU drawing of GMT's default AmazingBox view (`box-still.mjs preset`) does not look
like `public/thumbnails/fractal_AmazingBox.jpg`. The whole-object views do show the Mandelbox cube. Cause not
found: the camera, the Chebyshev metric the preset uses, or the thumbnail coming from another view. Stage 0
settles it against GMT itself.
Not measured: anything on the GPU; pre-rotation at depth; scales other than 2 and -1.5; why a place is
intricate or smooth (my reading, untested: a deep view shows the Julia set of the camera's own point).

## The maths the kernel needs

Per iteration, reference iterate V, pixel V + d, constant offset dc:

    rotation     U = R V,  d <- R d                                   (R a constant matrix)
    box fold     per axis: clamp difference cd by cases on which side of +-L the reference and the pixel
                 stand, from the reference's own distances U - L and U + L;   e = 2 cd - d
    sphere fold  W = folded U, r2 = |W|^2, q = 2 W.e + |e|^2, pixel's r2' = r2 + q
                 k = minR-region: fixedR^2 / minR^2 · between: fixedR^2 / r2 · outside: 1
                 k' - k by cases on the two regions, from the reference's own r2 - minR^2 and r2 - fixedR^2
    step         d' = scale ( k' e + (k' - k) W ) + dc
    derivative   dr' = dr k' |scale| + 1      (the pixel's own, a plain mantissa + exponent: no delta form needed)
    estimate     (r - 1) / dr, with an escape radius far above GMT's 10 (the stills use 1000): at 10 the
                 estimate jumps about a tenth between iteration bands and the picture shows rings

Both folds are continuous, so `|d'| <= scale k |d|` across a crossing: the delta never jumps. No trig, no
square root in the reference: the BigInt map is multiplies and one divide.

**Reference rows** (per iteration, from BigInt): V; W and r2; the three fold distances; the two sphere
distances; the region. The five distances are the numbers a crossing test compares a delta against, so each
goes in as mantissa + exponent, not as a plain float.

## What carries over from the renderer as it is

- The reference at the camera and the BigInt camera (`makeHP`, `buildRefOrbit`): only the map changes.
- The page's march and hit test, the four-tap normals, the depth buffer, shading, accumulation, the
  navigation by rays: they read `de`, and this formula's `de` is good. The ray estimate is not needed:
  with equal stretch on every axis it says what `dr` says.
- The margin rule for iterations (grep ITERATIONS AS A MARGIN): it reads the camera orbit's own stretch.

What does not: the rebase-to-the-origin block (bulb only; the plain rebase `d = z - Z0` stays), the
line-against-the-ball rule and the bend measure Q (off), the three plain-f32 copies of the bulb for the far
field (a box copy each, or the far hand-off moved out so the deep march draws every distance).

## Stages

0. **CPU, before any shader.** (a) Find why the default view does not match the thumbnail: draw GMT's own
   default AmazingBox with GMT (the headless formula-to-PNG loop) and with `box-still.mjs`, same camera.
   (b) Pick starter places that stay intricate, positive and negative scale, with a short search over
   places instead of the first random one. (c) The orbit with every stored value at 24 bits and the
   distances as mantissa + exponent, against BigInt, at the depth-matched cap.
1. **The seam in the module** (`deep-zoom/renderer/core.js`, `index.ts`): a create option and
   `api.setFormula(kind, params)`; the variant key carries the formula; the escape radius becomes a uniform
   (grep `> 4.0`). With the bulb selected, shader text and uniforms are what they are today.
   Check: parity stays 52 lines; direct proof and node checks green.
2. **Reference and CPU twin.** The box map in `makeHP`, the rows, the upload; the orbit in JS (from
   `box-still.mjs`) for the CPU handles (`sense`, `freeDistance`, `estimateAt`).
   Check: a node check, twin against exact orbits; seen red with one case of a fold removed.
3. **The kernel.** `pertOrbit` for the box behind `#ifdef`, same `OrbitOut`; the page's march.
   Seen: the stills' views on the GPU beside the CPU stills.
4. **Proof on the GPU.** Lines added to `smoke:deep-zoom-direct` (GPU estimate against the CPU twin on a
   grid of rays, two depths, both signs of scale). Seen red with a fold case broken. No new smoke.
5. **The shell.** `dzFormula` gets the formula choice and the box's rows (Scale with negative values, Min
   Radius, Folding Limit, Fixed Radius, Pre-Rotation); `host/paramMap.ts`; scenes and places carry the
   formula; the starter places from stage 0.
6. **Iterations and speed, measured.** ms a frame at the starter places; the cap rule checked against the
   24-bit noise line above.
7. **Time, only with numbers from 6:** resumed orbits, skipping runs that cross no fold.
8. **Later, each his call:** Julia mode; KaliBox, Kleinian and the fold family from the same two pieces;
   GMT's own Scale row opened to negative values.

## Open before stage 1

- An ADR goes with stage 1 (a second formula in the deep zoomer, as a shader variant).
- On 2026-10-09 another chat had uncommitted edits in `deep-zoom/renderer/core.js`. Start from a clean tree:
  `git status` first, and name whose changes are whose.
- Size, a guess: 300 to 400 lines in `core.js`, about 150 in the shell, one node check.
