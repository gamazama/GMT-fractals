/**
 * PickerWall — the gradient wall, matching the palette-lab prototype's layout:
 *   • one SECTION per group (category/source/none); the group label runs down the
 *     LEFT in a fixed column, then that group's swatch canvas(es).
 *   • within a group the sorted list fills COLUMN-MAJOR (k → col=⌊k/nrows⌋, row=k%nrows);
 *     a RANKED group (`PickerRow.rowMajor`, "More like this") fills ROW-major instead, so
 *     nearest-first reads left to right, top to bottom (grep cellOf / indexAt).
 *   • a group is split into CHUNKED canvases each capped at MAX_CANVAS_CSS_H so no
 *     single canvas exceeds the browser's max dimension (a huge ungrouped group in a
 *     narrow dock would otherwise be tens of thousands of px tall and hang the tab).
 *   • chunk canvases are VIRTUALIZED, not draw-once: an IntersectionObserver
 *     (rootMargin 500px) mounts and paints a chunk near the viewport and UNMOUNTS it
 *     once it scrolls away — toggling rather than latching, so a zoom step doesn't
 *     repaint every chunk ever seen. The wrapper div keeps its box so scroll space is
 *     reserved regardless. A chunk therefore repaints on each viewport re-entry, on a
 *     zoom commit (zoom scales swatchW/H, which are deps), and on a selection change —
 *     but never per frame, and never on a plain DOM scroll. Painting is one drawImage
 *     per swatch from the shared 256×N sprite; treat this effect as a hot path.
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
import type { PickerRow as PickerGroup } from '../core/pickerModel';
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

/**
 * A band of the wall. The shape is defined ONCE, in the pure model that builds them
 * (`palette/core/pickerModel.ts` → `PickerRow`), and re-exported here under the name every
 * caller already uses. Type-only, so this adds nothing to the bundle.
 */
export type { PickerRow as PickerGroup } from '../core/pickerModel';

/** Spatial-selection tool active on the wall. */
export type SelectionTool = 'rect' | 'lasso' | 'paint';

// --- Per-tool mouse cursors (N2) -------------------------------------------------
// Each tool gets a distinct cursor so the active mode reads at a glance: a marquee
// crosshair for rect, a lasso loop for lasso. Inline data-URI SVGs (white stroke +
// black halo so they show on any swatch colour); the keyword fallback after the url()
// covers a browser that rejects the asset. Paint keeps `none` — its cyan brush ring
// overlay (below) already IS the cursor.
const cursorUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const RECT_CURSOR = cursorUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>` +
    `<g fill='none' stroke='#000' stroke-width='3'><path d='M12 3v18M3 12h18'/>` +
    `<rect x='14' y='14' width='8' height='6'/></g>` +
    `<g fill='none' stroke='#fff' stroke-width='1.4'><path d='M12 3v18M3 12h18'/>` +
    `<rect x='14' y='14' width='8' height='6' stroke-dasharray='2 1.4'/></g></svg>`,
);
const LASSO_CURSOR = cursorUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>` +
    `<g fill='none' stroke-linecap='round' stroke-linejoin='round'>` +
    `<g stroke='#000' stroke-width='3'><ellipse cx='12' cy='9' rx='8' ry='5.5'/><path d='M7 13l-2 7'/></g>` +
    `<g stroke='#fff' stroke-width='1.4'><ellipse cx='12' cy='9' rx='8' ry='5.5'/><path d='M7 13l-2 7'/></g>` +
    `</g></svg>`,
);
/** CSS `cursor` value for the active selection tool (with a keyword fallback). */
const toolCursor = (tool: SelectionTool | null | undefined): string | undefined =>
  tool === 'rect'
    ? `${RECT_CURSOR} 12 12, crosshair`
    : tool === 'lasso'
      ? `${LASSO_CURSOR} 12 12, crosshair`
      : tool === 'paint'
        ? 'none'
        : undefined;

/**
 * At or above this tile WIDTH (px) the hover-enlarge preview is not drawn: the tile is
 * already legible, and the popover would only cover its neighbours. 96 sits between
 * `tileSizeFor`'s 80-wide step (a set of up to 160, still small enough to want the zoom)
 * and its 112-wide step (up to 60 — large bars that do not).
 */
const HOVER_PREVIEW_MAX_W = 96;

/** One band as the wall draws it — see `onViewport`. */
export interface WallBand {
  key: string;
  /** The facet bucket bounds (0..1) when the rows are bucketed; absent otherwise. */
  lo?: number;
  hi?: number;
  /** The band's edges in px from the top of the scroll box (negative = scrolled past). */
  top: number;
  bottom: number;
  visible: boolean;
}

/** The scroll box as `onViewport` reports it: where it is and how tall the whole wall is. */
export interface WallView {
  scrollTop: number;
  height: number;
  scrollHeight: number;
}

