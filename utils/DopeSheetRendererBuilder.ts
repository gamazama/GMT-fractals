/**
 * Per-track and per-group diamond builders for the DopeSheet's back canvas.
 * Each builder produces a row-sized off-screen canvas of track-default-colour
 * diamonds; selection rings and hover affordances paint separately on top.
 *
 * Coordinate system inside a row canvas: x = (frame * scaleX) - panX, y = rowHeight / 2.
 * The canvas is sized (canvasWidth × rowHeight); composition is drawImage at (0, row.y).
 *
 * panX is baked into the cached canvas (in the viewKey) instead of applied at
 * composite time — matches the GraphRendererBuilder tradeoff (see
 * docs/animation-refactor/11_CANVAS_GRAPH_REPORT.md §"Surprises" #4). Holds 100%
 * cache hits during play/scrub which keep pan fixed; rebuilds per pan-frame on
 * continuous-pan. Revisit if pan smoothness regresses.
 */

import type { Track } from '../types';
import { CacheCanvas, createCacheCanvas, getCacheCtx2D, CacheCtx2D } from './DopeSheetRendererCache';

/** Tailwind theme colours mirrored as RGB so canvas can paint them.
 *  - cyan-900  / dark fill for default (un-selected, non-dirty) diamonds
 *  - cyan-400  / bright stroke for the same
 *  - gray-500/50 + gray-400/50 for group rows
 *
 *  These match the original TrackRow.tsx KeyframeDiamond CSS so the canvas
 *  port produces a visual diff of zero at default state.
 */
export const DIAMOND_THEME = {
    trackFill: '#164e63',     // cyan-900
    trackStroke: '#22d3ee',   // cyan-400
    groupFill: 'rgba(107, 114, 128, 0.5)',  // gray-500/50
    groupStroke: 'rgba(156, 163, 175, 0.5)', // gray-400/50
};

export interface BuildTrackDiamondsArgs {
    track: Track;
    /** Scroll-content width in CSS px — the canvas is sized to this so off-viewport
     *  positions don't get clipped at the right edge. */
    canvasWidth: number;
    /** Per-row vertical extent — `TIMELINE_TRACK_HEIGHT` for normal rows. */
    rowHeight: number;
    /** Frame-to-pixel scaling — equivalent to the dope-sheet's `frameWidth`. */
    scaleX: number;
    /** Pan offset in CSS px (baked into the cached canvas; see header note). */
    panX: number;
    /** Dim-flat-row affordance — flat tracks render with a smaller diamond. */
    flat: boolean;
    /** Track-default fill. Overridable so future per-row colour assignments stay
     *  decoupled from the builder. Defaults to DIAMOND_THEME.trackFill. */
    fillColor?: string;
    /** Track-default stroke. Defaults to DIAMOND_THEME.trackStroke. */
    strokeColor?: string;
}

const DIAMOND_SIZE_NORMAL = 12;   // matches the previous DOM .w-3.h-3 sizing.
const DIAMOND_SIZE_FLAT   = 8;    // matches the previous DOM .w-2.h-2 sizing.

/** Build a per-track diamond canvas. Pure: same args → same pixels. */
export const buildTrackDiamonds = (args: BuildTrackDiamondsArgs): CacheCanvas => {
    const {
        track,
        canvasWidth,
        rowHeight,
        scaleX,
        panX,
        flat,
        fillColor = DIAMOND_THEME.trackFill,
        strokeColor = DIAMOND_THEME.trackStroke,
    } = args;

    const canvas = createCacheCanvas(canvasWidth, rowHeight);
    const ctx = getCacheCtx2D(canvas);
    if (!ctx) return canvas;

    const keys = track.keyframes;
    if (!keys || keys.length === 0) return canvas;

    const cy = rowHeight / 2;
    const size = flat ? DIAMOND_SIZE_FLAT : DIAMOND_SIZE_NORMAL;
    const half = size / 2;
    const diag = (size / 2) * Math.SQRT2; // diamond's distance from centre to vertex.

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;

    drawDiamondPaths(ctx, keys, scaleX, panX, cy, size, half, diag, canvasWidth);
    return canvas;
};

