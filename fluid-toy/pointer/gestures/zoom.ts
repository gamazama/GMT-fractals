/**
 * Middle-drag zoom — exponential on vertical motion, anchored at the
 * click-point. Reference convention: drag DOWN zooms OUT, UP zooms IN.
 *
 * Anchor is captured as a double-double (hi, lo) so the (u·2-1)·aspect·zoom
 * offset — small at deep zoom — doesn't lose its lo bits when summed
 * with the centre.
 */

import { useEngineStore } from '../../../store/engineStore';
import { MAX_ZOOM, MIDDLE_DRAG_ZOOM_SENSITIVITY } from '../../constants';
import { ddAddF64 } from '../../deepZoom/dd';
import { precisionMultiplier } from '../modifiers';
import { effectiveMinZoom } from './zoomBounds';
import type { GestureCtx } from './types';

export const zoomEnter = (e: PointerEvent, ctx: GestureCtx): void => {
    // preventDefault suppresses the browser's auto-scroll cursor.
    e.preventDefault();
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const ps = ctx.stateRef.current;
    const s = useEngineStore.getState();
    const currCenter = s.julia?.center ?? { x: 0, y: 0 };
    const currZoom = s.julia?.zoom ?? 1.5;
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    const aspect = rect.width / rect.height;

    ps.mode = 'zoom';
    ps.startZoom = currZoom;
    ps.zoomAnchorU = u;
    ps.zoomAnchorV = v;

    // Anchor = currCenter + (u·2-1)·aspect·currZoom in DD precision.
    const cxLow = s.julia?.centerLow?.x ?? 0;
    const cyLow = s.julia?.centerLow?.y ?? 0;
    const dx = (u * 2 - 1) * aspect * currZoom;
    const dy = (v * 2 - 1) * currZoom;
    const ax = ddAddF64(currCenter.x, cxLow, dx);
    const ay = ddAddF64(currCenter.y, cyLow, dy);
    ps.zoomAnchorX    = ax[0];
    ps.zoomAnchorXLow = ax[1];
    ps.zoomAnchorY    = ay[0];
    ps.zoomAnchorYLow = ay[1];

    ctx.canvas.setPointerCapture(e.pointerId);
    ctx.handleInteractionStart('camera');
};

export const zoomMove = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const mul = precisionMultiplier(e.shiftKey, e.altKey);
    const dyPx = e.clientY - ps.startY;
    const zoomFactor = Math.exp(dyPx * MIDDLE_DRAG_ZOOM_SENSITIVITY * mul);
    const newZoom = Math.max(effectiveMinZoom(), Math.min(MAX_ZOOM, ps.startZoom * zoomFactor));
    const aspect = rect.width / rect.height;

    // newCenter = anchor − (u·2-1)·aspect·newZoom, computed as DD so
    // the small newZoom term (deep zoom) doesn't cancel against the
    // anchor's f64 mantissa.
    const dx = -(ps.zoomAnchorU * 2 - 1) * aspect * newZoom;
    const dy = -(ps.zoomAnchorV * 2 - 1) * newZoom;
    const [newCx, newCxLow] = ddAddF64(ps.zoomAnchorX, ps.zoomAnchorXLow, dx);
    const [newCy, newCyLow] = ddAddF64(ps.zoomAnchorY, ps.zoomAnchorYLow, dy);

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
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
};
