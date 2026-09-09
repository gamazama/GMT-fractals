/**
 * usePickerModel — the gradient wall's whole behaviour, minus chrome.
 *
 * ONE hook, three hosts: the old Gradient Explorer stage (`gradient-explorer/PickerStage`),
 * app-gmt's palette overlay (which mounts that same stage) and the v2 Browse stage
 * (`gradient-explorer/v2/BrowseStage`). Each of them renders a different bar, a different
 * toolbar and a different empty state; none of them owns a second copy of the filtering,
 * grouping, carve or similarity logic. If you are about to write `catalog.filter(...)` in a
 * host, stop — extend the pure model at `palette/core/pickerModel.ts` instead.
 *
 * What lives here (and NOT in the pure model, because it is React/DOM/store):
 *   • the catalog load + the shared 256×N sprite the wall blits from;
 *   • the `paletteFilters` DDFS slice reads and the four writes (carve commit, carve clear,
 *     clear-all, and whatever the popover's AutoFeaturePanel does);
 *   • the transient `pickerSearch` query and `pickerSimilarity` anchor;
 *   • the per-surface pick (`heroSelection`, mode `'picker'`) and the drag-out payload;
 *   • the active carve tool plus its Esc / click-outside cancel;
 *   • the wall's zoom readout and reset signal.
 *
 * Undo / keyframe / preset semantics of `paletteFilters` are untouched: every write goes
 * through the auto-generated `setPaletteFilters` exactly as the old stage did.
 *
 * **A SET instead of the catalogue (GE v2 Phase D, 2026-09-08).** `usePickerModel({ source })`
 * runs the SAME pipeline over a `GroundSource` — a set of the user's own gradients
 * (`palette/core/groundSets.ts`: Recent's dated bins, Kept, a named group, Snapshots) with
 * its own small sprite. What differs on a set: the DDFS narrowers (quality windows, themes,
 * sources, the carve) do not apply — they are the catalogue's lens and their ids/themes
 * mean nothing on a favourite — only search and "More like this" do; the arrangement is
 * ONE row-major band in the set's own order; the pick speaks the shelf's `favients` mode so
 * the shell treats it exactly like a shelf click (a Mix slot stays armed, `fromRecent`);
 * and the tile grows as the set shrinks (`tileSizeFor`). Calling the hook bare (app-gmt's
 * overlay, the old stage) is the catalogue, unchanged by construction.
 *
 * @assumption The catalog is stable enough for the memo keys used here: the row build is
 *   keyed on `[catalog, JSON.stringify(criteria + axes)]`, so a catalog mutated IN PLACE
 *   (same array identity, different contents) would not rebuild. Every producer today
 *   replaces the array (`pickerStore.load` / `setGroupLoaded`), and nothing can go red if a
 *   future one does not — hence an assumption, not an invariant.
 * @see plans/ge-v2-design.md §5.2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { usePickerStore } from '../store/pickerStore';
import { usePickerSearch, setPickerSearch } from '../store/pickerSearch';
import { useSimilarityAnchor, setSimilarityAnchor, type SimilarityAnchor } from '../store/pickerSimilarity';
import { useWallSelection, setWallSelection, clearWallSelection, getWallSelection } from '../store/wallSelection';
import { entryToGradientConfig } from '../core/gradientSeam';
import { renderStopsToRamp } from '../core/gmtGradient';
import { GROUP_BY, ROWS_BY, SORT_BY } from '../features/paletteFilters';
import { setFavientDrag, beginCustomAvatarDrag } from '../core/favientDnd';
import {
  useHeroPick,
  useActiveHeroMode,
  useActiveHeroSelection,
  useHeroOptionsOpen,
  setHeroPick,
  setHeroDrag,
  deselectActiveHero,
} from '../store/heroSelection';
import type { CatalogEntry } from '../core/presetCatalog';
import type { SelectionTool } from './PickerWall';
import { ALL_SET_ID, tileSizeFor, type TileSize } from '../core/groundSets';
import type { GradientConfig } from '../../types';
import {
  arrangeRows,
  arrangeSentence,
  activeFilterCount,
  buildSearchIndex,
  carveIds,
  CLEAR_ALL_PATCH,
  filterCatalog,
  narrowerLabels,
  similarityAnchorRamp,
  similarityIndex,
  similarityRows,
  windowsFromSlice,
  type ArrangeAxes,
  type FilterCriteria,
  type PickerRow,
  EMPTY_CRITERIA,
} from '../core/pickerModel';

/** The gradient a set tile stands for — what a pick or a drag of it carries. */
export interface GroundItem {
  config: GradientConfig;
  name: string;
  source?: string;
  /** The favourite's id when the item IS a favourite (a drop elsewhere then MOVES it). */
  favId?: string;
}

