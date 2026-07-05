
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from './Icons';
import { z } from './ui';

/**
 * CategoryPickerMenu — Generic two-column portal dropdown.
 *
 * Left column: category list. Right column: items for the active category.
 * Used by ParameterSelector (LFO / audio modulation targets) and
 * SlotPicker (formula workshop uniform slot assignment).
 *
 * Behaviour notes:
 * - Single-category callers (categories.length === 1) collapse to a one-column
 *   menu: the sole category's items render directly, with no Level-1 column and
 *   no hover-to-reveal.
 * - Category selection: hover-select by default; clicking a category pins it so
 *   that sliding the cursor toward the items column no longer changes the active
 *   category. Clicking another category re-pins.
 * - Left-flip (right-edge overflow) pins the container by its RIGHT edge so the
 *   category column stays anchored to the trigger while the items submenu grows
 *   leftward on hover.
 */

export interface PickerCategory {
    id: string;
    name: string;
    /** Highlight this category (e.g. coreMath is bold cyan) */
    highlight?: boolean;
}

export interface PickerItem {
    key: string;
    label: string;
    description?: string;
    /** Item is taken / unavailable — shown greyed out */
    disabled?: boolean;
    /** Suffix shown after the label when disabled */
    disabledSuffix?: string;
    /** Item is currently selected */
    selected?: boolean;
    /** Optional small badge shown before the label (e.g. "V3" / "V4"). */
    badge?: { text: string; className: string };
}

export interface CategoryPickerMenuProps {
    x: number;
    y: number;
    categories: PickerCategory[];
    /** Return the items to display for a given category id */
    getItems: (categoryId: string) => PickerItem[];
    onSelect: (value: string) => void;
    onClose: () => void;
    /** Minimum width of the categories column (grows to fit content). Default 128. */
    categoryWidth?: number;
    /** Fixed width of the items column (overflow truncated). Default 192. */
    itemWidth?: number;
    /** Right edge of the trigger button — used for right-anchored positioning */
    anchorRight?: number;
}

