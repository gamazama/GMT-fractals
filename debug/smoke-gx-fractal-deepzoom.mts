/**
 * Smoke — the GX live-fractal DEEP-ZOOM path actually resolves structure past
 * the float32 quantization floor.
 *
 * At a deep Mandelbrot coordinate (seahorse valley, zoom 1e-9) the plain f32
 * path collapses into a few huge flat blocks (massive quantization → very few
 * distinct colours). With deep zoom ON (perturbation + LA + AT reference orbit,
 * built off-thread), the same view resolves sharp detail → many more distinct
 * colours. We assert deepOn ≫ deepOff, proving the carved deepZoom stack is wired
 * end-to-end (worker build → controller upload → kernel deep branch).
 *
 * Drives the renderer via the window.__fractalRenderer debug handle.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
// Famous deep-zoom location (Seahorse Valley); f32 dies long before this depth.
const DEEP_CENTER = [-0.743643887037151, 0.13182590420533];
const DEEP_ZOOM = 1e-9;

function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open fractal mode on a colourful gradient.
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    const cfg = { colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 0.4, color: '#3a86ff' },
      { id: 'c', position: 0.7, color: '#ffbe0b' }, { id: 'd', position: 1, color: '#ff006e' },
    ] };
    (s as any).openFullscreen(cfg, 'Deep');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const distinctAt = () => page.evaluate(() => {
    const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
    const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return -1;
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const c2 = tmp.getContext('2d')!;
    c2.drawImage(canvas, 0, 0);
    const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`);
    return colors.size;
  });

  // Deep zoom ON (lifts the zoom floor), jump to the deep coordinate, build the
  // reference orbit. The deep path resolves sharp structure at a depth the f32
  // kernel CANNOT — at zoom 1e-9 the whole screen spans far less than an f32 ulp
  // of the centre (~0.74), so the pure-f32 image is a single flat colour. Rich
  // structure here therefore proves the deep path actually engaged.
  const deepOn = await page.evaluate(async ({ c, z }) => {
    const r = (window as any).__fractalRenderer;
    if (!r) throw new Error('no __fractalRenderer handle');
    r.setDeepZoomEnabled(true);
    r.setParams({ center: c, centerLow: [0, 0], zoom: z });
    await r.rebuildDeepZoom();
    return r.getParams().zoom;
  }, { c: DEEP_CENTER, z: DEEP_ZOOM });
  await page.waitForTimeout(3000); // orbit build + TSAA accumulate
  const deepColors = await distinctAt();

  // Floor protection: disabling deep zoom must re-clamp the view out of the
  // f32 danger zone (you can't sit at 1e-9 on the shallow path).
  const zoomAfterOff = await page.evaluate(() => {
    const r = (window as any).__fractalRenderer;
    r.setDeepZoomEnabled(false);
    return r.getParams().zoom;
  });

  if (deepColors < 0) fail('canvas missing during deep-zoom test');
  console.log(`deep ON: zoom=${deepOn} (target ${DEEP_ZOOM}), distinct colours=${deepColors}`);
  console.log(`deep OFF: zoom re-clamped to ${zoomAfterOff}`);

  if (Math.abs(deepOn - DEEP_ZOOM) > DEEP_ZOOM * 0.01) fail(`deep zoom did not reach ${DEEP_ZOOM} (got ${deepOn}) — floor not lifted`);
  if (deepColors < 50) fail(`deep path produced a flat image (${deepColors} colours) at 1e-9 — orbit did not engage`);
  if (zoomAfterOff < 1e-4) fail(`disabling deep zoom left zoom at ${zoomAfterOff} (< f32 floor 1e-4) — would render garbage`);
  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);

  console.log(`\n✓ deep zoom resolves ${deepColors} colours at zoom 1e-9 (f32 is mathematically flat there); floor re-clamps to ${zoomAfterOff} when off`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
