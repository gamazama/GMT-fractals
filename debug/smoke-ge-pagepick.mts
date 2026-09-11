/**
 * smoke-ge-pagepick — the picker's pipette in a browser with NO `EyeDropper`.
 *
 * `window.EyeDropper` is Chromium-only, so in Firefox and Safari the picker falls back to a
 * PAGE-scoped pick (`components/gradient/pagePick.ts`): an overlay takes the pointer, the
 * colour under the cursor is read out of whatever is painted there, a click commits and Esc
 * cancels. This proves that path end to end.
 *
 *   [1] with the native pipette DELETED, the button opens the page-pick overlay
 *   [2] a click on the hero ramp lands that ramp's colour in the picker's hex
 *   [3] Esc cancels without changing the colour
 *   [4] where the native pipette EXISTS the overlay never appears (the fallback must not
 *       steal the gesture from a browser that has the real one)
 *
 * Runs in chromium with `EyeDropper` deleted (deterministic, and it is the CI browser) and
 * again in real firefox when BROWSER=firefox — the browser this was reported against.
 *
 * Run: `npm run dev` on 3400, then `npm run smoke:ge-pagepick`.
 */
import { chromium, firefox, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const useFirefox = process.env.BROWSER === 'firefox';

const fail = (msg: string): never => {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
};

const hexInPicker = (page: Page) =>
    page.evaluate(`(() => {
      var t = document.querySelector('[data-gx-tray-root]');
      var i = t && t.querySelector('input[value^="#"], input');
      return i ? i.value : null;
    })()`) as Promise<string | null>;

const overlayOpen = (page: Page) =>
    page.evaluate('document.querySelectorAll("[data-gmt-pagepick]").length > 0') as Promise<boolean>;

async function main() {
    const browser = await (useFirefox ? firefox : chromium).launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedGeSmokeState(ctx);
    // Chromium HAS EyeDropper; delete it so this run exercises the fallback the way Firefox
    // arrives at it. In real firefox the property is absent already and this is a no-op.
    await ctx.addInitScript(() => {
        try { delete (window as unknown as Record<string, unknown>).EyeDropper; } catch { /* */ }
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    console.log(`→ GET ${URL} (${useFirefox ? 'firefox' : 'chromium, EyeDropper deleted'})`);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    await page.mouse.click(box.x + 24, box.y + 14);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
    await page.waitForTimeout(1400);

    // A palette swatch click selects its stop and opens the inspector face with the picker.
    await page.locator('[data-gx-hero] button[title*="click to edit its stop"]').first().click();
    await page.waitForTimeout(700);
    const before = await hexInPicker(page);
    if (!before || !before.startsWith('#')) fail(`the picker did not open (hex field: ${before})`);

    const pipette = page.locator('[data-gx-tray-root] button[title*="Pick a colour"]').first();
    if (!(await pipette.count())) fail('no pipette button in the picker');

    // [1] the button opens the overlay rather than flashing "unsupported"
    await pipette.click();
    await page.waitForTimeout(250);
    if (!(await overlayOpen(page))) fail('[1] the pipette did not open the page-pick overlay');
    console.log('✓ [1] with no native pipette, the button opens the page-pick overlay');

    // [2] a click on the hero's ramp commits that pixel's colour
    const strip = page.locator('[data-gx-hero] canvas').first();
    const sb = (await strip.boundingBox())!;
    const px = sb.x + sb.width * 0.82;
    const py = sb.y + sb.height * 0.5;
    const wanted = await page.evaluate(
        `(() => { var c = document.querySelector('[data-gx-hero] canvas'); var r = c.getBoundingClientRect();` +
        ` var x = Math.floor(((${px} - r.left) / r.width) * c.width);` +
        ` var d = c.getContext('2d').getImageData(x, 0, 1, 1).data;` +
        ` return '#' + ((1 << 24) + (d[0] << 16) + (d[1] << 8) + d[2]).toString(16).slice(1).toUpperCase(); })()`,
    ) as string;
    await page.mouse.move(px, py);
    await page.waitForTimeout(120);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);
    if (await overlayOpen(page)) fail('[2] the overlay stayed open after the click');
    const after = await hexInPicker(page);
    if (after !== wanted) fail(`[2] the pick did not land the ramp's colour (picked ${after}, the ramp has ${wanted} there)`);
    console.log(`✓ [2] a click on the ramp landed its own pixel (${wanted})`);

    // [3] Esc cancels and leaves the colour alone
    await pipette.click();
    await page.waitForTimeout(250);
    if (!(await overlayOpen(page))) fail('[3] the overlay did not reopen');
    await page.mouse.move(sb.x + sb.width * 0.2, py);
    await page.waitForTimeout(120);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await overlayOpen(page)) fail('[3] Escape did not close the overlay');
    if ((await hexInPicker(page)) !== after) fail('[3] Escape changed the colour — a cancel must not commit');
    console.log('✓ [3] Escape cancels the pick and leaves the colour alone');

    // [4] a browser WITH the native pipette must not get the fallback
    if (!useFirefox) {
        const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await seedGeSmokeState(ctx2);
        const p2 = await ctx2.newPage();
        await p2.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
        await p2.waitForTimeout(1500);
        const w2 = p2.locator('[data-gx-keepselect] canvas').first();
        await w2.waitFor({ state: 'visible', timeout: 15000 });
        const b2 = (await w2.boundingBox())!;
        await p2.mouse.click(b2.x + 24, b2.y + 14);
        await p2.waitForSelector('[data-gx-hero]', { timeout: 8000 });
        await p2.waitForTimeout(1400);
        await p2.locator('[data-gx-hero] button[title*="click to edit its stop"]').first().click();
        await p2.waitForTimeout(700);
        const title = await p2.locator('[data-gx-tray-root] button[title*="Pick a colour"]').first().getAttribute('title');
        if (!title?.includes('anywhere on screen')) fail(`[4] with a native pipette the button should offer the screen, not the page (title: ${title})`);
        await p2.locator('[data-gx-tray-root] button[title*="Pick a colour"]').first().click();
        await p2.waitForTimeout(400);
        if (await overlayOpen(p2)) fail('[4] the page-pick overlay opened in a browser that has the native pipette');
        console.log('✓ [4] a browser with the native pipette keeps it — no overlay, and the label says "screen"');
        await ctx2.close();
    }

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — the pipette works without `EyeDropper`, and stays out of the way with it');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
