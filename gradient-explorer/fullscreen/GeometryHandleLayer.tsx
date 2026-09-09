/**
 * GeometryHandleLayer — on-screen direct-manipulation handles for the geometry modes
 * (Gradient Explorer fullscreen; v2 redesign 2026-06-10, see plans/gx-geometry-handles-v2.md).
 *
 * A 2D SVG layer mounted ABOVE the gradient stage (the same precedent as Liquify's
 * signifier overlay: signifiers live in DOM/2D, never on the GL
 * canvas). Per geometry mode it shows the shape params as draggable handles:
 *   • linear — a BIAS dot at the gradient-axis midpoint (drag ⟂ to the axis to ease the ramp
 *              into an S, riding a glyph of the real eased curve) + an ANGLE dot tethered to
 *              it on the axis (orbit the centre to rotate the gradient direction).
 *   • radial — a CENTRE dot · a SCALE diamond on the radius (how far the gradient reaches) ·
 *              a BIAS dot on the 50% ring (drag across the radius to ease the falloff) · a
 *              WAVES ring on the reach that pulls out into petals, and once open a COUNT
 *              diamond that orbits to add or remove them.
 *   • conic  — a CENTRE dot · a ROTATION dot on the seam · a MIRROR ring that starts UNDER
 *              the rotation dot and pulls off to reflect the sweep (0→1→0); a BIAS dot on the
 *              rising arc always (it is the whole sweep's bias while the mirror is collapsed)
 *              and a second on the falling arc once mirrored · a TWIST ring far out on the
 *              seam that winds the spokes into a log spiral when orbited.
 * Spline has its own on-screen path editor; Linear/Radial/Conic are the handled set.
 *
 * ── Determinism boundary ────────────────────────────────────────────────────────────────
 * Handles write ONLY `fullscreenStore.geomParams` (batched `setFullscreenGeomParams`); the
 * overlay threads that into the render ctx, so the pure mappers (`sampleGeometry`) are
 * driven from the OUTSIDE and stay pure. Values are clamped to the mode's `paramFields`
 * ranges (the frozen seam metadata). Double-click a handle to reset its params (an unset
 * key IS the `GEOM_DEFAULTS` default — byte-identical to the pre-handles render).
 * A drag also flags `fullscreenStore.interacting` so the overlay repaints at a reduced
 * resolution cap while the pointer is down (full-res snap on release).
 *
 * ── Visibility ──────────────────────────────────────────────────────────────────────────
 * Visible on mode activation and on any pointer activity over the stage; gently fades
 * after a few idle seconds (instant when `prefers-reduced-motion`). Never fades mid-drag.
 * The fade is VISUAL ONLY — handles stay grabbable while fading/faded. `fullscreenStore.handles`
 * (the toolbar "Handles" toggle) force-hides the whole layer. PNG export can never contain
 * handles BY CONSTRUCTION: export reads the canvas back, and this layer is sibling DOM above it.
 *
 * @see gradient-explorer/fullscreen/modes/geometryModes.tsx (the paramFields metadata)
 * @see palette/core/rampGeometry.ts (the pure mappings these params drive)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GEOM_DEFAULTS,
  bias,
  conicTwistTurns,
  radialSineReach,
  type GeometryParams,
} from '../../palette/core/rampGeometry';
import {
  resetFullscreenGeomParams,
  setFullscreenGeomParams,
  setFullscreenInteracting,
  useFullscreenState,
  type HandleParamKey,
} from '../../palette/store/fullscreenStore';
import { getFullscreenMode } from './modeRegistry';
import { precisionMultiplier } from '../../components/inputs/usePrecisionTrackDrag';

/** Idle time before the handle layer fades out. */
const IDLE_FADE_MS = 3000;
/** Skip re-arming the fade timer (and the hit-test's getBoundingClientRect) when it was
 *  armed this recently — pointermove fires at up to 120Hz+; the fade only needs ~4Hz. */
const REARM_MS = 250;

/** Liquify's signifier palette — one visual language across the fullscreen modes. */
const HANDLE_FILL = 'rgb(var(--accent-400)/0.95)'; // accent
const HANDLE_STROKE = 'rgba(0,0,0,0.55)';
const GUIDE_FAINT = 'rgba(255,255,255,0.12)';
const GUIDE_SOFT = 'rgba(255,255,255,0.30)';

/** Bias param range end (matches the paramFields ±2) and the perpendicular drag reach (as a
 *  fraction of the shorter stage side) that maps to that full range. */
const BIAS_MAX = 2;
const BIAS_REACH = 0.3;
/** Linear axis half-length as a fraction of the shorter stage side. */
const AXIS_FRAC = 0.42;
/** How many petals one full orbit of the radial COUNT handle walks through. 12 covers the
 *  param's whole 2–16 range in a little over one turn, which is the most a count that small
 *  should ever ask for. */
const LOBES_PER_TURN = 12;

