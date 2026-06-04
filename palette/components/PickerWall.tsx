/**
 * PickerWall — the gradient wall, matching the palette-lab prototype's layout:
 *   • one SECTION per group (category/source/none); the group label runs down the
 *     LEFT in a fixed column, then that group's swatch canvas(es).
 *   • within a group the sorted list fills COLUMN-MAJOR (k → col=⌊k/nrows⌋, row=k%nrows).
 *   • a group is split into CHUNKED canvases each capped at MAX_CANVAS_CSS_H so no
 *     single canvas exceeds the browser's max dimension (a huge ungrouped group in a
 *     narrow dock would otherwise be tens of thousands of px tall and hang the tab).
 *   • each canvas is drawn ONCE (drawImage from the shared 256×N sprite); the page
 *     scrolls in the DOM — no per-frame redraw.
 *   • hover draws the swatch ZOOMED in place (3×w · 2×h, crisp) + a stats tooltip.
 *
 * Pure / host-agnostic: groups + sprite in, onPick out.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CatalogEntry } from '../core/presetCatalog';
import { GradientHoverPreview } from './GradientHoverPreview';

export interface PickerGroup {
  key: string;
  /** Primary label (e.g. the category) — blank to continue the previous one. */
  label: string;
  /** Secondary label (e.g. the facet row bucket). */
  sublabel?: string;
  entries: CatalogEntry[];
  /** Category id — adjacent groups sharing it (and a facet range) may merge into one row. */
  cat?: string;
  /** Facet bucket bounds (0..1) for a bucketed sub-row; absent = not row-mergeable. */
  lo?: number;
  hi?: number;
}

export interface PickerWallProps {
  groups: PickerGroup[];
  /** Shared 256×N sprite — row N is catalog entry `row`. */
  sprite: HTMLCanvasElement | null;
  onPick: (entry: CatalogEntry) => void;
  /** Begin an HTML5 drag for the swatch under the pointer (e.g. drag into Favients). */
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
  selectedId?: string;
  swatchW?: number;
  swatchH?: number;
  gap?: number;
  /** Fires when the user completes a zoom or pan gesture (drives the discovery hint). */
  onGesture?: (type: 'zoom' | 'pan') => void;
}

const LABEL_W = 132;
// Chunk height cap. Smaller chunks = finer windowing: only the ~viewport-worth of chunks
// stay mounted, so a zoom step redraws a small area instead of one giant canvas. (Also
// keeps the backing ×dpr well under the browser's max canvas dimension.)
const MAX_CANVAS_CSS_H = 2200;

/**
 * Merge adjacent bucketed sub-rows within the SAME category while their combined swatch
 * count still fits one screen-width row (≤ cols) — so sparse facet bands don't each
 * waste a whole row. Buckets that already overflow a row, and non-bucketed groups (no
 * lo/hi), pass through untouched. The category header rides the first group of its
 * category (group.label), so merging the trailing buckets preserves it; the merged
 * group's range sublabel + key are recomputed from the combined bounds.
 */
const mergeRows = (groups: PickerGroup[], cols: number): PickerGroup[] => {
  const out: PickerGroup[] = [];
  let acc: PickerGroup | null = null;
  const flush = () => { if (acc) { out.push(acc); acc = null; } };
  for (const g of groups) {
    const mergeable = g.lo != null && g.hi != null && g.entries.length <= cols;
    if (!mergeable) { flush(); out.push(g); continue; }
    if (acc && acc.cat === g.cat && acc.entries.length + g.entries.length <= cols) {
      const a: PickerGroup = acc; // explicit type — narrowing is lost across the `flush` closure
      acc = { ...a, lo: Math.min(a.lo!, g.lo!), hi: Math.max(a.hi!, g.hi!), entries: a.entries.concat(g.entries) };
    } else {
      flush();
      acc = { ...g };
    }
  }
  flush();
  return out.map((g) =>
    g.lo != null && g.hi != null
      ? { ...g, key: `${g.cat ?? ''}-${g.lo.toFixed(2)}-${g.hi.toFixed(2)}`, sublabel: `${g.lo.toFixed(1)}–${g.hi.toFixed(1)}` }
      : g,
  );
};

type Hover = { entry: CatalogEntry; ex: number; ey: number; ew: number; eh: number };

