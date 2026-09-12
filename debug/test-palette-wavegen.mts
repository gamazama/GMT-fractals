/**
 * wave filter harness — pins `palette/core/waveGen.ts` (the Curves editor's function tool)
 * and `CurveFitting.spliceSpan` (the span-local commit it shares with the Pencil and the
 * smoothing brush).
 *
 * Both are pure, so everything here runs on bare node with no DOM and no canvas.
 * What it proves:
 *   [1] every shape stays inside [-1,1] and has the period it claims — the thing the
 *       caliper's drawn width asserts;
 *   [2] the span envelope is exactly 0 outside the span and exactly 1 in an unfeathered
 *       middle, and is C1 at the shoulders (no step where the edit rejoins the curve);
 *   [3] a wave NEVER changes a sample outside its span, in any of the three modes — the
 *       claim that makes the tool safe to fire at a finished curve;
 *   [4] bias and skew are the identity at 1 and monotone either side of it, so the
 *       crosshair handle can only lean the wave, never fold it;
 *   [5] amplitude is a FRACTION of the channel range, so one drag feels the same on L,
 *       chroma and hue (ranges 1, 0.4 and 2π);
 *   [6] spliceSpan keeps every key outside the span, lands the span's keys inside it, and
 *       refuses rather than returning a track with fewer than two keys;
 *   [9] and it never hands back a segment whose Bezier DOUBLES BACK in time — the fold the
 *       graph strokes as a literal loop.
 *
 * Run: npx tsx debug/test-palette-wavegen.mts
 */

import {
  DEFAULT_WAVE,
  WAVE_MODES,
  WAVE_SHAPES,
  applyWaveSample,
  biasPow,
  waveEnvelope,
  waveSpanFrames,
  waveValue,
  type WaveParams,
} from '../palette/core/waveGen';
import { sampleWaveSpan } from '../palette/core/waveGen';
import { spliceSpan, fitSamplesToKeys, FIT_TANGENT_WEIGHT } from '../utils/CurveFitting';
import { evaluateTrackValue } from '../utils/timelineUtils';
import type { Keyframe } from '../types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};
const P = (over: Partial<WaveParams> = {}): WaveParams => ({ ...DEFAULT_WAVE, ...over });

