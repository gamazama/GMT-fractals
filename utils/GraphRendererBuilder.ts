/**
 * Per-track polyline builder for the GraphEditor's back-canvas cache.
 *
 * Extracted from drawGraph's per-track loop in GraphRenderer.ts. Renders ONE
 * track's curve into an off-screen canvas: the polyline (Linear/Step/Bezier),
 * the log-track per-pixel sampling, and the post-behavior tail
 * (Hold/Continue/Loop/PingPong/OffsetLoop).
 *
 * What it does NOT render — these stay in the per-render foreground pass so
 * the cache key stays narrow and the back-cache lifetime is dominated by
 * keyframe edits / zoom, not by selection/playhead/hover changes:
 *
 *   - bezier handle lines (depend on selection state)
 *   - selection rings and selection-color overrides
 *   - soft-weight diamond colour tinting (rendered as a soft-selection mask
 *     on the mid layer; see SoftSelectionMaskCache)
 *   - playhead, selection box, hover affordances (overlay/front layer)
 *
 * Diamonds ARE in the back cache — track-default colour, no selection
 * awareness. The first cut without diamonds in the cache (just polyline +
 * post-behavior) produced 100% cache hits in graph-play but zero bench
 * delta: the dominant cost was the per-key save/translate/rotate/restore
 * in the diamond loop (882 keys × ~5 state ops each ≈ the observed 2.2
 * ms/commit). Moving diamonds into the cache turns the per-render diamond
 * loop into O(selected keys) instead of O(all visible keys).
 *
 * Coordinate system inside the cache canvas:
 *
 *   x = (frame - panX) * scaleX     (i.e. uses the supplied view's panX)
 *   y = valueToPixel(value, view)   (same as the main canvas)
 *
 * The cache canvas is sized to the main canvas (canvasWidth × canvasHeight).
 * Composition into the main canvas is a 1:1 drawImage at offset (0, 0)
 * because the cache renders with the same pan as the main draw.
 *
 * NOTE on the cache-key contract: 09_CANVAS_GRAPH_PROMPT.md specifies
 * panX-out-of-key with pan applied as ctx.translate at composite time.
 * That approach requires a cache canvas wider than the viewport (covering
 * the whole timeline) to avoid right-edge clipping when post-behavior tails
 * extend past the visible range. For the immediate bench win that's not
 * necessary: graph-play holds pan fixed throughout, so panX-in-viewKey
 * still hits 100% of the time for the dominant scenario, and avoids the
 * "how wide should the off-screen canvas be" edge cases at deep zoom.
 * The deviation from the prompt's contract is documented in
 * 11_CANVAS_GRAPH_REPORT.md; revisit if pan smoothness regresses.
 */

import type { Track } from '../types';
import {
    GraphViewTransform,
    frameToPixel,
    pixelToFrame,
    valueToPixel,
    THEME,
} from './GraphUtils';
import { evaluateTrackValue, calculateSoftFalloff } from './timelineUtils';
import { isLogTrack } from '../engine/animation/logTrackRegistry';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../data/constants';
import { CacheCanvas, createCacheCanvas, getCacheCtx2D, CacheCtx2D } from './GraphRendererCache';

export interface BuildTrackPolylineArgs {
    track: Track;
    view: GraphViewTransform;
    canvasWidth: number;
    canvasHeight: number;
    normalized: boolean;
    /** Per-track value range (used when normalized=true). */
    range: { min: number; max: number; span: number } | undefined;
    /** Track-default colour (idx-based from drawGraph's TRACK_COLORS). */
    color: string;
    /** Bold-weight stroke for the "highlighted" (track-with-selected-key) state. */
    bold?: boolean;
}

const LEFT_GUTTER_WIDTH = GRAPH_LEFT_GUTTER_WIDTH;
const RULER_HEIGHT = GRAPH_RULER_HEIGHT;

