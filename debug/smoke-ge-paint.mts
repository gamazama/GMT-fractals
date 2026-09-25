/**
 * smoke:ge-paint — the Explorer's Paint face, WIRED (the brush maths is `npm run test:palette-paint`).
 * Needs `npm run dev` on 3400 (or ENGINE_URL). Real mouse input, one desktop context.
 *
 *   [1] the Paint tab opens the face from the hero's tab row: the brush takes the bar (no knots, the
 *       paint surface and the before line in their place), the lane and the picker are in the tray,
 *       no pageerror;
 *   [2] a stroke paints the BAR and nothing else — the working gradient and the undo stack are
 *       untouched until it is applied (the painting is local);
 *   [3] Ctrl+Z inside the face takes the stroke back;
 *  [3b] the bar's end gutters take the painted end colours, and Wrap draws the brush's overhang at
 *       the other end (both owner reports, 2026-09-24);
 *   [4] Apply writes the painting as ONE undo entry, and the working gradient becomes a RAMP (no stops);
 *  [4b] and so does a second Apply in the same face, and one Ctrl+Z takes back only the second;
 *   [5] with no strokes left, Ctrl+Z falls through to the app's undo — the gradient comes back and
 *       the face stays open (the stroke undo is scoped, not `when`-gated: grep `resolve` in
 *       engine/plugins/Shortcuts.ts for why that matters) — and Ctrl+Y brings the PAINTING back, so
 *       the entry holds the painted ramp and not only the fold before it;
 *   [6] Esc throws a painting away: the face closes, no entry, the stops and their knots are back;
 *   [7] leaving the face by another tab applies the painting in THAT click's one entry, and one
 *       Ctrl+Z gives back the gradient with the Paint face open;
 *   [8] only Paint shows the colour picker (Clone lays down no colour of its own);
 *   [9] Add stops with Paint open leaves the face, applies the unapplied painting and fits the
 *       stops to it — two entries, the knots on the bar (owner report, 2026-09-25);
 *  [10] a stop action on a gradient with no stops (☰ ▸ Double Stops after Apply) is not greyed: it
 *       asks, and a yes adds the stops and closes Paint (owner, 2026-09-25).
 *
 * Falsified 2026-09-24 five ways, each break reverted after it went red:
 *   S1 leaving Paint without `commitPaint` in the shell's `openTray` → [7] red (0 entries);
 *   S2 Esc on a painting sent down the tab-close route → [6] red (an entry, a ramp);
 *   S3 the stroke undo back to a `when`-gated Mod+Z at priority 20 (the first build) → [5] red;
 *   S4 `commitPaint`'s `paramGroup` removed → GREEN through [4] and [5] (the first Apply's fold is
 *      bracketed by `beginEdit` itself, and redo restores what was current at undo time) → red only
 *      at [4b], the second Apply, which nothing else brackets;
 *   S5 the editor ignoring `stripTakeover` → [1] red;
 *   S6 the right gutter not recoloured from the painting → [3b] red;
 *   S7 no wrapped copy of the brush → [3b] red.
 * And 2026-09-25: S8 Add stops not leaving Paint → [9] red (17 stops added, 0 knots on the bar —
 * the owner's report); S9 `gradientActions`' `offer` never set → [10] red (Double Stops greyed);
 * S10 the row back to `isRamp ? addStopsButton` (no takeover) → [1] red ("still reads a stop count").
 */

import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';
import { encodeShare } from '../gradient-explorer/v2/shareUrl';
import type { GradientConfig } from '../types';

const BASE = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};
const ok = (msg: string) => console.log(`✓ ${msg}`);

const blueToRed: GradientConfig = {
  stops: [
    { id: 'a', position: 0, color: '#1030C0', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: '#C01030', bias: 0.5, interpolation: 'linear' },
  ],
  colorSpace: 'srgb',
  blendSpace: 'oklab',
};

/** Texel `i` of the painting on the bar. */
const texel = (page: Page, i: number) => page.evaluate((k) => {
  const cv = document.querySelector('[data-gx-paint-ramp]') as HTMLCanvasElement | null;
  return cv ? Array.from(cv.getContext('2d')!.getImageData(k, 0, 1, 1).data).slice(0, 3) : null;
}, i);
const far = (a: number[] | null, b: number[] | null) => !a || !b || Math.max(...a.map((v, k) => Math.abs(v - b[k]))) > 12;
const undoDepth = (page: Page) => page.evaluate(() => (window as any).__store.getState().paramUndoStack.length as number);
const working = (page: Page) => page.evaluate(() => {
  const c = (window as any).__gxWorking?.()?.config;
  return c ? { stops: c.stops.length as number, ramp: typeof c.ramp === 'string' } : null;
});
const tray = (page: Page) => page.evaluate(() => {
  const t = document.querySelector('[data-gx-tray-root]') as HTMLElement | null;
  return t && !t.hidden ? t.getAttribute('data-gx-tray') : null;
});
const strokes = (page: Page) => page.evaluate(() => (document.querySelector('[data-gx-paint-count]') as HTMLElement | null)?.innerText.trim() ?? null);
const has = (page: Page, sel: string) => page.evaluate((s) => !!document.querySelector(s), sel);

