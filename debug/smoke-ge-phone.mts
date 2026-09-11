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
 *   [8] desktop 1280×800: the tools are a column at the top-left, the hero keeps its image
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
  await ctx.close();

  // ── desktop: the phone branch did not leak ─────────────────────────────────────────
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(dctx);
  const dpage = await boot(dctx, errors);
  const dwall = (await dpage.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
  await dpage.mouse.click(dwall.x + 160, dwall.y + 30);
  await dpage.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[8] no hero on desktop'));
  await dpage.waitForTimeout(300);
  const d = await boxes(dpage);
  if (!d.tools || d.tools.h <= d.tools.w) fail(`[8] desktop tools are not a column: ${fmt(d.tools)}`);
  if (d.tools.y > d.wall!.y + d.wall!.h / 2) fail(`[8] desktop tools are at the bottom: ${fmt(d.tools)}`);
  const cols = await dpage.evaluate(`(() => { var card = document.querySelector('[data-gx-hero] > div'); return card ? getComputedStyle(card).gridTemplateColumns.split(' ').length : 0; })()`);
  if (cols !== 2) fail(`[8] the desktop hero card has ${cols} grid columns, expected 2 (image column + panel)`);
  console.log('✓ [8] desktop keeps the tool column and the hero\'s image column');
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
