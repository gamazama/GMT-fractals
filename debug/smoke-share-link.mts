/**
 * Smoke test: share-link roundtrip.
 *
 * Exercises the full share path end to end:
 *   getShareString (store/engineStore.ts → utils/Sharing.ts → UrlStateEncoder)
 *   → the `#s=` boot hydrate in app-gmt/main.tsx → loadScene → first render.
 *
 * Guards the regression where OPENING a share link threw
 *   "Cannot read properties of undefined (reading 'coreMath.paramC')"
 * The share payload deliberately omits `liveModulations` (UrlStateEncoder
 * skip-list), so the freshly-hydrated store left that field undefined; the
 * coreMath param panel (AutoFeaturePanel) read the RAW store field and
 * indexed it (`liveModulations[trackId]`) on first render → crash. Fixed by
 * routing the panel through the safe `useLiveModulations()` accessor, which
 * returns the frozen EMPTY_LIVE_MODS singleton when the field is missing.
 *
 * Flow:
 *   1. Author page: boot app-gmt, set distinctive coreMath/material values
 *      on the live scene, then encode via the REAL store method.
 *   2. Recipient page: open `${URL}#s=<payload>` in a brand-new page so
 *      main.tsx runs its boot hydrate from scratch, exactly like a user
 *      clicking the link.
 *   3. Assert: the coreMath param panel renders with ZERO page/console
 *      errors, and the authored values survived the roundtrip.
 *
 * Run with a dev server up (npm run dev):  npx tsx debug/smoke-share-link.mts
 *
 * NOTE: page.evaluate / waitForFunction bodies are passed as strings on
 * purpose — tsx/esbuild annotates named inner functions with a `__name`
 * helper that does not exist in the browser eval context.
 */
import { chromium, type Page } from 'playwright';

// Resolve to the app-gmt page. ENGINE_URL may be a bare origin (e.g. when
// launched via debug/runWithServer.mts, which exports http://localhost:<port>)
// or already a full page URL — accept either.
const RAW_URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const URL = RAW_URL.endsWith('.html') ? RAW_URL : `${RAW_URL.replace(/\/$/, '')}/app-gmt.html`;

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
    if (cond) console.log(`  ✓ ${msg}`);
    else { console.log(`  ✗ ${msg}`); failures.push(msg); }
};
const near = (a: number, b: number, eps = 1e-2) => Math.abs(a - b) < eps;

// Distinctive authored values — chosen to differ from the Mandelbulb
// default template so they encode as real diffs in the share payload.
const AUTHORED = { paramA: 0.37, roughness: 0.81 };

// Truthy once the store is instantiated AND fully hydrated by boot.
const STORE_READY = `(function(){
    var s = window.__store && window.__store.getState && window.__store.getState();
    return !!(s && s.coreMath && s.materials && s.formula
        && typeof s.getShareString === 'function'
        && typeof s.setCoreMath === 'function'
        && typeof s.setMaterials === 'function');
})()`;

/**
 * Wait for the store, then evaluate — retrying across vite's first-load
 * "optimized dependencies changed → reloading" full reload, which destroys
 * the execution context (and resets window.__store) mid-evaluate on a cold
 * server / fresh checkout.
 */
