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

  // [5] THE EXPORT WINDOW'S TWO SUBJECTS (§8b item 5). The window is one surface over the
  // ramp and the palette; the format list is not a filter written here but the registry
  // seen through `formatsFor`, so the assertion is that switching the subject actually
  // CHANGES the offer — a subject control that only painted itself would look identical.
  // Falsified by passing 'ramp' to `formatsFor` in ExportMenu whatever the subject is:
  // red with "the Swatches subject offers the same formats as Ramp".
  await page.click('[title^="Export"]');
  await page.waitForSelector('[data-gx-export]', { timeout: 5000 }).catch(() => fail('[5] the Export window did not open'));
  const readWindow = () =>
    page.evaluate(() => {
      const w = document.querySelector('[data-gx-export]') as HTMLElement | null;
      if (!w) return null;
      const seg = w.querySelector('[data-gx-export-subject]');
      return {
        subjects: Array.from(seg?.querySelectorAll('[data-gx-subject]') ?? []).map((b) => (b as HTMLElement).dataset.gxSubject ?? ''),
        on: (seg?.querySelector('[data-gx-subject][data-on]') as HTMLElement | null)?.dataset.gxSubject ?? null,
        // one row per offered format, keyed by the REGISTRY key rather than by the
        // download title: two formats can share an extension (.css is both the
        // linear-gradient and the variable set), and a title test cannot tell them apart.
        formats: Array.from(w.querySelectorAll('[data-gx-format]')).map((e) => (e as HTMLElement).dataset.gxFormat ?? ''),
        image: w.innerText.includes('Swatch sheet') ? 'swatch-sheet' : w.innerText.includes('PNG strip') ? 'png-strip' : 'other',
      };
    });
  const ramp = await readWindow();
  if (!ramp) fail('[5] the Export window vanished');
  if (ramp!.subjects.join(',') !== 'ramp,swatches') fail(`[5] the subject control is not Ramp + Swatches (${ramp!.subjects.join(',')})`);
  if (ramp!.on !== 'ramp') fail(`[5] the window should open on the Ramp subject (${ramp!.on})`);
  if (!ramp!.formats.length) fail('[5] the Ramp subject offered no formats at all');
  if (ramp!.image !== 'png-strip') fail(`[5] the Ramp subject's image row should be the PNG strip (${ramp!.image})`);

  await page.click('[data-gx-subject="swatches"]');
  await page.waitForTimeout(250);
  const sw = await readWindow();
  if (sw!.on !== 'swatches') fail('[5] the Swatches segment did not take');
  if (!sw!.formats.length) fail('[5] the Swatches subject offered no formats at all');
  if (sw!.formats.length >= ramp!.formats.length)
    fail(`[5] the Swatches subject offers the same formats as Ramp (${sw!.formats.length} vs ${ramp!.formats.length}) — the subject is decorative`);
  // The ramp-only formats must be GONE, not merely fewer: a CSS linear-gradient of seven
  // colours is not a palette, and .ase must be there, because it is the reason a designer
  // opens this at all.
  const rampOnly = ['css', 'svg', 'ggr', 'cpt', 'map', 'ugr', 'grd', 'ai', 'idml'].filter((k) => sw!.formats.includes(k));
  if (rampOnly.length) fail(`[5] ramp-only formats are still offered under Swatches: ${rampOnly.join(', ')}`);
  for (const k of ['ase', 'gpl', 'hex', 'tw', 'tokens', 'cssvars'])
    if (!sw!.formats.includes(k)) fail(`[5] ${k} is missing from the Swatches subject`);
  if (!ramp!.formats.includes('css') || !ramp!.formats.includes('ggr')) fail('[5] the Ramp subject lost a ramp format');
  if (sw!.image !== 'swatch-sheet') fail(`[5] the Swatches subject's image row should be the swatch sheet (${sw!.image})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.$('[data-gx-export]')) fail('[5] Escape did not close the Export window');
  console.log('✓ [5] one export window, two subjects: Swatches narrows the offer and changes the image row');

  await browser.close();
  if (errors.length) {
    errors.forEach((e) => console.log(e));
    console.log('\nFAIL — page errors');
    process.exit(1);
  }
  console.log('\nPASS — the hero never unmounts (L8); one export window, two subjects');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
