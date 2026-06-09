/**
 * dropWellRegistry — engine-core drag/drop-WELLS kernel (W4 generic, P0e interface (b)).
 *
 * A "drop well" is an always-available, app-registered drop target that fades in
 * ONLY while a drag is in flight and accepts a particular set of payloads. The
 * canonical consumer (Phase 1/P2) is the Gradient Explorer's Export / PNG /
 * Fullscreen wells, but the kernel is payload-agnostic: any app registers wells
 * keyed off whatever MIME(s) its drags carry. This module is the registry + the
 * pure selection/drag-flight logic; `components/DragWellsOverlay.tsx` is the thin
 * React view, `hooks/useDragInFlight.ts` the window-level drag tracker.
 *
 * It generalizes the existing gradient-specific `palette/core/favientDnd.ts` +
 * the in-`FavientsPanel` window drag tracking — those are NOT migrated here (they
 * keep working as-is; P1/P2 register gradient wells INTO this kernel alongside).
 *
 * ── Critical DnD facts baked in ──────────────────────────────────────────────
 *  • `DataTransfer.getData()` is BLOCKED during `dragenter`/`dragover` (returns
 *    '' until `drop`). A well therefore decides VISIBILITY purely from
 *    `DataTransfer.types` (the MIME list, which IS readable mid-drag) via
 *    `accepts(types)`, and only reads the real payload via `getData` inside
 *    `onDrop` (after `drop`, when it's unblocked).
 *  • "A drag is in flight" is tracked at the window level with enter/leave DEPTH
 *    counting (dragenter ++ / dragleave --), reset on `drop`/`dragend` — mirrors
 *    FavientsPanel's existing pattern. That logic is the pure reducer in the
 *    sibling store/dragFlight.ts.
 *
 * ── Coexistence requirement (for CONSUMERS — NOT solved here) ─────────────────
 *  Wells must later share the window with (a) `ImageStage`'s window
 *  dragover/drop listener that preventDefaults EVERY drag to import image files,
 *  and (b) the favients reorder MIME. When wells ship (S6/P2), ImageStage's
 *  window listener MUST early-return when a well-accepted (e.g. gmt-gradient)
 *  MIME is present so real file imports still work, and the overlay's own well
 *  tiles call `preventDefault()` on dragover to enable the drop. This kernel only
 *  documents that contract; it does not touch ImageStage.
 *
 * @invariant Host-agnostic: imports nothing app-specific. Hosts register INTO it.
 * @invariant Idempotent by id (re-registering an id replaces) — mirrors
 *   `registerHistoryProvider` / `registerSendTarget`.
 * @invariant The React overlay derives its visible set from `wellsForTypes`, so
 *   the node harness (`debug/test-engine-dnd-kernels.mts`) covers the overlay's
 *   selection by construction (same pattern as sampleStops ⇄ renderStopsToRamp).
 *
 * @see store/sendTargetRegistry.ts (the click/keyboard twin — interface (c))
 * @see palette/core/favientDnd.ts (the gradient-specific DnD this generalizes)
 */

import type { ReactNode } from 'react';
import { createListRegistry } from './createListRegistry';

/**
 * Recommended base shape for a drag payload: a discriminated record so a
 * consumer's `accepts`/`onDrop`/send-target `apply` can branch on provenance.
 * The kernel itself never reads this — wells route the raw `DataTransfer` — but
 * P1/P2 consumers should stamp a `kind` (e.g. 'picker' | 'generator' | 'image'
 * | 'favient') onto the JSON they put on `dataTransfer`.
 */
export interface DragPayloadBase {
    kind: string;
}

export interface DropWell {
    /** Stable id (idempotent registration key). */
    id: string;
    /** Human label, used by the default tile rendering. */
    label: string;
    /**
     * Visibility predicate, evaluated against `DataTransfer.types` (MIME presence
     * only — `getData` is blocked mid-drag). Return true to show this well for the
     * in-flight drag. Receives a plain snapshot array (safe to `.includes`).
     */
    accepts: (types: string[]) => boolean;
    /**
     * Handle a drop on this well. Called AFTER `drop`, when `dataTransfer.getData`
     * is unblocked — read + parse the real payload here. Generic over payload: the
     * kernel imposes no shape beyond the recommended `kind` discriminator.
     */
    onDrop: (dt: DataTransfer) => void;
    /**
     * Optional custom body. `active` = a drag is currently hovering THIS well.
     * Omitted → the overlay renders a default labelled tile. (Refinement over the
     * proposed §4(b) `render`: optional, so simple wells need no renderer.)
     */
    render?: (state: { active: boolean }) => ReactNode;
}

const _registry = createListRegistry<DropWell>();

/**
 * Register a drop well (idempotent by id). Returns an unregister thunk for
 * cleanup-on-unmount ergonomics; `unregisterDropWell(id)` does the same by id.
 */
export const registerDropWell = (well: DropWell): (() => void) => _registry.register(well);

export const unregisterDropWell = (id: string): void => _registry.unregister(id);

/** All registered wells, registration order (stable reference between
 *  mutations — safe as a `useSyncExternalStore` snapshot). */
export const getDropWells = (): DropWell[] => _registry.getAll();

/** Subscribe to registry changes (wells usually register at boot; the overlay
 *  subscribes defensively in case a host registers late). Returns unsubscribe. */
export const subscribeDropWells = (l: () => void): (() => void) => _registry.subscribe(l);

/**
 * Pure selector: the wells that accept a given MIME-types snapshot. This is what
 * `<DragWellsOverlay/>` renders while a drag is in flight, so testing this tests
 * the overlay's visible set without a DOM. A throwing `accepts` is treated as
 * "does not accept" (one bad well can't blank the overlay).
 */
export const wellsForTypes = (types: string[]): DropWell[] =>
    getDropWells().filter((w) => {
        try { return w.accepts(types); } catch { return false; }
    });

// Window-level "is a drag in flight" tracking lives in the sibling pure reducer
// store/dragFlight.ts (the registry doesn't reference it); the React wiring is
// hooks/useDragInFlight.ts.
