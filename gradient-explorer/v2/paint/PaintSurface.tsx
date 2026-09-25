/**
 * PaintSurface — the gradient the brush paints on: the hero's bar while the Paint face is open.
 *
 * It is laid over the Stops editor's bar through the editor's `stripTakeover` seam (the knots,
 * the bias handles and the marquee stand down), and its companion `PaintBeforeLine` takes the
 * knot track's row. The whole bar stays one gradient — no source/result split (owner,
 * 2026-09-24: "I like that the gradient is full and not split while we're working").
 *
 * It covers the bar AND the editor's 8 px end gutters (`GUTTER`, the editor's `px-2`) and paints
 * those with the painting's own end colours — owner, 2026-09-24: "the gradient's two edges aren't
 * updating color when painted" (the editor had painted them from the stops).
 *
 * What it draws, on two canvases so a pointer move never repaints the gradient:
 *   • the painting (`session.current`, 256 texels stretched over the bar — the same stretch the
 *     editor's own preview canvas uses), or the original while the before line is held;
 *   • the brush: an OUTLINE of its profile with a small colour TAB on top (brushDraw), mirrored
 *     when Mirror is on; with Wrap, the part past one end shows at the other (owner, same day:
 *     "wrap mode should have a display on the other side when it's painting"); for Clone a dotted
 *     line to the source's ring.
 *
 * Gestures (no hints on screen — the owner's rule; the tray's lane is the discoverable way to
 * size a brush):
 *   • press and drag: a stroke. Holding still keeps building with the build-up brushes (an
 *     airbrush tick, `HOLD_MS`); a pen's pressure is the strength, and so is the height on the bar
 *     when Height is on;
 *   • right-drag: sideways sizes the brush, up/down sets its hardness — the brush stays where
 *     the drag began, so its shape changes under your hand;
 *   • wheel: size;
 *   • Alt-click: Clone's source, or for the other brushes the colour under the pointer.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { brushRadius, strengthKey, PAINT_TEXELS } from '../../../palette/core/paintRamp';
import { usePaintStore, setBrush, bumpPaint } from './paintStore';
import { brushSource, colourTab, shapePath, sourceMark, strokeOnAnything } from './brushDraw';

/** The editor's end gutters (its `px-2` around the bar) — this surface covers and paints them. */
const GUTTER = 8;
/** How long the pointer must rest before a held brush keeps working, and how often it then does. */
const HOLD_MS = 60;
const TICK_MS = 40;

