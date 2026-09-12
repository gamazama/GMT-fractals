/**
 * Channel-curve bridge harness — verifies rampToTrack / trackToRamp round-trip on
 * real palette channels, reusing the engine's own evaluateTrackValue for sampling.
 *
 *   • round-trip fidelity: ramp → Track → ramp stays within the DP tolerance
 *   • the dial works: smaller eps ⇒ lower error ⇒ more keyframes (monotonic)
 *
 * Run: npx tsx debug/test-palette-channelcurve.mts
 */

import fs from 'fs';
import path from 'path';
import { rampToTrack, rampToBezierTrack, trackToRamp, flatRuns, rampToSteppedTrack } from '../palette/core/channelCurve';
import { smoothSpan } from '../utils/CurveFitting';
import { evaluateTrackValue } from '../utils/timelineUtils';
import { rgbToOklab, type RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

const loadMap = (p: string): RGB[] => {
  const rows: number[][] = [];
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.trim().split(/\s+/);
    if (m.length < 3) continue;
    const r = +m[0], g = +m[1], b = +m[2];
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) rows.push([r, g, b]);
  }
  const ramp: RGB[] = [];
  if (rows.length === 256) return rows.map(([r, g, b]) => ({ r, g, b }));
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (rows.length - 1);
    const a = Math.floor(t), bb = Math.min(rows.length - 1, a + 1), f = t - a;
    ramp.push({
      r: Math.round(rows[a][0] * (1 - f) + rows[bb][0] * f),
      g: Math.round(rows[a][1] * (1 - f) + rows[bb][1] * f),
      b: Math.round(rows[a][2] * (1 - f) + rows[bb][2] * f),
    });
  }
  return ramp;
};

const PAL_DIRS = ['H:/GMT/workspace-gmt/Palettes', 'H:/GMT/stuff/palette-lab/bundles/cptcity'];
let files: string[] = [];
for (const dir of PAL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const fl = fs.readdirSync(dir).filter((f) => /\.map$/i.test(f));
  const stride = Math.max(1, Math.floor(fl.length / 25));
  for (let i = 0; i < fl.length; i += stride) files.push(path.join(dir, fl[i]));
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`Channel-curve bridge: round-trip on ${files.length} real palettes (L channel, 0..1)`);
if (files.length === 0) {
  console.log('  (no .map palettes found — skipping)');
} else {
  // L channels of all sampled palettes.
  const Ls = files.map((f) => loadMap(f).map((c) => rgbToOklab(c).L));

  const measure = (eps: number) => {
    const errs: number[] = [], maxes: number[] = [], counts: number[] = [];
    for (const L of Ls) {
      const track = rampToTrack(L, 'L', 'Lightness', { eps, interpolation: 'Linear' });
      const back = trackToRamp(track, 256);
      let sum = 0, mx = 0;
      for (let i = 0; i < 256; i++) {
        const e = Math.abs(back[i] - L[i]);
        sum += e;
        if (e > mx) mx = e;
      }
      errs.push(sum / 256);
      maxes.push(mx);
      counts.push(track.keyframes.length);
    }
    return { mean: avg(errs), max: avg(maxes), keys: avg(counts) };
  };

  const epses = [0.04, 0.02, 0.01, 0.005];
  const rows = epses.map((e) => ({ e, ...measure(e) }));
  for (const r of rows) {
    console.log(`  eps ${r.e.toFixed(3)} → mean ${r.mean.toFixed(4)} | max ${r.max.toFixed(4)} | avg keys ${r.keys.toFixed(1)}`);
  }

  // DP guarantees max error ≤ eps (Linear interp); check it holds.
  for (const r of rows) ok(r.max <= r.e + 1e-6, `eps ${r.e}: max err ${r.max.toFixed(4)} should be ≤ eps`);
  // Dial: smaller eps ⇒ lower mean error AND more keyframes.
  for (let i = 1; i < rows.length; i++) {
    ok(rows[i].mean <= rows[i - 1].mean, `mean err should not rise as eps shrinks (${rows[i - 1].e}→${rows[i].e})`);
    ok(rows[i].keys >= rows[i - 1].keys, `keyframe count should not fall as eps shrinks (${rows[i - 1].e}→${rows[i].e})`);
  }
}

