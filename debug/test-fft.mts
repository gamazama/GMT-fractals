/**
 * Smoke for the worklet DSP core: the FFT and the windowed dB frame.
 *
 * The FFT is checked against a NAIVE DFT computed from the definition, not
 * against itself or a golden file. That is the whole point — a fast transform
 * that agrees with the textbook sum is correct; one that agrees with its own
 * previous output only proves it is stable.
 *
 *   tsx debug/test-fft.mts
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
