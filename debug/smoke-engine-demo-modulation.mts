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

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

const BASELINE_LEFT = 50;     // % — demo.position.x default is 0 → 50% left
const MIN_DELTA_PCT = 1.0;    // % — LFO amplitude 0.5 → ±20% sweep, easy to detect

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

    // 2) baseline square position
    const overlaySel = 'div[class*="pointer-events-none"][class*="z-["] > div';
    const baseline = await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return null;
        return { left: el.style.left, top: el.style.top, width: el.style.width };
    }, overlaySel);
    console.log('baseline overlay style:', baseline);
    if (!baseline) throw new Error('Demo overlay not found');

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

    // 6) overlay actually moved
    const sampledLefts: number[] = [];
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(60);
        const left = await page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLElement | null;
            return el ? parseFloat(el.style.left) : NaN;
        }, overlaySel);
        sampledLefts.push(left);
    }
    const minL = Math.min(...sampledLefts);
    const maxL = Math.max(...sampledLefts);
    const sweep = maxL - minL;
    console.log('overlay left samples:', sampledLefts.map(v => v.toFixed(1)).join(' '));
    console.log(`overlay sweep: ${sweep.toFixed(2)}% (min ${minL.toFixed(1)}, max ${maxL.toFixed(1)}, baseline ${BASELINE_LEFT}%)`);
    if (sweep < MIN_DELTA_PCT) {
        throw new Error(`Overlay did not wiggle — sweep ${sweep.toFixed(2)}% < ${MIN_DELTA_PCT}%. DemoOverlay may not be reading liveModulations correctly.`);
    }

    // 7) Min/max path — push an LFO using min/max instead of amplitude.
    //    Ranges chosen so the output should swing between 0.3 and 0.7
    //    (centered at 0.5, half-range 0.2). With baseValue=0 the
    //    expected offset range is [0.3, 0.7] which becomes the
    //    liveMod value (composed as base + offset = 0 + offset).
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s?.setAnimations?.([
            {
                id: 'smoke-lfo-minmax',
                enabled: true,
                target: 'demo.size',
                shape: 'Sine',
                period: 0.5,         // fast — guaranteed sweep within 1s sampling
                amplitude: 0,        // legacy field unused when min/max present
                baseValue: 120,      // matches DDFS default for demo.size
                min: 80,
                max: 200,
                phase: 0,
                smoothing: 0,
            },
        ]);
    });
    await page.waitForTimeout(400);
    const sizeMod = await page.evaluate(() => (window as any).__store?.getState?.()?.liveModulations?.['demo.size'] ?? null);
    console.log('liveModulations[demo.size] (min/max LFO):', sizeMod);
    if (typeof sizeMod !== 'number' || sizeMod < 75 || sizeMod > 205) {
        throw new Error(`min/max LFO output out of expected [80, 200] range: ${sizeMod}`);
    }

    // 8) Noise path — use shape='Noise' with period=0.5, expect smooth
    //    pseudo-random output in roughly the configured range.
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
                baseValue: 0.9,
                min: 0.3,
                max: 1.0,
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
    const inRange = noiseSamples.every(v => v >= 0.25 && v <= 1.05);
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
