/**
 * Host-side HDR float for the deep-zoom shader.
 *
 * Represents a real number as `m · 2^e` with `m ∈ [1, 2) ∪ {0}` and
 * integer-valued `e`. Uniformed into the shader as a `vec2(mantissa,
 * exp)` pair so values past f32's underflow floor (~1e-38) survive
 * the JS → GLSL boundary.
 *
 * Worker-side BigInt fixed-point (HighPrecComplex.ts) handles the
 * reference orbit at construction time. This module handles the
 * post-build, per-frame uniform packing for things the shader needs
 * but can't represent in plain f32 (zoom, centre offsets).
 */

/** Mantissa + base-2 exponent. `value = mantissa · 2^exp`. */
export interface HDRPair {
    mantissa: number;
    exp: number;
}

/**
 * Convert a JS number (f64) to HDR. Mantissa is normalized to [1, 2)
 * by sign; exp may be any int. Zero maps to {m=0, e=0}.
 *
 * Lossy past f64's ~16-digit mantissa, but f64 input from store-side
 * params is itself the limit there; the gain is preserving the
 * exponent down to ~2^-1023 instead of 2^-126 (f32) or 0 (literal
 * underflow).
 */
export const f64ToHDR = (v: number): HDRPair => {
    if (!Number.isFinite(v) || v === 0) return { mantissa: 0, exp: 0 };
    const e = Math.floor(Math.log2(Math.abs(v)));
    return { mantissa: v / Math.pow(2, e), exp: e };
};

/** Recover a JS number from HDR. Underflows to 0 outside f64 range. */
export const hdrToF64 = (h: HDRPair): number =>
    h.mantissa === 0 ? 0 : h.mantissa * Math.pow(2, h.exp);

/** Pack into the shader's `vec2(mantissa, exp)` uniform layout. */
export const hdrToVec2 = (h: HDRPair): [number, number] => [h.mantissa, h.exp];

/**
 * Pack a complex pair as `vec4(re.mantissa, re.exp, im.mantissa, im.exp)`.
 * Matches the shader's HDRC layout (see shaders.ts hdr* helpers).
 */
export const hdrComplexToVec4 = (re: HDRPair, im: HDRPair): [number, number, number, number] =>
    [re.mantissa, re.exp, im.mantissa, im.exp];
