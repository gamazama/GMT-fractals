/**
 * reduceStops — "Reduce stops…": the SAME gradient described with fewer stops, at a few named
 * amounts (owner, 2026-09-23: "Reduce stops should be in the hero gradient's burger menu and
 * just needs some options for how much to reduce"; a POPUP, not a filter or a face — 2026-09-12).
 * Background: plans/ge-ramp-analysis-and-deep-fit.md §B3–B5.
 *
 * WHAT A STEP PROMISES. Each named step is a TOLERANCE: the reduced gradient, rendered to 256
 * texels, stays within that OkLab ΔE of the input's own render at EVERY texel (display sRGB, the
 * input's blend space on both sides). The tolerance is the contract, the stop count is whatever
 * meeting it costs — which is why the popup shows the count ("12 → 7 stops") and never the
 * tolerance (no claims in the UI; the names are names).
 *
 * HOW. Two candidates per step, and the one with fewer stops wins (a tie goes to the lower error):
 *   1. ELIMINATION — delete stops from the current list while the ΔE stays in tolerance
 *      (plan §B3, "backward elimination"). Each deletion merges two segments into one, and the
 *      merged segment's left stop may take a new bias and linear / smooth interpolation (the
 *      same trial grid `stopFit` refines with), so a stop that only existed to bend a curve can
 *      go. Only the merged span changes, so a candidate costs its own texels, not a full render.
 *   2. REFIT — `fitRampToStops` over the input's render, IN THE INPUT'S BLEND SPACE (its
 *      `blendSpace` option exists for this), then elimination over that. The fitter's corner
 *      seeding and bias trials find descriptions elimination cannot reach, because elimination
 *      never moves a stop. The fitter does not promise its tolerance at every texel (see
 *      `rampToGradientConfig`'s FAITHFUL note), so a refit is MEASURED and retried tighter;
 *      one that still misses is not a candidate.
 * The steps run loosest-last, and each starts from the previous step's answer as one more
 * candidate — a looser tolerance can therefore never cost more stops than a tighter one.
 *
 * WHAT IT KEEPS. `colorSpace` (what the texture bakes), `blendSpace` (the gradient's identity —
 * see stopFit's header), and — for elimination — every surviving stop's own id, position and
 * colour. It never returns more stops than it was given; a step that cannot remove one returns
 * the input's stops with `reduced: false`.
 *
 * WHAT IT REFUSES. A RAMP gradient (ADR-0122, `stops: []` + `ramp`) has no stops to reduce, and
 * a gradient of two stops has none to spare: both return null.
 *
 * @invariant Every step's result stays within its tolerance of the input's render at all 256
 *   texels, never has more stops than the input or than the step before it, keeps the input's
 *   colorSpace and blendSpace, and a ramp or 2-stop gradient is refused — proven by:
 *   `npx tsx debug/test-palette-reducestops.mts` (to be wired as `npm run test:palette-reducestops`)
 *   ("within tolerance", "never more stops", "monotonic", "keeps colorSpace and blendSpace",
 *   "ramp refused"). Falsified 2026-09-23 eleven ways, see the harness header.
 * @see components/gradient/gradientStopReducer.ts (the seam the editor reads this through)
 */

import type { GradientConfig, GradientStop, BlendColorSpace } from '../../types';
import { renderStopsToRamp, sampleSortedStops } from './gmtGradient';
import { oklabDistance, type RGB } from './oklab';
import { fitRampToStops } from './stopFit';
import { isRampGradient } from '../../utils/gradientRamp';

export type ReduceStepId = 'light' | 'medium' | 'strong' | 'max';

export interface ReduceStep {
  id: ReduceStepId;
  /** The popup's label. A NAME only (feedback: no claims in option labels). */
  name: string;
  /** Max OkLab ΔE between the input's render and the result's, at any of the 256 texels. */
  tolerance: number;
}

/**
 * The named steps, tightest first. Calibrated 2026-09-23 on catalogue picks as GX receives them
 * (the seam's fit at ΔE 0.02) and on baked fits (Detail 8) — `npx tsx
 * debug/test-palette-reducestops.mts --calibrate [pack] [tolerances…]` prints the table, and the
 * harness's CALIBRATION note keeps the sweep. Chosen so each step keeps roughly two thirds to three
 * quarters of what the step before kept on every corpus — no two neighbours the same gradient.
 * Light ≈ one just-noticeable step at the WORST texel, so it changes nothing you can see.
 */
