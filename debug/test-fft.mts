/**
 * Smoke for the worklet DSP core: the FFT and the windowed dB frame.
 *
 * The FFT is checked against a NAIVE DFT computed from the definition, not
 * against itself or a golden file. That is the whole point — a fast transform
 * that agrees with the textbook sum is correct; one that agrees with its own
 * previous output only proves it is stable.
 *
 *   tsx debug/test-fft.mts
 *
 * BLIND SPOTS CLOSED (2026-07-29 guard sweep), both of the same shape: a
 * fixture whose values made an assertion arithmetic-free.
 *
 *  - REAL PART WAS DEAD WEIGHT. Blocks [3]-[6] drove `SpectrumFrame` with
 *    `Math.sin(2πbi/N)`, which is odd about i=0, and the periodic Hann window is
 *    even about it — so the windowed frame is odd and its DFT is purely
 *    imaginary. Measured over the analysed half at N=2048: max|Re| = 9.2e-6
 *    against max|Im| = 5.1e+2, a ratio of 1.8e-8. Replacing the whole magnitude
 *    with `Math.abs(im[k])` therefore passed all ten assertions at exit 0.
 *    Block [4] now repeats the level assertion with a 0.7 rad phase offset,
 *    which puts both halves at the same order (measured ratio 0.84) and leaves
 *    the on-bin level bit-identical, so the expected value is unchanged.
 *    Falsified after adding: `Math.abs(im[k])` -> exit 1 (-2.3 dB), and
 *    `Math.abs(re[k])` -> exit 1 (-3.8 dB).
 *
 *  - `binCount` WAS UNASSERTED. `binCount = fftSize` — the whole mirrored upper
 *    half exposed as if it were real frequency content — passed here at exit 0,
 *    and so did test:band-analyser, test:audio-signal, test:filterbank and
 *    test:band-math. Nothing in the audio cluster held the frequencyBinCount
 *    convention that `bandMath.ts` independently recomputes as `fftSize / 2`
 *    (grep `const binCount` there) and `bandAnalyser.ts` sizes `power` from.
 *    Block [3] now asserts it directly.
 *
 * MARGINS, measured rather than assumed: block [4]'s level assertion runs at
 * 3.7e-7 dB against a 0.15 dB tolerance — very tight. Block [3]'s concentration
 * assertion runs at 166 dB against a >30 threshold, which is loose, but the
 * threshold is deliberately not tightened: 166 dB is the float32 noise floor,
 * not a signal property, and it is the WINDOW's absence that block [4] catches
 * (a rectangular window leaks nothing at all for an exactly-on-bin tone, so
 * removing the window would leave this difference infinite; the 6 dB coherent
 * gain shift is what goes red, in [4]).
 *
 * Vanishing-input check: the corpus is inline and the only external inputs are
 * the two modules under test, which fail at ESM link time — falsified by
 * renaming `WINDOW_CAL_DB`, SyntaxError before any assertion runs, exit 1.
 */

import { FFT } from '../engine/features/audioMod/dsp/fft';
import { SpectrumFrame, WINDOW_CAL_DB } from '../engine/features/audioMod/dsp/spectrumFrame';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps;

/** Coherent gain of the periodic Hann window this frame uses. */
const HANN_CG = 0.5;

/** Textbook DFT: X[k] = Σ x[n]·e^(-2πikn/N). O(N²), reference only. */
function naiveDft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  const outRe = new Float64Array(n);
  const outIm = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let sr = 0, si = 0;
    for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      const c = Math.cos(ang), s = Math.sin(ang);
      sr += re[t] * c - im[t] * s;
      si += re[t] * s + im[t] * c;
    }
    outRe[k] = sr; outIm[k] = si;
  }
  return { re: outRe, im: outIm };
}

console.log('\n[1] FFT agrees with a naive DFT on random input');
{
  // Deterministic pseudo-random — no Math.random, so a failure is reproducible.
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };

  for (const N of [8, 64, 512]) {
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let i = 0; i < N; i++) { re[i] = rnd(); im[i] = rnd(); }
    const ref = naiveDft(re, im);

    const fRe = Float32Array.from(re);
    const fIm = Float32Array.from(im);
    new FFT(N).transform(fRe, fIm);

    let worst = 0;
    for (let k = 0; k < N; k++) {
      worst = Math.max(worst, Math.abs(fRe[k] - ref.re[k]), Math.abs(fIm[k] - ref.im[k]));
    }
    // float32 accumulation over N terms; 1e-3 is comfortable at these sizes.
    assert(worst < 1e-3, `N=${N} matches the DFT to ${worst.toExponential(1)}`, worst);
  }
}

