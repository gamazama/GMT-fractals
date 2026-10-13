# Deep zoom - zoom-outs: a route played backwards, and a route out of a place nobody flew to

Written 2026-10-12 for `NEXT.md` session 3 ("one page and his yes before code"). No app file was
changed. It rests on the source read directly (`deep-zoom/route.ts`, `trail.ts`,
`engine/animation/zoomPath.ts`, the host contract, the CPU ray block of `core.js`) and on a CPU study
in `debug/scratch/zoom-outs/` (git-ignored, node only: the renderer's ray and orbit functions lifted
as text, the way `check:deep-zoom-ray-probe` lifts them, on seven views: his three kept places and
the four starter views that do not start at the whole bulb). Every number is marked MEASURED (with
its script), READ (with its grep target) or DERIVED. **Nothing here was seen on the GPU: no picture
of any of these routes exists yet.**

## What he gets

1. **Reverse**: one button on the Route tab. Any route plays the other way; one undo brings it back.
2. **Zoom out from here**: from the view on screen, a route back until the whole object is in frame.
   Every leg tested against the solid as it will be drawn, every keyframe with its own iteration
   count and its own picture.
3. **Zoom in to here**: the same route the other way round: it starts on the whole object and ends
   on this view. This is what a finished video mostly wants, and it is (2) mirrored before it is
   written. ("Dive" is a taken word: the Dive-to-depth action. READ: `ROUTES.md`, "Words".)
4. From there it is a route like any other: Even pace, Play, free look, Render.

## What the study measured

| Fact | Number | Tool (`debug/scratch/zoom-outs/`) |
|---|---|---|
| Straight back is rarely free all the way | At 5 of the 7 views the seven rays about the reversed view axis meet the solid: after 4.6 decades at his e20 place (1.62e-15), 3.1 at the slicing place; at the power-4 starter the wall behind is 22 decades NEARER than what is looked at | MEASURED `probe.mts` |
| **The navigation's rays are too wide to find the way out** | A ray ends where the estimate is under `tol` of its length (READ: `o.de<tol*t` in `rayFreeJS`). The navigation asks 0.05, a pick 0.005 (READ: `DZ_PICK`). From his e20 place 0 of 400 rays reach open sky at 0.05 and at 0.02; **67 of 400 at 0.005, the nearest 4.7 degrees off straight back** | MEASURED `sky-tol.mts` |
| A rule on wide rays winds through caves that are not there | His e20 place: 379 and 398 degrees of turning (two settings) before it finds sky near 7e-13; "straight back while it is free" dead-ends there at 1e-14, also with 40 dead ends backed out of | MEASURED `gen.mts --rule sky`, `--rule back` |
| The rule below, on thin rays | All 7 views reach the whole object; no leg through the solid as the engine plays it. Turning in all: 10.4, 6.3 and 5.4 degrees where a sky line lies near straight back (his two power-2 places, "Past f64"); 66 and 118 where the nearest one is far off it (one keyframe turns 54 and 108 degrees: "Grain of sand", his slicing place); 148 and 350 where no ray reaches the sky from the place and the longest ray is walked 13 and 37 times (the two deepest starters) | MEASURED `rule.mts` |
| What it costs on the CPU | e20: 642 rays, 75 reference orbits, 0.82 s. The worst (3.4e-76, 55 keyframes): 14,610 rays, 28.5 s. One thin ray 1.5 ms at e20 and 8.7 ms at 3.4e-76; one reference orbit 9 and 19 ms; the leg check 40 ms a leg at e20 | MEASURED `rule.mts`, `sky-tol.mts`, `probe.mts` |
| Mirrored keys retrace the route | Position within 2.8e-14 of the depth there, the depth curve within 2.5e-14 decades, orientation within 0.3 degrees (the route with 19 turns; under 0.05 on the other six) | MEASURED `rule.mts --mirror` |
| How large the object is on screen | From the app's whole-bulb distance (3.234 from the centre) the power-8 bulb is 1.20 of the frame's half-height, power 4 1.38, **power 2 1.5 to 2.1** by the side it is seen from. At 4.5: 0.85, 0.96, 1.0 to 1.5. Power 2 is 0.7 to 1.0 at 6.5 | MEASURED `sky.mts` |
| Iterations on the way out | By the renderer's two rules from the formula's default floor of 14: 95 at his e20 place (it was saved with 86), falling about 3 a decade to 32 at the whole object | MEASURED `rule.mts` (the rules written out again in `lift.mts`, not lifted) |

