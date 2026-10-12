# ADR draft: KaliBox, a third formula in the deep zoomer

**Status:** DRAFT, written 2026-10-12 with the build. Not filed under `docs/adr/`: the owner files it (or says
what to change first). It would follow ADR-0135 (a second formula), `ADR-DRAFT-julia-mode.md` and
`ADR-DRAFT-burning.md`.

## Context

The owner's "5 yes burning and kalibox" and his "calls for me: 1-7 yes accepted" on
`plans/deep-zoom-shell/BURNING-KALIBOX.md`: GMT's KaliBox (`engine-gmt/formulas/KaliBox.ts`) beside the
Mandelbulb and the Mandelbox. GMT's preset ships as a card in Julia mode and the card says it holds its shapes
at Detail 1 only, with no rule keyed to the formula (call 1); what opens first is Scale 1.8 with the point
added (call 2); with the point added there is no whole object, so the start view and the cards are places near
the tip and the far distance is set by hand (call 7); it comes after Burning and takes Burning's abs table
(call 6).

ADR-0135 says what a formula costs here: its fixed-point map, its reference rows, its kernel step, its CPU
orbit and the plain single-precision copies. The study said KaliBox would need less than that.

## Decision

1. **KaliBox is the Mandelbox's step with another fold.** GMT's map is `p = abs(p) + T`, a sphere fold whose
   factor is `clamp(1 / |p|², 1, 1 / MinRad2)`, then `scale` and `+ c`. That is the box's sphere fold at a fixed
   radius of 1 and an inner radius squared of MinRad2, with the box's scale, constant and derivative. So it is
   drawn by everything the box is drawn by - the kernel's frame, the page's march, the far field, the count
   rule, the probes, the navigation's rays (`boxOn()` is true for both) - and its own is the fold alone.
2. **No new reference row.** The KaliBox record has a folding limit of 0, so rows 2 to 4 of the box's orbit
   texture (`U - L` and `U + L`, each a mantissa and its own exponent) are the signed coordinate the abs table
   needs, however near a plane the reference stands. The translation is the same for a pixel and the reference
   and is not in a delta.
3. **A VARIANT OF THE BOX'S PROGRAM (`USE_BOX` + `USE_KALI`, keys K and KT), not a uniform in it.** For the
   reason Burning gave: the Mandelbox's program must not move, and behind the `#define` it is token for token
   the text it was. The fold as a delta is Burning's case table at a factor of -1. On the CPU it IS Burning's
   function (`burnDeltaJS`); in the shader it is a three-line copy (`kaliFoldD`), because `burnFoldD` stands in
   the bulb's half of the kernel and reads a uniform the box's program does not have, and moving it would have
   changed Burning's program text.
4. **Its numbers are its own** (`kaliScale`, `kaliMinRad2`, `kaliTrans`, `kaliRot`), kept apart from the
   Mandelbox's in the renderer and in the store, so each formula finds its own again.
