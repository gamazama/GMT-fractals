/**
 * CameraManagerPanel — GMT shell around the engine-level
 * <StateLibraryPanel> primitive. Owns the GMT-specific bits:
 *
 *   toolbarBefore  : cardinal-direction buttons (FRONT/BACK/.../ISO),
 *                    "New Camera" button, RESET (formula default).
 *   footer         : active-settings (camera position read-out + optics
 *                    feature panel) + composition guides.
 *
 * The list itself (drag-reorder, thumbnails, rename, save/dup/delete,
 * modified marker, slot-shortcut hint) is the engine primitive. The
 * camera slice (engine-gmt/store/cameraSlice.ts) wires capture / apply
 * / dirty-check / thumbnail / suggestLabel into a generic state-library
 * slice — see docs/engine/15_Camera_Manager_Extraction.md for the
 * design.
 */

import React, { useCallback } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import { StateLibraryPanel } from '../../../components/StateLibraryPanel';
import { CompositionOverlayControls } from '../../../components/CompositionOverlayControls';
import { PlusIcon } from '../../../components/Icons';
import type { SavedCamera } from '../../types';
import { calculateDirectionalView } from './logic';
import { isCameraModified } from '../../store/cameraSlice';
import { CameraUtils } from '../../utils/CameraUtils';
import { SectionLabel } from '../../../components/SectionLabel';
import { CollapsibleSection } from '../../../components/CollapsibleSection';
import { CameraPositionDisplay } from '../../components/panels/scene_widgets';
import type { OpticsState } from '../../features/optics';


interface CameraManagerPanelProps {
    className?: string;
}

export const CameraManagerPanel: React.FC<CameraManagerPanelProps> = ({ className = "-m-3" }) => {
    const savedCameras = useEngineStore(s => s.savedCameras as unknown as SavedCamera[]);
    const activeCameraId = useEngineStore(s => s.activeCameraId);
    const addCamera = useEngineStore(s => (s as any).addCamera) as (label?: string) => Promise<string>;
    const updateCamera = useEngineStore(s => (s as any).updateCamera) as (id: string, patch?: Partial<SavedCamera>) => void;
    const deleteCamera = useEngineStore(s => (s as any).deleteCamera) as (id: string) => void;
    const duplicateCamera = useEngineStore(s => (s as any).duplicateCamera) as (id: string) => void;
    const selectCamera = useEngineStore(s => (s as any).selectCamera) as (id: string | null) => void;
    const reorderCameras = useEngineStore(s => (s as any).reorderCameras) as (from: number, to: number) => void;
    const resetCamera = useEngineStore(s => (s as any).resetCamera) as () => void;

    const optics = useEngineStore(s => s.optics);

    // Subscribe to live camera state so the modified marker re-renders
    // as the user moves the camera. The values themselves aren't used
    // directly — `isCameraModified` reads them from the store at call
    // time — but selecting them forces a render on every change.
    useEngineStore(s => s.sceneOffset);
    useEngineStore(s => s.cameraRot);

    const setOptics = useEngineStore(s => (s as any).setOptics) as ((update: Partial<OpticsState>) => void) | undefined;

    // --- Cardinal-direction toolbar handlers ---
    const handleDirectional = (dir: 'Top' | 'Bottom' | 'Left' | 'Right' | 'Front' | 'Back' | 'Isometric') => {
        const result = calculateDirectionalView(dir, optics);
        CameraUtils.teleportPosition(result.position, result.rotation, result.targetDistance);
        if (result.optics && setOptics) setOptics(result.optics);
        selectCamera(null);
    };

    const handleReset = () => {
        resetCamera();
        if (setOptics) setOptics({ camType: 0.0, camFov: 60, orthoScale: 2.0 });
    };

    const handleAddCamera = useCallback(async () => { await addCamera(); }, [addCamera]);

    // --- StateLibraryPanel handlers (rename + update need GMT-aware wrappers) ---
    const handleRename = useCallback((id: string, label: string) => {
        updateCamera(id, { label });
    }, [updateCamera]);

    const handleUpdate = useCallback((id: string) => {
        // No patch = "overwrite snapshot's state with current live state".
        // The slice's capture() reads sceneOffset/rotation/optics + worker probe.
        updateCamera(id);
    }, [updateCamera]);

    const isModifiedFn = useCallback((cam: SavedCamera) => isCameraModified(cam.state), []);

    return (
        <StateLibraryPanel<SavedCamera['state']>
            className={`flex flex-col bg-[#080808] ${className}`}
            snapshots={savedCameras}
            activeId={activeCameraId}
            onSelect={selectCamera}
            onRename={handleRename}
            onUpdate={handleUpdate}
            onDuplicate={duplicateCamera}
            onDelete={deleteCamera}
            onReorder={reorderCameras}
            isModified={isModifiedFn}
            emptyState="No saved cameras"
            slotHintPrefix="Ctrl+"
            toolbarBefore={
                <div className="p-2 border-b border-white/10 bg-black/40 grid grid-cols-4 gap-1" data-help-id="panel.camera_manager">
                    <button type="button" onClick={() => handleDirectional('Front')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">FRONT</button>
                    <button type="button" onClick={() => handleDirectional('Back')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">BACK</button>
                    <button type="button" onClick={() => handleDirectional('Left')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">LEFT</button>
                    <button type="button" onClick={() => handleDirectional('Right')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">RIGHT</button>
                    <button type="button" onClick={() => handleDirectional('Top')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">TOP</button>
                    <button type="button" onClick={() => handleDirectional('Bottom')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">BTM</button>
                    <button type="button" onClick={() => handleDirectional('Isometric')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">ISO</button>
                    <button type="button" onClick={handleReset} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">RESET</button>
                    <button
                        type="button"
                        onClick={handleAddCamera}
                        className="col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 mt-1"
                    >
                        <PlusIcon /> New Camera
                    </button>
                </div>
            }
            footer={
                <div className="border-t border-white/10 bg-black/40 p-2 space-y-2">
                    <div className="flex items-center justify-between">
                        <SectionLabel>{activeCameraId ? 'Active Settings' : 'Free Camera'}</SectionLabel>
                        {activeCameraId && (
                            <button
                                onClick={() => selectCamera(null)}
                                className="text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                Deselect
                            </button>
                        )}
                    </div>

                    <CollapsibleSection label="Position" defaultOpen={false}>
                        <div className="mt-1">
                            <CameraPositionDisplay />
                        </div>
                    </CollapsibleSection>

                    <div className="bg-white/5 rounded p-1">
                        <AutoFeaturePanel featureId="optics" />
                    </div>

                    <div className="border-t border-white/10 pt-2">
                        <CompositionOverlayControls />
                    </div>
                </div>
            }
        />
    );
};
