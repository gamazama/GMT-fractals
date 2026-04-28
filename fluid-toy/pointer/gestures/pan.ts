/**
 * Right-drag pan. Pan-pending → pan transition fires after the cursor
 * crosses PAN_DRAG_THRESHOLD_PX so a press-release without travel still
 * opens the context menu.
 *
 * Centre is captured as a double-double (hi, lo) at pointerdown so pan
 * deltas at deep zoom — where each pixel = sub-1e-16 of the centre —
 * accumulate via Dekker two-sum without f64 quantisation. The lo word
 * survives all the way through the worker rebuild via the centerLow
 * slice param.
 */

import { useEngineStore } from '../../../store/engineStore';
import { PAN_DRAG_THRESHOLD_PX } from '../../constants';
import { ddAddF64 } from '../../deepZoom/dd';
import { precisionMultiplier } from '../modifiers';
import type { GestureCtx } from './types';

export const panEnter = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const s = useEngineStore.getState();
    ps.mode = 'pan-pending';
    ps.startCx = s.julia?.center?.x ?? 0;
    ps.startCy = s.julia?.center?.y ?? 0;
    ps.startCxLow = s.julia?.centerLow?.x ?? 0;
    ps.startCyLow = s.julia?.centerLow?.y ?? 0;
    ps.rightDragged = false;
    ctx.canvas.setPointerCapture(e.pointerId);
    ctx.handleInteractionStart('camera');
};

export const panMove = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    // Upgrade pan-pending → pan once travel exceeds threshold.
    if (ps.mode === 'pan-pending') {
        const d = Math.hypot(e.clientX - ps.startX, e.clientY - ps.startY);
        if (d <= PAN_DRAG_THRESHOLD_PX) return;
        ps.mode = 'pan';
        ps.rightDragged = true;
    }

    // Grab-and-drag: world-space point under cursor at start stays
    // under cursor.
    const s = useEngineStore.getState();
    const zoom = s.julia?.zoom ?? 1.5;
    const aspect = rect.width / rect.height;
    const mul = precisionMultiplier(e.shiftKey, e.altKey);
    const dxPx = e.clientX - ps.startX;
    const dyPx = e.clientY - ps.startY;
    const dcx = -(dxPx / rect.width) * 2 * aspect * zoom * mul;
    const dcy =  (dyPx / rect.height) * 2 * zoom * mul;
    // DD-add the pan delta into the captured (hi, lo) start pair. Each
    // delta might be smaller than f64 ulp at the start centre's
    // magnitude — two-sum captures the residual in the lo word.
    const [newCx, newCxLow] = ddAddF64(ps.startCx, ps.startCxLow, dcx);
    const [newCy, newCyLow] = ddAddF64(ps.startCy, ps.startCyLow, dcy);

    ctx.pendingViewRef.current = {
        center: { x: newCx, y: newCy },
        centerLow: { x: newCxLow, y: newCyLow },
        zoom,
    };
    ctx.engineRef.current?.setParams({
        center: [newCx, newCy],
        centerLow: [newCxLow, newCyLow],
    });
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
};
