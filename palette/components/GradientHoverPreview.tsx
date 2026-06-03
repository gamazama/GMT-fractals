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

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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

  if (!hover || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <canvas
        ref={ref}
        className="fixed pointer-events-none border border-white rounded-[2px]"
        style={{ left: hover.ex, top: hover.ey, width: hover.ew, height: hover.eh, zIndex: Z_PREVIEW, boxShadow: '0 0 28px rgba(0,0,0,0.92)' }}
      />
      <div
        className="fixed pointer-events-none px-2 py-1 rounded bg-zinc-900/95 border border-zinc-700 text-[11px] text-zinc-200 shadow-xl whitespace-nowrap"
        style={{ left: hover.ex, top: hover.ey + hover.eh + 8, zIndex: Z_PREVIEW }}
      >
        <span className="font-medium">{hover.name}</span>
        {hover.sub != null && <span className="text-zinc-500"> {hover.sub}</span>}
      </div>
    </>,
    document.body,
  );
};

export default GradientHoverPreview;
