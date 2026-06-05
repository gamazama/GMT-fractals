
import { GradientStop, GradientConfig, ColorSpaceMode, BlendColorSpace } from '../types';

/** Plain sRGB triple, 0–255 floats (pre-truncation). Structurally identical to palette `RGB`. */
export type RGB = { r: number; g: number; b: number };

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number | {r:number, g:number, b:number}, g?: number, b?: number): string => {
  if (typeof r === 'object') {
    g = r.g;
    b = r.b;
    r = r.r;
  }
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g!) << 8) + Math.round(b!)).toString(16).slice(1).toUpperCase();
};

export const rgbToHsv = ({r, g, b}: {r: number, g: number, b: number}) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

export const hsvToRgb = (h: number, s: number, v: number) => {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
};

/** Normalise a hue (degrees) into [0,360). */
export const wrapHue = (h: number): number => ((h % 360) + 360) % 360;

export const lerpRGB = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number) => {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t
  };
};

// --- HSV interpolation (shortest hue path) ---
export const lerpHSV = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number): {r:number, g:number, b:number} => {
    const hsv1 = rgbToHsv(c1);
    const hsv2 = rgbToHsv(c2);
    let dh = hsv2.h - hsv1.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    const h = wrapHue(hsv1.h + dh * t);
    const s = hsv1.s + (hsv2.s - hsv1.s) * t;
    const v = hsv1.v + (hsv2.v - hsv1.v) * t;
    return hsvToRgb(h, s, v);
};

// --- HSV interpolation (longest / far hue path) ---
export const lerpHSVFar = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number): {r:number, g:number, b:number} => {
    const hsv1 = rgbToHsv(c1);
    const hsv2 = rgbToHsv(c2);
    let dh = hsv2.h - hsv1.h;
    // Take the LONG way around
    if (dh >= 0 && dh <= 180) dh -= 360;
    if (dh < 0 && dh >= -180) dh += 360;
    const h = wrapHue(hsv1.h + dh * t);
    const s = hsv1.s + (hsv2.s - hsv1.s) * t;
    const v = hsv1.v + (hsv2.v - hsv1.v) * t;
    return hsvToRgb(h, s, v);
};

// --- Oklab color space ---
// sRGB [0-255] -> linear [0-1]
const srgbToLinear01 = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

// linear [0-1] -> sRGB [0-255]
const linear01ToSrgb = (c: number) => {
    const v = Math.max(0, Math.min(1, c));
    return (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
};

const rgbToOklab = (c: {r:number, g:number, b:number}): {L:number, a:number, b:number} => {
    const lr = srgbToLinear01(c.r), lg = srgbToLinear01(c.g), lb = srgbToLinear01(c.b);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return {
        L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    };
};

const oklabToRgb = (lab: {L:number, a:number, b:number}): {r:number, g:number, b:number} => {
    const l = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    const m = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    const s = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;
    const l3 = l * l * l, m3 = m * m * m, s3 = s * s * s;
    return {
        r: linear01ToSrgb(+4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
        g: linear01ToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
        b: linear01ToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)
    };
};

export const lerpOklab = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number): {r:number, g:number, b:number} => {
    const lab1 = rgbToOklab(c1);
    const lab2 = rgbToOklab(c2);

    // Use Oklch (polar) interpolation to preserve chroma/saturation.
    // Rectangular a,b lerp cuts through the achromatic axis, causing grey midpoints.
    const c1Chroma = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2Chroma = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);

    // If either color is near-achromatic, fall back to rectangular lerp
    // (hue is undefined for greys)
    if (c1Chroma < 0.005 || c2Chroma < 0.005) {
        return oklabToRgb({
            L: lab1.L + (lab2.L - lab1.L) * t,
            a: lab1.a + (lab2.a - lab1.a) * t,
            b: lab1.b + (lab2.b - lab1.b) * t
        });
    }

    const h1 = Math.atan2(lab1.b, lab1.a);
    const h2 = Math.atan2(lab2.b, lab2.a);
    let dh = h2 - h1;
    if (dh > Math.PI) dh -= 2 * Math.PI;
    if (dh < -Math.PI) dh += 2 * Math.PI;

    const h = h1 + dh * t;
    const c = c1Chroma + (c2Chroma - c1Chroma) * t;
    const L = lab1.L + (lab2.L - lab1.L) * t;

    return oklabToRgb({ L, a: c * Math.cos(h), b: c * Math.sin(h) });
};

