/**
 * splineMode — the SPLINE fullscreen mode: the gradient flows along a user-editable PATH
 * (the Adobe Illustrator Freeform-Gradient "Lines" model). It registers as a `glQuad`
 * mode against the FROZEN mode plug-in seam — purely additively (this module + one import
 * line in `modes/index.ts`; the overlay core is untouched).
 *
 * ── How it renders ────────────────────────────────────────────────────────────────────
 * CPU side: the user's control points are tessellated through a CENTRIPETAL Catmull-Rom
 * (α=0.5 — interpolates the points, auto-tangents, provably no cusps/self-intersection)
 * into a polyline + a normalized arc-length table. GPU side: a `glQuad` fragment runs a
 * full-bleed DIFFUSION field — a Shepard inverse-square blend of the along-path arc-length
 * coord over EVERY segment (NOT a nearest-segment pick, which would leave hard Voronoi seams
 * along the medial axis): crisp on the path, smooth in the gaps, no void. One `sampleLut` on
 * the blended coord. `Spread` sets the Shepard core radius (hug-the-path ↔ wash); the
 * perpendicular distance to the nearest segment drives a `Depth` proximity shade (glow near /
 * vignette far). The compositor wraps it in the shared blue-noise dither tail, so it dithers +
 * exports like every other mode.
 *
 * ── Why a Controls-mounted interaction layer ──────────────────────────────────────────
 * The frozen seam feeds a mode only `{amount, seed}` through `ctx.params` and re-renders
 * the compositor only on the overlay's own deps — neither carries a variable-length point
 * list nor fires on a point drag, and the overlay wires pointer events only for the
 * `ownCanvas` fractal. So this mode keeps its editable state in its OWN module store and
 * mounts a self-contained interaction layer (via its `Controls`, portalled into the stage)
 * that owns a live preview — reusing the seam's `FullscreenCompositor` verbatim so the live
 * frame is byte-identical to what the overlay's compositor renders for split + PNG export.
 * `setUniforms` reads the same module store, so the overlay's export path (which re-presents
 * through its compositor) reflects the current curve without any overlay edit. The editor
 * mounts whenever the overlay is open — fullscreen AND the split docked pane — so the path is
 * fully editable in both (the split pane just live-follows the hero's colours).
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the seam contract)
 * @see plans/fullscreen-v2-rescope.md "Mode plug-in seam (FROZEN)" + the spline RATIFIED entry
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { GEOM_DEFAULTS } from '../../../palette/core/rampGeometry';
import { renderStopsToBuffer } from '../../../palette/core/gmtGradient';
import { useFullscreenState } from '../../../palette/store/fullscreenStore';
import { useActiveHeroSelection } from '../../../palette/store/heroSelection';
import type { FullscreenMode } from '../modeRegistry';
import { FullscreenCompositor } from '../FullscreenCompositor';
import { clamp01 } from '../../../utils/stopOps';

// ── geometry ────────────────────────────────────────────────────────────────────────────

/** A control point in normalized stage UV (0,0 = top-left, 1,1 = bottom-right). */
export interface SplinePoint { x: number; y: number }

/** Max polyline vertices uploaded to the shader. Each vertex is one `vec4` of `uPoly`
 *  (xy = position, z = arc-length), so the whole path costs MAX_POLY fragment-uniform
 *  vectors — packing into vec4 (vs separate vec2 + float arrays) keeps it well under the
 *  224-vector GLSL ES 3.0 floor that ANGLE/integrated GPUs report, AND keeps the per-frag
 *  loop cheap. Control points tessellate to fit this budget. */
const MAX_POLY = 64;


/** The tessellated path. `poly` (x,y pairs) + `arc` (normalized cumulative length) drive the
 *  CPU hit-testing + outline; `packed` is the GL upload (vec4 = x,y,arc,0 per vertex); `seg`
 *  is the control index to insert before for "click-on-path". All length-`count` prefixes of
 *  MAX_POLY-sized buffers. */
export interface SplineTessellation {
  poly: Float32Array;   // length MAX_POLY*2
  arc: Float32Array;    // length MAX_POLY
  packed: Float32Array; // length MAX_POLY*4 — vec4(x, y, arc, 0) per vertex for `uPoly`
  seg: Int32Array;      // length MAX_POLY
  count: number;
}

