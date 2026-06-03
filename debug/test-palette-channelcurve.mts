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
import { rampToTrack, trackToRamp } from '../palette/core/channelCurve';
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

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
