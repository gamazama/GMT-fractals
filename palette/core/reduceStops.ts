/**
 * reduceStops — "Reduce stops…": the SAME gradient described with fewer stops (owner,
 * 2026-09-23: "Reduce stops should be in the hero gradient's burger menu"; a POPUP, not a filter
 * or a face — 2026-09-12). Background: plans/ge-ramp-analysis-and-deep-fit.md §B3–B5 and its
 * 2026-09-24 update.
 *
 * WHAT IT ANSWERS (ADR-0128, 2026-09-24: "more granular" + "model against different blending
 * modes to find the most suitable one"). A PLAN: the best version of the gradient at EVERY stop
 * count from one fewer than it has down to two (`byCount`), and where each named amount lands on
 * that axis (`steps`). The popup is a stop-count slider over `byCount`; the names are quick picks.
 * Measured over 346 catalogue picks and bakes: the four names alone gave 3.0 different answers
 * per gradient, the axis gives ~13.
 *
 * WHAT A NAMED AMOUNT PROMISES. Each is a TOLERANCE: the fewest stops whose render (256 texels,
 * display sRGB) stays within that OkLab ΔE of the input's own render at EVERY texel. The tolerance
 * is the contract, the count is whatever meeting it costs — which is why the popup shows the count
 * ("12 → 7 stops") and never the tolerance (no claims in the UI; the names are names). A slider
 * position promises only its count: the best version found with exactly that many stops.
 *
 * HOW. Every version is MEASURED against the input's render before it is kept, per blend space:
 *   1. THE PATH — greedy backward elimination with no tolerance (plan §B3): delete the stop whose
 *      merged segment ends with the smallest worst ΔE, over and over, down to two. Each deletion
 *      merges two segments and the merged one's left stop may take a new bias and linear / smooth
 *      interpolation, so a stop that only existed to bend a curve can go. One pass visits every
 *      count, and it matched the old four-step ladder (refits included) at its tolerances to
 *      within 0.03 stops on average, in 9–79 ms.
 *   2. REFITS — `fitRampToStops` over the input's render at a few tolerances (REFIT_TOLS), each
 *      followed by its own path. The fitter's corner seeding and bias trials find descriptions
 *      elimination cannot reach, because elimination never moves a stop — and it is the ONLY way
 *      into another blend space, where the input's own stops describe something else.
 *   3. THE GROW PASS — each count also tries the count below it plus one stop at its worst texel
 *      (`insertOne`, quick), both new segments re-tuned, and keeps whichever is closer.
 *   4. THE AXIS REPAIR (in `snapshot`) — a path is not monotone: 8.6% of counts came out WORSE than
 *      the count below them (a merge can re-tune the segment that was worst; median ΔE 0.026, p90
 *      0.11), and switching between the own space and another adds its own steps. Wherever a count
 *      is further off than the one below, the one below plus one THOROUGH insert takes its place —
 *      a stop on its own rendered curve is always among the tries, so one more stop never looks
 *      worse than one fewer (worst rise over the guard's corpus 2026-09-24: 0.0000).
 *
 * THE BLEND SPACE (`searchBlend`, the popup's "Try other blend modes", on by default). Off, every
 * version is in the input's own space and its `blendSpace` never changes. On, the other spaces run
 * the refits too, and ONE other space is chosen per gradient — the one that most lowers the error
 * along the axis — and used at each count where it is clearly better (under OTHER_RATIO of the own
 * space's error). One space, not the best per count: the best per count switched mode ~5 times
 * along a gradient's axis (measured 2026-09-24); one space kept 9.8 of the 11.3% of stops the free
 * choice saved. A result in another space carries THAT `blendSpace`, and applying it changes the
 * gradient's blend mode — every exporter reads the baked 256-texel ramp, so nothing downstream
 * sees it; later edits blend in the new mode. Measured saving at the four amounts: 15 / 10 / 8 / 5%
 * of stops (29% at Light on core picks — the catalogue's sources were authored in RGB and GX
 * re-describes them in OkLCh when picked, which is also why RGB is the usual winner).
 * REDUCE_SEARCH_SPACES orders the search by measured value per millisecond: RGB carried 86% of the
 * saving at the lowest cost; Spectral the last 4% at twice the time (the host drops it on phones).
 *
 * TIME. The generator yields after about `sliceMs` of work (null: nothing new) and a fresh plan
 * after each stage, so the editor pulls it one macrotask at a time: the first plan (the own path)
 * arrives in tens of ms, the search fills in behind it. One `fitRampToStops` call is the
 * indivisible unit.
 *
 * WHAT IT KEEPS. `colorSpace` (what the texture bakes); for a version from elimination, every
 * surviving stop's own id, position and colour. It never returns a version with as many stops as
 * the input. No stale `ramp` rides along.
 *
 * WHAT IT REFUSES. A RAMP gradient (ADR-0122, `stops: []` + `ramp`) has no stops to reduce, and a
 * gradient of two stops has none to spare: both return null.
 *
 * @invariant A plan has a version at every count from n−1 to 2 with exactly that many stops, each
 *   keeping the input's colorSpace and reporting its measured worst ΔE; every named amount's count
 *   is within that amount's tolerance of the input's render at all 256 texels (or is the input's
 *   own count) and never rises from one amount to the next; no count is further off than the one
 *   below it; a version is in the input's blendSpace unless the search is on, and then in it or the
 *   plan's one `other`; the search never costs a named amount a stop; a ramp or 2-stop gradient is
 *   refused — proven by: `npm run test:palette-reducestops` ("exact count", "every reported maxDE
 *   is the measured one", "within tolerance", "monotonic", "more stops never look worse", "keeps
 *   colorSpace", "own space when the search is off", "the search never costs a stop", "ramp
 *   refused"). Falsified 2026-09-24 twelve ways, see the harness header.
 * @see components/gradient/gradientStopReducer.ts (the seam the editor reads this through)
 * @see docs/adr/0128-reduce-stops-is-a-stop-count-axis.md
 */

