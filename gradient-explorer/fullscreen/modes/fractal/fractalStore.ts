/**
 * fractalStore — the Fractal mode's transient UI state: the live, animatable colormap-mapping
 * knobs the user drives while the fractal renders (phase / repeats / mapping / animate / deepZoom /
 * iterMul). The gradient itself stays FROZEN (the open-time 256-ramp snapshot colours the fractal);
 * these are the cheap ramp-mapping modifiers on top of it. View centre/zoom live in the renderer
 * (gesture-driven, no React render needed), not here.
 *
 * Like `liquifyStore`, it's a module-level `useSyncExternalStore` holder — shell-scoped,
 * session-only, never persisted. Mode-local (lifted out of `fullscreenStore`, which now holds only
 * cross-mode UI state) so Fractal is a fully self-contained `ownCanvas` module: its `Controls` panel
 * reads/writes ONLY this store, and the mode's `mount()` subscribes to it to push the live knobs to
 * the renderer.
 *
 * @see modes/fractalMode.tsx (the mode that consumes it)
 * @see engine/fractal/FractalColorRenderer.ts (the renderer the knobs drive)
 */

import { useSyncExternalStore } from 'react';

export interface FractalState {
  /** Colormap phase offset along the mapped axis, 0..1 wraps (kernel uGradientPhase). */
  phase: number;
  /** Colormap tiling count across the mapped axis (kernel uGradientRepeat). */
  repeats: number;
  /** What fractal quantity drives the colormap lookup (kernel uColorMapping, 0..13). */
  mapping: number;
  /** Auto-cycle the phase each frame (palette-cycling "see it animate"). */
  animate: boolean;
  /** Deep-zoom (perturbation + LA + AT) path — lets zoom dive far past the f32 quantization
   *  floor. Always on (strictly better than the f32 path; the UI toggle was removed). @see ADR-0066 */
  deepZoom: boolean;
  /** Per-pixel iteration multiplier (1 = auto). Raise to resolve deeper detail. */
  iterMul: number;
  /** Depth-normalized colour fields (v2). When on, every mapping mode is divided by its
   *  depth driver so Density (repeats) ≈ 1 stays sane at any zoom. Off = the original
   *  per-mode look, byte-identical. A/B flag — ships off pending the visual pass. */
  colorNormV2: boolean;
  /** Iterations mode (v2): gamma on the log-iteration field — biases low-iteration
   *  filaments vs deep interiors. 1 = neutral. */
  iterRate: number;
  /** Iterations mode (v2) "Fit to view" anchor: log-iteration window [offset, offset+1/scale]
   *  mapped onto the gradient. offset 0 / scale 1 = identity (a point's colour holds across
   *  zoom). Set by the Fit-to-view action; never a slider. */
  iterOffset: number;
  iterScale: number;
  /** Distance mode (10): false = linear edge/glow, true = log contour rings. */
  deLogBands: boolean;
  /** Slope-lighting composite layer (multiplies any mode's colour by an escape-gradient shade). */
  lightEnabled: boolean;
  lightAngle: number;     // azimuth, radians
  lightHeight: number;    // elevation factor
  lightStrength: number;  // 0 flat .. 1 lit
  ambient: number;        // shadow floor
  /** Escape radius (bailout). Global iteration param — shapes the equipotential band
   *  character for Potential/Magnitude/Distance (small = decomposition cells, large = smooth
   *  shells). Changing it re-renders + resets accumulation. */
  escapeR: number;
}

/** Identity anchor scale = 1/LREF (LREF=8 ≈ log(1+3000)). Pivots the Rate gamma at Lv=1 so
 *  Rate reshapes the curve without scaling its magnitude → Density stays usable (~1). */
const ITER_IDENTITY_SCALE = 0.125;

const INITIAL: FractalState = {
  phase: 0,
  repeats: 1,
  mapping: 0,
  animate: false,
  deepZoom: true,
  iterMul: 1,
  colorNormV2: false,
  iterRate: 1,
  iterOffset: 0,
  iterScale: ITER_IDENTITY_SCALE,
  deLogBands: true,   // Rings: the prettier DE look (even log-distance contours); Glow is the toggle.
  lightEnabled: false,
  lightAngle: Math.PI / 4,
  lightHeight: 1.5,
  lightStrength: 0.7,
  ambient: 0.2,
  escapeR: 32,
};

let state: FractalState = INITIAL;
const listeners = new Set<() => void>();
const emit = (next: Partial<FractalState>): void => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = (): FractalState => state;

export const getFractalState = (): FractalState => state;
export const subscribeFractal = (l: () => void): (() => void) => subscribe(l);
export const useFractalState = (): FractalState => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Set the live fractal colormap phase (0..1 wraps). */
export const setFractalPhase = (phase: number): void => {
  const p = ((phase % 1) + 1) % 1; // wrap into [0,1)
  if (p !== state.phase) emit({ phase: p });
};

/** Sensible starting "Repeats" per colour-mapping mode for the LEGACY (v1) colour path —
 *  those modes compress/stretch the un-normalized t-range very differently, so a value good
 *  for one is wrong for another. Switching mode re-seeds this so you start near a usable
 *  tiling. Under depth-normalized colour (v2) every mode wants ≈1, so the re-seed collapses
 *  to a universal 1.0 and this table is bypassed (sign-off D4). */
const DEFAULT_REPEATS_BY_MODE: Record<number, number> = {
  0: 1,    // Iterations
  4: 4,    // Bands
  1: 1,    // Angle
  2: 1,    // Magnitude
  12: 1,   // Potential
  9: 4,    // Stripe
  10: 1,   // Distance
};

