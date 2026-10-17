/**
 * deep-zoom/components/LocationsPanel.tsx - the saved places, on the engine's own list.
 *
 * A thin shell over `components/StateLibraryPanel.tsx`, as fluid-toy's saved views are: the
 * engine panel does the rows, the rename, the thumbnails and the menus. Two of its options carry
 * what a deep zoomer needs to see: `sortBy` puts the list in depth order (shallow to deep, places
 * with no depth last) and `renderMeta` writes the depth under the name, so a renamed place still
 * says how deep it is - ONCE: a place whose name is its depth (the default name) has no second
 * line (STREAMLINE.md, stage 5: "a card's title is its depth or its name, once"). While `sortBy`
 * is set the engine panel turns drag-reorder off; the stored order, and so each row's slot number,
 * is untouched. On screen these are "My places" (F12); the store keeps `savedLocations`.
 *
 * Registered as `dz-locations` in main.tsx (it reads the store); panels.ts places it.
 */
import React, { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { StateLibraryPanel } from '../../components/StateLibraryPanel';
import { PlusIcon } from '../../components/Icons';
import type { DzLocation, DzLocationState } from '../locations';
import { locationDepth, saveLocationHere } from '../locations';
import { formatDepth } from './depthFormat';

/** Shallow to deep; a place with no depth goes last, in its stored order. */
const byDepth = (a: DzLocation, b: DzLocation): number => {
    const da = locationDepth(a);
    const db = locationDepth(b);
    if (Number.isNaN(da) || Number.isNaN(db)) return (Number.isNaN(da) ? 1 : 0) - (Number.isNaN(db) ? 1 : 0);
    return db - da;
};

/** The depth, unless the name already is it, and "Julia" for a place saved in Julia mode: such a place is
 *  of another object than the formula's own, and its row says so before it is clicked. */
const depthLine = (snap: DzLocation): React.ReactNode => {
    const named = locationDepth(snap);
    const d = formatDepth(named) === snap.label ? NaN : named;
    const julia = snap.state?.look?.dzFormula?.juliaMode === true;
    if (Number.isNaN(d) && !julia) return null;
    return (
        <span className="font-mono tabular-nums">
            {Number.isNaN(d) ? null : <span data-dz-location-depth>{formatDepth(d)}</span>}
            {julia ? <span data-dz-location-julia className="font-sans text-fg-faint">{Number.isNaN(d) ? 'Julia' : ' · Julia'}</span> : null}
        </span>
    );
};

export const LocationsPanel: React.FC = () => {
    const rows = useEngineStore((s) => s.savedLocations ?? []);
    const activeId = useEngineStore((s) => s.activeLocationId);
    const updateLocation = useEngineStore((s) => s.updateLocation);
    const deleteLocation = useEngineStore((s) => s.deleteLocation);
    const duplicateLocation = useEngineStore((s) => s.duplicateLocation);
    const selectLocation = useEngineStore((s) => s.selectLocation);
    const reorderLocations = useEngineStore((s) => s.reorderLocations);

    const onRename = useCallback((id: string, label: string) => updateLocation?.(id, { label }), [updateLocation]);
    const onUpdate = useCallback((id: string) => updateLocation?.(id), [updateLocation]);

    if (!selectLocation) {
        return <div className="p-3 text-[10px] text-fg-faint italic">The place library is not installed.</div>;
    }
    return (
        <StateLibraryPanel<DzLocationState>
            className="flex flex-col"
            snapshots={rows}
            activeId={activeId}
            onSelect={selectLocation}
            onRename={onRename}
            onUpdate={onUpdate}
            onDuplicate={duplicateLocation}
            onDelete={deleteLocation}
            onReorder={reorderLocations}
            sortBy={byDepth}
            renderMeta={depthLine}
            emptyState="No saved places yet. Press B to save this place."
            toolbarBefore={
                <div className="px-2 pb-2">
                    <button
                        type="button"
                        data-dz-save-location
                        onClick={() => { void saveLocationHere(); }}
                        title="Save this place to My places (B)"
                        className="w-full bg-accent-900/40 hover:bg-accent-800 text-accent-300 border border-accent-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1"
                    >
                        <PlusIcon /> Save this place
                    </button>
                </div>
            }
        />
    );
};
