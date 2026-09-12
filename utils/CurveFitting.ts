
import type { Keyframe, AnimationSequence } from '../types';
import { calculateConstrainedSmoothing } from './ConstrainedSmoothing';
import { nanoid } from 'nanoid';
import { AnimationMath } from '../engine/math/AnimationMath';

interface Point {
    t: number; // Absolute frame or normalized time depending on context
    val: number; // Value
}

// --- 0. Shared keyframe-fitting primitives -------------------------------------
// Used by the gradient channel-curve editor (rampToBezierTrack) AND the graph
// editors' Pencil tool, so the "sample → sparse Bezier keys" recipe lives once.

/** Douglas-Peucker on a (index, value) polyline → kept sample indices (incl. ends).
 *  Perpendicular distance is measured in index/value space; eps is in value units. */
export const dpIndices = (vals: number[], eps: number): number[] => {
    const n = vals.length;
    if (n <= 2) return vals.map((_, i) => i);
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
    const stack: [number, number][] = [[0, n - 1]];
    while (stack.length) {
        const [a, b] = stack.pop()!;
        if (b - a < 2) continue;
        const x0 = a, y0 = vals[a], x1 = b, y1 = vals[b];
        const dx = x1 - x0, dy = y1 - y0;
        const denom = Math.hypot(dx, dy) || 1;
        let worst = -1, worstD = eps;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs(dy * (i - x0) - dx * (vals[i] - y0)) / denom;
            if (d > worstD) { worstD = d; worst = i; }
        }
        if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
    }
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
    return out;
};

/** Recompute Auto (Catmull-Rom) tangents for the Bezier keyframes matched by `pred`
 *  (default: every key), leaving Step/Linear and hand-broken (`autoTangent === false`)
 *  keys untouched. Shared by the curve fit, add-key, Bias and Pencil so the
 *  "smooth out of the box" convention lives in one place. Expects `keys` sorted by frame. */
export const reTangentBezier = (
    keys: Keyframe[],
    pred?: (k: Keyframe, i: number) => boolean,
): Keyframe[] =>
    keys.map((k, n) => {
        if (k.interpolation !== 'Bezier' || k.autoTangent === false) return k;
        if (pred && !pred(k, n)) return k;
        const prev = n > 0 ? keys[n - 1] : undefined;
        const next = n < keys.length - 1 ? keys[n + 1] : undefined;
        const { l, r } = AnimationMath.calculateTangents(k, prev, next, 'Auto');
        return { ...k, leftTangent: l, rightTangent: r, tangentMode: 'Aligned' as const, autoTangent: true };
    });

/**
 * How long a FITTED tangent's time arm is, as a fraction of its span.
 *
 * Exactly 1/3, not the 0.333 `AnimationMath.TANGENT_WEIGHT` uses for authoring, and the
 * difference is load-bearing rather than cosmetic. The evaluator solves for the Bezier
 * parameter from the x (time) component (`AnimationMath.solveBezierY`), so the stored curve
 * only reproduces the cubic that was FITTED if x is linear in that parameter. With both arms
 * at exactly d/3 the x-component collapses:
 *
 *     x(s) = 3(1-s)²s·(d/3) + 3(1-s)s²·(2d/3) + s³·d = d·[s(1-s²) + s³] = d·s
 *
 * so parameter == normalised time, and least squares solved in normalised time is what gets
 * sampled back. At 0.333 that cancellation is off by ~1e-3 and the evaluator reparameterises
 * the curve slightly away from the fit.
 *
 * @invariant A channel that IS a cubic is reproduced to within 1e-9 by a two-key fitted
 *   Bezier — proven by: `npm run test:palette-channelcurve` section [4] ("a cubic channel
 *   round-trips exactly"). Falsified by setting this to 0.333: that assertion goes red.
 */
export const FIT_TANGENT_WEIGHT = 1 / 3;

/**
 * Reusable `Point[]` per span LENGTH, refilled rather than rebuilt.
 *
 * `solveLeastSquaresHandles` reads a `Point[]`, and `optimalKnotIndices` calls into it once
 * per probe — tens of thousands of times for one channel. Since `t` depends only on the
 * length, a pooled array for that length already carries the right `t`s and only `val` needs
 * writing.
 *
 * Worth less than it looks, and recorded so nobody re-derives it: pooling took the worst
 * 3-channel fit from 3.44 ms p95 to 2.93 and the drag frame from 2.11 ms to 1.90. The
 * remaining cost is the PROBE COUNT, not allocation — the search asks `lsqSpanFit` about many
 * more spans than a DP pass looks at, and each answer is three passes over the span.
 *
 * Safe to share: the solver only reads, and nothing here is re-entrant or async. Bounded by
 * the sample count (≤256 lengths), so the pool cannot grow without limit.
 */
