/**
 * Per-track and per-group diamond caches for the canvas DopeSheet. Mirrors the
 * shape of utils/GraphRendererCache (see follow-on note in
 * docs/animation-refactor for a future unification): referential equality on
 * `keyframes` is the version token, viewKey rolls scaleX/rowHeight/flat/panX,
 * OffscreenCanvas preferred with HTMLCanvasElement fallback.
 *
 * The group cache differs from the per-track one in that its version token is
 * the sorted list of child-track `keyframes` refs — any child mutation
 * invalidates the group entry.
 */

import type { Keyframe } from '../types';

export type CacheCanvas = OffscreenCanvas | HTMLCanvasElement;
export type CacheCtx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const SUPPORTS_OFFSCREEN = typeof OffscreenCanvas !== 'undefined';

export const createCacheCanvas = (width: number, height: number): CacheCanvas => {
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    if (SUPPORTS_OFFSCREEN) return new OffscreenCanvas(w, h);
    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    return el;
};

export const getCacheCtx2D = (canvas: CacheCanvas): CacheCtx2D | null => {
    return canvas.getContext('2d') as CacheCtx2D | null;
};

// ---------------------------------------------------------------------------
// TrackDiamondCache — one entry per track row.
// ---------------------------------------------------------------------------

interface TrackDiamondEntry {
    keyframesToken: Keyframe[];
    viewKey: string;
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export interface CachedDiamondCanvas {
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export class TrackDiamondCache {
    private entries = new Map<string, TrackDiamondEntry>();
    stats = { hits: 0, missNoEntry: 0, missViewKey: 0, missKeysRef: 0, sets: 0 };

    get(trackId: string, keyframes: Keyframe[], viewKey: string): CachedDiamondCanvas | null {
        const e = this.entries.get(trackId);
        if (!e) {
            this.stats.missNoEntry += 1;
            return null;
        }
        if (e.viewKey !== viewKey) {
            this.stats.missViewKey += 1;
            return null;
        }
        if (e.keyframesToken !== keyframes) {
            this.stats.missKeysRef += 1;
            return null;
        }
        this.stats.hits += 1;
        return { canvas: e.canvas, width: e.width, height: e.height };
    }

    set(trackId: string, keyframes: Keyframe[], viewKey: string, canvas: CacheCanvas, width: number, height: number): void {
        this.stats.sets += 1;
        this.entries.set(trackId, { keyframesToken: keyframes, viewKey, canvas, width, height });
    }

    evictStale(visibleTrackIds: Set<string>): void {
        if (this.entries.size === 0) return;
        for (const id of this.entries.keys()) {
            if (!visibleTrackIds.has(id)) this.entries.delete(id);
        }
    }

    clear(): void {
        this.entries.clear();
    }

    size(): number {
        return this.entries.size;
    }
}

// ---------------------------------------------------------------------------
// GroupDiamondCache — one entry per group row.
// ---------------------------------------------------------------------------

interface GroupDiamondEntry {
    /** Sorted-by-trackId list of child Keyframe[] refs. Any child change rotates the array. */
    childKeyframeTokens: ReadonlyArray<Keyframe[]>;
    viewKey: string;
    canvas: CacheCanvas;
    width: number;
    height: number;
}

const childTokensEqual = (a: ReadonlyArray<Keyframe[]>, b: ReadonlyArray<Keyframe[]>): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export class GroupDiamondCache {
    private entries = new Map<string, GroupDiamondEntry>();
    stats = { hits: 0, missNoEntry: 0, missViewKey: 0, missKeysRef: 0, sets: 0 };

    get(groupId: string, childKeyframeTokens: ReadonlyArray<Keyframe[]>, viewKey: string): CachedDiamondCanvas | null {
        const e = this.entries.get(groupId);
        if (!e) {
            this.stats.missNoEntry += 1;
            return null;
        }
        if (e.viewKey !== viewKey) {
            this.stats.missViewKey += 1;
            return null;
        }
        if (!childTokensEqual(e.childKeyframeTokens, childKeyframeTokens)) {
            this.stats.missKeysRef += 1;
            return null;
        }
        this.stats.hits += 1;
        return { canvas: e.canvas, width: e.width, height: e.height };
    }

    set(groupId: string, childKeyframeTokens: ReadonlyArray<Keyframe[]>, viewKey: string, canvas: CacheCanvas, width: number, height: number): void {
        this.stats.sets += 1;
        // Copy the token array so external mutation (sort in place, etc.) doesn't corrupt the entry.
        this.entries.set(groupId, { childKeyframeTokens: childKeyframeTokens.slice(), viewKey, canvas, width, height });
    }

    evictStale(visibleGroupIds: Set<string>): void {
        if (this.entries.size === 0) return;
        for (const id of this.entries.keys()) {
            if (!visibleGroupIds.has(id)) this.entries.delete(id);
        }
    }

    clear(): void {
        this.entries.clear();
    }

    size(): number {
        return this.entries.size;
    }
}

// ---------------------------------------------------------------------------
// Key builders.
// ---------------------------------------------------------------------------

/** Per-track viewKey. `flat` toggles dimmed rendering for unanimated tracks. */
export const buildTrackDiamondViewKey = (
    viewScaleX: number,
    rowHeight: number,
    flat: boolean,
    panX: number,
): string => {
    // Round scaleX to 4 decimals to avoid float-jitter cache misses during continuous zoom.
    const sx = Math.round(viewScaleX * 1e4) / 1e4;
    const px = Math.round(panX * 1e4) / 1e4;
    return `${sx}|${rowHeight}|${flat ? 1 : 0}|${px}`;
};

/** Per-group viewKey. No flat flag — group rows always render at one weight. */
export const buildGroupDiamondViewKey = (
    viewScaleX: number,
    rowHeight: number,
    panX: number,
): string => {
    const sx = Math.round(viewScaleX * 1e4) / 1e4;
    const px = Math.round(panX * 1e4) / 1e4;
    return `${sx}|${rowHeight}|${px}`;
};
