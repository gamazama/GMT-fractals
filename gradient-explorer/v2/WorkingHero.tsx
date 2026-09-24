/**
 * WorkingHero — the ONE hero of the v2 shell, and it IS the stops editor (owner reviews
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised, §6b, §12).
 *
 * Phase B (2026-09-06, plans/ge-v2-unified-shell-plan.md §4) made it the three-column band
 * of mock C. The owner's Figma pass (2026-09-07, "Hero v3 (agreed)" in the GE v2 Hero file;
 * plans/ge-v2-figma/hero-spec.md §7a) reshaped it into a CARD:
 *
 *   • the band (`surface-raised`) holds one card, radius 32, 10 px inset; the 24 px gutter
 *     (V7) is kept INSIDE it (10 + 1 + 13). Two columns, not three:
 *   • SOURCE — the `ImageSlot` (L3: the image is reached into, never switched to). Slim
 *     while empty, a card-tall square once an image is loaded. Phase C turns its click
 *     from a tab switch into a tray.
 *   • the PANEL — radius 20 on the wall's own ground (`surface-viewport`): a header strip
 *     (name · state · More like this · the four USE icons), the palette, the ramp, the
 *     expanders. The USE column and both zone labels are gone — the card's shape does the
 *     grouping (owner: the less text on screen, the better). Keep · Share · Export ·
 *     Wallpaper are icon `Act`s at the header's right edge (L2); the shell still owns
 *     what they DO (P3).
 *
 * Surfaces map the Figma ladder (band > card > panel, three clear steps) onto the tokens
 * the running scheme already generates: raised > section > viewport. The Figma hexes are
 * lighter than the app's — see hero-spec.md §7b.
 *
 * Two behaviours the band carries:
 *
 *   • **L8 — the hero never unmounts once it exists.** An empty source (the Image tab with
 *     no image, a Mix with nothing in it) keeps the LAST gradient on the ramp — shown, not
 *     editable, since there is no live document behind it — with an empty source band
 *     saying what is missing. The previous working gradient is one undo away through
 *     workingStore, unchanged. Guarded by `npm run smoke:ge-hero`.
 *   • **L9's quiet hero is GONE** (owner, 2026-09-07: no source hiding when the pointer is
 *     over the wall). The hero is the same whatever the pointer does.
 *
 * Top to bottom inside the WORK column:
 *   1. name · state chip · More like this · ★  (Mix is a source tab, not a button here —
 *      owner: less UI is more likely to be clicked than advertising in a busy one)
 *   2. the PALETTE ROW — draggable sample positions on top of the ramp (PaletteRow). A click
 *      on a swatch selects its stop in the editor (creating one if there is none), so the
 *      palette and the stops are one thing seen twice — owner review 2026-09-03.
 *   3. the RAMP — SPLIT whenever the pipeline is doing something (owner, 2026-09-03: "the
 *      source and result language as a split hero"): a thin SOURCE band on top
 *      (SourceBands: the picked gradient / the raw image ramp / the stops before Adjust; in
 *      Mix it is A · crossfade · B, the two bands being the armable slots) and the RESULT
 *      band under it, which is the shared AdvancedGradientEditor in `strip` chrome: draggable stop knots,
 *      add on click, right-click menu, per-stop colour picker under it whose Palette row IS
 *      the working palette (one palette, not two). Its inspector's left column carries our
 *      Curves ▾ / Adjust ▾ toggles (`stripAside`) beside the editor's own blend / output /
 *      menu items — no separate bar. The first gesture on a live or picked input is the bake
 *      (workingStore.beginEdit).
 *   4. the TRAY (Phase C, 2026-09-07 — `Tray.tsx`): one surface hanging from the card's
 *      bottom edge over the wall, one face at a time — Mix · Image · Curves · Adjust from
 *      the tab row in the ramp's control row, the stop inspector from a stop selection.
 *      The shell owns which face is open (`tray` / `onTray`), since Mix and Image are
 *      sources; the hero only hosts it. Nothing here pushes the wall any more.
 *
 * There is no previewing state and no preview row any more: a Browse or shelf click IS a
 * Use (the shell does it), the previous working gradient is one undo step away, and the
 * first ramp gesture edits. States: hidden (nothing yet) · working · live from Mix /
 * Image · edited (return to source).
 *
 * PHONE (Phase F, 2026-09-10) — the card is COMPACT, not a sheet. Everything above still
 * holds; four things change, and each was a measured overflow at 390 px:
 *   • the card is ONE COLUMN. The image column goes, and with it the panel's left shadow —
 *     that shadow exists because the image column is the one side the panel has anything
 *     under it (ADR-0114 rule 1), and with no column there is nothing for it to fall on.
 *     The picture moves into the tray's Image face; a 26 px DOOR (`ImageSlot compact`)
 *     takes its place in the header row, and its click is the same `onTray('image')`.
 *   • the name TAKES WHAT IS LEFT (`flex-1 min-w-0`) instead of hugging its text under a
 *     `max-w-[60%]` cap. The hug is a grid whose column is sized by an invisible mirror
 *     span; a flex row narrower than that mirror shrinks the SPAN but not the column, so
 *     the input painted its full width over the state chip beside it — the Mix overprint.
 *     One column that can shrink to nothing cannot overprint anything.
 *   • "More like this" shortens to "Similar", so the four use icons fit on the row with it.
 *     (The phase asked for a glyph; this set has none that means "rank the wall by likeness"
 *     and drawing one is the owner's call — ADR-0114 rule 3.)
 *   • the row's padding and the use cluster's gaps tighten (`px-3`, `gap-1`), which is the
 *     ~24 px that decides whether the name is legible or a stub.
 *
 * The card also gives up ~62 px of HEIGHT to come in under the phase's 220 px ceiling
 * (measured 285 before, 219 after, at 390×844). Where it came from, largest first: the tab
 * pill's side padding, because at 390 the tabs and the editor's blend / output / menu group
 * came to 338 px in a 320 px line and WRAPPED — 4 tabs × 4 px un-wrapped them and bought
 * 30 px; then the unsplit ramp 60 → 44; then the band, body and palette-row paddings.
 * Every one of those is a `phone ?` at its own site with the reason beside it.
 * @see docs/adr/0115-the-shell-on-a-phone.md
 *
 * Editor wiring: while the input is NOT the stops document, the editor shows the derived
 * config (verbatim for a picked gradient, fitted for a live one) and the bracket hooks fold
 * it into the document on the first gesture; afterwards it edits paletteEditorStore through
 * the (d) seam (editorEditStart / editorEditEnd / editorEdit). Stop ids are index-derived by
 * the fitter, so the fold hands the editor the same ids it already holds.
 */

import { unmodifiedOrigin, type CatalogOrigin } from '../../palette/core/catalogOrigin';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdvancedGradientEditor, { type AdvancedGradientEditorHandle } from '../../components/AdvancedGradientEditor';
import { useWorkingStore, addStopsToWorking, workingSourceOf, type WorkingDerived } from '../../palette/store/workingStore';
import { importedSourceOfWorking } from './contributeToGlobal';
import { FROM_GMT_SOURCE } from './fromGmt';
import { sameGradientBody } from '../../components/gradient/rampMode';
import { isRampGradient, stopsOf } from '../../utils/gradientRamp';
import { setFavientDrag, beginCustomAvatarDrag } from '../../palette/core/favientDnd';
import { startPointerGradientDrag, cancelPointerGradientDrag } from '../../palette/core/pointerGradientDrag';

/**
 * How far a knot marquee may travel past the knot track before it becomes a drag of the
 * WHOLE gradient. 44 px — a comfortable overshoot in any direction, so a marquee drawn
 * around the end knots does not trip it, and turning back before you leave puts you right
 * back in the selection (owner, 2026-09-09: "a bit past the knot area … taking care that
 * the selection is still available for part of the way in case they want to turn back").
 *
 * Deciding by TRAVEL rather than by where the press landed is the whole point: the first
 * attempt used a press-time zone and swallowed drags that were reaching for knots.
 */
