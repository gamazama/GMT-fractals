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
import { AnimationMath } from '../../engine/math/AnimationMath';

/** t∈[0,1] ↔ frame 0..255, so frame index == sample index (clean 1:1). */
export const CURVE_FRAMES = 255;

/** Douglas-Peucker on the (frame, value) polyline → kept sample indices (incl. ends). */
const dpIndices = (vals: number[], eps: number): number[] => {
  const n = vals.length;
  if (n <= 2) return vals.map((_, i) => i);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    // Perpendicular distance of each interior point to the chord a→b (in frame/value space).
    const x0 = a, y0 = vals[a], x1 = b, y1 = vals[b];
    const dx = x1 - x0, dy = y1 - y0;
    const denom = Math.hypot(dx, dy) || 1;
    let worst = -1, worstD = eps;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (i - x0) - dx * (vals[i] - y0)) / denom;
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
};

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
 * Recompute Auto (Catmull-Rom) tangents for the Bezier keyframes matched by `pred`
 * (default: every key), leaving Step/Linear and hand-broken (`autoTangent === false`)
 * keys untouched. Shared by the initial fit (rampToBezierTrack), the editor's
 * add-key, and the Bias redistribution — so the "smooth out of the box" convention
 * lives in one place. Expects `keys` pre-sorted by frame (neighbours are array-adjacent).
 */
export const reTangentBezier = (
  keys: Keyframe[],
  pred?: (k: Keyframe, i: number) => boolean,
): Keyframe[] =>
  keys.map((k, n) => {
    if (k.interpolation !== 'Bezier' || k.autoTangent === false) return k;
    if (pred && !pred(k, n)) return k;
    const prev = n > 0 ? keys[n - 1] : undefined;
    const next = n < keys.length - 1 ? keys[n + 1] : undefined;
    const { l, r } = AnimationMath.calculateTangents(k, prev, next, 'Auto');
    return { ...k, leftTangent: l, rightTangent: r, tangentMode: 'Aligned', autoTangent: true };
  });

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