// Stepped sources (C.4): a 4-band channel (64 samples each) fits to Step keys — one hold per
// band — and samples back EXACTLY, including the texel before each edge. A smooth ramp with
// one short flat patch is not banded: no runs, no Step keys. Falsified by making flatRuns
// return [] always: "4 bands → 4 Step keys" goes red; by dropping the final closing key in
// rampToSteppedTrack: the last band's tail no longer round-trips.
{
  const bands = [0.2, 0.7, 0.4, 0.9];
  const L = Array.from({ length: 256 }, (_, i) => bands[Math.min(3, i >> 6)]);
  const C = L.map((v) => v * 0.1);
  const h = L.map(() => 40);
  const runs = flatRuns([L, C, h]);
  ok(runs.length === 4 && runs[1].start === 64 && runs[1].end === 127, `4 bands → 4 runs (got ${runs.length})`);
  const track = rampToSteppedTrack(L, runs, 'L', 'Lightness', { eps: 0.01 });
  const steps = track.keyframes.filter((k) => k.interpolation === 'Step');
  ok(steps.length === 5, `4 bands → 4 Step keys + the closing key (got ${steps.length})`);
  const back = trackToRamp(track, 256);
  const worst = Math.max(...back.map((v, i) => Math.abs(v - L[i])));
  ok(worst < 1e-9, `a banded channel round-trips exactly through Step keys (worst ${worst.toExponential(2)})`);
  const smooth = Array.from({ length: 256 }, (_, i) => (i < 100 || i > 105 ? i / 255 : 100 / 255));
  ok(flatRuns([smooth, smooth, smooth]).length === 0, 'a smooth ramp with one flat patch is not banded');
  // a banded ramp with a smooth stretch between two bands: the bands hold, the stretch fits
  const mixed = Array.from({ length: 256 }, (_, i) => (i < 96 ? 0.2 : i < 160 ? 0.2 + ((i - 96) / 64) * 0.6 : 0.8));
  const mr = flatRuns([mixed, mixed, mixed]);
  ok(mr.length === 2, `two bands round a slope → 2 runs (got ${mr.length})`);
  const mt = rampToSteppedTrack(mixed, mr, 'L', 'Lightness', { eps: 0.005 });
  const mb = trackToRamp(mt, 256);
  const worstBand = Math.max(...mb.map((v, i) => (i < 96 || i >= 160 ? Math.abs(v - mixed[i]) : 0)));
  const worstSlope = Math.max(...mb.map((v, i) => (i >= 96 && i < 160 ? Math.abs(v - mixed[i]) : 0)));
  ok(worstBand < 1e-9, `the bands hold exactly (worst ${worstBand.toExponential(2)})`);
  ok(worstSlope < 0.03, `the slope between them is fitted (worst ${worstSlope.toFixed(4)})`);
  console.log(`  stepped: 4 bands → ${track.keyframes.length} keys (${steps.length} Step); mixed → ${mt.keyframes.length} keys, slope err ${worstSlope.toFixed(4)}`);
}

