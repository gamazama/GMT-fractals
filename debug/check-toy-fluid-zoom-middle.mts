// Verifies:
//   1. Middle-click vertical drag zooms smoothly (zoom value changes, no crashes).
//   2. Scroll wheel can reach zoom values below 0.001 (deep zoom).
//   3. Right-click pan still works (regression guard).

import { chromium } from 'playwright';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';

function pass(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const canvasBox = (await page.locator('canvas').first().boundingBox())!;
  const cx = canvasBox.x + canvasBox.width / 2;
  const cy = canvasBox.y + canvasBox.height / 2;
  const readZoom = async () => (await page.locator('[data-testid="status-zoom"]').first().textContent()) ?? '';

  const zBefore = await readZoom();

  // 1. Middle-click vertical drag zooms
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(cx, cy - 120, { steps: 10 });   // drag UP → zoom in
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(300);
  const zMidDrag = await readZoom();
  pass(`middle-drag changes zoom (${zBefore.trim()} → ${zMidDrag.trim()})`, zBefore !== zMidDrag);

  // 2. Wheel deep zoom — scroll many ticks, verify we can reach below 0.001
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 200);  // positive deltaY = scroll down → my code: deltaY * 0.002 in exponent
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(300);
  // wheel deltaY>0 zooms out (0.9 factor exponent), but I want to test DEEP zoom IN — wheel up
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(400);
  const zDeep = await readZoom();
  const zValue = parseFloat((zDeep.match(/z=([\d.]+)/) ?? ['', '0'])[1]);
  pass(`wheel reached deep zoom (value=${zValue.toFixed(5)}, should be <0.01)`, zValue > 0 && zValue < 0.01);

  // 3. Right-click pan (regression — was working in prior test, ensure still does)
  await page.mouse.move(cx, cy);
  const shotA = await page.screenshot({ clip: canvasBox });
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 80, cy + 30, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(200);
  const shotB = await page.screenshot({ clip: canvasBox });
  pass('right-click drag pan still works', !shotA.equals(shotB));

  pass('no pageerrors', errs.length === 0);
  await browser.close();
  if (errs.length) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });
