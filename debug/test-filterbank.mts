/**
 * Smoke for FilterBank — the main thread's band-value holder.
 *
 * SCOPE NARROWED (ADR-0110). This file used to drive `FilterBank.analyse()`
 * and covered band geometry, kernels, the dB window, tilt, tone placement and
 * SuperFlux. All of that moved: geometry and tilt to `bandMath`
 * (`test:band-math`), the DSP to the audio thread (`test:band-analyser`).
 * `analyse()` itself was deleted — it had no production caller left, and a
 * second copy of the band-summing maths would have drifted from the one that
 * actually runs.
 *
 * What remains here is what still lives on this side of the thread boundary:
 * the adaptive-gain follower, the range queries, and rebuild bookkeeping.
 * Levels are set DIRECTLY, exactly as `WorkletAnalysis` sets them from a
 * snapshot — no analysis in between.
 *
 *   tsx debug/test-filterbank.mts
 *
 * BLIND SPOTS CLOSED (2026-07-29 guard sweep). Three, all found by breaking the
 * source and watching this file stay green at exit 0:
 *
 *  - FLAT FIXTURES CANNOT TELL AN RMS FROM A MEAN. Block [2] filled every band
 *    with the same number, and for a constant array the RMS, the mean and the
 *    max are all the same value — so `aggregate` returning a plain mean passed
 *    all 18 assertions. The block's own title says "aggregate is RMS over the
 *    range, flux is the mean" and it could not distinguish the two. It now also
 *    runs an alternating 0.2 / 0.8 pattern (rms 0.570714 vs mean 0.485714 over
 *    the 21 bands of 100-1000Hz) and an alternating 3 / 21 flux pattern (mean
 *    11.571429 vs max 21 vs sum 243), with an explicit assertion that the
 *    fixture is non-uniform enough for the two statistics to differ — so the
 *    tautology cannot come back silently.
 *
 *  - `matches()` DID NOT COVER `bandsPerOctave`. Block [9] varied fftSize and
 *    sampleRate only, so deleting the bandsPerOctave comparison passed. That is
 *    the one of the three a user changes at runtime, and `matches()` is what
 *    gates the rebuild in `WorkletAnalysis` (grep `filterBank.matches`) — a
 *    false match there leaves the band table stale after a resolution change.
 *
 *  - THE REBUILD RESET WAS PROVED BY THE ARRAY LENGTH, NOT BY THE RESET. Block
 *    [8] rebuilds at a different bandsPerOctave, so `peaks` is reallocated
 *    merely because its length changed; a rebuild that preserved same-length
 *    follower state passed. A same-settings rebuild is now asserted separately
 *    (56 bands before and after; normalized reads 1.0 for reset, 0.33 if the
 *    peak were carried).
 *
 * MARGINS, measured: [4] runs at 1.0000 against >0.9 (the ceiling, which is the
 * point); [5] at 0.3333 against <0.4, and 0.3333 is exactly 0.05/MIN_PEAK, so
 * that assertion is pinned to the constant rather than to a fudge; [6] at 0.5146
 * against <0.75, where removing the silence gate reads 1.000; [7] moves 0.5146
 * -> 1.0000.
 *
 * Vanishing-input check: the corpus is inline; the one external input is
 * `filterBank.ts`, whose loss fails at ESM link time before any assertion runs.
 */

import { FilterBank } from '../engine/features/audioMod/filterBank';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const SR = 48000;
const mk = (fftSize = 4096, bandsPerOctave = 6) =>
  new FilterBank({ sampleRate: SR, fftSize, bandsPerOctave });

/** Fill every band at one level, the way a worklet snapshot arrives. */
const setLevels = (b: FilterBank, level: number) => b.levels.fill(level);

/** One tick of the follower, matching `WorkletAnalysis.update`'s branch. */
const runFollower = (b: FilterBank, normalize: boolean, dt = 1 / 60) => {
  if (normalize) b.applyPeakFollower(dt);
  else b.syncFollowerToLevels();
};

