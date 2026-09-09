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
 * (`useGroundSetId` → `useGroundSource`). On the catalogue (All) everything above applies.
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
 * A tile's right-click on a bin or a group offers Remove from My Gradients (one undo step).
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
import { Act } from './ui/Act';
import { useGroundSetId, setGroundSetId } from '../../palette/store/groundSet';
import { useGroundSets, useGroundSource } from './useGroundSource';
import { groupSetId } from '../../palette/core/groundSets';
import { newGroupId, useFavientsStore } from '../../palette/store/favientsStore';
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
  { id: 'rect', glyph: 'box' as const, label: 'Box', title: 'Box select, then keep or cut' },
  { id: 'lasso', glyph: 'lasso' as const, label: 'Lasso', title: 'Draw a free shape, then keep or cut' },
  { id: 'paint', glyph: 'brush' as const, label: 'Paint', title: 'Paint over the ones you want — [ ] resize' },
] as const;
type ToolId = (typeof TOOLS)[number]['id'];

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
  const setId = useGroundSetId();
  const sets = useGroundSets();
  const source = useGroundSource(setId, sets);
  const m = usePickerModel({ source });
  const setDesc = sets.find((s) => s.id === m.setId) ?? null;
  // The pad follows the Arrange state (owner, 2026-09-08): rows on its Y, sort on its X when
  // they are colour axes, the third on the strip — so the pad is the wall's map for any
  // arrangement it can paint (`palette/core/padAxes.ts`; the harness pins the table).
  const pad = useMemo(() => padAxesFor(m.axes.rowsAxis, m.axes.sortAxis), [m.axes.rowsAxis, m.axes.sortAxis]);
  // Nothing picked yet — the hero is absent (L8) and the bar says what to do (see below).
  const nothingPicked = useWorkingDerived().empty;

  // The pad as the wall's map (D.2): which bands are on screen → a lightness range.
  // The wall reports its bands AS DRAWN (merged small buckets carry the unioned range and
  // their own key), so the marker and the seek work on that, not on the model's rows.
  const [wallView, setWallView] = useState<{ bands: WallBand[]; view: WallView }>({ bands: [], view: { scrollTop: 0, height: 0, scrollHeight: 0 } });
  const [scrollTo, setScrollTo] = useState<{ key?: string; frac?: number; seq: number } | null>(null);
  const onAll = !m.isSet && !m.anchor;
  // The bands are on the pad's Y: the LENS shows the axis range on screen, continuous —
  // within a band (its high value at the top) the visible slice maps linearly onto the
  // band's bucket.
  const bandsByLight = onAll && pad.rowsOnY;
  const lens = useMemo<[number, number] | null>(() => {
    if (!bandsByLight || !wallView.view.height) return null;
    const H = wallView.view.height;
    let lo = 1, hi = 0;
    for (const b of wallView.bands) {
      if (b.lo == null || b.hi == null) continue;
      const h = b.bottom - b.top;
      if (h <= 0) continue;
      const vt = Math.max(b.top, 0), vb = Math.min(b.bottom, H);
      if (vb <= vt) continue;
      const fTop = (vt - b.top) / h, fBot = (vb - b.top) / h;
      lo = Math.min(lo, b.hi - fBot * (b.hi - b.lo));
      hi = Math.max(hi, b.hi - fTop * (b.hi - b.lo));
    }
    return hi > lo ? [lo, hi] : null;
  }, [bandsByLight, wallView]);
  // The scrollbar beside the pad always says where the wall is (owner, 2026-09-08: "rather
  // than no lens, default to the standard display"): the lens range when the bands are on
  // the pad's Y, else the plain scroll position — a scrollbar, which is always true.
  const marker = useMemo<[number, number] | null>(() => {
    if (lens) return lens;
    const { scrollTop, height, scrollHeight } = wallView.view;
    if (!onAll || !height || scrollHeight <= height + 1) return null;
    return [1 - Math.min(1, (scrollTop + height) / scrollHeight), 1 - scrollTop / scrollHeight];
  }, [lens, onAll, wallView.view]);
  // The part of the pad's Y axis the wall can reach — the bands that exist. Outside it the
  // scrollbar's track dims (owner: "the section that is not reachable at 50% the opacity").
  const reach = useMemo<[number, number] | null>(() => {
    if (!bandsByLight) return null;
    let lo = 1, hi = 0;
    for (const b of wallView.bands) if (b.lo != null && b.hi != null) { lo = Math.min(lo, b.lo); hi = Math.max(hi, b.hi); }
    return hi > lo ? [lo, hi] : null;
  }, [bandsByLight, wallView.bands]);
  const canSeek = onAll && (!bandsByLight || m.axes.groupAxis === 'none');
  // Put value L at the top of the viewport: the band holding it and how far down it, or —
  // with no bands on the pad — the plain fraction of the wall.
  const seekBand = useCallback((L: number) => {
    if (!bandsByLight) {
      setScrollTo((s) => ({ frac: 1 - L, seq: (s?.seq ?? 0) + 1 }));
      return;
    }
    const bands = wallView.bands.filter((b) => b.lo != null && b.hi != null);
    if (!bands.length) return;
    const band = bands.find((b) => L >= b.lo! && L <= b.hi!) ?? bands.reduce((best, b) => (Math.abs((b.lo! + b.hi!) / 2 - L) < Math.abs((best.lo! + best.hi!) / 2 - L) ? b : best));
    const frac = Math.min(1, Math.max(0, (band.hi! - L) / Math.max(1e-6, band.hi! - band.lo!)));
    setScrollTo((s) => ({ key: band.key, frac, seq: (s?.seq ?? 0) + 1 }));
  }, [bandsByLight, wallView.bands]);
  // A set has no carve tools: drop an active one when the ground switches to a set.
  useEffect(() => {
    if (m.isSet && m.tool) m.setTool(null);
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
  // A tile's right-click menu on a bin or a group: removing the favourite (one undo step).
  // None on the catalogue.
  const onTileMenu = useMemo(() => {
    if (!source) return undefined;
    return (entry: CatalogEntry, e: React.MouseEvent) => {
      openContextMenu(e.clientX, e.clientY, [
        { label: 'Remove from My Gradients', danger: true, action: () => paramEdit(() => useFavientsStore.getState().remove(entry.id)) },
      ]);
    };
  }, [source, openContextMenu]);
  const win = (k: string): [number, number] => {
    const o = m.sliceState?.[k] as { x?: number; y?: number } | undefined;
    return [o?.x ?? 0, o?.y ?? 1];
  };
  const xWin = win(WINDOW_KEY[pad.x]);
  const yWin = win(WINDOW_KEY[pad.y]);
  const sWin = win(WINDOW_KEY[pad.strip]);
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
      <div className="shrink-0 relative px-6 pt-3 pb-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3" data-gx-ground-set={m.setId}>
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
        {m.isSet ? (
          /* a set on the ground: its name where the pad was — the pad and Filters are the
             catalogue's lens (their windows, themes and carve ids mean nothing here) */
          <div className="flex items-baseline gap-2 justify-self-center h-[56px] items-center" data-gx-set-title="">
            <span className="text-[15px] text-fg">{setDesc?.label ?? m.setId}</span>
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
              Click a gradient to start · click it again to keep and edit it
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
            marker={lens}
          />
          <MapScrollbar range={marker} reach={reach} height={56} onSeek={canSeek ? seekBand : undefined} />
          </div>
          {/* the third coordinate as a strip, in a picker's own language, under the field */}
          <div data-gx-pad-strip={pad.strip}>
            <QualityRangePadConnected key={stripDef.axis} featureId="paletteFilters" sliceState={m.sliceState} actions={actions} {...stripDef} hints="tooltip" keyframes={false} variant="strip" height={12} drawTrack={stripTrack} />
          </div>
        </div>
        )}
        <div className="flex items-center justify-end gap-3 min-w-0">
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
        {!m.isSet && (
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
            placeholder={m.isSet ? `Search ${setDesc?.label ?? 'this set'}` : m.loaded ? `Search ${m.total.toLocaleString()} gradients` : 'Loading gradients…'}
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
        <div className="shrink-0 px-6 pb-2.5 flex flex-col gap-2 border-b border-line/10" data-gx-selectable="">
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
            gutter={m.isSet ? 0 : undefined}
            onViewport={onAll ? (bands, view) => setWallView({ bands, view }) : undefined}
            scrollToGroup={scrollTo}
            onEntryContextMenu={onTileMenu}
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

        {/* floating tool palette */}
        <Floating ref={m.toolbarRef} className={`absolute top-2.5 right-4 flex gap-0.5 p-[3px] ${floatOver}`}>
          {TOOLS.filter((t) => !m.isSet || t.id === 'zoom').map((t) => {
            const on = activeTool === t.id;
            return (
              <button
                key={t.label}
                onClick={() => pickTool(t.id)}
                title={t.title}
                aria-label={t.label}
                aria-pressed={on}
                className={`w-8 h-8 rounded-lg text-[15px] transition-colors ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-white/5'}`}
              >
                <Icon name={t.glyph} />
              </button>
            );
          })}
        </Floating>

        {/* one-line caption while the zoom tool is active */}
        {zoomTool && !m.tool && (
          <Floating className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 text-[12px] text-fg-secondary ${floatOver}`}>
            drag to zoom · right-drag pans · Fit resets · click the tool again to stop
          </Floating>
        )}
        {/* one-line caption, only while a carve tool is active */}
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
    </div>
  );
};

export default BrowseStage;
