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

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CatalogEntry } from '../core/presetCatalog';

export interface PickerGroup {
  key: string;
  /** Primary label (e.g. the category) — blank to continue the previous one. */
  label: string;
  /** Secondary label (e.g. the facet row bucket). */
  sublabel?: string;
  entries: CatalogEntry[];
}

export interface PickerWallProps {
  groups: PickerGroup[];
  /** Shared 256×N sprite — row N is catalog entry `row`. */
  sprite: HTMLCanvasElement | null;
  onPick: (entry: CatalogEntry) => void;
  selectedId?: string;
  swatchW?: number;
  swatchH?: number;
  gap?: number;
}

const LABEL_W = 132;
const MAX_CANVAS_CSS_H = 8000; // keep backing (×dpr) under the browser canvas max

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
}> = ({ entries, sprite, cols, swatchW, swatchH, gap, selectedId, onHover, onPick }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const cellW = swatchW + gap;
  const cellH = swatchH + gap;
  const nrows = Math.max(1, Math.ceil(entries.length / cols));
  const cssW = cols * cellW;
  const cssH = nrows * cellH;

  // Virtualize: only mount + draw this chunk's canvas when it's near the viewport.
  // Off-screen chunks are empty divs that still reserve their scroll space.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setVisible(true); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
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

const GroupRow: React.FC<{
  group: PickerGroup;
  sprite: HTMLCanvasElement;
  cols: number;
  swatchW: number;
  swatchH: number;
  gap: number;
  selectedId?: string;
  onHover: (h: Hover | null) => void;
  onPick: (e: CatalogEntry) => void;
}> = ({ group, sprite, cols, swatchW, swatchH, gap, selectedId, onHover, onPick }) => {
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
        <div className="px-2 pt-2 pb-0.5 text-[11px] text-zinc-200 font-medium border-t border-white/10">
          {group.label}
        </div>
      )}
      <div className="flex items-stretch border-b border-white/5">
        <div className="shrink-0 px-2 flex flex-col justify-center items-end text-right leading-tight" style={{ width: LABEL_W }}>
          {group.sublabel && <div className="text-[10px] text-zinc-400 truncate w-full">{group.sublabel}</div>}
          <div className="text-[10px] text-zinc-600 tabular-nums">{group.entries.length}</div>
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
          />
          ))}
        </div>
      </div>
    </>
  );
};

export const PickerWall: React.FC<PickerWallProps> = ({
  groups,
  sprite,
  onPick,
  selectedId,
  swatchW = 32,
  swatchH = 18,
  gap = 1,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(1, Math.floor((width - LABEL_W - gap) / (swatchW + gap)));

  useEffect(() => {
    const cv = zoomRef.current;
    if (!cv || !hover || !sprite) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(hover.ew * dpr);
    cv.height = Math.round(hover.eh * dpr);
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 0, hover.entry.row, 256, 1, 0, 0, cv.width, cv.height);
  }, [hover, sprite]);

  if (!sprite || width === 0) return <div ref={scrollRef} className="absolute inset-0" />;

  const f = hover?.entry.facets;

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-auto">
      {groups.map((g) => (
        <GroupRow
          key={g.key}
          group={g}
          sprite={sprite}
          cols={cols}
          swatchW={swatchW}
          swatchH={swatchH}
          gap={gap}
          selectedId={selectedId}
          onHover={setHover}
          onPick={onPick}
        />
      ))}

      {hover && (
        <>
          <canvas
            ref={zoomRef}
            className="fixed z-50 pointer-events-none border border-white"
            style={{ left: hover.ex, top: hover.ey, width: hover.ew, height: hover.eh, boxShadow: '0 0 28px rgba(0,0,0,0.92)' }}
          />
          {f && (
            <div
              className="fixed z-50 pointer-events-none px-2 py-1 rounded bg-zinc-900/95 border border-zinc-700 text-[11px] text-zinc-200 shadow-xl whitespace-nowrap"
              style={{ left: hover.ex, top: hover.ey + hover.eh + 8 }}
            >
              <span className="font-medium">{hover.entry.name}</span>
              <span className="text-zinc-500">
                {' · '}{hover.entry.theme ?? '—'}{' · '}{hover.entry.bundle ?? '—'}{' · L '}{f.lightness.toFixed(2)}
                {' · vivid '}{f.chroma.toFixed(2)}{' · '}{Math.round(f.raw.hueSpreadDeg)}°
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PickerWall;
