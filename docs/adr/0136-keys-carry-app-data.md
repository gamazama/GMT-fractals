# ADR-0136: Keys can carry app data; a path that spans decades is measured from its deeper key

- **Status:** Accepted
- **Date:** 2026-10-11
- **Extends:** ADR-0015 (log-value-space tracks and the camera pair's linear-in-zoom pan). Its
  decision stands; this record adds what a timeline needs before a camera that dives 70 decades
  can sit on it, corrects how the pair's formula is computed, and makes an exponential track
  editable as what it is.
- **Code:** `types/animation.ts` (`Keyframe.payload`), `engine/animation/payloadTrackRegistry.ts`
  (the contract), `store/animation/sequenceSlice.ts` (grep `isPayloadTrack`, `lockPayloadValue`,
  `replaceKeyframes`, `durationFrames`), `engine/animation/cameraKeyRegistry.ts` (grep
  `releaseOnRecord`), `engine/AnimationEngine.ts` (grep `heldOnRecord`),
  `engine/animation/zoomPath.ts`, `engine/animation/cameraPairRegistry.ts` (grep `fromK1`),
  `types/preset.ts` (`fps`), `store/engineStore.ts` (grep `p.fps = animStore.fps`),
  `utils/PresetLogic.ts` (grep `p.fps`), `utils/GraphUtils.ts` (grep `toGraphY`),
  `utils/CurveFitting.ts` (grep `isLog`, `strokeTolerance`), `utils/timelineUtils.ts` (grep
  `differsOnTrack`, `cameraKeyStatus`).
- **Guards:** `npm run test:key-payload`, `npm run test:zoom-path`, `npm run test:camera-pair`,
  `npm run test:log-curves`, `npm run smoke:interact` (the frame rate's round trip).
- **First user:** the deep zoomer's routes, `deep-zoom/route.ts` (`plans/deep-zoom-shell/ROUTES.md`).
  Commits `80a5916e`, `0672e352`, `15b419bb` on `deep-zoom-tool`.
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

> **Update 2026-10-11 (the first user of "held while the camera is recorded"; decision unchanged):**
> the deep zoomer's FREE LOOK (`deep-zoom/route.ts`, grep `LOOK_TRACKS`; commit `3abf4af2`). Beside
> the payload track `camera.depth`, which stays held on record, the route has three plain tracks
> in radians (`camera.lookPan`, `camera.lookTilt`, `camera.lookRoll`) registered as RELEASED on
> record. While a route plays, a turn of the view rides on top of the route's own rotation; with
> Record on it is written to those three tracks, a key a frame from the hand's first turn, and
> thinned with `fitSamplesToKeys` when the pass ends. A keyframe set under a recorded look stores
> the rotation that plays back as what was on screen (route = screen x inverse look). Nothing in
> the engine changed for it. Guard: `npm run check:deep-zoom-route` (the "look: ..." lines).

## Context

The engine's timeline holds one number per key. The deep zoomer's camera does not fit: a view is
three 256-bit integers, a full orientation and the direction of travel, and its routes put that
camera on the timeline as ONE exponential track whose every key is such a view. Six things were
in the way, all of them generic:

1. **A key could hold nothing but its number**, and half the editing tools make keys up or move
   their values (Bake, Simplify, the Pencil, Smooth, Bounce, the Euler filter, the recorders).
   A made-up key on a track of exact views is a view nobody was ever at.
2. **Recording the camera let go of every `camera.*` track.** `AnimationEngine.scrub` skipped
   them all so the user can steer while the timeline plays. The zoomer wants its position to
   keep riding the timeline while only the look is steered.
3. **There was no rule for the in-between.** The owner approved one on 2026-10-10 from a study of
   a dive he flew (1291 exact views, 36 decades): a Hermite curve on a clock that follows the
   scale, each key left along the direction it was travelling.
4. **The camera pair lost the pan on a long leg.** Its formula is right; its arithmetic measured
   the share of the way from the SHALLOW key in one f64. On a 30-decade leg that is 5 % of a
   view off at zoom 1e-16 and the whole remaining pan from 1e-17 on (measured against exact
   integers). The pan's two words could not help: the weak number was the share.
5. **A saved scene did not keep its frame rate.** `sequence` and `duration` are counted in
   frames, so a scene reloaded into a session at another rate changed length in seconds.
6. **An exponential track was drawn and edited as plain values.** The graph editor showed a
   route from depth 2 to 1e-37 as an L; re-tangenting, the fitter and the Pencil's tolerance
   worked in plain units (0.99 decades off on a 24-decade track); a key added between two keys
   was split in plain values; and the timeline's length sat outside the undo, so a tool that
   grew the timeline left it grown.

Items 3 and 4 are one fact met twice: anything of the form `a + (b - a) * share` keeps its digits
only if the share goes to zero where the view is smallest.

## Decision

1. **A key may carry a `payload`: plain JSON the engine carries and never reads.**
   `Keyframe.payload?: unknown`. Every operation that keeps a key keeps its payload, on every
   track: a move in time, copy, paste, duplicate, loop, undo / redo, a sequence saved and loaded,
   the `setFps(x, 'match')` retime, tangent and interpolation edits.

2. **A track of such keys is registered** (`registerPayloadTrack(trackId)`, beside the log-track
   registry and the same shape), **and on a registered track the engine can neither make up a
   key nor move a key's value**, because it cannot make up the payload and the value says the
   same thing the payload says:
   - a key's `value` changes only in a write that also carries a `payload` (the app's own);
     its time, handles and interpolation stay editable;
   - a key arrives only with a payload: `addKeyframe` without one is a no-op, the recording
     batch actions skip the track, and a wholesale `replaceKeyframes` is dropped unless every
     key in it has one. That one rule stops Bake, Simplify, the Pencil and the smoothing brush,
     and still lets a copy through;
   - deleting a key is allowed.

3. **The store enforces it; the editors only tidy up.** Every rule above lives in
   `store/animation/sequenceSlice.ts`, so a new tool is covered without knowing the registry
   exists. `replaceKeyframes` became a store action for that reason (it was a `setState` inside
   `utils/GraphDataSource.ts`). The Pencil's target, the graph tools' targets and the dope
   sheet's add-a-key also return early on such a track, so a refused tool leaves no empty undo
   step and no preview of a stroke that will not land. The key inspector shows the value
   read-only, and a drag in the graph editor moves such a key in time only.

4. **The app writes its keys through the one existing action:**
   `addKeyframe(trackId, frame, value, interpolation, payload)`. A key written with a payload
   keeps the value it is given (an ordinary key dropped between two Bezier keys is put ON the
   curve). For a camera, the app does this from the capture function it hands to
   `setCameraKeyCaptureFn`; the default capture reads one number per track and leaves a payload
   track alone.

5. **A camera track can say it is held while the camera is recorded.**
   `registerCameraKeyTracks` entries gain `releaseOnRecord?: boolean`, default true. A `camera.*`
   track registered with `false` keeps being driven; every other one, registered or not, is let
   go as before.

6. **`engine/animation/zoomPath.ts` is the in-between rule, as a pure module.** Keys hold a time,
   a scale, an exact position (three bigints in a unit the caller owns) and optionally a heading.
   A leg's clock is the scale's integral, normalised; the position is a cubic Hermite curve on
   that clock; a key's tangent is its on-screen velocity, sized from the two legs that meet there
   and pointed along its heading when it has one. The scale between keys is the caller's function
   (the engine's exponential track, eased in log space) and its integral is taken numerically per
   leg: 8-point Gauss-Legendre on panels halved until one agrees with its halves to 1e-12, built
   the first time a leg is asked for, under a budget of panels so that a scale function rough in
   its last digits costs milliseconds and not minutes. Orientation is a separate curve that
   advances with time (a cubic in the rotation group whose turning rate is continuous at uneven
   key times).

7. **Everything that spans decades is measured from its deeper key.** In `zoomPath` the clock is
   read as the share of the integral between the leg's deeper key and the moment asked for, and
   the curve is written out from that key, so every weight is zero there. In the camera pair the
   share is `(zT - zDeep) / (zShallow - zDeep)` and the pan is `cDeep + (cShallow - cDeep) * share`,
   in the plain and the eased branch alike. The flat-zoom fallback is unchanged.

8. **A scene carries its frame rate.** `Preset.fps`, written beside `duration` and restored on
   load when present, set directly like the duration (not through `setFps`, which is the user's
   action: an undo step, and in `'match'` mode it moves the keys). GMT's own preset type and its
   filtered load carry the field too (`engine-gmt/types/fractal.ts`,
   `engine-gmt/utils/loadFilter.ts`).

9. **An exponential track is drawn and edited through its log.** In the graph editor its curve,
   keys and handles are placed at the log10 of the value, in both views, and the axis reads in
   the value's own units; tangents stay in ln-units, as playback has them, with one conversion
   between the two (`utils/GraphUtils.ts`). On one un-normalised view a plain track sits at its
   value and an exponential one at its exponent. Re-tangenting, the fitter and the Pencil's
   tolerance take the track's flag; a key added between two keys is split in log; "is this
   value keyed, or changed" is a comparison of ratios on such a track.

10. **The timeline's length is part of the animation undo.** A snapshot holds the sequence and
    its length; a change of the LEN field is one step per committed change, and undoing any edit
    restores the length that edit began with.

## Consequences

- **Measured, 2026-10-11.** `zoomPath`: a route passes through its keys to 3e-17 of the scale
  there; the numeric integral agrees with the closed form to 8e-14 on a 77-decade leg and with a
  brute-force sum to 2e-13 on a 30-decade leg eased by the engine's own log-space Bezier; one
  evaluation costs 1 microsecond and a leg's table 0.07 ms; 30-degree steps round a point stay
  within 2.1 % of the circle; a scale function rough at 1e-7 builds its leg in 16 ms and lands
  7e-8 of the scale from the smooth path (without the budget it was still building after 75 s).
  Measured from the shallow key instead, the deep end of a 30-decade leg is one whole scale off.
  The camera pair: 7e-17 of a view at every zoom down to 3e-30 when the pan's low words are zero.
  The curve tools on a 24-decade track: 3.6e-15 decades from the by-hand log result for a
  re-tangent (0.99 before), a fitted stroke within 0.0067 decades of its samples (4.22 before).

- **The pair's two words have a floor of their own, and this does not move it.** A pan whose low
  word is 1.2e-18 resolves nothing finer than 1.9e-34, which is 1e-5 of a view at zoom 1e-29.
  `test:camera-pair` therefore holds the pan to 1e-12 of a view OR two steps of the low word,
  whichever is coarser. That floor is the double-double centre itself, not the tween.

- **Segments shorter than 13 decades move in their last digits only.** On a climb nothing moves:
  the old form already measured from the deeper key there.

- **A plain track is unchanged to the bit.** `test:log-curves` compares every changed tool with
  the file as it stood at `b2a47674`. If that commit ever becomes unreachable the comparison
  fails with a message saying so; it does not pass by skipping.

- **What GMT feels.** It has no exponential and no payload track. A change of LEN can now be
  undone, and Ctrl+Z over the timeline straight after loading a scene brings back the previous
  keys WITH their previous length (before, with the loaded scene's). A scene saved from now on
  remembers its frame rate.

- **What fluid-toy feels.** Its zoom track is a curve over its decades with the axis in zoom
  values; a key added between two zoom keys lands on the curve; Key Cam and the key button no
  longer read "changed" between two keys, and below about 1e-4 they now notice a changed zoom;
  a pan across a leg longer than 13 decades arrives with the zoom and not before it.

- **Still in plain values on an exponential track** (recorded as `@assumption` in
  `engine/animation/logTrackRegistry.ts`; none is reachable on a payload track): Smooth and
  Bounce average plain values; Simplify uses its own plain evaluator; a `Continue` tail adds a
  log-unit slope to a plain value, in playback and in the drawing; the inspector's value field on
  a non-payload exponential track drags in plain steps.

- **Register before writing.** A key written without a payload while its track was unregistered
  stays as it is; nothing sweeps it later.

- **A share link is lossier than a scene file.** `utils/UrlStateEncoder.ts` (grep `quantize`)
  rounds every number to 5 decimals and anything under 1e-9 to 0, a key's own value included,
  and drops object keys that begin with `is`. Strings pass untouched, so exact data in a payload
  belongs in strings. A key value of 1e-30 does not survive a share link today, with or without
  a payload. (Read, not run.)

- **Scenes saved from now on hold `fps`; older ones load as before** (no rate, the session's is
  left alone). An older build's load reads named fields and passes over the rest (read in
  `applyPresetState`; not run against an old build). A share link now carries the key too.
  Changing the rate now counts as a change to the scene (it is in the preset the dirty check
  hashes).

- **Reversing the order of a route's keys means negating their headings.** A heading belongs to
  the direction a route is played in. Playing the timeline backwards needs nothing: the path is
  a function of time.

- **Decided by the first user, not here:** how a key's value on the exponential track is derived
  from its view (the depth the app shows), what the timeline shows for such a track, and how a
  leg is timed (by its length on screen, `zoomLegOnScreen`, at a pace in decades a second).
  `deep-zoom/route.ts` and `plans/deep-zoom-shell/ROUTES.md` hold those.
