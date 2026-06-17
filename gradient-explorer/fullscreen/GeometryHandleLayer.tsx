/**
 * GeometryHandleLayer — on-screen direct-manipulation handles for the geometry modes
 * (Gradient Explorer fullscreen; v2 redesign 2026-06-10, see plans/gx-geometry-handles-v2.md).
 *
 * A 2D SVG layer mounted ABOVE the gradient stage (the same precedent as Liquify's
 * signifier overlay / Parallax's ring cursor: signifiers live in DOM/2D, never on the GL
 * canvas). Per geometry mode it shows the shape params as draggable handles:
 *   • linear — a BIAS dot at the gradient-axis midpoint (drag ⟂ to the axis to ease the ramp
 *              into an S, riding a glyph of the real eased curve) + an ANGLE dot tethered to
 *              it on the axis (orbit the centre to rotate the gradient direction).
 *   • radial — a CENTRE dot · a SCALE diamond on the radius (how far the gradient reaches) ·
 *              a BIAS dot on the 50% ring (drag across the radius to ease the falloff).
 *   • conic  — a CENTRE dot · a ROTATION dot on the seam · a MIRROR ring that starts UNDER
 *              the rotation dot and pulls off to reflect the sweep (0→1→0); once pulled out,
 *              a BIAS dot on each arc (rising / falling).
 *   • arched — apex / radius / width / span (as before) + a CURVATURE dot that bends the
 *              band's spine off a circular arc, over guide arcs that follow the bend.
 * Spline has its own on-screen path editor; Linear/Radial/Conic/Arched are the handled set.
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
import { GEOM_DEFAULTS, bias, archRadiusAt, type GeometryParams } from '../../palette/core/rampGeometry';
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
const HANDLE_FILL = 'rgba(34,211,238,0.95)'; // cyan
const HANDLE_STROKE = 'rgba(0,0,0,0.55)';
const GUIDE_FAINT = 'rgba(255,255,255,0.12)';
const GUIDE_SOFT = 'rgba(255,255,255,0.30)';

/** Bias param range end (matches the paramFields ±2) and the perpendicular drag reach (as a
 *  fraction of the shorter stage side) that maps to that full range. */
const BIAS_MAX = 2;
const BIAS_REACH = 0.3;
/** Linear axis half-length as a fraction of the shorter stage side. */
const AXIS_FRAC = 0.42;

/** Clamp a value to the range the mode declared for the param in its `paramFields` —
 *  paramFields stays the single source of truth for ranges (no duplicated min/max). */
const clampToField = (geomId: string, key: HandleParamKey, v: number): number => {
  const f = getFullscreenMode(geomId)?.paramFields?.find((p) => p.key === key);
  if (!f) return v;
  return Math.min(f.max, Math.max(f.min, v));
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

/** Shared handle chrome: oversized invisible hit-disc + the visible glyph + tooltip. */
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

  return (
    <>
      <circle cx={gcx} cy={gcy} r={scaleR} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      <circle cx={gcx} cy={gcy} r={0.5 * scaleR} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} strokeDasharray="4 5" />
      <Handle x={scalePos.x} y={scalePos.y} title="Scale — drag in/out to set how far the gradient reaches" cursor="grab" drag={scaleDrag} resetKeys={['radialScale']}>
        <Diamond />
      </Handle>
      <Handle x={biasPos.x} y={biasPos.y} title="Bias — drag across the radius to ease the falloff" cursor="move" drag={biasDrag} resetKeys={['radialBias']}>
        <Dot r={6} />
      </Handle>
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

  const cpos = pin(u, { x: gcx, y: gcy });
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
      <Handle x={rotPos.x} y={rotPos.y} title="Rotation — drag around the centre to spin the sweep" cursor="grab" drag={rotDrag} resetKeys={['conicAngle']}>
        <Dot />
      </Handle>
      {/* Mirror tab: a faint ring just past the rotation dot (a discoverable hint) that grows
          into a full handle once pulled off the seam to reflect the sweep (0→1→0). */}
      <Handle x={mirPos.x} y={mirPos.y} title="Mirror — pull off the rotation handle to reflect the sweep (0→1→0)" cursor="grab" drag={mirrorDrag} resetKeys={['conicMirror', 'conicBiasA', 'conicBiasB']}>
        <circle r={mirrored ? 6 : 4.5} fill="none" stroke={mirrored ? HANDLE_FILL : GUIDE_SOFT} strokeWidth={mirrored ? 2.5 : 2} />
      </Handle>
      {mirrored && (
        <Handle x={aPos.x} y={aPos.y} title="Bias (rising half) — drag in/out to ease the sweep" cursor="move" drag={biasADrag} resetKeys={['conicBiasA']}>
          <Dot r={6} />
        </Handle>
      )}
      {mirrored && (
        <Handle x={bPos.x} y={bPos.y} title="Bias (falling half) — drag in/out to ease the return" cursor="move" drag={biasBDrag} resetKeys={['conicBiasB']}>
          <Dot r={6} />
        </Handle>
      )}
      <Handle x={cpos.x} y={cpos.y} title="Centre — drag to move the sweep's origin" cursor="move" drag={centreDrag} resetKeys={['conicCx', 'conicCy']}>
        <circle r={12} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
        <Dot />
      </Handle>
    </>
  );
};

// ── arched — apex / radius / width / span + curvature, over spine-following guide arcs ───────

const ArchedHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const { archCy, archR, archHalfWidth, archSpan, archCurve } = P;
  // The band is an arc of the circle centred at (0, archCy) iso — usually OFF-screen below.
  const Cx = u.cx;
  const Cy = u.cy + archCy * u.half;
  // Target radius bends with the sweep angle (curvature); the SAME law `sampleGeometry` uses
  // (archRadiusAt), so the guide arcs trace the exact rendered band — no parallel formula.
  const Rt = (a: number): number => archRadiusAt(archR, archCurve, a);
  const at = (a: number, rad: number): { x: number; y: number } => ({
    x: Cx + Math.sin(a) * rad * u.half,
    y: Cy - Math.cos(a) * rad * u.half,
  });
  /** Guide polyline at a constant offset off the (possibly curved) spine. */
  const arcPath = (off: number): string => {
    const pts: string[] = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const a = -archSpan + (2 * archSpan * i) / N;
      const p = at(a, Rt(a) + off);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  /** Distance pointer→arc-centre, in iso units. */
  const distOf = (pt: DragPoint): number => Math.hypot(pt.x - Cx, pt.y - Cy) / u.half;
  /** Pointer angle from straight-up around the arc centre (the field's position angle). */
  const angOf = (pt: DragPoint): number => Math.atan2(pt.x - Cx, Cy - pt.y);

  const cyDrag = useParamDrag(env, 'arched', 'archCy', (pt) => pt.y / u.half);
  const rDrag = useParamDrag(env, 'arched', 'archR', distOf);
  const wDrag = useParamDrag(env, 'arched', 'archHalfWidth', distOf);
  const sDrag = useParamDrag(env, 'arched', 'archSpan', angOf, { angular: true });
  // Curvature: at a fixed sample angle, the pointer's arc-centre distance maps to the radius
  // there (Rt = archR·(1+curve·a²)), so we back out `curve` and drag it directly. The aC²
  // divisor is floored (max(·,0.2)) so a short span doesn't make the handle hypersensitive.
  const aC = -0.7 * archSpan;
  const curveDrag = useParamDrag(env, 'arched', 'archCurve', (pt) => (distOf(pt) / Math.max(1e-3, archR) - 1) / Math.max(aC * aC, 0.2));

  // Handle layout along distinct angular slots so they never collide.
  const apex = pin(u, at(0, Rt(0)));
  const radiusP = pin(u, at(-0.45 * archSpan, Rt(-0.45 * archSpan)));
  const widthP = pin(u, at(0.45 * archSpan, Rt(0.45 * archSpan) + archHalfWidth));
  const spanP = pin(u, at(archSpan, Rt(archSpan)));
  const curveP = pin(u, at(aC, Rt(aC)));
  const mirror = at(-archSpan, Rt(-archSpan));
  const deg = (a: number): number => (a * 180) / Math.PI;
  // The three 49-point guide polylines rebuild only when the band shape/size changes — not on
  // every pointer-rate re-render (the layer re-renders on each geomParams emit).
  const paths = useMemo(
    () => ({ inner: arcPath(-archHalfWidth), outer: arcPath(archHalfWidth), centre: arcPath(0) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [archCy, archR, archHalfWidth, archSpan, archCurve, u.cx, u.cy, u.half],
  );
  return (
    <>
      {/* guide arcs: band edges (faint) + centre-line (softer), all following the curved spine */}
      <polyline points={paths.inner} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      <polyline points={paths.outer} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      <polyline points={paths.centre} fill="none" stroke={GUIDE_SOFT} strokeWidth={1} strokeDasharray="4 5" />
      <circle cx={mirror.x} cy={mirror.y} r={3.5} fill={GUIDE_SOFT} />
      <Handle x={apex.x} y={apex.y} title="Position — drag up/down to slide the band" cursor="ns-resize" drag={cyDrag} resetKeys={['archCy']}>
        <Dot />
      </Handle>
      <Handle x={radiusP.x} y={radiusP.y} title="Radius — drag to flatten or tighten the curve" cursor="grab" drag={rDrag} resetKeys={['archR']}>
        <Diamond />
      </Handle>
      <Handle x={widthP.x} y={widthP.y} title="Width — drag across the band to thicken it" cursor="grab" drag={wDrag} resetKeys={['archHalfWidth']}>
        <rect x={-3} y={-9} width={6} height={18} rx={2.5} transform={`rotate(${deg(0.45 * archSpan)})`} fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
      </Handle>
      <Handle x={spanP.x} y={spanP.y} title="Span — drag along the arc to sweep further" cursor="grab" drag={sDrag} resetKeys={['archSpan']}>
        <rect x={-9} y={-3} width={18} height={6} rx={3} transform={`rotate(${deg(archSpan)})`} fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
      </Handle>
      <Handle x={curveP.x} y={curveP.y} title="Curvature — drag in/out to bend the band's spine" cursor="grab" drag={curveDrag} resetKeys={['archCurve']}>
        <Dot r={6} />
      </Handle>
    </>
  );
};

// ── the layer shell — sizing, fade-on-idle, per-geom dispatch ─────────────────────────────

const GEOM_HANDLES: Record<string, React.FC<{ env: HandleEnv }>> = {
  linear: LinearHandles,
  radial: RadialHandles,
  conic: ConicHandles,
  arched: ArchedHandles,
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
