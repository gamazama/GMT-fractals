/**
 * Canvas pointer + wheel dispatcher. Routes DOM events to one of the
 * per-gesture handlers in `./gestures/`.
 *
 * One useEffect attaches direct DOM listeners (not React synthetic) so
 * the layer doesn't have to cover the canvas — gestures meant for
 * Fixed-mode resize handles still pass through.
 *
 * Store-bypass during pan / middle-drag / wheel: setJulia per pointermove
 * triggers Zustand's full subscriber notification, which with dozens of
 * useEngineStore consumers is enough cascading re-renders to trip
 * React 18's max-depth guard. Gestures push center/zoom straight to
 * FluidEngine.setParams while the gesture runs and stash the pending
 * value in `pendingViewRef`; the store gets one setJulia commit on
 * pointerup (drag) or after a 100ms idle (wheel).
 */

import { useEffect } from 'react';
import { useEngineStore } from '../../store/engineStore';
import type { FluidEngine } from '../fluid/FluidEngine';
import { mods } from './modifiers';
import type { PointerState, PendingView } from './types';
import type { GestureCtx } from './gestures/types';
import { panEnter, panMove } from './gestures/pan';
import { zoomEnter, zoomMove } from './gestures/zoom';
import { createWheelHandler } from './gestures/wheel';
import { splatEnter, splatMove } from './gestures/splat';
import { pickCEnter, pickCMove } from './gestures/pickC';
import { resizeBrushEnter, resizeBrushMove } from './gestures/resizeBrush';
import { cursorHandles } from '../engineHandles';

export const useCanvasPointerHandlers = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    engineRef: React.RefObject<FluidEngine | null>,
    stateRef: React.MutableRefObject<PointerState>,
    pendingViewRef: React.MutableRefObject<PendingView | null>,
): void => {
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!stateRef.current) return;

        const ctx: GestureCtx = {
            canvas,
            engineRef,
            pendingViewRef,
            stateRef,
            handleInteractionStart,
            handleInteractionEnd,
        };

        const onDown = (e: PointerEvent) => {
            const ps = stateRef.current;
            // Shared start state — every gesture reads these in its move.
            ps.pointerId = e.pointerId;
            ps.lastX = e.clientX;
            ps.lastY = e.clientY;
            ps.lastT = performance.now();
            ps.startX = e.clientX;
            ps.startY = e.clientY;

            if (e.button === 2) return panEnter(e, ctx);
            if (e.button === 1) return zoomEnter(e, ctx);
            if (e.button === 0) {
                if (mods.c) return pickCEnter(e, ctx);
                if (mods.b) return resizeBrushEnter(e, ctx);
                return splatEnter(e, ctx);
            }
        };

        const onMove = (e: PointerEvent) => {
            const ps = stateRef.current;
            switch (ps.mode) {
                case 'idle':         return;
                case 'pick-c':       return pickCMove(e, ctx);
                case 'resize-brush': return resizeBrushMove(e, ctx);
                case 'pan-pending':
                case 'pan':          return panMove(e, ctx);
                case 'zoom':         return zoomMove(e, ctx);
                case 'splat':        return splatMove(e, ctx);
            }
        };

        const onUp = (e: PointerEvent) => {
            const ps = stateRef.current;
            if (ps.pointerId === e.pointerId) {
                try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                ps.pointerId = -1;
            }
            // Commit the live-bypassed view to the store. AutoFeaturePanel
            // readouts and Animation key-cam see the final value here.
            if (pendingViewRef.current) {
                const pending = pendingViewRef.current;
                pendingViewRef.current = null;
                useEngineStore.getState().setJulia({
                    center: pending.center,
                    centerLow: pending.centerLow,
                    zoom: pending.zoom,
                });
            }
            // Clear mode AFTER releasing capture so a late contextmenu
            // event (fires between pointerup and click-synthesis) sees
            // rightDragged.
            ps.mode = 'idle';
            // Stop emitting particles; living particles keep flying on
            // their own inertia until lifetime expires.
            cursorHandles.ref.current.dragging = false;
            handleInteractionEnd();
        };

        const wheel = createWheelHandler(ctx);

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('pointerleave', onUp);
        canvas.addEventListener('wheel', wheel.onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('pointerleave', onUp);
            canvas.removeEventListener('wheel', wheel.onWheel);
            wheel.cleanup();
        };
    }, [canvasRef, engineRef, stateRef, pendingViewRef, handleInteractionStart, handleInteractionEnd]);
};