/**
 * A set of the user's own gradients for the wall to show instead of the catalogue.
 * `entries[i].row` must be `i` — the hook builds the set's sprite from them in order.
 */
export interface GroundSource {
  /** The set id (`palette/core/groundSets.ts`), for memo keys and the header. */
  id: string;
  entries: CatalogEntry[];
  /** What each tile stands for. */
  itemOf: (entry: CatalogEntry) => GroundItem;
  /**
   * Which set each entry came from — one band per lit set, in rail order, KEYED BY SET ID
   * so a drop on the wall knows where it landed. The wall draws a full-width header for a
   * band that has a `label` (grep `data-wall-header` in PickerWall), which is what makes
   * two sets read as two places rather than one undivided run; a single set passes an
   * empty label and looks exactly as it always did. Omitted entirely and the ground
   * arranges as it always did: one band, the set's own order, no drop target.
   *
   * Similarity outranks the division: sorting by "more like this" asks one question ACROSS
   * the sets, so it keeps its single band.
   */
  bands?: { key: string; label: string; ids: ReadonlySet<string> }[];
  /**
   * Arrange this set the way the CATALOGUE is arranged — the hue × lightness pad, the
   * look windows, group / rows / sort — instead of holding the shelf's own order.
   *
   * A set normally IS an order: you put those gradients in that sequence. The GX global set
   * is the exception (owner, 2026-09-09): nobody owns it, so there is no sequence to
   * preserve, and with no names to search by the only sensible way through it is by colour.
   */
  arrangeable?: boolean;
}

/** The set's arrangement: one band, the set's own order, read left to right. */
const SET_AXES: ArrangeAxes = { groupAxis: 'none', rowsAxis: 'none', sortAxis: 'order', reverse: false };

export interface PickerModel {
  // --- the set on the ground ---
  /** `'all'` for the catalogue, else the GroundSource's id. */
  setId: string;
  /** True when a user set is on the ground (no DDFS narrowers, no carve tools). */
  isSet: boolean;
  /** True when this ground is arranged by colour rather than by a held order — the
   *  catalogue always, and the GX global set, which has no order of anyone's. */
  arrangeable: boolean;
  /** The tile the wall is drawing at (grows as the set shrinks — `tileSizeFor`). */
  tile: TileSize;

  // --- catalog ---
  loaded: boolean;
  /** Entries in the loaded catalog (the "of M" in "N of M"). */
  total: number;
  /** Shared 256×N sprite — each entry's `row` is its sprite row. */
  sprite: HTMLCanvasElement | null;

  // --- the wall ---
  rows: PickerRow[];
  /** Entries surviving every narrower (the "N" in "N of M"). */
  count: number;
  /** Their ids, in display order. */
  ids: string[];

  // --- narrowing ---
  search: string;
  setSearch: (q: string) => void;
  criteria: FilterCriteria;
  /** Human words for what is shrinking the wall, search included. */
  narrowers: string[];
  /** Badge number for a Filters button: narrowers EXCLUDING search. */
  filterCount: number;
  keptIds: string[] | null;
  /** Reset every narrower at once (search + carve + quality + themes + sources + anchor). */
  clearAll: () => void;
  /** Drop just the spatial carve. */
  clearCarve: () => void;

