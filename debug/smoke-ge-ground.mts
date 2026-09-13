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
 *   [6] search narrows All; "Keep these N" files the narrowed wall as a group and puts it
 *       on the ground: a lit group chip with that count, the title carrying the label
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
 *
 * FALSIFIED 2026-09-08 (each reverted): `useGroundSource` returning null for every set reds
 * [3] "the title does not say Today"; `tileSizeFor` returning the base for every count reds
 * [3] "the tiles did not grow"; dropping `setGroundSetId(groupSetId(g))` from `keepThese`
 * reds [6] "the ground did not switch to the new group".
 *
 * Run: `npm run smoke:ge-ground` (needs `npm run dev` on :3400, or ENGINE_URL).
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

  // [6] Keep these N.
  //
  // The term has to narrow All to at most KEEP_MAX (400 in BrowseStage.tsx) — the button is
  // deliberately withheld above that. It was 'fire' until 2026-09-09, when the catalogue had
  // grown enough that 'fire' matched 535 and the smoke went red without anything being
  // broken. 'ember' matches 38. If this fails again, check the COUNT before the feature:
  // the failure below prints it.
  await page.fill('input[placeholder^="Search"]', 'ember');
  await page.waitForTimeout(500);
  s = await state(page);
  const m = /Keep these ([\d,]+)/.exec(s.keep ?? '');
  if (!m) {
    const narrowed = await page.evaluate(() => document.body.innerText.match(/([\d,]+) match/)?.[1] ?? '?');
    fail(`[6] "Keep these N" is not offered on a narrowed All (${s.keep}) — the search matched ${narrowed}; the button is withheld above KEEP_MAX (400), so a count over that means this term has outgrown the fixture, not that the feature broke`);
  }
  const n = Number(m![1].replace(/,/g, ''));
  await page.click('[data-gx-keep-these]');
  await page.waitForTimeout(700);
  s = await state(page);
  if (!s.ground?.startsWith('group:')) fail(`[6] the ground did not switch to the new group (${s.ground})`);
  const chip = s.chips.find((c) => c.id === s.ground);
  if (!chip || !chip.lit || chip.kind !== 'group') fail(`[6] no lit group chip for the ground (${JSON.stringify(s.chips)})`);
  if (chip.count !== n) fail(`[6] the group holds ${chip.count}, the wall offered ${n}`);
  // the label is the search term, capitalised — kept in step with the term above
  if (!s.title || !/Ember/.test(s.title)) fail(`[6] the title does not carry the label ("${s.title}")`);
  console.log(`✓ [6] Keep these ${n} → group "${s.title}" on the ground, chip lit`);
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

  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log('PASS smoke-ge-ground');
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
