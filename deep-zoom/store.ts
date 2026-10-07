/**
 * deep-zoom/store.ts — the deep-zoom tool's own small Zustand store.
 *
 * PURPOSE
 *   Shell state only: the bridge to the renderer, the latest telemetry sample, saved locations,
 *   the flight being edited, which side panel is open, first-run flag, and one toast line. This
 *   app does NOT use the engine store (`createEngineStore`); like mesh-export it is a standalone
 *   tool. The renderer's own settings live in the renderer and are read through the bridge.
 *
 * PERSISTENCE
 *   - `gmt.deepzoom.bookmarks.v1` — the bookmark list as JSON.
 *   - `gmt.deepzoom.onboarded.v1` — '1' once the first-run guide has been dismissed.
 *
 * PITFALLS
 *   - Bookmark thumbnails are PNG data URLs, so the list can hit the localStorage quota. A failed
 *     write is retried with the thumbnails stripped from the STORED copy (the in-memory list keeps
 *     them) and the user is told once through `say`.
 *   - `telemetry` changes about 8 times a second. Select the fields you need
 *     (`useDeepZoom(s => s.telemetry?.depth)`), never the whole store, or the panel re-renders at
 *     that rate.
 */
import { create } from 'zustand';
import type { DzBridge, DzPath, DzTelemetry, DzView } from './bridge';

export interface Bookmark {
    id: string;
    name: string;
    createdAt: number;
    depth: number;
    thumb: string;
    view: DzView;
    note?: string;
}

export type PanelId = 'none' | 'locations' | 'record' | 'look' | 'help';

export interface DeepZoomState {
    bridge: DzBridge | null;
    setBridge(b: DzBridge | null): void;
    telemetry: DzTelemetry | null;
    /** The shell refreshes it about 8 times a second. */
    setTelemetry(t: DzTelemetry): void;

    bookmarks: Bookmark[];
    addBookmark(b: Bookmark): void;
    removeBookmark(id: string): void;
    renameBookmark(id: string, name: string): void;
    /** Persisted in localStorage key gmt.deepzoom.bookmarks.v1. */
    importBookmarks(list: Bookmark[]): void;

    /** The flight being edited. */
    path: DzPath | null;
    setPath(p: DzPath | null): void;
    panel: PanelId;
    setPanel(p: PanelId): void;
    onboarded: boolean;
    /** Persisted in localStorage key gmt.deepzoom.onboarded.v1. */
    setOnboarded(v: boolean): void;
    toast: string | null;
    say(msg: string | null): void;
}

export const BOOKMARKS_KEY = 'gmt.deepzoom.bookmarks.v1';
export const ONBOARDED_KEY = 'gmt.deepzoom.onboarded.v1';

function isBookmark(b: unknown): b is Bookmark {
    if (!b || typeof b !== 'object') return false;
    const o = b as Record<string, unknown>;
    const v = o.view as Record<string, unknown> | undefined;
    return typeof o.id === 'string' && typeof o.name === 'string' && !!v
        && Array.isArray(v.cam) && v.cam.length === 3 && v.cam.every((c) => typeof c === 'string');
}

function normalise(b: Bookmark): Bookmark {
    return {
        ...b,
        createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(),
        depth: typeof b.depth === 'number' ? b.depth : 0,
        thumb: typeof b.thumb === 'string' ? b.thumb : '',
    };
}

function loadBookmarks(): Bookmark[] {
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        if (!raw) return [];
        const list: unknown = JSON.parse(raw);
        return Array.isArray(list) ? list.filter(isBookmark).map(normalise) : [];
    } catch {
        return [];
    }
}

/** Returns 'ok', 'no-thumbs' (saved without thumbnails) or 'failed'. */
function saveBookmarks(list: Bookmark[]): 'ok' | 'no-thumbs' | 'failed' {
    try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
        return 'ok';
    } catch {
        try {
            localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list.map((b) => ({ ...b, thumb: '' }))));
            return 'no-thumbs';
        } catch {
            return 'failed';
        }
    }
}

function loadOnboarded(): boolean {
    try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return false; }
}

export const useDeepZoom = create<DeepZoomState>((set, get) => {
    const commit = (bookmarks: Bookmark[]) => {
        set({ bookmarks });
        const r = saveBookmarks(bookmarks);
        if (r === 'no-thumbs') set({ toast: 'Browser storage is full: locations saved without thumbnails. Export them to keep the pictures.' });
        else if (r === 'failed') set({ toast: 'Browser storage is full: this location is kept only until the tab closes. Export your locations.' });
    };

    return {
        bridge: null,
        setBridge: (bridge) => set({ bridge }),
        telemetry: null,
        setTelemetry: (telemetry) => set({ telemetry }),

        bookmarks: loadBookmarks(),
        addBookmark: (b) => commit([normalise(b), ...get().bookmarks.filter((x) => x.id !== b.id)]),
        removeBookmark: (id) => commit(get().bookmarks.filter((x) => x.id !== id)),
        renameBookmark: (id, name) => commit(get().bookmarks.map((x) => (x.id === id ? { ...x, name } : x))),
        importBookmarks: (list) => {
            const incoming = (Array.isArray(list) ? list : []).filter(isBookmark).map(normalise);
            const have = new Set(get().bookmarks.map((x) => x.id));
            commit([...get().bookmarks, ...incoming.filter((x) => !have.has(x.id))]);
        },

        path: null,
        setPath: (path) => set({ path }),
        panel: 'none',
        setPanel: (panel) => set({ panel }),
        onboarded: loadOnboarded(),
        setOnboarded: (onboarded) => {
            set({ onboarded });
            try {
                if (onboarded) localStorage.setItem(ONBOARDED_KEY, '1');
                else localStorage.removeItem(ONBOARDED_KEY);
            } catch { /* private mode: the guide shows again next visit */ }
        },
        toast: null,
        say: (toast) => set({ toast }),
    };
});
