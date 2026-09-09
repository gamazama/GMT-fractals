/**
 * gradientMapChannels — WHICH property of an image pixel drives the gradient-map lookup.
 *
 * The gradient map's classic form asks one question of every pixel — "how light is it?" — and
 * answers with a colour from the ramp. That is one channel of seven the pixel actually carries,
 * and the others make pictures the luma map cannot: mapping HUE paints every red thing one
 * colour and every blue thing another regardless of exposure, mapping CHROMA separates the
 * vivid subject from the grey background, mapping a single RGB channel is the darkroom's
 * channel-separation trick. This module is the whole set, as pure maths.
 *
 * Contract: pure, DOM-free, dependency-light — `mapChannelValue` is a function of the three
 * bytes and the channel id and nothing else, so the harness can pin every channel without a
 * canvas or an image. It is imported by `gradient-explorer/fullscreen/modes/gradientMapMode.tsx`
 * (which owns the pixels) and by nothing else.
 *
 * ── Why the values are normalised the way they are ──────────────────────────────────────
 * Every channel returns 0..1 because that is what a ramp position is. The three that are not
 * naturally in that range are handled deliberately:
 *   • HUE is an ANGLE, so 0 and 1 are the same colour. A hue map therefore wraps: the ramp's
 *     first and last colours meet on red. That is correct, not a defect — but it does mean a
 *     ramp whose ends differ shows a seam there, which is a property of the picture, not a bug.
 *   • CHROMA has no fixed ceiling; sRGB's most saturated colours reach OKLCh C ≈ 0.32. The
 *     divisor is {@link CHROMA_MAX} = 0.4 — the same headroom the Curves editor uses for its
 *     chroma track — so ordinary images use most of the ramp without the vivid ones clipping.
 *   • LIGHTNESS is OKLab L, which is already 0..1 and is perceptual, unlike luma. It is the
 *     "correct" lightness where {@link MapChannel} 0's Rec. 709 luma is the FAMILIAR one, and
 *     both are offered because the familiar one is what a gradient map is expected to do.
 *
 * @invariant Every channel returns a value in [0,1] for every possible 8-bit RGB triple —
 *   proven by: `npx tsx debug/test-palette-mapchannels.mts` section [2] ("<channel>: in range
 *   over the 8-bit cube"), which walks a 32³ lattice of the RGB cube plus the 8 corners for
 *   each channel. Dropping hue's `t - Math.floor(t)` wrap turns it red at exit 1 (falsified
 *   2026-09-08: "hue: in range over the 8-bit cube (-0.500..0.500)").
 *
 *   NOT proven by that section: the {@link CHROMA_MAX} divisor. Raw OKLCh chroma already fits
 *   inside [0,1] in sRGB (it peaks at ~0.32), so deleting the division leaves section [2]
 *   fully green — verified 2026-09-08 by doing it. What catches that is section [3] ("chroma:
 *   vivid reads high"), which asserts a saturated primary reaches past 0.4 of the ramp rather
 *   than being squeezed into its first third. Cite THAT one for the normalisation; this
 *   invariant covers the bounds and nothing else.
 *
 * @see palette/core/rampGeometry.ts (`mapChannel` lives in the flat-optional params bag)
 * @see gradient-explorer/fullscreen/modes/gradientMapMode.tsx (the consumer)
 */

import { rgbToOklab } from './oklab';

/** The channels, in selector order. The INDEX is what `GeometryParams.mapChannel` stores, so
 *  these are append-only: reordering them silently re-reads any state a user already has. */
export const MAP_CHANNELS = [
  { id: 'luma', label: 'Luma' },
  { id: 'red', label: 'Red' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'hue', label: 'Hue' },
  { id: 'chroma', label: 'Chroma' },
  { id: 'lightness', label: 'Lightness' },
] as const;

export type MapChannel = (typeof MAP_CHANNELS)[number]['id'];

/** Local clamp — this module stays dependency-light on purpose (see the header). */
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Chroma normalisation ceiling — sRGB peaks at OKLCh C ≈ 0.32; 0.4 leaves headroom so the
 *  most saturated pixels do not all flatten onto the ramp's last colour. */
export const CHROMA_MAX = 0.4;

/** Resolve a stored `mapChannel` index to a channel id, falling back to luma for anything
 *  out of range (old state, a hand-edited share link). */
export const mapChannelAt = (index: number): MapChannel =>
  MAP_CHANNELS[Math.round(index)]?.id ?? 'luma';

/**
 * The ramp position a pixel takes, in [0,1]. `r`/`g`/`b` are gamma-encoded sRGB in 0..255
 * (they may be fractional — the caller bilinearly resamples before asking).
 *
 * Luma is Rec. 709 on the ENCODED bytes (`0.2126R' + 0.7152G' + 0.0722B'`), which is what
 * Photoshop-style gradient maps use and costs one dot product; the perceptual alternative is
 * the `lightness` channel. The three OKLab channels pay a cube root per pixel, which is why
 * they are a choice rather than the default.
 */
export const mapChannelValue = (r: number, g: number, b: number, channel: MapChannel): number => {
  switch (channel) {
    case 'red':
      return clamp01(r / 255);
    case 'green':
      return clamp01(g / 255);
    case 'blue':
      return clamp01(b / 255);
    case 'hue': {
      const lab = rgbToOklab({ r, g, b });
      // atan2 → turns, wrapped to [0,1). A grey pixel has no hue at all; it lands on 0 rather
      // than on whatever the floating-point noise in a/b happens to say.
      if (Math.abs(lab.a) < 1e-6 && Math.abs(lab.b) < 1e-6) return 0;
      const t = Math.atan2(lab.b, lab.a) / (2 * Math.PI);
      return t - Math.floor(t);
    }
    case 'chroma': {
      const lab = rgbToOklab({ r, g, b });
      return clamp01(Math.hypot(lab.a, lab.b) / CHROMA_MAX);
    }
    case 'lightness':
      return clamp01(rgbToOklab({ r, g, b }).L);
    case 'luma':
    default:
      return clamp01((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
  }
};
