/**
 * DraggableNumber - Core primitive for numeric input
 * 
 * Combines drag-to-adjust and click-to-edit functionality.
 * This is the foundation for both Slider and Vector inputs.
 * 
 * Features:
 * - Drag horizontally to adjust value
 * - Click to enter edit mode
 * - Shift/Alt modifiers for speed control
 * - Optional value mapping (pi units, log scale)
 * - Configurable bounds and step
 */

import React from 'react';
import { DraggableNumberProps } from '../types';
import { useDragValue, useEditMode } from '../hooks';
import { formatDisplay } from './FormatUtils';

export const DraggableNumber: React.FC<DraggableNumberProps> = ({
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
    format,
    mapTextInput,
    disabled = false,
    highlight = false,
    liveValue,
    defaultValue,
}) => {
    // Use the drag hook for drag-to-adjust
    const {
        isDragging,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleClick,
    } = useDragValue({
        value,
        onChange,
        onDragStart,
        onDragEnd,
        step,
        sensitivity,
        hardMin,
        hardMax,
        mapping,
        disabled,
    });
    
    // Use the edit mode hook for click-to-edit
    const {
        isEditing,
        inputValue,
        inputRef,
        startEditing,
        handleInputChange,
        handleKeyDown,
        handleBlur,
    } = useEditMode({
        value,
        mapping,
        onChange,
        onDragStart,
        onDragEnd,
        disabled,
        mapTextInput,
    });
    
    // Format the display value
    const displayValue = React.useMemo(() => {
        if (format) return format(value);
        if (mapping?.format) return mapping.format(value);
        return formatDisplay(value);
    }, [value, format, mapping]);
    
    // Handle focus - enter edit mode
    const handleFocus = React.useCallback(() => {
        if (!disabled && !isEditing) {
            startEditing();
        }
    }, [disabled, isEditing, startEditing]);
    
    // Handle click - enter edit mode if not dragging
    const handleClickInternal = React.useCallback((e: React.MouseEvent) => {
        if (disabled) return;
        
        // Check if it was a drag or a click
        const wasClick = handleClick();
        if (wasClick) {
            // It was a click, enter edit mode
            startEditing();
        }
    }, [disabled, handleClick, startEditing]);
    
    // Determine visual state
    const isActive = isDragging || highlight || (liveValue !== undefined && !disabled);
    
    // CSS classes based on state
    const containerClasses = `
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${disabled ? 'cursor-not-allowed opacity-50 text-gray-600' : 'cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50'}
        ${isDragging ? 'bg-cyan-500/20 text-cyan-300' : (isActive && !disabled ? 'text-cyan-400' : (disabled ? '' : 'text-gray-300 hover:text-white'))}
    `;
    
    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1"
                onClick={(e) => e.stopPropagation()}
                autoFocus
            />
        );
    }
    
    return (
        <div
            tabIndex={disabled ? -1 : 0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClickInternal}
            onFocus={handleFocus}
            className={containerClasses}
            title={disabled ? "Disabled" : `Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)`}
        >
            {displayValue}
        </div>
    );
};
