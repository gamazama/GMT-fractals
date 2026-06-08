/**
 * DragWellsOverlay — the engine-core view for the drop-wells kernel (W4, P0e
 * interface (b)). Mount it ONCE near the app shell root. While a drag is in
 * flight it renders the registered wells whose `accepts(types)` is true and
 * routes a drop to that well's `onDrop`; otherwise it renders nothing.
 *
 * It is a thin view: the visible set comes from the pure `wellsForTypes`
 * selector (so `debug/test-engine-dnd-kernels.mts` covers what shows), and the
 * in-flight flag + MIME types come from `useDragInFlight`. The overlay owns only
 * transient hover state (which well is under the pointer) — no DDFS, no persist,
 * no undo (per the P0e constraint that all kernel state is transient).
 *
 * Each well tile calls `preventDefault()` on dragover (so the browser allows a
 * drop) and on drop reads the real payload via `onDrop(dt)` — the first point at
 * which `getData` is unblocked. See dropWellRegistry.ts for the DnD facts and the
 * ImageStage coexistence requirement that consumers (S6/P2) must honour.
 *
 * @see store/dropWellRegistry.ts
 */

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
    getDropWells,
    subscribeDropWells,
    wellsForTypes,
    type DropWell,
} from '../store/dropWellRegistry';
import { useDragInFlight } from '../hooks/useDragInFlight';
import { Z } from './ui/zIndex';

export interface DragWellsOverlayProps {
    /** Stacking tier. Defaults to the overlay band so wells float above panels
     *  but below context menus. */
    z?: number;
    /** Override the container className (positioning / layout of the well row). */
    className?: string;
}

const DefaultWellTile: React.FC<{ well: DropWell; active: boolean }> = ({ well, active }) => {
    if (well.render) return <>{well.render({ active })}</>;
    return (
        <div
            className={[
                'pointer-events-auto flex h-24 w-40 select-none items-center justify-center',
                'rounded-lg border-2 border-dashed text-xs font-medium uppercase tracking-wide',
                'transition-colors',
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
}) => {
    // Re-render when the registry changes (defensive — wells normally register at boot).
    const allWells = useSyncExternalStore(subscribeDropWells, getDropWells, getDropWells);
    // Stay fully inert (no window listeners) until an app registers a well.
    const { inFlight, types } = useDragInFlight(allWells.length > 0);
    const [hoverId, setHoverId] = useState<string | null>(null);

    // Filter only when the drag's MIME types or the registry change — NOT on hover.
    const wells = useMemo(() => wellsForTypes(types), [types, allWells]);

    if (!inFlight || wells.length === 0) return null;

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
                >
                    <DefaultWellTile well={well} active={hoverId === well.id} />
                </div>
            ))}
        </div>,
        document.body,
    );
};

export default DragWellsOverlay;
