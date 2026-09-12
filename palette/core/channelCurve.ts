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
import { dpIndices, fitKeysToSamples, optimalKnotIndices, reTangentBezier } from '../../utils/CurveFitting';

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
  /**
   * How `rampToBezierTrack` chooses WHERE the keys go. `'dp'` (default) is Douglas-Peucker,
   * which measures each sample against the chord; `'optimal'` asks the question the fit
   * actually cares about — can one cubic cover this span within eps — so it needs fewer keys
   * for the same tolerance, at ~10x the (still sub-millisecond) cost. Unlike `'dp'` it also
   * holds eps on the curve it stores, rather than on a chord.
   *
   * An OPTION rather than something read from a preference here, because `palette/core` is
   * the portable, store-free half of the library. The caller that owns the preference
   * (`fitChannelsToTracks`) resolves it; see `palette/store/curveFitPref.ts`.
   */
  placement?: 'dp' | 'optimal';
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
 * come from the same Douglas-Peucker placement as rampToTrack; the tangents are
 * then SOLVED against the samples each span covers (`fitKeysToSamples`). Sampling
 * (trackToRamp) is unchanged — it evaluates whatever curve the user shapes.
 *
 * The tangents used to come from `reTangentBezier`'s Catmull-Rom pass, which reads only the
 * neighbouring key VALUES and never the ~250 samples between them. On an 8-bit channel —
 * a staircase — its monotonicity guard flattened every key's arms, and a flat arm governing
 * a long span made the curve sag: a plain black→white gradient baked back 0.141 low in
 * lightness at mid-ramp. Fitting the tangents removes that and needs far fewer keys for the
 * same fidelity (measured over the 25 built-in presets, matched at OKLab ΔE 0.02: 94.9 keys
 * per gradient → 16.3). See `fitKeysToSamples` for the mechanism and the guard.
 *
 * `reTangentBezier` is unchanged and still owns the AUTHORING convention (add-key, the
 * pencil's seam heal, the Bias tool). Fitting and authoring want different tangents; this is
 * the fitting one.
 */
export const rampToBezierTrack = (
  vals: number[],
  id: string,
  label: string,
  opts: RampToTrackOptions = {},
): Track => {
  const eps = opts.eps ?? 0.01;
  const last = vals.length - 1;
  const idx = opts.placement === 'optimal' ? optimalKnotIndices(vals, eps) : dpIndices(vals, eps);
  const keyframes = fitKeysToSamples(vals, idx, (i) => (i / last) * CURVE_FRAMES, id);
  return { id, type: 'float', label, keyframes, color: opts.color };
};

/** A run of identical samples: a BAND in a stepped gradient (`start`..`end` inclusive). */
export interface FlatRun {
  start: number;
  end: number;
}

/**
 * The bands of a stepped source: runs where EVERY channel is exactly constant for at least
 * `minRun` samples. Exact equality, not a tolerance — the channels come from a rendered
 * ramp, so a band's texels are byte-identical and a smooth ramp's never are (the same rule
 * as the stop fitter's plateau seeding, grep detectPlateaus in stopFit.ts). Returns [] when
 * fewer than `minBanded` of the samples sit in runs (a smooth ramp with one flat patch is
 * not banded; giving it Step keys would put a hold where the owner sees a slope).
 */
export const flatRuns = (channels: number[][], minRun = 4, minBanded = 0.6): FlatRun[] => {
  const n = channels[0]?.length ?? 0;
  const same = (i: number, j: number) => channels.every((c) => c[i] === c[j]);
  const runs: FlatRun[] = [];
  let start = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || !same(i - 1, i)) {
      if (i - start >= minRun) runs.push({ start, end: i - 1 });
      start = i;
    }
  }
  const flat = runs.reduce((a, r) => a + (r.end - r.start + 1), 0);
  return flat >= minBanded * n ? runs : [];
};

/**
 * Fit a channel that HAS bands (Phase C.4, owner: "curves fitting also needs to support
 * stepped"): each run becomes one Step key at its start (a hold — the engine's evaluator
 * returns k1's value across a Step segment); the samples between runs are DP-fitted with
 * Linear keys (exact to eps). A final key at the last frame closes
 * the last hold. Sampling back (trackToRamp) reproduces every band exactly.
 */
export const rampToSteppedTrack = (
  vals: number[],
  runs: FlatRun[],
  id: string,
  label: string,
  opts: RampToTrackOptions = {},
): Track => {
  if (runs.length === 0) return rampToBezierTrack(vals, id, label, opts);
  const eps = opts.eps ?? 0.01;
  const last = vals.length - 1;
  const frameOf = (i: number) => (i / last) * CURVE_FRAMES;
  const keys: Keyframe[] = [];
  let n = 0;
  const push = (i: number, interpolation: Keyframe['interpolation']) => {
    keys.push({ id: `${id}-k${n++}`, frame: frameOf(i), value: vals[i], interpolation });
  };
  let cursor = 0;
  for (const r of runs) {
    // the gap before this run: a smooth stretch, fitted; its last vertex is the sample
    // before the run so the slope reaches the band's edge, then the band holds
    if (r.start > cursor) {
      const gap = vals.slice(cursor, r.start);
      const idx = dpIndices(gap, eps);
      for (const i of idx) push(cursor + i, 'Linear');
    }
    push(r.start, 'Step');
    cursor = r.end + 1;
  }
  if (cursor <= last) {
    const gap = vals.slice(cursor);
    const idx = dpIndices(gap, eps);
    for (const i of idx) push(cursor + i, 'Linear');
  }
  if (keys[keys.length - 1].frame < CURVE_FRAMES) push(last, 'Step');
  // The gap keys are Linear, not Bezier: DP's error bound holds only for straight
  // segments, and Catmull-Rom tangents computed against a neighbouring HOLD overshoot
  // (measured: 0.08 on a 0.6 slope between two bands). The editor converts on request.
  //
  // `opts.placement` therefore does NOT reach the gaps, only the unbanded delegation above:
  // `optimalKnotIndices` accepts a span when a CUBIC covers it within eps, and these keys
  // interpolate LINEARLY — knots chosen for a curve, joined by straight lines, would break
  // the very bound eps is here to give.
  return { id, type: 'float', label, keyframes: keys, color: opts.color };
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