/** Shared diamond-emitting loop used by both track and group builders. Walks the
 *  keyframes array in one pass, batches fill + stroke into one path each, and
 *  skips off-canvas keys via a coarse x cull. Pulled out so the track / group
 *  builders share exactly one shape-rendering code path. */
const drawDiamondPaths = (
    ctx: CacheCtx2D,
    keys: { frame: number; interpolation?: string }[],
    scaleX: number,
    panX: number,
    cy: number,
    size: number,
    half: number,
    diag: number,
    canvasWidth: number,
) => {
    ctx.beginPath();
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const kx = (k.frame * scaleX) - panX;
        // Coarse off-canvas cull — diamonds outside [-diag, canvasWidth + diag] never light a pixel.
        if (kx < -diag || kx > canvasWidth + diag) continue;

        if (k.interpolation === 'Step') {
            ctx.rect(kx - half, cy - half, size, size);
        } else if (k.interpolation === 'Bezier') {
            // moveTo before arc so the path doesn't auto-connect to the previous subpath.
            ctx.moveTo(kx + half, cy);
            ctx.arc(kx, cy, half, 0, Math.PI * 2);
        } else {
            // Linear (default): rotated square / diamond.
            ctx.moveTo(kx, cy - diag);
            ctx.lineTo(kx + diag, cy);
            ctx.lineTo(kx, cy + diag);
            ctx.lineTo(kx - diag, cy);
            ctx.closePath();
        }
    }
    ctx.fill();
    ctx.stroke();
};

// ---------------------------------------------------------------------------
// Group builder
// ---------------------------------------------------------------------------

export interface BuildGroupDiamondsArgs {
    /** Child tracks aggregated into this group row. Order doesn't matter; the builder
     *  walks them all to build the union of unique frames. */
    childTracks: Track[];
    canvasWidth: number;
    rowHeight: number;
    scaleX: number;
    panX: number;
    fillColor?: string;
    strokeColor?: string;
}

/** Build a per-group-row aggregated diamond canvas. Diamonds appear at every
 *  frame that has at least one keyframe across any child track. Visually
 *  smaller and grey-tinted to differentiate from per-track rows. */
export const buildGroupDiamonds = (args: BuildGroupDiamondsArgs): CacheCanvas => {
    const {
        childTracks,
        canvasWidth,
        rowHeight,
        scaleX,
        panX,
        fillColor = DIAMOND_THEME.groupFill,
        strokeColor = DIAMOND_THEME.groupStroke,
    } = args;

    const canvas = createCacheCanvas(canvasWidth, rowHeight);
    const ctx = getCacheCtx2D(canvas);
    if (!ctx) return canvas;

    // Union of unique frames across all child tracks. Sorted so the cull short-circuits
    // sensibly as we walk left-to-right.
    const frameSet = new Set<number>();
    for (const t of childTracks) {
        for (const k of t.keyframes) frameSet.add(k.frame);
    }
    if (frameSet.size === 0) return canvas;
    const frames = Array.from(frameSet).sort((a, b) => a - b);
    // Group-row diamonds are always Linear (rotated). Synthesize a minimal keyframe-like
    // array so the shared diamond loop can paint them with the same code path.
    const synth: { frame: number; interpolation?: string }[] = new Array(frames.length);
    for (let i = 0; i < frames.length; i++) synth[i] = { frame: frames[i], interpolation: 'Linear' };

    const cy = rowHeight / 2;
    const size = 12;             // matches GroupDiamond's previous .w-3.h-3 sizing.
    const half = size / 2;
    const diag = (size / 2) * Math.SQRT2;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;

    drawDiamondPaths(ctx, synth, scaleX, panX, cy, size, half, diag, canvasWidth);
    return canvas;
};
