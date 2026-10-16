# Deep zoom - smoothing a route: even pace and a steady turn, as a pass

Why: his first full render (`s7zzzooom`, 2026-10-14, 5,761 frames) "was quite successful"; the
comments were that the camera's pacing and rotation were not smooth enough (not his cuts). Reverse is
a separate stage already designed (`ZOOM-OUTS.md`, Z1).

## His decisions (2026-10-16, his words in quotes)

1. **Pace is an option**, and the default is the flyer's own pace made smooth: "even with even zoom
   it would have to be a well smoothed version of the flyer's pace". "This smoothing should be a tool
   with options run as a pass on sections or the whole recording."
2. **Keyframe aims**: "by default the smooth can miss perfect keyframes if they weren't explicitly
   set (like with the K button)". Exact at every keyframe is an option.
3. **Free look**: "yes an option to smooth the free look".
4. **Positions stay**: "keep the positions and only smooth the timing (speed) and rotation".
5. **Close keyframes**: merge or warn on keyframes under half a second apart: yes.

## What the route measured (2026-10-16; scripts in `debug/scratch/route-smooth/`, git-ignored)

The engine's own evaluation in node (`analyse.mts`, `where.mts`, `back.mts` on
`C:/Users/gighz/Downloads/s7zzzooom.json`):
- Pace: median 0.45 decades a second. FOUR legs go shallower, 0.44 to 0.68 decades in 10 to 16
  frames (frames 318, 2907, 3771, 4468): a jolt backwards at up to 2 decades a second. The camera
  moved about one depth there: the depth READING jumped (the centre ray found a farther wall after a
  close pass). 26 of 103 neighbouring legs differ in speed by over 1.5 times; legs are 1.77 s on the
  median and 0.10 s at the shortest.
- Turning passes exactly through every keyframe's aim (`zoomPathOrientation`, rate-continuous only):
  about 12 degrees a second RMS around its own half-second average, median turn 5.7 a second. At the
  end four keyframes sit in 21 frames and one 7-frame leg turns 96 degrees.
- Free look recorded by hand: 220 / 176 / 106 keys on pan / tilt / roll, fitted within 0.1 degree of
  the hand (`LOOK_FIT_TOLERANCE`). With it on, the seconds that hold a turning spike go from 38 to 79.
  A moving average moves the look by at most 2.5 degrees at 1 s, 7 at 2 s.

## The tool, as decided

**Smooth...** on the Route tab: a pass over the whole route or a section (a frame range, or the
keyframes selected on the timeline), one animation-undo step, the edges blended into what is outside.
Its options:
- **Pace**: As flown, smoothed (default) / Even zoom (decades a second) / Even on screen (today's
  Even pace). A strength in seconds (how long a change of pace may take).
- **Keyframe aims**: K keyframes exact, the others may be missed (default) / every keyframe exact.
  How far an aim may be missed, in degrees.
- **Free look**: smooth it, with its own strength in seconds.
- Positions are never moved: the views at the keyframes stay to the digit.

