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
 *       refuses rather than returning a track with fewer than two keys.
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
import { spliceSpan, fitSamplesToKeys } from '../utils/CurveFitting';
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
  const count = (lam: number) => {
    const p = P({ shape: 'Sine', wavelength: lam });
    let n = 0;
    for (let i = 1; i <= 4000; i++) {
      if (waveValue((i - 1) / 4000, p) < 0 && waveValue(i / 4000, p) >= 0) n++;
    }
    return n;
  };
  ok(count(0.1) === 10 && count(0.05) === 20, `halving the wavelength doubles the cycles (${count(0.1)} → ${count(0.05)})`);
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

console.log(failures === 0 ? '\nAll wave-filter checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