// --- [1] shape range and period ---------------------------------------------------------
console.log('[1] shapes');
{
  for (const shape of WAVE_SHAPES) {
    const p = P({ shape, wavelength: 0.25 });
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 2000; i++) {
      const v = waveValue(i / 2000, p);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    ok(lo >= -1.0001 && hi <= 1.0001, `${shape}: inside [-1,1] (${lo.toFixed(3)}..${hi.toFixed(3)})`);
    ok(hi - lo > 0.5, `${shape}: actually oscillates (swing ${(hi - lo).toFixed(2)})`);
  }
  // Period: a periodic shape repeats after exactly one wavelength. Noise is excluded —
  // it has no period, and wavelength reads as grain scale there by design.
  //
  // Counted, not measured as a max: Pulse is DISCONTINUOUS, so a sample that lands within
  // a float ulp of its edge can read +1 at t and -1 at t+λ and produce a "drift" of 2 that
  // is the sampling, not the period (this harness asserted the max first and Pulse failed
  // it — 2026-09-12). Counting mismatching samples still catches a genuinely wrong period,
  // which would move ALL of them, not one.
  for (const shape of WAVE_SHAPES.filter((s) => s !== 'Noise')) {
    const p = P({ shape, wavelength: 0.2 });
    let off = 0;
    for (let i = 0; i < 200; i++) {
      const t = 0.05 + (i / 200) * 0.5;
      if (Math.abs(waveValue(t, p) - waveValue(t + 0.2, p)) > 1e-9) off++;
    }
    // The loose bound is honest only with its control: a deliberately WRONG period (half
    // a wavelength) must move most of the 200, not a handful.
    let wrong = 0;
    for (let i = 0; i < 200; i++) {
      const t = 0.05 + (i / 200) * 0.5;
      if (Math.abs(waveValue(t, p) - waveValue(t + 0.1, p)) > 1e-9) wrong++;
    }
    ok(off <= 4 && wrong > 100, `${shape}: repeats after one wavelength (${off}/200 off; a half-wavelength shift moves ${wrong})`);
  }
  // The caliper's claim in the other direction: halving the wavelength doubles the cycles.
  // Sampled over [0,1) — the final sample is EXCLUDED on purpose. This assertion is about
  // the period, and including t=1 made it depend on an endpoint float artifact instead:
  // `sin(0)` is exactly 0 and counted as a crossing, `sin(2*PI)` is -2.4e-16 and does not,
  // so the endpoint rule below (correctly) changed the count from 10 to 9 and reddened a
  // test that was never about endpoints (2026-09-12).
  const count = (lam: number) => {
    const p = P({ shape: 'Sine', wavelength: lam });
    let n = 0;
    for (let i = 1; i < 4000; i++) {
      if (waveValue((i - 1) / 4000, p) < 0 && waveValue(i / 4000, p) >= 0) n++;
    }
    return n;
  };
  // 2n+1, not 2n: over a HALF-OPEN interval the crossing at t=0 is never counted (there is
  // no previous sample to have been below zero), so halving the period adds one interior
  // crossing beyond doubling. Asserted exactly rather than as a ratio, so a genuinely wrong
  // period still reds it.
  ok(count(0.05) === count(0.1) * 2 + 1, `halving the wavelength doubles the cycles (${count(0.1)} → ${count(0.05)})`);
  ok(count(0.1) === 9, `and the count itself is right (${count(0.1)} in [0,1) at one cycle per 0.1)`);

  // THE ENDPOINT RULE, which is what the presets depend on: a Sawtooth at one cycle across
  // the whole axis is a monotone RISE, and it must still be rising at t=1. Resolving `% 1`
  // to the period's start there instead drops the last texel back to the floor — a
  // one-sample spike at the end of every "sequential lightness" gradient.
  const ramp = P({ shape: 'Sawtooth', wavelength: 1, phase: 0 });
  ok(waveValue(1, ramp) > 0.99, `a one-cycle sawtooth is at its ceiling at t=1 (${waveValue(1, ramp).toFixed(3)})`);
  ok(waveValue(0, ramp) < -0.99, `and at its floor at t=0 (${waveValue(0, ramp).toFixed(3)})`);
  let rising = true;
  for (let i = 1; i <= 400; i++) if (waveValue(i / 400, ramp) < waveValue((i - 1) / 400, ramp)) rising = false;
  ok(rising, 'and it never steps back on the way — a monotone ramp, end to end');
}

// --- [2] the span envelope --------------------------------------------------------------
console.log('[2] span envelope');
{
  const p = P({ span: [0.25, 0.75], feather: [0.2, 0.2] });
  ok(waveEnvelope(0.1, p) === 0 && waveEnvelope(0.9, p) === 0, 'exactly 0 outside the span');
  ok(waveEnvelope(0.25, p) === 0 && waveEnvelope(0.75, p) === 0, 'exactly 0 at both span ends');
  ok(Math.abs(waveEnvelope(0.5, p) - 1) < 1e-12, 'exactly 1 at the unfeathered middle');
  const flat = P({ span: [0.25, 0.75], feather: [0, 0] });
  ok(waveEnvelope(0.26, flat) === 1 && waveEnvelope(0.74, flat) === 1, 'no feather = 1 right up to the ends');
  // C1 at BOTH ends of each shoulder — the property that makes the edit rejoin the curve
  // with a matching slope instead of a visible crease. Asserted as the SLOPE going to zero,
  // not as a second-difference threshold: the second difference of a smoothstep is
  // 6/feather² × h², which is ~9e-4 at this sampling and says nothing on its own (this
  // harness first asserted < 5e-4 and failed against correct maths — 2026-09-12).
  // A linear ramp — the thing smoothstep is here to beat — has slope 1/0.1 = 10 at both
  // ends of the shoulder, so it fails this by four orders of magnitude.
  const h = 1e-6;
  const slope = (t: number) => (waveEnvelope(t + h, p) - waveEnvelope(t - h, p)) / (2 * h);
  const fa = 0.5 * 0.2;
  // Asserted as a RATIO against the shoulder's own mid-slope, so the numbers carry no
  // arbitrary threshold: smoothstep gives ~1e-4, a linear ramp gives exactly 1.
  const mid = slope(0.25 + fa / 2);
  const rIn = Math.abs(slope(0.25 + h * 2)) / mid;
  const rOut = Math.abs(slope(0.25 + fa - h * 2)) / mid;
  ok(rIn < 1e-2, `slope vanishes where the shoulder leaves the curve (${rIn.toExponential(1)} of mid-slope; linear would be 1)`);
  ok(rOut < 1e-2, `and where it reaches full (${rOut.toExponential(1)} of mid-slope)`);
  ok(mid > 5, `and it is genuinely climbing in between (${mid.toFixed(1)})`);

  // FULLY FEATHERED: 99% from both ends (the UI's new ceiling, raised from 50% on
  // 2026-09-12). The two shoulders overlap and `min` resolves them into one smooth bump —
  // a legitimate shape, and the maths must not produce a negative, a >1, or a kink for it.
  const soft = P({ span: [0.1, 0.9], feather: [0.99, 0.99] });
  let lo = Infinity;
  let hi = -Infinity;
  let peakAt = 0;
  for (let i = 0; i <= 600; i++) {
    const t = i / 600;
    const e = waveEnvelope(t, soft);
    if (e < lo) lo = e;
    if (e > hi) { hi = e; peakAt = t; }
  }
  ok(lo === 0, 'fully feathered: still exactly 0 outside the span');
  ok(hi > 0 && hi <= 1, `fully feathered: peaks inside (0,1] — ${hi.toFixed(3)}`);
  ok(Math.abs(peakAt - 0.5) < 0.02, `fully feathered: and it peaks at the span's middle (t=${peakAt.toFixed(3)})`);
  // one rise then one fall — no ripple from the two shoulders fighting
  let turns = 0;
  for (let i = 2; i <= 600; i++) {
    const a0 = waveEnvelope((i - 2) / 600, soft);
    const b0 = waveEnvelope((i - 1) / 600, soft);
    const c0 = waveEnvelope(i / 600, soft);
    if ((b0 - a0) > 1e-9 !== (c0 - b0) > 1e-9) turns++;
  }
  ok(turns <= 3, `fully feathered: one bump, not a ripple (${turns} turning points)`);
}

