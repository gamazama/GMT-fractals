
import React from 'react';
import { text as themeText, surface } from '../data/theme';

type SectionLabelVariant = 'primary' | 'secondary' | 'tiny';

interface SectionLabelProps {
    children: React.ReactNode;
    variant?: SectionLabelVariant;
    className?: string;
    color?: string; // Override text color, e.g. 'text-cyan-400'
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

/** Horizontal section divider with drop-shadow gradient */
export const SectionDivider: React.FC = () => (
    <>
        <div className={`h-1.5 ${surface.divider} rounded-b-lg`} />
        <div className="h-2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))' }} />
    </>
);

export default SectionLabel;
