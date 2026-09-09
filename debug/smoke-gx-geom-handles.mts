/**
 * Smoke — the on-screen geometry HANDLES drive the gradient end-to-end in a real browser.
 *
 * Drives the live Gradient Explorer headlessly: opens fullscreen on a colourful gradient,
 * walks the three handled geometries (linear / radial / conic), and for each:
 * asserts the handle layer mounts, drags a handle with real pointer events, and asserts the
 * store param actually changed AND the canvas pixels changed (the param threads through the
 * render ctx). Also checks the toolbar toggle hides the layer and that double-click resets.
 * Works on the compositor's Canvas-2D fallback too (no WebGL2 needed for cpuField modes).
 *
 * Run (needs `npm run dev` — a FRESH server; see the dual-instance note below):
 *   npx tsx debug/smoke-gx-geom-handles.mts
 *
 * ⚠ Vite dual-instance hazard: this smoke drives the store via a bare-URL dynamic import.
 * On a LONG-RUNNING dev server whose store module has been HMR-invalidated (any edit to it
 * since the server started), the app's module graph holds a `?t=`-timestamped instance and
 * the bare import yields a SECOND instance — openFullscreen then mutates a store no React
 * tree subscribes to and the overlay never appears. The smoke detects this and says so;
 * the fix is restarting the dev server (or pointing ENGINE_URL at a fresh one).
 */
