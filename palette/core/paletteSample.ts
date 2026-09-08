/**
 * paletteSample — the discrete "palette face" of a gradient, and the ramp-similarity
 * metric behind "More like this". Pure functions over a 256-step RGB ramp (the one
 * interchange the palette suite speaks); no DOM, no store, deterministic.
 *
 * A palette is N swatches sampled from the ramp by a RULE:
 *   • 'even'        — t = k / (n − 1): equal spacing along the ramp.
 *   • 'perceptual'  — equal OKLab arc length between neighbours, so a ramp that changes
 *                     quickly in one region gets more swatches there. Falls back to
 *                     'even' on a flat ramp (zero arc length).
 *   • 'stops'       — one swatch per stop of the source GradientConfig, at the stop's
 *                     position (sorted). Needs the config; callers without stops get 'even'.
 * Every swatch carries its `t` so a host can turn a swatch into a real stop at that
 * position (the v2 hero's "palette is a view until touched" rule — see
 * plans/ge-v2-design.md §5.1).
 *
 * `rampDistance` sums OKLab ΔE at `samples` evenly spaced texels — cheap enough to
 * rank a 10k-entry catalog against one pick on every click.
 *
 * @invariant `samplePalette` returns exactly `clampCount(n)` swatches for the 'even' and
 *   'perceptual' rules with t[0] === 0 and t[last] === 1, and never NaN — proven by:
 *   `npx tsx debug/test-palette-sample.mts` ("even: count", "perceptual: endpoints",
 *   "flat ramp: perceptual falls back to even, no NaN").
 */

import { rgbToOklab, type RGB } from './oklab';
import type { GradientConfig } from '../../types';

export type PaletteRule = 'stops' | 'even' | 'perceptual';

export interface PaletteSwatch {
  /** Position along the ramp, 0..1. */
  t: number;
  color: RGB;
}

export const PALETTE_MIN = 2;
export const PALETTE_MAX = 64;

/** Swatch count as the rules accept it: an integer in [PALETTE_MIN, PALETTE_MAX]. */
export const clampCount = (n: number): number =>
  Math.max(PALETTE_MIN, Math.min(PALETTE_MAX, Math.round(Number.isFinite(n) ? n : PALETTE_MIN)));

const at = (ramp: RGB[], t: number): PaletteSwatch => {
  const last = ramp.length - 1;
  const i = Math.max(0, Math.min(last, Math.round(t * last)));
  return { t, color: ramp[i] };
};

/** Equal spacing along t. */
export const sampleEven = (ramp: RGB[], n: number): PaletteSwatch[] => {
  if (!ramp.length) return [];
  const count = clampCount(n);
  return Array.from({ length: count }, (_, k) => at(ramp, k / (count - 1)));
};

/**
 * Equal OKLab arc length between neighbours. The first and last swatch are pinned to
 * the ramp ends so the palette always spans the whole gradient; the interior swatches
 * sit where the cumulative colour change crosses each k/(n−1) fraction of the total.
 */
export const samplePerceptual = (ramp: RGB[], n: number): PaletteSwatch[] => {
  if (!ramp.length) return [];
  const count = clampCount(n);
  const last = ramp.length - 1;
  if (last === 0) return sampleEven(ramp, count);
  const cum: number[] = [0];
  let prev = rgbToOklab(ramp[0]);
  for (let i = 1; i <= last; i++) {
    const cur = rgbToOklab(ramp[i]);
    cum.push(cum[i - 1] + Math.hypot(cur.L - prev.L, cur.a - prev.a, cur.b - prev.b));
    prev = cur;
  }
  const total = cum[last];
  if (!(total > 0)) return sampleEven(ramp, count);
  const out: PaletteSwatch[] = [];
  let i = 0;
  for (let k = 0; k < count; k++) {
    if (k === 0) { out.push({ t: 0, color: ramp[0] }); continue; }
    if (k === count - 1) { out.push({ t: 1, color: ramp[last] }); continue; }
    const target = (k / (count - 1)) * total;
    while (i < last && cum[i] < target) i++;
    out.push({ t: i / last, color: ramp[i] });
  }
  return out;
};

