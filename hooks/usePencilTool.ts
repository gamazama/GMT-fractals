/**
 * usePencilTool — freehand "draw the curve" tool shared by BOTH graph editors
 * (the live timeline GraphEditor and the gradient ChannelGraphEditor).
 *
 * Toggle it on, then click-drag across the plot to sketch a curve. On release the
 * stroke is fit to clean, auto-tangented Bezier keyframes (CurveFitting.fitSamplesToKeys)
 * and merged into the target track — but ONLY across the horizontal span actually
 * drawn: keyframes outside that frame range are kept untouched, so a pencil pass
 * edits a region without wiping the rest of the line.
 *
 * "Normalize on start": the pixel→value mapping is captured at pen-down (the host's
 * `getTarget().toValue` closes over the track's value range / log-ness at that moment,
 * and the hook freezes the view), so the stroke maps cleanly into the track's range and
 * can't warp mid-draw.
 *
 * The host injects everything store-specific:
 *   • getTarget() — which track to draw, its colour, fit tolerance, and the pixel→value map
 *   • getKeys(trackId) — the track's current keyframes (to merge with)
 *   • commit(trackId, newKeys) — write them back as ONE undo entry (host brackets)
 */

import { useState, useRef, useCallback } from 'react';
import type { Keyframe } from '../types';
import type { GraphViewTransform } from '../utils/GraphUtils';
import { fitSamplesToKeys } from '../utils/CurveFitting';

/**
 * A pencil-shaped mouse cursor (white fill + black outline so it reads on any
 * background) for when pencil mode is ON — the changed cursor makes the changed
 * click-drag behaviour obvious. Hotspot = the nib (bottom-left). Apply via
 * `style={{ cursor: pencilMode ? PENCIL_CURSOR : undefined }}`.
 */
export const PENCIL_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24'%3E%3Cpath d='M14.5 3.5l6 6L9 21l-6 1.5L4.5 16z' fill='white' stroke='black' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M13 5l6 6' fill='none' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E\") 2 20, crosshair";

export interface PencilTarget {
  trackId: string;
  /** Stroke-preview colour. */
  color?: string;
  /** Douglas-Peucker tolerance (value units) for the fit. */
  eps: number;
  /** Pixel-Y → channel value, using the FROZEN view passed in (host owns log/range). */
  toValue: (py: number, view: GraphViewTransform) => number;
}

interface PencilOpts {
  interactionRef: React.RefObject<HTMLElement | null>;
  overlayRef: React.RefObject<HTMLCanvasElement | null>;
  view: GraphViewTransform;
  /** Largest valid frame (CURVE_FRAMES for the palette, durationFrames for the timeline). */
  maxFrame: number;
  frameToCanvasPixel: (f: number) => number;
  canvasPixelToFrame: (px: number) => number;
  getTarget: () => PencilTarget | null;
  getKeys: (trackId: string) => Keyframe[];
  commit: (trackId: string, newKeys: Keyframe[]) => void;
}

export const usePencilTool = ({
  interactionRef, overlayRef, view, maxFrame,
  frameToCanvasPixel, canvasPixelToFrame, getTarget, getKeys, commit,
}: PencilOpts) => {
  const [pencilMode, setPencilMode] = useState(false);
  const strokeRef = useRef<{
    target: PencilTarget;
    frozenView: GraphViewTransform;
    points: { frame: number; py: number }[];
  } | null>(null);

  const draw = useCallback(() => {
    const st = strokeRef.current;
    const cv = overlayRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!st || st.points.length < 1) return;
    ctx.beginPath();
    st.points.forEach((p, i) => {
      const x = frameToCanvasPixel(p.frame);
      if (i === 0) ctx.moveTo(x, p.py);
      else ctx.lineTo(x, p.py);
    });
    ctx.strokeStyle = st.target.color ?? '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [overlayRef, frameToCanvasPixel]);

  const onMove = useCallback((e: MouseEvent) => {
    const st = strokeRef.current;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!st || !rect) return;
    st.points.push({ frame: canvasPixelToFrame(e.clientX - rect.left), py: e.clientY - rect.top });
    draw();
  }, [interactionRef, canvasPixelToFrame, draw]);

  const onUp = useCallback(() => {
    const st = strokeRef.current;
    strokeRef.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    const cv = overlayRef.current;
    cv?.getContext('2d')?.clearRect(0, 0, cv.width, cv.height);
    if (!st || st.points.length < 2) return;

    // Map the stroke into channel-value space through the basis frozen at pen-down,
    // clamp frames into range, and sort by frame.
    const pts = st.points
      .map((p) => ({ f: Math.max(0, Math.min(maxFrame, p.frame)), v: st.target.toValue(p.py, st.frozenView) }))
      .sort((a, b) => a.f - b.f);
    const lo = Math.round(pts[0].f);
    const hi = Math.round(pts[pts.length - 1].f);
    if (hi <= lo) return; // a dot, not a stroke

    // Rasterize the drawn span to consecutive integer frames (linear interp between
    // stroke samples), then fit. Only the [lo,hi] span is touched.
    const spanVals: number[] = [];
    let j = 0;
    for (let f = lo; f <= hi; f++) {
      while (j < pts.length - 1 && pts[j + 1].f < f) j++;
      const a = pts[j];
      const b = pts[Math.min(pts.length - 1, j + 1)];
      const t = b.f > a.f ? (f - a.f) / (b.f - a.f) : 0;
      spanVals.push(a.v + (b.v - a.v) * t);
    }
    const spanKeys = fitSamplesToKeys(spanVals, lo, st.target.eps, `${st.target.trackId}-pen-${lo}-${hi}`);

    // Keep existing keys OUTSIDE the drawn span; splice the drawn keys in.
    const kept = getKeys(st.target.trackId).filter((k) => k.frame < lo || k.frame > hi);
    const merged = [...kept, ...spanKeys].sort((a, b) => a.frame - b.frame);
    if (merged.length < 2) return; // never leave a track with <2 keys
    commit(st.target.trackId, merged);
  }, [overlayRef, maxFrame, getKeys, commit, onMove]);

  const beginPencil = useCallback((e: React.MouseEvent) => {
    const rect = interactionRef.current?.getBoundingClientRect();
    const target = getTarget();
    if (!rect || !target) return;
    strokeRef.current = {
      target,
      frozenView: view,
      points: [{ frame: canvasPixelToFrame(e.clientX - rect.left), py: e.clientY - rect.top }],
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [interactionRef, getTarget, view, canvasPixelToFrame, onMove, onUp]);

  return { pencilMode, setPencilMode, beginPencil };
};
