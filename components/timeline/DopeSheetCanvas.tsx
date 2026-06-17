import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnimationSequence } from '../../types';
import {
    DopeSheetRowLayout,
    drawDopeSheetBack,
    drawDopeSheetSelection,
    drawDopeSheetHover,
    HoverTarget,
    hoverTargetEqual,
    pickKeyframe,
    PickResult,
    PickGroupResult,
} from '../../utils/DopeSheetRenderer';

interface DopeSheetCanvasProps {
    sequence: AnimationSequence;
    rows: DopeSheetRowLayout[];
    /** Pixels per frame — equivalent to DopeSheet's frameWidth. */
    frameWidth: number;
    /** Left offset inside the parent's positioning context (== sidebarWidth). */
    left: number;
    /** Width of the keyframe area in CSS px (== totalContentWidth - sidebarWidth). */
    width: number;
    /** Stacked height of all visible rows in CSS px. */
    height: number;
    selectedKeyframeIds: string[];

    /** Event forwarding — the canvas hit-tests x/y and routes to these handlers. */
    onPickTrackKey: (e: React.MouseEvent, pick: PickResult) => void;
    onPickGroupKey: (e: React.MouseEvent, pick: PickGroupResult) => void;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    onCanvasDoubleClick: (e: React.MouseEvent, frame: number, rowTrackId: string | null) => void;
    onCanvasContextMenu: (e: React.MouseEvent, frame: number) => void;
}

/**
 * Single absolutely-positioned canvas overlay that paints all keyframe diamonds
 * for visible track and group rows; events route through `pickKeyframe()` in
 * `utils/DopeSheetRenderer.ts`. Sized to (totalContentWidth - sidebarWidth) ×
 * stacked-rows-height — the parent's overflow:auto handles panning so panX is
 * always 0 here. Back + selection + hover paints batch into a single useEffect;
 * cache hits keep the back composite to N drawImage calls (N = visible rows).
 */
export const DopeSheetCanvas: React.FC<DopeSheetCanvasProps> = ({
    sequence,
    rows,
    frameWidth,
    left,
    width,
    height,
    selectedKeyframeIds,
    onPickTrackKey,
    onPickGroupKey,
    onCanvasMouseDown,
    onCanvasDoubleClick,
    onCanvasContextMenu,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /** Currently-hovered diamond, or null when the cursor isn't over one. Mouse motion
     *  within the same diamond doesn't churn this state (see handleMouseMove). */
    const [hover, setHover] = useState<HoverTarget | null>(null);

    const tracks = sequence.tracks;

    // Combined paint: cached back layer + selection overlay + hover overlay.
    // Hover changes are frequent (mousemove) but the back layer cache means each
    // repaint is just N drawImage calls + the selection/hover passes, both small.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawDopeSheetBack({
            ctx,
            canvasWidth: width,
            canvasHeight: height,
            rows,
            tracks,
            scaleX: frameWidth,
            panX: 0,
        });
        drawDopeSheetSelection({
            ctx,
            canvasWidth: width,
            canvasHeight: height,
            rows,
            tracks,
            scaleX: frameWidth,
            panX: 0,
            selectedKeyframeIds,
        });
        drawDopeSheetHover({
            ctx,
            rows,
            tracks,
            scaleX: frameWidth,
            panX: 0,
            hover,
        });
    }, [width, height, rows, tracks, frameWidth, selectedKeyframeIds, hover]);

    const eventCoords = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const coords = eventCoords(e);
        if (!coords) return;
        const pick = pickKeyframe({ rows, tracks, scaleX: frameWidth, panX: 0, x: coords.x, y: coords.y });
        const target: HoverTarget | null = !pick
            ? null
            : pick.kind === 'track'
                ? { kind: 'track', trackId: pick.trackId, keyId: pick.keyId }
                : { kind: 'group', groupName: pick.groupName, frame: pick.frame };
        // Only flip state when the hovered diamond actually changes — mouse motion
        // within one diamond is free; entering / leaving a diamond repaints once.
        setHover(prev => hoverTargetEqual(prev, target) ? prev : target);
    }, [eventCoords, rows, tracks, frameWidth]);

    const handleMouseLeave = useCallback(() => setHover(null), []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const coords = eventCoords(e);
        if (!coords) return;
        const pick = pickKeyframe({ rows, tracks, scaleX: frameWidth, panX: 0, x: coords.x, y: coords.y });
        if (pick) {
            if (pick.kind === 'track') onPickTrackKey(e, pick);
            else onPickGroupKey(e, pick);
            // The pick handlers (handleKeyMouseDown / handleGroupKeyMouseDown) already
            // stopPropagation, but explicitly stop here too in case future refactors
            // change that contract.
            e.stopPropagation();
            return;
        }
        // Background click → start marquee. Stop bubble so contentRef.onMouseDown doesn't
        // fire the same handler a second time (contentRef wraps the canvas and uses the
        // same handleContentMouseDown for non-canvas areas like the ruler).
        onCanvasMouseDown(e);
        e.stopPropagation();
    }, [eventCoords, rows, tracks, frameWidth, onPickTrackKey, onPickGroupKey, onCanvasMouseDown]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const coords = eventCoords(e);
        if (!coords) return;
        const pick = pickKeyframe({ rows, tracks, scaleX: frameWidth, panX: 0, x: coords.x, y: coords.y });
        if (pick) {
            // Right-click on a keyframe — fans through the existing onMouseDown handler which
            // already opens the keyframe context menu for button === 2.
            if (pick.kind === 'track') onPickTrackKey(e, pick);
            else onPickGroupKey(e, pick);
            e.preventDefault();
            return;
        }
        // Background right-click — frame derived from x, no rowTrackId needed.
        const frame = Math.max(0, Math.round(coords.x / frameWidth));
        onCanvasContextMenu(e, frame);
    }, [eventCoords, rows, tracks, frameWidth, onPickTrackKey, onPickGroupKey, onCanvasContextMenu]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        const coords = eventCoords(e);
        if (!coords) return;
        // Skip the add when the cursor is on an existing diamond — the previous DOM
        // behaviour blindly bubbled into onAddKey and produced a duplicate Linear key
        // stacked on top of the original (visible as "Bezier circle → Linear diamond").
        const pickUnder = pickKeyframe({ rows, tracks, scaleX: frameWidth, panX: 0, x: coords.x, y: coords.y });
        if (pickUnder) return;
        // Locate the row under the cursor to scope the new key to a track. Group rows
        // don't accept double-click adds (matches the previous DOM behaviour).
        let rowTrackId: string | null = null;
        for (const row of rows) {
            if (coords.y < row.y || coords.y >= row.y + row.height) continue;
            if (row.kind === 'track') rowTrackId = row.id;
            break;
        }
        const frame = Math.max(0, Math.round(coords.x / frameWidth));
        onCanvasDoubleClick(e, frame, rowTrackId);
    }, [eventCoords, rows, tracks, frameWidth, onCanvasDoubleClick]);

    return (
        <canvas
            ref={canvasRef}
            width={Math.max(1, width)}
            height={Math.max(1, height)}
            style={{
                position: 'absolute',
                top: 0,
                left,
                width,
                height,
                display: 'block',     // canvas defaults to inline → baseline gap; force block to avoid layout drift.
                zIndex: 0,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            data-help-id="anim.keyframes"
        />
    );
};