## The design

### 1. Reverse

**A new route that replaces the old one, in one animation-undo step. Not a playback direction.**
Play, scrub, the render and the graph editor all read keys in time order; a direction flag would have
to be honoured by each of them and by the engine's timeline, which is a private player by another
door. Mirrored keys need no new player at all.

What is mirrored, about the route's own span (frame f becomes first + last - f, so the span stays):
- **The keyframes** (`camera.depth`): order and times. Each view is kept to the digit, each key keeps
  its id (so its picture, and what it was cut from, stay with it).
- **Every heading is negated** (READ: `zoomPath.ts` PITFALLS, "Reversing the order of the keys means
  negating every heading too, or each key is entered backwards").
- **The depth curve's handles**: the timeline's own (auto) are worked out again, as `retimeRoute`
  does; shaped ones are mirrored (left and right swapped, their time offsets negated). A segment's
  interpolation is its left key's (READ: `k1.interpolation` in `AnimationMath.ts`), so it moves one
  key over.
- **The iteration keys**, the same way: each stays with its keyframe.
- **A recorded free look** (the three look tracks), the same way. A look is a turn in the camera's
  own frame, so its values stay as they are.
- **A route cut from the trail** keeps both its controls: its keys are pointed at the trail reversed
  (order, clock, the `gap` marks), so the smoothing slider cuts again from that, and "As flown" is
  the flown clock mirrored. Session memory, as today.
- The playhead goes to its mirrored frame: the picture on screen does not change.

Not mirrored: anything else he keyed on the timeline (a light, a colour). Reverse is of the route.
Engine piece: one pure `mirrorKeyframes(keys, first, last)` beside `AnimationMath`, generic (GMT
could reverse a selection with it). No new decision record: it is still ADR-0136's route.

### 2. Zoom out from a view

**Words.** THE PLACE is the point in the middle of the picture: the camera's position plus what the
app's own pick ray reads along the view axis (`host.freeDistance(axis, DZ_PICK)`). STRAIGHT BACK is
the direction from the place to the camera. A ray REACHES THE SKY when it ends open past the far
limit (READ: `SENSE_FAR = 8`). A ray's WIDTH is its `tol`: 0.05 the navigation's, 0.005 a pick's.

**The rule, from each keyframe** (`rule.mts` runs exactly this):
1. **The line it is on** (at the place: straight back). One ray along it, at widths 0.05, 0.02 and
   0.005, the widest first. It reaches the sky at one of them: the next keyframe is one decade
   farther along the same line. Nothing turns, nothing is searched.
2. **Else the search**: 400 thin rays over the whole sphere but a 30 degree cone towards the place.
   Of those that reach the sky, the 8 least turned from straight back are asked again at the wider
   widths; the one that reaches the sky at the widest is the new line (of several, the least turned).
3. **No ray reaches the sky**: the longest of them is the way, for the smaller of one decade and
   half its length; from there, look again. With no step of a twentieth of the depth left, it stops.

Why thin rays, and why "the sky": a route out is one straight line wherever such a line exists, and
it exists more often than the navigation's rays say (from the place itself: at 4 of 6 views with
thin rays, at 1 of 6 with the navigation's: MEASURED `sky-tol.mts`). A straight line needs no
judgement about corners, the engine's path between collinear keyframes IS that line (DERIVED: a
Hermite curve with collinear keys and tangents), and on a straight line "the place is in view" and
"the leg is clear" are the same fact.

