/**
 * GradientExplorerApp — the standalone GMT Gradient Explorer shell.
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

import React, { useMemo, useEffect, Suspense } from 'react';
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
import { ToastHost } from '../engine/components/ToastHost';
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
const STAGE_BLURB: Record<string, { label: string; blurb: string }> = {
  // Favients is a shelf, not a centre-stage mode — its tab shows the saved-gradient
  // shelf in the left dock, so the centre just invites you back to a working mode.
  Favients: { label: 'Favients shelf', blurb: 'Your saved gradients live in the left dock. Pick Generator, Picker, or Image to keep working.' },
};

const Stage: React.FC = () => {
  const activeTab = useEngineStore((s) => s.activeRightTab) as string | null;
  if (activeTab === 'Picker') return <PickerStage />;
  if (activeTab === 'Generator') return <GeneratorStage />;
  if (activeTab === 'Image') return <ImageStage />;

  const active = (activeTab && STAGE_BLURB[activeTab]) || { label: 'GMT Gradient Explorer', blurb: 'Select a tab' };
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-lg font-medium text-zinc-200 mb-2">{active.label}</div>
          <div className="text-sm text-zinc-500">{active.blurb}</div>
        </div>
      </div>
    </div>
  );
};

// Two fixed-width docks (Favients shelf left, mode panel right) plus the centre
// stage don't fit on a narrow window — left alone, both docks keep full width and
// crush the stage to an unusable sliver. This shrinks the docks toward a compact
// width as the window narrows, and collapses the left shelf to its rail when very
// narrow, so the centre stage stays usable. The user's chosen sizes are the upper
// bound (Math.min — we only ever shrink), and every write goes through the
// NON-persisting setState so the responsive compaction never overwrites the saved
// dock-size prefs in localStorage; widening restores the user's real sizes exactly.
const useResponsiveDocks = (): void => {
  useEffect(() => {
    const COMPACT = 1120; // below this, shrink docks toward their compact widths
    const COLLAPSE = 900; // below this, collapse the left shelf to its rail
    const RIGHT_COMPACT = 280; // right dock width between COLLAPSE and COMPACT
    const RIGHT_MIN = 210; // right dock width once the left shelf has collapsed (very narrow)
    const LEFT_COMPACT = 250;

    const s0 = useEngineStore.getState();
    // The user's real, persisted sizes — refreshed whenever the window is fully wide
    // (where the live store reflects their intent, including manual resizes).
    const real = { right: s0.rightDockSize, left: s0.leftDockSize, leftCollapsed: s0.isLeftDockCollapsed };

    const apply = (): void => {
      const w = window.innerWidth;
      const st = useEngineStore.getState();
      if (w >= COMPACT) {
        real.right = st.rightDockSize;
        real.left = st.leftDockSize;
        real.leftCollapsed = st.isLeftDockCollapsed;
      }
      // Once the left shelf collapses to its rail the screen is very narrow, so the
      // right dock can give up the most width to keep the centre stage usable.
      const targetRight = w < COLLAPSE ? Math.min(real.right, RIGHT_MIN)
        : w < COMPACT ? Math.min(real.right, RIGHT_COMPACT)
        : real.right;
      const targetLeft = w < COMPACT ? Math.min(real.left, LEFT_COMPACT) : real.left;
      const targetCollapsed = w < COLLAPSE ? true : real.leftCollapsed;

      const u: Record<string, unknown> = {};
      if (st.rightDockSize !== targetRight) u.rightDockSize = targetRight;
      if (st.leftDockSize !== targetLeft) u.leftDockSize = targetLeft;
      if (st.isLeftDockCollapsed !== targetCollapsed) u.isLeftDockCollapsed = targetCollapsed;
      if (Object.keys(u).length) useEngineStore.setState(u as never);
    };

    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
};

const GradientExplorerApp: React.FC = () => {
  const state = useEngineStore();
  useGlobalContextMenu();
  useResponsiveDocks();

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

          {/* Toasts — save/load + Favients feedback surface here. */}
          <ToastHost />
        </div>
      </div>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerApp;