/** Clamp a value to the range the mode declared for the param in its `paramFields` —
 *  paramFields stays the single source of truth for ranges (no duplicated min/max). */
const clampToField = (geomId: string, key: HandleParamKey, v: number): number => {
  const f = getFullscreenMode(geomId)?.paramFields?.find((p) => p.key === key);
  if (!f) return v;
  return Math.min(f.max, Math.max(f.min, v));
};

/**
 * Pull a value toward whole numbers WITHOUT gating it there. Exactly an integer at the notch,
 * exactly the half-way point half-way between, and monotonic throughout — so the handle never
 * jumps or reverses; it just moves slowly through a notch and quickly between them.
 * `NOTCH_P` is the shape: 1 is no notching at all, higher is a deeper detent. 1.8 makes the
 * value move about 23× slower at a whole petal than half-way between two — a detent you
 * feel and can leave. 2.4 measured 211× and read as a magnet rather than a notch, which is
 * not what "only softly notched" asked for.
 */
const NOTCH_P = 1.8;
export const softNotch = (v: number): number => {
  const n = Math.round(v);
  const f = v - n; // -0.5 .. 0.5
  return n + Math.sign(f) * (Math.abs(f) * 2) ** NOTCH_P * 0.5;
};

/** Wrap an angle into [-π, π) (orbital drags never hit a hard stop). */
const wrapPi = (a: number): number => {
  const TAU = Math.PI * 2;
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
};

/** Stage metrics in the geometry's CENTRED ISOTROPIC units (matches `sampleGeometry`:
 *  pixel offsets from centre divided by half the shorter side). */
interface StageUnits {
  w: number;
  h: number;
  cx: number;
  cy: number;
  half: number;
}

/** Everything a per-geometry handle group needs from the layer shell. */
interface HandleEnv {
  u: StageUnits;
  /** Resolved params — store overrides over `GEOM_DEFAULTS`. */
  P: Required<GeometryParams>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  wake: () => void;
  dragging: React.MutableRefObject<boolean>;
}

interface DragPoint {
  /** Pointer position in stage-local CSS px. */
  x: number;
  y: number;
  /** The house precision multiplier for THIS segment (Shift ×10 / Alt ×0.1). */
  mult: number;
}

/**
 * Pointer-capture drag for one handle. The handle does its own param math in `onMove`,
 * accumulating per-segment deltas (each scaled by that segment's precision multiplier, so
 * toggling Shift/Alt mid-drag re-anchors smoothly — `usePrecisionTrackDrag` semantics).
 * Flags `fullscreenStore.interacting` for the overlay's reduced-cap drag repaints.
 */
const useHandleDrag = (
  env: HandleEnv,
  spec: { onStart: (pt: DragPoint) => void; onMove: (pt: DragPoint) => void },
) => {
  const active = useRef(false);
  const { rootRef, wake, dragging } = env;
  const toPt = useCallback(
    (e: React.PointerEvent): DragPoint | null => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return null;
      return { x: e.clientX - r.left, y: e.clientY - r.top, mult: precisionMultiplier(e) };
    },
    [rootRef],
  );
  const end = useCallback(
    (e: React.PointerEvent) => {
      if (!active.current) return;
      active.current = false;
      dragging.current = false;
      setFullscreenInteracting(false);
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      wake();
    },
    [dragging, wake],
  );
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      active.current = true;
      dragging.current = true;
      setFullscreenInteracting(true);
      const pt = toPt(e);
      if (pt) spec.onStart(pt);
      wake();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!active.current) return;
      e.preventDefault();
      const pt = toPt(e);
      if (pt) spec.onMove(pt);
      wake();
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
};

/**
 * One-param drag over a scalar pointer METRIC (radial distance, orbit angle, …):
 * `param += (metric_now − metric_last) × precision`, clamped to the paramFields range.
 * `angular` wraps each delta into ±π (orbits cross the seam); `wrapValue` keeps the param
 * itself an angle. The rotation/scale/span/curvature handles are instances of this.
 */
const useParamDrag = (
  env: HandleEnv,
  geomId: string,
  key: HandleParamKey,
  metric: (pt: DragPoint) => number,
  opts?: { angular?: boolean; wrapValue?: boolean },
) => {
  const acc = useRef({ v: 0, last: 0 });
  return useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { v: env.P[key], last: metric(pt) };
    },
    onMove: (pt) => {
      const a = acc.current;
      const m = metric(pt);
      const d = opts?.angular ? wrapPi(m - a.last) : m - a.last;
      let v = a.v + d * pt.mult;
      if (opts?.wrapValue) v = wrapPi(v);
      v = clampToField(geomId, key, v);
      a.v = v;
      a.last = m;
      setFullscreenGeomParams({ [key]: v });
    },
  });
};

