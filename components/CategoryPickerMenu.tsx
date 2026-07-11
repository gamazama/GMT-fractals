
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from './Icons';
import { z } from './ui';

/**
 * CategoryPickerMenu — Generic two-column portal dropdown.
 *
 * Left column: category list. Right column: items for the active category.
 * Used by ParameterSelector (LFO / audio modulation targets), SlotPicker
 * (formula workshop uniform slot assignment) and the WeaveEditor "+ Add
 * formula" picker.
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
 * - Type-to-search (`searchable`, on by default): the field stays HIDDEN until
 *   the user types a printable key, which reveals it above the columns and seeds
 *   the query. While the query is non-empty the two-column browse collapses to a
 *   flat, scored match list spanning every category (arrow keys move the active
 *   match, Enter picks it, Escape clears then closes). Pass `searchable={false}`
 *   to opt a menu out entirely.
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
    /** Mount an autofocused type-to-search field that filters across all categories. */
    searchable?: boolean;
    /** Placeholder for the search field (when `searchable`). Default "Search…". */
    searchPlaceholder?: string;
}

/** A flat search hit: the matched item plus its owning category. */
type SearchMatch = PickerItem & { categoryId: string; categoryName: string };

/** Height reserved for the search sheet so the scrollable body doesn't overflow. */
const SEARCH_ROW_H = 40;

