/**
 * @engine/menu — generic dropdown-menu host for the topbar.
 *
 * Any plugin or app can create a named menu (Help, System, User, …) that
 * appears as a button in one of @engine/topbar's slots. Other plugins
 * register items into those menus by id. Zero app-specific chrome.
 *
 * Why generic: GMT has three nearly-identical topbar dropdowns (System,
 * Help, Hardware). Apps built on this engine shouldn't each reinvent
 * that pattern — we factor it out once so the Help plugin can register
 * a menu and items via a uniform API, and the same component renders
 * any future menu (user preferences, plugin toggles, app-specific tools).
 *
 * Registration API:
 *
 *   menu.register({
 *     id: 'help',
 *     slot: 'right',
 *     order: 50,
 *     icon: HelpIcon,                  // React FC or node
 *     label?: 'Help',                  // optional text next to icon
 *     title?: 'Help & tips',
 *     align?: 'end',                   // Popover alignment
 *     width?: 'w-56',                  // Popover width
 *   });
 *
 *   menu.registerItem('help', {
 *     id: 'show-hints',
 *     order?: number,                   // ascending; lower renders first
 *     type: 'toggle',
 *     label: 'Show Hints',
 *     shortcut: 'H',                    // rendered as [H] next to label
 *     isActive: () => store.showHints,
 *     onToggle: () => store.setShowHints(!store.showHints),
 *   });
 *
 * Item types:
 *   - 'button'    — runs onSelect, closes the menu (unless closeOnSelect=false)
 *   - 'toggle'    — shows ON/OFF badge, flips via onToggle; keeps menu open
 *   - 'separator' — horizontal divider
 *   - 'section'   — small all-caps header label
 *   - 'custom'    — render a React FC passed a { close } prop
 *
 * installMenu() is idempotent. It has no side effects beyond subscribing
 * to the topbar registry on first call, so apps can skip it and just
 * call menu.register() when they want their first menu.
 */

import React, { useSyncExternalStore, useCallback, useState, useRef, useEffect } from 'react';
import { topbar, TopBarSlot } from './TopBar';
import { useEngineStore } from '../../store/engineStore';

// ── Types ──────────────────────────────────────────────────────────────

type IconRenderable = React.ReactNode | React.FC;

export type MenuItemType = 'button' | 'toggle' | 'separator' | 'section' | 'custom';

interface MenuItemBase {
    id: string;
    /** Ascending sort within a menu. Defaults to insertion order (0 + counter). */
    order?: number;
    /** Optional predicate — if false, item is hidden. Re-evaluated each render. */
    when?: () => boolean;
    className?: string;
}

export interface MenuButtonItem extends MenuItemBase {
    type: 'button';
    /** Static text or a getter re-evaluated each render for live labels
     *  (e.g. `Slot 3 ✓` once the slot is filled). */
    label: string | (() => string);
    icon?: IconRenderable;
    shortcut?: string;
    title?: string;
    onSelect: () => void;
    /** Default true — runs onSelect then closes the popover. */
    closeOnSelect?: boolean;
    /** Grey-out the row and suppress onSelect. Bool or predicate for
     *  live state (e.g. Undo/Redo disabled when stack is empty). */
    disabled?: boolean | (() => boolean);
}

export interface MenuToggleItem extends MenuItemBase {
    type: 'toggle';
    /** Static text or a getter re-evaluated each render for live labels. */
    label: string | (() => string);
    icon?: IconRenderable;
    shortcut?: string;
    title?: string;
    /** Returns current on/off state. Re-read on render for live updates. */
    isActive: () => boolean;
    onToggle: () => void;
    /** Badge color. Default 'cyan'. */
    color?: 'cyan' | 'green' | 'purple';
    /** Grey-out the row and suppress onToggle. Bool or predicate. */
    disabled?: boolean | (() => boolean);
}

export interface MenuSeparatorItem extends MenuItemBase {
    type: 'separator';
}

export interface MenuSectionItem extends MenuItemBase {
    type: 'section';
    label: string;
}

export interface MenuCustomItem extends MenuItemBase {
    type: 'custom';
    /** Receives a `close()` callback to dismiss the menu after rendering UI. */
    component: React.FC<{ close: () => void }>;
}

export type MenuItem =
    | MenuButtonItem
    | MenuToggleItem
    | MenuSeparatorItem
    | MenuSectionItem
    | MenuCustomItem;

