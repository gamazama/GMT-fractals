# DRAFT, not filed: ADR-0138 or the next free number - Julia mode in the deep zoomer

Drafted 2026-10-12 while the owner was asleep; an ADR write waits for him. The build IS in the tree
(`136d867d`). The builder wrote the first text; the orchestrator edited it after looking at the
pictures. When he says yes it is filed under the next free number (0131 and 0132 are taken on the
unmerged `audio-perf-overnight` branch; `ADR-DRAFT-box-ray-step.md` proposes 0138 for a build that
is not in the tree, so the numbers are settled at filing).

What he has to decide is at the foot.

---

# ADR-01XX: Julia mode in the deep zoomer - one factor on the added vector, the constant carried by the view

- **Status:** Proposed
- **Date:** 2026-10-12
- **Relates to:** ADR-0135 (a formula is a shader variant; Julia mode is not one), ADR-0137 (the
  bulb's one program).
  Code: `deep-zoom/renderer/core.js` (grep `JULIA MODE`, `uAddC`, `setJuliaC`, `THE WHOLE OBJECT`),
  `deep-zoom/features/formula.ts` (`juliaMode`), `deep-zoom/locations.ts` (`juliaFromThisPlace`),
  `deep-zoom/components/JuliaHere.tsx`, `deep-zoom/data/boxStarters.ts` (the Kleinian card).
  Guards: `npm run smoke:deep-zoom-direct` (the "julia, ..." lines), `npm run check:deep-zoom-julia-orbit`,
  `npm run check:deep-zoom-param-map`, `-module-host`, `-location-parse`, `-box-orbit`.

## Context

The owner asked for more formulas: "take cheapest definitely, and start research on what else is
cheap or easy". A CPU study (`plans/deep-zoom-shell/JULIA.md`) measured Julia mode before anything
was built: the Mandelbox's delta step exact at 54 places down to 1e-60 with space stretched alike in
every direction; the Mandelbulb's exact too, but flattening along a dive. He ordered the build,
"great lets do 1-4". The terms recommended to him and built: both formulas, the Mandelbox first;
"Julia from this place" is the classic, one button; no number rows for the constant, which travels
as strings; the bulb below 1e-10 is built, looked at, and nothing is promised; the plain rebase in
Julia mode, the second reference not now; Kleinian as a card on the box; a route has one formula.

## Decision

1. Julia mode is GMT's own: the point looked at starts the orbit, one constant K is added each
   iteration. In the renderer it is one uniform, 1 or 0, a factor on the vector both kernels add
   and on the jet's "+ v". No program, no call of the kernel and no branch is added. GMT's "+ 1" in
   the running derivative stays.
2. K is held as the camera is, three 256-bit numbers, and is part of a view (`julia`, three decimal
   strings, present only while the mode is on). The mode is a row of `dzFormula`. A place, an undo
   step, a scene, a link and pasted text carry both; a constant that is not three whole numbers as
   text is refused.
3. The rebase to the origin is held off in Julia mode: it lands on the reference's first point as
   the image of the origin, which a Julia reference's is not. The second reference, the orbit of K,
   is not built.
4. "Julia from this place" takes the point at the centre of the view as K and puts the camera two
   radii from a ball the renderer finds about the set. The row switch does the same. Switching on
   puts the iteration floor back to 14. The trail ends on the switch.
5. GMT's "Kleinian" is a card of the Mandelbox (scale 1.8, fixed radius sqrt(1.2), min radius at
   the renderer's floor), with no kernel line of its own.

## Consequences

- Mandelbrot mode did not move: the march bench's JSON byte for byte, the direct proof's 74 earlier
  lines to the character, 41 pictures the same or within their floor, frame time within +2.2 % on a
  bulb view and +4.5 % on a box view, cold builds +2.6 % and +1.5 %.
- The Mandelbox's Julia sets are held on the GPU at the Mandelbrot bar from outside to 1e-30 (six
  lines, worst 1.5e-4) and draw clean: a slatted cube from outside, a smooth wall where the test
  dive ended at 2.8e-31 (like the Mandelbox itself, most straight dives end on a smooth wall).
- The Mandelbulb's are held only for a constant inside the bulb at 1e-10. For a constant on the
  bulb's surface the kernel is off by more than 1e-3 on 25 of 338 points at 1e-3, 12 at 1e-10, 131
  at 1e-30; inside the bulb, 113 at 1e-30. That is the plain rebase's grain: the same kernel in
  Mandelbrot mode reads 23 and 37 of 169 rays with it and 0 with the rebase to the origin. The
  second reference is the repair; the study's 24-bit emulation had under-read its worth as a fifth.
- On screen the bulb's Julia sets are a grainy body with a halo of stray specks from outside (cause
  not known; one measurement: the scalar estimate under-reads on four rays, so it is not
  overshoot), a clean folded relief at 1.8e-7, half grooves at 2.8e-11, parallel streaks from
  1e-20. Nothing in the app promises depth there.
- The Kleinian card's whole view is 0.1 to 0.3 % off the CPU twin on 16 of 338 points, over the
  bar and printed ungated; its deep line passes at 9.3e-31.
- Not done: a smoke step for Julia mode (the app's behaviour is scratch-proven:
  `debug/scratch/formula-next/step4/`), ~~the constant on the timeline~~ (built later the same day:
  the section below), GMT's picker, the status chip saying which mode it is, the plain picture
  before ready in Julia mode, a route played or rendered in Julia mode.

## 2026-10-12, later: rows for the constant

