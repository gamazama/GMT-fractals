/**
 * img2grad/trace — sample the colour journey along a path through the image, with a
 * perpendicular gaussian band, then smooth along arc length. The path is either the
 * 2-handle straight line (x0/y0→x1/y1) or a freehand polyline (`path.points`), and can
 * optionally be fitted with a Catmull-Rom spline. Plus `autoPath`, which scans 24
 * diametric lines and picks the best progression × monotonicity − wiggle.
 *
 * The straight-line + arc-smoothing path is byte-identical to the original 2-point port
 * (single segment ⇒ constant perpendicular, t = i/255), so existing extractions are
 * unchanged; the polyline/spline generalises it. Everything stays DETERMINISTIC.
 */

import { clamp, type ImageModel, type TracePath, type Pt } from './common';
import type { Lab } from '../oklab';

export interface TraceParams {
  /** Half-width of the perpendicular sampling band (px). */
  bandWidth: number;
  /** Arc-length smoothing radius (0 = none). */
  smoothing: number;
  /** Fit a Catmull-Rom spline through the path points (smooth curve) vs straight segments. */
  catmullRom?: boolean;
}

/** Control points in pixel space: the freehand polyline if present, else the 2-handle line. */
const controlPoints = (path: TracePath, w: number, h: number): Pt[] => {
  const src =
    path.points && path.points.length >= 2
      ? path.points
      : [{ x: path.x0, y: path.y0 }, { x: path.x1, y: path.y1 }];
  return src.map((p) => ({ x: p.x * (w - 1), y: p.y * (h - 1) }));
};

/** Fixed subdivisions per Catmull-Rom span — deterministic (no adaptive/random stepping). */
const SPLINE_SUB = 24;

const catmull1 = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t,
    t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/**
 * Dense pixel-space polyline for the path. With `catmullRom` and ≥3 control points, fits
 * a uniform Catmull-Rom spline (reflected endpoints) and subdivides each span; otherwise
 * returns the control points as straight segments. Used for BOTH sampling and the
 * on-image preview, so the drawn curve and the sampled colours always match.
 */
export const tracePolyline = (path: TracePath, w: number, h: number, catmullRom = false): Pt[] => {
  const ctrl = controlPoints(path, w, h);
  if (!catmullRom || ctrl.length < 3) return ctrl;
  const n = ctrl.length;
  const reflect = (a: Pt, b: Pt): Pt => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y });
  const ext = [reflect(ctrl[0], ctrl[1]), ...ctrl, reflect(ctrl[n - 1], ctrl[n - 2])];
  const out: Pt[] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1],
      p1 = ext[i],
      p2 = ext[i + 1],
      p3 = ext[i + 2];
    const last = i === ext.length - 3;
    const steps = SPLINE_SUB + (last ? 1 : 0); // include the final endpoint once
    for (let k = 0; k < steps; k++) {
      const t = k / SPLINE_SUB;
      out.push({ x: catmull1(p0.x, p1.x, p2.x, p3.x, t), y: catmull1(p0.y, p1.y, p2.y, p3.y, t) });
    }
  }
  return out;
};

interface PathSample {
  px: number;
  py: number;
  nx: number;
  ny: number;
}

/** 256 positions + unit perpendiculars walked by arc length along a dense polyline. */
const walkPath = (dense: Pt[]): PathSample[] => {
  const cum = [0];
  for (let i = 1; i < dense.length; i++)
    cum.push(cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const total = cum[cum.length - 1] || 1;
  const out: PathSample[] = [];
  let seg = 0;
  for (let i = 0; i < 256; i++) {
    const s = (i / 255) * total;
    while (seg < dense.length - 2 && cum[seg + 1] < s) seg++;
    const segLen = cum[seg + 1] - cum[seg] || 1;
    const ft = clamp((s - cum[seg]) / segLen, 0, 1);
    const a = dense[seg],
      b = dense[seg + 1] ?? dense[seg];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    out.push({ px: a.x + dx * ft, py: a.y + dy * ft, nx: -dy / len, ny: dx / len });
  }
  return out;
};

/** Sample 256 Lab triples along `path` with a perpendicular band + arc smoothing. */
export const sampleTrace = (model: ImageModel, path: TracePath, { bandWidth, smoothing, catmullRom }: TraceParams): Lab[] => {
  const { w, h, lab } = model,
    bw = bandWidth,
    sm = smoothing;
  const samples = walkPath(tracePolyline(path, w, h, catmullRom));
  const out: Lab[] = [];
  for (let i = 0; i < 256; i++) {
    const { px, py, nx, ny } = samples[i];
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