export interface PickerWallProps {
  groups: PickerGroup[];
  /** Shared 256×N sprite — row N is catalog entry `row`. */
  sprite: HTMLCanvasElement | null;
  /** A swatch click. The event rides along so a host can read modifiers (GE v2's
   *  Snapshots: shift-click arms a tween). */
  onPick: (entry: CatalogEntry, e?: React.MouseEvent) => void;
  /** A right-click on a swatch (the host opens its menu). Absent = the wall only swallows
   *  the native menu, as before. */
  onEntryContextMenu?: (entry: CatalogEntry, e: React.MouseEvent) => void;
  /** Every band AS DRAWN (after `mergeRows`, so a merged band carries the unioned range
   *  and its own key) with whether it intersects the viewport — reported on scroll, on
   *  resize and when the rows change (GE v2's pad-as-map draws the wall's viewport on the
   *  hue × lightness pad from this, and scrolls to a band by its key). rAF-throttled. */
  onViewport?: (bands: WallBand[], view: WallView) => void;
  /** Scroll so a band's top — or a point `frac` (0..1) of the way down it — sits at the top
   *  of the viewport; with no `key`, `frac` is of the whole scroll height (a plain
   *  scrollbar seek). Bump `seq` to fire again for the same target. */
  scrollToGroup?: { key?: string; frac?: number; seq: number } | null;
  /** Begin an HTML5 drag for the swatch under the pointer (e.g. drag into Favients). */
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
  /**
   * A gradient dropped ON a band — the host files it into whatever that band stands for
   * (GE v2, 2026-09-09: with several sets on the ground, dragging a tile from one band to
   * another MOVES it between groups; before this the wall had no drop target at all and
   * the only way to re-file was to drag onto a chip on the rail). Without the pair of
   * callbacks the wall takes no drops, exactly as before, so app-gmt and the old stage are
   * untouched.
   *
   * `beforeId` is the entry the drop lands IN FRONT OF, or null for the end of the band —
   * an ID, not a position, so a wall narrowed by search still says exactly which gradient
   * it means. That is what makes the drop a REORDER and not just a re-file: the shelf
   * panel has always placed to an exact index (grep `insertIndexFromPointer`) and the
   * ground could only ever append.
   */
  onBandDrop?: (bandKey: string, dataTransfer: DataTransfer, beforeId: string | null) => void;
  /** Whether THIS band would take THIS drag (the host decides: an auto-managed bin does
   *  not, and neither does the band the gradient is already in). */
  canBandDrop?: (bandKey: string, dataTransfer: DataTransfer) => boolean;
  /**
   * Make the wall keyboard-reachable (the migration audit's M14). ADDITIVE: without it the
   * wall has no tab stop and no key handling, exactly as before, so app-gmt and the old
   * stage opt in separately. With it: Tab focuses the wall, the arrows move a cursor ring
   * that is deliberately NOT the pick (a white hairline against the pick's accent ring),
   * Home / End jump to the ends, Enter or Space picks what the cursor is on, and Delete
   * asks the host to remove it. The wall was pointer-only until 2026-09-09.
   */
  keyboard?: boolean;
  /** Delete pressed on the focused tile. Absent = Delete does nothing. */
  onEntryDelete?: (entry: CatalogEntry) => void;
  /** Multi-selected tiles, drawn ringed + washed. Must be reference-stable. */
  selectedIds?: ReadonlySet<string>;
  /**
   * SELECT MODE: a carve commits the moment the drag ends, and there is no keep-click and
   * no dim. The catalogue's carve asks a second question after the marquee ("isolate or
   * cut?"), which is what the `chosen` phase and its scrim exist for; a selection has no
   * such question, so it must not inherit that second click — it would read as destroying
   * what you just chose.
   */
  selectMode?: boolean;
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
  /** Zoom tool (additive, 2026-09-03, Gradient Explorer v2 Browse): while true and no
   *  selection tool is active, a LEFT-drag runs the same zoom gesture middle-drag runs.
   *  Nothing else changes — picks still need a click without movement, and middle/right
   *  keep their meanings. Default false (every existing host). */
  zoomTool?: boolean;
  /** Corner radius (CSS px) drawn on every tile, the enlarged pick and the hover preview
   *  (additive, 2026-09-07, Gradient Explorer v2: "gradients and swatches always carry
   *  large rounding" — plans/ge-v2-unified-shell-plan.md §8, V8 as amended). A per-tile
   *  clip in the paint pass, which runs per chunk on layout, never per frame. Default 0 =
   *  the square tiles every existing host draws. */
  tileRadius?: number;
  /** Carve committed: the INSIDE id-set + whether to isolate (keep inside) or cut (drop inside). */
  onSelectionCommit?: (insideIds: string[], op: 'isolate' | 'cut' | 'select') => void;
  /** User cancelled (right-click / Esc-equivalent) — the host should deselect the tool. */
  onSelectionCancel?: () => void;
  /** A click on the wall that did NOT land on a swatch (an "empty-wall click") — the host
   *  deselects the current pick. Not fired while a selection tool is active. */
  onDeselect?: () => void;
  /** A gradient is in hand following the cursor (click-through pick, not a drag) — suppress
   *  the wall's own hover-zoom preview so it doesn't fight the floating avatar. */
  inHand?: boolean;
  /** Override the row-label gutter width (px). Default: 132 px, shrinking toward 0 on a
   *  narrow wall. A host showing an unlabelled set (GE v2's user sets) passes 0 so the
   *  tiles start at the wall's own left edge instead of behind an empty column. */
  gutter?: number;
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
  rowMajor: boolean;
}

/** The scheme's accent, for canvas strokes (the DOM gets it as a class). Read once per
 *  paint from the root's CSS variables; the cyan the wall always used is the fallback. */
const accentColour = (): string => {
  if (typeof document === 'undefined') return '#22d3ee';
  const cs = getComputedStyle(document.documentElement);
  // The scheme writes channels (`--accent-400: 34 211 238`, see tailwind.config.js), which
  // a canvas needs wrapped; a full colour string passes through.
  const c = cs.getPropertyValue('--accent-400').trim();
  if (/^\d+\s+\d+\s+\d+$/.test(c)) return `rgb(${c})`;
  return c || '#22d3ee';
};

/** k → (col, row) and back, for either fill order. */
const cellOf = (k: number, cols: number, nrows: number, rowMajor: boolean) =>
  rowMajor ? { col: k % cols, row: Math.floor(k / cols) } : { col: Math.floor(k / nrows), row: k % nrows };
