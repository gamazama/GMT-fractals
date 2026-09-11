/**
 * Smoke: the v2 shell on a PHONE (Phase F, 2026-09-10).
 *
 * Boots gradient-explorer-next.html in a Pixel 5 context (390×844, touch, coarse pointer)
 * and asserts the phone layout as the owner confirmed it — three sheets' worth of re-flow
 * with no tab bar — then boots a desktop context and asserts the phone branch did NOT leak.
 *
 *   [1] no horizontal overflow: the document is 390 wide and every region's right edge is
 *       inside it (header, set rail, the narrowing bar's Filters button, the pad).
 *   [2] the Filters button is TAPPABLE — the element under its centre is the button itself
 *       (before Phase F the pad's saturation strip lay over it at this width).
 *   [3] a tap on a tile makes the hero, the hero is compact (≤ 240 px) and its use cluster
 *       (Share · Export · Wallpaper) is inside the screen, not clipped off the right.
 *   [4] each tray face — Adjust, Curves, Mix — opens INSIDE the viewport on both axes.
 *   [5] the Export window is a sheet inside the viewport.
 *   [6] the wall's tool cluster sits in the bottom half of the wall, carries NO carving tool
 *       (owner, 2026-09-11: Box / Lasso / Paint are not for a phone) and, at 1:1, exactly
 *       the zoom-in button (− and Fit appear only once zoomed).
 *   [7] a TOUCH drag on a knot moves a stop (the stops editor is pointer-driven now).
 *   [8] the WALLPAPER overlay on a phone (added 2026-09-11): tapping the hero's Wallpaper
 *       button opens an overlay that (a) declares `touch-action: none` on its root and (b)
 *       pins `document.body` to `overflow: hidden` while it is up — together, the two halves
 *       of "the page is scrolling with them"; (c) its export panel arrives COLLAPSED at ≤ 48
 *       px; (d) its mode selector actually scrolls (`scrollWidth > clientWidth`) instead of
 *       running off a 390 px row; (e) the whole overlay is inside 390×844. Then Escape closes
 *       it and the body's overflow comes back to what it was before the overlay opened.
 *   [9] desktop 1280×800: the tools are a column at the top-left, the hero keeps its image
 *       column (grid of two columns) — the phone branch is gated, not global.
 *
 * Falsified 2026-09-10, each reverted:
 *   · `useIsPhone` pinned to `false` (the seam off) → [1] red at once: "filters runs past the
 *     screen: x336 … right 422" — the desktop bar in a 390 px frame.
 *   · `components/AdvancedGradientEditor.tsx` at HEAD (the mouse-only editor) → [7] red
 *     ("found 0 knots" — `data-gx-knot` arrived with the conversion); HEAD plus only the
 *     attribute → [7] red on the drag itself: positions 0.000,0.537,1.000 unchanged after a
 *     60 px touch drag, where the converted editor reads 0.000,0.721,1.000.
 *
 * Falsified 2026-09-11 for [8], each break reverted:
 *   · `touchAction: 'none'` dropped from the overlay root → "the overlay root's touch-action is
 *     'auto', not none".
 *   · the document-lock effect neutered (the two `style.overflow = 'hidden'` writes removed,
 *     the restore left in place) → "document.body overflow is 'clip visible' with the overlay
 *     open, not hidden".
 *   · `ExportPanel`'s `collapsed` seeded `false` → "the export panel is 169 px tall — it should
 *     arrive collapsed (≤ 48)". 169 is what the wrapped desktop bar actually costs at 390 px.
 *   · the mode selector reverted to its pre-2026-09-11 form (no phone branch: `overflow-hidden`,
 *     no width cap, no `shrink-0` on the chips) → "the mode selector's overflow-x is 'hidden'".
 *     NOTE the two selector assertions are not interchangeable and the SECOND is the load-bearing
 *     one: a width-capped `overflow: hidden` run still reports scrollWidth 466 > clientWidth 356
 *     while clipping the last chips out of reach, and that half-broken build passed the
 *     scrollWidth line alone (measured). The scrollWidth line stays because without it a
 *     scroller with nothing in it would pass vacuously.
 *
 * Two things a run can trip over that are not product bugs: the first tap after a touch
 * SWIPE is swallowed by Chromium to stop the fling (so tap, do not swipe, before a control),
 * and page.mouse dispatches mouse events, which `touch-action` ignores — the knot step uses
 * CDP touch events for that reason.
 *
 * Run: `npm run smoke:ge-phone` (needs the Vite dev server; ENGINE_URL overrides :3400).
 */
