/**
 * easingThumb — render an easing curve to a small graph, and cache it as a PNG
 * data-URL keyed by name+size. The picker shows these as <img> tiles, mirroring the
 * app-gmt FormulaPicker's thumbnail grid (which renders pre-baked <img> thumbnails) so
 * a later refactor onto a shared thumbnail-grid primitive is mechanical. The DIFFERENCE
 * is the source: fractal thumbs are baked JPEGs on disk; easing curves are cheap to
 * draw, so we rasterise them once on demand and cache the data-URL.
 *
 * `drawEasingCurve` is the single draw routine, shared by the cached thumbnail and the
 * larger hover preview (via GradientHoverPreview's paint callback), so both look identical.
 * DOM-coupled (canvas) → lives in components/, not the DOM-free core/.
 */

import { getEasing, type EasingName } from '../core/easings';

// y domain is padded past [0,1] so the Back family's overshoot stays in frame.
const Y_MIN = -0.18;
const Y_MAX = 1.18;
const PAD = 0.14; // fraction of the box reserved as inset margin

/**
 * Draw an easing curve into a 2D context sized w×h (CSS px). Paints a faint unit-box
 * reference (so overshoot reads relative to [0,1]) and the curve itself. Pure given the
 * context — no caching, no state — so it's reusable for both the thumbnail and the
 * enlarged preview.
 */
export const drawEasingCurve = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fn: (t: number) => number,
  opts?: { stroke?: string; lineWidth?: number; bg?: string },
): void => {
  const stroke = opts?.stroke ?? '#22d3ee';
  const lineWidth = opts?.lineWidth ?? 1.5;
  const insetX = w * PAD;
  const insetY = h * PAD;
  const plotW = w - insetX * 2;
  const plotH = h - insetY * 2;
  // t∈[0,1] → x; eased value (mapped through the padded y domain) → y (canvas y grows down).
  const X = (t: number) => insetX + t * plotW;
  const Y = (v: number) => insetY + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  if (opts?.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, w, h);
  }

  // Faint unit-box reference (the [0,1]×[0,1] region the curve runs between).
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(X(0), Y(1), plotW, Y(0) - Y(1));

  // The curve.
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const STEPS = 48;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = X(t);
    const y = Y(fn(t));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

const cache = new Map<string, string>();

/**
 * Cached PNG data-URL of an easing curve at w×h CSS px (rendered at devicePixelRatio for
 * crispness). Drawn once per name+size, then reused across every channel picker and re-open.
 * Returns '' when there is no DOM (SSR / headless) — callers fall back to a text label.
 */
export const easingThumb = (name: EasingName, w = 56, h = 40): string => {
  if (typeof document === 'undefined') return '';
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const key = `${name}@${w}x${h}@${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawEasingCurve(ctx, w, h, getEasing(name), { bg: '#0b0b0d' });
  const url = cv.toDataURL('image/png');
  cache.set(key, url);
  return url;
};
