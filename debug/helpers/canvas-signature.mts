/**
 * canvas-signature — shared change-detection helpers for the Gradient Explorer fullscreen
 * smokes (liquify / geometry handles): a downsampled pixel signature of the overlay's
 * canvas, a mean-abs-diff between signatures, and a coarse colour-variety count.
 *
 * One copy so every smoke agrees on the canvas selector and what "render changed" means.
 */
import type { Page } from 'playwright';

export const OVERLAY_CANVAS_SELECTOR = '[data-testid="fullscreen-gradient-overlay"] canvas';

/** Downsampled pixel signature of the GL/2D canvas (12×12 sampled grid), for change detection. */
export async function signature(page: Page): Promise<number[]> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return [];
    const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
    const c2 = tmp.getContext('2d')!; c2.drawImage(canvas, 0, 0);
    const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
    const sig: number[] = [];
    const N = 12;
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const x = ((gx + 0.5) / N * tmp.width) | 0, y = ((gy + 0.5) / N * tmp.height) | 0;
      const i = (y * tmp.width + x) * 4;
      sig.push(data[i], data[i + 1], data[i + 2]);
    }
    return sig;
  }, OVERLAY_CANVAS_SELECTOR);
}

/** Mean absolute per-channel difference between two signatures (-1 on shape mismatch/empty). */
export const diff = (a: number[], b: number[]): number => {
  if (a.length !== b.length || !a.length) return -1;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

/** Coarse colour variety: distinct 4-bit RGB buckets across the signature samples. */
export const variety = (a: number[]): number => {
  const seen = new Set<string>();
  for (let i = 0; i < a.length; i += 3) seen.add(`${a[i] >> 4},${a[i + 1] >> 4},${a[i + 2] >> 4}`);
  return seen.size;
};