/** Set the live fractal colormap tiling (clamped 0.0001..1024, fractional). The useful value varies
 *  widely by mapping mode — some compress the t-range (want large repeats to tile), others stretch
 *  it across the whole screen (want repeats << 1). The slider's soft track is 0.1..16; typing breaks
 *  past it. */
export const setFractalRepeats = (repeats: number): void => {
  if (!Number.isFinite(repeats)) return;
  const r = repeats < 0.0001 ? 0.0001 : repeats > 1024 ? 1024 : repeats;
  if (r !== state.repeats) emit({ repeats: r });
};

/** Set the live fractal colormap mapping mode (kernel colorMapping index). Re-seeds Density to a
 *  sane default for the new mode: a universal 1.0 under depth-normalized colour (v2), else the
 *  legacy per-mode table. */
export const setFractalMapping = (mapping: number): void => {
  const m = mapping | 0;
  if (m === state.mapping) return;
  const seed = state.colorNormV2 ? 1 : (DEFAULT_REPEATS_BY_MODE[m] ?? 1);
  emit({ mapping: m, repeats: seed });
};

/** Toggle depth-normalized colour (v2). Re-seeds Density to 1 when turning it on (every
 *  normalized mode wants ≈1) so the user lands on a sane value instead of the legacy seed. */
export const setFractalColorNormV2 = (on: boolean): void => {
  if (on === state.colorNormV2) return;
  emit({ colorNormV2: on, repeats: on ? 1 : state.repeats });
};

/** Set the Iterations-mode log-iteration gamma. Slider track is 0.25..8 but typed/dragged
 *  values are free within a loose guard (0.01..64 — just keeps the pow well-defined and
 *  positive). Pivoted at Lv=1 so it reshapes contrast without forcing Density to compensate. */
export const setFractalIterRate = (rate: number): void => {
  if (!Number.isFinite(rate)) return;
  const r = rate < 0.001 ? 0.001 : rate > 64 ? 64 : rate;
  if (r !== state.iterRate) emit({ iterRate: r });
};

/** Apply a "Fit to view" anchor (offset/scale) computed from the current view's iteration
 *  range. After this colours HOLD again (the anchor is fixed) until re-fit or reset. */
export const setFractalIterFit = (offset: number, scale: number): void => {
  if (!Number.isFinite(offset) || !Number.isFinite(scale)) return;
  if (offset !== state.iterOffset || scale !== state.iterScale) emit({ iterOffset: offset, iterScale: scale });
};

/** Reset the Iterations anchor to identity (absolute pivoted log-iteration — colours hold). */
export const resetFractalIterFit = (): void => {
  if (state.iterOffset !== 0 || state.iterScale !== ITER_IDENTITY_SCALE) {
    emit({ iterOffset: 0, iterScale: ITER_IDENTITY_SCALE });
  }
};

/** Toggle Distance mode's log-contour-rings (vs linear edge/glow). */
export const setFractalDeLogBands = (on: boolean): void => { if (on !== state.deLogBands) emit({ deLogBands: on }); };

/** Toggle the slope-lighting composite layer. */
export const setFractalLightEnabled = (on: boolean): void => { if (on !== state.lightEnabled) emit({ lightEnabled: on }); };
/** Light azimuth in radians (wraps 0..2π). */
export const setFractalLightAngle = (a: number): void => { if (Number.isFinite(a) && a !== state.lightAngle) emit({ lightAngle: a }); };
/** Light elevation factor (clamped 0.1..6). */
export const setFractalLightHeight = (h: number): void => {
  if (!Number.isFinite(h)) return;
  const v = h < 0.1 ? 0.1 : h > 6 ? 6 : h;
  if (v !== state.lightHeight) emit({ lightHeight: v });
};
/** Lighting strength, 0 flat .. 1 fully lit (clamped). */
export const setFractalLightStrength = (s: number): void => {
  if (!Number.isFinite(s)) return;
  const v = s < 0 ? 0 : s > 1 ? 1 : s;
  if (v !== state.lightStrength) emit({ lightStrength: v });
};
/** Ambient shadow floor, 0..1 (clamped). */
export const setFractalAmbient = (a: number): void => {
  if (!Number.isFinite(a)) return;
  const v = a < 0 ? 0 : a > 1 ? 1 : a;
  if (v !== state.ambient) emit({ ambient: v });
};

/** Set the escape radius / bailout (clamped 0.1..65536; <2 gives decomposition cells). Global —
 *  re-renders + resets accumulation. */
export const setFractalEscapeR = (r: number): void => {
  if (!Number.isFinite(r)) return;
  const v = r < 1 ? 1 : r > 65536 ? 65536 : r;
  if (v !== state.escapeR) emit({ escapeR: v });
};

/** Toggle phase auto-cycling (palette-cycling animation). */
export const setFractalAnimate = (on: boolean): void => { if (on !== state.animate) emit({ animate: on }); };

/** Toggle the deep-zoom (perturbation) path. */
export const setFractalDeepZoom = (on: boolean): void => { if (on !== state.deepZoom) emit({ deepZoom: on }); };

/** Set the per-pixel iteration multiplier (clamped 0.25..32). */
export const setFractalIterMul = (mul: number): void => {
  if (!Number.isFinite(mul)) return;
  const m = mul < 0.25 ? 0.25 : mul > 32 ? 32 : mul;
  if (m !== state.iterMul) emit({ iterMul: m });
};
