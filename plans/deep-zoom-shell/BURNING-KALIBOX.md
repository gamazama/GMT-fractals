# Burning on the bulb, and KaliBox - what the CPU says before any shader

Written 2026-10-12, after the owner's "5 yes burning and kalibox" (`CHEAP-FORMULAS.md`, candidates 2 and 3).
A study: node only, nothing ran on a GPU, no app file was changed. Every claim is marked **M** (measured
here, the script named), **D** (derived on paper) or **R** (read, the file named). Scripts, logs and pictures:
`debug/scratch/formula-next/bk-*` (`bk-lib.mts` copies the referee of `lib.mts`, which no longer imports: its
Julia patches meet a `core.js` that has Julia mode of its own).

## Verdicts

- **Burning on the bulb: worth building.** The abs case table is exact, the delta orbit is as good as the
  plain bulb's in 24-bit arithmetic, and resumed orbits can stay: a first-order move crossed an abs plane in
  38 of 48,634 resumed orbits (0.08 %), and one test of a dozen lines brought that to 0 of 48,690 at no cost
  in passes. Whole orbits instead cost 1.6 to 4.6 times the kernel passes. About 180 lines in `core.js`.
- **KaliBox: worth building, with a named limit.** GMT's preset has no inside and is still drawn: a city of
  detail at every depth from 1e-2 to 1e-30 - but only at Detail 1. It is a dust (dimension about 2.5) one
  pixel fat, and at Detail 16 the same view is grain. With c = the point the preset numbers show nothing at
  all; below Scale 2 there is a solid that holds its shapes. About 110 lines in `core.js`, no new reference row.

## 1. KaliBox

**The rule drawn** (`bk-lib.mts` `shoot`): a ray marched by the scalar estimate (r - 1) / dr x 0.85, a hit
under one pixel cone (Detail 1 on 320 x 200), Lambert by the estimate's own gradient, one sample a pixel.
**Iterations:** the renderer's margin rule for the box, read from the camera's own orbit (**R** `core.js`,
grep `ITERATIONS AS A MARGIN`). **Arithmetic:** outside, 1e-2 and 1e-4 are f64 orbits of the point; 1e-8,
1e-16 and 1e-30 are a 256-bit reference orbit at the camera with f64 deltas. That delta step is KaliBox's
kernel step, and it is right: at 15 places, 160 points each, 0 differ in escaping, 1 of 2,400 in the count,
and the estimate of every sample a march reaches agrees to 9.5e-13; the 1e-8 picture drawn both ways differs
in 0 of 64,000 pixels, three sets. The dive is one straight ray, walked by exact orbits.
All **M** `bk-kali-still.mts <set>` (logs `bk-kali-julia.log`, `-point`, `-s18`, `-j15`):

| Set | Inside? | The dive, 1e-2 to 1e-30 | The 1e-8 view at Detail 1 / 4 / 16 / 64 | a2, a3 | Iterations a decade | Steps a ray |
|---|---|---|---|---|---|---|
| **GMT's preset** (Julia mode, Scale 2.043) | none: 0 of 1,000,000 points; longest escape 32 | a city at every depth; 98 to 100 % of rays hit; none ends on a point that does not escape | neighbouring normals agree 0.68 / 0.47 / 0.41 / 0.39 (1 = a sheet, 0 = noise): grain by 16 | 1.000, 1.000 | 3.9 / 3.2 / 3.0 / 2.8 at 1e-8 / 16 / 26 / 40 | 20 to 29 |
| the preset numbers, **c = the point** | none; longest escape 13 | nothing: the estimate is never under 5.2e-2 anywhere in a +-4 cube; 0 % of rays hit | - | - | - | - |
| **Scale 1.8, c = the point** | 9.4 % of a +-4 cube | sheets with round holes, new at each depth; 98.8 to 100 % hit | 0.96 / 0.89 / 0.84 / 0.80: the shapes stay | 5.3, 12.5 (6 rays: 1.3 to 15) at 1e-8, 1e-16, 1e-26 alike | 4.6 / 3.8 / 3.6 / 3.4 | 47 to 124; up to 1.2 % out of 400 |
| the preset with **Scale 1.5, MinRad2 0.7** (Julia) | 0.66 % of a +-6 cube | a flat wall: the same blank plane at every depth and Detail | 1.00 at all four | 1.000, 1.000 | 7.8 to 6.1 | 8 |