const spanPool = new Map<number, Point[]>();
const spanScratch = (n: number): Point[] => {
    let pts = spanPool.get(n);
    if (!pts) {
        pts = new Array(n + 1);
        for (let x = 0; x <= n; x++) pts[x] = { t: x / n, val: 0 };
        spanPool.set(n, pts);
    }
    return pts;
};

/**
 * Least-squares cubic control VALUES for `samples[i..j]`, endpoints pinned to the samples —
 * or the STRAIGHT-LINE controls when those fit the span better in the worst case.
 *
 * The solver is `solveLeastSquaresHandles`, the same 2x2 normal equations `simplifyTrack` has
 * always used, so there is ONE solver in this file rather than two. Degenerate spans (flat,
 * or a singular system) fall back to the straight line, which is exactly what a Linear
 * segment draws.
 *
 * Why the worst-case comparison at the end. Least squares minimises the SUM OF SQUARES over
 * the span, and callers here test a MAXIMUM against a tolerance — those are different
 * objectives, and on a minority of spans the curve that wins on total error loses on the
 * worst sample. Measured over 52 real palette L channels at four tolerances: 4 spans of 208
 * came out worse than their own chord, by up to 1.4x. Keeping whichever is better costs one
 * extra pass over a span the solver has already walked twice, and buys a guarantee that the
 * caller can actually use — see `fitKeysToSamples`.
 */
export const lsqSpanFit = (samples: number[], i: number, j: number): { p1: number; p2: number; worst: number } => {
    const v0 = samples[i], v3 = samples[j];
    const n = j - i;
    const straight = { p1: v0 + (v3 - v0) / 3, p2: v0 + ((v3 - v0) * 2) / 3 };
    if (n < 2) return { ...straight, worst: 0 };
    const worstOf = (p1: number, p2: number): number => {
        let m = 0;
        for (let x = 1; x < n; x++) {
            const d = Math.abs(evaluateBezier1D(x / n, v0, p1, p2, v3) - samples[i + x]);
            if (d > m) m = d;
        }
        return m;
    };
    const pts = spanScratch(n);
    for (let x = 0; x <= n; x++) pts[x].val = samples[i + x];
    const r = solveLeastSquaresHandles(pts, v0, v3);
    if (!r) return { ...straight, worst: worstOf(straight.p1, straight.p2) };
    const wf = worstOf(r.h1, r.h2);
    const ws = worstOf(straight.p1, straight.p2);
    return wf <= ws ? { p1: r.h1, p2: r.h2, worst: wf } : { ...straight, worst: ws };
};

/** The controls alone, for callers that do not need the error. See {@link lsqSpanFit}. */
export const lsqSpanControls = (samples: number[], i: number, j: number): { p1: number; p2: number } => {
    const { p1, p2 } = lsqSpanFit(samples, i, j);
    return { p1, p2 };
};

/**
 * Knot indices for the FEWEST fitted-Bezier keys that hold `eps` over every sample — the
 * replacement for `dpIndices` on the fitting path.
 *
 * Douglas-Peucker measures each sample's distance from the CHORD — and perpendicularly, in
 * mixed (index, value) units — so it places knots for a polyline and then something else
 * stores a curve. Asking the question the fit actually cares about ("can one cubic cover this
 * span within eps, vertically?") needs fewer knots AND makes eps mean something. Measured two
 * ways, because they answer different questions: over 52 real palette channels at four
 * tolerances, 3511 keys against Douglas-Peucker's 8432 at the SAME eps (58% fewer, fewer on
 * 190 of 208 channel-tolerance pairs); over the 25 built-in presets matched at equal
 * PERCEPTUAL error (OKLab ΔE 0.02), 16.3 keys per gradient → 13.4 (18% fewer). The first is
 * the like-for-like tolerance comparison, the second is what a user would notice.
 *
 * Feasibility goes through {@link lsqSpanFit}, the same call that later produces the stored
 * tangents. That is deliberate and not merely tidy: a separate, faster feasibility test would
 * let the search accept a span the tangent solver then fits differently, and the eps
 * guarantee below would be about a curve nobody stores.
 *
 * WHAT IT COSTS, measured on the shipped code rather than on a prototype. 10-28x the
 * Douglas-Peucker placement: 0.3-0.95 ms for a 3-channel fit of a real palette, 2.9 ms p95
 * on a white-noise worst case, against 0.02-0.13 ms for `dpIndices`. The Curves face runs two
 * fits per Detail-drag frame, so ~1.9 ms of a 16.7 ms budget — comfortable on a desktop,
 * which is why `curveFitPref` defaults a phone to the cheap placement instead. A prototype
 * using per-span-length basis tables ran 10x faster still; it is not what shipped, because it
 * needed its own copy of the normal equations and could therefore accept spans the tangent
 * solver disagreed with.
 *
 * WHY IT GALLOPS, AND WHY THERE IS A WINDOW. Scanning every span from every start is O(n^3)
 * on smooth data — every long span is feasible, so nothing terminates early. Measured: 24-45
 * ms per 3-channel fit, on a path that runs twice per Detail-drag frame. Galloping (2, 4,
 * 8 … then bisect) finds the reach in ~log(n) probes instead.
 *
 * The window is the correction to a wrong assumption, kept because the wrongness is not
 * obvious: feasibility is NOT prefix-closed. A span can fail while a LONGER one from the same
 * start succeeds, because adding samples changes the least-squares solution. Stopping at the
 * first failure therefore OVERSHOOTS the key count badly — measured on white noise, 619 keys
 * against 241, and 46 against 39 on a busy preset. Scanning `window` past the first failure
 * recovers them; 8 was already enough on both, and the default leaves margin.
 *
 * Not exhaustive, and the residual is stated rather than hidden: taking the farthest feasible
 * span is only optimal while "keys remaining" is non-increasing in the start index, which
 * real channels violate occasionally. Against a reference that tests every span it lands
 * within 0-19% on the corpus measured (worst: a 16-band ramp), while costing ~1/200th of it.
 *
 * @invariant Every stored span is within `eps` of every sample it covers — by construction,
 *   since a span is only accepted when `lsqSpanFit().worst <= eps` and that is the same fit
 *   `fitKeysToSamples` stores. This is strictly stronger than the Douglas-Peucker path, whose
 *   eps bounds a chord. Proven by: `npm run test:palette-channelcurve` section [5] ("optimal
 *   placement holds eps on every channel"). Falsified by raising the accept test to
 *   `eps * 1.5`: that assertion goes red across the corpus.
 */
