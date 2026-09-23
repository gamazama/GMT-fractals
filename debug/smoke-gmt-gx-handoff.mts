/**
 * smoke-gmt-gx-handoff — the trip from GMT's My Gradients panel to the Gradient Explorer and back
 * (owner decisions 2026-09-23; app-gmt/explorerTrip.ts, gradient-explorer/v2/fromGmt.ts,
 * palette/core/explorerHandoff.ts, engine-gmt/utils/sceneStash.ts). Real clicks throughout: the
 * favourite swatch, the Destination select, the Explorer button, Back to GMT.
 *
 *   [1a] A FRESH BOOT, default Destination (layer 1): the Explorer opens on gradient 1 — which on
 *       a fresh Mandelbulb is ONE white stop, and arrives as that solid colour (the shared gate
 *       refuses a one-stop config; before the fix this sent nothing at all)
 *   [1] NO FAVOURITE APPLIED: with the Destination on Coloring · Layer 2, the Explorer button
 *       opens a GX tab whose working gradient is layer 2's gradient (the Destination's, not
 *       gradient 1), used "From GMT", nothing shown selected; the one-shot key is gone
 *   [2] A FAVOURITE APPLIED: clicking "Smoke Fav A" in My Gradients, then the Explorer button,
 *       opens a GX tab on exactly that favourite, shown SELECTED (heroSelection: favients / its
 *       id) — and it REPLACED the GX session restored from [1]'s tab (autosave on): one Ctrl+Z
 *       does not reveal it (a share link's pre-emption, not a restore underneath)
 *   [3] BACK TO GMT, GMT TAB ALIVE: the GX tab closes itself; the GMT tab is still there with its
 *       scene, and the trip's scene stash is cleared (the GX tab announced the return)
 *   [4] BACK TO GMT, GMT TAB GONE: apply "Smoke Fav B" (an unsaved change), Explorer, then close
 *       the GMT tab; Back to GMT in the GX tab lands on `app-gmt.html?from=gx`, which restores
 *       the stashed scene (Fav B on layer 2), strips the flag, keeps it UNSAVED, and consumes
 *       the stash
 *   [5] BACK TO GMT, CLOSE REFUSED: a GX page the user opened themselves (not script-opened,
 *       history 2) with a live trip — the GMT tab answers, the browser refuses the close, and the
 *       page falls back to the same restore
 *   [6] `?from=gx` with nothing stashed: a normal boot plus a toast saying so, flag stripped
 *
 * Wants `npm run dev` on 3400. HMR is blocked (the Vite socket is answered by a mock), so another
 * agent's edits cannot reload a page mid-run; the live-module reads resolve the URL the page
 * actually loaded, so an edited module does not put this in the dual-instance state. Boots
 * app-gmt three times under SwiftShader — allow ~3 minutes.
 *
 * FALSIFIED 2026-09-23 against the dev server, thirteen breaks, one at a time, each reverted — every
 * one red at the step it names:
 *   · a one-stop gradient not padded (explorerTrip `gradientAt`) → [1a] (GX got nothing: "empty").
 *     Found by the first falsification pass: the break meant for [1] went red with an EMPTY GX
 *     rather than the wrong gradient, because a fresh Mandelbulb's gradient 1 is one white stop.
 *   · the Destination ignored (always the first host target) → [1].
 *   · `applyGradientFromGmt` a no-op → [1] (and [1]'s session setup).
 *   · the panel's apply without `favId` → [2] "shown SELECTED" (null).
 *   · session.ts without the `gmtIncomingWaiting()` pre-emption → [2] "REPLACED": the undo revealed
 *     [1]'s layer-2 gradient restored underneath.
 *   · Back to GMT as the plain link it was → [3] "closed the GX tab".
 *   · the GMT tab never answering the trip ping → [3] "closed the GX tab" (it fell back instead).
 *   · the return not clearing the stash → [3] "stash was cleared".
 *   · `markSceneUnsaved` not called after the restore → [4] "still marked UNSAVED".
 *   · the `?from=gx` branch never reading the stash → [4] ×4 (restore, unsaved, flag, consumed).
 *   · the flag not stripped → [4] "flag was stripped".
 *   · a refused close taken as a close → [5] (the page stayed on the Explorer).
 *   · no toast for a missing stash → [6].
 *
 * Run: `npx tsx debug/smoke-gmt-gx-handoff.mts` (UNTIL=<n> stops after step n).
 */
