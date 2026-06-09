import React, { useEffect, useMemo, useRef } from 'react';
import { AnimationSequence, Keyframe, BezierHandle } from '../../types';
import { GraphViewTransform } from '../../utils/GraphUtils';
import { GraphDataSource } from '../../utils/GraphDataSource';

interface GraphSelectionBBoxProps {
    sequence: AnimationSequence;
    selectedKeyframeIds: string[];
    view: GraphViewTransform;
    normalized: boolean;
    frameToCanvasPixel: (f: number) => number;
    v2p: (val: number, tid: string) => number;
    // Store-agnostic data source — the timeline passes the store data source
    // (snapshot + updateKeyframes + the ADR-0061 scrub gesture); the palette
    // passes a local-state impl (no scrub gesture, no-op onAfterMutate).
    dataSource: GraphDataSource;
    /**
     * Opt-in CENTRE MOVE handle (palette curve editor only; the timeline omits it
     * and keeps its drag-a-key-to-translate gesture untouched). When true a grab
     * handle is drawn in the middle of the box that TRANSLATES the whole selection
     * — a discoverable affordance for "move these points" that the bare key-drag
     * doesn't advertise. Requires `p2v` so the value axis works in normalised mode
     * (where a single value↔pixel equation doesn't exist across tracks).
     */
    enableMoveHandle?: boolean;
    /** Inverse of `v2p`: pixel-Y → value for a track (palette supplies it; used by
     *  the move handle to translate in value space, normalised-mode aware). */
    p2v?: (py: number, tid: string) => number;
}

interface InitialKey {
    trackId: string;
    keyId: string;
    startFrame: number;
    startValue: number;
    startPy: number;
    startLeftTan?: BezierHandle;
    startRightTan?: BezierHandle;
}

type DragType = 'scale_left' | 'scale_right' | 'scale_top' | 'scale_bottom' | 'move';

interface DragState {
    type: DragType;
    startClientX: number;
    startClientY: number;
    minFrame: number;
    maxFrame: number;
    minPy: number;
    maxPy: number;
    initialKeys: InitialKey[];
}

/** Multi-keyframe scale handles for the Graph Editor. Translation is already
 *  handled by the key-drag path in useGraphInteraction (drag any selected key
 *  to move the whole selection), so this only renders the visual outline plus
 *  four edge handles for scaling.
 *
 *  Frame-axis: scales in time, anchored at the opposite edge — Bezier handle
 *  X scales with the same ratio so curve shape is preserved.
 *  Value-axis: scales in pixel space (works across multi-track selections with
 *  different value ranges); tangent Y scales by the same ratio. Hidden in
 *  normalised mode since the per-track inverse isn't a single equation. */
