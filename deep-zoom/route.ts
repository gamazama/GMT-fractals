/**
 * deep-zoom/route.ts - the route: the camera move on the timeline, made of keyframes set as you dive.
 *
 * WORDS
 *   A ROUTE is the camera move on the timeline. A KEYFRAME is one exact view on it. A LEG is the
 *   stretch between two keyframes. One route a scene. ("Flight" and "dive" mean other things in
 *   this app: a hand-flown undo step, and the Dive-to-depth action.) A FREE LOOK is a turn of the
 *   view on top of the route while it plays: route first, the camera second. A PASS is one
 *   recording of a free look.
 *
 * WHAT A KEYFRAME IS
 *   One key on the track `camera.depth` (`ROUTE_TRACK`; the param is declared in
 *   `deep-zoom/features/camera.ts`). Its VALUE is the depth there - what is looked at, the nearest
 *   surface when nothing is (`deep-zoom/depthNow.ts`) - which the timeline draws and eases in log
 *   space. Its PAYLOAD (`RoutePayload`) is the camera and nothing else: the three 256-bit position
 *   strings, yaw, pitch, the roll when there is one, and the HEADING - the direction it was
 *   travelling when it was set. Never iterations, power, phase, light or colour.
 *   Setting a keyframe also writes an ordinary key on `dzFormula.iterations` at the same frame,
 *   with the iteration count in force.
 *
 * THE SEAM
 *   - `installRoute()` once, from main.tsx, before anything can load a sequence: it registers the
 *     track as a payload track and a log track, as the timeline's camera track (held while the
 *     camera is recorded) with the free look's three beside it (let go then), hands Key Cam its
 *     capture function, and registers one post-scrub hook and two listeners on the timeline's
 *     Play and Record flags.
 *   - IN: `setKeyframe()` (the K key, "Add keyframe") and `setKeyframe(frame)` (the timeline's Key
 *     Cam). From the navigation (`deep-zoom/DeepZoomNavigation.tsx`): `noteMove` / `noteTurn` (the
 *     hands moved or turned the camera: it is theirs), `stopRoutePlayback` (a hand TAKES the
 *     controls) and `lookTurned` (a turn while the route plays: a free look, which takes nothing).
 *     `diveBegan` from a dive (`deep-zoom/diveControl.ts`). From the Route tab: `pauseRoute`,
 *     `clearLook`, `deleteKeyframes` (one keyframe or the rows selected), `setLegSeconds` (a row's
 *     seconds field: the length of the leg that arrives at it), `reverseRoute` (Reverse: a new
 *     route that plays this one backwards, its keys mirrored in time) and `clearRoute` (all of it).
 *   - THE OTHER WAY TO MAKE A ROUTE is to cut it from the trail (`deep-zoom/trail.ts`: what the app
 *     remembers of how the camera was flown). `routeFromTrail()` replaces the route with one whose
 *     keyframes are the trail's own samples; `setRouteSmoothing()` cuts it again from the same
 *     trail, more or fewer keyframes; `retimeRoute()` moves key times only. This file is told of
 *     every move, turn and set view, and passes each on to the trail.
 *   - OUT: the post-scrub hook hands the host ONE `setView` for a scrubbed frame, and only when the
 *     view differs from the last one it set - a parked playhead leaves the still to gather. The
 *     path between keyframes is the engine's (`engine/animation/zoomPath.ts`), with time in frames
 *     and the scale read off the depth track as the engine eases it. `drive()` is the one place a
 *     frame's view is put together (`routeShownAt`: the route's view, the free look on top). A
 *     free look's own turn, between two frames of the timeline, is a `host.setOrientation`.
 *   - The Route tab is `deep-zoom/components/RoutePanel.tsx`; it reads `useRoute` and the
 *     animation store.
 *   - RENDERING the route is `deep-zoom/routeRender.tsx`: it puts the camera on each frame with
 *     `scrubRouteTo` and, for as long as it runs, holds this file still with `setRouteRendering`
 *     (no keyframe is set, replaced or deleted, no route is cut or timed again, nothing plays).
 *   - Saving: the sequence travels in a scene file with its payloads (the engine's doing). A share
 *     link carries no route (`deep-zoom/share.ts`).
 *
 * WHO HOLDS THE CAMERA
 *   The route DRIVES from the moment the hook sets a view until somebody else moves the camera:
 *   a navigation move or turn, a dive, or a `setView` that is not the hook's own (a jump, an undo,
 *   a loaded scene). While it drives, the renderer's own iteration rule is held off
 *   (`holdAutoIterations`), so a played, a scrubbed and a rendered frame have one count, and the
 *   depth toasts are silent (`deep-zoom/milestones.ts`). It never takes the camera back by
 *   itself: a scrub of the SAME frame (what the timeline does after an edit) sets nothing while
 *   the user holds the camera. A scrub to another frame, Play, a row of the Route tab and
 *   "Return" do take it. A FREE LOOK DOES NOT TAKE THE CAMERA: the route goes on driving under it.
 *
 * FREE LOOK (the owner, 2026-10-11: "route first - the camera second ... we can playback the route
 * and record/view a rotation offset ontop of it")
 *   - WHAT IS SHOWN at a frame is the route's rotation there TIMES THE LOOK, in the camera's own
 *     frame; the position is the route's, always. The look is three plain numbers in radians: PAN
 *     about the camera's up, then TILT about the right it has after the pan, then ROLL about the
 *     view axis it has after both - the order `toQuaternion` builds an orientation in
 *     (`lookQuaternion`). They are the tracks `camera.lookPan`, `camera.lookTilt`,
 *     `camera.lookRoll` (`LOOK_TRACKS`), read off the tracks with `evaluateTrack`, never off the
 *     store. WITH NO LOOK NOTHING CHANGES: the route's view goes to the host as it is, to the digit.
 *   - THE HAND, while a route plays: a Fly-mode look drag, the look stick and Q / E turn the view on
 *     top of the route and the tracks, and playback goes on (`lookTurned`: offset = inverse(route's
 *     rotation x the tracks' look) x the turned orientation). No undo step, no flight, and the
 *     route still drives. A fly key that travels, the wheel and anything in Orbit mode still stop
 *     playback and hand over the camera (`stopRoutePlayback`), as they always did.
 *   - WHEN PLAYBACK STOPS. A hand took the controls: the camera stays as it is on screen, turn
 *     included, and is the user's. Any other way (Pause, the route's end, a leg's end): the
 *     hand's turn is dropped and the view goes back to the route with what is recorded, one
 *     `setView`. Nothing eases it back.
 *   - RECORDED. With the timeline's Record on and its camera recording enabled (the flags GMT's
 *     own camera recording tests), a PASS begins at the hand's first turn while the route plays
 *     and ends when playback stops or Record goes off. From its first turn the tracks are not read
 *     (the hand holds the look, starting from the tracks' look where it began); every frame shown
 *     is a plain key on each of the three tracks, over whatever the played span held; angles are
 *     kept continuous from frame to frame (`lookAngles`). The whole pass is ONE animation-undo
 *     step. When it ends the span is thinned with the engine's fitter (`fitSamplesToKeys`) to
 *     `LOOK_FIT_TOLERANCE`, a tenth of a degree a track. With Record on and nothing turned,
 *     nothing is written and the recorded look plays on as it is. The route's own track is held
 *     throughout (`releaseOnRecord: false`): its keys and payloads are never touched by a pass.
 *   - A KEYFRAME SET UNDER A RECORDED LOOK holds the rotation that shows the view on screen with
 *     the look on top (`underLook`): what you see is what you key. K and Key Cam write no look key.
 *   - A RENDER gets the recorded look with no code of its own: it sets each frame with
 *     `scrubRouteTo`, which is `drive()`.
 *
 * PITFALLS
 *   - CAMERA STRINGS never pass through `Number()`. The path's arithmetic is bigint; the strings
 *     of a keyframe are handed back as they were stored.
 *   - AT A KEYFRAME'S OWN FRAME THE VIEW IS THE STORED ONE, not the path's: the path ends exactly
 *     on a leg's DEEPER keyframe only (its shallower end is right to 16 digits of its own scale),
 *     and an orientation read back through a quaternion moves in its last bit.
 *   - `host.setView` also writes iterations, power, phase, light and colour. The hook hands back
 *     the renderer's own values for all of them (`host.getView()`), after `flushHostSync()` has
 *     sent whatever the timeline wrote this frame; the iteration count alone is taken from its
 *     track, because the renderer raises that one by itself and the sync does not re-send a value
 *     it thinks is there.
 *   - NO ITERATION KEYS, NO HOLD: with the iterations track empty the renderer's own rule stays as
 *     the store has it and the count is left alone.
 *   - THE ITERATION KEYS ARE ORDINARY KEYS, AND EACH STAYS WITH ITS KEYFRAME. When a keyframe is
 *     moved in time or deleted on the timeline, the iteration key on its frame is moved or deleted
 *     too, in the same undo step (`installRoute`: grep `follows`). Only an edit of the depth track
 *     ALONE is followed: an undo, a loaded scene, a drag of both keys together and this file's
 *     own writes change both tracks at once and are left as they are.
 *   - THE HEADING IS THE DIRECTION OF TRAVEL, NOT THE LAST MOVE: from where the camera was a
 *     quarter of the present depth of travel ago to where it is, read off the trail
 *     (`trailHeadingNow`). Until 2026-10-11 it was the last move's direction, whatever its size: a
 *     tap of S before a keyframe gave it a heading that pointed back the way it came, and the path
 *     hooked past it. With the trail switched off, or nothing flown since the last `setView`, it
 *     comes from the moves themselves, each counted in depths and fading with the travel since
 *     (`drift`): a tap back of a twentieth of the depth does not turn it, a retreat of a whole depth
 *     does. A `setView` clears it (the hook's own included: a keyframe set where the route itself
 *     put the camera has none, and the path then enters it along the mean of its two legs). A
 *     keyframe that takes a new view (K on it, its row's button, Key Cam on it) keeps the heading
 *     it had: the nudge that framed it is not the way the route goes.
 *   - WHAT A CUT ROUTE CAME FROM IS SESSION MEMORY (`made`, by key id): the smoothing slider and
 *     "As flown" need the trail. After a reload, or for a route from a scene file, every keyframe
 *     counts as set by hand. A REVERSED route runs its trail backwards, and `routeSource` hands
 *     back the trail reversed for it: read off the order of the keyframes' samples each time, so
 *     a reverse writes nothing into `made` and an undo of one needs nothing either.
 *   - HANDLES. A keyframe's handles on the depth curve are the timeline's own (auto) until somebody
 *     shapes them. While they are, they are worked out again when the keyframe takes a new view
 *     (it is written as a new key: its id changes) and when a neighbour is deleted - here
 *     (`deleteKeyframes`) or on the timeline (`installRoute`: grep `healHandles`); left as they
 *     were, a much deeper view makes the depth dip and rise on the way. Shaped handles are never
 *     touched here.
 *   - A DELETE MOVES NO KEYFRAME IN TIME. The leg that swallowed the deleted ones is as long as
 *     they were together, and it runs straight from the one keyframe to the other: what the
 *     deleted keyframes led the camera round, it may now pass through. The solid check says so in
 *     the list; the leg's length is its row's seconds field. Measured 2026-10-12 in the app, five
 *     keyframes half way round the bulb, the middle three deleted: one leg of 125 frames where K
 *     would time 81, 0.25 to 0.44 decades a second, 0.61 from the bulb's centre, shown in red.
 *   - `host.thumbnail` restarts the still. It is called when a keyframe is set, and once for each
 *     keyframe that was not set from the screen (PICTURES below). Never on a timer that goes on.
 *   - PICTURES OF KEYFRAMES NOT SET FROM THE SCREEN (`takeOwedPictures`). A keyframe set with K is
 *     pictured from the screen. A keyframe cut from the trail was never on screen as a keyframe,
 *     and neither was one that ARRIVED: with a loaded scene (File > Load Scene, a dropped file), a
 *     restored session, an undo. So a moment after the cut, or after the route's track changed, or
 *     when the renderer becomes ready, the camera is put on each in turn and its picture taken, a
 *     task at a time (`PICTURE_TASK_MS`), until none is owed; then nothing runs. A KEYFRAME IS
 *     TRIED ONCE (`asked`): one whose picture cannot be drawn keeps its number, and is not tried
 *     again when the track next changes. WITHIN ONE TASK the camera goes
 *     to a keyframe, the renderer is stepped BY HAND (`host.step`: its picture of a view needs
 *     the reference orbit and the depth of that view, which only a frame works out - with no
 *     frame run the picture is of the place the camera came from, seen 2026-10-12), the picture
 *     is taken, and the camera is put back on the very view it had with a frame of it run. So
 *     the user's camera is never anywhere else when a task ends, no frame of a keyframe reaches
 *     the screen, and the route, the trail and the navigation are told of none of it
 *     (`picturing`). The count is the one keyed at the keyframe, the renderer's own rule held off
 *     for the task: the rule only raises, and a picture taken from a deeper place came out with
 *     that place's count (42 for a keyframe keyed at 32).
 *     WHAT IT COSTS: the still starts again once the last picture is taken, as it does after K,
 *     and the page is slow while it runs (a keyframe is two frames of the renderer's work and a
 *     96-pixel one; what was measured is in the PICTURES @assumption below). It waits while the
 *     timeline plays, the hands fly, a dive flies or a route renders, and while a formula's
 *     shader is still building (a loaded scene may bring another formula: until its shader is
 *     there the renderer draws the plain picture). A route cut again from the same trail (the
 *     smoothing) keeps the pictures of the samples it had (`pictured`).
 *     A SCENE THAT IS BEING APPLIED IS NEVER PICTURED HALF WAY: the scene's keyframes arrive in
 *     the middle of the load, before its view, and all that happens then is that they are noted
 *     as owed; the pictures are a later task. Before a renderer is ready nothing is owed at all
 *     (the list is dropped): they are asked for again when it is, which is after the scene's
 *     parked view has been applied.
 *   - The solid check asks the renderer for one reference orbit a sample (milliseconds at depth):
 *     it runs a moment after a keyframe changes, a leg a task, never per frame, and it waits while
 *     the hands fly or the timeline plays (a cut route has up to 300 legs). It reads the
 *     formula as the renderer has it THEN: a change of power or phase does not run it again.
 *   - A SAMPLE IS WHAT WAS SHOWN. The timeline's tick (`engine.animation`, registered at boot)
 *     runs before the navigation's (`deepZoom.navigate`, registered when the picture mounts), so
 *     the picture of frame f is drawn with the turn the navigation made AFTER `drive(f)`. A pass
 *     therefore samples a frame when the NEXT one is driven, or the pass ends. Measured in the app
 *     2026-10-11, a look turning at 36 degrees a second: sampled inside `drive(f)` itself the
 *     recording played back 1.0 degree behind what had been on screen; sampled a frame later, 0.02.
 *     If the order of those two ticks ever changes, this is a frame early instead.
 *   - A PASS'S FIRST KEY is the tracks' own value at the whole frame before its first turn: a key
 *     that changes nothing, there so that the frames before the pass keep what they had (an empty
 *     track would otherwise hold the first turned value back to frame 0). A turn made with the
 *     playhead standing on frame 0 is recorded from frame 1.
 *   - PAST ITS LAST KEY A LOOK TRACK HOLDS ITS VALUE: a pass that ends turned leaves the rest of
 *     the route turned by as much. Before its first key it holds the first.
 *   - THE THINNING moves the span by less than `LOOK_FIT_TOLERANCE` a track, so a recorded pass
 *     comes back a hair from what was on screen when it ends (seen: 0.02 degrees). The two keys
 *     beside the span keep frame and value; the handle each turns to the span is healed
 *     (`spliceSpan`), which is what keeps the curve from folding there.
 *   - WITHIN 4.5e-4 RADIANS OF STRAIGHT UP OR DOWN the three angles of a look are not one
 *     continuous triple (the same band as in deep-zoom/orbitCamera.ts): a look tilted a quarter
 *     turn off the route can jump there by the roll it carries. `lookAngles` keeps the two
 *     branches and the whole turns continuous everywhere else.
 *   - A LOOK DRAG STILL HELD WHEN THE ROUTE ENDS turns the camera from the route's end on, as any
 *     look drag does when nothing plays: it takes the camera then.
 *   - A ROUTE CUT FROM THE TRAIL leaves a recorded look where it is: the look tracks are their own.
 *
 * @invariant K adds a keyframe after the last one, a leg's on-screen length at `ROUTE_PACE` decades
 *   a second later, also with the playhead ON the last one; with the playhead on an earlier
 *   keyframe that keyframe takes the view and keeps its time; Key Cam at a frame between two puts
 *   one in between. A payload holds the camera and its heading, nothing else, and survives JSON
 *   exactly. The hook hands the
 *   host each keyframe's stored view at its frame, one `setView` for a frame whose view changed
 *   and none for one that did not, holds the first and the last, sends the values the sync was
 *   holding BEFORE the view, and leaves a camera the user took where it is when the same frame is
 *   scrubbed again. With no trail to read and no depth known, the heading is the last move; it is
 *   cleared by a jump, and stays with a keyframe that takes a new view. A leg is asked at
 *   `ROUTE_SOLID_SAMPLES` points with the count keyed there. A leg played from its row stops on its
 *   keyframe - proven by: npm run check:deep-zoom-route (the "set: ...", "leg: ...",
 *   "payload: ...", "drive: ...", "heading: ...", "solid: ...", "play: ..." lines). Falsified
 *   2026-10-11: see the check's header.
 * @invariant A route cut from the trail is one undo step, its keyframes are trail samples to the
 *   digit, each with its iteration key, and every sample lies within the smoothing of the route as
 *   `routeViewAt` plays it; the smoothing cuts it again from the same trail; "Even pace" and "As
 *   flown" move key times only; an iteration key follows its keyframe when that is moved or deleted
 *   on the timeline, and is left alone by an undo - proven by: npm run check:deep-zoom-trail (the
 *   "route: ...", "exact: ...", "smooth: ...", "time: ...", "follow: ..." lines). Falsified
 *   2026-10-11: see that check's header.
 * @invariant While the route is rendered (`setRouteRendering(true)`) K and a row's replace set
 *   nothing and leave no undo step, and `scrubRouteTo` still puts the camera on the route -
 *   proven by: npm run check:deep-zoom-route (the "render: ..." lines). Falsified 2026-10-11: the
 *   test taken out of `write` -> 3 red.
 * @assumption The same hold on `deleteKeyframe`, on Play and a leg's play, on a route cut from the
 *   trail, on the smoothing and on the two timings: each is one `routeRendering()` test. The check
 *   has a line for the delete and one for a leg's play; none was taken out on its own.
 * @invariant The view shown is the route's rotation at the frame times the look IN THE CAMERA'S OWN
 *   FRAME (the hand's turn while it plays, the tracks' when scrubbed, a keyframe set under them),
 *   at the route's own position - proven by: npm run check:deep-zoom-route ("look: a turn while the
 *   route plays is shown at once ...", "look: 200 frames on, the view is the route's rotation THERE
 *   times the same turn ...", "look: a scrub shows the route with the recorded turn on top ...",
 *   "look: scrubbed away and back, that keyframe shows what was on screen ..."). Falsified
 *   2026-10-11: the look multiplied on the other side in `routeShownAt` -> 5 red.
 * @invariant When playback stops and no hand took the camera, the hand's unrecorded turn is gone
 *   and the view is the route's again, to the digit, in one `setView`; and that is when a recorded
 *   pass is thinned - proven by: npm run check:deep-zoom-route ("look: playback stops with no hand
 *   on the camera ...", "look: a recorded pass writes keys on the three tracks, thinned when it
 *   ends ..."). Falsified 2026-10-11: the listener on `isPlaying` emptied -> 3 red.
 * @invariant A hand that takes the controls while a free look is on screen stops playback and the
 *   camera keeps its turn exactly, with no `setView`, and is the user's - proven by: npm run
 *   check:deep-zoom-route ("look: a fly key during playback stops it and the camera keeps its turn
 *   ..."). Falsified 2026-10-11: `takeCamera()` out of `stopRoutePlayback` -> 1 red.
 * @assumption The rest of FREE LOOK has a green line in the same check and was NOT falsified (three
 *   breaks were the stage's allowance): with no look, and with look keys that turn nothing, the
 *   stored view goes out to the digit; Record on and no turn writes nothing; a pass is one undo
 *   step, plays back within `LOOK_FIT_TOLERANCE` a track with a pan past half a turn, and leaves
 *   the route's keys, payloads and iteration keys alone; a second pass replaces the keys of its
 *   span only; Key Cam writes no look key; a keyframe set under a look holds the rotation worked
 *   out by hand; K in the middle of a free look keys what is on screen; Record coming on over a
 *   turn already in the hand begins the pass with it, and the whole frames a slow display skips
 *   are filled in; Record going off ends the pass and the timeline plays on; Clear is one undo
 *   step. NO LINE OPENS a timeline that loops in the middle of a pass, or a look carried over
 *   the pole.
 * @assumption The navigation's side of a free look - which inputs are a move and which a look, the
 *   fly step run with the moves taken out, the roll's ease dropped when playback stops - is wiring
 *   no node check reaches. Driven in the app on 2026-10-11 (debug/scratch/r5/app-look.mts: a look
 *   drag and Q while a route plays, Pause, W, a recorded pass, a scene saved and loaded, Clear).
 * @invariant Clear route is ONE animation-undo step: every keyframe, each one's iteration key and
 *   the recorded free look go in it - proven by: npm run check:deep-zoom-route ("clear: Clear
 *   route takes every keyframe and its iteration key in ONE undo step ...", "clear: a recorded free
 *   look goes with the route, in the same step ..."). Falsified 2026-10-12: a second `snapshot()`
 *   in `clearRoute` -> 3 red (2 steps).
 * @invariant A typed leg moves its keyframe AND every later one by the same number of frames, and
 *   none before it - proven by: npm run check:deep-zoom-route ("seconds: a leg given five seconds
 *   ...", "seconds: the least is one frame"). Falsified 2026-10-12: `setLegSeconds` moving the
 *   leg's own keyframe only -> 3 red (frames 0, 40, 190, 208: the fourth swallowed).
 * @invariant Several keyframes deleted together are ONE animation-undo step - proven by: npm run
 *   check:deep-zoom-route ("delete: three keyframes deleted together are ONE undo step ...").
 *   Falsified 2026-10-12: a `snapshot()` a keyframe in `deleteKeyframes` -> that line red (3 steps).
 * @assumption A keyframe deleted ON THE TIMELINE leaves the route a fresh route of the keyframes
 *   left would be, its neighbours' handles worked out again (`healHandles`, from the follower in
 *   `installRoute`). The check has a line for it ("delete: ... deleted ON THE TIMELINE: the same
 *   route again ..."), written after the fix and never red itself. The SAME COMPARISON was red
 *   before the fix existed, 2026-10-12, run as a scratch on the tree at a20c5405
 *   (debug/scratch/route-fixes/delete-measure.mts, git-ignored): 252, 403 and 414 of 417 half
 *   frames differed from the fresh route, the depth curve by up to 0.048 decades; after it, 0.
 * @assumption The other "delete:", "clear:" and "seconds:" lines are green and were NOT falsified
 *   (three breaks were the stage's allowance): a keyframe deleted in the Route tab leaves the
 *   route a fresh one would be, to the digit (it did before this stage too: measured first); the
 *   keyframes that stay keep their times; after Clear the camera is the user's with no view set
 *   and the iteration rule handed back; each step undone brings back what it took; a typed leg
 *   changes time only and the timeline grows; none of the three acts while a route renders.
 * @invariant Reverse (`reverseRoute`) is ONE animation-undo step and makes the route that plays the
 *   old one backwards: frame f at first + last - f, each keyframe with its id and its view to the
 *   digit, its heading negated; at every mirrored frame the camera within 1e-9 of the depth of
 *   where it was, and the depth curve (shaped handles, Linear legs), the count and a recorded look
 *   as they were; reversed twice it is the route to the digit - proven by: npm run
 *   check:deep-zoom-route (the "reverse: ..." lines). Falsified 2026-10-16: the headings left as
 *   they were -> 3 red (the keyframes line; the camera 2.9 depths from where it was between two
 *   keyframes, 2.1 at the playhead); each key keeping its own interpolation in
 *   `AnimationMath.mirrorKeyframes` -> 3 red (the depth curve 0.034 decades off, the camera 0.10 of
 *   the depth).
 * @assumption The ORIENTATION between two keyframes is not quite the same played backwards: the
 *   curve (`zoomPathOrientation`) turns about each keyframe's own frame, which is not symmetric in
 *   time. 9.9e-4 rad at worst on the check's route, which turns up to 0.4 rad a leg (its line
 *   allows 2e-3); the zoom-out study measured up to 0.3 degrees on a route that turns 19 times
 *   (plans/deep-zoom-shell/ZOOM-OUTS.md). So a playhead between two keyframes may see the picture
 *   turn by that much when the route is reversed; on a keyframe it does not move at all.
 * @invariant A route cut from the trail and reversed still knows it came from the trail: the
 *   trail reversed (`routeSource`). "As flown" times each leg as it was flown, the other way
 *   round; the smoothing cuts again from the trail reversed, and turned back to the smoothing it
 *   had gives the reversed route again; reversed again, it reads the very trail it was cut from -
 *   proven by: npm run check:deep-zoom-trail (the "reverse: ..." lines of its second half).
 *   Falsified 2026-10-16: `routeSource` never turning the trail round -> 4 red there ("As flown"
 *   stayed green: off the trail forwards with the samples descending, each leg is the same size).
 * @assumption PICTURES: every keyframe of a cut route gets the picture of its own view at its
 *   keyed count, the camera is put back to the digit, the trail, the heading and the undo stack
 *   are not touched, and a route cut again draws only its new samples - green lines in
 *   check:deep-zoom-trail ("picture: ..."), none falsified, against a fake renderer whose
 *   "frame" is a counter. IN THE REAL APP, once, 2026-10-12 (headless Chrome on the GPU, a 1440 x
 *   900 window, the live frame 288 x 320; debug/scratch/route-fixes/app-six.mts, git-ignored): a
 *   route of 11 keyframes down to 1e-8 had every picture 1.1 s after the click (a quarter second
 *   of waiting, then 79 ms a keyframe: about 1.0 s for 10), one of 3 round the bulb after 0.33 s;
 *   the camera was the same view object for object afterwards, and at every animation frame in
 *   between; the still went from 64 samples to 0 and was at 64 again 1.2 to 1.4 s later. A
 *   keyframe costs two live frames and one 96-pixel draw: on a larger frame, more.
 * @invariant Keyframes that ARRIVE with no picture (a loaded scene's: `setSequence`) are owed one
 *   from the moment the route's track changes, and get it from the same pass, the camera and the
 *   undo stack left as they were - proven by: npm run check:deep-zoom-trail ("picture: a route that
 *   arrives with a loaded scene is owed its pictures ...", "picture: then each of its keyframes
 *   gets its picture ...", "picture: and the camera is the very view it was ..."). Falsified
 *   2026-10-12: the `owePictures` listener on the route's track taken out of `installRoute` -> 4
 *   red (0 owed, 5 of 5 without a picture).
 * @assumption The rest of that: nothing is taken while a formula's shader builds, a keyframe is
 *   tried once also when its picture cannot be drawn, and what has a picture by now stops the
 *   wait - green lines in the same check, none broken on its own. That a route which was there
 *   BEFORE the renderer (a restored session) is asked for at `ready` has no node line: the checks'
 *   renderer is ready from the start. IN THE REAL APP, once, 2026-10-12 (headless Chrome on the
 *   GPU, 1440 x 900; debug/scratch/small-three/app-loaded-pictures.mts, git-ignored), a scene of
 *   five keyframes from the start view down to 1e-8: picked in File > Load Scene in a fresh page,
 *   all five pictures 0.68 s after the file was picked, the camera the scene's view to the digit,
 *   no step on either undo stack beyond the load's own, the still whole again 1.3 s later and no
 *   view set after that; restored with a session, the keyframes were there 0.22 s into the page,
 *   the renderer ready at 0.36 s and the five pictures at 0.90 s, none before ready. WHERE A
 *   FRAME IS DEAR IT IS SLOW: the same five keyed along a dive from the boot view (it grazes the
 *   bulb; a frame there is 0.2 to 0.8 s) took 8.0 s, the page stalling a second or two at a time.
 * @invariant A keyed count arrives whole up to the renderer's ceiling for the formula in force: 400
 *   on the Mandelbulb (the ray march's own, `RAY_ITER_MAX`), 500 on the Mandelbox - `api.dz.setView`
 *   and `api.setIters` hold a count under `itersMax()` and nothing lower - proven by: npm run
 *   check:deep-zoom-ray-probe ("iterations: under the ray march a view's count and a set count
 *   arrive whole up to 400 ..."). Falsified 2026-10-11: the 160 put back in `setView`'s line of
 *   core.js -> that line red ("300,400,160,160,4"). The check lifts the lines as text; what a route
 *   then plays in the app was seen once (debug/scratch/r7/iters-cap.mts, git-ignored).
 *   (Until 2026-10-11 both held the Mandelbulb at 160, the page's ceiling, while the ray march's
 *   rule reached 400: a power-2 route deeper than about 1e-38 played with too few iterations.)
 */
import * as THREE from 'three';
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import type { ScrubContext } from '../engine/AnimationEngine';
import { AnimationMath } from '../engine/math/AnimationMath';
import { registerPayloadTrack } from '../engine/animation/payloadTrackRegistry';
import { isLogTrack, registerLogTrack } from '../engine/animation/logTrackRegistry';
import { registerCameraKeyTracks, setCameraKeyCaptureFn } from '../engine/animation/cameraKeyRegistry';
import { buildZoomPath, zoomLegOnScreen, zoomPathOrientation, zoomPathPosition } from '../engine/animation/zoomPath';
import type { TurnKey, ZoomKey, ZoomPath } from '../engine/animation/zoomPath';
import { showToast } from '../engine/store/toastStore';
import { fitSamplesToKeys, spliceSpan } from '../utils/CurveFitting';
import type { BezierHandle, Keyframe, Track } from '../types';
import { getHost, subscribeHost } from './host/current';
import type { DeepZoomHost, DzOrientation } from './host/DeepZoomHost';
import { readDepth } from './depthNow';
import { validDepth } from './components/depthFormat';
import { isFlying, useDzNavigation } from './navigationState';
import { toOrientation, toQuaternion } from './orbitCamera';
import type { V3 } from './orbitCamera';
import {
    FIXED_UNIT, TRAIL_HEADING_TRAVEL, cutDetours, depthCurve, evenFrames, followTrail, pickKeyframes, previousTrail, reverseTrail,
    trailDirections, trailFrames, trailHeadingNow, trailToHere, trailTurned, trailViewSet,
} from './trail';
import type { RouteTiming, TrailSample } from './trail';
import { autoIterationsHeld, flushHostSync, holdAutoIterations } from './useHostSync';

