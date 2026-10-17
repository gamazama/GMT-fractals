/**
 * DeepZoomApp — the Deep Zoom shell: layout only.
 *
 * fluid-toy's full-shell tree (top bar, docks, viewport frame, floating panels, help, settings,
 * context menu) with the engine's hosts and two things of our own in it: <DeepZoomSurface/>
 * (the picture) and <DeepZoomNavigation/> (the hands that fly it). Everything else the app shows is REGISTERED and drawn by a host: dock tabs
 * through the panel manifest (panels.ts), top-bar items through `topbar.register`, HUD widgets
 * through `hud.register`. Nothing custom is mounted by hand here.
 *
 * What this tree has that fluid-toy's does not:
 *   - <MobileViewportShell> as the root (fluid-toy uses a `fixed inset-0` div): the phone-safe
 *     shell, sticky at the dynamic viewport height. With it, as in app-gmt, the left dock is not
 *     mounted on a phone (the engine's <Dock> re-routes left panels to the right one there).
 *   - <ToastHost/>. The renderer's own notices arrive as `showToast` calls, and a toast shows
 *     nothing without a mounted host.
 *
 * What it must not lose:
 *   - <RenderLoopDriver/> + <EngineBridge/>. The renderer is created with its own frame loop off;
 *     the picture is drawn by a tick (DeepZoomSurface.tsx), and <RenderLoopDriver/> is the only
 *     thing in this app that calls `runTicks`. Without it the picture never draws.
 *     Mount exactly one driver (two is the double-run bug, ADR-0003).
 *   - <TutorialRunner/> + <TutorialOverlay/>: the engine's tutorial, which draws the first-dive
 *     lesson's card (deep-zoom/tutorial/firstDive.ts). Mounted ONCE and for the app's whole life:
 *     the runner keeps its step's listeners until the lesson ends, and an unmount in the middle
 *     of a lesson would leak them (engine/plugins/tutorial/runner.ts, header). With no lesson
 *     active both render nothing.
 *
 * (<TimelineHost/>, the feature overlay host and <SceneFileDropZone/> came with stages 2 and 3,
 * the tutorial's two with the first-run guide; all are mounted below.)
 *
 * `advancedMode` IS SELECTED HERE FOR TWO THINGS. The Diagnostics tab is in the dock in Advanced
 * mode only (panels.ts), and the engine's <Dock> works out which tabs to draw when it renders; it
 * subscribes to nothing that the switch changes. This component renders the docks, so selecting
 * the flag here is what makes the tab come and go at the switch. And Settings' raw storage list
 * (`<SettingsHost storage>`) is shown in Advanced mode only (STREAMLINE.md stage 5).
 *
 * Where the renderer is: this file does not know. The host lives in `deep-zoom/host/current.ts`
 * and only DeepZoomSurface.tsx creates one; `deep-zoom/renderer` is loaded by `deep-zoom/host/`
 * alone (`debug/deep-zoom-checks/host-contract.mts` scans for it).
 */

import React, { useMemo } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { TopBarHost } from '../engine/plugins/TopBar';
import { HudHost } from '../engine/plugins/Hud';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { panelLabel } from '../engine/PanelManifest';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { EngineBridge } from '../components/EngineBridge';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { HelpOverlay } from '../engine/plugins/Help';
import { TutorialOverlay, TutorialRunner } from '../engine/plugins/Tutorial';
import { SettingsHost } from '../components/SettingsAccess';
import { MobileViewportShell } from '../engine/components/MobileViewportShell';
import { ToastHost } from '../engine/components/ToastHost';
import { DeepZoomSurface } from './DeepZoomSurface';
import { DeepZoomNavigation } from './DeepZoomNavigation';
import { FeatureOverlays } from '../engine/plugins/viewport/FeatureOverlays';
import { TimelineHost } from '../components/TimelineHost';
import { SceneFileDropZone } from '../engine/components/SceneFileDropZone';
import { useHostSync } from './useHostSync';
import { GradientSync } from './GradientSync';

export const DeepZoomApp: React.FC = () => {
    // Granular selectors — DO NOT use `useEngineStore()` with no selector
    // here. That would subscribe to the entire store; every feature setter
    // would re-render the whole tree, and a burst of them during a drag
    // trips React's max-depth guard (see FluidToyApp).
    const panels = useEngineStore((s) => s.panels);
    const contextMenu = useEngineStore((s) => s.contextMenu);
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    const closeContextMenu = useEngineStore((s) => s.closeContextMenu);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const openHelp = useEngineStore((s) => s.openHelp);
    // Selected for its re-render alone: the Diagnostics tab is in the dock in Advanced mode only
    // (`showIf: 'advancedMode'`, panels.ts). The engine's <Dock> reads a tab's `showIf` when it
    // renders and subscribes to nothing that the switch changes, so without this the tab came and
    // went only at the next thing that happened to render the dock (seen 2026-10-12). Settings'
    // raw storage list is shown in Advanced mode only too (STREAMLINE.md stage 5).
    const advancedMode = useEngineStore((s) => s.advancedMode);

    // Preference-aware (Force Mobile UI counts): what is mounted, not how it is painted.
    const { isMobile } = useMobileLayout();
    // The store's look values, sent to the renderer (one subscription per mapped feature).
    useHostSync();

    const floatingPanels = (Object.values(panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart,
        handleInteractionEnd,
        openContextMenu,
    }), [handleInteractionStart, handleInteractionEnd, openContextMenu]);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
        <MobileViewportShell className="bg-black text-fg select-none overflow-hidden flex flex-col">
            <EngineBridge />
            <RenderLoopDriver />
            {/* The gradient goes to the renderer as texels, by itself (see its header). */}
            <GradientSync />
            <DropZones />

            {floatingPanels.map((p) => (
                <DraggableWindow key={p.id} id={p.id} title={panelLabel(p.id)}>
                    {/* PanelRouter expects whole-state for its evalShowIf
                        predicates and legacy passthrough. A current snapshot
                        via getState() is enough: PanelRouter's children hold
                        their own per-slice subscriptions. */}
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
                {!isMobile && <Dock side="left" />}

                {/* Mode controls off: in Fixed mode the frame's inner box is a fixed
                    width and height under a CSS scale, which the renderer would read
                    as its size. Declined until the engine has a sink for it (gap E4). */}
                <ViewportFrame className="flex-1" showModeControls={false}>
                    <DeepZoomSurface />
                    {/* GMT's fly navigation, driving the renderer through its host. A sibling
                        of the picture: it draws the look-drag reticle over it. */}
                    <DeepZoomNavigation />
                    <HudHost />
                    {/* The depth scale (the `camera` feature's overlay). A sibling of the
                        picture's frame, never inside it. */}
                    <FeatureOverlays />
                </ViewportFrame>

                <Dock side="right" />
            </div>

            <TimelineHost />
            <SceneFileDropZone />
            <HelpOverlay />
            {/* The first-run guide's card (the engine's tutorial; nothing while no lesson is active). */}
            <TutorialRunner />
            <TutorialOverlay />

            <SettingsHost storage={advancedMode} />

            <ToastHost />

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

        </MobileViewportShell>
        </StoreCallbacksProvider>
    );
};
