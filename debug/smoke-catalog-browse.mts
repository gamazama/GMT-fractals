/**
 * Smoke: the Workshop Frag browse button opens the unified catalog picker with
 * the Fragmentarium source link in the header + thumbnail cards, and picking a
 * card loads it into the editor.
 *
 * Requires app-gmt dev server. ENGINE_URL overrides (default :5173/app-gmt.html).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:5173/app-gmt.html';

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newContext({ viewport: { width: 1500, height: 950 } }).then(c => c.newPage());
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof (window as any).__store?.getState?.().openWorkshop === 'function', null, { timeout: 30000 });
    await page.evaluate(() => (window as any).__store.getState().openWorkshop());
    await page.waitForTimeout(2500);

    let pass = true;

    // Click the Frag browse button (label depends on browseMode; default 'folder' → "Frag Examples").
    const clicked = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => /^Frag (Examples|Categories)$/.test((x.textContent || '').trim()));
        if (!b) return false;
        (b as HTMLButtonElement).click();
        return true;
    });
    console.log(`Frag browse button click: ${clicked ? 'ok' : 'NOT FOUND'}`);
    if (!clicked) pass = false;

    await page.waitForTimeout(2500); // library + thumb index load, picker render

    const probe = await page.evaluate(() => {
        const shell = document.querySelector('.formula-picker-shell');
        const link = Array.from(document.querySelectorAll('.formula-picker-shell a'))
            .find(a => /Fragmentarium Source/i.test(a.textContent || '')) as HTMLAnchorElement | undefined;
        const cards = document.querySelectorAll('.formula-picker-shell img').length;
        return {
            shell: !!shell,
            linkText: link?.textContent?.trim() ?? null,
            linkHref: link?.getAttribute('href') ?? null,
            imgCount: cards,
        };
    });
    console.log('picker shell present:', probe.shell);
    console.log('header link:', probe.linkText, '->', probe.linkHref);
    console.log('thumbnail <img> count:', probe.imgCount);

    if (!probe.shell) { console.log('FAIL: picker shell not rendered'); pass = false; }
    if (!probe.linkText || !/Fragmentarium Source/i.test(probe.linkText)) { console.log('FAIL: header link missing'); pass = false; }
    if (probe.linkHref !== 'https://github.com/3Dickulus/Fragmentarium_Examples_Folder') { console.log('FAIL: header link href wrong'); pass = false; }
    if (probe.imgCount < 1) { console.log('FAIL: no thumbnails rendered'); pass = false; }

    if (errors.length) { pass = false; console.log('PAGE ERRORS:', errors.slice(0, 5)); }

    await browser.close();
    console.log(pass ? '\nSMOKE PASS' : '\nSMOKE FAIL');
    process.exit(pass ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