import { chromium } from 'playwright';
import { signature, diff } from './helpers/canvas-signature.mts';

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

  // Dual-instance guard: the store said "open" — the overlay must exist, or the page's app
  // is subscribed to a DIFFERENT module instance (stale long-running dev server).
  if (!(await page.locator('[data-testid="fullscreen-gradient-overlay"]').count())) {
    fail('overlay did not open after openFullscreen — likely the Vite dual-instance hazard (HMR-invalidated store on a long-running dev server). RESTART `npm run dev` and re-run.');
  }

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
  const dragHandle = async (name: string, dx: number, dy: number): Promise<void> => {
    // Handles are SVG <g> groups with pointer-events:auto, each stamped `data-gx-handle` with
    // the param it drags. Selecting by NAME rather than by render position: Phase W inserted
    // handles into the middle of the radial and conic lists, which silently re-pointed every
    // index-based case here (the radial one began dragging Waves while asserting on radialCx).
    const g = page.locator(`[data-testid="geometry-handle-layer"] [data-gx-handle="${name}"]`);
    if (!(await g.count())) fail(`handle "${name}" is not on screen`);
    const box = await g.boundingBox();
    if (!box) fail(`handle "${name}" has no bounding box`);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let s = 1; s <= 6; s++) await page.mouse.move(x + (dx * s) / 6, y + (dy * s) / 6);
    await page.mouse.up();
    await page.waitForTimeout(350);
  };

  // [1] per-geometry: layer mounts, a drag writes the param, the render changes. A handle is
  // named by the first param it resets (`data-gx-handle`), so the case says what it grabs.
  const cases: Array<{ geom: string; handle: string; dx: number; dy: number; param: string }> = [
    { geom: 'linear', handle: 'linearBias', dx: 0, dy: 90, param: 'linearBias' },
    { geom: 'radial', handle: 'radialCx', dx: 120, dy: 60, param: 'radialCx' },
    { geom: 'conic', handle: 'conicAngle', dx: 0, dy: -120, param: 'conicAngle' },
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

  // [2] radial: every shape param is reachable from its own handle. (This block was the
  // ARCHED mode's until it was retired 2026-09-08; radial is now the geometry with the most
  // handles, so it is the one worth walking end to end.)
  await setGeom('radial');
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).resetFullscreenGeomParams();
  });
  await page.waitForTimeout(300);
  const radialDrags: Array<{ dx: number; dy: number; param: string }> = [
    { dx: 120, dy: 60, param: 'radialCx' },
    { dx: -60, dy: -40, param: 'radialScale' },
    { dx: 40, dy: 40, param: 'radialBias' },
    { dx: 0, dy: -110, param: 'radialSineAmp' },
  ];
  for (const a of radialDrags) {
    const before = (await getParams())[a.param];
    await dragHandle(a.param, a.dx, a.dy);
    const after = (await getParams())[a.param];
    if (after === undefined || after === before) fail(`radial handle "${a.param}" did not write it`);
    console.log(`[2] radial ${a.param}=${after.toFixed(3)} ✓`);
  }

  // [2b] conic mirror is a discovery: collapsed by default (rotation · mirror · bias · twist ·
  // centre) and pulling the mirror handle off the rotation handle reveals the FALLING-half
  // bias handle. The rising-half bias is present either way since Phase W — it is the whole
  // sweep's bias while the mirror is shut — so the assertion is on the count growing, not on
  // a specific number.
  await setGeom('conic');
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).resetFullscreenGeomParams();
  });
  await page.waitForTimeout(300);
  const gCount = () => page.locator('[data-testid="geometry-handle-layer"] svg g').count();
  const before = await gCount();
  await dragHandle('conicMirror', 0, -90); // orbit the mirror handle off the seam
  const mirror = (await getParams()).conicMirror;
  if (mirror === undefined || mirror <= 0) fail(`conic mirror drag did not open the mirror (conicMirror=${mirror})`);
  const after = await gCount();
  if (after <= before) fail(`pulling the mirror out did not reveal the falling-half bias handle (${before} → ${after})`);
  console.log(`[2b] conic mirror: ${before} → ${after} handles, conicMirror=${mirror.toFixed(3)} ✓`);

  // [2c] Phase W: the two new wallpaper shape controls, each reached by its own handle.
  // Conic TWIST winds the sweep into a log spiral; the radial WAVES handle opens the reach
  // into petals and only THEN does the count handle exist to orbit (it is meaningless at zero
  // amplitude, and the layer says so by not drawing it).
  // Assert the value MOVED, not merely that the key appeared: a drag that emits its grab
  // value still writes `conicTwist: 0` over an unset key, so a "changed from undefined" test
  // passes on a completely dead handle (measured 2026-09-08 — it did).
  await dragHandle('conicTwist', 70, 70);
  const twist = (await getParams()).conicTwist;
  if (twist === undefined || twist === 0) fail(`conic twist drag did not wind the sweep (conicTwist=${twist})`);
  console.log(`[2c] conic twist → conicTwist=${twist.toFixed(3)} ✓`);

  await setGeom('radial');
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).resetFullscreenGeomParams();
  });
  await page.waitForTimeout(300);
  if (await page.locator('[data-testid="geometry-handle-layer"] [data-gx-handle="radialSineFreq"]').count()) {
    fail('the petal COUNT handle is on screen at zero amplitude (it has nothing to count)');
  }
  const wavesBase = await signature(page);
  await dragHandle('radialSineAmp', 0, -110);
  const amp = (await getParams()).radialSineAmp;
  if (amp === undefined || amp === 0) fail(`waves drag did not write radialSineAmp (${amp})`);
  const wavesΔ = diff(wavesBase, await signature(page));
  if (wavesΔ < 0.5) fail(`the petals did not reach the pixels (Δ=${wavesΔ.toFixed(2)})`);
  if (!(await page.locator('[data-testid="geometry-handle-layer"] [data-gx-handle="radialSineFreq"]').count())) {
    fail('the petal COUNT handle did not appear once the waves opened');
  }
  const freqBefore = (await getParams()).radialSineFreq ?? 5;
  // The count handle rides the petal ring at a fixed upper-LEFT bearing, so up-and-right is
  // its tangent — an orbit, not a push toward the centre (a radial push carries no angle).
  await dragHandle('radialSineFreq', 90, -90);
  const freq = (await getParams()).radialSineFreq;
  if (freq === undefined || freq === freqBefore) fail(`count drag did not write radialSineFreq (${freqBefore} -> ${freq})`);
  console.log(`[2c] radial waves -> amp=${amp.toFixed(3)} (render Δ=${wavesΔ.toFixed(2)}), count=${freq.toFixed(2)} OK`);

  // [2d] the count is SOFTLY NOTCHED, not gated to whole petals (owner, 2026-09-08). Asserted
  // on the function itself rather than inferred from where one drag happened to land: it is
  // exactly whole AT a notch, exactly half-way BETWEEN two, never moves backwards, and moves
  // far slower near a notch than between two — which is what makes it a notch and not a ramp.
  const notch = await page.evaluate(async () => {
    const m = await import('/gradient-explorer/fullscreen/GeometryHandleLayer.tsx');
    const f = (m as any).softNotch as (v: number) => number;
    const near = f(5.02) - f(5.0);
    const between = f(5.5) - f(5.48);
    let monotone = true;
    let prev = -Infinity;
    for (let v = 2; v <= 9; v += 0.017) { const o = f(v); if (o < prev - 1e-9) monotone = false; prev = o; }
    return { at5: f(5), at7: f(7), half: f(5.5), near, between, monotone };
  });
  if (Math.abs(notch.at5 - 5) > 1e-9 || Math.abs(notch.at7 - 7) > 1e-9) {
    fail(`softNotch must be exact at a notch (5->${notch.at5}, 7->${notch.at7})`);
  }
  if (Math.abs(notch.half - 5.5) > 1e-9) fail(`softNotch must be exact half-way between notches (5.5->${notch.half})`);
  if (!notch.monotone) fail('softNotch went backwards - the handle would reverse under a steady drag');
  if (!(notch.near < notch.between * 0.5)) {
    fail(`softNotch is not actually notched: ${notch.near.toFixed(4)} near a whole petal vs `
      + `${notch.between.toFixed(4)} between two - the first must be far smaller`);
  }
  console.log(`[2d] the count is softly notched, not gated OK (x${(notch.between / notch.near).toFixed(1)} slower at a whole petal)`);

  // [3] double-click resets the param (unset key = default). Radial's centre was moved in [2];
  // double-clicking its handle clears both of its keys.
  await setGeom('radial');
  const g0 = page.locator('[data-testid="geometry-handle-layer"] [data-gx-handle="radialCx"]');
  await g0.dblclick();
  await page.waitForTimeout(250);
  if ('radialCx' in (await getParams())) fail('double-click did not reset radialCx');
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