export const optimalKnotIndices = (samples: number[], eps: number, window = 16): number[] => {
    const n = samples.length;
    if (n <= 2) return samples.map((_, i) => i);
    const fits = (i: number, j: number) => lsqSpanFit(samples, i, j).worst <= eps;
    const out: number[] = [0];
    let i = 0;
    while (i < n - 1) {
        if (fits(i, n - 1)) { out.push(n - 1); break; }
        let best = i + 1;                      // adjacent is always within eps (no interior)
        let firstFail = n - 1;
        for (let step = 2; i + step <= n - 1; step *= 2) {
            if (fits(i, i + step)) best = i + step;
            else { firstFail = i + step; break; }
        }
        const top = Math.min(n - 1, firstFail + window);
        for (let j = top; j > best; j--) if (fits(i, j)) { best = j; break; }
        out.push(best);
        i = best;
    }
    return out;
};

/**
 * Sparse Bezier keys whose tangents are FITTED to the samples they span, rather than
 * derived from their neighbours' key values.
 *
 * Why this exists. `reTangentBezier`'s Catmull-Rom tangents only see the adjacent KEY
 * VALUES — never the samples in between — and Douglas-Peucker's `eps` bounds the error of
 * the POLYLINE, not of the Bezier that actually gets stored (`rampToSteppedTrack` says so
 * out loud and keeps its gap keys Linear to dodge it). So nothing bounded the result.
 * Measured 2026-09-12 on a plain black→white gradient: the lightness channel came back
 * **0.141 low** at mid-ramp, rendering #474747 as #232323.
 *
 * The cause is `AnimationMath.calculateTangents`'s monotonicity guard, which flattens a
 * key's arms when `m1 * m2 <= 0`. An 8-bit channel is a STAIRCASE, so one side of every key
 * is exactly flat, the product is zero, and every key gets flat arms — on that gradient, 7
 * of 7. A flat arm on the key at texel 23 then governs the whole 232-texel span to white, so
 * the curve leaves horizontally and sags far below the data.
 *
 * That guard is a good AUTHORING default (ease out of a hold). It is the wrong FITTING
 * default, which is the whole distinction this function draws.
 *
 * `autoTangent: false` marks the arms hand-set so `reTangentBezier` leaves them alone —
 * without it any later re-tangent pass (add-key, the pencil's seam heal) wipes the fit.
 * `brokenTangents` stays false even though the two arms at a knot are independently fitted:
 * the flag only governs DRAG behaviour, and a fitted curve that drags like every other
 * keyframe beats one that does not. `simplifyTrack` has always done the same with its own
 * least-squares handles.
 *
 * WHAT `eps` STILL DOES NOT PROMISE HERE. It is tempting to conclude that keeping the better
 * of curve and chord makes `eps` a bound, since Douglas-Peucker bounded the chord. It does
 * not, because `dpIndices` measures the PERPENDICULAR distance in mixed (index, value) units
 * — `|dy·(i-x0) - dx·(v-y0)| / hypot(dx, dy)` — and on a steep span that is smaller than the
 * vertical error a caller actually cares about. Measured over 52 palette channels at four
 * tolerances: 1 span of 8432 exceeds eps, by 1.01x. Small, but a bound with exceptions is not
 * a bound. `optimalKnotIndices` is the placement that does promise it, because it accepts a
 * span on the vertical error of the fit itself.
 *
 * @invariant Curving a segment never fits worse than the straight line it replaces, per span
 *   and therefore overall — `lsqSpanControls` keeps the chord whenever the least-squares
 *   cubic loses on worst-case error. Proven by: `npm run test:palette-channelcurve` section
 *   [4] ("a fitted Bezier never fits worse than the Linear DP fit"), over 52 real palette
 *   channels at four tolerances. Falsified TWO ways, which is what pins it: returning
 *   `reTangentBezier(keys)` from here reds it on 183 of those 208 (worst 14.1x, and the
 *   black→white case back at exactly its measured 0.1410), and dropping the worst-case
 *   comparison in `lsqSpanControls` reds it on 4 of 208 — the smaller falsification is the
 *   one that found the comparison was needed at all.
 */
