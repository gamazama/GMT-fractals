/**
 * deep-zoom/components/depthFormat.ts - how a depth is written, and the fixed marks of the range.
 *
 * "Depth" is the distance from the camera to the surface, in the bulb's own units: 1 at the
 * start view, 1e-77 where the 256-bit reference ends. Everything that prints a depth goes
 * through here so the top bar, the readout, the scale and a saved place agree to the digit.
 * Pure: no React, no store. Checked by `debug/deep-zoom-checks/depth-format.mts`.
 *
 * The three honest lines of the range, used by the scale and by Help:
 *   1e-4   below this the renderer draws by perturbation (above it, plain f32)
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

/** Sizes for comparison if the whole bulb were as wide as the observable universe (8.8e26 m). */
export const YARDSTICKS: ReadonlyArray<{ exp: number; name: string }> = [
    { exp: 6, name: 'Milky Way' },
    { exp: 14, name: "Neptune's orbit" },
    { exp: 20, name: 'Earth' },
    { exp: 30, name: 'grain of sand' },
    { exp: 37, name: 'atom' },
    { exp: 42, name: 'proton' },
    { exp: 62, name: 'Planck length' },
];
export const YARDSTICK_NOTE = 'If the bulb were the observable universe (8.8e26 m across).';

/** The smallest yardstick the view has passed, or '' above the first. */
export function yardstickFor(d: number): string {
    let name = '';
    for (const y of YARDSTICKS) if (d <= Math.pow(10, -y.exp)) name = y.name;
    return name;
}

/** The fixed marks of the range. */
export const RANGE_MARKS: ReadonlyArray<{ exp: number; label: string }> = [
    { exp: 4, label: '1e-4 perturbation' },
    { exp: 50, label: '1e-50 checked' },
    { exp: 77, label: '1e-77 floor' },
];

/** Speed along the scale from two samples: decades per second, positive when going deeper. */
export function decadesPerSecond(depthBefore: number, depthNow: number, seconds: number): number {
    if (!validDepth(depthBefore) || !validDepth(depthNow) || !(seconds > 0)) return 0;
    return Math.log10(depthBefore / depthNow) / seconds;
}
