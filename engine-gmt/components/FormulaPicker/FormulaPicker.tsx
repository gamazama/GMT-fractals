/**
 * <FormulaPicker> — unified formula-selection UI.
 *
 * Variants:
 *   - popover : portal + anchored to a trigger DOMRect (replaces PortalDropdown)
 *   - inline  : in-flow card (interlace secondary picker)
 *   - modal   : centered overlay with backdrop (New Scene wizard)
 *
 * Behaviour:
 *   - Pauses engine render loop on mount; restores prior state on unmount.
 *   - Two-action commit: most cards emit { action: 'select', id }. Workshop
 *     emits { action: 'launch', id: 'workshop' } — caller opens that modal
 *     without changing formula.
 *   - Sidebar categories + right-pane grid; search collapses sidebar.
 *   - Search bar hidden by default — typing a printable key opens it,
 *     or click the 🔍 icon next to the view toggle.
 *   - Body keyboard-focusable; arrow keys nav the grid from open.
 *   - Disabled ids grayed with tooltip via disabledReason().
 *   - Grid/List view toggle persisted to localStorage; List shrinks the
 *     popover width.
 *   - Hover preview floater renders alongside the popover (not over the grid).
 *
 * @see dev/plans/formula-picker-design.md (locked spec)
 */

import React, {
    forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect,
    useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { registry } from '../../engine/FractalRegistry';
import type { FormulaType } from '../../types';
import { CheckIcon, CloseIcon, CubeIcon, DiceIcon, NetworkIcon, CodeIcon } from '../../../components/Icons';
import { LazyThumbnail } from './LazyThumbnail';
import { useRenderPause } from './useRenderPause';
import {
    NATIVE_CATEGORIES, FORMULA_TO_CATEGORY, DEFAULT_SPECIAL_ENTRIES,
    type SpecialEntry,
} from './pickerCategories';
import type { SceneGroup, SceneItem } from './sceneGroups';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type FormulaPickerCommit =
    | { action: 'select'; id: string }
    | { action: 'launch'; id: 'workshop' };

export interface FormulaPickerProps {
    variant: 'popover' | 'inline' | 'modal';

    /** Anchor rect for popover variant. Ignored otherwise. */
    anchorRect?: DOMRect;

    /** Currently-selected id (for highlight). */
    value?: string;

    onCommit: (commit: FormulaPickerCommit) => void;
    onClose?: () => void;

    /** Special entries shown in sidebar. Default ['modular', 'workshop'].
     *  Pass [] to hide both (e.g. interlace secondary). */
    specialEntries?: SpecialEntry[];

    /** Compat-aware disabled ids. Grayed in the grid with disabledReason tooltip. */
    disabledIds?: Set<string>;
    disabledReason?: (id: string) => string | undefined;

    /** Force the search bar visible on mount (otherwise hidden until typed
     *  or the 🔍 icon is clicked). */
    autoFocusSearch?: boolean;
    defaultView?: 'grid' | 'list';
    showHoverPreview?: boolean;

    /** Caller-driven extra groups (Scenes — curated gallery / my submissions).
     *  Each group appears in the sidebar's "Scenes" section. Clicking an
     *  item fires its `onSelect`; the picker closes itself afterwards.
     *  When omitted, the Scenes section is hidden entirely. */
    extraGroups?: SceneGroup[];

    headerSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
}

export interface FormulaPickerRef {
    focusSearch: () => void;
    selectRandom: () => void;
}

const VIEW_MODE_LS_KEY = 'gmt.formulaPicker.viewMode';

// ─────────────────────────────────────────────────────────────────────────────
// Internal model
// ─────────────────────────────────────────────────────────────────────────────

interface NativeCat { kind: 'native';  id: string; name: string; items: string[]; }
interface SpecialCat { kind: 'special'; id: string; /* 'modular' | 'workshop' */ }
interface CustomCat { kind: 'custom'; id: 'custom'; name: string; items: string[]; }
interface SceneGroupCat {
    kind: 'scene-group';
    id: string;
    name: string;
    group: SceneGroup;
}
type Cat = NativeCat | SpecialCat | CustomCat | SceneGroupCat;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const FormulaPicker = forwardRef<FormulaPickerRef, FormulaPickerProps>(
    function FormulaPicker(props, ref) {
        const {
            variant,
            anchorRect,
            value,
            onCommit,
            onClose,
            specialEntries = DEFAULT_SPECIAL_ENTRIES,
            disabledIds,
            disabledReason,
            autoFocusSearch = false,
            defaultView = 'grid',
            showHoverPreview = true,
            extraGroups,
            headerSlot,
            footerSlot,
        } = props;

        useRenderPause(true);

        // ── View mode (Grid / List) ───────────────────────────────────────────
        const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
            try {
                const stored = window.localStorage.getItem(VIEW_MODE_LS_KEY);
                if (stored === 'grid' || stored === 'list') return stored;
            } catch { /* ignore */ }
            return defaultView;
        });
        const updateViewMode = useCallback((next: 'grid' | 'list') => {
            setViewMode(next);
            try { window.localStorage.setItem(VIEW_MODE_LS_KEY, next); } catch { /* ignore */ }
        }, []);

        // ── Search visibility + query ────────────────────────────────────────
        const [searchVisible, setSearchVisible] = useState(autoFocusSearch);
        const [query, setQuery] = useState('');
        const searchRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            if (searchVisible) {
                // Defer so popover layout settles first.
                const id = window.setTimeout(() => searchRef.current?.focus(), 0);
                return () => window.clearTimeout(id);
            }
        }, [searchVisible]);

        const searching = query.trim().length > 0;

        // ── Build category model ─────────────────────────────────────────────
        const cats: Cat[] = useMemo(() => {
            const allDefs = registry.getAll();
            const knownIds = new Set(allDefs.map(d => d.id));
            const result: Cat[] = [];

            // Native (in design order).
            for (const cat of NATIVE_CATEGORIES) {
                const items = cat.items.filter(id => knownIds.has(id));
                if (items.length > 0) {
                    result.push({ kind: 'native', id: cat.id, name: cat.name, items });
                }
            }

            // Special launchers.
            for (const s of specialEntries) result.push({ kind: 'special', id: s });

            // Scenes — caller-driven via `extraGroups`. Each group gets a
            // sidebar entry under the "Scenes" section. Section is hidden
            // when the caller didn't pass any.
            if (extraGroups) {
                for (const g of extraGroups) {
                    result.push({ kind: 'scene-group', id: g.id, name: g.name, group: g });
                }
            }

            // Custom: registered formulas with importSource OR formulas not
            // classified in NATIVE_CATEGORIES. Hidden when empty.
            const customs: string[] = [];
            for (const def of allDefs) {
                if (def.id === 'Modular') continue;
                if (def.importSource) customs.push(def.id);
                else if (!FORMULA_TO_CATEGORY.has(def.id)) customs.push(def.id);
            }
            if (customs.length > 0) {
                result.push({
                    kind: 'custom', id: 'custom',
                    name: `Custom (${customs.length} imported)`,
                    items: customs,
                });
            }
            return result;
        }, [specialEntries, extraGroups]);

        const firstBrowsable = useMemo(() => {
            const c = cats.find(c => c.kind === 'native' || c.kind === 'custom');
            return c ? c.id : null;
        }, [cats]);

        const initialCat = useMemo(() => {
            if (value && FORMULA_TO_CATEGORY.has(value)) return FORMULA_TO_CATEGORY.get(value)!;
            return firstBrowsable;
        }, [value, firstBrowsable]);

        const [activeCat, setActiveCat] = useState<string | null>(initialCat);

        // ── Search results ───────────────────────────────────────────────────
        const searchResults: string[] = useMemo(() => {
            if (!searching) return [];
            const q = query.trim().toLowerCase();
            const allDefs = registry.getAll();
            const scored: Array<{ id: string; score: number }> = [];
            for (const def of allDefs) {
                if (def.id === 'Modular') continue;
                const name = def.name.toLowerCase();
                const idLow = def.id.toLowerCase();
                const cat = FORMULA_TO_CATEGORY.get(def.id) ?? '';
                const desc = (def.description ?? '').toLowerCase();
                let score = 0;
                if (name.startsWith(q)) score += 100;
                else if (name.includes(q)) score += 60;
                if (idLow.includes(q)) score += 40;
                if (desc.includes(q)) score += 25;
                if (cat.includes(q)) score += 10;
                if (score > 0) scored.push({ id: def.id, score });
            }
            scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
            return scored.map(s => s.id);
        }, [searching, query]);

        // ── Active pane items ────────────────────────────────────────────────
        const paneItems: string[] = useMemo(() => {
            if (searching) return searchResults;
            const c = cats.find(c => c.id === activeCat);
            if (!c) return [];
            if (c.kind === 'native' || c.kind === 'custom') return c.items;
            return [];
        }, [searching, searchResults, cats, activeCat]);

        const activeCatObj = useMemo(
            () => cats.find(c => c.id === activeCat),
            [cats, activeCat],
        );
        const isSpecialActive = !searching && activeCatObj?.kind === 'special';
        const isSceneGroupActive = !searching && activeCatObj?.kind === 'scene-group';

        // ── Focus / hover ────────────────────────────────────────────────────
        // Two focus areas track which pane the arrow keys drive: 'grid' is
        // the item list (default), 'sidebar' is the category list. ArrowLeft
        // from the grid's leftmost column (or from list mode) crosses into
        // 'sidebar'; ArrowRight/Enter on a non-special category crosses back.
        const [focusArea, setFocusArea] = useState<'sidebar' | 'grid'>('grid');
        const [focusedCatIndex, setFocusedCatIndex] = useState<number>(0);
        const [focusedIndex, setFocusedIndex] = useState<number>(-1);
        const [hoveredId, setHoveredId] = useState<string | null>(null);

        const bodyRef = useRef<HTMLDivElement>(null);
        const gridContainerRef = useRef<HTMLDivElement>(null);
        const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
        const sidebarRowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

        // Keep focusedCatIndex in sync with whichever cat is currently active
        // (e.g. when the user clicks a sidebar row with the mouse).
        useEffect(() => {
            const i = cats.findIndex(c => c.id === activeCat);
            if (i >= 0) setFocusedCatIndex(i);
        }, [activeCat, cats]);

        // Searching hides the sidebar entirely — force focus back into grid
        // (the flat search results list) so arrows nav the matches.
        useEffect(() => {
            if (searching && focusArea === 'sidebar') setFocusArea('grid');
        }, [searching, focusArea]);

        // Scroll focused sidebar row into view.
        useEffect(() => {
            if (focusArea !== 'sidebar') return;
            const c = cats[focusedCatIndex];
            const el = c ? sidebarRowRefs.current.get(c.id) : null;
            el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }, [focusArea, focusedCatIndex, cats]);

        // Body takes focus on mount so arrow keys work immediately.
        useEffect(() => {
            const id = window.setTimeout(() => bodyRef.current?.focus(), 0);
            return () => window.clearTimeout(id);
        }, []);

        // Grid column count — sized once per resize via ResizeObserver
        // instead of querying computed style on every arrow keypress
        // (forced reflow + Tailwind class coupling).
        const gridColsRef = useRef(1);
        useLayoutEffect(() => {
            const el = gridContainerRef.current;
            if (!el) { gridColsRef.current = 1; return; }
            const measure = () => {
                const grid = el.querySelector('.grid') as HTMLElement | null;
                if (!grid) { gridColsRef.current = 1; return; }
                const tmpl = window.getComputedStyle(grid).gridTemplateColumns;
                gridColsRef.current = Math.max(1, tmpl.split(' ').filter(Boolean).length);
            };
            measure();
            const ro = new ResizeObserver(measure);
            ro.observe(el);
            return () => ro.disconnect();
        }, [viewMode, searching, activeCat]);

        // ── Focused-index reset — content-keyed only ─────────────────────────
        // Recompute when the visible items CONTENT changes (id list, not just
        // the disabledIds reference). This was the cause of the scroll-jump +
        // arrow-nav regression: depending on the useCallback'd `isDisabled`
        // reran the effect on every parent re-render, snapping focus back to
        // the value's index and re-firing scrollIntoView.
        const itemsSignature = useMemo(() => paneItems.join('|'), [paneItems]);
        useEffect(() => {
            if (paneItems.length === 0) { setFocusedIndex(-1); return; }
            const has = (id: string) => paneItems.includes(id) && !disabledIds?.has(id);
            if (value && has(value)) {
                setFocusedIndex(paneItems.indexOf(value));
            } else {
                const i = paneItems.findIndex(id => !disabledIds?.has(id));
                setFocusedIndex(i);
            }
            // disabledIds intentionally NOT a dep — see comment above.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [itemsSignature, value]);

        // Scroll focused card into view — only when focusedIndex changes,
        // NOT when paneItems re-references.
        useEffect(() => {
            if (focusedIndex < 0) return;
            const id = paneItems[focusedIndex];
            const el = id ? cardRefs.current.get(id) : null;
            el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [focusedIndex]);

        // ── Step focused index, skipping disabled ────────────────────────────
        const stepIndex = useCallback((start: number, dir: 1 | -1): number => {
            const n = paneItems.length;
            if (n === 0) return -1;
            let i = start;
            for (let k = 0; k < n; k++) {
                i = (i + dir + n) % n;
                if (!disabledIds?.has(paneItems[i])) return i;
            }
            return -1;
        }, [paneItems, disabledIds]);

        const commitId = useCallback((id: string) => {
            if (disabledIds?.has(id)) return;
            if (id === 'workshop') {
                onCommit({ action: 'launch', id: 'workshop' });
                return;
            }
            const realId = id === 'modular' ? 'Modular' : id;
            onCommit({ action: 'select', id: realId });
        }, [onCommit, disabledIds]);

        // ── Key handler ──────────────────────────────────────────────────────
        const openSearchWithChar = useCallback((ch: string) => {
            setSearchVisible(true);
            setQuery(prev => prev + ch);
        }, []);

        const onKeyDown = useCallback((e: React.KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const inSearchInput = target.tagName === 'INPUT';

            // ── Escape (uniform across panes) ─────────────────────────────
            if (e.key === 'Escape') {
                e.preventDefault();
                if (searchVisible && query.length > 0) {
                    setQuery('');
                    return;
                }
                if (searchVisible) {
                    setSearchVisible(false);
                    bodyRef.current?.focus();
                    return;
                }
                onClose?.();
                return;
            }

            // ── Sidebar focus ─────────────────────────────────────────────
            if (focusArea === 'sidebar' && !searching) {
                const n = cats.length;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (n === 0) return;
                    const next = Math.min(focusedCatIndex + 1, n - 1);
                    setFocusedCatIndex(next);
                    setActiveCat(cats[next].id);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (n === 0) return;
                    const next = Math.max(focusedCatIndex - 1, 0);
                    setFocusedCatIndex(next);
                    setActiveCat(cats[next].id);
                    return;
                }
                if (e.key === 'ArrowRight' || e.key === 'Enter') {
                    e.preventDefault();
                    const c = cats[focusedCatIndex];
                    if (c?.kind === 'special') {
                        // Right/Enter on a launcher commits it.
                        commitId(c.id);
                        return;
                    }
                    setFocusArea('grid');
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    return; // already at the leftmost surface
                }

                // Printable key — auto-open search even when in sidebar.
                if (
                    !inSearchInput
                    && e.key.length === 1
                    && !e.ctrlKey && !e.metaKey && !e.altKey
                ) {
                    e.preventDefault();
                    setFocusArea('grid');     // search results live in the grid pane
                    openSearchWithChar(e.key);
                }
                return;
            }

            // ── Grid focus ────────────────────────────────────────────────
            if (e.key === 'Enter') {
                if (isSpecialActive && activeCatObj?.kind === 'special') {
                    e.preventDefault();
                    commitId(activeCatObj.id);
                    return;
                }
                if (focusedIndex >= 0 && focusedIndex < paneItems.length) {
                    e.preventDefault();
                    commitId(paneItems[focusedIndex]);
                }
                return;
            }

            const isList = viewMode === 'list' || searching;
            const cols = isList ? 1 : gridColsRef.current;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (paneItems.length === 0) return;
                if (focusedIndex < 0) setFocusedIndex(stepIndex(-1, 1));
                else setFocusedIndex(stepIndex(focusedIndex + cols - 1, 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (paneItems.length === 0) return;
                if (focusedIndex < 0) setFocusedIndex(stepIndex(0, -1));
                else setFocusedIndex(stepIndex(focusedIndex - cols + 1, -1));
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (paneItems.length === 0) return;
                setFocusedIndex(stepIndex(focusedIndex, 1));
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                // ArrowLeft escapes to the sidebar when there's nowhere
                // further left in the grid (leftmost column or list mode).
                // Disabled while searching — the sidebar is hidden then.
                const atLeftmost =
                    paneItems.length === 0
                    || isList
                    || (focusedIndex >= 0 && focusedIndex % cols === 0)
                    || focusedIndex < 0;
                if (atLeftmost && !searching) {
                    const i = cats.findIndex(c => c.id === activeCat);
                    setFocusedCatIndex(i >= 0 ? i : 0);
                    setFocusArea('sidebar');
                    return;
                }
                if (paneItems.length === 0) return;
                setFocusedIndex(stepIndex(focusedIndex, -1));
                return;
            }

            // Printable key — auto-open search and feed the char in.
            if (
                !inSearchInput
                && e.key.length === 1
                && !e.ctrlKey && !e.metaKey && !e.altKey
            ) {
                e.preventDefault();
                openSearchWithChar(e.key);
            }
        }, [
            searchVisible, query, onClose, focusArea, cats, focusedCatIndex,
            isSpecialActive, activeCatObj, focusedIndex, paneItems, viewMode,
            searching, activeCat, stepIndex, commitId, openSearchWithChar,
        ]);

        // ── Random pick ──────────────────────────────────────────────────────
        // Pool is every registered formula except the Modular graph-editor
        // entry and anything the caller disabled. Drawn from the registry
        // (not the current pane) so the dice can surface formulas from
        // categories the user isn't currently viewing.
        const pickRandom = useCallback(() => {
            const pool: string[] = [];
            for (const def of registry.getAll()) {
                if (def.id === 'Modular') continue;
                if (disabledIds?.has(def.id)) continue;
                pool.push(def.id);
            }
            if (pool.length === 0) return;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            // Switch to the cat containing the pick so the card is visible
            // after commit. Matters for the wizard variant where the picker
            // stays open — the existing focusedIndex / scrollIntoView
            // effects then chain off the updated `value` prop to scroll the
            // card into view. No-op when the cat is already active.
            const containing = cats.find(
                c => (c.kind === 'native' || c.kind === 'custom') && c.items.includes(pick),
            );
            if (containing && containing.id !== activeCat) {
                setActiveCat(containing.id);
                setQuery('');
            }
            commitId(pick);
        }, [disabledIds, commitId, cats, activeCat]);

        // ── Imperative ref ───────────────────────────────────────────────────
        useImperativeHandle(ref, () => ({
            focusSearch: () => { setSearchVisible(true); searchRef.current?.focus(); },
            selectRandom: pickRandom,
        }), [pickRandom]);

        // ── Body ─────────────────────────────────────────────────────────────
        const body = (
            <PickerBody
                bodyRef={bodyRef}
                cats={cats}
                activeCat={activeCat}
                focusArea={focusArea}
                focusedCatIndex={focusedCatIndex}
                sidebarRowRefs={sidebarRowRefs}
                onActivateCat={(id) => {
                    setActiveCat(id);
                    setQuery('');
                    // Mouse click on a sidebar row — return focus to the
                    // grid pane so subsequent arrows nav items.
                    setFocusArea('grid');
                }}
                onCommitSpecial={commitId}
                onCommitSceneItem={(item) => {
                    // Fire-and-forget — caller's onSelect handles fetch +
                    // loadScene. Picker closes immediately so the user sees
                    // the new scene appear as soon as it lands.
                    try { void item.onSelect(); } catch (err) {
                        console.warn('[FormulaPicker] scene onSelect threw:', err);
                    }
                    onClose?.();
                }}
                paneItems={paneItems}
                isSpecialActive={!!isSpecialActive}
                isSceneGroupActive={!!isSceneGroupActive}
                activeCatObj={activeCatObj ?? null}
                viewMode={viewMode}
                onViewMode={updateViewMode}
                onPickRandom={pickRandom}
                searchVisible={searchVisible}
                onToggleSearch={() => {
                    setSearchVisible(v => {
                        const next = !v;
                        if (!next) setQuery('');
                        return next;
                    });
                }}
                searching={searching}
                query={query}
                onQuery={setQuery}
                onClearQuery={() => setQuery('')}
                searchRef={searchRef}
                value={value}
                disabledIds={disabledIds}
                disabledReason={disabledReason}
                focusedIndex={focusedIndex}
                onHoverIndex={setFocusedIndex}
                hoveredId={hoveredId}
                onHover={(id) => setHoveredId(id)}
                onCommitItem={commitId}
                gridContainerRef={gridContainerRef}
                cardRefs={cardRefs}
                onKeyDown={onKeyDown}
                headerSlot={headerSlot}
                footerSlot={footerSlot}
                // hover preview rendering is handled by the variant shell
                // for popover; inline/modal keep it inline (or off).
                showInlineHoverPreview={showHoverPreview && variant === 'modal'}
            />
        );

        if (variant === 'popover') {
            return (
                <PopoverShell
                    anchorRect={anchorRect}
                    onClose={onClose}
                    viewMode={viewMode}
                    hoveredId={hoveredId}
                    showHoverPreview={showHoverPreview}
                >
                    {body}
                </PopoverShell>
            );
        }
        if (variant === 'modal') {
            return <ModalShell onClose={onClose}>{body}</ModalShell>;
        }
        return <InlineShell>{body}</InlineShell>;
    },
);

// ─────────────────────────────────────────────────────────────────────────────
// Shells
// ─────────────────────────────────────────────────────────────────────────────

function PopoverShell({
    anchorRect, onClose, viewMode, hoveredId, showHoverPreview, children,
}: {
    anchorRect?: DOMRect;
    onClose?: () => void;
    viewMode: 'grid' | 'list';
    hoveredId: string | null;
    showHoverPreview: boolean;
    children: React.ReactNode;
}) {
    const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
    const [previewStyle, setPreviewStyle] = useState<React.CSSProperties | null>(null);

    useLayoutEffect(() => {
        if (!anchorRect) return;
        const winH = window.innerHeight;
        const winW = window.innerWidth;
        const padding = 12;

        const isList = viewMode === 'list';
        const width = Math.min(isList ? 380 : 640, winW - padding * 2);

        let left = anchorRect.left;
        if (left + width > winW - padding) left = winW - width - padding;
        left = Math.max(padding, left);

        const spaceBelow = winH - anchorRect.bottom;
        const spaceAbove = anchorRect.top;
        const shouldFlip = spaceBelow < 380 && spaceAbove > spaceBelow;
        const availableH = shouldFlip ? spaceAbove - padding : spaceBelow - padding;
        const height = Math.min(560, Math.max(280, availableH));

        const base: React.CSSProperties = {
            position: 'fixed',
            left: `${left}px`,
            width: `${width}px`,
            height: `${height}px`,
            maxWidth: `calc(100vw - ${padding * 2}px)`,
            zIndex: 9999,
            opacity: 1,
            pointerEvents: 'auto',
        };
        const vert: React.CSSProperties = shouldFlip
            ? { bottom: `${winH - anchorRect.top + 4}px`, top: 'auto' }
            : { top: `${anchorRect.bottom + 4}px`, bottom: 'auto' };
        setBoxStyle({ ...base, ...vert });

        // Preview floater positioning — render alongside the popover so it
        // doesn't obscure the grid. Right side preferred; left if right is
        // tight. Hidden if neither side has room (small viewports).
        const previewW = 272;          // 256 image + borders + padding
        const previewH = 272;
        const gap = 10;
        const spaceRight = winW - (left + width) - padding;
        const spaceLeft = left - padding;

        const previewBase: React.CSSProperties = {
            position: 'fixed',
            width: `${previewW}px`,
            height: `${previewH}px`,
            zIndex: 10000,
            pointerEvents: 'none',
        };

        // Vertical pin: top of preview aligned with top of popover, but
        // clamp so the preview stays inside the viewport.
        const popoverTop = shouldFlip ? (anchorRect.top - height - 4) : (anchorRect.bottom + 4);
        const previewTop = Math.max(padding, Math.min(popoverTop, winH - previewH - padding));

        if (spaceRight >= previewW + gap) {
            setPreviewStyle({
                ...previewBase,
                left: `${left + width + gap}px`,
                top: `${previewTop}px`,
            });
        } else if (spaceLeft >= previewW + gap) {
            setPreviewStyle({
                ...previewBase,
                left: `${left - previewW - gap}px`,
                top: `${previewTop}px`,
            });
        } else {
            setPreviewStyle(null);   // hide on narrow viewports
        }
    }, [anchorRect, viewMode]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.formula-picker-shell')) return;
            onClose?.();
        };
        const handleResize = () => onClose?.();
        window.addEventListener('mousedown', handleDown, true);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('mousedown', handleDown, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [onClose]);

    return createPortal(
        <>
            <div style={boxStyle}>
                <div className="formula-picker-shell h-full w-full bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-fade-in-down">
                    {children}
                </div>
            </div>
            {showHoverPreview && hoveredId && hoveredId !== 'Modular' && previewStyle && (
                <div style={previewStyle}>
                    <HoverPreviewCard id={hoveredId} />
                </div>
            )}
        </>,
        document.body,
    );
}

function ModalShell({ onClose, children }: { onClose?: () => void; children: React.ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                className="formula-picker-shell bg-[#121212] border border-white/10 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
                style={{ width: 'min(760px, 100%)', height: 'min(640px, 100%)' }}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

function InlineShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="formula-picker-shell bg-[#121212] border border-white/10 rounded-lg overflow-hidden flex flex-col h-[400px] w-full">
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Body — header / search / sidebar / grid / footer
// ─────────────────────────────────────────────────────────────────────────────

interface PickerBodyProps {
    bodyRef: React.RefObject<HTMLDivElement>;
    cats: Cat[];
    activeCat: string | null;
    activeCatObj: Cat | null;
    focusArea: 'sidebar' | 'grid';
    focusedCatIndex: number;
    sidebarRowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
    onActivateCat: (id: string) => void;
    onCommitSpecial: (id: string) => void;
    onCommitSceneItem: (item: SceneItem) => void;
    paneItems: string[];
    isSpecialActive: boolean;
    isSceneGroupActive: boolean;
    viewMode: 'grid' | 'list';
    onViewMode: (v: 'grid' | 'list') => void;
    onPickRandom: () => void;
    searchVisible: boolean;
    onToggleSearch: () => void;
    searching: boolean;
    query: string;
    onQuery: (q: string) => void;
    onClearQuery: () => void;
    searchRef: React.RefObject<HTMLInputElement>;
    value?: string;
    disabledIds?: Set<string>;
    disabledReason?: (id: string) => string | undefined;
    focusedIndex: number;
    onHoverIndex: (i: number) => void;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onCommitItem: (id: string) => void;
    gridContainerRef: React.RefObject<HTMLDivElement>;
    cardRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
    onKeyDown: (e: React.KeyboardEvent) => void;
    headerSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
    showInlineHoverPreview: boolean;
}

function PickerBody(p: PickerBodyProps) {
    return (
        <div
            ref={p.bodyRef}
            tabIndex={-1}
            onKeyDown={p.onKeyDown}
            className="flex flex-col h-full min-h-0 outline-none"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#181818]">
                <div className="flex items-center gap-2 min-w-0">
                    {p.headerSlot ?? (
                        <span className="text-[11px] font-bold text-gray-300 tracking-tight">Pick a formula</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={p.onPickRandom}
                        aria-label="Pick a random formula"
                        title="Pick a random formula"
                        className="px-1.5 py-1 rounded border text-gray-500 hover:text-cyan-300 hover:border-cyan-500/40 bg-black/40 border-white/10 transition-colors flex items-center justify-center"
                    >
                        <DiceIcon />
                    </button>
                    <button
                        onClick={p.onToggleSearch}
                        aria-label="Toggle search"
                        title="Search (or just start typing)"
                        className={`px-2 py-1 rounded border text-[10px] font-bold transition-colors ${
                            p.searchVisible
                                ? 'bg-cyan-900/40 text-cyan-300 border-cyan-500/40'
                                : 'bg-black/40 text-gray-500 hover:text-white border-white/10'
                        }`}
                    >
                        🔍
                    </button>
                    <ViewToggle mode={p.viewMode} onChange={p.onViewMode} />
                </div>
            </div>

            {/* Search (only when visible) */}
            {p.searchVisible && (
                <div className="px-3 py-2 border-b border-white/5 bg-[#121212]">
                    <div className="relative flex items-center">
                        <span className="absolute left-2 text-gray-500 pointer-events-none text-[11px]">🔍</span>
                        <input
                            ref={p.searchRef}
                            type="text"
                            value={p.query}
                            onChange={(e) => p.onQuery(e.target.value)}
                            placeholder="type to search"
                            className="w-full bg-black/40 border border-white/10 focus:border-cyan-500/50 outline-none text-[11px] text-gray-200 rounded pl-7 pr-7 py-1.5 placeholder:text-gray-600"
                        />
                        {p.query && (
                            <button
                                onClick={p.onClearQuery}
                                className="absolute right-1.5 text-gray-500 hover:text-white p-1"
                                aria-label="Clear search"
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Body: sidebar + grid */}
            <div className="relative flex flex-1 min-h-0">
                {!p.searching && (
                    <Sidebar
                        cats={p.cats}
                        activeCat={p.activeCat}
                        focusArea={p.focusArea}
                        focusedCatIndex={p.focusedCatIndex}
                        rowRefs={p.sidebarRowRefs}
                        onActivate={p.onActivateCat}
                    />
                )}

                <div className="flex-1 min-w-0 overflow-y-auto custom-scroll bg-[#0e0e0e]" ref={p.gridContainerRef}>
                    {p.isSpecialActive && p.activeCatObj?.kind === 'special' ? (
                        <SpecialPane id={p.activeCatObj.id} onCommit={p.onCommitSpecial} />
                    ) : p.isSceneGroupActive && p.activeCatObj?.kind === 'scene-group' ? (
                        <ScenePane
                            group={p.activeCatObj.group}
                            viewMode={p.viewMode}
                            onCommit={p.onCommitSceneItem}
                        />
                    ) : (
                        <ItemPane
                            items={p.paneItems}
                            viewMode={p.viewMode}
                            value={p.value}
                            isDisabled={(id) => !!p.disabledIds?.has(id)}
                            disabledReason={p.disabledReason}
                            focusedIndex={p.focusedIndex}
                            hoveredId={p.hoveredId}
                            onHover={(id, i) => { p.onHover(id); if (i >= 0) p.onHoverIndex(i); }}
                            onCommit={p.onCommitItem}
                            cardRefs={p.cardRefs}
                            searching={p.searching}
                            categoryLabel={
                                !p.searching
                                    ? (p.activeCatObj?.kind === 'native' || p.activeCatObj?.kind === 'custom'
                                        ? p.activeCatObj.name
                                        : undefined)
                                    : `Search results (${p.paneItems.length})`
                            }
                        />
                    )}
                </div>

                {/* Inline hover preview — modal variant only. Popover variant
                 *  renders the preview outside the box via PopoverShell. */}
                {p.showInlineHoverPreview && p.hoveredId && p.hoveredId !== 'Modular' && (
                    <div className="absolute right-3 bottom-3 w-[224px] h-[224px] pointer-events-none">
                        <HoverPreviewCard id={p.hoveredId} />
                    </div>
                )}
            </div>

            {p.footerSlot && (
                <div className="border-t border-white/10 px-3 py-2 bg-[#181818]">{p.footerSlot}</div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({
    cats, activeCat, focusArea, focusedCatIndex, rowRefs, onActivate,
}: {
    cats: Cat[];
    activeCat: string | null;
    focusArea: 'sidebar' | 'grid';
    focusedCatIndex: number;
    rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
    onActivate: (id: string) => void;
}) {
    return (
        <div className="w-40 shrink-0 border-r border-white/10 bg-[#141414] overflow-y-auto custom-scroll py-1">
            {cats.map((c, i) => {
                const prev = cats[i - 1];
                const showSpecialSeparator = c.kind === 'special' && (!prev || prev.kind !== 'special');
                const showScenesSeparator =
                    c.kind === 'scene-group' && prev?.kind !== 'scene-group';
                const showCustomSeparator = c.kind === 'custom';
                const keyboardFocused = focusArea === 'sidebar' && focusedCatIndex === i;
                return (
                    <React.Fragment key={c.id}>
                        {showSpecialSeparator && (
                            <div className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-wider text-gray-600">Special</div>
                        )}
                        {showScenesSeparator && !showSpecialSeparator && (
                            <div className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-wider text-gray-600">Scenes</div>
                        )}
                        {showCustomSeparator && (
                            <div className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-wider text-gray-600">Custom</div>
                        )}
                        <SidebarRow
                            cat={c}
                            active={activeCat === c.id}
                            keyboardFocused={keyboardFocused}
                            register={(el) => { if (el) rowRefs.current.set(c.id, el); else rowRefs.current.delete(c.id); }}
                            onClick={() => onActivate(c.id)}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function SidebarRow({
    cat, active, keyboardFocused, register, onClick,
}: {
    cat: Cat;
    active: boolean;
    keyboardFocused: boolean;
    register: (el: HTMLButtonElement | null) => void;
    onClick: () => void;
}) {
    let label: React.ReactNode;
    let icon: React.ReactNode = null;
    let extraClass = '';

    if (cat.kind === 'native') {
        label = cat.name;
    } else if (cat.kind === 'custom') {
        label = cat.name;
        extraClass = 'text-purple-300';
    } else if (cat.kind === 'scene-group') {
        label = <span className="flex items-center gap-2">
            <span className="truncate">{cat.name}</span>
            {cat.group.isLoading && (
                <span className="text-[9px] text-gray-500 italic">…</span>
            )}
            {!cat.group.isLoading && cat.group.items.length > 0 && (
                <span className="text-[9px] text-gray-600">{cat.group.items.length}</span>
            )}
        </span>;
        extraClass = 'text-cyan-300';
    } else if (cat.id === 'modular') {
        label = 'Modular';
        icon = <span className="text-cyan-400"><NetworkIcon /></span>;
        extraClass = 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-bold';
    } else { // workshop
        label = <>Workshop <span className="text-gray-500">↗</span></>;
        icon = <span className="text-purple-400"><CodeIcon /></span>;
        extraClass = 'text-purple-300';
    }

    return (
        <button
            ref={register}
            onClick={onClick}
            className={`relative w-full text-left px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 transition-colors ${
                active ? 'bg-cyan-900/40 text-white' : `text-gray-400 hover:bg-white/5 hover:text-white ${extraClass}`
            } ${keyboardFocused ? 'ring-1 ring-cyan-500/60 ring-inset' : ''}`}
        >
            {keyboardFocused && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400" />
            )}
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Special pane — Modular / Workshop confirmation
// ─────────────────────────────────────────────────────────────────────────────

function SpecialPane({ id, onCommit }: { id: string; onCommit: (id: string) => void }) {
    const isWorkshop = id === 'workshop';
    const isModular = id === 'modular';

    return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-cyan-400">
                {isModular ? <NetworkIcon /> : <CodeIcon />}
            </div>
            <div className="text-[13px] font-bold text-white">
                {isModular ? 'Modular (graph editor)' : 'Open Formula Workshop'}
            </div>
            <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                {isModular
                    ? 'Switch the active formula to Modular and edit the graph.'
                    : 'Import a Fragmentarium / DEC formula or edit an existing one. Opens in a separate modal.'}
            </p>
            <button
                onClick={() => onCommit(id)}
                className="mt-2 px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-900/70 text-cyan-300 hover:text-white text-[11px] font-bold rounded border border-cyan-500/30 transition-colors"
            >
                {isModular ? 'Switch to Modular' : 'Open Workshop'}
            </button>
        </div>
    );
}

function ScenePane({
    group, viewMode, onCommit,
}: { group: SceneGroup; viewMode: 'grid' | 'list'; onCommit: (item: SceneItem) => void }) {
    // Initial fetch in flight + no items yet → full-pane loading state.
    if (group.isLoading && group.items.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-2">
                <div className="text-[11px] text-gray-500 italic">Loading {group.name}…</div>
            </div>
        );
    }
    if (group.items.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-2">
                <div className="text-[13px] font-bold text-gray-400">{group.name}</div>
                <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                    {group.emptyMessage ?? 'No items.'}
                </p>
            </div>
        );
    }
    const isList = viewMode === 'list';
    return (
        <div className="p-3">
            <div className="px-1 pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                {group.name}
            </div>
            {isList ? (
                <div className="flex flex-col gap-0.5">
                    {group.items.map(item => (
                        <SceneRow key={item.id} item={item} onCommit={onCommit} />
                    ))}
                </div>
            ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
                    {group.items.map(item => (
                        <SceneCard key={item.id} item={item} onCommit={onCommit} />
                    ))}
                </div>
            )}
            {group.hasMore && group.loadMore && (
                <div className="mt-3 flex justify-center">
                    <button
                        onClick={() => { void group.loadMore?.(); }}
                        disabled={group.isLoadingMore}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                            group.isLoadingMore
                                ? 'bg-black/40 text-gray-600 border-white/5 cursor-wait'
                                : 'bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-300 hover:text-white border-cyan-500/30'
                        }`}
                    >
                        {group.isLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}

function SceneCard({ item, onCommit }: { item: SceneItem; onCommit: (item: SceneItem) => void }) {
    return (
        <button
            onClick={() => onCommit(item)}
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : (item.description ?? item.name)}
            className={`relative flex flex-col items-stretch text-left rounded border overflow-hidden transition-all group ${
                item.disabled
                    ? 'opacity-40 cursor-not-allowed border-white/5'
                    : 'border-white/10 hover:border-cyan-500/40 bg-black/30 hover:bg-white/[0.04]'
            }`}
        >
            <div className="aspect-square w-full bg-black relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                    <CubeIcon />
                </div>
                {item.thumbnailUrl && (
                    <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                {item.badge && (
                    <div className={`absolute top-1 left-1 px-1 py-0.5 text-[8px] font-bold rounded ${item.badge.className ?? 'bg-black/70 text-gray-300'}`}>
                        {item.badge.text}
                    </div>
                )}
            </div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-gray-200 truncate group-hover:text-white">
                {item.name}
            </div>
        </button>
    );
}

function SceneRow({ item, onCommit }: { item: SceneItem; onCommit: (item: SceneItem) => void }) {
    return (
        <button
            onClick={() => onCommit(item)}
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : (item.description ?? item.name)}
            className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
        >
            {item.badge && (
                <span className={`shrink-0 px-1 py-0.5 text-[8px] font-bold rounded ${item.badge.className ?? 'bg-black/40 text-gray-400'}`}>
                    {item.badge.text}
                </span>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate">{item.name}</div>
                {item.description && (
                    <div className="text-[9px] text-gray-500 truncate">{item.description}</div>
                )}
            </div>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Item pane — grid or list
// ─────────────────────────────────────────────────────────────────────────────

interface ItemPaneProps {
    items: string[];
    viewMode: 'grid' | 'list';
    value?: string;
    isDisabled: (id: string) => boolean;
    disabledReason?: (id: string) => string | undefined;
    focusedIndex: number;
    hoveredId: string | null;
    onHover: (id: string | null, index: number) => void;
    onCommit: (id: string) => void;
    cardRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
    searching: boolean;
    categoryLabel?: string;
}

function ItemPane(p: ItemPaneProps) {
    const isList = p.viewMode === 'list' || p.searching;
    return (
        <div className="p-3">
            {p.categoryLabel && (
                <div className="px-1 pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    {p.categoryLabel}
                </div>
            )}
            {p.items.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-[11px] italic">No matches</div>
            ) : isList ? (
                <ListItems {...p} />
            ) : (
                <GridItems {...p} />
            )}
        </div>
    );
}

function GridItems(p: ItemPaneProps) {
    return (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
            {p.items.map((id, i) => (
                <FormulaCard
                    key={id}
                    id={id}
                    index={i}
                    selected={p.value === id}
                    disabled={p.isDisabled(id)}
                    disabledReason={p.disabledReason?.(id)}
                    focused={p.focusedIndex === i}
                    onHover={p.onHover}
                    onCommit={p.onCommit}
                    register={(el) => { if (el) p.cardRefs.current.set(id, el); else p.cardRefs.current.delete(id); }}
                />
            ))}
        </div>
    );
}

function ListItems(p: ItemPaneProps) {
    return (
        <div className="flex flex-col gap-0.5">
            {p.items.map((id, i) => (
                <FormulaRow
                    key={id}
                    id={id}
                    index={i}
                    selected={p.value === id}
                    disabled={p.isDisabled(id)}
                    disabledReason={p.disabledReason?.(id)}
                    focused={p.focusedIndex === i}
                    onHover={p.onHover}
                    onCommit={p.onCommit}
                    register={(el) => { if (el) p.cardRefs.current.set(id, el); else p.cardRefs.current.delete(id); }}
                />
            ))}
        </div>
    );
}

interface CardProps {
    id: string;
    index: number;
    selected: boolean;
    disabled: boolean;
    disabledReason?: string;
    focused: boolean;
    onHover: (id: string | null, index: number) => void;
    onCommit: (id: string) => void;
    register: (el: HTMLButtonElement | null) => void;
}

function FormulaCard({
    id, index, selected, disabled, disabledReason, focused, onHover, onCommit, register,
}: CardProps) {
    const def = registry.get(id as FormulaType);
    const label = def ? def.name : id;
    const isModular = id === 'Modular';

    return (
        <button
            ref={register}
            onClick={() => onCommit(id)}
            onMouseEnter={() => onHover(id, index)}
            onMouseLeave={() => onHover(null, -1)}
            disabled={disabled}
            title={disabled ? disabledReason : label}
            className={`relative flex flex-col items-stretch text-left rounded border overflow-hidden transition-all group ${
                disabled
                    ? 'opacity-40 cursor-not-allowed border-white/5'
                    : selected
                        ? 'border-cyan-500/70 bg-cyan-900/20'
                        : focused
                            ? 'border-cyan-500/40 bg-white/[0.04]'
                            : 'border-white/10 hover:border-white/30 bg-black/30 hover:bg-white/[0.04]'
            }`}
        >
            <div className="aspect-square w-full bg-black relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                    {isModular ? <NetworkIcon /> : <CubeIcon />}
                </div>
                {!isModular && (
                    <div className="absolute inset-0">
                        <LazyThumbnail id={id} label={label} />
                    </div>
                )}
                {selected && (
                    <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-cyan-900 shadow-lg">
                            <CheckIcon />
                        </div>
                    </div>
                )}
            </div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-gray-200 truncate group-hover:text-white">
                {label}
            </div>
        </button>
    );
}

function FormulaRow({
    id, index, selected, disabled, disabledReason, focused, onHover, onCommit, register,
}: CardProps) {
    const def = registry.get(id as FormulaType);
    const label = def ? def.name : id;

    return (
        <button
            ref={register}
            onClick={() => onCommit(id)}
            onMouseEnter={() => onHover(id, index)}
            onMouseLeave={() => onHover(null, -1)}
            disabled={disabled}
            title={disabled ? disabledReason : (def?.shortDescription ?? label)}
            className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : selected
                        ? 'bg-cyan-900/30 text-cyan-300'
                        : focused
                            ? 'bg-white/[0.05] text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
        >
            {selected && <CheckIcon />}
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate">{label}</div>
                {def?.shortDescription && (
                    <div className="text-[9px] text-gray-500 truncate">{def.shortDescription}</div>
                )}
            </div>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover preview card — used by both popover-shell preview and inline (modal)
// ─────────────────────────────────────────────────────────────────────────────

function HoverPreviewCard({ id }: { id: string }) {
    const def = registry.get(id as FormulaType);
    return (
        <div className="w-full h-full bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_40px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.25)] overflow-hidden animate-fade-in">
            <img
                src={`thumbnails/fractal_${id}.jpg`}
                className="w-full h-full object-cover"
                alt="Preview"
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                <div className="text-[10px] font-bold text-cyan-400 drop-shadow-md">
                    {def?.name ?? id}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// View toggle (Grid / List)
// ─────────────────────────────────────────────────────────────────────────────

function ViewToggle({
    mode, onChange,
}: { mode: 'grid' | 'list'; onChange: (m: 'grid' | 'list') => void }) {
    return (
        <div className="inline-flex bg-black/40 rounded border border-white/10 overflow-hidden">
            <button
                onClick={() => onChange('grid')}
                aria-label="Grid view"
                title="Grid view"
                className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                    mode === 'grid' ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-500 hover:text-white'
                }`}
            >
                ▦
            </button>
            <button
                onClick={() => onChange('list')}
                aria-label="List view"
                title="List view"
                className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                    mode === 'list' ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-500 hover:text-white'
                }`}
            >
                ≡
            </button>
        </div>
    );
}

