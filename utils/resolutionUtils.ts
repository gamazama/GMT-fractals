/**
 * resolutionUtils — small math helpers shared by the resolution/aspect controls
 * (viewport Fixed-mode, Quality > Resolution, bucket-render output).
 */

/** Snap a pixel dimension to the nearest multiple of 8, clamped to `min`.
 *  GPU-friendly (8-pixel block alignment) and avoids degenerate sizes. */
export const snap8 = (n: number, min: number = 64): number =>
    Math.max(min, Math.round(n / 8) * 8);
