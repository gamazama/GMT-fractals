/**
 * gradientMapMode — the GRADIENT MAP fullscreen mode: the Extract image recoloured through the
 * working gradient (the classic duotone / gradient-map look).
 *
 * Every pixel's LUMINANCE picks a colour from the ramp: black takes the ramp's first colour,
 * white its last, everything between rides the curve. Structure survives, palette is replaced.
 * It is the one mode whose subject is the user's own photograph rather than pure geometry, and
 * it is the first (and only) consumer of the registry's `cpuRaster` kind — which the seam's
 * author wrote for exactly this case and left unused: "for modes that genuinely own their
 * pixels (an imported image)".
 *
 * ── Which pixels, and which luminance ───────────────────────────────────────────────────
 * The source is `imageStore.thumb`, the ≤1920 px DISPLAY canvas — NOT `imageStore.model`,
 * which is the ≤160 px downsample the colour maths runs on (see `img2grad/decode.ts`). At 160
 * px a wallpaper would be a mosaic; the thumb is the highest-resolution copy the app keeps, so
 * a 4K export is a clean upscale of ~1920 px of real detail rather than of a thumbnail. If the
 * export is bigger than the thumb, it IS an upscale — the app never held the original file.
 *
 * Luminance is **Rec. 709 luma on the gamma-encoded sRGB bytes**: `0.2126R' + 0.7152G' +
 * 0.0722B'`. Chosen over OKLab L deliberately: it is the definition Photoshop-style gradient
 * maps use (so a familiar image maps the way people expect), and it costs one dot product per
 * pixel instead of a cube root — which matters at 8.3 MPx, on the main thread, per repaint.
 *
 * The image is COVER-fitted (aspect-fill, centred) so a wallpaper is full-bleed at any export
 * aspect, and sampled bilinearly.
 *
 * ── Params ──────────────────────────────────────────────────────────────────────────────
 * `mapStrength` (0..1) blends back toward the original photo — 0 is the untouched image, 1 the
 * full duotone; `mapInvert` flips the lookup. Both are flat-optional `GeometryParams` keys, so
 * they thread through the same gate every other mode uses and default to a full, uninverted map.
 *
 * @assumption `raster` reads the image from `palette/store/imageStore` rather than from `ctx`,
 *   which the mode seam's second `@assumption` otherwise forbids. The seam carries no image
 *   channel and adding one would change a frozen interface for a single consumer. The read is
 *   a `getState()` snapshot, so the function stays deterministic for a given (image, ctx) —
 *   but it is NOT a pure function of `ctx` alone, and nothing in the repo checks that. The
 *   overlay keeps the on-screen render honest by including the thumb in its repaint key.
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the cpuRaster kind + the Stage face)
 * @see palette/core/img2grad/decode.ts (where `thumb` comes from and how big it is)
 * @see plans/ge-v2-design.md §5.7 (Wallpaper — Gradient Map)
 */

import React from 'react';
import { ScalarInput } from '../../../components/inputs/ScalarInput';
import { DEFAULT_BACKGROUND, GEOM_DEFAULTS } from '../../../palette/core/rampGeometry';
import { useImageStore } from '../../../palette/store/imageStore';
import {
  setFullscreenGeomParam,
  useFullscreenState,
} from '../../../palette/store/fullscreenStore';
import type { FullscreenMode, FullscreenModeContext } from '../modeRegistry';

/** The decoded source pixels, cached against the thumb canvas that produced them. `getImageData`
 *  on a ~1920² canvas is a few milliseconds and the export path can ask for the same pixels
 *  twice in a row (on-screen repaint, then the offscreen render), so caching by identity is
 *  worth the four fields. Reset whenever a different (or no) thumb is in the store. */
interface SourcePixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
let cacheKey: HTMLCanvasElement | null = null;
let cachePixels: SourcePixels | null = null;

