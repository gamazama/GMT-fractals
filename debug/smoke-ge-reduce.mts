/**
 * smoke-ge-reduce — "Reduce stops…" in the Gradient Explorer hero (owner, 2026-09-23), driven with
 * REAL input: the ☰ menu, the popup's named amounts, hover, Apply / Cancel / Escape, Ctrl+Z, and
 * a phone.
 *
 * The gradient arrives through a SHARE LINK (`?g=`, the real entry a person uses), built here with
 * `encodeShare`: sixteen stops along a smooth three-colour gradient, every other one bumped off it
 * by a different amount, blended in RGB with a LINEAR output — so the four amounts give four
 * different answers (16 → 12 / 8 / 4 / 3 on 2026-09-23) and the spaces kept are not the defaults.
 *
 *   [1] the hero reads "16 stops" beside the blend chooser (`data-gx-stop-count`)
 *   [2] ☰ → "Reduce Stops…" opens the popup inside the viewport and BELOW the bar it previews;
 *       it names four amounts and no tolerance, and it fills in (`data-gx-reduce-pending` goes)
 *   [3] HOVERING an amount repaints the bar, shows "16 → N stops", and swaps the knot track for N
 *       inert preview knots; the four hovered counts never rise from one amount to the next, and
 *       at least three of them differ (hover really switches the preview)
 *   [4] leaving the amounts puts the bar back EXACTLY (every pixel of the 1536-px strip)
 *   [5] Cancel after choosing an amount: popup gone, bar and stops exactly as they were
 *   [6] Escape after choosing an amount: the same, and the hero is still there
 *   [7] Apply on Medium: the gradient has the previewed N stops, the readout says so, the blend
 *       and colour spaces are unchanged
 *   [8] ONE Ctrl+Z restores the exact stops (position, colour, bias, interpolation)
 *   [8b] the same on an already-EDITED gradient (Light applied, then Strong: one Ctrl+Z lands
 *       exactly on the Light result) — the case a missing bracket cannot hide behind the bake
 *   [9] a 256-colour RAMP gradient: the menu item is there, disabled, and its title says why
 *   [10] a PHONE (Pixel 5): taps reach the item, the popup sits inside the 390 px viewport, a tap
 *       on an amount previews it (nothing hovers there), Apply reduces
 *
 * Wants `npm run dev` on 3400, like every GE smoke. `SHOTS=<dir>` writes a screenshot per step;
 * `ONLY_DESKTOP=1` / `ONLY_PHONE=1` run half of it. Like every GE smoke it can go red on a page
 * that RELOADS under it ("Execution context was destroyed") while another session's edits
 * hot-reload the dev server — re-run a red that names no step.
 *
 * ── FALSIFIED 2026-09-23 (each reverted) ─────────────────────────────────
 *   editorBarSource without `stopsPreview`                  → [3] "hovering light did not repaint the bar".
 *   Apply as a bare `emitChange` (no `editAction`)          → GREEN on [8]: a fresh pick's first edit is
 *     the bake, which brackets itself and swallowed the missing bracket. [8b] exists for that and
 *     reds: "16 stops, Light had 12".
 *   the preview left on the bar at close (both clears)      → [5] "Cancel did not restore the bar exactly".
 *   `dismissOnEscape={false}`                               → [6] "Escape left the popup open".
 *   popup `w-[420px]` with no max width                     → [10] "not inside the phone viewport".
 *   the `data-gx-stop-count` readout gone                   → [1].
 *   the popup not passing `onPreview` to Segmented          → [3] "hovering light shows "16 stops"".
 *   real knots kept on the track during a preview           → [3] "12 preview knots and 16 real ones".
 *   gradientActions' ramp reason dropped                    → [9] the title check (the item stays
 *     disabled through the two-stop reason: a ramp has no knots).
 *   the popup anchored above the knot track                 → [2] "covers the bar it previews". GE v2's
 *     ☰ sits below the bar, so only a break reds it here; app-gmt's full-chrome ☰ sits ABOVE the
 *     strip and is where the anchor rule matters. That case has no committed guard (no smoke opens
 *     app-gmt's panels); it was checked by hand on 2026-09-23 (popup top 317, track bottom 311).
 */