/** A stroke along the bar from t0 to t1 (0 … 1), with real mouse input. */
const stroke = async (page: Page, t0: number, t1: number) => {
  const bar = await page.locator('[data-gx-paint-surface]').boundingBox();
  if (!bar) fail('no paint surface to stroke on');
  const y = bar!.y + bar!.height * 0.5;
  await page.mouse.move(bar!.x + bar!.width * t0, y);
  await page.mouse.down();
  await page.mouse.move(bar!.x + bar!.width * t1, y, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(120);
};
const openPaint = async (page: Page) => {
  await page.click('[data-gx-tray-tab="paint"]');
  await page.waitForSelector('[data-gx-paint-surface]', { timeout: 4000 }).catch(() => fail('the Paint tab did not put the brush on the bar'));
  await page.waitForTimeout(200);
};

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log(`  pageerror: ${e.message}`); });
  await page.goto(`${BASE}?g=${encodeShare(blueToRed, 'Paint smoke')}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-gx-hero] [data-gx-knot-track]', { timeout: 15000 }).catch(() => fail('no hero after opening the share link'));
  await page.waitForTimeout(500);
  const i = Math.round(0.28 * 256);

  // [1]
  await openPaint(page);
  const knots = await page.evaluate(() => document.querySelectorAll('[data-gx-hero] [data-gx-knot]').length);
  if (knots !== 0) fail(`[1] ${knots} knots still on the bar under the brush`);
  for (const [sel, what] of [['[data-gx-paint-before]', 'the before line'], ['[data-gx-paint-lane]', 'the brush lane'], ['[data-gx-paint-picker]', 'the picker']] as const) {
    if (!(await has(page, sel))) fail(`[1] ${what} is missing`);
  }
  if (errors.length) fail(`[1] pageerror opening Paint: ${errors[0]}`);
  // the row says what the BAR is, not the stops under it (owner, 2026-09-25: "while paint is open after
  // painting, the hero still shows [n] stops"): Add stops in the count's place, no blend chooser
  if (await has(page, '[data-gx-hero] [data-gx-stop-count]')) fail('[1] the row still reads a stop count under the brush');
  if (!(await has(page, '[data-gx-hero] [data-gx-add-stops]'))) fail('[1] the row does not offer Add stops while Paint holds the bar');
  ok('[1] Paint opens: the brush holds the bar, the row offers Add stops, the lane and the picker are in the tray');

  // [2]
  const before = await texel(page, i);
  const depth0 = await undoDepth(page);
  await stroke(page, 0.2, 0.36);
  const painted = await texel(page, i);
  if (!far(before, painted)) fail(`[2] the stroke did not change the bar (${before} → ${painted})`);
  if ((await strokes(page)) !== '1 stroke') fail(`[2] the count reads "${await strokes(page)}"`);
  const w2 = await working(page);
  if (!w2 || w2.stops !== 2 || (await undoDepth(page)) !== depth0) fail(`[2] the stroke reached the working gradient or the undo stack (${JSON.stringify(w2)}, depth ${await undoDepth(page)} vs ${depth0})`);
  ok('[2] a stroke paints the bar and nothing else');

  // [3]
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(120);
  if (far(before, await texel(page, i)) || (await strokes(page)) !== '') fail(`[3] Ctrl+Z did not take the stroke back (${await texel(page, i)}, "${await strokes(page)}")`);
  ok('[3] Ctrl+Z takes a stroke back inside the face');

  // [3b] the END GUTTERS wear the painting's ends (owner, 2026-09-24: "the gradient's two edges
  // aren't updating color when painted"), and Wrap shows the brush at the other end
  const endB = () => page.evaluate(() => (document.querySelector('[data-gx-paint-end="b"]') as HTMLElement | null)?.style.background ?? '');
  const lastTexel = async () => { const t = await texel(page, 255); return t ? `rgb(${t[0]}, ${t[1]}, ${t[2]})` : ''; };
  const endBefore = await endB();
  await stroke(page, 0.9, 1);
  const endAfter = await endB();
  if (endAfter === endBefore || endAfter !== (await lastTexel())) fail(`[3b] the right gutter did not take the painted end (${endBefore} → ${endAfter}, texel 255 ${await lastTexel()})`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(120);
  const inkAtLeft = () => page.evaluate(() => {
    const cv = document.querySelectorAll('[data-gx-paint-surface] canvas')[1] as HTMLCanvasElement;
    const d = cv.getContext('2d')!.getImageData(0, 0, Math.round(cv.width * 0.08), cv.height).data;
    let n = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k] > 40) n++;
    return n;
  });
  const bar3 = (await page.locator('[data-gx-paint-surface]').boundingBox())!;
  const hoverRightEnd = async () => { await page.mouse.move(bar3.x + bar3.width * 0.5, bar3.y + 20); await page.mouse.move(bar3.x + bar3.width - 12, bar3.y + 20); await page.waitForTimeout(100); };
  await hoverRightEnd();
  const inkOff = await inkAtLeft();
  await page.click('[data-gx-paint-row] button[title^="Wrap"]');
  await hoverRightEnd();
  const inkOn = await inkAtLeft();
  await page.click('[data-gx-paint-row] button[title^="Wrap"]');
  if (inkOff !== 0 || inkOn < 20) fail(`[3b] Wrap does not show the brush at the other end (ink at the left: ${inkOff} off, ${inkOn} on)`);
  ok('[3b] the end gutters take the painted ends, and Wrap shows the brush at the other end');

  // [4]
  await stroke(page, 0.2, 0.36);
  await page.click('[data-gx-paint-apply]');
  await page.waitForTimeout(200);
  const w4 = await working(page);
  if ((await undoDepth(page)) !== depth0 + 1) fail(`[4] Apply made ${(await undoDepth(page)) - depth0} undo entries, not one`);
  if (!w4 || w4.stops !== 0 || !w4.ramp) fail(`[4] the working gradient is not a ramp after Apply (${JSON.stringify(w4)})`);
  if (!far(before, await texel(page, i))) fail('[4] the painting did not stay on the bar after Apply');
  ok('[4] Apply writes the painting as one entry, as a ramp');

  // [4b] a SECOND Apply in the same face: the gradient is a stops document now, so nothing but
  // Apply's own group brackets the write — without it this painting would make no entry at all
  const j = Math.round(0.68 * 256);
  const beforeJ = await texel(page, j);
  await stroke(page, 0.6, 0.76);
  await page.click('[data-gx-paint-apply]');
  await page.waitForTimeout(200);
  if ((await undoDepth(page)) !== depth0 + 2) fail(`[4b] a second Apply made ${(await undoDepth(page)) - depth0 - 1} entries, not one`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  const w4b = await working(page);
  if (far(beforeJ, await texel(page, j)) || !w4b || w4b.stops !== 0 || !far(before, await texel(page, i))) fail(`[4b] one Ctrl+Z did not take back the second painting alone (${JSON.stringify(w4b)})`);
  ok('[4b] a second Apply is its own entry, and one Ctrl+Z takes back only it');

  // [5]
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  const w5 = await working(page);
  if (!w5 || w5.stops !== 2) fail(`[5] Ctrl+Z with no strokes did not reach the app's undo (${JSON.stringify(w5)})`);
  if ((await tray(page)) !== 'paint') fail(`[5] the face did not stay open (${await tray(page)})`);
  if (far(before, await texel(page, i))) fail('[5] the bar still shows the painting after the undo');
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(250);
  const w5r = await working(page);
  if (!w5r || w5r.stops !== 0 || !far(before, await texel(page, i))) fail(`[5] Ctrl+Y did not bring the painting back (${JSON.stringify(w5r)}, ${await texel(page, i)})`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  ok('[5] with no strokes, Ctrl+Z is the app\'s undo, the face stays, and Ctrl+Y brings the painting back');

  // [6]
  const depth6 = await undoDepth(page);
  await stroke(page, 0.2, 0.36);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if ((await tray(page)) !== null) fail(`[6] Esc left the face open (${await tray(page)})`);
  const w6 = await working(page);
  if ((await undoDepth(page)) !== depth6 || !w6 || w6.stops !== 2) fail(`[6] Esc wrote something (depth ${await undoDepth(page)} vs ${depth6}, ${JSON.stringify(w6)})`);
  const knots6 = await page.evaluate(() => document.querySelectorAll('[data-gx-hero] [data-gx-knot]').length);
  if (knots6 !== 2) fail(`[6] the knots are not back (${knots6})`);
  ok('[6] Esc throws the painting away: no entry, the stops are back');

  // [7]
  await openPaint(page);
  const depth7 = await undoDepth(page);
  await stroke(page, 0.2, 0.36);
  await page.click('[data-gx-tray-tab="adjust"]');
  await page.waitForTimeout(250);
  const w7 = await working(page);
  if ((await undoDepth(page)) !== depth7 + 1 || !w7 || w7.stops !== 0) fail(`[7] leaving by a tab: ${(await undoDepth(page)) - depth7} entries, ${JSON.stringify(w7)}`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  const w7b = await working(page);
  if (!w7b || w7b.stops !== 2 || (await tray(page)) !== 'paint') fail(`[7] one Ctrl+Z did not give back the gradient with Paint open (${JSON.stringify(w7b)}, ${await tray(page)})`);
  ok('[7] leaving by a tab applies in that click\'s one entry; one Ctrl+Z gives it back with Paint open');

  // [8]
  await page.click('[data-gx-paint-tool="clone"]');
  await page.waitForTimeout(120);
  if (await has(page, '[data-gx-paint-picker]')) fail('[8] Clone shows the colour picker');
  await page.click('[data-gx-paint-tool="paint"]');
  await page.waitForTimeout(120);
  if (!(await has(page, '[data-gx-paint-picker]'))) fail('[8] Paint lost its colour picker');
  ok('[8] only Paint shows the picker');

  // [9] ADD STOPS WITH PAINT OPEN (owner, 2026-09-25: "clicking add-stops when paint is active
  // appears to not work because stops are hidden"). Paint, Apply (a ramp: the row offers Add
  // stops), paint again WITHOUT applying, Add stops: the face goes, the second painting is applied
  // (its own entry) and the stops are fitted to it (another) — the knots show, the bar keeps it.
  await stroke(page, 0.2, 0.36);
  await page.click('[data-gx-paint-apply]');
  await page.waitForTimeout(200);
  const k = Math.round(0.68 * 256);
  await stroke(page, 0.6, 0.76);
  const paintedK = await texel(page, k);
  const depth9 = await undoDepth(page);
  await page.click('[data-gx-hero] [data-gx-add-stops]');
  await page.waitForTimeout(500);
  const w9 = await working(page);
  const knots9 = await page.evaluate(() => document.querySelectorAll('[data-gx-hero] [data-gx-knot]').length);
  if ((await tray(page)) !== null || !w9 || w9.stops < 2 || knots9 < 2) fail(`[9] Add stops left ${await tray(page)} open, ${JSON.stringify(w9)}, ${knots9} knots on the bar`);
  if ((await undoDepth(page)) !== depth9 + 2) fail(`[9] Add stops with a painting made ${(await undoDepth(page)) - depth9} entries, not two (apply, add stops)`);
  const barK = await page.evaluate((t) => {
    const cv = document.querySelector('[data-gx-hero] canvas[data-gx-ramp]') as HTMLCanvasElement;
    return Array.from(cv.getContext('2d')!.getImageData(Math.round(t * cv.width), 0, 1, 1).data).slice(0, 3);
  }, (k + 0.5) / 256);
  if (!paintedK || Math.max(...paintedK.map((v, n) => Math.abs(v - barK[n]))) > 30) fail(`[9] the stops were not fitted to the painting (painted ${paintedK}, bar ${barK})`);
  ok(`[9] Add stops with Paint open applies the painting, fits ${w9!.stops} stops to it and shows them`);

  // [10] A STOP ACTION WITH NO STOPS ASKS (owner, 2026-09-25: "instead of disabling — perhaps they
  // can just come up with a prompt to add stops if there are none"). Paint, Apply (a ramp), then
  // ☰ ▸ Double Stops: it is not greyed, it asks, and a yes adds the stops — and closes Paint.
  await openPaint(page);
  await stroke(page, 0.2, 0.36);
  await page.click('[data-gx-paint-apply]');
  await page.waitForTimeout(200);
  if ((await working(page))?.stops !== 0) fail('[10] setup: Apply did not leave a ramp');
  let asked = '';
  page.once('dialog', (d) => { asked = d.message(); void d.accept(); });
  await page.click('[data-gx-hero] button[title^="Stops menu"]');
  const dbl = page.locator('button:has-text("Double Stops")').first();
  await dbl.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('[10] the ☰ menu has no Double Stops'));
  if (await dbl.isDisabled()) fail('[10] Double Stops is greyed out on a ramp — it should ask');
  await dbl.click();
  await page.waitForTimeout(600);
  const w10 = await working(page);
  if (!asked) fail('[10] Double Stops on a ramp did not ask to add stops');
  if (!w10 || w10.stops < 2 || (await tray(page)) !== null) fail(`[10] yes did not add stops and close Paint (${JSON.stringify(w10)}, ${await tray(page)})`);
  ok(`[10] ☰ ▸ Double Stops on a ramp asks ("${asked}"), and yes adds ${w10!.stops} stops and closes Paint`);

  if (errors.length) fail(`pageerror during the run: ${errors[0]}`);
  await browser.close();
}

run().then(
  () => { if (!process.exitCode) console.log('\nsmoke:ge-paint green'); },
  (e) => { console.log(e?.message ?? e); process.exitCode = 1; },
).finally(() => process.exit(process.exitCode ?? 0));
