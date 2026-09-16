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
 *   circle, on the crest     drag X → phase             drag Y → amplitude  (held on the plot)
 *   crosshair, in its zone   drag X → bias              drag Y → skew
 *   caliper, on the floor    width IS one wavelength    drag X → wavelength
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
 *   THE Y AXIS WAS INVERTED against that claim until 2026-09-12 (owner: "i think its y axis
 *   feels flipped"). It was, and provably: `GraphSelectionBBox` computes `gy` from `+bdy`
 *   and says so in a comment — "up → bunch toward higher values" — while this took `-dyp`,
 *   so dragging UP pushed the wave DOWN. Both now read `2 ** (dyp / BIAS_OCTAVE)`, and the
 *   curve follows the finger. (X is deliberately the other sign from the editor's `gx`, and
 *   that is not a matching bug: the editor biases key POSITIONS, this biases PHASE, and
 *   phase moves a feature the opposite way from the number that warps it. Drag right, the
 *   crest goes right — which is the test that matters.)
 *
 * • THE TWO SHAPE HANDLES SIT ON THE FLOOR, not on the curve. They hung from `curveY(mid)`,
 *   so every amplitude or phase drag made them jump around under the pointer (owner: "the
 *   wavelength and bias controls bouncing up and down - they should stay at the min point").
 *   They are pinned to the bottom of the plot now: a fixed dock that cannot move while you
 *   are dragging something else. Bias and skew warp the WHOLE waveform and a wavelength is a
 *   property of the whole span, so neither was ever pointing at a place on the curve — the
 *   crest circle is the one that genuinely is, and it still rides the line.
 *
 * • THE BIAS HANDLE HAS A ZONE (owner: "should have a little zone that denotes its
 *   position"). A relative drag with the handle nailed to one spot could not answer "am I
 *   biased, and how far?" — the pill said so only while a drag was live. The crosshair now
 *   walks a small square whose centre is neutral (1, 1) and whose walls are the clamp
 *   (0.2 … 5, so ±log2(5) octaves). It is a GAUGE, not a pad: the drag stays at the tuned
 *   150 px per octave, and the marker crosses its zone over the full 696 px that the whole
 *   range costs. Grabbing anywhere inside the square starts the drag, which also makes it a
 *   far bigger target than the 15 px circle it replaces.
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
import { GRAPH_RULER_HEIGHT } from '../../data/constants';

/** Handles this overlay owns. `dc` is the wave body (offset). */
type HandleId = 'a' | 'b' | 'fa' | 'fb' | 'lam' | 'pa' | 'bs' | 'dc';

interface Props {
  /** Pixels at the TOP of the plot that something else covers — the tool head floats there
   *  on a desk. The crest handle is kept below this (and below the ruler, whichever is more). */
  topInset?: number;
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
 * How far a shoulder may reach, as a fraction of the span (owner, 2026-09-12: "the feather
 * controls need to be able to go to 99%"). It was half, which stopped a shoulder at the
 * middle and made a fully-soft wave impossible. At 99 % from both ends the two shoulders
 * overlap and `waveEnvelope`'s `min` resolves it into a smooth bump that peaks a little above
 * half — which is a legitimate shape to want, not a degenerate one, so nothing clamps it
 * further. Not 100 %: a shoulder the full width of the span leaves no span.
 */
const FEATHER_MAX = 0.99;

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
  topInset = 0,
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
   * Where the CREST handle sits: the wave's maximum in the LAST PERIOD BEFORE THE SPAN'S
   * CENTRE (owner, 2026-09-12: "the amplitude control feels hidden and should maybe rather be
   * on the first crest left of the centre").
   *
   * It used to take the first crest after the span OPENS, which put it in the busiest place
   * on the plot — inside the feather shoulder, among the span square, the feather square and
   * whatever the curve was doing as it climbed out of the envelope. Hidden was the right
   * word. A period in from the middle is open ground, and it is still a real crest of the
   * real wave rather than a marker parked at a convenient spot.
   *
   * Found by scanning rather than solved analytically because it has to be right for a
   * sawtooth, a pulse and noise too, none of which have a closed form — and 96 samples of a
   * cheap function is nothing next to a drag frame.
   */
  const crest = useCallback(() => {
    const m = (p.span[0] + p.span[1]) / 2;
    // A span narrower than one period has no "period before the middle"; take what there is.
    const lo = Math.max(p.span[0], m - Math.max(1e-4, p.wavelength));
    let bt = lo;
    let bv = -Infinity;
    for (let i = 0; i <= 96; i++) {
      const t = lo + (m - lo) * (i / 96);
      const v = waveValue(t, p);
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
    /**
     * X moves along the PLOT'S t AXIS, not across the canvas (2026-09-16). This divided by
     * the canvas width, but t spans only the plot inside it — the canvas less the value
     * gutter and the end pad — so every handle placed at a t trailed its pointer: a 96 px drag
     * moved a span square 77.5 px on a 1280 px desk. `tToX` is the mapping every handle here
     * is DRAWN through, so a drag read through it puts the handle back under the pointer.
     * Phase reads it too, so the crest keeps pace with the pointer (until it hops a period).
     * The caliper does not: its drag is a multiplicative rate, not a position — see 'lam'.
     *
     * @invariant a span or feather square travels with the pointer 1:1 along t — proven by:
     *   npm run smoke:ge-wave ("[9] span and feather squares keep up with the pointer (within
     *   2 px over a 96 px drag)"). Falsified 2026-09-16 with the canvas width back: [9] red alone.
     */
    const dt = dxp / Math.max(1, tToX(1) - tToX(0));
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
        next.span = [clamp(o.span[0] + dt, 0, o.span[1] - 0.01), o.span[1]];
        pill = `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      case 'b':
        next.span = [o.span[0], clamp(o.span[1] + dt, o.span[0] + 0.01, 1)];
        pill = `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      case 'fa': {
        // Inward grows the feather; outward shrinks it to zero and then PUSHES the span
        // end (owner) — so a finger never has to find the square behind this one.
        const want = o.feather[0] + dt / len;
        if (want >= 0) {
          next.feather = [Math.min(FEATHER_MAX, want), o.feather[1]];
        } else {
          next.feather = [0, o.feather[1]];
          next.span = [clamp(o.span[0] + o.feather[0] * len + dt, 0, o.span[1] - 0.01), o.span[1]];
        }
        pill = next.feather[0] > 0 || next.span[0] === o.span[0]
          ? `feather ${Math.round(next.feather[0] * 100)}%`
          : `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      }
      case 'fb': {
        const want = o.feather[1] - dt / len;
        if (want >= 0) {
          next.feather = [o.feather[0], Math.min(FEATHER_MAX, want)];
        } else {
          next.feather = [o.feather[0], 0];
          next.span = [o.span[0], clamp(o.span[1] - o.feather[1] * len + dt, o.span[0] + 0.01, 1)];
        }
        pill = next.feather[1] > 0 || next.span[1] === o.span[1]
          ? `feather ${Math.round(next.feather[1] * 100)}%`
          : `span ${next.span[0].toFixed(2)}–${next.span[1].toFixed(2)}`;
        break;
      }
      case 'lam':
        // Multiplicative, so the caliper stretches like a spring rather than crawling
        // when it is short and bolting when it is long. A RATE, not a position — nothing
        // here tracks the pointer — so it keeps the per-canvas-width feel it was tuned at.
        next.wavelength = clamp(o.wavelength * Math.pow(2, (dxp / Math.max(1, width)) * 4), 0.004, 2);
        pill = `λ ${next.wavelength.toFixed(3)}   ${(len / next.wavelength).toFixed(1)} cyc`;
        break;
      case 'pa':
        next.phase = o.phase - dt / Math.max(1e-4, o.wavelength);
        next.amplitude = clamp(o.amplitude - dy, 0, 1);
        pill = `phase ${(((next.phase % 1) + 1) % 1).toFixed(2)}   amp ${next.amplitude.toFixed(2)}`;
        break;
      case 'bs':
        next.bias = clamp(o.bias * Math.pow(2, dxp / BIAS_OCTAVE), 0.2, 5);
        // `+dyp`, matching GraphSelectionBBox's `gy` ("up -> bunch toward higher values").
        // Skew > 1 pushes the wave's value DOWN (`biasPow` on (w+1)/2), so a downward drag
        // raising skew is what makes the curve follow the finger. See the header.
        next.skew = clamp(o.skew * Math.pow(2, dyp / BIAS_OCTAVE), 0.2, 5);
        pill = `↔ ${next.bias.toFixed(2)}   ↕ ${next.skew.toFixed(2)}`;
        break;
    }
    onPill(pill);
    onChange(next);
  }, [width, height, tToX, onChange, onPill, onDragStart]);

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
  /**
   * THE TWO SHAPE HANDLES DOCK TO THE PLOT'S FLOOR, under the span's midpoint: the bias zone
   * above, the wavelength caliper below it (the order the owner asked for on 2026-09-12).
   *
   * They used to hang from `curveY(mid)` so they read as belonging to the curve. The cost was
   * that they MOVED while you dragged something else — every amplitude or phase change lifted
   * or dropped the pair under the pointer (owner, same day: "the wavelength and bias controls
   * bouncing up and down - they should stay at the min point"). A fixed dock is the honest
   * place for both: bias and skew warp the whole waveform and a wavelength is a property of
   * the whole span, so neither was ever pointing at a place on the curve. The crest circle is
   * the one that genuinely is, and it still rides the line.
   *
   * X still follows the span's centre — the pair belongs to the span, and that never bounced.
   */
  const calY = height - 13;
  /** Side of the bias gauge. Its walls are the clamp: bias and skew live in 0.2 .. 5. */
  const ZONE = 48;
  // Clear of the caliper's 26 px grab box, and never off the top of a short plot.
  const zoneY = Math.max(2, calY - 13 - 6 - ZONE);
  const zx = tToX(mid) - ZONE / 2;
  /** Half-range in octaves - `log2(5)`, since the clamp is 2**+-that. */
  const OCT = Math.log2(5);
  /** How far the marker may walk from the zone's centre, leaving its own radius inside. */
  const reach = ZONE / 2 - 7;
  const ct = crest();
  const cx = tToX(ct);
  /**
   * THE CREST HANDLE STAYS ON THE PLOT (owner, 2026-09-13: "at high amplitude, the phas/amp
   * control goes off the canvas, can we limit it"). It is drawn at the wave's true crest, and
   * the view is fitted once, when the tool arms — so a tall enough amplitude carries the crest
   * past the top edge, or under the ruler, and takes the only amplitude control with it.
   *
   * The DRAWN position is clamped, not the amplitude. The drag is relative (a pointer delta
   * added to the value at pointer-down), so a pinned handle keeps working in both directions,
   * and a tall wave stays a thing you are allowed to make. While pinned it carries a chevron
   * pointing at where the crest really is, so the handle never pretends to be on the curve
   * when it is not.
   */
  const CREST_R = 6;
  // Under the ruler, and on a desk under the floating tool head too — measured on the first
  // cut, clearing only the ruler left the pinned circle half beneath the head.
  const crestTop = Math.max(GRAPH_RULER_HEIGHT, topInset) + CREST_R + 9; // + room for the chevron
  const crestBottom = height - CREST_R - 9;
  const rawCy = valueToPixelY(applyWaveSample(baseAt(ct), ct, p, range));
  const cy = clamp(rawCy, crestTop, Math.max(crestTop, crestBottom));
  const pinned: -1 | 0 | 1 = rawCy < cy ? -1 : rawCy > cy ? 1 : 0;
  // Bias right of centre = the crest arrives later; skew below centre = the wave sits lower.
  // Both are the direction the corresponding drag moves the pointer, which is the whole point
  // of drawing them in a zone at all.
  const bx = zx + ZONE / 2 + clamp(Math.log2(p.bias) / OCT, -1, 1) * reach;
  const by = zoneY + ZONE / 2 + clamp(Math.log2(p.skew) / OCT, -1, 1) * reach;
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
      {/* A shoulder is a DISTANCE FROM its span end, so it is drawn at that end's height
          rather than at the curve's height beneath itself (owner, 2026-09-12: "stay in line
          (Y) with the handles they are feathering from"). The pair then reads as one
          bracket — this far in from there — instead of as two unrelated squares that happen
          to be near each other. */}
      <Square x={faX} y={curveY(p.span[0])} stroke="#9ca3af" onDown={onPointerDown('fa')} />
      <Square x={fbX} y={curveY(p.span[1])} stroke="#9ca3af" onDown={onPointerDown('fb')} />

      {/* crest: phase (X) + amplitude (Y) */}
      <g onPointerDown={onPointerDown('pa')} style={{ cursor: 'move' }} data-gx-wave="crest" data-pinned={pinned || undefined}>
        <circle cx={cx} cy={cy} r={CREST_R} fill="rgb(var(--surface))" stroke={color} strokeWidth={2} />
        {/* pinned to an edge: a chevron toward the crest it stands in for */}
        {pinned !== 0 && (
          <path
            d={`M${cx - 3.5} ${cy + pinned * 9}L${cx} ${cy + pinned * 12.5}L${cx + 3.5} ${cy + pinned * 9}`}
            fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
      </g>

      {/* bias (X) + skew (Y) in their zone — the graph editor's own Bias glyph, walking a
          gauge whose centre is neutral and whose walls are the clamp. The square itself is
          the grab target, so the handle is as big as the picture. */}
      <g onPointerDown={onPointerDown('bs')} style={{ cursor: 'crosshair' }}>
        <rect
          x={zx} y={zoneY} width={ZONE} height={ZONE} rx={6}
          fill="rgb(var(--accent-500) / 0.07)" stroke="rgb(var(--accent-300) / 0.22)" strokeWidth={1}
        />
        {/* neutral: bias 1, skew 1 */}
        <path
          d={`M${zx + ZONE / 2} ${zoneY + 6}V${zoneY + ZONE - 6}M${zx + 6} ${zoneY + ZONE / 2}H${zx + ZONE - 6}`}
          stroke="rgb(var(--accent-300) / 0.16)" strokeWidth={1}
        />
        <circle cx={bx} cy={by} r={7} fill="rgb(var(--accent-500) / 0.3)" stroke="rgb(var(--accent-300) / 0.7)" strokeWidth={1.5} />
        <path d={`M${bx} ${by - 4.5}V${by + 4.5}M${bx - 4.5} ${by}H${bx + 4.5}`} stroke="rgb(var(--accent-100))" strokeWidth={1.4} opacity={0.6} />
        <circle cx={bx - 2.2} cy={by - 2.2} r={1.5} fill="rgb(var(--accent-100))" />
        <circle cx={bx + 2.2} cy={by + 2.2} r={1.5} fill="rgb(var(--accent-100))" />
        <rect x={zx} y={zoneY} width={ZONE} height={ZONE} fill="transparent" />
      </g>
    </svg>
  );
};

export default WaveOverlay;
