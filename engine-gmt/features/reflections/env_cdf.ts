// Environment map luminance CDF builder.
//
// Used by PT_ENV_MIS_IS — bright env regions (sun discs, lamps) sampled in
// proportion to their luminance × sin(θ) weighting. Pharr/Jakob/Humphreys
// §13.6.5; the equirectangular sin(θ) factor accounts for solid-angle
// distortion at the poles.
//
// Output layout:
//   marginal      — 1 × H, R32F. Cumulative ∑ row totals, normalized so
//                   marginal[H-1] = 1. Sampled by binary search on a uniform
//                   y ∈ [0,1) to recover the row.
//   conditional   — W × H, R32F. Per-row cumulative ∑ texel luminances,
//                   normalized so conditional[W-1, j] = 1 for each row j.
//                   Sampled by binary search on x ∈ [0,1) within the chosen
//                   row to recover the column.
//   lumIntegral   — ∫L sin(θ) dθ dφ, used to normalize the per-direction PDF.
//
// Build cost: ~10ms for 256×128 from a typical 4K HDR. Runs once per env load
// when ptReflMode = 'Env MIS + IS'; cached on the uniform until next env swap.

import * as THREE from 'three';

export interface EnvCDFTextures {
    marginal: THREE.DataTexture;
    conditional: THREE.DataTexture;
    size: { w: number; h: number };
    lumIntegral: number;
    /**
     * Mip level on the source env that matches CDF resolution. NEE callers
     * sample Le at this mip so per-direction Le matches what the pdf was
     * built from — without it, a sub-pixel sun inside a dim CDF cell
     * produces firefly spikes (full-res Le over avg-cell pdf). The BSDF
     * estimator at the !hit branch keeps using full-res Le so sharp sun
     * reflections still resolve through MIS.
     */
    mipBias: number;
}

export interface EnvImageSource {
    /** RGB(A) data; alpha optional, ignored. Float32 for HDR or 0-255 byte for LDR (auto-detected by caller). */
    data: Float32Array | Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
    /** Stride per pixel: 3 (RGB) or 4 (RGBA). */
    channels: 3 | 4;
    /** True when data values are in [0,255] and need scaling to [0,1] before luminance. */
    isByteData: boolean;
}

const REC709 = [0.2126, 0.7152, 0.0722] as const;

/** Bilinear sample of the source env, returning luminance only. */
function sampleLuminance(src: EnvImageSource, sx: number, sy: number): number {
    const { width: W, height: H, data, channels, isByteData } = src;
    // Clamp inputs (cheap, avoids out-of-bounds at exact W/H).
    const x = Math.max(0, Math.min(W - 1, sx));
    const y = Math.max(0, Math.min(H - 1, sy));
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const xi1 = Math.min(W - 1, xi + 1);
    const yi1 = Math.min(H - 1, yi + 1);

    const scale = isByteData ? 1.0 / 255.0 : 1.0;

    // 4 corner samples, take luminance of each then bilerp luminance scalar.
    const s = (px: number, py: number) => {
        const idx = (py * W + px) * channels;
        const r = data[idx]     * scale;
        const g = data[idx + 1] * scale;
        const b = data[idx + 2] * scale;
        return r * REC709[0] + g * REC709[1] + b * REC709[2];
    };

    const l00 = s(xi,  yi);
    const l10 = s(xi1, yi);
    const l01 = s(xi,  yi1);
    const l11 = s(xi1, yi1);

    const l0 = l00 * (1 - fx) + l10 * fx;
    const l1 = l01 * (1 - fx) + l11 * fx;
    return l0 * (1 - fy) + l1 * fy;
}

/**
 * Build env CDF tables. Downsamples to (targetW × targetH) — overkill is
 * wasted VRAM and doesn't help precision; under-resolution misses sun discs.
 * 256×128 is the sweet spot for typical equirectangular HDRs.
 */
