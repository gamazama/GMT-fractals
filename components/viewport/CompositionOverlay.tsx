
import React from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { CompositionOverlayType, CompositionOverlaySettings } from '../../types';

interface CompositionOverlayProps {
    width: number;
    height: number;
}

/**
 * Composition overlay component for viewport composition guides.
 * Renders grid, rule of thirds, golden ratio, spiral, center mark, or safe area overlays.
 * Purely visual - does not affect rendering.
 * Inspired by Blender/C4D composition guides.
 */
export const CompositionOverlay: React.FC<CompositionOverlayProps> = ({ width, height }) => {
    const overlayType = useFractalStore(s => s.compositionOverlay);
    const settings = useFractalStore(s => s.compositionOverlaySettings);
    
    if (overlayType === 'none' || !overlayType) return null;
    
    // Apply settings
    const { opacity, lineThickness, color } = settings;
    
    // Parse color - handle both rgba and rgb formats
    let strokeColor = color;
    if (color.startsWith('rgba')) {
        // Replace the alpha value in rgba
        strokeColor = color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${opacity})`);
    } else if (color.startsWith('rgb(')) {
        // Convert rgb to rgba
        strokeColor = color.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${opacity})`);
    }
    
    return (
        <svg 
            className="absolute inset-0 pointer-events-none z-[15]"
            width={width}
            height={height}
            style={{ mixBlendMode: 'difference' }}
        >
            {overlayType === 'grid' && (
                <GridOverlay 
                    width={width} 
                    height={height} 
                    strokeColor={strokeColor} 
                    lineThickness={lineThickness}
                    divisionsX={settings.gridDivisionsX}
                    divisionsY={settings.gridDivisionsY}
                />
            )}
            {overlayType === 'thirds' && (
                <ThirdsOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            {overlayType === 'golden' && (
                <GoldenOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            {overlayType === 'spiral' && (
                <SpiralOverlay 
                    width={width} 
                    height={height} 
                    strokeColor={strokeColor} 
                    lineThickness={lineThickness}
                    rotation={settings.spiralRotation}
                    positionX={settings.spiralPositionX}
                    positionY={settings.spiralPositionY}
                    scale={settings.spiralScale}
                />
            )}
            {overlayType === 'center' && (
                <CenterMarkOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            {overlayType === 'diagonal' && (
                <DiagonalOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            {overlayType === 'safearea' && (
                <SafeAreaOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            
            {/* Additional overlays */}
            {settings.showCenterMark && overlayType !== 'center' && (
                <CenterMarkOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness} />
            )}
            {settings.showSafeAreas && overlayType !== 'safearea' && (
                <SafeAreaOverlay width={width} height={height} strokeColor={strokeColor} lineThickness={lineThickness * 0.5} />
            )}
        </svg>
    );
};

// Simple grid overlay with adjustable divisions
const GridOverlay: React.FC<{ 
    width: number; 
    height: number; 
    strokeColor: string; 
    lineThickness: number;
    divisionsX?: number;
    divisionsY?: number;
}> = ({ width, height, strokeColor, lineThickness, divisionsX = 4, divisionsY = 4 }) => {
    const lines = [];
    
    // Vertical lines
    for (let i = 1; i < divisionsX; i++) {
        const x = (width / divisionsX) * i;
        lines.push(
            <line key={`v${i}`} x1={x} y1={0} x2={x} y2={height} stroke={strokeColor} strokeWidth={lineThickness * 0.5} />
        );
    }
    
    // Horizontal lines
    for (let i = 1; i < divisionsY; i++) {
        const y = (height / divisionsY) * i;
        lines.push(
            <line key={`h${i}`} x1={0} y1={y} x2={width} y2={y} stroke={strokeColor} strokeWidth={lineThickness * 0.5} />
        );
    }
    
    return <>{lines}</>;
};

// Rule of thirds overlay
const ThirdsOverlay: React.FC<{ width: number; height: number; strokeColor: string; lineThickness: number }> = ({ width, height, strokeColor, lineThickness }) => {
    const thirdW = width / 3;
    const thirdH = height / 3;
    
    return (
        <>
            {/* Vertical lines */}
            <line x1={thirdW} y1={0} x2={thirdW} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            <line x1={thirdW * 2} y1={0} x2={thirdW * 2} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            
            {/* Horizontal lines */}
            <line x1={0} y1={thirdH} x2={width} y2={thirdH} stroke={strokeColor} strokeWidth={lineThickness} />
            <line x1={0} y1={thirdH * 2} x2={width} y2={thirdH * 2} stroke={strokeColor} strokeWidth={lineThickness} />
            
            {/* Power points (intersections) */}
            <circle cx={thirdW} cy={thirdH} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={thirdW * 2} cy={thirdH} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={thirdW} cy={thirdH * 2} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={thirdW * 2} cy={thirdH * 2} r={lineThickness * 3} fill={strokeColor} />
        </>
    );
};

// Golden ratio overlay (Phi grid)
const GoldenOverlay: React.FC<{ width: number; height: number; strokeColor: string; lineThickness: number }> = ({ width, height, strokeColor, lineThickness }) => {
    const phi = 1.618033988749895;
    const goldenW = width / phi;
    const goldenH = height / phi;
    
    return (
        <>
            {/* Vertical lines (from left and right) */}
            <line x1={goldenW} y1={0} x2={goldenW} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            <line x1={width - goldenW} y1={0} x2={width - goldenW} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            
            {/* Horizontal lines (from top and bottom) */}
            <line x1={0} y1={goldenH} x2={width} y2={goldenH} stroke={strokeColor} strokeWidth={lineThickness} />
            <line x1={0} y1={height - goldenH} x2={width} y2={height - goldenH} stroke={strokeColor} strokeWidth={lineThickness} />
            
            {/* Golden points */}
            <circle cx={goldenW} cy={goldenH} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={width - goldenW} cy={goldenH} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={goldenW} cy={height - goldenH} r={lineThickness * 3} fill={strokeColor} />
            <circle cx={width - goldenW} cy={height - goldenH} r={lineThickness * 3} fill={strokeColor} />
        </>
    );
};

// Fibonacci spiral overlay with adjustable parameters
const SpiralOverlay: React.FC<{ 
    width: number; 
    height: number; 
    strokeColor: string; 
    lineThickness: number;
    rotation?: number;
    positionX?: number;
    positionY?: number;
    scale?: number;
}> = ({ width, height, strokeColor, lineThickness, rotation = 0, positionX = 0.5, positionY = 0.5, scale = 1.0 }) => {
    // Generate Fibonacci spiral path
    const phi = 1.618033988749895;
    const minDim = Math.min(width, height);
    
    // Calculate spiral center from position (0-1 range)
    const centerX = width * positionX;
    const centerY = height * positionY;
    const maxRadius = minDim * 0.45 * scale;
    
    // Rotation in radians
    const rotationRad = (rotation * Math.PI) / 180;
    
    // Generate spiral points
    const points: string[] = [];
    const turns = 3;
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * turns * 2 * Math.PI;
        const r = maxRadius * Math.pow(phi, -t / (2 * Math.PI));
        // Apply rotation offset
        const x = centerX + r * Math.cos(t + rotationRad);
        const y = centerY + r * Math.sin(t + rotationRad);
        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    
    return (
        <>
            {/* Spiral path */}
            <path 
                d={points.join(' ')} 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth={lineThickness * 1.5}
                strokeLinecap="round"
            />
            
            {/* Golden ratio guides (lighter) */}
            <GoldenOverlay width={width} height={height} strokeColor={strokeColor.replace(/[\d.]+\)$/, '0.2)')} lineThickness={lineThickness * 0.5} />
        </>
    );
};

// Center mark overlay (crosshair)
const CenterMarkOverlay: React.FC<{ width: number; height: number; strokeColor: string; lineThickness: number }> = ({ width, height, strokeColor, lineThickness }) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const markSize = Math.min(width, height) * 0.05;
    
    return (
        <>
            {/* Horizontal line */}
            <line x1={centerX - markSize} y1={centerY} x2={centerX + markSize} y2={centerY} stroke={strokeColor} strokeWidth={lineThickness} />
            {/* Vertical line */}
            <line x1={centerX} y1={centerY - markSize} x2={centerX} y2={centerY + markSize} stroke={strokeColor} strokeWidth={lineThickness} />
            {/* Center circle */}
            <circle cx={centerX} cy={centerY} r={markSize * 0.3} fill="none" stroke={strokeColor} strokeWidth={lineThickness} />
        </>
    );
};

// Diagonal lines overlay
const DiagonalOverlay: React.FC<{ width: number; height: number; strokeColor: string; lineThickness: number }> = ({ width, height, strokeColor, lineThickness }) => {
    return (
        <>
            {/* Main diagonals */}
            <line x1={0} y1={0} x2={width} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            <line x1={width} y1={0} x2={0} y2={height} stroke={strokeColor} strokeWidth={lineThickness} />
            
            {/* Center cross */}
            <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke={strokeColor} strokeWidth={lineThickness * 0.5} strokeDasharray="4 4" />
            <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={strokeColor} strokeWidth={lineThickness * 0.5} strokeDasharray="4 4" />
        </>
    );
};

// Safe area overlay (action safe and title safe zones)
const SafeAreaOverlay: React.FC<{ width: number; height: number; strokeColor: string; lineThickness: number }> = ({ width, height, strokeColor, lineThickness }) => {
    // Action safe: 90% of frame
    const actionMargin = 0.05; // 5% on each side = 90% total
    const actionX = width * actionMargin;
    const actionY = height * actionMargin;
    const actionW = width * (1 - actionMargin * 2);
    const actionH = height * (1 - actionMargin * 2);
    
    // Title safe: 80% of frame
    const titleMargin = 0.10; // 10% on each side = 80% total
    const titleX = width * titleMargin;
    const titleY = height * titleMargin;
    const titleW = width * (1 - titleMargin * 2);
    const titleH = height * (1 - titleMargin * 2);
    
    return (
        <>
            {/* Action safe (outer) */}
            <rect 
                x={actionX} 
                y={actionY} 
                width={actionW} 
                height={actionH} 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth={lineThickness}
            />
            
            {/* Title safe (inner) */}
            <rect 
                x={titleX} 
                y={titleY} 
                width={titleW} 
                height={titleH} 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth={lineThickness * 0.5}
                strokeDasharray="4 4"
            />
            
            {/* Corner marks for action safe */}
            {[[actionX, actionY], [actionX + actionW, actionY], [actionX, actionY + actionH], [actionX + actionW, actionY + actionH]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={lineThickness * 2} fill={strokeColor} />
            ))}
        </>
    );
};

export default CompositionOverlay;
