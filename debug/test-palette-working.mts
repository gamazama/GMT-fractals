/**
 * workingPipeline harness — the v2 Working gradient's pure core.
 *
 *   1. identity detection over the Adjust params.
 *   2. passthrough: a stops input under the identity pipeline comes back VERBATIM
 *      (same config object, ramp = the direct stops render).
 *   3. a real transform (hue rotate / curves) breaks passthrough and produces a fitted
 *      config with a detail-scaled stop budget.
 *   4. bare-ramp inputs (Extract) always fit; determinism.
 *
 * Run: npx tsx debug/test-palette-working.mts
 */

import {
  runWorkingPipeline,
  isIdentityAdjust,
  channelsOfConfig,
  channelsOfRamp,
  stopBudget,
} from '../palette/core/workingPipeline';
import { DEFAULT_GENERATOR_PARAMS } from '../palette/core/generatorPipeline';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import type { GradientConfig } from '../types';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

const cfg: GradientConfig = {
  stops: [
    { id: 'a', position: 0, color: '#1B2A6B' },
    { id: 'b', position: 0.45, color: '#F2B134' },
    { id: 'c', position: 0.7, color: '#E4572E' },
    { id: 'd', position: 1, color: '#17BEBB' },
  ],
  colorSpace: 'srgb',
  blendSpace: 'oklab',
};
const P = DEFAULT_GENERATOR_PARAMS;
const maxDiff = (a: RGB[], b: RGB[]) => {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i].r - b[i].r), Math.abs(a[i].g - b[i].g), Math.abs(a[i].b - b[i].b));
  return m;
};

console.log('[1] identity');
{
  ok(isIdentityAdjust(P), 'defaults are the identity');
  ok(isIdentityAdjust({ ...P, bands: 1 }), 'bands = 1 is still off');
  ok(!isIdentityAdjust({ ...P, reverse: true }), 'reverse breaks identity');
  ok(!isIdentityAdjust({ ...P, repeats: 2 }), 'repeats = 2 breaks identity');
  ok(!isIdentityAdjust({ ...P, hueRotate: 15 }), 'hue rotate breaks identity');
  ok(!isIdentityAdjust({ ...P, chroma: 1.2 }), 'chroma breaks identity');
  ok(!isIdentityAdjust({ ...P, noise: 0.1 }), 'noise breaks identity');
  ok(isIdentityAdjust({ ...P, mixL: 0.7, mixC: 0.2, mixH: 1 }), 'the mix fields are not part of Adjust');
}

console.log('[2] passthrough');
{
  const base = channelsOfConfig(cfg);
  const out = runWorkingPipeline(base, P, null, 1, 8, cfg);
  ok(out.passthrough, 'passthrough flagged');
  ok(out.config === cfg, 'passthrough: config is the verbatim object');
  ok(maxDiff(out.ramp, renderStopsToRamp(cfg.stops, cfg.blendSpace, cfg.colorSpace)) === 0, 'passthrough: ramp is the direct render');
  ok(out.ramp.length === 256 && out.base.L.length === 256, 'shapes');
}

console.log('[3] real transforms');
{
  const base = channelsOfConfig(cfg);
  const direct = renderStopsToRamp(cfg.stops, cfg.blendSpace, cfg.colorSpace);
  const rot = runWorkingPipeline(base, { ...P, hueRotate: 120 }, null, 1, 8, cfg);
  ok(!rot.passthrough && rot.config !== cfg, 'hue rotate: not passthrough, config is fitted');
  ok(maxDiff(rot.ramp, direct) > 40, 'hue rotate: the ramp actually changed (Δ=' + maxDiff(rot.ramp, direct).toFixed(1) + ')');
  ok(rot.config.stops.length >= 2 && rot.config.stops.length <= stopBudget(8).maxStops, 'hue rotate: fitted stop count within the detail budget');
  const flatL = { L: Array.from({ length: 256 }, () => 0.5) };
  const cur = runWorkingPipeline(base, P, flatL, 1, 8, cfg);
  ok(!cur.passthrough, 'a curve override breaks passthrough even at identity Adjust');
  ok(maxDiff(cur.ramp, direct) > 10, 'flat-L curve: the ramp changed');
  const rev = runWorkingPipeline(base, { ...P, reverse: true }, null, 1, 8, cfg);
  ok(maxDiff(rev.ramp, direct.slice().reverse()) < 3, 'reverse ≈ the direct render reversed (Δ=' + maxDiff(rev.ramp, direct.slice().reverse()).toFixed(1) + ')');
  ok(stopBudget(2).maxStops < stopBudget(10).maxStops && stopBudget(2).targetDE > stopBudget(10).targetDE, 'detail buys stops and tightens ΔE');
}

console.log('[4] bare ramp inputs + determinism');
{
  const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: 255 - i, b: (i * 7) % 256 }));
  const base = channelsOfRamp(ramp);
  const a = runWorkingPipeline(base, P, null, 1, 8, null);
  const b = runWorkingPipeline(base, P, null, 1, 8, null);
  ok(!a.passthrough && a.config.stops.length >= 2, 'no verbatim → fitted config');
  ok(maxDiff(a.ramp, b.ramp) === 0 && JSON.stringify(a.config) === JSON.stringify(b.config), 'deterministic');
  const noisy = runWorkingPipeline(base, { ...P, noise: 0.3 }, null, 7, 8, null);
  const noisy2 = runWorkingPipeline(base, { ...P, noise: 0.3 }, null, 7, 8, null);
  ok(maxDiff(noisy.ramp, noisy2.ramp) === 0, 'noise is seeded, not random');
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nOK — workingPipeline: all assertions passed');
