// CPU float32 simulation of the rebuilt Numerical DE (de.ts) vs the analytic Mandelbulb DE.
// Validates the FORMULA logic + exposes float32 cancellation, independent of the GPU.
// Mandelbulb: z -> z^8 + c (c = seed = p, "Mandel" mode). Analytic DE = 0.5·r·ln(r)/dr.
const f = Math.fround;

const BAILOUT = 100;          // uDeBailout default (radius²)
const ITERS = 80;             // uIterations
const POWER = 8;

// One Mandelbulb step on z (vec3) with running derivative dr; returns new dr.
function bulbStep(z: number[], c: number[], dr: number): number {
  const x = z[0], y = z[1], zz = z[2];
  const r = f(Math.sqrt(f(x * x + y * y + zz * zz)));
  if (r < 1e-12) return dr;
  // dr = power * r^(power-1) * dr + 1
  dr = f(f(POWER * f(Math.pow(r, POWER - 1))) * dr + 1);
  const theta = f(Math.acos(f(zz / r)));
  const phi = f(Math.atan2(y, x));
  const rp = f(Math.pow(r, POWER));
  const st = f(Math.sin(f(theta * POWER)));
  z[0] = f(rp * f(st * f(Math.cos(f(phi * POWER)))) + c[0]);
  z[1] = f(rp * f(st * f(Math.sin(f(phi * POWER)))) + c[1]);
  z[2] = f(rp * f(Math.cos(f(theta * POWER))) + c[2]);
  return dr;
}

function r2of(z: number[]) { return f(f(z[0] * z[0]) + f(f(z[1] * z[1]) + f(z[2] * z[2]))); }

// --- Analytic DE (reference) ---
function analyticDE(p: number[]): number {
  const z = [p[0], p[1], p[2]]; const c = [p[0], p[1], p[2]]; let dr = 1;
  let r2 = r2of(z);
  for (let i = 0; i < ITERS; i++) {
    if (r2 > BAILOUT) break;
    dr = bulbStep(z, c, dr);
    r2 = r2of(z);
  }
  const r = f(Math.sqrt(r2));
  return f(f(0.5 * f(r * f(Math.log(Math.max(r, 1.0001))))) / Math.max(Math.abs(dr), 1e-10));
}

// --- Rebuilt numeric DE (de.ts logic) ---
function centerCount(p: number[]): number {
  const z = [p[0], p[1], p[2]]; const c = [p[0], p[1], p[2]]; let dr = 1;
  for (let i = 0; i < ITERS; i++) {
    const r2pre = r2of(z);
    if (r2pre > BAILOUT) return i;          // escaped before iteration i
    dr = bulbStep(z, c, dr);
    const r2 = r2of(z);
    if (r2 > BAILOUT) return i + 1;
  }
  return ITERS;
}
function iterateRadius(p: number[], fixedIters: number): number {
  const z = [p[0], p[1], p[2]]; const c = [p[0], p[1], p[2]]; let dr = 1;
  const hardBail = f(BAILOUT * 64);
  for (let i = 0; i < fixedIters; i++) {
    dr = bulbStep(z, c, dr);
    if (r2of(z) > hardBail) break;
  }
  const rr = r2of(z);
  return rr > hardBail ? hardBail : rr;
}
function numericDE(p: number[], e: number): { de: number; R0: number; g: number; nC: number } {
  const nC = centerCount(p);
  const R0 = iterateRadius(p, nC);                       // CONSISTENT: run-to-nC, not escape radius
  const floorDE = 1e-4;
  if (R0 < 1e-20) return { de: floorDE, R0, g: 0, nC };
  const dRx = f(iterateRadius([p[0] + e, p[1], p[2]], nC) - R0);
  const dRy = f(iterateRadius([p[0], p[1] + e, p[2]], nC) - R0);
  const dRz = f(iterateRadius([p[0], p[1], p[2] + e], nC) - R0);
  const g = f(Math.sqrt(f(f(dRx * dRx) + f(f(dRy * dRy) + f(dRz * dRz)))));
  const de = f(f(f(R0 * f(Math.log(Math.max(R0, 1.0001)))) * e) / f(g + f(e * 0.06)));
  return { de, R0, g, nC };
}

