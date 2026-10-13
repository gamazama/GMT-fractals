# MandelBolic in the deep zoomer - build plan

Written 2026-10-09 after a CPU study. Nothing in the renderer or the shell has been changed for this yet.
The owner's go: "go. yeah stills 2 and 3 look good. yes the burning mode is also epic lets keep it."

## What is decided

- **The surface drawn is the level of the estimate taken from the true derivative** (the ray estimate), not
  the set and not GMT's scalar estimate. The owner chose it from the stills.
- **Burning Mode is in**, as a switch with its mix amount. GMT's default MandelBolic look has it on.
- Power 2 first (the formula's default). Z Twist does not exist in this formula; Phase Twist is a constant.

## What the CPU study measured (tools: `debug/scratch/formula-study/`, git-ignored, plain node)

| Fact | Number | Tool |
|---|---|---|
| The delta step is exact, off the plane too | f64 4e-14; 24-bit mantissas 3e-6 to 3e-5 (the bulb's kernel in the same harness: 9e-5) | `dz-delta-check.mjs bolic` |
| The same with Burning Mode | f64 2e-15; 24-bit 7e-7 (power 3 with other parameters: 2e-6) | `dz-delta-check.mjs bolicburn` |
| The set is a low dome over the Mandelbrot plane | 0.19 to 0.24 high over the main cardioid, iteration caps 26 to 2000 | `h-probe.mjs` |
| GMT's look is the estimate's surface | the default view with Burning on, drawn by the ray estimate, matches `public/thumbnails/fractal_MandelBolic.jpg` | `bolic-still.mjs preset` |
| A copy of the set exists at depth | period 28 near c = i, 6.4e-21 across; period 40: 6e-30; period 54: 1.7e-40 | `bolic-still.mjs scan` |
| Around the copy every ray hits | camera 0.6 to 400 copy-sizes away; coherent feathery structure at 16 samples a pixel, speckle at 1 | `bolic-still.mjs ladder`, `hero` |
| GMT's scalar estimate fails at depth | 0.1 to 1 % of the ray estimate; all 72,000 rays ran out of 534 steps at three of four distances | `bolic-still.mjs ladder` |
| Iterations a hit needs at that place | 90 to 250 (median 94 to 222 by distance) | same |
| Steps a ray on the CPU | 37 to 83, step 0.6 x the ray estimate, hit under 0.4 pixel | same |

Not measured: anything on the GPU; a deep view with Burning on; powers above 2 as pictures; any place other
than the neighbourhood of c = i; the camera far above the plane at depth.

## The maths the kernel needs

The formula (`engine-gmt/formulas/MandelBolic.ts`), power p, Z = (x, y), T = z:

    m  = 1 - C T^2 / |Z|^2
    Z' = Z^p e^(i twist) m + c_xy
    T' = p |Z|^(p-1) T B + fold T|T| |Z|^(p-1) + shells sin(T) |Z|^(p-1) + c_z + offset

Burning Mode (`engine-gmt/features/geometry/index.ts`, grep `addPerIterInject`) runs at the top of every
iteration, before the formula: `z = mix(z, abs(z), mix)`.

**Reference in the plane.** With the reference orbit in the plane T = 0 (c_z = -offset) the reference is a
2D orbit Z_k (the Mandelbrot orbit; the Burning Ship orbit with Burning on), and for a pixel z = (Z + d, tau):

    rho'^2 = |Z|^2 + 2 Re(Z conj(d)) + |d|^2            the pixel's own |Z|^2, no cancellation
    dm     = -C tau^2 / rho'^2                          m of the pixel is 1 + dm
    dW     = (Z + d)^p - Z^p                            binomial; for p = 2: 2 Z d + d^2
    d'     = e^(i twist) ( dW (1 + dm) + Z^p dm ) + dc_xy
    tau'   = p B rho'^(p-1) tau + fold tau|tau| rho'^(p-1) + shells sin(tau) rho'^(p-1) + dc_z

The pixel's height IS its delta, so Height Fold and Shells need no reference term. Burning:
`d <- (1 - k) d + k (|Z + d| - |Z|)` per axis by cases on the signs (never a subtraction of near-equal
numbers), `tau <- (1 - k) tau + k |tau|`.

The reference is indexed from the origin (Z_0 = 0, Z_1 = c). A pixel starts at index 1 with d = dc. A rebase
(|z| < |d|, or the reference has run out) is `d = z, index = 0`: no subtraction. At index 0 the step is the
formula itself on z. This is what `bolic-still.mjs` does (there with a periodic nucleus reference that wraps).

**The estimate.** Carry J = dz/dc (three columns, mantissas + one exponent, as `jacStep` does for the bulb):

    ray estimate   = 0.5 r ln r / |J v|          step and hit (v = the ray's direction)
    field estimate = 0.5 r ln r / |J^T z^|       position only: for the normal taps and the CPU handles
    normal         = J^T z^ / |J^T z^|           what the stills are shaded with

GMT's sigma-max running derivative is NOT carried: it is the number that fails.

## Limits of this plan, said up front

1. **Depth is reached toward the plane.** The reference lies in the plane under the camera; the camera's
   height enters as a constant part of dc. Detail finer than about 1e-7 of the camera's height cannot be
   told apart in f32. Flying down toward the plane has no such limit. A fin far above the plane can be
   zoomed about as far as GMT can today. The cure, if he wants it later, is a full 3D reference at the
   camera (stage 8): its delta step is already checked (first row of the table).
2. **Iteration counts are the Mandelbrot's.** 90 to 250 at 6e-21 near c = i; a seahorse-valley dive needs
   thousands. The kernel's loop is 512 passes and `RAY_ITER_MAX` is 400 (grep both in `core.js`).
3. **No skipping at first.** The ray variant has no BLA, and resumed orbits (bit 4) need an error model
   for this map that does not exist yet. Stage 3 runs whole orbits; stage 7 wins time back.
4. **One sample a pixel is speckle.** The picture needs the accumulation the renderer already has.

## Stages

Each stage ends with something that can be seen or a check that has been seen red.

0. **CPU, before any shader.** In `bolic-still.mjs`: a reference at an arbitrary plane point (not a
   nucleus) with the rebase, checked against BigInt orbits with 24-bit mantissas; Burning with that
   reference; one deep still with Burning on for the owner. Decides nothing new, removes the two
   unmeasured items the shader depends on.
1. **The seam in the module** (`deep-zoom/renderer/core.js`, `index.ts`). A create option and
   `api.setFormula(kind, params)`; the shader variant key gets the formula; the escape radius becomes a
   uniform (three sites, grep `> 4.0`); a camera-offset uniform (the camera minus the reference point, HDR).
   With the bulb selected the shader text and every uniform value are what they are today.
   Check: parity stays 52 lines, direct proof and the node checks stay green.
2. **Reference and CPU twin.** BigInt plane orbit (complex; abs for Burning), its rows, the upload; the
   orbit as a JS function (lifted from `bolic-still.mjs`) for the CPU handles the navigation reads
   (`sense`, `freeDistance`, `estimateAt`, grep them in `core.js`).
   Check: a node check, twin against exact BigInt orbits; seen red with one term of the step removed.
3. **The kernel.** `pertOrbit` for MandelBolic behind `#ifdef`, same `OrbitOut`: delta step, height
   channel, Burning, rebase, J; `de` = the field estimate, `rde` = the ray estimate. March with ray bits
   1 | 2 (step and hit), no resumed orbits, no line-against-the-ball, far hand-off off (the deep march
   draws every distance), normal = the hit orbit's gradient.
   Seen: the default view and the 6.4e-21 copy beside the CPU stills of the same views.
4. **Proof on the GPU.** Lines added to `smoke:deep-zoom-direct`: the GPU's estimates on a grid of rays
   against the CPU twin at two depths, Burning off and on. Seen red with the rebase branch broken.
   No new smoke.
5. **The shell.** `dzFormula` gets the formula choice and MandelBolic's rows (Hyp. Scale, Conformal Cone,
   Phase Twist, Z-Offset, Height Fold / Shells, Burning + mix); `host/paramMap.ts`; scenes and places
   carry the formula; starter places: the whole object, the 6.4e-21 copy, one deeper.
6. **Iterations.** The margin rule (grep ITERATIONS AS A MARGIN) read from the camera point's own orbit
   (it leaves through the height channel even when the point under it is inside the set); the loop bound
   and `RAY_ITER_MAX` raised for this variant; measured in ms at the three starter places.
7. **Time.** Only after 6 has numbers: resumed orbits with an error model derived for this map, the
   line-against-the-ball rule (valid as it stands only for B = C = 1, where the norm squares exactly),
   skipping (GMT's 2D linear-approximation code in `engine/fractal/deepZoom/` is the model).
8. **Later, each his call:** powers above 2; a full 3D reference for depth away from the plane; a
   nucleus reference chosen automatically; the gradient colouring's mappings for this formula.

## Open before stage 1

- An ADR goes with stage 1 (a second formula in the deep zoomer, drawn by the true-derivative estimate,
  reference in the plane). ADR writes raise their own prompt.
- On 2026-10-09 another chat had uncommitted edits in `deep-zoom/renderer/core.js`. Stage 1 starts from a
  clean tree: `git status` first, and name whose changes are whose.
- Size, a guess: about 350 to 450 lines in `core.js`, 150 in the shell, one node check.
