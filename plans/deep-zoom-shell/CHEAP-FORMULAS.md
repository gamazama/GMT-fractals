# What else is cheap or easy to add to the deep zoomer - a ranked survey

Written 2026-10-11, with `JULIA.md` (beside this file). A study: nothing in the app was changed, nothing ran
on a GPU. Every claim is marked **M** (measured here, the script named), **D** (derived on paper) or **R**
(read, the file named). Scripts and logs: `debug/scratch/formula-next/`.

## The yardstick

A formula costs four things (ADR-0135): its fixed-point map, its reference rows, its kernel step, its CPU
orbit - plus three plain-f32 copies for the far field. The Mandelbox took 631 lines in `core.js` and 486 in
the shell. What the renderer has to build from:

| Piece | Where |
|---|---|
| P - the bulb's power (any integer 2 to 16, two phases), with a jet, a ray estimate, resumed orbits, the ball | `KERNEL_CORE` |
| B - the box fold (two planes an axis) | `BOX_KERNEL`, `boxFoldD` |
| S - the sphere fold (three regions) | `BOX_KERNEL` |
| L - a constant rotation, a scalar scale of either sign | `uBoxRot`, `uBoxA` |
| C - "+ c", c the point itself | both kernels |

And a second question beside cost, which the earlier study used to turn three formulas down: **does depth
show anything?** Two things decide it.

1. *Is the point itself added every iteration?* If it is, every place has its own Julia set and a dive keeps
   meeting new shapes. If nothing is added, or one constant is, a deep view is a piece of the same object at
   unit scale (**D**).
2. *Does the map stretch space alike in every direction?* Measured as widest / middle (a2) and widest /
   narrowest (a3) of the orbit's 3x3 derivative. 1 = alike; 100 = sheets; growing with depth = it flattens.
   Folds, inversions and uniform scales are angle-preserving piece by piece, so a product of them has a2 = 1
   exactly (**D**; **M** for the box in Julia mode: 1.00 at 36 places, `julia-shape.mts`).

**How a2 was measured here** (`cheap-shape.mts`): six rays a map from outside towards a point inside; the
point steps by half a first-order distance estimate that divides by the WIDEST stretch, until that estimate
reads 1e-8, 1e-16, 1e-26, 1e-40; exact 256-bit orbits throughout. It is a straight dive, not a flown one,
and it stops as soon as ANY direction is stretched by 1 / depth, so it leans towards uneven places. The
bulb and the box are in every table as controls; read a candidate against them, not as an absolute.
For scale: at the places he flies to, the bulb's a2 is 1.2 to 6.2 (power 8) and 14 to 65 (power 2)
(**M**, `julia-shape.mts`).

| Control | a2 at 1e-8 / 1e-16 / 1e-26 / 1e-40 (median of 6 rays) | iterations a decade |
|---|---|---|
| Mandelbulb power 8 | 1.8 / 23 / 43 / 25 | 1.5 |
| Mandelbulb power 2 | 11 / 96 / 2,900 / 1.1e5 | 4.0 |
| Mandelbox scale -1.5 | 1.3 at every depth | 6.0 |

## The candidates

### 0. Julia mode of both formulas (the baseline; `JULIA.md`)
- Reuses: everything. Adds: a factor on the added vector, the constant as a second 256-bit triple, a second
  reference for the bulb if wanted.
- Depth: nothing new (one constant). Box: undistorted at every depth, a2 = 1.00 (**M**). Bulb: a2 5.2 / 127 /
  2,000 at 1e-10 / 1e-30 / 1e-60, the scalar estimate over-reading by 4 / 72 / 1.5e4 (**M**).
- Cost, a guess: 150 to 200 lines in `core.js`, 200 to 300 in the shell. About a quarter of the Mandelbox.

### 1. GMT's "Kleinian" - it is already the Mandelbox
- **R** `engine-gmt/formulas/Kleinian.ts`: box fold; `float k = max(uParamC / r2, 1.0);`;
  `z3 = z3 * uParamA + uVec3A + c.xyz;`; `dr = dr * abs(uParamA) + 1.0`. That is the Mandelbox's sphere fold
  with the fixed radius sqrt(K Factor) and NO inner radius, plus a constant offset. GMT floors r2 at 1e-10,
  an inner radius of 1e-5; the renderer's floor is 3.2e-5 (**R** `applyFormula`, `3.1623e-5`).
