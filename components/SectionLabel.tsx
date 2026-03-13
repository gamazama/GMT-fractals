
import React from 'react';

type SectionLabelVariant = 'primary' | 'secondary' | 'tiny';

interface SectionLabelProps {
    children: React.ReactNode;
    variant?: SectionLabelVariant;
    className?: string;
    color?: string; // Override text color, e.g. 'text-cyan-400'
}

const variantClasses: Record<SectionLabelVariant, string> = {
    primary:   'text-[10px] font-bold text-gray-400',
    secondary: 'text-[9px] font-bold text-gray-500',
    tiny:      'text-[8px] text-gray-600',
};

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, variant = 'primary', className = '', color }) => {
    const base = variantClasses[variant];
    const colorClass = color || '';
    return <span className={`${base} ${colorClass} select-none ${className}`}>{children}</span>;
};

export default SectionLabel;
