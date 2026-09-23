/**
 * stopFit — the GMT-adapted curve fitter. Turns a 256-step RGB ramp (from the
 * generator, picker, or img2grad) into a compact GMT GradientStop[] that, when
 * rendered by GMT's own gradient pipeline (blendSpace 'oklab'), reproduces the
 * ramp within a perceptual tolerance.
 *
 * This is the "feed it" seam AND the user's curve-fitting adaptation: GMT stops
 * are a UNIFIED colour path (one knot sequence, no separate H/L/C curves) and
 * interpolate via OKLCh-polar between stops — there are no bezier handles. So the
 * advanced fitter's value carries over as two ideas, not its bezier output:
 *   1. CORNER PRE-SEED — detect hard transitions (big adjacent OKLab ΔE) and seed
 *      a stop on each side so bands stay crisp (the prototype's corner detection).
 *   2. REFINE-TO-WORST-RENDERED-ERROR — repeatedly insert a stop at the position of
 *      greatest ΔE between GMT's *rendered* gradient and the target, until under
 *      tolerance. Strictly better than Douglas-Peucker, which measures linear-RGB
 *      error blind to OKLCh interpolation.
 *   0. PLATEAUS ARE STEPS (2026-09-07, owner: "there are many stepped gradients in the
 *      library and none of them create stepped knots"). A banded palette is defined by its
 *      FLAT RUNS, not by the size of its jumps — most bands in real palettes differ by a
 *      tiny ΔE (cpt-city's banded palettes: median edge 0.021), so a jump-based corner
 *      detector never sees them (57 of 120 got any step; the rest got linear stops or
 *      none). Every run of ≥ 3 identical texels now seeds one STEP stop holding the band,
 *      with the next stop half a texel past the band's end. Exact by construction, and one
 *      stop per band instead of a fitted curve through them.
 *   3. BIAS AND SMOOTH BEFORE A NEW STOP (2026-09-07, owner: "make use of stepped and
 *      bias interpolation"). Before spending a stop on the worst segment, the refine
 *      tries the segment's BIAS (a coarse-then-fine grid) and its interpolation
 *      (linear / smooth) and keeps the best; a stop is added only when neither gets the
 *      segment under tolerance. Measured on 40 synthetic gradients with random biases:
 *      13.3 → 7.4 stops (linear), 14.6 → 8.6 (smooth), at a LOWER worst error; plain
 *      bias-0.5 gradients unchanged (5.0 → 5.1). Trials are evaluated on the segment's
 *      own texels only (`sampleSortedStops`), not a full re-render, so a fit stays a few ms.
 *
 * THE BLEND SPACE IS AN OPTION (2026-09-23, for "Reduce stops…" — palette/core/reduceStops.ts).
 * Every render and trial the refine makes goes through `o.blendSpace`, and the result carries
 * it; the default is 'oklab' (OkLCh-polar), so every caller that passes none is unchanged. The
 * detectors (plateaus, corners) read the TARGET ramp only and do not care. A reduce fits a
 * gradient in its OWN space, so an RGB-blended gradient stays RGB-blended — refitting it in
 * OkLCh would have changed its identity, not just its stop count.
 */

import type { GradientStop, GradientConfig, BlendColorSpace } from '../../types';
import { rgbToOklab, oklabDistance, type RGB } from './oklab';
import { renderStopsToRamp, renderGradientToRamp, sampleSortedStops, rgbToHex } from './gmtGradient';
import { encodeRamp } from '../../utils/gradientRamp';

