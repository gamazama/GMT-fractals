/**
 * Smoke test: boot the engine app in a headless browser and report
 * any page errors or console errors in the first ~8 seconds of load.
 * Run with:  npx tsx debug/smoke-boot.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const errors: string[] = [];
    const consoleErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on('pageerror', (err) => {
        errors.push(`pageerror: ${err.message}`);
    });

    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    page.on('requestfailed', (req) => {
        const failure = req.failure();
        requestFailures.push(`${req.method()} ${req.url()} — ${failure?.errorText ?? 'unknown'}`);
    });

    console.log(`→ GET ${URL}`);
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });

    console.log(`← HTTP ${response?.status()}`);

    // Give the app an extra second to hit any deferred runtime errors.
    await page.waitForTimeout(2000);

    const title = await page.title().catch(() => '<no title>');
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));

    console.log(`\ntitle: ${title}`);
    console.log(`body preview:\n${bodyText}\n`);

    console.log(`── Errors ─────────────────────────`);
    if (errors.length === 0 && consoleErrors.length === 0 && requestFailures.length === 0) {
        console.log('(none)');
    } else {
        errors.forEach((e) => console.log(e));
        consoleErrors.forEach((e) => console.log(e));
        requestFailures.forEach((e) => console.log(e));
    }

    await browser.close();

    const ok = errors.length === 0 && consoleErrors.length === 0;
    process.exit(ok ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(2);
});