// --- Candidate B: fixed-count, difference ln(Rout) (float32-robust, compresses explosion) ---
function numericDE_lnRout(p: number[], e: number): { de: number; g: number } {
  const nC = centerCount(p);
  const L0 = f(Math.log(Math.max(iterateRadius(p, nC), 1.0001)));
  const Lx = f(Math.log(Math.max(iterateRadius([p[0] + e, p[1], p[2]], nC), 1.0001)));
  const Ly = f(Math.log(Math.max(iterateRadius([p[0], p[1] + e, p[2]], nC), 1.0001)));
  const Lz = f(Math.log(Math.max(iterateRadius([p[0], p[1], p[2] + e], nC), 1.0001)));
  const dx = f(Lx - L0), dy = f(Ly - L0), dz = f(Lz - L0);
  const g = f(Math.sqrt(f(f(dx * dx) + f(f(dy * dy) + f(dz * dz)))));
  // DE = 0.5·ln(r)/|∇ln r| = 0.5·(L0/2)·e/(gL) ; L0=ln(Rout)=2ln(r)
  const de = f(f(f(0.5 * f(L0 * 0.5)) * e) / f(g + f(e * 0.06)));
  return { de, g };
}

// --- Candidate C: per-sample SMOOTH escape time nu (old de.ts), DE = 0.5·? — probe-invariant e/|Δnu| ---
function escapeNu(p: number[]): number {
  const z = [p[0], p[1], p[2]]; const c = [p[0], p[1], p[2]]; let dr = 1; let iter = 0;
  let r2 = r2of(z);
  for (let i = 0; i < ITERS; i++) {
    if (r2 > BAILOUT) break;
    dr = bulbStep(z, c, dr); iter++;
    r2 = r2of(z);
    if (r2 > BAILOUT) break;
  }
  const bl = Math.max(BAILOUT, 1.1);
  let nu = iter;
  if (r2 > bl) nu = f(iter + 1 - f(Math.log2(f(Math.log2(Math.max(r2, bl * 1.0001)) / Math.log2(bl)))));
  return nu;
}
function numericDE_nu(p: number[], e: number): { de: number; g: number } {
  const n0 = escapeNu(p);
  const nx = escapeNu([p[0] + e, p[1], p[2]]);
  const ny = escapeNu([p[0], p[1] + e, p[2]]);
  const nz = escapeNu([p[0], p[1], p[2] + e]);
  const dx = f(nx - n0), dy = f(ny - n0), dz = f(nz - n0);
  const g = f(Math.sqrt(f(f(dx * dx) + f(f(dy * dy) + f(dz * dz)))));
  const de = f(e / f(g + f(e * 0.06)));   // probe-invariant (e in num + denom)
  return { de, g };
}

// March a ray from camera toward the bulb along -Z, compare all three estimators.
const cam = [0.3, 0.2, 2.5];
const dir = [0, 0, -1];
console.log('Mandelbulb ray-march: analytic vs A=rawRout, B=lnRout, C=smoothNu (all float32)\n');
console.log('  t       |p|     analytic   A(Rout)   ratioA   B(lnR)    ratioB   C(nu)     ratioC');
for (const e of [0.0015, 1e-4]) {
  console.log(`\n--- probe e = ${e} ---`);
  let t = 0;
  for (let step = 0; step < 36; step++) {
    const p = [cam[0] + dir[0] * t, cam[1] + dir[1] * t, cam[2] + dir[2] * t];
    const a = analyticDE(p);
    const A = numericDE(p, e), B = numericDE_lnRout(p, e), C = numericDE_nu(p, e);
    const rr = (x: number) => (a > 1e-9 ? (x / a).toExponential(1) : '   -   ');
    console.log(`  ${t.toFixed(4)}  ${Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).toFixed(3)}   ${a.toExponential(2)}  ${A.de.toExponential(2)} ${rr(A.de).padStart(8)}  ${B.de.toExponential(2)} ${rr(B.de).padStart(8)}  ${C.de.toExponential(2)} ${rr(C.de).padStart(8)}`);
    if (a < 1e-4) { console.log('  ~surface reached'); break; }
    t += Math.max(a, 1e-5) * 0.9;
  }
}
