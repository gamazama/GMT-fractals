/**
 * BrowseStage — the v2 Browse surface (plans/ge-v2-design.md §5.2, mock B).
 *
 * The wall as a CANVAS: full-bleed swatches on a faint dotted ground, a floating tool
 * palette top-right (Hand · Rect · Lasso · Paint), a zoom readout with Fit bottom-right,
 * row labels down the left edge (the wall's own gutter), and a caption that appears only
 * while a carve tool is drawing.
 *
 * Narrowing (owner, 2026-09-06): the COLOUR PICKER is the main narrower — a hue × lightness
 * field with a ranged box (`HueLightnessPad`) and the saturation strip under it — then the
 * search field, then a Filters button whose badge counts the active narrowers (search
 * excluded). Filters is NOT a popover (it covered the wall it narrows, which updates live):
 * it opens three inline rows under the bar — LOOK (simple ↔ complex, single-hue ↔ rainbow) ·
 * SOURCES · ARRANGE (group / rows / sort / reverse, clear-all). Cool ↔ warm is not rendered
 * here (redundant with hue). Nothing narrows the wall from anywhere else. The live COUNT
 * shows once (owner, 2026-09-24): in the sentence on a desk; on the search pill and in
 * Arrange on a phone, which hides the sentence.
 *
 * No hero here. A wall click is a candidate (`setHeroPick`); `WorkingHero` previews it.
 *
 * ONE GROUND, MANY SETS (Phase D, 2026-09-08): the wall shows whichever set the rail has lit
 * (`useGroundSetIds` → `useGroundSource`; several lit chips union into one ground). On the
 * catalogue (All) everything above applies.
 * On a user set — a dated bin of Recent, Kept, a named group — the pad and Filters are
 * gone (they are the catalogue's lens), the header names the set, search still narrows,
 * "More like this" still ranks, the carve tools are gone (their ids are catalogue ids), the
 * gutter is 0 (no bands to label) and the tiles are as large as the count allows. "Group
 * these N" on a narrowed All files the narrowed wall as a new group and puts it on the
 * ground — a saved search that is also a place. (It said "Keep these N" until 2026-09-24:
 * "keep" is the ♥ and Kept, and nothing else — owner.)
 *
 * THE PAD IS THE WALL'S MAP (D.2): the wall reports which bands are on screen
 * (`onViewport`, each band's edges in px) and, while the rows are bucketed by lightness,
 * the range on screen is computed CONTINUOUSLY (a band half scrolled past contributes half
 * its lightness range), so the pad's lens and the scrollbar beside it move with every
 * pixel of scroll rather than band by band (the owner's walk: the first, band-stepped cut
 * did not "read smoothly as the visible area"). The lens on the pad only indicates; the
 * `MapScrollbar` beside the pad is the control, and its drag scrolls the wall
 * (`scrollToGroup` with a fraction into the band) while the wall is ungrouped (grouped by
 * category every lightness exists once per category, so "jump to 0.7" is ambiguous).
 *
 * A tile's right-click offers More like this (every tile) and, on a bin or a group where
 * the tile is a favourite, Remove from My Gradients (one undo step).
 *
 * SEVERAL SETS AT ONCE (2026-09-09): the rail's chips toggle, so the ground can hold two
 * groups. Then the wall draws a labelled BAND per set (`useGroundSource` supplies them)
 * and each band is a drop target — drag a tile from one band onto another and the
 * favourite MOVES, exactly as dragging it onto that set's chip does. That is the one
 * organising gesture the old My Gradients panel had that the ground did not.
 * Snapshots were a set here for one afternoon (D.3) and are gone with the top-bar Variants
 * popover (owner, 2026-09-08: tray states are baked after every action; the gradient is
 * already in Recent and Kept).
 *
 * PHONE (Phase F, 2026-09-10). Every measured overflow at 390 px and what answers it:
 *   • the narrowing bar wanted 422 px as a three-column grid, which put the Filters button
 *     UNDER the saturation strip. It becomes three STACKED rows — Filters + search, then
 *     the pad beside its scrollbar at a MEASURED width, then the strip — re-ordered with
 *     `order-*` rather than a second copy of the tree. The arrange sentence goes (it
 *     describes the wall; the count is still on the search pill).
 *   • the Filters rows wanted ~550 px. Each label goes above its controls, one control per
 *     line, and the block caps at 60 % of the room below it and scrolls (the desktop takes
 *     the same cap since 2026-09-24 — a short laptop window lost its wall the same way).
 *   • the TOOLS leave the left column for a 40 px-button ROW at the bottom-left — see the
 *     comment there for why the column's reading does not survive a thumb — and the zoom
 *     TOOL becomes a − / + pair (`stepZoom` in usePickerModel → `zoomStep` on PickerWall).
 *     Fit joins that row; the corner zoom readout goes with the gesture it described.
 *   • the wall's row-label gutter is pinned to 24 rather than the ~4 its own auto-shrink
 *     lands on at this width.
 * `data-gx-tools`, `data-gx-filters-trigger`, `data-gx-pad-*`, `data-gx-keepselect` and
 * `data-gx-arrange-text` all survive both layouts — the smokes read them.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 *
 * All of the behaviour is `usePickerModel` — the same hook the old `PickerStage` and
 * app-gmt's palette overlay run. This file is layout, wording and chrome. If you need the
 * wall to filter/sort/carve differently, change `palette/core/pickerModel.ts`, not this.
 *
 * @see plans/ge-v2-design.md §5.2
 */

import { entryOrigin } from '../../palette/core/catalogOrigin';
import { usePickerStore } from '../../palette/store/pickerStore';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PickerWall, type WallBand, type WallView, ZOOM_MAX } from '../../palette/components/PickerWall';
import { usePickerModel, pickGroundItem } from '../../palette/components/usePickerModel';
import Slider from '../../components/Slider';
import { InputSkinProvider } from '../../components/inputs';
import { PickerBundleToggles } from '../../palette/components/PickerControls';
import { QualityRangePadConnected } from '../../palette/components/QualityRangePadConnected';
import { HueLightnessPad, stripTrackFor } from '../../palette/components/HueLightnessPad';
import { padAxesFor, WINDOW_KEY } from '../../palette/core/padAxes';
import { mapSpan } from '../../palette/core/lensBand';
import { MapScrollbar } from './ui/MapScrollbar';
import { useWorkingDerived, deriveWorkingNow, useWorkingStore } from '../../palette/store/workingStore';
import { useImageStore } from '../../palette/store/imageStore';
import { contributeToGlobal, importedSourceOfWorking } from './contributeToGlobal';
import { QUALITY_AXES } from '../../palette/features/paletteFilters';
import { useStoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { Dropdown } from '../../components/Dropdown';
import { groupByParam, rowsByParam, sortByParam } from '../../palette/features/paletteFilters';

// Owner, 2026-09-06: hue + dark/light are the 2-D pad on the bar; cool/warm is redundant
// with hue and is not rendered in v2. What is left for the popover:
const LOOK_AXES = QUALITY_AXES.filter((a) => a.axis === 'qCov' || a.axis === 'qRb');
import type { ParamConfig } from '../../engine/FeatureSystem';

/** DDFS enum options → Dropdown options (index-valued, like the panel's own enum rows). */
const enumOptions = (c: ParamConfig): { value: number; label: string }[] =>
  ((c as { options?: { value: number; label: string }[] }).options ?? []).map((o) => ({ value: o.value, label: o.label }));
import { Icon } from './ui/Icon';
import { Floating } from './ui/Floating';
import type { TrayBox } from './Tray';
import { useIsPhone } from './useIsPhone';
import { GroundList } from './GroundList';
import { Act } from './ui/Act';
import { useGroundSetIds, setGroundSetId } from '../../palette/store/groundSet';
import { showToast } from '../../engine/store/toastStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { fileFavientAt, fileFavientsAt } from '../../palette/store/favientFiling';
import { FAVIENT_DND_MIME, readFavientDrag } from '../../palette/core/favientDnd';
import { parseSetId, membersOf, GLOBAL_SET_ID } from '../../palette/core/groundSets';
import type { ContextMenuItem } from '../../types/help';
import { useGroundSets, useGroundSource } from './useGroundSource';
import { groupSetId } from '../../palette/core/groundSets';
import { DEFAULT_GROUP, dayKey, newGroupId, useFavientsStore } from '../../palette/store/favientsStore';
import { clearWallSelection } from '../../palette/store/wallSelection';
import { entryToGradientConfig } from '../../palette/core/gradientSeam';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import type { CatalogEntry } from '../../palette/core/presetCatalog';
import { useDismiss } from '../../hooks/useDismiss';
import { useFiltersHistory } from './uiHistory';

/** "Group these N" is offered up to this many — past it the narrowing is not a selection yet. */
const KEEP_MAX = 400;

// No "hand" entry: the rest state (pick on click, right-drag pans) is implicit and never
// highlighted — a highlighted default read as a stuck mode (owner review 2026-09-03).
// Clicking the active tool again returns to the rest state.
const TOOLS = [
  { id: 'zoom', glyph: 'zoom' as const, label: 'Zoom', title: 'Zoom — drag to zoom around the grab point · right-drag pans · Fit resets' },
  { id: 'rect', glyph: 'box' as const, label: 'Box', title: 'Box select — on the catalogue, keep or cut; on your own set, choose several · shift-drag adds' },
  { id: 'lasso', glyph: 'lasso' as const, label: 'Lasso', title: 'Draw a free shape — on the catalogue, keep or cut; on your own set, choose several · shift-drag adds' },
  { id: 'paint', glyph: 'brush' as const, label: 'Paint', title: 'Paint over the ones you want — [ ] resize · shift-drag adds' },
] as const;
type ToolId = (typeof TOOLS)[number]['id'];

/** Grid ⇄ list on the ground, remembered per browser (the shelf panel keeps its own). */
const GROUND_VIEW_KEY = 'gx.v2.groundView';

/** Where the tool column sits, measured from the wall's left edge. The wall draws its
 *  row labels in a gutter on that edge, so the column is inset just enough to sit in the
 *  dead space before the labels start rather than on top of them. */
const TOOLBAR_LEFT = 6;

/** How much of the wall's left edge the tool column occupies, plus a breath: `TOOLBAR_LEFT`
 *  + the `Floating` box's 3 px padding either side + a 32 px button, rounded up past its
 *  border. The wall keeps its content clear of this (`minGutter`) — before it did not, and on
 *  any ground with a small gutter (a set asks for 24) the column sat on the first tiles
 *  (owner, 2026-09-11). The LIST view keeps its rows clear of it the same way (G03,
 *  2026-09-24 — the column covered the left 16 px of every row's strip). Phone is exempt:
 *  there the cluster is a row along the BOTTOM. */
const TOOLBAR_CLEAR = TOOLBAR_LEFT + 3 + 32 + 3 + 8;
/** The tool column's inset from the wall's top (`top-2.5`), and the same breath kept below it
 *  when deciding whether it fits. */
const TOOLBAR_TOP = 10;
/** The column's natural height for `n` buttons: 32 px each, `gap-0.5` between them, the
 *  `Floating` box's 3 px padding and 1 px border at both ends — 176 for the fold and all four
 *  tools (measured, the polish pass's L8). */
const toolColumnH = (n: number): number => n * 32 + Math.max(0, n - 1) * 2 + 2 * (3 + 1);

/** PHONE: the pad's own height. 56 is the desktop field; 48 keeps the three-row bar inside
 *  the header without making the hue axis unpointable. */
const PHONE_PAD_H = 48;
/** PHONE: what the `MapScrollbar` beside the pad takes — its `w-[8px]` plus the row's
 *  `gap-1.5`. The pad is given the container minus this, so the two exactly fill the row. */
const PHONE_SCROLLBAR_COL = 8 + 6;
/** PHONE: the wall's row-label gutter. `PickerWall` shrinks its 132 px default toward 0 on
 *  a narrow wall, which at 390 lands on ~4 — the tiles then run flush into the window edge,
 *  out of line with the rail chips and the bar above them. 24 is what a SET already asks
 *  for, and below 28 the gutter draws nothing and is pure margin, so this is margin. */
const PHONE_GUTTER = 24;
/** PHONE: the tool ROW's buttons. 32 is the desktop column's; a fingertip wants 40. */
const PHONE_TOOL = 40;
/** PHONE: one step of the − / + zoom pair, which replaces the drag-to-zoom tool. */
const ZOOM_STEP = 1.25;
/** The shared context menu's geometry, for opening one ABOVE the selection bar (its host
 *  takes a top-left): a plain item is `px-4 py-2 text-xs` = 32 px, the box `py-1` plus a
 *  1 px border = 10. Read from `components/GlobalContextMenu.tsx`; change them together. */
const MENU_ITEM_H = 32;
const MENU_CHROME_H = 10;
/** The nothing-picked line's "or continue {name}": a longer name is cut here (the whole name
 *  is the link's title), so one gradient's name cannot run the line to three. */
const CONTINUE_NAME_MAX = 28;

/** Faint dotted ground behind the swatches, so the wall reads as a canvas, not a list. */
const GROUND: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
};

