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
  buildColorBoxRamp,
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_SLOT_MODS,
  DEFAULT_COLORBOX_PARAMS,
  type GeneratorParams,
  type SlotModifiers,
  type ColorBoxParams,
} from '../palette/core/generatorPipeline';
import { fitRampToStops, measureFit } from '../palette/core/stopFit';
import { rgbToOklab, type RGB } from '../palette/core/oklab';
import { PaletteGeneratorFeature } from '../palette/features/paletteGenerator';
import { EASING_NAMES, type EasingName } from '../palette/core/easings';
import { fitColorBoxToRamp } from '../palette/core/colorBoxFit';

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

// --- ColorBox mode (parallel builder) --------------------------------------------
console.log('\nColorBox mode:');

const CB = (patch: Partial<ColorBoxParams> = {}): ColorBoxParams => ({ ...DEFAULT_COLORBOX_PARAMS, ...patch });

// 8) Shape — full 256-length ramp + channels, h carried in radians.
{
  const r = buildColorBoxRamp(CB());
  ok(r.ramp.length === 256, 'ColorBox ramp is 256 texels');
  ok(r.base.L.length === 256 && r.base.C.length === 256 && r.base.h.length === 256, 'ColorBox base channels are 256-long');
  ok(r.final === r.final && r.final.L.length === 256, 'ColorBox final channels present (BuildResult shape preserved)');
  // h channel is radians (within ±2π of the start/end in radians).
  ok(r.base.h.every((h) => h >= -7 && h <= 7), 'ColorBox h channel is in radians');
}

// 9) Determinism — same params ⇒ byte-identical ramp.
{
  const a = buildColorBoxRamp(CB({ L: { start: 0.1, end: 0.9, easing: 'inOutCubic' } }));
  const b = buildColorBoxRamp(CB({ L: { start: 0.1, end: 0.9, easing: 'inOutCubic' } }));
  ok(maxChannelDiff(a.ramp, b.ramp) === 0, 'same params ⇒ identical ColorBox ramp');
}

// 10) Lightness endpoints — the OKLab L of texel 0/255 matches the L sweep ends.
{
  const r = buildColorBoxRamp(CB({ L: { start: 0.25, end: 0.85, easing: 'linear' }, C: { start: 0.05, end: 0.05, easing: 'linear' } }));
  const l0 = rgbToOklab(r.ramp[0]).L;
  const l255 = rgbToOklab(r.ramp[255]).L;
  ok(Math.abs(l0 - 0.25) < 0.02, `L start respected (got ${l0.toFixed(3)})`);
  ok(Math.abs(l255 - 0.85) < 0.02, `L end respected (got ${l255.toFixed(3)})`);
  ok(l255 > l0, 'lightness rises start→end');
}

// 11) Chroma=0 ⇒ greyscale (achromatic sweep is neutral at every texel).
{
  const r = buildColorBoxRamp(CB({ C: { start: 0, end: 0, easing: 'linear' } }));
  let grey = true;
  for (let i = 0; i < 256; i++) {
    if (Math.abs(r.ramp[i].r - r.ramp[i].g) > 2 || Math.abs(r.ramp[i].g - r.ramp[i].b) > 2) grey = false;
  }
  ok(grey, 'C=0 sweep yields greyscale');
}

// 12) Gamut safety — a high-chroma sweep never produces NaN / out-of-range bytes.
{
  const r = buildColorBoxRamp(CB({ C: { start: 0.35, end: 0.35, easing: 'linear' }, h: { start: 0, end: 360, easing: 'linear' } }));
  let inRange = true;
  for (const c of r.ramp) {
    if (!Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b)) inRange = false;
    if (c.r < -0.01 || c.r > 255.01 || c.g < -0.01 || c.g > 255.01 || c.b < -0.01 || c.b > 255.01) inRange = false;
  }
  ok(inRange, 'high-chroma full-hue sweep stays gamut-safe (finite, 0..255)');
}

// 13) Easing actually bends the curve — a strong ease differs from linear.
{
  const lin = buildColorBoxRamp(CB({ L: { start: 0, end: 1, easing: 'linear' } }));
  const eased = buildColorBoxRamp(CB({ L: { start: 0, end: 1, easing: 'inOutExpo' } }));
  ok(maxChannelDiff(lin.ramp, eased.ramp) > 5, 'a non-linear easing changes the ramp vs linear');
  // ...but the endpoints still coincide (easing endpoints are exact).
  const colDiff = (a: RGB, b: RGB) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
  ok(colDiff(lin.ramp[0], eased.ramp[0]) < 1 && colDiff(lin.ramp[255], eased.ramp[255]) < 1, 'easing preserves both endpoints');
}

// 14) Seam — the ColorBox ramp fits to GMT stops within the fidelity dial.
{
  const { ramp } = buildColorBoxRamp(CB());
  const cfg = fitRampToStops(ramp, { targetDE: 0.02 });
  const fit = measureFit(cfg, ramp);
  ok(fit.maxDE < 0.06, `ColorBox seam fit maxΔE ${fit.maxDE.toFixed(3)} < 0.06 with ${fit.stops} stops`);
}

