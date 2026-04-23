/**
 * FluidToyApp — engine-native Fluid Toy.
 *
 * 3b: FluidEngine mounted inside <ViewportFrame>. Canvas physical-pixel
 * size is driven by canvasPixelSize (authoritative writer: the frame's
 * ResizeObserver) × qualityFraction (driven by the adaptive loop).
 *
 * No bespoke ResizeObserver. No bespoke adaptive loop. Both live in
 * @engine/viewport. FluidEngine's own internal params are still its
 * defaults — DDFS features arrive in 3c-3e.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { viewport, useQualityFraction, useViewportFps } from '../engine/plugins/Viewport';
import { TopBarHost } from '../engine/plugins/TopBar';
import { FluidEngine } from './fluid/FluidEngine';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { TimelineHost } from '../components/TimelineHost';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { FORCE_MODES } from './features/fluidSim';
import { FluidPointerLayer } from './FluidPointerLayer';
import { registerFluidToyHotkeys } from './hotkeys';

export const FluidToyApp: React.FC = () => {
    const state = useFractalStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FluidEngine | null>(null);
    const rafRef = useRef<number | null>(null);

    const floatingPanels = (Object.values(state.panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart: state.handleInteractionStart,
        handleInteractionEnd: state.handleInteractionEnd,
        openContextMenu: state.openContextMenu,
    }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

    // Authoritative size (written by ViewportFrame's ResizeObserver) ×
    // adaptive quality fraction. FluidEngine.resize() takes CSS pixels
    // (not DPR-multiplied) for its WebGL buffer, matching toy-fluid's
    // original contract. So we divide DPR out and apply quality.
    const canvasPixelSize = useFractalStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();
    // DDFS feature slices — push into FluidEngine.setParams on change.
    const julia       = useFractalStore((s: any) => s.julia);
    const dye         = useFractalStore((s: any) => s.dye);
    const fluidSim    = useFractalStore((s: any) => s.fluidSim);
    const sceneCamera = useFractalStore((s: any) => s.sceneCamera);
    // Live-modulated values (base + LFO/audio/rule offsets). The
    // engine/animation/modulationTick writes this each frame.
    // Read-with-fallback pattern: liveMod[target] if present, else base.
    const liveMod = useFractalStore((s: any) => s.liveModulations ?? {});

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FluidEngine(canvas, {
                onFrameEnd: () => viewport.frameTick(),
            });
            engineRef.current = engine;

            // RAF loop — engine.frame(timeMs) does the full sim + display pass.
            const loop = (t: number) => {
                engineRef.current?.frame(t);
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } catch (e) {
            console.error('[FluidToy] failed to start engine:', e);
        }

        // Register hotkeys now that engineRef is live (R needs engine.resetFluid).
        registerFluidToyHotkeys(engineRef);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

    // Push Julia params. juliaC reads liveModulations first (base+offset
    // from any LFO/audio/rule driver — like the orbit LFOs) and falls
    // back to the DDFS base. That's how orbit, audio-reactive c, and
    // future modulation sources all compose without FluidToyApp knowing
    // they exist.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !julia) return;
        const baseX = julia.juliaC?.x ?? 0;
        const baseY = julia.juliaC?.y ?? 0;
        const cx = liveMod['julia.juliaC.x'] ?? baseX;
        const cy = liveMod['julia.juliaC.y'] ?? baseY;
        engine.setParams({
            juliaC: [cx, cy],
            maxIter: julia.maxIter ?? 310,
            escapeR: julia.escapeR ?? 32,
            power: julia.power ?? 2,
        });
    }, [julia, liveMod]);

    // Push Dye params + gradient LUTs whenever they change.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !dye) return;

        engine.setParams({
            dyeInject:       dye.dyeInject ?? 8,
            dyeDissipation:  dye.dyeDissipation ?? 1.03,
            dyeMix:          dye.dyeMix ?? 2,
            gradientRepeat:  dye.gradientRepeat ?? 1,
            gradientPhase:   dye.gradientPhase ?? 0,
        });

        if (dye.gradient) {
            const lut = generateGradientTextureBuffer(dye.gradient);
            engine.setGradientBuffer(lut);
        }
        if (dye.collisionGradient) {
            const lut = generateGradientTextureBuffer(dye.collisionGradient);
            engine.setCollisionGradientBuffer(lut);
        }
    }, [dye]);

    // Push fluid-sim dynamics knobs. simResolution is the user TARGET;
    // the actual sim grid is scaled by qualityFraction (adaptive).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !fluidSim) return;
        const forceIdx = fluidSim.forceMode ?? 0;
        engine.setParams({
            simResolution:  Math.max(64, Math.floor((fluidSim.simResolution ?? 1344) * quality)),
            vorticity:      fluidSim.vorticity ?? 22.1,
            vorticityScale: fluidSim.vorticityScale ?? 1,
            pressureIters:  fluidSim.pressureIters ?? 50,
            dissipation:    fluidSim.dissipation ?? 0.17,
            forceMode:      FORCE_MODES[Math.floor(forceIdx)] ?? 'gradient',
            forceGain:      fluidSim.forceGain ?? -1200,
            interiorDamp:   fluidSim.interiorDamp ?? 0.59,
            paused:         !!fluidSim.paused,
            // autoQuality stays off in our port — adaptive is handled by
            // @engine/viewport, not FluidEngine's internal loop.
            autoQuality:    false,
        });
    }, [fluidSim, quality]);

    // Push scene-camera (pan/zoom).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !sceneCamera) return;
        const c = sceneCamera.center;
        engine.setParams({
            center: [c?.x ?? 0, c?.y ?? 0],
            zoom: sceneCamera.zoom ?? 1.5,
        });
    }, [sceneCamera]);

    // Resize whenever physical pixels or quality fraction change.
    useEffect(() => {
        const engine = engineRef.current;
        const [physW, physH] = canvasPixelSize;
        if (!engine || physW < 1 || physH < 1) return;
        const dpr = window.devicePixelRatio || 1;
        // Scale down physical px by DPR to get CSS-ish logical px, then
        // apply quality. FluidEngine.resize expects logical pixels —
        // matches the original toy-fluid contract.
        const logicalW = Math.max(1, Math.floor((physW / dpr) * quality));
        const logicalH = Math.max(1, Math.floor((physH / dpr) * quality));
        engine.resize(logicalW, logicalH);
    }, [canvasPixelSize, quality]);

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

            <TopBarHost />

            <div className="flex-1 flex overflow-hidden relative">
                <ViewportFrame className="flex-1">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full block touch-none"
                    />
                    <FluidPointerLayer canvasRef={canvasRef} engineRef={engineRef} />
                    <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none z-10">
                        q{(quality * 100).toFixed(0)}%
                    </div>
                </ViewportFrame>

                <Dock side="right" />
            </div>

            <TimelineHost />
        </div>
        </StoreCallbacksProvider>
    );
};
