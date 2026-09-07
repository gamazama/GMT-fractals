/**
 * smoke-ge-tray — the v2 TRAY contract (Phase C, plans/ge-v2-unified-shell-plan.md §4;
 * plans/ge-v2-figma/trays-spec.md §1): ONE surface under the hero card, one face at a time,
 * floating over the wall, Esc closes.
 *
 *   [1] pick a tile — the hero exists, no tray is open, the wall sits at y0
 *   [2] Adjust — the tray opens on the Adjust face, hangs from the card's bottom edge INLINE
 *       WITH THE PANEL (owner, 2026-09-07: not under the image column), and the WALL DOES NOT
 *       MOVE (L6: the tray overlays, never pushes)
 *   [3] Curves — the face switches; still one tray element
 *   [4] Mix — the face is Mix, the next pick is ARMED (the armed hint shows), your gradient
 *       is the ramp's top half and the gradient you mix with is a bar in the tray (owner,
 *       2026-09-07, no A / B language); a second wall click fills that bar and the Mix
 *       face stays open
 *   [5] Esc — the tray closes, the slot disarms, the hero is still there and the wall still
 *       has not moved; the bake RESET the leftover Adjust value set before [4] (it would
 *       apply again on every pass otherwise), and a second Mix on / off leaves every stop
 *       exactly where it was (the seeded fit + the half-texel step edge)
 *   [6] a palette swatch click selects its stop — the tray opens on the INSPECTOR face with
 *       the colour picker in it; Esc closes it
 *
 * Falsified 2026-09-07 three ways, each reverted (and once more after the Mix redesign the
 * same day: [4]'s second click used the wall's PRE-hero box and hit the hero's ramp — it armed
 * the top half and never picked; the step now re-measures the wall and asserts the other bar
 * took the pick, which the old click fails): making `Tray` `relative` instead of
 * `absolute` → [2] red ("not in the 24 px gutter (x=34)" — the relative box picks up the
 * band's padding); dropping `armSlot('B')` from enterMix → [4] red ("did not arm band B");
 * dropping the hero's clearSelection effect → [6] red ("the stop stayed selected") — the
 * first cut of [6] only checked that the face closed and stayed GREEN on that break, which is
 * why [6] also asserts the picker is gone. Dropping `{ bakes: true }` from the shell's
 * leave-Mix `use` → [5] red (first on "the wall moved (383 → 384)": the un-reset Adjust
 * re-opens the 1 px labelled source band and the hero grows, before the phase check itself
 * fires). Wants `npm run dev` on port 3400.
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
      panelLeft: hero && hr ? (hero.querySelector('[data-gx-hero] > div > div:nth-child(2)') as HTMLElement).getBoundingClientRect().x - hr.x : null,
      cardBottom: cr?.bottom ?? null,
      wallY: wall?.getBoundingClientRect().y ?? null,
      armedHint: /Pick a gradient to (mix with|replace)/.test(document.body.innerText),
      bandA: !!hero?.querySelector('[data-gx-mix-band="this"]'),
      bandB: !!tray?.querySelector('[data-gx-mix-band="other"]'),
      thisTitle: hero?.querySelector('[data-gx-mix-band="this"]')?.getAttribute('title') ?? '',
      otherTitle: tray?.querySelector('[data-gx-mix-band="other"]')?.getAttribute('title') ?? '',
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
  // The hero pushed the wall down: re-measure it, or every later "wall click" lands on the
  // hero's ramp instead (that is how the first cut of [4] armed the top half by accident).
  const wallBox = (await wall.boundingBox())!;
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
  if (s.trayLeft !== s.panelLeft! + 20) fail(`[2] the tray is not inline with the panel's flat bottom edge (tray x=${s.trayLeft}, panel x=${s.panelLeft} + 20 radius)`);
  if (s.wallY !== wallY0) fail(`[2] the wall moved when the tray opened (${wallY0} → ${s.wallY}) — the tray must overlay, not push (L6)`);
  console.log('✓ [2] Adjust opens the tray under the card, over the wall');

  await page.click('[data-gx-tray-tab="curves"]');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face !== 'curves' || s.trays !== 1) fail(`[3] Curves did not replace the face (${s.face}, ${s.trays} trays)`);
  console.log('✓ [3] Curves replaces Adjust — still one tray');

  // A leftover Adjust value (as a user who once dragged Phase would have): the bake on
  // leaving Mix must fold it in ONCE and reset it, or it applies again on every pass and
  // the stops walk (measured 2026-09-07: 2 % further right per toggle).
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0.02 }));
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] Mix did not open (${s.face})`);
  if (!s.armedHint) fail('[4] opening Mix did not arm the next pick (no armed hint)');
  if (!s.bandA) fail('[4] the hero ramp has no source half (Mix = your gradient over the result)');
  if (!s.bandB) fail('[4] the Mix face has no bar for the gradient you mix with');
  const otherBefore = s.otherTitle;
  await page.mouse.click(wallBox.x + 24 + 44 * 5, wallBox.y + 14);
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] a wall pick closed the Mix face (${s.face})`);
  if (s.armedHint) fail('[4] the wall pick did not fill the other bar — it is still armed');
  if (s.otherTitle === otherBefore || !/^Mixing with/.test(s.otherTitle)) fail(`[4] the other bar did not take the pick (${s.otherTitle})`);
  if (/Takes the next pick/.test(s.thisTitle)) fail('[4] the pick armed YOUR gradient instead of filling the other bar');
  console.log('✓ [4] Mix arms the next pick, the hero is the blend, a wall pick fills the other bar and Mix stays open');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face) fail(`[5] Escape did not close the tray (${s.face})`);
  if (s.armedHint) fail('[5] Escape closed Mix but left the pick armed');
  if (!s.hero) fail('[5] the hero unmounted');
  if (s.wallY !== wallY0) fail(`[5] the wall moved (${wallY0} → ${s.wallY})`);
  const phase = await page.evaluate(() => (window as any).__store.getState().paletteGenerator.phase);
  if (phase !== 0) fail(`[5] leaving Mix baked the result but left Adjust set (phase ${phase}) — it would apply again next pass`);
  const knotsA = await page.evaluate(() => Array.from(document.querySelector('[title="Double-click to select all"]')!.nextElementSibling!.children).map((k) => (k as HTMLElement).style.left).join(' '));
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const knotsB = await page.evaluate(() => Array.from(document.querySelector('[title="Double-click to select all"]')!.nextElementSibling!.children).map((k) => (k as HTMLElement).style.left).join(' '));
  if (knotsA !== knotsB) fail(`[5] a second Mix on/off moved the stops:
    ${knotsA}
    ${knotsB}`);
  console.log('✓ [5] Escape closes the tray, disarms, resets Adjust; the wall never moved; a second toggle leaves the stops exactly');

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
