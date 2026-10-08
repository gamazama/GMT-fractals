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

let pass = 0, ran = 0;
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
} finally { await browser.close(); srv.stop(); }

// The historical suite only prints; as a guard for the port this one also gates.
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ` + pageErrors.slice(0, 5).join('\n  '));
const allOk = pass === DEPTHS.length && ran === DEPTHS.length && pageErrors.length === 0;
if (!allOk) console.log(`FAIL: expected ${DEPTHS.length}/${DEPTHS.length} depths and no page errors`);
process.exit(allOk ? 0 : 1);