/**
 * Tessellate control points through a CENTRIPETAL Catmull-Rom (α=0.5). Endpoints are
 * reflected (P₋₁ = 2P₀−P₁) so the knot intervals stay non-zero, and the nonuniform
 * Barry–Goldman evaluation keeps the curve inside the points with no overshoot. Pure +
 * deterministic given the points. Falls back to the raw points for < 2 inputs.
 */
export const tessellateSpline = (points: readonly SplinePoint[]): SplineTessellation => {
  const poly = new Float32Array(MAX_POLY * 2);
  const arc = new Float32Array(MAX_POLY);
  const packed = new Float32Array(MAX_POLY * 4);
  const seg = new Int32Array(MAX_POLY);
  const n = points.length;
  if (n === 0) return { poly, arc, packed, seg, count: 0 };
  if (n === 1) {
    poly[0] = points[0].x; poly[1] = points[0].y;
    packed[0] = points[0].x; packed[1] = points[0].y;
    return { poly, arc, packed, seg, count: 1 };
  }

  // Reflected phantom endpoints so the first/last segments have well-defined tangents.
  const E: SplinePoint[] = [
    { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y },
    ...points,
    { x: 2 * points[n - 1].x - points[n - 2].x, y: 2 * points[n - 1].y - points[n - 2].y },
  ];

  // Spread the polyline budget across segments (≥3 samples each, ≤ MAX_POLY total).
  const sub = Math.max(3, Math.min(24, Math.floor((MAX_POLY - 1) / (n - 1))));
  const knot = (a: SplinePoint, b: SplinePoint, t: number): number =>
    t + Math.max(1e-4, Math.pow(Math.hypot(b.x - a.x, b.y - a.y), 0.5)); // α = 0.5 (centripetal)

  let count = 0;
  const push = (x: number, y: number, segIdx: number): void => {
    if (count >= MAX_POLY) return;
    poly[count * 2] = x; poly[count * 2 + 1] = y; seg[count] = segIdx;
    count++;
  };

  for (let k = 0; k < n - 1; k++) {
    const p0 = E[k], p1 = E[k + 1], p2 = E[k + 2], p3 = E[k + 3];
    const t0 = 0;
    const t1 = knot(p0, p1, t0);
    const t2 = knot(p1, p2, t1);
    const t3 = knot(p2, p3, t2);
    // The first vertex of a segment duplicates the previous segment's last → skip it after k=0.
    const start = k === 0 ? 0 : 1;
    for (let s = start; s <= sub; s++) {
      const t = t1 + ((t2 - t1) * s) / sub;
      const a1x = ((t1 - t) * p0.x + (t - t0) * p1.x) / (t1 - t0);
      const a1y = ((t1 - t) * p0.y + (t - t0) * p1.y) / (t1 - t0);
      const a2x = ((t2 - t) * p1.x + (t - t1) * p2.x) / (t2 - t1);
      const a2y = ((t2 - t) * p1.y + (t - t1) * p2.y) / (t2 - t1);
      const a3x = ((t3 - t) * p2.x + (t - t2) * p3.x) / (t3 - t2);
      const a3y = ((t3 - t) * p2.y + (t - t2) * p3.y) / (t3 - t2);
      const b1x = ((t2 - t) * a1x + (t - t0) * a2x) / (t2 - t0);
      const b1y = ((t2 - t) * a1y + (t - t0) * a2y) / (t2 - t0);
      const b2x = ((t3 - t) * a2x + (t - t1) * a3x) / (t3 - t1);
      const b2y = ((t3 - t) * a2y + (t - t1) * a3y) / (t3 - t1);
      const cx = ((t2 - t) * b1x + (t - t1) * b2x) / (t2 - t1);
      const cy = ((t2 - t) * b1y + (t - t1) * b2y) / (t2 - t1);
      push(cx, cy, k + 1); // a click on this stretch inserts a control point at index k+1
    }
  }

  // Normalized cumulative arc-length over the polyline → the ramp coordinate per vertex.
  let total = 0;
  const seglen = new Float32Array(count);
  for (let i = 1; i < count; i++) {
    const dx = poly[i * 2] - poly[(i - 1) * 2];
    const dy = poly[i * 2 + 1] - poly[(i - 1) * 2 + 1];
    total += Math.hypot(dx, dy);
    seglen[i] = total;
  }
  const inv = total > 1e-9 ? 1 / total : 0;
  for (let i = 0; i < count; i++) {
    arc[i] = seglen[i] * inv;
    packed[i * 4] = poly[i * 2];
    packed[i * 4 + 1] = poly[i * 2 + 1];
    packed[i * 4 + 2] = arc[i];
  }

  return { poly, arc, packed, seg, count };
};

