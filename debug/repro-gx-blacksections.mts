/**
 * Repro for the "big black sections / iteration cliff on tiny pan" symptom.
 *
 * Two views differing ONLY in the DD lo word (a sub-ulp pan). The view-centre
 * reference orbit escapes early; the per-pixel cap = orbit length, so pixels
 * escaping later than the reference are cut off to interior (black). A hair of
 * pan changes where the centre escapes (orbitLen 3991 ↔ 3822) → the black
 * regions pop. Renders LA-on for each; writes PNGs + prints deep stats.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const TAG = process.argv[2] ? `-${process.argv[2]}` : '';
const OUT = process.env.OUT_DIR || 'h:/tmp';
const WAIT_MS = Number(process.env.WAIT_MS || 9000);

const COMMON = { zoom: 1.1728290451852785e-17, colorMapping: 0, iterMul: 1, gradientRepeat: 0.01, gradientPhase: 0 };
const VIEWS = [
  { name: 'a-good', center: [-0.6933148194504128, 0.29059116796937007] as [number, number], centerLow: [4.6338974124245744e-17, 1.6688987575368335e-17] as [number, number] },
  { name: 'b-panned', center: [-0.6933148194504128, 0.29059116796937007] as [number, number], centerLow: [4.7676519392250105e-17, 1.7803608632038595e-17] as [number, number] },
];

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
    (s as any).openFullscreen(cfg, 'Black sections');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  for (const v of VIEWS) {
    const stats = await page.evaluate(async ({ v, COMMON }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: v.center, centerLow: v.centerLow, ...COMMON });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { v, COMMON });
    await page.waitForTimeout(WAIT_MS);
    // Fraction of (near-)black pixels — the interior cut-off shows up here.
    const probe = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
      const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return null;
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const c2 = tmp.getContext('2d')!; c2.drawImage(canvas, 0, 0);
      const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
      let black = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) { if (data[i] < 24 && data[i+1] < 24 && data[i+2] < 28) black++; n++; }
      return { blackFrac: black / n, dataUrl: canvas.toDataURL('image/png') };
    });
    if (probe) {
      writeFileSync(`${OUT}/black-${v.name}${TAG}.png`, Buffer.from(probe.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log(`${v.name}: orbitLen=${stats?.orbitLen} gpuMaxIter=${stats?.gpuMaxIter} relocated=${stats?.relocated} blackFrac=${probe.blackFrac.toFixed(3)} → wrote black-${v.name}${TAG}.png`);
    }
  }
  if (errors.length) console.error('runtime errors:\n  ' + errors.join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
