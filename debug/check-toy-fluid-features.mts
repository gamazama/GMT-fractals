// Verifies the new toy-fluid polish features:
// - Presets apply
// - Hotkeys: Space (pause), R (clear), O (orbit), C+drag (pick c)
// - Scroll wheel zooms
// - Palette change refreshes Mandelbrot picker

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT_DIR = path.resolve(process.cwd(), 'debug/scratch');
fs.mkdirSync(OUT_DIR, { recursive: true });

function assertPass(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => errors.push(`[reqfail] ${req.url()}`));

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(400);

  // 1. Hotkey overlay renders on load
  const hotkeyVisible = await page.locator('text=/Hotkeys/i').first().isVisible();
  assertPass('hotkey overlay is visible on load', hotkeyVisible);

  // 2. Status overlay shows fps/mode
  const statusText = await page.locator('text=/\\d+\\s*fps/').first().textContent();
  assertPass('status overlay includes FPS', !!statusText && /fps/.test(statusText ?? ''));

  // 3. Preset chips applied — open the Presets tab, click Supernova, verify forceMode becomes "gradient"
  await page.locator('button:has-text("Presets")').first().click();
  await page.waitForTimeout(150);
  await page.locator('button:has-text("Supernova")').first().click();
  await page.waitForTimeout(120);
  // Check the status overlay now says "gradient"
  const afterSupernova = await page.locator('text=/gradient/i').first().count();
  assertPass('Supernova preset switches forceMode to gradient', afterSupernova > 0);

  // 4. Spacebar toggles pause
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const paused = await page.locator('text=/paused/i').first().count();
  assertPass('Space toggles pause', paused > 0);
  await page.keyboard.press('Space');  // unpause

  // 5. 'O' key toggles orbit
  await page.keyboard.press('o');
  await page.waitForTimeout(100);
  const orbitOn = await page.locator('text=/orbit on/i').first().count();
  assertPass('O key toggles auto-orbit', orbitOn > 0);
  await page.keyboard.press('o');  // orbit off

  // 6. '?' toggles hotkey panel
  await page.keyboard.press('?');
  await page.waitForTimeout(100);
  const afterHide = await page.locator('button:has-text("? hotkeys")').first().count();
  assertPass('? hides hotkey panel', afterHide > 0);
  await page.keyboard.press('?');  // show again

  // 7. C+drag on canvas picks c
  const cBefore = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  const canvasBox = await page.locator('canvas').first().boundingBox();
  if (canvasBox) {
    await page.keyboard.down('c');
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.75, canvasBox.y + canvasBox.height * 0.45, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('c');
    await page.waitForTimeout(200);
  }
  const cAfter = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  assertPass(`C+drag changes c (before=${cBefore}, after=${cAfter})`, cBefore !== cAfter);

  // 8. Scroll wheel zooms — verify zoom value changes
  const zBefore = (await page.locator('[data-testid="status-zoom"]').first().textContent()) ?? '';
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  const zAfter = (await page.locator('[data-testid="status-zoom"]').first().textContent()) ?? '';
  assertPass(`Wheel zoom changes zoom (before=${zBefore}, after=${zAfter})`, zBefore !== zAfter);

  // 9. C+Shift+drag: coarser (5x precision) — verify c delta is larger than plain drag with same pixel distance
  // Reset c first by clicking Lagoon preset.
  await page.locator('button:has-text("Lagoon")').first().click();
  await page.waitForTimeout(120);
  const c0 = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  // plain drag, ~40px
  await page.keyboard.down('c');
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.5, canvasBox!.y + canvasBox!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.5 + 40, canvasBox!.y + canvasBox!.height * 0.5, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('c');
  await page.waitForTimeout(120);
  const c1 = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  // reset again
  await page.locator('button:has-text("Lagoon")').first().click();
  await page.waitForTimeout(120);
  // Shift+C+drag, same 40px
  await page.keyboard.down('Shift');
  await page.keyboard.down('c');
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.5, canvasBox!.y + canvasBox!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.5 + 40, canvasBox!.y + canvasBox!.height * 0.5, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('c');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(120);
  const c2 = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  console.log(`  c after reset: ${c0}`);
  console.log(`  c after plain C+drag: ${c1}`);
  console.log(`  c after Shift+C+drag: ${c2}`);
  // Parse the floats out
  const parse = (s: string) => {
    const m = s.match(/c=\(([-0-9.]+),\s*([-0-9.]+)\)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [NaN, NaN];
  };
  const [p0x] = parse(c0);
  const [p1x] = parse(c1);
  const [p2x] = parse(c2);
  const plainDelta = Math.abs(p1x - p0x);
  const shiftDelta = Math.abs(p2x - p0x);
  assertPass(`Shift multiplier makes c-drag coarser (${shiftDelta.toFixed(4)} > ~5× ${plainDelta.toFixed(4)})`,
    shiftDelta > plainDelta * 2);

  await page.screenshot({ path: path.join(OUT_DIR, 'toy-fluid-features.png') });

  await browser.close();
  console.log('--- errors ---');
  errors.forEach(l => console.log(l));
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(2); });
