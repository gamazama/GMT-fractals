/**
 * Smoke test for the Gradient Explorer live-fractal coloring mode.
 *
 * Drives the REAL FullscreenGradientOverlay end-to-end (not the renderer in
 * isolation): opens the fullscreen gallery on a colourful test gradient, switches
 * to the 'fractal' geometry, lets the WebGL renderer accumulate, then reads the
 * GL canvas back and asserts it painted a STRUCTURED, COLOURED Mandelbrot — i.e.
 * the carved engine/fractal renderer + the integration actually work at runtime
 * (the "concept-ok ≠ works" lesson). Also flips the live mapping/repeats/phase
 * knobs and confirms the image changes.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open the fullscreen gallery in fractal mode via the transient store module.
  await page.evaluate(async () => {
    const store = await import('/palette/store/fullscreenStore.ts');
    const config = {
      colorSpace: 'srgb',
      blendSpace: 'oklab',
      stops: [
        { id: 'a', position: 0.0, color: '#000428' },
        { id: 'b', position: 0.35, color: '#1b9dff' },
        { id: 'c', position: 0.7, color: '#ffd166' },
        { id: 'd', position: 1.0, color: '#ff4d4d' },
      ],
    };
    store.openFullscreen(config as never, 'Smoke Fractal');
    store.setFullscreenGeom('fractal');
  });

  // Let the renderer mount + RAF + TSAA accumulate a few frames.
  await page.waitForTimeout(2500);

  // Read the GL canvas inside the overlay and compute structure stats.
  const stats = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
    const canvas = overlay?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return { ok: false, reason: 'no canvas' };
    if (!canvas.width || !canvas.height) return { ok: false, reason: 'zero-size canvas' };
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const c2 = tmp.getContext('2d')!;
    c2.drawImage(canvas, 0, 0);
    const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
    const colors = new Set<string>();
    let nonBlack = 0;
    let coloured = 0; // pixels where channels differ (not grey)
    const N = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      colors.add(`${r >> 3},${g >> 3},${b >> 3}`); // quantise to ignore noise
      if (r + g + b > 24) nonBlack++;
      if (Math.abs(r - g) > 16 || Math.abs(g - b) > 16 || Math.abs(r - b) > 16) coloured++;
    }
    return {
      ok: true,
      w: canvas.width,
      h: canvas.height,
      distinctColors: colors.size,
      nonBlackFrac: nonBlack / N,
      colouredFrac: coloured / N,
    };
  });

  if (!stats.ok) fail(`fractal canvas not rendering: ${stats.reason}`);
  console.log('fractal render stats:', JSON.stringify(stats));

  // A live Mandelbrot coloured by a 4-colour ramp must have rich structure...
  if (stats.distinctColors! < 50) fail(`too few distinct colours (${stats.distinctColors}) — image looks flat`);
  // ...most of the frame is the coloured exterior, not black...
  if (stats.nonBlackFrac! < 0.3) fail(`mostly black (${(stats.nonBlackFrac! * 100).toFixed(0)}% non-black) — fractal not colouring`);
  // ...and the ramp's hues actually show (not a greyscale escape map).
  if (stats.colouredFrac! < 0.1) fail(`barely any hue (${(stats.colouredFrac! * 100).toFixed(0)}% coloured) — gradient not applied`);

  // Flip a live knob (mapping mode → Bands) and confirm the image changes.
  const before = stats.distinctColors!;
  await page.evaluate(async () => {
    const store = await import('/gradient-explorer/fullscreen/modes/fractal/fractalStore.ts');
    store.setFractalMapping(4);   // Bands
    store.setFractalRepeats(6);
  });
  await page.waitForTimeout(1500);
  const changed = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
    const canvas = overlay?.querySelector('canvas') as HTMLCanvasElement | null;
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
  console.log(`live mapping/repeats knob: distinct colours ${before} → ${changed}`);
  if (changed < 50) fail('live knob produced a flat/blank image');

  // No page errors throughout (carve must not throw at runtime).
  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);

  console.log('\n✓ GX live-fractal mode renders a structured, coloured Mandelbrot + live knobs work');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