const drawPostBehaviorTail = (
    ctx: CacheCtx2D,
    track: Track,
    firstKey: { frame: number; value: number },
    lastKey: { frame: number; value: number; interpolation?: string; leftTangent?: { x: number; y: number } | undefined },
    canvasWidth: number,
    v2p: (val: number) => number,
    frameToPx: (f: number) => number,
    pxToFrame: (px: number) => number,
) => {
    const behavior = track.postBehavior || 'Hold';
    const startPx = frameToPx(lastKey.frame);
    if (startPx > canvasWidth) return;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.5;
    ctx.moveTo(Math.max(LEFT_GUTTER_WIDTH, startPx), v2p(lastKey.value));

    if (behavior === 'Hold') {
        ctx.lineTo(canvasWidth, v2p(lastKey.value));
    } else if (behavior === 'Continue') {
        let slope = 0;
        const keys = track.keyframes;
        if (keys.length > 1) {
            const prev = keys[keys.length - 2];
            if (lastKey.interpolation === 'Linear') {
                slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
            } else if (lastKey.interpolation === 'Bezier') {
                if (lastKey.leftTangent && Math.abs(lastKey.leftTangent.x) > 0.001) {
                    slope = lastKey.leftTangent.y / lastKey.leftTangent.x;
                } else {
                    slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
                }
            }
        }
        const endFrame = pxToFrame(canvasWidth);
        const endVal = lastKey.value + slope * (endFrame - lastKey.frame);
        ctx.lineTo(canvasWidth, v2p(endVal));
    } else {
        const duration = lastKey.frame - firstKey.frame;
        if (duration > 0.001) {
            const stepPx = 5;
            const isRotation = track.id.startsWith('camera.rotation');
            const drawStartPx = Math.max(startPx, LEFT_GUTTER_WIDTH);
            ctx.moveTo(drawStartPx, v2p(lastKey.value));

            for (let px = drawStartPx; px < canvasWidth + stepPx; px += stepPx) {
                const frame = pxToFrame(px);
                const timeSinceEnd = frame - lastKey.frame;
                const cycleCount = Math.floor(timeSinceEnd / duration) + 1;
                const localFrameOffset = timeSinceEnd % duration;
                let val = 0;

                if (behavior === 'Loop' || behavior === 'OffsetLoop') {
                    const localFrame = firstKey.frame + localFrameOffset;
                    val = evaluateTrackValue(track.keyframes, localFrame, isRotation);
                    if (behavior === 'OffsetLoop') {
                        const diff = lastKey.value - firstKey.value;
                        val += diff * cycleCount;
                    }
                } else if (behavior === 'PingPong') {
                    const isReversed = cycleCount % 2 === 1;
                    if (isReversed) {
                        const reversedFrame = lastKey.frame - localFrameOffset;
                        val = evaluateTrackValue(track.keyframes, reversedFrame, isRotation);
                    } else {
                        const localFrame = firstKey.frame + localFrameOffset;
                        val = evaluateTrackValue(track.keyframes, localFrame, isRotation);
                    }
                }
                ctx.lineTo(px, v2p(val));
            }
        } else {
            ctx.lineTo(canvasWidth, v2p(lastKey.value));
        }
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

/** Build a per-track polyline canvas. Pure: same args → same pixels. */
export const buildTrackPolyline = (args: BuildTrackPolylineArgs): CacheCanvas => {
    const { track, view, canvasWidth, canvasHeight, normalized, range, color, bold } = args;
    const canvas = createCacheCanvas(canvasWidth, canvasHeight);
    const ctx = getCacheCtx2D(canvas);
    if (!ctx) return canvas;

    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + LEFT_GUTTER_WIDTH;
    const canvasPixelToFrame = (px: number) => pixelToFrame(px - LEFT_GUTTER_WIDTH, view);

    const getLocalY = (val: number) => {
        if (!normalized) return val;
        if (!range) return 0.5;
        return (val - range.min) / range.span;
    };

    const v2p = (val: number) => {
        if (normalized) return valueToPixel(getLocalY(val), view);
        return valueToPixel(val, view);
    };

    const keys = track.keyframes;
    if (!keys || keys.length === 0) return canvas;

    // Clip to the plot area so the leading moveTo into the left gutter is hidden.
    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT_GUTTER_WIDTH, RULER_HEIGHT, canvasWidth - LEFT_GUTTER_WIDTH, canvasHeight - RULER_HEIGHT);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.lineWidth = bold ? 3 : 1.5;
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    const startX = frameToCanvasPixel(keys[0].frame);
    const startY = v2p(keys[0].value);
    ctx.moveTo(Math.min(startX, LEFT_GUTTER_WIDTH), startY);
    ctx.lineTo(startX, startY);

    const trackIsLog = isLogTrack(track.id);
    for (let i = 0; i < keys.length - 1; i++) {
        const k1 = keys[i];
        const k2 = keys[i + 1];
        const x1 = frameToCanvasPixel(k1.frame);
        const y1 = v2p(k1.value);
        const x2 = frameToCanvasPixel(k2.frame);
        const y2 = v2p(k2.value);

        if (k1.interpolation === 'Step') {
            ctx.lineTo(x2, y1);
            ctx.lineTo(x2, y2);
        } else if (trackIsLog && k1.value > 0 && k2.value > 0) {
            const sampleStepPx = 4;
            const span = Math.max(1, Math.floor((x2 - x1) / sampleStepPx));
            for (let s = 1; s <= span; s++) {
                const tt = s / span;
                const f = k1.frame + tt * (k2.frame - k1.frame);
                const v = evaluateTrackValue([k1, k2], f, false, true);
                ctx.lineTo(frameToCanvasPixel(f), v2p(v));
            }
        } else if (k1.interpolation === 'Linear') {
            ctx.lineTo(x2, y2);
        } else {
            const h1x = k1.rightTangent ? k1.rightTangent.x : (k2.frame - k1.frame) * 0.33;
            let h1y = k1.rightTangent ? k1.rightTangent.y : 0;
            const h2x = k2.leftTangent ? k2.leftTangent.x : -(k2.frame - k1.frame) * 0.33;
            let h2y = k2.leftTangent ? k2.leftTangent.y : 0;

            if (normalized && range) {
                h1y = h1y / range.span;
                h2y = h2y / range.span;
            }

            const cp1x = frameToCanvasPixel(k1.frame + h1x);
            const cp1y = y1 - h1y * view.scaleY;
            const cp2x = frameToCanvasPixel(k2.frame + h2x);
            const cp2y = y2 - h2y * view.scaleY;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        }
    }

    const lastK = keys[keys.length - 1];
    ctx.lineTo(frameToCanvasPixel(lastK.frame), v2p(lastK.value));
    ctx.stroke();

    const firstK = keys[0];
    drawPostBehaviorTail(
        ctx,
        track,
        firstK,
        lastK,
        canvasWidth,
        v2p,
        frameToCanvasPixel,
        canvasPixelToFrame,
    );

    // Track-default-coloured diamonds for every key. Selection-aware overrides
    // (selection rings, keySelectedColor fills, handle lines, soft-weight
    // tinting) happen in the per-render foreground pass on top of this cached
    // layer. The diamond shape is identical to what drawGraph used to paint
    // inline, but instead of save/translate/rotate/restore per diamond we
    // build the rotated geometry directly as a Path2D-style path — three
    // op-codes per diamond instead of seven, and zero context-state mutations.
    ctx.fillStyle = color;
    const dHalf = 4.24; // = 3 * sqrt(2); diamond radius matching the 6×6 rotated rect.
    const stepHalf = 4; // Step interpolation: 8×8 axis-aligned square.
    const bezierR = 4; // Bezier interpolation: circle radius.
    ctx.beginPath();
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const kx = frameToCanvasPixel(k.frame);
        const ky = v2p(k.value);
        // Conservative viewport cull — same predicate the per-render loop used.
        if (ky < RULER_HEIGHT - 10 || ky > canvasHeight + 10 || kx < LEFT_GUTTER_WIDTH - 5 || kx > canvasWidth + 10) continue;
        if (k.interpolation === 'Step') {
            // Axis-aligned square.
            ctx.rect(kx - stepHalf, ky - stepHalf, stepHalf * 2, stepHalf * 2);
        } else if (k.interpolation === 'Bezier') {
            // Circle. moveTo to start so the previous subpath doesn't connect.
            ctx.moveTo(kx + bezierR, ky);
            ctx.arc(kx, ky, bezierR, 0, Math.PI * 2);
        } else {
            // Linear: diamond (rotated 6×6 rect).
            ctx.moveTo(kx, ky - dHalf);
            ctx.lineTo(kx + dHalf, ky);
            ctx.lineTo(kx, ky + dHalf);
            ctx.lineTo(kx - dHalf, ky);
            ctx.closePath();
        }
    }
    ctx.fill();

    ctx.restore();
    return canvas;
};

