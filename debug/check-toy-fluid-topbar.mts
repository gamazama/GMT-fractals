// Verifies:
//   1. TopBar is mounted and shows status (fps + c + zoom)
//   2. Three icon buttons present with tooltips: Save / Screenshot / Load
//   3. Save PNG still works (embeds state)
//   4. Screenshot works (plain PNG download)
//   5. Tab is renamed from "Save" to "Presets"

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT = path.resolve(process.cwd(), 'debug/scratch');
const DL = path.join(OUT, 'downloads');
fs.mkdirSync(DL, { recursive: true });

function pass(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // 1. TopBar exists
  const hasTopBar = await page.locator('[data-testid="top-bar"]').first().isVisible();
  pass('TopBar is visible', hasTopBar);

  // 2. Three icon buttons (by title)
  const saveBtn = await page.locator('button[title*="Save scene"]').first().isVisible().catch(() => false);
  const camBtn = await page.locator('button[title*="Screenshot"]').first().isVisible().catch(() => false);
  const loadBtn = await page.locator('button[title*="Load a saved"]').first().isVisible().catch(() => false);
  pass('Save icon present', saveBtn);
  pass('Screenshot icon present', camBtn);
  pass('Load icon present', loadBtn);

  // 3. Status is in the top bar
  const status = (await page.locator('[data-testid="status-bar"]').first().textContent()) ?? '';
  pass(`Status shows fps in top bar (${status.trim().slice(0, 70)})`, /fps/.test(status));

  // 4. Tab renamed
  const presetsTab = await page.locator('button:has-text("Presets")').first().isVisible();
  const saveTabGone = (await page.locator('button:has-text("Save")').count()) === 0
    || (await page.locator('button:has-text("Save"):not([title*="Save scene"])').count()) === 0;
  pass('"Presets" tab present', presetsTab);
  pass('"Save" tab no longer present (other than top-bar Save icon)', saveTabGone);

  // 5. Save PNG works (download fires) — click the Save icon in the top bar
  const [dlSave] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button[title*="Save scene"]').first().click(),
  ]);
  const savePath = path.join(DL, `tb-save-${Date.now()}.png`);
  await dlSave.saveAs(savePath);
  const saveBytes = fs.readFileSync(savePath);
  // Check it has GmtFluidState metadata
  const hasMetadata = saveBytes.indexOf(Buffer.from('GmtFluidState', 'latin1')) > 0;
  pass('Save icon downloads PNG with embedded state', hasMetadata);

  // 6. Screenshot works — plain PNG, NO metadata
  const [dlShot] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button[title*="Screenshot"]').first().click(),
  ]);
  const shotPath = path.join(DL, `tb-shot-${Date.now()}.png`);
  await dlShot.saveAs(shotPath);
  const shotBytes = fs.readFileSync(shotPath);
  const shotHasMetadata = shotBytes.indexOf(Buffer.from('GmtFluidState', 'latin1')) > 0;
  pass('Screenshot icon downloads PNG without state metadata', !shotHasMetadata);
  pass('Screenshot PNG has PNG signature', shotBytes[0] === 0x89 && shotBytes[1] === 0x50);

  pass('no pageerrors', errs.length === 0);

  await page.screenshot({ path: path.join(OUT, 'topbar-final.png') });
  await browser.close();
  if (errs.length) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });
