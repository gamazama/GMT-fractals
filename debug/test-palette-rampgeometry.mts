/**
 * ramp-geometry harness — verifies the W11 fullscreen-config mappings are PURE +
 * DETERMINISTIC (the determinism contract), including the SEEDED stochastic field.
 *
 * Run: npx tsx debug/test-palette-rampgeometry.mts
 */

import {
  GEOMETRIES,
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
const P: GeometryParams = { amount: 0.5, seed: 1234 };

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

// --- [2] every continuous geometry is fully deterministic ------------------------------
console.log('[2] geometry determinism (all configs)');
for (const g of GEOMETRIES) {
  const a = renderGeometry(ramp, g.id, P, W, H);
  const b = renderGeometry(ramp, g.id, P, W, H);
  ok(a.length === W * H * 4, `${g.id}: RGBA buffer is W*H*4`);
  ok(hash(a) === hash(b), `${g.id}: identical inputs → byte-identical output`);
}

// --- [3] the SEEDED random field reproduces per (seed, amount) -------------------------
console.log('[3] seeded random field');
{
  const roll = (seed: number, amount: number) =>
    sampleGeometry('random', { seed, amount }, W, H);
  const r1 = roll(777, 0.5);
  const r2 = roll(777, 0.5);
  ok(hash(r1.cov) === hash(r2.cov), 'same (seed, amount) → identical coverage field');
  ok(hash(r1.pos) === hash(r2.pos), 'same (seed, amount) → identical position field');

  // A different seed (a re-roll) yields a different field.
  const r3 = roll(778, 0.5);
  ok(hash(r3.cov) !== hash(r1.cov), 're-roll (new seed) → different field');

  // Coverage rises with amount (more dots), and amount=0 still leaves the void mostly empty.
  const covered = (s: { cov: Float32Array }) => s.cov.reduce((n, c) => n + (c > 0 ? 1 : 0), 0);
  const low = covered(roll(777, 0.1));
  const high = covered(roll(777, 0.9));
  ok(high > low, `amount drives density (low=${low} < high=${high})`);
}

// --- [4] continuous fields cover every pixel; positions stay in range ------------------
console.log('[4] field shape invariants');
{
  const continuous: GeometryId[] = ['linear', 'radial', 'conic', 'scurve'];
  for (const g of continuous) {
    const s = sampleGeometry(g, P, W, H);
    ok(Array.from(s.cov).every((c) => c === 1), `${g}: every pixel covered`);
    ok(Array.from(s.pos).every((p) => p >= 0 && p <= 1), `${g}: positions in [0,1]`);
  }
  // Linear is a pure horizontal sweep: left column = 0, right column = 1.
  const lin = sampleGeometry('linear', P, W, H);
  ok(lin.pos[0] === 0, 'linear: top-left position is 0');
  ok(Math.abs(lin.pos[W - 1] - 1) < 1e-6, 'linear: top-right position is 1');
  // Arched masks part of the frame (a band) → some pixels are background.
  const arch = sampleGeometry('arched', P, W, H);
  ok(Array.from(arch.cov).some((c) => c === 0), 'arched: leaves background outside the band');
  ok(Array.from(arch.cov).some((c) => c > 0), 'arched: paints a band');
}

// --- [5] renderGeometry maps positions through the ramp -------------------------------
console.log('[5] ramp lookup');
{
  // Linear, left edge → ramp[0] (black), right edge → ramp[255] (white).
  const buf = renderGeometry(ramp, 'linear', P, W, H);
  ok(buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 255, 'left edge = ramp[0]');
  const rx = (W - 1) * 4;
  ok(buf[rx] === 255 && buf[rx + 3] === 255, 'right edge = ramp[255]');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
