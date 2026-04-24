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

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useEngineStore } from '../store/engineStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { useViewportFps, useQualityFraction } from '../engine/plugins/Viewport';
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
import { CompilingIndicator } from '../components/CompilingIndicator';

import { GmtRendererCanvas, GmtRendererTickDriver } from '../engine-gmt';
import { GmtNavigation, GmtNavigationHud } from '../engine-gmt/navigation';

export const AppGmt: React.FC = () => {
    const state     = useEngineStore();
    const quality   = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

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

    const cameraMode = (state as any).cameraMode ?? 'Orbit';
    const setSceneOffset = (v: any) => useEngineStore.setState({ sceneOffset: v } as any);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
            <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
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
                    <Dock side="left" />

                    <ViewportFrame className="flex-1">
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
                            <GmtRendererTickDriver />
                            <GmtNavigation
                                mode={cameraMode}
                                hudRefs={hudRefs}
                                setSceneOffset={setSceneOffset}
                            />
                        </Canvas>

                        {/* DOM HUD overlay — DST/SPD readouts + reticle.
                            Absolutely positioned inside ViewportFrame so
                            it scales with the viewport, not the window. */}
                        <GmtNavigationHud
                            state={state as any}
                            actions={state as any}
                            isMobile={false}
                            hudRefs={hudRefs}
                        />

                        <HudHost />
                    </ViewportFrame>

                    <Dock side="right" />
                </div>

                <TimelineHost />

                <HelpOverlay />

                <CompilingIndicator />

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

                {/* Stats corner — matches fluid-toy/fractal-toy. */}
                <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none">
                    {fpsSmoothed.toFixed(0)} fps · q{(quality * 100).toFixed(0)}%
                </div>
                <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                    GMT · {state.formula || '…'}
                </div>
            </div>
        </StoreCallbacksProvider>
    );
};
