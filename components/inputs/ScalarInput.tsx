/**
 * ScalarInput - Full-featured single value input
 * 
 * This is the unified component that powers both Slider and VectorAxisCell.
 * It includes:
 * - Header with label and optional headerRight slot
 * - DraggableNumber display
 * - Optional range track visualization
 * - Live value indicator
 * - Default value reset marker
 */

import React from 'react';
import { ScalarInputProps } from './types';
import { DraggableNumber } from './primitives';

export const ScalarInput: React.FC<ScalarInputProps> = ({
    // Value props
    value,
    onChange,
    onDragStart,
    onDragEnd,
    
    // Bounds and step
    step = 0.01,
    min,
    max,
    hardMin,
    hardMax,
    
    // Mapping and format
    mapping,
    format,
    overrideText,
    mapTextInput,
    
    // Visual
    label,
    labelSuffix,
    headerRight,
    showTrack = true,
    trackPosition = 'below',
    trackHeight = 20,
    variant = 'full',
    className = '',
    
    // Default value
    defaultValue,
    onReset,
    
    // Live value
    liveValue,
    showLiveIndicator = true,
    
    // Interaction
    onContextMenu,
    dataHelpId,
    disabled = false,
    highlight = false,
}) => {
    // Calculate track percentage
    const hasBounds = min !== undefined && max !== undefined && min !== max;
    
    const valuePct = React.useMemo(() => {
        if (!hasBounds) return 0;
        const mappedValue = mapping ? mapping.toDisplay(value) : value;
        const mappedMin = mapping ? mapping.toDisplay(min) : min;
        const mappedMax = mapping ? mapping.toDisplay(max) : max;
        return Math.max(0, Math.min(100, ((mappedValue - mappedMin) / (mappedMax - mappedMin)) * 100));
    }, [value, min, max, mapping, hasBounds]);
    
    const livePct = React.useMemo(() => {
        if (!hasBounds || liveValue === undefined) return 0;
        const mappedValue = mapping ? mapping.toDisplay(liveValue) : liveValue;
        const mappedMin = mapping ? mapping.toDisplay(min) : min;
        const mappedMax = mapping ? mapping.toDisplay(max) : max;
        return Math.max(0, Math.min(100, ((mappedValue - mappedMin) / (mappedMax - mappedMin)) * 100));
    }, [liveValue, min, max, mapping, hasBounds]);
    
    const defaultPct = React.useMemo(() => {
        if (!hasBounds || defaultValue === undefined) return null;
        const mappedValue = mapping ? mapping.toDisplay(defaultValue) : defaultValue;
        const mappedMin = mapping ? mapping.toDisplay(min) : min;
        const mappedMax = mapping ? mapping.toDisplay(max) : max;
        return ((mappedValue - mappedMin) / (mappedMax - mappedMin)) * 100;
    }, [defaultValue, min, max, mapping, hasBounds]);
    
    // Handle track click
    const handleTrackChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const raw = parseFloat(e.target.value);
        const output = mapping ? mapping.fromDisplay(raw) : raw;
        onChange(output);
    }, [disabled, mapping, onChange]);
    
    // Handle reset
    const handleReset = React.useCallback(() => {
        if (defaultValue !== undefined && !disabled) {
            onDragStart?.();
            onChange(defaultValue);
            onDragEnd?.();
            onReset?.();
        }
    }, [defaultValue, disabled, onChange, onDragStart, onDragEnd, onReset]);
    
    // Determine if active
    const isActive = highlight || liveValue !== undefined;
    
    // Variant-based styling
    const isCompact = variant === 'compact';
    const isMinimal = variant === 'minimal';
    
    if (isMinimal) {
        // Minimal variant - just the number
        return (
            <div className={className}>
                <DraggableNumber
                    value={value}
                    onChange={onChange}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    step={step}
                    hardMin={hardMin}
                    hardMax={hardMax}
                    mapping={mapping}
                    format={overrideText ? () => overrideText : format}
                    mapTextInput={mapTextInput}
                    defaultValue={defaultValue}
                    disabled={disabled}
                    highlight={isActive}
                />
            </div>
        );
    }
    
    if (isCompact) {
        // Compact variant - like VectorAxisCell (no header, inline track)
        return (
            <div 
                className={`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
                onContextMenu={onContextMenu}
                data-help-id={dataHelpId}
            >
                {/* Background with pattern */}
                <div 
                    className="absolute inset-0 bg-white/[0.12]"
                    style={!disabled ? {
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)'
                    } : {}}
                />
                
                {/* Fill bar */}
                {showTrack && hasBounds && (
                    <div 
                        className={`absolute top-0 bottom-0 left-0 transition-[width] duration-75 ease-out pointer-events-none ${disabled ? 'bg-gray-500/20' : isActive ? 'bg-cyan-500/30' : 'bg-cyan-500/20'}`}
                        style={{ width: `${valuePct}%` }} 
                    />
                )}
                
                {/* Live value indicator */}
                {showLiveIndicator && liveValue !== undefined && !disabled && hasBounds && (
                    <div 
                        className="absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0"
                        style={{ left: `calc(${livePct}% - 0.75px)` }}
                    />
                )}
                
                {/* Draggable number */}
                <div className="absolute inset-0">
                    <DraggableNumber
                        value={value}
                        onChange={onChange}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        step={step}
                        hardMin={hardMin}
                        hardMax={hardMax}
                        mapping={mapping}
                        format={overrideText ? () => overrideText : format}
                        mapTextInput={mapTextInput}
                        defaultValue={defaultValue}
                        disabled={disabled}
                        highlight={isActive}
                    />
                </div>
                
                {/* Active overlay */}
                {isActive && !disabled && (
                    <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none" />
                )}
            </div>
        );
    }
    
    // Full variant - like Slider (with header and track below)
    const headerHeight = "h-9 md:h-[26px]";
    
    return (
        <div 
            className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
            data-help-id={dataHelpId}
            onContextMenu={onContextMenu}
        >
            {/* Header */}
            {label && (
                <div className={`flex items-stretch bg-white/[0.12] rounded-t-sm ${headerHeight} overflow-hidden border-b border-white/5`}>
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                        {headerRight}
                        <label className={`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {label}
                            {labelSuffix}
                            {liveValue !== undefined && !disabled && (
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"></span>
                            )}
                        </label>
                    </div>
                    
                    {/* Value display */}
                    <div 
                        className="w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none"
                        style={!disabled ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)' } : {}}
                    >
                        <DraggableNumber
                            value={value}
                            onChange={onChange}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            step={step}
                            hardMin={hardMin}
                            hardMax={hardMax}
                            mapping={mapping}
                            format={overrideText ? () => overrideText : format}
                            mapTextInput={mapTextInput}
                            defaultValue={defaultValue}
                            disabled={disabled}
                            highlight={isActive}
                        />
                    </div>
                </div>
            )}
            
            {/* Track */}
            {showTrack && hasBounds && (
                <div 
                    className="relative flex items-center touch-none overflow-hidden" 
                    style={{ touchAction: 'none', height: trackHeight }}
                >
                    {/* Range input */}
                    <input
                        type="range"
                        min={mapping ? mapping.toDisplay(min!) : min}
                        max={mapping ? mapping.toDisplay(max!) : max}
                        step={step}
                        value={mapping ? mapping.toDisplay(value) : value}
                        onChange={handleTrackChange}
                        disabled={disabled}
                        onPointerDown={(e) => {
                            if (disabled) return;
                            e.stopPropagation();
                            onDragStart?.();
                        }}
                        onPointerUp={() => {
                            if (!disabled) onDragEnd?.();
                        }}
                        className={`precision-slider w-full h-full appearance-none cursor-pointer focus:outline-none z-10 ${isActive && !disabled ? 'accent-cyan-500' : 'accent-gray-400'}`}
                        style={{ background: 'transparent', touchAction: 'none' }}
                        tabIndex={-1}
                    />
                    
                    {/* Background track */}
                    <div className="absolute inset-0 bg-white/10 pointer-events-none">
                        <div className={`absolute top-0 bottom-0 left-0 transition-[width] duration-75 ease-out ${disabled ? 'bg-gray-500/20' : 'bg-cyan-500/30'}`} style={{ width: `${valuePct}%` }} />
                        
                        {/* Live value indicator */}
                        {showLiveIndicator && liveValue !== undefined && !disabled && (
                            <div className="absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0" style={{ left: `calc(${livePct}% - 0.75px)` }} />
                        )}
                    </div>
                    
                    {/* Default value marker */}
                    {defaultPct !== null && (
                        <>
                            <div 
                                className="absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2"
                                style={{ left: `${defaultPct}%` }}
                            />
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleReset();
                                }}
                                className="absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10"
                                title={`Reset to ${defaultValue}`}
                                aria-label="Reset to default"
                                tabIndex={-1}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