- Reuses: all of B, S, L, C: the kernel as it is. Adds: nothing for the defaults (Scale 1.8, Folding Limit 1,
  Fixed Radius 1.095, Min Radius at its floor); a starter card, and the shell's Min Radius row let down from
  0.001 to the floor. For GMT's Offset row: the offset joins c in the fixed-point map and in the f32 copies
  (about 15 lines); the delta kernel never sees it (**D**: a constant cancels in a difference).
- Depth: new at every place (the point is added). a2 1.5 / 1.5 / 1.4 / 1.4, a3 1.6, 4.1 to 5.3 iterations a
  decade (**M**, `cheap-shape.log`, "Kleinian (GMT defaults)", 6 rays).
- Not the same thing: `KleinianJos`, `KleinianMobius` (a modulo wrap, a shear, a Moebius step, their own
  distance state: all new) and the three `PseudoKleinian` files (B and S and a constant shift, pieces that
  exist - but no scale, no "+ c", orbits that never escape and an estimate of their own shape; depth would
  show copies) (**R**, each file).
- One thing to prove first: the sphere fold's inner factor fixedR^2 / minR^2 is 4 at the box's defaults and
  1.2e9 here. The kernel's crossing cases have never been run at such a ratio in f32: one line of the direct
  proof at these numbers before the card ships.
- Cost: a card and a row limit: under 30 lines. With the Offset row: about 60.

### 2. Burning - GMT's Burning Mode, on the bulb
- **R** `engine-gmt/features/geometry/index.ts`: `z.xyz = mix(z.xyz, abs(z.xyz), uBurningRuntime * uBurningMix);`
  at the top of every iteration, before the formula. The owner on MandelBolic: "the burning mode is also
  epic lets keep it".
- Do the box's folds cover it? **No** (**D**): the box fold is two planes at +-L; with L = 0 it gives -z, not
  |z|. An abs is ONE plane an axis and needs its own, smaller, case table: the reference Z and the pixel
  Z + d on the same side, d' = +-d; on opposite sides, d' = +-(d + 2 Z), from the reference's own signed
  coordinate - which must come as mantissa + exponent, as the box's fold distances do. The earlier study
  measured that table exact (**R** `MANDELBOLIC.md`: Burning, f64 2e-15, 24-bit 7e-7).
- Reuses: all of P, the jet (a sign flip per axis), the rebase to the origin and the ball (|z| is not changed
  by an abs). Adds: one reference row (three signed coordinates), the case table in the kernel and in the
  CPU orbit, an abs in the fixed-point map, three f32 lines, the mix.
- The one unknown: **resumed orbits across a fold plane.** A checkpoint moved along the ray to first order is
  wrong where the move crosses an abs plane, and the bend measure Q does not see a kink. It is the box's open
  question (NEXT.md, session 8, "a jet through the folds") with one plane an axis instead of five surfaces.
  Until it has a rule the burning bulb runs with whole orbits (ray bits 1: every step pays its whole orbit
  again; how much slower that is on the GPU today is not measured).
- Depth: new at every place. a2: power 8 4.2 / 5.4 / 11 / 212; power 2 3.8 / 11 / 18 / 2.6e4 - no flatter
  than the bulb's own controls, and less flat at power 2 down to 1e-26 (**M**, 5 to 6 rays a map: thin).
  1.6 and 2.8 iterations a decade.
- Cost, a guess: 120 to 200 lines in `core.js`, 40 in the shell (a switch and a mix).
- Buffalo (**R** `Buffalo.ts`: abs on chosen axes AFTER the power, power 2 by default) is the same pieces and
  measured flat: 11 / 2,400 / 1.8e5 / 1.7e6 (**M**). Not worth a row of its own.

