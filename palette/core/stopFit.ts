/**
 * stopFit — the GMT-adapted curve fitter. Turns a 256-step RGB ramp (from the
 * generator, picker, or img2grad) into a compact GMT GradientStop[] that, when
 * rendered by GMT's own gradient pipeline (blendSpace 'oklab'), reproduces the
 * ramp within a perceptual tolerance.
 *
 * This is the "feed it" seam AND the user's curve-fitting adaptation: GMT stops
 * are a UNIFIED colour path (one knot sequence, no separate H/L/C curves) and
 * interpolate via OKLCh-polar between stops — there are no bezier handles. So the
 * advanced fitter's value carries over as two ideas, not its bezier output:
 *   1. CORNER PRE-SEED — detect hard transitions (big adjacent OKLab ΔE) and seed
 *      a stop on each side so bands stay crisp (the prototype's corner detection).
 *   2. REFINE-TO-WORST-RENDERED-ERROR — repeatedly insert a stop at the position of
 *      greatest ΔE between GMT's *rendered* gradient and the target, until under
 *      tolerance. Strictly better than Douglas-Peucker, which measures linear-RGB
 *      error blind to OKLCh interpolation.
 */

import type { GradientStop, GradientConfig } from '../../types';
import { rgbToOklab, oklabDistance, type RGB } from './oklab';
import { renderStopsToRamp, rgbToHex } from './gmtGradient';

export interface StopFitOptions {
  /** Perceptual stop tolerance (OKLab ΔE). Lower = more stops, higher fidelity. */
  targetDE?: number;
  /** Hard cap on stop count. */
  maxStops?: number;
  /** Seed stops at detected hard transitions (bands). */
  seedCorners?: boolean;
  /** Adjacent-sample ΔE above which a position counts as a hard transition. */
  cornerDE?: number;
}

const DEFAULTS: Required<StopFitOptions> = {
  targetDE: 0.02,
  maxStops: 32,
  seedCorners: true,
  // Only TRUE posterization edges become 'step'. Set high so gradual (but
  // colourful) rainbow transitions stay smooth — marking those as step creates
  // a hard edge that the refine loop then has to undo with extra stops.
  cornerDE: 0.09,
};

/**
 * Hard transitions in the ramp. For each adjacent pair (i-1, i) whose OKLab ΔE
 * exceeds cornerDE, both indices are seeded and `i-1` is flagged as a STEP edge:
 * GMT's 'step' interpolation holds the left colour until the next stop then jumps,
 * reproducing a crisp band with two stops instead of many. This is what lets the
 * unified-stop fitter match banded palettes cheaply (no per-channel curves).
 */
const detectCorners = (lab: RGB[], cornerDE: number): { seeds: number[]; stepLeft: Set<number> } => {
  const set = new Set<number>();
  const stepLeft = new Set<number>();
  for (let i = 1; i < 256; i++) {
    if (oklabDistance(lab[i - 1], lab[i]) > cornerDE) {
      if (i - 1 > 0) {
        set.add(i - 1);
        stepLeft.add(i - 1);
      }
      if (i < 255) set.add(i);
    }
  }
  return { seeds: [...set].sort((a, b) => a - b), stepLeft };
};

const mkStop = (
  idx: number,
  ramp: RGB[],
  id: number,
  interpolation: GradientStop['interpolation'] = 'linear',
): GradientStop => ({
  id: `s${id}`,
  position: idx / 255,
  color: rgbToHex(ramp[idx]),
  bias: 0.5,
  interpolation,
});

/**
 * Fit a 256-step ramp to GMT stops. `ramp` is 256 sRGB colours (0-255).
 * Returns a GradientConfig (stops + srgb/oklab) ready to feed GMT's gradient system.
 */
export const fitRampToStops = (ramp: RGB[], opts: StopFitOptions = {}): GradientConfig => {
  const o = { ...DEFAULTS, ...opts };
  if (ramp.length !== 256) throw new Error(`fitRampToStops expects 256 samples, got ${ramp.length}`);

  let nextId = 0;
  const used = new Set<number>([0, 255]);
  const stops: GradientStop[] = [mkStop(0, ramp, nextId++), mkStop(255, ramp, nextId++)];

  // 1) Corner pre-seed — concentrate stops at hard band edges up front, marking
  //    the left side of each jump as a STEP edge for crisp bands.
  if (o.seedCorners) {
    const { seeds, stepLeft } = detectCorners(ramp, o.cornerDE);
    // If the corners alone exceed the budget, subsample them EVENLY across positions
    // rather than letting the earliest ones fill maxStops — otherwise a region dense
    // with edges (heavy posterize / noise) starves every later position of a stop and
    // the gradient truncates spatially. Under budget (the usual case) all are kept.
    const budget = Math.max(0, o.maxStops - stops.length);
    const chosen =
      seeds.length > budget
        ? Array.from({ length: budget }, (_, j) => seeds[Math.floor((j * seeds.length) / budget)])
        : seeds;
    for (const idx of chosen) {
      if (used.has(idx) || stops.length >= o.maxStops) continue;
      used.add(idx);
      stops.push(mkStop(idx, ramp, nextId++, stepLeft.has(idx) ? 'step' : 'linear'));
    }
    stops.sort((a, b) => a.position - b.position);
  }

  // 2) Refine to worst rendered error.
  let guard = 0;
  while (stops.length < o.maxStops && guard++ < 512) {
    const rendered = renderStopsToRamp(stops, 'oklab', 'srgb');
    let worst = -1;
    let worstDE = o.targetDE;
    for (let i = 1; i < 255; i++) {
      if (used.has(i)) continue;
      const d = oklabDistance(rendered[i], ramp[i]);
      if (d > worstDE) {
        worstDE = d;
        worst = i;
      }
    }
    if (worst < 0) break; // everything under tolerance
    used.add(worst);
    stops.push(mkStop(worst, ramp, nextId++));
    stops.sort((a, b) => a.position - b.position);
  }

  return { stops, colorSpace: 'srgb', blendSpace: 'oklab' };
};

/** Convenience: max + mean OKLab ΔE of a fitted config vs the target ramp. */
export const measureFit = (config: GradientConfig, ramp: RGB[]): { maxDE: number; meanDE: number; stops: number } => {
  const rendered = renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace);
  let max = 0;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    const d = oklabDistance(rendered[i], ramp[i]);
    if (d > max) max = d;
    sum += d;
  }
  return { maxDE: max, meanDE: sum / 256, stops: config.stops.length };
};

/** Helper: convert a packed RGBA/RGB Uint8Array (256 texels) to RGB[256]. */
export const bufferToRamp = (buf: Uint8Array, stride = 4): RGB[] => {
  const out: RGB[] = new Array(256);
  for (let i = 0; i < 256; i++) out[i] = { r: buf[i * stride], g: buf[i * stride + 1], b: buf[i * stride + 2] };
  return out;
};

// re-export for harness convenience
export { rgbToOklab };