const MARQUEE_ESCAPE = 44;
/**
 * How long after a pick that put the hero on screen a press on the gradient is still that
 * pick's second click (J01) — about the platform's double-click interval. The first pick mounts
 * the hero (an unfold shows it again) and the wall drops ~240 px under the pointer, so a
 * double-click on a tile, or the "click it again" Help teaches, lands its second press on the
 * ramp — where a press inserts a knot, and a double-click selects every knot. Within this window
 * the press does what a second click on the tile does (the keep, `beginEdit`) and nothing else
 * (grep `onRevealPress` for which presses count).
 */
const REVEAL_DOUBLE_MS = 450;
/** Working sources that are NOT a click on a tile — so the preview chip cannot say "click it
 *  again" (HT-14). The strings are the ones the shell passes to `use` (grep `.use(` in
 *  ./GradientExplorerV2App and ./fromGmt). */
const NOT_A_PICK: ReadonlySet<string> = new Set(['New', 'Mix', 'Image', 'Shared link', FROM_GMT_SOURCE]);
import { setDragOrigin } from '../../palette/store/dragVisual';
import { useFavientsStore, favientSig, isRecentGroup, DEFAULT_GROUP } from '../../palette/store/favientsStore';
import { KEPT_LABEL } from '../../palette/core/groundSets';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../../palette/store/paletteEditorStore';
import { paramEdit, paramGroup } from '../../palette/store/paramUndoBracket';
import { applyEditorChange } from '../../palette/core/editorConfig';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { isColorDrag, readColorDrag, colorInFlight } from '../../components/gradient/colorDrag';
import { useEyedropperActive } from '../../components/gradient/eyedropperActive';
import { flashSaveWhereItLanded } from './setSaveFlash';
import { PaletteRow } from './PaletteRow';
import { ImageSlot } from './ImageSlot';
import { SourceBands, SOURCE_BAND_H, MIX_RESULT_H, mixSourceHeight } from './SourceBands';
import { Tray, TRAY_TABS, type TrayFace } from './Tray';
import { useStopSelectionHistory } from './uiHistory';
import { Act } from './ui/Act';
import { StateChip } from './ui/StateChip';
import { Icon } from './ui/Icon';
import { InputSkinProvider } from '../../components/inputs';
import { Floating } from './ui/Floating';
import { useIsPhone } from './useIsPhone';
import { runExport, useRecentExports, exportActionLabel, exportActionId, readExportSettings } from './exportActions';
import type { RGB } from '../../palette/core/oklab';
import type { GradientConfig, GradientStop } from '../../types';
import type { ContextMenuItem } from '../../types/help';
import type { SourceId } from './GradientExplorerV2App';

/** The gradient panel's corner radius (px) — `rounded-[20px]` on the panel below. */
const PANEL_RADIUS = 20;

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Measure an element's width (for the palette drag scale and the curve editor). A callback
 *  ref, not an effect: the hero mounts its ramp AFTER the first render (it is hidden until a
 *  pick), so an effect with an empty dep list would observe nothing and the width would stay
 *  at its seed — which is exactly the "squashed curves" the owner saw. */
const useWidth = (): [(el: HTMLDivElement | null) => void, number] => {
  const [w, setW] = useState(640);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const update = () => setW(Math.max(200, el.clientWidth));
    update();
    ro.current = new ResizeObserver(update);
    ro.current.observe(el);
  }, []);
  return [ref, w];
};

interface Props {
  derived: WorkingDerived;
  source: SourceId;
  /** Which tray face is open (Phase C) — the shell owns it, since Mix / Image are sources. */
  tray: TrayFace;
  /** Open a face (the same face again closes it); `null` closes. */
  onTray: (face: TrayFace) => void;
  /** Cancel the open face — back to what was there before it (C.3 / C.9: the state chip on
   *  a live face, and a click on the ramp's SOURCE half while a face is open). */
  onCancelFace: () => void;
  /** Bake the open face's result (C.9: a click on the ramp's RESULT half) — the face closes
   *  and its transformations reset; the stops are the result. */
  onBake: () => void;
  /** FOLDED (owner, 2026-09-11: "we need to be able to get back to the fullscreen wall",
   *  then: "we don't need to leave a remnant of the hero when the wall is fullscreened"):
   *  the whole band is HIDDEN — `hidden`, not unmounted (L8: the hero never unmounts; the
   *  editor keeps its state). The control lives with the wall's tools (BrowseStage), and a
   *  pick shows the band again. */
  folded: boolean;
  /** When the last pick that put this hero ON SCREEN happened (`performance.now()`; the shell's
   *  candidate effect writes it). A press on the gradient within `REVEAL_DOUBLE_MS` of it is the
   *  second half of that click (J01) — see `onRevealPress`. */
  revealAt?: React.MutableRefObject<number>;
  onShare: () => void;
  /** Close whatever covers the SET RAIL (a tray face, the Export windows), so a save can be
   *  seen landing there. The ♥ calls it inside its own undo bracket — @see ./uiHistory. */
  onRevealGround: () => void;
  onExport: () => void;
  onWallpaper: () => void;
  /** Start a new gradient from nothing (parity row M10) — the ☰ menu's lead item. The shell
   *  owns what it does (the same call as the nothing-picked line's "start a new one"). */
  onNewGradient?: () => void;
  exportOpen: boolean;
  /** Export's popover, anchored inside the use cluster. */
  exportMenu?: React.ReactNode;
}

