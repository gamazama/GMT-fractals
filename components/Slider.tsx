
import React, { useState, useRef } from 'react';
import { useFractalStore } from '../store/fractalStore'; 
import { ContextMenuItem } from '../types/help';
import { collectHelpIds } from '../utils/helpUtils';
import { useTrackAnimation } from '../hooks/useTrackAnimation';
import { KeyframeButton } from './KeyframeButton';

// Utility to format floats nicely for UI
const formatDisplay = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1e-9) return "0";
    return parseFloat(val.toFixed(8)).toString();
};

// --- PURE PRIMITIVES ---

interface DraggableNumberProps {
  value: number;
  onChange: (v: number) => void;
  onMiddleChange?: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  highlight?: boolean;
  overrideText?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  sensitivity?: number;
  disabled?: boolean;
}

export const RawDraggableNumber = ({ 
  value, onChange, onMiddleChange, step, min, max, highlight, overrideText, onDragStart, onDragEnd, sensitivity = 1.0, disabled = false
}: DraggableNumberProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startVal = useRef(0);
    const hasMoved = useRef(false);
    const dragButton = useRef(0);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        e.preventDefault();
        
        if (e.button !== 0 && e.button !== 1) return;
        if (e.button === 1 && !onMiddleChange) return;
        
        e.currentTarget.setPointerCapture(e.pointerId);
        startX.current = e.clientX;
        startVal.current = value ?? 0;
        hasMoved.current = false;
        dragButton.current = e.button;
        setIsDragging(true);
        
        if (onDragStart) onDragStart();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || disabled) return;
        e.preventDefault();
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 3) hasMoved.current = true;
        let multiplier = 1;
        if (e.shiftKey) multiplier = 10;
        if (e.altKey) multiplier = 0.1;
        
        const delta = dx * step * multiplier * sensitivity;
        
        let nextVal = startVal.current + delta;
        if (min !== undefined) nextVal = Math.max(min, nextVal);
        if (max !== undefined) nextVal = Math.min(max, nextVal);
        const stepStr = step.toString();
        const basePrecision = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
        const precision = e.altKey ? basePrecision + 1 : basePrecision;
        const rounded = parseFloat(nextVal.toFixed(precision));
        if (dragButton.current === 1 && onMiddleChange) onMiddleChange(rounded); else onChange(rounded);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (disabled) return;
        setIsDragging(false);
        if (onDragEnd) onDragEnd();
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!hasMoved.current && dragButton.current === 0) {
            setIsEditing(true);
            setInputValue(formatDisplay(value ?? 0));
        }
    };

    const handleFocus = () => {
        if (disabled) return;
        setIsEditing(true);
        setInputValue(formatDisplay(value ?? 0));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsEditing(true);
            setInputValue(formatDisplay(value ?? 0));
        }
    };

    const commitEdit = () => {
        if (onDragStart) onDragStart(); // Trigger interaction start for undo history
        
        const val = parseFloat(inputValue);
        if (!isNaN(val)) {
            let clamped = val;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
        }
        
        if (onDragEnd) onDragEnd(); // Trigger interaction end
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input 
                autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} 
                onBlur={() => commitEdit()} 
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { 
                    if (e.key === 'Enter') commitEdit(); 
                    if (e.key === 'Escape') setIsEditing(false); 
                }}
                className="w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1" onClick={(e) => e.stopPropagation()}
            />
        );
    }

    let displayText = overrideText;
    if (!displayText) {
        if (value === undefined || value === null || isNaN(value)) {
            displayText = "---";
        } else {
            displayText = formatDisplay(value);
        }
    }

    return (
        <div 
            ref={divRef} tabIndex={disabled ? -1 : 0} 
            onPointerDown={handlePointerDown} 
            onPointerMove={handlePointerMove} 
            onPointerUp={handlePointerUp} 
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className={`w-full h-full flex items-center justify-center text-xs font-mono select-none transition-colors touch-none outline-none ${disabled ? 'cursor-not-allowed opacity-50 text-gray-600' : 'cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50'} ${isDragging ? 'bg-cyan-500/20 text-cyan-300' : (highlight && !disabled ? 'text-cyan-400' : (disabled ? '' : 'text-gray-300 hover:text-white'))}`}
            title={disabled ? "Disabled" : "Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)"}
        >
        {displayText}
        </div>
    );
};

