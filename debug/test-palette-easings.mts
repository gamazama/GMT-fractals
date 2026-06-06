/**
 * Easing-library harness — verifies palette/core/easings.ts:
 *
 *   • completeness: 25 named curves; getEasing resolves every name; bad name → linear.
 *   • endpoints EXACT: every curve has f(0) === 0 and f(1) === 1 (load-bearing —
 *     buildColorBoxRamp relies on start/end being hit precisely at the texel ends).
 *   • range: in/out/inOut variants stay within a sane band (Back overshoots, the rest don't).
 *   • monotonicity: every non-Back curve is non-decreasing on [0,1]; Back is NOT.
 *   • linear is the identity.
 *
 * Run: npx tsx debug/test-palette-easings.mts
 */

import { EASINGS, EASING_NAMES, MONOTONIC_EASINGS, getEasing, type EasingName } from '../palette/core/easings';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
};

console.log('Easings:');

// 0) Completeness.
ok(EASING_NAMES.length === 25, `25 named curves (got ${EASING_NAMES.length})`);
ok(Object.keys(EASINGS).length === 25, 'EASINGS has an entry per name');
ok(EASING_NAMES[0] === 'linear', 'index 0 is linear (stable default)');
ok(
  getEasing('definitely-not-a-curve' as EasingName) === EASINGS.linear,
  'getEasing falls back to linear on an unknown name',
);

// 1) Endpoints exact (to floating-point precision — transcendental curves like Sine
//    land within ~1e-16 of 0/1, which is byte-exact once mapped through a ramp).
{
  const EPS = 1e-9;
  let allExact = true;
  for (const name of EASING_NAMES) {
    const f = getEasing(name);
    if (Math.abs(f(0)) > EPS || Math.abs(f(1) - 1) > EPS) {
      allExact = false;
      console.error(`    ${name}: f(0)=${f(0)}, f(1)=${f(1)}`);
    }
  }
  ok(allExact, 'every curve hits f(0)=0 and f(1)=1 exactly (≤1e-9)');
}

// 2) linear is the identity.
{
  let identity = true;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    if (Math.abs(EASINGS.linear(t) - t) > 1e-12) identity = false;
  }
  ok(identity, 'linear(t) === t');
}

// 3) Monotonicity where expected (and overshoot where expected).
{
  const SAMPLES = 256;
  const sample = (f: (t: number) => number) => {
    const a: number[] = [];
    for (let i = 0; i < SAMPLES; i++) a.push(f(i / (SAMPLES - 1)));
    return a;
  };
  const isMonotonic = (a: number[]) => {
    for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1] - 1e-9) return false;
    return true;
  };

  let monoOK = true;
  for (const name of EASING_NAMES) {
    if (!MONOTONIC_EASINGS.has(name)) continue;
    if (!isMonotonic(sample(getEasing(name)))) {
      monoOK = false;
      console.error(`    ${name} should be monotonic but dips`);
    }
  }
  ok(monoOK, 'all non-Back curves are monotonic non-decreasing');

  // Back family must overshoot SOMEWHERE outside [0,1] (anticipation/follow-through).
  let backOvershoots = true;
  for (const name of ['inBack', 'outBack', 'inOutBack'] as EasingName[]) {
    const a = sample(getEasing(name));
    const overshoots = a.some((v) => v < -1e-6 || v > 1 + 1e-6);
    if (!overshoots) {
      backOvershoots = false;
      console.error(`    ${name} should overshoot [0,1] but stays inside`);
    }
  }
  ok(backOvershoots, 'Back family overshoots [0,1] (NOT monotonic — by design)');

  // Non-Back curves never stray far outside [0,1] (numeric sanity).
  let bounded = true;
  for (const name of EASING_NAMES) {
    if (!MONOTONIC_EASINGS.has(name)) continue;
    const a = sample(getEasing(name));
    if (a.some((v) => v < -1e-6 || v > 1 + 1e-6)) {
      bounded = false;
      console.error(`    ${name} leaves [0,1]`);
    }
  }
  ok(bounded, 'non-Back curves stay within [0,1]');
}

// 4) inOut symmetry: f(0.5) ≈ 0.5 for the inOut variants (they cross at the midpoint).
{
  let symmetric = true;
  for (const name of EASING_NAMES) {
    if (!name.startsWith('inOut')) continue;
    if (Math.abs(getEasing(name)(0.5) - 0.5) > 1e-9) {
      symmetric = false;
      console.error(`    ${name}(0.5) = ${getEasing(name)(0.5)}`);
    }
  }
  ok(symmetric, 'inOut variants pass through (0.5, 0.5)');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
