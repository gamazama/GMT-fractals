/**
 * Render Adjunct Registry
 * ───────────────────────
 * Sibling to `renderPopupRegistry`. The shared `<TimelineToolbar>` has a
 * primary "Render" button and an overflow "…" menu next to it. Some apps
 * want a secondary, subordinate render-related action tucked into that menu
 * (GMT registers an "Export to After Effects" item). That action is
 * app-specific, so apps register a descriptor here: a menu label plus a
 * self-contained dialog component.
 *
 * The toolbar renders the label as a row in the overflow menu and mounts
 * `Dialog` at the toolbar root (NOT inside the menu) so the dialog survives
 * the menu closing. `Dialog` sources whatever it needs from the stores and
 * only receives `onClose`, which keeps engine-core domain-agnostic (no
 * fractal / After Effects concepts leak into the toolbar). If nothing is
 * registered, no menu item shows.
 */
import type React from 'react';

export interface RenderAdjunct {
    /** Menu-row label, e.g. "Export to After Effects…". */
    label: string;
    /** Optional row tooltip. */
    title?: string;
    /** Self-contained dialog, mounted at the toolbar root when the row is picked. */
    Dialog: React.ComponentType<{ onClose: () => void }>;
}

let adjuncts: RenderAdjunct[] = [];
const listeners = new Set<() => void>();

/**
 * Register a subordinate render action (e.g. "Export to After Effects",
 * "Export to FBX"). Multiple may be registered — each gets its own row in the
 * overflow menu. Re-registering the same `label` replaces it in place (HMR-
 * safe). Passing `null` clears all.
 */
export function registerRenderAdjunct(adjunct: RenderAdjunct | null): void {
    if (!adjunct) {
        if (adjuncts.length) { adjuncts = []; listeners.forEach(l => l()); }
        return;
    }
    const i = adjuncts.findIndex(a => a.label === adjunct.label);
    const next = adjuncts.slice();
    if (i >= 0) next[i] = adjunct; else next.push(adjunct);
    adjuncts = next; // new reference (stable between registrations) for useSyncExternalStore
    listeners.forEach(l => l());
}

/** All registered adjuncts. Reference is stable until the set changes. */
export function getRenderAdjuncts(): RenderAdjunct[] {
    return adjuncts;
}

export function subscribeRenderAdjunct(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
