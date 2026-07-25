/**
 * Smoke for the fractional-octave filterbank + per-band adaptive gain.
 *
 * The bank replaces raw linear FFT bins as the unit of analysis. What it must
 * get right:
 *   - equal MUSICAL width per band (the whole point — a linear FFT gives the
 *     kick octave 3 bins and the top octave 683)
 *   - honest reporting of where it runs out of FFT resolution, rather than
 *     silently returning duplicated neighbours
 *   - per-band normalisation that self-calibrates WITHOUT ratcheting through
 *     silence (the same trap the global AGC fell into)
 *
 *   tsx debug/test-filterbank.mts
 */

import { FilterBank, BANK_MIN_HZ } from '../engine/features/audioMod/filterBank';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const SR = 48000;
const mk = (fftSize = 4096, bandsPerOctave = 6) =>
  new FilterBank({ sampleRate: SR, fftSize, bandsPerOctave });

// ── Band layout ─────────────────────────────────────────────────────────────
console.log('\n[1] bands are equal musical width');
{
  const b = mk(4096, 6);
  const ratios = b.bands.slice(1).map((x, i) => x.centerHz / b.bands[i].centerHz);
  const expected = Math.pow(2, 1 / 6);
  assert(ratios.every(r => near(r, expected, 1e-9)),
    'every adjacent pair is one sixth-octave apart', ratios.slice(0, 3));
  assert(near(b.bands[0].centerHz, BANK_MIN_HZ, 1e-9),
    'the bank starts at the declared minimum', b.bands[0].centerHz);
  assert(b.bands[b.bands.length - 1].centerHz <= SR / 2,
    'and never exceeds nyquist', b.bands[b.bands.length - 1].centerHz);
}

console.log('\n[2] bass gets as many bands as treble (the linear-FFT complaint)');
{
  const b = mk(4096, 6);
  const inOctave = (lo: number, hi: number) =>
    b.bands.filter(x => x.centerHz >= lo && x.centerHz < hi).length;
  const bassOct = inOctave(40, 80);
  const trebleOct = inOctave(8000, 16000);
  assert(bassOct === trebleOct,
    'the 40-80Hz octave and the 8-16kHz octave hold the same band count',
    { bassOct, trebleOct });
  assert(bassOct === 6, 'which is bandsPerOctave', bassOct);
}

console.log('\n[3] resolution limit is reported, not hidden');
{
  // A band narrower than one bin cannot resolve. Where that starts must match
  // the advertised limit, and those bands must be flagged.
  for (const [fft, expectAbout] of [[2048, 203], [4096, 101], [8192, 51]] as const) {
    const b = mk(fft, 6);
    assert(Math.abs(b.resolutionLimitHz - expectAbout) < expectAbout * 0.05,
      `1/6 octave @ ${fft} is limited below ~${expectAbout}Hz`, b.resolutionLimitHz);
    const flagged = b.bands.filter(x => x.resolutionLimited);
    const highest = flagged.length ? Math.max(...flagged.map(x => x.centerHz)) : 0;
    assert(highest < b.resolutionLimitHz * 1.2,
      `  and only bands under that limit are flagged (${flagged.length} of ${b.bands.length})`,
      highest);
  }
}

console.log('\n[4] every band covers at least one bin, none run past the array');
{
  for (const fft of [2048, 4096, 8192]) {
    const b = mk(fft, 12);
    const binCount = fft / 2;
    assert(b.bands.every(x => x.binHi > x.binLo), `fft ${fft}: no empty band`);
    assert(b.bands.every(x => x.binHi <= binCount && x.binLo >= 0),
      `fft ${fft}: no band indexes past the bin array`);
  }
}

// ── Reading a frame ─────────────────────────────────────────────────────────
const frameWith = (fft: number, hz: number, level: number) => {
  const data = new Uint8Array(fft / 2);
  const bin = Math.round(hz / (SR / fft));
  if (bin < data.length) data[bin] = Math.round(level * 255);
  return data;
};

console.log('\n[5] a tone lands in the band that contains it');
{
  const b = mk(8192, 6);
  b.analyse(frameWith(8192, 1000, 1), false, 1 / 60);
  let best = 0;
  for (let i = 1; i < b.levels.length; i++) if (b.levels[i] > b.levels[best]) best = i;
  const band = b.bands[best];
  assert(1000 >= band.lowHz && 1000 <= band.highHz,
    'a 1kHz tone peaks in the band spanning 1kHz',
    { center: band.centerHz.toFixed(0), low: band.lowHz.toFixed(0), high: band.highHz.toFixed(0) });
}

