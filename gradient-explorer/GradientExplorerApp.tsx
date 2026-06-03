/**
 * PaletteStudioApp — the standalone Palette Studio shell.
 *
 * Reuses the engine UI chrome (TopBar + Dock + AutoFeaturePanel + context menu +
 * floating panels) but has NO raymarcher viewport: unlike fluid/fractal toys, the
 * palette tools each own their own surface, so the centre is a mode-tabbed stage
 * (Generator / Picker / Image) instead of a single fractal canvas. The decision
 * to feed GMT's gradient system (rather than render fractals here) is why the
 * heavy bootEngine / RenderLoop / EngineBridge path is intentionally absent.
 *
 * This first cut proves the shell + the DDFS custom-UI path: the Quality-Filters
 * panel docks left and renders the QualityRangePad pads with native GMT chrome.
 * Mode content is placeholder until the generator/picker/img2grad UIs land.
 */

import React, { useMemo, Suspense } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useGlobalContextMenu } from '../hooks/useGlobalContextMenu';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { TopBarHost } from '../engine/plugins/TopBar';
import { HudHost } from '../engine/plugins/Hud';
import { HelpOverlay } from '../engine/plugins/Help';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { TimelineHost } from '../components/TimelineHost';
import { EngineBridge } from '../components/EngineBridge';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import { PickerStage } from './PickerStage';
import { GeneratorStage } from '../palette/components/GeneratorStage';
import { ImageStage } from '../palette/components/ImageStage';
import type { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';

const HelpBrowser = React.lazy(() => import('../components/HelpBrowser'));

// The centre stage mirrors the active right-dock tab (the studio "mode"). The
// dock tab strip IS the mode selector — no bespoke tab bar.
const STAGE_BLURB: Record<string, { label: string; blurb: string }> = {};

const Stage: React.FC = () => {
  const activeTab = useEngineStore((s) => s.activeRightTab) as string | null;
  if (activeTab === 'Picker') return <PickerStage />;
  if (activeTab === 'Generator') return <GeneratorStage />;
  if (activeTab === 'Image') return <ImageStage />;

  const active = (activeTab && STAGE_BLURB[activeTab]) || { label: 'Palette Studio', blurb: 'Select a tab' };
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-lg font-medium text-zinc-200 mb-2">{active.label}</div>
          <div className="text-sm text-zinc-500">{active.blurb}</div>
          <div className="mt-6 text-xs text-zinc-600 font-mono">stage UI coming · shell + DDFS panels live</div>
        </div>
      </div>
    </div>
  );
};

const PaletteStudioApp: React.FC = () => {
  const state = useEngineStore();
  useGlobalContextMenu();

  const floatingPanels = (Object.values(state.panels) as PanelState[]).filter(
    (p) => p.location === 'float' && p.isOpen,
  );

  const storeCallbacks = useMemo<StoreCallbacks>(
    () => ({
      handleInteractionStart: state.handleInteractionStart,
      handleInteractionEnd: state.handleInteractionEnd,
      openContextMenu: state.openContextMenu,
    }),
    [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu],
  );

  return (
    <StoreCallbacksProvider value={storeCallbacks}>
      <div className="fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col">
        {/* EngineBridge connects the animation engine to the store; RenderLoopDriver
            runs the TickRegistry each frame so the timeline plays + keyframes apply. */}
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

        <div
          className="relative bg-black select-none flex flex-col w-full h-full"
          onContextMenu={(e) => e.preventDefault()}
        >
          <TopBarHost />

          <div className="flex-1 flex overflow-hidden relative">
            <Dock side="left" />
            <Stage />
            <HudHost />
            <Dock side="right" />
          </div>

          <HelpOverlay />

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
          {state.helpWindow.visible && (
            <Suspense fallback={null}>
              <HelpBrowser
                activeTopicId={state.helpWindow.activeTopicId}
                onClose={state.closeHelp}
                onNavigate={state.openHelp}
              />
            </Suspense>
          )}

          {/* Timeline — params keyed via the slider diamonds animate here. */}
          <TimelineHost />
        </div>
      </div>
    </StoreCallbacksProvider>
  );
};

export default PaletteStudioApp;
