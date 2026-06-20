/**
 * DIRECT-render compile-time COST MAP — the Direct twin of measure-pt-costmap.mts.
 *
 * The whole compile-time initiative so far is PT-only; Direct (renderMode 0, the
 * DEFAULT fast experience) is a separate, mutually-exclusive shader and has never
 * been decomposed. This maps every Direct-relevant compile switch as a clean
 * marginal over a *minimal* Direct baseline (Direct on, no shadows / reflections /
 * AO / glow, Blinn-Phong), one switch flipped at a time → additive marginal cost.
 *
 * Prime suspects (unvalidated estCompileMs annotations): Raymarched reflections
 * (7500ms) and +bounce-shadows (4500ms) — a raymarched reflection is a SECOND
 * full DE march in the shading path. The PT estimates were 3–5× off when finally
 * measured, in both directions, so these need measuring before we trust them.
 *
 * Each config is a distinct shader (different #defines), compiled exactly once →
 * genuine cold compile (disk shader cache disabled, --use-angle=d3d11 headed).
 * Read DELTAS not absolutes; noise floor ≈ 1s. CONTROL = 'Reflections: Env Map'
 * (annotated estCompileMs 0) — if it reads >1s the run is contaminated (discard).
 *
 * Usage (vite must be running on :3400):
 *   npx tsx debug/measure-direct-costmap.mts
 *   MEASURE_FORMULAS=Mandelbulb npx tsx debug/measure-direct-costmap.mts
 *
 * @see docs/policy/shader-compile-optimization.md §2.5 (PT cost map; this is the Direct twin)
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;
const FORMULAS = (process.env.MEASURE_FORMULAS ?? 'Mandelbulb,GreatStellatedDodecahedron')
    .split(',').map(s => s.trim()).filter(Boolean);

// Minimal Direct baseline — Direct render, no shadows/reflections/AO/glow,
// Blinn-Phong. Per-feature; each switch below spreads this then changes one thing.
const MIN: Record<string, Record<string, any>> = {
    lighting: {
        ptEnabled: false, advancedLighting: true, specularModel: 0.0,
        shadows: false, shadowsCompile: false, shadowAlgorithm: 2.0, ptStochasticShadows: false,
    },
    reflections: { reflectionMode: 0.0, bounceShadows: false },
    ao: { aoEnabled: false, aoStochasticCp: false },
    atmosphere: { glowEnabled: false },
};

type Patch = Record<string, Record<string, any>>;
const SWITCHES: { label: string; group: string; patch: Patch; control?: boolean }[] = [
    // Shadow ladder (the "do the tiers cost the same in Direct?" question).
    { label: 'Shadows: Hard',  group: 'shadow', patch: { lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 2.0 } } },
    { label: 'Shadows: Soft',  group: 'shadow', patch: { lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0 } } },
    // Soft + stochastic JITTER ALU compiled into the unified GetSoftShadow march.
    // Gated on `ptStochasticShadows` ALONE now; the on/off toggle (uAreaLights) is
    // a RUNTIME uniform sharing this one compiled march (no separate compile path,
    // nothing to predicate). So this switch's marginal = the jitter ALU's compile
    // cost; areaLights state is compile-irrelevant. The runtime no-recompile claim
    // is asserted by the runtime-toggle probe at the end of the run.
    { label: 'Shadows: Soft + Jitter ALU (ptStochasticShadows)', group: 'shadow', patch: { lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true } } },
    // Reflections (the prime suspects). Env Map = near-free CONTROL.
    { label: 'Reflections: Env Map (control)', group: 'refl', patch: { reflections: { reflectionMode: 1.0 } }, control: true },
    { label: 'Reflections: Raymarched',        group: 'refl', patch: { reflections: { reflectionMode: 3.0, bounceShadows: false } } },
    { label: 'Reflections: Full (RM+bounceSh)', group: 'refl', patch: { reflections: { reflectionMode: 3.0, bounceShadows: true } } },
    // Other Direct switches.
    { label: 'Cook-Torrance (vs Blinn)', group: 'other', patch: { lighting: { specularModel: 1.0 } } },
    { label: 'AO on',                    group: 'other', patch: { ao: { aoEnabled: true } } },
    { label: 'AO + stochastic',          group: 'other', patch: { ao: { aoEnabled: true, aoStochasticCp: true } } },
    { label: 'Glow: Fast',               group: 'other', patch: { atmosphere: { glowEnabled: true, glowQuality: 1.0 } } },
    { label: 'Glow: Color',              group: 'other', patch: { atmosphere: { glowEnabled: true, glowQuality: 0.0 } } },
];

// Maximal Direct (all on): full shadows + full reflections + cook-torrance + AO + color glow.
const MAXIMAL: Patch = {
    lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true, specularModel: 1.0 },
    reflections: { reflectionMode: 3.0, bounceShadows: true },
    ao: { aoEnabled: true, aoStochasticCp: true },
    atmosphere: { glowEnabled: true, glowQuality: 0.0 },
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

console.log('[direct] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--use-angle=d3d11', '--disable-gpu-shader-disk-cache', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
const compileLogs: string[] = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[Compile]')) compileLogs.push(t); });
page.on('pageerror', (e) => console.error('[direct] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[direct] booted');

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
    return { gpuMs: gpu ? parseInt(gpu[1], 10) : parseInt(tot[1], 10) };
}
// Apply a per-feature patch (spread over MIN so no flag leaks), force Direct, time the cold compile.
async function measure(label: string, patch: Patch): Promise<number> {
    const full: Patch = {};
    for (const f of Object.keys(MIN)) full[f] = { ...MIN[f], ...(patch[f] ?? {}) };
    const before = compileLogs.length;
    const r = await page.evaluate(`(async () => {
      const p = window.__gmtProxy; const st = window.__store.getState();
      const full = ${JSON.stringify(full)};
      st.setLighting(full.lighting);
      if (st.setReflections) st.setReflections(full.reflections);
      if (st.setAo) st.setAo(full.ao);
      if (st.setAtmosphere) st.setAtmosphere(full.atmosphere);
      st.setRenderMode('Direct');
      const t0 = performance.now();
      while (performance.now() - t0 < 8000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
      const started = p.isCompiling; const ts = performance.now();
      while (p.isCompiling && performance.now() - ts < 120000) await new Promise(r => setTimeout(r, 4));
      return { started, ms: performance.now() - ts };
    })()`) as { started: boolean; ms: number };
    const logs = compileLogs.slice(before);
    const parsed = logs.length ? parseCompile(logs[logs.length - 1]) : null;
    const gpu = parsed?.gpuMs ?? Math.round(r.ms);
    console.log(`[direct] ${label}: gpu=${gpu}ms (window=${Math.round(r.ms)}ms)${r.started ? '' : ' (NO recompile)'}`);
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
const table: { id: string; minMs: number; maxMs: number; rows: Row[] }[] = [];

for (const want of FORMULAS) {
    const id = await resolveFormula(want);
    if (!id) { console.log(`[direct] '${want}' not found — skipping`); continue; }
    console.log(`\n=== ${id} ===`);
    await page.evaluate(`window.__store.getState().setFormula(${JSON.stringify(id)})`); await settle();

    const minMs = await measure(`Direct minimal baseline`, {}); await settle();
    const rows: Row[] = [];
    for (const sw of SWITCHES) {
        const ms = await measure(`  + ${sw.label}`, sw.patch); await settle();
        rows.push({ label: sw.label, group: sw.group, ms, delta: ms - minMs, control: sw.control });
    }
    const maxMs = await measure(`MAXIMAL (all on)`, MAXIMAL); await settle();
    table.push({ id, minMs, maxMs, rows });
}

console.log('\n\n===================== DIRECT COMPILE COST MAP (cold gpu ms) =====================');
for (const t of table) {
    console.log(`\n### ${t.id}`);
    console.log(`  Direct minimal baseline:  ${t.minMs}ms`);
    console.log(`  ---- marginal cost of each switch (over Direct minimal) ----`);
    for (const g of ['shadow', 'refl', 'other']) {
        console.log(`  [${g}]`);
        for (const r of t.rows.filter(r => r.group === g).sort((a, b) => b.delta - a.delta)) {
            const tag = r.control ? '  ← CONTROL (≈0 expected)' : '';
            const sign = r.delta >= 0 ? '+' : '';
            console.log(`     ${sign}${String(Math.round(r.delta)).padStart(6)}ms   ${r.label}${tag}`);
        }
    }
    console.log(`  ---- totals ----`);
    console.log(`  MAXIMAL (all on):         ${t.maxMs}ms  (maximal − minimal = ${t.maxMs - t.minMs}ms)`);
}

// ---- RUNTIME-TOGGLE ASSERTION ----
// The compile→runtime move's load-bearing claim: with the jitter ALU compiled in
// (ptStochasticShadows on), flipping `areaLights` is a pure uniform write and must
// NOT trigger a recompile. If this regresses (e.g. someone re-adds onUpdate:'compile'
// or an areaLightsActive compile gate), this prints FAIL.
console.log('\n\n===================== RUNTIME-TOGGLE ASSERTION =====================');
// 1. Compile once with jitter capability present, areaLights OFF.
await page.evaluate(`(async () => {
  const p = window.__gmtProxy; const st = window.__store.getState();
  st.setLighting({ advancedLighting: true, ptEnabled: false, shadows: true, shadowsCompile: true,
                   shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: false });
  st.setRenderMode('Direct');
})()`);
await settle();
// 2. Flip ONLY areaLights at runtime; expect NO recompile.
const beforeToggle = compileLogs.length;
const toggle = await page.evaluate(`(async () => {
  const p = window.__gmtProxy; const st = window.__store.getState();
  st.setLighting({ areaLights: true });
  const t0 = performance.now();
  while (performance.now() - t0 < 3000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
  return { started: p.isCompiling };
})()`) as { started: boolean };
const recompiled = toggle.started || compileLogs.length > beforeToggle;
console.log(`  areaLights OFF→ON (jitter compiled): ${recompiled ? 'FAIL — recompiled (should be a runtime uniform)' : 'PASS — no recompile'}`);

await browser.close();