5. **MinRad2 is held at or under 1** (GMT's row runs to 2). From 1 up GMT's factor is `1 / MinRad2` everywhere:
   no sphere fold is left, and the box's three-region fold does not describe that map.
6. **Rotation is in**: GMT's one angle about the axis (1, 1, 0). The box's rotation applies unchanged - the
   kernel turns the delta before the fold and rows 2 to 4 hold the turned coordinate - with another matrix. It
   has a proof line at 9.9e-21 and a check line for the matrix.
7. **The far distance.** In Julia mode there is a ball (derived as the box's own: beyond
   `max((|s| |T| + |K|) / (|s| - 1), |T| + 1)` the map only grows a vector). With the point added there is none:
   a ray is followed 40 from the origin, by hand - **and, from a camera far out, 8 times that camera's own
   distance**, also by hand. The second number was added after the far view was measured (below).
8. **The navigation's ray steps by half the estimate** on KaliBox, as the box did until today. The whole
   estimate was measured for the Mandelbox alone.
9. **In the shell** `kind` has a third option (index 2; 0 and 1 keep their meaning). Rows with GMT's labels:
   Scale, MinRad2, Translation (one composed row), Rotation; the Mandelbox's Step size row shows for both. Six
   more of `FORMULA_CHOICE_KEYS`: a place, Back, Home, a scene, a link, pasted text and undo carry them. A
   switch to KaliBox lands on one fixed view of the tip (the study's outside camera), mirrored through the
   origin for a negative scale; in Julia mode on the whole set, as for the others. Six cards. A formula choice
   now always says its kind and may leave out any other key, so a KaliBox card does not carry the Mandelbox's
   numbers and leaves that formula's rows as they are.

## What was measured

All on 2026-10-12: RTX 5070 Ti, Chrome through ANGLE d3d11, headless, the dev server of the working tree.
Scratch tools, logs and pictures: `debug/scratch/kalibox/` (git-ignored).

**The other programs did not move.** `debug/scratch/r7/shader-diff.mjs a8986bb3`: 9 programs the same, token
for token. The direct proof's 105 earlier lines print the same to the character. A frame at the bulb's and the
Mandelbox's views, after against before (`frame-time.mts`, 512 x 512, one round): the bulb's eight views -2.3 % at the mean (the worst +4.3 %, the best -17.1 %), the Mandelbox's three -0.5 % (the worst +1.1 %): one round's noise about nothing, the programs being the same text.

**Build and frame time.** KaliBox's program builds in 2.0 to 2.2 s cold (four fresh browsers: 2,045 to 2,216 ms;
the Mandelbox's 2,256 ms in the same page), 2.07 s from the switch to a deep picture; in the app, with the
tutorial's page and another program on the GPU, 3.6 s. One 512 x 512 deep draw at its cards
(`kali-time.mts`): Tip 1.5 ms, Holes 7.2, Plates 20.0, Sheets 19.9, GMT's preset 0.7, GMT's city 5.5 (the
Mandelbox's Whole box 0.8, Arches 10.7, Block city 76.4 in the same page).

**The CPU orbit** (`npm run check:deep-zoom-kalibox-orbit`, node, 3 s, 27 lines): the per-pixel twin against
exact fixed-point orbits of GMT's map as its shader writes it, at 11 views - Scale 1.8 and -1.5 with the point
added, GMT's preset in Julia mode, a rotation of 0.6; from outside, at 1e-8 to 1e-30, and with the camera 3e-51
from the abs plane x = 0 - 1,134 points a view: no gated point reads differently, no iteration count differs, no
estimate is more than 1e-6 off (worst 2.2e-10). Seen red: the opposite-side case cut -> 12 lines.

**The GPU kernel** (`npm run smoke:deep-zoom-direct`, 9 new lines, all gated, up to 338 points each, against
the twin and against a fixed-point orbit): no point over 1e-3 on any line, the worst 5.5e-4. Seen red: the
shader's opposite-side case cut -> all nine FAIL.

**A picture beside a CPU still** (`stills.mts`; the study's own dive, 96 x 96 rays, the GPU's march against the
navigation's ray on the f64 twin, hit level one ray cone; and `side-*.png`, the study's rule on the CPU beside
the GPU's picture, 320 x 200):

| View | rays both hit | one alone | depths more than 2 ray cones apart |
|---|---|---|---|
| Scale 1.8, the tip from outside | 9,216 | 0 | 9 (0.1 %) |
| Scale 1.8 at 9.9e-3, 9.8e-5, 9.5e-9 | 9,216 each | 0 | 81, 117, 26 (0.9, 1.3, 0.3 %) |
| Scale 1.8 at 9.5e-17, 9.6e-31 | 9,216 each | 0 | 357, 116 (3.9, 1.3 %) |
| GMT's preset from outside | 1,623 | 2 (the CPU alone) | 6 (0.4 %) |
| GMT's preset at 4.1e-3, 5.0e-5, 4.6e-9, 4.9e-17 | 9,216 each | 0 | 72, 49, 151, 57 (0.8, 0.5, 1.6, 0.6 %) |

The renderer's iteration counts are the study's own at every place of the Scale 1.8 dive (41, 52, 61, 71, 92,
136). In Julia mode the renderer's estimate reads about half the study's (5.5 against 11 from outside, 4.1e-3
against 8.0e-3): the study took the true derivative there, the renderer keeps GMT's "+ 1" as it does for the
other two formulas (`ADR-DRAFT-julia-mode.md`).

**The view from far** (`far.mts`: the tools of `debug/scratch/far-specks/` turned on KaliBox; 128 x 128 rays as
a 1080-row picture against GMT's map marched in f64 on the CPU; the kernel on a 256 x 256 slice against the
direct orbit). Neither of the bulb's two far rules is needed.

| | stray hits | holes | hits more than 2 pixels of depth off | the kernel on the slice |
|---|---|---|---|---|
| GMT's preset (the column), 8 to 300 from its middle, six distances | 0.00 % | 0.00 to 0.01 % | 0 to 0.92 % | 0 of 65,536 wrong at each |
| Scale 1.8, 8.5 to 400 from the middle of its shapes, five distances, as built | 0.00 % | 0.00 % | 0 to 0.42 % | 0 to 32 estimates off by more than 2 times; 0 to 93 read inside where the orbit is outside |
| the same with the far distance held at 40 alone (the first build) | 0.00 % | **22.0 % from 60, 69.9 % from 150, 93.8 % from 400** | - | the same |

The last row is what was wrong: an octant without end, cut by a far distance that stayed put, was drawn as a
corner with a round back, smaller the farther out the camera stood (`far-s18-head.png`). With the reach
following the camera it fills the picture alike from every distance (`far-s18.png`). The referee of the second
and third rows follows the octant 50 camera distances out.

**Detail** (the owner's call 1; `still-julia-1-1e-2.png` and `still-julia-1-1e-2-detail16.png`, 960 x 600, 8
samples): at Detail 16 GMT's city is not grain on the GPU. It is another, far finer city: each block of the
Detail 1 picture is resolved into storeys and arcades. The study's "grain" was one sample a pixel at
320 x 200. The cards say what holds either way: the shapes of Detail 1 are Detail 1's alone.

**In the app, once** (`shell-look.mts`): the switch is one undo step and lands on the tip; the host says
`building() = "kalibox"` and the page says so; the renderer reads back Scale 1.8, MinRad2 0.3492, the
translation and the Mandelbox's own numbers untouched (-1.5 and 0.25, set before the switch); all six cards
land where their names say; a saved place carries the formula, its numbers, Julia mode and the constant; Start
view at Scale -1.5 stands on the other side; a Scale of 0.4 rests on 1.02; Julia mode switched on by its row at
the preset's numbers shows the whole column from 11.9 away (the renderer's ball: radius 5.95 about the origin);
back on the Mandelbox its rows are as they were left.

## Consequences

- Four programs for three formulas and a mode: the ray program, its Burning variant, the Mandelbox's, KaliBox's.
  A further formula that is the box's step with another fold costs what this one did: a fold in the fixed-point
  map, a delta table, two plain-f32 lines and a `#define`.
- `boxOn()` now means "drawn by the box's kernel", not "the Mandelbox". Code that must tell the two apart asks
  `kaliOn()` or the orbit's record (`O.box.kali`).
- A formula choice may leave out any key but its kind. `formulaHome` and `locationKey` read a missing number as
  its row's default.
- The far distance of a set without end follows the camera. `boxExtent()` stays a fixed 40 for it: the
  whole-object scan and the test dive's "left the scene" test read that, and neither applies to a set with no
  whole.

## Not decided here (the owner's)

1. **Detail at GMT's preset.** The cards say "holds these shapes at Detail 1 only", as decided. On the GPU a
   high Detail is not grain but a finer picture (above). Keep the words, or say it the other way round: "Detail
   shows a finer city each step"? His eye: the two stills.
2. **Two preset cards.** The brief asked for one card of GMT's preset; there are two, the tower from outside
   and the city inside it, because the city is where the Detail note can be seen. Drop one?
3. **The preset's tower stands 1.6 times as far out as the study's camera**, so the whole of it is in the
   picture (`still-julia-0-outside-x1.6.png` against `still-julia-0-outside.png`).
4. **The start view** is the study's outside camera, 8.5 from the middle of the shapes
   (`still-s18-0-outside.png`): a ridge with fins. Nearer the tip, or another side?
5. **The far reach of 8 camera distances** is a number set by hand, like the 40. From 400 away the corner fills
   the picture as it does from 8.5.
6. **The navigation's ray at half the estimate.** The whole one was not measured for KaliBox. With the point
   added its map stretches space unevenly (10.6 in the study against the box's 1.3), so half is the careful
   choice; one run of `debug/scratch/box-nav/nav-rerun.mts` on KaliBox's cards would say.
7. **MinRad2 above 1** is not drawable (held at 1). GMT's row goes to 2; there the map is abs, a shift and a
   scale, with no sphere fold.
8. **A What's New line** was changed in the help's own text ("a Mandelbulb, a Mandelbox or a KaliBox"); nothing
   was added to the in-app changelog.
