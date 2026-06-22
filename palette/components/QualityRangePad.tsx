// QualityRangePad — a GMT-idiomatic dual-range "window" selector over a rendered
// distribution track. Built to look/feel/behave like GMT's Slider (ScalarInput):
// same header chrome, the same diagonal-hatch value cells, and it REUSES GMT's
// DraggableNumber for both bound fields, so they scrub-on-drag / type-to-edit /
// Alt-Shift precision exactly like every other GMT input.
//
// Three things adapt GMT's single-value slider to the picker's needs (per the
// user's spec): a GRADIENT/distribution track background, VERTICAL-drag resize,
// and TWO numeric fields (min + max) instead of one.
//
// Track gesture (no GMT single-slider equivalent, so a custom 2D drag):
//   • grab the NEARER edge if the press is within 0.05 of a bound → move that bound
//   • otherwise grab the body → drag-X moves the window centre, drag-Y resizes it
//     (Δwidth = ΔY / 5, Y tracks unclamped past the track); Alt = fine (0.25×)
//   • min/max keep a 0.01 separation; window width floors at 0.02
// Host-agnostic: pure React, value in / onChange out, no engine-store coupling.

import React, { useCallback, useEffect, useRef } from 'react';
import { DraggableNumber } from '../../components/inputs/primitives';
import { clamp } from '../../utils/stopOps';

export type Range01 = [number, number];

export interface QualityRangePadProps {
  /** Normalised window [a, b] in 0..1. [0, 1] means "all" (no filtering). */
  value: Range01;
  onChange: (range: Range01) => void;
  /** Labels shown in the header, e.g. "dark" ↔ "light". */
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
}

const fmt2 = (v: number) => v.toFixed(2);

const EDGE_HIT = 0.05; // press within this of a bound grabs that edge
const MIN_GAP = 0.01; // min separation between the two bounds
const MIN_WIDTH = 0.02; // floor on window width when body-resizing
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

export const QualityRangePad: React.FC<QualityRangePadProps> = ({
  value,
  onChange,
  loLabel,
  hiLabel,
  headerRight,
  drawTrack,
  trackGradient,
  onDragStart,
  onDragEnd,
  height = 22,
  className,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // Latest value held in a ref so pointer handlers never see a stale closure.
  const valueRef = useRef<Range01>(value);
  valueRef.current = value;

  const [a, b] = value;

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

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      const [px, py] = posOf(e);
      const fine = e.altKey ? 0.25 : 1; // Alt = fine adjust, matching GMT's precision modifier
      let [na, nb] = valueRef.current;
      if (st.mode === 'min') {
        const target = st.px + (px - st.px) * fine;
        na = clamp(Math.min(clamp(target, 0, 1), nb - MIN_GAP), 0, 1);
      } else if (st.mode === 'max') {
        const target = st.px + (px - st.px) * fine;
        nb = clamp(Math.max(clamp(target, 0, 1), na + MIN_GAP), 0, 1);
      } else {
        const ctr = clamp(st.ctr + (px - st.px) * fine, 0, 1);
        const wid = clamp(st.wid + ((st.py - py) / RESIZE_DAMP) * fine, MIN_WIDTH, 1);
        na = clamp(ctr - wid / 2, 0, 1);
        nb = clamp(ctr + wid / 2, 0, 1);
      }
      onChange([na, nb]);
    },
    [posOf, onChange],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragEnd?.();
  }, [onDragEnd]);

  // Number-field edits — clamp to keep the 0.01 separation; DraggableNumber's own
  // hardMin/hardMax do the live clamp during scrub, these are belt-and-braces.
  const setMin = useCallback((v: number) => onChange([clamp(v, 0, valueRef.current[1] - MIN_GAP), valueRef.current[1]]), [onChange]);
  const setMax = useCallback((v: number) => onChange([valueRef.current[0], clamp(v, valueRef.current[0] + MIN_GAP, 1)]), [onChange]);

  const numberCell = (val: number, set: (v: number) => void, hardMin: number, hardMax: number) => (
    <div
      className="relative flex-1 min-w-0 border-l border-line/10 bg-line/[0.02] touch-none"
      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)' }}
    >
      <DraggableNumber
        value={val}
        onChange={set}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        step={0.01}
        hardMin={hardMin}
        hardMax={hardMax}
        format={fmt2}
      />
    </div>
  );

  return (
    <div className={`mb-px ${className ?? ''}`}>
      {/* Header — GMT slider chrome: label + two value cells */}
      <div className="flex items-stretch bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5">
        <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
          {headerRight}
          <label className="text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-fg-muted">
            {loLabel} <span className="text-fg-faint">↔</span> {hiLabel}
          </label>
        </div>
        {/* Value region = w-1/2 (matches a GMT slider's value area), split into two equal fields. */}
        <div className="w-1/2 flex shrink-0">
          {numberCell(a, setMin, 0, Math.max(0, b - MIN_GAP))}
          {numberCell(b, setMax, Math.min(1, a + MIN_GAP), 1)}
        </div>
      </div>

      {/* Track — distribution background + dim-outside + draggable window */}
      <div
        ref={trackRef}
        className="relative w-full overflow-hidden cursor-crosshair select-none touch-none"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {drawTrack ? (
          <canvas ref={canvasRef} width={TRACK_W} height={TRACK_H} className="absolute inset-0 w-full h-full block" />
        ) : (
          <div className="absolute inset-0" style={{ background: trackGradient ?? 'rgba(255,255,255,0.1)' }} />
        )}
        {/* dim-outside masks */}
        <div className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none" style={{ width: `${a * 100}%` }} />
        <div className="absolute top-0 bottom-0 bg-black/60 pointer-events-none" style={{ left: `${b * 100}%`, width: `${(1 - b) * 100}%` }} />
        {/* selected window with GMT-style edge thumbs */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-r-2 border-line/80 box-border pointer-events-none"
          style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
        />
      </div>
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
