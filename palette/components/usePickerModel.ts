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
} from '../core/pickerModel';

export interface PickerModel {
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
  onPick: (e: CatalogEntry) => void;
  onEntryDragStart: (e: CatalogEntry, dt: DataTransfer) => void;
  onDeselect: () => void;

  // --- carve tool ---
  tool: SelectionTool | null;
  setTool: React.Dispatch<React.SetStateAction<SelectionTool | null>>;
  onSelectionCommit: (insideIds: string[], op: 'isolate' | 'cut') => void;
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

export const usePickerModel = (): PickerModel => {
  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;
  const setPaletteFilters = useEngineStore(
    (s) => (s as Record<string, any>).setPaletteFilters as ((u: Record<string, unknown>) => void) | undefined,
  );

  const catalog = usePickerStore((s) => s.catalog);
  const loaded = usePickerStore((s) => s.loaded);
  const bundles = usePickerStore((s) => s.bundles);
  const load = usePickerStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  // The wall's OWN pick lives in the per-surface heroSelection store (not local state) so
  // it survives the desktop↔mobile remount, is independent of Favients (selecting a
  // favourite never touches it), and drives the shared dock. Derive the entry from the catalog.
  const pickerPick = useHeroPick('picker');
  const selected = useMemo(
    () => (pickerPick ? catalog.find((e) => e.id === pickerPick.key) ?? null : null),
    [pickerPick, catalog],
  );
  // The wall enlarge only shows while the Picker is the ACTIVE surface, so deselect
  // (empty-wall / Esc) clears the highlight while a host hero keeps showing the gradient.
  const pickerActive = useActiveHeroMode() === 'picker';
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
  const keptIds: string[] | null = pf?.keptIds ?? null;
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
  const searchIndex = useMemo(() => buildSearchIndex(catalog, bundleLabel), [catalog, bundleLabel]);

  // Shared 256×N sprite — each entry's `row` is its sprite row. Built once per catalog.
  const sprite = useMemo(() => {
    if (!catalog.length || typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = catalog.length;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(256, catalog.length);
    for (const e of catalog) img.data.set(e.ramp, e.row * 256 * 4);
    ctx.putImageData(img, 0, 0);
    return cv;
  }, [catalog]);

  const criteria: FilterCriteria = {
    windows: windowsFromSlice(pf),
    activeThemes: pf?.activeThemes ?? [],
    hiddenBundles: pf?.hiddenBundles ?? [],
    keptIds,
    query: search,
  };
  const axes: ArrangeAxes = {
    groupAxis: GROUP_BY[pf?.groupBy ?? 0] ?? 'none',
    rowsAxis: ROWS_BY[pf?.rowsBy ?? 0] ?? 'none',
    sortAxis: SORT_BY[pf?.sortBy ?? 0] ?? 'lightness',
    reverse: !!pf?.reverse,
  };

  // ΔE from every entry to the anchor: O(catalog) ONCE per anchor change, then reused by
  // every re-filter. 16 samples per entry pulled straight out of the packed ramp buffer.
  const distance = useMemo(() => {
    if (!anchor || !catalog.length) return null;
    return similarityIndex(catalog, similarityAnchorRamp(anchor.config));
  }, [anchor, catalog]);

  const key = JSON.stringify([criteria, axes]);
  const { rows, count, ids } = useMemo(() => {
    const list = filterCatalog(catalog, criteria, searchIndex);
    const result = distance ? similarityRows(list, distance) : arrangeRows(list, axes, bundleLabel);
    // Similarity re-sorts the whole wall, so the id order the carve works against has to
    // come from the ROWS, not the pre-arrange list.
    return { rows: result, count: list.length, ids: result.flatMap((g) => g.entries.map((e) => e.id)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, searchIndex, bundleLabel, distance, key]);
  idsRef.current = ids;

  // --- carve commit / clear ---------------------------------------------------------
  const onSelectionCommit = useCallback(
    (insideIds: string[], op: 'isolate' | 'cut') => {
      setPaletteFilters?.({ keptIds: carveIds(idsRef.current, insideIds, op) });
    },
    [setPaletteFilters],
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
    setHeroPick({
      mode: 'picker',
      key: e.id,
      payload: { config: entryToGradientConfig(e), name: e.name, source: 'Picker' },
    });
  }, []);
  // Drag a swatch out of the wall to drop it into the Favients shelf.
  const onEntryDragStart = useCallback((e: CatalogEntry, dt: DataTransfer) => {
    const payload = { config: entryToGradientConfig(e), name: e.name, source: 'Picker' };
    setFavientDrag(dt, payload);
    beginCustomAvatarDrag(dt); // register the drag + suppress the native image (avatar stands in)
    // Drag mirrors click — picking the dragged swatch gives the avatar its ramp and
    // leaves it the in-hand pick if dropped over nothing.
    setHeroDrag({ mode: 'picker', key: e.id, payload });
  }, []);

  return {
    loaded,
    total: catalog.length,
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
    swatchW: Math.round(pf?.swatchSize?.x ?? 32),
    swatchH: Math.round(pf?.swatchSize?.y ?? 18),
    gap: Math.max(0, Math.round(pf?.paddingSize ?? 0)),
    sliceState: pf,
    setPaletteFilters,
  };
};
