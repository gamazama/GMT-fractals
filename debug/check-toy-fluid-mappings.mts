// Verifies every color-mapping chip renders a distinct image.
// For each chip label, clicks it, screenshots, and confirms the image
// differs from the previous mode's screenshot (no-op chip = fail).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT = path.resolve(process.cwd(), 'debug/scratch');
fs.mkdirSync(OUT, { recursive: true });

function pass(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) process.exitCode = 1;
}

async function differ(a: Buffer, b: Buffer): Promise<boolean> {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

const MAPPING_LABELS = [
  'Iterations', 'Angle', 'Magnitude', 'Decomp', 'Bands',
  'Trap·point', 'Trap·circle', 'Trap·cross', 'Trap·line',
  'Stripe', 'DE', 'Derivative', 'Potential', 'Trap iter',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(500);

  // Pause sim so screenshots are deterministic per mode
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);

  // Open Color tab
  await page.locator('button:has-text("Color")').first().click();
  await page.waitForTimeout(200);

  const canvasBox = (await page.locator('canvas').first().boundingBox())!;
  const shot = () => page.screenshot({ clip: canvasBox });

  let prev: Buffer | null = null;
  let prevLabel = '';
  for (const label of MAPPING_LABELS) {
    const chip = page.locator(`button:has-text("${label}")`).first();
    await chip.click({ timeout: 3000 });
    await page.waitForTimeout(400);
    const cur = await shot();
    fs.writeFileSync(path.join(OUT, `map-${label.replace(/[^\w]+/g, '_').toLowerCase()}.png`), cur);
    if (prev) {
      pass(`${label} image differs from ${prevLabel}`, await differ(prev, cur));
    } else {
      pass(`${label} rendered OK`, cur.length > 1000);
    }
    prev = cur;
    prevLabel = label;
  }

  pass('no pageerrors across all modes', errs.length === 0);

  await browser.close();
  if (errs.length > 0) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });
