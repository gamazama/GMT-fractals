/**
 * smoke:ge-wallzoom — a zoom keeps the grabbed gradient where it was grabbed, at any depth (2026-10-01).
 *
 * The wall's zoom commits by setting the scroll so "the grabbed swatch is exactly where it was". That is
 * only true if the wall SCALED, and until this smoke nothing checked it in the DOM: the pure harness
 * (`test-palette-wallzoom.mts`) proves the anchor's arithmetic and stayed green while the wall re-flowed
 * under it. Found filming the Explorer: on the All wall, scrolled deep, a middle-drag past ~×2 left the
 * grabbed tile more than a screen away.
 *
 * What was wrong, each measured before it was fixed (`palette/components/PickerWall.tsx`):
 *   · a band was cut into chunks by the ZOOMED cell, and each chunk fills column-major by itself — so
 *     once the tile grew enough for the 2200 px canvas cap to cut a band, the band re-filled (2,567
 *     tiles: one 50-row grid → 37 + 13 rows at ×2.83; the tile moved 9 columns and 21 rows);
 *   · the scroll box's 12 px top padding was scaled as if it were tiles: 12 × (ratio − 1) px of drift,
 *     13 px at ×2 and 183 px at ×16;
 *   · a wall small enough to be squared up took its column count from the zoomed cell (31 tiles:
 *     7 → 10 columns on ×2 in height alone);
 *   · a zoom too small to change the rounded tile never ran the commit, so the live transform stayed
 *     on the wall.
 *
 * Tiles are named by the HOVER CARD — what a user reads — never by the wall's own layout rule; the
 * chunk boxes are read only to say how far inside its cell the grab point sits, and for messages.
 * "Where it was grabbed" is the point the button went down on, which is where the commit pins it.
 *
 *   [1] the reported case: deep in the All wall, one drag to ×2.83 — the same gradient, the same spot
 *       in its cell;
 *   [2] ×2 by the middle button, then ×2 by the zoom TOOL's left-drag, each checked;
 *   [3] ×4 and back out to 1:1 in two drags — the same gradient, and the wall back where it started;
 *   [4] the top of the range: one drag to ×16 near the top of the wall (the padding's worst case);
 *   [5] the bottom of the range: tiles ×0.3 in height, at depth;
 *   [6] header bands above the grab point (Group by Collection), ×4 at depth;
 *   [7] an ungrouped wall — one band already in several chunks at 1:1 — ×4 deep in its second chunk;
 *   [8] MID-drag: the grabbed point has not moved under the live transform;
 *   [9] a 7 px middle-drag leaves no transform on the wall;
 *   [10] a small, squared-up wall: zooming one axis changes neither its columns nor its rows, and the
 *        tile in a band's last row is still the gradient a click picks there;
 *   [11] the − / + STEP (`zoomStep`, the phone's buttons): three presses of + and three of − at depth
 *        keep the gradient under the viewport centre;
 *   [12] a chunk drawn by several canvases: on one that is NOT its first, the tile PAINTED at a point
 *        is the gradient the hover card shows for it, and a zoom-tool tap (which finds the tile through
 *        the wall's registry, as the carve tools do) picks it;
 *   [13] the keyboard cursor at ×4 walks the grid as drawn: N presses of ↓ then Enter pick the tile on
 *        that row of the first column, on a chunk's second canvas.
 *
 * The limit this does not assert, because it is the wall's design: the wall is a bounded scroller, so a
 * zoom that brings one of its edges into the box stops at that edge (grep "bounded scroll" in
 * PickerWall). [3], [5] and [10] are chosen so the commit's scroll target stays in range.
 *
 * Needs `npm run dev` on 3400 (the catalogue packs' CDN allows localhost:3400 only) or ENGINE_URL.
 * Real mouse input, a fresh browser context per step, HMR blocked so an edit to the tree mid-run cannot
 * reload the page. `ONLY=4,9` runs just those steps; a red step does not stop the ones after it.
 * Run: `npx tsx debug/smoke-ge-wallzoom.mts` (about 70 s).
 *
 * FALSIFIED 2026-10-02 with the steps as they stand here, each break made to the fixed PickerWall.tsx
 * alone and put back (the file's hash checked after each):
 *   · the PRE-FIX file, whole → red on all thirteen. [1]–[11] on the claim ([1] "grabbed … and "carr333"
 *     is there … row 36 of 50, that spot is now … row 36 of 37"; [9] "left the live transform on the
 *     wall: … scale(1, 1.01884)"; [10] "7c … → … 10c"; [11] "row 72 of 110 … row 72 of 84"). [12] and
 *     [13] at SETUP: they are about a chunk drawn by several canvases, which did not exist — the three
 *     breaks below that touch it are what falsify them.
 *   · F1 the chunk length sized from the zoomed cell (the old rule) → [1] [2] [3] [4] [7] [11], and
 *     [12] [13] at setup. NOT [5] [6]: no band there is tall enough for the cap to cut.
 *   · F2 the top padding left in the scaled part → [1] [2] [3] [4] [5] [6] [7] [11], every one by the
 *     12 × (ratio − 1) it predicts (12.5 px at ×2, 23.1 at ×2.83, 36.6 at ×4, 183.3 at ×16, 3.1 for one
 *     press of +). At ×2 and ×2.83 the gradient is still the same one — only the slide inside the cell
 *     catches it, which is why every step measures that as well as the name.
 *   · F3 the squarish column count decided from the zoomed cell (the old rule) → [10] alone.
 *   · F4 the commit effect keyed on the rounded tile (the old key) → [9] alone.
 *   · F5 the live transform scaled from the anchor's scroll y, the padding not taken off → [8] alone
 *     ("slid 0.0 px across and 12.0 px down").
 *   · F6 the header bands not counted → [6] alone. The pre-fix file passes this one's intent — its
 *     headers were always counted — so [6] is red there for the padding only; F6 is what proves the
 *     step can see the headers.
 *   · F7 `pinnedContentPoint` scaling the fixed px with the swatches → the same eight as F2.
 *   · F8 a canvas PAINTING its chunk's first rows whatever rows it holds → [12] alone. The eleven
 *     name-based steps stay green: the hover still finds the right tile, it is the picture that is
 *     wrong — the case [12] exists for.
 *   · F9 a canvas FINDING tiles as if it held its chunk's first rows → [2] [3] [4] [7] [11] [12] [13],
 *     each saying the same cell now holds another gradient.
 *   · F10 the keyboard cursor handed a zoom-sized chunk length → [13] alone.
 * Two things this file got wrong on the way and now does on purpose: a second click on the tile that
 * is already the working gradient is the app's "edit this one", so [10] picks the row above in between;
 * and the Explorer SAVES what a step does (a pick opens the hero, the arrangement is a setting), so on a
 * shared profile [12] was inheriting [10]'s wall — hence a context per step.
 */
