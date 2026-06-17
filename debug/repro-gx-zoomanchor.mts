/**
 * Verify the cursor-anchored zoom holds at deep zoom (offset-space fix).
 *
 * Zooms IN repeatedly at a fixed OFF-centre cursor and checks the fractal point
 * under the cursor stays fixed (computed in double-double, the truth). The old
 * canvasToFractal-difference math cancelled the offset against the centre at deep
 * zoom → the anchor drifted toward the centre. Asserts the under-cursor world
 * point barely moves (in units of the final pixel size).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 760 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000' }, { id: 'b', position: 1, color: '#fff' }] }, 'Zoom anchor');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const r = (window as any).__fractalRenderer;
    if (!r) throw new Error('no __fractalRenderer handle');
    r.setDeepZoomEnabled(true);
    // Start at a moderately deep view near interesting structure.
    r.setParams({ center: [-0.743643887037151, 0.13182590420533], centerLow: [0, 0], zoom: 1e-6 });
    const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    // Off-centre cursor: 80% across, 25% down.
    const cx = rect.left + rect.width * 0.8;
    const cy = rect.top + rect.height * 0.25;
    const u = (cx - rect.left) / rect.width;
    const v = 1 - (cy - rect.top) / rect.height;
    const aspect = canvas.width / canvas.height;

    // DD under-cursor fractal point (the truth): center + (u·2−1)·aspect·zoom.
    const p0 = r.getParams();
    const before = [
      (p0.center[0] + p0.centerLow[0]) + (u * 2 - 1) * aspect * p0.zoom,
      (p0.center[1] + p0.centerLow[1]) + (v * 2 - 1) * p0.zoom,
    ];
    // Zoom in 40 clicks (factor 0.8 each → ~1e-6 · 0.8^40 ≈ 8e-10).
    for (let i = 0; i < 40; i++) r.zoomAt(cx, cy, 0.8);
    const p = r.getParams();
    const after = [
      (p.center[0] + p.centerLow[0]) + (u * 2 - 1) * aspect * p.zoom,
      (p.center[1] + p.centerLow[1]) + (v * 2 - 1) * p.zoom,
    ];
    const pxSize = (2 * p.zoom) / canvas.height; // world units per pixel after zoom
    const driftX = Math.abs(after[0] - before[0]);
    const driftY = Math.abs(after[1] - before[1]);
    return { zoom: p.zoom, pxSize, driftX, driftY, driftPxX: driftX / pxSize, driftPxY: driftY / pxSize };
  });

  console.log(`final zoom=${result.zoom.toExponential(3)} pxSize=${result.pxSize.toExponential(3)}`);
  console.log(`anchor drift: x=${result.driftX.toExponential(3)} (${result.driftPxX.toFixed(2)} px), y=${result.driftY.toExponential(3)} (${result.driftPxY.toFixed(2)} px)`);
  // The world point under the cursor should stay within a few pixels after 40 zooms.
  const ok = result.driftPxX < 5 && result.driftPxY < 5;
  console.log(ok ? '✓ cursor anchor holds at deep zoom' : '✗ cursor anchor DRIFTED (zoom pulling toward centre)');
  await browser.close();
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