import { chromium, devices, type Page, type BrowserContext } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';
import { encodeShare } from '../gradient-explorer/v2/shareUrl';
import { sampleStops } from '../utils/colorUtils';
import { makeRampGradient } from '../utils/gradientRamp';
import type { GradientConfig, GradientStop } from '../types';

const BASE = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const SHOTS = process.env.SHOTS || '';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};
const ok = (msg: string) => console.log(`✓ ${msg}`);

// Sixteen stops along a smooth dark-blue → amber → cream gradient, every other one bumped off it.
const spine: GradientStop[] = [
  { id: 'a', position: 0, color: '#1B2A6B', bias: 0.5, interpolation: 'linear' },
  { id: 'b', position: 0.55, color: '#E0A030', bias: 0.5, interpolation: 'linear' },
  { id: 'c', position: 1, color: '#F5F0E0', bias: 0.5, interpolation: 'linear' },
];
const hex = (c: { r: number; g: number; b: number }) => '#' + [c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const BUMPS = [0, 4, 0, 9, 0, 16, 0, 30, 0, 6, 0, 12, 0, 22, 0, 0];
const N = BUMPS.length;
const bumpy: GradientConfig = {
  stops: BUMPS.map((b, i) => {
    const c = sampleStops(spine, i / (N - 1), 'oklab');
    return { id: `t${i}`, position: i / (N - 1), color: hex({ r: c.r + b, g: c.g + b, b: c.b - b }), bias: 0.5, interpolation: 'linear' as const };
  }),
  colorSpace: 'linear',
  blendSpace: 'rgb',
};
const rampCfg = makeRampGradient(Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 250, g: 200, b: 40 } : { r: 20, g: 30, b: 90 })));

const linkFor = (cfg: GradientConfig, name: string) => `${BASE}?g=${encodeShare(cfg, name)}`;

/** The hero's working gradient, as the shell's own debug handle reports it. */
const working = (page: Page) => page.evaluate(() => {
  const w = (window as any).__gxWorking?.();
  const c = w?.config;
  return c ? { stops: (c.stops as GradientStop[]).map((s) => ({ position: s.position, color: s.color.toUpperCase(), bias: s.bias ?? 0.5, interpolation: s.interpolation ?? 'linear' })), blendSpace: c.blendSpace, colorSpace: c.colorSpace } : null;
});
/** Every pixel of the result bar (`data-gx-ramp`, 1536 × 1). */
const barPixels = (page: Page) => page.evaluate(() => {
  const cv = document.querySelector('[data-gx-hero] canvas[data-gx-ramp]') as HTMLCanvasElement | null;
  if (!cv) return '';
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, 1).data;
  return Array.from(d).join(',');
});
const text = (page: Page, sel: string) => page.evaluate((s) => (document.querySelector(s) as HTMLElement | null)?.innerText.trim() ?? null, sel);
const count = (page: Page, sel: string) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const shot = async (page: Page, name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

const boot = async (ctx: BrowserContext, cfg: GradientConfig, name: string): Promise<Page> => {
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log(`  pageerror: ${e.message}`); });
  (page as any).__errors = errors;
  await page.goto(linkFor(cfg, name), { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-gx-hero] [data-gx-knot-track]', { timeout: 15000 }).catch(() => fail(`no hero after opening the share link for "${name}"`));
  await page.waitForTimeout(600);
  return page;
};

const MENU = '[data-gx-hero] button[title^="Stops menu"]';
const ITEM = 'button:has-text("Reduce Stops…")';
const POPUP = '[data-gx-reduce]';

const openPopup = async (page: Page, tap = false) => {
  if (tap) await page.tap(MENU); else await page.click(MENU);
  const item = page.locator(ITEM);
  await item.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('the ☰ menu has no "Reduce Stops…" item'));
  if (tap) await item.tap(); else await item.click();
  await page.waitForSelector(POPUP, { timeout: 4000 }).catch(() => fail('"Reduce Stops…" opened no popup'));
  await page.waitForFunction(() => {
    const p = document.querySelector('[data-gx-reduce]');
    return !!p && !p.hasAttribute('data-gx-reduce-pending') && getComputedStyle(p.parentElement!).opacity === '1';
  }, undefined, { timeout: 8000 }).catch(() => fail('the popup never finished working out its amounts'));
};
const seg = (id: string) => `${POPUP} [data-seg="${id}"]`;
const AMOUNTS = ['light', 'medium', 'strong', 'max'];

