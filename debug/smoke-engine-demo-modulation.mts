/**
 * Smoke for the modulation UI lift, exercised end-to-end on the
 * engine demo:
 *   1. boot, confirm 'lfo-list' is registered
 *   2. confirm Animation panel is in the manifest + open
 *   3. programmatically push an LFO targeting demo.position_x
 *   4. wait for the modulation tick to write liveModulations
 *   5. verify liveModulations['demo.position_x'] is finite + non-zero
 *   6. verify the square's `left` CSS pixel position has moved off
 *      the baseline (wiggle proof)
 *
 * If any link in the chain (lfo-list registry, modulation tick,
 * AnimationEngine binder, liveModulations write, DemoOverlay live-mod
 * compose) is broken by the lift, one of the above fails loud.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/demo.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL + '?cachebust=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    if (errors.length > 0) {
        console.log('errors so far:');
        errors.forEach((e) => console.log(' ', e));
    }

    // 1) Panel state — read from the store directly (DOM selectors
    //    against the rendered tab buttons are fragile across icon/label
    //    layouts). The panel's location and isOpen tell us if Dock will
    //    render it.
    const panelState = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        const p = s?.panels ?? {};
        return {
            keys: Object.keys(p),
            demo: p.Demo ? { location: p.Demo.location, isOpen: p.Demo.isOpen } : null,
            animation: p.Animation ? { location: p.Animation.location, isOpen: p.Animation.isOpen } : null,
            activeRight: s?.activeRightTab,
        };
    });
    console.log('panels:', JSON.stringify(panelState));
    if (!panelState.animation) throw new Error('Animation panel missing from store.panels — applyPanelManifest never sw it');

    // 2) Animation panel visible in DOM (open it explicitly so the
    //    lfo-list widget renders for the rest of the test).
    await page.evaluate(() => (window as any).__store?.getState?.()?.togglePanel?.('Animation', true));
    await page.waitForTimeout(150);
    const lfoListVisible = await page.evaluate(() => document.body.innerText.includes('LFO Modulators'));
    console.log('LFO Modulators heading visible:', lfoListVisible);
    if (!lfoListVisible) throw new Error('lfo-list widget did not render inside Animation panel');

    // 2) The demo square is canvas-painted (no positioned DOM element),
    //    so confirm the overlay canvas exists for the render proof below.
    // NB: the demo app also mounts the engine's WebGL canvas (no class);
    // the DemoOverlay 2D canvas is the one with the pointer-events-none class.
    const haveCanvas = await page.evaluate(() => !!document.querySelector('canvas.pointer-events-none'));
    if (!haveCanvas) throw new Error('Demo overlay canvas not found');

    // 3) push an LFO programmatically (faster than clicking through the
    //    widget UI — and the widget is already smoke-covered by being
    //    registered + visible)
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s?.setAnimations?.([
            {
                id: 'smoke-lfo',
                enabled: true,
                target: 'demo.position_x',
                shape: 'Sine',
                period: 1.0,
                amplitude: 0.5,
                baseValue: 0,
                phase: 0,
                smoothing: 0,
            },
        ]);
    });

    // 4) let modulation tick run
    await page.waitForTimeout(400);

    // 5) liveModulations populated
    const liveValue = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return s?.liveModulations?.['demo.position_x'] ?? null;
    });
    console.log('liveModulations[demo.position_x]:', liveValue);
    if (typeof liveValue !== 'number') {
        throw new Error(
            `Modulation tick did not write liveModulations['demo.position_x'] — value is ${liveValue}. ` +
            `Likely AnimationSystem.tick has a GMT-specific gate (e.g. requires a slice with a 'uniform' field) ` +
            `that the demo slice doesn't satisfy.`
        );
    }

    // 6) overlay actually re-renders from the LFO. The square is painted
    //    to a <canvas> at cx ∝ (0.5 + posX·0.4), so as the position_x LFO
    //    sweeps, the painted square's horizontal centroid must move.
    //    Sample the centroid of bright (non-background) pixels on the
    //    canvas's middle row across several frames.
    const sampleCentroid = () => {
        const c = document.querySelector('canvas.pointer-events-none') as HTMLCanvasElement | null;
        if (!c || !c.width || !c.height) return NaN;
        const ctx = c.getContext('2d');
        if (!ctx) return NaN;
        const row = Math.floor(c.height / 2);
        const data = ctx.getImageData(0, row, c.width, 1).data;
        let sum = 0, n = 0;
        for (let x = 0; x < c.width; x++) {
            const i = x * 4;
            // background is #111111 (sum 51); painted square is brighter.
            if (data[i] + data[i + 1] + data[i + 2] > 90) { sum += x; n++; }
        }
        return n > 0 ? sum / n : NaN;
    };
    const centroids: number[] = [];
    for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(60);
        const cxt = await page.evaluate(sampleCentroid);
        if (Number.isFinite(cxt)) centroids.push(cxt as number);
    }
    console.log('square x-centroids:', centroids.map((v) => v.toFixed(0)).join(' '));
    if (centroids.length < 4) {
        throw new Error(`could not sample the painted square (${centroids.length} finite centroids) — DemoOverlay canvas not rendering?`);
    }
    const sweepPx = Math.max(...centroids) - Math.min(...centroids);
    console.log(`square centroid sweep: ${sweepPx.toFixed(1)}px`);
    if (sweepPx < 5) {
        throw new Error(`square did not move — centroid sweep ${sweepPx.toFixed(1)}px < 5px. DemoOverlay may not be reading liveModulations.`);
    }

    // 7) min/max path — RELATIVE strengths (offset added to baseValue).
    //    base=120, min=-40, max=+80 → output in [80, 200]. Asymmetric
    //    on purpose to verify min != −max behaviour.
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s?.setAnimations?.([
            {
                id: 'smoke-lfo-minmax',
                enabled: true,
                target: 'demo.size',
                shape: 'Sine',
                period: 0.5,
                amplitude: 0,
                baseValue: 120,
                min: -40,
                max: 80,
                phase: 0,
                smoothing: 0,
            },
        ]);
    });
    await page.waitForTimeout(400);
    const sizeMod = await page.evaluate(() => (window as any).__store?.getState?.()?.liveModulations?.['demo.size'] ?? null);
    console.log('liveModulations[demo.size] (relative min/max):', sizeMod);
    if (typeof sizeMod !== 'number' || sizeMod < 75 || sizeMod > 205) {
        throw new Error(`relative min/max LFO output out of [80, 200]: ${sizeMod}`);
    }

    // 8) Noise path — base=0.6, min=-0.3, max=+0.4 → output in [0.3, 1.0].
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s?.setAnimations?.([
            {
                id: 'smoke-lfo-noise',
                enabled: true,
                target: 'demo.opacity',
                shape: 'Noise',
                period: 0.5,
                amplitude: 0,
                baseValue: 0.6,
                min: -0.3,
                max: 0.4,
                phase: 0,
                smoothing: 0,
            },
        ]);
    });
    const noiseSamples: number[] = [];
    for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(80);
        const v = await page.evaluate(() => (window as any).__store?.getState?.()?.liveModulations?.['demo.opacity'] ?? null);
        if (typeof v === 'number') noiseSamples.push(v);
    }
    console.log('noise samples:', noiseSamples.map(v => v.toFixed(3)).join(' '));
    // ImprovedNoise (3D Perlin sampled at y=z=0) can momentarily exceed
    // ±1; loosen to [0.15, 1.20] so the smoke isn't flaky on legitimate
    // noise excursions.
    const inRange = noiseSamples.every(v => v >= 0.15 && v <= 1.20);
    if (!inRange || noiseSamples.length < 4) {
        throw new Error(`noise samples out of range or insufficient: ${noiseSamples.join(', ')}`);
    }
    // Sanity: shouldn't be constant (would indicate noise not advancing).
    const noiseSpread = Math.max(...noiseSamples) - Math.min(...noiseSamples);
    if (noiseSpread < 0.01) {
        throw new Error(`noise output is constant — period probably not driving sample advance. spread=${noiseSpread}`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ modulation lift end-to-end: lfo-list registered, panel mounted, tick writes liveModulations, overlay wiggles, min/max path works, noise path works');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