export const fitKeysToSamples = (
    samples: number[],
    idx: number[],
    frameOf: (sampleIndex: number) => number,
    idPrefix: string,
): Keyframe[] => {
    const keys: Keyframe[] = idx.map((i, n) => ({
        id: `${idPrefix}-k${n}`,
        frame: frameOf(i),
        value: samples[i],
        interpolation: 'Bezier' as const,
        autoTangent: false,
        brokenTangents: false,
        // placeholders; the interior arms are solved below and the two outward ones mirrored
        leftTangent: { x: -1, y: 0 },
        rightTangent: { x: 1, y: 0 },
    }));
    for (let n = 0; n < idx.length - 1; n++) {
        const { p1, p2 } = lsqSpanControls(samples, idx[n], idx[n + 1]);
        const arm = (keys[n + 1].frame - keys[n].frame) * FIT_TANGENT_WEIGHT;
        keys[n].rightTangent = { x: arm, y: p1 - keys[n].value };
        keys[n + 1].leftTangent = { x: -arm, y: p2 - keys[n + 1].value };
    }
    /**
     * THE OUTWARD ARMS ARE MIRRORED, NOT FLAT — and this is the seam, not a detail.
     *
     * A span fit for `spliceSpan` (the Pencil, the smoothing brush, the wave) has real curve
     * on the far side of both ends, and the segment joining them is governed by the kept key's
     * arm and THIS key's outward arm. Left flat at `{x:-1,y:0}` that segment arrives dead
     * level into a key the fitted curve leaves at a slope, which is a corner — owner,
     * 2026-09-12: "the smoothing brush causes sharp edges at its extremities". Measured on an
     * 11-key track: the seam's second difference was 4.4e-2 against a typical 9.1e-5, 477x.
     *
     * `spliceSpan`'s heal cannot reach it: these keys are `autoTangent: false` (they must be,
     * or a re-tangent pass would wipe the fit), and `reTangentBezier` skips those by contract.
     * So the fit has to hand back arms that are already joinable, and mirroring the inward one
     * is exactly that — same slope through the key, so the join is smooth whatever the
     * neighbour turns out to be.
     *
     * On a FULL-channel fit these two arms point off the end of the curve where nothing
     * samples them, so this costs that path nothing.
     */
    if (keys.length >= 2) {
        const first = keys[0].rightTangent!;
        const last = keys[keys.length - 1].leftTangent!;
        keys[0].leftTangent = { x: -first.x, y: -first.y };
        keys[keys.length - 1].rightTangent = { x: -last.x, y: -last.y };
    }
    return keys;
};

/**
 * Splice a run of new keys into a track across [lo, hi] ONLY, keeping every key outside
 * that span, and HEAL THE SEAM. Shared by every span-local edit — the Pencil's stroke,
 * the smoothing brush (`smoothSpan`, below) and the wave filter's stamp — because the
 * heal is the part that is easy to forget and impossible to notice until it bites.
 *
 * Why the heal. The span's keys were fit in isolation, so its boundary keys carry flat
 * stub handles (prev/next were undefined during the fit), and the kept keys flanking the
 * span still carry handles sized for their OLD neighbours inside the now-removed span.
 * Both extend far past the new, much closer boundary key and bow the curve into a big loop
 * on either side of the edit. Re-tangenting against the real neighbours in the merged line
 * is the fix; `reTangentBezier` leaves hand-broken handles alone, so a user's own tangents
 * survive it.
 *
 * `seamOnly` (default true) re-tangents just the four seam keys — right for span keys that
 * arrived already auto-tangented (`fitSamplesToKeys`). Pass false when the span keys came
 * straight from Douglas-Peucker with no tangents at all, so the whole span needs them.
 *
 * Returns null rather than a one-key track: a Track with fewer than two keys has no curve
 * to evaluate, and every caller's right move on that is to leave the track alone.
 *
 * @invariant Every key outside [lo, hi] survives verbatim and every key inside it is replaced
 *   — proven by: `npm run test:palette-wavegen` section [6] ("every key outside the span
 *   survives", "the key that was inside the span is gone"). Falsified 2026-09-12 by making
 *   `kept` the whole key list: three assertions went red, including the <2-key refusals,
 *   which is the shape of the bug — a span edit that keeps what it replaced leaves two keys
 *   at the same frame and the evaluator walks the wrong one.
 *
 * @invariant No segment touching the seam doubles back in time — the graph strokes each
 *   segment as a real cubic with these handles as control points, so an arm that overreaches
 *   draws a literal loop. Held by keeping the two seam arms at a third of the gap each: with
 *   a + b <= 2d/3 < d the x control polygon is monotone, so no fold is representable. Proven
 *   by: `npm run test:palette-wavegen` section [9] ("no segment folds across 3 bases x 6
 *   spans"). Falsified 2026-09-12 two ways — dropping the two kept-key `reach` calls reds
 *   five assertions (worst x-derivative -5.2x the segment width, on the two-key ramp the
 *   owner reported); making them set instead of clamp reds the one that says a hand-dragged
 *   short arm survives.
 */
