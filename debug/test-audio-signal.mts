/**
 * Smoke for the two audio signal-conditioning features added for live use:
 *
 *  - AGC (`audio.agcEnabled`) — a slow-release peak follower that normalises
 *    the spectrum, so a quieter track still drives the rules without the user
 *    re-dialling every threshold mid-set.
 *  - Transient mode (`ModulationRule.mode: 'transient'`) — positive spectral
 *    flux instead of level, so a param punches ON each hit and falls back
 *    between them rather than lagging the attack and holding through sustain.
 *
 * Drives the real DSP against synthetic FFT frames.
 *
 * Since ADR-0110 analysis runs in an AudioWorklet, so there is no AnalyserNode
 * left to stub and no `update()` that reads one. This
 * harness drives the same two stages the engine does — `filterBank.analyse`
 * then `AutoGain.update` — which is strictly closer to the real path than
 * stubbing a node ever was, and does not depend on private field names.
 *
 *   tsx debug/test-audio-signal.mts
 */

const { modulationEngine } = await import('../engine/features/modulation/ModulationEngine');
const { filterBank, dbToUnit } = await import('../engine/features/audioMod/filterBank');
const { AutoGain } = await import('../engine/features/audioMod/dsp/autoGain');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const FFT = 2048;
const BINS = FFT / 2;
const SR = 48000;
// dBFS frame, as the worklet's spectrum stage produces.
const buf = new Float32Array(BINS);

const agc = new AutoGain();
filterBank.rebuild({ sampleRate: SR, fftSize: FFT, bandsPerOctave: 6 });

/** Loudest bin, on the 0..1 scale — what the AGC follows. Mirrors
 *  `BandAnalyser.peakLevel`. */
const peakOf = () => {
  let peakDb = -Infinity;
  for (let i = 0; i < buf.length; i++) if (buf[i] > peakDb) peakDb = buf[i];
  return dbToUnit(peakDb, DB_FLOOR, DB_CEIL);
};

/** One analysis frame: bank then AGC, the same order the engine runs them. */
const update = (agcEnabled = false, dt = 1 / 60, bandsPerOctave = 6, normalize = false) => {
  const opts = { sampleRate: SR, fftSize: FFT, bandsPerOctave };
  if (!filterBank.matches(opts)) filterBank.rebuild(opts);
  filterBank.analyse(buf, {
    dbFloor: DB_FLOOR, dbCeiling: DB_CEIL,
    normalize, tiltDbPerOct: 0, deltaSec: dt,
  });
  agc.update(agcEnabled, peakOf(), dt);
};
const getSignalGain = () => agc.value;

const DB_FLOOR = -90;
const DB_CEIL = -10;

/** Fill bins [0, upTo) at a normalised 0..1 level, rest silent. `level` is a
 *  position in the dB window, so the resulting band levels and peak read back
 *  as that same number — the scale the AGC and followers are calibrated to. */
const setBand = (level: number, upTo = 128) => {
  buf.fill(-Infinity);
  const db = DB_FLOOR + level * (DB_CEIL - DB_FLOOR);
  for (let i = 0; i < upTo; i++) buf[i] = db;
};

const resetAgc = () => { agc.reset(); };

// ── AGC ─────────────────────────────────────────────────────────────────────
console.log('\n[1] AGC off is a no-op');
{
  resetAgc();
  setBand(0.2);
  update(false, 1 / 60);
  assert(getSignalGain() === 1,
    'gain stays exactly 1 when AGC is off', getSignalGain());
}

console.log('\n[2] AGC normalises a quiet input toward the target');
{
  resetAgc();
  setBand(0.2);                       // peak 0.2 → target 0.8 wants ×4
  update(true, 1 / 60);
  assert(near(getSignalGain(), 4, 1e-3),
    'a 0.2 peak is boosted ×4 toward the 0.8 target', getSignalGain());
}

console.log('\n[3] AGC leaves an already-hot input alone');
{
  resetAgc();
  setBand(0.8);
  update(true, 1 / 60);
  assert(near(getSignalGain(), 1, 1e-3),
    'a peak already at target gets unity gain', getSignalGain());
}

console.log('\n[4] AGC boost is capped');
{
  resetAgc();
  setBand(0.05);                      // 0.8/0.05 = 16, over the ×8 ceiling
  update(true, 1 / 60);
  assert(getSignalGain() === 8,
    'boost clamps at ×8 instead of amplifying noise', getSignalGain());
}

console.log('\n[5] AGC holds through silence rather than ramping into it');
{
  resetAgc();
  setBand(0.8);
  update(true, 1 / 60);
  const before = getSignalGain();
  setBand(0);                         // gap between tracks
  for (let i = 0; i < 200; i++) update(true, 1 / 60);
  assert(getSignalGain() === before,
    'gain is frozen at silence, so the next downbeat does not detonate',
    { before, after: getSignalGain() });
}

console.log('\n[6] AGC attacks instantly, releases gradually');
{
  resetAgc();
  setBand(0.8);
  update(true, 1 / 60);
  setBand(0.2);                       // level drops — release should be slow
  update(true, 1 / 60);
  const oneFrame = getSignalGain();
  assert(oneFrame > 1 && oneFrame < 4,
    'one frame after a drop the gain is partway, not snapped to the new peak', oneFrame);

  for (let i = 0; i < 300; i++) update(true, 1 / 60);
  assert(near(getSignalGain(), 4, 1e-2),
    'it settles on the new level after the release window', getSignalGain());

  setBand(0.8);                       // a peak returns — must be instant
  update(true, 1 / 60);
  assert(near(getSignalGain(), 1, 1e-3),
    'a returning peak is caught in a single frame (instant attack)',
    getSignalGain());
}

