# Route a leg round the solid ("Go round") - CPU study, 2026-10-12

The owner: "we need to provide an option to fix a leg and avoid crossing the solid using the shortest smooth path,
otherwise a run is ruined by a deleted keyframe." A node-only study; nothing in the app was edited. Every claim is
marked **M** (measured; the script is named), **D** (derived) or **R** (read; the file is named). Scripts, logs and
pictures: `debug/scratch/route-around/` (git-ignored); run one with `node_modules/.bin/tsx` of the main checkout.

## In short
- It WORKS where the leg's two keyframes are at about one depth and the estimate is cheap: every analytic solid, and
  his own case on the real bulb (one or two new keyframes, 0.19 s). **M** `05-final.mts`
- At 1e-6 between two keyframes at one depth it works but costs 33,000 estimates: 46 s through today's host
  handle, 0.1 s through a handle the host does not have yet. **M** `05-final.mts`, `03-deep.mts`
- It FAILS on a leg that changes depth (1e-2 to 1e-6, 1e-2 to 1e-20). Three corrections tried did not rescue it.
  Not settled. **M** `05-final.mts`, `04-deep-taper.mts`, `06-ray.mts`, `07-dive-diag.mts`
- "Clearance = half the depth" cannot be the rule: at depth the keyframes' own estimate is 3 % to 26 % of their
  depth, so both ends of the leg are "blocked" before it starts. **M** `03-deep.mts`, `05-final.mts`

## How it was tested
- The app's in-between rule itself, in node: `engine/animation/zoomPath.ts` on the timeline's depth curve
  (`depthCurve`, `deep-zoom/trail.ts`), as `route()` in `deep-zoom/route.ts` builds it. **R** The leg his delete
  left, replayed here, passes 0.612 from the bulb's centre and his five keyframes 3.029: the app's own two numbers
  (`debug/scratch/route-fixes/app-delete-after.txt`). **M** `02-bulb.mts`
- The real bulb: the renderer's CPU code lifted as text from the last commit's `core.js`, as
  `debug/deep-zoom-checks/ray-probe.mts` lifts it; the estimate is `estimateAtPoint`'s own two calls. **R** `lib.mts`
- Positions are bigints throughout; a point of a leg is a key plus a double offset.

## The rule as it stands ("Go round", the leg between keyframes A and B)
1. **Sample** the leg at 33 points, even in time, each with the depth the route's own depth track gives there.
2. **Clearance** at a point = share x the route's depth there x the keys' own (estimate over depth), eased from A's
   ratio to B's. CORRECTED from "a share of the depth" (What failed 1). Under it, a point is blocked. A key standing
   EXACTLY on the bulb's axis reads 0 and is asked a hair aside (What failed 6).
3. **Lift**, for each of 12 directions round the chord: the blocked run moves sideways whole, the points either side
   stay on the straight line to their key; further by half a clearance, then 15 % a step, to 1.5 chords at most,
   until all 33 points are free.
4. **Sides.** CORRECTED from "each direction is a candidate": only the local minima of the lift round the chord are
   tightened. On the bulb all 12 directions tighten to bands 0.6 % apart in length (8.19 to 8.24), so one is
   enough: 667 estimates against 2,695. **M** `02-bulb.mts`
5. **Tighten** as an elastic band: each point toward the middle of its neighbours, WEIGHTED so that spacing follows
   depth. CORRECTED four ways, each to cut estimates: start with 9 points and add the middle of a stretch that is not
   covered; a point asks nothing while it is inside the ball its last estimate cleared; a point touching the solid
   slides (the pull into the solid is dropped); the gradient (three more estimates) only for a blocked point
   outside the solid. A point INSIDE has no gradient: it goes back out along its side's own direction.
6. **Stretches between points** are covered when the two cleared balls reach across, give or take half a clearance;
   otherwise the middle is asked, and becomes a point if it is blocked.
7. **Keep the shortest** band free everywhere (length on screen: each step over the depth there).
8. **Fit.** New keyframes are band points, each with the band's direction as its heading, as a cut route's have.
   CORRECTED: the trail's fitter alone is not enough (What failed 4): a key is added where the PLAYED leg comes
   nearest the solid, until it keeps three quarters of its clearance.
9. **Check what plays**: the new legs through the in-between rule, two points a frame, and the leg either side.
10. The leg's two keyframes keep their headings (call 4). Orientation and time: calls 2 and 3.
11. No side free, or out of budget: change nothing and say so.

## Results (share 0.5, 12 directions; **M** `05-final.log` unless named)
"Clearance" = the least estimate along the PLAYED result over its target (1.00 = on it).