export const spliceSpan = (
    keys: Keyframe[],
    lo: number,
    hi: number,
    spanKeys: Keyframe[],
    seamOnly = true,
): Keyframe[] | null => {
    const kept = keys.filter((k) => k.frame < lo || k.frame > hi);
    const merged = [...kept, ...spanKeys].sort((a, b) => a.frame - b.frame);
    if (merged.length < 2) return null;
    const firstSpan = merged.findIndex((k) => k.frame >= lo);
    let lastSpan = firstSpan;
    while (lastSpan + 1 < merged.length && merged[lastSpan + 1].frame <= hi) lastSpan++;
    /**
     * The span's own boundary keys are `autoTangent: false` — they have to be, or a
     * re-tangent pass would wipe the fit — so `reTangentBezier` skips them by contract and
     * the heal below never reaches them. `fitKeysToSamples` mirrors their outward arm so the
     * SLOPE is continuous, but it sizes that arm from the segment INSIDE the span, and the
     * segment outside is usually far longer. Right angle, wrong reach: the curve leaves the
     * key correctly and then bends hard, which reads as the corner it effectively is
     * (measured 2026-09-12 on an 11-key track brushed over 96..160: second difference 3.7e-2
     * at the seam against 9.1e-5 typical — and mirroring alone only fixed the end whose
     * neighbour happened to be close).
     *
     * Scaling x and y together keeps the slope and only changes how far the arm reaches.
     *
     * THE KEPT KEYS' ARMS FACE THE SEAM TOO, and that is the half that folds the curve.
     * A kept key's inward arm was sized for the neighbour the splice just REMOVED, and the
     * new boundary key is usually much closer — so the arm reaches past it, the segment's
     * x-cubic doubles back, and `GraphRendererBuilder` strokes a literal loop (owner,
     * 2026-09-12: "sometimes sparse keys make it loop back upon itself"). Sparse keys are
     * where it shows because the arm is a third of a LONG segment: measured on a two-key
     * ramp (arms of 85 frames) spliced at frame 13, the x-derivative reached -5.2x the
     * segment width. It is not only sparse tracks — a 16-frame-spaced track folded at
     * -0.44x whenever a span boundary landed within ~5 frames of a kept key.
     *
     * `reTangentBezier` cannot reach these either: they are `autoTangent: false` after any
     * previous bake, and GX bakes after most every step, so in practice they all are.
     *
     * CLAMP, don't set. The span keys' outward arms are SET to d/3 because they arrive with
     * a placeholder that means nothing. A kept key's arm is real authored shape, so it is
     * only shortened when it overreaches — which is also what makes the result provable:
     * with the inward arm a <= d/3 and the span key's outward arm b == d/3, a + b <= 2d/3 < d,
     * so the control polygon is monotone in x and no fold is representable.
     */
    const reach = (i: number, side: 'leftTangent' | 'rightTangent', nbIdx: number, clampOnly = false) => {
        const k = merged[i];
        const nb = merged[nbIdx];
        if (!k || !nb || k.autoTangent !== false) return;
        const t = k[side];
        if (!t || !t.x) return;
        const want = Math.abs(nb.frame - k.frame) * FIT_TANGENT_WEIGHT;
        if (clampOnly && Math.abs(t.x) <= want) return;
        const s = want / Math.abs(t.x);
        merged[i] = { ...k, [side]: { x: t.x * s, y: t.y * s } };
    };
    reach(firstSpan, 'leftTangent', firstSpan - 1);
    reach(lastSpan, 'rightTangent', lastSpan + 1);
    reach(firstSpan - 1, 'rightTangent', firstSpan, true);
    reach(lastSpan + 1, 'leftTangent', lastSpan, true);
    return seamOnly
        ? reTangentBezier(merged, (_k, i) => i === firstSpan - 1 || i === firstSpan || i === lastSpan || i === lastSpan + 1)
        : reTangentBezier(merged, (_k, i) => i >= firstSpan - 1 && i <= lastSpan + 1);
};

