# Julia mode in the deep zoomer - build plan

Written 2026-10-11 after a CPU study. Nothing in the renderer or the shell has been changed for this.
The owner's word: "take cheapest definitely, and start research on what else is cheap or easy". The plan
page named Julia mode as the cheapest addition ("same kernel, a constant c. Not measured."). It is measured
now, as far as node goes. The survey of what else is cheap is `CHEAP-FORMULAS.md`, beside this file.

Every number below is marked **M** (measured here: the script is named), **D** (derived on paper) or
**R** (read: the grep target is named). Scripts and logs: `debug/scratch/formula-next/` (git-ignored).

## What he gets

- A **Julia switch** on the Formula tab, for the Mandelbulb and for the Mandelbox. With it on, c is one
  constant for the whole picture and the point looked at is where the orbit starts.
- **"Julia from this place"**: the constant taken from where he is. Every deep place of the bulb or the box
  becomes a whole object of its own, seen from outside, that can be dived into.
- For the **Mandelbox** the Julia sets are exact and undistorted at every depth measured (1e-10, 1e-30,
  1e-60). For the **Mandelbulb** the delta step is exact, and down to about 1e-10 space is stretched no more
  unevenly than at the places he flies to now (5.2 against 1.2 to 6.2). Below that it flattens, and the
  scalar estimate the hit test reads over-reads by tens to thousands. What that looks like needs the GPU.
