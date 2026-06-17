/**
 * Default left-drag — paints into the dye/velocity field via the brush
 * runtime. The press-down emits a single splat at the click point so a
 * tap always leaves a mark; subsequent moves drive the streaming
 * emitter via arc-length spacing.
 */

import { brushHandles, cursorHandles } from '../../engineHandles';
import { emitStrokeSplat, emitPressSplat, beginStroke } from '../../brush';
import { readBrushParams } from '../../brush/readParams';
import type { GestureCtx } from './types';

export const splatEnter = (e: PointerEvent, ctx: GestureCtx): void => {
    const ps = ctx.stateRef.current;
    ps.mode = 'splat';
    ctx.handleInteractionStart('param');
    beginStroke(brushHandles.ref.current.runtime);
    cursorHandles.ref.current.dragging = true;

    // Drop a splat at the click point so a single click always leaves
    // a mark — matches reference "mark the spot" polish.
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || !ctx.engineRef.current) return;
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    cursorHandles.ref.current.uv = { u, v };
    cursorHandles.ref.current.velUv = null;
    emitPressSplat(brushHandles.ref.current.runtime, {
        u, v, dvx: 0, dvy: 0,
        params: readBrushParams(),
        engine: ctx.engineRef.current,
        wallClockMs: performance.now(),
    });
};

export const splatMove = (e: PointerEvent, ctx: GestureCtx): void => {
    const engine = ctx.engineRef.current;
    if (!engine) return;
    const ps = ctx.stateRef.current;
    const rect = ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const now = performance.now();
    const dt = Math.max(1e-3, (now - ps.lastT) / 1000);
    const dxPx = e.clientX - ps.lastX;
    const dyPx = e.clientY - ps.lastY;
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    const vx =  (dxPx / rect.width) / dt;
    const vy = -(dyPx / rect.height) / dt;

    // Arc-length accumulator drives the spacing gate inside emitStrokeSplat.
    const dUv = Math.hypot(dxPx / rect.width, dyPx / rect.height);
    brushHandles.ref.current.runtime.distSinceSplat += dUv;

    // Shared cursor state — RAF particle emitter reads from here.
    cursorHandles.ref.current.uv = { u, v };
    cursorHandles.ref.current.velUv = { vx, vy };

    emitStrokeSplat(brushHandles.ref.current.runtime, {
        u, v, dvx: vx, dvy: vy,
        params: readBrushParams(),
        engine,
        wallClockMs: now,
    });

    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
    ps.lastT = now;
};
