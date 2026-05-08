import React, { useEffect, useMemo, useRef } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { animationEngine } from '../../engine/AnimationEngine';
import { AnimationSequence, Keyframe, BezierHandle } from '../../types';
import { GraphViewTransform } from '../../utils/GraphUtils';

interface GraphSelectionBBoxProps {
    sequence: AnimationSequence;
    selectedKeyframeIds: string[];
    view: GraphViewTransform;
    normalized: boolean;
    frameToCanvasPixel: (f: number) => number;
    v2p: (val: number, tid: string) => number;
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

type DragType = 'scale_left' | 'scale_right' | 'scale_top' | 'scale_bottom';

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
    sequence, selectedKeyframeIds, view, normalized, frameToCanvasPixel, v2p
}) => {
    const updateKeyframes = useAnimationStore(s => s.updateKeyframes);
    const snapshot        = useAnimationStore(s => s.snapshot);
    const setIsScrubbing  = useAnimationStore(s => s.setIsScrubbing);

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
    const latest = useRef({ view });
    latest.current = { view };

    const startDrag = (e: React.MouseEvent, type: DragType) => {
        if (!bounds) return;
        e.preventDefault();
        e.stopPropagation();
        snapshot();
        setIsScrubbing(true);
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

            if (ds.type === 'scale_left' || ds.type === 'scale_right') {
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
                updateKeyframes(updates);
                animationEngine.scrub(useAnimationStore.getState().currentFrame);
            }
        };

        const onUp = () => {
            if (dragRef.current) setIsScrubbing(false);
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [updateKeyframes, setIsScrubbing]);

    if (!bounds) return null;

    return (
        <div
            className="absolute pointer-events-none z-30"
            style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
        >
            {/* Visual outline only — translation is handled by clicking any
                selected keyframe (useGraphInteraction's key-drag path). */}
            <div className="absolute inset-1 border border-orange-500/50 rounded-sm" />
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
