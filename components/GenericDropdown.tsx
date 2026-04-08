/**
 * GenericDropdown — Pure UI dropdown with no store dependency.
 *
 * This is the rendering core shared by both the main-app Dropdown
 * (which adds fractalStore integration) and the mesh-export page.
 */

import React from 'react';
import { ChevronDown } from './Icons';

export interface GenericDropdownOption<T> {
    label: string;
    value: T;
}

export interface GenericDropdownProps<T> {
    label?: string;
    value: T;
    options: GenericDropdownOption<T>[];
    onChange: (value: T) => void;
    fullWidth?: boolean;
    className?: string;
    selectClassName?: string;
    labelSuffix?: React.ReactNode;
    /** Optional help-id for help system integration */
    'data-help-id'?: string;
    /** Optional context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void;
    disabled?: boolean;
}

export function GenericDropdown<T extends string | number>({
    label,
    value,
    options,
    onChange,
    fullWidth,
    className = '',
    selectClassName = '',
    labelSuffix,
    onContextMenu,
    disabled = false,
    ...rest
}: GenericDropdownProps<T>) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const isNumber = typeof options[0]?.value === 'number';
        onChange((isNumber ? Number(val) : val) as T);
    };

    return (
        <div
            className={`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
            data-help-id={rest['data-help-id']}
            onContextMenu={onContextMenu}
        >
            {label && (
                <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                    <label className="text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400">
                        {label}{labelSuffix}
                    </label>
                </div>
            )}
            <div
                className={`${label ? 'w-1/2' : 'w-full'} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`}
            >
                <select
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className={`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${selectClassName}`}
                >
                    {options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)} className="bg-[#111] text-gray-300">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                   <div className="w-2.5 h-2.5"><ChevronDown /></div>
                </div>
            </div>
        </div>
    );
}