// Re-export so the cache's THEME background is reachable from the builder caller
// without an extra import path.
export const POLYLINE_THEME = { backgroundColor: THEME.backgroundColor };

// ---------------------------------------------------------------------------
// Soft-selection mask builder
// ---------------------------------------------------------------------------

export interface BuildSoftMaskArgs {
    sequence: import('../types').AnimationSequence;
    trackIds: string[];
    selectedKeyframeIds: string[];
    trackColors: readonly string[];
    softSelectionRadius: number;
    softSelectionType: unknown;
    view: GraphViewTransform;
    canvasWidth: number;
    canvasHeight: number;
    normalized: boolean;
    trackRanges: Record<string, { min: number; max: number; span: number }>;
}

/** Pre-render the soft-selection-tint overlay for ALL visible tracks into one
 *  transparent canvas. Replaces the per-render O(visible-keys × selected-keys)
 *  loop in drawGraph with a single drawImage composite when soft selection is
 *  active. The mask is cached by SoftSelectionMaskCache; rebuilds happen only
 *  on changes to selection set, soft radius/type, or viewport (each of which
 *  is a deliberate user action, not a per-frame thing).
 *
 *  trackColors is passed in (not imported from GraphRenderer) to avoid the
 *  circular import builder ←→ renderer; the renderer is the only place that
 *  defines TRACK_COLORS so it owns ordering. */
