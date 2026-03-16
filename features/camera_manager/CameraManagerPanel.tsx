
import React, { useState, useCallback } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { TrashIcon, PlusIcon, DragHandleIcon, SaveIcon, CopyIcon } from '../../components/Icons';
import { SavedCamera, CompositionOverlayType } from '../../types';
import { calculateDirectionalView, getDirectionName } from './logic';
import { CameraUtils } from '../../utils/CameraUtils';
import Slider from '../../components/Slider';
import SmallColorPicker from '../../components/SmallColorPicker';
import { SectionLabel } from '../../components/SectionLabel';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { CameraPositionDisplay } from '../../components/panels/scene_widgets';
import { getProxy } from '../../engine/worker/WorkerProxy';
import { VirtualSpace } from '../../engine/PrecisionMath';
import type { OpticsState } from '../../features/optics';
const engine = getProxy();


interface CameraManagerPanelProps {
    className?: string;
}

const OVERLAY_OPTIONS: { type: CompositionOverlayType; label: string }[] = [
    { type: 'none', label: 'None' },
    { type: 'thirds', label: 'Rule of Thirds' },
    { type: 'golden', label: 'Golden Ratio' },
    { type: 'grid', label: 'Grid' },
    { type: 'center', label: 'Center Mark' },
    { type: 'diagonal', label: 'Diagonal' },
    { type: 'spiral', label: 'Spiral' },
    { type: 'safearea', label: 'Safe Areas' },
];

// --- Thumbnail helper ---
const captureThumbnail = async (): Promise<string | undefined> => {
    try {
        const blob = await engine.captureSnapshot();
        if (!blob) return undefined;
        const img = await createImageBitmap(blob);
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const srcSize = Math.min(img.width, img.height);
        const sx = (img.width - srcSize) / 2;
        const sy = (img.height - srcSize) / 2;
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
        return undefined;
    }
};

// --- Drag-to-reorder state ---
interface DragState {
    fromIndex: number;
    overIndex: number;
}

