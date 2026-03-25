
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { GenericDropdown } from './GenericDropdown';
import type { GenericDropdownOption } from './GenericDropdown';

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

    const handleChange = (val: T) => {
        handleInteractionStart('param');
        onChange(val);
        handleInteractionEnd();
    };

    return (
        <GenericDropdown
            label={label}
            value={value}
            options={options as GenericDropdownOption<T>[]}
            onChange={handleChange}
            fullWidth={fullWidth}
            className={className}
            selectClassName={selectClassName}
            labelSuffix={labelSuffix}
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
        />
    );
}

export default Dropdown;