// ── Range queries ───────────────────────────────────────────────────────────
console.log('\n[1] rule ranges map onto bands');
{
  const b = mk(4096, 6);
  const [lo, hi] = b.bandRangeForHz(40, 120);
  assert(hi > lo, 'the 40-120Hz kick band resolves to a real range', { lo, hi });
  assert(b.bands[lo].highHz >= 40 && b.bands[hi - 1].lowHz <= 120,
    'and the range brackets the requested frequencies',
    { lowEdge: b.bands[lo].lowHz.toFixed(0), highEdge: b.bands[hi - 1].highHz.toFixed(0) });

  const [zlo, zhi] = b.bandRangeForHz(1000, 1000);
  assert(zhi > zlo, 'a zero-width selection still reads at least one band');
}

console.log('\n[2] aggregate is RMS over the range, flux is the mean');
{
  const b = mk(4096, 6);
  setLevels(b, 0.5);
  runFollower(b, false);
  const [lo, hi] = b.bandRangeForHz(100, 1000);
  assert(near(b.aggregate(lo, hi), 0.5, 1e-6),
    'a flat 0.5 reads back 0.5', b.aggregate(lo, hi));

  b.fluxRate.fill(12);
  assert(near(b.aggregateFlux(lo, hi), 12, 1e-6),
    'flux averages rather than sums, so a wide rule does not read stronger',
    b.aggregateFlux(lo, hi));
  assert(b.aggregate(5, 5) === 0 && b.aggregateFlux(5, 5) === 0,
    'an empty range is 0, not NaN');

  // NON-UNIFORM. Everything above this line is flat, and for a constant array
  // the RMS, the mean and the max are the same number — see the header. The
  // alternating pattern is what makes the next two assertions arithmetic.
  b.levels.fill(0);
  for (let i = lo; i < hi; i++) b.levels[i] = (i - lo) % 2 === 0 ? 0.2 : 0.8;
  runFollower(b, false);

  const count = hi - lo;
  const nLow = Math.ceil(count / 2);          // even offsets carry 0.2
  const nHigh = count - nLow;
  const rms = Math.sqrt((nLow * 0.2 * 0.2 + nHigh * 0.8 * 0.8) / count);
  const mean = (nLow * 0.2 + nHigh * 0.8) / count;

  // Guard the guard: if the fixture ever degenerates back to flat, this fails
  // first and says why, instead of the next assertion quietly becoming a
  // tautology again.
  assert(Math.abs(rms - mean) > 0.05,
    'the fixture is non-uniform enough for RMS and mean to differ',
    { rms: rms.toFixed(6), mean: mean.toFixed(6), bands: count });
  assert(near(b.aggregate(lo, hi), rms, 1e-6),
    'aggregate is the RMS of the range, not its mean',
    { got: b.aggregate(lo, hi).toFixed(6), rms: rms.toFixed(6), mean: mean.toFixed(6) });

  for (let i = lo; i < hi; i++) b.fluxRate[i] = (i - lo) % 2 === 0 ? 3 : 21;
  const fluxMean = (nLow * 3 + nHigh * 21) / count;
  assert(near(b.aggregateFlux(lo, hi), fluxMean, 1e-6),
    'aggregateFlux is the mean of the range — not its max (21) and not its sum',
    { got: b.aggregateFlux(lo, hi).toFixed(6), mean: fluxMean.toFixed(6) });
}

// ── Per-band adaptive gain ──────────────────────────────────────────────────
console.log('\n[3] normalisation off is a pass-through');
{
  const b = mk(4096, 6);
  setLevels(b, 0.42);
  runFollower(b, false);
  assert(Array.from(b.normalized).every(v => near(v, 0.42, 1e-6)),
    'levels reach `normalized` untouched when the follower is off');
}

console.log('\n[4] a quiet band self-calibrates to full range');
{
  const b = mk(4096, 6);
  setLevels(b, 0.30);
  for (let i = 0; i < 5; i++) runFollower(b, true);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] > 0.9,
    'a band sitting at 0.30 absolute is lifted toward full scale', b.normalized[mid]);
  assert(b.normalized.every(v => v <= 1), 'and never exceeds 1');
}

