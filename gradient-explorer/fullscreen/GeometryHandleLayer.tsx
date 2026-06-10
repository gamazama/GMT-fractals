/**
 * GeometryHandleLayer — on-screen direct-manipulation handles for the geometry modes
 * (Session B item 1 of the fullscreen-v2 fold-in polish; design ratified 2026-06-10).
 *
 * A 2D SVG layer mounted ABOVE the gradient stage (the same precedent as Liquify's
 * signifier overlay / Parallax's ring cursor: signifiers live in DOM/2D, never on the GL
 * canvas). Per geometry mode it shows the shape params as draggable handles:
 *   • radial — a centre DOT (radialCx / radialCy).
 *   • conic  — an ANGLE handle orbiting the centre, parked on the gradient SEAM
 *              (where the first ramp colour starts), so dragging it rotates the sweep.
 *   • arched — all four params: an APEX dot (archCy, slides the band vertically) ·
 *              a RADIUS diamond (archR, drag toward/away from the arc centre = curvature) ·
 *              a WIDTH bar on the outer edge (archHalfWidth, drag across the band) ·
 *              a SPAN pill on the arc end (archSpan, orbit to lengthen/shorten the band) —
 *              plus faint guide arcs (band edges + centre-line) so the shapes read.
 *   • scurve — a control dot riding a faint glyph of the actual ease curve; dragging it
 *              horizontally bends the curve (scurveShape) — the dot sits where the ramp
 *              crosses 50%.
 * Spline already has its own on-screen path editor and `random`'s amount is a count (not
 * spatial) — neither gets a handle here. Linear has no shape params.
 *
 * ── Determinism boundary ────────────────────────────────────────────────────────────────
 * Handles write ONLY `fullscreenStore.geomParams` (via `setFullscreenGeomParam`); the
 * overlay threads that into the render ctx, so the pure mappers (`sampleGeometry`) are
 * driven from the OUTSIDE and stay pure. Values are clamped to the mode's `paramFields`
 * ranges (the frozen seam metadata). Double-click a handle to reset its params (an unset
 * key IS the `GEOM_DEFAULTS` default — byte-identical to the pre-handles render).
 *
 * ── Visibility ──────────────────────────────────────────────────────────────────────────
 * Visible on mode activation and on any pointer activity over the stage; gently fades
 * after a few idle seconds (instant when `prefers-reduced-motion`). Never fades mid-drag.
 * `fullscreenStore.handles` (the toolbar "Handles" toggle) force-hides the whole layer.
 * PNG export can never contain handles BY CONSTRUCTION: export reads the canvas back
 * (`canvasToPngBlob(canvas)`), and this layer is sibling DOM above it.
 *
 * Drag feel: pointer capture, 1:1 tracking, with the house precision modifiers
 * (Shift = ×10 coarse, Alt = ×0.1 fine) applied per-segment — the same semantics as
 * `usePrecisionTrackDrag`, generalised to 2D/orbital drags.
 *
 * @see gradient-explorer/fullscreen/modes/geometryModes.tsx (the paramFields metadata)
 * @see palette/core/rampGeometry.ts (the pure mappings these params drive)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GEOM_DEFAULTS, easeShaped, type GeometryParams } from '../../palette/core/rampGeometry';
import {
  resetFullscreenGeomParams,
  setFullscreenGeomParam,
  useFullscreenState,
} from '../../palette/store/fullscreenStore';
import { getFullscreenMode } from './modeRegistry';
import { precisionMultiplier } from '../../components/inputs/usePrecisionTrackDrag';

/** Modes this layer knows how to dress with handles. */
const HANDLED_GEOMS = new Set(['radial', 'conic', 'arched', 'scurve']);

/** Whether a mode id has on-screen handles (drives the toolbar "Handles" toggle visibility). */
export const hasGeometryHandles = (geomId: string): boolean => HANDLED_GEOMS.has(geomId);

/** Idle time before the handle layer fades out. */
const IDLE_FADE_MS = 3000;

/** Liquify's signifier palette — one visual language across the fullscreen modes. */
const HANDLE_FILL = 'rgba(34,211,238,0.95)'; // cyan
const HANDLE_STROKE = 'rgba(0,0,0,0.55)';
const GUIDE_FAINT = 'rgba(255,255,255,0.12)';
const GUIDE_SOFT = 'rgba(255,255,255,0.30)';

/** Clamp a value to the range the mode declared for the param in its `paramFields`. */
const clampToField = (geomId: string, key: keyof GeometryParams, v: number): number => {
  const f = getFullscreenMode(geomId)?.paramFields?.find((p) => p.key === key);
  if (!f) return v;
  return Math.min(f.max, Math.max(f.min, v));
};