/** Read (and cache) the Extract image's pixels, or null when no image is loaded. */
const readSourcePixels = (): SourcePixels | null => {
  const thumb = useImageStore.getState().thumb;
  if (!thumb || !thumb.width || !thumb.height) {
    cacheKey = null;
    cachePixels = null;
    return null;
  }
  if (thumb === cacheKey && cachePixels) return cachePixels;
  const ctx = thumb.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    const img = ctx.getImageData(0, 0, thumb.width, thumb.height);
    cacheKey = thumb;
    cachePixels = { data: img.data, width: thumb.width, height: thumb.height };
    return cachePixels;
  } catch {
    // A tainted canvas (cross-origin source) cannot be read back — behave like "no image".
    cacheKey = null;
    cachePixels = null;
    return null;
  }
};

/** Fill an RGBA buffer with the flat background — the no-image state, over which the mode's
 *  `Stage` layer prints its hint. */
const fillBackground = (w: number, h: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4);
  const { r, g, b } = DEFAULT_BACKGROUND;
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  }
  return out;
};

/**
 * The mode's pixel producer. Cover-fits the source image over `w × h`, takes each pixel's
 * Rec. 709 luma, looks the ramp up at that position (linearly interpolated between the 256
 * entries, so the map is smooth rather than posterised), and blends back toward the original
 * by `mapStrength`.
 */
const rasterGradientMap = (ctx: FullscreenModeContext): Uint8ClampedArray => {
  const w = Math.max(1, ctx.width);
  const h = Math.max(1, ctx.height);
  const src = readSourcePixels();
  const ramp = ctx.ramp;
  if (!src || ramp.length === 0) return fillBackground(w, h);

  const strength = Math.min(1, Math.max(0, ctx.params.mapStrength ?? GEOM_DEFAULTS.mapStrength));
  const invert = (ctx.params.mapInvert ?? GEOM_DEFAULTS.mapInvert) >= 0.5;
  const last = ramp.length - 1;

  // Cover fit: scale so the image FILLS the frame, centred, cropping the overhang.
  const scale = Math.max(w / src.width, h / src.height);
  const drawW = src.width * scale;
  const drawH = src.height * scale;
  const offX = (w - drawW) / 2;
  const offY = (h - drawH) / 2;

  // Per-axis source coordinates, precomputed once (the inner loop is 8 MPx at 4K). The upper
  // bounds go through Math.max(0, …) so a 1×1 source cannot produce a negative coordinate.
  const sxMax = Math.max(0, src.width - 1.0001);
  const syMax = Math.max(0, src.height - 1.0001);
  const sxs = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    sxs[x] = Math.min(sxMax, Math.max(0, (x + 0.5 - offX) / scale - 0.5));
  }
  const out = new Uint8ClampedArray(w * h * 4);
  const sd = src.data;
  const sw = src.width;

  for (let y = 0; y < h; y++) {
    const sy = Math.min(syMax, Math.max(0, (y + 0.5 - offY) / scale - 0.5));
    const y0 = sy | 0;
    const y1 = y0 + 1 < src.height ? y0 + 1 : y0;
    const fy = sy - y0;
    const rowA = y0 * sw;
    const rowB = y1 * sw;
    let o = y * w * 4;
    for (let x = 0; x < w; x++, o += 4) {
      const sx = sxs[x];
      const x0 = sx | 0;
      const x1 = x0 + 1 < sw ? x0 + 1 : x0;
      const fx = sx - x0;
      // Bilinear on the four neighbours (sRGB bytes — this is a resample, not a colour mix,
      // and matching the browser's own drawImage behaviour keeps the preview consistent).
      const iAA = (rowA + x0) << 2;
      const iAB = (rowA + x1) << 2;
      const iBA = (rowB + x0) << 2;
      const iBB = (rowB + x1) << 2;
      const wAA = (1 - fx) * (1 - fy);
      const wAB = fx * (1 - fy);
      const wBA = (1 - fx) * fy;
      const wBB = fx * fy;
      const sr = sd[iAA] * wAA + sd[iAB] * wAB + sd[iBA] * wBA + sd[iBB] * wBB;
      const sg = sd[iAA + 1] * wAA + sd[iAB + 1] * wAB + sd[iBA + 1] * wBA + sd[iBB + 1] * wBB;
      const sb = sd[iAA + 2] * wAA + sd[iAB + 2] * wAB + sd[iBA + 2] * wBA + sd[iBB + 2] * wBB;

      // Rec. 709 luma on the gamma-encoded bytes → ramp position.
      let t = (0.2126 * sr + 0.7152 * sg + 0.0722 * sb) / 255;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      if (invert) t = 1 - t;

      const f = t * last;
      const i0 = f | 0;
      const i1 = i0 < last ? i0 + 1 : last;
      const fr = f - i0;
      const c0 = ramp[i0];
      const c1 = ramp[i1];
      const mr = c0.r + (c1.r - c0.r) * fr;
      const mg = c0.g + (c1.g - c0.g) * fr;
      const mb = c0.b + (c1.b - c0.b) * fr;

      out[o] = sr + (mr - sr) * strength;
      out[o + 1] = sg + (mg - sg) * strength;
      out[o + 2] = sb + (mb - sb) * strength;
      out[o + 3] = 255;
    }
  }
  return out;
};

