/**
 * FluidToyApp — engine-native Fluid Toy.
 *
 * Thin shell. The heavy lifting lives elsewhere:
 *   - useFluidEngine.ts       boots FluidEngine + drives the RAF loop.
 *   - useEngineSync.ts        pushes every DDFS slice into the engine.
 *   - useDeepZoomOrbit.ts     orbit/LA/AT rebuild loop + GPU-time poll.
 *   - features/<x>.ts         each owns its `sync<X>ToEngine` function.
 *   - FluidPointerLayer.tsx   canvas pointer / wheel / modifier-key gestures.
 *   - components/DomOverlays.tsx  feature viewport overlays (DOM-type).
 *
 * What stays here: store-callback wiring, floating-panel router glue,
 * resolution + render-control effects (which need canvasPixelSize and
 * the renderScale chain visible alongside each other), and the JSX.
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
import { FluidPointerLayer } from './FluidPointerLayer';
import { DomOverlays } from './components/DomOverlays';
import { DeepZoomStatus } from './components/DeepZoomStatus';
import { DeepZoomBench } from './components/DeepZoomBench';
import { useFluidEngine } from './useFluidEngine';
import { useEngineSync } from './useEngineSync';
import { useDeepZoomOrbit } from './useDeepZoomOrbit';
import { useSlice } from '../engine/typedSlices';

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

    // The render-size flow:
    //   base (CSS pixels — window in Full mode, fixedResolution in Fixed
    //   mode) × renderScale (user multiplier) × quality (adaptive) →
    //   final drawing-buffer dims for both the canvas AND the sim/
    //   fractal grid (they share one resolution in fluid-toy).
    //
    // canvasPixelSize from ViewportFrame's ResizeObserver is in physical
    // pixels (CSS × DPR). We divide DPR out so renderScale acts on CSS
    // dims — renderScale=1.0 ≡ "match CSS", renderScale=2.0 ≡ "Retina".
    const canvasPixelSize  = useEngineStore((s) => s.canvasPixelSize);
    const resolutionMode   = useEngineStore((s) => s.resolutionMode);
    const fixedResolution  = useEngineStore((s) => s.fixedResolution);
    const renderScale      = useEngineStore((s) => s.renderScale);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

    // Generic render-control slice — `accumulation` gates TSAA on the
    // fractal background. Lives in engine-core so any future app reuses it.
    const accumulation = useEngineStore((s) => s.accumulation);
    const isPaused     = useEngineStore((s) => s.isPaused);
    const sampleCap    = useEngineStore((s) => s.sampleCap);

    // All DDFS slice → engine pushes happen inside useEngineSync.
    // Deep-zoom orbit/LA/AT rebuild + GPU-time polling lives in
    // useDeepZoomOrbit. Both hooks read their own slices via useSlice.
    useEngineSync(engineRef);
    useDeepZoomOrbit(engineRef);

    // The JSX below conditionally mounts the deep-zoom diagnostics
    // overlay — read just `enabled` here, not the whole slice.
    const deepZoomEnabled = useSlice('deepZoom').enabled;

    // Render-control → TSAA + sim pause. The accumulation toggle and
    // sampleCap collapse onto a single FluidEngine knob: tsaaSampleCap
    // (where 1 = TSAA off, no jitter, no blend; > 1 = active with that
    // convergence target; 0 = infinite). Topbar accumulation=off forces
    // cap to 1; otherwise the user's cap setting flows through.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const cap = (accumulation ?? true) ? sampleCap : 1;
        engine.setParams({
            tsaaSampleCap: cap,
            paused:        isPaused,
        });
    }, [accumulation, isPaused, sampleCap]);

    // K-sampling is fixed at 1 (DEFAULT_PARAMS.tsaaPerFrameSamples).
    // TSAA does all the convergence progressively across frames —
    // smoother ramp than a K-sample burst, and frame cost is constant
    // regardless of interaction state. The "ramp during pan/zoom is
    // the rendered noise floor; over idle frames TSAA refines toward
    // a many-sample-equivalent image.

    // Resolution change → bilinear-reproject sim + accumulator (in
    // setRenderSize), then redraw before compositor reads the freshly-
    // cleared drawing buffer (suppresses the black flash).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const dpr = window.devicePixelRatio || 1;
        const [baseW, baseH] = resolutionMode === 'Fixed'
            ? fixedResolution
            : [canvasPixelSize[0] / dpr, canvasPixelSize[1] / dpr];
        if (baseW < 1 || baseH < 1) return;
        const finalW = Math.max(1, Math.round(baseW * renderScale * quality));
        const finalH = Math.max(1, Math.round(baseH * renderScale * quality));
        engine.setRenderSize(finalW, finalH);
        engine.redraw();
    }, [canvasPixelSize, resolutionMode, fixedResolution, renderScale, quality]);

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
                    {deepZoomEnabled && (
                        <div style={{
                            position: 'absolute',
                            left: 8,
                            bottom: 8,
                            pointerEvents: 'none',
                            zIndex: 5,
                            minWidth: 220,
                        }}>
                            <DeepZoomStatus />
                            <DeepZoomBench engineRef={engineRef} />
                        </div>
                    )}
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
