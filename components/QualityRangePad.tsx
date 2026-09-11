// QualityRangePad — THE GMT dual-range (min/max-in-one-slider) master control:
// a "window" selector over a rendered distribution/gradient track. Built to
// look/feel/behave like GMT's Slider (ScalarInput): same header chrome, the
// same diagonal-hatch value cells, and it REUSES GMT's DraggableNumber for both
// bound fields, so they scrub-on-drag / type-to-edit / Alt precision exactly
// like every other GMT input.
//
// Consumers: the Gradient Explorer picker panels (five quality axes, via
// palette/components/QualityRangePadConnected) and DDFS `rangePairWith` param
// pairs (AutoFeaturePanel's RangePairPad adapter — e.g. Fog Range). Promoted
// from palette/components 2026-07-10: ONE master, thin per-host adapters — do
// NOT fork a parallel range slider.
//
// Three things adapt GMT's single-value slider to a range (per the original
// picker spec): a GRADIENT/distribution track background, VERTICAL-drag resize,
// and TWO numeric fields (min + max) instead of one.
//
// Track gesture (no GMT single-slider equivalent, so a custom 2D drag):
//   • grab the NEARER edge if the press is within 0.05 of a bound → move that bound
//   • otherwise grab the body → drag-X moves the window centre, drag-Y resizes it
//     (Δwidth = ΔY / 5, Y tracks unclamped past the track); Alt = fine (0.25×)
//   • min/max keep a 0.01 (normalised) separation; window width floors at 0.02
// Host-agnostic: pure React, value in / onChange out, no engine-store coupling.
//
// DOMAIN SUPPORT (2026-07-10): `min`/`max` map the window into arbitrary units
// (e.g. fog distances 0..10) — values in/out are DOMAIN values; the gesture
// constants stay in normalised track space so the feel is scale-invariant.
// Defaults (0..1, step 0.01) keep the original GX behaviour byte-identical.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DraggableNumber } from './inputs/primitives';
import { clamp } from '../utils/stopOps';
import type { KeyStatus } from './Icons';

export type Range01 = [number, number];

export interface QualityRangePadProps {
  /** Window [a, b] in DOMAIN units (min..max, default 0..1). Full span = "all". */
  value: Range01;
  onChange: (range: Range01) => void;
  /** Domain edges (default 0 / 1). The pad normalises internally. */
  min?: number;
  max?: number;
  /** When true, the two numeric fields may be typed / scrubbed BEYOND the
   *  visible domain edges — min/max are a *suggested* track span, not a hard
   *  limit, exactly like every DDFS scalar slider (whose min/max are soft). The
   *  mutual min<max separation is still enforced. The track GESTURE stays bounded
   *  to the visible span either way (a thumb can't leave the track). Default
   *  false = domain edges are hard (the GX quality axes, whose 0..1 span is a
   *  true limit). Fog Range opts in via RangePairPad. */
  softRange?: boolean;
  /** Step + formatter for the two numeric fields (default 0.01 / 2 dp). */
  step?: number;
  format?: (v: number) => string;
  /** Main header label (e.g. "Fog Range"). Falls back to "lo ↔ hi". */
  label?: string;
  /** Bound labels, e.g. "dark" ↔ "light" (also the fallback header). */
  loLabel?: string;
  hiLabel?: string;
  /** Header-left slot (e.g. the keyframe diamond), mirroring GMT's ScalarInput. */
  headerRight?: React.ReactNode;
  /** Paint the distribution/track. Called with a 2D context sized to the buffer (w×h). */
  drawTrack?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Simpler alternative to drawTrack: a CSS gradient applied as the track background. */
  trackGradient?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Track height in px (default 22, matching GMT slider tracks). */
  height?: number;
  className?: string;
  /** 'default' (unchanged) = the GMT slider-chrome header (label + two value
   *  cells) above the track. 'row' = the V4 "one slider" anatomy (GE v2 unified
   *  shell, plans/ge-v2-unified-shell-plan.md §4 Phase A): label · track · value
   *  in one row, no boxed header, radius 4px on the track. Opt-in — every
   *  existing caller (Fog Range via RangePairPad, the app-gmt Filters popover)
   *  keeps 'default' unless it explicitly asks for 'row'. */
  /** 'row' = pole · track · pole · amounts. 'strip' = the bare track (the saturation strip under
   *  the hue/lightness picker). Both draw the selection the way HueLightnessPad does. */
  variant?: 'default' | 'row' | 'strip';
}

const fmt2 = (v: number) => v.toFixed(2);

const EDGE_HIT = 0.05; // press within this (normalised) of a bound grabs that edge
const MIN_GAP = 0.01; // min separation between the two bounds (normalised)
const MIN_WIDTH = 0.02; // floor on window width when body-resizing (normalised)
const RESIZE_DAMP = 5; // Δwidth = ΔY / RESIZE_DAMP (gentle vertical resize)

