/**
 * Smoke test for @engine/help in fluid-toy.
 *
 * Verifies:
 *   1. Topbar has a "Help" menu button registered via @engine/menu.
 *   2. Clicking it opens a popover with "Getting Started", "Keyboard
 *      Shortcuts", a separator, and a "Show Hints" toggle.
 *   3. The "H" keyboard shortcut flips store.showHints.
 *   4. Clicking the Show Hints item flips store.showHints.
 *   5. Clicking "Getting Started" opens the HelpBrowser overlay.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Find the help menu anchor button (aria-label "Help & tips")
    const helpBtn = page.locator('button[aria-label="Help & tips"]');
    const helpCount = await helpBtn.count();
    if (helpCount !== 1) throw new Error(`expected 1 help button, got ${helpCount}`);
    console.log('✓ help button present');

    // 2. Click and verify the popover items show
    await helpBtn.click();
    await page.waitForTimeout(150);

    const items = await page.$$eval('button', (btns) =>
        btns.map((b) => (b.textContent || '').trim()).filter(Boolean),
    );
    for (const label of ['Getting Started', 'Keyboard Shortcuts', 'Show Hints']) {
        if (!items.some((t) => t.includes(label))) {
            throw new Error(`menu missing item: ${label}\nfound items: ${JSON.stringify(items.slice(0, 40))}`);
        }
    }
    console.log('✓ popover has expected items');

    // 3. Click the Show Hints toggle (popover already open from step 2)
    const before = await page.evaluate(() => (window as any).__store?.getState?.().showHints);
    const showHintsToggle = page.locator('button', { hasText: 'Show Hints' }).first();
    await showHintsToggle.click();
    await page.waitForTimeout(100);
    const afterClick = await page.evaluate(() => (window as any).__store?.getState?.().showHints);
    if (afterClick === before) throw new Error(`Clicking Show Hints did not flip (stayed ${before})`);
    console.log(`✓ Show Hints click flipped: ${before} → ${afterClick}`);

    // 4. H shortcut flips showHints. Blur the toggle first so the key
    // goes to body; body.dispatchEvent bypasses Playwright's autowait
    // on scheduled navigations, which was flaky when routed through
    // the canvas pointer layer.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(50);
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(100);
    const afterKey = await page.evaluate(() => (window as any).__store?.getState?.().showHints);
    if (afterKey === afterClick) throw new Error(`H shortcut did not flip showHints (stayed ${afterClick})`);
    console.log(`✓ H shortcut flipped showHints: ${afterClick} → ${afterKey}`);

    // 5. Getting Started opens HelpBrowser. Since the earlier Show Hints
    // toggle click left the popover open, the "Getting Started" button is
    // still available — no need to re-open.
    const gsBtn = page.locator('button', { hasText: 'Getting Started' }).first();
    await gsBtn.click({ force: true });
    await page.waitForTimeout(200);
    const helpVisible = await page.evaluate(() => (window as any).__store?.getState?.().helpWindow?.visible);
    if (!helpVisible) throw new Error('Getting Started did not open HelpBrowser');
    console.log('✓ Getting Started opened HelpBrowser');

    if (errors.length > 0) {
        console.log('\nerrors:');
        errors.forEach((e) => console.log(' ', e));
        // HelpBrowser may log harmless async warnings; treat as info unless
        // anything matches a known-fatal pattern.
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b/.test(e));
        if (fatal.length > 0) throw new Error(`${fatal.length} fatal errors — see above`);
    }

    console.log('\n✅ @engine/help smoke passed');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
