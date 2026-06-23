/**
 * screenEdgeFold — keep a 1-D pointer drag alive after the cursor hits a monitor edge.
 *
 * THE BUG IT FIXES. Every drag-to-adjust control here derives its value from the
 * *change* in pointer position. The moment the OS pins the cursor at the physical
 * screen edge, that coordinate stops changing — and the browser stops firing
 * `pointermove` for continued same-direction pushing (no movement → no event). The
 * value freezes even though the user is clearly still dragging. Pointer Lock would
 * dodge this by going cursor-virtual, but it prompts for permission on every grab,
 * which feels awful for a control you tweak dozens of times a minute.
 *
 * THE FIX. When the primary axis is pinned against an edge, the *orthogonal* axis is
 * still free — so we let it take over. Hand a horizontal drag into the right wall and
 * keep going by moving up; up reads as "right / increase", down as "left / decrease".
 * Hitting the wall is a strong proprioceptive cue, so the brain makes the turn without
 * being told. Because we accumulate *relative* per-move deltas (not an absolute anchor
 * difference) the hand-off is seamless: there's no jump and no explicit mode switch —
 * the free axis simply starts contributing, and stops the instant you pull back inward.
 *
 * Convention: up and right always mean "increase", matching each axis's primary
 * direction (x-drag: right = increase; y-drag: down = increase, per useDragValue).
 *
 * This is intentionally framework-agnostic (it only reads clientX/clientY) so the
 * number scrub, the track drag, and the Knob can all share one feel.
 */

/** Viewport band (px) within which the primary axis counts as "against the wall". */
const EDGE_PX = 4;
/**
 * Max along-axis movement (px) per event still treated as "pinned". A true pin holds
 * the primary coordinate exactly constant (Δ = 0); any real drag moves ≥ ~1px. The
 * 0.5 gate cleanly separates a pinned cursor from a slow-but-moving one, so a stray
 * vertical wiggle during a normal drag never leaks into the value.
 */
const SATURATION_EPS = 0.5;

/** Minimal pointer shape this helper needs — works for React or native pointer events. */
interface PointerLike {
    clientX: number;
    clientY: number;
}

/** Mutable last-position tracker for one drag gesture. Create on pointer-down. */
export interface EdgeFoldTracker {
    /** Last client coordinate along the drag's primary axis. */
    primary: number;
    /** Last client coordinate along the orthogonal (free) axis. */
    orth: number;
}

/** Seed a tracker from the pointer-down event for the given drag axis. */
export function beginEdgeFold(e: PointerLike, axis: 'x' | 'y'): EdgeFoldTracker {
    return axis === 'y'
        ? { primary: e.clientY, orth: e.clientX }
        : { primary: e.clientX, orth: e.clientY };
}

/**
 * Effective along-axis pixel delta for this move, folding in the free orthogonal axis
 * while the primary axis is pinned against a screen edge. Mutates `t` to this move's
 * coordinates, so call exactly once per pointermove.
 *
 * - Not at an edge, or still advancing along the primary axis → returns the primary
 *   delta (identical to the old `cur - last` behaviour; pure refactor off the wall).
 * - Pinned at an edge → returns the orthogonal delta, signed so up/right = increase.
 */
export function edgeFoldDelta(e: PointerLike, axis: 'x' | 'y', t: EdgeFoldTracker): number {
    const primary = axis === 'y' ? e.clientY : e.clientX;
    const orth = axis === 'y' ? e.clientX : e.clientY;
    const primaryDelta = primary - t.primary;
    const orthDelta = orth - t.orth;
    t.primary = primary;
    t.orth = orth;

    // Viewport extent along the primary axis (clientX/Y are viewport-relative). With
    // pointer capture the cursor can travel past the viewport when the window isn't
    // maximised, so the coordinate only truly pins at the monitor edge — exactly when
    // primaryDelta collapses to ~0. The band keeps the hand-off confined to real edges.
    const viewport = axis === 'y' ? window.innerHeight : window.innerWidth;
    const atEdge = primary <= EDGE_PX || primary >= viewport - EDGE_PX;
    const pinned = atEdge && Math.abs(primaryDelta) < SATURATION_EPS;
    if (!pinned) return primaryDelta;

    // x-drag: up (−Δy) increases. y-drag: right (+Δx) increases.
    const orthSign = axis === 'y' ? 1 : -1;
    return orthSign * orthDelta;
}