const TRACK_W = 200;
const TRACK_H = 44;

type DragState = {
  mode: 'min' | 'max' | 'move';
  px: number;
  py: number;
  ctr: number;
  wid: number;
};

/** Combine two per-bound key statuses into one diamond — GMT's Vector2Input
 *  convention (a single diamond keys both bounds together). Shared by every
 *  range-pad adapter (GX quality axes, DDFS rangePairWith rows). */
export const combineKeyStatus = (a: KeyStatus, b: KeyStatus): KeyStatus => {
  if (a === 'keyed' && b === 'keyed') return 'keyed';
  if (a === 'keyed' || b === 'keyed' || a === 'keyed-dirty' || b === 'keyed-dirty') return 'keyed-dirty';
  if (a === 'dirty' || b === 'dirty') return 'dirty';
  if (a === 'partial' || b === 'partial') return 'partial';
  return 'none';
};

export const QualityRangePad: React.FC<QualityRangePadProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  softRange = false,
  step = 0.01,
  format,
  label,
  loLabel,
  hiLabel,
  headerRight,
  drawTrack,
  trackGradient,
  onDragStart,
  onDragEnd,
  height = 22,
  className,
  variant = 'default',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const span = max - min || 1;
  const toN = useCallback((v: number) => (v - min) / span, [min, span]);
  const fromN = useCallback((n: number) => min + n * span, [min, span]);
  const quantize = useCallback((v: number) => (step ? Math.round(v / step) * step : v), [step]);

  // Latest NORMALISED window held in a ref so pointer handlers never see a stale closure.
  const valueRef = useRef<Range01>([toN(value[0]), toN(value[1])]);
  valueRef.current = [toN(value[0]), toN(value[1])];

  const [a, b] = value; // domain values (numeric fields)
  const [na, nb] = valueRef.current; // normalised (track rendering)

  useEffect(() => {
    if (!drawTrack) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawTrack(ctx, cv.width, cv.height);
  }, [drawTrack]);

  const posOf = useCallback((e: React.PointerEvent): [number, number] => {
    const el = trackRef.current!;
    const r = el.getBoundingClientRect();
    // Unclamped: Y keeps tracking past the track so resize stays smooth off-edge.
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }, []);

  // Emit a normalised window as step-quantized DOMAIN values.
  const emit = useCallback(
    (nlo: number, nhi: number) => onChange([quantize(fromN(nlo)), quantize(fromN(nhi))]),
    [onChange, quantize, fromN],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      const [px, py] = posOf(e);
      const [va, vb] = valueRef.current;
      // Grab the NEARER edge (testing min first would make a window narrower than
      // the hit-zone resolve every press to min — the prototype's documented fix).
      let mode: DragState['mode'] = 'move';
      const da = Math.abs(px - va);
      const db = Math.abs(px - vb);
      if (da < EDGE_HIT || db < EDGE_HIT) mode = da <= db ? 'min' : 'max';
      dragRef.current = { mode, px, py, ctr: (va + vb) / 2, wid: vb - va };
      onDragStart?.();
    },
    [posOf, onDragStart],
  );

  /**
   * WHAT THE CURSOR PROMISES (owner, 2026-09-11: "mouse cursors need to show the move and
   * resize events (not draw)"). This track wore `crosshair` everywhere, which in this suite
   * means "place or draw here" — and nothing here is drawn. A press within `EDGE_HIT` of a
   * bound RESIZES that bound; anywhere else MOVES the window (and drags vertically to widen
   * it). So the cursor is read off the same test `onPointerDown` uses, and stays on whatever
   * the drag actually grabbed while one is open.
   */
  const [hoverMode, setHoverMode] = useState<DragState['mode'] | null>(null);
  const cursorFor = (m: DragState['mode'] | null): string =>
    m === 'min' || m === 'max' ? 'cursor-ew-resize' : m === 'move' ? 'cursor-move' : 'cursor-default';

  const onPointerHover = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) return;
      const [px] = posOf(e);
      const [va, vb] = valueRef.current;
      const da = Math.abs(px - va);
      const db = Math.abs(px - vb);
      setHoverMode(da < EDGE_HIT || db < EDGE_HIT ? (da <= db ? 'min' : 'max') : 'move');
    },
    [posOf],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      const [px, py] = posOf(e);
      const fine = e.altKey ? 0.25 : 1; // Alt = fine adjust, matching GMT's precision modifier
      let [nlo, nhi] = valueRef.current;
      if (st.mode === 'min') {
        const target = st.px + (px - st.px) * fine;
        nlo = clamp(Math.min(clamp(target, 0, 1), nhi - MIN_GAP), 0, 1);
      } else if (st.mode === 'max') {
        const target = st.px + (px - st.px) * fine;
        nhi = clamp(Math.max(clamp(target, 0, 1), nlo + MIN_GAP), 0, 1);
      } else {
        const ctr = clamp(st.ctr + (px - st.px) * fine, 0, 1);
        const wid = clamp(st.wid + ((st.py - py) / RESIZE_DAMP) * fine, MIN_WIDTH, 1);
        nlo = clamp(ctr - wid / 2, 0, 1);
        nhi = clamp(ctr + wid / 2, 0, 1);
      }
      emit(nlo, nhi);
    },
    [posOf, emit],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragEnd?.();
  }, [onDragEnd]);

  // Number-field edits — clamp to keep the separation; DraggableNumber's own
  // hardMin/hardMax do the live clamp during scrub, these are belt-and-braces.
  const gapD = MIN_GAP * span; // separation in domain units
  // Outer field bound: the hard domain edge by default, or unbounded when
  // `softRange` (the visible span is a suggestion — a field may exceed it, like
  // any DDFS scalar slider). Ordering (min<max−gap) is enforced separately below.
  const loFloor = softRange ? -Infinity : min;
  const hiCeil = softRange ? Infinity : max;
  const setMin = useCallback((v: number) => onChange([clamp(v, loFloor, fromN(valueRef.current[1]) - gapD), fromN(valueRef.current[1])]), [onChange, loFloor, fromN, gapD]);
  const setMax = useCallback((v: number) => onChange([fromN(valueRef.current[0]), clamp(v, fromN(valueRef.current[0]) + gapD, hiCeil)]), [onChange, hiCeil, fromN, gapD]);

  const numberCell = (val: number, set: (v: number) => void, hardMin: number | undefined, hardMax: number | undefined) => (
    <div
      className="relative flex-1 min-w-0 border-l border-line/10 bg-line/[0.02] touch-none"
      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)' }}
    >
      <DraggableNumber
        value={val}
        onChange={set}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        step={step}
        hardMin={hardMin}
        hardMax={hardMax}
        format={format ?? fmt2}
      />
    </div>
  );

  // Track body — distribution background + dim-outside + draggable window.
  // Shared by both variants; only the radius and surrounding chrome differ.
  const trackNode = (
    <div
      ref={trackRef}
      className={`relative w-full overflow-hidden select-none touch-none ${cursorFor(dragRef.current?.mode ?? hoverMode)} ${variant !== 'default' ? 'rounded ring-1 ring-line/20' : ''}`}
      style={{ height }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => { onPointerHover(e); onPointerMove(e); }}
      onPointerLeave={() => { if (!dragRef.current) setHoverMode(null); }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {drawTrack ? (
        <canvas ref={canvasRef} width={TRACK_W} height={TRACK_H} className="absolute inset-0 w-full h-full block" />
      ) : (
        <div className="absolute inset-0" style={{ background: trackGradient ?? 'rgba(255,255,255,0.1)' }} />
      )}
      {/* dim-outside masks */}
      <div className={`absolute top-0 bottom-0 left-0 pointer-events-none ${variant === 'default' ? 'bg-black/60' : 'bg-black/45'}`} style={{ width: `${na * 100}%` }} />
      <div className={`absolute top-0 bottom-0 pointer-events-none ${variant === 'default' ? 'bg-black/60' : 'bg-black/45'}`} style={{ left: `${nb * 100}%`, width: `${(1 - nb) * 100}%` }} />
      {/* selected window: GMT edge thumbs in the default chrome; the HueLightnessPad box
          (white hairline + dark halo) in the v2 variants, so every ranged selection reads alike. */}
      {variant === 'default' ? (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-r-2 border-line/80 box-border pointer-events-none"
          style={{ left: `${na * 100}%`, width: `${(nb - na) * 100}%` }}
        />
      ) : (na > 0 || nb < 1) ? (
        <div
          className="absolute top-0 bottom-0 border border-white shadow-[0_0_0_1px_rgba(0,0,0,.6)] rounded-[2px] box-border pointer-events-none"
          style={{ left: `${na * 100}%`, width: `${(nb - na) * 100}%` }}
        />
      ) : null}
    </div>
  );

  if (variant === 'strip') return <div className={className} title={label ?? (loLabel && hiLabel ? `${loLabel} ↔ ${hiLabel}` : undefined)}>{trackNode}</div>;

  if (variant === 'row') {
    // V4 "one slider" anatomy: label · track · value, no boxed header, radius 4px
    // on the track (the sample radius, V2). The gradient/canvas track background
    // is the only thing this app keeps from the old chrome (per V4).
    return (
      // Owner, 2026-09-06: the two poles sit either side of the track, the two
      // amounts stack as a column on the right on a subtle raised ground that
      // does not change while a number is being typed (DraggableNumber's edit
      // input is transparent for that reason).
      <div className={`flex items-center gap-2 ${className ?? ''}`} title={label}>
        <span className="min-w-[64px] shrink-0 text-[13px] leading-none text-fg-muted text-left whitespace-nowrap select-none pointer-events-none">{label ?? loLabel}</span>
        <div className="flex-1 min-w-0">{trackNode}</div>
        <span className="min-w-[64px] shrink-0 text-[13px] leading-none text-fg-muted whitespace-nowrap select-none pointer-events-none">{label ? '' : hiLabel}</span>
        <div className="flex flex-col shrink-0 w-[52px] h-[36px] text-[13px] tabular-nums rounded bg-surface-raised border border-line/10 overflow-hidden">
          <DraggableNumber
            value={a}
            onChange={setMin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            step={step}
            hardMin={softRange ? undefined : min}
            hardMax={Math.max(loFloor, b - gapD)}
            format={format ?? fmt2}
          />
          <DraggableNumber
            value={b}
            onChange={setMax}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            step={step}
            hardMin={Math.min(hiCeil, a + gapD)}
            hardMax={softRange ? undefined : max}
            format={format ?? fmt2}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-px ${className ?? ''}`}>
      {/* Header — GMT slider chrome: label + two value cells */}
      <div className="flex items-stretch bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5">
        <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
          {headerRight}
          <label className="text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-fg-muted">
            {label ?? (<>{loLabel} <span className="text-fg-faint">↔</span> {hiLabel}</>)}
          </label>
        </div>
        {/* Value region = w-1/2 (matches a GMT slider's value area), split into two equal fields. */}
        <div className="w-1/2 flex shrink-0">
          {numberCell(a, setMin, softRange ? undefined : min, Math.max(loFloor, b - gapD))}
          {numberCell(b, setMax, Math.min(hiCeil, a + gapD), softRange ? undefined : max)}
        </div>
      </div>

      {trackNode}
    </div>
  );
};

export default QualityRangePad;

// --- Standard track painters (ported verbatim from the prototype's bgDraw) ----------
// Reusable distribution backgrounds for the picker's quality axes. Host supplies the
// matching one per axis; kept here so the painter math lives with the pad it draws into.

/** Greyscale ramp — lightness (dark ↔ light). */
export const drawLightnessTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  for (let x = 0; x < w; x++) {
    const v = Math.round((x / (w - 1)) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, h);
  }
};

/** Grey → vivid teal-ish ramp — chroma (muted ↔ vivid). */
export const drawChromaTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  for (let x = 0; x < w; x++) {
    const f = x / (w - 1);
    const r = Math.round(136 + 119 * f);
    const g = Math.round(136 - 77 * f);
    const b = Math.round(136 - 46 * f);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, 0, 1, h);
  }
};

/** Cool → warm ramp — warmth (cool ↔ warm). */
export const drawWarmthTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  for (let x = 0; x < w; x++) {
    const f = x / (w - 1);
    const r = Math.round(42 + 182 * f);
    const g = Math.round(95 - 10 * f);
    const b = Math.round(208 - 166 * f);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, 0, 1, h);
  }
};

/** Solid → striped ramp — complexity / coverage (simple ↔ complex). */
export const drawComplexityTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = x / (w - 1);
      const stripe = x % 8 < 4 ? 35 : 215;
      const v = Math.round(120 * (1 - f) + stripe * f);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const hsv2 = (hin: number): [number, number, number] => {
  const h = ((((hin % 360) + 360) % 360) / 60);
  const x = Math.round(255 * (1 - Math.abs((h % 2) - 1)));
  const t: [number, number, number][] = [
    [255, x, 0],
    [x, 255, 0],
    [0, 255, x],
    [0, x, 255],
    [x, 0, 255],
    [255, 0, x],
  ];
  return t[Math.floor(h) % 6];
};

/** Single-hue → rainbow ramp (single-hue ↔ rainbow). Vertical axis sweeps hue. */
/** The colour wheel, left to right — the hue window's track (the Filters "colour picker"). */
export const drawHueTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const rc = hsv2((x / (w - 1)) * 360);
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      img.data[i] = rc[0];
      img.data[i + 1] = rc[1];
      img.data[i + 2] = rc[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

export const drawRainbowTrack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const img = ctx.createImageData(w, h);
  const sol: [number, number, number] = [40, 150, 150];
  for (let y = 0; y < h; y++) {
    const rc = hsv2((y / (h - 1)) * 360);
    for (let x = 0; x < w; x++) {
      const f = x / (w - 1);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(sol[0] * (1 - f) + rc[0] * f);
      img.data[i + 1] = Math.round(sol[1] * (1 - f) + rc[1] * f);
      img.data[i + 2] = Math.round(sol[2] * (1 - f) + rc[2] * f);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};