export interface StopFitOptions {
  /** Perceptual stop tolerance (OKLab ΔE). Lower = more stops, higher fidelity. */
  targetDE?: number;
  /** Hard cap on stop count. */
  maxStops?: number;
  /** Seed stops at detected hard transitions (bands). */
  seedCorners?: boolean;
  /** Seed one STEP stop per flat run (idea 0). Default on. */
  seedPlateaus?: boolean;
  /** A run this many IDENTICAL texels long counts as a band … */
  plateauMin?: number;
  /** … provided at least one of its ends is a real edge: adjacent ΔE this large. A smooth
   *  8-bit ramp is full of identical-texel runs (one level of sRGB is ΔE ≈ 0.003 in the
   *  darks) — those are quantisation, not bands, and must stay linear (measured 2026-09-07:
   *  without this gate a smooth "bluescale" got 87 stops, 11 of them steps). */
  bandEdgeDE?: number;
  /** Adjacent-sample ΔE above which a position counts as a hard transition. */
  cornerDE?: number;
  /** How much a jump must stand out from its neighbours' ΔE to be an EDGE (a step) rather
   *  than a steep run. See detectCorners. */
  edgeRatio?: number;
  /** Stops to seed BEFORE the refine loop — the position AND interpolation of the stops the
   *  input already had. Without them every re-fit of a re-quantised ramp finds its "worst
   *  error" a texel further along and the interior stops WALK on each bake (measured
   *  2026-09-07 in the v2 Mix: 16.9 → 18.8 → 19.2 → 19.6 % over three bakes). Position alone
   *  is not enough: a seed at a STEP edge re-fitted as linear leaves an error the refine
   *  patches with one more stop per bake (measured: 95.7, then 96.1, then 96.5 %). With
   *  both, a re-fit of an unchanged gradient reproduces its stops exactly. Over budget the
   *  seeds win over the refine, never over the corners. */
  seedStops?: { position: number; interpolation?: GradientStop['interpolation']; bias?: number }[];
  /** Try bias + smooth on the worst segment before adding a stop (idea 3). OFF by default:
   *  it reproduces a posterised palette within tolerance using soft curves and fewer stops,
   *  which the GMT seam (legacy palette import) does not want — bands must stay crisp. The
   *  v2 working pipeline opts in. */
  fitBias?: boolean;
  /** The space the fit's stops are rendered in while it measures them, and the result's
   *  `blendSpace`. Default 'oklab' (see the file header). */
  blendSpace?: BlendColorSpace;
}

/**
 * How much bigger than ONE 8-BIT STEP an edge must be before it counts as a real band.
 *
 * This replaced a fixed `QUANTISATION_DE = 0.006` on 2026-09-12, because that constant's
 * premise was measurably false. Its comment claimed "one sRGB level is DeltaE ~ 0.003-0.004
 * at its worst (the darks)". The darks are the worst case by an order of magnitude, not the
 * best: sRGB's transfer curve is near-LINEAR below level ~10, so one 8-bit step there is a
 * huge relative jump, and OkLab's cube root amplifies it further. Measured on a grey ramp:
 *
 *     level   0 -> 1     DeltaE 0.0672      <- eleven times the old constant
 *     level   3 -> 4     DeltaE 0.0098
 *     level   8 -> 9     DeltaE 0.0054      <- first level that fits under it
 *     level 128 -> 129   DeltaE 0.0034      <- the figure the old comment generalised from
 *
 * So every quantisation edge below level ~8 read as a REAL BAND, and a smooth dark fade came
 * out as a staircase: black -> #101010 fitted to 18 stops, 17 of them `step` (owner,
 * 2026-09-12: "it still seems to be an issue with some very dark gradients"). The identical
 * 16-level span at mid grey fitted to 2 stops and no steps, which is what gave it away.
 *
 * The floor is therefore computed PER EDGE from the ramp itself (see `stepFloor`), and this
 * is only the slack over it. 1.05 is float headroom, not a tuning knob: an edge of exactly
 * one level should compare equal to a one-level floor.
 *
 * @invariant A smooth ramp is fitted with NO stepped stops at any brightness, and a genuinely
 *   banded one still becomes step stops — proven by: `npm run test:palette-stopfit` section
 *   [9] (the five shallow cases, two of them in the deep darks, plus the 16-band case that is
 *   there to catch over-reach). Falsified BOTH WAYS on 2026-09-12, which is what fixes the
 *   threshold between them: restoring the fixed 0.006 constant reds only the two dark cases
 *   (18 stops/17 step, 10/9 — the measured before-figures), and widening the slack to 20x
 *   reds only the banded ones. A guard for a threshold needs both walls or it only pins one.
 */
const QUANTISATION_SLACK = 1.05;

/**
 * Over budget, a corner pick this close (OKLab ΔE) to the previous pick counts as ALIASED onto
 * a periodic pattern, and is swapped for the most different seed in its slot (grep
 * `ALIAS_DE` in fitRampToStops' corner pass).
 *
 * @invariant An over-budget period-2 zebra does not fit to a single colour — proven by:
 *   `npm run test:palette-stopfit` section [10] ("an over-budget zebra keeps both phases").
 *   Falsified 2026-09-14 by setting ALIAS_DE to 0 (the pure even stride): [10] red.
 */
