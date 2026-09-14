/**
 * gradientRamp — the RAMP form of a gradient: 256 sRGB texels carried as a string.
 *
 * A `GradientConfig` is one of exactly two forms (ADR-0122):
 *   - a STOP gradient — `stops.length > 0`. Its ramp is the render of its stops; it carries no
 *     `ramp` field, and one left over from an object spread is IGNORED (stops win).
 *   - a RAMP gradient — `stops: []` plus `ramp`, base64 of 768 bytes (texel 0 first, R G B).
 *     `blendSpace` is inert on it; `colorSpace` applies at texture-build time exactly as it
 *     does to stops.
 *
 * This file is the codec and the form predicates, and nothing else. It imports nothing from
 * `utils/colorUtils.ts` on purpose — colorUtils imports IT, and the one reader every consumer
 * goes through (`renderGradientToRamp`, and `generateGradientTextureBuffer` for the texture)
 * lives there, beside the colour-space transforms it needs.
 *
 * Integration seams:
 *   - Producing a ramp gradient from samples, with the automatic "keep stops only when cheap"
 *     rule: `rampToGradientConfig` in `palette/core/stopFit.ts` (the fitter's home).
 *   - Persistence boundaries call `normalizeGradientConfig` so a stale `ramp` never rides a
 *     stop gradient to disk — a stop gradient's saved form stays byte-identical to pre-ADR.
 *
 * Pitfalls:
 *   - The empty marker is `[]`, never a sentinel string: see ADR-0122 Decision 2 for the
 *     old-tab favourites deletion a string would cause.
 *   - Keep the ramp a STRING. A `Uint8Array` does not survive `JSON.stringify` (undo snapshots,
 *     .gmf, share URLs all turn it into `{"0":…}`).
 *   - `decodeRampBytes` hands back a CACHED buffer. Read it, never write it.
 *
 * @invariant encode → decode is lossless for byte ramps, a malformed string decodes to null,
 *   and a ramp gradient renders its texels byte-for-byte through the texture seam — proven by:
 *   npm run test:palette-gradientramp ("codec round-trips 256 random texels", "a malformed ramp
 *   string is dropped" / "is refused", "srgb ramp buffer is the texels verbatim"). Falsified
 *   2026-09-14, see the harness header — the regex and the decoded-length check are two walls
 *   for one thing, so removing either alone stays green by design.
 * @see docs/adr/0122-the-ramp-is-the-gradient.md
 */

import type { GradientConfig, GradientStop } from '../types';

type RGBLike = { r: number; g: number; b: number };

export const RAMP_TEXELS = 256;
const RAMP_BYTES = RAMP_TEXELS * 3;
/** 768 bytes of base64 — no padding, because 768 is a multiple of 3. */
export const RAMP_STRING_LENGTH = 1024;
const RAMP_STRING_RE = /^[A-Za-z0-9+/]{1024}$/;

const toByte = (v: number): number => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

/** Encode 256 RGB colours (0–255, floats rounded and clamped) as a ramp string. */
export const encodeRamp = (ramp: ArrayLike<RGBLike>): string => {
  if (ramp.length !== RAMP_TEXELS) throw new Error(`encodeRamp expects ${RAMP_TEXELS} texels, got ${ramp.length}`);
  const bytes = new Uint8Array(RAMP_BYTES);
  for (let i = 0; i < RAMP_TEXELS; i++) {
    const c = ramp[i];
    bytes[i * 3] = toByte(c.r);
    bytes[i * 3 + 1] = toByte(c.g);
    bytes[i * 3 + 2] = toByte(c.b);
  }
  return bytesToBase64(bytes);
};

/** Encode a packed 256-texel buffer (RGBA by default — the catalogue's `entry.ramp`). */
export const encodeRampBuffer = (buf: Uint8Array, stride = 4): string => {
  if (buf.length < RAMP_TEXELS * stride) throw new Error(`encodeRampBuffer expects ${RAMP_TEXELS * stride} bytes, got ${buf.length}`);
  const bytes = new Uint8Array(RAMP_BYTES);
  for (let i = 0; i < RAMP_TEXELS; i++) {
    bytes[i * 3] = buf[i * stride];
    bytes[i * 3 + 1] = buf[i * stride + 1];
    bytes[i * 3 + 2] = buf[i * stride + 2];
  }
  return bytesToBase64(bytes);
};

