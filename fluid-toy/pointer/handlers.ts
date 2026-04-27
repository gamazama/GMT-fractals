/**
 * Canvas pointer + wheel gesture handlers.
 *
 * One useEffect attaches direct DOM listeners (not React synthetic) so
 * the layer doesn't have to cover the canvas — gestures meant for
 * Fixed-mode resize handles still pass through.
 *
 * Store-bypass during pan / middle-drag / wheel: setJulia per pointermove
 * triggers Zustand's full subscriber notification, which with dozens of
 * useEngineStore consumers is enough cascading re-renders to trip
 * React 18's max-depth guard. We push center/zoom straight to
 * FluidEngine.setParams while the gesture runs and stash the pending
 * value in `pendingViewRef`; the store gets one setJulia commit on
 * pointerup (drag) or after a 100 ms idle (wheel).
 */

import { useEffect } from 'react';
import { useEngineStore } from '../../store/engineStore';
import type { FluidEngine } from '../fluid/FluidEngine';
import {
    MIN_ZOOM,
    MAX_ZOOM,
    PAN_DRAG_THRESHOLD_PX,
    WHEEL_ZOOM_SENSITIVITY,
    MIDDLE_DRAG_ZOOM_SENSITIVITY,
} from '../constants';
import { brushHandles, cursorHandles } from '../engineHandles';
import { emitStrokeSplat, emitPressSplat, beginStroke } from '../brush';
import { readBrushParams } from '../brush/readParams';
import { mods, precisionMultiplier } from './modifiers';
import type { PointerState, PendingView } from './types';

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
        const ps0 = stateRef.current;
        if (!ps0) return;

        const onDown = (e: PointerEvent) => {
            const ps = stateRef.current!;
            ps.pointerId = e.pointerId;
            ps.lastX = e.clientX; ps.lastY = e.clientY;
            ps.lastT = performance.now();
            ps.startX = e.clientX; ps.startY = e.clientY;

            if (e.button === 2) {
                // Right-press — start a pan-pending; upgrade to pan on travel.
                const s = useEngineStore.getState();
                ps.mode = 'pan-pending';
                ps.startCx = s.julia?.center?.x ?? 0;
                ps.startCy = s.julia?.center?.y ?? 0;
                ps.rightDragged = false;
                canvas.setPointerCapture(e.pointerId);
                handleInteractionStart('camera');
                return;
            }

            if (e.button === 1) {
                // Middle-press — smooth vertical-drag zoom anchored at the
                // click-point. preventDefault suppresses the browser's
                // auto-scroll cursor that would otherwise appear on
                // middle-down.
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) return;
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
                ps.zoomAnchorX = currCenter.x + (u * 2 - 1) * aspect * currZoom;
                ps.zoomAnchorY = currCenter.y + (v * 2 - 1) * currZoom;
                canvas.setPointerCapture(e.pointerId);
                handleInteractionStart('camera');
                return;
            }

            if (e.button === 0) {
                canvas.setPointerCapture(e.pointerId);
                const s = useEngineStore.getState();
                // Pick-c: hold C + left-drag to drag Julia c directly on
                // canvas. Captures the starting c so the drag delta is
                // absolute regardless of subsequent zoom changes.
                if (mods.c) {
                    ps.mode = 'pick-c';
                    ps.startCx = s.julia?.juliaC?.x ?? 0;
                    ps.startCy = s.julia?.juliaC?.y ?? 0;
                    handleInteractionStart('param');
                    return;
                }
                // Resize-brush: hold B + left-drag horizontally to scale
                // the brush. Log-scaled so feel is uniform across the
                // 0.003..0.4 size range.
                if (mods.b) {
                    ps.mode = 'resize-brush';
                    ps.startBrushSize = s.brush?.size ?? 0.15;
                    handleInteractionStart('param');
                    return;
                }
                // Default left-drag: splat.
                ps.mode = 'splat';
                handleInteractionStart('param');
                beginStroke(brushHandles.ref.current.runtime);
                cursorHandles.ref.current.dragging = true;
                // Drop a splat at the click point so a single click always
                // leaves a mark — matches reference "mark the spot" polish.
                const rect = canvas.getBoundingClientRect();
                if (rect.width >= 1 && rect.height >= 1 && engineRef.current) {
                    const u = (e.clientX - rect.left) / rect.width;
                    const v = 1 - (e.clientY - rect.top) / rect.height;
                    cursorHandles.ref.current.uv = { u, v };
                    cursorHandles.ref.current.velUv = null;
                    emitPressSplat(brushHandles.ref.current.runtime, {
                        u, v, dvx: 0, dvy: 0,
                        params: readBrushParams(),
                        engine: engineRef.current,
                        wallClockMs: performance.now(),
                    });
                }
                return;
            }
        };

        const onMove = (e: PointerEvent) => {
            const ps = stateRef.current!;
            if (ps.mode === 'idle') return;

            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;

            // C+drag — drag Julia c directly on the canvas. Pixel delta
            // from drag start maps through zoom × aspect to fractal
            // space, so the same drag gives a bigger c-delta when zoomed
            // out.
            if (ps.mode === 'pick-c') {
                const s = useEngineStore.getState();
                const zoom = s.julia?.zoom ?? 1.5;
                const aspect = rect.width / rect.height;
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dxPx = e.clientX - ps.startX;
                const dyPx = e.clientY - ps.startY;
                const dfx =  (dxPx / rect.width)  * 2 * aspect * zoom * mul;
                const dfy = -(dyPx / rect.height) * 2 * zoom * mul;
                s.setJulia({ juliaC: { x: ps.startCx + dfx, y: ps.startCy + dfy } });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            // B+drag — resize the brush live. Horizontal drag scales
            // log-space so a uniform swipe covers the full 0.003..0.4
            // size range naturally. Vertical motion ignored.
            if (ps.mode === 'resize-brush') {
                const s = useEngineStore.getState();
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dxPx = e.clientX - ps.startX;
                // 300 px sweep ≈ ×e (~2.7×) size change at default precision.
                const factor = Math.exp(dxPx * 0.0033 * mul);
                const next = Math.max(0.003, Math.min(0.4, ps.startBrushSize * factor));
                s.setBrush({ size: next });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            // Right-drag pan: upgrade pan-pending → pan once cursor travel
            // exceeds threshold. Below threshold, press-release still opens
            // the context menu.
            if (ps.mode === 'pan-pending') {
                const d = Math.hypot(e.clientX - ps.startX, e.clientY - ps.startY);
                if (d > PAN_DRAG_THRESHOLD_PX) {
                    ps.mode = 'pan';
                    ps.rightDragged = true;
                } else {
                    return;
                }
            }

            if (ps.mode === 'pan') {
                // Grab-and-drag: world-space point under cursor at start
                // stays under cursor.
                const s = useEngineStore.getState();
                const zoom = s.julia?.zoom ?? 1.5;
                const aspect = rect.width / rect.height;
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dxPx = e.clientX - ps.startX;
                const dyPx = e.clientY - ps.startY;
                const dcx = -(dxPx / rect.width) * 2 * aspect * zoom * mul;
                const dcy = (dyPx / rect.height) * 2 * zoom * mul;
                const newCx = ps.startCx + dcx;
                const newCy = ps.startCy + dcy;
                pendingViewRef.current = { center: { x: newCx, y: newCy }, zoom };
                engineRef.current?.setParams({ center: [newCx, newCy] });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            if (ps.mode === 'zoom') {
                // Middle-drag: exponential zoom on vertical motion; pivots
                // around the click-point (anchor captured in onDown).
                // Reference convention: drag DOWN (dyPx positive) zooms
                // OUT; drag UP zooms IN. zoomFactor uses exp(+dyPx) so
                // those signs match.
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dyPx = e.clientY - ps.startY;
                const zoomFactor = Math.exp(dyPx * MIDDLE_DRAG_ZOOM_SENSITIVITY * mul);
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ps.startZoom * zoomFactor));
                const aspect = rect.width / rect.height;
                const newCx = ps.zoomAnchorX - (ps.zoomAnchorU * 2 - 1) * aspect * newZoom;
                const newCy = ps.zoomAnchorY - (ps.zoomAnchorV * 2 - 1) * newZoom;
                pendingViewRef.current = { center: { x: newCx, y: newCy }, zoom: newZoom };
                engineRef.current?.setParams({ center: [newCx, newCy], zoom: newZoom });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            if (ps.mode === 'splat') {
                const engine = engineRef.current;
                if (!engine) return;
                const now = performance.now();
                const dt = Math.max(1e-3, (now - ps.lastT) / 1000);
                const dxPx = e.clientX - ps.lastX;
                const dyPx = e.clientY - ps.lastY;

                const u = (e.clientX - rect.left) / rect.width;
                const v = 1 - (e.clientY - rect.top) / rect.height;
                const vx = (dxPx / rect.width) / dt;
                const vy = -(dyPx / rect.height) / dt;

                // Arc-length accumulator drives the spacing gate inside
                // emitStrokeSplat.
                const dUv = Math.hypot(dxPx / rect.width, dyPx / rect.height);
                brushHandles.ref.current.runtime.distSinceSplat += dUv;

                // Shared cursor state — the RAF loop's particle emitter
                // reads position + velocity from here each frame.
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
                return;
            }
        };

        const onUp = (e: PointerEvent) => {
            const ps = stateRef.current!;
            if (ps.pointerId === e.pointerId) {
                try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                ps.pointerId = -1;
            }
            // Commit the live-bypassed view to the store now that the
            // gesture has ended. AutoFeaturePanel readouts and Animation
            // key-cam see the final value.
            if (pendingViewRef.current) {
                const pending = pendingViewRef.current;
                pendingViewRef.current = null;
                useEngineStore.getState().setJulia({
                    center: pending.center,
                    zoom: pending.zoom,
                });
            }
            // Clear mode AFTER releasing so a late contextmenu event (fires
            // between pointerup and its click-synthesis) sees rightDragged.
            ps.mode = 'idle';
            // Stop emitting particles on release; living particles keep
            // flying on their own inertia until their lifetime expires.
            cursorHandles.ref.current.dragging = false;
            handleInteractionEnd();
        };

        // Wheel zoom, cursor-anchored. { passive: false } so we can
        // preventDefault. Wheel has no "up" event so we use a 100 ms
        // idle timer to commit the pending view to the store.
        let wheelCommitTimer: number | null = null;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            // First wheel tick of a burst seeds from the current store
            // value; subsequent ticks compose on the in-flight pending
            // value so multiple ticks accumulate cleanly.
            const seed = pendingViewRef.current ?? (() => {
                const s = useEngineStore.getState();
                return {
                    center: s.julia?.center ?? { x: 0, y: 0 },
                    zoom: s.julia?.zoom ?? 1.5,
                };
            })();
            const currCenter = seed.center;
            const currZoom = seed.zoom;
            const mul = precisionMultiplier(e.shiftKey, e.altKey);
            const zoomFactor = Math.pow(0.9, -e.deltaY * WHEEL_ZOOM_SENSITIVITY * mul);
            const u = (e.clientX - rect.left) / rect.width;
            const v = 1 - (e.clientY - rect.top) / rect.height;
            const aspect = rect.width / rect.height;
            // World point under cursor BEFORE zoom — keep it fixed after.
            const fx = currCenter.x + (u * 2 - 1) * aspect * currZoom;
            const fy = currCenter.y + (v * 2 - 1) * currZoom;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currZoom * zoomFactor));
            const newCx = fx - (u * 2 - 1) * aspect * newZoom;
            const newCy = fy - (v * 2 - 1) * newZoom;
            pendingViewRef.current = { center: { x: newCx, y: newCy }, zoom: newZoom };
            engineRef.current?.setParams({ center: [newCx, newCy], zoom: newZoom });
            if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer);
            wheelCommitTimer = window.setTimeout(() => {
                wheelCommitTimer = null;
                if (!pendingViewRef.current) return;
                const pending = pendingViewRef.current;
                pendingViewRef.current = null;
                useEngineStore.getState().setJulia({
                    center: pending.center,
                    zoom: pending.zoom,
                });
            }, 100);
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('pointerleave', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('pointerleave', onUp);
            canvas.removeEventListener('wheel', onWheel);
            if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer);
        };
    }, [canvasRef, engineRef, stateRef, pendingViewRef, handleInteractionStart, handleInteractionEnd]);
};
