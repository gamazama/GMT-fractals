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
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