/** The route's track: one key a keyframe. */
export const ROUTE_TRACK = 'camera.depth';
/** Where the iteration count of each keyframe is keyed. */
export const ROUTE_ITERATIONS_TRACK = 'dzFormula.iterations';
/** The pace a new leg is timed at, in decades a second. */
export const ROUTE_PACE = 0.5;
/** A leg set with K is never shorter than this; no leg is longer than `ROUTE_MAX_LEG_SECONDS` (two
 *  keyframes at depth that are far apart measure an absurd length on screen). */
export const ROUTE_MIN_LEG_SECONDS = 0.2;
export const ROUTE_MAX_LEG_SECONDS = 180;
/** Fixed-point steps in one world unit: the camera's 256 fractional bits. */
export const ROUTE_UNIT = FIXED_UNIT;
/** How many points of a leg are asked "is this inside the solid". */
export const ROUTE_SOLID_SAMPLES = 9;
/** The smoothing a route is cut from a trail with: how far a flown view may lie from the route,
 *  in depths at that view. "Follow closely" to "smooth glide". */
export const ROUTE_SMOOTHING = { min: 0.01, max: 0.5, initial: 0.05 } as const;
/** A route cut from a trail has no more keyframes than this. */
export const ROUTE_TRAIL_KEYS = 300;
/** The free look's three tracks, in radians: pan, tilt, roll (FREE LOOK in the header). The params
 *  are declared in `deep-zoom/features/camera.ts`, where the rule for these ids is. */
export const LOOK_TRACKS = ['camera.lookPan', 'camera.lookTilt', 'camera.lookRoll'] as const;
const LOOK_LABELS = ['Look pan', 'Look tilt', 'Look roll'] as const;
/** How far a recorded free look may lie from what the hand turned, on each of its three tracks,
 *  once the pass is thinned: a tenth of a degree. A feel number: the owner's to set. */
export const LOOK_FIT_TOLERANCE = Math.PI / 1800;

const THUMBNAIL_PX = 96;
/** How long one task goes on taking the pictures a cut route is owed, before the page gets a turn (PICTURES in the header). */
const PICTURE_TASK_MS = 30;
/** No more pictures than this are kept (the oldest go): a route cut again and again would hold megabytes. */
const PICTURES_KEPT = 1200;
/** A typed leg is no longer than this (`setLegSeconds`): an hour. */
export const ROUTE_TYPED_LEG_SECONDS = 3600;
const SOLID_CHECK_DELAY_MS = 250;
/** How often a depth reading is asked on while its rays are unfinished (as a dive does at take-off). */
const DEPTH_ASKS = 16;

/** The camera of a keyframe. `cam` is three 256-bit fixed-point decimal STRINGS. */
export interface RouteView {
    cam: [string, string, string];
    yaw: number;
    pitch: number;
    /** Left out when it is 0. */
    roll?: number;
}

/** What a key of the route carries (`Keyframe.payload`): the camera, and which way it was going. */
export interface RoutePayload {
    view: RouteView;
    /** A unit vector in the renderer's world axes. Absent: nothing had moved since the last jump. */
    heading?: V3;
}

/** A keyframe as the route reads it off the track. */
export interface RouteKey {
    id: string;
    frame: number;
    depth: number;
    view: RouteView;
    heading?: V3;
}

interface RouteUi {
    /** Bumped when the camera changes hands, so a reader can ask `cameraOnRoute()` again. */
    rev: number;
    /** A picture of each keyframe, by key id: taken when it was set, or a moment after the route was
     *  cut from the trail (PICTURES in the header). This session only. */
    thumbnails: Record<string, string>;
    /** By key id: the leg that ARRIVES at this keyframe passes through the solid. */
    solid: Record<string, boolean>;
    /** The route is being rendered (`deep-zoom/routeRender.tsx`). */
    rendering: boolean;
}
export const useRoute = create<RouteUi>()(() => ({ rev: 0, thumbnails: {}, solid: {}, rendering: false }));
const bump = (): void => useRoute.setState((s) => ({ rev: s.rev + 1 }));

/**
 * A render of the route starts or ends. WHILE ONE RUNS NOTHING HERE CHANGES THE ROUTE OR PLAYS IT:
 * setting, replacing and deleting a keyframe (K and Key Cam included), a route cut from the trail,
 * the smoothing, the two timings, Play and a leg's play all do nothing. `scrubRouteTo` still
 * works: it is what the render itself sets each frame with.
 */
export function setRouteRendering(on: boolean): void {
    if (useRoute.getState().rendering !== on) useRoute.setState({ rendering: on });
}
export const routeRendering = (): boolean => useRoute.getState().rendering;

// ── reading the route off the timeline ───────────────────────────────────────────────────────────

const anim = () => useAnimationStore.getState();

function isPayload(p: unknown): p is RoutePayload {
    const v = (p as RoutePayload | null | undefined)?.view;
    return !!v && Array.isArray(v.cam) && v.cam.length === 3 && v.cam.every((c) => typeof c === 'string' && /^-?\d+$/.test(c))
        && Number.isFinite(v.yaw) && Number.isFinite(v.pitch);
}

interface Built {
    depth: Track | undefined;
    iters: Track | undefined;
    keys: RouteKey[];
    path: ZoomPath | null;
    turns: TurnKey[];
}
let built: Built | null = null;
const scratch = new THREE.Quaternion();

/** The route as it stands, rebuilt only when one of its two tracks is another object. */
function route(): Built {
    const tracks = anim().sequence.tracks;
    const depth = tracks[ROUTE_TRACK], iters = tracks[ROUTE_ITERATIONS_TRACK];
    if (built && built.depth === depth && built.iters === iters) return built;
    const keys: RouteKey[] = [];
    for (const k of depth?.keyframes ?? []) {
        // A key nothing here wrote (no camera in it), one with no depth, or a second one at a frame, is not a keyframe.
        if (!isPayload(k.payload) || !validDepth(k.value) || (keys.length > 0 && k.frame <= keys[keys.length - 1].frame)) continue;
        keys.push({ id: k.id, frame: k.frame, depth: k.value, view: k.payload.view, ...(k.payload.heading ? { heading: k.payload.heading } : {}) });
    }
    const zoomKeys: ZoomKey[] = keys.map(zoomKey);
    const turns: TurnKey[] = keys.map((k) => {
        const q = toQuaternion({ yaw: k.view.yaw, pitch: k.view.pitch, roll: k.view.roll ?? 0 }, scratch);
        return { time: k.frame, orientation: [q.x, q.y, q.z, q.w] };
    });
    const path = depth && keys.length > 0
        ? buildZoomPath(zoomKeys, { unit: ROUTE_UNIT, scaleAt: (frame) => animationEngine.evaluateTrack(depth, frame) })
        : null;
    built = { depth, iters, keys, path, turns };
    return built;
}

function zoomKey(k: { frame: number; depth: number; view: RouteView; heading?: V3 }): ZoomKey {
    return { time: k.frame, scale: k.depth, position: [BigInt(k.view.cam[0]), BigInt(k.view.cam[1]), BigInt(k.view.cam[2])], heading: k.heading };
}

