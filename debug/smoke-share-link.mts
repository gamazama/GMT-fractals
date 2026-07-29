/**
 * Smoke test: share-link roundtrip.
 *
 * Exercises the full share path end to end:
 *   getShareString (store/engineStore.ts → utils/Sharing.ts → UrlStateEncoder)
 *   → the `#s=` boot hydrate in app-gmt/main.tsx → loadScene → first render.
 *
 * Guards the regression where OPENING a share link threw
 *   "Cannot read properties of undefined (reading 'coreMath.paramC')"
 * The share payload carries no `liveModulations`, so the freshly-hydrated
 * store left that field undefined; the coreMath param panel
 * (AutoFeaturePanel) read the RAW store field and indexed it
 * (`liveModulations[trackId]`) on first render → crash. Fixed by routing the
 * panel through the safe `useLiveModulations()` accessor, which returns the
 * frozen EMPTY_LIVE_MODS singleton when the field is missing.
 *
 * (The omission is NOT the UrlStateEncoder skip-list, as this header said
 * until 2026-07-29. `getPreset` never copies `liveModulations` into a Preset
 * in the first place — it builds from a fixed literal + presetFieldRegistry +
 * features — so that skip-list entry is unreachable on this path.)
 *
 * ── FALSIFIED 2026-07-29 (guard sweep, batch 3) ──────────────────────────
 * Three breaks, three mechanisms, each applied and reverted independently:
 *   A. utils/UrlStateEncoder.ts — added `key === 'coloring'` to getDiff's
 *      skip-list, i.e. a whole feature slice absent from the payload (the
 *      exact failure mode the `coloring.repeats` assertion was added for).
 *      → exit 1, payload 2895 → 2668, "coloring.repeats round-tripped 3.7
 *        (got 1)". Non-degenerate: authored 3.7 vs default 1.
 *   B. utils/UrlStateEncoder.ts — quantize `toFixed(5)` → `toFixed(1)`.
 *      → exit 1, 2 failures: paramA got 0.4, roughness got 0.8.
 *   C. app-gmt/main.tsx — gated out the `#s=` branch of resolveBootPreset,
 *      i.e. the recipient never hydrates from the hash at all.
 *      → exit 1, 3 failures: paramA got 8, roughness got 0.75, repeats got 2.
 *        Those are the Mandelbulb template's OWN defaults, which also proves
 *        the recipient page is genuinely fresh — no author-page leakage.
 * Count-based (not throw-based), so every assertion runs on every invocation.
 *
 * SETTLES the OPEN ANOMALY recorded in cycle 8
 * (plans/overnight-audit/results/g08-save-load-gmf.json): that falsification
 * added `key === 'repeats'` to the same skip-list and this smoke stayed green
 * with a byte-identical payload. The guard was never at fault — the break was
 * a no-op. getDiff stops recursing at the feature-id level because the base
 * template's `features` is `{}`, so a param name in that skip-list is never
 * visited. Full mechanism in the JSDoc on UrlStateEncoder.getDiff.
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
//
// Three DIFFERENT features on purpose. The share payload is keyed by
// per-feature/per-param `shortId`s (see UrlStateEncoder + FeatureSystem):
// a feature whose slice never reaches the recipient fails silently — the
// scene just renders with defaults, no error, no console warning. Asserting
// only one feature would leave that whole failure mode uncovered, so each
// added feature here widens the net. `coloring.repeats` is also a NON-default
// float on a hidden param, i.e. a value that only survives if the encoder
// walks the full param table rather than the visible UI surface.
const AUTHORED = { paramA: 0.37, roughness: 0.81, repeats: 3.7 };

// Truthy once the store is instantiated AND fully hydrated by boot.
const STORE_READY = `(function(){
    var s = window.__store && window.__store.getState && window.__store.getState();
    return !!(s && s.coreMath && s.materials && s.coloring && s.formula
        && typeof s.getShareString === 'function'
        && typeof s.setCoreMath === 'function'
        && typeof s.setMaterials === 'function'
        && typeof s.setColoring === 'function');
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
        s.setColoring({ repeats: ${AUTHORED.repeats} });
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
        return { formula: s.formula, paramA: s.coreMath.paramA, roughness: s.materials.roughness,
                 repeats: s.coloring.repeats };
    })()`) as any;
    ok(restored.formula === 'Mandelbulb', `formula round-tripped (got ${restored.formula})`);
    ok(near(restored.paramA, AUTHORED.paramA), `coreMath.paramA round-tripped ${AUTHORED.paramA} (got ${restored.paramA})`);
    ok(near(restored.roughness, AUTHORED.roughness), `materials.roughness round-tripped ${AUTHORED.roughness} (got ${restored.roughness})`);
    ok(near(restored.repeats, AUTHORED.repeats), `coloring.repeats round-tripped ${AUTHORED.repeats} (got ${restored.repeats})`);

    await browser.close();

    if (failures.length) {
        console.error(`\n✗ smoke:share-link FAILED — ${failures.length} assertion(s):\n  - ${failures.join('\n  - ')}`);
        process.exit(1);
    }
    console.log('\n✓ smoke:share-link PASSED — encode → #s= open → render is clean and round-trips.');
}

main().catch((e) => { console.error(e); process.exit(1); });
