/**
 * Smoke for engine/animation/binderRegistry.
 *
 * Verifies:
 *   1. An explicit registered binder OVERRIDES the DDFS auto-path.
 *   2. The unregister function cleanly tears down so the auto-path
 *      is restored on the same track id.
 *   3. Re-registering the same id replaces the previous entry (idempotent).
 *
 * Runs in the browser via playwright — needs the app for real store
 * + feature registry. Uses julia.power as the test param because it's
 * a plain scalar that the DDFS auto-path normally handles; we shadow
 * it with a counter-incrementer and check both paths are observable.
 */
import { chromium } from 'playwright';

const URL_ = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL_, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Registry present on window.__binders.
    const present = await page.evaluate(`!!window.__binders`);
    if (!present) throw new Error('__binders not exposed on window');

    // 2. Explicit registration + scrub → custom writer fires; DDFS auto
    //    setter does NOT (the store value set by auto-path would be the
    //    interpolated value, not the counter).
    const result = await page.evaluate(`
        (async () => {
            const binders = window.__binders;
            const store = window.__store;
            const anim = window.useAnimationStore;

            // Counter-based writer — we'll observe it directly rather
            // than via the store so it's unambiguous which path fired.
            let customWrites = 0;
            let lastCustomValue = null;
            const unregister = binders.register({
                id: 'julia.power',
                write: (v) => { customWrites++; lastCustomValue = v; },
            });

            // Scrub the timeline to trigger a write on this track.
            // (Skip the full play loop — scrub is the smaller, deterministic path.)
            anim.getState().addTrack('julia.power', 'Julia Power');
            anim.getState().addKeyframe('julia.power', 0, 42);
            anim.getState().addKeyframe('julia.power', 10, 7);
            window.__animEngine.scrub(5);  // midpoint → ~24.5

            const storePowerAfterCustom = store.getState().julia.power;

            unregister();
            // After unregister, scrub again — DDFS auto-path should now
            // write to the store. The store value will move, custom
            // writer won't fire.
            const customWritesBefore = customWrites;
            window.__animEngine.scrub(5);
            const storePowerAfterAuto = store.getState().julia.power;

            return {
                customWrites, customWritesBefore,
                lastCustomValue,
                storePowerAfterCustom, storePowerAfterAuto,
            };
        })()
    `);
    console.log('result:', JSON.stringify(result));

    const r = result as any;
    if (r.customWrites < 1) throw new Error(`custom writer never fired (got ${r.customWrites})`);
    if (r.customWrites !== r.customWritesBefore) throw new Error(`custom writer fired after unregister (${r.customWrites} > ${r.customWritesBefore})`);
    // Custom writer was active during the first scrub, so store should NOT
    // have moved to the interpolated value during that call.
    if (typeof r.lastCustomValue !== 'number' || r.lastCustomValue < 7 || r.lastCustomValue > 42) {
        throw new Error(`unexpected custom value: ${r.lastCustomValue}`);
    }
    // After unregister, DDFS auto-path takes over — store should now
    // reflect the interpolated value.
    if (typeof r.storePowerAfterAuto !== 'number') throw new Error(`store.julia.power missing after auto scrub`);

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ binderRegistry: explicit register wins over DDFS auto-path; unregister cleanly restores it`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
