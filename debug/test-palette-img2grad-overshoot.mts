/**
 * Regression: distill + Golden hour must never produce an undefined ramp entry.
 *
 * Bug: resample()'s `at()` could land on i === n-1 when a target overshot the last
 * coordinate (mass-coordinate rounding, exposed by Golden hour reweighting node
 * masses), reading nodes[n] (undefined) → the ramp poisoned with an undefined Lab →
 * `TypeError: can't access property "L" of undefined` in the downstream stop fitter.
 *
 * This sweeps Golden hour finely across its full range (× a range of colour counts)
 * over several synthetic images, asserting every extracted ramp is 256 finite RGB and
 * that fitRampToStops never throws.
 */

import { ingestPixels, extract, type Img2GradParams } from '../palette/core/img2grad';
import { fitRampToStops } from '../palette/core/stopFit';
import type { TracePath } from '../palette/core/img2grad/common';

const PATH: TracePath = { x0: 0, y0: 0, x1: 1, y1: 1 };

// A few synthetic images with different colour distributions (these change the bin
// masses, which is what makes the overshoot value-dependent).
const makeImage = (kind: number, w = 64, h = 64): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = 0, g = 0, b = 0;
      const u = x / (w - 1), v = y / (h - 1);
      if (kind === 0) { r = u * 255; g = v * 255; b = 128; }
      else if (kind === 1) { r = (u < 0.5 ? 20 : 240); g = v * 255; b = 255 - u * 255; }
      else if (kind === 2) { r = Math.sin(u * 6.28) * 127 + 128; g = Math.cos(v * 6.28) * 127 + 128; b = (u * v) * 255; }
      else { r = v * 30; g = v * 200; b = v * 255; } // very dark → bright (stresses golden-hour L weighting)
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
};

const baseParams: Img2GradParams = {
  mode: 'distill', goldenHour: 0, spacing: 0.5, reverse: false,
  colours: 8, saliency: 0.45, tonalDetail: 5, chromaBoost: 1, bandWidth: 8, smoothing: 3,
};

let checks = 0, fails = 0;
const isFiniteRGB = (c: unknown): boolean =>
  !!c && typeof c === 'object' && ['r', 'g', 'b'].every((k) => Number.isFinite((c as Record<string, number>)[k]));

for (let kind = 0; kind < 4; kind++) {
  const data = makeImage(kind);
  const model = ingestPixels(data, 64, 64);
  for (let colours = 2; colours <= 12; colours++) {
    for (let g = -1; g <= 1.0001; g += 0.01) {
      for (const spacing of [0, 0.5, 1]) {
        const gh = Math.round(g * 1000) / 1000;
        const params = { ...baseParams, colours, goldenHour: gh, spacing };
        checks++;
        try {
          const { ramp } = extract(model, PATH, params);
          if (ramp.length !== 256 || !ramp.every(isFiniteRGB)) {
            fails++;
            if (fails <= 5) console.error(`  undefined/short ramp: kind=${kind} colours=${colours} gh=${gh} spacing=${spacing}`);
            continue;
          }
          fitRampToStops(ramp, { targetDE: 0.02, maxStops: 32 }); // must not throw
        } catch (e) {
          fails++;
          if (fails <= 5) console.error(`  THREW: kind=${kind} colours=${colours} gh=${gh} spacing=${spacing} :: ${(e as Error).message}`);
        }
      }
    }
  }
}

console.log(`\n${checks} extractions swept (distill × golden-hour × colours × spacing × 4 images)`);
if (fails === 0) {
  console.log('✓ ALL PASS — no undefined ramp entries, no fitter throws');
  process.exit(0);
} else {
  console.error(`✗ ${fails} FAILURES`);
  process.exit(1);
}
