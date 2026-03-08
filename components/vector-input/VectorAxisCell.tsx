/**
 * VectorAxisCell - Single axis cell for Vector2/Vector3 input
 * 
 * Refactored to use unified ScalarInput with compact variant.
 * Maintains the same styling and behavior as before.
 */

import React from 'react';
import { ScalarInput, AXIS_CONFIG } from '../inputs';
import type { VectorAxisCellProps } from './types';

export const VectorAxisCell: React.FC<VectorAxisCellProps> = ({
    axisIndex,
    value,
    min,
    max,
    step,
    onUpdate,
    onDragStart,
    onDragEnd,
    disabled,
    highlight,
    mapping,
    mapTextInput,
    liveValue,
    defaultValue,
    hardMin,
    hardMax,
    customLabel,
}) => {
    const config = AXIS_CONFIG[axisIndex];
    const label = customLabel || config.label;
    
    return (
        <div className={`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Axis label - double-click to reset to default */}
            <div
                className={`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `}
                onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (defaultValue !== undefined) {
                        onDragStart?.();
                        onUpdate(defaultValue);
                        onDragEnd?.();
                    }
                }}
                title={defaultValue !== undefined ? `Double-click to reset to ${defaultValue}` : 'No default value'}
            >
                <span className={`text-[10px] font-bold ${config.text} pointer-events-none`}>{label}</span>
            </div>
            
            {/* Scalar Input */}
            <div className="absolute inset-0 left-5">
                <ScalarInput
                    value={value}
                    onChange={onUpdate}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    step={step}
                    min={min}
                    max={max}
                    hardMin={hardMin}
                    hardMax={hardMax}
                    mapping={mapping}
                    mapTextInput={mapTextInput}
                    disabled={disabled}
                    highlight={highlight}
                    liveValue={liveValue}
                    defaultValue={defaultValue}
                    variant="compact"
                    showTrack={true}
                />
            </div>
        </div>
    );
};