// ── mode-private store ──────────────────────────────────────────────────────────────────
// Transient + PAGE-session-scoped (exactly like fullscreenStore: a module-level holder that
// survives overlay open/close and mode switches, and resets only on reload). The editable
// curve is a VIEW choice over a gradient, never document state. A monotone `version` lets
// subscribers cheaply detect point changes; the tessellation is memoized on it so
// `setUniforms` and the interaction layer share one compute.

interface SplineState {
  points: SplinePoint[];
  selected: number | null;
  spread: number;
  depth: number;
  version: number;
}

/** A gentle default S so the mode looks good with zero tweaking (child-simple). */
const DEFAULT_POINTS: SplinePoint[] = [
  { x: 0.12, y: 0.62 }, { x: 0.38, y: 0.34 }, { x: 0.62, y: 0.66 }, { x: 0.88, y: 0.38 },
];

let state: SplineState = {
  points: DEFAULT_POINTS.map((p) => ({ ...p })),
  selected: null,
  spread: GEOM_DEFAULTS.splineSpread,
  depth: GEOM_DEFAULTS.splineDepth,
  version: 0,
};
const listeners = new Set<() => void>();
const emit = (next: Partial<SplineState>, bumpPoints = false): void => {
  state = { ...state, ...next, version: state.version + (bumpPoints ? 1 : 0) };
  listeners.forEach((l) => l());
};
const getSplineState = (): SplineState => state;

export const useSplineState = (): SplineState =>
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getSplineState, getSplineState);

// Memoized tessellation — recomputed only when the point set changes (tracked by `version`).
let cachedVersion = -1;
let cachedTess: SplineTessellation = tessellateSpline(state.points);
const getTess = (): SplineTessellation => {
  if (cachedVersion !== state.version) {
    cachedTess = tessellateSpline(state.points);
    cachedVersion = state.version;
  }
  return cachedTess;
};

const MAX_POINTS = 24;
/** Insert a point at `atIndex` (clamped to [0, len] so prepend/append both work). */
const insertPoint = (atIndex: number, x: number, y: number): number => {
  if (state.points.length >= MAX_POINTS) return state.selected ?? 0;
  const i = Math.max(0, Math.min(state.points.length, atIndex));
  const pts = [...state.points];
  pts.splice(i, 0, { x: clamp01(x), y: clamp01(y) });
  emit({ points: pts, selected: i }, true);
  return i;
};
const movePoint = (i: number, x: number, y: number): void => {
  if (i < 0 || i >= state.points.length) return;
  const pts = [...state.points];
  pts[i] = { x: clamp01(x), y: clamp01(y) };
  emit({ points: pts }, true);
};
const removePoint = (i: number): void => {
  if (state.points.length <= 2 || i < 0 || i >= state.points.length) return;
  const pts = state.points.filter((_, j) => j !== i);
  // Keep a selection on the point that slid into this slot (or the new last one) so the artist
  // can press Delete repeatedly to clear a run of points without re-clicking each time.
  const nextSel = Math.min(i, pts.length - 1);
  emit({ points: pts, selected: nextSel }, true);
};
const selectPoint = (i: number | null): void => emit({ selected: i });
const resetCurve = (): void => emit({ points: DEFAULT_POINTS.map((p) => ({ ...p })), selected: null }, true);
const setSpread = (v: number): void => emit({ spread: Math.max(0, Math.min(1, v)) });
const setDepth = (v: number): void => emit({ depth: Math.max(-1, Math.min(1, v)) });

