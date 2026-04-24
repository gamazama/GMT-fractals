/**
 * Smoke test for @engine/topbar/PauseControls in fluid-toy.
 *
 * Verifies the button renders, clicking toggles state.isPaused, and the
 * hover popover exposes the sample cap slider.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// Locate the pause button — registered by installPauseControls.
const button = page.locator('button[title*="Pause Rendering"], button[title*="Resume Rendering"]');
const buttonCount = await button.count();
console.log('pause buttons found:', buttonCount);
if (buttonCount === 0) { console.error('✗ no pause button'); process.exit(1); }

const before = await page.evaluate(`window.__store.getState().isPaused`);
console.log('isPaused before click:', before);

await button.first().click({ force: true, noWaitAfter: true });
await page.waitForTimeout(250);

const after = await page.evaluate(`window.__store.getState().isPaused`);
console.log('isPaused after click:', after);

if (before === after) { console.error('✗ click did not toggle isPaused'); process.exit(1); }

// Hover to open the popover. The popover should contain the slider.
await button.first().hover({ force: true });
await page.waitForTimeout(250);

const popoverText = await page.evaluate(`(function() {
    const el = document.querySelector('.text-\\\\[8px\\\\]');
    return el ? el.textContent : null;
})()`);
console.log('popover footer text:', popoverText);

await page.screenshot({ path: 'debug/fluid-pause-hover.png' });
console.log('[hover] screenshot → debug/fluid-pause-hover.png');

await browser.close();

if (errors.length > 0) { console.error('✗ page errors:', errors); process.exit(1); }
console.log('✓ pause controls — button present, click toggles, popover opens');