export const WorkingHero: React.FC<Props> = ({ derived, source, tray, onTray, onCancelFace, onBake, onShare, onRevealGround, onExport, onWallpaper, onNewGradient, exportOpen, exportMenu, folded, revealAt }) => {
  const phone = useIsPhone();
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const liveFrom = useWorkingStore((s) => s.liveFrom);
  const favients = useFavientsStore((s) => s.favients);
  const lastGroupId = useFavientsStore((s) => s.lastGroupId);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const docConfig = usePaletteEditorStore((s) => s.config);
  const [rampRef, rampW] = useWidth();
  // the ramp ELEMENT too: useWidth's callback ref does not retain it, and projecting a drop
  // from anywhere on the gradient down onto the ramp needs its rect (§8b item 1).
  const rampElRef = useRef<HTMLDivElement | null>(null);
  const setRampEl = useCallback((el: HTMLDivElement | null) => { rampElRef.current = el; rampRef(el); }, [rampRef]);
  /** The span a dropped colour's `t` is measured against: the editor's KNOT TRACK, which is
   *  inset 8 px each side of the ramp's outer box for the gutters. Measuring against the
   *  outer box instead skews t by up to ~0.7 % — small, but it means a colour dropped
   *  directly above a knot does not land on it. */
  const dropSpan = useCallback((): DOMRect | null => {
    const ramp = rampElRef.current;
    const track = ramp?.querySelector('[data-gx-knot-track]');
    return (track ?? ramp)?.getBoundingClientRect() ?? null;
  }, []);
  /** Where a colour in flight would land: px across the gradient body, and t on the ramp. */
  const [dropGhost, setDropGhost] = useState<{ x: number; t: number } | null>(null);
  /** A screen pick is in progress — the source image must show faithfully (§8b item 8). */
  const eyedropping = useEyedropperActive();
  const editorRef = useRef<AdvancedGradientEditorHandle>(null);
  // The tray's left edge = the panel's left edge PLUS the panel's corner radius (owner,
  // 2026-09-07: "include the corner radius too"), i.e. where the panel's flat bottom edge
  // begins. Measured, not computed: the slot column is 45 px empty and a card-tall square
  // once an image is in.
  // A CALLBACK ref, not an effect: the hero renders nothing until the first pick, so an
  // effect with an empty dep list would run before the panel exists and never again (it
  // did — the 85 px default was right only by coincidence).
  const [panelLeft, setPanelLeft] = useState(85);
  // …and its RIGHT edge is the ☰ menu's, where the control row it hangs from ends (HT-17): an
  // inset from the band's right, measured with the left one. The panel's flat edge (its right
  // less the corner radius) stands in before the row exists, mirroring the left rule.
  const [panelRight, setPanelRight] = useState(24);
  // …and the panel's HEIGHT is the card's: the picture in the slot is sized from it (the slot
  // must never size the card — measuring the slot's own column fed back and crept: 302, 327…).
  const [panelH, setPanelH] = useState(200);
  const panelRo = useRef<ResizeObserver | null>(null);
  const panelRef = useCallback((el: HTMLDivElement | null) => {
    panelRo.current?.disconnect();
    panelRo.current = null;
    if (!el) return;
    const band = el.closest('[data-gx-hero]') as HTMLElement | null;
    const update = () => {
      if (!band) return;
      // The tray's left edge is the TAB ROW's left edge (owner, 2026-09-07 evening: "aligned
      // to the tabs"); before the tabs exist (empty source) the panel's flat edge stands in.
      const tabs = band.querySelector('[data-gx-tray-tabs]') as HTMLElement | null;
      const edge = tabs ? tabs.getBoundingClientRect().left : el.getBoundingClientRect().left + PANEL_RADIUS;
      setPanelLeft(Math.round(edge - band.getBoundingClientRect().left));
      // The tabs' row ends with the editor's blend · ☰ group (its last child, right-aligned).
      const menu = tabs?.parentElement?.lastElementChild as HTMLElement | null | undefined;
      const rightEdge = menu && menu !== tabs ? menu.getBoundingClientRect().right : el.getBoundingClientRect().right - PANEL_RADIUS;
      setPanelRight(Math.round(band.getBoundingClientRect().right - rightEdge));
      setPanelH(Math.round(el.getBoundingClientRect().height));
    };
    update();
    panelRo.current = new ResizeObserver(update);
    panelRo.current.observe(el);
    if (band) panelRo.current.observe(band);
  }, []);
  // The tray's inspector face is a portal host the editor renders its stop inspector into;
  // a stop selection opens that face, clearing it closes it, and the shell's Esc order closes
  // it by clearing the selection (the effect below).
  const [inspectorEl, setInspectorEl] = useState<HTMLDivElement | null>(null);
  // The Image face's hosts: the picture lives in the slot; its tools and colour cloud
  // portal into the tray (C.6, second take).
  const [imageCloudEl, setImageCloudEl] = useState<HTMLDivElement | null>(null);
  const [imageToolsEl, setImageToolsEl] = useState<HTMLDivElement | null>(null);
  const trayRef = useRef<TrayFace>(tray);
  trayRef.current = tray;
  const selectionCount = useRef(0);
  const onSelectionChange = useCallback(
    (n: number) => {
      selectionCount.current = n;
      if (n > 0 && trayRef.current !== 'inspector') onTray('inspector');
      else if (n === 0 && trayRef.current === 'inspector') onTray(null);
    },
    [onTray],
  );
  useEffect(() => {
    if (tray !== 'inspector' && selectionCount.current > 0) editorRef.current?.clearSelection();
  }, [tray]);
  /**
   * THE INSPECTED STOP RIDES THE UNDO ENTRY WITH ITS FACE (2026-09-24). The inspector face is only
   * a portal host for the editor's selection, so the shell restoring `tray: 'inspector'` without
   * the stop put back an EMPTY panel — measured: ♥ or New Gradient with a stop inspected, Ctrl+Z,
   * the face open with nothing in it. The selection is CONTEXT too (@see ./uiHistory): captured
   * with the face when a gesture begins, restored with it.
   *
   * WHEN it is applied is the point. The restore runs inside `undo`, in the same batch as the
   * value it belongs to; the editor handles a value from another lineage by CLEARING its
   * selection when that value arrives (its own effect). So the ids wait in `selRestore` and are
   * applied from this component's effect, which React runs after the editor's for the same
   * commit. If none of them is on the restored gradient, the face goes rather than stay empty.
   *
   * Guard: `npm run smoke:ge-uiundo` [6] (the ♥), [12] (a deleted stop comes back inspected), [14]
   * (an open Reduce popup keeps the selection it cleared — `restoreSelection` declines); this
   * effect returning early reds all three (F2 in that smoke's header).
   */
  const [selRestore, setSelRestore] = useState<{ ids: string[] } | null>(null);
  useStopSelectionHistory(
    () => (trayRef.current === 'inspector' ? editorRef.current?.getSelection() ?? [] : []),
    (ids) => setSelRestore({ ids }),
  );
  useEffect(() => {
    if (!selRestore) return;
    setSelRestore(null);
    // Another face came back: the effect above clears whatever is selected.
    if (tray !== 'inspector') return;
    if (!(editorRef.current?.restoreSelection(selRestore.ids) ?? 0)) onTray(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selRestore]);
  const [scrubT, setScrubT] = useState<number | null>(null);
  /** Whether the header may start a drag of the gradient, decided when the press lands (HT-01):
   *  false for a press inside the name input. See the header row below. */
  const [headerDrag, setHeaderDrag] = useState(true);
  /** Until when the click / dblclick of a press taken as a reveal's second click are swallowed
   *  too (J01; see the section's capture handlers). */
  const swallowUntil = useRef(0);
  /** The gradient's own body — the palette row and the ramp (J01's zone, see `onRevealPress`). */
  const gradientBodyRef = useRef<HTMLDivElement | null>(null);
  /**
   * RENAMING IS ONE EDIT (HT-06). While the name field has focus it edits a local DRAFT; the name
   * is written once, on blur or Enter — one `setName`, one undo entry — instead of on every key
   * (four entries for "Abcd"). An empty draft becomes the automatic name only then: written per
   * keystroke, clearing the field refilled it at once, so a name could not be cleared and typed
   * again. Esc puts the name back and leaves the field, and is marked handled
   * (`preventDefault`) so the shell's Esc chain does not also close a face.
   */
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameCancelled = useRef(false);

  // L8 — the hero never unmounts once it exists. An empty source (the Image tab with no
  // image, a Mix with nothing in it) used to return null and take the whole hero with it.
  // Instead the LAST gradient the pipeline produced stays on the ramp (it is also one undo
  // away in workingStore) and the source half says what is missing. Refs, not state: this
  // is a memory of the render, and re-rendering because of it would be a loop.
  const lastGood = useRef<{ config: GradientConfig; ramp: RGB[] } | null>(null);
  if (derived.config && derived.ramp) lastGood.current = { config: derived.config, ramp: derived.ramp };
  const emptySource = !derived.config || !derived.ramp;
  const shown = emptySource ? lastGood.current : { config: derived.config!, ramp: derived.ramp! };

  const config = derived.config;
  // The split: Mix always (its source is two things); otherwise whenever the output is not
  // the input verbatim (curves on, Adjust off default, an image fit). Bake = passthrough
  // again = the bands merge.
  const split = derived.input.kind === 'build' || !derived.passthrough;
  // THE BAKE GESTURE (C.9, owner 2026-09-07 evening): while a face is open and the ramp is
  // split, the two halves are the controls — the top (source) half click keeps the source
  // (cancel), the bottom (result) half click bakes the result. The face closes either way
  // and its transformations reset. Instant hints on hover (HalfHint), no delay.
  const gesture = split && !!tray && tray !== 'inspector';
  // Is the loaded image still WHAT YOU SEE? Live from Image, yes; baked from Image and
  // untouched (leaving the face bakes; that alone must not shrink the picture — owner,
  // 2026-09-07: "only after an adjustment, to avoid jarring"), yes; a new pick, a stop
  // edit, a dial in another face — no: the picture greys and shrinks (ImageSlot `dim`).
  const imageIsTheGradient = useMemo((): boolean => {
    const input = derived.input;
    if (input.kind === 'extract') return true;
    if (input.kind === 'gradient') return input.source === 'Image' && derived.passthrough;
    if (input.kind === 'stops' && bakedFrom?.input.kind === 'gradient' && bakedFrom.input.source === 'Image') {
      // Either form (ADR-0122): an Image extract that would not fit cheaply bakes as a RAMP, and
      // two ramps both carry `stops: []` — comparing stops alone called every edit of one "untouched".
      return derived.passthrough && sameGradientBody(bakedFrom.input.config, docConfig);
    }
    return false;
  }, [derived.input, derived.passthrough, bakedFrom, docConfig]);
  // Mix: the ramp splits CLEANLY in two — band A over the result, 30 + 30, no divider
  // (owner, 2026-09-07); the other split states keep the thin labelled source band.
  const mix = derived.input.kind === 'build';
  const sourceH = mix ? mixSourceHeight() : SOURCE_BAND_H;
  // PHONE: an unsplit ramp is 44 rather than 60. Split heights are untouched — those bands
  // are already thin and a source you cannot read is worse than a tall card.
  // The split result is what is LEFT of the 60: the source band and its 1 px divider (`mb-px`)
  // come out of it, so splitting and merging the ramp never moves the wall (J13 — it was 42,
  // and every face open or close nudged the wall by 1 px).
  const resultH = split ? (mix ? MIX_RESULT_H : 60 - SOURCE_BAND_H - 1) : phone ? 44 : 60;
  const favOf = useMemo(() => {
    const c = derived.config ?? lastGood.current?.config;
    if (!c) return null;
    const sig = favientSig(c);
    // Kept = filed by the user. The Recent session entry always matches (it follows the
    // work), so it must not light the star.
    return favients.find((f) => !isRecentGroup(f.group) && favientSig(f.config) === sig) ?? null;
  }, [favients, config, derived.config]);
  /**
   * WHERE THE ♥ FILES, named on its title (owner, 2026-09-24: "Keep — save to {group}"). The group
   * is the one `favientsStore.add()` will choose — the last group used, unless it has vanished or
   * is Recent, else Kept (grep `Never land a deliberate user save in Recent` there; this mirrors
   * that rule and must follow it if it changes) — labelled the way the set rail labels it
   * (grep `KEPT_LABEL` in palette/core/groundSets). Read-only: the store is not touched.
   */
  const keepInto = useMemo((): string => {
    const lg = lastGroupId;
    const present = lg === DEFAULT_GROUP || !!groupLabels[lg] || favients.some((f) => (f.group ?? DEFAULT_GROUP) === lg);
    const group = present && !isRecentGroup(lg) ? lg : DEFAULT_GROUP;
    return groupLabels[group] ?? (group === DEFAULT_GROUP ? KEPT_LABEL : group);
  }, [lastGroupId, groupLabels, favients]);
  const paletteHex = useMemo(() => derived.palette.map((s) => hexOf(s.color)), [derived.palette]);
  /** The swatch row as colours — what an export's SWATCHES subject takes (§8b item 5). */
  const paletteRgb = useMemo(() => derived.palette.map((s) => s.color), [derived.palette]);
  /** The ☰ menu's LEAD (the editor's `menuLead` seam): New Gradient acts on the document, not on
   *  a stop, so it sits above the editor's own sections — in the ☰ and the bar's right-click
   *  alike, never on a knot's menu. Title Case, as the rest of that menu is. */
  const menuLead = useMemo<ContextMenuItem[] | undefined>(
    () => (onNewGradient ? [{ label: 'New Gradient', action: onNewGradient }] : undefined),
    [onNewGradient],
  );

  // L9 — before the first pick there is no hero at all; that state is unchanged.
  if (!shown) return null;

  /**
   * The ♥ — file the working gradient, and make sure you can SEE where it landed.
   *
   * Bracketed with `paramEdit` (2026-09-12): the favients shelf rides Ctrl+Z through its own
   * history provider, but only inside a bracket, and this handler never opened one — so a ♥
   * was not undoable at all. The bracket also carries the two things below it.
   *
   * `onRevealGround` closes whatever covers the rail before the write, because the flash on
   * the chip is the ONLY thing that names the set that took it, and a flash behind a tray face
   * or an Export window is no announcement (the open item raised 2026-09-11). Closing a
   * surface out from under the user is acceptable here and nowhere else, because it is inside
   * the bracket: one Ctrl+Z un-files the gradient and puts the face back exactly as it was —
   * the stop inspector included, with its stop (the selection is context too, ./uiHistory).
   *
   * No `flushSync` any more (2026-09-24). It was load-bearing while the interface rode an entry
   * only when it CHANGED inside the bracket: the diff ran before a plain setState committed, so
   * the close was invisible to it. Since the interface became CONTEXT — captured when the bracket
   * opens and carried by every entry — the order inside the bracket does not matter.
   *
   * A LIVE SOURCE is committed first (J02): with the Mix or Image face open, `onRevealGround`
   * leaves it the way a tab close does, so the live result becomes the working gradient and the
   * ♥ files THAT — the gradient the hero shows afterwards, so the ♥ stays lit. The bracket is a
   * `paramGroup` for that commit: the shell's `openTray` groups its own writes, and a group's end
   * inside a plain `paramEdit` would close it before the save, leaving the save outside undo.
   */
  const toggleStar = () => {
    const st = useFavientsStore.getState();
    if (favOf) {
      paramEdit(() => st.remove(favOf.id));
      return;
    }
    const leavesSource = tray === 'mix' || tray === 'image';
    // The ♥ is a long way from the rail it files into, so the chip that takes the gradient
    // says so: it fills with the gradient and the fill collapses away, slower and with a
    // bloom because nothing else points at where this one went (owner, 2026-09-11).
    paramGroup(() => {
      onRevealGround();
      const now = useWorkingStore.getState().input;
      const committed = leavesSource && now.kind === 'gradient' ? now : null;
      const config = committed ? committed.config : shown.config;
      flashSaveWhereItLanded(
        config,
        () => {
          useWorkingStore.getState().syncRecent();
          // The favourite keeps the catalogue origin when the gradient is still the one picked.
          st.add(
            config,
            committed ? committed.name : derived.name,
            committed ? committed.source : derived.input.kind === 'gradient' ? derived.input.source : 'Working',
            unmodifiedOrigin(derived.origin, config) ?? undefined,
          );
        },
        { slow: true },
      );
    });
  };

  // ── editor wiring ─────────────────────────────────────────────────────────────
  // Only reached with a live source (an empty one shows a plain strip, not the editor).
  const editorValue: GradientConfig = derived.edited ? docConfig : (config ?? shown.config);
  /** The editor is in RAMP MODE (ADR-0122): no knots, so nothing here may select, insert or
   *  recolour one — a swatch click copies its hex instead, and a dropped colour is refused. */
  const editorIsRamp = isRampGradient(editorValue);
  /** "Add stops" on the ramp. The pipeline OUTPUT is what gets stops (Adjust and curves
   *  included): a ramp output is fitted uncapped (`addStopsToWorking`); an output that already
   *  carries stops — a ramp document under a live Adjust — is simply baked, as a stop edit would. */
  const onAddStops = () => {
    if (stopsOf(derived.config).length > 0) useWorkingStore.getState().beginEdit();
    else addStopsToWorking();
  };
  const ensureEditing = () => {
    if (useWorkingStore.getState().input.kind !== 'stops') useWorkingStore.getState().beginEdit();
  };
  const onEditorStart = () => {
    ensureEditing();
    editorEditStart();
  };
  const onEditorEdit = (mutate: () => void) => {
    ensureEditing();
    editorEdit(mutate);
  };
  const onEditorChange = (val: GradientConfig | GradientStop[]) => {
    ensureEditing();
    const cur = usePaletteEditorStore.getState().config;
    usePaletteEditorStore.getState().setConfig(applyEditorChange(cur, val));
  };
  // The state reads inline in the heading bar (V3 as amended by Phase A iteration 1); an
  // empty source has no state of its own — the source band says what is missing instead.
  // Bake and cancel are ONE mechanism, and the chip is it (C.3): a live face bakes when it
  // closes; clicking the chip cancels it instead — back to what was working before. An
  // edited bake's chip returns to its source the same way.
  // From the INPUT, not the tray: a live input whose face is closed still names itself (J02).
  const liveName = derived.input.kind === 'build' ? 'Mix' : 'Image';
  const stateChip = emptySource ? null : derived.live ? (
    <StateChip
      kind="live"
      variant="inline"
      title={liveFrom ? `Cancel ${liveName} (or Esc): go back to the gradient you had before it` : undefined}
      onClick={liveFrom ? onCancelFace : undefined}
      // the action words underline on hover (owner, 2026-09-24 — StateChip's `action`)
      action={!phone && liveFrom ? 'cancel' : undefined}
      data-gx-state="live"
    >
      {/* PHONE: the chip STATES and the title EXPLAINS. " · cancel" is an affordance hint,
          and at 390 px those ~60 px are the difference between a readable name and none at
          all — measured: with "editing · return to source" the name collapsed to zero. The
          tap still cancels, and the title still says so. */}
      {/* PHONE, later that day: the chip is the DOT alone — the fold's ▴ was half off-screen
          with the words in the row (owner). The colour still states, the title still explains,
          the tap still cancels. */}
      {phone ? null : <>live from {liveName}</>}
    </StateChip>
  ) : derived.edited ? (
    <StateChip
      kind="edited"
      variant="inline"
      title={bakedFrom ? 'Undo the bake and go back to the source that produced this gradient' : 'Edited stops'}
      onClick={bakedFrom ? () => useWorkingStore.getState().returnToSource() : undefined}
      action={!phone && bakedFrom ? 'return to source' : undefined}
      data-gx-state="edited"
    >
      {phone ? null : 'editing'}
    </StateChip>
  ) : (
    // Titled by where it came from (HT-14): only a wall or shelf pick has a tile to click again.
    // "Start editing", not "keep" — the ♥ beside it is Keep (save to My Gradients).
    <StateChip
      kind="picked"
      variant="inline"
      title={derived.input.kind === 'gradient' && NOT_A_PICK.has(derived.input.source) ? 'Change a stop to start editing it' : 'A preview — click it again on the wall, or change a stop, to start editing it'}
      data-gx-state="preview"
    >
      {phone ? null : 'preview'}
    </StateChip>
  );

  /**
   * THE REVEAL'S SECOND CLICK (J01). A press ON THE GRADIENT within REVEAL_DOUBLE_MS of the pick
   * that put the hero on screen is taken as that pick's second click: it keeps the gradient (the
   * keep a second click on the tile makes — `beginEdit`) and reaches nothing under it, so no knot
   * is inserted and no stop selected. "On the gradient" is the body (`gradientBodyRef`: the palette
   * row and the ramp — source band, bar, knot track), where a press edits; NOT the header, the
   * tab row under the bar or the tray, which are controls of their own and act as clicked (a
   * smoke, or a quick hand, reaching for the Image tab right after a pick must get the tab). Its
   * click and dblclick are swallowed too, because the bar's own double-click selects every knot.
   * One press per reveal: the window is spent by the first press it takes. Capture phase, so it
   * lands before the knot track's and the swatches' own pointerdown.
   */
  const onRevealPress = (e: React.PointerEvent) => {
    if (!revealAt || performance.now() - revealAt.current >= REVEAL_DOUBLE_MS) return;
    const target = e.target as Node;
    const body = gradientBodyRef.current;
    if (!body || !body.contains(target)) return;
    // the editor's tab row (the tabs, the blend chooser, the ☰) sits inside the body, under the bar
    const tabRow = body.querySelector('[data-gx-tray-tabs]')?.parentElement;
    if (tabRow && tabRow.contains(target)) return;
    revealAt.current = 0;
    swallowUntil.current = performance.now() + REVEAL_DOUBLE_MS;
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    const w = useWorkingStore.getState();
    if (w.input.kind === 'gradient') w.beginEdit();
  };
  const onRevealClick = (e: React.MouseEvent) => {
    if (performance.now() >= swallowUntil.current) return;
    if (e.type === 'dblclick') swallowUntil.current = 0;
    e.stopPropagation();
    e.preventDefault();
  };

  /** Both name fields (phone and desk) — see `nameDraft` above. */
  const nameValue = nameDraft ?? derived.name;
  const nameField = {
    value: nameValue,
    onFocus: () => {
      nameCancelled.current = false;
      setNameDraft(derived.name);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const text = e.currentTarget.value;
      setNameDraft(null);
      if (nameCancelled.current) {
        nameCancelled.current = false;
        return;
      }
      if (text !== derived.name) useWorkingStore.getState().setName(text);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        nameCancelled.current = true;
        e.currentTarget.blur();
      }
    },
  };
  /** A 1 px underline while the field is being edited (HT-13) — a text field matches
   *  `:focus-visible` whenever it has focus. Nothing at rest and nothing on hover. */
  const nameFocus = 'focus-visible:shadow-[inset_0_-1px_0_rgb(var(--line)/0.3)]';

  // What the EMPTY source band says (L8): the source is selected but has nothing in it.
  const emptyText =
    derived.input.kind === 'extract'
      ? 'image · drop one on the slot'
      : derived.input.kind === 'build'
        ? 'Mix · pick B from the wall'
        : 'no source · pick a gradient below';

  return (
    <section
      /* PHONE: 8 px above and below and NONE at the sides (owner, 2026-09-11: "extra padding
         on the sides that can be removed") — the card runs edge to edge as a BAND. The tray's
         `PHONE_INSET` is that same side number (0), so the two stay aligned by reading it
         from here (Tray.tsx names the pairing). */
      className={`relative shrink-0 bg-surface-raised border-b border-line/10 ${phone ? 'pt-1 pb-2 px-0' : 'p-2.5'}`}
      hidden={folded}
      data-gx-hero
      data-gx-selectable
      onPointerDownCapture={onRevealPress}
      onClickCapture={onRevealClick}
      onDoubleClickCapture={onRevealClick}
    >
      {/* the CARD — radius 20 (same as the panel, owner 2026-09-07), one object, inset 10 px in the band, and the PANEL flush with the card's top / right / bottom (owner,
          2026-09-07); the 24 px gutter is 10 (band) + 1 (card border) + 13 */}
      {/* a LEFT-ALIGNED tray (Image) grows out of the card's left edge: no bottom-left corner
          then (owner, 2026-09-07) */}
      {/* PHONE: one column — no image column, so no `pl-[13px]` gutter for it and no
          column gap either. */}
      {/* PHONE: the card is a BAND — square corners and no side borders, because it now
          meets the screen's edges (a 20 px radius at x = 0 shows the band colour in the
          corner, and a hairline border at the edge is a glitch). It also answers the tab
          artifact the owner saw: with the tray spanning the same width, a rounded bottom
          corner left a notch on each side above the tray's square top. */}
      <div className={`grid bg-surface-section border border-line/20 overflow-hidden ${phone ? 'rounded-none border-x-0' : 'rounded-[20px] gap-4 pl-[13px]'} ${tray === 'image' && !phone ? 'rounded-bl-none' : ''}`} style={{ gridTemplateColumns: phone ? 'minmax(0,1fr)' : 'auto minmax(0,1fr)' }}>
        {/* SOURCE — the image slot (L3). Slim while empty; a square as tall as the card
            once an image is in. It never moves and never unmounts. */}
        {!phone && (
        <div className="flex flex-col justify-center py-4">
          <ImageSlot
            active={source === 'extract'}
            // ...but never while the eyedropper is open: you are then picking OUT of the
            // picture, and a greyed 84 px thumbnail is what would be sampled — a colour the
            // photo does not contain (§8b item 8). What you are DOING decides how the image
            // is presented, not only whether the gradient still derives from it.
            dim={!imageIsTheGradient && tray !== 'image' && !eyedropping}
            instant={eyedropping}
            bigH={panelH - 32}
            onClick={() => onTray('image')}
            cloudHost={imageCloudEl}
            toolsHost={imageToolsEl}
            handles={tray === 'image'}
          />
        </div>
        )}

        {/* the PANEL — header strip, palette, ramp, expanders; the gradient's own ground */}
        {/* It sits ABOVE the card, so it casts. The shadow is offset LEFT only: the panel is
            flush with the card's top / right / bottom, so those sides have nowhere to fall
            and the card's `overflow-hidden` would clip them anyway — the one open side is
            the image column, which is what the shading reads against.
            PHONE: there IS no image column, so the shadow has nothing under it and goes —
            depth means what a surface floats over (ADR-0114 rule 1), and a shadow on a
            joined edge is a claim about a gap that is not there. */}
        <div ref={panelRef} className={`min-w-0 flex flex-col rounded-[20px] bg-surface-viewport overflow-hidden ${phone ? '' : 'shadow-[-10px_0_18px_-8px_rgba(0,0,0,0.55)]'}`}>
          {/* Owner, 2026-09-06 / 07: the name is the HEADER of the panel — one object with
              the ramp beneath it — the state reads inline, and the outputs (Keep · Share ·
              Export · Wallpaper) sit at its right edge as icons (L2), no use column. */}
          {/* The header is also the hero's DRAG HANDLE (§8b item 4 / the migration audit's
              M4): drag it onto a chip on the set rail to file the working gradient there.
              Every other gradient bar in the shell is draggable and L7 says the gesture is
              the same on every bar — before this the only way to file what you were working
              on was ★ (which puts it in Kept) and then dragging the tile. The RAMP cannot
              be the handle here: it is the stops editor, and a drag on it moves a knot.
              A press inside the name input turns the header's `draggable` OFF for that press
              (`headerDrag`, decided on pointerdown, before the browser's drag threshold), so
              sweeping across the name selects its text. Returning early from `onDragStart`
              alone did not do it: the browser's drag had already begun, and it dropped a
              second copy of the name into the field (HT-01). The early return stays as a
              belt. An empty source has nothing to hand over. */}
          <div
            className={`flex items-center gap-1.5 h-[42px] bg-surface-raised ${phone ? 'px-3' : 'px-4'}`}
            draggable={!emptySource && headerDrag}
            title={emptySource ? undefined : 'Drag onto a set below to file this gradient'}
            data-gx-hero-header=""
            onPointerDownCapture={(e) => setHeaderDrag(!(e.target as HTMLElement | null)?.closest('input'))}
            onPointerUp={() => setHeaderDrag(true)}
            onPointerCancel={() => setHeaderDrag(true)}
            onDragEnd={() => setHeaderDrag(true)}
            onDragStart={(e) => {
              if (emptySource || !shown) return;
              if ((e.target as HTMLElement | null)?.closest('input')) return;
              // An imported gradient keeps its provenance on the way out, so a drop on GX Global
              // asks for the rights line and a drop on a set files it as the import it is.
              const importedSource = importedSourceOfWorking(useWorkingStore.getState());
              const payload = { config: shown.config, name: derived.name, ...(importedSource ? { source: importedSource } : {}) };
              setFavientDrag(e.dataTransfer, payload);
              beginCustomAvatarDrag(e.dataTransfer); // register the drag + suppress the native image
              setDragOrigin(e.currentTarget.getBoundingClientRect()); // recorded, but nothing reads it: the v2 avatar starts at the cursor (no morph)
            }}
          >
            {/* PHONE: the DOOR to the picture, first in the row — the image is a SOURCE, and
                a source belongs at the start of the line that names what you are looking at.
                It replaces the card's image column (see the file header). */}
            {phone && (
              <ImageSlot
                compact
                active={source === 'extract'}
                bigH={0}
                onClick={() => onTray('image')}
              />
            )}
            {/* the name HUGS its text (a mirror span sizes the grid cell; the input fills it)
                instead of clipping at a fixed width — owner, 2026-09-07.
                PHONE: it takes what is left instead. The hug's grid column is sized by the
                mirror span, and `w-full` on a grid item is 100 % of that COLUMN — so once
                the flex row squeezed the span below the mirror, the input went on painting
                its full width straight over the state chip. `flex-1 min-w-0` with no mirror
                is one box that can actually shrink. */}
            {phone ? (
              <input
                /* `min-w-[56px]`: `min-w-0` alone let the row's fixed parts squeeze the name
                   out of existence entirely, which is worse than a clipped one. 56 is about
                   four characters at 18 px semibold — enough to tell two gradients apart. */
                className={`flex-1 min-w-[56px] bg-transparent border-0 outline-none text-fg text-[18px] font-semibold text-ellipsis ${nameFocus}`}
                {...nameField}
                title="Name"
                aria-label="Name"
              />
            ) : (
            <span className="inline-grid min-w-[40px] max-w-[60%] text-[18px] font-semibold">
              <span className="invisible col-start-1 row-start-1 whitespace-pre pr-0.5" aria-hidden>{nameValue || ' '}</span>
              <input
                size={1}
                className={`col-start-1 row-start-1 w-full min-w-0 bg-transparent border-0 outline-none text-fg ${nameFocus}`}
                {...nameField}
                title="Name"
              />
            </span>
            )}
            {/* PHONE: no `ml-2` — the row's own `gap` already separates them, and on a 390 px
                row every doubled gap comes out of the name beside it. */}
            {stateChip && <span className={`inline-flex shrink-0 ${phone ? '' : 'ml-2'}`}>{stateChip}</span>}
            {!phone && <span className="flex-1" />}
            {source === 'browse' && !emptySource && (
              phone ? (
                /* The same action under a shorter word. NOT a glyph, which is what the phase
                   brief asked for: this set has none that means "rank the wall by likeness",
                   and inventing one is a design decision for the owner, not a layout fix
                   (ADR-0114 rule 3 — one set, one weight, drawings refitted not retyped).
                   The full sentence stays on the title. It costs ~46 px against a glyph's 26. */
                <Act className="shrink-0 px-2" title="Sort the wall by similarity to this gradient" onClick={() => setSimilarityAnchor({ config: shown.config, name: derived.name })}>
                  Similar
                </Act>
              ) : (
              <Act className="mr-1" title="Sort the wall by similarity to this gradient" onClick={() => setSimilarityAnchor({ config: shown.config, name: derived.name })}>
                More like this
              </Act>
              )
            )}
            {/* USE — the shell still owns what these DO (P3). Export's full window hangs
                off the BAND (below), outside the card's clip; its icon carries the flyout. */}
            {/* PHONE: 4 px gaps rather than 6 — 6 px reclaimed across the cluster, which is
                6 px the name keeps. The 26 px targets themselves are untouched. */}
            <div className={`flex items-center shrink-0 ${phone ? 'gap-1' : 'gap-1.5'}`}>
              <Act icon active={!!favOf} className={favOf ? 'text-kept' : ''} onClick={toggleStar} title={favOf ? 'Saved in My Gradients — click to remove' : `Keep — save to ${keepInto}`}>
                <Icon name="heart" size={15} />
              </Act>
              <Act icon onClick={onShare} title="Share — copy a link that opens this gradient">
                <Icon name="share" size={15} />
              </Act>
              <ExportButton open={exportOpen} onOpen={onExport} ramp={shown.ramp} name={derived.name} palette={paletteRgb} origin={derived.origin} config={derived.config} source={workingSourceOf(derived.input)} />
              {/* Wallpaper is the door OUT of the shell — "a whole other world inside the
                  app" (Phase W) — so alone among the use icons it carries a surface of its
                  own: a brushed sheen, quiet enough to sit in the header row and bright
                  enough to say the click goes somewhere else. `.gx-metal` (index.css) mixes
                  that sheen from the scheme's ink and ground, so it inverts into a gunmetal
                  on a light interface instead of staying a fixed silver — W.1 pinned it to
                  six literals and a dark glyph, which failed the moment the interface went
                  light (GE v2 §8b item 6). */}
              <Act
                icon
                onClick={onWallpaper}
                title="Wallpaper — fill the screen with it"
                className="border-line/25 gx-metal !text-[color:var(--metal-glyph)] hover:!text-[color:var(--metal-glyph-hover)]"
              >
                <Icon name="fullscreen" size={15} />
              </Act>
            </div>
          </div>

          {<>

          {/* THE WHOLE GRADIENT takes a dropped colour, not just the ramp at the bottom
              (owner, §8b item 1: "a dropped swatch should land anywhere on the gradient").
              Anywhere in this body PROJECTS DOWN — the x is read against the ramp and the
              colour lands there, whatever it was dropped over (a palette swatch, a source
              band, the padding between them). The owner chose projection over letting a
              source band edit its own source: there is one gradient being edited here, and
              it is the ramp.

              The inner targets that already handled drops — the knot track and the palette
              swatches — stopPropagation, so they keep their finer behaviour (a swatch drop
              recolours the nearest knot) and this never doubles them.

              Refused while the source is EMPTY: the ramp is then the last gradient shown
              but not editable (L8), so a ghost promising a landing would be lying. */}
          <div
            ref={gradientBodyRef}
            data-gx-hero-body=""
            /* PHONE: 4 px off the top and 2 off the bottom of the panel's body — part of the
               ~65 px the card had to give up to come in under the phase's 220 px ceiling. */
            className={`px-4 flex flex-col relative ${phone ? 'pt-3 pb-1' : 'pt-4 pb-2'}`}
            onDragOver={(e) => {
              if (emptySource || editorIsRamp || !isColorDrag(e.dataTransfer)) return;
              const rr = dropSpan();
              if (!rr) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              const br = e.currentTarget.getBoundingClientRect();
              const t = Math.max(0, Math.min(1, (e.clientX - rr.left) / Math.max(1, rr.width)));
              setDropGhost({ x: rr.left - br.left + t * rr.width, t });
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setDropGhost(null);
            }}
            onDrop={(e) => {
              setDropGhost(null);
              if (emptySource || editorIsRamp) return;
              const hex = readColorDrag(e.dataTransfer);
              if (!hex) return;
              e.preventDefault();
              const rr = dropSpan();
              if (!rr) return;
              const t = Math.max(0, Math.min(1, (e.clientX - rr.left) / Math.max(1, rr.width)));
              ensureEditing();
              editorRef.current?.dropColourAt(t, hex);
            }}
            data-gx-hero-drop={dropGhost ? '' : undefined}
          >
            {/* The GHOST (owner: "just needs to be visible with a ghost so the user knows
                what is getting dropped"): the colour itself, on a line down to the place on
                the ramp it will land. The swatch is the answer to "what", the line to
                "where" — a drop over the palette row is otherwise a guess. The colour comes
                from the module, not the event, because a browser hides the payload during
                dragover; see components/gradient/colorDrag.ts. */}
            {dropGhost && (() => {
              const hex = colorInFlight();
              if (!hex) return null;
              return (
                <div
                  className="absolute top-0 bottom-0 z-40 pointer-events-none"
                  style={{ left: dropGhost.x }}
                  data-gx-hero-drop-ghost=""
                >
                  <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-fg/30" />
                  <div
                    className="absolute -top-1 -left-2.5 w-5 h-5 rounded-full border-2 border-surface shadow-[0_1px_4px_rgba(0,0,0,.45)] ring-1 ring-fg/25"
                    style={{ background: hex }}
                  />
                </div>
              );
            })()}
            {/* the palette on top of the ramp — hidden only while the source is empty (there
                is nothing live to sample from) */}
            {!emptySource && (
              <PaletteRow
                palette={derived.palette}
                scale={Math.max(1, rampW - 16)}
                onScrub={setScrubT}
                onSelect={editorIsRamp ? undefined : (_, t) => editorRef.current?.selectAt(t)}
                // a colour dragged from the picker onto a palette swatch lands on the ramp at
                // that swatch's position (the editor recolours the nearest knot, or inserts one)
                onDropColour={editorIsRamp ? undefined : (t, hex) => { ensureEditing(); editorRef.current?.dropColourAt(t, hex); }}
                // the Stops layout needs stops; a ramp gradient has none (ADR-0122)
                hasStops={stopsOf(derived.config ?? shown.config).length >= 2}
                /* PHONE: 32 px of swatch and 8 of gap — still a comfortable touch target,
                   8 px cheaper than the card's own row. */
                className={phone ? 'h-8 mb-1.5' : 'h-9 mb-3'}
              />
            )}

            {/* the ramp IS the stops editor — under the source band(s) while the pipeline is
                live. With an EMPTY source it is the last gradient, shown but not editable:
                there is no live document behind it until a source is back (L8). No hairline
                and no hover outline here (owner, 2026-09-07: the border was unnecessary) —
                the editor's strip chrome paints its own rounded, edge-filled bar. */}
            <div ref={setRampEl} className="relative rounded-[10px]">
              {emptySource ? (
                <>
                  <div className="px-2 mb-px">
                    <div
                      className="flex items-center px-2 rounded border border-dashed border-line/40 text-[11px] text-fg-muted"
                      style={{ height: SOURCE_BAND_H }}
                      title="This source has nothing in it yet — the ramp below is the gradient you were last working on"
                    >
                      {emptyText}
                    </div>
                  </div>
                  <GradientStrip ramp={shown.ramp} height={42} className="w-full block" />
                </>
              ) : (
                <>
                  {/* the SOURCE half: the same bar language as the result under it — the 8 px
                      gutters painted with its end colours and the top corners rounded, so the two
                      halves read as one bar (owner, 2026-09-07) */}
                  {split && (
                    <div className={`relative group/src ${gesture ? 'cursor-pointer' : ''} ${mix ? '' : 'mb-px'}`} style={{ minHeight: sourceH }} data-gx-source-half={gesture ? 'cancel' : undefined}>
                      <SourceBands derived={derived} onKeepSource={gesture ? onCancelFace : undefined} />
                      {gesture && <HalfHint className="group-hover/src:opacity-100">Cancel</HalfHint>}
                    </div>
                  )}
                  {/* the editor and everything it portals (the stop inspector's colour picker) speak
                      the v2 dialect — context follows the React tree, not the DOM (Phase E) */}
                  <InputSkinProvider skin="soft">
                    <AdvancedGradientEditor
                      ref={editorRef}
                      chrome="strip"
                      // A marquee that wanders off the knots becomes a drag of the whole
                      // gradient, and comes back if you do. `pointerGradientDrag` dispatches
                      // the ordinary drag events, so the rail's chips, the wall's bands and
                      // the trash answer it with the handlers they already have.
                      marqueeEscape={MARQUEE_ESCAPE}
                      onMarqueeEscape={(escaped, ev) => {
                        if (!escaped) { cancelPointerGradientDrag(); return; }
                        if (emptySource || !shown) return;
                        startPointerGradientDrag(
                          { config: shown.config, name: derived.name },
                          { x: ev.clientX, y: ev.clientY },
                          rampElRef.current?.getBoundingClientRect(),
                        );
                      }}
                      stripHeight={resultH}
                      // PHONE: the tray hands the inspector face the room below the card, so
                      // the picker in it opens rather than starting on its 36 px mini pad.
                      pickerRoomy={phone}
                      stripCorners={split ? 'bottom' : 'all'}
                      previewConfig={derived.edited && !derived.passthrough && config ? config : undefined}
                      // THE BAR PAINTS THE PIPELINE'S OWN RAMP whenever the pipeline is doing
                      // anything. Through the stops it went ramp → fit → stops → resample, and
                      // the fit is HELD mid-drag — so the bar drew held positions wearing live
                      // colours, which a curve edit turns into visible nonsense (owner,
                      // 2026-09-11: "a weird mix of the previous stops and the current colors").
                      // A passthrough gradient keeps the stops route: there the stops ARE the
                      // gradient, at full authored precision rather than 256 texels.
                      previewRamp={derived.passthrough ? undefined : derived.ramp ?? undefined}
                      onStripClick={gesture ? onBake : undefined}
                      stripTitle={gesture ? 'Apply — bake it into the stops (the face closes)' : undefined}
                      stripHint={gesture ? <HalfHint className="group-hover/strip:opacity-100">Apply</HalfHint> : undefined}
                      stripAside={
                        /* the TRAY'S TAB ROW (Phase C, restyled C.13 — owner 2026-09-07 evening): ONE
                           segmented control in the Even / Perceptual / Stops style; the open face's
                           segment is a TAB — it takes the tray's colour and a tongue runs from its
                           bottom to the tray's (borderless) top edge, 8 px below, so the two read as
                           one piece. The corners under the open tab are HARD — the segment's bottom
                           corners and, when it is an end segment, the pill's own outer bottom corner
                           (owner: "the button's corners need hardening when it's under a tab"). No
                           chevrons: the tab says it is open. Click again closes. */
                        <div
                          className={`inline-flex rounded-t-lg border border-line/20 ${tray === TRAY_TABS[0].face ? '' : 'rounded-bl-lg'} ${tray === TRAY_TABS[TRAY_TABS.length - 1].face ? '' : 'rounded-br-lg'}`}
                          data-gx-tray-tabs
                        >
                          {TRAY_TABS.map((t, i) => {
                            const on = tray === t.face;
                            const first = i === 0;
                            const last = i === TRAY_TABS.length - 1;
                            const ends = `${first ? 'rounded-tl-[7px]' : ''} ${first && !on ? 'rounded-bl-[7px]' : ''} ${last ? 'rounded-tr-[7px]' : ''} ${last && !on ? 'rounded-br-[7px]' : ''}`;
                            return (
                              <button
                                key={t.face}
                                type="button"
                                /* PHONE: 6 px of side padding, not 10. The editor's own row
                                   holds this pill and the blend / output / menu group, and at
                                   390 the two came to 338 in a 320 px line — so they WRAPPED,
                                   and the wrap cost the card 30 px of height. 4 tabs × 4 px put
                                   them back on one line at 390; 4 × 4 more (L1, 2026-09-24) do
                                   it at 375 (measured: 243 → 215 px). 360 needs ~12 px more,
                                   which is the editor row's own padding and gaps to give.
                                   `transition-colors` (J12): the tabs ease like every other
                                   pressable in the shell instead of snapping. */
                                className={`relative h-7 text-[13px] transition-colors ${phone ? 'px-1.5' : 'px-2.5'} ${ends} ${on ? 'bg-surface-section text-accent-300' : 'text-fg-muted hover:text-fg'}`}
                                onClick={() => onTray(t.face)}
                                title={t.title}
                                data-gx-tray-tab={t.face}
                                data-gx-tab-open={on ? '' : undefined}
                              >
                                {t.label}
                                {on && <span aria-hidden className="absolute -left-px -right-px top-full h-[9px] bg-surface-section border-x border-line/20" data-gx-tab-tongue />}
                              </button>
                            );
                          })}
                        </div>
                      }
                      inspectorHost={inspectorEl}
                      onSelectionChange={onSelectionChange}
                      value={editorValue}
                      onChange={onEditorChange}
                      onEditStart={onEditorStart}
                      onEditEnd={editorEditEnd}
                      edit={onEditorEdit}
                      onAddStops={onAddStops}
                      menuLead={menuLead}
                      pickerPalette={paletteHex}
                    />
                  </InputSkinProvider>
                  {scrubT != null && (
                    <div
                      className="absolute w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,.6)] pointer-events-none"
                      style={{ left: `calc(8px + ${scrubT} * (100% - 16px))`, top: split ? sourceH + (mix ? 0 : 1) : 0, height: resultH }}
                    />
                  )}
                </>
              )}
            </div>

          </div>
          </>}
        </div>
      </div>
      {/* the TRAY (Phase C): one surface under the card, one face at a time.
          PHONE: it also carries the PICTURE, since the card no longer has a column for it —
          `rampW` is the tray's inner width there (both are the card's width less the same
          paddings), so it is what the picture is drawn at. */}
      <Tray
        face={tray}
        derived={derived}
        width={rampW}
        inspectorHostRef={setInspectorEl}
        imageCloudRef={setImageCloudEl}
        imageToolsRef={setImageToolsEl}
        left={panelLeft}
        right={panelRight}
        phone={phone}
        imageSlot={
          phone ? (
            <ImageSlot
              active={source === 'extract'}
              instant={eyedropping}
              bigH={0}
              width={rampW}
              onClick={() => onTray('image')}
              cloudHost={imageCloudEl}
              toolsHost={imageToolsEl}
              handles
            />
          ) : undefined
        }
      />
      {exportMenu}
    </section>
  );
};