export interface MenuDef {
    id: string;
    slot: TopBarSlot;
    order: number;
    /** Shown inside the topbar button. FC (preferred) or plain node. */
    icon?: IconRenderable;
    /** Optional text rendered next to the icon. */
    label?: string;
    /** Native title attribute (tooltip). */
    title?: string;
    align?: 'start' | 'end' | 'center';
    width?: string;
    /** Visibility of the topbar button itself. */
    when?: () => boolean;
}

// ── Registry ───────────────────────────────────────────────────────────

const _menus = new Map<string, MenuDef>();
const _items = new Map<string, Map<string, MenuItem>>();
const _insertCounter = new Map<string, number>();
const _subscribers = new Set<() => void>();
const _notify = () => _subscribers.forEach((fn) => fn());

const subscribe = (fn: () => void) => {
    _subscribers.add(fn);
    return () => { _subscribers.delete(fn); };
};

export const menu = {
    register(def: MenuDef) {
        _menus.set(def.id, def);
        if (!_items.has(def.id)) _items.set(def.id, new Map());
        if (!_insertCounter.has(def.id)) _insertCounter.set(def.id, 0);
        // Each menu owns one topbar slot entry. Re-registering replaces it.
        topbar.register({
            id: `menu:${def.id}`,
            slot: def.slot,
            order: def.order,
            when: def.when,
            component: () => <MenuAnchor menuId={def.id} />,
        });
        _notify();
    },
    unregister(id: string) {
        if (_menus.delete(id)) {
            _items.delete(id);
            _insertCounter.delete(id);
            topbar.unregister(`menu:${id}`);
            _notify();
        }
    },
    registerItem(menuId: string, item: MenuItem) {
        if (!_items.has(menuId)) _items.set(menuId, new Map());
        if (!_insertCounter.has(menuId)) _insertCounter.set(menuId, 0);
        // Preserve insertion order when no explicit order is supplied.
        const resolved: MenuItem = item.order === undefined
            ? { ...item, order: _insertCounter.get(menuId)! }
            : item;
        _insertCounter.set(menuId, _insertCounter.get(menuId)! + 1);
        _items.get(menuId)!.set(item.id, resolved);
        _notify();
    },
    unregisterItem(menuId: string, itemId: string) {
        if (_items.get(menuId)?.delete(itemId)) _notify();
    },
    listMenus(): MenuDef[] {
        return Array.from(_menus.values());
    },
    listItems(menuId: string): MenuItem[] {
        const map = _items.get(menuId);
        if (!map) return [];
        return Array.from(map.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    clear() {
        Array.from(_menus.keys()).forEach((id) => topbar.unregister(`menu:${id}`));
        _menus.clear();
        _items.clear();
        _insertCounter.clear();
        _notify();
    },
};

let _installed = false;
let _unsubStore: (() => void) | null = null;
export const installMenu = () => {
    if (_installed) return;
    _installed = true;
    // Pure API plugin — no auto-registered menus. Apps and other plugins
    // create menus via menu.register().
    //
    // Bump the registry revision on every engine-store change too so
    // toggle items' isActive() results re-render. Without this, a
    // `type: 'toggle'` row's ON/OFF badge would stay stale until a menu
    // re-registration bumped the internal rev.
    //
    // Defer the notify via queueMicrotask — Zustand fires the
    // subscriber synchronously during `setState`, so if setState
    // happens while React is rendering a different component,
    // immediate `_notify()` calls `setState` on MenuAnchor's
    // useSyncExternalStore subscribers while it's still committing,
    // triggering React's "Cannot update a component while rendering
    // a different component" warning. Microtask batching moves the
    // notify to after the current render completes.
    _unsubStore = useEngineStore.subscribe(() => {
        queueMicrotask(_notify);
    });
};
export const uninstallMenu = () => {
    menu.clear();
    _unsubStore?.();
    _unsubStore = null;
    _installed = false;
};

// ── Anchor + Popover rendering ─────────────────────────────────────────

const renderIcon = (icon: IconRenderable | undefined): React.ReactNode => {
    if (!icon) return null;
    if (typeof icon === 'function') {
        const Icon = icon as React.FC;
        return <Icon />;
    }
    return icon;
};

interface MenuAnchorProps {
    menuId: string;
}

const MenuAnchor: React.FC<MenuAnchorProps> = ({ menuId }) => {
    // Subscribe to both menu and item changes — the button label/items
    // update live if other plugins register mid-session.
    useSyncExternalStore(subscribe, () => {
        // Combine maps into a cheap identity we can depend on: the
        // registry is mutated in place, so we just count changes.
        return _notifyRev;
    }, () => _notifyRev);

    const def = _menus.get(menuId);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const close = useCallback(() => setOpen(false), []);

    // Outside-click dismissal. Skip the click that opened us.
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
        };
        const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
        return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
    }, [open, close]);

    if (!def) return null;

    const items = menu.listItems(menuId).filter((i) => !i.when || i.when());

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                className={`flex items-center gap-1 text-[10px] font-medium ${open ? 'text-cyan-300 border-cyan-500/40' : 'text-gray-300 hover:text-white border-white/10 hover:border-cyan-500/40'} bg-black/40 hover:bg-white/5 border rounded px-2 py-1 transition-colors`}
                title={def.title}
                aria-label={def.title || def.label || def.id}
            >
                {renderIcon(def.icon)}
                {def.label && <span>{def.label}</span>}
            </button>
            {open && (
                <div
                    className={`absolute top-full ${def.align === 'end' ? 'right-0' : def.align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'} mt-2 ${def.width || 'w-56'} bg-black/95 border border-white/15 rounded-lg shadow-2xl z-50 p-1`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {items.map((item) => (
                        <MenuItemView key={item.id} item={item} close={close} />
                    ))}
                    {items.length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-gray-600 italic">(empty)</div>
                    )}
                </div>
            )}
        </div>
    );
};

