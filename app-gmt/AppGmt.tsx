/**
 * AppGmt — root component for the GMT application.
 *
 * Mirrors fluid-toy / fractal-toy's layout: full app chrome (TopBar +
 * Dock + DropZones + HudHost + TimelineHost) wrapped around a viewport
 * that hosts the GMT renderer + R3F scene (tick driver + navigation).
 *
 * GMT-specific mounts (vs fluid-toy's):
 *   - `<GmtRendererCanvas />` instead of a raw `<canvas ref>` + app
 *     engine: the OffscreenCanvas + worker lifetime are encapsulated by
 *     the renderer plugin.
 *   - R3F `<Canvas>` sits on top as a transparent input host for
 *     `<GmtRendererTickDriver />` (sends RENDER_TICK each frame) and
 *     `<GmtNavigation />` (Orbit/Fly + HUD imperative updates).
 *   - `<GmtNavigationHud />` renders DST/SPD/reticle/reset as a DOM
 *     sibling overlay. Hud refs are created here and passed into both.
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useEngineStore } from '../store/engineStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
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
import { TutorialOverlay, TutorialRunner } from '../engine/plugins/Tutorial';
import { CompilingIndicator } from '../components/CompilingIndicator';
import HistogramProbe from '../engine-gmt/components/HistogramProbe';
import { HardwarePrefsHost } from '../engine-gmt/components/HardwarePrefsHost';
import { useInteractionManager } from '../engine-gmt/hooks/useInteractionManager';
import { useRegionSelection } from '../engine-gmt/hooks/useRegionSelection';
import { usePreviewTarget } from '../engine-gmt/hooks/usePreviewTarget';
import { RegionOverlay } from '../engine-gmt/components/viewport/RegionOverlay';
import { PreviewGhostOverlay } from '../engine-gmt/components/viewport/PreviewGhostOverlay';

import { GmtRendererCanvas, GmtRendererTickDriver, gmtRenderer, getProxy } from '../engine-gmt';
import { estimateCompileTime } from '../engine-gmt/features/engine/profiles';
import { GmtNavigation, GmtNavigationHud } from '../engine-gmt/navigation';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { LoadingScreen } from './LoadingScreen';
import { FormulaWorkshop } from '../engine-gmt/features/fragmentarium_import/FormulaWorkshop';
import { useAppStartup } from '../hooks/useAppStartup';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { LandscapeGate } from '../engine/components/LandscapeGate';
import { MobileViewportShell } from '../engine/components/MobileViewportShell';
import { MobileScrollIntro } from '../engine/components/MobileScrollIntro';
import MobileControls from '../components/MobileControls';
import { MobileMenuHost } from '../engine/plugins/Menu';

const DomOverlays: React.FC = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    const state = useEngineStore();
    return (
        <div className="absolute inset-0 pointer-events-none z-[20]">
            {overlays.map(config => {
                const Component = componentRegistry.get(config.componentId);
                const featureId = config.id;
                const sliceState = (state as any)[featureId];
                if (Component && sliceState) {
                    return (
                        <Component
                            key={config.id}
                            featureId={featureId}
                            sliceState={sliceState}
                            actions={state}
                        />
                    );
                }
                return null;
            })}
        </div>
    );
};

export const AppGmt: React.FC = () => {
    const state     = useEngineStore();
    const { isMobile } = useMobileLayout();
    // Mobile-menu state is only ever set when on mobile (MenuAnchor
    // gates `mobileMenu.toggle` on isMobile), so the active id alone
    // tells us whether the right-dock should swap to MobileMenuHost.
    const isMobileMenuOpen = useEngineStore((s) => s.mobileActiveMenu !== null);

    const [isSceneReady, setIsSceneReady] = useState(false);
    const [loadingVisible, setLoadingVisible] = useState(true);
    const bootRenderer = useCallback(
        (config: any, camera: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }) => {
            // Cast: generic engine ShaderConfig is structurally compatible with
            // engine-gmt's narrower ShaderConfig (formula optional vs required).
            gmtRenderer.boot(config, camera);
        }, [],
    );
    const pushOffset = useCallback(
        (offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number }) => {
            const proxy = getProxy();
            proxy.setShadowOffset(offset);
            proxy.post({ type: 'OFFSET_SET', offset });
        }, [],
    );
    const isBootedOrRequested = useCallback(() => getProxy().isBooted, []);
    const estimateBootCompileMs = useCallback(
        (state: any) => estimateCompileTime(state),
        [],
    );
    const { startupMode, bootEngine, isHydrated } = useAppStartup(isSceneReady, {
        bootRenderer, pushOffset, isBootedOrRequested, estimateBootCompileMs,
    });
    const handleSceneReady = useCallback(() => setIsSceneReady(true), []);
    const handleLoadingFinished = useCallback(() => setLoadingVisible(false), []);

    // Shared hudRefs — HudOverlay renders DOM elements and attaches
    // refs, Navigation's useFrame reads them to update DST/SPD/reticle
    // each frame. Must survive across renders → useRef.
    const hudRefs = useMemo(() => ({
        container: React.createRef<HTMLDivElement>(),
        speed:     React.createRef<HTMLSpanElement>(),
        dist:      React.createRef<HTMLSpanElement>(),
        reset:     React.createRef<HTMLButtonElement>(),
        reticle:   React.createRef<HTMLDivElement>(),
    }), []);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart: state.handleInteractionStart,
        handleInteractionEnd:   state.handleInteractionEnd,
        openContextMenu:        state.openContextMenu,
    }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

    const floatingPanels = (Object.values(state.panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    const viewportRef = useRef<HTMLDivElement>(null);
    useInteractionManager(viewportRef);
    const { visualRegion, drawPreview, isGhostDragging, renderRegion } = useRegionSelection(viewportRef);
    const { ghostRect: previewGhostRect } = usePreviewTarget(viewportRef);
    const activeRegion = drawPreview || visualRegion || renderRegion;
    const interactionMode = (state as any).interactionMode;
    const isSelectingRegion = interactionMode === 'selecting_region';

    const cameraMode = (state as any).cameraMode ?? 'Orbit';
    // Navigation (Orbit/Fly) calls setSceneOffset whenever the camera
    // moves. Delegate to cameraSlice's action — it updates BOTH the
    // store AND engine.virtualSpace.state in lockstep, then emits
    // OFFSET_SET for the worker forwarder. The previous local
    // implementation here only updated the store; engine.virtualSpace
    // .state stayed stale, so anything reading engine.sceneOffset
    // (CameraUtils.getUnifiedFromEngine, the Key Cam capture path)
    // diverged from the store's sceneOffset (read by timelineUtils
    // .getLiveValue) — making the Key Cam dirty check always fire and
    // the button always render red after any navigation.
    const setSceneOffset = (v: any) => {
        (useEngineStore.getState() as any).setSceneOffset(v);
    };

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
            {/* Pre-shell banner adds scroll capacity so the address bar can
                collapse on first swipe. Renders nothing on desktop. */}
            {!loadingVisible && <MobileScrollIntro title="GMT" subtitle="Swipe up to enter" />}
            <MobileViewportShell className="bg-black text-white select-none overflow-hidden flex flex-col">
                {loadingVisible && (
                    <LoadingScreen
                        isReady={isSceneReady}
                        onFinished={handleLoadingFinished}
                        startupMode={startupMode}
                        bootEngine={bootEngine}
                        isHydrated={isHydrated}
                    />
                )}
                {!loadingVisible && (
                    <>
                        <LandscapeGate />
                        {!state.isBroadcastMode && <MobileControls />}
                    </>
                )}
                <EngineBridge />
                <RenderLoopDriver />
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
                    {(state as any).workshopOpen ? (
                        <React.Suspense fallback={null}>
                            <FormulaWorkshop
                                onClose={() => (state as any).closeWorkshop()}
                                editFormula={(state as any).workshopEditFormula}
                            />
                        </React.Suspense>
                    ) : (
                        !isMobile && <Dock side="left" />
                    )}

                    <ViewportFrame
                        className="flex-1"
                        outerOverlay={
                            <>
                                {/* Bottom HUD region — viewport-area-relative,
                                    doesn't shrink with the canvas in Fixed mode.
                                    Top region (crosshair / reticle) stays inside
                                    children where it follows the canvas. */}
                                <GmtNavigationHud
                                    state={state as any}
                                    actions={state as any}
                                    isMobile={isMobile}
                                    hudRefs={hudRefs}
                                    region="bottom"
                                />
                                <HudHost region="bottom" />
                            </>
                        }
                    >
                        {/* Wrapper div gives useInteractionManager a ref
                            to measure pointer coords against. */}
                        <div ref={viewportRef} className="absolute inset-0">

                        {/* Worker-rendered canvas (GMT's FractalEngine
                            renders into OffscreenCanvas, auto-presents). */}
                        <GmtRendererCanvas
                            width={window.innerWidth}
                            height={window.innerHeight}
                        />

                        {/* R3F scene — transparent overlay that hosts the
                            tick driver (sendRenderTick each frame) + the
                            navigation input handler. */}
                        <Canvas
                            style={{ position: 'absolute', inset: 0 }}
                            camera={{ position: [0, 0, 3], fov: 60 }}
                            gl={{ alpha: true, antialias: false, premultipliedAlpha: false }}
                            onCreated={(s) => {
                                s.gl.setClearColor(0x000000, 0);
                                s.gl.setClearAlpha(0);
                            }}
                        >
                            <GmtRendererTickDriver onLoaded={handleSceneReady} />
                            <GmtNavigation
                                mode={cameraMode}
                                hudRefs={hudRefs}
                                setSceneOffset={setSceneOffset}
                                onStart={(s) => (state as any).pushCameraTransaction(s)}
                                onEnd={() => state.handleInteractionEnd()}
                            />
                        </Canvas>

                        {/* Top HUD region — crosshair + reticle. Lives inside
                            children so it stays canvas-relative (centred on the
                            rendered fractal in Fixed mode). */}
                        <GmtNavigationHud
                            state={state as any}
                            actions={state as any}
                            isMobile={isMobile}
                            hudRefs={hudRefs}
                            region="top"
                        />

                        <HudHost region="top" />

                        {/* DOM viewport overlays — LightGizmo, DrawingOverlay, etc.
                            Iterated from featureRegistry.getViewportOverlays() */}
                        <DomOverlays />

                        {/* Region-selection overlay — mounted inside
                            viewportRef so useRegionSelection's mouse
                            listeners anchor to the same bounds. */}
                        {activeRegion && (
                            <RegionOverlay
                                region={activeRegion}
                                isGhostDragging={isGhostDragging}
                                isDrawing={!!drawPreview}
                                onClear={() => (state as any).setRenderRegion(null)}
                            />
                        )}
                        {isSelectingRegion && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]">
                                Drag to select render region
                            </div>
                        )}

                        {/* Preview Region ghost — follows the cursor while
                            `interactionMode === 'selecting_preview'`. Clicking
                            captures the rect and fires to the worker (handled
                            by usePreviewTarget). */}
                        {previewGhostRect && (
                            <PreviewGhostOverlay region={previewGhostRect} />
                        )}
                        </div>
                    </ViewportFrame>

                    {/* MobileMenuHost is mounted unconditionally — it
                        self-renders nothing when no menu is active, and
                        its mount-effect tells MenuAnchor a host exists
                        (so taps route to the side panel rather than the
                        popover fallback). When active, it takes the
                        right-dock slot; the dock is unmounted to avoid
                        layout doubling. Right dock also hides in Fly
                        mode on mobile for joystick reach. */}
                    <MobileMenuHost />
                    {!isMobileMenuOpen && !(isMobile && cameraMode === 'Fly') && <Dock side="right" />}
                </div>

                {/* Timeline / animation editing is desktop-only — the
                    panel collapses the viewport to ~60px on a phone and
                    the workflow needs precise multi-track interaction
                    that doesn't translate to touch. Skip mounting on
                    mobile entirely. */}
                {!isMobile && <TimelineHost />}

                <HelpOverlay />

                <TutorialRunner />
                <TutorialOverlay />

                <CompilingIndicator />


                <HardwarePrefsHost />

                {/* Histogram readback drivers — only run while there's a
                    consumer mounted (ColoringPanel / Scene panel widgets
                    register+unregister on mount via the connected wrappers
                    in engine-gmt/features/ui.tsx). */}
                {(state as any).histogramActiveCount > 0 && (
                    <HistogramProbe
                        source="geometry"
                        autoUpdate={(state as any).histogramAutoUpdate}
                        trigger={(state as any).histogramTrigger}
                        onUpdate={(state as any).setHistogramData}
                        onLoadingChange={(state as any).setHistogramLoading}
                    />
                )}
                {(state as any).sceneHistogramActiveCount > 0 && (
                    <HistogramProbe
                        source="color"
                        autoUpdate
                        trigger={(state as any).sceneHistogramTrigger}
                        onUpdate={(state as any).setSceneHistogramData}
                    />
                )}

                {state.contextMenu.visible && (
                    <GlobalContextMenu
                        x={state.contextMenu.x}
                        y={state.contextMenu.y}
                        items={state.contextMenu.items}
                        targetHelpIds={state.contextMenu.targetHelpIds}
                        onClose={state.closeContextMenu}
                        onOpenHelp={state.openHelp}
                    />
                )}

            </MobileViewportShell>
        </StoreCallbacksProvider>
    );
};
