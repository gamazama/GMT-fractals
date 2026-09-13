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
 *   • SCALE (19–22, 2026-09-13 — the global `repeats` went continuous and became "Scale"):
 *       19 integer scale is BYTE-IDENTICAL to the old integer repeats — golden digests of the
 *          pre-change pipeline over 1..8 × phase × mirror × reverse × posterize × (plain /
 *          every other dial / noise) — so no preset, session file or keyframe needs migrating;
 *       20 a fractional scale is its own picture (2.5 is neither 2 nor 3), ends on a partial
 *          tile (the last texel is the source's middle), changes CONTINUOUSLY with the value,
 *          a scale below 1 is a window (0.5 = the first half) and ≤ 0 still means 1;
 *       21 mirror alternates: each tile runs there and back, which is exactly "alternate
 *          tiles reversed" at twice the scale — so it is the one mirror;
 *       22 Lightness is an additive OkLab L offset: 0 is exact, 0.1 moves every texel's
 *          un-clipped L by 0.1, and both it and a sub-1 scale break the identity.
 *     Falsified 2026-09-13, each reverted: rounding the value in `scaleOf` reds 20 ("2.5 is
 *     its own picture", the partial tile, the window); restoring `Math.max(1, …)` reds 20's
 *     window + identity checks; always wrapping (the prototype's rule) reds 19 at scale 1;
 *     dropping `+ lit` reds 22; mirroring before the wrap reds 19 for every scale; and an
 *     "alternate tiles" mirror in place of ping-pong reds all three of 21 (worst 255).
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
import { isIdentityAdjust } from '../palette/core/workingPipeline';
import { createHash } from 'node:crypto';

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

const maxChannelDiffN = (x: RGB[], y: RGB[]) => {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i].r - y[i].r), Math.abs(x[i].g - y[i].g), Math.abs(x[i].b - y[i].b));
  return m;
};
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

// --- Scale / mirror / lightness (2026-09-13) --------------------------------------
// GOLDEN digests of buildGradientRamp BEFORE the change, one per integer repeats value, over
// the loop below (recorded from HEAD 7e3547b2 by the same loop). An integer scale must still
// produce exactly these bytes: that is the whole case for keeping the key with no migration.
const GOLDEN_INTEGER_REPEATS: Record<number, string> = {
  1: '55ef63eecb4b93d8', 2: '78479533409db9b7', 3: 'cce254f6180fa11b', 4: '4e0462b943c88541',
  5: '21979e9035febefc', 6: '8264aee5eaca9773', 7: '15ac421bf545df3a', 8: '936530b18c7d7352',
};

// 19) integer scale ≡ the old integer repeats, byte for byte
console.log('\n[19] scale: integers render exactly as repeats did');
for (let reps = 1; reps <= 8; reps++) {
  const h = createHash('sha256');
  for (const phase of [0, 0.25, 0.7])
    for (const mirror of [false, true])
      for (const reverse of [false, true])
        for (const bands of [0, 5])
          for (const extra of [{}, { hueRotate: 40, chroma: 1.3, contrast: 0.8, mixL: 0.4, mixH: 0.6 }, { noise: 0.5, noiseC: true, noiseH: true }]) {
            const r = buildGradientRamp(srcA, srcB, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, { ...DEFAULT_GENERATOR_PARAMS, repeats: reps, phase, mirror, reverse, bands, ...extra } as GeneratorParams, null, 7);
            h.update(JSON.stringify([r.ramp, r.final]));
          }
  const got = h.digest('hex').slice(0, 16);
  ok(got === GOLDEN_INTEGER_REPEATS[reps], `scale ${reps}: identical to the pre-change repeats ${reps} (${got})`);
}

