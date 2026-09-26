/**
 * brushDraw — the brush's SHAPE, drawn the same way in the two places it appears.
 *
 * The shape is the brush's weight profile (`brushWeight`) plotted across its width: its width is
 * the size, its shoulders are the hardness, its height the strength. On the hero it is an OUTLINE
 * with a small curved TAB on top carrying what the brush lays down (owner, 2026-09-24: "the large
 * color overlay … is blocking the view, it should be an outline only, with a small curved 'tab'
 * showing the color"); in the tray's lane it is FILLED — nothing is under it there — and carries
 * the handles. One path function for both, so the two can never disagree about the profile.
 *
 * All sizes are in canvas pixels; callers pass `d` (device pixels per CSS px) for line weights.
 */

import { brushWeight, type PaintSession, type PaintBrush } from '../../core/paintRamp';
import type { RGB } from '../../core/oklab';

export const css = (c: RGB, a = 1): string => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;

/** A theme colour token ("34 202 236") as a canvas colour. Read at draw time, so a scheme
 *  switch (ADR-0080) is honoured on the next frame. */
export const token = (name: string, a = 1): string => {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';
  const parts = v.split(/[\s,]+/).filter(Boolean);
  return parts.length >= 3 ? `rgba(${parts[0]},${parts[1]},${parts[2]},${a})` : `rgba(255,255,255,${a})`;
};

/** The profile as a closed path standing on `baseY`, centred on `cx`, `height` tall. */
export const shapePath = (ctx: CanvasRenderingContext2D, cx: number, pxPerTex: number, baseY: number, height: number, r: number, hardness: number): void => {
  const span = r + 0.5;
  const halfW = span * pxPerTex;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, baseY);
  for (let s = 0; s <= 120; s++) {
    const u = -1 + (2 * s) / 120;
    ctx.lineTo(cx + u * halfW, baseY - height * brushWeight(Math.abs(u) * span, r, hardness));
  }
  ctx.lineTo(cx + halfW, baseY);
};

/** A white line on a dark halo — reads on any gradient under it. */
export const strokeOnAnything = (ctx: CanvasRenderingContext2D, d: number, width = 1.5): void => {
  ctx.lineJoin = 'round';
  ctx.lineWidth = (width + 1.7) * d;
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  ctx.lineWidth = width * d;
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.stroke();
};

/** What the brush would lay down at a centre: a colour (Paint), a slice to copy (Clone,
 *  Restore), or nothing (the brushes that rework what is there). */
export type BrushSource = { colour: RGB } | { from: Float32Array; offset: number; wrap: boolean } | null;

export const brushSource = (brush: PaintBrush, session: PaintSession, c: number): BrushSource => {
  if (brush.tool === 'paint') return { colour: brush.colour };
  if (brush.tool === 'clone') return { from: session.current, offset: session.cloneOffsetFor(c), wrap: brush.wrap };
  if (brush.tool === 'restore') return { from: session.original, offset: 0, wrap: brush.wrap };
  return null;
};

/** Fill the current path with a source's slice, texel column by texel column. */
const fillSlice = (ctx: CanvasRenderingContext2D, session: PaintSession, src: { from: Float32Array; offset: number; wrap: boolean }, cx: number, cC: number, pxPerTex: number, r: number, top: number, bottom: number, alpha: number): void => {
  ctx.save();
  ctx.clip();
  for (let i = Math.floor(cC - r - 1); i <= Math.ceil(cC + r + 1); i++) {
    ctx.fillStyle = css(session.sample(src.from, i + 0.5 + src.offset, src.wrap), alpha);
    ctx.fillRect(cx + (i - cC) * pxPerTex, top - 1, pxPerTex + 1, bottom - top + 2);
  }
  ctx.restore();
};

/**
 * THE HERO'S TAB — a small tab with curved shoulders standing on the top of the outline, filled
 * with the colour (or the squeezed slice) the brush lays down. Kept inside the canvas: a tall brush
 * pushes it down onto its own top rather than off the bar.
 */