import { chromium, type Page, type BrowserContext } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const BASE = (process.env.ENGINE_URL_BASE || 'http://localhost:3400/').replace(/\/?$/, '/');
const GMT = BASE + 'app-gmt.html';
const UNTIL = Number(process.env.UNTIL || 99);

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const stops = (hexes: string[]) => hexes.map((color, i) => ({ id: `s${i}`, position: i / (hexes.length - 1), color, bias: 0.5, interpolation: 'linear' }));
const FAV_A = { id: 'fav-smoke-a', name: 'Smoke Fav A', source: 'Smoke', group: 'g-smoke', createdAt: 1, config: { stops: stops(['#0B1F4F', '#E03A3A', '#F8E16C']), colorSpace: 'srgb', blendSpace: 'oklab' } };
const FAV_B = { id: 'fav-smoke-b', name: 'Smoke Fav B', source: 'Smoke', group: 'g-smoke', createdAt: 2, config: { stops: stops(['#103010', '#40C0A0', '#F0F0FF', '#602080']), colorSpace: 'srgb', blendSpace: 'oklab' } };

/** favientSig's rule (stops only; the colour-space flag is ignored), as page-side source. */
const SIG_FN = `function (c) {
  var st = Array.isArray(c) ? c : (c && c.stops) || [];
  if (!st.length) return 'ramp:' + ((c && c.ramp) || '');
  return st.map(function (s) { var b = typeof s.bias === 'number' ? Math.round(s.bias * 1000) : 500; return Math.round(s.position * 1000) + ':' + String(s.color).toUpperCase() + ':' + (s.interpolation || 'linear') + ':' + b; }).join('|');
}`;
const sigNode = (c: { stops: { position: number; color: string; interpolation?: string; bias?: number }[] }): string =>
  c.stops.map((s) => `${Math.round(s.position * 1000)}:${s.color.toUpperCase()}:${s.interpolation || 'linear'}:${Math.round((s.bias ?? 0.5) * 1000)}`).join('|');

const seed = async (ctx: BrowserContext): Promise<void> => {
  await seedGeSmokeState(ctx);
  await ctx.addInitScript((favs: unknown[]) => {
    try {
      if (localStorage.getItem('smoke.gmtgx.seeded')) return;
      localStorage.setItem('smoke.gmtgx.seeded', '1');
      localStorage.setItem('gmt.favients', JSON.stringify(favs));
      localStorage.setItem('gmt.favients.groups', JSON.stringify({ 'g-smoke': 'Smoke Handoff' }));
      localStorage.setItem('gmt.favients.seeded', '1');
      // The Explorer's autosave ON, so a closed GX tab leaves a session for [2] to pre-empt.
      localStorage.setItem('gmt.ge.autosave-enabled', '1');
      localStorage.setItem('gmt.ge.autosave-interval-sec', '600');
    } catch { /* */ }
  }, [FAV_A, FAV_B]);
};

const errorsOf = (page: Page, into: string[], tag: string): void => {
  page.on('pageerror', (e) => into.push(`${tag}: ${e.message}`));
};

