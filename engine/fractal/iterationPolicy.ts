/**
 * iterationPolicy — the single source of truth for "how many iterations" the
 * fractal kernel runs, shared by the Gradient Explorer's FractalColorRenderer
 * and fluid-toy's FluidEngine so the two renderers can't drift apart.
 *
 * (fluid-toy previously hard-capped at a fixed maxIter and never auto-scaled —
 * this module is what brings it up to the explorer's auto-iteration behaviour.)
 *
 * Two regimes:
 *   • shallow (f32 kernel): iterations auto-scale with zoom depth so a deeper
 *     view stays crisp instead of going blobby.
 *   • deep (perturbation): the reference orbit is BUILT to a zoom-scaled length,
 *     and the per-pixel GPU cap is the orbit length (non-periodic reference) or
 *     the full zoom-depth budget (periodic nucleus — the orbit wraps so it's
 *     valid for unlimited iters; capping at the short period would cut every
 *     later-escaping pixel to interior — the "iteration cliff"). @see docs/adr/0066
 *
 * Verbatim port of the constants + formulas that lived inline in
 * FractalColorRenderer (DEFAULTS.zoom / MANDEL_*_ZOOM / deepRefIter /
 * effectiveMaxIter) — both consumers import them so they stay identical.
 */

/** View zoom that maps to the minimum (base) shallow iteration count (the home view). */
export const ITER_REF_ZOOM = 1.4;
/** f32 shallow zoom floor used in the depth log. */
export const ITER_MIN_ZOOM = 1e-4;
/** Perturbation zoom floor used in the deep depth log. */
export const ITER_DEEP_MIN_ZOOM = 1e-100;
/** Hard ceiling on the high-precision reference-orbit build length. */
export const MAX_DEEP_ITER = 200_000;

/** Shallow (f32) per-pixel cap: 200 at the home view, +220 per zoom decade,
 *  capped at 2000, then × an optional iteration multiplier. */
export const autoShallowIter = (zoom: number, mul = 1): number => {
  const depth = Math.log10(ITER_REF_ZOOM / Math.max(zoom, ITER_MIN_ZOOM));
  const base = Math.max(200, Math.min(2000, 200 + 220 * Math.max(0, depth)));
  return Math.round(base * Math.max(0.25, mul));
};

/** Reference-orbit BUILD length for a deep view (2000..20000 by zoom depth). */
export const deepRefIter = (zoom: number): number => {
  const depth = Math.log10(ITER_REF_ZOOM / Math.max(zoom, ITER_DEEP_MIN_ZOOM));
  return Math.round(Math.min(20_000, Math.max(2_000, 1_500 + 900 * Math.max(0, depth))));
};

/** Deep build target = reference length × iter multiplier, capped at MAX_DEEP_ITER. */
export const deepBuildIter = (zoom: number, mul = 1): number =>
  Math.round(Math.min(MAX_DEEP_ITER, deepRefIter(zoom) * Math.max(0.25, mul)));

/** Per-pixel GPU cap for the deep path: full zoom-depth budget for a periodic
 *  (nucleus) reference, else the actual orbit length (floored at 200). */
export const deepGpuCap = (zoom: number, orbitLen: number, period: number, mul = 1): number =>
  period > 0 ? deepBuildIter(zoom, mul) : Math.max(200, orbitLen);
