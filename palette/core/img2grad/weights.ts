/**
 * img2grad/weights — per-bin weighting (frequency ↔ saliency ↔ golden-hour).
 * Mutates each bin's `w`. Verbatim port of the standalone `applyWeights()`.
 *
 *   saliency 0  → weight by raw frequency (common colours dominate)
 *   saliency 1  → weight by standout colours (the saliency term)
 *   goldenHour  → reweight toward shadows (−) or highlights (+)
 */

import type { Bin } from './common';

export interface WeightParams {
  /** 0 = frequency, 1 = saliency. */
  saliency: number;
  /** −1 = shadows, +1 = highlights. */
  goldenHour: number;
}

export const applyWeights = (bins: Bin[], { saliency, goldenHour }: WeightParams): void => {
  const freqPow = 1 - 0.62 * saliency;
  for (const b of bins) {
    const gold = Math.exp(goldenHour * 1.9 * (b.L - 0.5));
    b.w = Math.pow(b.cnt, freqPow) * Math.pow(b.sal + 0.05, 3 * saliency) * gold;
  }
};
