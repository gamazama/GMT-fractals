/**
 * Repro for the SECOND artifact: a "diagonal coloring offset square" at extreme
 * zoom with stripe/trap coloring (colorMapping 9) + high gradientRepeat.
 *
 * Hypothesis: the LA (and AT) pre-pass SKIPS the per-iteration stripe/trap
 * accumulator block (it only runs in the PO loop), so LA-accelerated pixels
 * sample the accumulator over far fewer iterations than the pure-PO surround →
 * a coherent colour offset inside the L∞ LA square. FractalShark deliberately
 * never combines stripe coloring with LA for this reason.
 *
 * Renders the user's coordinate with LA ON vs LA OFF; if the hypothesis holds,
 * LA-OFF clears the square. Writes PNGs to h:/tmp.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const TAG = process.argv[2] ? `-${process.argv[2]}` : '';
const OUT = process.env.OUT_DIR || 'h:/tmp';
const WAIT_MS = Number(process.env.WAIT_MS || 11000);

const V = {
  center: [-0.9156735264832646, 0.2767818751974872] as [number, number],
  centerLow: [9.86006185867458e-20, 7.693468076460417e-20] as [number, number],
  zoom: 5.755175641243117e-25,
  colorMapping: 9,
  iterMul: 1,
  gradientRepeat: 32,
  gradientPhase: 0,
};

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
      { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
      { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' },
    ] };
    (s as any).openFullscreen(cfg, 'Stripe square');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const renderView = async (useLA: boolean) => {
    const stats = await page.evaluate(async ({ V, useLA }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: V.center, centerLow: V.centerLow, zoom: V.zoom, iterMul: V.iterMul,
        colorMapping: V.colorMapping, gradientRepeat: V.gradientRepeat, gradientPhase: V.gradientPhase, useLA });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { V, useLA });
    await page.waitForTimeout(WAIT_MS);
    const dataUrl = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
      const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
      return canvas ? canvas.toDataURL('image/png') : null;
    });
    return { stats, dataUrl };
  };

  const save = (name: string, dataUrl: string | null) => {
    if (!dataUrl) { console.error(`no canvas for ${name}`); return; }
    writeFileSync(`${OUT}/${name}${TAG}.png`, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`wrote ${OUT}/${name}${TAG}.png`);
  };

  const on = await renderView(true);
  console.log('LA ON :', JSON.stringify(on.stats));
  save('stripe-la-on', on.dataUrl);
  const off = await renderView(false);
  console.log('LA OFF:', JSON.stringify(off.stats));
  save('stripe-la-off', off.dataUrl);

  if (errors.length) console.error('runtime errors:\n  ' + errors.join('\n  '));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
