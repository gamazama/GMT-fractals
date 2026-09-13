/**
 * smoke-ge-session — the Gradient Explorer v2 working session survives a reload, and the
 * Settings ▸ Files ▸ Session loop saves and loads it, on a desktop AND a phone.
 *
 * The node harness (`npm run test:gx-session`) proves the logic against a real engine store;
 * this proves the WIRING it cannot see — `installGxSession()` in main.tsx running before the
 * first render, the `pagehide` flush, the shell reopening nothing it should not, the Settings
 * rows, the download and the file picker.
 *
 *   [1] AUTOSAVE IS OPT-IN AND PER APP: with app-gmt's `gmt-autosave-enabled` seeded ON, the
 *       Explorer's autosave is still OFF; an edited gradient is NOT restored by a reload and
 *       nothing is written to `gmt.ge.session`
 *   [1b] turning it ON through the real Settings ▸ Files ▸ Autosave row writes
 *       `gmt.ge.autosave-enabled` and leaves `gmt-autosave-enabled` exactly as it was
 *   [2] pick a gradient and click the hero's knot track (an inserted knot — a real stop edit)
 *   [3] reload: the same stops come back, the hero is there on the first paint, and no pageerror.
 *       The autosave interval is seeded to 600 s, so what carried it is the pagehide flush
 *   [4] ONE Ctrl+Z after the reload does not wipe it (no undo entry was made by the restore)
 *   [5] a share link WINS over the stored session on its load, and (after a reload without it)
 *       has become the session
 *   [6] garbage in `gmt.ge.session` → a clean first-run boot, no pageerror
 *   [6b] turning autosave OFF through the row removes the stored session and leaves
 *       `gmt-autosave-enabled` on; a session put back into storage by hand is then neither
 *       restored nor kept by the next boot
 *   [7] WITH AUTOSAVE OFF, desktop Settings ▸ Files ▸ Session: Save downloads `*.gxsession.json` that reads back as
 *       a session; a different session loaded through the picker replaces the hero in ONE undo
 *       step; a garbage file shows a toast and changes nothing
 *   [8] PHONE (Pixel 5, autosave at its default, off): the menu reaches Settings, both Session
 *       rows sit inside the screen, and Load works there too
 *
 * Wants `npm run dev` (default 3400; set ENGINE_URL for another port). Seeds a returning visitor
 * (`geSmokeBoot`), seeds app-gmt's autosave ON (once, so a write by the Explorer would show)
 * and the Explorer's interval to 600 s, and leaves the Explorer's toggle UNSET — its default
 * (off) is part of what is under test.
 *
 * Other agents' edits HMR-reload the page; re-run once before believing a red. The palette CDN
 * fails CORS on a non-3400 port — those console errors are expected and not collected.
 *
 * FALSIFIED 2026-09-13 against the dev server, seven breaks, each reverted — every one red at
 * the step it names and green through the steps before it:
 *   · the boot apply routed through the file path (an undo bracket) → [4] RED: the first Ctrl+Z
 *     after the reload undid the restore (the hero fell back to the picked gradient's 3 stops).
 *   · `restoreSessionOnBoot` replaced by a stub in gradient-explorer/v2/session.ts → [3] RED.
 *   · the `pagehide` + tab-hidden flush made no-ops → [3] RED: with the 600 s interval nothing
 *     was stored by the reload. This is what the `@assumption` in engine/plugins/Session.ts
 *     leans on, and it is measured on Chromium only.
 *   · `preempted: false` → [5] RED, "undo revealed a build input": the link still SHOWS (the
 *     shell applies it after boot), so only the undo tells a restore-underneath apart.
 *   · the tray's initial face ignoring a live input → [4b] RED ("came back as build with the
 *     null face").
 *   · `decodeSession` without its JSON.parse guard → [6] RED: main.tsx throws on the garbage
 *     and the shell never paints (a 20 s wait for the wall).
 *   · the file load without its `paramEdit` → [7] RED: one undo does not put the session back.
 * (Those seven ran against the first cut, when autosave defaulted on; steps [3]–[7] kept their
 * assertions through the opt-in change below.)
 *
 * FALSIFIED 2026-09-13, second pass (autosave opt-in and per app), three breaks, each reverted:
 *   · the Explorer's store built on app-gmt's keys → [1] RED: with `gmt-autosave-enabled`
 *     seeded on, the reload restored the edit.
 *   · `registerCoreSettings` binding app-gmt's store whatever it is handed → [1b] RED: the row
 *     never wrote `gmt.ge.autosave-enabled`.
 *   · the boot restore treating autosave as always on → [6b] RED ("the reload restored the
 *     session (12 stops)"). This one passed the first version of [6b], which only asserted after
 *     the toggle had already REMOVED the stored session; the put-back line was added so the step
 *     stands on the boot decision itself.
 */