// V1: everything that floats over the wall is a `Floating` surface — the Phase A
// carry-over (these were inlined class strings, built concurrently with the primitive).
// `backdrop-blur-sm` stays: the wall scrolls under them.
const floatOver = 'backdrop-blur-sm';

interface Props {
  /** The hero band is hidden — the wall has the screen (owner, 2026-09-11). The button
   *  that toggles it lives HERE, with the wall's tools, so the band leaves no remnant. */
  heroFolded?: boolean;
  onFoldHero?: (folded: boolean) => void;
  /** Start a new gradient from nothing (parity row M10) — offered on the nothing-picked line. */
  onNewGradient?: () => void;
  /** THE WALL WHILE A FACE THAT DOES NOT USE IT IS OPEN (desk, owner 2026-09-25 — the shell
   *  decides, grep `wallIdle` there): 'dim' — the shell lays a veil over the ground that a click
   *  lifts, and the tool column rides ABOVE it, so the toggle below stays in reach; 'hidden' — the
   *  ground is invisible and the tool column alone stays, in the ground's bottom-left corner, holding the way back (its `visible`
   *  overrides the ground's `invisible`) with nothing else in it: the wall's tools have no wall to
   *  act on, and the fold's promise, "the wall gets the screen", is the toggle's now. */
  wall?: 'dim' | 'hidden';
  /** The toggle that hides the wall during those faces (owner: "the tool bar feels right, its
   *  already got the maximize icon" — the fold). Handed in only while such a face is open. */
  onTuckWall?: () => void;
  wallTucked?: boolean;
  /** The open tray's box. The Image face grows from the card's left edge, over the tool column,
   *  so the column drops below any tray that reaches into the wall's left edge. */
  trayBox?: TrayBox | null;
}

