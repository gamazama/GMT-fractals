/**
 * ramp-geometry harness — verifies the Gradient Explorer fullscreen mappings are PURE +
 * DETERMINISTIC (the determinism contract), and that the flat-optional `GeometryParams`
 * stay ADDITIVE (an omitted field reproduces its GEOM_DEFAULT byte-for-byte).
 *
 * Run: npx tsx debug/test-palette-rampgeometry.mts
 */

import {
  DEFAULT_BACKGROUND,
  GEOMETRIES,
  GEOM_DEFAULTS,
  mulberry32,
  renderGeometry,
  sampleGeometry,
  type GeometryId,
  type GeometryParams,
} from '../palette/core/rampGeometry';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

// A small synthetic ramp: a black→white grey ladder so positions map to a known value.
const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: i, b: i }));
const W = 64;
const H = 48;
const P: GeometryParams = {};

const hash = (a: ArrayLike<number>): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < a.length; i++) {
    h ^= a[i] & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

/** Paint a hand-built field through the ramp, the way `renderGeometry` does — the only way to
 *  reach the coverage blend now that no geometry produces partial coverage. Mirrors the blend
 *  in renderGeometry: `bg + (colour - bg) * coverage`. */
const renderGeometryFromSample = (s: { width: number; height: number; pos: Float32Array; cov: Float32Array }): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(s.width * s.height * 4);
  const last = ramp.length - 1;
  for (let i = 0; i < s.pos.length; i++) {
    const c = s.cov[i];
    const col = ramp[Math.round(Math.min(1, Math.max(0, s.pos[i])) * last)] ?? DEFAULT_BACKGROUND;
    const o = i * 4;
    out[o] = DEFAULT_BACKGROUND.r + (col.r - DEFAULT_BACKGROUND.r) * c;
    out[o + 1] = DEFAULT_BACKGROUND.g + (col.g - DEFAULT_BACKGROUND.g) * c;
    out[o + 2] = DEFAULT_BACKGROUND.b + (col.b - DEFAULT_BACKGROUND.b) * c;
    out[o + 3] = 255;
  }
  return out;
};

// --- [1] mulberry32 is a deterministic stream -----------------------------------------
console.log('[1] mulberry32 determinism');
{
  const a = mulberry32(42);
  const b = mulberry32(42);
  const c = mulberry32(43);
  const sa = [a(), a(), a(), a()];
  const sb = [b(), b(), b(), b()];
  const sc = [c(), c(), c(), c()];
  ok(sa.every((v, i) => v === sb[i]), 'same seed → identical stream');
  ok(sa.some((v, i) => v !== sc[i]), 'different seed → different stream');
  ok(sa.every((v) => v >= 0 && v < 1), 'values in [0,1)');
}

// --- [2] every geometry is fully deterministic ----------------------------------------
console.log('[2] geometry determinism (all configs)');
for (const g of GEOMETRIES) {
  const a = renderGeometry(ramp, g.id, P, W, H);
  const b = renderGeometry(ramp, g.id, P, W, H);
  ok(a.length === W * H * 4, `${g.id}: RGBA buffer is W*H*4`);
  ok(hash(a) === hash(b), `${g.id}: identical inputs → byte-identical output`);
}

