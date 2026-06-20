/**
 * STAGE 1 of the shadow GPU bench — dump all shadow-config shaders from ONE GMT
 * boot, so every variant shares an IDENTICAL camera / scene / uniform set and the
 * ONLY difference between them is the shadow GLSL (+ the runtime uAreaLights /
 * shadowAlgorithm state). This eliminates the per-boot camera-spring variance that
 * made the one-config-per-boot approach incoherent (Hard reading slower than
 * Robust, etc.).
 *
 * Writes one complete bench-shader Snapshot JSON per config to
 *   debug/shadow-shaders/<tag>.json
 * Stage 2 then runs `bench-shader --use-snapshot=<tag>.json` for each — that path
 * only loads shader-bench.html (no GMT boot), measuring EXT_disjoint_timer_query
 * GPU time per draw against the shared uniforms.
 *
 * Vite must be running on :3400. Run on the real GPU (headed Chrome, d3d11).
 *
 *   npx tsx debug/dump-shadow-shaders.mts
 */
import { chromium } from 'playwright';
import { createConnection } from 'net';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const TIMEOUT = 90_000;
const FORMULA = process.env.MEASURE_FORMULA ?? 'Mandelbulb';
const OUT_DIR = resolve('debug/shadow-shaders');
const WIDTH = 1280, HEIGHT = 720;

type Cfg = { tag: string; renderMode: 'Direct' | 'PathTracing'; lighting: Record<string, any> };
const BASE = { shadows: true, shadowsCompile: true, advancedLighting: true };
const CONFIGS: Cfg[] = [
    { tag: 'd-hard',    renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 2.0, ptStochasticShadows: false } },
    { tag: 'd-lite',    renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 1.0, ptStochasticShadows: false } },
    { tag: 'd-rob-off', renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: false } },
    { tag: 'd-rob-on',  renderMode: 'Direct',      lighting: { ...BASE, ptEnabled: false, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true } },
    { tag: 'pt-off',    renderMode: 'PathTracing', lighting: { ...BASE, ptEnabled: true,  shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: false } },
    { tag: 'pt-on',     renderMode: 'PathTracing', lighting: { ...BASE, ptEnabled: true,  shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true } },
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
    throw new Error(`dev server never came up at ${url}`);
}

console.log('[dump] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--use-angle=d3d11', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
});
const page = await (await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.error('[dump] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[dump] booted');

// Wait for a quiescent (not-compiling) window — reused after every config change.
const settle = () => page.evaluate(`(async () => {
  const p = window.__gmtProxy; const start = performance.now(); let quietSince = -1;
  while (performance.now() - start < 30000) {
    if (p.isCompiling) quietSince = -1;
    else if (quietSince < 0) quietSince = performance.now();
    else if (performance.now() - quietSince >= 1500) return true;
    await new Promise(r => setTimeout(r, 80));
  } return false;
})()`);

async function resolveFormula(want: string) {
    return await page.evaluate(`(() => {
      const reg = window.__fractalRegistry;
      const ids = reg.getAll().map(d => d.id).filter(Boolean);
      const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
      const w = norm(${JSON.stringify(want)});
      return ids.find(id => norm(id) === w) || ids.find(id => norm(id).includes(w)) || null;
    })()`) as string | null;
}

// Apply the formula's canonical defaultPreset ONCE so camera/lights/materials are
// the authored scene. After this we NEVER touch the camera again → identical
// across every config dumped below.
const id = await resolveFormula(FORMULA);
if (!id) { console.error(`[dump] formula '${FORMULA}' not found`); await browser.close(); process.exit(1); }
await page.evaluate(`(() => {
  const st = window.__store.getState();
  const reg = window.__fractalRegistry;
  st.setFormula(${JSON.stringify(id)});
  const preset = reg.get(${JSON.stringify(id)})?.defaultPreset;
  if (preset) st.loadPreset(JSON.parse(JSON.stringify(preset)));
})()`);
await settle();
await page.evaluate(`new Promise(r => setTimeout(r, 800))`);  // let camera spring settle
console.log(`[dump] scene = ${id} (camera pinned for all configs)`);

async function capture(tag: string, cfg: Cfg) {
    // Apply config, wait for the recompile (shadowAlgorithm / ptEnabled / renderMode
    // are compile gates; areaLights is runtime). NEVER touch the camera.
    await page.evaluate(`(async () => {
      const st = window.__store.getState();
      st.setLighting(${JSON.stringify(cfg.lighting)});
      st.setRenderMode(${JSON.stringify(cfg.renderMode)});
    })()`);
    await settle();
    await page.evaluate(`new Promise(r => setTimeout(r, 300))`);

    const snap = await page.evaluate(`(async () => {
      const proxy = window.__gmtProxy;
      const [fragSrc, uniforms] = await Promise.all([
        proxy.getCompiledFragmentShader(),
        proxy.getUniformsSnapshot(),
      ]);
      const state = window.__store?.getState?.() ?? {};
      const mat = state.materials ?? {};
      return {
        fragSrc, uniforms: uniforms ?? {}, formula: state.formula ?? '?',
        envMapData: mat.envMapData ?? null, envSource: mat.envSource ?? 0,
        useEnvMap: mat.useEnvMap ? 1 : 0, envMapColorSpace: mat.envMapColorSpace ?? 0,
        uAreaLights: state.lighting?.areaLights ?? false,
        renderMode: state.renderMode ?? '?',
      };
    })()`) as any;

    const out = {
        fragSrc: snap.fragSrc, uniforms: snap.uniforms, formula: snap.formula,
        captured: 'dump-' + tag, width: WIDTH, height: HEIGHT,
        envMapData: snap.envMapData, envSource: snap.envSource,
        useEnvMap: snap.useEnvMap, envMapColorSpace: snap.envMapColorSpace,
    };
    const path = join(OUT_DIR, `${tag}.json`);
    writeFileSync(path, JSON.stringify(out));
    const uCount = Object.keys(snap.uniforms).length;
    console.log(`[dump] ${tag.padEnd(10)} frag=${String(snap.fragSrc?.length ?? 0).padStart(7)}b  uniforms=${uCount}  mode=${snap.renderMode}  uAreaLights=${snap.uniforms.uAreaLights ?? '?'}  → ${tag}.json`);
}

for (const cfg of CONFIGS) await capture(cfg.tag, cfg);
await browser.close();
console.log(`\n[dump] done — ${CONFIGS.length} snapshots in ${OUT_DIR}`);
console.log('[dump] Stage 2: npx tsx debug/bench-shader.mts --use-snapshot=debug/shadow-shaders/<tag>.json');
