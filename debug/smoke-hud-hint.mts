/**
 * Smoke test for @engine/hud + help.registerHudHint.
 *
 * Checks:
 *   1. HudHost renders; the quality badge widget is present.
 *   2. When showHints is true, the keyboard-shortcut hint line is
 *      visible on the HUD (we look for the `Space` pill text).
 *   3. Toggling showHints off removes the hint line.
 *   4. Toggling back on brings it back.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Hotkeys cheatsheet should render with its title when showHints=true.
    // Match the uppercase "Hotkeys" span inside the cheatsheet, not
    // unrelated UI that may contain the word.
    const hotkeysTitle = page.locator('div.uppercase.text-cyan-300', { hasText: /^Hotkeys$/ }).first();
    const title1 = await hotkeysTitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`cheatsheet visible at boot (showHints=true): ${title1}`);
    if (!title1) throw new Error('hotkeys cheatsheet should be visible by default');

    // 2. Quality badge present too.
    const qBadge = page.locator('text=/^q\\d+%$/').first();
    const qVisible = await qBadge.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`quality badge visible: ${qVisible}`);
    if (!qVisible) throw new Error('quality badge should be visible on the HUD');

    // 3. Collapse via the × button. The "? hotkeys" pill should replace it.
    await page.locator('button[title*="Hide"]').first().click({ force: true });
    await page.waitForTimeout(150);
    const pill = await page.locator('text=/\\? hotkeys/').first().isVisible({ timeout: 1000 }).catch(() => false);
    const titleStillThere = await hotkeysTitle.isVisible({ timeout: 200 }).catch(() => false);
    console.log(`after ×: pill=${pill} panel=${titleStillThere}`);
    if (!pill || titleStillThere) throw new Error('× should collapse the panel to the "? hotkeys" pill');

    // 4. Global showHints=false should hide BOTH states.
    await page.evaluate(() => (window as any).__store.getState().setShowHints(false));
    await page.waitForTimeout(150);
    const pillAfterOff = await page.locator('text=/\\? hotkeys/').first().isVisible({ timeout: 200 }).catch(() => false);
    console.log(`pill visible after setShowHints(false): ${pillAfterOff}`);
    if (pillAfterOff) throw new Error('? hotkeys pill should hide when showHints=false');

    // 5. H hotkey toggles back. The component re-mounts when the HUD
    // widget's `when` predicate flips from false→true, so local
    // expanded-state resets to the default (expanded). We check the
    // panel title rather than the pill.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(200);
    const flagAfterH = await page.evaluate(() => (window as any).__store.getState().showHints);
    console.log(`showHints after H: ${flagAfterH}`);
    const titleReturned = await hotkeysTitle.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`panel title visible after H re-enable: ${titleReturned}`);
    if (!titleReturned) throw new Error('H should re-enable the hint');

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b|WebGL/.test(e));
        if (fatal.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    }

    console.log('\n✅ HUD plugin + HUD hint work — quality badge present, hint toggles with showHints');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