/** Wrap an angle into [-π, π) (the conic orbit never hits a hard stop). */
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
  /** False while faded — handles must not eat clicks invisibly. */
  interactive: boolean;
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
  env: HandleEnv;
  drag: ReturnType<typeof useHandleDrag>;
  resetKeys: readonly (keyof GeometryParams)[];
  children: React.ReactNode;
}> = ({ x, y, title, cursor, env, drag, resetKeys, children }) => (
  <g
    transform={`translate(${x},${y})`}
    style={{ pointerEvents: env.interactive ? 'auto' : 'none', cursor, touchAction: 'none' }}
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

// ── radial — centre dot ───────────────────────────────────────────────────────────────────

const RadialHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const acc = useRef({ cx: 0, cy: 0, lx: 0, ly: 0 });
  const drag = useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { cx: P.radialCx, cy: P.radialCy, lx: pt.x, ly: pt.y };
    },
    onMove: (pt) => {
      const a = acc.current;
      a.cx = clampToField('radial', 'radialCx', a.cx + ((pt.x - a.lx) / u.half) * pt.mult);
      a.cy = clampToField('radial', 'radialCy', a.cy + ((pt.y - a.ly) / u.half) * pt.mult);
      a.lx = pt.x;
      a.ly = pt.y;
      setFullscreenGeomParam('radialCx', a.cx);
      setFullscreenGeomParam('radialCy', a.cy);
    },
  });
  const p = pin(u, { x: u.cx + P.radialCx * u.half, y: u.cy + P.radialCy * u.half });
  return (
    <Handle x={p.x} y={p.y} title="Centre — drag to move the gradient's origin" cursor="move" env={env} drag={drag} resetKeys={['radialCx', 'radialCy']}>
      <circle r={12} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
      <Dot />
    </Handle>
  );
};

// ── conic — seam-angle orbit handle ───────────────────────────────────────────────────────

const ConicHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const acc = useRef({ value: 0, lastPhi: 0 });
  const phiOf = (pt: DragPoint): number => Math.atan2(pt.y - u.cy, pt.x - u.cx);
  const drag = useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { value: P.conicAngle, lastPhi: phiOf(pt) };
    },
    onMove: (pt) => {
      const a = acc.current;
      const phi = phiOf(pt);
      // The handle sits at θ = −π − conicAngle; following the pointer means dθ = dφ,
      // i.e. conicAngle decreases by the (precision-scaled) pointer-angle delta.
      a.value = wrapPi(a.value - wrapPi(phi - a.lastPhi) * pt.mult);
      a.lastPhi = phi;
      setFullscreenGeomParam('conicAngle', clampToField('conic', 'conicAngle', a.value));
    },
  });
  // Park the handle on the gradient SEAM (ramp position 0) so what you grab is what rotates.
  const theta = -Math.PI - P.conicAngle;
  const r = 0.4 * u.half;
  const hx = u.cx + Math.cos(theta) * r;
  const hy = u.cy + Math.sin(theta) * r;
  return (
    <>
      <line x1={u.cx} y1={u.cy} x2={hx} y2={hy} stroke={GUIDE_FAINT} strokeWidth={1.5} />
      <circle cx={u.cx} cy={u.cy} r={3} fill={GUIDE_SOFT} />
      <Handle x={hx} y={hy} title="Rotation — drag around the centre to spin the sweep" cursor="grab" env={env} drag={drag} resetKeys={['conicAngle']}>
        <Dot />
      </Handle>
    </>
  );
};

// ── arched — apex dot + radius diamond + width bar + span pill, over guide arcs ──────────

const ArchedHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  const { archCy, archR, archHalfWidth, archSpan } = P;
  // The band is an arc of the circle centred at (0, archCy) iso — below the frame, usually
  // OFF-screen. Arc point at angle `a` from straight-up (the field's atan2(ux, archCy−uy)).
  const Cx = u.cx;
  const Cy = u.cy + archCy * u.half;
  const at = (a: number, rad: number): { x: number; y: number } => ({
    x: Cx + Math.sin(a) * rad * u.half,
    y: Cy - Math.cos(a) * rad * u.half,
  });
  const arcPath = (rad: number): string => {
    const pts: string[] = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const a = -archSpan + (2 * archSpan * i) / N;
      const p = at(a, rad);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  /** Distance pointer→arc-centre, in iso units. */
  const distOf = (pt: DragPoint): number => Math.hypot(pt.x - Cx, pt.y - Cy) / u.half;
  /** Pointer angle from straight-up around the arc centre (the field's position angle). */
  const angOf = (pt: DragPoint): number => Math.atan2(pt.x - Cx, Cy - pt.y);

  // APEX dot — slides the whole band vertically (archCy). Apex y moves 1:1 with archCy.
  const cyAcc = useRef({ v: 0, ly: 0 });
  const cyDrag = useHandleDrag(env, {
    onStart: (pt) => {
      cyAcc.current = { v: archCy, ly: pt.y };
    },
    onMove: (pt) => {
      const a = cyAcc.current;
      a.v = clampToField('arched', 'archCy', a.v + ((pt.y - a.ly) / u.half) * pt.mult);
      a.ly = pt.y;
      setFullscreenGeomParam('archCy', a.v);
    },
  });

  // RADIUS diamond — drag toward/away from the arc centre (curvature).
  const rAcc = useRef({ v: 0, ld: 0 });
  const rDrag = useHandleDrag(env, {
    onStart: (pt) => {
      rAcc.current = { v: archR, ld: distOf(pt) };
    },
    onMove: (pt) => {
      const a = rAcc.current;
      const d = distOf(pt);
      a.v = clampToField('arched', 'archR', a.v + (d - a.ld) * pt.mult);
      a.ld = d;
      setFullscreenGeomParam('archR', a.v);
    },
  });

  // WIDTH bar — on the OUTER band edge; drag across the band to thicken/thin it.
  const wAcc = useRef({ v: 0, ld: 0 });
  const wDrag = useHandleDrag(env, {
    onStart: (pt) => {
      wAcc.current = { v: archHalfWidth, ld: distOf(pt) };
    },
    onMove: (pt) => {
      const a = wAcc.current;
      const d = distOf(pt);
      a.v = clampToField('arched', 'archHalfWidth', a.v + (d - a.ld) * pt.mult);
      a.ld = d;
      setFullscreenGeomParam('archHalfWidth', a.v);
    },
  });

  // SPAN pill — on the band's end; orbit around the arc centre to sweep further/shorter.
  const sAcc = useRef({ v: 0, la: 0 });
  const sDrag = useHandleDrag(env, {
    onStart: (pt) => {
      sAcc.current = { v: archSpan, la: angOf(pt) };
    },
    onMove: (pt) => {
      const a = sAcc.current;
      const ang = angOf(pt);
      a.v = clampToField('arched', 'archSpan', a.v + wrapPi(ang - a.la) * pt.mult);
      a.la = ang;
      setFullscreenGeomParam('archSpan', a.v);
    },
  });

  // Handle layout along the arc — apex at 0, radius at −45% span, width at +45% span
  // (outer edge), span at the +span end. Distinct angular slots so they never collide.
  const apex = pin(u, at(0, archR));
  const radiusP = pin(u, at(-0.45 * archSpan, archR));
  const widthP = pin(u, at(0.45 * archSpan, archR + archHalfWidth));
  const spanP = pin(u, at(archSpan, archR));
  const mirror = at(-archSpan, archR);
  const deg = (a: number): number => (a * 180) / Math.PI;
  return (
    <>
      {/* guide arcs: band edges (faint) + centre-line (softer) */}
      <polyline points={arcPath(archR - archHalfWidth)} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      <polyline points={arcPath(archR + archHalfWidth)} fill="none" stroke={GUIDE_FAINT} strokeWidth={1} />
      <polyline points={arcPath(archR)} fill="none" stroke={GUIDE_SOFT} strokeWidth={1} strokeDasharray="4 5" />
      {/* the band's other end — a static tick (the band is symmetric; one span handle drives both) */}
      <circle cx={mirror.x} cy={mirror.y} r={3.5} fill={GUIDE_SOFT} />
      <Handle x={apex.x} y={apex.y} title="Position — drag up/down to slide the band" cursor="ns-resize" env={env} drag={cyDrag} resetKeys={['archCy']}>
        <Dot />
      </Handle>
      <Handle x={radiusP.x} y={radiusP.y} title="Radius — drag to flatten or tighten the curve" cursor="grab" env={env} drag={rDrag} resetKeys={['archR']}>
        <rect x={-6.5} y={-6.5} width={13} height={13} transform="rotate(45)" fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
      </Handle>
      <Handle x={widthP.x} y={widthP.y} title="Width — drag across the band to thicken it" cursor="grab" env={env} drag={wDrag} resetKeys={['archHalfWidth']}>
        <rect x={-3} y={-9} width={6} height={18} rx={2.5} transform={`rotate(${deg(0.45 * archSpan)})`} fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
      </Handle>
      <Handle x={spanP.x} y={spanP.y} title="Span — drag along the arc to sweep further" cursor="grab" env={env} drag={sDrag} resetKeys={['archSpan']}>
        <rect x={-9} y={-3} width={18} height={6} rx={3} transform={`rotate(${deg(archSpan)})`} fill={HANDLE_FILL} stroke={HANDLE_STROKE} strokeWidth={2} />
      </Handle>
    </>
  );
};

