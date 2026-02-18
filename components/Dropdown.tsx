
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
        // Infer type from first option value to maintain strict typing if possible
        const isNumber = typeof options[0]?.value === 'number';
        onChange((isNumber ? Number(val) : val) as T);
        handleInteractionEnd();
    };

    return (
        <div 
            className={`flex items-center justify-between min-h-[22px] mb-px px-3 ${fullWidth ? 'w-full' : ''} ${className}`}
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
        >
            {label && (
                <label className="text-[10px] text-gray-400 font-medium tracking-tight mr-2 shrink-0 select-none">
                    {label}{labelSuffix}
                </label>
            )}
            <div className="relative w-[50%] min-w-[120px]">
                <select
                    value={value}
                    onChange={handleChange}
                    className={`t-dropdown pr-6 ${selectClassName}`} // Padding right for chevron
                >
                    {options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
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