/** One bounded canvas: `entries` laid out column-major into cols×nrows. */
const SwatchCanvas: React.FC<{
  entries: CatalogEntry[];
  sprite: HTMLCanvasElement;
  cols: number;
  swatchW: number;
  swatchH: number;
  gap: number;
  selectedId?: string;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry) => void;
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
}> = ({ entries, sprite, cols, swatchW, swatchH, gap, selectedId, onHover, onPick, onEntryDragStart }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const cellW = swatchW + gap;
  const cellH = swatchH + gap;
  const nrows = Math.max(1, Math.ceil(entries.length / cols));
  // Keep the trailing cell gap: it's what spaces this canvas from the next bucket's rows,
  // so the `gap` (Padding) is uniform between EVERY row — within a canvas and across bucket
  // boundaries alike. At gap = 0 it's pixel-flush; raising Padding spaces all rows equally.
  const cssW = cols * cellW;
  const cssH = nrows * cellH;

  // Virtualize: only mount + draw this chunk's canvas while it's near the viewport, and
  // UNMOUNT it once it scrolls away. Toggling (not latching) is what keeps zooming cheap —
  // otherwise every chunk ever seen stays mounted and redraws on each zoom step. The
  // wrapper div keeps its width/height so scroll space is reserved either way.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { rootMargin: '500px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    // Cap DPR: the swatches are smooth gradients, so a 1.5× backing is plenty crisp and
    // halves the per-frame draw + reallocation cost vs 2× on a retina screen (zoom perf).
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = false;
    for (let k = 0; k < entries.length; k++) {
      const col = Math.floor(k / nrows);
      const row = k % nrows;
      const x = col * cellW;
      const y = row * cellH;
      ctx.drawImage(sprite, 0, entries[k].row, 256, 1, x, y, swatchW, swatchH);
      if (entries[k].id === selectedId) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, swatchW - 2, swatchH - 2);
      }
    }
  }, [visible, entries, sprite, cols, nrows, cellW, cellH, swatchW, swatchH, cssW, cssH, selectedId]);

  // Use getBoundingClientRect + clientX/Y (NOT offsetX/Y): under a CSS-transformed
  // ancestor (floating DraggableWindow uses translate), offsetX/Y is reported against
  // the untransformed layout, so picks land on the wrong swatch (offset by the translate).
  const hit = (e: React.MouseEvent): { entry: CatalogEntry; col: number; row: number } | null => {
    const cv = canvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellW);
    const row = Math.floor((e.clientY - rect.top) / cellH);
    if (col < 0 || row < 0 || row >= nrows) return null;
    const k = col * nrows + row;
    if (k < 0 || k >= entries.length) return null;
    return { entry: entries[k], col, row };
  };

  return (
    <div ref={wrapRef} style={{ width: cssW, height: cssH }}>
      {visible && (
        <canvas
          ref={canvasRef}
          style={{ width: cssW, height: cssH }}
          className="block cursor-pointer"
          draggable={!!onEntryDragStart}
          onDragStart={(e) => {
            const h = hit(e);
            if (!h || !onEntryDragStart) {
              e.preventDefault();
              return;
            }
            // Custom drag image = just the hovered swatch (matching the hover zoom), so the
            // ghost isn't the whole canvas sheet. Drawn into a throwaway off-screen canvas
            // that setDragImage snapshots synchronously, then removed next tick.
            const dw = swatchW * 3,
              dh = swatchH * 2;
            const di = document.createElement('canvas');
            const dpr = window.devicePixelRatio || 1;
            di.width = Math.round(dw * dpr);
            di.height = Math.round(dh * dpr);
            di.style.cssText = `position:fixed;top:-9999px;left:0;width:${dw}px;height:${dh}px`;
            const dctx = di.getContext('2d');
            if (dctx) {
              dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              dctx.imageSmoothingEnabled = false;
              dctx.drawImage(sprite, 0, h.entry.row, 256, 1, 0, 0, dw, dh);
              dctx.strokeStyle = '#fff';
              dctx.lineWidth = 1;
              dctx.strokeRect(0.5, 0.5, dw - 1, dh - 1);
            }
            document.body.appendChild(di);
            e.dataTransfer.setDragImage(di, dw / 2, dh / 2);
            setTimeout(() => di.remove(), 0);
            onEntryDragStart(h.entry, e.dataTransfer);
          }}
          onMouseMove={(e) => {
            const h = hit(e);
            if (!h) { onHover(null); return; }
            const rect = canvasRef.current!.getBoundingClientRect();
            const ew = swatchW * 3;
            const eh = swatchH * 2;
            onHover({
              entry: h.entry,
              ex: rect.left + h.col * cellW + swatchW / 2 - ew / 2,
              ey: rect.top + h.row * cellH + swatchH / 2 - eh / 2,
              ew,
              eh,
            });
          }}
          onMouseLeave={() => onHover(null)}
          onClick={(e) => {
            const h = hit(e);
            if (h) onPick(h.entry);
          }}
        />
      )}
    </div>
  );
};

