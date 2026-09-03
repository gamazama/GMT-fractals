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
 * Similarity of two ramps: the sum of OKLab ΔE at `samples` evenly spaced texels.
 * 0 for identical ramps; symmetric. Ramps of unequal length are compared by t.
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
