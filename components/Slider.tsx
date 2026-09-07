import React from 'react';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useInteractionGesture } from '../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';
import { ContextMenuItem } from '../types/help';
import { collectHelpIds } from '../utils/helpUtils';
import { useTrackAnimation } from '../hooks/useTrackAnimation';
import { KeyframeButton } from './KeyframeButton';
import { ScalarInput } from './inputs';
import type { ValueMapping } from './inputs';

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
    mapping?: ValueMapping;
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
    /** soft skin: one-line row (see components/inputs/skin.tsx). */
    dense?: boolean;
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
    mapping,
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
    className = '',
    dense,
}) => {
    // Pass unmapped min/max - ScalarInput handles the mapping internally.
    return (
        <ScalarInput
            dense={dense}
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
    // Session 'slider' anchored to the same transaction boundary (ADR-0061 P3b).
    const slider = useInteractionGesture(INTERACTION_SOURCES.slider);

    return <RawDraggableNumber
        {...props}
        onDragStart={() => {
            handleInteractionStart('param');
            slider.begin();
            if (props.onDragStart) props.onDragStart();
        }}
        onDragEnd={() => {
            slider.end();
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
 *
 * @assumption Silently degrades without `trackId` — `useTrackAnimation
 *   (undefined, ...)` returns `status: 'none'` with a no-op toggle.
 *   No visible warning; animation wiring is opt-in.
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
    const slider = useInteractionGesture(INTERACTION_SOURCES.slider);
    const { status, setKey, deleteKey, deleteTrack, autoKeyOnChange, autoKeyOnDragStart } = useTrackAnimation(trackId, props.value ?? 0, props.label);

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
        slider.begin();
        autoKeyOnDragStart();
        if (props.onDragStart) props.onDragStart();
    };

    const handleDragEnd = () => {
        slider.end();
        handleInteractionEnd();
        if (props.onDragEnd) props.onDragEnd();
    };

    // Construct Header Right
    const headerRight = (trackId && !props.disabled) ? (
        <KeyframeButton
            status={status}
            label={props.label}
            onClick={() => { setKey(); if (onKeyToggle) onKeyToggle(); }}
            onDeleteKey={deleteKey}
            onDeleteTrack={deleteTrack}
        />
    ) : undefined;

    // Pass unmapped min/max - ScalarInput handles the mapping internally.
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
            mapping={props.mapping}
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
            dense={props.dense}
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