/** Dispatch color interpolation based on blend space */
export const blendLerp = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number, space: BlendColorSpace): {r:number, g:number, b:number} => {
    switch (space) {
        case 'hsv':     return lerpHSV(c1, c2, t);
        case 'hsv-far': return lerpHSVFar(c1, c2, t);
        case 'oklab':   return lerpOklab(c1, c2, t);
        default:        return lerpRGB(c1, c2, t);
    }
};

// Bias Helper: Maps t [0,1] such that input 'bias' maps to 0.5 output
const applyBias = (t: number, bias: number) => {
    if (Math.abs(bias - 0.5) < 0.001) return t;
    const safeBias = Math.max(0.001, Math.min(0.999, bias));
    const k = Math.log(0.5) / Math.log(safeBias);
    return Math.pow(t, k);
};

export const getGradientCssString = (input: GradientStop[] | GradientConfig | undefined, viewGamma: number = 1.0): string => {
  let stops: GradientStop[];
  let blend: BlendColorSpace = 'rgb';

  if (!input) return 'linear-gradient(90deg, #000 0%, #fff 100%)';

  if (Array.isArray(input)) {
      stops = input;
  } else if (input && Array.isArray((input as GradientConfig).stops)) {
      stops = (input as GradientConfig).stops;
      blend = (input as GradientConfig).blendSpace || 'oklab';
  } else {
      // Fallback for malformed data
      return 'linear-gradient(90deg, #000 0%, #fff 100%)';
  }

  if (!stops || stops.length === 0) return 'linear-gradient(90deg, #000 0%, #fff 100%)';

  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const needsSampling = blend !== 'rgb';
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];

      let pos = Math.pow(s.position, 1.0 / viewGamma);
      pos = Math.max(0, Math.min(1, pos)) * 100;

      parts.push(`${s.color} ${pos.toFixed(2)}%`);

      if (i < sorted.length - 1) {
          const next = sorted[i + 1];
          const segmentBias = s.bias ?? 0.5;
          const interpolation = s.interpolation || 'linear';

          if (interpolation === 'step') {
               let nextPos = Math.pow(next.position, 1.0 / viewGamma);
               nextPos = Math.max(0, Math.min(1, nextPos)) * 100;
               parts.push(`${s.color} ${nextPos.toFixed(2)}%`);
               parts.push(`${next.color} ${nextPos.toFixed(2)}%`);
          }
          else if (needsSampling) {
              // Non-RGB blend: approximate by sampling intermediate colors
              const c1 = hexToRgb(s.color) || {r:0,g:0,b:0};
              const c2 = hexToRgb(next.color) || {r:0,g:0,b:0};
              const SAMPLES = 12;
              for (let j = 1; j < SAMPLES; j++) {
                  let t = j / SAMPLES;
                  if (Math.abs(segmentBias - 0.5) > 0.001) t = applyBias(t, segmentBias);
                  if (interpolation === 'smooth' || interpolation === 'cubic') t = t * t * (3 - 2 * t);
                  const midColor = blendLerp(c1, c2, t, blend);
                  const midPos = s.position + (next.position - s.position) * (j / SAMPLES);
                  let viewMidPos = Math.pow(midPos, 1.0 / viewGamma) * 100;
                  viewMidPos = Math.max(0, Math.min(100, viewMidPos));
                  parts.push(`${rgbToHex(midColor)} ${viewMidPos.toFixed(2)}%`);
              }
          }
          else {
              if (Math.abs(segmentBias - 0.5) > 0.001) {
                  const absHintPos = s.position + (next.position - s.position) * segmentBias;
                  let viewHintPos = Math.pow(absHintPos, 1.0 / viewGamma) * 100;
                  viewHintPos = Math.max(0, Math.min(100, viewHintPos));
                  parts.push(`${viewHintPos.toFixed(2)}%`);
              }
          }
      }
  }

  return `linear-gradient(90deg, ${parts.join(', ')})`;
};

const sRGBToLinear = (c: number) => srgbToLinear01(c) * 255.0;

const inverseACES = (c: number) => {
    const y = c / 255.0;
    if (y >= 0.99) return 255.0;
    const x = (Math.sqrt(-10127*y*y + 13702*y + 9) + 59*y - 3) / (502 - 486*y);
    return Math.max(0, x) * 255.0;
};

/**
 * Sample a PRE-SORTED stop list at a single position — the per-texel core that
 * `renderStopsToRamp` / `generateGradientTextureBuffer` loop over. Kept private so
 * the ramp renderer and the single-position `sampleStops` share ONE code path and
 * stay byte-identical by construction. Honours bias + step/smooth/cubic easing +
 * the colorSpace output transform.
 */
