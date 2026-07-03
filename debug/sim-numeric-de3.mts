// ============================================================================
// sim-numeric-de3 — faithful CPU comparison of GMT est7 (de.ts) vs MB3D CalcDEnoADE
// ============================================================================
// Goal (per plans/mb3d/sessions/S-numeric-de-reliability.md): compute the numeric
// DE field TWO ways and find where GMT misses a surface MB3D finds.
//   (a) GMT de.ts exactly: centerCount → iterateRadius(fixed count, inflated cap) →
//       DE = R0·ln(R0)·uNumDEeps·e / (g + e·0.06), floored at numFootprint·0.25.  [WORLD units]
//   (b) MB3D CalcDEnoADE exactly (Calc.pas:445-523): center run at NORMAL bailout+MaxIt →
//       ItResultI → perturbed SEED runs at fixed ItResultI + inflated Rstop3D →
//       DE = bufRout·ln(bufRout)·dDEscale / (√Σ + mctDEoffset006), floor msDEstop·0.25. [PIXEL units]
//       World distance MB3D actually steps = DE·StepWidth  (dir vec pre-scaled to StepWidth, Calc.pas:2117).
//
// Cleanest canary (from the user 2026-07-02): a plain Mandelbulb + est7 = BLACK, yet the
// analytic DE renders it. So on the Mandelbulb the analytic DE is GROUND TRUTH — if GMT's
// numeric DE is K× off from analytic, that's the bug, formula-agnostic. PseudoXDB (Oxnot)
// added as the real target.
//
// Source-grounded constants (Oxnot - Shells, probe-oxnot-consts.mts):
//   iterations=60, bailout r²=256 (rStop=16 → dRstop=Sqr(16)=256), StepWidth=0.0011274,
//   msDEstop=max(1e-4,sDEstop)=1 (HeaderTrafos.pas:535), bInsideRendering=FALSE (no inversion).
//   mctDEoffset_base P = Min(msDEstop·0.1, 0.004)=0.004; dDEscale(noADE)=1·P=0.004 (HT:945);
//   mctDEoffset006 = P·0.06 = 0.00024; seed perturbation = P·StepWidth = 4.51e-6 (HT:956);
//   Rstop3D = Sqr(dRstop)·64 = 256²·64 = 4.19e6 (HT:558).
// ============================================================================
const f = Math.fround;
type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const add = (a: V3, b: V3): V3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scale = (a: V3, s: number): V3 => [a[0]*s, a[1]*s, a[2]*s];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };

// ---------------------------------------------------------------------------
// Orbit steps.  Each returns the new z; float32-rounded (r=f) to mirror the GPU.
// ---------------------------------------------------------------------------
type Orbit = {
  name: string;
  julia: boolean;                       // true → z0=p, c=const ; false → z0=p, c=p (Mandelbrot)
  jc: V3;                               // julia constant (if julia)
  bailout2: number;                     // normal escape radius²
  step: (z: V3, c: V3, r: (n: number) => number) => V3;
  // analytic dr update (mandelbulb only); returns new dr given pre-step z,dr. null = no analytic DE.
  drStep: ((z: V3, dr: number, r: (n: number) => number) => number) | null;
  power?: number;
};

const id = (n: number) => n;

// Mandelbulb power-8 (Mandelbrot mode), with the standard analytic running derivative.
function makeMandelbulb(power = 8): Orbit {
  const P = power;
  return {
    name: `Mandelbulb-${P}`, julia: false, jc: [0,0,0], bailout2: 256, power: P,
    step: (z, c, r) => {
      const x = z[0], y = z[1], zz = z[2];
      const rr = Math.sqrt(x*x + y*y + zz*zz);
      if (rr < 1e-9) return [c[0], c[1], c[2]];
      let theta = Math.acos(Math.max(-1, Math.min(1, zz / rr)));
      let phi = Math.atan2(y, x);
      const rP = Math.pow(rr, P);
      theta *= P; phi *= P;
      const st = Math.sin(theta);
      const nx = r(rP * st * Math.cos(phi) + c[0]);
      const ny = r(rP * st * Math.sin(phi) + c[1]);
      const nz = r(rP * Math.cos(theta) + c[2]);
      return [nx, ny, nz];
    },
    drStep: (z, dr, r) => {
      const rr = Math.sqrt(z[0]*z[0] + z[1]*z[1] + z[2]*z[2]);
      // dr = P·r^(P-1)·dr + 1  (standard Mandelbulb running derivative)
      return r(Math.pow(rr, P - 1) * P * dr + 1);
    },
  };
}

