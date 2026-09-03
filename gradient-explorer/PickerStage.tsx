/**
 * PickerStage — the Picker mode's centre stage, as the OLD shell and app-gmt's palette
 * overlay want it: a CanonicalHero band, an inline search affordance, the count readout,
 * the "Select: Rect / Lasso / Paint" row with the zoom readout, and the wall.
 *
 * The behaviour underneath — catalog load, filtering, grouping, sorting, the carve, the
 * pick — is NOT here. It is `palette/components/usePickerModel.ts` (React/store) over
 * `palette/core/pickerModel.ts` (pure), shared verbatim with the v2 Browse stage
 * (`gradient-explorer/v2/BrowseStage.tsx`). This file is the chrome and nothing else; a
 * second copy of the filtering logic would be the bug, not the feature.
 *
 * Hosts: `gradient-explorer/GradientExplorerApp.tsx` (the old shell) and
 * `app-gmt/PalettePickerOverlay.tsx` (`hideFavientsLink` — that host puts the Favients link
 * in its own modal header).
 *
 * @see plans/ge-v2-design.md §5.2
 */

import React, { useCallback, useState } from 'react';
import { safeLocalGet, safeLocalSet } from '../store/safeLocalStorage';
import { PickerWall } from '../palette/components/PickerWall';
import { usePickerModel } from '../palette/components/usePickerModel';
import { CanonicalHero } from '../palette/components/CanonicalHero';
import { HeroSlot } from '../palette/components/HeroSlot';
import { FavientsIcon, FAVIENTS_ACCENT } from '../palette/components/FavientsIcon';
import { openFavientsPanel } from '../palette/store/favientsPanelPersist';
import { entryToGradientConfig } from '../palette/core/gradientSeam';
import { bufferToRamp } from '../palette/core/stopFit';
import { useHeroHeight } from '../palette/store/heroPrefs';

/** Magnifier glyph for the catalog search affordance (shared with the mobile controls). */
export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M11 11l3.6 3.6" strokeLinecap="round" />
  </svg>
);

