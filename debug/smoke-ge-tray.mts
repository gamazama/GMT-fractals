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
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ phase: 0.02 }));
  await page.click('[data-gx-tray-tab="mix"]');
  await page.waitForTimeout(400);
  s = await state(page);
  if (s.face !== 'mix') fail(`[4] Mix did not open (${s.face})`);
  if (!s.armedHint) fail('[4] opening Mix did not arm the next pick (no armed hint)');
  if (!s.bandA) fail('[4] the hero ramp has no source half (Mix = your gradient over the result)');
  if (!s.bandB) fail('[4] the Mix face has no bar for the gradient you mix with');
  const otherBefore = s.otherTitle;
  // the tray overlays the wall's first rows: pick a tile CLEAR of it (measured, not assumed —
  // the Mix face's height moves with its design)
  const trayBottom = await page.evaluate(() => document.querySelector('[data-gx-tray-root]')!.getBoundingClientRect().bottom);
  await page.mouse.click(wallBox.x + 24 + 44 * 5, Math.max(wallBox.y + 14, trayBottom + 18));
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
