/**
 * Smoke test for fluid-toy's DDFS + preset round-trip.
 *
 * Mirrors smoke:fractal-toy — mutates every feature slice, captures the
 * preset, mutates again to distinguish, loads the captured preset, and
 * verifies state matches the first-mutation snapshot. Proves all
 * fluid-toy features (julia, coupling, dye, fluidSim) survive a full
 * save→mutate→load cycle via SceneFormat + the store's preset round-trip.
 *
 * SceneCameraFeature + OrbitFeature were retired during the tab-parity
 * restructure — zoom/center merged onto julia, orbit enabled/radius/
 * speed merged onto coupling.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Confirm all feature slices exist
    const slices = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            julia: !!s?.julia,
            coupling: !!s?.coupling,
            palette: !!s?.palette,
            fluidSim: !!s?.fluidSim,
        };
    });
    console.log('slices present:', JSON.stringify(slices));
    for (const k of ['julia', 'coupling', 'palette', 'fluidSim'] as const) {
        if (!(slices as any)[k]) throw new Error(`${k} slice missing`);
    }

    // 2. Mutate each feature via its auto-generated setter
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s.setJulia({ juliaC: { x: 0.3, y: -0.45 }, maxIter: 128, power: 3.5, zoom: 3.2, center: { x: 0.25, y: -0.1 } });
        s.setCoupling({ forceMode: 2, forceGain: -800, orbitRadius: 0.12 });
        s.setPalette({ gradientRepeat: 2.5, colorIter: 120 });
        s.setComposite({ dyeMix: 1.5 });
        s.setFluidSim({ vorticity: 40, pressureIters: 55, dyeInject: 2.2, dyeDissipation: 2.1 });
    });
    await page.waitForTimeout(200);

    const snapshot1 = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            ju_power: s.julia.power,
            ju_iter: s.julia.maxIter,
            ju_zoom: s.julia.zoom,
            cp_mode: s.coupling.forceMode,
            cp_rad:  s.coupling.orbitRadius,
            pa_rep:  s.palette.gradientRepeat,
            pa_ci:   s.palette.colorIter,
            co_mix:  s.composite.dyeMix,
            fs_vort: s.fluidSim.vorticity,
            fs_inj:  s.fluidSim.dyeInject,
            fs_dis:  s.fluidSim.dyeDissipation,
        };
    });
    console.log('after mutate:', JSON.stringify(snapshot1));

    // 3. Capture preset
    const presetJson = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return JSON.stringify(s.getPreset({ includeScene: true }));
    });
    const preset = JSON.parse(presetJson);
    console.log('preset feature ids:', Object.keys(preset.features ?? {}).join(', '));

    for (const f of ['julia', 'coupling', 'palette', 'fluidSim']) {
        if (!preset.features?.[f]) throw new Error(`preset missing features.${f}`);
    }

    // 4. Mutate to different values so loadPreset actually has to work
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s.setJulia({ power: 2, zoom: 1 });
        s.setCoupling({ forceMode: 0, orbitRadius: 0 });
        s.setPalette({ colorIter: 50 });
        s.setComposite({ dyeMix: 0 });
        s.setFluidSim({ vorticity: 0, dyeInject: 0 });
    });
    await page.waitForTimeout(100);

    // 5. Load the captured preset
    await page.evaluate((json: string) => {
        (window as any).__store.getState().loadPreset(JSON.parse(json));
    }, presetJson);
    await page.waitForTimeout(200);

    const snapshot2 = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            ju_power: s.julia.power,
            ju_iter: s.julia.maxIter,
            ju_zoom: s.julia.zoom,
            cp_mode: s.coupling.forceMode,
            cp_rad:  s.coupling.orbitRadius,
            pa_rep:  s.palette.gradientRepeat,
            pa_ci:   s.palette.colorIter,
            co_mix:  s.composite.dyeMix,
            fs_vort: s.fluidSim.vorticity,
            fs_inj:  s.fluidSim.dyeInject,
            fs_dis:  s.fluidSim.dyeDissipation,
        };
    });
    console.log('after load:', JSON.stringify(snapshot2));

    for (const k of Object.keys(snapshot1) as (keyof typeof snapshot1)[]) {
        if (Math.abs((snapshot1[k] as number) - (snapshot2[k] as number)) > 1e-6) {
            throw new Error(`loadPreset roundtrip mismatch on ${k}: expected ${snapshot1[k]} got ${snapshot2[k]}`);
        }
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ fluid-toy features present (julia+coupling+palette+fluidSim), auto-setters work, preset roundtrip exact');
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
