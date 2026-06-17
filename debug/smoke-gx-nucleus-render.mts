/**
 * Smoke — the minibrot-NUCLEUS (periodic) deep-zoom reference renders the same
 * image as the non-periodic fallback, from a far shorter orbit (ADR-0066).
 *
 * For each known minibrot-dive view, render it twice:
 *   useNucleus ON  → builder adopts the exact period-P nucleus: a ONE-period
 *                    orbit the kernel wraps modulo P (period > 0, short orbit).
 *   useNucleus OFF → the ADR-0065 non-periodic path (period 0, long orbit).
 *
 * Assert: the periodic build has period > 0 and an orbit far shorter than the
 * non-periodic one, AND the two renders' central colour distribution matches
 * (the periodic reference is correct, not just cheaper). This is the regression
 * guard for the periodic reference + kernel modulo-wrap.
 *
 * Headless GPU is SwiftShader (~1 frame/3s); the central-dominant detector is a
 * distribution comparison (not pixel-exact), robust to accumulator state.
 *
 * Run (needs `npm run dev`):
 *   ENGINE_URL=http://localhost:3401/gradient-explorer.html npx tsx debug/smoke-gx-nucleus-render.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const WAIT_MS = Number(process.env.WAIT_MS || 7000);
/** Periodic vs non-periodic central distribution must match this closely. */
const MAX_DOMINANT_DELTA = 0.18;
/** The periodic orbit must be at least this many× shorter than the fallback. */
const MIN_ORBIT_SHRINK = 3;

interface View {
  name: string;
  center: [number, number]; centerLow: [number, number];
  zoom: number; iterMul: number; colorMapping: number; gradientRepeat: number;
}
const VIEWS: View[] = [
  // ADR-0065 Fix-5 interior view — a genuine minibrot dive (period ≈ 168).
  { name: 'interior-minibrot', center: [-0.6396519243564869, 0.447970190714411],
    centerLow: [-3.662917280078923e-17, -9.391336225550338e-18],
    zoom: 5.244358778813348e-8, iterMul: 1, colorMapping: 0, gradientRepeat: 0.03 },
];

function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 880, height: 720 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
      { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' } ] }, 'Nucleus smoke');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const render = async (v: View, useNucleus: boolean) => {
    const stats = await page.evaluate(async ({ v, useNucleus }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: v.center, centerLow: v.centerLow, zoom: v.zoom, iterMul: v.iterMul,
        colorMapping: v.colorMapping, gradientRepeat: v.gradientRepeat, useLA: true, useNucleus });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { v, useNucleus });
    await page.waitForTimeout(WAIT_MS);
    const dominant = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement | null;
      if (!canvas) return -1;
      const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
      const c2 = tmp.getContext('2d')!; c2.drawImage(canvas, 0, 0);
      const W = tmp.width, H = tmp.height;
      const { data } = c2.getImageData(0, 0, W, H);
      const x0 = (W * 0.3) | 0, x1 = (W * 0.7) | 0, y0 = (H * 0.3) | 0, y1 = (H * 0.7) | 0;
      const hist = new Map<string, number>(); let n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        const k = (data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3);
        hist.set(k, (hist.get(k) ?? 0) + 1); n++;
      }
      let md = 0; for (const c of hist.values()) md = Math.max(md, c / n);
      return md;
    });
    return { stats, dominant };
  };

  for (const v of VIEWS) {
    const on = await render(v, true);
    const off = await render(v, false);
    if (on.dominant < 0 || off.dominant < 0) fail(`${v.name}: canvas missing`);
    const delta = Math.abs(on.dominant - off.dominant);
    console.log(`${v.name}: nucleus period=${on.stats?.period} orbitLen=${on.stats?.orbitLen} dom=${on.dominant.toFixed(3)} | ` +
      `fallback period=${off.stats?.period} orbitLen=${off.stats?.orbitLen} dom=${off.dominant.toFixed(3)} | Δ=${delta.toFixed(3)}`);

    if (!(on.stats?.period > 0)) fail(`${v.name}: nucleus path produced no periodic reference (period=${on.stats?.period})`);
    if (off.stats?.period !== 0) fail(`${v.name}: useNucleus:false should be non-periodic (got period=${off.stats?.period})`);
    if (!(off.stats?.orbitLen >= on.stats?.orbitLen * MIN_ORBIT_SHRINK)) {
      fail(`${v.name}: periodic orbit not meaningfully shorter (nucleus ${on.stats?.orbitLen} vs fallback ${off.stats?.orbitLen})`);
    }
    if (delta > MAX_DOMINANT_DELTA) {
      fail(`${v.name}: periodic render diverges from the non-periodic baseline (Δ=${delta.toFixed(3)} > ${MAX_DOMINANT_DELTA})`);
    }
  }

  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ nucleus reference: short periodic orbit, render matches the non-periodic baseline');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
