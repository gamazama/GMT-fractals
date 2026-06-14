/**
 * PickerStage — the Picker mode's centre stage. Loads the baked 11k gradient library
 * (pickerStore; presets fallback), reads the Picker dock controls from the
 * paletteFilters slice, and renders the carved catalog as GROUPED rows in the wall.
 *
 * Group and Sort are INDEPENDENT: rows are partitioned by the Group axis (Category /
 * Source / none) and each group is sorted within by the Sort axis (column-major in the
 * wall) — so grouping never blocks in-category sorting.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { usePickerStore } from '../palette/store/pickerStore';
import { passesFilters, type FilterWindows } from '../palette/core/facets';
import { entryToGradientConfig } from '../palette/core/gradientSeam';
import { GROUP_BY, ROWS_BY, SORT_BY } from '../palette/features/paletteFilters';
import type { CatalogEntry } from '../palette/core/presetCatalog';
import { bufferToRamp } from '../palette/core/stopFit';
import { PickerWall, type PickerGroup, type SelectionTool } from '../palette/components/PickerWall';
import { CanonicalHero } from '../palette/components/CanonicalHero';
import { HeroSlot } from '../palette/components/HeroSlot';
import { FavientsIcon, FAVIENTS_ACCENT } from '../palette/components/FavientsIcon';
import { openFavientsPanel } from '../palette/store/favientsPanelPersist';
import { setFavientDrag, beginCustomAvatarDrag } from '../palette/core/favientDnd';
import { usePickerSearch, setPickerSearch } from '../palette/store/pickerSearch';
import {
  useHeroPick,
  useActiveHeroMode,
  useActiveHeroSelection,
  useHeroOptionsOpen,
  setHeroPick,
  setHeroDrag,
  deselectActiveHero,
} from '../palette/store/heroSelection';
import { useHeroHeight } from '../palette/store/heroPrefs';

const win = (v: { x?: number; y?: number } | undefined): [number, number] => [v?.x ?? 0, v?.y ?? 1];

/** Magnifier glyph for the catalog search affordance (shared with the mobile controls). */
export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M11 11l3.6 3.6" strokeLinecap="round" />
  </svg>
);

const sortValue = (axis: string, e: CatalogEntry): number | string => {
  switch (axis) {
    case 'lightness': return e.facets.lightness;
    case 'vividness': return e.facets.chroma;
    case 'complexity': return e.facets.complexity;
    case 'rainbow': return e.facets.rainbow;
    case 'warmth': return e.facets.warmth;
    case 'hue': return e.facets.raw.meanHue;
    case 'name': return e.name.toLowerCase();
    default: return 0;
  }
};

// Facet axes usable for the "Rows by" bucketing (Y). Category/Source handled separately.
const FACET_OF: Record<string, (e: CatalogEntry) => number> = {
  lightness: (e) => e.facets.lightness,
  vividness: (e) => e.facets.chroma,
  complexity: (e) => e.facets.complexity,
  rainbow: (e) => e.facets.rainbow,
  warmth: (e) => e.facets.warmth,
  hue: (e) => e.facets.raw.meanHue / 360, // 0..1 for bucketing
};
const ROW_BUCKETS = 10;