The owner flew the mode and said: "I dont see how to set the julia constant's coordinate." Asked
whether he wanted three rows under the switch, live and keyable, with a deep constant kept exact
until a row is touched and the button kept, he said: "2f yes". So the term above, "no number rows
for the constant", is withdrawn. Decision 2 stands: the renderer's three 256-bit numbers ARE the
constant, and a view carries them as strings.

What was built:

1. Three params of `dzFormula`, `juliaX`, `juliaY`, `juliaZ` (doubles, default 0), shown as one
   row, "Constant", between the switch and the button while Julia mode is on (`juliaConstant`,
   composed as Pre-Rotation is). The slider runs from -4 to 4 in steps of 0.001; that is a range,
   not a limit. Track ids `dzFormula.juliaX` / `Y` / `Z`: they keyframe like any row.
2. The renderer's seam, two lines: `setJuliaC` also takes three finite numbers (each becomes the
   fixed-point number of that double), and `api.formula()` also hands the constant out as three
   doubles (`cNum`). A view's `julia` is strings only, as before.
3. The precision rule. The formula push sends the rows only when they differ from the constant the
   renderer holds, read back as doubles. Rows that merely show a deep constant send nothing.
4. The rows follow the view. A jump (a place, Back, Home, pasted text), the button, the switch and
   a loaded scene, link or session write the three rows from the constant's strings in the same
   store write or undo step. Without it a scene from before the rows existed (rows 0, 0, 0) and a
   share link (numbers rounded to four decimals) would overwrite their own constant a frame later.
5. Undo stays exact. The last eight constants that came with a view are remembered with their
   doubles; rows put back onto one of them send its strings.
6. A row moves neither the camera nor the iteration floor. A drag is one undo step.
7. The switch and the button are no longer the same step (Decision 4 said they were). The owner,
   the same day, to "the switch re-enters with the last constant when there is one; the button
   takes the point": "2c - yes". Switched on, the mode comes back to the last constant - the
   Constant row is not 0, 0, 0, or the renderer still holds one - exact, and shows the whole of
   its set; the floor goes back to 14 as before. With no constant yet it takes the point at the
   centre of the view. "Julia from this place" always takes the point. So that a jump to a place
   in Mandelbrot mode does not change which constant is the last one, a jump writes the rows from
   the view's constant only and no longer reads the three numbers a saved place's formula holds.

Measured in the app (2026-10-12, RTX 5070 Ti, headless Chrome on the real GPU, one run,
`debug/scratch/julia-rows/app-rows.mts`):

- A fresh app at the kept place "Slicing" (2.8e-39 deep), no constant yet: the switch took the
  point looked at (rows -0.38813, -0.00062, 0.99194), one undo step, the floor at 14.
- Switched off, a jump to the kept place "Power 2" (5e-20 deep), switched on: the same three
  77-digit strings to the character, at once and eight frames later, not the point looked at
  there; the camera moved to the set; one undo step, and its undo put the camera back.
- The button, pressed there with that constant in force, took the point looked at instead (rows
  -0.35667, 0.69670, 0.37024); eight frames later its strings were the same to the character.
- A drag of X by 0.02 in five steps was followed by the renderer at every step, left the camera
  and the floor alone and made one undo step; its undo brought the strings back to the character,
  redo the dragged constant, undo the strings again.
- 5.5 typed into the X cell was taken as 5.5, outside the slider's range.
- With a route of two keyframes and `juliaX` keyed over 60 frames, the renderer held the row's
  value straight after each scrub, before a frame had passed, at four frames tried.

Guards: `npm run check:deep-zoom-param-map` (the "constant: ..." lines; the precision rule and the
exact undo were each seen red), `check:deep-zoom-julia-orbit` ("rows: ...", seen red; the two
"seam: three finite numbers ..." lines), `check:deep-zoom-scene-roundtrip` and
`check:deep-zoom-module-host` (one or two lines each, none seen red for its own subject). Which
constant the switch takes, and the button and the switch writing the rows, have no check line: the
run above is all that says so.

Left as it was: a constant set by the rows is three doubles and no deeper, so a deep Julia place
whose row is touched is no longer that place (undo brings it back). No picker in the viewport.

---

## For the owner (the pictures are in `debug/scratch/formula-next/`)

1. **The bulb's Julia mode: does it stay as it looks?** Look at `julia-bulb-1-julia-whole.png` (the
   grainy body from outside: what "Julia from this place" shows first on the bulb),
   `julia-bulb-2-julia-1e-6.png` (clean and worth seeing), `julia-bulb-3-julia-1e-10.png`,
   `-4-julia-1e-20.png`, `-5-julia-1e-30.png` (grooves, then streaks). Beside them the box:
   `julia-box-1-julia-whole.png`, `julia-box-3-julia-1e-30.png`.
2. **Build the second reference next?** The GPU says it is what the bulb's ungated proof lines
   need. It would not cure the flattening that fills the screen at depth, and the grain from
   outside has another, unknown cause.
3. **The row's switch takes the point looked at, as the button does.** Wanted, or should the
   switch only re-enter with the last constant?
   ANSWERED 2026-10-12 ("2c - yes") and built: the switch re-enters with the last constant when
   there is one; the button takes the point. See "2026-10-12, later: rows for the constant".
4. **Switching Julia on puts the iteration floor back to 14.** Without it the whole set drew as
   static at a deep place's count of 98.
5. **The Kleinian card**, with its whole-view proof line over the bar: keep?
