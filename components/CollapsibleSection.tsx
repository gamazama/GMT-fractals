
import React, { useState } from 'react';
import { SectionLabel, SectionDivider } from './SectionLabel';
import { CaretRight } from './Icons2';

/** Header style presets. Base padding/rounding lives HERE (not on the shared
 *  header row) so variants can't fight over Tailwind padding classes. */
const headerVariants = {
    default: 'px-2 py-1 rounded-sm',
    /** Standard panel sub-section: grey background, matching AutoFeaturePanel collapsible groups */
    panel: 'px-2 py-0.5 text-[9px] font-bold text-fg-dim hover:text-fg-tertiary bg-surface-raised rounded-sm',
    /** Full panel-section chrome (manifest `type: 'collapsible'` roll-ups —
     *  Effects / Background & Sky / Fog): the FeatureSection card idiom.
     *  Raised-surface header + body, closed by the shared SectionDivider
     *  end-cap, so collapsible sections read exactly like the bespoke
     *  Compilable/Runtime sections instead of floating on the dock black. */
    section: 'px-3 py-1.5 bg-surface-raised',
} as const;

type HeaderVariant = keyof typeof headerVariants;

interface CollapsibleSectionProps {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
    /** Label size. Defaults to 'secondary'; the 'section' variant defaults to 'primary'. */
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
    labelVariant,
    labelColor,
    rightContent,
    className = '',
    headerClassName = '',
    variant = 'default',
    open: controlledOpen,
    onToggle,
}) => {
    const resolvedHeaderClass = headerClassName || headerVariants[variant];
    // Section headers carry the primary (10px bold) label like FeatureSection;
    // plain collapsibles keep the quieter secondary label.
    const resolvedLabelVariant = labelVariant ?? (variant === 'section' ? 'primary' : 'secondary');
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const handleToggle = () => {
        if (onToggle) onToggle();
        if (!isControlled) setInternalOpen(prev => !prev);
    };

    const body = variant === 'section'
        // Raised body surface (the CompilableFeatureSection idiom) so the
        // section's content doesn't float on the dock background.
        ? <div className="bg-surface-raised">{children}</div>
        : children;

    return (
        <div className={className}>
            <div className={`flex items-center gap-1.5 w-full text-left select-none hover:bg-line/5 transition-colors ${resolvedHeaderClass}`}>
                <button
                    onClick={handleToggle}
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                    <ChevronIcon open={isOpen} />
                    <SectionLabel variant={resolvedLabelVariant} color={labelColor}>{label}</SectionLabel>
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
            {isOpen && body}
            {/* Card end-cap (+ next-section lip) — emitted open OR closed so a
             *  collapsed section still reads as a card, matching the bespoke
             *  Compilable/Runtime sections. */}
            {variant === 'section' && <SectionDivider />}
        </div>
    );
};

export default CollapsibleSection;
