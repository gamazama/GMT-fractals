/**
 * debug/deep-zoom-direct-check.mts — the historical page's NON-CIRCULAR referee, pointed at the port.
 *
 * Run:   npx tsx debug/deep-zoom-direct-check.mts            (starts Vite on 3478, stops it after)
 *        PORT=3478 npx tsx debug/deep-zoom-direct-check.mts  (use a dev server already running)
 *        BLA=1 ...                                           (same switch as the historical suite)
 *        MANUAL=1 ...                                        (harness with ?manual=1: the host-driven loop)
 *
 * This is `mandelbulb_deepzoom/direct-check.test.mjs` (repo pinned at 3b65946) with ONE change: the
 * page it opens. The historical suite opens file://.../index.html; this opens /deep-zoom-harness.html,
 * which builds deep-zoom/renderer/core.js with publishOnWindow so the same window.__ handles exist.
 * Depths, rays, iteration budget, probe distances, pass criterion (worst GPU-vs-BigInt < 1e-3) and
 * every printed line are copied unchanged, so the two outputs can be diffed line for line.
 *
 * What it proves: the ported renderer's GPU perturbed distance estimate agrees with a BigInt
 * fixed-point direct march that shares no math with the shader kernel, at 11 depths from 1e-5 to 1e-50.
 * It exits non-zero unless all 11 depths ran and passed.
 *
 * ADDED HERE, not in the historical suite (2026-10-08): `ORIGIN=1` runs the 11 depths with the
 * kernel's rebase to the origin on, and a last section, OFF-CENTRE RAYS, checks 13 x 13 grids of
 * rays - the historical probes are all on the centre ray, close to the camera, and never saw the
 * two faults that section is about. It gates too: 4 grids must pass (2 deep views for the kernel's
 * rebase to the origin, 2 shallow views for the far hand-off).
 *
 * Real GPU only: headed Chrome through ANGLE/d3d11 (SwiftShader cannot compile this shader in time).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'debug', 'scratch');
const OWN_PORT = 3478;

const DEPTHS = [1e-5, 1e-6, 1e-8, 1e-9, 1e-11, 1e-12, 1e-15, 1e-20, 1e-30, 1e-40, 1e-50];

async function reachable(origin: string): Promise<boolean> {
    try { const r = await fetch(origin + '/deep-zoom-harness.html'); return r.ok; } catch { return false; }
}

async function server(): Promise<{ origin: string; stop: () => void }> {
    if (process.env.PORT) {
        const origin = `http://localhost:${process.env.PORT}`;
        if (!(await reachable(origin))) throw new Error(`no dev server answers at ${origin} (PORT was given)`);
        return { origin, stop: () => {} };
    }
    const origin = `http://localhost:${OWN_PORT}`;
    if (await reachable(origin)) throw new Error(`port ${OWN_PORT} is already serving; stop that server or pass PORT=${OWN_PORT}`);
    fs.mkdirSync(SCRATCH, { recursive: true });
    const log = fs.openSync(path.join(SCRATCH, 'deep-zoom-direct-check-vite.log'), 'w');
    const require = createRequire(import.meta.url);
    const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
    const child: ChildProcess = spawn(process.execPath, [viteBin, '--port', String(OWN_PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', log, log] });
    for (let i = 0; i < 120; i++) {
        if (child.exitCode !== null) throw new Error(`vite exited with code ${child.exitCode}; see debug/scratch/deep-zoom-direct-check-vite.log`);
        if (await reachable(origin)) return { origin, stop: () => { child.kill(); } };
        await new Promise((r) => setTimeout(r, 500));
    }
    child.kill();
    throw new Error('vite did not answer within 60 s; see debug/scratch/deep-zoom-direct-check-vite.log');
}

const srv = await server();
const PAGE = srv.origin + '/deep-zoom-harness.html' + (process.env.MANUAL === '1' ? '?manual=1' : '');
console.log('page:', PAGE);

/** Two views of the frozen page's sample flight (3b65946:sample-flight.json, at 0.28 and 0.81 of
 *  its length), as plain data so this check needs no other repo. The first is where the page's
 *  kernel was found 2 to 89 % wrong in the bottom tenth of the picture; the second had it mildly
 *  (a fifth of its rays more than 1e-3 off). */