// ── glQuad shader: nearest-segment over the polyline → arc-length → LUT, band falloff ─────

// The polyline rides a 1D RGBA32F DATA TEXTURE (texel i = vec4(x, y, arc, 0)), read via
// `texelFetch`, NOT a uniform array: dynamic indexing of a uniform array inside a data-dependent
// loop is rejected by ANGLE/D3D11 (Firefox/Windows) with an empty compile log. texelFetch with a
// computed coord is core-WebGL2 and portable, and sidesteps the fragment-uniform-vector budget.
const SPLINE_FRAG_UNIFORMS = /* glsl */ `
uniform sampler2D uPolyTex; // RGBA32F ${MAX_POLY}×1 — texel i = vec4(x, y, arc, 0)
uniform int uPolyN;
uniform float uSpread;
uniform float uDepth;
uniform float uAspect;
`;

const SPLINE_FRAG_BODY = /* glsl */ `
vec3 modeColor(vec2 uv) {
  // Aspect-correct the metric so the field reads isotropically on any canvas (work in a space
  // where y∈[0,1] and x∈[0,uAspect]).
  vec2 p = vec2(uv.x * uAspect, uv.y);
  // Illustrator Freeform-"Lines" DIFFUSION fill: the whole canvas takes the gradient colour of
  // the path, flowing along the curve and filling the frame (no void). Rather than nearest-point
  // (which leaves hard Voronoi seams along the medial axis between curve arms), blend the along-
  // path coord by inverse-square distance (Shepard) over every segment — crisp on the path, smooth
  // in the gaps. One LUT sample on the blended coord.
  float accT = 0.0;
  float wsum = 0.0;
  float bestD = 1e9;
  // Spread → Shepard core radius: tiny (crisp, colours hug the path) up to large (flat weights,
  // colours wash across the whole field). Squared so the low end of the slider stays sensitive.
  float core = mix(2e-4, 0.2, uSpread * uSpread);
  for (int i = 0; i < ${MAX_POLY - 1}; i++) {
    if (i >= uPolyN - 1) break;
    vec4 va = texelFetch(uPolyTex, ivec2(i, 0), 0);
    vec4 vb = texelFetch(uPolyTex, ivec2(i + 1, 0), 0);
    vec2 a = vec2(va.x * uAspect, va.y);
    vec2 b = vec2(vb.x * uAspect, vb.y);
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); // IQ sdSegment clamp
    float d = length(pa - ba * h);
    float segT = mix(va.z, vb.z, h);
    // Inverse-square Shepard; the core sets diffusion breadth — a tiny core hugs the path (crisp),
    // a large core flattens the weights so colours blend across the whole field (soft wash).
    float w = 1.0 / (d * d + core);
    accT += segT * w;
    wsum += w;
    bestD = min(bestD, d);
  }
  vec3 col = sampleLut(accT / max(wsum, 1e-6));
  // Depth shading: a signed perpendicular dimension. >0 darkens with distance (in-hue vignette,
  // never a hard cut); <0 lifts the colour near the path toward white (glow). 0 = flat fill.
  float prox = smoothstep(0.6, 0.0, bestD); // 1 on the path → 0 far away
  if (uDepth > 0.0) return col * (1.0 - uDepth * (1.0 - prox));
  return mix(col, vec3(1.0), (-uDepth) * 0.5 * prox);
}
`;

const SPLINE_UNIFORM_NAMES = ['uPolyTex', 'uPolyN', 'uSpread', 'uDepth', 'uAspect'] as const;

// One polyline data-texture PER GL CONTEXT — the overlay's compositor and the editor's live
// preview are separate WebGL2 contexts, and a texture can't cross contexts. The WeakMap is
// self-cleaning (entries drop when a context is GC'd after dispose/loseContext). Re-uploaded
// only when the curve (version) changes.
const polyTexByGl = new WeakMap<WebGL2RenderingContext, { tex: WebGLTexture; version: number }>();
const bindPolyTex = (gl: WebGL2RenderingContext, unit: number): void => {
  let entry = polyTexByGl.get(gl);
  gl.activeTexture(gl.TEXTURE0 + unit);
  if (!entry) {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    entry = { tex, version: -1 };
    polyTexByGl.set(gl, entry);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, entry.tex);
  }
  if (entry.version !== state.version) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAX_POLY, 1, 0, gl.RGBA, gl.FLOAT, getTess().packed);
    entry.version = state.version;
  }
};