export const PickerStage: React.FC<{ hideFavientsLink?: boolean }> = ({ hideFavientsLink }) => {
  const m = usePickerModel();
  const { search, selected, keptIds, tool } = m;

  // `searchOpen` is purely this affordance's expanded/collapsed UI; the query itself is
  // shared with the mobile Picker controls via the pickerSearch store.
  const [searchOpen, setSearchOpen] = useState(false);

  // One-time gesture-discovery hint in the hero: middle-drag to zoom → right-drag to pan →
  // middle-click to reset, then hide forever (persisted). Old-shell chrome; v2 drops it.
  const [hintPhase, setHintPhase] = useState<'zoom' | 'pan' | 'reset' | 'done'>(() => {
    try { const v = safeLocalGet('gx.picker.gestureHint'); return v === 'pan' || v === 'reset' || v === 'done' ? v : 'zoom'; } catch { return 'zoom'; }
  });
  const advanceHint = useCallback((type: 'zoom' | 'pan' | 'reset') => {
    setHintPhase((p) => {
      const next =
        p === 'zoom' && type === 'zoom' ? 'pan'
        : p === 'pan' && type === 'pan' ? 'reset'
        : p === 'reset' && type === 'reset' ? 'done'
        : p;
      if (next !== p) { safeLocalSet('gx.picker.gestureHint', next); }
      return next;
    });
  }, []);

  // The selected gradient as a GMT config (for the CanonicalHero's favourite star + dock
  // payload; presets carry stops, loaded entries are ramp-only → fitted via the seam).
  const favConfig = selected ? entryToGradientConfig(selected) : null;
  // The hero renders the entry's EXACT 256-step ramp (byte→RGB via the shared bufferToRamp),
  // so it matches the wall swatch pixel-for-pixel rather than the fitted-stops re-render.
  const heroRamp = selected ? bufferToRamp(selected.ramp) : undefined;
  // Match the deselected placeholder to the hero's footprint so deselect doesn't jump.
  const heroH = useHeroHeight();

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-surface-dock">
      <div className="px-4 pt-3 pb-2 border-b border-line/10 shrink-0">
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
                <span className="text-[10px] text-fg-faint">No gradient picked</span>
              </div>
              <div
                className="w-full rounded-md border border-dashed border-line/20 bg-surface/40 flex items-center justify-center"
                style={{ height: heroH }}
              >
                <span className="text-[10px] text-fg-faint">Click a swatch below to preview it here</span>
              </div>
            </div>
          )}
        </HeroSlot>
        <div className="mt-1.5 flex items-center justify-between text-[11px] gap-2">
          {/* The ★ + name live in the hero above; this row keeps the bundle provenance
              (when picked) on the left and the search/count/hint controls on the right. */}
          <span className="flex items-center gap-2 min-w-0">
            {selected?.bundle && <span className="text-[10px] text-fg-faint truncate">{selected.bundle}</span>}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {hintPhase !== 'done' && (
              <span className="hidden md:inline-flex items-center text-[10px] text-accent-300/80 bg-accent-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
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
                <span className="inline-flex items-center gap-1 h-[22px] rounded border border-line/20 bg-surface pl-1.5 pr-1">
                  <SearchIcon className="w-3 h-3 text-fg-dim shrink-0" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => m.setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { m.setSearch(''); setSearchOpen(false); (e.target as HTMLInputElement).blur(); }
                    }}
                    placeholder="name · theme · source"
                    className="w-28 md:w-32 bg-transparent outline-none text-[11px] text-fg-secondary placeholder-zinc-600"
                  />
                  <button
                    onClick={() => { m.setSearch(''); setSearchOpen(false); }}
                    title={search ? 'Clear search' : 'Close search'}
                    className="px-0.5 text-fg-dim hover:text-fg-secondary"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  title="Search the catalog by name, theme, or source"
                  className="p-0.5 text-fg-dim hover:text-fg-secondary"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span className="text-fg-dim tabular-nums">
              {!m.loaded ? 'loading…' : (
                <>
                  {m.count} of {m.total}
                  {m.narrowers.length > 0 && (
                    <>
                      {' — '}
                      <span className="text-fg-muted">{m.narrowers.join(' · ')}</span>
                      {' · '}
                      <button onClick={m.clearAll} className="text-accent-300 hover:text-accent-300 underline" title="Clear every active filter (search, carve, quality, themes, sources)">
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
        <div ref={m.toolbarRef} className="mt-1.5 hidden md:flex items-center gap-1.5 text-[11px]">
          <span className="text-fg-faint">Select</span>
          {(['rect', 'lasso', 'paint'] as const).map((t) => {
            const on = tool === t;
            const label = t === 'rect' ? 'Rect' : t === 'lasso' ? 'Lasso' : 'Paint';
            return (
              <button
                key={t}
                onClick={() => m.setTool((p) => (p === t ? null : t))}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  on ? 'border-accent-400 text-accent-300 bg-accent-500/10' : 'border-line/20 text-fg-muted hover:text-fg-secondary hover:border-line/20'
                }`}
              >
                {label}
              </button>
            );
          })}
          {keptIds && (
            <button
              onClick={m.clearCarve}
              className="px-1.5 py-0.5 rounded border border-accent-500/40 text-accent-300 bg-accent-500/10 hover:bg-accent-500/20"
              title="Clear the selection filter and show the full wall"
            >
              ▣ {keptIds.length} kept · clear
            </button>
          )}
          {tool && (
            <span className="text-fg-dim">
              drag to select · click <span className="text-fg-tertiary">inside</span> isolates ·{' '}
              <span className="text-fg-tertiary">outside</span> cuts
              {tool === 'paint' && <span className="text-fg-faint"> · Shift add · Ctrl erase · [ ] size</span>}
              <span className="text-fg-faint"> · Esc cancels</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-fg-dim tabular-nums" title="Wall zoom (×horizontal · ×vertical)">
              zoom {m.zoom.x.toFixed(1)}×{m.zoom.y.toFixed(1)}
            </span>
            {m.zoomed && (
              <button
                onClick={m.resetZoom}
                className="px-1.5 py-0.5 rounded border border-line/20 text-fg-muted hover:text-fg-secondary hover:border-line/20"
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
      <div ref={m.wallHostRef} data-gx-keepselect="" className="flex-1 min-h-0 relative">
        {!m.loaded ? (
          <div className="h-full flex items-center justify-center text-sm text-fg-faint">Loading gradient library…</div>
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
            onGesture={advanceHint}
            onZoomChange={m.onZoomChange}
            resetZoomSignal={m.resetZoomSignal}
            selectionTool={tool}
            onSelectionCommit={m.onSelectionCommit}
            onSelectionCancel={() => m.setTool(null)}
            onDeselect={m.onDeselect}
            inHand={m.gradientInHand}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-fg-muted px-6 text-center">
            {search.trim() ? (
              <span>
                No gradients match “{search.trim()}”{keptIds ? ' in the current carve' : ''} —{' '}
                <button onClick={() => m.setSearch('')} className="text-accent-300 underline">clear search</button>
                {keptIds && <> · <button onClick={m.clearCarve} className="text-accent-300 underline">clear carve</button></>}.
              </span>
            ) : keptIds ? (
              <span>
                No gradients in the current carve — <button onClick={m.clearCarve} className="text-accent-300 underline">clear the selection filter</button>.
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
