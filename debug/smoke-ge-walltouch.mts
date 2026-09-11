/**
 * smoke-ge-walltouch — who owns a finger on the gradient wall (Phase F, 2026-09-10).
 *
 * `PickerWall`'s scroll box declares `touch-action: (selectionTool || zoomTool) ? 'none' :
 * 'pan-y'`, and that one line decides whether a drag belongs to the browser or to the wall.
 * It cannot be checked by reading the DOM alone: a wrong value looks identical until a
 * finger moves, so this drives real touch sequences through CDP and asserts what happened.
 *
 *   [1] a tool armed (Paint, by its aria-label) — the scroll box says `none`, a horizontal
 *       drag paints a carve region into the selection overlay, and the wall does NOT scroll.
 *   [2] the tool off again — the box says `pan-y` and a vertical swipe SCROLLS the wall.
 *
 * The tool half runs FIRST on purpose. A swipe leaves Chromium flinging, and the first tap
 * after a fling is swallowed by the browser to stop it — so a tap on the tool button right
 * after [2]'s swipe silently does nothing and the tool half reds for a reason that has
 * nothing to do with the wall (measured 2026-09-10: tap 1 after a swipe leaves
 * `aria-pressed=false`, tap 2 arms it).
 *
 * It drives the v2 shell because that is the only host with a tool palette a browser can
 * arm; the behaviour under test is the wall's, shared with app-gmt's picker overlay.
 *
 * The context is a DESKTOP layout (1280×800) with touch emulation switched on through CDP
 * AFTER boot: since 2026-09-11 the phone layout offers no carving tool at all (owner), so
 * Paint can only be armed on the desktop tool column — and a touch laptop is exactly a
 * desktop layout with fingers, which is what this then proves. `isDeviceMobile` is seeded
 * at boot and only a resize re-reads it, so enabling touch afterwards leaves the layout.
 *
 * Falsified 2026-09-10, three ways, each reverted:
 *   · pinning the wall's `touchAction` to `'auto'` → [1] red on the declared value
 *   · pinning it to `'none'` → [2] red on the declared value ([1] still passes, which is
 *     the point of having both halves)
 *   · leaving the declaration alone and making `onPointerDown` ignore touch pointers →
 *     [1] red on the BEHAVIOUR ("a finger drag with Paint armed painted nothing"), so the
 *     smoke is not merely reading back a style string.
 *
 * Run: `npx tsx debug/smoke-ge-walltouch.mts` (needs `npm run dev`; ENGINE_URL overrides).
 */
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

/** A one-finger drag through CDP touch events — `page.mouse` dispatches mouse events, which
 *  `touch-action` ignores, so it would prove nothing here. */
const touchDrag = async (ctx: BrowserContext, page: Page, from: [number, number], to: [number, number], steps = 14) => {
  const cdp = await ctx.newCDPSession(page);
  const pt = (x: number, y: number) => ({ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(from[0], from[1])] });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t)] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};

async function run(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-gx-keepselect] canvas', { timeout: 20000 });
  await page.waitForTimeout(900);
  // fingers on a desktop layout (see the header)
  const touch = await ctx.newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });

  /** The wall's scroll box as the browser sees it, plus what the carve overlay is drawing. */
  const read = () => page.evaluate(`(() => {
    var sc = document.querySelector('[data-gx-keepselect] .custom-scroll');
    var ov = document.querySelector('[data-gx-keepselect] svg[style*="z-index: 5"]');
    var pb = document.querySelector('[data-gx-tools="tools"] button[aria-label="Paint"]');
    return { ta: sc ? getComputedStyle(sc).touchAction : 'no scroll box', top: sc ? sc.scrollTop : -1,
             scrollH: sc ? sc.scrollHeight : -1, viewH: sc ? sc.clientHeight : -1,
             armed: pb ? pb.getAttribute('aria-pressed') : 'no Paint tool',
             shapes: ov ? ov.querySelectorAll('rect,polygon').length : 0 };
  })()`) as Promise<{ ta: string; top: number; scrollH: number; viewH: number; armed: string; shapes: number }>;

  const wall = (await page.locator('[data-gx-keepselect]').first().boundingBox())!;
  const cx = Math.round(wall.x + wall.width / 2);
  const paint = page.locator('[data-gx-tools="tools"] button[aria-label="Paint"]');

  // [1] a tool armed: the drag is the tool's
  if (!(await paint.count())) fail('[1] no Paint tool on this ground — the wall’s tool column changed');
  await paint.click();
  await page.waitForTimeout(350);
  const armed = await read();
  if (armed.armed !== 'true') fail(`[1] the Paint tool did not arm (aria-pressed ${armed.armed})`);
  if (armed.ta !== 'none') fail(`[1] with a tool armed the wall says touch-action: ${armed.ta} (wanted none)`);
  const y = Math.round(wall.y + wall.height * 0.45);
  await touchDrag(ctx, page, [Math.round(wall.x + wall.width * 0.3), y], [Math.round(wall.x + wall.width * 0.85), y]);
  await page.waitForTimeout(500);
  let s = await read();
  if (s.shapes === 0) fail('[1] a finger drag with Paint armed painted nothing');
  if (s.top !== armed.top) fail(`[1] the wall scrolled during a tool drag (${armed.top} → ${s.top})`);
  console.log(`✓ [1] a tool drag is the tool’s: ${s.shapes} shapes painted, scrollTop still ${s.top}`);

  // [2] the tool off: the wall is a scroller again. Disarmed with Escape, not with a second
  // tap on the button: a tap that follows a touch gesture is swallowed often enough to make
  // the tap flaky (see the header), and Escape is the shell's own way out of a tool anyway.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  s = await read();
  if (s.armed !== 'false') fail(`[2] Escape did not turn the tool off (aria-pressed ${s.armed})`);
  if (s.ta !== 'pan-y') fail(`[2] with no tool the wall says touch-action: ${s.ta} (wanted pan-y)`);
  if (s.scrollH <= s.viewH) fail('[2] the wall is not taller than its box — nothing to scroll');
  const before = s.top;
  await touchDrag(ctx, page, [cx, Math.round(wall.y + wall.height * 0.75)], [cx, Math.round(wall.y + wall.height * 0.25)]);
  await page.waitForTimeout(500);
  s = await read();
  if (s.top <= before) fail(`[2] a finger swipe left the wall at scrollTop ${s.top} — the browser did not get the gesture`);
  console.log(`✓ [2] no tool: touch-action pan-y, a swipe scrolled the wall ${before} → ${s.top}`);

  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  console.log('PASS — a tool owns the finger, and with no tool the wall scrolls');
}

async function main() {
  const browser = await chromium.launch();
  try {
    await run(browser);
  } finally {
    // A `fail()` throws, and an open browser keeps the process alive — a red would hang
    // instead of exiting, which is how the first cut of this file wasted a falsification run.
    await browser.close();
  }
}

main().catch(() => { process.exitCode = 1; });
