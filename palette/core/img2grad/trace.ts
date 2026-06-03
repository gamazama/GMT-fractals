/**
 * img2grad/trace — sample the colour journey along a line through the image, with a
 * perpendicular gaussian band, then smooth along arc length. Plus `autoPath`, which
 * scans 24 diametric lines and picks the one with the best progression × monotonicity
 * − wiggle. Verbatim port of the standalone `sampleTrace()` / `autoPath()`.
 */

import { clamp, type ImageModel, type TracePath } from './common';
import type { Lab } from '../oklab';

export interface TraceParams {
  /** Half-width of the perpendicular sampling band (px). */
  bandWidth: number;
  /** Arc-length smoothing radius (0 = none). */
  smoothing: number;
}

/** Sample 256 Lab triples along `path` with a perpendicular band + arc smoothing. */
export const sampleTrace = (model: ImageModel, path: TracePath, { bandWidth, smoothing }: TraceParams): Lab[] => {
  const { w, h, lab } = model,
    bw = bandWidth,
    sm = smoothing;
  const x0 = path.x0 * (w - 1),
    y0 = path.y0 * (h - 1),
    x1 = path.x1 * (w - 1),
    y1 = path.y1 * (h - 1);
  const dx = x1 - x0,
    dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len,
    ny = dx / len; // unit perpendicular
  const out: Lab[] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255,
      px = x0 + dx * t,
      py = y0 + dy * t;
    let sL = 0,
      sa = 0,
      sb = 0,
      sw = 0;
    for (let o = -bw; o <= bw; o++) {
      const wgt = Math.exp(-(o * o) / (2 * (bw * 0.6 + 0.5) ** 2));
      const sxp = clamp(Math.round(px + nx * o), 0, w - 1),
        syp = clamp(Math.round(py + ny * o), 0, h - 1),
        idx = (syp * w + sxp) * 3;
      sL += lab[idx] * wgt;
      sa += lab[idx + 1] * wgt;
      sb += lab[idx + 2] * wgt;
      sw += wgt;
    }
    out.push({ L: sL / sw, a: sa / sw, b: sb / sw });
  }
  // smooth along arc length
  if (sm > 0) {
    const k = sm;
    return out.map((_, i) => {
      let sL = 0,
        sa = 0,
        sb = 0,
        n = 0;
      for (let j = -k; j <= k; j++) {
        const q = out[clamp(i + j, 0, 255)];
        const wj = 1 - Math.abs(j) / (k + 1);
        sL += q.L * wj;
        sa += q.a * wj;
        sb += q.b * wj;
        n += wj;
      }
      return { L: sL / n, a: sa / n, b: sb / n };
    });
  }
  return out;
};

/** Find the best diametric path across the image (progression × monotonicity − wiggle). */
export const autoPath = (model: ImageModel): TracePath => {
  const { w, h, lab } = model;
  const samp = (ax: number, ay: number, bx: number, by: number): number[][] => {
    const out: number[][] = [];
    for (let i = 0; i < 48; i++) {
      const t = i / 47,
        px = clamp(Math.round(ax + (bx - ax) * t), 0, w - 1),
        py = clamp(Math.round(ay + (by - ay) * t), 0, h - 1),
        idx = (py * w + px) * 3;
      out.push([lab[idx], lab[idx + 1], lab[idx + 2]]);
    }
    return out;
  };
  const score = (s: number[][]): number => {
    let prog = 0,
      wig = 0,
      mono = 0;
    const dirs: number[][] = [];
    for (let i = 1; i < s.length; i++) {
      const dl = s[i][0] - s[i - 1][0],
        da = s[i][1] - s[i - 1][1],
        db = s[i][2] - s[i - 1][2];
      const d = Math.sqrt(dl * dl + da * da + db * db);
      prog += d;
      dirs.push([dl, da, db, d]);
    }
    for (let i = 1; i < dirs.length; i++) {
      const a = dirs[i - 1],
        b = dirs[i];
      const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / ((a[3] * b[3]) || 1e-6);
      mono += clamp(dot, -1, 1);
      wig += Math.abs(1 - dot);
    }
    return prog * (0.5 + (0.5 * mono) / Math.max(1, dirs.length - 1)) - 0.15 * wig;
  };
  let best = -1e9,
    bp: TracePath = { x0: 0.12, y0: 0.5, x1: 0.88, y1: 0.5 };
  const cx = (w - 1) / 2,
    cy = (h - 1) / 2,
    R = Math.min(w, h) * 0.46;
  for (let k = 0; k < 24; k++) {
    const ang = (k / 24) * Math.PI;
    const ax = cx - Math.cos(ang) * R,
      ay = cy - Math.sin(ang) * R,
      bx = cx + Math.cos(ang) * R,
      by = cy + Math.sin(ang) * R;
    const sc = score(samp(ax, ay, bx, by));
    if (sc > best) {
      best = sc;
      bp = {
        x0: clamp(ax / (w - 1), 0, 1),
        y0: clamp(ay / (h - 1), 0, 1),
        x1: clamp(bx / (w - 1), 0, 1),
        y1: clamp(by / (h - 1), 0, 1),
      };
    }
  }
  return bp;
};
