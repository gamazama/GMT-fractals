/**
 * channelCurve — the bridge between a gradient channel (256 values over t∈[0,1])
 * and the animation graph editor's Track model. This is what lets the Generator
 * reuse GMT's polished graph editor (GraphCanvas + GraphRenderer + the Keyframe
 * bezier model) to edit a gradient's L / C / h channel curves.
 *
 * Decision (with user): reuse the PURE graph pieces with the generator's OWN local
 * curve state — the live animation timeline is untouched. The graph editor is
 * frame-based, so t∈[0,1] maps to frame 0..CURVE_FRAMES (1:1 with the 256 samples).
 *
 *   rampToTrack — fit a channel's 256 values to a sparse, editable Track
 *                 (Douglas-Peucker keyframe placement; error bounded by eps).
 *   trackToRamp — sample a (possibly user-edited) Track back to 256 values via the
 *                 engine's own evaluateTrackValue — so whatever curve the user
 *                 shapes is exactly what the gradient gets.
 */

import type { Track, Keyframe } from '../../types';
import { evaluateTrackValue } from '../../utils/timelineUtils';
import { dpIndices, reTangentBezier } from '../../utils/CurveFitting';

// reTangentBezier lives in the shared CurveFitting util (so the graph editors'
// Bias/Pencil tools share it); re-exported here for the palette's existing callers.
export { reTangentBezier };

/** t∈[0,1] ↔ frame 0..255, so frame index == sample index (clean 1:1). */
export const CURVE_FRAMES = 255;

export interface RampToTrackOptions {
  /** Simplification tolerance in value units — smaller = more keyframes, closer fit. */
  eps?: number;
  color?: string;
  /** Keyframe interpolation for the initial fit. Linear is exact between vertices;
   *  the user can convert to Bezier in the editor. */
  interpolation?: Keyframe['interpolation'];
}

/** Fit a 256-value channel to an editable Track. */
export const rampToTrack = (
  vals: number[],
  id: string,
  label: string,
  opts: RampToTrackOptions = {},
): Track => {
  const eps = opts.eps ?? 0.01;
  const interpolation = opts.interpolation ?? 'Linear';
  const idx = dpIndices(vals, eps);
  const keyframes: Keyframe[] = idx.map((i, n) => ({
    id: `${id}-k${n}`,
    frame: (i / (vals.length - 1)) * CURVE_FRAMES,
    value: vals[i],
    interpolation,
  }));
  return { id, type: 'float', label, keyframes, color: opts.color };
};

/**
 * Fit a 256-value channel to an editable Track with smooth, DRAGGABLE Bezier
 * keyframes — the curve-editor's authoring representation. Keyframe POSITIONS
 * come from the same Douglas-Peucker placement as rampToTrack (error bounded by
 * eps); each is then given Catmull-Rom-style auto-tangents (AnimationMath) so the
 * curve is smooth out of the box and the user can drag the handles. Sampling
 * (trackToRamp) is unchanged — it evaluates whatever curve the user shapes.
 */
export const rampToBezierTrack = (
  vals: number[],
  id: string,
  label: string,
  opts: RampToTrackOptions = {},
): Track => {
  const eps = opts.eps ?? 0.01;
  const idx = dpIndices(vals, eps);
  const base: Keyframe[] = idx.map((i, n) => ({
    id: `${id}-k${n}`,
    frame: (i / (vals.length - 1)) * CURVE_FRAMES,
    value: vals[i],
    interpolation: 'Bezier' as const,
  }));
  return { id, type: 'float', label, keyframes: reTangentBezier(base), color: opts.color };
};

/** Sample a Track back to `count` evenly-spaced values over t∈[0,1]. */
export const trackToRamp = (track: Track, count = 256): number[] => {
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const frame = (i / (count - 1)) * CURVE_FRAMES;
    out[i] = evaluateTrackValue(track.keyframes, frame, false, false);
  }
  return out;
};
