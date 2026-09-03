/**
 * GradientExplorerV2App — the streamlined shell (plans/ge-v2-design.md §6b, mock B).
 *
 * Top to bottom: a six-item top bar · the Working hero (hidden until the first pick; it IS
 * the stops editor, with the palette row on top and Curves / Adjust expanders inside it) ·
 * the stage with three source tabs · the silent My Gradients row (hidden until Recent has
 * something). No Dock, no side panel, no drawer, no timeline, no scene name.
 *
 * Source switching is where the pipeline rules live (§2):
 *   • entering Build / Extract sets the working INPUT to that live source;
 *   • LEAVING a live source commits its result as a fixed working gradient (and so lands it
 *     in Recent) — the hero keeps showing what you just made;
 *   • Browse never touches Working; a wall click is a candidate the hero previews.
 *
 * Browse is the v2 `BrowseStage` (S1): the wall as a canvas, search + one Filters popover,
 * no hero of its own. Build and Extract are the v2 `BuildStage` / `ExtractStage` (S3): thin
 * v2 compositions over the SAME GeneratorStage / ImageStage pieces (SourceRow, MixBlend,
 * ColorBoxControls, the image pane) — see those files' headers — with no per-mode hero, no
 * curve editor, no Modify/Noise, no export block; Adjust and Shape live on the hero above.
 * The bottom row is the existing FavientsPanel body; Export and Share are placeholders
 * until their pieces land.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useGlobalContextMenu } from '../../hooks/useGlobalContextMenu';
import GlobalContextMenu from '../../components/GlobalContextMenu';
import { StoreCallbacksProvider, type StoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { ToastHost } from '../../engine/components/ToastHost';
import { SettingsHost, SettingsButton } from '../../components/SettingsAccess';
import { GmtWordmark } from '../../engine-gmt/topbar/GmtWordmark';
import { showToast } from '../../engine/store/toastStore';
import { BrowseStage } from './BrowseStage';
import { BuildStage } from './BuildStage';
import { ExtractStage } from './ExtractStage';
import { FavientsPanel } from '../../palette/components/FavientsPanel';
import { FullscreenGradientOverlay } from '../FullscreenGradientOverlay';
import { openFullscreen } from '../../palette/store/fullscreenStore';
import { useActiveHeroSelection, deselectActiveHero } from '../../palette/store/heroSelection';
import { useWorkingStore, useWorkingDerived, deriveWorkingNow, autoWorkingName } from '../../palette/store/workingStore';
import { useGeneratorStore, readGeneratorSlice, setGeneratorSlice } from '../../palette/store/generatorStore';
import { useFavientsStore, favientSig } from '../../palette/store/favientsStore';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { useArmedSlot, armSlot, getArmedSlot } from '../../palette/store/armedTarget';
import { useImageDrop } from '../../palette/components/useImageDrop';
import { WorkingHero } from './WorkingHero';
import { VariantsMenu } from './VariantsMenu';

export type SourceId = 'browse' | 'build' | 'extract';
const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'build', label: 'Mix' },
  { id: 'extract', label: 'Image' },
];

const tb = 'h-8 px-3 rounded-lg text-[13px] text-fg-muted hover:text-fg hover:bg-white/5 transition-colors';

const workingNameNow = (): string => {
  const s = useWorkingStore.getState();
  return s.name ?? autoWorkingName(s.input, s.bakedFrom);
};

/**
 * Entering Mix (owner S3 review): A = the hero's gradient, B = the most recent OTHER entry in
 * My Gradients (falling back to whatever B already holds), B armed so a bin click swaps it.
 * Always the two-source mixer — Sweep is gone from v2, so a document that still carries
 * generatorMode 1 or 2 is put back on 0 here.
 */
const enterMix = (): void => {
  const w = useWorkingStore.getState();
  const g = useGeneratorStore.getState();
  const gs = readGeneratorSlice();
  if ((gs.generatorMode ?? 0) !== 0) setGeneratorSlice({ generatorMode: 0 });
  // Fully A to start (owner): the crossfade between the A and B bands is the gesture.
  if (gs.mixL || gs.mixC || gs.mixH) setGeneratorSlice({ mixL: 0, mixC: 0, mixH: 0 });
  const d = deriveWorkingNow();
  if (d) {
    w.syncRecent();
    g.sendRampToSlot('A', d.ramp, workingNameNow());
    const aSig = favientSig(d.config);
    const other = useFavientsStore.getState().favients.find((f) => favientSig(f.config) !== aSig);
    if (other) g.sendRampToSlot('B', renderStopsToRamp(other.config.stops, other.config.blendSpace, other.config.colorSpace), other.name);
  }
  w.setInput({ kind: 'build' });
  armSlot('B');
};

