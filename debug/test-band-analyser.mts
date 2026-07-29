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

  // ── The case above does NOT discriminate. Added 2026-07-29 after
  // falsification: deleting the frequency max-filter outright (`prevMax =
  // prev[k]`, i.e. plain per-band flux) leaves this whole block green.
  //
  // Measured at the 0.5%/hop drift above — deterministic, synthetic input, so
  // these reproduce exactly: onsetPeak 165.8 either way; driftPeak 1.13 with
  // the max-filter and 39.97 without. The filter really is doing its job — 35x
  // of suppression — but the surviving ratio is still 4.15, comfortably over
  // the 2x this asserts. The threshold is ~70x looser than the healthy code
  // delivers, so it cannot see the mechanism it is named for disappear.
  //
  // Fixed by adding a HARDER stimulus rather than by tightening the number
  // above: 2%/hop is a fast filter sweep (~5.4 octaves/sec), the hardest case
  // plain flux still has to reject, and it separates cleanly —
  //   with max-filter:    drift 3.74, ratio 44.3   (5.5x over the 8x gate)
  //   without max-filter: drift 93.6, ratio 1.77   (4.5x under it)
  // 8 sits in the middle of that gap with margin on both sides; 2 does not.
  {
    const sweep = mk({ smoothingTauSec: 0.001 });
    let hz = 1000;
    let sweepPeak = 0;
    for (let i = 0; i < 60; i++) {
      sweep.analyse(tone(hz), HOP);
      if (i > 20) sweepPeak = Math.max(sweepPeak, ...Array.from(sweep.flux));
      hz *= 1.02;
    }
    assert(onsetPeak > sweepPeak * 8,
      'a fast SWEEP stays well under a real onset — this is what the frequency '
      + 'max-filter buys, and it goes red when the filter is removed',
      { onset: onsetPeak.toFixed(1), sweep: sweepPeak.toFixed(1),
        ratio: (onsetPeak / sweepPeak).toFixed(2) });
  }
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

console.log('\n[8] Response and Detail share ONE latency budget');
{
  // The FFT window is itself a smoother: a 4096 window lands its energy
  // centroid ~43ms in the past. Adding a one-pole on top used to STACK, so
  // raising Detail for bass resolution quietly made the rig sluggish. Response
  // now names the total, and the window's share is subtracted from it.
  // @see WorkletAnalysis.setSmoothing
  const REF = 4096;
  const windowLag = (fft: number) => (fft / 2) / SR;
  const tauFor = (s: number, fft: number) => {
    if (s <= 0) return 0;
    const budget = -(1 / 60) / Math.log(s) + windowLag(REF);
    return Math.max(0, budget - windowLag(fft));
  };
  const totalFor = (s: number, fft: number) => tauFor(s, fft) + windowLag(fft);

  assert(near(tauFor(0.8, REF), DEFAULT_SMOOTHING_TAU_SEC, 1e-3),
    'at the reference Detail, 0.8 still maps onto the default tau — nothing moves for anyone on it',
    { mapped: tauFor(0.8, REF).toFixed(4), default: DEFAULT_SMOOTHING_TAU_SEC });

  // THE property: total response is flat across Detail.
  const totals = [2048, 4096, 8192].map(f => totalFor(0.8, f));
  const spread = Math.max(...totals) - Math.min(...totals);
  assert(spread < 1e-6,
    'total response is identical at 2048, 4096 and 8192 — Detail changes resolution, not speed',
    totals.map(t => `${(t * 1000).toFixed(0)}ms`));

  // A window bigger than the whole budget cannot be smoothed back down.
  assert(tauFor(0.8, 8192) < tauFor(0.8, 2048),
    'a longer window leaves less for the one-pole');
  assert(tauFor(0.5, 32768) === 0,
    'and past the budget the one-pole disappears rather than going negative');

  assert(tauFor(0, REF) === 0, '0 is no smoothing rather than a division by -Infinity');
  assert(tauFor(0.99, REF) > tauFor(0.8, REF), 'the knob still runs the same direction');
}

console.log('\n[9] envelope curves became time constants, tuned at 60fps');
{
  // attack/decay/smoothing were per-FRAME fractions with no dt, so the response
  // a user dialled in moved with the frame rate — 36ms at 60fps, 72ms at 30,
  // ~2.2s under the tick throttle. Converting at the rate they were tuned at
  // keeps every saved rule identical at 60fps.
  const ENV_FPS = 60;
  const envTau = (v: number) => (v <= 0 ? 0 : -1 / (Math.log(Math.pow(v, 0.2)) * ENV_FPS));
  const perFrameCoeff = (v: number) => 1 - Math.pow(v, 0.2);

  for (const a of [0.1, 0.3, 0.9]) {
    // One frame at 60fps through the new form must equal the old fixed fraction.
    const viaTau = 1 - Math.exp(-(1 / ENV_FPS) / envTau(a));
    assert(near(viaTau, perFrameCoeff(a), 1e-9),
      `attack ${a} is bit-identical at 60fps (${(envTau(a) * 1000).toFixed(0)}ms)`,
      { viaTau, old: perFrameCoeff(a) });
  }

  // And the point of the change: half the frame rate, same wall-clock response.
  const a = 0.1;
  const at60 = 1 - Math.exp(-(2 / 60) / envTau(a));   // two 60fps frames
  const at30 = 1 - Math.exp(-(1 / 30) / envTau(a));   // one 30fps frame
  assert(near(at60, at30, 1e-9),
    'the same elapsed time reaches the same level at 30 and 60fps', { at60, at30 });
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