/** The route's keyframes, in time order. */
export function routeKeys(): readonly RouteKey[] {
    return route().keys;
}

/** The iteration count keyed for `frame`, or 0 when no count is keyed. */
function itersAt(r: Built, frame: number): number {
    return r.iters && r.iters.keyframes.length > 0 ? Math.max(0, Math.trunc(animationEngine.evaluateTrack(r.iters, frame))) : 0;
}

/**
 * The camera the route gives at `frame`: at a keyframe's own frame its stored view, to the digit;
 * before the first and after the last keyframe, that keyframe's. Null when there is no keyframe.
 * Nothing is set.
 */
export function routeViewAt(frame: number): RouteView | null {
    const r = route(), keys = r.keys, last = keys.length - 1;
    if (last < 0 || !r.path) return null;
    if (frame <= keys[0].frame) return keys[0].view;
    if (frame >= keys[last].frame) return keys[last].view;
    let i = 0, hi = last;                                            // the leg [keys[i], keys[i + 1]] that holds `frame`
    while (hi - i > 1) { const mid = (i + hi) >> 1; if (keys[mid].frame <= frame) i = mid; else hi = mid; }
    if (frame === keys[i].frame) return keys[i].view;
    const p = zoomPathPosition(r.path, frame), q = zoomPathOrientation(r.turns, frame);
    const o = toOrientation(scratch.set(q[0], q[1], q[2], q[3]), keys[i].view.yaw);
    return { cam: [String(p[0]), String(p[1]), String(p[2])], yaw: o.yaw, pitch: o.pitch, ...(o.roll ? { roll: o.roll } : {}) };
}

/**
 * How fast the picture moves at `frame`, in decades a second: the camera's speed over its depth
 * (what `ROUTE_PACE` is a number of). 0 outside the keyframes and with fewer than two.
 */
export function routePaceAt(frame: number, fps: number): number {
    const r = route();
    if (!r.path || !r.depth || r.keys.length < 2 || !(fps > 0)) return 0;
    const a = zoomPathPosition(r.path, frame), b = zoomPathPosition(r.path, frame + 0.5);
    const moved = Math.hypot(Number(b[0] - a[0]), Number(b[1] - a[1]), Number(b[2] - a[2])) / ROUTE_UNIT;
    const depth = animationEngine.evaluateTrack(r.depth, frame + 0.25);
    return moved > 0 && depth > 0 ? (moved / depth) * (fps / 0.5) / Math.LN10 : 0;
}

/** A new leg's length in frames: its length on screen at `ROUTE_PACE` decades a second. */
export function legFrames(from: RouteKey, to: { depth: number; view: RouteView }, fps: number): number {
    const onScreen = zoomLegOnScreen(zoomKey(from), zoomKey({ frame: from.frame + 1, ...to }), ROUTE_UNIT);
    const seconds = Number.isFinite(onScreen) ? onScreen / Math.LN10 / ROUTE_PACE : 0;
    return Math.max(1, Math.round(Math.min(ROUTE_MAX_LEG_SECONDS, Math.max(ROUTE_MIN_LEG_SECONDS, seconds)) * fps));
}

// ── who holds the camera ─────────────────────────────────────────────────────────────────────────

/** The last view the hook handed the host, with the iteration count it carried (0: none keyed). */
type SetView = RouteView & { iters: number };
let lastSet: SetView | null = null;
let lastFrame = NaN;
/** The route drives: `lastSet` is still what the camera shows. */
let driving = false;
/** True while the hook's own `setView` runs: the `viewSet` it raises is not somebody else's. */
let own = false;
/** The next scrub sets the camera whoever holds it (a row, Return, Play). */
let forced = false;
/** The moves since the last `setView`, each in depths, the older fading with the travel since:
 *  the heading when the trail cannot say (PITFALLS: THE HEADING). */
let drift: V3 | null = null;
/** How many `setView`s there have been (a dive that one of them ended leaves no heading). */
let jumps = 0;
/** Dives in flight (`diveBegan` to its end). */
let diving = 0;
/** True while the pictures of a cut route are taken (`takeOwedPictures`): the views set then are
 *  nobody's move - the camera is back where it stood, to the digit, before the task ends. */
let picturing = false;

const sameCamera = (a: RouteView, b: RouteView): boolean =>
    a.cam[0] === b.cam[0] && a.cam[1] === b.cam[1] && a.cam[2] === b.cam[2]
    && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);

/** Somebody else moves the camera from here on (the navigation turned it, a dive took off, a jump).
 *  A free look is forgotten: what the camera shows is theirs as it stands. */
export function takeCamera(): void {
    settleLook();
    if (!driving) return;
    driving = false;
    holdAutoIterations(false);
    bump();
}

/** The route is driving the camera: the last view came from the timeline and nobody has moved it since. */
export const routeDrives = (): boolean => driving;
/** The hook's own `setView` is running, or a picture's (for a `viewSet` listener that must tell it from a jump). */
export const routeSetsView = (): boolean => own || picturing;
/** The timeline is playing a route. With no keyframe there is no route: the timeline may play
 *  its other tracks while the hands fly, as it always could. */
export const routePlays = (): boolean => anim().isPlaying && route().keys.length > 0;

/** The navigation moved the camera by (dx, dy, dz): the camera is the hands', and the trail follows. */
export function noteMove(dx: number, dy: number, dz: number): void {
    const length = Math.hypot(dx, dy, dz);
    if (length > 0) {
        // In depths, so a move at 1e-40 weighs what one at 1e-3 does. With no depth read yet: the last move alone.
        const depth = useDzNavigation.getState().depth, known = validDepth(depth);
        const keep = drift && known ? Math.exp(-length / (TRAIL_HEADING_TRAVEL * depth)) : 0, per = known ? depth : length;
        drift = [(drift ? drift[0] * keep : 0) + dx / per, (drift ? drift[1] * keep : 0) + dy / per, (drift ? drift[2] * keep : 0) + dz / per];
    }
    takeCamera();
    followTrail();
}

/** The navigation turned the camera: it is the hands', and the trail keeps the latest look at the place it stands at. */
export function noteTurn(): void {
    takeCamera();
    trailTurned();
}

/** The direction of travel at the camera as it stands: read off the trail when it can say, else
 *  from the moves since the last jump. Null: the camera has not moved since. */
export function headingNow(): V3 | null {
    const flown = trailHeadingNow();
    if (flown) return flown;
    const length = drift ? Math.hypot(drift[0], drift[1], drift[2]) : 0;
    return drift && length > 0 ? [drift[0] / length, drift[1] / length, drift[2] / length] : null;
}

/**
 * A hand TAKES the controls (a fly key, an orbit gesture, the wheel, a dive): a timeline that is
 * playing a route stops, and the camera is the user's from where it is. A free look on screen
 * STAYS on screen: the route lets go of the camera there and then, so nothing puts it back.
 */
export function stopRoutePlayback(): void {
    stopAt = null;
    if (!routePlays()) return;
    const looked = settleLook();
    if (looked) takeCamera();
    anim().pause();
    // A recorded pass left its tracks unread while it ran: the timeline's values are brought level.
    // The camera is the user's and the frame counts as the one last shown, so no view is set.
    if (looked) { lastFrame = anim().currentFrame; animationEngine.scrub(lastFrame); }
}

/** Pause (the Route tab's button): the timeline stops and the camera stays the route's. An
 *  unrecorded free look returns to the route (`installRoute`: grep `settleLook() && driving`). */
export function pauseRoute(): void {
    stopAt = null;
    if (routePlays()) anim().pause();
}

/**
 * A dive takes off (`deep-zoom/diveControl.ts`): as for a hand on the controls. Call what it
 * returns when the dive has ended: if it moved the camera and no jump ended it, the view's own
 * direction - what a dive flies along - is the heading.
 */
export function diveBegan(): () => void {
    stopRoutePlayback();
    takeCamera();
    diving++;
    const from = getHost()?.getView().cam, at = jumps;
    return () => {
        diving = Math.max(0, diving - 1);
        const host = getHost();
        if (!host || !from || at !== jumps || host.getView().cam.every((c, i) => c === from[i])) return;
        const look = host.orientation(), across = Math.cos(look.pitch);
        noteMove(across * Math.cos(look.yaw), Math.sin(look.pitch), across * Math.sin(look.yaw));
    };
}

/** True when the camera stands exactly where the route, with the free look recorded there, puts it
 *  at the playhead (or there is no route). */
export function cameraOnRoute(): boolean {
    const host = getHost(), want = routeShownAt(anim().currentFrame);
    return !host || !want || sameCamera(host.getView(), want);
}

// ── free look: a turn on top of the route ────────────────────────────────────────────────────────

type Angles = [number, number, number];

/** The hand's turn on top of the route and the look tracks, while a route plays and nothing
 *  records it. Null: none. Forgotten when playback stops, however it stops. */
let hand: THREE.Quaternion | null = null;

/** A free look being recorded: from the hand's first turn with Record on, to the end of playback
 *  (or of Record). While one runs the look tracks are not read: `q` is the look. */
interface LookPass {
    /** The look on screen: the tracks' look where the pass began, times every turn since. */
    q: THREE.Quaternion;
    /** The whole frame of the first sample, and one sample a whole frame from there, a track. */
    start: number;
    samples: [number[], number[], number[]];
    /** The same samples as the plain keys the timeline shows while the pass runs. */
    live: [Keyframe[], Keyframe[], Keyframe[]];
    /** The frame last sampled and the look there as angles: the next sample is unwrapped against
     *  them, and the whole frames a slow display skipped are filled in from them. */
    at: number;
    angles: Angles;
    /** The frame on screen now. It is sampled when the NEXT one is driven (or the pass ends):
     *  only then has every turn of its own tick arrived (PITFALLS: A SAMPLE IS WHAT WAS SHOWN). */
    shown: number;
    /** The three tracks' keys as they were before the pass wrote any. Null: nothing written yet. */
    old: [Keyframe[], Keyframe[], Keyframe[]] | null;
}
let pass: LookPass | null = null;

const qRoute = new THREE.Quaternion(), qLook = new THREE.Quaternion(), qTurn = new THREE.Quaternion(), lookEuler = new THREE.Euler();
const TURN = 2 * Math.PI;

/**
 * A look (pan, tilt, roll) as a turn in the camera's OWN frame: pan about its up, THEN tilt about
 * the right it has after the pan, THEN roll about the view axis it has after both. That is the
 * order `toQuaternion` (deep-zoom/orbitCamera.ts) builds an orientation in, so on a route that
 * looks level along -Z a look of (pan, tilt, roll) IS the yaw, the pitch and the roll added.
 * Positive pan turns the view to its right, positive tilt up, positive roll as the renderer's.
 */
function lookQuaternion(a: Angles, q: THREE.Quaternion): THREE.Quaternion {
    return q.setFromEuler(lookEuler.set(a[1], -a[0], a[2], 'YXZ'));
}

/**
 * The angles of a look, CONTINUOUS with `near`: of the two triples that are one turn - (pan, tilt,
 * roll) and (pan + pi, pi - tilt, roll + pi) - and their whole turns, the one nearest. So a pass
 * carried over the top does not flip, and a roll past half a turn does not come back the long way.
 */
function lookAngles(q: THREE.Quaternion, near: Angles): Angles {
    lookEuler.setFromQuaternion(q, 'YXZ');
    const by = (v: number, n: number): number => v + TURN * Math.round((n - v) / TURN);
    const a: Angles = [by(-lookEuler.y, near[0]), by(lookEuler.x, near[1]), by(lookEuler.z, near[2])];
    const b: Angles = [by(Math.PI - lookEuler.y, near[0]), by(Math.PI - lookEuler.x, near[1]), by(lookEuler.z + Math.PI, near[2])];
    const off = (c: Angles): number => Math.abs(c[0] - near[0]) + Math.abs(c[1] - near[1]) + Math.abs(c[2] - near[2]);
    return off(a) <= off(b) ? a : b;
}

/** The look tracks hold keys: a free look is recorded. */
export function lookKeyed(): boolean {
    const tracks = anim().sequence.tracks;
    return LOOK_TRACKS.some((id) => (tracks[id]?.keyframes.length ?? 0) > 0);
}

/** The three tracks' values at `frame`. Null when they hold no key, or turn nothing there. Read
 *  off the tracks with no side effect, never off the store. */
function lookAt(frame: number): Angles | null {
    const tracks = anim().sequence.tracks, a: Angles = [0, 0, 0];
    let turned = false;
    LOOK_TRACKS.forEach((id, j) => {
        const track = tracks[id];
        if (!track || track.keyframes.length === 0) return;
        const v = animationEngine.evaluateTrack(track, frame);
        if (Number.isFinite(v) && v !== 0) { a[j] = v; turned = true; }
    });
    return turned ? a : null;
}

