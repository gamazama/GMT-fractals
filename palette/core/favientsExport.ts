/**
 * favientsExport — turn the Favients collection into shareable artefacts:
 *   • buildCollectionZip — every favourite exported in one of the per-gradient
 *     formats (.map/.ggr/.gpl/.cpt/.grd/CSS/…), bundled into a single .zip.
 *   • buildContactSheet  — a PNG grid of every gradient + its name, for preview/share.
 *
 * Both render each favourite's GradientConfig to the shared 256-step ramp first, so
 * the output matches exactly what the Picker/Generator show. Pure helpers — no store
 * or engine coupling; the panel wires them to a download.
 */

import { zipSync, strToU8 } from 'fflate';
import type { Favient } from '../store/favientsStore';
import { renderStopsToRamp } from './gmtGradient';
import { getExportFormat, EXPORT_FORMATS, aiLossyGradients, AI_LOSSY_DELTA } from './exportFormats';
import { canvasToPngBlob } from '../../utils/SceneFormat';
import type { RGB } from './oklab';

const rampOf = (f: Favient): RGB[] => renderStopsToRamp(f.config.stops, f.config.blendSpace, f.config.colorSpace);

/** Filesystem-safe stem from a gradient name (collapses junk to underscores). */
const sanitize = (name: string): string =>
  (name || 'gradient').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'gradient';

/**
 * Build a .zip (Uint8Array) of every favourite exported in `fmtKey`. Files are
 * prefixed with a zero-padded index so collection order is preserved and same-named
 * gradients don't clobber each other.
 */
export const buildCollectionZip = (favients: Favient[], fmtKey: string): Uint8Array => {
  const fmt = getExportFormat(fmtKey) ?? EXPORT_FORMATS[0];
  const files: Record<string, Uint8Array> = {};
  favients.forEach((f, i) => {
    const out = fmt.build(rampOf(f)); // string | Uint8Array (binary formats)
    const fname = `${String(i + 1).padStart(3, '0')}_${sanitize(f.name)}.${fmt.ext}`;
    files[fname] = typeof out === 'string' ? strToU8(out) : out;
  });
  return zipSync(files, { level: 6 });
};

/**
 * Build a single combined file for a *collection* format (e.g. an Illustrator
 * swatch library that holds every favourite as one importable .ai). Returns null
 * when `fmtKey` is a plain per-gradient format (use buildCollectionZip instead).
 */
export const buildCollectionFile = (
  favients: Favient[],
  fmtKey: string,
): { data: string | Uint8Array; ext: string } | null => {
  const fmt = getExportFormat(fmtKey);
  if (!fmt?.collection) return null;
  const items = favients.map((f) => ({ name: f.name, ramp: rampOf(f) }));
  return { data: fmt.collection(items), ext: fmt.ext };
};

/**
 * Quality warnings for a collection export: favourites that lose visible detail
 * under the format's stop limit (currently only the Illustrator `.ai` reduction).
 * Empty for lossless / non-collection formats.
 */
export const collectionQualityWarnings = (
  favients: Favient[],
  fmtKey: string,
  threshold = AI_LOSSY_DELTA,
): { name: string; delta: number }[] => {
  if (fmtKey !== 'ai' && fmtKey !== 'idml') return []; // both reduce to the stop budget
  return aiLossyGradients(favients.map((f) => ({ name: f.name, ramp: rampOf(f) })), threshold);
};

/** A reusable 256×1 scratch canvas + buffer for painting ramps — one allocation
 *  shared across a whole contact-sheet render rather than one per gradient. */
interface RampScratch {
  src: HTMLCanvasElement;
  img: ImageData;
  sctx: CanvasRenderingContext2D;
}

/** Paint a 256-step ramp into a canvas rect via a shared 1px scratch source. */
const paintRamp = (ctx: CanvasRenderingContext2D, ramp: RGB[], x: number, y: number, w: number, h: number, scratch: RampScratch): void => {
  const { src, img, sctx } = scratch;
  for (let i = 0; i < 256; i++) {
    const c = ramp[i] ?? { r: 0, g: 0, b: 0 };
    img.data[i * 4] = Math.round(c.r);
    img.data[i * 4 + 1] = Math.round(c.g);
    img.data[i * 4 + 2] = Math.round(c.b);
    img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, 0, 0, 256, 1, x, y, w, h);
};

/**
 * Build a PNG contact sheet: a grid of every favourite's gradient with its name
 * beneath. Returns null in non-DOM contexts or for an empty collection.
 */
export const buildContactSheet = async (favients: Favient[], title = 'Favients'): Promise<Blob | null> => {
  if (typeof document === 'undefined' || !favients.length) return null;

  const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(favients.length))));
  const rows = Math.ceil(favients.length / cols);
  const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));

  const SW = 240, SH = 44, LBL = 18; // swatch w/h + label strip
  const PAD = 16, GAP = 12, HEAD = 34;
  const cellW = SW, cellH = SH + LBL;
  const W = PAD * 2 + cols * cellW + (cols - 1) * GAP;
  const H = PAD * 2 + HEAD + rows * cellH + (rows - 1) * GAP;

  const cv = document.createElement('canvas');
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background + title.
  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e5e5e5';
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`${title} — ${favients.length} gradient${favients.length === 1 ? '' : 's'}`, PAD, PAD);

  // One scratch canvas reused for every ramp (vs. allocating one per gradient).
  const src = document.createElement('canvas');
  src.width = 256;
  src.height = 1;
  const scratch: RampScratch = { src, img: new ImageData(256, 1), sctx: src.getContext('2d')! };

  favients.forEach((f, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = PAD + c * (cellW + GAP);
    const y = PAD + HEAD + r * (cellH + GAP);

    paintRamp(ctx, rampOf(f), x, y, SW, SH, scratch);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(x + 0.5, y + 0.5, SW - 1, SH - 1);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    const name = f.name.length > 40 ? `${f.name.slice(0, 39)}…` : f.name;
    ctx.fillText(name, x, y + SH + 3);
  });

  return canvasToPngBlob(cv);
};
