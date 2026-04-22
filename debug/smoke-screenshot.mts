/**
 * Capture a PNG of the engine's initial view for visual confirmation.
 * Usage:  npx tsx debug/smoke-screenshot.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';
const OUT = 'debug/scratch/engine-boot.png';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Let the loading fade finish and the engine shell mount.
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT, fullPage: false });
    console.log(`wrote ${OUT}`);
    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
