/**
 * PaletteRow — the palette face of the working gradient, ON TOP of the ramp (owner review
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised).
 *
 * Each swatch is a sample POSITION on the ramp (`workingStore.positions`). Dragging a swatch
 * left/right scrubs its position along the ramp, so its colour changes live. Slots never
 * reorder: when the pointer pushes past a neighbour, the drag HANDS OVER to that neighbour
 * (the swatch it left stays put just short of it) — owner review 2026-09-03. A plain click
 * selects the swatch's stop in the editor below (`onSelect`; the host creates one if there is
 * none). `+` at the end inserts a swatch at the largest gap; `×` on hover removes one. The
 * layout rules (Even / Perceptual / Stops) are buttons, not modes.
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
import { gradientBarClass } from './ui/bar';
import { Icon } from './ui/Icon';
import { Act } from './ui/Act';
import { isColorDrag, readColorDrag } from '../../components/gradient/colorDrag';

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

const RULES: { id: PaletteRule; label: string; title: string }[] = [
  { id: 'even', label: 'Even', title: 'Space the swatches evenly along the ramp' },
  { id: 'perceptual', label: 'Perceptual', title: 'Space them by equal colour change' },
  { id: 'stops', label: 'Stops', title: 'One swatch per stop' },
];

interface Props {
  /** A colour was dropped on the swatch at ramp position `t` (components/gradient/colorDrag).
   *  The hero routes this to the editor, which recolours the nearest knot or inserts one. */
  onDropColour?: (t: number, hex: string) => void;
  palette: PaletteSwatch[];
  /** Pixel width of the ramp the positions map onto (for drag speed). */
  scale: number;
  /** Read-only (a candidate preview): no drag, no add/remove. */
  readOnly?: boolean;
  onScrub?: (t: number | null) => void;
  /** A click (no drag) on a swatch: select / create its stop. Without it a click copies the hex. */
  onSelect?: (index: number, t: number) => void;
  className?: string;
}

const DRAG_THRESHOLD = 3;
/** Minimum spacing kept between neighbouring swatches (in ramp t). */
const GAP = 0.002;

export const PaletteRow: React.FC<Props> = ({ palette, scale, readOnly = false, onScrub, onSelect, onDropColour, className = '' }) => {
  /** Which swatch a dragged colour is over (index), or null. */
  const [dropOver, setDropOver] = useState<number | null>(null);
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
    let t = d.startT + dx / Math.max(1, scale);
    // Handover: pushed past a neighbour, the drag continues on THAT swatch (slots never
    // reorder). The one the pointer left is parked just short of the neighbour it met.
    if (d.index < p.length - 1 && t > p[d.index + 1] - GAP) {
      st.moveSwatch(d.index, p[d.index + 1] - GAP);
      d.index += 1;
      d.startT = p[d.index];
      d.startX = e.clientX;
      t = d.startT;
    } else if (d.index > 0 && t < p[d.index - 1] + GAP) {
      st.moveSwatch(d.index, p[d.index - 1] + GAP);
      d.index -= 1;
      d.startT = p[d.index];
      d.startX = e.clientX;
      t = d.startT;
    }
    const q = useWorkingStore.getState().positions;
    const lo = d.index > 0 ? q[d.index - 1] + GAP : 0;
    const hi = d.index < q.length - 1 ? q[d.index + 1] - GAP : 1;
    t = Math.max(lo, Math.min(hi, t));
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
    if (d && !d.moved && palette[index]) {
      if (onSelect) onSelect(index, palette[index].t);
      else copyHex(hexOf(palette[index].color));
    }
  };

  return (
    <div className={`flex items-stretch gap-1.5 ${className}`}>
      {palette.map((sw, i) => {
        const hex = hexOf(sw.color);
        const isDrag = dragging === i;
        return (
          <div
            key={i}
            className={`relative flex-1 min-w-0 group ${dragging != null && !isDrag ? 'pointer-events-none' : ''}`}
            onDragOver={(e) => {
              if (!onDropColour || !isColorDrag(e.dataTransfer)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setDropOver(i);
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOver(null); }}
            onDrop={(e) => {
              const hex = readColorDrag(e.dataTransfer);
              setDropOver(null);
              if (!hex || !onDropColour) return;
              e.preventDefault();
              onDropColour(sw.t, hex);
            }}
            data-gx-palette-drop={dropOver === i ? '' : undefined}
          >
            {/* a colour is in flight: every swatch says it will take it */}
            {onDropColour && dropOver !== null && (
              <span
                aria-hidden
                className={`absolute inset-0 rounded-[10px] border-2 border-dashed pointer-events-none z-10 ${dropOver === i ? 'border-accent-300' : 'border-accent-300/40'}`}
              />
            )}
            <button
              className={`w-full h-full ${gradientBarClass({ size: 'swatch', selected: isDrag })} ${readOnly ? 'cursor-pointer' : 'cursor-ew-resize'}`}
              style={{ background: hex, touchAction: 'none' }}
              title={readOnly ? `${hex} · click to copy` : onSelect ? `${hex} · drag to slide along the ramp · click to edit its stop` : `${hex} · drag to slide along the ramp · click to copy`}
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
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove this swatch"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  useWorkingStore.getState().removeSwatch(i);
                }}
              >
                <Icon name="close" size={10} />
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <div className="flex flex-col justify-center gap-1 pl-1">
          <Act
            icon
            title="Add a swatch where the palette is thinnest"
            disabled={palette.length >= PALETTE_MAX}
            onClick={() => useWorkingStore.getState().addSwatch()}
          >
            <Icon name="plus" />
          </Act>
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-col justify-center pl-1">
          <div className="inline-flex border border-line/20 rounded-lg overflow-hidden">
            {RULES.map((r) => (
              <button
                key={r.id}
                className={`px-2 h-7 text-[13px] ${rule === r.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
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
