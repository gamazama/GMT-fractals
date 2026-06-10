/**
 * Smoke — the on-screen geometry HANDLES drive the gradient end-to-end in a real browser.
 *
 * Drives the live Gradient Explorer headlessly: opens fullscreen on a colourful gradient,
 * walks the four handled geometries (radial / conic / arched / scurve), and for each:
 * asserts the handle layer mounts, drags a handle with real pointer events, and asserts the
 * store param actually changed AND the canvas pixels changed (the param threads through the
 * render ctx). Also checks the toolbar toggle hides the layer and that double-click resets.
 * Works on the compositor's Canvas-2D fallback too (no WebGL2 needed for cpuField modes).
 *
 * Run (needs `npm run dev`):
 *   npx tsx debug/smoke-gx-geom-handles.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function signature(page: import('playwright').Page): Promise<number[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement | null;
    if (!canvas) return [];
    const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
    const c2 = tmp.getContext('2d')!; c2.drawImage(canvas, 0, 0);
    const { data } = c2.getImageData(0, 0, tmp.width, tmp.height);
    const sig: number[] = [];
    const N = 12;
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const x = ((gx + 0.5) / N * tmp.width) | 0, y = ((gy + 0.5) / N * tmp.height) | 0;
      const i = (y * tmp.width + x) * 4;
      sig.push(data[i], data[i + 1], data[i + 2]);
    }
    return sig;
  });
}
const diff = (a: number[], b: number[]): number => {
  if (a.length !== b.length || !a.length) return -1;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 740 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  // First hit on a fresh Vite can trigger a dep-optimize reload mid-evaluate — retry.
  for (let attempt = 0; ; attempt++) {
    try {
      await page.evaluate(async () => {
        const s = await import('/palette/store/fullscreenStore.ts');
        (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
          { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
          { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' } ] }, 'Handles smoke');
      });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      await page.waitForTimeout(3000);
    }
  }
  await page.waitForTimeout(600);

  const getParams = async (): Promise<Record<string, number>> =>
    page.evaluate(async () => {
      const s = await import('/palette/store/fullscreenStore.ts');
      return (s as any).getFullscreenState().geomParams;
    });
  const setGeom = async (id: string): Promise<void> => {
    await page.evaluate(async (g) => {
      const s = await import('/palette/store/fullscreenStore.ts');
      (s as any).setFullscreenGeom(g);
    }, id);
    await page.waitForTimeout(700);
  };
  const layerBox = async () => {
    const el = page.locator('[data-testid="geometry-handle-layer"]');
    if (!(await el.count())) fail('handle layer did not mount');
    return el;
  };
  const dragHandle = async (idx: number, dx: number, dy: number): Promise<void> => {
    // Handles are the SVG <g> groups with pointer-events:auto — grab their hit circles.
    const g = page.locator('[data-testid="geometry-handle-layer"] svg g').nth(idx);
    const box = await g.boundingBox();
    if (!box) fail(`handle #${idx} has no bounding box`);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let s = 1; s <= 6; s++) await page.mouse.move(x + (dx * s) / 6, y + (dy * s) / 6);
    await page.mouse.up();
    await page.waitForTimeout(350);
  };

  // [1] per-geometry: layer mounts, a drag writes the param, the render changes
  const cases: Array<{ geom: string; handle: number; dx: number; dy: number; param: string }> = [
    { geom: 'radial', handle: 0, dx: 120, dy: 60, param: 'radialCx' },
    { geom: 'conic', handle: 0, dx: 0, dy: -120, param: 'conicAngle' },
    { geom: 'arched', handle: 0, dx: 0, dy: 80, param: 'archCy' },
    { geom: 'scurve', handle: 0, dx: 90, dy: 0, param: 'scurveShape' },
  ];
  for (const c of cases) {
    await setGeom(c.geom);
    await layerBox();
    const before = await signature(page);
    if (!before.length) fail(`${c.geom}: canvas missing`);
    const pBefore = (await getParams())[c.param];
    await dragHandle(c.handle, c.dx, c.dy);
    const pAfter = (await getParams())[c.param];
    if (pAfter === undefined || pAfter === pBefore) fail(`${c.geom}: drag did not write ${c.param} (before=${pBefore}, after=${pAfter})`);
    const d = diff(before, await signature(page));
    if (d < 0.5) fail(`${c.geom}: render did not react to ${c.param} (Δ=${d.toFixed(2)})`);
    console.log(`[1] ${c.geom}: drag → ${c.param}=${pAfter.toFixed(3)}, render Δ=${d.toFixed(2)} ✓`);
  }

  // [2] arched: all four params reachable (4 handles present, each writes its key)
  await setGeom('arched');
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).resetFullscreenGeomParams();
  });
  await page.waitForTimeout(300);
  const archDrags: Array<{ idx: number; dx: number; dy: number; param: string }> = [
    { idx: 0, dx: 0, dy: 60, param: 'archCy' },
    { idx: 1, dx: 0, dy: -50, param: 'archR' },
    { idx: 2, dx: 0, dy: -40, param: 'archHalfWidth' },
    { idx: 3, dx: 40, dy: 40, param: 'archSpan' },
  ];
  for (const a of archDrags) {
    const before = (await getParams())[a.param];
    await dragHandle(a.idx, a.dx, a.dy);
    const after = (await getParams())[a.param];
    if (after === undefined || after === before) fail(`arched handle #${a.idx} did not write ${a.param}`);
    console.log(`[2] arched #${a.idx} → ${a.param}=${after.toFixed(3)} ✓`);
  }

  // [3] double-click resets the param (unset key = default)
  const g0 = page.locator('[data-testid="geometry-handle-layer"] svg g').nth(0);
  await g0.dblclick();
  await page.waitForTimeout(250);
  if ('archCy' in (await getParams())) fail('double-click did not reset archCy');
  console.log('[3] double-click reset clears the param ✓');

  // [4] toolbar toggle hides the layer
  await page.getByRole('button', { name: /Handles/ }).click();
  await page.waitForTimeout(250);
  if (await page.locator('[data-testid="geometry-handle-layer"]').count()) fail('toggle did not hide the layer');
  await page.getByRole('button', { name: /Handles/ }).click();
  await page.waitForTimeout(250);
  await layerBox();
  console.log('[4] toolbar toggle hides + shows the layer ✓');

  // [5] export path: PNG is read from the canvas (the DOM handle layer can't be in it) —
  // assert the handle layer is NOT a canvas descendant (sibling DOM above it).
  const layerInsideCanvas = await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="geometry-handle-layer"]');
    return !!layer?.closest('canvas');
  });
  if (layerInsideCanvas) fail('handle layer unexpectedly inside the canvas');
  console.log('[5] handle layer is sibling DOM above the canvas (export-safe) ✓');

  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ ALL PASS — on-screen geometry handles');
  await browser.close();
}

main().catch((e) => fail(String(e)));
