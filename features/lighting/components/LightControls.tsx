
import React from 'react';
import { useFractalStore } from '../../../store/fractalStore';
import { useAnimationStore } from '../../../store/animationStore';
import { getLightFromSlice } from '../index';
import { engine } from '../../../engine/FractalEngine';
import Slider from '../../../components/Slider';
import EmbeddedColorPicker from '../../../components/EmbeddedColorPicker';
import { KeyIcon, TrashIcon, KeyStatus } from '../../../components/Icons';
import { KeyframeButton } from '../../../components/KeyframeButton';
import { evaluateTrackValue } from '../../../utils/timelineUtils';

export const LightOrb = ({ index, color, active, onClick, onDragStart }: { index: number, color: string, active: boolean, onClick: () => void, onDragStart: () => void }) => {
    return (
        <div 
            className={`group relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 touch-none ${active ? 'opacity-100 scale-100' : 'opacity-50 hover:opacity-100 scale-90 hover:scale-100'}`}
            onPointerDown={(e) => {
                // Only drag on primary button (Left Click/Touch)
                if (e.button === 0) {
                    e.stopPropagation();
                    onDragStart();
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            {!active && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-[9px] font-bold text-gray-300 px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Drag to Screen
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-t border-l border-white/20 transform rotate-45" />
                </div>
            )}

            <div 
                className="w-8 h-8 rounded-full border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] transition-all duration-300"
                style={{ 
                    backgroundColor: active ? color : 'transparent',
                    boxShadow: active ? `0 0 20px ${color}, inset 0 0 10px white` : 'none',
                    borderColor: active ? 'white' : 'rgba(255,255,255,0.2)'
                }}
            />
            
            <span className="absolute -bottom-4 text-[8px] font-bold text-gray-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                L{index + 1}
            </span>
            
            {active && (
                <div className="absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20 pointer-events-none" />
            )}
        </div>
    );
};

export const LightSettingsPopup = ({ index }: { index: number }) => {
    const light = useFractalStore(s => getLightFromSlice(s.lighting, index));
    const updateLight = useFractalStore(s => s.updateLight);
    const removeLight = useFractalStore(s => s.removeLight);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    
    // Animation Store for Keyframing
    const { addTrack, addKeyframe, currentFrame, sequence, isPlaying } = useAnimationStore();

    if (!light.visible) return null;

    const handleToggleFixed = () => {
         if (!engine.activeCamera) return;
         const wasFixed = light.fixed;
         // Calculate new position to keep light visually in same place when switching space
         const newPos = engine.virtualSpace.resolveRealWorldPosition(light.position, wasFixed, engine.activeCamera);
         updateLight({ index, params: { fixed: !wasFixed, position: newPos } });
    };

    const handlePositionKey = () => {
        const axes = ['X', 'Y', 'Z'];
        axes.forEach(axis => {
            const id = `lighting.light${index}_pos${axis}`; // e.g. lighting.light0_posX
            if (!sequence.tracks[id]) addTrack(id, `Light ${index+1} Pos ${axis}`);
            // @ts-ignore
            addKeyframe(id, currentFrame, light.position[axis.toLowerCase()]);
        });
    };

    // Calculate aggregated status for 3 tracks (X, Y, Z)
    const getPosKeyStatus = (): KeyStatus => {
        const axes = ['X', 'Y', 'Z'] as const;
        let hasAnyTrack = false;
        let hasKeyAtFrame = false;
        let isDirty = false;

        axes.forEach(axis => {
            const id = `lighting.light${index}_pos${axis}`;
            const track = sequence.tracks[id];
            if (track) {
                hasAnyTrack = true;
                const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                
                if (k) hasKeyAtFrame = true;

                if (!isPlaying) {
                    const currentVal = light.position[axis.toLowerCase() as 'x'|'y'|'z'];
                    let timelineVal = 0;
                    
                    if (k) {
                        timelineVal = k.value;
                    } else {
                        timelineVal = evaluateTrackValue(track.keyframes, currentFrame, false);
                    }
                    
                    if (Math.abs(timelineVal - currentVal) > 0.0001) isDirty = true;
                }
            }
        });

        if (!hasAnyTrack) return 'none';
        
        if (hasKeyAtFrame) {
            return isDirty ? 'keyed-dirty' : 'keyed';
        } else {
            return isDirty ? 'dirty' : 'partial';
        }
    };

    const posStatus = getPosKeyStatus();

    // Derived Falloff Factor for UI (Factor = RawFalloff / Intensity)
    // Avoid division by zero
    const safeIntensity = Math.max(0.01, light.intensity);
    const currentFalloffFactor = light.falloff / safeIntensity;
    const prefix = `lighting.light${index}`;
    
    // Smart 5-digit formatter for UI
    const formatValue = (val: number) => {
        if (val === 0) return "0";
        if (Math.abs(val) < 1.0) return val.toFixed(3);
        // Use precision 5, then strip trailing zeros if it has a decimal point
        const s = val.toPrecision(5);
        return s.includes('.') ? s.replace(/\.?0+$/, "") : s;
    };

    return (
        <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-52 bg-black border border-white/20 rounded-xl p-3 shadow-2xl z-[70] animate-fade-in origin-top" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45" />
            
            <div className="relative space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                        <KeyframeButton status={posStatus} onClick={handlePositionKey} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Light {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 handleInteractionStart('param');
                                 removeLight(index);
                                 handleInteractionEnd();
                             }}
                             className="p-1 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                             title="Remove Light"
                        >
                            <TrashIcon />
                        </button>
                        <button 
                            onClick={() => {
                                handleInteractionStart('param');
                                handleToggleFixed();
                                handleInteractionEnd();
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${light.fixed ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'}`}
                        >
                            {light.fixed ? 'ANCHORED' : 'FLOATING'}
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <Slider 
                        label="Intensity" 
                        value={light.intensity} 
                        min={0} max={100} step={0.1} 
                        onChange={(v) => updateLight({ index, params: { intensity: v } })} 
                        customMapping={{
                            min: 0, max: 100,
                            // Square curve for better control at low intensities (0-10 range)
                            toSlider: (val) => Math.sqrt(val / 100) * 100,
                            fromSlider: (val) => (val * val) / 100
                        }}
                        overrideInputText={formatValue(light.intensity)}
                        trackId={`${prefix}_intensity`}
                    />
                    
                    <Slider 
                        label="Falloff" 
                        value={currentFalloffFactor} 
                        min={0} max={10.0} step={0.01} 
                        onChange={(factor) => {
                            // Logic: Actual Falloff = Factor * Intensity
                            const newRawFalloff = factor * light.intensity;
                            updateLight({ index, params: { falloff: newRawFalloff } });
                        }} 
                        customMapping={{
                            min: 0, max: 100,
                            // Power curve (1.5) for "Log-like" feel on the Factor slider
                            toSlider: (val) => Math.pow(val / 10, 1/1.5) * 100,
                            fromSlider: (val) => Math.pow(val / 100, 1.5) * 10
                        }}
                        // Updated threshold for visibility
                        overrideInputText={currentFalloffFactor < 0.0001 ? "Infinite" : formatValue(currentFalloffFactor)}
                        trackId={`${prefix}_falloff`}
                    />
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                    <EmbeddedColorPicker 
                        color={light.color} 
                        onColorChange={(c) => updateLight({ index, params: { color: c } })}
                    />
                    
                    <div className="flex items-center justify-between pt-1">
                        <label className="text-xs text-gray-400 font-medium">Cast Shadows</label>
                        <input 
                            type="checkbox" 
                            checked={light.castShadow}
                            onChange={(e) => {
                                handleInteractionStart('param');
                                updateLight({ index, params: { castShadow: e.target.checked } });
                                handleInteractionEnd();
                            }}
                            className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