/** The look on top of the route at `frame`, written into `q`: a pass's own; else the tracks'
 *  look there times the hand's unrecorded turn. Null: there is none, the route's view stands. */
function lookOver(frame: number, q: THREE.Quaternion): THREE.Quaternion | null {
    if (pass) return q.copy(pass.q);
    const a = lookAt(frame);
    if (!a && !hand) return null;
    if (a) lookQuaternion(a, q); else q.identity();
    return hand ? q.multiply(hand) : q;
}

const routeQuaternion = (v: RouteView, q: THREE.Quaternion): THREE.Quaternion => toQuaternion({ yaw: v.yaw, pitch: v.pitch, roll: v.roll ?? 0 }, q);
const turnedView = (base: RouteView, q: THREE.Quaternion): RouteView => {
    const o = toOrientation(q, base.yaw);
    return { cam: base.cam, yaw: o.yaw, pitch: o.pitch, ...(o.roll ? { roll: o.roll } : {}) };
};

/**
 * The camera SHOWN at `frame`: the route's view there (`routeViewAt`), its rotation times the look
 * in the camera's own frame. The position is the route's, always. With no look it is the route's
 * view as it is, to the digit: nothing is taken through a quaternion. Null when there is no
 * keyframe. Nothing is set.
 */
export function routeShownAt(frame: number): RouteView | null {
    const base = routeViewAt(frame), look = base ? lookOver(frame, qLook) : null;
    return base && look ? turnedView(base, routeQuaternion(base, qRoute).multiply(look)) : base;
}

/** A pass begins at `frame`, the frame on screen: its first sample is the tracks' own look at the
 *  whole frame BEFORE it (a key that changes nothing: the frames before the pass keep what they
 *  had), and the hand's turn starts from the tracks'. */
function beginPass(frame: number): void {
    const start = Math.max(0, Math.ceil(frame) - 1), angles = lookAt(start) ?? [0, 0, 0];
    const q = lookQuaternion(lookAt(frame) ?? [0, 0, 0], new THREE.Quaternion());
    if (hand) q.multiply(hand);
    hand = null;
    const plain = (value: number): Keyframe => ({ id: nanoid(), frame: start, value, interpolation: 'Linear', autoTangent: false, brokenTangents: false });
    pass = { q, start, samples: [[angles[0]], [angles[1]], [angles[2]]], live: [[plain(angles[0])], [plain(angles[1])], [plain(angles[2])]], at: start, angles, shown: frame, old: null };
}

/** The frame that was on screen (`p.shown`) is sampled, its look being `p.q` as it stands: a
 *  sample for every whole frame reached since the last one, written as plain keys over whatever
 *  the tracks held in the played span. */
function samplePass(p: LookPass): void {
    const frame = p.shown, now = lookAngles(p.q, p.angles), from = p.start + p.samples[0].length;
    for (let n = from; n <= frame; n++) {
        const t = (n - p.at) / (frame - p.at);                       // p.at < from <= n <= frame
        for (let j = 0; j < 3; j++) {
            const value = p.angles[j] + (now[j] - p.angles[j]) * t;
            p.samples[j].push(value);
            p.live[j].push({ id: nanoid(), frame: n, value, interpolation: 'Linear', autoTangent: false, brokenTangents: false });
        }
    }
    p.at = Math.max(p.at, frame);
    p.angles = now;
    const end = p.start + p.samples[0].length - 1;
    if (end < from) return;                                          // no whole frame reached
    if (!p.old) {
        anim().snapshot();                                           // the whole pass is this one undo step
        LOOK_TRACKS.forEach((id, j) => ensureTrack(id, LOOK_LABELS[j]));
        const tracks = anim().sequence.tracks;
        p.old = [tracks[LOOK_TRACKS[0]].keyframes, tracks[LOOK_TRACKS[1]].keyframes, tracks[LOOK_TRACKS[2]].keyframes];
    }
    const old = p.old;
    anim().replaceKeyframes(LOOK_TRACKS.map((id, j) =>
        ({ trackId: id, newKeys: [...old[j].filter((k) => k.frame < p.start), ...p.live[j], ...old[j].filter((k) => k.frame > end)] })));
}

/**
 * The pass ends: the span it wrote is thinned with the engine's fitter, to `LOOK_FIT_TOLERANCE` a
 * track; keys outside the span stay (the handle each of its two neighbours turns to the span is
 * healed: `spliceSpan`). No undo step of its own: the pass took one when it first wrote.
 * Returns whether there was a pass.
 */
function endPass(): boolean {
    const p = pass;
    if (!p) return false;
    samplePass(p);                                                   // the frame it ends on
    pass = null;
    if (!p.old) return true;                                         // a turn that reached no whole frame: nothing was written
    const old = p.old, end = p.start + p.samples[0].length - 1;
    anim().replaceKeyframes(LOOK_TRACKS.map((id, j) => {
        const span = fitSamplesToKeys(p.samples[j], p.start, LOOK_FIT_TOLERANCE, nanoid());
        return { trackId: id, newKeys: spliceSpan(old[j], p.start, end, span) ?? [...old[j].filter((k) => k.frame < p.start), ...span, ...old[j].filter((k) => k.frame > end)] };
    }));
    return true;
}

/** No look but the tracks' from here: the hand's unrecorded turn is forgotten, a pass is ended.
 *  Returns whether the camera showed either. */
function settleLook(): boolean {
    const had = hand !== null;
    hand = null;
    return endPass() || had;
}

/**
 * The navigation turned the view while a route plays (a Fly-mode look drag, the look stick, Q / E):
 * `turned` is the orientation its fly step made of the one on screen. The turn goes on top of the
 * route - offset = inverse(route's rotation x the tracks' look) x turned - and playback goes on.
 * With Record on and the camera recorded, this is where a pass begins. The camera shows it at
 * once, as `drive` will compose it at the next frame. Nothing when no route plays and drives.
 */
export function lookTurned(turned: DzOrientation): void {
    const host = getHost(), was = lastSet, base = driving && was && routePlays() ? routeViewAt(lastFrame) : null;
    if (!host || !was || !base) return;
    const recorded = anim().isRecording && anim().recordCamera;
    if (!pass && recorded) beginPass(lastFrame);
    routeQuaternion(base, qRoute);
    if (pass) pass.q.copy(qRoute.invert()).multiply(toQuaternion(turned, qTurn));
    else {
        const a = lookAt(lastFrame);
        if (a) qRoute.multiply(lookQuaternion(a, qLook));
        hand = (hand ?? new THREE.Quaternion()).copy(qRoute.invert()).multiply(toQuaternion(turned, qTurn));
    }
    const shown = routeShownAt(lastFrame);
    if (!shown) return;
    host.setOrientation(shown.yaw, shown.pitch, shown.roll ?? 0);
    lastSet = { ...shown, iters: was.iters };
}

/** Remove the recorded free look: the three tracks. One animation-undo step. */
export function clearLook(): void {
    const tracks = anim().sequence.tracks, ids = LOOK_TRACKS.filter((id) => tracks[id]);
    if (ids.length === 0 || routeRendering()) return;
    settleLook();
    anim().removeTracks(ids);                                        // takes the step itself
    if (driving) animationEngine.scrub(anim().currentFrame);         // the camera is the route's: it follows the edit
    bump();
}

/**
 * What a keyframe at `frame` must hold for the camera to show `view` there with the recorded free
 * look on top: `view`'s rotation times the inverse of the tracks' look. With no look recorded
 * there, `view` itself, untouched.
 */
function underLook(view: RouteView, frame: number): RouteView {
    const a = lookAt(frame);
    return a ? turnedView(view, routeQuaternion(view, qRoute).multiply(lookQuaternion(a, qLook).invert())) : view;
}

/** One scrubbed frame: the view shown there - the route's, the free look on top - handed to the
 *  host if it is a new one. THE one place a frame's view is composed before `host.setView`. */
function drive(frame: number, ctx: ScrubContext): void {
    const host = getHost(), r = route();
    const sameFrame = frame === lastFrame, before = lastFrame;
    lastFrame = frame;
    if (!host || r.keys.length === 0 || !r.path || !host.bootParams()) return;
    // A scrub of the frame the playhead is on is the timeline tidying up after an edit, not a move
    // of the playhead: it follows the edit only while the camera is the route's.
    if (sameFrame && !driving && !forced) return;
    if (!ctx.isPlaying) settleLook();                                // nothing plays: the route and what is recorded
    else {
        // Record went off, or the timeline looped or was put back: that pass is over.
        if (pass && (!ctx.ignoreCamera || frame < pass.shown)) endPass();
        // Record came on over a turn the hand already holds: the pass begins with it, at the frame it was last shown on.
        if (!pass && hand && ctx.ignoreCamera) beginPass(Number.isFinite(before) && before < frame ? before : frame);
        if (pass) { samplePass(pass); pass.shown = frame; }
    }
    const view = routeShownAt(frame);
    if (!view) return;
    flushHostSync();                                                 // what the timeline wrote this frame, before its view
    const next: SetView = { ...view, iters: itersAt(r, frame) };
    if (!forced && lastSet && lastSet.iters === next.iters && sameCamera(lastSet, next)) return;
    const { roll: _roll, ...now } = host.getView();                  // every look value as the renderer has it: nothing else changes
    own = true;
    try {
        host.setView({ ...now, cam: view.cam, yaw: view.yaw, pitch: view.pitch, ...(view.roll ? { roll: view.roll } : {}), iters: next.iters || now.iters });
    } finally {
        own = false;
    }
    lastSet = next;
    holdAutoIterations(next.iters > 0);
    if (!driving) { driving = true; bump(); }
}

/** Where a play started here ends, and the last frame it showed. */
let stopAt: number | null = null;
let played = 0;

function onScrub(ctx: ScrubContext): void {
    if (stopAt !== null) {
        if (!ctx.isPlaying) stopAt = null;                           // stopped by hand: a later Play is the timeline's own
        else if (ctx.frame >= stopAt || ctx.frame < played) {        // the end, or the timeline looped past it
            const end = stopAt;
            stopAt = null;
            settleLook();                                            // before the pause: the scrub below is the one that shows the end
            anim().pause();
            anim().seek(end);
            animationEngine.scrub(end);
            return;
        }
        played = ctx.frame;
    }
    drive(ctx.frame, ctx);
}

/** Put the playhead on `frame` and the camera on the route there, whoever held it. */
export function scrubRouteTo(frame: number): void {
    anim().seek(frame);
    forced = true;
    try { animationEngine.scrub(anim().currentFrame); } finally { forced = false; }
}

/** The camera back on the route at the playhead. */
export function returnToRoute(): void {
    scrubRouteTo(anim().currentFrame);
}

function playSpan(from: number, to: number): void {
    if (routeRendering()) return;
    anim().pause();
    scrubRouteTo(from);
    stopAt = to;
    played = from;
    anim().play();
}

/** Play from the playhead to the last keyframe and stop there; from the first keyframe when the
 *  playhead is already at or past the last. */
export function playRoute(): void {
    const keys = route().keys;
    if (keys.length < 2) return;
    const end = keys[keys.length - 1].frame, at = anim().currentFrame;
    playSpan(at >= end ? keys[0].frame : at, end);
}

/** Play the leg that arrives at this keyframe - from the one before it - and stop. */
export function playLeg(id: string): void {
    const keys = route().keys, i = keys.findIndex((k) => k.id === id);
    if (i > 0) playSpan(keys[i - 1].frame, keys[i].frame);
}

// ── setting, replacing and deleting a keyframe ───────────────────────────────────────────────────

function ensureTrack(id: string, label: string): void {
    // Not `addTrack`: it takes an undo snapshot of its own, and a keyframe is one step.
    useAnimationStore.setState((s) => (s.sequence.tracks[id] ? s
        : { sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [id]: { id, type: 'float', label, keyframes: [] } } } }));
}

/** The view on screen as a keyframe holds it, with the heading `h`; null when no depth can be read here. */
function capture(host: DeepZoomHost, h: V3 | null | undefined): { depth: number; iters: number; payload: RoutePayload } | null {
    // Unfinished rays read the nearest surface instead of what is looked at: ask on, the camera standing still.
    let reading = readDepth(host);
    for (let i = 0; i < DEPTH_ASKS && reading.sense.open > 0 && !reading.sense.inside; i++) reading = readDepth(host);
    if (!validDepth(reading.depth)) return null;
    const v = host.getView();
    return {
        depth: reading.depth,
        iters: v.iters,
        payload: {
            view: { cam: [v.cam[0], v.cam[1], v.cam[2]], yaw: v.yaw, pitch: v.pitch, ...(v.roll ? { roll: v.roll } : {}) },
            ...(h ? { heading: [h[0], h[1], h[2]] } : {}),
        },
    };
}

