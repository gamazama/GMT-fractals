/**
 * @engine/hud — slot-based overlay host for in-canvas HUD widgets.
 *
 * Same registration pattern as @engine/topbar and @engine/menu:
 * plugins/apps register their own widgets; the engine only provides
 * the layout frame. Any content (crosshair, speed readout, quality
 * badge, keyboard-shortcut hint line, …) is owned by the caller.
 *
 * Mount <HudHost /> once inside the viewport subtree. Widgets appear
 * in their declared slot:
 *
 *     ┌──────────────────────────────────────────┐
 *     │  top-left             top-right          │
 *     │                 center                   │
 *     │                                          │
 *     │  bottom-left         bottom-right        │
 *     │            bottom-center                 │
 *     └──────────────────────────────────────────┘
 *
 * Slots are always rendered. Widgets within a slot stack vertically
 * by ascending `order`.
 *
 * Visibility gating: each item can declare `when: () => boolean`. The
 * host re-reads the registry on every render (subscribed via
 * useSyncExternalStore) so predicates that source from Zustand stay
 * live — apps just pass `() => useStore.getState().someFlag`.
 */

import React, { useSyncExternalStore } from 'react';

export type HudSlot =
    | 'top-left' | 'top-center' | 'top-right'
    | 'center'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface HudItem {
    id: string;
    slot: HudSlot;
    order?: number;
    component: React.FC;
    when?: () => boolean;
    /** Additional tailwind classes on the item's container. */
    className?: string;
}

const _items = new Map<string, HudItem>();
const _insertCounter = new Map<string, number>();
const _subscribers = new Set<() => void>();
let _rev = 0;
const _notify = () => { _rev++; _subscribers.forEach((fn) => fn()); };

const subscribe = (fn: () => void) => {
    _subscribers.add(fn);
    return () => { _subscribers.delete(fn); };
};

export const hud = {
    register(item: HudItem) {
        // Preserve insertion order when `order` is not supplied.
        const resolved: HudItem = item.order === undefined
            ? { ...item, order: (_insertCounter.get(item.slot) ?? 0) }
            : item;
        _insertCounter.set(item.slot, (_insertCounter.get(item.slot) ?? 0) + 1);
        _items.set(item.id, resolved);
        _notify();
    },
    unregister(id: string) {
        if (_items.delete(id)) _notify();
    },
    list(): HudItem[] {
        return Array.from(_items.values());
    },
    clear() {
        _items.clear();
        _insertCounter.clear();
        _notify();
    },
};

let _installed = false;
export const installHud = () => {
    if (_installed) return;
    _installed = true;
    // Pure API plugin — no auto-registered widgets.
};
export const uninstallHud = () => {
    hud.clear();
    _installed = false;
};

// ── HudHost ─────────────────────────────────────────────────────────

interface HudHostProps {
    /** Hide the entire HUD (broadcast / clean-feed modes). */
    hidden?: boolean;
    /** Extra classes on the outer absolute container. */
    className?: string;
    /** Limit which slot rows render. 'top' = top-* + center, 'bottom' =
     *  bottom-*, 'all' = every slot. Useful when an app mounts two HudHosts
     *  in different containers (one canvas-relative for top slots, one
     *  viewport-area-relative for bottom slots). Default: 'all'. */
    region?: 'top' | 'bottom' | 'all';
}

// Bottom-left reserves ~52px for `<TimelineHost>`'s timeline-toggle
// button (`fixed bottom-4 left-4`, ~40px square + a 12px gap). Hud
// items stack ABOVE the toggle so they don't overlap when the timeline
// is hidden, and they sit above the timeline panel when it's open. The
// extra whitespace is invisible when no items are registered. If a
// future app drops TimelineHost entirely, items just gain ~52px of
// bottom margin — harmless.
const SLOT_CLASSES: Record<HudSlot, string> = {
    'top-left':      'absolute top-3 left-3 flex flex-col items-start gap-1',
    'top-center':    'absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1',
    'top-right':     'absolute top-3 right-3 flex flex-col items-end gap-1',
    'center':        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1',
    'bottom-left':   'absolute bottom-16 left-3 flex flex-col items-start gap-1',
    'bottom-center': 'absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1',
    'bottom-right':  'absolute bottom-3 right-3 flex flex-col items-end gap-1',
};

const SLOT_ORDER: HudSlot[] = [
    'top-left', 'top-center', 'top-right',
    'center',
    'bottom-left', 'bottom-center', 'bottom-right',
];

export const HudHost: React.FC<HudHostProps> = ({ hidden = false, className = '', region = 'all' }) => {
    useSyncExternalStore(subscribe, () => _rev, () => _rev);

    if (hidden) return null;

    // Snapshot current list, grouped by slot and sorted by order.
    const bySlot: Record<HudSlot, HudItem[]> = {
        'top-left': [], 'top-center': [], 'top-right': [],
        'center': [],
        'bottom-left': [], 'bottom-center': [], 'bottom-right': [],
    };
    for (const item of _items.values()) {
        if (item.when && !item.when()) continue;
        bySlot[item.slot].push(item);
    }
    for (const slot of SLOT_ORDER) {
        bySlot[slot].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    const slotsToRender: HudSlot[] = region === 'top'
        ? ['top-left', 'top-center', 'top-right', 'center']
        : region === 'bottom'
            ? ['bottom-left', 'bottom-center', 'bottom-right']
            : SLOT_ORDER;

    return (
        <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
            {slotsToRender.map((slot) => {
                const items = bySlot[slot];
                if (items.length === 0) return null;
                return (
                    <div key={slot} className={SLOT_CLASSES[slot]}>
                        {items.map((item) => {
                            const C = item.component;
                            return (
                                <div key={item.id} className={item.className}>
                                    <C />
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