import { chromium, type Browser, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const BASE = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

/** How far inside its cell the grab point may drift (px). The commit's scroll is whole pixels. */
const TOL = 2;
/** One doubling of the zoom, in px of drag (`ZOOM_PX_PER_DOUBLE`). */
const DOUBLE = 260;

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};
const ok = (msg: string) => console.log(`✓ ${msg}`);

/**
 * In-page helpers, as TEXT: tsx's keepNames wraps a named function inside an evaluated callback in a
 * helper the page does not have. Installed by an init script, so every navigation has them.
 */
const HELPERS = `
window.__wz = {
  grid: function () { return document.querySelector('[role="grid"]'); },
  view: function () {
    var g = this.grid(); var r = g.getBoundingClientRect(); var c = g.firstElementChild;
    return { left: r.left, top: r.top, cw: g.clientWidth, ch: g.clientHeight, sl: g.scrollLeft, st: g.scrollTop,
             sw: g.scrollWidth, sh: g.scrollHeight, transform: c ? c.style.transform : '',
             headers: g.querySelectorAll('[data-wall-header]').length };
  },
  // The tile under a viewport point, read off the chunk's own box — so it holds under the live transform too.
  tileAt: function (x, y) {
    var g = this.grid(); var ws = g.querySelectorAll('[data-wall-chunk]');
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i]; var r = w.getBoundingClientRect();
      if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      var cols = +w.dataset.wallChunkCols; var nrows = Math.round(w.offsetHeight / +w.dataset.wallChunkCellh);
      var cw = r.width / cols; var ch = r.height / nrows;
      var col = Math.floor((x - r.left) / cw); var row = Math.floor((y - r.top) / ch);
      var band = w.closest('[data-wall-band]'); var tallest = 0;
      band.querySelectorAll('canvas').forEach(function (c) { tallest = Math.max(tallest, c.getBoundingClientRect().height); });
      var gr = g.getBoundingClientRect(); var above = 0;
      g.querySelectorAll('[data-wall-header]').forEach(function (h) { if (h.getBoundingClientRect().bottom <= y) above++; });
      return { band: band.dataset.wallBand, chunk: w.dataset.wallChunk, col: col, row: row, cols: cols, nrows: nrows,
               index: +w.dataset.wallChunkStart + (w.dataset.wallChunkRowmajor ? row * cols + col : col * nrows + row),
               cellW: cw, cellH: ch, fx: (x - r.left) / cw - col, fy: (y - r.top) / ch - row,
               bandH: band.getBoundingClientRect().height, tallestCanvas: tallest, chunksInBand: band.querySelectorAll('[data-wall-chunk]').length,
               headersAbove: above, relY: y - gr.top };
    }
    return null;
  },
  // Every chunk as drawn: which band, how many columns and rows.
  layout: function () {
    var out = [];
    this.grid().querySelectorAll('[data-wall-chunk]').forEach(function (w) {
      out.push(w.dataset.wallChunk + ' ' + w.dataset.wallChunkCols + 'c×' + Math.round(w.offsetHeight / +w.dataset.wallChunkCellh) + 'r');
    });
    return out.join(' | ');
  },
  // The viewport centre of the tile at (col, row) of a chunk.
  cellCentre: function (chunk, col, row) {
    var w = this.grid().querySelector('[data-wall-chunk="' + CSS.escape(chunk) + '"]');
    if (!w) return null;
    var r = w.getBoundingClientRect(); var cols = +w.dataset.wallChunkCols; var nrows = Math.round(w.offsetHeight / +w.dataset.wallChunkCellh);
    return { x: r.left + (col + 0.5) * (r.width / cols), y: r.top + (row + 0.5) * (r.height / nrows) };
  },
  hoverName: function () {
    var cv = document.querySelector('body > canvas.fixed.pointer-events-none');
    var tip = cv && cv.nextElementSibling;
    var s = tip && tip.querySelector('span.font-medium');
    return s ? s.textContent : '';
  },
  canvasAt: function (x, y) { var e = document.elementFromPoint(x, y); return !!e && e.tagName === 'CANVAS' && this.grid().contains(e); },
  // The tile PAINTED under a point against the gradient the hover card shows for it: five colours along
  // each, at the same fractions of the ramp. Also how many rows down its chunk the canvas under the
  // point starts (0 = it is the chunk's first canvas).
  paintedVsCard: function (x, y) {
    var cv = document.elementFromPoint(x, y); var card = document.querySelector('body > canvas.fixed.pointer-events-none');
    var t = this.tileAt(x, y);
    if (!cv || cv.tagName !== 'CANVAS' || !card || !t) return null;
    var chunk = cv.closest('[data-wall-chunk]'); var cr = chunk.getBoundingClientRect(); var r = cv.getBoundingClientRect();
    var s = cv.width / r.width; var ctx = cv.getContext('2d');
    // a cell is the tile and then the gap: 45 % down the cell is the middle of the tile
    var left = Math.round((cr.left + t.col * t.cellW - r.left) * s); var mid = Math.round((cr.top + (t.row + 0.45) * t.cellH - r.top) * s);
    // the tile is narrower than its cell by the gap, which is transparent: walk right to where the paint stops
    var w = 0; var max = Math.round(t.cellW * s);
    while (w < max && ctx.getImageData(left + w, mid, 1, 1).data[3] > 0) w++;
    var cctx = card.getContext('2d'); var out = { rowsDown: Math.round((r.top - cr.top) / t.cellH), tileW: w, wall: [], card: [] };
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (f) {
      var a = ctx.getImageData(left + Math.floor(f * w), mid, 1, 1).data;
      var b = cctx.getImageData(Math.floor(f * card.width), Math.floor(card.height / 2), 1, 1).data;
      out.wall.push([a[0], a[1], a[2]]); out.card.push([b[0], b[1], b[2]]);
    });
    return out;
  },
  // A point over a tile in the FIRST column, at or below y: every row of every band has one there,
  // which a point picked by eye does not (a short band's row stops early, and a header is not a tile).
  firstColumnPoint: function (y) {
    var w = this.grid().querySelector('[data-wall-chunk]');
    if (!w) return null;
    var x = Math.round(w.getBoundingClientRect().left + +w.dataset.wallChunkCellw * 0.45);
    for (var dy = 0; dy < 240; dy += 3) {
      var t = this.canvasAt(x, y + dy) ? this.tileAt(x, y + dy) : null;
      if (t && t.fy > 0.25 && t.fy < 0.6) return { x: x, y: y + dy };
    }
    return null;
  },
};
`;

