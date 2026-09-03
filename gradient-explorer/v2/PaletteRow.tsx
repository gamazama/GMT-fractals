/**
 * PaletteRow — the palette face of the working gradient, ON TOP of the ramp (owner review
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised).
 *
 * Each swatch is a sample POSITION on the ramp (`workingStore.positions`). Dragging a swatch
 * left/right scrubs its position along the ramp, so its colour changes live; it cannot pass
 * its neighbours (order stays stable, no jumping slots). A plain click copies the hex. `+` at
 * the end inserts a swatch at the largest gap; `×` on hover removes one. The layout rules
 * (Even / Perceptual / Stops) are buttons, not modes.
 *
 * `onScrub(t)` lets the host draw a marker on the ramp while a swatch is being dragged.
 * `scale` maps a horizontal pixel delta to a `t` delta: pass the ramp's pixel width so a
 * swatch travels the ramp at the same speed the pointer travels it.
 */

import React, { useRef, useState } from 'react';
import { useWorkingStore } from '../../palette/store/workingStore';
import type { PaletteSwatch } from '../../palette/core/paletteSample';
import { PALETTE_MAX, PALETTE_MIN, type PaletteRule } from '../../palette/core/paletteSample';
import type { RGB } from '../../palette/core/oklab';
import { showToast } from '../../engine/store/toastStore';

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

const RULES: { id: PaletteRule; label: string; title: string }[] = [
  { id: 'even', label: 'Even', title: 'Space the swatches evenly along the ramp' },
  { id: 'perceptual', label: 'Perceptual', title: 'Space them by equal colour change' },
  { id: 'stops', label: 'Stops', title: 'One swatch per stop' },
];

interface Props {
  palette: PaletteSwatch[];
  /** Pixel width of the ramp the positions map onto (for drag speed). */
  scale: number;
  /** Read-only (a candidate preview): no drag, no add/remove. */
  readOnly?: boolean;
  onScrub?: (t: number | null) => void;
  className?: string;
}

const DRAG_THRESHOLD = 3;

export const PaletteRow: React.FC<Props> = ({ palette, scale, readOnly = false, onScrub, className = '' }) => {
  const rule = useWorkingStore((s) => s.rule);
  const [dragging, setDragging] = useState<number | null>(null);
  const drag = useRef<{ index: number; startX: number; startT: number; moved: boolean } | null>(null);

  const copyHex = (hex: string) => {
    try {
      void navigator.clipboard?.writeText(hex);
    } catch {
      /* the toast still shows the value */
    }
    showToast(`copied ${hex}`);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (readOnly || e.button !== 0) return;
    drag.current = { index, startX: e.clientX, startT: palette[index].t, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;
    const st = useWorkingStore.getState();
    const p = st.positions;
    // Clamp to the neighbours so a swatch never passes another (order stays stable).
    const lo = d.index > 0 ? p[d.index - 1] + 0.002 : 0;
    const hi = d.index < p.length - 1 ? p[d.index + 1] - 0.002 : 1;
    const t = Math.max(lo, Math.min(hi, d.startT + dx / Math.max(1, scale)));
    st.moveSwatch(d.index, t);
    setDragging(d.index);
    onScrub?.(t);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    onScrub?.(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (d && !d.moved && palette[index]) copyHex(hexOf(palette[index].color));
  };

  return (
    <div className={`flex items-stretch gap-1.5 ${className}`}>
      {palette.map((sw, i) => {
        const hex = hexOf(sw.color);
        const isDrag = dragging === i;
        return (
          <div key={i} className={`relative flex-1 min-w-0 group ${dragging != null && !isDrag ? 'pointer-events-none' : ''}`}>
            <button
              className={`w-full h-full rounded-md border border-black/40 ${readOnly ? 'cursor-pointer' : 'cursor-ew-resize'} ${
                isDrag ? 'outline outline-2 outline-accent-400' : 'hover:outline hover:outline-2 hover:outline-white'
              }`}
              style={{ background: hex, touchAction: 'none' }}
              title={readOnly ? `${hex} · click to copy` : `${hex} · drag to slide along the ramp · click to copy`}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, i)}
              onPointerCancel={(e) => onPointerUp(e, i)}
              onClick={(e) => {
                if (readOnly) {
                  copyHex(hex);
                  e.preventDefault();
                }
              }}
            />
            {isDrag && (
              <span className="absolute left-1/2 -top-6 -translate-x-1/2 text-[11px] font-mono text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                {hex} · {Math.round(sw.t * 100)}%
              </span>
            )}
            {!readOnly && palette.length > PALETTE_MIN && (
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/80 text-white text-[10px] leading-4 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove this swatch"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  useWorkingStore.getState().removeSwatch(i);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <div className="flex flex-col justify-center gap-1 pl-1">
          <button
            className="w-7 h-7 rounded-md border border-line/20 text-fg-muted hover:text-fg hover:border-line/40 text-[14px] leading-none disabled:opacity-30"
            title="Add a swatch where the palette is thinnest"
            disabled={palette.length >= PALETTE_MAX}
            onClick={() => useWorkingStore.getState().addSwatch()}
          >
            +
          </button>
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-col justify-center pl-1">
          <div className="inline-flex border border-line/20 rounded-md overflow-hidden">
            {RULES.map((r) => (
              <button
                key={r.id}
                className={`px-2 h-7 text-[11px] ${rule === r.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
                title={r.title}
                onClick={() => useWorkingStore.getState().layoutPalette(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