export const colourTab = (ctx: CanvasRenderingContext2D, session: PaintSession, src: BrushSource, cx: number, top: number, cC: number, r: number, d: number): void => {
  if (!src) return;
  const tw = 24 * d, th = 10 * d, k = 5 * d;
  const y0 = Math.max(top, th + 2 * d);
  const L = cx - tw / 2, R = cx + tw / 2;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(L - k, y0);
    ctx.quadraticCurveTo(L, y0, L, y0 - k);
    ctx.lineTo(L, y0 - th + k);
    ctx.quadraticCurveTo(L, y0 - th, L + k, y0 - th);
    ctx.lineTo(R - k, y0 - th);
    ctx.quadraticCurveTo(R, y0 - th, R, y0 - th + k);
    ctx.lineTo(R, y0 - k);
    ctx.quadraticCurveTo(R, y0, R + k, y0);
    ctx.closePath();
  };
  path();
  if ('colour' in src) {
    ctx.fillStyle = css(src.colour);
    ctx.fill();
  } else {
    // the slice the brush covers, squeezed into the tab's width
    ctx.save();
    ctx.clip();
    const w = tw + 2 * k;
    for (let x = 0; x < w; x += d) {
      const u = x / w;
      ctx.fillStyle = css(session.sample(src.from, cC + src.offset + (u * 2 - 1) * (r + 0.5), src.wrap));
      ctx.fillRect(L - k + x, y0 - th - 1, d + 0.5, th + 2);
    }
    ctx.restore();
    path();
  }
  strokeOnAnything(ctx, d);
};

/**
 * THE LANE'S SHAPE — the outline is the stroke's ceiling (strength); a Paint, Clone or Restore
 * brush also shows its FLOW as a solid fill inside it: what one dab lays down.
 */
export const filledShape = (ctx: CanvasRenderingContext2D, session: PaintSession, brush: PaintBrush, cx: number, cC: number, pxPerTex: number, baseY: number, height: number, r: number, d: number): void => {
  const src = brushSource(brush, session, cC);
  if (src && 'colour' in src) {
    shapePath(ctx, cx, pxPerTex, baseY, height, r, brush.hardness);
    ctx.fillStyle = css(src.colour, 0.22);
    ctx.fill();
    shapePath(ctx, cx, pxPerTex, baseY, height * brush.flow, r, brush.hardness);
    ctx.fillStyle = css(src.colour, 0.95);
    ctx.fill();
  } else if (src) {
    shapePath(ctx, cx, pxPerTex, baseY, height, r, brush.hardness);
    fillSlice(ctx, session, src, cx, cC, pxPerTex, r, baseY - height, baseY, 0.3);
    shapePath(ctx, cx, pxPerTex, baseY, height * brush.flow, r, brush.hardness);
    fillSlice(ctx, session, src, cx, cC, pxPerTex, r, baseY - height, baseY, 0.95);
  } else {
    shapePath(ctx, cx, pxPerTex, baseY, height, r, brush.hardness);
    ctx.fillStyle = token('--fg', 0.08);
    ctx.fill();
  }
  shapePath(ctx, cx, pxPerTex, baseY, height, r, brush.hardness);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5 * d;
  ctx.strokeStyle = token('--fg', 0.9);
  ctx.stroke();
};

/** Clone's source: an accent ring over a line to the floor. */
export const sourceMark = (ctx: CanvasRenderingContext2D, x: number, y: number, floorY: number, d: number): void => {
  const accent = token('--accent-400');
  ctx.lineWidth = 3 * d;
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.moveTo(x, y + 5 * d); ctx.lineTo(x, floorY); ctx.stroke();
  ctx.lineWidth = 1.5 * d;
  ctx.strokeStyle = accent;
  ctx.beginPath(); ctx.moveTo(x, y + 5 * d); ctx.lineTo(x, floorY); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 5 * d, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
  ctx.lineWidth = 2 * d; ctx.strokeStyle = accent; ctx.stroke();
};
