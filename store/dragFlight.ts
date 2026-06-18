/**
 * dragFlight — pure, DOM-free reducer for window-level "is a drag in flight, and
 * what MIME types does it carry?" tracking (P0e interface (b)).
 *
 * A self-contained, harness-testable state machine. `hooks/useDragInFlight.ts`
 * wires it to real window drag events; `debug/test-engine-dnd-kernels.mts` drives
 * it directly.
 *
 * The model mirrors FavientsPanel's existing `depth.current` tracker: enter ++ /
 * leave --, captured/reset at the 0↔1 boundary, hard-reset on drop/dragend. Only
 * `DataTransfer.types` is readable mid-drag (getData is blocked until drop), so a
 * consumer's drag-visibility keys off `types`.
 */

export interface DragFlightState {
    /** True between the first window `dragenter` and the matching `drop`/`dragend`. */
    inFlight: boolean;
    /** MIME types of the in-flight drag, captured on the 0→1 enter (stable until reset). */
    types: string[];
    /** Enter/leave depth (dragenter ++/ dragleave --) — 0 means the pointer has
     *  left every element and the drag, for our purposes, is over. */
    depth: number;
}

export const dragFlightInitial: DragFlightState = { inFlight: false, types: [], depth: 0 };

export type DragFlightEvent =
    | { kind: 'enter'; types: string[] }
    | { kind: 'leave' }
    | { kind: 'end' };

/**
 * Reducer for window-level drag tracking. `enter` captures the MIME types on the
 * outermost enter only (depth 0→1) so nested element enters don't clobber them;
 * `leave` decrements and resets when depth returns to 0; `end` (drop/dragend)
 * hard-resets. Mirrors FavientsPanel's `depth.current` pattern, made pure.
 */
export const dragFlightReducer = (s: DragFlightState, e: DragFlightEvent): DragFlightState => {
    switch (e.kind) {
        case 'enter': {
            const depth = s.depth + 1;
            // Capture types on the transition into flight.
            if (s.depth === 0) return { inFlight: true, types: e.types, depth };
            // Already in flight: keep types stable across child-element enters
            // (some browsers report [] there), but BACKFILL if the outermost
            // enter reported no types and a later enter carries them — otherwise
            // a drag whose first enter was empty would never match any well.
            if (s.types.length === 0 && e.types.length > 0) return { ...s, types: e.types, depth };
            return { ...s, depth };
        }
        case 'leave': {
            const depth = Math.max(0, s.depth - 1);
            return depth === 0 ? dragFlightInitial : { ...s, depth };
        }
        case 'end':
            return dragFlightInitial;
    }
};
