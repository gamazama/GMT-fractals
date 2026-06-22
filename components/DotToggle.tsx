/**
 * DotToggle — small circular on/off indicator used across the
 * modulation UI (LFO panel + audio rules). When on, it tints with the
 * accent colour at a brightness controlled by `variant`:
 *   - 'master' (solid bg-{accent}-500 / border-{accent}-400) — for the
 *     panel-wide master switches that the user reaches for first.
 *   - 'item'   (translucent /40 + /60) — for per-row toggles where a
 *     row of saturated dots would dominate the panel.
 * Off-state is uniform: transparent + faint border + brighter on hover.
 */

import React from 'react';

export type DotToggleAccent = 'purple' | 'cyan';
export type DotToggleVariant = 'master' | 'item';
export type DotToggleSize = 'sm' | 'md';

interface DotToggleProps {
    value: boolean;
    onChange: (next: boolean) => void;
    accent: DotToggleAccent;
    variant?: DotToggleVariant;
    size?: DotToggleSize;
    title?: string;
    /** Set when the toggle lives inside a clickable parent (e.g. a list
     *  row) so the parent's click handler doesn't also fire. */
    stopPropagation?: boolean;
}

const ON_CLASS: Record<DotToggleAccent, Record<DotToggleVariant, string>> = {
    purple: {
        master: 'bg-secondary border-secondary',
        item:   'bg-secondary/40 border-secondary/60',
    },
    cyan: {
        master: 'bg-accent-500 border-accent-400',
        item:   'bg-accent-500/40 border-accent-500/60',
    },
};

const SIZE_CLASS: Record<DotToggleSize, string> = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
};

export const DotToggle: React.FC<DotToggleProps> = ({
    value, onChange, accent, variant = 'item', size = 'md', title, stopPropagation = false,
}) => {
    const onClass = ON_CLASS[accent][variant];
    const sizeClass = SIZE_CLASS[size];
    return (
        <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                onChange(!value);
            }}
            className={`${sizeClass} rounded-full border transition-colors ${
                value ? onClass : 'bg-transparent border-line/20 hover:border-line/40'
            }`}
            title={title}
        />
    );
};

export default DotToggle;
