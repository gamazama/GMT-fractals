
import React, { useState, useEffect, useMemo } from 'react';
import { useFractalStore, getCanvasPhysicalPixelSize } from '../store/fractalStore';
import { getProxy } from '../engine/worker/WorkerProxy';

/**
 * Preview Region cursor tracker. When interactionMode === 'selecting_preview':
 *   - tracks the cursor over the canvas container and emits `ghostRect` in normalized UV
 *     (origin bottom-left, matching renderRegion).
 *   - ghost rect size = `canvasPxW / outputW × canvasPxH / outputH`, so the slice it
 *     marks is exactly what fills the canvas at 1:1 export-pixel density.
 *   - clicking the canvas captures the ghost rect and fires `PREVIEW_REGION_SET`
 *     to the worker, which applies UV-remap uniforms and a sample cap without
 *     engaging the bucket-render lock — so the user can keep tweaking parameters
 *     while the preview re-renders live.
 *
 * See docs/44_Preview_Region_Plan.md.
 */
export const usePreviewTarget = (containerRef: React.RefObject<HTMLElement>) => {
    const interactionMode = useFractalStore(s => s.interactionMode);
    const outputWidth = useFractalStore(s => s.outputWidth);
    const outputHeight = useFractalStore(s => s.outputHeight);
    // Subscribe to the inputs of getCanvasPhysicalPixelSize so this hook re-runs when any
    // of them change. The helper resolves the Fixed-mode ResizeObserver lag by deriving
    // from fixedResolution * dpr directly.
    const resolutionMode = useFractalStore(s => s.resolutionMode);
    const fixedResolution = useFractalStore(s => s.fixedResolution);
    const dpr = useFractalStore(s => s.dpr);
    const canvasPixelSize = useFractalStore(s => s.canvasPixelSize);
    const setPreviewRegion = useFractalStore(s => s.setPreviewRegion);
    const setInteractionMode = useFractalStore(s => s.setInteractionMode);

    const isPicking = interactionMode === 'selecting_preview';

    const [cursorNorm, setCursorNorm] = useState<{ x: number; y: number } | null>(null);

    // Ghost rect UV — sized so one canvas physical pixel equals one output pixel after blit.
    // Uses getCanvasPhysicalPixelSize (not canvasPixelSize directly) so Fixed-mode changes
    // take effect immediately rather than lagging behind the WorkerDisplay ResizeObserver.
    const ghostRect = useMemo(() => {
        if (!isPicking || !cursorNorm) return null;
        const [cpxW, cpxH] = getCanvasPhysicalPixelSize(useFractalStore.getState());
        const rectW = Math.min(1, cpxW / Math.max(1, outputWidth));
        const rectH = Math.min(1, cpxH / Math.max(1, outputHeight));
        let minX = cursorNorm.x - rectW / 2;
        let minY = cursorNorm.y - rectH / 2;
        minX = Math.max(0, Math.min(1 - rectW, minX));
        minY = Math.max(0, Math.min(1 - rectH, minY));
        return { minX, minY, maxX: minX + rectW, maxY: minY + rectH };
        // Dependencies re-trigger re-computation when any canvas-size input changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPicking, cursorNorm, outputWidth, outputHeight, resolutionMode, fixedResolution, dpr, canvasPixelSize]);

    useEffect(() => {
        if (!isPicking || !containerRef.current) return;
        const el = containerRef.current;

        const updateCursor = (clientX: number, clientY: number) => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            const nx = (clientX - rect.left) / rect.width;
            const ny = 1 - (clientY - rect.top) / rect.height; // origin bottom-left to match renderRegion
            setCursorNorm({
                x: Math.max(0, Math.min(1, nx)),
                y: Math.max(0, Math.min(1, ny)),
            });
        };

        const onMove = (e: MouseEvent) => updateCursor(e.clientX, e.clientY);
        const onLeave = () => setCursorNorm(null);
        const onDown = (e: MouseEvent) => {
            if (!(e.target instanceof Node) || !el.contains(e.target as Node)) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = el.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = 1 - (e.clientY - rect.top) / rect.height;
            // Rect size from physical canvas pixels (same as ghostRect logic).
            const st = useFractalStore.getState();
            const [cpxW, cpxH] = getCanvasPhysicalPixelSize(st);
            const rectW = Math.min(1, cpxW / Math.max(1, outputWidth));
            const rectH = Math.min(1, cpxH / Math.max(1, outputHeight));
            const minX = Math.max(0, Math.min(1 - rectW, nx - rectW / 2));
            const minY = Math.max(0, Math.min(1 - rectH, ny - rectH / 2));
            const region = { minX, minY, maxX: minX + rectW, maxY: minY + rectH };

            setPreviewRegion(region);
            getProxy().setPreviewRegion(region, outputWidth, outputHeight, st.samplesPerBucket);
            // Leave picking mode immediately — one click, one preview. To retarget, the
            // user toggles Preview Region on again (which also exits to full viewport).
            setInteractionMode('none');
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setInteractionMode('none');
            }
        };

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('mouseleave', onLeave);
            el.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [isPicking, containerRef, outputWidth, outputHeight, setPreviewRegion, setInteractionMode]);

    return { isPicking, ghostRect };
};
