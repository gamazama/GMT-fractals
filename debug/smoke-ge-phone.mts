/**
 * Smoke: the v2 shell on a PHONE (Phase F, 2026-09-10).
 *
 * Boots gradient-explorer.html in a Pixel 5 context (390×844, touch, coarse pointer)
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
 *   [5b] the Export TEXT PREVIEW on a phone (parity row O4, added 2026-09-23): the open category's
 *       note line says "Hold a format to see its text"; a CDP touch HELD 800 ms on the CSS row shows
 *       its text in a panel along the bottom of the screen, held open with a ×, and downloads
 *       nothing; the next TAP, on that row's Copy, copies (the hold's swallowed click did not eat
 *       it) exactly the previewed text; the × closes the panel and leaves the sheet. Falsified
 *       2026-09-23 by never swallowing the hold's click (`onClickCapture` in ExportMenu): red
 *       "[5b] holding the CSS row DOWNLOADED it (Snapchat.css)" — Chromium does raise a click
 *       after a long touch, so the swallow is load-bearing, not a belt-and-braces.
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
 *   [2b] the phone's ONE menu (added 2026-09-13, gradient-explorer/v2/ShellMenu.tsx): the top bar
 *       does not overflow, carries exactly one menu button and no separate Settings gear, and
 *       its controls take no more than 108 px (undo · redo · the menu, three 32 px boxes — 100 px
 *       with the 24 px menu it had until 2026-09-24's 8d); the menu opens
 *       inside the screen with Settings, Support and Send Feedback; Send Feedback closes the
 *       menu and opens a full-width sheet with the form's Send button, no sideways scroll, no
 *       page error and no error-boundary fallback; its × closes it.
 *   [10] desktop Help (added 2026-09-13): one help button beside a still-separate gear; it
 *       opens the registered Help menu with Support and Send Feedback (and not Settings); Send
 *       Feedback opens the form in a floating window inside the viewport, no page error, no
 *       error-boundary fallback; its × closes it.
 *       [2b] also: the phone menu has NO Keyboard Shortcuts (a phone has no keyboard).
 *   [11] GX's OWN help (added 2026-09-13, gradient-explorer/v2/help/): a fresh browser shows a
 *       What's New dot on the help button; the menu says "Support Gradient Explorer" and not
 *       "Support GMT"; Send Feedback offers the choice Nothing · Gradient · Screenshot, not GMT's
 *       "Include current scene"; Getting Started shows "Welcome to Gradient Explorer" and not
 *       "Welcome to GMT"; About expands with at least one attribution line read from the loaded
 *       catalogue; What's New opens GX's changelog, the dot goes, `gx.whatsNew.seenVersion` is
 *       written and GMT's `gmt.whatsNew.seenVersion` is not. About also links each loaded
 *       pack's credits file, and the core one resolves to the baked credits (2026-09-13).
 *       NO HINTS (owner, 2026-09-13): the help menu names no hints ([2b] phone, [11] desktop),
 *       and pressing H leaves `store.showHints` where it was.
 *   [3c] (phone) and [12] (desktop) the feedback ATTACHMENT, with the endpoint intercepted by
 *       `page.route` so no report is ever sent: choosing Screenshot shows a thumbnail, and Send
 *       carries `screenshot.json` whose `kind` is gx-screenshot, whose `image` is a
 *       data:image/jpeg, whose size by the endpoint's own estimate (¾ of the base64) is under
 *       200 000, with no gradient in it, `attachment_kind: screenshot` in the context, and a
 *       luminance spread of at least 8 over a 64×64 downsample (a blank capture measures 0; the
 *       real shell measured 68–75). [12] also: choosing Gradient carries `gradient.json`, kind
 *       gx-gradient, at least two stops and no image. Measured 2026-09-13: phone 591×1280 q0.8
 *       153 630 bytes; desktop busy wall 1280×800 q0.6 173 397 bytes; gradient 4 014 bytes.
 *
 * Falsified 2026-09-13 for the hint checks, [3c] and [12], each break reverted:
 *   · `hideHints: true` dropped from installGxHelp → "[2b] the phone menu offers hints".
 *   · the H shortcut registered regardless of `hideHints` (engine/plugins/Help.tsx) → "[11] H
 *     still toggles showHints (true → false) in an app with no hints".
 *   · the capture replaced by an empty canvas of the same size → "[3c] the screenshot is blank
 *     — luminance spread 0.0".
 *   · the screenshot file's `preview` dropped → "[3c] choosing Screenshot showed no thumbnail".
 *   · the size loop starting at quality 1.0 with a 9 MB ceiling → "[3c] the screenshot payload
 *     is 640215 bytes — the endpoint refuses 200 000 and over".
 *   · a `config` added to the screenshot document → "[3c] the screenshot payload carries a
 *     gradient too".
 *   · an `image` added to the gradient document → "[12] the gradient payload carries an image too".
 *   · the gradient capture returning null → "[12] the gradient went as "null", not gradient.json".
 *
 * Falsified 2026-09-13 for the [2b] Keyboard Shortcuts line and [11], each break reverted:
 *   · `shortcutsWhen` dropped from installGxHelp → "[2b] the phone menu offers Keyboard Shortcuts".
 *   · `gmtSupportConfig()` called without `appName` → "[11] no "Support Gradient Explorer"".
 *   · `configureFeedback(...)` not called → first cut "[11] the feedback form does not offer to
 *     attach the gradient"; since [3c] exists (same day, re-run) it reds earlier, at "[3c] the
 *     feedback form offers no "screenshot" attachment".
 *   · `setHelpTopicsLoader(...)` not called → "[11] Getting Started opened GMT's "Welcome to GMT"".
 *   · AboutGx's loaded-group filter never matching → "[11] About opened with no attribution line".
 *   · GX's seen key set to GMT's `gmt.whatsNew.seenVersion` → "[11] GX wrote GMT's
 *     gmt.whatsNew.seenVersion" (this check runs BEFORE the "stored no gx key" one, which the
 *     first cut had first and which reported this break under the wrong name).
 *   · `menu.setBadge('help', …)` dropped → "[11] no What's New dot on the help button".
 *   · the What's New item pointed at GMT's topic id → "[11] What's New did not open the
 *     Gradient Explorer changelog".
 *   · `markSeen` no longer clearing its cached unseen (engine/plugins/WhatsNew.tsx) →
 *     "[11] the What's New dot stayed after opening the changelog".
 *   Not separately falsified: the two "still offers / still says GMT" negatives — they can only
 *   fail with their positive twin passing if both labels render at once.
 *
 * Falsified 2026-09-13 for [2b] and [10], each break reverted:
 *   · the phone given the desktop controls (`phone ?` → `false ?` in GradientExplorerV2App) →
 *     "[2b] the Settings gear is still its own button on a phone".
 *   · the menu button widened to 32 px (`w-8` on ShellMenuButton) → "[2b] the top bar's
 *     controls take 108 px — wider than the 100 px they took before the menu". (32 px became the
 *     design on 2026-09-24 and the budget 108; that break now passes by construction.)
 *   · the phone menu's own rows dropped (`phoneMenuItems().slice(1)`) → "[2b] the phone menu has
 *     no "Settings"".
 *   · `feedbackMenuItem()` dropped from installHelp's extraItems (v2/main.tsx) → "[2b] the phone
 *     menu has no "Send Feedback"".
 *   · `applyPanelManifest([feedbackPanelEntry()])` disabled (v2/main.tsx) — the silent case:
 *     the item is there and does nothing → "[2b] Send Feedback opened no feedback sheet".
 *   · `FeedbackWindow` throwing on open → "[2b] the error boundary replaced the app after Send
 *     Feedback"; throwing on desktop only → the same message at [10]. A render crash is caught
 *     by AppErrorBoundary and is NOT a pageerror, which is why both steps look for the fallback
 *     BEFORE they look for the window (first cut checked the window first and reported the
 *     crash as "opened no feedback sheet").
 *   · the desktop help button removed → "[10] the desktop top bar has 0 help buttons".
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

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
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

/** The AppErrorBoundary fallback is up — a render crash is caught there and is NOT a pageerror. */
const crashed = (page: Page) => page.evaluate(`document.body.innerText.indexOf('Something broke while drawing the app') >= 0`) as Promise<boolean>;

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

