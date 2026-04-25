/**
 * ViewLibraryPanel — fluid-toy shell around the engine-level
 * <StateLibraryPanel> primitive. Saves named "views" — full
 * Fractal-tab fingerprints (kind / juliaC / center / zoom / iter /
 * power), each with an optional thumbnail captured from the live
 * canvas.
 *
 * No cardinal-direction toolbar (fluid-toy is 2D — pan/zoom is the
 * whole story); the toolbar slot just holds a "New View" button +
 * "Reset" affordance. No active-settings footer either; the user
 * already has the Fractal tab for fine-tuning a selected view.
 */

import React, { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { StateLibraryPanel } from '../../components/StateLibraryPanel';
import { PlusIcon } from '../../components/Icons';
import type { StateSnapshot } from '../../engine/store/createStateLibrarySlice';
import type { JuliaViewState } from '../viewLibrary';

type ViewSnapshot = StateSnapshot<JuliaViewState>;

export const ViewLibraryPanel: React.FC = () => {
    const savedViews = useEngineStore(s => (s as any).savedViews as ViewSnapshot[] ?? []);
    const activeViewId = useEngineStore(s => (s as any).activeViewId as string | null);

    const addView = useEngineStore(s => (s as any).addView) as ((label?: string) => Promise<string>) | undefined;
    const updateView = useEngineStore(s => (s as any).updateView) as ((id: string, patch?: Partial<ViewSnapshot>) => void) | undefined;
    const deleteView = useEngineStore(s => (s as any).deleteView) as ((id: string) => void) | undefined;
    const duplicateView = useEngineStore(s => (s as any).duplicateView) as ((id: string) => void) | undefined;
    const selectView = useEngineStore(s => (s as any).selectView) as ((id: string | null) => void) | undefined;
    const reorderViews = useEngineStore(s => (s as any).reorderViews) as ((from: number, to: number) => void) | undefined;
    const resetView = useEngineStore(s => (s as any).resetView) as (() => void) | undefined;

    // Subscribe to the julia slice so the modified marker re-renders
    // when the user pans/zooms/edits without selecting a save.
    useEngineStore(s => (s as any).julia);

    const handleAdd = useCallback(async () => { await addView?.(); }, [addView]);
    const handleRename = useCallback((id: string, label: string) => updateView?.(id, { label }), [updateView]);
    const handleUpdate = useCallback((id: string) => updateView?.(id), [updateView]);
    const handleReset = useCallback(() => resetView?.(), [resetView]);

    const isModified = useCallback((snap: ViewSnapshot) => {
        const fn = (useEngineStore.getState() as any)._viewIsModified as
            | ((s: JuliaViewState) => boolean)
            | undefined;
        if (fn) return fn(snap.state);
        // Inline fallback: re-read live julia and diff.
        const julia = (useEngineStore.getState() as any).julia;
        const ss = snap.state;
        if (julia.kind !== ss.kind) return true;
        if (julia.maxIter !== ss.maxIter) return true;
        if (julia.power !== ss.power) return true;
        if (Math.abs(julia.zoom - ss.zoom) > 1e-5) return true;
        if (Math.abs(julia.center.x - ss.center.x) + Math.abs(julia.center.y - ss.center.y) > 1e-4) return true;
        if (Math.abs(julia.juliaC.x - ss.juliaC.x) + Math.abs(julia.juliaC.y - ss.juliaC.y) > 1e-4) return true;
        return false;
    }, []);

    if (!addView) {
        // Slice not installed yet — render placeholder rather than crash.
        return <div className="p-4 text-[10px] text-gray-600 italic">View library not initialized.</div>;
    }

    return (
        <StateLibraryPanel<JuliaViewState>
            className="flex flex-col bg-[#080808] -m-3"
            snapshots={savedViews}
            activeId={activeViewId}
            onSelect={selectView!}
            onRename={handleRename}
            onUpdate={handleUpdate}
            onDuplicate={duplicateView!}
            onDelete={deleteView!}
            onReorder={reorderViews!}
            isModified={isModified}
            emptyState="No saved views — pan, zoom, tweak, then click New View"
            slotHintPrefix={null}
            toolbarBefore={
                <div className="p-2 border-b border-white/10 bg-black/40 flex gap-1">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1"
                    >
                        <PlusIcon /> New View
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1 px-3"
                        title="Reset to default view"
                    >
                        RESET
                    </button>
                </div>
            }
        />
    );
};

export default ViewLibraryPanel;
