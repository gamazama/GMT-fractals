/**
 * GradientExplorerV2App — the streamlined shell (plans/ge-v2-design.md §6b, mock B).
 *
 * Top to bottom: the top bar — which is for the APP, not the gradient (L2), so since Phase B
 * it is brand · undo · redo · Back to GMT · help (?) · settings — on a phone brand · undo · redo
 * · ONE menu holding the rest (2026-09-13, @see ./ShellMenu) (Variants left it in Phase D: snapshots
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
import { useWorkingStore, useWorkingDerived, deriveWorkingNow, autoWorkingName, workingSourceOf } from '../../palette/store/workingStore';
import { usePaletteEditorStore } from '../../palette/store/paletteEditorStore';
import { usePickerStore } from '../../palette/store/pickerStore';
import type { SeedStop } from '../../palette/core/workingPipeline';
import type { GradientConfig } from '../../types';
import { useGeneratorStore, readGeneratorSlice, setGeneratorSlice, slotSnapshot, SLOT_MOD_DEFAULTS } from '../../palette/store/generatorStore';
import { DEFAULT_CURVE_SPACE } from '../../palette/core/curveSpaces';
import { useFavientsStore, favientSig, DEFAULT_GROUP } from '../../palette/store/favientsStore';
import {
  GRADIENT_FILE_ACCEPT,
  readGradientFiles,
  importGradientsInto,
  importSummary,
  isGradientFileName,
  type ImportOutcome,
} from '../../palette/core/importGradientFiles';
import { paramEdit, paramGroup } from '../../palette/store/paramUndoBracket';
import { getWallSelection, clearWallSelection } from '../../palette/store/wallSelection';
import { gradientDisplayRamp } from '../../palette/core/gmtGradient';
import { stopsOf } from '../../utils/gradientRamp';
import { useArmedSlot, armSlot, getArmedSlot } from '../../palette/store/armedTarget';
import { useImageDrop } from '../../palette/components/useImageDrop';
import { useImageStore } from '../../palette/store/imageStore';
import { DropScrim } from '../../components/ui/DropScrim';
import { stopOps } from '../../utils/stopOps';
import { GradientDragAvatar } from '../../palette/components/GradientDragAvatar';
import { WorkingHero } from './WorkingHero';
import { ExportMenu } from './ExportMenu';
import { SetRail } from './SetRail';
import { useShellUiHistory } from './uiHistory';
import { useGroundSets } from './useGroundSource';
import { useGroundSetIds, setGroundSetId, toggleGroundSetId, getGroundSetIds } from '../../palette/store/groundSet';
import { membersOfMany, parseSetId, groupSetId } from '../../palette/core/groundSets';
import { loadGxSessionText } from './session';
import { useGlobalSet } from '../../palette/store/globalSetStore';
import { shareUrlFor, takeShareFromLocation, cameFromGmt } from './shareUrl';
import { applyGradientFromGmt, goBackToGmt, onBackToGmtClick, BACK_TO_GMT_HREF } from './fromGmt';
import { Icon } from './ui/Icon';
import { ShellMenuButton, FeedbackWindow } from './ShellMenu';
import { HelpOverlay } from '../../engine/plugins/Help';
import type { MenuItem } from '../../engine/plugins/Menu';
import { openSettings } from '../../store/settingsPanelState';
import { GearIcon, HelpIcon, MenuIcon } from '../../components/Icons';

/**
 * The PHONE's one menu, above the Help menu's own items (owner, 2026-09-13: "mobile will have
 * to get one general purpose menu"). What moves in is what would otherwise need a button of
 * its own and is not used constantly: Settings, and Back to GMT when this page came from the
 * studio (a text link ~100 px wide in a 390 px bar). Undo / Redo stay buttons — they are hit
 * again and again, and a menu would turn each one into two taps.
 */
const phoneMenuItems = (): MenuItem[] => [
  { id: 'gx-settings', type: 'button', label: 'Settings', icon: <GearIcon />, onSelect: openSettings },
  ...(cameFromGmt
    ? [{ id: 'gx-back-to-gmt', type: 'button', label: 'Back to GMT', title: 'Back to the GMT studio', onSelect: () => { void goBackToGmt(); } } as MenuItem]
    : []),
  { id: 'gx-sep', type: 'separator' },
];

