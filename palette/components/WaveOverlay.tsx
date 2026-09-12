/**
 * WaveOverlay — the function tool's ON-CANVAS controls, drawn over the curve plot.
 *
 * The whole point of this component is that the wave filter has ~10 parameters and NO
 * labelled sliders (owner, 2026-09-12: "we must think what these controls are showing …
 * with the least amount of text … if we can avoid extra ui then its a good tool"). Every
 * parameter that has a place on the plot is dragged AT that place, and the only text the
 * tool ever shows is the pill, and only while a drag is live.
 *
 * ── The rule that makes one gesture set cover five shapes ────────────────────────────────
 * X is always RATE ALONG T. Y is always AMOUNT. Noise has no cycles, so its X reads as
 * grain scale and nothing else has to change.
 *
 *   caliper under the curve  width IS one wavelength    drag X → wavelength
 *   circle, on the crest     drag X → phase             drag Y → amplitude
 *   crosshair, on the trough drag X → bias              drag Y → skew
 *   grey squares (feather)   drag X → feather, then span
 *   coral squares (span)     drag X → span
 *   the wave itself          drag Y → offset
 *
 * Four things here are decisions, not implementation details:
 *
 * • THE CALIPER IS THE WAVELENGTH. Its drawn width is the period, so "visualise wavelength
 *   on x" costs no extra ink. Its drawing clamps to the span when the period runs longer —
 *   the value keeps going, the picture stops — because a caliper wider than the thing it
 *   measures is worse than a clamped one.
 *
 * • THE FEATHER SQUARES ARE IN FRONT AND THEY PUSH THE SPAN (owner). Drag a shoulder
 *   inward and the feather grows; drag it outward, it shrinks to zero and then carries the
 *   span end with it. Four squares on one line collide on a 390 px phone when the span is
 *   narrow; this removes the collision rather than spacing around it, and a finger only
 *   ever needs the two front squares. The span squares stay grabbable behind them.
 *
 * • BIAS AND SKEW ARE THE GRAPH EDITOR'S OWN BIAS, not a second meaning of the word — the
 *   same power law, the same {@link BIAS_OCTAVE} px per power-of-two, the same `↔ / ↕`
 *   readout, and the same handle glyph (an accent circle carrying a crosshair and two
 *   offset dots). Grep `biasPow` in components/graph/GraphSelectionBBox.tsx.
 *
 * • THIS OVERLAY DRAWS NO CURVE. It used to draw the filtered result, because when it was
 *   written that was the only way to see one. Then the live preview landed (the filter is
 *   written INTO the track every frame, so the hero follows the drag) and `GraphCanvas`
 *   started drawing the same thing from the real keyframes — two cyan lines tracking each
 *   other a pixel apart, one the exact filter and one its Douglas-Peucker fit (owner,
 *   2026-09-12: "there's two displays of the wave happening at the same time"). The canvas
 *   owns the picture; this owns the handles. What is left here of the curve is an invisible
 *   fat stroke along it, so the wave itself stays grabbable.
 *
 * • THE HANDLES RIDE THE RESULT. The squares used to sit on a dashed "axis" — the filter at
 *   zero amplitude — which was a third line on a plot that needed one. They sit on the curve
 *   itself now, at their own t, which is where they were pointing at anyway; offset keeps
 *   the wave-body drag it already had.
 *
 * Nothing here writes to the track. The parent owns `params` and commits once, on ✓.
 *
 * @see palette/core/waveGen.ts (the maths) · plans/ge-v2-unified-shell-plan.md §10
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  BIAS_OCTAVE,
  applyWaveSample,
  waveValue,
  type WaveParams,
} from '../core/waveGen';

/** Handles this overlay owns. `dc` is the wave body (offset). */
type HandleId = 'a' | 'b' | 'fa' | 'fb' | 'lam' | 'pa' | 'bs' | 'dc';

