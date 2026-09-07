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
import { rampToTrack, trackToRamp, flatRuns, rampToSteppedTrack } from '../palette/core/channelCurve';
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

// The smoothing brush (C.12): a jagged channel brushed over frames 96..160 gets smoother
// THERE (its second differences shrink) while the samples outside the span stay exactly as
// they were. Falsified by returning `keys` unchanged from smoothSpan: the first check goes
// red; by dropping the `kept` filter: the second.
{
  const jag = Array.from({ length: 256 }, (_, i) => 0.5 + 0.25 * Math.sin(i / 12) + (i % 2 ? 0.08 : -0.08));
  const track = rampToTrack(jag, 'L', 'Lightness', { eps: 0.001, interpolation: 'Linear' });
  const sample = (ks: Parameters<typeof evaluateTrackValue>[0], f: number) => evaluateTrackValue(ks, f, false, false);
  const before = Array.from({ length: 256 }, (_, f) => sample(track.keyframes, f));
  const out = smoothSpan(track.keyframes, 96, 160, 0.004, 9, 'L-brush', sample);
  ok(!!out, 'the brush returns a merged key list');
  const after = Array.from({ length: 256 }, (_, f) => sample(out!, f));
  const rough = (v: number[], a: number, b: number) => { let s = 0; for (let i = a + 1; i < b; i++) s += Math.abs(v[i - 1] - 2 * v[i] + v[i + 1]); return s / (b - a); };
  const rb = rough(before, 100, 156), ra = rough(after, 100, 156);
  ok(ra < rb * 0.35, `the brushed span is smoother (roughness ${rb.toFixed(4)} → ${ra.toFixed(4)})`);
  const outside = Math.max(...before.map((v, f) => (f < 90 || f > 166 ? Math.abs(v - after[f]) : 0)));
  ok(outside < 1e-9, `outside the span nothing moved (worst ${outside.toExponential(2)})`);
  console.log(`  brush: ${track.keyframes.length} keys → ${out!.length}; roughness in span ${rb.toFixed(4)} → ${ra.toFixed(4)}`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
