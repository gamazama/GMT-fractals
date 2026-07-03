// Float32 sim of fixed-count Rout DE vs analytic, on a FOLD-based Mandelbox (representative
// of MB3D AmazingBox — linear ~|scale|× growth/step, NOT high-power). Confirms whether the
// session's fixed-count Rout design is clean for folds (where my z^8 Mandelbulb sim saturated).
const f = Math.fround;
const SCALE = -1.5, MINR2 = 0.25, FIXED = 1 / MINR2;
const BAIL2 = 100;           // normal bailout (radius²)
const CAP2 = f(BAIL2 * 64);  // inflated cap for perturbed runs (Rstop3D analogue)
const ITERS = 60;

function boxFold(v: number) { return v > 1 ? f(2 - v) : (v < -1 ? f(-2 - v) : v); }
function step(z: number[], c: number[]): void {
  z[0] = boxFold(z[0]); z[1] = boxFold(z[1]); z[2] = boxFold(z[2]);
  let m = f(f(z[0] * z[0]) + f(f(z[1] * z[1]) + f(z[2] * z[2])));
  let s = 1;
  if (m < MINR2) s = FIXED; else if (m < 1) s = f(1 / m);
  z[0] = f(f(SCALE * f(z[0] * s)) + c[0]);
  z[1] = f(f(SCALE * f(z[1] * s)) + c[1]);
  z[2] = f(f(SCALE * f(z[2] * s)) + c[2]);
}
function r2of(z: number[]) { return f(f(z[0] * z[0]) + f(f(z[1] * z[1]) + f(z[2] * z[2]))); }

function analyticDE(p: number[]): number {
  const z = [...p]; let dr = 1, r2 = r2of(z);
  for (let i = 0; i < ITERS; i++) {
    if (r2 > BAIL2) break;
    // analytic dr for mandelbox (approx): dr = dr*|scale|*foldFactor + 1
    const m = r2; let s = 1; if (m < MINR2) s = FIXED; else if (m < 1) s = f(1 / m);
    dr = f(f(Math.abs(SCALE) * s) * dr + 1);
    step(z, p); r2 = r2of(z);
  }
  const r = f(Math.sqrt(r2));
  return f(f(0.5 * f(r * f(Math.log(Math.max(r, 1.0001))))) / Math.max(Math.abs(dr), 1e-10));
}

function centerCount(p: number[]): number {
  const z = [...p]; let r2 = r2of(z);
  for (let i = 0; i < ITERS; i++) {
    if (r2 > BAIL2) return i;
    step(z, p); r2 = r2of(z);
    if (r2 > BAIL2) return i + 1;
  }
  return ITERS;
}
function iterateRadius(p: number[], nC: number): number {
  const z = [...p];
  for (let i = 0; i < nC; i++) {
    step(z, p);
    if (r2of(z) > CAP2) break;   // inflated cap (perturbed don't bail at normal, but stay finite)
  }
  return Math.min(r2of(z), CAP2);
}
function numericDE(p: number[], e: number, K: number): { de: number; g: number; R0: number; nC: number } {
  const nC = centerCount(p);
  const R0 = iterateRadius(p, nC);
  if (R0 < 1e-20) return { de: 1e-4, g: 0, R0, nC };
  const dRx = f(iterateRadius([p[0] + e, p[1], p[2]], nC) - R0);
  const dRy = f(iterateRadius([p[0], p[1] + e, p[2]], nC) - R0);
  const dRz = f(iterateRadius([p[0], p[1], p[2] + e], nC) - R0);
  const g = f(Math.sqrt(f(f(dRx * dRx) + f(f(dRy * dRy) + f(dRz * dRz)))));
  // MB3D: R0·ln(R0)·dDEscale / (√ΣΔRout² + mctDEoffset·0.06). K = dDEscale calibration.
  const de = f(f(f(R0 * f(Math.log(Math.max(R0, 1.0001)))) * K) / f(g + f(e * 0.06)));
  return { de, g, R0, nC };
}

const cam = [0.6, 0.4, 3.0], dir = [-0.2, -0.13, -1];
const dl = Math.hypot(...dir); for (let i = 0; i < 3; i++) dir[i] /= dl;
const e = Math.min(0.5 * 0.1, 0.004);   // mctDEoffset for msDEstop~0.5
// Calibrate K so numeric ≈ analytic at the first sane sample.
console.log('Mandelbox (fold) ray-march: analytic vs fixed-count Rout numeric DE (float32)');
console.log(`probe e=${e}\n  t       |p|     analytic   numeric    R0       g         nC   ratio`);
for (const K of [0.02, 0.05, 0.1]) {
  console.log(`\n--- K (dDEscale) = ${K} ---`);
  let t = 0;
  for (let s = 0; s < 30; s++) {
    const p = [cam[0] + dir[0] * t, cam[1] + dir[1] * t, cam[2] + dir[2] * t];
    const a = analyticDE(p), n = numericDE(p, e, K);
    const ratio = a > 1e-9 ? n.de / a : 0;
    console.log(`  ${t.toFixed(4)}  ${Math.hypot(...p).toFixed(3)}   ${a.toExponential(2)}  ${n.de.toExponential(2)}  ${n.R0.toFixed(1).padStart(8)}  ${n.g.toExponential(2)}  ${String(n.nC).padStart(3)}  ${ratio.toExponential(2)}`);
    if (a < 1e-3) { console.log('  ~surface'); break; }
    t += Math.max(a, 1e-5) * 0.9;
  }
}