export const BrowseStage: React.FC<Props> = ({ heroFolded = false, onFoldHero, onNewGradient, wall, onTuckWall, wallTucked = false, trayBox }) => {
  const phone = useIsPhone();
  // PHONE: the pad is drawn at a measured pixel width, not the desktop's fixed 360 — the
  // bar needs 422 for the fixed one and has 390, which is what put the Filters button
  // underneath the saturation strip. A callback ref + ResizeObserver, the pattern the hero
  // already uses for the ramp: the bar can mount before the ground has settled, so an
  // effect with an empty dep list would measure once and be wrong.
  const [padW, setPadW] = useState(360);
  const padRo = useRef<ResizeObserver | null>(null);
  const padCellRef = useCallback((el: HTMLDivElement | null) => {
    padRo.current?.disconnect();
    padRo.current = null;
    if (!el) return;
    const update = () => setPadW(Math.max(160, el.clientWidth - PHONE_SCROLLBAR_COL));
    update();
    padRo.current = new ResizeObserver(update);
    padRo.current.observe(el);
  }, []);
  const setIds = useGroundSetIds();
  const sets = useGroundSets();
  const source = useGroundSource(setIds, sets);
  // `pickOnDrag: false` — dragging a gradient must not also PICK it. In v2 a pick is a Use,
  // so the old "drag mirrors click" behaviour meant re-filing a gradient silently replaced
  // the one you were working on (owner, 2026-09-09). The avatar reads its own payload slot,
  // so nothing here needs the pick.
  const m = usePickerModel({ source, pickOnDrag: false });
  // The ground can be several sets at once, so the title is their labels joined — the
  // model's `setId` is the joined selection and is not a label.
  const litSets = sets.filter((s) => setIds.includes(s.id));
  const setTitle = litSets.map((s) => s.label).join(' + ') || m.setId;
  /** Every lit set is one of YOUR groups (Kept, Presets, a named one) — not a dated bin. */
  const groupGround = litSets.length > 0 && litSets.every((s) => s.kind === 'group');

  /**
   * THE SHARED SET IS THE ONLY GROUND WITH A WAY IN THAT NOBODY FINDS. Contributing to
   * GX global was a drag onto its chip and nothing else — a gesture you have to already
   * know about, on a set whose whole point is that strangers add to it (owner, 2026-09-11:
   * it "needs a button that says submit gradient or something, to entice people to save
   * there"). So while it is the ground, the bar carries the invitation.
   *
   * The gradient it offers is the WORKING one, read imperatively on the click: subscribing
   * to the derive here would re-render the whole wall on every frame of a slider drag, for
   * a button that only needs an answer when it is pressed.
   */
  const onGlobalGround = m.setId === GLOBAL_SET_ID;
  const workingKind = useWorkingStore((st) => st.input.kind);
  const shareToGlobal = useCallback(() => {
    const cfg = deriveWorkingNow()?.config;
    if (!cfg) { showToast('Pick or build a gradient first — then add it here'); return; }
    // Imported (or edited from an import) → the confirm carries the rights line.
    contributeToGlobal(cfg, { imported: importedSourceOfWorking(useWorkingStore.getState()) !== null });
  }, []);
  // The pad follows the Arrange state (owner, 2026-09-08): rows on its Y, sort on its X when
  // they are colour axes, the third on the strip — so the pad is the wall's map for any
  // arrangement it can paint (`palette/core/padAxes.ts`; the harness pins the table).
  const pad = useMemo(() => padAxesFor(m.axes.rowsAxis, m.axes.sortAxis), [m.axes.rowsAxis, m.axes.sortAxis]);
  // Nothing picked yet — the hero is absent (L8) and the bar says what to do (see below).
  const nothingPicked = useWorkingDerived().empty;
  // …and what it can offer to CONTINUE: the newest gradient in Today, read from the shelf the
  // way the rail's own sets are (Today's tiles are that bin in shelf order, newest first), so
  // the shell passes nothing. The link hands it to `pickGroundItem` with the item a click on
  // that tile would carry — a favourite of your own, so `favId` and its origin (the
  // non-shared branch of `useGroundSource`'s `itemOf`).
  const favients = useFavientsStore((st) => st.favients);
  const todayNewest = useMemo(() => {
    const today = sets.find((s) => s.kind === 'bin' && s.day === dayKey(Date.now()));
    return today ? membersOf(today.id, favients)[0] ?? null : null;
  }, [sets, favients]);
  const continueToday = useCallback(() => {
    if (!todayNewest) return;
    const f = todayNewest;
    pickGroundItem(f.id, { config: f.config, name: f.name, source: f.source, favId: f.id, origin: f.origin });
  }, [todayNewest]);
  // An image dropped / pasted before the first pick is being read: with no hero there is no
  // image slot to say so (ImageSlot's READING), so the nothing-picked line says it instead.
  const imageReading = useImageStore((st) => st.loading);

  const win = (k: string): [number, number] => {
    const o = m.sliceState?.[k] as { x?: number; y?: number } | undefined;
    return [o?.x ?? 0, o?.y ?? 1];
  };
  const xWin = win(WINDOW_KEY[pad.x]);
  const yWin = win(WINDOW_KEY[pad.y]);
  const sWin = win(WINDOW_KEY[pad.strip]);

  // The pad as the wall's map (D.2): which bands are on screen → a lightness range.
  // The wall reports its bands AS DRAWN (merged small buckets carry the unioned range and
  // their own key), so the marker and the seek work on that, not on the model's rows.
  const [wallView, setWallView] = useState<{ bands: WallBand[]; view: WallView }>({ bands: [], view: { scrollTop: 0, height: 0, scrollHeight: 0 } });
  const [scrollTo, setScrollTo] = useState<{ key?: string; frac?: number; seq: number } | null>(null);
  const onAll = !m.isSet && !m.anchor;
  // WHERE THE WALL IS — one value, drawn by both the pad's lens and the scrollbar's thumb,
  // and read purely from the SCROLL POSITION (owner, 2026-09-09: "i think we should just map
  // it by scroll position and not by lightness").
  //
  // It used to be derived from which lightness BANDS were on screen, which is a truer
  // statement when it works and unreliable when it does not. Grouped by category the wall is
  // category A's whole lightness sweep, then B's, then C's, so the axis restarts inside
  // every group and the union of the visible bands barely moves — the band sat still through
  // a 5,819 px scroll. Ungrouped it mostly worked, but "the minimap regions are still
  // slightly missing", because a band's own extent is coarser than the pixels on screen.
  // Scroll position has neither problem: it is always defined, always moves, and is what a
  // scrollbar has always meant.
  //
  // The three readings the scrollbar carries at once stay consistent under this because they
  // are measured on one span:
  //   • TOTAL    — the whole track, the pad's axis end to end;
  //   • SELECTED — `reach`, the part of that axis the wall actually holds (dimmed outside);
  //   • VISIBLE  — the scroll fraction mapped INTO `reach`.
  // Mapping into the reachable span rather than the whole axis is what keeps the visible
  // band from walking outside the selection at the end of a scroll.
  const rowsOnAxis = onAll && pad.rowsOnY;
  // The part of the pad's Y axis the wall can reach — the bands that exist. Outside it the
  // scrollbar's track dims (owner: "the section that is not reachable at 50% the opacity").
  // Grouping does not affect this: it changes the ORDER the bands appear in, not which ones.
  const reach = useMemo<[number, number] | null>(() => {
    if (!rowsOnAxis) return null;
    let lo = 1, hi = 0;
    for (const b of wallView.bands) if (b.lo != null && b.hi != null) { lo = Math.min(lo, b.lo); hi = Math.max(hi, b.hi); }
    return hi > lo ? [lo, hi] : null;
  }, [rowsOnAxis, wallView.bands]);
  /** Where the scroll is laid out, and what the scrollbar dims around — see `mapSpan`. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const span = useMemo(() => mapSpan(reach, yWin), [reach, yWin[0], yWin[1]]);
  const marker = useMemo<[number, number] | null>(() => {
    const { scrollTop, height, scrollHeight } = wallView.view;
    if (!onAll || !height || scrollHeight <= height + 1) return null;
    const into = (v: number) => span[0] + v * (span[1] - span[0]);
    return [into(1 - Math.min(1, (scrollTop + height) / scrollHeight)), into(1 - scrollTop / scrollHeight)];
  }, [onAll, wallView.view, span]);
  const canSeek = onAll;
  /** Put `L` (a value on the pad's axis) at the top of the viewport — the inverse of the
   *  mapping above, so dragging the thumb lands the band exactly where it is dropped. */
  const seekBand = useCallback((L: number) => {
    const t = span[1] - span[0] > 1e-6 ? (L - span[0]) / (span[1] - span[0]) : L;
    setScrollTo((s) => ({ frac: Math.min(1, Math.max(0, 1 - t)), seq: (s?.seq ?? 0) + 1 }));
  }, [span]);
  // Crossing between the catalogue and a set changes what a carve MEANS — narrowing there,
  // choosing here — so an active tool is dropped on the way rather than carried across with
  // a new meaning. A set is offered `zoom` ALONE (grep `TOOLS.filter` below): carving is for
  // finding your way through eleven thousand, and a set you assembled yourself is small
  // enough to point at — owner, 2026-09-10, "we dont need carve tools in small sets".
  // (An earlier version of this comment claimed the tools stayed on a set, which the render
  // never did; the render was right.) Choosing SEVERAL on a set is still there and never
  // needed a tool: it is the rubber-band from the wall's background.
  useEffect(() => {
    if (m.tool) m.setTool(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.isSet]);
  // Group these N: the narrowed wall becomes a named group and the ground shows it.
  const keepThese = useCallback(() => {
    const entries = m.rows.flatMap((r) => r.entries);
    if (!entries.length || entries.length > KEEP_MAX) return;
    const q = m.search.trim();
    const label = q ? q.charAt(0).toUpperCase() + q.slice(1) : 'Selection';
    const g = newGroupId();
    paramEdit(() => {
      // the theme rides along as provenance, so the panel's search still finds a
      // gradient that matched by theme rather than by name
      // …and the catalogue ORIGIN rides along too (2026-09-13), so an unedited member of the new
      // group still exports with its credit.
      const { bundles, collections } = usePickerStore.getState();
      useFavientsStore.getState().insertMany(entries.map((e) => {
        const config = entryToGradientConfig(e);
        return { config, name: e.name, source: e.theme ? `Browse · ${e.theme}` : 'Browse', origin: entryOrigin(e, config, bundles, collections) ?? undefined };
      }), g, label);
    });
    // The narrowing has become a place: the search that made it is done (measured: a
    // catalogue match by THEME is not a match by name once it is a favourite, so the new
    // group opened as "9 of 143" with the query still live).
    m.setSearch('');
    setGroundSetId(groupSetId(g));
  }, [m.rows, m.search, m.setSearch]);
  /** Owner, 2026-09-06: Filters is not a popover (it covered the wall it narrows) — it is three
      inline rows under the bar: LOOK · SOURCES · ARRANGE. These are already the rare items. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The zoom tool is not a selection tool (it never carves), so it lives here; the two are
  // mutually exclusive — picking either clears the other.
  const [zoomTool, setZoomTool] = useState(false);
  // GRID or LIST, on a set (owner, 2026-09-09). The wall draws bars, which is right for
  // choosing by colour and wrong for finding one you NAMED — the shelf panel has had this
  // toggle all along and the ground had none, so reading your own names meant opening a
  // floating panel over the wall you were looking at. Remembered, like the panel's.
  const [listView, setListView] = useState<boolean>(() => {
    try { return localStorage.getItem(GROUND_VIEW_KEY) === 'list'; } catch { return false; }
  });
  // The list is DOM rows, so the wall's zoom does nothing there (G03, 2026-09-24): the zoom
  // tool, its caption and the corner readout stand down while the list is showing. The tool's
  // STATE is kept, so switching back to bars finds the zoom you were using.
  const showingList = m.loaded && m.count > 0 && m.isSet && listView;
  const zoomOn = zoomTool && !m.tool && !showingList;
  // Esc puts the zoom tool down, and only it (G02, 2026-09-24) — through the shortcut
  // registry, like the carve tools' (grep `useDismiss` in usePickerModel), so the shell's Esc
  // chain sees the key taken and leaves an open tray face alone. There was no Esc here at all:
  // the one way out was the caption's "click the tool again to stop".
  useDismiss(m.wallHostRef, { onClose: () => setZoomTool(false), enabled: zoomOn, outside: false });
  const activeTool: ToolId | null = zoomOn ? 'zoom' : (m.tool as ToolId | null);
  // THE WALL'S HEIGHT, for the tool column (ASK-3): when the wall is shorter than the whole
  // column would be, the carve tools collapse first. Measured on the wall host, which is always
  // mounted; the column's height is computed rather than measured, so hiding the tools cannot
  // change the answer and flicker.
  const [wallH, setWallH] = useState(Infinity);
  useEffect(() => {
    const el = m.wallHostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWallH(el.clientHeight));
    ro.observe(el);
    setWallH(el.clientHeight);
    return () => ro.disconnect();
  }, [m.wallHostRef]);
  // THE COLUMN KEEPS CLEAR OF THE TRAY (2026-09-25). Every face but Image starts at the gradient
  // panel's left edge, well right of the column; Image grows from the card's left edge and covered
  // it (measured at 1440 × 900: tray x 10–900 down to y 598, column x 6–46 from y 450), which hid
  // the fold — and would hide the wall toggle. So a tray reaching into the column's strip pushes
  // the column down to just under the tray. Desk only: the phone's cluster is a row at the bottom.
  const wallHidden = wall === 'hidden';
  const [toolsTop, setToolsTop] = useState(TOOLBAR_TOP);
  useLayoutEffect(() => {
    const host = m.wallHostRef.current;
    if (phone || !host || !trayBox) { setToolsTop(TOOLBAR_TOP); return; }
    const hb = host.getBoundingClientRect();
    setToolsTop(trayBox.left < hb.left + TOOLBAR_CLEAR ? Math.max(TOOLBAR_TOP, Math.round(trayBox.bottom - hb.top) + TOOLBAR_TOP) : TOOLBAR_TOP);
  }, [phone, trayBox?.left, trayBox?.bottom, wallH, m.wallHostRef]);
  const columnButtons = (onFoldHero && !wallHidden ? 1 : 0) + (onTuckWall ? 1 : 0) + TOOLS.length;
  const carveFits = wallH >= toolsTop + toolColumnH(columnButtons) + TOOLBAR_TOP;
  // A hidden wall puts its tools down, as a hidden carve tool is put down below.
  useEffect(() => {
    if (!wallHidden) return;
    if (m.tool) m.setTool(null);
    setZoomTool(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallHidden]);
  // A carve tool that has just been hidden is put down: a tool you cannot see is a mode you
  // cannot leave (Esc would still work, but nothing on screen says it is on).
  useEffect(() => {
    if (!carveFits && m.tool) m.setTool(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carveFits, m.tool]);
  const pickTool = useCallback(
    (id: ToolId) => {
      if (id === 'zoom') {
        m.setTool(null);
        setZoomTool((z) => !z);
        return;
      }
      setZoomTool(false);
      m.setTool(m.tool === id ? null : id);
    },
    [m],
  );
  const btnRef = useRef<HTMLButtonElement>(null);
  const toggleFilters = useCallback(() => setFiltersOpen((o) => !o), []);
  /**
   * FILTERS FOLDS THE HERO while it is open (owner, 2026-09-24, the polish plan's ASK-3): on a
   * short window the rows and the hero together left the wall a few rows tall, and the wall is
   * what Filters is there to watch. Only a hero that was UP when Filters opened is folded, and
   * only a fold Filters made is undone when it closes: unfold by hand while it is open (or a
   * pick unfolds it — a pick always shows the hero), and the fold is no longer Filters' to
   * undo, so a fold you then make yourself stays. No hero yet (no `onFoldHero`) = nothing to fold.
   *
   * "Open" is what is DRAWN: the rows show on the catalogue only, so moving to a set while
   * Filters is open closes it for this purpose and coming back reopens it. Phone and desk alike
   * (the phone's fold hides its hero band the same way). Through the shell's own `fold`, so an
   * open face closes as it does for the fold button.
   */
  const filtersShown = filtersOpen && !m.isSet;
  const filtersFolded = useRef(false);
  const filtersShownWas = useRef(filtersShown);
  useEffect(() => {
    if (filtersShownWas.current === filtersShown) return;
    filtersShownWas.current = filtersShown;
    if (filtersShown) {
      if (onFoldHero && !heroFolded) {
        filtersFolded.current = true;
        onFoldHero(true);
      }
    } else if (filtersFolded.current) {
      filtersFolded.current = false;
      if (heroFolded) onFoldHero?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersShown]);
  // Anything that brings the hero back while Filters is open makes the fold no longer Filters'.
  useEffect(() => {
    if (!heroFolded) filtersFolded.current = false;
  }, [heroFolded]);
  // …and both ride every undo entry as CONTEXT (ADR-0120; @see ./uiHistory `useFiltersHistory`):
  // undo a Filters change and the rows come back open, over the fold they made, with the fold
  // still theirs — so closing them then brings the hero back. The shell restores `folded` in the
  // same batch and is the truth for it; this restores only what is Filters' own, and marks the
  // restored open/closed state as already SEEN, so the transition effect above does not read it
  // as a gesture (fold again on "open", or unfold on "close" what the shell just folded).
  const isSetNow = useRef(m.isSet);
  isSetNow.current = m.isSet;
  useFiltersHistory(
    () => ({ open: filtersOpen, foldIsFilters: filtersFolded.current }),
    (s) => {
      filtersShownWas.current = s.open && !isSetNow.current;
      filtersFolded.current = s.foldIsFilters;
      setFiltersOpen(s.open);
    },
  );
  // How tall the Filters rows may grow. MEASURED from where the block starts, and a
  // fraction of the room BELOW it — not `60vh`, which was the first cut and pushed the wall
  // clean off the screen (measured: header 48 + hero 219 + rail 40 + bar 126 + a 506 px
  // block is 939 in an 844 px viewport, and the wall came out 1 px tall). Filters is inline
  // rows precisely so you can watch the wall answer them; a cap that hides the wall is the
  // popover it replaced, with extra steps.
  // DESKTOP TOO since 2026-09-24 (L2): the same failure on a short window — with a hero, the
  // wall was 38 px at 1366×657 and 1 px at 1024×640 and 800×600. The cap only binds when the
  // room is short; a desktop floor for the wall is the owner's number (the polish plan's ASK-3).
  const [filtersMaxH, setFiltersMaxH] = useState(0);
  const filtersRo = useRef<ResizeObserver | null>(null);
  const filtersRef = useCallback((el: HTMLDivElement | null) => {
    filtersRo.current?.disconnect();
    filtersRo.current = null;
    if (!el) return;
    const update = () => setFiltersMaxH(Math.max(120, Math.round((window.innerHeight - el.getBoundingClientRect().top) * 0.6)));
    update();
    // What moves this block's top: the window (the body), the hero growing or shrinking
    // above the ground (it resizes this stage, the block's parent), and the header band
    // just above it (the nothing-picked line goes on the first pick). On a desktop the body
    // does not change size when the hero does, so the body alone missed the first pick.
    filtersRo.current = new ResizeObserver(update);
    filtersRo.current.observe(document.body);
    if (el.parentElement) filtersRo.current.observe(el.parentElement);
    if (el.previousElementSibling) filtersRo.current.observe(el.previousElementSibling);
  }, []);

  // Esc closes the rows (capture phase, so the shell's plain keydown does not also dismiss
  // the candidate). One exception: Esc typed into a NON-EMPTY search box belongs to the box
  // (it clears the query — see the input's onKeyDown), so it is let through to it.
  // Only while the rows are DRAWN: on a set they are not, and an Esc there must not be spent
  // closing rows nobody can see.
  useEffect(() => {
    if (!filtersShown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as HTMLInputElement | null;
      if (t && t.matches?.('[data-gx-search]') && t.value) return;
      e.stopPropagation();
      setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [filtersShown]);

  // PickerThemeChips / PickerBundleToggles are DDFS custom-UI components: they read
  // `sliceState` and call `actions['set' + capitalised featureId]`. Mounting them here
  // rather than through AutoFeaturePanel is deliberate — they carry their own section
  // headers and need no param chrome, and the popover wants Themes ABOVE Look, which the
  // feature's `sources` group cannot express. The two groups that DO render fine as-is
  // (the look ranges, the arrange params) go through AutoFeaturePanel below.
  const actions = useMemo(() => ({ setPaletteFilters: m.setPaletteFilters }), [m.setPaletteFilters]);
  const { handleInteractionStart, handleInteractionEnd, openContextMenu } = useStoreCallbacks();
  /**
   * Remove favourites — ONE path for every trigger (the bar's button, Delete on the wall,
   * Delete on a list row, the tile menu). Whatever is SELECTED wins; `fallback` is the one
   * gradient the gesture pointed at when nothing is selected. Owner, 2026-09-09: "delete
   * key should work with single or multiple selections".
   */
  const removeFavourites = useCallback(
    (fallback?: CatalogEntry) => {
      const asked = m.selectedIds.size ? [...m.selectedIds] : fallback ? [fallback.id] : [];
      // Only what is actually ON THE SHELF can be removed from it. Without this, a
      // selection of tiles that are not the user's own — a catalogue tile, or a gradient
      // from a shared set — still ran the write below: it touched localStorage, notified
      // the store, pushed an EMPTY undo entry, and toasted "Removed 3" having removed
      // nothing. Filtering here rather than at each of the four callers (the bar's button,
      // the Delete key, a list row, the tile menu) keeps it one rule.
      const own = new Set(useFavientsStore.getState().favients.map((f) => f.id));
      const ids = asked.filter((id) => own.has(id));
      if (!ids.length) return;
      const set = new Set(ids);
      // Read the name BEFORE the removal, or there is nothing left to name.
      const only = ids.length === 1 ? useFavientsStore.getState().favients.find((f) => f.id === ids[0])?.name : undefined;
      // One `replaceAll` rather than N `remove` calls: one localStorage write, one store
      // notification, and — inside the bracket — one undo entry however many there were.
      paramEdit(() => {
        const st = useFavientsStore.getState();
        st.replaceAll(st.favients.filter((f) => !set.has(f.id)));
      });
      m.clearSelection();
      showToast(
        ids.length === 1
          ? `Removed “${only ?? fallback?.name ?? 'it'}” — undo with Ctrl+Z`
          : `Removed ${ids.length} — undo with Ctrl+Z`,
      );
    },
    [m.selectedIds, m.clearSelection],
  );
  const removeSelection = useCallback(() => removeFavourites(), [removeFavourites]);

  // Delete acts on the SELECTION from anywhere on the ground (owner, 2026-09-09: "delete
  // key should work with single or multiple selections"). At the window, not on the wall:
  // a marquee never focuses anything, so the wall's own key handler would not see the
  // press. Never while typing — the rename inputs and the search box are on this page.
  useEffect(() => {
    if (!m.selectedIds.size) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      removeFavourites();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [m.selectedIds, removeFavourites]);

  // A tile's right-click menu. "More like this" is on EVERY tile including the catalogue's
  // (the migration audit's M12: ranking the wall by one of your own gradients is the most
  // useful thing a kept tile can do, and it was reachable only from the hero); Remove is
  // on a bin or a group, where the tile IS a favourite. A favourite's own stored config is
  // the anchor when we have it — `entryToGradientConfig` is the catalogue's route and
  // forces colorSpace 'linear', which is right for the fractal and wrong as a round-trip
  // of what the user saved.
  const onTileMenu = useMemo(
    () => (entry: CatalogEntry, e: React.MouseEvent) => {
      const fav = source ? useFavientsStore.getState().favients.find((f) => f.id === entry.id) : undefined;
      const items: ContextMenuItem[] = [
        {
          label: 'More like this',
          action: () => setSimilarityAnchor({ config: fav?.config ?? entryToGradientConfig(entry), name: entry.name }),
        },
      ];
      if (source && fav) {
        // Rename, on the ground. A wall tile shows no name — the shelf panel's LIST view is
        // where names live and where renaming has always happened — so this opens a small
        // input over the tile rather than sending you to the panel to find it.
        items.push({
          label: 'Rename',
          action: () => setRenaming({ id: fav.id, name: fav.name, x: e.clientX, y: e.clientY }),
        });
        // With a selection, the menu acts on ALL of it — right-clicking one of six chosen
        // gradients and being offered "remove this one" would be a lie about what is armed.
        const n = m.selectedIds.has(entry.id) ? m.selectedIds.size : 1;
        items.push({
          label: n > 1 ? `Remove ${n} from My Gradients` : 'Remove from My Gradients',
          danger: true,
          action: () => removeFavourites(entry),
        });
      }
      openContextMenu(e.clientX, e.clientY, items);
    },
    [source, openContextMenu, m.selectedIds, removeFavourites],
  );
  // A gradient dropped ON a band files it into that set, at the position the caret shows
  // (owner, 2026-09-09: "I can't drag gradients from one to the other"). The band key IS
  // the set id, so a drop knows exactly where it landed — and it files through the same
  // rule the rail's chips use, from the same module, so the two cannot drift apart.
  //
  // Offered on a GROUP band whether one set is lit or several: with two it moves a gradient
  // between them, with one it reorders within it — the shelf panel's own gesture, which
  // the ground never had. A dated bin refuses either way: Recent is auto-managed and
  // ordered by when you picked things, so a gradient placed there would fall off its cap.
  // Renaming a tile in place (the context menu's Rename). Anchored at the pointer, because
  // the tile itself is a region of a canvas and has no element to attach to.
  const [renaming, setRenaming] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const commitRename = useCallback((v: string) => {
    setRenaming((cur) => {
      if (cur && v.trim() && v !== cur.name) paramEdit(() => useFavientsStore.getState().rename(cur.id, v.trim()));
      return null;
    });
  }, []);

  const toggleListView = useCallback(() => {
    setListView((v) => {
      const next = !v;
      try { localStorage.setItem(GROUND_VIEW_KEY, next ? 'list' : 'grid'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const canBandDrop = useCallback(
    (bandKey: string, dt: DataTransfer) =>
      parseSetId(bandKey).kind === 'group' && Array.from(dt.types).includes(FAVIENT_DND_MIME),
    [],
  );
  const onBandDrop = useCallback((bandKey: string, dt: DataTransfer, beforeId: string | null) => {
    const { kind, key } = parseSetId(bandKey);
    if (kind !== 'group') return;
    const p = readFavientDrag(dt);
    if (!p) return;
    // With a place: the drop is a REORDER as well as a re-file, which is what the shelf
    // panel could always do and the ground could not. A multi-drag carries every id, and
    // lands as ONE run in ONE undo step.
    paramEdit(() => {
      if (p.favIds && p.favIds.length > 1) fileFavientsAt(key, p.favIds, beforeId);
      else fileFavientAt(key, p, beforeId);
    });
    clearWallSelection();
  }, []);

  /** Move everything selected into a group the user picks from the shelf's own groups.
   *  `anchor` is the button that asked: the menu opens ABOVE the bar, from that button's
   *  left edge (G12, 2026-09-24 — anchored on the bar and pushed up by the viewport clamp,
   *  it covered "2 selected" and the Move to… button itself). */
  const moveSelectionTo = useCallback((anchor: DOMRect) => {
    const ids = [...m.selectedIds];
    if (!ids.length) return;
    const st = useFavientsStore.getState();
    // A group that already holds every one of them is not somewhere they can move TO — the
    // pick was a no-op that still toasted "Moved N to …".
    const groupOf = new Map(st.favients.map((f) => [f.id, f.group ?? DEFAULT_GROUP] as const));
    const groups = sets.filter((x) => x.kind === 'group' && !ids.every((id) => groupOf.get(id) === x.group));
    const items: ContextMenuItem[] = groups.map((g) => ({
      label: g.label,
      action: () => {
        paramEdit(() => fileFavientsAt(g.group!, ids, null));
        m.clearSelection();
        showToast(`Moved ${ids.length} to “${g.label}”`);
      },
    }));
    items.push({
      label: 'New group…',
      action: () => {
        const gid = newGroupId();
        paramEdit(() => {
          st.renameGroup(gid, 'Group');
          fileFavientsAt(gid, ids, null);
        });
        m.clearSelection();
        setGroundSetId(groupSetId(gid));
        showToast(`Moved ${ids.length} into a new group`);
      },
    });
    // The menu takes (x, y) as its top-left, so "above" is the bar's top less the menu's own
    // height, which is known ahead: `GlobalContextMenu` draws a plain item `px-4 py-2 text-xs`
    // (32 px) inside `py-1` and a 1 px border (measured: three items = 106 px). The bar sits
    // on the wall's bottom edge, so there is always room above it.
    const barTop = document.querySelector('[data-gx-selection-bar]')?.getBoundingClientRect().top ?? anchor.top;
    openContextMenu(anchor.left, barTop - 4 - (items.length * MENU_ITEM_H + MENU_CHROME_H), items);
  }, [m.selectedIds, m.clearSelection, sets, openContextMenu]);


  const stripDef = QUALITY_AXES.find((a) => a.axis === WINDOW_KEY[pad.strip])!;
  // The strip is painted toward the pad window's average colour (owner).
  const stripTrack = useMemo(() => stripTrackFor(pad, xWin, yWin) ?? undefined, [pad, xWin[0], xWin[1], yWin[0], yWin[1]]);

  const zoomPct = m.zoom.x === m.zoom.y
    ? `${Math.round(m.zoom.x * 100)}%`
    : `${m.zoom.x.toFixed(1)}× ${m.zoom.y.toFixed(1)}×`;
  // The tool column's tools: the four on the catalogue, zoom alone on a set, none on a phone
  // (its zoom is the − / + row) and none over the list, where nothing here would do anything.
  // On a wall too SHORT for the whole column, the carve tools go first (owner, 2026-09-24,
  // ASK-3): the fold and zoom stay, because the fold is what gives the wall the screen back.
  const wallTools = TOOLS.filter((t) => (phone || showingList || wallHidden ? false : !m.isSet ? carveFits || t.id === 'zoom' : t.id === 'zoom'));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── one narrowing row (C.10, owner 2026-09-07 evening): the main gradient — the hue ×
          lightness pad — WIDER and CENTRED; Search at the right with Filters to its left;
          with Filters closed, "clear all" sits right-aligned on this same row. ── */}
      {/* The wall's HEADER wears the hero's surface, not the wall's (owner, 2026-09-10).
          The rail, this bar and the Filters rows are one band of controls between the card
          and the canvas; on the wall's own dark ground they read as part of the canvas they
          narrow. `bg-surface-raised` is the hero band's colour, so the two meet as one sheet
          and the wall host's `border-t` below becomes the seam. The set rail carries it too
          (grep bg-surface-raised in SetRail.tsx) — the band is only continuous if every row
          in it agrees. */}
      {/* PHONE: the same three cells, stacked and re-ordered — Filters + search first, then
          the pad and its strip, then the sentence (which is a reading, not a control, and
          on 390 px the controls come first). The order is `order-*` rather than a second
          copy of the tree, so the two layouts cannot drift. */}
      <div className={`shrink-0 relative px-6 bg-surface-raised ${phone ? 'pt-2 pb-2 flex flex-col gap-1.5' : 'pt-3 pb-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3'}`} data-gx-ground-set={m.setId}>
        {/* left: the wall in a sentence (the research: a wall you cannot describe reads as
            noise) — on All the count and the arrangement; on a set, nothing (its name is
            in the centre where the pad was). */}
        <div className={`flex items-center gap-3 min-w-0 ${phone ? 'order-3 empty:hidden' : ''}`}>
          {/* PHONE: the sentence itself goes. It is the wall described — worth a line on a
              desktop, and on a phone it is a line of the wall it describes. The COUNT is
              still on the search pill's right edge, and "Group these N" stays: that one is
              an action. On a DESK this sentence is the one place the count shows (owner,
              2026-09-24 — the pill and Filters ▸ Arrange carried it too, three times over). */}
          <span className={`text-[12px] text-fg-dim tabular-nums truncate min-w-0 ${phone ? 'hidden' : ''}`} data-gx-arrange-text="">
            {!m.isSet && m.loaded && (
              <>{m.count < m.total ? `${m.count.toLocaleString()} of ${m.total.toLocaleString()}` : m.total.toLocaleString()} · {m.anchor ? 'nearest first' : m.arrangeText}</>
            )}
          </span>
          {/* Group these N — the sentence says what narrowed the wall; this files it as a
              group in My Gradients and shows it (Phase D). `data-gx-keep-these` is the
              smokes' handle from when it said "Keep", kept so they need not move. */}
          {!m.isSet && m.loaded && m.count > 0 && m.count < m.total && m.count <= KEEP_MAX && (
            <Act onClick={keepThese} title="File these as a new group in My Gradients and show it" data-gx-keep-these="" className="shrink-0">
              <Icon name="plus" /> Group these {m.count.toLocaleString()}
            </Act>
          )}
          {/* The invitation, while the shared set is the ground. `Act` is the bar's own button
              language; the accent ring is the one thing on this row that asks rather than
              narrows, which is the point of it. Hidden only when there is nothing to give: an
              empty working slot makes the button a dead end, and the empty-state line below
              offers the same thing in a sentence. It sits HERE, where "Group these N" does —
              the other button that acts on the wall — not beside Filters and search (G11,
              2026-09-24: there it wrapped the search onto a second line while this cell,
              which holds no sentence on a set, stood empty). "Add", as its confirm and toast
              say (owner, 2026-09-24; "Share" is the hero's link). */}
          {onGlobalGround && workingKind !== 'empty' && (
            <Act
              onClick={shareToGlobal}
              data-gx-share-global=""
              title="Add the gradient you are working on to GX global — everyone using the app will see it"
              className="shrink-0 border-accent-400/40 bg-accent-400/10 text-accent-300"
            >
              <Icon name="plus" /> Add your gradient
            </Act>
          )}
        </div>
        {m.isSet && !m.arrangeable ? (
          /* a set on the ground: its name where the pad was — the pad and Filters are the
             catalogue's lens (their windows, themes and carve ids mean nothing here) */
          /* 72 on a desk, the pad column's own height (pad 56 + gap 4 + strip 12), so the wall's
             top does not jump 15 px when you cross between All and a set (G10, 2026-09-24) */
          <div className={`flex items-baseline gap-2 items-center ${phone ? 'order-2 h-9' : 'justify-self-center h-[72px]'}`} data-gx-set-title="">
            <span className="text-[15px] text-fg">{setTitle}</span>
            <span className="text-[13px] text-fg-muted tabular-nums">{m.count < m.total ? `${m.count} of ${m.total}` : m.total}</span>
          </div>
        ) : (
        /* The colour picker IS the main narrower (owner): hue × lightness with a box. On the
            bar, never over the wall it narrows. */
        <div ref={phone ? padCellRef : undefined} className={`flex flex-col gap-1 ${phone ? 'order-2 min-w-0' : 'justify-self-center'}`}>
          {/* Nothing picked yet: say so HERE, over the map, rather than in the corner below.
              This replaces the line that used to sit above the wall in GradientExplorerV2App
              ("Click a gradient to preview it above …") — which pointed at a hero that does
              not exist until the first pick (owner, 2026-09-09: "this can replace the 'click
              a gradient to preview it..' which is wrong anyway"). */}
          {nothingPicked && (
            // PHONE: the line wraps to two there, so it gets a line height; one line on a desk
            // unless it offers "continue", which wraps it there too. `w-0 min-w-full`: the line
            // is as wide as the pad and never WIDENS the column, which would push the pad off
            // the centre (the grid's middle column is sized by its content).
            <div
              className={`w-0 min-w-full text-[12px] text-fg-muted text-center ${phone || todayNewest ? 'leading-snug' : 'leading-none'}`}
              data-gx-map-hint=""
            >
              {/* "click it again to keep and edit it" is gone (owner, 2026-09-09): it taught
                  the SECOND gesture before the first had been made, and the second one is
                  discovered by doing it. The pad beside this line says what IT is for. */}
              {/* NEW GRADIENT (parity row M10, owner 2026-09-23): the one way to start without a
                  pick — named, not described; the hero's ☰ menu carries it once a hero exists.
                  While an image dropped before the first pick is read, the line says so. */}
              {imageReading ? (
                <span className="text-accent-300" data-gx-image-reading="" aria-live="polite">reading image…</span>
              ) : (
                <>
                  Click a gradient to start · or pick a colour range
                  {onNewGradient && (
                    <>
                      {' · '}
                      {/* one unit, so a wrap never strands the "or" from what it offers */}
                      <span className="whitespace-nowrap">
                        {'or '}
                        <button
                          type="button"
                          className="text-fg-secondary hover:text-accent-300 underline decoration-dotted underline-offset-2 transition-colors"
                          onClick={onNewGradient}
                          data-gx-new-gradient=""
                        >
                          start a new one
                        </button>
                      </span>
                    </>
                  )}
                  {/* OR CONTINUE (owner, 2026-09-24): the newest gradient in Today, when there is
                      one — the cheapest honest answer to "where did my work go" after a reload
                      with autosave off. It does what a click on that tile does, nothing more. */}
                  {todayNewest && (
                    <>
                      {' · '}
                      <span className="whitespace-nowrap">
                        {'or continue '}
                        <button
                          type="button"
                          className="text-fg-secondary hover:text-accent-300 underline decoration-dotted underline-offset-2 transition-colors"
                          onClick={continueToday}
                          title={todayNewest.name}
                          data-gx-continue=""
                        >
                          {todayNewest.name.length > CONTINUE_NAME_MAX ? `${todayNewest.name.slice(0, CONTINUE_NAME_MAX - 1)}…` : todayNewest.name}
                        </button>
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {/* the pad, with the wall's scrollbar standing beside it: the lens on the pad and
              the thumb on the bar are the same range — where the wall is */}
          <div className="flex items-stretch gap-1.5">
          <HueLightnessPad
            x={xWin}
            y={yWin}
            axes={pad}
            fixed={(sWin[0] + sWin[1]) / 2}
            onChange={(xr, yr) => m.setPaletteFilters?.({ [WINDOW_KEY[pad.x]]: { x: xr[0], y: xr[1] }, [WINDOW_KEY[pad.y]]: { x: yr[0], y: yr[1] } })}
            onDragStart={() => handleInteractionStart('param')}
            onDragEnd={handleInteractionEnd}
            width={phone ? padW : 360}
            height={phone ? PHONE_PAD_H : 56}
            marker={marker}
          />
          {/* `span`, not `reach`: the two differ when a window is drawn inside a bucket, and
              the dimming has to agree with the box on the pad beside it. */}
          <MapScrollbar range={marker} reach={rowsOnAxis ? span : null} height={phone ? PHONE_PAD_H : 56} onSeek={canSeek ? seekBand : undefined} />
          </div>
          {/* the third coordinate as a strip, in a picker's own language, under the field */}
          <div data-gx-pad-strip={pad.strip}>
            <QualityRangePadConnected key={stripDef.axis} featureId="paletteFilters" sliceState={m.sliceState} actions={actions} {...stripDef} hints="tooltip" keyframes={false} variant="strip" height={12} drawTrack={stripTrack} />
          </div>
        </div>
        )}
        {/* Filters + Search. `flex-wrap` with the search box last and `justify-end`: while
            there is room they sit side by side, and when the row runs out Filters wraps ONTO
            the line above rather than squeezing the search field to nothing (owner,
            2026-09-09: "filter to sit on top of search when there's not enough space"). */}
        {/* PHONE: ONE line, Filters first and the search taking the rest — the desktop
            wrap-Filters-above-search rule is for a row that has run out of a lot of room;
            here it has run out of all of it, and two half-empty lines are worse than one
            full one. */}
        <div className={`flex items-center min-w-0 ${phone ? 'order-1 gap-2' : 'flex-wrap justify-end gap-y-1.5 gap-x-3'}`}>
        {/* More like this — the wall is one band ordered by ramp distance to this gradient. */}
        {m.anchor && (
          <span className="flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-accent-400/40 bg-accent-400/10 text-[12px] text-accent-300 min-w-0">
            <span className="truncate">sorted by similarity to <b className="font-semibold">{m.anchor.name}</b></span>
            <button onClick={() => m.setAnchor(null)} className="underline shrink-0 hover:text-fg">clear</button>
          </span>
        )}
        {!filtersOpen && (m.narrowers.length > 0 || m.anchor) && (
          <button onClick={m.clearAll} className="text-[13px] text-accent-300 underline hover:text-fg whitespace-nowrap" title="Clear search, look ranges, sources, the carve and the similarity sort">
            clear all
          </button>
        )}
        {m.arrangeable && (
        <button
          ref={btnRef}
          data-gx-filters-trigger=""
          onClick={toggleFilters}
          className={`h-[34px] px-3 shrink-0 rounded-[10px] border text-[13px] flex items-center gap-2 transition-colors ${
            filtersOpen ? 'border-accent-400 text-accent-300 bg-accent-400/10' : 'border-line/20 text-fg-muted hover:text-fg hover:border-line/40'
          }`}
          title="Look, sources and how the wall is arranged"
        >
          Filters
          <span
            className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-center tabular-nums ${
              m.filterCount ? 'bg-accent-400 text-surface font-semibold' : 'bg-line/10 text-fg-dim'
            }`}
          >
            {m.filterCount}
          </span>
        </button>
        )}
        <div className={`flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-line/20 bg-surface-dock ${phone ? 'flex-1 min-w-0' : 'w-[260px] max-w-full'}`}>
          <svg className="w-3.5 h-3.5 shrink-0 text-fg-dim" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3.6 3.6" strokeLinecap="round" />
          </svg>
          <input
            value={m.search}
            onChange={(e) => m.setSearch(e.target.value)}
            data-gx-search=""
            /* ESC CLEARS THE QUERY (the old PickerStage did; lost in v2 until 2026-09-13) — and
               stops there: `stopPropagation` keeps it from the shell's window-level Esc chain
               (a wall selection → the open tray face → an armed slot), so clearing a search
               never also closes a face. An EMPTY box does nothing here and Esc goes on to
               that chain exactly as it does from anywhere else. Focus stays, so typing again
               needs no click; the old stage blurred, but it also collapsed its search. */
            onKeyDown={(e) => {
              if (e.key !== 'Escape' || !m.search) return;
              e.preventDefault();
              e.stopPropagation();
              m.setSearch('');
            }}
            placeholder={m.isSet ? `Search ${setTitle || 'this set'}` : m.loaded ? `Search ${m.total.toLocaleString()} gradients` : 'Loading gradients…'}
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-fg placeholder-fg-faint"
          />
          {m.search && (
            <button onClick={() => m.setSearch('')} title="Clear search" aria-label="Clear search" className="px-1 text-fg-dim hover:text-fg">
              <Icon name="close" size={12} />
            </button>
          )}
          {/* The count, ONCE (owner, 2026-09-24): on a desk the sentence (All) or the set's
              title already carries it, so the pill does not repeat it. A phone hides the
              sentence and keeps this; so does GX global, which has neither a sentence nor a
              title (it is arranged by colour, so the pad stands where the title would). */}
          {m.loaded && m.count < m.total && (phone || (m.isSet && m.arrangeable)) && (
            <span className="text-[12px] text-fg-muted tabular-nums whitespace-nowrap">{m.count.toLocaleString()} {m.count === 1 ? 'match' : 'matches'}</span>
          )}
        </div>

        </div>
      </div>

      {/* ── Filters: three inline rows, never over the wall ────────────────── */}
      {filtersShown && (
        /* PHONE: the rows need ~550 px side by side (a 72 px label plus three 160 px
           dropdowns), so each label goes ABOVE its controls and each control takes the line.
           That makes the block tall, so it is capped (`filtersMaxH` — measured, see there)
           and scrolls: the wall it narrows updates live and must stay in sight, which is
           the whole reason Filters is inline rows rather than a popover. The DESKTOP takes
           the same cap (L2, 2026-09-24); its rows are one line each, so it binds only on a
           short window. Nothing inside needs to overflow the block: the Arrange dropdowns
           are native selects and the rows' hints are `title`s. */
        <div
          ref={filtersRef}
          style={{ maxHeight: filtersMaxH || undefined }}
          className={`shrink-0 px-6 pb-2.5 flex flex-col gap-2 border-b border-line/10 bg-surface-raised overflow-y-auto ${phone ? 'mobile-scroll' : 'custom-scroll'}`}
          data-gx-selectable=""
        >
          {/* LOOK */}
          <div className={`flex gap-3 ${phone ? 'flex-col gap-1 items-stretch' : 'items-center'}`}>
            <span className={`shrink-0 text-[11px] uppercase tracking-wide text-fg-muted ${phone ? '' : 'w-[72px]'}`}>Look</span>
            <div className={`flex-1 gap-x-6 grid ${phone ? 'grid-cols-1 gap-y-1' : 'grid-cols-2'}`}>
              {LOOK_AXES.map((ax) => (
                <QualityRangePadConnected key={ax.axis} featureId="paletteFilters" sliceState={m.sliceState} actions={actions} {...ax} hints="tooltip" keyframes={false} />
              ))}
            </div>
          </div>
          {/* ARRANGE */}
          <div className={`flex gap-3 ${phone ? 'flex-col gap-1 items-stretch' : 'items-center'}`}>
            <span className={`shrink-0 text-[11px] uppercase tracking-wide text-fg-muted ${phone ? '' : 'w-[72px]'}`}>Arrange</span>
            <div className={`flex-1 flex gap-3 ${phone ? 'flex-col gap-1.5 items-stretch' : 'items-center flex-wrap'}`}>
              {/* PHONE: `w-full`, one per line. `min-w-[160px]` in a wrapping row put two on
                  a line at 390 with their labels clipped to "Grou…". */}
              <div className={phone ? 'w-full' : 'flex-1 min-w-[160px]'}><Dropdown size="md" fullWidth label="Group by" value={Number(m.sliceState?.groupBy ?? 0)} options={enumOptions(groupByParam.config)} onChange={(v) => m.setPaletteFilters?.({ groupBy: v })} /></div>
              <div className={phone ? 'w-full' : 'flex-1 min-w-[160px]'}><Dropdown size="md" fullWidth label="Rows by" value={Number(m.sliceState?.rowsBy ?? 0)} options={enumOptions(rowsByParam.config)} onChange={(v) => m.setPaletteFilters?.({ rowsBy: v })} /></div>
              <div className={phone ? 'w-full' : 'flex-1 min-w-[160px]'}><Dropdown size="md" fullWidth label="Sort by" value={Number(m.sliceState?.sortBy ?? 0)} options={enumOptions(sortByParam.config)} onChange={(v) => m.setPaletteFilters?.({ sortBy: v })} /></div>
              <label className="flex items-center gap-2 text-[13px] text-fg-muted select-none">
                <input type="checkbox" checked={!!m.sliceState?.reverse} onChange={(e) => m.setPaletteFilters?.({ reverse: e.target.checked })} /> Reverse
              </label>
              {/* PHONE only: on a desk the sentence above carries the count (owner, 2026-09-24:
                  once is enough), and clear-all takes the row's right end instead. */}
              {phone && (
                <span className="text-[13px] text-fg-muted tabular-nums">
                  {m.loaded ? `${m.count.toLocaleString()} of ${m.total.toLocaleString()}` : 'loading…'}
                </span>
              )}
              {(m.narrowers.length > 0 || m.anchor) && (
                <button onClick={m.clearAll} className={`text-[13px] text-accent-300 underline hover:text-fg ${phone ? '' : 'ml-auto'}`} title="Clear search, look ranges, sources, the carve and the similarity sort">
                  clear all
                </button>
              )}
            </div>
          </div>
          {/* SOURCES */}
          <div className={`flex gap-3 ${phone ? 'flex-col gap-1 items-stretch' : 'items-center'}`}>
            <span className={`shrink-0 text-[11px] uppercase tracking-wide text-fg-muted ${phone ? '' : 'w-[72px]'}`}>Sources</span>
            <div className="flex-1 min-w-0">
              <PickerBundleToggles featureId="paletteFilters" sliceState={m.sliceState} actions={actions} layout="row" />
            </div>
          </div>
        </div>
      )}


      {/* ── the wall as a canvas ──────────────────────────────────────────── */}
      {/* data-gx-keepselect: the wall manages its own clicks (swatch → pick, empty →
          deselect), so a global click-away handler must skip it. */}
      <div
        ref={m.wallHostRef}
        data-gx-keepselect=""
        style={GROUND}
        className={`flex-1 min-h-0 relative border-t border-line/10 ${zoomOn ? 'cursor-zoom-in' : ''}`}
      >
        {!m.loaded ? (
          <div className="h-full flex items-center justify-center text-[13px] text-fg-faint">Loading gradient library…</div>
        ) : showingList ? (
          <GroundList
            // the list keeps its rows clear of the floating tool column, as the wall does (G03)
            minGutter={phone ? 0 : TOOLBAR_CLEAR}
            groups={m.rows.map((r) => ({ key: r.key, label: r.label, entries: r.entries }))}
            itemOf={source!.itemOf}
            selectedId={m.selectedId}
            onPick={m.onPick}
            onEntryDragStart={m.onEntryDragStart}
            onEntryContextMenu={onTileMenu}
            onRename={(favId, name) => {
              if (name.trim()) paramEdit(() => useFavientsStore.getState().rename(favId, name.trim()));
            }}
            onEntryDelete={removeFavourites}
            onBandDrop={onBandDrop}
            canBandDrop={canBandDrop}
          />
        ) : m.count > 0 ? (
          <PickerWall
            groups={m.rows}
            sprite={m.sprite}
            onPick={m.onPick}
            onEntryDragStart={m.onEntryDragStart}
            selectedId={m.selectedId}
            swatchW={m.swatchW}
            swatchH={m.swatchH}
            gap={m.gap}
            onZoomChange={m.onZoomChange}
            resetZoomSignal={m.resetZoomSignal}
            // the phone tool row's − / + (Phase F); harmless on a desktop, where nothing
            // ever bumps the serial
            zoomStep={m.zoomStep ?? undefined}
            zoomTool={zoomOn}
            /* V2 as amended: 10 px on a bar, 20 on a box — a tile that has grown toward a
               box takes more rounding (the wall caps it at a third of the short side) */
            tileRadius={Math.round(Math.min(20, 8 + Math.max(0, m.tile.h - 18) / 9))}
            // A set has no row-label gutter to draw, but it still wants the shell's 24 px
            // margin: at 0 the user's own gradients ran flush into the window edge, out of
            // line with the rail chips and the header above them (owner, 2026-09-09: "the
            // user areas are very tight against the edge of the screen"). A gutter ASKED for
            // below 28 px draws no labels and is pure margin — which is exactly what is
            // wanted. The wall decides that from the request, BEFORE `minGutter` below raises
            // the margin to 52 (G09, 2026-09-24: deciding it from the raised one drew a stray
            // "(5)" count in every set's margin).
            // PHONE: the catalogue takes the same 24 (see PHONE_GUTTER) — its own
            // auto-shrink lands on ~4 at 390 and runs the tiles into the window edge.
            gutter={phone ? PHONE_GUTTER : m.isSet ? 24 : undefined}
            // Keep the tiles and the row labels clear of the floating tool column.
            minGutter={phone ? 0 : TOOLBAR_CLEAR}
            // Your own groups are few and named; the catalogue's category bands are many and
            // dense. Give the named ones room to read as headings (owner, 2026-09-09).
            spaciousBands={m.isSet}
            onViewport={onAll ? (bands, view) => setWallView({ bands, view }) : undefined}
            scrollToGroup={scrollTo}
            onEntryContextMenu={onTileMenu}
            onBandDrop={onBandDrop}
            canBandDrop={canBandDrop}
            keyboard
            selectedIds={m.selectedIds}
            selectMode={m.isSet}
            onEntryDelete={source ? removeFavourites : undefined}
            selectionTool={m.tool}
            onSelectionCommit={m.onSelectionCommit}
            onSelectionCancel={() => m.setTool(null)}
            onDeselect={m.onDeselect}
            inHand={m.gradientInHand}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-fg-muted px-8 text-center" data-gx-ground-empty="">
            {/* A SET that HAS members but is showing none is being hidden by the bar above,
                not empty — and it used to say "Nothing here yet" regardless, which denies
                that its gradients exist. GX global reaches this the most easily: it is the
                one set arranged by COLOUR, so the catalogue's hue / lightness windows carry
                straight into it, and two shared gradients fall outside almost any narrowing
                (owner, 2026-09-11: "gx global is not displaying when its the only one
                selected" — reproduced by narrowing the pad on All, then lighting it). This
                branch comes FIRST for that reason: the old one swallowed every narrowed set. */}
            {m.isSet && m.total > 0 ? (
              <span>
                {m.total.toLocaleString()} {m.total === 1 ? 'gradient is' : 'gradients are'} here, hidden by what this bar is narrowed to —{' '}
                <button onClick={m.clearAll} className="text-accent-300 underline">show {m.total === 1 ? 'it' : 'them'}</button>.
              </span>
            ) : m.setId === GLOBAL_SET_ID ? (
              <span>
                Nothing has been added yet — <button onClick={shareToGlobal} className="text-accent-300 underline">yours could be the first</button>.
              </span>
            ) : m.isSet && !m.search.trim() ? (
              /* G05, 2026-09-24: one line per kind of set. The old one gave every set Today's
                 advice and sent you to a chip "below" — the rail is ABOVE the ground. */
              <span>
                {groupGround
                  ? `Nothing in ${setTitle} yet — drag a gradient onto its chip to file it here.`
                  : 'Nothing here yet — gradients you pick land in Today.'}
              </span>
            ) : m.search.trim() ? (
              <span>
                Nothing matches “{m.search.trim()}”{m.keptIds ? ' in what you kept' : ''} —{' '}
                <button onClick={() => m.setSearch('')} className="text-accent-300 underline">clear the search</button>.
              </span>
            ) : m.keptIds ? (
              <span>
                Nothing left in what you kept — <button onClick={m.clearCarve} className="text-accent-300 underline">show the whole wall</button>.
              </span>
            ) : (
              <span>
                Nothing matches these filters — <button onClick={m.clearAll} className="text-accent-300 underline">clear them all</button>.
              </span>
            )}
          </div>
        )}

        {/* THE TOOLBAR — down the wall's left edge, a column, where a drawing app puts its
            tools (owner, 2026-09-10). It was a horizontal strip in the top-right corner
            beside the view toggle, which made a tool look like a view control; a column on
            the left reads as "pick what your pointer does" the moment you see it. It clears
            the row-label gutter rather than floating over the labels — see TOOLBAR_LEFT.
            The VIEW toggle stayed behind in the corner: switching bars ⇄ list is not
            something the pointer does to the wall, and putting it in the tool column would
            re-make the muddle this move undoes. */}
        {/* PHONE: the same cluster, laid along the BOTTOM-LEFT as a row of 40 px buttons.
            A column down the left edge is where a drawing application puts its tools and
            that reading is not phone-specific — but a phone's left edge is where the thumb
            already is, so a column there covers the first column of tiles for the whole
            session. Along the bottom it covers one row's end and sits where the thumb
            reaches. It stays ONE element carrying `data-gx-tools`, so the click-away
            exemption that stops a stray pointerdown cancelling an active tool moves with it
            (ADR-0114 rule 4). It needs no safe-area offset of its own: the wall host is
            inside `MobileViewportShell`'s padded box, so `bottom-3` is already above the
            home indicator.
            The zoom TOOL is not offered: drag-to-zoom competes with the wall's own touch
            panning. A − / + pair does the same job with no mode to be stuck in. */}
        {/* Not drawn at all when it would be an empty box: the list, before any hero. */}
        {/* `visible` while the wall is HIDDEN (the column is the one thing left of the ground) and
            `z-[16]` while it is DIM (above the shell's veil at z-15, under the tray at z-30) — grep
            `wallIdle` in the shell. `top` is `toolsTop`: under a tray that reaches this edge. With the
            wall HIDDEN it sits in the ground's bottom-left corner instead (owner, 2026-09-25: "can sit
            at bottom left when minimized") — away from the face, and clear of any tray. */}
        {(onFoldHero || onTuckWall || wallTools.length > 0 || (phone && !showingList)) && (
        <Floating
          ref={m.toolbarRef}
          data-gx-tools="tools"
          className={`absolute flex gap-0.5 p-[3px] ${floatOver} ${phone ? 'bottom-3 left-4 items-center' : 'flex-col'} ${wallHidden ? 'visible' : ''} ${wall === 'dim' ? 'z-[16]' : ''}`}
          style={phone ? undefined : wallHidden ? { left: TOOLBAR_LEFT, bottom: TOOLBAR_TOP } : { left: TOOLBAR_LEFT, top: toolsTop }}
        >
          {/* PHONE: no carving tools at all (owner, 2026-09-11: "not so useful for mobile") —
              keeping is the heart, and a group is made on a desktop. What is left is zoom,
              and each of its buttons shows ONLY when it would do something: − above 1:1,
              + below the ceiling, Fit when zoomed. At 1:1 the row is the single + button. */}
          {/* THE HERO'S FOLD sits with the wall's tools (owner, 2026-09-11: "move the
              'minimize hero' into the wall's toolbar — this way we don't need to leave a
              remnant of the hero when the wall is fullscreened"). Phone and desktop, every
              ground, and the only thing in the column while the LIST is showing (G03). A pick
              brings the hero back. Its glyph is the icon set's chevron, pointing the way the
              hero will go (G13, 2026-09-24 — it was the one text glyph among the icons). */}
          {onFoldHero && !wallHidden && (
            <button
              onClick={() => onFoldHero(!heroFolded)}
              title={heroFolded ? 'Show the gradient' : 'Hide the gradient — the wall gets the screen'}
              aria-label={heroFolded ? 'Show the gradient' : 'Hide the gradient'}
              aria-pressed={heroFolded}
              data-gx-fold=""
              style={phone ? { width: PHONE_TOOL, height: PHONE_TOOL } : undefined}
              className={`${phone ? '' : 'w-8 h-8'} rounded-lg flex items-center justify-center transition-colors ${heroFolded ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-line/10'}`}
            >
              <Icon name={heroFolded ? 'chevronDown' : 'chevronUp'} />
            </button>
          )}
          {/* THE WALL'S TOGGLE — the fold's opposite, beside it (owner, 2026-09-25): hide the wall
              while a face that does not use it is open, and it STAYS hidden for every such face
              until it is shown again (remembered across reloads). Offered only then — Mix and no
              face bring the wall back by themselves, since the wall is their picker. */}
          {onTuckWall && (
            <button
              onClick={onTuckWall}
              title={wallTucked ? 'Show the wall' : 'Hide the wall'}
              aria-label={wallTucked ? 'Show the wall' : 'Hide the wall'}
              aria-pressed={wallTucked}
              data-gx-wall-tuck=""
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${wallTucked ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-line/10'}`}
            >
              <Icon name={wallTucked ? 'wallShow' : 'wallHide'} />
            </button>
          )}
          {wallTools.map((t) => {
            const on = activeTool === t.id;
            return (
              <button
                key={t.label}
                onClick={() => pickTool(t.id)}
                title={t.title}
                aria-label={t.label}
                aria-pressed={on}
                style={phone ? { width: PHONE_TOOL, height: PHONE_TOOL } : undefined}
                className={`${phone ? '' : 'w-8 h-8'} rounded-lg flex items-center justify-center transition-colors ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-line/10'}`}
              >
                <Icon name={t.glyph} />
              </button>
            );
          })}
          {phone && !showingList && (
            <>
              {m.zoom.x > 1 && (
              <button
                onClick={() => m.stepZoom(1 / ZOOM_STEP)}
                title="Zoom out"
                aria-label="Zoom out"
                style={{ width: PHONE_TOOL, height: PHONE_TOOL }}
                className="rounded-lg flex items-center justify-center transition-colors text-fg-muted hover:text-fg hover:bg-line/10"
              >
                <Icon name="zoomOut" />
              </button>
              )}
              {m.zoom.x < ZOOM_MAX && (
              <button
                onClick={() => m.stepZoom(ZOOM_STEP)}
                title="Zoom in"
                aria-label="Zoom in"
                style={{ width: PHONE_TOOL, height: PHONE_TOOL }}
                className="rounded-lg flex items-center justify-center transition-colors text-fg-muted hover:text-fg hover:bg-line/10"
              >
                <Icon name="zoom" />
              </button>
              )}
              {/* Fit lives here rather than in the corner readout, which the phone drops —
                  it is the third thing the zoom pair needs and nothing else in that corner
                  survived. Shown only while there is something to fit. */}
              {m.zoomed && (
              <button
                onClick={m.resetZoom}
                title="Back to 1:1"
                style={{ height: PHONE_TOOL }}
                className="px-2.5 rounded-lg text-[13px] flex items-center justify-center transition-colors text-accent-300"
              >
                Fit
              </button>
              )}
            </>
          )}
        </Floating>
        )}

        {/* GRID ⇄ LIST, on a set only: the catalogue's 11,131 rows would want virtualizing,
            and its entries carry no name of yours to look for. `data-gx-tools` marks it
            exempt from the click-away that cancels an active tool (grep the attribute in
            usePickerModel) — it used to share the tool palette's ref and that exemption,
            and switching view should not cancel the zoom you were using. */}
        {m.isSet && (
          <Floating data-gx-tools="view" className={`absolute top-2.5 right-4 flex gap-0.5 p-[3px] ${floatOver}`}>
            <button
              onClick={toggleListView}
              title={listView ? 'Show them as bars' : 'Show them as a list, with names'}
              aria-label={listView ? 'Grid view' : 'List view'}
              aria-pressed={listView}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${listView ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-line/10'}`}
            >
              <Icon name={listView ? 'grid' : 'list'} />
            </button>
          </Floating>
        )}

        {/* one-line caption while the zoom tool is active */}
        {zoomOn && (
          <Floating className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 text-[12px] text-fg-secondary ${floatOver}`}>
            drag to zoom · right-drag pans · Fit resets · click the tool again to stop
          </Floating>
        )}
        {/* one-line caption, only while a carve tool is active. What the carve MEANS differs
            by ground: on the catalogue it narrows (keep or cut), on your own set it chooses
            (2026-09-09) — so the sentence differs too. */}
        {m.tool && (
          <Floating className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 text-[12px] text-fg-secondary ${floatOver}`}>
            draw around the ones you like, then keep or cut
            {m.keptIds && (
              <>
                {' · '}
                {/* "clear", not "undo" (owner, 2026-09-13): it drops the whole carve — there is
                    no per-step carve history to step back through */}
                <button onClick={m.clearCarve} className="text-accent-300 underline hover:text-fg" title="Show the whole wall again">
                  {m.keptIds.length} kept, clear
                </button>
              </>
            )}
          </Floating>
        )}
        {/* WHAT YOU CHOSE, and what can be done with it. Shown whenever a selection exists,
            tool or no tool — it outlives the gesture that made it (owner's parity list:
            "select these six and move them to that group"). Dragging any one of them
            carries the batch; these are the same actions without a drag. */}
        {m.selectedIds.size > 0 && (
          <Floating
            /* PHONE: above the tool row, which now owns the bottom-left corner. 52 = the
               row's 40 px button plus its 3 px padding each side, plus a 6 px gap. */
            className={`absolute left-4 flex items-center gap-2 px-3 py-1.5 text-[13px] ${floatOver} ${phone ? 'bottom-[64px] max-w-[calc(100%-2rem)] flex-wrap' : 'bottom-3'}`}
            data-gx-selection-bar=""
          >
            {/* No "· drag them onto a set, or" (owner, 2026-09-24): the drag is found by doing
                it, and the bar is for what can be pressed. */}
            <span className="text-fg">
              {m.selectedIds.size} selected
            </span>
            <Act onClick={(e) => moveSelectionTo(e.currentTarget.getBoundingClientRect())} title="Move them into another group">Move to…</Act>
            <Act onClick={removeSelection} title="Remove them from My Gradients">Remove</Act>
            <button onClick={m.clearSelection} className="text-fg-muted hover:text-fg" title="Clear the selection (Esc)">
              <Icon name="close" />
            </button>
          </Floating>
        )}

        {/* zoom readout + Fit. PHONE: gone. The readout is a number about a gesture the
            phone does not have (middle-drag / right-drag), it sat over the tiles in the
            other bottom corner, and Fit — the one control in it that still means something
            — has moved into the tool row. The LIST drops it too: its rows are DOM and the zoom
            it reports does nothing to them (G03). */}
        {!phone && !showingList && (
        <Floating className={`absolute bottom-3 right-4 flex items-center gap-2 px-2.5 py-1 text-[12px] text-fg-muted tabular-nums ${floatOver}`}>
          {/* C.11 (owner): with the zoom tool active, the wall's Padding is here too — the
              gap between swatches is what you tune while zoomed in on them */}
          {zoomOn && (
            <InputSkinProvider skin="soft">
              <div className="w-[150px] mr-1" data-gx-zoom-padding>
                <Slider label="Padding" value={Number(m.sliceState?.paddingSize ?? 1)} min={0} max={40} step={1} onChange={(v) => m.setPaletteFilters?.({ paddingSize: v })} defaultValue={1} />
              </div>
            </InputSkinProvider>
          )}
          <span title="Middle-drag zooms · right-drag pans">{zoomPct}</span>
          <button
            onClick={m.resetZoom}
            disabled={!m.zoomed}
            className={m.zoomed ? 'text-accent-300 hover:text-fg' : 'text-fg-faint cursor-default'}
            title="Back to 1:1 (or middle-click the wall)"
          >
            Fit
          </button>
        </Floating>
        )}
      </div>

      {/* Rename in place. Fixed to the pointer, because a tile is a region of a canvas and
          has no element of its own to hang off. Enter commits, Esc and blur cancel. */}
      {renaming && (
        <Floating
          className="fixed z-50 p-1.5"
          style={{ left: Math.min(renaming.x, window.innerWidth - 240), top: Math.min(renaming.y, window.innerHeight - 60) }}
          data-gx-tile-rename=""
        >
          <input
            autoFocus
            defaultValue={renaming.name}
            aria-label="Rename gradient"
            className="w-[200px] bg-transparent outline-none text-[13px] text-fg border-b border-line/30 px-1 py-0.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename(e.currentTarget.value); }
              else if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
              e.stopPropagation();
            }}
            onBlur={(e) => commitRename(e.currentTarget.value)}
          />
        </Floating>
      )}
    </div>
  );
};

export default BrowseStage;
