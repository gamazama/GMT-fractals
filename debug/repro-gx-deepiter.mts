/**
 * Repro for the deeper-zoom black-out + high-iterMul artifacts.
 *   c1: renders fine (escaping reference).
 *   c2: one zoom in → all black (reference became non-escaping; per-pixel cap =
 *       orbit length = autoIter ceiling, too few iters for the minibrot detail).
 *   c3: iterMul 10 → structure returns but "crazy artifacts" (f32 perturbation
 *       drift over ~100k iterations?).
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const TAG = process.argv[2] ? `-${process.argv[2]}` : '';
const OUT = process.env.OUT_DIR || 'h:/tmp';
const WAIT_MS = Number(process.env.WAIT_MS || 9000);

const VIEWS = [
  { name: 'c1-fine', center: [-0.7142749616493337, 0.29968046409677235], centerLow: [-2.268156864342856e-18, -7.691369333603915e-18], zoom: 3.2211488240050264e-9, iterMul: 1 },
  { name: 'c2-black', center: [-0.7142749615197803, 0.29968046421552647], centerLow: [-5.964278542935077e-18, -2.2487912761162735e-17], zoom: 9.471839814868892e-10, iterMul: 1 },
  { name: 'c3-artifacts', center: [-0.7142749614992184, 0.2996804643409721], centerLow: [-5.964278542935077e-18, -2.2487912761162735e-17], zoom: 5.136249616559349e-10, iterMul: 10 },
] as const;

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 760 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    const cfg = { colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 0.3, color: '#7b2cbf' },
      { id: 'c', position: 0.6, color: '#4cc9f0' }, { id: 'd', position: 1, color: '#ffd166' } ] };
    (s as any).openFullscreen(cfg, 'Deep iter');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  for (const v of VIEWS) {
    const stats = await page.evaluate(async ({ v }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: v.center, centerLow: v.centerLow, zoom: v.zoom, iterMul: v.iterMul, colorMapping: 0, gradientRepeat: 0.01, gradientPhase: 0 });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { v });
    await page.waitForTimeout(WAIT_MS);
    const probe = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
      const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return null;
      const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
      const c2 = tmp.getContext('2d')!; c2.drawImage(canvas, 0, 0);
      const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
      let black = 0, n = 0; const colors = new Set<string>();
      for (let i = 0; i < data.length; i += 4) { if (data[i] < 24 && data[i+1] < 24 && data[i+2] < 28) black++; n++; colors.add((data[i]>>3)+','+(data[i+1]>>3)+','+(data[i+2]>>3)); }
      return { blackFrac: black / n, distinct: colors.size, dataUrl: canvas.toDataURL('image/png') };
    });
    if (probe) {
      writeFileSync(`${OUT}/deepiter-${v.name}${TAG}.png`, Buffer.from(probe.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log(`${v.name}: orbitLen=${stats?.orbitLen} gpuMaxIter=${stats?.gpuMaxIter} relocated=${stats?.relocated} escaped=${stats?.orbitLen !== stats?.gpuMaxIter ? '?' : '?'} blackFrac=${probe.blackFrac.toFixed(3)} distinct=${probe.distinct} → deepiter-${v.name}${TAG}.png`);
    }
  }
  if (errors.length) console.error('runtime errors:\n  ' + errors.join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
