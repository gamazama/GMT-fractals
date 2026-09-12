/**
 * curve-space harness — pins `palette/core/curveSpaces.ts`, the five axes the Curves editor
 * can draw a gradient along (GE v2, 2026-09-12).
 *
 * Pure maths over 256-sample channel arrays, so it runs on bare node. What it proves:
 *   [1] the chooser list is exactly the blend chooser's, minus the non-axis modes, and every
 *       id resolves to a definition (a stored or hand-edited id can never strand the editor
 *       with no axes);
 *   [2] every space ROUND-TRIPS an in-gamut gradient back to the same colours — the claim
 *       that makes "switch to RGB, draw, switch back" honest;
 *   [3] the gamut-bound spaces are the ones that clip and the others are not, so the
 *       `gamutBound` flag the UI warns from is telling the truth;
 *   [4] angular channels come back UNWRAPPED (continuous across the seam) and the
 *       rectangular ones are untouched — a hue that crosses red must not draw as a cliff;
 *   [5] epsilon is per-channel and scaled to that channel's own units, so one Detail
 *       setting does not mean 100× more keys on CIE L* than on Oklab L.
 *
 * Run: npx tsx debug/test-palette-curvespaces.mts
 */

import {
  CURVE_SPACE_ORDER,
  DEFAULT_CURVE_SPACE,
  curveSpace,
  curveSpaceKeys,
  fromCurveChannels,
  toCurveChannels,
  unwrapAngle,
  type CurveSpace,
} from '../palette/core/curveSpaces';
import { decomposeRamp } from '../palette/core/generatorPipeline';
import { BLEND_SPACE_ORDER } from '../utils/colorUtils';
import { oklabToRgbSafe } from '../palette/core/oklab';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

/** A 256-step ramp that walks the hue circle more than once and varies L and C — so it
 *  exercises the seam, the poles and the mid-chroma body all at once. */
const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255;
  return oklabToRgbSafe({
    L: 0.35 + 0.4 * Math.sin(t * 5.1),
    a: 0.13 * Math.cos(t * Math.PI * 2 * 1.7),
    b: 0.13 * Math.sin(t * Math.PI * 2 * 1.7),
  });
});
const base = decomposeRamp(ramp);

/** Compare two OkLCh channel sets as COLOURS: comparing h directly is meaningless where
 *  C ≈ 0 (every hue is the same grey there), which is a real part of this ramp. */
const maxColourDelta = (a: typeof base, b: typeof base) => {
  let worst = 0;
  for (let i = 0; i < 256; i++) {
    const p = oklabToRgbSafe({ L: a.L[i], a: a.C[i] * Math.cos(a.h[i]), b: a.C[i] * Math.sin(a.h[i]) });
    const q = oklabToRgbSafe({ L: b.L[i], a: b.C[i] * Math.cos(b.h[i]), b: b.C[i] * Math.sin(b.h[i]) });
    worst = Math.max(worst, Math.abs(p.r - q.r), Math.abs(p.g - q.g), Math.abs(p.b - q.b));
  }
  return worst;
};

// --- [1] the list ------------------------------------------------------------------------
console.log('[1] the chooser list');
{
  const expected = BLEND_SPACE_ORDER.filter((s) => s !== 'spectral' && s !== 'hsv-far');
  ok(CURVE_SPACE_ORDER.join(',') === expected.join(','),
    `is BLEND_SPACE_ORDER minus the non-axis modes (${CURVE_SPACE_ORDER.join(', ')})`);
  ok(!CURVE_SPACE_ORDER.includes('spectral' as CurveSpace), 'Spectral is absent — it is a mixing model, not three axes');
  ok(CURVE_SPACE_ORDER.includes(DEFAULT_CURVE_SPACE), 'the default (OkLCh) is in the list');
  for (const id of CURVE_SPACE_ORDER) {
    const d = curveSpace(id);
    ok(d.id === id && d.channels.length === 3, `${id}: resolves to three channels (${curveSpaceKeys(id).join('/')})`);
  }
  ok(curveSpace('not-a-space').id === DEFAULT_CURVE_SPACE, 'an unknown id falls back to OkLCh rather than to nothing');
  ok(curveSpace(undefined).id === DEFAULT_CURVE_SPACE, 'and so does undefined (an older document)');
  const keys = CURVE_SPACE_ORDER.map((id) => curveSpaceKeys(id).join(''));
  ok(new Set(keys).size === keys.length, `each space has its own key triple (${keys.join(' · ')})`);
}

