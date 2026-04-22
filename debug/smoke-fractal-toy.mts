/**
 * Smoke test for fractal-toy — the second live add-on consumer of the
 * engine's DDFS + preset flow.
 *
 * Verifies:
 *   1. All three fractal-toy feature slices land on the store
 *      (mandelbulb, camera, lighting)
 *   2. Each feature's auto-generated setter mutates its slice
 *   3. getPreset roundtrips the mutated state — every feature is
 *      included under features[id]
 *   4. loadPreset restores all three slices back to the captured
 *      state after a second mutation (true save → mutate → load test)
 *
 * Run with:  ENGINE_URL=http://localhost:3400/fractal-toy.html npm run smoke:fractal-toy
 * Default URL is the main engine (for CI convenience); set
 * ENGINE_URL to target fractal-toy explicitly.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fractal-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    // Fail loud on console errors or pageerrors.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. All three feature slices exist
    const slices = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            mandelbulb: s?.mandelbulb,
            camera: s?.camera,
            lighting: s?.lighting,
        };
    });
    console.log('initial slices:', JSON.stringify(slices, null, 2).slice(0, 400), '...');
    if (!slices.mandelbulb || typeof slices.mandelbulb.power !== 'number') throw new Error('mandelbulb slice missing');
    if (!slices.camera || typeof slices.camera.distance !== 'number') throw new Error('camera slice missing');
    if (!slices.lighting || typeof slices.lighting.intensity !== 'number') throw new Error('lighting slice missing');

    // 2. Mutate each slice via its auto-generated setter
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s.setMandelbulb({ power: 5.5, iterations: 22, twist: 0.3 });
        s.setCamera({ orbitTheta: 1.2, distance: 4.0, fov: 45 });
        s.setLighting({ intensity: 2.0, ambient: 0.3, aoAmount: 0.8 });
    });
    await page.waitForTimeout(150);

    const afterMutate = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            mb_power: s.mandelbulb.power,
            mb_iter:  s.mandelbulb.iterations,
            cam_theta: s.camera.orbitTheta,
            cam_dist:  s.camera.distance,
            light_i:   s.lighting.intensity,
            light_amb: s.lighting.ambient,
        };
    });
    console.log('after mutate:', JSON.stringify(afterMutate));
    if (afterMutate.mb_power !== 5.5) throw new Error('setMandelbulb did not mutate power');
    if (afterMutate.cam_dist !== 4.0) throw new Error('setCamera did not mutate distance');
    if (afterMutate.light_amb !== 0.3) throw new Error('setLighting did not mutate ambient');

    // 3. getPreset includes every feature
    const presetJson = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return JSON.stringify(s.getPreset({ includeScene: true }));
    });
    const preset = JSON.parse(presetJson);
    console.log('preset feature ids:', Object.keys(preset.features || {}).join(', '));
    if (!preset.features?.mandelbulb || preset.features.mandelbulb.power !== 5.5) {
        throw new Error('preset missing mutated mandelbulb state');
    }
    if (!preset.features?.camera || preset.features.camera.distance !== 4.0) {
        throw new Error('preset missing mutated camera state');
    }
    if (!preset.features?.lighting || preset.features.lighting.intensity !== 2.0) {
        throw new Error('preset missing mutated lighting state');
    }

    // 4. Mutate to different values, then loadPreset with the captured JSON,
    //    then verify state matches the FIRST mutation (proving round-trip).
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s.setMandelbulb({ power: 9.9, iterations: 8, twist: -1.0 });
        s.setCamera({ orbitTheta: -1.5, distance: 1.0, fov: 90 });
        s.setLighting({ intensity: 0.1, ambient: 0.9, aoAmount: 0.0 });
    });
    await page.waitForTimeout(150);

    await page.evaluate((json) => {
        const s = (window as any).__store?.getState?.();
        s.loadPreset(JSON.parse(json));
    }, presetJson);
    await page.waitForTimeout(300);

    const afterLoad = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            mb_power: s.mandelbulb.power,
            mb_iter:  s.mandelbulb.iterations,
            cam_theta: s.camera.orbitTheta,
            cam_dist:  s.camera.distance,
            light_i:   s.lighting.intensity,
            light_amb: s.lighting.ambient,
        };
    });
    console.log('after load:', JSON.stringify(afterLoad));

    const matches =
        afterLoad.mb_power === 5.5 &&
        afterLoad.mb_iter === 22 &&
        afterLoad.cam_theta === 1.2 &&
        afterLoad.cam_dist === 4.0 &&
        afterLoad.light_i === 2.0 &&
        afterLoad.light_amb === 0.3;

    if (!matches) {
        throw new Error('loadPreset did not restore the captured state: got ' + JSON.stringify(afterLoad));
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ 3 feature slices present, auto-setters work, preset includes all three, loadPreset round-trips');
    await browser.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