/**
 * Fit a run of consecutive-integer-frame samples to sparse Bezier keys whose tangents are
 * SOLVED against those samples: Douglas-Peucker placement (eps in value units) then
 * `fitKeysToSamples`. `samples[i]` is the value at frame `startFrame + i`. Used by the
 * Pencil's drawn span and the wave stamp.
 *
 * It used to finish with `reTangentBezier`, whose Catmull-Rom tangents read only the
 * neighbouring KEY VALUES — so a drawn stroke was placed by its samples and then shaped by
 * something that had not looked at them. Fitting closes that gap and is what both tools
 * already claim to do; see `fitKeysToSamples` for the failure it removes.
 *
 * The keys come back marked `autoTangent: false`, so `spliceSpan`'s seam heal re-tangents
 * the KEPT keys either side and leaves the fitted span alone — which is the point, and why
 * `spliceSpan`'s `seamOnly` argument no longer changes anything for these keys.
 */
/**
 * The SMOOTHING BRUSH (Gradient Explorer v2, Phase C.12 — owner: "a localised bake + smooth +
 * simplify of the functions we already have"; second cut, same evening: "soften
 * incrementally … local keyframe baking before applying our elastic smooth"). Over the frames
 * [lo, hi] only:
 *   1. BAKE — the track is sampled from its current keys into dense keys, one every `stride`
 *      frames (so a hold, a spline and a hand-drawn stroke all become the same clay);
 *   2. SMOOTH — the elastic smooth the graph tools use (calculateConstrainedSmoothing: an
 *      implicit heat equation anchored to the unbrushed keys either side) at `strength` —
 *      one stroke softens a little, the next softens further, since each stroke works from
 *      the track as it now is;
 *   3. SIMPLIFY — Douglas-Peucker at a TIGHT tolerance (eps / 3) into Bezier keys whose
 *      tangents are FITTED to the smoothed samples (`fitKeysToSamples`), so the result stays
 *      as round as the smooth made it. Catmull-Rom tangents could not promise that: they read
 *      the neighbouring key values and not the smoothed run between them, which is precisely
 *      the roundness this step exists to keep.
 * Every key outside the span is kept; the seam keys are re-tangented (the pencil's heal).
 * Returns the merged key list, or null when the span is too short to touch.
 */
export const smoothSpan = (
    keys: Keyframe[],
    lo: number,
    hi: number,
    eps: number,
    strength: number,
    idPrefix: string,
    sample: (keys: Keyframe[], frame: number) => number,
    stride = 2,
): Keyframe[] | null => {
    lo = Math.round(lo); hi = Math.round(hi);
    if (hi - lo < 2 * stride) return null;
    // 1. bake the span
    const baked: Keyframe[] = [];
    for (let f = lo; f <= hi; f += stride) baked.push({ id: `${idPrefix}-b${f}`, frame: f, value: sample(keys, f), interpolation: 'Linear' });
    if (baked[baked.length - 1].frame !== hi) baked.push({ id: `${idPrefix}-b${hi}`, frame: hi, value: sample(keys, hi), interpolation: 'Linear' });
    const kept = keys.filter((k) => k.frame < lo || k.frame > hi);
    const dense = [...kept, ...baked].sort((a, b) => a.frame - b.frame);
    // 2. the elastic smooth over the baked keys, anchored to the kept ones
    const tid = 't';
    const updates = calculateConstrainedSmoothing(
        [tid],
        { tracks: { [tid]: { id: tid, type: 'float', label: '', keyframes: dense } } } as unknown as AnimationSequence,
        baked.map((k) => `${tid}::${k.id}`),
        strength,
    );
    const patched = new Map(updates.map((u) => [u.keyId, u.patch.value]));
    const smoothed = baked.map((k) => ({ ...k, value: patched.get(k.id) ?? k.value }));
    // 3. simplify the span, tightly, into round keys
    const vals = smoothed.map((k) => k.value);
    const spanKeys = fitKeysToSamples(vals, dpIndices(vals, eps / 3), (i) => smoothed[i].frame, idPrefix);
    // seamOnly=true: the span keys arrive already FITTED and marked `autoTangent: false`, so
    // only the kept keys flanking the span need the heal. (It was false while these came out
    // of Douglas-Peucker with no tangents at all; `reTangentBezier` would now skip them
    // either way, and asking for the narrow heal says why.)
    return spliceSpan(keys, lo, hi, spanKeys, true);
};

