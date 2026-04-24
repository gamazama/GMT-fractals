/**
 * FractalToyApp — root component.
 *
 * Layout mirrors the engine's App.tsx skeleton: ViewportFrame +
 * right-dock for the feature panels, plus floating windows and
 * DropZones for drag-out / drag-back. Panels land in the dock via
 * setup.ts auto-layout — the tab system is the engine's standard
 * Dock + PanelRouter.
 *
 * The renderer is a plugin. `<FractalRendererCanvas />` owns the
 * WebGL canvas + engine lifetime + shader rebuilds + uniform dispatch,
 * so this component stays purely layout-level. Swapping to a future
 * worker-mode renderer is a one-line import change.
 */

import React, { useMemo } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { TimelineHost } from '../components/TimelineHost';
import { TopBarHost } from '../engine/plugins/TopBar';
import { EngineBridge } from '../components/EngineBridge';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { FractalRendererCanvas } from './renderer';
import { useViewportFps, useQualityFraction, ViewportFrame } from '../engine/plugins/Viewport';

export const FractalToyApp: React.FC = () => {
    const state = useEngineStore();
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart: state.handleInteractionStart,
        handleInteractionEnd:   state.handleInteractionEnd,
        openContextMenu:        state.openContextMenu,
    }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

    const floatingPanels = (Object.values(state.panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
            <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
                <EngineBridge />
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
                    <ViewportFrame>
                        <FractalRendererCanvas />
                    </ViewportFrame>

                    <Dock side="right" />
                </div>

                <TimelineHost />

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

                <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none">
                    {fpsSmoothed.toFixed(0)} fps · q{(quality * 100).toFixed(0)}%
                </div>
                <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                    Fractal Toy · {state.formula || '…'}
                </div>
            </div>
        </StoreCallbacksProvider>
    );
};