/**
 * The set an import files into (ADR-0123 Decision 4): the set on the ground when it is ONE set and
 * it is the user's own group (Kept included — its key is DEFAULT_GROUP). The catalogue (All), a
 * dated bin, GX Global and several lit chips are not a place to file into, so they give undefined
 * and the loader decides (a document's own set, else Kept). Before ADR-0123 those passed Kept.
 */
const ownedGroundGroup = (): string | undefined => {
  const ids = getGroundSetIds();
  if (ids.length !== 1) return undefined;
  const { kind, key } = parseSetId(ids[0]);
  return kind === 'group' ? key : undefined;
};

export type SourceId = 'browse' | 'build' | 'extract';
/** Phase C: the source follows the TRAY — the Mix face is the `build` input, the Image face
 *  the `extract` input, every other face (or none) is Browse. There are no source tabs. */
const sourceOf = (face: TrayFace): SourceId => (face === 'mix' ? 'build' : face === 'image' ? 'extract' : 'browse');

const tb = 'h-8 px-3 rounded-lg text-[13px] text-fg-muted hover:text-fg hover:bg-line/10 transition-colors';

/**
 * Leaving the Curves face puts the AXES back on the default (plan §10, 2026-09-12, "Not
 * sticky" — owner: "GX rebuilds on every transform"; "the Curves face already bakes and resets
 * on leave, and the space resets with it"). Before 2026-09-16 only the tracks reset, so a face
 * closed in HSV reopened in HSV on the next gradient. Only when no tracks are left: tracks that
 * survive the leave (a live Mix keeps its curves across a face switch) are keyed by their
 * space, and a space that disagrees with them is read as no curves at all. It never needs an
 * entry of its own: a leave that bakes (or drops an untouched fit for a source switch) runs it
 * inside the tab switch's group, whose generator snapshot restores the space with the curves; a
 * PEEK runs it outside any bracket with the fit it drops (grep `peek` in `openTray`).
 *
 * @invariant closing the Curves face in HSV leaves the axes on OkLCh, and the next gradient opens
 *   Curves there — proven by: npm run smoke:ge-wave ("[10] closing the Curves face resets the
 *   axes, and the next gradient opens Curves in OkLCh"). Falsified 2026-09-16 by dropping the
 *   call in `openTray`: [10] red alone. The chip-cancel call is unguarded.
 */
const resetBareCurveSpace = (): void => {
  const g = useGeneratorStore.getState();
  if (!g.tracks && g.curveSpace !== DEFAULT_CURVE_SPACE) useGeneratorStore.setState({ curveSpace: DEFAULT_CURVE_SPACE });
};

/**
 * NEW GRADIENT — start from nothing (parity row M10; the migration audit's OD3, owner
 * 2026-09-23: "bring back the capability, not the mode" — the one start that needs neither a
 * pick nor an image).
 *
 * The gradient is not invented here. It is the one the hero's own ☰ ▸ View ▸ Reset Default
 * writes (grep `Reset Default` in components/gradient/gradientActions.ts): `stopOps.default()`,
 * black to white on two stops, with the same two spaces — which are also what a catalogue pick
 * carries (grep `entryToGradientConfig`), so a new gradient exports, shares and reaches GMT
 * exactly as a picked one does. A STOP gradient: the first gesture on the ramp edits it.
 */
const NEW_GRADIENT_NAME = 'New gradient';
const newGradientConfig = (): GradientConfig => ({ stops: stopOps.default(), colorSpace: 'linear', blendSpace: 'oklab' });

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
  // No slot modifiers in v2 (owner, 2026-09-13: they stay gone — Mix is streamlined into the
  // destructive flow). The fourteen params still exist for app-gmt's and the old shell's
  // Generator, and a value left in them would tint both bars and the blend with no control
  // on screen to show it or take it back. v2 itself never writes one; what can carry one in is
  // a loaded session file (the whole `paletteGenerator` slice rides it). So entering Mix puts
  // them at neutral, the same way it already does for the mode and the blend.
  if (Object.entries(SLOT_MOD_DEFAULTS).some(([k, v]) => (gs as unknown as Record<string, unknown>)[k] !== v)) setGeneratorSlice(SLOT_MOD_DEFAULTS);
  const d = deriveWorkingNow();
  if (d) {
    w.syncRecent();
    g.sendRampToSlot('A', d.ramp, workingNameNow());
    const aSig = favientSig(d.config);
    const other = useFavientsStore.getState().favients.find((f) => favientSig(f.config) !== aSig);
    // Either form (ADR-0122): a RAMP favourite's `stops` is [], and rendering that is grey.
    if (other) g.sendRampToSlot('B', gradientDisplayRamp(other.config), other.name);
  }
  // The stops your gradient already has seed every bake's fit, so mixing and baking
  // again does not walk them (grep seedPositions in palette/core/stopFit.ts). A RAMP gradient
  // has none — no seeds, and the bake is then an automatic fit (grep fitWorkingOutput).
  w.goLive({ kind: 'build', seeds: d ? stopsOf(d.config).map((s) => ({ position: s.position, interpolation: s.interpolation, bias: s.bias })) : [] });
  armSlot('B');
};