const ALIAS_DE = 0.02;

const DEFAULTS: Required<StopFitOptions> = {
  targetDE: 0.02,
  maxStops: 32,
  seedStops: [],
  fitBias: false,
  blendSpace: 'oklab',
  seedCorners: true,
  seedPlateaus: true,
  plateauMin: 4,
  bandEdgeDE: 0.01,
  // Only TRUE posterization edges become 'step'. Set high so gradual (but
  // colourful) rainbow transitions stay smooth — marking those as step creates
  // a hard edge that the refine loop then has to undo with extra stops.
  cornerDE: 0.09,
  edgeRatio: 2.5,
};

/**
 * Hard transitions in the ramp. For each adjacent pair (i-1, i) whose OKLab ΔE exceeds
 * cornerDE AND stands out from its neighbours (an isolated jump — a genuine band edge has
 * flat colour on both sides), both indices are seeded and `i-1` is flagged as a STEP edge:
 * GMT's 'step' interpolation holds the left colour until the next stop then jumps,
 * reproducing a crisp band with two stops instead of many. This is what lets the unified-stop
 * fitter match banded palettes cheaply (no per-channel curves).
 *
 * A steep but CONTINUOUS run (adjacent ΔE over the threshold on several texels in a row —
 * a strongly biased segment does this) is NOT an edge: chaining step stops through it holds
 * the wrong colour on each stop's own texel, where no refine can reach (measured 2026-09-07:
 * ΔE 0.13 left on texels 88–89 of a bias-0.82 segment). Those texels are seeded as plain
 * stops instead, and the refine's bias / smooth trials take it from there.
 */
const detectCorners = (ramp: RGB[], cornerDE: number, edgeRatio: number): { seeds: number[]; stepLeft: Set<number> } => {
  const d = new Array<number>(256).fill(0);
  for (let i = 1; i < 256; i++) d[i] = oklabDistance(ramp[i - 1], ramp[i]);
  const set = new Set<number>();
  const stepLeft = new Set<number>();
  for (let i = 1; i < 256; i++) {
    if (d[i] <= cornerDE) continue;
    const neighbours = Math.max(i > 1 ? d[i - 1] : 0, i < 255 ? d[i + 1] : 0);
    const isolated = d[i] > edgeRatio * neighbours;
    if (isolated) {
      if (i - 1 > 0) {
        set.add(i - 1);
        stepLeft.add(i - 1);
      }
      if (i < 255) set.add(i);
    } else {
      // a steep run: give the refine a foothold, but never a step
      if (i - 1 > 0) set.add(i - 1);
    }
  }
  return { seeds: [...set].sort((a, b) => a - b), stepLeft };
};

/** Flat runs: [start, end] texel ranges of EXACTLY identical colour. Exact, not "within a
 *  small ΔE": a held band renders to identical texels, while a smooth ramp's one-level
 *  quantisation differences are ~0.002–0.004 — treating those as flat made a band's start
 *  creep one texel per re-fit (measured 2026-09-07: 127.5 → 126.5 → 125.5). */
const detectPlateaus = (ramp: RGB[], minRun: number): { start: number; end: number }[] => {
  const runs: { start: number; end: number }[] = [];
  let start = 0;
  const same = (a: RGB, b: RGB) => Math.round(a.r) === Math.round(b.r) && Math.round(a.g) === Math.round(b.g) && Math.round(a.b) === Math.round(b.b);
  for (let i = 1; i <= 256; i++) {
    const flat = i < 256 && same(ramp[i - 1], ramp[i]);
    if (!flat) {
      if (i - start >= minRun) runs.push({ start, end: i - 1 });
      start = i;
    }
  }
  return runs;
};

const mkStop = (
  idx: number,
  ramp: RGB[],
  id: number,
  interpolation: GradientStop['interpolation'] = 'linear',
  position: number = idx / 255,
  bias = 0.5,
): GradientStop => ({
  id: `s${id}`,
  position,
  color: rgbToHex(ramp[idx]),
  bias,
  interpolation,
});

