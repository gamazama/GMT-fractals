/**
 * Palette stop-fitter harness.
 *
 *   1. REGRESSION: assert core/gmtGradient.renderStopsToBuffer is byte-identical
 *      to GMT's real generateGradientTextureBuffer (so the fitter measures error
 *      against exactly what GMT renders). Covers the configs the fitter emits.
 *   2. FIDELITY: fit a sample of real .map palettes and report OKLab ΔE + stop
 *      counts (max/mean) so we can see the fitter reaches perceptual tolerance.
 *
 * Run: npx tsx debug/test-palette-stopfit.mts
 */

import fs from 'fs';
import path from 'path';
import type { GradientStop, GradientConfig } from '../types';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { renderStopsToBuffer } from '../palette/core/gmtGradient';
import { fitRampToStops, measureFit, rgbToOklab } from '../palette/core/stopFit';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

// --- deterministic PRNG so runs are reproducible ---
let seed = 0x2545f491;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
};
const hex2 = (n: number) => Math.floor(n).toString(16).padStart(2, '0');
const randColor = () => `#${hex2(rnd() * 256)}${hex2(rnd() * 256)}${hex2(rnd() * 256)}`.toUpperCase();

const randStops = (interp: GradientStop['interpolation'], withBias: boolean): GradientStop[] => {
  const n = 2 + Math.floor(rnd() * 5);
  const pos = Array.from({ length: n }, () => rnd()).sort((a, b) => a - b);
  pos[0] = 0;
  pos[n - 1] = 1;
  return pos.map((p, i) => ({
    id: `r${i}`,
    position: p,
    color: randColor(),
    bias: withBias ? 0.2 + rnd() * 0.6 : 0.5,
    interpolation: interp,
  }));
};

// ===== 1. REGRESSION: mirror == GMT renderer =====
console.log('[1] mirror vs generateGradientTextureBuffer (byte-exact)');
const cases: Array<{ blend: GradientConfig['blendSpace']; interp: GradientStop['interpolation']; bias: boolean }> = [
  { blend: 'oklab', interp: 'linear', bias: false }, // the fitter's exact output config
  { blend: 'oklab', interp: 'linear', bias: true },
  { blend: 'oklab', interp: 'smooth', bias: false },
  { blend: 'rgb', interp: 'linear', bias: false },
  { blend: 'oklab', interp: 'step', bias: false },
];
for (const c of cases) {
  let mismatches = 0;
  for (let trial = 0; trial < 40; trial++) {
    const stops = randStops(c.interp, c.bias);
    const config: GradientConfig = { stops, colorSpace: 'srgb', blendSpace: c.blend };
    const a = generateGradientTextureBuffer(config);
    const b = renderStopsToBuffer(stops, c.blend, 'srgb');
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches++;
  }
  ok(mismatches === 0, `blend=${c.blend} interp=${c.interp} bias=${c.bias}: ${mismatches} byte mismatches`);
  if (mismatches === 0) console.log(`  ✓ blend=${c.blend} interp=${c.interp} bias=${c.bias}`);
}

// ===== 2. FIDELITY on real palettes =====
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

const PAL_DIRS = [
  'H:/GMT/workspace-gmt/Palettes',
  'H:/GMT/stuff/palette-lab/bundles/cptcity',
  'H:/GMT/stuff/palette-lab/bundles/matplotlib',
];
let files: string[] = [];
for (const dir of PAL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const fl = fs.readdirSync(dir).filter((f) => /\.map$/i.test(f));
  const stride = Math.max(1, Math.floor(fl.length / 20));
  for (let i = 0; i < fl.length; i += stride) files.push(path.join(dir, fl[i]));
}

console.log(`\n[2] fidelity dial on ${files.length} real palettes (the refine loop reaches fidelity when given budget)`);
if (files.length === 0) {
  console.log('  (no .map palettes found — skipping fidelity pass)');
} else {
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const ramps = files.map(loadMap);
  const fitAt = (maxStops: number) => {
    const means: number[] = [], maxes: number[] = [], counts: number[] = [];
    for (const ramp of ramps) {
      const m = measureFit(fitRampToStops(ramp, { targetDE: 0.015, maxStops }), ramp);
      means.push(m.meanDE); maxes.push(m.maxDE); counts.push(m.stops);
    }
    return { mean: avg(means), max: avg(maxes), stops: avg(counts) };
  };
  const budgets = [8, 16, 32, 64];
  const rows = budgets.map((b) => ({ b, ...fitAt(b) }));
  for (const r of rows) {
    console.log(`  maxStops ${String(r.b).padStart(3)} → mean ΔE ${r.mean.toFixed(4)} | mean max-ΔE ${r.max.toFixed(4)} | avg stops used ${r.stops.toFixed(1)}`);
  }
  // The DIAL must work: more budget ⇒ strictly lower mean ΔE (proves refine-to-error
  // genuinely reaches fidelity, vs a fixed simplifier like Douglas-Peucker).
  for (let i = 1; i < rows.length; i++) {
    ok(rows[i].mean < rows[i - 1].mean, `mean ΔE should drop ${rows[i - 1].b}→${rows[i].b} stops (${rows[i - 1].mean.toFixed(4)} → ${rows[i].mean.toFixed(4)})`);
  }
  // At a generous budget the typical palette should be solidly perceptual.
  ok(rows[rows.length - 1].mean < 0.02, `mean ΔE at maxStops=64 (${rows[rows.length - 1].mean.toFixed(4)}) should be < 0.02`);
  // Smooth palettes (low high-frequency content) should converge CHEAPLY.
  const smoothCounts: number[] = [];
  for (const ramp of ramps) {
    let hf = 0;
    for (let i = 1; i < 256; i++) hf += Math.abs(rgbToOklab(ramp[i]).L - rgbToOklab(ramp[i - 1]).L);
    if (hf / 256 < 0.004) smoothCounts.push(measureFit(fitRampToStops(ramp, { maxStops: 32 }), ramp).stops);
  }
  if (smoothCounts.length) console.log(`  smooth palettes (${smoothCounts.length}): avg ${avg(smoothCounts).toFixed(1)} stops to converge`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