// 20) fractional scale: its own picture, a partial last tile, continuous, a window below 1
console.log('\n[20] scale: fractions');
{
  const at = (repeats: number, phase = 0) => buildGradientRamp(srcA, srcA, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ repeats, phase }), null, 1).ramp;
  const one = at(1);
  const s25 = at(2.5);
  ok(maxChannelDiff(s25, at(2)) > 30 && maxChannelDiff(s25, at(3)) > 30, 'scale 2.5 is its own picture — not rounded to 2 or 3');
  // x·2.5 at the last texel is 2.5 → fract 0.5: the partial last tile ends at the source's middle
  const px = (c: RGB) => [c];
  ok(maxChannelDiffN(px(s25[255]), px(one[128])) < 1e-6, 'scale 2.5 ends on a partial tile: the last texel is the source at t = 0.5');
  // continuity: nudging the scale moves every texel a little, except the handful at a wrap
  let jumps = 0;
  for (const s of [0.6, 1.3, 2.5, 3.7, 7.25]) {
    const a = at(s);
    const b = at(s + 0.002);
    for (let i = 0; i < 256; i++) if (Math.max(Math.abs(a[i].r - b[i].r), Math.abs(a[i].g - b[i].g), Math.abs(a[i].b - b[i].b)) > 12) jumps++;
  }
  ok(jumps <= 5 * 8, `a small change in scale is a small change in the ramp (${jumps} texels jumped across five scales — only those at a tile's wrap may)`);
  const half = at(0.5);
  let windowOff = 0;
  for (let i = 0; i < 256; i++) windowOff = Math.max(windowOff, maxChannelDiffN(px(half[i]), px(one[Math.round((i / 255) * 0.5 * 255)])));
  ok(windowOff < 1e-6, 'scale 0.5 is a window: the first half of the gradient across the whole ramp');
  ok(maxChannelDiff(at(0), one) === 0 && maxChannelDiff(at(-3), one) === 0, 'scale ≤ 0 still means 1');
  ok(isIdentityAdjust(P({ repeats: 1 })) && !isIdentityAdjust(P({ repeats: 0.5 })) && !isIdentityAdjust(P({ repeats: 2.5 })), 'identity: scale 1 is, 0.5 and 2.5 are not');
}

// 21) mirror alternates tiles — the same picture as alternate-reversed tiles at twice the scale
console.log('\n[21] mirror: each tile there and back');
{
  const src = buildGradientRamp(srcA, srcA, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P(), null, 1).ramp;
  for (const [scale, phase] of [[1, 0], [1.5, 0], [2, 0.3]] as const) {
    const m = buildGradientRamp(srcA, srcA, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ repeats: scale, phase, mirror: true }), null, 1).ramp;
    let off = 0;
    for (let i = 0; i < 256; i++) {
      const x = 2 * ((i / 255) * scale + phase);
      const k = Math.floor(x);
      const f = k % 2 === 0 ? x - k : 1 - (x - k);
      off = Math.max(off, maxChannelDiffN([m[i]], [src[Math.round(f * 255)]]));
    }
    // neighbouring texels of a smooth ramp differ by ~1–2 levels; the alternation is what is tested
    ok(off <= 3, `mirror at scale ${scale}, phase ${phase} ≡ alternate tiles reversed at scale ${2 * scale} (worst ${off.toFixed(2)})`);
  }
  const m1 = buildGradientRamp(srcA, srcA, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ mirror: true }), null, 1).ramp;
  ok(maxChannelDiffN([m1[128]], [src[255]]) < 4 && maxChannelDiffN([m1[0]], [m1[255]]) < 1e-6, 'mirror at scale 1: the end colour in the middle, the start colour at both ends');
}

// 22) lightness: an additive L offset after contrast; 0 is exact
console.log('\n[22] lightness');
{
  const base = buildGradientRamp(srcA, srcB, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ contrast: 1.4, mixL: 0.3 }), null, 1);
  const zero = buildGradientRamp(srcA, srcB, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ contrast: 1.4, mixL: 0.3, lightness: 0 }), null, 1);
  const { lightness: _omit, ...noKey } = P({ contrast: 1.4, mixL: 0.3 });
  void _omit;
  const absent = buildGradientRamp(srcA, srcB, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, noKey as GeneratorParams, null, 1);
  ok(JSON.stringify(zero) === JSON.stringify(base) && JSON.stringify(absent) === JSON.stringify(base), 'lightness 0 (or no key at all) renders exactly as before');
  const up = buildGradientRamp(srcA, srcB, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, P({ contrast: 1.4, mixL: 0.3, lightness: 0.1 }), null, 1);
  let worst = 0;
  for (let i = 0; i < 256; i++) worst = Math.max(worst, Math.abs(up.final.L[i] - base.final.L[i] - 0.1));
  ok(worst < 1e-12, `lightness 0.1 moves every texel's L by exactly 0.1 after contrast (worst error ${worst.toExponential(1)})`);
  ok(!isIdentityAdjust(P({ lightness: 0.1 })) && isIdentityAdjust(P({ lightness: 0 })), 'identity: lightness 0 is, 0.1 is not');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
