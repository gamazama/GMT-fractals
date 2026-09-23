/**
 * smoke-ge-hero — the v2 hero's L8 contract: **the hero never unmounts once it exists**
 * (plans/ge-v2-unified-shell-plan.md §1 L8, Phase B).
 *
 * Before Phase B, `WorkingHero` returned null whenever the working pipeline produced
 * nothing — so switching to the Image source with no image loaded took the whole hero
 * (name, palette, ramp, the use cluster) off the screen. This smoke is the guard on that:
 *
 *   [1] boot the v2 shell — no hero before the first pick (L9: the screen grows)
 *   [2] click a tile on the wall — the hero appears, with a ramp
 *   [3] click Image with NO image — Image ASKS for one first (owner, 2026-09-07: "image needs
 *       to request an image before it is active, otherwise it stays off"): the file dialog
 *       opens, the source does NOT switch, the hero and its ramp are untouched (L8's
 *       empty-source band is now reachable only by a drop that fails to decode)
 *   [4] Escape — the hero is still there
 *   [5] the EXPORT window's two subjects (§8b item 5, 2026-09-09): Ramp + Swatches,
 *       opening on Ramp, and Swatches narrowing the offer to the formats that have a
 *       swatch form — the format list is the registry seen through `formatsFor`, so a
 *       subject control that only painted itself would leave the offer unchanged
 *       · each open category ends in a RESERVED note strip: one fixed line that cannot wrap
 *       and clips what does not fit, so the hover note it carries can never shift the rows
 *       above it or the categories below
 *   [5c] a Copy in the window ticks its own row for a second (the colour picker's ✓), puts the
 *       text on the clipboard and shows no toast as well (2026-09-16)
 *   [5d] THE TEXT PREVIEW (parity row O4, 2026-09-23): hovering a text format's row shows, in a
 *       panel BESIDE the window (never inside it, never over it, inside the screen), the text its
 *       Copy then puts on the clipboard, byte for byte — nine ramp formats from CSS to .ggr (the
 *       longest, ~26k) and .c4d.py, the Swatches JSON, and an Again row; the pick is a credited
 *       catalogue gradient, so the name option is in play; hovering the row's Copy icon keeps the
 *       same preview; .grd / .ase / .idml, the GMT gradient PNG and the swatch sheet show none (and
 *       clear one already up); the window does not move; Escape takes the preview with the window
 *   [7] and the note itself: a set holding a 60-stop gradient bundles into .ai and .ase
 *       lossily, says "1 gradient reduced to 40 colour stops" in that strip ON HOVER, and
 *       neither the window nor the rows below it move when it does · and the SET's preview: its
 *       .ai row previews the very .ai that downloads; its .gpl (a .zip) and .ase (binary) rows
 *       preview nothing
 *   [7b] the same gradient ALONE on the hero warns in the same words from the hero's own
 *       Export window, and a two-stop gradient never warns (2026-09-13)
 *   [7c] under a 2-stop budget in Settings, the 60-stop gradient's CSS preview holds two stops
 *       and is what Copy writes — the budget half of [5d], which [5d]'s three-colour pick cannot
 *       show (2026-09-23)
 *   [8] EXPORT NAMES CARRY THE SOURCE ONLY WHILE UNMODIFIED (owner, 2026-09-13): a wall pick
 *       downloaded as .json is named "<name> (<credit>)" inside the file and in the filename
 *       (the filename keeps the name as it is, spaces and all, since 2026-09-16 — only the
 *       credit's `/` becomes `-`; falsified that day by restoring the old `_`-collapsing
 *       `slugName`: red "the filename "snowstorm_PyPalettes-nord_MIT_.json" is not the credited
 *       name as it is"); one Adjust dial later it is named exactly as before; the dial back and the credit is
 *       back (a key comparison, not a sticky flag). Then a SET of three — an unedited
 *       catalogue favourite, the same one edited, a favourite with no origin (what every
 *       favourite saved before today is) — downloads as a .zip in which only the first is
 *       credited.
 *   [9] GX GLOBAL REFUSES AN UNEDITED CATALOGUE GRADIENT (owner, 2026-09-13), with the
 *       endpoint INTERCEPTED (`page.route`, nothing is sent): the share button on the GX
 *       global ground toasts the refusal, asks nothing and POSTs nothing; after one Adjust
 *       dial the same button asks (the confirm is dismissed, so still nothing is sent).
 *
 * [8] and [9] falsified 2026-09-13, each reverted: `runExport` passing `plainName` through
 * (red "[8] the unedited pick exported as …, without its credit"); `exportNameFor` ignoring the
 * key (red "[8] one Adjust dial later the export still carries the credit"); `withExportName`
 * dropped from `runSetExport` (red "[8] the set's unedited catalogue member is not credited");
 * `contributeToGlobal` without the catalogue check (red "[9] an unedited catalogue gradient
 * reached the confirm").
 *
 * [5d], [7] (the set's preview) and [7c] falsified 2026-09-23, each reverted: the preview built
 * with `{ ...runOpts, origin: undefined }` in ExportMenu (red "[5d] the css (ramp) preview differs
 * from what Copy put on the clipboard: 81 vs 104 chars"); built with `budget: undefined` (red "[7c]
 * under a 2-stop budget the CSS preview (22 stops) is not what Copy wrote (2 stops)" — and GREEN
 * at [5d], which is why [7c] exists: the first cut seeded the budget in [5d], where the pick is
 * three near-collinear colours every budget leaves alone); a binary row no longer clearing the
 * preview (red "[5d] the binary grd row shows a preview ("format:copy:gpl:ramp")"). Windows'
 * clipboard reads a written LF back as CRLF; the comparisons undo only that. While other work
 * edits the tree, Vite reloads the page under this smoke and any step can go red on a vanished
 * window (measured 2026-09-23: [5c] and [5d] each did, then passed on a re-run); [5d]'s section
 * search names a reload when it saw one (`navs`). Re-run a red like that before reading it.
 *
 * Falsified 2026-09-06 by re-introducing the old hide (`if (!shown) return null` →
 * `if (emptySource) return null`): step [3] goes red with "the hero unmounted on an empty
 * Image source (L8)". Wants `npm run dev` on port 3400, like every other browser smoke.
 *
 * Step [5] falsified 2026-09-09 two ways, each reverted: pinning `formatsFor('ramp')` in
 * ExportMenu whatever the subject is (red with "the Swatches subject offers the same
 * formats as Ramp (20 vs 20) — the subject is decorative"), and dropping the subject from
 * the image row's wording (red with "should be the swatch sheet (png-strip)"; since 2026-09-14 the
 * Ramp subject has no image row at all and the step asserts that instead). The first
 * cut of [5] keyed the format list off each Download button's TITLE and reported a false
 * red: .css is the extension of two formats now (the linear-gradient and the variable set),
 * so it read cssvars as css. It keys off the registry key instead.
 *
 * Run: `npm run smoke:ge-hero`.
 */
import fs from 'fs';
import { unzipSync, strFromU8 } from 'fflate';
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

/** The hero as the DOM sees it: present, and what its ramp is painting. */
const heroState = async (page: Page) => {
  return page.evaluate(() => {
    const hero = document.querySelector('[data-gx-hero]');
    if (!hero) return { present: false, text: '', gradientPixels: 0 };
    // Every ramp in the hero is either a <canvas> (GradientStrip) or the editor's own
    // strip canvas; a painted one has a non-zero width.
    const canvases = Array.from(hero.querySelectorAll('canvas')) as HTMLCanvasElement[];
    return {
      present: true,
      text: (hero as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 200),
      gradientPixels: canvases.reduce((a, c) => a + c.width, 0),
    };
  });
};

