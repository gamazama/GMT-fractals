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

## Stages (after the study and his look)

| # | Stage | What changes |
|---|---|---|
| S0 | Study | CPU only, on his route; graphs and a split clip |
| S1 | The pass, with no UI | Pure functions beside `zoomPath` / the route: retime to a pace, smooth the turn with pinned keys, smooth the look; the K mark in the payload; checks in `check:deep-zoom-route` |
| S2 | In the app | The Smooth... dialog on the Route tab, sections, one undo step, the close-keyframe warning |