> **Added 2026-10-16, night (his answers after the study's four rounds):**
> - **Pace by** (his: "it would be most usefull if this is one of the options in the tool"): **the
>   route's own picture** (default; "Don't count the free look: pace by the route's own picture") /
>   the picture with the free look on top / the path alone (the picture looking where the camera
>   goes). Each reads the middle of that picture from 45 rays across it, every third frame (S0's
>   third and fourth rounds). The free look is carried along by the retime whichever is chosen.
> - **Previews** of a pass or of a render for checking pacing at about 320p ("for previews, we can
>   use a lowres like 320p for faster output"): the 2907 split clip took 1 minute at 320p and 4
>   samples, against about 5 at 540p and 16.
> - **His answers to the open calls (same night), in his words:**
>   1. Strength: "log slider at 4s its averaged over 4s, at clip's full length its an even pace" - one
>      logarithmic slider, 4 s at the start; at the length of what is selected it is one even pace.
>   2. Pauses: "smooths pauses (remember its a smooth tool where you can select which legs to
>      smooth)" - a pause shorter than the averaging is smoothed; to keep one, leave its legs out.
>   3. Where the timing lives: "need to work out what is most efficient and workable" - worked out
>      below ("S0, the clock and the K mark"): a Pace track, and a binary search in the engine.
>   4. The miss allowed at a keyframe: "optional slider".
>   5. The free look's smoothing: "optional slider".
>   6. Close keyframes: "warn, merge" - warned, and a merge offered.
>   7. The K mark: "is that the best way? then yes" - it is (below), with a pin on each row.
>   8. The stutter at the 2^-256 floor: "leave it".

## Questions the study answers before any build (S0)

1. **Which keyframes were set with K.** Today that is session memory only (`made` in
   `deep-zoom/route.ts`): a loaded scene cannot tell. A key needs to carry it in its payload; an old
   route (his `s7zzzooom`) has no mark. Proposed: no mark = may be missed.
2. **The depth reading is not the camera.** On a dive the timeline's depth may smooth the dips out
   (the four jolts) while the positions stay, since a key's depth only sets the leg's clock and the
   readout. Check the pitfall in `engine/animation/zoomPath.ts` (a scale below the deeper key costs
   digits) holds for the smoothed curve.
3. **The pace rules.** As flown smoothed: the flown decades a second low-passed, then the keyframes
   retimed to it. Even zoom: constant, eased into the neighbours at a section's edges. Measure each on
   this route: the pace's wobble, its largest step, the route's new length.
4. **The turning rule.** A smoothing curve on the rotation group that may leave the made keyframes by
   up to N degrees, pinned at K ones. Measure the turning wobble and the largest miss for N = 2, 5, 10.
5. **The look.** Low-pass, then refit to keys (`fitSamplesToKeys`), as the recorder does.
6. **Close keyframes.** Merge or warn below 0.5 s: at K (a toast), when cut from the trail (a floor
   on the leg), and inside a pass.

Deliverables of the study, for his eye: before / after graphs of pace and turning for this route, and
a short stretch rendered both ways (around frame 2907, which holds a jolt), as one split video.

## S0: what the study found (2026-10-16)

> **Correction, the same evening (his look at the first clip):** "the route is smooth but the pacing
> is wrong, both clips are experiencing a speedup at ~3s". He was right and the pace measure below
> was blind to it: it read the depth of the ray at the picture's centre, which at a wall pass reads
> the far wall while the walls beside the camera are still close. The optical flow of the rendered
> clip shows the rush in both halves. The second round below measures the picture as a whole and
> SUPERSEDES this section's pace findings, its recommended rule and its list of decisions. The
> turn, look, K-mark, close-keyframe and 2^-256 findings stand.

**For his eye.** `debug/scratch/route-smooth/out/s7zzzooom-smoothing-before-after.png` (pace and
turning, the whole route and the clip's stretch, gray as rendered, blue after the pass) and
`debug/scratch/route-smooth/out/s7zzzooom-2907-before-after.mp4` (keyframes 51 to 56, frames 2810 to
3040, left as rendered, right after the pass; 960 x 540 a side, 16 samples, his scene loaded through
the app and each frame rendered as the Render dialog does it). The scenes the pass made are beside
them (`scene-F.json`: the recommended pass; `scene-F2.json`, `scene-F10.json`: a miss of 2 and 10
degrees): File > Load Scene plays them.

**How it was measured.** All git-ignored, in `debug/scratch/route-smooth/`: `lib.mts` (every rule as
a pure function on the scene's tracks; evaluation is the engine's own), `study.mts`, `turn.mts`,
`candidates.mts`, `table.mts` (the CPU measures), `truth.mts` (the depth the app shows, read on the
GPU at every frame of a route: 50 s for his 5,761 frames), `clip.mts`, `fig.py`. A new measure:
**the pace of the picture** is the camera's speed over the depth the GPU reads at that frame (what the
route looks at, his free look off), not the depth track between keyframes.

**Findings.**
1. **His route's pace is already even on screen.** Against what the route looks at: 0.45 / 0.54 /
   0.62 decades a second (p5 / median / p95). It was timed at today's Even pace (it has a leg of 3
   frames, which K never makes; its legs run at 0.52 a second on screen, median). The "26 of 103
   legs over 1.5 times" and the "four backward legs" measured last session are the depth READOUT,
   not the picture: on screen 2 neighbouring legs differ by over 1.5 times.
2. **The four "backward jolts" are wall passes.** The reading jumps up half a decade in one frame
   when the view slips past a near wall (between frames 2910 and 2915 at 2907), and a keyframe 10 to
   16 frames later carries the new reading. The camera's speed follows the clock, so the CAMERA
   speeds up 3 to 5 times in a third of a second there, while the picture's pace stays nearly even
   (it dips to 0.3 for a quarter second). That is the trade: with one depth for a clock, either the
   camera's speed jumps (today) or the picture's pace does. The clip shows the other side of it.
3. **His free look moves the pace more than the route does.** With it on, the picture's pace is
   0.17 / 0.51 / 0.69: a look toward far things slows the picture, toward a wall speeds it. That is
   how looking around works, not a fault in the timing.
4. **The turning wobble was mostly the end.** Keyframes 101 to 102 turn 96 degrees in 7 frames (509
   degrees a second); without that leg the half-second wobble is 0.3 degrees a second, not 9 to 12.
   What is left is the turn rising and falling leg by leg: 5.6 / 14.9 degrees a second (median /
   p95), peaks of 27 to 30.
5. **The free look carries the hand's jitter.** 71 of 191 seconds hold a sharp change of turn with
   the look on, 36 without it.
6. **The last 2.4 seconds stutter, whatever the timing.** From keyframe 100 the camera is within 100
   steps of 2^-256 of its depth; at the last frame a depth is 4.4 steps, and 21 frames do not move
   at all. That is the positions' floor, not something a smoothing pass can change.

**The six questions.**
1. *Which keyframes were set with K.* K, Key Cam and a row's replace all go through `write()` in
   `deep-zoom/route.ts`; a mark is one field of `RoutePayload` written there (cut keyframes never get
   it). An old scene has none: every keyframe may be missed. The K invariant's line "a payload holds
   the camera and its heading, nothing else" (check:deep-zoom-route, "payload: ...") changes with it.
2. *The depth is a clock.* A keyframe's depth sets only how the camera's motion is spread through its
   two legs and the readout. Smoothed over 0.5 s it moves the depths of 4 keyframes by over a quarter
   decade (0.29 at most), and the path between keyframes by 0.05 of a depth. zoomPath's pitfall holds:
   no clock dips below a leg's deeper keyframe (0.000 decades on every candidate), and a point is right
   to about 1e-14 of the depth (the invariant asks 1e-9). A keyframe's depth then shows the clock, not
   the reading.
