
import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFractalStore } from '../../../store/fractalStore';
import { useAnimationStore } from '../../../store/animationStore';
import { getLightFromSlice } from '../index';
import { getProxy } from '../../../engine/worker/WorkerProxy';
const engine = getProxy();
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';
import Slider from '../../../components/Slider';
import EmbeddedColorPicker from '../../../components/EmbeddedColorPicker';
import { KeyIcon, KeyStatus, AnchorIcon, UnanchoredIcon, MenuIcon } from '../../../components/Icons';
import { buildCoreLightMenuItems } from '../utils/lightMenuUtils';
import { KeyframeButton } from '../../../components/KeyframeButton';
import { evaluateTrackValue } from '../../../utils/timelineUtils';
import { LightType } from '../../../types';
import { LightDirectionControl } from './LightDirectionControl';
import { kelvinToHex, COLOR_TEMPERATURE_PRESETS } from '../../../utils/colorUtils';
import { SectionLabel } from '../../../components/SectionLabel';
import { Popover } from '../../../components/Popover';

export const LightOrb = ({ index, color, active, type, rotation, onClick, onDragStart }: { index: number, color: string, active: boolean, type?: LightType, rotation?: {x:number, y:number, z:number}, onClick: () => void, onDragStart: () => void }) => {
    
    // Calculate highlight position for Directional Light
    // Returns just the coordinates, style applied in JSX
    const getHighlightPos = () => {
        if (!rotation) return { x: 50, y: 50 };
        const yaw = rotation.y;
        return {
            x: 50 + Math.sin(yaw) * 35,
            y: 50 - Math.cos(yaw) * 35
        };
    };
    
    const highlight = getHighlightPos();
    
    // Generate 12 rays for the Sun icon
    const sunRays = Array.from({length: 12}).map((_, i) => i * 30);

    return (
        <div 
            className={`group relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 touch-none ${active ? 'opacity-100 scale-100' : 'opacity-50 hover:opacity-100 scale-90 hover:scale-100'}`}
            onPointerDown={(e) => {
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

            <div className="w-8 h-8 relative">
                
                {/* LAYER 1: Outer Glow (Unclipped) */}
                {active && (
                    <div 
                        className="absolute inset-0 rounded-full transition-all duration-300"
                        style={{
                            boxShadow: `0 0 ${type === 'Directional' ? '12px' : '20px'} ${color}`,
                            opacity: type === 'Directional' ? 0.6 : 1.0,
                            backgroundColor: type === 'Directional' ? 'transparent' : color
                        }}
                    />
                )}

                {/* LAYER 2: Sun Rays (Unclipped) - Static */}
                {active && type === 'Directional' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {sunRays.map(deg => (
                            <div 
                                key={deg}
                                className="absolute w-px h-[3px] rounded-full"
                                style={{
                                    backgroundColor: color,
                                    top: '50%', left: '50%',
                                    marginTop: '-1.5px', // Half height
                                    marginLeft: '-0.5px', // Half width
                                    // Translate Y: 16px radius + 1px gap = 17px distance
                                    transform: `rotate(${deg}deg) translateY(-17px)`, 
                                    boxShadow: `0 0 2px ${color}`
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* LAYER 3: Surface & Gradient (Strictly Clipped) */}
                {/* 'isolate' creates a new stacking context, helping WebKit clip children correctly */}
                <div 
                    className="absolute inset-0 rounded-full border border-white overflow-hidden z-10 shadow-[inset_0_0_6px_rgba(255,255,255,0.4)] isolate"
                    style={{
                        backgroundColor: type === 'Directional' ? '#000000' : color
                    }}
                >
                    
                    {/* Directional Gradient Child */}
                    {active && type === 'Directional' && (
                        <div 
                            className="absolute inset-0 w-full h-full"
                            style={{
                                background: `radial-gradient(circle at ${highlight.x}% ${highlight.y}%, ${color} 0%, transparent 65%)`,
                                opacity: 1.0
                            }}
                        />
                    )}
                </div>
                
                {/* LAYER 4: Ping Animation (Point Light) */}
                {active && type !== 'Directional' && (
                    <div className="absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20 pointer-events-none" />
                )}
            </div>
            
            <SectionLabel variant="tiny" className="absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                L{index + 1}
            </SectionLabel>
        </div>
    );
};

export const LightSettingsPopup = ({ index, onClose }: { index: number; onClose?: () => void }) => {
    const light = useFractalStore(s => getLightFromSlice(s.lighting, index));
    const updateLight = useFractalStore(s => s.updateLight);
    const removeLight = useFractalStore(s => s.removeLight);
    const duplicateLight = useFractalStore(s => s.duplicateLight);
    const openContextMenu = useFractalStore(s => s.openContextMenu);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();

    const menuBtnRef = useRef<HTMLButtonElement>(null);
    
    // Animation Store for Keyframing
    const { addTrack, addKeyframe, currentFrame, sequence, isPlaying } = useAnimationStore();
    
    // Temperature mode state - default to temperature if light has useTemperature flag
    const [useTempMode, setUseTempMode] = useState(light.useTemperature ?? false);
    const [tempKelvin, setTempKelvin] = useState(light.temperature ?? 6500);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const r = menuBtnRef.current?.getBoundingClientRect();
        if (!r) return;
        const allLights = useFractalStore.getState().lighting?.lights ?? [];
        const items = [
            ...buildCoreLightMenuItems(index, (params) => {
                handleInteractionStart('param');
                updateLight({ index, params });
                handleInteractionEnd();
            }),
            { label: 'Light', isHeader: true },
            {
                label: 'Duplicate',
                action: () => { handleInteractionStart('param'); duplicateLight(index); handleInteractionEnd(); }
            },
            {
                label: 'Delete',
                danger: true,
                disabled: allLights.length <= 1,
                action: () => { handleInteractionStart('param'); removeLight(index); handleInteractionEnd(); }
            },
        ];
        openContextMenu(r.left, r.bottom + 4, items, ['panel.light']);
    };

    if (!light.visible) return null;

    const handleToggleFixed = () => {
         const wasFixed = light.fixed;
         let newPos = light.position;
         let newRot = light.rotation;
         const cam = getViewportCamera();

         if (cam) {
             if (light.type === 'Point') {
                 const o = engine.sceneOffset;
                 if (wasFixed) {
                     const worldPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
                     worldPos.applyQuaternion(cam.quaternion);
                     worldPos.add(cam.position);
                     newPos = { x: worldPos.x + o.x + (o.xL ?? 0), y: worldPos.y + o.y + (o.yL ?? 0), z: worldPos.z + o.z + (o.zL ?? 0) };
                 } else {
                     const worldPos = new THREE.Vector3(newPos.x - o.x - (o.xL ?? 0), newPos.y - o.y - (o.yL ?? 0), newPos.z - o.z - (o.zL ?? 0));
                     worldPos.sub(cam.position);
                     worldPos.applyQuaternion(cam.quaternion.clone().invert());
                     newPos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
                 }
             } else {
                 const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(newRot.x, newRot.y, newRot.z, 'YXZ'));
                 dir.applyQuaternion(wasFixed ? cam.quaternion : cam.quaternion.clone().invert());
                 const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
                 const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
                 newRot = { x: e.x, y: e.y, z: e.z };
             }
         }

         updateLight({ index, params: { fixed: !wasFixed, position: newPos, rotation: newRot } });
    };

    const handlePositionKey = () => {
        const axes = ['X', 'Y', 'Z'];
        axes.forEach(axis => {
            const id = `lighting.light${index}_pos${axis}`; // e.g. lighting.light0_posX
            if (!sequence.tracks[id]) addTrack(id, `Light ${index+1} Pos ${axis}`);
            addKeyframe(id, currentFrame, light.position[axis.toLowerCase() as 'x' | 'y' | 'z']);
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

    const prefix = `lighting.light${index}`;
    
    // Smart 5-digit formatter for UI
    const formatValue = (val: number) => {
        if (val === 0) return "0";
        if (Math.abs(val) < 1.0) return val.toFixed(3);
        const s = val.toPrecision(5);
        return s.includes('.') ? s.replace(/\.?0+$/, "") : s;
    };

    return (
        <Popover width="w-52" onClose={onClose}>
            <div className="relative space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                        {light.type === 'Point' && <KeyframeButton status={posStatus} onClick={handlePositionKey} />}
                        <SectionLabel>Light {index + 1}</SectionLabel>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleInteractionStart('param');
                                handleToggleFixed();
                                handleInteractionEnd();
                            }}
                            className={`p-1 rounded transition-colors ${light.fixed ? 'text-orange-300 hover:text-orange-200 hover:bg-orange-900/20' : 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/20'}`}
                            title={light.fixed ? 'Attached to Camera (click to unanchor)' : 'World Anchored (click to attach to camera)'}
                        >
                            {light.fixed ? <UnanchoredIcon /> : <AnchorIcon />}
                        </button>
                        <button
                            ref={menuBtnRef}
                            onClick={handleMenuClick}
                            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Light options"
                        >
                            <MenuIcon />
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    {/* Add Direction Control for Sun Lights */}
                    {light.type === 'Directional' && (
                        <div className="mb-2">
                            <LightDirectionControl 
                                index={index}
                                value={light.rotation}
                                onChange={(v) => updateLight({ index, params: { rotation: v } })}
                                isFixed={light.fixed}
                                width={180}
                                height={110}
                            />
                        </div>
                    )}

                    {light.intensityUnit === 'ev' ? (
                        <Slider
                            label="Power (EV)"
                            value={light.intensity}
                            min={-4} max={10} step={0.1}
                            onChange={(v) => updateLight({ index, params: { intensity: v } })}
                            mapTextInput={false}
                            overrideInputText={`${formatValue(light.intensity)} EV`}
                            trackId={`${prefix}_intensity`}
                        />
                    ) : (
                        <Slider
                            label="Power"
                            value={light.intensity}
                            min={0} max={100} step={0.1}
                            onChange={(v) => updateLight({ index, params: { intensity: v } })}
                            customMapping={{
                                min: 0, max: 100,
                                toSlider: (val) => Math.sqrt(val / 100) * 100,
                                fromSlider: (val) => (val * val) / 100
                            }}
                            mapTextInput={false}
                            overrideInputText={formatValue(light.intensity)}
                            trackId={`${prefix}_intensity`}
                        />
                    )}

                    {light.type !== 'Directional' && (
                        <Slider
                            label="Range"
                            value={light.range ?? 0}
                            min={0} max={100} step={0.1}
                            onChange={(v) => updateLight({ index, params: { range: v } })}
                            customMapping={{
                                min: 0, max: 100,
                                toSlider: (val) => (Math.log10(val + 1) / Math.log10(101)) * 100,
                                fromSlider: (val) => Math.pow(101, val / 100) - 1
                            }}
                            mapTextInput={false}
                            overrideInputText={(light.range ?? 0) < 0.01 ? 'Infinite' : formatValue(light.range ?? 0)}
                            trackId={`${prefix}_falloff`}
                        />
                    )}
                    {light.type !== 'Directional' && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-400 font-medium">Visible Sphere</label>
                                <button
                                    onClick={() => {
                                        const isOn = (light.radius ?? 0) > 0.001;
                                        handleInteractionStart('param');
                                        updateLight({ index, params: { radius: isOn ? 0 : 0.1 } });
                                        handleInteractionEnd();
                                    }}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                        (light.radius ?? 0) > 0.001
                                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                            : 'bg-white/5 text-gray-400 border-white/20 hover:border-white/40'
                                    }`}
                                >
                                    {(light.radius ?? 0) > 0.001 ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            {(light.radius ?? 0) > 0.001 && (
                                <>
                                <Slider
                                    label="Sphere Radius"
                                    value={light.radius ?? 0.1}
                                    min={0.001} max={1.0} step={0.001}
                                    onChange={(v) => updateLight({ index, params: { radius: v } })}
                                    trackId={`${prefix}_radius`}
                                />
                                <Slider
                                    label="Edge Softness"
                                    value={light.softness ?? 0.0}
                                    min={0} max={2.0} step={0.01}
                                    onChange={(v) => updateLight({ index, params: { softness: v } })}
                                    trackId={`${prefix}_softness`}
                                />
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                    {/* Color/Temperature Toggle - Color first */}
                    <div className="flex items-center gap-1 mb-2">
                        <button
                            onClick={() => {
                                setUseTempMode(false);
                                updateLight({ index, params: { useTemperature: false } });
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                !useTempMode 
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                    : 'bg-white/5 text-gray-400 border-white/20 hover:border-white/40'
                            }`}
                        >
                            COLOR
                        </button>
                        <button
                            onClick={() => {
                                const newMode = !useTempMode;
                                setUseTempMode(newMode);
                                if (newMode) {
                                    // Switching to temperature mode - update color from current temp
                                    const newColor = kelvinToHex(tempKelvin);
                                    updateLight({ index, params: { color: newColor, useTemperature: true, temperature: tempKelvin } });
                                } else {
                                    updateLight({ index, params: { useTemperature: false } });
                                }
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                useTempMode 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                                    : 'bg-white/5 text-gray-400 border-white/20 hover:border-white/40'
                            }`}
                        >
                            TEMPERATURE
                        </button>
                    </div>
                    
                    {useTempMode ? (
                        /* Temperature Slider */
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-gray-400 font-medium">Temperature (K)</label>
                                <span className="text-[10px] text-gray-300 font-mono">{tempKelvin}</span>
                            </div>
                            <input
                                type="range"
                                min={1000}
                                max={10000}
                                step={100}
                                value={tempKelvin}
                                onChange={(e) => {
                                    const kelvin = parseInt(e.target.value);
                                    setTempKelvin(kelvin);
                                    const newColor = kelvinToHex(kelvin);
                                    updateLight({ index, params: { temperature: kelvin, color: newColor } });
                                }}
                                className="w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-200 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: 'linear-gradient(to right, #ff6b35, #ffcc66, #ffffff, #cce5ff, #66b3ff)'
                                }}
                            />
                        </div>
                    ) : (
                        /* Color Picker */
                        <EmbeddedColorPicker 
                            color={light.color} 
                            onColorChange={(c) => updateLight({ index, params: { color: c } })}
                        />
                    )}
                    
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
        </Popover>
    );
};
