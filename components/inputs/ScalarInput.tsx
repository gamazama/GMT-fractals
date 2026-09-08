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
import { computePercentage, mappedDomain } from './primitives/FormatUtils';
import { usePrecisionTrackDrag } from './usePrecisionTrackDrag';
import { useInputSkin } from './skin';

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
    dense = false,
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
        const { dMin, dMax } = mappedDomain(min, max, mapping);
        return Math.max(0, Math.min(100, ((mappedValue - dMin) / (dMax - dMin)) * 100));
    }, [value, min, max, mapping, hasBounds]);

    const livePct = React.useMemo(() => {
        if (!hasBounds || liveValue === undefined) return 0;
        const mappedValue = mapping ? mapping.toDisplay(liveValue) : liveValue;
        const { dMin, dMax } = mappedDomain(min, max, mapping);
        return Math.max(0, Math.min(100, ((mappedValue - dMin) / (dMax - dMin)) * 100));
    }, [liveValue, min, max, mapping, hasBounds]);

    const defaultPct = React.useMemo(() => {
        if (!hasBounds || defaultValue === undefined) return null;
        const mappedValue = mapping ? mapping.toDisplay(defaultValue) : defaultValue;
        const { dMin, dMax } = mappedDomain(min, max, mapping);
        return ((mappedValue - dMin) / (dMax - dMin)) * 100;
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
    // The 'soft' skin (see ./skin.tsx) restyles the FULL variant only; compact and minimal
    // are the vector cells and bare numbers, which have no box to soften.
    const soft = useInputSkin() === 'soft' && variant === 'full';
    
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
                    className="absolute inset-0 bg-line/[0.12]"
                    style={!disabled ? {
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)'
                    } : {}}
                />
                
                {/* Fill bar */}
                {showTrack && hasBounds && (
                    <div
                        ref={fillBarRef}
                        data-role="fill"
                        className={`absolute top-0 bottom-0 left-0 pointer-events-none ${disabled ? 'bg-fg-dim/20' : isActive ? 'bg-accent-500/30' : 'bg-accent-500/20'}`}
                        style={{ width: `${valuePct}%` }}
                    />
                )}

                {/* Live value indicator */}
                {showLiveIndicator && liveValue !== undefined && !disabled && hasBounds && (
                    <div
                        className="absolute top-0 bottom-0 w-1.5 bg-secondary blur-[1px] transition-all duration-75 ease-out z-0"
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
                    <div className="absolute inset-0 bg-accent-500/10 pointer-events-none" />
                )}
            </div>
        );
    }
    
    // Full variant - like Slider (with header and track below)
    const headerHeight = "h-9 md:h-[26px]";

    if (soft) {
        // The v2 skin (plans/ge-v2-figma/slider-skin.md, option B, owner's pick 2026-09-07):
        // THUMBLESS — the fill's leading edge IS the value, with a 2 px accent cap so it never
        // vanishes at 0 % or 100 %; a 10 px bar in the same radius family as the ramp; the
        // default value a 1 px tick over the fill (its hit area resets); one quiet line of
        // label · value, the value a DraggableNumber (click to TYPE — a text entry stays
        // wherever a user expects one). `dense` (option C): label · bar · value on one 26 px row.
        // The cap is an ::after on the fill, so the drag's single width write moves it.
        const atDefault = defaultValue !== undefined && Math.abs(value - defaultValue) < 1e-9;
        const capCls = trackBackground
            ? 'after:bg-fg after:shadow-[0_0_0_1px_rgba(0,0,0,.4)]'
            : disabled ? 'after:hidden' : isActive ? 'after:bg-accent-300' : atDefault ? 'after:bg-accent-400/60' : 'after:bg-accent-300';
        const fillCls = trackBackground ? 'bg-transparent' : disabled ? 'bg-fg-muted/15' : isActive ? 'bg-accent-400/65' : atDefault ? 'bg-accent-400/30' : 'bg-accent-400/50';
        // How many decimals the number shows follows the STEP: a slider that moves in whole
        // numbers has no business printing 25.94594595, which is what the default 8-place
        // format did with a value that came out of a colour conversion (owner, 2026-09-08).
        const dp = (() => {
            const t = String(step ?? 1);
            const i = t.indexOf('.');
            return i < 0 ? 0 : Math.min(3, t.length - i - 1);
        })();
        const softFormat = format ?? ((v: number) => v.toFixed(dp));
        const number = (
            <DraggableNumber
                value={value}
                onChange={onChange}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                step={step}
                hardMin={hardMin}
                hardMax={hardMax}
                mapping={mapping}
                format={overrideText ? () => overrideText : softFormat}
                mapTextInput={mapTextInput}
                defaultValue={defaultValue}
                disabled={disabled}
                highlight={isActive}
                onImmediateChange={handleImmediateChange}
            />
        );
        const bar = showTrack && hasBounds && (
            <div
                ref={trackContainerRef}
                className={`relative flex items-center touch-none ${dense ? 'flex-1 min-w-[64px]' : ''} ${disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'}`}
                style={{ touchAction: 'none', height: 14 }}
                onPointerDown={track.onPointerDown}
                onPointerMove={track.onPointerMove}
                onPointerUp={track.onPointerUp}
                onPointerCancel={track.onPointerUp}
                onLostPointerCapture={track.onPointerUp}
            >
                <div className={`absolute left-0 right-0 rounded-[10px] overflow-hidden bg-line/[0.12] group-hover/soft:bg-line/20 ${isActive ? 'ring-1 ring-accent-400/30' : ''}`} style={{ top: 2, height: 10 }}>
                    {trackBackground && <div className="absolute inset-0" style={{ background: trackBackground }} />}
                    <div
                        ref={fullTrackFillRef}
                        className={`absolute top-0 bottom-0 left-0 rounded-[10px] ${fillCls} after:content-[''] after:absolute after:right-0 after:inset-y-0 after:w-[2px] group-hover/soft:after:w-[3px] ${capCls}`}
                        style={{ width: `${valuePct}%` }}
                    />
                    {showLiveIndicator && liveValue !== undefined && !disabled && (
                        <div className="absolute top-0 bottom-0 w-[3px] rounded-full bg-secondary transition-all duration-75 ease-out z-10" style={{ left: `calc(${livePct}% - 1.5px)` }} />
                    )}
                    {defaultPct !== null && (
                        <div className="absolute top-0 bottom-0 w-px bg-fg/30 pointer-events-none z-10" style={{ left: `${defaultPct}%` }} />
                    )}
                </div>
                {/* The default tick's hit area RESETS on a click but never swallows the
                    pointer-down: with no thumb, the fill's edge at a default value sits exactly
                    on this tick, and a drag that starts there must still be a drag (measured
                    2026-09-07: Hue rotate at 0 could not be grabbed — "click a few times
                    before it moves"). The track's own pointer-down runs first (bubbling), so
                    a plain click lands on the tick's position and the reset then makes it
                    exact; a drag just drags. */}
                {defaultPct !== null && !disabled && (
                    <button
                        type="button"
                        className="absolute top-0 bottom-0 w-[10px] -ml-[5px] z-20 cursor-ew-resize"
                        style={{ left: `${defaultPct}%` }}
                        title={`Reset to ${defaultValue}`}
                        aria-label="Reset to default"
                        tabIndex={-1}
                        onClick={(e) => { e.preventDefault(); if (!track.dragged()) handleReset(); }}
                    />
                )}
            </div>
        );
        const labelEl = label && (
            <label className={`text-[13px] select-none flex items-center gap-2 truncate pointer-events-none ${dense ? 'shrink-0 max-w-[45%]' : ''} ${disabled ? 'text-fg-faint' : 'text-fg-muted'}`}>
                {label}
                {labelSuffix}
                {liveValue !== undefined && !disabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_4px_rgb(var(--secondary))]"></span>
                )}
            </label>
        );
        const valueEl = (
            <div className={`text-right text-[13px] tabular-nums group/num-area touch-none ${dense ? 'w-[52px] shrink-0' : 'ml-auto min-w-[56px]'} ${isActive ? 'text-fg font-medium' : ''}`}>
                {number}
            </div>
        );
        if (dense) {
            return (
                <div className={`group/soft h-[22px] flex items-center gap-2.5 ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`} data-help-id={dataHelpId} data-input-skin="soft" onContextMenu={onContextMenu}>
                    {/* the keyframe diamond's home in this skin (headerRight) */}
                    {labelEl}
                    {bar}
                    {valueEl}
                    {headerRight}
                </div>
            );
        }
        return (
            <div className={`group/soft py-px ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`} data-help-id={dataHelpId} data-input-skin="soft" onContextMenu={onContextMenu}>
                {label && (
                    <div className="flex items-center h-5 gap-2 min-w-0">
                        {headerRight}
                        {labelEl}
                        {valueEl}
                    </div>
                )}
                {bar}
            </div>
        );
    }

    return (
        <div 
            className={`mt-px ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`}
            data-help-id={dataHelpId}
            onContextMenu={onContextMenu}
        >
            {/* Header */}
            {label && (
                <div className={`flex items-stretch bg-line/[0.12] rounded-t-sm ${headerHeight} overflow-hidden border-b border-line/5`}>
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                        {headerRight}
                        <label className={`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${disabled ? 'text-fg-faint' : 'text-fg-muted'}`}>
                            {label}
                            {labelSuffix}
                            {liveValue !== undefined && !disabled && (
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_4px_rgb(var(--secondary))]"></span>
                            )}
                        </label>
                    </div>
                    
                    {/* Value display */}
                    <div 
                        className="w-1/2 relative bg-line/[0.02] border-l border-line/10 group/num-area touch-none"
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
                    <div className="absolute inset-0 bg-line/10">
                        {/* Optional meaningful track background (hue/lightness/chroma ramp). */}
                        {trackBackground && <div className="absolute inset-0" style={{ background: trackBackground }} />}
                        {/* Progress fill — suppressed when a track background carries the meaning,
                            so a colour ramp reads cleanly (the thumb still marks the value). The ref
                            stays mounted either way so drag-time DOM updates remain harmless. */}
                        <div
                            ref={fullTrackFillRef}
                            className={`absolute top-0 bottom-0 left-0 ${trackBackground ? 'bg-transparent' : disabled ? 'bg-fg-muted/20' : 'bg-accent-500/30'}`}
                            style={{ width: `${valuePct}%` }}
                        />

                        {/* Live value indicator */}
                        {showLiveIndicator && liveValue !== undefined && !disabled && (
                            <div className="absolute top-0 bottom-0 w-1.5 bg-secondary blur-[1px] transition-all duration-75 ease-out z-0" style={{ left: `calc(${livePct}% - 0.75px)` }} />
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
                                className="absolute w-0.5 h-full bg-line/40 pointer-events-none z-0 transform -translate-x-1/2"
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
                                className="absolute top-0 bottom-0 right-0 w-2 bg-fg-dim/20 hover:bg-fg-muted/50 cursor-pointer z-20 transition-colors border-l border-black/10"
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