- What depth does NOT give in Julia mode: new shapes. A deep view of a Julia set is a piece of the same set
  at unit scale, pulled back through the orbit (**D**: BUILD-PLAN's own sentence, "the picture is that set
  pulled back through the smooth map", with the set now the same at every place). The variety is in the
  choice of constant, not in the dive.

## What is decided (by default - each is his to overturn, see the open calls)

- The formula is GMT's own Julia mode: `vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));`
  (**R**: `engine-gmt/shaders/chunks/de.ts`, four copies). The start point is the pixel in both modes.
- GMT keeps the `+ 1.0` of its running derivative in Julia mode (**R**: `engine-gmt/formulas/Mandelbulb.ts`
  `dr = rp1 * power * dr + 1.0`, `AmazingBox.ts` `dr = dr * abs(uParamA) + 1.0`, one text for both modes).
  The plan keeps it too: nothing in the derivative code changes, and it moves the bulb's over-read by less
  than a third (**M**, `julia-shape.log`, last table: 23 without it, 21 with it at 1e-30). The study itself
  ran WITHOUT the "+ 1" (the true derivative; all ten patches of `lib.mts`). The orbits, the escape
  iterations and the stretch numbers do not depend on that choice; the estimates do, by the factor above.
- The constant is carried as the camera is: **three 256-bit decimal strings**. See "Precision".

## What the CPU study measured

| Fact | Number | Script |
|---|---|---|
| The harness agrees with the proven mode | Mandelbrot mode at 6 of the renderer's own places: 0 points differ, worst 3.0e-7. The seventh, at 3.5e-76, is past the harness (its nearest test points are below one unit of the 256-bit fixed point) | `julia-twin.mts control` |
| **Box, Julia: the delta step is exact** | 54 places (6 constants, scale 2 and -1.5, 1e-10 / 1e-30 / 1e-60), 52,062 gated points: 0 differ in kind, 0 in iteration count, 0 in estimate by more than 1e-6; worst 1.2e-9 | `julia-twin.mts` |
| **Bulb, Julia: the delta step is exact, the orbit is not always well-conditioned** | 62 places (8 constants, powers 8, 4, 2), 67,337 gated points: 0 in kind, 3 in iteration count, 219 in estimate by more than 1e-6 (0.33 %), worst 0.14. All of them at constants on the bulb's surface; a constant inside the bulb: worst 1.8e-10 | same |
| Why those 219 | Two f64 writings of the same step disagree with each other at the same places by the same amounts ("vs lifted" up to 0.3 and 12): rounding of 1e-16 grown by the orbit. In Mandelbrot mode on the same kind of place: 0 of 31,461 | `julia-rebase.mts`, sections 0b and 1 |
| Iterations, bulb power 8, constant on the surface | the camera's orbit escapes on 12 to 16 at 1e-10, 43 to 85 at 1e-30, 96 to 173 at 1e-60 (1.2 to 2.8 a decade; the bulb's own places: 1.1 to 1.2). The renderer's margin rule then asks for 24 to 200. Power 4: up to 262, cap 302. All under the ceiling of 400 | `julia-twin.log` |
| Iterations, box | scale 2: 39 to 44 / 100 to 110 / 189 to 210. Scale -1.5: 41 to 47 / 89 to 104 / 166 to 182; with a small constant (0.1, 0.2, 0.1): 75 / 188 / 359, cap 413 of the box's 500 (6 a decade: the ceiling would bind below about 1e-70) | `julia-twin.log`, `julia-shape.log` |
| Is there a surface to dive into | Constant inside the bulb: yes, on every ray, at every depth (a blob). On the surface (his places as constants): yes on 3 of 3 rays at all three depths for four power-8 places and the power-4 one; the power-2 place: at 1e-10 only (the rays passed the set without coming nearer). Outside the bulb (0.9, 0.7, 0.6): nothing on any ray. Box: a surface for every constant tried, also one far outside | `julia-twin.log` |
| **Box, Julia: space is stretched alike in every direction** | widest / middle and widest / narrowest 1.00 at all 36 places; widest stretch over the estimate's derivative 1.00 (Mandelbrot mode at its starters: 1.10 to 1.26 and 1.17 to 1.31) | `julia-shape.mts` |
| **Bulb, Julia: it flattens with depth** | widest / middle, median of 12 places: 5.2 at 1e-10, 127 at 1e-30, 2,000 at 1e-60 (the flattest: 3.0e7; the least flat at 1e-30: 1.85) | same |
| ... and so do straight dives into the bulb in Mandelbrot mode | the SAME sampler (a ray from outside, stepped by the scalar estimate), power 8: 13 / 987 / 3.1e5. The places he flies to are a different kind: 1.2 to 6.2 at his four power-8 places, 14 and 65 at the power-2 ones | same, section "straight dives" |
| **Bulb, Julia: the scalar estimate over-reads** | scalar estimate over the ray estimate, at 9 in 10 points of a place, median of places: 4.3 at 1e-10, 72 at 1e-30, 1.5e4 at 1e-60. Mandelbrot dives: 1.0 / 0.83 / 28. His places: 3.3 | same |
| 24-bit arithmetic (an emulation, NOT the GPU) | points more than 1e-3 off the exact estimate: Julia 9.4 % of 61,667 (plain rebase), 7.4 % (rebase onto the critical orbit, below). Mandelbrot mode, same sampler: 1.4 % / 1.0 %. Mandelbrot mode, his places: 1.9 % / 1.4 %. A constant inside the bulb: 16 of 7,538 | `julia-rebase.mts` |
| **The trap: the rebase to the origin, left on** | Julia mode with the kernel as the shell runs it today: 38.8 % of 20,300 points wrong, half of them in iteration count. With the plain rebase: 0.57 % | `julia-trap.mts` |
| How exactly the constant must be known | the camera kept at a deep place p and c set to p: with c = p to the last bit the camera's orbit escapes on the same iteration (10 places, both formulas; it is the same orbit). With c as a double the camera reads 6e-19 and 2e-18 from the surface at his 6.6e-35 and 2.8e-39 places, 6e-17 at the box's 1.1e-50 place; with c to 5 decimals (what the share encoder keeps of a number), 2e-10 to 6e-7 | `julia-precision.mts` |
| ... for a whole object | a ray from outside, 24 iterations: the hit does not move with c as a double; with c to 5 decimals it moves 3e-7, under the ray's own tolerance | same |

**Not measured, and not measurable without the GPU:** anything in real f32 (the 24-bit numbers are an
emulation; at his own places it says 1.4 to 1.9 % where the GPU's pictures are clean, so read it as a ratio
between cases, not as a share of pixels); the march and the hit test in Julia mode; any picture; speed;
whether Julia sets have places worth steering to, as the bulb has (one of twelve places at 1e-30 was not
flat). No still was made: the CPU can draw one in minutes and stage 0 below asks for it.