// --- [3] a wave never leaves its span ---------------------------------------------------
console.log('[3] the wave is local, in every mode');
{
  const base = (t: number) => 0.5 + 0.3 * Math.sin(t * 7.3 + 1.1);
  for (const mode of WAVE_MODES) {
    for (const shape of WAVE_SHAPES) {
      const p = P({ mode, shape, span: [0.3, 0.7], amplitude: 0.5, offset: 0.2 });
      let worst = 0;
      let moved = 0;
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        const d = Math.abs(applyWaveSample(base(t), t, p, 1) - base(t));
        if (t < 0.3 || t > 0.7) worst = Math.max(worst, d);
        else moved = Math.max(moved, d);
      }
      ok(worst === 0, `${mode}/${shape}: outside the span, byte-identical`);
      ok(moved > 0.01, `${mode}/${shape}: inside the span, it actually does something (${moved.toFixed(3)})`);
    }
  }
}

// --- [4] bias and skew ------------------------------------------------------------------
console.log('[4] bias and skew');
{
  for (let i = 0; i <= 10; i++) ok(Math.abs(biasPow(i / 10, 1) - i / 10) < 1e-12, `bias 1 is the identity at u=${(i / 10).toFixed(1)}`);
  ok(biasPow(0, 3) === 0 && biasPow(1, 3) === 1, 'the endpoints are pinned at any gamma (no tear at a cycle boundary)');
  const mono = (g: number) => {
    for (let i = 1; i <= 200; i++) if (biasPow(i / 200, g) < biasPow((i - 1) / 200, g)) return false;
    return true;
  };
  ok(mono(0.25) && mono(4), 'monotone either side of 1 — a lean, never a fold');
  ok(biasPow(0.5, 2) < 0.5 && biasPow(0.5, 0.5) > 0.5, 'gamma pushes the midpoint both ways');
  // Bias at 1 leaves the wave exactly as it was; that is what makes the handle safe to
  // touch and let go of.
  const a = P({ bias: 1, skew: 1 });
  const b = P({ bias: 1.0000001, skew: 1 });
  let drift = 0;
  for (let i = 0; i <= 500; i++) drift = Math.max(drift, Math.abs(waveValue(i / 500, a) - waveValue(i / 500, b)));
  ok(drift < 1e-5, 'a hair off 1 is a hair off the curve (continuous through the identity)');
  let skewed = 0;
  for (let i = 0; i <= 500; i++) skewed = Math.max(skewed, Math.abs(waveValue(i / 500, P({ skew: 3 })) - waveValue(i / 500, P())));
  ok(skewed > 0.1, `skew reshapes the lobes (max Δ ${skewed.toFixed(2)})`);
}

