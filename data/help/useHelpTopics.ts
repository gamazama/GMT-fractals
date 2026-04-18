/**
 * React hook: returns the help-topic map, loading it on first use.
 *
 * Renders with the cached map synchronously if `loadHelpTopics()` has already
 * resolved. Otherwise returns an empty map and triggers the load — the
 * component re-renders once the topics are available. App.tsx's idle
 * prefetch means this is usually populated before the hook ever runs.
 */

import { useEffect, useState } from 'react';
import { loadHelpTopics, getLoadedHelpTopics, type HelpTopicMap } from './registry';

const EMPTY: HelpTopicMap = {};

export function useHelpTopics(): HelpTopicMap {
    const [topics, setTopics] = useState<HelpTopicMap>(() => getLoadedHelpTopics() ?? EMPTY);
    useEffect(() => {
        if (getLoadedHelpTopics()) return;
        let cancelled = false;
        loadHelpTopics().then(t => { if (!cancelled) setTopics(t); });
        return () => { cancelled = true; };
    }, []);
    return topics;
}
