/**
 * gradientPng — the GMT gradient FILE as a PNG (ADR-0123 Decision 2): the document in an iTXt
 * chunk, and the gradients drawn as the pixels, so a copy whose metadata was stripped still reads
 * back with exact colours. Pure (`utils/pngCodec.ts` underneath): node and browser alike, no canvas.
 *
 * THE LAYOUT (a reader recognises exactly this, and a writer writes exactly this):
 *   - a SET (two or more gradients) is 1024 wide: texel t of the 256-texel DISPLAY ramp is columns
 *     4t..4t+3, opaque RGB8, the float ramp rounded and clamped to bytes;
 *   - ONE gradient is `size.width` × `size.height` (ADR-0123 Update 2026-09-14; default 1024 × 128):
 *     the width SNAPS to a multiple of 256 between 256 and 4096 (`snapGradientPngWidth`), so each
 *     texel is a whole k = width / 256 columns and a stripped copy still reads back exact colours;
 *     the height is free, 1…4096 (`clampGradientPngHeight`);
 *   - one horizontal band per gradient, in document order, every row of a band identical;
 *   - a set's band height is `bandHeightFor(count)`: 32, then 16 then 8 as the count grows, so the
 *     image stays ≤ 16,384 px tall; past 2,048 gradients the pixels carry the first 2,048 and the
 *     metadata still carries all of them;
 *   - chunks: IHDR, iTXt `gmt-gradients` (zlib-compressed, the compact document), IDAT, IEND.
 *     Nothing else — no gAMA / iCCP / sRGB, so no viewer "corrects" the texels.
 *
 * READING, in order: the `gmt-gradients` metadata when it decodes to gradients → the document;
 * else a scene key (`SceneData`, or GMT 0.8.5's `FractalData`) → "that is a GMT scene"; else the
 * band layout → one RAMP gradient per band (ADR-0122 ramp form, exact texels, no names); else
 * "not ours", which the caller may hand to image extraction.
 *
 * The band reader is deliberately strict — a k-px column block that is not uniform, a row that
 * differs inside a band, a translucent pixel, a width that is not a multiple of 256 or a set height
 * the writer would never produce is "not ours". A photo cannot pass by accident; a PNG a tool
 * RE-ENCODED (another filter choice, RGBA) still does, because the decoder handles every filter type.
 * What CAN pass is an image that genuinely is one: identical rows of k-px blocks — a flat colour
 * included — and reading that as a ramp gradient loses nothing image extraction would have found.
 *
 * Known ambiguity, by construction: a 1024-wide height that two counts could produce (128 px = one
 * gradient at 128, or four at 32) is read as the fewest bands whose rows agree, so four IDENTICAL
 * gradients at 32 px read back as one. Any other width is one gradient. The metadata, when present,
 * is never ambiguous.
 *
 * @invariant the metadata round trip is exact, the stripped PNG reads back the display colours of
 *   every gradient in order for 1, 12 and 700 gradients, a re-filtered copy still reads, and a
 *   scene PNG and a foreign PNG are told apart — proven by: `npm run test:gradient-file`
 *   ("[2] PNG round trip via metadata is exact", "[3] 700-gradient shelf: every band is a ramp
 *   gradient with EXACT display colours, in order", "[3] re-encoded with filter 4 for every row it
 *   still reads exactly", "[3] a smooth 1024-column ramp … is not ours", "[3] a scene PNG is
 *   recognised as a scene"). Falsified 2026-09-14, see the harness header.
 * @invariant one gradient written at any width the snap allows (256…4096, a multiple of 256) and any
 *   height 1…4096 reads back, stripped, as ONE ramp gradient with exact colours; a k-px block that
 *   is not uniform or a width that is not a multiple of 256 is not ours — proven by:
 *   `npm run test:gradient-file` ("[3b] 2048 × 40, metadata stripped, reads back as ONE ramp
 *   gradient with EXACT colours", "[3b] a 1000-wide request snaps to 1024", "[3b] a 2048-wide band
 *   whose 8-px texel block differs in its last column is not ours", "[3b] a flat colour 1000 wide
 *   (not a multiple of 256) is not ours"). Falsified 2026-09-14 seven ways, see the harness header.
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 */

