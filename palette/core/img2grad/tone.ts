/**
 * img2grad/tone — the image's own colour at each brightness level. Buckets bins by
 * lightness, takes a chroma-weighted circular-mean hue + mean chroma per bucket, and
 * sorts dark→light. Unfakeably smooth. Verbatim port of the standalone `tone()`.
 */

import { clamp, type Bin, type ColorNode } from './common';

export interface ToneParams {
  /** Number of lightness buckets along the spine. */
  tonalDetail: number;
  /** Chroma multiplier (vividness of the spine). */
  chromaBoost: number;
}

export const tone = (bins: Bin[], { tonalDetail, chromaBoost }: ToneParams): ColorNode[] => {
  const NB = tonalDetail,
    cb = chromaBoost;
  const accL = new Float64Array(NB),
    acc = new Float64Array(NB),
    sx = new Float64Array(NB),
    sy = new Float64Array(NB),
    sw = new Float64Array(NB);
  for (const b of bins) {
    if (b.w <= 0) continue;
    const C = Math.hypot(b.a, b.b),
      h = Math.atan2(b.b, b.a);
    const bi = clamp(Math.floor(b.L * NB), 0, NB - 1);
    const cw = b.w * (0.15 + C); // chroma-weighted hue mean
    accL[bi] += b.L * b.w;
    acc[bi] += C * b.w;
    sx[bi] += Math.cos(h) * cw;
    sy[bi] += Math.sin(h) * cw;
    sw[bi] += b.w;
  }
  const nodes: ColorNode[] = [];
  for (let i = 0; i < NB; i++) {
    if (sw[i] > 0) {
      const L = accL[i] / sw[i],
        C = (acc[i] / sw[i]) * cb,
        h = Math.atan2(sy[i], sx[i]);
      nodes.push({ L, a: C * Math.cos(h), b: C * Math.sin(h), mass: sw[i] });
    }
  }
  nodes.sort((p, q) => p.L - q.L);
  return nodes;
};