console.log('\n[6] rule ranges map onto bands');
{
  const b = mk(4096, 6);
  const nyq = SR / 2;
  const [lo, hi] = b.bandRangeForHz(40, 120);
  assert(hi > lo, 'the 40-120Hz kick band resolves to a real range', { lo, hi });
  assert(b.bands[lo].highHz >= 40 && b.bands[hi - 1].lowHz <= 120,
    'and the range brackets the requested frequencies',
    { lowEdge: b.bands[lo].lowHz.toFixed(0), highEdge: b.bands[hi - 1].highHz.toFixed(0) });

  const [nlo, nhi] = b.bandRangeForNorm(40 / nyq, 120 / nyq);
  assert(nlo === lo && nhi === hi, 'the normalised entry point agrees with the Hz one');

  const [zlo, zhi] = b.bandRangeForHz(1000, 1000);
  assert(zhi > zlo, 'a zero-width selection still reads at least one band');
}

// ── Per-band adaptive gain ──────────────────────────────────────────────────
console.log('\n[7] normalisation off is a pass-through');
{
  const b = mk(4096, 6);
  b.analyse(frameWith(4096, 1000, 0.5), false, 1 / 60);
  assert(b.levels.every((v, i) => near(v, b.normalized[i])),
    'normalized === levels when the toggle is off');
}

console.log('\n[8] a quiet band self-calibrates to full range');
{
  const b = mk(4096, 6);
  const quiet = frameWith(4096, 8000, 0.30);
  for (let i = 0; i < 5; i++) b.analyse(quiet, true, 1 / 60);
  const [lo] = b.bandRangeForHz(8000, 8000);
  assert(b.normalized[lo] > b.levels[lo] * 2,
    'a band sitting at 0.30 absolute is lifted toward full scale',
    { raw: b.levels[lo].toFixed(3), norm: b.normalized[lo].toFixed(3) });
  assert(b.normalized[lo] <= 1.0001, 'and never exceeds 1', b.normalized[lo]);
}

console.log('\n[9] near-silent bands are NOT amplified to full scale');
{
  const b = mk(4096, 6);
  const whisper = frameWith(4096, 8000, 0.03);
  for (let i = 0; i < 60; i++) b.analyse(whisper, true, 1 / 60);
  const [lo] = b.bandRangeForHz(8000, 8000);
  assert(b.normalized[lo] < 0.35,
    'a band whose peak never clears the minimum stays quiet rather than '
    + 'amplifying its own noise floor',
    { raw: b.levels[lo].toFixed(4), norm: b.normalized[lo].toFixed(4) });
}

console.log('\n[10] silence freezes the follower (no ratchet through a gap)');
{
  const b = mk(4096, 6);
  const loud = frameWith(4096, 1000, 0.9);
  for (let i = 0; i < 10; i++) b.analyse(loud, true, 1 / 60);
  const [lo] = b.bandRangeForHz(1000, 1000);
  const peakDuring = (b as any).peaks[lo];

  const silence = new Uint8Array(2048);
  for (let i = 0; i < 600; i++) b.analyse(silence, true, 1 / 60);   // 10s gap
  assert(near((b as any).peaks[lo], peakDuring, 1e-9),
    'the follower holds through silence — releasing would shrink the divisor '
    + 'and detonate on the next downbeat',
    { before: peakDuring, after: (b as any).peaks[lo] });

  // And the downbeat returns at a sane level, not slammed to full scale.
  b.analyse(frameWith(4096, 1000, 0.45), true, 1 / 60);
  assert(b.normalized[lo] < 0.8,
    'a quieter return reads proportionally, not pinned', b.normalized[lo].toFixed(3));
}

console.log('\n[11] the follower releases when the music merely gets quieter');
{
  const b = mk(4096, 6);
  const loud = frameWith(4096, 1000, 0.9);
  for (let i = 0; i < 10; i++) b.analyse(loud, true, 1 / 60);
  const [lo] = b.bandRangeForHz(1000, 1000);

  const softer = frameWith(4096, 1000, 0.35);
  b.analyse(softer, true, 1 / 60);
  const oneFrame = b.normalized[lo];
  for (let i = 0; i < 600; i++) b.analyse(softer, true, 1 / 60);
  assert(b.normalized[lo] > oneFrame,
    'a sustained quieter passage is gradually brought back up',
    { oneFrame: oneFrame.toFixed(3), settled: b.normalized[lo].toFixed(3) });
}

console.log('\n[12] a rebuild drops stale per-band state');
{
  const b = mk(4096, 6);
  for (let i = 0; i < 30; i++) b.analyse(frameWith(4096, 1000, 0.9), true, 1 / 60);
  b.rebuild({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 12 });
  assert((b as any).peaks.every((v: number) => v === 0),
    'band k means a different frequency at a new width, so peaks reset',
  );
  assert(b.normalized.length === b.bands.length && b.levels.length === b.bands.length,
    'and the output buffers are resized to match');
}

console.log('\n[13] matches() gates rebuilds');
{
  const b = mk(4096, 6);
  assert(b.matches({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 6 }) === true,
    'identical settings report a match (no per-frame rebuild)');
  assert(b.matches({ sampleRate: SR, fftSize: 8192, bandsPerOctave: 6 }) === false,
    'a changed fftSize does not');
  assert(b.matches({ sampleRate: 44100, fftSize: 4096, bandsPerOctave: 6 }) === false,
    'nor a changed sample rate');
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