/**
 * Bias drag: pointer travel ALONG `tangent` maps to the bias param (±BIAS_REACH px of travel =
 * ±BIAS_MAX), delta-accumulated from the value at grab (× precision). Delta — not absolute —
 * so grabbing the dot never jumps even when it's `pin()`-clamped off its true anchor, and it
 * honours Shift/Alt. Used by linear / radial / both conic halves.
 */
const useBiasDrag = (
  env: HandleEnv,
  geomId: string,
  key: HandleParamKey,
  tangent: { x: number; y: number },
  reach: number,
) => {
  const acc = useRef({ b: 0, last: 0 });
  return useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { b: env.P[key], last: pt.x * tangent.x + pt.y * tangent.y };
    },
    onMove: (pt) => {
      const m = pt.x * tangent.x + pt.y * tangent.y;
      const b = clampToField(geomId, key, acc.current.b + ((m - acc.current.last) / reach) * BIAS_MAX * pt.mult);
      acc.current.b = b;
      acc.current.last = m;
      setFullscreenGeomParams({ [key]: b });
    },
  });
};

/**
 * Orbit drag onto a COUNT param (the radial mode's petal count): the pointer's angular travel
 * around `centre` accumulates and passes through a SOFT NOTCH before it is emitted. One full
 * orbit walks {@link LOBES_PER_TURN} of them at normal precision (Shift/Alt still apply).
 * Delta-based like every other drag here, so grabbing the handle never jumps.
 *
 * Soft, not gated. A whole number of lobes closes seamlessly at the ±π wrap and a fractional
 * one leaves a visible seam, so whole numbers are where you usually want to be — but they are
 * not the only place you may be (owner, 2026-09-08: "only softly notched, instead of integer
 * gated"). {@link softNotch} flattens the value's response near each integer and speeds it up
 * between, so an ordinary drag settles on whole petals while a deliberate one can sit between
 * two and take the seam on purpose.
 */
const useCountDrag = (
  env: HandleEnv,
  geomId: string,
  key: HandleParamKey,
  centre: { x: number; y: number },
) => {
  const acc = useRef({ v: 0, last: 0 });
  const angOf = (pt: DragPoint): number => Math.atan2(pt.y - centre.y, pt.x - centre.x);
  return useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { v: env.P[key], last: angOf(pt) };
    },
    onMove: (pt) => {
      const a = acc.current;
      const m = angOf(pt);
      a.v = clampToField(geomId, key, a.v + wrapPi(m - a.last) * (LOBES_PER_TURN / (2 * Math.PI)) * pt.mult);
      a.last = m;
      setFullscreenGeomParams({ [key]: softNotch(a.v) });
    },
  });
};

/**
 * Orbit drag onto a TWIST param measured in turns: the pointer's angular travel converts to
 * turns through the log-spiral law at the handle's own radius, so the spoke under the pointer
 * follows the pointer exactly. `winding` is `2π·log(1 + r)` — the radians of sweep one turn of
 * twist produces THERE — and it is floored so a handle dragged near the centre (where a turn
 * of twist barely moves the spoke) cannot divide by ~0 and fling the param.
 */
const useTwistDrag = (
  env: HandleEnv,
  geomId: string,
  key: HandleParamKey,
  centre: { x: number; y: number },
  winding: number,
) => {
  const acc = useRef({ v: 0, last: 0 });
  const angOf = (pt: DragPoint): number => Math.atan2(pt.y - centre.y, pt.x - centre.x);
  return useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { v: env.P[key], last: angOf(pt) };
    },
    onMove: (pt) => {
      const a = acc.current;
      const m = angOf(pt);
      // The seam runs CLOCKWISE as twist grows (θ = seam − 2π·turns), hence the negation.
      const v = clampToField(geomId, key, a.v - (wrapPi(m - a.last) / winding) * pt.mult);
      a.v = v;
      a.last = m;
      setFullscreenGeomParams({ [key]: v });
    },
  });
};

/** Two-axis centre drag (the gradient origin dot): batched delta accumulation on both keys,
 *  one emit per move. The 2D sibling of {@link useParamDrag} — radial + conic share it. */
const useCentreDrag = (env: HandleEnv, geomId: string, keyX: HandleParamKey, keyY: HandleParamKey) => {
  const { u, P } = env;
  const acc = useRef({ x: 0, y: 0, lx: 0, ly: 0 });
  return useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { x: P[keyX], y: P[keyY], lx: pt.x, ly: pt.y };
    },
    onMove: (pt) => {
      const a = acc.current;
      a.x = clampToField(geomId, keyX, a.x + ((pt.x - a.lx) / u.half) * pt.mult);
      a.y = clampToField(geomId, keyY, a.y + ((pt.y - a.ly) / u.half) * pt.mult);
      a.lx = pt.x;
      a.ly = pt.y;
      setFullscreenGeomParams({ [keyX]: a.x, [keyY]: a.y });
    },
  });
};

