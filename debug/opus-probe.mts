/** Probe: load render-harness.html, dump all console + page errors + readiness. */
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/render-harness.html';

async function main() {
    const browser = await chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--ignore-gpu-blocklist', '--enable-webgl'],
    });
    const page = await browser.newContext({ viewport: { width: 700, height: 760 } }).then(c => c.newPage());
    page.on('console', m => console.log(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', e => console.log(`[PAGEERROR] ${e.message}\n${e.stack ?? ''}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait up to 12s for harnessReady, but report whatever happens.
    let ready = false;
    try {
        await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 12000 });
        ready = true;
    } catch {}
    const status = await page.evaluate(() => {
        const el = document.getElementById('status');
        return { harnessReady: (window as any).harnessReady === true, statusText: el?.textContent ?? '(none)' };
    });
    console.log('RESULT: ' + JSON.stringify({ ready, ...status }));
    await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