// Monotonic revision bumped every _notify() so useSyncExternalStore has
// a cheap, stable "has anything changed" snapshot.
let _notifyRev = 0;
const _bumpRev = () => { _notifyRev++; };
_subscribers.add(_bumpRev);

// ── Item renderers ─────────────────────────────────────────────────────

const BADGE_COLORS = {
    cyan:   { on: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40',     off: 'bg-white/[0.04] text-gray-600 border-white/5' },
    green:  { on: 'bg-green-500/30 text-green-300 border-green-500/40',  off: 'bg-white/[0.04] text-gray-600 border-white/5' },
    purple: { on: 'bg-purple-500/30 text-purple-300 border-purple-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' },
};

const OnOffBadge: React.FC<{ active: boolean; color: 'cyan' | 'green' | 'purple' }> = ({ active, color }) => (
    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-sm border transition-colors ${active ? BADGE_COLORS[color].on : BADGE_COLORS[color].off}`}>
        {active ? 'ON' : 'OFF'}
    </span>
);

interface MenuItemViewProps {
    item: MenuItem;
    close: () => void;
}

const MenuItemView: React.FC<MenuItemViewProps> = ({ item, close }) => {
    switch (item.type) {
        case 'separator':
            return <div className={`h-px bg-white/10 my-1 ${item.className || ''}`} />;
        case 'section':
            return (
                <div className={`text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1 ${item.className || ''}`}>
                    {item.label}
                </div>
            );
        case 'button': {
            const b = item;
            const isDisabled = typeof b.disabled === 'function' ? b.disabled() : !!b.disabled;
            const labelText = typeof b.label === 'function' ? b.label() : b.label;
            return (
                <button
                    type="button"
                    title={b.title}
                    disabled={isDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isDisabled) return;
                        b.onSelect();
                        if (b.closeOnSelect !== false) close();
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded text-xs transition-colors ${isDisabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-white/10'} ${b.className || ''}`}
                >
                    <span className="flex items-center gap-2 min-w-0">
                        {renderIcon(b.icon)}
                        <span className="truncate">{labelText}</span>
                        {b.shortcut && (
                            <span className="text-[9px] text-gray-500 font-mono">[{b.shortcut}]</span>
                        )}
                    </span>
                </button>
            );
        }
        case 'toggle': {
            const t = item;
            const active = t.isActive();
            const isDisabled = typeof t.disabled === 'function' ? t.disabled() : !!t.disabled;
            const labelText = typeof t.label === 'function' ? t.label() : t.label;
            return (
                <button
                    type="button"
                    title={t.title}
                    disabled={isDisabled}
                    onClick={(e) => { e.stopPropagation(); if (!isDisabled) t.onToggle(); }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded text-xs transition-colors ${isDisabled ? 'text-gray-600 cursor-not-allowed' : active ? 'text-white hover:bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'} ${t.className || ''}`}
                >
                    <span className="flex items-center gap-2 min-w-0">
                        {renderIcon(t.icon)}
                        <span className="truncate">{labelText}</span>
                        {t.shortcut && (
                            <span className="text-[9px] text-gray-500 font-mono">[{t.shortcut}]</span>
                        )}
                    </span>
                    <OnOffBadge active={active} color={t.color || 'cyan'} />
                </button>
            );
        }
        case 'custom': {
            const C = item.component;
            return <C close={close} />;
        }
    }
};
