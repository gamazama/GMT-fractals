/**
 * Smoke test for F12 vec2 binder fix.
 *
 * Seeds a 2-keyframe track on `julia.juliaC_x` (UNDERSCORE form as per
 * AutoFeaturePanel's trackKeys convention), plays through, and asserts
 * that `store.julia.juliaC.x` advanced via the binder's vec-axis writer.
 *
 * Before the fix, the UNDERSCORE-form track IDs fell through to scalar
 * setter `setJulia({ juliaC_x: v })` which silently did nothing (no such
 * property on the slice).
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

    // Snapshot the base juliaC before animation so we can verify the
    // binder preserved the OTHER axis (y) while writing x.
    const baseline = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return { x: s.julia.juliaC.x, y: s.julia.juliaC.y };
    });

    // Seed a 2-keyframe track on julia.juliaC_x (UNDERSCORE form).
    await page.evaluate(() => {
        const anim = (window as any).useAnimationStore.getState();
        anim.addTrack('julia.juliaC_x', 'Julia c.x');
        anim.addKeyframe('julia.juliaC_x', 0, -0.7);
        anim.addKeyframe('julia.juliaC_x', 30, 0.3);
        anim.seek(0);
        anim.play();
    });
    await page.waitForTimeout(700);

    const after = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            x: s.julia.juliaC.x,
            y: s.julia.juliaC.y,
            currentFrame: (window as any).useAnimationStore.getState().currentFrame,
        };
    });
    await page.evaluate(() => (window as any).useAnimationStore.getState().pause());
    console.log('baseline:', JSON.stringify(baseline));
    console.log('after:   ', JSON.stringify(after));

    // Binder should have written x but preserved y.
    if (after.x === baseline.x) {
        throw new Error(`vec2 binder did not write x axis (still ${after.x})`);
    }
    if (after.y !== baseline.y) {
        throw new Error(`vec2 binder clobbered y axis (was ${baseline.y}, now ${after.y})`);
    }
    if (after.x < -0.7 || after.x > 0.3) {
        throw new Error(`vec2 binder wrote x out of interpolation range: ${after.x}`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log(`\n✓ vec2 binder writes x (${after.x.toFixed(3)}) and preserves y (${after.y.toFixed(3)})`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