  // --- arranging ---
  axes: ArrangeAxes;
  /** "by category · rows by lightness · sorted by hue". */
  arrangeText: string;

  // --- More like this ---
  anchor: SimilarityAnchor | null;
  setAnchor: (a: SimilarityAnchor | null) => void;

  // --- the pick ---
  selected: CatalogEntry | null;
  /** `selected.id` only while the Picker is the ACTIVE surface (drives the wall enlarge). */
  selectedId: string | undefined;
  /** A gradient is in hand following the cursor — suppress the wall's hover zoom. */
  gradientInHand: boolean;
  onPick: (e: CatalogEntry, ev?: React.MouseEvent) => void;
  onEntryDragStart: (e: CatalogEntry, dt: DataTransfer) => void;
  onDeselect: () => void;

  // --- carve tool ---
  tool: SelectionTool | null;
  setTool: React.Dispatch<React.SetStateAction<SelectionTool | null>>;
  onSelectionCommit: (insideIds: string[], op: 'isolate' | 'cut' | 'select') => void;
  /** The tiles a carve selected — set-ground only; empty on the catalogue. */
  selectedIds: ReadonlySet<string>;
  /** Drop the selection. */
  clearSelection: () => void;
  /** Attach to the element wrapping the wall — a pointerdown inside it keeps the tool. */
  wallHostRef: React.RefObject<HTMLDivElement>;
  /** Attach to the tool palette — same. */
  toolbarRef: React.RefObject<HTMLDivElement>;

  // --- wall view ---
  zoom: { x: number; y: number };
  onZoomChange: (z: { x: number; y: number }) => void;
  resetZoomSignal: number;
  resetZoom: () => void;
  zoomed: boolean;

  // --- swatch metrics (paletteFilters params) ---
  swatchW: number;
  swatchH: number;
  gap: number;

  // --- slice plumbing, for a host that renders the filter controls itself ---
  sliceState: Record<string, unknown> | undefined;
  setPaletteFilters: ((u: Record<string, unknown>) => void) | undefined;
}

