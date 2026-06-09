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
 *   • the SELECTED swatch (selectedId) is drawn ENLARGED in place — oversized + centred on
 *     its cell, shadow-lifted above its neighbours, with a thin cyan ring. This is the
 *     wall's half of the shared pick (the CanonicalHero shows the same gradient full-size).
 *
 * Spatial selection (Lasso/Rect/Paint) co-exists with the pointer gestures: when a tool
 * is active the LEFT button draws a carve region, then a click inside (isolate) / outside
 * (cut) commits; middle-drag zoom + right-drag pan are unchanged (and either cancels an
 * in-progress selection — zoom/pan move the wall out from under viewport-pinned coords).
 *
 * Pure / host-agnostic: groups + sprite in, onPick + selection callbacks out.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CatalogEntry } from '../core/presetCatalog';
import { GradientHoverPreview } from './GradientHoverPreview';
import {
  pointInBox,
  pointInPolygon,
  rectFromDrag,
  swatchesInShape,
  type Box,
  type Pt,
  type SelShape,
  type SwatchCenter,
} from '../core/selectionGeometry';
import { SelectionOverlay, type SelectionOverlayState } from './SelectionOverlay';
import { shouldSquare, squareCols } from '../core/wallLayout';
import { setDragOrigin } from '../store/dragVisual';

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

/** Spatial-selection tool active on the wall. */
export type SelectionTool = 'rect' | 'lasso' | 'paint';

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
  /** Fires when the user completes a zoom / pan / middle-click-reset gesture (drives the hint). */
  onGesture?: (type: 'zoom' | 'pan' | 'reset') => void;
  /** Reports the committed zoom level (for a header readout). */
  onZoomChange?: (zoom: { x: number; y: number }) => void;
  /** Increment to reset the zoom to 1:1 (e.g. a header "reset" button). */
  resetZoomSignal?: number;
  /** Active spatial-selection tool (null = normal pick/drag interaction). */
  selectionTool?: SelectionTool | null;
  /** Carve committed: the INSIDE id-set + whether to isolate (keep inside) or cut (drop inside). */
  onSelectionCommit?: (insideIds: string[], op: 'isolate' | 'cut') => void;
  /** User cancelled (right-click / Esc-equivalent) — the host should deselect the tool. */
  onSelectionCancel?: () => void;
  /** A click on the wall that did NOT land on a swatch (an "empty-wall click") — the host
   *  deselects the current pick. Not fired while a selection tool is active. */
  onDeselect?: () => void;
  /** A gradient is in hand following the cursor (click-through pick, not a drag) — suppress
   *  the wall's own hover-zoom preview so it doesn't fight the floating avatar. */
  inHand?: boolean;
}

const LABEL_W = 132;
// Chunk height cap. Smaller chunks = finer windowing: only the ~viewport-worth of chunks
// stay mounted, so a zoom step redraws a small area instead of one giant canvas. (Also
// keeps the backing ×dpr well under the browser's max canvas dimension.)
const MAX_CANVAS_CSS_H = 2200;

// Selection gesture tuning.
const MOVE_THRESH = 5; // px of travel before a left-press counts as a drag (vs a click)
const LASSO_MIN_DIST = 4; // px between recorded lasso vertices (throttle)
const PAINT_STEP = 6; // px stride when interpolating the brush path between moves

type SelPhase = 'idle' | 'drawing' | 'chosen';

