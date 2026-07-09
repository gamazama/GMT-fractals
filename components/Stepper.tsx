/**
 * Stepper — a compact integer control: `[−] value [+]` in a single bordered
 * box, the shared home for the little "click-or-type a small count" affordance.
 *
 * Chrome is the raised grey input box (h-6, `bg-line/[0.16]` fill, `border-line/40`,
 * bold value, `focus-within` accent — the weave editor's control grey, 2026-07-09)
 * — the `−`/`+` are flush cells (not separate mini-buttons) flanking a centred
 * typed value, like a segmented control.
 *
 * Pure primitive (engine-core, no store). CLAMPING IS THE CALLER'S JOB: the buttons
 * emit `value ± 1` and the field emits the parsed integer (or `min` when blank), so
 * a caller's `onChange` that clamps/rounds stays the single source of range truth —
 * matching how the panels already wrap their setters. `min` is only the blank-field
 * fallback, not an enforced floor.
 *
 * @invariant components/ — generic, no app/engine-gmt imports.
 */
import React from 'react';
import { PlusIcon } from './Icons';
import { MinusIcon } from './Icons2';

export interface StepperProps {
    value: number;
    onChange: (n: number) => void;
    /** Leading label (e.g. "start" / "every" / "beats"). */
    label?: string;
    /** Fallback value when the field is blanked; also the natural floor the caller
     *  should enforce in `onChange`. Default 0. */
    min?: number;
    /** Tooltip on the whole control. */
    title?: string;
    /** Width utility for the value field. Default `w-8`. */
    inputClassName?: string;
    className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
    value, onChange, label, min = 0, title, inputClassName = 'w-8', className,
}) => (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`} title={title}>
        {label && <span className="text-[10px] text-fg-tertiary select-none">{label}</span>}
        <div className="flex items-stretch h-6 rounded border border-line/40 bg-line/[0.16] overflow-hidden transition-colors focus-within:border-accent-500/60">
            <button
                type="button" tabIndex={-1} aria-label="Decrease"
                onClick={() => onChange(value - 1)}
                className="px-1.5 flex items-center justify-center text-fg-muted hover:text-fg hover:bg-line/10 transition-colors"
            ><MinusIcon /></button>
            <input
                value={value} inputMode="numeric"
                onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
                className={`${inputClassName} text-center bg-transparent border-x border-line/20 text-[11px] font-bold text-fg outline-none`}
            />
            <button
                type="button" tabIndex={-1} aria-label="Increase"
                onClick={() => onChange(value + 1)}
                className="px-1.5 flex items-center justify-center text-fg-muted hover:text-fg hover:bg-line/10 transition-colors"
            ><PlusIcon /></button>
        </div>
    </div>
);

export default Stepper;