interface BaseSliderProps extends Omit<DraggableNumberProps, 'onMiddleChange'> {
    label: string;
    hardMin?: number;
    hardMax?: number;
    customMapping?: { toSlider: (val: number) => number; fromSlider: (val: number) => number; min: number; max: number; };
    mapTextInput?: boolean;
    liveValue?: number;
    
    // Visual slots
    headerRight?: React.ReactNode;
    footer?: React.ReactNode;
    
    // Interactions
    onContextMenu?: (e: React.MouseEvent) => void;
    dataHelpId?: string;
    className?: string;
}

export const BaseSlider: React.FC<BaseSliderProps> = ({ 
    label, value, min, max, step, hardMin, hardMax, onChange, highlight, overrideText, customMapping, mapTextInput, 
    liveValue, headerRight, footer, onContextMenu, dataHelpId, onDragStart, onDragEnd, disabled = false, className = ''
}) => {
    const safeValue = value ?? 0;

    const sliderValue = customMapping ? customMapping.toSlider(safeValue) : safeValue;
    const sliderMin = customMapping ? customMapping.min : min;
    const sliderMax = customMapping ? customMapping.max : max;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const raw = parseFloat(e.target.value);
        const output = customMapping ? customMapping.fromSlider(raw) : raw;
        onChange(output);
    };

    const numValue = (mapTextInput && customMapping) ? sliderValue : safeValue;
    let numMin = hardMin ?? min;
    let numMax = hardMax ?? max;
    if (mapTextInput && customMapping) {
        if (hardMin !== undefined) numMin = customMapping.toSlider(hardMin); else numMin = customMapping.min;
        if (hardMax !== undefined) numMax = customMapping.toSlider(hardMax); else numMax = customMapping.max;
    }

    const handleNumChange = (v: number) => {
        if (disabled) return;
        if (mapTextInput && customMapping) onChange(customMapping.fromSlider(v));
        else onChange(v);
    };

    const valuePct = Math.max(0, Math.min(100, ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100));
    let livePct = 0;
    if (liveValue !== undefined) {
        const liveMapped = customMapping ? customMapping.toSlider(liveValue) : liveValue;
        livePct = Math.max(0, Math.min(100, ((liveMapped - sliderMin) / (sliderMax - sliderMin)) * 100));
    }

    const isActive = highlight || liveValue !== undefined;
    
    return (
        <div className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`} data-help-id={dataHelpId} onContextMenu={onContextMenu}>
            <div className="flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5">
                <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                    {headerRight}
                    <label className={`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        {label}
                        {liveValue !== undefined && !disabled && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"></span>}
                    </label>
                </div>
                <div className="w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none" style={!disabled ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)' } : {}}>
                    <RawDraggableNumber 
                        value={numValue} 
                        onChange={handleNumChange} 
                        step={step} 
                        min={hardMin} 
                        max={hardMax} 
                        highlight={isActive} 
                        overrideText={overrideText}
                        onDragStart={onDragStart} 
                        onDragEnd={onDragEnd}
                        disabled={disabled}
                    />
                </div>
            </div>
            <div className="relative h-5 flex items-center touch-none overflow-hidden" style={{ touchAction: 'none' }}>
                <input 
                    type="range" 
                    min={sliderMin} max={sliderMax} step={customMapping ? step : step} value={sliderValue} 
                    onChange={handleSliderChange} 
                    disabled={disabled}
                    onPointerDown={(e) => { 
                        if(disabled) return;
                        e.stopPropagation();
                        if (onDragStart) onDragStart(); 
                    }}
                    onPointerUp={() => { if(!disabled && onDragEnd) onDragEnd(); }}
                    className={`precision-slider w-full h-full appearance-none cursor-pointer focus:outline-none z-10 ${isActive && !disabled ? 'accent-cyan-500' : 'accent-gray-400'}`} 
                    style={{ background: 'transparent', touchAction: 'none' }} 
                    tabIndex={-1} 
                />
                <div className="absolute inset-0 bg-white/10 pointer-events-none">
                    <div className={`absolute top-0 bottom-0 left-0 transition-[width] duration-75 ease-out ${disabled ? 'bg-gray-500/20' : 'bg-cyan-500/30'}`} style={{ width: `${valuePct}%` }} />
                    {liveValue !== undefined && !disabled && <div className="absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0" style={{ left: `calc(${livePct}% - 0.75px)` }} />}
                </div>
                {footer}
            </div>
        </div>
    );
};