/** A mounted swatch chunk registered for selection hit-testing (visible chunks only). */
interface ChunkDesc {
  el: HTMLCanvasElement;
  entries: CatalogEntry[];
  cols: number;
  nrows: number;
  cellW: number;
  cellH: number;
  swatchW: number;
  swatchH: number;
}

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
  chunkKey: string;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry) => void;
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
  onRegister: (key: string, desc: ChunkDesc | null) => void;
}> = ({ entries, sprite, cols, swatchW, swatchH, gap, selectedId, chunkKey, onHover, onPick, onEntryDragStart, onRegister }) => {
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
      ctx.drawImage(sprite, 0, entries[k].row, 256, 1, col * cellW, row * cellH, swatchW, swatchH);
    }
    // The selected swatch ENLARGES IN PLACE: redrawn last (on top of its neighbours),
    // oversized + centred on its cell, with a drop-shadow lift + a thin cyan ring. Clamped
    // to the canvas so a cell at a chunk edge isn't clipped. This is the wall's
    // rest→enlarge selection treatment — the hero shows the same pick at full size.
    const selIdx = selectedId ? entries.findIndex((e) => e.id === selectedId) : -1;
    if (selIdx >= 0) {
      const col = Math.floor(selIdx / nrows);
      const row = selIdx % nrows;
      const ew = Math.max(Math.round(swatchW * 1.8), 40);
      const eh = Math.max(Math.round(swatchH * 1.8), 24);
      const cx = col * cellW + swatchW / 2;
      const cy = row * cellH + swatchH / 2;
      const ex = Math.max(0, Math.min(cx - ew / 2, cssW - ew));
      const ey = Math.max(0, Math.min(cy - eh / 2, cssH - eh));
      ctx.save();
      ctx.imageSmoothingEnabled = true; // smooth the showcased swatch (neighbours stay crisp)
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(sprite, 0, entries[selIdx].row, 256, 1, ex, ey, ew, eh);
      ctx.restore();
      // Dark keyline (reads on light ramps) under a thin cyan selection ring.
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex + 1.25, ey + 1.25, ew - 2.5, eh - 2.5);
    }
  }, [visible, entries, sprite, cols, nrows, cellW, cellH, swatchW, swatchH, cssW, cssH, selectedId]);

  // Register this chunk for selection hit-testing while it's mounted; deregister on unmount
  // / when it scrolls away. The registry therefore only ever holds on-screen chunks → the
  // selection sees exactly what the user sees (off-screen swatches are unmounted).
  useEffect(() => {
    if (!visible) return;
    const el = canvasRef.current;
    if (!el) return;
    onRegister(chunkKey, { el, entries, cols, nrows, cellW, cellH, swatchW, swatchH });
    return () => onRegister(chunkKey, null);
  }, [visible, chunkKey, entries, cols, nrows, cellW, cellH, swatchW, swatchH, onRegister]);

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

  // The swatch's HOVER-preview rect (3×w·2×h, the enlarged zoom the user is looking at) — the
  // morph source for the drag/click avatar. Shared by onDragStart + onClick.
  const setHoverOrigin = (col: number, row: number): void => {
    const cvr = canvasRef.current?.getBoundingClientRect();
    if (!cvr) return;
    const ew = swatchW * 3;
    const eh = swatchH * 2;
    setDragOrigin({
      left: cvr.left + col * cellW + swatchW / 2 - ew / 2,
      top: cvr.top + row * cellH + swatchH / 2 - eh / 2,
      width: ew,
      height: eh,
    });
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
            // The drag visual is the shared cursor-following avatar — onEntryDragStart calls
            // suppressNativeDragImage, exactly like the hero. (A custom setDragImage here was
            // dead: suppress overrode it, and it differed the swatch path from the hero's,
            // which is why swatch→Favients didn't show the avatar/reorder the same way.)
            // Morph the avatar out of the HOVER-enlarged preview (the 3×w·2×h zoom in front of
            // everything) — not the tiny grid cell. Then clear the hover so it doesn't linger.
            setHoverOrigin(h.col, h.row);
            onHover(null);
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
            // A swatch hit picks (and stops here); a MISS (a gap) bubbles to the wall's
            // onClick, which deselects — so an empty-wall click clears the pick.
            if (h) {
              e.stopPropagation();
              // Click-through: the pick goes in-hand and follows the cursor — morph it out of
              // the hover preview (same source as the drag) and clear the hover.
              setHoverOrigin(h.col, h.row);
              onHover(null);
              onPick(h.entry);
            }
          }}
        />
      )}
    </div>
  );
};

