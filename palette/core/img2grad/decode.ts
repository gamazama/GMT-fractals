/**
 * img2grad/decode — DOM-side image decode → downsample → ingest, shared by the
 * Image stage's drag/paste/file loader AND the scene document round-trip
 * (imageDocument.ts) so both reconstruct an ImageModel + display thumbnail the
 * exact same way.
 *
 * Unlike the rest of img2grad this is NOT pure — it touches `Image` + canvas — so it
 * lives in its own module rather than the deterministic core. It resolves with both:
 *   • model — the ≤160px ingested ImageModel (the colour maths the pipeline reads).
 *   • thumb — a ≤1920px display canvas (the crisp source pane; the panes downscale it).
 * Path / mode / loading bookkeeping stays with the caller.
 */

import { ingestPixels, INGEST_MAX_EDGE } from './ingest';
import type { ImageModel } from './common';

/** Max longest-edge for the display thumbnail (the colour ingest uses INGEST_MAX_EDGE). */
export const THUMB_MAX_EDGE = 1920;

/**
 * Decode an image `src` (a data URL or object URL) and build its ImageModel + thumb.
 * Rejects if the image fails to load or a 2D context is unavailable — callers surface
 * that as their own "could not load image" feedback.
 */
export const decodeAndIngest = (
  src: string,
): Promise<{ model: ImageModel; thumb: HTMLCanvasElement }> =>
  new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () =>
      requestAnimationFrame(() => {
        try {
          // Working copy for the colour maths: downsample to ≤160px (fast + denoises).
          const scale = Math.min(1, INGEST_MAX_EDGE / Math.max(im.width, im.height));
          const w = Math.max(1, Math.round(im.width * scale));
          const h = Math.max(1, Math.round(im.height * scale));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const cx = c.getContext('2d', { willReadFrequently: true });
          if (!cx) {
            reject(new Error('no 2d context'));
            return;
          }
          cx.drawImage(im, 0, 0, w, h);
          const data = cx.getImageData(0, 0, w, h).data;
          const model = ingestPixels(data, w, h);

          // Display thumbnail — kept near-full resolution (≤1920px longest edge) so the
          // source pane stays crisp; the DPR-aware pane canvas downscales it cleanly.
          const ts = Math.min(1, THUMB_MAX_EDGE / Math.max(im.width, im.height));
          const tw = Math.max(1, Math.round(im.width * ts));
          const th = Math.max(1, Math.round(im.height * ts));
          const t = document.createElement('canvas');
          t.width = tw;
          t.height = th;
          const tctx = t.getContext('2d');
          if (tctx) {
            tctx.imageSmoothingEnabled = true;
            tctx.imageSmoothingQuality = 'high';
            tctx.drawImage(im, 0, 0, tw, th);
          }

          resolve({ model, thumb: t });
        } catch (e) {
          reject(e);
        }
      });
    im.onerror = () => reject(new Error('could not load image'));
    im.src = src;
  });