export const GradientExplorerV2App: React.FC = () => {
  const [source, setSourceState] = useState<SourceId>('browse');
  const [mineOpen, setMineOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const derived = useWorkingDerived();
  const candidate = useActiveHeroSelection();
  const recentCount = useFavientsStore((s) => s.favients.length);
  const armed = useArmedSlot();
  useGlobalContextMenu();
  const contextMenu = useEngineStore((s) => s.contextMenu);
  const closeContextMenu = useEngineStore((s) => s.closeContextMenu);
  const openHelp = useEngineStore((s) => s.openHelp);
  // The shared stops editor brackets undo and opens its right-click menus through this
  // context (the old shell provides the same three callbacks).
  const storeCallbacks = useMemo<StoreCallbacks>(() => {
    const st = useEngineStore.getState();
    return { handleInteractionStart: st.handleInteractionStart, handleInteractionEnd: st.handleInteractionEnd, openContextMenu: st.openContextMenu };
  }, []);

  // A pick IS a Use (owner, end of 2026-09-03): a wall or shelf click becomes the working
  // gradient at once (one undo step back to the previous one) and opens a new Recent
  // session. The same gradient picked again is a no-op.
  //
  // ARMED TARGETS (§3): when a Mix slot is armed (entering Mix arms B; clicking a slot arms
  // it — see BuildStage), the NEXT pick fills that slot instead — checked first, so an
  // armed pick never touches Working. A My Gradients pick keeps the slot armed (try
  // several); a Browse pick is one-shot and comes back to Mix.
  const sourceRef = useRef(source);
  sourceRef.current = source;
  useEffect(() => {
    if (!candidate) return;
    const p = candidate.payload;
    // On the Mix tab a pick always lands in a slot — B unless A is armed.
    const slot = getArmedSlot() ?? (sourceRef.current === 'build' ? 'B' : null);
    if (slot) {
      const ramp = renderStopsToRamp(p.config.stops, p.config.blendSpace, p.config.colorSpace);
      useGeneratorStore.getState().sendRampToSlot(slot, ramp, p.name);
      if (candidate.mode !== 'favients') armSlot(null);
      // Working goes live over Mix again (it may have been fixed by leaving the Mix tab to
      // browse for this pick) so the hero shows the new blend immediately.
      if (useWorkingStore.getState().input.kind !== 'build') useWorkingStore.getState().setInput({ kind: 'build' });
      deselectActiveHero();
      setSourceState('build');
      return;
    }
    const w = useWorkingStore.getState();
    if (w.input.kind === 'gradient' && favientSig(w.input.config) === favientSig(p.config)) return;
    const fromRecent = candidate.mode === 'favients';
    w.use(p.config, p.name, p.source ?? (fromRecent ? 'My Gradients' : 'Browse'), { fromRecent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.key, candidate?.mode]);

  // My Gradients follows the work (owner S3 review): every change to the derived output or
  // the name lands in the session's Recent entry, debounced past a drag.
  useEffect(() => {
    if (derived.empty) return;
    const t = window.setTimeout(() => useWorkingStore.getState().syncRecent(), 400);
    return () => window.clearTimeout(t);
  }, [derived.config, derived.name, derived.empty]);

  const switchSource = useCallback(
    (next: SourceId) => {
      if (next === source) return;
      const w = useWorkingStore.getState();
      if ((source === 'build' || source === 'extract') && w.input.kind === source) {
        const d = deriveWorkingNow();
        if (d) w.use(d.config, workingNameNow(), source === 'build' ? 'Mix' : 'Image');
      }
      if (next === 'build') enterMix();
      else if (next === 'extract') w.setInput({ kind: 'extract' });
      if (next !== 'build' && next !== 'browse') armSlot(null);
      deselectActiveHero();
      setSourceState(next);
    },
    [source],
  );

  // An image dropped/pasted ANYWHERE in the shell routes to Extract (§5.4) — a second
  // useImageDrop instance mounted once here at the root; ImageStage keeps its own for the
  // old shell / app-gmt (see palette/components/useImageDrop.ts).
  useImageDrop({ onLoaded: () => switchSource('extract') });

  // Esc closes the variants popover, or — failing that — clears an armed slot (§3) without
  // picking anything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (variantsOpen) { setVariantsOpen(false); return; }
      if (getArmedSlot()) armSlot(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variantsOpen]);

  const undo = () => (useEngineStore.getState() as unknown as { undoParam?: () => void }).undoParam?.();
  const redo = () => (useEngineStore.getState() as unknown as { redoParam?: () => void }).redoParam?.();
  const wallpaper = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().syncRecent();
    openFullscreen(derived.config, derived.name);
  };

  return (
    <StoreCallbacksProvider value={storeCallbacks}>
    <div className="fixed inset-0 bg-black text-fg select-none flex flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* top bar */}
      <header className="h-12 shrink-0 flex items-center gap-1.5 px-4 bg-surface-dock border-b border-line/10">
        <a href="app-gmt.html" className="flex items-center gap-2 mr-auto no-underline" title="GMT">
          <GmtWordmark className="h-3.5 w-auto opacity-80" />
          <span className="text-[15px] font-semibold text-fg">Gradient Explorer</span>
          <span className="text-[11px] text-fg-dim border border-line/20 rounded px-1">next</span>
        </a>
        <button className={`${tb} w-8 px-0`} title="Undo (Ctrl+Z)" onClick={undo}>↶</button>
        <button className={`${tb} w-8 px-0`} title="Redo (Ctrl+Y)" onClick={redo}>↷</button>
        <button className={`${tb} ${variantsOpen ? 'text-fg bg-white/5' : ''}`} onClick={() => setVariantsOpen((o) => !o)} title="Snapshots of the whole studio — switch, or tween between two">
          Variants
        </button>
        <button className={tb} onClick={() => showToast('Share lands in Phase 2')}>Share</button>
        <button className={tb} onClick={() => showToast('The Export dialog lands in Phase 2')}>Export</button>
        <button className={`${tb} text-fg border border-line/20`} onClick={wallpaper}>Wallpaper</button>
        <SettingsButton />
      </header>

      <WorkingHero derived={derived} source={source} />

      {/* stage */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <div className="shrink-0 flex items-center gap-2 px-6 py-2.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              className={`px-4 py-2 rounded-[10px] text-[15px] transition-colors ${source === s.id ? 'text-fg bg-white/[0.07]' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => switchSource(s.id)}
              data-gx-mode-tab={s.id}
            >
              {s.label}
            </button>
          ))}
          {armed && source === 'browse' && (
            <span className="ml-4 text-[12px] text-accent-300">Pick a gradient for Mix slot {armed} · Esc cancels</span>
          )}
          {!armed && derived.empty && source === 'browse' && (
            <span className="ml-4 text-[12px] text-fg-dim">Click any gradient below. It previews above; Use it, mix it, or keep looking.</span>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col relative">
          {source === 'browse' && <BrowseStage />}
          {source === 'build' && <BuildStage />}
          {source === 'extract' && <ExtractStage />}
        </div>
      </div>

      {/* My Gradients (§4): ONE strip on the bottom edge — Recent first, then the groups as
          labelled runs (FavientsPanel layout="strip"); pull up for the full panel (search,
          list view, rename, import / export). Silent until there is something in it. */}
      {recentCount > 0 && (
        <footer className="shrink-0 bg-surface-dock border-t border-line/10 flex flex-col" style={{ height: mineOpen ? 340 : 88 }}>
          <div className="flex items-center gap-3 px-6 pt-1.5 text-[12px] text-fg-dim">
            <b className="text-fg-muted font-semibold">My Gradients</b>
            {mineOpen && <span>Recent fills itself as you work · drag a gradient into a group to keep it · shared with the GMT studio</span>}
            <button className="ml-auto hover:text-fg" onClick={() => setMineOpen((o) => !o)} title={mineOpen ? 'Back to the strip' : 'Search, list view, rename, import and export'}>
              {mineOpen ? '▾ less' : '▴ more'}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {mineOpen ? <FavientsPanel hint={null} /> : <FavientsPanel layout="strip" />}
          </div>
        </footer>
      )}

      {variantsOpen && <VariantsMenu derived={derived} onClose={() => setVariantsOpen(false)} />}
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
      <SettingsHost />
      <ToastHost />
      <FullscreenGradientOverlay />
    </div>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerV2App;
