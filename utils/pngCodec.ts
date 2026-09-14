/**
 * pngCodec — a small, PURE PNG codec over `Uint8Array`s: chunks, text chunks, and 8-bit RGB /
 * RGBA pixels. No DOM, no canvas, no Blob, no async — so the same code runs in a node harness
 * and in the browser, and a file we write is exactly the bytes we asked for (no colour
 * management, no gAMA / iCCP / sRGB chunks, no premultiplication).
 *
 * Engine-core: it knows nothing about gradients or scenes. `palette/core/gradientPng.ts` is the
 * gradient file built on it (ADR-0123); `utils/pngMetadata.ts` is the older Blob/async helper the
 * scene save uses, and is deliberately left alone — its chunk code is mirrored here, not moved,
 * so the scene path does not change.
 *
 * What it covers, and what it refuses:
 *   - `readPngChunks` walks any PNG's chunk list (CRCs are NOT verified — a reader that refuses a
 *     file over a bad CRC some tool wrote gains nothing here).
 *   - `readPngTextChunks` / `readPngText`: `iTXt` (uncompressed and zlib-compressed), `tEXt`
 *     (read as UTF-8, as `pngMetadata.extractMetadata` does, so a legacy scene key reads the same)
 *     and `zTXt`.
 *   - `decodePng`: NON-interlaced, bit depth 8, colour type 2 (RGB) or 6 (RGBA), all five filter
 *     types. Anything else (palette, greyscale, 16-bit, Adam7) is `null` — the callers here only
 *     need to recognise files they wrote, and a re-encoder that turns one into a palette image has
 *     already lost what made it recognisable.
 *   - `encodePng`: RGB8 or RGBA8, one IDAT, text chunks before it, a caller-chosen filter per row.
 *
 * Every reader is total: malformed, truncated or hostile bytes give `null` / `[]`, never a throw.
 *
 * Pitfalls:
 *   - `decodePng` allocates `height × (1 + width × channels)` bytes; `maxBytes` bounds it (64 MB by
 *     default). Check `readPngHeader` first when you only accept one shape.
 *   - fflate's inflate into a caller-sized buffer does not report overflow; the decoder treats a
 *     short inflate as corrupt and ignores anything past the expected size.
 *
 * @see palette/core/gradientPng.ts (the one consumer today)
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 */

import { unzlibSync, zlibSync } from 'fflate';

export const PNG_SIGNATURE: Uint8Array = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

/** True when `bytes` starts with the 8-byte PNG signature. */
export const isPng = (bytes: Uint8Array): boolean => {
  if (!bytes || bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  return true;
};

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

/** CRC-32 as PNG uses it (over chunk type + data). */
export const crc32 = (buf: Uint8Array, start = 0, end = buf.length): number => {
  let crc = -1;
  for (let i = start; i < end; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
};

const u32 = (b: Uint8Array, o: number): number => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const putU32 = (b: Uint8Array, o: number, v: number): void => {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
};
const ascii = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};
const asciiBytes = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};
const utf8 = new TextEncoder();
const utf8Decoder = new TextDecoder();

export interface PngChunk {
  type: string;
  data: Uint8Array;
}

/** Every chunk up to and including IEND, or null when the bytes are not a PNG / truncated
 *  before IHDR. A chunk whose length runs past the end stops the walk (what was read is kept). */
