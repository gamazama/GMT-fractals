/**
 * useDragInFlight — window-level "is a drag happening, and what does it carry?"
 * tracker for the drop-wells kernel (W4, P0e interface (b)).
 *
 * Wires `dragFlightReducer` (store/dropWellRegistry.ts) to window drag events:
 *  • `dragenter` → capture `DataTransfer.types` (the only payload info readable
 *    mid-drag — `getData` is blocked until drop) and flag in-flight.
 *  • `dragleave` → enter/leave depth bookkeeping; clears when the pointer has
 *    left every element.
 *  • `drop` / `dragend` → hard reset.
 *
 * Listeners are passive and capture-phase so they observe the drag even when a
 * descendant (or ImageStage's own window listener) handles it. This hook NEVER
 * calls `preventDefault` — it only observes; the overlay's well tiles opt into
 * drops themselves. That keeps it composable with ImageStage's file-import
 * listener (see the coexistence note in dropWellRegistry.ts).
 *
 * Residual limitation (inherent to HTML5 DnD, shared by FavientsPanel's tracker):
 * a NATIVE file drag that leaves the window and is released outside the page
 * fires neither `drop` nor `dragend` on window, so depth bookkeeping alone could
 * leave `inFlight` stuck true. A window `blur` reset covers the common case (the
 * OS drag steals focus); a fully airtight reset would need browser-specific
 * pointer-left-the-window detection, out of scope for this kernel.
 *
 * @returns `{ inFlight, types }` — `types` is a stable snapshot array for the
 *   current drag, suitable to hand to `wellsForTypes`.
 */

import { useEffect, useReducer } from 'react';
import { dragFlightInitial, dragFlightReducer } from '../store/dragFlight';

export interface DragInFlight {
    inFlight: boolean;
    types: string[];
}

/**
 * @param enabled When false, the window listeners are not attached and the hook
 *   reports a permanent idle state — lets a consumer (e.g. `DragWellsOverlay`)
 *   stay free until at least one well/target is registered. Defaults true.
 */
export const useDragInFlight = (enabled = true): DragInFlight => {
    const [state, dispatch] = useReducer(dragFlightReducer, dragFlightInitial);

    useEffect(() => {
        if (!enabled) return;
        const onEnter = (e: DragEvent) => {
            // Copy the live, read-only types list into a plain array for predicates.
            const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
            dispatch({ kind: 'enter', types });
        };
        const onLeave = () => dispatch({ kind: 'leave' });
        const onEnd = () => dispatch({ kind: 'end' });

        window.addEventListener('dragenter', onEnter, true);
        window.addEventListener('dragleave', onLeave, true);
        // `drop` resets in the BUBBLE phase, NOT capture: a well tile's own
        // (bubble-phase) `onDrop` must run BEFORE we flip `inFlight` false, or the
        // overlay unmounts the tile mid-event and the drop is lost. A well's onDrop
        // `stopPropagation`s, so for a well-drop this window listener is skipped and
        // `dragend` (capture, fires on the source right after) does the reset; a drop
        // on empty space bubbles here and resets normally.
        window.addEventListener('drop', onEnd, false);
        window.addEventListener('dragend', onEnd, true);
        // Safety net: a native file drag that leaves the window never fires
        // drop/dragend on us — blur (the OS drag stealing focus) un-sticks it.
        window.addEventListener('blur', onEnd);
        return () => {
            window.removeEventListener('dragenter', onEnter, true);
            window.removeEventListener('dragleave', onLeave, true);
            window.removeEventListener('drop', onEnd, false);
            window.removeEventListener('dragend', onEnd, true);
            window.removeEventListener('blur', onEnd);
        };
    }, [enabled]);

    return { inFlight: state.inFlight, types: state.types };
};