const sampleSorted = (
  sorted: GradientStop[],
  pos: number,
  blendSpace: BlendColorSpace,
  colorSpace: ColorSpaceMode,
): RGB => {
  let raw: RGB = { r: 0, g: 0, b: 0 };

  if (pos <= sorted[0].position) {
    raw = hexToRgb(sorted[0].color) || { r: 0, g: 0, b: 0 };
  } else if (pos >= sorted[sorted.length - 1].position) {
    raw = hexToRgb(sorted[sorted.length - 1].color) || { r: 0, g: 0, b: 0 };
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
        const s1 = sorted[i];
        const s2 = sorted[i + 1];
        let t = (pos - s1.position) / (s2.position - s1.position);
        const bias = s1.bias ?? 0.5;
        if (Math.abs(bias - 0.5) > 0.001) t = applyBias(t, bias);
        const mode = s1.interpolation || 'linear';
        if (mode === 'step') {
          // Hold left color for full segment — switch happens at boundary.
          t = 0.0;
        } else if (mode === 'smooth' || mode === 'cubic') {
          t = t * t * (3 - 2 * t);
        }
        const c1 = hexToRgb(s1.color) || { r: 0, g: 0, b: 0 };
        const c2 = hexToRgb(s2.color) || { r: 0, g: 0, b: 0 };
        raw = blendLerp(c1, c2, t, blendSpace);
        break;
      }
    }
  }

  if (colorSpace === 'linear') return { r: sRGBToLinear(raw.r), g: sRGBToLinear(raw.g), b: sRGBToLinear(raw.b) };
  if (colorSpace === 'aces_inverse') return { r: inverseACES(raw.r), g: inverseACES(raw.g), b: inverseACES(raw.b) };
  return raw;
};

/**
 * @invariant The CANONICAL single-position gradient sampler (engine-core). It is
 * the per-texel function `renderStopsToRamp` loops over — sampling at `i/255`
 * for `i in [0,256)` reproduces the ramp byte-for-byte. Bias + step/smooth/cubic
 * aware, so a colour read from here matches the baked ramp exactly (this fixes the
 * latent drift in AdvancedGradientEditor's old `getInterpolatedColor`, which omitted
 * bias/smooth). Pure: no DOM, no THREE. Returns un-truncated 0–255 floats.
 *
 * For a SINGLE read (eyedropper, new-knot colour). To fill a ramp do NOT loop this —
 * it sorts on every call; use `renderStopsToRamp`, which sorts once.
 * @see palette/core/gmtGradient.ts (re-exports this; the byte-exact mirror was collapsed)
 */
export const sampleStops = (
  stops: GradientStop[],
  pos: number,
  blendSpace: BlendColorSpace = 'oklab',
  colorSpace: ColorSpaceMode = 'srgb',
): RGB => {
  if (!stops || stops.length === 0) {
    const v = Math.floor(Math.max(0, Math.min(1, pos)) * 255); // public API: clamp pos so an out-of-range read can't overflow a channel
    return { r: v, g: v, b: v };
  }
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  return sampleSorted(sorted, pos, blendSpace, colorSpace);
};

/**
 * Render stops to a 256-step colour ramp (RGB floats, pre-truncation). Engine
 * canonical — `palette/core/gmtGradient.ts` re-exports this. Use
 * `renderStopsToBuffer` for the byte-exact RGBA Uint8Array.
 */
export const renderStopsToRamp = (
  stops: GradientStop[],
  blendSpace: BlendColorSpace = 'oklab',
  colorSpace: ColorSpaceMode = 'srgb',
): RGB[] => {
  const width = 256;
  const out: RGB[] = new Array(width);
  if (!stops || stops.length === 0) {
    for (let i = 0; i < width; i++) {
      const v = Math.floor((i / 255) * 255);
      out[i] = { r: v, g: v, b: v };
    }
    return out;
  }
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  for (let i = 0; i < width; i++) out[i] = sampleSorted(sorted, i / (width - 1), blendSpace, colorSpace);
  return out;
};

/** Byte-exact RGBA Uint8Array (256×1). Float→Uint8 truncation matches GMT's renderer. */
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

/**
 * Generates a Uint8Array representing the gradient 256×1. Polymorphic: accepts a
 * legacy `GradientStop[]` or a `GradientConfig`. Thin wrapper over the canonical
 * `renderStopsToBuffer` so the real GMT renderer and the palette mirror share ONE
 * sampler (they can no longer drift).
 */
