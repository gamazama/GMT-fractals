/**
 * GradientHoverPreview — the shared "hover a swatch → grow it + show its name" overlay,
 * used by both the Picker wall and the Favients shelf. A zoomed copy of the gradient
 * plus a name/details tooltip, positioned at screen coords.
 *
 * Portaled to <body> with a high z so it escapes the clipping + transform of a floating
 * DraggableWindow (the Favients panel) — a plain fixed child would be clipped to the
 * panel. The caller supplies a `paint` callback so the source can be anything (a sprite
 * row for the Picker, a config ramp for Favients).
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Keep the preview + tooltip this many px clear of the viewport edges.
const EDGE_MARGIN = 8;

export interface GradientHover {
  /** Screen rect for the zoomed preview (fixed-position CSS px). */
  ex: number;
  ey: number;
  ew: number;
  eh: number;
  /** Paint the zoomed gradient into the preview canvas (in CSS-pixel coords). */
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  name: string;
  /** Optional trailing details (facets line, source label…). */
  sub?: React.ReactNode;
}

const Z_PREVIEW = 9500; // above floating panels / overlays; pointer-events-none so harmless

export const GradientHoverPreview: React.FC<{ hover: GradientHover | null }> = ({ hover }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !hover) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(hover.ew * dpr);
    cv.height = Math.round(hover.eh * dpr);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, hover.ew, hover.eh);
    hover.paint(ctx, hover.ew, hover.eh);
  }, [hover]);

  // Clamp the preview + its tooltip inside the viewport. The caller anchors the
  // preview centred on the swatch, which overflows when the swatch sits near an
  // edge (e.g. the narrow docked Favients shelf). Done in a layout effect so the
  // corrected position is committed before the browser paints — no flash at the
  // unclamped spot. Centralised here so both the Picker wall and Favients shelf
  // (the two callers) get edge-safe previews for free.
  useLayoutEffect(() => {
    if (!hover) return;
    const cv = ref.current;
    if (!cv) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(EDGE_MARGIN, Math.min(hover.ex, vw - hover.ew - EDGE_MARGIN));
    const top = Math.max(EDGE_MARGIN, Math.min(hover.ey, vh - hover.eh - EDGE_MARGIN));
    cv.style.left = `${left}px`;
    cv.style.top = `${top}px`;

    const tip = tipRef.current;
    if (tip) {
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      // Prefer below the preview; flip above when it would run off the bottom.
      let tipTop = top + hover.eh + 8;
      if (tipTop + th + EDGE_MARGIN > vh) tipTop = top - th - 8;
      tipTop = Math.max(EDGE_MARGIN, Math.min(tipTop, vh - th - EDGE_MARGIN));
      const tipLeft = Math.max(EDGE_MARGIN, Math.min(left, vw - tw - EDGE_MARGIN));
      tip.style.left = `${tipLeft}px`;
      tip.style.top = `${tipTop}px`;
    }
  }, [hover]);

  if (!hover || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <canvas
        ref={ref}
        className="fixed pointer-events-none border border-fg rounded-[2px]"
        style={{ left: hover.ex, top: hover.ey, width: hover.ew, height: hover.eh, zIndex: Z_PREVIEW, boxShadow: '0 0 28px rgba(0,0,0,0.92)' }}
      />
      <div
        ref={tipRef}
        className="fixed pointer-events-none px-2 py-1 rounded bg-surface/95 border border-line/20 text-[11px] text-fg-secondary shadow-xl whitespace-nowrap"
        style={{ left: hover.ex, top: hover.ey + hover.eh + 8, zIndex: Z_PREVIEW }}
      >
        <span className="font-medium">{hover.name}</span>
        {hover.sub != null && <span className="text-fg-dim"> {hover.sub}</span>}
      </div>
    </>,
    document.body,
  );
};

export default GradientHoverPreview;
