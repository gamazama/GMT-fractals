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
 * Both run headless: the WebAudio nodes are stubbed and the real DSP is
 * exercised against synthetic FFT frames.
 *
 *   tsx debug/test-audio-signal.mts
 */

const { audioAnalysisEngine } = await import('../engine/features/audioMod/AudioAnalysisEngine');
const { modulationEngine } = await import('../engine/features/modulation/ModulationEngine');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const FFT = 2048;
const BINS = FFT / 2;
// dBFS frame, as getFloatFrequencyData delivers.
const buf = new Float32Array(BINS);
// Stub the graph: update() only needs an analyser that reports its size and
// fills dataArray, and we fill it ourselves so each test frame is exact.
//
// Poked on the ANALYSIS half, not the facade. `AudioAnalysisEngine` is pure
// delegation since ADR-0110 — the analyser, the read buffer and the AGC state
// all live on `AudioAnalysis`, and stubbing the facade would write to a dead
// object while the real one stayed empty (which is exactly what it did).
// Reaching for `.analysis` keeps this a white-box harness over the half that
// the worklet migration will replace wholesale.
const analysis = (audioAnalysisEngine as any).analysis;
analysis.analyser = {
  fftSize: FFT,
  frequencyBinCount: BINS,
  getFloatFrequencyData: () => { /* buf is pre-filled */ },
};
analysis.dataArray = buf;
analysis.desiredFftSize = FFT;

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

const resetAgc = () => {
  analysis.agcPeak = 0;
  analysis.agcGain = 1;
};

// ── AGC ─────────────────────────────────────────────────────────────────────
console.log('\n[1] AGC off is a no-op');
{
  resetAgc();
  setBand(0.2);
  audioAnalysisEngine.update(false, 1 / 60);
  assert(audioAnalysisEngine.getSignalGain() === 1,
    'gain stays exactly 1 when AGC is off', audioAnalysisEngine.getSignalGain());
}

console.log('\n[2] AGC normalises a quiet input toward the target');
{
  resetAgc();
  setBand(0.2);                       // peak 0.2 → target 0.8 wants ×4
  audioAnalysisEngine.update(true, 1 / 60);
  assert(near(audioAnalysisEngine.getSignalGain(), 4, 1e-3),
    'a 0.2 peak is boosted ×4 toward the 0.8 target', audioAnalysisEngine.getSignalGain());
}

console.log('\n[3] AGC leaves an already-hot input alone');
{
  resetAgc();
  setBand(0.8);
  audioAnalysisEngine.update(true, 1 / 60);
  assert(near(audioAnalysisEngine.getSignalGain(), 1, 1e-3),
    'a peak already at target gets unity gain', audioAnalysisEngine.getSignalGain());
}

console.log('\n[4] AGC boost is capped');
{
  resetAgc();
  setBand(0.05);                      // 0.8/0.05 = 16, over the ×8 ceiling
  audioAnalysisEngine.update(true, 1 / 60);
  assert(audioAnalysisEngine.getSignalGain() === 8,
    'boost clamps at ×8 instead of amplifying noise', audioAnalysisEngine.getSignalGain());
}

console.log('\n[5] AGC holds through silence rather than ramping into it');
{
  resetAgc();
  setBand(0.8);
  audioAnalysisEngine.update(true, 1 / 60);
  const before = audioAnalysisEngine.getSignalGain();
  setBand(0);                         // gap between tracks
  for (let i = 0; i < 200; i++) audioAnalysisEngine.update(true, 1 / 60);
  assert(audioAnalysisEngine.getSignalGain() === before,
    'gain is frozen at silence, so the next downbeat does not detonate',
    { before, after: audioAnalysisEngine.getSignalGain() });
}

console.log('\n[6] AGC attacks instantly, releases gradually');
{
  resetAgc();
  setBand(0.8);
  audioAnalysisEngine.update(true, 1 / 60);
  setBand(0.2);                       // level drops — release should be slow
  audioAnalysisEngine.update(true, 1 / 60);
  const oneFrame = audioAnalysisEngine.getSignalGain();
  assert(oneFrame > 1 && oneFrame < 4,
    'one frame after a drop the gain is partway, not snapped to the new peak', oneFrame);

  for (let i = 0; i < 300; i++) audioAnalysisEngine.update(true, 1 / 60);
  assert(near(audioAnalysisEngine.getSignalGain(), 4, 1e-2),
    'it settles on the new level after the release window', audioAnalysisEngine.getSignalGain());

  setBand(0.8);                       // a peak returns — must be instant
  audioAnalysisEngine.update(true, 1 / 60);
  assert(near(audioAnalysisEngine.getSignalGain(), 1, 1e-3),
    'a returning peak is caught in a single frame (instant attack)',
    audioAnalysisEngine.getSignalGain());
}

// ── Transient mode ──────────────────────────────────────────────────────────
resetAgc();
// Drive the real path: update() rebuilds/reads the filterbank from `buf`, and
// processAudioSignal reads the bands. Testing through the engine rather than
// against a hand-rolled band array is what keeps this honest — the two used to
// compute different statistics.
const signalOf = (rule: any, dt = 1 / 60): number => {
  audioAnalysisEngine.update(false, dt, 6, false);
  return (modulationEngine as any).processAudioSignal(rule, buf, dt);
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
const { filterBank } = await import('../engine/features/audioMod/filterBank');

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
