/**
 * DragWellsOverlay — the engine-core view for the drop-wells kernel (W4, P0e
 * interface (b)). Mount it ONCE near the app shell root. It renders the registered
 * wells whose `accepts(types)` is true as a row of bins, in TWO situations:
 *
 *   • DRAG (always available) — while a drag is in flight, the bins are drop targets:
 *     a drop routes to that well's `onDrop`. This is the original kernel behaviour.
 *   • SELECT (opt-in, P2-A) — when the host passes a `selectedPayload` (the click-path
 *     twin of a drag), the SAME bins appear and become CLICKABLE: a click resolves the
 *     bin to its matching (c) send target (by id) and calls `apply(selectedPayload)`,
 *     then `onSent()` lets the host clear the selection. One bin component, one dock.
 *
 * It is a thin view: the visible set comes from the pure `wellsForTypes` selector (so
 * the node harness covers what shows), the in-flight flag + drag MIME types come from
 * `useDragInFlight`, and the click action comes from the (c) `sendTargetRegistry` — the
 * registry whose ids match the wells' (the gradient host registers both from one list).
 * The overlay owns only transient hover state — no DDFS, no persist, no undo.
 *
 * Each well tile calls `preventDefault()` on dragover (so the browser allows a drop) and
 * on drop reads the real payload via `onDrop(dt)` — the first point at which `getData`
 * is unblocked. See dropWellRegistry.ts for the DnD facts and the ImageStage coexistence
 * requirement that consumers (S6/P2) must honour.
 *
 * @see store/dropWellRegistry.ts (b) · store/sendTargetRegistry.ts (c)
 */

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
    getDropWells,
    subscribeDropWells,
    wellsForTypes,
    type DropWell,
} from '../store/dropWellRegistry';
import { targetsForPayload } from '../store/sendTargetRegistry';
import { useDragInFlight } from '../hooks/useDragInFlight';
import { Z } from './ui/zIndex';

/** Stable empty types snapshot so the `wells` memo dep never churns when idle. */
const NO_TYPES: string[] = [];

export interface DragWellsOverlayProps {
    /** Stacking tier. Defaults to the overlay band so wells float above panels
     *  but below context menus. */
    z?: number;
    /** Override the container className (positioning / layout of the well row). */
    className?: string;
    /**
     * SELECT path (P2-A): the payload a clicked bin should be sent to. When non-null
     * AND no drag is in flight, the dock shows its bins and a click on a bin resolves
     * the matching (c) send target by id and calls `apply(selectedPayload)`. Pass a
     * stable reference (e.g. a transient store value). Omit ⇒ drag-only (original).
     */
    selectedPayload?: unknown;
    /**
     * The MIME types the selected payload "would carry" — used to pick which bins show
     * on select (the same `accepts(types)` predicate as drag). Pass a STABLE array
     * (module const) so the visible-set memo doesn't churn.
     */
    selectedTypes?: string[];
    /** Called after a successful bin click (the host clears its selection). */
    onSent?: () => void;
}

const DefaultWellTile: React.FC<{ well: DropWell; active: boolean; clickable: boolean }> = ({
    well,
    active,
    clickable,
}) => {
    if (well.render) return <>{well.render({ active })}</>;
    return (
        <div
            className={[
                'pointer-events-auto flex h-24 w-40 select-none items-center justify-center',
                'rounded-lg border-2 border-dashed text-xs font-medium uppercase tracking-wide',
                'transition-colors',
                clickable ? 'cursor-pointer' : '',
                active
                    ? 'border-sky-400 bg-sky-400/20 text-sky-100'
                    : 'border-white/30 bg-zinc-900/80 text-gray-300',
            ].join(' ')}
        >
            {well.label}
        </div>
    );
};

export const DragWellsOverlay: React.FC<DragWellsOverlayProps> = ({
    z = Z.overlay,
    className,
    selectedPayload,
    selectedTypes,
    onSent,
}) => {
    // Re-render when the registry changes (defensive — wells normally register at boot).
    const allWells = useSyncExternalStore(subscribeDropWells, getDropWells, getDropWells);
    // Stay fully inert (no window listeners) until an app registers a well.
    const { inFlight, types } = useDragInFlight(allWells.length > 0);
    const [hoverId, setHoverId] = useState<string | null>(null);

    const selecting = !inFlight && selectedPayload != null;

    // Drag uses the live drag MIME list; SELECT uses the host-provided types hint; idle
    // shows nothing. Each branch yields a STABLE array reference so the memo is cheap.
    const activeTypes = inFlight ? types : selecting ? selectedTypes ?? NO_TYPES : NO_TYPES;
    const wells = useMemo(() => wellsForTypes(activeTypes), [activeTypes, allWells]);

    // Click a bin (SELECT path only): resolve its (c) twin via the registry's own
    // selector (so a target's `accepts` is honoured) and apply the selection.
    const onBinClick = (wellId: string): void => {
        if (!selecting) return;
        const target = targetsForPayload(selectedPayload).find((t) => t.id === wellId);
        if (!target) return; // no send-target twin (or it declined this payload) → drag-only
        try {
            target.apply(selectedPayload);
        } catch (err) {
            console.warn(`[sendTarget] "${wellId}" apply threw`, err);
        } finally {
            setHoverId(null);
            onSent?.();
        }
    };

    if ((!inFlight && !selecting) || wells.length === 0) return null;

    return createPortal(
        <div
            className={
                className ??
                'fixed inset-x-0 bottom-8 flex items-end justify-center gap-4 pointer-events-none'
            }
            style={{ zIndex: z }}
            data-testid="drag-wells-overlay"
        >
            {wells.map((well) => (
                <div
                    key={well.id}
                    onDragEnter={() => setHoverId(well.id)}
                    onDragOver={(e) => {
                        e.preventDefault(); // mark this a valid drop target
                        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDragLeave={() => setHoverId((id) => (id === well.id ? null : id))}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoverId(null);
                        try {
                            well.onDrop(e.dataTransfer);
                        } catch (err) {
                            console.warn(`[dropWell] well "${well.id}" onDrop threw`, err);
                        }
                    }}
                    // SELECT path: hover highlight (reuses `active`) + click to send.
                    onMouseEnter={selecting ? () => setHoverId(well.id) : undefined}
                    onMouseLeave={
                        selecting ? () => setHoverId((id) => (id === well.id ? null : id)) : undefined
                    }
                    onClick={selecting ? () => onBinClick(well.id) : undefined}
                >
                    <DefaultWellTile well={well} active={hoverId === well.id} clickable={selecting} />
                </div>
            ))}
        </div>,
        document.body,
    );
};

export default DragWellsOverlay;