import { chromium, devices, type Page, type BrowserContext } from 'playwright';
import { readFileSync } from 'node:fs';
import { seedGeSmokeState } from './geSmokeBoot.mts';
import { encodeShare } from '../gradient-explorer/v2/shareUrl';
import { encodeSession } from '../store/sessionEnvelope';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const KEY = 'gmt.ge.session';
const GX_ENABLED = 'gmt.ge.autosave-enabled';
const GMT_ENABLED = 'gmt-autosave-enabled';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

/** The working gradient as the shell sees it: input kind + a stops signature. */
const working = (page: Page) =>
  page.evaluate(`(() => {
    var f = window.__gxWorking; if (!f) return null;
    var w = f(); var stops = (w.config && w.config.stops) || [];
    return { kind: w.input.kind, n: stops.length, sig: stops.map(function (s) { return s.position.toFixed(3) + s.color.toUpperCase(); }).join(' ') };
  })()`) as Promise<{ kind: string; n: number; sig: string } | null>;

const hasHero = (page: Page) => page.evaluate(`!!document.querySelector('[data-gx-hero]')`) as Promise<boolean>;
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);

const seed = async (ctx: BrowserContext): Promise<void> => {
  await seedGeSmokeState(ctx);
  // Once per context (init scripts re-run on every navigation, and re-seeding would hide a
  // write): app-gmt's autosave ON — the Explorer must not read it — and the Explorer's interval
  // at 600 s, so a reload that brings the session back can only have been carried by pagehide.
  await ctx.addInitScript(() => {
    try {
      if (localStorage.getItem('smoke.ge-session.seeded')) return;
      localStorage.setItem('smoke.ge-session.seeded', '1');
      localStorage.setItem('gmt-autosave-enabled', '1');
      localStorage.setItem('gmt.ge.autosave-interval-sec', '600');
    } catch { /* */ }
  });
};

const settle = async (page: Page, errors: string[]): Promise<void> => {
  await page.waitForSelector('[data-gx-keepselect] canvas', { timeout: 20000 });
  await page.waitForTimeout(900);
  if (errors.length) fail(`pageerror: ${errors.join(' | ')}`);
};

async function pickAndEdit(page: Page, x = 400, y = 260): Promise<{ kind: string; n: number; sig: string }> {
  const wall = page.locator('[data-gx-keepselect] canvas').first();
  const box = (await wall.boundingBox())!;
  await page.mouse.click(box.x + x, box.y + y);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
  await page.waitForTimeout(700);
  const before = await working(page);
  const track = page.locator('[data-gx-hero] [title="Click & drag to add/move knot"]').first();
  const tb = await track.boundingBox();
  if (!tb) fail('no knot track on the hero');
  // A spot away from the ends, where an existing knot is unlikely: the insert path.
  let after = before;
  for (const frac of [0.37, 0.61, 0.23, 0.79]) {
    await page.mouse.click(tb!.x + tb!.width * frac, tb!.y + tb!.height / 2);
    await page.waitForTimeout(500);
    after = await working(page);
    if (after && before && after.sig !== before.sig) break;
  }
  if (!after || !before || after.sig === before.sig) fail(`the knot-track click changed nothing (${before?.n} stops)`);
  // Esc drops the stop selection so it does not ride into the next step.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return after!;
}

async function openSessionSettings(page: Page, phone: boolean): Promise<void> {
  if (phone) {
    await page.locator('header [data-gx-menu-trigger]').tap();
    await page.waitForSelector('[data-gx-menu]', { timeout: 4000 }).catch(() => fail('[8] the phone menu did not open'));
    await page.locator('[data-gx-menu] button', { hasText: 'Settings' }).first().tap();
  } else {
    const gear = page.locator('header button[title="Settings"]').first();
    if (await gear.count()) await gear.click();
    else {
      await page.locator('header [data-gx-menu-trigger]').first().click();
      await page.locator('[data-gx-menu] button', { hasText: 'Settings' }).first().click();
    }
  }
  const files = page.locator('button', { hasText: /^Files$/ }).first();
  await files.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail('Settings opened with no Files tab'));
  if (phone) await files.tap(); else await files.click();
  await page.waitForTimeout(300);
}

