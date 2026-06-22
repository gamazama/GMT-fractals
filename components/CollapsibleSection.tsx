
import React, { useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { CaretRight } from './Icons2';

/** Header style presets */
const headerVariants = {
    default: '',
    /** Standard panel sub-section: grey background, matching AutoFeaturePanel collapsible groups */
    panel: 'px-2 py-0.5 text-[9px] font-bold text-fg-dim hover:text-fg-tertiary bg-surface-raised rounded-sm',
} as const;

type HeaderVariant = keyof typeof headerVariants;

interface CollapsibleSectionProps {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
    labelVariant?: 'primary' | 'secondary';
    labelColor?: string;
    rightContent?: React.ReactNode;
    className?: string;
    /** Raw class overrides for the header button. Overrides variant if provided. */
    headerClassName?: string;
    /** Preset header style. Defaults to 'default'. */
    variant?: HeaderVariant;
    /** Controlled mode: pass open + onToggle to manage state externally */
    open?: boolean;
    onToggle?: () => void;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <CaretRight className={`w-2 h-2 transition-transform ${open ? 'rotate-90' : ''}`} />
);

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    label,
    children,
    defaultOpen = true,
    count,
    labelVariant = 'secondary',
    labelColor,
    rightContent,
    className = '',
    headerClassName = '',
    variant = 'default',
    open: controlledOpen,
    onToggle,
}) => {
    const resolvedHeaderClass = headerClassName || headerVariants[variant];
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const handleToggle = () => {
        if (onToggle) onToggle();
        if (!isControlled) setInternalOpen(prev => !prev);
    };

    return (
        <div className={className}>
            <div className={`flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-line/5 transition-colors rounded-sm ${resolvedHeaderClass}`}>
                <button
                    onClick={handleToggle}
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                    <ChevronIcon open={isOpen} />
                    <SectionLabel variant={labelVariant} color={labelColor}>{label}</SectionLabel>
                    {count !== undefined && (
                        <span className="text-[8px] bg-line/10 text-fg-muted px-1.5 py-0.5 rounded ml-1">
                            {count}
                        </span>
                    )}
                </button>
                {rightContent && (
                    <div className="ml-auto flex items-center gap-1">
                        {rightContent}
                    </div>
                )}
            </div>
            {isOpen && children}
        </div>
    );
};

export default CollapsibleSection;
