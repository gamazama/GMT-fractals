/**
 * installStateLibrary — one-call wrapper that bundles the state-library
 * slice with the cross-cutting concerns apps usually want alongside it:
 *
 *   - Numeric slot shortcuts (Mod+N save, N recall) wired to the
 *     library's saveToSlot / select actions.
 *   - A topbar menu with Open Manager / Reset / Slot 1..9 entries,
 *     hosted via the @engine/menu plugin.
 *   - The slice itself (delegated to installStateLibrarySlice).
 *
 * Apps still own their <StateLibraryPanel> shell — toolbar / footer
 * slots are app-specific (cardinal directions for GMT cameras vs none
 * for fluid-toy). Use <ActiveSnapshotFeatures> for the standard
 * "expose the params I'm saving" footer.
 *
 * Each section can be opted out of: pass `slotShortcuts: false` to
 * skip key bindings, `menu: null` to skip the topbar entry. Useful
 * when an app already has bespoke wiring for either.
 */

import React from 'react';
import { installStateLibrarySlice, dotFieldKey, type StateLibraryOptions } from './createStateLibrarySlice';
import { useEngineStore } from '../../store/engineStore';
import { shortcuts } from '../plugins/Shortcuts';
import { menu } from '../plugins/Menu';
import { topbar, type TopBarSlot } from '../plugins/TopBar';
import { StateLibraryToast } from '../components/StateLibraryToast';
import type { ComponentType } from 'react';

export interface SlotShortcutOptions {
    /** Number of slots to bind (default 9). Slots are 1-indexed for the
     *  user-facing keys; internally indexed [0, count - 1]. */
    count?: number;
    /** Help-UI category. Default 'Camera'. */
    category?: string;
    /** Modifier prefix for the save binding. Default 'Mod'. */
    saveModifier?: string;
    /** Description prefixes — `${savePrefix} ${n}` / `${recallPrefix} ${n}`. */
    savePrefix?: string;
    recallPrefix?: string;
}

type IconRenderable = ComponentType<{ size?: number }> | React.ReactNode;

export interface StateLibraryMenuOptions {
    /** Menu id used by @engine/menu (also doubles as the topbar slot id). */
    menuId: string;
    slot: TopBarSlot;
    order: number;
    icon?: IconRenderable;
    title?: string;
    label?: string;
    align?: 'start' | 'end' | 'center';
    width?: string;

    /** "Open" item — opens the library panel via togglePanel. Set
     *  null to omit. */
    openItem?: {
        id?: string;
        label: string;
        title?: string;
    } | null;
    /** "Reset" item — calls the slice's reset action. Set null to
     *  omit. */
    resetItem?: {
        id?: string;
        label: string;
        title?: string;
    } | null;
    /** Slot 1..N entries — click recalls, falls back to save when slot
     *  is empty. Set false to omit. Default true. */
    slotItems?: boolean;
    slotLabelPrefix?: string;
}

export interface InstallStateLibraryOptions<T> extends StateLibraryOptions<T> {
    /** Panel id this library opens. Used by the menu's Open item. */
    panelId: string;

    /** Number-key slot shortcuts. Set false to opt out. Default true. */
    slotShortcuts?: boolean | SlotShortcutOptions;

    /** Topbar menu wiring. Set null to opt out (app provides its own). */
    menu?: StateLibraryMenuOptions | null;
}

const defaultSlotOpts = (
    o: boolean | SlotShortcutOptions | undefined,
): SlotShortcutOptions | null => {
    if (o === false) return null;
    if (o === true || o === undefined) return {};
    return o;
};

/** Bundles the slice install + shortcut registration + menu wiring +
 *  saved-toast topbar slot. Apps that supply `menu` get the toast for
 *  free, anchored next to the menu button. Apps that opt out (menu:
 *  null, e.g. GMT, which builds its Camera menu by hand) can still
 *  mount <StateLibraryToast arrayKey={...} /> wherever they want. */
export function installStateLibrary<T>(opts: InstallStateLibraryOptions<T>): void {
    installStateLibrarySlice<T>(opts);

    const slotOpts = defaultSlotOpts(opts.slotShortcuts);
    if (slotOpts) registerSlotShortcuts(opts, slotOpts);

    if (opts.menu) {
        registerLibraryMenu(opts, opts.menu);
        registerLibraryToast(opts, opts.menu);
    }
}

function registerLibraryToast<T>(
    opts: InstallStateLibraryOptions<T>,
    m: StateLibraryMenuOptions,
): void {
    // Drop the toast adjacent to the menu button. order + 0.5 keeps a
    // stable z-order while sharing the same flex slot — the toast's
    // absolute positioning aligns under the menu button automatically.
    const arrayKey = opts.arrayKey;
    topbar.register({
        id: `${arrayKey}-saved-toast`,
        slot: m.slot,
        order: m.order + 0.5,
        component: () => React.createElement(StateLibraryToast, { arrayKey }),
    });
}

