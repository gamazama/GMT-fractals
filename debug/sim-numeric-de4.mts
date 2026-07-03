// Faithful CPU repro of the est7 Mandelbulb GPU black. Uses the EXACT real Mandelbulb formula
// (engine-gmt/formulas/Mandelbulb.ts — spherical power-8), real bailout r²=100 (uDeBailout),
// iterations 60, the real on-axis camera (0,0,2.157→origin), and the EXACT de.ts LOG algorithm.
// Marches a FAN of rays across the frustum with BOTH marchers (plain fudge + MB3D-faithful
// Lipschitz-clamped) and reports hit fraction + dumps the DE trajectory of a missing ray.
const f = Math.fround;
type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const add = (a: V3, b: V3): V3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scl = (a: V3, s: number): V3 => [a[0]*s, a[1]*s, a[2]*s];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: V3): V3 => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };

const POWER = 8, BAIL2 = 100, ITERS = 60, OVF = 1e30;

// EXACT real Mandelbulb step (float32), Mandelbrot mode (c = sample point).
function stepMB(z: V3, c: V3): V3 {
  const r = f(Math.sqrt(f(f(z[0]*z[0]) + f(f(z[1]*z[1]) + f(z[2]*z[2])))));
  if (r < 1e-12) return [c[0], c[1], c[2]];
  const rp1 = f(Math.pow(r, POWER - 1));
  let theta = Math.acos(Math.max(-1, Math.min(1, f(z[2] / r))));
  let phi = Math.atan2(z[1], z[0]);
  theta = f(theta * POWER); phi = f(phi * POWER);
  const zr = f(rp1 * r);
  const st = Math.sin(theta), ct = Math.cos(theta), sp = Math.sin(phi), cp = Math.cos(phi);
  return [f(f(zr * f(st * cp)) + c[0]), f(f(zr * f(sp * st)) + c[1]), f(f(zr * ct) + c[2])];
}
const r2 = (z: V3) => f(f(z[0]*z[0]) + f(f(z[1]*z[1]) + f(z[2]*z[2])));

// de.ts centerCount: escape iter at normal bailout.
function centerCount(p: V3): number {
  let z: V3 = [...p]; const c: V3 = [...p]; // Mandelbrot: c = z0 = p
  for (let i = 0; i < ITERS; i++) {
    if (r2(z) > BAIL2) return i;
    z = stepMB(z, c);
    if (r2(z) > BAIL2) return i + 1;
  }
  return ITERS;
}
// de.ts iterateLogRadius: run fixed count, overflow guard, return ln(Rout).
function iterLog(p: V3, nC: number): number {
  let z: V3 = [...p]; const c: V3 = [...p];
  for (let i = 0; i < nC; i++) { z = stepMB(z, c); if (r2(z) > OVF) break; }
  return f(Math.log(Math.max(Math.min(r2(z), OVF), 1e-12)));
}
// de.ts numericDistance (LOG form). uPixelSizeBase from a ~380px fov-? render; sweepable.
let USE_CENTRAL = false;   // toggle forward vs central differences for g
let NC_ADAPT = 0.0;        // >0: widen the probe by (1 + nC*NC_ADAPT) to smooth deep chaos
function numDE(p: V3, cam: V3, uNumDEeps: number, uPixelSizeBase: number, epsScale = 1.0, floorCoef = 0.05) {
  const numFootprint = f(Math.max(uPixelSizeBase * len(sub(p, cam)), 1e-7));
  const floorDE = f(numFootprint * floorCoef);
  const nC = centerCount(p);
  const L0 = iterLog(p, nC);
  const scale = f(epsScale * (1.0 + nC * NC_ADAPT));
  const e = f(Math.max(Math.min(numFootprint, 0.004) * scale, 1e-5));
  let dLx: number, dLy: number, dLz: number;
  if (USE_CENTRAL) {
    dLx = f(0.5 * f(iterLog([p[0]+e,p[1],p[2]], nC) - iterLog([p[0]-e,p[1],p[2]], nC)));
    dLy = f(0.5 * f(iterLog([p[0],p[1]+e,p[2]], nC) - iterLog([p[0],p[1]-e,p[2]], nC)));
    dLz = f(0.5 * f(iterLog([p[0],p[1],p[2]+e], nC) - iterLog([p[0],p[1],p[2]-e], nC)));
  } else {
    dLx = f(iterLog([p[0]+e,p[1],p[2]], nC) - L0);
    dLy = f(iterLog([p[0],p[1]+e,p[2]], nC) - L0);
    dLz = f(iterLog([p[0],p[1],p[2]+e], nC) - L0);
  }
  const g = f(Math.sqrt(f(f(dLx*dLx) + f(f(dLy*dLy) + f(dLz*dLz)))));
  const de = f(f(f(L0 * uNumDEeps) * e) / f(g + f(e * 0.06)));
  return { de: Math.max(de, floorDE), L0, g, nC, e, floorDE };
}

