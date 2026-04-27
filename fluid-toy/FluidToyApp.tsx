/**
 * FluidToyApp — engine-native Fluid Toy.
 *
 * Thin shell. The heavy lifting lives elsewhere:
 *   - useFluidEngine.ts     boots FluidEngine + drives the RAF loop.
 *   - features/<x>.ts       each owns its `sync<X>ToEngine` push.
 *   - FluidPointerLayer.tsx canvas pointer / wheel / modifier-key gestures.
 *   - components/DomOverlays.tsx  feature viewport overlays (DOM-type).
 *
 * What stays here: store-callback wiring, floating-panel router glue,
 * the DDFS-slice → engine push effects (one line each), and the JSX.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { useQualityFraction, useViewportFps } from '../engine/plugins/Viewport';
import { TopBarHost } from '../engine/plugins/TopBar';
import { HudHost } from '../engine/plugins/Hud';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { TimelineHost } from '../components/TimelineHost';
import { EngineBridge } from '../components/EngineBridge';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { HelpOverlay } from '../engine/plugins/Help';
// readBrushParams is not used here — useFluidEngine owns the RAF brush tick.
import { syncJuliaToEngine } from './features/julia';
import { syncPaletteToEngine } from './features/palette';
import { syncCollisionToEngine } from './features/collision';
import { syncFluidSimToEngine } from './features/fluidSim';
import { syncPostFxToEngine } from './features/postFx';
import { syncCompositeToEngine } from './features/composite';
import { FluidPointerLayer } from './FluidPointerLayer';
import { useSlice, useLiveModulations } from '../engine/typedSlices';
import { DomOverlays } from './components/DomOverlays';
import { useFluidEngine } from './useFluidEngine';

export const FluidToyApp: React.FC = () => {
    // Granular selectors — DO NOT use `useEngineStore()` with no
    // selector here. That would subscribe to the entire store; every
    // setJulia / setBrush / setLiveModulations etc. would re-render the
    // whole tree. With React 18's stricter scheduling and rapid
    // pointer-event setter bursts, the cascade of subscriber re-renders
    // during a drag trips React's max-depth guard.
    const panels = useEngineStore((s) => s.panels);
    const contextMenu = useEngineStore((s) => s.contextMenu);
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    const closeContextMenu = useEngineStore((s) => s.closeContextMenu);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const openHelp = useEngineStore((s) => s.openHelp);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useFluidEngine(canvasRef);

    const floatingPanels = (Object.values(panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart,
        handleInteractionEnd,
        openContextMenu,
    }), [handleInteractionStart, handleInteractionEnd, openContextMenu]);

    // Authoritative size (written by ViewportFrame's ResizeObserver) ×
    // adaptive quality fraction. FluidEngine.resize() takes CSS pixels
    // (not DPR-multiplied) for its WebGL buffer, matching toy-fluid's
    // original contract. So we divide DPR out and apply quality.
    const canvasPixelSize = useEngineStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

    // DDFS feature slices — push into FluidEngine on change. Each
    // feature owns its sync function (features/<x>.ts).
    const julia     = useSlice('julia');
    const coupling  = useSlice('coupling');
    const palette   = useSlice('palette');
    const collision = useSlice('collision');
    const fluidSim  = useSlice('fluidSim');
    const postFx    = useSlice('postFx');
    const composite = useSlice('composite');

    // Generic render-control slice — `accumulation` gates TSAA on the
    // fractal background. Lives in engine-core so any future app reuses it.
    const accumulation = useEngineStore((s) => s.accumulation);
    const isPaused     = useEngineStore((s) => s.isPaused);
    const sampleCap    = useEngineStore((s) => s.sampleCap);

    // Live-modulated values (base + LFO/audio/rule offsets). Read by
    // syncJuliaToEngine so orbit / audio-reactive c / future drivers
    // compose without FluidToyApp knowing they exist.
    const liveMod = useLiveModulations();

    useEffect(() => { const e = engineRef.current; if (e) syncJuliaToEngine(e, julia, liveMod); },               [julia, liveMod]);
    useEffect(() => { const e = engineRef.current; if (e) syncPaletteToEngine(e, palette); },                    [palette]);
    useEffect(() => { const e = engineRef.current; if (e) syncCollisionToEngine(e, collision); },                [collision]);
    useEffect(() => { const e = engineRef.current; if (e) syncFluidSimToEngine(e, fluidSim, coupling); },           [fluidSim, coupling]);
    useEffect(() => { const e = engineRef.current; if (e) syncPostFxToEngine(e, postFx); },                      [postFx]);
    useEffect(() => { const e = engineRef.current; if (e) syncCompositeToEngine(e, composite); },                [composite]);

    // Render-control → TSAA + sim pause. Toggling `accumulation` off
    // drops jitter to 0 and stops the blend pass; the topbar pause
    // button freezes dye + velocity (fractal keeps rendering so TSAA
    // can converge).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setParams({
            tsaa:          accumulation ?? true,
            tsaaSampleCap: sampleCap,
            paused:        isPaused,
        });
    }, [accumulation, isPaused, sampleCap]);

    // simAspect comes from unscaled CSS dims, not the quality-scaled
    // logical size — adaptive nudges only resize the canvas/render
    // target, never the sim FBOs (which would wipe dye on every nudge).
    //
    // Setting canvas.width / canvas.height clears the WebGL drawing
    // buffer to transparent black; the explicit engine.frame() after
    // resize repaints before the compositor reads the empty canvas,
    // suppressing a black flash on every adaptive change.
    useEffect(() => {
        const engine = engineRef.current;
        const [physW, physH] = canvasPixelSize;
        if (!engine || physW < 1 || physH < 1) return;
        const dpr = window.devicePixelRatio || 1;
        engine.setSimAspect(physW / physH);
        const logicalW = Math.max(1, Math.floor((physW / dpr) * quality));
        const logicalH = Math.max(1, Math.floor((physH / dpr) * quality));
        engine.resize(logicalW, logicalH);
        engine.redraw();
    }, [canvasPixelSize, quality]);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
            <EngineBridge />
            <RenderLoopDriver />
            <DropZones />

            {floatingPanels.map((p) => (
                <DraggableWindow key={p.id} id={p.id} title={p.id}>
                    {/* PanelRouter expects whole-state for its evalShowIf
                        predicates and legacy passthrough. We grab a current
                        snapshot via getState() instead of subscribing —
                        PanelRouter's children handle their own per-slice
                        subscriptions, so a snapshot here is enough. */}
                    <PanelRouter
                        activeTab={p.id as PanelId}
                        state={useEngineStore.getState()}
                        actions={useEngineStore.getState()}
                        onSwitchTab={(t) => togglePanel(t, true)}
                    />
                </DraggableWindow>
            ))}

            <TopBarHost />

            <div className="flex-1 flex overflow-hidden relative">
                <Dock side="left" />

                <ViewportFrame className="flex-1">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full block touch-none"
                    />
                    <FluidPointerLayer canvasRef={canvasRef} engineRef={engineRef} />
                    <HudHost />
                    <DomOverlays />
                </ViewportFrame>

                <Dock side="right" />
            </div>

            <TimelineHost />

            <HelpOverlay />

            {contextMenu.visible && (
                <GlobalContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    targetHelpIds={contextMenu.targetHelpIds}
                    onClose={closeContextMenu}
                    onOpenHelp={openHelp}
                />
            )}
        </div>
        </StoreCallbacksProvider>
    );
};
