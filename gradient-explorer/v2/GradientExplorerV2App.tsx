/**
 * GradientExplorerV2App — the streamlined shell (plans/ge-v2-design.md §6b, mock B).
 *
 * Top to bottom: the top bar — which is for the APP, not the gradient (L2), so since Phase B
 * it is brand · undo · redo · Variants (until Phase D) · Back to GMT · settings, and ★ Keep /
 * Share / Export / Wallpaper live in the hero's use cluster · the Working hero (absent until
 * the first pick, and never unmounted after it — L8; it IS the stops editor, with the palette
 * row on top and Curves / Adjust expanders inside it) ·
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
 * The bottom row is the FavientsPanel strip (§4); Export is ExportMenu, Share is shareUrl (hooked up 2026-09-06)
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
import type { TrayFace } from './Tray';
import { FavientsPanel } from '../../palette/components/FavientsPanel';
import { FullscreenGradientOverlay } from '../FullscreenGradientOverlay';
import { openFullscreen } from '../../palette/store/fullscreenStore';
import { useActiveHeroSelection, deselectActiveHero, usePickSerial } from '../../palette/store/heroSelection';
import { useWorkingStore, useWorkingDerived, deriveWorkingNow, autoWorkingName } from '../../palette/store/workingStore';
import { usePaletteEditorStore } from '../../palette/store/paletteEditorStore';
import { usePickerStore } from '../../palette/store/pickerStore';
import type { SeedStop } from '../../palette/core/workingPipeline';
import type { GradientConfig } from '../../types';
import { useGeneratorStore, readGeneratorSlice, setGeneratorSlice, slotSnapshot } from '../../palette/store/generatorStore';
import { useFavientsStore, favientSig } from '../../palette/store/favientsStore';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { useArmedSlot, armSlot, getArmedSlot } from '../../palette/store/armedTarget';
import { useImageDrop } from '../../palette/components/useImageDrop';
import { useImageStore } from '../../palette/store/imageStore';
import { WorkingHero } from './WorkingHero';
import { VariantsMenu } from './VariantsMenu';
import { ExportMenu } from './ExportMenu';
import { shareUrlFor, takeShareFromLocation, cameFromGmt } from './shareUrl';
import { Icon } from './ui/Icon';
import { ZoneLabel } from './ui/ZoneLabel';

export type SourceId = 'browse' | 'build' | 'extract';
/** Phase C: the source follows the TRAY — the Mix face is the `build` input, the Image face
 *  the `extract` input, every other face (or none) is Browse. There are no source tabs. */
const sourceOf = (face: TrayFace): SourceId => (face === 'mix' ? 'build' : face === 'image' ? 'extract' : 'browse');

const tb = 'h-8 px-3 rounded-lg text-[13px] text-fg-muted hover:text-fg hover:bg-line/10 transition-colors';

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
  // The stops your gradient already has seed every bake's fit, so mixing and baking
  // again does not walk them (grep seedPositions in palette/core/stopFit.ts).
  w.goLive({ kind: 'build', seeds: d ? d.config.stops.map((s) => ({ position: s.position, interpolation: s.interpolation, bias: s.bias })) : [] });
  armSlot('B');
};

/** Add the other gradient's stops to the Mix input's seeds (a pick filled a bar). */
const addMixSeeds = (stops: GradientConfig['stops']): void => {
  const w = useWorkingStore.getState();
  const cur: SeedStop[] = w.input.kind === 'build' ? w.input.seeds ?? [] : [];
  const byTexel = new Map<number, SeedStop>();
  for (const s of [...cur, ...stops.map((s) => ({ position: s.position, interpolation: s.interpolation, bias: s.bias }))]) {
    const i = Math.round(s.position * 255);
    // a step edge wins over a linear seed on the same texel
    if (!byTexel.has(i) || s.interpolation === 'step') byTexel.set(i, { position: i / 255, interpolation: s.interpolation, bias: s.bias });
  }
  useWorkingStore.setState({ input: { kind: 'build', seeds: Array.from(byTexel.values()).sort((a, b) => a.position - b.position) } });
};

