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
 *   [7] and the note itself: a set holding a 60-stop gradient bundles into .ai and .ase
 *       lossily, says "1 gradient reduced to 40 colour stops" in that strip ON HOVER, and
 *       neither the window nor the rows below it move when it does
 *
 * Falsified 2026-09-06 by re-introducing the old hide (`if (!shown) return null` →
 * `if (emptySource) return null`): step [3] goes red with "the hero unmounted on an empty
 * Image source (L8)". Wants `npm run dev` on port 3400, like every other browser smoke.
 *
 * Step [5] falsified 2026-09-09 two ways, each reverted: pinning `formatsFor('ramp')` in
 * ExportMenu whatever the subject is (red with "the Swatches subject offers the same
 * formats as Ramp (20 vs 20) — the subject is decorative"), and dropping the subject from
 * the image row's wording (red with "should be the swatch sheet (png-strip)"). The first
 * cut of [5] keyed the format list off each Download button's TITLE and reported a false
 * red: .css is the extension of two formats now (the linear-gradient and the variable set),
 * so it read cssvars as css. It keys off the registry key instead.
 *
 * Run: `npm run smoke:ge-hero`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

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
  const ctx = await browser.newContext();
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

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
        image: w.innerText.includes('Swatch sheet') ? 'swatch-sheet' : w.innerText.includes('PNG strip') ? 'png-strip' : 'other',
      };
    });
  /** Open every format section in turn and collect what each holds. */
  const collect = async () => {
    const first = await readWindow();
    if (!first) fail('[5] the Export window vanished');
    const all: string[] = [];
    const seen = new Map<string, string>(); // format key -> the section that showed it
    for (const title of first!.sections) {
      if (title === 'Output profile') continue;
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
  if (ramp.image !== 'png-strip') fail(`[5] the Ramp subject's image row should be the PNG strip (${ramp.image})`);
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
  console.log('✓ [7] a lossy bundle says so on hover, in the reserved line, and nothing moves');

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the hero never unmounts (L8); one export window, two subjects, one reserved note line');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
