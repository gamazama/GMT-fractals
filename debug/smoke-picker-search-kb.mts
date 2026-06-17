/**
 * Smoke: (1) the unified picker's search finds frag/DEC catalog items; (2) the
 * picker blocks plain letters/numbers from reaching the global keyboard-
 * shortcuts controller (engine/plugins/Shortcuts, window keydown).
 *
 * Uses the Workshop Frag browse picker (catalog-only) as the test surface.
 * Requires app-gmt dev server. ENGINE_URL overrides (default :5173/app-gmt.html).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:5173/app-gmt.html';

async function main() {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    // tsx/esbuild wraps named fns with __name(); ensure it exists in-page.
    await context.addInitScript(() => { (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn); });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof (window as any).__shortcuts?.register === 'function'
        && typeof (window as any).__store?.getState?.().openWorkshop === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(1500);

    let pass = true;

    // Register a high-priority global shortcut on 'g' that flips a flag.
    await page.evaluate(() => {
        (window as any).__kbFired = false;
        (window as any).__shortcuts.register({
            id: '__kbtest', key: 'g', priority: 99999,
            handler: () => { (window as any).__kbFired = true; },
        });
    });

    // ── Control: with NO picker open, 'g' SHOULD fire the shortcut ──
    await page.evaluate(() => { (window as any).__kbFired = false; (document.activeElement as HTMLElement)?.blur?.(); });
    await page.keyboard.press('g');
    await page.waitForTimeout(150);
    const controlFired = await page.evaluate(() => (window as any).__kbFired === true);
    console.log(`control (picker closed) 'g' fires shortcut: ${controlFired ? 'yes (good)' : 'NO — test setup invalid'}`);
    if (!controlFired) pass = false;

    // ── Open the Workshop + Frag browse picker ──
    await page.evaluate(() => (window as any).__store.getState().openWorkshop());
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => /^Frag (Examples|Categories)$/.test((x.textContent || '').trim()));
        (b as HTMLButtonElement | undefined)?.click();
    });
    await page.waitForTimeout(2500); // library + thumb index + picker render

    const focusInfo = await page.evaluate(() => {
        const ae = document.activeElement as HTMLElement | null;
        return { present: !!document.querySelector('.formula-picker-shell'), inShell: !!ae?.closest('.formula-picker-shell'), tag: ae?.tagName };
    });
    console.log('picker shell present:', focusInfo.present, '| auto-focus inside picker:', focusInfo.inShell, `(activeElement=${focusInfo.tag})`);
    if (!focusInfo.present) { pass = false; }

    // ── Keyboard block: focus the picker body, press 'g' on it; must NOT reach the controller ──
    await page.evaluate(() => { (window as any).__kbFired = false; });
    const body = page.locator('.formula-picker-shell [tabindex="-1"]').first();
    await body.press('g');     // focuses the body then presses; type-to-open-search; must be blocked
    await page.waitForTimeout(250);
    const blockedFired = await page.evaluate(() => (window as any).__kbFired === true);
    const searchOpened = await page.evaluate(() => {
        const inp = document.querySelector('.formula-picker-shell input[type="text"]') as HTMLInputElement | null;
        return inp ? inp.value : null;
    });
    console.log(`picker-open 'g' fired controller: ${blockedFired ? 'YES — NOT BLOCKED (fail)' : 'no (blocked, good)'}`);
    console.log(`picker search opened with value: ${JSON.stringify(searchOpened)}`);
    if (blockedFired) pass = false;

    // ── Catalog search: ensure search is visible, type a query, expect frag thumbnails ──
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.formula-picker-shell button')).find(b => /🔍/.test(b.textContent || ''));
        if (btn && !document.querySelector('.formula-picker-shell input[type="text"]')) (btn as HTMLButtonElement).click();
    });
    await page.waitForTimeout(300);
    await page.fill('.formula-picker-shell input[type="text"]', 'bulb');
    // Thumbnails load async — poll until they render instead of a fixed delay
    // (the fixed 1200ms was flaky in-chain under load). On timeout we fall
    // through to the assertion below, so a genuine miss still fails loudly.
    await page.waitForFunction(() => {
        const shell = document.querySelector('.formula-picker-shell');
        return !!shell && shell.querySelectorAll('img').length >= 1;
    }, null, { timeout: 10000 }).catch(() => {});
    const searchProbe = await page.evaluate(() => {
        const shell = document.querySelector('.formula-picker-shell');
        if (!shell) return { catalogLabel: false, imgs: 0 };
        const hasCatalogLabel = Array.from(shell.querySelectorAll('div')).some(d => /Catalog\s*—\s*opens in Workshop/i.test(d.textContent || ''));
        const imgs = shell.querySelectorAll('img').length;
        return { catalogLabel: hasCatalogLabel, imgs };
    });
    console.log(`search 'bulb' → catalog section: ${searchProbe.catalogLabel}, thumbnail <img>: ${searchProbe.imgs}`);
    if (!searchProbe.catalogLabel) { console.log('FAIL: no catalog results section for "bulb"'); pass = false; }
    if (searchProbe.imgs < 1) { console.log('FAIL: no catalog thumbnails in search results'); pass = false; }

    await page.evaluate(() => (window as any).__shortcuts.unregister('__kbtest'));
    if (errors.length) { pass = false; console.log('PAGE ERRORS:', errors.slice(0, 5)); }

    await browser.close();
    console.log(pass ? '\nSMOKE PASS' : '\nSMOKE FAIL');
    process.exit(pass ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