import { chromium, devices, type Page, type BrowserContext } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const PHONE = { width: 390, height: 844 };

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

type Box = { x: number; y: number; w: number; h: number; r: number; b: number } | null;

/** Bounding boxes of the shell's regions, rounded. A string body: tsx wraps inner named
 *  functions in a `__name` helper that does not exist inside the page. */
const boxes = (page: Page) =>
  page.evaluate(`(() => {
    var q = function (sel) { var el = document.querySelector(sel); if (!el) return null; var b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    return {
      header: q('header'), hero: q('[data-gx-hero]'), rail: q('[data-gx-set-rail]'), wall: q('[data-gx-keepselect]'),
      canvas: q('[data-gx-keepselect] canvas'), tools: q('[data-gx-tools="tools"]'), tray: q('[data-gx-tray-root]'),
      filters: q('[data-gx-filters-trigger]'), pad: q('[data-gx-ground-set] canvas'), exportWin: q('[data-gx-export]'),
      exportBtn: q('[data-gx-hero] [title^="Export"]'), wallpaperBtn: q('[data-gx-hero] [title^="Wallpaper"]'),
      scrollW: document.documentElement.scrollWidth, innerW: innerWidth, innerH: innerHeight,
    };
  })()`) as Promise<Record<string, Box> & { scrollW: number; innerW: number; innerH: number }>;

const inside = (b: Box, w: number, h: number) => !!b && b.x >= 0 && b.y >= 0 && b.r <= w + 1 && b.b <= h + 1;
const fmt = (b: Box) => (b ? `x${b.x} y${b.y} ${b.w}×${b.h} (right ${b.r}, bottom ${b.b})` : 'missing');

/** A one-finger drag through CDP touch events — the only way a headless page sees a real
 *  touch sequence (page.mouse dispatches mouse events, which touch-action ignores). */
const touchDrag = async (ctx: BrowserContext, page: Page, from: [number, number], to: [number, number], steps = 12) => {
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

const boot = async (ctx: BrowserContext, errors: string[]) => {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-gx-keepselect] canvas', { timeout: 20000 });
  await page.waitForTimeout(800);
  return page;
};

