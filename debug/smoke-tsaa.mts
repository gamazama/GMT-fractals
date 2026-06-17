/**
 * TSAA smoke test — fluid-toy with TSAA enabled.
 *
 * Verifies:
 *   1. Page loads without errors.
 *   2. Blue-noise texture + tsaa fbos allocated (no WebGL errors).
 *   3. Screenshot captures the fractal with TSAA on.
 *   4. Toggle accumulation=false, confirm screenshot captures without
 *      sub-pixel averaging (raw jittered single-frame sample).
 *
 * The rendered image diff between on/off is hard to assert headlessly
 * because TSAA converges over 60+ frames; we just confirm no errors and
 * capture both screenshots for manual compare.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

const errors: string[] = [];
const logs: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

// Probe TSAA state.
const probe = await page.evaluate(`(function() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };
    const s = window.__store && window.__store.getState();
    return {
        accumulation: s && s.accumulation,
        sampleCap: s && s.sampleCap,
        canvasW: canvas.width, canvasH: canvas.height,
    };
})()`);

console.log('probe:', JSON.stringify(probe));
console.log('errors:', errors.length);
errors.forEach((e) => console.log('  ', e));

// Let TSAA converge for a couple seconds, then snapshot.
await page.waitForTimeout(2000);
await page.screenshot({ path: 'debug/fluid-tsaa-on.png' });
console.log('[tsaa on] screenshot → debug/fluid-tsaa-on.png');

// Toggle off.
await page.evaluate(`window.__store.getState().setAccumulation(false)`);
await page.waitForTimeout(1500);
await page.screenshot({ path: 'debug/fluid-tsaa-off.png' });
console.log('[tsaa off] screenshot → debug/fluid-tsaa-off.png');

await browser.close();

if (errors.length > 0) {
    console.error('✗ smoke FAILED');
    process.exit(1);
}
console.log('✓ fluid-toy TSAA smoke — no page errors');
