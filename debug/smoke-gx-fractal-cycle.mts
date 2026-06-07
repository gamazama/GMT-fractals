/**
 * Stress smoke — guards the GX live-fractal mode against WebGL context leaks.
 *
 * Repeatedly enters + leaves fractal mode (each entry creates a WebGL2 context,
 * each exit must free it). Browsers hard-cap live contexts at ~16, so if dispose
 * leaks, getContext() eventually returns null and the renderer can't start. After
 * 24 cycles we open fractal once more and assert it STILL renders a structured
 * image — i.e. contexts are being freed, not leaked.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const CYCLES = 24;

function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open the gallery once on a colourful gradient.
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    const cfg = { colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#08203e' }, { id: 'b', position: 0.5, color: '#ffce54' }, { id: 'c', position: 1, color: '#e84393' },
    ] };
    (s as any).openFullscreen(cfg, 'Cycle');
  });

  // Thrash fractal ↔ 2D so the GL canvas mounts/unmounts (create + dispose) repeatedly.
  for (let i = 0; i < CYCLES; i++) {
    await page.evaluate(async () => {
      const s = await import('/palette/store/fullscreenStore.ts');
      (s as any).setFullscreenGeom('fractal');
    });
    await page.waitForTimeout(120);
    await page.evaluate(async () => {
      const s = await import('/palette/store/fullscreenStore.ts');
      (s as any).setFullscreenGeom('linear');
    });
    await page.waitForTimeout(60);
  }

  // Final entry — must still render (no context exhaustion / error fallback).
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
    const errored = ov ? /Couldn.t start the fractal renderer/.test(ov.textContent || '') : false;
    const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
    if (errored) return { ok: false, reason: 'error fallback shown (context exhausted)' };
    if (!canvas || !canvas.width) return { ok: false, reason: 'no/zero canvas' };
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const c2 = tmp.getContext('2d')!;
    c2.drawImage(canvas, 0, 0);
    const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`);
    return { ok: true, distinctColors: colors.size };
  });

  if (!res.ok) fail(`after ${CYCLES} open/close cycles: ${res.reason}`);
  if (res.distinctColors! < 50) fail(`after ${CYCLES} cycles the final render is flat (${res.distinctColors} colours)`);
  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);

  console.log(`\n✓ survived ${CYCLES} fractal open/close cycles — final render OK (${res.distinctColors} colours), no context leak`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
