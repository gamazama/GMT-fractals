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
 * 0.0722B'`. Chosen over OKLab L deliberately as the DEFAULT: it is the definition
 * Photoshop-style gradient maps use (so a familiar image maps the way people expect), and it
 * costs one dot product per pixel instead of a cube root — which matters at 8.3 MPx, on the
 * main thread, per repaint.
 *
 * Since 2026-09-08 (Phase W.4) luma is one of SEVEN drivers: `mapChannel` also offers the
 * individual R / G / B bytes and OKLCh's hue / chroma / lightness, which answer questions luma
 * cannot — hue maps by WHAT colour a thing is regardless of how lit it is, chroma separates the
 * vivid subject from a grey ground. The maths is `palette/core/gradientMapChannels.ts` (pure,
 * guarded); this file owns only the pixels. The three OKLab channels pay that cube root, so
 * they are a choice the user makes rather than the default.
 *
 * The image is COVER-fitted (aspect-fill, centred) so a wallpaper is full-bleed at any export
 * aspect, and sampled bilinearly.
 *
 * ── What is resampled (changed 2026-09-08, for speed) ───────────────────────────────────
 * The bilinear now runs on the CHANNEL FIELD, not on the colour: each source pixel's channel
 * value is computed once into a cached scalar field (see `channelFieldFor`) and that field is
 * what gets resampled. For luma and the three RGB channels this is exactly equivalent — they
 * are linear in RGB, so resample-then-extract and extract-then-resample agree to the bit. The
 * three OKLCh channels are not linear, so their values differ marginally from the old order;
 * resampling a scalar field is the more defensible of the two, and it is what makes them
 * affordable at all. The source COLOUR is still read, but only when `mapStrength < 1` asks for
 * a blend back toward the photo — at the default full map, those three bilinear reads are skipped.
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
import { MAP_CHANNELS, mapChannelAt, mapChannelValue, type MapChannel } from '../../../palette/core/gradientMapChannels';
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

/**
 * The per-pixel CHANNEL field, at SOURCE resolution, cached by (image, channel).
 *
 * This is the mode's whole performance story. The channel value of a pixel depends only on the
 * IMAGE and the chosen channel — never on the gradient — but the raster used to recompute it
 * for every output pixel on every repaint, and in split mode the ramp changes on every edit.
 * The three OKLCh channels pay `pow(x, 2.4)` three times and `cbrt` three times per pixel:
 * measured 2026-09-08 at 2560×1440, hue/chroma/lightness cost 420–500 ms a repaint against
 * ~85 ms for luma, and every one of those milliseconds was being spent again to draw the same
 * field in a different set of colours.
 *
 * Computed once per (image, channel) at the source's own size — 1920² at most, which is FEWER
 * pixels than a 4K output and reused across every later repaint — then bilinearly resampled
 * per frame like any other scalar field. One entry: switching channel or image recomputes,
 * which is the rare case; changing the gradient, the strength or the size does not.
 */
let fieldKeySource: SourcePixels | null = null;
let fieldKeyChannel: MapChannel | null = null;
let fieldValues: Float32Array | null = null;

const channelFieldFor = (src: SourcePixels, channel: MapChannel): Float32Array => {
  // Keyed on the SourcePixels object, which `readSourcePixels` already caches by thumb identity
  // — so a new image means a new object means a rebuilt field, with no second key to keep.
  if (fieldValues && fieldKeySource === src && fieldKeyChannel === channel) return fieldValues;
  const n = src.width * src.height;
  const out = new Float32Array(n);
  const d = src.data;
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    out[i] = mapChannelValue(d[o], d[o + 1], d[o + 2], channel);
  }
  fieldKeySource = src;
  fieldKeyChannel = channel;
  fieldValues = out;
  return out;
};