export const CameraManagerPanel: React.FC<CameraManagerPanelProps> = ({ className = "-m-3" }) => {
    const { savedCameras, activeCameraId, addCamera, deleteCamera, selectCamera, updateCamera, resetCamera, duplicateCamera, reorderCameras } = useFractalStore();
    const optics = useFractalStore(s => s.optics);
    const compositionOverlay = useFractalStore(s => s.compositionOverlay);
    const setCompositionOverlay = useFractalStore(s => s.setCompositionOverlay);
    const compositionOverlaySettings = useFractalStore(s => s.compositionOverlaySettings);
    const setCompositionOverlaySettings = useFractalStore(s => s.setCompositionOverlaySettings);
    const setOptics = useFractalStore(s => (s as any).setOptics) as ((update: Partial<OpticsState>) => void) | undefined;

    // Subscribe to live camera state — triggers re-render when camera moves, used for isModified
    const liveOffset = useFractalStore(s => s.sceneOffset);
    const liveRot = useFractalStore(s => s.cameraRot);

    // Check if the active camera has been modified from its saved state
    const isModified = useCallback((cam: SavedCamera): boolean => {
        // World position lives entirely in sceneOffset (camera is always at origin)
        const so = liveOffset;
        const liveUnifiedX = so.x + (so.xL ?? 0);
        const liveUnifiedY = so.y + (so.yL ?? 0);
        const liveUnifiedZ = so.z + (so.zL ?? 0);

        const camOff = cam.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const savedX = camOff.x + (camOff.xL ?? 0);
        const savedY = camOff.y + (camOff.yL ?? 0);
        const savedZ = camOff.z + (camOff.zL ?? 0);

        const posDiff = Math.abs(liveUnifiedX - savedX) + Math.abs(liveUnifiedY - savedY) + Math.abs(liveUnifiedZ - savedZ);
        if (posDiff > 0.0001) return true;

        // Check rotation
        const rotDiff = Math.abs(liveRot.x - cam.rotation.x) + Math.abs(liveRot.y - cam.rotation.y) +
                        Math.abs(liveRot.z - cam.rotation.z) + Math.abs(liveRot.w - cam.rotation.w);
        if (rotDiff > 0.001) return true;

        // Check optics (camType, orthoScale, camFov)
        if (cam.optics && optics) {
            if (Math.abs((optics.camType ?? 0) - (cam.optics.camType ?? 0)) > 0.1) return true;
            if (Math.abs((optics.orthoScale ?? 2) - (cam.optics.orthoScale ?? 2)) > 0.01) return true;
            if (Math.abs((optics.camFov ?? 60) - (cam.optics.camFov ?? 60)) > 0.1) return true;
        }

        return false;
    }, [liveOffset, liveRot, optics]);

    const [editId, setEditId] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [editName, setEditName] = useState("");


    // --- Rename ---
    const handleRenameStart = (cam: SavedCamera) => {
        setEditId(cam.id);
        setEditName(cam.label);
    };

    const handleRenameSubmit = () => {
        if (editId) {
            updateCamera(editId, { label: editName });
            setEditId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRenameSubmit();
        if (e.key === 'Escape') setEditId(null);
    };

    // --- Directional views ---
    const handleDirectional = (dir: 'Top' | 'Bottom' | 'Left' | 'Right' | 'Front' | 'Back' | 'Isometric') => {
        const result = calculateDirectionalView(dir, optics);
        CameraUtils.teleportPosition(result.position, result.rotation, result.targetDistance);
        if (result.optics && setOptics) {
            setOptics(result.optics);
        }
        selectCamera(null);
    };

    // --- Add camera with thumbnail ---
    const handleAddCamera = useCallback(async () => {
        const rot = CameraUtils.getRotationFromEngine();
        let name = `Camera ${savedCameras.length + 1}`;
        const opticsNow = useFractalStore.getState().optics;

        if (opticsNow && Math.abs(opticsNow.camType - 1.0) < 0.1) {
            const dirName = getDirectionName(rot);
            if (dirName) name = dirName;
        }

        addCamera(name);

        const thumb = await captureThumbnail();
        if (thumb) {
            const latest = useFractalStore.getState().savedCameras;
            const newCam = latest[latest.length - 1];
            if (newCam) updateCamera(newCam.id, { thumbnail: thumb });
        }
    }, [savedCameras.length, addCamera, updateCamera]);

    // --- Update active camera (overwrite saved state) ---
    const handleUpdateCamera = useCallback(async (id: string) => {
        // Always read live camera state — store values may lag behind teleports
        const unifiedPos = CameraUtils.getUnifiedFromEngine();
        const rot = CameraUtils.getRotationFromEngine();
        const sX = VirtualSpace.split(unifiedPos.x);
        const sY = VirtualSpace.split(unifiedPos.y);
        const sZ = VirtualSpace.split(unifiedPos.z);

        const dist = engine.lastMeasuredDistance > 0 && engine.lastMeasuredDistance < 1000
            ? engine.lastMeasuredDistance : useFractalStore.getState().targetDistance;
        const currentOptics = { ...(useFractalStore.getState().optics) };
        const thumb = await captureThumbnail();

        updateCamera(id, {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
            sceneOffset: { x: sX.high, y: sY.high, z: sZ.high, xL: sX.low, yL: sY.low, zL: sZ.low },
            targetDistance: dist,
            optics: currentOptics,
            ...(thumb ? { thumbnail: thumb } : {})
        });
    }, [updateCamera]);

    // --- Reset ---
    const handleReset = () => {
        resetCamera();
        if (setOptics) {
            setOptics({ camType: 0.0, camFov: 60, orthoScale: 2.0 });
        }
    };


    // --- Drag to reorder (handle-only) ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        setDrag({ fromIndex: index, overIndex: index });
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (drag && drag.overIndex !== index) {
            setDrag({ ...drag, overIndex: index });
        }
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        if (drag) {
            reorderCameras(drag.fromIndex, toIndex);
        }
        setDrag(null);
    };

    const handleDragEnd = () => setDrag(null);

    // Thumbnails are captured when saving or updating a camera — no auto-update.

    return (
        <div className={`flex flex-col bg-[#080808] ${className}`}>
             {/* Toolbar */}
             <div className="p-2 border-b border-white/10 bg-black/40 grid grid-cols-4 gap-1">
                 <button onClick={() => handleDirectional('Front')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">FRONT</button>
                 <button onClick={() => handleDirectional('Back')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">BACK</button>
                 <button onClick={() => handleDirectional('Left')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">LEFT</button>
                 <button onClick={() => handleDirectional('Right')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">RIGHT</button>

                 <button onClick={() => handleDirectional('Top')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">TOP</button>
                 <button onClick={() => handleDirectional('Bottom')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">BTM</button>
                 <button onClick={() => handleDirectional('Isometric')} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">ISO</button>
                 <button onClick={handleReset} className="bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1">RESET</button>

                 <button
                     onClick={handleAddCamera}
                     className="col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 mt-1"
                 >
                     <PlusIcon /> New Camera
                 </button>
             </div>

             {/* Camera List */}
             <div className="p-2 space-y-1">
                 {savedCameras.length === 0 && (
                     <div className="text-center text-gray-600 text-[10px] italic py-4">No saved cameras</div>
                 )}

                 {savedCameras.map((cam, index) => {
                     const isActive = activeCameraId === cam.id;
                     const modified = isActive && isModified(cam);
                     const isDragOver = drag && drag.overIndex === index && drag.fromIndex !== index;
                     return (
                         <div
                            key={cam.id}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`flex items-center gap-1.5 p-1.5 rounded border transition-all group ${
                                isActive
                                ? 'bg-cyan-900/20 border-cyan-500/50'
                                : 'bg-white/5 border-transparent hover:border-white/10'
                            } ${isDragOver ? 'border-cyan-400/70 border-dashed' : ''}`}
                            onClick={() => selectCamera(cam.id)}
                         >
                             {/* Drag Handle — only this element is draggable */}
                             <div
                                 draggable
                                 onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, index); }}
                                 onDragEnd={handleDragEnd}
                                 className="cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity flex-shrink-0"
                                 title="Drag to reorder"
                             >
                                 <DragHandleIcon />
                             </div>

                             {/* Thumbnail */}
                             <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-black/50 border border-white/5">
                                 {cam.thumbnail ? (
                                     <img src={cam.thumbnail} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center text-gray-700 text-[7px]">
                                         {index + 1}
                                     </div>
                                 )}
                             </div>

                             {/* Label + shortcut hint */}
                             <div className="flex-1 min-w-0">
                                 {editId === cam.id ? (
                                     <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleRenameSubmit}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="bg-black border border-white/20 text-xs text-white px-1 py-0.5 rounded w-full outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                     />
                                 ) : (
                                     <span
                                        className={`text-xs font-bold truncate block cursor-text ${modified ? 'text-amber-300 italic' : isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}
                                        onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(cam); }}
                                        title="Double-click to rename"
                                     >
                                         {modified ? `*${cam.label}` : cam.label}
                                     </span>
                                 )}
                                 {index < 9 && (
                                     <span className="text-[7px] text-gray-600">Ctrl+{index + 1}</span>
                                 )}
                             </div>

                             {/* Action buttons */}
                             <div className="flex items-center gap-0.5 flex-shrink-0">
                                 {/* Update (overwrite) — lights up when camera has been modified */}
                                 {isActive && (
                                     <button
                                        onClick={(e) => { e.stopPropagation(); handleUpdateCamera(cam.id); }}
                                        className={`p-1 transition-colors ${modified
                                            ? 'text-amber-400 hover:text-amber-200'
                                            : 'text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100'}`}
                                        title={modified ? "Camera modified — click to save current view" : "Update camera to current view"}
                                     >
                                         <SaveIcon />
                                     </button>
                                 )}
                                 {/* Duplicate */}
                                 <button
                                    onClick={(e) => { e.stopPropagation(); duplicateCamera(cam.id); }}
                                    className="p-1 text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Duplicate camera"
                                 >
                                     <CopyIcon />
                                 </button>
                                 {/* Delete — immediate */}
                                 <button
                                    onClick={(e) => { e.stopPropagation(); deleteCamera(cam.id); }}
                                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete camera"
                                 >
                                     <TrashIcon />
                                 </button>
                             </div>
                         </div>
                     );
                 })}
             </div>

             {/* Footer / Active Settings */}
             <div className="border-t border-white/10 bg-black/40 p-2 space-y-2">
                 <div className="flex items-center justify-between">
                     <SectionLabel>
                         {activeCameraId ? 'Active Settings' : 'Free Camera'}
                     </SectionLabel>
                     {activeCameraId && (
                         <button
                            onClick={() => selectCamera(null)}
                            className="text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                         >
                             Deselect
                         </button>
                     )}
                 </div>

                 {/* Position/Rotation — shared with Scene tab */}
                 <CollapsibleSection label="Position" defaultOpen={false}>
                     <div className="mt-1">
                         <CameraPositionDisplay />
                     </div>
                 </CollapsibleSection>

                 <div className="bg-white/5 rounded p-1">
                     <AutoFeaturePanel featureId="optics" />
                 </div>

                 {/* Composition Overlays */}
                 <div className="border-t border-white/10 pt-2">
                     <CollapsibleSection
                         label="Composition Guide"
                         defaultOpen={false}
                         rightContent={compositionOverlay !== 'none' ? <span className="text-[8px] text-cyan-400">{OVERLAY_OPTIONS.find(o => o.type === compositionOverlay)?.label}</span> : null}
                     >
                         <div className="mt-2 space-y-2">
                             <div className="flex items-center gap-2">
                                 <label className="text-[9px] text-gray-500 w-16">Type</label>
                                 <select
                                     value={compositionOverlay}
                                     onChange={(e) => setCompositionOverlay(e.target.value as CompositionOverlayType)}
                                     className="flex-1 t-select"
                                 >
                                     {OVERLAY_OPTIONS.map(opt => (
                                         <option key={opt.type} value={opt.type}>{opt.label}</option>
                                     ))}
                                 </select>
                             </div>

                              {compositionOverlay !== 'none' && (
                                  <>
                                      <Slider
                                          label="Opacity"
                                          value={compositionOverlaySettings.opacity}
                                          min={0.1}
                                          max={1}
                                          step={0.1}
                                          onChange={(v) => setCompositionOverlaySettings({ opacity: v })}
                                      />

                                      <Slider
                                          label="Line Width"
                                          value={compositionOverlaySettings.lineThickness}
                                          min={0.5}
                                          max={3}
                                          step={0.5}
                                          onChange={(v) => setCompositionOverlaySettings({ lineThickness: v })}
                                      />

                                       <div className="flex items-center gap-2">
                                           <label className="text-[9px] text-gray-500 w-16">Color</label>
                                           <SmallColorPicker
                                               color={compositionOverlaySettings.color}
                                               onChange={(c: string) => setCompositionOverlaySettings({ color: c })}
                                           />
                                       </div>

                                      {compositionOverlay === 'grid' && (
                                          <>
                                              <Slider
                                                  label="Divisions X"
                                                  value={compositionOverlaySettings.gridDivisionsX}
                                                  min={2}
                                                  max={16}
                                                  step={1}
                                                  onChange={(v) => setCompositionOverlaySettings({ gridDivisionsX: v })}
                                              />
                                              <Slider
                                                  label="Divisions Y"
                                                  value={compositionOverlaySettings.gridDivisionsY}
                                                  min={2}
                                                  max={16}
                                                  step={1}
                                                  onChange={(v) => setCompositionOverlaySettings({ gridDivisionsY: v })}
                                              />
                                          </>
                                      )}

                                       {compositionOverlay === 'spiral' && (
                                           <>
                                               <Slider
                                                   label="Rotation"
                                                   value={compositionOverlaySettings.spiralRotation}
                                                   min={0}
                                                   max={360}
                                                   step={15}
                                                   onChange={(v) => setCompositionOverlaySettings({ spiralRotation: v })}
                                               />
                                               <Slider
                                                   label="Position X"
                                                   value={compositionOverlaySettings.spiralPositionX}
                                                   min={0}
                                                   max={1}
                                                   step={0.05}
                                                   onChange={(v) => setCompositionOverlaySettings({ spiralPositionX: v })}
                                               />
                                               <Slider
                                                   label="Position Y"
                                                   value={compositionOverlaySettings.spiralPositionY}
                                                   min={0}
                                                   max={1}
                                                   step={0.05}
                                                   onChange={(v) => setCompositionOverlaySettings({ spiralPositionY: v })}
                                               />
                                               <Slider
                                                   label="Scale"
                                                   value={compositionOverlaySettings.spiralScale}
                                                   min={0.5}
                                                   max={2}
                                                   step={0.1}
                                                   onChange={(v) => setCompositionOverlaySettings({ spiralScale: v })}
                                               />
                                               <Slider
                                                   label="Ratio (Phi)"
                                                   value={compositionOverlaySettings.spiralRatio}
                                                   min={1.0}
                                                   max={2.0}
                                                   step={0.01}
                                                   onChange={(v) => setCompositionOverlaySettings({ spiralRatio: v })}
                                               />
                                           </>
                                       )}

                                      <div className="flex items-center gap-3 pt-1">
                                          <label className="flex items-center gap-1 cursor-pointer">
                                              <input
                                                  type="checkbox"
                                                  checked={compositionOverlaySettings.showCenterMark}
                                                  onChange={(e) => setCompositionOverlaySettings({ showCenterMark: e.target.checked })}
                                                  className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"
                                              />
                                              <span className="text-[9px] text-gray-400">Center</span>
                                          </label>
                                          <label className="flex items-center gap-1 cursor-pointer">
                                              <input
                                                  type="checkbox"
                                                  checked={compositionOverlaySettings.showSafeAreas}
                                                  onChange={(e) => setCompositionOverlaySettings({ showSafeAreas: e.target.checked })}
                                                  className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"
                                              />
                                              <span className="text-[9px] text-gray-400">Safe Areas</span>
                                          </label>
                                      </div>
                                 </>
                             )}
                         </div>
                     </CollapsibleSection>
                 </div>
             </div>
        </div>
    );
};
