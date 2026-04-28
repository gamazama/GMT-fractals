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
    MIN_ZOOM_DEEP,
    MAX_ZOOM,
    PAN_DRAG_THRESHOLD_PX,
    WHEEL_ZOOM_SENSITIVITY,
    MIDDLE_DRAG_ZOOM_SENSITIVITY,
} from '../constants';

/** Effective minimum zoom — drops to MIN_ZOOM_DEEP (1e-300) when the
 *  user has the deep-zoom feature enabled, otherwise the standard
 *  f32-friendly bound. Read at gesture time, not subscribed (no
 *  re-render cost). The slider's hardMin stays at MIN_ZOOM regardless;
 *  past it the slider freezes and only mouse can drive deeper. */
const effectiveMinZoom = (): number => {
    const dz = useEngineStore.getState().deepZoom;
    return (dz && dz.enabled) ? MIN_ZOOM_DEEP : MIN_ZOOM;
};
import { brushHandles, cursorHandles } from '../engineHandles';
import { emitStrokeSplat, emitPressSplat, beginStroke } from '../brush';
import { readBrushParams } from '../brush/readParams';
import { mods, precisionMultiplier } from './modifiers';
import type { PointerState, PendingView } from './types';
import { ddAddF64 } from '../deepZoom/dd';

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
                // Capture the centre as a double-double so pan deltas at
                // deep zoom (where each pixel = sub-1e-16 of the centre)
                // accumulate without f64 quantisation.
                const s = useEngineStore.getState();
                ps.mode = 'pan-pending';
                ps.startCx = s.julia?.center?.x ?? 0;
                ps.startCy = s.julia?.center?.y ?? 0;
                ps.startCxLow = s.julia?.centerLow?.x ?? 0;
                ps.startCyLow = s.julia?.centerLow?.y ?? 0;
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
                // Anchor in world coords as a double-double — at deep
                // zoom the (u*2-1)*aspect*currZoom term is small enough
                // that f64 addition would lose its lo bits when summed
                // with currCenter. Capture both halves of the centre
                // and accumulate the offset cleanly.
                const cxLow = s.julia?.centerLow?.x ?? 0;
                const cyLow = s.julia?.centerLow?.y ?? 0;
                {
                    const dx = (u * 2 - 1) * aspect * currZoom;
                    const dy = (v * 2 - 1) * currZoom;
                    const ax = ddAddF64(currCenter.x, cxLow, dx);
                    const ay = ddAddF64(currCenter.y, cyLow, dy);
                    ps.zoomAnchorX = ax[0];
                    ps.zoomAnchorXLow = ax[1];
                    ps.zoomAnchorY = ay[0];
                    ps.zoomAnchorYLow = ay[1];
                }
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
                // DD-add the pan delta into the captured (hi, lo) start
                // pair. Each delta might be smaller than f64 ulp at the
                // start centre's magnitude — adding into both halves
                // via two-sum captures the residual in the lo word.
                const [newCx, newCxLow] = ddAddF64(ps.startCx, ps.startCxLow, dcx);
                const [newCy, newCyLow] = ddAddF64(ps.startCy, ps.startCyLow, dcy);
                pendingViewRef.current = {
                    center: { x: newCx, y: newCy },
                    centerLow: { x: newCxLow, y: newCyLow },
                    zoom,
                };
                engineRef.current?.setParams({
                    center: [newCx, newCy],
                    centerLow: [newCxLow, newCyLow],
                });
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
                const newZoom = Math.max(effectiveMinZoom(), Math.min(MAX_ZOOM, ps.startZoom * zoomFactor));
                const aspect = rect.width / rect.height;
                // newCenter = anchor − (u*2-1)*aspect*newZoom, computed
                // as DD so the small newZoom term (deep zoom) doesn't
                // cancel against the anchor's f64 mantissa.
                const dx = -(ps.zoomAnchorU * 2 - 1) * aspect * newZoom;
                const dy = -(ps.zoomAnchorV * 2 - 1) * newZoom;
                const [newCx, newCxLow] = ddAddF64(ps.zoomAnchorX, ps.zoomAnchorXLow, dx);
                const [newCy, newCyLow] = ddAddF64(ps.zoomAnchorY, ps.zoomAnchorYLow, dy);
                pendingViewRef.current = {
                    center: { x: newCx, y: newCy },
                    centerLow: { x: newCxLow, y: newCyLow },
                    zoom: newZoom,
                };
                engineRef.current?.setParams({
                    center: [newCx, newCy],
                    centerLow: [newCxLow, newCyLow],
                    zoom: newZoom,
                });
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
                    centerLow: pending.centerLow,
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
            // World point under cursor stays fixed across the zoom step.
            // Compute newCenter = currCenter + (u*2-1)*aspect*(currZoom - newZoom)
            // as DD so the (currZoom - newZoom) term — tiny at deep zoom —
            // doesn't get clobbered by f64 cancellation against currCenter.
            const dzoom = currZoom - newZoom;
            const dx = (u * 2 - 1) * aspect * dzoom;
            const dy = (v * 2 - 1) * dzoom;
            const [newCx, newCxLow] = ddAddF64(currCenter.x, currCenterLow.x, dx);
            const [newCy, newCyLow] = ddAddF64(currCenter.y, currCenterLow.y, dy);
            pendingViewRef.current = {
                center: { x: newCx, y: newCy },
                centerLow: { x: newCxLow, y: newCyLow },
                zoom: newZoom,
            };
            engineRef.current?.setParams({
                center: [newCx, newCy],
                centerLow: [newCxLow, newCyLow],
                zoom: newZoom,
            });
            if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer);
            wheelCommitTimer = window.setTimeout(() => {
                wheelCommitTimer = null;
                if (!pendingViewRef.current) return;
                const pending = pendingViewRef.current;
                pendingViewRef.current = null;
                useEngineStore.getState().setJulia({
                    center: pending.center,
                    centerLow: pending.centerLow,
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
