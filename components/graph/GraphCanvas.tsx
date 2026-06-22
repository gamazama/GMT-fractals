
import React, { useRef, useEffect } from 'react';
import { drawGraph, drawGraphOverlay } from '../../utils/GraphRenderer';
import { GraphViewTransform } from '../../utils/GraphUtils';
import { AnimationSequence } from '../../types';
import { useColorScheme } from '../../engine/store/colorSchemeStore';

interface GraphCanvasProps {
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

    // Event Forwarding
    onMouseDown: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    /** Overrides the default crosshair cursor on the interactive (overlay) canvas —
     *  e.g. the pencil cursor while pencil mode is active. */
    cursor?: string;
}

/**
 * Two stacked canvases: a back canvas for the heavy paint (polylines, diamonds,
 * grid, ruler, selection-aware overlays) and an overlay canvas for the per-frame
 * chrome (playhead, selection box).
 *
 * The back useEffect's dep list excludes currentFrame and selectionBox — those
 * only re-trigger the cheap overlay redraw. During ordinary playback the back
 * canvas stays warm because nothing in its dep list changes (the polyline cache
 * already provides per-track invalidation via referential equality on
 * keyframes), so drawGraph is not called per anim-notification. Without this
 * split the polyline cache hits 100% but React still pulls drawGraph in 480
 * times per 4 s scenario; with it, drawGraph runs only on real edits/zoom.
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = (props) => {
    const backRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    // Canvas pixels can't observe CSS theme vars; re-fire both draw effects when
    // the color scheme changes (THEME / getThemeColor resolve the new palette).
    const scheme = useColorScheme((s) => s.scheme);

    // Back layer: heavy paint. Dep list deliberately excludes currentFrame and
    // selectionBox so playback ticks don't re-fire this.
    useEffect(() => {
        const canvas = backRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawGraph({
            ctx,
            width: props.width,
            height: props.height,
            view: props.view,
            sequence: props.sequence,
            trackIds: props.trackIds,
            durationFrames: props.durationFrames,
            selectedKeyframeIds: props.selectedKeyframeIds,
            normalized: props.normalized,
            trackRanges: props.trackRanges,
            softSelectionEnabled: props.softSelectionEnabled,
            softSelectionRadius: props.softSelectionRadius,
            softSelectionType: props.softSelectionType,
            softInteraction: props.softInteraction,
            highlightedTracks: props.highlightedTracks,
        });
    }, [
        props.width, props.height, props.view, props.sequence, props.trackIds,
        props.durationFrames, props.selectedKeyframeIds,
        props.normalized, props.trackRanges,
        props.softSelectionEnabled, props.softSelectionRadius, props.softSelectionType,
        props.softInteraction, props.highlightedTracks, scheme,
    ]);

    // Overlay layer: playhead + selection box. Cheap; runs every frame during
    // playback. ClearRect + a single line/triangle each.
    useEffect(() => {
        const canvas = overlayRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawGraphOverlay({
            ctx,
            width: props.width,
            height: props.height,
            view: props.view,
            currentFrame: props.currentFrame,
            selectionBox: props.selectionBox,
        });
    }, [props.width, props.height, props.view, props.currentFrame, props.selectionBox, scheme]);

    return (
        <div
            className="block"
            style={{ position: 'relative', width: props.width, height: props.height }}
        >
            <canvas
                ref={backRef}
                width={props.width}
                height={props.height}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />
            <canvas
                ref={overlayRef}
                width={props.width}
                height={props.height}
                className="cursor-crosshair"
                style={{ position: 'absolute', top: 0, left: 0, cursor: props.cursor }}
                onMouseDown={props.onMouseDown}
                onContextMenu={props.onContextMenu}
                onDoubleClick={props.onDoubleClick}
            />
        </div>
    );
};
