
import { GraphViewTransform, frameToPixel, valueToPixel, pixelToFrame, pixelToValue, getGridStep, getTimeGridSteps, THEME } from './GraphUtils';
import { AnimationSequence } from '../types';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../data/constants';
import { PolylineCache, SoftSelectionMaskCache, buildPolylineViewKey, buildMaskViewKey } from './GraphRendererCache';
import { buildTrackPolyline, buildSoftSelectionMask } from './GraphRendererBuilder';

export const TRACK_COLORS = [
    '#22d3ee', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'
];

export const LEFT_GUTTER_WIDTH = GRAPH_LEFT_GUTTER_WIDTH;
export const RULER_HEIGHT = GRAPH_RULER_HEIGHT;

interface GraphRenderProps {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    view: GraphViewTransform;
    sequence: AnimationSequence;
    trackIds: string[];
    currentFrame: number;
    durationFrames: number;
    selectedKeyframeIds: string[];
    selectionBox: { x: number, y: number, w: number, h: number } | null;
    normalized: boolean;
    trackRanges: Record<string, { min: number, max: number, span: number }>;
    softSelectionEnabled: boolean;
    softSelectionRadius: number;
    softSelectionType: any;
    softInteraction: { isAdjusting: boolean, anchorKey: string | null };
    highlightedTracks: Set<string>;
}

/** Subset of GraphRenderProps needed for the per-frame overlay layer
 *  (playhead + selection box). Excluding everything else lets the overlay
 *  useEffect's dep list stay narrow so it only re-runs on frame nudges or
 *  marquee drags — never on the heavier sequence/zoom/selection inputs. */
export interface GraphOverlayProps {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    view: GraphViewTransform;
    currentFrame: number;
    selectionBox: { x: number, y: number, w: number, h: number } | null;
}

/** Module-scoped polyline cache. One entry per visible track; entries persist across
 *  drawGraph invocations and invalidate on (keyframesRef, viewKey, bold) mismatch.
 *  Stale entries (track no longer visible) are evicted at the end of each drawGraph
 *  call via evictStale(visibleTrackIds). */
const _polylineCache = new PolylineCache();
const _softMaskCache = new SoftSelectionMaskCache();

let _limitPattern: CanvasPattern | null = null;

const getLimitPattern = (ctx: CanvasRenderingContext2D) => {
    if (_limitPattern) return _limitPattern;
    
    const size = 20;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = size;
    pCanvas.height = size;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
        pCtx.strokeStyle = "rgba(0,0,0,0.3)";
        pCtx.lineWidth = 10;
        pCtx.lineCap = 'butt';
        
        pCtx.beginPath();
        pCtx.moveTo(-10, 10);
        pCtx.lineTo(10, -10);
        pCtx.moveTo(0, 20);
        pCtx.lineTo(20, 0);
        pCtx.moveTo(10, 30);
        pCtx.lineTo(30, 10);
        pCtx.stroke();
    }
    
    _limitPattern = ctx.createPattern(pCanvas, 'repeat');
    return _limitPattern;
};

/** Paint the back layer of the graph: background, grid, polylines (cached
 *  per track), unselected diamonds (cached), selection-aware overlays, ruler,
 *  gutter, value labels, and the duration-limit pattern. NOT the playhead;
 *  NOT the selection box — those are repainted per frame via drawGraphOverlay.
 *
 *  The caller (GraphCanvas) drives this from a useEffect whose dep list
 *  EXCLUDES currentFrame and selectionBox, so during ordinary playback this
 *  function is invoked only when something material to the cached layer
 *  changes (sequence edits, viewport zoom, selection set, soft state, etc.).
 *  Without that gating the per-frame React reconciliation pulls drawGraph in
 *  even when the polyline cache hits 100% — measured during pause-2: 1056
 *  cache hits, 0 misses, 0 perf delta. */