/** The instant hover hint on a ramp half (C.9) — a small pill at the half's right edge,
 *  shown by the parent's group-hover class, never in the way of the pointer. */
const HalfHint: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span
    className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 h-5 inline-flex items-center rounded-full bg-black/70 text-white text-[11px] whitespace-nowrap pointer-events-none opacity-0 transition-none z-20 ${className}`}
  >
    {children}
  </span>
);

/**
 * The Export icon. A click opens the full window (`ExportMenu`, all formats). HOVER shows
 * the last three exports as one-click rows (owner, 2026-09-07: "a small on-hover dropdown
 * with their most recent export types"); nothing shows until there is a recent. The rows are
 * the window's Again, from the same deduped source (`exportActionId`), each naming its format
 * ("Download CSS variables .css"). The
 * flyout is `fixed`, measured off the button, because everything inside the card is
 * clipped by it.
 */
const ExportButton: React.FC<{ open: boolean; onOpen: () => void; ramp: RGB[]; name: string; palette: RGB[]; origin: CatalogOrigin | null; config: GradientConfig | null; source?: string }> = ({ open, onOpen, ramp, name, palette, origin, config, source }) => {
  const recents = useRecentExports();
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | null>(null);
  const enter = (e: React.PointerEvent) => {
    // MOUSE ONLY (Phase F). A touch fires pointerenter on the way to the tap, so on a phone
    // this flyout opened under the finger and the tap that opened the full window landed on
    // a recent-export row instead. Hover is not a gesture a phone has; the full window is
    // one tap away and carries the same rows.
    if (e.pointerType !== 'mouse') return;
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setHover(true);
  };
  const leave = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHover(false), 150);
  };
  const show = hover && !open && recents.length > 0 && pos;
  return (
    <div ref={btn} className="flex" onPointerEnter={enter} onPointerLeave={leave}>
      {/* `data-gx-export-opener`: the window's click-away ignores a press here, so the lit
          button closes its own window instead of closing and reopening it (EW-04). */}
      <Act icon active={open} onClick={onOpen} title="Export — copy or download this gradient in a file format" data-gx-export-opener="">
        <Icon name="download" size={15} />
      </Act>
      {show && (
        <Floating className="fixed z-40 p-1 flex flex-col min-w-[180px]" style={{ top: pos.top, right: pos.right }} data-gx-export-recent>
          {recents.map((a) => (
            <button
              key={exportActionId(a)}
              type="button"
              className="text-left text-[13px] text-fg px-2 py-1 rounded-lg hover:bg-line/10 whitespace-nowrap"
              onClick={() => {
                // The window's remembered settings too (stop budget, the GMT PNG's size), so a
                // repeat from here writes what the same row in the window would.
                const s = readExportSettings();
                runExport(a, ramp, name, palette, { origin, config, source, budget: s.budget ?? undefined, pngW: s.pngW, pngH: s.pngH });
                setHover(false);
              }}
            >
              {exportActionLabel(a)}
            </button>
          ))}
          <button type="button" className="text-left text-[13px] text-fg-muted hover:text-fg px-2 py-1 rounded-lg hover:bg-line/10" onClick={onOpen}>
            All formats…
          </button>
        </Floating>
      )}
    </div>
  );
};

