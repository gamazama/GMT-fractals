/**
 * capture-ge-trays — reference plates of the v2 hero's five "under the card" states, for
 * the Phase C Figma pass (plans/ge-v2-figma/trays-spec.md). Not a guard: it asserts
 * nothing, it only writes PNGs. 1280×800 at 2×, cropped to the top bar + hero + whatever
 * opens beneath it.
 *
 *   ref-tray-curves.png    Curves expander open
 *   ref-tray-adjust.png    Adjust expander open (Modify + Noise dials)
 *   ref-tray-inspector.png a stop selected → the inspector with the colour picker
 *   ref-tray-mix.png       the Mix source tab (A · crossfade · B bands + the Mix stage row)
 *   ref-tray-image.png     the Image source tab with no image
 *
 * Wants `npm run dev` on 3400. Run: `npx tsx debug/capture-ge-trays.mts`.
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const OUT = 'plans/ge-v2-figma';

const shot = async (page: Page, name: string, height = 560) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 1280, height } });
  console.log(`  wrote ${name}.png`);
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // pick a tile so the hero exists
  const wall = page.locator('[data-gx-keepselect] canvas').first();
  await wall.waitFor({ state: 'visible', timeout: 15000 });
  const box = (await wall.boundingBox())!;
  await page.mouse.click(box.x + 24, box.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 });
  await page.mouse.move(640, 60); // keep the hero awake
  await page.waitForTimeout(500);

  // Curves
  await page.click('[data-gx-hero] button:has-text("Curves")');
  await shot(page, 'ref-tray-curves');
  await page.click('[data-gx-hero] button:has-text("Curves")');

  // Adjust
  await page.click('[data-gx-hero] button:has-text("Adjust")');
  await shot(page, 'ref-tray-adjust');
  await page.click('[data-gx-hero] button:has-text("Adjust")');

  // Inspector: click the first palette swatch → its stop is selected → the picker opens
  const swatch = page.locator('[data-gx-hero] [class*="cursor-ew-resize"]').first();
  await swatch.click();
  await shot(page, 'ref-tray-inspector');
  await page.keyboard.press('Escape');

  // Mix
  await page.click('[data-gx-tray-tab="mix"]');
  await page.mouse.move(640, 60);
  await shot(page, 'ref-tray-mix');

  // Image, empty
  await page.click('[data-gx-tray-tab="image"]');
  await page.mouse.move(640, 60);
  await shot(page, 'ref-tray-image');

  await browser.close();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