// March one ray. marcher: 'plain' = t+=DE*fudge ; 'faithful' = Lipschitz clamp + StepDiv.
function march(cam: V3, dir: V3, opt: any, marcher: 'plain' | 'faithful', trace = false): { hit: boolean; t: number; steps: number; closestNC: number; closestRatio: number } {
  let t = 0, lastDE = 0, lastStep = 0, primed = false;
  let closestRatio = 1e9, closestNC = 0;
  const maxT = len(cam) + 3;
  for (let s = 0; s < opt.maxSteps; s++) {
    const p = add(cam, scl(dir, t));
    const numFootprint = opt.uPixelSizeBase * len(sub(p, cam));
    const eps = numFootprint * (opt.uPixelThreshold / opt.uDetail);
    const nd = numDE(p, cam, opt.uNumDEeps, opt.uPixelSizeBase, 1.0, opt.floorCoef ?? 0.05);
    let h = nd.de;
    if (marcher === 'faithful' && primed) h = Math.min(h, lastDE + lastStep);   // Lipschitz clamp
    const ratio = h / eps;
    if (ratio < closestRatio) { closestRatio = ratio; closestNC = nd.nC; }
    if (trace && s < 24) console.log(`   s=${String(s).padStart(2)} t=${t.toFixed(3)} |p|=${len(p).toFixed(2)} nC=${String(nd.nC).padStart(2)} L0=${nd.L0.toFixed(1)} g=${nd.g.toExponential(1)} DE=${h.toExponential(2)} eps=${eps.toExponential(2)}`);
    if (h < eps) return { hit: true, t, steps: s, closestNC: nd.nC, closestRatio: ratio };
    let step: number;
    if (marcher === 'faithful') { step = Math.max(1e-6, (h - 0*eps) * opt.mb3dStepDiv * 1.0); lastDE = nd.de; lastStep = step; primed = true; }
    else step = Math.max(h, 1e-6) * opt.uFudge;
    t += step;
    if (t > maxT) return { hit: false, t, steps: s, closestNC, closestRatio };
  }
  return { hit: false, t, steps: opt.maxSteps, closestNC, closestRatio };
}

// Ray fan from the real camera across the bulb. Characterizes MISSES by the nC at their closest
// approach + whether overstep recovery (closest ratio ≤ 1+tol) would recover them.
const cam: V3 = [0, 0, 2.157];
function fan(opt: any, marcher: 'plain' | 'faithful') {
  const N = 41, halfAngle = 0.35; // finer + tighter → more deep-region rays
  let hits = 0, total = 0, deepMiss = 0, recoverable = 0;
  const OT = opt.overstepTol ?? 0;
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const ax = (ix/(N-1)*2-1) * halfAngle, ay = (iy/(N-1)*2-1) * halfAngle;
    const dir = nrm([Math.sin(ax), Math.sin(ay), -Math.cos(ax)*Math.cos(ay)]);
    const r = march(cam, dir, opt, marcher);
    total++;
    if (r.hit) hits++;
    else {
      if (r.closestNC >= 8) deepMiss++;   // missed near a deep (high-nC) region
      if (OT > 0 && r.closestRatio <= 1 + OT) recoverable++;   // overstep would snap it back
    }
  }
  return { hits, total, frac: hits/total, deepMiss, recoverable };
}

