
import React from 'react';
import { text as themeText, surface } from '../data/theme';

type SectionLabelVariant = 'primary' | 'secondary' | 'tiny';

interface SectionLabelProps {
    children: React.ReactNode;
    variant?: SectionLabelVariant;
    className?: string;
    color?: string; // Override text color, e.g. 'text-accent-400'
}

const variantClasses: Record<SectionLabelVariant, string> = {
    primary:   `text-[10px] font-bold ${themeText.label}`,
    secondary: `text-[9px] font-bold ${themeText.dimLabel}`,
    tiny:      `text-[8px] ${themeText.faint}`,
};

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, variant = 'primary', className = '', color }) => {
    const base = variantClasses[variant];
    const colorClass = color || '';
    return <span className={`${base} ${colorClass} select-none ${className}`}>{children}</span>;
};

/** Horizontal section divider. The lower strip is a flat fill matching the
 *  outer bracket rail tone, with a top-down shadow overlaid on top. */
// flat base = surface-raised + line/0.12 (rail fill) + line/0.06 (wrapper tint)
const RAIL_TONE = 'linear-gradient(rgb(var(--line) / 0.06), rgb(var(--line) / 0.06)), linear-gradient(rgb(var(--line) / 0.12), rgb(var(--line) / 0.12)), rgb(var(--surface-raised))';
export const SectionDivider: React.FC = () => (
    <>
        <div className={`h-1.5 ${surface.divider}`} />
        <div className="h-2 relative" style={{ background: RAIL_TONE }}>
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
            }} />
        </div>
    </>
);

export default SectionLabel;
