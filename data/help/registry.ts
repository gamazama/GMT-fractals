/**
 * Lazy help-topics loader.
 *
 * The aggregated HELP_TOPICS record (~3400 lines of markdown across 14 topic
 * files) lives in `./topics-bundle`, which is dynamic-imported here so Vite
 * emits it as a separate chunk. Main-bundle consumers (GlobalContextMenu, which
 * only needs topic TITLES for right-click menus) never see the content until
 * `loadHelpTopics()` is called.
 *
 * Usage patterns:
 *   - React component: `const topics = useHelpTopics();` (see ./useHelpTopics)
 *   - Imperative:      `const topics = await loadHelpTopics();`
 *   - Sync check:      `getLoadedHelpTopics()` — null until first load
 *
 * App-level `prefetchHelpTopics()` fires from App.tsx on an idle callback so
 * the chunk is usually warm before the user's first right-click. The hook
 * gracefully renders with an empty map if the load hasn't finished yet.
 *
 * PER-APP TOPICS (added 2026-09-13). The default source is GMT's bundle, and
 * every app that does nothing gets it — app-gmt, fluid-toy, the old Gradient
 * Explorer. An app with help of its own calls `setHelpTopicsLoader()` once at
 * boot with its own lazy import (the Gradient Explorer v2 shell does, grep
 * setHelpTopicsLoader in gradient-explorer/v2). HelpBrowser, the context menu's
 * Help entries and installHelp's topic links all read through here, so they
 * all switch together; a topic id the app's map does not carry simply resolves
 * to nothing (the context menu drops it).
 * Pitfall: call it BEFORE anything loads — a loader set after the first load
 * resets the cache, so a mounted HelpBrowser keeps the map it already has
 * until it remounts.
 */

import type { HelpSection } from '../../types/help';

export type HelpTopicMap = Record<string, HelpSection>;

let _cache: HelpTopicMap | null = null;
let _loading: Promise<HelpTopicMap> | null = null;

const defaultLoader = (): Promise<HelpTopicMap> => import('./topics-bundle').then(m => m.HELP_TOPICS);
let _loader: () => Promise<HelpTopicMap> = defaultLoader;

/** Replace the topic source for this app (see the module header). Call once at boot. */
export function setHelpTopicsLoader(loader: () => Promise<HelpTopicMap>): void {
    _loader = loader;
    _cache = null;
    _loading = null;
}

/** Kick off (or reuse) the help-topics dynamic import. Safe to call repeatedly. */
export function loadHelpTopics(): Promise<HelpTopicMap> {
    if (_cache) return Promise.resolve(_cache);
    if (!_loading) {
        _loading = _loader().then(topics => {
            _cache = topics;
            return _cache;
        });
    }
    return _loading;
}

/** Synchronous accessor — returns null until the first loadHelpTopics() resolves. */
export function getLoadedHelpTopics(): HelpTopicMap | null {
    return _cache;
}

/** Idle prefetch helper — schedules loadHelpTopics() for after the main thread
 *  has a breather. Browsers that lack requestIdleCallback fall back to setTimeout. */
export function prefetchHelpTopics(delayMs = 300): void {
    if (_cache || _loading) return;
    const schedule: (cb: () => void) => void =
        (typeof window !== 'undefined' && (window as any).requestIdleCallback)
            ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
            : (cb) => setTimeout(cb, delayMs);
    schedule(() => { void loadHelpTopics(); });
}