/** One swatch per stop, at the stop's (sorted) position. Colour is read off the ramp. */
export const sampleAtStops = (ramp: RGB[], config: GradientConfig): PaletteSwatch[] => {
  if (!ramp.length) return [];
  const ts = config.stops
    .map((s) => Math.max(0, Math.min(1, s.position)))
    .sort((a, b) => a - b);
  return ts.map((t) => at(ramp, t));
};

/** Dispatch on the rule. 'stops' without a config (or with no stops) degrades to 'even'. */
export const samplePalette = (
  ramp: RGB[],
  rule: PaletteRule,
  n: number,
  config?: GradientConfig | null,
): PaletteSwatch[] => {
  if (rule === 'stops' && config && config.stops.length >= 2) return sampleAtStops(ramp, config);
  if (rule === 'perceptual') return samplePerceptual(ramp, n);
  return sampleEven(ramp, n);
};

/**
 * POINTWISE distance between two ramps: the sum of OKLab ΔE at `samples` evenly spaced
 * texels. 0 for identical ramps; symmetric; unequal lengths compared by t.
 *
 * Not the "More like this" metric — `similarityProbe` below is, since this one calls a
 * reversed or shifted twin a stranger. What this is still good for is TEXEL IDENTITY: two
 * ramps that should be byte-for-byte the same score exactly 0 (the picker harness checks
 * `sampleRampBuffer` that way).
 */
export const rampDistance = (a: RGB[], b: RGB[], samples = 16): number => {
  if (!a.length || !b.length) return Infinity;
  const k = Math.max(2, samples | 0);
  let d = 0;
  for (let s = 0; s < k; s++) {
    const t = s / (k - 1);
    const pa = rgbToOklab(a[Math.round(t * (a.length - 1))]);
    const pb = rgbToOklab(b[Math.round(t * (b.length - 1))]);
    d += Math.hypot(pa.L - pb.L, pa.a - pb.a, pa.b - pb.b);
  }
  return d;
};

// ── "More like this" — similarity that agrees with the eye ─────────────────────────────
// `rampDistance` above is pointwise: a reversed twin, a copy shifted by a few texels, or the
// same colours in another order all read as FAR (owner, 2026-09-07 evening: "actually show
// you gradients that are similar to yours"). The probe below scores three things and
// sums them, every term in mean-ΔE units so they weigh alike:
//   • SHAPE — the colour sequence, with tolerance for a shift or stretch: dynamic time
//     warping over `SIM_SAMPLES` OKLab samples within a ±`SIM_WARP` band, taken against the
//     ramp AND its reverse (a reversed gradient is the same gradient, the other way);
//   • PALETTE — what colours are in it regardless of order: the samples of each ramp
//     sorted by lightness, matched rank for rank;
//   • STRUCTURE — how banded it is: the share of adjacent samples that are (near) identical,
//     so a stepped gradient sits with stepped ones, smooth with smooth.
// Weights: shape 0.5, palette 0.4, structure 0.1 (a full bands-vs-smooth mismatch costs
// about as much as a 0.1 ΔE shift everywhere). Build ONE probe per anchor; score 11k
// entries against it in a few ms (32 samples, a 7-wide DTW band).

export const SIM_SAMPLES = 32;
const SIM_WARP = 3;
const SIM_FLAT_DE = 0.012;

type Lab = { L: number; a: number; b: number };
interface RampDescriptor {
  seq: Lab[];
  byL: Lab[];
  banded: number;
}

const labs = (ramp: RGB[], k: number): Lab[] => {
  const out: Lab[] = new Array(k);
  for (let s = 0; s < k; s++) out[s] = rgbToOklab(ramp[Math.round((s / (k - 1)) * (ramp.length - 1))]);
  return out;
};
const dE = (p: Lab, q: Lab) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);

export const describeRamp = (ramp: RGB[], samples = SIM_SAMPLES): RampDescriptor => {
  const seq = ramp.length >= samples || ramp.length < 2 ? labs(ramp, samples) : labs(ramp, samples);
  let flat = 0;
  for (let i = 1; i < seq.length; i++) if (dE(seq[i - 1], seq[i]) < SIM_FLAT_DE) flat++;
  return { seq, byL: [...seq].sort((p, q) => p.L - q.L), banded: flat / (seq.length - 1) };
};

