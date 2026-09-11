/**
 * GradientExplorerV2App — the streamlined shell (plans/ge-v2-design.md §6b, mock B).
 *
 * Top to bottom: the top bar — which is for the APP, not the gradient (L2), so since Phase B
 * it is brand · undo · redo · Back to GMT · settings (Variants left it in Phase D: snapshots
 * are a SET on the ground, captured from the rail), and ★ Keep /
 * Share / Export / Wallpaper live in the hero's use cluster · the Working hero (absent until
 * the first pick, and never unmounted after it — L8; it IS the stops editor, with the palette
 * row on top and Curves / Adjust expanders inside it) ·
 * the stage — the GROUND, which shows ONE SET of gradients at a time (Phase D, 2026-09-08:
 * the catalogue, a dated bin of Recent, Kept, a named group), headed by the SET RAIL naming
 * the sets (`SetRail`, at the TOP of the ground above the wall's own header — owner: "that
 * makes more sense hierarchically"; its CHIPS are silent until there is a second set, the
 * row itself is always there for the collection menu — the last remnant of the old "more"
 * pull-up, retired 2026-09-09 once the ground could group, search, rename, reorder and
 * throw away by itself). No Dock, no side panel, no
 * drawer, no timeline, no scene name, no footer, and no shelf strip any more — the
 * gradients you keep are drawn on the ground, by the wall, as large as their count allows.
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
 * Export is ExportMenu, Share is shareUrl (hooked up 2026-09-06).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useGlobalContextMenu } from '../../hooks/useGlobalContextMenu';
import GlobalContextMenu from '../../components/GlobalContextMenu';
import { StoreCallbacksProvider, type StoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { ToastHost } from '../../engine/components/ToastHost';
import { MobileViewportShell } from '../../engine/components/MobileViewportShell';
import { useIsPhone } from './useIsPhone';
import { FULL_FACES } from './Tray';
import { SettingsHost, SettingsButton } from '../../components/SettingsAccess';
import { GmtWordmark } from '../../engine-gmt/topbar/GmtWordmark';
import { showToast } from '../../engine/store/toastStore';
import { BrowseStage } from './BrowseStage';
import type { TrayFace } from './Tray';
import { FullscreenGradientOverlay } from '../FullscreenGradientOverlay';
import { openFullscreen } from '../../palette/store/fullscreenStore';
import { useActiveHeroSelection, deselectActiveHero, usePickSerial } from '../../palette/store/heroSelection';
import { useWorkingStore, useWorkingDerived, deriveWorkingNow, autoWorkingName } from '../../palette/store/workingStore';
import { usePaletteEditorStore } from '../../palette/store/paletteEditorStore';
import { usePickerStore } from '../../palette/store/pickerStore';
import type { SeedStop } from '../../palette/core/workingPipeline';
import type { GradientConfig } from '../../types';
import { useGeneratorStore, readGeneratorSlice, setGeneratorSlice, slotSnapshot } from '../../palette/store/generatorStore';
import { useFavientsStore, favientSig, DEFAULT_GROUP } from '../../palette/store/favientsStore';
import { GRADIENT_FILE_ACCEPT, readGradientFiles, importGradientsInto, importSummary, isGradientFileName } from '../../palette/core/importGradientFiles';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import { getWallSelection, clearWallSelection } from '../../palette/store/wallSelection';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { useArmedSlot, armSlot, getArmedSlot } from '../../palette/store/armedTarget';
import { useImageDrop } from '../../palette/components/useImageDrop';
import { useImageStore } from '../../palette/store/imageStore';
import { GradientDragAvatar } from '../../palette/components/GradientDragAvatar';
import { WorkingHero } from './WorkingHero';
import { ExportMenu } from './ExportMenu';
import { SetRail } from './SetRail';
import { useGroundSets } from './useGroundSource';
import { useGroundSetIds, setGroundSetId, toggleGroundSetId, getGroundSetId } from '../../palette/store/groundSet';
import { membersOfMany, parseSetId } from '../../palette/core/groundSets';
import { useGlobalSet } from '../../palette/store/globalSetStore';
import { shareUrlFor, takeShareFromLocation, cameFromGmt } from './shareUrl';
import { Icon } from './ui/Icon';

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
  const phone = useIsPhone();
  // PHONE: a face that takes the whole room (every face but Mix, FULL_FACES) hides the ground
  // under it — nothing to see, nothing to paint (owner, 2026-09-11). `invisible` keeps the
  // layout and the wall's scroll position; only its paint and hit-testing go.
  const groundHidden = phone && tray !== null && FULL_FACES.has(tray);
  const source = sourceOf(tray);
  const [exportOpen, setExportOpen] = useState(false);
  /** The set whose Export window is open (the rail's chip menu), or null. */
  const [exportGround, setExportGround] = useState(false);
  const derived = useWorkingDerived();
  const candidate = useActiveHeroSelection();
  const pickSerial = usePickSerial();
  const sets = useGroundSets();
  const favients = useFavientsStore((s) => s.favients);
  const globalEntries = useGlobalSet().entries;
  // L9, the screen grows with the user: the CHIPS appear only once there is a second set.
  // The rail ROW is always mounted, because its chevron is the door to My Gradients —
  // which now holds Import as well as export, and gating that door on the chips is what
  // made a cleared shelf unrecoverable (the migration audit §3.8a).
  const railSets = sets.length > 1 ? sets : [];
  const groundSetIds = useGroundSetIds();
  // WHAT THE RAIL'S EXPORT ICON WOULD CARRY: the union of the lit chips, in shelf order.
  // `All` is the catalogue, not a set of favourites, so `membersOfMany` gives [] for it and
  // the icon disables itself — which is right, and says so in its title. The name is the
  // lit sets joined, so the window's own header reads back what you pointed at.
  const groundMembers = useMemo(
    () => membersOfMany(groundSetIds, favients, globalEntries),
    [groundSetIds, favients, globalEntries],
  );
  const groundExportName = useMemo(
    () => groundSetIds.map((id) => sets.find((x) => x.id === id)?.label ?? id).join(' + ') || 'My Gradients',
    [groundSetIds, sets],
  );
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
  //
  // A gradient FILE dropped anywhere lands on the shelf (§8b item 4, M2). It shares the
  // image drop's single window listener through `onOtherFiles` rather than racing a second
  // one. A `.json` is ambiguous — it is both a gradient format and the Favients collection
  // format — so `importGradientsInto` tries it as a gradient and a file that is really a
  // collection simply reports nothing readable; Load & merge in the panel's kebab is the
  // collection path and stays where it is.
  //
  // This is also what un-corners a CLEARED shelf. The rail (and with it the manage panel,
  // Import and Load & merge) used to be gated on `sets.length > 1`, so "Clear collection"
  // — reached from inside that very panel — could make every way back in unreachable
  // (the migration audit §3.8a). Two things fix it: a drop always works, and the rail's
  // chevron is no longer gated on the chips (see the stage below).
  const importInto = useCallback((files: FileList | File[], group?: string) => {
    void (async () => {
      // Read FIRST (async), then write inside ONE synchronous paramEdit — holding a param
      // transaction open across an await risks another gesture clobbering the snapshot.
      const reads = await readGradientFiles(files);
      let outcome = { imported: 0, skipped: 0 };
      paramEdit(() => { outcome = importGradientsInto(reads, group); });
      showToast(importSummary(outcome));
    })();
  }, []);
  const { fileToImg } = useImageDrop({
    onLoaded: () => { if (trayRef.current !== 'image') openTray('image'); },
    onOtherFiles: useCallback((files: FileList) => {
      const gradients = Array.from(files).filter((f) => isGradientFileName(f.name));
      if (!gradients.length) return false;
      // Into the set you are looking at, when that set is a group you own; a dated bin and
      // the catalogue are not yours to file into, so those fall back to Kept.
      const { kind, key } = parseSetId(getGroundSetId());
      importInto(gradients, kind === 'group' ? key : DEFAULT_GROUP);
      return true;
    }, [importInto]),
  });
  const imageFileRef = useRef<HTMLInputElement>(null);
  // The rail's "Import into this set…" — the group is held for the picker's onChange.
  const gradientFileRef = useRef<HTMLInputElement>(null);
  const importGroupRef = useRef<string>(DEFAULT_GROUP);
  const askImportInto = useCallback((group: string) => {
    importGroupRef.current = group;
    gradientFileRef.current?.click();
  }, []);
  const requestImageOrOpen = useCallback(() => {
    if (trayRef.current === 'image' || useImageStore.getState().model) openTray('image');
    else imageFileRef.current?.click();
  }, [openTray]);

  // Esc order (Phase C, L6): a wall selection → the open tray face (the inspector closes by
  // clearing the stop selection, which the hero does when the face leaves) → an armed slot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // A wall selection is the nearest thing to a popover: it is a held state you can be
      // stuck in, and it must let go before Esc starts closing faces.
      if (getWallSelection().size) { clearWallSelection(); return; }
      if (trayRef.current) { openTray(null); return; }
      if (getArmedSlot()) armSlot(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openTray]);

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
    {/* THE FRAME (Phase F). `MobileViewportShell` branches on `isDeviceMobile` itself and
        its DESKTOP branch is `fixed inset-0 w-full h-full` — the box this shell already
        drew by hand — so it is mounted UNCONDITIONALLY rather than behind a `useIsPhone`
        of our own: one place decides, and desktop keeps the identical box. On a phone it
        swaps in `sticky top-0 h-[100dvh]` (the address bar / keyboard tracker) and pads all
        four edges by `env(safe-area-inset-*)`, which is what gets the wall's bottom
        controls off the home indicator — they are `absolute` inside this padded box, so
        they inherit the inset for free. `ToastHost` is `fixed` and cannot, so it carries
        the bottom inset itself (see its own comment). */}
    <MobileViewportShell className="bg-surface text-fg select-none">
    <div className="w-full h-full flex flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* top bar */}
      <header className="h-12 shrink-0 flex items-center gap-1.5 px-4 bg-surface-dock border-b border-line/10">
        {/* `min-w-0` + a truncating title: on a phone the brand is the one elastic thing in
            this row, and without it the wordmark pushed undo / redo / settings off the
            right edge (measured 390 px, Phase F). */}
        <a href="app-gmt.html" className="flex items-center gap-2 mr-auto min-w-0 no-underline" title="GMT">
          <GmtWordmark className="h-3.5 w-auto shrink-0 opacity-80" />
          <span className="text-[15px] font-semibold text-fg truncate">Gradient Explorer</span>
          {/* the build badge is for whoever is testing the two shells side by side; a phone
              has no room to spend on it */}
          <span className="max-md:hidden text-[11px] text-fg-dim border border-line/20 rounded px-1">next</span>
        </a>
        {/* 40 px hit boxes on a phone (`max-md:`): 32 is comfortable for a pointer and
            under the ~44 px a fingertip wants. The GLYPH stays 24 either way. */}
        <button className={`${tb} w-8 px-0 max-md:w-10 max-md:h-10 flex items-center justify-center`} title="Undo (Ctrl+Z)" onClick={undo}><Icon name="undo" size={24} /></button>
        <button className={`${tb} w-8 px-0 max-md:w-10 max-md:h-10 flex items-center justify-center`} title="Redo (Ctrl+Y)" onClick={redo}><Icon name="redo" size={24} /></button>
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
              palette={derived.palette.map((s) => s.color)}
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
      {/* CLICK AWAY DESELECTS (owner, 2026-09-09: "deselecting a knot should be easier — ie
          when clicking on the wall"). The stops editor's own click-away lives on the area of
          its container OUTSIDE the knot track, and in the hero the editor is `chrome='strip'`
          — the track IS the container, so that area is a few pixels of nothing and a click on
          the ramp INSERTS a knot rather than dropping the selection. Esc was the only way out.
          The ground is the click-away target instead: a pointerdown anywhere on it (wall, set
          rail, shelf panel) closes the inspector face, and the hero's `tray !== 'inspector'`
          effect turns that into `clearSelection()` — the same route Esc takes.
          CAPTURE, so it lands before the wall's own pointer handlers stop propagation.
          The top bar is deliberately NOT a click-away target: Undo / Redo while inspecting a
          stop must not also drop your place in the gradient. */}
      <div
        className={`flex-1 min-h-0 flex flex-col relative ${groundHidden ? 'invisible' : ''}`}
        onPointerDownCapture={() => { if (trayRef.current === 'inspector') openTray(null); }}
      >
        {/* The hero's shadow, falling onto the top of the ground — the set rail sits UNDER
            the card, not beside it, and without this the two read as one flat sheet
            (owner, 2026-09-10). Absolute, so it costs the flex column nothing.
            z-20 is deliberate and load-bearing: above the wall and the rail (both z-auto),
            below the tray (z-30) and the two ExportMenus (z-40). The tray is further off
            the ground than the hero is, so it must not be dimmed by the hero's shadow —
            when a face is open you see this band only to the left and right of the tray. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-3 z-20 bg-gradient-to-b from-black/30 to-transparent"
        />
        {/* The SET RAIL (Phase D): the top of the ground names the sets — All · Today ·
            Yesterday · the date · Kept · named groups — and the lit one is on the ground; the
            wall's own header (how the set is narrowed) sits under it. Silent until there is
            a second set (L9: the screen grows with the user). The chevron opens the full My
            Gradients panel (search, list view, rename, import / export) under the rail,
            floating over the wall (L6: nothing pushes the ground). */}
        <SetRail
          sets={railSets}
          activeIds={groundSetIds}
          onSelect={setGroundSetId}
          onToggle={toggleGroundSetId}
          onExportGround={() => setExportGround(true)}
          groundExportCount={groundMembers.length}
          onImportInto={askImportInto}
        />
        {/* The GROUND's Export window — the same `ExportMenu`, pointed at what the wall is
            showing instead of at the working gradient (§8b item 4 / the audit's M1; retargeted
            from one set to the ground 2026-09-09). Hosted here, like the hero's, so the rail
            stays a control. */}
        {exportGround && groundMembers.length > 0 && (
          <ExportMenu
            ramp={[]}
            name={groundExportName}
            // Deliberate: the SHARED set exports too. It is a public resource and taking a
            // copy of it is the point — stated here so it is a decision, not an accident.
            set={groundMembers}
            onClose={() => setExportGround(false)}
            positionClass="absolute left-6 top-10 z-40"
          />
        )}
        {/* the ground is ALWAYS the wall (L3, Phase C) — the tray floats over it. One line
            above it only when it has something to say.
            The nothing-picked line used to live here too, reading "Click a gradient to
            preview it above · click it again to keep and edit it". It is gone: the hero it
            pointed AT does not exist until the first pick (L8), so it named a place that
            was not there, in the corner furthest from where the eye is. BrowseStage now
            says it over the map instead (owner, 2026-09-09). */}
        {armed && (
          <div className="shrink-0 flex items-center gap-2 px-6 pt-2.5 text-[13px] bg-surface-raised">
            <span className="text-gx-armed">{armed === 'B' ? 'Pick a gradient to mix with · Esc cancels' : 'Pick a gradient to replace this one · Esc cancels'}</span>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col relative">
          <BrowseStage />
        </div>
      </div>


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
      <input
        ref={gradientFileRef}
        type="file"
        accept={GRADIENT_FILE_ACCEPT}
        multiple
        aria-label="Import gradient files"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) importInto(e.target.files, importGroupRef.current);
          e.target.value = '';
        }}
      />
      {/* The cursor-following ramp while a gradient is in flight. Mounted here because
          `beginCustomAvatarDrag` suppresses the browser's own drag image for every gradient
          drag in the suite — without an avatar a v2 drag was invisible (owner, 2026-09-09:
          it augments the drags where you expect it, above all hero → shelf). */}
      <GradientDragAvatar />
      <SettingsHost />
      <ToastHost />
      <FullscreenGradientOverlay />
    </div>
    </MobileViewportShell>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerV2App;