/** What a Send carried, with the feedback endpoint INTERCEPTED — no report leaves the machine. */
type Sent = { filename: string | null; bytes: number; doc: Record<string, unknown> | null; context: Record<string, unknown> };

/**
 * Open the feedback form (the store's own open state), choose an attachment, write a message,
 * press Send, and return the request body the endpoint would have received. For the
 * screenshot, also the preview thumbnail's size and the pixel spread of the image sent.
 */
const sendFeedbackWith = async (page: Page, step: string, choice: 'gradient' | 'screenshot', tap: boolean) => {
  let body: { gmf?: { filename: string; content: string }; app_context?: Record<string, unknown> } | null = null;
  await page.unroute('**/functions/v1/submit-feedback').catch(() => {});
  await page.route('**/functions/v1/submit-feedback', async (route) => {
    body = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'smoke' }) });
  });
  await page.evaluate(`window.__engineStore.getState().togglePanel('Feedback', true)`);
  await page.waitForSelector('[data-gx-feedback]', { timeout: 4000 }).catch(() => fail(`[${step}] the feedback form did not open`));
  const btn = page.locator(`[data-gx-feedback] [data-feedback-attachment="${choice}"]`);
  if (!(await btn.count())) fail(`[${step}] the feedback form offers no "${choice}" attachment`);
  if (tap) await btn.tap(); else await btn.click();
  let preview: { w: number; h: number } | null = null;
  if (choice === 'screenshot') {
    const shown = await page.waitForSelector('[data-gx-feedback] [data-feedback-preview]', { timeout: 30000 }).then(() => true).catch(() => false);
    if (!shown) fail(`[${step}] choosing Screenshot showed no thumbnail`);
    preview = (await page.evaluate(`(() => { var i = document.querySelector('[data-feedback-preview]'); return i && i.complete ? { w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height } : null; })()`)) as { w: number; h: number } | null;
    if (!preview || preview.w < 20 || preview.h < 20) fail(`[${step}] the screenshot thumbnail is not showing (${JSON.stringify(preview)})`);
  }
  await page.fill('[data-gx-feedback] textarea', 'smoke:ge-phone — intercepted, never sent');
  const send = page.locator('[data-gx-feedback] button', { hasText: /^Send$/ });
  if (tap) await send.tap(); else await send.click();
  for (let i = 0; i < 40 && !body; i++) await page.waitForTimeout(250);
  if (!body) fail(`[${step}] Send made no request to the feedback endpoint`);
  const b = body as unknown as { gmf?: { filename: string; content: string }; app_context?: Record<string, unknown> };
  const text = b.gmf ? Buffer.from(b.gmf.content, 'base64').toString('utf8') : '';
  let doc: Record<string, unknown> | null = null;
  try { doc = text ? JSON.parse(text) : null; } catch { fail(`[${step}] the attachment is not JSON`); }
  // the endpoint's own estimate of the decoded size: 3/4 of the base64 length
  const bytes = b.gmf ? Math.floor(b.gmf.content.length * 0.75) : 0;
  let spread = -1;
  if (doc && typeof doc.image === 'string') {
    spread = (await page.evaluate(`new Promise(function (res) {
      var img = new Image(); img.onload = function () {
        var c = document.createElement('canvas'); c.width = 64; c.height = 64; var x = c.getContext('2d');
        x.drawImage(img, 0, 0, 64, 64); var d = x.getImageData(0, 0, 64, 64).data; var n = 0, m = 0, v = 0, i;
        for (i = 0; i < d.length; i += 4) { m += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } m /= n;
        for (i = 0; i < d.length; i += 4) { var l = (d[i] + d[i + 1] + d[i + 2]) / 3 - m; v += l * l; }
        res(Math.sqrt(v / n));
      }; img.onerror = function () { res(-2); }; img.src = ${JSON.stringify(doc.image)};
    })`)) as number;
  }
  await page.evaluate(`window.__engineStore.getState().togglePanel('Feedback', false)`);
  await page.waitForTimeout(200);
  return { sent: { filename: b.gmf?.filename ?? null, bytes, doc, context: b.app_context ?? {} } as Sent, spread, raw: text };
};

