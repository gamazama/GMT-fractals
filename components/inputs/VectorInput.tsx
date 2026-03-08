/**
 * VectorInput - Unified Vector2/Vector3 input component
 * 
 * This component composes ScalarInputs to provide a multi-axis input
 * with support for:
 * - Dual axis pads (2D manipulation)
 * - Rotation mode with π units
 * - Per-axis configuration
 * - Animation track support
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VectorInputProps, AXIS_CONFIG } from './types';
import { ScalarInput } from './ScalarInput';
import { piMapping } from './primitives';

// Placeholder for DualAxisPad - will be imported from vector-input
// For now, we'll create a simple version or leave it for later integration
interface DualAxisPadProps {
    primaryAxis: 'x' | 'y' | 'z';
    secondaryAxis: 'x' | 'y' | 'z';
    primaryValue: number;
    secondaryValue: number;
    min?: number;
    max?: number;
    step?: number;
    onUpdate: (primary: number, secondary: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    disabled?: boolean;
    onHover?: (isHovering: boolean) => void;
}

// Simple DualAxisPad placeholder - will be replaced with actual component
const DualAxisPad: React.FC<DualAxisPadProps> = ({ 
    primaryAxis, 
    secondaryAxis, 
    onUpdate,
    onDragStart,
    onDragEnd,
    disabled,
    onHover
}) => {
    const [isDragging, setIsDragging] = React.useState(false);
    
    return (
        <div 
            className={`w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden transition-all duration-150 ease-out relative bg-white/[0.08] border border-white/5 ${isDragging ? 'bg-white/10 border-white/30' : ''} ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => !isDragging && onHover?.(false)}
            title={`Drag: Horizontal=${primaryAxis.toUpperCase()}, Vertical=${secondaryAxis.toUpperCase()}`}
        >
            <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <div className="w-3 h-3 border border-white/20 rotate-45" />
            </div>
        </div>
    );
};

export const VectorInput: React.FC<VectorInputProps> = ({
    value,
    onChange,
    mode = 'normal',
    modeToggleable = false,
    axes,
    axisConfig,
    showDualAxisPads = true,
    showRotationGizmo = false,
    label,
    disabled = false,
    trackKeys,
    trackLabels,
    interactionMode = 'param',
    headerRight,
    onContextMenu,
    dataHelpId,
}) => {
    // Determine if this is a vec3
    const isVec3 = value.z !== undefined;
    
    // Local state for immediate visual feedback during drag
    const [localValue, setLocalValue] = React.useState(value);
    const [hoveredPad, setHoveredPad] = React.useState<'xy' | 'zy' | null>(null);
    const [currentMode, setCurrentMode] = React.useState(mode);
    
    const isDragging = useRef(false);
    const dragStartSnapshot = useRef<{ x: number; y: number; z?: number } | null>(null);
    
    // Sync local value with prop
    useEffect(() => {
        if (!isDragging.current) {
            setLocalValue(value);
        }
    }, [value.x, value.y, value.z, isVec3]);
    
    // Check if in rotation mode
    const isRotationMode = currentMode === 'rotation';
    
    // Get appropriate mapping for mode
    const getModeMapping = React.useCallback((axis?: 'x' | 'y' | 'z') => {
        if (isRotationMode) {
            return piMapping;
        }
        return axisConfig?.mapping || axes?.x?.mapping || axes?.y?.mapping;
    }, [isRotationMode, axisConfig, axes]);
    
    // Get appropriate bounds for mode
    const getModeBounds = React.useCallback((axis: 'x' | 'y' | 'z') => {
        if (isRotationMode) {
            // Rotation bounds: -2π to +2π
            return { min: -2 * Math.PI, max: 2 * Math.PI };
        }
        
        // Use provided bounds or defaults
        const axisProps = axes?.[axis] || axisConfig;
        return {
            min: axisProps?.min ?? -10000,
            max: axisProps?.max ?? 10000,
            hardMin: axisProps?.hardMin,
            hardMax: axisProps?.hardMax,
        };
    }, [isRotationMode, axes, axisConfig]);
    
    // Handle drag start
    const handleDragStart = React.useCallback(() => {
        isDragging.current = true;
        dragStartSnapshot.current = { ...localValue };
    }, [localValue]);
    
    // Handle drag end
    const handleDragEnd = React.useCallback(() => {
        dragStartSnapshot.current = null;
        isDragging.current = false;
    }, []);
    
    // Update single axis
    const updateAxis = React.useCallback((axis: 'x' | 'y' | 'z', newValue: number) => {
        const next = { ...localValue, [axis]: newValue };
        setLocalValue(next);
        onChange(next);
    }, [localValue, onChange]);
    
    // Update dual axis (from pad)
    const updateDualAxis = React.useCallback((
        primary: 'x' | 'y' | 'z', 
        secondary: 'x' | 'y' | 'z', 
        primaryVal: number, 
        secondaryVal: number
    ) => {
        const base = dragStartSnapshot.current || localValue;
        const next = { ...base, [primary]: primaryVal, [secondary]: secondaryVal };
        setLocalValue(next);
        onChange(next);
    }, [localValue, onChange]);
    
    // Determine which sliders should be highlighted
    const xHighlighted = hoveredPad === 'xy';
    const yHighlighted = hoveredPad === 'xy' || hoveredPad === 'zy';
    const zHighlighted = hoveredPad === 'zy';
    
    // Axis-specific props builder
    const buildAxisProps = (axisIndex: number, axisKey: 'x' | 'y' | 'z') => {
        const config = AXIS_CONFIG[axisIndex];
        const bounds = getModeBounds(axisKey);
        const mapping = getModeMapping(axisKey);
        const axisSpecific = axes?.[axisKey];
        
        return {
            variant: 'compact' as const,
            showTrack: true,
            disabled,
            highlight: axisIndex === 0 ? xHighlighted : axisIndex === 1 ? yHighlighted : zHighlighted,
            mapping,
            min: bounds.min,
            max: bounds.max,
            hardMin: bounds.hardMin,
            hardMax: bounds.hardMax,
            step: isRotationMode ? 0.01 : (axisConfig?.step ?? axisSpecific?.step ?? 0.01),
            ...axisConfig,
            ...axisSpecific,
        };
    };
    
    // Render mode toggle button if needed
    const renderModeToggle = () => {
        if (!modeToggleable) return null;
        
        return (
            <button
                onClick={() => setCurrentMode(prev => prev === 'rotation' ? 'normal' : 'rotation')}
                className={`text-[10px] p-1 rounded transition-colors ${
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
    
    return (
        <div 
            className="mb-px animate-slider-entry"
            data-help-id={dataHelpId}
            onContextMenu={onContextMenu}
        >
            {/* Header */}
            {label && (
                <div className="flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5">
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                        {modeToggleable && renderModeToggle()}
                        {headerRight}
                        <label className={`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {label}
                            {isRotationMode && <span className="text-[8px] text-cyan-400/60">(π)</span>}
                        </label>
                    </div>
                </div>
            )}
            
            {/* Axis row */}
            <div className="relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm" style={{ touchAction: 'none' }}>
                <div className="flex gap-px w-full h-full">
                    {/* X Axis */}
                    <div className="flex-1 flex items-center relative group">
                        <div className={`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${AXIS_CONFIG[0].text}`}>
                            <span className="text-[10px] font-bold">X</span>
                        </div>
                        <div className="flex-1 pl-5">
                            <ScalarInput
                                value={localValue.x}
                                onChange={(v) => updateAxis('x', v)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                {...buildAxisProps(0, 'x')}
                            />
                        </div>
                    </div>
                    
                    {/* XY Dual Axis Pad */}
                    {showDualAxisPads && (
                        <DualAxisPad
                            primaryAxis="x"
                            secondaryAxis="y"
                            primaryValue={localValue.x}
                            secondaryValue={localValue.y}
                            min={axisConfig?.min}
                            max={axisConfig?.max}
                            step={axisConfig?.step}
                            onUpdate={(px, sy) => updateDualAxis('x', 'y', px, sy)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            disabled={disabled}
                            onHover={(isHovering) => setHoveredPad(isHovering ? 'xy' : null)}
                        />
                    )}
                    
                    {/* Y Axis */}
                    <div className="flex-1 flex items-center relative group">
                        <div className={`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${AXIS_CONFIG[1].text}`}>
                            <span className="text-[10px] font-bold">Y</span>
                        </div>
                        <div className="flex-1 pl-5">
                            <ScalarInput
                                value={localValue.y}
                                onChange={(v) => updateAxis('y', v)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                {...buildAxisProps(1, 'y')}
                            />
                        </div>
                    </div>
                    
                    {/* ZY Dual Axis Pad - only for vec3 */}
                    {isVec3 && showDualAxisPads && (
                        <DualAxisPad
                            primaryAxis="z"
                            secondaryAxis="y"
                            primaryValue={localValue.z ?? 0}
                            secondaryValue={localValue.y}
                            min={axisConfig?.min}
                            max={axisConfig?.max}
                            step={axisConfig?.step}
                            onUpdate={(pz, sy) => updateDualAxis('z', 'y', pz, sy)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            disabled={disabled}
                            onHover={(isHovering) => setHoveredPad(isHovering ? 'zy' : null)}
                        />
                    )}
                    
                    {/* Z Axis - only for vec3 */}
                    {isVec3 && (
                        <div className="flex-1 flex items-center relative group">
                            <div className={`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${AXIS_CONFIG[2].text}`}>
                                <span className="text-[10px] font-bold">Z</span>
                            </div>
                            <div className="flex-1 pl-5">
                                <ScalarInput
                                    value={localValue.z ?? 0}
                                    onChange={(v) => updateAxis('z', v)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    {...buildAxisProps(2, 'z')}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
