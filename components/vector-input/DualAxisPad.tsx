
import React, { useState, useRef } from 'react';
import { DualAxisPadProps, AXIS_CONFIG } from './types';

export const DualAxisPad: React.FC<DualAxisPadProps> = ({
    primaryAxis,
    secondaryAxis,
    primaryIndex,
    secondaryIndex,
    primaryValue,
    secondaryValue,
    min,
    max,
    step,
    onUpdate,
    onDragStart,
    onDragEnd,
    disabled,
    onHover
}) => {
    const [isHovering, setIsHovering] = useState(false);
    const isDragging = useRef(false);
    const isProportional = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startValues = useRef({ primary: 0, secondary: 0 });
    const hasMoved = useRef(false);
    const lastShift = useRef(false);
    const lastAlt = useRef(false);

    const primaryConfig = AXIS_CONFIG[primaryIndex];
    const secondaryConfig = AXIS_CONFIG[secondaryIndex];

    const handleEnter = () => {
        setIsHovering(true);
        onHover(true);
    };

    const handleLeave = () => {
        if (!isDragging.current) {
            setIsHovering(false);
            onHover(false);
        }
    };

    const handleDown = (e: React.PointerEvent) => {
        if (disabled) return;
        
        // Accept left-click (0) or middle-click (1)
        if (e.button !== 0 && e.button !== 1) return;

        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);

        startPos.current = { x: e.clientX, y: e.clientY };
        startValues.current = { primary: primaryValue, secondary: secondaryValue };
        hasMoved.current = false;
        lastShift.current = e.shiftKey;
        lastAlt.current = e.altKey;
        isDragging.current = true;
        isProportional.current = e.button === 1; // Middle-click = proportional mode

        onDragStart();
    };

    const handleMove = (e: React.PointerEvent) => {
        if (disabled || !isDragging.current) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) hasMoved.current = true;
        if (!hasMoved.current && Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        e.preventDefault();
        e.stopPropagation();

        // Check if modifier keys changed - if so, "bake" the current value
        const shiftChanged = lastShift.current !== e.shiftKey;
        const altChanged = lastAlt.current !== e.altKey;
        
        if (shiftChanged || altChanged) {
            // Calculate current values with old sensitivity
            let oldSensitivity = step * 0.5;
            if (lastShift.current) oldSensitivity *= 10;
            if (lastAlt.current) oldSensitivity *= 0.1;
            
            // Bake the current values
            startValues.current.primary = startValues.current.primary + (dx * oldSensitivity);
            startValues.current.secondary = startValues.current.secondary - (dy * oldSensitivity);
            startPos.current = { x: e.clientX, y: e.clientY };
            
            lastShift.current = e.shiftKey;
            lastAlt.current = e.altKey;
        }

        // Proportional mode: scale both axes by same factor
        if (isProportional.current) {
            // Use vertical drag to scale both values proportionally
            let sensitivity = 0.01;
            if (e.shiftKey) sensitivity *= 3;
            if (e.altKey) sensitivity *= 0.3;
            
            // Up = increase scale, Down = decrease scale
            const scaleFactor = 1 + (dy * sensitivity);
            
            let nextPrimary = startValues.current.primary * scaleFactor;
            let nextSecondary = startValues.current.secondary * scaleFactor;

            if (!isNaN(nextPrimary) && !isNaN(nextSecondary)) {
                onUpdate(nextPrimary, nextSecondary);
            }
        } else {
            // Normal mode: independent axis control
            let sensitivity = step * 0.5;

            // Shift = proportional/faster (10x), Alt = precision (0.1x)
            if (e.shiftKey) sensitivity *= 10;
            if (e.altKey) sensitivity *= 0.1;

            // Horizontal drag affects primary axis
            let nextPrimary = startValues.current.primary + (dx * sensitivity);
            // Vertical drag affects secondary axis (inverted so up = increase)
            let nextSecondary = startValues.current.secondary - (dy * sensitivity);

            if (!isNaN(nextPrimary) && !isNaN(nextSecondary)) {
                onUpdate(nextPrimary, nextSecondary);
            }
        }
    };

    const handleUp = (e: React.PointerEvent) => {
        if (disabled) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        isDragging.current = false;
        isProportional.current = false;
        onDragEnd();

        hasMoved.current = false;

        if (!e.currentTarget.matches(':hover')) {
            setIsHovering(false);
            onHover(false);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        
        // Reset both axes to 0
        onDragStart();
        onUpdate(0, 0);
        onDragEnd();
    };

    const isActive = isHovering || isDragging.current;

    return (
        <div
            className={`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${isActive
                    ? 'bg-white/10 border border-white/30'
                    : 'bg-white/[0.08] border border-white/5'
                }
                ${disabled ? 'opacity-30 pointer-events-none' : ''}
            `}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onDoubleClick={handleDoubleClick}
            title={`Drag: Horizontal=${primaryAxis.toUpperCase()}, Vertical=${secondaryAxis.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`}
        >
            {/* Background with subtle pattern when active */}
            {isActive && (
                <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)'
                    }}
                />
            )}

            {/* Corner indicator showing axis directions */}
            <div className="relative w-full h-full">
                {/* Primary axis indicator (horizontal) */}
                <div
                    className={`
                        absolute bottom-0 left-0 h-[2px] ${primaryConfig.color}
                        transition-all duration-150
                        ${isActive ? 'opacity-60 w-full' : 'opacity-0 w-0'}
                    `}
                />
                {/* Secondary axis indicator (vertical) */}
                <div
                    className={`
                        absolute bottom-0 left-0 w-[2px] ${secondaryConfig.color}
                        transition-all duration-150
                        ${isActive ? 'opacity-60 h-full' : 'opacity-0 h-0'}
                    `}
                />
                {/* Center crosshair when active */}
                <div
                    className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${isActive ? 'opacity-100' : 'opacity-0'}
                    `}
                >
                    <div className={`absolute w-2 h-[1px] ${primaryConfig.color} -translate-x-1/2`} />
                    <div className={`absolute h-2 w-[1px] ${secondaryConfig.color} -translate-y-1/2`} />
                </div>
                
                {/* Proportional mode indicator (diagonal lines) */}
                <div
                    className={`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${isProportional.current ? 'opacity-100' : 'opacity-0'}
                    `}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-[1px] bg-cyan-400/50 rotate-45" />
                        <div className="absolute w-full h-[1px] bg-cyan-400/50 -rotate-45" />
                    </div>
                </div>
            </div>
        </div>
    );
};
