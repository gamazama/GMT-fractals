/**
 * shot-ge-picker — capture and MEASURE the v2 colour picker (the tray's inspector face) at a
 * given viewport, so a phone pass is pixel-wise rather than eyeballed.
 *
 * Picks a gradient, clicks a palette swatch (which selects its stop and opens the inspector),
 * then writes a PNG of the shell and one of the tray, and prints the numbers a layout pass
 * actually argues about: the picker's box, anything laid out past its right edge, and which
 * ancestor (if any) will scroll to let you reach the bottom of it.
 *
 * Two of those found real defects on 2026-09-11. Anything past the right edge is UNREACHABLE,
 * not merely ugly — that is how the picker's mode bar went missing at 390 px, taking the
 * controls that choose the other controls with it. And the scroller measurement is why the
 * picker takes a `roomy` prop from its host rather than measuring: the phone tray is 609 px
 * tall, but its inner scroller sizes to the picker, so a FOLDED picker in it reports 104 px
 * of room and concludes it is cramped.
 *
 * Run: `npm run dev` on 3400, then
 *   `npx tsx debug/shot-ge-picker.mts [width] [height] [outPrefix]`
 * SEED='k=v,k=v' pre-seeds localStorage (e.g. gmt.colorpicker.details=1 to force it open).
 */
import { chromium } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const W = Number(process.argv[2] || 390);
const H = Number(process.argv[3] || 844);
// Default under debug/scratch/ (gitignored). It used to be a bare 'picker', which dropped two
// untracked PNGs in the REPO ROOT every run — noticed 2026-09-12 when a `git stash pop` failed
// on them. Pass a 4th argument to write somewhere else.
const OUT = process.argv[4] || 'debug/scratch/picker';

/** What a layout pass needs to know about the picker and the box it sits in. */
const MEASURE = `(() => {
  var t = document.querySelector('[data-gx-tray-root]');
  if (!t) return null;
  var tr = t.getBoundingClientRect();
  var out = { face: t.dataset.gxTray || null, trayW: Math.round(tr.width), trayH: Math.round(tr.height) };
  var pk = t.querySelector('[data-gx-picker-skin]');
  if (!pk) return out;
  var pr = pk.getBoundingClientRect();
  out.pickerW = Math.round(pr.width);
  out.pickerH = Math.round(pr.height);
  out.skin = pk.dataset.gxPickerSkin;
  var over = [];
  var all = pk.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var r = all[i].getBoundingClientRect();
    if (r.width > 0 && r.right > pr.right + 1) over.push(String(all[i].className).slice(0, 44) + ' right=' + Math.round(r.right));
  }
  out.pastRightEdge = over.slice(0, 6);
  for (var p = pk.parentElement; p; p = p.parentElement) {
    var oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') {
      out.scroller = { client: p.clientHeight, scroll: p.scrollHeight, needsScroll: p.scrollHeight > p.clientHeight + 2 };
      break;
    }
  }
  return out;
})()`;

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
        viewport: { width: W, height: H },
        deviceScaleFactor: 2,
        isMobile: W < 768,
        hasTouch: W < 768,
    });
    await seedGeSmokeState(ctx);
    if (process.env.SEED) {
        await ctx.addInitScript((pairs: string) => {
            for (const kv of pairs.split(',')) {
                const i = kv.indexOf('=');
                if (i > 0) try { window.localStorage.setItem(kv.slice(0, i), kv.slice(i + 1)); } catch { /* */ }
            }
        }, process.env.SEED);
    }
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    await page.mouse.click(box.x + 24, box.y + 14);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 });
    await page.waitForTimeout(1400);

    // A palette swatch click selects its stop and opens the inspector face with the picker.
    const sw = page.locator('[data-gx-hero] button[title*="click to edit its stop"]').first();
    if (await sw.count()) await sw.click();
    await page.waitForTimeout(900);

    console.log(`${W}x${H} ->`, JSON.stringify(await page.evaluate(MEASURE), null, 1));

    await page.screenshot({ path: `${OUT}-shell.png` });
    const tray = page.locator('[data-gx-tray-root]');
    if (await tray.count()) await tray.screenshot({ path: `${OUT}-tray.png` }).catch(() => {});
    console.log(`wrote ${OUT}-shell.png / ${OUT}-tray.png`);

    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
