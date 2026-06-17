/**
 * GradientSourcePicker — a searchable gradient browser for choosing a generator
 * source slot (A/B). The prototype's slot was a type-to-filter search over ~11k
 * gradients; a 24-option <select> doesn't scale, so this is a search box + a
 * scrollable, SECTIONED list of name + swatch rows.
 *
 * The list is the UNIFIED catalog the rest of the suite uses, not just the 24
 * built-in presets:
 *   • Built-in   — buildPresetCatalog()'s `preset-*` entries (GMT's GRADIENT_PRESETS).
 *   • Sent / custom — ad-hoc entries already registered in the catalog (img2grad
 *                     distills, generator sends, slot bakes) — i.e. `adhoc-*`.
 *   • Favients   — the persistent favourites shelf (GradientConfig-based). These
 *                  live OUTSIDE the catalog, so picking one registers its rendered
 *                  ramp as a custom catalog entry on demand and selects that index.
 *
 * Every selection ultimately yields a CATALOG INDEX (what a slot stores), so the
 * host's `onChange(idx)` contract is unchanged.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildPresetCatalog, registerCustomRamp, type CatalogEntry } from '../core/presetCatalog';
import { renderStopsToRamp, renderStopsToBuffer } from '../core/gmtGradient';
import { paintRampToCanvas } from '../core/rampCanvas';
import { useFavientsStore } from '../store/favientsStore';

const MAX_ROWS = 300; // cap until the 11k catalog gets a virtualized list

const Swatch: React.FC<{ ramp: Uint8Array }> = ({ ramp }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const tmp = document.createElement('canvas');
    paintRampToCanvas(tmp, ramp);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);
  return <canvas ref={ref} width={120} height={18} className="rounded-sm shrink-0" style={{ width: 120, height: 18 }} />;
};

/** A unified row: either an existing catalog entry (has an index) or a favourite
 *  (registered to a catalog index lazily, on pick). */
type Row =
  | { kind: 'catalog'; key: string; name: string; ramp: Uint8Array; idx: number }
  | { kind: 'favient'; key: string; name: string; ramp: Uint8Array; pick: () => number };

interface GradientSourcePickerProps {
  title: string;
  value: number;
  onChange: (idx: number) => void;
  onClose: () => void;
}

export const GradientSourcePicker: React.FC<GradientSourcePickerProps> = ({ title, value, onChange, onClose }) => {
  const catalog = useMemo<CatalogEntry[]>(() => buildPresetCatalog(), []);
  const favients = useFavientsStore((s) => s.favients);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc close (outside-click is handled by the backdrop). A viewport-fixed modal — the
  // earlier flyout rendered off-screen / clipped by the source list's overflow container.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Three source sections, each a Row[] in catalog/shelf order.
  const sections = useMemo<{ label: string; rows: Row[] }[]>(() => {
    const builtIn: Row[] = [];
    const custom: Row[] = [];
    catalog.forEach((e, i) => {
      const row: Row = { kind: 'catalog', key: e.id, name: e.name, ramp: e.ramp, idx: i };
      (e.id.startsWith('adhoc-') ? custom : builtIn).push(row);
    });
    const favRows: Row[] = favients.map((f) => ({
      kind: 'favient',
      key: `fav-${f.id}`,
      name: f.name,
      ramp: renderStopsToBuffer(f.config.stops, f.config.blendSpace, f.config.colorSpace),
      // Register the favourite's rendered ramp as a custom catalog entry on pick
      // (content-deduped in the catalog), then select that index.
      pick: () => registerCustomRamp(renderStopsToRamp(f.config.stops, f.config.blendSpace, f.config.colorSpace), f.name),
    }));
    return [
      { label: 'Built-in', rows: builtIn },
      { label: 'Favients', rows: favRows },
      { label: 'Sent / custom', rows: custom },
    ];
  }, [catalog, favients]);

  // Filter every section by the search needle; drop empties; cap the TOTAL rows shown.
  const { shownSections, total } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = sections
      .map((s, order) => ({ label: s.label, order, rows: needle ? s.rows.filter((r) => r.name.toLowerCase().includes(needle)) : s.rows }))
      .filter((s) => s.rows.length > 0);
    const totalRows = filtered.reduce((n, s) => n + s.rows.length, 0);
    // Allocate the shared MAX_ROWS cap to the small USER sections (Favients, Sent/custom)
    // BEFORE the unbounded Built-in set, so a large preset catalog (the 11k bake this
    // picker is built toward) can never starve the user's own gradients out of the list.
    // Display order stays the section order.
    const byPriority = [...filtered].sort((a, b) => (a.label === 'Built-in' ? 1 : 0) - (b.label === 'Built-in' ? 1 : 0));
    let budget = MAX_ROWS;
    const cappedByOrder = new Map<number, Row[]>();
    for (const s of byPriority) {
      if (budget <= 0) break;
      const rows = s.rows.slice(0, budget);
      budget -= rows.length;
      cappedByOrder.set(s.order, rows);
    }
    const capped = filtered
      .filter((s) => cappedByOrder.has(s.order))
      .map((s) => ({ label: s.label, rows: cappedByOrder.get(s.order)! }));
    return { shownSections: capped, total: totalRows };
  }, [sections, q]);

  const select = (r: Row) => {
    onChange(r.kind === 'catalog' ? r.idx : r.pick());
    onClose();
  };

  return (
    // Viewport-fixed centred modal: never off-screen, never clipped by the source list's
    // scroll container. Click the backdrop (or Esc / ✕) to dismiss.
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(420px,92vw)] max-h-[72vh] flex flex-col bg-zinc-900 border border-white/15 rounded-md shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10">
        <span className="text-[11px] font-semibold text-gray-300">{title}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search gradients…"
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-sm text-[11px] text-gray-200 px-2 py-1 outline-none focus:border-cyan-500/50"
        />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-sm leading-none px-1">
          ✕
        </button>
      </div>
      <div className="px-2 py-1 text-[10px] text-gray-500 border-b border-white/5">
        {total} match{total === 1 ? '' : 'es'}
        {total > MAX_ROWS && ` · showing ${MAX_ROWS} — refine search`}
      </div>
      <div className="overflow-y-auto">
        {shownSections.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-gray-500">No gradients match “{q}”.</div>}
        {shownSections.map((s) => (
          <div key={s.label}>
            <div className="sticky top-0 z-10 px-2 py-1 text-[9px] uppercase tracking-wide text-gray-500 bg-zinc-900/95 border-b border-white/5">
              {s.label} <span className="text-gray-600">· {s.rows.length}</span>
            </div>
            {s.rows.map((r) => {
              const selected = r.kind === 'catalog' && r.idx === value;
              return (
                <button
                  key={r.key}
                  onClick={() => select(r)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-white/[0.06] ${selected ? 'bg-cyan-500/15' : ''}`}
                >
                  <Swatch ramp={r.ramp} />
                  <span className={`text-[11px] truncate ${selected ? 'text-cyan-200' : 'text-gray-300'}`}>{r.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default GradientSourcePicker;
