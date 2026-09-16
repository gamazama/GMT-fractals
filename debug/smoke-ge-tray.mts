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
 *   [7] C.3 — closing Adjust with a dial turned BAKES it (dial reset, chip "editing · return
 *       to source"); the chip click cancels the bake (the dial is live again)
 *   [8] C.3 — the "live from Mix · cancel" chip closes Mix without baking; the gradient from
 *       before Mix is back
 *   [9] C.9 — a click on the split ramp's RESULT half bakes the face
 *   [10] C.9 — a click on the SOURCE half cancels it
 *   [12] a colour dragged out of the picker lights every knot dashed and lands on the ramp
 *   [11] a picker MODE toggled off and on again comes back PAINTED (a remounted canvas has a
 *       blank backing store; the draw effect must key on the remount, not on the colour)
 *   [6] a palette swatch click selects its stop — the tray opens on the INSPECTOR face with
 *       the colour picker in it; Esc closes it
 *   [13] and a click on the WALL closes it too, clearing the stop with it — Esc used to be
 *       the only way out (owner, 2026-09-09)
 *   [14] one click leaves the picker for Mix / Curves / Adjust
 *   [15] the Adjust face (owner, 2026-09-13): a text Reseed; Cancel discards the three bins in
 *       one undo step; Apply bakes the adjusted result into the stops, resets the dials and one
 *       Ctrl+Z restores both; nothing leaves its panel at 1024 / 900 / 800 px
 *   [16] the WALLPAPER owns the keyboard (2026-09-13): with a stop selected on the hero and a
 *       point selected in Spline, Delete removes the point and NOT the stop underneath
 *   [17] a stop selection belongs to its gradient (2026-09-16): undoing the stop's own edits
 *       keeps it selected, the undo that brings another gradient back drops it; [17b] undoing an
 *       inserted, selected stop closes the inspector
 *
 * Falsified 2026-09-07 three ways, each reverted (and once more after the Mix redesign the
 * same day: [4]'s second click used the wall's PRE-hero box and hit the hero's ramp — it armed
 * the top half and never picked; the step now re-measures the wall and asserts the other bar
 * took the pick, which the old click fails): making `Tray` `relative` instead of
 * C.3 (same day): dropping the leave-face `beginEdit` in openTray → [7] red ("closing Adjust
 * did not bake"); making `cancelLive` return early → [8] red ("the chip did not cancel").
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
import { seedGeSmokeState } from './geSmokeBoot.mts';

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
      tabsLeft: hero && hr ? (hero.querySelector('[data-gx-tray-tabs]') as HTMLElement | null)?.getBoundingClientRect().x ?? NaN : null,
      cardBottom: cr?.bottom ?? null,
      wallY: wall?.getBoundingClientRect().y ?? null,
      armedHint: /Pick a gradient to (mix with|replace)/.test(document.body.innerText),
      bandA: !!hero?.querySelector('[data-gx-mix-band="this"]'),
      bandB: !!tray?.querySelector('[data-gx-mix-band="other"]'),
      thisTitle: hero?.querySelector('[data-gx-mix-band="this"]')?.getAttribute('title') ?? '',
      otherTitle: tray?.querySelector('[data-gx-mix-band="other"]')?.getAttribute('title') ?? '',
      picker: !!tray?.querySelector('input, canvas'),
      pickerSkin: (tray?.querySelector('[data-gx-picker-skin]') as HTMLElement | null)?.dataset.gxPickerSkin ?? null,
      text: tray?.innerText.replace(/\s+/g, ' ').slice(0, 120) ?? '',
    };
  });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(ctx);
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
  // The first pick also lands in Recent (~400 ms later), and with it the SET RAIL appears at
  // the top of the ground (Phase D, 2026-09-08) and the wall drops 40 px — so wait for that
  // before measuring, or [4]'s wall click lands on the rail and [5]'s "the wall never
  // moved" reads the rail's arrival as the tray pushing the wall.
  await page.waitForTimeout(900);
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
  const hr0 = await page.evaluate(() => document.querySelector('[data-gx-hero]')!.getBoundingClientRect().x);
  if (s.face !== 'adjust') fail(`[2] Adjust did not open the Adjust face (${s.face})`);
  if (s.trays !== 1) fail(`[2] ${s.trays} tray elements — there is ONE tray`);
  if (s.trayTop == null || s.cardBottom == null || Math.abs(s.trayTop - s.cardBottom) > 2) fail(`[2] the tray does not hang from the card (tray ${s.trayTop}, card ${s.cardBottom})`);
  if (s.tabsLeft == null || Math.round(s.tabsLeft - hr0) !== s.trayLeft) fail(`[2] the tray's left edge is not the tab row's (tray x=${s.trayLeft}, tabs x=${s.tabsLeft != null ? Math.round(s.tabsLeft - hr0) : s.tabsLeft})`);
  if (s.wallY !== wallY0) fail(`[2] the wall moved when the tray opened (${wallY0} → ${s.wallY}) — the tray must overlay, not push (L6)`);
  console.log('✓ [2] Adjust opens the tray under the card, over the wall');

  await page.click('[data-gx-tray-tab="curves"]');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face !== 'curves' || s.trays !== 1) fail(`[3] Curves did not replace the face (${s.face}, ${s.trays} trays)`);
  // an untouched fit must not bake on leaving: peek into Curves, close, the chip is still
  // "preview" (falsified by dropping the `!gen.tracksEdited` branch in openTray: red)
  await page.click('[data-gx-tray-tab="curves"]');
  await page.waitForTimeout(400);
  const peek = await page.evaluate(() => (document.querySelector('[data-gx-hero] [data-gx-state]') as HTMLElement | null)?.dataset.gxState);
  if (peek !== 'preview') fail(`[3] peeking into Curves and closing baked the gradient (chip: ${peek})`);
  console.log('✓ [3] Curves replaces Adjust — still one tray; an untouched fit does not bake');

  // A leftover Adjust value (as a user who once dragged Phase would have): the bake on
  // leaving Mix must fold it in ONCE and reset it, or it applies again on every pass and
  // the stops walk (measured 2026-09-07: 2 % further right per toggle).
  // And two leftover SLOT MODIFIERS (2026-09-13): v2 has no control for them, so entering Mix
  // must put them at neutral rather than let them tint the bars and the blend unseen.
  // Falsified by dropping the SLOT_MOD_DEFAULTS reset from enterMix: red on "entering Mix left
  // a slot modifier set (aHueRotate 45)".
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0.02, aHueRotate: 45, bMirror: true }));
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] Mix did not open (${s.face})`);
  const slotMods = await page.evaluate(() => { const g = (window as any).__store.getState().paletteGenerator; return { aHueRotate: g.aHueRotate, bMirror: g.bMirror }; });
  if (slotMods.aHueRotate !== 0 || slotMods.bMirror !== false) fail(`[4] entering Mix left a slot modifier set (aHueRotate ${slotMods.aHueRotate}, bMirror ${slotMods.bMirror}) — v2 has no control that could show or clear it`);
  if (!s.armedHint) fail('[4] opening Mix did not arm the next pick (no armed hint)');
  if (!s.bandA) fail('[4] the hero ramp has no source half (Mix = your gradient over the result)');
  if (!s.bandB) fail('[4] the Mix face has no bar for the gradient you mix with');
  const otherBefore = s.otherTitle;
  // the tray overlays the wall's first rows: pick a tile CLEAR of it (measured, not assumed —
  // the Mix face's height moves with its design)
  const trayBottom = await page.evaluate(() => document.querySelector('[data-gx-tray-root]')!.getBoundingClientRect().bottom);
  // Re-measure NOW: opening Mix adds the armed hint line above the ground, which pushes the
  // wall down (and since Phase D the set rail and the taller header sit above it too), so a
  // point computed from [1]'s box lands in the wall's header rather than on a tile. Take the
  // first canvas that is clear of the tray.
  const cvs = page.locator('[data-gx-keepselect] canvas');
  let target = (await cvs.first().boundingBox())!;
  if (target.y + 10 < trayBottom + 8) target = (await cvs.nth(1).boundingBox())!;
  await page.mouse.click(target.x + 24 + 44 * 5, Math.max(target.y + 10, trayBottom + 18));
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
  // the baked gradient, for reproducing a drift offline (debug/scratch/mix-drift.json)
  const bakedJson = await page.evaluate(() => JSON.stringify({ name: (document.querySelector('[data-gx-hero] input') as HTMLInputElement).value, working: (window as any).__store ? null : null, ...((window as any).__gxWorking?.() ?? {}) }));
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const knotsB = await page.evaluate(() => Array.from(document.querySelector('[title="Double-click to select all"]')!.nextElementSibling!.children).map((k) => (k as HTMLElement).style.left).join(' '));
  if (knotsA !== knotsB) {
    const fs = await import('fs');
    fs.mkdirSync('debug/scratch', { recursive: true });
    fs.writeFileSync('debug/scratch/mix-drift.json', bakedJson);
  }
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
  // Phase E: the picker speaks the v2 dialect. Its skin comes from a CONTEXT and it renders
  // through a portal, so the provider has to sit on the editor in the React tree, not on the
  // tray's host div — falsified by removing the InputSkinProvider around the editor in
  // WorkingHero: this goes red with "default".
  if (s.pickerSkin !== 'soft') fail(`[6] the stop inspector's picker is not in the v2 dialect (skin: ${s.pickerSkin})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.face) fail(`[6] Escape did not close the inspector (${s.face})`);
  // The face closing is not enough: the SELECTION must be gone too, or the picker stays
  // portalled into the hidden host and the next swatch click finds a stale inspector.
  if (s.picker) fail('[6] Escape closed the inspector face but the stop stayed selected (the picker is still in the host)');
  console.log('✓ [6] a stop selection opens the inspector face in the v2 dialect; Escape closes it and clears the selection');

  // C.3 — bake and cancel are ONE mechanism for every face. [7] Adjust: a dial turned, the
  // face closed → the dial is BAKED into the stops (reset to default, the chip reads
  // "editing · return to source"); the chip click CANCELS the bake (the dial comes back live).
  // Falsified by dropping the leave-face `beginEdit` in openTray: "closing Adjust did not
  // bake" goes red.
  const chip = () => page.evaluate(() => {
    const el = document.querySelector('[data-gx-hero] [data-gx-state]') as HTMLElement | null;
    return { state: el?.dataset.gxState ?? null, text: el?.innerText.replace(/\s+/g, ' ').trim() ?? '' };
  });
  const phaseNow = () => page.evaluate(() => (window as any).__store.getState().paletteGenerator.phase as number);
  await page.click('[data-gx-tray-tab="adjust"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0.05 }));
  await page.waitForTimeout(300);
  await page.click('[data-gx-tray-tab="adjust"]');
  await page.waitForTimeout(400);
  s = await state(page);
  let c = await chip();
  if (s.face) fail(`[7] the Adjust tab did not close the face (${s.face})`);
  if (c.state !== 'edited' || !/return to source/.test(c.text)) fail(`[7] closing Adjust did not bake (chip: ${c.state} "${c.text}")`);
  if ((await phaseNow()) !== 0) fail('[7] the bake left the Phase dial set — it would apply again');
  await page.click('[data-gx-hero] [data-gx-state="edited"]');
  await page.waitForTimeout(400);
  c = await chip();
  if (c.state !== 'preview') fail(`[7] return to source did not undo the bake (chip: ${c.state})`);
  if (Math.abs((await phaseNow()) - 0.05) > 1e-9) fail('[7] return to source did not bring the dial back');
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0 }));
  console.log('✓ [7] closing Adjust bakes the dial into the stops; the chip cancels the bake');

  // [8] Mix: the live chip reads "live from Mix · cancel"; clicking it closes the face WITHOUT
  // baking — the gradient from before Mix is back as a preview. Falsified by making
  // cancelLive a no-op: "the chip did not cancel" goes red.
  const nameBefore = await page.evaluate(() => (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '');
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  c = await chip();
  if (c.state !== 'live' || !/cancel/.test(c.text)) fail(`[8] the live chip does not offer cancel (chip: ${c.state} "${c.text}")`);
  await page.click('[data-gx-hero] [data-gx-state="live"]');
  await page.waitForTimeout(400);
  s = await state(page);
  c = await chip();
  if (s.face) fail(`[8] the chip did not close the Mix face (${s.face})`);
  if (s.armedHint) fail('[8] cancelling Mix left the pick armed');
  if (c.state !== 'preview') fail(`[8] the chip did not cancel — the hero is not back on the gradient from before (chip: ${c.state})`);
  const nameAfter = await page.evaluate(() => (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '');
  if (nameAfter !== nameBefore) fail(`[8] cancel came back with a different gradient ("${nameBefore}" → "${nameAfter}")`);
  console.log('✓ [8] the live chip cancels Mix: face closed, nothing baked, the gradient from before is back');

  // C.9 — the split ramp's halves ARE the bake / cancel controls. [9] Adjust with a dial
  // turned: a click on the RESULT half bakes (chip "editing · return to source", dial reset).
  // [10] Mix: a click on the SOURCE half cancels (face closed, chip "preview", same name).
  // Falsified by dropping `onStripClick` from the hero's editor → [9] red; by dropping
  // `onKeepSource` from SourceBands → [10] red.
  await page.click('[data-gx-tray-tab="adjust"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0.05 }));
  await page.waitForTimeout(300);
  s = await state(page);
  const halves = await page.evaluate(() => ({
    src: !!document.querySelector('[data-gx-hero] [data-gx-source-half="cancel"]'),
    res: !!document.querySelector('[data-gx-hero] [data-gx-result-half="bake"]'),
  }));
  if (!halves.src || !halves.res) fail(`[9] the split ramp does not offer both halves as controls (source ${halves.src}, result ${halves.res})`);
  await page.click('[data-gx-hero] [data-gx-result-half="bake"]', { position: { x: 200, y: 10 } });
  await page.waitForTimeout(400);
  s = await state(page);
  c = await chip();
  if (s.face) fail(`[9] the result-half click did not close the face (${s.face})`);
  if (c.state !== 'edited') fail(`[9] the result-half click did not bake (chip: ${c.state} "${c.text}")`);
  if ((await phaseNow()) !== 0) fail('[9] the bake left the dial set');
  await page.click('[data-gx-hero] [data-gx-state="edited"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0 }));
  console.log('✓ [9] a click on the result half bakes the face');

  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  await page.click('[data-gx-hero] [data-gx-source-half="cancel"]', { position: { x: 200, y: 10 } });
  await page.waitForTimeout(400);
  s = await state(page);
  c = await chip();
  if (s.face) fail(`[10] the source-half click did not close Mix (${s.face})`);
  if (s.armedHint) fail('[10] the source-half click left the pick armed');
  if (c.state !== 'preview') fail(`[10] the source-half click did not cancel (chip: ${c.state})`);
  const nameAfter2 = await page.evaluate(() => (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '');
  if (nameAfter2 !== nameBefore) fail(`[10] cancel came back with a different gradient ("${nameBefore}" → "${nameAfter2}")`);
  console.log('✓ [10] a click on the source half cancels the face');

  // [11] A picker MODE toggled off and on again comes back PAINTED. A canvas that remounts
  // gets a blank backing store, and a draw effect keyed on colour alone will not repaint it
  // (the colour did not change) — so Spectrum came back empty until the next colour edit
  // (owner, 2026-09-08). Falsified by keying the field's draw effect on `[hsb.h]` alone
  // instead of `[hsb.h, canvasGen]`: "came back blank" goes red.
  await page.click('[data-gx-hero] [class*="cursor-ew-resize"]');
  await page.waitForTimeout(500);
  const painted = () => page.evaluate(() => {
    const c = document.querySelector('[data-gx-picker-skin] canvas') as HTMLCanvasElement | null;
    if (!c) return -1;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  const before = await painted();
  if (before <= 0) fail(`[11] the picker's first canvas is not painted at all (${before})`);
  await page.click('[data-gx-picker-mode="spectrum"]');
  await page.waitForTimeout(300);
  await page.click('[data-gx-picker-mode="spectrum"]');
  await page.waitForTimeout(500);
  const after = await painted();
  if (after !== before) fail(`[11] Spectrum came back blank after a toggle (painted ${before} → ${after})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('✓ [11] a picker mode toggled off and on comes back painted');

  // [12] A colour dragged out of the picker lands on the ramp: while it is in flight EVERY
  // knot draws a dashed ring (the affordance is the point — the ramp says "these will take
  // it"), a drop over bare track inserts a knot, and a drop on a knot recolours it. Falsified
  // by dropping the `onDragOver` handler on the knot track: "no knot lit up" goes red.
  await page.click('[data-gx-hero] [class*="cursor-ew-resize"]');
  await page.waitForTimeout(500);
  // Harmony carries THIS gradient's own colours, which always exist — a fresh profile has no
  // Recent colours yet, so the default modes leave nothing to drag.
  const harmonyOn = await page.evaluate(() => !!document.querySelector('[data-gx-picker-mode="harmony"][data-on]'));
  if (!harmonyOn) await page.click('[data-gx-picker-mode="harmony"]');
  await page.waitForTimeout(400);
  // The dragover and the read must not share a tick: React batches the state that draws the
  // dashed rings, so a same-tick query sees the DOM as it was.
  const started = await page.evaluate(() => {
    const root = document.querySelector('[data-gx-picker-skin]');
    const track = document.querySelector('[data-gx-hero] [title="Click & drag to add/move knot"]') as HTMLElement | null;
    if (!root || !track) return { err: 'no picker or no knot track' };
    const chips = Array.from(root.querySelectorAll('button[title^="#"]')) as HTMLElement[];
    if (!chips.length) return { err: 'the picker has no colour chips to drag' };
    const dt = new DataTransfer();
    chips[chips.length - 1].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const r = track.getBoundingClientRect();
    // a gap no knot is near, so this is the INSERT path
    const pos = Array.from(track.querySelectorAll('[class*="cursor-grab"]')).map((d) => parseFloat((d as HTMLElement).style.left) / 100);
    let t = 0.5;
    for (let c = 0.06; c < 0.94; c += 0.01) if (pos.every((q) => Math.abs(q - c) > 0.08)) { t = c; break; }
    const w = window as unknown as { __drag?: unknown };
    w.__drag = { dt, track, x: r.left + r.width * t, y: r.top + r.height / 2 };
    (w as unknown as { __dragDiag: unknown }).__dragDiag = { pos, t };
    track.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt, clientX: r.left + r.width * t, clientY: r.top + r.height / 2 }));
    return { hex: dt.getData('application/x-gmt-color'), before: track.querySelectorAll('[class*="cursor-grab"]').length };
  });
  if ('err' in started && started.err) fail(`[12] ${started.err}`);
  if (!/^#[0-9A-F]{6}$/.test(started.hex ?? '')) fail(`[12] the chip did not start a colour drag (${started.hex})`);
  await page.waitForTimeout(400);
  const shown = await page.evaluate(() => ({
    lit: document.querySelectorAll('[data-gx-colour-drop-knot]').length,
    mark: !!document.querySelector('[data-gx-colour-drop-new]'),
  }));
  if (!shown.lit) fail('[12] no knot lit up while a colour was over the ramp');
  // A dense gradient may have no gap at all, in which case the drop RECOLOURS rather than
  // inserts: the mark only claims to appear when the colour is not over a knot.
  const overKnot = await page.evaluate(() => {
    const d = (window as unknown as { __dragDiag: { pos: number[]; t: number } }).__dragDiag;
    return d.pos.some((p) => Math.abs(p - d.t) <= 0.02);
  });
  if (!overKnot && !shown.mark) fail('[12] no insertion mark where the colour would land, and no knot is near it');
  await page.evaluate(() => {
    const d = (window as unknown as { __drag: { dt: DataTransfer; track: HTMLElement; x: number; y: number } }).__drag;
    d.track.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: d.dt, clientX: d.x, clientY: d.y }));
  });
  await page.waitForTimeout(500);
  const landed = await page.evaluate((hex: string) => {
    const track = document.querySelector('[data-gx-hero] [title="Click & drag to add/move knot"]')!;
    return {
      count: track.querySelectorAll('[class*="cursor-grab"]').length,
      carries: Array.from(track.querySelectorAll('svg path')).some((n) => (n.getAttribute('fill') ?? '').toUpperCase() === hex),
    };
  }, started.hex ?? '');
  // the colour LANDED: either a new knot appeared, or an existing one took the colour
  if (!landed.carries) fail(`[12] the dropped colour ${started.hex} is on no knot`);
  if (!overKnot && landed.count !== (started.before ?? 0) + 1) fail(`[12] the drop over bare track did not add a knot (${started.before} → ${landed.count})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('✓ [12] a colour dragged from the picker lights the knots and lands on the ramp');

  // [13] CLICK AWAY DESELECTS (owner, 2026-09-09: "deselecting a knot should be easier — ie
  // when clicking on the wall"). Escape was the ONLY way out: the editor's own click-away
  // lives on its container OUTSIDE the knot track, and the hero's `chrome='strip'` editor has
  // no such area — a click on the ramp INSERTS a knot instead. A pointerdown on the ground
  // now closes the face, and the hero's clearSelection effect drops the stop with it.
  // Falsified by removing the ground div's `onPointerDownCapture` in GradientExplorerV2App:
  // red on "the wall click did not close the inspector (inspector)".
  await page.click('[data-gx-hero] [class*="cursor-ew-resize"]');
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'inspector') fail(`[13] setup: a swatch click did not open the inspector (${s.face})`);
  if (!s.picker) fail('[13] setup: the inspector face has no picker in it');
  // The tray floats OVER the wall (L6), so an aim taken from the wall's box alone can land on
  // the inspector and prove nothing. Walk up from the wall's bottom edge to the first point
  // that hit-tests to the wall itself.
  const aim = await page.evaluate(() => {
    const wallEl = document.querySelector('[data-gx-keepselect]')!;
    const r = wallEl.getBoundingClientRect();
    const x = r.x + r.width * 0.5;
    for (let y = Math.min(r.bottom, window.innerHeight) - 8; y > r.y + 4; y -= 8) {
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest('[data-gx-hero]') && wallEl.contains(el)) return { x, y };
    }
    return null;
  });
  if (!aim) fail('[13] no point on the wall is clear of the tray — the aim would land on the inspector');
  await page.mouse.click(aim!.x, aim!.y);
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face) fail(`[13] the wall click did not close the inspector (${s.face})`);
  // The face closing is not enough (the trap [6] fell into): the SELECTION must be gone too,
  // or the picker stays portalled into the hidden host and the stop is still selected.
  if (s.picker) fail('[13] the wall click closed the face but the stop stayed selected (the picker is still in the host)');
  console.log('✓ [13] a click on the wall closes the inspector and clears the stop selection');

  /**
   * [14] ONE CLICK leaves the inspector for another face (owner, 2026-09-11: "when switching
   * to them from the color picker, it is requiring 2 clicks as the first click is leaving the
   * picker").
   *
   * The editor told the host about the selection from an effect that listed the CALLBACK in
   * its deps, so it re-fired on every render where the host passed a fresh arrow — which the
   * shell does on every render. The host reads that as an event and its rule is "a stop is
   * selected and the tray is elsewhere → open the inspector", so the tab's own `openTray` was
   * immediately undone, the hero's leave-the-inspector effect then cleared the stop, and the
   * zero-count notification closed the tray. Net: nothing opened.
   *
   * Mix / Curves / Adjust only. IMAGE is not a bug when it does not switch: with no image
   * loaded that tab opens the file dialog first and the tray stays where it was, by design.
   */
  for (const tab of ['adjust', 'curves', 'mix'] as const) {
    await page.locator('[data-gx-hero] button[title*="click to edit its stop"]').first().click();
    await page.waitForTimeout(600);
    if ((await state(page)).face !== 'inspector') fail(`[14] could not get back to the inspector before trying ${tab}`);
    await page.click(`[data-gx-tray-tab="${tab}"]`);
    await page.waitForTimeout(600);
    const got = (await state(page)).face;
    if (got !== tab) fail(`[14] one click on ${tab} from the picker landed on ${got} — it should open ${tab}`);
  }
  console.log('✓ [14] one click leaves the picker for Mix / Curves / Adjust — not two');

  /**
   * [15] THE ADJUST FACE (owner, 2026-09-13): Reseed, Cancel / Apply, and nothing off-panel.
   *
   *   • RESEED is a text button, unavailable at Strength 0, and moves the grain when on.
   *   • CANCEL puts every dial in the three bins back — Frequency and Targets included — in ONE
   *     undo step, touching neither the working stops nor anything outside the face (the Mix
   *     blend, a slot modifier).
   *   • APPLY bakes: the working stops become the ADJUSTED result (the ramp they render is the
   *     adjusted ramp, not the one before), the picture-changing dials go back to default, the
   *     face stays open, and ONE Ctrl+Z brings back both the old stops and the dials.
   *   • Both are unavailable while the dials draw nothing.
   *   • At 1024 / 900 / 800 px nothing in a bin reaches past the bin, and no bin past the tray
   *     (the owner: "the whole targets line goes offpanel when window size is narrow"; measured
   *     before the rework at 800: the "hue" chip at x 716..760 in a bin ending at 759).
   *
   * Falsified 2026-09-13, each reverted: Cancel pointed at `resetMainMods` reds "Cancel left
   * noiseFreq at 64"; Apply's `beginEdit` removed reds "Apply left hueRotate at 30"; the bins
   * pinned three across (`cols` fixed at 3) reds "a bin is squeezed to … px" — WITHOUT that
   * width check it stayed green, because the soft chips now wrap inside a squeezed bin, so the
   * width check is what pins the rows; and pinning three across with the chips' `flex-wrap`
   * also removed from InlineToggleButtons reds "800 px: 2 things leave their panel — noise:
   * lightness…" (the owner's bug, reproduced).
   */
  const gen = () => page.evaluate(() => ({ ...(window as any).__store.getState().paletteGenerator }));
  const working = () => page.evaluate(() => {
    const w = (window as any).__gxWorking?.();
    return { input: JSON.stringify(w?.input ?? null), stops: JSON.stringify(w?.config?.stops?.map((s: { position: number; color: string }) => [s.position, s.color]) ?? null), ramp: (w?.ramp ?? []) as { r: number; g: number; b: number }[] };
  });
  const rampDist = (a: { r: number; g: number; b: number }[], b: { r: number; g: number; b: number }[]) => {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) sum += Math.abs(a[i].r - b[i].r) + Math.abs(a[i].g - b[i].g) + Math.abs(a[i].b - b[i].b);
    return sum / (3 * Math.max(1, Math.min(a.length, b.length)));
  };
  if ((await state(page)).face !== 'adjust') {
    await page.click('[data-gx-tray-tab="adjust"]');
    await page.waitForTimeout(500);
  }
  if ((await state(page)).face !== 'adjust') fail(`[15] could not open the Adjust face (${(await state(page)).face})`);
  const reseedBtn = page.locator('[data-gx-adjust-reseed]');
  const cancelBtn = page.locator('[data-gx-adjust-cancel]');
  const applyBtn = page.locator('[data-gx-adjust-apply]');
  if (!(await reseedBtn.count()) || !(await cancelBtn.count()) || !(await applyBtn.count())) fail('[15] the Adjust face is missing Reseed, Cancel or Apply');
  if (await page.locator('[data-gx-adjust-reset]').count()) fail('[15] "Reset all" is still on the face — it was replaced by Cancel / Apply');
  if ((await reseedBtn.innerText()).trim() !== 'Reseed') fail(`[15] Reseed is not a text button ("${(await reseedBtn.innerText()).trim()}")`);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ noise: 0 }));
  await page.waitForTimeout(200);
  if (!(await reseedBtn.isDisabled())) fail('[15] Reseed is offered at Noise: Strength 0, where a new seed changes nothing');
  if (!(await cancelBtn.isDisabled()) || !(await applyBtn.isDisabled())) fail('[15] Cancel / Apply are offered with every dial at its default');

  // one value in every bin — Lightness and a FRACTIONAL scale among them — plus two things
  // outside the face that neither action may touch
  const faceSet = { hueRotate: 30, chroma: 1.4, lightness: 0.08, bands: 4, repeats: 2.5, mirror: true, noise: 0.4, noiseFreq: 64, noiseL: false, noiseC: true };
  await page.evaluate((v) => (window as any).__store.getState().setPaletteGenerator({ ...v, mixL: 0.3, aHueRotate: 45 }), faceSet);
  await page.waitForTimeout(400);
  if (await reseedBtn.isDisabled()) fail('[15] Reseed stayed unavailable with Noise: Strength at 0.4');
  const rampA = JSON.stringify((await working()).ramp.slice(0, 64));
  await reseedBtn.click();
  await page.waitForTimeout(400);
  if (JSON.stringify((await working()).ramp.slice(0, 64)) === rampA) fail('[15] Reseed changed nothing on the gradient with noise on');

  // CANCEL
  const beforeCancel = await working();
  if (await cancelBtn.isDisabled()) fail('[15] Cancel is unavailable with every bin changed');
  await cancelBtn.click();
  await page.waitForTimeout(400);
  let g = await gen();
  const defaults = { hueRotate: 0, chroma: 1, contrast: 1, lightness: 0, bands: 0, repeats: 1, phase: 0, mirror: false, reverse: false, noise: 0, noiseFreq: 32, noiseL: true, noiseC: false, noiseH: false };
  for (const [k, v] of Object.entries(defaults)) if (g[k] !== v) fail(`[15] Cancel left ${k} at ${g[k]} (default ${v})`);
  if (g.mixL !== 0.3 || g.aHueRotate !== 45) fail(`[15] Cancel reached outside the face (mixL 0.3 → ${g.mixL}, aHueRotate 45 → ${g.aHueRotate})`);
  const afterCancel = await working();
  if (afterCancel.input !== beforeCancel.input) fail('[15] Cancel changed the working input — it discards dials, it does not bake');
  // the gradient as it is with no dials: what Apply must move AWAY from
  const baseRamp = afterCancel.ramp;
  if (!(await applyBtn.isDisabled())) fail('[15] Apply is still offered after Cancel put every dial back');
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  g = await gen();
  for (const [k, v] of Object.entries(faceSet)) if (g[k] !== v) fail(`[15] one Ctrl+Z after Cancel did not bring ${k} back (${g[k]}, wanted ${v}) — Cancel is not one step`);

  // APPLY — the dials are back (from the undo); bake them
  const beforeApply = await working();
  const adjustedRamp = beforeApply.ramp;
  const chipBefore = (await chip()).state;
  if (rampDist(adjustedRamp, baseRamp) < 8) fail(`[15] setup: the dials barely change the picture (${rampDist(adjustedRamp, baseRamp).toFixed(1)}) — Apply could not be told from doing nothing`);
  if (await applyBtn.isDisabled()) fail('[15] Apply is unavailable with the dials turned');
  await applyBtn.click();
  await page.waitForTimeout(700);
  const afterApply = await working();
  g = await gen();
  for (const k of ['hueRotate', 'chroma', 'contrast', 'lightness', 'bands', 'repeats', 'phase', 'mirror', 'reverse', 'noise'] as const)
    if (g[k] !== (defaults as Record<string, unknown>)[k]) fail(`[15] Apply left ${k} at ${g[k]} — the dials should start fresh`);
  // With every dial back at default the picture can only still be the ADJUSTED one if it was
  // baked into the stops: the working ramp must sit on the adjusted ramp, not on the base.
  const toAdjusted = rampDist(afterApply.ramp, adjustedRamp);
  const toBase = rampDist(afterApply.ramp, baseRamp);
  if (!(toAdjusted < 12 && toAdjusted * 2 < toBase)) fail(`[15] Apply did not bake the adjusted result — mean ${toAdjusted.toFixed(1)} levels from it, ${toBase.toFixed(1)} from the gradient before`);
  if ((await chip()).state !== 'edited') fail(`[15] Apply did not make a new state (chip: ${(await chip()).state})`);
  if ((await state(page)).face !== 'adjust') fail(`[15] Apply closed the face (${(await state(page)).face}) — it bakes and keeps going`);
  if (!(await applyBtn.isDisabled())) fail('[15] Apply is still offered right after applying');
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(600);
  const undone = await working();
  g = await gen();
  if (undone.input !== beforeApply.input || (await chip()).state !== chipBefore) fail(`[15] one Ctrl+Z after Apply did not bring the gradient from before back (chip ${(await chip()).state}, was ${chipBefore})`);
  for (const [k, v] of Object.entries(faceSet)) if (g[k] !== v) fail(`[15] one Ctrl+Z after Apply did not bring ${k} back (${g[k]}, wanted ${v})`);
  console.log(`✓ [15] Reseed moves the grain; Cancel discards the three bins in one step; Apply bakes the adjusted result (mean ${toAdjusted.toFixed(1)} levels from it, ${toBase.toFixed(1)} from before) and one Ctrl+Z restores the gradient + dials`);

  // NOTHING OFF-PANEL at narrow desktop widths
  const offPanel = () => page.evaluate(`(function () {
    var tray = document.querySelector('[data-gx-tray-root]');
    var tr = tray.getBoundingClientRect();
    var out = [];
    var bins = tray.querySelectorAll('[data-gx-adjust-bin]');
    var minW = 1e9;
    for (var b = 0; b < bins.length; b++) {
      var br = bins[b].getBoundingClientRect();
      minW = Math.min(minW, br.width);
      if (br.right > tr.right + 0.5 || br.left < tr.left - 0.5) out.push('bin ' + bins[b].getAttribute('data-gx-adjust-bin') + ' past the tray');
      var all = bins[b].querySelectorAll('*');
      for (var j = 0; j < all.length; j++) {
        var er = all[j].getBoundingClientRect();
        if (!er.width || !er.height || all[j].closest('[aria-hidden]')) continue;
        if (er.right > br.right + 0.5 || er.left < br.left - 0.5) out.push(bins[b].getAttribute('data-gx-adjust-bin') + ': "' + String(all[j].innerText || all[j].tagName).slice(0, 16) + '" ' + Math.round(er.left) + '..' + Math.round(er.right) + ' in ' + Math.round(br.left) + '..' + Math.round(br.right));
      }
    }
    return { out: out.slice(0, 4), n: out.length, cols: tray.querySelector('[data-gx-adjust]').getAttribute('data-gx-adjust-cols'), bins: bins.length, minW: Math.round(minW) };
  })()`) as Promise<{ out: string[]; n: number; cols: string; bins: number; minW: number }>;
  const cols: string[] = [];
  for (const width of [1024, 900, 800]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(500);
    const o = await offPanel();
    if (o.bins !== 3) fail(`[15] ${width} px: ${o.bins} Adjust bins, expected 3`);
    if (o.n) fail(`[15] ${width} px: ${o.n} things leave their panel — ${o.out.join(' · ')}`);
    // ROWS, NOT SQUEEZE: a bin is never narrower than the Targets row needs (ADJUST_BIN_MIN
    // in Tray.tsx is 280 — the row's 250 px plus the bin's padding); the face adds a row instead
    if (o.minW < 278) fail(`[15] ${width} px: a bin is squeezed to ${o.minW} px (${o.cols} across) — the face should take another row`);
    cols.push(`${width}:${o.cols}`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  // leave the tray the way the next step expects it
  await cancelBtn.click();
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ mixL: 0, aHueRotate: 0 }));
  await page.waitForTimeout(200);
  console.log(`✓ [15] nothing in the Adjust face leaves its panel at 1024 / 900 / 800 px (columns ${cols.join(' ')})`);

  /**
   * [16] THE WALLPAPER OWNS THE KEYBOARD (2026-09-13). The overlay used to own Escape only, so
   * with a stop selected on the hero (the inspector face open) and a point selected in Spline,
   * ONE Delete removed the spline point AND the hero's stop — reproduced in the browser that day
   * (the hero went from 2 knots to 1 behind the overlay). Both listeners are window-level; the
   * overlay now stops keys at the document once its own elements have had them.
   * Falsified the same day by dropping that `stopPropagation` in FullscreenGradientOverlay:
   * red on "Delete in the wallpaper also deleted a stop on the hero underneath (12 → 11)". The
   * point half is there so a fix that swallowed the key for the MODE too cannot pass.
   */
  if ((await state(page)).face) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  const heroKnots = () => page.evaluate(() => document.querySelector('[data-gx-hero] [title="Click & drag to add/move knot"]')?.querySelectorAll('[class*="cursor-grab"]').length ?? -1);
  await page.locator('[data-gx-hero] [class*="cursor-ew-resize"]').first().click();
  await page.waitForTimeout(500);
  if ((await state(page)).face !== 'inspector') fail(`[16] setup: a swatch click did not select a stop (${(await state(page)).face})`);
  const knots0 = await heroKnots();
  await page.click('[data-gx-hero] [title^="Wallpaper"]');
  await page.waitForSelector('[data-testid="fullscreen-gradient-overlay"]', { timeout: 5000 }).catch(() => fail('[16] the wallpaper did not open'));
  await page.locator('[data-testid="fullscreen-gradient-overlay"] [data-gx-fs-modes] button', { hasText: /^Spline/ }).first().click();
  await page.waitForSelector('[data-testid="fullscreen-gradient-overlay"] .cursor-crosshair', { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(500);
  const splineStage = () => page.evaluate(() => {
    const el = document.querySelector('[data-testid="fullscreen-gradient-overlay"] .cursor-crosshair') as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    // the handles are round divs over the SVG path, one per point
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, handles: el!.querySelectorAll(':scope > div.rounded-full').length } : null;
  });
  const st0 = await splineStage();
  if (!st0) fail('[16] Spline mode has no editing stage');
  // the default curve's second point sits at (0.38, 0.34) of the stage — select it
  await page.mouse.click(st0!.x + st0!.w * 0.38, st0!.y + st0!.h * 0.34);
  await page.waitForTimeout(400);
  const handles0 = (await splineStage())!.handles;
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);
  const handles1 = (await splineStage())!.handles;
  const knots1 = await heroKnots();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await page.$('[data-testid="fullscreen-gradient-overlay"] .cursor-crosshair')) fail('[16] Escape did not close the wallpaper');
  if (knots1 !== knots0) fail(`[16] Delete in the wallpaper also deleted a stop on the hero underneath (${knots0} → ${knots1})`);
  if (!(handles1 < handles0)) fail(`[16] Delete did not reach the Spline mode — its selected point is still there (${handles0} → ${handles1} handles)`);
  console.log(`✓ [16] Delete in the wallpaper removes the spline point (${handles0} → ${handles1}) and leaves the hero's stops alone (${knots0})`);

  /**
   * [17] A STOP SELECTION BELONGS TO ITS GRADIENT (§8b item 9's "Noticed, not fixed", built
   * 2026-09-16). Every fitted gradient numbers its stops `s0…sN`, so after a swap the selected
   * id usually still exists — on the OTHER gradient — and the inspector stayed open over it.
   * Reproduced that day: pick a gradient, select its last stop, nudge it with an arrow, then
   * Ctrl+Z one step at a time. Every undo that stays on the picked gradient (the nudge, the fold
   * into stops) must KEEP the stop and the inspector; the undo that brings the previous gradient
   * back must drop both. [17b]: a click on the knot track inserts a stop and selects it, and the
   * undo that removes it must close the face instead of leaving it over an empty inspector.
   *
   * Falsified 2026-09-16, each reverted, in `AdvancedGradientEditor`'s prop-sync effect:
   * dropping the clear in the different-gradient branch → red "undo 3 brought … back but left
   * the stop inspector open over it"; treating EVERY incoming value as a different gradient
   * (`lineageRef.current.has(key)` → `false`) → red, but first at [14] ("could not get back to
   * the inspector before trying mix"), so [17] never ran — the same sequence in a scratch probe
   * dropped the stop at undo 1, which is what [17]'s keep half asserts; dropping the prune of
   * ids the value no longer has → red "[17b] the undo removed the inserted stop but the
   * inspector stayed open".
   */
  for (let i = 0; i < 3 && (await state(page)).face; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  const heroName = () => page.evaluate(() => (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '');
  const nameBefore17 = await heroName();
  // Aim at wall tiles that hit-test to the wall itself (not the hero, not a header), top down.
  const wallAims = await page.evaluate(() => {
    const wallEl = document.querySelector('[data-gx-keepselect]')!;
    const r = wallEl.getBoundingClientRect();
    const out: { x: number; y: number }[] = [];
    for (let y = r.y + 14; y < Math.min(r.bottom, window.innerHeight) - 8 && out.length < 8; y += 29) {
      const x = r.x + 24 + 44 * (3 + out.length);
      const el = document.elementFromPoint(x, y);
      if (el && el.tagName === 'CANVAS' && !el.closest('[data-gx-hero]') && wallEl.contains(el)) out.push({ x, y });
    }
    return out;
  });
  let nameB = nameBefore17;
  for (const a of wallAims) {
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(900);
    nameB = await heroName();
    if (nameB !== nameBefore17) break;
  }
  if (nameB === nameBefore17) fail(`[17] setup: no wall click picked a different gradient (still "${nameB}")`);
  const lastSwatch = page.locator('[data-gx-hero] [class*="cursor-ew-resize"]');
  await lastSwatch.nth((await lastSwatch.count()) - 1).click();
  await page.waitForTimeout(600);
  if ((await state(page)).face !== 'inspector') fail(`[17] setup: the last swatch did not select a stop (${(await state(page)).face})`);
  await page.mouse.move(640, 20);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  if ((await state(page)).face !== 'inspector') fail('[17] setup: nudging the selected stop closed the inspector');
  let kept17 = 0;
  let swappedTo = '';
  for (let i = 1; i <= 5 && !swappedTo; i++) {
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    const s17 = await state(page);
    const now = await heroName();
    if (now === nameB) {
      if (s17.face !== 'inspector' || !s17.picker) fail(`[17] undo ${i} stayed on "${nameB}" but dropped the stop (face ${s17.face}, picker ${s17.picker})`);
      kept17++;
    } else {
      if (s17.face || s17.picker) fail(`[17] undo ${i} brought "${now}" back but left the stop inspector open over it (face ${s17.face})`);
      swappedTo = now;
    }
  }
  if (!swappedTo) fail(`[17] setup: five undos never left "${nameB}"`);
  if (!kept17) fail('[17] setup: no undo stayed on the picked gradient, so nothing showed the selection surviving its own edits');
  console.log(`✓ [17] ${kept17} undo(s) of the stop's own edits keep it selected; the undo back to "${swappedTo}" drops it and closes the inspector`);

  // [17b] an undone INSERT: aim at the middle of the widest gap between two stops.
  const gap = await page.evaluate(() => {
    const stops = (((window as any).__gxWorking?.()?.config?.stops ?? []) as { position: number }[]).map((s) => s.position).sort((a, b) => a - b);
    const track = document.querySelector('[data-gx-hero] [data-gx-knot-track]') as HTMLElement | null;
    if (stops.length < 2 || !track) return null;
    let best = 0;
    for (let i = 1; i < stops.length; i++) if (stops[i] - stops[i - 1] > stops[best + 1] - stops[best]) best = i - 1;
    const t = (stops[best] + stops[best + 1]) / 2;
    const r = track.getBoundingClientRect();
    return { x: r.x + t * r.width, y: r.y + r.height / 2, n: stops.length, px: (stops[best + 1] - stops[best]) * r.width };
  });
  // a knot's grab area is 16 px wide, centred on it: the aim must clear both neighbours'
  if (!gap || gap.px < 24) fail(`[17b] setup: no gap between stops wide enough to insert into (${JSON.stringify(gap)})`);
  const stopCount = () => page.evaluate(() => ((window as any).__gxWorking?.()?.config?.stops ?? []).length as number);
  await page.mouse.click(gap!.x, gap!.y);
  await page.waitForTimeout(600);
  if ((await stopCount()) !== gap!.n + 1 || (await state(page)).face !== 'inspector') fail(`[17b] setup: a track click did not insert and select a stop (${gap!.n} → ${await stopCount()}, face ${(await state(page)).face})`);
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(700);
  const s17b = await state(page);
  if ((await stopCount()) !== gap!.n) fail(`[17b] setup: one Ctrl+Z did not remove the inserted stop (${await stopCount()} stops, wanted ${gap!.n})`);
  if (s17b.face || s17b.picker) fail(`[17b] the undo removed the inserted stop but the inspector stayed open (face ${s17b.face})`);
  console.log('✓ [17b] undoing an inserted, selected stop closes the inspector rather than leaving it empty');

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