// [4] FITTED Bezier tangents (2026-09-12). `rampToBezierTrack` used to take its tangents from
// `reTangentBezier`'s Catmull-Rom pass, which reads only the neighbouring KEY VALUES and never
// the ~250 samples between them — while Douglas-Peucker's eps bounds the POLYLINE, not the
// bezier that gets stored. Nothing bounded the result: a plain black→white gradient baked back
// 0.141 low in lightness at mid-ramp. Tangents are solved against the samples now.
{
  console.log('\n[4] fitted Bezier tangents');
  const { rampToBezierTrack } = await import('../palette/core/channelCurve');
  const { fitKeysToSamples } = await import('../utils/CurveFitting');
  const { renderStopsToRamp } = await import('../utils/colorUtils');

  // (a) THE CLAIM THAT MATTERS: curving a segment must never fit worse than the straight line
  // DP actually bounded. Falsified by returning `reTangentBezier(keys)` from fitKeysToSamples:
  // this goes red across most of the corpus, worst case by ~20x.
  if (files.length) {
    const Ls = files.map((f) => loadMap(f).map((c) => rgbToOklab(c).L));
    let worstRatio = 0;
    let worstAt = '';
    let breaches = 0;
    for (const eps of [0.04, 0.02, 0.01, 0.005]) {
      for (let n = 0; n < Ls.length; n++) {
        const L = Ls[n];
        const lin = trackToRamp(rampToTrack(L, 'L', 'L', { eps, interpolation: 'Linear' }), 256);
        const bez = trackToRamp(rampToBezierTrack(L, 'L', 'L', { eps }), 256);
        const mx = (a: number[]) => Math.max(...a.map((v, i) => Math.abs(v - L[i])));
        const el = mx(lin), eb = mx(bez);
        if (eb > el + 1e-9) {
          breaches++;
          if (eb / Math.max(el, 1e-9) > worstRatio) { worstRatio = eb / Math.max(el, 1e-9); worstAt = `${path.basename(files[n])} @ eps ${eps}`; }
        }
      }
    }
    ok(breaches === 0, `a fitted Bezier never fits worse than the Linear DP fit (${breaches} breaches, worst ${worstRatio.toFixed(1)}x at ${worstAt})`);
    console.log(`  corpus: ${Ls.length} channels x 4 tolerances, ${breaches} breaches of the Linear bound`);
  }

  // (b) the measured regression itself: black→white, whose L channel is a straight line under
  // an 8-bit staircase. Every key's arms were flattened by the monotonicity guard (one side of
  // a staircase corner is exactly flat, so m1*m2 == 0), and a flat arm governing the 232-texel
  // span to white made the curve sag. Before: 0.141. Falsified by the same revert.
  const grey = renderStopsToRamp(
    [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#ffffff' }],
    'oklab', 'srgb',
  ).map((c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
  const greyL = grey.map((c) => rgbToOklab(c).L);
  const greyTrack = rampToBezierTrack(greyL, 'L', 'Lightness', { eps: 0.01 });
  const greyBack = trackToRamp(greyTrack, 256);
  const greyWorst = Math.max(...greyBack.map((v, i) => Math.abs(v - greyL[i])));
  ok(greyWorst < 0.02, `black→white lightness round-trips (worst ${greyWorst.toFixed(4)}; was 0.141 with auto-tangents)`);
  console.log(`  black→white: ${greyTrack.keyframes.length} keys, worst L error ${greyWorst.toFixed(4)}`);

  // (c) the parameterisation is exact, which is what FIT_TANGENT_WEIGHT = 1/3 buys: with both
  // arms at exactly a third of the span the evaluator's x-solve gives parameter == normalised
  // time, so the least-squares cubic is what gets sampled back. A channel that IS a cubic
  // therefore round-trips through TWO keys. Falsified by setting FIT_TANGENT_WEIGHT to the
  // authoring 0.333: the error rises off 1e-16 into 1e-4.
  const n = 256;
  const cubic = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return u * u * u * 0.1 + 3 * u * u * t * 0.9 + 3 * u * t * t * 0.2 + t * t * t * 0.8;
  });
  const twoKey = fitKeysToSamples(cubic, [0, n - 1], (i) => (i / (n - 1)) * 255, 'cu');
  const cubicBack = trackToRamp({ id: 'cu', type: 'float', label: 'cu', keyframes: twoKey }, 256);
  const cubicWorst = Math.max(...cubicBack.map((v, i) => Math.abs(v - cubic[i])));
  ok(twoKey.length === 2, `a cubic channel needs two keys (got ${twoKey.length})`);
  ok(cubicWorst < 1e-9, `a cubic channel round-trips exactly (worst ${cubicWorst.toExponential(2)})`);
  console.log(`  cubic channel: 2 keys, worst ${cubicWorst.toExponential(2)}`);
}

// [5] OPTIMAL knot placement (2026-09-12, step 2). Douglas-Peucker measures each sample
// against the CHORD, so its eps bounds a polyline while something else stores a curve.
// `optimalKnotIndices` accepts a span only when the very fit that will be STORED holds eps
// over it — which makes eps a real bound, and needs fewer keys for the same tolerance.
{
  console.log('\n[5] optimal knot placement');
  const { rampToBezierTrack } = await import('../palette/core/channelCurve');
  const { optimalKnotIndices, lsqSpanFit } = await import('../utils/CurveFitting');

  if (files.length) {
    const Ls = files.map((f) => loadMap(f).map((c) => rgbToOklab(c).L));
    let worstOver = 0;
    let breaches = 0;
    let dpKeys = 0;
    let optKeys = 0;
    let fewerOn = 0;
    for (const eps of [0.04, 0.02, 0.01, 0.005]) {
      for (const L of Ls) {
        const idx = optimalKnotIndices(L, eps);
        // the bound, measured on the spans the search actually chose
        for (let n = 0; n < idx.length - 1; n++) {
          const w = lsqSpanFit(L, idx[n], idx[n + 1]).worst;
          if (w > eps + 1e-12) { breaches++; worstOver = Math.max(worstOver, w / eps); }
        }
        const dp = rampToBezierTrack(L, 'L', 'L', { eps }).keyframes.length;
        const op = rampToBezierTrack(L, 'L', 'L', { eps, placement: 'optimal' }).keyframes.length;
        dpKeys += dp;
        optKeys += op;
        if (op < dp) fewerOn++;
      }
    }
    // Falsified by raising the accept test in optimalKnotIndices to `eps * 1.5`: red.
    ok(breaches === 0, `every chosen span holds eps (${breaches} breaches, worst ${worstOver.toFixed(2)}x over)`);
    // Falsified by returning dpIndices from optimalKnotIndices: the ratio goes to 1.00.
    ok(optKeys < dpKeys, `optimal placement needs fewer keys than Douglas-Peucker (${optKeys} vs ${dpKeys})`);
    console.log(`  corpus: ${optKeys} keys vs DP's ${dpKeys} (${((1 - optKeys / dpKeys) * 100).toFixed(0)}% fewer), fewer on ${fewerOn}/${Ls.length * 4} channel-tolerance pairs`);
  }

  // the placement option must not be able to make a BANDED source lose its holds: the gaps
  // between bands stay Linear, so cubic-feasible knots must never reach them.
  const banded = Array.from({ length: 256 }, (_, i) => [0.2, 0.7, 0.4, 0.9][Math.min(3, i >> 6)]);
  const runs = flatRuns([banded, banded, banded]);
  const st = rampToSteppedTrack(banded, runs, 'L', 'L', { eps: 0.01, placement: 'optimal' });
  const stBack = trackToRamp(st, 256);
  ok(Math.max(...stBack.map((v, i) => Math.abs(v - banded[i]))) < 1e-9, 'a banded source still round-trips exactly with placement: optimal');

  // and the default is unchanged, so nothing shifts for a caller that does not ask
  const probe = Array.from({ length: 256 }, (_, i) => Math.sin(i / 30) * 0.4 + 0.5);
  const a = rampToBezierTrack(probe, 'L', 'L', { eps: 0.01 });
  const b = rampToBezierTrack(probe, 'L', 'L', { eps: 0.01, placement: 'dp' });
  ok(a.keyframes.length === b.keyframes.length, 'placement defaults to dp');
}

// The smoothing brush (C.12): a jagged channel brushed over frames 96..160 gets smoother
// THERE (its second differences shrink) while the samples outside the span stay exactly as
// they were. Falsified by returning `keys` unchanged from smoothSpan: the first check goes
// red; by dropping the `kept` filter: the second.
{
  const jag = Array.from({ length: 256 }, (_, i) => 0.5 + 0.25 * Math.sin(i / 12) + 0.08 * Math.sin(i * 1.05));
  const track = rampToTrack(jag, 'L', 'Lightness', { eps: 0.001, interpolation: 'Linear' });
  const sample = (ks: Parameters<typeof evaluateTrackValue>[0], f: number) => evaluateTrackValue(ks, f, false, false);
  const before = Array.from({ length: 256 }, (_, f) => sample(track.keyframes, f));
  const out = smoothSpan(track.keyframes, 96, 160, 0.004, 0.25, 'L-brush', sample);
  ok(!!out, 'the brush returns a merged key list');
  const after = Array.from({ length: 256 }, (_, f) => sample(out!, f));
  const rough = (v: number[], a: number, b: number) => { let s = 0; for (let i = a + 1; i < b; i++) s += Math.abs(v[i - 1] - 2 * v[i] + v[i + 1]); return s / (b - a); };
  const rb = rough(before, 100, 156), ra = rough(after, 100, 156);
  ok(ra < rb * 0.7, `the brushed span is smoother (roughness ${rb.toFixed(4)} → ${ra.toFixed(4)})`);
  const outside = Math.max(...before.map((v, f) => (f < 90 || f > 166 ? Math.abs(v - after[f]) : 0)));
  ok(outside < 1e-9, `outside the span nothing moved (worst ${outside.toExponential(2)})`);
  // incremental: a second stroke over the same span softens FURTHER (owner: "soften
  // incrementally") — the brush works from the track as it now is, never from the original
  const out2 = smoothSpan(out!, 96, 160, 0.004, 0.25, 'L-brush2', sample);
  const after2 = Array.from({ length: 256 }, (_, f) => sample(out2!, f));
  const ra2 = rough(after2, 100, 156);
  ok(ra2 < ra * 0.85, `a second stroke softens further (${ra.toFixed(5)} → ${ra2.toFixed(5)})`);

  // THE SEAM (owner, 2026-09-12: "the smoothing brush causes sharp edges at its
  // extremities"). A brushed span must JOIN the untouched curve, not corner into it.
  //
  // On a SPARSE track, which is the only place it can show. The jagged channel above fits to
  // 253 keys — one per frame — so the segment joining the span to the kept curve is one frame
  // long and any handle on it is negligible; the assertion passed there with the bug present.
  // A real gradient curve has ~10-20 keys over 255 frames, so that joining segment is tens of
  // frames and what sits on its end governs the shape. The section above measures roughness
  // INSIDE the span and fidelity OUTSIDE it, and a kink lives exactly on the boundary between
  // the two, which is how a green suite said nothing about this.
  {
    const smoothCh = Array.from({ length: 256 }, (_, i) => 0.5 + 0.35 * Math.sin((i / 255) * Math.PI * 1.4));
    const sparse = rampToBezierTrack(smoothCh, 'L', 'Lightness', { eps: 0.01 });
    const brushed = smoothSpan(sparse.keyframes, 96, 160, 0.01, 0.3, 'L-seam', sample);
    ok(!!brushed, 'the brush returns keys on a sparse track');
    const curve = Array.from({ length: 256 }, (_, f) => sample(brushed!, f));
    const d2 = (v: number[], f: number) => Math.abs(v[f - 1] - 2 * v[f] + v[f + 1]);
    const away = Array.from({ length: 40 }, (_, i) => d2(curve, 110 + i)).sort((a, b) => a - b);
    const typical = Math.max(away[20], 1e-7);
    /**
     * The bound is ONE 8-BIT LEVEL in this channel, not a multiple of the local curvature.
     *
     * A ratio threshold would have to be tuned, and the number it wants depends on how flat
     * the surrounding curve happens to be. What decides whether a kink is VISIBLE is whether
     * it moves the rendered colour, and Oklab L near mid-grey changes by ~0.0034 per 8-bit
     * sRGB level (measured; grep QUANTISATION_SLACK in palette/core/stopFit.ts for the table).
     * A seam under that cannot show in the gradient however sharp it looks on the plot.
     *
     * Measured here, old brush against new, same track and same span: the PRE-EXISTING
     * Catmull-Rom path left 3.34e-2 at frame 160 — ten levels, and the reason the owner saw
     * "sharp edges at its extremities" (2026-09-12). Fitted tangents plus `spliceSpan`'s
     * reach heal bring it to 1.5e-3, half a level. Frame 96 was never affected in either
     * (0.2x typical) because a kept key sits close to it there — which is why the span's
     * other end is the one that betrays this, and why a one-sided test would miss it.
     *
     * Falsified two ways, and both halves are load-bearing: dropping the mirrored outward arms
     * in `fitKeysToSamples` reds frame 160 at 4.5e-2, dropping `spliceSpan`'s `reach` alone
     * reds it at 3.7e-2. Neither shows at frame 96.
     */
    const ONE_LEVEL_L = 0.0034;
    for (const f of [96, 160]) {
      ok(d2(curve, f) < ONE_LEVEL_L, `the brush joins within one 8-bit level at frame ${f} on a ${sparse.keyframes.length}-key track (seam ${d2(curve, f).toExponential(2)}, bound ${ONE_LEVEL_L})`);
    }
    console.log(`  seam: ${sparse.keyframes.length}-key track → brushed ${brushed!.length}; d2 at 96/160 ${d2(curve, 96).toExponential(1)}/${d2(curve, 160).toExponential(1)}, typical ${typical.toExponential(1)}, one level ${ONE_LEVEL_L}`);
  }
  console.log(`  brush: ${track.keyframes.length} keys → ${out!.length} → ${out2!.length}; roughness in span ${rb.toFixed(4)} → ${ra.toFixed(4)} → ${ra2.toFixed(4)}`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