import type { GradientConfig } from '../../types';
import { gradientDisplayRamp } from '../../utils/colorUtils';
import { RAMP_TEXELS, encodeRampBuffer, makeRampGradient } from '../../utils/gradientRamp';
import { decodePng, encodePng, isPng, listPngTextKeywords, readPngHeader, readPngText } from '../../utils/pngCodec';
import {
  decodeGradientDocument,
  encodeGradientDocument,
  gradientDocumentText,
  type GradientDocumentEntry,
  type GradientDocumentInput,
  type GradientPayloadFormat,
} from './gradientDocument';

export const GRADIENT_PNG_KEYWORD = 'gmt-gradients';
/** A set's width, and one gradient's default. */
export const GRADIENT_PNG_WIDTH = 1024;
export const GRADIENT_PNG_TEXEL_PX = GRADIENT_PNG_WIDTH / RAMP_TEXELS;
export const GRADIENT_PNG_MAX_HEIGHT = 16384;
/** Gradients the PIXELS carry at most (8-px bands); the metadata carries every one. */
export const GRADIENT_PNG_MAX_BANDS = GRADIENT_PNG_MAX_HEIGHT / 8;
/** One gradient's width range (each a multiple of `RAMP_TEXELS`) and height range. */
export const GRADIENT_PNG_MIN_WIDTH = RAMP_TEXELS;
export const GRADIENT_PNG_MAX_WIDTH = 4096;
export const GRADIENT_PNG_MAX_SINGLE_HEIGHT = 4096;
/** One gradient's default size — the ADR's single-gradient layout. */
export const GRADIENT_PNG_DEFAULT_SIZE = { width: GRADIENT_PNG_WIDTH, height: 128 } as const;
/** The most pixels the band reader will decode: the tallest set the writer makes. */
const MAX_READ_PIXELS = GRADIENT_PNG_WIDTH * GRADIENT_PNG_MAX_HEIGHT;

/** A requested width snapped to the nearest multiple of 256 within 256…4096 (1000 → 1024). Not a
 *  number → the default. Every texel is then a whole number of pixel columns. */
export const snapGradientPngWidth = (w: unknown): number => {
  const n = typeof w === 'number' && Number.isFinite(w) ? w : GRADIENT_PNG_DEFAULT_SIZE.width;
  const k = Math.round(n / RAMP_TEXELS);
  return Math.max(GRADIENT_PNG_MIN_WIDTH, Math.min(GRADIENT_PNG_MAX_WIDTH, k * RAMP_TEXELS));
};

/** A requested height rounded and clamped to 1…4096. Not a number → the default. */
export const clampGradientPngHeight = (h: unknown): number => {
  const n = typeof h === 'number' && Number.isFinite(h) ? h : GRADIENT_PNG_DEFAULT_SIZE.height;
  return Math.max(1, Math.min(GRADIENT_PNG_MAX_SINGLE_HEIGHT, Math.round(n)));
};

/** One gradient's PNG size, as asked; each side is snapped / clamped by the writer. */
export interface GradientPngSize {
  width?: number;
  height?: number;
}

/** The iTXt keywords a SCENE PNG carries: `utils/SceneFormat.ts` `SCENE_METADATA_KEY` and the
 *  gmt-0.8.5 legacy key. Mirrored, not imported — SceneFormat pulls the feature registry. The
 *  harness pins the first against the real constant. */
export const SCENE_PNG_KEYWORDS: readonly string[] = ['SceneData', 'FractalData'];

/** Band height for a document of `count` gradients at the default single-gradient size (a single
 *  gradient's real height is `size.height`, see `writeGradientPng`). */
export const bandHeightFor = (count: number): number => {
  if (count <= 1) return 128;
  if (count * 32 <= GRADIENT_PNG_MAX_HEIGHT) return 32;
  if (count * 16 <= GRADIENT_PNG_MAX_HEIGHT) return 16;
  return 8;
};

