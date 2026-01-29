
import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { DraggableNumber } from './Slider';

interface KnobProps {
    label?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    size?: number;
    color?: string;
    tooltip?: string;
    unconstrained?: boolean; // Allow value to exceed min/max
    defaultValue?: number; // New prop for reset
}

export const Knob: React.FC<KnobProps> = ({ 
    label, value, min, max, step = 0.01, onChange, 
    size = 40, color = "#22d3ee", tooltip, unconstrained = false, defaultValue
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);
    
    // Visual clamping for the arc (always 0-1)
    const range = max - min;
    const clampedValue = Math.max(min, Math.min(max, value));
    const pct = Math.max(0, Math.min(1, (clampedValue - min) / range));
    const angle = -135 + (pct * 270);
    
    // SVG Math
    const r = size / 2 - 4; // Radius
    const cx = size / 2;
    const cy = size / 2;
    // Arc length for 270 degrees
    const circumference = 2 * Math.PI * r;
    const dashArray = circumference;
    const dashOffset = circumference * (1 - (pct * 0.75)); // 0.75 because 270deg is 3/4 circle

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsDragging(true);
        startY.current = e.clientY;
        startVal.current = value;
        
        handleInteractionStart('param');
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const dy = startY.current - e.clientY;
        
        // Precision modifiers
        let sensitivity = 0.005; // Base sensitivity (1 pixel = 0.5% range)
        if (e.shiftKey) sensitivity *= 5.0; // Fast
        if (e.altKey) sensitivity *= 0.1; // Precision
        
        const delta = dy * sensitivity * range;
        
        let nextVal = startVal.current + delta;
        
        if (!unconstrained) {
            nextVal = Math.max(min, Math.min(max, nextVal));
        }
        
        // Snap to step
        if (step) {
            nextVal = Math.round(nextVal / step) * step;
        }
        
        onChange(nextVal);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        handleInteractionEnd();
        (e.target as Element).releasePointerCapture(e.pointerId);
    };
    
    const handleReset = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Double click reset
        if (defaultValue !== undefined) {
             handleInteractionStart('param');
             onChange(defaultValue);
             handleInteractionEnd();
        }
    };

    return (
        <div 
            className="flex flex-col items-center gap-1 select-none touch-none group"
            title={tooltip || `${value.toFixed(2)}`}
            onDoubleClick={handleReset} 
        >
            <div 
                className="relative cursor-ns-resize"
                style={{ width: size, height: size }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <svg width={size} height={size} className="overflow-visible transform rotate-90">
                    {/* Track Background */}
                    <circle 
                        cx={cx} cy={cy} r={r} 
                        fill="none" 
                        stroke="#333" 
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * 0.25} 
                        strokeLinecap="round"
                    />
                    
                    {/* Value Arc */}
                    <circle 
                        cx={cx} cy={cy} r={r} 
                        fill="none" 
                        stroke={isDragging ? "#fff" : color} 
                        strokeWidth="3"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-colors duration-200"
                    />
                </svg>
                
                {/* Pointer Dot */}
                <div 
                    className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-sm pointer-events-none"
                    style={{
                        top: '50%',
                        left: '50%',
                        marginTop: -3,
                        marginLeft: -3,
                        transform: `rotate(${angle}deg) translate(0, -${r}px)`
                    }}
                />
            </div>

            {/* Draggable Value Text */}
            <div className="h-3 min-w-[30px] flex items-center justify-center bg-black/40 rounded px-1 border border-white/5 hover:border-white/20 transition-colors">
                <DraggableNumber 
                    value={value} 
                    onChange={onChange}
                    min={!unconstrained ? min : undefined}
                    max={!unconstrained ? max : undefined}
                    step={step}
                />
            </div>
            
            {label && (
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wide group-hover:text-gray-300 transition-colors -mt-0.5">
                    {label}
                </span>
            )}
        </div>
    );
};
