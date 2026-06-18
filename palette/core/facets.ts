/**
 * facets — perceptual quality metrics for a 256-step gradient ramp, normalised to
 * 0..1 per the five picker quality axes (qL/qC/qCov/qRb/qWarm). These are what make
 * the QualityRangePad filters actually carve the catalog.
 *
 * Ported from the palette-lab refine.py metric definitions (see memory
 * project_softology_palette_param) — the load-bearing, measured ones:
 *   • texture/complexity = OKLab HIGH-FREQUENCY residual after a width-9 low-pass
 *     (smooth hf<0.012, banded hf>0.055) — NOT a Douglas-Peucker band count.
 *   • rainbow = chroma-weighted HUE SPREAD = 360 − largest empty arc on a 36-bin
 *     hue wheel (bin occupied if >5% of peak weight). Banding-agnostic.
 *   • warmth = mean OKLab a (warm = +a).
 * Each axis is normalised so HIGHER = the pad's "hi" label (light / vivid / complex /
 * rainbow / warm). Normalisers are constants below — tuned against the real catalog.
 */

import { rgbToOklab, type RGB } from './oklab';
import { clamp01 } from '../../utils/stopOps';

export interface Facets {
  /** qL — dark(0) → light(1). */
  lightness: number;
  /** qC — muted(0) → vivid(1). */
  chroma: number;
  /** qCov — simple(0) → complex(1) (texture / bandedness). */
  complexity: number;
  /** qRb — single-hue(0) → rainbow(1) (chroma-weighted hue spread). */
  rainbow: number;
  /** qWarm — cool(0) → warm(1). */
  warmth: number;
  /** Raw descriptors (for sorting / arranging / debug). */
  raw: {
    meanL: number;
    meanC: number;
    hf: number;
    hueSpreadDeg: number;
    /** Chroma-weighted dominant hue, degrees 0..360. */
    meanHue: number;
    meanA: number;
    hueOrder: number;
  };
}

