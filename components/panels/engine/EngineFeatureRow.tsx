
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DraggableNumber } from '../../Slider';

export type EngineStatus = 'synced' | 'pending' | 'runtime';

export interface EngineFeatureRowProps {
    label: string;
    isActive: boolean;
    onToggle: (v: boolean) => void;
    numericValue?: number;
    onNumericChange?: (v: number) => void;
    options?: { label: string; value: any }[];
    onOptionChange?: (v: any) => void;
    status: EngineStatus; 
    disabled?: boolean;
    hideCheckbox?: boolean;
    description?: string;
    // Range props for sensitivity calculation
    min?: number;
    max?: number;
    step?: number;
}

export const EngineFeatureRow: React.FC<EngineFeatureRowProps> = ({
    label,
    isActive,
    onToggle,
    numericValue,
    onNumericChange,
    options,
    onOptionChange,
    status,
    disabled = false,
    hideCheckbox = false,
    description,
    min,
    max,
    step
}) => {
    // Tooltip Logic
    const [showTooltip, setShowTooltip] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, right: 0 });

    const handleMouseEnter = () => {
        if (!description) return;
        if (rowRef.current) {
            const rect = rowRef.current.getBoundingClientRect();
            setTooltipPos({
                top: rect.top + rect.height / 2,
                // Position to the left of the element with a small gap
                right: window.innerWidth - rect.left + 6 
            });
            setShowTooltip(true);
        }
    };

    const handleMouseLeave = () => setShowTooltip(false);

    // Dense spreadsheet styling
    const textColor = status === 'pending' ? 'text-amber-400' : isActive ? 'text-gray-300' : 'text-gray-500';
    
    // Status Light Logic
    let statusClass = '';
    let statusTitle = '';
    
    switch (status) {
        case 'pending':
            statusClass = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse';
            statusTitle = 'Pending Compilation (Click Apply)';
            break;
        case 'runtime':
            statusClass = 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]';
            statusTitle = 'Runtime Uniform (Instant Update)';
            break;
        case 'synced':
        default:
            statusClass = isActive ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]' : 'bg-gray-700';
            statusTitle = 'Compiled & Active';
            break;
    }

    // Determine current dropdown label if options exist
    const activeLabel = options && numericValue !== undefined 
        ? options.find(o => o.value == numericValue)?.label 
        : '';

    // Calculate Sensitivity for "1% per pixel" feel
    const safeStep = step ?? (numericValue !== undefined && Number.isInteger(numericValue) ? 1 : 0.01);
    let sensitivity = 1.0;
    
    if (min !== undefined && max !== undefined && max > min) {
        const range = max - min;
        // 1 pixel movement should cover 1% of the range
        // DraggableNumber delta = dx * step * sensitivity
        // range * 0.01 = 1 * step * sensitivity
        // sensitivity = (range * 0.01) / step
        sensitivity = (range * 0.01) / safeStep;
    }

    return (
        <>
            <div 
                ref={rowRef}
                className={`flex items-center justify-between px-3 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Tiny Light */}
                    <div 
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${statusClass}`}
                        title={statusTitle}
                    />
                    
                    <span className={`text-[10px] font-sans font-medium tracking-tight truncate ${textColor}`}>
                        {label} {status === 'pending' && '*'}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {options && onOptionChange ? (
                         <div className="relative w-20 h-4 bg-black/40 border border-white/10 rounded-sm hover:border-white/30 transition-colors">
                            <select
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                value={numericValue}
                                onChange={(e) => onOptionChange(Number(e.target.value))}
                            >
                                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
                                 <span className="text-[9px] text-cyan-400 font-mono font-medium truncate pr-1">{activeLabel}</span>
                                 <span className="text-[6px] text-gray-500">▼</span>
                            </div>
                         </div>
                    ) : onNumericChange && numericValue !== undefined && (
                        <div className="w-10 h-4 bg-black/40 border border-white/10 relative overflow-hidden rounded-sm">
                             <DraggableNumber 
                                value={numericValue} 
                                onChange={onNumericChange} 
                                step={safeStep} 
                                min={min}
                                max={max}
                                sensitivity={sensitivity}
                                highlight={isActive}
                             />
                        </div>
                    )}

                    {!hideCheckbox && (
                        <input 
                            type="checkbox" 
                            checked={isActive}
                            onChange={() => onToggle(!isActive)}
                            className={`w-3 h-3 appearance-none border rounded-[2px] cursor-pointer transition-colors ${
                                isActive 
                                ? (status === 'pending' ? 'bg-amber-600 border-amber-500' : 'bg-cyan-600 border-cyan-500') 
                                : 'bg-black/40 border-gray-600 hover:border-gray-400'
                            }`}
                        />
                    )}
                </div>
            </div>
            
            {/* Portal Tooltip */}
            {showTooltip && createPortal(
                <div 
                    className="fixed z-[9999] pointer-events-none flex items-center animate-fade-in"
                    style={{ 
                        top: tooltipPos.top, 
                        right: tooltipPos.right, 
                        transform: 'translateY(-50%)' 
                    }}
                >
                    <div className="bg-black text-white text-[9px] px-2 py-1 rounded border border-white/20 shadow-xl whitespace-nowrap">
                        {description}
                        {/* Right Arrow */}
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white/20" />
                        <div className="absolute top-1/2 -right-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-l-[3px] border-t-transparent border-b-transparent border-l-black" />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