export const drawGraph = (props: GraphRenderProps) => {
    const {
        ctx, width, height, view, sequence, trackIds, currentFrame, durationFrames,
        selectedKeyframeIds, selectionBox, normalized, trackRanges,
        softSelectionEnabled, softSelectionRadius, softSelectionType, softInteraction, highlightedTracks
    } = props;

    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + LEFT_GUTTER_WIDTH;
    const canvasPixelToFrame = (px: number) => pixelToFrame(px - LEFT_GUTTER_WIDTH, view);
    
    const getLocalY = (val: number, tid: string) => {
        if (!normalized) return val;
        const r = trackRanges[tid];
        if (!r) return 0.5;
        return (val - r.min) / r.span; 
    };

    const v2p = (val: number, tid: string) => {
        if (normalized) {
            const norm = getLocalY(val, tid);
            return valueToPixel(norm, view);
        }
        return valueToPixel(val, view);
    };

    ctx.fillStyle = THEME.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1;
    const graphTop = RULER_HEIGHT;
    const startFrame = Math.floor(view.panX);
    const endFrame = Math.ceil(pixelToFrame(width - LEFT_GUTTER_WIDTH, view)); 
    
    ctx.textAlign = "left";
    
    const { textStep, lineStep } = getTimeGridSteps(view.scaleX);
    const firstGridFrame = Math.floor(startFrame / lineStep) * lineStep;
    
    for (let f = firstGridFrame; f <= endFrame; f += lineStep) {
        const x = frameToCanvasPixel(f);
        if (x < LEFT_GUTTER_WIDTH) continue;
        
        ctx.beginPath();
        ctx.strokeStyle = f === 0 ? THEME.zeroLineColor : THEME.gridColor;
        ctx.globalAlpha = (f % textStep === 0) ? 0.3 : 0.1;
        ctx.moveTo(x, graphTop);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    if (normalized) {
        const y0 = valueToPixel(0, view);
        const y1 = valueToPixel(1, view);
        ctx.strokeStyle = '#444';
        ctx.beginPath(); ctx.moveTo(LEFT_GUTTER_WIDTH, y0); ctx.lineTo(width, y0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(LEFT_GUTTER_WIDTH, y1); ctx.lineTo(width, y1); ctx.stroke();
    } else {
        const valStep = getGridStep(view.scaleY, 40);
        const minVal = pixelToValue(height, view); 
        const maxVal = pixelToValue(0, view); 
        const firstVal = Math.floor(minVal / valStep) * valStep;
        
        for (let v = firstVal; v <= maxVal; v += valStep) {
            const y = valueToPixel(v, view);
            if (y < graphTop) continue; 
            ctx.beginPath();
            ctx.strokeStyle = Math.abs(v) < 0.000001 ? THEME.zeroLineColor : THEME.gridColor;
            ctx.moveTo(LEFT_GUTTER_WIDTH, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            if (y > graphTop + 10 && y < height - 10) {
                 ctx.fillText(v.toString(), LEFT_GUTTER_WIDTH - 4, y + 3);
            }
        }
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT_GUTTER_WIDTH, graphTop, width - LEFT_GUTTER_WIDTH, height - graphTop);
    ctx.clip();

    // Pass 0: composite each track's cached polyline + diamonds canvas onto
    // the main canvas at the per-track dim level. The cache hit-rate is 100%
    // during graph-play (verified at pause-2); a cache miss only happens on
    // sequence edit, viewport change, or track-selection change.
    trackIds.forEach((tid, idx) => {
        const track = sequence.tracks[tid];
        if (!track || track.type !== 'float') return;
        const color = TRACK_COLORS[idx % TRACK_COLORS.length];
        const keys = track.keyframes;
        if (keys.length === 0) return;
        const isHighlighted = highlightedTracks.has(tid);
        const range = trackRanges[tid];
        const bold = isHighlighted;
        const viewKey = `${buildPolylineViewKey(view.scaleX, view.scaleY, normalized, range?.min ?? 0, range?.max ?? 0)}|p=${view.panX}|${view.panY}|b=${bold ? 1 : 0}`;
        let cached = _polylineCache.get(tid, keys, viewKey);
        if (!cached) {
            const trackCanvas = buildTrackPolyline({
                track, view, canvasWidth: width, canvasHeight: height,
                normalized, range, color, bold,
            });
            _polylineCache.set(tid, keys, viewKey, trackCanvas, width, height);
            cached = { canvas: trackCanvas, width, height };
        }
        const dim = isHighlighted || highlightedTracks.size === 0 ? 1.0 : 0.4;
        ctx.globalAlpha = dim;
        ctx.drawImage(cached.canvas as CanvasImageSource, 0, 0);
        ctx.globalAlpha = 1.0;
    });

    // Soft-selection tint mask — single composite covering all tracks. Built
    // once per (selection set, radius, type, viewport) tuple. When soft
    // selection is off (the common case) nothing is composited; the cache is
    // cleared so the canvas memory doesn't linger between sessions.
    if (softSelectionEnabled && softSelectionRadius > 0 && selectedKeyframeIds.length > 0) {
        const maskKey =
            `${buildMaskViewKey(selectedKeyframeIds, softSelectionRadius, softSelectionType, view.scaleX)}` +
            `|sy=${view.scaleY}|px=${view.panX}|py=${view.panY}|n=${normalized ? 1 : 0}`;
        let maskCached = _softMaskCache.get(maskKey);
        if (!maskCached) {
            const maskCanvas = buildSoftSelectionMask({
                sequence, trackIds, selectedKeyframeIds,
                trackColors: TRACK_COLORS,
                softSelectionRadius, softSelectionType,
                view, canvasWidth: width, canvasHeight: height,
                normalized, trackRanges,
            });
            _softMaskCache.set(maskKey, maskCanvas, width, height);
            maskCached = { canvas: maskCanvas, width, height };
        }
        ctx.drawImage(maskCached.canvas as CanvasImageSource, 0, 0);
    } else {
        _softMaskCache.clear();
    }

    // Pass 1: selection-aware overlays on top of the cached layer + soft mask.
    // Iterates per-track but the inner loop is bounded by selectedKeyframeIds
    // (typically <10 keys) — never by total visible-key count.
    trackIds.forEach((tid) => {
        const track = sequence.tracks[tid];
        if (!track || track.type !== 'float') return;
        const keys = track.keyframes;
        if (keys.length === 0) return;

        {
            ctx.globalAlpha = 1.0;

            // Pass 2: selection-color override + selection ring + bezier handles.
            // We iterate selectedKeyframeIds (bounded). Build a per-track lookup
            // for the selected keys on this track. Empty in graph-play scenarios.
            for (let si = 0; si < selectedKeyframeIds.length; si++) {
                const compositeId = selectedKeyframeIds[si];
                const sepIdx = compositeId.indexOf('::');
                if (sepIdx < 0) continue;
                if (compositeId.substring(0, sepIdx) !== tid) continue;
                const kid = compositeId.substring(sepIdx + 2);
                const k = keys.find(kk => kk.id === kid);
                if (!k) continue;
                const kx = frameToCanvasPixel(k.frame);
                const ky = v2p(k.value, tid);
                if (ky < graphTop - 10 || ky > height + 10 || kx < LEFT_GUTTER_WIDTH - 5 || kx > width + 5) continue;

                if (k.interpolation === 'Bezier') {
                    ctx.strokeStyle = THEME.handleLineColor;
                    ctx.lineWidth = 1;
                    const range = normalized ? trackRanges[tid] : null;
                    if (k.rightTangent) {
                        const hxVal = k.frame + k.rightTangent.x;
                        const hyVal = normalized && range ? getLocalY(k.value + k.rightTangent.y, tid) : k.value + k.rightTangent.y;
                        const hx = frameToCanvasPixel(hxVal);
                        const hy = valueToPixel(hyVal, view);
                        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
                        ctx.fillStyle = THEME.handleColor; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
                    }
                    if (k.leftTangent) {
                        const hxVal = k.frame + k.leftTangent.x;
                        const hyVal = normalized && range ? getLocalY(k.value + k.leftTangent.y, tid) : k.value + k.leftTangent.y;
                        const hx = frameToCanvasPixel(hxVal);
                        const hy = valueToPixel(hyVal, view);
                        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
                        ctx.fillStyle = THEME.handleColor; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
                    }
                }

                ctx.fillStyle = THEME.keySelectedColor;
                if (k.interpolation === 'Step') ctx.fillRect(kx - 4, ky - 4, 8, 8);
                else if (k.interpolation === 'Bezier') { ctx.beginPath(); ctx.arc(kx, ky, 4, 0, Math.PI * 2); ctx.fill(); }
                else { ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); }

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(kx, ky, 6, 0, Math.PI * 2); ctx.stroke();

                // Pass 3 (inline): soft-radius circle for the adjusting anchor key.
                if (softSelectionEnabled && softInteraction.isAdjusting && softInteraction.anchorKey === compositeId) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    const rPx = Math.abs(softSelectionRadius) * view.scaleX;
                    ctx.arc(kx, ky, rPx, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = softSelectionRadius > 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 100, 100, 0.1)';
                    ctx.fill();
                }
            }
            // Reset for next track
            ctx.globalAlpha = 1.0;
        }
    });

    // Drop polyline cache entries for tracks no longer visible. Cheap; visible
    // set is small (typically 1-12 tracks). Without this, a track that scrolls
    // out of view leaks its cache canvas until the page reloads.
    _polylineCache.evictStale(new Set(trackIds));

    ctx.restore();

    ctx.fillStyle = '#080808';
    ctx.fillRect(LEFT_GUTTER_WIDTH, 0, width, graphTop);
    ctx.beginPath(); ctx.strokeStyle='#444'; ctx.moveTo(LEFT_GUTTER_WIDTH, graphTop); ctx.lineTo(width, graphTop); ctx.stroke();
    
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = '#888';
    
    for (let f = firstGridFrame; f <= endFrame; f += textStep) {
        const x = frameToCanvasPixel(f);
        if (x < LEFT_GUTTER_WIDTH) continue;
        ctx.fillRect(x, graphTop - 8, 1, 8);
        ctx.fillText(f.toString(), x + 4, 2);
    }
    
    ctx.fillStyle = '#080808'; 
    ctx.fillRect(0, 0, LEFT_GUTTER_WIDTH, height);
    ctx.fillStyle = '#374151'; 
    ctx.fillRect(LEFT_GUTTER_WIDTH - 1, 0, 1, height);
    
    ctx.textAlign = "right";
    ctx.font = "9px monospace";
    ctx.fillStyle = "#9ca3af";
    
    if (normalized) {
        const y0 = valueToPixel(0, view);
        const y1 = valueToPixel(1, view);
        ctx.fillText("1.0", LEFT_GUTTER_WIDTH - 4, y1 + 3);
        ctx.fillText("0.0", LEFT_GUTTER_WIDTH - 4, y0 + 3);
    } else {
        const valStep = getGridStep(view.scaleY, 40);
        const minVal = pixelToValue(height, view); 
        const maxVal = pixelToValue(0, view); 
        const firstVal = Math.floor(minVal / valStep) * valStep;
        
        for (let v = firstVal; v <= maxVal; v += valStep) {
            const y = valueToPixel(v, view);
            if (y < graphTop) continue; 
            ctx.beginPath();
            ctx.strokeStyle = Math.abs(v) < 0.000001 ? THEME.zeroLineColor : THEME.gridColor;
            ctx.moveTo(LEFT_GUTTER_WIDTH, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            if (y > graphTop + 10 && y < height - 10) {
                 ctx.fillText(v.toString(), LEFT_GUTTER_WIDTH - 4, y + 3);
            }
        }
    }

    const limitX = frameToCanvasPixel(durationFrames);
    if (limitX < width) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(limitX, 0, width - limitX, height);
        
        const pattern = getLimitPattern(ctx);
        if (pattern) {
            ctx.save();
            ctx.translate(limitX, 0); 
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width - limitX, height);
            ctx.restore();
        }
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(limitX, 0); ctx.lineTo(limitX, height); ctx.stroke();
    }
    
};

