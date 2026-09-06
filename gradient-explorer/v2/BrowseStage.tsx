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
 * All of the behaviour is `usePickerModel` — the same hook the old `PickerStage` and
 * app-gmt's palette overlay run. This file is layout, wording and chrome. If you need the
 * wall to filter/sort/carve differently, change `palette/core/pickerModel.ts`, not this.
 *
 * @see plans/ge-v2-design.md §5.2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PickerWall } from '../../palette/components/PickerWall';
import { usePickerModel } from '../../palette/components/usePickerModel';
import { PickerBundleToggles } from '../../palette/components/PickerControls';
import { QualityRangePadConnected } from '../../palette/components/QualityRangePadConnected';
import { HueLightnessPad, satTrackFor } from '../../palette/components/HueLightnessPad';
import { QUALITY_AXES } from '../../palette/features/paletteFilters';
import { useStoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { Dropdown } from '../../components/Dropdown';
import { groupByParam, rowsByParam, sortByParam } from '../../palette/features/paletteFilters';

// Owner, 2026-09-06: hue + dark/light are the 2-D pad on the bar; cool/warm is redundant
// with hue and is not rendered in v2. What is left for the popover:
const SAT_AXIS = QUALITY_AXES.find((a) => a.axis === 'qC')!;
const LOOK_AXES = QUALITY_AXES.filter((a) => a.axis === 'qCov' || a.axis === 'qRb');
import type { ParamConfig } from '../../engine/FeatureSystem';

/** DDFS enum options → Dropdown options (index-valued, like the panel's own enum rows). */
const enumOptions = (c: ParamConfig): { value: number; label: string }[] =>
  ((c as { options?: { value: number; label: string }[] }).options ?? []).map((o) => ({ value: o.value, label: o.label }));
import { Icon } from './ui/Icon';

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

const pill = 'bg-surface-dock/90 border border-line/20 rounded-lg backdrop-blur-sm';

export const BrowseStage: React.FC = () => {
  const m = usePickerModel();
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
  const { handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
  const win = (k: string): [number, number] => {
    const o = m.sliceState?.[k] as { x?: number; y?: number } | undefined;
    return [o?.x ?? 0, o?.y ?? 1];
  };
  const hueWin = win('qHue');
  const lightWin = win('qL');
  // The saturation strip is painted toward the picker window's average colour (owner).
  const satTrack = useMemo(() => satTrackFor(hueWin, lightWin) ?? undefined, [hueWin[0], hueWin[1], lightWin[0], lightWin[1]]);

  const zoomPct = m.zoom.x === m.zoom.y
    ? `${Math.round(m.zoom.x * 100)}%`
    : `${m.zoom.x.toFixed(1)}× ${m.zoom.y.toFixed(1)}×`;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── one narrowing row ─────────────────────────────────────────────── */}
      <div className="shrink-0 relative px-6 pb-2.5 flex items-center gap-3">
        {/* The colour picker IS the main narrower (owner): hue × lightness with a box. On the
            bar, never over the wall it narrows. */}
        <div className="flex flex-col gap-1">
          <HueLightnessPad
            hue={hueWin}
            light={lightWin}
            onChange={(h, l) => m.setPaletteFilters?.({ qHue: { x: h[0], y: h[1] }, qL: { x: l[0], y: l[1] } })}
            onDragStart={() => handleInteractionStart('param')}
            onDragEnd={handleInteractionEnd}
            width={220}
            height={56}
          />
          {/* the saturation strip, in a picker's own language, under the field */}
          <QualityRangePadConnected featureId="paletteFilters" sliceState={m.sliceState} actions={actions} {...SAT_AXIS} hints="tooltip" keyframes={false} variant="strip" height={12} drawTrack={satTrack} />
        </div>
        <div className="flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-line/20 bg-surface-dock w-[260px] max-w-full">
          <svg className="w-3.5 h-3.5 shrink-0 text-fg-dim" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3.6 3.6" strokeLinecap="round" />
          </svg>
          <input
            value={m.search}
            onChange={(e) => m.setSearch(e.target.value)}
            placeholder={m.loaded ? `Search ${m.total.toLocaleString()} gradients` : 'Loading gradients…'}
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-fg placeholder-fg-faint"
          />
          {m.search && (
            <button onClick={() => m.setSearch('')} title="Clear search" className="px-1 text-fg-dim hover:text-fg">×</button>
          )}
          {m.loaded && m.count < m.total && (
            <span className="text-[12px] text-fg-muted tabular-nums whitespace-nowrap">{m.count.toLocaleString()} match</span>
          )}
        </div>

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

        {/* More like this — the wall is one band ordered by ramp distance to this gradient. */}
        {m.anchor && (
          <span className="flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-accent-400/40 bg-accent-400/10 text-[12px] text-accent-300 min-w-0">
            <span className="truncate">sorted by similarity to <b className="font-semibold">{m.anchor.name}</b></span>
            <button onClick={() => m.setAnchor(null)} className="underline shrink-0 hover:text-fg">clear</button>
          </span>
        )}
      </div>

      {/* ── Filters: three inline rows, never over the wall ────────────────── */}
      {filtersOpen && (
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
            selectionTool={m.tool}
            onSelectionCommit={m.onSelectionCommit}
            onSelectionCancel={() => m.setTool(null)}
            onDeselect={m.onDeselect}
            inHand={m.gradientInHand}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-fg-muted px-8 text-center">
            {m.search.trim() ? (
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
        <div ref={m.toolbarRef} className={`absolute top-2.5 right-4 flex gap-0.5 p-[3px] ${pill}`}>
          {TOOLS.map((t) => {
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
        </div>

        {/* one-line caption while the zoom tool is active */}
        {zoomTool && !m.tool && (
          <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 text-[12px] text-fg-secondary ${pill}`}>
            drag to zoom · right-drag pans · Fit resets · click the tool again to stop
          </div>
        )}
        {/* one-line caption, only while a carve tool is active */}
        {m.tool && (
          <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 text-[12px] text-fg-secondary ${pill}`}>
            draw around the ones you like, then keep or cut
            {m.keptIds && (
              <>
                {' · '}
                <button onClick={m.clearCarve} className="text-accent-300 underline hover:text-fg">
                  {m.keptIds.length} kept, undo
                </button>
              </>
            )}
          </div>
        )}

        {/* zoom readout + Fit */}
        <div className={`absolute bottom-3 right-4 flex items-center gap-2 px-2.5 py-1 text-[12px] text-fg-muted tabular-nums ${pill}`}>
          <span title="Middle-drag zooms · right-drag pans">{zoomPct}</span>
          <button
            onClick={m.resetZoom}
            disabled={!m.zoomed}
            className={m.zoomed ? 'text-accent-300 hover:text-fg' : 'text-fg-faint cursor-default'}
            title="Back to 1:1 (or middle-click the wall)"
          >
            Fit
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowseStage;