// --- [3] continuous fields cover every pixel; positions stay in range ------------------
console.log('[3] field shape invariants');
{
  const continuous: GeometryId[] = ['linear', 'radial', 'conic'];
  for (const g of continuous) {
    const s = sampleGeometry(g, P, W, H);
    ok(Array.from(s.cov).every((c) => c === 1), `${g}: every pixel covered`);
    ok(Array.from(s.pos).every((p) => p >= 0 && p <= 1), `${g}: positions in [0,1]`);
  }
  // Linear defaults to a pure horizontal sweep: left column = 0, right column = 1.
  const lin = sampleGeometry('linear', P, W, H);
  ok(lin.pos[0] === 0, 'linear: top-left position is 0');
  ok(Math.abs(lin.pos[W - 1] - 1) < 1e-6, 'linear: top-right position is 1');
  // COVERAGE. No shipped geometry masks a pixel since Arched was retired (2026-09-08), so the
  // blend-toward-background path has no geometry exercising it — it is part of the field
  // contract a future masked geometry would use, and it is guarded here with a hand-built
  // sample rather than left to rot untested.
  const synthetic = {
    width: 3, height: 1,
    pos: new Float32Array([0, 1, 1]),
    cov: new Float32Array([0, 1, 0.5]),
  };
  const blended = renderGeometry(ramp, 'linear', P, 3, 1);
  ok(blended.length === 12, 'renderGeometry honours an explicit width/height');
  const cvg = renderGeometryFromSample(synthetic);
  ok(cvg[0] === DEFAULT_BACKGROUND.r, 'coverage 0 → the background colour');
  ok(cvg[4] === 255, 'coverage 1 → the ramp colour, unblended');
  const mid = DEFAULT_BACKGROUND.r + (255 - DEFAULT_BACKGROUND.r) * 0.5;
  ok(Math.abs(cvg[8] - mid) <= 1, `coverage 0.5 → halfway to the background (${cvg[8]} ≈ ${mid.toFixed(1)})`);
}

// --- [4] renderGeometry maps positions through the ramp -------------------------------
console.log('[4] ramp lookup');
{
  // Linear, left edge → ramp[0] (black), right edge → ramp[255] (white).
  const buf = renderGeometry(ramp, 'linear', P, W, H);
  ok(buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 255, 'left edge = ramp[0]');
  const rx = (W - 1) * 4;
  ok(buf[rx] === 255 && buf[rx + 3] === 255, 'right edge = ramp[255]');
}

