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
import { syncDeepZoomToEngine } from './features/deepZoom';
import { getDeepZoomRuntime } from './deepZoom/laRuntime';
import { setDeepZoomDiag, clearDeepZoomDiag, setDeepZoomJuliaMs } from './deepZoom/diagnostics';
import { syncPaletteToEngine } from './features/palette';
import { syncCollisionToEngine } from './features/collision';
import { syncFluidSimToEngine } from './features/fluidSim';
import { syncPostFxToEngine } from './features/postFx';
import { syncCompositeToEngine } from './features/composite';
import { FluidPointerLayer } from './FluidPointerLayer';
import { useSlice, useLiveModulations } from '../engine/typedSlices';
import { DomOverlays } from './components/DomOverlays';
import { DeepZoomStatus } from './components/DeepZoomStatus';
import { DeepZoomBench } from './components/DeepZoomBench';
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

    // DDFS feature slices — push into FluidEngine on change. Each
    // feature owns its sync function (features/<x>.ts).
    const julia     = useSlice('julia');
    const deepZoom  = useSlice('deepZoom');
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
    useEffect(() => { const e = engineRef.current; if (e) syncDeepZoomToEngine(e, deepZoom, julia); },           [deepZoom, julia]);

    // When deep zoom is enabled, build the reference orbit on the
    // worker and upload it to FluidEngine. Re-fires on view / maxIter
    // change while enabled, mirroring the rebuild policy from §3.4 of
    // the plan. The shader's gate condition (`uDeepZoomEnabled` AND
    // `uRefOrbitLen > 1`) means the canvas keeps rendering the standard
    // path while the orbit is being built — no flash, no stutter.
    useEffect(() => {
        if (!deepZoom.enabled) {
            clearDeepZoomDiag();
            return;
        }
        const engine = engineRef.current;
        if (!engine) return;
        const runtime = getDeepZoomRuntime();
        let cancelled = false;
        const t0 = performance.now();
        const builtCenter: [number, number] = [julia.center.x, julia.center.y];
        // The lo word of the user's DD-pan accumulator. Below ~1e-15
        // zoom this carries the part of the centre that would otherwise
        // be lost in f64 quantisation; above that depth it's typically
        // 0 from a fresh save or 0-init.
        const builtCenterLow: [number, number] = [
            julia.centerLow?.x ?? 0,
            julia.centerLow?.y ?? 0,
        ];
        // Screen-corner |dc|² for AT validity. Worst case is the
        // diagonal: (aspect² + 1)·zoom². Aspect from canvas ratio.
        const aspect = canvasPixelSize[0] / Math.max(1, canvasPixelSize[1]);
        const screenSqrRadius = (aspect * aspect + 1) * julia.zoom * julia.zoom;
        // Power and kind come from the Fractal panel. Power-2 unlocks
        // LA / AT acceleration (their Step rules are hardcoded for
        // d=2); higher powers fall back to PO-only via the buildLA
        // gate. The worker still builds an orbit at any d, so the
        // perturbation path renders.
        const power = Math.max(2, Math.round(julia.power ?? 2));
        const isPower2 = power === 2;
        const kind: 'mandelbrot' | 'julia' = julia.kind === 0 ? 'julia' : 'mandelbrot';
        const liveCx = liveMod['julia.juliaC_x'] ?? julia.juliaC.x;
        const liveCy = liveMod['julia.juliaC_y'] ?? julia.juliaC.y;
        runtime.computeReferenceOrbit({
            centerX: builtCenter[0],
            centerY: builtCenter[1],
            centerLowX: builtCenterLow[0],
            centerLowY: builtCenterLow[1],
            zoom: julia.zoom,
            maxIter: deepZoom.maxRefIter,
            power,
            kind,
            juliaCx: liveCx,
            juliaCy: liveCy,
            // LA / AT for the deep-zoom path are presently
            // Mandelbrot-only:
            //   - AT's c' = dc·CCoeff + RefC transform collapses to a
            //     constant when dc = 0 (Julia case) → every pixel gets
            //     the same AT output → pixel detail wiped.
            //   - LA's rebase formula assumes Z[0] = 0 (Mandelbrot
            //     convention); Julia's Z[0] = R₀ produces wrong math
            //     after rebase. Disabling LA also avoids ZCoeff
            //     application bugs that show up in chaotic Julia
            //     boundaries (under investigation).
            // Both gates also require integer power 2 (their Step
            // rules are d=2-specific). At higher powers PO carries
            // the load.
            buildLA: deepZoom.useLA && isPower2 && kind === 'mandelbrot',
            screenSqrRadius: deepZoom.useAT && isPower2 && kind === 'mandelbrot' ? screenSqrRadius : 0,
        }).then((res) => {
            if (cancelled) return;
            engine.setReferenceOrbit(res.orbit, res.length, builtCenter, builtCenterLow);
            // LA table uploads only when worker actually built one
            // (deepZoom.useLA && successful build). When useLA is off
            // we still want LA cleared so the shader bypasses it.
            if (res.laTable && res.laStages && res.laCount > 0) {
                engine.setLATable(res.laTable, res.laCount, res.laStages);
                engine.setLAEnabled(true);
            } else {
                engine.clearLATable();
                engine.setLAEnabled(false);
            }
            // AT pipe: when worker found a usable stage for the
            // current view, push it to the engine; otherwise clear.
            if (res.at) {
                engine.setAT({
                    stepLength: res.at.stepLength,
                    thresholdC: res.at.thresholdC,
                    sqrEscapeRadius: res.at.sqrEscapeRadius,
                    refC: [res.at.refCRe, res.at.refCIm],
                    ccoeff: [res.at.ccoeffRe, res.at.ccoeffIm],
                    invZCoeff: [res.at.invZCoeffRe, res.at.invZCoeffIm],
                });
            } else {
                engine.clearAT();
            }
            engine.redraw();
            // Surface build stats to the floating diagnostics overlay.
            // laStagesPerLevel is reconstructed from the packed stages
            // buffer (pairs of [laIndex, macroItCount] floats).
            const stagesPerLevel: number[] = [];
            if (res.laStages) {
                for (let i = 0; i < res.laStages.length; i += 2) {
                    stagesPerLevel.push(res.laStages[i + 1]);
                }
            }
            setDeepZoomDiag({
                orbitLength: res.length,
                precisionBits: res.precisionBits,
                orbitBuildMs: res.buildMs,
                laStageCount: res.laStageCount,
                laCount: res.laCount,
                laBuildMs: res.laBuildMs,
                laStagesPerLevel: stagesPerLevel,
                juliaMs: 0,  // populated by the periodic poll below
            });
            if (deepZoom.showStats) {
                const totalMs = performance.now() - t0;
                console.log(
                    `[deepZoom] orbit len=${res.length} prec=${res.precisionBits}b ` +
                    `LA stages=${res.laStageCount} nodes=${res.laCount} ` +
                    `(orbit=${res.buildMs.toFixed(1)}ms LA=${res.laBuildMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms)`
                );
            }
        }).catch((err: Error) => {
            if (!cancelled) console.error('[deepZoom] build failed:', err.message);
        });
        return () => { cancelled = true; };
    }, [deepZoom.enabled, deepZoom.useLA, deepZoom.useAT, deepZoom.maxRefIter, deepZoom.showStats, julia.center.x, julia.center.y, julia.centerLow?.x, julia.centerLow?.y, julia.zoom, julia.power, julia.kind, julia.juliaC.x, julia.juliaC.y, canvasPixelSize, engineRef]);

    // Poll the engine's GPU-timer reading 5×/sec for the diagnostics
    // overlay. The engine's pollJuliaTimer drains queries each frame;
    // this just snapshots the EWMA into the React-visible diag store.
    // Cheap (one method call) — no need to throttle further.
    useEffect(() => {
        if (!deepZoom.enabled) return;
        const tick = () => {
            const e = engineRef.current;
            if (e) setDeepZoomJuliaMs(e.getJuliaMs());
        };
        const id = window.setInterval(tick, 200);
        return () => window.clearInterval(id);
    }, [deepZoom.enabled, engineRef]);
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
                    {deepZoom.enabled && (
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