**Every leg is clear, by two tests.** The ray says the line is free with the count of the keyframe
it leaves. Then each leg as the engine will PLAY it is asked at 9 points whether it is inside the
solid as drawn with the count keyed there: the question the route's own `legInSolid` asks
(`host.estimateAtPoint`), asked of the keyframes before they are written. A leg that fails is tried
again at half the step, twice; one that still fails is left and shows red in the tab, as any leg
does today.

**Spacing: one keyframe a decade.** 21 keyframes for his 20.2 decades, 55 for 54 decades (MEASURED),
about 78 for 77 (DERIVED), under the route's cap of 300 (READ: `ROUTE_TRAIL_KEYS`). On a straight
line the spacing is not about clearance; it is about the count (keyed a keyframe, linear between),
about the depth curve (many keys keep the pace even) and about asking the line again with each
keyframe's own count. It is also the density of the routes he has flown and approved: 21 to 43
keyframes on his 36.8-decade dive (READ: `ROUTES.md`, R4's table). Half a decade (40 keyframes) and
two decades (11) gave the same line at e20 with no leg in the solid (MEASURED `rule.mts --step`).
Where no sky line exists the steps shorten by themselves: half the longest ray.

**Iterations.** A keyframe's count is what the renderer itself settles on there, started from the
formula's default floor (READ: `default: 14` in `features/formula.ts`): the camera is put on the
keyframe with that floor and the renderer's two rules raise it over a few frames (READ: `auto
iteration budget`, ITERATIONS AS A MARGIN). Both read the camera's own reference orbit, so no
picture is needed, only frames that run. Every ray from a keyframe is cast with its own count: with
fewer iterations the drawn solid is fatter, and at e20 a line that was open with 95 and 92
iterations was shut with 88 (MEASURED). The first keyframe keeps the count on screen. With Auto
iterations off, every keyframe gets the count on screen. If a count is wrong: too few and the
surface is the smooth n-iteration level, not the fractal (READ: "the cap, not the fractal, shaped
the surface"); too many costs time, and how the whole object looks at a deep place's count was not
looked at (no GPU).

**The aim.** At the place from every keyframe from which a thin ray reaches it; where it is hidden,
down the line just travelled. On a straight route that is his own framing with the place dead
centre, shrinking to a point. Only the LAST keyframe looks at the formula's centre (the origin: where
the box's home view already looks), and the engine's orientation curve spreads that turn over the
last leg: 5.7 degrees at e20. The roll is the view's own throughout.

**The end: by what is on screen.** On a line that reaches the sky, the last keyframe is the nearest
point of it from which, aimed at the centre, 24 thin rays through a circle at 0.9 of the frame's
half-height all reach the sky and the middle ray meets the object (found by halving, out to 7.5 from
the centre: past that the middle ray would run into the rays' far limit of 8). It ends 6.3 and 6.8
from the centre at power 2, 4.8 at power 4 and 4.3 at power 8 (MEASURED). Not "at the app's
whole-bulb distance" (3.234): from there a power-2 bulb is up to twice the height of the frame.

**Then it is a route.** Legs are timed as K times them (`legFrames`, 0.5 decades a second on screen):
40.8 s for e20. Keyframes can be moved, replaced, deleted; "Even pace", free look and Render work.

## What it looks like in the app

- **Route tab**, under "Route to here": **Zoom out from here** and **Zoom in to here**. In the timing
  row beside "As flown" and "Even pace": **Reverse**. No button on a place's card in the first
  build: a place is one click (a jump), and the route is made from the view on screen, as K keys it.
- **While it works** (seconds; half a minute or more at the deepest places): the camera is really moved
  back, keyframe by keyframe, because rays are cast from where the camera stands. So he watches the
  picture step back a decade at a time, and each keyframe gets its picture for the tab. The depth
  readout shows "Zooming out · 3.8e-20 to 3.5e-14 · 7 keyframes" with **Stop**, in the place where a
  dive shows "Diving · ..." (READ: `DepthReadout.tsx`); W A S D and Escape stop it, as they stop a dive.
- **When it is done**: the route is written in ONE animation-undo step, the camera is back on the
  view it started from (the route's first keyframe, or its last for a zoom-in), the playhead is on
  it, and a toast says "Route made: 21 keyframes, 20.2 decades, 40.8 s".
- **An existing route**: asked first when it holds keyframes set by hand ("Replace the route?", the
  dialog that "Route to here" already has); a route cut from the trail is replaced without asking,
  as today. One undo on the timeline brings either back.
- **What he is told when it cannot**: "Nothing is in the middle of the picture: turn to face the
  place" (the view looks at open sky); "The camera is inside the solid"; "No clear way back was found
  past 3.2e-15: 6 keyframes kept. Fly on from the last one and press K" (K adds after the last
  keyframe, so a route that stopped half-way can be finished by hand). Stopped by him: nothing is
  written and the camera goes back.

## His e20 place, step by step (MEASURED: `rule.mts --only 0 --verbose`)

1. **The view.** The pick ray reads 3.85e-20 to the middle of the picture (the scene file's 5.08e-20
   is the nearest surface in any direction). 95 iterations, not the 86 it was saved with.
2. **Straight back** the navigation's rays stop at 1.62e-15, 4.6 decades up. The thin ray reaches the
   sky. Keyframes 2 and 3: 3.84e-19 and 3.84e-18, his own framing, no turn, 92 and 88 iterations.
3. **At keyframe 3** the line is shut (88 iterations draw a fatter solid). One search, 400 thin
   rays: a new line 4.7 degrees off straight back. The view turns 4.2 degrees to keep the place centred.
4. **Keyframes 4 to 6** (3.8e-17, 3.9e-16, 3.8e-15; 84, 82, 78 iterations) stand on that line where
   it is open to a thin ray only. **This is the tight stretch: on leg 5, between keyframes 5 and 6,
   the estimate at the camera falls to 0.0097 of the depth** (the room it has, by the estimate).
5. **From keyframe 6 on** the ray along the line reaches the sky at the navigation's own width.
   Keyframes 7 to 20 stand a decade apart from 3.5e-14 to 0.38, 73 falling to 34 iterations,
   nothing turning.
6. **The end**: 6.29 from the centre, looking at it, 32 iterations, a turn of 5.7 degrees.

In all: 21 keyframes, 20.2 decades, 40.8 s at the even pace, 10.4 degrees of turning, the place in
view from every keyframe, no leg through the solid. 642 rays and 75 reference orbits (0.82 s), and
0.8 s for the leg check. Mirrored it is the zoom-in. With 100, 200 or 800 rays, or a thin width of
0.002 or 0.01, it is still one line found in at most one search (5.6 to 24 degrees in all), but the
room on leg 5 moves between 0.0004 and 0.011 with which line is found. A line chosen for its room
instead is 23.6 degrees off straight back: 28 degrees in all, 0.019 on leg 5 (MEASURED `rule.mts
--room 0.08 --keep 40`; of the 40 sky lines nearest straight back none has more).
**To be seen in the app before anything is promised: what a pass at 1 % of the depth looks like** (a
wall that near, if it is in frame, is large for a frame or two), and how long the counts take to settle.

## Stages (sizes are guesses; Z1 to Z3 do not touch `deep-zoom/renderer/core.js`)

| # | Stage | What changes | Proof | Size, a guess |
|---|---|---|---|---|
| Z1 | **Reverse** | `mirrorKeyframes` in the engine; `reverseTrail` in `trail.ts`; `reverseRoute` in `route.ts`; the button | `check:deep-zoom-route` "reverse: ..." lines: reversed twice is the route to the digit; the view, the count and the look at mirrored frames; one undo step. `check:deep-zoom-trail`: the slider and "As flown" on a reversed route. In the app: reverse a flown route, play, undo | 250 lines, half of it check; a third of a session |
| Z2 | **The rule, with no app** | `deep-zoom/zoomOut.ts`: the rule as a pure function over a small probe (stand at a position, a ray, the estimate at a point). Nothing calls it yet | `check:deep-zoom-ray-probe`, which already lifts the CPU functions and imports his places: "zoom-out: ..." lines for three of the views (his e20 and slicing places, "Grain of sand": about 5 s in node; all seven take 46 s): keyframes, turning, no leg in the solid. Seen red with the thin width set to 0.05 | 400 lines, half of it check |
| Z3 | **In the app** | The probe over the host (the camera moved, the count left to settle, the pictures), the two buttons, the readout line and Stop, the question, the toasts | `check:deep-zoom-route` with its fake host: one undo step, payloads and headings, iteration keys, nothing written on Stop, the question. Driven in the real app: his e20 scene, zoom out, play, a draft render, zoom in, Stop half-way, undo | 300 lines; with Z2 one builder session (R3 and R4 were 74 and 89 minutes) |
| Z4 | Later, when `core.js` is free, only if the wait is felt | Two CPU handles: the count at a position, a ray from a position. The route is then made without moving the camera or waiting for frames | Two lines in `check:deep-zoom-ray-probe` | 15 lines in `core.js` |

## Traps

- **Thin rays, not `host.sense`.** The seven-ray bundle and its 0.05 are right for flying and wrong
  here. `freeDistance` takes `tol` and `maxSteps`; a thin ray needs 82 orbit runs on average at e20
  and 176 at 3.4e-76 (MEASURED), over the default 64.
- **A search holds the main thread**: 0.6 s at e20, 3.5 s at 3.4e-76 (MEASURED in node; it is the
  same code). Cut into tasks, as the route's solid check already is.
- **Every `setView` is a jump** to the trail and to the route's own listener, and the depth toasts
  are silent only while the route drives. The runner marks its own views, as `drive()` does.
- **The count settles with the estimate held from the keyframe before** (READ: `dzHoldEstimate`), a
  decade deeper: at power 8 expect up to 2 more than the study's count. Not measured in the app.
- **The keyed depth is the middle ray's, not `readDepth`'s.** The app's depth is the second nearest
  of seven wide rays; beside a near wall it reads decades short, and the depth curve and the pace dip.
- **A wall passed at 1 % of the depth raises no warning today**: `legInSolid` asks "inside or not".
- **The Mandelbox was not measured at all.** Its far limit and size follow its scale (READ:
  `boxFar`); the end test must take the far limit from the host, not the number 7.5.
- **Reverse and a look key outside the route's span**: dropped (the track holds its end value there).
- The study's counts are the two rules written out again; its legs were timed at 30 frames a second.

## Open calls for him

1. **Reverse makes a new route (one undo step), not a playback direction.** Recommended: yes.
2. **The words**: "Zoom out from here", "Zoom in to here", "Reverse". Recommended as written.
3. **Least turn, or more room?** At e20: 4.7 degrees off straight back with a pass at 1 % of the
   depth (0.04 to 1 % by which line is found), or 23.6 degrees off with 2 %. Recommended: least turn
   in the first build, and both looked at in the app in Z3 before the rule is fixed.
4. **The end by rays** (the object inside a circle at 0.9 of the frame's half-height, the camera
   looking at the centre), not the app's whole-bulb distance. Recommended: rays, 0.9. (Aside: from
   the distance of the view a formula switch goes to, a power-2 bulb is up to twice the frame's height.)
5. **The place stays in the middle all the way; only the last keyframe looks at the centre.**
   Recommended: yes. He can re-aim any keyframe by hand afterwards (go to it, turn, Replace).
6. **Counts fall on the way out** (the renderer's own from the default floor: 95 to 32 at e20), not
   his place's count held to the end. Recommended: yes; they are ordinary keys he can edit.
7. **Routes that wind** (no sky line: 148 and 350 degrees at the two deepest starters). Recommended:
   make them, say how much they turn in the toast, and look at a straightening pass only after he
   has seen one (tried on the wide rule only: 308 to 140 degrees at "Certified edge", `gen.mts --pull`).
8. **A route that stops half-way is kept** (and finished by hand with K). Recommended: kept.
9. **A "Zoom in to this place" button on a place's card.** Recommended: later, after Z3 is flown.
