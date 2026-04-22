// Save / load of a complete toy-fluid configuration as JSON or PNG.
// The PNG embeds the same JSON as a tEXt chunk (keyword "GmtFluidState")
// so an image alone is enough to reconstruct the scene — nice for sharing.
//
// Schema is intentionally close to the Preset shape so user-sent exports can
// be pasted into `presets.ts` with minimal editing.

import type { FluidParams } from './fluid/FluidEngine';
import type { GradientConfig } from '../types';
import type { OrbitState } from './presets';

export const SAVED_STATE_VERSION = 1;
export const PNG_KEYWORD = 'GmtFluidState';

export interface SavedState {
  version: number;
  /** ISO timestamp the user saved at. */
  savedAt: string;
  /** Human-readable label (default: timestamp-ish). */
  name?: string;
  /** Params — the full FluidParams record. */
  params: FluidParams;
  /** Main colour gradient. */
  gradient: GradientConfig;
  /** B&W gradient driving collision mask (optional for back-compat with pre-v2 saves). */
  collisionGradient?: GradientConfig;
  /** Orbit state. */
  orbit: OrbitState;
}

export function buildSavedState(
  params: FluidParams,
  gradient: GradientConfig,
  orbit: OrbitState,
  collisionGradient?: GradientConfig,
  name?: string,
): SavedState {
  return {
    version: SAVED_STATE_VERSION,
    savedAt: new Date().toISOString(),
    name,
    params,
    gradient,
    collisionGradient,
    orbit,
  };
}

/** Lightweight validator. Accepts anything with the required top-level shape. */
export function parseSavedState(raw: unknown): SavedState {
  if (!raw || typeof raw !== 'object') throw new Error('Saved state is not an object');
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== 'number') throw new Error('Missing or invalid "version"');
  if (!o.params || typeof o.params !== 'object') throw new Error('Missing "params"');
  if (!o.gradient || typeof o.gradient !== 'object') throw new Error('Missing "gradient"');
  if (!o.orbit || typeof o.orbit !== 'object') throw new Error('Missing "orbit"');
  return {
    version: o.version as number,
    savedAt: typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString(),
    name: typeof o.name === 'string' ? o.name : undefined,
    params: o.params as FluidParams,
    gradient: o.gradient as GradientConfig,
    collisionGradient: (o.collisionGradient && typeof o.collisionGradient === 'object')
      ? o.collisionGradient as GradientConfig
      : undefined,
    orbit: o.orbit as OrbitState,
  };
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer the revoke so Safari can read the URL before it dies.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(state: SavedState, filename = 'toy-fluid-state.json') {
  const txt = JSON.stringify(state, null, 2);
  triggerDownload(new Blob([txt], { type: 'application/json' }), filename);
}

export async function downloadPng(canvas: HTMLCanvasElement, state: SavedState, filename = 'toy-fluid.png') {
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob returned null');
  const raw = new Uint8Array(await blob.arrayBuffer());
  const augmented = injectPngTextChunk(raw, PNG_KEYWORD, JSON.stringify(state));
  // Copy into a fresh plain ArrayBuffer so Blob()'s BlobPart typing is happy
  // (Uint8Array<SharedArrayBufferLike> isn't assignable to BlobPart).
  const copy = new Uint8Array(augmented.byteLength);
  copy.set(augmented);
  triggerDownload(new Blob([copy.buffer], { type: 'image/png' }), filename);
}

/** Download a plain PNG of the canvas — no embedded state metadata. */
export async function downloadScreenshot(canvas: HTMLCanvasElement, filename = 'toy-fluid-screenshot.png') {
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob returned null');
  triggerDownload(blob, filename);
}