// PseudoXDB (Oxnot primary slot), Julia mode, exact decode (decompiled-formulas.ts:11865).
//   K = 2|z_z| / sqrt(x²+y²)
//   x' = K·(x²−y²) + cx ;  y' = 2·K·x·y + cy ;  z' = Cm16·(z_z² − x² − y²) + cz
function makePseudoXDB(Cm16 = 1, jc: V3 = [-0.025, 0, 0]): Orbit {
  return {
    name: 'PseudoXDB(Oxnot)', julia: true, jc, bailout2: 256,
    step: (z, c, r) => {
      const x = z[0], y = z[1], zz = z[2];
      const x2 = r(x*x), y2 = r(y*y);
      const az = Math.abs(zz);
      const zp = r(r(r(az*az) - r(x2+y2)) * Cm16);
      const znew = r(zp + c[2]);
      const denom = r(Math.sqrt(r(x2+y2)));
      const K = r(r(2*az) / denom);
      const ynew = r(r(r(2*K) * r(x*y)) + c[1]);
      const xnew = r(r(K * r(x2-y2)) + c[0]);
      return [xnew, ynew, znew];
    },
    drStep: null,
  };
}

// ---------------------------------------------------------------------------
// Shared low-level iterators.
// ---------------------------------------------------------------------------
function seedFor(o: Orbit, p: V3): { z: V3; c: V3 } {
  return o.julia ? { z: [...p] as V3, c: [...o.jc] as V3 } : { z: [...p] as V3, c: [...p] as V3 };
}
const r2of = (z: V3, r: (n: number) => number) => r(r(z[0]*z[0]) + r(r(z[1]*z[1]) + r(z[2]*z[2])));

// ===== GMT de.ts path (float32) =====
// centerCount: normal bailout, capped at maxIter. Returns completed-iter count at escape.
function gmt_centerCount(o: Orbit, p: V3, maxIter: number): number {
  const { z, c } = seedFor(o, p);
  let zc = z;
  for (let i = 0; i < maxIter; i++) {
    if (r2of(zc, f) > o.bailout2) return i;   // pre-bailout (matches de.ts)
    zc = o.step(zc, c, f);
    if (r2of(zc, f) > o.bailout2) return i + 1;
  }
  return maxIter;
}
// iterateRadius: run fixed count, no early escape, only inflated cap. Return min(r², cap).
function gmt_iterateRadius(o: Orbit, p: V3, nC: number, cap: number): number {
  const { z, c } = seedFor(o, p);
  let zc = z;
  for (let i = 0; i < nC; i++) {
    zc = o.step(zc, c, f);
    if (r2of(zc, f) > cap) break;
  }
  return Math.min(r2of(zc, f), cap);
}
function gmt_numericDistance(o: Orbit, p: V3, cam: V3, uNumDEeps: number, uPixelSizeBase: number, maxIter: number, epsScale = 1.0) {
  const numFootprint = f(Math.max(uPixelSizeBase * len(sub(p, cam)), 1e-7));
  const floorDE = f(numFootprint * 0.25);
  const bo = Math.max(o.bailout2, 1);
  const cap = Math.min(bo * bo * 64, 1e30);
  const nC = gmt_centerCount(o, p, maxIter);
  const R0 = gmt_iterateRadius(o, p, nC, cap);
  if (R0 < 1e-20) return { de: floorDE, R0, g: 0, nC, e: 0, floorDE, hitFloor: true };
  const e = f(Math.max(Math.min(numFootprint, 0.004) * epsScale, 1e-5));
  const dRx = f(gmt_iterateRadius(o, [p[0]+e, p[1], p[2]], nC, cap) - R0);
  const dRy = f(gmt_iterateRadius(o, [p[0], p[1]+e, p[2]], nC, cap) - R0);
  const dRz = f(gmt_iterateRadius(o, [p[0], p[1], p[2]+e], nC, cap) - R0);
  const g = f(Math.sqrt(f(f(dRx*dRx) + f(f(dRy*dRy) + f(dRz*dRz)))));
  const de = f(f(f(f(R0 * f(Math.log(Math.max(R0, 1.0001)))) * uNumDEeps) * e) / f(g + f(e * 0.06)));
  return { de: Math.max(de, floorDE), R0, g, nC, e, floorDE, hitFloor: de < floorDE };
}

