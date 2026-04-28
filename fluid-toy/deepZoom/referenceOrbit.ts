/**
 * Reference-orbit builder for the deep-zoom path.
 *
 * Iterates `Z_{n+1} = Z_n^d + C` in BigInt fixed-point precision,
 * sampling each Z to f32 for upload as a texture.
 *
 * Mode-specific starting state:
 *   Mandelbrot: z₀ = 0,           c = (centerX, centerY).
 *   Julia:      z₀ = (centerX, centerY), c = (juliaCx, juliaCy).
 *
 * The perturbation math is symmetric across kinds — only the initial
 * (z, c) pair differs. The shader feeds:
 *   Mandelbrot: dz_0 = 0, dc = pixel position − ref centre.
 *   Julia:      dz_0 = pixel position − ref z₀, dc = 0.
 *
 * Output layout: one RGBA32F texel per iteration, channels = (Z.re,
 * Z.im, |Z|², 0). |Z|² is precomputed because the rebase rule in the
 * shader needs it once per step and computing it from the .rg samples
 * costs an extra mul-add per pixel-iter.
 */

import { HPComplex, choosePrecisionBits } from './HighPrecComplex';

export interface RefOrbitInput {
    /** Reference centre, real part. For Mandelbrot this is `c`. For
     *  Julia it's `z₀` (the chosen reference iterate point). */
    centerX: number;
    /** Reference centre, imaginary part. */
    centerY: number;
    /** Sub-f64 residual paired with `centerX` (Dekker double-double low
     *  word). At zoom < ~1e-15, pan deltas underflow f64 ulp at unit-
     *  magnitude centres; the (hi, lo) pair recovers ~106 bits of
     *  effective precision before BigInt math kicks in. Optional —
     *  defaults to 0 for orbit-only callers without DD wiring. */
    centerLowX?: number;
    /** Sub-f64 residual paired with `centerY`. */
    centerLowY?: number;
    /** Linear zoom level (smaller = deeper). Drives precision selection. */
    zoom: number;
    /** Maximum iterations to compute. Orbit may terminate early on escape. */
    maxIter: number;
    /** Power d in z → z^d + c. Default 2 (classic Mandelbrot/Julia).
     *  Integer values 2..8 exposed in the UI. */
    power?: number;
    /** Fractal kind. Mandelbrot = c-parameterised, Julia = c-fixed.
     *  Defaults to mandelbrot if omitted. */
    kind?: 'mandelbrot' | 'julia';
    /** Julia constant — required when kind='julia', ignored otherwise. */
    juliaCx?: number;
    juliaCy?: number;
}

export interface RefOrbitOutput {
    /** RGBA32F-packed texel data: [Z.re, Z.im, |Z|², 0] per iteration. */
    orbit: Float32Array;
    /** Number of iterations actually computed (≤ maxIter; less if Z escaped early). */
    length: number;
    /** True if Z escaped (|Z|² > 4) before maxIter. The reference centre is "outside" the set. */
    escaped: boolean;
    /** Working precision in bits, chosen by `choosePrecisionBits`. */
    precisionBits: number;
}

const ESCAPE_RADIUS_SQ = 4;

export const computeReferenceOrbit = (input: RefOrbitInput): RefOrbitOutput => {
    const { centerX, centerY, zoom, maxIter } = input;
    const centerLowX = input.centerLowX ?? 0;
    const centerLowY = input.centerLowY ?? 0;
    const power = Math.max(2, Math.round(input.power ?? 2));
    const kind = input.kind ?? 'mandelbrot';
    const precisionBits = choosePrecisionBits(zoom, maxIter);

    // Mode-specific seed. Mandelbrot iterates z=0..N from c=centre.
    // Julia iterates z=z₀..N from c=juliaC, where z₀ = centre.
    // The (centre, centreLow) pair is folded into BigInt precision via
    // fromDoubleDouble — at deep zoom the lo bits hold the user's last
    // pan increments and would be lost by a plain fromNumbers(centerX).
    let z: HPComplex;
    let c: HPComplex;
    if (kind === 'julia') {
        z = HPComplex.fromDoubleDouble(centerX, centerLowX, centerY, centerLowY, precisionBits);
        c = HPComplex.fromNumbers(input.juliaCx ?? 0, input.juliaCy ?? 0, precisionBits);
    } else {
        z = HPComplex.zero(precisionBits);
        c = HPComplex.fromDoubleDouble(centerX, centerLowX, centerY, centerLowY, precisionBits);
    }

    const out = new Float32Array(maxIter * 4);
    let i = 0;
    let escaped = false;

    for (; i < maxIter; i++) {
        // Sample current Z for the texture.
        const [re, im] = z.toFloat32Pair();
        const norm2 = re * re + im * im;
        out[i * 4 + 0] = re;
        out[i * 4 + 1] = im;
        out[i * 4 + 2] = norm2;
        out[i * 4 + 3] = 0;

        // Step: z' = z^d + c.
        z = (power === 2 ? z.sqr() : z.pow(power)).add(c);
        const [reN, imN] = z.toFloat32Pair();
        const norm2N = reN * reN + imN * imN;

        if (norm2N > ESCAPE_RADIUS_SQ) {
            const j = i + 1;
            out[j * 4 + 0] = reN;
            out[j * 4 + 1] = imN;
            out[j * 4 + 2] = norm2N;
            out[j * 4 + 3] = 0;
            escaped = true;
            i = j + 1;
            break;
        }
    }

    return {
        orbit: out.subarray(0, i * 4),
        length: i,
        escaped,
        precisionBits,
    };
};
