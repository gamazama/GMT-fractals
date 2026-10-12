# ADR draft: Burning on the Mandelbulb in the deep zoomer

**Status:** DRAFT, written 2026-10-12 with the build. Not filed under `docs/adr/`: the owner files it (or says
what to change first). It would follow ADR-0135 (a second formula) and `ADR-DRAFT-julia-mode.md`.

## Context

The owner's "5 yes burning and kalibox" and his "calls for me: 1-7 yes accepted" on
`plans/deep-zoom-shell/BURNING-KALIBOX.md`: GMT's Burning Mode (`z.xyz = mix(z.xyz, abs(z.xyz), mix)` at the top
of every iteration) on the deep zoomer's Mandelbulb, with a mix row, built before KaliBox, the line rule off, and
the choice between whole and resumed orbits made by milliseconds at the same picture.

ADR-0135 says what a formula costs here: its fixed-point map, its reference rows, its kernel step, its CPU orbit
and the plain single-precision copies. Julia mode showed the cheap end of that: one uniform, no new program.

## Decision

1. **Burning is one factor.** A negative coordinate is multiplied by `1 - 2 mix` at the top of an iteration:
   -1 at mix 1 (the plain abs), 1 at mix 0 (no fold). The factor is rounded to single precision once, so the
   shader, the CPU orbits and the fixed-point orbits fold by one and the same number. It is never 0: at mix 0.5
   it is held at 2^-20 (a point folded exactly onto the pole axis or the origin has no angle step and no delta
   of a power; the triplex power is continuous there, so the picture is the one mix 0.5 means).
2. **The fold is a delta by cases**, exact in form: the reference and the pixel on the same side of a plane
   (the delta times that side's factor), or on opposite sides (a form with the reference's own signed
   coordinate in it). The reference therefore carries its three signed coordinates as mantissa and exponent:
   two more rows of the orbit texture, six in all, as the Mandelbox's fold distances are carried.