3. *The pace rules* (table below). As flown, smoothed changes his route very little, because it was
   even: 192 -> 191.5 s, the path moved 0.03 depths. Even zoom (the readout falling at one rate) costs
   the picture: 23 neighbouring legs over 1.5 times on screen and sideways stretches sliding at up to
   0.9 a second; its keyframes need depths put in order (4 move by over a quarter decade). Even on
   screen at the route's own mean: 192.2 s, leg-to-leg wobble 0.008. None of them touches the wall
   passes; the clock's smoothing does.
4. *The turning rule.* The route's turn per frame low-passed (a Gaussian in the rotation group, 1 s),
   each keyframe's aim moved onto it by N degrees at most (K and the ends pinned), three passes from
   the original aims, the engine's curve through the new aims. Measured with the pace and the clock
   of the recommended pass:

   | Miss allowed | Turn median / p95 | Peak | Change of turn, p95 | Aims moved |
   |---|---|---|---|---|
   | as rendered | 5.6 / 14.9 deg/s | 509 | 16.6 deg/s2 | 0 |
   | 2 degrees | 4.9 / 14.1 | 40 | 14.9 | all 2 or less |
   | **5 degrees** | **4.0 / 11.5** | **37** | **11.3** | median 4.4, 78 over 2 |
   | 10 degrees | 3.7 / 9.1 | 30 | 5.5 | median 4.5, 78 over 2 |

   The peak drops only with a new rule: **no leg turns faster than 30 degrees a second** (timing
   only): the 7-frame leg at the end gets 96 frames, the route grows 2.5 s. A miss alone cannot take a
   96-degree turn. One cost: an aim moved by 5 degrees looks at other things, so the clock (built
   from what the old aims looked at) and the picture's pace part a little (frames over 0.75 decades a
   second: 47 -> 108: at the three surges that were there, at two wall passes where the smoothed
   clock rises early, and at five places where an aim moved).
