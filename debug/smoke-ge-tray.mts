/**
 * smoke-ge-tray — the v2 TRAY contract (Phase C, plans/ge-v2-unified-shell-plan.md §4;
 * plans/ge-v2-figma/trays-spec.md §1): ONE surface under the hero card, one face at a time,
 * floating over the wall, Esc closes.
 *
 *   [1] pick a tile — the hero exists, no tray is open, the wall sits at y0
 *   [2] Adjust — the tray opens on the Adjust face, hangs from the card's bottom edge inside
 *       the 24 px gutter, and the WALL DOES NOT MOVE (L6: the tray overlays, never pushes)
 *   [3] Curves — the face switches; still one tray element
 *   [4] Mix — the face is Mix, band B is ARMED (the armed hint shows), the source bands
 *       appear over the ramp (the hero is the blend); a second wall click fills B and the
 *       Mix face stays open
 *   [5] Esc — the tray closes, the slot disarms, the hero is still there and the wall still
 *       has not moved
 *   [6] a palette swatch click selects its stop — the tray opens on the INSPECTOR face with
 *       the colour picker in it; Esc closes it
 *
 * Falsified 2026-09-07 three ways, each reverted: making `Tray` `relative` instead of
 * `absolute` → [2] red ("not in the 24 px gutter (x=34)" — the relative box picks up the
 * band's padding); dropping `armSlot('B')` from enterMix → [4] red ("did not arm band B");
 * dropping the hero's clearSelection effect → [6] red ("the stop stayed selected") — the
 * first cut of [6] only checked that the face closed and stayed GREEN on that break, which is
 * why [6] also asserts the picker is gone. Wants `npm run dev` on port 3400.
 *
 * Run: `npm run smoke:ge-tray`.
 */
import { chromium, type Page } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

const state = (page: Page) =>
  page.evaluate(() => {
    const hero = document.querySelector('[data-gx-hero]');
    // the root is always mounted (hidden when no face is open); the face is its data attribute
    const tray = document.querySelector('[data-gx-tray-root]') as HTMLElement | null;
    const wall = document.querySelector('[data-gx-keepselect]');
    const card = hero?.firstElementChild;
    const tr = tray?.getBoundingClientRect();
    const hr = hero?.getBoundingClientRect();
    const cr = card?.getBoundingClientRect();
    return {
      hero: !!hero,
      face: tray?.dataset.gxTray ?? null,
      trays: document.querySelectorAll('[data-gx-tray-root]').length,
      trayTop: tr?.y ?? null,
      trayLeft: tr && hr ? tr.x - hr.x : null,
      cardBottom: cr?.bottom ?? null,
      wallY: wall?.getBoundingClientRect().y ?? null,
      armedHint: /Pick a gradient for Mix band/.test(document.body.innerText),
      bands: hero?.querySelectorAll('[title^="Slot "]').length ?? 0,
      picker: !!tray?.querySelector('input, canvas'),
      text: tray?.innerText.replace(/\s+/g, ' ').slice(0, 120) ?? '',
    };
  });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  console.log(`→ GET ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const wall = page.locator('[data-gx-keepselect] canvas').first();
  await wall.waitFor({ state: 'visible', timeout: 15000 });
  const box = (await wall.boundingBox())!;
  await page.mouse.click(box.x + 24, box.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[1] no hero after a wall click'));
  await page.mouse.move(640, 60);
  let s = await state(page);
  if (s.face) fail(`[1] a tray is open before anyone asked (${s.face})`);
  const wallY0 = s.wallY;
  console.log('✓ [1] the hero exists, no tray open');

  await page.click('[data-gx-tray-tab="adjust"]');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face !== 'adjust') fail(`[2] Adjust did not open the Adjust face (${s.face})`);
  if (s.trays !== 1) fail(`[2] ${s.trays} tray elements — there is ONE tray`);
  if (s.trayTop == null || s.cardBottom == null || Math.abs(s.trayTop - s.cardBottom) > 2) fail(`[2] the tray does not hang from the card (tray ${s.trayTop}, card ${s.cardBottom})`);
  if (s.trayLeft !== 24) fail(`[2] the tray is not in the 24 px gutter (x=${s.trayLeft})`);
  if (s.wallY !== wallY0) fail(`[2] the wall moved when the tray opened (${wallY0} → ${s.wallY}) — the tray must overlay, not push (L6)`);
  console.log('✓ [2] Adjust opens the tray under the card, over the wall');

  await page.click('[data-gx-tray-tab="curves"]');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face !== 'curves' || s.trays !== 1) fail(`[3] Curves did not replace the face (${s.face}, ${s.trays} trays)`);
  console.log('✓ [3] Curves replaces Adjust — still one tray');

  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] Mix did not open (${s.face})`);
  if (!s.armedHint) fail('[4] opening Mix did not arm band B (no armed hint)');
  if (s.bands < 2) fail(`[4] the hero shows ${s.bands} source bands — Mix is A · B over the ramp`);
  await page.mouse.click(box.x + 24 + 44 * 3, box.y + 14);
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] a wall pick for band B closed the Mix face (${s.face})`);
  console.log('✓ [4] Mix arms B, the hero is the blend, a wall pick fills B and Mix stays open');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face) fail(`[5] Escape did not close the tray (${s.face})`);
  if (s.armedHint) fail('[5] Escape closed Mix but left band B armed');
  if (!s.hero) fail('[5] the hero unmounted');
  if (s.wallY !== wallY0) fail(`[5] the wall moved (${wallY0} → ${s.wallY})`);
  console.log('✓ [5] Escape closes the tray and disarms; the wall never moved');

  const swatch = page.locator('[data-gx-hero] [class*="cursor-ew-resize"]').first();
  await swatch.click();
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'inspector') fail(`[6] a swatch click did not open the inspector face (${s.face})`);
  if (!s.picker) fail('[6] the inspector face has no colour picker in it');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face) fail(`[6] Escape did not close the inspector (${s.face})`);
  // The face closing is not enough: the SELECTION must be gone too, or the picker stays
  // portalled into the hidden host and the next swatch click finds a stale inspector.
  if (s.picker) fail('[6] Escape closed the inspector face but the stop stayed selected (the picker is still in the host)');
  console.log('✓ [6] a stop selection opens the inspector face; Escape closes it and clears the selection');

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — one tray, one face at a time, over the wall');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
