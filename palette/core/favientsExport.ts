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
import { getExportFormat, EXPORT_FORMATS, aiLossyGradients, AI_LOSSY_DELTA, stopBudgetOf } from './exportFormats';
import { layoutPositions, swatchesAt, clampCount, type PaletteRule } from './paletteSample';
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
export const buildCollectionZip = (favients: Favient[], fmtKey: string, budget?: number): Uint8Array => {
  const fmt = getExportFormat(fmtKey) ?? EXPORT_FORMATS[0];
  const files: Record<string, Uint8Array> = {};
  favients.forEach((f, i) => {
    const out = fmt.build(rampOf(f), f.name, budget); // string | Uint8Array (binary formats)
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
  budget?: number,
): { data: string | Uint8Array; ext: string } | null => {
  const fmt = getExportFormat(fmtKey);
  if (!fmt?.collection) return null;
  const items = favients.map((f) => ({ name: f.name, ramp: rampOf(f) }));
  return { data: fmt.collection(items, budget), ext: fmt.ext };
};

/**
 * Quality warnings for a collection export: favourites that lose visible detail under the
 * format's stop budget. Empty for formats that do not reduce at all.
 *
 * Every REDUCING format is covered as of 2026-09-10 — `.ai`, `.idml`, `.ase`, `.grd`, `.svg`
 * and `.ugr` — each measured at ITS OWN budget through `stopBudgetOf`, and at the user's
 * override when the export window's Settings category carries one. That closes the standing
 * assumption this block used to carry (it was an @-marker until today): `.ugr` reduced at 64
 * and warned about nothing, because the only measurement available ran at 40 and would have
 * over-reported. A per-format budget was exactly what was missing.
 */
export const collectionQualityWarnings = (
  favients: Favient[],
  fmtKey: string,
  threshold = AI_LOSSY_DELTA,
  budget?: number,
): { name: string; delta: number }[] => {
  const cap = stopBudgetOf(fmtKey, budget);
  if (cap === null) return []; // this format does not reduce; there is nothing to lose
  return aiLossyGradients(favients.map((f) => ({ name: f.name, ramp: rampOf(f) })), threshold, cap);
};

// ---- the SWATCHES subject over a whole set (§8b item 5, 2026-09-09) ----
//
// The set has the same two faces the working gradient does. Its RAMP face is everything
// above; its SWATCHES face is each member's palette, sampled by the same rule the hero
// uses. There is no composed swatch row for someone else's gradient — the row is a thing
// you make on the hero — so the caller says how many, and the rule does the placing. That
// is the whole difference between the two subjects at this level.

/** One member's palette: `n` swatches placed by `rule` (the hero's rules, applied to a
 *  gradient nobody has laid out by hand). */
export const paletteOf = (f: Favient, n: number, rule: PaletteRule = 'even'): RGB[] => {
  const ramp = rampOf(f);
  return swatchesAt(ramp, layoutPositions(rule, clampCount(n), ramp, f.config)).map((s) => s.color);
};

export interface NamedSwatches {
  name: string;
  colors: RGB[];
}

/** Every member's palette, named — the input both swatch exporters take. */
export const setSwatches = (favients: Favient[], n: number, rule: PaletteRule = 'even'): NamedSwatches[] =>
  favients.map((f) => ({ name: f.name, colors: paletteOf(f, n, rule) }));

/**
 * A .zip of every member's palette in `fmtKey`'s swatches form. Mirrors
 * `buildCollectionZip`, and returns null when the format has no swatches builder rather
 * than silently falling back to a ramp export in a file the user asked for colours from.
 */
export const buildSwatchZip = (items: NamedSwatches[], fmtKey: string): Uint8Array | null => {
  const fmt = getExportFormat(fmtKey);
  if (!fmt?.swatches) return null;
  const files: Record<string, Uint8Array> = {};
  items.forEach((it, i) => {
    const out = fmt.swatches!(it.colors, it.name);
    files[`${String(i + 1).padStart(3, '0')}_${sanitize(it.name)}.${fmt.ext}`] = typeof out === 'string' ? strToU8(out) : out;
  });
  return zipSync(files, { level: 6 });
};

/**
 * One combined file for a format that groups swatch lists natively (.ase only, today).
 * Null for everything else — the caller zips instead.
 */
export const buildSwatchCollectionFile = (items: NamedSwatches[], fmtKey: string): { data: string | Uint8Array; ext: string } | null => {
  const fmt = getExportFormat(fmtKey);
  if (!fmt?.collectionSwatches) return null;
  return { data: fmt.collectionSwatches(items), ext: fmt.ext };
};

/**
 * The swatch sheet: the palette as labelled chips, one row per gradient. The image
 * counterpart of the swatches subject, the way the contact sheet is the ramp subject's —
 * a designer's screenshot of "these are the colours", hex included, which is the artefact
 * people actually paste into a brief.
 *
 * Takes `NamedSwatches[]`, so ONE entry is the working gradient's palette and many is a
 * set: the two cases are the same drawing, not two functions that will drift.
 */
export const buildSwatchSheet = async (items: NamedSwatches[], title = 'Palette'): Promise<Blob | null> => {
  if (typeof document === 'undefined' || !items.length) return null;

  const widest = Math.max(...items.map((i) => i.colors.length));
  const CHIP = 76, CHIPH = 62, LBL = 16, GAP = 8;
  const PAD = 16, HEAD = 34, ROWLBL = 18, ROWGAP = 14;
  const W = PAD * 2 + widest * CHIP + (widest - 1) * GAP;
  const rowH = ROWLBL + CHIPH + LBL;
  const H = PAD * 2 + HEAD + items.length * rowH + (items.length - 1) * ROWGAP;
  const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));

  const cv = document.createElement('canvas');
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e5e5e5';
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  const total = items.reduce((a, b) => a + b.colors.length, 0);
  ctx.fillText(`${title} — ${total} colour${total === 1 ? '' : 's'}`, PAD, PAD);

  items.forEach((it, r) => {
    const y = PAD + HEAD + r * (rowH + ROWGAP);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(it.name.length > 60 ? `${it.name.slice(0, 59)}…` : it.name, PAD, y);
    it.colors.forEach((c, k) => {
      const x = PAD + k * (CHIP + GAP);
      const hex = '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
      ctx.fillStyle = hex;
      ctx.fillRect(x, y + ROWLBL, CHIP, CHIPH);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.strokeRect(x + 0.5, y + ROWLBL + 0.5, CHIP - 1, CHIPH - 1);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(hex.toUpperCase(), x, y + ROWLBL + CHIPH + 3);
    });
  });

  return canvasToPngBlob(cv);
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