// --- normalisers (value units → 0..1) — tuned against the catalog (see harness) ---
const CHROMA_FULL = 0.16; // mean OKLab chroma that reads as fully "vivid"
const HF_FULL = 0.07; // hf that reads as fully "complex/banded"
const WARM_HALF = 0.12; // |mean a| at the cool/warm extremes
const HUE_BINS = 36;
const CHROMA_FLOOR = 0.04; // samples below this chroma are treated as achromatic for hue stats

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** Width-w box low-pass (odd w), edge-clamped. */
const lowpass = (vals: number[], w: number): number[] => {
  const h = w >> 1;
  const n = vals.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = -h; k <= h; k++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      s += vals[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
};

export const computeFacets = (ramp: RGB[]): Facets => {
  const n = ramp.length;
  const L: number[] = new Array(n);
  const A: number[] = new Array(n);
  const B: number[] = new Array(n);
  const C: number[] = new Array(n);
  const H: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = rgbToOklab(ramp[i]);
    L[i] = o.L;
    A[i] = o.a;
    B[i] = o.b;
    C[i] = Math.hypot(o.a, o.b);
    H[i] = Math.atan2(o.b, o.a);
  }

  const meanL = mean(L);
  const meanC = mean(C);
  const meanA = mean(A);

  // texture hf — residual magnitude after a width-9 OKLab low-pass.
  const lpL = lowpass(L, 9), lpA = lowpass(A, 9), lpB = lowpass(B, 9);
  let hfSum = 0;
  for (let i = 0; i < n; i++) {
    hfSum += Math.hypot(L[i] - lpL[i], A[i] - lpA[i], B[i] - lpB[i]);
  }
  const hf = hfSum / n;

  // chroma-weighted hue wheel → spread = 360 − largest empty arc.
  const bins = new Array<number>(HUE_BINS).fill(0);
  for (let i = 0; i < n; i++) {
    if (C[i] < CHROMA_FLOOR) continue;
    const bin = Math.floor((((H[i] + Math.PI) / (2 * Math.PI)) * HUE_BINS)) % HUE_BINS;
    bins[(bin + HUE_BINS) % HUE_BINS] += C[i];
  }
  const peak = Math.max(...bins);
  let hueSpreadDeg = 0;
  if (peak > 0) {
    const occupied = bins.map((w) => (w > 0.05 * peak ? 1 : 0));
    // largest run of consecutive empty bins, circular
    let largestEmpty = 0;
    if (occupied.some((o) => o === 1)) {
      let run = 0;
      for (let i = 0; i < HUE_BINS * 2; i++) {
        if (occupied[i % HUE_BINS] === 0) {
          run++;
          if (run > largestEmpty) largestEmpty = run;
        } else {
          run = 0;
        }
      }
      largestEmpty = Math.min(largestEmpty, HUE_BINS);
    } else {
      largestEmpty = HUE_BINS;
    }
    hueSpreadDeg = (HUE_BINS - largestEmpty) * (360 / HUE_BINS);
  }

  // hue order — of the colourful samples, fraction of distinct-hue steps that keep
  // rotating the same circular direction (1 = orderly sweep, ~0.5 = confetti).
  const hueOrder = computeHueOrder(C, H);

  // chroma-weighted dominant hue (circular mean) → degrees 0..360
  let hx = 0, hy = 0;
  for (let i = 0; i < n; i++) {
    if (C[i] < CHROMA_FLOOR) continue;
    hx += C[i] * Math.cos(H[i]);
    hy += C[i] * Math.sin(H[i]);
  }
  const meanHue = ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360;

  return {
    lightness: clamp01(meanL),
    chroma: clamp01(meanC / CHROMA_FULL),
    complexity: clamp01(hf / HF_FULL),
    rainbow: clamp01(hueSpreadDeg / 360),
    warmth: clamp01((meanA + WARM_HALF) / (2 * WARM_HALF)),
    raw: { meanL, meanC, hf, hueSpreadDeg, meanHue, meanA, hueOrder },
  };
};

const computeHueOrder = (C: number[], H: number[]): number => {
  // distinct-hue-bin run sequence over colourful samples
  const seq: number[] = [];
  let last = -999;
  for (let i = 0; i < C.length; i++) {
    if (C[i] < CHROMA_FLOOR) continue;
    const bin = Math.floor((((H[i] + Math.PI) / (2 * Math.PI)) * HUE_BINS)) % HUE_BINS;
    if (bin !== last) {
      seq.push(bin);
      last = bin;
    }
  }
  if (seq.length < 3) return 0;
  let pos = 0, neg = 0;
  for (let i = 1; i < seq.length; i++) {
    let d = seq[i] - seq[i - 1];
    // shortest circular step
    if (d > HUE_BINS / 2) d -= HUE_BINS;
    if (d < -HUE_BINS / 2) d += HUE_BINS;
    if (d > 0) pos++;
    else if (d < 0) neg++;
  }
  const total = pos + neg;
  return total === 0 ? 0 : Math.max(pos, neg) / total;
};

/** A filter window per axis (the QualityRangePad [a,b] values), keyed by axis id. */
export interface FilterWindows {
  qL?: [number, number];
  qC?: [number, number];
  qCov?: [number, number];
  qRb?: [number, number];
  qWarm?: [number, number];
}

/** True if a gradient's facets fall inside every active (non-[0,1]) filter window. */
export const passesFilters = (f: Facets, w: FilterWindows): boolean => {
  const test = (val: number, win?: [number, number]) => !win || (val >= win[0] && val <= win[1]);
  return (
    test(f.lightness, w.qL) &&
    test(f.chroma, w.qC) &&
    test(f.complexity, w.qCov) &&
    test(f.rainbow, w.qRb) &&
    test(f.warmth, w.qWarm)
  );
};
