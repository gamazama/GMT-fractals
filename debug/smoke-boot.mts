/**
 * Smoke test: boot the engine app in a headless browser and report
 * any page errors or console errors in the first ~8 seconds of load.
 * Run with:  npx tsx debug/smoke-boot.mts
 *
 * The context is seeded as a RETURNING visitor (`debug/geSmokeBoot.mts`). A fresh profile
 * is a first-run user, and GE v2 opens a brightness dialogue over such a boot — harmless
 * for the error check, but the text this smoke dumps would be the dialogue's rather than
 * the app's, which makes the dump useless for reading what booted. Seeding is inert for
 * every app that has no first-run surface.
 */
import { chromium } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    await seedGeSmokeState(ctx);
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

    // The root AppErrorBoundary (engine/components/AppErrorBoundary.tsx) catches
    // render throws so they are no longer pageerrors; it publishes the caught
    // error here so this smoke still goes red on them.
    const boundaryError = await page.evaluate(() => {
        const e = (window as { __lastBoundaryError?: unknown }).__lastBoundaryError;
        if (e == null) return null;
        return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    });
    if (boundaryError) errors.push(`boundary caught: ${boundaryError}`);

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
