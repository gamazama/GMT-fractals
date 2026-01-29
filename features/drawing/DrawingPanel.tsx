
import React, { useEffect, useState } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { engine } from '../../engine/FractalEngine';
import { TrashIcon, CropIcon, CheckIcon, ChevronDown, ChevronUp, SquareIcon, CircleIcon, CubeIcon } from '../../components/Icons';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';
import SmallColorPicker from '../../components/SmallColorPicker';
import Slider from '../../components/Slider';
import * as THREE from 'three';

interface DrawingPanelProps {
    className?: string;
}

export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = "-m-3" }) => {
    const { drawing, setDrawing, removeDrawnShape, clearDrawnShapes, updateDrawnShape } = useFractalStore();
    const { active, activeTool, originMode, color, showLabels, showAxes, shapes, refreshTrigger } = drawing;
    
    // Local state for depth readout
    const [currentDepth, setCurrentDepth] = useState(engine.lastMeasuredDistance);
    const [isListExpanded, setIsListExpanded] = useState(true);

    // Poll depth when panel is open and mode is surface
    useEffect(() => {
        let interval: number;
        if (active && originMode === 1.0) {
            interval = window.setInterval(() => {
                const dist = engine.lastMeasuredDistance;
                if (Math.abs(dist - currentDepth) > 0.0001) {
                    setCurrentDepth(dist);
                }
            }, 200);
        }
        return () => clearInterval(interval);
    }, [active, originMode, currentDepth]);

    const handleToggleActive = () => {
        setDrawing({ active: !active });
    };
    
    const handleReProbe = () => {
        setDrawing({ refreshTrigger: (refreshTrigger || 0) + 1 });
        setCurrentDepth(engine.lastMeasuredDistance);
    };

    return (
        <div className={`flex flex-col h-full select-none ${className}`} data-help-id="panel.drawing">
            
            {/* --- HEADER --- */}
            <div className="p-3 bg-black/40 border-b border-white/5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]" />
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Measurement Tools</h3>
                </div>
                
                <div className="flex gap-2 mb-2">
                    <Button 
                        onClick={handleToggleActive} 
                        active={active}
                        variant={active ? "success" : "primary"}
                        className="flex-1 py-3 text-xs shadow-lg"
                        icon={active ? <CheckIcon /> : <CropIcon />}
                    >
                        {active ? "DRAWING ACTIVE" : "START DRAWING"}
                    </Button>
                </div>
                
                {/* TOOL SELECTOR */}
                <div className="flex bg-gray-800/50 rounded p-1 mb-3">
                     <button
                        onClick={() => setDrawing({ activeTool: 'rect' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold uppercase transition-colors ${activeTool === 'rect' ? 'bg-cyan-900 text-cyan-200 shadow-sm' : 'text-gray-500 hover:text-white'}`}
                        title="Rectangle"
                     >
                         <SquareIcon /> RECT
                     </button>
                     <button
                        onClick={() => setDrawing({ activeTool: 'circle' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold uppercase transition-colors ${activeTool === 'circle' ? 'bg-cyan-900 text-cyan-200 shadow-sm' : 'text-gray-500 hover:text-white'}`}
                        title="Circle / Ellipse"
                     >
                         <CircleIcon /> CIRCLE
                     </button>
                </div>

                <div className="flex items-center justify-between mb-1">
                     <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Default Color</label>
                     <SmallColorPicker 
                         color={'#' + color.getHexString()} 
                         onChange={(c) => setDrawing({ color: new THREE.Color(c) })} 
                         label="" 
                     />
                </div>
                
                {active && (
                    <div className="mt-2 px-2 py-1.5 bg-cyan-900/20 border border-cyan-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 animate-fade-in text-center font-mono">
                        <div>Hold <strong>X</strong> to snap to World Axis</div>
                        <div>Hold <strong>SHIFT</strong> for 1:1 Ratio</div>
                        <div>Hold <strong>ALT</strong> for Center Draw</div>
                        <div>Hold <strong>SPACE</strong> to Move</div>
                    </div>
                )}
            </div>

            {/* --- SETTINGS --- */}
            <div className="p-3 border-b border-white/5 space-y-3 bg-white/[0.02]">
                
                {/* 1. Origin Mode & Depth */}
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Drawing Plane Origin</label>
                    <ToggleSwitch 
                        value={originMode}
                        onChange={(v) => setDrawing({ originMode: v })}
                        options={[
                            { label: 'Global Zero', value: 0.0 },
                            { label: 'Surface Probe', value: 1.0 }
                        ]}
                    />
                    
                    {originMode === 1.0 && (
                        <div className="flex items-center justify-between bg-black/40 rounded border border-white/10 p-1.5 mt-1 animate-fade-in">
                            <span className="text-[9px] text-gray-400 font-mono pl-1">Depth: <span className="text-cyan-400 font-bold">{currentDepth.toFixed(4)}</span></span>
                            <button 
                                onClick={handleReProbe}
                                className="px-2 py-0.5 bg-gray-800 hover:bg-white/10 text-gray-300 text-[9px] font-bold uppercase rounded border border-white/5 hover:border-white/20 transition-all"
                                title="Update axis position to current probe location"
                            >
                                Refresh Axis
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-3 h-3 border rounded transition-colors ${showLabels ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600 bg-transparent'}`} />
                        <input type="checkbox" className="hidden" checked={showLabels} onChange={(e) => setDrawing({ showLabels: e.target.checked })} />
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">Show Labels</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-3 h-3 border rounded transition-colors ${showAxes ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600 bg-transparent'}`} />
                        <input type="checkbox" className="hidden" checked={showAxes} onChange={(e) => setDrawing({ showAxes: e.target.checked })} />
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">Show Axes</span>
                    </label>
                </div>
            </div>
            
            {/* --- OBJECT LIST --- */}
            <div className="flex-1 overflow-y-auto custom-scroll p-3 bg-black/20">
                 <div 
                    className="flex justify-between items-center mb-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                    onClick={() => setIsListExpanded(!isListExpanded)}
                 >
                     <div className="flex items-center gap-2">
                         <span className="text-gray-500">{isListExpanded ? <ChevronUp /> : <ChevronDown />}</span>
                         <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Measurement List ({(shapes || []).length})</span>
                     </div>
                     {(shapes || []).length > 0 && isListExpanded && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); clearDrawnShapes(); }} 
                            className="text-[9px] text-red-500 hover:text-red-300 uppercase font-bold transition-colors px-2 py-0.5"
                         >
                            Clear
                         </button>
                     )}
                 </div>
                 
                 {isListExpanded && (
                     <>
                         {(shapes || []).length === 0 ? (
                             <div className="text-center py-4 text-[10px] text-gray-600 italic">
                                 No measurements drawn.
                             </div>
                         ) : (
                             <div className="space-y-1 animate-fade-in">
                                 {(shapes || []).map((shape, i) => {
                                     const isCube = shape.type === 'rect' && (shape.size.z || 0) > 0.001;
                                     return (
                                         <div key={shape.id} className="flex flex-col bg-white/5 rounded border border-white/5 hover:border-cyan-500/30 transition-colors group">
                                             <div className="flex items-center justify-between p-2">
                                                 <div className="flex items-center gap-3">
                                                     <div className="transform scale-75 origin-left">
                                                         <SmallColorPicker 
                                                            color={shape.color} 
                                                            onChange={(c) => updateDrawnShape({ id: shape.id, updates: { color: c } })} 
                                                            label=""
                                                         />
                                                     </div>
                                                     <div className="flex flex-col">
                                                         <div className="flex items-center gap-2">
                                                             <span className="text-[10px] text-gray-300 font-mono font-bold">#{i+1}</span>
                                                             <span className="text-[8px] text-gray-500 font-bold uppercase bg-black/40 px-1 rounded">{isCube ? 'CUBE' : shape.type}</span>
                                                         </div>
                                                         <span className="text-[9px] text-gray-500 font-mono">
                                                             {shape.size.x.toFixed(4)} x {shape.size.y.toFixed(4)} {isCube ? `x ${shape.size.z?.toFixed(4)}` : ''}
                                                         </span>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-1">
                                                     {shape.type === 'rect' && (
                                                        <button 
                                                            onClick={() => {
                                                                const currentZ = shape.size.z || 0;
                                                                // Toggle: If z exists, set to 0. If 0, set to min dim.
                                                                const newZ = currentZ > 0 ? 0 : Math.min(shape.size.x, shape.size.y);
                                                                updateDrawnShape({ id: shape.id, updates: { size: { ...shape.size, z: newZ } } });
                                                            }}
                                                            className={`p-1.5 rounded transition-colors ${isCube ? 'text-cyan-300 bg-cyan-900/40' : 'text-gray-600 hover:text-cyan-400 hover:bg-white/5'}`}
                                                            title={isCube ? "Convert to Rect" : "Extrude to Cube"}
                                                        >
                                                            <CubeIcon />
                                                        </button>
                                                     )}
                                                     <button 
                                                         onClick={() => removeDrawnShape(shape.id)}
                                                         className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                         title="Delete"
                                                     >
                                                         <TrashIcon />
                                                     </button>
                                                 </div>
                                             </div>
                                             
                                             {/* Sliders for Cubes */}
                                             {isCube && (
                                                <div className="px-2 pb-2 pt-0 space-y-1 animate-slider-entry bg-black/20 mt-1 rounded border border-white/5 mx-1">
                                                    <Slider 
                                                        label="Depth" 
                                                        value={shape.size.z || 0}
                                                        onChange={(v) => updateDrawnShape({ id: shape.id, updates: { size: { ...shape.size, z: Math.max(0.001, v) } } })}
                                                        step={0.01}
                                                        min={0.001} max={5.0}
                                                        highlight
                                                    />
                                                    <Slider 
                                                        label="Offset" 
                                                        value={shape.zOffset || 0}
                                                        onChange={(v) => updateDrawnShape({ id: shape.id, updates: { zOffset: v } })}
                                                        step={0.01}
                                                        min={-2.0} max={2.0}
                                                    />
                                                </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         )}
                     </>
                 )}
            </div>
        </div>
    );
};
