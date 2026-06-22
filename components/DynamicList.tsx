
import React, { useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { PlusIcon, TrashIcon, CloseIcon } from './Icons';
import { CaretRight } from './Icons2';

// ─── Accent color presets ──────────────────────────────────────────────────
// Each preset defines border, background, and text classes for active/inactive states.
// Mirrors the app's existing accent system (cyan primary, purple modulations, amber warnings).

const accentPresets = {
    cyan: {
        activeBg:       'bg-accent-900/10',
        activeBorder:   'border-accent-500/20',
        activeText:     'text-accent-400',
        activeLabel:    'text-accent-300',
        itemBorder:     'border-accent-500/10',
        itemActiveBg:   'bg-accent-500/[0.03]',
        selectedBg:     'bg-accent-500/20',
        selectedBorder: 'border-accent-500/40',
        selectedText:   'text-accent-300',
        addBg:          'bg-accent-500/20',
        addBorder:      'border-accent-500/50',
        addText:        'text-accent-300',
        addHoverBg:     'hover:bg-accent-500',
        searchFocus:    'focus:border-accent-500/50',
    },
    purple: {
        activeBg:       'bg-secondary/10',
        activeBorder:   'border-secondary/20',
        activeText:     'text-secondary',
        activeLabel:    'text-secondary',
        itemBorder:     'border-secondary/10',
        itemActiveBg:   'bg-secondary/[0.03]',
        selectedBg:     'bg-secondary/20',
        selectedBorder: 'border-secondary/40',
        selectedText:   'text-secondary',
        addBg:          'bg-secondary/20',
        addBorder:      'border-secondary/50',
        addText:        'text-secondary',
        addHoverBg:     'hover:bg-secondary',
        searchFocus:    'focus:border-secondary/50',
    },
    amber: {
        activeBg:       'bg-warn/10',
        activeBorder:   'border-warn/20',
        activeText:     'text-warn',
        activeLabel:    'text-warn',
        itemBorder:     'border-warn/10',
        itemActiveBg:   'bg-warn/[0.03]',
        selectedBg:     'bg-warn/20',
        selectedBorder: 'border-warn/40',
        selectedText:   'text-warn',
        addBg:          'bg-warn/20',
        addBorder:      'border-warn/50',
        addText:        'text-warn',
        addHoverBg:     'hover:bg-warn',
        searchFocus:    'focus:border-warn/50',
    },
} as const;

type AccentColor = keyof typeof accentPresets;

// ─── Search Bar ────────────────────────────────────────────────────────────

interface DynamicListSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    accent?: AccentColor;
}

const SearchIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const DynamicListSearch: React.FC<DynamicListSearchProps> = ({
    value, onChange, placeholder = 'Search...', accent = 'cyan',
}) => {
    const colors = accentPresets[accent];
    return (
        <div className="relative px-2 py-1.5">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none">
                <SearchIcon />
            </div>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-surface-sunken border border-line/10 rounded pl-7 pr-2 py-1 text-[10px] text-fg placeholder:text-fg-faint focus:outline-none ${colors.searchFocus} transition-colors`}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg transition-colors"
                >
                    <CloseIcon size={8} />
                </button>
            )}
        </div>
    );
};

// ─── List Item ─────────────────────────────────────────────────────────────

interface DynamicListItemProps {
    children: React.ReactNode;
    /** Item title shown in the header row */
    title?: string;
    /** Override the title text color class (default: accent-aware gray) */
    titleColor?: string;
    /** Small subtitle shown beside the title */
    subtitle?: string;
    /** Accent color — inherits from parent DynamicList if not set */
    accent?: AccentColor;
    /** Whether this item is visually selected (e.g. for browsing) */
    selected?: boolean;
    /** Whether the item body is collapsible */
    expandable?: boolean;
    /** Uncontrolled default expand state */
    defaultExpanded?: boolean;
    /** Controlled expand state */
    expanded?: boolean;
    /** Controlled expand toggle */
    onToggleExpand?: () => void;
    /** Called when the item is clicked (for selection-based lists) */
    onSelect?: () => void;
    /** Called when the remove button is clicked — shows a delete button if provided */
    onRemove?: () => void;
    /** Custom content placed in the header's right side (e.g. toggle, badge) */
    actions?: React.ReactNode;
    /** Extra class on the item wrapper */
    className?: string;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <CaretRight className={`w-2 h-2 transition-transform ${open ? 'rotate-90' : ''}`} />
);

export const DynamicListItem: React.FC<DynamicListItemProps> = ({
    children, title, titleColor, subtitle, accent = 'cyan', selected = false,
    expandable = false, defaultExpanded = true, expanded: controlledExpanded,
    onToggleExpand, onSelect, onRemove, actions, className = '',
}) => {
    const colors = accentPresets[accent];
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isControlled = controlledExpanded !== undefined;
    const isExpanded = isControlled ? controlledExpanded : internalExpanded;

    const handleToggle = () => {
        if (onToggleExpand) onToggleExpand();
        if (!isControlled) setInternalExpanded(prev => !prev);
    };

    const borderClass = selected ? colors.selectedBorder : colors.itemBorder;
    const bgClass = selected ? colors.selectedBg : 'bg-surface-section';

    return (
        <div className={`${bgClass} rounded border ${borderClass} animate-fade-in transition-colors ${className}`}>
            {/* Item header */}
            {(title || actions || onRemove || expandable) && (
                <div
                    className={`flex items-center justify-between px-2 min-h-[26px] mb-0.5 ${onSelect ? 'cursor-pointer hover:bg-line/5' : ''}`}
                    onClick={onSelect}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        {expandable && (
                            <button onClick={(e) => { e.stopPropagation(); handleToggle(); }} className="shrink-0 text-fg-faint hover:text-fg-tertiary transition-colors p-0.5">
                                <ChevronIcon open={isExpanded} />
                            </button>
                        )}
                        {title && (
                            <span className={`text-[9px] font-bold truncate ${titleColor || (selected ? colors.selectedText : 'text-fg-dim')}`}>
                                {title}
                            </span>
                        )}
                        {subtitle && (
                            <span className="text-[8px] text-fg-faint truncate">{subtitle}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {onRemove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="text-danger hover:text-fg transition-colors opacity-50 hover:opacity-100"
                                title="Remove"
                            >
                                <TrashIcon />
                            </button>
                        )}
                        {actions}
                    </div>
                </div>
            )}

            {/* Item body. Drop the horizontal padding so contained
                widgets (Slider, ParameterSelector, …) sit flush at the
                panel edge — matches AutoFeaturePanel's visual where
                slider rows extend to the dock side. */}
            {expandable ? (
                isExpanded && (
                    <div className="animate-fade-in pb-2">
                        {children}
                    </div>
                )
            ) : (
                <div className={title || actions || onRemove ? 'pb-2' : 'py-2'}>
                    {children}
                </div>
            )}
        </div>
    );
};

// ─── Group Header ──────────────────────────────────────────────────────────
// Optional grouping within a list (e.g. formula categories, parameter types)

interface DynamicListGroupProps {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
    accent?: AccentColor;
}

export const DynamicListGroup: React.FC<DynamicListGroupProps> = ({
    label, children, defaultOpen = true, count, accent = 'cyan',
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-line/5 transition-colors rounded-sm"
            >
                <ChevronIcon open={open} />
                <SectionLabel variant="secondary">{label}</SectionLabel>
                {count !== undefined && (
                    <span className="text-[8px] bg-line/10 text-fg-muted px-1.5 py-0.5 rounded ml-1">
                        {count}
                    </span>
                )}
            </button>
            {open && (
                <div className="flex flex-col gap-0.5 pl-2">
                    {children}
                </div>
            )}
        </div>
    );
};

// ─── Main Container ────────────────────────────────────────────────────────

interface DynamicListProps {
    /** Header label */
    label: string;
    children: React.ReactNode;
    /** Accent color for the list chrome */
    accent?: AccentColor;
    /** Whether any items are active — controls accent tinting of the container */
    isActive?: boolean;
    /** Show an add button in the header */
    onAdd?: () => void;
    /** Disable the add button */
    addDisabled?: boolean;
    /** Tooltip for the add button */
    addTitle?: string;
    /** Max scrollable height for the item area. Omit for no scroll constraint. */
    maxHeight?: number | string;
    /** Item count shown as a badge */
    count?: number;
    /** Message shown when children is empty */
    emptyMessage?: string;
    /** Extra content in the header right side (beside add button) */
    headerRight?: React.ReactNode;
    /** Extra class on the outer container */
    className?: string;
    /** Pass-through for help system */
    'data-help-id'?: string;
}

export const DynamicList: React.FC<DynamicListProps> = ({
    label, children, accent = 'cyan', isActive = false,
    onAdd, addDisabled = false, addTitle = 'Add item',
    maxHeight, count, emptyMessage = 'No items',
    headerRight, className = '', 'data-help-id': dataHelpId,
}) => {
    const colors = accentPresets[accent];

    // Detect empty children
    const childArray = React.Children.toArray(children);
    const isEmpty = childArray.length === 0;

    return (
        <div className={`flex flex-col border-t border-line/5 ${isActive ? colors.activeBg : 'bg-line/[0.02]'} ${className}`} data-help-id={dataHelpId}>
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${isActive ? colors.activeBorder : 'border-line/5'}`}>
                <div className="flex items-center gap-1.5">
                    <label className={`text-[10px] font-bold ${isActive ? colors.activeLabel : 'text-fg-dim'}`}>
                        {label}
                    </label>
                    {count !== undefined && (
                        <span className="text-[8px] bg-line/10 text-fg-muted px-1.5 py-0.5 rounded">
                            {count}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {headerRight}
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            disabled={addDisabled}
                            className={`w-5 h-5 flex items-center justify-center rounded border disabled:opacity-30 transition-all ${
                                isActive
                                    ? `${colors.addBg} ${colors.addBorder} ${colors.addText} ${colors.addHoverBg} hover:text-fg`
                                    : 'bg-line/10 border-line/10 text-fg-muted hover:bg-line/20 hover:text-fg'
                            }`}
                            title={addTitle}
                        >
                            <PlusIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Body. Overflow + scroll classes apply ONLY when a
                maxHeight is set; otherwise wheel events would be
                trapped by the inner scroll container even when the
                content is short, blocking the dock's natural scroll
                pass-through. */}
            <div
                className={`flex flex-col gap-1 py-2 ${maxHeight ? 'overflow-y-auto custom-scroll' : ''}`}
                style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
            >
                {isEmpty ? (
                    <p className="text-[9px] text-fg-faint italic text-center py-3">{emptyMessage}</p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default DynamicList;
