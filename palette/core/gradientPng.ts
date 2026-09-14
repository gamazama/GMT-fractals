/**
 * gradientPng — the GMT gradient FILE as a PNG (ADR-0123 Decision 2): the document in an iTXt
 * chunk, and the gradients drawn as the pixels, so a copy whose metadata was stripped still reads
 * back with exact colours. Pure (`utils/pngCodec.ts` underneath): node and browser alike, no canvas.
 *
 * THE LAYOUT (a reader recognises exactly this, and a writer writes exactly this):
 *   - width 1024: texel t of the 256-texel DISPLAY ramp is columns 4t..4t+3, opaque RGB8, the
 *     float ramp rounded and clamped to bytes;
 *   - one horizontal band per gradient, in document order, every row of a band identical;
 *   - band height `bandHeightFor(count)`: 128 for one gradient, 32 for a set, 16 then 8 as the
 *     count grows, so the image stays ≤ 16,384 px tall; past 2,048 gradients the pixels carry
 *     the first 2,048 and the metadata still carries all of them;
 *   - chunks: IHDR, iTXt `gmt-gradients` (zlib-compressed, the compact document), IDAT, IEND.
 *     Nothing else — no gAMA / iCCP / sRGB, so no viewer "corrects" the texels.
 *
 * READING, in order: the `gmt-gradients` metadata when it decodes to gradients → the document;
 * else a scene key (`SceneData`, or GMT 0.8.5's `FractalData`) → "that is a GMT scene"; else the
 * band layout → one RAMP gradient per band (ADR-0122 ramp form, exact texels, no names); else
 * "not ours", which the caller may hand to image extraction.
 *
 * The band reader is deliberately strict — a 4-px column that is not uniform, a row that differs
 * inside a band, a translucent pixel or a height the writer would never produce is "not ours".
 * A photo cannot pass by accident; a PNG a tool RE-ENCODED (another filter choice, RGBA) still
 * does, because the decoder handles every filter type.
 *
 * Known ambiguity, by construction: a height that two counts could produce (128 px = one gradient
 * at 128, or four at 32) is read as the fewest bands whose rows agree, so four IDENTICAL gradients
 * at 32 px read back as one. The metadata, when present, is never ambiguous.
 *
 * @invariant the metadata round trip is exact, the stripped PNG reads back the display colours of
 *   every gradient in order for 1, 12 and 700 gradients, a re-filtered copy still reads, and a
 *   scene PNG and a foreign PNG are told apart — proven by: `npm run test:gradient-file`
 *   ("[2] PNG round trip via metadata is exact", "[3] 700-gradient shelf: every band is a ramp
 *   gradient with EXACT display colours, in order", "[3] re-encoded with filter 4 for every row it
 *   still reads exactly", "[3] a smooth 1024-column ramp … is not ours", "[3] a scene PNG is
 *   recognised as a scene"). Falsified 2026-09-14, see the harness header.
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
export const GRADIENT_PNG_WIDTH = 1024;
export const GRADIENT_PNG_TEXEL_PX = GRADIENT_PNG_WIDTH / RAMP_TEXELS;
export const GRADIENT_PNG_MAX_HEIGHT = 16384;
/** Gradients the PIXELS carry at most (8-px bands); the metadata carries every one. */
export const GRADIENT_PNG_MAX_BANDS = GRADIENT_PNG_MAX_HEIGHT / 8;

/** The iTXt keywords a SCENE PNG carries: `utils/SceneFormat.ts` `SCENE_METADATA_KEY` and the
 *  gmt-0.8.5 legacy key. Mirrored, not imported — SceneFormat pulls the feature registry. The
 *  harness pins the first against the real constant. */
export const SCENE_PNG_KEYWORDS: readonly string[] = ['SceneData', 'FractalData'];

/** Band height for a document of `count` gradients. */
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
 * Write the gradient PNG. `groups` labels the sets entries name. An empty document still writes a
 * valid image (one 8-px black band, which the band reader does not claim) so a Save of an empty
 * shelf is a file, not an error.
 */
export const writeGradientPng = (
  entries: ReadonlyArray<GradientDocumentInput>,
  groups?: Readonly<Record<string, string>>,
): Uint8Array => {
  const doc = encodeGradientDocument(entries, groups);
  const bands = Math.min(entries.length, GRADIENT_PNG_MAX_BANDS);
  const bh = bands ? bandHeightFor(entries.length) : 8;
  const height = bands ? bands * bh : 8;
  const stride = GRADIENT_PNG_WIDTH * 3;
  const pixels = new Uint8Array(stride * height);
  const row = new Uint8Array(stride);
  for (let b = 0; b < bands; b++) {
    const bytes = displayRampBytes(doc.gradients[b].config);
    for (let t = 0; t < RAMP_TEXELS; t++) {
      for (let k = 0; k < GRADIENT_PNG_TEXEL_PX; k++) {
        const o = (t * GRADIENT_PNG_TEXEL_PX + k) * 3;
        row[o] = bytes[t * 3];
        row[o + 1] = bytes[t * 3 + 1];
        row[o + 2] = bytes[t * 3 + 2];
      }
    }
    for (let y = 0; y < bh; y++) pixels.set(row, (b * bh + y) * stride);
  }
  return encodePng(GRADIENT_PNG_WIDTH, height, pixels, {
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

/** Recognise the band layout in decoded pixels; the configs, or null. */
const readBands = (bytes: Uint8Array): GradientConfig[] | null => {
  const h = readPngHeader(bytes);
  if (!h || h.width !== GRADIENT_PNG_WIDTH || h.height < 8 || h.height > GRADIENT_PNG_MAX_HEIGHT || h.height % 8 !== 0) return null;
  const candidates = [128, 32, 16, 8].filter((bh) => h.height % bh === 0 && bandHeightFor(h.height / bh) === bh && h.height / bh <= GRADIENT_PNG_MAX_BANDS);
  if (!candidates.length) return null;
  // The largest image the writer makes, re-encoded as RGBA: 16,384 × (1 + 1,024 × 4) bytes.
  const png = decodePng(bytes, { maxBytes: GRADIENT_PNG_MAX_HEIGHT * (1 + GRADIENT_PNG_WIDTH * 4) });
  if (!png) return null;
  const { channels, pixels, height } = png;
  const stride = GRADIENT_PNG_WIDTH * channels;

  // rowSame[y]: row y equals row y-1 byte for byte.
  const rowSame = new Uint8Array(height);
  for (let y = 1; y < height; y++) {
    const a = y * stride;
    const b = a - stride;
    let same = 1;
    for (let x = 0; x < stride; x++) if (pixels[a + x] !== pixels[b + x]) { same = 0; break; }
    rowSame[y] = same;
  }
  // A band's first row: every 4-px column uniform, every pixel opaque.
  const columnsOk = (y: number): boolean => {
    const r = y * stride;
    for (let t = 0; t < RAMP_TEXELS; t++) {
      const o = r + t * GRADIENT_PNG_TEXEL_PX * channels;
      for (let k = 1; k < GRADIENT_PNG_TEXEL_PX; k++) {
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
        const o = r + t * GRADIENT_PNG_TEXEL_PX * channels;
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