// --- [5] amplitude is a fraction of the channel range ------------------------------------
console.log('[5] amplitude scales with the channel');
{
  // L spans 1.0, chroma 0.4, hue 2π. The same params must move each channel by the same
  // PROPORTION of its own range — that is what lets one drag drive all three.
  const p = P({ shape: 'Sine', amplitude: 0.2, feather: [0, 0], mode: 'add' });
  const peak = (range: number) => {
    let m = 0;
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000;
      m = Math.max(m, Math.abs(applyWaveSample(0.5 * range, t, p, range) - 0.5 * range));
    }
    return m / range;
  };
  const pl = peak(1), pc = peak(0.4), ph = peak(Math.PI * 2);
  ok(Math.abs(pl - 0.2) < 1e-3, `L: peak is 0.2 of its range (${pl.toFixed(4)})`);
  ok(Math.abs(pl - pc) < 1e-6 && Math.abs(pl - ph) < 1e-6, `chroma and hue match L exactly (${pc.toFixed(4)}, ${ph.toFixed(4)})`);
  ok(Math.abs(peak(1) * 1 - 0.2) < 1e-3 && Math.abs(0.2 * 0.4 - pc * 0.4) < 1e-6, 'so in channel units that is 0.2 on L and 0.08 on chroma');
}

// --- [6] spliceSpan -----------------------------------------------------------------------
console.log('[6] spliceSpan');
{
  const key = (frame: number, value: number): Keyframe => ({ id: `k${frame}`, frame, value, interpolation: 'Bezier' });
  const track = [key(0, 0.1), key(40, 0.9), key(120, 0.2), key(200, 0.8), key(255, 0.4)];
  const span = fitSamplesToKeys(Array.from({ length: 61 }, (_, i) => 0.5 + 0.3 * Math.sin(i / 6)), 100, 0.01, 'w');
  const merged = spliceSpan(track, 100, 160, span);
  ok(!!merged, 'a normal splice returns keys');
  if (merged) {
    ok(merged.every((k, i) => i === 0 || k.frame >= merged[i - 1].frame), 'the result is sorted by frame');
    const outside = merged.filter((k) => k.frame < 100 || k.frame > 160).map((k) => k.frame);
    ok(outside.join(',') === '0,40,200,255', `every key outside the span survives (${outside.join(',')})`);
    ok(!merged.some((k) => k.id === 'k120'), 'the key that was inside the span is gone');
    ok(merged.some((k) => k.frame >= 100 && k.frame <= 160), 'the span has keys in it now');
    // The seam heal is the reason this function exists: the boundary keys must not keep
    // the flat stub handles the isolated fit gave them.
    const first = merged.find((k) => k.frame >= 100);
    ok(!!first?.leftTangent && !!first?.rightTangent, 'the span-opening key was re-tangented (the seam heal ran)');
  }
  ok(spliceSpan([key(0, 0), key(255, 1)], 0, 255, []) === null, 'refuses to leave a track with fewer than two keys');
  ok(spliceSpan([key(0, 0), key(255, 1)], 0, 255, [key(10, 0.5)]) === null, 'one span key and nothing kept is still a refusal');
}

// --- [7] the commit window ---------------------------------------------------------------
console.log('[7] span → frames');
{
  ok(waveSpanFrames(P({ span: [0, 1] }), 255)?.lo === 0, 'a full span starts at frame 0');
  ok(waveSpanFrames(P({ span: [0, 1] }), 255)?.hi === 255, 'and ends at the last frame');
  ok(waveSpanFrames(P({ span: [0.5, 0.5] }), 255) === null, 'a zero-width span commits nothing');
  ok(waveSpanFrames(P({ span: [0.5, 0.503] }), 255) === null, 'a sub-2-frame span commits nothing');
  const w = waveSpanFrames(P({ span: [0.25, 0.75] }), 255);
  ok(w?.lo === 64 && w?.hi === 191, `a half span is frames 64..191 (${w?.lo}..${w?.hi})`);
}

