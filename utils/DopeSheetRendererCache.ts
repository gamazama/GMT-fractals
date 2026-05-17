/**
 * Per-track and per-group diamond caches for the canvas DopeSheet. Thin wrappers
 * around the shared `RefViewKeyCache` in `utils/canvasCache.ts`:
 *
 *   - TrackDiamondCache: token = `Keyframe[]` (Object.is on the ref).
 *   - GroupDiamondCache: token = sorted list of child `Keyframe[]` refs; any
 *     child mutation invalidates the group entry. Token is snapshotted on set
 *     so external mutation of the caller's array can't corrupt the entry.
 */

import type { Keyframe } from '../types';
import { RefViewKeyCache, roundView } from './canvasCache';

// Re-export the shared canvas primitives so callers (DopeSheetRendererBuilder)
// can keep importing from this module without code changes.
export type { CacheCanvas, CacheCtx2D, CachedCanvas } from './canvasCache';
export { createCacheCanvas, getCacheCtx2D } from './canvasCache';

export type CachedDiamondCanvas = import('./canvasCache').CachedCanvas;

// ---------------------------------------------------------------------------
// TrackDiamondCache — one entry per track row.
// ---------------------------------------------------------------------------

/** Per-track diamond cache. Token = the track's `Keyframe[]` ref. */
export class TrackDiamondCache extends RefViewKeyCache<Keyframe[]> {}

// ---------------------------------------------------------------------------
// GroupDiamondCache — one entry per group row.
// ---------------------------------------------------------------------------

const childTokensEqual = (a: ReadonlyArray<Keyframe[]>, b: ReadonlyArray<Keyframe[]>): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const sliceTokens = (t: ReadonlyArray<Keyframe[]>): ReadonlyArray<Keyframe[]> => t.slice();

/** Per-group diamond cache. Token = sorted list of child `Keyframe[]` refs.
 *  Snapshotted on set so caller-side mutation of the array can't corrupt the entry. */
export class GroupDiamondCache extends RefViewKeyCache<ReadonlyArray<Keyframe[]>> {
    constructor() {
        super(childTokensEqual, sliceTokens);
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
): string => `${roundView(viewScaleX)}|${rowHeight}|${flat ? 1 : 0}|${roundView(panX)}`;

/** Per-group viewKey. No flat flag — group rows always render at one weight. */
export const buildGroupDiamondViewKey = (
    viewScaleX: number,
    rowHeight: number,
    panX: number,
): string => `${roundView(viewScaleX)}|${rowHeight}|${roundView(panX)}`;
