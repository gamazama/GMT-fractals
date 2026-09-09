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
import { DEFAULT_PAD_AXES, type ColourAxis, type PadAxes } from '../core/padAxes';
import { lensBand } from '../core/lensBand';

interface Props {
  /** The X window (0..1 along the pad's X axis — hue by default). */
  x: Range01;
  /** The Y window (0..1 along the pad's Y axis — lightness by default; 1 is the top). */
  y: Range01;
  onChange: (x: Range01, y: Range01) => void;
  /** Which colour coordinates the pad's axes are, and which is on the strip beside it
   *  (GE v2, owner 2026-09-08: the pad follows the wall's Arrange state — see
   *  `palette/core/padAxes.ts`). The default is hue × lightness. */
  axes?: PadAxes;
  /** The third coordinate's value (0..1) the field is painted at — the centre of the
   *  strip's window. 0.5 on the default axes is the chroma the pad always used. */
  fixed?: number;
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
const L_LO = 0.18;
const L_HI = 0.95;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const isFull = (r: Range01) => r[0] <= 0 && r[1] >= 1;
/**
 * The chroma a normalised 0..1 chroma value paints at.
 *
 * 0.32 is where sRGB's most saturated colours actually sit in OKLCh (the same figure
 * `palette/core/gradientMapChannels.ts` records), so the vivid end of the axis is painted
 * as vivid as the screen can be. It was 0.22, which made the whole field — and the strip
 * under it, which shares this scale — read dull (owner, 2026-09-09). Nothing is lost to
 * the raise: `oklabToRgbSafe` walks chroma back down until the colour is in gamut, so
 * every hue paints at ITS limit rather than at the most timid hue's limit.
 *
 * The midpoint is the useful check: 0.5 now paints C = 0.16, which is exactly the chroma
 * `palette/core/facets.ts` calls fully vivid (`CHROMA_FULL`) when it scores the qC axis
 * this pad filters on. The field and the data now mean the same thing by "vivid".
 */
const C_MAX = 0.32;
const COLOUR_AXES: readonly ColourAxis[] = ['hue', 'lightness', 'chroma'];

/** Normalised (0..1 per axis) → OKLab. Lightness spans L_LO..L_HI, chroma 0..C_MAX. */
const labOf = (v: Record<ColourAxis, number>) => {
  const L = L_LO + clamp01(v.lightness) * (L_HI - L_LO);
  const C = clamp01(v.chroma) * C_MAX;
  const hRad = v.hue * Math.PI * 2;
  return { L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) };
};

/** Paint the field once: OKLab, gamut-safe, the X axis left→right, the Y axis with 1 at
 *  the top, the third coordinate fixed. */
const paintField = (ctx: CanvasRenderingContext2D, w: number, h: number, axes: PadAxes, fixed: number) => {
  const img = ctx.createImageData(w, h);
  const third = COLOUR_AXES.find((a) => a !== axes.x && a !== axes.y)!;
  const v: Record<ColourAxis, number> = { hue: 0, lightness: 0, chroma: 0 };
  v[third] = fixed;
  for (let y = 0; y < h; y++) {
    v[axes.y] = 1 - y / (h - 1);
    for (let x = 0; x < w; x++) {
      v[axes.x] = x / (w - 1);
      const rgb = oklabToRgbSafe(labOf(v));
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
  x: hue,
  y: light,
  axes = DEFAULT_PAD_AXES,
  fixed = 0.5,
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
    paintField(ctx, cv.width, cv.height, axes, fixed);
  }, [axes.x, axes.y, fixed]);

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
      title={title ?? 'Drag a box to keep only this part of the wall · drag inside to move it · drag an edge to resize · click: a band, or clear'}
      data-gx-pad-axes={`${axes.x}×${axes.y}`}
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
        // indicates only — every gesture on the field stays the window's. Geometry comes
        // from the SAME function the scrollbar's thumb uses (palette/core/lensBand.ts), so
        // the two cannot drift apart; the harness pins that.
        const band = lensBand(marker, height);
        // The lens belongs to the SELECTED REGION, not the whole field (owner, 2026-09-09:
        // "instead of extending the whole way across, should be in the selected region, and
        // extending to the right visually connecting to the scroll bar as a thinner line").
        // With no window the selection IS the whole field, so this reads as before.
        const sx0 = active ? box.x0 : 0;
        const sx1 = active ? box.x1 : width;
        return (
          <>
            <div
              data-gx-pad-lens=""
              className="absolute pointer-events-none bg-white/[.14] border-y border-white/50"
              style={{ left: sx0, width: Math.max(0, sx1 - sx0), top: band.top, height: band.height }}
            />
            {/* the tail: the SAME TWO EDGES carried on to the pad's right edge, fainter, so
                the visible band keeps reading as a band all the way to the scrollbar's thumb
                (owner, 2026-09-09: a single centre line "is a stray line coming from the
                centre of the selected area … instead of the extended lines that should show
                the scrolled visible area"). Thinner is opacity here, not width — under 1 px
                is not drawable — and no fill, so it reads as the band continuing rather than
                as more lens. */}
            {sx1 < width && (
              <div
                data-gx-pad-lens-tail=""
                className="absolute pointer-events-none border-y border-white/30"
                style={{ left: sx1, width: width - sx1, top: band.top, height: band.height }}
              />
            )}
          </>
        );
      })()}
    </div>
  );
};

/**
 * Paint the strip beside the pad for its third coordinate, toward the AVERAGE colour of the
 * pad's window (owner, 2026-09-06 for the chroma strip: grey at the left, the window's mean
 * hue at its mean lightness at full chroma on the right). The strip axis runs 0..1 across;
 * the pad's two axes sit at their windows' centres. Returns null when the strip is chroma or
 * lightness and the hue window is clear (a full wheel averages to grey, so the caller falls
 * back to its generic track); a hue strip is always paintable.
 */
export const stripTrackFor = (axes: PadAxes, xWin: Range01, yWin: Range01): ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | null => {
  const hueWin = axes.x === 'hue' ? xWin : axes.y === 'hue' ? yWin : null;
  if (axes.strip !== 'hue' && hueWin && isFull(hueWin)) return null;
  const centre = (r: Range01) => (r[0] + r[1]) / 2;
  const v: Record<ColourAxis, number> = { hue: 0.5, lightness: 0.5, chroma: 0.5 };
  v[axes.x] = centre(xWin);
  v[axes.y] = centre(yWin);
  return (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const t = x / (w - 1);
      const vv = { ...v, [axes.strip]: t } as Record<ColourAxis, number>;
      // (until 2026-09-09 a chroma strip overrode a/b to reach 0.3, because the field only
      // reached 0.22 and the strip's vivid end had to out-reach it. C_MAX is 0.32 now, so
      // labOf already paints that — one scale for the field and the strip.)
      const rgb = oklabToRgbSafe(labOf(vv));
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        img.data[i] = rgb.r; img.data[i + 1] = rgb.g; img.data[i + 2] = rgb.b; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
};

/** The default pad's chroma strip (kept for callers that predate `stripTrackFor`). */
export const satTrackFor = (hue: Range01, light: Range01): ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | null =>
  stripTrackFor(DEFAULT_PAD_AXES, hue, light);

export default HueLightnessPad;