// ===== MB3D CalcDEnoADE path (float64, x87-ish) =====
// mMandFunction: iterate from seed until r²>rstop2 OR iter==maxIt. Return {Rout, ItResultI}.
function mb3d_mMandFunction(o: Orbit, seedC: V3, maxIt: number, rstop2: number): { Rout: number; ItResultI: number } {
  // In Julia mode the perturbed axis is C1/C2/C3 = the sample point = z0; c stays the julia const.
  // In Mandelbrot mode C1..C3 IS c AND z0 (z0=c=p). MB3D perturbs C1..C3 (the seed) either way.
  const c: V3 = o.julia ? [...o.jc] as V3 : [...seedC] as V3;
  let z: V3 = [...seedC] as V3;
  let It = 0;
  for (let i = 0; i < maxIt; i++) {
    if (r2of(z, id) > rstop2) return { Rout: r2of(z, id), ItResultI: i };
    z = o.step(z, c, id);
    It = i + 1;
    if (r2of(z, id) > rstop2) return { Rout: r2of(z, id), ItResultI: It };
  }
  return { Rout: r2of(z, id), ItResultI: maxIt };
}
function mb3d_CalcDEnoADE(o: Orbit, p: V3, opt: { msDEstop: number; StepWidth: number; maxIt: number; bInsideRendering: boolean }) {
  const { msDEstop, StepWidth, maxIt } = opt;
  const dRstop = o.bailout2;                 // normal bailout r² (It3Dex.RStop pre-inflate)
  const Rstop3D = dRstop * dRstop * 64;      // HT:558
  const P = Math.min(msDEstop * 0.1, 0.004); // mctDEoffset_base (HT:890)
  const dDEscale = 1 * P;                     // noADE: dDEscale starts 1, ×mctDEoffset (HT:945)
  const off006 = P * 0.06;                    // mctDEoffset006 (HT:955)
  const perturb = P * StepWidth;              // mctDEoffset post-StepWidth (HT:956) = seed perturbation

  // center run at NORMAL bailout + scene MaxIt
  const center = mb3d_mMandFunction(o, p, maxIt, dRstop);
  const bufRout = center.Rout, nC = center.ItResultI;
  if (opt.bInsideRendering && nC === maxIt) return { dePix: 0, deWorld: 0, bufRout, nC, sumSq: 0, floored: false, note: 'inside-hit' };
  let de: number;
  if (bufRout < 1e-200) { de = 0; }
  else {
    // perturbed SEED runs at FIXED count nC + inflated Rstop3D
    const Rx = mb3d_mMandFunction(o, [p[0]+perturb, p[1], p[2]], nC, Rstop3D).Rout;
    const Ry = mb3d_mMandFunction(o, [p[0], p[1]+perturb, p[2]], nC, Rstop3D).Rout;
    const Rz = mb3d_mMandFunction(o, [p[0], p[1], p[2]+perturb], nC, Rstop3D).Rout;
    const dt = (bufRout - Rx) ** 2, wt = (bufRout - Ry) ** 2, Rst = (bufRout - Rz) ** 2;
    de = bufRout * Math.log(bufRout) * dDEscale / (Math.sqrt(Rst + wt + dt) + off006);
  }
  const floorV = msDEstop * 0.25;
  let floored = false;
  if (de < floorV) { de = floorV; floored = true; }
  // bInsideRendering FALSE for Oxnot → no inversion.
  return { dePix: de, deWorld: de * StepWidth, bufRout, nC, sumSq: 0, floored, note: '' };
}

