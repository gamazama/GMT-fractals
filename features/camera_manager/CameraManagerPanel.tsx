
import React, { useState } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { TrashIcon, PlusIcon, ChevronDown, ChevronRight } from '../../components/Icons';
import { SavedCamera, CompositionOverlayType } from '../../types';
import { calculateDirectionalView, getDirectionName } from './logic';
import { CameraUtils } from '../../utils/CameraUtils';
import Slider from '../../components/Slider';
import SmallColorPicker from '../../components/SmallColorPicker';

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

export const CameraManagerPanel: React.FC<CameraManagerPanelProps> = ({ className = "-m-3" }) => {
    const { savedCameras, activeCameraId, addCamera, deleteCamera, selectCamera, updateCamera, resetCamera } = useFractalStore();
    const optics = useFractalStore(s => s.optics);
    const compositionOverlay = useFractalStore(s => s.compositionOverlay);
    const setCompositionOverlay = useFractalStore(s => s.setCompositionOverlay);
    const compositionOverlaySettings = useFractalStore(s => s.compositionOverlaySettings);
    const setCompositionOverlaySettings = useFractalStore(s => s.setCompositionOverlaySettings);
    // We need setOptics to apply changes.
    // Casting is necessary because Feature Actions aren't explicitly typed on the root interface for all plugins
    const setOptics = (useFractalStore.getState() as any).setOptics;

    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [showCompositionSettings, setShowCompositionSettings] = useState(false);

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
    
    const handleDeselect = () => {
        selectCamera(null);
    };
    
    // Logic: Calculate view using utility, then dispatch atomic actions
    const handleDirectional = (dir: 'Top' | 'Bottom' | 'Left' | 'Right' | 'Front' | 'Back' | 'Isometric') => {
        // 1. Calculate
        const result = calculateDirectionalView(dir, optics);
        
        // 2. Teleport Camera (Updates position/rotation in slice + emits event)
        CameraUtils.teleportPosition(
            result.position, 
            result.rotation, 
            result.targetDistance
        );
        
        // 3. Update Optics if needed
        if (result.optics && setOptics) {
            setOptics(result.optics);
        }
        
        // 4. Deselect active camera to prevent overwriting saved one
        selectCamera(null);
    };
    
    const handleAddCamera = () => {
        // Generate smart name
        const rot = CameraUtils.getRotationFromEngine();
        let name = `Camera ${savedCameras.length + 1}`;
        const opticsNow = useFractalStore.getState().optics;
        
        if (opticsNow && Math.abs(opticsNow.camType - 1.0) < 0.1) {
             const dirName = getDirectionName(rot);
             if (dirName) name = dirName;
        }
        
        addCamera(name);
    };
    
    const handleReset = () => {
        resetCamera();
        if (setOptics) {
            setOptics({ camType: 0.0, camFov: 60, orthoScale: 2.0 });
        }
    };

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
                     className="col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 mt-1"
                 >
                     <PlusIcon /> New Camera
                 </button>
             </div>

             {/* List */}
             <div className="p-2 space-y-1">
                 {savedCameras.length === 0 && (
                     <div className="text-center text-gray-600 text-[10px] italic py-4">No saved cameras</div>
                 )}
                 
                 {savedCameras.map(cam => {
                     const isActive = activeCameraId === cam.id;
                     return (
                         <div 
                            key={cam.id}
                            className={`flex items-center justify-between p-2 rounded border transition-all group ${
                                isActive 
                                ? 'bg-cyan-900/20 border-cyan-500/50' 
                                : 'bg-white/5 border-transparent hover:border-white/10'
                            }`}
                            onClick={() => selectCamera(cam.id)}
                         >
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-gray-600'}`} />
                                 
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
                                        className={`text-xs font-bold truncate cursor-text ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}
                                        onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(cam); }}
                                        title="Double-click to rename"
                                     >
                                         {cam.label}
                                     </span>
                                 )}
                             </div>
                             
                             <button 
                                onClick={(e) => { e.stopPropagation(); deleteCamera(cam.id); }}
                                className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                             >
                                 <TrashIcon />
                             </button>
                         </div>
                     );
                 })}
             </div>
             
             {/* Footer / Active Settings */}
             <div className="border-t border-white/10 bg-black/40 p-2 space-y-2">
                 <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                         {activeCameraId ? 'Active Settings' : 'Free Camera'}
                     </span>
                     {activeCameraId && (
                         <button 
                            onClick={handleDeselect}
                            className="text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                         >
                             Deselect
                         </button>
                     )}
                 </div>
                 
                 <div className="bg-white/5 rounded p-1">
                     <AutoFeaturePanel featureId="optics" />
                 </div>
                 
                 {/* Composition Overlays - Under camera settings */}
                 <div className="border-t border-white/10 pt-2">
                     {/* Header - Clickable to expand/collapse */}
                     <button
                         onClick={() => setShowCompositionSettings(!showCompositionSettings)}
                         className="w-full flex items-center justify-between hover:bg-white/5 transition-colors rounded"
                     >
                         <div className="flex items-center gap-2">
                             {showCompositionSettings ? <ChevronDown /> : <ChevronRight />}
                             <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Composition Guide</span>
                         </div>
                         {compositionOverlay !== 'none' && (
                             <span className="text-[8px] text-cyan-400 uppercase">{OVERLAY_OPTIONS.find(o => o.type === compositionOverlay)?.label}</span>
                         )}
                     </button>
                     
                     {/* Content - Collapsible */}
                     {showCompositionSettings && (
                         <div className="mt-2 space-y-2">
                             {/* Overlay Type Dropdown */}
                             <div className="flex items-center gap-2">
                                 <label className="text-[9px] text-gray-500 w-16">Type</label>
                                 <select
                                     value={compositionOverlay}
                                     onChange={(e) => setCompositionOverlay(e.target.value as CompositionOverlayType)}
                                     className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-cyan-500/50"
                                 >
                                     {OVERLAY_OPTIONS.map(opt => (
                                         <option key={opt.type} value={opt.type}>{opt.label}</option>
                                     ))}
                                 </select>
                             </div>
                             
                              {/* Settings - only show when overlay is active */}
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
                                      
                                      {/* Color Picker */}
                                       <div className="flex items-center gap-2">
                                           <label className="text-[9px] text-gray-500 w-16">Color</label>
                                           <SmallColorPicker 
                                               color={compositionOverlaySettings.color}
                                               onChange={(c: string) => setCompositionOverlaySettings({ color: c })}
                                           />
                                       </div>
                                      
                                      {/* Grid-specific settings */}
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
                                      
                                       {/* Spiral-specific settings */}
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
                                      
                                      {/* Toggle Options */}
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
                     )}
                 </div>
             </div>
        </div>
    );
};
