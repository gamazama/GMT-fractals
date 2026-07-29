/**
 * Smoke for bandMath — the pure geometry both threads build independently.
 *
 * These assertions used to live in `test-filterbank.mts`, driving them through
 * `FilterBank.analyse()`. That method was the main thread's copy of the
 * bins→bands pipeline; the worklet took the real work over (ADR-0110) and the
 * copy went unused, so the tests were exercising code nothing ran. They point
 * at `bandMath` now, which is what both the worklet and `FilterBank.rebuild`
 * actually call.
 *
 *   tsx debug/test-band-math.mts
 *
 * BLIND SPOTS CLOSED (2026-07-29 guard sweep). Two, both found by breaking
 * bandMath.ts and watching this file stay green at exit 0:
 *
 *  - `resolutionLimited` COULD BE FALSE ON EVERY BAND. Block [3]'s check was
 *    one-sided — it took the highest flagged centre with a `flagged.length ? …
 *    : 0` fallback, so an EMPTY flagged set produced `highest = 0` and
 *    `0 < limit × 1.2` was trivially true. Hardcoding `resolutionLimited:
 *    false` passed while the message printed "(0 of 56)". The counts the block
 *    already prints are now asserted instead: at 1/6 octave, 48 kHz, they are
 *    19 at fft 2048, 13 at 4096, 7 at 8192 (1 at 16384), and the 25 Hz band is
 *    narrower than one bin at every one of them. Asserting the count is
 *    non-zero AND strictly falling as the transform grows closes both
 *    directions: all-false gives 0/0/0, all-true gives 56/56/56.
 *
 *  - `BANK_MAX_HZ` WAS NOT ENFORCED. Block [1] compared the top band against
 *    nyquist (24 kHz at 48 kHz), which is 9.6 kHz above the declared ceiling —
 *    so replacing `Math.min(BANK_MAX_HZ, nyquist * 0.95)` with plain `nyquist`
 *    passed, and the bank silently ran to 22.8 kHz. Both halves of that
 *    `Math.min` are now pinned: the ceiling directly, and the nyquist guard at
 *    a sample rate where it is the binding term.
 *
 * Controls that were already healthy, confirmed by breaking them: dropping the
 * kernel's unit-sum normalisation -> exit 1 (worst 140.76); a rectangular
 * kernel instead of Hann -> exit 1 on the edge-to-centre shape; moving
 * `TILT_REF_HZ` from BANK_MIN_HZ to 1000 -> exit 1 on two assertions.
 */

import {
    buildBandTable, buildTilt, clampTilt, dbToUnit,
    BANK_MIN_HZ, BANK_MAX_HZ, TILT_MAX_DB_PER_OCT,
} from '../engine/features/audioMod/bandMath';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const SR = 48000;
const mk = (fftSize = 4096, bandsPerOctave = 6) =>
  buildBandTable(SR, fftSize, bandsPerOctave);

// ── Band layout ─────────────────────────────────────────────────────────────
console.log('\n[1] bands are equal musical width');
{
  const { bands } = mk(4096, 6);
  const ratios = bands.slice(1).map((x, i) => x.centerHz / bands[i].centerHz);
  const expected = Math.pow(2, 1 / 6);
  assert(ratios.every(r => near(r, expected, 1e-9)),
    'every adjacent pair is one sixth-octave apart', ratios.slice(0, 3));
  assert(near(bands[0].centerHz, BANK_MIN_HZ, 1e-9),
    'the bank starts at the declared minimum', bands[0].centerHz);
  // Against BANK_MAX_HZ, not nyquist. Nyquist is 24kHz here — 9.6kHz of slack
  // above the declared ceiling — so the loose form passed a bank that ran to
  // 22.8kHz. Measured healthy top: 14367.5Hz, the last 1/6-octave step at or
  // below 16000.
  assert(bands[bands.length - 1].centerHz <= BANK_MAX_HZ,
    'and never exceeds the declared band ceiling', bands[bands.length - 1].centerHz);

  // The OTHER half of `Math.min(BANK_MAX_HZ, nyquist * 0.95)`, which the 48kHz
  // case cannot reach because BANK_MAX_HZ binds first. 24kHz is chosen because
  // it is a rate where the two candidate ceilings actually produce different
  // tables — measured, top band 10159.4Hz with the guard against 11403.5Hz
  // without, so this discriminates where 44.1/48/32kHz do not.
  const low = buildBandTable(24000, 4096, 6);
  assert(low.bands[low.bands.length - 1].centerHz <= 12000 * 0.95,
    'a low sample rate keeps the top band inside the nyquist guard band',
    low.bands[low.bands.length - 1].centerHz);
}

console.log('\n[2] bass gets as many bands as treble (the linear-FFT complaint)');
{
  const { bands } = mk(4096, 6);
  const inOctave = (lo: number, hi: number) =>
    bands.filter(x => x.centerHz >= lo && x.centerHz < hi).length;
  const bassOct = inOctave(40, 80);
  const trebleOct = inOctave(8000, 16000);
  assert(bassOct === trebleOct,
    'the 40-80Hz octave and the 8-16kHz octave hold the same band count',
    { bassOct, trebleOct });
  assert(bassOct === 6, 'which is bandsPerOctave', bassOct);
}