function registerSlotShortcuts<T>(
    opts: InstallStateLibraryOptions<T>,
    cfg: SlotShortcutOptions,
): void {
    const count = cfg.count ?? 9;
    const category = cfg.category ?? 'Camera';
    const saveMod = cfg.saveModifier ?? 'Mod';
    const savePrefix = cfg.savePrefix ?? `Save to slot`;
    const recallPrefix = cfg.recallPrefix ?? `Recall slot`;

    const idPrefix = opts.actions.saveToSlot;

    for (let n = 1; n <= count; n++) {
        const slotIndex = n - 1;
        shortcuts.register({
            id: `${idPrefix}.save.${n}`,
            key: `${saveMod}+${n}`,
            description: `${savePrefix} ${n}`,
            category,
            handler: () => {
                const fn = (useEngineStore.getState() as any)[opts.actions.saveToSlot];
                fn?.(slotIndex);
            },
        });
        shortcuts.register({
            id: `${idPrefix}.recall.${n}`,
            key: `${n}`,
            description: `${recallPrefix} ${n}`,
            category,
            handler: () => {
                const arr = (useEngineStore.getState() as any)[opts.arrayKey] as any[];
                const target = arr?.[slotIndex];
                if (!target) return;
                const fn = (useEngineStore.getState() as any)[opts.actions.select];
                fn?.(target.id);
            },
        });
    }
}

function registerLibraryMenu<T>(
    opts: InstallStateLibraryOptions<T>,
    m: StateLibraryMenuOptions,
): void {
    menu.register({
        id: m.menuId,
        slot: m.slot,
        order: m.order,
        icon: m.icon as any,
        title: m.title,
        label: m.label,
        align: m.align,
        width: m.width,
    });

    // Open Manager — togglePanel via the engine store. Label adopts a
    // ● suffix while the notify-dot is lit (5s after a slot save) so
    // the user notices the new entry without opening the menu.
    if (m.openItem !== null) {
        const open = m.openItem ?? {
            id: `${m.menuId}-open`,
            label: `${opts.panelId}…`,
        };
        const dotKey = dotFieldKey(opts.arrayKey);
        const baseLabel = open.label;
        menu.registerItem(m.menuId, {
            id: open.id ?? `${m.menuId}-open`,
            type: 'button',
            label: () => {
                const dot = (useEngineStore.getState() as any)[dotKey];
                return dot ? `${baseLabel}  ●` : baseLabel;
            },
            title: open.title,
            onSelect: () => {
                (useEngineStore.getState() as any).togglePanel?.(opts.panelId, true);
            },
        });
    }

    // Reset — calls the slice's reset action.
    if (m.resetItem !== null && m.resetItem !== undefined) {
        menu.registerItem(m.menuId, {
            id: m.resetItem.id ?? `${m.menuId}-reset`,
            type: 'button',
            label: m.resetItem.label,
            title: m.resetItem.title,
            onSelect: () => {
                const fn = (useEngineStore.getState() as any)[opts.actions.reset];
                fn?.();
            },
        });
    }

    // Slot 1..N entries — click recalls (falls back to save when empty).
    if (m.slotItems !== false) {
        menu.registerItem(m.menuId, {
            id: `${m.menuId}-sep-slots`,
            type: 'separator',
        });
        const labelPrefix = m.slotLabelPrefix ?? 'Slot';
        const count = (typeof opts.slotShortcuts === 'object' && opts.slotShortcuts?.count) || 9;
        for (let n = 1; n <= count; n++) {
            const slotIndex = n - 1;
            menu.registerItem(m.menuId, {
                id: `${m.menuId}-slot-${n}`,
                type: 'button',
                label: () => {
                    const arr = (useEngineStore.getState() as any)[opts.arrayKey] as any[] | undefined;
                    return arr?.[slotIndex] ? `${labelPrefix} ${n} ✓` : `${labelPrefix} ${n}`;
                },
                shortcut: `${n}`,
                title: `Click to recall • Ctrl+${n} saves`,
                onSelect: () => {
                    const arr = (useEngineStore.getState() as any)[opts.arrayKey] as any[];
                    const target = arr?.[slotIndex];
                    if (target) {
                        const sel = (useEngineStore.getState() as any)[opts.actions.select];
                        sel?.(target.id);
                    } else {
                        // Empty slot — fall back to save.
                        const sav = (useEngineStore.getState() as any)[opts.actions.saveToSlot];
                        sav?.(slotIndex);
                    }
                },
            });
        }
    }
}
