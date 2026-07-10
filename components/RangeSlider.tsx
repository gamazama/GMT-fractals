import React, { useRef } from 'react';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useInteractionGesture } from '../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';
import { useTrackAnimation } from '../hooks/useTrackAnimation';
import { KeyframeButton } from './KeyframeButton';
import { RawDraggableNumber } from './Slider';
import { usePrecisionTrackDrag } from './inputs/usePrecisionTrackDrag';
import type { ValueMapping } from './inputs';
import { mappedDomain } from './inputs/primitives/FormatUtils';

/**
 * RangeSlider — a min/max value pair on ONE track (two thumbs + a band fill).
 *
 * Built for DDFS `rangePairWith` param pairs (AutoFeaturePanel renders the pair
 * through this row — Fog Start/End is the first consumer), but prop-driven and
 * store-free like every UI primitive. Composition mirrors Slider.tsx:
 *  - the SHARED precision-track drag per thumb (usePrecisionTrackDrag — Shift
 *    ×10 / Alt ×0.1, same feel as every other slider); pointer-down routes to
 *    the NEAREST thumb, ties broken by click side.
 *  - cross-clamped thumbs (min ≤ max, hard-clamped inside the drag hook).
 *  - per-thumb animation wiring (useTrackAnimation + KeyframeButton) so both
 *    params keep their keyframe affordance — pairing must not cost
 *    animatability (DDFS invariant).
 *  - drag-to-adjust numeric entries for each end (RawDraggableNumber).
 *  - interaction session (useInteractionGesture) shared by the whole row, so
 *    undo/accumulation-reset transactions match single-slider behaviour.
 */
export interface RangeSliderProps {
    label: string;
    minTitle?: string;   // label of the min param (tooltip/animation label)
    maxTitle?: string;   // label of the max param
    valueMin: number;
    valueMax: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    mapping?: ValueMapping;
    format?: (v: number) => string;
    disabled?: boolean;
    highlight?: boolean;
    trackIdMin?: string;
    trackIdMax?: string;
    liveMin?: number;
    liveMax?: number;
    labelSuffix?: React.ReactNode;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
    label, minTitle, maxTitle,
    valueMin, valueMax, onMinChange, onMaxChange,
    min, max, step = 0.01, mapping, format,
    disabled = false, highlight = false,
    trackIdMin, trackIdMax, liveMin, liveMax, labelSuffix,
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
    const gesture = useInteractionGesture(INTERACTION_SOURCES.slider);
    const animMin = useTrackAnimation(trackIdMin, valueMin, minTitle ?? `${label} Min`);
    const animMax = useTrackAnimation(trackIdMax, valueMax, maxTitle ?? `${label} Max`);
    const activeThumb = useRef<'min' | 'max' | null>(null);

    const pct = (v: number) => {
        const mapped = mapping ? mapping.toDisplay(v) : v;
        const { dMin, dMax } = mappedDomain(min, max, mapping);
        return Math.max(0, Math.min(100, ((mapped - dMin) / (dMax - dMin)) * 100));
    };
    const pctMin = pct(valueMin);
    const pctMax = pct(valueMax);

    const beginDrag = (which: 'min' | 'max') => {
        handleInteractionStart('param');
        gesture.begin();
        (which === 'min' ? animMin : animMax).autoKeyOnDragStart();
    };
    const endDrag = () => {
        gesture.end();
        handleInteractionEnd();
    };
    const changeMin = (v: number) => { onMinChange(v); animMin.autoKeyOnChange(v); };
    const changeMax = (v: number) => { onMaxChange(v); animMax.autoKeyOnChange(v); };

    const dragMin = usePrecisionTrackDrag({
        min, max, step, mapping, disabled,
        hardMin: min, hardMax: valueMax,           // cross-clamp: never past the max thumb
        onChange: changeMin,
        onDragStart: () => beginDrag('min'),
        onDragEnd: endDrag,
    });
    const dragMax = usePrecisionTrackDrag({
        min, max, step, mapping, disabled,
        hardMin: valueMin, hardMax: max,           // cross-clamp: never past the min thumb
        onChange: changeMax,
        onDragStart: () => beginDrag('max'),
        onDragEnd: endDrag,
    });

