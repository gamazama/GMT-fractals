/**
 * GenericToggleSwitch — Pure UI toggle with no store dependency.
 *
 * This is the rendering core shared by both the main-app ToggleSwitch
 * (which adds fractalStore integration) and the mesh-export page.
 *
 * INPUT SKIN (2026-09-24, HT-09). Under `soft` (Gradient Explorer v2's tray,
 * @see components/inputs/skin.tsx) a plain BOOLEAN renders as one chip in
 * `InlineToggleButtons`' soft look — the label is the chip, the accent tint
 * means on — instead of the dock's label bar with an "ON"/"OFF" cell, which
 * read as the old dialect inside the new one. Option switches, and a boolean
 * carrying an LFO button, keep the dock look. With no skin (app-gmt, the
 * mesh-export page) every branch renders exactly as before.
 */

import React from 'react';
import { useInputSkin } from './inputs/skin';

export interface GenericToggleOption<T> {
    label: string;
    value: T;
    tooltip?: string;
    /** Optional active-state color override for this option (overrides
     *  the top-level `color` prop when this option is selected). */
    color?: string;
    /** Dim + block just this option (the rest stay live). Additive — options
     *  that don't set it behave exactly as before. */
    disabled?: boolean;
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
    if (color.includes('red')) return { on: 'bg-red-500/30 text-red-300 border-red-500/40', off: 'bg-line/[0.04] text-fg-faint border-line/5' };
    if (color.includes('green')) return { on: 'bg-green-500/30 text-green-300 border-green-500/40', off: 'bg-line/[0.04] text-fg-faint border-line/5' };
    if (color.includes('amber') || color.includes('yellow')) return { on: 'bg-amber-500/30 text-amber-300 border-amber-500/40', off: 'bg-line/[0.04] text-fg-faint border-line/5' };
    if (color.includes('purple')) return { on: 'bg-purple-500/30 text-purple-300 border-purple-500/40', off: 'bg-line/[0.04] text-fg-faint border-line/5' };
    return { on: 'bg-accent-500/30 text-accent-300 border-accent-500/40', off: 'bg-line/[0.04] text-fg-faint border-line/5' };
};

export function GenericToggleSwitch<T extends string | number | boolean>({
    label,
    value,
    onChange,
    options,
    color = 'bg-accent-600',
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
    const soft = useInputSkin() === 'soft';

    // --- SOFT SKIN: a boolean is one chip (see the header) ---
    if (soft && !options && typeof value === 'boolean' && !onLfoToggle) {
        return (
            <div
                className={`mb-px ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={rest['data-help-id']}
                onContextMenu={onContextMenu}
            >
                <button
                    type="button"
                    onClick={handleBooleanClick}
                    disabled={disabled}
                    aria-pressed={value}
                    className={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg text-[13px] whitespace-nowrap border transition-colors ${
                        value
                            ? 'bg-accent-400/15 border-accent-400/40 text-accent-300'
                            : 'bg-surface-section border-line/20 text-fg-muted hover:text-fg hover:border-line/40'
                    }`}
                >
                    {icon}
                    {label ?? (value ? 'On' : 'Off')}
                    {labelSuffix}
                </button>
            </div>
        );
    }

    // --- DENSE (SPREADSHEET) VARIANT ---
    if (variant === 'dense' && !options && typeof value === 'boolean') {
        const tc = getToggleColor(color);
        return (
             <div
                className={`flex items-center justify-between px-3 py-1 border-b border-line/5 hover:bg-line/5 transition-colors ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                data-help-id={rest['data-help-id']}
                onContextMenu={onContextMenu}
                onClick={handleBooleanClick}
             >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-[10px] text-fg-muted font-medium tracking-tight truncate select-none">
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
                className={`mb-px ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                data-help-id={rest['data-help-id']}
                onContextMenu={onContextMenu}
            >
                {label && (
                    <div className="flex items-center bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5 px-2 gap-2">
                        {icon}
                        <span className="text-[10px] text-fg-muted font-medium tracking-tight truncate select-none pointer-events-none">
                            {label}
                        </span>
                    </div>
                )}
                <div className={`flex h-9 md:h-[26px] overflow-hidden ${label ? 'rounded-b-sm' : 'rounded-sm'}`}>
                    {options.map((opt) => {
                        // Per-option color override falls back to the
                        // switch-level `color` prop. Lets one switch
                        // tint individual options differently (GMT's
                        // Render Engine: cyan + purple).
                        const optActive = opt.color ? getToggleColor(opt.color) : toggleColor;
                        return (
                            <button
                                key={String(opt.value)}
                                onClick={() => { if (!opt.disabled) handleClick(opt.value); }}
                                disabled={disabled || opt.disabled}
                                className={`
                                    flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-line/5 last:border-r-0 transition-all truncate
                                    ${value === opt.value
                                        ? optActive.on
                                        : 'bg-line/[0.04] text-fg-faint hover:brightness-125'}
                                    ${opt.disabled ? 'opacity-40 cursor-not-allowed hover:brightness-100' : ''}
                                `}
                                title={opt.tooltip || opt.label}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- BOOLEAN toggle ---
    return (
        <div
            className={`mb-px ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            data-help-id={rest['data-help-id']}
            onContextMenu={onContextMenu}
        >
            <div
                className={`group/toggle flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm transition-colors ${label ? 'bg-line/[0.12]' : ''} ${disabled ? '' : 'cursor-pointer hover:bg-line/[0.18]'}`}
                onClick={handleBooleanClick}
            >
                {label && (
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0 select-none">
                        {icon}
                        <span className="text-[10px] text-fg-muted group-hover/toggle:text-fg-tertiary font-medium tracking-tight truncate transition-colors">
                            {label}
                        </span>
                        {labelSuffix}
                    </div>
                )}
                <div className={`flex ${label ? 'border-l border-line/5' : 'flex-1'}`}>
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
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-line/5 ${
                                isLfoActive
                                    ? 'bg-secondary/30 text-secondary'
                                    : 'bg-line/[0.04] text-fg-faint hover:brightness-125'}
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