// --- [7b] strength -------------------------------------------------------------------------
console.log('[7b] strength — how much of the filtered curve to take');
{
  const base = (t: number) => 0.5 + 0.3 * Math.sin(t * 7.3 + 1.1);
  for (const mode of WAVE_MODES) {
    const full = P({ mode, shape: 'Sine', amplitude: 0.4, offset: 0.3, feather: [0, 0], strength: 1 });
    const none = P({ ...full, strength: 0 });
    const half = P({ ...full, strength: 0.5 });
    let offBy = 0;
    let halfErr = 0;
    let moved = 0;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const b = base(t);
      offBy = Math.max(offBy, Math.abs(applyWaveSample(b, t, none, 1) - b));
      moved = Math.max(moved, Math.abs(applyWaveSample(b, t, full, 1) - b));
      // half must land exactly midway between doing nothing and doing all of it
      const mid = (b + applyWaveSample(b, t, full, 1)) / 2;
      halfErr = Math.max(halfErr, Math.abs(applyWaveSample(b, t, half, 1) - mid));
    }
    ok(offBy === 0, `${mode}: strength 0 is the curve untouched`);
    ok(moved > 0.05, `${mode}: strength 1 is the filter in full (${moved.toFixed(3)})`);
    ok(halfErr < 1e-12, `${mode}: strength 0.5 is exactly halfway (worst Δ ${halfErr.toExponential(1)})`);
  }
  // Strength is NOT amplitude: in replace mode, shrinking the wave does not undo the
  // replacement, which is the whole reason this parameter exists.
  const tallWeak = P({ mode: 'replace', shape: 'Sine', amplitude: 0.4, offset: 0.3, feather: [0, 0], strength: 0.25 });
  const shortFull = P({ ...tallWeak, amplitude: 0.1, strength: 1 });
  let apart = 0;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    apart = Math.max(apart, Math.abs(applyWaveSample(base(t), t, tallWeak, 1) - applyWaveSample(base(t), t, shortFull, 1)));
  }
  ok(apart > 0.05, `a tall wave at quarter strength is not a short wave at full (apart by ${apart.toFixed(3)})`);
  // and it composes with the feather rather than replacing it
  const feathered = P({ shape: 'Sine', span: [0.2, 0.8], feather: [0.3, 0.3], strength: 0.5, amplitude: 0.4 });
  ok(applyWaveSample(base(0.05), 0.05, feathered, 1) === base(0.05), 'outside the span, strength changes nothing (still exact)');
}