export const GradientExplorerV2App: React.FC = () => {
  const [tray, setTray] = useState<TrayFace>(null);
  const source = sourceOf(tray);
  const [mineOpen, setMineOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const derived = useWorkingDerived();
  const candidate = useActiveHeroSelection();
  const pickSerial = usePickSerial();
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
  // session. That is the PREVIEW; the SAME gradient clicked again KEEPS it — bakes it into
  // the editable stops document (owner, later that day: "apply / bake the preview on the
  // 2nd click"). A third click, or a click on it once baked, is a no-op.
  //
  // ARMED TARGETS (§3): when a Mix slot is armed (entering Mix arms B; clicking a slot arms
  // it — see BuildStage), the NEXT pick fills that slot instead — checked first, so an
  // armed pick never touches Working. A My Gradients pick keeps the slot armed (try
  // several); a Browse pick is one-shot and comes back to Mix.
  const trayRef = useRef<TrayFace>(tray);
  trayRef.current = tray;
  useEffect(() => {
    if (!candidate) return;
    const p = candidate.payload;
    // On the Mix tab a pick always lands in a slot — B unless A is armed.
    const slot = getArmedSlot() ?? (trayRef.current === 'mix' ? 'B' : null);
    if (slot) {
      const ramp = renderStopsToRamp(p.config.stops, p.config.blendSpace, p.config.colorSpace);
      useGeneratorStore.getState().sendRampToSlot(slot, ramp, p.name);
      if (candidate.mode !== 'favients') armSlot(null);
      // Working goes live over Mix again (it may have been fixed by leaving the Mix tab to
      // browse for this pick) so the hero shows the new blend immediately.
      if (useWorkingStore.getState().input.kind !== 'build') useWorkingStore.getState().goLive({ kind: 'build' });
      addMixSeeds(p.config.stops);
      deselectActiveHero();
      setTray('mix');
      return;
    }
    const w = useWorkingStore.getState();
    const sig = favientSig(p.config);
    if (w.input.kind === 'gradient' && favientSig(w.input.config) === sig) {
      w.beginEdit();
      return;
    }
    if (w.input.kind === 'stops' && w.bakedFrom?.input.kind === 'gradient' && favientSig(w.bakedFrom.input.config) === sig) return;
    const fromRecent = candidate.mode === 'favients';
    w.use(p.config, p.name, p.source ?? (fromRecent ? 'My Gradients' : 'Browse'), { fromRecent });
    // A pick while the Image face is open replaces the image as the source: the face closes
    // (owner, 2026-09-07). `use` already replaced the input, so no bake, just the tray.
    if (trayRef.current === 'image') setTray(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.key, candidate?.mode, pickSerial]);

  // My Gradients follows the work (owner S3 review): every change to the derived output or
  // the name lands in the session's Recent entry, debounced past a drag.
  useEffect(() => {
    if (derived.empty) return;
    const t = window.setTimeout(() => useWorkingStore.getState().syncRecent(), 400);
    return () => window.clearTimeout(t);
  }, [derived.config, derived.name, derived.empty]);

  // Open a tray face (the same face again closes it). Mix and Image are SOURCES, so
  // crossing between them and Browse does what the source tabs did (Phase B): leaving a
  // live Mix / Image commits it with `use`; entering Mix runs enterMix (arms B); entering
  // Image puts the extract input live. Leaving Mix disarms — the wall is B's picker only
  // while the Mix face is open.
  const openTray = useCallback((next: TrayFace) => {
    const cur = trayRef.current;
    const face: TrayFace = cur === next ? null : next;
    const from = sourceOf(cur);
    const to = sourceOf(face);
    const w = useWorkingStore.getState();
    // ONE rule for every face (C.3, owner: "the default will be to bake after switching from
    // any mode"): leaving Curves or Adjust with something applied folds it into the stops
    // (beginEdit — the chip then offers "return to source" as the cancel). Untouched dials
    // fold nothing. First, so a face left for Mix hands Mix the baked gradient, not live
    // curves that would apply again over the blend.
    if ((cur === 'curves' || cur === 'adjust') && face !== cur) {
      const d = deriveWorkingNow();
      const gen = useGeneratorStore.getState();
      if (cur === 'curves' && gen.tracks && !gen.tracksEdited) {
        // an UNTOUCHED fit (Curves opened, looked at, closed) is the source restated: no
        // bake — the fit just goes, and the gradient stays what it was
        useGeneratorStore.setState({ tracks: null, curvesOn: false });
      } else if (d && !d.passthrough && w.input.kind !== 'build' && w.input.kind !== 'extract') w.beginEdit();
    }
    if (from !== to) {
      if ((from === 'build' || from === 'extract') && w.input.kind === from) {
        const d = deriveWorkingNow();
        // An UNTOUCHED mix (all three blends still at 0) is your gradient unchanged: it keeps
        // its own name. Otherwise the result is "yours × the other" — measured 2026-09-07:
        // without this, toggling Mix on and off grew the name by "× Greyscale" every time.
        const gs = readGeneratorSlice();
        const untouched = from === 'build' && !gs.mixL && !gs.mixC && !gs.mixH;
        const name = untouched ? slotSnapshot(useGeneratorStore.getState().slotA).name : workingNameNow();
        // `bakes`: the result carries Adjust + curves, so they reset with it (see `use`).
        if (d) w.use(d.config, name, from === 'build' ? 'Mix' : 'Image', { bakes: true });
      }
      if (to === 'build') enterMix();
      else if (to === 'extract') w.goLive({ kind: 'extract' });
      if (to !== 'build') armSlot(null);
      deselectActiveHero();
    }
    setTray(face);
  }, []);

  // Cancel the open face (C.3 / C.9 — the state chip, or a click on the ramp's SOURCE
  // half): what was there before the face comes back and the face closes WITHOUT baking
  // (so not openTray, which would commit it). Bake = openTray(null): leaving commits.
  const cancelFace = useCallback(() => {
    useWorkingStore.getState().cancelFace();
    armSlot(null);
    deselectActiveHero();
    setTray(null);
  }, []);
  const bakeFace = useCallback(() => openTray(null), [openTray]);

  // An image dropped/pasted ANYWHERE in the shell routes to Extract (§5.4) — a second
  // useImageDrop instance mounted once here at the root; ImageStage keeps its own for the
  // old shell / app-gmt (see palette/components/useImageDrop.ts).
  // Image asks for an image before it takes over (owner, 2026-09-07): with no image loaded,
  // the Image tab (and the slot) open the file dialog; the source switches only when one
  // arrives (`onLoaded`) — cancel the dialog and nothing changes. Drop / paste anywhere
  // still routes here.
  const { fileToImg } = useImageDrop({ onLoaded: () => { if (trayRef.current !== 'image') openTray('image'); } });
  const imageFileRef = useRef<HTMLInputElement>(null);
  const requestImageOrOpen = useCallback(() => {
    if (trayRef.current === 'image' || useImageStore.getState().model) openTray('image');
    else imageFileRef.current?.click();
  }, [openTray]);

  // Esc order (Phase C, L6): popover → the open tray face (the inspector closes by clearing
  // the stop selection, which the hero does when the face leaves) → an armed slot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (variantsOpen) { setVariantsOpen(false); return; }
      if (trayRef.current) { openTray(null); return; }
      if (getArmedSlot()) armSlot(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variantsOpen, openTray]);

  // A debug handle for the smokes (smoke:ge-tray dumps the baked gradient on a drift).
  useEffect(() => {
    (window as unknown as { __gxWorking?: () => unknown }).__gxWorking = () => ({ config: deriveWorkingNow()?.config ?? usePaletteEditorStore.getState().config, input: useWorkingStore.getState().input });
  }, []);

  const undo = () => (useEngineStore.getState() as unknown as { undoParam?: () => void }).undoParam?.();
  const redo = () => (useEngineStore.getState() as unknown as { redoParam?: () => void }).redoParam?.();
  // A share link opens straight into Working (once, on boot; the param is stripped).
  useEffect(() => {
    const shared = takeShareFromLocation();
    if (shared) useWorkingStore.getState().use(shared.config, shared.name, 'Shared link');
  }, []);
  const share = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().syncRecent();
    const url = shareUrlFor(derived.config, derived.name);
    navigator.clipboard?.writeText(url).then(
      () => showToast('Link copied — it opens this gradient'),
      () => window.prompt('Copy this link', url),
    );
  };
  const exportOpenToggle = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    setExportOpen((o) => !o);
  };
  const wallpaper = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().syncRecent();
    openFullscreen(derived.config, derived.name);
  };

  return (
    <StoreCallbacksProvider value={storeCallbacks}>
    <div className="fixed inset-0 bg-surface text-fg select-none flex flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* top bar */}
      <header className="h-12 shrink-0 flex items-center gap-1.5 px-4 bg-surface-dock border-b border-line/10">
        <a href="app-gmt.html" className="flex items-center gap-2 mr-auto no-underline" title="GMT">
          <GmtWordmark className="h-3.5 w-auto opacity-80" />
          <span className="text-[15px] font-semibold text-fg">Gradient Explorer</span>
          <span className="text-[11px] text-fg-dim border border-line/20 rounded px-1">next</span>
        </a>
        <button className={`${tb} w-8 px-0 flex items-center justify-center`} title="Undo (Ctrl+Z)" onClick={undo}><Icon name="undo" size={24} /></button>
        <button className={`${tb} w-8 px-0 flex items-center justify-center`} title="Redo (Ctrl+Y)" onClick={redo}><Icon name="redo" size={24} /></button>
        {/* Variants stays on the bar until Phase D moves it to the shelf as Snapshots (L4). */}
        <button className={`${tb} ${variantsOpen ? 'text-fg bg-line/10' : ''}`} onClick={() => setVariantsOpen((o) => !o)} title="Snapshots of the whole studio — switch, or tween between two">
          Variants
        </button>
        {/* Back to GMT is a plain link (owner, 2026-09-07): the working gradient is already
            in GMT's My Gradients panel through the shared `gmt.favients` Recent group, so
            the link carries nothing. Only shown when this page was opened from the studio. */}
        {cameFromGmt && (
          <a className={`${tb} flex items-center no-underline`} href="app-gmt.html" title="Back to the GMT studio">
            Back to GMT
          </a>
        )}
        <SettingsButton />
      </header>

      <div className="shrink-0">
      <WorkingHero
        derived={derived}
        source={source}
        tray={tray}
        onTray={(face) => (face === 'image' ? requestImageOrOpen() : openTray(face))}
        onCancelFace={cancelFace}
        onBake={bakeFace}
        onShare={share}
        onExport={exportOpenToggle}
        onWallpaper={wallpaper}
        exportOpen={exportOpen}
        exportMenu={
          exportOpen && derived.ramp ? (
            <ExportMenu
              ramp={derived.ramp}
              name={derived.name}
              colorSpace={derived.config?.colorSpace}
              onColorSpace={(id) => {
                // the profile is part of the stops document: editing it bakes first (as a
                // stop edit would), then the document takes the profile
                const w = useWorkingStore.getState();
                if (w.input.kind !== 'stops') w.beginEdit();
                const cur = usePaletteEditorStore.getState().config;
                usePaletteEditorStore.getState().setConfig({ ...cur, colorSpace: id });
              }}
              onClose={() => setExportOpen(false)}
              positionClass="absolute right-2.5 top-[56px] z-40"
            />
          ) : null
        }
      />
      </div>

      {/* stage — the ground */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* the ground is ALWAYS the wall (L3, Phase C) — the tray floats over it. One line
            above it only when it has something to say. */}
        {(armed || derived.empty) && (
          <div className="shrink-0 flex items-center gap-2 px-6 pt-2.5 text-[13px]">
            {armed ? (
              <span className="text-gx-armed">{armed === 'B' ? 'Pick a gradient to mix with · Esc cancels' : 'Pick a gradient to replace this one · Esc cancels'}</span>
            ) : (
              <span className="text-fg-muted">Click a gradient to preview it above · click it again to keep and edit it.</span>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col relative">
          <BrowseStage />
        </div>
      </div>

      {/* My Gradients (§4): ONE strip on the bottom edge — Recent first, then the groups as
          labelled runs (FavientsPanel layout="strip"); pull up for the full panel (search,
          list view, rename, import / export). Silent until there is something in it. */}
      {recentCount > 0 && (
        <footer className="shrink-0 bg-surface-dock border-t border-line/10 flex flex-col" style={{ height: mineOpen ? 340 : 88 }}>
          <div className="flex items-center gap-3 px-6 pt-1.5 text-[13px] text-fg-muted">
            <ZoneLabel>My Gradients</ZoneLabel>
            {mineOpen && <span>Recent fills itself as you work · drag a gradient into a group to keep it · shared with the GMT studio</span>}
            <button className="ml-auto flex items-center gap-1 hover:text-fg" onClick={() => setMineOpen((o) => !o)} title={mineOpen ? 'Back to the strip' : 'Search, list view, rename, import and export'}>
              {mineOpen ? 'less' : 'more'} <Icon name={mineOpen ? 'chevronDown' : 'chevronUp'} />
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
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          fileToImg(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <SettingsHost />
      <ToastHost />
      <FullscreenGradientOverlay />
    </div>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerV2App;
