/**
 * smoke-ge-ground — ONE GROUND, MANY SETS (GE v2 Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block): the ground shows one
 * set at a time, the rail names the sets, the tile follows the count.
 *
 *   [1] a fresh shelf: the ground is All (the pad and Filters are there, four tools), and the
 *       rail has no dated bin yet
 *   [2] pick a tile — after the Recent sync the rail shows Today · 1; a second pick → Today · 2
 *   [3] click Today — the ground IS that bin: the title says Today, its two tiles sit on ONE
 *       canvas at the wall's own left edge (gutter 0), the tile is large (the canvas is one
 *       short row, not a wall), the pad and Filters are gone, the tool palette is zoom only
 *   [4] click the OLDER tile in Today — the working gradient is that pick again (a set tile
 *       is a shelf pick: same mode, same shell rules)
 *   [5] click All — the pad, Filters and the four tools are back, the gutter is back
 *   [6] search narrows All; the sentence carries the count (the search pill does not repeat
 *       it on a desk, 2026-09-24); "Group these N" (it said "Keep these N") files the narrowed
 *       wall as a group and puts it on the ground: a lit group chip with that count, the
 *       title carrying the label
 *   [7] reload — the ground comes back on that group (the set id persists)
 *   [8] the pad is the wall's map (D.2): on All the scrollbar beside the pad carries a thumb
 *       for the lightness on screen, and scrolling the wall moves it
 *   [9] the pad follows the Arrange state: Rows by = Vividness puts chroma on the pad's Y
 *       and lightness on the strip; Rows by = Complexity falls back to the default pad and
 *       the chroma strip. The lens is there in BOTH — superseded 2026-09-09: it used to be
 *       withheld when the rows were not on a colour axis, because it was derived from the
 *       visible lightness bands. It is the scroll position now, which is always defined
 *       (owner: "just map it by scroll position and not by lightness").
 *   (The old [9]–[10], the Snapshots set, were removed with the feature on 2026-09-08.)
 *   [10] Esc in the SEARCH BOX (2026-09-13): with the Filters rows and the Adjust face both
 *       open, Esc in a non-empty search clears the query and stops there — the rows and the
 *       face stay; Esc again in the now-empty box closes the rows (their capture listener);
 *       Esc once more closes the face (the shell's chain). Falsified the same day two ways,
 *       each reverted: dropping the input's `stopPropagation` reds "clearing the search also
 *       closed the Adjust face (null)"; dropping the Filters listener's search exception reds
 *       "Esc in a non-empty search did not clear it" (the rows' capture listener swallows the
 *       key before the box ever sees it, closing the rows instead).
 *   [11] a MIXED file drop (parity checklist K7, 2026-09-13): an image and a .ggr in ONE drop
 *       load the image (the Image face opens) AND import the gradient onto the shelf — with
 *       the image first, which is the order that used to swallow the gradient, and again
 *       with the gradient first, which used to swallow the image. Falsified the same day by
 *       restoring the first-file-only test (`if (fileToImg(files?.[0])) return;`): red on
 *       "an image first in a drop swallowed the gradient file after it".
 *   [12] PROVENANCE IN THE CATEGORY NAMES (owner, 2026-09-13): Filters ▸ Sources names every
 *       source with its licence tag ("uiGradients (MIT)", "ColorBrewer (Apache-2.0)"), lists
 *       the OPTIONAL packs after their divider and unticked, and offers no unpublished bundle;
 *       Arrange ▸ Group by Source draws bands that carry the tag, and Group by Collection draws
 *       bands named by archive / package ("PyPalettes · nord (MIT)"). Falsified the same day
 *       three ways, each reverted: the wall's `bundleLabel` back to the bare label (red "[12] a
 *       source band has no licence tag"); the toggles back to the bare label (red "[12] Sources
 *       names … without its licence tag"); `optional` dropped from the noncommercial group (red
 *       "[12] the optional packs are not behind their divider").
 *       SECOND PASS (same evening): ElvenSword is its own source "ElvenSword (free with
 *       credit)", ON with the other CDN packs and NOT behind the divider; there is no Mossman
 *       and no cpt-city · es; the non-commercial pack now includes "Softology · COLOURlovers";
 *       and GX GLOBAL is a source row, "GX Global (shared by users)", between the packs and the
 *       divider. [12b] with the endpoint INTERCEPTED to a two-gradient set, ticking it adds
 *       exactly those two to the All wall's count and unticking takes them away; [12c] in a
 *       fresh page with every GX Global request aborted, ticking it leaves it unloaded and the
 *       row DISABLED with "—". Falsified, each reverted: not registering the live source in
 *       registerPaletteUI (red "[12] Sources has no GX Global row"); elvensword marked optional
 *       in PACK_PUBLISH-derived groups (red "[12] ElvenSword is behind the optional divider");
 *       pickerStore ignoring a live toggle (red "[12b] ticking GX Global did not add its 2
 *       gradients"); the failed state not recorded (red "[12c] an unreachable GX Global is not
 *       disabled").
 *   [13] NEW GRADIENT (parity row M10, owner 2026-09-23), each in a FRESH context so the empty
 *       state is real: [13a] the nothing-picked line offers "start a new one"; a real click makes
 *       the hero hold "New gradient", black → white on two stops, linear / oklab (the stops
 *       editor's default, `stopOps.default()` — the shell's `newGradientConfig`; the hero's ☰ no
 *       longer offers Reset Default), as a picked-style `gradient` input; one Ctrl+Z goes back to nothing and the
 *       line returns, Ctrl+Y brings it back; a click on its track adds a stop at once; the edited
 *       gradient is in Recent. [13b] after a wall pick, the hero's ☰ LEADS with "New Gradient",
 *       which replaces the pick, and one Ctrl+Z gives the pick back. [13c] with the Mix face open,
 *       New closes the face, and one Ctrl+Z brings back the live mix AND its face. [13d] on a
 *       Pixel 5 the line's action is on screen, a tap makes the gradient, the ☰ carries the item
 *       inside the screen, and nothing overflows.
 *       FALSIFIED 2026-09-23, each reverted: the shell not passing `onNewGradient` to BrowseStage
 *       reds "[13a] the nothing-picked line offers no new gradient"; a second undo bracket after the
 *       `use` (a `setName`) reds "[13a] one Ctrl+Z after New did not return to the empty state";
 *       WorkingHero not passing `menuLead` reds "[13b] the hero ☰ menu has no "New Gradient""; the
 *       tray close taken out of `flushSync` reds "[13c] one Ctrl+Z brought the mix back without its
 *       face" alone. (A `beginEdit` after the `use` reds [13a] too, at the input-kind check.)
 *   [14] ESC TAKES THE NEAREST HELD THING (the polish pass, 2026-09-24 — G02, EW-02 / J03). The
 *       shell's own Esc chain (a wall selection → the open tray face → an armed slot) yields to
 *       anything nearer that took the key through the shortcut registry, which marks it
 *       `defaultPrevented`; a surface with a private keydown raced it, and the chain closed the
 *       face under it — BAKING its dials. In a fresh context, with the Adjust face open and one
 *       dial moved: [14a] the Lasso on, one Esc — the lasso is off, the face is still open and
 *       the dial still live; [14b] the Zoom tool on, one Esc — off (it had no Esc at all), face
 *       and dial the same; [14c] the Export window open over the face, one Esc — the window
 *       closes, the face stays with its dial unbaked, and a second Esc closes the face. Run this
 *       step alone with `ONLY=esc`. Falsification: see the note at [14].
 *   [15] FILTERS FOLDS THE HERO (owner, 2026-09-24 — the polish plan's ASK-3), in a fresh
 *       context with a hero up: [15a] opening Filters folds it, closing Filters brings it back;
 *       [15b] a hero folded by hand before Filters opens stays folded when it closes; [15c]
 *       unfolded by hand while Filters is open, then folded by hand again, it stays folded when
 *       Filters closes (the fold is the user's now); [15d] a pick while Filters is open shows
 *       the hero, and closing Filters then leaves it up; [15e] a Filters change made with the
 *       rows open, the rows closed, Ctrl+Z: the change is undone AND the rows are open AND the
 *       hero is folded (the rows ride undo as context, ADR-0120); Ctrl+Y redoes it with the rows
 *       closed and the hero up; after Ctrl+Z again, closing the rows brings the hero back;
 *       [15f] the same with the hero unfolded BY HAND while the rows were open: the undo brings
 *       the rows back and leaves the hero up (a restore is not a gesture — it must not fold).
 *       Run alone with `ONLY=filters`. Falsified: see the note at [15].
 *
 * FALSIFIED 2026-09-08 (each reverted): `useGroundSource` returning null for every set reds
 * [3] "the title does not say Today"; `tileSizeFor` returning the base for every count reds
 * [3] "the tiles did not grow"; dropping `setGroundSetId(groupSetId(g))` from `keepThese`
 * reds [6] "the ground did not switch to the new group".
 *
 * Run: `npm run smoke:ge-ground` (needs `npm run dev` on :3400, or ENGINE_URL).
 */