/** A well-formed ramp string: exactly 1,024 base64 characters (768 bytes). */
export const isRampString = (v: unknown): v is string => typeof v === 'string' && RAMP_STRING_RE.test(v);

// Decoding is cheap, but a wall of tiles or a render loop can ask for the same few ramps many
// times a frame. Small bounded cache, insertion-order eviction.
const DECODE_CACHE_MAX = 512;
const decodeCache = new Map<string, Uint8Array>();

/** The 768 raw bytes of a ramp string, or null when malformed. CACHED — treat as read-only. */
export const decodeRampBytes = (s: unknown): Uint8Array | null => {
  if (!isRampString(s)) return null;
  const hit = decodeCache.get(s);
  if (hit) return hit;
  let bin: string;
  try {
    bin = atob(s);
  } catch {
    return null;
  }
  if (bin.length !== RAMP_BYTES) return null;
  const bytes = new Uint8Array(RAMP_BYTES);
  for (let i = 0; i < RAMP_BYTES; i++) bytes[i] = bin.charCodeAt(i);
  if (decodeCache.size >= DECODE_CACHE_MAX) decodeCache.delete(decodeCache.keys().next().value as string);
  decodeCache.set(s, bytes);
  return bytes;
};

/** A ramp string as 256 fresh RGB objects (0–255 integers), or null when malformed. */
export const decodeRamp = (s: unknown): RGBLike[] | null => {
  const bytes = decodeRampBytes(s);
  if (!bytes) return null;
  const out: RGBLike[] = new Array(RAMP_TEXELS);
  for (let i = 0; i < RAMP_TEXELS; i++) out[i] = { r: bytes[i * 3], g: bytes[i * 3 + 1], b: bytes[i * 3 + 2] };
  return out;
};

/** True for the RAMP form: no stops, and a well-formed ramp string. */
export const isRampGradient = (cfg: unknown): cfg is GradientConfig & { ramp: string } => {
  if (!cfg || typeof cfg !== 'object') return false;
  const c = cfg as { stops?: unknown; ramp?: unknown };
  return Array.isArray(c.stops) && c.stops.length === 0 && isRampString(c.ramp);
};

/** True for the STOP form (at least one stop). A bare legacy `GradientStop[]` is not a config. */
export const isStopGradient = (cfg: unknown): cfg is GradientConfig => {
  if (!cfg || typeof cfg !== 'object') return false;
  const c = cfg as { stops?: unknown };
  return Array.isArray(c.stops) && c.stops.length > 0;
};

/** Build a RAMP gradient from 256 colours (or an already-encoded ramp string). */
export const makeRampGradient = (
  ramp: ArrayLike<RGBLike> | string,
  colorSpace: GradientConfig['colorSpace'] = 'srgb',
  blendSpace: GradientConfig['blendSpace'] = 'oklab',
): GradientConfig => ({
  stops: [],
  ramp: typeof ramp === 'string' ? ramp : encodeRamp(ramp),
  colorSpace,
  blendSpace,
});

/**
 * One of the two forms, and nothing extra: a stop gradient loses a stale `ramp`; a config with
 * no stops keeps its ramp only if it is well-formed. Returns the SAME object when nothing needs
 * to change, so callers can compare by identity. Not a validator — it does not check stop shapes
 * (that is `coerceGradientConfig` in palette/core/editorConfig.ts).
 */
export const normalizeGradientConfig = <T extends GradientConfig>(cfg: T): T => {
  if (!cfg || typeof cfg !== 'object') return cfg;
  const hasRampKey = Object.prototype.hasOwnProperty.call(cfg, 'ramp');
  if (!hasRampKey) return cfg;
  // A config with no stops ARRAY is malformed, not this function's to reject — it is only ever
  // handed the value the caller already has, so it must not throw on it. Treat it as stop-less.
  const stopCount = Array.isArray(cfg.stops) ? cfg.stops.length : 0;
  if (stopCount > 0 || !isRampString(cfg.ramp)) {
    const { ramp: _drop, ...rest } = cfg;
    return rest as T;
  }
  return cfg;
};

/** The stops a caller may walk: `[]` for a ramp gradient or anything malformed. */
export const stopsOf = (input: GradientStop[] | GradientConfig | undefined | null): GradientStop[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return Array.isArray(input.stops) ? input.stops : [];
};
