/**
 * Pointer-layer state machine types.
 *
 * `PointerMode` is what the active pointer is doing right now. `PointerState`
 * is the per-pointer scratch the gesture handlers mutate (kept in a ref
 * to dodge React's render cycle for high-frequency mouse events).
 */

export type PointerMode =
    | 'idle'
    | 'splat'
    | 'pan-pending'  // right-press, hasn't crossed drag threshold yet
    | 'pan'
    | 'zoom'         // middle-drag
    | 'resize-brush' // B+left-drag
    | 'pick-c';      // C+left-drag

export interface PointerState {
    mode: PointerMode;
    pointerId: number;

    // Shared
    lastX: number;
    lastY: number;
    lastT: number;

    // Pan start anchors — screen and world.
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;

    // Zoom (middle-drag) anchors — captured once at pointerdown and held
    // for the whole drag so vertical motion pivots around one fixed
    // world-space point. startZoom is what we multiply the exp factor
    // against; zoomAnchor* describe the world-and-UV coords of the
    // click-point.
    startZoom: number;
    zoomAnchorX: number;
    zoomAnchorY: number;
    zoomAnchorU: number;
    zoomAnchorV: number;

    // Set when right-press upgraded to a pan drag — tells the contextmenu
    // handler to ignore the resulting click so the menu doesn't flash
    // up at the end of a pan.
    rightDragged: boolean;

    // B+drag resize-brush anchor — captured at press so the whole drag
    // scales relative to the starting size. Log-scaled so feel is
    // uniform across the 0.003..0.4 size range.
    startBrushSize: number;
}

export const createPointerState = (): PointerState => ({
    mode: 'idle', pointerId: -1,
    lastX: 0, lastY: 0, lastT: 0,
    startX: 0, startY: 0, startCx: 0, startCy: 0,
    startZoom: 1, zoomAnchorX: 0, zoomAnchorY: 0, zoomAnchorU: 0.5, zoomAnchorV: 0.5,
    rightDragged: false,
    startBrushSize: 0.15,
});

export interface PendingView {
    center: { x: number; y: number };
    zoom: number;
}
