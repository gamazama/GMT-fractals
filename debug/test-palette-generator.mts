/**
 * Generator-pipeline harness — verifies the pure buildGradientRamp core against
 * its load-bearing invariants (ported from the prototype's buildResult):
 *
 *   • identity: mix=0, default mods, no curves/noise ⇒ result == slot A decomposed
 *     and recombined (round-trip through OKLCh stays within float tolerance).
 *   • mix endpoints: mixL/C/h = 1 ⇒ those channels come fully from slot B.
 *   • modifier sanity: chroma×0 ⇒ greyscale; reverse flips; repeats tiles.
 *   • noise determinism: same seed ⇒ identical ramp; different seed ⇒ differs.
 *   • posterize: N bands ⇒ at most N distinct colours.
 *   • seam: the generated ramp fits to GMT stops within the fidelity dial.
 *
 * Run: npx tsx debug/test-palette-generator.mts
 */

import {
  decomposeRamp,
  buildGradientRamp,
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_SLOT_MODS,
  type GeneratorParams,
  type SlotModifiers,
} from '../palette/core/generatorPipeline';
import { fitRampToStops, measureFit } from '../palette/core/stopFit';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
};

// Two synthetic source ramps.
const rampOf = (fn: (t: number) => RGB): RGB[] => {
  const out: RGB[] = new Array(256);
  for (let i = 0; i < 256; i++) out[i] = fn(i / 255);
  return out;
};
const A = rampOf((t) => ({ r: 255 * t, g: 64 + 128 * t, b: 255 * (1 - t) })); // blue→orange-ish
const B = rampOf((t) => ({ r: 255 * (1 - t), g: 255 * t, b: 128 })); // red→green

const srcA = decomposeRamp(A);
const srcB = decomposeRamp(B);

const P = (patch: Partial<GeneratorParams> = {}): GeneratorParams => ({ ...DEFAULT_GENERATOR_PARAMS, ...patch });
const M = (patch: Partial<SlotModifiers> = {}): SlotModifiers => ({ ...DEFAULT_SLOT_MODS, ...patch });

const maxChannelDiff = (x: RGB[], y: RGB[]) => {
  let m = 0;
  for (let i = 0; i < 256; i++) m = Math.max(m, Math.abs(x[i].r - y[i].r), Math.abs(x[i].g - y[i].g), Math.abs(x[i].b - y[i].b));
  return m;
};

console.log('Generator pipeline:');

// 1) Identity — mix=0, defaults ⇒ ≈ slot A re-decomposed→recombined.
{
  const { ramp } = buildGradientRamp(srcA, srcB, M(), M(), P(), null, 1);
  ok(maxChannelDiff(ramp, A) < 2, `identity (mix=0, defaults) reproduces slot A within 2 levels (got ${maxChannelDiff(ramp, A).toFixed(2)})`);
}

// 2) Mix endpoints — all channels to B ⇒ ≈ slot B.
{
  const { ramp } = buildGradientRamp(srcA, srcB, M(), M(), P({ mixL: 1, mixC: 1, mixH: 1 }), null, 1);
  ok(maxChannelDiff(ramp, B) < 3, `mix=1 reproduces slot B within 3 levels (got ${maxChannelDiff(ramp, B).toFixed(2)})`);
}

// 3) Chroma×0 ⇒ greyscale (r≈g≈b).
{
  const { ramp } = buildGradientRamp(srcA, srcB, M(), M(), P({ chroma: 0 }), null, 1);
  let grey = true;
  for (let i = 0; i < 256; i++) {
    if (Math.abs(ramp[i].r - ramp[i].g) > 2 || Math.abs(ramp[i].g - ramp[i].b) > 2) grey = false;
  }
  ok(grey, 'chroma×0 yields greyscale');
}

// 4) Global reverse flips endpoints.
{
  const base = buildGradientRamp(srcA, srcB, M(), M(), P(), null, 1).ramp;
  const rev = buildGradientRamp(srcA, srcB, M(), M(), P({ reverse: true }), null, 1).ramp;
  const colDiff = (a: RGB, b: RGB) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
  ok(colDiff(rev[0], base[255]) < 2 && colDiff(rev[255], base[0]) < 2, 'reverse swaps the endpoints');
}

// 5) Noise determinism.
{
  const a1 = buildGradientRamp(srcA, srcB, M(), M(), P({ noise: 0.5, noiseL: true }), null, 7).ramp;
  const a2 = buildGradientRamp(srcA, srcB, M(), M(), P({ noise: 0.5, noiseL: true }), null, 7).ramp;
  const b1 = buildGradientRamp(srcA, srcB, M(), M(), P({ noise: 0.5, noiseL: true }), null, 8).ramp;
  ok(maxChannelDiff(a1, a2) === 0, 'same seed ⇒ identical noise');
  ok(maxChannelDiff(a1, b1) > 0, 'different seed ⇒ different noise');
}

// 6) Posterize ⇒ ≤ N distinct colours.
{
  const bands = 5;
  const { ramp } = buildGradientRamp(srcA, srcB, M(), M(), P({ bands }), null, 1);
  const distinct = new Set(ramp.map((c) => `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`));
  ok(distinct.size <= bands, `posterize ${bands} bands ⇒ ${distinct.size} distinct colours (≤ ${bands})`);
}

// 7) Seam — fits to GMT stops within the fidelity dial.
{
  const { ramp } = buildGradientRamp(srcA, srcB, M(), M(), P({ mixH: 0.5 }), null, 1);
  const cfg = fitRampToStops(ramp, { targetDE: 0.02 });
  const fit = measureFit(cfg, ramp);
  ok(fit.maxDE < 0.06, `seam fit maxΔE ${fit.maxDE.toFixed(3)} < 0.06 with ${fit.stops} stops`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
