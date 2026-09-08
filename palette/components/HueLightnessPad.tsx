/**
 * HueLightnessPad — the Browse "colour picker": a 2-D field of hue (x) × lightness (y)
 * with a RANGED selection. Dragging a box narrows the wall to gradients whose dominant hue
 * and mean lightness fall inside it; the box can be moved (drag inside) or resized (drag
 * an edge); a plain click clears it, or on a clear pad drops a 15 %-wide full-height hue band. It writes the same two `paletteFilters` windows the
 * one-dimensional pads write — `qHue` (0..1 = 0..360°) and `qL` (dark 0 → light 1) — so
 * the filter predicate (`passesFilters`) is unchanged and the badge / narrower count / the
 * clear-all all already understand it.
 *
 * Owner, 2026-09-06: hue + dark/light are the MAIN picking mode (few people know the names
 * of gradients), the familiar colour-picker shape, plus the ranged selection; it sits ON the
 * bar above the wall so it never covers the thing it is narrowing.
 *
 * Pure w.r.t. the store: value in, onChange out. The undo bracket is the caller's
 * (`onDragStart` / `onDragEnd` → `handleInteractionStart('param')` / `handleInteractionEnd`).
 *
 * @see plans/ge-v2-unified-shell-plan.md §8 (Phase A, owner iteration 2)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { oklabToRgbSafe } from '../core/oklab';

export type Range01 = [number, number];

interface Props {
  /** Hue window, 0..1 of the wheel. */
  hue: Range01;
  /** Lightness window, 0 = dark, 1 = light. */
  light: Range01;
  onChange: (hue: Range01, light: Range01) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  width?: number;
  height?: number;
  className?: string;
  title?: string;
  /** The wall's VIEWPORT on the map (GE v2 Phase D, the pad as the wall's map): the
   *  lightness range on screen, 0 = dark, 1 = light. Drawn as a LENS — a light translucent
   *  band across the field, its edges hairlines — that only indicates; the scrollbar beside
   *  the pad (`MapScrollbar`) is the control. Null = nothing drawn. */
  marker?: [number, number] | null;
}

const PAINT_W = 180;
const PAINT_H = 48;
const EDGE = 6; // px — grab zone for resizing an edge
const CLICK_BAND = 0.15; // a click on a clear pad = this much of the wheel, full height
const CHROMA = 0.11;
const L_LO = 0.18;
const L_HI = 0.95;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const isFull = (r: Range01) => r[0] <= 0 && r[1] >= 1;