/**
 * Set a keyframe from the view on screen. One animation-undo step.
 *   no `frame` (the K key, "Add keyframe"): a new keyframe after the last one, a leg's length away
 *     (the first at frame 0); the timeline grows to hold it and the playhead moves to it. With the
 *     playhead parked on an EARLIER keyframe, that keyframe takes this view instead and keeps its
 *     time. (Parked on the LAST one it still adds: that is where setting a keyframe, and playing
 *     the route, leave the playhead, and "K, fly on, K" has to grow the route.)
 *   `frame` (the timeline's Key Cam): at that frame - the keyframe there, the last included, takes
 *     this view, or a new one goes in at it.
 * Returns the keyframe's id, or null when nothing was set.
 */
export function setKeyframe(frame?: number, opts: { skipSnapshot?: boolean } = {}): string | null {
    const keys = route().keys, whole = Math.max(0, Math.round(frame ?? anim().currentFrame));
    const under = keys.find((k) => Math.abs(k.frame - whole) < 0.5);
    const on = frame === undefined && under === keys[keys.length - 1] ? undefined : under;
    return write(on, frame === undefined ? null : whole, opts.skipSnapshot);
}

/** This keyframe takes the view on screen and keeps its time. One animation-undo step. */
export function replaceKeyframe(id: string): void {
    const key = route().keys.find((k) => k.id === id);
    if (key) write(key, key.frame);
}

/** `on`: the keyframe that takes the view. Without one: a new keyframe at `frame`, or (null) after the last. */
function write(on: RouteKey | undefined, frame: number | null, skipSnapshot = false): string | null {
    const host = getHost();
    if (!host || routeRendering()) return null;
    stopAt = null;
    if (anim().isPlaying) {                                          // setting a keyframe is not done to a running timeline
        if (settleLook()) takeCamera();                              // a free look on screen is what is keyed: it stays
        anim().pause();
    }
    const r = route(), keys = r.keys;
    // A keyframe that takes a new VIEW keeps the heading it had: the nudge that framed it is not the way the route goes.
    const shot = capture(host, on ? on.heading : headingNow());
    if (!shot) { showToast('No depth can be read here: no keyframe was set', 'warning'); return null; }
    if (!skipSnapshot) anim().snapshot();

    // A new key goes at `frame`, or a leg after the last one (a leg is measured by positions alone).
    const target = on ? on.frame : frame !== null ? frame
        : keys.length === 0 ? 0 : keys[keys.length - 1].frame + legFrames(keys[keys.length - 1], { depth: shot.depth, view: shot.payload.view }, anim().fps);
    // WHAT YOU SEE IS WHAT YOU KEY: under a recorded free look the keyframe holds the rotation that
    // shows this view with the look on top. With no look recorded at its frame, the view itself.
    const payload: RoutePayload = { ...shot.payload, view: underLook(shot.payload.view, target) };
    const shaped = on && r.depth?.keyframes.find((k) => k.id === on.id && !(k.interpolation === 'Bezier' && k.autoTangent));
    if (on && shaped) {
        // Handles somebody shaped stay as they are.
        anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: on.id, patch: { value: shot.depth, payload } }]);
    } else {
        // A new key; or one whose handles are still the timeline's own, which are worked out again for
        // the new depth (left as they were, a much deeper view would make the curve dip and rise).
        ensureTrack(ROUTE_TRACK, 'Depth');
        anim().addKeyframe(ROUTE_TRACK, target, shot.depth, 'Bezier', payload);
    }
    // The count in force, as an ordinary key. Linear: a count has no business overshooting between two keyframes.
    ensureTrack(ROUTE_ITERATIONS_TRACK, 'Iterations');
    const counted = anim().sequence.tracks[ROUTE_ITERATIONS_TRACK].keyframes.find((k) => Math.abs(k.frame - target) < 0.5);
    if (counted) anim().updateKeyframes([{ trackId: ROUTE_ITERATIONS_TRACK, keyId: counted.id, patch: { value: shot.iters } }]);
    else anim().addKeyframe(ROUTE_ITERATIONS_TRACK, target, shot.iters, 'Linear');

    const key = route().keys.find((k) => k.frame === target);
    if (!key) return null;
    const picture = host.thumbnail(THUMBNAIL_PX);
    if (picture) keepPictures({ [key.id]: picture });
    if (target > anim().durationFrames) anim().setDuration(target);
    anim().seek(target);
    // The camera already stands on this keyframe: the scrub brings the timeline's values level and sets no view.
    // (Under a recorded look the view shown is put together again from the keyframe and the look, and
    // comes back in its last digit: the camera is turned onto exactly that, with no `setView`.)
    const shown = routeShownAt(target) ?? key.view;
    if (!sameCamera(host.getView(), shown)) host.setOrientation(shown.yaw, shown.pitch, shown.roll ?? 0);
    lastSet = { ...shown, iters: itersAt(route(), target) };
    animationEngine.scrub(target);
    bump();
    const number = route().keys.indexOf(key) + 1;
    showToast(on ? `Keyframe ${number} replaced` : `Keyframe ${number} added`, 'success');
    return key.id;
}

/**
 * `left`: the depth track's keys once some of `was` are gone. A key that lost a neighbour, and whose
 * handles are still the timeline's own, pointed at a key that is not there any more: its handles are
 * worked out again. Every other key is handed back as the very object it was.
 */
function healHandles(was: readonly Keyframe[], left: readonly Keyframe[]): Keyframe[] {
    const index = new Map(was.map((k, i) => [k.id, i]));
    const same = (a: BezierHandle | undefined, b: BezierHandle): boolean => !!a && a.x === b.x && a.y === b.y;
    return left.map((k, j) => {
        const i = index.get(k.id);
        if (i === undefined || k.interpolation !== 'Bezier' || !k.autoTangent) return k;
        if (was[i - 1]?.id === left[j - 1]?.id && was[i + 1]?.id === left[j + 1]?.id) return k;
        const { l, r } = AnimationMath.calculateTangents(k, left[j - 1], left[j + 1], 'Auto', true);
        return same(k.leftTangent, l) && same(k.rightTangent, r) ? k : { ...k, leftTangent: l, rightTangent: r };
    });
}

/** The route was edited here: a camera the route holds follows the edit. With no keyframe left
 *  there is no route to hold it: the camera is the user's where it stands. */
function routeEdited(): void {
    if (route().keys.length === 0) takeCamera();
    else if (driving) animationEngine.scrub(anim().currentFrame);
    bump();
}

/** Remove a keyframe, and the iteration key at its frame. One animation-undo step. */
export function deleteKeyframe(id: string): void {
    deleteKeyframes([id]);
}

/**
 * Remove these keyframes, each with the iteration key at its frame: ONE animation-undo step for
 * all of them. The keyframes that stay keep their times, so a leg that swallowed others is as long
 * as they were together (its length is the row's seconds field: `setLegSeconds`). Returns how many
 * went.
 */
export function deleteKeyframes(ids: readonly string[]): number {
    const r = route(), wanted = new Set(ids), gone = r.keys.filter((k) => wanted.has(k.id));
    if (gone.length === 0 || !r.depth || routeRendering()) return 0;
    anim().snapshot();
    const swaps = [{ trackId: ROUTE_TRACK, newKeys: healHandles(r.depth.keyframes, r.depth.keyframes.filter((k) => !wanted.has(k.id))) }];
    const kept = r.iters?.keyframes.filter((c) => !gone.some((k) => Math.abs(c.frame - k.frame) < 0.5));
    if (r.iters && kept && kept.length !== r.iters.keyframes.length) swaps.push({ trackId: ROUTE_ITERATIONS_TRACK, newKeys: kept });
    anim().replaceKeyframes(swaps);
    routeEdited();
    return gone.length;
}

/**
 * Clear the route: every keyframe goes, each with the iteration key at its frame, and the recorded
 * free look with them (the three look tracks, as `clearLook`). The playhead returns to frame 0;
 * the camera stays where it is and is the user's. ONE animation-undo step brings all of it back
 * (the playhead is no part of a step). Nothing with no keyframe, or while the route is rendered.
 * The trail is left as it is: a route can be cut from it again.
 */
export function clearRoute(): void {
    const r = route();
    if (r.keys.length === 0 || routeRendering()) return;
    stopAt = null;
    if (anim().isPlaying) anim().pause();
    takeCamera();
    const tracks = anim().sequence.tracks;
    const counts = r.iters?.keyframes.filter((c) => !r.keys.some((k) => Math.abs(c.frame - k.frame) < 0.5)) ?? [];
    // `removeTracks` takes the step. An iterations track that would be left empty goes with the
    // others; the keys of one that is not are written after it, inside the same step.
    anim().removeTracks([ROUTE_TRACK, ...LOOK_TRACKS.filter((id) => tracks[id]), ...(r.iters && counts.length === 0 ? [ROUTE_ITERATIONS_TRACK] : [])]);
    if (r.iters && counts.length > 0 && counts.length !== r.iters.keyframes.length) anim().replaceKeyframes([{ trackId: ROUTE_ITERATIONS_TRACK, newKeys: counts }]);
    anim().seek(0);
    animationEngine.scrub(0);                                        // the timeline's other tracks: their values at frame 0
    bump();
    showToast('Route cleared. One undo on the timeline brings it back', 'info', 5000);
}

// ── a route cut from the trail ───────────────────────────────────────────────────────────────────

/** By key id, this session: the trail a keyframe was cut from (its dead ends gone), which sample
 *  of it, and the smoothing asked for. The oldest go past `MADE_KEPT`. */
const made = new Map<string, { trail: readonly TrailSample[]; sample: number; smoothing: number }>();
const MADE_KEPT = 4000;
/** The timing last asked for: a route cut again (the smoothing slider) is timed the same way. */
let flownTiming = false;

const timing = (): RouteTiming => ({ fps: anim().fps, pace: ROUTE_PACE, maxLegSeconds: ROUTE_MAX_LEG_SECONDS });
const viewOfSample = (s: TrailSample): RouteView =>
    ({ cam: [String(s.p[0]), String(s.p[1]), String(s.p[2])], yaw: s.yaw, pitch: s.pitch, ...(s.roll ? { roll: s.roll } : {}) });

/**
 * What the route was cut from: set while every one of its keyframes came from one trail, this
 * session. `samples`: which sample of `trail` each keyframe is, in route order. A route that runs
 * its trail BACKWARDS (it was reversed: `reverseRoute`) came from the trail reversed: that is
 * what is handed back, so the smoothing cuts again from it and "As flown" reads its clock. Read
 * off the keyframes each time, never written by the reverse, so an undo of one needs nothing.
 */
export function routeSource(): { trail: readonly TrailSample[]; smoothing: number; samples: number[] } | null {
    const keys = route().keys, first = keys.length > 0 ? made.get(keys[0].id) : undefined;
    if (!first || !keys.every((k) => made.get(k.id)?.trail === first.trail)) return null;
    const samples = keys.map((k) => made.get(k.id)?.sample ?? 0), end = first.trail.length - 1;
    return samples[0] > samples[samples.length - 1]
        ? { trail: trailReversed(first.trail), smoothing: first.smoothing, samples: samples.map((s) => end - s) }
        : { trail: first.trail, smoothing: first.smoothing, samples };
}

/** The route holds a keyframe that no trail made: one set by hand, or from a scene. */
export const routeHandSet = (): boolean => route().keys.some((k) => !made.has(k.id));

