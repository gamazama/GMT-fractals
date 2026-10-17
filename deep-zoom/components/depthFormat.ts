/**
 * deep-zoom/components/depthFormat.ts - how a depth is written, and the fixed marks of the range.
 *
 * "Depth" is the distance from the camera to the surface, in the bulb's own units: 1 at the
 * start view, 1e-77 where the 256-bit reference ends. Everything that prints a depth goes
 * through here so the readout, the scale, Diagnostics and a saved place agree to the digit.
 * (The yardsticks passed and the speed in decades a second went with their lines of the depth
 * box, 2026-10-17.)
 * Pure: no React, no store. Checked by `debug/deep-zoom-checks/depth-format.mts`.
 *
 * The two honest lines of the range, used by the scale and by Help (a third, "1e-4: perturbation
 * below, plain f32 above", went on 2026-10-08 when the deep path became the picture at every depth):
 *   1e-50  as deep as the renderer's distance has been checked against an independent referee
 *          (`npm run smoke:deep-zoom-direct`)
 *   1e-77  the floor: the reference's 256 bits end here
 */

/** The floor's exponent: no depth below 1e-77 is offered as a target. */
export const FLOOR_EXP = 77;
export const FLOOR_DEPTH = 1e-77;

export function validDepth(d: number | null | undefined): d is number {
    return typeof d === 'number' && Number.isFinite(d) && d > 0;
}

/** `6.40e-53`; `1.50e0` at the start view. A dash when there is no depth. */
export function formatDepth(d: number | null | undefined): string {
    if (!validDepth(d)) return '-';
    return d.toExponential(2).replace('e+', 'e');
}

/** `6e-53`, for chips, rows and titles. */
export function formatDepthCompact(d: number | null | undefined): string {
    if (!validDepth(d)) return '-';
    return d.toExponential(0).replace('e+', 'e');
}

/** How many powers of ten are left above the floor: 77 + log10(depth), never below 0. */
export function decadesToFloor(d: number): number {
    return Math.max(0, FLOOR_EXP + Math.log10(d));
}

/** A depth as a position on the log scale: 0 at 1e0, 1 at the floor. */
export function scaleFraction(d: number): number {
    return Math.min(1, Math.max(0, -Math.log10(d) / FLOOR_EXP));
}

/** The depth at a position on the log scale (0 at 1e0, 1 at the floor), in whole decades. */
export function depthAtFraction(fraction: number): number {
    const exp = Math.min(FLOOR_EXP, Math.max(0, Math.round(fraction * FLOOR_EXP)));
    return Math.pow(10, -exp);
}

/** The fixed marks of the range. */
export const RANGE_MARKS: ReadonlyArray<{ exp: number; label: string }> = [
    { exp: 50, label: '1e-50 checked' },
    { exp: 77, label: '1e-77 floor' },
];