/** Read (and cache) the Extract image's pixels, or null when no image is loaded. */
const readSourcePixels = (): SourcePixels | null => {
  const thumb = useImageStore.getState().thumb;
  if (!thumb || !thumb.width || !thumb.height) {
    cacheKey = null;
    cachePixels = null;
    fieldValues = null;
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
    fieldValues = null;
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
  const channel = mapChannelAt(ctx.params.mapChannel ?? GEOM_DEFAULTS.mapChannel);
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
  // The channel field at source resolution, computed once per (image, channel) — see
  // `channelFieldFor`. Resampling THIS instead of re-deriving the channel per output pixel is
  // what keeps an OKLCh map from costing half a second every time the gradient changes.
  const field = channelFieldFor(src, channel);
  // The source COLOUR is only needed to blend back toward the untouched photo. At the default
  // strength (1, a full map) nothing blends, so the three bilinear reads are skipped outright.
  const needsSource = strength < 1;
  // HUE is an angle, so its field wraps: two neighbouring pixels either side of red read 0.99
  // and 0.01, and a plain bilinear between them lands on 0.5 — cyan, the colour furthest from
  // both. Sampling it wrap-aware (shift every tap to within half a turn of the first, blend,
  // then wrap back) keeps a red edge red. Hoisted out of the loop: only hue pays for it.
  const wraps = channel === 'hue';

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
      const pAA = rowA + x0;
      const pAB = rowA + x1;
      const pBA = rowB + x0;
      const pBB = rowB + x1;
      const wAA = (1 - fx) * (1 - fy);
      const wAB = fx * (1 - fy);
      const wBA = (1 - fx) * fy;
      const wBB = fx * fy;
      let sr = 0, sg = 0, sb = 0;
      if (needsSource) {
        const iAA = pAA << 2, iAB = pAB << 2, iBA = pBA << 2, iBB = pBB << 2;
        sr = sd[iAA] * wAA + sd[iAB] * wAB + sd[iBA] * wBA + sd[iBB] * wBB;
        sg = sd[iAA + 1] * wAA + sd[iAB + 1] * wAB + sd[iBA + 1] * wBA + sd[iBB + 1] * wBB;
        sb = sd[iAA + 2] * wAA + sd[iAB + 2] * wAB + sd[iBA + 2] * wBA + sd[iBB + 2] * wBB;
      }

      // The chosen channel (luma by default) → ramp position, already in [0,1]. Resampled from
      // the cached field with the same bilinear weights the colour would have used.
      const vAA = field[pAA];
      let t: number;
      if (wraps) {
        const near = (v: number): number => v + Math.round(vAA - v); // ±1 turn onto vAA's side
        t = vAA * wAA + near(field[pAB]) * wAB + near(field[pBA]) * wBA + near(field[pBB]) * wBB;
        t -= Math.floor(t);
      } else {
        t = vAA * wAA + field[pAB] * wAB + field[pBA] * wBA + field[pBB] * wBB;
      }
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
  const channelIx = Math.round(fs.geomParams.mapChannel ?? GEOM_DEFAULTS.mapChannel);
  const hasImage = useImageStore((s) => s.thumb) !== null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* WHICH channel drives the lookup. A segmented row rather than a dropdown: the whole
          point is that the seven read as one set you sweep through, and each is one click. */}
      <div className="flex items-center rounded-md border border-line/10 overflow-hidden">
        {MAP_CHANNELS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setFullscreenGeomParam('mapChannel', i)}
            title={`Map the image's ${c.label.toLowerCase()} through the gradient`}
            aria-pressed={i === channelIx}
            className={`px-2 py-1 text-[12px] transition-colors ${
              i === channelIx
                ? 'bg-secondary/20 text-secondary'
                : 'text-fg-tertiary hover:text-fg hover:bg-line/[0.06]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
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
    { key: 'mapChannel', label: 'Channel', min: 0, max: MAP_CHANNELS.length - 1, step: 1, default: GEOM_DEFAULTS.mapChannel },
  ],
  raster: rasterGradientMap,
  Controls: GradientMapControls,
  Stage: GradientMapStage,
};
