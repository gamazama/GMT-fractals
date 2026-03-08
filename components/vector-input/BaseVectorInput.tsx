import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VectorAxisCell } from './VectorAxisCell';
import { DualAxisPad } from './DualAxisPad';
import { RotationHeliotrope } from './RotationHeliotrope';
import { BaseVectorInputProps } from './types';
import { piMapping, degreesMapping, getMapping, ValueMapping } from '../inputs/primitives/FormatUtils';
import { AXIS_CONFIG } from '../inputs/types';
import { useFractalStore } from '../../store/fractalStore';
import { ContextMenuItem } from '../../types/help';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// --- Direction mode helpers ---
// Converts a vec3 to (azimuth, pitch) in radians.
// Convention: az=0,pitch=0 → (0,0,1); az=π/2,pitch=0 → (1,0,0); pitch=π/2 → (0,1,0)
const vec3ToDir = (v: THREE.Vector3): { azimuth: number; pitch: number } => {
    const len = v.length();
    if (len < 1e-9) return { azimuth: 0, pitch: 0 };
    const ny = Math.max(-1, Math.min(1, v.y / len));
    return {
        azimuth: Math.atan2(v.x / len, v.z / len),
        pitch: Math.asin(ny),
    };
};

const dirToVec3 = (azimuth: number, pitch: number): THREE.Vector3 => {
    const cosPit = Math.cos(pitch);
    return new THREE.Vector3(
        cosPit * Math.sin(azimuth),
        Math.sin(pitch),
        cosPit * Math.cos(azimuth),
    );
};

