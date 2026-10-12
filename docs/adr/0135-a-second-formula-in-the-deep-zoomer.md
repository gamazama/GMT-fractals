# ADR-0135: A second formula in the deep zoomer - the Mandelbox, as a shader variant with its own reference rows

- **Status:** Accepted
- **Date:** 2026-10-09
- **Relates to:** ADR-0134 (the navigation by rays: its CPU handles now run the selected formula's orbit).
  Code: `deep-zoom/renderer/core.js` (grep `THE FORMULA SEAM`, `BOX_KERNEL`, `buildBoxOrbit`,
  `boxOrbitJS`, `boxParts`, `BOX_ITER_MAX`, `HOLD THE ESTIMATE`), `deep-zoom/renderer/index.ts`
  (`setFormula`, the invariants), `deep-zoom/features/formula.ts` (`kind` and the box's rows),
  `deep-zoom/boxScale.ts` (the dead band of Scale), `deep-zoom/host/paramMap.ts` (the `formula` push),
  `deep-zoom/locations.ts` (a place carries its formula), `deep-zoom/data/boxStarters.ts`.
  Guards: `npm run check:deep-zoom-box-orbit`, `npm run smoke:deep-zoom-direct` (the Mandelbox lines),
  `npm run check:deep-zoom-param-map`, `npm run check:deep-zoom-module-host`,
  `npm run smoke:deep-zoom-parity` (the Mandelbulb is what it was).
  The study behind it (pure node, its logs, tools and stills): `debug/scratch/formula-study/` (git-ignored);
  the plan it was built from: `plans/deep-zoom-shell/MANDELBOX.md`.
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

> **Update 2026-10-11 (the page's program retired for the Mandelbulb; decisions 2 to 4 unchanged):**
> decision 1's "the module at its defaults still equals the frozen page" and the guard
> `npm run smoke:deep-zoom-parity` named above are superseded by ADR-0137: the Mandelbulb is drawn
> by the ray march's program alone and the parity smoke is gone. In decision 3, "the page's march"
> is now the page's step rule inside the Mandelbox's own program, and "the skip table" and "the
> Jacobian variant" it names no longer exist. Whether the Mandelbox can take the ray march's step
> is a math session of its own (`plans/deep-zoom-shell/NEXT.md`, session 8).

> **Update 2026-10-12 (the navigation's ray on the Mandelbox; decisions unchanged):** the
> Consequences' "Not done: ... the navigation's rays step by half" no longer holds. Since `95d4c129`
> the box's CPU ray takes the whole scalar estimate (grep `rayFreeJS` in `deep-zoom/renderer/core.js`):
> half the steps, and at most 0.78 % of rays more than 5 % past the careful ray over 13 views. The
> bulb's ray is as it was. Decision 3 stands: the owner looked at the Mandelbox's ray step for the
> PICTURE, timed against today's march at the same picture, and left it out
> (`plans/deep-zoom-shell/ADR-DRAFT-box-ray-step.md`, not filed).

## Context

The deep zoomer drew one formula, the Mandelbulb, and `core.js` was that formula throughout: the
arbitrary-precision map, the reference rows, the kernel step, the far field, the CPU referees.
The owner asked which other formulas could go in. Four were measured on the CPU before anything
was built (delta step against exact orbits at 1e-41; stretch per axis and GMT's own estimate at
surface points from 1e-3 to 1e-40; stills):

- **Radiolaria, Mandelorus, MandelBolic** each have an exact delta step, and each flattens at
  depth - one axis lost (Radiolaria), mostly sheets (Mandelorus), sheets everywhere but on one
  plane (MandelBolic). For the last two GMT's scalar estimate reads 1e-3 to 1e-5 of the real
  distance, so what GMT draws is the estimate's own level surface. MandelBolic was planned
  (`plans/deep-zoom-shell/MANDELBOLIC.md`) and parked by the owner when it turned out that depth
  is reached only toward its plane.
- **The Mandelbox** (GMT's `AmazingBox`: pre-rotation, box fold, sphere fold, `* scale + c`)
  stretches space alike on all three axes at every depth (widest / narrowest 1.2 to 1.8; the
  bulb measured the same way: 40 to 100), GMT's own estimate stays 0.45 to 0.67 of the true
  gradient, and its delta step is exact through fold crossings: both folds are continuous, so a
  delta never jumps when a pixel and the reference stand on opposite sides of a fold. The classic
  look needs a NEGATIVE scale, which GMT's own Scale row (1 to 4) does not reach.

The owner chose the Mandelbox, with negative scale.

## Decision

1. **A formula is a shader variant, chosen by `api.setFormula(kind, params)` / the create option
   `formula`.** The Mandelbulb is the default and its preprocessed shader text, uniforms and
   pictures are unchanged: the module at its defaults still equals the frozen page.
2. **A formula supplies four things:** its map in the fixed-point code, its reference rows, its
   kernel step in GLSL returning the same `OrbitOut`, and the same orbit in JS for every CPU
   handle (the probes, the referees, the navigation's rays).
3. **The Mandelbox is drawn by the page's march on its own scalar estimate `(r - 1) / dr`** -
   hit test, four-tap normals, depth buffer and shading as they are. It does not use the ray
   march, the skip table, the Jacobian variant, the line-against-the-ball rule or the rebase to
   the origin: those are the Mandelbulb's, and with equal stretch on every axis the ray estimate
   says what `dr` says.
4. **The distances a crossing test compares a delta against go to the shader as mantissa +
   exponent, from fixed point:** both fold planes per axis and both sphere-fold radii. As plain
   floats they pass every test except a camera standing next to a fold surface.
5. **Escape radius 1000 for the Mandelbox** (a uniform of its variant; GMT's 10 leaves rings),
   and **the iteration count stands a margin above where the camera's own orbit escapes**
   (the existing margin rule, read at that radius), up to 500.
6. **In the shell the formula is a row of `dzFormula`;** a place, a share link and a pasted
   location carry the formula and its numbers, and one without them means the Mandelbulb.
   Switching formula moves the camera to the new formula's whole-object view in the same undo
   step. Scale is one signed row; a store rule moves a value inside (-1.02, 1.02) to the nearer
   end, where the renderer has nothing to draw.
7. **`holdEstimate`** (off in the module, on in the shell): while the camera's own orbit has not
   escaped within the count, the last estimate of the camera's distance is kept instead of 0.
   Found while proving the Mandelbox; in the Mandelbulb a still started in that window differed
   from a settled one on 36.9 % of pixels (0.01 to 0.43 % with the option).

## Consequences

- The Mandelbox runs to the precision the fixed-point code carries. Measured on an RTX 5070 Ti,
  a 256 x 256 draw: scale -1.5 at 3.4e-20 / 2.7e-50 / 1e-58 in 7.1 / 10.9 / 10.7 ms; scale 2 at
  1e-5 / 3.3e-10 / 1e-31 in 7.3 / 13.6 / 26.8 ms. Its variant builds in 4.4 s.
- **Detail depends on the place.** Of 24 rays searched at scale -1.5, six landed somewhere
  intricate at 2e-20 and seven at 2e-50; the rest were smooth walls. The starter places are
  chosen ones. Scale 2 is mostly walls at depth.
- The GPU kernel is held to the CPU orbit by kept lines of the direct proof, and the CPU orbit
  to GMT's shader text by a node check. Rotation on the GPU has no kept line.
- Size, measured: 631 lines in `core.js` (449 code), 486 in the shell (275 code), 475 in checks.
- A third formula pays the same four things. The two fold pieces here also serve KaliBox, the
  Kleinian family and the generated fold formulas; none of those is built.
- Not done: the formula in a recorded flight or a keyframe; the navigation's rays step by half
  the scalar estimate for the Mandelbox (a stand-in for a ray estimate); the f32 noise line
  (orbits run about 17 iterations past where they leave the reference turned to noise in a
  24-bit CPU emulation at scale 2) is not measured on the GPU.
