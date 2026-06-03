/**
 * GradientSourcePicker — a searchable gradient browser for choosing a generator
 * source slot (A/B). The prototype's slot was a type-to-filter search over ~11k
 * gradients; a 24-option <select> doesn't scale, so this is a search box + a
 * scrollable list of name + swatch rows.
 *
 * Data comes from buildPresetCatalog() (the same source the Picker uses) — 24
 * built-in presets today, the 11k sprite+facet bake later (same CatalogEntry
 * shape), at which point the capped list grows a virtualized path.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildPresetCatalog, type CatalogEntry } from '../core/presetCatalog';

const MAX_ROWS = 300; // cap until the 11k catalog gets a virtualized list

const Swatch: React.FC<{ ramp: Uint8Array }> = ({ ramp }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const tmp = document.createElement('canvas');
    tmp.width = 256;
    tmp.height = 1;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    tctx.putImageData(new ImageData(new Uint8ClampedArray(ramp), 256, 1), 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);
  return <canvas ref={ref} width={120} height={18} className="rounded-sm shrink-0" style={{ width: 120, height: 18 }} />;
};

interface GradientSourcePickerProps {
  title: string;
  value: number;
  onChange: (idx: number) => void;
  onClose: () => void;
  /** 'left' opens as a flyout to the left of the trigger (into the canvas
   *  margin) so it doesn't cover the other source's gradient; 'down' drops below. */
  placement?: 'down' | 'left';
}

export const GradientSourcePicker: React.FC<GradientSourcePickerProps> = ({ title, value, onChange, onClose, placement = 'down' }) => {
  const catalog = useMemo<CatalogEntry[]>(() => buildPresetCatalog(), []);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Outside-click + Esc close (lightweight picker — safe to dismiss).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = catalog.map((e, i) => ({ e, i }));
    const filtered = needle ? all.filter(({ e }) => e.name.toLowerCase().includes(needle)) : all;
    return filtered;
  }, [catalog, q]);

  const shown = matches.slice(0, MAX_ROWS);

  return (
    <div
      ref={rootRef}
      className={`absolute z-50 w-[320px] max-h-[60vh] flex flex-col bg-zinc-900 border border-white/15 rounded-md shadow-2xl overflow-hidden ${
        placement === 'left' ? 'top-0 right-full mr-2' : 'mt-1'
      }`}
    >
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
        {matches.length} match{matches.length === 1 ? '' : 'es'}
        {matches.length > MAX_ROWS && ` · showing ${MAX_ROWS} — refine search`}
      </div>
      <div className="overflow-y-auto">
        {shown.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-gray-500">No gradients match “{q}”.</div>}
        {shown.map(({ e, i }) => (
          <button
            key={e.id}
            onClick={() => {
              onChange(i);
              onClose();
            }}
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-white/[0.06] ${
              i === value ? 'bg-cyan-500/15' : ''
            }`}
          >
            <Swatch ramp={e.ramp} />
            <span className={`text-[11px] truncate ${i === value ? 'text-cyan-200' : 'text-gray-300'}`}>{e.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GradientSourcePicker;
