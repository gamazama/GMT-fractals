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
 * search field carrying the live match count, then a Filters button whose badge counts the
 * active narrowers (search excluded). Filters is NOT a popover (it covered the wall it
 * narrows, which updates live): it opens three inline rows under the bar — LOOK (simple ↔
 * complex, single-hue ↔ rainbow) · SOURCES · ARRANGE (group / rows / sort / reverse, the
 * count, clear-all). Cool ↔ warm is not rendered here (redundant with hue). Nothing narrows
 * the wall from anywhere else.
 *
 * No hero here. A wall click is a candidate (`setHeroPick`); `WorkingHero` previews it.
 *
 * ONE GROUND, MANY SETS (Phase D, 2026-09-08): the wall shows whichever set the rail has lit
 * (`useGroundSetIds` → `useGroundSource`; several lit chips union into one ground). On the
 * catalogue (All) everything above applies.
 * On a user set — a dated bin of Recent, Kept, a named group — the pad and Filters are
 * gone (they are the catalogue's lens), the header names the set, search still narrows,
 * "More like this" still ranks, the carve tools are gone (their ids are catalogue ids), the
 * gutter is 0 (no bands to label) and the tiles are as large as the count allows. "Keep
 * these N" on a narrowed All files the narrowed wall as a new group and puts it on the
 * ground — a saved search that is also a place.
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
 * All of the behaviour is `usePickerModel` — the same hook the old `PickerStage` and
 * app-gmt's palette overlay run. This file is layout, wording and chrome. If you need the
 * wall to filter/sort/carve differently, change `palette/core/pickerModel.ts`, not this.
 *
 * @see plans/ge-v2-design.md §5.2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PickerWall, type WallBand, type WallView } from '../../palette/components/PickerWall';
import { usePickerModel } from '../../palette/components/usePickerModel';
import Slider from '../../components/Slider';
import { InputSkinProvider } from '../../components/inputs';
import { PickerBundleToggles } from '../../palette/components/PickerControls';
import { QualityRangePadConnected } from '../../palette/components/QualityRangePadConnected';
import { HueLightnessPad, stripTrackFor } from '../../palette/components/HueLightnessPad';
import { padAxesFor, WINDOW_KEY } from '../../palette/core/padAxes';
import { mapSpan } from '../../palette/core/lensBand';
import { MapScrollbar } from './ui/MapScrollbar';
import { useWorkingDerived } from '../../palette/store/workingStore';
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
import { GroundList } from './GroundList';
import { Act } from './ui/Act';
import { useGroundSetIds, setGroundSetId } from '../../palette/store/groundSet';
import { showToast } from '../../engine/store/toastStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { fileFavientAt, fileFavientsAt } from '../../palette/store/favientFiling';
import { FAVIENT_DND_MIME, readFavientDrag } from '../../palette/core/favientDnd';
import { parseSetId } from '../../palette/core/groundSets';
import type { ContextMenuItem } from '../../types/help';
import { useGroundSets, useGroundSource } from './useGroundSource';
import { groupSetId } from '../../palette/core/groundSets';
import { newGroupId, useFavientsStore } from '../../palette/store/favientsStore';
import { clearWallSelection } from '../../palette/store/wallSelection';
import { entryToGradientConfig } from '../../palette/core/gradientSeam';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import type { CatalogEntry } from '../../palette/core/presetCatalog';

/** "Keep these N" is offered up to this many — past it the narrowing is not a selection yet. */
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

/** Faint dotted ground behind the swatches, so the wall reads as a canvas, not a list. */
const GROUND: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
};

// V1: everything that floats over the wall is a `Floating` surface — the Phase A
// carry-over (these were inlined class strings, built concurrently with the primitive).
// `backdrop-blur-sm` stays: the wall scrolls under them.
const floatOver = 'backdrop-blur-sm';

