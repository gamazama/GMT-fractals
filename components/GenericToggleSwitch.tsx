/**
 * GenericToggleSwitch — Pure UI toggle with no store dependency.
 *
 * This is the rendering core shared by both the main-app ToggleSwitch
 * (which adds fractalStore integration) and the mesh-export page.
 */

import React from 'react';

export interface GenericToggleOption<T> {
    label: string;
    value: T;
    tooltip?: string;
}

export interface GenericToggleSwitchProps<T> {
    label?: string;
    labelSuffix?: React.ReactNode;
    value: T;
    onChange: (val: T) => void;
    options?: GenericToggleOption<T>[];
    color?: string;
    onLfoToggle?: () => void;
    isLfoActive?: boolean;
    icon?: React.ReactNode;
    disabled?: boolean;
    variant?: 'default' | 'dense';
    /** Optional context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void;
    /** Optional help-id for help system integration */
    'data-help-id'?: string;
}

// Map color prop string to vec-style toggle classes
const getToggleColor = (color: string) => {
    if (color.includes('red')) return { on: 'bg-red-500/30 text-red-300 border-red-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('green')) return { on: 'bg-green-500/30 text-green-300 border-green-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('amber') || color.includes('yellow')) return { on: 'bg-amber-500/30 text-amber-300 border-amber-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    if (color.includes('purple')) return { on: 'bg-purple-500/30 text-purple-300 border-purple-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
    return { on: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' };
};

export function GenericToggleSwitch<T extends string | number | boolean>({
    label,
    value,
    onChange,
    options,
    color = 'bg-cyan-600',
    onLfoToggle,
    isLfoActive,
    icon,
    disabled = false,
    variant = 'default',
    labelSuffix,
    onContextMenu,
    ...rest
}: GenericToggleSwitchProps<T>) {
    const handleClick = (val: T) => {
        if (disabled) return;
        onChange(val);
    };

    const handleBooleanClick = () => {
        if (disabled) return;
        onChange(!value as T);
    };

    const toggleColor = getToggleColor(color);

    // --- DENSE (SPREADSHEET) VARIANT ---
    if (variant === 'dense' && !options && typeof value === 'boolean') {
        const tc = getToggleColor(color);
        return (
             <div
                className={`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                data-help-id={rest['data-help-id']}
                onContextMenu={onContextMenu}
                onClick={handleBooleanClick}
             >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-medium tracking-tight truncate select-none">
                        {label}
                    </span>
                </div>

                <div
                    className={`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border ${
                        value ? tc.on : tc.off
                    } ${disabled ? '' : 'hover:brightness-125'}`}
                >{value ? 'ON' : 'OFF'}</div>
             </div>
        );
    }

    // --- OPTIONS (segmented buttons) ---
    if (options) {
        return (
            <div
                className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={rest['data-help-id']}
                onContextMenu={onContextMenu}
            >
                {label && (
                    <div className="flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2">
                        {icon}
                        <span className="text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none">
                            {label}
                        </span>
                    </div>
                )}
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
            data-help-id={rest['data-help-id']}
            onContextMenu={onContextMenu}
        >
            <div
                className={`group/toggle flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm transition-colors ${label ? 'bg-white/[0.12]' : ''} ${disabled ? '' : 'cursor-pointer hover:bg-white/[0.18]'}`}
                onClick={handleBooleanClick}
            >
                {label && (
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0 select-none">
                        {icon}
                        <span className="text-[10px] text-gray-400 group-hover/toggle:text-gray-300 font-medium tracking-tight truncate transition-colors">
                            {label}
                        </span>
                        {labelSuffix}
                    </div>
                )}
                <div className={`flex ${label ? 'border-l border-white/5' : 'flex-1'}`}>
                    <div
                        className={`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${
                            value ? toggleColor.on : toggleColor.off
                        } ${disabled ? 'opacity-40' : 'hover:brightness-125'}
                            ${!label ? 'flex-1' : ''}
                        `}
                    >
                        <span className={`text-[8px] ${value ? 'opacity-90' : 'opacity-50'}`}>{value ? 'ON' : 'OFF'}</span>
                    </div>
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
