/**
 * Cursor-anchored wheel zoom. Wheel events have no "up" — we use a
 * 100ms idle commit timer to push the in-flight pending view into the
 * store. Multiple ticks compose on the in-flight pendingViewRef so a
 * burst of scrolls accumulates cleanly without per-tick store churn.
 *
 * `createWheelHandler` is a factory because it owns the commit timer's
 * closure state; the dispatcher attaches the returned handler.
 */

import { useEngineStore } from '../../../store/engineStore';
import { MAX_ZOOM, WHEEL_ZOOM_SENSITIVITY } from '../../constants';
import { ddAddF64 } from '../../deepZoom/dd';
import { precisionMultiplier } from '../modifiers';
import { effectiveMinZoom } from './zoomBounds';
import type { GestureCtx } from './types';

export const createWheelHandler = (
    ctx: GestureCtx,
): { onWheel: (e: WheelEvent) => void; cleanup: () => void } => {
    let commitTimer: number | null = null;

    const onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const rect = ctx.canvas.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;

        // First wheel tick of a burst seeds from the store; subsequent
        // ticks compose on the in-flight pending view.
        const seed = ctx.pendingViewRef.current ?? (() => {
            const s = useEngineStore.getState();
            return {
                center: s.julia?.center ?? { x: 0, y: 0 },
                centerLow: s.julia?.centerLow ?? { x: 0, y: 0 },
                zoom: s.julia?.zoom ?? 1.5,
            };
        })();
        const currCenter = seed.center;
        const currCenterLow = seed.centerLow;
        const currZoom = seed.zoom;
        const mul = precisionMultiplier(e.shiftKey, e.altKey);
        const zoomFactor = Math.pow(0.9, -e.deltaY * WHEEL_ZOOM_SENSITIVITY * mul);
        const u = (e.clientX - rect.left) / rect.width;
        const v = 1 - (e.clientY - rect.top) / rect.height;
        const aspect = rect.width / rect.height;
        const newZoom = Math.max(effectiveMinZoom(), Math.min(MAX_ZOOM, currZoom * zoomFactor));

        // World point under cursor stays fixed: newCenter =
        // currCenter + (u·2-1)·aspect·(currZoom − newZoom). DD-add so
        // the (currZoom − newZoom) term — tiny at deep zoom — doesn't
        // cancel against currCenter's mantissa.
        const dzoom = currZoom - newZoom;
        const dx = (u * 2 - 1) * aspect * dzoom;
        const dy = (v * 2 - 1) * dzoom;
        const [newCx, newCxLow] = ddAddF64(currCenter.x, currCenterLow.x, dx);
        const [newCy, newCyLow] = ddAddF64(currCenter.y, currCenterLow.y, dy);

        ctx.pendingViewRef.current = {
            center: { x: newCx, y: newCy },
            centerLow: { x: newCxLow, y: newCyLow },
            zoom: newZoom,
        };
        ctx.engineRef.current?.setParams({
            center: [newCx, newCy],
            centerLow: [newCxLow, newCyLow],
            zoom: newZoom,
        });

        if (commitTimer !== null) window.clearTimeout(commitTimer);
        commitTimer = window.setTimeout(() => {
            commitTimer = null;
            if (!ctx.pendingViewRef.current) return;
            const pending = ctx.pendingViewRef.current;
            ctx.pendingViewRef.current = null;
            useEngineStore.getState().setJulia({
                center: pending.center,
                centerLow: pending.centerLow,
                zoom: pending.zoom,
            });
        }, 100);
    };

    const cleanup = () => {
        if (commitTimer !== null) window.clearTimeout(commitTimer);
    };

    return { onWheel, cleanup };
};
