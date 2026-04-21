import React from 'react';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { ContextMenuItem } from '../types/help';
import { collectHelpIds } from '../utils/helpUtils';
import { useTrackAnimation } from '../hooks/useTrackAnimation';
import { KeyframeButton } from './KeyframeButton';
import { ScalarInput, getMapping, formatDisplay } from './inputs';
import type { CustomMapping } from './inputs';

/** Build a mapping object from legacy customMapping props */
function buildMapping(customMapping: CustomMapping | undefined) {
    if (!customMapping) return undefined;
    return {
        toDisplay: customMapping.toSlider,
        fromDisplay: customMapping.fromSlider,
        format: formatDisplay,
        parseInput: (s: string) => {
            const num = parseFloat(s);
            return isNaN(num) ? null : num;
        }
    };
}

// Re-export for backward compatibility
export { formatDisplay } from './inputs';

// --- PURE PRIMITIVES (Now backed by unified ScalarInput) ---

interface DraggableNumberProps {
  value: number;
  onChange: (v: number) => void;
  onMiddleChange?: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  hardMin?: number;
  hardMax?: number;
  highlight?: boolean;
  overrideText?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  sensitivity?: number;
  disabled?: boolean;
}

/**
 * RawDraggableNumber - Pure drag-to-adjust number input
 * Refactored to use unified ScalarInput with minimal variant
 */
export const RawDraggableNumber: React.FC<DraggableNumberProps> = ({ 
    value, 
    onChange, 
    step, 
    min, 
    max,
    hardMin,
    hardMax, 
    highlight, 
    overrideText, 
    onDragStart, 
    onDragEnd, 
    sensitivity = 1.0, 
    disabled = false
}) => {
    return (
        <ScalarInput
            value={value}
            onChange={onChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            step={step}
            min={min}
            max={max}
            hardMin={hardMin}
            hardMax={hardMax}
            variant="minimal"
            disabled={disabled}
            highlight={highlight}
            overrideText={overrideText}
            showTrack={false}
        />
    );
};

// --- BASE SLIDER (Now backed by unified ScalarInput) ---

interface BaseSliderProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    hardMin?: number;
    hardMax?: number;
    highlight?: boolean;
    overrideText?: string;
    customMapping?: CustomMapping;
    mapTextInput?: boolean;
    liveValue?: number;
    headerRight?: React.ReactNode;
    footer?: React.ReactNode;
    labelSuffix?: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    dataHelpId?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * BaseSlider - Full-featured slider with track
 * Refactored to use unified ScalarInput
 */
export const BaseSlider: React.FC<BaseSliderProps> = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 0.01, 
    hardMin, 
    hardMax, 
    onChange, 
    highlight, 
    overrideText, 
    customMapping, 
    mapTextInput,
    liveValue, 
    headerRight, 
    footer, 
    labelSuffix, 
    onContextMenu, 
    dataHelpId, 
    onDragStart, 
    onDragEnd, 
    disabled = false,
    className = ''
}) => {
    const mapping = React.useMemo(() => buildMapping(customMapping), [customMapping]);

    // Pass unmapped min/max - ScalarInput will handle mapping internally
    // This fixes double-mapping bug where min/max were converted twice

    return (
        <ScalarInput
            label={label}
            value={value}
            onChange={onChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            step={step}
            min={min}
            max={max}
            hardMin={hardMin}
            hardMax={hardMax}
            mapping={mapping}
            format={overrideText ? () => overrideText : undefined}
            mapTextInput={mapTextInput}
            variant="full"
            showTrack={true}
            trackPosition="below"
            disabled={disabled}
            highlight={highlight}
            liveValue={liveValue}
            showLiveIndicator={true}
            headerRight={headerRight}
            labelSuffix={labelSuffix}
            onContextMenu={onContextMenu}
            dataHelpId={dataHelpId}
            className={className}
        />
    );
};

// --- CONNECTED COMPONENTS (Maintain exact same API) ---

export const DraggableNumber: React.FC<DraggableNumberProps> = (props) => {
    const { handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
    
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

/**
 * Slider - Main slider component with animation keyframe support
 * Maintains exact same API as before, now using unified ScalarInput
 */
const Slider: React.FC<SliderProps> = ({ 
    trackId, 
    onKeyToggle, 
    defaultValue, 
    overrideInputText, 
    dataHelpId, 
    onChange, 
    ...props 
}) => {
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
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

    // Construct Footer (default value marker)
    const footer = (defaultValue !== undefined && !props.disabled) ? (
        <>
            <div className="absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2" 
                style={{ left: `${((props.customMapping ? props.customMapping.toSlider(defaultValue) : defaultValue) - (props.customMapping?.min ?? props.min ?? 0)) / ((props.customMapping?.max ?? props.max ?? 1) - (props.customMapping?.min ?? props.min ?? 0)) * 100}%` }} 
            />
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

    const mapping = React.useMemo(() => buildMapping(props.customMapping), [props.customMapping]);

    // Pass unmapped min/max - ScalarInput will handle mapping internally
    // This fixes double-mapping bug where min/max were converted twice

    return (
        <ScalarInput
            label={props.label}
            value={props.value}
            onChange={handleChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            step={props.step ?? 0.01}
            min={props.min}
            max={props.max}
            hardMin={props.hardMin}
            hardMax={props.hardMax}
            mapping={mapping}
            format={overrideInputText ? () => overrideInputText : undefined}
            mapTextInput={props.mapTextInput}
            variant="full"
            showTrack={true}
            trackPosition="below"
            disabled={props.disabled}
            highlight={props.highlight || status !== 'none'}
            liveValue={props.liveValue}
            showLiveIndicator={true}
            headerRight={headerRight}
            labelSuffix={props.labelSuffix}
            onContextMenu={handleContextMenu}
            dataHelpId={helpIdAttr}
            className={props.className}
            defaultValue={defaultValue}
            onReset={() => {
                handleInteractionStart('param');
                if (trackId) autoKeyOnDragStart();
                onChange(defaultValue!);
                autoKeyOnChange(defaultValue!);
                handleInteractionEnd();
            }}
        />
    );
};

export default Slider;