/** Keep a handle's DISPLAYED position reachable — pin it just inside the stage when the
 *  shape math puts it off-screen (drags are delta-based, so a pinned dot still works). */
const pin = (u: StageUnits, p: { x: number; y: number }, m = 14): { x: number; y: number } => ({
  x: Math.min(u.w - m, Math.max(m, p.x)),
  y: Math.min(u.h - m, Math.max(m, p.y)),
});

/** Shared handle chrome: oversized invisible hit-disc + the visible glyph + tooltip.
 *
 *  Each group is stamped `data-gx-handle` with the FIRST key it resets — a stable name for
 *  the thing it drags. `smoke:gx-handles` selects by that attribute; it used to count `<g>`
 *  elements in render order, which silently re-pointed every case the moment Phase W added a
 *  handle in the middle of a list (the radial case started dragging Waves and asserting on
 *  `radialCx`). A name cannot drift that way. */
const Handle: React.FC<{
  x: number;
  y: number;
  title: string;
  cursor: string;
  drag: ReturnType<typeof useHandleDrag>;
  resetKeys: readonly HandleParamKey[];
  children: React.ReactNode;
}> = ({ x, y, title, cursor, drag, resetKeys, children }) => (
  <g
    data-gx-handle={resetKeys[0]}
    transform={`translate(${x},${y})`}
    style={{ pointerEvents: 'auto', cursor, touchAction: 'none' }}
    {...drag}
    onDoubleClick={() => resetFullscreenGeomParams(resetKeys)}
  >
    <title>{`${title} · double-click to reset`}</title>
    <circle r={16} fill="transparent" />
    {children}
  </g>
);

/** The standard round dot glyph (liquify's handle-dot look). */
const Dot: React.FC<{ r?: number }> = ({ r = 7 }) => (
  <circle r={r} fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
);

/** The diamond glyph (radius / scale handles — "size" affordance). */
const Diamond: React.FC = () => (
  <rect x={-6.5} y={-6.5} width={13} height={13} transform="rotate(45)" fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
);

// ── linear — bias dot (⟂ ease) + tethered angle dot ─────────────────────────────────────────

const LinearHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const minDim = Math.min(u.w, u.h);
  const L = AXIS_FRAC * minDim;
  const reach = BIAS_REACH * minDim;
  const dx = Math.cos(P.linearAngle);
  const dy = Math.sin(P.linearAngle); // axis dir (screen-true)
  const tx = -dy;
  const ty = dx; // perpendicular — the bias dot rides the axis midpoint, drags across it

  const biasDrag = useBiasDrag(env, 'linear', 'linearBias', { x: tx, y: ty }, reach);
  const angleDrag = useParamDrag(env, 'linear', 'linearAngle', (pt) => Math.atan2(pt.y - u.cy, pt.x - u.cx), {
    angular: true,
    wrapValue: true,
  });

  const biasOff = (P.linearBias / BIAS_MAX) * reach;
  const biasPos = pin(u, { x: u.cx + tx * biasOff, y: u.cy + ty * biasOff });
  const anglePos = pin(u, { x: u.cx + dx * L, y: u.cy + dy * L });
  // The real eased curve, drawn as a transverse deviation off the axis (bias(t) − t).
  const curve = useMemo(() => {
    const pts: string[] = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const along = (t - 0.5) * 2 * L;
      const dev = (bias(t, P.linearBias) - t) * 2 * reach;
      pts.push(`${(u.cx + dx * along + tx * dev).toFixed(1)},${(u.cy + dy * along + ty * dev).toFixed(1)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.cx, u.cy, dx, dy, tx, ty, L, reach, P.linearBias]);

  return (
    <>
      <line x1={u.cx - dx * L} y1={u.cy - dy * L} x2={u.cx + dx * L} y2={u.cy + dy * L} stroke={GUIDE_FAINT} strokeWidth={1.5} />
      <polyline points={curve} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
      <line x1={biasPos.x} y1={biasPos.y} x2={anglePos.x} y2={anglePos.y} stroke={GUIDE_FAINT} strokeWidth={1} />
      <Handle x={anglePos.x} y={anglePos.y} title="Angle — drag around the centre to rotate the gradient" cursor="grab" drag={angleDrag} resetKeys={['linearAngle']}>
        <Dot r={6} />
      </Handle>
      <Handle x={biasPos.x} y={biasPos.y} title="Bias — drag across the gradient to ease it into an S" cursor="move" drag={biasDrag} resetKeys={['linearBias']}>
        <Dot />
      </Handle>
    </>
  );
};

// ── radial — centre dot + scale diamond + bias dot ──────────────────────────────────────────

const RadialHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const gcx = u.cx + P.radialCx * u.half;
  const gcy = u.cy + P.radialCy * u.half;
  const diag = Math.hypot(u.w / 2, u.h / 2); // screen px where scale=1 reaches (the corner)
  const reach = BIAS_REACH * Math.min(u.w, u.h);

  const centreDrag = useCentreDrag(env, 'radial', 'radialCx', 'radialCy');
  const scaleDrag = useParamDrag(env, 'radial', 'radialScale', (pt) => Math.hypot(pt.x - gcx, pt.y - gcy) / diag);

  // ── petals: the sine that swells and pinches the reach around the circle ──
  // The stage is a uniform scale of the sampler's isotropic space (both axes divide by the
  // same `half`), so a SCREEN angle is the sampler's angle and the ring can be traced
  // directly. Reach → screen radius is × diag (the corner is position 1 at scale 1).
  const wavy = P.radialSineAmp !== 0;
  // NOT rounded any more: the count is softly notched, so a value can legitimately sit between
  // two whole petals and the guide ring must draw what the pixels actually do.
  const freq = Math.max(1, P.radialSineFreq);
  const reachAt = useCallback(
    (a: number) => diag * radialSineReach(P.radialScale, P.radialSineAmp, freq, a),
    [diag, P.radialScale, P.radialSineAmp, freq],
  );
  // The waves handle rides the crest nearest STRAIGHT UP, well clear of the scale diamond
  // (which runs toward the bottom-right corner). Crests sit at (π/2 + 2πk)/freq.
  const crestθ = useMemo(() => {
    let best = Math.PI / 2 / freq;
    for (let k = 0; k < Math.ceil(freq); k++) {
      const c = (Math.PI / 2 + 2 * Math.PI * k) / freq;
      if (Math.abs(wrapPi(c + Math.PI / 2)) < Math.abs(wrapPi(best + Math.PI / 2))) best = c;
    }
    return best;
  }, [freq]);
  // At the crest sin() == 1, so the ring's radius there IS scale·(1 + amp): the pointer's own
  // distance reads the amplitude straight off, with no gain to invent.
  const wavesDrag = useParamDrag(
    env,
    'radial',
    'radialSineAmp',
    (pt) => Math.hypot(pt.x - gcx, pt.y - gcy) / diag / Math.max(1e-3, P.radialScale) - 1,
  );
  // The count handle rides the SAME ring as the waves handle (owner, 2026-09-08: "it should be
  // on the same ring i think as the wave amp") — the two controls of one shape belong on the
  // shape. Its ANGLE is fixed rather than tied to a crest: a slot that moved with the count
  // would slide out from under the pointer as the count changed, and the gesture would fight
  // itself. So it sits at a fixed bearing and simply rides the ring up and down as the petals
  // grow, which is the wave shape showing you what it is doing.
  const countθ = -Math.PI * 0.75;
  const countR = reachAt(countθ);
  const countDrag = useCountDrag(env, 'radial', 'radialSineFreq', { x: gcx, y: gcy });
  const ringPath = useMemo(() => {
    if (!wavy) return '';
    const pts: string[] = [];
    const N = Math.ceil(8 * freq) + 64;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI;
      const r = reachAt(a);
      pts.push(`${(gcx + Math.cos(a) * r).toFixed(1)},${(gcy + Math.sin(a) * r).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [wavy, freq, reachAt, gcx, gcy]);

  // Scale handle runs toward the nearest stage corner from the gradient centre, so scale=1
  // lands on (roughly) that corner and stays reachable; the inner dot biases the falloff.
  const dirx = u.w - gcx;
  const diry = u.h - gcy;
  const dm = Math.hypot(dirx, diry) || 1;
  const dir = { x: dirx / dm, y: diry / dm };
  const scaleR = P.radialScale * diag;
  const scalePos = pin(u, { x: gcx + dir.x * scaleR, y: gcy + dir.y * scaleR });

  // Bias rides the radius between centre and scale; dragging it TOWARD/AWAY from the centre
  // (radially, along `dir`) eases the falloff — reads more naturally than a tangential skew.
  const biasAnchor = { x: gcx + dir.x * 0.5 * scaleR, y: gcy + dir.y * 0.5 * scaleR };
  const biasDrag = useBiasDrag(env, 'radial', 'radialBias', dir, reach);
  const biasOff = (P.radialBias / BIAS_MAX) * reach;
  const biasPos = pin(u, { x: biasAnchor.x + dir.x * biasOff, y: biasAnchor.y + dir.y * biasOff });
  const cpos = pin(u, { x: gcx, y: gcy });
  const crestR = reachAt(crestθ);
  const wavesPos = pin(u, { x: gcx + Math.cos(crestθ) * crestR, y: gcy + Math.sin(crestθ) * crestR });
  const countPos = pin(u, { x: gcx + Math.cos(countθ) * countR, y: gcy + Math.sin(countθ) * countR });

  return (
    <>
      {/* The reach ring: a plain circle at rest, the real petal curve once the waves open —
          traced through the SAME `radialSineReach` the pixels use, so it cannot drift. */}
      {wavy ? (
        <polyline points={ringPath} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      ) : (
        <circle cx={gcx} cy={gcy} r={scaleR} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      )}
      <circle cx={gcx} cy={gcy} r={0.5 * scaleR} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} strokeDasharray="4 5" />
      <Handle x={scalePos.x} y={scalePos.y} title="Scale — drag in/out to set how far the gradient reaches" cursor="grab" drag={scaleDrag} resetKeys={['radialScale']}>
        <Diamond />
      </Handle>
      <Handle x={biasPos.x} y={biasPos.y} title="Bias — drag across the radius to ease the falloff" cursor="move" drag={biasDrag} resetKeys={['radialBias']}>
        <Dot r={6} />
      </Handle>
      {/* Waves: a faint dot ON the ring at rest (the same discoverable-hint language as the
          conic's mirror tab) that becomes a full handle once pulled off it into petals. */}
      <Handle
        x={wavesPos.x}
        y={wavesPos.y}
        title="Waves — pull off the ring to swell the reach into petals, push through the centre to pinch them"
        cursor="grab"
        drag={wavesDrag}
        resetKeys={['radialSineAmp', 'radialSineFreq']}
      >
        {wavy ? <Dot r={6} /> : <circle r={4.5} fill="none" stroke={GUIDE_SOFT} strokeWidth={2} />}
      </Handle>
      {wavy && (
        <Handle x={countPos.x} y={countPos.y} title="Count — orbit the centre to add or remove petals (it eases through whole ones)" cursor="grab" drag={countDrag} resetKeys={['radialSineFreq']}>
          <Diamond />
        </Handle>
      )}
      <Handle x={cpos.x} y={cpos.y} title="Centre — drag to move the gradient's origin" cursor="move" drag={centreDrag} resetKeys={['radialCx', 'radialCy']}>
        <circle r={12} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
        <Dot />
      </Handle>
    </>
  );
};

// ── conic — centre + rotation + collapsible mirror + bias-per-half ──────────────────────────

const ConicHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const TAU = Math.PI * 2;
  const gcx = u.cx + P.conicCx * u.half;
  const gcy = u.cy + P.conicCy * u.half;
  const reach = BIAS_REACH * Math.min(u.w, u.h);
  const rHandle = 0.4 * u.half;
  const biasR = 0.62 * u.half;

  const centreDrag = useCentreDrag(env, 'conic', 'conicCx', 'conicCy');
  // Rotation: the handle sits on the seam (θ = −π − angle); following the pointer rotates the
  // sweep, hence the negated pointer-angle metric (the legacy conic feel).
  const rotDrag = useParamDrag(env, 'conic', 'conicAngle', (pt) => -Math.atan2(pt.y - gcy, pt.x - gcx), {
    angular: true,
    wrapValue: true,
  });
  const split = 1 - P.conicMirror;
  const seamθ = -Math.PI - P.conicAngle; // phi = 0 (gradient start)
  // Mirror: the tab's angular distance from the seam (EITHER direction) sets the falling-arc
  // fraction — unambiguous from the collapsed state (any pull off the seam opens it), and it
  // re-reads the current mirror with no jump when grabbed (boundθ is mirror·TAU off the seam).
  const mirrorDrag = useHandleDrag(env, {
    onStart: () => {},
    onMove: (pt) => {
      const gap = Math.abs(wrapPi(Math.atan2(pt.y - gcy, pt.x - gcx) - seamθ)) / TAU; // 0..0.5
      setFullscreenGeomParams({ conicMirror: clampToField('conic', 'conicMirror', gap) });
    },
  });

  const boundθ = split * TAU - P.conicAngle - Math.PI; // rising/falling boundary (mirror handle)
  const angA = split * Math.PI - P.conicAngle - Math.PI; // phi = split/2 (rising-arc midpoint)
  const angB = (split + P.conicMirror / 2) * TAU - P.conicAngle - Math.PI; // falling-arc midpoint

  const anchorA = { x: gcx + Math.cos(angA) * biasR, y: gcy + Math.sin(angA) * biasR };
  const tangA = { x: Math.cos(angA), y: Math.sin(angA) }; // radial — drag in/out to bias
  const biasADrag = useBiasDrag(env, 'conic', 'conicBiasA', tangA, reach);
  const anchorB = { x: gcx + Math.cos(angB) * biasR, y: gcy + Math.sin(angB) * biasR };
  const tangB = { x: Math.cos(angB), y: Math.sin(angB) };
  const biasBDrag = useBiasDrag(env, 'conic', 'conicBiasB', tangB, reach);

  // ── twist: the seam winds into a log spiral, so the handle rides the seam ITSELF ──
  // The spoke at isotropic radius r sits `2π · conicTwistTurns(twist, r)` clockwise of the
  // seam, so a handle placed there is always on the line it controls — orbit it and the
  // spiral follows the pointer. `winding` is what one turn of twist is worth in radians there.
  const twistR = 0.78 * u.half;
  const twistIso = twistR / u.half;
  const twistWind = 2 * Math.PI * Math.log(1 + twistIso);
  const twistθ = seamθ - 2 * Math.PI * conicTwistTurns(P.conicTwist, twistIso);
  const twistDrag = useTwistDrag(env, 'conic', 'conicTwist', { x: gcx, y: gcy }, twistWind);
  const twisted = P.conicTwist !== 0;
  // The spiral guide traces the seam out from the centre through the same law the pixels use.
  const spiralPath = useMemo(() => {
    if (!twisted) return '';
    const maxR = Math.hypot(Math.max(gcx, u.w - gcx), Math.max(gcy, u.h - gcy));
    const pts: string[] = [];
    const N = 120;
    for (let i = 1; i <= N; i++) {
      const r = (i / N) * maxR;
      const θ = seamθ - 2 * Math.PI * conicTwistTurns(P.conicTwist, r / u.half);
      pts.push(`${(gcx + Math.cos(θ) * r).toFixed(1)},${(gcy + Math.sin(θ) * r).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [twisted, P.conicTwist, seamθ, gcx, gcy, u.w, u.h, u.half]);

  const cpos = pin(u, { x: gcx, y: gcy });
  const twistPos = pin(u, { x: gcx + Math.cos(twistθ) * twistR, y: gcy + Math.sin(twistθ) * twistR });
  const rotPos = pin(u, { x: gcx + Math.cos(seamθ) * rHandle, y: gcy + Math.sin(seamθ) * rHandle });
  // Mirror tab sits a fixed step BEYOND the rotation handle (same ray when collapsed), so it
  // never overlaps/steals the rotation grab; orbiting it off the seam opens the mirror.
  const mirRad = rHandle + 26;
  const mirPos = pin(u, { x: gcx + Math.cos(boundθ) * mirRad, y: gcy + Math.sin(boundθ) * mirRad });
  const aPos = pin(u, { x: anchorA.x + tangA.x * (P.conicBiasA / BIAS_MAX) * reach, y: anchorA.y + tangA.y * (P.conicBiasA / BIAS_MAX) * reach });
  const bPos = pin(u, { x: anchorB.x + tangB.x * (P.conicBiasB / BIAS_MAX) * reach, y: anchorB.y + tangB.y * (P.conicBiasB / BIAS_MAX) * reach });
  const mirrored = P.conicMirror > 0;

  return (
    <>
      <line x1={cpos.x} y1={cpos.y} x2={rotPos.x} y2={rotPos.y} stroke={GUIDE_FAINT} strokeWidth={1.5} />
      {mirrored && <line x1={cpos.x} y1={cpos.y} x2={mirPos.x} y2={mirPos.y} stroke={GUIDE_FAINT} strokeWidth={1.5} strokeDasharray="3 4" />}
      {twisted && <polyline points={spiralPath} fill="none" stroke={GUIDE_SOFT} strokeWidth={1} />}
      <Handle x={rotPos.x} y={rotPos.y} title="Rotation — drag around the centre to spin the sweep" cursor="grab" drag={rotDrag} resetKeys={['conicAngle']}>
        <Dot />
      </Handle>
      {/* Mirror tab: a faint ring just past the rotation dot (a discoverable hint) that grows
          into a full handle once pulled off the seam to reflect the sweep (0→1→0). */}
      <Handle x={mirPos.x} y={mirPos.y} title="Mirror — pull off the rotation handle to reflect the sweep (0→1→0)" cursor="grab" drag={mirrorDrag} resetKeys={['conicMirror', 'conicBiasA', 'conicBiasB']}>
        <circle r={mirrored ? 6 : 4.5} fill="none" stroke={mirrored ? HANDLE_FILL : GUIDE_SOFT} strokeWidth={mirrored ? 2.5 : 2} />
      </Handle>
      {/* Bias A is reachable whether or not the mirror is open: with the mirror collapsed it
          is the ONE bias the sampler reads, easing the whole sweep (it used to be hidden, so
          the plain conic had no bias control at all). */}
      <Handle
        x={aPos.x}
        y={aPos.y}
        title={mirrored ? 'Bias (rising half) — drag in/out to ease the sweep' : 'Bias — drag in/out to ease the sweep'}
        cursor="move"
        drag={biasADrag}
        resetKeys={['conicBiasA']}
      >
        <Dot r={6} />
      </Handle>
      {mirrored && (
        <Handle x={bPos.x} y={bPos.y} title="Bias (falling half) — drag in/out to ease the return" cursor="move" drag={biasBDrag} resetKeys={['conicBiasB']}>
          <Dot r={6} />
        </Handle>
      )}
      {/* Twist: a faint ring far out on the seam that winds the spokes into a log spiral when
          orbited — the same hint→handle language the mirror tab uses. */}
      <Handle
        x={twistPos.x}
        y={twistPos.y}
        title="Twist — orbit the centre to wind the sweep into a spiral"
        cursor="grab"
        drag={twistDrag}
        resetKeys={['conicTwist']}
      >
        {twisted ? <Dot r={6} /> : <circle r={4.5} fill="none" stroke={GUIDE_SOFT} strokeWidth={2} />}
      </Handle>
      <Handle x={cpos.x} y={cpos.y} title="Centre — drag to move the sweep's origin" cursor="move" drag={centreDrag} resetKeys={['conicCx', 'conicCy']}>
        <circle r={12} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
        <Dot />
      </Handle>
    </>
  );
};

// ── the layer shell — sizing, fade-on-idle, per-geom dispatch ─────────────────────────────

const GEOM_HANDLES: Record<string, React.FC<{ env: HandleEnv }>> = {
  linear: LinearHandles,
  radial: RadialHandles,
  conic: ConicHandles,
};

/** Whether a mode id has on-screen handles (drives the toolbar "Handles" toggle visibility).
 *  Derived from the SAME record that renders them — the two can't drift. */
export const hasGeometryHandles = (geomId: string): boolean => geomId in GEOM_HANDLES;

export const GeometryHandleLayer: React.FC = () => {
  const fs = useFullscreenState();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragging = useRef(false);

  const Handles = GEOM_HANDLES[fs.geom];
  // Layer active = a handled geometry is selected AND the toolbar toggle is on. Hooks below
  // gate on this (they run regardless — the early return is after them).
  const layerActive = !!Handles && fs.handles;

  // ── fade on idle: awake on mode entry + any pointer activity over the stage ──
  const [awake, setAwake] = useState(true);
  const awakeRef = useRef(true);
  const lastArm = useRef(0);
  const timer = useRef<number | null>(null);
  const wake = useCallback(() => {
    const now = performance.now();
    // Already awake + recently armed → skip the timer churn (pointermove fires at 120Hz+).
    if (awakeRef.current && now - lastArm.current < REARM_MS) return;
    lastArm.current = now;
    awakeRef.current = true;
    setAwake(true);
    const arm = (): void => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (dragging.current) arm(); // never fade mid-drag — re-arm and check again
        else {
          awakeRef.current = false;
          setAwake(false);
        }
      }, IDLE_FADE_MS);
    };
    arm();
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    // If the layer unmounts mid-drag (mode/route change while a handle is held), the
    // drag's `end` never fires — clear the interaction flag here so the overlay can't
    // stay pinned at the reduced interaction repaint cap.
    setFullscreenInteracting(false);
  }, []);
  useEffect(() => {
    if (layerActive) {
      lastArm.current = 0;
      wake();
    }
  }, [layerActive, fs.geom, wake]);
  useEffect(() => {
    if (!layerActive) return;
    // Window-level so it works without giving the layer a hit surface (the layer is
    // pointer-events:none except the handles — stage clicks pass through untouched).
    const onActivity = (e: PointerEvent): void => {
      // Cheap out BEFORE the rect read — at most ~4 hit-tests/s while awake.
      if (awakeRef.current && performance.now() - lastArm.current < REARM_MS) return;
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        wake();
      }
    };
    window.addEventListener('pointermove', onActivity, { passive: true });
    window.addEventListener('pointerdown', onActivity, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
    };
  }, [layerActive, wake]);
  const reducedMotion = useMemo(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── self-measure via callback ref (re-observes whenever React swaps the element, so the
  //    mount condition below can change freely without a hidden deps coupling) ──
  const roRef = useRef<ResizeObserver | null>(null);
  const setRoot = useCallback((el: HTMLDivElement | null) => {
    rootRef.current = el;
    roRef.current?.disconnect();
    roRef.current = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      const measure = (): void => setSize({ w: el.clientWidth, h: el.clientHeight });
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      roRef.current = ro;
    }
  }, []);

  if (!layerActive) return null;

  const env: HandleEnv | null = size
    ? {
        u: { w: size.w, h: size.h, cx: size.w / 2, cy: size.h / 2, half: Math.max(1, Math.min(size.w, size.h) / 2) },
        P: { ...GEOM_DEFAULTS, ...fs.geomParams },
        rootRef,
        wake,
        dragging,
      }
    : null;

  return (
    <div
      ref={setRoot}
      className="absolute inset-0"
      style={{
        // The fade is visual only — handle <g>s keep pointer-events:auto so a grab mid-fade
        // (or from muscle memory while faded) still lands; everything else passes through.
        pointerEvents: 'none',
        opacity: awake ? 1 : 0,
        transition: reducedMotion ? 'none' : 'opacity 600ms ease',
      }}
      data-testid="geometry-handle-layer"
    >
      {env && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${env.u.w} ${env.u.h}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', touchAction: 'none', overflow: 'hidden' }}
        >
          <Handles env={env} />
        </svg>
      )}
    </div>
  );
};

export default GeometryHandleLayer;