// memo: with stable callbacks + a memoised `rows` array, hovering a swatch (which
// re-renders the wall to move the preview) skips re-rendering every group.
const GroupRow = React.memo(function GroupRow({ group, sprite, cols, labelW, swatchW, swatchH, gap, selectedId, onHover, onPick, onEntryDragStart, onRegister }: {
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
  onRegister: (key: string, desc: ChunkDesc | null) => void;
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
            swatch-row height (no leftover vertical gap). This gutter is
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
            chunkKey={`${group.key}#${ci}`}
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
            onRegister={onRegister}
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
  onZoomChange,
  resetZoomSignal,
  selectionTool = null,
  onSelectionCommit,
  onSelectionCancel,
  onDeselect,
  inHand = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  // View-only magnification driven by middle-drag (independent of the base swatch size
  // the "Swatch size" control sets). x widens swatches + the content (horizontal scroll,
  // no reflow); y makes them taller (vertical scroll).
  const [zoom, setZoom] = useState({ x: 1, y: 1 });

  // Report the committed zoom up (header readout); reset to 1:1 on the host's reset signal.
  useEffect(() => { onZoomChange?.(zoom); }, [zoom, onZoomChange]);
  useEffect(() => {
    // Reset is only triggered when no drag is in flight, so there's no live transform to clear.
    if (resetZoomSignal) setZoom({ x: 1, y: 1 });
  }, [resetZoomSignal]);

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
  // Global squarish reflow: when the WHOLE wall is small enough to otherwise be just a few
  // full-width strips, drop the (global) column count so the overall layout is squarish.
  // It's a single count for the wall — many small blocks each a couple of rows still tile
  // uniformly (and a content-heavy wall is a no-op: it stays full width).
  const totalEntries = groups.reduce((s, g) => s + g.entries.length, 0);
  const effCols = shouldSquare(totalEntries, cols, ewW + gap, ewH + gap)
    ? squareCols(totalEntries, ewW + gap, ewH + gap, cols)
    : cols;
  const contentWidth = labelW + effCols * (ewW + gap);
  // Merge sparse adjacent buckets that still fit one row (memoised — hover re-renders the
  // wall, and this walks every group).
  const rows = useMemo(() => mergeRows(groups, effCols), [groups, effCols]);

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

  // --- spatial selection (Lasso / Rect / Paint) ------------------------------------
  const [selOverlay, setSelOverlay] = useState<SelectionOverlayState | null>(null);
  // Paint brush radius (px) + the live cursor position (local coords) that draws the ring.
  const [brushRadius, setBrushRadius] = useState(22);
  const brushRadiusRef = useRef(brushRadius);
  brushRadiusRef.current = brushRadius;
  const [brushCursor, setBrushCursor] = useState<Pt | null>(null);
  // Mirror the active tool into a ref so the canvas-level pick/hover handlers (which keep
  // stable identities for the memoised GroupRows) can read it without re-binding.
  const selToolRef = useRef(selectionTool);
  selToolRef.current = selectionTool;
  // Mirror "a gradient is in hand" so the stable hover handler reads it without re-binding.
  const inHandRef = useRef(inHand);
  inHandRef.current = inHand;
  // Registry of on-screen swatch chunks for hit-testing the carve region.
  const registry = useRef(new Map<string, ChunkDesc>());
  const registerChunk = useCallback((key: string, desc: ChunkDesc | null) => {
    if (desc) registry.current.set(key, desc);
    else registry.current.delete(key);
  }, []);
  // Authoritative selection state lives in a ref (mutated synchronously in pointer
  // handlers); `selOverlay` is the render-only mirror that drives SelectionOverlay.
  const sel = useRef({
    active: false,
    moved: false,
    phase: 'idle' as SelPhase,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    pts: [] as Pt[],
    paint: new Map<string, Box>(),
    eraser: false,
    /** Paint: a no-modifier press whose role (keep-click vs fresh stroke) isn't decided
     *  until we know whether it became a drag. */
    paintPending: false,
    shape: null as SelShape | null,
    insideIds: new Set<string>(),
  });

  const toLocal = (cx: number, cy: number): Pt => {
    const r = scrollRef.current!.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  };

  const clearSelectionState = useCallback(() => {
    const s = sel.current;
    s.active = false;
    s.moved = false;
    s.phase = 'idle';
    s.pts = [];
    s.paint = new Map();
    s.eraser = false;
    s.paintPending = false;
    s.shape = null;
    s.insideIds = new Set();
    setSelOverlay(null);
  }, []);

  // Changing tool (or turning it off via the host's Esc / outside-click cancel) discards
  // any in-progress carve and clears the hover preview.
  useEffect(() => {
    clearSelectionState();
    setHover(null);
    setBrushCursor(null);
  }, [selectionTool, clearSelectionState]);

  // [ / ] resize the paint brush (Photoshop convention), clamped to a sane range.
  useEffect(() => {
    if (selectionTool !== 'paint') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '[') setBrushRadius((r) => Math.max(6, r - 4));
      else if (e.key === ']') setBrushRadius((r) => Math.min(80, r + 4));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectionTool]);

  // Every on-screen swatch centre in local coords (for rect/lasso membership).
  const collectCenters = (): SwatchCenter[] => {
    const el = scrollRef.current;
    if (!el) return [];
    const host = el.getBoundingClientRect();
    const out: SwatchCenter[] = [];
    for (const d of registry.current.values()) {
      const r = d.el.getBoundingClientRect();
      const baseX = r.left - host.left;
      const baseY = r.top - host.top;
      for (let k = 0; k < d.entries.length; k++) {
        const col = Math.floor(k / d.nrows);
        const row = k % d.nrows;
        out.push({ id: d.entries[k].id, cx: baseX + col * d.cellW + d.swatchW / 2, cy: baseY + row * d.cellH + d.swatchH / 2 });
      }
    }
    return out;
  };

  // The swatch under a screen point (for the paint brush + paint keep-click) → id + local box.
  const entryHitAtPoint = (cx: number, cy: number): { id: string; box: Box } | null => {
    const el = scrollRef.current;
    if (!el) return null;
    const host = el.getBoundingClientRect();
    for (const d of registry.current.values()) {
      const r = d.el.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      const col = Math.floor((cx - r.left) / d.cellW);
      const row = Math.floor((cy - r.top) / d.cellH);
      if (col < 0 || row < 0 || row >= d.nrows) continue;
      const k = col * d.nrows + row;
      if (k < 0 || k >= d.entries.length) continue;
      return { id: d.entries[k].id, box: { x: r.left - host.left + col * d.cellW, y: r.top - host.top + row * d.cellH, w: d.swatchW, h: d.swatchH } };
    }
    return null;
  };

  // Stamp the brush at one screen point: every swatch whose centre is within `r` px is
  // added (or, in eraser mode, removed). Only the cells in the circle's bbox per chunk are
  // tested, so it stays cheap regardless of how many swatches are mounted.
  const addBrushAt = (cx: number, cy: number, r: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const host = el.getBoundingClientRect();
    const s = sel.current;
    for (const d of registry.current.values()) {
      const rect = d.el.getBoundingClientRect();
      if (cx + r < rect.left || cx - r > rect.right || cy + r < rect.top || cy - r > rect.bottom) continue;
      const lx = cx - rect.left, ly = cy - rect.top;
      const colMin = Math.max(0, Math.floor((lx - r) / d.cellW));
      const colMax = Math.min(d.cols - 1, Math.floor((lx + r) / d.cellW));
      const rowMin = Math.max(0, Math.floor((ly - r) / d.cellH));
      const rowMax = Math.min(d.nrows - 1, Math.floor((ly + r) / d.cellH));
      for (let col = colMin; col <= colMax; col++) {
        for (let row = rowMin; row <= rowMax; row++) {
          const k = col * d.nrows + row;
          if (k < 0 || k >= d.entries.length) continue;
          const ccx = col * d.cellW + d.swatchW / 2;
          const ccy = row * d.cellH + d.swatchH / 2;
          if (Math.hypot(lx - ccx, ly - ccy) > r) continue;
          const id = d.entries[k].id;
          if (s.eraser) s.paint.delete(id);
          else s.paint.set(id, { x: rect.left - host.left + col * d.cellW, y: rect.top - host.top + row * d.cellH, w: d.swatchW, h: d.swatchH });
        }
      }
    }
  };
  const addPaintPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const r = brushRadiusRef.current;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(1, Math.ceil(dist / Math.max(PAINT_STEP, r * 0.5)));
    for (let i = 1; i <= steps; i++) addBrushAt(fromX + ((toX - fromX) * i) / steps, fromY + ((toY - fromY) * i) / steps, r);
  };

  const overlayDrawing = (shape: SelShape) => setSelOverlay({ shape, phase: 'drawing', dimInside: false });

  // True if a screen point falls inside the current chosen shape (paint = over a brushed swatch).
  const isPointInside = (cx: number, cy: number): boolean => {
    const s = sel.current;
    if (!s.shape) return false;
    if (s.shape.kind === 'paint') {
      const h = entryHitAtPoint(cx, cy);
      return !!h && s.insideIds.has(h.id);
    }
    const p = toLocal(cx, cy);
    return s.shape.kind === 'rect' ? pointInBox(p, s.shape.box) : pointInPolygon(p, s.shape.pts);
  };

  const finalizeChosen = (shape: SelShape, presetInside?: Set<string>) => {
    const s = sel.current;
    s.shape = shape;
    s.insideIds = presetInside ?? swatchesInShape(shape, collectCenters());
    s.phase = 'chosen';
    setSelOverlay({ shape, phase: 'chosen', dimInside: !isPointInside(s.lastX, s.lastY) });
  };

  const keepClickCommit = (cx: number, cy: number) => {
    const s = sel.current;
    const inside = isPointInside(cx, cy);
    const ids = [...s.insideIds];
    clearSelectionState();
    onSelectionCommit?.(ids, inside ? 'isolate' : 'cut');
  };

  const updateDim = (cx: number, cy: number) => {
    const want = !isPointInside(cx, cy);
    setSelOverlay((prev) => (prev && prev.dimInside !== want ? { ...prev, dimInside: want } : prev));
  };

  const onSelMove = (e: React.PointerEvent) => {
    const s = sel.current;
    e.preventDefault();
    if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) > MOVE_THRESH) s.moved = true;
    if (selectionTool === 'rect') {
      if (s.moved) {
        s.phase = 'drawing';
        const a = toLocal(s.downX, s.downY);
        const b = toLocal(e.clientX, e.clientY);
        overlayDrawing({ kind: 'rect', box: rectFromDrag(a.x, a.y, b.x, b.y) });
      }
    } else if (selectionTool === 'lasso') {
      if (s.moved) {
        s.phase = 'drawing';
        if (!s.pts.length) s.pts.push(toLocal(s.downX, s.downY));
        const lp = toLocal(e.clientX, e.clientY);
        const last = s.pts[s.pts.length - 1];
        if (Math.hypot(lp.x - last.x, lp.y - last.y) >= LASSO_MIN_DIST) s.pts.push(lp);
        overlayDrawing({ kind: 'lasso', pts: [...s.pts] });
      }
    } else if (selectionTool === 'paint') {
      if (s.moved) {
        // A deferred no-modifier press that turned into a drag starts a FRESH stroke
        // (replacing any prior chosen set), matching how rect/lasso redraw replaces.
        if (s.paintPending) { s.paint = new Map(); s.paintPending = false; }
        addPaintPath(s.lastX, s.lastY, e.clientX, e.clientY);
        s.phase = 'drawing';
        overlayDrawing({ kind: 'paint', rects: [...s.paint.values()] });
      }
    }
    s.lastX = e.clientX;
    s.lastY = e.clientY;
  };

  const onSelUp = (e: React.PointerEvent) => {
    const s = sel.current;
    s.active = false;
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    if (s.moved) {
      // Finished drawing a fresh region.
      if (selectionTool === 'rect') {
        const a = toLocal(s.downX, s.downY);
        const b = toLocal(e.clientX, e.clientY);
        finalizeChosen({ kind: 'rect', box: rectFromDrag(a.x, a.y, b.x, b.y) });
      } else if (selectionTool === 'lasso') {
        if (s.pts.length >= 3) finalizeChosen({ kind: 'lasso', pts: [...s.pts] });
        else clearSelectionState();
      } else if (selectionTool === 'paint') {
        if (s.paint.size) finalizeChosen({ kind: 'paint', rects: [...s.paint.values()] }, new Set(s.paint.keys()));
        else clearSelectionState();
      }
    } else if (s.phase === 'chosen' && s.shape) {
      // A click (no drag) while a region is chosen = the keep-click. For deferred paint
      // taps this is exactly the keep-click case (paintPending, no move). isolate/cut by side.
      keepClickCommit(e.clientX, e.clientY);
    } else if (selectionTool === 'paint') {
      if (s.phase === 'drawing') {
        // A modifier tap (Shift/Ctrl) edited the set without moving — keep what's there.
        if (s.paint.size) finalizeChosen({ kind: 'paint', rects: [...s.paint.values()] }, new Set(s.paint.keys()));
        else clearSelectionState();
      } else {
        // A no-modifier paint tap with nothing chosen → stamp the brush once at the tap.
        s.paint = new Map();
        addBrushAt(e.clientX, e.clientY, brushRadiusRef.current);
        if (s.paint.size) finalizeChosen({ kind: 'paint', rects: [...s.paint.values()] }, new Set(s.paint.keys()));
        else clearSelectionState();
      }
    }
    // else: a stray click with nothing selected — ignore.
  };

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
    // Selection (left button) takes over while a tool is active.
    if (selectionTool && e.button === 0) {
      const el = scrollRef.current;
      if (!el) return;
      e.preventDefault();
      setHover(null);
      el.setPointerCapture(e.pointerId);
      const s = sel.current;
      s.active = true;
      s.moved = false;
      s.downX = e.clientX; s.downY = e.clientY;
      s.lastX = e.clientX; s.lastY = e.clientY;
      if (selectionTool === 'lasso') s.pts = [];
      if (selectionTool === 'paint') {
        s.eraser = e.ctrlKey;
        s.paintPending = false;
        if (e.shiftKey || e.ctrlKey) {
          // Shift = keep adding to the set, Ctrl = erase from it — edit immediately.
          addBrushAt(e.clientX, e.clientY, brushRadiusRef.current);
          s.phase = 'drawing';
          overlayDrawing({ kind: 'paint', rects: [...s.paint.values()] });
        } else {
          // No modifier: defer — a drag starts a fresh stroke, a tap is a keep-click
          // (when a region is already chosen) or a single-swatch selection (when idle).
          s.paintPending = true;
        }
      }
      return;
    }
    if (e.button !== 1 && e.button !== 2) return; // 1 = middle (zoom), 2 = right (pan)
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    // Zoom moves the wall out from under the viewport-pinned carve coords → cancel it
    // (keep the tool active so the user can re-draw at the new zoom).
    if (e.button === 1 && (sel.current.active || sel.current.phase !== 'idle')) clearSelectionState();
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
    if (selectionTool === 'paint') setBrushCursor(toLocal(e.clientX, e.clientY));
    if (sel.current.active) { onSelMove(e); return; }
    // Live dim flip while a region is chosen and the cursor hovers inside vs outside.
    if (selectionTool && sel.current.phase === 'chosen') { updateDim(e.clientX, e.clientY); return; }
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
      if (moved > 5) {
        onGesture?.('pan');
        if (sel.current.active || sel.current.phase !== 'idle') clearSelectionState(); // pan desyncs the overlay
      } else if (selectionTool) {
        // Right-click (no drag) = cancel the selection AND deselect the tool.
        clearSelectionState();
        onSelectionCancel?.();
      }
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
    // moved → a zoom drag; otherwise we only reach here on a middle-click that actually
    // reset a non-1:1 zoom (the no-change case early-returned above).
    onGesture?.(moved >= 5 ? 'zoom' : 'reset');
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (sel.current.active) { onSelUp(e); return; }
    endDrag(e);
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    if (sel.current.active) { sel.current.active = false; clearSelectionState(); return; }
    endDrag(e);
  };

  // Suppress hover while dragging, while a selection tool is active (the carve overlay, not
  // the zoom preview, is the relevant feedback then), OR while a gradient is in hand (the
  // floating click-through avatar already follows the cursor). Stable identity so memoised
  // GroupRows don't re-render on every hover.
  const handleHover = useCallback((h: Hover | null) => {
    if (!dragging.current && !selToolRef.current && !inHandRef.current) setHover(h);
  }, []);
  // Drop any showing preview the instant a gradient goes in hand, so it doesn't linger
  // under the avatar (the guard above only blocks NEW hovers).
  useEffect(() => { if (inHand) setHover(null); }, [inHand]);
  // Picks are suppressed while a tool is active (left-click is the carve keep-click).
  const handlePick = useCallback((entry: CatalogEntry) => {
    if (!selToolRef.current) onPick(entry);
  }, [onPick]);

  if (!sprite || width === 0) return <div ref={scrollRef} className="absolute inset-0" />;

  const f = hover?.entry.facets;

  return (
    <div className="absolute inset-0">
      <div
        ref={scrollRef}
        className={`absolute inset-0 overflow-auto custom-scroll ${selectionTool === 'paint' ? 'cursor-none' : selectionTool ? 'cursor-crosshair' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => setBrushCursor(null)}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => { if (e.button === 1 || e.button === 2) e.preventDefault(); }}
        // A left-click that bubbles here didn't land on a swatch (swatch hits stopPropagation)
        // → empty-wall click → deselect. Suppressed while a carve tool is active.
        onClick={() => { if (!selectionTool) onDeselect?.(); }}
      >
        <div ref={contentRef} style={{ width: contentWidth, transformOrigin: '0 0' }}>
          {rows.map((g) => (
            <GroupRow
              key={g.key}
              group={g}
              sprite={sprite}
              cols={effCols}
              labelW={labelW}
              swatchW={ewW}
              swatchH={ewH}
              gap={gap}
              selectedId={selectedId}
              onHover={handleHover}
              onPick={handlePick}
              onEntryDragStart={selectionTool ? undefined : onEntryDragStart}
              onRegister={registerChunk}
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

      {selOverlay && <SelectionOverlay overlay={selOverlay} />}

      {selectionTool === 'paint' && brushCursor && (
        <div
          className="absolute pointer-events-none rounded-full border border-cyan-300/90"
          style={{
            left: brushCursor.x - brushRadius,
            top: brushCursor.y - brushRadius,
            width: brushRadius * 2,
            height: brushRadius * 2,
            zIndex: 6,
            background: 'rgba(34,211,238,0.10)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </div>
  );
};

export default PickerWall;
