/**
 * C + left-drag — drag the Julia constant `c` directly on canvas. Pixel
 * delta from drag-start maps through zoom × aspect to fractal space, so
 * the same drag gives a bigger c-delta when zoomed out.
 */

import { useEngineStore } from '../../../store/engineStore';
import { precisionMultiplier } from '../modifiers';
import type { GestureCtx } from './types';

export const pickCEnter = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const s = useEngineStore.getState();
    ps.mode = 'pick-c';
    ps.startCx = s.julia?.juliaC?.x ?? 0;
    ps.startCy = s.julia?.juliaC?.y ?? 0;
    ctx.canvas.setPointerCapture(e.pointerId);
    ctx.handleInteractionStart('param');
};

export const pickCMove = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const s = useEngineStore.getState();
    const zoom = s.julia?.zoom ?? 1.5;
    const aspect = rect.width / rect.height;
    const mul = precisionMultiplier(e.shiftKey, e.altKey);
    const dxPx = e.clientX - ps.startX;
    const dyPx = e.clientY - ps.startY;
    const dfx =  (dxPx / rect.width)  * 2 * aspect * zoom * mul;
    const dfy = -(dyPx / rect.height) * 2 * zoom * mul;
    s.setJulia({ juliaC: { x: ps.startCx + dfx, y: ps.startCy + dfy } });
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
};
