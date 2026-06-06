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
import { computePercentage } from './primitives/FormatUtils';
import { usePrecisionTrackDrag } from './usePrecisionTrackDrag';

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

    trackBackground,

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
    // Refs for direct DOM updates during drag (bypasses React render cycle)
    const fillBarRef = React.useRef<HTMLDivElement>(null);
    const fullTrackFillRef = React.useRef<HTMLDivElement>(null);
    const trackContainerRef = React.useRef<HTMLDivElement>(null);

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
    
    // Compute fill percentage from a raw value
    const computePct = React.useCallback((v: number): number => {
        if (!hasBounds) return 0;
        return computePercentage(v, min, max, mapping);
    }, [hasBounds, min, max, mapping]);

    // Direct DOM update for fill bars and thumb during drag — bypasses React render cycle
    const handleImmediateChange = React.useCallback((v: number) => {
        const pct = computePct(v);
        const w = `${pct}%`;
        if (fillBarRef.current) fillBarRef.current.style.width = w;
        if (fullTrackFillRef.current) fullTrackFillRef.current.style.width = w;
        // Update thumb position via the track container's first thumb child
        const thumb = trackContainerRef.current?.querySelector<HTMLDivElement>('[data-role="thumb"]');
        if (thumb) thumb.style.left = `calc(${pct}% - 8px)`;
    }, [computePct]);

    // Track pointer handlers — the shared GMT precision-drag (click-to-position,
    // delta-drag, Shift ×10 / Alt ×0.1). Extracted to usePrecisionTrackDrag so the
    // colour picker's slider feels identical.
    const track = usePrecisionTrackDrag({
        min,
        max,
        step,
        mapping,
        hardMin,
        hardMax,
        disabled,
        onChange,
        onDragStart,
        onDragEnd,
        onImmediate: handleImmediateChange,
    });
    
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
        // Minimal variant - just the number (no fill bar, but still uses immediate display)
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
                    onImmediateChange={handleImmediateChange}
                />
            </div>
        );
    }
    
    if (isCompact) {
        // Compact variant - like VectorAxisCell (no header, inline track)
        return (
            <div 
                className={`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`}
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
                        ref={fillBarRef}
                        data-role="fill"
                        className={`absolute top-0 bottom-0 left-0 pointer-events-none ${disabled ? 'bg-gray-500/20' : isActive ? 'bg-cyan-500/30' : 'bg-cyan-500/20'}`}
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
                        onImmediateChange={handleImmediateChange}
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
            className={`mb-px animate-slider-entry ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`}
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
                            onImmediateChange={handleImmediateChange}
                        />
                    </div>
                </div>
            )}

            {/* Track */}
            {showTrack && hasBounds && (
                <div
                    ref={trackContainerRef}
                    className={`relative flex items-center touch-none overflow-hidden ${disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'}`}
                    style={{ touchAction: 'none', height: trackHeight }}
                    onPointerDown={track.onPointerDown}
                    onPointerMove={track.onPointerMove}
                    onPointerUp={track.onPointerUp}
                    onPointerCancel={track.onPointerUp}
                    onLostPointerCapture={track.onPointerUp}
                >
                    {/* Background track */}
                    <div className="absolute inset-0 bg-white/10">
                        {/* Optional meaningful track background (hue/lightness/chroma ramp). */}
                        {trackBackground && <div className="absolute inset-0" style={{ background: trackBackground }} />}
                        {/* Progress fill — suppressed when a track background carries the meaning,
                            so a colour ramp reads cleanly (the thumb still marks the value). The ref
                            stays mounted either way so drag-time DOM updates remain harmless. */}
                        <div
                            ref={fullTrackFillRef}
                            className={`absolute top-0 bottom-0 left-0 ${trackBackground ? 'bg-transparent' : disabled ? 'bg-gray-400/20' : 'bg-cyan-500/30'}`}
                            style={{ width: `${valuePct}%` }}
                        />

                        {/* Live value indicator */}
                        {showLiveIndicator && liveValue !== undefined && !disabled && (
                            <div className="absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0" style={{ left: `calc(${livePct}% - 0.75px)` }} />
                        )}
                    </div>

                    {/* Thumb indicator */}
                    <div
                        data-role="thumb"
                        className="absolute top-0 bottom-0 w-4 z-10 pointer-events-none border-l border-r transition-colors"
                        style={{
                            left: `calc(${valuePct}% - 8px)`,
                            borderColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
                        }}
                    />
                    
                    {/* Default value marker */}
                    {defaultPct !== null && (
                        <>
                            <div 
                                className="absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2"
                                style={{ left: `${defaultPct}%` }}
                            />
                            <button
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
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
