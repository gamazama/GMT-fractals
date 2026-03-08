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
}

interface UseDragValueReturn {
    isDragging: boolean;
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
        hardMin,
        hardMax,
        mapping,
        disabled,
        dragThreshold = 2,
    } = options;
    
    const [isDragging, setIsDragging] = useState(false);
    
    // Refs for drag state (don't trigger re-renders)
    const dragStartX = useRef(0);
    const dragStartValue = useRef(0);
    const hasMoved = useRef(false);
    const lastShift = useRef(false);
    const lastAlt = useRef(false);
    const currentPointerId = useRef<number | null>(null);
    
    /**
     * Calculate sensitivity multiplier based on step and modifiers
     */
    const getSensitivity = useCallback((shiftKey: boolean, altKey: boolean): number => {
        let sens = step * 0.5 * sensitivity;
        if (shiftKey) sens *= 10;  // Fast mode
        if (altKey) sens *= 0.1;   // Precision mode
        return sens;
    }, [step, sensitivity]);
    
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
        
        // Initialize drag state
        dragStartX.current = e.clientX;
        const displayValue = mapping ? mapping.toDisplay(value) : value;
        dragStartValue.current = isNaN(displayValue) ? 0 : displayValue;
        hasMoved.current = false;
        lastShift.current = e.shiftKey;
        lastAlt.current = e.altKey;
        
        setIsDragging(true);
        onDragStart?.();
    }, [value, mapping, disabled, onDragStart]);
    
    /**
     * Handle pointer move - update value
     */
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (disabled || !isDragging) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        
        const dx = e.clientX - dragStartX.current;
        
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
            dragStartX.current = e.clientX;
            
            // Update modifier tracking
            lastShift.current = e.shiftKey;
            lastAlt.current = e.altKey;
        }
        
        // Calculate new value with current sensitivity
        const currentSensitivity = getSensitivity(e.shiftKey, e.altKey);
        let nextValue = dragStartValue.current + (dx * currentSensitivity);
        
        // Apply hard bounds if specified
        if (hardMin !== undefined) nextValue = Math.max(hardMin, nextValue);
        if (hardMax !== undefined) nextValue = Math.min(hardMax, nextValue);
        
        // Convert from display value to internal value
        const finalValue = mapping ? mapping.fromDisplay(nextValue) : nextValue;
        
        if (!isNaN(finalValue)) {
            onChange(finalValue);
        }
    }, [isDragging, disabled, step, hardMin, hardMax, mapping, onChange, getSensitivity, dragThreshold]);
    
    /**
     * Handle pointer up - end drag
     */
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (disabled) return;
        
        e.currentTarget.releasePointerCapture(e.pointerId);
        currentPointerId.current = null;
        
        setIsDragging(false);
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
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleClick,
    };
};
