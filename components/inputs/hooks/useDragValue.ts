/**
 * Hook for drag-to-adjust functionality in numeric inputs
 * Unified across Slider and Vector inputs
 *
 * Features:
 * - Pointer capture for reliable dragging
 * - Configurable sensitivity and step quantization
 * - Shift/Alt modifier keys for speed control
 * - Smooth value "baking" when modifiers change mid-drag
 * - Optional value mapping for custom scales (pi, log)
 * - Hard min/max clamping
 * - Screen-edge fold: when the cursor pins against a monitor edge the drag keeps
 *   going on the orthogonal axis (up = increase) instead of freezing. See
 *   screenEdgeFold.ts. This is why the move math accumulates RELATIVE per-event
 *   deltas rather than differencing against a fixed pointer-down anchor.
 */

import { useCallback, useRef, useState } from 'react';
import { ValueMapping, mappedDomain } from '../primitives/FormatUtils';
import { beginEdgeFold, edgeFoldDelta, EdgeFoldTracker } from '../screenEdgeFold';
import { numberDragRate, type NumberDragFeel } from '../numberDragRate';
import { precisionMultiplier } from '../usePrecisionTrackDrag';

interface UseDragValueOptions {
    value: number;
    onChange: (v: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    step?: number;
    sensitivity?: number;
    min?: number;
    max?: number;
    hardMin?: number;
    hardMax?: number;
    mapping?: ValueMapping;
    disabled?: boolean;
    /** Minimum pixel movement before drag starts (default: 2) */
    dragThreshold?: number;
    /** Drag axis: 'x' = horizontal (default), 'y' = vertical (drag down to increase). */
    axis?: 'x' | 'y';
    /** Width of the track beside this number, read at pointer-down — @see numberDragRate. */
    getTrackPx?: () => number | undefined;
    dragFeel?: NumberDragFeel;
}

interface UseDragValueReturn {
    isDragging: boolean;
    /** Ref to the current value during drag — updated synchronously on every pointer move,
     *  bypassing the React render cycle. Read this for instant display during drag. */
    immediateValueRef: React.MutableRefObject<number | null>;
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
    /**
     * Call this when the element is clicked but not dragged
     * Returns true if it was a click (no drag), false if it was a drag
     */
    handleClick: () => boolean;
}

export const useDragValue = (options: UseDragValueOptions): UseDragValueReturn => {
    const {
        value,
        onChange,
        onDragStart,
        onDragEnd,
        step = 0.01,
        sensitivity = 1,
        min,
        max,
        hardMin,
        hardMax,
        mapping,
        disabled,
        dragThreshold = 2,
        axis = 'x',
        getTrackPx,
        dragFeel,
    } = options;

    const [isDragging, setIsDragging] = useState(false);
    // Immediate drag value — updated synchronously via ref on every pointer move.
    // DraggableNumber reads this ref to bypass the React render cycle for display.
    const immediateValueRef = useRef<number | null>(null);

    // Refs for drag state (don't trigger re-renders)
    // accumPx accumulates the effective along-axis travel (in px) since the current
    // anchor — fed by edgeFoldDelta so it telescopes to plain `cur - start` off the
    // wall, and keeps climbing via the orthogonal axis once pinned at a screen edge.
    const accumPx = useRef(0);
    const edgeTracker = useRef<EdgeFoldTracker>({ primary: 0, orth: 0 });
    const dragStartValue = useRef(0);
    const hasMoved = useRef(false);
    const lastShift = useRef(false);
    const lastAlt = useRef(false);
    const currentPointerId = useRef<number | null>(null);
    /** The track's width, read once at pointer-down (a drag never resizes its own panel). */
    const trackPx = useRef<number | undefined>(undefined);

    /** Display-space span of the soft range, or undefined when unbounded. */
    const span = (min !== undefined && max !== undefined && min !== max)
        ? (() => { const { dMin, dMax } = mappedDomain(min, max, mapping); return Math.abs(dMax - dMin); })()
        : undefined;

    /**
     * Per-pixel sensitivity, expressed in DISPLAY space (the drag accumulates onto
     * mapping.toDisplay(value)). Beside a track the number is the PRECISION control: a fixed
     * band slower than the track, the step deciding where inside it — see numberDragRate.ts.
     * With no track it keeps the step rate (and a mapped param gets a virtual track, since its
     * raw step is not a display-space rate — the 7bf6edbd "tiny step crawls" fix).
     */
    const getSensitivity = useCallback((shiftKey: boolean, altKey: boolean): number => {
        return numberDragRate({ step, sensitivity, span, trackPx: trackPx.current, mapped: !!mapping, feel: dragFeel })
            * precisionMultiplier({ shiftKey, altKey });
    }, [step, sensitivity, span, mapping, dragFeel]);

    /** A number beside a track snaps to the step the track snaps to (display space, like
     *  usePrecisionTrackDrag's `quantize`). A bare number stays continuous — vector cells
     *  default to step 0.01 and would coarsen. */
    const quantize = useCallback((display: number): number =>
        (trackPx.current !== undefined && step > 0 ? Math.round(display / step) * step : display),
    [step]);

    /**
     * Handle pointer down - start drag
     */
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (disabled) return;
        if (e.button !== 0) return; // Only left click

        e.preventDefault();
        e.stopPropagation();

        // Capture pointer
        e.currentTarget.setPointerCapture(e.pointerId);
        currentPointerId.current = e.pointerId;

        // Initialize drag state. Seed the edge-fold tracker with the pointer-down
        // coordinates and zero the travel accumulator.
        edgeTracker.current = beginEdgeFold(e, axis);
        accumPx.current = 0;
        const displayValue = mapping ? mapping.toDisplay(value) : value;
        dragStartValue.current = isNaN(displayValue) ? 0 : displayValue;
        hasMoved.current = false;
        lastShift.current = e.shiftKey;
        lastAlt.current = e.altKey;
        const w = getTrackPx?.();
        trackPx.current = w !== undefined && w > 0 ? w : undefined;

        setIsDragging(true);
        onDragStart?.();
    }, [value, mapping, disabled, onDragStart, axis, getTrackPx]);

    /**
     * Handle pointer move - update value
     */
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (disabled || !isDragging) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

        // Effective along-axis travel for this move. edgeFoldDelta returns the plain
        // primary-axis delta off the wall (so accumPx telescopes to `cur - start`), and
        // folds in the free orthogonal axis once pinned at a screen edge — up = increase.
        // For axis 'y' we DON'T invert: dragging down increases, so a top-to-bottom
        // slider's thumb follows the pointer (top = min, bottom = max).
        accumPx.current += edgeFoldDelta(e, axis, edgeTracker.current);
        const dx = accumPx.current;

        // Check if we've moved enough to start dragging
        if (Math.abs(dx) > dragThreshold) {
            hasMoved.current = true;
        }

        if (!hasMoved.current) return;

        e.preventDefault();
        e.stopPropagation();

        // Check if modifier keys changed - if so, "bake" current value
        const shiftChanged = lastShift.current !== e.shiftKey;
        const altChanged = lastAlt.current !== e.altKey;

        if (shiftChanged || altChanged) {
            // Calculate current value with OLD sensitivity
            const oldSensitivity = getSensitivity(lastShift.current, lastAlt.current);
            const currentValue = dragStartValue.current + (dx * oldSensitivity);

            // "Bake" the current value as the new anchor and zero the accumulator
            dragStartValue.current = currentValue;
            accumPx.current = 0;

            // Update modifier tracking
            lastShift.current = e.shiftKey;
            lastAlt.current = e.altKey;
        }

        // Calculate new value with current sensitivity (in DISPLAY space). Re-read
        // accumPx — it was just zeroed if a modifier toggled on this move.
        const currentSensitivity = getSensitivity(e.shiftKey, e.altKey);
        const nextDisplay = quantize(dragStartValue.current + (accumPx.current * currentSensitivity));

        // Convert display → internal FIRST, then clamp hard bounds in RAW space. (Clamping the
        // display value broke mapped params: a raw hardMin of 0.0001 applied to a log-display
        // value floored it at e^0.0001 ≈ 1 — the "min just over 1" bug.)
        let finalValue = mapping ? mapping.fromDisplay(nextDisplay) : nextDisplay;
        if (hardMin !== undefined) finalValue = Math.max(hardMin, finalValue);
        if (hardMax !== undefined) finalValue = Math.min(hardMax, finalValue);

        if (!isNaN(finalValue)) {
            immediateValueRef.current = finalValue;
            onChange(finalValue);
        }
    }, [isDragging, disabled, hardMin, hardMax, mapping, onChange, getSensitivity, quantize, dragThreshold, axis]);

    /**
     * Handle pointer up - end drag
     */
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (disabled) return;

        e.currentTarget.releasePointerCapture(e.pointerId);
        currentPointerId.current = null;

        setIsDragging(false);
        immediateValueRef.current = null;
        onDragEnd?.();

        // Don't reset hasMoved here - let handleClick do it
        // so it can properly detect if this was a click
    }, [disabled, onDragEnd]);

    /**
     * Check if the interaction was a click (no drag)
     * Call this from onClick handler
     */
    const handleClick = useCallback((): boolean => {
        const wasClick = !hasMoved.current;
        hasMoved.current = false;
        return wasClick;
    }, []);

    return {
        isDragging,
        immediateValueRef,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleClick,
    };
};