const bootGmt = async (page: Page): Promise<void> => {
  await page.waitForFunction('!!window.__store', null, { timeout: 90000 });
  await page.waitForSelector('[aria-label="File"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(`window.__sig = ${SIG_FN}; true`);
};

const gmtState = (page: Page) =>
  page.evaluate(`(() => {
    var s = window.__store.getState();
    return { g1: window.__sig(s.coloring.gradient), g2: window.__sig(s.coloring.gradient2), dirty: s.isSceneDirty(), formula: s.formula,
      stash: localStorage.getItem('gmt-gx-scene-stash'), stashAt: localStorage.getItem('gmt-gx-scene-stash-at'), url: location.href };
  })()`) as Promise<{ g1: string; g2: string; dirty: boolean; formula: string; stash: string | null; stashAt: string | null; url: string }>;

/** Import the module instance the page itself loaded (its URL may carry Vite's `?t=`). */
const LIVE_FN = `async function (path) {
  var hit = performance.getEntriesByType('resource').map(function (e) { return e.name; }).filter(function (n) { try { return new URL(n).pathname === path; } catch (e) { return false; } });
  return import(hit.length ? hit[hit.length - 1] : path);
}`;

const gxReady = async (gx: Page): Promise<void> => {
  await gx.waitForLoadState('domcontentloaded');
  await gx.waitForFunction('typeof window.__gxWorking === "function"', null, { timeout: 60000 });
  await gx.evaluate(`window.__sig = ${SIG_FN}; window.__live = ${LIVE_FN}; true`);
  // The hand-off lands through a pick → an effect → use(): poll for a working gradient.
  await gx.waitForFunction('(function () { var w = window.__gxWorking(); return w && w.input && w.input.kind === "gradient"; })()', null, { timeout: 15000 }).catch(() => {});
  await gx.waitForTimeout(600);
};

const gxState = (gx: Page) =>
  gx.evaluate(`(async () => {
    var w = window.__gxWorking();
    var hs = await window.__live('/palette/store/heroSelection.ts');
    var a = hs.getActiveHeroSelection();
    return { kind: w.input.kind, source: w.input.source || null, sig: w.input.config ? window.__sig(w.input.config) : null,
      active: a ? { mode: a.mode, key: a.key } : null, incoming: localStorage.getItem('gmt.gx.incoming'), url: location.href };
  })()`) as Promise<{ kind: string; source: string | null; sig: string | null; active: { mode: string; key: string } | null; incoming: string | null; url: string }>;

const favSwatch = (page: Page, name: string) =>
  page.locator(`[data-slot][title^="${name}"] button, [data-slot] canvas[aria-label="${name}"]`).first();

const pressExplorer = async (ctx: BrowserContext, page: Page): Promise<Page> => {
  const btn = page.locator('button[title="Open GMT Gradient Explorer (new tab)"]').first();
  const [gx] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), btn.click()]);
  return gx;
};