interface Tile { band: string; chunk: string; col: number; row: number; cols: number; nrows: number; index: number; cellW: number; cellH: number; fx: number; fy: number; bandH: number; tallestCanvas: number; chunksInBand: number; headersAbove: number; relY: number }
interface View { left: number; top: number; cw: number; ch: number; sl: number; st: number; sw: number; sh: number; transform: string; headers: number }

const view = (page: Page) => page.evaluate('__wz.view()') as Promise<View>;
const tileAt = (page: Page, x: number, y: number) => page.evaluate(`__wz.tileAt(${x}, ${y})`) as Promise<Tile | null>;
const layout = (page: Page) => page.evaluate('__wz.layout()') as Promise<string>;

/** The name on the hover card at a point — '' when no card comes up. Parks off the wall first, so the
 *  card that answers is this point's and not the last one's. */
const nameAt = async (page: Page, x: number, y: number): Promise<string> => {
  await page.mouse.move(8, 8);
  await page.waitForFunction('!__wz.hoverName()', null, { timeout: 2000 }).catch(() => {});
  // the canvas under the point mounts a frame or two after a zoom commit (the wall virtualizes them)
  await page.waitForFunction(`__wz.canvasAt(${x}, ${y})`, null, { timeout: 6000 }).catch(() => {});
  await page.mouse.move(x - 2, y - 1);
  await page.mouse.move(x, y);
  const h = await page.waitForFunction('__wz.hoverName()', null, { timeout: 2500 }).catch(() => null);
  return h ? ((await h.jsonValue()) as string) : '';
};

/**
 * A zoom drag from (x, y): `dx` right doubles the width every 260 px, `dy` UP the height. The middle
 * button by default; `'left'` is the zoom TOOL's drag, which wants the tool armed first.
 */
const zoomDrag = async (page: Page, x: number, y: number, dx: number, dy: number, release = true, button: 'middle' | 'left' = 'middle') => {
  await page.mouse.move(x, y);
  await page.mouse.down({ button });
  const steps = Math.max(6, Math.round(Math.hypot(dx, dy) / 40));
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y - (dy * i) / steps);
    await page.waitForTimeout(16);
  }
  if (!release) return;
  await page.mouse.up({ button });
  await page.waitForTimeout(350);
};