| Case | Clearance | Length | Sharpest turn | New keys | Estimates |
|---|---|---|---|---|---|
| One ball | 0.96 | 1.17x straight; band 1.01x the closed form | 2.9 deg a frame | 2 | 558 |
| Two balls, a gap of 3 | 0.96 | takes the gap: as one ball | 2.9 | 2 | 558 |
| Two balls, a gap of 1.6 (under two clearances) | 0.98 | 1.19x: round one ball, aslant | 3.7 | 2 | 718 |
| Wall, its hole 4 aside | 0.87 | 1.45x, through the hole | 5.3 | 2 | 377 |
| Wall, its hole 6 aside | NOT FIXED with 12 directions; 0.79 with 24 | with 24: 2.03x | 4.9 | 4 | 201 to fail; 567 with 24 |
| Ring, leg 0.1 outside its core | 0.99 | 1.17x, round the outside; band 1.01x closed form | 3.2 | 2 | 662 |
| Ring, leg 0.1 inside its core | 0.99 | 1.17x, through the hole | 3.3 | 2 | 663 |
| **The bulb, his case** (3.2 out, half way round) | 1.00 | 1.18x the leg he was left; 0.83x his five keyframes | 3.1 | 2 | 667 = 0.19 s |
| The same, a keyframe before and one after | 0.99 | | 4.3 | 1 | 626 |
| The bulb at 1e-6, a ridge between, 42 depths apart | 0.87 to 0.89 | 1.02x straight | 0.4 to 0.7 | 5 or 6 | 32,837 = 46 s today |
| The bulb, 1e-2 to 1e-6, clipping a ridge | NOT FIXED | | | | 68,000 to 81,000 |
| The bulb, 1e-2 to 1e-20, clipping a ridge | NOT FIXED | | | | 144,000 to 200,000 |
| The bulb at 1e-20, a ridge between | NOT TESTED: no such pair found in 80 tries | | | | |

- His case (**M** `02-bulb.mts`; pictures `bulb-keep.png`, `bulb-band.png`): 17 of the leg's 31 inner points under
  clearance, 6 inside the solid. Fixed, it passes 2.1 from the centre; he flew at 3.03 to 3.2.
- Of its 667 estimates, 459 are the 33 samples and the 12 lifts, 208 the band. Checking the played legs took 185 to
  633 more shallow, 2,400 to 2,800 at 1e-6.

## Settled
**The share** (his case, **M** `02-bulb.mts`). The tightened band touches its clearance, so the share IS how near the
picture comes, against the two keyframes. At 0.5 what is looked at is up to 0.29 decades (about twice) nearer than the
depth track says. At 1e-6 the share hardly changes the length (1.01x to 1.02x); a larger one is cheaper there.

| Share | Nearest the centre | Length against his five keyframes | New keys | Estimates at 1e-6 |
|---|---|---|---|---|
| 0.25 | 1.74 | 0.77x | 1 | 61,290 |
| 0.5 | 2.09 | 0.83x | 1 | 32,837 |
| 0.75 | 2.81 | 0.92x | 3 | |
| 0.9 | 3.02 | 0.98x | 3 | |
| 1.0 | 3.08 (he flew 3.03 to 3.2) | 1.03x | 3 | 24,225 |

**Which side.** Twelve directions are enough when the way through subtends 30 degrees or more round the chord: the
wall's hole 3 or 4 aside is found with 6, 12 and 24; 5 or 6 aside, only with 24. The shortest was the first side
tightened in every case; two sides that tied on lift (the close balls) differed 2 %. **M** `01-analytic.mts`

