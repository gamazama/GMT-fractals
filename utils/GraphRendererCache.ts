/**
 * Per-track polyline cache and the soft-selection mask cache for the
 * canvas GraphEditor. Both are thin wrappers around `RefViewKeyCache` /
 * a single-entry equivalent in `utils/canvasCache.ts` — the shared primitives
 * (CacheCanvas, createCacheCanvas, getCacheCtx2D, RefViewKeyCache) live there.
 *
 * `drawGraph` used to walk every visible track's keyframes on every redraw,
 * which during `graph-play` cost ~2 ms × 480 commits in the bench (see
 * docs/animation-refactor/08_ENGINE_PROBE_FINDINGS.md). The polyline shape
 * only changes when the track's keyframes change or the viewport zoom changes
 * — pan is folded into viewKey. The soft-selection mask only changes when the
 * selection set, soft radius/type, or viewport change. Both costs are now
 * amortised across redraws via off-screen canvas caches keyed by referential
 * equality on `keyframes` (clone-on-write writers in `sequenceSlice` produce
 * a new array per change, so referential equality is the version token).
 */

import type { Keyframe } from '../types';
import type { CacheCanvas } from './canvasCache';
import { RefViewKeyCache, roundView } from './canvasCache';

// Re-export the shared canvas primitives so callers that already imported them
// from this module (GraphRendererBuilder) keep working without code changes.
export type { CacheCanvas, CacheCtx2D, CachedCanvas } from './canvasCache';
export { createCacheCanvas, getCacheCtx2D } from './canvasCache';

// ---------------------------------------------------------------------------
// PolylineCache — one entry per track, keyed by (keyframesRef, viewKey).
// ---------------------------------------------------------------------------

/** Per-track polyline + diamond cache. Token = the track's `Keyframe[]` ref. */
export class PolylineCache extends RefViewKeyCache<Keyframe[]> {}

// ---------------------------------------------------------------------------
// SoftSelectionMaskCache — single entry, keyed by a composite string.
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
    return `${roundView(viewScaleX)}|${roundView(viewScaleY)}|${normalized ? 1 : 0}|${trackRangeMin}|${trackRangeMax}`;
};

/** Build the soft-selection mask viewKey. */
export const buildMaskViewKey = (
    selectedIds: readonly string[],
    softRadius: number,
    softType: unknown,
    viewScaleX: number,
): string => {
    const typeTag = typeof softType === 'string' ? softType : softType == null ? 'n' : 'o';
    return `${hashSelectedIds(selectedIds)}|${softRadius}|${typeTag}|${roundView(viewScaleX)}`;
};