// ── scurve — a control point riding the ease curve ───────────────────────────────────────

/** Invert the shaped ease (monotone) by bisection: the nx where easeShaped(nx) = target. */
const invEase = (target: number, shape: number): number => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (easeShaped(mid, shape) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

/** The scurveShape whose ease crosses 50% at `nx` (inverts s^γ = ½ with s = smootherstep). */
const shapeFromMidpoint = (nx: number): number => {
  const s = easeShaped(Math.min(0.98, Math.max(0.02, nx)), 0);
  const gamma = Math.log(0.5) / Math.log(s);
  return clampToField('scurve', 'scurveShape', -Math.log(gamma));
};

const SCurveHandles: React.FC<{ env: HandleEnv }> = ({ env }) => {
  const { u, P } = env;
  // Curve glyph: the REAL easeShaped curve, drawn in a mid band (y: 80%→20% of the stage).
  const curveY = (t: number): number => u.h * (0.8 - 0.6 * easeShaped(t, P.scurveShape));
  const curve = useMemo(() => {
    const pts: string[] = [];
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(`${(t * u.w).toFixed(1)},${curveY(t).toFixed(1)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.w, u.h, P.scurveShape]);
  const acc = useRef({ nx: 0, lx: 0 });
  const drag = useHandleDrag(env, {
    onStart: (pt) => {
      acc.current = { nx: invEase(0.5, P.scurveShape), lx: pt.x };
    },
    onMove: (pt) => {
      const a = acc.current;
      a.nx += ((pt.x - a.lx) / u.w) * pt.mult;
      a.lx = pt.x;
      const shape = shapeFromMidpoint(a.nx);
      // Re-sync the accumulator to the clamped shape so the dot re-responds immediately
      // after an overshoot past the range end.
      a.nx = invEase(0.5, shape);
      setFullscreenGeomParam('scurveShape', shape);
    },
  });
  const nxMid = invEase(0.5, P.scurveShape);
  const p = pin(u, { x: nxMid * u.w, y: curveY(nxMid) });
  return (
    <>
      <polyline points={curve} fill="none" stroke={GUIDE_SOFT} strokeWidth={1.5} />
      <Handle x={p.x} y={p.y} title="Shape — drag left/right to bend the curve" cursor="ew-resize" env={env} drag={drag} resetKeys={['scurveShape']}>
        <Dot />
      </Handle>
    </>
  );
};

// ── the layer shell — sizing, fade-on-idle, per-geom dispatch ─────────────────────────────

const GEOM_HANDLES: Record<string, React.FC<{ env: HandleEnv }>> = {
  radial: RadialHandles,
  conic: ConicHandles,
  arched: ArchedHandles,
  scurve: SCurveHandles,
};

export const GeometryHandleLayer: React.FC = () => {
  const fs = useFullscreenState();
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragging = useRef(false);

  // ── fade on idle: awake on mode entry + any pointer activity over the stage ──
  const [awake, setAwake] = useState(true);
  const timer = useRef<number | null>(null);
  const wake = useCallback(() => {
    setAwake(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (dragging.current) wake();
      else setAwake(false);
    }, IDLE_FADE_MS);
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    wake();
  }, [fs.geom, fs.handles, wake]);
  useEffect(() => {
    // Window-level so it works without giving the layer a hit surface (the layer is
    // pointer-events:none except the handles — stage clicks pass through untouched).
    const onActivity = (e: PointerEvent): void => {
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
  }, [wake]);
  const reducedMotion = useMemo(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── self-measure (the layer fills the stage; units must track the canvas) ──
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = (): void =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fs.geom, fs.handles]);

  const Handles = GEOM_HANDLES[fs.geom];
  if (!Handles || !fs.handles) return null;

  const env: HandleEnv | null = size
    ? {
        u: { w: size.w, h: size.h, cx: size.w / 2, cy: size.h / 2, half: Math.max(1, Math.min(size.w, size.h) / 2) },
        P: { ...GEOM_DEFAULTS, ...fs.geomParams },
        rootRef,
        wake,
        dragging,
        interactive: awake,
      }
    : null;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        opacity: awake ? 1 : 0,
        transition: reducedMotion ? 'none' : 'opacity 600ms ease',
      }}
      aria-hidden={!awake}
      data-testid="geometry-handle-layer"
    >
      {env && (
        <svg width="100%" height="100%" viewBox={`0 0 ${env.u.w} ${env.u.h}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <Handles env={env} />
        </svg>
      )}
    </div>
  );
};

export default GeometryHandleLayer;
