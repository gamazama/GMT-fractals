/**
 * Guard: palette/core/rampTween — the OKLab cross-fade behind Gradient Explorer
 * "Variants" blending.
 *
 * The properties that matter to a caller dialling a slider between two variants:
 * the ENDPOINTS must be the variants themselves (a fade that does not reproduce
 * its own endpoints reads as a jump at 0 and 1), the middle must not depend on
 * which variant was named first, the output must keep the caller's geometry
 * (`a.length`) whatever `b` is, and no combination may leak NaN into a ramp that
 * ends up in a canvas.
 *
 *   [1] t = 0 reproduces `a`, t = 1 reproduces `b` (≤ 1 level, OKLab round trip)
 *   [2] t = 0.5 is symmetric: tween(a, b, .5) ≈ tween(b, a, .5)
 *   [3] monotone: the midpoint sits between the endpoints, never outside them
 *   [4] `t` outside [0, 1] clamps; non-finite `t` reads as 0
 *   [5] unequal lengths return `a.length`; empty inputs are handled
 *   [6] no NaN and no out-of-range channel anywhere in a swept blend
 *
 * Run: `npx tsx debug/test-palette-tween.mts` (also a link of `npm run test:palette`)
 */

import { tweenRamp } from '../palette/core/rampTween';
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

// --- deterministic PRNG so runs are reproducible (same generator as the stopfit harness) ---
let seed = 0x2545f491;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
};
const randRamp = (n: number): RGB[] =>
  Array.from({ length: n }, () => ({ r: rnd() * 255, g: rnd() * 255, b: rnd() * 255 }));

/** Max absolute per-channel difference between two equal-length ramps. */
const maxErr = (x: RGB[], y: RGB[]): number => {
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    e = Math.max(e, Math.abs(x[i].r - y[i].r), Math.abs(x[i].g - y[i].g), Math.abs(x[i].b - y[i].b));
  }
  return e;
};
const finite = (r: RGB[]): boolean =>
  r.every((c) => [c.r, c.g, c.b].every((v) => Number.isFinite(v) && v >= -0.001 && v <= 255.001));

const A = randRamp(256);
const B = randRamp(256);

console.log('[1] endpoints reproduce the inputs');
{
  const at0 = tweenRamp(A, B, 0);
  const at1 = tweenRamp(A, B, 1);
  ok(at0.length === 256, 't=0 keeps 256 texels');
  ok(maxErr(at0, A) <= 1, `t=0 reproduces a (max channel error ${maxErr(at0, A).toFixed(4)} ≤ 1)`);
  ok(maxErr(at1, B) <= 1, `t=1 reproduces b (max channel error ${maxErr(at1, B).toFixed(4)} ≤ 1)`);
}

console.log('\n[2] the midpoint does not care about argument order');
{
  const ab = tweenRamp(A, B, 0.5);
  const ba = tweenRamp(B, A, 0.5);
  ok(maxErr(ab, ba) <= 1, `tween(a,b,.5) ≈ tween(b,a,.5) (max channel error ${maxErr(ab, ba).toFixed(6)} ≤ 1)`);
}

console.log('\n[3] the midpoint lies between the endpoints');
{
  // Two flat ramps so "between" is unambiguous: every texel of the blend must sit
  // inside the interval its two sources define (a lerp that overshoots — or that
  // silently returns one endpoint — fails here).
  const dark: RGB[] = Array.from({ length: 32 }, () => ({ r: 20, g: 30, b: 40 }));
  const light: RGB[] = Array.from({ length: 32 }, () => ({ r: 200, g: 210, b: 220 }));
  const mid = tweenRamp(dark, light, 0.5);
  const inside = mid.every(
    (c) => c.r > 20 && c.r < 200 && c.g > 30 && c.g < 210 && c.b > 40 && c.b < 220,
  );
  ok(inside, 'the 0.5 blend of two flat ramps is strictly between them');
  const quarter = tweenRamp(dark, light, 0.25);
  ok(quarter[0].r < mid[0].r, 't=0.25 is closer to `a` than t=0.5 is');
}

console.log('\n[4] t clamps to [0, 1]');
{
  ok(maxErr(tweenRamp(A, B, -3), tweenRamp(A, B, 0)) === 0, 't = -3 clamps to 0');
  ok(maxErr(tweenRamp(A, B, 42), tweenRamp(A, B, 1)) === 0, 't = 42 clamps to 1');
  ok(maxErr(tweenRamp(A, B, NaN), tweenRamp(A, B, 0)) === 0, 't = NaN reads as 0');
  ok(maxErr(tweenRamp(A, B, Infinity), tweenRamp(A, B, 0)) === 0, 't = Infinity reads as 0');
}

console.log('\n[5] length rules');
{
  const short = randRamp(7);
  ok(tweenRamp(A, short, 0.5).length === 256, 'a 256 / b 7 → 256 texels (a wins)');
  ok(tweenRamp(short, A, 0.5).length === 7, 'a 7 / b 256 → 7 texels (a wins)');
  ok(maxErr(tweenRamp(short, A, 0), short) <= 1, 'unequal lengths still reproduce `a` at t=0');
  // b is sampled by t-POSITION, so its endpoints must land on a's endpoints.
  const bb = tweenRamp(A, short, 1);
  ok(
    Math.abs(bb[0].r - short[0].r) <= 1 && Math.abs(bb[255].r - short[6].r) <= 1,
    'at t=1 the resampled b keeps its own first and last texel at the ends',
  );
  ok(tweenRamp([], A, 0.5).length === 0, 'empty `a` → empty output');
  const copy = tweenRamp(A, [], 0.5);
  ok(copy.length === 256 && maxErr(copy, A) === 0, 'empty `b` → an exact copy of `a`, not black');
  ok(copy !== A && copy[0] !== A[0], 'the empty-`b` copy is a fresh array of fresh texels');
  ok(tweenRamp([{ r: 10, g: 20, b: 30 }], A, 1).length === 1, 'single-texel `a` samples b[0] without dividing by zero');
}

console.log('\n[6] a full sweep produces no NaN and nothing out of range');
{
  let clean = true;
  for (let s = 0; s <= 20; s++) if (!finite(tweenRamp(A, B, s / 20))) clean = false;
  // Extreme, out-of-gamut-adjacent inputs: pure primaries against pure secondaries.
  const hot: RGB[] = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 0, b: 0 },
  ];
  const cold: RGB[] = [
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
    { r: 255, g: 255, b: 255 },
  ];
  for (let s = 0; s <= 20; s++) if (!finite(tweenRamp(hot, cold, s / 20))) clean = false;
  ok(clean, '21 blend steps × 2 ramp pairs: every channel finite and within [0, 255]');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