const GRID_VIEWS: Array<[string, unknown]> = [
    ['flight view A', { cam: ['-19106688270107589239900731000824630997268179563911966325659783872820568426676', '2056390632353064852223937457677118491523808047665681090998789597348598489238', '106035815535807823749833402101018299423493735995136270043159830313984249367966'],
        yaw: -1.2423396513222302, pitch: -0.20912409747792154, iters: 54, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
    ['flight view B', { cam: ['-19106688270107543539847685334123376502389289999276832103627022535307503912317', '2056390632353040684939008940473484011303878643906907968396164569726249960005', '106035815535807683251647607458977423429431001610281789023943266795617768965116'],
        yaw: -1.0246361075243915, pitch: -0.5258098005280843, iters: 77, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
];
/** Two shallower views of the same flight (at 0.050 and 0.055 of its length): the camera is 1.2e-3 and
 *  4.2e-4 from the surface, so all or some of the picture lies past t = 1e-3, where the page hands a
 *  ray to its f32 far-field march. */
const SHALLOW_VIEWS: Array<[string, unknown]> = [
    ['shallow view C', { cam: ['-19046732671432570394081773715976993863903469215868497208446644796296350924885', '2076379810595939072153399088115487453004718385024755700255671128216884750421', '106281771504106054999210185471751680430396782842107932182700956172180423070672'],
        yaw: -1.8394566450409213, pitch: -0.12603781373864897, iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
    ['shallow view D', { cam: ['-19082505205565731662293154145790470885708412737629538703027974520364685036758', '2066148842953800398734239597330608173677951087521164826145490763161441423825', '106130557879253810564053022231711737571045729746810109130847397159932640350757'],
        yaw: -1.858332816430437, pitch: -0.13825757920665438, iters: 38, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
];
const GRIDS = GRID_VIEWS.length + SHALLOW_VIEWS.length;
const ORIGIN = process.env.ORIGIN === '1';

let pass = 0, ran = 0, gridPass = 0, gridRan = 0;
const pageErrors: string[] = [];
// DZ_HEADLESS=1: no window (same Chrome, same GPU flags).
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.DZ_HEADLESS === '1',
  args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__deepReady !== undefined, null, { timeout: 180000 });
  // ---- from here to the summary line: the historical suite, unchanged ----
  // BLA=1 enables the GPU skip-table path (lazily compiles the BLA program, ~40 s once).
  // The referee (__directCheckHP, BigInt direct) shares ZERO math with the kernel either way.
  const BLA = process.env.BLA === '1';
  await page.evaluate(() => { const window = globalThis as any; window.__lockInput(true); window.__setBla(false); });   // explicit: the page's own default is BLA auto
  if (BLA) { await page.evaluate(() => (window as any).__setBla(true));
    const e = await page.evaluate(() => (window as any).__blaErr()); if (e) { console.log('BLA COMPILE FAILED:\n' + e); process.exit(1); } }
  console.log('BLA path:', BLA ? 'ON' : 'off');
  if (ORIGIN) { await page.evaluate('window.__setRebaseOrigin(true)'); console.log('rebase: to the ORIGIN (ORIGIN=1; the default is the page\'s)'); }   // not in the historical suite
  for (const depth of DEPTHS) {
    // base 32: +8 margin over escape time so boundary points don't sit at the budget
    // edge (measured at 1e-50: iters=92 flipped the escape flag, 96+ agreed)
    const iters = Math.min(120, 32 + Math.ceil(1.35 * -Math.log10(depth)));
    // placement is ray-specific (thin folds / near-critical parking) — same fallback
    // list as harness-dive.test.mjs; certification itself is the BigInt referee below
    const RAYS = [
      { pos: [0.1, 0.15, 2.6], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [0.4, 0.3, 2.5], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [-0.3, 0.2, 2.6], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [2.6, 0.15, 0.1], yaw: Math.PI, pitch: 0 },
    ];
    let dv: any = null, rayUsed = -1;
    for (let ri = 0; ri < RAYS.length; ri++) {
      const c = RAYS[ri];
      await page.evaluate(({ p, yaw, pitch, it }) => { const window = globalThis as any; window.__setCamHP(p); window.__cam.yaw = yaw; window.__cam.pitch = pitch; window.__cam.iters = it; }, { p: c.pos, yaw: c.yaw, pitch: c.pitch, it: iters });
      dv = await page.evaluate((d) => (window as any).__dive(d), depth);
      if (!dv.error && dv.relDE < 1e-3) { rayUsed = ri; break; }
    }
    let placeNote = rayUsed > 0 ? `  [ray ${rayUsed}]` : '';
    if (dv.error) placeNote = `  [dive: ${dv.error} — certifying at ACHIEVED depth]`;
    else if (rayUsed < 0) placeNote = '  [no ray certified clean — using last placement]';
    // achieved depth from the BigInt referee at t=0 (non-circular by construction)
    const probe0: any[] = await page.evaluate(() => (window as any).__directCheckHP([0]));
    const deAch = Math.abs(probe0[0].direct);
    if (!(deAch > 0) || deAch > 1e-2) { console.log(`depth ${depth.toExponential(0).padStart(6)}  SKIP — camera not deep (achieved de=${deAch.toExponential(1)})${placeNote}`); continue; }
    // probes exercise δ≠0 at increasing reach AT THE RENDERING-RELEVANT SCALE: pixels at
    // depth d are ~d apart, so probe at min(deAch, depth) — when the dive parks in a
    // crevice (de at camera ≫ requested depth), deAch-scaled probes would overshoot into
    // fold-crossings that no pixel at this depth ever samples.
    const ps = Math.min(deAch, depth);
    const tProbe = [0, ps * 1e-3, ps * 0.1, ps * 0.5];
    const ptsHP: any[] = await page.evaluate((tv) => (window as any).__directCheckHP(tv), tProbe);
    ran++;
    // dive-gate semantics: escape-flag mismatch = 1; both-unescaped = garbage-vs-garbage,
    // flag agreement IS the test (skip rel); both-escaped: min(raw rel, |diff|/de(t=0)).
    const de0 = Math.max(Math.abs(ptsHP[0].direct), 1e-300);
    let worstHP = -1;
    for (const p of ptsHP) {
      if (p.escG !== p.escD) worstHP = Math.max(worstHP, 1);
      else if (p.escG) worstHP = Math.max(worstHP, Math.min(p.rel, Math.abs(p.gpu - p.direct) / de0));
    }
    if (worstHP < 0) worstHP = 1;
    let xval = '';
    if (depth >= 1e-12) {           // overlap region: cross-validate the two referees
      const ptsF64: any[] = await page.evaluate((tv) => (window as any).__directCheck(tv), tProbe);
      const xrel = Math.max(...ptsF64.map((p, i) => (p.escD && ptsHP[i].escD) ? Math.abs(p.direct - ptsHP[i].direct) / Math.max(Math.abs(ptsHP[i].direct), 1e-300) : 0));
      xval = `  refXval f64-vs-HP=${xrel.toExponential(1)}`;
    }
    const ok = worstHP < 1e-3;
    if (ok) pass++;
    console.log(`depth ${depth.toExponential(0).padStart(6)} it=${String(iters).padStart(3)} achieved=${deAch.toExponential(1)}  worst GPUvsHP=${worstHP.toExponential(1)}  ${ok ? 'PASS' : 'FAIL'}${xval}${placeNote}`);
    for (const p of ptsHP)
      console.log(`        t=${p.t.toExponential(2)}  gpu=${p.gpu.toExponential(6)}  direct=${p.direct.toExponential(6)}  pert=${p.pert.toExponential(6)}  esc G/D=${p.escG}/${p.escD}  rel=${p.rel.toExponential(1)}`);
  }
  console.log(`\n${pass}/${ran} depths: GPU perturbed de matches the INDEPENDENT BigInt direct referee.`);

  // ---- OFF-CENTRE RAYS (added 2026-10-08; not in the historical suite) ----
  // Everything above probes the centre ray, within half a surface distance of the camera. A
  // picture's rays end 4 to 20 surface distances out and in every direction. Here a 13 x 13 grid
  // of rays is marched carefully, then the centre ray is aimed along each ray that hit (the camera
  // does not move, so the reference orbit is the same) and the BigInt referee is asked at `at` x
  // that ray's hit distance. Two things are gated on it, each printed beside the page's own
  // behaviour, which is the fault and is not gated:
  //   the kernel       GPU de against the referee just in front of the hit (grep REBASE TO THE ORIGIN)
  //   the far hand-off the referee's de AT the hit against the level a hit stands on, tolerance x t
  //                    (grep FAR HAND-OFF): a hit of the f32 far-field march just past 1e-3 does not
  const grid = (view: unknown, origin: boolean, far: number, rows: number, at: number): Promise<any> => page.evaluate(`(async () => {
    const w = window, G = 13, f = Math.tan(0.55), pa = f / ${rows};
    w.__setRebaseOrigin(${origin}); w.__setFarHandOff(${far}); w.__dz.setView(${JSON.stringify(view)}); w.__setSurf(${rows} / G);   // the hit tolerance of a picture that many rows tall, on 13 rays
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))));
    w.__setReach(2); w.__setMarch({ maxSteps: 16384 }); w.__setStepRelax(0.1); w.__setHitRefine(8);
    const g = w.__readGbuf(G);
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    const v0 = w.__dz.getView(), dist = w.__dz.telemetry().depth, refE = Math.floor(Math.log2(dist));
    const cp = Math.cos(v0.pitch), sp = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cp * cy, sp, cp * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const rays = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4;
      if (kind !== 1 && kind !== 2) continue;                              // 1 = a hit of the deep march, 2 = of the f32 far-field march
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((c) => c / len);
      w.__dz.setYawPitch(Math.atan2(d[2], d[0]), Math.asin(d[1]));
      const q = w.__directCheckHP([Math.pow(2, g[i] + refE) * ${at}])[0];
      rays.push({ kind, rel: q.escG === q.escD ? q.rel : 1, level: q.escD ? q.direct / (pa * q.t) : -1 });
    }
    w.__dz.setView(v0); w.__setSurf(1); w.__setRebaseOrigin(${ORIGIN}); w.__setFarHandOff(1e-3);
    return { depth: dist, rays };
  })()`);
  for (const [name, view] of GRID_VIEWS) {
    for (const origin of [false, true]) {
      const r = await grid(view, origin, 1e-3, 360, 0.97);
      const near = r.rays.filter((q: any) => q.kind === 1), over3 = near.filter((q: any) => q.rel > 1e-3).length, over2 = near.filter((q: any) => q.rel > 1e-2).length;
      const ok = !origin || (near.length >= 100 && over2 === 0 && over3 <= 0.02 * near.length);
      if (origin) { gridRan++; if (ok) gridPass++; }
      console.log(`off-centre rays, ${name} (${r.depth.toExponential(1)}), ${origin ? 'rebase to the origin' : "the page's kernel     "}: ${near.length} rays  ${String(over3).padStart(3)} over 1e-3  ${String(over2).padStart(3)} over 1e-2  worst ${Math.max(...near.map((q: any) => q.rel)).toExponential(1)}  ${origin ? (ok ? 'PASS' : 'FAIL') : '(not gated)'}`);
    }
  }
  for (const [name, view] of SHALLOW_VIEWS) {
    for (const far of [1e-3, 0.5]) {
      const r = await grid(view, true, far, 1080, 1);
      const off = r.rays.filter((q: any) => q.level < 0.5 || q.level > 1.5).length, byFar = r.rays.filter((q: any) => q.kind === 2).length;
      const ok = far === 1e-3 || (r.rays.length >= 100 && off <= 0.02 * r.rays.length);
      if (far !== 1e-3) { gridRan++; if (ok) gridPass++; }
      console.log(`far hand-off, ${name} (${r.depth.toExponential(1)}), ${far === 1e-3 ? "at 1e-3 (the page's)" : 'at 0.5              '}: ${r.rays.length} hits, ${String(byFar).padStart(3)} by the f32 march  ${String(off).padStart(3)} more than half off their level  ${far === 1e-3 ? '(not gated)' : ok ? 'PASS' : 'FAIL'}`);
    }
  }
} finally { await browser.close(); srv.stop(); }

// The historical suite only prints; as a guard for the port this one also gates.
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ` + pageErrors.slice(0, 5).join('\n  '));
const allOk = pass === DEPTHS.length && ran === DEPTHS.length && gridPass === GRIDS && gridRan === GRIDS && pageErrors.length === 0;
if (!allOk) console.log(`FAIL: expected ${DEPTHS.length}/${DEPTHS.length} depths, ${GRIDS}/${GRIDS} off-centre grids and no page errors`);
process.exit(allOk ? 0 : 1);