export const splineMode: FullscreenMode = {
  id: 'spline',
  label: 'Spline',
  kind: 'glQuad',
  // The control-point LIST can't be a flat scalar GeometryParams key, so it lives in this
  // mode's store; spread/depth ARE flat-optional keys (the FS1-forward contract). `setUniforms`
  // reads ctx.params FIRST so the future generic-slider wiring works, falling back to this mode's
  // live store today (the overlay doesn't thread arbitrary params yet — see the overlay's paint()).
  paramFields: [
    { key: 'splineSpread', label: 'Spread', min: 0, max: 1, step: 0.01, default: GEOM_DEFAULTS.splineSpread },
    { key: 'splineDepth', label: 'Depth', min: -1, max: 1, step: 0.01, default: GEOM_DEFAULTS.splineDepth },
  ],
  fragBody: SPLINE_FRAG_BODY,
  fragUniforms: SPLINE_FRAG_UNIFORMS,
  uniformNames: SPLINE_UNIFORM_NAMES,
  setUniforms: (gl, loc, ctx) => {
    bindPolyTex(gl, 3); // unit ≥3 — 0/1/2 are reserved (uSrc/uLut/uBlueNoise)
    gl.uniform1i(loc('uPolyTex'), 3);
    gl.uniform1i(loc('uPolyN'), getTess().count);
    gl.uniform1f(loc('uSpread'), ctx.params.splineSpread ?? state.spread);
    gl.uniform1f(loc('uDepth'), ctx.params.splineDepth ?? state.depth);
    gl.uniform1f(loc('uAspect'), ctx.width / Math.max(1, ctx.height));
  },
  Controls: SplineControls,
};

// ── controls + interaction layer ──────────────────────────────────────────────────────────

/** Resolve the overlay's stage element (the canvas's parent) so the interaction layer can
 *  portal into it and inherit its exact size/position with no manual rect tracking. The
 *  overlay's own canvas is the FIRST canvas under the testid root (the editor's preview canvas
 *  is portalled in AFTER, so `querySelector` still returns the overlay's). */
const useStageElement = (active: boolean): HTMLElement | null => {
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) { setStage(null); return; }
    let raf = 0;
    const find = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="fullscreen-gradient-overlay"] canvas',
      );
      const el = canvas?.parentElement ?? null;
      if (el) setStage(el);
      else raf = requestAnimationFrame(find); // canvas may mount a frame later
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return stage;
};

/** The toolbar panel (Spread/Depth sliders + reset/hint) AND the host for the on-stage editor.
 *  The editor mounts whenever the overlay is open — in fullscreen AND split — so the path is fully
 *  editable (handles + curve + drag) in the docked pane too, live-following the hero's colours. */
function SplineControls(): React.ReactElement {
  const fs = useFullscreenState();
  const spline = useSplineState();
  const stage = useStageElement(fs.open);

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400" title="How broadly each colour bleeds off the path">
        Spread
        <input
          type="range" min={0} max={1} step={0.01} value={spline.spread}
          onChange={(e) => setSpread(parseFloat(e.target.value))}
          className="w-20 accent-cyan-400" aria-label="Spline diffusion spread"
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400" title="Perpendicular depth — left glows near the path, right vignettes the edges">
        Depth
        <input
          type="range" min={-1} max={1} step={0.01} value={spline.depth}
          onChange={(e) => setDepth(parseFloat(e.target.value))}
          className="w-20 accent-cyan-400" aria-label="Spline depth shading"
        />
      </label>
      <button
        onClick={resetCurve}
        title="Reset to the default curve"
        className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        ⟳ Reset curve
      </button>
      <span className="text-[11px] text-gray-500 hidden sm:inline">
        click to add · drag to move · click the line to insert · Del removes
      </span>
      {stage && createPortal(<SplineEditor />, stage)}
    </div>
  );
}