// ===== analytic DE (mandelbulb ground truth) =====
// ===== CANDIDATE FIX: log-domain gradient (float32-robust equivalent of MB3D) =====
// Since ΔRout ≈ Rout·Δ(ln Rout), MB3D's bufRout·ln(bufRout)/√Σ(ΔRout)² ≈ ln(bufRout)/√Σ(Δln Rout)²
// — the huge bufRout cancels, so differencing ln(Rout) is float32-safe (no cap saturation, no
// catastrophic cancellation) and matches MB3D where MB3D is well-defined. iterateRadius still
// clamps dot to a high overflow guard (1e30) purely to avoid inf; ln compresses it to ≤69.
function gmt_iterateLogRadius(o: Orbit, p: V3, nC: number): number {
  const { z, c } = seedFor(o, p);
  let zc = z;
  const OVF = 1e30;
  for (let i = 0; i < nC; i++) {
    zc = o.step(zc, c, f);
    if (r2of(zc, f) > OVF) break;
  }
  // ln(Rout): OVF-guard on top (compress Inf→69), tiny lower bound so BOUNDED/IFS orbits
  // (Rout∈(0,1)) keep their gradient (allows L<0, matching MB3D's bufRout·ln(bufRout)<0 → floor).
  return f(Math.log(Math.max(Math.min(r2of(zc, f), OVF), 1e-12)));
}
function gmt_numericDistance_LOG(o: Orbit, p: V3, cam: V3, uNumDEeps: number, uPixelSizeBase: number, maxIter: number, epsScale = 1.0) {
  const numFootprint = f(Math.max(uPixelSizeBase * len(sub(p, cam)), 1e-7));
  const floorDE = f(numFootprint * 0.25);
  const nC = gmt_centerCount(o, p, maxIter);
  const L0 = gmt_iterateLogRadius(o, p, nC);                    // = ln(R0)
  const e = f(Math.max(Math.min(numFootprint, 0.004) * epsScale, 1e-5));
  const dLx = f(gmt_iterateLogRadius(o, [p[0]+e, p[1], p[2]], nC) - L0);
  const dLy = f(gmt_iterateLogRadius(o, [p[0], p[1]+e, p[2]], nC) - L0);
  const dLz = f(gmt_iterateLogRadius(o, [p[0], p[1], p[2]+e], nC) - L0);
  const g = f(Math.sqrt(f(f(dLx*dLx) + f(f(dLy*dLy) + f(dLz*dLz)))));
  // DE = ln(R0)·uNumDEeps·e / (g·? + e·0.06)   — g is dimensionless (Δln over world e);
  // to keep MB3D's structure (denominator ~ |∇| in world units) multiply g by (1/e)?  No:
  // g already ≈ |∇lnRout|·e (finite diff over world step e). So g/e ≈ |∇lnRout|. Keep e-cancel form.
  const de = f(f(f(L0 * uNumDEeps) * e) / f(g + f(e * 0.06)));
  return { de: Math.max(de, floorDE), L0, g, nC, floorDE, hitFloor: de < floorDE };
}

function analyticDE(o: Orbit, p: V3, maxIter: number): number {
  if (!o.drStep) return NaN;
  const { z, c } = seedFor(o, p);
  let zc = z, dr = 1;
  for (let i = 0; i < maxIter; i++) {
    const rr2 = r2of(zc, f);
    if (rr2 > o.bailout2) break;
    dr = o.drStep!(zc, dr, f);
    zc = o.step(zc, c, f);
  }
  const rr = Math.sqrt(r2of(zc, f));
  return 0.5 * rr * Math.log(Math.max(rr, 1.0001)) / Math.max(Math.abs(dr), 1e-10);
}

