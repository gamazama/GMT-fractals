/**
 * @engine/topbar — slot-based host for the application's top chrome.
 *
 * Any app that installs this plugin can mount <TopBarHost /> in its
 * layout and register items into left/center/right slots. Other
 * plugins (viewport, scene-io, screenshot, undo) register their own
 * buttons when installed, so apps get a consistent topbar without
 * composing it themselves.
 *
 * Registration API:
 *
 *   topbar.register({
 *     id: 'save-menu',              // unique per-slot; re-register replaces
 *     slot: 'left' | 'center' | 'right',
 *     order: number,                // ascending; lower renders first
 *     component: React.FC,          // renderless in isolation is fine
 *     when?: () => boolean,         // optional visibility predicate
 *   });
 *
 *   topbar.unregister(id);
 *
 * installTopBar({ hideDefaults?: boolean }) — idempotent. Auto-registers
 * a baseline set (project name, FPS counter, adaptive badge) unless
 * hideDefaults is set. Plugins that want to contribute register on
 * their own install hook.
 *
 * <TopBarHost hidden={isBroadcastMode} /> — renders the slots as a
 * horizontal header.
 */

import React, { useSyncExternalStore } from 'react';
import { ProjectName } from './topbar/ProjectName';
import { FpsCounter } from './topbar/FpsCounter';
import { AdaptiveResolutionBadge } from './viewport/AdaptiveResolutionBadge';
import { useEngineStore } from '../../store/engineStore';
import { createListRegistry } from '../../store/createListRegistry';

export type TopBarSlot = 'left' | 'center' | 'right';

export interface TopBarItem {
    id: string;
    slot: TopBarSlot;
    order: number;
    component: React.FC;
    when?: () => boolean;
}

// Module-level registry. Keep registration synchronous (no store) so item
// availability matches module-load order. Backed by the shared id-keyed
// `createListRegistry` primitive.
const _registry = createListRegistry<TopBarItem>();

export const topbar = {
    register(item: TopBarItem) { _registry.register(item); },
    unregister(id: string) { _registry.unregister(id); },
    list(): TopBarItem[] { return _registry.getAll(); },
    clear() { _registry.clear(); },
};

let _installed = false;

export interface InstallTopBarOptions {
    /** Skip the default items (ProjectName / FpsCounter / AdaptiveResolutionBadge).
     *  Apps with fully custom topbar chrome opt out; most apps want the defaults. */
    hideDefaults?: boolean;
}

export const installTopBar = (options: InstallTopBarOptions = {}) => {
    if (_installed) return;
    _installed = true;

    if (options.hideDefaults) return;

    topbar.register({ id: 'project-name', slot: 'left',  order: 0,   component: ProjectName });
    topbar.register({ id: 'fps',          slot: 'right', order: -10, component: FpsCounter });
    topbar.register({ id: 'adaptive',     slot: 'right', order: 0,   component: AdaptiveResolutionBadge });
};

// Lets tests / hot-reload restart install cleanly.
export const uninstallTopBar = () => {
    topbar.clear();
    _installed = false;
};

// ── <TopBarHost> — the visual shell ────────────────────────────────────

interface TopBarHostProps {
    /** Hide the whole bar (broadcast/clean-feed modes). */
    hidden?: boolean;
    /** Extra classes on the <header>. */
    className?: string;
}

export const TopBarHost: React.FC<TopBarHostProps> = ({ hidden = false, className = '' }) => {
    // Subscribe to the module-level registry so registrations after mount
    // still propagate. getAll() is a stable snapshot (safe getSnapshot).
    const items = useSyncExternalStore(_registry.subscribe, _registry.getAll, _registry.getAll);
    // Subscribe to mobile-state flags so `when:` predicates that read
    // `isMobileSnapshot()` re-evaluate when the user toggles Force
    // Mobile / Force Desktop or rotates / resizes across the breakpoint.
    useEngineStore((s) => s.uiModePreference);
    useEngineStore((s) => s.isDeviceMobile);

    if (hidden) return null;

    const slotItems = (slot: TopBarSlot) =>
        items
            .filter((i) => i.slot === slot && (!i.when || i.when()))
            .sort((a, b) => a.order - b.order);

    const renderItem = (item: TopBarItem) => {
        const Component = item.component;
        return <Component key={item.id} />;
    };

    return (
        <header className={`relative shrink-0 w-full h-14 z-[500] bg-black/90 border-b border-white/10 flex items-center justify-between px-6 select-none ${className}`}>
            <div className="flex items-center gap-2">
                {slotItems('left').map(renderItem)}
            </div>
            <div className="flex items-center gap-2">
                {slotItems('center').map(renderItem)}
            </div>
            <div className="flex items-center gap-2">
                {slotItems('right').map(renderItem)}
            </div>
        </header>
    );
};

// Re-export the default components so apps can mount them directly
// (outside the host) if they prefer a custom layout.
export { ProjectName } from './topbar/ProjectName';
export { FpsCounter } from './topbar/FpsCounter';