const indexAt = (col: number, row: number, cols: number, nrows: number, rowMajor: boolean) =>
  rowMajor ? row * cols + col : col * nrows + row;

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
  /** The keyboard's cursor — drawn as a lighter ring than the pick's. */
  focusedId?: string;
  /** Multi-selected tiles (the carve, on a set). Reference-stable — see `wallSelection`. */
  selectedIds?: ReadonlySet<string>;
  chunkKey: string;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry, ev?: React.MouseEvent) => void;
  onEntryContextMenu?: (entry: CatalogEntry, e: React.MouseEvent) => void;
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
  onRegister: (key: string, desc: ChunkDesc | null) => void;
  /** A selection tool is active → drop the swatch's hand cursor so the wall's tool cursor
   *  (set on the scroll container, an inherited CSS property) shows over the swatches too. */
  toolActive?: boolean;
  tileRadius?: number;
  rowMajor?: boolean;
  /** This chunk's first index within its BAND (chunks are slices of one band's entries). */
  startIndex?: number;
  /** Report where a dragged gradient would be inserted, as a band-relative index. */
  onInsertAt?: (index: number) => void;
  /** Draw the insertion caret before this band-relative index (null = none). */
  caret?: number | null;
}> = ({ entries, sprite, cols, swatchW, swatchH, gap, selectedId, focusedId, selectedIds, chunkKey, onHover, onPick, onEntryContextMenu, onEntryDragStart, onRegister, toolActive, tileRadius = 0, rowMajor = false, startIndex = 0, onInsertAt, caret = null }) => {
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
    // tileRadius > 0: clip each tile to a rounded rect (the V8 large-rounding rule). The
    // radius is capped at a THIRD of the tile's short side so a thin tile stays a rounded
    // bar, not a pill (measured 2026-09-07: 8 px on an 18 px tile read as pills).
    const r = Math.min(tileRadius, swatchW / 3, swatchH / 3);
    for (let k = 0; k < entries.length; k++) {
      const { col, row } = cellOf(k, cols, nrows, rowMajor);
      if (r > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(col * cellW, row * cellH, swatchW, swatchH, r);
        ctx.clip();
      }
      ctx.drawImage(sprite, 0, entries[k].row, 256, 1, col * cellW, row * cellH, swatchW, swatchH);
      if (r > 0) ctx.restore();
    }
    // The selected swatch ENLARGES IN PLACE: redrawn last (on top of its neighbours),
    // oversized + centred on its cell, with a drop-shadow lift + a thin cyan ring. Clamped
    // to the canvas so a cell at a chunk edge isn't clipped. This is the wall's
    // rest→enlarge selection treatment — the hero shows the same pick at full size.
    // The selected tile wears a STROKE in place (V8: selected = a 2 px accent outline; the
    // owner, 2026-09-08: "it can just have a stroke instead of the popup" — the 1.8×
    // showcased copy with a shadow is gone; the hero shows the pick at full size). Drawn
    // inside the tile's edge so it never overlaps a neighbour at the small sizes; a dark
    // hairline just inside it keeps it legible on a ramp near the accent's own hue.
    const selIdx = selectedId ? entries.findIndex((e) => e.id === selectedId) : -1;
    if (selIdx >= 0) {
      const { col, row } = cellOf(selIdx, cols, nrows, rowMajor);
      const x = col * cellW, y = row * cellH;
      const r = Math.min(tileRadius, swatchW / 3, swatchH / 3);
      const ring = (inset: number, style: string, width: number) => {
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.beginPath();
        if (r > 0) ctx.roundRect(x + inset, y + inset, swatchW - inset * 2, swatchH - inset * 2, Math.max(0, r - inset));
        else ctx.rect(x + inset, y + inset, swatchW - inset * 2, swatchH - inset * 2);
        ctx.stroke();
      };
      ring(1, accentColour(), 2);
      ring(2.5, 'rgba(0,0,0,0.45)', 1);
    }
    // The MULTI-SELECTION: every chosen tile wears the same ring, drawn before the pick's
    // and the cursor's so those stay on top when they coincide. Tinted differently from the
    // pick (accent-300 against the pick's accent-400 + its dark hairline) because they mean
    // different things: one is what the hero shows, these are what the next action acts on.
    if (selectedIds && selectedIds.size) {
      const rr = Math.min(tileRadius, swatchW / 3, swatchH / 3);
      ctx.strokeStyle = accentColour();
      ctx.lineWidth = 2;
      for (let k = 0; k < entries.length; k++) {
        if (!selectedIds.has(entries[k].id)) continue;
        const { col, row } = cellOf(k, cols, nrows, rowMajor);
        const x = col * cellW, y = row * cellH;
        ctx.beginPath();
        if (rr > 0) ctx.roundRect(x + 1, y + 1, swatchW - 2, swatchH - 2, Math.max(0, rr - 1));
        else ctx.rect(x + 1, y + 1, swatchW - 2, swatchH - 2);
        ctx.stroke();
        // a translucent wash so a selected tile reads as chosen at a glance, not just edged
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = accentColour();
        ctx.fill();
        ctx.restore();
      }
    }
    // The KEYBOARD cursor, when it is somewhere other than the pick: a thinner ring in the
    // foreground colour, so "where the keys are" and "what is picked" never look the same.
    const focIdx = focusedId && focusedId !== selectedId ? entries.findIndex((e) => e.id === focusedId) : -1;
    if (focIdx >= 0) {
      const { col, row } = cellOf(focIdx, cols, nrows, rowMajor);
      const x = col * cellW, y = row * cellH;
      const rr = Math.min(tileRadius, swatchW / 3, swatchH / 3);
      const ring2 = (inset: number, style: string, width: number) => {
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.beginPath();
        if (rr > 0) ctx.roundRect(x + inset, y + inset, swatchW - inset * 2, swatchH - inset * 2, Math.max(0, rr - inset));
        else ctx.rect(x + inset, y + inset, swatchW - inset * 2, swatchH - inset * 2);
        ctx.stroke();
      };
      ring2(1, 'rgba(0,0,0,0.5)', 2.5);
      ring2(1, '#fff', 1.5);
    }
  }, [visible, entries, sprite, cols, nrows, cellW, cellH, swatchW, swatchH, cssW, cssH, selectedId, focusedId, selectedIds, rowMajor, tileRadius]);

  // Register this chunk for selection hit-testing while it's mounted; deregister on unmount
  // / when it scrolls away. The registry therefore only ever holds on-screen chunks → the
  // selection sees exactly what the user sees (off-screen swatches are unmounted).
  useEffect(() => {
    if (!visible) return;
    const el = canvasRef.current;
    if (!el) return;
    onRegister(chunkKey, { el, entries, cols, nrows, cellW, cellH, swatchW, swatchH, rowMajor });
    return () => onRegister(chunkKey, null);
  }, [visible, chunkKey, entries, cols, nrows, cellW, cellH, swatchW, swatchH, onRegister, rowMajor]);

  // Use getBoundingClientRect + clientX/Y (NOT offsetX/Y): under a CSS-transformed
  // ancestor (floating DraggableWindow uses translate), offsetX/Y is reported against
  // the untransformed layout, so picks land on the wrong swatch (offset by the translate).
  const hit = (e: React.MouseEvent): { entry: CatalogEntry; col: number; row: number } | null => {
    const cv = canvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellW);
    const row = Math.floor((e.clientY - rect.top) / cellH);
    if (col < 0 || row < 0 || row >= nrows || col >= cols) return null;
    const k = indexAt(col, row, cols, nrows, rowMajor);
    if (k < 0 || k >= entries.length) return null;
    return { entry: entries[k], col, row };
  };

  /**
   * Where a dragged gradient would land, in READING order — the same question the shelf
   * panel's `insertIndexFromPointer` answers over its DOM slots, asked of a canvas. The
   * left half of a tile means "before it", the right half "after it"; past the last tile
   * in a row means after that row's last. Returned band-relative (`startIndex + k`), so a
   * band split across several chunk canvases still yields one continuous index.
   *
   * Row-major only. Column-major is the catalogue's fill, and the catalogue has no order
   * of yours to rearrange — the caller does not offer reordering there.
   */
  const insertIndexAt = (clientX: number, clientY: number): number => {
    const cv = canvasRef.current;
    if (!cv) return startIndex;
    const rect = cv.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const row = Math.max(0, Math.min(nrows - 1, Math.floor(y / cellH)));
    const rawCol = x / cellW;
    const col = Math.max(0, Math.min(cols, Math.round(rawCol)));
    const k = Math.max(0, Math.min(entries.length, row * cols + col));
    return startIndex + k;
  };

  /** The caret's px position inside this chunk, or null when it belongs to another one. */
  const caretBox = (): { left: number; top: number } | null => {
    if (caret == null || !rowMajor) return null;
    const k = caret - startIndex;
    if (k < 0 || k > entries.length) return null;
    // Past the last tile: park it just after it rather than at the start of a phantom row.
    const at = Math.min(k, entries.length);
    const row = Math.min(nrows - 1, Math.floor(at / cols));
    const col = at - row * cols;
    return { left: col * cellW - gap / 2, top: row * cellH };
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

  const cb = caretBox();
  return (
    <div
      ref={wrapRef}
      className="relative"
      data-wall-chunk={chunkKey}
      data-wall-chunk-start={startIndex}
      data-wall-chunk-cols={cols}
      data-wall-chunk-cellw={cellW}
      data-wall-chunk-cellh={cellH}
      data-wall-chunk-rowmajor={rowMajor ? '1' : ''}
      style={{ width: cssW, height: cssH }}
    >
      {cb && (
        <div
          aria-hidden
          data-wall-caret=""
          className="absolute z-10 pointer-events-none rounded-full bg-accent-300"
          style={{ left: cb.left, top: cb.top, width: 2, height: swatchH }}
        />
      )}
      {visible && (
        <canvas
          ref={canvasRef}
          style={{ width: cssW, height: cssH }}
          className={`block ${toolActive ? '' : 'cursor-pointer'}`}
          draggable={!!onEntryDragStart}
          onDragOver={onInsertAt ? (e) => onInsertAt(insertIndexAt(e.clientX, e.clientY)) : undefined}
          onDragStart={(e) => {
            const h = hit(e);
            if (!h || !onEntryDragStart) {
              e.preventDefault();
              return;
            }
            // The drag visual is the shared cursor-following avatar — onEntryDragStart calls
            // beginCustomAvatarDrag, exactly like the hero. (A custom setDragImage here was
            // dead: the native-image suppression overrode it, and it differed the swatch path
            // from the hero's, which is why swatch→Favients didn't show the avatar/reorder the
            // same way.)
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
              onPick(h.entry, e);
            }
          }}
          onContextMenu={(e) => {
            if (!onEntryContextMenu) return;
            const h = hit(e);
            if (!h) return;
            e.preventDefault();
            e.stopPropagation();
            onEntryContextMenu(h.entry, e);
          }}
        />
      )}
    </div>
  );
};

