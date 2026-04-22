/**
 * Watches the engine page for 12 seconds and reports ANY navigation,
 * request of the root, or suspicious console messages — to pin down
 * the "page resets every few seconds" regression.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const events: string[] = [];

page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) events.push(`[${Date.now()}] navigated → ${f.url()}`);
});
page.on('load', () => events.push(`[${Date.now()}] LOAD event`));
page.on('domcontentloaded', () => events.push(`[${Date.now()}] DOMContentLoaded`));
page.on('pageerror', (e) => events.push(`[${Date.now()}] pageerror: ${e.message}`));
page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') {
        const text = m.text();
        // Strip noisy lines we know about
        if (text.includes('WebSocket connection')) return;
        if (text.includes('426 (Upgrade Required)')) return;
        events.push(`[${Date.now()}] console.${t}: ${text.slice(0, 180)}`);
    }
});

page.on('request', (r) => {
    const u = r.url();
    // Only flag top-level navigations to the page
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) {
        events.push(`[${Date.now()}] navigation request: ${r.method()} ${u}`);
    }
});

console.log(`→ opening ${URL}, watching for 12s…`);
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);

console.log(`\n── Event log (${events.length} events) ──`);
for (const e of events) console.log(e);
await browser.close();