const paintTexels = (canvas: HTMLCanvasElement | null, texels: Float32Array | undefined): void => {
  const ctx = canvas?.getContext('2d');
  if (!ctx || !texels) return;
  const img = ctx.createImageData(PAINT_TEXELS, 1);
  for (let i = 0; i < PAINT_TEXELS; i++) {
    img.data[i * 4] = Math.round(texels[i * 3]);
    img.data[i * 4 + 1] = Math.round(texels[i * 3 + 1]);
    img.data[i * 4 + 2] = Math.round(texels[i * 3 + 2]);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

export const PaintSurface: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const rampRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLCanvasElement>(null);
  const endARef = useRef<HTMLDivElement>(null);
  const endBRef = useRef<HTMLDivElement>(null);
  const sizing = useRef<{ x: number; y: number; size: number; hardness: number; c: number } | null>(null);
  const lastMove = useRef(0);

  const drawRamp = useCallback(() => {
    const { session, peeking } = usePaintStore.getState();
    const texels = peeking ? session?.original : session?.current;
    paintTexels(rampRef.current, texels);
    // the end gutters wear the painting's own ends
    if (texels) {
      const rgb = (i: number): string => `rgb(${Math.round(texels[i * 3])},${Math.round(texels[i * 3 + 1])},${Math.round(texels[i * 3 + 2])})`;
      if (endARef.current) endARef.current.style.background = rgb(0);
      if (endBRef.current) endBRef.current.style.background = rgb(PAINT_TEXELS - 1);
    }
  }, []);

  const drawCursor = useCallback(() => {
    const cv = cursorRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const { session, brush, hover, peeking } = usePaintStore.getState();
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!session || !hover || peeking) return;
    const d = window.devicePixelRatio || 1;
    const W = cv.width, H = cv.height;
    const x0 = GUTTER * d;
    const ppt = (W - 2 * x0) / PAINT_TEXELS;
    const r = brushRadius(brush.size);
    const strength = brush[strengthKey(brush.tool)];
    const h = (H - 8 * d) * (0.12 + 0.88 * strength) * hover.p;
    const centres = brush.mirror ? [hover.c, PAINT_TEXELS - hover.c] : [hover.c];
    centres.forEach((c, k) => {
      const cx = x0 + c * ppt;
      shapePath(ctx, cx, ppt, H, h, r, brush.hardness);
      strokeOnAnything(ctx, d);
      // WRAP: the part of the brush past an end is painting the other end — show it there
      if (brush.wrap) {
        for (const shift of [-PAINT_TEXELS, PAINT_TEXELS]) {
          const wc = c + shift;
          if (wc + r + 0.5 < 0 || wc - r - 0.5 > PAINT_TEXELS) continue;
          shapePath(ctx, x0 + wc * ppt, ppt, H, h, r, brush.hardness);
          strokeOnAnything(ctx, d);
        }
      }
      colourTab(ctx, session, brushSource(brush, session, hover.c), cx, H - h, c, r, d);
      if (brush.tool === 'clone') {
        const off = session.cloneOffsetFor(hover.c) * (k === 0 ? 1 : -1);
        const sx = x0 + (c + off) * ppt;
        ctx.setLineDash([2 * d, 3 * d]);
        ctx.lineWidth = 1 * d;
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.moveTo(cx, 8 * d); ctx.lineTo(sx, 8 * d); ctx.stroke();
        ctx.setLineDash([]);
        sourceMark(ctx, sx, 8 * d, H, d);
      }
    });
  }, []);

  // Redraw on the store, not on React: a stroke changes the texels many times a frame's worth.
  useEffect(() => {
    drawRamp();
    drawCursor();
    return usePaintStore.subscribe((s, prev) => {
      if (s.rev !== prev.rev || s.peeking !== prev.peeking || s.session !== prev.session) drawRamp();
      if (s.rev !== prev.rev || s.hover !== prev.hover || s.brush !== prev.brush || s.peeking !== prev.peeking || s.session !== prev.session) drawCursor();
    });
  }, [drawRamp, drawCursor]);

  // The cursor canvas matches the bar at device resolution, and the lane learns where the bar is.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      const cv = cursorRef.current;
      if (cv) { cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d)); }
      // the lane draws at the BAR's scale: the inner span, gutters excluded
      usePaintStore.setState({ bar: { left: r.left + GUTTER, width: r.width - 2 * GUTTER } });
      drawCursor();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [drawCursor]);

  // The wheel sizes the brush — a listener of our own, since React's is passive and cannot stop the page scrolling.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const { brush } = usePaintStore.getState();
      setBrush({ size: Math.min(100, Math.max(0.5, brush.size * Math.exp(-e.deltaY * 0.0012))) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // A held brush keeps working while the pointer rests (not Smudge — the session knows).
  useEffect(() => {
    const id = window.setInterval(() => {
      const { session } = usePaintStore.getState();
      if (!session?.painting || performance.now() - lastMove.current < HOLD_MS) return;
      session.hold();
      bumpPaint();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const local = (e: React.PointerEvent): { c: number; p: number; width: number } => {
    const r = rootRef.current!.getBoundingClientRect();
    // a press in a gutter is the end texel — the ends are the easiest place to miss
    const inner = r.width - 2 * GUTTER;
    const x = Math.min(inner, Math.max(0, e.clientX - r.left - GUTTER));
    const y = Math.min(r.height, Math.max(0, e.clientY - r.top));
    let p = 1;
    if (e.pointerType === 'pen') p = e.pressure || 0;
    else if (usePaintStore.getState().heightPressure) p = Math.min(1, Math.max(0, 1 - y / r.height));
    return { c: (x / inner) * PAINT_TEXELS, p, width: inner };
  };

  const onPointerDown = (e: React.PointerEvent): void => {
    const { session, brush } = usePaintStore.getState();
    if (!session) return;
    const L = local(e);
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 2) {
      sizing.current = { x: e.clientX, y: e.clientY, size: brush.size, hardness: brush.hardness, c: L.c };
      e.currentTarget.setPointerCapture(e.pointerId);
      usePaintStore.setState({ hover: { c: L.c, p: 1 }, laneC: L.c });
      return;
    }
    if (e.button !== 0) return;
    if (e.altKey) {
      if (brush.tool === 'clone') {
        session.setCloneSource(L.c);
        bumpPaint();
      } else {
        const t = session.texel(Math.min(PAINT_TEXELS - 1, Math.max(0, Math.floor(L.c))));
        setBrush({ colour: t, ...(brush.tool === 'paint' ? {} : { tool: 'paint' as const }) });
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    lastMove.current = performance.now();
    session.beginStroke(L.c, L.p, brush);
    usePaintStore.setState((s) => ({ hover: { c: L.c, p: L.p }, laneC: L.c, rev: s.rev + 1 }));
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    const { session } = usePaintStore.getState();
    const L = local(e);
    const sz = sizing.current;
    if (sz) {
      setBrush({
        size: Math.min(100, Math.max(0.5, sz.size + ((e.clientX - sz.x) / L.width) * 200)),
        hardness: Math.min(1, Math.max(0, sz.hardness - (e.clientY - sz.y) / 90)),
      });
      return;
    }
    if (session?.painting) {
      lastMove.current = performance.now();
      session.strokeTo(L.c, L.p);
      usePaintStore.setState((s) => ({ hover: { c: L.c, p: L.p }, laneC: L.c, rev: s.rev + 1 }));
      return;
    }
    usePaintStore.setState({ hover: { c: L.c, p: L.p }, laneC: L.c });
  };

  const finish = (): void => {
    if (sizing.current) { sizing.current = null; return; }
    const { session } = usePaintStore.getState();
    if (session?.painting) {
      session.endStroke();
      bumpPaint();
    }
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-10"
      style={{ cursor: 'none', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={() => { if (!usePaintStore.getState().session?.painting && !sizing.current) usePaintStore.setState({ hover: null }); }}
      // the bar's own right-click menu (the editor's track menu) must not open under a right-drag
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-gx-paint-surface=""
    >
      {/* the end gutters, then the same 256 → bar stretch the editor's own preview canvas uses */}
      <div ref={endARef} className="absolute top-0 bottom-0 left-0" style={{ width: GUTTER }} data-gx-paint-end="a" />
      <div ref={endBRef} className="absolute top-0 bottom-0 right-0" style={{ width: GUTTER }} data-gx-paint-end="b" />
      <canvas ref={rampRef} width={PAINT_TEXELS} height={1} className="absolute top-0 bottom-0 h-full" style={{ left: GUTTER, right: GUTTER, width: `calc(100% - ${2 * GUTTER}px)` }} data-gx-paint-ramp="" />
      <canvas ref={cursorRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
};

/**
 * The knot track's row while Paint is open: a thin line of the gradient as the face opened it.
 * Press and hold it and the bar shows that gradient until you let go.
 */
export const PaintBeforeLine: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = (): void => paintTexels(ref.current, usePaintStore.getState().session?.original);
    draw();
    return usePaintStore.subscribe((s, prev) => { if (s.session !== prev.session) draw(); });
  }, []);
  const hold = (on: boolean) => (e: React.PointerEvent): void => {
    e.stopPropagation();
    if (on) e.currentTarget.setPointerCapture(e.pointerId);
    usePaintStore.setState({ peeking: on });
  };
  return (
    <div className="absolute inset-0 flex items-center" data-gx-paint-before="">
      <div
        className="group w-full h-[10px] flex items-center cursor-pointer"
        title="As it was — hold to see it on the gradient"
        onPointerDown={hold(true)}
        onPointerUp={hold(false)}
        onPointerCancel={hold(false)}
      >
        <canvas ref={ref} width={PAINT_TEXELS} height={1} className="w-full h-[6px] rounded-[3px] opacity-85 transition-[height,opacity] group-hover:h-[9px] group-hover:opacity-100" />
      </div>
    </div>
  );
};
