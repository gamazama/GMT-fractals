/**
 * Smoke for BandAnalyser — the stateful DSP that will run on the audio thread.
 *
 * The properties that matter are the ones that make it safe to move OFF the
 * main thread: smoothing and flux must mean the same thing regardless of how
 * often anything is called, and the first hop must not fire a phantom onset.
 *
 *   tsx debug/test-band-analyser.mts
 */

import { BandAnalyser, DEFAULT_SMOOTHING_TAU_SEC } from '../engine/features/audioMod/dsp/bandAnalyser';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps;

const SR = 48000;
const FFT = 2048;

const mk = (over: Partial<Parameters<typeof BandAnalyser.prototype.reconfigure>[0]> = {}) =>
  new BandAnalyser({
    sampleRate: SR, fftSize: FFT, bandsPerOctave: 6,
    dbFloor: -90, dbCeiling: -10, tiltDbPerOct: 0,
    smoothingTauSec: DEFAULT_SMOOTHING_TAU_SEC,
    ...over,
  });

/** `fftSize` samples of a sine at `hz`, amplitude `amp`. */
const tone = (hz: number, amp = 1) => {
  const x = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) x[i] = amp * Math.sin((2 * Math.PI * hz * i) / SR);
  return x;
};
const silence = () => new Float32Array(FFT);

const HOP = 256 / SR;   // the quantum-aligned hop the processor uses at 48k

console.log('\n[1] a tone lands in the band that contains it');
{
  const a = mk();
  for (let i = 0; i < 200; i++) a.analyse(tone(1000), HOP);
  let best = 0;
  for (let k = 1; k < a.levels.length; k++) if (a.levels[k] > a.levels[best]) best = k;
  const b = a.bands[best];
  assert(b.lowHz <= 1000 && b.highHz >= 1000,
    'the loudest band brackets 1kHz', { lowHz: b.lowHz.toFixed(0), highHz: b.highHz.toFixed(0) });
}

console.log('\n[2] the first hop is not a phantom onset');
{
  const a = mk();
  a.analyse(tone(1000), HOP);
  assert(Array.from(a.flux).every(v => v === 0),
    'hop one produces no flux anywhere — nothing to difference against');
}

console.log('\n[3] smoothing is rate-INDEPENDENT (the AnalyserNode bug, fixed)');
{
  // The same wall-clock elapsed time must reach the same level, whether it
  // arrived as many small hops or few large ones. AnalyserNode could not do
  // this: its coefficient was per-CALL, so the effective time constant moved
  // with the caller's rate.
  const fast = mk();
  const slow = mk();
  const TOTAL = 0.2;                       // seconds of audio
  const fastHop = 0.002, slowHop = 0.02;   // 10x apart
  for (let t = 0; t < TOTAL; t += fastHop) fast.analyse(tone(1000), fastHop);
  for (let t = 0; t < TOTAL; t += slowHop) slow.analyse(tone(1000), slowHop);

  let best = 0;
  for (let k = 1; k < fast.levels.length; k++) if (fast.levels[k] > fast.levels[best]) best = k;
  assert(near(fast.levels[best], slow.levels[best], 0.02),
    'a 10x difference in hop rate reaches the same level after the same time',
    { fast: fast.levels[best].toFixed(4), slow: slow.levels[best].toFixed(4) });
}

console.log('\n[4] flux is a RATE — hop-independent for attacks the hop can resolve');
{
  /**
   * Peak flux across a rise of `attackSec` that is linear in dB.
   *
   * Linear in dB, not in amplitude, and that distinction is the test. Levels
   * are a dB scale, so a linear AMPLITUDE ramp is front-loaded in level terms
   * — most of its dB happens in the first instants — and a coarse hop averages
   * that spike away while a fine one catches it. That would measure the ramp's
   * shape, not the analyser. A constant dB/s rise is what "a steady attack"
   * actually means, and both hops must agree on its rate.
   *
   * The pre-roll matters too: ramping up from digital silence is a step in
   * level terms no matter how gentle the amplitude ramp, because
   * dbToUnit(-Infinity) is 0 and the first audible sample is already well
   * above it. Start from an audible floor so the rise is the only event.
   */
  const peakFluxForRamp = (hop: number, attackSec: number) => {
    const a = mk({ smoothingTauSec: 0.0001 });  // effectively off at both hops
    const LO = 0.05, HI = 1.0;
    for (let i = 0; i < 100; i++) a.analyse(tone(1000, LO), hop);   // settle
    let peak = 0;
    const steps = Math.ceil(attackSec / hop);
    for (let i = 1; i <= steps; i++) {
      a.analyse(tone(1000, LO * Math.pow(HI / LO, i / steps)), hop);
      peak = Math.max(peak, ...Array.from(a.flux));
    }
    return peak;
  };

  // A 50ms attack — slower than either hop, so both resolve the rise and must
  // agree on how fast it was. A per-hop DELTA would report the larger hop as a
  // bigger onset purely because more time passed inside it.
  const small = peakFluxForRamp(0.002, 0.05);
  const large = peakFluxForRamp(0.008, 0.05);
  assert(small > 0 && large > 0, 'both hop sizes register the attack',
    { small: small.toFixed(1), large: large.toFixed(1) });
  assert(Math.abs(small - large) / Math.max(small, large) < 0.3,
    'a 4x hop change moves the reported rate by under 30%',
    { small: small.toFixed(1), large: large.toFixed(1) });
}

console.log('\n[4b] the honest limit: an attack FASTER than the hop reads low');
{
  // Documented, not a defect. A step's true rate is unbounded, so measuring it
  // over a longer window necessarily reports less — dividing by dt cannot
  // recover information the window never had. In production the hop is fixed
  // (256 samples), so this is a constant, and the rate form still earns its
  // keep: it removes the 44.1k-vs-48k hop difference and makes
  // TRANSIENT_FULL_SCALE mean "level per second" rather than "level per
  // whatever interval happened to elapse".
  const stepFlux = (hop: number) => {
    const a = mk({ smoothingTauSec: 0.001 });
    for (let i = 0; i < 50; i++) a.analyse(silence(), hop);
    a.analyse(tone(1000), hop);
    return Math.max(...Array.from(a.flux));
  };
  const fast = stepFlux(0.004);
  const slow = stepFlux(0.016);
  assert(fast > slow * 2,
    'a 4x longer hop reports an instantaneous step as roughly 4x slower',
    { fast: fast.toFixed(1), slow: slow.toFixed(1) });
}

console.log('\n[5] SuperFlux suppresses a drifting tone, keeps a real onset');
{
  const drift = mk({ smoothingTauSec: 0.001 });
  // A tone sliding upward a little each hop — vibrato-shaped, not an onset.
  let hz = 1000;
  let driftPeak = 0;
  for (let i = 0; i < 60; i++) {
    drift.analyse(tone(hz), HOP);
    if (i > 20) driftPeak = Math.max(driftPeak, ...Array.from(drift.flux));
    hz *= 1.005;
  }

  const onset = mk({ smoothingTauSec: 0.001 });
  for (let i = 0; i < 40; i++) onset.analyse(silence(), HOP);
  onset.analyse(tone(1000), HOP);
  const onsetPeak = Math.max(...Array.from(onset.flux));

  assert(onsetPeak > driftPeak * 2,
    'a real onset reads at least twice a drifting tone',
    { onset: onsetPeak.toFixed(1), drift: driftPeak.toFixed(1) });
}

console.log('\n[6] a geometry change drops the reference frame, not the config');
{
  const a = mk();
  for (let i = 0; i < 50; i++) a.analyse(tone(1000), HOP);
  a.reconfigure({ ...a.config, bandsPerOctave: 12 });
  a.analyse(tone(1000), HOP);
  assert(Array.from(a.flux).every(v => v === 0),
    'the first hop after a reshape is not one giant onset');
  assert(a.bands.length > 50, 'and the new geometry is in place', a.bands.length);
}

console.log('\n[7] tilt lifts the highs without a rebuild');
{
  const a = mk();
  for (let i = 0; i < 100; i++) a.analyse(tone(8000), HOP);
  const before = Math.max(...Array.from(a.levels));
  a.reconfigure({ ...a.config, tiltDbPerOct: 6 });
  for (let i = 0; i < 100; i++) a.analyse(tone(8000), HOP);
  const after = Math.max(...Array.from(a.levels));
  assert(after > before, 'an 8kHz tone reads higher with tilt on',
    { before: before.toFixed(3), after: after.toFixed(3) });
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
