/**
 * Smoke for engine/animation/binderRegistry.
 *
 * Verifies:
 *   1. An explicit registered binder OVERRIDES the DDFS auto-path — the
 *      custom writer fires AND the store does not receive the auto write.
 *   2. The unregister function cleanly tears down so the auto-path
 *      is restored on the same track id.
 *   3. Registering AFTER the DDFS auto-path has already run still wins.
 *      That is `AnimationEngine.getBinder`'s @invariant: the registry is
 *      consulted BEFORE the per-id `this.binders` cache, so a binder
 *      registered late is not shadowed by a cached DDFS-derived writer.
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

            // 3. LATE registration. The DDFS auto-path has now run for
            //    julia.power, so AnimationEngine has cached a DDFS-derived
            //    writer under that id. Registering now must still win.
            let lateWrites = 0;
            let lateValue = null;
            const unregisterLate = binders.register({
                id: 'julia.power',
                write: (v) => { lateWrites++; lateValue = v; },
            });
            // Scrub a DIFFERENT frame so an auto write would be visible:
            // keys are (0 → 42), (10 → 7) Linear, so frame 2 → 35.
            window.__animEngine.scrub(2);
            const storePowerAfterLate = store.getState().julia.power;
            unregisterLate();

            return {
                customWrites, customWritesBefore,
                lastCustomValue,
                storePowerAfterCustom, storePowerAfterAuto,
                lateWrites, lateValue, storePowerAfterLate,
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
    // OVERRIDE, not merely "also ran": the store must NOT have received the
    // interpolated value while the custom binder owned the track. Without
    // this the smoke passes even if both paths fire.
    if (r.storePowerAfterCustom === r.storePowerAfterAuto) {
        throw new Error(
            `registered binder did not suppress the DDFS store write ` +
            `(store was ${r.storePowerAfterCustom} during custom scrub and ` +
            `${r.storePowerAfterAuto} after auto scrub — expected them to differ)`,
        );
    }
    // Both paths were fed the same interpolated value; only the destination
    // differed. Pins the override to "same input, different sink".
    if (Math.abs(r.storePowerAfterAuto - r.lastCustomValue) > 1e-9) {
        throw new Error(
            `auto-path value ${r.storePowerAfterAuto} != custom-path value ${r.lastCustomValue}`,
        );
    }

    // 3. Late registration beats the per-id binder cache.
    if (r.lateWrites < 1) {
        throw new Error(
            `binder registered AFTER the DDFS auto-path never fired (lateWrites=${r.lateWrites}) — ` +
            `AnimationEngine.getBinder is consulting its per-id cache before binderRegistry.lookup`,
        );
    }
    if (Math.abs(r.lateValue - 35) > 1e-6) {
        throw new Error(`late binder got ${r.lateValue}, expected 35 (frame 2 of 0→42, 10→7 linear)`);
    }
    if (r.storePowerAfterLate !== r.storePowerAfterAuto) {
        throw new Error(
            `late-registered binder did not suppress the cached DDFS writer ` +
            `(store moved ${r.storePowerAfterAuto} → ${r.storePowerAfterLate})`,
        );
    }

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ binderRegistry: explicit register wins over DDFS auto-path (store stayed ${r.storePowerAfterCustom}, auto wrote ${r.storePowerAfterAuto}); unregister restores it; late registration beats the per-id cache`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