// ── Transient mode ──────────────────────────────────────────────────────────
resetAgc();
// Drive the real path: update() reads the filterbank from `buf`, and
// processAudioSignal reads the bands. Testing through the engine rather than
// against a hand-rolled band array is what keeps this honest — the two used to
// compute different statistics.
const signalOf = (rule: any, dt = 1 / 60): number => {
  update(false, dt, 6, false);
  return (modulationEngine as any).processAudioSignal(rule, dt);
};

const mkRule = (mode: 'level' | 'transient') => ({
  id: `r-${mode}`, target: 't', source: 'audio', enabled: true, color: '#fff',
  lowHz: 0, highHz: 2400, thresholdMin: 0, thresholdMax: 1,
  attack: 0.1, decay: 0.3, smoothing: 0, gain: 1, offset: 0, mode,
});

console.log('\n[7] level mode follows loudness (unchanged behaviour)');
{
  const r = mkRule('level');
  setBand(0.6);
  signalOf(r);
  assert(near(signalOf(r), 0.6, 0.01), 'a sustained tone holds its level', signalOf(r));
}

console.log('\n[8] transient mode ignores sustain, fires on the attack');
{
  const r = mkRule('transient');
  setBand(0.6);
  signalOf(r);                        // first frame: no reference yet
  const sustained = signalOf(r);      // same level again
  assert(sustained === 0, 'a sustained tone produces no transient signal', sustained);

  setBand(0.9);                       // +0.3 in one frame — a hit
  const hit = signalOf(r);
  assert(hit > 0.5, 'a sharp rise produces a strong transient signal', hit);

  setBand(0.9);
  assert(signalOf(r) === 0, 'it falls straight back once the attack is over', signalOf(r));

  setBand(0.2);                       // decaying — negative flux
  assert(signalOf(r) === 0, 'a falling level never produces a signal', signalOf(r));
}

console.log('\n[9] transient response is frame-rate independent');
{
  // The same physical event (a 0.3 rise over 1/30 s) must read the same whether
  // it arrives as one 30 fps frame or is measured at 30 fps — the DSP works in
  // units per SECOND, so dt is what carries the difference.
  const a = mkRule('transient');
  setBand(0.5); signalOf(a, 1 / 30); signalOf(a, 1 / 30);
  setBand(0.8);
  const at30 = signalOf(a, 1 / 30);

  const b = mkRule('transient');
  setBand(0.5); signalOf(b, 1 / 60); signalOf(b, 1 / 60);
  setBand(0.65);                      // half the rise in half the time = same rate
  const at60 = signalOf(b, 1 / 60);

  assert(near(at30, at60, 0.02),
    'the same rate-of-change reads the same at 30 and 60 fps', { at30, at60 });
}

console.log('\n[10] switching modes mid-set does not fire a spurious hit');
{
  // Level mode must keep the flux reference fresh, or the first transient frame
  // after a switch measures against a stale value and spikes.
  const r = mkRule('level');
  setBand(0.2); signalOf(r);
  setBand(0.9); signalOf(r);          // big change, but we're in level mode
  (r as any).mode = 'transient';
  setBand(0.9);
  assert(signalOf(r) === 0,
    'no phantom spike on the first transient frame after a switch', signalOf(r));
}

// ── Display and signal must read the same numbers ───────────────────────────
// (filterBank is imported at the top now — the harness drives it directly.)

console.log('\n[11] the spectrum bar IS the rule signal');
{
  // The display draws filterBank.normalized[k] per band; a rule aggregates the
  // same array over its range. They diverged before (display max-pooled over
  // bins, rules took the mean), so a band could look strong and drive nothing.
  // Band-level aggregation itself is covered by debug/test-filterbank.mts.
  const r = mkRule('level');
  setBand(0.6, 128);
  const ruleSignal = signalOf(r);              // thresholdMin 0, gain 1 → raw level
  const [lo, hi] = filterBank.bandRangeForHz(r.lowHz, r.highHz);
  const displayBars = filterBank.aggregate(lo, hi);
  assert(near(ruleSignal, displayBars, 1e-6),
    'a rule and the bars it spans produce the same number',
    { ruleSignal, displayBars });
  assert(hi > lo, 'and the rule actually spans bands', { lo, hi });
}

// ── Uniform ownership (the flicker skip list) ───────────────────────────────
console.log('\n[12] modulated-uniform ownership tracking');
{
  const changed1 = modulationEngine.setOwnedUniforms(new Set(['uPower', 'uJulia']));
  assert(changed1 === true, 'a new set reports changed');
  assert(modulationEngine.getOwnedUniforms().sort().join() === 'uJulia,uPower',
    'the names are published', modulationEngine.getOwnedUniforms());

  const changed2 = modulationEngine.setOwnedUniforms(new Set(['uJulia', 'uPower']));
  assert(changed2 === false,
    'the same set in a different order reports UNCHANGED (no per-frame rebuild)');

  modulationEngine.setOwnedUniforms(new Set(['uPower']));
  assert(modulationEngine.getOwnedUniforms().join() === 'uPower',
    'a target that stops modulating drops out of the skip list — otherwise its '
    + 'uniform would stay frozen at the last modulated value',
    modulationEngine.getOwnedUniforms());

  modulationEngine.setOwnedUniforms(new Set());
  assert(modulationEngine.getOwnedUniforms().length === 0, 'empties cleanly');
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
