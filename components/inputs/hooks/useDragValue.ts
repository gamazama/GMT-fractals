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
 */

import { useCallback, useRef, useState } from 'react';
import { ValueMapping } from '../primitives/FormatUtils';

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
    } = options;

    const [isDragging, setIsDragging] = useState(false);
    // Immediate drag value — updated synchronously via ref on every pointer move.
    // DraggableNumber reads this ref to bypass the React render cycle for display.
    const immediateValueRef = useRef<number | null>(null);

    // Refs for drag state (don't trigger re-renders)
    const dragStartX = useRef(0);
    const dragStartValue = useRef(0);
    const hasMoved = useRef(false);
    const lastShift = useRef(false);
    const lastAlt = useRef(false);
    const currentPointerId = useRef<number | null>(null);

    /**
     * Per-pixel sensitivity, expressed in DISPLAY space (the drag accumulates onto
     * mapping.toDisplay(value)). For a mapped (e.g. log) param the raw `step` is the wrong
     * unit — it's a raw-value quantum, not a display-space rate — so a tiny step (0.0001)
     * crawled and the value barely moved. When bounds + a mapping are present, derive the
     * rate from the display SPAN so a plain drag traverses the soft range in ~DRAG_RANGE_PX
     * pixels (mirrors the track's feel); otherwise keep the raw step*0.5 rate (display == raw).
     */
    const getSensitivity = useCallback((shiftKey: boolean, altKey: boolean): number => {
        const mult = (shiftKey ? 10 : 1) * (altKey ? 0.1 : 1);
        if (mapping && min !== undefined && max !== undefined && min !== max) {
            const DRAG_RANGE_PX = 200;
            const span = Math.abs(mapping.toDisplay(max) - mapping.toDisplay(min));
            return (span / DRAG_RANGE_PX) * sensitivity * mult;
        }
        return step * 0.5 * sensitivity * mult;
    }, [step, sensitivity, mapping, min, max]);

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

        // Initialize drag state (store the coordinate along the active axis)
        dragStartX.current = axis === 'y' ? e.clientY : e.clientX;
        const displayValue = mapping ? mapping.toDisplay(value) : value;
        dragStartValue.current = isNaN(displayValue) ? 0 : displayValue;
        hasMoved.current = false;
        lastShift.current = e.shiftKey;
        lastAlt.current = e.altKey;

        setIsDragging(true);
        onDragStart?.();
    }, [value, mapping, disabled, onDragStart, axis]);

    /**
     * Handle pointer move - update value
     */
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (disabled || !isDragging) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

        // Delta along the active axis. For 'y' we DON'T invert: dragging down increases,
        // so a top-to-bottom slider's thumb follows the pointer (top = min, bottom = max).
        const cur = axis === 'y' ? e.clientY : e.clientX;
        const dx = cur - dragStartX.current;

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

            // "Bake" the current value as the new start
            dragStartValue.current = currentValue;
            dragStartX.current = cur;

            // Update modifier tracking
            lastShift.current = e.shiftKey;
            lastAlt.current = e.altKey;
        }

        // Calculate new value with current sensitivity (in DISPLAY space).
        const currentSensitivity = getSensitivity(e.shiftKey, e.altKey);
        const nextDisplay = dragStartValue.current + (dx * currentSensitivity);

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
    }, [isDragging, disabled, step, hardMin, hardMax, mapping, onChange, getSensitivity, dragThreshold, axis]);

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