/** Replace the route with the one cut from `trail` (its dead ends gone). One animation-undo step. */
function cutRoute(trail: readonly TrailSample[], smoothing: number): number {
    stopAt = null;
    if (anim().isPlaying) anim().pause();
    const pick = pickKeyframes(trail, { ...timing(), tolerance: smoothing, cap: ROUTE_TRAIL_KEYS });
    const frames = flownTiming ? trailFrames(trail, pick.index, timing(), true) : pick.frames;
    const directions = trailDirections(trail);
    // The keys the pick measured, as they are: what was measured is what plays.
    const depthKeys: Keyframe[] = depthCurve(frames, pick.index.map((i) => trail[i].depth)).keys.map((k, j) => {
        const h = directions[pick.index[j]];
        const payload: RoutePayload = { view: viewOfSample(trail[pick.index[j]]), ...(h ? { heading: h } : {}) };
        return { ...k, id: nanoid(), payload };
    });
    const countKeys: Keyframe[] = pick.index.map((i, j) =>
        ({ id: nanoid(), frame: frames[j], value: trail[i].iters, interpolation: 'Linear', autoTangent: false, brokenTangents: false }));
    anim().snapshot();
    ensureTrack(ROUTE_TRACK, 'Depth');
    ensureTrack(ROUTE_ITERATIONS_TRACK, 'Iterations');
    anim().replaceKeyframes([{ trackId: ROUTE_TRACK, newKeys: depthKeys }, { trackId: ROUTE_ITERATIONS_TRACK, newKeys: countKeys }]);
    depthKeys.forEach((k, j) => made.set(k.id, { trail, sample: pick.index[j], smoothing }));
    for (const id of made.keys()) { if (made.size <= MADE_KEPT) break; made.delete(id); }
    // Their pictures: the ones this trail's samples already have (the route cut again; a reversed route cut
    // again from the trail reversed: the same samples the other way), the rest a moment from now.
    const known = pictured.get(trail), turned = reversedTrails.get(trail), knownTurned = turned && pictured.get(turned), have: Record<string, string> = {};
    const pictureOf = (i: number): string | undefined => known?.get(i) ?? knownTurned?.get(trail.length - 1 - i);
    owed = depthKeys.filter((k, j) => { const p = pictureOf(pick.index[j]); if (p) have[k.id] = p; return !p; }).map((k) => k.id);
    keepPictures(have);
    picturesSoon();

    // (A recorded free look is left as it is: where it turns the last keyframe, the camera does not stand on it.)
    const end = frames[frames.length - 1], last = routeShownAt(frames[frames.length - 1]) ?? viewOfSample(trail[trail.length - 1]), host = getHost();
    if (end > anim().durationFrames) anim().setDuration(end);
    if (host && sameCamera(host.getView(), last)) {
        // The camera stands on the last keyframe: the scrub brings the timeline's values level and sets no view.
        anim().seek(end);
        lastSet = { ...last, iters: itersAt(route(), end) };
        animationEngine.scrub(end);
    } else if (driving) animationEngine.scrub(anim().currentFrame);
    bump();
    return depthKeys.length;
}

/**
 * Cut the route from the trail: from its start to the camera as it stands, or (`previous`) the
 * trail the last jump ended. At the smoothing first offered and the even pace. It REPLACES the
 * route (ask first when `routeHandSet()`). One animation-undo step. Returns the keyframes made.
 */
export function routeFromTrail(previous = false): number {
    if (routeRendering()) return 0;
    const flown = previous ? previousTrail() : trailToHere();
    if (!flown) { showToast(previous ? 'No previous trail is kept' : 'Nothing has been flown yet: there is no trail to make a route from', 'info'); return 0; }
    flownTiming = false;
    const count = cutRoute(cutDetours(flown), ROUTE_SMOOTHING.initial);
    showToast(`Route made from the trail: ${count} keyframes`, 'success');
    return count;
}

/** Cut the route again from the trail it came from, with another smoothing. One animation-undo
 *  step; nothing when the route did not come from a trail, or already has that smoothing. */
export function setRouteSmoothing(smoothing: number): void {
    const from = routeSource(), next = Math.min(ROUTE_SMOOTHING.max, Math.max(ROUTE_SMOOTHING.min, smoothing));
    if (from && next !== from.smoothing && !routeRendering()) cutRoute(from.trail, next);
}

/**
 * Time the route again, key times only. `flown`: by the clock of the trail it came from (nothing
 * when it did not come from one). Otherwise the even pace, `ROUTE_PACE` decades a second on
 * screen, which any route can be given: a leg of a route cut from a trail takes the length of the
 * way that was flown, a leg of any other the length of the straight line between its keyframes.
 * One animation-undo step; none when no key moves.
 */
export function retimeRoute(flown: boolean): void {
    const r = route(), keys = r.keys, from = routeSource();
    if (keys.length < 2 || !r.depth || (flown && !from) || routeRendering()) return;
    stopAt = null;
    if (anim().isPlaying) anim().pause();
    if (from) flownTiming = flown;
    const was = keys.map((k) => k.frame);
    const now = from
        ? trailFrames(from.trail, from.samples, timing(), flown, was[0])
        : evenFrames(keys.map(zoomKey), timing(), was);
    moveKeyframes(r, was, now);
}

/**
 * Give the leg that ARRIVES at this keyframe another length, in seconds: the keyframe and every
 * later one move by the difference. A frame at least, `ROUTE_TYPED_LEG_SECONDS` at most. Key times
 * only: views, depths and counts stay, and so does every leg but this one. One animation-undo
 * step; none when the leg already has that length. (A recorded free look stays at its frames, as
 * it does for the two timings.)
 */
export function setLegSeconds(id: string, seconds: number): void {
    const r = route(), i = r.keys.findIndex((k) => k.id === id);
    if (i < 1 || !(seconds >= 0) || routeRendering()) return;
    const was = r.keys.map((k) => k.frame);
    const by = Math.max(1, Math.round(Math.min(ROUTE_TYPED_LEG_SECONDS, seconds) * anim().fps)) - (was[i] - was[i - 1]);
    if (by === 0) return;
    stopAt = null;
    if (anim().isPlaying) anim().pause();
    moveKeyframes(r, was, was.map((f, j) => (j < i ? f : f + by)));
}

/** The route's keyframes go from the frames `was` to the frames `now`, with everything keyed on
 *  its two tracks between them. One animation-undo step; none when no key moves. */
function moveKeyframes(r: Built, was: readonly number[], now: readonly number[]): void {
    if (!r.depth || now.every((f, i) => f === was[i])) return;
    /** A frame of the old timing in the new one: a keyframe's exactly, the frames between two in proportion. */
    const warp = (f: number): number => {
        const top = was.length - 1;
        if (f <= was[0]) return f + now[0] - was[0];
        if (f >= was[top]) return f + now[top] - was[top];
        let i = 0;
        while (f > was[i + 1]) i++;
        return Math.round(now[i] + ((f - was[i]) * (now[i + 1] - now[i])) / (was[i + 1] - was[i]));
    };
    const moved = (track: Track): Keyframe[] => {
        const old = track.keyframes, keysNow = old.map((k) => ({ ...k, frame: warp(k.frame) }));
        // A shaped handle keeps its rise and takes its side's new length; the timeline's own are worked out again.
        const side = (h: BezierHandle | undefined, a: number, b: number): BezierHandle | undefined =>
            (h && a > 0 && b > 0 ? { x: (h.x * b) / a, y: h.y } : h);
        return keysNow.map((k, i) => {
            if (k.interpolation !== 'Bezier') return k;
            if (k.autoTangent) {
                const { l, r: right } = AnimationMath.calculateTangents(k, keysNow[i - 1], keysNow[i + 1], 'Auto', isLogTrack(track.id));
                return { ...k, leftTangent: l, rightTangent: right };
            }
            return {
                ...k,
                leftTangent: i > 0 ? side(k.leftTangent, old[i].frame - old[i - 1].frame, k.frame - keysNow[i - 1].frame) : k.leftTangent,
                rightTangent: i + 1 < old.length ? side(k.rightTangent, old[i + 1].frame - old[i].frame, keysNow[i + 1].frame - k.frame) : k.rightTangent,
            };
        });
    };
    anim().snapshot();
    anim().replaceKeyframes([r.depth, r.iters].filter((t): t is Track => !!t).map((t) => ({ trackId: t.id, newKeys: moved(t) })));
    const end = now[now.length - 1], at = warp(anim().currentFrame);
    if (end > anim().durationFrames) anim().setDuration(end);
    // The playhead goes with its place on the route; a camera the user holds stays where it is.
    anim().seek(at);
    if (driving) animationEngine.scrub(at); else lastFrame = at;
    bump();
}

// ── reverse ──────────────────────────────────────────────────────────────────────────────────────

/** By trail, the same trail the other way, both ways round: a reversed route reversed again reads
 *  the very trail it was cut from, and a route cut from either finds the pictures of the other. */
const reversedTrails = new WeakMap<readonly TrailSample[], readonly TrailSample[]>();

/** `trail` the other way (`reverseTrail`), made once. */
function trailReversed(trail: readonly TrailSample[]): readonly TrailSample[] {
    let back = reversedTrails.get(trail);
    if (!back) { back = reverseTrail(trail); reversedTrails.set(trail, back); reversedTrails.set(back, trail); }
    return back;
}

/** `keys` (a track's, in time order) with every handle that is still the timeline's own worked out
 *  again where it now stands, as `moveKeyframes` does. Shaped handles are left as they are. */
function timelineHandles(trackId: string, keys: readonly Keyframe[]): Keyframe[] {
    return keys.map((k, i) => {
        if (k.interpolation !== 'Bezier' || !k.autoTangent) return k;
        const { l, r } = AnimationMath.calculateTangents(k, keys[i - 1], keys[i + 1], 'Auto', isLogTrack(trackId));
        return { ...k, leftTangent: l, rightTangent: r };
    });
}

/**
 * Reverse the route: a NEW route that plays the old one backwards, in place of it, in ONE
 * animation-undo step. Not a direction of playback: Play, a scrub, the render and the graph editor
 * all read keys in time order, and mirrored keys need no player of their own. About the route's
 * own span (frame f becomes first + last - f, so the span stays where it is):
 *   - THE KEYFRAMES (`AnimationMath.mirrorKeyframes`): each keeps its id and its view, to the digit
 *     (its picture, and what it was cut from, stay with it). EVERY HEADING IS NEGATED, or each
 *     keyframe would be entered backwards (engine/animation/zoomPath.ts, PITFALLS). Handles the
 *     timeline worked out are worked out again; shaped ones are mirrored.
 *   - The iteration keys in the span, the same way: each stays with its keyframe.
 *   - A recorded free look (the three look tracks), the same way. A look is a turn in the camera's
 *     own frame, so its values stay as they are. A LOOK KEY OUTSIDE THE SPAN IS DROPPED: left where
 *     it was, the track would run from the mirrored span to it.
 *   - A route cut from the trail: its keyframes keep what they were cut from (`made` is by key id,
 *     and is not touched), and now run that trail backwards, so `routeSource` hands back the trail
 *     reversed (`reverseTrail`): the smoothing cuts again from it and "As flown" is its clock
 *     mirrored. An undo of the reverse needs nothing more.
 * The playhead goes to its mirrored frame (from outside the span, the mirror of the end it was
 * past), so the picture on screen does not change: to the digit on a keyframe; between two, the
 * orientation curve is not quite symmetric in time (the check prints how far). Nothing else on the
 * timeline moves: a light, a colour, an iteration key outside the span. Nothing with fewer than two
 * keyframes, or while the route is rendered.
 */
export function reverseRoute(): void {
    if (route().keys.length < 2 || routeRendering()) return;
    stopAt = null;
    if (anim().isPlaying) anim().pause();                            // a pass being recorded ends here, before its keys are read
    const r = route(), keys = r.keys, first = keys[0].frame, last = keys[keys.length - 1].frame, tracks = anim().sequence.tracks;
    if (!r.depth) return;
    const inSpan = (k: Keyframe): boolean => k.frame >= first && k.frame <= last;
    /** The track's keys in the span mirrored (and each passed through `each`); those outside it kept where they are, or (`drop`) gone. */
    const mirrored = (track: Track, drop = false, each = (k: Keyframe): Keyframe => k): Keyframe[] => {
        const ks = track.keyframes, back = AnimationMath.mirrorKeyframes(ks.filter(inSpan), first, last).map(each);
        return timelineHandles(track.id, drop ? back : [...ks.filter((k) => k.frame < first), ...back, ...ks.filter((k) => k.frame > last)]);
    };
    const turned = (k: Keyframe): Keyframe => {
        const h = isPayload(k.payload) ? k.payload.heading : undefined;
        return h ? { ...k, payload: { ...(k.payload as RoutePayload), heading: [-h[0], -h[1], -h[2]] } } : k;
    };
    const swaps = [{ trackId: ROUTE_TRACK, newKeys: mirrored(r.depth, false, turned) }];
    if (r.iters && r.iters.keyframes.some(inSpan)) swaps.push({ trackId: ROUTE_ITERATIONS_TRACK, newKeys: mirrored(r.iters) });
    for (const id of LOOK_TRACKS) { if (tracks[id]?.keyframes.length) swaps.push({ trackId: id, newKeys: mirrored(tracks[id], true) }); }
    anim().snapshot();
    anim().replaceKeyframes(swaps);
    const at = first + last - Math.min(last, Math.max(first, anim().currentFrame));
    anim().seek(at);
    // A camera the route holds is put on the mirrored frame (at a keyframe, the view it already shows: nothing is set); one the user holds stays.
    if (driving) animationEngine.scrub(at); else lastFrame = at;
    bump();
    showToast('Route reversed. One undo on the timeline brings it back', 'success');
}

// ── pictures of keyframes that were not set from the screen ──────────────────────────────────────

/** The keyframes that have no picture yet and are to get one, in route order (PICTURES in the header). */
let owed: string[] = [];
/** The keyframes a picture was tried for. A keyframe is tried once: one that cannot be drawn keeps its number. */
const asked = new Set<string>();
/** By trail: the picture taken at a sample. A route cut again from the same trail draws only the samples that are new. */
const pictured = new WeakMap<readonly TrailSample[], Map<number, string>>();