/** Banded DTW between two equal-length sequences, normalised per sample. */
const dtw = (a: Lab[], b: Lab[], band: number): number => {
  const n = a.length;
  const INF = Number.POSITIVE_INFINITY;
  let prev = new Float64Array(n).fill(INF);
  let cur = new Float64Array(n).fill(INF);
  for (let i = 0; i < n; i++) {
    cur.fill(INF);
    const lo = Math.max(0, i - band), hi = Math.min(n - 1, i + band);
    for (let j = lo; j <= hi; j++) {
      const c = dE(a[i], b[j]);
      const best = i === 0 && j === 0 ? 0 : Math.min(i > 0 ? prev[j] : INF, j > 0 ? cur[j - 1] : INF, i > 0 && j > 0 ? prev[j - 1] : INF);
      cur[j] = c + best;
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n - 1] / n;
};

/** The anchor's side of the comparison, built once. */
export interface SimilarityProbe {
  distance: (ramp: RGB[]) => number;
}
export const similarityProbe = (anchor: RGB[], samples = SIM_SAMPLES): SimilarityProbe => {
  const A = describeRamp(anchor, samples);
  const Arev = [...A.seq].reverse();
  return {
    distance: (ramp) => {
      const B = describeRamp(ramp, samples);
      const shape = Math.min(dtw(A.seq, B.seq, SIM_WARP), dtw(Arev, B.seq, SIM_WARP));
      let pal = 0;
      for (let i = 0; i < samples; i++) pal += dE(A.byL[i], B.byL[i]);
      pal /= samples;
      const structure = Math.abs(A.banded - B.banded);
      return 0.5 * shape + 0.4 * pal + 0.1 * structure;
    },
  };
};

// ── Positions as STATE (owner review 2026-09-03) ───────────────────────────────────────
// The v2 hero keeps the palette as an array of sample positions the user can drag along
// the ramp; the rules above are LAYOUTS that produce such an array, not modes. A swatch is
// therefore a position, and its colour is whatever the ramp shows there right now.

/** Positions of a rule layout (the `t` of each swatch), for N swatches. */
export const layoutPositions = (rule: PaletteRule, n: number, ramp: RGB[], config?: GradientConfig | null): number[] =>
  samplePalette(ramp.length ? ramp : [{ r: 0, g: 0, b: 0 }], rule, n, config).map((s) => s.t);

/** Colour every position off the ramp (nearest texel). */
export const swatchesAt = (ramp: RGB[], positions: readonly number[]): PaletteSwatch[] => {
  if (!ramp.length) return [];
  const last = ramp.length - 1;
  return positions.map((t) => {
    const c = Math.max(0, Math.min(1, t));
    return { t: c, color: ramp[Math.round(c * last)] };
  });
};

/** Insert one position at the midpoint of the largest gap (ends included), so "+" always
 *  lands where the palette is thinnest. Returns a new sorted array; the input is untouched. */
export const insertAtLargestGap = (positions: readonly number[]): number[] => {
  const sorted = positions.map((t) => Math.max(0, Math.min(1, t))).sort((a, b) => a - b);
  if (sorted.length === 0) return [0.5];
  // Gaps: [0, first], between neighbours, [last, 1].
  let bestStart = 0;
  let bestEnd = sorted[0];
  let best = sorted[0] - 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const g = sorted[i + 1] - sorted[i];
    if (g > best) { best = g; bestStart = sorted[i]; bestEnd = sorted[i + 1]; }
  }
  if (1 - sorted[sorted.length - 1] > best) { bestStart = sorted[sorted.length - 1]; bestEnd = 1; }
  const out = sorted.slice();
  out.push((bestStart + bestEnd) / 2);
  return out.sort((a, b) => a - b);
};

/** Move one position, keeping the array sorted; returns the new array and the moved index. */
export const movePosition = (positions: readonly number[], index: number, t: number): { positions: number[]; index: number } => {
  const c = Math.max(0, Math.min(1, t));
  const out = positions.slice();
  if (index < 0 || index >= out.length) return { positions: out, index };
  out[index] = c;
  const order = out.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  return { positions: order.map(([v]) => v), index: order.findIndex(([, i]) => i === index) };
};