export const BrowseStage: React.FC = () => {
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
  const setTitle = sets.filter((s) => setIds.includes(s.id)).map((s) => s.label).join(' + ') || m.setId;
  // The pad follows the Arrange state (owner, 2026-09-08): rows on its Y, sort on its X when
  // they are colour axes, the third on the strip — so the pad is the wall's map for any
  // arrangement it can paint (`palette/core/padAxes.ts`; the harness pins the table).
  const pad = useMemo(() => padAxesFor(m.axes.rowsAxis, m.axes.sortAxis), [m.axes.rowsAxis, m.axes.sortAxis]);
  // Nothing picked yet — the hero is absent (L8) and the bar says what to do (see below).
  const nothingPicked = useWorkingDerived().empty;

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
  // Keep these N: the narrowed wall becomes a named group and the ground shows it.
  const keepThese = useCallback(() => {
    const entries = m.rows.flatMap((r) => r.entries);
    if (!entries.length || entries.length > KEEP_MAX) return;
    const q = m.search.trim();
    const label = q ? q.charAt(0).toUpperCase() + q.slice(1) : 'Selection';
    const g = newGroupId();
    paramEdit(() => {
      // the theme rides along as provenance, so the panel's search still finds a
      // gradient that matched by theme rather than by name
      useFavientsStore.getState().insertMany(entries.map((e) => ({ config: entryToGradientConfig(e), name: e.name, source: e.theme ? `Browse · ${e.theme}` : 'Browse' })), g, label);
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
  const activeTool: ToolId | null = zoomTool ? 'zoom' : (m.tool as ToolId | null);
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

  // Esc closes the rows (capture phase, so the shell's plain keydown does not also dismiss
  // the candidate).
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [filtersOpen]);

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

  // GRID or LIST, on a set (owner, 2026-09-09). The wall draws bars, which is right for
  // choosing by colour and wrong for finding one you NAMED — the shelf panel has had this
  // toggle all along and the ground had none, so reading your own names meant opening a
  // floating panel over the wall you were looking at. Remembered, like the panel's.
  const [listView, setListView] = useState<boolean>(() => {
    try { return localStorage.getItem(GROUND_VIEW_KEY) === 'list'; } catch { return false; }
  });
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

  /** Move everything selected into a group the user picks from the shelf's own groups. */
  const moveSelectionTo = useCallback(() => {
    const ids = [...m.selectedIds];
    if (!ids.length) return;
    const st = useFavientsStore.getState();
    const groups = sets.filter((x) => x.kind === 'group');
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
    // Anchored at the bar itself — the menu belongs to the button that opened it.
    const el = document.querySelector('[data-gx-selection-bar]')?.getBoundingClientRect();
    openContextMenu(el ? el.left + 60 : 200, el ? el.top : 200, items);
  }, [m.selectedIds, m.clearSelection, sets, openContextMenu]);


  const stripDef = QUALITY_AXES.find((a) => a.axis === WINDOW_KEY[pad.strip])!;
  // The strip is painted toward the pad window's average colour (owner).
  const stripTrack = useMemo(() => stripTrackFor(pad, xWin, yWin) ?? undefined, [pad, xWin[0], xWin[1], yWin[0], yWin[1]]);

  const zoomPct = m.zoom.x === m.zoom.y
    ? `${Math.round(m.zoom.x * 100)}%`
    : `${m.zoom.x.toFixed(1)}× ${m.zoom.y.toFixed(1)}×`;

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
      <div className="shrink-0 relative px-6 pt-3 pb-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-surface-raised" data-gx-ground-set={m.setId}>
        {/* left: the wall in a sentence (the research: a wall you cannot describe reads as
            noise) — on All the count and the arrangement; on a set, nothing (its name is
            in the centre where the pad was). */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] text-fg-dim tabular-nums truncate min-w-0" data-gx-arrange-text="">
            {!m.isSet && m.loaded && (
              <>{m.count < m.total ? `${m.count.toLocaleString()} of ${m.total.toLocaleString()}` : m.total.toLocaleString()} · {m.anchor ? 'nearest first' : m.arrangeText}</>
            )}
          </span>
          {/* Keep these N — the sentence says what narrowed the wall; this keeps it as a
              group in My Gradients and shows it (Phase D) */}
          {!m.isSet && m.loaded && m.count > 0 && m.count < m.total && m.count <= KEEP_MAX && (
            <Act onClick={keepThese} title="File these as a new group in My Gradients and show it" data-gx-keep-these="" className="shrink-0">
              <Icon name="plus" /> Keep these {m.count.toLocaleString()}
            </Act>
          )}
        </div>
        {m.isSet && !m.arrangeable ? (
          /* a set on the ground: its name where the pad was — the pad and Filters are the
             catalogue's lens (their windows, themes and carve ids mean nothing here) */
          <div className="flex items-baseline gap-2 justify-self-center h-[56px] items-center" data-gx-set-title="">
            <span className="text-[15px] text-fg">{setTitle}</span>
            <span className="text-[13px] text-fg-muted tabular-nums">{m.count < m.total ? `${m.count} of ${m.total}` : m.total}</span>
          </div>
        ) : (
        /* The colour picker IS the main narrower (owner): hue × lightness with a box. On the
            bar, never over the wall it narrows. */
        <div className="flex flex-col gap-1 justify-self-center">
          {/* Nothing picked yet: say so HERE, over the map, rather than in the corner below.
              This replaces the line that used to sit above the wall in GradientExplorerV2App
              ("Click a gradient to preview it above …") — which pointed at a hero that does
              not exist until the first pick (owner, 2026-09-09: "this can replace the 'click
              a gradient to preview it..' which is wrong anyway"). */}
          {nothingPicked && (
            <div className="text-[12px] text-fg-muted text-center leading-none" data-gx-map-hint="">
              {/* "click it again to keep and edit it" is gone (owner, 2026-09-09): it taught
                  the SECOND gesture before the first had been made, and the second one is
                  discovered by doing it. The pad beside this line says what IT is for. */}
              Click a gradient to start · or pick a colour range
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
            width={360}
            height={56}
            marker={marker}
          />
          {/* `span`, not `reach`: the two differ when a window is drawn inside a bucket, and
              the dimming has to agree with the box on the pad beside it. */}
          <MapScrollbar range={marker} reach={rowsOnAxis ? span : null} height={56} onSeek={canSeek ? seekBand : undefined} />
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
        <div className="flex flex-wrap items-center justify-end gap-y-1.5 gap-x-3 min-w-0">
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
          className={`h-[34px] px-3 rounded-[10px] border text-[13px] flex items-center gap-2 transition-colors ${
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
        <div className="flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-line/20 bg-surface-dock w-[260px] max-w-full">
          <svg className="w-3.5 h-3.5 shrink-0 text-fg-dim" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3.6 3.6" strokeLinecap="round" />
          </svg>
          <input
            value={m.search}
            onChange={(e) => m.setSearch(e.target.value)}
            placeholder={m.isSet ? `Search ${setTitle || 'this set'}` : m.loaded ? `Search ${m.total.toLocaleString()} gradients` : 'Loading gradients…'}
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-fg placeholder-fg-faint"
          />
          {m.search && (
            <button onClick={() => m.setSearch('')} title="Clear search" className="px-1 text-fg-dim hover:text-fg">×</button>
          )}
          {m.loaded && m.count < m.total && (
            <span className="text-[12px] text-fg-muted tabular-nums whitespace-nowrap">{m.count.toLocaleString()} match</span>
          )}
        </div>

        </div>
      </div>

      {/* ── Filters: three inline rows, never over the wall ────────────────── */}
      {filtersOpen && !m.isSet && (
        <div className="shrink-0 px-6 pb-2.5 flex flex-col gap-2 border-b border-line/10 bg-surface-raised" data-gx-selectable="">
          {/* LOOK */}
          <div className="flex items-center gap-3">
            <span className="w-[72px] shrink-0 text-[11px] uppercase tracking-wide text-fg-muted">Look</span>
            <div className="flex-1 grid grid-cols-2 gap-x-6">
              {LOOK_AXES.map((ax) => (
                <QualityRangePadConnected key={ax.axis} featureId="paletteFilters" sliceState={m.sliceState} actions={actions} {...ax} hints="tooltip" keyframes={false} />
              ))}
            </div>
          </div>
          {/* ARRANGE */}
          <div className="flex items-center gap-3">
            <span className="w-[72px] shrink-0 text-[11px] uppercase tracking-wide text-fg-muted">Arrange</span>
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]"><Dropdown size="md" fullWidth label="Group by" value={Number(m.sliceState?.groupBy ?? 0)} options={enumOptions(groupByParam.config)} onChange={(v) => m.setPaletteFilters?.({ groupBy: v })} /></div>
              <div className="flex-1 min-w-[160px]"><Dropdown size="md" fullWidth label="Rows by" value={Number(m.sliceState?.rowsBy ?? 0)} options={enumOptions(rowsByParam.config)} onChange={(v) => m.setPaletteFilters?.({ rowsBy: v })} /></div>
              <div className="flex-1 min-w-[160px]"><Dropdown size="md" fullWidth label="Sort by" value={Number(m.sliceState?.sortBy ?? 0)} options={enumOptions(sortByParam.config)} onChange={(v) => m.setPaletteFilters?.({ sortBy: v })} /></div>
              <label className="flex items-center gap-2 text-[13px] text-fg-muted select-none">
                <input type="checkbox" checked={!!m.sliceState?.reverse} onChange={(e) => m.setPaletteFilters?.({ reverse: e.target.checked })} /> Reverse
              </label>
              <span className="ml-auto text-[13px] text-fg-muted tabular-nums">
                {m.loaded ? `${m.count.toLocaleString()} of ${m.total.toLocaleString()}` : 'loading…'}
              </span>
              {(m.narrowers.length > 0 || m.anchor) && (
                <button onClick={m.clearAll} className="text-[13px] text-accent-300 underline hover:text-fg" title="Clear search, look ranges, sources, the carve and the similarity sort">
                  clear all
                </button>
              )}
            </div>
          </div>
          {/* SOURCES */}
          <div className="flex items-center gap-3">
            <span className="w-[72px] shrink-0 text-[11px] uppercase tracking-wide text-fg-muted">Sources</span>
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
        className={`flex-1 min-h-0 relative border-t border-line/10 ${zoomTool && !m.tool ? 'cursor-zoom-in' : ''}`}
      >
        {!m.loaded ? (
          <div className="h-full flex items-center justify-center text-[13px] text-fg-faint">Loading gradient library…</div>
        ) : m.count > 0 && m.isSet && listView ? (
          <GroundList
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
            zoomTool={zoomTool && !m.tool}
            /* V2 as amended: 10 px on a bar, 20 on a box — a tile that has grown toward a
               box takes more rounding (the wall caps it at a third of the short side) */
            tileRadius={Math.round(Math.min(20, 8 + Math.max(0, m.tile.h - 18) / 9))}
            // A set has no row-label gutter to draw, but it still wants the shell's 24 px
            // margin: at 0 the user's own gradients ran flush into the window edge, out of
            // line with the rail chips and the header above them (owner, 2026-09-09: "the
            // user areas are very tight against the edge of the screen"). Below 28 px the
            // gutter draws nothing and is pure margin — which is exactly what is wanted.
            gutter={m.isSet ? 24 : undefined}
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
            {m.isSet && !m.search.trim() ? (
              <span>Nothing here yet — pick gradients from All and they land in Today; drop one on a chip below to file it.</span>
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
        <Floating ref={m.toolbarRef} data-gx-tools="tools" className={`absolute top-2.5 flex flex-col gap-0.5 p-[3px] ${floatOver}`} style={{ left: TOOLBAR_LEFT }}>
          {TOOLS.filter((t) => !m.isSet || t.id === 'zoom').map((t) => {
            const on = activeTool === t.id;
            return (
              <button
                key={t.label}
                onClick={() => pickTool(t.id)}
                title={t.title}
                aria-label={t.label}
                aria-pressed={on}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-white/5'}`}
              >
                <Icon name={t.glyph} />
              </button>
            );
          })}
        </Floating>

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
        {zoomTool && !m.tool && (
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
                <button onClick={m.clearCarve} className="text-accent-300 underline hover:text-fg">
                  {m.keptIds.length} kept, undo
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
            className={`absolute bottom-3 left-4 flex items-center gap-2 px-3 py-1.5 text-[13px] ${floatOver}`}
            data-gx-selection-bar=""
          >
            <span className="text-fg">
              {m.selectedIds.size} selected
            </span>
            <span className="text-fg-dim">· drag them onto a set, or</span>
            <Act onClick={() => moveSelectionTo()} title="Move them into another group">Move to…</Act>
            <Act onClick={removeSelection} title="Remove them from My Gradients">Remove</Act>
            <button onClick={m.clearSelection} className="text-fg-muted hover:text-fg" title="Clear the selection (Esc)">
              <Icon name="close" />
            </button>
          </Floating>
        )}

        {/* zoom readout + Fit */}
        <Floating className={`absolute bottom-3 right-4 flex items-center gap-2 px-2.5 py-1 text-[12px] text-fg-muted tabular-nums ${floatOver}`}>
          {/* C.11 (owner): with the zoom tool active, the wall's Padding is here too — the
              gap between swatches is what you tune while zoomed in on them */}
          {zoomTool && !m.tool && (
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
