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
      tools: wall?.querySelectorAll('button[aria-label]').length ?? 0,
      toolLabels: Array.from(wall?.querySelectorAll('button[aria-label]') ?? []).map((b) => b.getAttribute('aria-label') ?? ''),
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

  // [1]
  let s = await state(page);
  if (s.ground !== 'all') fail(`[1] the ground is not All (${s.ground})`);
  if (!s.pad || !s.filters) fail('[1] the pad / Filters are missing on All');
  if (s.tools !== 4) fail(`[1] ${s.tools} tools on All, expected 4`);
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
  if (s.toolLabels.join(',') !== 'List view,Zoom')
    fail(`[3] the corner should offer List view + Zoom on a set, not ${s.toolLabels.join(' + ') || 'nothing'} — a carve tool leaking back changes what a selection MEANS here`);
  if (s.canvases !== 1) fail(`[3] ${s.canvases} canvases for two tiles`);
  if ((s.canvasLeft ?? 99) > 2) fail(`[3] the set's canvas does not start at the wall's edge (x=${s.canvasLeft})`);
  if ((s.canvasH ?? 0) < 60) fail(`[3] the tiles did not grow (canvas height ${s.canvasH})`);
  if ((s.canvasH ?? 0) > 220) fail(`[3] two tiles wrapped into a wall (canvas height ${s.canvasH})`);
  if (!s.chips.find((c) => c.id === today.id)?.lit) fail('[3] the Today chip is not lit');
  console.log(`✓ [3] Today on the ground: title "${s.title}", one canvas ${s.canvasW}×${s.canvasH} at x=${s.canvasLeft}, zoom only`);

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

  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log('PASS smoke-ge-ground');
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
