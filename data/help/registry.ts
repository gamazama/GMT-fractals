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
 */

import type { HelpSection } from '../../types/help';

export type HelpTopicMap = Record<string, HelpSection>;

let _cache: HelpTopicMap | null = null;
let _loading: Promise<HelpTopicMap> | null = null;

/** Kick off (or reuse) the help-topics dynamic import. Safe to call repeatedly. */
export function loadHelpTopics(): Promise<HelpTopicMap> {
    if (_cache) return Promise.resolve(_cache);
    // Help topics bundle was fractal-content specific; apps install
    // their own topic bundle by assigning to `_cache` via a side-effect
    // import, or by re-implementing this loader.
    if (!_loading) {
        _cache = {} as HelpTopicMap;
        _loading = Promise.resolve(_cache);
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
