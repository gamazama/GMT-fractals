/**
 * OKLab / OKLCh colour core for the palette tools.
 *
 * Ported VERBATIM from GMT's utils/colorUtils.ts (same coefficients and the same
 * sRGB transfer functions) so the two can never diverge — the stop-fitter renders
 * against GMT's actual gradient pipeline, so its colour maths must match byte-for-byte.
 * A regression harness asserts the mirror equals generateGradientTextureBuffer.
 *
 * Kept dependency-free (no THREE, no React) so `core/` stays a portable library.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface Lab {
  L: number;
  a: number;
  b: number;
}

// sRGB [0-255] -> linear [0-1]
export const srgbToLinear01 = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

// linear [0-1] -> sRGB [0-255], clamped to gamut
export const linear01ToSrgb = (c: number): number => {
  const v = Math.max(0, Math.min(1, c));
  return (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
};

export const rgbToOklab = (c: RGB): Lab => {
  const lr = srgbToLinear01(c.r),
    lg = srgbToLinear01(c.g),
    lb = srgbToLinear01(c.b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

export const oklabToRgb = (lab: Lab): RGB => {
  const l = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l3 = l * l * l,
    m3 = m * m * m,
    s3 = s * s * s;
  return {
    r: linear01ToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: linear01ToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: linear01ToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
};

/**
 * OKLCh polar interpolation between two sRGB colours (verbatim from colorUtils).
 * Polar lerp preserves chroma; rectangular a,b lerp cuts through the achromatic
 * axis producing grey midpoints. Falls back to rectangular for near-greys
 * (hue is undefined). THIS is GMT's `blendSpace: 'oklab'` behaviour — the
 * stop-fitter must reproduce it exactly.
 */
export const lerpOklab = (c1: RGB, c2: RGB, t: number): RGB => {
  const lab1 = rgbToOklab(c1);
  const lab2 = rgbToOklab(c2);
  const c1Chroma = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2Chroma = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);

  if (c1Chroma < 0.005 || c2Chroma < 0.005) {
    return oklabToRgb({
      L: lab1.L + (lab2.L - lab1.L) * t,
      a: lab1.a + (lab2.a - lab1.a) * t,
      b: lab1.b + (lab2.b - lab1.b) * t,
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

/** Perceptual distance between two sRGB colours (Euclidean in OKLab). */
export const oklabDistance = (c1: RGB, c2: RGB): number => {
  const a = rgbToOklab(c1);
  const b = rgbToOklab(c2);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
};

// --- gamut-safe OKLab → sRGB (Ottosson chroma-clip) ---
// oklabToRgb above clamps each linear channel independently, which DISTORTS hue
// for out-of-gamut colours (a clipped channel shifts the colour). For img2grad we
// reduce CHROMA at constant L,h until the colour falls inside sRGB instead — the
// hue is preserved, only vividness is sacrificed. Verbatim port of the standalone
// img2grad `labToRgb`.

const oklabToLinearTriple = (lab: Lab): [number, number, number] => {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ * l_ * l_,
    m = m_ * m_ * m_,
    s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const inGamut = (lab: Lab): boolean => {
  const c = oklabToLinearTriple(lab);
  for (let i = 0; i < 3; i++) if (c[i] < -0.0008 || c[i] > 1.0008) return false;
  return true;
};

/**
 * Gamut-safe OKLab → sRGB [0-255]. Reduces chroma at constant L,h (binary search)
 * until the colour is inside sRGB, then encodes. Never distorts hue.
 */
export const oklabToRgbSafe = (lab: Lab): RGB => {
  let { a, b } = lab;
  const L = lab.L;
  if (!inGamut(lab)) {
    const C = Math.hypot(a, b),
      h = Math.atan2(b, a);
    let lo = 0,
      hi = C;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (inGamut({ L, a: m * Math.cos(h), b: m * Math.sin(h) })) lo = m;
      else hi = m;
    }
    a = lo * Math.cos(h);
    b = lo * Math.sin(h);
  }
  const c = oklabToLinearTriple({ L, a, b });
  return { r: linear01ToSrgb(c[0]), g: linear01ToSrgb(c[1]), b: linear01ToSrgb(c[2]) };
};