5. *The look.* Each track sampled a frame at a time (through the retime, so the look stays with the
   route: today's timings leave it at its old frames), low-passed, eased back to the hand's own values
   at the ends of the recording, refitted with `fitSamplesToKeys` at `LOOK_FIT_TOLERANCE`. 0.5 s moves
   it by 5.2 / 3.3 / 3.1 degrees at most (pan / tilt / roll) and takes the seconds with a sharp change
   from 71 to 24; 1 s moves it by up to 13.6 degrees (a quick glance flattened); 2 s by 30.
6. *Close keyframes.* 6 legs under half a second: the three wall passes (11, 11, 10 frames) and three
   at the end (7, 3, 11). Merging moves the path by 0.009 to 0.024 of a depth (0.155 at the end), but
   at a wall pass it costs the picture: without the keyframe after the pass the clock never rises, and
   the picture runs at under 0.3 a second for 0.8 to 1.4 s, then fast before the next pass (frames over
   0.75: 47 -> 153). So: warn, and merge only on the user's word.

**The table** (whole route; "picture" = the pace against the GPU reading, look off, the last 2.4 s
left out; "camera" = how fast the camera's own speed changes, decades a second, its lowest and highest)

| | Seconds | Picture p5 / p50 / p95, max | Frames > 0.75 / < 0.3 | Camera | Turn p95 / peak | Shown p95, sharp seconds |
|---|---|---|---|---|---|---|
| As rendered | 192.0 | 0.45 / 0.54 / 0.62, 1.50 | 47 / 25 | -3.0 / 4.1 | 14.9 / 509 | 25.8, 71 |
| As flown, smoothed 1 s | 191.5 | 0.43 / 0.54 / 0.64, 1.54 | 48 / 40 | -2.7 / 4.1 | 15.0 / 508 | 26.5, 73 |
| + the clock 0.5 s | 191.5 | 0.42 / 0.54 / 0.64, 1.37 | 64 / 41 | -2.0 / 4.1 | 15.0 / 508 | 26.5, 73 |
| Close keyframes merged | 190.5 | 0.40 / 0.54 / 0.67, 1.54 | 153 / 113 | -1.3 / 1.3 | 15.4 / 223 | 26.4, 73 |
| **The recommended pass** | 194.5 | 0.43 / 0.54 / 0.67, 2.16 | 108 / 26 | -1.0 / 1.1 | 11.5 / 37 | 23.3, 36 |

**The recommended rule (for S1)** *(superseded: see the second round)*. One pass, in this order; positions never move, keyframes keep their
order and whole frames:
1. *Pace, as flown, smoothed (strength 1 s).* Each leg's length on screen as played; its pace (length
   over seconds) as a step function of time, low-passed (Gaussian, the strength); each leg gets its
   length at the smoothed pace over its own span; run twice (a leg's played length moves a little with
   its neighbours' times). No leg turns faster than 30 degrees a second. For a loaded route "as flown"
   is its present timing; with the trail of this session it can be the trail's clock.
2. *The clock (half the strength).* The depth track low-passed in log space over 0.5 s and read at the
   keyframes, auto handles. Cuts the camera's surges at the wall passes (-1.8 -> -0.3 at 2907).
3. *The turn (1 s, a miss of 5 degrees).* As in question 4; K keyframes and a section's two ends exact.
4. *The look (0.5 s), when asked.* As in question 5, and always carried along by the retime.
5. *Close keyframes:* listed with a warning, never merged by the pass itself.
6. *The end:* a keyframe within about 100 steps of 2^-256 of its depth could be named in the same
   warning (his route's last 2.4 s); the pass cannot help it.

**What he decides** *(superseded: see the second round)* (the list he was given first):
1. The wall passes: the camera's surge (as rendered, left of the clip) or the picture's brief
   surge (the clock smoothed, right)? The clip at 2907 shows the two.
2. A miss of 5 degrees as the default (2 barely helps; 10 calms the turn twice as much, an aim
   then may move 10).
3. The new rule "no leg turns faster than 30 degrees a second", which gives his last 96-degree turn
   3.2 s instead of 0.23 s.
4. Close keyframes: warn and do not merge (a merge loses a wall pass's clock).
5. The free look's smoothing at 0.5 s by default (1 s flattens a quick glance by up to 14 degrees).
6. The pace follows what the ROUTE looks at, not what his free look shows (the look stays a layer
   on top; a route's timing does not change when he looks around).
7. The K mark: one field in a keyframe's payload, written by K, Key Cam and a row's replace; old
   routes have none (every keyframe may be missed).
8. The last 2.4 s stutter at the 2^-256 floor: a warning in the Route tab, or leave it.

## S0, second round: pace by the picture (2026-10-16, evening)

> **Superseded in part by the third round** (his look at this round's clip): pace by the MIDDLE of the
> picture, not the blend below, at 4 s; and the rays cost far less than measured here. The rays, the
> warp, the clock keys and calls 3 to 9 stand.

**For his eye.** `debug/scratch/route-smooth/out/s7zzzooom-2907-picture-paced.mp4` (the same stretch,
keyframes 51 to 56, left as rendered, right paced by the picture; 960 x 540 a side, 16 samples) and
`debug/scratch/route-smooth/out/s7zzzooom-paced-by-the-picture.png`. The pass's scene:
`scene-B2.json` beside them (File > Load Scene plays it).

**What the eye sees, measured.** Optical flow (OpenCV) between the rendered frames of the first clip:
at 3.5 s the fastest tenth of the picture (the near wall going by at the side) jumps from 0.8 to 3.2
picture heights a second, in both halves, and the picture's middle doubles. The camera's speed
followed the centre ray's depth, which jumps up half a decade as the view slips past the wall while
the wall beside the camera is still close.

**A measure that sees it.** 45 rays across the picture (`host.freeDistance` on a 9 x 5 grid, the view
shown: the route with the free look on top). A surface at distance r in direction d, the camera moving
at V and turning at W, crosses the picture at |-(V - (V.d) d) / r - W x d|, over `DZ_FOV_SCALE` for
picture heights. Against the optical flow of the rendered clip: correlation 0.87 to 0.93, within 10 %
in scale, the rushes in the same frames. Cheap: 232 frames in 3 s, his whole route in about 75 s
(`grid.mts`, `motion.mts`, `validate.mts`). Because a retiming only plays the same film at another rate,
any timing can then be scored on the CPU in seconds (`evalwarp.mts`, `evalpct.mts`, `evalsm.mts`).

**His question: a moving average of the camera's own speed?** Measured, it does not take the rushes
out. Frames where the picture runs over 1.5 times its own 3 s average: 347 as rendered; 335 / 351 /
389 / 451 with the camera's speed averaged (in log, it falls 78 decades) over 0.5 / 1 / 2 / 4 s. The
rushes happen at a steady camera speed, when a wall comes close: to take them out the camera has to
ease off near a wall, and only something that knows where the walls are can tell it to.

**The rule: pace by the picture.** The whole film (the route and the free look on top) is played
through one time warp, so that the picture's speed follows itself averaged:
1. The turn (1 s, a miss of 5 degrees) and the look (0.5 s) are smoothed first, on his timing (as in
   the first round).
2. Every frame: the 45 rays; the picture's speed is the blend (square root of the product) of the
   faster quarter and the fastest tenth of their speeds, smoothed over 0.05 s (the rays jitter about
   10 % a frame; 0.15 s blunted the wall passes and gave the end's 96-degree turn 35 frames, not 70).
3. The target: that speed in log, a 1 s running median (no single rush sets it), then averaged over
   2 s (the strength). Paced by the faster quarter alone the fastest tenth still rushed (129 frames);
   by the fastest tenth alone the middle did (141); the blend leaves 0 and 14.
4. Each old frame lasts (its speed / the target) of a new frame. Keyframes land on whole frames;
   inside a leg the warp is carried by the depth track: keys WITHOUT a camera every 3 frames, the old
   depth there times the warp's rate (`route.ts` reads only keys with a camera as keyframes; the
   path's clock reads all of them). 1,945 of them on his route. The iteration keys go with their
   keyframes; the look is sampled a frame at a time through the warp and fitted again.
5. Positions never move. The end's 96-degree turn gets 71 frames instead of 7 without a rule of its
   own: the picture's speed includes the turn.

**Measured** (to keyframe 100: the last 2.4 s stand at the 2^-256 floor)

| | As rendered | Paced by the picture |
|---|---|---|
| Route length | 190 s (192 in all) | 199 s (205 in all) |
| Picture speed p5 / p50 / p95, fastest (rays, faster quarter) | 0.24 / 0.67 / 1.62, 3.3 | 0.34 / 0.67 / 1.33, 1.7 |
| Frames over 1.5x its own 3 s average | 347 | 0 |
| The clip, rendered frames: fastest tenth at the wall pass (3 to 4.2 s) | 3.2 (0.9 before it) | 1.5 (1.0 before it) |
| The clip: frames whose fastest tenth is over 2.0 | 26 | 3 |
| The clip: the picture's middle, lowest / highest | 0.22 / 0.75 | 0.27 / 0.54 |
| Turn of the route p95, peak | 13.8, 29.6 deg/s | 10.4, 17.9 deg/s |
| Turn shown (with the look) p95, peak | 24.8, 37.8 deg/s | 19.1, 41.4 deg/s |

**What is left.**
- A flash of three frames at the clip's second wall pass (6.8 s, 3.1 picture heights a second): a thin
  edge passing closer than the 45 rays can see. A denser grid would catch more of them.
- LULLS are filled: where the picture nearly stops for under a second (old frames 1040 to 1056: 0.35
  against about 1.0 around it) the pass plays it up to 2.85 times faster, and a free look turning
  there turns that much faster (the sharpest change of the look's turn: 37 -> 245 degrees a second,
  a second). A longer median keeps longer pauses.
- The clock is no longer the depth: at a keyframe the track shows the depth the picture moves at. A
  track of its own would keep the readout.
- The orientation between keyframes still advances with the keyframes' times, not with the warp.

**What he decides** (this replaces the first list; "1 yes, 3 no"):
1. Pace by the picture (rays across the picture, as above) as the pass's default, strength 2 s.
2. Lulls: fill them (as now) or keep pauses (a running median of 2 or 3 s instead of 1).
3. The clock: keys without a camera on the Depth track (works with today's engine; 1,945 on his route)
   or a clock track of its own (the Depth track keeps the readings; `route.ts` and the path read it).
4. The pace includes the free look (the warp plays the route and the look together), so a look
   recorded after a pass means running the pass again.
5. A miss of 5 degrees at a keyframe (unchanged).
6. The free look smoothed over 0.5 s (unchanged).
7. Close keyframes: warn, do not merge (unchanged).
8. The K mark in the payload (unchanged).
9. The stutter at the 2^-256 floor: a warning on the Route tab, or leave it (unchanged).
The first list's call 1 (the wall passes' trade) and call 3 (a floor of 30 degrees a second on a
leg's turn) are gone: the picture's pace eases the camera at a wall and gives the turn its time.

**S1 needs the renderer** for this: the rays along the route (about 75 s for his 192 s on this GPU),
so the pass runs in the app with a progress line, not as a pure function alone. The warp itself is
pure (`warp.mts`).

## S0, third round: pace by the middle of the picture, and what it costs (2026-10-16, night)

**His look at the second clip:** "it still slows down around 3s and then speeds up until around 4.5s",
and "this raycasting method is problematic as it takes very long to calculate especially since deep
dives are minutes long - is there a function that would work better?"

**Why it dipped.** The second round paced by a blend of the faster quarter and the fastest tenth of the
picture. At the wall pass (old frames 2912 to 2918) the fastest tenth (the near wall) jumps 4 times
while the middle of the picture jumps 1.5 times: the camera braked for the wall and the middle fell
from 0.46 to 0.33 picture heights a second, then climbed back to 0.58 by about 4.8 s as the blend let
go. The 2 s target also followed his flown pace rising about 30 % across the stretch. His two looks
agree: what he follows is the MIDDLE of the picture (half of it moves faster, half slower).

**The trade, measured** (from the rays, on the CPU; frames where each part strays over 25 % from its own
3 s average, over the whole route, and the clip's stretch):

| Paced by | Middle off | Middle in the clip | Near wall in the clip, fastest |
|---|---|---|---|
| nothing (as rendered) | 1,746 | 0.36 .. 0.86 | 3.7 |
| the blend, 2 s (the second clip) | 1,062 | 0.29 .. 0.64 | 1.5 |
| **the middle, 4 s** | **8** | **0.38 .. 0.48** | **2.0** |
| the middle, even (one pace) | 6 | 0.39 .. 0.47 | 1.9 |
| the mean, 4 s | 568 | 0.33 .. 0.53 | 1.6 |

One timing cannot hold both the middle and the near wall still: paced by the middle, the near wall at
a pass still crosses fast for about a fifth of a second (2 to 2.5 picture heights a second, against
3.6 as rendered).

**Built and rendered** (`scene-M4.json`: the middle, 4 s, read every third frame; the turn 1 s / 5
degrees and the look 0.5 s as before). As the engine plays it (its own rays): the middle strays in 122
frames (1,820 as rendered, 1,122 the second round); 205 s to keyframe 100 (215.5 s in all). MEASURED on
the rendered clip (`debug/scratch/route-smooth/out/s7zzzooom-2907-paced-by-the-middle.mp4`, optical
flow): the middle holds 0.35 to 0.47 through the whole stretch (0.29 to 0.75 as rendered); the near wall
flashes to 2.2 and 2.55 at the two passes (3.6 as rendered); frames whose fastest tenth is over 2.0:
26 -> 6. Graph: `debug/scratch/route-smooth/out/s7zzzooom-paced-by-the-middle.png`.

**What it costs, measured** (`cost.mts`, 120 frames on this GPU):
- The rays are a CPU march of the formula's orbit (`freeDistance`): they need NO frame drawn. Asked with
  and without a live frame stepped first, 5,400 of 5,400 answers were the same. The live frame was 6 ms
  of the 11 ms a frame the second round took.
- Putting the camera on a frame (`scrubRouteTo`): 0.4 ms. 45 rays: 3.6 ms. 15 rays: 1.7 ms.
- Read every third frame (in between, the picture's speed PER UNIT of the camera's speed is
  interpolated in log, times the camera's own speed, which the path gives exactly): about 1.6 ms a
  frame of route. His 192 s route: about 9 s. A 10-minute dive: about 30 s, beside hours of render.
- Fewer rays do not do: the middle strays in 20 frames with 45 rays every third frame, 215 with 15,
  and 620 with 9 (no better than no pacing at all). Every sixth frame with 45 rays: 39.
- **No function of the camera alone sees it.** His moving average of the camera's speed was measured in
  the second round (no fewer rushes than none: 335 to 451 against 347). The rushes come from where the
  walls are; the centre ray's depth is what caused them; the estimate at the camera is the nearest
  surface in any direction (the near wall, behind included), not the middle of the picture. Something
  has to look across the picture, and 45 rays every third frame is the cheapest found that does.

**What he decides** (calls 1 and 2 of the second round's list replaced; 3 to 9 stand):
1. Pace by the MIDDLE of the picture (45 rays every third frame); the near wall may still cross fast
   for a fifth of a second at a close pass.
2. Strength: as flown, averaged over 4 s (his slow stretches stay slow, as at 105 to 120 s), or even
   (one pace for the whole route; 217 s).
2b. Lulls under a second are still filled (the 1 s running median): keep, or protect pauses.

## S0, fourth round: should the free look set the pace? What research says (2026-10-16, night)

**His worry:** "i still feel like pacing by the picture is wrong, what if we're looking somewhere else
and strafing then the metric breaks?" And: "would it help to search for any research on this problem?"

**His worry, measured.** Paced by the picture WITH his free look (the third round), the look alone
changes the camera's speed at the same point of the route by 0.27 to 4.7 times (over 1.5 times in
1,062 frames, in runs up to 4.1 s). The free look, recorded on top of the route, drives the route's
timing. That is the coupling he objects to.

**What research says** (searched; the papers' own words where read):
- *Navigation at many scales* sets flying speed from the distance to the scene. Ware & Fleet (1997,
  "Context Sensitive Flying Interface") sampled the depth buffer in the viewing direction - view-bound,
  as the first rounds here. McCrae, Mordatch, Glueck & Khan (2009, "Multiscale 3D Navigation") render a
  cubemap all round the camera, independent of the view, and found "simply using the minimum distance
  from the cubemap" gave consistent navigation, while the mean and robust averages (Tukey's biweight,
  mixtures) "produce less predictable navigation behaviour". Their aim is safe, controllable flight.
- *Perception of self-motion*: how fast moving through a scene looks depends on the speed over the
  distance to the surface (global optical flow rate) and on how many texture edges stream by (edge
  rate; Larish & Flach 1990, edge rate explaining more). In a fractal, edges are at every scale, so
  both come down to what is in VIEW near the camera: looking at a close wall makes the same flight
  look faster. No measure of the place alone can see that.
- *Camera paths for film* (drone cinematography: Gebhardt et al. 2016, "Optimizing for Aesthetically
  Pleasing Quadrotor Camera Motion" 2019; Joubert et al. 2015): keep the path, retime it (progress
  curves), minimise jerk - what this pass does. There the target is a smooth camera SPEED, which an
  ordinary scene allows; a deep zoom, 78 decades of scale, is where it does not.
- *Zooming and panning* (van Wijk & Nuij 2003): perceived velocity measured through the picture's
  optic flow - view-bound.

**View-independent measures, tried** (scored by what the eye sees: frames where the middle of the
picture strays over 25 % from its own 3 s average, his look on / off; as rendered: 1,746 / 1,237):
- All round the camera (48 rays fixed in the world): McCrae's nearest distance 2,860 / 2,627 (the near
  wall held still, the middle swings to 0.10); the median, the log-mean, the nearest quarter: 2,200 to
  3,800, routes of 223 to 1,600 s (open space up the tunnel behind dominates).
- The picture looking where the camera GOES (45 rays about the direction of travel; only the path
  enters): 1,290 / 462, the clip's middle 0.34 .. 0.56. The best of the view-independent ones; a wider
  view is worse (1,945 / 1,514).
- The ROUTE'S OWN picture (the route's aim, the free look not counted): 1,159 / 4.

**The trade, rendered where his look matters most** (keyframes 89 to 95, frames 5053 to 5389:
`debug/scratch/route-smooth/out/s7zzzooom-look-stretch.mp4`, both halves shown with his look on).
Paced by the picture with the look: 18.9 s, the middle steady (median 0.52). Paced by the route's own
picture: 11.4 s, and where his look turns to close walls the picture runs about twice as fast (median
0.89, up to 2.0; the near wall up to 3.3). Not counting the look keeps the route's timing his; it
shows the look's own rush.

**What he decides** (replaces call 1 of the third round and call 4 of the second):
1. Which picture sets the pace: (a) the route's own (recommended: re-recording a look never retimes
   the route, a strafe the route makes is in it and measured; a look toward close walls rushes),
   (b) the picture with his look (steadiest on screen; the look drives the route's timing, 0.27 to
   4.7 times), or (c) the path alone (looking where the camera goes; independent of every aim, less
   steady: 462 frames off for the route's own view against 4).
   **ANSWERED 2026-10-16: "Don't count the free look: pace by the route's own picture."** The
   pace is read from the route's own view (its keyframes' aims, the free look off); the free look is
   carried along by the retime but never sets it. This also answers the second round's call 4 (the
   pace does not include the free look: a look recorded after a pass does not mean running it again).
   His scene for it: `scene-R4.json` (the middle of the route's own picture, 4 s, read every third
   frame). Checked at 2907 (`debug/scratch/route-smooth/out/s7zzzooom-2907-route-paced-320p.mp4`, 320p,
   shown with his free look on, optical flow of the rendered frames): the middle of the picture holds
   0.36 to 0.43 through 3 to 5 s (0.29 to 0.71 as rendered), 0.27 to 0.49 over the whole stretch; the
   near wall still flashes at the pass (up to 2.9, frames over 2.0: 22 -> 6). He then asked for the
   choice to be an option of the tool (see "The tool, as decided").

**Still open** after his answer: the third round's 2 (as flown over 4 s, or even) and 2b (lulls), and
the second round's 3 (where the clock lives) and 5 to 9 (a miss of 5 degrees, the free look at 0.5 s,
close keyframes warned, the K mark, the 2^-256 stutter).

## S0, the clock and the K mark (2026-10-16, night; his calls 3 and 7)

**Where the retime's timing lives.** A retime that paces by the picture changes how fast the camera
moves INSIDE a leg, so the timing needs more than the keyframes' times. Measured
(`debug/scratch/route-smooth/clockcost.mts`, `clockcost2.mts`):
- *Keys without a camera on the Depth track* (what the study's scenes do: 1,945 to 2,033 of them):
  works with today's engine, but the Depth track then holds the clock, not the depth (the readout and
  the Route tab show it); a keyframe set with K writes its real depth among them and the clock jumps
  there (the camera lurches); the timeline's Depth track is buried in keys.
- *Inside each keyframe's payload* (a short curve per leg): invisible and not editable, the payload
  grows, and it must be a multiplier, not a share of the leg (a share near the deeper keyframe loses
  as many digits as the leg has decades).
- **A Pace track** (recommended): a log track, x1 where the depths are followed as they are, below 1
  slower, above faster; the path's clock is the Depth track TIMES the Pace track. The Depth track keeps
  the real readings, so the readout stays true and K works untouched; the pace is visible on the
  timeline and can be shaped by hand. On his route the pass's pace runs 0.55 to 1.50 (p5 to p95).
  Fitted with the engine's own fitter: 752 keys hold the camera's speed within 2.3 % (about 4 a
  second), 353 within 6.1 %. What touches it: Even pace, As flown and a typed leg (route.ts
  `moveKeyframes`) warp it with the keyframes or clear it (a new timing replaces the pass's); Reverse
  mirrors it; Clear route and a route cut from the trail remove it; a keyframe moved on the timeline
  moves the keys of its two legs with it, as its iteration key is moved today.
- **What it costs.** The engine finds a track's key by a linear scan (`evaluateCurveInternal` in
  engine/AnimationEngine.ts): with 2,033 keys the path builds and places every frame in 1.6 s (20 ms
  with 105). A binary search for the key (about ten lines, every app's long tracks gain): 77 ms; the
  depths and a fitted Pace track together: 110 ms.

**The K mark.** A field of the keyframe's payload (`RoutePayload`), written by K, Key Cam and a
row's replace (all in `write()`, `deep-zoom/route.ts`), is the right home: it is route data and stays in
deep-zoom; the payload already survives undo, save and load, and Reverse copies its other fields. The
other ways: a flag on the engine's Keyframe type (every app's timeline would show it, but an engine
type change for one app's idea), a list of key ids kept beside the route (breaks: a replaced view is a
new key, a new id), or guessing from what a keyframe holds (cannot tell). One addition: **a pin on each
Route tab row**, so a cut keyframe can be made exact and a K one let go. The invariant "a payload holds
the camera and its heading, nothing else" (check:deep-zoom-route, "payload: ...") changes with it.

**For his yes:** (3) the Pace track and the binary search in the engine's key lookup (an engine-core
change); (7) the pin on the rows.
**ANSWERED 2026-10-16: "Yes to both: the Pace track with the binary search, and the pin per row."**

## S0, a section's edges (2026-10-16, night)

His question: "the one thing im not sure we checked is how well it would work relative to areas around
the smoothed area". Measured on the CPU from the route's own picture (`debug/scratch/route-smooth/
edges.mts`): a pass over a section only, and how the picture's speed crosses its two edges (the change
from 3 to 9 frames before an edge to 3 to 9 frames after it):

| Section, rule | Across the edge in / out | Frames off inside |
|---|---|---|
| keyframes 51 to 57 (10.5 s), as rendered | x1.49 / x0.87 | 75 |
| the same, NAIVE (target from inside only), 2 s / 4 s | x1.45 / **x0.50**; x1.51 / **x0.43** | 0 / 0 |
| the same, BLENDED (target from the whole route, eased over the strength inside each edge), 2 s / 4 s | x1.43 / x0.87; x1.44 / x0.87 | 0 / 0 |
| keyframes 41 to 61 (38 s), as rendered | x0.93 / x0.40 | 261 |
| the same, naive 2 s / blended 2 s | x0.80 / x0.37; x0.93 / x0.41 | 1 / 1 |

**The rule for S1:** the target is worked out from the WHOLE route's picture speed (the legs around a
section included), and the pass's change is eased from nothing at each edge of the section to all of
it over the strength (smoothstep, in log), but over no more than a quarter of the section; nothing
outside the section is retimed; the section's end keyframes keep their aims (pinned) and the turn's
low-pass reads the frames around them. Then a section crosses its edges as the route did before it.
What a pass cannot do: an edge that sits on a rough spot of the unsmoothed route stays as rough (the
41-to-61 section ends on a drop to x0.40 that was there before). So the dialog (S2) shows the pace
graph with the selection, to see where the edges land.

**Open, his call:** a section that grows (10.5 s -> 11.4 s at 2 s) moves everything after it later.
The free look moves with the route (decided); the iteration keys too. Keys on OTHER tracks (a light, a
colour) stay at their frames today (`moveKeyframes`: "Nothing else on the timeline moves"), so they
would drift against the route by the change. Move them with the route after a section (recommended),
or leave them.
**ANSWERED 2026-10-16: "Move other tracks' keys later with the route after a section."** Every key
on every track after a section moves by the section's change of length (inside it, the free look and
the iteration keys follow the warp; other tracks' keys inside a section are warped the same way).

## Stages (after the study and his look)

| # | Stage | What changes |
|---|---|---|
| S0 | Study | DONE 2026-10-16: four rounds, every call answered (above) |
| S1 | The pass, with no UI | (1) A binary search in the engine's key lookup (`evaluateCurveInternal`, engine/AnimationEngine.ts), the same values to the bit. (2) The Pace track in `deep-zoom/route.ts`: `camera.pace`, a log track, absent = x1; the path's clock is depth x pace; moved, mirrored, cleared and removed with the route (see "S0, the clock and the K mark"). (3) The K mark: a `RoutePayload` field written by `write()`, a pin / unpin function. (4) Pure functions (a new file beside route.ts): the picture's speed from a 45-ray grid, the warp (strength up to the selection's length = even), the keyframes on whole frames and the pace keys fitted at 0.01 decades, the turn (a miss allowed, pinned keys exact), the free look (carried; smoothed when asked), close keyframes listed and merged. (5) The reader: walks the route's OWN view every third frame with the host, `freeDistance` on the grid, no frame drawn, the camera put back (as the keyframes' pictures are taken). (6) A pass over the whole route or a range of legs as one animation-undo step; a range's edges eased as in "S0, a section's edges". Checks in `check:deep-zoom-route`. Reference: `debug/scratch/route-smooth/` (`warp.mts`, `lib.mts`, `motion.mts`, `grid.mts`, `evalbuilt.mts`) and `scene-R4.json` |
| S2 | In the app | The Smooth... dialog on the Route tab: Pace by (the route's own picture / with the free look / the path alone), the strength (a log slider, 4 s to the selection's length), the miss and the free look as optional sliders, legs or a range, a progress line while the rays are read, one undo step; close keyframes warned with a merge offered; the pin on each row; previews at about 320p |

## S2: the dialog, built (2026-10-17)

**Where.** Route tab > **Smooth...** (`deep-zoom/components/SmoothDialog.tsx`; its logic, which node reaches, in
`deep-zoom/smoothDialog.ts`; the pass is S1's `smoothRoute`). Each row of the Route tab has a pin: the K mark,
shown while on. The render dialog's **Draft** is 320p (a short edge of 320 px) and 1 sample.

**Decisions taken inside the brief** (say if any is wrong):
1. The graph's AFTER is the route read again as the engine plays it, not the pass's own reckoning (S1 measured
   those apart: 82 frames off against 3). So a run is: the route read before (kept from the dialog's opening), the
   pass, the route read after. Readings are kept by what the route is, so an undo or a redo shows its graph at once.
2. The graph of a section is zoomed to it with half its length (5 s at least) each side, keyframes ticked, and
   the line before the pass drawn on the timing after it through the keyframes: the two lines meet at every
   keyframe, so a section's edges are one place in both. The score under it counts the whole route and, for a
   section, its inside too.
3. "Selected legs" = from the first keyframe selected to the last (rows of the Route tab, else the route's keys on
   the timeline); a frame range = the legs that hold it (a pass works on whole legs).
4. The miss slider runs 1 to 15 degrees (5 at the start); the free look's 0.1 to 2 s (0.5), on when a look is
   recorded. Draft keeps 1 sample (the 2907 clip of the study was 320p at 4).
5. A keyframe's picture follows its view: the keyframes whose aim a pass moved are pictured again (103 of 105 on
   his route, a task at a time, beside the reading after the pass); an undo or a redo gets back the picture of the
   view it returns to, with nothing drawn.
6. The dialog lives in the Route tab: showing another dock tab closes it, and that is Cancel.

**Measured on his route** (s7zzzooom, in the app on this GPU; frames off their own 3 s average by over 25 %, read
every third frame over the whole route, the last 2.4 s included - S1's 82 was read every frame up to keyframe 100):

| | Time | Route | Frames off |
|---|---|---|---|
| read on opening | 3.9 s | 192.0 s | 1,230 |
| whole route, 4 s, miss 5, look 0.5 | 14.2 s (pass 5.4, read after 8.6) | 203.3 s | 248 |
| keyframes 51 to 57, the same | 7.2 s | section 10.5 -> 12.5 s | inside 118 -> 18; whole 1,230 -> 1,126 |

Screenshots for his eye: `debug/scratch/s2/out/` in the S2 worktree (git-ignored): `04-whole-done.png`,
`09-range-done.png`, `13b-dialog-close.png`, `14-pin-on.png`, `15-render-draft.png`.

**Open.** The reader puts the camera on each frame with the count keyed there but every other formula value as
the playhead has it: a route that keys power or a box value is read with one value throughout. The reading after
a pass shares the page with the pictures being retaken (8.6 s against 3.9 s on opening).