// 15) WIRING — the live path: DDFS param defaults → sliceToColorBox-shaped read →
//     builder. Guards the key-casing contract between paletteGenerator.ts (registers
//     cbLStart/cbCStart/cbHStart) and the store read. A casing mismatch (e.g. cbhStart)
//     would feed `undefined` → NaN → an all-black ramp, which earlier slipped past the
//     explicit-params golden tests above.
{
  const slice: Record<string, number> = {};
  for (const [k, p] of Object.entries(PaletteGeneratorFeature.params)) {
    const def = (p as { default: unknown }).default;
    if (typeof def === 'number') slice[k] = def;
  }
  const ef = (i: number): EasingName => EASING_NAMES[i] ?? EASING_NAMES[0];
  // Mirror generatorStore.sliceToColorBox exactly (uppercase channel keys).
  const cb: ColorBoxParams = {
    L: { start: slice.cbLStart, end: slice.cbLEnd, easing: ef(slice.cbLEasing) },
    C: { start: slice.cbCStart, end: slice.cbCEnd, easing: ef(slice.cbCEasing) },
    h: { start: slice.cbHStart, end: slice.cbHEnd, easing: ef(slice.cbHEasing) },
  };
  const everyKey = ['cbLStart', 'cbLEnd', 'cbLEasing', 'cbCStart', 'cbCEnd', 'cbCEasing', 'cbHStart', 'cbHEnd', 'cbHEasing'];
  ok(everyKey.every((k) => slice[k] !== undefined), 'every cb* param is registered with the key the store reads');
  const { ramp } = buildColorBoxRamp(cb);
  const anyNaN = ramp.some((c) => !Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b));
  const allBlack = ramp.every((c) => c.r < 1 && c.g < 1 && c.b < 1);
  ok(!anyNaN, 'live default params → no NaN texels');
  ok(!allBlack, 'live default params → ramp is not all-black');
}

// --- ColorBox fit (gradient → sweep params, for the P2 drop path) ----------------
console.log('\nColorBox fit:');

// 16) Round-trip: build an IN-GAMUT ColorBox ramp with known easings, fit it back,
//     recover them. (oklabToRgbSafe preserves L+h but clips chroma, so an out-of-gamut
//     C sweep wouldn't decode faithfully — kept low here so decompose is exact.)
{
  const known: ColorBoxParams = {
    L: { start: 0.35, end: 0.72, easing: 'inOutCubic' },
    C: { start: 0.04, end: 0.09, easing: 'outQuad' },
    h: { start: 60, end: 150, easing: 'inSine' },
  };
  const { ramp } = buildColorBoxRamp(known);
  const fit = fitColorBoxToRamp(ramp);
  ok(fit.L.easing === 'inOutCubic', `L easing recovered (got ${fit.L.easing})`);
  ok(fit.C.easing === 'outQuad', `C easing recovered (got ${fit.C.easing})`);
  ok(fit.h.easing === 'inSine', `h easing recovered (got ${fit.h.easing})`);
  ok(Math.abs(fit.L.start - 0.35) < 0.02 && Math.abs(fit.L.end - 0.72) < 0.02, 'L endpoints recovered');
  // Re-building from the fit reproduces the original ramp closely.
  const rebuilt = buildColorBoxRamp(fit).ramp;
  ok(maxChannelDiff(rebuilt, ramp) < 6, `rebuild from fit ≈ original (maxΔ ${maxChannelDiff(rebuilt, ramp).toFixed(1)})`);
}

// 17) Flat channels (a solid colour) → linear easing, equal endpoints, no crash/NaN.
{
  const solid: RGB[] = new Array(256).fill(0).map(() => ({ r: 120, g: 80, b: 200 }));
  const fit = fitColorBoxToRamp(solid);
  ok(fit.L.easing === 'linear' && fit.C.easing === 'linear', 'flat ramp ⇒ linear easings');
  ok(Math.abs(fit.L.start - fit.L.end) < 0.01, 'flat ramp ⇒ equal L endpoints');
  const rebuilt = buildColorBoxRamp(fit).ramp;
  const anyNaN = rebuilt.some((c) => !Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b));
  ok(!anyNaN, 'fit of a solid colour never produces NaN');
}

// 18) Fit an arbitrary (non-ColorBox) gradient — never throws, params in valid ranges.
{
  const fit = fitColorBoxToRamp(A); // the synthetic blue→orange ramp from above
  const valid =
    Number.isFinite(fit.L.start) && Number.isFinite(fit.L.end) &&
    Number.isFinite(fit.C.start) && Number.isFinite(fit.C.end) &&
    fit.h.start >= 0 && fit.h.start < 360 && fit.h.end >= 0 && fit.h.end < 360 &&
    EASING_NAMES.includes(fit.L.easing) && EASING_NAMES.includes(fit.h.easing);
  ok(valid, 'arbitrary gradient fits to finite, in-range ColorBox params');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