// memo: with stable callbacks + a memoised `rows` array, hovering a swatch (which
// re-renders the wall to move the preview) skips re-rendering every group.
const GroupRow = React.memo(function GroupRow({ group, sprite, cols, labelW, swatchW, swatchH, gap, selectedId, focusedId, selectedIds, onHover, onPick, onEntryContextMenu, onEntryDragStart, onBandDrop, canBandDrop, onRegister, toolActive, tileRadius }: {
  group: PickerGroup;
  sprite: HTMLCanvasElement;
  cols: number;
  labelW: number;
  swatchW: number;
  swatchH: number;
  gap: number;
  selectedId?: string;
  focusedId?: string;
  selectedIds?: ReadonlySet<string>;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry, ev?: React.MouseEvent) => void;
  onEntryContextMenu?: (entry: CatalogEntry, e: React.MouseEvent) => void;
  onEntryDragStart?: (entry: CatalogEntry, dataTransfer: DataTransfer) => void;
  onBandDrop?: (bandKey: string, dataTransfer: DataTransfer, beforeId: string | null) => void;
  canBandDrop?: (bandKey: string, dataTransfer: DataTransfer) => boolean;
  onRegister: (key: string, desc: ChunkDesc | null) => void;
  toolActive?: boolean;
  tileRadius?: number;
}) {
  // Lit while a droppable gradient is over this band. Local state, so a drag over one band
  // does not re-render the others. `caret` is where in the band the drop would land — the
  // chunk canvases report it on dragover and one of them draws the bar.
  const [over, setOver] = React.useState(false);
  const [caret, setCaret] = React.useState<number | null>(null);
  const takes = (dt: DataTransfer): boolean => !!onBandDrop && (canBandDrop?.(group.key, dt) ?? true);
  const dropProps = onBandDrop
    ? {
        onDragOver: (e: React.DragEvent) => {
          if (!takes(e.dataTransfer)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!over) setOver(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          // Only when the pointer leaves the band itself — crossing a child would
          // otherwise flicker the highlight off and on.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOver(false);
          setCaret(null);
        },
        onDrop: (e: React.DragEvent) => {
          if (!takes(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          // The caret's index names the entry it sits in front of; past the last one it is
          // null, meaning the end of the band.
          const beforeId = caret == null ? null : group.entries[caret]?.id ?? null;
          setCaret(null);
          onBandDrop(group.key, e.dataTransfer, beforeId);
        },
      }
    : {};
  const cellH = swatchH + gap;
  const maxRows = Math.max(1, Math.floor(MAX_CANVAS_CSS_H / cellH));
  const chunkLen = Math.max(1, cols * maxRows);
  const chunks: CatalogEntry[][] = [];
  for (let i = 0; i < group.entries.length; i += chunkLen) chunks.push(group.entries.slice(i, i + chunkLen));

  return (
    <div
      className={`relative ${over ? 'outline outline-2 outline-dashed outline-gx-armed rounded-md' : ''}`}
      onDragEnd={() => setCaret(null)}
      data-wall-band={group.key}
      {...dropProps}
    >
      {/* Category label as a full-width header band (when present) — keeping it OUT of
          the per-bucket left gutter so a sparse bucket's gutter is a single short line
          that fits inside the swatch-row height (no leftover vertical gap). */}
      {group.label && (
        <div data-wall-header className="px-2 py-px text-[11px] leading-tight text-fg-secondary font-medium border-t border-line/10 truncate">
          {group.label}
        </div>
      )}
      <div className="flex items-stretch" data-wall-group={group.key} data-wall-lo={group.lo} data-wall-hi={group.hi}>
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
            <div className="text-[10px] text-fg-muted truncate w-full">
              {group.sublabel ? `${group.sublabel} ` : ''}
              <span className="text-fg-faint tabular-nums">({group.entries.length})</span>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          {chunks.map((chunk, ci) => (
          <SwatchCanvas
            key={ci}
            chunkKey={`${group.key}#${ci}`}
            entries={chunk}
            startIndex={ci * chunkLen}
            onInsertAt={onBandDrop ? setCaret : undefined}
            caret={over ? caret : null}
            sprite={sprite}
            cols={cols}
            swatchW={swatchW}
            swatchH={swatchH}
            gap={gap}
            selectedId={selectedId}
            focusedId={focusedId}
            selectedIds={selectedIds}
            toolActive={toolActive}
            tileRadius={tileRadius}
            rowMajor={!!group.rowMajor}
            onHover={onHover}
            onPick={onPick}
            onEntryContextMenu={onEntryContextMenu}
            onEntryDragStart={onEntryDragStart}
            onRegister={onRegister}
          />
          ))}
        </div>
      </div>
    </div>
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
  onEntryContextMenu,
  onViewport,
  scrollToGroup,
  onEntryDragStart,
  onBandDrop,
  canBandDrop,
  keyboard,
  onEntryDelete,
  selectedIds,
  selectMode,
  selectedId,
  swatchW = 32,
  swatchH = 18,
  gap = 0,
  onGesture,
  onZoomChange,
  resetZoomSignal,
  selectionTool = null,
  zoomTool = false,
  tileRadius = 0,
  onSelectionCommit,
  onSelectionCancel,
  onDeselect,
  inHand = false,
  gutter,
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
  const labelW = gutter != null ? Math.max(0, gutter) : Math.max(0, Math.min(LABEL_W, Math.round((LABEL_W * (width - 380)) / 320)));
  // cols is derived from the BASE swatch width (NOT the zoom), so horizontal zoom never
  // reflows the grid — it only widens the swatches + the content, which then scrolls.
  // The gap between tiles grows with the tile as DRAWN — zoomed in, or grown because the
  // set is small (owner, 2026-09-08: "when the wall is zoomed in, or with fewer tiles,
  // there should be more padding between gradients"). The host's `gap` (Padding) is the
  // floor; a 32 px tile keeps 2 px, a 96 px tile gets 7, a 192 px tile 14.
  const gapAt = (w: number) => Math.max(gap, Math.round(w / 14));
  const baseGap = gapAt(swatchW);
  const cols = Math.max(1, Math.floor((width - labelW - baseGap) / (swatchW + baseGap)));
  // Effective (zoomed) swatch render size + the resulting content width.
  const ewW = Math.max(1, Math.round(swatchW * zoom.x));
  const ewH = Math.max(1, Math.round(swatchH * zoom.y));
  // Global squarish reflow: when the WHOLE wall is small enough to otherwise be just a few
  // full-width strips, drop the (global) column count so the overall layout is squarish.
  // It's a single count for the wall — many small blocks each a couple of rows still tile
  // uniformly (and a content-heavy wall is a no-op: it stays full width).
  const totalEntries = groups.reduce((s, g) => s + g.entries.length, 0);
  const effGap = gapAt(ewW);
  const effCols = shouldSquare(totalEntries, cols, ewW + effGap, ewH + effGap)
    ? squareCols(totalEntries, ewW + effGap, ewH + effGap, cols)
    : cols;
  const contentWidth = labelW + effCols * (ewW + effGap);
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
    /** Select mode: shift/ctrl held at press — this marquee UNIONS with what is chosen. */
    additive: false,
    /** This gesture began on the BACKGROUND with no tool — a plain rubber band. */
    bgMarquee: false,
  });

  /**
   * Which shape this gesture is drawing. A carve TOOL says so explicitly; otherwise, in
   * select mode, a drag that began on the background is a plain rubber band (owner,
   * 2026-09-09: "multi select should not be using the cropping tool, it should just be
   * when dragging from the background"). Choosing several is the ordinary thing to want on
   * your own shelf — it should not cost a mode.
   */
  const effTool = (): SelectionTool | null => selectionTool ?? (sel.current.bgMarquee ? 'rect' : null);

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
        const { col, row } = cellOf(k, d.cols, d.nrows, d.rowMajor);
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
      if (col < 0 || row < 0 || row >= d.nrows || col >= d.cols) continue;
      const k = indexAt(col, row, d.cols, d.nrows, d.rowMajor);
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
          const k = indexAt(col, row, d.cols, d.nrows, d.rowMajor);
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
    // SELECT MODE ends here: the marquee IS the answer, so commit and drop the shape. The
    // catalogue's `chosen` phase — the scrim plus a second keep-click to say isolate or cut
    // — asks a question a selection does not have. Dropping the shape also sidesteps the
    // scrim's one real defect: it is viewport-pinned, so a scroll leaves it lying about
    // which tiles it covers (nothing clears it on scroll).
    if (selectMode) {
      const ids = [...s.insideIds];
      const additive = s.additive;
      clearSelectionState();
      // Shift or Ctrl held when the drag began UNIONS with what is already chosen — the way
      // to select past the fold, since a marquee can only ever reach mounted tiles.
      if (ids.length) onSelectionCommit?.(ids, additive ? 'select' : 'isolate');
      return;
    }
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
    const tool = effTool();
    e.preventDefault();
    if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) > MOVE_THRESH) s.moved = true;
    if (tool === 'rect') {
      if (s.moved) {
        s.phase = 'drawing';
        const a = toLocal(s.downX, s.downY);
        const b = toLocal(e.clientX, e.clientY);
        overlayDrawing({ kind: 'rect', box: rectFromDrag(a.x, a.y, b.x, b.y) });
      }
    } else if (tool === 'lasso') {
      if (s.moved) {
        s.phase = 'drawing';
        if (!s.pts.length) s.pts.push(toLocal(s.downX, s.downY));
        const lp = toLocal(e.clientX, e.clientY);
        const last = s.pts[s.pts.length - 1];
        if (Math.hypot(lp.x - last.x, lp.y - last.y) >= LASSO_MIN_DIST) s.pts.push(lp);
        overlayDrawing({ kind: 'lasso', pts: [...s.pts] });
      }
    } else if (tool === 'paint') {
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
    const tool = effTool();
    s.active = false;
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    if (s.moved) {
      // Finished drawing a fresh region.
      if (tool === 'rect') {
        const a = toLocal(s.downX, s.downY);
        const b = toLocal(e.clientX, e.clientY);
        finalizeChosen({ kind: 'rect', box: rectFromDrag(a.x, a.y, b.x, b.y) });
      } else if (tool === 'lasso') {
        if (s.pts.length >= 3) finalizeChosen({ kind: 'lasso', pts: [...s.pts] });
        else clearSelectionState();
      } else if (tool === 'paint') {
        if (s.paint.size) finalizeChosen({ kind: 'paint', rects: [...s.paint.values()] }, new Set(s.paint.keys()));
        else clearSelectionState();
      }
      s.bgMarquee = false;
    } else if (s.bgMarquee) {
      // A background CLICK (no drag) in select mode means "nothing" — the way clicking the
      // desktop clears a file selection.
      s.bgMarquee = false;
      clearSelectionState();
      if (selectedIds?.size) onSelectionCommit?.([], 'isolate');
    } else if (s.phase === 'chosen' && s.shape) {
      // A click (no drag) while a region is chosen = the keep-click. For deferred paint
      // taps this is exactly the keep-click case (paintPending, no move). isolate/cut by side.
      keepClickCommit(e.clientX, e.clientY);
    } else if (tool === 'paint') {
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
    const gapStart = gapAt(ewWStart);
    const contentX = labelW + (c.ax - labelW) * ((ewW + effGap) / (ewWStart + gapStart));
    const contentY = c.headerAbove + c.swatchAbove * ((ewH + effGap) / (ewHStart + gapStart));
    el.scrollLeft = Math.max(0, Math.min(contentX - c.relX, contentWidth - el.clientWidth));
    el.scrollTop = Math.max(0, Math.min(contentY - c.relY, el.scrollHeight - el.clientHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ewW, ewH]);

  const onPointerDown = (e: React.PointerEvent) => {
    // In SELECT MODE a left-drag from the BACKGROUND is a rubber band — no tool, the way
    // choosing several of anything works everywhere else (owner, 2026-09-09). A press ON a
    // tile is left alone: that is a pick, or the start of a drag.
    const bgPress =
      selectMode && !selectionTool && !zoomTool && e.button === 0 && !entryHitAtPoint(e.clientX, e.clientY);
    if (bgPress) sel.current.bgMarquee = true;
    // Selection (left button) takes over while a tool is active.
    if ((selectionTool || bgPress) && e.button === 0) {
      const el = scrollRef.current;
      if (!el) return;
      // … EXCEPT on a tile that is already selected, in select mode: pressing one of your
      // chosen tiles means "pick this batch up", so stand aside and let the browser start
      // an HTML5 drag. Capturing the pointer here (or preventDefault) would kill it before
      // dragstart, which is why the tool used to make the wall undraggable outright.
      if (selectMode && selectedIds?.size) {
        const h = entryHitAtPoint(e.clientX, e.clientY);
        if (h && selectedIds.has(h.id)) return;
      }
      e.preventDefault();
      setHover(null);
      el.setPointerCapture(e.pointerId);
      const s = sel.current;
      s.active = true;
      s.moved = false;
      s.additive = e.shiftKey || e.ctrlKey || e.metaKey;
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
    // The zoom tool makes a left-drag a zoom gesture (same path as middle-drag).
    const button = zoomTool && !selectionTool && e.button === 0 ? 1 : e.button;
    if (button !== 1 && button !== 2) return; // 1 = middle (zoom), 2 = right (pan)
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    // Zoom moves the wall out from under the viewport-pinned carve coords → cancel it
    // (keep the tool active so the user can re-draw at the new zoom).
    if (button === 1 && (sel.current.active || sel.current.phase !== 'idle')) clearSelectionState();
    commit.current = null;
    dragging.current = true;
    setHover(null);
    if (button === 2) {
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

  // On a touch device the floating zoom-preview is pure noise: a tap synthesises a
  // mouseenter/mousemove so the preview pops up and LINGERS over its neighbours until the
  // next tap — and it's redundant there anyway (the tapped swatch already enlarges in place
  // and the hero shows the pick). Kill it on coarse pointers; the desktop mouse keeps it.
  const coarsePointer = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
  );
  // Suppress hover while dragging, while a selection tool is active (the carve overlay, not
  // the zoom preview, is the relevant feedback then), OR while a gradient is in hand (the
  // floating click-through avatar already follows the cursor). Stable identity so memoised
  // GroupRows don't re-render on every hover.
  // The hover-enlarge preview exists so a SMALL tile can be seen. Once the tile is already
  // big — which it is whenever the ground holds a set rather than the catalogue, because
  // `tileSizeFor` grows the tile as the set shrinks — a 3× popover under the cursor shows
  // nothing new and covers the neighbours you were reaching for, including the band you were
  // about to drag onto (owner, 2026-09-09: "we don't need the huge mouseover previews when
  // the chips are so large"). So it is a function of the tile, not a setting: at or above
  // this width the tile IS the preview.
  const previewSuppressed = swatchW >= HOVER_PREVIEW_MAX_W;
  const handleHover = useCallback((h: Hover | null) => {
    if (previewSuppressed) return;
    if (!dragging.current && !selToolRef.current && !inHandRef.current && !coarsePointer.current) setHover(h);
  }, [previewSuppressed]);
  // Drop any showing preview the instant a gradient goes in hand, so it doesn't linger
  // under the avatar (the guard above only blocks NEW hovers).
  useEffect(() => { if (inHand) setHover(null); }, [inHand]);
  // Picks are suppressed while a tool is active (left-click is the carve keep-click).
  const handlePick = useCallback((entry: CatalogEntry, e?: React.MouseEvent) => {
    if (!selToolRef.current) onPick(entry, e);
  }, [onPick]);

  // Which bands are on screen (GE v2's pad-as-map): measured against the scroll box on
  // scroll, and again whenever the rows or the tile size change, rAF-throttled.
  const onViewportRef = useRef(onViewport);
  onViewportRef.current = onViewport;
  const hasViewport = !!onViewport;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasViewport) return;
    let raf = 0;
    const report = () => {
      raf = 0;
      const cb = onViewportRef.current;
      if (!cb) return;
      const r = el.getBoundingClientRect();
      const bands: WallBand[] = [];
      el.querySelectorAll<HTMLElement>('[data-wall-group]').forEach((b) => {
        const br = b.getBoundingClientRect();
        const lo = b.dataset.wallLo, hi = b.dataset.wallHi;
        bands.push({
          key: b.dataset.wallGroup!,
          lo: lo != null ? Number(lo) : undefined,
          hi: hi != null ? Number(hi) : undefined,
          top: br.top - r.top,
          bottom: br.bottom - r.top,
          visible: br.bottom > r.top && br.top < r.bottom,
        });
      });
      cb(bands, { scrollTop: el.scrollTop, height: r.height, scrollHeight: el.scrollHeight });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(report); };
    el.addEventListener('scroll', schedule, { passive: true });
    schedule();
    return () => { el.removeEventListener('scroll', schedule); if (raf) cancelAnimationFrame(raf); };
  }, [hasViewport, rows, width, ewH, sprite]);

  // Scroll a band to the top (the pad's thumb dragged / clicked).
  useEffect(() => {
    if (!scrollToGroup) return;
    const el = scrollRef.current;
    if (!el) return;
    if (scrollToGroup.key == null) {
      // a plain scrollbar seek: the fraction is of the whole wall
      el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, (scrollToGroup.frac ?? 0) * el.scrollHeight));
      return;
    }
    const band = el.querySelector<HTMLElement>(`[data-wall-group="${CSS.escape(scrollToGroup.key)}"]`);
    if (!band) return;
    const br = band.getBoundingClientRect();
    const top = br.top - el.getBoundingClientRect().top + el.scrollTop + (scrollToGroup.frac ?? 0) * br.height;
    el.scrollTop = Math.max(0, top - 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToGroup?.seq]);

  // ---- the keyboard cursor (M14) ---------------------------------------------------
  // A ring that moves with the arrows and is NOT the pick, so arrowing across the wall
  // costs nothing: Enter is what commits. Reading order comes from `rows`, which is what
  // the wall actually draws, so the cursor never lands on a tile that is not there.
  const flatIds = useMemo(() => rows.flatMap((r) => r.entries.map((e) => e.id)), [rows]);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const entryById = useCallback(
    (id: string): CatalogEntry | undefined => {
      for (const r of rows) {
        const e = r.entries.find((x) => x.id === id);
        if (e) return e;
      }
      return undefined;
    },
    [rows],
  );
  // A cursor whose tile has gone (a filter narrowed the wall, the set changed) goes with it.
  useEffect(() => {
    if (focusedId && !flatIds.includes(focusedId)) setFocusedId(undefined);
  }, [flatIds, focusedId]);

  /**
   * Bring the focused tile into view. The chunk canvases are VIRTUALIZED — one that has
   * scrolled away is unmounted — but their wrapper divs stay in the DOM to hold the scroll
   * space open, and they carry the geometry as data attributes. So the cursor can be moved
   * onto a tile that is not currently drawn and still scroll to exactly the right place.
   */
  const revealIndex = useCallback((flatIndex: number) => {
    const el = scrollRef.current;
    if (!el) return;
    // Which band, and how far into it.
    let seen = 0;
    let band: (typeof rows)[number] | null = null;
    let within = 0;
    for (const r of rows) {
      if (flatIndex < seen + r.entries.length) { band = r; within = flatIndex - seen; break; }
      seen += r.entries.length;
    }
    if (!band) return;
    const wraps = el.querySelectorAll<HTMLElement>(`[data-wall-chunk^="${CSS.escape(band.key)}#"]`);
    for (const w of wraps) {
      const start = Number(w.dataset.wallChunkStart ?? 0);
      const cols = Number(w.dataset.wallChunkCols ?? 1);
      const cellH = Number(w.dataset.wallChunkCellh ?? 1);
      const count = Math.round(w.offsetHeight / Math.max(1, cellH)) * cols;
      if (within < start || within >= start + count) continue;
      const k = within - start;
      const row = w.dataset.wallChunkRowmajor ? Math.floor(k / cols) : k % Math.max(1, Math.round(w.offsetHeight / Math.max(1, cellH)));
      const top = w.offsetTop + row * cellH;
      if (top < el.scrollTop) el.scrollTop = Math.max(0, top - cellH);
      else if (top + cellH > el.scrollTop + el.clientHeight) el.scrollTop = top + cellH - el.clientHeight + cellH;
      return;
    }
  }, [rows]);

  const moveFocus = useCallback(
    (delta: number, absolute?: 'first' | 'last') => {
      if (!flatIds.length) return;
      const cur = focusedId ? flatIds.indexOf(focusedId) : -1;
      const next =
        absolute === 'first' ? 0
        : absolute === 'last' ? flatIds.length - 1
        : cur < 0 ? (delta > 0 ? 0 : flatIds.length - 1)
        : Math.max(0, Math.min(flatIds.length - 1, cur + delta));
      setFocusedId(flatIds[next]);
      revealIndex(next);
    },
    [flatIds, focusedId, revealIndex],
  );

  const onWallKeyDown = (e: React.KeyboardEvent) => {
    if (!keyboard) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); moveFocus(1); break;
      case 'ArrowLeft': e.preventDefault(); moveFocus(-1); break;
      case 'ArrowDown': e.preventDefault(); moveFocus(effCols); break;
      case 'ArrowUp': e.preventDefault(); moveFocus(-effCols); break;
      case 'Home': e.preventDefault(); moveFocus(0, 'first'); break;
      case 'End': e.preventDefault(); moveFocus(0, 'last'); break;
      case 'Enter':
      case ' ': {
        if (!focusedId) return;
        const en = entryById(focusedId);
        if (!en) return;
        e.preventDefault();
        onPick(en);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!focusedId || !onEntryDelete) return;
        const en = entryById(focusedId);
        if (!en) return;
        e.preventDefault();
        // Step the cursor on BEFORE the tile goes, so the keyboard keeps its place.
        const i = flatIds.indexOf(focusedId);
        setFocusedId(flatIds[i + 1] ?? flatIds[i - 1]);
        onEntryDelete(en);
        break;
      }
      default:
        break;
    }
  };

  if (!sprite || width === 0) return <div ref={scrollRef} className="absolute inset-0" />;

  const f = hover?.entry.facets;

  return (
    <div className="absolute inset-0">
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto custom-scroll outline-none focus-visible:ring-1 focus-visible:ring-accent-400/60"
        {...(keyboard ? { tabIndex: 0, role: 'grid', 'aria-label': 'Gradients' } : {})}
        onKeyDown={keyboard ? onWallKeyDown : undefined}
        style={{ cursor: toolCursor(selectionTool) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => setBrushCursor(null)}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => { if (e.button === 1 || e.button === 2) e.preventDefault(); }}
        // A left-click that bubbles here didn't land on a swatch (swatch hits stopPropagation)
        // → empty-wall click → deselect. Suppressed while a carve tool is active. Also
        // suppressed on touch: a fat-finger near-miss that lands in a sub-pixel gap would
        // otherwise blank the active pick with no feedback near the finger (desktop keeps it —
        // the cursor is precise and Esc is the explicit deselect there).
        onClick={() => { if (!selectionTool && !coarsePointer.current) onDeselect?.(); }}
      >
        {/* `pb` keeps the last row clear of the floating readouts along the bottom edge;
            the LEFT margin is the `gutter` (0 on the catalogue, where the row labels use
            it; 24 on a set, where there are no labels but the tiles still want the shell's
            margin — owner, 2026-09-09). */}
        <div ref={contentRef} className="pb-14" style={{ width: contentWidth, transformOrigin: '0 0' }}>
          {rows.map((g) => (
            <GroupRow
              key={g.key}
              group={g}
              sprite={sprite}
              cols={effCols}
              labelW={labelW}
              swatchW={ewW}
              swatchH={ewH}
              gap={effGap}
              selectedId={selectedId}
              focusedId={focusedId}
              selectedIds={selectedIds}
              toolActive={!!selectionTool}
              tileRadius={tileRadius}
              onHover={handleHover}
              onPick={handlePick}
              onEntryContextMenu={selectionTool ? undefined : onEntryContextMenu}
              // A tool normally makes the tiles undraggable (a press is a marquee). In
              // select mode a chosen tile stays draggable — that is how a batch moves.
              onEntryDragStart={selectionTool && !(selectMode && selectedIds?.size) ? undefined : onEntryDragStart}
              onBandDrop={selectionTool && !selectMode ? undefined : onBandDrop}
              canBandDrop={canBandDrop}
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
                  radius: tileRadius > 0 ? Math.min(tileRadius * 1.8, hover.eh / 3) : undefined,
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
          className="absolute pointer-events-none rounded-full border border-accent-300/90"
          style={{
            left: brushCursor.x - brushRadius,
            top: brushCursor.y - brushRadius,
            width: brushRadius * 2,
            height: brushRadius * 2,
            zIndex: 6,
            background: 'rgb(var(--accent-400)/0.10)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </div>
  );
};

export default PickerWall;
