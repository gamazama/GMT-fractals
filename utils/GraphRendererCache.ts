/**
 * Per-track polyline and soft-selection mask caches for the GraphEditor.
 *
 * `drawGraph` used to walk every visible track's keyframes on every redraw,
 * which during `graph-play` cost ~2 ms × 480 commits in the bench (see
 * docs/animation-refactor/08_ENGINE_PROBE_FINDINGS.md). The polyline shape
 * only changes when the track's keyframes change or the viewport zoom changes
 * — pan is a translation. The soft-selection mask only changes when the
 * selection set or soft-radius/type change. Both costs are now amortised
 * across redraws via off-screen canvas caches keyed by referential equality
 * on `keyframes` (clone-on-write writers in `sequenceSlice` already produce
 * a new array per change, so referential equality is the version token; no
 * separate version counter needed).
 *
 * OffscreenCanvas is preferred; HTMLCanvasElement is the fallback for
 * environments without OffscreenCanvas (jsdom, older Safari). Both are
 * acceptable CanvasImageSource arguments to drawImage.
 */

import type { Keyframe } from '../types';

/** Off-screen drawable. OffscreenCanvas when available, detached <canvas> otherwise. */
export type CacheCanvas = OffscreenCanvas | HTMLCanvasElement;

/** Common 2D context for off-screen drawing. The two underlying contexts diverge in a
 *  handful of edge cases but share every method this codebase paints with. */
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
    // Both overloads return a 2D context with overlapping interfaces; the union widens
    // by structural shape rather than nominal type.
    return canvas.getContext('2d') as CacheCtx2D | null;
};

// ---------------------------------------------------------------------------
// PolylineCache — one entry per track, keyed by (keyframesRef, viewKey).
// ---------------------------------------------------------------------------

interface PolylineEntry {
    /** Strong reference used as the version token (referential equality). The repo's
     *  clone-on-write writers in sequenceSlice produce a new keyframes array per change
     *  (see e.g. batchAddKeyframesMultiRange, updateKeyframe), so referential equality
     *  is sufficient. A WeakRef would let GC reclaim old arrays sooner, but with
     *  evictStale running per render the lifetime overhead is bounded by visible track
     *  count and a strong ref keeps the cache typecheck-clean on ES2020. */
    keyframesToken: Keyframe[];
    viewKey: string;
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export interface CachedPolyline {
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export class PolylineCache {
    private entries = new Map<string, PolylineEntry>();

    /** Returns the cached canvas if (trackId, keyframes ref, viewKey) all match. Else null. */
    get(trackId: string, keyframes: Keyframe[], viewKey: string): CachedPolyline | null {
        const e = this.entries.get(trackId);
        if (!e) return null;
        if (e.viewKey !== viewKey) return null;
        if (e.keyframesToken !== keyframes) return null;
        return { canvas: e.canvas, width: e.width, height: e.height };
    }

    set(trackId: string, keyframes: Keyframe[], viewKey: string, canvas: CacheCanvas, width: number, height: number): void {
        this.entries.set(trackId, {
            keyframesToken: keyframes,
            viewKey,
            canvas,
            width,
            height,
        });
    }

    /** Drop entries for trackIds not in the visible set. Called once per render. */
    evictStale(visibleTrackIds: Set<string>): void {
        if (this.entries.size === 0) return;
        for (const id of this.entries.keys()) {
            if (!visibleTrackIds.has(id)) this.entries.delete(id);
        }
    }

    /** Drop all entries. Use after viewport or layout changes that invalidate every cached canvas. */
    clear(): void {
        this.entries.clear();
    }

    /** Test-only: current entry count. */
    size(): number {
        return this.entries.size;
    }
}

// ---------------------------------------------------------------------------
// SoftSelectionMaskCache — single entry, keyed by (selectedIdsHash, radius, type, viewScaleX).
// ---------------------------------------------------------------------------

interface MaskEntry {
    key: string;
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export interface CachedMask {
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export class SoftSelectionMaskCache {
    private entry: MaskEntry | null = null;

    get(key: string): CachedMask | null {
        if (!this.entry) return null;
        if (this.entry.key !== key) return null;
        return { canvas: this.entry.canvas, width: this.entry.width, height: this.entry.height };
    }

    set(key: string, canvas: CacheCanvas, width: number, height: number): void {
        this.entry = { key, canvas, width, height };
    }

    clear(): void {
        this.entry = null;
    }
}

/** Stable xor-hash of a sorted-id list. Order-independent; collisions are acceptable
 *  because a false hit just paints a slightly-stale mask for one frame and the next
 *  selection change naturally re-keys. */
export const hashSelectedIds = (ids: readonly string[]): string => {
    let acc = 0;
    for (const id of ids) {
        let h = 5381;
        for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
        acc = (acc ^ h) | 0;
    }
    return acc.toString(36);
};

/** Build the per-track viewKey string. Cheap; just concatenation. */
export const buildPolylineViewKey = (
    viewScaleX: number,
    viewScaleY: number,
    normalized: boolean,
    trackRangeMin: number,
    trackRangeMax: number,
): string => {
    // Round scales to 4 decimals to avoid float-jitter cache misses during continuous zoom.
    // The renderer is pixel-quantised anyway, so 1e-4 differences in scale are imperceptible.
    const sx = Math.round(viewScaleX * 1e4) / 1e4;
    const sy = Math.round(viewScaleY * 1e4) / 1e4;
    return `${sx}|${sy}|${normalized ? 1 : 0}|${trackRangeMin}|${trackRangeMax}`;
};

/** Build the soft-selection mask viewKey. */
export const buildMaskViewKey = (
    selectedIds: readonly string[],
    softRadius: number,
    softType: unknown,
    viewScaleX: number,
): string => {
    const sx = Math.round(viewScaleX * 1e4) / 1e4;
    const typeTag = typeof softType === 'string' ? softType : softType == null ? 'n' : 'o';
    return `${hashSelectedIds(selectedIds)}|${softRadius}|${typeTag}|${sx}`;
};
