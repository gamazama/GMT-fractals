// Verifies:
//   1. Right-click TAP on canvas opens the context menu (no drag threshold crossed).
//   2. Right-click DRAG pans the view AND does NOT open the context menu.
//   3. Refraction smoothing knob changes the visual result.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT = path.resolve(process.cwd(), 'debug/scratch');
fs.mkdirSync(OUT, { recursive: true });

function pass(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}
async function differ(a: Buffer, b: Buffer): Promise<boolean> {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
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

  // 1. Right-click tap → menu opens
  await page.mouse.move(cx, cy);
  await page.mouse.click(cx, cy, { button: 'right' });
  await page.waitForTimeout(200);
  const menuVisible = await page.locator('text=Copy c to clipboard').first().isVisible().catch(() => false);
  pass('right-click TAP opens context menu', menuVisible);
  // Dismiss the menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  // 2. Right-click drag → pans, NO menu
  const beforeView = await page.screenshot({ clip: canvasBox });
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 80, cy + 30, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(200);
  const afterView = await page.screenshot({ clip: canvasBox });
  pass('right-click DRAG changes the view (pan happened)', await differ(beforeView, afterView));
  const menuAfterDrag = await page.locator('text=Copy c to clipboard').first().isVisible().catch(() => false);
  pass('right-click DRAG does NOT open the menu', !menuAfterDrag);

  // 3. Refraction smoothing knob changes result.
  // Pick Liquid style (turns on refraction), pause so sim doesn't evolve between shots.
  await page.locator('button:has-text("Presets")').first().click();
  await page.waitForTimeout(150);
  await page.locator('button:has-text("Turbo Orbit")').first().click();
  await page.waitForTimeout(3000);   // let dye build
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Color")').first().click();
  await page.waitForTimeout(150);
  await page.locator('button:has-text("Liquid")').first().click();
  await page.waitForTimeout(400);

  const refSmoothLow = await page.screenshot({ clip: canvasBox });
  fs.writeFileSync(path.join(OUT, 'refsmooth-low.png'), refSmoothLow);

  // Drag the Refract smooth slider far right
  const rsRow = page.locator('text=Refract smooth').first().locator('..');
  const rsBox = await rsRow.boundingBox();
  if (rsBox) {
    await page.mouse.move(rsBox.x + 50, rsBox.y + rsBox.height - 6);
    await page.mouse.down();
    await page.mouse.move(rsBox.x + 250, rsBox.y + rsBox.height - 6, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
  const refSmoothHi = await page.screenshot({ clip: canvasBox });
  fs.writeFileSync(path.join(OUT, 'refsmooth-hi.png'), refSmoothHi);
  pass('Refract smooth slider changes refraction output', await differ(refSmoothLow, refSmoothHi));

  pass('no pageerrors', errs.length === 0);

  await browser.close();
  if (errs.length) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });
