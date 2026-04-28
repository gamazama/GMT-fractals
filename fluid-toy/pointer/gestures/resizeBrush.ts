/**
 * B + left-drag — live brush resize. Horizontal sweep is log-scaled so
 * a uniform drag covers the full 0.003..0.4 size range naturally.
 * Vertical motion ignored.
 */

import { useEngineStore } from '../../../store/engineStore';
import { precisionMultiplier } from '../modifiers';
import type { GestureCtx } from './types';

export const resizeBrushEnter = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const s = useEngineStore.getState();
    ps.mode = 'resize-brush';
    ps.startBrushSize = s.brush?.size ?? 0.15;
    ctx.canvas.setPointerCapture(e.pointerId);
    ctx.handleInteractionStart('param');
};

export const resizeBrushMove = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    const s = useEngineStore.getState();
    const mul = precisionMultiplier(e.shiftKey, e.altKey);
    const dxPx = e.clientX - ps.startX;
    // 300 px sweep ≈ ×e (~2.7×) size change at default precision.
    const factor = Math.exp(dxPx * 0.0033 * mul);
    const next = Math.max(0.003, Math.min(0.4, ps.startBrushSize * factor));
    s.setBrush({ size: next });
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
};
