/**
 * Hook for managing edit mode state in numeric inputs
 * Unified across Slider and Vector inputs
 */

import { useState, useCallback, useRef } from 'react';
import { EditState } from '../types';
import { ValueMapping } from '../primitives/FormatUtils';

interface UseEditModeOptions {
    value: number;
    mapping?: ValueMapping;
    onChange: (v: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    disabled?: boolean;
    /** Whether to apply mapping to text input values (default: true) */
    mapTextInput?: boolean;
}

interface UseEditModeReturn {
    isEditing: boolean;
    inputValue: string;
    inputRef: React.RefObject<HTMLInputElement>;
    startEditing: () => void;
    commitEdit: () => void;
    cancelEdit: () => void;
    handleInputChange: (value: string) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleFocus: () => void;
    handleBlur: () => void;
}

export const useEditMode = (options: UseEditModeOptions): UseEditModeReturn => {
    const { value, mapping, onChange, onDragStart, onDragEnd, disabled, mapTextInput = false } = options;
    
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    // Always-fresh ref for the input value — immune to stale closures
    const inputValueRef = useRef("");
    
    /**
     * Start editing mode - show input with current value
     */
    const startEditing = useCallback(() => {
        if (disabled) return;

        setIsEditing(true);
        // When mapTextInput is false, use raw value; otherwise use mapped value
        const rawValue = mapTextInput && mapping ? mapping.toDisplay(value) : value;
        // Format to max 6 decimal places to avoid excessive precision
        const formattedValue = typeof rawValue === 'number'
            ? parseFloat(rawValue.toFixed(6))
            : (rawValue ?? 0);
        const str = String(formattedValue);
        setInputValue(str);
        inputValueRef.current = str;

        // Focus and select the input
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 10);
    }, [value, mapping, disabled, mapTextInput]);
    
    /**
     * Commit the edit - parse value and call onChange
     */
    const commitEdit = useCallback(() => {
        // Read from ref to avoid stale-closure issues (e.g. blur firing
        // before React has re-rendered with the latest inputValue state)
        const currentInput = inputValueRef.current;

        // Parse the input value
        let parsedValue: number | null;

        if (mapping?.parseInput && mapTextInput) {
            // Use mapping's parseInput when mapTextInput is true
            parsedValue = mapping.parseInput(currentInput);
        } else {
            // Otherwise parse as raw float
            parsedValue = parseFloat(currentInput);
            if (isNaN(parsedValue)) parsedValue = null;
        }

        if (parsedValue !== null) {
            // Convert from display value to internal value only when mapTextInput is true
            const finalValue = (mapTextInput && mapping) ? mapping.fromDisplay(parsedValue) : parsedValue;

            // Trigger undo history
            onDragStart?.();
            onChange(finalValue);
            onDragEnd?.();
        }

        setIsEditing(false);
    }, [mapping, onChange, onDragStart, onDragEnd, mapTextInput]);
    
    /**
     * Cancel editing - revert to display mode without changes
     */
    const cancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);
    
    /**
     * Handle input value changes
     */
    const handleInputChange = useCallback((newValue: string) => {
        setInputValue(newValue);
        inputValueRef.current = newValue;
    }, []);
    
    /**
     * Handle keyboard navigation in edit mode
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
        // Allow Tab to navigate naturally (blur will call commitEdit)
        if (e.key !== 'Tab') {
            e.stopPropagation();
        }
    }, [commitEdit, cancelEdit]);
    
    /**
     * Handle focus - auto-enter edit mode
     */
    const handleFocus = useCallback(() => {
        if (!isEditing) {
            startEditing();
        }
    }, [isEditing, startEditing]);
    
    /**
     * Handle blur - commit the edit
     */
    const handleBlur = useCallback(() => {
        if (isEditing) {
            commitEdit();
        }
    }, [isEditing, commitEdit]);
    
    return {
        isEditing,
        inputValue,
        inputRef,
        startEditing,
        commitEdit,
        cancelEdit,
        handleInputChange,
        handleKeyDown,
        handleFocus,
        handleBlur,
    };
};
