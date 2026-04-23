/**
 * FluidPointerLayer — click-drag-to-splat interaction for fluid-toy.
 *
 * Minimal MVP: captures pointer events on the canvas, translates to
 * UV + velocity, and calls FluidEngine.splatForce. Color cycles by
 * hue over time so repeated splats leave a rainbow trail.
 *
 * Also wires right-click to a canvas context menu — Copy C / Reset /
 * Recenter / Orbit / Pause. Shares the engine's global context-menu
 * surface so the look matches every other menu in the app.
 *
 * Unlike the original toy-fluid/ToyFluidApp.tsx (which layers pan /
 * zoom / pick-c gesture modes on top of splat), this is just the
 * splat path. Extra gestures can land as follow-ups — they're
 * app-specific and not worth blocking the fluid-toy port on.
 *
 * Filter note: no generic extract here. Pointer → splat is a
 * FluidEngine-specific contract. The generic engine already covers
 * isUserInteracting via handleInteractionStart/End (we wire it so
 * the viewport plugin's adaptive loop gets the activity signal).
 */

import React, { useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import type { FluidEngine } from './fluid/FluidEngine';
import type { ContextMenuItem } from '../types/help';

export interface FluidPointerLayerProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    engineRef: React.RefObject<FluidEngine | null>;
}

interface PointerState {
    down: boolean;
    lastX: number;
    lastY: number;
    lastT: number;
}

export const FluidPointerLayer: React.FC<FluidPointerLayerProps> = ({ canvasRef, engineRef }) => {
    const stateRef = useRef<PointerState>({ down: false, lastX: 0, lastY: 0, lastT: 0 });
    const handleInteractionStart = useFractalStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useFractalStore((s) => s.handleInteractionEnd);
    const openContextMenu = useFractalStore((s) => s.openContextMenu);

    // Right-click context menu — reads the store at click-time via
    // getState() so the handler stays stable across prop changes and
    // always reflects the current orbit/pause state. Actions mutate
    // the store's DDFS slices; the shared FluidToyApp effects push
    // the new values into FluidEngine.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMenu = (e: MouseEvent) => {
            e.preventDefault();
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

    // Attach events to the canvas directly (not React synthetic) so the
    // layer itself doesn't have to cover the canvas (which would trap
    // events meant for the Fixed-mode resize handles etc).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onDown = (e: PointerEvent) => {
            canvas.setPointerCapture(e.pointerId);
            stateRef.current = {
                down: true,
                lastX: e.clientX,
                lastY: e.clientY,
                lastT: performance.now(),
            };
            handleInteractionStart('param');
        };

        const onMove = (e: PointerEvent) => {
            const st = stateRef.current;
            if (!st.down) return;
            const engine = engineRef.current;
            if (!engine) return;

            const now = performance.now();
            const dt = Math.max(1, now - st.lastT) / 1000;
            const dxPx = e.clientX - st.lastX;
            const dyPx = e.clientY - st.lastY;
            st.lastX = e.clientX;
            st.lastY = e.clientY;
            st.lastT = now;

            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;

            // UV: origin bottom-left for WebGL convention.
            const u = (e.clientX - rect.left) / rect.width;
            const v = 1 - (e.clientY - rect.top) / rect.height;

            // Velocity: px/s normalized to canvas size, scaled for sim.
            const vx = (dxPx / rect.width) / dt * 5;
            const vy = -(dyPx / rect.height) / dt * 5;
            const strength = Math.min(50, Math.hypot(vx, vy));
            if (strength < 0.01) return;

            // Hue-cycle colour over time for a rainbow trail.
            const h = (now * 0.0005) % 1;
            const r = 0.5 + 0.5 * Math.cos(6.2831853 * h);
            const g = 0.5 + 0.5 * Math.cos(6.2831853 * (h + 0.333));
            const b = 0.5 + 0.5 * Math.cos(6.2831853 * (h + 0.667));

            engine.splatForce(u, v, vx, vy, strength, [r, g, b]);
        };

        const onUp = (e: PointerEvent) => {
            stateRef.current.down = false;
            try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
            handleInteractionEnd();
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('pointerleave', onUp);

        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('pointerleave', onUp);
        };
    }, [canvasRef, engineRef, handleInteractionStart, handleInteractionEnd]);

    return null;
};
