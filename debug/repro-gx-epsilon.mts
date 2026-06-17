/** Probe auto-epsilon: build at several coords, print the calibrated ε + stats.
 *  Stats-only (no render wait) — fast. */
import { chromium } from 'playwright';

const URL = 'http://localhost:3400/gradient-explorer.html';
const COORDS: { name: string; center: [number, number]; centerLow: [number, number]; zoom: number; iterMul: number; colorMapping: number }[] = [
  { name: 'escaping-sq', center: [-0.8647752352263411, 0.2422927873189491], centerLow: [0, 0], zoom: 6.869923567136315e-8, iterMul: 3.25, colorMapping: 0 },
  { name: 'seahorse', center: [-0.743643887037151, 0.13182590420533], centerLow: [0, 0], zoom: 1e-9, iterMul: 1, colorMapping: 0 },
  { name: 'blacksect-a', center: [-0.6933148194504128, 0.29059116796937007], centerLow: [4.6338974124245744e-17, 1.6688987575368335e-17], zoom: 1.1728290451852785e-17, iterMul: 1, colorMapping: 0 },
  { name: 'interior-ref', center: [-0.6396519243564869, 0.447970190714411], centerLow: [-3.662917280078923e-17, -9.391336225550338e-18], zoom: 5.244358778813348e-8, iterMul: 1, colorMapping: 0 },
];

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 680 } })).newPage();
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000' }, { id: 'b', position: 1, color: '#fff' }] }, 'Eps');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  for (const c of COORDS) {
    const calib = process.env.CALIB !== '0';
    const r = await page.evaluate(async ({ c, calib }) => {
      const fr = (window as any).__fractalRenderer;
      fr.setDeepZoomEnabled(true);
      fr.setParams({ center: c.center, centerLow: c.centerLow, zoom: c.zoom, iterMul: c.iterMul, colorMapping: c.colorMapping, gradientRepeat: 0.03, calibrateLA: calib });
      const t0 = performance.now();
      await fr.rebuildDeepZoom();
      const ms = performance.now() - t0;
      return { stats: fr.lastDeepStats, buildMs: Math.round(ms) };
    }, { c, calib });
    console.log(`${c.name}: epsLog2=${r.stats?.laEpsilonLog2} relocated=${r.stats?.relocated} laUnsafe=${r.stats?.laUnsafe} orbitLen=${r.stats?.orbitLen} laCount=${r.stats?.laCount} | wall=${r.buildMs} orbit/search=${Math.round(r.stats?.buildMs ?? 0)} la/calib=${Math.round(r.stats?.laBuildMs ?? 0)}`);
  }
  if (errs.length) console.error('errors:', errs.join('; '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