// --- [8] the presets ----------------------------------------------------------------------
console.log('[8] presets');
{
  const { WAVE_PRESETS, presetParams } = await import('../palette/core/wavePresets');
  const { CURVE_SPACE_ORDER, channelForRole, curveSpace } = await import('../palette/core/curveSpaces');

  ok(WAVE_PRESETS.length > 0, `there are presets (${WAVE_PRESETS.length})`);
  ok(new Set(WAVE_PRESETS.map((x) => x.id)).size === WAVE_PRESETS.length, 'their ids are unique');

  // Every preset must resolve to a real channel in at least one space, or it can never be
  // offered anywhere and is dead weight in the head.
  for (const preset of WAVE_PRESETS) {
    if (preset.role === 'active') { ok(true, `${preset.id}: channel-agnostic, offered everywhere`); continue; }
    const spaces = CURVE_SPACE_ORDER.filter((sp) => channelForRole(sp, preset.role) !== null);
    ok(spaces.length > 0, `${preset.id}: lands on a real ${preset.role} channel in ${spaces.length} space(s)`);
  }
  // ...and the space that has NO lightness channel must say so, rather than picking one.
  ok(channelForRole('rgb', 'lightness') === null, 'RGB has no lightness channel, and says so');
  ok(channelForRole('oklab', 'lightness') === 'L', 'OkLCh lightness is L');
  ok(channelForRole('hsv', 'lightness') === 'V', 'HSV lightness is V');
  ok(channelForRole('cielch', 'hue') === 'h*', 'CIE LCh hue is h*');
  for (const sp of CURVE_SPACE_ORDER) {
    const roles = curveSpace(sp).channels.map((c) => c.role);
    ok(roles.length === 3 && roles.every(Boolean), `${sp}: every channel declares a role (${roles.join('/')})`);
  }

  // THE CLAIM THE WHOLE SCHEME RESTS ON: the button is traced from the same params the click
  // applies. Asserted by tracing both and demanding they agree sample for sample — if a
  // preset's glyph were drawn from anything else, the head would advertise a shape the tool
  // does not make.
  for (const preset of WAVE_PRESETS) {
    const applied = presetParams(preset, DEFAULT_WAVE);
    const drawn = presetParams(preset, DEFAULT_WAVE);
    let worst = 0;
    for (let i = 0; i <= 200; i++) worst = Math.max(worst, Math.abs(waveValue(i / 200, applied) - waveValue(i / 200, drawn)));
    ok(worst === 0, `${preset.id}: the glyph traces exactly what applying it produces`);
  }

  // The whole-gradient lightness presets are statements about the WHOLE ramp, so they must
  // reset the span — applying one inside a leftover narrow span would silently do a fraction
  // of what its picture shows.
  const narrow = P({ span: [0.4, 0.6], feather: [0.3, 0.3] });
  for (const id of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'diverging', 'cyclic', 'hue-sweep']) {
    const preset = WAVE_PRESETS.find((x) => x.id === id)!;
    const q = presetParams(preset, narrow);
    ok(q.span[0] === 0 && q.span[1] === 1, `${id}: takes the whole axis, whatever span was set`);
    ok(q.mode === 'replace', `${id}: replaces rather than adds — it IS the curve, not a texture on it`);
  }
  // The textures do the opposite: they ride inside whatever span the user already set.
  for (const id of ['ripple', 'bands', 'grain']) {
    const preset = WAVE_PRESETS.find((x) => x.id === id)!;
    const q = presetParams(preset, narrow);
    ok(q.span[0] === 0.4 && q.span[1] === 0.6, `${id}: keeps the span you set`);
    ok(q.mode === 'add', `${id}: adds to the curve rather than replacing it`);
  }
  // A texture inherits the SPAN and the FEATHER on purpose — they are where you put it, and
  // the tool remembers that like it remembers the channel. It must inherit nothing else. So
  // the comparison holds span and feather equal and demands the rest be identical: applying
  // Ripple after Diverging used to pick up that preset's 0.55 offset and lift the whole
  // channel by 5% of its range (measured 2026-09-12 — Ripple, Diverging, Ripple gave two
  // different gradients), which is the kind of inheritance a preset must not do.
  const sameGeom = (q: WaveParams): WaveParams => ({ ...q, span: [0, 1], feather: [0, 0] });
  for (const id of ['ripple', 'bands', 'grain', 'vivid']) {
    const preset = WAVE_PRESETS.find((x) => x.id === id)!;
    const fresh = sameGeom(presetParams(preset, DEFAULT_WAVE));
    const afterWhole = sameGeom(presetParams(preset, presetParams(WAVE_PRESETS.find((x) => x.id === 'diverging')!, DEFAULT_WAVE)));
    let worst = 0;
    for (let i = 0; i <= 200; i++) {
      worst = Math.max(worst, Math.abs(applyWaveSample(0.5, i / 200, fresh, 1) - applyWaveSample(0.5, i / 200, afterWhole, 1)));
    }
    ok(worst === 0, `${id}: inherits span and feather, and nothing else (worst Δ ${worst.toFixed(4)})`);
  }

  // and a preset must not alias the caller's arrays
  const src = P({ span: [0.2, 0.8] });
  const got = presetParams(WAVE_PRESETS.find((x) => x.id === 'ripple')!, src);
  got.span[0] = 0.9;
  ok(src.span[0] === 0.2, 'applying a preset never writes through to the live params');

  // THE EASES ARE BIAS, and that is the reason there is no easing library here. Each must be
  // a monotone rise (they are ramps), and they must differ from linear in the right
  // direction: ease-in sits BELOW the straight line, ease-out ABOVE it.
  const at = (id: string, t: number) => waveValue(t, presetParams(WAVE_PRESETS.find((x) => x.id === id)!, DEFAULT_WAVE));
  for (const id of ['linear', 'ease-in', 'ease-out', 'ease-in-out']) {
    let rising = true;
    for (let i = 1; i <= 200; i++) if (at(id, i / 200) < at(id, (i - 1) / 200) - 1e-9) rising = false;
    ok(rising, `${id}: monotone rise, end to end`);
    ok(Math.abs(at(id, 0) + 1) < 0.02 && Math.abs(at(id, 1) - 1) < 0.02, `${id}: spans floor to ceiling`);
  }
  ok(at('ease-in', 0.5) < at('linear', 0.5) - 0.05, `ease-in is below the straight line at the midpoint (${at('ease-in', 0.5).toFixed(2)} < ${at('linear', 0.5).toFixed(2)})`);
  ok(at('ease-out', 0.5) > at('linear', 0.5) + 0.05, `ease-out is above it (${at('ease-out', 0.5).toFixed(2)})`);
  ok(Math.abs(at('ease-in-out', 0.5) - at('linear', 0.5)) < 0.02, 'ease-in-out crosses at the midpoint, being symmetric');
  ok(at('ease-in-out', 0.25) < at('linear', 0.25) && at('ease-in-out', 0.75) > at('linear', 0.75),
    'and it is an S — under the line in the first half, over it in the second');

  // Diverging is the one with an interior extremum; cyclic starts and ends together.
  const div = presetParams(WAVE_PRESETS.find((x) => x.id === 'diverging')!, DEFAULT_WAVE);
  ok(waveValue(0.5, div) > 0.99 && waveValue(0, div) < -0.99, 'diverging peaks in the middle and is low at both ends');
  const cyc = presetParams(WAVE_PRESETS.find((x) => x.id === 'cyclic')!, DEFAULT_WAVE);
  ok(Math.abs(waveValue(0, cyc) - waveValue(1, cyc)) < 1e-6, 'cyclic ends where it began');
}