const scrollTo = async (page: Page, top: number) => {
  await page.evaluate(`(function () { var g = __wz.grid(); g.scrollLeft = 0; g.scrollTop = ${top}; })()`);
  await page.waitForTimeout(350);
};

const arrange = async (page: Page, groupBy: number, rowsBy: number) => {
  await page.evaluate(`window.__store.getState().setPaletteFilters({ groupBy: ${groupBy}, rowsBy: ${rowsBy} })`);
  await page.waitForTimeout(900);
};

/** Boot the Explorer with the whole catalogue on the wall, arranged the way a fresh profile gets it
 *  (no groups, rows by lightness, sorted by hue). */
const boot = async (page: Page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('[role="grid"] canvas', { timeout: 30000 }).catch(() => fail('setup: no wall'));
  // the packs arrive after the first paint; the catalogue wall is several screens tall once they have
  await page.waitForFunction('__wz.view().sh > 3 * __wz.view().ch', null, { timeout: 60000 })
    .catch(() => fail('setup: the catalogue did not load (the packs\' CDN allows localhost:3400 only)'));
  await page.waitForTimeout(700);
};

/**
 * The claim, once: after `drags` from (x, y), the gradient that was at (x, y) is at (x, y), at the same
 * spot inside its cell. `need` is what the step's setup has to be true for it to mean anything.
 */
const holds = async (page: Page, label: string, x: number, y: number, drags: [number, number][], need?: (before: Tile, after: Tile) => string | null, button: 'middle' | 'left' = 'middle') => {
  const name0 = await nameAt(page, x, y);
  const t0 = await tileAt(page, x, y);
  if (!name0 || !t0) fail(`${label} setup: no gradient under the grab point (${x}, ${y})`);
  let tLast = t0!;
  for (const [i, [dx, dy]] of drags.entries()) {
    const step = drags.length > 1 ? `${label} drag ${i + 1}` : label;
    const v0 = await view(page);
    await zoomDrag(page, x, y, dx, dy, true, button);
    const v1 = await view(page);
    const name1 = await nameAt(page, x, y);
    const t1 = await tileAt(page, x, y);
    const where = `scroll ${Math.round(v0.sl)},${Math.round(v0.st)} of ${v0.sw}×${v0.sh} → ${Math.round(v1.sl)},${Math.round(v1.st)} of ${v1.sw}×${v1.sh}`;
    if (name1 !== name0) {
      fail(`${step}: grabbed "${name0}" at (${x}, ${y}) and "${name1 || 'nothing'}" is there after the zoom — it was ${t0!.chunk} col ${t0!.col} row ${t0!.row} of ${t0!.nrows}, that spot is now ${t1?.chunk} col ${t1?.col} row ${t1?.row} of ${t1?.nrows} (${where})`);
    }
    if (!t1) fail(`${step}: no tile under the grab point after the zoom (${where})`);
    const dxPx = (t1!.fx - t0!.fx) * t1!.cellW, dyPx = (t1!.fy - t0!.fy) * t1!.cellH;
    if (Math.abs(dxPx) > TOL || Math.abs(dyPx) > TOL) {
      fail(`${step}: "${name0}" is still under the grab point but slid ${dxPx.toFixed(1)} px across and ${dyPx.toFixed(1)} px down inside its ${Math.round(t1!.cellW)}×${Math.round(t1!.cellH)} cell (${where})`);
    }
    tLast = t1!;
  }
  const why = need?.(t0!, tLast);
  if (why) fail(`${label} setup: ${why}`);
  return { name: name0, before: t0!, after: tLast };
};

/** Wider than one canvas: the cap has cut this band, which is what used to re-fill it. */
const cutByTheCap = (_b: Tile, a: Tile): string | null =>
  a.bandH > a.tallestCanvas + 1 ? null : `the band under the grab point (${Math.round(a.bandH)} px) is still one canvas — the zoom did not reach the canvas cap, so the step proves nothing`;

/** Steps to run: `ONLY=1,4 npx tsx debug/smoke-ge-wallzoom.mts` (the default is all of them). */
const ONLY = (process.env.ONLY || '').split(',').map((t) => t.trim()).filter(Boolean);
const ran: string[] = [];
const red: string[] = [];

/** What a step is handed: its page, the wall's box, the middle of it, and a scroll position well down. */
interface Stage { page: Page; v: View; mx: number; my: number; deep: number; at: (fx: number, fy: number) => [number, number] }

/**
 * One step, in a browser context of its own. The Explorer SAVES what a step does — a pick lands in
 * Recent and opens the hero, the arrangement is a setting — so on a shared profile each step would
 * inherit the last one's wall, and `ONLY=` would run a different test from the full run. A red step
 * does not stop the run either: a break that reds four steps is told apart from one that reds one.
 */
