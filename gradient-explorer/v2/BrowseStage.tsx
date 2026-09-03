/**
 * BrowseStage — the v2 Browse surface (plans/ge-v2-design.md §5.2, mock B).
 *
 * The wall as a CANVAS: full-bleed swatches on a faint dotted ground, a floating tool
 * palette top-right (Hand · Rect · Lasso · Paint), a zoom readout with Fit bottom-right,
 * row labels down the left edge (the wall's own gutter), and a caption that appears only
 * while a carve tool is drawing.
 *
 * Narrowing is ONE control: a search field carrying the live match count, and a Filters
 * button whose badge counts the active narrowers (search excluded — it has its own field).
 * Everything else — themes, the five look ranges, sources, the count with its single
 * clear-all, and the Arrange sentence — lives in the popover under that button. Nothing
 * narrows the wall from anywhere else.
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
import { PickerThemeChips, PickerBundleToggles } from '../../palette/components/PickerControls';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { AnchoredMenu } from '../../components/ui';

const TOOLS = [
  { id: null, glyph: '✋', label: 'Hand', title: 'Pan and zoom — right-drag pans, middle-drag zooms' },
  { id: 'rect', glyph: '▭', label: 'Box', title: 'Box select, then keep or cut' },
  { id: 'lasso', glyph: '◌', label: 'Lasso', title: 'Draw a free shape, then keep or cut' },
  { id: 'paint', glyph: '✎', label: 'Paint', title: 'Paint over the ones you want — [ ] resize' },
] as const;

/** Faint dotted ground behind the swatches, so the wall reads as a canvas, not a list. */
const GROUND: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
};

const pill = 'bg-surface-dock/90 border border-line/20 rounded-lg backdrop-blur-sm';