export const BaseVectorInput: React.FC<BaseVectorInputProps> = ({ 
    label, 
    value, 
    onChange, 
    min = -10000, 
    max = 10000, 
    step = 0.01, 
    disabled = false, 
    convertRadToDeg = false,
    // New props for unified system
    mode = 'normal',
    modeToggleable = false,
    showLiveIndicator = false,
    liveValue,
    defaultValue,
    hardMin,
    hardMax,
    // Axis-specific overrides
    axisMin,
    axisMax,
    axisStep,
    onDragStart, 
    onDragEnd, 
    headerRight,
    showDualAxisPads = true,
    // Link feature for scale controls
    linkable = false,
}) => {
    // Local state for immediate visual feedback during drag
    const [localValue, setLocalValue] = useState(value.clone());
    const [hoveredPad, setHoveredPad] = useState<'xy' | 'zy' | null>(null);
    const [currentMode, setCurrentMode] = useState(mode);
    const [rotationDisplayMode, setRotationDisplayMode] = useState<'degrees' | 'radians'>('degrees');
    const [isLinked, setIsLinked] = useState(linkable); // Linked by default when linkable is true
    const isDragging = useRef(false);
    const dragStartSnapshot = useRef<THREE.Vector2 | THREE.Vector3 | null>(null);

    // Sync currentMode when the mode prop changes (e.g., formula switch reuses same key)
    useEffect(() => {
        setCurrentMode(mode);
    }, [mode]);
    
    // Get context menu opener from store
    const openContextMenu = useFractalStore(s => s.openContextMenu);

    // Determine if this is a vec2 or vec3
    const isVec3 = 'z' in value;

    // Determine if in rotation mode
    const isRotationMode = currentMode === 'rotation';

    // Determine if in toggle mode (boolean on/off per axis)
    const isToggleMode = currentMode === 'toggle';

    // Determine if in mixed mode (toggle X + slider Y)
    const isMixedMode = currentMode === 'mixed';

    // Determine if in direction mode (vec3 displayed as azimuth/pitch)
    const isDirectionMode = currentMode === 'direction' && isVec3;
    const dirAngles = isDirectionMode
        ? vec3ToDir(localValue as THREE.Vector3)
        : { azimuth: 0, pitch: 0 };

    const updateDirection = (azimuth: number, pitch: number) => {
        const pitchClamped = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        const next = dirToVec3(azimuth, pitchClamped);
        setLocalValue(next);
        onChange(next);
    };

    // Sync local value with prop (only when not dragging)
    useEffect(() => {
        if (isDragging.current) return;
        
        // Only update if values are significantly different (prevents jitter)
        const threshold = 0.0001;
        const xDiff = Math.abs((value as any).x - localValue.x);
        const yDiff = Math.abs((value as any).y - localValue.y);
        const zDiff = isVec3 ? Math.abs((value as THREE.Vector3).z - (localValue as THREE.Vector3).z) : 0;
        
        if (xDiff > threshold || yDiff > threshold || zDiff > threshold) {
            setLocalValue(value.clone());
        }
    }, [value, isVec3]);

    const handleStart = () => {
        isDragging.current = true;
        dragStartSnapshot.current = localValue.clone();
        if (onDragStart) onDragStart();
    };

    const handleEnd = () => {
        dragStartSnapshot.current = null;
        isDragging.current = false;
        if (onDragEnd) onDragEnd();
    };

    // Get appropriate mapping for the current mode and axis
    const getAxisMapping = (axis: 'x' | 'y' | 'z'): ValueMapping | undefined => {
        if (isRotationMode) {
            // Use degrees by default, allow toggle to radians (π units)
            return rotationDisplayMode === 'degrees' ? degreesMapping : piMapping;
        }
        // Use convertRadToDeg as fallback for backward compatibility
        if (convertRadToDeg) {
            return {
                toDisplay: (v: number) => v * R2D,
                fromDisplay: (v: number) => v * D2R,
                format: (v: number) => `${(v * R2D).toFixed(1)}°`,
                parseInput: (s: string) => {
                    const num = parseFloat(s);
                    return isNaN(num) ? null : num * D2R;
                }
            };
        }
        return undefined;
    };

    // Get appropriate bounds for the current mode
    const getAxisBounds = (axis: 'x' | 'y' | 'z') => {
        if (isRotationMode) {
            // Use larger step (60 degrees) for drag feel, but text edit has full precision
            // The step only affects dragging via useDragValue, not text input
            const step = rotationDisplayMode === 'degrees' ? (60 * Math.PI / 180) : 0.05;
            return {
                min: -2 * Math.PI,
                max: 2 * Math.PI,
                step,
                hardMin: undefined,
                hardMax: undefined,
            };
        }

        // Use axis-specific overrides or defaults
        const axisMins = axisMin || { x: min, y: min, z: min };
        const axisMaxs = axisMax || { x: max, y: max, z: max };
        const axisSteps = axisStep || { x: step, y: step, z: step };

        return {
            min: axisMins[axis],
            max: axisMaxs[axis],
            step: axisSteps[axis],
            hardMin,
            hardMax,
        };
    };

    const updateAxis = (axis: 'x'|'y'|'z', scalar: number) => {
        const base = dragStartSnapshot.current || localValue;
        const next = base.clone();
        
        if (isLinked && !isRotationMode) {
            // In linked mode, all axes change by the same delta
            const currentVal = (base as any)[axis];
            const delta = scalar - currentVal;
            (next as any).x = (base as any).x + delta;
            (next as any).y = (base as any).y + delta;
            if (isVec3) {
                (next as any).z = (base as any).z + delta;
            }
        } else {
            (next as any)[axis] = scalar;
        }
        
        setLocalValue(next); 
        onChange(next);
    };

    const updateDualAxis = (primary: 'x'|'y'|'z', secondary: 'x'|'y'|'z', primaryVal: number, secondaryVal: number) => {
        const base = dragStartSnapshot.current || localValue;
        const next = base.clone();
        (next as any)[primary] = primaryVal;
        (next as any)[secondary] = secondaryVal;
        
        setLocalValue(next);
        onChange(next);
    };

    // Determine which sliders should be highlighted
    const xHighlighted = hoveredPad === 'xy';
    const yHighlighted = hoveredPad === 'xy' || hoveredPad === 'zy';
    const zHighlighted = hoveredPad === 'zy';

    // Get live value per axis if provided
    const getLiveValue = (axis: 'x' | 'y' | 'z'): number | undefined => {
        if (!liveValue) return undefined;
        return (liveValue as any)[axis];
    };

    // Get default value per axis if provided
    const getDefaultValue = (axis: 'x' | 'y' | 'z'): number | undefined => {
        if (!defaultValue) return undefined;
        return (defaultValue as any)[axis];
    };

    const vec3Value = localValue as THREE.Vector3;
    const vec2Value = localValue as THREE.Vector2;

    // Render mode toggle button if needed
    const renderModeToggle = () => {
        if (!modeToggleable) return null;
        
        return (
            <button
                onClick={() => setCurrentMode(prev => prev === 'rotation' ? 'normal' : 'rotation')}
                className={`text-[10px] p-1 rounded transition-colors mr-2 ${
                    currentMode === 'rotation' 
                        ? 'text-cyan-400 bg-cyan-500/20' 
                        : 'text-gray-500 hover:text-gray-300'
                }`}
                title={currentMode === 'rotation' ? 'Rotation mode (π units)' : 'Normal mode'}
            >
                ⟳
            </button>
        );
    };

    // Render link toggle button if enabled (only in normal/translation mode)
    const renderLinkToggle = () => {
        if (!linkable || isRotationMode) return null;
        
        return (
            <button
                onClick={() => setIsLinked(prev => !prev)}
                className={`p-1 rounded transition-colors mr-2 ${
                    isLinked 
                        ? 'text-cyan-400 bg-cyan-500/20' 
                        : 'text-gray-600 hover:text-gray-400'
                }`}
                title={isLinked ? 'Axes linked (uniform)' : 'Link axes'}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
            </button>
        );
    };

    // Context menu handler - uses GMT native menu
    const handleContextMenu = (e: React.MouseEvent) => {
        const items: ContextMenuItem[] = [];

        // Rotation display options (available in rotation and axes modes)
        if (isRotationMode) {
            items.push(
                { label: 'Rotation Units', action: () => {}, isHeader: true },
                {
                    label: 'Degrees (°)',
                    checked: rotationDisplayMode === 'degrees',
                    action: () => setRotationDisplayMode('degrees')
                },
                {
                    label: 'Radians (π)',
                    checked: rotationDisplayMode === 'radians',
                    action: () => setRotationDisplayMode('radians')
                },
            );
        }

        // Mode switching for vec3 rotation-type controls
        if (isVec3 && (mode === 'rotation' || mode === 'axes')) {
            // Add spacing between sections
            items.push(
                { label: 'Display Mode', action: () => {}, isHeader: true },
                {
                    label: 'Azimuth / Pitch (A/P)',
                    checked: currentMode === 'rotation',
                    action: () => setCurrentMode('rotation')
                },
                {
                    label: 'Per-Axis (X/Y/Z)',
                    checked: currentMode === 'axes' || currentMode === 'normal',
                    action: () => setCurrentMode('normal')
                },
            );
        }

        if (items.length === 0) return; // Allow default menu

        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, items, ['ui.vector']);
    };

    return (
        <div className="mb-px animate-slider-entry">
            {/* Header row with label and keyframe button */}
            {label && (
                <div className="flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5">
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                        {modeToggleable && renderModeToggle()}
                        {headerRight}
                        <label className={`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {label}
                        </label>
                    </div>
                    {/* Right side: link toggle */}
                    {linkable && !isRotationMode && (
                        <div className="flex items-center px-1 border-l border-white/5">
                            {renderLinkToggle()}
                        </div>
                    )}
                </div>
            )}
            
            {/* Slider row - matches Slider.tsx bottom section styling */}
            <div
                className="relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm"
                style={{ touchAction: 'none' }}
                onContextMenu={handleContextMenu}
                data-help-id="ui.vector"
            >
                <div className="flex gap-px w-full h-full">
                    {isToggleMode ? (
                        <>
                            {/* Toggle mode: clickable on/off buttons per axis */}
                            {(['x', 'y', 'z'] as const).slice(0, isVec3 ? 3 : 2).map((axis, i) => {
                                const val = (localValue as any)[axis];
                                const isOn = val > 0.5;
                                const colors = [
                                    { on: 'bg-red-500/30 text-red-300 border-red-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' },
                                    { on: 'bg-green-500/30 text-green-300 border-green-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' },
                                    { on: 'bg-blue-500/30 text-blue-300 border-blue-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' },
                                ];
                                return (
                                    <button
                                        key={axis}
                                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold tracking-wider transition-all border ${
                                            isOn ? colors[i].on : colors[i].off
                                        } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:brightness-125'}`}
                                        onClick={() => updateAxis(axis, isOn ? 0 : 1)}
                                        disabled={disabled}
                                    >
                                        <span className="uppercase">{axis}</span>
                                        <span className={`text-[8px] ${isOn ? 'opacity-80' : 'opacity-40'}`}>{isOn ? 'ON' : 'OFF'}</span>
                                    </button>
                                );
                            })}
                        </>
                    ) : isMixedMode ? (
                        <>
                            {/* Mixed mode: toggle button for X, normal slider for Y */}
                            {(() => {
                                const isOn = localValue.x > 0.5;
                                return (
                                    <button
                                        className={`w-14 flex-shrink-0 flex items-center justify-center gap-1 text-[10px] font-bold tracking-wider transition-all border ${
                                            isOn ? 'bg-red-500/30 text-red-300 border-red-500/40' : 'bg-white/[0.04] text-gray-600 border-white/5'
                                        } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:brightness-125'}`}
                                        onClick={() => updateAxis('x', isOn ? 0 : 1)}
                                        disabled={disabled}
                                    >
                                        <span className={`text-[8px] ${isOn ? 'opacity-80' : 'opacity-40'}`}>{isOn ? 'ON' : 'OFF'}</span>
                                    </button>
                                );
                            })()}
                            <VectorAxisCell
                                axisIndex={1}
                                value={localValue.y}
                                {...getAxisBounds('y')}
                                onUpdate={(v) => updateAxis('y', v)}
                                onDragStart={handleStart}
                                onDragEnd={handleEnd}
                                disabled={disabled || localValue.x < 0.5}
                                mapping={getAxisMapping('y')}
                                liveValue={showLiveIndicator ? getLiveValue('y') : undefined}
                                defaultValue={getDefaultValue('y')}
                            />
                        </>
                    ) : isDirectionMode ? (
                        <>
                            {/* Heliotrope: drag to rotate direction */}
                            <div className="flex items-center justify-center px-1 flex-shrink-0">
                                <RotationHeliotrope
                                    azimuth={dirAngles.azimuth}
                                    pitch={dirAngles.pitch}
                                    onChange={(az, pit) => {
                                        updateDirection(az, pit);
                                    }}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    size={56}
                                />
                            </div>

                            {/* Azimuth cell */}
                            <VectorAxisCell
                                axisIndex={0}
                                value={dirAngles.azimuth}
                                min={-Math.PI}
                                max={Math.PI}
                                step={D2R}
                                onUpdate={(az) => updateDirection(az, dirAngles.pitch)}
                                onDragStart={handleStart}
                                onDragEnd={handleEnd}
                                disabled={disabled}
                                mapping={degreesMapping}
                                mapTextInput={true}
                                customLabel="Az"
                            />

                            {/* DualAxisPad: horizontal = azimuth, vertical = pitch */}
                            <DualAxisPad
                                primaryAxis="x"
                                secondaryAxis="y"
                                primaryIndex={0}
                                secondaryIndex={1}
                                primaryValue={dirAngles.azimuth}
                                secondaryValue={dirAngles.pitch}
                                min={-Math.PI}
                                max={Math.PI}
                                step={D2R}
                                onUpdate={(az, pit) => updateDirection(az, pit)}
                                onDragStart={handleStart}
                                onDragEnd={handleEnd}
                                disabled={disabled}
                                onHover={(isHovering) => setHoveredPad(isHovering ? 'xy' : null)}
                            />

                            {/* Pitch cell */}
                            <VectorAxisCell
                                axisIndex={1}
                                value={dirAngles.pitch}
                                min={-Math.PI / 2}
                                max={Math.PI / 2}
                                step={D2R}
                                onUpdate={(pit) => updateDirection(dirAngles.azimuth, pit)}
                                onDragStart={handleStart}
                                onDragEnd={handleEnd}
                                disabled={disabled}
                                mapping={degreesMapping}
                                mapTextInput={true}
                                customLabel="Pt"
                            />
                        </>
                    ) : isRotationMode ? (
                        <>
                            {/* Z Axis (Angle) - FIRST in rotation mode */}
                            {isVec3 && (
                                <VectorAxisCell
                                    axisIndex={2}
                                    value={vec3Value.z}
                                    {...getAxisBounds('z')}
                                    onUpdate={(v) => updateAxis('z', v)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    highlight={zHighlighted}
                                    mapping={getAxisMapping('z')}
                                    mapTextInput={true}
                                    liveValue={showLiveIndicator ? getLiveValue('z') : undefined}
                                    defaultValue={getDefaultValue('z')}
                                    customLabel="∠"
                                />
                            )}
                            
                            {/* Rotation Heliotrope - direction visualizer */}
                            <div className="flex items-center justify-center px-1">
                                <RotationHeliotrope
                                    azimuth={localValue.x}
                                    pitch={localValue.y}
                                    onChange={(newAz, newPitch) => {
                                        const next = localValue.clone();
                                        (next as any).x = newAz;
                                        (next as any).y = newPitch;
                                        setLocalValue(next);
                                        onChange(next);
                                    }}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    size={56}
                                />
                            </div>
                            
                            {/* X Axis (Azimuth) */}
                            <div className="contents">
                                <VectorAxisCell
                                    axisIndex={0}
                                    value={localValue.x}
                                    {...getAxisBounds('x')}
                                    onUpdate={(v) => updateAxis('x', v)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    highlight={xHighlighted}
                                    mapping={getAxisMapping('x')}
                                    mapTextInput={true}
                                    liveValue={showLiveIndicator ? getLiveValue('x') : undefined}
                                    defaultValue={getDefaultValue('x')}
                                    customLabel="A"
                                />
                            </div>
                            
                            {/* Y Axis (Pitch) */}
                            <VectorAxisCell
                                axisIndex={1}
                                value={localValue.y}
                                {...getAxisBounds('y')}
                                onUpdate={(v) => updateAxis('y', v)}
                                onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                disabled={disabled}
                                highlight={yHighlighted}
                                mapping={getAxisMapping('y')}
                                mapTextInput={true}
                                liveValue={showLiveIndicator ? getLiveValue('y') : undefined}
                                defaultValue={getDefaultValue('y')}
                                customLabel="P"
                            />
                        </>
                    ) : (
                        <>
                            {/* Normal/Translation mode - original order */}
                            {/* X Axis */}
                            <div className="contents">
                                <VectorAxisCell
                                    axisIndex={0}
                                    value={localValue.x}
                                    {...getAxisBounds('x')}
                                    onUpdate={(v) => updateAxis('x', v)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    highlight={xHighlighted}
                                    mapping={getAxisMapping('x')}
                                    liveValue={showLiveIndicator ? getLiveValue('x') : undefined}
                                    defaultValue={getDefaultValue('x')}
                                />
                            </div>
                            
                            {/* XY Dual Axis Pad */}
                            {showDualAxisPads && (
                                <DualAxisPad
                                    primaryAxis="x"
                                    secondaryAxis="y"
                                    primaryIndex={0}
                                    secondaryIndex={1}
                                    primaryValue={localValue.x}
                                    secondaryValue={localValue.y}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onUpdate={(px, sy) => updateDualAxis('x', 'y', px, sy)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    onHover={(isHovering) => setHoveredPad(isHovering ? 'xy' : null)}
                                />
                            )}
                            
                            {/* Y Axis */}
                            <VectorAxisCell
                                axisIndex={1}
                                value={localValue.y}
                                {...getAxisBounds('y')}
                                onUpdate={(v) => updateAxis('y', v)}
                                onDragStart={handleStart}
                                onDragEnd={handleEnd}
                                disabled={disabled}
                                highlight={yHighlighted}
                                mapping={getAxisMapping('y')}
                                liveValue={showLiveIndicator ? getLiveValue('y') : undefined}
                                defaultValue={getDefaultValue('y')}
                            />
                            
                            {/* ZY Dual Axis Pad - only for vec3 */}
                            {isVec3 && showDualAxisPads && (
                                <DualAxisPad
                                    primaryAxis="z"
                                    secondaryAxis="y"
                                    primaryIndex={2}
                                    secondaryIndex={1}
                                    primaryValue={vec3Value.z}
                                    secondaryValue={vec3Value.y}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onUpdate={(pz, sy) => updateDualAxis('z', 'y', pz, sy)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    onHover={(isHovering) => setHoveredPad(isHovering ? 'zy' : null)}
                                />
                            )}
                            
                            {/* Z Axis - only for vec3 */}
                            {isVec3 && (
                                <VectorAxisCell
                                    axisIndex={2}
                                    value={vec3Value.z}
                                    {...getAxisBounds('z')}
                                    onUpdate={(v) => updateAxis('z', v)}
                                    onDragStart={handleStart}
                                    onDragEnd={handleEnd}
                                    disabled={disabled}
                                    highlight={zHighlighted}
                                    mapping={getAxisMapping('z')}
                                    liveValue={showLiveIndicator ? getLiveValue('z') : undefined}
                                    defaultValue={getDefaultValue('z')}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