// REAL Mandelbulb preset: pixelThreshold=0.2 (NOT 0.5). Hit threshold = fp·(0.2/detail).
// DE floor = fp·floorCoef. If floorCoef > pixelThreshold/detail, a floored DE can NEVER hit → black.
const base = { uPixelSizeBase: 0.0028, uDetail: 1.5, uPixelThreshold: 0.2, uFudge: 1.0, maxSteps: 400, mb3dStepDiv: 0.3 };
console.log('Faithful Mandelbulb est7 — ray-fan hit fraction (real formula, bailout 100, iter 60)');
console.log(`hit threshold = fp·(pixelThreshold/detail) = fp·(${base.uPixelThreshold}/${base.uDetail}) = fp·${(base.uPixelThreshold/base.uDetail).toFixed(3)}\n`);
// FLICKER DIAGNOSIS — the real mechanism is PER-FRAME instability: as jitter/camera perturbs the
// sample by a sub-probe amount, a NOISY DE flips the ray hit↔miss → the deep region flickers black.
// Measure the DE's coefficient-of-variation (CV = stddev/mean) under a tiny position jitter, at
// points of increasing depth (nC). High CV in high-nC regions = flicker. Compare forward vs central
// differences and probe width (epsScale). A ray hits near the boundary where the true DE→0 (small),
// so we sample just OUTSIDE the surface along the on-axis ray at a few radii.
function sampleDeepDE(cam: V3, opt: any): { nC: number; cvFwd: number; cvCen: number; cvWide: number }[] {
  const dir = nrm(sub([0, 0, 0], cam));
  const out: { nC: number; cvFwd: number; cvCen: number; cvWide: number }[] = [];
  // walk toward origin; at points where nC is moderate/high, measure DE CV under jitter.
  for (let t = 0.5; t < 1.6; t += 0.02) {
    const p0 = add(cam, scl(dir, t));
    const nC = centerCount(p0);
    if (nC < 3) continue;
    const jit = opt.uPixelSizeBase * len(sub(p0, cam)) * 0.5;   // ~half a footprint (jitter scale)
    const meas = (central: boolean, epsScale: number) => {
      USE_CENTRAL = central;
      const des: number[] = [];
      for (let k = 0; k < 12; k++) {
        const ang = k / 12 * 6.283, pj = add(p0, [Math.cos(ang) * jit, Math.sin(ang) * jit, Math.cos(ang * 2) * jit]) as V3;
        des.push(numDE(pj, cam, opt.uNumDEeps, opt.uPixelSizeBase, epsScale, 0.05).de);
      }
      const mean = des.reduce((a, b) => a + b, 0) / des.length;
      const sd = Math.sqrt(des.reduce((a, b) => a + (b - mean) ** 2, 0) / des.length);
      return mean > 1e-12 ? sd / mean : 0;
    };
    NC_ADAPT = 0; const cvFwd = meas(false, 1.0);
    NC_ADAPT = 0; const cvWide = meas(false, 3.0);
    NC_ADAPT = 0.1; const cvAdapt = meas(false, 1.0); NC_ADAPT = 0;
    out.push({ nC, cvFwd, cvCen: cvWide, cvWide: cvAdapt });
  }
  USE_CENTRAL = false;
  return out;
}
console.log('DE stability under sub-probe jitter (CV = stddev/mean; lower = less flicker)');
console.log('  nC   CV-forward(e×1)  CV-wide(e×3)   CV-nC-adaptive(1+nC·0.1)');
const samples = sampleDeepDE(cam, { ...base, uNumDEeps: 0.3 });
const byNC = samples.sort((a, b) => a.nC - b.nC);
for (const s of byNC.filter((_, i) => i % 3 === 0)) {
  console.log(`  ${String(s.nC).padStart(2)}   ${s.cvFwd.toFixed(3).padStart(8)}         ${s.cvCen.toFixed(3).padStart(8)}       ${s.cvWide.toFixed(3).padStart(8)}`);
}
const avg = (sel: (x: typeof samples[0]) => number) => (samples.reduce((a, s) => a + sel(s), 0) / samples.length).toFixed(3);
console.log(`  AVG  ${avg(s=>s.cvFwd).padStart(8)}         ${avg(s=>s.cvCen).padStart(8)}       ${avg(s=>s.cvWide).padStart(8)}`);
console.log('(nC-adaptive keeps a narrow probe at low nC = sharp detail, widens only in deep chaos.)');