export const BrowseStage: React.FC = () => {
  const m = usePickerModel();
  /** Viewport anchor for the popover (the button's bottom-left), or null = closed. */
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeFilters = useCallback(() => setAnchor(null), []);

  const toggleFilters = useCallback(() => {
    setAnchor((a) => {
      if (a) return null;
      const r = btnRef.current?.getBoundingClientRect();
      return r ? { x: r.left, y: r.bottom + 6 } : { x: 24, y: 96 };
    });
  }, []);

  // AnchoredMenu's own Escape goes through the scope-aware shortcut registry, which does
  // not stop the shell's plain window keydown — so Esc would ALSO dismiss the candidate.
  // Take Escape here instead, in the capture phase, and stop it from travelling further.
  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closeFilters();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [anchor, closeFilters]);

  // PickerThemeChips / PickerBundleToggles are DDFS custom-UI components: they read
  // `sliceState` and call `actions['set' + capitalised featureId]`. Mounting them here
  // rather than through AutoFeaturePanel is deliberate — they carry their own section
  // headers and need no param chrome, and the popover wants Themes ABOVE Look, which the
  // feature's `sources` group cannot express. The two groups that DO render fine as-is
  // (the look ranges, the arrange params) go through AutoFeaturePanel below.
  const actions = useMemo(() => ({ setPaletteFilters: m.setPaletteFilters }), [m.setPaletteFilters]);

  const zoomPct = m.zoom.x === m.zoom.y
    ? `${Math.round(m.zoom.x * 100)}%`
    : `${m.zoom.x.toFixed(1)}× ${m.zoom.y.toFixed(1)}×`;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── one narrowing row ─────────────────────────────────────────────── */}
      <div className="shrink-0 relative px-6 pb-2.5 flex items-center gap-2">
        <div className="flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-line/20 bg-surface-dock w-[320px] max-w-full">
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
            <span className="text-[12px] text-fg-dim tabular-nums whitespace-nowrap">{m.count.toLocaleString()} match</span>
          )}
        </div>

        <button
          ref={btnRef}
          data-gx-filters-trigger=""
          onClick={toggleFilters}
          className={`h-[34px] px-3 rounded-[10px] border text-[13px] flex items-center gap-2 transition-colors ${
            anchor ? 'border-accent-400 text-accent-300 bg-accent-400/10' : 'border-line/20 text-fg-muted hover:text-fg hover:border-line/40'
          }`}
          title="Themes, look, sources and how the wall is arranged"
        >
          Filters
          <span
            className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-center tabular-nums ${
              m.filterCount ? 'bg-accent-400 text-black font-semibold' : 'bg-white/10 text-fg-dim'
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

        {/* ── the Filters popover ─────────────────────────────────────────── */}
        {/* AnchoredMenu = the sanctioned floating primitive: portaled (so nothing in the
            shell can trap it), viewport-clamped, capture-phase outside-dismiss. The
            trigger is outside its ref, hence `ignore`. */}
        {anchor && (
          <AnchoredMenu
            anchor={anchor}
            onClose={closeFilters}
            dismissOnEscape={false}
            ignore="[data-gx-filters-trigger]"
            className="w-[440px] max-w-[calc(100vw-16px)] max-h-[70vh] overflow-y-auto custom-scroll bg-surface-dock border border-line/20 rounded-xl shadow-2xl"
          >
          <div data-gx-selectable="">
            <PickerThemeChips featureId="paletteFilters" sliceState={m.sliceState} actions={actions} />

            <div className="border-t border-line/10 pt-1.5">
              <div className="px-2 text-[10px] uppercase tracking-wide text-fg-dim">Look</div>
              <AutoFeaturePanel featureId="paletteFilters" groupFilter="quality" variant="dense" />
            </div>

            <div className="border-t border-line/10">
              <PickerBundleToggles featureId="paletteFilters" sliceState={m.sliceState} actions={actions} />
            </div>

            {/* count · one clear-all · the Arrange sentence */}
            <div className="border-t border-line/10 px-2.5 py-2 flex items-center gap-3 text-[12px]">
              <span className="text-fg-dim tabular-nums">
                {m.loaded ? `${m.count.toLocaleString()} of ${m.total.toLocaleString()}` : 'loading…'}
              </span>
              {(m.narrowers.length > 0 || m.anchor) && (
                <button onClick={m.clearAll} className="text-accent-300 underline hover:text-fg" title="Clear search, look ranges, themes, sources, the carve and the similarity sort">
                  clear all
                </button>
              )}
              <button
                onClick={() => setArrangeOpen((o) => !o)}
                className="ml-auto text-fg-muted hover:text-fg text-right min-w-0 truncate"
                title="How the wall is grouped, banded and sorted"
              >
                {m.arrangeText} {arrangeOpen ? '▴' : '▾'}
              </button>
            </div>
            {arrangeOpen && (
              <div className="border-t border-line/10">
                <AutoFeaturePanel featureId="paletteFilters" groupFilter="arrange" variant="dense" />
              </div>
            )}
          </div>
          </AnchoredMenu>
        )}
      </div>

      {/* ── the wall as a canvas ──────────────────────────────────────────── */}
      {/* data-gx-keepselect: the wall manages its own clicks (swatch → pick, empty →
          deselect), so a global click-away handler must skip it. */}
      <div
        ref={m.wallHostRef}
        data-gx-keepselect=""
        style={GROUND}
        className={`flex-1 min-h-0 relative border-t border-line/10 ${m.tool ? '' : 'cursor-grab'}`}
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
            const on = m.tool === t.id;
            return (
              <button
                key={t.label}
                onClick={() => m.setTool(t.id)}
                title={t.title}
                aria-label={t.label}
                aria-pressed={on}
                className={`w-8 h-8 rounded-lg text-[15px] transition-colors ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg hover:bg-white/5'}`}
              >
                {t.glyph}
              </button>
            );
          })}
        </div>

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
        <div className={`absolute bottom-3 right-4 flex items-center gap-2 px-2.5 py-1 text-[12px] text-fg-dim tabular-nums ${pill}`}>
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