const step = async (browser: Browser, id: string, viewport: { width: number; height: number }, fn: (s: Stage) => Promise<void>) => {
  if (ONLY.length && !ONLY.includes(id)) return;
  ran.push(id);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  try {
    await seedGeSmokeState(ctx);
    await ctx.addInitScript({ content: HELPERS });
    await ctx.routeWebSocket(/./, () => {}); // no HMR: an edit to the tree mid-run must not reload the page
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log(`  pageerror: ${e.message}`); });
    await boot(page);
    const v = await view(page);
    const at = (fx: number, fy: number): [number, number] => [Math.round(v.left + v.cw * fx), Math.round(v.top + v.ch * fy)];
    const [mx, my] = at(0.5, 0.5);
    await fn({ page, v, mx, my, deep: Math.round((v.sh - v.ch) * 0.8), at });
    if (errors.length) fail(`[${id}] pageerror during the step: ${errors[0]}`);
  } catch (e) {
    red.push(id);
    // `fail` has already printed its line; anything else is the harness's own and wants its message seen
    const msg = String((e as Error)?.message ?? e);
    if (!/^(\[|setup:)/.test(msg)) console.log(`✗ [${id}] ${msg}`);
  } finally {
    await ctx.close();
  }
};

const DESK = { width: 1920, height: 1080 };
/**
 * The phone layout is `innerWidth < 768` or a coarse pointer. A NARROW desktop context gets the layout
 * (and its − / + buttons) while keeping the hover card, which a coarse pointer switches off. A phone's
 * width, not just "narrow": the phone loads a smaller catalogue, and it takes ~10 columns for its
 * biggest band to run past one chunk at 1:1.
 */
const PHONE = { width: 393, height: 851 };

