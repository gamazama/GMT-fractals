/**
 * smoke-ge-hero — the v2 hero's L8 contract: **the hero never unmounts once it exists**
 * (plans/ge-v2-unified-shell-plan.md §1 L8, Phase B).
 *
 * Before Phase B, `WorkingHero` returned null whenever the working pipeline produced
 * nothing — so switching to the Image source with no image loaded took the whole hero
 * (name, palette, ramp, the use cluster) off the screen. This smoke is the guard on that:
 *
 *   [1] boot the v2 shell — no hero before the first pick (L9: the screen grows)
 *   [2] click a tile on the wall — the hero appears, with a ramp
 *   [3] switch to the Image source with NO image — the hero is STILL there, the ramp still
 *       paints a gradient (the last one), and the empty source says what is missing
 *   [4] Escape — the hero is still there
 *
 * Falsified 2026-09-06 by re-introducing the old hide (`if (!shown) return null` →
 * `if (emptySource) return null`): step [3] goes red with "the hero unmounted on an empty
 * Image source (L8)". Wants `npm run dev` on port 3400, like every other browser smoke.
 *
 * Run: `npm run smoke:ge-hero`.
 */
import { chromium, type Page } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

/** The hero as the DOM sees it: present, and what its ramp is painting. */
const heroState = async (page: Page) => {
  return page.evaluate(() => {
    const hero = document.querySelector('[data-gx-hero]');
    if (!hero) return { present: false, text: '', gradientPixels: 0 };
    // Every ramp in the hero is either a <canvas> (GradientStrip) or the editor's own
    // strip canvas; a painted one has a non-zero width.
    const canvases = Array.from(hero.querySelectorAll('canvas')) as HTMLCanvasElement[];
    return {
      present: true,
      text: (hero as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 200),
      gradientPixels: canvases.reduce((a, c) => a + c.width, 0),
    };
  });
};

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  console.log(`→ GET ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // [1] no hero before the first pick
  let s = await heroState(page);
  if (s.present) fail('[1] a hero exists before the first pick (L9: the screen grows with the user)');
  console.log('✓ [1] no hero before the first pick');

  // [2] pick a gradient off the wall — the wall is canvas-drawn, so this is a real click
  //     on a tile, not a DOM selector.
  const wall = page.locator('[data-gx-keepselect] canvas').first();
  await wall.waitFor({ state: 'visible', timeout: 15000 });
  const box = await wall.boundingBox();
  if (!box) fail('[2] the wall canvas has no box');
  await page.mouse.click(box!.x + 24, box!.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[2] no hero after a wall click'));
  s = await heroState(page);
  if (s.gradientPixels === 0) fail('[2] the hero has no painted ramp after a wall click');
  console.log(`✓ [2] the hero appeared on the first pick (ramp ${s.gradientPixels}px of canvas)`);

  // [3] the Image source with nothing in it — L8
  await page.click('[data-gx-mode-tab="extract"]');
  await page.waitForTimeout(700);
  s = await heroState(page);
  if (!s.present) fail('[3] the hero unmounted on an empty Image source (L8)');
  if (s.gradientPixels === 0) fail('[3] the hero survived but its ramp went blank (L8: the last gradient stays)');
  if (!/drop one on the slot/i.test(s.text)) fail(`[3] the empty source band does not say what is missing (hero text: ${s.text})`);
  console.log('✓ [3] the hero stayed, the ramp kept the last gradient, the empty source names itself');

  // [4] Escape (the shell's Esc chain) leaves the hero alone
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await heroState(page);
  if (!s.present) fail('[4] Escape unmounted the hero');
  console.log('✓ [4] Escape leaves the hero standing');

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the hero never unmounts (L8)');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