// ---------------------------------------------------------------------------
// Experiment 1 — along an ANALYTIC-marched ray on the Mandelbulb, compare all 3 DEs.
// ---------------------------------------------------------------------------
function reportRay(o: Orbit, cam: V3, target: V3, opt: { msDEstop: number; StepWidth: number; maxIter: number; uNumDEeps: number; uPixelSizeBase: number; uDetail: number; uPixelThreshold: number }) {
  const dir = norm(sub(target, cam));
  console.log(`\n===== ${o.name} :: ray from [${cam.map(v=>v.toFixed(2))}] → [${target.map(v=>v.toFixed(2))}] =====`);
  console.log(`StepWidth=${opt.StepWidth}  uPixelSizeBase=${opt.uPixelSizeBase}  uNumDEeps=${opt.uNumDEeps}  uDetail=${opt.uDetail}  maxIter=${opt.maxIter}`);
  console.log(`t       |p|    analyticW   gmtOldW    gmtLOGW    mb3dNumW   gmtEps    | R0(gmt)   g(old)   nC | log/mb  log/anl`);
  let t = len(cam) - 2.0; if (t < 0) t = 0;
  for (let s = 0; s < 40; s++) {
    const p = add(cam, scale(dir, t));
    const aW = analyticDE(o, p, opt.maxIter);
    const gm = gmt_numericDistance(o, p, cam, opt.uNumDEeps, opt.uPixelSizeBase, opt.maxIter, 1.0);
    const gl = gmt_numericDistance_LOG(o, p, cam, opt.uNumDEeps, opt.uPixelSizeBase, opt.maxIter, 1.0);
    const mb = mb3d_CalcDEnoADE(o, p, { msDEstop: opt.msDEstop, StepWidth: opt.StepWidth, maxIt: opt.maxIter, bInsideRendering: false });
    const numFootprint = opt.uPixelSizeBase * len(sub(p, cam));
    const gmtEps = numFootprint * (opt.uPixelThreshold / opt.uDetail);
    const ratioLogMb = mb.deWorld > 1e-12 ? gl.de / mb.deWorld : 0;
    const ratioLogAnl = aW > 1e-12 ? gl.de / aW : 0;
    console.log(
      `${t.toFixed(4)} ${len(p).toFixed(3)}  ${aW.toExponential(2)}   ${gm.de.toExponential(2)}  ${gl.de.toExponential(2)}  ${mb.deWorld.toExponential(2)}  ${gmtEps.toExponential(2)} | ${gm.R0.toExponential(2)} ${gm.g.toExponential(2)} ${String(gm.nC).padStart(3)} | ${ratioLogMb.toExponential(1)} ${ratioLogAnl.toExponential(1)}`
    );
    // advance by the analytic DE (ground-truth spine) so we sample right up to the surface
    const stepBy = isFinite(aW) && aW > 1e-9 ? aW : gm.de;
    if (isFinite(aW) && aW < 0.5 * numFootprint) { console.log('  → analytic surface reached'); break; }
    t += Math.max(stepBy, 1e-5) * 0.7;
    if (t > len(cam) + 3) { console.log('  → ray exited'); break; }
  }
}