async function run() {
  const browser = await chromium.launch();
  try {
    await step(browser, '1', DESK, async ({ page, mx, my, deep }) => {
      await scrollTo(page, deep);
      const r = await holds(page, '[1]', mx, my, [[DOUBLE * 1.5, DOUBLE * 1.5]], cutByTheCap);
      ok(`[1] deep in the wall, one drag to ×2.83: "${r.name}" is still at the grab point (its band is ${r.before.nrows} rows before and ${r.after.nrows} after)`);
    });

    await step(browser, '2', DESK, async ({ page, mx, my, deep }) => {
      await scrollTo(page, deep);
      const a = await holds(page, '[2] the middle-drag', mx, my, [[DOUBLE, DOUBLE]]);
      // the second doubling by the zoom TOOL: a left-drag with it armed is the same gesture
      await page.locator('[data-gx-tools] button[aria-label="Zoom"]').click();
      await page.waitForTimeout(300);
      const b = await holds(page, '[2] the zoom tool', mx, my, [[DOUBLE, DOUBLE]], cutByTheCap, 'left');
      if (b.name !== a.name) fail(`[2] the zoom tool's drag started on "${b.name}", not on "${a.name}" which the middle-drag left there`);
      if (b.after.cellH < a.after.cellH * 1.8) fail(`[2] setup: the zoom tool's left-drag did not zoom (cell ${Math.round(a.after.cellH)} → ${Math.round(b.after.cellH)} px)`);
      ok(`[2] ×2 by the middle button, then ×2 by the zoom tool: "${a.name}" held at both`);
    });

    await step(browser, '3', DESK, async ({ page, mx, my, deep }) => {
      await scrollTo(page, deep);
      const name = await nameAt(page, mx, my);
      await zoomDrag(page, mx, my, DOUBLE * 2, DOUBLE * 2);
      // whatever the way in did, the way out starts from the gradient that is at the grab point NOW
      const r = await holds(page, '[3]', mx, my, [[-DOUBLE, -DOUBLE], [-DOUBLE, -DOUBLE]]);
      const back = await view(page);
      if (r.name !== name) fail(`[3] after ×4 and back to 1:1 the grab point holds "${r.name}", not "${name}" which was there before`);
      if (Math.abs(back.st - deep) > 2 || Math.abs(back.sl) > 2) fail(`[3] zooming back out to 1:1 left the wall at ${Math.round(back.sl)},${Math.round(back.st)}, not 0,${deep} where it started`);
      ok(`[3] ×4 and back out to 1:1 in two drags: "${r.name}" held, and the wall is where it started`);
    });

    await step(browser, '4', DESK, async ({ page, at }) => {
      const [bx, by] = at(0.26, 0.97);
      const r = await holds(page, '[4]', bx, by, [[DOUBLE * 4, DOUBLE * 4]], (_b, a) => (a.cellH > 250 ? null : `the zoom reached a ${Math.round(a.cellH)} px cell, not the ×16 ceiling`));
      ok(`[4] ×16 in one drag from the top of the wall: "${r.name}" held, in a ${Math.round(r.after.cellW)}×${Math.round(r.after.cellH)} cell`);
    });

    await step(browser, '5', DESK, async ({ page, v, mx, my }) => {
      // the width is left alone: at 1:1 the wall is exactly as wide as its box and cannot scroll sideways
      await scrollTo(page, Math.round((v.sh - v.ch) * 0.45));
      const r = await holds(page, '[5]', mx, my, [[0, -DOUBLE * 2]], (b, a) => (a.cellH < b.cellH * 0.45 ? null : `the cell went ${b.cellH} → ${a.cellH} px, not down to the ×0.3 floor`));
      ok(`[5] tiles ×0.3 in height at depth: "${r.name}" held (rows ${r.before.cellH} → ${r.after.cellH} px)`);
    });

    await step(browser, '6', DESK, async ({ page, my }) => {
      await arrange(page, 3, 0); // Group by Collection, no sub-rows: a header on every band
      const v6 = await view(page);
      if (v6.headers < 10) fail(`[6] setup: Group by Collection drew ${v6.headers} header bands`);
      await scrollTo(page, Math.round((v6.sh - v6.ch) * 0.7));
      const p = (await page.evaluate(`__wz.firstColumnPoint(${my})`)) as { x: number; y: number } | null;
      if (!p) fail('[6] setup: no tile in the first column near the middle of the wall');
      const r = await holds(page, '[6]', p!.x, p!.y, [[DOUBLE * 2, DOUBLE * 2]], (b) => (b.headersAbove >= 10 ? null : `only ${b.headersAbove} header bands above the grab point`));
      ok(`[6] ${r.before.headersAbove} header bands above the grab point, ×4: "${r.name}" held`);
    });

    await step(browser, '7', DESK, async ({ page, mx, my }) => {
      await arrange(page, 0, 0); // no groups, no sub-rows: the whole catalogue is one band
      const v7 = await view(page);
      await scrollTo(page, Math.round((v7.sh - v7.ch) * 0.8));
      const r = await holds(page, '[7]', mx, my, [[DOUBLE * 2, DOUBLE * 2]], (b) =>
        b.chunksInBand > 1 && !/#0$/.test(b.chunk) ? null : `wanted a band in several chunks and a grab point past its first (${b.chunksInBand} chunk(s), grabbed in ${b.chunk})`);
      ok(`[7] an ungrouped wall, ×4 in chunk ${r.before.chunk}: "${r.name}" held`);
    });

    await step(browser, '8', DESK, async ({ page, mx, my, deep }) => {
      await scrollTo(page, deep);
      const t0 = await tileAt(page, mx, my);
      if (!t0) fail('[8] setup: no tile under the grab point');
      await zoomDrag(page, mx, my, DOUBLE, DOUBLE, false);
      await page.waitForTimeout(120); // the transform is applied on the next frame
      const live = await view(page);
      const mid = await tileAt(page, mx, my);
      await page.mouse.up({ button: 'middle' });
      await page.waitForTimeout(350);
      if (!/scale\(/.test(live.transform)) fail(`[8] setup: no live transform mid-drag (${JSON.stringify(live.transform)})`);
      if (!mid || mid.chunk !== t0!.chunk || mid.index !== t0!.index) fail(`[8] mid-drag the grab point is over ${mid?.chunk} #${mid?.index}, not ${t0!.chunk} #${t0!.index} which was grabbed`);
      const slid = { x: (mid!.fx - t0!.fx) * mid!.cellW, y: (mid!.fy - t0!.fy) * mid!.cellH };
      if (Math.abs(slid.x) > TOL || Math.abs(slid.y) > TOL) fail(`[8] mid-drag the grabbed point slid ${slid.x.toFixed(1)} px across and ${slid.y.toFixed(1)} px down under the pointer (${live.transform})`);
      ok(`[8] mid-drag at ×2 the grabbed point has not moved (${slid.x.toFixed(1)}, ${slid.y.toFixed(1)} px)`);
    });

    await step(browser, '9', DESK, async ({ page, mx, my }) => {
      const before = await layout(page);
      await zoomDrag(page, mx, my, 0, 7);
      const v9 = await view(page);
      if ((await layout(page)) !== before) fail('[9] setup: a 7 px drag changed the tile size — it is meant to be too small to');
      if (v9.transform) fail(`[9] a 7 px middle-drag left the live transform on the wall: ${v9.transform}`);
      ok('[9] a 7 px middle-drag leaves no transform on the wall');
    });

    await step(browser, '10', DESK, async ({ page }) => {
      await page.locator('[data-gx-search]').fill('flag');
      await page.waitForTimeout(900);
      const small = await page.evaluate(`(function () {
        var g = __wz.grid(); var pick = null;
        g.querySelectorAll('[data-wall-chunk]').forEach(function (w) {
          var rows = Math.round(w.offsetHeight / +w.dataset.wallChunkCellh);
          if (!pick && rows >= 2) pick = { chunk: w.dataset.wallChunk, row: rows - 1 };
        });
        var first = g.querySelector('[data-wall-chunk]');
        return { cols: first ? +first.dataset.wallChunkCols : 0, cellW: first ? +first.dataset.wallChunkCellw : 0, clientW: g.clientWidth, pick: pick };
      })()`) as { cols: number; cellW: number; clientW: number; pick: { chunk: string; row: number } | null };
      if (!small.cols || small.cols * small.cellW > small.clientW * 0.7) fail(`[10] setup: searching "flag" did not leave a squared-up wall (${small.cols} columns of ${small.cellW} px in ${small.clientW})`);
      if (!small.pick) fail('[10] setup: no band of two rows on the small wall');
      /** Click the first-column tile of a row of the chosen band (scrolled into the box first), and say
       *  what the working gradient then is. These tiles are too big for a hover card, so a pick names them. */
      const clickRow = async (row: number): Promise<string> => {
        const cell = `__wz.cellCentre(${JSON.stringify(small.pick!.chunk)}, 0, ${row})`;
        const c = (await page.evaluate(cell)) as { x: number; y: number } | null;
        if (!c) fail(`[10] the band the tile was picked from (${small.pick!.chunk}) is gone`);
        await page.evaluate(`(function () { var g = __wz.grid(); g.scrollLeft = 0; g.scrollTop = Math.max(0, g.scrollTop + ${c!.y} - (g.getBoundingClientRect().top + g.clientHeight / 2)); })()`);
        await page.waitForTimeout(300);
        const here = (await page.evaluate(cell)) as { x: number; y: number };
        await page.mouse.click(here.x, here.y);
        await page.waitForTimeout(500);
        return page.evaluate('JSON.stringify(window.__gxWorking().input)') as Promise<string>;
      };
      const picked = await clickRow(small.pick!.row);
      if (!/"kind":"gradient"/.test(picked)) fail(`[10] setup: a click on the small wall picked nothing (${picked.slice(0, 80)})`);
      const before = await layout(page);
      for (const [label, dx, dy] of [['height ×2', 0, DOUBLE], ['width ×2', DOUBLE, 0], ['height ÷2', 0, -DOUBLE]] as [string, number, number][]) {
        const g = (await page.evaluate('(function () { var r = __wz.grid().getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.6 }; })()')) as { x: number; y: number };
        await zoomDrag(page, g.x, g.y, dx, dy);
        const now = await layout(page);
        if (now !== before) fail(`[10] ${label} re-flowed the small wall: ${before}  →  ${now}`);
      }
      // The row above first: a second click on the tile that is ALREADY the working gradient is the
      // app's "edit this one" (its input becomes stops), which would read as a different gradient here.
      const other = await clickRow(0);
      if (other === picked || !/"kind":"gradient"/.test(other)) fail('[10] setup: the row above did not pick a different gradient');
      if ((await clickRow(small.pick!.row)) !== picked) fail('[10] after zooming one axis at a time, a click on the same cell of the small wall picks a different gradient');
      ok(`[10] a squared-up wall of ${small.cols} columns keeps its columns and rows through one-axis zooms, and the same cell picks the same gradient`);
    });

    await step(browser, '11', PHONE, async ({ page, v }) => {
      if (!(await page.locator('button[aria-label="Zoom in"]').count())) fail('[11] setup: no Zoom in button — the − / + pair is the phone layout\'s, and this context is 393 px wide to get it');
      // Centre the box on a band that is already several chunks at 1:1 — on a phone the biggest band
      // is — two-thirds of the way down its first chunk. Any step re-sized such a band's chunks.
      const top = (await page.evaluate(`(function () {
        var g = __wz.grid(); var gr = g.getBoundingClientRect(); var found = null;
        g.querySelectorAll('[data-wall-band]').forEach(function (b) {
          var cs = b.querySelectorAll('[data-wall-chunk]');
          if (found === null && cs.length > 1) { var r = cs[0].getBoundingClientRect(); found = r.top - gr.top + g.scrollTop + r.height * 0.66 - g.clientHeight / 2; }
        });
        return found;
      })()`)) as number | null;
      if (top === null) fail('[11] setup: no band on the phone-width wall is more than one chunk');
      await scrollTo(page, Math.round(top!));
      const cx = Math.round(v.left + v.cw / 2), cy = Math.round(v.top + v.ch / 2);
      const name0 = await nameAt(page, cx, cy);
      const t0 = await tileAt(page, cx, cy);
      if (!name0 || !t0) fail('[11] setup: no gradient under the viewport centre');
      const press = async (label: string, n: number) => {
        await page.locator(`button[aria-label="${label}"]`).click();
        await page.waitForTimeout(450);
        const name = await nameAt(page, cx, cy);
        const t = await tileAt(page, cx, cy);
        if (name !== name0) fail(`[11] press ${n} (${label}): "${name0}" was under the viewport centre and "${name || 'nothing'}" is — it was ${t0!.chunk} col ${t0!.col} row ${t0!.row} of ${t0!.nrows}, the centre is now ${t?.chunk} col ${t?.col} row ${t?.row} of ${t?.nrows}`);
        const dy = (t!.fy - t0!.fy) * t!.cellH, dx = (t!.fx - t0!.fx) * t!.cellW;
        if (Math.abs(dx) > TOL || Math.abs(dy) > TOL) fail(`[11] press ${n} (${label}): "${name0}" slid ${dx.toFixed(1)} px across and ${dy.toFixed(1)} px down under the centre`);
      };
      for (let i = 1; i <= 3; i++) await press('Zoom in', i);
      for (let i = 4; i <= 6; i++) await press('Zoom out', i);
      ok(`[11] the − / + step at depth: "${name0}" stays under the viewport centre through three presses of + and three of −`);
    });

    await step(browser, '12', DESK, async ({ page, mx, my, deep }) => {
      await scrollTo(page, deep);
      await zoomDrag(page, mx, my, DOUBLE * 2, DOUBLE * 2);
      const name = await nameAt(page, mx, my); // leaves the card up
      if (!name) fail('[12] setup: no hover card at the grab point after the zoom');
      const p = (await page.evaluate(`__wz.paintedVsCard(${mx}, ${my})`)) as { rowsDown: number; tileW: number; wall: number[][]; card: number[][] } | null;
      if (!p) fail('[12] setup: no wall canvas or no hover card to read');
      if (p!.rowsDown < 1) fail('[12] setup: the canvas under the grab point is the first of its chunk — at ×4 a chunk this tall is drawn by several, and the step is about the others');
      const off = p!.wall.filter((c, i) => Math.max(...c.map((ch, k) => Math.abs(ch - p!.card[i][k]))) > 24).length;
      if (off > 1) fail(`[12] the tile painted at the grab point is not the gradient its hover card shows ("${name}"): painted ${JSON.stringify(p!.wall)}, card ${JSON.stringify(p!.card)}`);
      // … and the zoom tool's tap, which finds the tile through the wall's registry rather than the canvas's own handler
      await page.locator('[data-gx-tools] button[aria-label="Zoom"]').click();
      await page.waitForTimeout(300);
      await page.mouse.click(mx, my);
      await page.waitForTimeout(600);
      const input = (await page.evaluate('(function () { var i = window.__gxWorking().input; return { kind: i.kind, name: i.name }; })()')) as { kind: string; name?: string };
      if (input.kind !== 'gradient' || input.name !== name) fail(`[12] a zoom-tool tap on "${name}" picked ${input.kind === 'gradient' ? `"${input.name}"` : 'nothing'}`);
      ok(`[12] ${p!.rowsDown} rows down its chunk, on a later canvas: the tile painted is the one the hover names ("${name}"), and a zoom-tool tap picks it`);
    });

    await step(browser, '13', DESK, async ({ page, mx, my }) => {
      await zoomDrag(page, mx, my, DOUBLE * 2, DOUBLE * 2);
      // The first chunk of at least 35 rows: at ×4 a canvas holds 27, so its row 30 is on its second.
      const chunks = (await page.evaluate(`(function () {
        var out = [];
        __wz.grid().querySelectorAll('[data-wall-chunk]').forEach(function (w) { out.push({ chunk: w.dataset.wallChunk, rows: Math.round(w.offsetHeight / +w.dataset.wallChunkCellh) }); });
        return out;
      })()`)) as { chunk: string; rows: number }[];
      const k = chunks.findIndex((c) => c.rows >= 35);
      if (k < 0) fail('[13] setup: no chunk of 35 rows on the wall');
      const rowsBefore = chunks.slice(0, k).reduce((s, c) => s + c.rows, 0);
      await page.locator('[role="grid"]').focus();
      // the first press lands on the first tile; every ↓ after it is one row of the first column, across bands
      for (let i = 0; i <= rowsBefore + 30; i++) await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      // Name the cell the cursor was sent to by its hover card — before the pick, which puts the
      // gradient in hand and switches the card off. The cell is put in the middle of the box by hand.
      const cell = `__wz.cellCentre(${JSON.stringify(chunks[k].chunk)}, 0, 30)`;
      const c = (await page.evaluate(cell)) as { x: number; y: number };
      await page.evaluate(`(function () { var g = __wz.grid(); g.scrollLeft = 0; g.scrollTop = Math.max(0, g.scrollTop + ${c.y} - (g.getBoundingClientRect().top + g.clientHeight / 2)); })()`);
      await page.waitForTimeout(350);
      const here = (await page.evaluate(cell)) as { x: number; y: number };
      const name = await nameAt(page, Math.round(here.x), Math.round(here.y));
      if (!name) fail('[13] setup: no hover card on the cell the cursor was sent to');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const input = (await page.evaluate('(function () { var i = window.__gxWorking().input; return { kind: i.kind, name: i.name }; })()')) as { kind: string; name?: string };
      if (input.kind !== 'gradient' || input.name !== name) fail(`[13] ${rowsBefore + 31} presses of ↓ then Enter picked ${input.kind === 'gradient' ? `"${input.name}"` : 'nothing'}, and row 30 of ${chunks[k].chunk} — where the cursor should be — holds "${name}"`);
      ok(`[13] the keyboard cursor at ×4: ${rowsBefore + 31} presses of ↓ are on row 30 of ${chunks[k].chunk} (its second canvas) — Enter picks "${name}"`);
    });
  } finally {
    // An open browser keeps the process alive — a red would hang instead of exiting.
    await browser.close();
  }
  if (!ran.length) fail(`no step matches ONLY=${ONLY.join(',')}`);
  if (red.length) {
    process.exitCode = 1;
    console.log(`\nsmoke:ge-wallzoom RED — ${red.length} of ${ran.length}: ${red.map((id) => `[${id}]`).join(' ')}`);
  }
}

run().then(
  () => { if (!process.exitCode) console.log(`\nsmoke:ge-wallzoom green (${ran.length} of 13 steps run)`); },
  (e) => { console.log(e?.message ?? e); process.exitCode = 1; },
).finally(() => process.exit(process.exitCode ?? 0));
