/**
 * Smoke test: gallery share-link / deep-link path.
 *
 * Covers the whole "open a shared gallery scene" flow, end to end:
 *   ?gallery=<slug>  (app-gmt/main.tsx boot deep-link parse)
 *     → galleryStore.openGalleryAtSlug → GalleryPage deep-link effect
 *     → GalleryClient.getGalleryItem(slug)  (Supabase REST — MOCKED here)
 *     → Lightbox opens on the item
 *     → "▶ Open & Remix" → GalleryPage.handleLoadScene
 *     → loadGalleryScene → loadGMFScene → engineStore.loadScene
 *
 * The remix load shares loadScene with the editor share-link path, so it
 * benefits from the same `sequence.tracks` normalization fix — this guards
 * the gallery half of "open a shared scene without crashing".
 *
 * Network is mocked via Playwright route interception so the test is
 * deterministic and offline: the single-item fetch returns a canned row
 * whose `gmf_data` is a real built-in GMF (public/scenes/…mandelbulb.gmf),
 * and the browse list returns empty. No live Supabase / R2 dependency.
 *
 * Run with a dev server up (npm run dev):  npx tsx debug/smoke-gallery-link.mts
 * Requires the dev build to have VITE_SUPABASE_* set (.env.local) so the
 * gallery is enabled; otherwise getGalleryItem throws before the mock.
 *
 * NOTE: page.evaluate / waitForFunction bodies are strings on purpose —
 * tsx/esbuild adds a `__name` helper to named inner functions that the
 * browser eval context doesn't have.
 */
import { chromium, type Route } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const RAW_URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const URL = RAW_URL.endsWith('.html') ? RAW_URL : `${RAW_URL.replace(/\/$/, '')}/app-gmt.html`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const GMF_PATH = resolve(__dirname, '../public/scenes/metallic area light mandelbulb.gmf');

const SLUG = 'smoke-test-scene';
// 1×1 transparent PNG — keeps the lightbox <img> off the network.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
    if (cond) console.log(`  ✓ ${msg}`);
    else { console.log(`  ✗ ${msg}`); failures.push(msg); }
};

const STORE_READY = `(function(){
    var s = window.__store && window.__store.getState && window.__store.getState();
    return !!(s && s.coreMath && s.formula);
})()`;

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
};

async function main() {
    const gmf = readFileSync(GMF_PATH, 'utf8');
    const formulaMatch = gmf.match(/"formula"\s*:\s*"([^"]+)"/);
    const expectedFormula = formulaMatch ? formulaMatch[1] : 'Mandelbulb';

    const item = {
        id: 'smoke-gallery-1', slug: SLUG, title: 'Smoke Test Scene',
        description: 'Injected by smoke-gallery-link', formula: expectedFormula,
        image_url: PIXEL, thumbnail_url: PIXEL, width: 1, height: 1, tags: [],
        featured: false, created_at: '2026-06-01T00:00:00.000Z',
        author: 'smoke', username: 'smoke', image_format: 'png',
        sky_url: null, user_id: null, visibility: 'public', status: 'approved',
        gmf_data: gmf,
    };

    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    // ── Mock the Supabase gallery_items REST endpoint ────────────────────
    let singleFetchSeen = false;
    await page.route('**/rest/v1/gallery_items*', async (route: Route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: CORS, body: '' });
            return;
        }
        const url = req.url();
        const accept = (req.headers()['accept'] || '');
        const headers = { ...CORS, 'content-type': 'application/json' };

        // getGalleryItem(slug): select=*&slug=eq.<slug>&status=eq.approved.
        // Return the canned row. maybeSingle() may request a single object
        // (vnd.pgrst.object+json) or a list depending on postgrest-js — match
        // the shape to the Accept header so either path parses gmf_data.
        if (url.includes('slug=eq.')) {
            singleFetchSeen = true;
            const body = accept.includes('vnd.pgrst.object')
                ? JSON.stringify(item)
                : JSON.stringify([item]);
            await route.fulfill({ status: 200, headers, body });
            return;
        }
        // listGallery (browse grid): no slug filter — return empty.
        await route.fulfill({ status: 200, headers, body: '[]' });
    });

    // ── 1. DEEP-LINK: open ?gallery=<slug> in a fresh page ───────────────
    console.log('\n[deep-link] open ?gallery=<slug> → lightbox on the shared item:');
    await page.goto(`${URL}?gallery=${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForFunction(STORE_READY, { timeout: 20000 });

    let lightboxShown = true;
    try {
        await page.locator('button:has-text("Open & Remix")').first()
            .waitFor({ state: 'visible', timeout: 15000 });
    } catch {
        lightboxShown = false;
    }
    ok(singleFetchSeen, 'deep-link triggered the single-item fetch (getGalleryItem)');
    ok(lightboxShown, 'lightbox opened on the shared item (Open & Remix visible)');
    ok(await page.getByText('Smoke Test Scene').first().isVisible().catch(() => false),
        'lightbox shows the shared item title');

    if (!lightboxShown) {
        const err = await page.locator('.text-red-300').first().textContent().catch(() => null);
        if (err) console.log(`  lightbox load error: ${err.trim()}`);
    }

    // ── 2. REMIX: click "Open & Remix" → scene loads, overlay closes ─────
    console.log('\n[remix] Open & Remix loads the scene (loadGalleryScene → loadScene):');
    if (lightboxShown) {
        await page.locator('button:has-text("Open & Remix")').first().click();

        // Success path closes both lightbox and gallery overlay.
        let overlayClosed = true;
        try {
            await page.locator('button:has-text("Open & Remix")')
                .waitFor({ state: 'detached', timeout: 15000 });
        } catch {
            overlayClosed = false;
        }
        ok(overlayClosed, 'gallery overlay closed after a successful remix-load');
        if (!overlayClosed) {
            const err = await page.locator('.text-red-300').first().textContent().catch(() => null);
            if (err) { console.log(`  remix load error: ${err.trim()}`); failures.push(`remix load error: ${err.trim()}`); }
        }
    }

    await page.waitForTimeout(800); // let any deferred render/effect errors surface

    // ── 3. The remixed scene is live in the store ────────────────────────
    console.log('\n[loaded] the shared scene is live in the editor:');
    const loaded = await page.evaluate(`(function(){
        var s = window.__store.getState();
        return { formula: s.formula, hasCoreMath: !!s.coreMath, iterations: s.coreMath && s.coreMath.iterations };
    })()`) as any;
    ok(loaded.formula === expectedFormula, `formula loaded from the GMF (${expectedFormula}, got ${loaded.formula})`);
    ok(loaded.hasCoreMath && typeof loaded.iterations === 'number', `coreMath hydrated (iterations=${loaded.iterations})`);

    ok(errors.length === 0, `no page/console errors across the gallery flow (${errors.length})`);
    if (errors.length) console.log('  errors:\n    ' + errors.join('\n    '));

    await browser.close();

    if (failures.length) {
        console.error(`\n✗ smoke:gallery-link FAILED — ${failures.length} assertion(s):\n  - ${failures.join('\n  - ')}`);
        process.exit(1);
    }
    console.log('\n✓ smoke:gallery-link PASSED — ?gallery= deep-link → lightbox → remix-load is clean.');
}

main().catch((e) => { console.error(e); process.exit(1); });