/** The bias grid the refine tries on a segment: coarse first, then fine around the best. */
const BIAS_COARSE = [0.2, 0.35, 0.5, 0.65, 0.8];
const biasFine = (b: number): number[] => [b - 0.1, b - 0.05, b + 0.05, b + 0.1].filter((x) => x > 0.05 && x < 0.95);

/**
 * GMT's renderer holds a STEP segment's left colour through its right boundary INCLUSIVE
 * (`pos <= s2.position` in sampleSorted), so a right-hand stop placed exactly on texel `i`
 * paints texel `i` with the LEFT colour and the jump lands on `i + 1`. Re-fit that, and
 * the edge walks one texel right per bake (measured 2026-09-07: 212 → 213 → 214). The
 * right-hand stop of a hard edge therefore sits half a texel early, so texel `i` is past
 * it and takes the right colour: the edge stays where the ramp has it.
 */
const edgeRightPosition = (i: number): number => (i - 0.5) / 255;

/**
 * Fit a 256-step ramp to GMT stops. `ramp` is 256 sRGB colours (0-255).
 * Returns a GradientConfig (stops + srgb/oklab) ready to feed GMT's gradient system.
 */
export const fitRampToStops = (ramp: RGB[], opts: StopFitOptions = {}): GradientConfig => {
  const o = { ...DEFAULTS, ...opts };
  if (ramp.length !== 256) throw new Error(`fitRampToStops expects 256 samples, got ${ramp.length}`);

  let nextId = 0;
  const used = new Set<number>([0, 255]);
  const stops: GradientStop[] = [mkStop(0, ramp, nextId++), mkStop(255, ramp, nextId++)];

  // The stops the input already had go in FIRST, at their exact positions (a half-texel
  // edge stop must not be rounded back onto the texel, or the edge walks). Everything the
  // detectors add below has to pass `stillWrong`: with these seeds in place, is the ramp
  // still over tolerance there? On a first fit (no seeds) that is true everywhere; on a
  // re-fit of an unchanged gradient it is true nowhere, so nothing is added and a bake is
  // a no-op — without the gate a re-fit found new "bands" in the slow regions of its own
  // rendering (identical runs beside a real edge) and grew four stops per bake.
  for (const sd of o.seedStops) {
    if (stops.length >= o.maxStops) break;
    const idx = Math.max(0, Math.min(255, Math.round(sd.position * 255)));
    if (used.has(idx)) continue;
    used.add(idx);
    // A STEP seed paints the texels strictly AFTER its position (GMT holds a step through its
    // right boundary inclusive), so its colour is the first of those — for a seed on an
    // integer texel that is the NEXT texel, not its own. Measured 2026-09-07 ("snowstorm",
    // steps at 235 / 240 / 250 exactly): sampled at its own texel the seed carried the
    // previous band's colour, the band rendered wrong, and the plateau pass added a second
    // stop half a texel later on every re-fit (46 → 48 stops on the first Mix toggle).
    const colourIdx = (sd.interpolation ?? 'linear') === 'step' ? Math.min(255, Math.floor(sd.position * 255 + 1e-6) + 1) : idx;
    stops.push(mkStop(colourIdx, ramp, nextId++, sd.interpolation ?? 'linear', Math.max(0, Math.min(1, sd.position)), sd.bias ?? 0.5));
  }
  let currentErr: number[] | null = null;
  const rescore = () => {
    currentErr = renderStopsToRamp([...stops].sort((a, b) => a.position - b.position), o.blendSpace, 'srgb').map((c, i) => oklabDistance(c, ramp[i]));
  };
  if (o.seedStops.length) rescore();
  const stillWrong = (from: number, to: number): boolean => {
    if (!currentErr) return true;
    for (let i = Math.max(0, from); i <= Math.min(255, to); i++) if (currentErr[i] > o.targetDE) return true;
    return false;
  };

  // 0) Plateaus → one STEP stop per band (idea 0). The step holds the band's colour until
  //    the next stop; that next stop sits half a texel past the band's end (the renderer's
  //    inclusive step boundary — see edgeRightPosition) and starts whatever follows: the
  //    next band (then it is that band's step stop) or a ramp (then it is linear).
  if (o.seedPlateaus) {
    const rawEdge = (a: number, b: number) => (a < 0 || b > 255 ? 1 : oklabDistance(ramp[a], ramp[b]));
    /**
     * The DeltaE that ONE 8-bit step would produce between these two texels, in the direction
     * this edge actually moves. That is the quantisation floor HERE — it is ~20x larger at
     * level 0 than at level 128, which is why a single constant could not serve both (see
     * QUANTISATION_SLACK). Taking the direction from the edge itself matters too: a ramp that
     * moves in one channel must not be compared against a diagonal step, which is ~sqrt(3)
     * larger and would swallow a real edge.
     */
    const stepFloor = (a: number, b: number): number => {
      const p = ramp[a];
      const q = ramp[b];
      const d = [q.r - p.r, q.g - p.g, q.b - p.b];
      const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]));
      if (m === 0) return 0;
      return oklabDistance(p, { r: p.r + d[0] / m, g: p.g + d[1] / m, b: p.b + d[2] / m });
    };
    /** The edge, with quantisation-scale ones reported as NO edge. Past either end it stays 1,
     *  so a genuine first or last band still seeds (unchanged). */
    const edge = (a: number, b: number): number => {
      if (a < 0 || b > 255) return 1;
      const e = rawEdge(a, b);
      return e <= stepFloor(a, b) * QUANTISATION_SLACK ? 0 : e;
    };
    const all = detectPlateaus(ramp, o.plateauMin);
    // A BANDED ramp (most texels inside flat runs) is bands wherever it is flat, however
    // small the edges between them (the seam's 64-band test has edges of 0.008; adjacent
    // library bands are often that close). A SMOOTH ramp's occasional identical-texel runs
    // are quantisation, and only count as a band when one end is a real edge.
    const flatTexels = all.reduce((n, r) => n + (r.end - r.start + 1), 0);
    const bandedRamp = flatTexels >= 0.6 * 256;
    /**
     * …UNLESS EVERY EDGE IS QUANTISATION. A very SHALLOW gradient is mostly flat texels for
     * the same reason a banded one is — it crosses so few 8-bit levels that each holds for
     * dozens of texels — so `bandedRamp` is true for it by accident, and it took the whole
     * `bandEdgeDE` gate off. Measured 2026-09-11, target 0.012: #202024 → #232328 came out as
     * 9 stops, 8 of them STEPS; #808088 → #8a8a92 as 12 stops, 11 steps (owner: "at verry
     * shallow gradients, it is creating a whole bunch of linear/stepped stops").
     *
     * The discriminator is the size of the edges BETWEEN the runs, not how much of the ramp is
     * flat. One sRGB level is ΔE ≈ 0.003–0.004 at its worst; a real band edge is far above it
     * (0.057 on a 16-band palette, 0.008 on the seam's deliberately-subtle 64-band test). So
     * if the biggest inter-run edge in the whole ramp is at quantisation scale, this ramp has
     * no bands in it at all and the plateau pass does nothing — it is a smooth ramp, and the
     * refine below fits it with a handful of linear stops.
     *
     * The ramp's own two ENDS are excluded from that measurement: `edge` reports 1 past either
     * end so that a genuine first or last band always seeds, and counting those would make
     * every ramp look like it had a real edge.
     */
    let biggestEdge = 0;
    for (const r of all) {
      if (r.start > 0) biggestEdge = Math.max(biggestEdge, edge(r.start - 1, r.start));
      if (r.end < 255) biggestEdge = Math.max(biggestEdge, edge(r.end, r.end + 1));
    }
    // Every measurable inter-run edge was quantisation (`edge` reported 0 for each), so
    // this ramp has no bands in it at all: let the refine below fit it smoothly.
    const quantisedOnly = all.length > 0 && biggestEdge === 0;
    const runs = quantisedOnly
      ? []
      : bandedRamp ? all : all.filter((r) => Math.max(edge(r.start - 1, r.start), edge(r.end, r.end + 1)) >= o.bandEdgeDE);
    const bandStart = new Set(runs.map((r) => r.start));
    for (const r of runs) {
      if (stops.length >= o.maxStops) break;
      if (!stillWrong(r.start, r.end + 1)) continue;
      // the band's own stop: on texel 0 at position 0; otherwise half a texel before it
      if (!used.has(r.start)) {
        used.add(r.start);
        stops.push(r.start === 0 ? { ...stops.shift()!, interpolation: 'step' } : mkStop(r.start, ramp, nextId++, 'step', edgeRightPosition(r.start)));
      } else if (r.start === 0) {
        stops[0] = { ...stops[0], interpolation: 'step' };
      }
      // what follows the band (unless the next band's own stop covers it)
      const next = r.end + 1;
      if (next <= 255 && !bandStart.has(next) && !used.has(next) && stops.length < o.maxStops) {
        used.add(next);
        stops.push(mkStop(next, ramp, nextId++, 'linear', next === 255 ? 1 : edgeRightPosition(next)));
      }
    }
    stops.sort((a, b) => a.position - b.position);
    // With the bands in, re-score: the corner pass below must not add its own stop on the
    // last texel of a band whose edge the band's step already renders exactly (that was a
    // redundant knot per band — owner, 2026-09-07: "they only need 1 knot to change colour").
    if (runs.length) rescore();
  }

  // 1) Corner pre-seed — concentrate stops at hard band edges up front, marking
  //    the left side of each jump as a STEP edge for crisp bands.
  if (o.seedCorners) {
    const { seeds, stepLeft } = detectCorners(ramp, o.cornerDE, o.edgeRatio);
    // If the corners alone exceed the budget, subsample them EVENLY across positions
    // rather than letting the earliest ones fill maxStops — otherwise a region dense
    // with edges (heavy posterize / noise) starves every later position of a stop and
    // the gradient truncates spatially. Under budget (the usual case) all are kept.
    //
    // …but an even stride ALIASES on a periodic ramp. Softology's 8ZEBBOW2 is black on every
    // other texel: 254 seeds into 126 slots is a stride of ~2, every pick landed on the black
    // phase, and the gradient fitted to 126 black stops (2026-09-14). So each pick keeps its
    // even slot UNLESS it is nearly the colour of the previous pick (`ALIAS_DE`), in which
    // case it takes the seed in its slot most unlike that previous pick. Guarded, not "always
    // take the most different": that version fixed the zebras but doubled the error on noisy
    // ramps (CCA1 0.094 → 0.181 blurred) by chasing outliers. Measured over the 84 catalogue
    // ramps that reach this branch, at the Add-stops budget (Detail 8): 21 change, 14 better,
    // 0 worse (8ZEBBOW2 0.486 → 0.068 blurred ΔE, 126 → 63 black stops); Detail 10: 5 / 0;
    // Detail 0: 12 better, 2 worse by ≤ 0.009.
    const budget = Math.max(0, o.maxStops - stops.length);
    let chosen = seeds;
    if (seeds.length > budget) {
      chosen = [];
      let prev = ramp[0];
      for (let j = 0; j < budget; j++) {
        const from = Math.floor((j * seeds.length) / budget);
        const to = Math.max(from + 1, Math.floor(((j + 1) * seeds.length) / budget));
        let pick = seeds[from];
        if (oklabDistance(prev, ramp[pick]) < ALIAS_DE) {
          let farthest = -1;
          for (let q = from; q < to; q++) {
            const dq = oklabDistance(prev, ramp[seeds[q]]);
            if (dq > farthest) {
              farthest = dq;
              pick = seeds[q];
            }
          }
        }
        chosen.push(pick);
        prev = ramp[pick];
      }
    }
    for (const idx of chosen) {
      if (used.has(idx) || stops.length >= o.maxStops) continue;
      if (!stillWrong(idx - 1, idx + 1)) continue;
      used.add(idx);
      const left = stepLeft.has(idx);
      // the right side of a jump (its left neighbour is a step edge) sits half a texel early
      const rightOfEdge = !left && stepLeft.has(idx - 1);
      stops.push(mkStop(idx, ramp, nextId++, left ? 'step' : 'linear', rightOfEdge ? edgeRightPosition(idx) : idx / 255));
    }
    stops.sort((a, b) => a.position - b.position);
  }

  // 2) Refine: the worst SEGMENT first gets its bias / smooth tried (idea 3); a new stop
  //    only when that is not enough. One full render per iteration; the trials sample the
  //    segment's own texels.
  const texelOf = (p: number) => Math.max(0, Math.min(255, Math.round(p * 255)));
  const segmentError = (st: GradientStop[], k: number, from: number, to: number): { max: number; at: number } => {
    let max = 0;
    let at = from;
    for (let i = from; i <= to; i++) {
      if (used.has(i)) continue;
      // `st` is sorted by the caller on every pass of the refine loop below, so sample it
      // PRE-SORTED: `sampleStops` would copy and re-sort it once per texel, up to 512
      // iterations deep (measured 2026-09-11 — the fit is the expensive half of a derive).
      const d = oklabDistance(sampleSortedStops(st, i / 255, o.blendSpace, 'srgb'), ramp[i]);
      if (d > max) {
        max = d;
        at = i;
      }
    }
    return { max, at };
  };
  let guard = 0;
  while (guard++ < 512) {
    stops.sort((a, b) => a.position - b.position);
    const rendered = renderStopsToRamp(stops, o.blendSpace, 'srgb');
    // the worst segment (by its worst texel). A step segment counts too: the corner
    // detector marks any steep run as step pairs, and a steep-but-continuous run is
    // better served by a biased linear / smooth segment — the trials below say which.
    let worstK = -1;
    let worstDE = o.targetDE;
    let worstAt = -1;
    for (let k = 0; k < stops.length - 1; k++) {
      const from = texelOf(stops[k].position);
      const to = texelOf(stops[k + 1].position);
      for (let i = from; i <= to; i++) {
        if (used.has(i)) continue;
        const d = oklabDistance(rendered[i], ramp[i]);
        if (d > worstDE) {
          worstDE = d;
          worstK = k;
          worstAt = i;
        }
      }
    }
    if (worstK < 0) break; // everything under tolerance
    if (o.fitBias) {
      const from = texelOf(stops[worstK].position);
      const to = texelOf(stops[worstK + 1].position);
      type Interp = NonNullable<GradientStop['interpolation']>;
      let best: { bias: number; interp: Interp; max: number } = { bias: stops[worstK].bias ?? 0.5, interp: (stops[worstK].interpolation ?? 'linear') as Interp, max: worstDE };
      const trial = (bias: number, interp: Interp) => {
        const st = stops.map((x, i) => (i === worstK ? { ...x, bias, interpolation: interp } : x));
        const e = segmentError(st, worstK, from, to);
        if (e.max < best.max - 1e-6) best = { bias, interp, max: e.max };
      };
      for (const interp of ['linear', 'smooth'] as const) {
        for (const bias of BIAS_COARSE) trial(bias, interp);
      }
      for (const bias of biasFine(best.bias)) trial(bias, best.interp);
      stops[worstK] = { ...stops[worstK], bias: best.bias, interpolation: best.interp };
      if (best.max <= o.targetDE) continue; // the segment is fixed without a new stop
    }
    if (stops.length >= o.maxStops) break;
    used.add(worstAt);
    stops.push(mkStop(worstAt, ramp, nextId++));
  }
  stops.sort((a, b) => a.position - b.position);

  return { stops, colorSpace: 'srgb', blendSpace: o.blendSpace };
};