const rowButton = (page: Page, label: string) =>
  page.locator('div.justify-between', { has: page.locator(`text="${label}"`) }).locator('button').first();

const keys = (page: Page) =>
  page.evaluate(([a, b, c]) => ({ gx: localStorage.getItem(a), gmt: localStorage.getItem(b), session: localStorage.getItem(c) }), [GX_ENABLED, GMT_ENABLED, KEY]);

/** Flip Settings ▸ Files ▸ Autosave ▸ "Autosave to browser" through the real row, then close Settings. */
async function setAutosave(page: Page, on: boolean): Promise<void> {
  await openSessionSettings(page, false);
  const sw = rowButton(page, 'Autosave to browser');
  if (!(await sw.count())) fail('no "Autosave to browser" row in Settings ▸ Files');
  if (((await sw.getAttribute('aria-checked')) === 'true') !== on) await sw.click();
  await page.waitForTimeout(200);
  if (((await sw.getAttribute('aria-checked')) === 'true') !== on) fail(`the Autosave row did not turn ${on ? 'on' : 'off'}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch();
  const errors: string[] = [];

  // ── desktop ────────────────────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  await seed(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  console.log(`→ GET ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await settle(page, errors);

  // [1] opt-in, per app: app-gmt's toggle is ON, the Explorer's is unset
  if (await hasHero(page)) fail('[1] a first-run boot has a hero before any pick');
  await pickAndEdit(page);
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, errors);
  const k1 = await keys(page);
  if (await hasHero(page)) fail('[1] with the Explorer’s autosave at its default, a reload restored the edit (did it read gmt-autosave-enabled?)');
  if (k1.session) fail(`[1] with autosave off, a session was written (${k1.session.length} chars)`);
  if (k1.gx !== null || k1.gmt !== '1') fail(`[1] the keys moved by themselves (gx ${k1.gx}, gmt ${k1.gmt})`);
  console.log('✓ [1] autosave off by default (app-gmt’s on): an edit is not restored and nothing is written');

  // [1b] on through the real row
  await setAutosave(page, true);
  const k1b = await keys(page);
  if (k1b.gx !== '1') fail(`[1b] the row did not write gmt.ge.autosave-enabled (${k1b.gx})`);
  if (k1b.gmt !== '1') fail(`[1b] turning the Explorer’s autosave on changed gmt-autosave-enabled (${k1b.gmt})`);
  console.log('✓ [1b] the Settings row turned the Explorer’s autosave on, and gmt-autosave-enabled did not move');

  // [2] an edit
  const edited = await pickAndEdit(page);
  console.log(`✓ [2] picked and edited: ${edited.kind}, ${edited.n} stops`);

  // [3] reload → it comes back
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[3] no hero after the reload — the session did not come back'));
  await settle(page, errors);
  const back = await working(page);
  if (!back || back.sig !== edited.sig) fail(`[3] the reload brought back a different gradient:\n    before ${edited.sig}\n    after  ${back?.sig}`);
  console.log(`✓ [3] the reload restored the edit (${back!.n} stops, ${back!.kind}); stored ${(await stored(page))!.length} chars`);

  // [4] a first Ctrl+Z does not wipe it
  await page.locator('body').click({ position: { x: 5, y: 790 } }).catch(() => {});
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(700);
  const afterUndo = await working(page);
  if (!(await hasHero(page)) || !afterUndo || afterUndo.sig !== edited.sig) fail(`[4] the first Ctrl+Z after the reload changed the session (${afterUndo?.sig ?? 'no hero'})`);
  console.log('✓ [4] a first Ctrl+Z after the reload left the restored session alone');

  // [4b] a LIVE Mix survives a reload with its face open (the shell reopens the face that owns
  // a live input; opened afresh, enterMix would overwrite the restored blend).
  await page.locator('[data-gx-tray-tab="mix"]').first().click();
  await page.waitForTimeout(900);
  const trayFace = () => page.evaluate(`(function () { var r = document.querySelector('[data-gx-tray-root]'); return r && r.dataset.gxTray || null; })()`) as Promise<string | null>;
  if ((await trayFace()) !== 'mix' || (await working(page))?.kind !== 'build') fail(`[4b] could not open a live Mix (${await trayFace()}, ${(await working(page))?.kind})`);
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, errors);
  const mixBack = await working(page);
  if (mixBack?.kind !== 'build' || (await trayFace()) !== 'mix') fail(`[4b] a live Mix came back as ${mixBack?.kind} with the ${await trayFace()} face`);
  console.log('✓ [4b] a live Mix came back live, with its face open');

  // [5] a share link wins
  const shared = encodeShare({ stops: [
    { id: 'a', position: 0, color: '#123456', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 0.5, color: '#ABCDEF', bias: 0.5, interpolation: 'linear' },
    { id: 'c', position: 1, color: '#FEDCBA', bias: 0.5, interpolation: 'linear' },
  ], blendSpace: 'oklab', colorSpace: 'srgb' }, 'Shared smoke');
  await page.goto(`${URL}?g=${shared}`, { waitUntil: 'networkidle' });
  await settle(page, errors);
  const viaLink = await working(page);
  if (!viaLink || !viaLink.sig.includes('#123456') || viaLink.n !== 3) fail(`[5] the share link did not win over the stored session (${viaLink?.sig})`);
  // The link is applied by the shell AFTER boot, so it would show even if the stored session
  // had been restored underneath it — with that session's dials over the shared stops, and its
  // Mix face open. What says it was NOT restored: undoing the link does not reveal it.
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(600);
  const under = await working(page);
  if (under && under.kind !== 'empty') fail(`[5] the stored session was restored under the share link (undo revealed a ${under.kind} input)`);
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(600);
  if ((await working(page))?.sig !== viaLink!.sig) fail('[5] redo did not put the shared gradient back');
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, errors);
  const afterLink = await working(page);
  if (!afterLink || afterLink.sig !== viaLink!.sig) fail(`[5] after a reload without the link, the session is not the shared gradient (${afterLink?.sig})`);
  console.log('✓ [5] a share link won over the stored session, and became the session');

  // [6] garbage → clean start. The garbage is written from a pagehide listener registered
  // AFTER the app's, so it lands after the app's own flush.
  await page.evaluate((k) => { window.addEventListener('pagehide', () => localStorage.setItem(k, '{"format":"gmt-gx-session","version":1,"body":{"garbage":true')); }, KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, errors);
  if (await hasHero(page)) fail('[6] garbage storage did not fall back to a clean start (a hero is showing)');
  console.log('✓ [6] garbage in storage → a clean first-run boot, no pageerror');

  // [6b] off through the row: the stored session goes, app-gmt's key stays, nothing comes back
  const beforeOff = await pickAndEdit(page, 300, 300);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const storedOn = (await keys(page)).session;
  if (!storedOn) fail('[6b] (setup) with autosave on, the edit was not stored');
  await setAutosave(page, false);
  const k6 = await keys(page);
  if (k6.session) fail('[6b] turning autosave off left the stored session behind');
  if (k6.gx !== '0' || k6.gmt !== '1') fail(`[6b] the toggle wrote the wrong key (gx ${k6.gx}, gmt ${k6.gmt})`);
  // A session still in storage while the toggle is off (put back by hand, as the Storage
  // inspector or another tab could leave it) must not be restored either: off means off at boot.
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, storedOn!]);
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, errors);
  if (await hasHero(page)) fail(`[6b] with autosave off, the reload restored the session (${beforeOff.n} stops)`);
  if ((await keys(page)).session) fail('[6b] with autosave off, the stored session survived the boot (it should have been cleared, not kept or restored)');
  console.log('✓ [6b] off through the row: the stored session removed, gmt-autosave-enabled untouched, nothing restored');

  // [7] Settings ▸ Files ▸ Session, with autosave OFF
  const mine = await pickAndEdit(page, 520, 200);  await openSessionSettings(page, false);
  const saveBtn = rowButton(page, 'Save session to a file');
  if (!(await saveBtn.count())) fail('[7] no "Save session to a file" row in Settings ▸ Files');
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), saveBtn.click()]);
  const name = download.suggestedFilename();
  if (!name.endsWith('.gxsession.json')) fail(`[7] the download is named "${name}", not *.gxsession.json`);
  const savedText = readFileSync((await download.path())!, 'utf8');
  const saved = JSON.parse(savedText);
  if (saved.format !== 'gmt-gx-session' || saved.version !== 1 || !saved.body?.documents?.working) fail('[7] the downloaded file is not a v1 session with a working document');
  if ('favients' in saved.body.documents) fail('[7] the session file carries the favourites shelf');

  // A DIFFERENT session to load: the saved one with its working input swapped for a known gradient.
  const other = JSON.parse(savedText);
  other.body.documents.working.input = { kind: 'gradient', name: 'Loaded smoke', source: 'File', config: { stops: [
    { id: 'x', position: 0, color: '#FF00FF', bias: 0.5, interpolation: 'linear' },
    { id: 'y', position: 1, color: '#00FFFF', bias: 0.5, interpolation: 'linear' },
  ], blendSpace: 'oklab', colorSpace: 'srgb' } };
  other.body.documents.working.name = null;
  const otherText = encodeSession('gmt-gx-session', 1, other.body);
  const loadBtn = rowButton(page, 'Load session from a file');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), loadBtn.click()]);
  await chooser.setFiles({ name: 'other.gxsession.json', mimeType: 'application/json', buffer: Buffer.from(otherText) });
  await page.waitForTimeout(900);
  const loaded = await working(page);
  if (!loaded || !loaded.sig.includes('#FF00FF') || loaded.n !== 2) fail(`[7] the loaded file did not replace the working gradient (${loaded?.sig})`);
  await page.keyboard.press('Escape'); // close Settings
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(700);
  const undone = await working(page);
  if (!undone || undone.sig !== mine.sig) fail(`[7] one undo did not put back the session from before the load:\n    wanted ${mine.sig}\n    got    ${undone?.sig}`);
  await openSessionSettings(page, false);
  const [badChooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), rowButton(page, 'Load session from a file').click()]);
  await badChooser.setFiles({ name: 'bad.gxsession.json', mimeType: 'application/json', buffer: Buffer.from('this is not a session') });
  await page.waitForTimeout(700);
  const toast = await page.evaluate(`Array.prototype.slice.call(document.querySelectorAll('button[title="Dismiss"]')).map(function (b) { return b.textContent; }).join(' | ')`) as string;
  if (!/not a session/i.test(toast)) fail(`[7] a garbage file showed no refusal toast (toasts: ${toast || 'none'})`);
  const afterBad = await working(page);
  if (!afterBad || afterBad.sig !== mine.sig) fail('[7] a garbage file changed the working gradient');
  if (errors.length) fail(`[7] pageerror: ${errors.join(' | ')}`);
  console.log(`✓ [7] Settings: saved "${name}" (${savedText.length} chars), loaded another in one undo step, refused a garbage file with "${toast.split(' | ').pop()}"`);
  await ctx.close();

  // ── phone ──────────────────────────────────────────────────────────────────────────
  const pctx = await browser.newContext({ ...devices['Pixel 5'], viewport: { width: 393, height: 727 } });
  await seed(pctx);
  const phone = await pctx.newPage();
  phone.on('pageerror', (e) => errors.push(e.message));
  await phone.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await settle(phone, errors);
  await openSessionSettings(phone, true);
  for (const label of ['Save session to a file', 'Load session from a file']) {
    const b = await rowButton(phone, label).boundingBox();
    if (!b) fail(`[8] no "${label}" button on a phone`);
    if (b!.x < 0 || b!.x + b!.width > 393 + 1) fail(`[8] "${label}" runs past the phone screen (${Math.round(b!.x)}..${Math.round(b!.x + b!.width)})`);
  }
  const [pChooser] = await Promise.all([phone.waitForEvent('filechooser', { timeout: 5000 }), rowButton(phone, 'Load session from a file').tap()]);
  await pChooser.setFiles({ name: 'other.gxsession.json', mimeType: 'application/json', buffer: Buffer.from(otherText) });
  await phone.waitForTimeout(900);
  const pLoaded = await working(phone);
  if (!pLoaded || !pLoaded.sig.includes('#FF00FF')) fail(`[8] loading a session on a phone did not replace the working gradient (${pLoaded?.sig})`);
  if (errors.length) fail(`[8] pageerror: ${errors.join(' | ')}`);
  console.log('✓ [8] phone: the menu reaches Settings ▸ Files ▸ Session, both rows fit, Load works');

  await browser.close();
  console.log('\n✓ smoke-ge-session green');
}

main().catch(async (e) => {
  if (!process.exitCode) {
    console.log(`✗ ${e?.message ?? e}`);
    process.exitCode = 1;
  }
  process.exit(process.exitCode);
});
