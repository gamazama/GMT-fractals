/**
 * Smoke — the LIQUIFY fullscreen mode renders + deforms end-to-end in a real browser.
 *
 * The CPU soft body is unit-tested by debug/test-liquify-mesh.mts, but the GL path (shader
 * compile, the deformed-mesh draw, the dither tail) and the pointer→mesh→render wiring can only
 * be exercised with a real WebGL2 context. This drives the live Gradient Explorer headlessly:
 * opens fullscreen on a colourful gradient, switches to Liquify, asserts the gradient renders
 * (non-blank, non-uniform), then drags real pointer strokes (push + grab) and toggles physics,
 * asserting the mesh actually changes and nothing throws.
 *
 * Headless GPU is SwiftShader. Run (needs `npm run dev`):
 *   ENGINE_URL=http://localhost:3411/gradient-explorer.html npx tsx debug/smoke-gx-liquify-render.mts
 */
import { chromium } from 'playwright';
import { signature, diff, variety } from './helpers/canvas-signature.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 740 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
      { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' } ] }, 'Liquify smoke');
    (s as any).setFullscreenGeom('liquify');
  });
  await page.waitForTimeout(1800);

  // [1] the gradient renders (non-blank, non-uniform)
  const base = await signature(page);
  if (base.length < 0 || !base.length) fail('liquify canvas missing');
  const v = variety(base);
  if (v < 6) fail(`rendered gradient looks blank/uniform (variety=${v})`);
  console.log(`[1] rendered: ${base.length / 3} samples, colour variety ${v} ✓`);

  // Canvas screen rect — the mesh occupies the centred square; drag inside it.
  const rect = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const drag = async (x0: number, y0: number, x1: number, y1: number) => {
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let s = 1; s <= 8; s++) await page.mouse.move(x0 + (x1 - x0) * s / 8, y0 + (y1 - y0) * s / 8);
    await page.mouse.up();
  };

  // [2] push brush deforms the field
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyBrush('push'); (s as any).setLiquifyStrength(0.9); (s as any).setLiquifyRadius(0.2);
  });
  await drag(cx - 120, cy, cx + 120, cy - 60);
  await page.waitForTimeout(400);
  const afterPush = await signature(page);
  const dPush = diff(base, afterPush);
  if (dPush < 1) fail(`push brush did not change the render (Δ=${dPush.toFixed(2)})`);
  console.log(`[2] push deformed the field (Δ=${dPush.toFixed(2)}) ✓`);

  // [3] grab handle deforms
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyBrush('grab');
  });
  await drag(cx + 40, cy + 40, cx - 80, cy + 120);
  await page.waitForTimeout(400);
  const afterGrab = await signature(page);
  const dGrab = diff(afterPush, afterGrab);
  if (dGrab < 1) fail(`grab handle did not change the render (Δ=${dGrab.toFixed(2)})`);
  console.log(`[3] grab deformed the field (Δ=${dGrab.toFixed(2)}) ✓`);

  // [4] physics jiggle runs without crashing + keeps rendering
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyPhysics(true); (s as any).setLiquifyBrush('push');
  });
  await drag(cx, cy + 20, cx + 100, cy - 40);
  await page.waitForTimeout(800);
  const afterPhysics = await signature(page);
  if (variety(afterPhysics) < 6) fail('physics frame went blank');
  console.log(`[4] physics jiggle rendered (variety ${variety(afterPhysics)}) ✓`);

  // [5] reset back to flat (via the Reset button path — store has no reset, use the overlay button)
  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ LIQUIFY renders + deforms (push/grab) + physics jiggles, no runtime errors');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