/** Perpendicular distance (stage px) from a click to the nearest polyline SEGMENT, and which
 *  control index a "click-on-path" insert would target (the seg of the nearer endpoint). */
const nearestOnPath = (
  t: SplineTessellation, px: number, py: number, w: number, h: number,
): { dist: number; insertAt: number } => {
  let best = Infinity;
  let insertAt = 1;
  for (let i = 0; i < t.count - 1; i++) {
    const ax = t.poly[i * 2] * w, ay = t.poly[i * 2 + 1] * h;
    const bx = t.poly[(i + 1) * 2] * w, by = t.poly[(i + 1) * 2 + 1] * h;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const d = Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
    if (d < best) { best = d; insertAt = t.seg[u < 0.5 ? i : i + 1]; }
  }
  return { dist: best, insertAt };
};

/** The on-stage editor: a live preview (its own FullscreenCompositor, byte-identical to the
 *  overlay's) under DOM handle signifiers + a faint path outline, with the pointer interaction. */
function SplineEditor(): React.ReactElement {
  const fs = useFullscreenState();
  const spline = useSplineState();
  const hero = useActiveHeroSelection();
  const wrapRef = useRef<HTMLDivElement>(null);
  const glHostRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<FullscreenCompositor | null>(null);
  const dragRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Gradient colour source: the open-time snapshot in fullscreen; in split, live-follow the
  // last-selected hero (matching the overlay's split semantics). The shader samples only `uLut`,
  // so the CPU ramp isn't needed — pass an empty ramp.
  const srcConfig = fs.split ? (hero?.payload.config ?? fs.config) : fs.config;
  const lut = useMemo(
    () => (srcConfig ? renderStopsToBuffer(srcConfig.stops, srcConfig.blendSpace, srcConfig.colorSpace) : null),
    [srcConfig],
  );
  const tess = getTess(); // module-memoized on the point version; stable ref between point edits.

  // Cache the stage size so the per-frame render() never reads clientWidth/Height (a forced
  // reflow on the hot drag path); refreshed on mount + by the ResizeObserver below.
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (wrap) sizeRef.current = { w: wrap.clientWidth, h: wrap.clientHeight };
  }, []);

  // Render the live preview through a reused compositor (same dither tail + export shape as the
  // overlay's). Long-edge capped like the overlay's CONTINUOUS_MAX_DIM so the backing store stays
  // bounded on hi-DPR displays. The LUT is uploaded by the [lut] effect (it's constant during a drag).
  const render = useCallback(() => {
    const comp = compRef.current;
    if (!comp || !lut) return;
    const CAP = 2560; // mirrors the overlay's (private) CONTINUOUS_MAX_DIM
    const { w: cw, h: ch } = sizeRef.current;
    const scale = Math.min(Math.min(window.devicePixelRatio || 1, 2), CAP / Math.max(cw, ch, 1));
    const w = Math.max(1, Math.round(cw * scale));
    const h = Math.max(1, Math.round(ch * scale));
    comp.setSize(w, h);
    comp.dither = fs.dither;
    comp.presentMode(splineMode, { ramp: [], lut, params: {}, width: w, height: h });
  }, [lut, fs.dither]);

  // Stable handle to the latest `render` so the create-once effect's onReady (and the resize
  // observer) never call a stale closure after `lut`/`dither` change.
  const renderRef = useRef(render);
  renderRef.current = render;

  // One compositor for the editor's lifetime, on a FRESH canvas created imperatively per effect
  // run. This is load-bearing under React StrictMode: it double-invokes mount effects
  // (setup→cleanup→setup), and the compositor's dispose() calls WEBGL_lose_context.loseContext()
  // which PERMANENTLY bricks that canvas — so a JSX canvas (reused across the double-invoke) would
  // hand the second compositor a dead context (compile fails with an empty log). A new <canvas>
  // each run, removed on cleanup, keeps each compositor's context isolated.
  useEffect(() => {
    const host = glHostRef.current;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 w-full h-full';
    host.appendChild(canvas);
    measure();
    compRef.current = new FullscreenCompositor(canvas, () => renderRef.current());
    return () => { compRef.current?.dispose(); canvas.remove(); compRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload the LUT only when the gradient changes (not per drag-frame), then repaint. Runs after
  // the create-once effect on mount, so the compositor exists.
  useEffect(() => {
    const comp = compRef.current;
    if (comp && lut) { comp.uploadLut(lut); renderRef.current(); }
  }, [lut]);

  // Repaint on a curve / spread / depth / dither change (the gradient is handled by the [lut] effect).
  useEffect(() => { render(); }, [render, spline.version, spline.spread, spline.depth]);

  // Repaint on stage resize (window resize, split-divider drag, toolbar wrap).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { measure(); renderRef.current(); });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  // Toggling split relayouts the docked stage; the editor stays mounted, so re-measure + repaint
  // on the next frame so the canvas resizes to the new pane.
  useEffect(() => {
    const raf = requestAnimationFrame(() => { measure(); renderRef.current(); });
    return () => cancelAnimationFrame(raf);
  }, [fs.split, measure]);

  // Delete/Backspace removes the selected point (kept ≥ 2); removePoint re-selects the next one so
  // you can clear a run with repeated presses. Ignored when a form control has focus so it never
  // eats a keystroke aimed at the sliders.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (spline.selected != null) { e.preventDefault(); removePoint(spline.selected); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spline.selected]);

  const HANDLE_HIT = 30; // px — generous invisible grab radius for an existing handle
  const PATH_HIT = 16;   // px — "on the line" radius for an insert

  const toUv = (e: React.PointerEvent): { u: number; v: number; px: number; py: number; w: number; h: number } => {
    const r = (wrapRef.current as HTMLElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    return { u: px / Math.max(1, r.width), v: py / Math.max(1, r.height), px, py, w: r.width, h: r.height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { u, v, px, py, w, h } = toUv(e);
    // 1) Grab the nearest existing handle if the click is on it.
    let hitIdx = -1; let hitD = HANDLE_HIT;
    spline.points.forEach((p, i) => {
      const d = Math.hypot(p.x * w - px, p.y * h - py);
      if (d <= hitD) { hitD = d; hitIdx = i; }
    });
    if (hitIdx >= 0) {
      dragRef.current = hitIdx;
      selectPoint(hitIdx);
    } else {
      const near = nearestOnPath(tess, px, py, w, h);
      if (near.dist <= PATH_HIT) {
        // 2) Click ON the path → insert a control point at that stretch.
        dragRef.current = insertPoint(near.insertAt, u, v);
      } else {
        // 3) Empty space → extend the path from the NEARER end (prepend/append), so the new
        //    point joins the curve without a long backtracking jump across the canvas.
        const pts = spline.points;
        const dStart = Math.hypot(pts[0].x * w - px, pts[0].y * h - py);
        const dEnd = Math.hypot(pts[pts.length - 1].x * w - px, pts[pts.length - 1].y * h - py);
        dragRef.current = insertPoint(dStart < dEnd ? 0 : pts.length, u, v);
      }
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current == null) return;
    const { u, v } = toUv(e);
    movePoint(dragRef.current, u, v);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // SVG centerline points (faint path signifier), in normalized [0,1] space.
  const linePoints = useMemo(() => {
    let s = '';
    for (let i = 0; i < tess.count; i++) s += `${tess.poly[i * 2]},${tess.poly[i * 2 + 1]} `;
    return s.trim();
  }, [tess]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 touch-none cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* The live-preview WebGL canvas mounts here imperatively (see the compositor effect) —
          a React-child-free host so React never reconciles around the imperatively-managed node. */}
      <div ref={glHostRef} className="absolute inset-0 pointer-events-none" />
      {/* Editing chrome — faint path outline + draggable handles (the selected one highlighted). */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1 1" preserveAspectRatio="none"
      >
        <polyline
          points={linePoints} fill="none" stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      {spline.points.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full border-2 shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
            spline.selected === i
              ? 'w-[18px] h-[18px] border-cyan-300 bg-cyan-400/40'
              : 'w-[14px] h-[14px] border-white/90 bg-black/40'
          }`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        />
      ))}
    </div>
  );
}
