/**
 * ramp-geometry harness — verifies the Gradient Explorer fullscreen mappings are PURE +
 * DETERMINISTIC (the determinism contract), and that the flat-optional `GeometryParams`
 * stay ADDITIVE (an omitted field reproduces its GEOM_DEFAULT byte-for-byte).
 *
 * Run: npx tsx debug/test-palette-rampgeometry.mts
 */

import {
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
  // Arched masks part of the frame (a band) → some pixels are background.
  const arch = sampleGeometry('arched', P, W, H);
  ok(Array.from(arch.cov).some((c) => c === 0), 'arched: leaves background outside the band');
  ok(Array.from(arch.cov).some((c) => c > 0), 'arched: paints a band');
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
    }],
    ['conic', {
      conicAngle: GEOM_DEFAULTS.conicAngle, conicCx: GEOM_DEFAULTS.conicCx, conicCy: GEOM_DEFAULTS.conicCy,
      conicMirror: GEOM_DEFAULTS.conicMirror, conicBiasA: GEOM_DEFAULTS.conicBiasA, conicBiasB: GEOM_DEFAULTS.conicBiasB,
    }],
    ['arched', {
      archCy: GEOM_DEFAULTS.archCy, archR: GEOM_DEFAULTS.archR, archHalfWidth: GEOM_DEFAULTS.archHalfWidth,
      archSpan: GEOM_DEFAULTS.archSpan, archCurve: GEOM_DEFAULTS.archCurve,
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
    ['conic', { conicAngle: 1.2 }, 'conicAngle'],
    ['conic', { conicCx: 0.4 }, 'conicCx'],
    ['conic', { conicMirror: 0.4 }, 'conicMirror'],
    ['conic', { conicBiasA: 1.0 }, 'conicBiasA'],
    ['arched', { archR: 3.1 }, 'archR'],
    ['arched', { archHalfWidth: 0.6 }, 'archHalfWidth'],
    ['arched', { archCurve: 0.2 }, 'archCurve'],
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
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