const toByte = (v: number): number => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

/** The 768 display-ramp bytes of a config — what its band draws. */
export const displayRampBytes = (config: GradientConfig): Uint8Array => {
  const ramp = gradientDisplayRamp(config);
  const out = new Uint8Array(RAMP_TEXELS * 3);
  for (let i = 0; i < RAMP_TEXELS; i++) {
    out[i * 3] = toByte(ramp[i].r);
    out[i * 3 + 1] = toByte(ramp[i].g);
    out[i * 3 + 2] = toByte(ramp[i].b);
  }
  return out;
};

/**
 * Write the gradient PNG. `groups` labels the sets entries name. `size` sizes a ONE-gradient
 * document (width snapped to a multiple of 256, height clamped — see the header); a set ignores
 * it and keeps the automatic band layout. An empty document still writes a valid image (64 × 8
 * black, a width the band reader does not claim) so a Save of an empty shelf is a file, not an
 * error.
 */
export const writeGradientPng = (
  entries: ReadonlyArray<GradientDocumentInput>,
  groups?: Readonly<Record<string, string>>,
  size?: GradientPngSize,
): Uint8Array => {
  const doc = encodeGradientDocument(entries, groups);
  const bands = Math.min(entries.length, GRADIENT_PNG_MAX_BANDS);
  const single = entries.length === 1;
  const width = !bands ? 64 : single ? snapGradientPngWidth(size?.width) : GRADIENT_PNG_WIDTH;
  const bh = !bands ? 8 : single ? clampGradientPngHeight(size?.height) : bandHeightFor(entries.length);
  const height = bands ? bands * bh : 8;
  const texelPx = width / RAMP_TEXELS;
  const stride = width * 3;
  const pixels = new Uint8Array(stride * height);
  const row = new Uint8Array(stride);
  for (let b = 0; b < bands; b++) {
    const bytes = displayRampBytes(doc.gradients[b].config);
    for (let t = 0; t < RAMP_TEXELS; t++) {
      for (let k = 0; k < texelPx; k++) {
        const o = (t * texelPx + k) * 3;
        row[o] = bytes[t * 3];
        row[o + 1] = bytes[t * 3 + 1];
        row[o + 2] = bytes[t * 3 + 2];
      }
    }
    for (let y = 0; y < bh; y++) pixels.set(row, (b * bh + y) * stride);
  }
  return encodePng(width, height, pixels, {
    // Sub on a band's first row (a 4-px column is three zeros in four), Up on the rest (all zeros).
    filter: (y) => (y % bh === 0 ? 1 : 2),
    text: [{ keyword: GRADIENT_PNG_KEYWORD, text: gradientDocumentText(doc, false), compress: true }],
  });
};

export type GradientPngRead =
  /** The metadata decoded to gradients. `format` is the payload's shape (a hand-made PNG may carry a legacy collection). */
  | { kind: 'document'; format: GradientPayloadFormat; gradients: GradientDocumentEntry[]; groups: Record<string, string>; skipped: number }
  /** No usable metadata, but our band layout: one ramp gradient per band, top to bottom. */
  | { kind: 'bands'; configs: GradientConfig[] }
  /** A GMT scene PNG — for the scene loader, not this one. */
  | { kind: 'scene' }
  /** A PNG, but not ours. */
  | { kind: 'not-ours' }
  | { kind: 'not-png' };

/**
 * Recognise the band layout in decoded pixels; the configs, or null.
 *
 * The shapes, fewest bands first: ONE band the height of the image, at any width that is a
 * multiple of 256 (256…4096, k = width / 256 columns per texel); then, at 1024 wide only, the set
 * band heights the writer produces for that height (32 / 16 / 8, each consistent with
 * `bandHeightFor` of the count). Decoding is bounded by pixels, not by shape: at most the tallest
 * set the writer makes (1024 × 16,384), so a 4096-wide gradient may be up to 4096 tall.
 */
