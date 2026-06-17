/**
 * img2grad/ingest — turn (already-downsampled) RGBA pixels into an ImageModel:
 * per-pixel OKLab, 5-bit colour bins with a centre-prior, global-colour-contrast
 * saliency, and a capped display cloud.
 *
 * The DOM-side caller (ImageStage) does the canvas downsample to ≤160px max edge
 * (fast + denoises) and passes the resulting ImageData here; this stays pure so the
 * determinism harness can feed synthetic pixel arrays directly.
 *
 * Verbatim port of the standalone `ingest()`.
 */

import { rgbToOklab, oklabToRgbSafe } from '../oklab';
import type { Bin, CloudPoint, ImageModel } from './common';

/** Max-edge target for the downsampled working image. */
export const INGEST_MAX_EDGE = 160;

/**
 * Build an ImageModel from RGBA pixel data. `data` is length w*h*4 (sRGB 0-255 +
 * alpha). Pixels with alpha < 8 contribute to the per-pixel lab buffer but not to
 * the bins (matches the standalone).
 */
export const ingestPixels = (data: Uint8ClampedArray | Uint8Array, w: number, h: number): ImageModel => {
  const lab = new Float32Array(w * h * 3);
  const cx = (w - 1) / 2,
    cy = (h - 1) / 2,
    sig2 = 2 * (0.42 * Math.max(w, h)) ** 2;
  const map = new Map<number, { cnt: number; L: number; a: number; bb: number; cen: number }>();

  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      al = data[i + 3];
    const o = rgbToOklab({ r, g, b });
    lab[p * 3] = o.L;
    lab[p * 3 + 1] = o.a;
    lab[p * 3 + 2] = o.b;
    if (al < 8) continue;
    const px = p % w,
      py = (p / w) | 0;
    const cw = Math.exp(-((px - cx) ** 2 + (py - cy) ** 2) / sig2);
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let e = map.get(key);
    if (!e) {
      e = { cnt: 0, L: 0, a: 0, bb: 0, cen: 0 };
      map.set(key, e);
    }
    e.cnt++;
    e.L += o.L;
    e.a += o.a;
    e.bb += o.b;
    e.cen += cw;
  }

  const bins: Bin[] = [];
  for (const e of map.values()) {
    bins.push({ L: e.L / e.cnt, a: e.a / e.cnt, b: e.bb / e.cnt, cnt: e.cnt, cen: e.cen / e.cnt, scon: 0, sal: 0, w: 0 });
  }

  // saliency = global colour contrast (vs the most frequent bins) blended with the centre-prior
  const ref = bins.slice().sort((p, q) => q.cnt - p.cnt).slice(0, 160);
  let smin = 1e9,
    smax = -1e9,
    cmin = 1e9,
    cmax = -1e9;
  for (const bi of bins) {
    let s = 0;
    for (const rj of ref) {
      const dl = bi.L - rj.L,
        da = bi.a - rj.a,
        db = bi.b - rj.b;
      s += rj.cnt * Math.sqrt(dl * dl + da * da + db * db);
    }
    bi.scon = s;
    if (s < smin) smin = s;
    if (s > smax) smax = s;
    if (bi.cen < cmin) cmin = bi.cen;
    if (bi.cen > cmax) cmax = bi.cen;
  }
  for (const bi of bins) {
    const sc = (bi.scon - smin) / ((smax - smin) || 1),
      cc = (bi.cen - cmin) / ((cmax - cmin) || 1);
    bi.sal = 0.7 * sc + 0.3 * cc;
  }

  // cloud display subset (cap ~1600 points, keep heaviest)
  const cloud: CloudPoint[] = bins
    .slice()
    .sort((p, q) => q.cnt - p.cnt)
    .slice(0, 1600)
    .map((b) => {
      const rgb = oklabToRgbSafe(b);
      return { L: b.L, a: b.a, b: b.b, r: rgb.r, g: rgb.g, bl: rgb.b, cnt: b.cnt };
    });

  const maxcnt = bins.reduce((m, b) => (b.cnt > m ? b.cnt : m), 1);
  return { w, h, lab, bins, cloud, maxcnt };
};
