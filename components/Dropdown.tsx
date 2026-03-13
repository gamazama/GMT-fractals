
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { ChevronDown } from './Icons';

interface DropdownOption<T> {
    label: string;
    value: T;
}

interface DropdownProps<T> {
    label?: string;
    value: T;
    options: DropdownOption<T>[];
    onChange: (value: T) => void;
    helpId?: string;
    fullWidth?: boolean;
    className?: string;
    selectClassName?: string;
    labelSuffix?: React.ReactNode;
}

export function Dropdown<T extends string | number>({ label, value, options, onChange, helpId, fullWidth, className = '', selectClassName = '', labelSuffix }: DropdownProps<T>) {
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleInteractionStart('param');
        const val = e.target.value;
        const isNumber = typeof options[0]?.value === 'number';
        onChange((isNumber ? Number(val) : val) as T);
        handleInteractionEnd();
    };

    return (
        <div
            className={`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${fullWidth ? 'w-full' : ''} ${className}`}
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
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

export default Dropdown;
