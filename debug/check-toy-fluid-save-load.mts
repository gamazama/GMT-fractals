// Round-trip: click a preset → Save JSON → read the downloaded file → load it back →
// verify the stored params match what's on screen.
// Also exercises PNG save + PNG-metadata read-back.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT_DIR = path.resolve(process.cwd(), 'debug/scratch');
const DL_DIR = path.join(OUT_DIR, 'downloads');
fs.mkdirSync(DL_DIR, { recursive: true });

function pass(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(400);

  // Apply a known preset
  // Open the Presets tab to access preset chips + the Save JSON button.
  await page.locator('button:has-text("Presets")').first().click();
  await page.waitForTimeout(150);
  await page.locator('button:has-text("Vortex")').first().click();
  await page.waitForTimeout(250);
  const cBefore = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';

  // ── Save JSON (chip in the Presets tab) ──
  const [dlJson] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button:has-text("Save JSON")').first().click(),
  ]);
  const jsonPath = path.join(DL_DIR, `save-${Date.now()}.json`);
  await dlJson.saveAs(jsonPath);
  const jsonText = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(jsonText);
  pass('Saved JSON has the expected shape', parsed?.params && parsed?.gradient && parsed?.orbit);
  pass('Saved JSON carries Vortex force mode', parsed?.params?.forceMode === 'curl');
  pass('Saved JSON carries Vortex juliaC', Array.isArray(parsed?.params?.juliaC) && parsed.params.juliaC[0] === 0.285);

  // ── Save PNG (icon button in the top bar) ──
  const [dlPng] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button[title*="Save scene"]').first().click(),
  ]);
  const pngPath = path.join(DL_DIR, `save-${Date.now()}.png`);
  await dlPng.saveAs(pngPath);
  const pngBytes = fs.readFileSync(pngPath);
  pass('Saved PNG has the PNG signature', pngBytes[0] === 0x89 && pngBytes[1] === 0x50);
  // Scan for the GmtFluidState keyword in tEXt
  const idxKW = pngBytes.indexOf(Buffer.from('GmtFluidState', 'latin1'));
  pass('Saved PNG contains GmtFluidState metadata keyword', idxKW > 0);

  // ── Load: first pick a different preset so we can detect the load actually took effect ──
  await page.locator('button:has-text("Coral Gyre")').first().click();
  await page.waitForTimeout(250);
  const cAfterCoral Gyre = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  pass('Coral Gyre preset different from Vortex', cAfterCoral Gyre !== cBefore);

  // Load the JSON we saved — should restore Vortex's c
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(jsonPath);
  await page.waitForTimeout(400);
  const cAfterLoad = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  pass(`Load(JSON) restored Vortex c (was "${cAfterCoral Gyre}", now "${cAfterLoad}")`, cAfterLoad === cBefore);

  // Nudge away then load the PNG back
  await page.locator('button:has-text("Coral Gyre")').first().click();
  await page.waitForTimeout(200);
  await fileInput.setInputFiles(pngPath);
  await page.waitForTimeout(400);
  const cAfterPng = (await page.locator('[data-testid="status-c"]').first().textContent()) ?? '';
  pass(`Load(PNG) restored Vortex c via tEXt metadata (now "${cAfterPng}")`, cAfterPng === cBefore);

  await browser.close();
  console.log('--- errors ---');
  errs.forEach(e => console.log(e));
  if (errs.length > 0) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(2); });