/**
 * The most stops an AUTOMATIC fit may keep (ADR-0122 Decision 3). Past this a gradient is not
 * something a person authors with knots — it is noise on a strip, and every stop edit, drag and
 * preview re-samples the list per texel. The owner set it (2026-09-14): "even 50 — at a certain
 * point, stops are not useful and reduce performance". Measured at the catalogue seam (ΔE 0.02),
 * 57% of Softology needs more than 48; core 0.9%, cpt-city 1.5%.
 */
export const STOP_LAYER_CAP = 48;

/**
 * Turn 256 samples into a `GradientConfig` of the right FORM (ADR-0122): fit it, keep the stops
 * if the fit is both CHEAP (within `cap` stops, and within `maxStops`) and FAITHFUL (see below),
 * otherwise keep the samples as a RAMP gradient (`stops: []` + `ramp`), exact by construction.
 *
 * CHEAP is read without reaching into the fitter: it fits with ONE stop of headroom over the
 * limit, and a result that used the headroom ran out of budget.
 *
 * FAITHFUL is measured, not inferred. The first cut assumed a fit that ended under the limit had
 * met `targetDE` everywhere, and that is false — probably because the refine skips the texels its
 * own stops sit on (`used`), so an edge texel rendered wrong is never revisited; the cause is
 * NOT verified, the misses are (measured 2026-09-14 over the catalogue at
 * the seam, target 0.02: of 8,860 stop-form fits, 8,188 are within target everywhere and 516
 * miss by more than 0.05 — 355 of those on 1–4 texels at a band edge, invisible on a strip, and
 * 161 on 5 or more, e.g. cpt-city calbayo-09 at ΔE 0.25 across 10 texels). So the render of the
 * fit is compared with the samples, and the stops are kept only if at most `FAITHFUL_MISS_TEXELS`
 * texels miss by more than `max(0.05, 2.5 × targetDE)`. A max-ΔE rule would have sent hundreds
 * of clean banded palettes to the ramp form over one edge texel.
 *
 * `cap` defaults to `STOP_LAYER_CAP`. This is for gradients that have NO stops yet. A gradient that
 * already HAS stops must not come through here even with `cap: Infinity` — a refit that runs out
 * of its Detail budget would flip it to a ramp, and a gradient that has stops keeps them. Such
 * refits, and an explicit "Add stops", call `fitRampToStops` directly (grep `fitWorkingOutput`,
 * `addStopsToConfig` in workingPipeline).
 *
 * Always returns `colorSpace: 'srgb'`: a caller holding a `'linear'` gradient puts its own back
 * (gradientSeam does).
 *
 * @invariant The stop form is chosen exactly when a free fit needs ≤ the limit AND misses no more
 *   than FAITHFUL_MISS_TEXELS texels, the stops kept are that fit's stops, and the ramp form
 *   renders the samples byte-for-byte — proven by: npm run test:palette-gradientramp ("form flips
 *   at the cap", "a cheap fit missing > 4 texels becomes a ramp", "kept stops are the free fit's",
 *   "zebra becomes a ramp and renders exactly"). Falsified 2026-09-14, see its header.
 */