export const CategoryPickerMenu: React.FC<CategoryPickerMenuProps> = ({
    x, y, categories, getItems, onSelect, onClose,
    categoryWidth = 128, itemWidth = 192, anchorRight,
}) => {
    // Single-category callers collapse to a one-column items menu.
    const single = categories.length === 1;
    const soleCategory = single ? categories[0].id : null;

    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    // `right` is used instead of `left` in the flipped state to pin the container's
    // right edge to the trigger (see layout effect + render).
    const [layout, setLayout] = useState({ x, y, right: 0, maxHeight: 300, opacity: 0, flip: false });

    // Active category: hover-select by default; a pinned category (set on click)
    // overrides hover so cursoring toward the items column can't change it.
    // For single-category menus the sole category is always active.
    const activeCategory = single ? soleCategory : (pinnedCategory ?? hoveredCategory);

    useLayoutEffect(() => {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 8;
        // One column when single-category, two columns otherwise.
        const menuWidth = single ? itemWidth + 2 : categoryWidth + itemWidth + 2;
        const preferredMaxH = 350;

        // Horizontal positioning — flip only when the menu would overflow the viewport
        const shouldFlip = x + menuWidth > winW - padding;

        let left = x;
        let right = 0;
        if (shouldFlip) {
            // Pin the container's RIGHT edge to the trigger's right edge (or x if no
            // anchorRight). The categories column then stays put and the items submenu
            // grows leftward on hover instead of shoving the categories rightward.
            let rightEdge = anchorRight ?? x;
            // Keep the fully-expanded menu on-screen to the left.
            if (rightEdge - menuWidth < padding) rightEdge = menuWidth + padding;
            if (rightEdge > winW - padding) rightEdge = winW - padding;
            right = winW - rightEdge;
        } else if (left + menuWidth > winW - padding) {
            // Non-flipped: clamp so the menu doesn't overflow the right edge.
            left = Math.max(padding, winW - menuWidth - padding);
        }

        // Vertical: prefer below anchor point, flip above if not enough space
        const spaceBelow = winH - y - padding;
        const spaceAbove = y - padding;
        let top: number;
        let maxHeight: number;

        if (spaceBelow >= Math.min(preferredMaxH, 200)) {
            top = y;
            maxHeight = Math.min(preferredMaxH, Math.max(150, spaceBelow));
        } else if (spaceAbove > spaceBelow) {
            maxHeight = Math.min(preferredMaxH, spaceAbove);
            top = y - maxHeight;
        } else {
            top = y;
            maxHeight = Math.min(preferredMaxH, Math.max(150, spaceBelow));
        }

        // Final clamp to viewport
        if (top < padding) { top = padding; maxHeight = Math.min(maxHeight, winH - padding * 2); }

        setLayout({ x: left, y: top, right, maxHeight, opacity: 1, flip: shouldFlip });
    }, [x, y, categoryWidth, itemWidth, anchorRight, single]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener('mousedown', handleDown, true);
        return () => window.removeEventListener('mousedown', handleDown, true);
    }, [onClose]);

    const items = activeCategory ? getItems(activeCategory) : [];

    const renderItemButtons = () => (
        <>
            {items.length === 0 && (
                <div className="px-3 py-2 text-fg-dim text-xs italic">No items</div>
            )}
            {items.map(item => (
                <button
                    key={item.key}
                    onClick={item.disabled ? undefined : () => { onSelect(item.key); onClose(); }}
                    className={`w-full px-3 py-1.5 text-left transition-colors truncate flex items-center gap-1.5 ${
                        item.disabled
                            ? 'text-fg-faint cursor-not-allowed'
                            : item.selected
                                ? 'text-accent-400 hover:bg-accent-600 hover:text-fg'
                                : 'text-fg-tertiary hover:bg-accent-600 hover:text-fg'
                    }`}
                    title={item.description || item.label}
                >
                    {item.badge && (
                        <span className={`shrink-0 text-[8px] px-1 py-0.5 rounded font-semibold ${item.badge.className}`}>
                            {item.badge.text}
                        </span>
                    )}
                    <span className="truncate">
                        {item.label}{item.disabled && item.disabledSuffix ? ` ${item.disabledSuffix}` : ''}
                    </span>
                </button>
            ))}
        </>
    );

    return createPortal(
        <div
            ref={menuRef}
            className="fixed flex text-xs font-mono"
            style={{
                // Flipped: pin by right edge so the categories column stays anchored
                // and the items submenu grows leftward. Non-flipped: pin by left.
                ...(layout.flip ? { right: layout.right } : { left: layout.x }),
                top: layout.y,
                opacity: layout.opacity,
                transition: 'opacity 0.05s ease-out',
                flexDirection: layout.flip ? 'row-reverse' : 'row',
                zIndex: z('contextMenu'),
            }}
        >
            {single ? (
                /* Single category: one-column items menu, no Level-1 column. */
                <div
                    className="bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 rounded"
                    style={{ width: itemWidth, maxHeight: layout.maxHeight }}
                >
                    {renderItemButtons()}
                </div>
            ) : (
                <>
                    {/* Level 1: Categories */}
                    <div
                        className={`bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll whitespace-nowrap ${layout.flip ? 'rounded-r -ml-px' : 'rounded-l'}`}
                        style={{ minWidth: categoryWidth, maxHeight: layout.maxHeight }}
                    >
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                onMouseEnter={() => setHoveredCategory(cat.id)}
                                onClick={() => setPinnedCategory(cat.id)}
                                className={`px-3 py-1.5 cursor-pointer flex justify-between items-center gap-1.5 transition-colors ${
                                    activeCategory === cat.id
                                        ? 'bg-accent-900/60 text-fg'
                                        : 'text-fg-muted hover:text-fg hover:bg-line/5'
                                }`}
                            >
                                <span className={`truncate ${cat.highlight ? 'font-bold text-accent-300' : ''}`}>{cat.name}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                    {/* Subtle pinned affordance */}
                                    {pinnedCategory === cat.id && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                                    )}
                                    {layout.flip ? <span className="text-fg-faint">‹</span> : <ChevronRight />}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Level 2: Items */}
                    {activeCategory && (
                        <div
                            className={`bg-surface-raised border-y border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 ${
                                layout.flip ? 'border-l rounded-l animate-fade-in-right' : 'border-r rounded-r -ml-px animate-fade-in-left'
                            }`}
                            style={{ width: itemWidth, maxHeight: layout.maxHeight }}
                        >
                            {renderItemButtons()}
                        </div>
                    )}
                </>
            )}
        </div>,
        document.body
    );
};

export default CategoryPickerMenu;