export const readPngChunks = (bytes: Uint8Array): PngChunk[] | null => {
  if (!isPng(bytes)) return null;
  const out: PngChunk[] = [];
  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const len = u32(bytes, pos);
    const type = ascii(bytes.subarray(pos + 4, pos + 8));
    if (pos + 12 + len > bytes.length) break;
    out.push({ type, data: bytes.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  return out.length && out[0].type === 'IHDR' ? out : null;
};

export interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  interlace: number;
}

/** The IHDR fields, or null when the bytes are not a PNG. Reads 33 bytes — cheap to call first. */
export const readPngHeader = (bytes: Uint8Array): PngHeader | null => {
  if (!isPng(bytes) || bytes.length < 33) return null;
  if (ascii(bytes.subarray(12, 16)) !== 'IHDR' || u32(bytes, 8) !== 13) return null;
  // IHDR data at 16: width(4) height(4) bitDepth colorType compression filter interlace
  return { width: u32(bytes, 16), height: u32(bytes, 20), bitDepth: bytes[24], colorType: bytes[25], interlace: bytes[28] };
};

export interface PngTextEntry {
  keyword: string;
  text: string;
}

const MAX_TEXT_INFLATE = 64 * 1024 * 1024;

const inflateText = (data: Uint8Array): string | null => {
  try {
    const out = unzlibSync(data);
    return out.length > MAX_TEXT_INFLATE ? null : utf8Decoder.decode(out);
  } catch {
    return null;
  }
};

/** One text chunk's keyword and text, or null for a malformed one. */
const decodeTextChunk = (c: PngChunk): PngTextEntry | null => {
  const d = c.data;
  const sep = d.indexOf(0);
  if (sep <= 0) return null;
  const keyword = ascii(d.subarray(0, sep));
  if (c.type === 'tEXt') return { keyword, text: utf8Decoder.decode(d.subarray(sep + 1)) };
  if (c.type === 'zTXt') {
    const text = inflateText(d.subarray(sep + 2));
    return text === null ? null : { keyword, text };
  }
  if (c.type !== 'iTXt' || sep + 3 > d.length) return null;
  const compressed = d[sep + 1] === 1;
  let p = sep + 3;
  const lang = d.indexOf(0, p);
  if (lang < 0) return null;
  const translated = d.indexOf(0, lang + 1);
  if (translated < 0) return null;
  p = translated + 1;
  const body = d.subarray(p);
  if (!compressed) return { keyword, text: utf8Decoder.decode(body) };
  const text = inflateText(body);
  return text === null ? null : { keyword, text };
};

/** Every readable tEXt / zTXt / iTXt entry, in file order. `[]` for a non-PNG. */
export const readPngTextChunks = (bytes: Uint8Array): PngTextEntry[] => {
  const chunks = readPngChunks(bytes);
  if (!chunks) return [];
  const out: PngTextEntry[] = [];
  for (const c of chunks) {
    if (c.type !== 'iTXt' && c.type !== 'tEXt' && c.type !== 'zTXt') continue;
    const e = decodeTextChunk(c);
    if (e) out.push(e);
  }
  return out;
};

/** The text of the first chunk carrying `keyword`, or null. */
export const readPngText = (bytes: Uint8Array, keyword: string): string | null =>
  readPngTextChunks(bytes).find((e) => e.keyword === keyword)?.text ?? null;

/** The keywords a PNG's text chunks carry (cheap: no inflate). */
export const listPngTextKeywords = (bytes: Uint8Array): string[] => {
  const chunks = readPngChunks(bytes);
  if (!chunks) return [];
  const out: string[] = [];
  for (const c of chunks) {
    if (c.type !== 'iTXt' && c.type !== 'tEXt' && c.type !== 'zTXt') continue;
    const sep = c.data.indexOf(0);
    if (sep > 0) out.push(ascii(c.data.subarray(0, sep)));
  }
  return out;
};

// ── pixels ────────────────────────────────────────────────────────────────────────────────────

export interface DecodedPng {
  width: number;
  height: number;
  channels: 3 | 4;
  /** Row-major, `channels` bytes per pixel, no filter bytes. */
  pixels: Uint8Array;
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/**
 * Decode a non-interlaced 8-bit RGB or RGBA PNG. Null for anything else, for a corrupt stream,
 * or when the raw image would exceed `maxBytes`.
 */
export const decodePng = (bytes: Uint8Array, opts: { maxBytes?: number } = {}): DecodedPng | null => {
  try {
    const h = readPngHeader(bytes);
    if (!h || h.bitDepth !== 8 || h.interlace !== 0 || (h.colorType !== 2 && h.colorType !== 6)) return null;
    if (h.width < 1 || h.height < 1) return null;
    const channels = h.colorType === 6 ? 4 : 3;
    const stride = h.width * channels;
    const rawLen = h.height * (stride + 1);
    if (!Number.isSafeInteger(rawLen) || rawLen > (opts.maxBytes ?? 64 * 1024 * 1024)) return null;
    const chunks = readPngChunks(bytes);
    if (!chunks) return null;
    const idats = chunks.filter((c) => c.type === 'IDAT');
    if (!idats.length) return null;
    const total = idats.reduce((n, c) => n + c.data.length, 0);
    const z = new Uint8Array(total);
    let o = 0;
    for (const c of idats) {
      z.set(c.data, o);
      o += c.data.length;
    }
    const raw = unzlibSync(z, { out: new Uint8Array(rawLen) });
    if (raw.length < rawLen) return null;
    const px = new Uint8Array(h.height * stride);
    for (let y = 0; y < h.height; y++) {
      const f = raw[y * (stride + 1)];
      const src = y * (stride + 1) + 1;
      const dst = y * stride;
      const up = dst - stride;
      for (let x = 0; x < stride; x++) {
        const v = raw[src + x];
        const a = x >= channels ? px[dst + x - channels] : 0;
        const b = y > 0 ? px[up + x] : 0;
        const c = x >= channels && y > 0 ? px[up + x - channels] : 0;
        let out: number;
        switch (f) {
          case 0: out = v; break;
          case 1: out = v + a; break;
          case 2: out = v + b; break;
          case 3: out = v + ((a + b) >> 1); break;
          case 4: out = v + paeth(a, b, c); break;
          default: return null;
        }
        px[dst + x] = out & 0xff;
      }
    }
    return { width: h.width, height: h.height, channels, pixels: px };
  } catch {
    return null;
  }
};

export type PngFilter = 0 | 1 | 2 | 3 | 4;

export interface EncodePngOptions {
  /** 3 (RGB, the default) or 4 (RGBA). `pixels` must hold `width × height × channels` bytes. */
  channels?: 3 | 4;
  /** Text chunks, written before IDAT. `compress` zlib-compresses an iTXt's text. */
  text?: (PngTextEntry & { compress?: boolean })[];
  /** One filter for every row, or a choice per row (default 0, None). */
  filter?: PngFilter | ((y: number) => PngFilter);
  /** zlib level (default 6). */
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  putU32(out, 0, data.length);
  out.set(asciiBytes(type), 4);
  out.set(data, 8);
  putU32(out, 8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
};

const itxtData = (keyword: string, text: string, compress: boolean): Uint8Array => {
  const key = asciiBytes(keyword);
  const body = compress ? zlibSync(utf8.encode(text), { level: 9 }) : utf8.encode(text);
  // keyword \0 compressionFlag compressionMethod languageTag(empty) \0 translatedKeyword(empty) \0 text
  const out = new Uint8Array(key.length + 5 + body.length);
  out.set(key, 0);
  let p = key.length;
  out[p++] = 0;
  out[p++] = compress ? 1 : 0;
  out[p++] = 0;
  out[p++] = 0;
  out[p++] = 0;
  out.set(body, p);
  return out;
};

/** Encode 8-bit RGB / RGBA pixels as a PNG. Throws only on a programming error (wrong buffer
 *  length, a keyword that is not 1–79 Latin-1 characters). */
export const encodePng = (width: number, height: number, pixels: Uint8Array, opts: EncodePngOptions = {}): Uint8Array => {
  const channels = opts.channels ?? 3;
  const stride = width * channels;
  if (pixels.length !== stride * height) throw new Error(`encodePng: expected ${stride * height} bytes, got ${pixels.length}`);
  const ihdr = new Uint8Array(13);
  putU32(ihdr, 0, width);
  putU32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  const raw = new Uint8Array(height * (stride + 1));
  const pick = opts.filter ?? 0;
  for (let y = 0; y < height; y++) {
    const f = typeof pick === 'function' ? pick(y) : pick;
    const dst = y * (stride + 1);
    raw[dst] = f;
    const row = y * stride;
    const up = row - stride;
    for (let x = 0; x < stride; x++) {
      const v = pixels[row + x];
      const a = x >= channels ? pixels[row + x - channels] : 0;
      const b = y > 0 ? pixels[up + x] : 0;
      const c = x >= channels && y > 0 ? pixels[up + x - channels] : 0;
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      raw[dst + 1 + x] = (v - pred) & 0xff;
    }
  }
  const parts: Uint8Array[] = [PNG_SIGNATURE, chunk('IHDR', ihdr)];
  for (const t of opts.text ?? []) {
    if (!/^[\x20-\x7e\xa1-\xff]{1,79}$/.test(t.keyword)) throw new Error(`encodePng: bad keyword ${JSON.stringify(t.keyword)}`);
    parts.push(chunk('iTXt', itxtData(t.keyword, t.text, !!t.compress)));
  }
  parts.push(chunk('IDAT', zlibSync(raw, { level: opts.level ?? 6 })));
  parts.push(chunk('IEND', new Uint8Array(0)));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** The same PNG without any text chunk — what a chat app or "copy image" hands back. */
export const stripPngText = (bytes: Uint8Array): Uint8Array | null => {
  const chunks = readPngChunks(bytes);
  if (!chunks) return null;
  const kept = chunks.filter((c) => c.type !== 'iTXt' && c.type !== 'tEXt' && c.type !== 'zTXt');
  const parts = [PNG_SIGNATURE, ...kept.map((c) => chunk(c.type, c.data))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
