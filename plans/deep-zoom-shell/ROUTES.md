# Deep zoom - routes: the trail, keyframes and the timeline

Written 2026-10-10 with the owner. This page replaces "Stage 6a" and "Stage 6b" of `BUILD-PLAN.md`,
section 8 of `BLUEPRINT.md` and sessions 1 to 3 of `NEXT.md`; their old text is in `git log -p`
(`NEXT.md` was never committed in its first form). It also supersedes the "Key Cam and camera tracks"
row of `GMT-SYSTEMS.md` (one float `camera.u` and a side table) and module package M4. His decisions
are DECISIONS K11 to K16. The sizes in the stage table were guesses made before anything was
built; what each stage really cost is in its "As built" note.

What it rests on: three read-only surveys of the engine's timeline, the renderer's path code and the
shell (2026-10-10), and the two engine files read directly (`engine/animation/logTrackRegistry.ts`,
`engine/animation/cameraPairRegistry.ts`). Where a line below is worked out and not run, it says so.

## Where it stands (2026-10-11), and how the next session works

Built overnight and committed on `deep-zoom-tool`, local, not pushed. The owner flew it in the
morning: "this is working great!", and "I'm happy with all your other choices" for everything the
"As built" notes list as decided without him.

| Stage | State | Commits |
|---|---|---|
| R0 the in-between study | done, rule approved | in this file |
| R1 roll, places slimmed | done | `9da85c76` |
| R2a engine: payload keys, zoom path, pair fix, fps | done | `80a5916e`, `0672e352` |
| R3 keyframes as you dive | done | `9addef82` |
| R4 the trail | done | `c388d092` |
| R6a render PNG frames to a folder | done | `736103ad`, `c8ce3ef1`, `8de5616f` |
| R2b exponential-track curve tools, undoable length | done | `15b419bb` |
| R5 free look while a route plays | done | `3abf4af2` |
| R6b routes to MP4 / WebM, a Draft preset | done; the mediabunny upgrade waits for him | `9d05d00b` |
| R6c existing frames: overwrite, continue or cancel, for every image-sequence render | done for the deep zoomer; GMT's is read and measured, not built: his calls below | `e99e82ef` |
| R7 cleanup: the previous-generation marches retired (the page's program too), dead handles, help | R7 cleanup: the previous-generation marches retired (the page's program too), the retest, the small things | done | `e41890c4`, `f9f01e1a`, `63411aa8`, `a6d7a2e5` |

**Every stage of this page is built** (2026-10-11, the afternoon session: R5, R6b, R6c, R7; local
commits `3abf4af2` to `a6d7a2e5`, never pushed). After this page comes `NEXT.md` session 3
(zoom-outs).

**His answers, 2026-10-11, the evening** (his words in quotes; each was put to him as a numbered
call):
1. A failed ray shader is the boot-failure card; the bulb's Iterations slider runs to 400; the
   seven host path members are gone; the ADR and the rule edits are filed: "1-4 yes, go". Done:
   `docs/adr/0137-the-deep-zoomers-mandelbulb-has-one-program.md`, update blocks on ADR-0134,
   0135 and 0136, `.claude/rules/sibling-apps.md` (`check:rule-guards` is clean again).
2. The first visit's 21 to 26 seconds: "yes we can have a 'loading' notice that gets bigger if
   they navigate to deep view. we should also investigate if we can reduce the loading time."
3. Free look that ends turned, and the snap back: "will have to fly and see what you mean".
4. The odd single render: "if you see any of these odd renders, show me them, i havent seen one
   yet." Shown to him: `debug/scratch/r7c/odd-render-grain-cold.png`, `-grain-warm.png`,
   `-power2.png` (the usual render, the odd one, their difference). On grainy ground the odd one
   is the same picture with another throw of its grain.
5. Why power 8 needs more iterations than the margin rule gives: "i dont know why". It is a
   question of `NEXT.md` session 7 now.
6. GMT's image sequences: "Ask Overwrite / Continue / Cancel, agreed with the other points" (the
   question's words say what Continue cannot know; the locked focus stays out of the version; the
   question says Continue is not exact).
7. MP4 written as it goes, and a keyframe a second, for GMT and fluid-toy: "we would have to
   check, at some stage mediabunny was exporting mp4's that didnt load in strict players like
   windows mediaplayer/aftereffects. thats why alot of the process was handrolled back then." So
   nothing changes there before a file of each kind has been opened in those players.
8. The mediabunny upgrade, with an install in `stable/`: "this is under the same check as above-
   yeah you have my approval".
9. The codec fix (`claude/clever-vaughan-e29a9f`): "we can merge to main, no push yet."

**Still open**: the Locations tab's foot under the Animate button; Draft has no way back; an
Overwrite stopped halfway leaves a mixed folder; no ease back to the route after a free look
(his to fly first).

**His rules for the sessions that build the rest** (2026-10-11, his words: "yes"):
- A brief caps deliberate breaks by number: "at most 3".
- A stage runs its own smoke stage file (`npm run smoke:deep-zoom -- --stage N`), plus parity and
  the direct proof when `deep-zoom/renderer/core.js` changes; the full suite once before the commit.
- A fault in the renderer goes to him after the first measurement: "It is your kernel, and you may
  know at once what settles in its first minute."
- A fresh session for the remaining stages, with this file as the brief. He starts it.

**Two dev servers.** He flies `http://localhost:3420/deep-zoom.html` (preview `dz-fly`): the
detached checkout `.claude/worktrees/deep-zoom-fly`, which a `post-commit` hook
(`stable/.git/hooks/post-commit`) moves to each new commit of this branch, so a builder's
half-edited files never reach him. Builders and every smoke use the working tree's server on port
3410 (`dz-worktree-dev`); a smoke pointed at 3420 would test the last commit, not the edit. Say
"reload" only after the commit. The fly tree's vite config is git-ignored
(`debug/scratch/vite.fly.config.mjs` inside it): recreate it if the tree is recreated. Both
servers belong to the session that started them: a new session starts `dz-fly` and
`dz-worktree-dev` (the preview names in `stable/.claude/launch.json`) first.

**How the built stages were run, and it worked**: one builder at a time, the decisions written
into its brief so it reads source and not plan pages; the orchestrator checks typecheck, the node
checks and the diff, makes one commit a stage, rebuilds the context map last, then says "reload
3420". A small fix he asks for while a builder runs on other files is quicker done by hand.

## Words