export const usePickerModel = (opts?: { source?: GroundSource | null; pickOnDrag?: boolean }): PickerModel => {
  const source = opts?.source ?? null;
  // Default TRUE: every host that existed before 2026-09-09 was built on drag-also-picks.
  const pickOnDrag = opts?.pickOnDrag ?? true;
  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;
  const setPaletteFilters = useEngineStore(
    (s) => (s as Record<string, any>).setPaletteFilters as ((u: Record<string, unknown>) => void) | undefined,
  );

  const catalog = usePickerStore((s) => s.catalog);
  const loaded = usePickerStore((s) => s.loaded);
  const bundles = usePickerStore((s) => s.bundles);
  const load = usePickerStore((s) => s.load);
  useEffect(() => { load(); }, [load]);
  // The list the wall shows: the catalogue, or the set's own entries.
  const base = source ? source.entries : catalog;
  const selectedIds = useWallSelection();
  // A selection belongs to the ground it was made on: changing set, or leaving for the
  // catalogue, drops it rather than leaving ids highlighted that are no longer drawn.
  const groundKey = source?.id ?? ALL_SET_ID;
  useEffect(() => {
    clearWallSelection();
  }, [groundKey]);
  const heroMode = source ? 'favients' : 'picker';

  // The wall's OWN pick lives in the per-surface heroSelection store (not local state) so
  // it survives the desktop↔mobile remount, is independent of Favients (selecting a
  // favourite never touches it), and drives the shared dock. Derive the entry from the catalog.
  // On a set the pick is the shelf's (`favients`, keyed by the favourite's id) — one
  // surface, whichever set is on the ground.
  const pickerPick = useHeroPick(heroMode);
  const selected = useMemo(
    () => (pickerPick ? base.find((e) => e.id === pickerPick.key) ?? null : null),
    [pickerPick, base],
  );
  // The wall enlarge only shows while the Picker is the ACTIVE surface, so deselect
  // (empty-wall / Esc) clears the highlight while a host hero keeps showing the gradient.
  const pickerActive = useActiveHeroMode() === heroMode;
  // A gradient is in hand following the cursor (click-through) → suppress the wall's
  // hover-zoom preview so it doesn't fight the floating avatar. `optionsOpen` is set ONLY
  // by the click path (setHeroPick), never by a drag (setHeroDrag), so this already means
  // "picked && !dragging" — no drag check needed.
  const optionsOpen = useHeroOptionsOpen();
  const activeSel = useActiveHeroSelection();
  const gradientInHand = optionsOpen && activeSel != null;

  const search = usePickerSearch();
  const anchor = useSimilarityAnchor();

  // Spatial-selection carve: the active wall tool + the surviving id-set (transient).
  const [tool, setTool] = useState<SelectionTool | null>(null);
  // The carve is catalogue ids; on a set it does not apply (and the tools are hidden).
  // The carve narrows the CATALOGUE by its ids; no set has one, arrangeable or not.
  const keptIds: string[] | null = source ? null : pf?.keptIds ?? null;
  // Live mirror of the currently-displayed ids, so a "cut" carve can drop the selected
  // ones from the WHOLE displayed wall (not just the on-screen swatches the wall sees).
  const idsRef = useRef<string[]>([]);
  const wallHostRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Wall view zoom (reported up from PickerWall for a readout) + a reset signal.
  const [zoom, setZoom] = useState({ x: 1, y: 1 });
  const [resetZoomSignal, setResetZoomSignal] = useState(0);
  const resetZoom = useCallback(() => setResetZoomSignal((n) => n + 1), []);

  const bundleLabel = useCallback((id: string) => bundles[id]?.label, [bundles]);
  const searchIndex = useMemo(() => buildSearchIndex(base, bundleLabel), [base, bundleLabel]);

  // Shared 256×N sprite — each entry's `row` is its sprite row. Built once per list (the
  // catalogue once; a set's own small sheet whenever the set changes).
  const sprite = useMemo(() => {
    if (!base.length || typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = base.length;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(256, base.length);
    for (const e of base) img.data.set(e.ramp, e.row * 256 * 4);
    ctx.putImageData(img, 0, 0);
    return cv;
  }, [base]);

  // On a set only search narrows — the quality windows, themes, sources and the carve are
  // the catalogue's lens (a favourite has no theme or bundle, and carve ids are catalogue ids).
  const criteria: FilterCriteria = source && !source.arrangeable
    ? { ...EMPTY_CRITERIA, windows: windowsFromSlice(undefined), query: search }
    : {
        windows: windowsFromSlice(pf),
        activeThemes: pf?.activeThemes ?? [],
        hiddenBundles: pf?.hiddenBundles ?? [],
        keptIds,
        query: search,
      };
  const axes: ArrangeAxes = source && !source.arrangeable
    ? SET_AXES
    : {
        groupAxis: GROUP_BY[pf?.groupBy ?? 0] ?? 'none',
        rowsAxis: ROWS_BY[pf?.rowsBy ?? 0] ?? 'none',
        sortAxis: SORT_BY[pf?.sortBy ?? 0] ?? 'lightness',
        reverse: !!pf?.reverse,
      };

  // ΔE from every entry to the anchor: O(list) ONCE per anchor change, then reused by
  // every re-filter. 16 samples per entry pulled straight out of the packed ramp buffer.
  const distance = useMemo(() => {
    if (!anchor || !base.length) return null;
    return similarityIndex(base, similarityAnchorRamp(anchor.config));
  }, [anchor, base]);

  const key = JSON.stringify([criteria, axes]);
  const bandKey = source?.bands?.map((b) => `${b.key}:${b.ids.size}`).join('|') ?? '';
  const { rows, count, ids } = useMemo(() => {
    const list = filterCatalog(base, criteria, searchIndex);
    let result = distance ? similarityRows(list, distance) : arrangeRows(list, axes, bundleLabel);
    // SEVERAL sets on one ground: a band each, labelled, in the order the rail names them.
    // Sorting by similarity is a re-rank of the whole ground and outranks the division —
    // it is asking one question ACROSS the sets, so it keeps its single band.
    const bands = source?.bands;
    if (bands && bands.length && !distance) {
      const seen = new Set<string>();
      result = bands
        .map((b) => ({
          key: b.key,
          label: `${b.label}`,
          // A favourite that belongs to two lit sets is drawn under the FIRST that claims
          // it, so the union stays a partition and no tile appears twice.
          entries: list.filter((e) => b.ids.has(e.id) && !seen.has(e.id) && (seen.add(e.id), true)),
        }))
        .filter((r) => r.entries.length > 0);
    }
    // A set reads left to right, top to bottom, like the shelf it came from (the wall's
    // default fill is column-major, which suits a sorted continuum, not an ordered list).
    if (source) result = result.map((r) => ({ ...r, rowMajor: true }));
    // Similarity re-sorts the whole wall, so the id order the carve works against has to
    // come from the ROWS, not the pre-arrange list.
    return { rows: result, count: list.length, ids: result.flatMap((g) => g.entries.map((e) => e.id)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, searchIndex, bundleLabel, distance, key, !!source, bandKey]);
  idsRef.current = ids;

  // --- carve commit / clear ---------------------------------------------------------
  const onSelectionCommit = useCallback(
    (insideIds: string[], op: 'isolate' | 'cut' | 'select') => {
      // ON A SET the same gesture means SELECTION, not narrowing (2026-09-09). A set is
      // small and already yours: narrowing it answers nothing, whereas "these six" is the
      // one thing neither the wall nor the shelf panel could ever express. On the
      // CATALOGUE it stays the carve, byte for byte.
      if (source) {
        setWallSelection(insideIds, op === 'cut' ? 'subtract' : op === 'select' ? 'add' : 'replace');
        return;
      }
      if (op === 'select') return; // a set-only op; the catalogue never asks for it
      setPaletteFilters?.({ keptIds: carveIds(idsRef.current, insideIds, op) });
    },
    [setPaletteFilters, source],
  );
  const clearCarve = useCallback(() => setPaletteFilters?.({ keptIds: null }), [setPaletteFilters]);
  // The unified "clear": reset every active narrower at once (transient search, similarity
  // and carve, plus the DDFS quality windows / theme / source toggles) so "why is my wall
  // small?" has one button as well as one answer.
  const clearAll = useCallback(() => {
    setPickerSearch('');
    setSimilarityAnchor(null);
    setPaletteFilters?.({ ...CLEAR_ALL_PATCH });
  }, [setPaletteFilters]);

  // Esc, or a pointerdown on any non-wall / non-toolbar UI, cancels the active tool.
  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTool(null); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (wallHostRef.current?.contains(t) || toolbarRef.current?.contains(t)) return;
      setTool(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true); };
  }, [tool]);

  // Pick → SELECT it (drives the host's hero preview + the bin dock). The standalone studio
  // has no fractal to colour, so there is no apply-to-coloring side effect here.
  const onPick = useCallback((e: CatalogEntry) => {
    if (source) {
      // A set tile is a shelf item: the same pick the strip made (mode `favients`, the
      // favourite's id as the key), so the shell's rules apply unchanged.
      const it = source.itemOf(e);
      setHeroPick({ mode: 'favients', key: e.id, payload: { config: it.config, name: it.name, source: it.source, favId: it.favId } });
      return;
    }
    setHeroPick({
      mode: 'picker',
      key: e.id,
      payload: { config: entryToGradientConfig(e), name: e.name, source: 'Picker' },
    });
  }, [source]);
  // Drag a swatch out of the wall to drop it into the Favients shelf.
  const onEntryDragStart = useCallback((e: CatalogEntry, dt: DataTransfer) => {
    const it = source ? source.itemOf(e) : null;
    // Dragging a tile that is part of a SELECTION carries the whole selection, this one
    // first. Every other field still describes gradient one, so a target that knows
    // nothing about batches files exactly that one — the old behaviour, not a break.
    const sel = getWallSelection();
    const favIds =
      it?.favId && sel.size > 1 && sel.has(e.id)
        ? [it.favId, ...idsRef.current.filter((id) => id !== e.id && sel.has(id))]
        : undefined;
    const payload = it
      ? { config: it.config, name: it.name, source: it.source, favId: it.favId, favIds }
      : { config: entryToGradientConfig(e), name: e.name, source: 'Picker' };
    setFavientDrag(dt, payload);
    beginCustomAvatarDrag(dt); // register the drag + suppress the native image (avatar stands in)
    // "Drag mirrors click" — the dragged swatch also becomes the hero PICK. Two things used
    // to need that: the avatar got its ramp from the pick, and the old shell's drop routing
    // (`DropTargetLayer`) reads the pick to decide what a dropbox receives.
    //
    // Neither is true in GE v2, and there the side effect is the whole problem: a pick IS a
    // Use, so merely dragging a gradient to re-file it REPLACED the one you were working on
    // and ringed it on the wall (owner, 2026-09-09: "gradients get selected whenever I
    // drag"; measured with a probe over four real drags — the multi-selection stayed empty
    // the whole time, so it was never the marquee). The avatar now reads its own payload
    // slot (`setDragPayload` in `setFavientDrag`), so v2 opts out and every other host keeps
    // the behaviour it was built on.
    if (pickOnDrag) setHeroDrag({ mode: heroMode, key: e.id, payload });
  }, [source, heroMode, pickOnDrag]);

  // The tile grows as the set shrinks; the wall's own setting is the floor.
  const baseTile: TileSize = { w: Math.round(pf?.swatchSize?.x ?? 32), h: Math.round(pf?.swatchSize?.y ?? 18) };
  const tile = tileSizeFor(count, baseTile);

  return {
    selectedIds,
    clearSelection: clearWallSelection,
    /** This ground takes the catalogue's arranging (the pad, the look windows). */
    arrangeable: !source || !!source.arrangeable,
    setId: source?.id ?? ALL_SET_ID,
    isSet: !!source,
    tile,
    loaded: source ? true : loaded,
    total: base.length,
    sprite,
    rows,
    count,
    ids,
    search,
    setSearch: setPickerSearch,
    criteria,
    narrowers: narrowerLabels(criteria),
    filterCount: activeFilterCount(criteria),
    keptIds,
    clearAll,
    clearCarve,
    axes,
    arrangeText: arrangeSentence(axes),
    anchor,
    setAnchor: setSimilarityAnchor,
    selected,
    selectedId: pickerActive ? selected?.id : undefined,
    gradientInHand,
    onPick,
    onEntryDragStart,
    onDeselect: deselectActiveHero,
    tool,
    setTool,
    onSelectionCommit,
    wallHostRef,
    toolbarRef,
    zoom,
    onZoomChange: setZoom,
    resetZoomSignal,
    resetZoom,
    zoomed: zoom.x !== 1 || zoom.y !== 1,
    swatchW: tile.w,
    swatchH: tile.h,
    // The wall scales the gap with the tile it draws (zoomed or grown); Padding is the floor.
    gap: Math.max(0, Math.round(pf?.paddingSize ?? 0)),
    sliceState: pf,
    setPaletteFilters,
  };
};
