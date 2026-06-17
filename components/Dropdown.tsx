
import React from 'react';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useHelpContextMenu } from '../hooks/useHelpContextMenu';
import { useSelectRenderPause } from '../hooks/useRenderPause';
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
    const { handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
    const handleContextMenu = useHelpContextMenu();
    // Pause rendering while the native select is open; resume on selection.
    const { selectHandlers, resume } = useSelectRenderPause();

    const handleChange = (val: T) => {
        handleInteractionStart('param');
        onChange(val);
        handleInteractionEnd();
        resume();
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
            selectHandlers={selectHandlers}
        />
    );
}

export default Dropdown;