export const GraphSelectionBBox: React.FC<GraphSelectionBBoxProps> = ({
    sequence, selectedKeyframeIds, view, normalized, frameToCanvasPixel, v2p, dataSource,
    enableMoveHandle, p2v
}) => {
    const ds = dataSource;

    const dragRef = useRef<DragState | null>(null);

    const bounds = useMemo(() => {
        if (selectedKeyframeIds.length < 2) return null;
        let minFrame = Infinity, maxFrame = -Infinity;
        let minPy = Infinity, maxPy = -Infinity;
        const keys: InitialKey[] = [];

        selectedKeyframeIds.forEach(cid => {
            const [tid, kid] = cid.split('::');
            const t = sequence.tracks[tid];
            if (!t) return;
            const k = t.keyframes.find(kf => kf.id === kid);
            if (!k) return;
            const py = v2p(k.value, tid);
            keys.push({
                trackId: tid,
                keyId: kid,
                startFrame: k.frame,
                startValue: k.value,
                startPy: py,
                startLeftTan:  k.leftTangent  ? { ...k.leftTangent  } : undefined,
                startRightTan: k.rightTangent ? { ...k.rightTangent } : undefined,
            });
            if (k.frame < minFrame) minFrame = k.frame;
            if (k.frame > maxFrame) maxFrame = k.frame;
            if (py < minPy) minPy = py;
            if (py > maxPy) maxPy = py;
        });

        if (keys.length < 2) return null;
        if (Math.abs(maxFrame - minFrame) < 0.001 && Math.abs(maxPy - minPy) < 1) return null;

        const minPx = frameToCanvasPixel(minFrame);
        const maxPx = frameToCanvasPixel(maxFrame);
        return {
            minFrame, maxFrame, minPy, maxPy, keys,
            left:   minPx - 6,
            top:    Math.min(minPy, maxPy) - 6,
            width:  Math.max(2, maxPx - minPx) + 12,
            height: Math.max(2, Math.abs(maxPy - minPy)) + 12,
        };
    }, [selectedKeyframeIds, sequence, v2p, frameToCanvasPixel]);

    // Latest-render values made available to the global mouse listener without
    // forcing the effect to re-run (and reattach the listeners) on every prop
    // change. Same propsRef pattern as useDopeSheetInteraction.
    const latest = useRef({ view, ds, p2v });
    latest.current = { view, ds, p2v };

    const startDrag = (e: React.MouseEvent, type: DragType) => {
        if (!bounds) return;
        e.preventDefault();
        e.stopPropagation();
        ds.snapshot?.();
        ds.scrub?.setIsScrubbing(true);
        ds.scrub?.begin();
        dragRef.current = {
            type,
            startClientX: e.clientX,
            startClientY: e.clientY,
            minFrame: bounds.minFrame,
            maxFrame: bounds.maxFrame,
            minPy:    bounds.minPy,
            maxPy:    bounds.maxPy,
            initialKeys: bounds.keys.map(k => ({ ...k })),
        };
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const ds = dragRef.current;
            if (!ds) return;
            const v = latest.current.view;

            const dy = e.clientY - ds.startClientY;
            const dFrame = (e.clientX - ds.startClientX) / v.scaleX;
            const updates: { trackId: string, keyId: string, patch: Partial<Keyframe> }[] = [];

            if (ds.type === 'move') {
                // Pure translation of the whole selection: shift every key by the same
                // pixel delta. Tangents are in frame/value units relative to their key, so
                // a translation leaves them unchanged. The value DELTA goes through `p2v`
                // (the per-track, normalised-aware inverse) but is added to the captured
                // `startValue` — anchoring on startValue (not remapping it) keeps the point
                // from jumping if the value range shifts mid-drag. Fallback = linear slope.
                const p2vNow = latest.current.p2v;
                ds.initialKeys.forEach(k => {
                    const patch: Partial<Keyframe> = { frame: Math.max(0, Math.round(k.startFrame + dFrame)) };
                    patch.value = p2vNow
                        ? k.startValue + (p2vNow(k.startPy + dy, k.trackId) - p2vNow(k.startPy, k.trackId))
                        : k.startValue - dy / v.scaleY;
                    updates.push({ trackId: k.trackId, keyId: k.keyId, patch });
                });
            }
            else if (ds.type === 'scale_left' || ds.type === 'scale_right') {
                const span = Math.max(1, ds.maxFrame - ds.minFrame);
                const ratio = ds.type === 'scale_right'
                    ? Math.max(0.05, (span + dFrame) / span)
                    : Math.max(0.05, (span - dFrame) / span);

                ds.initialKeys.forEach(k => {
                    const newFrame = ds.type === 'scale_right'
                        ? ds.minFrame + (k.startFrame - ds.minFrame) * ratio
                        : ds.maxFrame - (ds.maxFrame - k.startFrame) * ratio;
                    const patch: Partial<Keyframe> = { frame: Math.max(0, Math.round(newFrame)) };
                    if (k.startLeftTan)  patch.leftTangent  = { x: k.startLeftTan.x  * ratio, y: k.startLeftTan.y  };
                    if (k.startRightTan) patch.rightTangent = { x: k.startRightTan.x * ratio, y: k.startRightTan.y };
                    updates.push({ trackId: k.trackId, keyId: k.keyId, patch });
                });
            }
            else {
                // scale_top / scale_bottom — pixel-space scale, anchored at the
                // opposite edge. Value space is linear in pixel space (non-normalised)
                // so the same ratio applies to value deltas and tangent Y.
                const heightPx = Math.max(1, ds.maxPy - ds.minPy);
                const ratio = ds.type === 'scale_bottom'
                    ? Math.max(0.05, (heightPx + dy) / heightPx)
                    : Math.max(0.05, (heightPx - dy) / heightPx);

                ds.initialKeys.forEach(k => {
                    const newPy = ds.type === 'scale_bottom'
                        ? ds.minPy + (k.startPy - ds.minPy) * ratio
                        : ds.maxPy - (ds.maxPy - k.startPy) * ratio;
                    const patch: Partial<Keyframe> = { value: k.startValue + (k.startPy - newPy) / v.scaleY };
                    if (k.startLeftTan)  patch.leftTangent  = { x: k.startLeftTan.x,  y: k.startLeftTan.y  * ratio };
                    if (k.startRightTan) patch.rightTangent = { x: k.startRightTan.x, y: k.startRightTan.y * ratio };
                    updates.push({ trackId: k.trackId, keyId: k.keyId, patch });
                });
            }

            if (updates.length > 0) {
                const cur = latest.current.ds;
                cur.updateKeyframes(updates);
                cur.onAfterMutate?.(cur.currentFrame);
            }
        };

        const onUp = () => {
            if (dragRef.current) {
                const cur = latest.current.ds;
                cur.scrub?.end();
                cur.scrub?.setIsScrubbing(false);
            }
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    if (!bounds) return null;

    return (
        <div
            className="absolute pointer-events-none z-30"
            style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
        >
            {/* Visual outline. Translation is handled by clicking any selected keyframe
                (useGraphInteraction's key-drag path) AND, when enabled, the centre grab
                handle below — a clearer "move these points" affordance. */}
            <div className="absolute inset-1 border border-orange-500/50 rounded-sm" />
            {enableMoveHandle && (
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-orange-500/30 border border-orange-400/70 cursor-move flex items-center justify-center pointer-events-auto hover:bg-orange-500/50 group/mv"
                    onMouseDown={(e) => startDrag(e, 'move')}
                    title="Move selection (drag)"
                >
                    {/* 4-way arrow glyph so the affordance reads at a glance. */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-200 group-hover/mv:text-white">
                        <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
                    </svg>
                </div>
            )}
            <div
                className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize flex items-center justify-center pointer-events-auto group/lh"
                onMouseDown={(e) => startDrag(e, 'scale_left')}
                title="Scale time from left"
            >
                <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/lh:bg-white" />
            </div>
            <div
                className="absolute top-0 bottom-0 right-0 w-3 cursor-ew-resize flex items-center justify-center pointer-events-auto group/rh"
                onMouseDown={(e) => startDrag(e, 'scale_right')}
                title="Scale time from right"
            >
                <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/rh:bg-white" />
            </div>
            {!normalized && (
                <>
                    <div
                        className="absolute left-0 right-0 top-0 h-3 cursor-ns-resize flex items-center justify-center pointer-events-auto group/th"
                        onMouseDown={(e) => startDrag(e, 'scale_top')}
                        title="Scale value from top"
                    >
                        <div className="h-1 w-3 bg-orange-400 rounded-full shadow-sm group-hover/th:bg-white" />
                    </div>
                    <div
                        className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize flex items-center justify-center pointer-events-auto group/bh"
                        onMouseDown={(e) => startDrag(e, 'scale_bottom')}
                        title="Scale value from bottom"
                    >
                        <div className="h-1 w-3 bg-orange-400 rounded-full shadow-sm group-hover/bh:bg-white" />
                    </div>
                </>
            )}
        </div>
    );
};
