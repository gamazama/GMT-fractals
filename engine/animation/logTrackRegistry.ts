/**
 * Log-track registry — track IDs that should be interpolated in
 * log-value space rather than linearly.
 *
 * Why: linear lerp on a value that spans many decades (e.g. fluid-toy's
 * `julia.zoom` flying from 1.0 down to 1e-30 for a deep-zoom flythrough)
 * collapses 99.999...% of the timeline to one end of the range. The
 * eye expects a constant rate-of-change in *scale*, not in raw value —
 * lerp in `log(v)` and `exp` back delivers that.
 *
 * Apps register their log-scale tracks on boot:
 *
 *   import { registerLogTrack } from '@engine/animation/logTrackRegistry';
 *   registerLogTrack('julia.zoom');
 *
 * The animation engine consults the registry when evaluating each
 * track's value at a frame; non-registered tracks behave exactly as
 * before. Constraints: both keyframe endpoints must be > 0 for log
 * interpolation to apply — we silently fall back to linear when they
 * aren't (rare in practice; log-scale UI sliders enforce a positive
 * lower bound).
 *
 * Bezier IS supported on log tracks: a Bezier key is solved in
 * `(frame, log(value))` space and `exp()`ed back, so its tangent
 * y-values are LOG-UNITS rather than absolute value-units. The keyframe
 * write paths author auto-tangents in the same space — `sequenceSlice`,
 * `TrackUtils.updateNeighbors` and `timelineUtils` all thread
 * `isLogTrack(trackId)` into `AnimationMath.calculateTangents`.
 *
 * THE EDITING SIDE works in that space too (2026-10-11). Everything that draws
 * such a track or turns a pointer move into a value goes through GRAPH Y
 * (`toGraphY` in `utils/GraphUtils.ts`: the track at its exponent, one unit a
 * decade), and the curve tools take the flag: `reTangentBezier`, `spliceSpan`,
 * `fitKeysToSamples` / `fitSamplesToKeys` and `strokeTolerance` in
 * `utils/CurveFitting.ts` (grep `isLog` there), reached from the selection
 * box's Bias handle and the Pencil. The status readers compare a live value
 * with the curve as it plays, as a ratio (`differsOnTrack`, `cameraKeyStatus`
 * in `utils/timelineUtils.ts`), and a key dropped between two Bezier keys is
 * split off the curve in log (`addKeyframe`, grep `inLog`).
 *
 * PITFALL. A key at or below zero has no log: that key, or the segment it
 * ends, is handled in plain values everywhere (played, drawn, fitted).
 *
 * @invariant Re-tangenting, the seam heal and the fit of a sampled curve give,
 *   on an exponential track, the curve the same operation gives when done by
 *   hand on the logs of the values, to 1e-9 decades; the Pencil's tolerance is
 *   2 % of the LOG range; a plain track gets what it got before, to the bit —
 *   proven by: npm run test:log-curves ("[T] ...", "[F] ...", "[E] ...",
 *   "[P] ..."). Before: the same keys tangented as a plain track played 0.99
 *   decades off on that test's 24-decade track and 0.35 on its 6-decade one
 *   (the 2026-07 audit measured 1.34 and 0.30 on its own), and a stroke over
 *   the deep half kept 2 keys.
 * @invariant A handle is drawn on the control point playback solves with;
 *   between two keys Key Cam reads 'partial' while the live value is the
 *   curve's and 'dirty' when it is 1 % off; a key added between two Bezier
 *   keys lies on the curve and leaves it where it was — proven by:
 *   npm run test:log-curves ("[G] a handle sits ...", "[K] ...", "[S] ...").
 *
 * @assumption Any NEW code that computes tangents for a track, evaluates it,
 *   or maps its values to pixels must pass `isLogTrack(trackId)` on:
 *   `AnimationMath.calculateTangents`, `evaluateTrackValue`, `toGraphY`.
 *   Handles authored in linear-value space and then evaluated as
 *   log-units give a curve nobody asked for.
 * @assumption The WIRING of the above into the editors is not reached by a
 *   node test: `GraphRendererBuilder` / `GraphRenderer` drawing through graph
 *   Y, `useGraphInteraction`'s hit test and drags, the selection box, the
 *   Pencil's target in `components/GraphEditor.tsx`. Measured once in the
 *   three apps on 2026-10-11 (drawn curve against played curve to 1.5 px; a
 *   key and a handle dragged, the stored numbers against the pointer's move).
 * @assumption Still in plain values on an exponential track, none of them
 *   reachable on a payload track: Smooth and Bounce (`calculateSmoothingUpdates`,
 *   `utils/ConstrainedSmoothing.ts`) average the values themselves; Simplify
 *   (`simplifyTrack`) resamples with its own plain evaluator; the smoothing
 *   brush (`smoothSpan`, palette only today); a `Continue` tail adds a
 *   log-unit slope to a plain value, in playback and in the drawing alike;
 *   the key inspector's value field drags in plain steps.
 *
 * @see docs/adr/0015-animation-log-and-camera-pair-value-spaces.md — its
 *   Decision section predates the Bezier-on-log support added in 05eb7849
 *   and still says Bezier is unsupported here; the code is the truth.
 */

const logTracks = new Set<string>();

export function registerLogTrack(trackId: string): void {
    logTracks.add(trackId);
}

export function unregisterLogTrack(trackId: string): void {
    logTracks.delete(trackId);
}

export function isLogTrack(trackId: string): boolean {
    return logTracks.has(trackId);
}
