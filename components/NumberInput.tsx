/**
 * NumberInput — labeled DraggableNumber with the standard panel chrome
 * (h-6 bordered black box). Used wherever a panel shows a paired
 * Width/Height/Cols/Rows control.
 */

import React from 'react';
import { DraggableNumber } from './Slider';
import { SectionLabel } from './SectionLabel';

interface NumberInputProps {
    label?: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    overrideText?: string;
    className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    label, value, onChange, step = 1, min, max, overrideText, className = 'flex-1',
}) => (
    <div className={className}>
        {label && <SectionLabel variant="secondary" className="block mb-0.5">{label}</SectionLabel>}
        <div className="h-6 bg-black/40 rounded border border-white/10 relative">
            <DraggableNumber
                value={value}
                onChange={onChange}
                step={step}
                min={min}
                max={max}
                overrideText={overrideText ?? `${value}`}
            />
        </div>
    </div>
);

export default NumberInput;