/** Add the other gradient's stops to the Mix input's seeds (a pick filled a bar). A RAMP
 *  gradient (ADR-0122) brings none; passing a whole config, or nothing, is tolerated. */
const addMixSeeds = (from: GradientConfig['stops'] | GradientConfig | null | undefined): void => {
  const stops = stopsOf(from);
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
  // A LIVE input restored from the session (./session, before this first render) reopens the
  // face that owns it: a live Mix or Image lives only while its face is open, and opening Mix
  // afresh would run enterMix over the restored blend and throw it away. Otherwise closed.
  const [tray, setTray] = useState<TrayFace>(() => {
    const kind = useWorkingStore.getState().input.kind;
    return kind === 'build' ? 'mix' : kind === 'extract' ? 'image' : null;
  });
  const phone = useIsPhone();
  // PHONE: a face that takes the whole room (every face but Mix, FULL_FACES) hides the ground
  // under it — nothing to see, nothing to paint (owner, 2026-09-11). `invisible` keeps the
  // layout and the wall's scroll position; only its paint and hit-testing go.
  const groundHidden = phone && tray !== null && FULL_FACES.has(tray);
  // FOLDED hero (owner, 2026-09-11): the card keeps its header + a strip, the wall gets the
  // screen. `fold` is defined below `openTray`, which it calls to close an open face.
  const [folded, setFolded] = useState(false);
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
  // The surfaces ride every undo entry as CONTEXT (owner, 2026-09-12 and 2026-09-24) — @see
  // ./uiHistory. This is what makes it safe for a gesture to CLOSE something to show you a
  // result (`revealGround` below), and what puts back the face that belongs with an undone edit.
  useShellUiHistory(
    { tray, folded, exportOpen, exportGround, armed },
    (s) => { setTray(s.tray); setFolded(s.folded); setExportOpen(s.exportOpen); setExportGround(s.exportGround); armSlot(s.armed ?? null); },
  );
  /**
   * A FACE EDITS A DOCUMENT, so it may not be open when there is none.
   *
   * Found by the owner 2026-09-12, undoing out of the Adjust face on a phone: every entry on
   * the stack had been made WHILE that face was open, so every undo restored it — while the
   * working store's own provider kept walking the document back to nothing. The end state was
   * a face with nothing under it over a wall the phone hides for a full-height face
   * (`groundHidden`), and more undo could not get out of it, because there was no older entry
   * that remembered a closed tray.
   *
   * The rule is a render-time invariant rather than a clamp inside the restore, deliberately:
   * the two providers are applied in map order, so reading "is there a document" from inside
   * one of them is a race. Stated here it holds however the state was reached.
   *
   * `input.kind === 'empty'` is the discriminator, NOT `derived.empty` — the latter is also
   * true for the Image face with no image and a Mix with nothing in it, and those faces must
   * stay open and say what is missing (L8).
   */
  const noDocument = derived.input.kind === 'empty';
  useEffect(() => {
    if (noDocument && tray !== null) setTray(null);
  }, [noDocument, tray]);
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
    // A pick is a request to SEE the gradient: a hidden hero comes back (owner, 2026-09-11).
    setFolded(false);
    const p = candidate.payload;
    // On the Mix tab a pick always lands in a slot — B unless A is armed.
    const slot = getArmedSlot() ?? (trayRef.current === 'mix' ? 'B' : null);
    if (slot) {
      // Either form (ADR-0122), and the DISPLAY ramp: a RAMP pick's `stops` is [] (rendering that
      // filled the slot grey), and a slot is a palette-pipeline input, which reads display sRGB —
      // a catalogue pick's 'linear' profile is a bake-for-shader concern, not the slot's colours.
      const ramp = gradientDisplayRamp(p.config);
      // ONE entry (2026-09-24): the slot, a re-entry into Mix and the seeds the pick adds, so one
      // Ctrl+Z gives back the other bar AND the seeds — which were written outside any bracket
      // before — with the slot armed again as it was (the armed slot is interface context).
      paramGroup(() => {
        useGeneratorStore.getState().sendRampToSlot(slot, ramp, p.name);
        // Working goes live over Mix again (it may have been fixed by leaving the Mix tab to
        // browse for this pick) so the hero shows the new blend immediately.
        if (useWorkingStore.getState().input.kind !== 'build') useWorkingStore.getState().goLive({ kind: 'build' });
        addMixSeeds(p.config.stops);
      });
      if (candidate.mode !== 'favients') armSlot(null);
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
    // A NEW gradient starts fresh (owner, 2026-09-23): `use` throws away pending Adjust dials and
    // curves — like Cancel, never baked into the gradient it replaces — in its own undo step, so
    // one Ctrl+Z brings back the previous gradient WITH its dials. An open Adjust face stays open
    // on the new pick with every dial at rest (Apply / Cancel off); an open Curves face stays too,
    // refitted to the new pick in OkLCh (`fitCurves` — the face itself only fits when it mounts).
    w.use(p.config, p.name, p.source ?? (fromRecent ? 'My Gradients' : 'Browse'), { fromRecent, origin: p.origin, fitCurves: trayRef.current === 'curves' });
    // A pick while the Image face is open replaces the image as the source: the face closes
    // (owner, 2026-09-07). `use` already replaced the input, so no bake, just the tray.
    if (trayRef.current === 'image') setTray(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.key, candidate?.mode, pickSerial]);

  // My Gradients follows the work (owner S3 review): every change to the derived output or
  // the name lands in the session's Recent entry, debounced past a drag. A debounce is not a
  // bracket, though: a gesture held still past 400 ms (a Curves wave from arm to ✓ / ✕, a slider
  // or knot held) is still OPEN when it fires, so the write waits for it to close
  // (`syncRecentOutsideUndo`) — a Recent write never becomes part of a gesture's undo entry.
  useEffect(() => {
    if (derived.empty) return;
    const t = window.setTimeout(() => useWorkingStore.getState().syncRecentOutsideUndo(), 400);
    return () => window.clearTimeout(t);
  }, [derived.config, derived.name, derived.empty]);

  // Open a tray face (the same face again closes it). Mix and Image are SOURCES, so
  // crossing between them and Browse does what the source tabs did (Phase B): leaving a
  // live Mix / Image commits it with `use`; entering Mix runs enterMix (arms B); entering
  // Image puts the extract input live. Leaving Mix disarms — the wall is B's picker only
  // while the Mix face is open.
  //
  // ONE CLICK, ONE UNDO ENTRY, AND THE FACE IS SET LAST (2026-09-24, owner: "UI goes along with
  // undo"). Everything a switch does to the DATA runs inside one `paramGroup`, before `setTray`:
  // the interface rides every entry as CONTEXT (./uiHistory) captured when the group opens, so
  // one Ctrl+Z puts back the whole click — the face you were in with the gradient you had in it —
  // and redo the face you went to. Before this a switch could leave four entries (a bake, a Mix
  // commit, enterMix's three brackets, a Curves fit), and undoing only the last put a Mix face over
  // a fixed gradient or a Curves face with no curves.
  //
  // Opening CURVES fits here, inside the group, rather than when the face mounts: a fit made after
  // the face opened was an entry whose context was "Curves open", so its undo left the face
  // saying "Nothing to fit yet" over a gradient. The face's own mount fit stays as the fallback.
  //
  // A PEEK stays navigation: leaving an UNTOUCHED Curves fit for a face that edits nothing (no
  // face, Adjust) drops the fit OUTSIDE any bracket, as it always did — so looking into Curves and
  // out again adds nothing to the stack beyond the fit itself.
  //
  // Guard: `npm run smoke:ge-uiundo` [7] (entering Mix is one step), [8] (leaving Mix), [9] (Mix →
  // Curves), [10] (opening Curves; a peek adds no entry), [11] (leaving Adjust), [13] (Image);
  // F3 / F4 / F7 in its header break the group, the fit and the peek one at a time.
  const openTray = useCallback((next: TrayFace) => {
    const cur = trayRef.current;
    const face: TrayFace = cur === next ? null : next;
    const from = sourceOf(cur);
    const to = sourceOf(face);
    const leaving = cur !== face;
    const gen0 = useGeneratorStore.getState();
    const untouchedCurves = cur === 'curves' && leaving && !!gen0.tracks && !gen0.tracksEdited;
    // an UNTOUCHED fit (Curves opened, looked at, closed) is the source restated: no bake —
    // the fit just goes, and the gradient stays what it was
    const dropUntouchedFit = (): void => {
      useGeneratorStore.setState({ tracks: null, curvesOn: false });
      resetBareCurveSpace();
    };
    const peek = untouchedCurves && from === to;
    if (peek) dropUntouchedFit();
    paramGroup(() => {
      const w = useWorkingStore.getState();
      // ONE rule for every face (C.3, owner: "the default will be to bake after switching from
      // any mode"): leaving Curves or Adjust with something applied folds it into the stops
      // (beginEdit — the chip then offers "return to source" as the cancel). Untouched dials
      // fold nothing. First, so a face left for Mix hands Mix the baked gradient, not live
      // curves that would apply again over the blend.
      if ((cur === 'curves' || cur === 'adjust') && leaving) {
        const d = deriveWorkingNow();
        if (untouchedCurves) {
          if (!peek) dropUntouchedFit(); // a source switch follows: the drop is part of the click
        } else if (d && !d.passthrough && w.input.kind !== 'build' && w.input.kind !== 'extract') w.beginEdit();
      }
      if (cur === 'curves' && leaving) resetBareCurveSpace();
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
      // Curves opens on curves: fit the gradient the face will show (after any bake above), or
      // turn on curves that are already there — the two things the face's mount would do.
      if (face === 'curves' && leaving) {
        const g = useGeneratorStore.getState();
        if (!g.tracks) {
          const base = deriveWorkingNow()?.base;
          if (base) g.fitFromChannels(base);
        } else if (!g.curvesOn) g.setCurvesOn(true);
      }
    });
    setTray(face);
  }, []);

  // Cancel the open face (C.3 / C.9 — the state chip, or a click on the ramp's SOURCE
  // half): what was there before the face comes back and the face closes WITHOUT baking
  // (so not openTray, which would commit it). Bake = openTray(null): leaving commits.
  const cancelFace = useCallback(() => {
    useWorkingStore.getState().cancelFace();
    if (trayRef.current === 'curves') resetBareCurveSpace();
    armSlot(null);
    deselectActiveHero();
    setTray(null);
  }, []);
  const bakeFace = useCallback(() => openTray(null), [openTray]);

  /**
   * NEW GRADIENT (see `newGradientConfig`) — from the nothing-picked line (BrowseStage) and the
   * hero's ☰ menu. It is a `use`, like a pick: a new Recent session, Adjust and Curves started
   * fresh, and ONE undo step back to what was there (or to nothing — the hero then keeps the
   * last gradient on show, L8). An open face goes the way a pick takes it: Curves stays and fits
   * the new gradient, Adjust stays at rest; a live SOURCE face (Mix, Image) and the stop inspector
   * close, because they belonged to the gradient being replaced — a Mix face over a fixed input
   * would be lying. The face (and the inspector's stop) comes back with one undo because the
   * interface rides every entry as CONTEXT, captured when the bracket opens (@see ./uiHistory) —
   * until 2026-09-24 the close had to be committed inside the bracket with `flushSync` for the
   * entry to see it. A folded hero unfolds: you asked to see a new gradient.
   *
   * @invariant New is ONE undo step: one Ctrl+Z gives back nothing (from the empty state), the
   *   gradient that was there (from the ☰), or a live Mix WITH its face — proven by: `npm run
   *   smoke:ge-ground` ("[13a] one Ctrl+Z after New did not return to the empty state", "[13b] one
   *   Ctrl+Z after ☰ ▸ New Gradient did not give back …", "[13c] one Ctrl+Z brought the mix back
   *   without its face"). Falsified 2026-09-23: a second bracket after the `use` (a `setName`) reds
   *   [13a]. The face half, re-falsified 2026-09-24 under context: the shell's provider registered
   *   without `context: true` reds [13c] alone.
   */
  const startNewGradient = useCallback(() => {
    const cur = trayRef.current;
    paramEdit(() => {
      setFolded(false);
      if (cur === 'mix' || cur === 'image' || cur === 'inspector') setTray(null);
      useWorkingStore.getState().use(newGradientConfig(), NEW_GRADIENT_NAME, 'New', { fitCurves: cur === 'curves' });
    });
    armSlot(null);
    deselectActiveHero();
  }, []);
  // Folding closes any open face first (a face hangs from the tabs, and the tabs go away with
  // the body); `openTray(null)` so leaving the face commits exactly as a tab close would.
  const fold = useCallback((next: boolean) => { if (next && trayRef.current !== null) openTray(null); setFolded(next); }, [openTray]);

  // An image dropped/pasted ANYWHERE in the shell routes to Extract (§5.4) — a second
  // useImageDrop instance mounted once here at the root; ImageStage keeps its own for the
  // old shell / app-gmt (see palette/components/useImageDrop.ts).
  // Image asks for an image before it takes over (owner, 2026-09-07): with no image loaded,
  // the Image tab (and the slot) open the file dialog; the source switches only when one
  // arrives (`onLoaded`) — cancel the dialog and nothing changes. Drop / paste anywhere
  // still routes here.
  //
  // A gradient FILE dropped anywhere lands on the shelf (§8b item 4, M2), through THE one loader
  // (ADR-0123 Decision 3), which decides what each file is by its content. Since a GMT gradient
  // file is a PNG — and the browser calls it `image/png` — the drop hands every gradient-file
  // name to the loader FIRST (`preRoute`), PNGs included: one carrying our metadata or our band
  // layout imports as gradients, and a PNG the loader says is just an image goes on to the image
  // extraction exactly as before, silently. A session file (`.gxsession.json`) opens as a session
  // through the same apply Settings ▸ Session ▸ Load uses (one undo step of its own); a scene PNG
  // and a collection are named in the toast. Then the view SHOWS where it landed (ADR-0119) — the
  // owner's "neither appeared" was an import into Kept while All was on the ground.
  //
  // This is also what un-corners a CLEARED shelf. The rail (and with it the manage panel,
  // Import and Load & merge) used to be gated on `sets.length > 1`, so "Clear collection"
  // — reached from inside that very panel — could make every way back in unreachable
  // (the migration audit §3.8a). Two things fix it: a drop always works, and the rail's
  // chevron is no longer gated on the chips (see the stage below).
  const finishImport = useCallback((outcome: ImportOutcome, opts: { imagesGoOn?: boolean } = {}) => {
    const session = outcome.sessions?.[0];
    const rest: ImportOutcome = {
      ...outcome,
      sessions: outcome.sessions?.slice(1),
      // images that go on to extraction are not a dead end, so they are not reported
      images: opts.imagesGoOn ? undefined : outcome.images,
    };
    const nothingToSay = !rest.imported && !rest.skipped && !rest.sessions?.length && !rest.scenes?.length && !rest.images?.length;
    // Say what happened — unless the only thing that happened is a session opening (it toasts
    // itself) or a plain image going on to extraction (which is just a drop doing what it did).
    if (!nothingToSay || (!session && !opts.imagesGoOn)) showToast(importSummary(rest));
    if (session) loadGxSessionText(session.text);
    // REVEAL (ADR-0119): the set it landed in, unless the ground already shows it. A collection
    // merge (destination null) and a file that landed nowhere show nothing new.
    if (typeof outcome.destination === 'string') {
      const id = groupSetId(outcome.destination);
      if (!getGroundSetIds().includes(id)) setGroundSetId(id);
    }
  }, []);
  const importInto = useCallback((files: FileList | File[], group?: string) => {
    void (async () => {
      // Read FIRST (async), then write inside ONE synchronous paramEdit — holding a param
      // transaction open across an await risks another gesture clobbering the snapshot.
      const reads = await readGradientFiles(files);
      let outcome: ImportOutcome = { imported: 0, skipped: 0 };
      paramEdit(() => { outcome = importGradientsInto(reads, group); });
      finishImport(outcome);
    })();
  }, [finishImport]);
  // `over`: an OS FILE is being dragged over the page — the drop hint below (M8). The hook only
  // raises it for a drag carrying 'Files', so the shell's own drags (a tile or the hero onto a
  // set chip, a colour onto the ramp — custom MIME types, grep FAVIENT_DND_MIME / COLOR_DND_MIME)
  // never show it.
  const { fileToImg, over: fileOver } = useImageDrop({
    onLoaded: () => { if (trayRef.current !== 'image') openTray('image'); },
    preRoute: useCallback(async (files: File[]): Promise<File[]> => {
      const gradients = files.filter((f) => isGradientFileName(f.name));
      if (!gradients.length) return files;
      const reads = await readGradientFiles(gradients);
      let outcome: ImportOutcome = { imported: 0, skipped: 0 };
      paramEdit(() => { outcome = importGradientsInto(reads, ownedGroundGroup()); });
      finishImport(outcome, { imagesGoOn: true });
      // What goes on: the plain images, in drop order — a PNG the loader called an image (its own
      // bytes) and every image that was never a gradient-file name. Anything else in a drop that
      // carried gradient files is dropped quietly, as it was before.
      const byName = new Map((outcome.images ?? []).map((im) => [im.name, im] as const));
      const onward: File[] = [];
      for (const f of files) {
        const im = isGradientFileName(f.name) ? byName.get(f.name) : f.type.startsWith('image') ? { name: f.name, bytes: null } : undefined;
        if (!im) continue;
        onward.push(im.bytes ? new File([im.bytes as unknown as BlobPart], f.name, { type: f.type || 'image/png' }) : f);
      }
      return onward;
    }, [finishImport]),
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
  // Ahead of all three: anything NEARER that already consumed the key. A menu, a modal and an
  // armed Curves wave take Escape through the shortcut registry (`useDismiss`), which marks it
  // `defaultPrevented`; `installShortcuts()` runs at boot in main.tsx, so its window listener
  // is ahead of this one on the same list. Before 2026-09-16 this acted anyway, so arm → drag →
  // Esc closed the Curves face — and closing it BAKES the wave Esc was meant to discard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
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
  // `ramp` is the pipeline's OWN output and is the only thing here that is true mid-drag:
  // `config` comes from a fit, and `deriveWorkingNow` always fits afresh rather than reusing
  // the one the UI is holding (ADR-0117). `smoke:ge-livedrag` compares the hero's bar against
  // this ramp to prove the bar is painting the pipeline and not a held approximation of it.
  useEffect(() => {
    (window as unknown as { __gxWorking?: () => unknown }).__gxWorking = () => {
      const d = deriveWorkingNow();
      return { config: d?.config ?? usePaletteEditorStore.getState().config, ramp: d?.ramp ?? null, input: useWorkingStore.getState().input };
    };
  }, []);

  const undo = () => (useEngineStore.getState() as unknown as { undoParam?: () => void }).undoParam?.();
  const redo = () => (useEngineStore.getState() as unknown as { redoParam?: () => void }).redoParam?.();
  // A share link opens straight into Working (once, on boot; the param is stripped). Failing
  // that, a gradient GMT's Explorer button handed over does the same (./fromGmt, 2026-09-23).
  useEffect(() => {
    const shared = takeShareFromLocation();
    if (shared) useWorkingStore.getState().use(shared.config, shared.name, 'Shared link');
    else applyGradientFromGmt();
  }, []);
  const share = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().syncRecentOutsideUndo();
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
  /**
   * Clear the ground so the SET RAIL is visible — called by a gesture whose result is drawn
   * there and nowhere else (the ♥'s save flash). Closing a surface to show a result is only
   * honest if the surface comes back, which is what `useShellUiHistory` above buys: the caller
   * runs this INSIDE its undo bracket, whose entry carries the interface as it was when the
   * bracket opened, so one Ctrl+Z puts the face and the window back with the save it announced.
   * Called outside a bracket, the surfaces would close with no entry to bring them back. Returns
   * nothing — a caller that needs to know simply looks at the state it is about to change.
   */
  const revealGround = useCallback(() => {
    setTray(null);
    setExportOpen(false);
    setExportGround(false);
  }, []);
  const wallpaper = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().syncRecentOutsideUndo();
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
      {/* PHONE: the bar is 32 px, not 48 (owner, 2026-09-11: "the top bar can be tiny, maybe
          half the size") — its three controls are 32 px squares with 20 px glyphs. */}
      <header className={`shrink-0 flex items-center gap-1.5 bg-surface-dock border-b border-line/10 ${phone ? 'h-8 px-2' : 'h-12 px-4'}`}>
        {/* `min-w-0` + a truncating title: on a phone the brand is the one elastic thing in
            this row, and without it the wordmark pushed undo / redo / settings off the
            right edge (measured 390 px, Phase F). */}
        <a href={BACK_TO_GMT_HREF} onClick={onBackToGmtClick} className="flex items-center gap-2 mr-auto min-w-0 no-underline" title="GMT">
          <GmtWordmark className={`w-auto shrink-0 opacity-80 ${phone ? 'h-3' : 'h-3.5'}`} />
          <span className={`font-semibold text-fg truncate ${phone ? 'text-[13px]' : 'text-[15px]'}`}>Gradient Explorer</span>
        </a>
        {/* 40 px hit boxes on a phone (`max-md:`): 32 is comfortable for a pointer and
            under the ~44 px a fingertip wants. The GLYPH stays 24 either way. */}
        <button className={`${tb} w-8 px-0 flex items-center justify-center`} title="Undo (Ctrl+Z)" onClick={undo}><Icon name="undo" size={phone ? 18 : 20} /></button>
        <button className={`${tb} w-8 px-0 flex items-center justify-center`} title="Redo (Ctrl+Y)" onClick={redo}><Icon name="redo" size={phone ? 18 : 20} /></button>
        {/* Back to GMT carries no gradient (owner, 2026-09-07): the working gradient is already
            in GMT's My Gradients panel through the shared `gmt.favients` Recent group. Only
            shown when this page was opened from the studio. Opened by GMT's Explorer button,
            it closes this tab to land back in the GMT tab, or restores GMT's stashed scene
            here when it cannot (owner, 2026-09-23; ./fromGmt). The brand link does the same. */}
        {cameFromGmt && !phone && (
          <a className={`${tb} flex items-center no-underline`} href={BACK_TO_GMT_HREF} onClick={onBackToGmtClick} title="Back to the GMT studio">
            Back to GMT
          </a>
        )}
        {/* Help · Support · Feedback — installHelp's registered menu (v2/main.tsx), opened
            from the shell's own buttons because there is no TopBarHost (@see ./ShellMenu).
            PHONE: ONE menu in the gear's place, the gear folded into it (owner, 2026-09-13). */}
        {phone ? (
          <ShellMenuButton menuId="help" icon={<MenuIcon />} title="Menu" prepend={phoneMenuItems()} />
        ) : (
          <>
            <ShellMenuButton menuId="help" icon={<HelpIcon />} />
            <SettingsButton />
          </>
        )}
      </header>

      <div className="shrink-0">
      <WorkingHero
        derived={derived}
        source={source}
        tray={tray}
        onTray={(face) => (face === 'image' ? requestImageOrOpen() : openTray(face))}
        onCancelFace={cancelFace}
        onBake={bakeFace}
        folded={folded}
        onShare={share}
        onRevealGround={revealGround}
        onExport={exportOpenToggle}
        onWallpaper={wallpaper}
        onNewGradient={startNewGradient}
        exportOpen={exportOpen}
        exportMenu={
          exportOpen && derived.ramp ? (
            <ExportMenu
              ramp={derived.ramp}
              name={derived.name}
              palette={derived.palette.map((s) => s.color)}
              origin={derived.origin}
              config={derived.config}
              source={workingSourceOf(derived.input)}
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
          onImported={finishImport}
          importGroup={ownedGroundGroup}
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
          <BrowseStage heroFolded={folded} onFoldHero={fold} onNewGradient={startNewGradient} />
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
      {/* THE DROP HINT (parity row M8, 2026-09-23): while a FILE is over the page, say what a
          drop does here — the two things the help's "Your own files" promises, and nothing
          else. The same scrim app-gmt shows for a scene file (`DropScrim`, the `osDrop` tier);
          pointer-events-none, so the drop still lands on the window listener above. Gone the
          moment the file drops or the drag leaves (`useImageDrop`'s 130 ms dragover timeout).
          Guard: `npm run smoke:ge-gradientfile` [h1] / [h2]. */}
      {fileOver && <DropScrim title="Drop to load" detail="Gradient files are imported · an image makes a gradient" data-gx-drop-hint="" />}
      <SettingsHost />
      {/* the Help browser (Getting Started / Keyboard Shortcuts, and the context menu's
          Help) and the Support modal — the Help menu's surfaces outside the menu itself */}
      <HelpOverlay />
      <FeedbackWindow />
      <ToastHost />
      <FullscreenGradientOverlay />
    </div>
    </MobileViewportShell>
    </StoreCallbacksProvider>
  );
};

export default GradientExplorerV2App;
