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

const BINS = 1024;
const buf = new Uint8Array(BINS);
// Stub the graph: update() only needs an analyser that fills dataArray, and we
// fill it ourselves so each test frame is exact.
(audioAnalysisEngine as any).analyser = { getByteFrequencyData: () => { /* buf is pre-filled */ } };
(audioAnalysisEngine as any).dataArray = buf;

/** Fill bins [0, upTo) with a normalised level, rest silent. */
const setBand = (level: number, upTo = 128) => {
  buf.fill(0);
  const v = Math.round(level * 255);
  for (let i = 0; i < upTo; i++) buf[i] = v;
};

const resetAgc = () => {
  (audioAnalysisEngine as any).agcPeak = 0;
  (audioAnalysisEngine as any).agcGain = 1;
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
const signalOf = (rule: any, dt = 1 / 60): number =>
  (modulationEngine as any).processAudioSignal(rule, buf, dt);

const mkRule = (mode: 'level' | 'transient') => ({
  id: `r-${mode}`, target: 't', source: 'audio', enabled: true, color: '#fff',
  freqStart: 0, freqEnd: 0.1, thresholdMin: 0, thresholdMax: 1,
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

// ── Band aggregation: display and signal must agree ─────────────────────────
const { aggregateBand } = await import('../engine/features/audioMod/freqScale');

console.log('\n[11] band aggregation is the shared statistic');
{
  // The spectrum bar and the rule signal over the same bins must be identical —
  // they diverged before (display max-pooled, rules took the mean), so a band
  // could look strong and drive nothing.
  const r = mkRule('level');
  setBand(0.6, 128);
  const ruleSignal = signalOf(r);              // thresholdMin 0, gain 1 → raw level
  const displayBar = aggregateBand(buf, 0, Math.floor(0.1 * BINS));
  assert(near(ruleSignal, displayBar, 1e-6),
    'a bar and the rule over the same bins produce the same number',
    { ruleSignal, displayBar });
}

console.log('\n[12] aggregation favours a peak without discarding band width');
{
  // A narrow tonal source (kick fundamental) inside a wide band: RMS must beat
  // the plain mean, or raising fftSize would dilute the kick rather than
  // resolve it.
  const band = new Uint8Array([235, 232, 220, 180, 110, 70, 55]);
  const mean = band.reduce((s, v) => s + v, 0) / band.length / 255;
  const agg = aggregateBand(band, 0, band.length);
  assert(agg > mean, 'a peaky band reads stronger than its plain mean', { agg, mean });
  assert(agg < 235 / 255, 'but not as strong as peak-only (band width still counts)', agg);

  // Broadband material — all bins similar — must be left alone.
  const flat = new Uint8Array([180, 178, 182, 179, 181]);
  const flatMean = flat.reduce((s, v) => s + v, 0) / flat.length / 255;
  assert(Math.abs(aggregateBand(flat, 0, flat.length) - flatMean) < 0.005,
    'a flat band is unchanged (RMS ≈ mean when bins agree)',
    { agg: aggregateBand(flat, 0, flat.length), flatMean });
}

console.log('\n[13] empty / inverted ranges are safe');
{
  assert(aggregateBand(buf, 10, 10) === 0, 'zero-width range returns 0');
  assert(aggregateBand(buf, 50, 10) === 0, 'inverted range returns 0');
  assert(aggregateBand(buf, -5, 4) >= 0, 'negative start is clamped, not indexed');
  assert(aggregateBand(buf, BINS - 2, BINS + 100) >= 0, 'overrun end is clamped');
}

// ── Uniform ownership (the flicker skip list) ───────────────────────────────
console.log('\n[14] modulated-uniform ownership tracking');
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