## The maths the kernels need

Both formulas, K the constant, the camera at P (256-bit), a pixel at P + d0:

    reference   Z0 = P,  Z' = f(Z) + K            the camera's own orbit, as now; only the added vector changes
    pixel       d0 = the pixel's offset,  d' = (delta step of f at Z, d)          no "+ dc": the delta of c is zero
    estimate    as now, with GMT's derivative as it stands (the "+ 1" stays)
    rebase      d = z - Z0, index 0                valid: the recurrence does not depend on the index

**Bulb only:**

    jet         j0 = the ray's direction v,  j' = A j              no "+ v": the true derivative along the ray.
                The resumed orbits use it as d_k(t + S) = d_k(t) + S j_k, so it must be the true one.
    ray estimate   0.5 r ln r / |j|                               unchanged in form
    gradient    J^T z^ pulled back to z0 only                     the CPU's second estimate: no sum over the steps
    the ball    rho^n - |K| = rho                                 EXACT in Julia mode: one ball for every ray and every
                camera (today |c| is read at the camera and stands for every pixel's)
    rebase to the origin   NOT VALID as it stands. It lands on Z0 as the image of the origin. The image of the
                origin under z -> z^n + K is K. Two ways:
                (a) off in Julia mode: the plain rebase. Stage 3.
                (b) a SECOND reference, the orbit of K itself (K, K^n + K, ...): the direct iteration
                    d = z^n lands on its index 0, and with its derivative row all zeros the landing line
                    `Ddr = n |z|^(n-1) dr` is the one the kernel has. Built once per constant, not per camera
                    move; it is what `buildRefOrbit` builds today when the camera stands at K. Stage 6.

**Box only:** nothing else. Its kernel carries no jet and uses the plain rebase already. Its far distance and
its whole-object view need the size of the Julia set: every bounded orbit stays inside
|z| <= (2 sqrt(3) L |s| + |K|) / (|s| - 1) (**D**; **M**: at scale -1.5 with a small constant a start 6 units out
was inside the solid, `julia-twin.log`).

## Where c, or the delta of c, is read today (the whole list: grep targets in `core.js`)

CPU, proven as a text patch (`lib.mts`, `JULIA_PATCHES`: ten replacements, each matching exactly once):
- `buildRefOrbit`: `hp.addV(hp.P8(V[k]), CHP)`; `buildBoxOrbit`: `hp.boxStep(q, CHP, B)`
- `pertOrbitJS`: `d=add3(sd,dc)`; `boxOrbitJS`: the `+ dc[0]`, `+ dc[1]`, `+ dc[2]` of its step
- `pertOrbitJetJS`: `pushJetJS(z,jet,rd)` (the `+ v`), `add3(stableDeltaJS(V,d),dc)`, and the loop that sums
  `grad` on the way back
- (the two `DR = ... + 1` lines and `dr = dr * kp * aS + 1` were patched in the study and are NOT part of
  the plan: GMT's "+ 1" stays)

CPU, not patched in the study, to do: the direct referees `deCPU`, `deCPUesc`, `hpDirectDE`, `boxDirectF64`,
`boxDirectHP` (each adds the point itself); `boxExtent` / `boxFar`; `setPowerUniforms` (`uRayBall` from
`cam.pos`); `applyFormula` / `setFormulaNow` / `api.formula` (the switch, the constant, `formulaStamp`).

GPU: the bulb's `pertOrbit` in `KERNEL_CORE`: `sclAdd(Dn, en, C, ec, D, e)` (grep "δ ← Δ + δc"), the two lines
of the origin rebase (`sclAdd(P, uPower * ez, C, ec, D, e)` and `D = C; e = ec;`), and `jetStep`'s
`+ gRd * jvs`. `BOX_KERNEL`: its `sclAdd(Dn, en, C, ec, D, e)`. The plain-f32 copies: `deMandelbulb` in
`FRAG` (both formulas), `deF32`, `paletteF32`, `boxStepF32`'s callers (each `+ pos`).
One uniform does all of it without a branch: a factor 1 (Mandelbrot) or 0 (Julia) on the added vector, and
the constant as a `vec3` for the f32 copies. No new shader variant: the bulb's program is built once as now.

## Precision

- In the renderer the constant is three BigInt like `camHP`, and a typed number is exact in them.
- A whole object needs no more than a double. Anything deeper than about 1e-16 needs the constant as deep as
  the view (the table above): so a place, a link and a scene carry it as three decimal STRINGS beside `cam`,
  and it never passes through `Number()`.
- "Use this place as c" therefore copies strings: the camera's own (`getView().cam`), or the camera plus the
  ray's hit distance along the view axis, added in fixed point.

## The shell

- `dzFormula`: `juliaMode` (boolean; GMT's id) and `juliaX`, `juliaY`, `juliaZ` as one composed row, as GMT's
  geometry feature has them (**R**: `engine-gmt/features/geometry/index.ts`, grep `juliaX`). The rows show and
  edit doubles. The exact strings ride with the view; they stand while their doubles equal the rows, and a
  row edit replaces them with the row's exact value.
- "Julia from this place" is a jump: one undo step, the trail ends (`trailEnds`), Back returns.
- `FORMULA_CHOICE_KEYS` takes the switch and the three numbers, so a place, Back, Home and the formula push
  carry them. A place without them is in Mandelbrot mode, as a place without `kind` is the bulb.
- A change of the switch that is not a jump moves the camera to the whole-object view in the same undo step,
  as a change of `kind` does. A change of the constant by its rows does not move the camera.
- A route has one formula, the scene's: the switch and the constant are the scene's. A keyframe carries the
  camera only, as now.
- Starter cards in a file of their own (`data/juliaStarters.ts`): `starters.ts` and `places.ts` are marched by
  the node checks with the Mandelbrot maths (**R**: `data/boxStarters.ts`, "NOT IN STARTERS ON PURPOSE").
- A constant with no Julia set (far outside: nothing bounded) draws an empty picture: say so in words.

## Stages

Each ends with a check that has been seen red, or with something he can see.

0. **CPU, before any shader (half a session).** One still of a whole Julia bulb, one at 1e-10 and one at
   1e-30 for a constant from his places, and the same three for the box, drawn with the lifted CPU code as
   `box-still.mjs` drew the box. He looks before anything is built: the numbers say the bulb flattens, a
   picture says whether that matters. Size: one scratch tool.
1. **The seam and the CPU half** (`core.js`, `index.ts`, `core.d.ts`). `api.setFormula(kind, { julia, c })`
   with c as three strings; the seven CPU patches above; the direct referees; the box's extent; the ball.
   With the switch off every number is what it is today.
   Proof: a node check `debug/deep-zoom-checks/julia-orbit.mts` built from `julia-twin.mts` (the twin
   against a referee that shares no code with it: the bulb's power by complex multiplication, the box as
   GMT's shader writes it). Seen red with one patch taken out (the reference adding the camera instead of K).
   Size, a guess: 60 lines in `core.js`, 250 in the check.
2. **The box's kernel.** The factor on its `+ dc`; its three f32 copies; the far distance.
   Proof: lines added to `smoke:deep-zoom-direct` (GPU against the twin and against the direct referee,
   Julia, both signs of scale, 1e-20 and 1e-50). Seen red with the factor left at 1. The Mandelbrot lines
   stay as they are. Size, a guess: 30 lines.
3. **The bulb's kernel.** The factor on its two `+ dc` and on the jet's `+ v`; the rebase to the origin held
   off while Julia is on; the ball from |K|; the f32 copies.
   Proof: direct-proof lines in Julia mode (a whole object, 1e-10, 1e-30); the 79 Mandelbrot lines
   unchanged; the two picture tools of ROUTES.md R7a for "the bulb is what it was". Seen red twice: the
   factor left at 1, and the rebase to the origin left on (the CPU says 38.8 % wrong). Size, a guess: 50 lines.
4. **The shell.** The switch, the row, "Julia from this place", the strings in a place, a link and a scene,
   the whole-object view, the starter cards. Proof: `check:deep-zoom-param-map`, `check:deep-zoom-module-host`
   and the stage smoke that owns the Formula tab. Size, a guess: 200 to 300 lines.
5. **Measured on the GPU, with him.** The bulb in Julia mode at 1e-10, 1e-20, 1e-30: rays through a solid
   against the careful march (`bench:deep-zoom-march`), ms a frame, and his eye. This stage decides what the
   help text says about depth in the bulb's Julia sets, and whether stage 6 is wanted.
6. **Only if 5 shows grain where orbits pass the origin: the second reference** (the orbit of K), so the
   rebase to the origin works in Julia mode. Measured gain in the emulation: 9.4 % to 7.4 % of points; the
   same repair gives 1.9 % to 1.4 % in Mandelbrot mode. It does not cure the over-read. Size, a guess: 80 to
   120 lines.
7. **Later, each his call:** the constant on the timeline; GMT's picker and Randomize for the constant;
   a search for Julia places that are not flat.

Whole build without stage 6, a guess: 150 to 200 lines in `core.js` (the Mandelbox took 631), 200 to 300 in
the shell (486), 300 in checks. One builder, one or two sessions.

## Traps

- **The rebase to the origin.** On in the shell (**R**: `rebaseOrigin: true`, `host/moduleHost.ts`), wrong in
  Julia mode, and the picture would not be black: 61 % of points still come out right.
- **The constant as a number.** The share encoder keeps 5 decimals: a link to a deep Julia place would open
  1e-7 from a surface, whatever depth it was saved at. A scene's slice holds doubles: 1e-18. Strings, like
  the camera.
- **The scalar estimate in the bulb's Julia mode.** The hit test, the bisection, hit refine, the normal taps
  and the navigation's "near enough" all read it (ADR-0137, decision 4). At depth it reads tens to thousands
  of times the distance left. Nothing on the CPU says what the picture does with that.
- **The box's Julia set is larger than the box.** `boxExtent`, `boxFar` and `formulaHome` assume the
  Mandelbrot-mode size.
- **A constant on the pole axis** (x = y = 0), if stage 6 is built: the second reference would sit on the axis,
  where the kernel's azimuth is 0 / 0 (grep POLE GUARD).
- **Iterations.** The depth rule (32 + 1.35 a decade) is the Mandelbrot bulb's; a Julia bulb needs up to 2.8
  a decade. The margin rule covers it (caps of 24 to 200 measured); nothing to add.
- **A place of one mode in the other is nowhere.** The place must carry its mode and its constant, and a
  jump must set them before the view, as it sets the formula (grep `pushFormulaNow`).
- **No key may start with `is`** (saved scenes drop it): `juliaMode`, not `isJulia`.
- **The study's own trap, kept as a warning:** the bulb's Julia mode first looked far flatter than its
  Mandelbrot mode, because Julia dives were being compared with places a person flew to. On the same
  sampler they are alike.

## Open calls for the owner

1. **Both formulas at once, or the bulb first?** Recommendation: both in one build, the box first. The seam
   and the shell are shared and are most of the work; the box's half is one factor in its kernel and is
   exact and undistorted at every depth measured; the bulb's half is what people know as a Julia bulb and
   is the part whose depth has to be judged by eye.
2. **What "Julia from this place" takes:** the point looked at, and shows the whole Julia set (the classic),
   or the camera's own point, and stays where he is (the picture turns into its Julia relative at the same
   depth: measured to hold only with the constant exact)? Or two buttons.
3. **Number rows for the constant** (and with them keyframes: a Julia set morphing from outside), or only
   "from this place" and paste?
4. **The bulb's Julia mode below about 1e-10:** ship it as it comes and say so in the help, or wait for
   stage 5's pictures before the switch shows for the bulb at all?
5. **Stage 6** now or only if grain shows.
6. An ADR goes with stage 1 (Julia mode as a factor on the added vector, the constant as strings).
