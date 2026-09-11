/**
 * Smoke: the v2 shell on the PHONE FLOOR — a browser a few years old (2026-09-11).
 *
 * The first real-phone test of the shell (owner, 2026-09-11) failed on two devices for two
 * reasons that no modern desktop or Pixel 5 emulation can show, because both engines have
 * every API:
 *   · an iPhone on iOS 15: `CanvasRenderingContext2D.roundRect` does not exist before
 *     Safari 16, the wall called it for every tile, and the error boundary replaced the app;
 *   · a Huawei P20 Pro: `100dvh` is Chrome 108+, the viewport shell had no other height,
 *     and the wall region came out 0 px tall under a header and hero that drew fine.
 *
 * This boots a Pixel 5 context with `roundRect` DELETED from the prototype — the one
 * thing an init script can take away — and asserts the shell still comes up whole:
 *   [1] no page error, and the first wall canvas has painted pixels (not all transparent);
 *   [2] a tap makes the hero, and the selection ring path (also rounded) does not throw;
 *   [3] the viewport shell carries BOTH heights: the `h-screen` class (100vh) and the
 *       inline `100dvh` — the fallback pair `MobileViewportShell` documents. CSS support
 *       cannot be switched off from a script, so this pins the shape of the declaration.
 *
 * Falsified 2026-09-11, each reverted:
 *   · `roundRectPath` calling `ctx.roundRect` unconditionally → [1] red: "no wall canvas at
 *     all" — the draw effect threw, the error boundary replaced the app, and there was no
 *     wall left to sample. That is the iPhone failure, reproduced.
 *   · `h-screen` dropped from the shell's mobile class → [3] red on the class half.
 *
 * Run: `npm run smoke:ge-floor` (needs the Vite dev server; ENGINE_URL overrides :3400).
 */
import { chromium, devices } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: { width: 390, height: 844 } });
  await seedGeSmokeState(ctx);
  // The floor: no roundRect anywhere (Safari < 16, Chrome < 99, Firefox < 112).
  await ctx.addInitScript(() => {
    // @ts-expect-error — deleting a prototype method on purpose
    delete CanvasRenderingContext2D.prototype.roundRect;
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-gx-keepselect] canvas', { timeout: 20000 }).catch(() => fail('[1] no wall canvas at all'));
  await page.waitForTimeout(1200);

  // [1] painted pixels on the first wall canvas
  const painted = await page.evaluate(`(() => {
    var c = document.querySelector('[data-gx-keepselect] canvas'); if (!c) return -1;
    var g = c.getContext('2d'); if (!g) return -2;
    var d = g.getImageData(0, 0, c.width, Math.min(c.height, 64)).data; var n = 0;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  })()`) as number;
  if (errors.length) fail(`[1] the shell threw with roundRect gone: ${errors[0]}`);
  if (painted <= 0) fail(`[1] the wall canvas has no painted pixels (${painted})`);
  const hasRound = await page.evaluate(`typeof CanvasRenderingContext2D.prototype.roundRect`);
  if (hasRound !== 'undefined') fail(`[1] the floor did not take: roundRect is ${hasRound}`);
  console.log(`✓ [1] the wall paints without roundRect (${painted} opaque pixels in the first 64 rows)`);

  // [2] a tap makes the hero; the selection ring draws
  const box = (await page.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
  await page.touchscreen.tap(box.x + 160, box.y + 30);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[2] no hero after a tile tap'));
  await page.waitForTimeout(500);
  if (errors.length) fail(`[2] the pick threw: ${errors[0]}`);
  console.log('✓ [2] a tap makes the hero and the selection ring draws');

  // [3] the viewport shell carries both heights
  const shell = await page.evaluate(`(() => {
    var el = document.querySelector('[data-gx-hero]'); while (el && !/sticky/.test(el.className)) el = el.parentElement;
    return el ? { cls: el.className, inline: el.style.height, h: el.getBoundingClientRect().height } : null;
  })()`) as { cls: string; inline: string; h: number } | null;
  if (!shell) fail('[3] no sticky viewport shell above the hero');
  if (!/\bh-screen\b/.test(shell!.cls)) fail(`[3] the shell has no h-screen fallback class: "${shell!.cls}"`);
  if (shell!.inline !== '100dvh') fail(`[3] the shell's inline height is "${shell!.inline}", expected 100dvh`);
  if (Math.abs(shell!.h - 844) > 2) fail(`[3] the shell is ${shell!.h} px tall in an 844 px viewport`);
  console.log(`✓ [3] the shell is ${shell!.h} px: h-screen class + inline 100dvh`);

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the shell stands on a browser without roundRect, and its height has a fallback');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
