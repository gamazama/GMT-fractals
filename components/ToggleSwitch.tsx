
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { GenericToggleSwitch } from './GenericToggleSwitch';
import type { GenericToggleOption } from './GenericToggleSwitch';

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
    variant?: 'default' | 'dense';
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

    const handleChange = (val: T) => {
        handleInteractionStart('param');
        onChange(val);
        handleInteractionEnd();
    };

    return (
        <GenericToggleSwitch
            label={label}
            value={value}
            onChange={handleChange}
            options={options as GenericToggleOption<T>[] | undefined}
            color={color}
            onLfoToggle={onLfoToggle}
            isLfoActive={isLfoActive}
            icon={icon}
            disabled={disabled}
            variant={variant}
            labelSuffix={labelSuffix}
            data-help-id={helpId}
            onContextMenu={handleContextMenu}
        />
    );
}

export default ToggleSwitch;