/** A screenshot payload: a JPEG data URL, under the endpoint's 200 KB, not blank, no gradient. */
const assertScreenshotPayload = (step: string, r: Awaited<ReturnType<typeof sendFeedbackWith>>) => {
  const { sent, spread, raw } = r;
  if (sent.filename !== 'screenshot.json') fail(`[${step}] the screenshot went as "${sent.filename}", not screenshot.json`);
  if (sent.doc?.kind !== 'gx-screenshot') fail(`[${step}] the screenshot's kind is "${String(sent.doc?.kind)}"`);
  if (typeof sent.doc?.image !== 'string' || !(sent.doc.image as string).startsWith('data:image/jpeg;base64,')) fail(`[${step}] the screenshot payload has no data:image/jpeg`);
  if (sent.bytes >= 200_000) fail(`[${step}] the screenshot payload is ${sent.bytes} bytes — the endpoint refuses 200 000 and over`);
  if (sent.doc && 'config' in sent.doc) fail(`[${step}] the screenshot payload carries a gradient too`);
  if (sent.context.attachment_kind !== 'screenshot') fail(`[${step}] app_context.attachment_kind is "${String(sent.context.attachment_kind)}"`);
  if (spread < 8) fail(`[${step}] the screenshot is blank — luminance spread ${spread.toFixed(1)} (a real shell measures tens)`);
  return `${sent.bytes} bytes, ${sent.doc?.width}×${sent.doc?.height} q${sent.doc?.quality}, spread ${spread.toFixed(0)}${raw.includes('data:image/png') ? ' (!png)' : ''}`;
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
  // clipboard: [5b] reads back what a tap on Copy wrote
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: PHONE, permissions: ['clipboard-read', 'clipboard-write'] });
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

  // [2b] the phone's ONE menu (2026-09-13): in the gear's place, the bar no wider, and it holds
  // Settings + the Help menu's Support and Send Feedback; Send Feedback opens a sheet.
  const bar = (await page.evaluate(`(() => {
    var h = document.querySelector('header'); if (!h) return null;
    var undo = h.querySelector('[title^="Undo"]'), last = h.lastElementChild;
    return {
      sw: h.scrollWidth, cw: h.clientWidth,
      cluster: undo && last ? Math.round(last.getBoundingClientRect().right - undo.getBoundingClientRect().left) : -1,
      triggers: h.querySelectorAll('[data-gx-menu-trigger]').length,
      gears: h.querySelectorAll('[aria-label="Settings"]').length,
    };
  })()`)) as { sw: number; cw: number; cluster: number; triggers: number; gears: number } | null;
  if (!bar) fail('[2b] no header');
  if (bar!.sw > bar!.cw) fail(`[2b] the top bar overflows: scrollWidth ${bar!.sw} > clientWidth ${bar!.cw}`);
  if (bar!.triggers !== 1) fail(`[2b] the phone top bar has ${bar!.triggers} menu buttons, expected exactly one`);
  if (bar!.gears !== 0) fail('[2b] the Settings gear is still its own button on a phone — it belongs in the menu');
  // undo · redo · gear measured 100 px before the menu existed (2026-09-13), and the menu took the
  // gear's 24 px box. Since 2026-09-24 it takes the bar's own 32 px box like undo / redo (owner,
  // 8d: the phone's only door to Settings, Help and Feedback was the smallest target in the bar),
  // so the budget is those 8 px more: 108. Anything past it is a new control, or a wider one.
  if (bar!.cluster > 108) fail(`[2b] the top bar's controls take ${bar!.cluster} px — wider than the 108 px budget (undo · redo · a 32 px menu)`);
  await page.locator('header [data-gx-menu-trigger]').tap();
  await page.waitForSelector('[data-gx-menu]', { timeout: 4000 }).catch(() => fail('[2b] tapping the menu button opened no menu'));
  const menuText = ((await page.textContent('[data-gx-menu]')) ?? '').replace(/\s+/g, ' ');
  for (const want of ['Settings', 'Support', 'Send Feedback']) {
    if (!menuText.includes(want)) fail(`[2b] the phone menu has no "${want}" (it reads: ${menuText})`);
  }
  // a phone has no keyboard (owner, 2026-09-13)
  if (menuText.includes('Keyboard Shortcuts')) fail(`[2b] the phone menu offers Keyboard Shortcuts (it reads: ${menuText})`);
  // GX has no hints (owner, 2026-09-13)
  if (/hints/i.test(menuText)) fail(`[2b] the phone menu offers hints (it reads: ${menuText})`);
  const menuBox = (await page.locator('[data-gx-menu]').boundingBox())!;
  const mb: Box = { x: Math.round(menuBox.x), y: Math.round(menuBox.y), w: Math.round(menuBox.width), h: Math.round(menuBox.height), r: Math.round(menuBox.x + menuBox.width), b: Math.round(menuBox.y + menuBox.height) };
  if (!inside(mb, W, H)) fail(`[2b] the phone menu runs out of the viewport: ${fmt(mb)}`);
  await page.locator('[data-gx-menu] button', { hasText: 'Send Feedback' }).tap();
  await page.waitForSelector('[data-gx-feedback], [role="alert"]', { timeout: 4000 }).catch(() => {});
  if (await crashed(page)) fail('[2b] the error boundary replaced the app after Send Feedback');
  if (!(await page.locator('[data-gx-feedback]').count())) fail('[2b] Send Feedback opened no feedback sheet');
  await page.waitForTimeout(300);
  const fb = (await page.evaluate(`(() => {
    var el = document.querySelector('[data-gx-feedback]'); var b = el.getBoundingClientRect();
    return { box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) },
      sw: el.scrollWidth, cw: el.clientWidth, send: !!Array.from(el.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Send'; }),
      fallback: document.body.innerText.indexOf('Something broke while drawing the app') >= 0, menuGone: !document.querySelector('[data-gx-menu]') };
  })()`)) as { box: Box; sw: number; cw: number; send: boolean; fallback: boolean; menuGone: boolean };
  if (fb.fallback) fail('[2b] the error boundary replaced the app after Send Feedback');
  if (errors.length) fail(`[2b] page error after Send Feedback: ${errors[0]}`);
  if (!fb.menuGone) fail('[2b] the menu stayed open over the feedback sheet');
  if (!inside(fb.box, W, H) || fb.box!.w < W - 2) fail(`[2b] the feedback sheet is not a full-width sheet inside the screen: ${fmt(fb.box)}`);
  if (fb.sw > fb.cw) fail(`[2b] the feedback sheet scrolls sideways: ${fb.sw} > ${fb.cw}`);
  if (!fb.send) fail('[2b] the feedback sheet has no Send button — the form did not render');
  await page.locator('[data-gx-feedback] [aria-label="Close feedback"]').tap();
  await page.waitForTimeout(300);
  if (await page.locator('[data-gx-feedback]').count()) fail('[2b] the feedback sheet did not close');
  console.log(`✓ [2b] one menu (controls ${bar!.cluster} px, no overflow) with Settings · Support · Send Feedback; the feedback sheet ${fmt(fb.box)}`);

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

  // [3b] the wall's fold button HIDES the hero (still mounted, L8) and shows it again
  const tall = b.hero!.h;
  const foldBtn = page.locator('[data-gx-tools="tools"] [data-gx-fold]');
  if (!(await foldBtn.count())) fail('[3b] no fold button among the wall tools');
  await foldBtn.tap();
  await page.waitForTimeout(300);
  const mounted = await page.evaluate(`!!document.querySelector('[data-gx-hero]')`);
  if (!mounted) fail('[3b] the hero unmounted on fold (L8)');
  b = await boxes(page);
  if (b.hero && b.hero.h > 0) fail(`[3b] the folded hero still shows ${b.hero.h} px — it should be hidden entirely`);
  if (b.tray && b.tray.h > 2) fail('[3b] a tray face survived the fold');
  await foldBtn.tap();
  await page.waitForTimeout(300);
  b = await boxes(page);
  if (Math.abs((b.hero?.h ?? 0) - tall) > 2) fail(`[3b] the button did not show the hero back at ${tall} (got ${b.hero?.h})`);
  console.log(`✓ [3b] the wall's fold button hides the ${Math.round(tall)} px hero and shows it again`);

  // [3c] feedback screenshot on a phone: a tap on Screenshot shows the thumbnail, and Send
  // carries a JPEG inside the one JSON attachment, under 200 KB, not blank, no gradient.
  const phoneShot = await sendFeedbackWith(page, '3c', 'screenshot', true);
  console.log(`✓ [3c] a phone screenshot: thumbnail shown; ${assertScreenshotPayload('3c', phoneShot)}`);

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

  // [5b] THE TEXT PREVIEW ON A PHONE (parity row O4, 2026-09-23). No hover, so a HOLD on a text
  // row shows its text in a panel along the bottom of the sheet — and must not also download.
  // The open category's reserved note line says so. The next TAP is a normal tap (the hold's
  // swallowed click must not eat it): Copy on the same row puts exactly the previewed text on the
  // clipboard, and the panel's × closes the panel alone, not the sheet.
  if (!(await page.$('[data-gx-export] [data-gx-format="css"]'))) {
    await page.locator('[data-gx-export] [data-gx-section="Web"]').tap();
    await page.waitForTimeout(250);
  }
  const hint5b = (await page.evaluate(`(function () { var n = document.querySelector('[data-gx-export] [data-gx-note]'); return n ? n.innerText.trim() : ''; })()`)) as string;
  if (!/^Hold a format/.test(hint5b)) fail(`[5b] the open category's note line does not say how to see a format's text ("${hint5b}")`);
  const cssRow = await page.locator('[data-gx-export] [data-gx-download="css"]').boundingBox();
  if (!cssRow) fail('[5b] no CSS row on the sheet');
  const held: string[] = [];
  const onDl = (d: { suggestedFilename(): string }) => held.push(d.suggestedFilename());
  page.on('download', onDl);
  const cdp5b = await ctx.newCDPSession(page);
  const at = { x: cssRow!.x + cssRow!.width / 3, y: cssRow!.y + cssRow!.height / 2, radiusX: 4, radiusY: 4, force: 1, id: 1 };
  await cdp5b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
  await page.waitForTimeout(800);
  await cdp5b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp5b.detach();
  await page.waitForTimeout(700);
  page.off('download', onDl);
  if (held.length) fail(`[5b] holding the CSS row DOWNLOADED it (${held[0]}) — a hold only shows the text`);
  type Pv = { id: string; pinned: boolean; text: string; x: number; y: number; r: number; b: number; close: boolean } | null;
  const readPv = () =>
    page.evaluate(`(function () {
      var p = document.querySelector('[data-gx-export-preview]'); if (!p) return null;
      var r = p.getBoundingClientRect();
      return { id: p.getAttribute('data-gx-export-preview'), pinned: p.hasAttribute('data-gx-preview-pinned'), text: p.querySelector('[data-gx-preview-text]').textContent,
        x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom), close: !!p.querySelector('[data-gx-preview-close]') };
    })()`) as Promise<Pv>;
  const pv5b = await readPv();
  if (!pv5b) fail('[5b] holding the CSS row showed no preview');
  if (pv5b!.id !== 'format:copy:css:ramp' || !pv5b!.pinned) fail(`[5b] the hold showed "${pv5b!.id}" (pinned ${pv5b!.pinned}), not the CSS row's text held open`);
  if (pv5b!.x < 0 || pv5b!.y < 0 || pv5b!.r > W + 1 || pv5b!.b > H + 1) fail(`[5b] the preview runs out of the viewport: x ${pv5b!.x}–${pv5b!.r}, y ${pv5b!.y}–${pv5b!.b}`);
  if (pv5b!.b < H - 2 || pv5b!.x > 1 || pv5b!.r < W - 1) fail(`[5b] the preview is not along the bottom of the screen (x ${pv5b!.x}–${pv5b!.r}, bottom ${pv5b!.b})`);
  if (!pv5b!.close) fail('[5b] a held preview has no ×');
  await page.locator('[data-gx-export] [data-gx-copy="css"]').tap();
  await page.waitForTimeout(300);
  // Windows' clipboard reads a written LF back as CRLF; only that is undone
  const clip5b = ((await page.evaluate(`navigator.clipboard.readText()`)) as string).replace(/\r\n/g, '\n');
  if (clip5b !== pv5b!.text) fail(`[5b] the next tap's Copy wrote ${clip5b.length} chars, the held preview shows ${pv5b!.text.length} — the tap was swallowed or the texts differ`);
  await page.locator('[data-gx-preview-close]').tap();
  await page.waitForTimeout(250);
  if (await readPv()) fail('[5b] the × did not close the preview');
  if (!(await page.$('[data-gx-export]'))) fail('[5b] closing the preview closed the Export sheet too');
  console.log(`✓ [5b] a hold shows the CSS along the bottom (y ${pv5b!.y}–${pv5b!.b}) without downloading; the next tap copies exactly that; × closes the preview alone`);
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
  const zoomish = labels.filter((l) => /zoom|fit/i.test(l));
  if (zoomish.join('|') !== 'Zoom in') fail(`[6] at 1:1 the zoom controls should be the zoom-in button alone, got: ${zoomish.join(', ') || 'nothing'}`);
  if (!labels.some((l) => /gradient/i.test(l))) fail(`[6] the hero's fold button is not among the wall tools: ${labels.join(', ')}`);
  console.log(`✓ [6] the tools at the bottom: the fold + Zoom in at 1:1: ${fmt(b.tools)}`);

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

  // [10] desktop Help: its own button beside a still-separate gear, the registered Help menu with
  // Support and Send Feedback, and Send Feedback opening the form in a floating window.
  const dhdr = (await dpage.evaluate(`(() => { var h = document.querySelector('header'); return { help: h.querySelectorAll('[data-gx-menu-trigger="help"]').length, gear: h.querySelectorAll('[aria-label="Settings"]').length }; })()`)) as { help: number; gear: number };
  if (dhdr.help !== 1) fail(`[10] the desktop top bar has ${dhdr.help} help buttons, expected one`);
  if (dhdr.gear !== 1) fail('[10] the desktop Settings gear is gone — only the phone folds it into the menu');
  await dpage.click('header [data-gx-menu-trigger="help"]');
  await dpage.waitForSelector('[data-gx-menu="help"]', { timeout: 4000 }).catch(() => fail('[10] the help button opened no menu'));
  const dmenu = ((await dpage.textContent('[data-gx-menu="help"]')) ?? '').replace(/\s+/g, ' ');
  for (const want of ['Support', 'Send Feedback']) {
    if (!dmenu.includes(want)) fail(`[10] the help menu has no "${want}" (it reads: ${dmenu})`);
  }
  if (dmenu.includes('Settings')) fail('[10] Settings is in the desktop help menu — it has its own gear there');
  await dpage.locator('[data-gx-menu="help"] button', { hasText: 'Send Feedback' }).click();
  await dpage.waitForSelector('[data-gx-feedback], [role="alert"]', { timeout: 4000 }).catch(() => {});
  if (await crashed(dpage)) fail('[10] the error boundary replaced the app after Send Feedback');
  if (!(await dpage.locator('[data-gx-feedback]').count())) fail('[10] Send Feedback opened no feedback window');
  await dpage.waitForTimeout(300);
  const dfb = (await dpage.evaluate(`(() => {
    var el = document.querySelector('[data-gx-feedback]'); var b = el.getBoundingClientRect();
    return { box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) },
      send: !!Array.from(el.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Send'; }),
      fallback: document.body.innerText.indexOf('Something broke while drawing the app') >= 0 };
  })()`)) as { box: Box; send: boolean; fallback: boolean };
  if (dfb.fallback) fail('[10] the error boundary replaced the app after Send Feedback');
  if (errors.length) fail(`[10] page error after Send Feedback: ${errors[0]}`);
  if (!dfb.send) fail('[10] the feedback window has no Send button — the form did not render');
  if (!inside(dfb.box, 1280, 800)) fail(`[10] the feedback window runs out of the viewport: ${fmt(dfb.box)}`);
  await dpage.click('[data-gx-feedback] [aria-label="Close feedback"]');
  await dpage.waitForTimeout(300);
  if (await dpage.locator('[data-gx-feedback]').count()) fail('[10] the feedback window did not close');
  console.log(`✓ [10] desktop: ? opens Help with Support + Send Feedback; the feedback window ${fmt(dfb.box)}`);

  // [11] GX's OWN help (owner, 2026-09-13): its name on Support, its attachment on Feedback,
  // its Getting Started (not GMT's), About with the catalogue's attribution, its What's New
  // behind a dot that the page clears.
  const bodyHas = (page: Page, text: string) => page.evaluate(`document.body.innerText.indexOf(${JSON.stringify(text)}) >= 0`) as Promise<boolean>;
  const openHelpMenu = async () => {
    if (!(await dpage.locator('[data-gx-menu="help"]').count())) await dpage.click('header [data-gx-menu-trigger="help"]');
    await dpage.waitForSelector('[data-gx-menu="help"]', { timeout: 4000 }).catch(() => fail('[11] the help button opened no menu'));
  };
  const helpRow = (label: string) => dpage.locator('[data-gx-menu="help"] button', { hasText: label }).first();
  const closeHelp = () => dpage.evaluate(`window.__engineStore.getState().closeHelp()`);
  if (!(await dpage.locator('[data-gx-menu-badge="help"]').count())) fail("[11] no What's New dot on the help button for a browser that has never opened it");
  await openHelpMenu();
  const m11 = ((await dpage.textContent('[data-gx-menu="help"]')) ?? '').replace(/\s+/g, ' ');
  if (!m11.includes('Support Gradient Explorer')) fail(`[11] no "Support Gradient Explorer" in the help menu (it reads: ${m11})`);
  if (m11.includes('Support GMT')) fail('[11] the help menu still says "Support GMT"');
  // GX has no hints: no Show Hints row, and H does not flip the invisible flag
  if (/hints/i.test(m11)) fail(`[11] the help menu offers hints (it reads: ${m11})`);
  await dpage.keyboard.press('Escape');
  await dpage.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
  const hintsBefore = await dpage.evaluate(`window.__engineStore.getState().showHints`);
  await dpage.keyboard.press('KeyH');
  await dpage.waitForTimeout(150);
  const hintsAfter = await dpage.evaluate(`window.__engineStore.getState().showHints`);
  if (hintsAfter !== hintsBefore) fail(`[11] H still toggles showHints (${hintsBefore} → ${hintsAfter}) in an app with no hints`);
  await openHelpMenu();
  // the feedback form offers GX's attachment, not GMT's scene
  await helpRow('Send Feedback').click();
  await dpage.waitForSelector('[data-gx-feedback]', { timeout: 4000 }).catch(() => fail('[11] Send Feedback opened no window'));
  const fbText = ((await dpage.textContent('[data-gx-feedback]')) ?? '');
  const choices = await dpage.locator('[data-gx-feedback] [data-feedback-attachment]').evaluateAll((els) => els.map((e) => e.getAttribute('data-feedback-attachment')).join(','));
  if (choices !== 'none,gradient,screenshot') fail(`[11] the feedback form's attachment choice is "${choices}", expected none,gradient,screenshot`);
  if (fbText.includes('Include current scene')) fail(`[11] the feedback form still offers GMT's "Include current scene"`);
  await dpage.click('[data-gx-feedback] [aria-label="Close feedback"]');
  // Getting Started is GX's
  await openHelpMenu();
  await helpRow('Getting Started').click();
  const gsOk = await dpage.waitForFunction(`document.body.innerText.indexOf('Welcome to Gradient Explorer') >= 0`, null, { timeout: 8000 }).then(() => true).catch(() => false);
  if (await bodyHas(dpage, 'Welcome to GMT')) fail(`[11] Getting Started opened GMT's "Welcome to GMT"`);
  if (!gsOk) fail('[11] Getting Started did not open "Welcome to Gradient Explorer"');
  await closeHelp();
  // About: expands in the menu, with at least one attribution line read from the catalogue
  await openHelpMenu();
  await helpRow('About Gradient Explorer').click();
  const attrib = await dpage.waitForSelector('[data-gx-menu="help"] [data-gx-about-attribution]', { timeout: 8000 }).then(() => true).catch(() => false);
  if (!attrib) fail('[11] About opened with no attribution line (or did not open)');
  const attribN = await dpage.locator('[data-gx-about-attribution]').count();
  // …and the CREDITS FILE of every loaded pack (2026-09-13): the core pack's link must be there
  // and must resolve to the baked credits, not to a 404. Falsified by hiding the credits line
  // (`false && credits.length`): red "[11] About links no credits file for the core pack".
  const coreCredits = await dpage.locator('[data-gx-about-credits-pack="core"]').getAttribute('href').catch(() => null);
  if (!coreCredits) fail('[11] About links no credits file for the core pack');
  const creditsBody = await dpage.evaluate(async (u) => { const r = await fetch(u); return r.ok ? (await r.text()).slice(0, 400) : `HTTP ${r.status}`; }, coreCredits!);
  if (!/^Core pack — credits and licences/.test(creditsBody)) fail(`[11] the core credits link does not open the credits file (${creditsBody.slice(0, 60)})`);
  // The two lines the release's licensing posture rests on (owner, 2026-09-23): the built-in
  // presets' sources, and the takedown path. Neither is a catalogue bundle, so the attribution
  // list above never shows them.
  const presetsLine = (await dpage.locator('[data-gx-about-presets]').textContent().catch(() => null)) ?? '';
  if (!/CARTOColors[\s\S]*ColorBrewer[\s\S]*Turbo/.test(presetsLine)) fail(`[11] About does not credit the built-in presets' sources (${presetsLine.slice(0, 60)})`);
  const takedownLine = (await dpage.locator('[data-gx-about-takedown]').textContent().catch(() => null)) ?? '';
  if (!/removed/.test(takedownLine)) fail('[11] About has no line saying how to ask for a gradient to be credited differently or removed');
  // What's New: opens GX's changelog and clears the dot
  await helpRow("What's New").click();
  const wnOk = await dpage.waitForFunction(`document.body.innerText.indexOf('the new Gradient Explorer') >= 0`, null, { timeout: 8000 }).then(() => true).catch(() => false);
  if (!wnOk) fail("[11] What's New did not open the Gradient Explorer changelog");
  await dpage.waitForTimeout(200);
  if (await dpage.locator('[data-gx-menu-badge="help"]').count()) fail("[11] the What's New dot stayed after opening the changelog");
  const seen = (await dpage.evaluate(`[localStorage.getItem('gx.whatsNew.seenVersion'), localStorage.getItem('gmt.whatsNew.seenVersion')]`)) as [string | null, string | null];
  if (seen[1] !== null) fail(`[11] GX wrote GMT's gmt.whatsNew.seenVersion (${seen[1]}) — the two apps' dots would clear each other`);
  if (!seen[0]) fail("[11] opening What's New stored no gx.whatsNew.seenVersion");
  await closeHelp();
  // [12] the two attachments are one-of: Gradient sends the gradient and no image, Screenshot
  // sends the image and no gradient (desktop, a busy wall, a gradient on the hero).
  const grad = await sendFeedbackWith(dpage, '12', 'gradient', false);
  if (grad.sent.filename !== 'gradient.json') fail(`[12] the gradient went as "${grad.sent.filename}", not gradient.json`);
  if (grad.sent.doc?.kind !== 'gx-gradient') fail(`[12] the gradient's kind is "${String(grad.sent.doc?.kind)}"`);
  const stops = (grad.sent.doc?.config as { stops?: unknown[] } | undefined)?.stops;
  if (!Array.isArray(stops) || stops.length < 2) fail(`[12] the gradient payload has no stops (${JSON.stringify(grad.sent.doc?.config)?.slice(0, 80)})`);
  if (grad.raw.includes('data:image')) fail('[12] the gradient payload carries an image too');
  if (grad.sent.context.attachment_kind !== 'gradient') fail(`[12] app_context.attachment_kind is "${String(grad.sent.context.attachment_kind)}"`);
  const deskShot = await sendFeedbackWith(dpage, '12', 'screenshot', false);
  const deskShotLine = assertScreenshotPayload('12', deskShot);
  console.log(`✓ [12] Gradient sends ${stops!.length} stops and no image (${grad.sent.bytes} bytes); Screenshot sends ${deskShotLine}`);

  console.log(`✓ [11] GX help: Support Gradient Explorer, Nothing · Gradient · Screenshot, GX Getting Started, About with ${attribN} attribution lines, What's New clears its dot (seen ${seen[0]}, GMT's key untouched)`);
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
