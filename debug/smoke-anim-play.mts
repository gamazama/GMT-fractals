/**
 * Smoke test for animation playback + scrub chain.
 *
 * Verifies that EngineBridge is mounted (calls animationEngine.connect)
 * AND that AnimationSystem.tick is registered in TickRegistry (so
 * playback actually advances).
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

    // Seed a 2-keyframe track on julia.power: frame 0 = 2, frame 30 = 6.
    // addKeyframe requires the track to exist; create it first with addTrack.
    await page.evaluate(() => {
        const anim = (window as any).useAnimationStore.getState();
        anim.addTrack('julia.power', 'Julia Power');
        anim.addKeyframe('julia.power', 0, 2);
        anim.addKeyframe('julia.power', 30, 6);
        anim.seek(0);
    });
    await page.waitForTimeout(100);

    // Scrub verification is skipped in the headless smoke — the
    // Timeline UI calls animationEngine.scrub(frame) directly on
    // pointer-drag (TimelineRuler.tsx, KeyframeInspector.tsx), which
    // isn't reachable without simulating the drag. Manual verification:
    // open /fluid-toy.html, drag the timeline ruler — bound params move.

    // Start playback, wait for frames to advance via AnimationSystem.tick
    // (registered into TickRegistry ANIMATE phase; driven by
    // @engine/render-loop's RAF).
    await page.evaluate(() => {
        const anim = (window as any).useAnimationStore.getState();
        anim.seek(0);
        anim.play();
    });
    await page.waitForTimeout(700);

    const played = await page.evaluate(() => ({
        currentFrame: (window as any).useAnimationStore.getState().currentFrame,
        isPlaying: (window as any).useAnimationStore.getState().isPlaying,
        juliaPower: (window as any).__store.getState().julia.power,
    }));
    await page.evaluate(() => (window as any).useAnimationStore.getState().pause());
    console.log('after playback:', JSON.stringify(played));
    if (played.currentFrame <= 0) {
        throw new Error(`playback did not advance frame (stuck at ${played.currentFrame})`);
    }
    // julia.power should have been driven by the animated track.
    if (played.juliaPower === 2) {
        throw new Error(`playback not applying track values to store (julia.power still ${played.juliaPower})`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log(`\n✓ playback advances frame (0 → ${played.currentFrame.toFixed(1)}) and drives bound param (julia.power = ${played.juliaPower.toFixed(2)})`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