// --- [5] flat-optional GeometryParams contract (the additive gate) ---------------------
// Two invariants:
//   (a) ADDITIVE: omitting a field renders byte-identically to passing its GEOM_DEFAULT
//       (so the pre-handles code is reproduced exactly — no silent regression).
//   (b) WIRED + DETERMINISTIC: a non-default field actually changes the output, and the
//       same params always reproduce the same bytes.
console.log('[5] flat-optional params contract');
{
  // (a) absent field == explicit default, for every field-bearing geometry.
  const cases: Array<[GeometryId, GeometryParams]> = [
    ['linear', { linearAngle: GEOM_DEFAULTS.linearAngle, linearBias: GEOM_DEFAULTS.linearBias }],
    ['radial', {
      radialCx: GEOM_DEFAULTS.radialCx, radialCy: GEOM_DEFAULTS.radialCy,
      radialScale: GEOM_DEFAULTS.radialScale, radialBias: GEOM_DEFAULTS.radialBias,
      radialSineAmp: GEOM_DEFAULTS.radialSineAmp, radialSineFreq: GEOM_DEFAULTS.radialSineFreq,
    }],
    ['conic', {
      conicAngle: GEOM_DEFAULTS.conicAngle, conicCx: GEOM_DEFAULTS.conicCx, conicCy: GEOM_DEFAULTS.conicCy,
      conicMirror: GEOM_DEFAULTS.conicMirror, conicBiasA: GEOM_DEFAULTS.conicBiasA, conicBiasB: GEOM_DEFAULTS.conicBiasB,
      conicTwist: GEOM_DEFAULTS.conicTwist,
    }],
  ];
  for (const [g, explicit] of cases) {
    const bare = renderGeometry(ramp, g, {}, W, H);
    const full = renderGeometry(ramp, g, explicit, W, H);
    ok(hash(bare) === hash(full), `${g}: omitted fields == explicit GEOM_DEFAULTS (additive)`);
  }

  // (b) a non-default field changes the output AND is deterministic.
  const variants: Array<[GeometryId, GeometryParams, string]> = [
    ['linear', { linearAngle: 0.6 }, 'linearAngle'],
    ['linear', { linearBias: 1.2 }, 'linearBias'],
    ['radial', { radialCx: 0.6 }, 'radialCx'],
    ['radial', { radialScale: 0.6 }, 'radialScale'],
    ['radial', { radialBias: 1.0 }, 'radialBias'],
    ['radial', { radialSineAmp: 0.4 }, 'radialSineAmp'],
    ['conic', { conicAngle: 1.2 }, 'conicAngle'],
    ['conic', { conicCx: 0.4 }, 'conicCx'],
    ['conic', { conicMirror: 0.4 }, 'conicMirror'],
    ['conic', { conicBiasA: 1.0 }, 'conicBiasA'],
    ['conic', { conicTwist: 0.8 }, 'conicTwist'],
  ];
  for (const [g, params, field] of variants) {
    const def = renderGeometry(ramp, g, {}, W, H);
    const v1 = renderGeometry(ramp, g, params, W, H);
    const v2 = renderGeometry(ramp, g, params, W, H);
    ok(hash(v1) !== hash(def), `${g}: ${field} changes the output (wired)`);
    ok(hash(v1) === hash(v2), `${g}: ${field} is deterministic`);
  }

  // Conic rotation by a full turn wraps back to the unrotated field (seam handling).
  const cBase = renderGeometry(ramp, 'conic', {}, W, H);
  const cTurn = renderGeometry(ramp, 'conic', { conicAngle: Math.PI * 2 }, W, H);
  ok(hash(cBase) === hash(cTurn), 'conic: +2π rotation wraps to the base field');

  // (c) the two Phase W params that only bite in combination. The petal COUNT is inert while
  // the amplitude is 0 (the sampler skips the sine wholesale), so comparing it against the
  // default field would prove nothing — it has to be compared against the same field with the
  // waves already open. Falsified 2026-09-08 by ignoring `radialSineFreq` in `radialSineReach`.
  const wavyA = renderGeometry(ramp, 'radial', { radialSineAmp: 0.4, radialSineFreq: 5 }, W, H);
  const wavyB = renderGeometry(ramp, 'radial', { radialSineAmp: 0.4, radialSineFreq: 9 }, W, H);
  ok(hash(wavyA) !== hash(wavyB), 'radial: radialSineFreq changes the petal count (wired)');
  const freqInert = renderGeometry(ramp, 'radial', { radialSineFreq: 9 }, W, H);
  ok(hash(freqInert) === hash(renderGeometry(ramp, 'radial', {}, W, H)),
    'radial: the count is inert at zero amplitude (a plain circle stays byte-identical)');
  const twA = renderGeometry(ramp, 'conic', { conicTwist: 0.8 }, W, H);
  const twB = renderGeometry(ramp, 'conic', { conicTwist: 1.6 }, W, H);
  ok(hash(twA) !== hash(twB), 'conic: twist winds further with a larger value');

  // Twist is a SPIRAL, not a rotation — which means, precisely, that two points on the SAME
  // ray take different ramp positions once it is on, and the winding grows with the radius
  // (log(1+r), so the far sample is wound further than the near one). Sampled on an odd-sized
  // field so both test pixels sit exactly on the +x axis (uy = 0) and share an angle to the
  // bit. Falsified 2026-09-08 by making `conicTwistTurns` radius-independent: the two
  // positions become equal again and both assertions go red.
  const OW = 65, OH = 49; // centre lands on pixel (32, 24)
  const rayPos = (twist: number, dx: number): number =>
    sampleGeometry('conic', { conicTwist: twist }, OW, OH).pos[24 * OW + (32 + dx)];
  ok(rayPos(0, 4) === rayPos(0, 16), 'conic: with no twist one ray is one position');
  const near = rayPos(0.8, 4);
  const far = rayPos(0.8, 16);
  ok(near !== far, 'conic: twist gives the same ray different positions with radius (a spiral)');
  ok(far > near, 'conic: the winding grows with the radius (log(1+r), not a rigid rotation)');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
