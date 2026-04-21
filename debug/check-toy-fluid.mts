// Headless smoke test for the Julia Fluid toy page.
// - Loads http://localhost:3000/toy-fluid.html in chromium
// - Captures console output, page errors, failed requests
// - Takes a screenshot to debug/scratch/toy-fluid.png
// - Runs sim briefly, then captures a second screenshot to verify it evolves

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT_DIR = path.resolve(process.cwd(), 'debug/scratch');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const logs: string[] = [];
  const errors: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));
  page.on('requestfailed', req => errors.push(`[reqfail] ${req.url()} — ${req.failure()?.errorText ?? ''}`));

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20_000 });

  // Let sim spin a bit
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'toy-fluid-t0.png'), fullPage: false });

  // Nudge the canvas to inject a splat and confirm evolves
  const canvasBox = await page.locator('canvas').first().boundingBox();
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + canvasBox.width / 3, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.55, { steps: 12 });
    await page.mouse.up();
  }

  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'toy-fluid-t1.png'), fullPage: false });

  await browser.close();

  console.log('--- console ---');
  logs.forEach(l => console.log(l));
  console.log('--- errors ---');
  errors.forEach(l => console.log(l));
  console.log(`--- screenshots: ${OUT_DIR} ---`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
})().catch(e => { console.error(e); process.exit(2); });
