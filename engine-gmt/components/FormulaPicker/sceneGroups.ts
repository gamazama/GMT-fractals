/**
 * Scene group types — caller-driven extras for the FormulaPicker sidebar.
 *
 * The picker's core is formula-centric. Scenes (.gmf files — full preset
 * state, not just a formula) live in their own flow (curated /gmf, online
 * gallery submissions) and need different load semantics. Rather than
 * extending the picker's commit shape with a new action, we let callers
 * pass pre-built groups with per-item `onSelect` callbacks. The picker
 * just surfaces them in the sidebar + grid and invokes onSelect on click.
 *
 * @see dev/plans/formula-picker-design.md (Scenes — caller-driven)
 */

import type React from 'react';

export interface SceneItem {
    /** Stable id for keyboard nav + React keys. */
    id: string;
    /** Display name shown on the card. */
    name: string;
    /** Optional URL to a CDN-hosted thumbnail. Falls back to an icon when
     *  absent (e.g. curated /gmf items that don't ship a thumb). */
    thumbnailUrl?: string;
    /** Optional one-line description shown under the name in list mode. */
    description?: string;
    /** Optional badge (e.g. "pending", "private") rendered before the name. */
    badge?: { text: string; className?: string };
    /** Click handler. May be async — picker fires-and-forgets and closes
     *  itself. Caller owns the fetch + apply flow (loadGMFScene,
     *  loadScene, etc). */
    onSelect: () => void | Promise<void>;
    /** Disabled state — render grayed with a tooltip from `disabledReason`. */
    disabled?: boolean;
    /** Tooltip text when `disabled`. */
    disabledReason?: string;
}

export interface SceneGroup {
    /** Stable id, e.g. 'curated' / 'my-submissions'. */
    id: string;
    /** Sidebar label. */
    name: string;
    /** Items shown in the right pane when this group is active. */
    items: SceneItem[];
    /** Optional empty-state body shown when items.length === 0
     *  (e.g. "Sign in to see your submissions"). */
    emptyMessage?: string;
    /** Loading flag — when true (and items.length === 0), the pane shows
     *  a "Loading…" message instead of the empty state. */
    isLoading?: boolean;
    /** Pagination — true when more items may be fetched beyond the
     *  current `items` array. Picker renders a "Load more" button at
     *  the end of the grid when set. */
    hasMore?: boolean;
    /** Pagination callback — invoked when the user clicks "Load more".
     *  Should append the next page to `items`. Picker disables the
     *  button while `isLoadingMore` is true. */
    loadMore?: () => void | Promise<void>;
    /** True while a `loadMore()` call is in flight. */
    isLoadingMore?: boolean;
    /** Optional icon node rendered alongside the sidebar label. */
    icon?: React.ReactNode;
}
