/**
 * FractalToyApp — root component.
 *
 * Layout mirrors the engine's App.tsx skeleton: ViewportFrame +
 * right-dock for the feature panels, plus floating windows and
 * DropZones for drag-out / drag-back. Panels land in the dock via
 * setup.ts auto-layout — the tab system is the engine's standard
 * Dock + PanelRouter.
 *
 * The WebGL2 canvas slots into <ViewportFrame> which owns the
 * authoritative ResizeObserver, handles Full/Fixed mode with
 * fit-scaling, and mounts the fixed-resolution UI. The app's only
 * job is to (a) compile the raymarching shader from feature injections,
 * (b) subscribe to canvasPixelSize + qualityFraction, and (c) resize
 * the WebGL drawing buffer accordingly.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { FractalEngine } from './FractalEngine';
import { ShaderBuilder } from '../engine/ShaderBuilder';
import { featureRegistry } from '../engine/FeatureSystem';
import { useFractalStore } from '../store/fractalStore';
import { assembleRayMarchShader } from './shaderAssembler';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import {
    viewport,
    useQualityFraction,
    useViewportFps,
    ViewportFrame,
} from '../engine/plugins/Viewport';

export const FractalToyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FractalEngine | null>(null);

    const state     = useFractalStore();
    const mandelbulb = useFractalStore((s: any) => s.mandelbulb);
    const camera     = useFractalStore((s: any) => s.camera);
    const lighting   = useFractalStore((s: any) => s.lighting);
    // @engine/viewport signals.
    const canvasPixelSize = useFractalStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

    // StoreCallbacks context — same pattern as App.tsx, piped through
    // so slider drags on the right-dock feature panels fire
    // handleInteractionStart/End which the viewport plugin subscribes
    // to for immediate quality drop.
    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart: state.handleInteractionStart,
        handleInteractionEnd:   state.handleInteractionEnd,
        openContextMenu:        state.openContextMenu,
    }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

    const floatingPanels = (Object.values(state.panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FractalEngine(canvas, {
                onFrameEnd: () => viewport.frameTick(),
            });
            engineRef.current = engine;
            const builder = new ShaderBuilder('Main');
            for (const feat of featureRegistry.getAll()) {
                if (feat.inject) feat.inject(builder, {} as any, 'Main');
            }
            const fragSrc = assembleRayMarchShader(builder);
            engine.setShader(fragSrc);
            engine.start();
        } catch (e) {
            console.error('[FractalToy] failed to start engine:', e);
        }

        return () => {
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

    // Resize the WebGL drawing buffer whenever the frame's authoritative
    // canvasPixelSize changes OR adaptive quality shifts. Fractal-toy
    // maps quality → internal render scale, which is the dynamic-
    // resolution trick: smaller WebGL buffer, browser blits to the
    // full-size canvas element.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const [physW, physH] = canvasPixelSize;
        if (physW < 1 || physH < 1) return;
        engine.resize(
            Math.max(1, Math.floor(physW * quality)),
            Math.max(1, Math.floor(physH * quality)),
        );
    }, [canvasPixelSize, quality]);

    // Push feature uniforms on state change. Engine caches uniform
    // locations so these calls are cheap.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !mandelbulb) return;
        engine.setUniformI('uIterations',       mandelbulb.iterations ?? 16);
        engine.setUniformF('uPower',            mandelbulb.power ?? 8.0);
        engine.setUniformF('uPhaseTheta',       mandelbulb.phaseTheta ?? 0.0);
        engine.setUniformF('uPhasePhi',         mandelbulb.phasePhi ?? 0.0);
        engine.setUniformF('uTwist',            mandelbulb.twist ?? 0.0);
        engine.setUniformF('uRadiolariaEnabled', mandelbulb.radiolariaEnabled ? 1.0 : 0.0);
        engine.setUniformF('uRadiolariaLimit',  mandelbulb.radiolariaLimit ?? 0.5);
    }, [mandelbulb]);

    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !camera) return;
        engine.setUniformF('uCamOrbitTheta', camera.orbitTheta ?? 0.6);
        engine.setUniformF('uCamOrbitPhi',   camera.orbitPhi ?? 0.2);
        engine.setUniformF('uCamDistance',   camera.distance ?? 2.5);
        engine.setUniformF('uCamFov',        camera.fov ?? 60);
        const t = camera.target;
        engine.setUniform3F('uCamTarget',
            t?.x ?? 0,
            t?.y ?? 0,
            t?.z ?? 0,
        );
    }, [camera]);

    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !lighting) return;

        const d = lighting.direction;
        engine.setUniform3F('uLightDir',
            d?.x ?? 0.5,
            d?.y ?? 0.8,
            d?.z ?? 0.5,
        );
        const c = lighting.color;
        if (c && typeof c === 'object' && 'r' in c) {
            engine.setUniform3F('uLightColor', c.r, c.g, c.b);
        } else if (typeof c === 'string') {
            const hex = parseInt(c.replace('#', ''), 16);
            engine.setUniform3F('uLightColor',
                ((hex >> 16) & 0xff) / 255,
                ((hex >>  8) & 0xff) / 255,
                ( hex        & 0xff) / 255,
            );
        } else {
            engine.setUniform3F('uLightColor', 1, 1, 1);
        }
        engine.setUniformF('uLightIntensity', lighting.intensity ?? 1.0);
        engine.setUniformF('uAmbient',        lighting.ambient ?? 0.15);
        engine.setUniformF('uAoAmount',       lighting.aoAmount ?? 0.4);
        engine.setUniform3F('uAlbedo',
            lighting.albedoR ?? 0.85,
            lighting.albedoG ?? 0.72,
            lighting.albedoB ?? 0.55,
        );
    }, [lighting]);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
            <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
                <DropZones />

                {floatingPanels.map((p) => (
                    <DraggableWindow key={p.id} id={p.id} title={p.id}>
                        <PanelRouter
                            activeTab={p.id as PanelId}
                            state={state}
                            actions={state}
                            onSwitchTab={(t) => state.togglePanel(t, true)}
                        />
                    </DraggableWindow>
                ))}

                <div className="flex-1 flex overflow-hidden relative">
                    {/* The plugin frame owns ResizeObserver, mode UI, and
                        Fixed/Full layout. Fractal-toy slots its WebGL
                        canvas as the only child; any overlays we add
                        later (pointer cursor, gizmos) go here too. */}
                    <ViewportFrame>
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                    </ViewportFrame>

                    <Dock side="right" />
                </div>

                {/* Perf HUD — global, outside the frame so it's visible
                    regardless of Fixed letterboxing. */}
                <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none">
                    {fpsSmoothed.toFixed(0)} fps · q{(quality * 100).toFixed(0)}%
                </div>
                <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                    Fractal Toy · Mandelbulb
                </div>
            </div>
        </StoreCallbacksProvider>
    );
};