/** Read a file (JSON or PNG) and extract a SavedState. */
export async function readSavedStateFromFile(file: File): Promise<SavedState> {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  // PNG signature is 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    name.endsWith('.png') ||
    (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a);
  if (isPng) {
    const txt = extractPngTextChunk(buf, PNG_KEYWORD);
    if (!txt) throw new Error(`PNG has no "${PNG_KEYWORD}" metadata.`);
    return parseSavedState(JSON.parse(txt));
  }
  // JSON / text
  const txt = new TextDecoder('utf-8').decode(buf);
  return parseSavedState(JSON.parse(txt));
}

// ---------------------------------------------------------------------------
// PNG chunk editing (tEXt)
// ---------------------------------------------------------------------------

/**
 * Inject a `tEXt` chunk with (keyword, text) right after the IHDR chunk of `png`.
 * Returns a new Uint8Array. Does not verify the original PNG beyond its signature.
 */
export function injectPngTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  // PNG layout: 8-byte signature, then chunks. Each chunk: length(4) | type(4) | data | crc(4).
  const sig = png.subarray(0, 8);
  // Find IHDR end (IHDR is always the first chunk after the signature, and has 13 bytes of data).
  // IHDR chunk size: 4 (length) + 4 (type) + 13 (data) + 4 (crc) = 25 bytes, so IHDR ends at 8+25=33.
  // We inject after IHDR so our tEXt is early in the stream.
  const afterIhdr = 33;
  const head = png.subarray(0, afterIhdr);
  const tail = png.subarray(afterIhdr);

  const chunk = buildPngTextChunk(keyword, text);
  const out = new Uint8Array(head.length + chunk.length + tail.length);
  out.set(head, 0);
  out.set(chunk, head.length);
  out.set(tail, head.length + chunk.length);
  // Silence the unused-var warning
  void sig;
  return out;
}

/** Scan all chunks for a tEXt chunk with the given keyword, return its text or null. */
export function extractPngTextChunk(png: Uint8Array, keyword: string): string | null {
  let pos = 8; // skip signature
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (pos + 12 <= png.length) {
    const length = dv.getUint32(pos, false); // big-endian
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const dataStart = pos + 8;
    const dataEnd = dataStart + length;
    if (type === 'tEXt') {
      // Keyword | NUL | text (Latin-1)
      const data = png.subarray(dataStart, dataEnd);
      const nulIdx = data.indexOf(0);
      if (nulIdx > 0) {
        const kw = new TextDecoder('latin1').decode(data.subarray(0, nulIdx));
        if (kw === keyword) {
          return new TextDecoder('utf-8').decode(data.subarray(nulIdx + 1));
        }
      }
    }
    if (type === 'IEND') break;
    pos = dataEnd + 4; // skip crc
  }
  return null;
}

function buildPngTextChunk(keyword: string, text: string): Uint8Array {
  // tEXt data = keyword bytes (Latin-1, 1..79 chars) | 0x00 | text bytes (Latin-1).
  // The PNG spec requires Latin-1 for tEXt. Our JSON may contain non-Latin-1 codepoints
  // (emoji etc.) — unlikely for a params blob, but we encode as UTF-8 and accept that a
  // strict PNG reader would complain. Round-tripping through OUR reader is what matters.
  const te = new TextEncoder();
  const keyBytes = te.encode(keyword);
  const textBytes = te.encode(text);
  if (keyBytes.length === 0 || keyBytes.length > 79) throw new Error('keyword length out of range');
  const dataLen = keyBytes.length + 1 + textBytes.length;

  const buf = new Uint8Array(12 + dataLen);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, dataLen, false);         // length
  buf[4] = 0x74; buf[5] = 0x45; buf[6] = 0x58; buf[7] = 0x74; // "tEXt"
  buf.set(keyBytes, 8);
  buf[8 + keyBytes.length] = 0;
  buf.set(textBytes, 8 + keyBytes.length + 1);
  // CRC is computed over type + data
  const crc = crc32(buf, 4, 8 + dataLen);
  dv.setUint32(8 + dataLen, crc, false);
  return buf;
}

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