// ---------------------------------------------------------------------------
// Experiment 2 — INDEPENDENT numeric march: does each estimator hit or miss?
// ---------------------------------------------------------------------------
function marchNumeric(which: 'gmt' | 'gmtlog' | 'mb3d', o: Orbit, cam: V3, target: V3, opt: any, maxSteps = 4000): { hit: boolean; t: number; steps: number; reason: string } {
  const dir = norm(sub(target, cam));
  let t = 0; const maxT = len(cam) + 3;
  for (let s = 0; s < maxSteps; s++) {
    const p = add(cam, scale(dir, t));
    const numFootprint = opt.uPixelSizeBase * len(sub(p, cam));
    const eps = numFootprint * (opt.uPixelThreshold / opt.uDetail);
    let deWorld: number;
    if (which === 'gmt') deWorld = gmt_numericDistance(o, p, cam, opt.uNumDEeps, opt.uPixelSizeBase, opt.maxIter, 1.0).de;
    else if (which === 'gmtlog') deWorld = gmt_numericDistance_LOG(o, p, cam, opt.uNumDEeps, opt.uPixelSizeBase, opt.maxIter, 1.0).de;
    else deWorld = mb3d_CalcDEnoADE(o, p, { msDEstop: opt.msDEstop, StepWidth: opt.StepWidth, maxIt: opt.maxIter, bInsideRendering: false }).deWorld;
    if (deWorld < eps) return { hit: true, t, steps: s, reason: `DE ${deWorld.toExponential(2)} < eps ${eps.toExponential(2)}` };
    t += Math.max(deWorld, 1e-6) * opt.uFudge;
    if (t > maxT) return { hit: false, t, steps: s, reason: 'exited far plane' };
  }
  return { hit: false, t, steps: maxSteps, reason: 'step budget' };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const commonOpt = {
  msDEstop: 1, StepWidth: 0.0011274, maxIter: 60,
  // REAL GMT quality defaults (quality.ts): fudge 1.0, detail 1.0, pixelThreshold 0.5.
  uNumDEeps: 0.1, uPixelSizeBase: 0.0011274, uDetail: 1.0, uPixelThreshold: 0.5, uFudge: 1.0,
};

const mbulb = makeMandelbulb(8);
const pxdb = makePseudoXDB(1, [-0.025, 0, 0]);

// Mandelbulb: camera off to the side so the ray grazes the surface, not the pole.
reportRay(mbulb, [1.3, 0.4, 2.2], [0, 0, 0], commonOpt);
// PseudoXDB: march toward origin region where the bounded core lives.
reportRay(pxdb, [1.2, 0.3, 2.4], [0, 0, 0], commonOpt);

console.log('\n\n########## Independent numeric marches (hit/miss, GPU step budget = 300) ##########');
const BUDGET = 300;   // GMT default uMaxSteps
for (const [o, cam] of [[mbulb, [1.3,0.4,2.2]] as [Orbit,V3], [pxdb, [1.2,0.3,2.4]] as [Orbit,V3]]) {
  const g = marchNumeric('gmt', o, cam, [0,0,0], commonOpt, BUDGET);
  const gl = marchNumeric('gmtlog', o, cam, [0,0,0], commonOpt, BUDGET);
  const m = marchNumeric('mb3d', o, cam, [0,0,0], commonOpt, BUDGET);
  console.log(`\n${o.name}:`);
  console.log(`  GMT est7 (old): ${g.hit ? 'HIT ' : 'MISS'} @ t=${g.t.toFixed(3)} (${g.steps} steps) — ${g.reason}`);
  console.log(`  GMT est7 (LOG): ${gl.hit ? 'HIT ' : 'MISS'} @ t=${gl.t.toFixed(3)} (${gl.steps} steps) — ${gl.reason}`);
  console.log(`  MB3D noADE    : ${m.hit ? 'HIT ' : 'MISS'} @ t=${m.t.toFixed(3)} (${m.steps} steps) — ${m.reason}`);
}

console.log('\n\n########## uNumDEeps scale sweep (LOG) — hit-t & steps (target: fast, no overshoot) ##########');
// analytic mandelbulb surface ~ t=1.749. Overshoot = hit at t noticeably < surface (stepped through).
for (const [o, cam, surfT] of [[mbulb,[1.3,0.4,2.2],1.749] as [Orbit,V3,number], [pxdb,[1.2,0.3,2.4],NaN] as [Orbit,V3,number]]) {
  console.log(`\n${o.name} (analytic surface t≈${isFinite(surfT)?surfT.toFixed(3):'?'}):`);
  for (const k of [0.1, 0.3, 0.5, 1.0, 2.0]) {
    const opt = { ...commonOpt, uNumDEeps: k };
    const r = marchNumeric('gmtlog', o, cam, [0,0,0], opt, BUDGET);
    console.log(`  uNumDEeps=${k.toFixed(1)}: ${r.hit ? 'HIT ' : 'MISS'} @ t=${r.t.toFixed(3)} (${String(r.steps).padStart(3)} steps)`);
  }
}
