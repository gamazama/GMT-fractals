/**
 * Keep an anchored surface (context menu, popover) inside the viewport.
 *
 * Pure + DOM-free so it can be unit-tested in a node smoke. Generalises the
 * flip-then-clamp logic that GlobalContextMenu and GradientContextMenu each
 * reimplemented: when the surface would overflow the right/bottom edge, flip
 * it across the anchor; then hard-clamp to the padding gutter on every side.
 */
export interface Size {
    width: number;
    height: number;
}
export interface Point {
    x: number;
    y: number;
}

export interface ClampOptions {
    /** Gutter kept between the surface and the viewport edge. Default 8. */
    padding?: number;
    /** Flip across the anchor when overflowing before clamping. Default true. */
    flip?: boolean;
}

export function clampToViewport(
    anchor: Point,
    size: Size,
    viewport: Size,
    options: ClampOptions = {},
): Point {
    const padding = options.padding ?? 8;
    const flip = options.flip ?? true;

    let x = anchor.x;
    let y = anchor.y;

    if (x + size.width > viewport.width - padding && flip) {
        x = anchor.x - size.width;
    }
    x = Math.max(padding, Math.min(x, viewport.width - size.width - padding));

    if (y + size.height > viewport.height - padding && flip) {
        y = anchor.y - size.height;
    }
    y = Math.max(padding, Math.min(y, viewport.height - size.height - padding));

    return { x, y };
}