3. **A VARIANT OF THE RAY PROGRAM, CHOSEN BY THE SWITCH - not a uniform in the bulb's one program.** The brief
   preferred a uniform, as Julia mode is one, provided the plain bulb did not move. It moved: with the fold as a
   branch on a uniform in the kernel's pass, Burning off, 27 of the direct proof's 100 lines printed other
   digits (the GPU's numbers in the seventh digit; every line still PASS). The compiler writes the whole pass
   anew around a branch. So the fold sits behind `USE_BURN`, the bulb's program is token for token the text it
   was (`debug/scratch/r7/shader-diff.mjs`: 9 programs the same), and Burning draws with a program of its own
   (keys PRB, PTRB), built in the background the first time the switch goes on, the plain picture drawn
   meanwhile, as the Mandelbox's is. **The mix is a uniform in that variant**: dragging it compiles nothing.
4. **Julia mode with Burning works as it stands** and is not refused: the fold comes before the power in both
   modes and a constant cancels in a delta as before.
5. **The line rule is held off while Burning is on** (the owner's call 5). Measured after, below: not safe as
   it stands.
6. **Burning runs WHOLE orbits** (the owner's call 3: milliseconds at the same picture decide). Both ways were
   built; whole orbits were the faster over the places measured and stay; the resumed form and its crossing
   test were taken out again (they are in commit `cac8fcd8`), and the variant is built without the checkpoint
   ring.
7. **In the shell** Burning is a switch and a mix row on the Formula tab, for the Mandelbulb, and two of
   `FORMULA_CHOICE_KEYS`: a place, Back, Home, a scene, a link, pasted text and undo carry them; everything
   saved before 2026-10-12 is not burning. The switch does not move the camera (the burning bulb lies in the
   bulb's own ball at mix 1). No new starter card. "Start view" with Burning on stands 1.3 times as far out as
   the bulb's: from the bulb's own 3.23 the burning bulb is cut at the top and the bottom.

## What was measured

All on 2026-10-12: RTX 5070 Ti, Chrome through ANGLE d3d11, headless, the dev server of the working tree.
Scratch tools and logs: `debug/scratch/burning/` (git-ignored).

**The plain bulb did not move** (the gate for one program or two):

| | the fold as a uniform branch (first form) | behind `USE_BURN` (as built) |
|---|---|---|
| the direct proof's 100 lines, Burning off | 27 print other digits (seventh digit; all PASS) | the same to the character |
| the GLSL of the 9 kept programs (`shader-diff.mjs`) | - | token for token as before |
| 41 pictures against the tree before (`pictures.mts`) | - | 40 the same to the byte, 1 within its floor (the shell's Mandelbox picture, which does not repeat on an untouched tree) |
| a frame at 8 deep bulb views, after against before (`frame-time.mts`, 512 x 512, 2 rounds) | - | -6.0 % at the mean, +2.0 % at the worst view, -16.2 % at the best (the tree before had three slow readings in one round; the programs are the same text) |
| the ray program's build, cold | - | 8.15, 7.94 and 8.26 s in three pages (8.06 the day's figure before) |
| the Burning variant's build, cold | - | 6.1 s (8.7 to 9.0 s while it still held the checkpoint ring) |

**The CPU orbits** (`npm run check:deep-zoom-burning-orbit`, node, 2 minutes, 58 lines): the per-pixel twin
against exact fixed-point orbits at 29 places - powers 8 and 2, mix 1 (1e-3 to 1e-60, two rays each), mix 0.5
(9.6e-4 and 1.0e-10), mix 0.25 (to 1.0e-60), the camera 1e-40 from the plane x = 0, Julia mode - 1,134 points a
place: no point of the gated ones reads differently, no iteration count differs, no estimate is more than 1e-6
off (worst 7.8e-9). Seen red: the opposite-side case cut -> 27 of 58.

**The GPU kernel** (`npm run smoke:deep-zoom-direct`, 12 new lines, 338 points each, against the twin and
against a fixed-point orbit): ten gated lines with no point over 1e-3 (worst 8.4e-4) - mix 1 at 7.8e-11,
9.6e-61 (power 8) and 9.8e-31 (power 2), mix 0.5 at 9.6e-4 and 1.0e-10, mix 0.25 at 2.3e-31, the two views
beside the plane x = 0, Julia mode at 8.9e-11 and 8.9e-31. Seen red: the shader's opposite-side case cut -> 8
of the 10 FAIL. Two lines are printed and not gated: power 8 at 1.5e-31 (63 of 338 points over 1e-3, worst 1.4)
and power 2 at 1.8e-11 (7, worst 1.6e-2). One measurement was made of them: they are the points an f32-sized
nudge of the f64 twin's input moves most (medians 1.6e-4 and 1.9e-4 against 4.6e-6 and 1.3e-6 for their grids),
at the two places where f64 itself cannot settle the most points (46 and 9 of 1,134; the gated places 0 to 7).
The plain bulb at six places found the same way has no point over 1e-3.

**Whole orbits against resumed ones** (`orbits-ab.mts`; the harness as the shell sets it; a 384 x 384 draw;
128 x 128 rays as a 1080-row picture):

| Place | whole, ms | resumed, ms | resumed / whole, ms | kernel passes, resumed / whole | rays ending more than 2 pixel cones from whole's |
|---|---|---|---|---|---|
| power 2, 7.5e-4 | 3.3 | 3.9 | 1.18 | 0.86 | 0.45 % |
| power 2, 5.6e-9 | 7.2 | 7.0 | 0.97 | 0.54 | 0.23 % |
| power 2, 5.2e-18 | 15.8 | 13.8 | 0.87 | 0.42 | 0.10 % |
| power 2, 6.0e-32 (the study's 9.2 % place) | 46.6 | 58.4 | 1.25 | 0.53 | 0.11 % |
| power 8, 9.9e-17 | 3.5 | 2.8 | 0.80 | 0.45 | 0.21 % |
| power 8, 1.7e-38 | 13.9 | 11.4 | 0.82 | 0.46 | 0.00 % |
| mix 0.5, 1.0e-10 | 1.6 | 1.7 | 1.06 | 0.77 | 0.00 % |
| mix 0.25, 2.3e-31 | 4.6 | 5.3 | 1.15 | 0.70 | 0.05 % |
| all eight | 96.5 | 104.3 | 1.08 | | |

Half the passes buy no time: resumed is the faster at four places and the slower at four. The two finished
pictures (256 x 256, shaded) differ in 2.5 to 36 % of their pixels, 0 to 3.5 % by more than 2 levels of 255 - the
size of the difference the plain bulb's own two ways show in the same harness (7 to 33 %, 0.6 to 3.4 %). With
the ring out of the variant the eight places draw in 89.6 ms.

**The line rule under Burning** (allowance 2, as the plain bulb marches; whole orbits): 6 to 30 % fewer
milliseconds at six places and none at two (steps a ray 56 -> 46, 26 -> 17, 16 -> 11), and rays that end more
than 2 pixel cones from where they end without it: 0.00, 0.00, 0.43 and 1.12 % at four places, 4.3 and 4.7 % at
two, 26 % at power 8 by 9.9e-17, and every ray at mix 0.25. Left off.

**A picture beside a CPU still** (`stills.mts`; 96 x 96 rays, the GPU's own march against the navigation's ray
on the f64 twin, hit level one ray cone):

| View | both hit | one alone | depths more than 2 ray cones apart |
|---|---|---|---|
| the whole burning bulb, power 8, from 3.23 (the far field alone, from the ball) | 8,556 | 1 | 4 (0.05 %) |
| burning, power 8, 7.8e-11 | 9,216 | 0 | 699 (7.6 %) |
| burning, power 2, 5.6e-9 | 9,216 | 0 | 1,832 (19.9 %) |
| the plain bulb, power 8, 9.6e-11 (the control) | 9,216 | 0 | 129 (1.4 %) |
| the plain bulb, power 2, 7.2e-11 (the control) | 9,216 | 0 | 63 (0.7 %) |

The shapes are the same in every pair. The two marches end a ray by different rules on ground the ray runs
along; why the burning places differ five to thirty times as often as the plain ones was NOT traced.

**A mix under 1** (the node check's finder, an exact estimate walked down a ray): at mix 0.5 the estimate does
not fall smoothly towards most of what it calls a surface - it drops from 5e-4 to 1e-308 in one step where an
orbit creeps for hundreds of iterations on a folded axis while its derivative grows 8 times an iteration. Ten
rays at power 8 gave places at 9.6e-4 and 1.0e-10 and none deeper; ten at power 2 gave none. Mix 0.25 reaches
1e-60 at power 8. At 0.5 the negative octant inside the escape radius is solid, and thin parts of the set
reach far out (derived; not drawn).

**In the app, once** (`shell-rows.mts`): the switch by its row is one undo step; the renderer has the value in
the same push; the notice over the picture says the deep renderer is building and the picture is back 10 s
later (while another program held the GPU); the mix at 0.5 builds nothing; a saved place holds both values;
Ctrl+Z takes the switch back; the Mandelbox hides both rows and the bulb finds them again.

## Consequences

- A first switch to Burning waits for a program build (the variant's build time is above); every later one is
  instant, and the browser keeps the program across restarts as it keeps the others.
- Three programs for two formulas and a mode: the ray program, its Burning variant, the Mandelbox's. A further
  mode of the bulb that needs a branch in the kernel's pass will want a variant too, for the same reason; a
  factor on something the pass already computes (Julia mode) does not.
- KaliBox (the next stage) folds by abs on the Mandelbox's kernel: `burnFoldD` takes a signed coordinate as
  mantissa and exponent and a delta on the kernel's shared exponent, which is what the box's rows 2 to 4 hold
  at a folding limit of 0. It is inside `USE_BURN` and outside the box's program today: KaliBox moves it.
- A mix under 1 is another object, and much of it is poor ground: see the measurements. Nothing in the app's
  words promises depth there.

## Not decided here (the owner's)

1. **The two printed lines.** Accept them as the kernel's single-precision limit at ill-conditioned orbits, or
   have them looked into? (One measurement was made; the rule was no second hypothesis.)
2. **The picture beside the CPU still at depth**: 7.6 and 19.9 % of rays more than 2 ray cones apart at two
   burning places, 1.4 and 0.7 % at two plain ones. Not traced. Look into it before Burning is called done?
3. **The mix row's range.** Around 0.5 much of the object is flat ground with nothing under it. The row says so
   in its description. Leave the range at 0 to 1 (GMT's), or say more?
4. **The line rule under Burning** stays off on these numbers. A safe form (an allowance that knows the fold's
   planes) is not built.
5. **"Start view" with Burning on** stands 1.3 times as far out. His eye: `still-startview-power8-mix1.png`.
6. **A starter card, a What's New line**: none was asked for and none was made.
7. **Seen beside it, the plain bulb**: its own resumed orbits read slower than whole ones at its two power-2
   dive places (1.54 and 1.27 times the milliseconds) and faster at power 8 (0.82 and 0.32), with another
   program taking the GPU for part of that run. Worth one clean measurement at the kept power-2 places.
