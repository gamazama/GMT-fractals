
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from '../Icons';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';

const RATIO_PRESETS: { label: string; ratio: number | 'Max' }[] = [
    { label: 'Maximum', ratio: 'Max' },
    { label: 'Square (1:1)', ratio: 1.0 },
    { label: 'Landscape (16:9)', ratio: 1.7777 },
    { label: 'Portrait (4:5)', ratio: 0.8 },
    { label: 'Social (9:16)', ratio: 0.5625 },
    { label: 'Cinematic (2.35:1)', ratio: 2.35 },
    { label: 'Classic (4:3)', ratio: 1.3333 },
    { label: 'Skybox (2:1)', ratio: 2.0 },
];

interface FixedResolutionControlsProps {
    width: number;
    height: number;
    top: number;
    left: number;
    maxAvailableWidth: number;
    maxAvailableHeight: number;
    onSetResolution: (w: number, h: number) => void;
    onSetMode: (mode: 'Full' | 'Fixed') => void;
}

export const FixedResolutionControls: React.FC<FixedResolutionControlsProps> = ({
    width, height, top, left, maxAvailableWidth, maxAvailableHeight, onSetResolution, onSetMode
}) => {
    const [showResMenu, setShowResMenu] = useState(false);
    const presetMenuRef = useRef<HTMLDivElement>(null);
    
    // Track X and Y start positions
    const dragResRef = useRef<{ startX: number, startY: number, startW: number, startH: number, hasMoved: boolean } | null>(null);
    
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);

    useEffect(() => {
        if (!showResMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
                setShowResMenu(false);
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [showResMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    const handleResDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        
        dragResRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startW: width,
            startH: height,
            hasMoved: false
        };
    };

    const handleResMove = (e: React.PointerEvent) => {
        if (!dragResRef.current) return;
        
        // Invert X so dragging LEFT (negative mouse movement) creates a POSITIVE delta
        const dx = dragResRef.current.startX - e.clientX; 
        const dy = dragResRef.current.startY - e.clientY; // Invert Y so UP is positive
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragResRef.current.hasMoved = true;
        
        // Coarse Control: Up/Down (4px per step)
        const coarseSteps = Math.round(dy / 4);
        // Precision Control: Left/Right (20px per step - 5x slower)
        const fineSteps = Math.round(dx / 20);

        const totalSteps = coarseSteps + fineSteps;
        // Each step is 8px
        const delta = totalSteps * 8;
        
        if (delta !== 0) {
            const ratio = dragResRef.current.startW / dragResRef.current.startH;
            
            // Scale based on Width change, maintaining Aspect Ratio
            const newW = Math.max(64, dragResRef.current.startW + delta);
            // Snap width to 8
            const snappedW = Math.round(newW / 8) * 8;
            
            // Calculate height via aspect ratio, then snap to 8
            const rawH = snappedW / ratio;
            const snappedH = Math.max(64, Math.round(rawH / 8) * 8);
            
            onSetResolution(snappedW, snappedH);
        }
    };

    const handleResUp = (e: React.PointerEvent) => {
        (e.target as Element).releasePointerCapture(e.pointerId);
        if (dragResRef.current && !dragResRef.current.hasMoved) {
            // It was a click, toggle menu
            setShowResMenu(prev => !prev);
        }
        dragResRef.current = null;
    };
    
    // Fit Logic: Finds the largest WxH that fits in the window with padding
    const applyPreset = (targetRatio: number | 'Max') => {
        const padding = 40;
        const availW = Math.max(100, maxAvailableWidth - padding);
        const availH = Math.max(100, maxAvailableHeight - padding);
        
        let newW, newH;

        if (targetRatio === 'Max') {
            newW = availW;
            newH = availH;
        } else {
            const currentScreenRatio = availW / availH;

            if (currentScreenRatio > targetRatio) {
                // Screen is wider than target -> Height is the bottleneck
                newH = availH;
                newW = newH * targetRatio;
            } else {
                // Screen is taller/narrower -> Width is the bottleneck
                newW = availW;
                newH = newW / targetRatio;
            }
        }
        
        // Snap to GPU-friendly multiples of 8
        const snappedW = Math.round(newW / 8) * 8;
        const snappedH = Math.round(newH / 8) * 8;
        
        onSetResolution(snappedW, snappedH);
        setShowResMenu(false);
    };

    return (
        <div 
            className="absolute flex items-center gap-2 z-50 transition-all duration-100 ease-out"
            style={{ top, left }}
            data-help-id="ui.resolution"
            onContextMenu={handleContextMenu}
        >
            <div 
                className="relative text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-white/10 shadow-sm backdrop-blur-md cursor-ns-resize hover:text-white hover:border-cyan-500/50 transition-colors select-none flex items-center gap-2"
                onPointerDown={handleResDown}
                onPointerMove={handleResMove}
                onPointerUp={handleResUp}
                title="Drag Up or Left to Increase Size"
            >
                <span>{width} <span className="text-gray-600">x</span> {height}</span>
                <span className="opacity-50"><ChevronDown /></span>
            </div>
            
            {showResMenu && (
                <div 
                    ref={presetMenuRef}
                    className="absolute top-8 left-0 w-32 bg-black border border-white/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-fade-in"
                >
                    <div className="px-3 py-1 text-[8px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 mb-1">Fit to Window</div>
                    {RATIO_PRESETS.map(p => (
                        <button 
                            key={p.label}
                            onClick={() => applyPreset(p.ratio)}
                            className="text-left px-3 py-1.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between"
                        >
                            <span>{p.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <button 
                onClick={(e) => { e.stopPropagation(); onSetMode('Full'); }}
                className="flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-black/80 px-2 py-1 rounded border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm backdrop-blur-md uppercase tracking-wide group"
                title="Return to Fullscreen Mode"
            >
                <span className="w-2 h-2 border border-current rounded-sm group-hover:scale-110 transition-transform"></span>
                Fill
            </button>
        </div>
    );
};
