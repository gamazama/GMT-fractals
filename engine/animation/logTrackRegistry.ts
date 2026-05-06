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
 * Bezier-on-log isn't supported — tangent y-values are stored in
 * absolute value-space, and reinterpreting them under a log transform
 * would silently change the curve shape. Log tracks evaluate as
 * linear-in-log regardless of stored interpolation type.
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
