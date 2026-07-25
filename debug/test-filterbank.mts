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

import { FilterBank, BANK_MIN_HZ, dbToUnit } from '../engine/features/audioMod/filterBank';

const DB_FLOOR = -90;
const DB_CEIL = -10;
/** Analyse with the panel's default dB window.
 *
 *  The mode is pinned to 'peak' rather than left to default: `analyse` defaults
 *  to PCEN, so the legacy-follower tests below would silently have been testing
 *  PCEN instead. Mode-specific tests pass theirs explicitly. */
const runFrame = (
    b: FilterBank,
    data: Float32Array,
    normalize = false,
    dt = 1 / 60,
    normalizeMode: 'peak' | 'pcen' = 'peak',
) =>
    b.analyse(data, { dbFloor: DB_FLOOR, dbCeiling: DB_CEIL, normalize, normalizeMode, deltaSec: dt });

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
/** dBFS frame (what getFloatFrequencyData returns). Silent bins sit at the
 *  floor; `level` is the target 0..1 position in the dB window, so the helper
 *  inverts `dbToUnit` to place the tone. */
const frameWith = (fft: number, hz: number, level: number) => {
  const data = new Float32Array(fft / 2).fill(-Infinity);
  const bin = Math.round(hz / (SR / fft));
  if (bin < data.length) data[bin] = DB_FLOOR + level * (DB_CEIL - DB_FLOOR);
  return data;
};
/** A frame with EVERY bin at the same dB — a flat spectrum. */
const flatFrame = (fft: number, level: number) =>
  new Float32Array(fft / 2).fill(DB_FLOOR + level * (DB_CEIL - DB_FLOOR));
const silentFrame = (fft: number) => new Float32Array(fft / 2).fill(-Infinity);

// ── Float path: scale must match the byte path it replaced ──────────────────
console.log('\n[4b] dB→unit mapping and linear-domain averaging');
{
  assert(dbToUnit(DB_FLOOR, DB_FLOOR, DB_CEIL) === 0, 'the floor maps to 0');
  assert(dbToUnit(DB_CEIL, DB_FLOOR, DB_CEIL) === 1, 'the ceiling maps to 1');
  assert(near(dbToUnit((DB_FLOOR + DB_CEIL) / 2, DB_FLOOR, DB_CEIL), 0.5, 1e-9),
    'and the midpoint to 0.5 — the same ramp getByteFrequencyData applied');
  assert(dbToUnit(-Infinity, DB_FLOOR, DB_CEIL) === 0, 'a silent bin is 0, not NaN');
  assert(dbToUnit(0, DB_FLOOR, DB_CEIL) === 1, 'above-ceiling clamps');
  assert(dbToUnit(-200, DB_FLOOR, DB_CEIL) === 0, 'below-floor clamps');

  // A FLAT band must read back exactly its input level: averaging power then
  // returning to dB is an identity when every bin is equal. This is the check
  // that pins the 0..1 scale to the byte path's.
  const b = mk(4096, 6);
  runFrame(b, flatFrame(4096, 0.6));
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(near(b.levels[mid], 0.6, 1e-4),
    'a flat -42dB spectrum reads 0.6 on the same scale as before',
    b.levels[mid]);

  // And averaging happens in LINEAR power, not in dB. A band holding one loud
  // bin among quiet ones must land near the POWER mean (a few dB under the
  // loud bin) and nowhere near the dB mean (which the quiet bins would drag
  // almost down to their own level).
  const fft = 4096;
  const bank = mk(fft, 3);
  const target = bank.bands.findIndex(x => x.kernelLength >= 8);
  const band = bank.bands[target];
  const frame = new Float32Array(fft / 2).fill(-80);
  // Centre bin of the band — the kernel peaks there, and Hann is zero at the
  // support edges by construction, so an edge bin would contribute nothing.
  frame[Math.round((band.binLo + band.binHi) / 2)] = -20;
  runFrame(bank, frame);
  const got = bank.levels[target];
  const dbMeanish = dbToUnit(-70, DB_FLOOR, DB_CEIL);
  assert(got > dbMeanish,
    'a loud bin lifts the band far above where a dB average would leave it',
    { got, dbMeanish });
  assert(got < dbToUnit(-20, DB_FLOOR, DB_CEIL),
    'but not to the loud bin itself — the rest of the band still counts', got);
}