export const generateGradientTextureBuffer = (input: GradientStop[] | GradientConfig): Uint8Array => {
  let stops: GradientStop[];
  let colorSpace: ColorSpaceMode = 'srgb';
  let blendSpace: BlendColorSpace = 'oklab';

  if (Array.isArray(input)) {
    stops = input;
  } else if (input && Array.isArray(input.stops)) {
    stops = input.stops;
    colorSpace = input.colorSpace || 'srgb';
    blendSpace = input.blendSpace || 'oklab';
  } else {
    return new Uint8Array(256 * 4); // malformed input → transparent buffer (unchanged)
  }

  return renderStopsToBuffer(stops, blendSpace, colorSpace);
};

/**
 * Convert color temperature in Kelvin to RGB color.
 * Based on Tanner Helland's algorithm.
 * Valid range: 1000K - 40000K (typical usable: 1000K - 10000K)
 * @param kelvin Temperature in Kelvin
 * @returns Object with r, g, b values (0-255)
 */
export const kelvinToRgb = (kelvin: number): { r: number, g: number, b: number } => {
  // Clamp to valid range
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  
  let r: number, g: number, b: number;
  
  // Calculate Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }
  
  // Calculate Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }
  
  // Calculate Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }
  
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
};

/**
 * Convert Kelvin temperature to hex color string
 * @param kelvin Temperature in Kelvin
 * @returns Hex color string (e.g., "#FFCC99")
 */
export const kelvinToHex = (kelvin: number): string => {
  const { r, g, b } = kelvinToRgb(kelvin);
  return rgbToHex(r, g, b);
};

/**
 * Preset color temperatures for UI convenience
 */
export const COLOR_TEMPERATURE_PRESETS = [
  { label: 'Candle', value: 1900 },
  { label: 'Tungsten', value: 2700 },
  { label: 'Halogen', value: 3000 },
  { label: 'Warm White', value: 3500 },
  { label: 'Neutral', value: 5000 },
  { label: 'Daylight', value: 6500 },
  { label: 'Overcast', value: 7500 },
  { label: 'Blue Sky', value: 10000 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Colour core for the W10 picker upgrade (RGB + HSB only — locked, no HSL).
// HSB is the SAME model as HSV (Brightness === Value); these are honest aliases of
// the existing rgbToHsv/hsvToRgb so there is no second representation to drift.
// Harmony generators rotate hue in HSB and return hex[] (directly mountable as
// swatches / passed to onColorChange). All pure + deterministic — no DOM, no random.
// ─────────────────────────────────────────────────────────────────────────────

/** RGB(0–255) → HSB. `{ h: 0–360, s: 0–100, v: 0–100 }` (v == brightness). */
export const rgbToHsb = rgbToHsv;
/** HSB → RGB(0–255). Args `(h: 0–360, s: 0–100, b: 0–100)`. */
export const hsbToRgb = hsvToRgb;

/** Rotate a hex colour's hue by `deg` in HSB (saturation/brightness preserved). */
export const rotateHue = (hex: string, deg: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex.toUpperCase();
  const { h, s, v } = rgbToHsv(rgb);
  return rgbToHex(hsvToRgb(wrapHue(h + deg), s, v));
};

/**
 * `n` swatches centred on `base`, each `stepDeg` apart in hue. The base hue itself is
 * included only for ODD `n` (the centre swatch); for even `n` the set straddles the base.
 */
export const analogous = (base: string, n = 5, stepDeg = 30): string[] => {
  const rgb = hexToRgb(base);
  if (!rgb) return Array.from({ length: n }, () => base.toUpperCase());
  const { h, s, v } = rgbToHsv(rgb);
  const half = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => rgbToHex(hsvToRgb(wrapHue(h + (i - half) * stepDeg), s, v)));
};

/**
 * `n` swatches sharing `base`'s hue/saturation, sweeping brightness evenly 15→100.
 * (A fixed lightness ramp of the base hue — it does not re-emit the base's own value.)
 */
export const monochromatic = (base: string, n = 5): string[] => {
  const rgb = hexToRgb(base);
  if (!rgb) return [base.toUpperCase()];
  const { h, s } = rgbToHsv(rgb);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    return rgbToHex(hsvToRgb(h, s, 15 + t * 85));
  });
};

/** `[base, opposite]` — hue + 180°. */
export const complementary = (base: string): string[] => [base.toUpperCase(), rotateHue(base, 180)];

/** `[base, base+150°, base+210°]` — the two neighbours of the complement. */
export const splitComplementary = (base: string): string[] => [
  base.toUpperCase(),
  rotateHue(base, 150),
  rotateHue(base, 210),
];