async function desktop(browser: import('playwright').Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(ctx);
  const page = await boot(ctx, bumpy, 'Reduce smoke');

  // [1]
  const readout = await text(page, '[data-gx-hero] [data-gx-stop-count]');
  if (readout !== `${N} stops`) fail(`[1] the stop count reads "${readout}", expected "${N} stops"`);
  ok(`[1] the hero reads "${N} stops"`);

  const before = await working(page);
  if (!before || before.stops.length !== N || before.blendSpace !== 'rgb' || before.colorSpace !== 'linear') fail(`[1] setup: the share link did not open as ${N} rgb / linear stops (${JSON.stringify(before && { n: before.stops.length, b: before.blendSpace, c: before.colorSpace })})`);
  const barBefore = await barPixels(page);

  // [2]
  await openPopup(page);
  await shot(page, '2-open');
  const box = await page.locator(POPUP).boundingBox();
  if (!box || box.x < 0 || box.y < 0 || box.x + box.width > 1280 || box.y + box.height > 800) fail(`[2] the popup is not inside the viewport (${JSON.stringify(box)})`);
  const bar = await page.locator('[data-gx-hero] canvas[data-gx-ramp]').boundingBox();
  if (!bar || box!.y < bar.y + bar.height) fail(`[2] the popup covers the bar it previews (popup top ${box!.y}, bar bottom ${bar && bar.y + bar.height})`);
  const names = await page.$$eval(`${POPUP} [data-seg]`, (bs) => bs.map((b) => (b as HTMLElement).innerText.trim()));
  if (names.join('|') !== 'Light|Medium|Strong|Maximum') fail(`[2] the amounts are "${names.join('|')}"`);
  const popupText = await text(page, POPUP);
  if (/Δ|delta|tolerance|\d\.\d/i.test(popupText ?? '')) fail(`[2] the popup states a number other than stop counts: "${popupText}"`);
  if ((await text(page, `${POPUP} [data-gx-reduce-count]`)) !== `${N} stops`) fail(`[2] the readout does not start at "${N} stops"`);
  ok(`[2] the popup opens inside the viewport with ${names.join(' · ')} and no claims`);

  // [3] hover each amount
  const hovered: number[] = [];
  for (const id of AMOUNTS) {
    if (await page.locator(seg(id)).isDisabled()) { hovered.push(N); continue; }
    await page.hover(seg(id));
    await page.waitForTimeout(150);
    const line = await text(page, `${POPUP} [data-gx-reduce-count]`);
    const m = new RegExp(`^${N} → (\\d+) stops$`).exec(line ?? '');
    if (!m) fail(`[3] hovering ${id} shows "${line}", expected "${N} → n stops"`);
    const n = Number(m![1]);
    if (!(n < N)) fail(`[3] ${id} is enabled but does not reduce (${n})`);
    if ((await barPixels(page)) === barBefore) {
      await shot(page, `3-fail-${id}`);
      const dbg = await page.evaluate(() => ({ seg: Array.from(document.querySelectorAll('[data-gx-reduce] [data-seg]')).map((b) => `${(b as HTMLElement).dataset.seg}:${b.getAttribute('aria-pressed')}:${(b as HTMLButtonElement).disabled}`), pk: document.querySelectorAll('[data-gx-knot-preview]').length }));
      fail(`[3] hovering ${id} did not repaint the bar ${JSON.stringify(dbg)} line=${line}`);
    }
    const pk = await count(page, '[data-gx-hero] [data-gx-knot-preview]');
    const rk = await count(page, '[data-gx-hero] [data-gx-knot]');
    if (pk !== n || rk !== 0) fail(`[3] hovering ${id}: ${pk} preview knots and ${rk} real ones, expected ${n} and 0`);
    hovered.push(n);
    if (id === 'medium') await shot(page, '3-hover-medium');
  }
  for (let i = 1; i < hovered.length; i++) if (hovered[i] > hovered[i - 1]) fail(`[3] the counts rise: ${hovered.join(' → ')}`);
  if (hovered[1] >= N) fail('[3] Medium removes nothing');
  if (new Set(hovered).size < 3) fail(`[3] the amounts barely differ (${hovered.join(' / ')}) — hover is not switching the preview`);
  ok(`[3] hover previews the bar and the knots: ${N} → ${hovered.join(' / ')}`);

  // [4] leave the amounts
  await page.hover(`${POPUP} >> text=Reduce stops`);
  await page.waitForTimeout(150);
  if ((await barPixels(page)) !== barBefore) fail('[4] leaving the amounts did not put the bar back exactly');
  if ((await count(page, '[data-gx-hero] [data-gx-knot]')) !== N) fail('[4] the real knots did not come back');
  ok('[4] leaving the amounts restores the bar pixel for pixel');

  // [5] Cancel
  await page.click(seg('strong'));
  await page.mouse.move(640, 700);
  await page.waitForTimeout(150);
  if ((await barPixels(page)) === barBefore) fail('[5] setup: a chosen amount does not stay on the bar');
  await page.click(`${POPUP} [data-gx-reduce-cancel]`);
  await page.waitForTimeout(300);
  if (await count(page, POPUP)) fail('[5] Cancel left the popup open');
  if ((await barPixels(page)) !== barBefore) fail('[5] Cancel did not restore the bar exactly');
  if (JSON.stringify(await working(page)) !== JSON.stringify(before)) fail('[5] Cancel changed the gradient');
  ok('[5] Cancel after choosing: popup gone, bar and stops exactly as before');

  // [6] Escape
  await openPopup(page);
  await page.click(seg('max'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  if (await count(page, POPUP)) fail('[6] Escape left the popup open');
  if (!(await count(page, '[data-gx-hero]'))) fail('[6] Escape took the hero with it');
  if ((await barPixels(page)) !== barBefore) fail('[6] Escape did not restore the bar exactly');
  if (JSON.stringify(await working(page)) !== JSON.stringify(before)) fail('[6] Escape changed the gradient');
  ok('[6] Escape after choosing: popup gone, nothing changed');

  // [7] Apply Medium
  await openPopup(page);
  await page.click(seg('medium'));
  const line7 = await text(page, `${POPUP} [data-gx-reduce-count]`);
  const n7 = Number(/→ (\d+)/.exec(line7 ?? '')?.[1]);
  await page.click(`${POPUP} [data-gx-reduce-apply]`);
  await page.waitForTimeout(700);
  await shot(page, '7-applied');
  if (await count(page, POPUP)) fail('[7] Apply left the popup open');
  const after = await working(page);
  if (!after || after.stops.length !== n7) fail(`[7] Apply left ${after?.stops.length} stops, the preview said ${n7}`);
  if (after!.blendSpace !== before!.blendSpace || after!.colorSpace !== before!.colorSpace) fail(`[7] Apply changed the spaces (${after!.blendSpace}/${after!.colorSpace})`);
  if ((await text(page, '[data-gx-hero] [data-gx-stop-count]')) !== `${n7} stops`) fail('[7] the stop count did not follow');
  if ((await count(page, '[data-gx-hero] [data-gx-knot]')) !== n7) fail('[7] the knot track does not show the new stops');
  ok(`[7] Apply: ${N} → ${n7} stops, spaces kept (${after!.blendSpace} / ${after!.colorSpace}), the readout follows`);

  // [8] one Ctrl+Z
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const undone = await working(page);
  if (JSON.stringify(undone) !== JSON.stringify(before)) fail(`[8] one Ctrl+Z did not restore the exact stops (${undone?.stops.length} stops)`);
  if ((await text(page, '[data-gx-hero] [data-gx-stop-count]')) !== `${N} stops`) fail(`[8] the readout did not come back to ${N}`);
  ok(`[8] one Ctrl+Z restores the exact ${N} stops`);

  // [8b] the same on an EDITED gradient. On a fresh pick the first edit's bake brackets itself,
  // which would hide a Reduce that forgot its own bracket (measured: it did); after one Apply the
  // stops are the document, so only Reduce's own undo step can hold the second.
  await openPopup(page);
  await page.click(seg('light'));
  await page.click(`${POPUP} [data-gx-reduce-apply]`);
  await page.waitForTimeout(700);
  const light = await working(page);
  await openPopup(page);
  await page.click(seg('strong'));
  await page.click(`${POPUP} [data-gx-reduce-apply]`);
  await page.waitForTimeout(700);
  const strong = await working(page);
  if (!light || !strong || !(strong.stops.length < light.stops.length)) fail(`[8b] setup: Strong after Light did not reduce (${light?.stops.length} → ${strong?.stops.length})`);
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  if (JSON.stringify(await working(page)) !== JSON.stringify(light)) fail(`[8b] on an edited gradient one Ctrl+Z did not land exactly on the Light result (${(await working(page))?.stops.length} stops, Light had ${light!.stops.length})`);
  ok(`[8b] on an edited gradient too: ${light!.stops.length} → ${strong!.stops.length} stops, one Ctrl+Z back to exactly ${light!.stops.length}`);

  if ((page as any).__errors.length) fail(`page errors: ${(page as any).__errors.join(' | ')}`);
  await page.close();

  // [9] a ramp gradient
  const rp = await boot(ctx, rampCfg, 'Reduce ramp');
  await rp.click(MENU);
  const item = rp.locator(ITEM);
  await item.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('[9] a ramp gradient\'s menu has no "Reduce Stops…" item'));
  if (!(await item.isDisabled())) fail('[9] "Reduce Stops…" is enabled on a ramp gradient');
  const why = await item.getAttribute('title');
  if (!/ramp/i.test(why ?? '') || !/Add Stops/.test(why ?? '')) fail(`[9] the disabled item's title does not say why: "${why}"`);
  if (await count(rp, '[data-gx-hero] [data-gx-stop-count]')) fail('[9] a ramp shows a stop count');
  ok(`[9] a ramp: the item is disabled — "${why}"`);
  await ctx.close();
}

async function phone(browser: import('playwright').Browser) {
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: { width: 390, height: 844 } });
  await seedGeSmokeState(ctx);
  const page = await boot(ctx, bumpy, 'Reduce phone');
  await openPopup(page, true);
  await shot(page, '10-phone-open');
  const box = await page.locator(POPUP).boundingBox();
  if (!box || box.x < 0 || box.x + box.width > 390 || box.y < 0 || box.y + box.height > 844) fail(`[10] the popup is not inside the phone viewport (${JSON.stringify(box)})`);
  const bar = await page.locator('[data-gx-hero] canvas[data-gx-ramp]').boundingBox();
  if (!bar || box!.y < bar.y + bar.height) fail(`[10] the popup covers the bar it previews (popup top ${box!.y}, bar bottom ${bar && bar.y + bar.height})`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > 390) fail(`[10] the page scrolls sideways (${wide} px)`);
  const barBefore = await barPixels(page);
  await page.tap(seg('strong'));
  await page.waitForTimeout(200);
  const line = await text(page, `${POPUP} [data-gx-reduce-count]`);
  if (line === null) await shot(page, '10-fail');
  const n = Number(new RegExp(`^${N} → (\\d+) stops$`).exec(line ?? '')?.[1]);
  if (!(n < N)) fail(`[10] a tap on Strong shows "${line}"`);
  if ((await barPixels(page)) === barBefore) fail('[10] a tap on Strong did not preview it on the bar');
  await shot(page, '10-phone-strong');
  await page.tap(`${POPUP} [data-gx-reduce-apply]`);
  await page.waitForTimeout(700);
  const after = await working(page);
  if (after?.stops.length !== n) fail(`[10] Apply on the phone left ${after?.stops.length} stops, the preview said ${n}`);
  if ((page as any).__errors.length) fail(`[10] page errors: ${(page as any).__errors.join(' | ')}`);
  ok(`[10] phone: popup inside 390 px, a tap previews (${N} → ${n}), Apply reduces`);
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch();
  try {
    if (!process.env.ONLY_PHONE) await desktop(browser);
    if (!process.env.ONLY_DESKTOP) await phone(browser);
    console.log('\nsmoke-ge-reduce: all green');
  } catch (e) {
    if (!process.exitCode) { console.log(`✗ ${(e as Error).message}`); process.exitCode = 1; }
  } finally {
    await browser.close();
  }
}
main();
