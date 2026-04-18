
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from './Icons';

/**
 * CategoryPickerMenu — Generic two-column portal dropdown.
 *
 * Left column: category list. Right column: items for the hovered category.
 * Used by ParameterSelector (LFO / audio modulation targets) and
 * SlotPicker (formula workshop uniform slot assignment).
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
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState({ x, y, maxHeight: 300, opacity: 0, flip: false });

    useLayoutEffect(() => {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 8;
        const menuWidth = categoryWidth + itemWidth + 2;
        const preferredMaxH = 350;

        // Horizontal positioning — flip only when the menu would overflow the viewport
        const shouldFlip = x + menuWidth > winW - padding;

        let left: number;
        if (shouldFlip) {
            // Anchor right edge of menu to the trigger's right edge (or x if no anchorRight)
            const rightEdge = anchorRight ?? x;
            left = Math.max(padding, rightEdge - menuWidth);
        } else {
            left = x;
        }
        // Final horizontal clamp
        if (left + menuWidth > winW - padding) {
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

        setLayout({ x: left, y: top, maxHeight, opacity: 1, flip: shouldFlip });
    }, [x, y, categoryWidth, itemWidth, anchorRight]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener('mousedown', handleDown, true);
        return () => window.removeEventListener('mousedown', handleDown, true);
    }, [onClose]);

    const items = hoveredCategory ? getItems(hoveredCategory) : [];

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] flex text-xs font-mono"
            style={{
                left: layout.x,
                top: layout.y,
                opacity: layout.opacity,
                transition: 'opacity 0.05s ease-out',
                flexDirection: layout.flip ? 'row-reverse' : 'row',
            }}
        >
            {/* Level 1: Categories */}
            <div
                className={`bg-[#1a1a1a] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll whitespace-nowrap ${layout.flip ? 'rounded-r -ml-px' : 'rounded-l'}`}
                style={{ minWidth: categoryWidth, maxHeight: layout.maxHeight }}
            >
                {categories.map(cat => (
                    <div
                        key={cat.id}
                        onMouseEnter={() => setHoveredCategory(cat.id)}
                        className={`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${
                            hoveredCategory === cat.id
                                ? 'bg-cyan-900/60 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span className={`truncate ${cat.highlight ? 'font-bold text-cyan-300' : ''}`}>{cat.name}</span>
                        {layout.flip ? <span className="text-gray-600">‹</span> : <ChevronRight />}
                    </div>
                ))}
            </div>

            {/* Level 2: Items */}
            {hoveredCategory && (
                <div
                    className={`bg-[#222] border-y border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 ${
                        layout.flip ? 'border-l rounded-l animate-fade-in-right' : 'border-r rounded-r -ml-px animate-fade-in-left'
                    }`}
                    style={{ width: itemWidth, maxHeight: layout.maxHeight }}
                >
                    {items.length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-xs italic">No items</div>
                    )}
                    {items.map(item => (
                        <button
                            key={item.key}
                            onClick={item.disabled ? undefined : () => { onSelect(item.key); onClose(); }}
                            className={`w-full px-3 py-1.5 text-left transition-colors truncate flex items-center gap-1.5 ${
                                item.disabled
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : item.selected
                                        ? 'text-cyan-400 hover:bg-cyan-600 hover:text-white'
                                        : 'text-gray-300 hover:bg-cyan-600 hover:text-white'
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
                </div>
            )}
        </div>,
        document.body
    );
};

export default CategoryPickerMenu;