async function evalStable(page: Page, body: string): Promise<any> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
        await page.waitForFunction(STORE_READY, { timeout: 20000 });
        try {
            return await page.evaluate(body);
        } catch (e) {
            lastErr = e;
            const msg = String((e as any)?.message ?? e);
            if (/Execution context was destroyed|getState|__store|Cannot read/.test(msg)) {
                await page.waitForTimeout(500); // reload in flight — re-wait + retry
                continue;
            }
            throw e;
        }
    }
    throw lastErr;
}

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });

    // ── 1. AUTHOR: boot, set values, encode via the real store path ──────
    console.log('\n[author] boot app-gmt + encode current scene:');
    const author = await ctx.newPage();
    const authorErrors: string[] = [];
    author.on('pageerror', (e) => authorErrors.push(`pageerror: ${e.message}`));
    author.on('console', (m) => { if (m.type() === 'error') authorErrors.push(`console.error: ${m.text()}`); });

    await author.goto(URL, { waitUntil: 'domcontentloaded' });
    await author.waitForLoadState('networkidle').catch(() => {}); // let vite's optimize+reload settle

    const shareStr = await evalStable(author, `(function(){
        var s = window.__store.getState();
        s.setCoreMath({ paramA: ${AUTHORED.paramA} });
        s.setMaterials({ roughness: ${AUTHORED.roughness} });
        return s.getShareString({ includeAnimations: true });
    })()`) as string;

    ok(typeof shareStr === 'string' && shareStr.length > 0,
        `getShareString returned a non-empty payload (${shareStr ? shareStr.length : 0} chars)`);
    // Encoding errors only — the cold-server reload produces a benign one we
    // retried past, so ignore errors logged before the successful encode.
    if (!shareStr) {
        console.error('\n✗ smoke:share-link FAILED — empty share string, cannot test the open path.');
        if (authorErrors.length) console.log('  author errors:\n    ' + authorErrors.join('\n    '));
        await browser.close();
        process.exit(1);
    }

    // ── 2. RECIPIENT: open the #s= link in a FRESH page ──────────────────
    // A new page = a fresh document, so app-gmt/main.tsx re-runs its boot
    // hydrate against window.location.hash — the exact path a recipient hits.
    // Deps are already optimized by the author load, so no reload here.
    console.log('\n[recipient] open #s= link in a fresh page (no errors during hydrate + first render):');
    const recip = await ctx.newPage();
    const recipErrors: string[] = [];
    recip.on('pageerror', (e) => recipErrors.push(`pageerror: ${e.message}`));
    recip.on('console', (m) => { if (m.type() === 'error') recipErrors.push(`console.error: ${m.text()}`); });

    const shareUrl = `${URL}#s=${shareStr}`;
    await recip.goto(shareUrl, { waitUntil: 'domcontentloaded' });
    await recip.waitForFunction(STORE_READY, { timeout: 20000 });

    // The crash fired while the coreMath param panel rendered. Waiting for a
    // coreMath slider to actually paint forces that panel through render: if
    // it threw, the slider never appears (and the error listeners catch it).
    let panelRendered = true;
    try {
        await recip.locator('[data-help-id*="coreMath.paramA"]').first()
            .waitFor({ state: 'visible', timeout: 12000 });
    } catch {
        panelRendered = false;
    }
    ok(panelRendered, 'coreMath param panel rendered after share-link load (the crash site)');

    // Let any deferred render/effect errors surface.
    await recip.waitForTimeout(800);

    ok(recipErrors.length === 0, `no page/console errors on the share-link open (${recipErrors.length})`);
    if (recipErrors.length) console.log('  recipient errors:\n    ' + recipErrors.join('\n    '));

    // ── 3. ROUNDTRIP FIDELITY: authored values survived encode→decode ────
    console.log('\n[roundtrip] authored values survived the share roundtrip:');
    const restored = await recip.evaluate(`(function(){
        var s = window.__store.getState();
        return { formula: s.formula, paramA: s.coreMath.paramA, roughness: s.materials.roughness };
    })()`) as any;
    ok(restored.formula === 'Mandelbulb', `formula round-tripped (got ${restored.formula})`);
    ok(near(restored.paramA, AUTHORED.paramA), `coreMath.paramA round-tripped ${AUTHORED.paramA} (got ${restored.paramA})`);
    ok(near(restored.roughness, AUTHORED.roughness), `materials.roughness round-tripped ${AUTHORED.roughness} (got ${restored.roughness})`);

    await browser.close();

    if (failures.length) {
        console.error(`\n✗ smoke:share-link FAILED — ${failures.length} assertion(s):\n  - ${failures.join('\n  - ')}`);
        process.exit(1);
    }
    console.log('\n✓ smoke:share-link PASSED — encode → #s= open → render is clean and round-trips.');
}

main().catch((e) => { console.error(e); process.exit(1); });
