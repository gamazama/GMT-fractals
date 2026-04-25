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

import React, { useCallback, useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { StateLibraryPanel, type StateLibraryPreset } from '../../components/StateLibraryPanel';
import { ActiveSnapshotFeatures } from '../../components/ActiveSnapshotFeatures';
import { CompositionOverlayControls } from '../../components/CompositionOverlayControls';
import { PlusIcon } from '../../components/Icons';
import type { StateSnapshot } from '../../engine/store/createStateLibrarySlice';
import type { JuliaViewState } from '../viewLibrary';
import { KIND_MODES } from '../features/julia';

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

    // 2D view-shortcut presets — analogous to GMT's cardinal toolbar
    // (FRONT/BACK/etc) but for the fluid-toy fractal-canvas. Each
    // button drives setJulia with a fixed payload. RESET falls through
    // to the slice's resetView. Memoised so the array identity is
    // stable across renders.
    const presets: StateLibraryPreset[] = useMemo(() => {
        const setJulia = (useEngineStore.getState() as any).setJulia;
        const setOrZoom = (zoom: number) => {
            const c = (useEngineStore.getState() as any).julia?.center ?? { x: 0, y: 0 };
            setJulia?.({ center: { x: c.x, y: c.y }, zoom });
        };
        const mandIdx = KIND_MODES.indexOf('mandelbrot' as any);
        const juliaIdx = KIND_MODES.indexOf('julia' as any);
        return [
            { id: 'reset', label: 'RESET', onSelect: () => handleReset(), title: 'Reset view to defaults' },
            { id: 'home',  label: 'HOME',  onSelect: () => setJulia?.({ center: { x: 0, y: 0 } }),    title: 'Center to (0, 0); keep zoom' },
            { id: '1x',    label: '1:1',   onSelect: () => setOrZoom(1.0),                            title: 'Zoom 1×' },
            { id: 'wide',  label: 'WIDE',  onSelect: () => setOrZoom(0.5),                            title: 'Zoom out' },
            { id: 'mand',  label: 'MAND',  onSelect: () => setJulia?.({ kind: mandIdx >= 0 ? mandIdx : 1 }), title: 'Switch to Mandelbrot kind' },
            { id: 'julia', label: 'JULIA', onSelect: () => setJulia?.({ kind: juliaIdx >= 0 ? juliaIdx : 0 }), title: 'Switch to Julia kind' },
        ];
    }, [handleReset]);

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
            presets={presets}
            presetGridCols={3}
            toolbarBefore={
                <div className="px-2 pb-2 bg-black/40 border-b border-white/10">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1"
                    >
                        <PlusIcon /> New View
                    </button>
                </div>
            }
            footer={
                <>
                    <ActiveSnapshotFeatures
                        activeIdKey="activeViewId"
                        featureIds={['julia']}
                        label="Active View"
                        onDeselect={() => selectView?.(null)}
                    />
                    <div className="border-t border-white/10 bg-black/40 p-2">
                        <CompositionOverlayControls />
                    </div>
                </>
            }
        />
    );
};

export default ViewLibraryPanel;
