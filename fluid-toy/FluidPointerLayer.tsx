/**
 * FluidPointerLayer — canvas pointer interaction for fluid-toy.
 *
 * Gestures:
 *   left-drag        — splat (force + dye, hue-cycled rainbow trail)
 *   right-drag       — pan the scene camera (grab-and-drag; world-point
 *                      under cursor stays locked during the drag)
 *   right-click      — open canvas context menu (suppressed if the
 *                      press became a pan drag)
 *   middle-drag up/dn — smooth zoom anchored at the click-point. Unlike
 *                      the wheel, the anchor is captured at press time
 *                      and held for the whole drag, so continuous
 *                      vertical motion zooms into/out of one fixed spot.
 *   wheel            — zoom the scene camera, anchored at the cursor
 *                      (per-tick anchor; cursor tracks world-space)
 *
 * Both pan and zoom write through the DDFS `julia` slice so the
 * existing FluidToyApp subscribe → FluidEngine.setParams path handles
 * propagation. The fluid sim field texels stay put under the cursor
 * because FluidEngine's display shader rescales UVs by the camera.
 *
 * Filter note: no generic extract here. Pointer → splat is a
 * FluidEngine-specific contract. The generic engine already covers
 * isUserInteracting via handleInteractionStart/End.
 */

import React, { useRef, useEffect } from 'react';
import { useEngineStore } from '../store/engineStore';
import type { FluidEngine } from './fluid/FluidEngine';
import type { ContextMenuItem } from '../types/help';
import {
    MIN_ZOOM,
    MAX_ZOOM,
    PAN_DRAG_THRESHOLD_PX,
    WHEEL_ZOOM_SENSITIVITY,
    MIDDLE_DRAG_ZOOM_SENSITIVITY,
    PRECISION_SHIFT_MULT,
    PRECISION_ALT_MULT,
} from './constants';
import { brushModeFromIndex, brushColorModeFromIndex } from './features/brush';
import { emitStrokeSplat, emitPressSplat, beginStroke, type BrushParams } from './brush';
import { brushHandles, cursorHandles } from './engineHandles';

// Build a BrushParams object from the current store slice + cached LUT.
// Lives next to FluidPointerLayer because both onDown and onMove need it.
const readBrushParams = (): BrushParams => {
    const b = (useEngineStore.getState() as any).brush ?? {};
    return {
        mode: brushModeFromIndex(b.mode),
        colorMode: brushColorModeFromIndex(b.colorMode),
        solidColor: [b.solidColor?.x ?? 1, b.solidColor?.y ?? 1, b.solidColor?.z ?? 1],
        gradientLut: brushHandles.ref.current.gradientLut,
        size: b.size ?? 0.1,
        hardness: b.hardness ?? 0,
        strength: b.strength ?? 1,
        flow: b.flow ?? 50,
        spacing: b.spacing ?? 0.005,
        jitter: b.jitter ?? 0,
        particleEmitter: !!b.particleEmitter,
        particleRate: b.particleRate ?? 120,
        particleVelocity: b.particleVelocity ?? 0.3,
        particleSpread: b.particleSpread ?? 0.35,
        particleGravity: b.particleGravity ?? 0,
        particleDrag: b.particleDrag ?? 0.6,
        particleLifetime: b.particleLifetime ?? 1.2,
        particleSizeScale: b.particleSizeScale ?? 0.35,
    };
};

export interface FluidPointerLayerProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    engineRef: React.RefObject<FluidEngine | null>;
}

type PointerMode = 'idle' | 'splat' | 'pan-pending' | 'pan' | 'zoom' | 'resize-brush' | 'pick-c';

interface PointerState {
    mode: PointerMode;
    pointerId: number;
    // Shared
    lastX: number;
    lastY: number;
    lastT: number;
    // Pan start anchors — screen and world
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;
    // Zoom (middle-drag) anchors — captured once at pointerdown and held
    // for the whole drag so vertical motion pivots around one fixed
    // world-space point. startZoom is what we multiply the exp factor
    // against; zoomAnchor* describe the world-and-UV coords of the
    // click-point.
    startZoom: number;
    zoomAnchorX: number;
    zoomAnchorY: number;
    zoomAnchorU: number;
    zoomAnchorV: number;
    // Flag set when right-press upgraded to a pan drag — tells the
    // contextmenu handler to ignore the resulting click so the menu
    // doesn't flash up at the end of a pan.
    rightDragged: boolean;
    // B+drag resize-brush anchor — captured at press so the whole drag
    // scales relative to the starting size. Log-scaled so feel is
    // uniform across the 0.003..0.4 size range.
    startBrushSize: number;
}