// ── Controls (toolbar) ───────────────────────────────────────────────────────────────────────

const GradientMapControls: React.FC = () => {
  const fs = useFullscreenState();
  const strength = fs.geomParams.mapStrength ?? GEOM_DEFAULTS.mapStrength;
  const invert = (fs.geomParams.mapInvert ?? GEOM_DEFAULTS.mapInvert) >= 0.5;
  const hasImage = useImageStore((s) => s.thumb) !== null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-32">
        <ScalarInput
          value={strength}
          onChange={(v) => setFullscreenGeomParam('mapStrength', v)}
          min={0}
          max={1}
          step={0.01}
          defaultValue={GEOM_DEFAULTS.mapStrength}
          label="Strength"
          trackHeight={14}
        />
      </div>
      <button
        onClick={() => setFullscreenGeomParam('mapInvert', invert ? 0 : 1)}
        title="Invert the luminance lookup — dark pixels take the gradient's last colour instead of its first"
        aria-pressed={invert}
        className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
          invert
            ? 'border-secondary/40 bg-secondary/20 text-secondary'
            : 'border-line/10 text-fg-tertiary hover:text-fg hover:bg-line/[0.06]'
        }`}
      >
        {invert ? '◐ Inverted' : '◑ Invert'}
      </button>
      {!hasImage && (
        <span className="text-[11px] text-fg-dim">no image loaded</span>
      )}
    </div>
  );
};

// ── Stage layer (the empty state) ────────────────────────────────────────────────────────────

/** Centred hint over the (flat background) canvas when there is nothing to map. DOM, not
 *  canvas, so it can never bake into an exported PNG. */
const GradientMapStage: React.FC = () => {
  const thumb = useImageStore((s) => s.thumb);
  if (thumb) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-6 pointer-events-none">
      <div className="text-[13px] text-fg-secondary">Drop an image on Extract first</div>
      <div className="text-[11px] text-fg-muted">
        Gradient map recolours your image through this gradient.
      </div>
    </div>
  );
};

// ── the mode ─────────────────────────────────────────────────────────────────────────────────

export const GRADIENT_MAP_MODE: FullscreenMode = {
  id: 'gradientMap',
  label: 'Gradient map',
  kind: 'cpuRaster',
  hint: 'Your Extract image, recoloured through the gradient · Esc to close',
  paramFields: [
    { key: 'mapStrength', label: 'Strength', min: 0, max: 1, step: 0.01, default: GEOM_DEFAULTS.mapStrength },
    { key: 'mapInvert', label: 'Invert', min: 0, max: 1, step: 1, default: GEOM_DEFAULTS.mapInvert },
  ],
  raster: rasterGradientMap,
  Controls: GradientMapControls,
  Stage: GradientMapStage,
};
