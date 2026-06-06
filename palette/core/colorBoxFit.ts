/**
 * colorBoxFit — approximate an arbitrary gradient as ColorBox sweep parameters.
 *
 * Frozen-ahead for the P2 drag-drop phase: when a gradient is dropped onto the
 * ColorBox mode, we want to express it (as closely as the per-channel-sweep model
 * allows) as a {L, C, h} start/end + easing triple. This is the pure, deterministic
 * core of that — the UI (selecting a sub-range of the dropped gradient, then calling
 * this on the sliced ramp) lands in P2. Kept DOM/THREE-free like the rest of palette/core.
 *
 * Method: decompose the ramp to OKLCh channels (shared with the generator), take each
 * channel's endpoints as start/end, then least-squares-match the channel's normalized
 * progression against all 25 easing curves and pick the closest. Hue is fitted along
 * the SHORTEST angular path — the same model buildColorBoxRamp reproduces — so the fit
 * is faithful to what ColorBox will actually render (its documented shortest-path-only
 * limitation: a gradient whose hue takes the long way round is approximated, not matched).
 */

import { decomposeRamp, type ColorBoxParams } from './generatorPipeline';
import { EASING_NAMES, getEasing, type EasingName } from './easings';
import type { RGB } from './oklab';

const RAD2DEG = 180 / Math.PI;
const wrap360 = (d: number): number => ((d % 360) + 360) % 360;
/** Shortest signed angular delta from→to, in degrees, in (-180, 180]. */
const shortestDeltaDeg = (from: number, to: number): number => (((to - from) % 360) + 540) % 360 - 180;

/** Treat a channel as flat (easing irrelevant) when its endpoints are this close. */
const FLAT_EPS = 1e-4;

/**
 * Pick the easing whose 0→1 curve best matches `actual` (the channel's progression,
 * already normalized so start maps to 0 and end to 1). Least-squares over the samples.
 * Returns the name and its sum-of-squared-error (so callers can gauge fit quality).
 */
export const bestEasingFor = (actual: number[]): { easing: EasingName; sse: number } => {
  const n = actual.length;
  if (n < 2) return { easing: 'linear', sse: 0 }; // nothing to fit (avoids i/(n-1) → NaN)
  let easing: EasingName = 'linear';
  let bestSse = Infinity;
  for (const name of EASING_NAMES) {
    const f = getEasing(name);
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const d = f(i / (n - 1)) - actual[i];
      sse += d * d;
    }
    if (sse < bestSse) {
      bestSse = sse;
      easing = name;
    }
  }
  return { easing, sse: bestSse };
};

/** Fit a linear-valued channel (L or C): endpoints + the best-matching easing. */
const fitLinearChannel = (vals: number[]): { start: number; end: number; easing: EasingName } => {
  const start = vals[0];
  const end = vals[vals.length - 1];
  if (Math.abs(end - start) < FLAT_EPS) return { start, end, easing: 'linear' };
  const span = end - start;
  return { start, end, easing: bestEasingFor(vals.map((v) => (v - start) / span)).easing };
};

/** Fit the hue channel (radians in → degrees out) along the shortest angular path. */
const fitHueChannel = (hRad: number[]): { start: number; end: number; easing: EasingName } => {
  const start = wrap360(hRad[0] * RAD2DEG);
  const end = wrap360(hRad[hRad.length - 1] * RAD2DEG);
  const total = shortestDeltaDeg(start, end);
  if (Math.abs(total) < FLAT_EPS) return { start, end, easing: 'linear' };
  const norm = hRad.map((h) => shortestDeltaDeg(start, wrap360(h * RAD2DEG)) / total);
  return { start, end, easing: bestEasingFor(norm).easing };
};

/**
 * Approximate a 256-step sRGB ramp as ColorBox sweep params (per-channel start/end +
 * easing). Pass the exact ramp you want fitted — to fit a sub-range of a dropped
 * gradient, slice/resample it to the desired 256 texels first (a P2 UI concern).
 */
export const fitColorBoxToRamp = (ramp: RGB[]): ColorBoxParams => {
  const ch = decomposeRamp(ramp);
  return { L: fitLinearChannel(ch.L), C: fitLinearChannel(ch.C), h: fitHueChannel(ch.h) };
};