console.log('\n[5] near-silent bands are NOT amplified to full scale');
{
  const b = mk(4096, 6);
  setLevels(b, 0.05);           // never clears MIN_PEAK (0.15)
  for (let i = 0; i < 60; i++) runFollower(b, true);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] < 0.4,
    'a band whose peak never clears the minimum stays quiet rather than amplifying its own noise floor',
    b.normalized[mid]);
}

console.log('\n[6] silence freezes the follower (no ratchet through a gap)');
{
  const b = mk(4096, 6);
  setLevels(b, 0.9);
  runFollower(b, true);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);

  setLevels(b, 0);              // gap between tracks
  for (let i = 0; i < 600; i++) runFollower(b, true);

  // Releasing through the gap would shrink the divisor and detonate on the
  // next downbeat. The follower must hold instead.
  setLevels(b, 0.45);
  runFollower(b, true);
  assert(b.normalized[mid] < 0.75,
    'a quieter return reads proportionally, not pinned', b.normalized[mid].toFixed(3));
}

console.log('\n[7] the follower releases when the music merely gets quieter');
{
  const b = mk(4096, 6);
  setLevels(b, 0.9);
  runFollower(b, true);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);

  setLevels(b, 0.45);
  runFollower(b, true);
  const oneFrame = b.normalized[mid];

  for (let i = 0; i < 300; i++) runFollower(b, true);
  assert(b.normalized[mid] > oneFrame,
    'a sustained quieter passage is gradually brought back up',
    { oneFrame: oneFrame.toFixed(3), settled: b.normalized[mid].toFixed(3) });
}

// ── Rebuild bookkeeping ─────────────────────────────────────────────────────
console.log('\n[8] a rebuild drops stale per-band state');
{
  const b = mk(4096, 6);
  setLevels(b, 0.9);
  for (let i = 0; i < 10; i++) runFollower(b, true);
  const before = b.bands.length;

  b.rebuild({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 12 });
  assert(b.bands.length !== before, 'the band count changed', { before, after: b.bands.length });
  assert(b.levels.length === b.bands.length
      && b.normalized.length === b.bands.length
      && b.fluxRate.length === b.bands.length,
    'and every buffer was resized to match');

  setLevels(b, 0.30);
  runFollower(b, true);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] > 0.9,
    'band k means a different frequency at a new width, so peaks reset',
    b.normalized[mid]);

  // Same settings, so the band count is UNCHANGED (56 -> 56). Asserted
  // separately because the case above only proves the array was reallocated
  // when its length changed — a rebuild that preserved same-length follower
  // state passed it. 1.0 here means the peak was reset; 0.33 would mean carried.
  const c = mk(4096, 6);
  setLevels(c, 0.9);
  for (let i = 0; i < 10; i++) runFollower(c, true);
  const sameN = c.bands.length;
  c.rebuild({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 6 });
  assert(c.bands.length === sameN, 'a same-settings rebuild keeps the band count', { sameN, after: c.bands.length });
  setLevels(c, 0.30);
  runFollower(c, true);
  const cmid = c.bands.findIndex(x => x.centerHz > 1000);
  assert(c.normalized[cmid] > 0.9,
    'and a same-SIZE rebuild resets the follower too, not only one that changes the band count',
    c.normalized[cmid]);
}

console.log('\n[9] matches() gates rebuilds');
{
  const b = mk(4096, 6);
  assert(b.matches({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 6 }),
    'identical settings report a match (no per-frame rebuild)');
  assert(!b.matches({ sampleRate: SR, fftSize: 8192, bandsPerOctave: 6 }),
    'a changed fftSize does not');
  assert(!b.matches({ sampleRate: 44100, fftSize: 4096, bandsPerOctave: 6 }),
    'nor a changed sample rate');
  // The third setting, and the only one a user changes at runtime. Untested
  // until 2026-07-29: deleting its comparison from matches() passed this block.
  assert(!b.matches({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 12 }),
    'nor a changed bandsPerOctave — a false match here leaves the band table stale');
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