### 3. KaliBox - the box's kernel with another fold
- **R** `engine-gmt/formulas/KaliBox.ts`: `p = abs(p) + uVec3A;`
  `float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0); p *= k;` `p = p * (scale / minRad2) + c.xyz;`.
  For minRad2 <= 1 that is the sphere fold S with fixed radius 1 and inner radius^2 = minRad2, times `scale`
  (**D**: k / minRad2 = clamp(1 / r2, 1, 1 / minRad2)).
- Reuses: S, L, C, the box's kernel frame, its rows, its CPU orbit. Adds: the abs case table of candidate 2 in
  place of the box fold (no jet in the box's kernel, so no resumed-orbit question), a constant translation
  (part of the reference: free in the delta).
- Depth: the point is added, so new at every place; no flattening expected (**D**: its pieces preserve
  angles; **M** for the two formulas that share S and the scale: 1.3 and 1.5).
- **Not measured, and it matters:** with GMT's preset numbers no point within +-3 (or +-4 in Julia mode, the
  preset's) stays bounded for 300 iterations (**M**, `cheap-shape.log`: "no bounded point found" 60 times
  each). What GMT draws is the level surface of its estimate after 15 iterations, not a set with an inside -
  as MandelBolic's look turned out to be. The deep zoomer would draw the estimate at pixel size; what that
  is at 1e-30, nobody has seen. One CPU still before anything else.
- Cost, a guess: 80 to 150 lines in `core.js`, 80 in the shell (Scale, MinRad2, Translation, Rotation).

### 4. BoxBulb - GMT's own hybrid, inside one iteration
- **R** `engine-gmt/formulas/BoxBulb.ts`: `boxFold(z3, dr, 1.0); sphereFold(z3, dr, uParamB, uParamD);`
  `z3 *= scale; dr *= abs(scale); DE_Bulb(z3, dr, trap, uParamA); z.xyz = z3 + c.xyz;`.
- Reuses: every piece: B, S, L, then P, then C. No new maths. Adds: a reference with both sets of rows (the
  box's six for the point, the bulb's four for the folded point), a kernel pass that runs the box's delta
  step without its "+ dc" and hands the result to the bulb's, the same in the CPU orbit, and a THIRD shader
  program of the bulb's size (the bulb's takes 21 to 26 s to build, ADR-0137).
- It would march by the page's step rule, as the box does: the jet does not pass the folds yet (candidate 2's
  unknown). The scalar estimate would then stand alone on a map that stretches like the bulb.
- Depth: new at every place. a2 3.3 / 8.5 / 36 / 32 at GMT's defaults (power 5, scale 1): the bulb's own
  numbers. 1.0 iteration a decade: 9 at 1e-8, 39 at 1e-40, the fewest of anything measured (**M**,
  `cheap-shape-hybrids.log`).
- Cost, a guess: 250 to 350 lines in `core.js`, 150 in the shell.

### 5. A weave of two formulas (what GMT users call a hybrid)
- **R** `engine-gmt/engine/weave/emitWeave.ts`: whole formulas, one an iteration, chosen by
  `int phase = <id>_weaveSlot(i);`; z, dr and c are one orbit handed from formula to formula.
- What alternating bulb and box steps needs (**D**):
  - *The reference orbit*: the fixed-point builder calls the scheduled map each iteration; both maps exist.
    Each column of the texture carries the rows of ITS step's formula (six rows wide; the bulb's four fit).
  - *The kernel*: both step bodies in one program, picked per pass from the schedule (two uniforms: period
    and phase) - a build of the bulb's size plus the box's. The derivative: each step's own rule on one dr.
  - *The rebase*: it restarts the reference at index 0, and the schedule with it. A pixel on iteration 17 of
    a 2-cycle must land on a reference point of the same phase: the rebase target becomes index
    (iteration mod period), not 0. Today's kernels assume 0. The rebase to the origin goes for the same
    reason (the image of the origin is c only if the step after it is the first of the cycle).
  - *The ball* has no radius for a mixed map: off. *The jet* stops at the first box step: page's march.
  - *The estimate*: GMT takes the lead slot's; a mixed orbit has no formula of its own. A heuristic.