const readBands = (bytes: Uint8Array): GradientConfig[] | null => {
  const h = readPngHeader(bytes);
  if (!h) return null;
  const { width } = h;
  if (width < GRADIENT_PNG_MIN_WIDTH || width > GRADIENT_PNG_MAX_WIDTH || width % RAMP_TEXELS !== 0) return null;
  if (h.height < 1 || h.height > GRADIENT_PNG_MAX_HEIGHT || width * h.height > MAX_READ_PIXELS) return null;
  const texelPx = width / RAMP_TEXELS;
  const candidates = [h.height];
  if (width === GRADIENT_PNG_WIDTH) {
    for (const bh of [32, 16, 8]) {
      const n = h.height / bh;
      if (Number.isInteger(n) && n >= 2 && n <= GRADIENT_PNG_MAX_BANDS && bandHeightFor(n) === bh) candidates.push(bh);
    }
  }
  // Re-encoded as RGBA at the pixel bound: height × (1 + width × 4) bytes.
  const png = decodePng(bytes, { maxBytes: h.height * (1 + width * 4) });
  if (!png) return null;
  const { channels, pixels, height } = png;
  const stride = width * channels;

  // rowSame[y]: row y equals row y-1 byte for byte.
  const rowSame = new Uint8Array(height);
  for (let y = 1; y < height; y++) {
    const a = y * stride;
    const b = a - stride;
    let same = 1;
    for (let x = 0; x < stride; x++) if (pixels[a + x] !== pixels[b + x]) { same = 0; break; }
    rowSame[y] = same;
  }
  // A band's first row: every k-px column block uniform, every pixel opaque.
  const columnsOk = (y: number): boolean => {
    const r = y * stride;
    for (let t = 0; t < RAMP_TEXELS; t++) {
      const o = r + t * texelPx * channels;
      for (let k = 1; k < texelPx; k++) {
        for (let c = 0; c < channels; c++) if (pixels[o + k * channels + c] !== pixels[o + c]) return false;
      }
      if (channels === 4 && pixels[o + 3] !== 255) return false;
    }
    return true;
  };

  for (const bh of candidates) {
    let ok = true;
    for (let y = 0; y < height && ok; y++) {
      if (y % bh === 0) ok = columnsOk(y);
      else ok = rowSame[y] === 1;
    }
    if (!ok) continue;
    const configs: GradientConfig[] = [];
    const texels = new Uint8Array(RAMP_TEXELS * 3);
    for (let y = 0; y < height; y += bh) {
      const r = y * stride;
      for (let t = 0; t < RAMP_TEXELS; t++) {
        const o = r + t * texelPx * channels;
        texels[t * 3] = pixels[o];
        texels[t * 3 + 1] = pixels[o + 1];
        texels[t * 3 + 2] = pixels[o + 2];
      }
      configs.push(makeRampGradient(encodeRampBuffer(texels, 3)));
    }
    return configs;
  }
  return null;
};

/** Read a PNG's bytes as a gradient file. Never throws. */
export const readGradientPng = (bytes: Uint8Array): GradientPngRead => {
  try {
    if (!isPng(bytes)) return { kind: 'not-png' };
    const text = readPngText(bytes, GRADIENT_PNG_KEYWORD);
    if (text !== null) {
      const read = decodeGradientDocument(text);
      if (read.kind === 'gradients' && read.gradients.length) {
        return {
          kind: 'document',
          format: read.format,
          gradients: read.gradients,
          groups: read.groups,
          skipped: read.skipped,
        };
      }
      // Unreadable or another version: the pixels are still the colours.
    }
    const keys = listPngTextKeywords(bytes);
    if (keys.some((k) => SCENE_PNG_KEYWORDS.includes(k))) return { kind: 'scene' };
    const configs = readBands(bytes);
    return configs ? { kind: 'bands', configs } : { kind: 'not-ours' };
  } catch {
    return { kind: 'not-ours' };
  }
};