/** Held-modifier state for B (brush-resize) and C (pick-c) gestures.
 *  Tracked via window key events so the user can press+release
 *  independently of canvas focus. Refs live at module scope so
 *  registerModifierKeys can be called once at mount. */
const mods = { b: false, c: false };

const precisionMultiplier = (shift: boolean, alt: boolean): number => {
    if (shift) return PRECISION_SHIFT_MULT;
    if (alt) return PRECISION_ALT_MULT;
    return 1.0;
};

export const FluidPointerLayer: React.FC<FluidPointerLayerProps> = ({ canvasRef, engineRef }) => {
    const stateRef = useRef<PointerState>({
        mode: 'idle', pointerId: -1,
        lastX: 0, lastY: 0, lastT: 0,
        startX: 0, startY: 0, startCx: 0, startCy: 0,
        startZoom: 1, zoomAnchorX: 0, zoomAnchorY: 0, zoomAnchorU: 0.5, zoomAnchorV: 0.5,
        rightDragged: false,
        startBrushSize: 0.15,
    });
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    // Live-bypass view state for pan / middle-drag / wheel gestures.
    // While a gesture is active we route center/zoom straight to
    // FluidEngine.setParams and stash the pending value here. The
    // store gets a single setJulia commit on gesture end (pointerup
    // for drag, debounce timer for wheel). This mirrors engine-gmt's
    // cursor-anchored navigation: gestures shouldn't cascade through
    // every Zustand subscriber per pointermove.
    const pendingViewRef = useRef<{ center: { x: number; y: number }; zoom: number } | null>(null);

    // B / C modifier key tracking. Listeners live on window so press
    // and release are captured regardless of canvas focus. Bail out of
    // the modifier when the user focuses a text input so B and C in
    // e.g. a name field don't silently arm the canvas gestures.
    useEffect(() => {
        const isTyping = () => {
            const el = document.activeElement as HTMLElement | null;
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTyping()) return;
            if (e.code === 'KeyB') mods.b = true;
            if (e.code === 'KeyC') mods.c = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'KeyB') mods.b = false;
            if (e.code === 'KeyC') mods.c = false;
        };
        const onBlur = () => { mods.b = false; mods.c = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    // Right-click context menu — reads the store at click-time via
    // getState() so the handler stays stable across prop changes and
    // always reflects the current orbit/pause state. Suppresses if the
    // right-press upgraded to a pan drag.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMenu = (e: MouseEvent) => {
            e.preventDefault();
            const ps = stateRef.current;
            if (ps.rightDragged) {
                ps.rightDragged = false;
                return;
            }
            const s = useEngineStore.getState() as any;
            const juliaC = s.julia?.juliaC;
            const orbitOn = !!s.coupling?.orbitEnabled;
            const paused = !!s.fluidSim?.paused;

            const items: ContextMenuItem[] = [
                {
                    label: `Copy Julia c (${juliaC?.x?.toFixed(3) ?? '?'}, ${juliaC?.y?.toFixed(3) ?? '?'})`,
                    action: () => {
                        if (!juliaC) return;
                        const txt = `${juliaC.x.toFixed(6)}, ${juliaC.y.toFixed(6)}`;
                        navigator.clipboard?.writeText(txt).catch(() => { /* clipboard unavailable */ });
                    },
                },
                {
                    label: paused ? 'Resume Sim' : 'Pause Sim',
                    action: () => { s.setFluidSim({ paused: !paused }); },
                },
                {
                    label: orbitOn ? 'Stop Auto Orbit' : 'Start Auto Orbit',
                    action: () => { s.setCoupling({ orbitEnabled: !orbitOn }); },
                },
                {
                    label: 'Recenter View',
                    action: () => { s.setJulia({ center: { x: 0, y: 0 }, zoom: 1.5 }); },
                },
                {
                    label: 'Reset Fluid Fields',
                    action: () => { engineRef.current?.resetFluid(); },
                },
            ];
            openContextMenu(e.clientX, e.clientY, items, ['ui.fluid-canvas']);
        };
        canvas.addEventListener('contextmenu', onMenu);
        return () => canvas.removeEventListener('contextmenu', onMenu);
    }, [canvasRef, engineRef, openContextMenu]);

    // Pointer + wheel handlers. Attach directly (not React synthetic)
    // so the layer doesn't have to cover the canvas (which would trap
    // events meant for Fixed-mode resize handles etc.).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onDown = (e: PointerEvent) => {
            const ps = stateRef.current;
            ps.pointerId = e.pointerId;
            ps.lastX = e.clientX; ps.lastY = e.clientY;
            ps.lastT = performance.now();
            ps.startX = e.clientX; ps.startY = e.clientY;

            if (e.button === 2) {
                // Right-press — start a pan-pending; upgrade to pan on travel.
                const s = useEngineStore.getState() as any;
                ps.mode = 'pan-pending';
                ps.startCx = s.julia?.center?.x ?? 0;
                ps.startCy = s.julia?.center?.y ?? 0;
                ps.rightDragged = false;
                canvas.setPointerCapture(e.pointerId);
                handleInteractionStart('camera');
                return;
            }

            if (e.button === 1) {
                // Middle-press — smooth vertical-drag zoom anchored at
                // the click-point. preventDefault suppresses the
                // browser's auto-scroll cursor that would otherwise
                // appear on middle-down.
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) return;
                const s = useEngineStore.getState() as any;
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
                const s = useEngineStore.getState() as any;
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
                // Reset stroke-local state and mark dragging so the RAF
                // loop starts emitting particles (if the emitter is on).
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
            const ps = stateRef.current;
            if (ps.mode === 'idle') return;

            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;

            // C+drag — drag Julia c directly on the canvas. Pixel delta
            // from drag start maps through zoom × aspect to fractal
            // space, so the same drag gives a bigger c-delta when
            // zoomed out. Matches reference toy-fluid.
            if (ps.mode === 'pick-c') {
                const s = useEngineStore.getState() as any;
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
            // size range naturally. Vertical drag is ignored — keeps
            // the gesture flavour of "horizontal = scale".
            if (ps.mode === 'resize-brush') {
                const s = useEngineStore.getState() as any;
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
                // stays under cursor. center moves opposite to pixel delta,
                // scaled by current zoom × aspect.
                //
                // BYPASS THE STORE during the gesture. Calling setJulia
                // every pointermove triggers Zustand's full subscriber
                // notification — with dozens of useEngineStore consumers
                // in the panel tree, that's enough cascading re-renders
                // per move to trip React 18's max-depth guard. Same
                // pattern engine-gmt's cursor-anchor navigation uses for
                // orbit/zoom (treadmill absorbs into engine.sceneOffset
                // directly; store sees only the final commit on up).
                // We push center/zoom straight to FluidEngine.setParams
                // and commit the final value in onUp.
                const s = useEngineStore.getState() as any;
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
                // Reference convention: drag DOWN (dyPx positive) expands
                // the world-space zoom value = zooms OUT; drag UP (dyPx
                // negative) contracts zoom = zooms IN. zoomFactor uses
                // exp(+dyPx) so those signs match.
                // Same store-bypass as pan — see comment above.
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
            const ps = stateRef.current;
            if (ps.pointerId === e.pointerId) {
                try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                ps.pointerId = -1;
            }
            // Commit the live-bypassed view to the store now that the
            // gesture has ended. During pan/zoom we routed center/zoom
            // straight to FluidEngine.setParams to avoid a per-pointer-
            // event React subscriber cascade; the store catches up
            // here with one setJulia. AutoFeaturePanel readouts and
            // Animation key-cam now see the final value.
            if (pendingViewRef.current) {
                const pending = pendingViewRef.current;
                pendingViewRef.current = null;
                (useEngineStore.getState() as any).setJulia({
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
        // preventDefault — otherwise the browser scrolls the page.
        // Same store-bypass pattern as pan/middle-drag: push direct to
        // FluidEngine each tick, debounce-commit to the store. Wheel
        // has no "up" event so we use a 100 ms idle timer.
        let wheelCommitTimer: number | null = null;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            // First wheel tick of a burst seeds from the current store
            // value; subsequent ticks compose on the in-flight pending
            // value so multiple ticks accumulate cleanly.
            const seed = pendingViewRef.current ?? (() => {
                const s = useEngineStore.getState() as any;
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
            // World point under cursor BEFORE zoom — we want to keep it
            // fixed after. Same math as the middle-drag anchor in the
            // reference toy-fluid.
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
                (useEngineStore.getState() as any).setJulia({
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
    }, [canvasRef, engineRef, handleInteractionStart, handleInteractionEnd]);

    return null;
};
