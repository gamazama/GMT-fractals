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
 * @invariant Any NEW code that computes tangents for a track must pass
 *   `isLogTrack(trackId)` through to `AnimationMath.calculateTangents`.
 *   Handles authored in linear-value space and then evaluated as
 *   log-units give a curve nobody asked for. Two existing callers do not
 *   thread it: `utils/CurveFitting.ts` `reTangentBezier` (Pencil / Bias /
 *   graph-selection retangent), which takes no trackId at all, and
 *   `engine-gmt/animation/cameraBinders.ts`, which has `t.id` in scope but
 *   passes neither there nor to `TrackUtils.updateNeighbors`. The latter is
 *   latent — no GMT camera track is registered log — the former is live for
 *   any app that registers one (fluid-toy's `julia.zoom`). Don't copy the
 *   shape.
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
