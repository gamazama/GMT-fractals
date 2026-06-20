/**
 * SHADOW FPS SWEEP — accumulated-frames render rate across shadow configs.
 *
 * Measures the engine's PROGRESSIVE-ACCUMULATION sample rate (Δ accumulationCount
 * / sec — the worker-synced sample counter, NOT raf frames) for each shadow
 * configuration, so we can see the real per-frame render cost of the unified
 * shadow system:
 *   - the Direct shadow-algorithm ladder (Hard / Lite Soft / Robust Soft), and
 *   - crucially, the Jitter toggle (areaLights) OFF vs ON in BOTH Direct and PT.
 *
 * The compile→runtime move means the jitter ON/OFF pairs share ONE compiled
 * shader (no recompile between them) — so the OFF→ON delta is the *pure runtime*
 * cost of the jitter path. The Direct OFF→ON pair is the one regression risk
 * (GetSoftShadow(k=2000) vs the old GetHardShadow); PT OFF→ON should be ~zero
 * (both are GetHardShadow either way).
 *
 * sampleCap is raised to 99999 so the image never converges + halts — otherwise
 * the worker stops producing frames after ~64 samples and the rate reads 0
 * (same trick as measure-pt-switches.mts, which this reuses).
 *
 * Run on the REAL GPU (headed Chrome, --use-angle=d3d11). Read DELTAS; absolute
 * fps is machine-dependent. Vite must be running on :3400.
 *
 *   npx tsx debug/bench-shadow-fps.mts
 *   MEASURE_FORMULA=Mandelbulb FPS_WINDOW_MS=4000 npx tsx debug/bench-shadow-fps.mts
 *
 * @see debug/measure-pt-switches.mts (the accumulation-fps method this reuses)
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;
const FORMULA = process.env.MEASURE_FORMULA ?? 'Mandelbulb';
const FPS_WINDOW_MS = parseInt(process.env.FPS_WINDOW_MS ?? '4000', 10);
const REPEATS = parseInt(process.env.FPS_REPEATS ?? '2', 10);  // measure each config N times, keep the best (least preempted)
// GPU strain knobs — push these up to keep every config well below the ~60fps
// raf/vsync ceiling. Moderate defaults: 1600x900 @ 1.5x supersample. WATCHDOG:
// at high values heavy configs (PT) can exceed ~2s/frame and trip the Windows
// TDR (desktop freeze) — raise gradually.
const VIEW_W = parseInt(process.env.FPS_VIEW_W ?? '1600', 10);
const VIEW_H = parseInt(process.env.FPS_VIEW_H ?? '900', 10);
const RENDER_SCALE = parseFloat(process.env.FPS_RENDER_SCALE ?? '1.5');
const IDLE_SETTLE_MS = parseInt(process.env.FPS_IDLE_MS ?? '2200', 10);  // let interaction/low-latency end → full Fixed res before timing

type Cfg = { label: string; group: string; renderMode: 'Direct' | 'PathTracing'; lighting: Record<string, any> };

// Shadows always on + compiled. ptStochasticShadows=true compiles the jitter ALU
// in; `areaLights` is the runtime uniform toggle. Direct ladder keeps the jitter
// ALU OUT (ptStochasticShadows:false) to isolate the algorithm cost; the Robust
// pair turns it on so the OFF→ON delta is purely the runtime jitter.
const BASE = { shadows: true, shadowsCompile: true, advancedLighting: true };

const CONFIGS: Cfg[] = [
    // Direct shadow-algorithm ladder (no jitter ALU).
    { label: 'Direct · Hard',                group: 'direct-ladder', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 2.0, ptStochasticShadows: false } },
    { label: 'Direct · Lite Soft',           group: 'direct-ladder', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 1.0, ptStochasticShadows: false } },
    { label: 'Direct · Robust Soft',         group: 'direct-ladder', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 0.0, ptStochasticShadows: false } },
    // Direct jitter pair (adjacent → ON is a pure runtime toggle off OFF, no recompile).
    { label: 'Direct · Robust + jitter OFF', group: 'direct-jitter', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: false } },
    { label: 'Direct · Robust + jitter ON',  group: 'direct-jitter', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true } },
    // Path tracing jitter pair (should be ~identical; both GetHardShadow).
    { label: 'PT · jitter OFF',              group: 'pt-jitter',     renderMode: 'PathTracing', lighting: { ...BASE, ptEnabled: true, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: false } },
    { label: 'PT · jitter ON',               group: 'pt-jitter',     renderMode: 'PathTracing', lighting: { ...BASE, ptEnabled: true, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true } },
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

console.log('[shadow-fps] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--use-angle=d3d11', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const page = await (await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.error('[shadow-fps] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[shadow-fps] booted');

// Raise the accumulation sample cap so the scene accumulates continuously and
// measureFps can read a steady rate (default ~64 converges + halts in ~1s).
await page.evaluate('window.__store.getState().setSampleCap(99999)');

// CRITICAL: pin the render to a fixed full resolution and suppress adaptive
// resolution. Otherwise the measurement is confounded two ways:
//   1. Adaptive res varies the pixel count to chase a target fps, so fps stops
//      reflecting shader cost (it holds fps ~constant by changing resolution).
//      Recompiled configs vs runtime-toggle configs end up at DIFFERENT scales.
//   2. A config cheap enough to exceed the ~60fps raf/vsync ceiling reads ~60
//      and can't be distinguished. At fixed full res the fractal is heavy
//      (~2-7 fps), well under the cap, so neither bites.
await page.evaluate(`(() => {
  const st = window.__store.getState();
  st.setAdaptiveSuppressed(true);
  st.setResolutionMode('Fixed');
  st.setFixedResolution(${VIEW_W}, ${VIEW_H});
  if (st.setRenderScale) st.setRenderScale(${RENDER_SCALE});
})()`);
await new Promise(r => setTimeout(r, 600));
console.log(`[shadow-fps] pinned: Fixed ${VIEW_W}x${VIEW_H} @ ${RENDER_SCALE}x  (adaptive suppressed)`);

const settle = () => page.evaluate(`(async () => {
  const p = window.__gmtProxy; const t0 = performance.now(); let q = -1;
  while (performance.now() - t0 < 40000) {
    if (p.isCompiling) q = -1; else if (q < 0) q = performance.now();
    else if (performance.now() - q > 1200) return true;
    await new Promise(r => setTimeout(r, 50));
  } return false;
})()`);

// Accumulated-frames FPS — the rate at which PROGRESSIVE accumulation samples are
// produced (NOT a raf-frame count). accumulationCount syncs to the proxy every
// FRAME_READY. Pre-roll until accumulation is actively flowing so the window
// doesn't start during a post-compile stall. Verbatim from measure-pt-switches.mts.
async function measureFps(windowMs = FPS_WINDOW_MS): Promise<number> {
    return await page.evaluate(`(async () => {
      const p = window.__gmtProxy;
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

// Apply a config (lighting + render mode), wait for any recompile to finish, and
// report whether a recompile was triggered (jitter-ON after jitter-OFF should NOT
// recompile — that's the runtime-toggle guarantee).
async function applyConfig(cfg: Cfg): Promise<boolean> {
    const r = await page.evaluate(`(async () => {
      const p = window.__gmtProxy; const st = window.__store.getState();
      st.setLighting(${JSON.stringify(cfg.lighting)});
      st.setRenderMode(${JSON.stringify(cfg.renderMode)});
      const t0 = performance.now();
      while (performance.now() - t0 < 6000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
      const started = p.isCompiling; const ts = performance.now();
      while (p.isCompiling && performance.now() - ts < 120000) await new Promise(r => setTimeout(r, 4));
      return { started };
    })()`) as { started: boolean };
    await settle();
    // Re-assert the resolution pin (a render-mode switch can reset it) and let
    // the interaction/low-latency preview END so rendering returns to full Fixed
    // res — otherwise a runtime toggle measures at preview resolution and reads
    // an artificially high fps. This idle wait is the key fix for the confound.
    await page.evaluate(`(() => {
      const st = window.__store.getState();
      st.setAdaptiveSuppressed(true);
      st.setResolutionMode('Fixed');
      st.setFixedResolution(${VIEW_W}, ${VIEW_H});
      if (st.setRenderScale) st.setRenderScale(${RENDER_SCALE});
    })()`);
    await new Promise(r => setTimeout(r, IDLE_SETTLE_MS));
    return r.started;
}

const id = await resolveFormula(FORMULA);
if (!id) { console.error(`[shadow-fps] formula '${FORMULA}' not found`); await browser.close(); process.exit(1); }
console.log(`[shadow-fps] formula = ${id}  (fps window = ${FPS_WINDOW_MS}ms, ${REPEATS}x best-of)\n`);
await page.evaluate(`window.__store.getState().setFormula(${JSON.stringify(id)})`);
await settle();

type Row = { label: string; group: string; fps: number; recompiled: boolean };
const rows: Row[] = [];
for (const cfg of CONFIGS) {
    const recompiled = await applyConfig(cfg);
    let best = 0;
    for (let k = 0; k < REPEATS; k++) best = Math.max(best, await measureFps());
    rows.push({ label: cfg.label, group: cfg.group, fps: best, recompiled });
    console.log(`[shadow-fps] ${cfg.label.padEnd(30)} ${best.toFixed(1).padStart(7)} fps   ${recompiled ? '(recompiled)' : '(no recompile)'}`);
}

const get = (label: string) => rows.find(r => r.label === label)?.fps ?? 0;
const pct = (a: number, b: number) => b > 0 ? ((a - b) / b * 100) : 0;

console.log('\n\n===================== SHADOW FPS SWEEP =====================');
console.log(`formula: ${id}   metric: accumulated-frames/sec (sampleCap=99999, not raf)\n`);
for (const g of ['direct-ladder', 'direct-jitter', 'pt-jitter']) {
    console.log(`[${g}]`);
    for (const r of rows.filter(r => r.group === g)) {
        console.log(`   ${r.fps.toFixed(1).padStart(7)} fps   ${r.label}${r.recompiled ? '' : '   ← runtime toggle (no recompile)'}`);
    }
    console.log('');
}

console.log('---- key deltas (problem-point detector) ----');
const dJitOff = get('Direct · Robust + jitter OFF'), dJitOn = get('Direct · Robust + jitter ON');
const pJitOff = get('PT · jitter OFF'),               pJitOn = get('PT · jitter ON');
console.log(`  Direct jitter OFF→ON:  ${dJitOff.toFixed(1)} → ${dJitOn.toFixed(1)} fps   (${pct(dJitOn, dJitOff).toFixed(1)}%)   ← regression risk: GetSoftShadow(k=2000) vs old GetHardShadow`);
console.log(`  PT     jitter OFF→ON:  ${pJitOff.toFixed(1)} → ${pJitOn.toFixed(1)} fps   (${pct(pJitOn, pJitOff).toFixed(1)}%)   ← expect ~0 (GetHardShadow either way)`);
console.log(`  Direct shadow ladder:  Hard ${get('Direct · Hard').toFixed(1)} | Lite ${get('Direct · Lite Soft').toFixed(1)} | Robust ${get('Direct · Robust Soft').toFixed(1)} fps`);
console.log('\nNote: a NEGATIVE % on the Direct OFF→ON line is the jitter path costing FPS; flag for next session if it exceeds run-to-run noise (re-run to confirm).');

await browser.close();
