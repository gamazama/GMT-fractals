
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
    labelSuffix?: React.ReactNode;
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

// Map color prop string to vec-style toggle classes
const getToggleColor = (color: string) => {
    if (color.includes('red')) return { on: 'bg-red-500/30 text-red-300 border-red-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('green')) return { on: 'bg-green-500/30 text-green-300 border-green-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('amber') || color.includes('yellow')) return { on: 'bg-amber-500/30 text-amber-300 border-amber-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('purple')) return { on: 'bg-purple-500/30 text-purple-300 border-purple-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    return { on: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
};

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
    variant = 'default',
    labelSuffix
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
        const tc = getToggleColor(color);
        return (
             <div
                className={`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={helpId}
                onContextMenu={handleContextMenu}
             >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-medium tracking-tight truncate select-none">
                        {label}
                    </span>
                </div>

                <button
                    onClick={() => {
                        handleInteractionStart('param');
                        onChange(!value as T);
                        handleInteractionEnd();
                    }}
                    className={`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border cursor-pointer ${
                        value ? tc.on : tc.off
                    } ${disabled ? '' : 'hover:brightness-125'}`}
                >{value ? 'ON' : 'OFF'}</button>
             </div>
        );
    }

    // --- DEFAULT VARIANT ---

    const handleClick = (val: T) => {
        if (disabled) return;
        handleInteractionStart('param');
        onChange(val);
        handleInteractionEnd();
    };

    const handleBooleanClick = () => {
        if (disabled) return;
        handleInteractionStart('param');
        onChange(!value as T);
        handleInteractionEnd();
    };

    const toggleColor = getToggleColor(color);

    // --- OPTIONS (segmented buttons) ---
    if (options) {
        return (
            <div
                className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={helpId}
                onContextMenu={handleContextMenu}
            >
                {/* Label header — matches vec input header */}
                {label && (
                    <div className="flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2">
                        {icon}
                        <span className="text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none">
                            {label}
                        </span>
                    </div>
                )}
                {/* Segmented buttons row */}
                <div className={`flex h-9 md:h-[26px] overflow-hidden ${label ? 'rounded-b-sm' : 'rounded-sm'}`}>
                    {options.map((opt) => (
                        <button
                            key={String(opt.value)}
                            onClick={() => handleClick(opt.value)}
                            disabled={disabled}
                            className={`
                                flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-white/5 last:border-r-0 transition-all truncate
                                ${value === opt.value
                                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                                    : 'bg-white/[0.04] text-gray-600 hover:brightness-125'}
                            `}
                            title={opt.tooltip || opt.label}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- BOOLEAN toggle ---
    return (
        <div
            className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
        >
            {/* Single row: label left, toggle right — matches vec input layout */}
            <div className={`flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm ${label ? 'bg-white/[0.12]' : ''}`}>
                {/* Label area */}
                {label && (
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0 select-none">
                        {icon}
                        <span className="text-[10px] text-gray-400 font-medium tracking-tight truncate pointer-events-none">
                            {label}
                        </span>
                        {labelSuffix}
                    </div>
                )}
                {/* Toggle button(s) */}
                <div className={`flex ${label ? 'border-l border-white/5' : 'flex-1'}`}>
                    <button
                        onClick={handleBooleanClick}
                        disabled={disabled}
                        className={`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${
                            value ? toggleColor.on : toggleColor.off
                        } ${disabled ? 'opacity-40' : 'cursor-pointer hover:brightness-125'}
                            ${!label ? 'flex-1' : ''}
                        `}
                    >
                        <span className={`text-[8px] ${value ? 'opacity-90' : 'opacity-50'}`}>{value ? 'ON' : 'OFF'}</span>
                    </button>
                    {onLfoToggle && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (!disabled) onLfoToggle(); }}
                            disabled={disabled}
                            className={`
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-white/5 ${
                                isLfoActive
                                    ? 'bg-purple-500/30 text-purple-300'
                                    : 'bg-white/[0.04] text-gray-600 hover:brightness-125'}
                            `}
                            title="LFO"
                        >
                            <span className={`text-[8px] ${isLfoActive ? 'opacity-90' : 'opacity-50'}`}>LFO</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ToggleSwitch;
