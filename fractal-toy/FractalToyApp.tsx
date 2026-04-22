/**
 * FractalToyApp — root component.
 *
 * Layout mirrors the engine's App.tsx skeleton: viewport + right dock
 * housing the feature panels, plus floating windows and DropZones for
 * drag-out / drag-back. Panels land in the dock via setup.ts calling
 * movePanel — the tab system is the engine's standard Dock + PanelRouter.
 *
 * Fractal-toy's canvas fills the viewport area. FractalEngine owns the
 * WebGL2 context, iterates the feature registry to collect inject()
 * contributions, and composes the raymarching shader via
 * fractal-toy/shaderAssembler.ts.
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

export const FractalToyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FractalEngine | null>(null);

    const state     = useFractalStore();
    const mandelbulb = useFractalStore((s: any) => s.mandelbulb);
    const camera     = useFractalStore((s: any) => s.camera);
    const lighting   = useFractalStore((s: any) => s.lighting);

    // StoreCallbacks context — so engine primitives (Slider etc.) that
    // consume it from React context don't fall back to whatever the
    // default is. Same pattern App.tsx uses.
    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart: state.handleInteractionStart,
        handleInteractionEnd:   state.handleInteractionEnd,
        openContextMenu:        state.openContextMenu,
    }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

    // Floating panels (users drag tabs out; engine's DraggableWindow hosts them).
    const floatingPanels = (Object.values(state.panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const sizeToParent = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            engineRef.current?.resize(
                Math.max(1, Math.floor(rect.width  * dpr)),
                Math.max(1, Math.floor(rect.height * dpr)),
            );
        };

        try {
            const engine = new FractalEngine(canvas);
            engineRef.current = engine;
            const builder = new ShaderBuilder('Main');
            for (const feat of featureRegistry.getAll()) {
                if (feat.inject) feat.inject(builder, {} as any, 'Main');
            }
            const fragSrc = assembleRayMarchShader(builder);
            engine.setShader(fragSrc);
            sizeToParent();
            engine.start();
        } catch (e) {
            console.error('[FractalToy] failed to start engine:', e);
        }

        const ro = new ResizeObserver(sizeToParent);
        ro.observe(canvas);

        return () => {
            ro.disconnect();
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

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
                    {/* Viewport: fractal-toy's WebGL2 canvas fills it. */}
                    <div className="flex-1 relative bg-black">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                        <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                            Fractal Toy · Mandelbulb
                        </div>
                    </div>

                    <Dock side="right" />
                </div>
            </div>
        </StoreCallbacksProvider>
    );
};