export const buildSoftSelectionMask = (args: BuildSoftMaskArgs): CacheCanvas => {
    const {
        sequence, trackIds, selectedKeyframeIds, trackColors,
        softSelectionRadius, softSelectionType,
        view, canvasWidth, canvasHeight, normalized, trackRanges,
    } = args;
    const canvas = createCacheCanvas(canvasWidth, canvasHeight);
    const ctx = getCacheCtx2D(canvas);
    if (!ctx) return canvas;

    // Pre-bucket selected ids by track so the per-key lookup doesn't rescan
    // selectedKeyframeIds for every diamond.
    const selectedByTrack = new Map<string, { id: string; frame: number }[]>();
    for (const compositeId of selectedKeyframeIds) {
        const sepIdx = compositeId.indexOf('::');
        if (sepIdx < 0) continue;
        const tid = compositeId.substring(0, sepIdx);
        const kid = compositeId.substring(sepIdx + 2);
        const track = sequence.tracks[tid];
        if (!track) continue;
        const k = track.keyframes.find(kk => kk.id === kid);
        if (!k) continue;
        let arr = selectedByTrack.get(tid);
        if (!arr) { arr = []; selectedByTrack.set(tid, arr); }
        arr.push({ id: kid, frame: k.frame });
    }

    const selectedSet = new Set(selectedKeyframeIds);
    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + LEFT_GUTTER_WIDTH;
    const v2p = (val: number, tid: string) => {
        if (normalized) {
            const range = trackRanges[tid];
            if (!range || !range.span) return valueToPixel(0.5, view);
            return valueToPixel((val - range.min) / range.span, view);
        }
        return valueToPixel(val, view);
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT_GUTTER_WIDTH, RULER_HEIGHT, canvasWidth - LEFT_GUTTER_WIDTH, canvasHeight - RULER_HEIGHT);
    ctx.clip();

    trackIds.forEach((tid, idx) => {
        const track = sequence.tracks[tid];
        if (!track || track.type !== 'float') return;
        const selectedOnTrack = selectedByTrack.get(tid);
        if (!selectedOnTrack || selectedOnTrack.length === 0) return;
        const color = trackColors[idx % trackColors.length];

        for (const k of track.keyframes) {
            const compositeId = `${tid}::${k.id}`;
            if (selectedSet.has(compositeId)) continue;

            let maxWeight = 0;
            for (const sel of selectedOnTrack) {
                const dist = Math.abs(k.frame - sel.frame);
                if (dist < softSelectionRadius) {
                    const w = calculateSoftFalloff(dist, softSelectionRadius, softSelectionType as never);
                    if (w > maxWeight) maxWeight = w;
                }
            }
            if (maxWeight <= 0) continue;

            const kx = frameToCanvasPixel(k.frame);
            const ky = v2p(k.value, tid);
            if (ky < RULER_HEIGHT - 10 || ky > canvasHeight + 10 || kx < LEFT_GUTTER_WIDTH - 5 || kx > canvasWidth + 5) continue;

            ctx.fillStyle = `color-mix(in srgb, ${THEME.keyColor} ${Math.round(maxWeight * 100)}%, ${color})`;
            if (k.interpolation === 'Step') {
                ctx.fillRect(kx - 4, ky - 4, 8, 8);
            } else if (k.interpolation === 'Bezier') {
                ctx.beginPath(); ctx.arc(kx, ky, 4, 0, Math.PI * 2); ctx.fill();
            } else {
                const d = 4.24;
                ctx.beginPath();
                ctx.moveTo(kx, ky - d);
                ctx.lineTo(kx + d, ky);
                ctx.lineTo(kx, ky + d);
                ctx.lineTo(kx - d, ky);
                ctx.closePath();
                ctx.fill();
            }
        }
    });

    ctx.restore();
    return canvas;
};