export const rampToGradientConfig = (
  ramp: RGB[],
  opts: StopFitOptions & { cap?: number } = {},
): GradientConfig => {
  const { cap = STOP_LAYER_CAP, ...fitOpts } = opts;
  const limit = Math.max(2, Math.min(fitOpts.maxStops ?? DEFAULTS.maxStops, cap));
  const fitted = fitRampToStops(ramp, { ...fitOpts, maxStops: Number.isFinite(limit) ? limit + 1 : limit });
  if (fitted.stops.length <= limit && fitMissTexels(fitted, ramp, fitOpts.targetDE ?? DEFAULTS.targetDE) <= FAITHFUL_MISS_TEXELS) return fitted;
  return { stops: [], ramp: encodeRamp(ramp), colorSpace: 'srgb', blendSpace: 'oklab' };
};

/** How many texels a stop-form fit may miss and still be kept (see rampToGradientConfig). */
export const FAITHFUL_MISS_TEXELS = 4;

/** Texels whose rendered fit misses the samples by more than `max(0.05, 2.5 × targetDE)`. */
const fitMissTexels = (config: GradientConfig, ramp: RGB[], targetDE: number): number => {
  const bound = Math.max(0.05, 2.5 * targetDE);
  const rendered = renderStopsToRamp(config.stops, config.blendSpace, 'srgb');
  let n = 0;
  for (let i = 0; i < 256; i++) if (oklabDistance(rendered[i], ramp[i]) > bound) n++;
  return n;
};

/** Convenience: max + mean OKLab ΔE of a fitted config vs the target ramp. Compared as DISPLAY
 *  (sRGB) colour whatever the config's `colorSpace` — the target ramp is sRGB, and a seam config
 *  tagged `linear` used to be measured through the linear transform, which made its numbers
 *  meaningless (reported 2026-09-14; no caller passed one yet). */
export const measureFit = (config: GradientConfig, ramp: RGB[]): { maxDE: number; meanDE: number; stops: number } => {
  const rendered = renderGradientToRamp(config, 'srgb');
  let max = 0;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    const d = oklabDistance(rendered[i], ramp[i]);
    if (d > max) max = d;
    sum += d;
  }
  return { maxDE: max, meanDE: sum / 256, stops: config.stops.length };
};

/** Helper: convert a packed RGBA/RGB Uint8Array (256 texels) to RGB[256]. */
export const bufferToRamp = (buf: Uint8Array, stride = 4): RGB[] => {
  const out: RGB[] = new Array(256);
  for (let i = 0; i < 256; i++) out[i] = { r: buf[i * stride], g: buf[i * stride + 1], b: buf[i * stride + 2] };
  return out;
};

// re-export for harness convenience
export { rgbToOklab };
