/**
 * Shape primitive shared by the canvas GraphEditor and canvas DopeSheet for
 * painting keyframe diamonds / squares / circles. Caller owns `beginPath` and
 * the fill/stroke afterwards — `traceKeyframeShape` only emits path ops.
 *
 * Size semantics: `size` is the bounding-box side. For Step the result is an
 * axis-aligned `size × size` square; for Bezier a circle of radius `size/2`;
 * for any other interpolation (Linear, fallback) a 45°-rotated square whose
 * vertices sit on the bounding box (diagonal `(size/2) * sqrt(2)`).
 *
 * The Graph and DopeSheet pick different sizes per shape — Graph uses 8 for
 * Step/Bezier and 6 for Linear; DopeSheet uses one size (6 flat, 12 normal).
 * The function is shape-agnostic about the choice; callers decide.
 */

import type { CacheCtx2D } from './canvasCache';

export type ShapeCtx = CanvasRenderingContext2D | CacheCtx2D;

export const traceKeyframeShape = (
    ctx: ShapeCtx,
    kx: number,
    cy: number,
    interpolation: string | undefined,
    size: number,
): void => {
    const half = size / 2;
    if (interpolation === 'Step') {
        ctx.rect(kx - half, cy - half, size, size);
    } else if (interpolation === 'Bezier') {
        // moveTo before arc so the path doesn't auto-connect to the previous subpath.
        ctx.moveTo(kx + half, cy);
        ctx.arc(kx, cy, half, 0, Math.PI * 2);
    } else {
        const diag = half * Math.SQRT2;
        ctx.moveTo(kx, cy - diag);
        ctx.lineTo(kx + diag, cy);
        ctx.lineTo(kx, cy + diag);
        ctx.lineTo(kx - diag, cy);
        ctx.closePath();
    }
};
