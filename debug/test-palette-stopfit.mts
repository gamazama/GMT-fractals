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
import { oklabDistance, type RGB } from '../palette/core/oklab';

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

// 5) SEEDED RE-FIT IS STABLE (2026-09-07, the v2 Mix bake). Re-fitting a fitted gradient's
//    own rendered ramp with its stops as `seedStops` (position + interpolation) must reproduce those
//    positions EXACTLY, bake after bake — without seeds the interior stops walk (measured
//    16.9 → 18.8 → 19.2 → 19.6 % over three bakes in the app). Falsified by removing the
//    seed loop in fitRampToStops: the assertions below go red.
{
  console.log('\n[5] seeded re-fit is stable');
  const { renderStopsToRamp } = await import('../palette/core/gmtGradient');
  let cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#1020A0', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 0.17, color: '#F0C030', bias: 0.5, interpolation: 'linear' },
      { id: 'c', position: 0.5, color: '#20A040', bias: 0.5, interpolation: 'step' },
      { id: 'd', position: 0.83, color: '#4030D0', bias: 0.5, interpolation: 'linear' },
      { id: 'e', position: 1, color: '#A01050', bias: 0.5, interpolation: 'linear' },
    ],
    blendSpace: 'oklab',
    colorSpace: 'srgb',
  };
  const pos = (c: GradientConfig) => c.stops.map((st) => Math.round(st.position * 255)).join(',');
  const seedsOf = (c: GradientConfig) => c.stops.map((st) => ({ position: st.position, interpolation: st.interpolation, bias: st.bias }));
  const first = fitRampToStops(renderStopsToRamp(cfg.stops, 'oklab', 'srgb'), { targetDE: 0.008, maxStops: 48, seedStops: seedsOf(cfg) });
  ok(cfg.stops.every((st) => first.stops.some((f) => Math.round(f.position * 255) === Math.round(st.position * 255))), `seeded fit keeps every input position (${pos(first)})`);
  cfg = first;
  const p0 = pos(cfg);
  for (let k = 0; k < 3; k++) {
    // quantise to 8-bit like the app's slot registration does, then re-fit with seeds
    const ramp = renderStopsToRamp(cfg.stops, 'oklab', 'srgb').map((c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
    cfg = fitRampToStops(ramp, { targetDE: 0.008, maxStops: 48, seedStops: seedsOf(cfg) });
  }
  ok(cfg.stops.length === first.stops.length, `three seeded re-fits keep the stop count (${first.stops.length} → ${cfg.stops.length})`);
  ok(pos(cfg) === p0, `three seeded re-fits reproduce the positions exactly (${p0} → ${pos(cfg)})`);
}

// 6) BIAS AND SMOOTH ARE USED (2026-09-07). Gradients authored with random biases must fit
//    with far fewer stops than a bias-blind fitter needs, at or under tolerance; plain
//    bias-0.5 gradients must not get worse; and a fit must stay a few ms (it runs on every
//    slider move in the v2 hero). Falsified with `fitBias: false`: the biased set needs
//    ~13 stops instead of ~7 and the first assertion goes red.
{
  console.log('\n[6] bias + smooth before a new stop');
  const { renderStopsToRamp } = await import('../palette/core/gmtGradient');
  let seed = 7;
  const rnd2 = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const col = () => `#${hex2(rnd2() * 256)}${hex2(rnd2() * 256)}${hex2(rnd2() * 256)}`.toUpperCase();
  const synth = (interp: GradientStop['interpolation'], withBias: boolean): { ramp: RGB[]; n: number } => {
    const n = 3 + Math.floor(rnd2() * 4);
    const pos = Array.from({ length: n }, () => rnd2()).sort((a, b) => a - b);
    pos[0] = 0;
    pos[n - 1] = 1;
    const st = pos.map((p, i) => ({ id: `r${i}`, position: p, color: col(), bias: withBias ? 0.15 + rnd2() * 0.7 : 0.5, interpolation: interp }));
    return { ramp: renderStopsToRamp(st, 'oklab', 'srgb').map((c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) })), n };
  };
  const set = (interp: GradientStop['interpolation'], withBias: boolean) => Array.from({ length: 40 }, () => synth(interp, withBias));
  const stopsFor = (cases: { ramp: RGB[]; n: number }[], fitBias: boolean) => {
    let stops = 0;
    let worst = 0;
    for (const c of cases) {
      const m = measureFit(fitRampToStops(c.ramp, { targetDE: 0.012, maxStops: 48, fitBias }), c.ramp);
      stops += m.stops;
      worst = Math.max(worst, m.maxDE);
    }
    return { avg: stops / cases.length, worst };
  };
  const biased = set('linear', true);
  const b = stopsFor(biased, true);
  const blind = stopsFor(biased, false);
  ok(b.avg < blind.avg * 0.7, `random-bias gradients fit with far fewer stops (${b.avg.toFixed(1)} vs ${blind.avg.toFixed(1)} bias-blind)`);
  // 0.07, not the 0.012 target: one synthetic case has two jumps ONE texel apart (a one-texel
  // band from random positions), which the isolated-jump rule cannot mark as two edges and
  // whose texel already carries the edge stop; it fits at 0.059 (bias-blind: 0.031 with 23
  // stops). Every other case is at or under 0.03.
  ok(b.worst <= 0.07, `…and stay near tolerance (worst ΔE ${b.worst.toFixed(4)})`);
  const plain = set('linear', false);
  const p1 = stopsFor(plain, true);
  const p0 = stopsFor(plain, false);
  ok(p1.avg <= p0.avg + 0.5, `plain bias-0.5 gradients are not worse (${p1.avg.toFixed(1)} vs ${p0.avg.toFixed(1)})`);
  const sm = stopsFor(set('smooth', true), true);
  ok(sm.avg < 11, `smooth + biased gradients fit in ~9 stops (${sm.avg.toFixed(1)})`);
  const t0 = performance.now();
  for (const c of biased) fitRampToStops(c.ramp, { targetDE: 0.012, maxStops: 48 });
  const ms = (performance.now() - t0) / biased.length;
  ok(ms < 12, `a fit stays fast (${ms.toFixed(1)} ms avg over ${biased.length}; it runs on every slider move)`);
}

