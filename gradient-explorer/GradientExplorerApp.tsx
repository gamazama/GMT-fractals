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

import React, { useMemo, useEffect, useState, Suspense } from 'react';
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
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';
import { TimelineHost } from '../components/TimelineHost';
import { ToastHost } from '../engine/components/ToastHost';
import { GradientDropLayer } from './GradientDropLayer';
import { FullscreenGradientOverlay } from './FullscreenGradientOverlay';
import { EngineBridge } from '../components/EngineBridge';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import { PickerStage, SearchIcon } from './PickerStage';
import { GeneratorStage } from '../palette/components/GeneratorStage';
import { ImageStage } from '../palette/components/ImageStage';
import { EditorStage } from './EditorStage';
import { FavientsPanel } from '../palette/components/FavientsPanel';
import { FavientsIcon } from '../palette/components/FavientsIcon';
import { usePickerSearch, setPickerSearch } from '../palette/store/pickerSearch';
import { useActiveHeroMode, closeHeroOptions, deselectActiveHero } from '../palette/store/heroSelection';
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
  if (activeTab === 'Stops') return <EditorStage />;

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

// Below this width the side-dock layout (Favients shelf + mode panel flanking the
// stage) can't fit — we switch to a single-column phone layout instead.
const MOBILE_BREAKPOINT = 768;
const useIsMobile = (): boolean => {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );
  useEffect(() => {
    const on = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return mobile;
};

// Phone mode selector — the three studio modes as a full-width tab bar (the desktop
// right-dock tab strip is the mode selector; on a phone that strip isn't shown).
const MOBILE_MODES: PanelId[] = ['Picker', 'Generator', 'Image', 'Stops'] as PanelId[];
const tabClass = (on: boolean): string =>
  `flex-1 py-2.5 text-[12px] font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
    on ? 'text-cyan-200 border-cyan-400 bg-white/[0.04]' : 'text-gray-400 border-transparent hover:text-gray-200'
  }`;

// Phone mode selector — the three studio modes plus Favients, which on a phone is a
// full-screen tab instead of the desktop side-dock shelf. Selecting a mode also
// closes Favients (collapses its left-dock state) so the mode shows; selecting
// Favients opens it (the content area swaps to the shelf — see the mobile branch).
const MobileModeTabs: React.FC = () => {
  const active = useEngineStore((s) => s.activeRightTab) as string | null;
  const leftCollapsed = useEngineStore((s) => s.isLeftDockCollapsed);
  const favOpen = useEngineStore((s) => (s.panels as Record<string, { isOpen?: boolean }>).Favients?.isOpen ?? false);
  const togglePanel = useEngineStore((s) => s.togglePanel);
  const setDockCollapsed = useEngineStore((s) => s.setDockCollapsed);
  const favShown = !leftCollapsed && favOpen;
  return (
    <div className="shrink-0 flex border-b border-white/10 bg-zinc-950">
      {MOBILE_MODES.map((id) => (
        <button
          key={id}
          onClick={() => { togglePanel(id, true); setDockCollapsed('left', true); }}
          className={tabClass(!favShown && active === id)}
        >
          {id}
        </button>
      ))}
      <button onClick={() => togglePanel('Favients' as PanelId, true)} className={tabClass(favShown)}>
        <FavientsIcon className="text-sm leading-none" />
        Favients
      </button>
    </div>
  );
};

// The Picker's controls are one long scroll (sources, arrange, quality pads, themes).
// On a phone that means scrolling far past the canvas to reach a section, then back up
// to see the result. Split them into three collapsible sections (accordion — opening
// one closes the others) so any section is one tap away and the canvas stays in view.
// The groups are tagged on the paletteFilters feature (no `groupConfigs`, so the
// desktop dock panel is unaffected — it still renders flat).
const PICKER_SECTIONS: { id: string; label: string; group: string }[] = [
  { id: 'sources', label: 'Sources & themes', group: 'sources' },
  { id: 'arrange', label: 'Arrange', group: 'arrange' },
  { id: 'quality', label: 'Quality filters', group: 'quality' },
];

const SectionChevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg className={`w-2.5 h-2.5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 6 10" fill="currentColor">
    <path d="M0 0l6 5-6 5z" />
  </svg>
);

const MobilePickerControls: React.FC = () => {
  const [open, setOpen] = useState<string>('arrange');
  // Search is the primary mobile narrower (the desktop carve/zoom tools are pointer-only),
  // so surface it full-width above the collapsible sections. Shares the transient query
  // with the PickerStage hero field via the pickerSearch store.
  const search = usePickerSearch();
  return (
    <div>
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 h-9 rounded border border-white/10 bg-black/30 px-2">
          <SearchIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Search name · theme · source"
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-gray-200 placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setPickerSearch('')} title="Clear search" className="px-1 text-gray-500 hover:text-gray-200">×</button>
          )}
        </div>
      </div>
      {PICKER_SECTIONS.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="border-b border-white/5">
            <button
              onClick={() => setOpen((o) => (o === s.id ? '' : s.id))}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-2 px-3 py-3 text-left text-[13px] font-medium text-gray-200 hover:bg-white/[0.03] transition-colors"
            >
              <SectionChevron open={isOpen} />
              {s.label}
            </button>
            {isOpen && (
              <div className="pb-2">
                <AutoFeaturePanel featureId="paletteFilters" groupFilter={s.group} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const GradientExplorerApp: React.FC = () => {
  const state = useEngineStore();
  useGlobalContextMenu();
  useResponsiveDocks();
  const isMobile = useIsMobile();
  // The Favients shelf has no side dock on a phone; reuse the same open-state the
  // top-bar Favients button already toggles, surfaced as a slide-in drawer instead.
  const favShown = !state.isLeftDockCollapsed && (state.panels.Favients?.isOpen ?? false);

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

  // While a pick is in hand: a click-away CLOSES the dock but KEEPS the pick — the hero is
  // STICKY (it shows the last picked gradient). Esc DESELECTS (clears the active pick). An
  // empty-WALL click also deselects, but that's handled in the wall (PickerWall.onDeselect),
  // which can tell an empty click from a swatch click — here we only close the dock so that
  // touching other UI doesn't blank the hero.
  const activeMode = useActiveHeroMode();
  useEffect(() => {
    if (!activeMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') deselectActiveHero();
    };
    // Skip a dropbox (`data-gx-keepselect` — it needs the live pick to apply) and a
    // selectable swatch/hero (`data-gx-selectable`); a pointerdown anywhere else just
    // closes the dock (the pick survives).
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('[data-gx-keepselect],[data-gx-selectable]')) return;
      closeHeroOptions();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [activeMode]);

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

          {isMobile ? (
            // Phone: a persistent tab bar (the three modes + Favients), then either the
            // Favients shelf full-screen, or the active mode's full-width stage stacked
            // above its controls in one vertical scroll. No side docks.
            <div className="flex-1 min-h-0 relative flex flex-col">
              <MobileModeTabs />
              {favShown ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <FavientsPanel />
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll relative flex flex-col">
                  <div className="shrink-0 h-[62vh] min-h-[340px] flex flex-col">
                    <Stage />
                  </div>
                  <div className="shrink-0 border-t border-white/10 bg-zinc-950">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-500 bg-black/30 border-b border-white/5">
                      {(state.activeRightTab as string) ?? 'Mode'} controls
                    </div>
                    {state.activeRightTab === 'Picker' ? (
                      <MobilePickerControls />
                    ) : (
                      <PanelRouter
                        activeTab={state.activeRightTab as PanelId}
                        state={state}
                        actions={state}
                        onSwitchTab={(t) => state.togglePanel(t, true)}
                      />
                    )}
                  </div>
                </div>
              )}
              <HudHost />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden relative">
              <Dock side="left" />
              <Stage />
              <HudHost />
              <Dock side="right" />
            </div>
          )}

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

          {/* P2-A "select → reveal → place": final dropboxes (anchored + bottom wells),
              the derived intermediate tab steps, and the drag avatar. Inert unless a
              gradient is selected or a gradient drag is in flight. */}
          <GradientDropLayer />
          <FullscreenGradientOverlay />
        </div>
      </div>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerApp;
