
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

export interface ToggleOption<T> {
    label: string;
    value: T;
    tooltip?: string;
}

interface ToggleSwitchProps<T> {
    label?: string;
    value: T;
    onChange: (val: T) => void;
    options?: ToggleOption<T>[];
    helpId?: string;
    color?: string; // e.g. "bg-red-500"
    onLfoToggle?: () => void;
    isLfoActive?: boolean;
    icon?: React.ReactNode; 
    disabled?: boolean;
    variant?: 'default' | 'dense'; // New variant prop
}

function ToggleSwitch<T extends string | number | boolean>({ 
    label, 
    value, 
    onChange, 
    options, 
    helpId,
    color = "bg-cyan-600",
    onLfoToggle,
    isLfoActive,
    icon,
    disabled = false,
    variant = 'default'
}: ToggleSwitchProps<T>) {
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();

    const handleContextMenu = (e: React.MouseEvent) => {
        if (disabled) return;
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    // --- DENSE (SPREADSHEET) VARIANT ---
    if (variant === 'dense' && !options && typeof value === 'boolean') {
        return (
             <div 
                className={`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={helpId}
                onContextMenu={handleContextMenu}
             >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-sans font-medium tracking-tight truncate select-none">
                        {label}
                    </span>
                </div>
                
                <input 
                    type="checkbox" 
                    checked={value} 
                    onChange={() => {
                        handleInteractionStart('param');
                        // @ts-ignore
                        onChange(!value);
                        handleInteractionEnd();
                    }}
                    className={`w-3 h-3 appearance-none border rounded-[2px] cursor-pointer transition-colors ${
                        value 
                        ? 'bg-cyan-600 border-cyan-500' 
                        : 'bg-black/40 border-gray-600 hover:border-gray-400'
                    }`}
                />
             </div>
        );
    }

    // --- DEFAULT VARIANT ---

    const containerClasses = `mb-px flex items-center min-h-[22px] w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`;
    const labelContainerClasses = "flex items-center gap-2 w-[50%] pr-2 shrink-0 select-none overflow-hidden";
    const labelClasses = "text-[10px] text-gray-400 font-medium tracking-tight truncate";
    
    const boolWidth = label ? "w-[90%]" : (onLfoToggle ? "w-[84px]" : "w-[60px]");
    const trackWidthClass = options ? "w-full" : boolWidth;
    const trackClasses = `flex ${trackWidthClass} rounded overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-transparent border border-white/5`;

    const handleOptionClick = (val: T) => {
        if (disabled) return;
        handleInteractionStart('param');
        onChange(val);
        handleInteractionEnd();
    };

    // Boolean Toggle Logic
    const handleBooleanClick = () => {
        if (disabled) return;
        handleInteractionStart('param');
        // @ts-ignore - T is boolean here
        onChange(!value);
        handleInteractionEnd();
    };

    const renderBoolean = () => (
        <div className={trackClasses}>
            <button
                onClick={handleBooleanClick}
                disabled={disabled}
                className={`
                    flex-1 py-0.5 px-1 text-[9px] font-bold uppercase tracking-wide border-r border-white/5 transition-all
                    ${value === false ? 'bg-gray-800 text-gray-400 shadow-inner' : 'bg-transparent text-gray-600 hover:text-gray-400 hover:bg-white/5'}
                `}
            >
                O
            </button>
            <button
                onClick={handleBooleanClick}
                disabled={disabled}
                className={`
                    flex-1 py-0.5 px-1 text-[9px] font-bold uppercase tracking-wide transition-all
                    ${value === true ? `${color} text-white shadow-inner` : 'bg-transparent text-gray-600 hover:text-gray-400 hover:bg-white/5'}
                `}
            >
                I
            </button>
             {onLfoToggle && (
                <button
                    onClick={(e) => { e.stopPropagation(); if(!disabled) onLfoToggle(); }}
                    disabled={disabled}
                    className={`
                        flex-1 py-0.5 px-1 text-[9px] font-bold uppercase tracking-wide border-l border-white/5 transition-all
                        ${isLfoActive
                            ? 'bg-purple-900 text-purple-300 border-purple-700 shadow-inner'
                            : 'bg-transparent text-gray-600 hover:text-purple-400 hover:bg-white/5'}
                    `}
                    title="LFO"
                >
                    X
                </button>
            )}
        </div>
    );

    const renderOptions = () => (
        <div className={trackClasses}>
            {options?.map((opt) => (
                <button
                    key={String(opt.value)}
                    onClick={() => handleOptionClick(opt.value)}
                    disabled={disabled}
                    className={`
                        flex-1 min-w-0 py-1.5 px-1 text-[9px] font-bold uppercase tracking-wide border-r border-white/5 last:border-r-0 transition-all truncate
                        ${value === opt.value 
                            ? 'bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner' 
                            : 'bg-transparent text-gray-600 hover:text-gray-400 hover:bg-white/5'}
                    `}
                    title={opt.tooltip || opt.label}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    if (label) {
        return (
            <div 
                className={containerClasses} 
                data-help-id={helpId}
                onContextMenu={handleContextMenu}
            >
                <div className={labelContainerClasses} title={label}>
                    {icon}
                    <span className={labelClasses}>{label}</span>
                </div>
                <div className={`w-[50%] flex ${!options ? 'justify-center' : ''}`}>
                    {options ? renderOptions() : renderBoolean()}
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`flex flex-col mb-px w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} 
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
        >
            <div className={`flex ${!options ? 'justify-end' : ''}`}>
                {options ? renderOptions() : renderBoolean()}
            </div>
        </div>
    );
}

export default ToggleSwitch;
