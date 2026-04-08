/**
 * RotationHeliotrope - 3D Rotation Direction Control
 * 
 * A heliotrope-style control for visualizing and manipulating rotation axis direction.
 * Uses relative drag like DualAxisPad for flawless interaction at any distance.
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';

interface RotationHeliotropeProps {
    /** Azimuth angle (horizontal rotation) in radians */
    azimuth: number;
    /** Pitch angle (vertical tilt) in radians */
    pitch: number;
    /** Called when azimuth/pitch changes */
    onChange: (azimuth: number, pitch: number) => void;
    /** Called when interaction starts */
    onDragStart?: () => void;
    /** Called when interaction ends */
    onDragEnd?: () => void;
    /** Disable interaction */
    disabled?: boolean;
    /** Size of the control (default: 80) */
    size?: number;
}

export const RotationHeliotrope: React.FC<RotationHeliotropeProps> = ({
    azimuth,
    pitch,
    onChange,
    onDragStart,
    onDragEnd,
    disabled = false,
    size = 80
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const [isActive, setIsActive] = useState(false);
    const [isAltPressed, setIsAltPressed] = useState(false);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const lastPointerPos = useRef({ x: 0, y: 0 });
    const currentAngles = useRef({ azimuth, pitch });
    const dragStartAngles = useRef({ azimuth, pitch });
    const constrainedAxis = useRef<'x' | 'y' | null>(null);

    // Update current angles ref when props change
    useEffect(() => {
        currentAngles.current = { azimuth, pitch };
    }, [azimuth, pitch]);

    // Precision multipliers
    const defaultPrecision = 0.5;  // Half speed by default
    const altPrecision = 0.05;     // Very precise with Alt
    const precision = isAltPressed ? altPrecision : defaultPrecision;

    // Heliotrope geometry constants
    const center = size / 2;
    const radius = size * 0.38;

    // Convert spherical coordinates to 2D position
    // Center = forward, edge = 90° in any direction, beyond edge = >90°
    const getPositionFromSpherical = useCallback((az: number, pit: number, r: number) => {
        // Map angles to position (linear mapping from angle to edge distance)
        // azimuth: -π/2 (left) to +π/2 (right) maps to x: -r to +r
        // pitch: -π/2 (down) to +π/2 (up) maps to y: +r to -r (screen coords)
        
        // Allow angles beyond ±π/2 - handle will extend beyond the circle
        const x = (az / (Math.PI / 2)) * r;
        const y = -(pit / (Math.PI / 2)) * r;
        
        return { x, y };
    }, []);

    // Get current handle position (can be beyond boundary)
    const handlePos = useMemo(() =>
        getPositionFromSpherical(azimuth, pitch, radius),
    [azimuth, pitch, radius, getPositionFromSpherical]);

    // Calculate arrow position - points in the direction of azimuth/pitch
    // Converts spherical (azimuth, pitch) to direction and projects to 2D
    // Arrow length varies with perspective: longer when forward, shorter when backward
    const arrowPos = useMemo(() => {
        // Convert spherical angles to 3D direction vector
        const cosPit = Math.cos(pitch);
        const sinPit = Math.sin(pitch);
        const cosAz = Math.cos(azimuth);
        const sinAz = Math.sin(azimuth);
        
        // Direction vector (pointing in the direction we're facing)
        // Forward is -Z in our convention
        const dirX = sinAz * cosPit;  // Left/right
        const dirY = sinPit;          // Up/down
        const dirZ = -cosAz * cosPit; // Forward/back (+1 = back, -1 = forward)
        
        // Project to 2D heliotrope
        const projX = dirX;
        const projY = -dirY;
        const projLen = Math.sqrt(projX * projX + projY * projY);
        
        // isBack when pointing backward (Z > 0)
        const isBack = dirZ > 0;
        
        // Arrow LINE length: follows the angular distance (clamped to boundary)
        // Line extends from center to the edge when at 90°
        const lineLength = projLen > 0.001
            ? Math.min(projLen, 1) * radius
            : 0;
        
        // Arrow HEAD scale: opposite of line for perspective effect
        // - At center (pointing at camera): 1.5x (largest)
        // - At boundary (90°): 1.0x (normal)
        // - Backward: 0.05x (tiny)
        const headScale = dirZ <= 0
            ? 1.0 + (1.0 - Math.min(projLen, 1)) * 0.5  // Forward: 1.5 at center, 1.0 at edge
            : 1.0 - dirZ * 0.95;                         // Backward: 1.0 to 0.05
        
        // Arrow tip position (for the line end)
        const arrowX = projLen > 0.001 ? (projX / projLen) * lineLength : 0;
        const arrowY = projLen > 0.001 ? (projY / projLen) * lineLength : 0;
        
        return {
            x: arrowX,
            y: arrowY,
            isBack,
            length: lineLength,
            headScale,
            dirX, dirY, dirZ
        };
    }, [azimuth, pitch, radius]);

    // Convert 2D position back to spherical coordinates
    const getSphericalFromPosition = useCallback((dx: number, dy: number, r: number) => {
        // Reverse mapping: position back to angles (allow beyond boundary)
        // x: -r to +r maps to azimuth: -π/2 to +π/2
        // y: +r to -r (screen) maps to pitch: -π/2 to +π/2
        const azimuth = (dx / r) * (Math.PI / 2);
        const pitch = -(dy / r) * (Math.PI / 2);
        
        return { azimuth, pitch };
    }, []);

    // Update from pointer delta with precision scaling and optional axis constraint
    const updateFromDelta = useCallback((deltaX: number, deltaY: number) => {
        let finalDeltaX = deltaX;
        let finalDeltaY = deltaY;
        
        // If shift is pressed, constrain to dominant axis
        if (isShiftPressed && constrainedAxis.current) {
            if (constrainedAxis.current === 'x') {
                finalDeltaY = 0; // Constrain to horizontal (azimuth only)
            } else {
                finalDeltaX = 0; // Constrain to vertical (pitch only)
            }
        }
        
        // Apply precision scaling to delta
        const scaledDeltaX = finalDeltaX * precision;
        const scaledDeltaY = finalDeltaY * precision;
        
        // Convert current angles to position
        const currentPos = getPositionFromSpherical(currentAngles.current.azimuth, currentAngles.current.pitch, radius);
        
        // Add scaled delta
        const newX = currentPos.x + scaledDeltaX;
        const newY = currentPos.y + scaledDeltaY;
        
        // Convert back to angles
        const { azimuth: newAz, pitch: newPitch } = getSphericalFromPosition(newX, newY, radius);
        
        // If shift is pressed, keep the constrained axis at drag start value
        if (isShiftPressed && constrainedAxis.current) {
            if (constrainedAxis.current === 'x') {
                // Keep pitch at drag start, only update azimuth
                currentAngles.current = { azimuth: newAz, pitch: dragStartAngles.current.pitch };
                onChange(newAz, dragStartAngles.current.pitch);
            } else {
                // Keep azimuth at drag start, only update pitch
                currentAngles.current = { azimuth: dragStartAngles.current.azimuth, pitch: newPitch };
                onChange(dragStartAngles.current.azimuth, newPitch);
            }
        } else {
            // Update both angles
            currentAngles.current = { azimuth: newAz, pitch: newPitch };
            onChange(newAz, newPitch);
        }
    }, [getPositionFromSpherical, getSphericalFromPosition, onChange, radius, precision, isShiftPressed]);

    // Pointer event handlers with relative movement
    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        if (e.button !== 0) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);

        isDragging.current = true;
        setIsActive(true);
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        currentAngles.current = { azimuth, pitch };
        dragStartAngles.current = { azimuth, pitch };
        constrainedAxis.current = null;
        onDragStart?.();
        
        // Track modifier keys
        setIsAltPressed(e.altKey);
        setIsShiftPressed(e.shiftKey);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (disabled || !isDragging.current) return;
        
        // Calculate delta from last position
        const deltaX = e.clientX - lastPointerPos.current.x;
        const deltaY = e.clientY - lastPointerPos.current.y;
        
        // Update last position
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        
        // Update modifier key states
        setIsAltPressed(e.altKey);
        setIsShiftPressed(e.shiftKey);
        
        // Determine constrained axis on first significant movement if shift is held
        if (isShiftPressed && !constrainedAxis.current && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
            constrainedAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
        }
        
        // Apply delta with precision
        updateFromDelta(deltaX, deltaY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging.current) {
            isDragging.current = false;
            setIsActive(false);
            setIsAltPressed(false);
            setIsShiftPressed(false);
            constrainedAxis.current = null;
            onDragEnd?.();
        }
    };


    return (
        <div
            ref={containerRef}
            className={`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${isActive ? 'scale-105 border-cyan-500/50' : 'hover:border-white/20'}
            `}
            style={{ 
                width: size, 
                height: size, 
                touchAction: 'none',
                boxShadow: isActive ? '0 0 20px rgba(34, 211, 238, 0.3)' : 'none'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onDoubleClick={(e) => {
                if (disabled) return;
                e.preventDefault();
                e.stopPropagation();
                // Reset both azimuth and pitch to 0
                onDragStart?.();
                onChange(0, 0);
                onDragEnd?.();
            }}
            onContextMenu={(e) => {
                // Allow context menu to bubble up to parent
                // Don't call preventDefault here - parent will handle it
            }}
            title="Drag to rotate direction, Double-click to reset"
        >
            {/* 90-degree boundary ring */}
            <div 
                className="absolute rounded-full border border-white/10 pointer-events-none"
                style={{ 
                    width: radius * 2, 
                    height: radius * 2,
                    left: center - radius,
                    top: center - radius
                }}
            />

            {/* Crosshairs */}
            <div className="absolute w-full h-px bg-white/10 pointer-events-none" style={{ top: center }} />
            <div className="absolute h-full w-px bg-white/10 pointer-events-none" style={{ left: center }} />

            {/* Center reference dot */}
            <div 
                className="absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none"
                style={{ 
                    left: center - 3, 
                    top: center - 3 
                }}
            />

            {/* Handle/dot showing current direction */}
            <div
                className="absolute pointer-events-none rounded-full transition-transform duration-75"
                style={{
                    left: center + handlePos.x,
                    top: center + handlePos.y,
                    width: 8,
                    height: 8,
                    marginLeft: -4,
                    marginTop: -4,
                    background: arrowPos.isBack ? '#ef4444' : '#22d3ee',
                    boxShadow: `0 0 8px ${arrowPos.isBack ? '#ef4444' : '#22d3ee'}`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                }}
            />

            {/* Back zone indicator (subtle red tint when looking back) */}
            {arrowPos.isBack && (
                <div
                    className="absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"
                />
            )}

            {/* Arrow showing effective direction (shrinks when pointing backward) */}
            {/* Always visible with subtle styling */}
            <>
                {/* Arrow line from center to arrow tip */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        style={{ width: size, height: size }}
                    >
                        {/* Longitude ellipse: vertical ellipse at constant azimuth */}
                        {Math.abs(azimuth) > 0.01 && (
                            <>
                                {/* Half containing arrow - cyan when forward, red when backward */}
                                <ellipse
                                    cx={center}
                                    cy={center}
                                    rx={radius * Math.abs(Math.sin(azimuth))}
                                    ry={radius}
                                    fill="none"
                                    stroke={arrowPos.isBack ? '#ef4444' : '#22d3ee'}
                                    strokeWidth="1.5"
                                    opacity={arrowPos.isBack ? 0.175 : 0.35}
                                    clipPath={arrowPos.x > 0 ? "url(#longitudeRight)" : "url(#longitudeLeft)"}
                                />
                                {/* Opposite half - red when forward, cyan when backward */}
                                <ellipse
                                    cx={center}
                                    cy={center}
                                    rx={radius * Math.abs(Math.sin(azimuth))}
                                    ry={radius}
                                    fill="none"
                                    stroke={arrowPos.isBack ? '#22d3ee' : '#ef4444'}
                                    strokeWidth="1.5"
                                    opacity={arrowPos.isBack ? 0.35 : 0.175}
                                    clipPath={arrowPos.x > 0 ? "url(#longitudeLeft)" : "url(#longitudeRight)"}
                                />
                            </>
                        )}
                        
                        {/* Latitude ellipse: horizontal ellipse at constant pitch */}
                        {Math.abs(pitch) > 0.01 && (
                            <>
                                {/* Half containing arrow - cyan when forward, red when backward */}
                                <ellipse
                                    cx={center}
                                    cy={center}
                                    rx={radius}
                                    ry={radius * Math.abs(Math.sin(pitch))}
                                    fill="none"
                                    stroke={arrowPos.isBack ? '#ef4444' : '#22d3ee'}
                                    strokeWidth="1.5"
                                    opacity={arrowPos.isBack ? 0.15 : 0.3}
                                    clipPath={arrowPos.y < 0 ? "url(#latitudeTop)" : "url(#latitudeBottom)"}
                                />
                                {/* Opposite half - red when forward, cyan when backward */}
                                <ellipse
                                    cx={center}
                                    cy={center}
                                    rx={radius}
                                    ry={radius * Math.abs(Math.sin(pitch))}
                                    fill="none"
                                    stroke={arrowPos.isBack ? '#22d3ee' : '#ef4444'}
                                    strokeWidth="1.5"
                                    opacity={arrowPos.isBack ? 0.3 : 0.15}
                                    clipPath={arrowPos.y < 0 ? "url(#latitudeBottom)" : "url(#latitudeTop)"}
                                />
                            </>
                        )}
                        
                        {/* Clip paths for front/back halves */}
                        <defs>
                            <clipPath id="longitudeRight">
                                <rect x={center} y="0" width={center} height={size} />
                            </clipPath>
                            <clipPath id="longitudeLeft">
                                <rect x="0" y="0" width={center} height={size} />
                            </clipPath>
                            <clipPath id="latitudeTop">
                                <rect x="0" y="0" width={size} height={center} />
                            </clipPath>
                            <clipPath id="latitudeBottom">
                                <rect x="0" y={center} width={size} height={center} />
                            </clipPath>
                        </defs>
                        
                        <line
                            x1={center}
                            y1={center}
                            x2={center + arrowPos.x}
                            y2={center + arrowPos.y}
                            stroke={arrowPos.isBack ? '#ef4444' : '#22d3ee'}
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            opacity={0.3 + (arrowPos.length / radius) * 0.5}
                        />
                        {/* Arrow head at arrow position - scales with headScale */}
                        <polygon
                            points="0,-8 -6,4 6,4"
                            fill={arrowPos.isBack ? '#ef4444' : '#22d3ee'}
                            opacity={Math.max(0.1, 0.6 + (arrowPos.headScale - 1) * 0.4)}
                            transform={`translate(${center + arrowPos.x}, ${center + arrowPos.y}) rotate(${(Math.atan2(arrowPos.y, arrowPos.x) * 180 / Math.PI) + 90}) scale(${Math.max(0.9, 0.9 + arrowPos.headScale * 0.1)}, ${Math.max(0.05, arrowPos.headScale)})`}
                        />
                    </svg>
                    
                    {/* Info text - only shown when active */}
                    {isActive && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded">
                                {(azimuth * 180 / Math.PI).toFixed(0)}° / {(pitch * 180 / Math.PI).toFixed(0)}°
                            </span>
                        </div>
                    )}
                </>
        </div>
    );
};

export default RotationHeliotrope;