import type { GradientConfig, GradientStop, BlendColorSpace } from '../../types';
import { renderStopsToRamp, sampleSortedStops, rgbToHex } from './gmtGradient';
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
 * The named amounts, tightest first. Calibrated 2026-09-23 on catalogue picks as GX receives them
 * (the seam's fit at ΔE 0.02) and on baked fits (Detail 8) — `npx tsx
 * debug/test-palette-reducestops.mts --calibrate [pack] [tolerances…]` prints the table, and the
 * harness's CALIBRATION note keeps the sweep. Each keeps roughly two thirds to three quarters of
 * what the one before kept on every corpus. Light ≈ one just-noticeable step at the WORST texel.
 */
export const REDUCE_STEPS: readonly ReduceStep[] = [
  { id: 'light', name: 'Light', tolerance: 0.02 },
  { id: 'medium', name: 'Medium', tolerance: 0.04 },
  { id: 'strong', name: 'Strong', tolerance: 0.08 },
  { id: 'max', name: 'Maximum', tolerance: 0.15 },
];

/**
 * The blend spaces a search tries, in order: measured value per millisecond first (2026-09-24,
 * 346 gradients: RGB alone carried 86% of the saving at ~35 ms median; Oklab, OkLCh, CIE LCh and
 * HSV bring it to 96%; Spectral the last 4% at about twice the time of all the others together).
 * The input's own space is always tried first, whatever this says.
 */
export const REDUCE_SEARCH_SPACES: readonly BlendColorSpace[] = ['rgb', 'oklab-rect', 'oklab', 'cielch', 'hsv', 'spectral'];

/** The tolerances each refit is asked for (then pathed down). Three covered the dense
 *  eleven-tolerance ladder's answers exactly (−11.0% vs −10.8% of stops, 2026-09-24). */
const REFIT_TOLS = [0.012, 0.03, 0.07];
/** Another space is used at a count only where its error is under this share of the own space's. */
const OTHER_RATIO = 0.8;

export interface ReduceVersion {
  /** The gradient: the input's colorSpace, `blendSpace` = the space it was fitted in. */
  config: GradientConfig;
  /** Its stop count. */
  stops: number;
  /** Measured worst ΔE against the input's render. */
  maxDE: number;
}

export interface ReducePlan {
  /** The input's stop count. */
  from: number;
  /** `byCount[k]`: the best version with exactly k stops found so far (2 ≤ k < from). */
  byCount: readonly (ReduceVersion | undefined)[];
  /** Where each named amount lands: the fewest stops within its tolerance, `from` when no count
   *  meets it. Never rises from one amount to the next. */
  steps: readonly { step: ReduceStep; stops: number }[];
  /** The other blend space the plan uses somewhere on the axis, if any. */
  other: BlendColorSpace | null;
  /** More work to come (the refits, the search). */
  pending: boolean;
}

export interface ReduceOptions {
  /** Try the other blend spaces too. Default false here; the popup's toggle defaults it on. */
  searchBlend?: boolean;
  /** The spaces a search may try (default REDUCE_SEARCH_SPACES; a phone host drops Spectral). */
  spaces?: readonly BlendColorSpace[];
  /** About how long one `next()` may work before yielding, in ms (default 12). */
  sliceMs?: number;
  /** The named amounts (default REDUCE_STEPS). */
  steps?: readonly ReduceStep[];
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
type Tune = { err: number; bias: number; interp: Interp };
const BIAS_GRID = [0.2, 0.35, 0.5, 0.65, 0.8];
const biasFine = (b: number): number[] => [b - 0.1, b - 0.05, b + 0.05, b + 0.1].filter((x) => x > 0.05 && x < 0.95);

/**
 * The best bias / interpolation for the segment that starts at `list[li]`, judged on texels
 * `from..to` (mutates `list[li]` while trying; the caller owns `list`). Its own settings first,
 * then linear / smooth over the bias grid, then a finer grid round the winner. A trial stops as
 * soon as it passes `tol` — it is already out.
 */
const tuneSegment = (list: GradientStop[], li: number, space: BlendColorSpace, target: RGB[], from: number, to: number, tol: number): Tune => {
  const L = list[li];
  const trial = (bias: number, interp: Interp): number => {
    list[li] = { ...L, bias, interpolation: interp };
    let max = 0;
    for (let i = from; i <= to; i++) {
      const d = oklabDistance(sampleSortedStops(list, i / 255, space, 'srgb'), target[i]);
      if (!(d <= max)) max = Number.isNaN(d) ? Infinity : d;
      if (max > tol) return max;
    }
    return max;
  };
  const own = { bias: L.bias ?? 0.5, interp: (L.interpolation ?? 'linear') as Interp };
  let best: Tune = { err: trial(own.bias, own.interp), ...own };
  const consider = (bias: number, interp: Interp) => {
    const e = trial(bias, interp);
    if (e < best.err - 1e-9) best = { err: e, bias, interp };
  };
  for (const interp of ['linear', 'smooth'] as const) for (const b of BIAS_GRID) consider(b, interp);
  if (best.interp !== 'step') for (const b of biasFine(best.bias)) consider(b, best.interp);
  list[li] = L;
  return best;
};

/**
 * Greedy backward elimination, one removal per iteration (yields the list after each). `st` must
 * already be within `tol` of `target` everywhere when `tol` is finite (then every yielded list is,
 * by induction: a deletion changes only the texels between its two neighbours). With `tol` =
 * Infinity it runs down to two stops — the path.
 */
function* eliminateSteps(start: GradientStop[], space: BlendColorSpace, target: RGB[], tol: number): Generator<GradientStop[], void, void> {
  let st = [...start].sort((a, b) => a.position - b.position);
  /** The best way to merge away stop `k`. Sampled through a WINDOW of the list — the merged pair
   *  plus one stop either side — which the renderer's own segment rules (the first segment whose
   *  range holds `pos` wins; a step is held through its right boundary) read exactly as they read
   *  the whole list for every texel from ⌊L⌋ to ⌈R⌉. */
  const mergeCost = (k: number): Tune => {
    const from = Math.max(0, Math.floor(st[k - 1].position * 255));
    const to = Math.min(255, Math.ceil(st[k + 1].position * 255));
    const lo = Math.max(0, k - 2);
    const list = [...st.slice(lo, k), ...st.slice(k + 1, k + 3)];
    return tuneSegment(list, k - 1 - lo, space, target, from, to, tol);
  };
  const costs: (Tune | null)[] = st.map((_, k) => (k > 0 && k < st.length - 1 ? mergeCost(k) : null));
  for (;;) {
    let bestK = -1;
    for (let k = 1; k < st.length - 1; k++) {
      const c = costs[k];
      if (c && c.err <= tol && (bestK < 0 || c.err < costs[bestK]!.err)) bestK = k;
    }
    if (bestK < 0) return;
    const c = costs[bestK]!;
    st = st.filter((_, i) => i !== bestK);
    st[bestK - 1] = { ...st[bestK - 1], bias: c.bias, interpolation: c.interp };
    costs.splice(bestK, 1);
    // only the two new neighbours' merges changed
    for (const k of [bestK - 1, bestK]) costs[k] = k > 0 && k < st.length - 1 ? mergeCost(k) : null;
    yield st;
  }
}

/** Texel span a segment's samples cover (its two ends included). */
const spanOf = (a: GradientStop, b: GradientStop): [number, number] => [Math.max(0, Math.floor(a.position * 255)), Math.min(255, Math.ceil(b.position * 255))];

/**
 * `stops` plus one stop, both new segments re-tuned — or null when no segment has a texel strictly
 * inside it. Every candidate is scored as the worst ΔE of the whole list it makes (its two new
 * segments, tuned, against the untouched rest).
 *
 *   quick    — one candidate: inside the WORST segment (only that one can lower the worst ΔE), at
 *              its worst texel, the colour the target has there. The grow pass's per-count try;
 *              cheap enough for every count of every space.
 *   thorough — up to eight texels spread across the worst segment plus its worst one, each with
 *              the target's colour AND the colour the list already renders there; and, when the
 *              worst segment is not also the widest, the widest one's middle in its rendered colour.
 *              The rendered colour is the floor: a stop on the list's own curve bends it hardly at
 *              all, so a thorough insert almost never comes out worse than `stops` — which is what
 *              the axis repair needs. The widest segment is for a worst segment with no texel
 *              inside it (a band edge half a texel wide, where a banded palette is worst).
 */
const insertOne = (stops: GradientStop[], space: BlendColorSpace, target: RGB[], thorough: boolean): GradientStop[] | null => {
  const r = renderOf(stops, space);
  const d = r.map((c, i) => oklabDistance(c, target[i]));
  let wi = 0;
  for (let i = 1; i < 256; i++) if (d[i] > d[wi]) wi = i;
  const inside = (j: number): [number, number] => [Math.floor(stops[j].position * 255) + 1, Math.ceil(stops[j + 1].position * 255) - 1];
  // the segment holding the worst texel (a texel on a boundary: the one to its left)
  let worstSeg = stops.findIndex((s, k) => k < stops.length - 1 && s.position * 255 <= wi && wi <= stops[k + 1].position * 255);
  if (worstSeg < 0) worstSeg = 0;
  const tries: { j: number; texel: number; colour: RGB }[] = [];
  const [a, b] = inside(worstSeg);
  if (b >= a) {
    const texels = new Set<number>([Math.min(b, Math.max(a, wi))]);
    if (thorough) for (let q = 1; q <= 8; q++) texels.add(Math.round(a + ((b - a) * q) / 9));
    for (const i of texels) {
      tries.push({ j: worstSeg, texel: i, colour: target[i] });
      if (thorough) tries.push({ j: worstSeg, texel: i, colour: r[i] });
    }
  }
  if (thorough) {
    let wide = -1, room = 0;
    for (let j = 0; j < stops.length - 1; j++) { const [x, y] = inside(j); if (y - x + 1 > room) { room = y - x + 1; wide = j; } }
    if (wide >= 0 && wide !== worstSeg) { const [x, y] = inside(wide); const mid = (x + y) >> 1; tries.push({ j: wide, texel: mid, colour: r[mid] }); }
  }
  if (!tries.length) return null;
  const ids = new Set(stops.map((s) => s.id));
  let fresh = stops.length;
  while (ids.has(`r${fresh}`)) fresh++;
  let best: { list: GradientStop[]; err: number } | null = null;
  for (const { j, texel, colour } of tries) {
    // the untouched rest: every texel outside this segment's span
    const [from, to] = spanOf(stops[j], stops[j + 1]);
    let err = 0;
    for (let i = 0; i < 256; i++) if ((i < from || i > to) && d[i] > err) err = d[i];
    if (best && err >= best.err) continue;
    const L = stops[j];
    const list = [...stops.slice(0, j + 1), { id: `r${fresh}`, position: texel / 255, color: rgbToHex(colour), bias: 0.5, interpolation: L.interpolation ?? 'linear' }, ...stops.slice(j + 1)];
    for (const li of [j, j + 1]) {
      const [f, t] = spanOf(list[li], list[li + 1]);
      const tuned = tuneSegment(list, li, space, target, f, t, best ? best.err : Infinity);
      list[li] = { ...list[li], bias: tuned.bias, interpolation: tuned.interp };
      err = Math.max(err, tuned.err);
    }
    if (!best || err < best.err) best = { list, err };
  }
  return best?.list ?? null;
};

type Sol = { stops: GradientStop[]; err: number };

/** The best version per count in one space. */
class Curve {
  readonly best: (Sol | undefined)[] = [];
  constructor(readonly space: BlendColorSpace, readonly n: number) {}
  note(stops: GradientStop[], err: number): void {
    const k = stops.length;
    if (k < 2 || k >= this.n) return;
    const b = this.best[k];
    if (!b || err < b.err - 1e-9) this.best[k] = { stops: [...stops], err };
  }
  err(k: number): number { return this.best[k]?.err ?? Infinity; }
}

const clampLog = (e: number) => Math.log(Math.max(1e-4, e));

/**
 * The plan, LAZILY: `next()` works for about `sliceMs` and yields null (nothing new yet) or a
 * fresh plan (after the own path, after the own refits, after each space the search tries). The
 * last value yielded has `pending: false`. Null for a ramp gradient or one with fewer than three
 * stops.
 */
export const reduceStopsPlan = (config: GradientConfig, opts: ReduceOptions = {}): Generator<ReducePlan | null, void, void> | null => {
  if (isRampGradient(config)) return null;
  const input = Array.isArray(config.stops) ? [...config.stops].sort((a, b) => a.position - b.position) : [];
  if (input.length < 3) return null;
  return planner(config, input, opts);
};

function* planner(config: GradientConfig, input: GradientStop[], opts: ReduceOptions): Generator<ReducePlan | null, void, void> {
  const own: BlendColorSpace = config.blendSpace || 'oklab';
  const steps = opts.steps ?? REDUCE_STEPS;
  const slice = opts.sliceMs ?? 12;
  const target = renderOf(input, own);
  const n = input.length;
  // a config carrying both forms renders its stops; a version must not drag a stale ramp along
  const { ramp: _staleRamp, ...body } = config;
  const others = opts.searchBlend ? (opts.spaces ?? REDUCE_SEARCH_SPACES).filter((s) => s !== own) : [];

  let t0 = performance.now();
  function* tick(): Generator<null, void, void> {
    if (performance.now() - t0 > slice) { yield null; t0 = performance.now(); }
  }
  const measureInto = (curve: Curve, stops: GradientStop[]) => curve.note(stops, maxRenderedDE(stops, curve.space, target));
  function* path(curve: Curve, start: GradientStop[]): Generator<null, void, void> {
    for (const st of eliminateSteps(start, curve.space, target, Infinity)) {
      measureInto(curve, st);
      yield* tick();
    }
  }
  function* refits(curve: Curve): Generator<null, void, void> {
    const seen = new Set<number>();
    for (const tol of REFIT_TOLS) {
      const fit = fitRampToStops(target, { targetDE: tol, maxStops: n - 1, fitBias: true, blendSpace: curve.space });
      const st = [...fit.stops].sort((a, b) => a.position - b.position);
      yield* tick();
      // the fitter's seeds can overshoot its cap: still a start for the path, never a version
      if (st.length < 2 || seen.has(st.length)) continue;
      seen.add(st.length);
      measureInto(curve, st);
      yield* path(curve, st);
    }
  }
  function* grow(curve: Curve): Generator<null, void, void> {
    for (let k = 3; k < n; k++) {
      const below = curve.best[k - 1];
      if (!below) continue;
      const up = insertOne(below.stops, curve.space, target, false);
      if (up && up.length === k) measureInto(curve, up);
      yield* tick();
    }
  }

  const ownCurve = new Curve(own, n);
  const curves: Curve[] = [];
  const version = (s: Sol, space: BlendColorSpace): ReduceVersion => ({
    config: { ...body, stops: s.stops, colorSpace: config.colorSpace, blendSpace: space },
    stops: s.stops.length,
    maxDE: s.err,
  });
  const snapshot = (pending: boolean): ReducePlan => {
    // the ONE other space: the one whose clearly-better counts lower the error the most
    let other: Curve | null = null;
    let bestGain = 0;
    for (const c of curves) {
      let gain = 0;
      for (let k = 2; k < n; k++) if (c.err(k) < OTHER_RATIO * ownCurve.err(k)) gain += clampLog(ownCurve.err(k)) - clampLog(c.err(k));
      if (gain > bestGain + 1e-9) { bestGain = gain; other = c; }
    }
    const byCount: (ReduceVersion | undefined)[] = [];
    for (let k = 2; k < n; k++) {
      const use = other && other.err(k) < OTHER_RATIO * ownCurve.err(k) ? other : ownCurve;
      const s = use.best[k];
      if (s) byCount[k] = version(s, use.space);
    }
    // THE AXIS REPAIR: one more stop should never look worse than one fewer. Where it does (a
    // path's own unevenness, or the step between the own space and the other), the count below
    // plus one thorough insert takes its place, and the curve keeps it for the next snapshot.
    for (let k = 3; k < n; k++) {
      const lo = byCount[k - 1], hi = byCount[k];
      if (!lo || !hi || hi.maxDE <= lo.maxDE + 1e-9) continue;
      const space = lo.config.blendSpace as BlendColorSpace;
      const up = insertOne(lo.config.stops, space, target, true);
      if (!up || up.length !== k) continue;
      const err = maxRenderedDE(up, space, target);
      if (err < hi.maxDE - 1e-9) {
        (space === own ? ownCurve : curves.find((c) => c.space === space))?.note(up, err);
        byCount[k] = version({ stops: up, err }, space);
      }
    }
    return {
      from: n,
      byCount,
      steps: steps.map((step) => {
        let k = 2;
        while (k < n && !(byCount[k] && byCount[k]!.maxDE <= step.tolerance)) k++;
        return { step, stops: k };
      }),
      other: other && byCount.some((v) => v?.config.blendSpace === other!.space) ? other.space : null,
      pending,
    };
  };

  // 1. the own path: every count, fast — the popup is usable from here
  yield* path(ownCurve, input);
  yield* grow(ownCurve);
  yield snapshot(true);
  // 2. the own refits
  yield* refits(ownCurve);
  yield* grow(ownCurve);
  yield snapshot(others.length > 0);
  // 3. the search, one space at a time
  for (let i = 0; i < others.length; i++) {
    const c = new Curve(others[i], n);
    yield* refits(c);
    yield* grow(c);
    curves.push(c);
    yield snapshot(i < others.length - 1);
  }
}

/** The finished plan at once (the harness; the editor pulls lazily). */
export const reduceStopsPlanSync = (config: GradientConfig, opts: ReduceOptions = {}): ReducePlan | null => {
  const it = reduceStopsPlan(config, { ...opts, sliceMs: Infinity });
  if (!it) return null;
  let last: ReducePlan | null = null;
  for (const p of it) if (p) last = p;
  return last;
};