// --- [2] the round trip ------------------------------------------------------------------
console.log('[2] round trip');
{
  for (const id of CURVE_SPACE_ORDER) {
    const [a, b, c] = toCurveChannels(id, base);
    const backAgain = fromCurveChannels(id, a, b, c);
    const d = maxColourDelta(base, backAgain);
    // 2/255 of headroom: the gamut-bound spaces make a round trip through 8-bit-ish sRGB
    // floats, and CIE Lab's cube root is not exactly invertible in binary floating point.
    ok(d <= 2, `${id}: a gradient survives the trip out and back (max Δ ${d.toFixed(2)}/255)`);
    ok(a.length === 256 && b.length === 256 && c.length === 256, `${id}: all three channels are 256 long`);
  }
  const [L, C, h] = toCurveChannels('oklab', base);
  ok(L.every((v, i) => v === base.L[i]) && C.every((v, i) => v === base.C[i]),
    'OkLCh is the IDENTITY on L and C — the pipeline\'s own space cannot lose anything');
}

// --- [3] which spaces clip ---------------------------------------------------------------
console.log('[3] gamut');
{
  // An OUT-OF-GAMUT gradient: chroma far past what sRGB can show. The rectangular spaces
  // must carry it; the sRGB-routed ones must clip it, which is what `gamutBound` claims.
  const wild = {
    L: Array.from({ length: 256 }, (_, i) => 0.5 + 0.1 * Math.sin(i / 12)),
    C: Array.from({ length: 256 }, () => 0.9),
    h: Array.from({ length: 256 }, (_, i) => (i / 255) * Math.PI * 2),
  };
  for (const id of CURVE_SPACE_ORDER) {
    const def = curveSpace(id);
    const [a, b, c] = toCurveChannels(id, wild);
    const back = fromCurveChannels(id, a, b, c);
    const keptChroma = Math.max(...back.C);
    if (def.gamutBound) {
      ok(keptChroma < 0.5, `${id}: gamutBound, and it does clip (chroma 0.9 → ${keptChroma.toFixed(3)})`);
    } else {
      ok(keptChroma > 0.85, `${id}: not gamutBound, and it does carry it (chroma 0.9 → ${keptChroma.toFixed(3)})`);
    }
  }
}

// --- [4] angular channels ----------------------------------------------------------------
console.log('[4] unwrapping');
{
  // Raw, an ascending hue wraps at ±π; unwrapped it must climb monotonically past one turn.
  const wrapped = Array.from({ length: 256 }, (_, i) => {
    const a = (i / 255) * Math.PI * 4;
    return Math.atan2(Math.sin(a), Math.cos(a));
  });
  const jumps = wrapped.filter((v, i) => i > 0 && Math.abs(v - wrapped[i - 1]) > Math.PI).length;
  ok(jumps >= 2, `the raw angle really does wrap (${jumps} seams to cross)`);
  const un = unwrapAngle(wrapped);
  ok(un.every((v, i) => i === 0 || v >= un[i - 1] - 1e-9), 'unwrapped, it climbs without a single step back');
  ok(un[255] - un[0] > Math.PI * 3.9, `and it covers the whole two turns (${((un[255] - un[0]) / Math.PI).toFixed(2)}π)`);
  ok(unwrapAngle([]).length === 0, 'an empty channel unwraps to an empty channel');
  ok(unwrapAngle([10, 350, 10], 360).map(Math.round).join(',') === '10,-10,10', 'the period is a parameter (degrees work too)');

  // In the registry: every angular channel comes back continuous, every other one untouched.
  for (const id of CURVE_SPACE_ORDER) {
    const def = curveSpace(id);
    const out = toCurveChannels(id, base);
    const raw = def.fromOklch(base);
    def.channels.forEach((chan, i) => {
      const seam = out[i].filter((v, n) => n > 0 && Math.abs(v - out[i][n - 1]) > Math.PI).length;
      if (chan.angular) ok(seam === 0, `${id}.${chan.key}: angular, and comes back with no seam`);
      else ok(out[i].every((v, n) => v === raw[i][n]), `${id}.${chan.key}: not angular, and is passed through untouched`);
    });
  }
}

// --- [5] per-channel epsilon -------------------------------------------------------------
console.log('[5] epsilon is per-channel, in the channel\'s own units');
{
  for (const id of CURVE_SPACE_ORDER) {
    const def = curveSpace(id);
    def.channels.forEach((c) => {
      const span = c.max - c.min;
      const rel = c.eps / span;
      // Every channel's tolerance must be a comparable FRACTION of its own range, or one
      // Detail number means a different curve fidelity per channel. 0.5%..2% is the band
      // OkLCh's hand-tuned trio (0.01/1, 0.01/0.4, 0.06/2π) already sat in.
      ok(rel > 0.004 && rel < 0.03, `${id}.${c.key}: eps ${c.eps} is ${(rel * 100).toFixed(2)}% of its ${span.toFixed(2)} range`);
    });
  }
  // The specific claim that motivated it: CIE L* spans 100 where Oklab L spans 1, so its
  // epsilon must be ~100× — not the same number.
  const okL = curveSpace('oklab').channels[0].eps;
  const cieL = curveSpace('cielch').channels[0].eps;
  ok(cieL / okL > 50 && cieL / okL < 200, `CIE L* eps is ${(cieL / okL).toFixed(0)}× Oklab L's, matching its 100× range`);
}

console.log(failures === 0 ? '\nAll curve-space checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