console.log('\n[3] resolution limit is reported, not hidden');
{
  const flaggedCounts: number[] = [];
  for (const [fft, expectAbout] of [[2048, 203], [4096, 101], [8192, 51]] as const) {
    const { bands, resolutionLimitHz } = mk(fft, 6);
    assert(Math.abs(resolutionLimitHz - expectAbout) < expectAbout * 0.05,
      `1/6 octave @ ${fft} is limited below ~${expectAbout}Hz`, resolutionLimitHz);
    const flagged = bands.filter(x => x.resolutionLimited);
    const highest = flagged.length ? Math.max(...flagged.map(x => x.centerHz)) : 0;
    assert(highest < resolutionLimitHz * 1.2,
      `  and only bands under that limit are flagged (${flagged.length} of ${bands.length})`,
      highest);

    // The assertion above is satisfied by an EMPTY flagged set — `highest`
    // falls back to 0 and 0 is under any limit. See the header: that is how
    // `resolutionLimited: false` on every band passed. The 25Hz band is
    // narrower than one bin at every size tested here, measured.
    assert(bands[0].resolutionLimited,
      `  and the ${bands[0].centerHz.toFixed(0)}Hz band IS flagged, so the set is not empty`,
      `${flagged.length} of ${bands.length}`);
    flaggedCounts.push(flagged.length);
  }

  // Direction, not just presence. A constant `true` would keep every count at
  // the band total; a constant `false` would keep them all at zero. Measured
  // healthy: 19, 13, 7.
  assert(flaggedCounts[0] > flaggedCounts[1] && flaggedCounts[1] > flaggedCounts[2],
    'a longer transform strictly shrinks the resolution-limited region',
    flaggedCounts);
}

console.log('\n[4] every band covers at least one bin, none run past the array');
{
  for (const fft of [2048, 4096, 8192]) {
    const { bands } = mk(fft, 12);
    const binCount = fft / 2;
    assert(bands.every(x => x.binHi > x.binLo), `fft ${fft}: no empty band`);
    assert(bands.every(x => x.binHi <= binCount && x.binLo >= 0),
      `fft ${fft}: no band indexes past the bin array`);
  }
}

// ── Kernels ─────────────────────────────────────────────────────────────────
console.log('\n[5] Hann kernels: unit sum, zero at the edges, overlapping');
{
  const { bands, kernel } = mk(4096, 6);

  // Unit SUM (not unit energy) is what keeps the weighted power mean on the
  // same 0..1 scale as the rectangular mean it replaced.
  let worst = 0;
  for (const band of bands) {
    let s = 0;
    for (let j = 0; j < band.kernelLength; j++) s += kernel[band.kernelOffset + j];
    worst = Math.max(worst, Math.abs(s - 1));
  }
  assert(worst < 1e-5, 'every band kernel sums to 1', worst);

  // Hann tapers to zero at its support edges — that is the leak suppression.
  const wide = bands.filter(x => x.kernelLength >= 6);
  assert(wide.length > 0, 'there are bands wide enough to shape');
  assert(wide.every(x => kernel[x.kernelOffset] < kernel[x.kernelOffset + (x.kernelLength >> 1)]),
    'and weights rise from the edge toward the centre');

  // 50% overlap: adjacent supports must share bins, which is what makes a
  // sweep crossfade between bands instead of stepping.
  const i = bands.findIndex(x => x.centerHz > 2000);
  assert(bands[i + 1].binLo < bands[i].binHi,
    'adjacent bands share bins', { a: [bands[i].binLo, bands[i].binHi], b: [bands[i + 1].binLo, bands[i + 1].binHi] });
}

// ── dB window ───────────────────────────────────────────────────────────────
console.log('\n[6] dB→unit mapping');
{
  const F = -90, C = -10;
  assert(dbToUnit(F, F, C) === 0, 'the floor maps to 0');
  assert(dbToUnit(C, F, C) === 1, 'the ceiling maps to 1');
  assert(near(dbToUnit((F + C) / 2, F, C), 0.5, 1e-9),
    'and the midpoint to 0.5 — the same ramp getByteFrequencyData applied');
  assert(dbToUnit(-Infinity, F, C) === 0, 'a silent bin is 0, not NaN');
  assert(dbToUnit(0, F, C) === 1, 'above-ceiling clamps');
  assert(dbToUnit(-200, F, C) === 0, 'below-floor clamps');
}

// ── Spectral tilt ───────────────────────────────────────────────────────────
console.log('\n[7] spectral tilt: a fixed ramp that only ever boosts');
{
  const { bands } = mk(4096, 6);

  const none = buildTilt(bands, 0);
  assert(Array.from(none).every(v => v === 0), 'slope 0 is a flat zero curve');

  const SLOPE = 3;
  const tilt = buildTilt(bands, SLOPE);
  let worst = 0;
  for (let k = 0; k < bands.length; k++) {
    worst = Math.max(worst, Math.abs(tilt[k] - SLOPE * Math.log2(bands[k].centerHz / BANK_MIN_HZ)));
  }
  assert(worst < 1e-6, 'every band gets exactly slope×log2(f/25) dB', worst);

  // Referenced at BANK_MIN_HZ: the bass is untouched, never cut. A
  // mid-referenced tilt would attenuate 25Hz by ~16dB and gut the kick.
  assert(tilt[0] === 0, 'the lowest band is exactly 0 — boost only, never cut');
  assert(tilt.every((v, i) => i === 0 || v > tilt[i - 1]),
    'and the curve rises monotonically');

  assert(clampTilt(999) === TILT_MAX_DB_PER_OCT, 'an absurd slope clamps to the max');
  assert(clampTilt(-5) === 0, 'a negative slope clamps to 0 — this never attenuates');
  assert(clampTilt(NaN) === 0, 'NaN is treated as no tilt');
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