export const fitSamplesToKeys = (
    samples: number[],
    startFrame: number,
    eps: number,
    idPrefix: string,
): Keyframe[] => fitKeysToSamples(samples, dpIndices(samples, eps), (i) => startFrame + i, idPrefix);

// --- 1. Fast Bezier Evaluation ---
function evaluateBezier1D(t: number, p0: number, p1: number, p2: number, p3: number) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return (uuu * p0) + (3 * uu * t * p1) + (3 * u * tt * p2) + (ttt * p3);
}

// --- 2. Robust Evaluation & Resampling ---

// Evaluates the current curve at a specific frame (handling existing tangents)
function evaluateCurrentCurve(frame: number, sortedKeys: Keyframe[]): number {
    // Find segment
    let startK = sortedKeys[0];
    let endK = sortedKeys[sortedKeys.length - 1];

    for (let i = 0; i < sortedKeys.length - 1; i++) {
        if (frame >= sortedKeys[i].frame && frame < sortedKeys[i+1].frame) {
            startK = sortedKeys[i];
            endK = sortedKeys[i+1];
            break;
        }
    }
    
    // If frame is exactly on end (or beyond last key), clamp
    if (frame >= endK.frame) return endK.value;
    if (frame <= startK.frame) return startK.value;

    // Calculate t (0..1) for this segment
    const duration = endK.frame - startK.frame;
    const t = (frame - startK.frame) / duration;

    // Handle Interpolation Modes
    if (startK.interpolation === 'Step') return startK.value;
    if (startK.interpolation === 'Linear') return startK.value + (endK.value - startK.value) * t;

    // Bezier
    const p0 = startK.value;
    // Default handles to 0 (flat) if missing, though ideally they exist for Bezier
    const p1 = startK.value + (startK.rightTangent ? startK.rightTangent.y : 0);
    const p2 = endK.value + (endK.leftTangent ? endK.leftTangent.y : 0);
    const p3 = endK.value;

    return evaluateBezier1D(t, p0, p1, p2, p3);
}

// Generates a dense list of points from the current curve
function getResampledPoints(sortedKeys: Keyframe[], step: number = 1): Point[] {
    const points: Point[] = [];
    const startFrame = sortedKeys[0].frame;
    const endFrame = sortedKeys[sortedKeys.length - 1].frame;

    // Ensure at least some samples even for very short clips
    const actualStep = Math.max(step, (endFrame - startFrame) / 50);

    for (let f = startFrame; f <= endFrame; f += actualStep) {
        points.push({
            t: f, // We use absolute frame here, normalized later per segment
            val: evaluateCurrentCurve(f, sortedKeys)
        });
    }
    // Ensure the very last point is included
    if (points.length > 0 && points[points.length-1].t < endFrame) {
        points.push({ t: endFrame, val: evaluateCurrentCurve(endFrame, sortedKeys) });
    }

    return points;
}

// --- 3. Analytic Least Squares Solver (with Safety) ---
function solveLeastSquaresHandles(points: Point[], p0: number, p3: number): { h1: number, h2: number } | null {
    let C11 = 0, C12 = 0, C22 = 0; 
    let R1 = 0, R2 = 0;           

    // Safety Check: Variance detection
    let sumVal = 0;
    let sumValSq = 0;
    
    for (let i = 0; i < points.length; i++) {
        const t = points[i].t;
        const u = 1 - t;
        const val = points[i].val;
        
        sumVal += val;
        sumValSq += val * val;

        // Basis functions (derivatives of Bezier with respect to P1 and P2)
        // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t)t^2 P2 + t^3 P3
        // We want to find P1 and P2.
        // Coeff for P1: 3 * (1-t)^2 * t
        // Coeff for P2: 3 * (1-t) * t^2
        
        const b1 = 3 * u * u * t;
        const b2 = 3 * u * t * t;
        const fixedTerm = (u * u * u * p0) + (t * t * t * p3);
        const target = val - fixedTerm;

        C11 += b1 * b1;
        C12 += b1 * b2;
        C22 += b2 * b2;
        R1 += target * b1;
        R2 += target * b2;
    }

    // Check variance: if variance is extremely low, treat as linear
    const n = points.length;
    const mean = sumVal / n;
    const variance = (sumValSq / n) - (mean * mean);
    
    // Threshold depends on value range, but generally if variance is tiny, don't curve.
    if (variance < 1e-9) {
        return null; // Signal to use Linear Handles
    }

    // Solve 2x2
    const det = C11 * C22 - C12 * C12;

    // If determinant is near zero (singular matrix), return linear handles
    if (Math.abs(det) < 1e-9) {
        return null; 
    }

    const h1 = (C22 * R1 - C12 * R2) / det;
    const h2 = (C11 * R2 - C12 * R1) / det;

    return { h1, h2 };
}