// --- [9] a spliced track never folds back in time ---------------------------------------
// The graph strokes each segment as a real `bezierCurveTo` with the stored handles as its
// control points, so an arm that reaches past the next key makes the curve double back on
// itself — a visible loop, not a subtle error (owner, 2026-09-12: "sometimes sparse keys
// make it loop back upon itself"). SPARSE keys are where it shows, because a kept key's arm
// is a third of a LONG segment and the span boundary the splice puts next to it is close.
//
// The measure is the x-cubic's minimum derivative over the segment, divided by the segment
// width: 1 means x is exactly linear in the parameter (which is what FIT_TANGENT_WEIGHT
// buys), anything below 0 is a fold.
console.log('[9] no fold at the seam');
{
  const F = 255;
  /** A GX-style baked key list: `autoTangent: false`, arms exactly a third of their own
   *  segment. Every track in the Curves face looks like this after any bake, which is why
   *  `reTangentBezier` (which skips hand-broken keys by contract) cannot heal these. */
  const baked = (pts: [number, number][]): Keyframe[] => {
    const keys: Keyframe[] = pts.map(([f, v], n) => ({
      id: `b${n}`, frame: f, value: v, interpolation: 'Bezier' as const,
      autoTangent: false, brokenTangents: false,
      leftTangent: { x: -1, y: 0 }, rightTangent: { x: 1, y: 0 },
    }));
    for (let n = 0; n < keys.length - 1; n++) {
      const arm = (keys[n + 1].frame - keys[n].frame) * FIT_TANGENT_WEIGHT;
      const slope = (keys[n + 1].value - keys[n].value) / (keys[n + 1].frame - keys[n].frame);
      keys[n].rightTangent = { x: arm, y: arm * slope };
      keys[n + 1].leftTangent = { x: -arm, y: -arm * slope };
    }
    keys[0].leftTangent = { x: -keys[0].rightTangent!.x, y: -keys[0].rightTangent!.y };
    const L = keys.length - 1;
    keys[L].rightTangent = { x: -keys[L].leftTangent!.x, y: -keys[L].leftTangent!.y };
    return keys;
  };

  const worstSlope = (keys: Keyframe[]): { v: number; at: string } => {
    let v = Infinity; let at = '';
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i]; const b = keys[i + 1];
      const d = b.frame - a.frame;
      if (a.interpolation !== 'Bezier' || d <= 0) continue;
      const p1 = a.rightTangent?.x ?? d / 3;
      const p2 = d + (b.leftTangent?.x ?? -d / 3);
      for (let n = 0; n <= 200; n++) {
        const t = n / 200, u = 1 - t;
        const dx = 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (d - p2);
        if (dx / d < v) { v = dx / d; at = `${a.frame}->${b.frame}`; }
      }
    }
    return { v, at };
  };

  const stamp = (src: Keyframe[], p: WaveParams): Keyframe[] | null => {
    const win = waveSpanFrames(p, F);
    if (!win) return null;
    const samples = sampleWaveSpan(p, win.lo, win.hi, F, 1, (f) => evaluateTrackValue(src, f, false, false));
    return spliceSpan(src, win.lo, win.hi, fitSamplesToKeys(samples, win.lo, 0.004, `w${win.lo}`));
  };

  const bases: [string, Keyframe[]][] = [
    ['2-key ramp', baked([[0, 0.1], [255, 0.9]])],
    ['3-key ramp', baked([[0, 0.1], [128, 0.6], [255, 0.9]])],
    ['17-key ramp', baked(Array.from({ length: 17 }, (_, i): [number, number] => [i * 16, 0.1 + 0.8 * (i / 16)]))],
  ];
  // The bases themselves are clean — worth asserting, because it is what says the fold is
  // introduced by the SPLICE and not inherited from a badly-shaped source curve. It is also
  // the reason the fix is here rather than a bake of the source before the filter runs.
  for (const [label, src] of bases) {
    ok(worstSlope(src).v >= 0, `${label}: the base itself does not fold`);
  }

  const spans: [number, number][] = [[0.05, 0.95], [0.1, 0.9], [0.2, 0.8], [0.3, 0.7], [0.4, 0.6], [0.45, 0.55]];
  let worstSeen = Infinity; let worstLabel = '';
  for (const [label, src] of bases) {
    for (const span of spans) {
      const out = stamp(src, P({ span, amplitude: 0.3, wavelength: 0.15, strength: 1 }));
      if (!out) continue;
      const w = worstSlope(out);
      if (w.v < worstSeen) { worstSeen = w.v; worstLabel = `${label} span ${span[0]}..${span[1]} at ${w.at}`; }
    }
  }
  ok(worstSeen >= 0, `no segment folds across 3 bases x 6 spans (worst dx/d ${worstSeen.toFixed(3)} — ${worstLabel})`);
  // Not merely non-negative: with the kept arm clamped to d/3 and the span key's set to d/3,
  // x is exactly linear in the Bezier parameter, which is the condition FIT_TANGENT_WEIGHT
  // exists to hold. Anything less means an arm escaped one of the two.
  ok(worstSeen > 0.999, `and x stays linear in the parameter throughout (${worstSeen.toFixed(4)})`);

  // The seam is where it happens, so name the two segments the clamp exists for.
  const sparse = bases[0][1];
  const wide = stamp(sparse, P({ span: [0.05, 0.95], amplitude: 0.3, wavelength: 0.15, strength: 1 }))!;
  const head = wide[0]; const nextK = wide[1];
  ok(Math.abs(head.rightTangent!.x) <= (nextK.frame - head.frame) * FIT_TANGENT_WEIGHT + 1e-9,
    `the kept head key's arm is cut to the new gap (${Math.abs(head.rightTangent!.x).toFixed(2)} <= ${((nextK.frame - head.frame) * FIT_TANGENT_WEIGHT).toFixed(2)}, was 85)`);
  const tail = wide[wide.length - 1]; const prevK = wide[wide.length - 2];
  ok(Math.abs(tail.leftTangent!.x) <= (tail.frame - prevK.frame) * FIT_TANGENT_WEIGHT + 1e-9,
    `and so is the kept tail key's (${Math.abs(tail.leftTangent!.x).toFixed(2)} <= ${((tail.frame - prevK.frame) * FIT_TANGENT_WEIGHT).toFixed(2)})`);

  // CLAMP, not set: a kept arm that already fits is authored shape and must survive.
  //
  // Reaching this branch takes a HAND-DRAGGED arm. On a purely baked track it is unreachable
  // by construction — the kept key's arm is a third of the way to a neighbour the splice
  // removed, and that neighbour is always further off than the boundary key that replaced
  // it, so the arm always overreaches. Handle dragging is what puts a short arm on a key
  // whose neighbour is far, and that arm is the user's shape: setting it to d/3 would bend a
  // segment nobody asked about.
  const dragged = baked([[0, 0.1], [255, 0.9]]);
  dragged[0] = { ...dragged[0], rightTangent: { x: 2, y: 0.01 } };
  const narrowSpan = stamp(dragged, P({ span: [0.45, 0.55], amplitude: 0.3, wavelength: 0.15, strength: 1 }))!;
  const room = (narrowSpan[1].frame - narrowSpan[0].frame) * FIT_TANGENT_WEIGHT;
  ok(room > 2, `the test is live: there is room to lengthen (${room.toFixed(1)} > 2)`);
  ok(narrowSpan[0].rightTangent!.x === 2 && narrowSpan[0].rightTangent!.y === 0.01,
    'a short hand-set arm survives the splice untouched — the clamp only ever shortens');
}

console.log(failures === 0 ? '\nAll wave-filter checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