import { chromium, devices, type Browser, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

const state = (page: Page) =>
  page.evaluate(() => {
    const wall = document.querySelector('[data-gx-keepselect]') as HTMLElement | null;
    const canvases = Array.from(wall?.querySelectorAll('canvas') ?? []) as HTMLCanvasElement[];
    const c0 = canvases[0]?.getBoundingClientRect();
    const wr = wall?.getBoundingClientRect();
    const rail = document.querySelector('[data-gx-set-rail]');
    const chips = Array.from(rail?.querySelectorAll('[data-gx-set]') ?? []).map((el) => ({
      id: (el as HTMLElement).dataset.gxSet!,
      kind: (el as HTMLElement).dataset.gxSetKind!,
      count: Number((el as HTMLElement).dataset.gxSetCount),
      lit: el.getAttribute('aria-pressed') === 'true',
    }));
    return {
      ground: (document.querySelector('[data-gx-ground-set]') as HTMLElement | null)?.dataset.gxGroundSet ?? null,
      title: (document.querySelector('[data-gx-set-title]') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ') ?? null,
      sentence: (document.querySelector('[data-gx-arrange-text]') as HTMLElement | null)?.innerText ?? '',
      pad: !!document.querySelector('[data-gx-ground-set] canvas'),
      filters: !!document.querySelector('[data-gx-filters-trigger]'),
      keep: (document.querySelector('[data-gx-keep-these]') as HTMLElement | null)?.innerText ?? null,
      markerTop: (document.querySelector('[data-gx-pad-marker]') as HTMLElement | null)?.getBoundingClientRect().top ?? null,
      padAxes: (document.querySelector('[data-gx-pad-axes]') as HTMLElement | null)?.dataset.gxPadAxes ?? null,
      lens: !!document.querySelector('[data-gx-pad-lens]'),
      stripAxis: (document.querySelector('[data-gx-pad-strip]') as HTMLElement | null)?.dataset.gxPadStrip ?? null,
      // The tool COLUMN and the VIEW corner are read separately (they were one cluster
      // until 2026-09-10, when the tools moved to a column down the wall's left edge and
      // the view toggle stayed in the right corner). Reading them apart pins WHERE each
      // control lives, which is the thing that moved; a flat list over the whole wall
      // could not tell a tool in the corner from a tool in the column.
      // the hero's fold button rides in this cluster since 2026-09-11 and is not a wall tool
      tools: wall?.querySelectorAll('[data-gx-tools="tools"] button[aria-label]:not([data-gx-fold])').length ?? 0,
      toolLabels: Array.from(wall?.querySelectorAll('[data-gx-tools="tools"] button[aria-label]:not([data-gx-fold])') ?? []).map((b) => b.getAttribute('aria-label') ?? ''),
      viewLabels: Array.from(wall?.querySelectorAll('[data-gx-tools="view"] button[aria-label]') ?? []).map((b) => b.getAttribute('aria-label') ?? ''),
      canvases: canvases.length,
      canvasLeft: c0 && wr ? Math.round(c0.x - wr.x) : null,
      canvasH: c0 ? Math.round(c0.height) : null,
      canvasW: c0 ? Math.round(c0.width) : null,
      rail: !!rail,
      chips,
      hero: !!document.querySelector('[data-gx-hero]'),
    };
  });

const working = (page: Page) =>
  page.evaluate(() => {
    const w = (window as unknown as { __gxWorking?: () => { config?: { stops?: { position: number; color: string }[] } } }).__gxWorking?.();
    return JSON.stringify(w?.config?.stops?.map((s) => [Math.round(s.position * 1000), s.color]) ?? null);
  });

/**
 * [14] Esc takes the nearest held thing. Its own fresh context, so it runs the same whether it
 * follows [13] or runs alone (`ONLY=esc`).
 *
 * FALSIFIED 2026-09-24, each reverted and green again after:
 *   · [14a] `usePickerModel`'s tool Esc back to a plain window keydown (`if (e.key ===
 *     'Escape') setTool(null)`, no `useDismiss`) → red "[14a] one Esc closed the Adjust face
 *     along with the lasso (face null, Phase 0)" — the face closed AND baked;
 *   · [14b] BrowseStage's `useDismiss` for `zoomTool` removed → red "[14b] Esc left the zoom
 *     tool on".
 * NOT YET FALSIFIED: [14c], whose fix is ExportMenu's (another batch's file that day). The
 * mutation: `escape: false` on ExportMenu's `useDismiss([ref, previewRef], …)` → expected red
 * "[14c] one Esc left the Export window open"; or its pre-2026-09-24 hand-rolled keydown
 * (`git show bad4f68c:gradient-explorer/v2/ExportMenu.tsx`, grep `if (e.key !== 'Escape')
 * return;`) → expected red at the first [14c] check that the face or the window fails.
 */
async function escTakesTheNearest(browser: Browser, errors: string[]) {
  const ectx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(ectx);
  const ep = await ectx.newPage();
  ep.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await ep.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await ep.waitForTimeout(1500);
  const wb = (await ep.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
  await ep.mouse.click(wb.x + 16, wb.y + 9);
  await ep.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[14] setup: no hero after a wall click'));
  await ep.mouse.move(640, 20);
  await ep.waitForTimeout(700);

  const TOOL = (label: string) => `[data-gx-tools="tools"] button[aria-label="${label}"]`;
  // (no named helper inside `evaluate`: tsx wraps a named arrow in `__name`, which the page lacks)
  const held = () =>
    ep.evaluate(({ lasso, zoom }) => ({
      face: ((document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray || null) as string | null,
      phase: ((window as any).__store.getState().paletteGenerator?.phase ?? null) as number | null,
      lasso: document.querySelector(lasso)?.getAttribute('aria-pressed') === 'true',
      zoom: document.querySelector(zoom)?.getAttribute('aria-pressed') === 'true',
      exportOpen: !!document.querySelector('[data-gx-export]'),
    }), { lasso: TOOL('Lasso'), zoom: TOOL('Zoom') });
  const esc = async () => {
    await ep.keyboard.press('Escape');
    await ep.waitForTimeout(400);
  };
  const DIAL = 0.05;
  const dialLive = (h: { phase: number | null }) => h.phase != null && Math.abs(h.phase - DIAL) < 1e-9;

  // The Adjust face, with one dial moved through the route its sliders take (the DDFS bracket).
  await ep.click('[data-gx-tray-tab="adjust"]');
  await ep.waitForTimeout(600);
  await ep.evaluate((phase) => {
    const s = (window as any).__store.getState();
    s.handleInteractionStart('param');
    s.setPaletteGenerator({ phase });
    s.handleInteractionEnd();
  }, DIAL);
  await ep.waitForTimeout(400);
  let h = await held();
  if (h.face !== 'adjust' || !dialLive(h)) fail(`[14] setup: wanted the Adjust face with a live dial (${JSON.stringify(h)})`);

  // [14a] a carve tool over the face. A REAL click: a pointerdown on the tool column is not a
  // click-away for the tool, nor for a face (only the inspector closes on the ground).
  await ep.click(TOOL('Lasso'), { timeout: 4000 }).catch(() => fail('[14a] setup: the Lasso tool cannot be clicked with the Adjust face open'));
  await ep.waitForTimeout(300);
  h = await held();
  if (!h.lasso || h.face !== 'adjust') fail(`[14a] setup: wanted the Lasso on over the Adjust face (${JSON.stringify(h)})`);
  await esc();
  h = await held();
  if (h.lasso) fail('[14a] Esc did not put the Lasso down');
  if (h.face !== 'adjust') fail(`[14a] one Esc closed the Adjust face along with the lasso (face ${h.face}, Phase ${h.phase})`);
  if (!dialLive(h)) fail(`[14a] the Esc that put the lasso down baked the Adjust dial (Phase ${h.phase})`);
  console.log('✓ [14a] Lasso on over the Adjust face: one Esc puts the lasso down; the face and its dial stay');

  // [14b] the zoom tool, which had no Esc at all
  await ep.click(TOOL('Zoom'), { timeout: 4000 }).catch(() => fail('[14b] setup: the Zoom tool cannot be clicked with the Adjust face open'));
  await ep.waitForTimeout(300);
  h = await held();
  if (!h.zoom || h.face !== 'adjust') fail(`[14b] setup: wanted the Zoom tool on over the Adjust face (${JSON.stringify(h)})`);
  await esc();
  h = await held();
  if (h.zoom) fail('[14b] Esc left the zoom tool on');
  if (h.face !== 'adjust' || !dialLive(h)) fail(`[14b] the Esc that put the zoom tool down also closed or baked the face (face ${h.face}, Phase ${h.phase})`);
  console.log('✓ [14b] Zoom on over the Adjust face: one Esc turns it off; the face and its dial stay');

  // [14c] the Export window over the face. Needs ExportMenu's Esc on the shortcut registry
  // (the polish plan's C1) — before it, the shell's chain ran first and closed the face.
  await ep.click('[data-gx-hero] button[title^="Export"]');
  await ep.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[14c] setup: the Export window did not open'));
  await ep.waitForTimeout(300);
  h = await held();
  if (h.face !== 'adjust' || !dialLive(h)) fail(`[14c] setup: opening Export closed or baked the face (${JSON.stringify(h)})`);
  await esc();
  h = await held();
  if (h.exportOpen) fail(`[14c] one Esc left the Export window open (face ${h.face})`);
  if (h.face !== 'adjust' || !dialLive(h))
    fail(`[14c] one Esc with the Export window over the face closed the face too (face ${h.face}, Phase ${h.phase}) — the window's Esc is not taking the key through the shortcut registry`);
  await esc();
  h = await held();
  if (h.face) fail(`[14c] a second Esc did not go on to close the face (${h.face})`);
  console.log('✓ [14c] Export over the Adjust face: one Esc closes the window and leaves the face and its dial; the next Esc closes the face');
  await ectx.close();
}

/**
 * [15] Filters folds the hero while it is open, and only undoes a fold it made itself.
 *
 * FALSIFIED 2026-09-24 two ways, each reverted and green again after:
 *   · BrowseStage's fold-on-open removed (the `onFoldHero(true)` in the `filtersShown` effect)
 *     → red "[15a] opening Filters did not fold the hero";
 *   · the effect that forgets Filters' fold once the hero comes back made a no-op → red "[15c]
 *     closing Filters undid a fold the user made while it was open".
 * [15e] / [15f] (the rows riding undo, same day), each reverted and green again after:
 *   · BrowseStage not registering `useFiltersHistory` → red "[15e] Ctrl+Z folded the hero with
 *     Filters CLOSED — the rows did not come back with the fold they made";
 *   · its restore not marking the restored open state as already seen (`filtersShownWas`) →
 *     [15e] stays GREEN (that undo restores a fold, so the fold-on-open finds nothing to do) and
 *     red "[15f] the undo that reopened Filters FOLDED the hero" — which is why [15f] exists.
 */
async function filtersFoldTheHero(browser: Browser, errors: string[]) {
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(fctx);
  const fp = await fctx.newPage();
  fp.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await fp.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await fp.waitForTimeout(1500);
  const tileAt = async (i: number) => {
    const b = (await fp.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
    await fp.mouse.click(b.x + 16 + i * 33, b.y + 9);
    await fp.mouse.move(640, 20);
    await fp.waitForTimeout(800);
  };
  await tileAt(0);
  await fp.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[15] setup: no hero after a wall click'));
  // (no named helper inside `evaluate`: tsx wraps a named arrow in `__name`, which the page lacks)
  const look = () =>
    fp.evaluate(() => ({
      folded: document.querySelector('[data-gx-fold]')?.getAttribute('aria-pressed') === 'true',
      heroH: Math.round((document.querySelector('[data-gx-hero]') as HTMLElement | null)?.getBoundingClientRect().height ?? -1),
      // the Sources row's toggles exist only while the Filters rows are drawn
      rows: !!document.querySelector('[data-gx-source]'),
    }));
  const filters = async () => { await fp.click('[data-gx-filters-trigger]'); await fp.waitForTimeout(400); };
  const foldBtn = async () => { await fp.click('[data-gx-fold]'); await fp.waitForTimeout(400); };
  let v = await look();
  if (v.folded || v.heroH <= 0) fail(`[15] setup: wanted the hero up (${JSON.stringify(v)})`);
  const upH = v.heroH;

  // [15a] open folds, close unfolds
  await filters();
  v = await look();
  if (!v.rows) fail('[15a] setup: the Filters rows did not open');
  if (!v.folded || v.heroH > 0) fail(`[15a] opening Filters did not fold the hero (${JSON.stringify(v)})`);
  await filters();
  v = await look();
  if (v.rows) fail('[15a] setup: the Filters rows did not close');
  if (v.folded || Math.abs(v.heroH - upH) > 2) fail(`[15a] closing Filters did not bring the hero back (${JSON.stringify(v)}, was ${upH} px)`);
  console.log(`✓ [15a] opening Filters folds the ${upH} px hero; closing it brings the hero back`);

  // [15b] folded by hand first: Filters did not fold it, so closing does not unfold it
  await foldBtn();
  await filters();
  await filters();
  v = await look();
  if (!v.folded) fail('[15b] closing Filters unfolded a hero the user had folded before opening it');
  await foldBtn();
  console.log('✓ [15b] a hero folded by hand before Filters stays folded when Filters closes');

  // [15c] Filters folds, the user unfolds, then folds again: the fold is theirs now
  await filters();
  await foldBtn(); // unfold by hand
  v = await look();
  if (v.folded) fail('[15c] setup: the fold button did not unfold the hero with Filters open');
  await foldBtn(); // fold by hand
  await filters(); // close
  v = await look();
  if (!v.folded) fail('[15c] closing Filters undid a fold the user made while it was open');
  await foldBtn();
  console.log('✓ [15c] unfolded and folded again by hand while Filters is open: closing Filters leaves it folded');

  // [15d] a pick while Filters has the hero folded shows it; closing Filters then leaves it up
  await filters();
  v = await look();
  if (!v.folded) fail('[15d] setup: opening Filters did not fold the hero');
  await tileAt(3);
  v = await look();
  if (v.folded || v.heroH <= 0) fail(`[15d] a pick with Filters open did not show the hero (${JSON.stringify(v)})`);
  await filters();
  v = await look();
  if (v.folded || v.heroH <= 0) fail(`[15d] closing Filters after a pick folded the hero again (${JSON.stringify(v)})`);
  console.log('✓ [15d] a pick with Filters open shows the hero; closing Filters leaves it up');

  // [15e] UNDO BRINGS THE ROWS BACK WITH THEIR FOLD (ADR-0120, 2026-09-24). A Filters change is
  // an undo entry, and the fold rides every entry as context — so without the rows riding too,
  // undoing a change made with Filters open folded the hero with Filters CLOSED (measured).
  // The change goes through the route the Arrange dropdowns take (a DDFS param in an
  // interaction bracket).
  const reverse = () => fp.evaluate(() => !!(window as any).__store.getState().paletteFilters?.reverse);
  const undoKey = async (key: string) => {
    await fp.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await fp.keyboard.press(key);
    await fp.waitForTimeout(700);
  };
  const before15e = await reverse();
  await filters();
  v = await look();
  if (!v.folded || !v.rows) fail(`[15e] setup: wanted Filters open with the hero folded (${JSON.stringify(v)})`);
  await fp.evaluate((r) => {
    const st = (window as any).__store.getState();
    st.handleInteractionStart('param');
    st.setPaletteFilters({ reverse: r });
    st.handleInteractionEnd();
  }, !before15e);
  await fp.waitForTimeout(400);
  await filters();
  v = await look();
  if (v.folded || v.rows || (await reverse()) === before15e) fail(`[15e] setup: wanted the change made and Filters closed with the hero back (${JSON.stringify(v)})`);
  await undoKey('Control+z');
  v = await look();
  if ((await reverse()) !== before15e) fail('[15e] Ctrl+Z did not undo the Filters change');
  if (v.folded && !v.rows) fail('[15e] Ctrl+Z folded the hero with Filters CLOSED — the rows did not come back with the fold they made');
  if (!v.rows || !v.folded) fail(`[15e] Ctrl+Z did not bring back Filters open over the folded hero (${JSON.stringify(v)})`);
  await undoKey('Control+y');
  v = await look();
  if ((await reverse()) === before15e || v.rows || v.folded) fail(`[15e] Ctrl+Y did not redo the change with Filters closed and the hero up (${JSON.stringify(v)})`);
  await undoKey('Control+z');
  await filters(); // close: the fold came back as Filters' own, so this brings the hero back
  v = await look();
  if (v.rows || v.folded || v.heroH <= 0) fail(`[15e] closing the Filters an undo brought back did not bring the hero back (${JSON.stringify(v)})`);
  console.log('✓ [15e] undo of a Filters change: the rows come back open over the fold; redo closes them with the hero up; closing them after the undo shows the hero');

  // [15f] AN UNDO IS NOT A GESTURE: a change made with the rows open and the hero unfolded BY
  // HAND comes back that way — the restore that reopens the rows must not run the fold-on-open.
  await filters();
  await foldBtn(); // unfold by hand
  v = await look();
  if (v.folded || !v.rows) fail(`[15f] setup: wanted Filters open with the hero up (${JSON.stringify(v)})`);
  const before15f = await reverse();
  await fp.evaluate((r) => {
    const st = (window as any).__store.getState();
    st.handleInteractionStart('param');
    st.setPaletteFilters({ reverse: r });
    st.handleInteractionEnd();
  }, !before15f);
  await fp.waitForTimeout(400);
  await filters();
  await undoKey('Control+z');
  v = await look();
  if ((await reverse()) !== before15f) fail('[15f] Ctrl+Z did not undo the Filters change');
  if (!v.rows) fail(`[15f] Ctrl+Z did not bring the Filters rows back (${JSON.stringify(v)})`);
  if (v.folded) fail('[15f] the undo that reopened Filters FOLDED the hero — a restore was read as opening Filters, though the change was made with the hero up');
  await filters();
  v = await look();
  if (v.folded || v.rows) fail(`[15f] closing Filters after that undo left ${JSON.stringify(v)}`);
  console.log('✓ [15f] undo of a change made with the hero unfolded by hand: the rows come back and the hero stays up');
  await fctx.close();
}

async function main() {
  const browser = await chromium.launch();
  if (process.env.ONLY === 'esc' || process.env.ONLY === 'filters') {
    const only: string[] = [];
    if (process.env.ONLY === 'esc') await escTakesTheNearest(browser, only);
    else await filtersFoldTheHero(browser, only);
    if (only.length) fail(`page errors: ${only.join(' | ')}`);
    await browser.close();
    console.log(`PASS smoke-ge-ground (ONLY=${process.env.ONLY})`);
    return;
  }
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

  // The row-label column a SET reserves and leaves empty; All draws labels in a wider one.
  /**
   * The wall's left margin on a SET. It was the shell's 24 px row-label reserve; since
   * 2026-09-11 it is the room the floating TOOL COLUMN needs, because the column was sitting
   * on the first tiles of every ground whose gutter is smaller than it (owner: "the wall's
   * toolbar is obscuring the wall"). `PickerWall`'s `minGutter` puts a floor under the margin
   * and BrowseStage passes `TOOLBAR_CLEAR` — grep both; this number is that one, and the two
   * must move together.
   */
  const SET_GUTTER = 52;

  // [1]
  let s = await state(page);
  if (s.ground !== 'all') fail(`[1] the ground is not All (${s.ground})`);
  if (!s.pad || !s.filters) fail('[1] the pad / Filters are missing on All');
  if (s.tools !== 4) fail(`[1] ${s.tools} tools on All, expected 4`);
  if (s.viewLabels.length) fail(`[1] the view corner should be empty on the catalogue, found ${s.viewLabels.join(' + ')}`);
  if (s.chips.some((c) => c.kind === 'bin')) fail('[1] a dated bin exists on a fresh shelf');
  if (!/sorted by/.test(s.sentence)) fail(`[1] the arrange sentence is not on screen ("${s.sentence}")`);
  const gutterAll = s.canvasLeft ?? 0;
  if (gutterAll < 60) fail(`[1] the All wall has no label gutter (canvas at x=${gutterAll})`);
  console.log(`✓ [1] fresh: All on the ground, pad + Filters + ${s.tools} tools, no bin yet, "${s.sentence}"`);

  // [2] two picks
  const tile = async (i: number, cell = 33, y = 9) => {
    const box = (await page.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
    await page.mouse.click(box.x + 16 + i * cell, box.y + y);
  };
  await tile(0);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[2] no hero after a wall click'));
  await page.mouse.move(640, 40);
  await page.waitForTimeout(900);
  const first = await working(page);
  s = await state(page);
  let today = s.chips.find((c) => c.kind === 'bin');
  if (!today || today.count !== 1) fail(`[2] Today · 1 expected after the first pick, got ${JSON.stringify(s.chips)}`);
  await tile(6);
  await page.mouse.move(640, 40);
  await page.waitForTimeout(900);
  const second = await working(page);
  if (second === first) fail('[2] the second pick did not change the working gradient (same tile?)');
  s = await state(page);
  today = s.chips.find((c) => c.kind === 'bin');
  if (!today || today.count !== 2) fail(`[2] Today · 2 expected after two picks, got ${JSON.stringify(s.chips)}`);
  console.log('✓ [2] two picks → the rail says Today · 2');

  // [3] the bin on the ground
  await page.click(`[data-gx-set="${today.id}"]`);
  await page.waitForTimeout(500);
  s = await state(page);
  if (s.ground !== today.id) fail(`[3] the ground did not switch (${s.ground})`);
  if (!s.title || !/Today/.test(s.title)) fail(`[3] the title does not say Today ("${s.title}")`);
  if (s.pad || s.filters) fail('[3] the pad / Filters are still there on a set');
  // NAMED, not counted. This read `s.tools !== 1` and went red on 2026-09-09 for a reason
  // that had nothing to do with the tools: session 3 put the ground's LIST VIEW toggle in
  // the same corner, and it carries an aria-label too. The carve tools really are gone on
  // a set (`TOOLS.filter` in BrowseStage) and that is the thing worth pinning, so the
  // assertion names what should be there and says what turned up instead.
  // 2026-09-10: the two are no longer one cluster, so they are asserted one by one — the
  // column holds Zoom alone, the corner holds the view toggle alone. Reading them together
  // is what made this line depend on DOM order, which is how it went red the first time.
  if (s.toolLabels.join(',') !== 'Zoom')
    fail(`[3] the tool column should offer Zoom alone on a set, not ${s.toolLabels.join(' + ') || 'nothing'} — a carve tool leaking back changes what a selection MEANS here`);
  if (s.viewLabels.join(',') !== 'List view')
    fail(`[3] the corner should offer the view toggle on a set, not ${s.viewLabels.join(' + ') || 'nothing'}`);
  if (s.canvases !== 1) fail(`[3] ${s.canvases} canvases for two tiles`);
  // A set RESERVES a left margin and draws nothing in it, so its canvas starts there rather
  // than at 0. That is the point: the canvas does not jump sideways when you cross between All
  // and a set, and the tool column has somewhere to float that is not on top of a tile.
  // This line expected 0 for a long time and was red on a clean tree because of it (owner
  // confirmed the reserved column is wanted, 2026-09-10) — so it pins the reserve itself,
  // which is the thing that would be a regression if it went missing.
  if (Math.abs((s.canvasLeft ?? -99) - SET_GUTTER) > 1)
    fail(`[3] a set should reserve the ${SET_GUTTER}px left margin the tool column needs, canvas at x=${s.canvasLeft}`);
  if ((s.canvasH ?? 0) < 60) fail(`[3] the tiles did not grow (canvas height ${s.canvasH})`);
  if ((s.canvasH ?? 0) > 220) fail(`[3] two tiles wrapped into a wall (canvas height ${s.canvasH})`);
  if (!s.chips.find((c) => c.id === today.id)?.lit) fail('[3] the Today chip is not lit');
  console.log(`✓ [3] Today on the ground: title "${s.title}", one canvas ${s.canvasW}×${s.canvasH} at x=${s.canvasLeft} (the reserved gutter), zoom only`);

  // [4] a set tile is a shelf pick — the older one (index 1) is the first pick
  {
    const box = (await page.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
    const tw = (s.canvasW ?? 300) / 2;
    await page.mouse.click(box.x + tw * 1.5, box.y + (s.canvasH ?? 80) / 2);
    await page.mouse.move(640, 40);
    await page.waitForTimeout(900);
    const now = await working(page);
    if (now !== first) fail(`[4] clicking the older tile did not bring the first pick back\n  want ${first}\n  got  ${now}`);
    s = await state(page);
    if (s.ground !== today.id) fail('[4] the ground left the bin on a pick');
    console.log('✓ [4] the older tile brought the first pick back; the ground stayed on Today');
  }

  // [5] back to All
  await page.click('[data-gx-set="all"]');
  await page.waitForTimeout(500);
  s = await state(page);
  if (s.ground !== 'all' || !s.pad || !s.filters || s.tools !== 4) fail(`[5] All did not come back whole (${s.ground}, pad ${s.pad}, filters ${s.filters}, tools ${s.tools})`);
  if ((s.canvasLeft ?? 0) < 60) fail(`[5] the gutter did not come back (x=${s.canvasLeft})`);
  console.log('✓ [5] All is back: pad, Filters, four tools, the gutter');

  // [6] Group these N (it said "Keep these N" until 2026-09-24: "keep" is the ♥ and Kept).
  //
  // The term has to narrow All to at most KEEP_MAX (400 in BrowseStage.tsx) — the button is
  // deliberately withheld above that. It was 'fire' until 2026-09-09, when the catalogue had
  // grown enough that 'fire' matched 535 and the smoke went red without anything being
  // broken. 'ember' matches 38. If this fails again, check the COUNT before the feature:
  // the failure below prints it.
  // The count is read from the SENTENCE ("38 of 10,509 · …"): since 2026-09-24 a desk shows
  // it there once, and neither the search pill nor Filters ▸ Arrange repeats it (owner).
  await page.fill('input[placeholder^="Search"]', 'ember');
  await page.waitForTimeout(500);
  s = await state(page);
  const narrowedTo = /^([\d,]+) of [\d,]+/.exec(s.sentence);
  if (!narrowedTo) fail(`[6] the sentence does not carry the narrowed count ("${s.sentence}")`);
  const narrowed = Number(narrowedTo![1].replace(/,/g, ''));
  const m = /Group these ([\d,]+)/.exec(s.keep ?? '');
  if (!m) fail(`[6] "Group these N" is not offered on a narrowed All (${s.keep}) — the search matched ${narrowed}; the button is withheld above KEEP_MAX (400), so a count over that means this term has outgrown the fixture, not that the feature broke`);
  const n = Number(m![1].replace(/,/g, ''));
  if (!(n > 0) || n !== narrowed) fail(`[6] the button offers ${n}, the sentence says ${narrowed} match`);
  const pillCount = await page.evaluate(() => /[\d,]+ match/.test((document.querySelector('[data-gx-search]')?.parentElement as HTMLElement | null)?.innerText ?? ''));
  if (pillCount) fail('[6] the search pill repeats the count on a desk — the sentence carries it, once');
  await page.click('[data-gx-keep-these]');
  await page.waitForTimeout(700);
  s = await state(page);
  if (!s.ground?.startsWith('group:')) fail(`[6] the ground did not switch to the new group (${s.ground})`);
  const chip = s.chips.find((c) => c.id === s.ground);
  if (!chip || !chip.lit || chip.kind !== 'group') fail(`[6] no lit group chip for the ground (${JSON.stringify(s.chips)})`);
  if (chip.count !== n) fail(`[6] the group holds ${chip.count}, the wall offered ${n}`);
  // the label is the search term, capitalised — kept in step with the term above
  if (!s.title || !/Ember/.test(s.title)) fail(`[6] the title does not carry the label ("${s.title}")`);
  console.log(`✓ [6] the sentence says ${narrowed}, the pill does not repeat it; Group these ${n} → group "${s.title}" on the ground, chip lit`);
  const groundBefore = s.ground;

  // [7] persistence
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[data-gx-keepselect] canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  s = await state(page);
  if (s.ground !== groundBefore) fail(`[7] the set did not persist across a reload (${s.ground} vs ${groundBefore})`);
  if (!s.chips.find((c) => c.id === groundBefore)?.lit) fail('[7] the group chip is not lit after the reload');
  console.log('✓ [7] the ground came back on the group after a reload');

  // [8] the pad is the wall's map: on All, a marker; scroll the wall and it moves
  await page.click('[data-gx-set="all"]');
  await page.waitForTimeout(600);
  s = await state(page);
  if (s.markerTop == null) fail('[8] the pad has no marker on All');
  const markerBefore = s.markerTop;
  {
    const box = (await page.locator('[data-gx-keepselect]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(500);
  }
  s = await state(page);
  if (s.markerTop == null || Math.abs(s.markerTop - markerBefore!) < 2) fail(`[8] the marker did not move with the wall (${markerBefore} → ${s.markerTop})`);
  console.log(`✓ [8] the pad marks where the wall is (top ${Math.round(markerBefore!)} → ${Math.round(s.markerTop)})`);

  // [9] the pad follows the Arrange state
  const setRows = (i: number) => page.evaluate((n) => (window as any).__store.getState().setPaletteFilters({ rowsBy: n }), i);
  await setRows(2); // vividness
  await page.waitForTimeout(600);
  s = await state(page);
  if (s.padAxes !== 'hue×chroma') fail(`[9] rows by vividness did not put chroma on the pad's Y (${s.padAxes})`);
  if (s.stripAxis !== 'lightness') fail(`[9] the strip is not lightness (${s.stripAxis})`);
  if (!s.lens || s.markerTop == null) fail('[9] the lens / scrollbar is gone although the rows are on the pad');
  await setRows(3); // complexity
  await page.waitForTimeout(600);
  s = await state(page);
  if (s.padAxes !== 'hue×lightness') fail(`[9] rows by complexity did not fall back to the default pad (${s.padAxes})`);
  // SUPERSEDED 2026-09-09: this used to assert the lens was WITHHELD here, because it was
  // derived from which lightness bands were on screen and that is meaningless when the rows
  // are not on a colour axis. The band is the SCROLL POSITION now (owner: "just map it by
  // scroll position and not by lightness"), which is defined under every arrangement — so
  // the lens and the scrollbar are both always present, and the pad no longer goes blank.
  if (!s.lens) fail('[9] the lens is gone — since it is the scroll position it is shown under every arrangement');
  if (s.markerTop == null) fail('[9] the scrollbar is gone — it should fall back to the plain scroll position');
  if (s.stripAxis !== 'chroma') fail(`[9] the strip is not chroma again (${s.stripAxis})`);
  await setRows(1); // back to lightness
  await page.waitForTimeout(300);
  console.log('✓ [9] the pad follows the Arrange state: vividness on Y with the lightness strip; complexity falls back to the default pad, lens still there');

  // [10] Esc in the search box clears it, and only it
  {
    await page.evaluate(() => window.scrollTo(0, 0));
    if (!(await page.$('[data-gx-hero]'))) {
      // [8] scrolled the wall 2400 px down, so its first canvas is above the viewport: wheel it
      // back to the top before aiming at the first tile the way [2] does
      const wallBox = (await page.locator('[data-gx-keepselect]').boundingBox())!;
      await page.mouse.move(wallBox.x + wallBox.width / 2, wallBox.y + wallBox.height / 2);
      await page.mouse.wheel(0, -6000);
      await page.waitForTimeout(500);
      const wb = (await page.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
      await page.mouse.click(wb.x + 16, wb.y + 9);
      await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[10] setup: no hero after a wall click'));
      await page.waitForTimeout(600);
    }
    const esc = () => page.evaluate(() => ({
      search: (document.querySelector('[data-gx-search]') as HTMLInputElement | null)?.value ?? null,
      focused: document.activeElement?.hasAttribute('data-gx-search') ?? false,
      filters: (document.querySelector('[data-gx-filters-trigger]') as HTMLElement | null)?.className.includes('bg-accent-400/10') ?? false,
      face: (document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray ?? null,
    }));
    await page.click('[data-gx-filters-trigger]');
    await page.waitForTimeout(300);
    // Opening Filters FOLDS the hero since 2026-09-24 ([15]), and a folded hero has no tabs:
    // unfold it by hand, which also makes the fold the user's, so closing the rows below
    // leaves the hero where it is.
    await page.click('[data-gx-fold]');
    await page.waitForTimeout(300);
    await page.click('[data-gx-tray-tab="adjust"]');
    await page.waitForTimeout(400);
    // FOCUS, not click: a pointerdown on the ground is a click-away for an open face
    await page.focus('[data-gx-search]');
    await page.keyboard.type('fire');
    await page.waitForTimeout(300);
    let e = await esc();
    if (e.search !== 'fire' || !e.filters || e.face !== 'adjust') fail(`[10] setup: wanted "fire" typed with the rows and Adjust open (${JSON.stringify(e)})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    e = await esc();
    if (e.search !== '') fail(`[10] Esc in a non-empty search did not clear it ("${e.search}")`);
    if (!e.filters) fail('[10] Esc in a non-empty search closed the Filters rows instead of clearing the query');
    if (e.face !== 'adjust') fail(`[10] clearing the search also closed the Adjust face (${e.face})`);
    if (!e.focused) fail('[10] clearing the search took the focus away from the box');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    e = await esc();
    if (e.filters) fail('[10] Esc in the EMPTY search did not go on to close the Filters rows');
    if (e.face !== 'adjust') fail(`[10] one Esc closed both the rows and the face (${e.face})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    e = await esc();
    if (e.face) fail(`[10] Esc in the empty search no longer reaches the shell's chain — the face stayed (${e.face})`);
    console.log('✓ [10] Esc clears a non-empty search and stops; an empty box hands Esc on (rows, then the face)');
  }

  // [11] a mixed drop: the image loads AND the gradient file imports, in either order
  {
    const drop = (order: 'image-first' | 'gradient-first', name: string, hex: [number, number, number]) =>
      page.evaluate(async ({ order, name, hex }) => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 16;
        const g = c.getContext('2d')!;
        const grad = g.createLinearGradient(0, 0, 64, 0);
        grad.addColorStop(0, '#102040');
        grad.addColorStop(1, '#f0a030');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 16);
        const png = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));
        const image = new File([png], 'picture.png', { type: 'image/png' });
        // a one-segment GIMP gradient from a colour no shelf already holds, so the import
        // cannot be deduped away and the name is unambiguous
        // (no named helper in here: tsx wraps a named arrow in `__name`, which the page lacks)
        const end = hex.map((v) => (v / 255).toFixed(6)).join(' ');
        const ggr = ['GIMP Gradient', `Name: ${name}`, '1', `0.000000 0.500000 1.000000 0.000000 0.000000 0.000000 1.000000 ${end} 1.000000 0 0`, ''].join('\n');
        const gradient = new File([ggr], `${name}.ggr`, { type: '' });
        const dt = new DataTransfer();
        for (const file of order === 'image-first' ? [image, gradient] : [gradient, image]) dt.items.add(file);
        window.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
        window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      }, { order, name, hex });
    const after = (name: string) => page.evaluate((n) => ({
      face: (document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray ?? null,
      imported: ((JSON.parse(localStorage.getItem('gmt.favients') ?? '[]') as { name: string }[]) ?? []).some((f) => f.name === n),
    }), name);
    for (const [order, name, hex] of [['image-first', 'mixdrop-a', [17, 201, 83]], ['gradient-first', 'mixdrop-b', [201, 17, 150]]] as const) {
      if ((await state(page)).hero === false) fail('[11] setup: no hero');
      if (await page.evaluate(() => !!(document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      await drop(order, name, hex as unknown as [number, number, number]);
      let a = await after(name);
      for (let i = 0; i < 20 && !(a.imported && a.face === 'image'); i++) {
        await page.waitForTimeout(250);
        a = await after(name);
      }
      if (!a.imported) fail(`[11] ${order === 'image-first' ? 'an image first in a drop swallowed the gradient file after it' : 'the gradient file in a mixed drop was not imported'} ("${name}" is not on the shelf)`);
      if (a.face !== 'image') fail(`[11] ${order === 'gradient-first' ? 'a gradient file first in a drop swallowed the image after it' : 'the image in a mixed drop did not load'} (the Image face did not open: ${a.face})`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log('✓ [11] a mixed drop loads the image and imports the gradient, whichever comes first');
  }

  // [12] provenance in the category names
  {
    if (await page.evaluate(() => !!(document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    if (!(await page.$('[data-gx-set="all"][aria-pressed="true"]'))) {
      await page.click('[data-gx-set="all"]');
      await page.waitForTimeout(500);
    }
    await page.click('[data-gx-filters-trigger]');
    await page.waitForSelector('[data-gx-source]', { timeout: 5000 }).catch(() => fail('[12] Filters ▸ Sources shows no source toggles'));
    const sources = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[data-gx-source], [data-gx-optional-packs]')) as HTMLElement[];
      const divider = all.findIndex((e) => e.hasAttribute('data-gx-optional-packs'));
      return all.filter((e) => e.hasAttribute('data-gx-source')).map((e) => ({
        id: e.dataset.gxSource ?? '',
        name: e.dataset.gxSourceName ?? '',
        checked: (e.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked ?? null,
        afterDivider: divider >= 0 && all.indexOf(e) > divider,
      }));
    });
    const byId = new Map(sources.map((s) => [s.id, s] as const));
    for (const [id, want] of [['uigradients', 'uiGradients (MIT)'], ['colorbrewer', 'ColorBrewer (Apache-2.0)'], ['pypalettes', 'PyPalettes (per package)']] as const)
      if (byId.get(id)?.name !== want) fail(`[12] Sources names ${id} "${byId.get(id)?.name}" without its licence tag (wanted "${want}")`);
    const untagged = sources.filter((s) => !/\([^()]+\)$/.test(s.name));
    if (untagged.length) fail(`[12] Sources names ${untagged.map((s) => s.id).join(', ')} without its licence tag`);
    const elven = byId.get('elvensword');
    if (!elven) fail('[12] Sources has no ElvenSword row');
    if (elven!.name !== 'ElvenSword (free with credit)') fail(`[12] ElvenSword is named "${elven!.name}"`);
    if (elven!.afterDivider) fail('[12] ElvenSword is behind the optional divider — it is a normal published pack');
    if (sources.some((s) => s.id === 'cptcity-es' || s.id === 'cptcity-jm' || /mossman/i.test(s.name))) fail('[12] Sources still offers cpt-city · es or Jim Mossman');
    const gx = byId.get('gx-global');
    if (!gx) fail('[12] Sources has no GX Global row');
    if (gx!.name !== 'GX Global (shared by users)') fail(`[12] GX Global is named "${gx!.name}"`);
    if (gx!.afterDivider) fail('[12] GX Global is behind the optional divider');
    if (sources.indexOf(gx!) < sources.indexOf(elven!)) fail('[12] GX Global is listed before the packs');
    const optional = ['cptcity-nc', 'pypalettes-nc', 'softology-nc'];
    const misplaced = optional.filter((id) => !byId.get(id)?.afterDivider);
    if (misplaced.length) fail(`[12] the optional packs are not behind their divider (${misplaced.join(', ')})`);
    const ticked = optional.filter((id) => byId.get(id)?.checked);
    if (ticked.length) fail(`[12] an optional pack is loaded without being asked for (${ticked.join(', ')})`);
    const nc = byId.get('cptcity-nc')?.name ?? '';
    if (nc !== 'cpt-city · COLOURlovers (CC BY-NC-SA 3.0)') fail(`[12] the non-commercial source is named "${nc}"`);
    if (sources.some((s) => s.id === 'cptcity-noredist' || s.id === 'pypalettes-nolicence')) fail('[12] Sources offers an unpublished bundle');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const headers = async (groupBy: number) => {
      await page.evaluate((n) => (window as any).__store.getState().setPaletteFilters({ groupBy: n, rowsBy: 0 }), groupBy);
      await page.waitForTimeout(900);
      return page.evaluate(() => Array.from(document.querySelectorAll('[data-wall-header]')).map((h) => (h as HTMLElement).innerText.trim()).filter(Boolean));
    };
    const src = await headers(2);
    if (!src.length) fail('[12] Group by Source drew no band headers');
    const bare = src.filter((h) => !/\([^()]+\)$/.test(h));
    if (bare.length) fail(`[12] a source band has no licence tag (${bare.join(' | ')})`);
    const col = await headers(3);
    if (!col.length) fail('[12] Group by Collection drew no band headers');
    if (!col.some((h) => /^\S.* · .+ \([^()]+\)$/.test(h))) fail(`[12] collection bands are not named "source · collection (tag)" (${col.slice(0, 4).join(' | ')})`);
    await page.evaluate(() => (window as any).__store.getState().setPaletteFilters({ groupBy: 0, rowsBy: 1 }));
    await page.waitForTimeout(400);
    console.log(`✓ [12] names carry provenance: "${byId.get('uigradients')?.name}", "${elven!.name}", "${gx!.name}", "${nc}" (optional, unticked); bands "${src[0]}", "${col[0]}"`);
  }

  // [12b] GX Global as a source, with the endpoint intercepted to a known two-gradient set
  {
    const gpage = await ctx.newPage();
    gpage.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    const two = { version: 1, items: [
      { id: 'smoke-a', config: { stops: [{ position: 0, color: '#123456' }, { position: 1, color: '#FEDCBA' }], colorSpace: 'srgb', blendSpace: 'oklab' } },
      { id: 'smoke-b', config: { stops: [{ position: 0, color: '#0A0B0C' }, { position: 0.5, color: '#C0FFEE' }, { position: 1, color: '#FACADE' }], colorSpace: 'srgb', blendSpace: 'oklab' } },
    ] };
    await gpage.route('**/functions/v1/gx-gradients', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(two) }));
    await gpage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await gpage.waitForTimeout(1800);
    const total = async () => Number(((await state(gpage)).sentence.match(/^[\d,]+/)?.[0] ?? '0').replace(/,/g, ''));
    await gpage.click('[data-gx-filters-trigger]');
    await gpage.waitForSelector('[data-gx-source="gx-global"]', { timeout: 5000 }).catch(() => fail('[12b] no GX Global row'));
    const before = await total();
    await gpage.click('[data-gx-source="gx-global"] input');
    await gpage.waitForTimeout(1200);
    const after = await total();
    const row = await gpage.evaluate(() => {
      const el = document.querySelector('[data-gx-source="gx-global"]') as HTMLElement;
      return { checked: (el.querySelector('input') as HTMLInputElement).checked, text: el.innerText.replace(/\s+/g, ' ') };
    });
    if (after - before !== 2) fail(`[12b] ticking GX Global did not add its 2 gradients to the All wall (${before} → ${after})`);
    if (!row.checked || !/\b2\b/.test(row.text)) fail(`[12b] the GX Global row does not show it loaded with 2 (${JSON.stringify(row)})`);
    await gpage.click('[data-gx-source="gx-global"] input');
    await gpage.waitForTimeout(800);
    if ((await total()) !== before) fail(`[12b] unticking GX Global did not take its gradients off the wall (${await total()} vs ${before})`);
    await gpage.close();
    console.log(`✓ [12b] GX Global (shared by users) adds its 2 gradients to All when ticked (${before} → ${after}) and removes them when unticked`);
  }

  // [12c] GX Global unreachable: every request for it aborted, in a fresh page
  {
    const dpage = await ctx.newPage();
    dpage.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await dpage.route('**/functions/v1/gx-gradients', (route) => route.abort());
    await dpage.route('**/gxglobal.json', (route) => route.abort());
    await dpage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await dpage.waitForTimeout(1800);
    await dpage.click('[data-gx-filters-trigger]');
    await dpage.waitForSelector('[data-gx-source="gx-global"]', { timeout: 5000 }).catch(() => fail('[12c] no GX Global row'));
    await dpage.click('[data-gx-source="gx-global"] input').catch(() => { /* already disabled is fine */ });
    await dpage.waitForTimeout(1200);
    const dead = await dpage.evaluate(() => {
      const el = document.querySelector('[data-gx-source="gx-global"]') as HTMLElement;
      const input = el.querySelector('input') as HTMLInputElement;
      return { failed: el.hasAttribute('data-gx-source-failed'), disabled: input.disabled, checked: input.checked, text: el.innerText.replace(/\s+/g, ' ') };
    });
    if (!dead.failed || !dead.disabled) fail(`[12c] an unreachable GX Global is not disabled (${JSON.stringify(dead)})`);
    if (dead.checked) fail('[12c] an unreachable GX Global shows as loaded');
    if (!/—/.test(dead.text)) fail(`[12c] the unreachable row does not say "—" (${dead.text})`);
    await dpage.close();
    console.log('✓ [12c] GX Global unreachable: the row stays, unticked, disabled, "—"');
  }

  // [13] NEW GRADIENT (parity row M10, 2026-09-23) — in fresh contexts, so the empty state is real
  {
    const MENU = '[data-gx-hero] button[title^="Stops menu"]';
    const NEW_SIG = JSON.stringify([[0, '#000000'], [1000, '#FFFFFF']]);
    type Cfg = { stops?: { position: number; color: string }[]; colorSpace?: string; blendSpace?: string } | null;
    const sigOf = (c: Cfg) => JSON.stringify(c?.stops?.map((s) => [Math.round(s.position * 1000), String(s.color).toUpperCase()]) ?? null);
    const full = (p: Page) =>
      p.evaluate(() => {
        const w = (window as unknown as { __gxWorking?: () => { input?: { kind?: string }; config?: unknown } }).__gxWorking?.();
        return {
          kind: (w?.input?.kind ?? null) as string | null,
          config: (w?.config ?? null) as { stops?: { position: number; color: string }[]; colorSpace?: string; blendSpace?: string } | null,
          name: (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? null,
          tray: (document.querySelector('[data-gx-tray-root]') as HTMLElement | null)?.dataset.gxTray || null,
          knots: document.querySelectorAll('[data-gx-hero] [data-gx-knot]').length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
    // Ctrl+Z must reach the app's shortcut, not a focused field's own text undo
    const undoKey = async (p: Page, key = 'Control+z') => {
      await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
      await p.keyboard.press(key);
      await p.waitForTimeout(600);
    };
    const isNew = (n: Awaited<ReturnType<typeof full>>) =>
      sigOf(n.config) === NEW_SIG && n.config?.colorSpace === 'linear' && n.config?.blendSpace === 'oklab' && n.name === 'New gradient';

    const nctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedGeSmokeState(nctx);
    const np = await nctx.newPage();
    np.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await np.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await np.waitForTimeout(1500);

    // [13a] from the empty state: an editable STOP gradient, one Ctrl+Z back to nothing, into Recent
    if (await np.$('[data-gx-hero]')) fail('[13a] setup: a fresh page already has a hero');
    const hint = await np.evaluate(() => (document.querySelector('[data-gx-map-hint]') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ') ?? '');
    if (!/start a new one/.test(hint) || !(await np.$('[data-gx-new-gradient]'))) fail(`[13a] the nothing-picked line offers no new gradient ("${hint}")`);
    await np.click('[data-gx-new-gradient]');
    await np.waitForSelector('[data-gx-hero] [data-gx-knot-track]', { timeout: 8000 }).catch(() => fail('[13a] "start a new one" made no hero'));
    await np.waitForTimeout(300);
    let n = await full(np);
    if (n.kind !== 'gradient') fail(`[13a] the new gradient is not a picked-style gradient input (${n.kind})`);
    if (!isNew(n)) fail(`[13a] the new gradient is ${sigOf(n.config)} ${n.config?.colorSpace}/${n.config?.blendSpace} "${n.name}" — expected the editor's default black → white, linear / oklab, "New gradient"`);
    if (n.knots !== 2) fail(`[13a] the new gradient shows ${n.knots} knots, expected 2`);
    await undoKey(np);
    n = await full(np);
    if (n.kind !== 'empty') fail(`[13a] one Ctrl+Z after New did not return to the empty state (${n.kind})`);
    if (!(await np.$('[data-gx-new-gradient]'))) fail('[13a] after the undo the nothing-picked line is not back');
    await undoKey(np, 'Control+y');
    n = await full(np);
    if (!isNew(n)) fail(`[13a] Ctrl+Y did not bring the new gradient back (${sigOf(n.config)})`);
    const track = (await np.locator('[data-gx-hero] [data-gx-knot-track]').first().boundingBox())!;
    await np.mouse.click(track.x + track.width * 0.5, track.y + track.height / 2);
    await np.waitForTimeout(500);
    n = await full(np);
    if (n.kind !== 'stops' || (n.config?.stops?.length ?? 0) !== 3) fail(`[13a] a click on the new gradient's track did not add a stop (${n.kind}, ${n.config?.stops?.length} stops)`);
    await np.keyboard.press('Escape');
    await np.mouse.move(640, 40);
    await np.waitForTimeout(1000);
    const recent = await np.evaluate(() =>
      (JSON.parse(localStorage.getItem('gmt.favients') ?? '[]') as { name: string; group?: string; config: { stops: unknown[] } }[])
        .filter((f) => f.group === 'g-recent' && f.name === 'New gradient')
        .map((f) => f.config.stops.length),
    );
    if (!recent.includes(3)) fail(`[13a] the edited new gradient is not in Recent (New gradient entries: ${JSON.stringify(recent)})`);
    console.log('✓ [13a] "start a new one" → black → white "New gradient" (2 stops, linear / oklab); Ctrl+Z → nothing, Ctrl+Y → back; a track click adds a stop; it is in Recent');

    // [13b] from the hero's ☰ after a pick: it LEADS the menu, replaces the gradient, one Ctrl+Z restores
    const wallBox = (await np.locator('[data-gx-keepselect] canvas').first().boundingBox())!;
    await np.mouse.click(wallBox.x + 16 + 33 * 3, wallBox.y + 9);
    await np.mouse.move(640, 40);
    await np.waitForTimeout(700);
    const picked = await full(np);
    if (picked.kind !== 'gradient' || sigOf(picked.config) === NEW_SIG) fail(`[13b] setup: the wall pick did not become the working gradient (${picked.kind})`);
    await np.click(MENU);
    const item = np.locator('button:has-text("New Gradient")');
    await item.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('[13b] the hero ☰ menu has no "New Gradient"'));
    if (!(await item.evaluate((el) => el.previousElementSibling === null))) fail('[13b] "New Gradient" does not lead the ☰ menu');
    await item.click();
    await np.waitForTimeout(500);
    n = await full(np);
    if (!isNew(n)) fail(`[13b] ☰ ▸ New Gradient did not replace "${picked.name}" with the new gradient (${sigOf(n.config)} "${n.name}")`);
    await undoKey(np);
    n = await full(np);
    if (sigOf(n.config) !== sigOf(picked.config) || n.name !== picked.name) fail(`[13b] one Ctrl+Z after ☰ ▸ New Gradient did not give back "${picked.name}" (got "${n.name}" ${sigOf(n.config)})`);
    console.log(`✓ [13b] ☰ ▸ New Gradient (first in the menu) replaced "${picked.name}"; one Ctrl+Z gave it back`);

    // [13c] with the Mix face open: New closes it, and the same Ctrl+Z puts the face AND the mix back
    await np.click('[data-gx-tray-tab="mix"]');
    await np.waitForTimeout(700);
    n = await full(np);
    if (n.tray !== 'mix' || n.kind !== 'build') fail(`[13c] setup: Mix did not open (${n.tray}, ${n.kind})`);
    await np.click(MENU);
    await item.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('[13c] the ☰ menu in Mix has no "New Gradient"'));
    await item.click();
    await np.waitForTimeout(600);
    n = await full(np);
    if (!isNew(n)) fail(`[13c] ☰ ▸ New Gradient in Mix did not make the new gradient (${n.kind} ${sigOf(n.config)})`);
    if (n.tray !== null) fail(`[13c] New Gradient left the ${n.tray} face open over a fixed gradient`);
    await undoKey(np);
    n = await full(np);
    if (n.kind !== 'build') fail(`[13c] one Ctrl+Z did not bring the live Mix back (${n.kind})`);
    if (n.tray !== 'mix') fail(`[13c] one Ctrl+Z brought the mix back without its face (tray ${n.tray})`);
    await np.keyboard.press('Escape');
    await np.waitForTimeout(300);
    console.log('✓ [13c] in Mix: New Gradient closes the face; one Ctrl+Z puts the live mix AND its face back');
    await nctx.close();

    // [13d] a phone: the line offers it on screen, a tap makes it, the ☰ carries it, nothing overflows
    const pctx = await browser.newContext({ ...devices['Pixel 5'] });
    await seedGeSmokeState(pctx);
    const pp = await pctx.newPage();
    pp.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await pp.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await pp.waitForTimeout(1500);
    const vw = pp.viewportSize()!.width;
    const nb = await pp.locator('[data-gx-new-gradient]').boundingBox();
    if (!nb || nb.x < 0 || nb.x + nb.width > vw) fail(`[13d] "start a new one" is not on the phone screen (${JSON.stringify(nb)})`);
    await pp.locator('[data-gx-new-gradient]').tap();
    await pp.waitForSelector('[data-gx-hero] [data-gx-knot-track]', { timeout: 8000 }).catch(() => fail('[13d] a tap on "start a new one" made no hero'));
    await pp.waitForTimeout(400);
    n = await full(pp);
    if (!isNew(n)) fail(`[13d] the phone's new gradient is ${sigOf(n.config)} "${n.name}"`);
    if (n.overflow > 0) fail(`[13d] the page overflows the phone by ${n.overflow}px with the new gradient up`);
    await pp.tap(MENU);
    const pItem = pp.locator('button:has-text("New Gradient")');
    await pItem.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('[13d] the phone ☰ has no "New Gradient"'));
    const ib = (await pItem.boundingBox())!;
    if (ib.x < 0 || ib.x + ib.width > vw + 1) fail(`[13d] "New Gradient" is off the phone screen (${JSON.stringify(ib)})`);
    await pctx.close();
    console.log('✓ [13d] Pixel 5: "start a new one" on screen, a tap makes the new gradient, the ☰ leads with New Gradient, no overflow');
  }

  // [14] Esc takes the nearest held thing
  await escTakesTheNearest(browser, errors);
  // [15] Filters folds the hero
  await filtersFoldTheHero(browser, errors);

  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log('PASS smoke-ge-ground');
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