console.log('\n[4c] Hann kernels: unit sum, zero at the edges, overlapping');
{
  const b = mk(4096, 6);
  const kernel = (b as any).kernel as Float32Array;

  // Unit SUM (not unit energy) is what keeps the weighted power mean on the
  // same 0..1 scale as the rectangular mean it replaced.
  let worst = 0;
  for (const band of b.bands) {
    let s = 0;
    for (let j = 0; j < band.kernelLength; j++) s += kernel[band.kernelOffset + j];
    worst = Math.max(worst, Math.abs(s - 1));
  }
  assert(worst < 1e-5, 'every band kernel sums to 1', worst);

  // Hann tapers to zero at its support edges — that is the leak suppression.
  const wide = b.bands.filter(x => x.kernelLength >= 6);
  assert(wide.length > 0, 'there are bands wide enough to shape');
  const edgesZero = wide.every(x =>
    kernel[x.kernelOffset] < kernel[x.kernelOffset + (x.kernelLength >> 1)]);
  assert(edgesZero, 'and weights rise from the edge toward the centre');

  // 50% overlap: a tone between two band centres must register in BOTH, which
  // is what makes a sweep crossfade instead of stepping.
  const i = b.bands.findIndex(x => x.centerHz > 2000);
  const between = Math.sqrt(b.bands[i].centerHz * b.bands[i + 1].centerHz);
  const f = new Float32Array(2048).fill(-Infinity);
  f[Math.round(between / (SR / 4096))] = -20;
  runFrame(b, f);
  assert(b.levels[i] > 0 && b.levels[i + 1] > 0,
    'a tone between two centres registers in both bands',
    { lower: b.levels[i], upper: b.levels[i + 1] });
}

console.log('\n[5] a tone lands in the band that contains it');
{
  const b = mk(8192, 6);
  runFrame(b, frameWith(8192, 1000, 1));
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
  runFrame(b, frameWith(4096, 1000, 0.5));
  assert(b.levels.every((v, i) => near(v, b.normalized[i])),
    'normalized === levels when the toggle is off');
}

console.log('\n[8] a quiet band self-calibrates to full range');
{
  const b = mk(4096, 6);
  const quiet = frameWith(4096, 8000, 0.30);
  for (let i = 0; i < 5; i++) runFrame(b, quiet, true);
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
  for (let i = 0; i < 60; i++) runFrame(b, whisper, true);
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
  for (let i = 0; i < 10; i++) runFrame(b, loud, true);
  const [lo] = b.bandRangeForHz(1000, 1000);
  const peakDuring = (b as any).peaks[lo];

  const silence = silentFrame(4096);
  for (let i = 0; i < 600; i++) runFrame(b, silence, true);   // 10s gap
  assert(near((b as any).peaks[lo], peakDuring, 1e-9),
    'the follower holds through silence — releasing would shrink the divisor '
    + 'and detonate on the next downbeat',
    { before: peakDuring, after: (b as any).peaks[lo] });

  // And the downbeat returns at a sane level, not slammed to full scale.
  runFrame(b, frameWith(4096, 1000, 0.45), true);
  assert(b.normalized[lo] < 0.8,
    'a quieter return reads proportionally, not pinned', b.normalized[lo].toFixed(3));
}

console.log('\n[11] the follower releases when the music merely gets quieter');
{
  const b = mk(4096, 6);
  const loud = frameWith(4096, 1000, 0.9);
  for (let i = 0; i < 10; i++) runFrame(b, loud, true);
  const [lo] = b.bandRangeForHz(1000, 1000);

  const softer = frameWith(4096, 1000, 0.35);
  runFrame(b, softer, true);
  const oneFrame = b.normalized[lo];
  for (let i = 0; i < 600; i++) runFrame(b, softer, true);
  assert(b.normalized[lo] > oneFrame,
    'a sustained quieter passage is gradually brought back up',
    { oneFrame: oneFrame.toFixed(3), settled: b.normalized[lo].toFixed(3) });
}

