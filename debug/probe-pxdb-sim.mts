// Item-2 Oxnot: CPU float32 sim of the EXACT decoded PseudoXDB orbit (matches the [CODE]).
// Iterate a grid of Mandelbrot pixels in float32 (Math.fround) vs float64; count how many
// orbits NaN / overflow / stay bounded. If float32 degenerates where float64 survives, the
// K=2|z|/sqrt(x²+y²) singularity is the render bug (MB3D is float64/x87-80bit).
const f = Math.fround;
const Zmul = 1.0, RSTOP2 = 16 * 16; // deBailout 256

// One PseudoXDB step. fr = float32 rounding fn (identity for f64).
function step(x: number, y: number, zz: number, cx: number, cy: number, cz: number, r: (n: number) => number) {
  const x2 = r(x * x), y2 = r(y * y);
  const az = r(Math.abs(zz));
  const zp = r(r(r(az * az) - r(x2 + y2)) * Zmul);            // z' pre-c
  const znew = r(zp + cz);
  const denom = r(Math.sqrt(r(x2 + y2)));
  const K = r(r(2 * az) / denom);                             // 2|z| / sqrt(x²+y²)  ← singularity
  const ynew = r(r(r(2 * K) * r(x * y)) + cy);
  const xnew = r(r(K * r(x2 - y2)) + cx);
  return [xnew, ynew, znew];
}

function orbit(px: number, py: number, pz: number, r: (n: number) => number, iters = 60) {
  let x = px, y = py, zz = pz;
  for (let i = 0; i < iters; i++) {
    [x, y, zz] = step(x, y, zz, px, py, pz, r);
    const rr = r(r(x * x) + r(r(y * y) + r(zz * zz)));
    if (!isFinite(rr) || isNaN(rr)) return { fate: 'NAN', i };
    if (rr > RSTOP2) return { fate: 'escaped', i };
  }
  return { fate: 'bounded', i: iters };
}

const id = (n: number) => n;
for (const [tag, r] of [['float32', f], ['float64', id]] as const) {
  const tally: Record<string, number> = { NAN: 0, escaped: 0, bounded: 0 };
  const N = 80, EXT = 2.0;
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const px = (ix / (N - 1) * 2 - 1) * EXT;
    const py = (iy / (N - 1) * 2 - 1) * EXT;
    const pz = 0.15; // a representative near-mid slice
    tally[orbit(px, py, pz, r).fate]++;
  }
  const tot = N * N;
  console.log(`${tag}: NAN=${(100 * tally.NAN / tot).toFixed(1)}%  escaped=${(100 * tally.escaped / tot).toFixed(1)}%  bounded=${(100 * tally.bounded / tot).toFixed(1)}%`);
}

// Spot-check a single interior pixel's orbit in float32
console.log('\n--- interior pixel (0.2, 0.1, 0.15) float32 orbit r² per iter ---');
let x = 0.2, y = 0.1, zz = 0.15;
for (let i = 0; i < 12; i++) {
  [x, y, zz] = step(x, y, zz, 0.2, 0.1, 0.15, f);
  console.log(`  i=${i}: x=${x.toFixed(4)} y=${y.toFixed(4)} z=${zz.toFixed(4)} r²=${(x*x+y*y+zz*zz).toExponential(2)}`);
  if (!isFinite(x * x + y * y + zz * zz)) { console.log('  → NaN/inf'); break; }
}
