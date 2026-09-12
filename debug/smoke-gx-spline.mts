/**
 * Spline EXTEND smoke — a straight path reads as a plain linear ramp.
 *
 * The spline mode gives every pixel an along-path coordinate diffused from every segment, and
 * that projection clamps at the two END points — so a straight path painted a gradient bunched
 * onto the path with the colour falling away on both shoulders, which is not what a straight
 * line should look like (owner, 2026-09-08: "a control to extrapolate the edges of the spline
 * in a fashion so that the ramp can behave like a linear ramp when it's a straight spline").
 *
 * `splineExtend` answers points beyond the ends from the terminal TANGENT instead, and spreads
 * the ramp over the extended span. Asserted on a dead-straight horizontal path occupying the
 * middle third of the frame, sampled down the middle row on a black→white ramp so luminance IS
 * the coordinate:
 *   [1] with Extend OFF the row spans only ~70 of 255 levels and dips repeatedly — NOT a ramp;
 *   [2] with Extend ON it runs 0 → 255 rising the whole way — a plain linear ramp;
 *   [3] omitting the param renders what the DEFAULT renders — which since 2026-09-12 is
 *       Extend 1, not Extend 0. The owner changed `GEOM_DEFAULTS` (Spread 0.15 → 0, Extend
 *       0 → 1) knowing it breaks that bag's "an omitted key reproduces the old picture
 *       exactly" contract for the spline mode alone, because the old defaults made a straight
 *       path read as a stripe with two flat margins rather than a ramp across the frame —
 *       which is the very thing [1] and [2] measure. This step still guards the same
 *       property, that omitting a key and setting it to its default are one picture; only the
 *       number it compares against moved. Before that date it read Extend 0, and a build
 *       carrying the old default now fails it, which is correct.
 *
 * A tolerance absorbs the blue-noise dither tail, which is ±1 LSB.
 *
 * ⚠ Step [5] drives the app's stores through bare-URL dynamic imports, so it is exposed to the
 * Vite dual-instance hazard: on a dev server that has hot-reloaded a store since it started,
 * the smoke edits a copy the app is not rendering and [5] fails with "a knot edit did not reach
 * canvas 0 while split" — which reads as a product bug and was reported as one on 2026-09-12.
 * Stashing does not clear it (the server keeps its module graph). RESTART `npm run dev` before
 * believing a red [5]. @see the longer note in debug/smoke-ge-wallpaper.mts.
 *
 * Run (needs `npm run dev`):  npx tsx debug/smoke-gx-spline.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

/** Dither is ±1 LSB; a step must clear it to count as "rising". */
const DITHER_SLACK = 3;

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const setup = await page.evaluate(async () => {
    const fs = await import('/palette/store/fullscreenStore.ts');
    const ws = await import('/palette/store/workingStore.ts');
    const pe = await import('/palette/store/paletteEditorStore.ts');
    const sp = await import('/gradient-explorer/fullscreen/modes/splineMode.tsx');
    if (typeof (sp as any).setSplinePoints !== 'function') return 'no setSplinePoints seam';
    // A pure black→white ramp: the rendered luminance IS the along-path coordinate.
    (pe as any).usePaletteEditorStore.getState().setConfig({
      colorSpace: 'srgb', blendSpace: 'oklab',
      stops: [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#ffffff' }],
    });
    (ws as any).useWorkingStore.setState({ input: { kind: 'stops' }, name: 'Spline smoke' });
    await new Promise((r) => setTimeout(r, 300));
    const d = (ws as any).deriveWorkingNow();
    (fs as any).openFullscreen(d.config, d.name);
    (fs as any).setFullscreenGeom('spline');
    // Dead straight, horizontal, across the middle third — so there is a real margin either side.
    (sp as any).setSplinePoints([{ x: 0.34, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.66, y: 0.5 }]);
    return 'ok';
  });
  if (setup !== 'ok') fail(setup as string);
  await page.waitForTimeout(1400);

  if (!(await page.locator('[data-testid="fullscreen-gradient-overlay"]').count())) {
    fail('overlay did not open — likely the Vite dual-instance hazard. RESTART `npm run dev`.');
  }

  /** Sample N luminances along the middle row of the live canvas. */
  const rowAt = async (extend: number): Promise<number[]> =>
    page.evaluate(async (e) => {
      const fs = await import('/palette/store/fullscreenStore.ts');
      (fs as any).setFullscreenGeomParams({ splineExtend: e });
      await new Promise((r) => setTimeout(r, 1000));
      const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
      const c = document.createElement('canvas');
      c.width = 48; c.height = 1;
      const cx = c.getContext('2d')!;
      // Take the middle row only: drawImage the source row band down to 48×1.
      cx.drawImage(canvas, 0, Math.floor(canvas.height / 2), canvas.width, 1, 0, 0, 48, 1);
      const d = cx.getImageData(0, 0, 48, 1).data;
      return [...Array(48)].map((_, i) => d[i * 4]);
    }, extend);

  const off = await rowAt(0);
  const on = await rowAt(1);

  // What "reads as a linear ramp" means here, and it is NOT "a ramp across the whole frame":
  // a linear gradient runs between its two stops and CLAMPS to the end colours outside them.
  // The spline mode did not — beyond an end the diffusion washed toward the average of the
  // whole path, so a straight path's margins drifted to mid-grey instead of settling on the
  // terminal colour. Extend carries each end's colour outward along its tangent, which is what
  // the owner asked for twice: "behave like a linear ramp when it's a straight spline", then
  // "repeat the edge color of the gradient in the extended section instead of stretching it".
  //
  // On a black→white ramp over a straight path across the middle third, that means: with Extend
  // up the left margin sits near BLACK and the right near WHITE, and the path between them
  // still carries the whole ramp. With it down, both margins drift toward the middle.
  const leftMargin = (a: number[]): number => a.slice(0, 6).reduce((s2, v) => s2 + v, 0) / 6;
  const rightMargin = (a: number[]): number => a.slice(-6).reduce((s2, v) => s2 + v, 0) / 6;

  // [1] Extend OFF: the margins have drifted off the ramp's ends — the behaviour being fixed.
  if (leftMargin(off) < 40 && rightMargin(off) > 215) {
    fail(`Extend off already clamps to the end colours (left ${leftMargin(off).toFixed(0)}, `
      + `right ${rightMargin(off).toFixed(0)}) — nothing for Extend to fix, so [2] proves nothing. `
      + 'Most likely cause: the straight path never reached the app — this smoke calls '
      + 'setSplinePoints through a bare-URL import, so ANY edit to splineMode.tsx since the dev '
      + 'server started hands it a SECOND module instance and the app keeps rendering its default '
      + 'S-curve. Restart the dev server and re-run before reading this as a regression.');
  }
  console.log(`[1] Extend off: margins drift off the ends (left ${leftMargin(off).toFixed(0)}, right ${rightMargin(off).toFixed(0)}) ✓`);

  // [2] Extend ON: each margin settles ON its end colour, and the path still spans the ramp.
  const l = leftMargin(on), r = rightMargin(on);
  if (l > 45) fail(`Extend on should repeat the ramp's FIRST colour past the start (black≈0, got ${l.toFixed(0)})`);
  if (r < 210) fail(`Extend on should repeat the ramp's LAST colour past the end (white≈255, got ${r.toFixed(0)})`);
  if (r - l < 180) fail(`the path should still carry the whole ramp between the margins (got ${(r - l).toFixed(0)} of 255)`);
  console.log(`[2] Extend on: margins repeat the edge colours (${l.toFixed(0)} … ${r.toFixed(0)}) and the ramp survives between them ✓`);

  // [3] omitting the param renders what its DEFAULT renders — read from GEOM_DEFAULTS rather
  // than written here, so the day the owner moves the default again this step moves with it
  // instead of pinning a number nothing else believes.
  const omitted = await page.evaluate(async () => {
    const fs = await import('/palette/store/fullscreenStore.ts');
    (fs as any).resetFullscreenGeomParams(['splineExtend']);
    await new Promise((r) => setTimeout(r, 1000));
    const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = 48; c.height = 1;
    const cx = c.getContext('2d')!;
    cx.drawImage(canvas, 0, Math.floor(canvas.height / 2), canvas.width, 1, 0, 0, 48, 1);
    const d = cx.getImageData(0, 0, 48, 1).data;
    return [...Array(48)].map((_, i) => d[i * 4]);
  });
  const defExtend = await page.evaluate(async () => {
    const g = await import('/palette/core/rampGeometry.ts');
    return (g as any).GEOM_DEFAULTS.splineExtend as number;
  });
  const atDefault = await rowAt(defExtend);
  let worst = 0;
  for (let i = 0; i < 48; i++) worst = Math.max(worst, Math.abs(omitted[i] - atDefault[i]));
  if (worst > DITHER_SLACK) fail(`omitting splineExtend differs from splineExtend:${defExtend} (its default) by ${worst} levels`);
  console.log(`[3] omitting the param == its default, Extend ${defExtend} (worst Δ${worst}) ✓`);

  // [4] BOTH canvases in the stage agree. The spline editor portals its own live preview OVER
  // the overlay's canvas, so the preview is the picture the user actually looks at — and it
  // used to render with an empty params bag, falling back to this mode's private store. That
  // was invisible until the sliders moved to the geomParams gate, at which point the visible
  // canvas froze while the hidden one moved correctly and the sliders read as dead. Sampling
  // only querySelector(... canvas) — the FIRST, the overlay's — could never have caught it.
  const agree = await page.evaluate(async () => {
    const fs = await import('/palette/store/fullscreenStore.ts');
    (fs as any).setFullscreenGeomParams({ splineExtend: 0.8, splineSpread: 0.7 });
    await new Promise((r) => setTimeout(r, 900));
    const all = [...document.querySelectorAll('[data-testid="fullscreen-gradient-overlay"] canvas')] as HTMLCanvasElement[];
    const rows = all.map((cv) => {
      const c = document.createElement('canvas');
      c.width = 6; c.height = 1;
      const cx = c.getContext('2d')!;
      cx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 6, 1);
      return [...cx.getImageData(0, 0, 6, 1).data].filter((_, i) => i % 4 === 0).join(',');
    });
    return { n: all.length, rows };
  });
  if (agree.n < 2) fail(`expected the editor preview AND the overlay canvas in the stage, found ${agree.n}`);
  if (new Set(agree.rows).size !== 1) {
    fail('the spline editor preview and the overlay canvas disagree — one of them is not being ' +
      `given the live params (${agree.rows.join('  vs  ')})`);
  }
  console.log(`[4] the editor preview and the overlay canvas agree (${agree.n} canvases, one picture) ✓`);

  // [5] a KNOT edit reaches the spline's own preview canvas while SPLIT. This mode is the only
  // one with a second compositor, and that compositor used to resolve colour for itself out of
  // `heroSelection` — the old shell's store, which in the v2 shell is the wall PICK. So editing
  // the gradient did not change the split preview at all, while plain fullscreen looked correct
  // because that branch fell back to the open-time snapshot. Every other mode is immune by
  // construction (they take colour from the ctx the overlay hands them), which is exactly why
  // the owner could see it was "only spline mode ... receiving data differently".
  const knots = await page.evaluate(async () => {
    // No inner named functions here: tsx's keep-names wraps them in a `__name` helper the page
    // does not have, and the evaluate dies with "__name is not defined".
    const fs = await import('/palette/store/fullscreenStore.ts');
    const pe = await import('/palette/store/paletteEditorStore.ts');
    (fs as any).setFullscreenSplit(true);
    await new Promise((r) => setTimeout(r, 1200));
    const c = document.createElement('canvas');
    c.width = 6; c.height = 1;
    const cx = c.getContext('2d')!;
    const before: string[] = [];
    for (const cv of [...document.querySelectorAll('[data-testid="fullscreen-gradient-overlay"] canvas')] as HTMLCanvasElement[]) {
      cx.clearRect(0, 0, 6, 1);
      cx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 6, 1);
      before.push([...cx.getImageData(0, 0, 6, 1).data].filter((_, i) => i % 4 === 0).join(','));
    }
    (pe as any).usePaletteEditorStore.getState().setConfig({
      colorSpace: 'srgb', blendSpace: 'oklab',
      stops: [{ id: 'a', position: 0, color: '#ff0044' }, { id: 'b', position: 0.3, color: '#ffffff' }, { id: 'c', position: 1, color: '#001133' }],
    });
    await new Promise((r) => setTimeout(r, 1600));
    const after: string[] = [];
    for (const cv of [...document.querySelectorAll('[data-testid="fullscreen-gradient-overlay"] canvas')] as HTMLCanvasElement[]) {
      cx.clearRect(0, 0, 6, 1);
      cx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 6, 1);
      after.push([...cx.getImageData(0, 0, 6, 1).data].filter((_, i) => i % 4 === 0).join(','));
    }
    (fs as any).setFullscreenSplit(false);
    return { before, after };
  });
  if (knots.before.length < 2) fail(`expected two canvases in split, found ${knots.before.length}`);
  const stale = knots.before.map((b, i) => b === knots.after[i]);
  if (stale.some(Boolean)) {
    fail(`a knot edit did not reach canvas ${stale.indexOf(true)} while split — that surface is `
      + 'resolving colour for itself instead of using the resolved source the overlay published');
  }
  if (new Set(knots.after).size !== 1) fail(`the two canvases disagree after the edit (${knots.after.join('  vs  ')})`);
  console.log('[5] a knot edit reaches BOTH canvases while split ✓');

  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ ALL PASS — a straight spline reads as a linear ramp when Extend is up');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