async function main() {
  const browser = await chromium.launch();
  const errors: string[] = [];

  // ── phone ──────────────────────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: PHONE });
  await seedGeSmokeState(ctx);
  const page = await boot(ctx, errors);
  const W = PHONE.width, H = PHONE.height;

  // [1] no horizontal overflow
  let b = await boxes(page);
  if (b.scrollW > W) fail(`[1] the document is ${b.scrollW} wide on a ${W} screen`);
  for (const k of ['header', 'rail', 'filters', 'pad'] as const) {
    if (!b[k]) fail(`[1] ${k} is missing`);
    if (b[k]!.r > W + 1 || b[k]!.x < 0) fail(`[1] ${k} runs past the screen: ${fmt(b[k])}`);
  }
  console.log(`✓ [1] nothing runs past ${W} px (header ${b.header!.w}, rail ${b.rail!.w}, pad ${b.pad!.w})`);

  // [2] Filters is tappable — what is under its centre is the button
  const under = await page.evaluate(`(() => {
    var el = document.querySelector('[data-gx-filters-trigger]'); if (!el) return 'missing';
    var r = el.getBoundingClientRect(); var hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit && el.contains(hit) ? 'self' : (hit ? hit.tagName + '.' + String(hit.className).slice(0, 40) : 'nothing');
  })()`);
  if (under !== 'self') fail(`[2] the Filters button is covered — under its centre is ${under}`);
  console.log('✓ [2] the Filters button is tappable');

  // [3] tap a tile → a compact hero with its use cluster on screen
  const wall = (await page.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
  await page.touchscreen.tap(wall.x + 160, wall.y + 30);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[3] no hero after a tile tap'));
  await page.waitForTimeout(400);
  b = await boxes(page);
  if (!b.hero) fail('[3] the hero is missing after the tap');
  if (b.hero!.h > 240) fail(`[3] the hero is ${b.hero!.h} px tall on a phone (limit 240)`);
  if (b.hero!.r > W + 1) fail(`[3] the hero runs past the screen: ${fmt(b.hero)}`);
  for (const k of ['exportBtn', 'wallpaperBtn'] as const) {
    if (!inside(b[k], W, H)) fail(`[3] the hero's ${k} is off screen: ${fmt(b[k])}`);
  }
  console.log(`✓ [3] a tap makes a ${b.hero!.h} px hero with Export and Wallpaper on screen`);

  // [4] each tray face opens inside the viewport
  for (const face of ['adjust', 'curves', 'mix']) {
    await page.locator(`[data-gx-tray-tab="${face}"]`).tap();
    await page.waitForTimeout(500);
    b = await boxes(page);
    if (!b.tray || b.tray.h < 40) fail(`[4] the ${face} face did not open (${fmt(b.tray)})`);
    if (!inside(b.tray, W, H)) fail(`[4] the ${face} face runs out of the viewport: ${fmt(b.tray)}`);
    console.log(`✓ [4] ${face}: ${fmt(b.tray)}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // [5] the Export window is a sheet inside the viewport
  await page.locator('[data-gx-hero] [title^="Export"]').tap();
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[5] the Export window did not open'));
  b = await boxes(page);
  if (!inside(b.exportWin, W, H)) fail(`[5] the Export sheet runs out of the viewport: ${fmt(b.exportWin)}`);
  console.log(`✓ [5] the Export sheet: ${fmt(b.exportWin)}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // [6] the tool cluster: bottom half, no carving tools, zoom-in alone at 1:1
  b = await boxes(page);
  if (!b.tools || !b.wall) fail('[6] no tool cluster / wall');
  if (b.tools!.y < b.wall!.y + b.wall!.h / 2) fail(`[6] the tools sit in the top half of the wall: tools ${fmt(b.tools)} wall ${fmt(b.wall)}`);
  if (!inside(b.tools, W, H)) fail(`[6] the tool cluster is off screen: ${fmt(b.tools)}`);
  const labels = await page.evaluate(`Array.from(document.querySelectorAll('[data-gx-tools="tools"] button')).map(function (b) { return b.getAttribute('aria-label') || b.textContent.trim(); })`) as string[];
  const carving = labels.filter((l) => /box|lasso|paint|rect/i.test(l));
  if (carving.length) fail(`[6] carving tools on a phone: ${carving.join(', ')}`);
  if (labels.join('|') !== 'Zoom in') fail(`[6] at 1:1 the cluster should be the zoom-in button alone, got: ${labels.join(', ') || 'nothing'}`);
  console.log(`✓ [6] the tools at the bottom are just Zoom in at 1:1: ${fmt(b.tools)}`);

  // [7] a touch drag moves a knot
  const knotSel = '[data-gx-hero] [data-gx-knot]';
  const knots = await page.locator(knotSel).count();
  if (knots < 2) fail(`[7] found ${knots} knots in the hero (selector ${knotSel})`);
  const before = await page.evaluate(`(() => window.__gxWorking().config.stops.map(function (s) { return s.position; }))()`) as number[];
  // the second knot: the first is pinned at 0 in many gradients
  const kb = (await page.locator(knotSel).nth(1).boundingBox())!;
  const kx = kb.x + kb.width / 2, ky = kb.y + kb.height / 2;
  await touchDrag(ctx, page, [kx, ky], [kx + 60, ky]);
  await page.waitForTimeout(400);
  const after = await page.evaluate(`(() => window.__gxWorking().config.stops.map(function (s) { return s.position; }))()`) as number[];
  const moved = after.some((p, i) => Math.abs(p - (before[i] ?? p)) > 0.01);
  if (!moved) fail(`[7] a 60 px touch drag moved no stop (before ${before.map((p) => p.toFixed(2)).join(',')} after ${after.map((p) => p.toFixed(2)).join(',')})`);
  console.log('✓ [7] a touch drag moves a knot');

  // [8] the Wallpaper overlay on a phone
  const bodyBefore = (await page.evaluate(`getComputedStyle(document.body).overflow`)) as string;
  // [7] ended in a touch DRAG, and Chromium swallows the first tap after one to stop the fling
  // (see the header) — so the tap gets one retry before it counts as a failure.
  const OVERLAY = '[data-testid="fullscreen-gradient-overlay"]';
  const wallpaperBtn = page.locator('[data-gx-hero] [title^="Wallpaper"]');
  let opened = false;
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    await wallpaperBtn.tap();
    opened = await page.waitForSelector(OVERLAY, { timeout: 4000 }).then(() => true).catch(() => false);
  }
  if (!opened) fail('[8] the Wallpaper overlay did not open');
  await page.waitForTimeout(700);
  const fsv = (await page.evaluate(`(() => {
    var q = function (sel) { var el = document.querySelector(sel); if (!el) return null; var b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    var modes = document.querySelector('[data-gx-fs-modes]');
    var root = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
    return {
      touch: root ? getComputedStyle(root).touchAction : 'no overlay',
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      root: q('[data-testid="fullscreen-gradient-overlay"]'),
      panel: q('[data-testid="fullscreen-export-panel"]'),
      modes: q('[data-gx-fs-modes]'),
      modesScroll: modes ? modes.scrollWidth : 0,
      modesClient: modes ? modes.clientWidth : 0,
      modesOverflowX: modes ? getComputedStyle(modes).overflowX : 'no selector',
    };
  })()`)) as { touch: string; bodyOverflow: string; htmlOverflow: string; root: Box; panel: Box; modes: Box; modesScroll: number; modesClient: number; modesOverflowX: string };
  if (fsv.touch !== 'none') fail(`[8] the overlay root's touch-action is "${fsv.touch}", not none — a touch it ignores scrolls the page under it`);
  if (fsv.bodyOverflow !== 'hidden') fail(`[8] document.body overflow is "${fsv.bodyOverflow}" with the overlay open, not hidden`);
  if (!inside(fsv.root, W, H)) fail(`[8] the overlay is not inside the screen: ${fmt(fsv.root)}`);
  if (!fsv.panel) fail('[8] no export panel in the overlay');
  if (fsv.panel!.h > 48) fail(`[8] the export panel is ${fsv.panel!.h} px tall — it should arrive collapsed (≤ 48)`);
  if (!fsv.modes) fail('[8] no mode selector in the overlay');
  if (!inside(fsv.modes, W, H)) fail(`[8] the mode selector runs past the screen: ${fmt(fsv.modes)}`);
  // BOTH halves, because either one alone passes a half-broken selector: the content has to
  // be wider than the box (else there is nothing to reach) AND the box has to be a scroller
  // (a width-capped `overflow: hidden` still reports scrollWidth > clientWidth while clipping
  // the last chips out of existence — measured 2026-09-11, which is why this line is two).
  if (fsv.modesScroll <= fsv.modesClient) fail(`[8] the mode selector does not scroll: scrollWidth ${fsv.modesScroll} ≤ clientWidth ${fsv.modesClient}`);
  if (!/auto|scroll/.test(fsv.modesOverflowX)) fail(`[8] the mode selector's overflow-x is "${fsv.modesOverflowX}" — the modes past its right edge cannot be reached`);
  console.log(`✓ [8] wallpaper on a phone: touch-action ${fsv.touch}, body ${fsv.bodyOverflow}, export panel ${fsv.panel!.h} px, modes ${fsv.modesOverflowX} ${fsv.modesScroll}/${fsv.modesClient}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const stillThere = await page.evaluate(`document.querySelector('[data-testid="fullscreen-gradient-overlay"]') !== null`);
  if (stillThere) fail('[8] Escape did not close the Wallpaper overlay');
  const bodyAfter = (await page.evaluate(`getComputedStyle(document.body).overflow`)) as string;
  if (bodyAfter !== bodyBefore) fail(`[8] body overflow was not restored on close: was "${bodyBefore}", now "${bodyAfter}"`);
  console.log(`✓ [8] Esc closes it and body overflow goes back to "${bodyAfter}"`);
  await ctx.close();

  // ── desktop: the phone branch did not leak ─────────────────────────────────────────
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(dctx);
  const dpage = await boot(dctx, errors);
  const dwall = (await dpage.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
  await dpage.mouse.click(dwall.x + 160, dwall.y + 30);
  await dpage.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[9] no hero on desktop'));
  await dpage.waitForTimeout(300);
  const d = await boxes(dpage);
  if (!d.tools || d.tools.h <= d.tools.w) fail(`[9] desktop tools are not a column: ${fmt(d.tools)}`);
  if (d.tools.y > d.wall!.y + d.wall!.h / 2) fail(`[9] desktop tools are at the bottom: ${fmt(d.tools)}`);
  const cols = await dpage.evaluate(`(() => { var card = document.querySelector('[data-gx-hero] > div'); return card ? getComputedStyle(card).gridTemplateColumns.split(' ').length : 0; })()`);
  if (cols !== 2) fail(`[9] the desktop hero card has ${cols} grid columns, expected 2 (image column + panel)`);
  console.log('✓ [9] desktop keeps the tool column and the hero\'s image column');
  await dctx.close();

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the shell re-flows for a phone and stays itself on a desktop');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
