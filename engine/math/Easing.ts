/**
 * Pure scalar interpolation + easing helpers. AnimationMath.ts handles
 * keyframe/bezier interpolation; this file is for ad-hoc tweens (camera
 * transitions, toast lifecycles, etc.) that just need lerp + easing.
 */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Quadratic ease-in-out. t ∈ [0, 1] → eased ∈ [0, 1]. */
export const easeInOutQuad = (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