export function buildEnvCDF(
    src: EnvImageSource,
    targetW: number = 256,
    targetH: number = 128,
): EnvCDFTextures {
    const W = targetW;
    const H = targetH;

    // Per-texel weighted luminance: L_ij × sin(θ_j). Stored row-major.
    const weighted = new Float32Array(W * H);
    // Per-row totals — used both for the conditional row sum and the marginal.
    const rowSum = new Float32Array(H);

    const sxStep = src.width  / W;
    const syStep = src.height / H;

    let total = 0;
    for (let j = 0; j < H; j++) {
        // Latitude θ at row center. Equirectangular: y=0 → north pole (θ=0).
        const v = (j + 0.5) / H;          // [0,1)
        const theta = v * Math.PI;        // [0, π)
        const sinT = Math.sin(theta);

        let row = 0;
        for (let i = 0; i < W; i++) {
            const u = (i + 0.5) / W;
            // Sample SOURCE at the corresponding texel center; bilinear handles
            // non-integer ratios cleanly.
            const sx = u * src.width  - 0.5;
            const sy = v * src.height - 0.5;
            const lum = Math.max(0, sampleLuminance(src, sx, sy));
            const w = lum * sinT;
            weighted[j * W + i] = w;
            row += w;
        }
        rowSum[j] = row;
        total += row;
    }

    // Solid-angle normalizer for the per-direction PDF.
    // pdf(ω) = (W·H · L_ij) / (TAU·PI · sin(θ) · lumIntegral)
    // where lumIntegral = (TAU·PI / (W·H)) · Σ L_ij sin(θ_j) is the discrete
    // approximation of ∫L sin(θ) dθ dφ.
    const lumIntegral = (2 * Math.PI * Math.PI / (W * H)) * total;

    // Conditional CDF — per row, cumulative texel sums normalized to [0,1].
    // If a row is entirely black (rowSum=0), seed it as a uniform CDF so the
    // sampler doesn't divide by zero. The marginal will give that row 0
    // probability anyway, so the seeded values are unreachable.
    const conditional = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
        const rs = rowSum[j];
        if (rs > 0) {
            const inv = 1 / rs;
            let acc = 0;
            for (let i = 0; i < W; i++) {
                acc += weighted[j * W + i];
                conditional[j * W + i] = acc * inv;
            }
            conditional[j * W + W - 1] = 1; // ensure exact 1 at the right edge
        } else {
            for (let i = 0; i < W; i++) conditional[j * W + i] = (i + 1) / W;
        }
    }

    // Marginal CDF — cumulative row sums normalized. 1×H so easier to lay out
    // as a tall texture; sampled with x=0.5/1, y=u.
    const marginal = new Float32Array(H);
    if (total > 0) {
        const inv = 1 / total;
        let acc = 0;
        for (let j = 0; j < H; j++) {
            acc += rowSum[j];
            marginal[j] = acc * inv;
        }
        marginal[H - 1] = 1;
    } else {
        // Fully black env → seed marginal as uniform; lumIntegral will be 0
        // upstream, callers should detect (uEnvCDFSize=(1,1) fallback).
        for (let j = 0; j < H; j++) marginal[j] = (j + 1) / H;
    }

    // R32F single-channel textures. Three.js maps RedFormat + FloatType to
    // GL_R32F when the WEBGL_color_buffer_float / EXT_color_buffer_float
    // extensions are present (always in WebGL2).
    const margTex = new THREE.DataTexture(marginal, 1, H, THREE.RedFormat, THREE.FloatType);
    margTex.minFilter = THREE.NearestFilter;
    margTex.magFilter = THREE.NearestFilter;
    margTex.wrapS = THREE.ClampToEdgeWrapping;
    margTex.wrapT = THREE.ClampToEdgeWrapping;
    margTex.needsUpdate = true;

    const condTex = new THREE.DataTexture(conditional, W, H, THREE.RedFormat, THREE.FloatType);
    condTex.minFilter = THREE.NearestFilter;
    condTex.magFilter = THREE.NearestFilter;
    condTex.wrapS = THREE.ClampToEdgeWrapping;
    condTex.wrapT = THREE.ClampToEdgeWrapping;
    condTex.needsUpdate = true;

    // Mip level that brings the source env down to CDF resolution. log2(ratio)
    // — clamped to non-negative since sources smaller than the CDF res don't
    // need any mip bias (and log2 of <1 would give negative bias = magnification).
    const mipBias = Math.max(0, Math.log2(src.width / W));

    return {
        marginal: margTex,
        conditional: condTex,
        size: { w: W, h: H },
        lumIntegral: total > 0 ? lumIntegral : 1.0,
        mipBias,
    };
}

/**
 * Extract pixel data from a `THREE.Texture` already uploaded by the env-map
 * loader. Handles three cases:
 *   - `DataTexture` carrying `Float32Array` / `Uint16Array` (HDR path).
 *   - `Texture` carrying `ImageBitmap` / `HTMLImageElement` (LDR path; needs
 *     a 2D-canvas readback to get pixels in JS).
 *   - Anything else → returns null; caller should fall back to uniform sphere.
 *
 * Worker-only callers (renderWorker) supply their own ImageBitmap reader
 * because OffscreenCanvas is the only 2D context available there.
 */
export function extractEnvImageSource(
    tex: THREE.Texture,
    canvas2D?: { canvas: HTMLCanvasElement | OffscreenCanvas, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D },
): EnvImageSource | null {
    const img = tex.image as any;
    if (!img) return null;

    // DataTexture path — HDR upload from RGBELoader is RGBA HalfFloatType.
    if (tex instanceof THREE.DataTexture) {
        const data = (img.data ?? tex.image.data) as ArrayBufferView;
        if (data instanceof Float32Array) {
            return { data, width: img.width, height: img.height, channels: 4, isByteData: false };
        }
        if (data instanceof Uint16Array) {
            // Half-float: decode to Float32 once on env load (cheap, runs once
            // per upload). Three.js ships fromHalfFloat as the canonical
            // CPU-side decoder.
            const f32 = new Float32Array(data.length);
            for (let i = 0; i < data.length; i++) f32[i] = THREE.DataUtils.fromHalfFloat(data[i]);
            return { data: f32, width: img.width, height: img.height, channels: 4, isByteData: false };
        }
        if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
            return { data, width: img.width, height: img.height, channels: 4, isByteData: true };
        }
        return null;
    }

    // Image-backed texture — needs canvas readback.
    if (canvas2D && (img instanceof ImageBitmap || (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement))) {
        const w = img.width as number;
        const h = img.height as number;
        if (canvas2D.canvas.width !== w)  canvas2D.canvas.width  = w;
        if (canvas2D.canvas.height !== h) canvas2D.canvas.height = h;
        canvas2D.ctx.drawImage(img as any, 0, 0);
        const imgData = canvas2D.ctx.getImageData(0, 0, w, h);
        return { data: imgData.data, width: w, height: h, channels: 4, isByteData: true };
    }

    return null;
}

