/**
 * Smoke test for Fixed-mode viewport + mode toggle via ViewportFrame.
 *
 * Opens fractal-toy, flips to Fixed mode, sets a specific resolution,
 * screenshots the result so we can visually confirm the letterbox layout.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fractal-toy.html';
const OUT = 'debug/scratch/fractal-toy-2f-fixed.png';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Flip to Fixed mode at a 16:9 aspect ratio.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setResolutionMode('Fixed');
        s.setFixedResolution(960, 540);
    });
    await page.waitForTimeout(400);

    const mode = await page.evaluate(() => (window as any).__store.getState().resolutionMode);
    const res  = await page.evaluate(() => (window as any).__store.getState().fixedResolution);
    console.log('mode:', mode, 'fixedResolution:', res);
    if (mode !== 'Fixed' || res[0] !== 960 || res[1] !== 540) {
        throw new Error('Fixed mode setup did not land');
    }

    await page.screenshot({ path: OUT, fullPage: false });
    console.log(`wrote ${OUT}`);

    if (errors.length > 0) {
        throw new Error('pageerrors: ' + errors.join('\n  '));
    }
    console.log('\n✓ Fixed mode toggle + resolution applied; letterbox visible in screenshot');
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