interface Props {
  params: WaveParams;
  onChange: (next: WaveParams) => void;
  /** Opens the parent's undo bracket on the first move of a drag, closes it on release. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** The live readout, or null when no drag is running. The parent renders it in the
   *  editor's existing pill so the tool adds no new chrome. */
  onPill: (text: string | null) => void;
  width: number;
  height: number;
  /** Largest frame on the t axis (CURVE_FRAMES). */
  maxFrame: number;
  frameToCanvasPixel: (f: number) => number;
  /** Channel value → pixel Y, through the plot's current (possibly normalised) transform. */
  valueToPixelY: (v: number) => number;
  /** The track's value at a frame, as it stands before the filter. */
  sampleBase: (frame: number) => number;
  /** The active channel's plotted span in its own units — what the fractional amplitude
   *  and offset are fractions OF, so one drag feels identical on L, chroma and hue. */
  range: number;
  /** The active channel's colour. The crest circle wears it, so the handle reads as
   *  belonging to the track it edits. The CURVE is the canvas's to colour. */
  color: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * A square handle: 10 px drawn, 26 px hit — a coarse pointer needs the second number, and
 * it is the same 14 px-ish reach the phone pass gave the tangent handles.
 *
 * DEFINED AT MODULE SCOPE, not inside the overlay. A component declared inside a render is
 * a NEW COMPONENT TYPE on every render, so React unmounts and remounts its DOM — which
 * destroys the node holding the pointer capture the moment the first drag frame lands, and
 * the handle dies after one pixel. Found in the browser, 2026-09-12: the caliper (inline
 * JSX, stable) dragged and all four squares did not.
 */
const Square: React.FC<{
  x: number; y: number; stroke: string;
  onDown: (e: React.PointerEvent) => void;
}> = ({ x, y, stroke, onDown }) => (
  <g onPointerDown={onDown} style={{ cursor: 'ew-resize' }}>
    <rect x={x - 5} y={y - 5} width={10} height={10} rx={2} fill="rgb(var(--surface))" stroke={stroke} strokeWidth={1.75} />
    <rect x={x - 13} y={y - 13} width={26} height={26} fill="transparent" />
  </g>
);

export const WaveOverlay: React.FC<Props> = ({
  params, onChange, onDragStart, onDragEnd, onPill,
  width, height, maxFrame, frameToCanvasPixel, valueToPixelY, sampleBase, range, color,
}) => {
  const p = params;
  const tToX = useCallback((t: number) => frameToCanvasPixel(t * maxFrame), [frameToCanvasPixel, maxFrame]);
  const baseAt = useCallback((t: number) => sampleBase(t * maxFrame), [sampleBase, maxFrame]);

  /** The filtered curve as a path — INVISIBLE, and only so the wave stays grabbable. The
   *  canvas behind draws the visible one, from the keyframes the live preview writes. */
  const hitPath = useMemo(() => {
    const n = Math.max(80, Math.min(480, Math.round(width)));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      d += (i ? 'L' : 'M') + tToX(t).toFixed(1) + ' ' + valueToPixelY(applyWaveSample(baseAt(t), t, p, range)).toFixed(1);
    }
    return d;
  }, [p, width, tToX, valueToPixelY, baseAt, range]);

  /** Pixel-Y of the RESULT at t — where every handle sits, so each one is on the line it
   *  refers to rather than on a construction line drawn for their benefit. */
  const curveY = useCallback(
    (t: number) => valueToPixelY(applyWaveSample(baseAt(t), t, p, range)),
    [p, valueToPixelY, baseAt, range],
  );

  /**
   * Where the crest and trough handles sit: the extremum of the wave inside the FIRST
   * period after the span opens. Found by scanning rather than solved analytically because
   * it has to be right for a sawtooth, a pulse and noise too, none of which have a closed
   * form — and 96 samples of a cheap function is nothing next to a drag frame.
   */
  const extremum = useCallback((sign: 1 | -1) => {
    const lo = p.span[0];
    const hi = Math.min(p.span[1], lo + Math.max(1e-4, p.wavelength));
    let bt = lo;
    let bv = -Infinity;
    for (let i = 0; i <= 96; i++) {
      const t = lo + (hi - lo) * (i / 96);
      const v = waveValue(t, p) * sign;
      if (v > bv) { bv = v; bt = t; }
    }
    return bt;
  }, [p]);