- Depth: new at every place. One weave measured, box scale 2 / bulb power 8 alternating: a2 7.8 / 34 / 278 /
  212, and five of six rays did not reach 1e-40 in 2,500 steps (**M**, same log: one ray at the deepest
  level - thin). Bulb-like, no better.
- Cost, a guess: candidate 4 plus 100 lines; and every pair of formulas is a new picture to prove.

### 6. A conjugate ("Mandelbar") bulb
- The power, then y -> -y, then + c (**D**: a constant reflection after P). GMT has no such formula: its
  `Mandelbar3D` is the quadratic map of candidate 8 (**R**).
- Reuses: everything; adds one sign vector in about eight places (the fixed-point map, the kernel's step and
  its origin rebase, the jet, the CPU twins, the f32 copies). The cheapest new bulb there is: about 40 lines.
- Depth: new at every place; a2 3.4 / 39 / 317 / 2,300 at power 8, 14 / 61 / 3,600 / 2.0e4 at power 2 (**M**,
  3 to 5 rays): at power 8 flatter than the bulb's control on these rays.
- Nobody knows it by name and nothing measured speaks for it.

### 7. A quaternion Julia set (4D)
- **R** `engine-gmt/formulas/Quaternion.ts`: `z = quatSquare(z) + c;`,
  `vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w)`.
- Is it the cheapest kernel of all? **Per step, yes** (**D**): the delta of a quadratic map is 2 B(Z, d) + f(d),
  eight multiplies, exact, no trigonometry, no fold, no cancellation. But the state is four numbers: a
  4-component delta and reference, a fourth coordinate for the slice and for c, Julia mode only. It is a new
  kernel frame, not a variant.
- Depth: nothing new (one constant), and **M**: a2 2.07 at every depth, a3 from 4e11 up - one direction is
  never stretched at all. The picture at depth is a 2D Julia set's detail swept along a line
  (`cheap-shape.log`, "Quaternion Julia", 6 rays; the preset's own constant gave no bounded point in the
  slice without GMT's rotations).
- Cheap to compute, least to look at.

### 8. The quadratic 3D maps: Mandelbar3D, MakinBrot, Bristorbrot
- **R** each file: three quadratic polynomials, `* scale + c`. The same exact, cheap delta as candidate 7, in
  three components.
- **M**: they flatten hardest of everything measured. a3 is 3e7 to 2e8 at 1e-8 already; a2 38 / 392 / 7.0e4 /
  9.1e7 (Mandelbar3D), 12 / 975 / 5.3e4 / 3.1e8 (MakinBrot), 2.9 / 15 / 1,500 / 3.4e6 (Bristorbrot); 5 to 6
  iterations a decade. Not recommended, for the reason Radiolaria and Mandelorus were not.

### 9. The fold families: the generated BoxFold formulas, Menger, Sierpinski, the polyhedra, Coxeter
- "The generated fold formulas" of the plan's note are the seven `BoxFold*` formulas that
  `engine-gmt/formulas/boxFolds.ts` builds at startup from the geometry feature's fold list (**R**:
  `registerBoxFoldFormulas`, ids BoxFoldStandard, Mirror, Kali, Tetra, Octa, Icosa, Menger). Only Standard is
  literally the box's two pieces (B with a limit per axis, then S, then the scale); Mirror and Kali need the
  abs; Tetra, Octa, Icosa and Menger use neither B nor S (swaps, a sort, oblique reflections).
