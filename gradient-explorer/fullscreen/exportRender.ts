/**
 * exportRender — the IMPURE half of "export at size": produce a PNG at an arbitrary
 * resolution WITHOUT touching the visible canvas.
 *
 * The overlay's on-screen surface is sized to the window (capped, DPR-aware). Resizing it to
 * 3840×2160 to grab a wallpaper would resize what the user is looking at, blow the interactive
 * render caps, and leave the stage in a strange state if anything threw. So the export path
 * never touches it:
 *   • compositor modes (cpuField / cpuRaster / glQuad) get a SECOND {@link FullscreenCompositor}
 *     on a detached canvas — one `setSize` + one present + one `toBlob`, then disposed;
 *   • `ownCanvas` modes get their own `renderAt(w, h)` (the additive face on `OwnCanvasHandle`),
 *     because only the mode knows how to re-project its renderer.
 *
 * Supersampling (CPU kinds only) renders at `plan.renderWidth × renderHeight` and box-downsamples
 * through a 2D canvas at `plan.width × height` — `imageSmoothingQuality: 'high'` gives a proper
 * area average on every current browser, which is what kills the stair-stepping on an arch edge.
 *
 * @see gradient-explorer/fullscreen/exportSize.ts (the pure size arithmetic + the 4K cap)
 * @see plans/ge-v2-design.md §5.7 (Wallpaper — export at size)
 */

import { canvasToPngBlob } from '../../utils/SceneFormat';
import { DEFAULT_BACKGROUND } from '../../palette/core/rampGeometry';
import type { RGB } from '../../palette/core/oklab';
import type { GeometryParams } from '../../palette/core/rampGeometry';
import { FullscreenCompositor } from './FullscreenCompositor';
import type { FullscreenMode } from './modeRegistry';
import { readPngSize, type ExportSize, type ExportSizePlan } from './exportSize';

/** How long to wait for the blue-noise tile before rendering anyway. The on-screen compositor
 *  has already fetched `/blueNoiseRGBA.png`, so the offscreen one hits the HTTP cache and this
 *  resolves in a frame or two; the timeout only matters on a cold, throttled first export
 *  (where the cost of waiting is worse than a single undithered frame). */
const NOISE_WAIT_MS = 1500;

/** The colour + shape inputs the export path threads into the offscreen render — the same
 *  values the overlay hands its live compositor, minus the size (the plan supplies that). */
export interface ExportSource {
  ramp: RGB[];
  lut: Uint8Array;
  params: GeometryParams;
}

/** Box-downsample `src` into a fresh 2D canvas of `size`. Used for the supersample tail. */
const downsample = (src: HTMLCanvasElement, size: ExportSize): HTMLCanvasElement => {
  const out = document.createElement('canvas');
  out.width = size.width;
  out.height = size.height;
  const ctx = out.getContext('2d');
  if (!ctx) return src; // no 2D context — better a full-res PNG than no PNG
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, size.width, size.height);
  return out;
};

/**
 * Render a compositor mode (cpuField / cpuRaster / glQuad) offscreen at `plan`'s render size
 * and resolve a PNG. Never touches the on-screen canvas or the overlay's compositor.
 *
 * Disposes its GL context in a `finally` — WebGL caps live contexts at ~16 per page, and an
 * export that threw halfway must not eat one of them.
 */
export const renderModeToBlob = async (
  mode: FullscreenMode,
  source: ExportSource,
  plan: ExportSizePlan,
  dither: boolean,
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = plan.renderWidth;
  canvas.height = plan.renderHeight;

  let noiseReady = false;
  const comp = new FullscreenCompositor(canvas, () => { noiseReady = true; });
  try {
    // Only the GL dither tail needs the tile; the cpuField path error-diffuses on the CPU.
    if (dither && comp.isWebGL && mode.kind !== 'cpuField') {
      const started = Date.now();
      while (!noiseReady && Date.now() - started < NOISE_WAIT_MS) {
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    comp.setSize(plan.renderWidth, plan.renderHeight);
    comp.dither = dither;
    const ctx = {
      ramp: source.ramp,
      lut: source.lut,
      params: source.params,
      width: plan.renderWidth,
      height: plan.renderHeight,
    };
    if (mode.kind === 'glQuad') {
      comp.uploadLut(source.lut);
      comp.presentMode(mode, ctx);
    } else if (mode.kind === 'cpuField') {
      if (!mode.field) return null;
      comp.presentField(mode.field(ctx), plan.renderWidth, plan.renderHeight, DEFAULT_BACKGROUND, source.ramp);
    } else if (mode.kind === 'cpuRaster') {
      if (!mode.raster) return null;
      comp.presentRaster(mode.raster(ctx), plan.renderWidth, plan.renderHeight);
    } else {
      return null; // ownCanvas — the caller uses the handle's renderAt instead
    }
    const target = plan.factor > 1 ? downsample(canvas, plan) : canvas;
    return await canvasToPngBlob(target);
  } finally {
    comp.dispose();
  }
};

/** Read the TRUE pixel size off a finished PNG (24 header bytes; no image decode). The export
 *  path names the file and reports the toast from this rather than from the request, because a
 *  mode's `renderAt` may cap itself below what was asked. */
export const pngSizeOf = async (blob: Blob): Promise<ExportSize | null> => {
  try {
    const head = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    return readPngSize(head);
  } catch {
    return null;
  }
};