export const REDUCE_STEPS: readonly ReduceStep[] = [
  { id: 'light', name: 'Light', tolerance: 0.02 },
  { id: 'medium', name: 'Medium', tolerance: 0.04 },
  { id: 'strong', name: 'Strong', tolerance: 0.08 },
  { id: 'max', name: 'Maximum', tolerance: 0.15 },
];

export interface ReduceOutcome {
  step: ReduceStep;
  /** The reduced gradient: the input's colorSpace and blendSpace, fewer stops (or the same). */
  config: GradientConfig;
  /** Its stop count. */
  stops: number;
  /** Measured worst ΔE against the input's render. */
  maxDE: number;
  /** It has fewer stops than the input. */
  reduced: boolean;
}

/** The display render every comparison is made on. */
const renderOf = (stops: GradientStop[], space: BlendColorSpace): RGB[] => renderStopsToRamp(stops, space, 'srgb');

/** Worst ΔE of `stops` against `target`. NaN counts as a miss, never as a pass. */
export const maxRenderedDE = (stops: GradientStop[], space: BlendColorSpace, target: RGB[]): number => {
  const r = renderOf(stops, space);
  let max = 0;
  for (let i = 0; i < 256; i++) {
    const d = oklabDistance(r[i], target[i]);
    if (!(d <= max)) max = Number.isNaN(d) ? Infinity : d;
  }
  return max;
};

type Interp = NonNullable<GradientStop['interpolation']>;
const BIAS_GRID = [0.2, 0.35, 0.5, 0.65, 0.8];
const biasFine = (b: number): number[] => [b - 0.1, b - 0.05, b + 0.05, b + 0.1].filter((x) => x > 0.05 && x < 0.95);

/**
 * Greedy backward elimination. `st` must already be within `tol` of `target` everywhere (the
 * input is, trivially; a previous step's answer is, by its own tolerance; a refit is measured
 * before it gets here). Each round removes the interior stop whose merged segment ends with the
 * smallest worst ΔE, if that is within `tol` — so the whole list stays within `tol` by induction,
 * since a deletion changes only the texels between its two neighbours.
 */
const eliminate = (start: GradientStop[], space: BlendColorSpace, target: RGB[], tol: number): GradientStop[] => {
  let st = [...start].sort((a, b) => a.position - b.position);
  /** The best way to merge away stop `k`: its left neighbour's bias / interpolation, and the
   *  merged span's worst ΔE. Sampled through a WINDOW of the list — the merged pair plus one
   *  stop either side — which the renderer's own segment rules (the first segment whose range
   *  holds `pos` wins; a step is held through its right boundary) read exactly as they read the
   *  whole list for every texel from ⌊L⌋ to ⌈R⌉: a texel ON a boundary lands in the same
   *  neighbouring segment either way, and one outside the list clamps to the same end colour. */
  const mergeCost = (k: number): { err: number; bias: number; interp: Interp } => {
    const L = st[k - 1];
    const R = st[k + 1];
    const from = Math.max(0, Math.floor(L.position * 255));
    const to = Math.min(255, Math.ceil(R.position * 255));
    const lo = Math.max(0, k - 2);
    const list = [...st.slice(lo, k), ...st.slice(k + 1, k + 3)];
    const li = k - 1 - lo; // L's index in the window
    const trial = (bias: number, interp: Interp): number => {
      list[li] = { ...L, bias, interpolation: interp };
      let max = 0;
      for (let i = from; i <= to; i++) {
        const d = oklabDistance(sampleSortedStops(list, i / 255, space, 'srgb'), target[i]);
        if (!(d <= max)) max = Number.isNaN(d) ? Infinity : d;
        if (max > tol) return max; // already out: no need to finish the span
      }
      return max;
    };
    const own = { bias: L.bias ?? 0.5, interp: (L.interpolation ?? 'linear') as Interp };
    let best = { err: trial(own.bias, own.interp), ...own };
    const consider = (bias: number, interp: Interp) => {
      const e = trial(bias, interp);
      if (e < best.err - 1e-9) best = { err: e, bias, interp };
    };
    for (const interp of ['linear', 'smooth'] as const) for (const b of BIAS_GRID) consider(b, interp);
    if (best.interp !== 'step') for (const b of biasFine(best.bias)) consider(b, best.interp);
    return best;
  };
  const costs: ({ err: number; bias: number; interp: Interp } | null)[] = st.map((_, k) => (k > 0 && k < st.length - 1 ? mergeCost(k) : null));
  for (;;) {
    let bestK = -1;
    for (let k = 1; k < st.length - 1; k++) {
      const c = costs[k];
      if (c && c.err <= tol && (bestK < 0 || c.err < costs[bestK]!.err)) bestK = k;
    }
    if (bestK < 0) break;
    const c = costs[bestK]!;
    st = st.filter((_, i) => i !== bestK);
    st[bestK - 1] = { ...st[bestK - 1], bias: c.bias, interpolation: c.interp };
    costs.splice(bestK, 1);
    // only the two new neighbours' merges changed
    for (const k of [bestK - 1, bestK]) costs[k] = k > 0 && k < st.length - 1 ? mergeCost(k) : null;
  }
  return st;
};

/** A refit of the target in `space`, measured; tightened until it meets `tol` or gives up. */
const refit = (target: RGB[], space: BlendColorSpace, tol: number, cap: number): GradientStop[] | null => {
  for (const k of [0.7, 0.4]) {
    const fit = fitRampToStops(target, { targetDE: tol * k, maxStops: cap, fitBias: true, blendSpace: space });
    if (fit.stops.length > cap) return null;
    if (maxRenderedDE(fit.stops, space, target) <= tol) return fit.stops;
  }
  return null;
};

const fewer = (a: { stops: GradientStop[]; err: number }, b: { stops: GradientStop[]; err: number }) =>
  a.stops.length < b.stops.length || (a.stops.length === b.stops.length && a.err < b.err) ? a : b;

/**
 * The ladder, LAZILY: one step's result per `next()`, tightest first. A gradient of a hundred
 * stops costs a few hundred ms over the four steps (measured 2026-09-23: Softology's 8RAIN,
 * 128 stops, ~200 ms; the refits dominate), so the editor pulls one step per macrotask and the
 * popup fills in rather than freezing a frame for the lot. Null for a ramp gradient or one with
 * fewer than three stops (nothing to reduce).
 */
export const reduceStopsSteps = (config: GradientConfig, steps: readonly ReduceStep[] = REDUCE_STEPS): Generator<ReduceOutcome, void, void> | null => {
  if (isRampGradient(config)) return null;
  const input = Array.isArray(config.stops) ? [...config.stops].sort((a, b) => a.position - b.position) : [];
  if (input.length < 3) return null;
  return ladder(config, input, steps);
};

function* ladder(config: GradientConfig, input: GradientStop[], steps: readonly ReduceStep[]): Generator<ReduceOutcome, void, void> {
  const space: BlendColorSpace = config.blendSpace || 'oklab';
  const target = renderOf(input, space);
  const n = input.length;
  let prev = { stops: input, err: 0 };
  // a config carrying both forms renders its stops; the result must not drag a stale ramp along
  const { ramp: _staleRamp, ...body } = config;
  for (const step of steps) {
    // Every candidate is MEASURED over the whole render before it can win: elimination's own
    // bookkeeping is local, and a measured miss (which it should never produce) is dropped
    // rather than trusted.
    const accept = (stops: GradientStop[]): { stops: GradientStop[]; err: number } | null => {
      const err = maxRenderedDE(stops, space, target);
      return err <= step.tolerance ? { stops, err } : null;
    };
    let best = prev;
    const el = accept(eliminate(prev.stops, space, target, step.tolerance));
    if (el) best = fewer(el, best);
    // A refit can only help if it could come in under what we have; budget it one below.
    const re = best.stops.length > 2 ? refit(target, space, step.tolerance, best.stops.length - 1) : null;
    if (re) {
      const reEl = accept(eliminate(re, space, target, step.tolerance));
      if (reEl) best = fewer(reEl, best);
    }
    prev = best;
    yield {
      step,
      config: { ...body, stops: best.stops, colorSpace: config.colorSpace, blendSpace: space },
      stops: best.stops.length,
      maxDE: best.err,
      reduced: best.stops.length < n,
    };
  }
}

/** Every named step's result for `config` at once (the harness; the editor pulls lazily). */
export const reduceStopsLadder = (config: GradientConfig, steps: readonly ReduceStep[] = REDUCE_STEPS): ReduceOutcome[] | null => {
  const it = reduceStopsSteps(config, steps);
  return it ? [...it] : null;
};
