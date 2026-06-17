/**
 * TabStrip — generic horizontal tab strip with optional add/remove.
 *
 * Distinct from TabBar (the dock's flat tab list): TabStrip styles each
 * tab as a bordered chip, supports an active-state badge dot, and can
 * render trailing add/remove affordances. Used by app code that wants a
 * GMT-style "row of items with one active" UI inside a panel — e.g. the
 * Light panel's per-light selector, or future per-something selectors
 * in 2nd apps.
 *
 * The strip is intentionally generic: items are described by id/label
 * plus an optional `active` flag (drives the visibility dot) and an
 * optional `color` accent (defaults to cyan). Trailing affordances are
 * separate props so apps can wire them to whatever add/remove semantics
 * they need.
 */

import React from 'react';

export interface TabStripItem<T extends string | number> {
    id: T;
    label: string;
    /** Drives the small dot in the top-right of the tab. Use for a
     *  visibility/enabled flag so users see which tabs are "live"
     *  without selecting them. */
    indicator?: boolean;
    /** Tooltip on hover. */
    title?: string;
}

export interface TabStripProps<T extends string | number> {
    items: TabStripItem<T>[];
    activeId: T;
    onSelect: (id: T) => void;
    /** Optional add button at the end of the strip. */
    onAdd?: () => void;
    addDisabled?: boolean;
    addTitle?: string;
    /** Tailwind colour root used for the active tab + indicator dot.
     *  Default 'cyan'. */
    accent?: 'cyan' | 'purple' | 'green' | 'amber';
    /** Minimum tab width — keeps short labels from collapsing. */
    minTabWidth?: number;
    className?: string;
}

const ACCENTS = {
    cyan:   { bg: 'bg-cyan-900/50',   border: 'border-cyan-500/50',   text: 'text-cyan-200',   dot: 'bg-cyan-400'   },
    purple: { bg: 'bg-purple-900/50', border: 'border-purple-500/50', text: 'text-purple-200', dot: 'bg-purple-400' },
    green:  { bg: 'bg-green-900/50',  border: 'border-green-500/50',  text: 'text-green-200',  dot: 'bg-green-400'  },
    amber:  { bg: 'bg-amber-900/50',  border: 'border-amber-500/50',  text: 'text-amber-200',  dot: 'bg-amber-400'  },
} as const;

const PlusIcon: React.FC = () => (
    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
    </svg>
);

export function TabStrip<T extends string | number>({
    items,
    activeId,
    onSelect,
    onAdd,
    addDisabled,
    addTitle,
    accent = 'cyan',
    minTabWidth = 60,
    className = '',
}: TabStripProps<T>) {
    const a = ACCENTS[accent];
    return (
        <div className={`flex flex-wrap gap-1 bg-black/40 p-1 rounded border border-white/5 ${className}`}>
            {items.map((item) => {
                const isActive = item.id === activeId;
                return (
                    <button
                        key={String(item.id)}
                        onClick={() => onSelect(item.id)}
                        title={item.title}
                        style={{ minWidth: minTabWidth }}
                        className={`flex-1 py-1.5 px-2 text-[9px] font-bold rounded border transition-all relative ${
                            isActive
                                ? `${a.bg} ${a.border} ${a.text} shadow-sm`
                                : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                    >
                        {item.label}
                        {item.indicator && (
                            <div className={`absolute top-1 right-1 w-1 h-1 rounded-full ${a.dot}`} />
                        )}
                    </button>
                );
            })}
            {onAdd && (
                <button
                    onClick={onAdd}
                    disabled={addDisabled}
                    title={addTitle ?? 'Add'}
                    className="w-8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                    <PlusIcon />
                </button>
            )}
        </div>
    );
}

export default TabStrip;