/** Pictures by key id, into the Route tab's list. Past `PICTURES_KEPT` the oldest go. */
function keepPictures(add: Record<string, string>): void {
    if (Object.keys(add).length === 0) return;
    useRoute.setState((s) => {
        const all = { ...s.thumbnails, ...add }, ids = Object.keys(all);
        for (const id of ids.slice(0, Math.max(0, ids.length - PICTURES_KEPT))) delete all[id];
        return { thumbnails: all };
    });
}

/**
 * Every keyframe that has no picture, and was never tried for one, is owed one from here on: the
 * keyframes of a loaded scene, of a restored session, of an undo that brings back ones never
 * pictured. Called when the route's track changes and when a renderer becomes ready
 * (`installRoute`). It only NOTES them: the pictures are taken a moment later by the pass a cut
 * route's are taken by, under the same holds. Nothing owed, nothing scheduled.
 */
function owePictures(): void {
    const have = useRoute.getState().thumbnails, waiting = new Set(owed);
    const more = route().keys.filter((k) => !have[k.id] && !asked.has(k.id) && !waiting.has(k.id)).map((k) => k.id);
    if (more.length === 0) return;
    owed.push(...more);
    picturesSoon();
}

/**
 * Take the pictures that are owed, for as long as `budgetMs`: one keyframe at least when one
 * is owed. Each is the view shown at its keyframe's frame, drawn with the count keyed there (the
 * renderer's own iteration rule held off meanwhile, as when the route drives): the camera is PUT
 * there, a frame is run, the picture is taken - and before this returns the camera is put back
 * where it stood, the very view it was, and a frame of it is run. So no frame of a keyframe is
 * ever shown, and nothing else sees the camera anywhere but where the user left it. Nothing is
 * done, and nothing is dropped, while something else has the camera: a render, a playing timeline,
 * a flight, a dive - or while a formula's shader is still building. Returns how many are still owed.
 */
export function takeOwedPictures(budgetMs = Infinity): number {
    const host = getHost(), state = host?.bootParams() ? host.telemetry() : null;
    if (!host || !state || state.error) { owed = []; return 0; }     // no renderer to draw them: asked for again when one is ready
    // What is not owed any more goes first - a keyframe that has its picture by now (K's own, from the screen) or is
    // gone - so that the wait below ends when nothing is left to wait for.
    const r = route(), pictures = useRoute.getState().thumbnails, there = new Set(r.keys.map((k) => k.id));
    owed = owed.filter((id) => there.has(id) && !pictures[id]);
    if (owed.length === 0 || !state.ready || routeRendering() || anim().isPlaying || isFlying() || diving > 0 || host.building()) return owed.length;
    flushHostSync();                                                 // what a loaded scene wrote and the sync still holds, before the look is read
    const here = host.getView(), held = autoIterationsHeld(), began = performance.now(), taken: Record<string, string> = {};
    const { roll: _roll, ...look } = here;                           // every look value as the renderer has it: only the camera differs
    // One frame works out the reference orbit and the depth of a view that was set. The shell's renderer draws
    // every depth one way ('deep'); under the developer lever's other two, the frame after a jump is still drawn
    // the way the LAST depth asked for, and a second one is run.
    const frames = host.diagnostics().levers.mode === 'deep' ? 1 : 2;
    const run = (): void => { for (let i = 0; i < frames; i++) host.step(performance.now()); };
    let away = false;
    picturing = true;
    try {
        while (owed.length > 0 && (!away || performance.now() - began < budgetMs)) {
            const id = owed.shift() as string, key = r.keys.find((k) => k.id === id);
            if (!key || useRoute.getState().thumbnails[id]) continue;   // gone (an undo, a newer edit), or it has one
            asked.add(id);                                           // tried from here on, whatever comes of it
            const view = routeShownAt(key.frame) ?? key.view, count = itersAt(r, key.frame);
            holdAutoIterations(count > 0);                           // the rule only raises a count: a picture would depend on where the camera stood
            host.setView({ ...look, cam: view.cam, yaw: view.yaw, pitch: view.pitch, ...(view.roll ? { roll: view.roll } : {}), iters: count || here.iters });
            away = true;
            run();
            const picture = host.thumbnail(THUMBNAIL_PX);
            if (!picture) continue;                                  // nothing can be drawn now: it keeps its number
            taken[id] = picture;
            const from = made.get(id);
            if (from) pictured.set(from.trail, (pictured.get(from.trail) ?? new Map<number, string>()).set(from.sample, picture));
        }
        if (away) { host.setView(here); run(); }
    } finally {
        holdAutoIterations(held);
        picturing = false;
    }
    keepPictures(taken);
    for (const id of asked) { if (asked.size <= MADE_KEPT) break; asked.delete(id); }
    return owed.length;
}

let pictureRun = 0;
/** The owed pictures, a moment from now and a task at a time; a newer call drops this one. It ends when none is owed. */
function picturesSoon(): void {
    const run = ++pictureRun;
    const task = (): void => {
        if (run !== pictureRun || owed.length === 0) return;
        const before = owed.length, left = takeOwedPictures(PICTURE_TASK_MS);
        // Nothing taken: something else has the camera. Asked again as the solid check is.
        if (left > 0) setTimeout(task, left === before ? SOLID_CHECK_DELAY_MS : 0);
    };
    setTimeout(task, SOLID_CHECK_DELAY_MS);
}

// ── does a leg pass through the solid ────────────────────────────────────────────────────────────

/** Does the leg that arrives at keyframe `index` pass through the solid? `ROUTE_SOLID_SAMPLES`
 *  points along it, each asked of the renderer with the iteration count keyed there. */
export function legInSolid(index: number, host: DeepZoomHost | null = getHost()): boolean {
    const r = route(), a = r.keys[index - 1], b = r.keys[index];
    if (!host || !r.path || !a || !b) return false;
    for (let j = 1; j <= ROUTE_SOLID_SAMPLES; j++) {
        const frame = a.frame + ((b.frame - a.frame) * j) / (ROUTE_SOLID_SAMPLES + 1);
        const p = zoomPathPosition(r.path, frame);
        if (!(host.estimateAtPoint([String(p[0]), String(p[1]), String(p[2])], itersAt(r, frame)) > 0)) return true;
    }
    return false;
}

let solidRun = 0;
/** Ask every leg again, a moment from now and a leg a task; a newer call drops this one. */
function checkLegsSoon(): void {
    const run = ++solidRun;
    const found: Record<string, boolean> = {};
    const step = (index: number): void => {
        const host = getHost(), keys = route().keys;
        if (run !== solidRun || !host || !host.bootParams()) return;   // not ready: `installRoute` asks again at ready
        // Not while the hands fly or the timeline plays: a leg costs milliseconds at depth, and a cut route has hundreds.
        if (index < keys.length && (anim().isPlaying || isFlying())) { setTimeout(() => step(index), SOLID_CHECK_DELAY_MS); return; }
        if (index >= keys.length) {
            const was = useRoute.getState().solid;
            const same = Object.keys(was).length === Object.keys(found).length && Object.keys(found).every((id) => was[id] === found[id]);
            if (!same) useRoute.setState({ solid: found });
            return;
        }
        if (legInSolid(index, host)) found[keys[index].id] = true;
        setTimeout(() => step(index + 1), 0);
    };
    setTimeout(() => step(1), SOLID_CHECK_DELAY_MS);
}

// ── install ──────────────────────────────────────────────────────────────────────────────────────

let installed = false;

/** Call once, after the store exists and before anything can load a sequence. */
export function installRoute(): void {
    if (installed) return;
    installed = true;
    registerPayloadTrack(ROUTE_TRACK);
    registerLogTrack(ROUTE_TRACK);
    // The route's track is held while the camera is recorded; the three look tracks are let go
    // (the default), which is what makes room for a recorded free look. Key Cam keys the route only.
    registerCameraKeyTracks([{ id: ROUTE_TRACK, releaseOnRecord: false }, ...LOOK_TRACKS]);
    setCameraKeyCaptureFn((frame, _tracks, opts) => { setKeyframe(frame, opts); });
    animationEngine.registerScrubHook('post', onScrub);
    // Playback stopped, and no hand took the camera (that path settles the look before it pauses):
    // a recorded pass is thinned, an unrecorded turn is dropped, and the view goes back to the
    // route with what is recorded - one `setView`, from the scrub of the frame it stopped on.
    useAnimationStore.subscribe((s) => s.isPlaying, (playing) => {
        if (!playing && settleLook() && driving) animationEngine.scrub(anim().currentFrame);
    });
    // Record, or the camera's share of it, went off while the timeline plays on: the pass ends there.
    useAnimationStore.subscribe((s) => s.isRecording && s.recordCamera, (on) => { if (!on) endPass(); });

    // Every `setView` is a jump as far as the heading goes; one that is not the hook's own also takes the camera.
    let offViewSet: (() => void) | null = null;
    const adopt = (host: DeepZoomHost | null): void => {
        offViewSet?.();
        offViewSet = null;
        lastSet = null;                                              // another renderer: nothing set on the old one is on it
        drift = null;
        takeCamera();
        if (!host) return;
        offViewSet = host.on('viewSet', () => {
            if (picturing) return;                                   // a picture's view: the camera is back before anything can fly from it
            drift = null;
            jumps++;
            trailViewSet();                                          // not flown: the trail keeps the place aside
            if (own) return;
            takeCamera();
            bump();
        });
        // Ready: the view the renderer starts with is where a trail begins. And a route that was there before the
        // renderer (a restored session, a scene loaded while the shader built) gets its pictures now: a parked view
        // has been applied by the time `ready` is heard.
        void host.ready.then(() => { if (getHost() === host) { trailViewSet(); checkLegsSoon(); owePictures(); } }, () => undefined);
    };
    subscribeHost(adopt);
    adopt(getHost());

    useAnimationStore.subscribe((s) => s.sequence.tracks[ROUTE_TRACK], checkLegsSoon);
    // Keyframes that arrived with no picture (a loaded scene, an undo) are owed one. One set with K is noted too,
    // for the moment before its picture is taken from the screen; the pass then finds it has one and sets nothing.
    useAnimationStore.subscribe((s) => s.sequence.tracks[ROUTE_TRACK], owePictures);
    useAnimationStore.subscribe((s) => s.sequence.tracks[ROUTE_ITERATIONS_TRACK], checkLegsSoon);

    // An iteration key stays with its keyframe (PITFALLS). `follows`: which iteration key went with
    // a keyframe last, for the moment a dragged keyframe shares a frame with another one.
    const follows = new Map<string, string>();
    useAnimationStore.subscribe((s) => s.sequence.tracks, (now, was) => {
        const before = was[ROUTE_TRACK], after = now[ROUTE_TRACK], counts = now[ROUTE_ITERATIONS_TRACK]?.keyframes, countsWere = was[ROUTE_ITERATIONS_TRACK]?.keyframes;
        // The depth track changed and the iteration keys are the very ones that were there: an edit of the depth track alone.
        if (!before || !after || before === after || !counts || !countsWere || counts.length !== countsWere.length || counts.some((c, i) => c !== countsWere[i])) return;
        const frameOf = new Map(after.keyframes.map((k) => [k.id, k.frame]));
        const moves: Array<{ trackId: string; keyId: string; patch: Partial<Keyframe> }> = [], gone = new Set<string>();
        for (const k of before.keyframes) {
            const frame = frameOf.get(k.id);
            if (frame === k.frame) continue;
            const here = counts.filter((c) => Math.abs(c.frame - k.frame) < 0.5), mine = here.find((c) => c.id === follows.get(k.id)) ?? here[0];
            if (!mine) continue;
            if (frame !== undefined) { moves.push({ trackId: ROUTE_ITERATIONS_TRACK, keyId: mine.id, patch: { frame } }); follows.set(k.id, mine.id); }
            // Gone, and no keyframe took its frame (one that takes a new view is written as a new key there).
            else if (!after.keyframes.some((o) => Math.abs(o.frame - k.frame) < 0.5)) gone.add(mine.id);
        }
        if (gone.size > 0) anim().replaceKeyframes([{ trackId: ROUTE_ITERATIONS_TRACK, newKeys: counts.filter((c) => !gone.has(c.id)) }]);
        if (moves.length > 0) anim().updateKeyframes(moves);
        // A keyframe deleted on the timeline: the handles its neighbours pointed at it with are worked out again, as
        // `deleteKeyframes` does it (PITFALLS: HANDLES). Left as they were, the depth between the two is not the route's.
        if (before.keyframes.some((k) => !frameOf.has(k.id))) {
            const healed = healHandles(before.keyframes, after.keyframes);
            if (healed.some((k, i) => k !== after.keyframes[i])) anim().replaceKeyframes([{ trackId: ROUTE_TRACK, newKeys: healed }]);
        }
    });
}
