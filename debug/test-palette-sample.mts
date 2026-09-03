/**
 * paletteSample harness — the discrete palette face + the ramp-similarity metric.
 *
 *   1. 'even' spacing: count, endpoints, exact positions on an index-coded ramp.
 *   2. 'perceptual' spacing: endpoints pinned, monotone, concentrates where the colour
 *      changes, falls back to 'even' on a flat ramp (no NaN).
 *   3. 'stops': one swatch per stop at the sorted positions; degrades without a config.
 *   4. count clamping.
 *   5. rampDistance: zero on identity, symmetric, positive on a real difference.
 *
 * Run: npx tsx debug/test-palette-sample.mts
 */

import {
  samplePalette,
  sampleEven,
  samplePerceptual,
  sampleAtStops,
  rampDistance,
  clampCount,
  PALETTE_MIN,
  PALETTE_MAX,
} from '../palette/core/paletteSample';
import type { RGB } from '../palette/core/oklab';
import type { GradientConfig } from '../types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

const grey = (v: number): RGB => ({ r: v, g: v, b: v });
/** Index-coded grey ramp: ramp[i].r === i, so a swatch tells you where it was sampled. */
const coded: RGB[] = Array.from({ length: 256 }, (_, i) => grey(i));
const flat: RGB[] = Array.from({ length: 256 }, () => grey(128));
/** All the change happens in the first 26 texels; the rest is white. */
const front: RGB[] = Array.from({ length: 256 }, (_, i) => grey(Math.min(255, i < 26 ? i * 10 : 255)));
const idxOf = (s: { color: RGB }) => s.color.r;

console.log('[1] even');
{
  const p = sampleEven(coded, 6);
  ok(p.length === 6, 'even: count');
  ok(p[0].t === 0 && p[5].t === 1, 'even: endpoints t');
  ok(p.map(idxOf).join(',') === '0,51,102,153,204,255', 'even: positions ' + p.map(idxOf).join(','));
  ok(sampleEven(coded, 2).map(idxOf).join(',') === '0,255', 'even: n=2 is the two ends');
  ok(sampleEven([], 6).length === 0, 'even: empty ramp → empty');
}

console.log('[2] perceptual');
{
  const p = samplePerceptual(coded, 6);
  ok(p.length === 6, 'perceptual: count');
  ok(p[0].t === 0 && p[5].t === 1, 'perceptual: endpoints');
  ok(p.every((s, i) => i === 0 || s.t >= p[i - 1].t), 'perceptual: monotone t');
  const f = samplePerceptual(front, 5);
  ok(f[0].t === 0 && f[4].t === 1, 'perceptual/front: endpoints pinned');
  ok(f[1].t * 255 < 30 && f[2].t * 255 < 30 && f[3].t * 255 < 30, 'perceptual/front: interior swatches concentrate where the colour changes (t·255 = ' + f.slice(1, 4).map((s) => Math.round(s.t * 255)).join(',') + ')');
  const e = sampleEven(front, 5);
  ok(Math.round(e[1].t * 255) === 64, 'even/front: control — even ignores where the change is');
  const fl = samplePerceptual(flat, 7);
  ok(fl.length === 7 && fl.every((s) => Number.isFinite(s.t)), 'flat ramp: perceptual falls back to even, no NaN');
  ok(fl.map((s) => s.t).join(',') === sampleEven(flat, 7).map((s) => s.t).join(','), 'flat ramp: identical positions to even');
}

console.log('[3] stops');
{
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 1, color: '#fff' },
      { id: 'b', position: 0, color: '#000' },
      { id: 'c', position: 0.25, color: '#888' },
    ],
    colorSpace: 'srgb',
    blendSpace: 'oklab',
  };
  const s = sampleAtStops(coded, cfg);
  ok(s.map((x) => x.t).join(',') === '0,0.25,1', 'stops: sorted positions');
  ok(s.map(idxOf).join(',') === '0,64,255', 'stops: colours read off the ramp at those positions');
  ok(samplePalette(coded, 'stops', 6, cfg).length === 3, 'samplePalette stops: one per stop');
  ok(samplePalette(coded, 'stops', 6, null).length === 6, 'samplePalette stops without a config → even');
  ok(samplePalette(coded, 'stops', 6, { ...cfg, stops: [cfg.stops[0]] }).length === 6, 'samplePalette stops with a single stop → even');
  ok(samplePalette(coded, 'perceptual', 4).length === 4, 'samplePalette perceptual dispatch');
  ok(samplePalette(coded, 'even', 4).length === 4, 'samplePalette even dispatch');
}

console.log('[4] count clamp');
{
  ok(clampCount(1) === PALETTE_MIN, 'clamp low');
  ok(clampCount(1000) === PALETTE_MAX, 'clamp high');
  ok(clampCount(5.6) === 6, 'clamp rounds');
  ok(clampCount(NaN) === PALETTE_MIN, 'clamp NaN → min');
  ok(sampleEven(coded, 1).length === PALETTE_MIN, 'even honours the clamp');
  ok(samplePerceptual(coded, 999).length === PALETTE_MAX, 'perceptual honours the clamp');
}

console.log('[5] rampDistance');
{
  ok(rampDistance(coded, coded) === 0, 'identity → 0');
  const rev = coded.slice().reverse();
  const d = rampDistance(coded, rev);
  ok(d > 0, 'reverse → positive');
  ok(Math.abs(rampDistance(rev, coded) - d) < 1e-12, 'symmetric');
  ok(rampDistance(coded, front) > 0 && rampDistance(coded, front) < d, 'a near ramp is closer than a far one');
  ok(rampDistance(coded, []) === Infinity, 'empty → Infinity');
  ok(Number.isFinite(rampDistance(coded, coded.slice(0, 64))), 'unequal lengths compare by t');
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nOK — paletteSample: all assertions passed');