async function main(): Promise<void> {
  const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  await ctx.routeWebSocket(/./, () => {});
  await seed(ctx);
  const errors: string[] = [];
  const gmt = await ctx.newPage();
  errorsOf(gmt, errors, 'gmt');
  await gmt.goto(GMT, { waitUntil: 'domcontentloaded' });
  await bootGmt(gmt);

  const panelOpen = await gmt.evaluate(`!!((window.__store.getState().panels || {}).Favients || {}).isOpen`);
  if (!panelOpen) {
    check('setup: the My Gradients panel is open on a first boot', false);
    throw new Error('My Gradients panel not open');
  }

  // ── [1a] a fresh boot, default Destination: gradient 1, even when it is ONE stop ──────────
  const s0 = await gmtState(gmt);
  const g1Raw = (await gmt.evaluate(`JSON.stringify(window.__store.getState().coloring.gradient)`)) as string;
  const gx0 = await pressExplorer(ctx, gmt);
  errorsOf(gx0, errors, 'gx0');
  await gxReady(gx0);
  const x0 = await gxState(gx0);
  const g1Stops = (JSON.parse(g1Raw).stops ?? JSON.parse(g1Raw)) as { color: string }[];
  const solid = g1Stops.length === 1 ? `0:${g1Stops[0].color.toUpperCase()}:` : null;
  check('[1a] default Destination: the GX working gradient is gradient 1 (a single stop arrives as that solid colour)',
    x0.kind === 'gradient' && x0.source === 'From GMT' && (solid ? !!x0.sig?.startsWith(solid) && x0.sig.includes(`1000:${g1Stops[0].color.toUpperCase()}:`) : x0.sig === s0.g1),
    `${g1Stops.length} stop(s) in GMT; GX ${x0.kind} / ${x0.source} / ${x0.sig?.slice(0, 50)}`);
  await gx0.goto('about:blank');
  await gx0.close();

  // ── [1] no favourite applied: the Destination's gradient ──────────────────────────────
  await gmt.locator('select:has(option[value="coloring-2"])').first().selectOption('coloring-2');
  await gmt.waitForTimeout(300);
  const s1 = await gmtState(gmt);
  check('[1] setup: layer 2 and gradient 1 differ, so the Destination is what is measured', s1.g1 !== s1.g2, `${s1.g1.slice(0, 40)} vs ${s1.g2.slice(0, 40)}`);
  const gx1 = await pressExplorer(ctx, gmt);
  errorsOf(gx1, errors, 'gx1');
  await gxReady(gx1);
  const x1 = await gxState(gx1);
  check('[1] the GX tab opened from GMT with a trip id', /[?&]from=gmt/.test(x1.url) && /[?&]trip=/.test(x1.url), x1.url);
  check('[1] its working gradient is the Destination\'s (layer 2), used "From GMT"', x1.kind === 'gradient' && x1.sig === s1.g2 && x1.source === 'From GMT',
    `${x1.kind} / ${x1.source} / ${x1.sig?.slice(0, 40)}`);
  check('[1] no favourite is shown selected', !x1.active || x1.active.mode !== 'favients', JSON.stringify(x1.active));
  check('[1] the one-shot key is gone', x1.incoming === null);
  // Leave through pagehide (the GX autosave's flush), so [2] has a stored session to pre-empt.
  await gx1.goto('about:blank');
  await gx1.close();
  const session = await gmt.evaluate(`localStorage.getItem('gmt.ge.session')`);
  check('[1] setup: the closed GX tab left an autosaved session', !!session);
  if (UNTIL <= 1) return finish(browser, errors);

  // ── [2] a favourite applied: that favourite, selected, replacing the session ─────────────
  await favSwatch(gmt, FAV_A.name).click();
  await gmt.waitForTimeout(500);
  const s2 = await gmtState(gmt);
  check('[2] the click applied Fav A to the Destination (layer 2)', s2.g2 === sigNode(FAV_A.config), s2.g2.slice(0, 60));
  check('[2] …which is an unsaved change', s2.dirty === true);
  const gx2 = await pressExplorer(ctx, gmt);
  errorsOf(gx2, errors, 'gx2');
  await gxReady(gx2);
  const x2 = await gxState(gx2);
  check('[2] the GX working gradient is Fav A, used "From GMT"', x2.kind === 'gradient' && x2.sig === sigNode(FAV_A.config) && x2.source === 'From GMT',
    `${x2.kind} / ${x2.source} / ${x2.sig?.slice(0, 40)}`);
  check('[2] Fav A is shown SELECTED (heroSelection favients / its id)', x2.active?.mode === 'favients' && x2.active?.key === FAV_A.id, JSON.stringify(x2.active));
  const stash2 = await gmtState(gmt);
  check('[2] the Explorer button stashed the scene', !!stash2.stash && !!stash2.stashAt, `${stash2.stash?.length ?? 0} chars`);
  console.log(`      (the stash is ${((stash2.stash?.length ?? 0) / 1024).toFixed(1)} KB for this scene)`);
  await gx2.keyboard.press('Control+z');
  await gx2.waitForTimeout(700);
  const x2u = await gxState(gx2);
  check('[2] it REPLACED the session: one Ctrl+Z does not reveal the restored session\'s gradient', x2u.sig !== s1.g2,
    `after undo: ${x2u.kind} ${x2u.sig?.slice(0, 40)}`);
  await gx2.keyboard.press('Control+y');
  await gx2.waitForTimeout(500);
  if (UNTIL <= 2) return finish(browser, errors);

  // ── [3] Back to GMT with the GMT tab alive: the GX tab closes ────────────────────────────
  const closed3 = gx2.waitForEvent('close', { timeout: 5000 }).then(() => true, () => false);
  await gx2.locator('a[title="Back to the GMT studio"]').first().click();
  check('[3] Back to GMT closed the GX tab', await closed3);
  await gmt.waitForTimeout(500);
  const s3 = await gmtState(gmt);
  check('[3] the GMT tab is alive with its scene (Fav A on layer 2, still unsaved)', s3.g2 === sigNode(FAV_A.config) && s3.dirty === true);
  check('[3] the trip\'s scene stash was cleared by the return', s3.stash === null && s3.stashAt === null);
  if (UNTIL <= 3) return finish(browser, errors);

  // ── [4] Back to GMT with the GMT tab gone: the stash restores, unsaved ───────────────────
  await favSwatch(gmt, FAV_B.name).click();
  await gmt.waitForTimeout(500);
  const s4 = await gmtState(gmt);
  check('[4] setup: Fav B applied (layer 2), unsaved', s4.g2 === sigNode(FAV_B.config) && s4.dirty === true);
  const gx4 = await pressExplorer(ctx, gmt);
  errorsOf(gx4, errors, 'gx4');
  await gxReady(gx4);
  await gmt.close(); // the tab is gone (closed by the user, or discarded by a phone)
  await gx4.locator('a[title="Back to the GMT studio"]').first().click();
  await gx4.waitForURL(/app-gmt\.html/, { timeout: 10000 }).catch(() => {});
  const gmt4 = gx4; // this tab is GMT now
  await bootGmt(gmt4);
  const r4 = await gmtState(gmt4);
  check('[4] the GX tab went to GMT and the stashed scene came back (Fav B on layer 2)', r4.g2 === sigNode(FAV_B.config), `${r4.url} ${r4.g2.slice(0, 40)}`);
  check('[4] it is still marked UNSAVED', r4.dirty === true);
  check('[4] the ?from=gx flag was stripped', !/[?&]from=gx/.test(r4.url), r4.url);
  check('[4] the stash was consumed', r4.stash === null && r4.stashAt === null);
  if (UNTIL <= 4) return finish(browser, errors);

  // ── [5] close refused: a GX page the user opened, with a live trip ───────────────────────
  const gx5 = await pressExplorer(ctx, gmt4);
  errorsOf(gx5, errors, 'gx5');
  await gxReady(gx5);
  const direct = await ctx.newPage();
  errorsOf(direct, errors, 'direct');
  await direct.goto('about:blank');
  await direct.goto(gx5.url(), { waitUntil: 'domcontentloaded' });
  await direct.waitForFunction('typeof window.__gxWorking === "function"', null, { timeout: 60000 });
  await direct.waitForTimeout(800);
  const len5 = await direct.evaluate('history.length');
  await direct.locator('a[title="Back to the GMT studio"]').first().click();
  await direct.waitForURL(/app-gmt\.html/, { timeout: 10000 }).catch(() => {});
  const stillOpen = !direct.isClosed();
  check(`[5] the self-opened GX page (history ${len5}) was NOT closed — it fell back to GMT`, stillOpen && /app-gmt\.html/.test(direct.url()), direct.url());
  if (stillOpen) {
    await bootGmt(direct);
    const r5 = await gmtState(direct);
    check('[5] the fallback restored the stashed scene (Fav B on layer 2), unsaved', r5.g2 === sigNode(FAV_B.config) && r5.dirty === true);
  }
  await gx5.close();
  if (UNTIL <= 5) return finish(browser, errors);

  // ── [6] ?from=gx with nothing stashed ─────────────────────────────────────────────────────
  const p6 = await ctx.newPage();
  errorsOf(p6, errors, 'p6');
  await p6.goto(GMT + '?from=gx', { waitUntil: 'domcontentloaded' });
  await bootGmt(p6);
  const r6 = await gmtState(p6);
  const TOASTS = `Array.prototype.map.call(document.querySelectorAll('button[title="Dismiss"]'), function (b) { return b.textContent || ''; }).join(' | ')`;
  await p6.waitForFunction(`/Could not bring your scene back/.test(${TOASTS})`, null, { timeout: 15000 }).catch(() => {});
  const toast6 = (await p6.evaluate(TOASTS)) as string;
  check('[6] nothing stashed: a toast says the scene could not be brought back', /Could not bring your scene back/.test(toast6), toast6.slice(0, 120));
  check('[6] …a normal boot (not Fav B), the flag stripped', r6.g2 !== sigNode(FAV_B.config) && !/[?&]from=gx/.test(r6.url));

  return finish(browser, errors);
}

async function finish(browser: { close: () => Promise<void> }, errors: string[]): Promise<void> {
  check('no pageerror in any tab', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