/** Paint the per-frame overlay layer: playhead + selection box. The overlay
 *  canvas is transparent except for these strokes, so a clearRect at the
 *  start wipes the prior frame's playhead position. Driven from a separate
 *  useEffect in GraphCanvas whose deps are only currentFrame + selectionBox
 *  (+ view, for the frame→pixel conversion). */
export const drawGraphOverlay = (props: GraphOverlayProps) => {
    const { ctx, width, height, view, currentFrame, selectionBox } = props;
    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + LEFT_GUTTER_WIDTH;

    ctx.clearRect(0, 0, width, height);

    if (selectionBox) {
        ctx.fillStyle = 'rgba(0, 200, 255, 0.1)';
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
        ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
    }

    const phX = frameToCanvasPixel(currentFrame);

    if (phX < LEFT_GUTTER_WIDTH) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(LEFT_GUTTER_WIDTH + 8, height / 2 - 6);
        ctx.lineTo(LEFT_GUTTER_WIDTH + 2, height / 2);
        ctx.lineTo(LEFT_GUTTER_WIDTH + 8, height / 2 + 6);
        ctx.fill();
    } else if (phX > width) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(width - 8, height / 2 - 6);
        ctx.lineTo(width - 2, height / 2);
        ctx.lineTo(width - 8, height / 2 + 6);
        ctx.fill();
    } else {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(phX, 0);
        ctx.lineTo(phX, height);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(phX, 0);
        ctx.lineTo(phX + 5, 0);
        ctx.lineTo(phX + 5, 12);
        ctx.lineTo(phX, 18);
        ctx.lineTo(phX - 5, 12);
        ctx.lineTo(phX - 5, 0);
        ctx.fill();
    }
};