console.log('\n[2] FFT rejects non-power-of-two sizes rather than silently misbehaving');
{
  let threw = false;
  try { new FFT(100); } catch { threw = true; }
  assert(threw, 'a non-power-of-two size throws');
}

console.log('\n[3] a pure tone lands in its own bin');
{
  const N = 1024;
  const sf = new SpectrumFrame(N);
  const bin = 64;                       // exactly on a bin centre
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) x[i] = Math.sin((2 * Math.PI * bin * i) / N);
  sf.analyse(x);

  // frequencyBinCount convention: HALF the transform, because the upper half is
  // the conjugate mirror of the lower one. Asserted since 2026-07-29 — nothing
  // in the audio guard cluster held it, and `bandMath.ts` recomputes the same
  // quantity independently (grep `const binCount` there), so the two can drift.
  assert(sf.binCount === N >> 1, `binCount is fftSize/2, not fftSize`, sf.binCount);
  assert(sf.db.length === N >> 1, 'db is exactly binCount long', sf.db.length);

  let peak = 0;
  for (let k = 1; k < sf.binCount; k++) if (sf.db[k] > sf.db[peak]) peak = k;
  assert(peak === bin, `a bin-${bin} tone peaks at bin ${bin}`, peak);

  // Neighbours must be well down — that is the window doing its job.
  assert(sf.db[bin] - sf.db[bin + 4] > 30,
    'energy is concentrated, not smeared across the spectrum',
    (sf.db[bin] - sf.db[bin + 4]).toFixed(1));
}

console.log('\n[4] level calibration matches the AnalyserNode convention');
{
  // A full-scale sine exactly on a bin reads magnitude 0.5 through a
  // coherent-gain-1 window at /N normalisation (energy splits between +f and
  // -f). Hann's coherent gain is 0.5 and WINDOW_CAL_DB re-levels onto
  // Blackman's 0.42, so the expected peak is 20·log10(0.5 · 0.5) + CAL.
  const N = 2048;
  const sf = new SpectrumFrame(N);
  const bin = 100;
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) x[i] = Math.sin((2 * Math.PI * bin * i) / N);
  sf.analyse(x);

  const expected = 20 * Math.log10(0.5 * HANN_CG) + WINDOW_CAL_DB;
  assert(near(sf.db[bin], expected, 0.15),
    'a full-scale tone reads the Blackman-referenced level',
    { got: sf.db[bin].toFixed(2), expected: expected.toFixed(2) });

  assert(near(WINDOW_CAL_DB, -1.51, 0.01),
    'the Hann→Blackman offset is ≈ −1.51 dB', WINDOW_CAL_DB.toFixed(3));

  // Same tone, same expected level, phase offset by 0.7 rad. An on-bin tone's
  // level is phase-invariant, so this is the SAME number — but it is now
  // reached through a spectrum with both parts live rather than one whose real
  // half is numerically zero. See the header: without it, discarding `re`
  // entirely from the magnitude passed every assertion in this file.
  const xp = new Float32Array(N);
  for (let i = 0; i < N; i++) xp[i] = Math.sin((2 * Math.PI * bin * i) / N + 0.7);
  const sfp = new SpectrumFrame(N);
  sfp.analyse(xp);
  assert(near(sfp.db[bin], expected, 0.15),
    'the same tone phase-shifted reads the same level — real AND imaginary parts are load-bearing',
    { got: sfp.db[bin].toFixed(2), expected: expected.toFixed(2) });
}

console.log('\n[5] silence reads as -Infinity, which dbToUnit maps to 0');
{
  const sf = new SpectrumFrame(256);
  sf.analyse(new Float32Array(256));
  assert(Array.from(sf.db).every(v => v === -Infinity),
    'every bin of a silent frame is -Infinity, matching getFloatFrequencyData');
}

console.log('\n[6] the caller\'s buffer is never mutated');
{
  const N = 256;
  const sf = new SpectrumFrame(N);
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) x[i] = Math.sin(i * 0.1);
  const copy = Float32Array.from(x);
  sf.analyse(x);
  assert(x.every((v, i) => v === copy[i]),
    'windowing goes into scratch, so a ring buffer can be passed directly');
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
