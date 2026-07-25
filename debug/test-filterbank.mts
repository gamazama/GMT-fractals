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
 *  Tilt defaults to 0 here, NOT to the param's user-facing default of 3: every
 *  assertion below about absolute levels is written against the untilted
 *  spectrum. Tilt tests pass theirs explicitly. */
const runFrame = (
    b: FilterBank,
    data: Float32Array,
    normalize = false,
    dt = 1 / 60,
    tiltDbPerOct = 0,
) =>
    b.analyse(data, { dbFloor: DB_FLOOR, dbCeiling: DB_CEIL, normalize, tiltDbPerOct, deltaSec: dt });

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

console.log('\n[4d] spectral tilt: a fixed dB ramp that costs no dynamics');
{
  const b = mk(4096, 6);
  const flat = flatFrame(4096, 0.5);
  const SLOPE = 3;
  const span = DB_CEIL - DB_FLOOR;

  // A flat-dB spectrum reads the same in every band untilted — which is what
  // makes it the right substrate for measuring the ramp.
  runFrame(b, flat, false, 1 / 60, 0);
  const base = Array.from(b.levels);
  assert(Math.max(...base) - Math.min(...base) < 1e-6,
    'with no tilt a flat spectrum reads flat',
    Math.max(...base) - Math.min(...base));

  runFrame(b, flat, false, 1 / 60, SLOPE);
  let worst = 0;
  for (let k = 0; k < b.bands.length; k++) {
    const expected = Math.min(1,
      base[k] + (SLOPE * Math.log2(b.bands[k].centerHz / BANK_MIN_HZ)) / span);
    worst = Math.max(worst, Math.abs(b.levels[k] - expected));
  }
  assert(worst < 1e-5,
    'every band is lifted by exactly slope×log2(f/25) dB', worst);

  // Referenced at the low end, so the tilt only ever boosts. A mid-referenced
  // tilt would attenuate 25Hz by ~16dB and gut the kick.
  assert(near(b.levels[0], base[0], 1e-6),
    'the lowest band is exactly unchanged — tilt boosts, never attenuates',
    { before: base[0], after: b.levels[0] });
  assert(b.levels[b.bands.length - 1] > base[b.bands.length - 1],
    'and the top band is lifted');

  // THE claim: the offset is the same regardless of level, so a loud-vs-quiet
  // difference survives the tilt untouched. This is what per-band adaptive
  // gain could not do (ADR-0105).
  const mid = b.bands.findIndex(x => x.centerHz > 800 && x.centerHz < 1200);
  const quietF = flatFrame(4096, 0.30);
  const loudF = flatFrame(4096, 0.55);
  runFrame(b, quietF, false, 1 / 60, 0);     const rawQuiet = b.levels[mid];
  runFrame(b, loudF, false, 1 / 60, 0);      const rawLoud = b.levels[mid];
  runFrame(b, quietF, false, 1 / 60, SLOPE); const tiltQuiet = b.levels[mid];
  runFrame(b, loudF, false, 1 / 60, SLOPE);  const tiltLoud = b.levels[mid];
  assert(tiltLoud < 1, 'the probe band has not clamped', tiltLoud);
  assert(near(tiltLoud - tiltQuiet, rawLoud - rawQuiet, 1e-5),
    'a loud-vs-quiet difference is identical tilted and untilted — no dynamics cost',
    { raw: (rawLoud - rawQuiet).toFixed(4), tilted: (tiltLoud - tiltQuiet).toFixed(4) });

  // Moving the slider must not rebuild: a drag would otherwise reset the
  // adaptive-gain followers and drop the SuperFlux reference every frame.
  const b2 = mk(4096, 6);
  for (let i = 0; i < 10; i++) runFrame(b2, flat, true, 1 / 60, 0);
  const framesBefore = (b2 as any).framesAnalysed as number;
  runFrame(b2, flat, true, 1 / 60, 4);
  assert((b2 as any).framesAnalysed === framesBefore + 1,
    'a slope change does not reset the frame counter (so: no rebuild)');
  assert((b2 as any).hasPrevFrame === true,
    'and the SuperFlux reference frame survives it');

  // Out-of-range slopes clamp rather than producing a runaway ramp.
  runFrame(b, flat, false, 1 / 60, 999);
  assert(b.levels.every(v => v >= 0 && v <= 1), 'an absurd slope stays in 0..1');
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

// ── SuperFlux ───────────────────────────────────────────────────────────────
console.log('\n[11b] SuperFlux: real onsets survive, drifting tones do not');
{
  const FFT = 4096;
  const bin = (hz: number) => Math.round(hz / (SR / FFT));
  const tone = (hz: number, level: number) => {
    const f = new Float32Array(FFT / 2).fill(-Infinity);
    const db = DB_FLOOR + level * (DB_CEIL - DB_FLOOR);
    // A few bins wide so it lands in a band rather than between kernels.
    for (let d = -2; d <= 2; d++) f[bin(hz) + d] = db;
    return f;
  };

  // A steady tone produces no onset once the reference frame exists.
  const steady = mk(FFT, 6);
  const [lo, hi] = steady.bandRangeForHz(400, 3000);
  for (let i = 0; i < 20; i++) runFrame(steady, tone(1000, 0.7), false);
  assert(steady.superflux(lo, hi) < 1e-6,
    'a sustained tone yields no onset energy', steady.superflux(lo, hi));

  // A GENUINE onset: something appears where nothing was loud nearby.
  const onset = mk(FFT, 6);
  for (let i = 0; i < 20; i++) runFrame(onset, tone(1000, 0.7), false);
  const twoTones = tone(1000, 0.7);
  const second = tone(2400, 0.8);
  for (let i = 0; i < twoTones.length; i++) {
    if (second[i] > twoTones[i]) twoTones[i] = second[i];
  }
  runFrame(onset, twoTones, false);
  const onsetFlux = onset.superflux(lo, hi);
  assert(onsetFlux > 0.001, 'a new tone registers as an onset', onsetFlux);

  // A DRIFTING tone — the false positive plain flux fires on. Same energy,
  // sliding a little in frequency each frame. It enters new bands, but those
  // bands' NEIGHBOURS were already loud, so the max-filter cancels it.
  const drift = mk(FFT, 6);
  for (let i = 0; i < 20; i++) runFrame(drift, tone(1000, 0.7), false);
  let driftFlux = 0;
  for (let i = 1; i <= 12; i++) {
    runFrame(drift, tone(1000 * Math.pow(2, i / 200), 0.7), false);  // ~9 cents/frame
    driftFlux = Math.max(driftFlux, drift.superflux(lo, hi));
  }
  assert(driftFlux < onsetFlux,
    'a drifting tone reads weaker than a real onset (the SuperFlux claim)',
    { driftFlux, onsetFlux });

  // Quantify against the plain-flux baseline the max-filter replaces.
  const plainDrift = mk(FFT, 6);
  for (let i = 0; i < 20; i++) runFrame(plainDrift, tone(1000, 0.7), false);
  let plainMax = 0;
  for (let i = 1; i <= 12; i++) {
    const before = Float32Array.from(plainDrift.normalized);
    runFrame(plainDrift, tone(1000 * Math.pow(2, i / 200), 0.7), false);
    let s = 0;
    for (let k = lo; k < hi; k++) s += Math.max(0, plainDrift.normalized[k] - before[k]);
    plainMax = Math.max(plainMax, s / (hi - lo));
  }
  assert(driftFlux <= plainMax,
    'and weaker than plain flux on that same drift — width-3 max-filter '
    + `(${(plainMax > 0 ? (1 - driftFlux / plainMax) * 100 : 100).toFixed(0)}% suppressed)`,
    { superflux: driftFlux, plainFlux: plainMax });
}

console.log('\n[11c] SuperFlux has no reference until a second frame exists');
{
  const b = mk(4096, 6);
  const [lo, hi] = b.bandRangeForHz(100, 10000);
  runFrame(b, flatFrame(4096, 0.9), false);
  assert(b.superflux(lo, hi) === 0,
    'the very first frame is not one giant onset across every band');
  b.rebuild({ sampleRate: SR, fftSize: 4096, bandsPerOctave: 12 });
  runFrame(b, flatFrame(4096, 0.9), false);
  const [lo2, hi2] = b.bandRangeForHz(100, 10000);
  assert(b.superflux(lo2, hi2) === 0, 'nor the first frame after a reshape');
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
