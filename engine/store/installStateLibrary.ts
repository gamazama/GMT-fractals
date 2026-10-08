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
 *
 * The slot keys can also be made conditional without giving them up:
 * `slotShortcuts: { when }` (see `SlotShortcutOptions.when`) keeps the
 * bindings and the menu's slot rows, and silences the KEYS while the
 * predicate returns false. That is the answer for an app with a mode in
 * which a stray digit must not apply a saved state; `slotShortcuts: false`
 * is not, because it also removes the menu's slot rows (`resolveSlotCount`).
 *
 * Pitfalls:
 *   - A SLOT IS A POSITION IN THE STORED ARRAY. Key `N` recalls
 *     `store[arrayKey][N - 1]`, and the save key overwrites that same
 *     position. A panel that shows the list in another order
 *     (`<StateLibraryPanel sortBy>`) does not move the slots; it prints each
 *     row's stored position so the digit on a row is the digit that recalls it.
 *   - `when` guards keys only. A click on a menu slot row, and any direct
 *     call of the slice's actions, runs whatever it returns.
 *   - `when` is asked on every key press and a false answer leaves the key
 *     event unconsumed — see its JSDoc for what that lets through.
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
    /**
     * Runtime guard for the slot KEYS. While it returns false neither the
     * recall key (`N`) nor the save key (`${saveModifier}+N`) does anything.
     * For an app with a mode in which a stray digit must not apply or
     * overwrite a saved state (a captured pointer, a modal tool, a capture in
     * progress). Absent = the keys are always live, exactly as before.
     *
     * It is handed to BOTH `shortcuts.register` calls as their `when`, so the
     * dispatcher's rules are the contract (grep `match.when` in
     * `engine/plugins/Shortcuts.ts`):
     *   - It is asked on every matching key press, at press time. Read live
     *     state inside it (a store `getState()`), never a value captured at
     *     install, and keep it cheap.
     *   - A false answer leaves the event UNCONSUMED (no `preventDefault`,
     *     no `stopPropagation`). Anything else listening for that key still
     *     gets it, and whatever the browser itself binds to the save combo
     *     (Ctrl+digit selects a tab in most desktop browsers) applies again
     *     for as long as the answer is false.
     *   - It does not pass the key on to another registered shortcut. The
     *     dispatcher picks ONE match by scope and priority first and only
     *     then asks that match's `when`; a second binding on the same digit
     *     needs a higher `priority` or a deeper scope to be reached at all.
     *
     * Keys only: the menu's slot rows (`StateLibraryMenuOptions.slotItems`)
     * do not consult it — a click on a row is deliberate, a digit under the
     * hand is not — and neither does a direct call of the slice's actions.
     *
     * @invariant Both registrations carry the predicate, and neither fires
     *   while it returns false — proven by:
     *   npx tsx debug/test-state-library-options.mts ("the save registration
     *   carries the predicate", "the recall registration carries the
     *   predicate", "Mod+digit does not save while when() is false", "digit
     *   does not recall while when() is false").
     * @invariant A menu slot row acts whatever the predicate says — proven
     *   by: npx tsx debug/test-state-library-options.mts ("a menu click
     *   recalls while when() is false").
     */
    when?: () => boolean;
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

/**
 * The ONE answer to "how many slots". Both the number-key shortcuts and the
 * menu's slot rows read it, so they cannot disagree: until 2026-09-02 the
 * shortcuts used `cfg.count ?? 9` and the menu used `(… && count) || 9`, so
 * `count: 0` or `slotShortcuts: false` bound no keys but still rendered nine
 * menu rows advertising `Ctrl+N saves`. 0 means "no slot shortcuts" and the
 * menu skips its slot section entirely.
 *
 * @assumption No guard reaches the menu's slot rows: app-gmt passes
 *   `menu: null` and fluid-toy passes `count: 9`, so both agree today by
 *   construction and the divergence only bit a hypothetical third library.
 *   `smoke:statelibrary-drop` covers the camera manager's list, not this menu.
 */
export const resolveSlotCount = (o: boolean | SlotShortcutOptions | undefined): number => {
    if (o === false) return 0;
    if (o === true || o === undefined) return 9;
    return o.count ?? 9;
};

const resolveSaveModifier = (o: boolean | SlotShortcutOptions | undefined): string =>
    (typeof o === 'object' && o.saveModifier) || 'Mod';

/** Bundles the slice install + shortcut registration + menu wiring +
 *  saved-toast topbar slot. Apps that supply `menu` get the toast for
 *  free, anchored next to the menu button. Apps that opt out (menu:
 *  null, e.g. GMT, which builds its Camera menu by hand) can still
 *  mount <StateLibraryToast arrayKey={...} /> wherever they want. */
/**
 * @assumption Toast topbar slot is auto-mounted only when `opts.menu` is
 *   non-null. Apps passing `menu: null` (e.g. app-gmt's hand-wired
 *   Camera menu) must mount `<StateLibraryToast arrayKey>` themselves.
 */
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
    const count = resolveSlotCount(opts.slotShortcuts);
    const category = cfg.category ?? 'Camera';
    const saveMod = resolveSaveModifier(opts.slotShortcuts);
    const savePrefix = cfg.savePrefix ?? `Save to slot`;
    const recallPrefix = cfg.recallPrefix ?? `Recall slot`;

    const idPrefix = opts.actions.saveToSlot;
    // One predicate for both keys of a slot (see `SlotShortcutOptions.when`).
    // `undefined` when the app passed none: the dispatcher treats a missing
    // `when` as "always", which is the behaviour every library had before.
    const when = cfg.when;

    // @assumption Read action functions at fire time, not install time —
    //   robust against ordering between `installStateLibrary` and the
    //   underlying slice install.
    for (let n = 1; n <= count; n++) {
        const slotIndex = n - 1;
        shortcuts.register({
            id: `${idPrefix}.save.${n}`,
            key: `${saveMod}+${n}`,
            description: `${savePrefix} ${n}`,
            category,
            when,
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
            when,
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
    // Mirrors the shortcut count exactly; with shortcuts off there is no slot
    // section, because each row advertises the key binding that saves to it.
    // `SlotShortcutOptions.when` is deliberately NOT read here: it silences
    // the keys, and a click on a row is not a stray key. The rows stay
    // enabled and keep their key hint while the predicate is false.
    const count = resolveSlotCount(opts.slotShortcuts);
    if (m.slotItems !== false && count > 0) {
        menu.registerItem(m.menuId, {
            id: `${m.menuId}-sep-slots`,
            type: 'separator',
        });
        const labelPrefix = m.slotLabelPrefix ?? 'Slot';
        const saveMod = resolveSaveModifier(opts.slotShortcuts);
        // 'Mod' is the platform modifier; the title keeps the familiar
        // 'Ctrl' wording for it, as it always has.
        const saveModLabel = saveMod === 'Mod' ? 'Ctrl' : saveMod;
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
                title: `Click to recall • ${saveModLabel}+${n} saves`,
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