async function main() {
  const browser = await chromium.launch();
  // clipboard: [5c] reads back what the window's Copy wrote
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // A reload this smoke did not ask for is Vite reloading the page because something ELSE was
  // edited (other work in the tree); it wipes the hero and the window mid-step. Counted so a red
  // that follows one can say so instead of reading as a product failure.
  let navs = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs++; });

  console.log(`→ GET ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // [1] no hero before the first pick
  let s = await heroState(page);
  if (s.present) fail('[1] a hero exists before the first pick (L9: the screen grows with the user)');
  console.log('✓ [1] no hero before the first pick');

  // [2] pick a gradient off the wall — the wall is canvas-drawn, so this is a real click
  //     on a tile, not a DOM selector.
  const wall = page.locator('[data-gx-keepselect] canvas').first();
  await wall.waitFor({ state: 'visible', timeout: 15000 });
  const box = await wall.boundingBox();
  if (!box) fail('[2] the wall canvas has no box');
  await page.mouse.click(box!.x + 24, box!.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[2] no hero after a wall click'));
  s = await heroState(page);
  if (s.gradientPixels === 0) fail('[2] the hero has no painted ramp after a wall click');
  console.log(`✓ [2] the hero appeared on the first pick (ramp ${s.gradientPixels}px of canvas)`);

  // [3] Image with nothing loaded asks for an image and changes nothing else
  const before = await heroState(page);
  const chooser = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
  await page.click('[data-gx-tray-tab="image"]');
  const fc = await chooser;
  if (!fc) fail('[3] clicking Image with no image did not open the file dialog');
  await page.waitForTimeout(500);
  s = await heroState(page);
  if (!s.present) fail('[3] the hero unmounted when Image asked for an image (L8)');
  if (s.gradientPixels === 0) fail('[3] the ramp went blank while Image asked for an image');
  if (s.text !== before.text) fail(`[3] the hero changed while Image only asked for an image:\n    ${before.text}\n    ${s.text}`);
  if (/live from Image|drop one on the slot/i.test(s.text)) fail('[3] the source switched to Image without an image');
  console.log('✓ [3] Image with no image asks for one and leaves the hero alone');

  // [4] Escape (the shell's Esc chain) leaves the hero alone
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  s = await heroState(page);
  if (!s.present) fail('[4] Escape unmounted the hero');
  console.log('✓ [4] Escape leaves the hero standing');

  // [5] THE EXPORT WINDOW: two subjects, and the list as an accordion (§8b item 5).
  // The window is one surface over the ramp and the palette, and the format list is not a
  // filter written in the component but the registry seen through `formatsFor` — so the
  // assertion is that switching the subject actually CHANGES the offer. A subject control
  // that only painted itself would look identical. The accordion means the offer has to be
  // COLLECTED section by section, which is also how this checks the accordion itself: one
  // section open at a time, and no rows from any other.
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[5] the Export window did not open'));
  const readWindow = () =>
    page.evaluate(() => {
      const w = document.querySelector('[data-gx-export]') as HTMLElement | null;
      if (!w) return null;
      const seg = w.querySelector('[data-gx-export-subject]');
      const heads = Array.from(w.querySelectorAll('[data-gx-section]')) as HTMLElement[];
      return {
        subjects: Array.from(seg?.querySelectorAll('[data-gx-subject]') ?? []).map((b) => (b as HTMLElement).dataset.gxSubject ?? ''),
        on: (seg?.querySelector('[data-gx-subject][data-on]') as HTMLElement | null)?.dataset.gxSubject ?? null,
        sections: heads.map((h) => h.dataset.gxSection ?? ''),
        openSections: heads.filter((h) => h.dataset.open !== undefined).map((h) => h.dataset.gxSection ?? ''),
        // one row per offered format, keyed by the REGISTRY key rather than by the download
        // title: two formats can share an extension (.css is both the linear-gradient and
        // the variable set), and a title test cannot tell them apart.
        visible: Array.from(w.querySelectorAll('[data-gx-format]')).map((e) => (e as HTMLElement).dataset.gxFormat ?? ''),
        rowText: Array.from(w.querySelectorAll('[data-gx-format]')).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()),
        downloads: Array.from(w.querySelectorAll('[data-gx-download]')).map((e) => (e as HTMLElement).dataset.gxDownload ?? ''),
        copies: Array.from(w.querySelectorAll('[data-gx-copy]')).map((e) => (e as HTMLElement).dataset.gxCopy ?? ''),
        // THE EXTENSION COLUMN's left edge on every row of the window that has one — format
        // rows, Again rows, the image row. A column is a column only if they agree.
        extXs: Array.from(w.querySelectorAll('.w-10.shrink-0')).map((e) => Math.round(e.getBoundingClientRect().x)),
        // The open category's reserved NOTE STRIP: how many there are, how tall, whether
        // text could ever make it grow, and what it says at rest.
        notes: Array.from(w.querySelectorAll('[data-gx-note]')).map((e) => {
          const cs = getComputedStyle(e as HTMLElement);
          return { h: cs.height, nowrap: cs.whiteSpace === 'nowrap', clipped: cs.overflow === 'hidden', text: (e as HTMLElement).innerText.trim() };
        }),
        again: Array.from(w.querySelectorAll('[data-gx-export-again] button')).map((b) => (b as HTMLElement).innerText.trim()),
        // The Ramp subject has NO image row since 2026-09-14 (the GMT gradient PNG replaced the
        // strip); the Swatches subject keeps one, the swatch sheet.
        image: w.innerText.includes('Swatch sheet') ? 'swatch-sheet' : /PNG strip|Contact sheet|As an image/.test(w.innerText) ? 'png-strip' : 'none',
      };
    });
  /** Open every format section in turn and collect what each holds. */
  const collect = async () => {
    const first = await readWindow();
    if (!first) fail('[5] the Export window vanished');
    const all: string[] = [];
    const seen = new Map<string, string>(); // format key -> the section that showed it
    for (const title of first!.sections) {
      if (title === 'Settings') continue;
      // A header TOGGLES, so clicking the one that is already open would close it. Open it
      // only when it is shut.
      const before = await readWindow();
      if (before!.openSections[0] !== title) {
        await page.click(`[data-gx-section="${title}"]`);
        await page.waitForTimeout(120);
      }
      const st = await readWindow();
      if (st!.openSections.length !== 1) fail(`[5] ${st!.openSections.length} sections marked open at once (${st!.openSections.join(', ')})`);
      if (st!.openSections[0] !== title) fail(`[5] clicking "${title}" opened "${st!.openSections[0]}"`);
      if (!st!.visible.length) fail(`[5] section "${title}" opened empty`);
      // THE ACCORDION ITSELF. The header's own `data-open` proves nothing about what is on
      // screen — a build that marks one header open while rendering every section's rows
      // passes every check above (measured: it did). What cannot survive that is this:
      // successive sections must show DISJOINT rows. If everything is always rendered, the
      // second section shows the first one's formats again and this names them.
      for (const k of st!.visible) {
        const home = seen.get(k);
        if (home && home !== title) fail(`[5] "${k}" is on screen under both "${home}" and "${title}" — every section is rendering at once`);
        seen.set(k, title);
      }
      // ROW ANATOMY (2026-09-09): the row IS the download, and Copy is offered only where
      // there is a text form. A binary format with a Copy button would put "[object
      // Uint8Array]" on the clipboard, which is the failure this shape has to rule out.
      const noDownload = st!.visible.filter((k) => !st!.downloads.includes(k));
      if (noDownload.length) fail(`[5] no download control on ${noDownload.join(', ')}`);
      for (const k of ['grd', 'ase', 'idml']) {
        if (st!.visible.includes(k) && st!.copies.includes(k)) fail(`[5] ${k} is binary and must not offer Copy`);
      }
      for (const k of ['gpl', 'css', 'hex']) {
        if (st!.visible.includes(k) && !st!.copies.includes(k)) fail(`[5] ${k} has a text form and lost its Copy`);
      }
      // THE EXTENSION COLUMN (owner, 2026-09-09: "make that a thing"). Every row that has one
      // must start it at the same x. It did NOT before the copy slot was held open on rows
      // that have no Copy button: a binary format's row was 28 px wider than its neighbour's
      // and its extension sat 28 px further right, which is invisible unless measured.
      // THE EXTENSION APPEARS ONCE PER ROW. The registry writes "Adobe swatches .ase" for
      // hosts that show a bare list, so the window strips it and lets the column carry it;
      // a stripper that silently matched nothing would leave every design-app row saying it
      // twice, which is what the first cut of `labelWithoutExt` did.
      const twice = st!.rowText.filter((t) => {
        const m = t.match(/\.[a-z0-9]+/gi);
        return m && m.length > 1 && m[m.length - 1] === m[m.length - 2];
      });
      if (twice.length) fail(`[5] the extension is written twice on: ${twice.join(' / ')}`);
      // THE NOTE STRIP (owner, 2026-09-10: "extra space in each category so it opens neatly
      // without shifting the others"). One reserved line at the bottom of the open category,
      // empty until a row with something to say is hovered. The proof that a note can never
      // move anything is STRUCTURAL and does not need a lossy set to demonstrate: the strip
      // is a FIXED height that cannot wrap and clips what does not fit, so whatever lands in
      // it, the rows above and the categories below stay exactly where they are.
      if (st!.notes.length !== 1) fail(`[5] "${title}" has ${st!.notes.length} note strips, expected exactly one`);
      const note = st!.notes[0];
      if (note.h !== '16px') fail(`[5] the note strip in "${title}" is ${note.h}, not a reserved line`);
      if (!note.nowrap || !note.clipped) fail(`[5] the note strip can GROW (nowrap ${note.nowrap}, clipped ${note.clipped}) — a long note would shift the categories below it`);
      if (note.text) fail(`[5] the note strip is not empty at rest: "${note.text}"`);
      const xs = Array.from(new Set(st!.extXs));
      if (xs.length > 1) fail(`[5] the extension column starts at ${xs.sort((a, b) => a - b).join(' and ')} in "${title}" — it is not a column`);
      all.push(...st!.visible);
    }
    return { ...first!, formats: all };
  };
  const ramp = await collect();
  if (ramp.subjects.join(',') !== 'ramp,swatches') fail(`[5] the subject control is not Ramp + Swatches (${ramp.subjects.join(',')})`);
  if (ramp.on !== 'ramp') fail(`[5] the window should open on the Ramp subject (${ramp.on})`);
  if (!ramp.formats.length) fail('[5] the Ramp subject offered no formats at all');
  if (ramp.image !== 'none') fail(`[5] the Ramp subject should have no image row — the GMT gradient PNG replaced the strip (${ramp.image})`);
  // The whole point of the accordion: the twenty formats are NOT all on screen at once.
  const openNow = await readWindow();
  if (openNow!.visible.length >= ramp.formats.length)
    fail(`[5] every format is on screen at once (${openNow!.visible.length} of ${ramp.formats.length}) — the accordion is not collapsing anything`);

  // CLICKING THE OPEN SECTION CLOSES IT, and it stays closed. The re-home effect that keeps
  // the accordion off a section the subject emptied used to fire on a deliberate close too,
  // so shutting a section immediately re-opened the FIRST one and nothing could ever be shut.
  // Neither smoke caught it, because the section they close first is the one it re-opened.
  const openTitle = (await readWindow())!.openSections[0];
  await page.click(`[data-gx-section="${openTitle}"]`);
  await page.waitForTimeout(200);
  const shut = await readWindow();
  if (shut!.openSections.length) fail(`[5] clicking the open section did not close it — "${shut!.openSections[0]}" is open`);
  if (shut!.visible.length) fail(`[5] the section closed but ${shut!.visible.length} format rows are still on screen`);
  await page.click(`[data-gx-section="${openTitle}"]`);
  await page.waitForTimeout(200);

  await page.click('[data-gx-subject="swatches"]');
  await page.waitForTimeout(250);
  const sw = await collect();
  if (sw.on !== 'swatches') fail('[5] the Swatches segment did not take');
  if (!sw.formats.length) fail('[5] the Swatches subject offered no formats at all');
  if (sw.formats.length >= ramp.formats.length)
    fail(`[5] the Swatches subject offers the same formats as Ramp (${sw.formats.length} vs ${ramp.formats.length}) — the subject is decorative`);
  // The ramp-only formats must be GONE, not merely fewer: a CSS linear-gradient of seven
  // colours is not a palette, and .ase must be there, because it is the reason a designer
  // opens this at all.
  const rampOnly = ['css', 'svg', 'ggr', 'cpt', 'map', 'ugr', 'grd', 'ai', 'idml'].filter((k) => sw.formats.includes(k));
  if (rampOnly.length) fail(`[5] ramp-only formats are still offered under Swatches: ${rampOnly.join(', ')}`);
  for (const k of ['ase', 'gpl', 'hex', 'tw', 'tokens', 'cssvars'])
    if (!sw.formats.includes(k)) fail(`[5] ${k} is missing from the Swatches subject`);
  if (!ramp.formats.includes('css') || !ramp.formats.includes('ggr')) fail('[5] the Ramp subject lost a ramp format');
  // A fresh profile has exported nothing, so the Again block must not be there at all (L9:
  // the screen grows with the user). [6] is the other half of this.
  if (ramp.again.length) fail(`[5] Again showed with no history: ${ramp.again.join(' | ')}`);
  if (sw.image !== 'swatch-sheet') fail(`[5] the Swatches subject's image row should be the swatch sheet (${sw.image})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.$('[data-gx-export]')) fail('[5] Escape did not close the Export window');
  console.log('✓ [5] one export window, two subjects, one accordion section open at a time');

  // [5c] A COPY CONFIRMS ON ITS OWN ROW (2026-09-16; plan §10, the 2026-09-09 second pass: "the
  // colour picker's own copy button flips to a tick for a second"). The CSS row's Copy glyph
  // becomes ✓, the clipboard holds the CSS, no "Copied" toast shows as well, and a second later
  // the glyph is back. Falsified 2026-09-16, each reverted: `confirmCopy` never setting
  // `copiedId` → red "did not flip to a tick"; the window not passing `confirmsCopy` → red "toasted
  // as well as ticking"; the reset timer removed → red "still a tick".
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[5c] the Export window did not open'));
  if (!(await page.$('[data-gx-export] [data-gx-copy="css"]'))) await page.click('[data-gx-export] [data-gx-section="For the web"]');
  await page.click('[data-gx-export] [data-gx-copy="css"]');
  await page.waitForTimeout(250);
  const copyRow = () =>
    page.evaluate(() => {
      const b = document.querySelector('[data-gx-export] [data-gx-copy="css"]') as HTMLElement;
      return { text: b.innerText.trim(), glyph: !!b.querySelector('svg'), ticked: document.querySelectorAll('[data-gx-export] [data-gx-copied]').length, css: b.hasAttribute('data-gx-copied'), toast: /Copied /.test(document.body.innerText) };
    });
  const ticked = await copyRow();
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `unreadable: ${e}`);
  if (!/linear-gradient/.test(clip)) fail(`[5c] the clipboard does not hold the CSS (${clip.slice(0, 60)})`);
  if (ticked.text !== '✓' || !ticked.css || ticked.glyph) fail(`[5c] the CSS row's Copy did not flip to a tick (text "${ticked.text}", glyph ${ticked.glyph})`);
  if (ticked.ticked !== 1) fail(`[5c] ${ticked.ticked} rows show a tick — only the one that copied should`);
  if (ticked.toast) fail('[5c] a Copy from the window toasted as well as ticking');
  await page.waitForTimeout(1100);
  const settled = await copyRow();
  if (settled.text || !settled.glyph || settled.ticked) fail(`[5c] a second after the copy the row is still a tick ("${settled.text}")`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  console.log('✓ [5c] a Copy in the window ticks its own row for a second, with the text on the clipboard and no toast');

  // [5d] THE TEXT PREVIEW (parity row O4, owner-approved 2026-09-23). Hovering a text format's
  // row shows, BESIDE the window, the exact text its Copy puts on the clipboard; a binary row, the
  // GMT gradient PNG and the swatch sheet show none; nothing in the window moves. The options must
  // MATTER, or a preview built from the defaults matches a clipboard built from the defaults and
  // proves nothing: here the pick is an unmodified catalogue gradient, so its name carries the
  // credit. The STOP BUDGET is proven in [7c], not here: this pick (snowstorm) is three
  // near-collinear colours that every budget leaves alone — the first cut of this step seeded a
  // budget and stayed green with the preview built without it (measured 2026-09-23).
  await page.evaluate(() => localStorage.removeItem('gx.v2.exportSettings'));
  const pick5d = await page.evaluate(() => {
    const w = (window as any).__gxWorking?.();
    return { credit: (w?.input?.origin?.credit as string | undefined) ?? null, name: (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '' };
  });
  await page.mouse.move(5, 5);
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[5d] the Export window did not open'));
  /** Open whichever section holds `key` (a header toggles, so only a shut one is clicked). */
  const navs5d = navs;
  const openFor = async (key: string) => {
    if (await page.$(`[data-gx-export] [data-gx-format="${key}"]`)) return;
    const titles = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gx-export] [data-gx-section]')).map((h) => (h as HTMLElement).dataset.gxSection ?? ''));
    for (const t of titles) {
      if (t === 'Settings') continue;
      const open = await page.evaluate(() => (document.querySelector('[data-gx-export] [data-gx-section][data-open]') as HTMLElement | null)?.dataset.gxSection ?? null);
      if (open !== t) { await page.click(`[data-gx-export] [data-gx-section="${t}"]`); await page.waitForTimeout(150); }
      if (await page.$(`[data-gx-export] [data-gx-format="${key}"]`)) return;
    }
    fail(`[5d] no section holds "${key}"${navs !== navs5d ? ' — the page RELOADED during this step (an edit elsewhere in the tree): re-run' : ''}`);
  };
  const previewOf = () =>
    page.evaluate(() => {
      const p = document.querySelector('[data-gx-export-preview]') as HTMLElement | null;
      const w = document.querySelector('[data-gx-export]') as HTMLElement;
      const wr = w.getBoundingClientRect();
      const win = { x: Math.round(wr.x), y: Math.round(wr.y), r: Math.round(wr.right), h: Math.round(wr.height), vw: innerWidth, vh: innerHeight };
      if (!p) return { win, pv: null };
      const r = p.getBoundingClientRect();
      return {
        win,
        pv: {
          id: p.dataset.gxExportPreview ?? '',
          text: (p.querySelector('[data-gx-preview-text]') as HTMLElement).textContent ?? '',
          cut: !!p.querySelector('[data-gx-preview-more]'),
          x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom),
          inWindow: w.contains(p),
        },
      };
    });
  /** Hover a row, read the preview, then Copy from the same row and read the clipboard. */
  const hoverAndCopy = async (key: string, subject: 'ramp' | 'swatches') => {
    await openFor(key);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300); // the grace on leaving, so this hover OPENS a preview rather than switching one
    const before = await previewOf();
    await page.hover(`[data-gx-export] [data-gx-download="${key}"]`);
    await page.waitForTimeout(350);
    const { win, pv } = await previewOf();
    if (!pv) return fail(`[5d] hovering the ${key} row (${subject}) shows no preview`);
    if (pv.id !== `format:copy:${key}:${subject}`) fail(`[5d] hovering ${key} (${subject}) shows the preview of "${pv.id}"`);
    if (pv.inWindow) fail('[5d] the preview is inside the window — it must be beside it, or it moves the rows');
    if (!(pv.r <= win.x || pv.x >= win.r)) fail(`[5d] the preview (x ${pv.x}–${pv.r}) overlaps the window (x ${win.x}–${win.r})`);
    if (pv.x < 0 || pv.y < 0 || pv.r > win.vw + 1 || pv.b > win.vh + 1) fail(`[5d] the ${key} preview runs off the screen (x ${pv.x}–${pv.r}, bottom ${pv.b} in ${win.vw}×${win.vh})`);
    if (before.win.h !== win.h || before.win.y !== win.y) fail(`[5d] the window moved or resized when the preview opened (${before.win.y}/${before.win.h} → ${win.y}/${win.h})`);
    // the Copy icon belongs to the row: hovering it keeps the same preview up
    await page.hover(`[data-gx-export] [data-gx-copy="${key}"]`);
    await page.waitForTimeout(150);
    const onCopy = (await previewOf()).pv;
    if (onCopy?.id !== pv.id) fail(`[5d] hovering ${key}'s Copy icon changed or dropped the preview (${onCopy?.id ?? 'none'})`);
    await page.click(`[data-gx-export] [data-gx-copy="${key}"]`);
    await page.waitForTimeout(250);
    // The OS clipboard owns line endings: on Windows a written LF reads back as CRLF (measured:
    // CSS came back 105 chars for 104 written). Only that is undone.
    const clip = (await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `unreadable: ${e}`)).replace(/\r\n/g, '\n');
    if (pv.text !== clip) {
      let i = 0;
      while (i < pv.text.length && pv.text[i] === clip[i]) i++;
      fail(`[5d] the ${key} (${subject}) preview differs from what Copy put on the clipboard: ${pv.text.length} vs ${clip.length} chars, first difference at ${i} ("${pv.text.slice(i, i + 24)}" vs "${clip.slice(i, i + 24)}")`);
    }
    if (pv.cut) fail(`[5d] the ${key} preview was cut — no single gradient is over the cap`);
    return pv.text;
  };
  const rampTexts: Record<string, string> = {};
  for (const k of ['css', 'cssvars', 'tokens', 'json', 'gpl', 'ai', 'ggr', 'cpt', 'c4d']) rampTexts[k] = await hoverAndCopy(k, 'ramp');
  // …and the options are IN it, so the equality above is not two defaults agreeing
  if (!pick5d.credit) fail(`[5d] the wall pick carries no catalogue credit — the credited-name check would be vacuous`);
  if (!rampTexts.css.startsWith(`/* ${pick5d.name} (${pick5d.credit}) */`))
    fail(`[5d] the CSS preview does not open with the credited name (${rampTexts.css.split('\n')[0]})`);
  if (rampTexts.ggr.length < 20000) fail(`[5d] the .ggr preview is ${rampTexts.ggr.length} chars — the whole file is ~26k`);
  // NO TEXT, NO PREVIEW: the binary formats, and hovering one CLEARS a preview already up
  for (const k of ['grd', 'ase', 'idml']) {
    await openFor(k);
    // a text row in the same section first, so there IS a preview for the binary row to clear
    await page.hover(`[data-gx-export] [data-gx-download="gpl"]`);
    await page.waitForTimeout(300);
    if ((await previewOf()).pv?.id !== 'format:copy:gpl:ramp') fail('[5d] hovering .gpl (beside the binary rows) shows no preview');
    await page.hover(`[data-gx-export] [data-gx-download="${k}"]`);
    await page.waitForTimeout(350);
    const { pv } = await previewOf();
    if (pv) fail(`[5d] the binary ${k} row shows a preview ("${pv.id}")`);
  }
  await page.hover('[data-gx-export] [data-gx-gmtfile="png"]');
  await page.waitForTimeout(350);
  if ((await previewOf()).pv) fail('[5d] the GMT gradient PNG row shows a preview');
  // the Swatches face previews its own text — the palette, not the ramp
  await page.click('[data-gx-export] [data-gx-subject="swatches"]');
  await page.waitForTimeout(250);
  const swJson = await hoverAndCopy('json', 'swatches');
  if (swJson === rampTexts.json) fail('[5d] the Swatches JSON preview is the Ramp JSON');
  await page.hover('[data-gx-export] [data-gx-image]');
  await page.waitForTimeout(350);
  if ((await previewOf()).pv) fail('[5d] the swatch sheet row shows a preview');
  // AGAIN previews what its one click does: the newest recent is the swatches JSON copy above
  const againId = 'copy:json:swatches';
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await page.hover(`[data-gx-export] [data-gx-again="${againId}"]`);
  await page.waitForTimeout(350);
  const again5d = (await previewOf()).pv;
  if (!again5d || again5d.id !== `again:${againId}`) fail(`[5d] hovering the Again row "${againId}" shows ${again5d ? `"${again5d.id}"` : 'no preview'}`);
  if (again5d!.text !== swJson) fail('[5d] the Again row previews a different text from the Copy it repeats');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.$('[data-gx-export-preview]')) fail('[5d] the preview outlived its window');
  await page.evaluate(() => localStorage.removeItem('gx.v2.exportSettings'));
  console.log(`✓ [5d] hovering a text row shows beside the window exactly what Copy writes (${Object.keys(rampTexts).length} ramp formats + swatches JSON + Again, credited name); binary rows show none; nothing moves`);

  // [6] AGAIN, and the memory behind it. The last few exports belong at the top of the
  // window, and the section that opens is the one holding the last one — the window's only
  // memory, and the reason the accordion does not cost a returning user a click. Seeded
  // through localStorage rather than by exporting, because a real export downloads a file.
  // Falsified by seeding a design-app format and asserting the WEB section opens: red.
  await page.evaluate(() => {
    localStorage.setItem('gx.v2.recentExports', JSON.stringify([{ kind: 'download', key: 'grd' }, { kind: 'copy', key: 'hex' }]));
    // FIRST USE is what this step is about: the last-export rule only chooses when nothing
    // is remembered, and [5] left a category behind on its way through them all. ([6b]
    // covers the other half — that a remembered category outranks this.)
    localStorage.removeItem('gx.v2.exportSection');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const wall2 = page.locator('[data-gx-keepselect] canvas').first();
  await wall2.waitFor({ state: 'visible', timeout: 15000 });
  const b2 = (await wall2.boundingBox())!;
  await page.mouse.click(b2.x + 24, b2.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[6] no hero after a wall click'));
  await page.waitForTimeout(600);
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[6] the Export window did not open'));
  const back = await readWindow();
  if (back!.again.length !== 2) fail(`[6] Again should list the two seeded exports, listed ${back!.again.length}`);
  if (!/\.grd/.test(back!.again[0])) fail(`[6] the newest export is not first in Again (${back!.again[0]})`);
  // .grd lives in "For design apps"; opening on "For the web" would mean the window forgot.
  if (back!.openSections[0] !== 'For design apps')
    fail(`[6] the section holding the last export (.grd → For design apps) did not open — "${back!.openSections[0]}" did`);
  // [5]'s column check never sees an Again row — a fresh profile has no history — so this is
  // where the third row kind is measured against the other two. Falsified by dropping the
  // held-open copy slot from the Again rows: red with two different x values.
  const againXs = Array.from(new Set(back!.extXs));
  if (againXs.length > 1)
    fail(`[6] with Again showing, the extension column starts at ${againXs.sort((a, b) => a - b).join(' and ')} — the row kinds do not line up`);
  console.log('✓ [6] Again lists the last exports, opens the section holding one, and lines up with it');

  // [6b] THE ACCORDION REMEMBERS BETWEEN SESSIONS (owner, 2026-09-10: "a user is likely to
  // only require a few paths"). Open a different category, close the window, RELOAD, and it
  // comes back on that one — outranking the last-export rule that chose the one above.
  // Falsified by not writing `gx.v2.exportSection` in `toggle`: red, because the reload
  // falls back to .grd's category, which is what it opened on before the click.
  await page.click('[data-gx-section="For code + data"]');
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => localStorage.getItem('gx.v2.exportSection'));
  if (stored !== 'For code + data') fail(`[6b] the open category was not written down (${JSON.stringify(stored)})`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const wall3 = page.locator('[data-gx-keepselect] canvas').first();
  await wall3.waitFor({ state: 'visible', timeout: 15000 });
  const b3 = (await wall3.boundingBox())!;
  await page.mouse.click(b3.x + 24, b3.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[6b] no hero after a wall click'));
  await page.waitForTimeout(600);
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[6b] the Export window did not open'));
  const remembered = await readWindow();
  if (remembered!.openSections[0] !== 'For code + data')
    fail(`[6b] a new session opened on "${remembered!.openSections[0]}", not the category left open`);
  console.log('✓ [6b] the category you left open is the one a new session opens');

  // [7] THE NOTE ITSELF (owner, 2026-09-10). A bundling format flattens each gradient to
  // AI_STOP_LIMIT stops, and the ones that lose visible detail say so — on HOVER, in the
  // category's reserved strip, in as few words as it takes. [5] proves the strip cannot
  // move anything whatever it holds; this proves the words that land in it, and it is the
  // only place anything exercises the notice at all, because it needs a set holding a
  // gradient that actually exceeds the budget. Sixty alternating black/white stops does.
  // Falsified by restoring the old wording, and by dropping `.ase` from
  // `collectionQualityWarnings` (then nothing reports and the strip stays empty).
  await page.evaluate(() => {
    const stops = Array.from({ length: 60 }, (_, i) => ({
      id: `s${i}`,
      position: i / 59,
      color: i % 2 ? '#ffffff' : '#000000',
      interpolation: 'linear',
    }));
    localStorage.setItem(
      'gmt.favients',
      JSON.stringify([
        { id: 'spiky', name: 'Spiky', createdAt: Date.now(), group: 'noted', config: { stops, blendSpace: 'rgb', colorSpace: 'srgb' } },
        // [7b]'s negative: two stops reduce to themselves, so nothing is lost and nothing
        // may warn — and the set above must still count ONE, not every member
        {
          id: 'plain',
          name: 'Plain',
          createdAt: Date.now() - 1000,
          group: 'noted',
          config: {
            stops: [
              { id: 'p0', position: 0, color: '#203040', interpolation: 'linear' },
              { id: 'p1', position: 1, color: '#e0c080', interpolation: 'linear' },
            ],
            blendSpace: 'rgb',
            colorSpace: 'srgb',
          },
        },
      ]),
    );
    localStorage.setItem('gmt.favients.groups', JSON.stringify({ noted: 'Noted' }));
    localStorage.setItem('gmt.ge.groundSet', JSON.stringify(['group:noted']));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const ground = await page.$('[data-gx-export-ground]');
  if (!ground) fail('[7] the rail has no ground-export icon');
  if (await ground!.isDisabled()) fail('[7] the ground-export icon is disabled with a set of one on the ground');
  await ground!.click();
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[7] the ground Export window did not open'));
  // A header TOGGLES, and the seeded .grd recent means this window may already have opened
  // on "For design apps" — clicking it then would CLOSE it. (It did, and the failure read
  // as "no notice at all", which is the same trap [5]'s collect() had to learn.)
  const openNow2 = await page.evaluate(
    () => (document.querySelector('[data-gx-section][data-open]') as HTMLElement | null)?.dataset.gxSection ?? null,
  );
  if (openNow2 !== 'For design apps') {
    await page.click('[data-gx-section="For design apps"]');
    await page.waitForTimeout(250);
  }
  const lossyKeys = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-gx-lossy]')).map((e) => (e as HTMLElement).dataset.gxFormat ?? ''),
  );
  if (!lossyKeys.includes('ai')) fail(`[7] a 60-stop gradient bundles into .ai with no notice at all (noted: ${lossyKeys.join(', ') || 'none'})`);
  if (!lossyKeys.includes('ase')) fail('[7] .ase reduces at the same budget as .ai and must report too');
  // A REAL hover, not a synthetic `pointerenter`: React derives onPointerEnter from the
  // delegated pointerover/pointerout pair at the root, so an enter event dispatched straight
  // at the element never reaches the handler. The first cut did that and read an empty strip.
  const measure = () =>
    page.evaluate(() => {
      const w = document.querySelector('[data-gx-export]') as HTMLElement;
      return {
        text: (w.querySelector('[data-gx-note]') as HTMLElement).innerText.trim(),
        win: Math.round(w.getBoundingClientRect().height),
        rowY: Math.round((w.querySelector('[data-gx-format="gpl"]') as HTMLElement).getBoundingClientRect().y),
      };
    });
  const noteBefore = await measure();
  await page.hover('[data-gx-format="ai"]');
  await page.waitForTimeout(250);
  const noteAfter = await measure();
  const shown = { before: noteBefore, after: noteAfter };
  if (shown.before.text) fail(`[7] the strip was already saying something before the hover: "${shown.before.text}"`);
  if (shown.after.text !== '1 gradient reduced to 40 colour stops')
    fail(`[7] the note reads "${shown.after.text}" — expected "1 gradient reduced to 40 colour stops"`);
  // The whole point of reserving the line: showing it moves NOTHING.
  if (shown.after.win !== shown.before.win) fail(`[7] the window resized on hover (${shown.before.win} → ${shown.after.win})`);
  if (shown.after.rowY !== shown.before.rowY) fail(`[7] the rows below moved on hover (${shown.before.rowY} → ${shown.after.rowY})`);
  // [7] ALSO, THE SET'S PREVIEW (parity row O4, 2026-09-23): a format that BUNDLES a set into
  // one text file previews that file — `setExportText`, the function the download writes through
  // — so the preview of the set's .ai is the .ai that lands, byte for byte. A format that zips the
  // set has no text to show (a .zip is bytes), and neither does a binary bundle (.ase).
  const setPv = await page.evaluate(() => {
    const p = document.querySelector('[data-gx-export-preview]') as HTMLElement | null;
    const w = (document.querySelector('[data-gx-export]') as HTMLElement).getBoundingClientRect();
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { id: p.dataset.gxExportPreview ?? '', text: (p.querySelector('[data-gx-preview-text]') as HTMLElement).textContent ?? '', beside: r.right <= w.left || r.left >= w.right };
  });
  if (!setPv || setPv.id !== 'format:ai') fail(`[7] hovering the set's .ai row shows ${setPv ? `the preview of "${setPv.id}"` : 'no preview'}`);
  if (!setPv!.beside) fail("[7] the set's preview overlaps its window");
  const [aiDl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('[data-gx-export] [data-gx-download="ai"]')]);
  const aiFile = fs.readFileSync((await aiDl.path())!, 'utf8');
  if (aiFile !== setPv!.text) fail(`[7] the set's .ai preview (${setPv!.text.length} chars) is not the .ai that downloaded (${aiFile.length} chars)`);
  if (!/Spiky/.test(aiFile) || !/Plain/.test(aiFile)) fail('[7] the set .ai does not hold both members — the preview proved nothing');
  for (const k of ['gpl', 'ase']) {
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    await page.hover(`[data-gx-export] [data-gx-download="${k}"]`);
    await page.waitForTimeout(350);
    const id = await page.evaluate(() => (document.querySelector('[data-gx-export-preview]') as HTMLElement | null)?.dataset.gxExportPreview ?? null);
    if (id) fail(`[7] the set's ${k} row (a ${k === 'ase' ? 'binary bundle' : '.zip'}) shows a preview ("${id}")`);
  }
  console.log("✓ [7] a lossy bundle says so on hover, in the reserved line, and nothing moves; the set's .ai previews the file that downloads, a .zip row previews nothing");

  // [7b] ONE GRADIENT says it too (owner, 2026-09-13). The hero's own Export window used to
  // compute the notice for a SET only (`lossy = isSet && bundles ? … : 0`), so the same
  // 60-stop gradient that warned inside a set went to Illustrator alone simplified and silent.
  // Pick it off the ground, open the hero's window, and it must say the same words in the same
  // strip; the two-stop member beside it must say nothing. Falsified 2026-09-13 by restoring
  // `isSet && bundles ? … : 0`: red on "a 60-stop gradient exports alone to .ai with no
  // notice". A notice that fired for everything is what the Plain half is for.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const putOnHero = async (name: string, step: string) => {
    // the set's tiles, by NAME through the wall's own title (the ground is canvas-drawn): try
    // each tile position until the hero carries the name asked for
    const wallEl = page.locator('[data-gx-keepselect] canvas').first();
    await wallEl.waitFor({ state: 'visible', timeout: 10000 });
    const wb = (await wallEl.boundingBox())!;
    let got = '';
    for (let i = 0; i < 6 && got !== name; i++) {
      await page.mouse.click(wb.x + 30 + i * Math.max(40, wb.width / 6), wb.y + Math.min(30, wb.height / 2));
      await page.waitForTimeout(500);
      got = await page.evaluate(() => (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '');
    }
    if (got !== name) fail(`[${step}] could not put "${name}" on the hero from the ground (hero: "${got}")`);
  };
  const heroLossy = async (name: string) => {
    await putOnHero(name, '7b');
    await page.mouse.move(5, 5);
    await page.click('[data-gx-hero] [title^="Export"]');
    await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail(`[7b] the hero's Export window did not open on "${name}"`));
    const open = await page.evaluate(() => (document.querySelector('[data-gx-section][data-open]') as HTMLElement | null)?.dataset.gxSection ?? null);
    if (open !== 'For design apps') {
      await page.click('[data-gx-section="For design apps"]');
      await page.waitForTimeout(250);
    }
    const keys = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gx-export] [data-gx-lossy]')).map((e) => (e as HTMLElement).dataset.gxFormat ?? ''));
    await page.hover('[data-gx-export] [data-gx-format="ai"]');
    await page.waitForTimeout(250);
    const text = await page.evaluate(() => (document.querySelector('[data-gx-export] [data-gx-note]') as HTMLElement).innerText.trim());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    return { keys, text };
  };
  const spiky = await heroLossy('Spiky');
  if (!spiky.keys.includes('ai')) fail(`[7b] a 60-stop gradient exports alone to .ai with no notice (noted: ${spiky.keys.join(', ') || 'none'})`);
  if (spiky.text !== '1 gradient reduced to 40 colour stops')
    fail(`[7b] one gradient's note reads "${spiky.text}" — expected the set's own words, "1 gradient reduced to 40 colour stops"`);
  const plain = await heroLossy('Plain');
  if (plain.keys.length) fail(`[7b] a two-stop gradient warns that it was reduced (${plain.keys.join(', ')}) — the notice is firing for everything`);
  if (plain.text) fail(`[7b] a two-stop gradient's .ai row says "${plain.text}" on hover`);
  console.log('✓ [7b] one gradient warns the way a set does: the 60-stop one on hover, the two-stop one never');

  // [7c] THE PREVIEW CARRIES THE SETTINGS (parity row O4, 2026-09-23). [5d]'s pick is three
  // near-collinear colours, which every stop budget leaves exactly as it is (measured: its CSS is
  // two stops with or without one), so the budget half of "the preview is built from the options
  // the Copy uses" is proven here, on the 60-stop gradient: with a 2-stop budget in Settings the
  // CSS row's preview holds exactly two stops, and it is still byte for byte what Copy writes.
  // Built without the budget it holds 22 (measured 2026-09-23, the falsification below).
  await page.evaluate(() => localStorage.setItem('gx.v2.exportSettings', JSON.stringify({ budget: 2, pngW: 1024, pngH: 128 })));
  await putOnHero('Spiky', '7c');
  await page.mouse.move(5, 5);
  await page.click('[data-gx-hero] [title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[7c] the hero\'s Export window did not open on "Spiky"'));
  if (!(await page.$('[data-gx-export] [data-gx-format="css"]'))) {
    await page.click('[data-gx-export] [data-gx-section="For the web"]');
    await page.waitForTimeout(200);
  }
  await page.hover('[data-gx-export] [data-gx-download="css"]');
  await page.waitForTimeout(350);
  const spikyPv = await page.evaluate(() => (document.querySelector('[data-gx-export-preview] [data-gx-preview-text]') as HTMLElement | null)?.textContent ?? null);
  if (spikyPv === null) fail('[7c] hovering the CSS row of "Spiky" shows no preview');
  await page.click('[data-gx-export] [data-gx-copy="css"]');
  await page.waitForTimeout(250);
  const spikyClip = (await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `unreadable: ${e}`)).replace(/\r\n/g, '\n');
  const spikyStops = (spikyPv!.match(/#[0-9a-f]{6}/gi) ?? []).length;
  if (spikyPv !== spikyClip) fail(`[7c] under a 2-stop budget the CSS preview (${spikyStops} stops) is not what Copy wrote (${(spikyClip.match(/#[0-9a-f]{6}/gi) ?? []).length} stops) — the preview is built from other options`);
  if (spikyStops !== 2) fail(`[7c] the 60-stop gradient's CSS preview has ${spikyStops} stops under a 2-stop budget — Settings did not reach it`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.evaluate(() => localStorage.removeItem('gx.v2.exportSettings'));
  console.log('✓ [7c] under a 2-stop budget a 60-stop gradient previews two stops of CSS, exactly what Copy writes');

  // [8] EXPORT NAMES. Fresh shelf and ground; the wall's first tile is a catalogue entry from a
  // v2 pack, so the pick stamps an origin (read back through the shell's own debug handle).
  await page.evaluate(() => {
    for (const k of ['gmt.favients', 'gmt.favients.groups', 'gmt.ge.groundSet', 'gx.v2.recentExports', 'gx.v2.exportSection']) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const wall8 = page.locator('[data-gx-keepselect] canvas').first();
  await wall8.waitFor({ state: 'visible', timeout: 15000 });
  const b8 = (await wall8.boundingBox())!;
  await page.mouse.click(b8.x + 24, b8.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[8] no hero after a wall click'));
  await page.waitForTimeout(700);
  const picked = await page.evaluate(() => {
    const w = (window as any).__gxWorking?.();
    return {
      origin: w?.input?.origin ?? null,
      config: w?.input?.config ?? null,
      name: (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '',
    };
  });
  if (!picked.origin?.credit) fail(`[8] a wall pick carries no catalogue origin (${JSON.stringify(picked.origin)}) — is the core pack format v2?`);
  const credit: string = picked.origin.credit;
  /** Download the working gradient as .json from the hero's Export window; returns the name inside and the filename. */
  const exportJson = async (): Promise<{ inside: string; file: string }> => {
    await page.mouse.move(5, 5);
    await page.click('[data-gx-hero] [title^="Export"]');
    await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[8] the Export window did not open'));
    if (!(await page.$('[data-gx-export] [data-gx-download="json"]'))) {
      const titles = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gx-export] [data-gx-section]')).map((h) => (h as HTMLElement).dataset.gxSection ?? ''));
      for (const t of titles) {
        if (t === 'Settings') continue;
        const open = await page.evaluate(() => (document.querySelector('[data-gx-export] [data-gx-section][data-open]') as HTMLElement | null)?.dataset.gxSection ?? null);
        if (open !== t) { await page.click(`[data-gx-export] [data-gx-section="${t}"]`); await page.waitForTimeout(150); }
        if (await page.$('[data-gx-export] [data-gx-download="json"]')) break;
      }
    }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('[data-gx-export] [data-gx-download="json"]')]);
    const p = await dl.path();
    const inside = JSON.parse(fs.readFileSync(p!, 'utf8')).name as string;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    return { inside, file: dl.suggestedFilename() };
  };
  // The filename is the name AS IT IS (2026-09-16, plans/gradient-file-format.md "Still open"):
  // spaces and punctuation kept, only the credit's `/` turned into `-` — the GMT file's rule.
  const creditInFile = credit.replace(/\s*\/\s*/g, '-');
  let ex = await exportJson();
  if (ex.inside !== `${picked.name} (${credit})`) fail(`[8] the unedited pick exported as "${ex.inside}", without its credit (wanted "${picked.name} (${credit})")`);
  if (ex.file !== `${picked.name} (${creditInFile}).json`) fail(`[8] the filename "${ex.file}" is not the credited name as it is ("${picked.name} (${creditInFile}).json")`);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ reverse: true }));
  await page.waitForTimeout(600);
  ex = await exportJson();
  if (ex.inside !== picked.name) fail(`[8] one Adjust dial later the export still carries the credit ("${ex.inside}")`);
  if (ex.file !== `${picked.name}.json`) fail(`[8] one Adjust dial later the filename is "${ex.file}", not the plain name ("${picked.name}.json")`);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ reverse: false }));
  await page.waitForTimeout(600);
  ex = await exportJson();
  if (ex.inside !== `${picked.name} (${credit})`) fail(`[8] with the dial back the gradient is unmodified again, but exported as "${ex.inside}"`);

  // …and a SET: three favourites, only the unedited catalogue one credited.
  await page.evaluate(({ config, origin }) => {
    const edited = JSON.parse(JSON.stringify(config));
    edited.stops[0].color = edited.stops[0].color.toUpperCase() === '#000000' ? '#010101' : '#000000';
    const other = { stops: [{ id: 'o0', position: 0, color: '#203040' }, { id: 'o1', position: 1, color: '#E0C080' }], colorSpace: 'srgb', blendSpace: 'oklab' };
    const t = Date.now();
    localStorage.setItem('gmt.favients', JSON.stringify([
      { id: 'c-kept', name: 'Kept', config, origin, createdAt: t, group: 'credited' },
      { id: 'c-edit', name: 'Edited', config: edited, origin, createdAt: t - 1, group: 'credited' },
      { id: 'c-old', name: 'Old', config: other, source: 'Picker', createdAt: t - 2, group: 'credited' },
    ]));
    localStorage.setItem('gmt.favients.groups', JSON.stringify({ credited: 'Credited' }));
    localStorage.setItem('gmt.ge.groundSet', JSON.stringify(['group:credited']));
    localStorage.removeItem('gx.v2.exportSection');
  }, { config: picked.config, origin: picked.origin });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const ground8 = await page.$('[data-gx-export-ground]');
  if (!ground8) fail('[8] the rail has no ground-export icon');
  await ground8!.click();
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[8] the ground Export window did not open'));
  for (const t of await page.evaluate(() => Array.from(document.querySelectorAll('[data-gx-export] [data-gx-section]')).map((h) => (h as HTMLElement).dataset.gxSection ?? ''))) {
    if (await page.$('[data-gx-export] [data-gx-download="json"]')) break;
    if (t === 'Settings') continue;
    const open = await page.evaluate(() => (document.querySelector('[data-gx-export] [data-gx-section][data-open]') as HTMLElement | null)?.dataset.gxSection ?? null);
    if (open !== t) { await page.click(`[data-gx-export] [data-gx-section="${t}"]`); await page.waitForTimeout(150); }
  }
  const [zipDl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('[data-gx-export] [data-gx-download="json"]')]);
  const files = unzipSync(new Uint8Array(fs.readFileSync((await zipDl.path())!)));
  const names = Object.values(files).map((u) => JSON.parse(strFromU8(u)).name as string).sort();
  const want = ['Edited', `Kept (${credit})`, 'Old'].sort();
  if (JSON.stringify(names) !== JSON.stringify(want)) {
    if (!names.includes(`Kept (${credit})`)) fail(`[8] the set's unedited catalogue member is not credited (${names.join(' | ')})`);
    fail(`[8] the set exported as ${names.join(' | ')} — wanted ${want.join(' | ')}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log(`✓ [8] "${picked.name} (${credit})" while unmodified, plain after one dial, credited again with it back; a set credits only its unedited catalogue member`);

  // [9] GX GLOBAL. Intercept the endpoint: GET answers an empty set, a POST is recorded and refused.
  const posts: string[] = [];
  const dialogs: string[] = [];
  await page.route('**/functions/v1/gx-gradients', async (route) => {
    if (route.request().method() === 'POST') {
      posts.push(route.request().postData() ?? '');
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"intercepted by smoke"}' });
    } else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"version":1,"items":[]}' });
  });
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await page.evaluate(() => { localStorage.setItem('gmt.ge.groundSet', JSON.stringify(['all'])); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const wall9 = page.locator('[data-gx-keepselect] canvas').first();
  await wall9.waitFor({ state: 'visible', timeout: 15000 });
  const b9 = (await wall9.boundingBox())!;
  await page.mouse.click(b9.x + 24, b9.y + 14);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('[9] no hero after a wall click'));
  await page.waitForTimeout(600);
  await page.click('[data-gx-set="gx-global"]');
  await page.waitForSelector('[data-gx-share-global]', { timeout: 5000 }).catch(() => fail('[9] the GX global ground has no share button'));
  const toasts = () => page.evaluate(() => Array.from(document.querySelectorAll('button[title="Dismiss"]')).map((b) => b.textContent ?? '').join(' | '));
  await page.click('[data-gx-share-global]');
  await page.waitForTimeout(1200);
  if (dialogs.length) fail(`[9] an unedited catalogue gradient reached the confirm ("${dialogs[0].slice(0, 40)}…")`);
  if (posts.length) fail('[9] an unedited catalogue gradient was POSTed to GX global');
  if (!/straight from the catalogue/i.test(await toasts())) fail(`[9] no refusal toast (toasts: ${(await toasts()) || 'none'})`);
  await page.evaluate(() => (window as any).__store.getState().setPaletteGenerator({ reverse: true }));
  await page.waitForTimeout(600);
  await page.click('[data-gx-share-global]');
  await page.waitForTimeout(1200);
  if (dialogs.length !== 1) fail(`[9] an EDITED gradient did not reach the confirm (${dialogs.length} dialogs) — the check refuses everything`);
  if (posts.length) fail('[9] a dismissed confirm still POSTed');
  // The rights line is asked ONLY for an imported gradient (owner, 2026-09-24): an edited
  // catalogue pick goes without it, a gradient carrying the importer's `Import · .<ext>`
  // provenance gets it. Falsified 2026-09-24 by passing `imported: true` always → red on the
  // first check, and by dropping the flag in BrowseStage → red on the second.
  if (/right to share/i.test(dialogs[0] ?? '')) fail('[9] the confirm asked for the rights line on a gradient that was not imported');
  // Import the working store at the EXACT url the app loaded it from: after any edit the dev
  // server serves it as `workingStore.ts?t=…`, and a bare-url import would be a second,
  // disconnected instance (measured 2026-09-24: the pick landed in the copy while its dial
  // reset hit the real engine store, so the edited gradient reverted and was refused).
  await page.evaluate(`(async () => {
    const url = performance.getEntriesByType('resource').map((e) => e.name)
      .find((n) => /\\/palette\\/store\\/workingStore\\.ts(\\?|$)/.test(n)) || '/palette/store/workingStore.ts';
    const ws = await import(url);
    ws.useWorkingStore.getState().use({ stops: [
      { id: 'a', position: 0, color: '#123456', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 1, color: '#FEDCBA', bias: 0.5, interpolation: 'linear' },
    ], colorSpace: 'srgb', blendSpace: 'oklab' }, 'from a file', 'Import · .ggr');
  })()`);
  await page.waitForTimeout(600);
  await page.click('[data-gx-share-global]');
  await page.waitForTimeout(1200);
  if (dialogs.length !== 2 || !/right to share/i.test(dialogs[1] ?? '')) fail(`[9] an IMPORTED gradient's confirm did not ask for the rights line (${dialogs.length} dialogs; toasts: ${(await toasts()) || 'none'})`);
  if (posts.length) fail('[9] a dismissed confirm still POSTed');
  await page.unroute('**/functions/v1/gx-gradients');
  console.log('✓ [9] GX global refuses the unedited pick with a toast and no request; the same gradient edited is offered');

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the hero never unmounts (L8); one export window, two subjects, one reserved note line; credits ride unmodified exports; GX global refuses the catalogue');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