- One new primitive would cover all of them and the nine hand-written polyhedra too: **a fold across a
  plane** (**D**: an abs is a fold across a coordinate plane, a swap across a diagonal one, a sort is three
  swaps; the case table is candidate 2's with a normal). Rows: one signed distance a plane an iteration,
  3 (Sierpinski) to 20 (Coxeter). The polyhedra also carry GMT's cutting-plane estimate, a second running
  state.
- Depth: **nothing** (**D**). None of them adds the point (**R**: `if (uJuliaMode > 0.5) z3 += c.xyz;` in each;
  BoxFold's "Add Constant" is off by default) and every piece is a similarity: a deep view is the first view
  again, exactly. A Menger sponge at 1e-60 is a Menger sponge.
- The exception is nearly free: BoxFold Standard with "Add Constant" ON is the Mandelbox with a folding limit
  per axis and a shift (**R** the wrapper in `boxFolds.ts`: `z3 += uVec3B; fold; z3 -= uVec3B; sphereFold;
  z3 *= s; if (uParamE > 0.5) z3 += c.xyz;`). The reference rows already hold a pair of fold distances an
  axis: 10 to 20 lines beyond candidate 1.

### 10. The rest of GMT's library
Each needs a derivation of its own (**R**, the formula files): AmazingSurf (the box plus a sine wave of the
coordinates), AmazingSurface (a sort), Apollonian (modulo, an inversion with a radius per pixel), Appell,
Borromean, Phoenix (two earlier iterates), SineJulia3D, the four Julia3D files (Moebius maps on the sphere),
JuliaMorph and MandelTerrain (2D loops of their own), Mandelorus and MandelBolic (studied, turned down and
parked), MandelMap (the bulb, after a one-time non-linear remap of the start point), Modular (a node graph).

## Ranked by cost

| # | Candidate | Cost in `core.js` (a guess) | Depth shows | One line |
|---|---|---|---|---|
| 1 | Kleinian (GMT's) | 0 to 30 | new places, even stretch (**M** 1.5) | It is the Mandelbox with no inner radius: a card, a row limit |
| 2 | BoxFold Standard, constant on | 10 to 20 more | as the box | The box with a folding limit per axis |
| 3 | Conjugate bulb | 40 | new places; flatter than the bulb here (**M**) | One sign; nobody asked for it |
| 4 | **Julia mode, both** | 150 to 200 | no new shapes; box even, bulb flattens (**M**) | The owner's choice; `JULIA.md` |
| 5 | KaliBox | 80 to 150 | new places; even (**D**); look unknown | The box's kernel with an abs; needs a still first |
| 6 | Burning bulb | 120 to 200 | new places; no flatter than the bulb (**M**, thin) | One abs case table; resumed orbits across the fold are open |
| 7 | Quadratic 3D maps | 150 to 250 | flatten hardest (**M**) | Cheap and flat: no |
| 8 | Fold families (one plane-fold kernel) | 250 to 400 | nothing (**D**) | Every dive ends where it began |
| 9 | BoxBulb | 250 to 350 | new places; as the bulb (**M**) | No new maths, a third program |
| 10 | Quaternion Julia | 300 to 450 | nothing; one axis flat (**M**) | Cheapest step, new 4D frame |
| 11 | A weave of two formulas | 350 to 450 | new places; bulb-like (**M**, one ray) | Rebase by phase; every pair to prove |

## What I would build after Julia mode

1. **Kleinian as Mandelbox numbers** - with or before Julia mode: it costs a card. It is a formula GMT
   users know by name, it is even at every depth measured, and it needs no proof beyond the box's own.
2. **Burning on the bulb.** He likes the mode, it makes new shapes at every place, and on the rays measured
   it does not flatten more than the bulb does. Its one piece (the abs case table) is also what KaliBox
   needs. The open part is resumed orbits across the fold, which is the question the box already waits on.
3. **KaliBox, after one CPU still** says what the deep zoomer would draw of it. If the still is good it is
   the cheapest formula with a new look and an even stretch; if it is fog, drop it.

What I would not build: the quadratic maps and Buffalo (flat), the fold families (nothing at depth), the
quaternion (a new frame for an extrusion). BoxBulb and weaves are the right NEXT step only after the jet can
pass a fold, because until then a hybrid marches on the scalar estimate over a bulb-like stretch.

## What was not measured

- Nothing on the GPU, and no picture of any candidate.
- The a2 tables are 3 to 6 straight rays a map. They rank; they do not certify.
- No delta step of a NEW piece was run against exact orbits here. The abs table is the earlier study's
  (measured, MandelBolic's Burning); the quadratic deltas are algebra.
- KaliBox's look; whether a burning bulb's flown places are as even as the bulb's flown places (1.2 to 6.2).
