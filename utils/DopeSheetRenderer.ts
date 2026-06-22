/**
 * Renderer + hit-tester for the canvas DopeSheet. Three paint passes (back /
 * selection / hover) sequenced into a single canvas, and a JS hit-test that
 * resolves (x, y) → (trackId, keyId) via binary search per track. Back layer
 * is cached per (track, viewKey); selection and hover paint on top each frame.
 */

import type { AnimationSequence, Keyframe, Track } from '../types';
import {
    TrackDiamondCache,
    GroupDiamondCache,
    buildTrackDiamondViewKey,
    buildGroupDiamondViewKey,
} from './DopeSheetRendererCache';
import { buildTrackDiamonds, buildGroupDiamonds } from './DopeSheetRendererBuilder';
import { isFlatTrack } from './dopeSheetTrackFlags';
import { traceKeyframeShape } from './keyframeShape';
import { getThemeColor, onThemeChange } from '../engine/store/colorSchemeStore';

/** Row in the dope-sheet's vertical stack. Either a group header row (collapsible)
 *  or a per-track keyframe row. */
export interface DopeSheetRowLayout {
    kind: 'group' | 'track';
    /** trackId for `kind='track'`, groupName for `kind='group'`. */
    id: string;
    /** For `kind='group'`, the child track ids the row aggregates. Empty otherwise. */
    trackIds: string[];
    /** Top-edge offset from the rows-region origin, in CSS px. */
    y: number;
    /** Row height in CSS px (24 for group, 32 for track). */
    height: number;
    /** Optional per-row colour overrides for `kind='group'`. Used by the Root
     *  Summary synthetic row to render cyan-tinted diamonds instead of the
     *  default group grey. Baked into the cached canvas — if a caller ever
     *  changes colours at runtime for the same row id, evict that cache slot
     *  first or include the colours in the viewKey. */
    fillColor?: string;
    strokeColor?: string;
}

/** Module-level caches — one pair shared across all DopeSheet mounts. Single mount
 *  in practice, but global makes the bench probe + clear-on-unmount story simpler. */
export const trackDiamondCache = new TrackDiamondCache();
export const groupDiamondCache = new GroupDiamondCache();

// The per-row diamond canvases bake the active DIAMOND_THEME palette into their
// pixels; their viewKeys don't include the scheme. Drop them on scheme change so
// the next drawDopeSheetBack rebuilds with the new colours (DopeSheetCanvas
// re-fires its draw effect via its `scheme` dep). @see engine/store/colorSchemeStore.ts
onThemeChange(() => {
    trackDiamondCache.clear();
    groupDiamondCache.clear();
});

const HIT_RADIUS_PX = 8;     // mouse can land within ±8 px of a diamond centre and still hit.

