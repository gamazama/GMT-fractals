/**
 * img2grad — image → 256-step gradient extraction (pure, deterministic).
 *
 * Three modes (verbatim algorithm port of the standalone `img2grad_template.html`):
 *   • Distill — saliency-weighted dominant colours, ordered into a smooth ramp.
 *   • Tone    — the image's own colour at each brightness level (lightness spine).
 *   • Trace   — the colour journey along a draggable line through the image.
 *
 * `extract()` mirrors the standalone `extract()`: weight bins → run the mode →
 * resample to 256 (Trace already produces 256) → reverse → gamut-safe OKLab→sRGB.
 * Returns both the sRGB ramp (256) and the Lab ribbon (the cloud line).
 */

import { oklabToRgbSafe, type RGB, type Lab } from '../oklab';
import type { ImageModel, TracePath } from './common';
import { applyWeights } from './weights';
import { distill } from './distill';
import { tone } from './tone';
import { sampleTrace } from './trace';
import { resample } from './resample';

export type Img2GradMode = 'distill' | 'tone' | 'trace';
export const IMG2GRAD_MODES: Img2GradMode[] = ['distill', 'tone', 'trace'];

export interface Img2GradParams {
  mode: Img2GradMode;
  // shared
  goldenHour: number;
  spacing: number;
  reverse: boolean;
  // distill
  colours: number;
  saliency: number;
  // tone
  tonalDetail: number;
  chromaBoost: number;
  // trace
  bandWidth: number;
  smoothing: number;
  /** Fit a Catmull-Rom spline through the freehand path points (Trace only). */
  catmullRom?: boolean;
}

export interface Img2GradResult {
  /** 256 sRGB colours (gamut-safe). */
  ramp: RGB[];
  /** 256 Lab triples (the ribbon drawn through the OKLab cloud). */
  ribbon: Lab[];
}

export const extract = (model: ImageModel, path: TracePath, p: Img2GradParams): Img2GradResult => {
  applyWeights(model.bins, { saliency: p.saliency, goldenHour: p.goldenHour });

  let ribbon: Lab[];
  if (p.mode === 'trace') {
    ribbon = sampleTrace(model, path, { bandWidth: p.bandWidth, smoothing: p.smoothing, catmullRom: p.catmullRom });
  } else {
    const nodes =
      p.mode === 'tone'
        ? tone(model.bins, { tonalDetail: p.tonalDetail, chromaBoost: p.chromaBoost })
        : distill(model.bins, { colours: p.colours });
    ribbon = resample(nodes, p.spacing);
  }

  if (p.reverse) ribbon = ribbon.slice().reverse();
  const ramp = ribbon.map((s) => oklabToRgbSafe(s));
  return { ramp, ribbon };
};

export { ingestPixels, INGEST_MAX_EDGE } from './ingest';
export { autoPath, tracePolyline } from './trace';
export type { ImageModel, TracePath, Pt, ColorNode, Bin, CloudPoint } from './common';
