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
 * SCOPE (ADR-0110): this covers the RULE pipeline given band values — what the
 * main thread still does. Producing those values from audio moved to the audio
 * thread, so the level→flux derivation, the SuperFlux max-filter and their
 * rate-independence are covered by `test:band-analyser` where they now live.
 * Deriving them again here would be the duplication that refactor removed.
 *
 * Band values are therefore set DIRECTLY, exactly as `WorkletAnalysis` sets
 * them from a snapshot.
 *
 *   tsx debug/test-audio-signal.mts
 */

const { modulationEngine } = await import('../engine/features/modulation/ModulationEngine');
const { filterBank } = await import('../engine/features/audioMod/filterBank');
const { AutoGain } = await import('../engine/features/audioMod/dsp/autoGain');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const SR = 48000;
/** Rules below span 0-2400Hz; keep the fill inside that so `aggregate`'s RMS
 *  over the range equals the level set. */
const BAND_TOP_HZ = 2400;
filterBank.rebuild({ sampleRate: SR, fftSize: 2048, bandsPerOctave: 6 });

const agc = new AutoGain();
let peakLevel = 0;

/** Fill the rule's band range at one level — a worklet snapshot, by hand. */
const setBand = (level: number) => {
  filterBank.levels.fill(0);
  for (let k = 0; k < filterBank.bands.length; k++) {
    if (filterBank.bands[k].centerHz <= BAND_TOP_HZ) filterBank.levels[k] = level;
  }
  peakLevel = level;
};

/** Per-band flux rate, in level-units per second. */
const setFlux = (rate: number) => filterBank.fluxRate.fill(rate);

/** One tick: follower then AGC, the order `WorkletAnalysis.update` runs them. */
const update = (agcEnabled = false, dt = 1 / 60, normalize = false) => {
  if (normalize) filterBank.applyPeakFollower(dt);
  else filterBank.syncFollowerToLevels();
  agc.update(agcEnabled, peakLevel, dt);
};
const getSignalGain = () => agc.value;
const resetAgc = () => { agc.reset(); };

/** The rule's full-scale flux constant, read off the class so this cannot
 *  drift from it. */
const FULL_SCALE = (modulationEngine as any).constructor.TRANSIENT_FULL_SCALE as number;

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
const signalOf = (rule: any, dt = 1 / 60): number => {
  update(false, dt, false);
  return (modulationEngine as any).processAudioSignal(rule, dt);
};

const mkRule = (mode: 'level' | 'transient') => ({
  id: `r-${mode}`, target: 't', source: 'audio', enabled: true, color: '#fff',
  lowHz: 0, highHz: BAND_TOP_HZ, thresholdMin: 0, thresholdMax: 1,
  attack: 0.1, decay: 0.3, smoothing: 0, gain: 1, offset: 0, mode,
});

console.log('\n[7] level mode follows loudness (unchanged behaviour)');
{
  const r = mkRule('level');
  setBand(0.6); setFlux(0);
  signalOf(r);
  assert(near(signalOf(r), 0.6, 0.01), 'a sustained tone holds its level', signalOf(r));
}

console.log('\n[8] transient mode reads flux, not level');
{
  const r = mkRule('transient');
  setBand(0.9); setFlux(0);           // loud but steady
  signalOf(r);
  assert(signalOf(r) === 0,
    'a sustained tone produces no transient signal however loud it is', signalOf(r));

  setFlux(FULL_SCALE);
  signalOf(r);
  assert(near(signalOf(r), 1, 1e-6),
    'flux at TRANSIENT_FULL_SCALE reads full scale', signalOf(r));

  setFlux(FULL_SCALE / 2);
  signalOf(r);
  assert(near(signalOf(r), 0.5, 1e-6), 'and half of it reads half', signalOf(r));

  setFlux(FULL_SCALE * 10);
  signalOf(r);
  assert(signalOf(r) === 1, 'an enormous hit clamps rather than overshooting', signalOf(r));

  setFlux(0);
  signalOf(r);
  assert(signalOf(r) === 0, 'it falls straight back once the attack is over', signalOf(r));
}

console.log('\n[9] transient response does not depend on the tick rate');
{
  // Flux arrives as a RATE (per second) from the audio thread, so the same
  // event must read the same however often the main thread happens to sample
  // it. This is the property that survives the 1Hz tick throttle.
  const a = mkRule('transient');
  setBand(0.5); setFlux(FULL_SCALE / 2);
  signalOf(a, 1 / 30); const at30 = signalOf(a, 1 / 30);

  const b = mkRule('transient');
  setBand(0.5); setFlux(FULL_SCALE / 2);
  signalOf(b, 1 / 60); const at60 = signalOf(b, 1 / 60);

  assert(near(at30, at60, 0.02),
    'the same flux rate reads the same at 30 and 60 fps', { at30, at60 });
}

console.log('\n[10] switching modes mid-set does not fire a spurious hit');
{
  // No per-rule flux state: the bank owns it, so a rule switched into
  // transient mode cannot spike off a reference it was never updating.
  const r = mkRule('level');
  setBand(0.2); setFlux(0); signalOf(r);
  setBand(0.9); signalOf(r);          // big level change, but we are in level mode
  (r as any).mode = 'transient';
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
  setBand(0.6);
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
