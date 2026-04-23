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
 * Both pan and zoom write through the DDFS `sceneCamera` slice so the
 * existing FluidToyApp subscribe → FluidEngine.setParams path handles
 * propagation. The fluid sim field texels stay put under the cursor
 * because FluidEngine's display shader rescales UVs by the camera.
 *
 * Filter note: no generic extract here. Pointer → splat is a
 * FluidEngine-specific contract. The generic engine already covers
 * isUserInteracting via handleInteractionStart/End.
 */

import React, { useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
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

export interface FluidPointerLayerProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    engineRef: React.RefObject<FluidEngine | null>;
}

type PointerMode = 'idle' | 'splat' | 'pan-pending' | 'pan' | 'zoom';

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
}

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
    });
    const handleInteractionStart = useFractalStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useFractalStore((s) => s.handleInteractionEnd);
    const openContextMenu = useFractalStore((s) => s.openContextMenu);

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
            const s = useFractalStore.getState() as any;
            const juliaC = s.julia?.juliaC;
            const orbitOn = !!s.orbit?.enabled;
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
                    action: () => { s.setOrbit({ enabled: !orbitOn }); },
                },
                {
                    label: 'Recenter View',
                    action: () => { s.setSceneCamera({ center: { x: 0, y: 0 }, zoom: 1.5 }); },
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
                const s = useFractalStore.getState() as any;
                ps.mode = 'pan-pending';
                ps.startCx = s.sceneCamera?.center?.x ?? 0;
                ps.startCy = s.sceneCamera?.center?.y ?? 0;
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
                const s = useFractalStore.getState() as any;
                const currCenter = s.sceneCamera?.center ?? { x: 0, y: 0 };
                const currZoom = s.sceneCamera?.zoom ?? 1.5;
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
                ps.mode = 'splat';
                canvas.setPointerCapture(e.pointerId);
                handleInteractionStart('param');
                return;
            }
        };

        const onMove = (e: PointerEvent) => {
            const ps = stateRef.current;
            if (ps.mode === 'idle') return;

            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;

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
                const s = useFractalStore.getState() as any;
                const zoom = s.sceneCamera?.zoom ?? 1.5;
                const aspect = rect.width / rect.height;
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dxPx = e.clientX - ps.startX;
                const dyPx = e.clientY - ps.startY;
                const dcx = -(dxPx / rect.width) * 2 * aspect * zoom * mul;
                const dcy = (dyPx / rect.height) * 2 * zoom * mul;
                s.setSceneCamera({ center: { x: ps.startCx + dcx, y: ps.startCy + dcy } });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            if (ps.mode === 'zoom') {
                // Middle-drag: exponential zoom on vertical motion; pivots
                // around the click-point (anchor captured in onDown).
                // Drag up (dyPx negative) → zoom in.
                const s = useFractalStore.getState() as any;
                const mul = precisionMultiplier(e.shiftKey, e.altKey);
                const dyPx = e.clientY - ps.startY;
                const zoomFactor = Math.exp(-dyPx * MIDDLE_DRAG_ZOOM_SENSITIVITY * mul);
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ps.startZoom * zoomFactor));
                const aspect = rect.width / rect.height;
                const newCx = ps.zoomAnchorX - (ps.zoomAnchorU * 2 - 1) * aspect * newZoom;
                const newCy = ps.zoomAnchorY - (ps.zoomAnchorV * 2 - 1) * newZoom;
                s.setSceneCamera({ center: { x: newCx, y: newCy }, zoom: newZoom });
                ps.lastX = e.clientX; ps.lastY = e.clientY;
                return;
            }

            if (ps.mode === 'splat') {
                const engine = engineRef.current;
                if (!engine) return;
                const now = performance.now();
                const dt = Math.max(1, now - ps.lastT) / 1000;
                const dxPx = e.clientX - ps.lastX;
                const dyPx = e.clientY - ps.lastY;
                ps.lastX = e.clientX;
                ps.lastY = e.clientY;
                ps.lastT = now;

                const u = (e.clientX - rect.left) / rect.width;
                const v = 1 - (e.clientY - rect.top) / rect.height;
                const vx = (dxPx / rect.width) / dt * 5;
                const vy = -(dyPx / rect.height) / dt * 5;
                const strength = Math.min(50, Math.hypot(vx, vy));

                // Brush-mode split — all four modes reuse FluidEngine's
                // additive splat; the per-mode shaping happens here:
                //   paint  → inject dye + force (classic)
                //   erase  → subtract dye (negative grayscale), no force
                //   stamp  → inject dye, no force (press-and-drag trail)
                //   smudge → inject force only, no dye (push colour around)
                const brushMode = Math.floor(
                    (useFractalStore.getState() as any).dye?.brushMode ?? 0
                );

                if (brushMode === 1) {
                    // Erase — always fire (no velocity threshold, otherwise
                    // holding still doesn't erase anything). Negative
                    // grayscale subtracts luminance from the HDR dye buffer.
                    const eraseStrength = 0.5;
                    engine.splatForce(u, v, 0, 0, 0, [-eraseStrength, -eraseStrength, -eraseStrength]);
                    return;
                }

                // Paint/stamp/smudge all want a real drag; below-threshold
                // motion is noise from a still hand and would spam splats.
                if (strength < 0.01) return;

                const h = (now * 0.0005) % 1;
                const r = 0.5 + 0.5 * Math.cos(6.2831853 * h);
                const g = 0.5 + 0.5 * Math.cos(6.2831853 * (h + 0.333));
                const b = 0.5 + 0.5 * Math.cos(6.2831853 * (h + 0.667));

                if (brushMode === 2) {
                    // Stamp — dye only, zero force. Dye strength scaled so
                    // standing still (strength=0) still leaves a mark.
                    engine.splatForce(u, v, 0, 0, 0, [r, g, b]);
                } else if (brushMode === 3) {
                    // Smudge — force only, no dye.
                    engine.splatForce(u, v, vx, vy, strength, [0, 0, 0]);
                } else {
                    // Paint (default / mode 0).
                    engine.splatForce(u, v, vx, vy, strength, [r, g, b]);
                }
                return;
            }
        };

        const onUp = (e: PointerEvent) => {
            const ps = stateRef.current;
            if (ps.pointerId === e.pointerId) {
                try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                ps.pointerId = -1;
            }
            // Clear mode AFTER releasing so a late contextmenu event (fires
            // between pointerup and its click-synthesis) sees rightDragged.
            ps.mode = 'idle';
            handleInteractionEnd();
        };

        // Wheel zoom, cursor-anchored. { passive: false } so we can
        // preventDefault — otherwise the browser scrolls the page.
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            const s = useFractalStore.getState() as any;
            const currCenter = s.sceneCamera?.center ?? { x: 0, y: 0 };
            const currZoom = s.sceneCamera?.zoom ?? 1.5;
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
            s.setSceneCamera({ center: { x: newCx, y: newCy }, zoom: newZoom });
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
        };
    }, [canvasRef, engineRef, handleInteractionStart, handleInteractionEnd]);

    return null;
};
