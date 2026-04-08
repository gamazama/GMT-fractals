
import React, { useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { PlusIcon, TrashIcon } from './Icons';

// ─── Accent color presets ──────────────────────────────────────────────────
// Each preset defines border, background, and text classes for active/inactive states.
// Mirrors the app's existing accent system (cyan primary, purple modulations, amber warnings).

const accentPresets = {
    cyan: {
        activeBg:       'bg-cyan-900/10',
        activeBorder:   'border-cyan-500/20',
        activeText:     'text-cyan-400',
        activeLabel:    'text-cyan-300',
        itemBorder:     'border-cyan-500/10',
        itemActiveBg:   'bg-cyan-500/[0.03]',
        selectedBg:     'bg-cyan-500/20',
        selectedBorder: 'border-cyan-500/40',
        selectedText:   'text-cyan-300',
        addBg:          'bg-cyan-500/20',
        addBorder:      'border-cyan-500/50',
        addText:        'text-cyan-300',
        addHoverBg:     'hover:bg-cyan-500',
        searchFocus:    'focus:border-cyan-500/50',
    },
    purple: {
        activeBg:       'bg-purple-900/10',
        activeBorder:   'border-purple-500/20',
        activeText:     'text-purple-400',
        activeLabel:    'text-purple-300',
        itemBorder:     'border-purple-500/10',
        itemActiveBg:   'bg-purple-500/[0.03]',
        selectedBg:     'bg-purple-500/20',
        selectedBorder: 'border-purple-500/40',
        selectedText:   'text-purple-300',
        addBg:          'bg-purple-500/20',
        addBorder:      'border-purple-500/50',
        addText:        'text-purple-300',
        addHoverBg:     'hover:bg-purple-500',
        searchFocus:    'focus:border-purple-500/50',
    },
    amber: {
        activeBg:       'bg-amber-900/10',
        activeBorder:   'border-amber-500/20',
        activeText:     'text-amber-400',
        activeLabel:    'text-amber-300',
        itemBorder:     'border-amber-500/10',
        itemActiveBg:   'bg-amber-500/[0.03]',
        selectedBg:     'bg-amber-500/20',
        selectedBorder: 'border-amber-500/40',
        selectedText:   'text-amber-300',
        addBg:          'bg-amber-500/20',
        addBorder:      'border-amber-500/50',
        addText:        'text-amber-300',
        addHoverBg:     'hover:bg-amber-500',
        searchFocus:    'focus:border-amber-500/50',
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
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
                <SearchIcon />
            </div>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-black/40 border border-white/10 rounded pl-7 pr-2 py-1 text-[10px] text-white placeholder:text-gray-600 focus:outline-none ${colors.searchFocus} transition-colors`}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
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
    <svg
        className={`w-2 h-2 transition-transform ${open ? 'rotate-90' : ''}`}
        viewBox="0 0 6 10"
        fill="currentColor"
    >
        <path d="M0 0l6 5-6 5z" />
    </svg>
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
    const bgClass = selected ? colors.selectedBg : 'bg-black/40';

    return (
        <div className={`${bgClass} rounded border ${borderClass} animate-fade-in transition-colors ${className}`}>
            {/* Item header */}
            {(title || actions || onRemove || expandable) && (
                <div
                    className={`flex items-center justify-between px-2 min-h-[26px] mb-0.5 ${onSelect ? 'cursor-pointer hover:bg-white/5' : ''}`}
                    onClick={onSelect}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        {expandable && (
                            <button onClick={(e) => { e.stopPropagation(); handleToggle(); }} className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors p-0.5">
                                <ChevronIcon open={isExpanded} />
                            </button>
                        )}
                        {title && (
                            <span className={`text-[9px] font-bold truncate ${titleColor || (selected ? colors.selectedText : 'text-gray-500')}`}>
                                {title}
                            </span>
                        )}
                        {subtitle && (
                            <span className="text-[8px] text-gray-600 truncate">{subtitle}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {onRemove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="text-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100"
                                title="Remove"
                            >
                                <TrashIcon />
                            </button>
                        )}
                        {actions}
                    </div>
                </div>
            )}

            {/* Item body */}
            {expandable ? (
                isExpanded && (
                    <div className="animate-fade-in px-2 pb-2">
                        {children}
                    </div>
                )
            ) : (
                <div className={title || actions || onRemove ? 'px-2 pb-2' : 'p-2'}>
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
                className="flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-white/5 transition-colors rounded-sm"
            >
                <ChevronIcon open={open} />
                <SectionLabel variant="secondary">{label}</SectionLabel>
                {count !== undefined && (
                    <span className="text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-1">
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
        <div className={`flex flex-col border-t border-white/5 ${isActive ? colors.activeBg : 'bg-white/[0.02]'} ${className}`} data-help-id={dataHelpId}>
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${isActive ? colors.activeBorder : 'border-white/5'}`}>
                <div className="flex items-center gap-1.5">
                    <label className={`text-[10px] font-bold ${isActive ? colors.activeLabel : 'text-gray-500'}`}>
                        {label}
                    </label>
                    {count !== undefined && (
                        <span className="text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">
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
                                    ? `${colors.addBg} ${colors.addBorder} ${colors.addText} ${colors.addHoverBg} hover:text-white`
                                    : 'bg-white/10 border-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                            }`}
                            title={addTitle}
                        >
                            <PlusIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div
                className="flex flex-col gap-1 p-2 overflow-y-auto custom-scroll"
                style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
            >
                {isEmpty ? (
                    <p className="text-[9px] text-gray-600 italic text-center py-3">{emptyMessage}</p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default DynamicList;