export const CategoryPickerMenu: React.FC<CategoryPickerMenuProps> = ({
    x, y, categories, getItems, onSelect, onClose,
    categoryWidth = 128, itemWidth = 192, anchorRight,
    searchable = true, searchPlaceholder = 'Search…',
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

    // ── Type-to-search ───────────────────────────────────────────────────────
    // The field is hidden until a printable key reveals it (searchVisible), so a
    // fresh menu looks exactly like the plain browse.
    const [searchVisible, setSearchVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const activeItemRef = useRef<HTMLButtonElement>(null);
    const q = query.trim().toLowerCase();
    const searchShown = searchable && searchVisible;
    const searching = searchShown && q.length > 0;

    // One column when single-category, two columns otherwise. This is the menu's
    // minimum width; the categories column may grow past it to fit long names.
    const menuWidth = single ? itemWidth + 2 : categoryWidth + itemWidth + 2;

    // Flat, scored matches across every category (label-first, then description /
    // category name — mirrors FormulaPicker's scoring so hits rank sensibly).
    const matches: SearchMatch[] = useMemo(() => {
        if (!searching) return [];
        const scored: Array<{ hit: SearchMatch; score: number }> = [];
        for (const cat of categories) {
            for (const item of getItems(cat.id)) {
                const label = item.label.toLowerCase();
                let score = 0;
                if (label.startsWith(q)) score += 100;
                else if (label.includes(q)) score += 60;
                if ((item.description ?? '').toLowerCase().includes(q)) score += 20;
                if (cat.name.toLowerCase().includes(q)) score += 10;
                if (score > 0) scored.push({ hit: { ...item, categoryId: cat.id, categoryName: cat.name }, score });
            }
        }
        scored.sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label));
        return scored.map(s => s.hit);
    }, [searching, q, categories, getItems]);

    // Active category: hover-select by default; a pinned category (set on click)
    // overrides hover so cursoring toward the items column can't change it.
    // For single-category menus the sole category is always active.
    const activeCategory = single ? soleCategory : (pinnedCategory ?? hoveredCategory);

    useLayoutEffect(() => {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 8;
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
    }, [x, y, menuWidth, anchorRight]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener('mousedown', handleDown, true);
        return () => window.removeEventListener('mousedown', handleDown, true);
    }, [onClose]);

    // Reveal + seed the search field on the first printable keystroke, so the menu
    // is type-to-search without showing a field until you actually type. Capture
    // phase + preventDefault claims that keystroke from window-level shortcuts.
    useEffect(() => {
        if (!searchable) return;
        const onKey = (e: KeyboardEvent) => {
            if (searchVisible) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key.length !== 1 || e.key === ' ') return; // printable, non-space only
            const ae = document.activeElement as HTMLElement | null;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
            e.preventDefault();
            e.stopPropagation();
            setSearchVisible(true);
            setQuery(e.key);
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [searchable, searchVisible]);

    // Focus the field the moment it appears so seeding continues straight into it.
    useEffect(() => {
        if (searchShown) inputRef.current?.focus();
    }, [searchShown]);

    // Keep the highlighted match in range as the result set shrinks, and scroll it
    // into view when arrow-keying past the visible window.
    useEffect(() => { setActiveIndex(0); }, [q]);
    useEffect(() => {
        if (activeIndex > matches.length - 1) setActiveIndex(matches.length > 0 ? matches.length - 1 : 0);
    }, [matches.length, activeIndex]);
    useEffect(() => { activeItemRef.current?.scrollIntoView({ block: 'nearest' }); }, [activeIndex]);

    // Body height leaves room for the search sheet (only once shown) so the scroll
    // region stays on-screen — the menu's total height is unchanged on reveal.
    const bodyMaxHeight = layout.maxHeight - (searchShown ? SEARCH_ROW_H : 0);

    const onInputKeyDown = (e: React.KeyboardEvent) => {
        // Keep keystrokes from reaching window-level shortcuts / fly-nav.
        e.stopPropagation();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, matches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const m = matches[activeIndex];
            if (m && !m.disabled) { onSelect(m.key); onClose(); }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (query) setQuery(''); else onClose();
        }
    };

    const items = activeCategory ? getItems(activeCategory) : [];

    const renderBadge = (badge: PickerItem['badge']) => badge && (
        <span className={`shrink-0 text-[8px] px-1 py-0.5 rounded font-semibold ${badge.className}`}>
            {badge.text}
        </span>
    );

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
                    {renderBadge(item.badge)}
                    <span className="truncate">
                        {item.label}{item.disabled && item.disabledSuffix ? ` ${item.disabledSuffix}` : ''}
                    </span>
                </button>
            ))}
        </>
    );

    // Flat match list shown while a query is active. Category name trails each row
    // dim + right-aligned so hits read with their provenance.
    const renderSearchResults = () => (
        <div
            className="bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 rounded"
            style={{ width: menuWidth, maxHeight: bodyMaxHeight }}
        >
            {matches.length === 0 && (
                <div className="px-3 py-2 text-fg-dim text-xs italic">No matches</div>
            )}
            {matches.map((m, i) => (
                <button
                    key={`${m.categoryId} ${m.key}`}
                    ref={i === activeIndex ? activeItemRef : undefined}
                    onClick={m.disabled ? undefined : () => { onSelect(m.key); onClose(); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full px-3 py-1.5 text-left transition-colors flex items-center gap-1.5 ${
                        m.disabled
                            ? 'text-fg-faint cursor-not-allowed'
                            : i === activeIndex
                                ? 'bg-accent-600 text-fg'
                                : m.selected
                                    ? 'text-accent-400'
                                    : 'text-fg-tertiary'
                    }`}
                    title={m.description || m.label}
                >
                    {renderBadge(m.badge)}
                    <span className="truncate flex-1">
                        {m.label}{m.disabled && m.disabledSuffix ? ` ${m.disabledSuffix}` : ''}
                    </span>
                    <span className={`shrink-0 truncate max-w-[45%] text-[9px] ${i === activeIndex ? 'text-fg/70' : 'text-fg-faint'}`}>
                        {m.categoryName}
                    </span>
                </button>
            ))}
        </div>
    );

    const renderColumns = () => (
        single ? (
            /* Single category: one-column items menu, no Level-1 column. */
            <div
                className="bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 rounded"
                style={{ width: itemWidth, maxHeight: bodyMaxHeight }}
            >
                {renderItemButtons()}
            </div>
        ) : (
            <div className="flex" style={{ flexDirection: layout.flip ? 'row-reverse' : 'row' }}>
                {/* Level 1: Categories */}
                <div
                    className={`bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll whitespace-nowrap ${layout.flip ? 'rounded-r -ml-px' : 'rounded-l'}`}
                    style={{ minWidth: categoryWidth, maxHeight: bodyMaxHeight }}
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
                        style={{ width: itemWidth, maxHeight: bodyMaxHeight }}
                    >
                        {renderItemButtons()}
                    </div>
                )}
            </div>
        )
    );

    return createPortal(
        <div
            ref={menuRef}
            className="fixed flex flex-col text-xs font-mono"
            style={{
                // Flipped: pin by right edge so the categories column stays anchored
                // and the items submenu grows leftward. Non-flipped: pin by left.
                ...(layout.flip ? { right: layout.right } : { left: layout.x }),
                top: layout.y,
                opacity: layout.opacity,
                transition: 'opacity 0.05s ease-out',
                zIndex: z('contextMenu'),
            }}
        >
            {searchShown && (
                <div
                    className="bg-surface-raised border border-line/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded p-1 mb-1"
                >
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        onKeyUp={e => e.stopPropagation()}
                        placeholder={searchPlaceholder}
                        spellCheck={false}
                        autoComplete="off"
                        className="w-full rounded bg-surface-sunken border border-line/10 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-tertiary"
                    />
                </div>
            )}
            {searching ? renderSearchResults() : renderColumns()}
        </div>,
        document.body
    );
};

export default CategoryPickerMenu;
