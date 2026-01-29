
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { getGradientCssString } from '../utils/colorUtils';
import { GradientStop } from '../types';
import { DraggableNumber } from './Slider';
import { analyzeHistogram, calculateSmartLevels } from '../utils/histogramUtils';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

interface HistogramProps {
    data: Float32Array | null;
    
    // Range (Levels)
    min: number;
    max: number;
    gamma: number; // Midtone bias
    
    // Pattern modifiers (New)
    repeats?: number;
    phase?: number;
    
    // Optional Gradient Preview (for Coloring Layer)
    gradientStops?: GradientStop[];
    
    // Callbacks
    onChange: (vals: { min: number, max: number, gamma: number }) => void;
    
    // Auto features (optional)
    autoUpdate?: boolean;
    onToggleAuto?: () => void;
    onRefresh?: () => void;
    
    // Styling
    height?: number;
    
    // Custom Labels
    labelTitle?: string;
    labelLeft?: string;
    labelMid?: string;
    labelRight?: string;

    // Fixed Range Override (e.g. 0-1 for Post Process)
    fixedRange?: { min: number, max: number };
}

const Histogram: React.FC<HistogramProps> = ({ 
    data, 
    min, max, gamma,
    repeats = 1.0, phase = 0.0,
    gradientStops,
    onChange,
    autoUpdate, onToggleAuto, onRefresh,
    height = 48,
    labelTitle = "Levels",
    labelLeft = "Black",
    labelMid = "Gamma",
    labelRight = "White",
    fixedRange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [viewRange, setViewRange] = useState(fixedRange || { min: 0, max: 1 });
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    
    // Process data into buckets
    const histogramBuckets = useMemo(() => {
        const result = analyzeHistogram(data, fixedRange);
        if (!result) {
            if (fixedRange) setViewRange(fixedRange);
            return [];
        }
        setViewRange({ min: result.min, max: result.max });
        return result.buckets;
    }, [data, fixedRange]);

    // Calculate Gamma Handle Position
    // Mapping: normalized x = 0.5 ^ (1/gamma) 
    const gammaPosPct = Math.pow(0.5, gamma) * 100;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (histogramBuckets.length === 0) return;

        // Draw Bars
        const w = canvas.width;
        const h = canvas.height;
        const barW = w / histogramBuckets.length;
        
        ctx.fillStyle = '#666';
        
        histogramBuckets.forEach((val, i) => {
            const barH = val * h;
            ctx.fillRect(i * barW, h - barH, barW, barH);
        });
        
    }, [histogramBuckets]);

    // Map min/max to percentages of the current histogram view range
    const toViewPercent = (val: number) => {
        const span = viewRange.max - viewRange.min;
        if (span < 0.00001) return 50;
        return ((val - viewRange.min) / span) * 100;
    };
    
    // Use fixed range or fallback to viewRange for sliders even if no data
    const hasDataOrFixed = histogramBuckets.length > 0 || fixedRange;
    const leftPct = hasDataOrFixed ? toViewPercent(min) : 0;
    const rightPct = hasDataOrFixed ? toViewPercent(max) : 100;
    
    // Gamma Handle is relative to the ACTIVE range
    const rangeWidthPct = rightPct - leftPct;
    const gammaHandleAbsPct = leftPct + (gammaPosPct / 100) * rangeWidthPct;

    // Interaction
    const dragRef = useRef<{ 
        type: 'min' | 'max' | 'gamma' | 'pan', 
        startX: number, 
        startMin: number, 
        startMax: number, 
        startGamma: number
    } | null>(null);

    const handleMouseDown = (e: React.MouseEvent, type: 'min' | 'max' | 'gamma' | 'pan') => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { 
            type, 
            startX: e.clientX, 
            startMin: min, 
            startMax: max,
            startGamma: gamma
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragRef.current || !canvasRef.current) return;
        const { type, startX, startMin, startMax, startGamma } = dragRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        
        const deltaPx = e.clientX - startX;
        
        // Convert pixel delta to value delta based on VIEW range
        const viewSpan = viewRange.max - viewRange.min;
        // If no data and no fixed range, default to 1.0 span
        const effectiveSpan = (histogramBuckets.length > 0 || fixedRange) ? viewSpan : 1.0;
        
        const deltaVal = (deltaPx / rect.width) * effectiveSpan;

        let newMin = startMin;
        let newMax = startMax;
        let newGamma = startGamma;

        if (type === 'min') {
            newMin += deltaVal;
        } else if (type === 'max') {
            newMax += deltaVal;
        } else if (type === 'pan') {
            newMin += deltaVal;
            newMax += deltaVal;
        } else if (type === 'gamma') {
            // Gamma logic:
            // The handle position represents the 0.5 mid-point.
            const currentRangePx = (rect.width * Math.abs(startMax - startMin)) / effectiveSpan;
            
            // Initial relative handle position
            const startRelPos = Math.pow(0.5, startGamma); 
            const startHandlePx = startRelPos * currentRangePx;
            
            const newHandlePx = Math.max(1, Math.min(currentRangePx - 1, startHandlePx + deltaPx));
            const newRelPos = newHandlePx / currentRangePx;
            
            newGamma = Math.log(newRelPos) / Math.log(0.5);
            newGamma = Math.max(0.1, Math.min(10.0, newGamma));
        }
        
        // Ensure min < max
        if (newMin >= newMax) {
            if (type === 'min') newMin = newMax - 0.001;
            if (type === 'max') newMax = newMin + 0.001;
        }
        
        onChange({ min: newMin, max: newMax, gamma: newGamma });
    };

    const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
    
    const handleAuto = () => {
        if (histogramBuckets.length === 0) return;
        const result = calculateSmartLevels(histogramBuckets, viewRange.min, viewRange.max);
        if (result) {
            onChange({ min: result.start, max: result.end, gamma: 1.0 });
        }
    };
    
    const handleReset = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange({ min: 0.0, max: 1.0, gamma: 1.0 });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    // Prepare Gradient Background (Either User Stops or Grayscale Gamma Curve)
    const backgroundGradient = useMemo(() => {
        if (gradientStops) {
            // Use provided stops but apply the Gamma (Bias) to them visually
            return getGradientCssString(gradientStops, gamma);
        } else {
            return getGradientCssString([
                { id: 'b', position: 0, color: '#000000' },
                { id: 'w', position: 1, color: '#ffffff' }
            ], gamma);
        }
    }, [gradientStops, gamma]);
    
    // Dynamic Gradient Style for Repeats/Phase
    const gradientStyle: React.CSSProperties = {
        left: `${leftPct}%`, 
        width: `${Math.max(0, rightPct - leftPct)}%`,
        backgroundImage: backgroundGradient,
        backgroundSize: `${(100 / Math.max(0.1, repeats))}% 100%`,
        backgroundPosition: `${phase * 100}% 0%`, 
        backgroundRepeat: 'repeat-x'
    };

    return (
        <div className="py-2 bg-gray-900/40" data-help-id="ui.histogram" onContextMenu={handleContextMenu}>
            <div className="flex justify-between items-center mb-2 px-3">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{labelTitle}</label>
                    {onToggleAuto && (
                        <div 
                            className="flex items-center justify-center w-4 h-4 cursor-pointer group rounded hover:bg-white/10"
                            onClick={onToggleAuto}
                            title="Auto-update histogram (Live)"
                        >
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${autoUpdate ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-gray-600'}`} />
                        </div>
                    )}
                    {onRefresh && !autoUpdate && (
                         <button onClick={onRefresh} className="text-[9px] text-cyan-500 hover:text-white ml-1">
                             REFRESH
                         </button>
                    )}
                </div>
                {onToggleAuto && (
                    <button 
                        onClick={handleAuto}
                        className="px-2 py-0.5 bg-cyan-900/40 hover:bg-cyan-700 text-cyan-400 text-[9px] rounded border border-cyan-800 transition-colors uppercase font-bold"
                        title="Fit range to current data"
                    >
                        Fit
                    </button>
                )}
            </div>
            
            <div 
                className={`relative w-full bg-black/60 overflow-hidden select-none border-y border-white/5 transition-colors group/hist ${onRefresh && !autoUpdate ? 'cursor-pointer hover:bg-black/40' : ''}`}
                style={{ height }}
                onClick={onRefresh && !autoUpdate ? onRefresh : undefined}
            >
                {/* Content Area - Added mx-3 margin to prevent handle clipping at edges */}
                <div className="absolute inset-0 right-4 left-3 mx-2">
                    {/* Histogram Canvas */}
                    <canvas ref={canvasRef} width={320} height={height} className="w-full h-full opacity-40 absolute inset-0" />
                    
                    {/* Active Range Overlay with Gradient */}
                    <div 
                        className="absolute top-0 bottom-0 opacity-40 pointer-events-none"
                        style={gradientStyle}
                    />

                    {/* Left Handle (Min) */}
                    <div 
                        className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/min flex justify-center"
                        style={{ left: `${leftPct}%` }}
                        onMouseDown={(e) => handleMouseDown(e, 'min')}
                    >
                        <div className="w-px h-full bg-white/60 group-hover/min:bg-white group-hover/min:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]" />
                        <div className="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                    </div>

                    {/* Right Handle (Max) */}
                    <div 
                        className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/max flex justify-center"
                        style={{ left: `${rightPct}%` }}
                        onMouseDown={(e) => handleMouseDown(e, 'max')}
                    >
                        <div className="w-px h-full bg-white/60 group-hover/max:bg-white group-hover/max:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]" />
                        <div className="absolute bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white" />
                    </div>
                    
                    {/* Gamma Handle (Mid) */}
                    {rangeWidthPct > 5 && (
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 cursor-ew-resize z-30 group/gamma flex items-center justify-center"
                            style={{ left: `${gammaHandleAbsPct}%` }}
                            onMouseDown={(e) => handleMouseDown(e, 'gamma')}
                        >
                            <div className="w-2 h-2 rotate-45 bg-gray-400 border border-black group-hover/gamma:bg-white group-hover/gamma:scale-125 transition-transform shadow-md" />
                        </div>
                    )}
                    
                    {/* Pan Area */}
                    <div 
                        className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing z-10"
                        style={{ left: `${leftPct}%`, width: `${Math.max(0, rightPct - leftPct)}%` }}
                        onMouseDown={(e) => handleMouseDown(e, 'pan')}
                    />
                </div>
                
                {/* Hidden Reset Button - Outside the interactive area */}
                <button 
                    onClick={handleReset}
                    className="absolute top-0 bottom-0 right-0 w-4 bg-red-900/50 hover:bg-red-700/80 border-l border-white/10 z-40 opacity-0 group-hover/hist:opacity-100 transition-opacity flex items-center justify-center"
                    title="Reset Range"
                >
                     <div className="w-px h-2 bg-white/80 rotate-45 transform origin-center absolute" />
                     <div className="w-px h-2 bg-white/80 -rotate-45 transform origin-center absolute" />
                </button>
            </div>
            
            {/* Numeric Inputs */}
            <div className="flex justify-between items-center mt-2 px-3">
                <div className="flex flex-col items-start w-16">
                    <span className="text-[8px] text-gray-600 uppercase tracking-widest">{labelLeft}</span>
                    <DraggableNumber 
                        value={min} 
                        onChange={(v) => onChange({ min: v, max, gamma })}
                        step={0.01}
                        min={-Infinity} max={Infinity}
                        highlight
                    />
                </div>
                
                <div className="flex flex-col items-center w-16">
                    <span className="text-[8px] text-gray-600 uppercase tracking-widest">{labelMid}</span>
                    <DraggableNumber 
                        value={gamma} 
                        onChange={(v) => onChange({ min, max, gamma: v })}
                        step={0.01}
                        min={0.1} max={10.0}
                        overrideText={gamma.toFixed(2)}
                    />
                </div>
                
                <div className="flex flex-col items-end w-16">
                    <span className="text-[8px] text-gray-600 uppercase tracking-widest">{labelRight}</span>
                    <DraggableNumber 
                        value={max} 
                        onChange={(v) => onChange({ min, max: v, gamma })}
                        step={0.01}
                        min={-Infinity} max={Infinity}
                        highlight
                    />
                </div>
            </div>
        </div>
    );
};

export default Histogram;
