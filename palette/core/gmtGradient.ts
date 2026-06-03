/**
 * Pure mirror of GMT's generateGradientTextureBuffer (utils/colorUtils.ts), for
 * the 'srgb' colorSpace + 'oklab'/'rgb' blendSpace cases the stop-fitter emits.
 *
 * Why a mirror instead of importing the real one: keeping core/ free of THREE
 * (colorUtils imports it) so it stays a portable library. A regression harness
 * (debug/test-palette-stopfit.mts) asserts this is byte-identical to GMT's
 * function for the relevant config — if it ever drifts, the test fails.
 *
 * Float→Uint8 truncation is preserved exactly (GMT assigns float channels into a
 * Uint8Array, which truncates toward zero), so the bytes match.
 */

import type { GradientStop, BlendColorSpace, ColorSpaceMode } from '../../types';
import { lerpOklab, srgbToLinear01, type RGB } from './oklab';

export const hexToRgb = (hex: string): RGB => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (c: RGB): string =>
  '#' +
  ((1 << 24) + (Math.round(c.r) << 16) + (Math.round(c.g) << 8) + Math.round(c.b))
    .toString(16)
    .slice(1)
    .toUpperCase();

const lerpRGB = (c1: RGB, c2: RGB, t: number): RGB => ({
  r: c1.r + (c2.r - c1.r) * t,
  g: c1.g + (c2.g - c1.g) * t,
  b: c1.b + (c2.b - c1.b) * t,
});

const blendLerp = (c1: RGB, c2: RGB, t: number, space: BlendColorSpace): RGB =>
  space === 'oklab' ? lerpOklab(c1, c2, t) : lerpRGB(c1, c2, t);

// Bias: maps t so input 'bias' lands at 0.5 output (verbatim from colorUtils).
const applyBias = (t: number, bias: number): number => {
  if (Math.abs(bias - 0.5) < 0.001) return t;
  const safeBias = Math.max(0.001, Math.min(0.999, bias));
  const k = Math.log(0.5) / Math.log(safeBias);
  return Math.pow(t, k);
};

const sRGBToLinear = (c: number) => srgbToLinear01(c) * 255.0;

const inverseACES = (c: number): number => {
  const y = c / 255.0;
  if (y >= 0.99) return 255.0;
  const x = (Math.sqrt(-10127 * y * y + 13702 * y + 9) + 59 * y - 3) / (502 - 486 * y);
  return Math.max(0, x) * 255.0;
};

/**
 * Render stops to a 256-step colour ramp, matching generateGradientTextureBuffer.
 * Returns {r,g,b}[256] (floats, pre-truncation) — use renderStopsToBuffer for the
 * byte-exact Uint8Array.
 */
export const renderStopsToRamp = (
  stops: GradientStop[],
  blendSpace: BlendColorSpace = 'oklab',
  colorSpace: ColorSpaceMode = 'srgb',
): RGB[] => {
  const width = 256;
  const out: RGB[] = new Array(width);

  if (stops.length === 0) {
    for (let i = 0; i < width; i++) {
      const v = Math.floor((i / 255) * 255);
      out[i] = { r: v, g: v, b: v };
    }
    return out;
  }

  const sorted = [...stops].sort((a, b) => a.position - b.position);

  const getColorAt = (pos: number): RGB => {
    let raw: RGB = { r: 0, g: 0, b: 0 };
    if (pos <= sorted[0].position) {
      raw = hexToRgb(sorted[0].color);
    } else if (pos >= sorted[sorted.length - 1].position) {
      raw = hexToRgb(sorted[sorted.length - 1].color);
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
          const s1 = sorted[i];
          const s2 = sorted[i + 1];
          let t = (pos - s1.position) / (s2.position - s1.position);
          const bias = s1.bias ?? 0.5;
          if (Math.abs(bias - 0.5) > 0.001) t = applyBias(t, bias);
          const mode = s1.interpolation || 'linear';
          if (mode === 'step') t = 0.0;
          else if (mode === 'smooth' || mode === 'cubic') t = t * t * (3 - 2 * t);
          raw = blendLerp(hexToRgb(s1.color), hexToRgb(s2.color), t, blendSpace);
          break;
        }
      }
    }

    if (colorSpace === 'linear') return { r: sRGBToLinear(raw.r), g: sRGBToLinear(raw.g), b: sRGBToLinear(raw.b) };
    if (colorSpace === 'aces_inverse') return { r: inverseACES(raw.r), g: inverseACES(raw.g), b: inverseACES(raw.b) };
    return raw;
  };

  for (let i = 0; i < width; i++) out[i] = getColorAt(i / (width - 1));
  return out;
};

/** Byte-exact mirror of generateGradientTextureBuffer (RGBA Uint8Array, 256×1). */
export const renderStopsToBuffer = (
  stops: GradientStop[],
  blendSpace: BlendColorSpace = 'oklab',
  colorSpace: ColorSpaceMode = 'srgb',
): Uint8Array => {
  const ramp = renderStopsToRamp(stops, blendSpace, colorSpace);
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    data[i * 4] = ramp[i].r; // float→Uint8 truncation matches GMT
    data[i * 4 + 1] = ramp[i].g;
    data[i * 4 + 2] = ramp[i].b;
    data[i * 4 + 3] = 255;
  }
  return data;
};