// 7) A BANDED PALETTE GETS ONE STEP STOP PER BAND (2026-09-07, owner: "many stepped
//    gradients in the library and none create stepped knots"). Bands are flat runs, not big
//    jumps: a 16-band ramp whose neighbouring bands differ by only ~0.015 ΔE (typical of the
//    library — cpt-city's banded palettes have a median edge of 0.021) must still come out
//    as 16 step stops that render it EXACTLY, and a smooth ramp must get no step at all.
//    Falsified with `seedPlateaus: false`: the first assertion goes red (the jump-based
//    corner detector sees nothing at 0.015).
{
  console.log('\n[7] a banded palette is step stops');
  const { renderStopsToRamp } = await import('../palette/core/gmtGradient');
  const bands = 16;
  // 16 bands stepping through a narrow hue range: neighbours differ by a small ΔE
  const band = (k: number): RGB => ({ r: 40 + k * 6, g: 90 + k * 4, b: 200 - k * 3 });
  const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => band(Math.floor((i / 256) * bands)));
  let edge = 1;
  for (let k = 1; k < bands; k++) edge = Math.min(edge, oklabDistance(band(k - 1), band(k)));
  const f = fitRampToStops(ramp, { targetDE: 0.02, maxStops: 128 });
  const steps = f.stops.filter((s) => s.interpolation === 'step').length;
  ok(steps >= bands, `${bands} bands (smallest edge ΔE ${edge.toFixed(3)}) → ${steps} step stops`);
  ok(measureFit(f, ramp).maxDE < 0.001, `…rendering the bands exactly (max ΔE ${measureFit(f, ramp).maxDE.toFixed(4)})`);
  const smooth = renderStopsToRamp([
    { id: 'a', position: 0, color: '#101830', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: '#E0D0A0', bias: 0.5, interpolation: 'linear' },
  ], 'oklab', 'srgb').map((c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
  const fs = fitRampToStops(smooth, { targetDE: 0.02, maxStops: 128 });
  ok(!fs.stops.some((s) => s.interpolation === 'step'), `a smooth ramp with quantisation runs gets no step (${fs.stops.length} stops)`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