/** Paint the field once: OKLab, gamut-safe, hue left→right, light top→bottom. */
const paintField = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const L = L_HI - (y / (h - 1)) * (L_HI - L_LO);
    for (let x = 0; x < w; x++) {
      const hRad = (x / (w - 1)) * Math.PI * 2;
      const rgb = oklabToRgbSafe({ L, a: CHROMA * Math.cos(hRad), b: CHROMA * Math.sin(hRad) });
      const i = (y * w + x) * 4;
      img.data[i] = rgb.r;
      img.data[i + 1] = rgb.g;
      img.data[i + 2] = rgb.b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

type Drag =
  | { kind: 'draw'; ax: number; ay: number; moved: boolean }
  | { kind: 'move'; dx: number; dy: number; w: number; h: number }
  | { kind: 'edge'; edge: 'l' | 'r' | 't' | 'b' };

export const HueLightnessPad: React.FC<Props> = ({
  marker = null,
  hue,
  light,
  onChange,
  onDragStart,
  onDragEnd,
  width = 240,
  height = 64,
  className = '',
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // A ref, not state: a fast click delivers pointerdown + pointerup inside one frame, before a
  // state update would be visible to the up handler — and that click must CLEAR.
  const dragRef = useRef<Drag | null>(null);
  const [, bump] = useState(0);
  const setDrag = (d: Drag | null) => { dragRef.current = d; bump((n) => n + 1); };
  const [hover, setHover] = useState<string>('');

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    paintField(ctx, cv.width, cv.height);
  }, []);

  // The window in pad pixels. y is DOWN, light is UP: top = light[1], bottom = light[0].
  const box = useMemo(() => {
    const x0 = hue[0] * width;
    const x1 = hue[1] * width;
    const y0 = (1 - light[1]) * height;
    const y1 = (1 - light[0]) * height;
    return { x0, x1, y0, y1 };
  }, [hue, light, width, height]);
  const active = !isFull(hue) || !isFull(light);

  const toLocal = (e: React.PointerEvent | PointerEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    return { x: Math.min(width, Math.max(0, e.clientX - r.left)), y: Math.min(height, Math.max(0, e.clientY - r.top)) };
  };

  const emit = useCallback(
    (x0: number, x1: number, y0: number, y1: number) => {
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      const top = Math.min(y0, y1), bot = Math.max(y0, y1);
      onChange([clamp01(lo / width), clamp01(hi / width)], [clamp01(1 - bot / height), clamp01(1 - top / height)]);
    },
    [onChange, width, height],
  );

  const hitEdge = (p: { x: number; y: number }): 'l' | 'r' | 't' | 'b' | null => {
    if (!active) return null;
    const inX = p.x >= box.x0 - EDGE && p.x <= box.x1 + EDGE;
    const inY = p.y >= box.y0 - EDGE && p.y <= box.y1 + EDGE;
    if (inY && Math.abs(p.x - box.x0) <= EDGE) return 'l';
    if (inY && Math.abs(p.x - box.x1) <= EDGE) return 'r';
    if (inX && Math.abs(p.y - box.y0) <= EDGE) return 't';
    if (inX && Math.abs(p.y - box.y1) <= EDGE) return 'b';
    return null;
  };
  const inside = (p: { x: number; y: number }) => active && p.x > box.x0 && p.x < box.x1 && p.y > box.y0 && p.y < box.y1;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toLocal(e);
    onDragStart?.();
    const edge = hitEdge(p);
    if (edge) setDrag({ kind: 'edge', edge });
    else if (inside(p)) setDrag({ kind: 'move', dx: p.x - box.x0, dy: p.y - box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 });
    else setDrag({ kind: 'draw', ax: p.x, ay: p.y, moved: false });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = toLocal(e);
    const drag = dragRef.current;
    if (!drag) {
      const edge = hitEdge(p);
      setHover(edge === 'l' || edge === 'r' ? 'cursor-ew-resize' : edge ? 'cursor-ns-resize' : inside(p) ? 'cursor-move' : 'cursor-crosshair');
      return;
    }
    if (drag.kind === 'draw') {
      // A plain click (no travel) is a CLEAR, not a zero-size box (owner, 2026-09-06).
      if (!drag.moved && Math.hypot(p.x - drag.ax, p.y - drag.ay) < 3) return;
      if (!drag.moved) dragRef.current = { ...drag, moved: true };
      emit(drag.ax, p.x, drag.ay, p.y);
    }
    else if (drag.kind === 'move') {
      const x0 = Math.min(width - drag.w, Math.max(0, p.x - drag.dx));
      const y0 = Math.min(height - drag.h, Math.max(0, p.y - drag.dy));
      emit(x0, x0 + drag.w, y0, y0 + drag.h);
    } else {
      const b = { ...box };
      if (drag.edge === 'l') b.x0 = Math.min(p.x, b.x1 - 1);
      if (drag.edge === 'r') b.x1 = Math.max(p.x, b.x0 + 1);
      if (drag.edge === 't') b.y0 = Math.min(p.y, b.y1 - 1);
      if (drag.edge === 'b') b.y1 = Math.max(p.y, b.y0 + 1);
      emit(b.x0, b.x1, b.y0, b.y1);
    }
  };
  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'draw' && !drag.moved) {
      // A plain click: clears a window; on an already-clear pad it drops a 15 %-wide, full-height
      // hue band centred on the click (owner, 2026-09-06) — one click picks a hue family.
      if (active) onChange([0, 1], [0, 1]);
      else {
        const half = CLICK_BAND / 2;
        const c = Math.min(1 - half, Math.max(half, drag.ax / width));
        onChange([c - half, c + half], [0, 1]);
      }
    }
    setDrag(null);
    onDragEnd?.();
  };
  const clear = () => {
    onDragStart?.();
    onChange([0, 1], [0, 1]);
    onDragEnd?.();
  };

  return (
    <div
      ref={hostRef}
      className={`relative select-none touch-none rounded overflow-hidden ring-1 ring-line/20 ${hover} ${className}`}
      style={{ width, height }}
      title={title ?? 'Drag a box to keep only these hues and lightnesses · drag inside to move it · drag an edge to resize · click: a hue band, or clear'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={clear}
    >
      <canvas ref={canvasRef} width={PAINT_W} height={PAINT_H} className="absolute inset-0 w-full h-full block" />
      {active && (
        <>
          {/* dim everything outside the window */}
          <div className="absolute left-0 right-0 top-0 bg-black/45 pointer-events-none" style={{ height: box.y0 }} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/45 pointer-events-none" style={{ height: height - box.y1 }} />
          <div className="absolute left-0 bg-black/45 pointer-events-none" style={{ top: box.y0, height: box.y1 - box.y0, width: box.x0 }} />
          <div className="absolute right-0 bg-black/45 pointer-events-none" style={{ top: box.y0, height: box.y1 - box.y0, width: width - box.x1 }} />
          <div
            className="absolute border border-white shadow-[0_0_0_1px_rgba(0,0,0,.6)] pointer-events-none rounded-[2px]"
            style={{ left: box.x0, top: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0 }}
          />
        </>
      )}
      {marker && (() => {
        // The wall's viewport as a lens: y is down, light is up (as the window above). It
        // indicates only — every gesture on the field stays the window's.
        const my0 = (1 - Math.max(marker[0], marker[1])) * height;
        const my1 = (1 - Math.min(marker[0], marker[1])) * height;
        return (
          <div
            data-gx-pad-lens=""
            className="absolute left-0 right-0 pointer-events-none bg-white/[.14] border-y border-white/60"
            style={{ top: Math.round(my0), height: Math.max(2, Math.round(my1 - my0)) }}
          />
        );
      })()}
    </div>
  );
};

/**
 * Paint a saturation strip toward the AVERAGE colour of a hue × lightness window (owner,
 * 2026-09-06): grey at the left, the window's mean hue at its mean lightness at full chroma
 * on the right. Returns null while the hue window is clear (a full wheel averages to grey, so
 * the caller falls back to its generic chroma track).
 */
export const satTrackFor = (hue: Range01, light: Range01): ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | null => {
  if (isFull(hue)) return null;
  const hRad = ((hue[0] + hue[1]) / 2) * Math.PI * 2;
  const L = L_LO + ((light[0] + light[1]) / 2) * (L_HI - L_LO);
  return (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const C = (x / (w - 1)) * 0.3;
      const rgb = oklabToRgbSafe({ L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) });
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        img.data[i] = rgb.r; img.data[i + 1] = rgb.g; img.data[i + 2] = rgb.b; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
};

export default HueLightnessPad;