- **Is there a surface that keeps showing shapes?** For the preset as GMT ships it: yes at Detail 1, and it
  is not a surface. Every orbit escapes, so the count rule shapes nothing; what is drawn is the estimate's
  level one pixel from a dust (the share of space within eps of it falls as eps^0.53: dimension 2.47, **M**).
  Raise Detail and the level thins into structure finer than a pixel. It is a Julia set, so the dive shows
  one family of shapes again and again (**D**, the yardstick's first test): 0.68, 0.68, 0.69 at 1e-4, 1e-8, 1e-16.
- **GMT's own 15 iterations** on the same ray, at the places ITS estimate reads the depth: shapes at 1e-2
  (0.80), a pile of balls at 1e-4 (0.72), one smooth sheet with a crease at 1e-8 (1.00) (**M**). A fixed
  count has nothing below about 1e-4; the two rules differ in kind.
- **It depends on the parameters, in four kinds** (the table). The grid (**M** `bk-kali-grid.mts`, 560
  sets, 20,000 points each): 182 have an inside. c = the point: every set at |Scale| 1.2 and 1.5, most at
  1.8, three of five translations at 2, none from 2.043 up - GMT's Scale sits just past the edge. Julia with
  the preset's constant: Scale 1.2 in four of five translations, 1.5 to 2 mostly at MinRad2 0.7 and 1.
- **c = the point is an octant without end** (**M**: the solid runs out of the +-4 cube on all three axes;
  **D**: far out the map is the same at every size). The shapes are near its tip; there is no whole object
  to frame and no ball to bound the far field. Its scalar estimate is short: dr is 1.78 times the widest
  stretch and the narrowest is 10.6 times less (**M**), hence the 47 to 124 steps a ray (**D**).
- **Stretch against the controls:** Julia mode 1.00 at every depth, as the box in Julia mode; c = the point
  5.3 and flat with depth, against the Mandelbox's 1.3 flat and the bulb's 1.8 / 23 / 43 / 25. It does not flatten.

## 2. Burning on the bulb: z' = (abs z)^n + c

**2.1 The abs case table** (**M** `bk-burn.mts table`; four places a power from 1e-4 to 1e-30, 60 neighbours
each, against 256-bit orbits). Per axis, Z = the reference's signed coordinate, d = the pixel's delta:

    same side      e = +-d            (the sign of Z)
    opposite       e = +-(d + 2 Z)    (the sign of Z + d)      then the bulb's own power delta at abs(Z), then + dc

| | f64 | every stored number rounded to 24 bits |
|---|---|---|
| the table alone, same side (394 to 5,728 passes a place) | exact (0) | 5.7e-8, the rounding of d itself |
| the table alone, opposite sides (power 8: 0.2 to 1.1 % of passes; power 2: 1.3 to 8.7 %) | 1.8e-16 of \|d\|, 6.8e-16 of e | 1.2e-7 of \|d\|, 3.1e-7 of e |
| the whole delta orbit, samples a march runs (estimate over 1/64 pixel cone): worst delta error | 1.7e-10 (plain bulb 4.3e-11) | 1.5e-5 to 3.3e-3 (plain bulb, same harness: 8e-6 to 3.0e-2) |
| the same, radius of the last iterate | 1.7e-10 | 1.6e-3 at worst (plain bulb 4.1e-3) |

The earlier figure (**R** `MANDELBOLIC.md`: f64 2e-15, 24-bit 7e-7) is **confirmed**: 7e-16 and 3e-7 here.
Past the hit level both formulas go wrong in 24 bits (a neighbour that outlives the reference: radius off by
1 at three of four burning power-2 places, by 1e-2 with one miscount on the plain bulb): the kernel's known
single-precision limit, not the table. The rounding here is of stored values only, not a GPU emulation.

**What the kernel needs from the reference:** two texels a row more - the three signed coordinates, each a
mantissa and ITS OWN exponent (**D**; the box's rows 2 to 4 are built so, **R** `buildBoxOrbit`). The
opposite-side case adds 2 Z to a delta, so Z must be known at the delta's size: a coordinate 1e-50 from a
plane beside two of order 1 cannot share an exponent, and a plain f32 is zero below 1e-45 - the table would
then read e = \|d\|, wrong by up to 2 \|d\|. The bulb's other rows are built from abs(Z) and keep their meaning.

**2.2 Resumed orbits across an abs plane** (**M** `bk-burn.mts resume`: the bulb's ray march in f64 - step
= the ray estimate, hit under 1/64 of a 1080-row pixel cone, ring of 24, tolerance 0.05 pixel; 14 x 14 rays
at eight burning places and eight plain ones; beside every resumed orbit the whole orbit at the same point).

| | the bulb's rule as it stands (R) | with the crossing test (C) | plain bulb, same harness |
|---|---|---|---|
| resumed orbits with an abs plane crossed unseen before the checkpoint | 38 of 48,634 (0.08 %; by place 0 to 0.48 %) | **0 of 48,690** | - |
| how far off the resumed iterate is, pixels: no crossing, median / worst | 0.003 to 0.014 / 0.014 to 0.47 | the same | 0.003 to 0.015 / 0.015 to 0.27 |
| the ray estimate off: 99th percentile | 20 to 61 % | the same | 9 to 28 % |
| rays that end 2 pixel cones from the whole-orbit march's | 2 of 1,568 | 1 of 1,568 | 3 of 1,568 |
| orbits resumed, power 8 / power 2 by depth | 69 98 97 82 % / 74 96 75 53 % | the same to the percent | 74 98 98 98 % / 76 94 98 59 % |

The test, in the style of the box's (**R** `BOX-RAY-STEP.md` section 3): carry V = the least, over the passes
so far, of (the iterate's distance to its nearest abs plane) / |zdot|; a checkpoint moved by S is good while
`|S| (1 + jerr + 3 |S| Q / 2) < V`, and the orbit goes on with V less that. Three abs, two min and a divide a
pass; one float a checkpoint, and `gCkA.w` is free (**R** `core.js`). It refused 404 checkpoints and the
passes a ray did not change in the second digit at any place. **One plane an axis is enough** (**M**, on
1,568 rays: thin). A crossing is rare, and where one happened the iterate stood no farther off than the worst
without one (0.15 against 0.47 pixel), its ray estimate 16 to 58 % off at the median (38 cases). Why rare
(**D**): the bend tolerance already keeps a move small against the last iterates.

**2.3 Whole orbits on every step, or resumed** (**M**, same run; steps a ray · kernel passes a ray):

| Place (estimate at the camera) | whole orbits | resumed + test | passes, resumed / whole |
|---|---|---|---|
| power 8: 1e-3 · 1e-8 · 1e-16 · 1.7e-38 | 36 · 251, 48 · 691, 40 · 1,099, 39 · 3,260 | 149, 256, 237, 923 passes | 0.59, 0.37, 0.22, 0.28 |
| power 2: 8e-4 · 6e-9 · 5e-18 · 6e-32 | 30 · 414, 33 · 1,030, 34 · 2,554, 50 · 8,066 | 256, 418, 899, 3,971 passes | 0.62, 0.41, 0.35, 0.49 |
| plain bulb, power 8 and 2 (control) | 29 to 59 steps · 162 to 10,658 | 89 to 4,649 passes | 0.19 to 0.61 |

Steps do not change. **These are counted passes, not frame time.** Twice this week a count promised what the
GPU then refused (the box's ray step failed its frame-time gate). Whether resumed burning orbits are faster
in milliseconds is a measurement at stage 3 below, not a result of this page.

**2.4 Size and order** (**D**: estimates by piece; the Mandelbox took 631 lines in `core.js` and 486 in the shell, **R** `CHEAP-FORMULAS.md`)

| | `core.js` | shell |
|---|---|---|
| Burning | about 180: abs in the fixed-point map and the direct copies 15 · reference row and upload 25 · kernel (table, the direct pass after a rebase, jet sign flips, mix) 45 · V and the test 12 · CPU twins 20 · switch, uniforms, api 30 · comments 30 | about 50: a switch, a mix row, scenes, help |
| KaliBox | about 110: abs + translation in the fixed-point step, the twin, the table in place of the box fold (Burning's helper), extent and far distance, the formula seam. **No new row**: the box's rows 2 to 4 hold `u - L` and `u + L` an axis as mantissa and exponent (**R** `buildBoxOrbit`), so at a folding limit of 0 they ARE the signed coordinate; its sphere fold with fixed radius 1 and inner radius^2 = MinRad2 is KaliBox's (**D**) | about 100: the choice, Scale, MinRad2, Translation, Rotation, cards |

1. Burning on the CPU: the fixed-point map, the twins, a node check against BigInt orbits (seen red with the opposite-side branch cut).
2. The reference row; the kernel with WHOLE orbits (ray bits 1 | 2); a picture beside a CPU still; lines in `smoke:deep-zoom-direct`.
3. V and the test; resumed orbits on; **milliseconds at the starter places both ways. Keep what is faster.**
4. The shell: switch and mix, the f32 far copies, scenes, help.
5. KaliBox on the box's kernel: CPU first, then the table swap, then the shell rows and cards.

## Pictures (`debug/scratch/formula-next/`; each sheet is 3 a row, 320 x 200 tiles)

- `bk-kali-julia-sheet.png`: GMT's preset. Outside, outside by GMT's 15, 1e-2 / 1e-4, 1e-8, 1e-16 / 1e-30,
  then GMT's 15 at 1e-2 and 1e-4 / GMT's 15 at 1e-8. `bk-kali-julia-detail-sheet.png`: 1e-8 at Detail 4, 16, 64.
- `bk-kali-s18-sheet.png`, `bk-kali-s18-detail-sheet.png`: Scale 1.8, c = the point. `bk-kali-j15-sheet.png`: the
  Julia set with an inside (a slab, then blank planes). `bk-kali-point-0-outside.png`: c = the point at the preset: black.

## What was not measured

- Anything on a GPU; any time in milliseconds.
- KaliBox: its delta step in 24 bits (f64 only); Rotation; other Julia constants; negative scales as
  pictures; a flown dive; several samples a pixel at high Detail (they would average the grain to a haze,
  **D**); the Scale 1.5 slab anywhere but the flat wall the ray met; the controls through this sampler
  (straight rays walked by the scalar estimate, where `cheap-shape.mts` walks by r / widest).
- Burning: mix below 1 (**D**: the table is a linear blend, e' = (1 - k) d + k e); powers other than 2 and
  8; phases; Julia mode with Burning; the line against the ball (an abs plane kinks the path it takes for
  straight); the guided start; no still of the burning bulb was drawn; one dive ray a power.
- Seen and not traced: at burning power 2, 6e-32, 9.2 % of resumed orbits stand over the 0.05 pixel allowed
  with NO plane crossed (worst 0.47; the plain bulb's worst place 1.3 %, 0.27). Wrong rays there: 0 of 196.

## Calls for the owner

**ANSWERED 2026-10-12, all seven: "calls for me: 1-7 yes accepted".** Every recommendation below
is taken as written. Nothing is built yet: both formulas wait for the kernel file (`core.js`),
which the specks from far and the occlusion work are ahead of (`OPEN-CALLS.md`, section G).

1. **Does GMT's preset KaliBox ship as a card?** It only exists at Detail 1. Look at
   `bk-kali-julia-sheet.png`, then `bk-kali-julia-detail-sheet.png`. Recommendation: ship it, in Julia mode,
   with the card saying so, and no cap on Detail keyed to the formula.
2. **Which KaliBox opens first?** Recommendation: Scale 1.8 with c = the point (`bk-kali-s18-sheet.png`):
   it has an inside and holds under Detail. The preset numbers with c = the point must not be a default: black.
3. **Burning's orbits: resumed with the test, or whole?** Recommendation: build whole first (stage 2 needs
   it anyway), add the 12 lines, decide by milliseconds at stage 3.
4. **The mix row in the first build?** Recommendation: yes, with a line of the direct proof at mix 0.5; it
   is two lines of the table and was decided for MandelBolic already.
5. **The longer step (line against the ball) under Burning?** Recommendation: off in the first build, measured after.
6. **Order: Burning, then KaliBox?** Recommendation: yes. KaliBox takes Burning's table and adds no row.
7. **KaliBox with c = the point has no whole object.** Recommendation: accept; its cards are places near the tip, the far distance set by hand.