- **Trail**: what the app remembers of how you flew here. On by default; its switch is the record button.
- **Route**: a camera move on the timeline - keyframes, and the timing between them.
- **Keyframe**: one exact view on the route (position and orientation) at a time.
- **Leg**: the stretch between two keyframes.
- **Free look**: turning the view over a playing route (his word; the first notes called it "the
  look pass").

Two words are taken in the code and are not used for the new thing: a "flight" is one hand-flown
stretch and one undo step (`flightBegan` in `deep-zoom/locations.ts`), and a "dive" is the
Dive-to-depth action (`deep-zoom/diveControl.ts`).

## Decided by the owner, 2026-10-10

- "lets loose the current inherant limitations, and instead think of what would be ideal."
- Two ways to make a route, both wanted: "record the dive live and retime", and "set keyframes as you
  dive so you can look around and choose where the next keyframe will be".
- "the trail is the record button, and it can be disabled ... the trail is a great way to record an
  exploration, especially since you never really know where you will end up."
- "route first - the camera second - but that part is optional. all it means is we can playback the
  route and record/view a rotation offset ontop of it."
- "a place shouldnt store light and colour - this will make it hard to improve the lighting and color
  system ... camera and light will be keyframed in their own tracks." And: "saved places can also keep
  camera and formula only." The light follows the camera by default, so a route needs no light keys to
  stay consistent.
- "the lack of q/e roll seems like a major problem that would prevent users from being able to keyframe
  rotation." Roll comes before routes.
- "gmt does support most of this, including exponential tracks, if not fully then at least conceptually
  waiting for an opportunity like this to be intergrated into the engine." Build on the engine's own
  pieces and widen them generically; no private path player.
- A jump to a saved place starts a new trail: "correct. perhaps a warning if the trail is more than a
  few decades deep."
- On corners at keyframes: "you right about those corners - and I believe fluid toy may have some
  insight on how to create easing at log scales instead of straight lines."

## What he gets

1. **The trail.** The record switch is lit from the start. The app keeps how you got here; when you
   find the place, "Route to here" cuts a clean route from it. A jump that would drop a deep trail
   asks first.
2. **Keyframes as you dive.** One key drops a keyframe; between keyframes you look around freely and
   nothing is captured. A Route tab shows them as thumbnails with depth and time.
3. **One route either way.** A route cut from the trail has many keyframes and follows what was
   flown; a hand-set one has few. Everything after that is shared.
4. **Timing on the timeline.** Each keyframe is a key: slide it to arrive sooner or later. The depth
   curve between keys is the pace, read in decades per second.
5. **Free look while a route plays.** Turn the camera on top of the route: viewed, or recorded as
   its own tracks.
6. **Light and colour** are ordinary tracks. A place and a keyframe carry neither.
7. **A warning before the render**: a leg that enters the solid shows red.
8. **PNG frames to a folder**, picked up again where an earlier run stopped; MP4 / WebM from the
   same dialog. A draft is that dialog at a small size and one sample.

## The shape (recommended; the decision record is written in R2)

- **`camera.depth`** is an exponential track (`registerLogTrack`): one key per keyframe, its value
  the depth there. The engine already eases these in log space with Bezier handles and plots them in
  log in the graph editor, so the curve is the pace and its slope is decades per second.
- **Each key carries the exact view** (the same object `api.dz.getView()` returns: three 256-bit
  positions as strings, yaw, pitch, roll) and, since R0, its heading: the direction of travel when
  it was set. One row, one diamond per keyframe. A keyframe and a saved place hold the same view.
- **The look pass** is three plain tracks, composed on the route's rotation.
- **Light, colour and formula params** are the DDFS tracks they already are.
- **A route has one formula, the scene's.** A keyframe holds the camera only. A deep place exists only
  under the formula it was found with, so a formula param changed mid-route moves the surface away
  from the keyframes; nothing stops that and nothing follows it. This also answers `MANDELBOX.md`'s
  open "the formula in a recorded flight": the scene carries it.
- **After every scrub** one evaluator reads the keys round the frame and the depth at that frame,
  works out the exact view by the in-between rule (R0) and hands it to the renderer once, and only
  when the view changed.

Why not GMT's six camera tracks (`camera.unified.{x,y,z}`, `camera.rotation.{x,y,z}`): at depth a
position has no meaningful plotted value, and exact positions as extra hidden word-tracks have to move
in lockstep with the visible keys. One key holding the view cannot come apart.

What this buys over the old plan's "one number along a path held beside the timeline": the keyframes
are visible and slide; the route and its timing are in one place and on one undo stack (the
animation's); it is saved with the scene by the engine; and the dope sheet, graph editor, Key Cam and
Record work as they do in GMT.

**Used as they are**: exponential tracks and their Bezier-on-log (`engine/math/AnimationMath.ts`,
grep `isLog`); Key Cam and its custom capture (`engine/animation/cameraKeyRegistry.ts`,
`setCameraKeyCaptureFn`); scrub hooks (`registerScrubHook`); `animationEngine.evaluateTrack` (no side
effects); the timeline host, already mounted in `deep-zoom/DeepZoomApp.tsx`; the draw tick
`deepZoom.step`, already after the animation's write (`TICK_PHASE.OVERLAY` after `ANIMATE`); roll in
the engine's fly code (`engine/plugins/navigation/FlyIntegrator.ts`).

**What fluid-toy has, and has not** (read 2026-10-10). It has the pacing half: `julia.zoom` is an
exponential track with Bezier handles in log units, and the pair makes position inherit that curve
("linear-in-zoom", `cameraPairRegistry.ts`). It does not have the path half: between two keys the
position moves in a straight line, so the direction changes at each key; its saved-view tween
(`fluid-toy/viewLibrary.ts`, `tweenView`) is a plain lerp of the centre with the zoom in log.

**A fault found in the pair, on the formula's arithmetic only.** It computes progress from the
shallow end, `(zT - z0) / (z1 - z0)`, which runs out of digits: on one leg from zoom 1 to 1e-30 the
position is 0.0008 of a screen off at 1e-14, 0.11 of a screen off at 1e-16, and at 1e-20 it has
already arrived (a full screen off). The two-word precision does not help: the weak number is the
progress. The same quantity taken from the deep end, `(zT - z1) / (z0 - z1)`, keeps every digit.
**Confirmed in R0 and fixed in R2a** (`80a5916e`, `npm run test:camera-pair`): through the real
`evaluatePairedTrack` the pan was 0.45 of a view off from 1e-17 on, and is 6e-18 of a view off at
1e-16 after the fix. It was live in fluid-toy for two camera keys more than about 13 decades apart.

## The stages

Every stage is built (R6c for the deep zoomer; GMT's half is read, not built). Each has an "As built" note below, and those notes are the record
of what the code does and of what was decided on the way. What is left, in the order to build it:

| # | Stage | What he gets |
|---|---|---|
| R5 | Free look while a route plays | The mouse and Q / E turn the view over a playing route; with Record on the turn is kept as three tracks |
| R6b | Routes to MP4 / WebM | Video from the render dialog, written to disk as it goes; a Draft preset |
| R6c | Existing frames | An image-sequence render that finds its frames already in the folder asks: overwrite, continue or cancel. GMT's renders too |
| R7 | Cleanup | The previous-generation marches retired, dead handles gone, help text; then the retest of the frames that do not repeat |

What a stage has cost so far: 500 to 900 thousand builder tokens and 50 to 180 minutes. After R7
comes `NEXT.md` session 3 (zoom-outs).

### R0. The in-between, studied on the CPU

No app change. A scratch folder `debug/scratch/route-study/` (git-ignored, like `formula-study/`),
with the renderer's spans lifted into node the way the navigation study did (in `core.js` grep
`THE FREE DISTANCE ALONG A RAY`, `rayFreeJS`; that study's logs are in `H:/tmp/dz-nav-study/`).

- **Test routes**: a straight dive; a dive that turns at each keyframe; half an orbit; a slide along a
  wall; in, out and in again; keyframes 1, 10 and 30 decades apart; his kept places
  (`deep-zoom/data/places.ts`, `debug/scratch/owner-e20/`); one Mandelbox place.
- **Candidates**:
  - a. the engine's rule: a straight line, progress linear in depth;
  - b. today's module spline (`pathApplyCR`, uniform Catmull-Rom). Its tangent at a keyframe is half
    the distance between the neighbours, which the shallow side dominates, so with keyframes decades
    apart it should overshoot into the solid (worked out, not run);
  - c. a Hermite curve with depth as the knot: the turn happens in the first decade after a keyframe,
    with a radius of about the depth there (worked out, not run);
  - d. log-polar about the point the deeper keyframe looks at: the distance to it eased in log, with
    the same Bezier-on-log the depth track uses, and the direction turned on the sphere. An orbit, a
    spiral and a straight dive are then one rule. This is fluid-toy's "solve in log space, then exp
    back" carried from one number to a position.
- **Measured for each**: whether a leg enters the solid; speed and turn rate on screen along the leg
  (largest over smallest, and the jump at a keyframe); position error against a BigInt referee at
  1e-77; cost per evaluation. Whatever the rule, it is evaluated from the deeper end.
- **Also settled here**:
  - which number is "depth" on the track: what the HUD shows (`deep-zoom/depthNow.ts`, what is looked
    at) or what the speed uses (`deep-zoom/flyPace.ts`). A glance past an edge makes the first jump
    by decades; judged on how even the pace of a played route is;
  - rotation between keyframes takes the shortest turn (quaternions built from yaw, pitch and roll);
  - what one seek costs: `buildRefOrbit` plus `uploadOrbit` timed at the kept places, bulb and box.
    Flying already rebuilds the orbit every frame, so the expectation is "what flying costs"; no
    number exists anywhere in the tree;
  - the pair's fault above, run through the real `evaluatePairedTrack`.
- **Done when** he has seen the plots and a rule is chosen.

**As measured, 2026-10-10** (`debug/scratch/route-study/`: `study.mts`, `pair-check.mts`, `report.mts`,
results and the page in `out/`; git-ignored; about 40 s to run). The data is the sample flight: 36.8
decades in 1,291 exact views. A route is a few of those views kept as keyframes, judged against
what was flown. The owner has the page; the rule below is recommended and awaits his word.

- **The rule: the straight line made smooth.** A Hermite curve in the leg's clock `m`, where `m` is
  the share of the leg's integral of depth over time that has passed. On a dive `m` is the pair's
  linear-in-zoom progress; with the depth flat it is plain time. A key's tangent is its on-screen
  velocity, and every weight is taken from the deeper key, where it goes to zero.
- **Each keyframe keeps its heading**: the direction of travel when it was set, which the trail
  knows. With keyframes 0.2 decades apart the route stays within 0.0025 of the distance to the
  nearest surface of what was flown (the straight line: 0.55; the average of the two legs as the
  tangent: 0.074), and its sharpest turn is 25 degrees a second where the flown dive's own is 30.
  The key's AIM is a bad stand-in for its heading, because he looks around while flying: 240
  degrees a second. A keyframe with no heading (a pasted place) takes the average of its two legs.
- **The straight line** turns 4 degrees at a typical keyframe and 26 at the worst with keys a decade
  apart, 22 and 34 at five decades, and passes within 1.2 % of the room he kept.
- **Today's module spline** (`pathApplyCR`) does not hold beyond its own spacing: at one decade a leg
  it is 25 nearest-surface distances off the flown path and puts a sample inside the solid.
- **The spiral** turns gently (2 to 10 degrees a second) and is exact round a point, but it leaves a
  5 to 20 degree turn at keys, steps the speed by up to 2.8 times at close spacing, and went 11
  distances off the flown path there. Not for a route cut from a trail.
- **Even pace means even speed on screen.** With legs timed by their decades alone the speed varies
  1.28 times along the 5-decade route and steps 1.17 times at a keyframe. Timed by each leg's
  distance on screen: 1.00 on the straight line, 1.07 on the smoothed one. Decades per second stays
  the readout.
- **Long legs need the warning.** At 12 decades a leg every rule passes within 1 % of the room he
  kept somewhere, though no sample is inside the solid; at 5 decades, about 20 %.
- **Other moves.** Round a point in 30-degree steps the smoothed line is 2.1 % off the circle. In,
  out and in again, it slows through the turn-round (the speed varies 2.2 times) with no corner.
  Played backwards it retraces the forward path to 1.7e-15 of a depth.
- **The pair's fault is real.** `evaluatePairedTrack` on one leg from zoom 1 to 1e-30 is 5 % of a
  view off at 1e-16 and has stopped panning by 1e-17: 0.45 of a view off, the whole pan left. The
  file is the same on `main`. Marked `@bug PRODUCTION` in `engine/animation/cameraPairRegistry.ts`.
- **A seek's CPU cost.** The reference orbit takes 0.4 ms at 14 iterations, 2.2 ms at 50 and 5.2 ms
  at 80 (worst seen 10.7); the GPU upload and the draw are not in that. Working out the position:
  1.6 microseconds.
- **Not settled: which number is "depth".** On this dive what is looked at and the nearest surface
  are equally steady (one and three steps back up of over a tenth of a decade). His power-4 place,
  where they differ by 22 decades, is not a flown dive. Decide in R3 with a trail from there.
- **Owed to R2**: the clock for a depth curve that is not a straight line in log (a Bezier). The
  study's legs are log-linear, where the integral has a closed form.

What this changes below: a key's payload is the exact view AND its heading (R2, R3); Even pace times
a leg by its distance on screen, not by its decades (R3, R4); the trail hands each keyframe its
heading, so R4's "pick keyframes from the trail" needs no fitting of tangents.

### R1. Roll, and places slimmed

- **Renderer**: `function basis` takes a roll. A view carries an optional `roll`, 0 when absent, so
  every stored view, starter, place, link and scene stays valid and draws the same: parity and the
  direct proof stay green with no line changed. `api.dz.setYawPitch` and `yawPitch` take and return
  the third number; the telemetry keys do not change (they are frozen).
- **Shell**: `deep-zoom/flyCamera.ts` stops taking the integrator's turn apart into a turntable
  (grep `Q AND E ARE DOWN AND UP HERE`) and passes roll through; Q and E leave the up / down list
  (Space and C stay); `orbitCamera.ts` turns about the camera's own up and right through the pivot;
  `locations.ts`, `locationParse.ts`, `presetFields.ts`, `share.ts` and `data/*.ts` carry the roll.
- **Places**: `DzLocationState` keeps the view and the formula, iterations with it. Light, colour,
  gradient, detail and march settings are no longer written, and are ignored in a place that has
  them; `jumpTo` stops applying them. This reverses DECISIONS K10's "a saved place carries its
  gradient" and stage 3's "a location carries its march settings" (answer 1: yes).
- **Checks touched**: `check:deep-zoom-fly-camera`, `check:deep-zoom-orbit-camera`,
  `check:deep-zoom-location-parse`, `check:deep-zoom-host`, `check:deep-zoom-module-host`;
  `smoke:deep-zoom` stage N5 presses the fly keys.
- **Not planned**: a horizon lock. Flying becomes GMT's. Say if it is wanted.

**As built, 2026-10-11** (one builder: 723 thousand tokens, 73 minutes, 29 files, +729 / -592). On
the real GPU, by the builder: parity 52 of 52 and the direct proof with neither script changed, the
shell smoke 55 of 55, the build. By the orchestrator: typecheck, the nine node checks, the renderer
diff (22 lines). The owner flew it before it was committed: "I see the rolls is working. looking
good."

Decided without him, for him to confirm:
- **The roll rate.** The engine's roll follows the fly speed, and this app's default speed is 3.6
  against GMT's 0.5: passed straight through, one second of Q rolled 148 degrees. The roll keys run
  at a gear of 7.2 (`DZ_NAV_ROLL_GEAR` in `deep-zoom/flyCamera.ts`), so the default speed rolls 20
  degrees a second, as GMT's default does; Shift is four times.
- **Q and E no longer end a Dive to depth** (they were in `CANCEL_KEYS` as fly keys).
- **Home, Back, a starter card and pasted text change the camera and the formula only**, like a
  place. None of them resets detail, light type or colouring any more.
- **His kept places without their march settings**: with the ray march on (the default) 1.7 %,
  1.7 % and 0.7 % of rays land on the wrong surface; with it off they draw wrong (98 %, 4 %, 48 %)
  until the step is set by hand. The numbers stay with the bench (`KeptPlace.march`).
- Within 4.5e-4 radians of straight up or down the roll reads back as 0, so the view can snap once
  by up to 9e-4 radians.

Waiting for him, because each edit raises an approval prompt: ADR-0133's update block of 2026-10-08
states the turntable and "Q and E are remapped to down and up", both now false; and
`.claude/rules/sibling-apps.md` says the navigation hands the host "a yaw / pitch".

### R2. Engine: a key can carry app data

**Split for the overnight run of 2026-10-11** so the first playable route comes sooner. **R2a, built
first**: the payload on keys, the release flag, the in-between module, the pair's long-leg fix, the
frame rate in a saved scene. **R2b, moved to after R5**: the exponential-track tool faults and the
undoable timeline length. Until R2b the Bias handle and the Pencil are still wrong on an
exponential track, as they are in fluid-toy today. The decision record is drafted, not filed: an
ADR write raises an approval prompt, so it waits for the owner.

Generic, and the one stage with a decision record (it extends ADR-0015). ADR numbers 0131 and 0132
are taken on the unmerged `audio-perf-overnight` branch; take the next free one at the time.

- **`Keyframe` (`types/animation.ts`) gains an optional payload the engine does not read.** The
  contract: every operation that keeps a key keeps its payload (move, copy, paste, undo, save, load,
  `setFps(x, 'match')`). On a track registered as carrying payloads a key's value is locked while its
  time and handles stay editable, and the tools that invent keys (Simplify, Bake, Pencil, Smooth)
  refuse. First job: list every site that builds a `Keyframe` (`store/animation/sequenceSlice.ts`,
  `utils/CurveFitting.ts`, `utils/timelineUtils.ts`, `engine/animation/cameraKeyRegistry.ts`,
  `engine/algorithms/TrackUtils.ts`) and settle each as carry, lock or refuse.
- **`registerCameraKeyTracks` entries say whether a track is released while the camera is recorded.**
  Today playback with Record on stops driving every `camera.*` track (grep `ignoreCamera` in
  `engine/AnimationEngine.ts`). Default: released, as today, so GMT does not change.
- **The in-between rule from R0** as a pure module in `engine/animation/`, with a node check that
  goes red when the rule is evaluated from the shallow end.
- **The exponential-track tool faults** (the `@bug PRODUCTION` block in `logTrackRegistry.ts`): the
  Bias handle, the Pencil, the fitter (`fitSamplesToKeys`) and its Douglas-Peucker tolerance work in
  plain value units, 1.34 decades off on a 24-decade track. A route's depth track spans 20 to 77
  decades and he will retime with these tools. Fix them, then remove the `@bug`.
- **The pair's long-leg fault**, if R0 confirms it: evaluate from the deeper end.
- **The frame rate in a saved scene.** Confirmed by reading, 2026-10-10: `getPreset` in
  `store/engineStore.ts` writes `p.sequence` and `p.duration` and no frame rate (grep
  `p.duration = animStore.durationFrames`). So a route's length in seconds changes on reload, and
  GMT's does too. Answer 9: fix it, and make the timeline's length undoable in the same stage.
- **Guards**: `smoke:anim-play`, `smoke:track-binding`, `smoke:fluid-toy` (fluid-toy is the only app
  with an exponential track and a pair).

**R2a as built, 2026-10-11** (`80a5916e`: the pair fix on its own, so it can go to `main` ahead of
the branch; `0672e352`: the rest. One builder: 517 thousand tokens, 48 minutes; outside `debug/`
+535 / -53, of which 261 lines are code). By the builder: typecheck, the three new node tests, the
animation smokes, `smoke:fluid-toy`, `smoke:interact`, `smoke:chrome` (8 passes) and
`smoke:deep-zoom` (55 of 55) against the worktree's server, the build. By the orchestrator:
typecheck, the four node tests, the pair diff, and the study's own pair check against the fixed
function.

What a later stage calls:
- `Keyframe.payload` (`types/animation.ts`); `registerPayloadTrack` / `isPayloadTrack`
  (`engine/animation/payloadTrackRegistry.ts`, whose header is the contract);
  `addKeyframe(trackId, frame, value, interpolation?, payload?)`; `updateKeyframes` (on a payload
  track `value` is dropped unless the patch also carries a `payload`); `replaceKeyframes`.
- `registerCameraKeyTracks([{ id, hidden?, releaseOnRecord? }])`.
- `engine/animation/zoomPath.ts`: `buildZoomPath(keys, { unit, scaleAt? })`, `zoomPathPosition`,
  `zoomLegOnScreen` (e-folds; seconds = that / ln 10 / pace), `zoomPathOrientation`. `unit` is
  fixed-point steps per 1.0 (2 ** 256 here). Keys in rising time; reversing a route means negating
  its headings.
- `Preset.fps`.

Decided without the owner:
- The pair test's bar is 1e-12 of a view or two steps of the low word, whichever is coarser: two
  f64 words cannot hold more (about 4e-6 of a view at zoom 1e-29).
- Orientation is a cumulative cubic in the rotation group, not squad: squad's turning rate is
  continuous only for evenly spaced keys.
- A scene load sets the frame rate directly, like the length. Changing the frame rate now counts
  as an unsaved change, and a share link carries `fps`.
- GMT's filtered load carries the frame rate too (`engine-gmt/utils/loadFilter.ts`), and GMT's own
  preset type has the field (`engine-gmt/types/fractal.ts`): added by the orchestrator.

Found, not fixed:
- A share link rounds every number to 5 decimals and anything under 1e-9 to 0
  (`utils/UrlStateEncoder.ts`, grep `quantize`). Read, not run: if so, a deep `julia.zoom` does not
  survive a fluid-toy share link today. Exact data in a payload must be strings.
- On a payload track the key inspector's value field and a vertical drag in the graph editor do
  nothing, and nothing is greyed out.
- `plans/deep-zoom-shell/gmt-systems/camera-systems.md` still describes the pair's old formula.

Done with the owner back, 2026-10-11: the decision record is filed as
`docs/adr/0136-keys-carry-app-data.md` (R2b's items in it), and
`.claude/rules/tick-and-animation.md` cites the four node tests.

**R2b as built, 2026-10-11** (`15b419bb`; one builder: 645 thousand tokens, 51 minutes; 20 files,
+437 / -233, of which 213 added lines are code, and a 387-line node test). All seven items done.
By the builder: typecheck, `test:log-curves` (47 checks), the animation smokes, `smoke:fluid-toy`,
`smoke:interact`, `smoke:chrome`, `smoke:deep-zoom` (55 of 55), the build, and a scratch proof in
three apps (`debug/scratch/r2b/`, 41 checks, with screenshots). By the orchestrator: typecheck, the
seven node tests and checks, the screenshot of the Depth track.

- **The graph editor draws an exponential track through its log**, in both views, with the axis
  in the value's own units (1, 0.01, 1e-6 ...). The deep zoomer's Depth curve is a curve over its
  decades, not an L: the value that plays lies within 1.5 px of the drawn line. A key dragged
  22 px moved 0.77 decades, as the pointer did.
- **Re-tangenting, the fitter and the Pencil's tolerance work in log there**: 3.6e-15 decades from
  the by-hand result where they were 0.99 off on a 24-decade track; a fitted stroke within 0.0067
  decades of its samples where it was 4.22 off.
- **Key Cam and the key buttons compare by ratio** on such a track: no "changed" between two keys.
- **A payload track's value is read-only in the inspector**, and a drag moves its key in time only.
- **The timeline's length is in the undo**: one step per committed change of LEN.
- Also fixed, found on the way: a key added between two keys of an exponential track was split in
  plain values (live in fluid-toy).

What GMT feels: a change of LEN can be undone, and Ctrl+Z over the timeline straight after loading
a scene brings back the previous keys with their previous length (before: with the loaded
scene's). Nothing else: a plain track's tools give the same output to the bit as at `b2a47674`.

Decided without the owner: on one un-normalised view a plain track sits at its value and an
exponential one at its exponent, and the axis reads in the units of the tracks in focus (with
Depth selected and Iterations also shown, the lines beside Iterations read 1e40).

Still in plain values on an exponential track (recorded as assumptions in
`engine/animation/logTrackRegistry.ts`; none reachable on the route's track): Smooth, Bounce,
Simplify, a Continue tail, and the inspector's value field dragging in plain steps.

### R3. Keyframes as you dive

The first route he can play.

- **The track**: `camera.depth` registered as an exponential track and as the Key Cam track, with a
  capture function that writes the depth as the value and the exact view as the payload. The unused
  `camera.u` param goes (`deep-zoom/features/camera.ts`; the feature stays for the depth overlay).
- **Dropping a keyframe**: `K` adds it after the last one, timed at the default pace (0.5 decades a
  second), and extends the timeline; pressed while parked on a keyframe it replaces that
  keyframe.
- **The evaluator**: a post-scrub hook reads the keys round the frame and the depth at the frame,
  runs R0's rule and calls `host.setView` once, and only when the view changed, so a parked playhead
  lets the still gather. `setView` already snaps the depth easing (grep `snapDist`), so a backward
  scrub draws what forward play draws. Nothing on this route writes iterations, power or phase.
- **Iterations**: Key Cam also keys `dzFormula.iterations` with the count in effect,
  and the automatic rule is off while a route drives, so preview and render agree.
- **Formula params under the timeline**: `deep-zoom/useHostSync.ts` holds them 90 ms
  (`DZ_ORBIT_PUSH_DELAY_MS`, a trailing wait meant for slider drags), so a keyframed one never
  arrives during playback. On a scrub they are pushed at once.
- **The Route tab**: thumbnail (`api.dz.thumbnail`), depth, time; go to, replace with this view,
  delete, play this leg; a Play button (Space is fly-up in Fly mode and stays so); the pace at the
  playhead (`decadesPerSecond` in `deep-zoom/components/depthFormat.ts`).
- **The clip warning**: a leg sampled against `api.dz.freeDistance`, worked out when a keyframe
  changes, not every frame.
- **While the timeline drives**: a fly key stops playback and he flies on from there; depth toasts off (`milestones.ts`); the
  navigation lock covers the engine's timeline, not only the module's own preview
  (`navigationLocked` in `DeepZoomNavigation.tsx`).
- **Off the route**: an undo of an older jump, or flying away, leaves the camera somewhere the
  playhead does not describe. The Route tab says so and offers the way back; the evaluator does not
  fight it.
- **Saved** with the scene by the engine: the keys are in the sequence. No document provider.

**As built, 2026-10-11** (one builder: 788 thousand tokens, 74 minutes; +1,297 lines, of which 827
are code and 250 of those the node check). By the builder on the real GPU: parity 52 of 52 and the
direct proof, the shell smoke 55 of 55, the build, and a scratch run of the real app (45 lines:
three keyframes, scrub to each and the camera equals it to the digit, play, a fly key stops it,
replace, delete, undo, a scene saved and loaded byte-identical, a share link without the route).
By the orchestrator: typecheck, the route check and five other node checks, the renderer diff, the
screenshots (`debug/scratch/r3/`). Files: `deep-zoom/route.ts`, `components/RoutePanel.tsx`,
`debug/deep-zoom-checks/route.mts`.

Differs from the plan:
- **K always adds after the last keyframe**, also with the playhead on the last one: after K the
  playhead sits there, so "parked on a keyframe replaces" would have replaced the first keyframe
  for ever. On an EARLIER keyframe K replaces it; the row's save icon and Key Cam replace any.
- A new leg is capped at 180 seconds; keyframes sit on whole frames.
- The Route tab's Play runs from the playhead to the last keyframe and stops; the timeline's own
  Play loops as before.
- A replace keeps the keyframe's old heading.

For the owner to know before he flies it:
- **K and Ctrl+Z.** K is one step on the animation's undo, which answers Ctrl+Z only with the
  pointer over the timeline. Over the picture, Ctrl+Z undoes the flight before the keyframe and
  the keyframe stays.
- **A tap back before K hooks the path**: the heading is the last move. R4 takes it from the trail.
- **Retiming a keyframe does not move its iteration key** (two tracks). R4 ties them.
- Iterations above 160 on the Mandelbulb are cut by the renderer, so a power-2 route deeper than
  about 1e-38 plays with too few. The renderer's ceiling was left alone.
- After a scrub the Iterations slider shows the keyed count. Return and a scrub leave no way back
  to where he had flown.
- **The graph editor draws the depth track in plain values**, an L shape: sliding keys in the dope
  sheet works, shaping the curve does not yet. Engine faults found on the way, all for R2b: the
  graph editor's Normalize misdraws an exponential track (`getLocalY` in `buildTrackPolyline`,
  `utils/GraphRendererBuilder.ts`); Key Cam reads "changed" between keys on one
  (`KeyCamButton.getStatus` calls `evaluateTrackValue` without `isLogTrack`); the iterations track
  is filed under Shading.

### R4. The trail

- **The trail**: views with their time and depth, appended from the navigation tick when the camera
  moved; session memory only, thinned as it grows. A new one starts at a jump to a place, a formula
  change and a scene load. A jump that would drop a trail more than a few decades deep asks first and
  offers to make the route (the number is open; 3 suggested).
- **Route to here**: dead ends and dwelling are cut, and keyframes are picked from the trail's own
  samples so that the route, under R0's rule, stays within a tolerance on screen of what was flown.
  The smoothing slider re-picks from the kept trail, so it can be turned back.
- **Timing**: key times from the trail's clock with the dwelling clipped (As flown), or from the pace
  (Even). One button each.
- **Replacing a route** that has hand-set keyframes asks first; either way it is one undo step.
- **The module's own recorder is not used**: `api.recordToggle` keeps sparse waypoints, throws the
  timing away (`assignCinematicTime`) and writes no keyframe at stop, so the tail is lost.

**As built, 2026-10-11** (one builder: 824 thousand tokens, 89 minutes; +1,809 / -61, of which 699
lines are app code and 533 the node check). By the builder on the real GPU: the shell smoke 55 of
55 (stage by stage), a scratch run of the real app (40 lines), last stage's app run again, the
build. By the orchestrator: typecheck, the trail, route and two host checks, the screenshots
(`debug/scratch/r4/`). `core.js` untouched. Files: `deep-zoom/trail.ts`,
`debug/deep-zoom-checks/trail.mts`.

On the owner's sample flight, all 1,291 views as the trail (the cut dropped none):

| Smoothing | Keyframes | Worst, depths | Mean, depths | Seconds at Even pace | Pace on screen, decades a second |
|---|---|---|---|---|---|
| 0.01 | 43 | 0.0095 | 0.0019 | 89.6 | 0.47 to 0.54 |
| 0.05 | 30 | 0.040 | 0.0075 | 89.5 | 0.46 to 0.57 |
| 0.2 | 21 | 0.19 | 0.035 | 89.6 | 0.41 to 0.61 |

Differs from the plan, with the reason:
- **A leg of a trail-made route at Even pace is timed along the way that was flown**, not by the
  straight line between its keyframes, and **the pick holds the depth curve within half a decade of
  the depth flown** before it looks at position. On his dive the depth shown steps a decade in one
  view (the view slipping past an edge); timed by the straight line, the leg across it took 19
  seconds for a stretch flown in 3.4. This is R0's unsettled "which number is depth" showing up:
  handled here, not settled.
- **No blocking question on a jump.** A trail deeper than 3 decades is kept as the previous trail,
  with a toast, and the tab offers "Route from the previous trail".

Decided without the owner:
- "Formula change" ends the trail on the Mandelbulb / Mandelbox switch only; a power or phase
  change does not.
- A view set without a jump (an undo, the route's own frames) joins the trail when the trail has
  been within one depth of it; otherwise the trail ends there. So an undone flight becomes a detour
  and is cut, and "Route to here" with the camera parked mid-route trims the route to there.
- The cut: the same place is within half a depth of the shallower of the two, at depths within a
  factor of 2; a way back counts as a detour when it is 3 times the straight distance.
- The cap is 4,096 samples; the oldest stretch halves again each time it is reached.
- Recording switched off and on again continues the same trail.
- After a reload or a scene load every keyframe counts as hand-set: the question is asked and the
  slider is hidden.
- The timeline's length only grows.

To know:
- Keyframes cut from a trail have no thumbnail (a number instead).
- The tab's pace readout divides by the depth curve, so on a cut route it can read a little off 0.5.
- Costs: the cut took 190 ms on 3,767 samples all at one depth (its worst case); the pick 45 to
  90 ms on 1,291 samples, not measured at the cap.
- Not driven in the real app: a formula switch or a scene load ending the trail, Orbit mode, a
  trail at the cap, a 300-keyframe route.
- The floating Animate button sits over the bottom of a long keyframe list.

### R5. Free look while a route plays

His words, 2026-10-10 and 2026-10-11: "route first - the camera second - but that part is optional.
all it means is we can playback the route and record/view a rotation offset ontop of it"; "the look
pass i.e free look during dive playback - optional for the user, compulsory for us".

- **Today** (R3) any hand on the controls stops a playing route.
- **Wanted**: while a route plays, the drag-look of Fly mode and Q / E turn the view on top of the
  route's own rotation. A fly key (W A S D, Space, C, the wheel) still stops playback and hands him
  the camera; so does an Orbit-mode drag, which moves the camera. (The Orbit half is the
  orchestrator's choice; say so to him when it is flyable.)
- **Not recorded**: the turn is an offset that returns to nothing when playback stops ("returns to
  route").
- **Recorded**: with the timeline's Record on, the turn is written as keys on three plain tracks
  (pan, tilt, roll, in radians), a key a frame while it plays, then thinned with the fitter. The
  route's own track keeps being driven (`camera.depth` is registered with `releaseOnRecord: false`)
  and only the look tracks are let go. Names: mind `AnimationEngine.interpolate`, which treats an id
  holding `rot`, `phase` or `twist` as an angle that wraps.
- **Where**: `drive()` in `deep-zoom/route.ts` is the one place a frame's view is composed before
  `host.setView`; the offset is composed there, so a render gets it with no further work. The
  per-frame capture trigger is GMT-only today (grep `isRecording && recordCamera` in
  `engine-gmt/navigation/Navigation.tsx`): the shell's navigation needs its own, or the trigger
  moves to where any app can reach it.
- **The timeline** then shows Camera as Depth plus the three Look tracks (answer 10).
- **Proof**: `check:deep-zoom-route` extended (the offset is composed on the route's rotation, is
  gone when playback stops, plays back from its keys, and leaves the route's keys alone), and a
  scratch run of the real app. No new smoke step.

**As built, 2026-10-11** (`3abf4af2`; one builder: 469 thousand tokens, 50 minutes; 5 files, +839 /
-69, of which 278 lines are the node check). By the builder on the real GPU: the shell smoke 55 of
55, a scratch run of the real app (`debug/scratch/r5/app-look.mts`, 31 lines), the build. By the
orchestrator: typecheck, six node checks, the diff, the two screenshots, the app run and the whole
smoke again after a one-line fix (below). Three deliberate breaks, as the brief capped them: the
side the look is multiplied on (5 lines red), the stop listener (3), a fly key's take (1); those
three are the `@invariant`s, the rest of the free look is `@assumption`. `core.js` and `engine/**`
untouched. Files: `deep-zoom/route.ts` (`routeShownAt`, `lookTurned`, `pauseRoute`, `clearLook`),
`DeepZoomNavigation.tsx` (`moveHeld`, `lookOnly`), `features/camera.ts`, `RoutePanel.tsx`.

What is there:
- While a route plays, a Fly-mode look drag, the look stick and Q / E (both modes) turn the view
  on top of the route, and it plays on. W A S D, Space, C, the wheel (Fly mode) and any Orbit-mode
  press stop it and hand over the camera, turn included. Pause, the route's end or a scrub drop
  an unrecorded turn: one `setView`, back on the route.
- With Record on the turn is kept on `camera.lookPan` / `lookTilt` / `lookRoll` (radians; "Look
  pan", "Look tilt", "Look roll" under Camera): a key a frame, one undo step, thinned to 0.1
  degree a track when the pass ends (`LOOK_FIT_TOLERANCE`). A scrub, and so a render, shows route
  x look.
- The look is pan about the camera's up, then tilt, then roll, in the camera's own frame
  (`Euler(tilt, -pan, roll, 'YXZ')`, the order `toQuaternion` builds an orientation in).
- The Route tab: one faint help line, and "A free look is recorded on this route." with Clear
  while a look track holds a key.

Measured: a ten-second smooth pass leaves 41 / 25 / 20 keys and plays back 0.0012 degrees from
what was turned; 3.6 s by hand in the app, 107 keys a track thinned to 21 / 16 / 24. What plays
against what was on screen at 36 degrees a second: 0.02 to 0.04 degrees.

Differs from the brief, with the reason:
- **A pass begins at the hand's first turn, not at Play.** With Record on and no turn nothing is
  written and a look already recorded plays on. Read to the letter, playing an existing take with
  Record on would have flattened the played span to one value.
- **A frame is sampled when the next one is driven**: the timeline's tick runs before the
  navigation's, so the turn of a frame arrives after its `drive`. Sampled inside `drive` the
  recording played back 1.0 degree behind the screen.
- **The three tracks are DDFS params on the `camera` feature**, which keeps Key Cam from reading
  "changed". Side effect: Key Cam's "delete key" and "delete tracks" also act on the look tracks.
- **Clear removes the three tracks**, not only their keys.
- `stopRoutePlayback` is the hands' only; the Route tab's Pause is `pauseRoute`.

Fixed by the orchestrator on the way:
- **In Orbit mode, Space held as a hand holds it (150 ms) stopped the route it had just
  started** (a tap played). Older than R5: Space counts as "up", and any held key stopped a
  route. In Orbit mode nothing held is a move now (`moveHeld`); measured after: playing.
- **A stage-only smoke run timed out at its first step**, on committed code too: leaving a page
  whose ray march shader is still building takes 36 to 44 s, and the runner allowed 30. It
  allows two minutes (`debug/smoke-deep-zoom.mts`, `boot`).

To know:
- A pass that ends turned leaves the rest of the route turned (a plain track holds its last
  value). There is no ease back to the route.
- A look drag still held when the route ends turns the camera from the route's end, and takes it.
- K in the middle of a free look keys what is on screen, turn included.
- The thinned keys are denser than the tolerance needs (the fitted curve lands about a hundred
  times inside it).
- Key Cam's "delete key at the playhead" is one undo step a track: up to five for a click now.
- Not driven: a real render of a route with a look, the touch sticks, a timeline that loops in
  the middle of a pass, a look carried over straight up or down.
- No ADR yet: ADR-0136 wants an update block for the three look tracks (released on record, the
  route's track held; a pass begins at the first turn; a keyframe under a look stores route =
  screen x inverse look). The sibling-apps rule should say the route check now carries the
  "look: ..." lines.

### R6. Rendering

**Order changed in the overnight run of 2026-10-11.** After R4 the next stage built is **R6a**:
the renderer's single-frame render, the engine's folder-of-frames sink and `openRenderPopup()`, and
the deep zoomer rendering its route as PNG frames through the engine's dialog. A route that cannot
be rendered is half a feature, and the look pass (R5) is optional. Still to come, in this order: R5,
then **R6b** (MP4 / WebM for the deep zoomer, the preview video), then R2b, then R7. GMT's own
render popup is not touched unattended; the builder leaves a note on what unifying it would take.
(That was the night's order. R2b is built since; what is left and in what order is "The stages".)

**R6a as built, 2026-10-11** (`736103ad`; one builder: 899 thousand tokens, 183 minutes; +1,288 /
-68, about 600 lines of product code). By the builder on the real GPU: parity 52 of 52 and the
direct proof three times with neither script changed, the shell smoke 55 of 55, `smoke:fluid-toy`,
`smoke:chrome`, a scratch run of the real app (24 lines), a scratch check that fluid-toy's and
app-gmt's Render button opens the dialog they had, the build. By the orchestrator: typecheck,
eight node tests and checks, the screenshots (`debug/scratch/r6/`).

What is there: the Route tab's Render button opens the engine's render dialog with a
"PNG sequence (folder)" format: a size by long edge (1280, 1920, 2560, 3840) at the picture's own
shape, samples, the range (the route's first to last keyframe), Resume. Files are named by
timeline frame, five digits, as GMT's are. Cancel keeps what is written; the finished view gives
the ffmpeg line with Copy. Files: `deep-zoom/routeRender.tsx`, `engine/export/frameFolder.ts`,
`engine/plugins/RenderDialog/ResultView.tsx`; renderer `api.dz.renderFrame`; `openRenderPopup()`.

Measured: 0.3 s a frame at 1920 x 1500 with 8 samples at the whole object, 0.7 s at 6.6e-35 (79
iterations). With the window minimised a 0.5 s frame took about 4 s; it does not stall.

**Not met as built: a frame is not always equal to itself.** Smooth frames are equal alone and in
sequence (0 or 1 level in a pixel or two). On grainy ground, in 5 of 7 sessions where Render was
pressed 15 to 24 seconds after the renderer was ready, some frames differed from the same frame
rendered later: up to 297 thousand of 1.28 million pixels, up to 105 levels. After a 75-second wait
before the run, 0 of 5 sessions differed. The renderer's own stills do the same. All 16 differing
frames were drawn 1.1 to 4.4 seconds after the ray march's shader arrived, and by that shader.

**Looked into the same morning (the builder again, 378 thousand tokens more), and not found.**
- Refuted by measurement: an older march drawing the frames (84 frames, every tile by the ray
  program); the skip-table setting (false before and after all 276 frames of 23 sessions); any
  host setting or the iteration count changing; a 10-second hold after the shader arrives (1 of 4
  sessions still differed, 4 of 48 frames).
- What is known: the other picture is a definite one, not noise (frame 4 came out 282,470 to
  282,476 pixels off in 8 sessions). Every WebGL command of a differing frame equals its later
  render's except two things: `uRefE` / `uFarFrom` at set-up (taken from the smoothed distance and
  set again before every draw; withheld, 4 of 4 sessions still differed) and the G-buffer, which a
  frame reuses from the frame before unless a live frame ran in between. A G-buffer made anew for
  every frame: 2 of 48 frames differed, against 36 of 117 with it reused. A chain of twelve frames
  started 60 seconds after ready: 0 of 12.
- **A lead for the owner, not built**: one line in `core.js` (`gbufW = gbufH = 0` when a frame is
  rendered alone) would make the G-buffer anew for each `renderFrame`. It cuts the rate strongly
  and is not a cure. `core.js`'s `MEASURED 2026-10-11` comment lists the G-buffer as ruled out;
  these numbers put that in doubt.
- Until it is understood: wait a minute after the page loads before a render that must repeat
  (a resumed one, above all).

**A defect found on the way, fixed** (`c8ce3ef1`): pressing Render before the ray march's shader
was built froze the page inside the first frame until the build ended (4 to 26 seconds), with no
status line and no Cancel. The runner now waits before each frame while a shader the picture needs
is building (`host.building()`), says so in the dialog, and Cancel answers within 0.2 seconds. Not
covered: the skip-table and true-gradient shaders, which a frame needs only with the ray march
off; the wait has no time limit.

**The preview during a run, fixed on the owner's first use** (`8de5616f`). He saw "the hires image,
then the lowres image, then a black frame - quite jarring. users would only like to see each hires
image, either while converging, or when completed converging." The live picture's buffer is 320
wide and a rendered frame's is the window's: between two frames a live frame was drawn, and each
change of size emptied the canvas. A run now holds the live picture from its first frame to its
end (`host.holdLive`), so the canvas keeps each finished frame until the next replaces it; a frame
is shown when it is complete, not while it converges (a picture put on the canvas mid-frame
changed the frame, measured in R6a). With the live picture held nothing else made the G-buffer
anew, so the lead above was applied with it: a frame of `renderFrame` gets its own. Measured, 25
frames at 1280 px and 8 samples: no live frame and one canvas size through the run, against 13
live frames and two sizes with the hold off; 43.5 s against 96.5 s on a machine that was running
other GPU checks. Parity 52 of 52, the direct proof, the render regression 24 of 24.

Decided without the owner (he approved every such list in this file on 2026-10-11: "I'm happy with
all your other choices"):
- The dialog stays the timeline toolbar's child, so Render opens the timeline, and closing the
  timeline mid-run cancels the run (a toast says what is in the folder).
- The picture's shape is taken with the timeline open.
- Resume is off by default; a run without it overwrites files of the same name. A resume into a
  folder holding frames of another size is refused.
- During a run the dialog shows one Cancel; the route, K, Key Cam and navigation are held.
- The automatic iteration rule is held for the whole run, also for a route with no iteration keys.

GMT's own rendering (the builder's read-only note, `debug/scratch/r6/gmt-render-notes.md`): GMT's
popup IS this dialog, with GMT's runner. It already writes PNG and JPG sequences into a picked
folder, from the worker, with no resume: every run raises the version in the file name. For GMT
to resume it needs one name per frame across runs, a skip in `runFramePump`, and frames that do
not depend on the frame before (the focus lock reads the previous frame's distance). Nothing in
GMT was changed.

Not exercised: a real folder picker and a real disk (an in-memory folder stood in); inside
`renderFrame`, the pole guard, the Mandelbox and a lost WebGL context.

**R6b. Routes to MP4 / WebM.**
- The deep zoomer's dialog offers the shared encoder's video formats beside "PNG sequence
  (folder)". The runner hands each rendered frame to the encoder (`engine/export/videoEncoder.ts`;
  ENGINE-GAPS E23: `encodeCanvas` is typed for canvases, its body takes any image source).
- **Written to disk as it goes.** The shared encoder holds a whole MP4 in memory (grep
  `fastStart: 'in-memory'`); GMT's own runner streams to a file (grep `fileStream` in
  `engine-gmt/components/timeline/RenderPopup/exportRunner.ts`). A long route must stream: give the
  shared encoder that, the way GMT's runner does it. No new library.
- **No preview feature.** He agreed (2026-10-11) that a preview is this same dialog at a small size
  and one sample: at most a one-click "Draft" preset that sets those two.
- Owed check: what a cancelled MP4 leaves on disk.
- **mediabunny, as a step of its own**: 1.40.1 is installed, 1.61.3 was the latest on 2026-10-05
  (his: "we might want to check for a recent ver or whatever is best"). It only packages the video;
  the encoding is the browser's. Read the changelog between the two first, bump, run GMT's export
  paths (`npm run test:export-naming`, and a real export by hand), one commit.

**R6b as built, 2026-10-11** (`9d05d00b`; one builder: 392 thousand tokens, 74 minutes; 7 files,
+493 / -85). By the builder on the real GPU: a scratch run of the real app
(`debug/scratch/r6b/video-render.mts`, 50 lines: each video read back with mediabunny's input side
and played in a `<video>`), the shell smoke 55 of 55, `smoke:fluid-toy`, `smoke:chrome`, a check that
fluid-toy's and app-gmt's dialog is the one they had (13 lines), the build. By the orchestrator:
typecheck, five node checks, the diff of the shared encoder and the dialog, the screenshot. One
deliberate break (the stream setting put back: "0 of 46 MiB reached the stream before the last
frame"). No `@invariant`: no standing command reaches the runner, the encoder or a dialog's Start.

What is there:
- The Render dialog lists MP4 (H.264, H.265, AV1) and WebM (VP9) beside "PNG sequence (folder)",
  which stays the default. A video asks for a file inside the click and is written as it goes: at
  1920 x 1500, 32 of 46 MiB had reached the stream before the last frame.
- While a video renders the dialog shows what fluid-toy's shows: Interrupt, then Resume / Finish /
  Discard. Finish closes a playable file with the frames made; Discard leaves nothing under the
  picked name; closing the timeline mid-run is a Finish.
- "Draft" sets 640 px and 1 sample and leaves the format alone. A 48-frame draft took 5 s.
- One frame loop, two sinks (`FrameSink` in `deep-zoom/routeRender.tsx`). In the shared encoder
  (`engine/export/videoEncoder.ts`): opt-in `mp4FastStart` and `keyFrameEvery`, `queueSize`. In the
  shared dialog: opt-in `presets`.

Measured: 0.80 s a frame as video against 0.74 as PNG at 1920 px and 2 samples. At 3840 x 3000
the probe refuses H.264 and H.265 on this machine and says why; AV1 and VP9 run. 3840 x 2160 was
not tried.

**The owed check, answered: what a cancelled MP4 leaves on disk.** Until the video is closed the
picked file is 0 bytes: the browser keeps the bytes in a swap file of its own. Finish: a playable
file with the frames made. Discard: nothing under the name (an empty file where the browser cannot
remove it; a file picked to be replaced keeps what it had). So a tab closed mid-run loses the
video, and a video cannot be continued: the folder of PNG frames stays the safe choice for a long
render.

Differs from the brief, with the reason:
- **The pixels still go through a PNG.** `core.js` hands out only a blob; taking the frame without
  it means a change in the kernel, worth about 170 ms of a 0.80 s frame at 1920 px. Not made.
- **GMT's worker was no pattern for streaming**: it holds an MP4 in memory with a stream too. The
  deep zoomer asks for `mp4FastStart: false`; nobody else's output changed.
- **A repair in the shared encoder that changes fluid-toy**: 'hevc', 'av1' and 'vp9' are not codec
  strings, and Chrome refused each ("Unsupported codec type"): three of fluid-toy's four formats
  made no file. They do now; its H.264 file is the same 20,733 bytes before and after.
- **A keyframe a second for the deep zoomer.** Left alone Chrome made one keyframe in 300 frames,
  which cannot be scrubbed in an editor. fluid-toy and GMT still make single-keyframe videos.

Found in GMT, not fixed (marked `@bug PRODUCTION` in `engine-gmt/engine/worker/WorkerExporter.ts`,
`49cfda80`): app-gmt's H.265 export fails with "Unsupported codec type" (AV1 and WebM take the same
line, not reached); and after a failed export every later one answers "Export already in
progress" until the page is reloaded.

To know:
- fluid-toy and GMT hold an MP4 in memory until the end even with a picked file, while the badge
  says DISK. One line each to change; it moves the file's index to its end, so it is his call.
- Not exercised: the browser's real file picker and a real disk, Firefox and Safari, a headed
  window, a route longer than 300 frames, the files opened in After Effects or Premiere.
- Draft has no way back to the values it replaced.
- **The mediabunny upgrade is not done.** The worktree has no install of its own: modules resolve
  from `stable/node_modules`, so a bump means an install in the production checkout. His word first.
  The changelog was read on 2026-10-11 (GitHub releases, 1.45.1 to 1.61.3; the releases from
  1.40.2 to 1.45.0 are on a page that was not read). Nothing in it breaks what
  `engine/export/videoEncoder.ts` and GMT's worker call (`Output`, `Mp4OutputFormat`,
  `WebMOutputFormat`, `StreamTarget`, `BufferTarget`, `EncodedVideoPacketSource`). What an upgrade
  brings that touches a written file: partial colour-space information written into MP4 and WebM
  and a corrected `vpcC` box (1.55.4), the AAC config fixed (1.55.3), a `btrt` box written
  (1.57.0), a failed `finalize()` leaving the output cancelled (1.57.0), a WebKit workaround for
  writes to a picked file (1.53.1), a Chromium workaround for the first packet's key flag
  (1.45.3). `bitrate` fields are deprecated in favour of `quality` since 1.52.0 (they still
  work). So the files will not be byte for byte what 1.40.1 writes: a real GMT export of each
  format, with audio, is the check.

**R6c. Existing frames: overwrite, continue or cancel.** His words, 2026-10-11: "rather than a
checkbox, if it detects existing frames, it should come up with options to overwrite, continue,
cancel. this can be for all the renders".
- The "Resume" box of R6a goes (`engine/plugins/RenderDialog/ConfigForm.tsx`, `deps.resume`). After
  the folder is picked, and only if frames of this render are already in it, the dialog asks:
  **Overwrite** (render every frame, replacing), **Continue** (render only the missing ones),
  **Cancel**. `engine/export/frameFolder.ts` already answers "is this frame there" and reads a
  frame's size; where the frames there are another size, Continue is not offered and the dialog
  says why.
- The name "Resume" stays what it is in GMT: continuing a run that was interrupted, in the same
  dialog (Interrupt, then Resume / Finish / Discard). The two are different things.
- **The deep zoomer first**: its runner already skips what is there.
- **Then GMT's image sequences** ("for all the renders"). GMT's popup is this same dialog with
  GMT's runner, and its worker already writes PNG and JPG sequences into a picked folder. The
  builder's read-only note, `debug/scratch/r6/gmt-render-notes.md`, lists what Continue takes
  there: one name per frame across runs (today `prepareExport()` raises the version in the file
  name on every run, so nothing is ever "already there"); the skip in `runFramePump`; every file
  of a frame present (alpha, depth, the JPG passes); the counts; and frames that do not depend on
  the frame before (the focus lock reads the previous frame's measured distance, and modulation
  is carried from frame to frame). First job: read those in the code and tell him in a few lines
  what Continue would mean for a GMT render that uses the focus lock or audio; then build what is
  safe. GMT's export is live: its own tests and a real export by hand before the commit.

**R6c as built, 2026-10-11** (`e99e82ef`; the R6b builder carried on: 195 thousand tokens more,
33 minutes; 7 files, +357 / -96). By the builder on the real GPU: a scratch run of the real app
(`debug/scratch/r6c/frames-question.mts`, 30 lines), the shell smoke 55 of 55, `smoke:fluid-toy`,
`smoke:chrome`, the other-apps check again, the build. By the orchestrator: typecheck, three node
tests, the diff of the dialog and the sink, the screenshot. Three deliberate breaks: two in
`lookForFrames` (they back its `@invariant`), one in the dialog (an open question not answered
when the dialog goes: the route stayed held for good).

What is there:
- A render into a folder that already holds frames of this render asks: **Overwrite** (every
  frame, each file replaced as its frame is written), **Continue** (the missing ones only),
  **Cancel** (nothing; back on the form). A fresh folder asks nothing, a video asks nothing.
- Continue is not offered, and the question says why, when the frames there have another long
  edge, more than one size, or are all there.
- The "Resume" box and `deps.resume` are gone. The dialog has a generic question for any runner:
  `status.ask({ lines, options, cancel })` (`engine/plugins/RenderDialog/QuestionView.tsx`); the
  sink has `lookForFrames` (`engine/export/frameFolder.ts`).

To know:
- Frames are recognised by file name only (project name and frame number). Nothing says they
  were made with this route, look or sample count.
- An Overwrite stopped halfway leaves new and old frames side by side; the result says how many
  old ones remain, and the next run can then only offer Overwrite or Cancel.
- Not exercised: a real folder on a real disk and the browser's real picker, how long looking
  through thousands of frames takes, the keyboard (no Esc or Enter on the question).

**GMT's image sequences: read and measured, NOT built** (nothing under `engine-gmt/` or `app-gmt/`
changed; the measuring script is `debug/scratch/r6c/gmt-sequence-names.mts`, git-ignored). His
words were "this can be for all the renders"; GMT's export is live, and three things below are
his to decide before it is built.

- **The premise of R6a's note was wrong: GMT does not raise the version on every run.**
  `prepareExport` (grep it in `store/engineStore.ts`) raises it only when the scene differs from
  what it was at the last export, load or save. Measured: a fresh scene rendered twice with
  nothing touched is `v1` both times, the same three file names, and **GMT replaced the files
  without asking**. A change of field of view made the next run `v2`.
- **So "the frames of this render" in GMT** are the files under the name the run is about to use:
  project, content version, size, the range's frame numbers, one file a pass. They exist only when
  the scene is as it was when the earlier run started.
- **The focus lock breaks that.** A run with the lock writes the focus distance into the scene,
  so the scene has changed when it ends: measured, a locked run was `v3` and the same run again,
  nothing touched, `v4`. A cancelled focus-locked render would not find its own frames.
- **Not in the name and not in the version**: samples a frame, internal scale, which passes, the
  depth range (they live in the dialog). Frames "of this render" by name can be a 4-sample test.
- **Would a continued frame be the frame the first run would have made?**
  - Any render: the same picture with another throw of the grain. The random seed counts samples
    since the run started (grep `internalFrameCounter` in `WorkerExporter.ts`); a run that starts
    at frame K counts from 0. Read, not measured.
  - Focus lock: frame N is focused on the distance measured in frame N-1. A continued run's first
    frame has no frame before it and takes whatever focus the scene holds: in the same session,
    untouched, the distance the cancelled run last locked (measured: it stayed 2.3236); after a
    reload or a scrub, the focus of another view, off without bound. From the next frame on the
    lock has caught up to within its 1 % dead band.
  - Modulation: plain LFOs are a function of the frame's time and continue exactly. An LFO with
    Smoothing, and a rule's attack / decay, carry a filter from frame to frame: the frames after
    the join are off for the filter's memory (about 3 frames at smoothing 0.5, about 50 at 0.9).
    A Noise LFO is seeded once a page load: after a reload it is another curve. Read.
  - Audio: an image sequence carries no sound. Audio-reactive rules read the LIVE analyser during
    an export, not the clip at the frame's time, so an audio-driven value in an export is not
    determined by the scene and two full runs already differ. Read, not measured; it looks like a
    gap in the export itself, worth its own check.
- **Every file a frame makes** (measured names; base = `<project>_v<version>_<W>x<H>`): PNG beauty
  `<base>_<frame>.png`; PNG beauty + alpha the SAME name (RGBA); alpha alone `<base>_alpha_<frame>.png`;
  depth `<base>_depth_<frame>.png`; JPG one file a pass, `<base>_<pass>_<frame>.jpg`. "This frame
  is there" has to find every file the ticked passes make, none of them empty (a file is created
  first and gets its bytes when its stream closes, and a failed write is only reported).
- **The smallest change** is all in `runImageSequenceExport` (it holds the folder, the base name,
  the passes and the range before the worker starts): look with the worker's own naming rule, ask
  with `deps.status.ask` (it reaches GMT's runner unchanged), return on Cancel, today's path on
  Overwrite, a skip in `runFramePump` on Continue.
- **His calls before it is built**:
  1. A scene rendered again unchanged is replaced silently today. With the question he is asked
     first: one more click for "render it again, better". Wanted?
  2. Continue keeps frames made with other samples, scale or passes beside the new ones, and the
     question cannot know. Say so in its words, or withhold Continue when the dialog's settings
     differ from the last run's?
  3. The focus lock moves the version, so a locked render could never be continued. Leave the
     locked focus out of the scene's content while the lock is on, or look for the newest
     version's frames in the folder?
  And `prepareExport()` runs before the question would: a Cancel then leaves a version number
  with no files.
- **What a real export must show before it ships**: the same range once in one run and once as
  cancel + Continue, every file there once and none empty, the frames either side of the join
  compared (plain, focus lock, a smoothed LFO); the cancelled run's last frame complete or absent
  for every pass; the version holding still across cancel and Continue with keyed tracks; how
  long looking takes in a folder of thousands of files; PNG and JPG, and a step above 1.
- Found in passing: a beauty-only PNG run and a beauty + alpha run of the same scene write the
  same file name with different content.

### R7. Cleanup

**Rewritten 2026-10-11 after the owner was told what goes and what leans on it.** Two read-only
surveys stand behind this section and are the builders' reading: `debug/scratch/r7/march-survey.md`
(every march path in `core.js`, what leans on what, the shell's controls, the tests) and
`debug/scratch/r7/ray-march-intent.md` (what the ray march notes said should go, lean by lean,
with quotes). The stage's earlier text is in `git log -p`.

His words, 2026-10-11:
- On the first proposal, which removed controls and kept the page's program: "i was hoping for a
  more thorough removal of uneccesarry parts - and am wondering if the remaining lean on the pages
  march was supposed to be minimized beyond this."
- "Normals: Gradient - was superseded by the raymarch too".
- "If the ray shader fails to build on a machine, that machine is likely gonna die trying to render
  the mandelbulb at high zoom - so I wouldnt want an alternative based on that, rather an error."
- To the four calls put to him: the Mandelbox, "add to the plan for a math session to incorporate
  the mandelbox if possible" (`NEXT.md` session 8); parity retired and the direct proof kept, "yes";
  a building notice with no deep picture, "no, only if the pages march is retired and we start in
  the ray shader immediately"; the page's depth rule for iterations dropped if one measurement
  shows the margin rule holds alone, "yes".

**The end state he approved.**
- **One bulb program: the ray march.** The plain variant (`P`), the skip-table variants and the J
  variants are never compiled. The ray shader's build starts at once when the page opens, and
  readiness is that program. Until it is there the chip says it is building; nothing else draws a
  deep picture. A failed build is an error, not another march.
- **Out of `core.js`**: the J variant (`USE_JAC`, Normals: Gradient with it), the skip table (BLA),
  the CPU twin of the page's march (`pertMarchJS`, `api.marchPop`), the module's path code
  (recorder, spline, play, ZIP), the 160 cap on the bulb's iterations under the ray march
  (`api.setIters`, `dz.setView`: it cut a route's iteration keys).
- **Out of the shell**: True-gradient march, Normals: Gradient, the BLA setting, the Ray march
  switch, Step size for the bulb, the seven host path members.
- **Stays, by decision**: the page's ESTIMATE inside the ray program (the hit test, the bisection,
  hit refine, the probes: measured 1.0 % wrong against 4.4 %); `pullGradJS` (the navigation's own
  CPU gradient); the Mandelbox on its own program with the page's step rule, Step size shown for it
  alone, until the math session says whether it can take a ray step.
- **Parity is retired** (it proved the module equal to the frozen page, whose march is gone). The
  direct proof stays: the kernel's GPU values against the CPU's high-precision ones. It finds its
  hits with a careful page-style march, which runs inside the ray shader as a measuring mode
  (grep `bit 8 (a measuring mode)` in `core.js`). This supersedes ADR-0135's first decision: the
  ADR is drafted, not filed, while he is away.
- **The page's depth rule for iterations** (32 + 1.35 a decade) goes for the bulb if one
  measurement shows the ray march's margin rule holds alone; else it stays and he gets the numbers.

**How it is built**, a commit a step, so each can be taken back:
1. **R7a, with parity still standing as the net.** The J variant out of `core.js` and the shell;
   the shell's BLA setting gone and the skip table neither compiled nor built while the ray march
   is in force; the dead host members and the module's path code out, keeping what parity reads
   (`api.samplePath`, `api.stopPlay`, the telemetry keys). Proof: parity 52 of 52 and the direct
   proof untouched, the ray march's pictures the same before and after.
2. **R7b, the page's program retired.** The ray shader first and only; the error on a failed
   build; BLA's code and the CPU twin out; Step size for the Mandelbox only; the Ray march switch
   gone; the 160 cap lifted; the depth rule measured; the direct proof moved onto the measuring
   mode; parity's script and its frozen-page plumbing retired; the smoke steps and node checks
   that named the old controls rewritten. Proof: the ray march's and the Mandelbox's pictures the
   same before and after, the direct proof, the shell smoke; the first wait measured.
3. **R7c, the retest of the frames that do not repeat** (R6a's note has every number). One
   measurement: render the same grainy frame every two seconds from start-up and note when the
   picture changes. One change that never comes back points at something that settles once; bring
   him the result, not a second idea.
4. **R7d, the small things.** Export filenames say "mandelbulb" whatever the formula; the floating
   Animate button sits over the bottom of a long keyframe list; help text, JSDoc on the new files,
   the rule rows, the context map last.

A fault in the renderer met on the way goes to him after one measurement: the step it was met in
stops there, uncommitted or reverted, and the next one that does not depend on it goes on.

**R7a as built, 2026-10-11** (`e41890c4`; one builder: 891 thousand tokens, 54 minutes; 17 files,
+374 / -1,129; `core.js` 5,719 -> 5,335 lines). By the builder on the real GPU: parity 52 of 52
and the direct proof with neither script changed, the pictures, the shell smoke 54 of 54 (stage 2
has 12 steps now), the build. By the orchestrator: typecheck, eight node checks, the shader
compare, parity and the direct proof run again. One deliberate break (Normals index 4 handed
through: 2 lines of the param-map check red).

- **Gone**: the J variant from `core.js` and the shell (True-gradient march, Normals: Gradient);
  the shell's BLA setting; the seven host path members; the module's recorder, spline, play and
  ZIP code. The skip table is neither compiled nor built while the ray march is in force.
- **Kept for parity until R7b**: `api.samplePath`, an empty `api.stopPlay`, the three telemetry
  keys, the BLA code itself.
- **The proof that nothing drawn moved**: the GLSL of all 13 kept programs is token for token
  what the commit before compiles (`debug/scratch/r7/shader-diff.mjs`, git-ignored, takes a
  commit); and 41 pictures of the ray march, the Mandelbox and the shell
  (`debug/scratch/r7/pictures.mts`, each page 75 s past ready) against three shoots of the
  untouched tree: 40 the same to the byte, 1 within the floor (2 pixels by a level).
- **A scene saved with the retired settings loads**: True-gradient and BLA are ignored, Normals:
  Gradient comes back as 4-tap (a preset field, `dzRetiredNormals`).
- **Measured on the way**: with the skip-table shader no longer compiling in the background, the
  ray shader arrived 32.8 s after page open against 40.5 to 43.2 s (one run against three).
- **For R7c, found and not looked into**: the Mandelbox through the SHELL does not repeat between
  sessions on the untouched tree (three shoots, three pictures: 0.24 to 0.60 % of pixels, up to
  29 levels), 80 s or more after page open. Through the harness the same place repeats to the
  byte, and the bulb's shell pictures repeat.

**R7b-1 as built, 2026-10-11** (`f9f01e1a`; the R7a builder carried on: 784 thousand tokens more,
89 minutes; 35 files, +836 / -1,426; `core.js` 5,335 -> 4,966 lines). By the builder on the real
GPU: the shader compare, the pictures, the direct proof before and after, the first wait, the
bench, a failed build driven in the app, the shell smoke 54 of 54, the build. By the orchestrator:
typecheck, ten node checks, the shader compare, the direct proof, the whole smoke and the build
again. Three deliberate breaks seen red: the ray bits at 0 (smoke stage 2, 8 lines), Step size
shown for the bulb (2 lines), the kernel's estimate 0.5 -> 0.4 (the direct proof: 0 of 11 depths).

- **The bulb has one program.** The ray shader is built from the moment the module is created and
  is what `ready` means. `P`, `PB`, `PT`, `PBT` are never compiled; the skip table is gone from
  the shader and the CPU, with `pertMarchJS`, `api.marchPop`, `api.stopPlay` and four telemetry
  keys (16 -> 12). `DEEP_FRAG` is compiled from two places: the ray march's and the Mandelbox's.
- **`api.setRayMarch` stays as a tool's handle.** Bits 0 no longer selects another program: it
  leaves nothing of the ray march in force inside the one program (the page's step rule, no jet,
  the page's iteration rules). The direct proof holds bits 0 for its whole run and switches to
  bit 8 only around each careful march, so its iteration counts are the counts it always used.
- **The proofs.** `PR`, `PTR`, `X`, `XT` compile what `e41890c4` compiles less four unused
  uniform declarations; the f32 baselines and the shade and guide passes the same text. The direct
  proof's 79 output lines are the same before and after but the one naming the path. Pictures
  against the tree before the retirement: 37 the same, 3 within the floor, 1 outside it (below).
  The bench: the ray march wrong on 1.73 %, 1.85 % and 0.75 % of rays at the three kept places
  (recorded: 1.7, 1.7, 0.7).
- **The first wait** (dev server, cold shader cache, three runs each, seconds from page open):
  before, ready and the first deep picture at 13.1 (the page's march), the ray march's at 33.2;
  after, ready and the first deep picture at 20.3, the ray march's. On the dev server the splash
  "Loading Deep Zoom..." covers that whole build and the page stands still under it: React's double
  mount in dev (inferred; with one mount, on the harness page, the renderer is up at 0.8 s and
  draws 56 frames a second while the program builds). The production build is measured in R7b-2.
- **Shell**: no Ray march switch; Step size is the Mandelbox's row (`condition: BOX_ONLY`);
  `KeptPlace.march` is gone. A scene with `rayMarch: false`, a bulb step size, `bla` and
  `trueGradient` loads and ignores them.
- **Parity** is gone (the script, the npm line). What cited it in source is an `@assumption` or is
  re-pointed at the direct proof. What nothing holds now: the module's create / dispose lifecycle,
  its own key listener under a host-owned input, "roll 0 is the picture from before the roll".
- **The ADR is drafted, not filed**: `plans/deep-zoom-shell/ADR-DRAFT-one-bulb-program.md`, with
  the update block for ADR-0135 and every rule and ADR line that now cites something gone.

**R7b-2 as built, 2026-10-11** (`63411aa8`; the same builder: 917 thousand tokens more, 29
minutes; 17 files, +180 / -157). By the builder: the gates below, the production first wait, the
depth-rule measurement. By the orchestrator: typecheck, six node checks, the shader compare, the
direct proof, the whole smoke, the two screenshots. Two deliberate breaks seen red.

- **A ray shader that cannot be built is the boot failure**: the card "The deep renderer did not
  start / The ray march's shader could not be built on this machine, so the deep picture cannot
  be drawn." with the compiler's words and Reload (`debug/scratch/r7/ray-fail.png`). R7b-1 had
  left the app up with a chip and a toast while no control moved anything; his words were "rather
  an error". The orchestrator's choice between the two: say if the half-alive app was wanted.
- **The 160 cap is lifted**: `api.setIters` and `api.dz.setView` hold a count under `itersMax()`:
  400 under the ray march, 500 on the Mandelbox, 160 with ray bits 0. A route's keyed count above
  160 arrives whole (`route.ts`: the `@assumption` is an `@invariant` now, proven by three new
  lines of `check:deep-zoom-ray-probe`). Decided by the builder: the store's ceiling for the bulb
  went to 400 with it (the Iterations slider, the [ and ] keys). One number, if he wants 160 back.
- **The page's depth rule for iterations STAYS: the margin rule does not hold alone.** One
  measurement (`debug/scratch/r7/depth-rule.mts`; each view loaded afresh, the count started at
  4, the picture once settled, 640 x 360, of 230,400 pixels):

  | View | Depth | Power | Both rules | Margin alone | Pixels differing | Largest |
  |---|---|---|---|---|---|---|
  | flight 0.10 | 6.2e-7 | 8 | 41 | 36 | 1 | 1 |
  | flight 0.50 | 3.9e-23 | 8 | 63 | 37 | 2,218 | 53 |
  | flight 0.75 | 1.3e-31 | 8 | 74 | 46 | 1,515 | 53 |
  | flight 0.95 | 3.6e-35 | 8 | 79 | 68 | 7 | 39 |
  | place Power 2, 5e-20 | 5.1e-20 | 2 | 95 | 95 | 0 | 0 |
  | place Power 2, 1.6e-19 | 1.6e-19 | 2 | 86 | 86 | 0 | 0 |
  | place Slicing, 2.8e-39 | 2.8e-39 | 8 | 85 | 68 | 282 | 52 |
  | starter Whole bulb | 1.9e+0 | 8 | 32 | 13 | 9,143 | 105 |
  | starter Past f64 | 2.0e-3 | 8 | 36 | 13 | 8,224 | 50 |
  | starter Grain of sand | 1.1e-17 | 8 | 55 | 36 | 1,457 | 50 |
  | starter Certified edge | 6.6e-35 | 8 | 79 | 68 | 6,234 | 50 |
  | starter Near the floor | 3.4e-76 | 4 | 160 | 164 | 2 | 1 |

  It holds at power 2 and power 4 and not at power 8, where the depth rule is what sets the
  count. Why power 8 needs more than the margin gives was not looked into. Nothing was changed;
  the numbers are in a comment at the rule in `core.js`.
- **The first wait in the production build** (cold shader cache, nine runs, `dist/` served to the
  page by the script, `debug/scratch/r7/prod-first-wait.mts`): the plain picture at 0.8 to 0.9 s,
  the splash gone at 1.3 to 1.4 s, ready and the first deep picture at 21 to 26 s. The page is
  alive throughout (57 to 61 frames a second) with "ray march: building" and "deep shader
  compiling" on screen. No fix was needed. The dev server's standstill under React's double
  mount was there before the retirement too (the page's own 13 s build).
- **To see** (`debug/scratch/r7/prod-wait-10s.png`): what a visitor looks at for those 21 to 26
  seconds on a first visit is the plain single-precision picture, which at the start view is
  coarse speckle. Not touched. A later visit has the shader cached.

For R7c, found and not looked into: **one shell frame did not match** (the power-2 place at
5e-20: 298 of 230,400 pixels, 292 of them by a level, all in the frame's last row of tiles; a
second run gave the same bytes). One measurement, as his rule allows: in one further session the
same tree drew that frame six times; five were the picture from before the retirement, to the
byte, and the one taken after 30 s of live picture was a third picture (1,207 pixels, up to 34
levels). So the tree still draws the old picture, and that frame does not repeat in the shell.
The same place through the harness repeats.

**R7c, the retest of the frames that do not repeat, 2026-10-11** (one agent: 410 thousand tokens
with R7d; a measurement, no code; `debug/scratch/r7c/retest.mts` and a table a session beside it).
Headless Chrome on the real GPU; a cold session has a fresh browser profile; a render every 2.0 s
for 150 s from the moment the renderer is ready, set up as the runner sets a frame up.

- **The grainy frame** (R6a's: frame 8 of its route, 1280 x 1000, 2 samples): **no change that
  settles once.** The usual picture is the same, byte for byte, in all seven sessions, and it is
  what 374 of 380 renders drew. What is left is a single odd render that is gone at the next:
  in 5 of 7 sessions the SECOND render, 2.0 s after ready, was another picture (cold: 48 to 386
  thousand of 1.28 million pixels, up to 157 levels, a different picture each session; warm: 82
  pixels, the same picture in both warm sessions); one warm session had two more, at exactly 60
  and 120 s. The first render was never the odd one. The earlier pattern, frames differing 15 to
  24 s after ready, did not show: all 25 renders in that window were the usual picture.
- **The kept place Power 2, 5e-20** (640 x 360, 4 samples): the usual picture in 208 of 213
  renders, the same in all three sessions and the one from before the retirement. Five single
  odd renders (114 to 1,206 of 230,400 pixels), each gone at the next. One came straight after 30
  s of live picture, but a session with the live picture held throughout had two, so the pause
  is not needed for one.
- **The Mandelbox, Arches**: the usual picture in 150 of 152 renders, the same in both sessions.
  The two odd ones were the first two renders of the warm session, 0.6 and 2.6 s after the box's
  shader was built, and never returned. "Three pictures in three sessions, 80 s after open"
  (R7a's finding) did not show again.
- **Read with every render**: nothing building, the mode deep, the iteration count and the view
  the same before and after, for the odd renders too.
- So, in his terms: not something that settles once. An occasional single render comes out
  otherwise and the next one is right again, most often the second render after ready. For a
  route render that means a frame or two in a run can be an odd one; rendering that frame again
  gives the usual picture. No cause was looked for.

**R7d, the small things, 2026-10-11** (`a6d7a2e5`).
- A still's file name says `mandelbox_s<scale>` on the Mandelbox where it said `mandelbulb_n<power>`
  for every formula. No other file name in the shell names a formula.
- The Route tab keeps room under its list while the timeline is closed: the last keyframe ends
  13 px above the Animate button, where it sat 35 px under it.
- Help: nothing added. The app has no list of keys or help topics yet (that is `NEXT.md`
  session 4); K's description in `deep-zoom/hotkeys.ts` is true and nothing shows it.
- Left: keyframes cut from a trail still show a number and no thumbnail (a picture needs the
  camera put on each keyframe); the Locations tab's foot sits under the same button when its
  list is long; `deep-zoom/hotkeys.ts` still speaks of a Flight tab.

Not in this stage:
- The Mandelbox's ray step (the math session, `NEXT.md` session 8).
- Normal taps from the hit's checkpoints, and the pole-axis crawl of the picture's march (`NEXT.md`
  session 7): new work, not cleanup.
- The prototype app and its frozen page copy (`deep-zoom-prototype/`, `public/deep-zoom-prototype-core/`):
  `NEXT.md` session 5 deletes them.
- Left on an exponential track in plain values, if he wants them: Smooth, Bounce, Simplify, a
  Continue tail (`engine/animation/logTrackRegistry.ts`, the `@assumption` block).

## What goes from the old plan

`camera.u` as the route; the store field `dzPath` and the document `deep-zoom.path`; the port of
`deep-zoom-prototype/ui/RecordPanel.tsx` as a whole (918 lines tied to prototype-only state; its curve
drawing, length parsing, estimate and ffmpeg line are worth lifting); module package M4's
`seekPath(path, u, ease)`; the ZIP stopgap; DECISIONS D4, D5 and D15.

## Traps found by reading (2026-10-10)

- `pathApplyCR` writes iterations, power and phase into the renderer on every seek and restarts the
  still each call. The new route does not use it.
- The feature setter has no equality gate: the evaluator compares before it pushes.
- A Bezier can overshoot its two keys: clamp the leg's progress.
- The timeline's length is not undoable (`snapshot()` holds the sequence only) and there is no
  "rescale the keys" action; `setFps(x, 'match')` is the only retimer.
- The shortcut dispatcher picks the winning binding first and tests its `when` afterwards, with no
  fall-through: a failing `when` swallows the key.
- `loadPreset` order: feature setters, then the sequence, then preset fields (the saved view,
  `dzView`), then the duration, then documents.
- A share string carries the sequence by default (`utils/Sharing.ts`, `includeAnimations`), and
  `deep-zoom/share.ts` calls `getShareString()` with no options (read 2026-10-10). So a link WOULD
  carry the route; R3 passes `includeAnimations: false` (answer 7: a link carries the view only).
- The Mandelbox has no ray march and no skip table, and in a render its distance scale falls back to
  a stale value (grep `renderFrameToBlob`).
- `api.dz.diveTo` overshoots; the shell's `host/dive.ts` does not and rides `step`.
- The clip check and the trail cut both need rays; they cost up to 10.5 ms a frame at the deepest
  starter when looking round (ADR-0134), so neither runs every frame.

## Answered by the owner, 2026-10-10

His words: "1-3 yes / 4 returns to route / 5-7 yes / 8 - to use improve gmt's rendering with this
option would be ideal. / 9. yes good fixes. / all good to go ahead". He answered a list of nine in
chat; the same calls are numbered here as the stages cite them.

1. **Places**: yes. Light, colour, gradient, detail and march settings all go; camera and formula
   stay. This reverses "a saved place carries its gradient" (K10, 2026-10-09).
2. **Dropping a keyframe**: yes. `K` adds a keyframe after the last one; parked on a keyframe, it
   replaces that one.
3. **The default pace**: yes, 0.5 decades per second, for a new leg and for Even pace.
4. **While a route plays**: a fly key stops playback and you fly on from there, and the mouse turns
   the view on top of the route. An unrecorded turn "returns to route" when playback stops.
5. **One route a scene** for now: yes. A new one replaces it, with undo.
6. **Iterations**: yes. Each keyframe records the count in effect as an ordinary key, and the
   automatic rule is off while a route plays.
7. **A share link carries the view and not the route**: stated to him as assumed; no objection.
8. **Rendering**: "to use improve gmt's rendering with this option would be ideal." PNG frames to a
   folder, the resume and the preview video are built as options of the shared render dialog, so
   GMT's own rendering gains them; no dialog private to this app. The ZIP route is dropped.
   (Refined on 2026-10-11, below: no preview feature, and the resume box becomes a question.)
9. **Two engine fixes GMT will feel**: "yes good fixes" - the frame rate saved in a scene, and the
   timeline's length made undoable.
10. **The timeline shows** one Depth track plus three Look tracks, not GMT's six: yes.
11. **Names on screen**: Trail, Route, Keyframe, and the tab is "Route": stated to him as assumed; no
    objection. Likewise no horizon lock.

## Answered by the owner, 2026-10-11

After flying the overnight build: "this is working great!".

- Everything the "As built" notes list as decided without him: "I'm happy with all your other
  choices".
- The render's picture: "users would only like to see each hires image, either while converging, or
  when completed converging" (fixed the same morning, `8de5616f`).
- His rules for building, and the second dev server: at the top of this file.
- Free look while a route plays: "optional for the user, compulsory for us". So R5 gets built.
- A preview video is not a feature: "yep thats right" to it being the same dialog at a small size
  and one sample.
- The frames that do not repeat: "i havent noticed an issue during operation, but we can retest it
  after the previous gen shaders are retired, that should be part of cleanup".
- Existing frames: "rather than a checkbox, if it detects existing frames, it should come up with
  options to overwrite, continue, cancel. this can be for all the renders".
- mediabunny: "we might want to check for a recent ver or whatever is best".
