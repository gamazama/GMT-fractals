/**
 * PT compile-time COST MAP — the full per-switch decomposition.
 *
 * Unlike measure-pt-switches.mts (which layers a few PT quality gates over a
 * production-default baseline), this maps EVERY PT-relevant compile switch as a
 * clean marginal over a *minimal* PT baseline (PT on, Hard shadows, every quality
 * gate off). One switch flipped at a time → additive marginal cost. Plus:
 *   - the Direct→PT structural delta (cost of the PT module itself),
 *   - the shadow-tier ladder (off / Hard / Lite / Robust) — the biggest shared cost,
 *   - a MAXIMAL "all on" total to check additivity vs interaction.
 *
 * Feeds (a) estCompileMs calibration (profiles.ts) and (b) UX switch-set grouping.
 *
 * Each config is a distinct shader (different #defines), compiled exactly once →
 * genuine cold compile (disk shader cache disabled, --use-angle=d3d11 headed).
 * Read the DELTAS, not absolutes; noise floor ≈ 1s; the Sobol switch is the
 * known-free control — if it reads non-zero the run is contaminated (discard).
 *
 * Usage (vite must be running on :3400):
 *   npx tsx debug/measure-pt-costmap.mts
 *   MEASURE_FORMULAS=Mandelbulb npx tsx debug/measure-pt-costmap.mts
 *
 * @see docs/policy/shader-compile-optimization.md §2.3 / §8
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;
const FORMULAS = (process.env.MEASURE_FORMULAS ?? 'Mandelbulb,GreatStellatedDodecahedron')
    .split(',').map(s => s.trim()).filter(Boolean);

// Minimal PT baseline — PT on, cheapest shadows (Hard, no jitter), every PT
// quality gate OFF. Each switch below is this + one change.
const MIN = {
    ptEnabled: true,
    ptReflMode: 0, ptSobolBounce: false, ptNEEAllLights: false, ptAreaLights: false,
    shadowsCompile: true, shadows: true, shadowAlgorithm: 2.0, ptStochasticShadows: false,
};

// Each entry = MIN + this single patch (so it's that switch's marginal cost).
// `control: true` marks the known-free switch used to validate the run.
const SWITCHES: { label: string; patch: Record<string, any>; control?: boolean; group: string }[] = [
    // Shadow ladder (shared Direct+PT; dominant chunk). Marginals over Hard.
    { label: 'Shadows OFF',          group: 'shadow', patch: { shadowsCompile: false, shadows: false } },
    { label: 'Shadows: Lite Soft',   group: 'shadow', patch: { shadowAlgorithm: 1.0 } },
    { label: 'Shadows: Robust Soft', group: 'shadow', patch: { shadowAlgorithm: 0.0 } },
    // Stochastic JITTER ALU. Compiled in by `ptStochasticShadows` ALONE — the
    // on/off toggle (uAreaLights) is a RUNTIME uniform sharing this one compiled
    // shadow march, so it has NO compile cost (validated by the runtime-toggle
    // probe at the end). NOTE: pre-refactor this switch under-counted to ~0
    // because the jitter ALU was gated on `areaLightsActive` too, which this
    // patch never set. Marginal = this − 'Robust Soft'. Distinct from 'Area
    // lights' below (True Area Lights = PT_AREA_LIGHTS, a separate compile gate).
    { label: 'Robust + Jitter ALU (ptStochasticShadows)',  group: 'shadow', patch: { shadowAlgorithm: 0.0, ptStochasticShadows: true } },
    // PT quality gates (PT-specific).
    { label: 'Env MIS (reflMode=1)',     group: 'pt-quality', patch: { ptReflMode: 1 } },
    { label: 'Env MIS + IS (reflMode=2)', group: 'pt-quality', patch: { ptReflMode: 2 } },
    { label: 'NEE all lights',            group: 'pt-quality', patch: { ptNEEAllLights: true } },
    // True Area Lights — physical sphere-surface sampling + MIS (PT_AREA_LIGHTS).
    // A SEPARATE compile gate from the stochastic jitter above (different feature:
    // real sphere lights vs fake-soft point-light jitter).
    { label: 'True Area Lights (ptAreaLights)', group: 'pt-quality', patch: { ptAreaLights: true } },
    { label: 'Sobol bounce (control)',    group: 'pt-quality', patch: { ptSobolBounce: true }, control: true },
];

// The maximal production-quality PT variant (all quality + Robust soft + jitter).
const MAXIMAL = {
    ptReflMode: 2, ptSobolBounce: true, ptNEEAllLights: true, ptAreaLights: true,
    shadowAlgorithm: 0.0, ptStochasticShadows: true,
};

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

console.log('[costmap] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--use-angle=d3d11', '--disable-gpu-shader-disk-cache', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
const compileLogs: string[] = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[Compile]')) compileLogs.push(t); });
page.on('pageerror', (e) => console.error('[costmap] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[costmap] booted');

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
    return { totalMs: parseInt(tot[1], 10), gpuMs: gpu ? parseInt(gpu[1], 10) : parseInt(tot[1], 10) };
}
// One cold compile. `mode` = 'Direct' | 'PathTracing'. Lighting patch is applied
// whole (caller spreads MIN) so no flag leaks from a prior cell.
async function measure(label: string, mode: string, lighting: any): Promise<number> {
    const before = compileLogs.length;
    const r = await page.evaluate(`(async () => {
      const p = window.__gmtProxy; const st = window.__store.getState();
      st.setLighting(${JSON.stringify(lighting)});
      st.setRenderMode(${JSON.stringify(mode)});
      const t0 = performance.now();
      while (performance.now() - t0 < 8000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
      const started = p.isCompiling; const ts = performance.now();
      while (p.isCompiling && performance.now() - ts < 120000) await new Promise(r => setTimeout(r, 4));
      return { started, ms: performance.now() - ts };
    })()`) as { started: boolean; ms: number };
    const logs = compileLogs.slice(before);
    const parsed = logs.length ? parseCompile(logs[logs.length - 1]) : null;
    const gpu = parsed?.gpuMs ?? Math.round(r.ms);
    console.log(`[costmap] ${label}: gpu=${gpu}ms (window=${Math.round(r.ms)}ms)${r.started ? '' : ' (NO recompile)'}`);
    return gpu;
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

type Row = { label: string; group: string; ms: number; delta: number; control?: boolean };
const table: { id: string; directMs: number; minMs: number; maxMs: number; rows: Row[] }[] = [];

for (const want of FORMULAS) {
    const id = await resolveFormula(want);
    if (!id) { console.log(`[costmap] '${want}' not found — skipping`); continue; }
    console.log(`\n=== ${id} ===`);
    await page.evaluate(`window.__store.getState().setFormula(${JSON.stringify(id)})`); await settle();

    const directMs = await measure(`Direct (minimal)`, 'Direct', { ...MIN }); await settle();
    const minMs = await measure(`PT minimal baseline`, 'PathTracing', { ...MIN }); await settle();

    const rows: Row[] = [];
    for (const sw of SWITCHES) {
        const ms = await measure(`  + ${sw.label}`, 'PathTracing', { ...MIN, ...sw.patch }); await settle();
        rows.push({ label: sw.label, group: sw.group, ms, delta: ms - minMs, control: sw.control });
    }
    const maxMs = await measure(`MAXIMAL (all on)`, 'PathTracing', { ...MIN, ...MAXIMAL }); await settle();
    table.push({ id, directMs, minMs, maxMs, rows });
}

console.log('\n\n========================= PT COMPILE COST MAP (cold gpu ms) =========================');
for (const t of table) {
    const sumMarginals = t.rows.filter(r => !r.label.startsWith('Shadows OFF')).reduce((a, r) => a + Math.max(0, r.delta), 0);
    console.log(`\n### ${t.id}`);
    console.log(`  Direct (minimal):       ${t.directMs}ms`);
    console.log(`  PT minimal baseline:    ${t.minMs}ms   (PT module = +${t.minMs - t.directMs}ms over Direct)`);
    console.log(`  ---- marginal cost of each switch (over PT minimal baseline) ----`);
    for (const g of ['shadow', 'pt-quality']) {
        console.log(`  [${g}]`);
        for (const r of t.rows.filter(r => r.group === g).sort((a, b) => b.delta - a.delta)) {
            const tag = r.control ? '  ← CONTROL (≈0 expected)' : '';
            const sign = r.delta >= 0 ? '+' : '';
            console.log(`     ${sign}${String(Math.round(r.delta)).padStart(6)}ms   ${r.label}${tag}`);
        }
    }
    console.log(`  ---- totals ----`);
    console.log(`  MAXIMAL (all on):       ${t.maxMs}ms`);
    console.log(`  sum of positive marginals (excl. shadows-off): +${Math.round(sumMarginals)}ms`);
    console.log(`  (maximal − minimal = ${t.maxMs - t.minMs}ms; gap vs sum = interaction/noise)`);
}
await browser.close();