// --- CONNECTED COMPONENTS (Legacy Wrapper) ---

export const DraggableNumber: React.FC<DraggableNumberProps> = (props) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    
    return <RawDraggableNumber 
        {...props} 
        onDragStart={() => {
            handleInteractionStart('param');
            if (props.onDragStart) props.onDragStart();
        }}
        onDragEnd={() => {
            handleInteractionEnd();
            if (props.onDragEnd) props.onDragEnd();
        }}
    />;
};

interface SliderProps extends Omit<BaseSliderProps, 'onContextMenu' | 'headerRight' | 'footer' | 'overrideText'> {
    trackId?: string;
    onKeyToggle?: () => void;
    defaultValue?: number;
    overrideInputText?: string;
}

const Slider: React.FC<SliderProps> = ({ 
    trackId, onKeyToggle, defaultValue, overrideInputText, dataHelpId, onChange, ...props 
}) => {
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { status, toggleKey, autoKeyOnChange, autoKeyOnDragStart } = useTrackAnimation(trackId, props.value ?? 0, props.label);

    const helpIds = [];
    if (trackId) helpIds.push(trackId);
    if (dataHelpId) helpIds.push(dataHelpId);
    helpIds.push('ui.slider');
    const helpIdAttr = helpIds.join(' ');

    const handleContextMenu = (e: React.MouseEvent) => {
        if (props.disabled) return;
        e.preventDefault(); e.stopPropagation();
        const items: ContextMenuItem[] = [];
        if (defaultValue !== undefined) {
            items.push({
                label: 'Reset to Default',
                action: () => {
                    handleInteractionStart('param');
                    if (trackId) autoKeyOnDragStart(); 
                    onChange(defaultValue);
                    autoKeyOnChange(defaultValue);
                    handleInteractionEnd();
                }
            });
        }
        const ids = collectHelpIds(e.currentTarget);
        openContextMenu(e.clientX, e.clientY, items, ids);
    };

    const handleChange = (v: number) => {
        onChange(v);
        autoKeyOnChange(v);
    };

    const handleDragStart = () => {
        handleInteractionStart('param');
        autoKeyOnDragStart();
        if (props.onDragStart) props.onDragStart();
    };

    const handleDragEnd = () => {
        handleInteractionEnd();
        if (props.onDragEnd) props.onDragEnd();
    };

    // Construct Header Right
    const headerRight = (trackId && !props.disabled) ? (
        <KeyframeButton status={status} onClick={() => { toggleKey(); if (onKeyToggle) onKeyToggle(); }} />
    ) : undefined;

    // Construct Footer
    const footer = (defaultValue !== undefined && !props.disabled) ? (
        <>
            <div className="absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2" style={{ left: `${((props.customMapping ? props.customMapping.toSlider(defaultValue) : defaultValue) - (props.customMapping?.min ?? props.min ?? 0)) / ((props.customMapping?.max ?? props.max ?? 1) - (props.customMapping?.min ?? props.min ?? 0)) * 100}%` }} />
            <button 
                onClick={(e) => { 
                    e.preventDefault(); e.stopPropagation(); 
                    handleInteractionStart('param');
                    if (trackId) autoKeyOnDragStart(); 
                    onChange(defaultValue);
                    autoKeyOnChange(defaultValue); 
                    handleInteractionEnd();
                }} 
                className="absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10" 
                title={`Reset to ${defaultValue}`} 
                aria-label="Reset to default" 
                tabIndex={-1} 
            />
        </>
    ) : undefined;

    return (
        <BaseSlider 
            {...props}
            onChange={handleChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
            dataHelpId={helpIdAttr}
            headerRight={headerRight}
            footer={footer}
            highlight={props.highlight || status !== 'none'}
            overrideText={overrideInputText}
        />
    );
};

export default Slider;