  const drag = useRef<{ k: HandleId; x: number; y: number; s: WaveParams; moved: boolean } | null>(null);

  const onPointerDown = useCallback((k: HandleId) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { k, x: e.clientX, y: e.clientY, s: p, moved: false };
  }, [p]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dxp = e.clientX - d.x;
    const dyp = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dxp) < 2 && Math.abs(dyp) < 2) return;
      d.moved = true;
      onDragStart?.();
    }
    const dx = dxp / Math.max(1, width);
    const dy = dyp / Math.max(1, height);
    const o = d.s;
    const len = Math.max(1e-4, o.span[1] - o.span[0]);
    const next: WaveParams = { ...o };
    let pill = '';
    switch (d.k) {
      case 'dc':
        next.offset = clamp(o.offset - dy, -0.5, 1.5);
        pill = `offset ${next.offset.toFixed(2)}`;
        break;
      case 'a':
        next.span = [clamp(o.span[0] + dx, 0, o.span[1] - 0.01), o.span[1]];
        pill = `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      case 'b':
        next.span = [o.span[0], clamp(o.span[1] + dx, o.span[0] + 0.01, 1)];
        pill = `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      case 'fa': {
        // Inward grows the feather; outward shrinks it to zero and then PUSHES the span
        // end (owner) — so a finger never has to find the square behind this one.
        const want = o.feather[0] + dx / len;
        if (want >= 0) {
          next.feather = [Math.min(0.5, want), o.feather[1]];
        } else {
          next.feather = [0, o.feather[1]];
          next.span = [clamp(o.span[0] + o.feather[0] * len + dx, 0, o.span[1] - 0.01), o.span[1]];
        }
        pill = next.feather[0] > 0 || next.span[0] === o.span[0]
          ? `feather ${Math.round(next.feather[0] * 100)}%`
          : `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      }
      case 'fb': {
        const want = o.feather[1] - dx / len;
        if (want >= 0) {
          next.feather = [o.feather[0], Math.min(0.5, want)];
        } else {
          next.feather = [o.feather[0], 0];
          next.span = [o.span[0], clamp(o.span[1] - o.feather[1] * len + dx, o.span[0] + 0.01, 1)];
        }
        pill = next.feather[1] > 0 || next.span[1] === o.span[1]
          ? `feather ${Math.round(next.feather[1] * 100)}%`
          : `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      }
      case 'lam':
        // Multiplicative, so the caliper stretches like a spring rather than crawling
        // when it is short and bolting when it is long.
        next.wavelength = clamp(o.wavelength * Math.pow(2, dx * 4), 0.004, 2);
        pill = `λ ${next.wavelength.toFixed(3)}   ${(len / next.wavelength).toFixed(1)} cyc`;
        break;
      case 'pa':
        next.phase = o.phase - dx / Math.max(1e-4, o.wavelength);
        next.amplitude = clamp(o.amplitude - dy, 0, 1);
        pill = `phase ${(((next.phase % 1) + 1) % 1).toFixed(2)}   amp ${next.amplitude.toFixed(2)}`;
        break;
      case 'bs':
        next.bias = clamp(o.bias * Math.pow(2, dxp / BIAS_OCTAVE), 0.2, 5);
        next.skew = clamp(o.skew * Math.pow(2, -dyp / BIAS_OCTAVE), 0.2, 5);
        pill = `↔ ${next.bias.toFixed(2)}   ↕ ${next.skew.toFixed(2)}`;
        break;
    }
    onPill(pill);
    onChange(next);
  }, [width, height, onChange, onPill, onDragStart]);

  const endDrag = useCallback(() => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    onPill(null);
    if (moved) onDragEnd?.();
  }, [onPill, onDragEnd]);

  const xa = tToX(p.span[0]);
  const xb = tToX(p.span[1]);
  const len = Math.max(1e-4, p.span[1] - p.span[0]);
  const mid = (p.span[0] + p.span[1]) / 2;
  const halfLam = Math.min(p.wavelength, len) / 2;
  // The caliper hangs below the curve, so on one that dives at its middle it would hang off
  // the bottom of the plot, out of reach. Clamped into the canvas, and flipped ABOVE the
  // curve when there is no room below.
  const rawCalY = curveY(mid) + 22;
  const calY = rawCalY > height - 16 ? Math.max(16, curveY(mid) - 22) : Math.max(16, rawCalY);
  const ct = extremum(1);
  const tt = extremum(-1);
  const cx = tToX(ct);
  const cy = valueToPixelY(applyWaveSample(baseAt(ct), ct, p, range));
  const bx = tToX(tt);
  const by = valueToPixelY(applyWaveSample(baseAt(tt), tt, p, range));
  const faX = tToX(p.span[0] + p.feather[0] * len);
  const fbX = tToX(p.span[1] - p.feather[1] * len);

  return (
    <svg
      width={width}
      height={height}
      className="absolute top-0 left-0 z-20"
      style={{ width, height, touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* The wave body: an INVISIBLE fat stroke along the result, dragging the offset. The
          visible curve is the canvas's, drawn from the keyframes the preview writes — see
          the header. Two lines for one curve is what this replaced. */}
      <path d={hitPath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'ns-resize' }} onPointerDown={onPointerDown('dc')} />

      {/* the caliper: its WIDTH is one wavelength */}
      <g onPointerDown={onPointerDown('lam')} style={{ cursor: 'ew-resize' }}>
        <line x1={tToX(mid - halfLam)} y1={calY} x2={tToX(mid + halfLam)} y2={calY} stroke="rgb(var(--accent-400))" strokeWidth={1.75} />
        <line x1={tToX(mid - halfLam)} y1={calY - 6} x2={tToX(mid - halfLam)} y2={calY + 6} stroke="rgb(var(--accent-400))" strokeWidth={1.75} />
        <line x1={tToX(mid + halfLam)} y1={calY - 6} x2={tToX(mid + halfLam)} y2={calY + 6} stroke="rgb(var(--accent-400))" strokeWidth={1.75} />
        <circle cx={tToX(mid)} cy={calY} r={4} fill="rgb(var(--surface))" stroke="rgb(var(--accent-400))" strokeWidth={1.75} />
        <rect x={tToX(mid - halfLam)} y={calY - 13} width={Math.max(10, tToX(mid + halfLam) - tToX(mid - halfLam))} height={26} fill="transparent" />
      </g>

      {/* span ends BEHIND, feather shoulders IN FRONT (they push the span past zero) */}
      <Square x={xa} y={curveY(p.span[0])} stroke="#f0997b" onDown={onPointerDown('a')} />
      <Square x={xb} y={curveY(p.span[1])} stroke="#f0997b" onDown={onPointerDown('b')} />
      <Square x={faX} y={curveY(p.span[0] + p.feather[0] * len)} stroke="#9ca3af" onDown={onPointerDown('fa')} />
      <Square x={fbX} y={curveY(p.span[1] - p.feather[1] * len)} stroke="#9ca3af" onDown={onPointerDown('fb')} />

      {/* crest: phase (X) + amplitude (Y) */}
      <g onPointerDown={onPointerDown('pa')} style={{ cursor: 'move' }}>
        <circle cx={cx} cy={cy} r={6} fill="rgb(var(--surface))" stroke={color} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
      </g>

      {/* trough: bias (X) + skew (Y) — the graph editor's own Bias glyph */}
      <g onPointerDown={onPointerDown('bs')} style={{ cursor: 'crosshair' }}>
        <circle cx={bx} cy={by} r={8} fill="rgb(var(--accent-500) / 0.3)" stroke="rgb(var(--accent-300) / 0.7)" strokeWidth={1.5} />
        <path d={`M${bx} ${by - 4.5}V${by + 4.5}M${bx - 4.5} ${by}H${bx + 4.5}`} stroke="rgb(var(--accent-100))" strokeWidth={1.4} opacity={0.6} />
        <circle cx={bx - 2.2} cy={by - 2.2} r={1.5} fill="rgb(var(--accent-100))" />
        <circle cx={bx + 2.2} cy={by + 2.2} r={1.5} fill="rgb(var(--accent-100))" />
        <circle cx={bx} cy={by} r={15} fill="transparent" />
      </g>
    </svg>
  );
};

export default WaveOverlay;
