/**
 * img2grad/common — shared types + geometry helpers for image→gradient extraction.
 *
 * Ported from the standalone `img2grad_template.html`. Everything here is PURE and
 * DETERMINISTIC (no Math.random, no DOM): the same image pixels + settings always
 * yield byte-identical output, which is what kept the standalone ribbon from
 * flip-flopping between k-means local minima on every slider drag.
 */

import type { Lab } from '../oklab';

/** A quantised colour bin (5 bits/channel) accumulated over the downsampled image. */
export interface Bin {
  L: number;
  a: number;
  b: number;
  /** Pixel count that fell in this bin. */
  cnt: number;
  /** Mean centre-prior weight (0..1) of the pixels in this bin. */
  cen: number;
  /** Global-colour-contrast saliency (raw, pre-normalise). */
  scon: number;
  /** Blended saliency 0..1 (0.7·contrast + 0.3·centre). */
  sal: number;
  /** Per-extraction weight (set by applyWeights). */
  w: number;
}

/** A single point in the OKLab cloud display (capped subset of the bins). */
export interface CloudPoint {
  L: number;
  a: number;
  b: number;
  /** sRGB for drawing the point. */
  r: number;
  g: number;
  bl: number;
  cnt: number;
}

/** The ingested image: per-pixel OKLab + accumulated bins + display cloud. */
export interface ImageModel {
  w: number;
  h: number;
  /** w*h*3 OKLab triples (L,a,b interleaved) — Trace samples from this. */
  lab: Float32Array;
  bins: Bin[];
  cloud: CloudPoint[];
  maxcnt: number;
}

/** A colour node on the extracted path (Lab + relative dwell mass). */
export interface ColorNode extends Lab {
  mass: number;
}

/** A point in normalised image coords [0..1]. */
export interface Pt {
  x: number;
  y: number;
}

/** Trace path in normalised image coords [0..1]. */
export interface TracePath {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /**
   * Freehand polyline (normalised). When present with ≥2 points it supersedes the
   * 2-handle straight line; x0/y0/x1/y1 stay synced to the first/last point as the
   * fallback representation (so the 2-handle path is always valid).
   */
  points?: Pt[];
}

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Squared OKLab distance between two Lab points. */
export const dist2 = (p: Lab, q: Lab): number => {
  const dl = p.L - q.L,
    da = p.a - q.a,
    db = p.b - q.b;
  return dl * dl + da * da + db * db;
};