// memo: with stable callbacks + a memoised `rows` array, hovering a swatch (which
// re-renders the wall to move the preview) skips re-rendering every group.
const GroupRow = React.memo(function GroupRow({ group, sprite, cols, labelW, swatchW, swatchH, gap, selectedId, onHover, onPick, onEntryDragStart }: {
  group: PickerGroup;
  sprite: HTMLCanvasElement;
  cols: number;
  labelW: number;
  swatchW: number;
  swatchH: number;
  gap: number;
  selectedId?: string;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry) => void;
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
}) {
  const cellH = swatchH + gap;
  const maxRows = Math.max(1, Math.floor(MAX_CANVAS_CSS_H / cellH));
  const chunkLen = Math.max(1, cols * maxRows);
  const chunks: CatalogEntry[][] = [];
  for (let i = 0; i < group.entries.length; i += chunkLen) chunks.push(group.entries.slice(i, i + chunkLen));

  return (
    <>
      {/* Category label as a full-width header band (when present) — keeping it OUT of
          the per-bucket left gutter so a sparse bucket's gutter is a single short line
          that fits inside the swatch-row height (no leftover vertical gap). */}
      {group.label && (
        <div data-wall-header className="px-2 py-px text-[11px] leading-tight text-zinc-200 font-medium border-t border-white/10 truncate">
          {group.label}
        </div>
      )}
      <div className="flex items-stretch">
        {/* Single centered line: "0.8–0.9 (23)" (range + count) — one line so it fits the
            swatch-row height (no leftover vertical gap on sparse buckets). This gutter is
            the lowest-priority column: on a narrow wall `labelW` shrinks toward 0 so the
            swatches keep their size; its label truncates (never wraps), and below a legible
            width the text is dropped entirely. */}
        <div
          className="shrink-0 flex items-center justify-end text-right leading-tight overflow-hidden"
          style={{ width: labelW, paddingLeft: labelW >= 28 ? 8 : 0, paddingRight: labelW >= 28 ? 8 : 0 }}
        >
          {labelW >= 28 && (
            <div className="text-[10px] text-zinc-400 truncate w-full">
              {group.sublabel ? `${group.sublabel} ` : ''}
              <span className="text-zinc-600 tabular-nums">({group.entries.length})</span>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          {chunks.map((chunk, ci) => (
          <SwatchCanvas
            key={ci}
            entries={chunk}
            sprite={sprite}
            cols={cols}
            swatchW={swatchW}
            swatchH={swatchH}
            gap={gap}
            selectedId={selectedId}
            onHover={onHover}
            onPick={onPick}
            onEntryDragStart={onEntryDragStart}
          />
          ))}
        </div>
      </div>
    </>
  );
});

/** Drag-per-doubling: pixels of pointer travel that double the zoom. */
const ZOOM_PX_PER_DOUBLE = 260;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 16;

export const PickerWall: React.FC<PickerWallProps> = ({
  groups,
  sprite,
  onPick,
  onEntryDragStart,
  selectedId,
  swatchW = 32,
  swatchH = 18,
  gap = 0,
  onGesture,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  // View-only magnification driven by middle-drag (independent of the base swatch size
  // the "Swatch size" control sets). x widens swatches + the content (horizontal scroll,
  // no reflow); y makes them taller (vertical scroll).
  const [zoom, setZoom] = useState({ x: 1, y: 1 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // The left label gutter is the lowest-priority column: full width on a roomy wall,
  // shrinking linearly to 0 as the wall narrows (≥700 → full, ≤380 → gone), so the
  // swatches keep their size on narrow screens instead of the gutter stealing space.
  const labelW = Math.max(0, Math.min(LABEL_W, Math.round((LABEL_W * (width - 380)) / 320)));
  // cols is derived from the BASE swatch width (NOT the zoom), so horizontal zoom never
  // reflows the grid — it only widens the swatches + the content, which then scrolls.
  const cols = Math.max(1, Math.floor((width - labelW - gap) / (swatchW + gap)));
  // Effective (zoomed) swatch render size + the resulting content width.
  const ewW = Math.max(1, Math.round(swatchW * zoom.x));
  const ewH = Math.max(1, Math.round(swatchH * zoom.y));
  const contentWidth = labelW + cols * (ewW + gap);
  // Merge sparse adjacent buckets that still fit one row (memoised — hover re-renders
  // the wall, and this walks every group).
  const rows = useMemo(() => mergeRows(groups, cols), [groups, cols]);

  // --- middle-drag zoom (live GPU transform, commit on release) · right-drag pan -----
  // Per-frame re-render + canvas redraw + scroll-set was laggy AND shaky. Instead, during
  // a zoom drag the content wrapper is scaled with a CSS transform around the grabbed point
  // — cheap (GPU), exact, and it touches neither React state nor scroll. On release we
  // commit ONCE: re-render the swatches crisp at the new size and set the real scroll so
  // the grabbed swatch lands exactly where it was, accounting for the fixed-height category
  // headers (which don't scale, so the swatch content above the cursor scales but they don't).
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<
    | { mode: 'zoom'; sx: number; sy: number; czx: number; czy: number; ax: number; ay: number; relX: number; relY: number; headerAbove: number; swatchAbove: number; lzx: number; lzy: number }
    | { mode: 'pan'; sx: number; sy: number; scrollLeft: number; scrollTop: number }
    | null
  >(null);
  const dragging = useRef(false);
  const commit = useRef<null | { relX: number; relY: number; ax: number; czx: number; czy: number; headerAbove: number; swatchAbove: number }>(null);
  const rafCoords = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);

  const applyLiveZoom = (clientX: number, clientY: number) => {
    const d = drag.current;
    const cw = contentRef.current;
    const el = scrollRef.current;
    if (!d || d.mode !== 'zoom' || !cw || !el) return;
    const lzx = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, d.czx * Math.pow(2, (clientX - d.sx) / ZOOM_PX_PER_DOUBLE)));
    // Y: drag UP to zoom in (taller swatches) — screen-y grows downward, so negate.
    const lzy = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, d.czy * Math.pow(2, (d.sy - clientY) / ZOOM_PX_PER_DOUBLE)));
    d.lzx = lzx; d.lzy = lzy;
    const sx = lzx / d.czx, sy = lzy / d.czy;
    // Scale around the grabbed point (origin 0,0 + a compensating translate), then clamp the
    // pan like a bounded scroll: the effective offset stays in [0, scaledContent − viewport].
    // Without this, zooming OUT leaves an empty gutter on the left/top that the (clamped)
    // commit then snaps away — the "pop". sl0/st0 are the real scroll at grab (unchanged here).
    const sl0 = d.ax - d.relX, st0 = d.ay - d.relY;
    const effX = Math.min(Math.max(sl0 - d.ax * (1 - sx), 0), Math.max(0, contentWidth * sx - el.clientWidth));
    const effY = Math.min(Math.max(st0 - d.ay * (1 - sy), 0), Math.max(0, el.scrollHeight * sy - el.clientHeight));
    cw.style.transform = `translate(${sl0 - effX}px, ${st0 - effY}px) scale(${sx}, ${sy})`;
  };

  // Commit: once the swatches have re-rendered at the new size, drop the live transform and
  // set the real scroll so the grabbed swatch is exactly where it was (header-aware).
  useLayoutEffect(() => {
    const c = commit.current;
    if (!c) return;
    commit.current = null;
    const cw = contentRef.current;
    if (cw) cw.style.transform = '';
    const el = scrollRef.current;
    if (!el) return;
    // Scale by the ACTUAL rounded rendered swatch sizes (ewW/ewH vs the committed-start
    // equivalents) — the layout rounds every swatch, and using the unrounded zoom ratio
    // instead lets that rounding accumulate into visible drift over many rows.
    const ewWStart = Math.max(1, Math.round(swatchW * c.czx));
    const ewHStart = Math.max(1, Math.round(swatchH * c.czy));
    const contentX = labelW + (c.ax - labelW) * ((ewW + gap) / (ewWStart + gap));
    const contentY = c.headerAbove + c.swatchAbove * ((ewH + gap) / (ewHStart + gap));
    el.scrollLeft = Math.max(0, Math.min(contentX - c.relX, contentWidth - el.clientWidth));
    el.scrollTop = Math.max(0, Math.min(contentY - c.relY, el.scrollHeight - el.clientHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ewW, ewH]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 1 && e.button !== 2) return; // 1 = middle (zoom), 2 = right (pan)
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    commit.current = null;
    dragging.current = true;
    setHover(null);
    if (e.button === 2) {
      drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
      el.style.cursor = 'grabbing';
    } else {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left, relY = e.clientY - rect.top;
      const ax = el.scrollLeft + relX, ay = el.scrollTop + relY;
      // Sum the fixed-height category-header bands above the cursor (one-time, at grab).
      let headerAbove = 0;
      el.querySelectorAll('[data-wall-header]').forEach((h) => {
        const r = (h as HTMLElement).getBoundingClientRect();
        const top = r.top - rect.top + el.scrollTop;
        if (top + r.height <= ay) headerAbove += r.height;
        else if (top < ay) headerAbove += ay - top;
      });
      drag.current = { mode: 'zoom', sx: e.clientX, sy: e.clientY, czx: zoom.x, czy: zoom.y, ax, ay, relX, relY, headerAbove, swatchAbove: ay - headerAbove, lzx: zoom.x, lzy: zoom.y };
      el.style.cursor = 'move';
    }
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    if (d.mode === 'pan') {
      const el = scrollRef.current!;
      el.scrollLeft = d.scrollLeft - (e.clientX - d.sx);
      el.scrollTop = d.scrollTop - (e.clientY - d.sy);
      return;
    }
    // zoom — coalesce to one transform update per frame
    rafCoords.current = { x: e.clientX, y: e.clientY };
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        const c = rafCoords.current;
        if (c) applyLiveZoom(c.x, c.y);
      });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    dragging.current = false;
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
    rafCoords.current = null;
    const el = scrollRef.current;
    if (el) { el.releasePointerCapture?.(e.pointerId); el.style.cursor = ''; }
    const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
    if (d.mode === 'pan') {
      if (moved > 5) onGesture?.('pan');
      return;
    }
    const nzx = moved < 5 ? 1 : d.lzx; // middle-click (no drag) resets to 1:1
    const nzy = moved < 5 ? 1 : d.lzy;
    if (nzx === d.czx && nzy === d.czy) {
      // no net change — the live transform is identity, just clear it
      if (contentRef.current) contentRef.current.style.transform = '';
      return;
    }
    // Commit: re-render at the new size; the layout effect drops the transform + re-pins.
    commit.current = { relX: d.relX, relY: d.relY, ax: d.ax, czx: d.czx, czy: d.czy, headerAbove: d.headerAbove, swatchAbove: d.swatchAbove };
    setZoom({ x: nzx, y: nzy });
    if (moved >= 5) onGesture?.('zoom');
  };

  // Suppress hover while dragging (pointer capture still lets the canvas mousemove fire).
  // Stable identity so memoised GroupRows don't re-render on every hover.
  const handleHover = useCallback((h: Hover | null) => { if (!dragging.current) setHover(h); }, []);

  if (!sprite || width === 0) return <div ref={scrollRef} className="absolute inset-0" />;

  const f = hover?.entry.facets;

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 overflow-auto custom-scroll"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => { if (e.button === 1 || e.button === 2) e.preventDefault(); }}
    >
      <div ref={contentRef} style={{ width: contentWidth, transformOrigin: '0 0' }}>
        {rows.map((g) => (
          <GroupRow
            key={g.key}
            group={g}
            sprite={sprite}
            cols={cols}
            labelW={labelW}
            swatchW={ewW}
            swatchH={ewH}
            gap={gap}
            selectedId={selectedId}
            onHover={handleHover}
            onPick={onPick}
            onEntryDragStart={onEntryDragStart}
          />
        ))}
      </div>

      <GradientHoverPreview
        hover={
          hover
            ? {
                ex: hover.ex,
                ey: hover.ey,
                ew: hover.ew,
                eh: hover.eh,
                paint: (ctx, w, h) => {
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(sprite, 0, hover.entry.row, 256, 1, 0, 0, w, h);
                },
                name: hover.entry.name,
                sub: f
                  ? `· ${hover.entry.theme ?? '—'} · ${hover.entry.bundle ?? '—'} · L ${f.lightness.toFixed(2)} · vivid ${f.chroma.toFixed(2)} · ${Math.round(f.raw.hueSpreadDeg)}°`
                  : undefined,
              }
            : null
        }
      />
    </div>
  );
};

export default PickerWall;