    const routeDown = (e: React.PointerEvent<HTMLElement>) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
        const dMin = Math.abs(clickPct - pctMin);
        const dMax = Math.abs(clickPct - pctMax);
        // Nearest thumb wins; on a tie (overlapping thumbs) the click SIDE
        // decides so a collapsed pair can always be pulled apart again.
        const which = dMin < dMax ? 'min' : dMax < dMin ? 'max' : (clickPct <= pctMin ? 'min' : 'max');
        activeThumb.current = which;
        (which === 'min' ? dragMin : dragMax).onPointerDown(e);
    };
    const routeMove = (e: React.PointerEvent<HTMLElement>) => {
        const which = activeThumb.current;
        if (which) (which === 'min' ? dragMin : dragMax).onPointerMove(e);
    };
    const routeUp = (e: React.PointerEvent<HTMLElement>) => {
        const which = activeThumb.current;
        if (which) {
            (which === 'min' ? dragMin : dragMax).onPointerUp(e);
            activeThumb.current = null;
        }
    };

    const numericShared = {
        step, min, max,
        hardMin: min, hardMax: max,
        disabled,
    };

    return (
        <div className={disabled ? 'opacity-30 pointer-events-none' : ''} data-help-id="ui.slider">
            {/* Header: label + keyframes + the two drag-to-adjust entries */}
            <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1 min-w-0">
                    <span className={`text-[10px] truncate ${highlight ? 'text-fg' : 'text-fg-dim'}`}>{label}</span>
                    {labelSuffix}
                </div>
                <div className="flex items-center gap-1">
                    {trackIdMin && !disabled && (
                        <KeyframeButton status={animMin.status} onClick={animMin.toggleKey} />
                    )}
                    <RawDraggableNumber
                        {...numericShared}
                        value={valueMin}
                        hardMax={valueMax}
                        overrideText={format ? format(valueMin) : undefined}
                        onChange={changeMin}
                        onDragStart={() => beginDrag('min')}
                        onDragEnd={endDrag}
                    />
                    <span className="text-fg-faint text-[10px]">–</span>
                    <RawDraggableNumber
                        {...numericShared}
                        value={valueMax}
                        hardMin={valueMin}
                        overrideText={format ? format(valueMax) : undefined}
                        onChange={changeMax}
                        onDragStart={() => beginDrag('max')}
                        onDragEnd={endDrag}
                    />
                    {trackIdMax && !disabled && (
                        <KeyframeButton status={animMax.status} onClick={animMax.toggleKey} />
                    )}
                </div>
            </div>

            {/* One track, two thumbs, band fill between them */}
            <div
                className={`relative flex items-center touch-none overflow-hidden ${disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'}`}
                style={{ touchAction: 'none', height: 20 }}
                onPointerDown={routeDown}
                onPointerMove={routeMove}
                onPointerUp={routeUp}
                onPointerCancel={routeUp}
                onLostPointerCapture={routeUp}
            >
                <div className="absolute inset-0 bg-line/10">
                    {/* Band between the thumbs */}
                    <div
                        className={`absolute top-0 bottom-0 ${disabled ? 'bg-fg-muted/20' : 'bg-accent-500/30'}`}
                        style={{ left: `${pctMin}%`, width: `${Math.max(0, pctMax - pctMin)}%` }}
                    />
                    {/* Live modulation indicators (per thumb) */}
                    {liveMin !== undefined && !disabled && (
                        <div className="absolute top-0 bottom-0 w-1.5 bg-secondary blur-[1px] z-0" style={{ left: `calc(${pct(liveMin)}% - 0.75px)` }} />
                    )}
                    {liveMax !== undefined && !disabled && (
                        <div className="absolute top-0 bottom-0 w-1.5 bg-secondary blur-[1px] z-0" style={{ left: `calc(${pct(liveMax)}% - 0.75px)` }} />
                    )}
                </div>
                {/* Thumbs — same bracket style as ScalarInput's, one edge each */}
                <div
                    className="absolute top-0 bottom-0 w-1 z-10 pointer-events-none border-l-2"
                    style={{ left: `calc(${pctMin}% - 1px)`, borderColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)' }}
                />
                <div
                    className="absolute top-0 bottom-0 w-1 z-10 pointer-events-none border-r-2"
                    style={{ left: `calc(${pctMax}% - 3px)`, borderColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)' }}
                />
            </div>
        </div>
    );
};

export default RangeSlider;