const lowerBound = (keys: { frame: number }[], target: number): number => {
    let lo = 0, hi = keys.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (keys[mid].frame < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
};

const upperBound = (keys: { frame: number }[], target: number): number => {
    let lo = 0, hi = keys.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (keys[mid].frame <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
};

const findClosestKeyInWindow = (
    keys: Keyframe[],
    minFrame: number,
    maxFrame: number,
    centreFrame: number,
): Keyframe | null => {
    const lo = lowerBound(keys, minFrame);
    const hi = upperBound(keys, maxFrame);
    if (lo >= hi) return null;
    let best: Keyframe | null = null;
    let bestDist = Infinity;
    for (let i = lo; i < hi; i++) {
        const d = Math.abs(keys[i].frame - centreFrame);
        if (d < bestDist) { bestDist = d; best = keys[i]; }
    }
    return best;
};

// ---------------------------------------------------------------------------
// Back layer — composite cached per-row diamond canvases.
// ---------------------------------------------------------------------------

export interface DrawDopeSheetBackArgs {
    ctx: CanvasRenderingContext2D;
    canvasWidth: number;
    canvasHeight: number;
    rows: DopeSheetRowLayout[];
    tracks: AnimationSequence['tracks'];
    /** frameWidth — pixels per frame. */
    scaleX: number;
    /** Pan offset baked into diamond x positions (typically 0 because the canvas spans
     *  the full scroll-content width and the parent scroll container handles panning). */
    panX: number;
}

/** Temporary debug overlay — paints faint horizontal lines at every rowsLayout
 *  boundary so visual alignment vs the DOM rows can be eyeballed. Toggle by
 *  setting `window.__dopeSheetCanvasDebug = true` from devtools (no rebuild). */
const isDebugEnabled = (): boolean =>
    typeof window !== 'undefined' && (window as { __dopeSheetCanvasDebug?: boolean }).__dopeSheetCanvasDebug === true;

export const drawDopeSheetBack = (args: DrawDopeSheetBackArgs): void => {
    const { ctx, canvasWidth, canvasHeight, rows, tracks, scaleX, panX } = args;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const visibleTrackIds = new Set<string>();
    const visibleGroupIds = new Set<string>();

    for (const row of rows) {
        if (row.kind === 'track') {
            visibleTrackIds.add(row.id);
            const track = tracks[row.id];
            if (!track) continue;
            const keys = track.keyframes;
            if (!keys || keys.length === 0) continue;
            const flat = isFlatTrack(keys);
            const viewKey = buildTrackDiamondViewKey(scaleX, row.height, flat, panX);
            let cached = trackDiamondCache.get(row.id, keys, viewKey);
            if (!cached) {
                const built = buildTrackDiamonds({
                    track,
                    canvasWidth,
                    rowHeight: row.height,
                    scaleX,
                    panX,
                    flat,
                });
                trackDiamondCache.set(row.id, keys, viewKey, built, canvasWidth, row.height);
                cached = { canvas: built, width: canvasWidth, height: row.height };
            }
            ctx.drawImage(cached.canvas as CanvasImageSource, 0, row.y);
        } else {
            visibleGroupIds.add(row.id);
            const childTracks: Track[] = [];
            const childKeyframeTokens: Keyframe[][] = [];
            for (const tid of row.trackIds) {
                const t = tracks[tid];
                if (!t) continue;
                childTracks.push(t);
                childKeyframeTokens.push(t.keyframes);
            }
            if (childTracks.length === 0) continue;
            const viewKey = buildGroupDiamondViewKey(scaleX, row.height, panX);
            let cached = groupDiamondCache.get(row.id, childKeyframeTokens, viewKey);
            if (!cached) {
                const built = buildGroupDiamonds({
                    childTracks,
                    canvasWidth,
                    rowHeight: row.height,
                    scaleX,
                    panX,
                    fillColor: row.fillColor,
                    strokeColor: row.strokeColor,
                });
                groupDiamondCache.set(row.id, childKeyframeTokens, viewKey, built, canvasWidth, row.height);
                cached = { canvas: built, width: canvasWidth, height: row.height };
            }
            ctx.drawImage(cached.canvas as CanvasImageSource, 0, row.y);
        }
    }

    // Drop entries for rows that scrolled out of the visible set entirely. Bounded by
    // visible track count (~50) so this is cheap.
    trackDiamondCache.evictStale(visibleTrackIds);
    groupDiamondCache.evictStale(visibleGroupIds);

    if (isDebugEnabled()) {
        ctx.save();
        ctx.lineWidth = 1;
        for (const row of rows) {
            ctx.strokeStyle = row.kind === 'group' ? 'rgba(255, 0, 255, 0.6)' : 'rgba(0, 255, 0, 0.4)';
            ctx.beginPath();
            ctx.moveTo(0, row.y + 0.5);
            ctx.lineTo(canvasWidth, row.y + 0.5);
            ctx.stroke();
            ctx.fillStyle = row.kind === 'group' ? 'rgba(255, 0, 255, 0.9)' : 'rgba(0, 255, 0, 0.9)';
            ctx.font = '10px monospace';
            ctx.fillText(`${row.kind}:${row.id}@y=${row.y}h=${row.height}`, 4, row.y + 10);
        }
        ctx.restore();
    }
};

// ---------------------------------------------------------------------------
// Selection overlay — repainted per render. Cheap (walks selectedKeyframeIds).
// ---------------------------------------------------------------------------

export interface DrawDopeSheetSelectionArgs {
    ctx: CanvasRenderingContext2D;
    canvasWidth: number;
    canvasHeight: number;
    rows: DopeSheetRowLayout[];
    tracks: AnimationSequence['tracks'];
    scaleX: number;
    panX: number;
    selectedKeyframeIds: string[];
}

export const drawDopeSheetSelection = (args: DrawDopeSheetSelectionArgs): void => {
    const { ctx, canvasWidth, rows, tracks, scaleX, panX, selectedKeyframeIds } = args;
    // No clearRect: paints on top of the back layer in the same canvas. The back
    // layer's drawDopeSheetBack clears once before compositing cached per-row canvases.
    if (selectedKeyframeIds.length === 0) return;

    // Pre-bucket: rows by trackId, selected keyIds by trackId. Avoids O(S × N) where S
    // is selected-key count and N is per-track keyframe count — at 9000 keys all
    // selected this was 81M `find()` ops per repaint.
    const rowByTrack = new Map<string, DopeSheetRowLayout>();
    for (const row of rows) {
        if (row.kind === 'track') rowByTrack.set(row.id, row);
    }
    const selectedByTrack = new Map<string, string[]>();
    for (const compositeId of selectedKeyframeIds) {
        const sepIdx = compositeId.indexOf('::');
        if (sepIdx < 0) continue;
        const tid = compositeId.substring(0, sepIdx);
        if (!rowByTrack.has(tid)) continue;     // track is inside a collapsed group.
        const kid = compositeId.substring(sepIdx + 2);
        let arr = selectedByTrack.get(tid);
        if (!arr) { arr = []; selectedByTrack.set(tid, arr); }
        arr.push(kid);
    }

    // Selected diamonds — themed fg fill + ring (was hard white).
    ctx.fillStyle = getThemeColor('--fg');
    ctx.strokeStyle = getThemeColor('--fg');
    ctx.lineWidth = 1;

    for (const [tid, kids] of selectedByTrack) {
        const track = tracks[tid];
        if (!track) continue;
        const row = rowByTrack.get(tid)!;
        const cy = row.y + row.height / 2;
        const flat = isFlatTrack(track.keyframes);     // once per track, not once per selected key.
        const size = (flat ? 8 : 12) * 1.25;
        const keyById = new Map<string, typeof track.keyframes[number]>();
        for (const k of track.keyframes) keyById.set(k.id, k);

        for (const kid of kids) {
            const key = keyById.get(kid);
            if (!key) continue;
            const kx = (key.frame * scaleX) - panX;
            if (kx < -10 || kx > canvasWidth + 10) continue;
            ctx.beginPath();
            traceKeyframeShape(ctx, kx, cy, key.interpolation, size);
            ctx.fill();
            ctx.stroke();
        }
    }
};

// ---------------------------------------------------------------------------
// Hover overlay — bright outline around the diamond under the cursor.
// Painted in the same canvas after the back + selection passes.
// ---------------------------------------------------------------------------

/** Diamond currently under the cursor, normalised for both the canvas component's
 *  state and the renderer. Tracked as a discriminated union so React state-equality
 *  can be a shallow field compare and the renderer doesn't have to parse a string. */
export type HoverTarget =
    | { kind: 'track'; trackId: string; keyId: string }
    | { kind: 'group'; groupName: string; frame: number };

export const hoverTargetEqual = (a: HoverTarget | null, b: HoverTarget | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    return a.kind === 'track'
        ? a.trackId === (b as typeof a).trackId && a.keyId === (b as typeof a).keyId
        : a.groupName === (b as typeof a).groupName && a.frame === (b as typeof a).frame;
};

export interface DrawDopeSheetHoverArgs {
    ctx: CanvasRenderingContext2D;
    rows: DopeSheetRowLayout[];
    tracks: AnimationSequence['tracks'];
    scaleX: number;
    panX: number;
    hover: HoverTarget | null;
}

export const drawDopeSheetHover = (args: DrawDopeSheetHoverArgs): void => {
    const { ctx, rows, tracks, scaleX, panX, hover } = args;
    if (!hover) return;

    // Hover affordance — accent ring on a track diamond, fg ring on a group diamond.
    const HOVER_STROKE = getThemeColor('--accent-400');       // matches the key:bg-accent-400 affordance.
    const HOVER_GROUP_STROKE = getThemeColor('--fg');

    ctx.save();
    ctx.lineWidth = 2;

    if (hover.kind === 'track') {
        const row = rows.find(r => r.kind === 'track' && r.id === hover.trackId);
        const track = tracks[hover.trackId];
        const key = track?.keyframes.find(k => k.id === hover.keyId);
        if (row && track && key) {
            const size = (isFlatTrack(track.keyframes) ? 8 : 12) * 1.25;
            const kx = (key.frame * scaleX) - panX;
            const cy = row.y + row.height / 2;
            ctx.strokeStyle = HOVER_STROKE;
            ctx.beginPath();
            traceKeyframeShape(ctx, kx, cy, key.interpolation, size);
            ctx.stroke();
        }
    } else {
        const row = rows.find(r => r.kind === 'group' && r.id === hover.groupName);
        if (row) {
            const size = 12 * 1.25;
            const kx = (hover.frame * scaleX) - panX;
            const cy = row.y + row.height / 2;
            ctx.strokeStyle = HOVER_GROUP_STROKE;
            ctx.beginPath();
            traceKeyframeShape(ctx, kx, cy, 'Linear', size);
            ctx.stroke();
        }
    }
    ctx.restore();
};

// ---------------------------------------------------------------------------
// Hit testing — pickKeyframe(x, y) → (trackId, keyId) | null.
// ---------------------------------------------------------------------------

export interface PickKeyframeArgs {
    rows: DopeSheetRowLayout[];
    tracks: AnimationSequence['tracks'];
    scaleX: number;
    panX: number;
    x: number;
    y: number;
}

export interface PickResult {
    kind: 'track';
    trackId: string;
    keyId: string;
    frame: number;
    interpolation: string;
}

export interface PickGroupResult {
    kind: 'group';
    groupName: string;
    trackIds: string[];
    frame: number;
}

export const pickKeyframe = (args: PickKeyframeArgs): PickResult | PickGroupResult | null => {
    const { rows, tracks, scaleX, panX, x, y } = args;
    // Locate the row under the cursor by linear scan — rows ≤ ~50, faster than building
    // a sorted-by-y structure each call.
    for (const row of rows) {
        if (y < row.y || y >= row.y + row.height) continue;

        // Convert x to a frame, then find the nearest keyframe within a hit-radius window.
        const cursorFrame = (x + panX) / scaleX;
        const frameWindow = HIT_RADIUS_PX / scaleX;
        const minFrame = cursorFrame - frameWindow;
        const maxFrame = cursorFrame + frameWindow;

        if (row.kind === 'track') {
            const track = tracks[row.id];
            if (!track) return null;
            const best = findClosestKeyInWindow(track.keyframes, minFrame, maxFrame, cursorFrame);
            if (!best) return null;
            return { kind: 'track', trackId: row.id, keyId: best.id, frame: best.frame, interpolation: best.interpolation };
        }
        // Group row: find the closest child-track keyframe inside the window. The caller
        // fans the selection out across every child track at the returned frame.
        let bestFrame: number | null = null;
        let bestDist = Infinity;
        for (const tid of row.trackIds) {
            const t = tracks[tid];
            if (!t) continue;
            const key = findClosestKeyInWindow(t.keyframes, minFrame, maxFrame, cursorFrame);
            if (!key) continue;
            const d = Math.abs(key.frame - cursorFrame);
            if (d < bestDist) { bestDist = d; bestFrame = key.frame; }
        }
        if (bestFrame == null) return null;
        return { kind: 'group', groupName: row.id, trackIds: row.trackIds, frame: bestFrame };
    }
    return null;
};
