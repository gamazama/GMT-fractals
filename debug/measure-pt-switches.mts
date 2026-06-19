/**
 * PT compile-time switch isolation.
 *
 * For each formula, measures the COLD compile of a minimal PT baseline, then
 * baseline + each PT compile gate ON ALONE. The delta from baseline = that
 * switch's marginal compile cost — i.e. where the time hogs are.
 *
 * Each config is a distinct shader (different #defines) compiled exactly once,
 * so every measurement is a genuine cold compile (no DXBC cache hit). Disk
 * shader cache is disabled too.
 *
 * Usage (vite must be running on :3400, or set ENGINE_URL):
 *   npx tsx debug/measure-pt-switches.mts
 *   MEASURE_FORMULAS=Mandelbulb npx tsx debug/measure-pt-switches.mts
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;
const FORMULAS = (process.env.MEASURE_FORMULAS ?? 'Mandelbulb,GreatStellatedDodecahedron')
    .split(',').map(s => s.trim()).filter(Boolean);

// Minimal PT baseline — every compile gate OFF.
const BASELINE = { ptEnabled: true, ptReflMode: 0, ptSobolBounce: false, ptNEEAllLights: false, ptAreaLights: false };

// Each switch = baseline + this single change. Order is irrelevant (each is a
// distinct cold variant); delta vs baseline is the switch's marginal cost.
const SWITCHES: { label: string; patch: Record<string, any> }[] = [
    { label: 'Env MIS (reflMode=1)',     patch: { ptReflMode: 1 } },
    { label: 'Env MIS + IS (reflMode=2)', patch: { ptReflMode: 2 } },
    { label: 'Sobol bounce',              patch: { ptSobolBounce: true } },
    { label: 'NEE all lights',            patch: { ptNEEAllLights: true } },
    { label: 'Area lights',               patch: { ptAreaLights: true } },
];

async function waitForPort(url: string, deadlineMs: number) {
    const m = url.match(/:(\d+)/); const port = m ? parseInt(m[1], 10) : 80;
    const t0 = Date.now();
    while (Date.now() - t0 < deadlineMs) {
        const ok = await new Promise<boolean>((res) => {
            const s = createConnection({ host: 'localhost', port });
            s.once('connect', () => { s.destroy(); res(true); });
            s.once('error', () => res(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`dev server never came up at ${url} after ${deadlineMs}ms`);
}

console.log('[switches] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--use-angle=d3d11', '--disable-gpu-shader-disk-cache', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const compileLogs: string[] = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[Compile]')) compileLogs.push(t); });
page.on('pageerror', (e) => console.error('[switches] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[switches] booted');

// Raise the accumulation sample cap (default 64 → converges + halts in ~1s) so
// the scene accumulates continuously and measureFps can read a steady rate.
await page.evaluate('window.__store.getState().setSampleCap(99999)');

const settle = () => page.evaluate(`(async () => {
  const p = window.__gmtProxy; const t0 = performance.now(); let q = -1;
  while (performance.now() - t0 < 40000) {
    if (p.isCompiling) q = -1; else if (q < 0) q = performance.now();
    else if (performance.now() - q > 1200) return true;
    await new Promise(r => setTimeout(r, 50));
  } return false;
})()`);

function parseCompile(line: string) {
    const tot = line.match(/(?:Two-stage|Single-stage):\s*(\d+)ms/); if (!tot) return null;
    const gpu = line.match(/gpu=(\d+)ms/);
    const fd = line.match(/firstDraw=(\d+)ms/);
    return { totalMs: parseInt(tot[1], 10), gpuMs: gpu ? parseInt(gpu[1], 10) : parseInt(tot[1], 10), firstDrawMs: fd ? parseInt(fd[1], 10) : 0 };
}
async function measure(label: string, patch: any): Promise<number> {
    const before = compileLogs.length;
    const r = await page.evaluate(`(async () => {
      const p = window.__gmtProxy; const st = window.__store.getState();
      const patch = ${JSON.stringify(patch)};
      if (patch.formula) st.setFormula(patch.formula);
      if (patch.lighting) st.setLighting(patch.lighting);
      if (patch.renderMode) st.setRenderMode(patch.renderMode);
      const t0 = performance.now();
      while (performance.now() - t0 < 8000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
      const started = p.isCompiling; const ts = performance.now();
      while (p.isCompiling && performance.now() - ts < 120000) await new Promise(r => setTimeout(r, 4));
      return { started, ms: performance.now() - ts };
    })()`) as { started: boolean; ms: number };
    const logs = compileLogs.slice(before);
    const parsed = logs.length ? parseCompile(logs[logs.length - 1]) : null;
    const gpu = parsed?.gpuMs ?? Math.round(r.ms);
    const fd = parsed?.firstDrawMs ?? 0;
    console.log(`[switches] ${label}: gpu=${gpu}ms firstDraw=${fd}ms (window=${Math.round(r.ms)}ms)${r.started ? '' : ' (NO recompile)'}`);
    return gpu;
}
// Accumulated-frames FPS — the rate at which PROGRESSIVE accumulation samples
// are produced (NOT a RAF-frame count; the old raf telemetry predates progressive
// render). `accumulationCount` is the proxy's worker-synced sample counter (it
// updates on every FRAME_READY). Call this right after a compile, while the PT
// image is still actively converging from the post-swap reset — once converged
// the worker stops producing frames and the rate reads 0. We anchor timing on the
// first observed advance (so post-compile idle isn't counted) then time N samples.
// Secondary to compile time, but surfaces render-perf wins/losses from a GLSL change.
// Accumulated-frames FPS — the rate at which PROGRESSIVE accumulation samples
// are produced (NOT a raf-frame count; that telemetry predates progressive
// render). The default sampleCap is 64, so the scene converges + halts within a
// second; we raise the cap to NEVER_CONVERGE (see boot) so accumulation runs
// continuously, then count samples over a fixed window. accumulationCount syncs
// to the proxy every FRAME_READY. Secondary to compile time, but surfaces
// render-perf wins/losses from a GLSL change.
async function measureFps(windowMs = 3000): Promise<number> {
    return await page.evaluate(`(async () => {
      const p = window.__gmtProxy;
      // Pre-roll: wait until accumulation is actively flowing (cap is raised so it
      // won't converge) so the timing window doesn't start during a post-compile stall.
      const pr = performance.now(); let last = p.accumulationCount;
      while (performance.now() - pr < 3000) {
        await new Promise(r => setTimeout(r, 50));
        if (p.accumulationCount > last) break;
        last = p.accumulationCount;
      }
      const c0 = p.accumulationCount, t0 = performance.now();
      await new Promise(r => setTimeout(r, ${windowMs}));
      const c1 = p.accumulationCount, t1 = performance.now();
      const dt = t1 - t0;
      return dt > 0 ? Math.max(0, c1 - c0) * 1000 / dt : 0;
    })()`) as number;
}

async function resolveFormula(want: string) {
    return await page.evaluate(`(() => {
      const reg = window.__fractalRegistry;
      const ids = reg.getAll().map(d => d.id).filter(Boolean);
      const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
      const w = norm(${JSON.stringify(want)});
      return ids.find(id => norm(id) === w) || ids.find(id => norm(id).includes(w)) || null;
    })()`) as string | null;
}

const table: { id: string; baseMs: number; baseFps: number; rows: { label: string; ms: number; delta: number; fps: number }[] }[] = [];
for (const want of FORMULAS) {
    const id = await resolveFormula(want);
    if (!id) { console.log(`[switches] '${want}' not found — skipping`); continue; }
    console.log(`\n=== ${id} ===`);
    await measure(`-> Direct`, { renderMode: 'Direct' }); await settle();
    await measure(`switch -> ${id} (Direct)`, { formula: id }); await settle();
    const baseMs = await measure(`PT baseline (all gates off)`, { lighting: { ...BASELINE }, renderMode: 'PathTracing' });
    const baseFps = await measureFps();
    console.log(`[switches] PT baseline: ${baseFps.toFixed(1)} accum-fps`);
    await settle();
    const rows: { label: string; ms: number; delta: number; fps: number }[] = [];
    for (const sw of SWITCHES) {
        const ms = await measure(`baseline + ${sw.label}`, { lighting: { ...BASELINE, ...sw.patch } });
        const fps = await measureFps();
        console.log(`[switches] baseline + ${sw.label}: ${fps.toFixed(1)} accum-fps`);
        await settle();
        rows.push({ label: sw.label, ms, delta: ms - baseMs, fps });
    }
    table.push({ id, baseMs, baseFps, rows });
}

console.log('\n========== SUMMARY: PT compile cost per switch (cold gpu ms) + accum-fps ==========');
for (const t of table) {
    console.log(`\n${t.id}   baseline = ${t.baseMs}ms  (${t.baseFps.toFixed(1)} accum-fps)`);
    for (const r of [...t.rows].sort((a, b) => b.delta - a.delta)) {
        console.log(`  +${String(Math.round(r.delta)).padStart(6)}ms   ${r.label.padEnd(24)} (total ${r.ms}ms, ${r.fps.toFixed(1)} accum-fps)`);
    }
}
await browser.close();
