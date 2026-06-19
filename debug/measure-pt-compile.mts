/**
 * PT compile-time toll diagnostic.
 *
 * Boots app-gmt (real GPU via Chrome/ANGLE), and for each requested formula
 * measures the path-tracer compile time under two configs:
 *   - "old default": ptReflMode=0 (Env MIS off), ptSobolBounce=false
 *   - "new default": ptReflMode=2 (Env MIS + IS),  ptSobolBounce=true
 * The delta isolates the compile toll of this session's PT default changes +
 * the new gated GLSL (the new PT code is gated behind PT_ENV_MIS / PT_SOBOL_*,
 * so toggling those reproduces the pre-session compile without checking out old
 * code).
 *
 * Compile time is measured on the main thread by timing the proxy's isCompiling
 * true->false window (mirrors the worker's CompileScheduler). Worker [Compile]
 * console lines (gen/gpu split) are appended when Playwright surfaces them.
 *
 * Usage (auto-starts vite):
 *   npx tsx debug/runWithServer.mts -- npx tsx debug/measure-pt-compile.mts
 *   MEASURE_FORMULAS=Mandelbulb,MixPinski npx tsx debug/runWithServer.mts -- npx tsx debug/measure-pt-compile.mts
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;

// Wait for the dev server port before launching the browser (we start vite
// separately on Windows since runWithServer's spawn dies with EINVAL).
async function waitForPort(url: string, deadlineMs: number) {
    const m = url.match(/:(\d+)/);
    const port = m ? parseInt(m[1], 10) : 80;
    const t0 = Date.now();
    while (Date.now() - t0 < deadlineMs) {
        const ok = await new Promise<boolean>((res) => {
            // Use 'localhost' (not 127.0.0.1) — Vite binds localhost, which is
            // ::1 (IPv6) on Windows; a hard IPv4 connect is refused.
            const s = createConnection({ host: 'localhost', port });
            s.once('connect', () => { s.destroy(); res(true); });
            s.once('error', () => res(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`dev server never came up at ${url} after ${deadlineMs}ms`);
}
const REPEATS = parseInt(process.env.MEASURE_REPEATS ?? '2', 10);
const FORMULAS = (process.env.MEASURE_FORMULAS ?? 'Mandelbulb,MixPinski,GreatStellatedDodecahedron')
    .split(',').map(s => s.trim()).filter(Boolean);

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

console.log('[measure] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    // --disable-gpu-shader-disk-cache: the D3D11 DXBC cache makes a *repeat*
    // compile of the same shader return in ~50ms; we need cold compiles, so
    // disable the persistent cache (and never compile the same variant twice).
    args: ['--use-angle=d3d11', '--disable-gpu-shader-disk-cache', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const compileLogs: string[] = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[Compile]')) compileLogs.push(t); });
page.on('pageerror', (e) => console.error('[measure] PAGEERROR:', e.message));

console.log('[measure] goto', APP_URL);
await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction(
    'window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling',
    { timeout: TIMEOUT, polling: 100 },
);
console.log('[measure] booted');

const settleBody = `(async () => {
  const p = window.__gmtProxy; const t0 = performance.now(); let quiet = -1;
  while (performance.now() - t0 < 40000) {
    if (p.isCompiling) quiet = -1;
    else if (quiet < 0) quiet = performance.now();
    else if (performance.now() - quiet > 1200) return true;
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
})()`;
const settle = () => page.evaluate(settleBody);

function measureBody(patch: any): string {
    return `(async () => {
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
    })()`;
}
function parseCompile(line: string): { totalMs: number; gpuMs: number } | null {
    const tot = line.match(/(?:Two-stage|Single-stage):\s*(\d+)ms/);
    if (!tot) return null;
    const gpu = line.match(/gpu=(\d+)ms/);
    return { totalMs: parseInt(tot[1], 10), gpuMs: gpu ? parseInt(gpu[1], 10) : parseInt(tot[1], 10) };
}
async function measure(label: string, patch: any): Promise<{ winMs: number; totalMs: number; gpuMs: number; started: boolean }> {
    const before = compileLogs.length;
    const r = await page.evaluate(measureBody(patch)) as { started: boolean; ms: number };
    const logs = compileLogs.slice(before);
    const last = logs.length ? logs[logs.length - 1] : '';
    const parsed = last ? parseCompile(last) : null;
    console.log(`[measure] ${label}: window=${Math.round(r.ms)}ms${parsed ? ` compile=${parsed.totalMs}ms (gpu=${parsed.gpuMs}ms)` : ''}${r.started ? '' : ' (NO recompile detected)'}`);
    return { winMs: r.ms, totalMs: parsed?.totalMs ?? Math.round(r.ms), gpuMs: parsed?.gpuMs ?? Math.round(r.ms), started: r.started };
}

async function resolveFormula(want: string): Promise<string | null> {
    return await page.evaluate(`(() => {
      const reg = window.__fractalRegistry;
      const ids = reg.getAll().map(d => d.id).filter(Boolean);
      const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
      const w = norm(${JSON.stringify(want)});
      return ids.find(id => norm(id) === w) || ids.find(id => norm(id).includes(w)) || null;
    })()`) as string | null;
}

const results: { id: string; oldMs: number; newMs: number }[] = [];
for (const want of FORMULAS) {
    const id = await resolveFormula(want);
    if (!id) { console.log(`[measure] formula '${want}' not found in registry — skipping`); continue; }
    console.log(`\n=== ${id} ===`);
    // Normalize to Direct BEFORE switching formula so the formula switch compiles
    // in Direct (not carried-over PT) and the first PT compile per variant is cold.
    await measure(`-> Direct`, { renderMode: 'Direct' });
    await settle();
    await measure(`switch -> ${id} (Direct)`, { formula: id });
    await settle();
    // COLD compile of each PT variant — compiled exactly ONCE each. Repeating a
    // variant would hit the DXBC cache (~50ms) and lie; old/new are distinct
    // shaders so each first compile is genuinely cold.
    const oldR = await measure(`PT old-default (Env MIS off, Sobol off) COLD`, { lighting: { ptEnabled: true, ptReflMode: 0, ptSobolBounce: false }, renderMode: 'PathTracing' });
    await settle();
    const newR = await measure(`PT new-default (Env MIS+IS, Sobol on)  COLD`, { lighting: { ptReflMode: 2, ptSobolBounce: true } });
    await settle();
    results.push({ id, oldMs: oldR.gpuMs, newMs: newR.gpuMs });
    console.log(`  ${id}: old=${oldR.gpuMs}ms new=${newR.gpuMs}ms  toll=+${newR.gpuMs - oldR.gpuMs}ms (${((newR.gpuMs / oldR.gpuMs - 1) * 100).toFixed(0)}%)  [gpu compile ms]`);
}

console.log('\n========== SUMMARY: PT cold-compile toll @ HEAD (gpu compile ms) ==========');
console.log('(old = pre-session defaults: Env MIS off + Sobol off; new = current defaults)');
for (const r of results) {
    console.log(`  ${r.id.padEnd(30)} old=${String(r.oldMs).padStart(6)}ms  new=${String(r.newMs).padStart(6)}ms  toll=+${r.newMs - r.oldMs}ms (${((r.newMs / r.oldMs - 1) * 100).toFixed(0)}%)`);
}
await browser.close();
