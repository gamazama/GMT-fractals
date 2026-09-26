/**
 * smoke-pwa-update — the Update pill appears when a new deploy takes over an open page, and only
 * then (engine/plugins/PwaUpdate.tsx; the update model is in vite.config.ts).
 *
 * The service worker is off on the dev server, so this BUILDS the app (into
 * debug/scratch/pwa-smoke/a), serves it from a tiny local server, and plays a deploy by switching
 * the server to a copy whose sw.js differs by one line (…/b) — a byte-different worker is exactly
 * what a real deploy looks like to the browser.
 *
 *   [1] FIRST VISIT: the worker installs and claims the page (a `controllerchange` with no
 *       controller before it) — no pill.
 *   [2] RETURNING VISIT on the same build: controlled from the start, nothing new — no pill.
 *   [3] A DEPLOY: the server switches to the new worker, the page checks for an update, the new
 *       worker takes over — the pill appears, and the page did NOT reload by itself.
 *   [4] CLICK: the page reloads onto the new version and the pill is gone.
 *
 * Needs no dev server. `PWA_SMOKE_REUSE=1` skips the build when debug/scratch/pwa-smoke/a exists.
 * Boots `demo.html` (the engine demo — it mounts the same pill as app-gmt, fluid-toy and
 * fractal-toy, and boots fast).
 *
 * FALSIFIED 2026-09-26, each break rebuilt and reverted:
 *   F1 the `hadControllerAtLoad` check removed → [1] red (the first visit's claim lit the pill);
 *   F2 `watchForTakeover()` not called from installPwaUpdate → [3] red (no pill after the deploy).
 *
 * Run: `npm run smoke:pwa-update`
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, existsSync, readFileSync, appendFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'debug/scratch/pwa-smoke');
const A = join(OUT, 'a');
const B = join(OUT, 'b');
const PORT = Number(process.env.PWA_SMOKE_PORT || 3477);
const PAGE = `http://localhost:${PORT}/demo.html`;

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// ── build + the "next deploy" copy ─────────────────────────────────────────────────────────────
if (!(process.env.PWA_SMOKE_REUSE && existsSync(join(A, 'sw.js')))) {
    console.log('building into debug/scratch/pwa-smoke/a …');
    execSync(`npx vite build --outDir "${A}" --emptyOutDir`, { cwd: ROOT, stdio: 'ignore' });
}
rmSync(B, { recursive: true, force: true });
cpSync(A, B, { recursive: true });
appendFileSync(join(B, 'sw.js'), '\n// smoke:pwa-update — the next deploy\n');

// ── a static server whose root can be switched ─────────────────────────────────────────────────
const TYPES: Record<string, string> = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
    '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.frag': 'text/plain', '.gmf': 'text/plain',
};
let root = A;
const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(file));
});
await new Promise<void>((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    let loads = 0;
    page.on('load', () => { loads++; });
    const pill = () => page.locator('[data-pwa-update]');
    const controlled = () => page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 30_000 });

    // [1] first visit
    await page.goto(PAGE, { waitUntil: 'load' });
    await controlled();
    await page.waitForTimeout(1500);
    check('[1] first visit: the worker claimed the page and no pill showed', (await pill().count()) === 0);

    // [2] returning visit, same build
    await page.reload({ waitUntil: 'load' });
    await controlled();
    await page.waitForTimeout(1500);
    check('[2] returning visit on the same build: no pill', (await pill().count()) === 0);

    // [3] a deploy
    root = B;
    const loadsBefore = loads;
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg?.update(); });
    const appeared = await pill().first().waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false);
    check('[3] a deploy took over the open page: the Update pill appeared', appeared);
    check('[3] …and the page did not reload by itself', loads === loadsBefore, `loads ${loadsBefore} → ${loads}`);

    // [4] click
    if (appeared) {
        await Promise.all([page.waitForEvent('load', { timeout: 30_000 }), pill().first().click()]);
        await controlled();
        await page.waitForTimeout(1500);
        check('[4] the click reloaded onto the new version and the pill is gone', (await pill().count()) === 0);
    } else {
        check('[4] the click reloaded onto the new version and the pill is gone', false, 'no pill to click');
    }
} finally {
    await browser.close();
    server.close();
}

console.log(failures ? `\nsmoke:pwa-update: ${failures} failure(s)` : '\nsmoke:pwa-update green');
process.exit(failures ? 1 : 0);