export const PickerStage: React.FC<{ hideFavientsLink?: boolean }> = ({ hideFavientsLink }) => {
  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;
  const setPaletteFilters = useEngineStore(
    (s) => (s as Record<string, any>).setPaletteFilters as ((u: Record<string, unknown>) => void) | undefined,
  );

  const catalog = usePickerStore((s) => s.catalog);
  const loaded = usePickerStore((s) => s.loaded);
  const bundles = usePickerStore((s) => s.bundles);
  const load = usePickerStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  // The Picker's OWN pick lives in the per-surface heroSelection store (not local state) so
  // it survives the desktop↔mobile remount, is independent of Favients (selecting a
  // favourite never touches it), and drives the shared dock. Derive the entry from the catalog.
  const pickerPick = useHeroPick('picker');
  const selected = useMemo(
    () => (pickerPick ? catalog.find((e) => e.id === pickerPick.key) ?? null : null),
    [pickerPick, catalog],
  );
  // The HERO shows `selected` (the persistent pick — never blanks). The WALL enlarge only
  // shows while the Picker is the ACTIVE surface, so deselect (empty-wall/Esc) clears the
  // wall highlight while the hero keeps showing the gradient.
  const pickerActive = useActiveHeroMode() === 'picker';
  // A gradient is in hand following the cursor (click-through) → suppress the wall's
  // hover-zoom preview so it doesn't fight the floating avatar. `optionsOpen` is set ONLY by
  // the click path (setHeroPick), never by a drag (setHeroDrag), so this already means
  // "picked && !dragging" — no drag check needed. (Any surface's pick floats over the wall,
  // so this isn't gated to the Picker.)
  const optionsOpen = useHeroOptionsOpen();
  const activeSel = useActiveHeroSelection();
  const gradientInHand = optionsOpen && activeSel != null;

  // Free-text catalog search (transient, session-only — see pickerSearch). `searchOpen`
  // is purely the hero affordance's expanded/collapsed UI; the query itself is shared
  // with the mobile Picker controls via the store.
  const search = usePickerSearch();
  const [searchOpen, setSearchOpen] = useState(false);

  // Spatial-selection carve: the active wall tool + the surviving id-set (transient).
  const [tool, setTool] = useState<SelectionTool | null>(null);
  const keptIds: string[] | null = pf?.keptIds ?? null;
  // Live mirror of the currently-displayed ids, so a "cut" carve can drop the selected
  // ones from the WHOLE displayed wall (not just the on-screen swatches the wall sees).
  const idsRef = useRef<string[]>([]);
  const wallHostRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Wall view zoom (reported up from PickerWall for the header readout) + a reset signal.
  const [wallZoom, setWallZoom] = useState({ x: 1, y: 1 });
  const [resetZoomSignal, setResetZoomSignal] = useState(0);
  const zoomed = wallZoom.x !== 1 || wallZoom.y !== 1;

  // One-time gesture-discovery hint in the hero: middle-drag to zoom → right-drag to pan →
  // middle-click to reset, then hide forever (persisted).
  const [hintPhase, setHintPhase] = useState<'zoom' | 'pan' | 'reset' | 'done'>(() => {
    try { const v = localStorage.getItem('gx.picker.gestureHint'); return v === 'pan' || v === 'reset' || v === 'done' ? v : 'zoom'; } catch { return 'zoom'; }
  });
  const advanceHint = useCallback((type: 'zoom' | 'pan' | 'reset') => {
    setHintPhase((p) => {
      const next =
        p === 'zoom' && type === 'zoom' ? 'pan'
        : p === 'pan' && type === 'pan' ? 'reset'
        : p === 'reset' && type === 'reset' ? 'done'
        : p;
      if (next !== p) { try { localStorage.setItem('gx.picker.gestureHint', next); } catch { /* ignore */ } }
      return next;
    });
  }, []);
  // The selected gradient as a GMT config (for the CanonicalHero's favourite star + dock
  // payload; presets carry stops, loaded entries are ramp-only → fitted via the seam).
  const favConfig = useMemo(() => (selected ? entryToGradientConfig(selected) : null), [selected]);
  // The hero renders the entry's EXACT 256-step ramp (byte→RGB via the shared bufferToRamp),
  // so it matches the wall swatch pixel-for-pixel rather than the fitted-stops re-render of favConfig.
  const heroRamp = useMemo(() => (selected ? bufferToRamp(selected.ramp) : undefined), [selected]);
  // Pick → SELECT it (drives the hero preview + the bin dock). The standalone studio
  // has no fractal to colour, so the old no-op applyEntryToColoring is dropped (locked
  // decision 4); destinations are the dock bins.
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

  // Per-entry lowercased search haystack = name + theme + bundle LABEL (not the synthetic
  // preset-N/adhoc-N id, not the bundle id). Precomputed once per catalog so each keystroke
  // is a cheap token.includes over a ready string rather than 11k re-concatenations.
  const searchIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of catalog) {
      const label = e.bundle ? bundles[e.bundle]?.label : undefined;
      m.set(e.id, `${e.name} ${e.theme ?? ''} ${label ?? ''}`.toLowerCase());
    }
    return m;
  }, [catalog, bundles]);

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

  const windows: FilterWindows = {
    qL: win(pf?.qL), qC: win(pf?.qC), qCov: win(pf?.qCov), qRb: win(pf?.qRb), qWarm: win(pf?.qWarm),
  };
  const activeThemes: string[] = pf?.activeThemes ?? [];
  const hiddenBundles: string[] = pf?.hiddenBundles ?? [];
  const groupAxis = GROUP_BY[pf?.groupBy ?? 0] ?? 'none';
  const rowsAxis = ROWS_BY[pf?.rowsBy ?? 0] ?? 'none';
  const sortAxis = SORT_BY[pf?.sortBy ?? 0] ?? 'lightness';
  const reverse = !!pf?.reverse;

  const q = search.trim().toLowerCase();
  const key = JSON.stringify([windows, activeThemes, hiddenBundles, groupAxis, rowsAxis, sortAxis, reverse, keptIds, q]);
  const { groups, count, ids } = useMemo(() => {
    const themeSet = activeThemes.length ? new Set(activeThemes) : null;
    const hiddenSet = new Set(hiddenBundles);
    const kept = keptIds ? new Set(keptIds) : null;
    const tokens = q ? q.split(/\s+/).filter(Boolean) : null;
    const list = catalog.filter(
      (e) =>
        // Token-AND search (cheapest rejecter first) over name · theme · source label.
        (!tokens || tokens.every((t) => (searchIndex.get(e.id) ?? '').includes(t))) &&
        (!hiddenSet.size || !e.bundle || !hiddenSet.has(e.bundle)) &&
        (!themeSet || (e.theme != null && themeSet.has(e.theme))) &&
        (!kept || kept.has(e.id)) &&
        passesFilters(e.facets, windows),
    );

    const cmp = (a: CatalogEntry, b: CatalogEntry) => {
      const sa = sortValue(sortAxis, a), sb = sortValue(sortAxis, b);
      if (typeof sa === 'string' && typeof sb === 'string') return sa.localeCompare(sb);
      return (sa as number) - (sb as number);
    };
    const finish = (arr: CatalogEntry[]) => { arr.sort(cmp); if (reverse) arr.reverse(); return arr; };

    // Within one (optional) category group, bucket into facet sub-rows. The category
    // label shows once (first sub-row); each sub-row carries its bucket sublabel.
    const buildBands = (entries: CatalogEntry[], catLabel: string, catKey: string): PickerGroup[] => {
      const fv = FACET_OF[rowsAxis];
      if (!fv) return [{ key: catKey, label: catLabel, entries: finish(entries) }];
      const map = new Map<number, CatalogEntry[]>();
      for (const e of entries) {
        const b = Math.min(ROW_BUCKETS - 1, Math.max(0, Math.floor(fv(e) * ROW_BUCKETS)));
        (map.get(b) ?? map.set(b, []).get(b)!).push(e);
      }
      const order = [...map.keys()].sort((a, b) => b - a); // most on top
      // Category header carries the bucketing axis, e.g. "kaleidoscope (lightness)".
      const header = catLabel ? `${catLabel} (${rowsAxis})` : '';
      return order.map((b, i) => {
        const lo = b / ROW_BUCKETS, hi = (b + 1) / ROW_BUCKETS;
        return {
          key: `${catKey}-b${b}`,
          cat: catKey, // adjacent buckets in the same category may merge into one row
          lo, hi, // numeric bounds so the wall can union ranges when merging
          label: i === 0 ? header : '',
          // Range only — count is appended in the gutter as "0.8–0.9 (23)" (one line).
          sublabel: `${lo.toFixed(1)}–${hi.toFixed(1)}`,
          entries: finish(map.get(b)!),
        };
      });
    };

    let result: PickerGroup[];
    if (groupAxis === 'theme' || groupAxis === 'bundle') {
      const map = new Map<string, CatalogEntry[]>();
      for (const e of list) {
        const k = (groupAxis === 'theme' ? e.theme : e.bundle) ?? '—';
        (map.get(k) ?? map.set(k, []).get(k)!).push(e);
      }
      const order = [...map.keys()].sort((a, b) => map.get(b)!.length - map.get(a)!.length);
      result = order.flatMap((k) => buildBands(map.get(k)!, groupAxis === 'bundle' ? (bundles[k]?.label ?? k) : k, k));
    } else {
      result = buildBands(list, '', 'all');
    }
    return { groups: result, count: list.length, ids: list.map((e) => e.id) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, key]);
  idsRef.current = ids;

  // --- carve commit / clear / cancel ------------------------------------------------
  const onSelectionCommit = useCallback(
    (insideIds: string[], op: 'isolate' | 'cut') => {
      if (!setPaletteFilters) return;
      if (op === 'isolate') {
        setPaletteFilters({ keptIds: insideIds });
      } else {
        const drop = new Set(insideIds);
        setPaletteFilters({ keptIds: idsRef.current.filter((id) => !drop.has(id)) });
      }
    },
    [setPaletteFilters],
  );
  const clearCarve = useCallback(() => setPaletteFilters?.({ keptIds: null }), [setPaletteFilters]);
  // The unified "clear" in the count readout: reset every active narrower at once
  // (transient search + carve, plus the DDFS quality windows / theme / source toggles)
  // so "why is my wall small?" has one button as well as one answer.
  const clearAll = useCallback(() => {
    setPickerSearch('');
    setPaletteFilters?.({
      keptIds: null, activeThemes: [], hiddenBundles: [],
      qL: { x: 0, y: 1 }, qC: { x: 0, y: 1 }, qCov: { x: 0, y: 1 }, qRb: { x: 0, y: 1 }, qWarm: { x: 0, y: 1 },
    });
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

  const swatchW = Math.round(pf?.swatchSize?.x ?? 32);
  const swatchH = Math.round(pf?.swatchSize?.y ?? 18);
  const gap = Math.max(0, Math.round(pf?.paddingSize ?? 0));
  // Match the deselected placeholder to the hero's footprint so deselect doesn't jump.
  const heroH = useHeroHeight();

  // Self-explaining active-filter readout: which narrowers are shrinking the wall right
  // now. Surfaces carve on mobile too (the carve chip is desktop-only), so a small wall
  // always has one visible answer regardless of viewport.
  const qualityActive = [windows.qL, windows.qC, windows.qCov, windows.qRb, windows.qWarm]
    .some((w) => !!w && (w[0] > 0 || w[1] < 1));
  const narrowers: string[] = [];
  if (q) narrowers.push('search');
  if (keptIds) narrowers.push('carved');
  if (qualityActive) narrowers.push('quality');
  if (activeThemes.length) narrowers.push('themes');
  if (hiddenBundles.length) narrowers.push('sources');

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-zinc-950">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800 shrink-0">
        {/* HeroSlot: inline on desktop; on mobile it portals into the dedicated hero rail
            so the current pick stays visible while the wall + controls scroll. */}
        <HeroSlot>
          {selected && favConfig ? (
            // The shared hero: the entry's pixel-exact ramp as a select/drag source — click
            // to bring up destinations, drag onto a target. selectionKey = the catalog id so
            // the hero + the wall's selectedId share one key.
            <CanonicalHero
              config={favConfig}
              ramp={heroRamp}
              name={selected.name}
              source="Picker"
              mode="picker"
              selectionKey={selected.id}
            />
          ) : (
            // Mirror the hero's footprint (a header row + a strip of the shared height) so
            // deselecting (empty-wall click / Esc) doesn't jump the layout.
            <div>
              <div className="flex items-center mb-1 h-[19px]">
                <span className="text-[10px] text-zinc-600">No gradient picked</span>
              </div>
              <div
                className="w-full rounded-md border border-dashed border-zinc-700/70 bg-zinc-900/40 flex items-center justify-center"
                style={{ height: heroH }}
              >
                <span className="text-[10px] text-zinc-600">Click a swatch below to preview it here</span>
              </div>
            </div>
          )}
        </HeroSlot>
        <div className="mt-1.5 flex items-center justify-between text-[11px] gap-2">
          {/* The ★ + name now live in the hero above; this row keeps the bundle provenance
              (when picked) on the left and the search/count/hint controls on the right. */}
          <span className="flex items-center gap-2 min-w-0">
            {selected?.bundle && <span className="text-[10px] text-zinc-600 truncate">{selected.bundle}</span>}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {hintPhase !== 'done' && (
              <span className="hidden md:inline-flex items-center text-[10px] text-cyan-300/80 bg-cyan-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                {hintPhase === 'zoom' ? 'Middle-drag to zoom' : hintPhase === 'pan' ? 'Right-drag to pan' : 'Middle-click to reset zoom'}
              </span>
            )}
            {/* Favients link + inline search are desktop-only: on a phone the Favients TAB
                and the full-width search in MobilePickerControls are the canonical paths, so
                these would be duplicate affordances stacked a few hundred px apart. */}
            {!hideFavientsLink && (
              <button onClick={openFavientsPanel} title="Open the Favients shelf" className={`hidden md:inline-flex ${FAVIENTS_ACCENT.link}`}>
                <FavientsIcon /> Favients
              </button>
            )}
            {/* Free-text search over name · theme · source — a collapsed icon that
                expands to one inline input (stays expanded while a query is active). */}
            <span className="hidden md:inline-flex items-center">
              {searchOpen || search ? (
                <span className="inline-flex items-center gap-1 h-[22px] rounded border border-zinc-700 bg-zinc-900 pl-1.5 pr-1">
                  <SearchIcon className="w-3 h-3 text-zinc-500 shrink-0" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setPickerSearch(''); setSearchOpen(false); (e.target as HTMLInputElement).blur(); }
                    }}
                    placeholder="name · theme · source"
                    className="w-28 md:w-32 bg-transparent outline-none text-[11px] text-zinc-200 placeholder-zinc-600"
                  />
                  <button
                    onClick={() => { setPickerSearch(''); setSearchOpen(false); }}
                    title={search ? 'Clear search' : 'Close search'}
                    className="px-0.5 text-zinc-500 hover:text-zinc-200"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  title="Search the catalog by name, theme, or source"
                  className="p-0.5 text-zinc-500 hover:text-zinc-200"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span className="text-zinc-500 tabular-nums">
              {!loaded ? 'loading…' : (
                <>
                  {count} of {catalog.length}
                  {narrowers.length > 0 && (
                    <>
                      {' — '}
                      <span className="text-zinc-400">{narrowers.join(' · ')}</span>
                      {' · '}
                      <button onClick={clearAll} className="text-cyan-300 hover:text-cyan-200 underline" title="Clear every active filter (search, carve, quality, themes, sources)">
                        clear
                      </button>
                    </>
                  )}
                </>
              )}
            </span>
          </span>
        </div>

        {/* Spatial selection tools — carve the wall by drawing a region, then click inside
            (isolate) or outside (cut). Desktop affordance (pointer-driven). */}
        <div ref={toolbarRef} className="mt-1.5 hidden md:flex items-center gap-1.5 text-[11px]">
          <span className="text-zinc-600">Select</span>
          {(['rect', 'lasso', 'paint'] as const).map((t) => {
            const on = tool === t;
            const label = t === 'rect' ? 'Rect' : t === 'lasso' ? 'Lasso' : 'Paint';
            return (
              <button
                key={t}
                onClick={() => setTool((p) => (p === t ? null : t))}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  on ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {label}
              </button>
            );
          })}
          {keptIds && (
            <button
              onClick={clearCarve}
              className="px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
              title="Clear the selection filter and show the full wall"
            >
              ▣ {keptIds.length} kept · clear
            </button>
          )}
          {tool && (
            <span className="text-zinc-500">
              drag to select · click <span className="text-zinc-300">inside</span> isolates ·{' '}
              <span className="text-zinc-300">outside</span> cuts
              {tool === 'paint' && <span className="text-zinc-600"> · Shift add · Ctrl erase · [ ] size</span>}
              <span className="text-zinc-600"> · Esc cancels</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-zinc-500 tabular-nums" title="Wall zoom (×horizontal · ×vertical)">
              zoom {wallZoom.x.toFixed(1)}×{wallZoom.y.toFixed(1)}
            </span>
            {zoomed && (
              <button
                onClick={() => setResetZoomSignal((n) => n + 1)}
                className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                title="Reset zoom to 1:1 (or middle-click the wall)"
              >
                reset
              </button>
            )}
          </span>
        </div>
      </div>

      {/* data-gx-keepselect: the wall manages its own clicks (swatch → pick, empty → deselect
          via PickerWall.onDeselect), so the global click-away handler skips it — otherwise
          every swatch pick would close-then-reopen the dock (a flicker). */}
      <div ref={wallHostRef} data-gx-keepselect="" className="flex-1 min-h-0 relative">
        {!loaded ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-600">Loading gradient library…</div>
        ) : count > 0 ? (
          <PickerWall
            groups={groups}
            sprite={sprite}
            onPick={onPick}
            onEntryDragStart={onEntryDragStart}
            selectedId={pickerActive ? selected?.id : undefined}
            swatchW={swatchW}
            swatchH={swatchH}
            gap={gap}
            onGesture={advanceHint}
            onZoomChange={setWallZoom}
            resetZoomSignal={resetZoomSignal}
            selectionTool={tool}
            onSelectionCommit={onSelectionCommit}
            onSelectionCancel={() => setTool(null)}
            onDeselect={deselectActiveHero}
            inHand={gradientInHand}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-zinc-400 px-6 text-center">
            {search.trim() ? (
              <span>
                No gradients match “{search.trim()}”{keptIds ? ' in the current carve' : ''} —{' '}
                <button onClick={() => setPickerSearch('')} className="text-cyan-300 underline">clear search</button>
                {keptIds && <> · <button onClick={clearCarve} className="text-cyan-300 underline">clear carve</button></>}.
              </span>
            ) : keptIds ? (
              <span>
                No gradients in the current carve — <button onClick={clearCarve} className="text-cyan-300 underline">clear the selection filter</button>.
              </span>
            ) : (
              'No gradients match — widen the Quality Filters or clear theme/source toggles.'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PickerStage;