// --- 4. Segment Fitting ---
function fitSegment(
    segmentPoints: Point[], // These are now resampled points with normalized t [0..1]
    fitStrength: number
): { leftY: number, rightY: number } {
    const n = segmentPoints.length;
    if (n < 2) {
        const v = segmentPoints[0].val;
        return { leftY: v, rightY: v };
    }

    const startVal = segmentPoints[0].val;
    const endVal = segmentPoints[n - 1].val;

    // 1. Calculate Linear Handles (The Safe Default)
    // Bezier control points for a straight line are at 1/3 and 2/3 of value diff
    const diff = endVal - startVal;
    const linearH1 = startVal + diff * 0.333;
    const linearH2 = startVal + diff * 0.666;

    // 2. Calculate Best-Fit Handles (The Tight Fit)
    const lsResult = solveLeastSquaresHandles(segmentPoints, startVal, endVal);
    
    let lsH1 = linearH1;
    let lsH2 = linearH2;

    if (lsResult) {
        lsH1 = lsResult.h1;
        lsH2 = lsResult.h2;
    }

    // 3. Blend
    const finalH1 = linearH1 + (lsH1 - linearH1) * fitStrength;
    const finalH2 = linearH2 + (lsH2 - linearH2) * fitStrength;

    return { leftY: finalH1, rightY: finalH2 };
}

// --- 5. Recursive Simplification ---
function simplifyRecursive(
    points: Point[], // Resampled dense points (t is absolute frame)
    resultKeys: Keyframe[],
    errorThreshold: number,
    fitStrength: number
) {
    if (points.length < 2) return;

    const startPt = points[0];
    const endPt = points[points.length - 1];
    const duration = endPt.t - startPt.t;
    
    // Prepare normalized points for solver
    const normPoints = points.map(p => ({
        t: (p.t - startPt.t) / duration,
        val: p.val
    }));

    // Try fit
    const { leftY, rightY } = fitSegment(normPoints, fitStrength);
    
    // Calculate Max Deviation
    let maxDev = 0;
    let splitIndex = -1;
    
    // Optimization: If segment is very small, just accept it
    if (duration < 1.0) {
        maxDev = 0;
    } else {
        for (let i = 1; i < normPoints.length - 1; i++) {
            const t = normPoints[i].t;
            const est = evaluateBezier1D(t, startPt.val, leftY, rightY, endPt.val);
            const dev = Math.abs(est - normPoints[i].val);
            
            if (dev > maxDev) {
                maxDev = dev;
                splitIndex = i;
            }
        }
    }

    if (maxDev <= errorThreshold || points.length <= 2) {
        // Accepted
        
        const prevKey = resultKeys[resultKeys.length - 1];
        
        // Update previous key's right tangent
        // Handles are relative: x is time delta, y is value delta
        if (prevKey) {
            prevKey.rightTangent = { x: duration * 0.333, y: leftY - startPt.val };
        }

        const newKey: Keyframe = {
            id: nanoid(),
            frame: endPt.t,
            value: endPt.val,
            interpolation: 'Bezier',
            brokenTangents: false,
            autoTangent: false,
            leftTangent: { x: -duration * 0.333, y: rightY - endPt.val },
            rightTangent: { x: 1, y: 0 } // Placeholder
        };
        resultKeys.push(newKey);
    } else {
        // Split
        const leftPts = points.slice(0, splitIndex + 1);
        const rightPts = points.slice(splitIndex);
        
        simplifyRecursive(leftPts, resultKeys, errorThreshold, fitStrength);
        simplifyRecursive(rightPts, resultKeys, errorThreshold, fitStrength);
    }
}

// --- 6. Public API ---
export const simplifyTrack = (
    originalKeys: Keyframe[], 
    errorThreshold: number,
    fitStrength: number = 1.0
): Keyframe[] => {
    if (originalKeys.length < 2) return originalKeys;
    fitStrength = Math.max(0, Math.min(1, fitStrength));

    // 1. Sort
    const sorted = [...originalKeys].sort((a, b) => a.frame - b.frame);
    
    // 2. RESAMPLE
    // Convert sparse curve to dense point cloud
    const densePoints = getResampledPoints(sorted, 1.0); // Sample every 1 frame

    const finalKeys: Keyframe[] = [];

    // Push Start Key
    const firstP = densePoints[0];
    finalKeys.push({
        id: nanoid(),
        frame: firstP.t,
        value: firstP.val,
        interpolation: 'Bezier',
        brokenTangents: false,
        autoTangent: false,
        leftTangent: { x: -1, y: 0 },
        rightTangent: { x: 1, y: 0 }
    });

    // 3. Recurse
    simplifyRecursive(densePoints, finalKeys, errorThreshold, fitStrength);

    // 4. Fix Boundaries
    if (finalKeys.length > 0) {
        finalKeys[0].leftTangent = { x: -1, y: 0 }; 
        finalKeys[finalKeys.length - 1].rightTangent = { x: 1, y: 0 };
    }

    return finalKeys;
};
