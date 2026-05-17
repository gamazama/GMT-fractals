/**
 * Shared off-screen-canvas primitives + a generic ref-keyed cache used by the
 * canvas GraphEditor (`GraphRendererCache`) and canvas DopeSheet
 * (`DopeSheetRendererCache`). Both editors cache per-row pixel canvases keyed
 * by (id, version-token, viewKey); see `RefViewKeyCache` below.
 *
 * The three cache classes in the two editors collapse onto one generic shape:
 *
 *   PolylineCache       : RefViewKeyCache<Keyframe[]>     (Object.is on the ref)
 *   TrackDiamondCache   : RefViewKeyCache<Keyframe[]>     (Object.is on the ref)
 *   GroupDiamondCache   : RefViewKeyCache<ReadonlyArray<Keyframe[]>>
 *                                                          (childTokensEqual + slice-on-set)
 *
 * OffscreenCanvas is preferred; HTMLCanvasElement is the fallback for
 * environments without OffscreenCanvas (jsdom, older Safari). Both are
 * acceptable CanvasImageSource arguments to drawImage.
 */

/** Off-screen drawable. OffscreenCanvas when available, detached <canvas> otherwise. */
export type CacheCanvas = OffscreenCanvas | HTMLCanvasElement;

/** Common 2D context for off-screen drawing. The two underlying contexts diverge in a
 *  handful of edge cases but share every method this codebase paints with. */
export type CacheCtx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const SUPPORTS_OFFSCREEN = typeof OffscreenCanvas !== 'undefined';

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

/** Round a scale/pan component to 4 decimals so float-jitter during continuous
 *  zoom/pan doesn't churn the cache. Pixel quantisation hides anything finer. */
export const roundView = (n: number): number => Math.round(n * 1e4) / 1e4;

export interface CachedCanvas {
    canvas: CacheCanvas;
    width: number;
    height: number;
}

interface Entry<TToken> {
    token: TToken;
    viewKey: string;
    canvas: CacheCanvas;
    width: number;
    height: number;
}

export interface RefViewKeyCacheStats {
    hits: number;
    missNoEntry: number;
    missViewKey: number;
    missKeysRef: number;
    sets: number;
    lastMissDetail: string;
}

/** Cache keyed by (id, token, viewKey). `token` is whatever value detects when
 *  the cached painting is stale — typically a `Keyframe[]` reference (clone-on-write
 *  writers already produce a new array per edit, so referential equality is enough)
 *  or, for group rows, a sorted list of child `Keyframe[]` refs.
 *
 *  Diagnostics are exposed via `stats` so the bench harness and devtools probes
 *  can distinguish "track new" vs "viewKey change" vs "token change" misses. */
export class RefViewKeyCache<TToken> {
    private entries = new Map<string, Entry<TToken>>();
    stats: RefViewKeyCacheStats = {
        hits: 0,
        missNoEntry: 0,
        missViewKey: 0,
        missKeysRef: 0,
        sets: 0,
        lastMissDetail: '',
    };

    constructor(
        private tokenEqual: (a: TToken, b: TToken) => boolean = Object.is,
        private tokenSnapshot: (t: TToken) => TToken = (t) => t,
    ) {}

    get(id: string, token: TToken, viewKey: string): CachedCanvas | null {
        const e = this.entries.get(id);
        if (!e) {
            this.stats.missNoEntry += 1;
            return null;
        }
        if (e.viewKey !== viewKey) {
            this.stats.missViewKey += 1;
            this.stats.lastMissDetail = `viewKey: ${e.viewKey} → ${viewKey}`;
            return null;
        }
        if (!this.tokenEqual(e.token, token)) {
            this.stats.missKeysRef += 1;
            this.stats.lastMissDetail = `token changed for ${id}`;
            return null;
        }
        this.stats.hits += 1;
        return { canvas: e.canvas, width: e.width, height: e.height };
    }

    set(id: string, token: TToken, viewKey: string, canvas: CacheCanvas, width: number, height: number): void {
        this.stats.sets += 1;
        this.entries.set(id, {
            token: this.tokenSnapshot(token),
            viewKey,
            canvas,
            width,
            height,
        });
    }

    /** Drop entries for ids not in the visible set. Called once per render. */
    evictStale(visibleIds: Set<string>): void {
        if (this.entries.size === 0) return;
        for (const id of this.entries.keys()) {
            if (!visibleIds.has(id)) this.entries.delete(id);
        }
    }

    clear(): void {
        this.entries.clear();
    }

    size(): number {
        return this.entries.size;
    }
}