// ── PCEN ────────────────────────────────────────────────────────────────────
const runPcen = (b: FilterBank, data: Float32Array, dt = 1 / 60) =>
  b.analyse(data, {
    dbFloor: DB_FLOOR, dbCeiling: DB_CEIL,
    normalize: true, normalizeMode: 'pcen', deltaSec: dt,
  });

console.log('\n[11b] PCEN maps silence to exactly zero');
{
  // The `+ delta` inside the power is what makes E=0 -> 0. Dropping it (an easy
  // transcription slip) yields -delta^r — a NEGATIVE level, -1.414 here.
  const b = mk(4096, 6);
  for (let i = 0; i < 30; i++) runPcen(b, silentFrame(4096));
  assert(b.normalized.every(v => v === 0),
    'every band reads exactly 0 on a silent frame, never negative',
    Math.min(...Array.from(b.normalized)));
}

console.log('\n[11c] PCEN self-calibrates and stays bounded');
{
  const b = mk(4096, 6);
  const quiet = flatFrame(4096, 0.25);
  for (let i = 0; i < 240; i++) runPcen(b, quiet);
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] > b.levels[mid] * 1.5,
    'a sustained quiet band is lifted well above its raw level',
    { raw: b.levels[mid].toFixed(3), pcen: b.normalized[mid].toFixed(3) });
  assert(b.normalized.every(v => v >= 0 && v <= 1),
    'and nothing leaves 0..1');
}

console.log('\n[11d] PCEN needs no silence freeze — the ratchet cannot occur');
{
  // This is the property the peak follower needed an explicit freeze for: the
  // divisor decays through a gap and the gain climbs. PCEN's smoother decays
  // too, but the compression exponent plus the M floor bound the output, so no
  // freeze is required. Drive a worst case and confirm.
  const b = mk(4096, 6);
  for (let i = 0; i < 120; i++) runPcen(b, flatFrame(4096, 0.9));   // loud passage
  for (let i = 0; i < 1800; i++) runPcen(b, silentFrame(4096));      // 30s gap
  assert(b.normalized.every(v => v === 0), 'output stays 0 across a long gap');

  // The downbeat after the gap must not detonate: a quiet return reads quiet.
  runPcen(b, flatFrame(4096, 0.2));
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] <= 1,
    'the first frame after silence is bounded', b.normalized[mid]);

  // Sweep a full silence-to-full-scale ramp and check monotone, bounded output.
  const b2 = mk(4096, 6);
  let maxSeen = 0;
  for (let step = 0; step <= 100; step++) {
    runPcen(b2, flatFrame(4096, step / 100));
    for (const v of b2.normalized) maxSeen = Math.max(maxSeen, v);
  }
  assert(maxSeen <= 1, 'a full ramp never exceeds 1', maxSeen);
  assert(Number.isFinite(maxSeen), 'and never goes non-finite');
}

console.log('\n[11e] near-silent bands still are not amplified under PCEN');
{
  // PCEN's eps guards division by zero, not amplification. Without the M floor
  // a band of room tone would divide by its own tiny average and be lifted to
  // ~0.6. Same guard value as the peak follower, so both modes agree here.
  const b = mk(4096, 6);
  for (let i = 0; i < 300; i++) runPcen(b, flatFrame(4096, 0.03));
  const mid = b.bands.findIndex(x => x.centerHz > 1000);
  assert(b.normalized[mid] < 0.35,
    'room tone stays quiet rather than being normalised to full scale',
    b.normalized[mid].toFixed(3));
}

console.log('\n[12] a rebuild drops stale per-band state');
{
  const b = mk(4096, 6);
  for (let i = 0; i < 30; i++) runFrame(b, frameWith(4096, 1000, 0.9), true);
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