**Positions at depth.** A point held as (the leg's DEEPER key + a double offset) is exact, error 0: the in-between
rule builds its positions that way (**R** `zoomPath.ts`). From the shallower key, or as whole doubles, a 1e-2 to 1e-6
leg is fine (2.6e-12 and 4.9e-11 of the depth); a 1e-2 to 1e-20 leg is off by 285 and 2,030 depths at its deep end,
and solved from the shallower key came back 39 times the length. Only the estimate itself needs bigints.
**M** `04-deep-taper.mts`, `05-final.mts`

**Orientation** (his case, **M** `02-bulb.mts`, `05-final.mts`). His two keyframes look in exactly opposite
directions (which way an even turn goes is then decided by the last bit of a yaw), and the app's own turn looks AWAY
from the bulb half way: the view's centre is on the bulb in 16 of 106 frames. Looking at the point between what the
two keyframes looked at keeps it there in 106 of 106, within 0.29 decades of the depth track, 2.5 degrees a frame.

**Time.** By the pace rule the fixed leg is 104 or 105 frames (the two fitters) and every later keyframe moves -20 or
-21. Kept at 125 it plays at 0.42 decades a second, not 0.5. A leg K had timed across a solid grows instead: 78 to
92 frames round the ball; K would have timed his straight leg 81 (`app-delete-after.txt`).

**Do the fitted keyframes stay clear when played?** Not by themselves. The trail's fitter alone: 0.84 of the
clearance on the bulb (1 new key), and 47 new keys at 1e-6. A key added where the played leg is nearest the solid:
1.00 with 2 on the bulb, 0.87 with 5 at 1e-6. With the leg's two keyframes keeping their headings the legs either
side move 0.005 of the depth; given the band's directions, 0.10. But a kept heading that disagrees with the side
taken makes a hook: 27 degrees a frame against 2.6. In his case the lowest lift is the side his heading points to.
**M** `05-final.mts`

## What failed, and why
1. **"Half the depth" as the clearance.** The estimate under-reads what is looked at: 0.63, 0.09, 0.08, 0.14 and
   1.34 of it at five depths of one descent; 0.03 and 0.25 at the 1e-6 keyframes. Backing straight away from the
   surface it rises to 0.62 of the depth two depths back and FALLS again (0.38 at eight). **M** `03-deep.mts`,
   `05-final.mts`. Hence step 2. A clearance growing from each key's own estimate up to a share of the depth was
   tried and did not settle. **M** `04-deep-taper.mts`
2. **A leg that changes depth.** Points even in time lie 7.5 depths from the deep key all the way down: 17 of the 33
   are within 1 % of the leg's length of it; the estimate along it runs from 0.003 to 1.64 of the depth.
   **M** `07-dive-diag.mts`. Inside the limits used everywhere else (264 band points, 12 rounds, 200,000 estimates)
   no side settles. Allowed 3,300 points, 60 rounds and a million, one side of three came free for 1e-2 to 1e-6: a
   band of 394 points, 82,675 estimates for that side, 496,081 in all; its fit and playback were NOT run.
   **M** `07-dive-diag-big.log`. Also tried, neither fixed it: one renderer ray a stretch in place of more points
   (`06-ray.mts`), and a lift that turns the leg about its deep key (`07-dive-diag-tent.log`).
3. **Cost at depth.** `estimateAtPoint` builds one bigint reference orbit a call: 0.15 to 0.3 ms at 3.2 out, 1.4 ms
   at 1e-6, 4.0 ms at 1e-20, 8.4 ms at 1e-40. From ONE reference orbit at the leg's deeper key and a double offset
   the same number costs 2.6, 7.5 and 16 microseconds: about 500 times less (20,000 in 62 ms). **M** `03-deep.mts`
   The host has that only from the camera, `estimateAt(offset)`. **R** `DeepZoomHost.ts`
4. **The trail's fitter at depth.** Its one tolerance must be under the thinnest clearance everywhere: 47 new keys,
   7 degrees a frame. **M** `05-final.mts`
5. **A gap far aside**: Which side, above.
6. **A key exactly on the bulb's axis** (his first keyframe: x = y = 0) reads 0, "inside"; 1e-30 aside it reads
   1.86. The renderer guards its camera there (POLE GUARD), not `estimateAtPoint`. **M** `pole.mts`. `legInSolid`
   never asks AT a keyframe, so it has not shown. **R** `route.ts`

## Not settled
- Legs that change depth (What failed 2). Two keyframes at 1e-20: no test pair was found. The Mandelbox was not run.
- The played leg is checked at points only: a thin arm between two of them is not caught.
- New keyframes take their depth from the route's own track (what is really looked at from the detour was measured
  on his case only) and their iteration count from the two keys' counts, eased.
- Nothing was run through `route.ts` and the store: one undo step, the Route tab's red row going out.

## Size, if built (**D**)
About 300 lines in `route.ts`: the solve 170, the fit and the check of what plays 50, writing the keys as one undo
step (as `cutRoute` does) 40, orientation and time 40. `RoutePanel.tsx` about 40 (a button on the red row, its
messages). `debug/deep-zoom-checks/route.mts` about 80. For depth, a host handle for estimates near one anchor and
the axis guard: about 20 lines in `core.js` and the host.

## His calls
1. **The share.** 0.5 is shortest and brings the bulb twice as near as his keyframes had it; 0.9 flies what he flew.
   Recommend **0.75**: nearest 2.81 against his 3.03, 8 % shorter than his five keyframes.
2. **Orientation.** Recommend **look at the point between what the two keyframes looked at**, not the even turn.
3. **Time.** Recommend **the pace rule**, later keyframes moving with it; "keep the leg's time" as the other choice.
4. **Headings.** Recommend the leg's two keyframes **keep theirs**, and the side they point to wins a near tie.
5. **A new host handle** (estimates from one reference orbit) and the axis guard: a renderer change, so his.
   Recommend **yes**: without it a fix at 1e-6 takes 46 s.
6. **First build.** Recommend it fixes legs whose two keyframes are at about one depth, and says "not fixed" for a
   leg that changes depth until that is solved.
7. **Directions.** Recommend **12**; 24 finds narrower gaps and doubles the lifts (972 estimates against 558).
8. **The fitter.** Recommend the played-clearance fit beside `pickKeyframes`: 1 more key shallow, 5 against 47 deep.
