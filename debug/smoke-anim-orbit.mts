/**
 * Smoke test for F13 — orbit LFO drives juliaC via liveModulations.
 *
 * Turns on auto-orbit. OrbitTick installs two sine LFOs targeting
 * `julia.juliaC_x` and `julia.juliaC_y`. After a few RAF frames, the
 * store's `liveModulations` map should contain non-zero values for
 * those keys — proving that AnimationSystem.tsx's no-uniform DDFS
 * vec path populates liveModulations (not silently hijacked by the
 * old `julia.*` branch which required GMT's `geometry` slice).
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

    const baseline = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            juliaC_x: s.julia.juliaC.x,
            juliaC_y: s.julia.juliaC.y,
            orbitEnabled: s.orbit?.enabled ?? false,
            animationsCount: (s.animations ?? []).length,
        };
    });
    console.log('baseline:', JSON.stringify(baseline));

    // Enable orbit — orbitTick.installOrbitSync() subscribes to this and
    // pushes two sine LFOs into state.animations.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setOrbit({ enabled: true, radius: 0.2, speed: 2 });
    });
    // Give RAF + modulationEngine a few frames to compute the first LFO offsets.
    await page.waitForTimeout(500);

    const running = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            animationsCount: (s.animations ?? []).length,
            animationsTargets: (s.animations ?? []).map((a: any) => a.target),
            liveMod_juliaC_x: s.liveModulations?.['julia.juliaC_x'],
            liveMod_juliaC_y: s.liveModulations?.['julia.juliaC_y'],
        };
    });
    console.log('running: ', JSON.stringify(running));

    if (running.animationsCount < 2) {
        throw new Error(`orbit did not register LFOs (count=${running.animationsCount})`);
    }
    if (!running.animationsTargets.includes('julia.juliaC_x') || !running.animationsTargets.includes('julia.juliaC_y')) {
        throw new Error(`orbit LFO targets wrong: ${JSON.stringify(running.animationsTargets)}`);
    }
    if (typeof running.liveMod_juliaC_x !== 'number' || typeof running.liveMod_juliaC_y !== 'number') {
        throw new Error(`liveModulations missing juliaC keys: ${JSON.stringify(running)}`);
    }

    // The liveMod value should be `base + offset`, where base is the
    // store's juliaC.x/y. Confirm it's within radius of the base.
    const dx = Math.abs(running.liveMod_juliaC_x - baseline.juliaC_x);
    const dy = Math.abs(running.liveMod_juliaC_y - baseline.juliaC_y);
    if (dx > 0.25 || dy > 0.25) {
        throw new Error(`liveMod orbit too far from base (dx=${dx}, dy=${dy}); expected within radius=0.2`);
    }

    // Verify the orbit is NOT just writing the bare offset (base=0).
    // The liveMod value should be near the base, not near 0.
    if (Math.abs(running.liveMod_juliaC_x) < 0.05 && Math.abs(baseline.juliaC_x) > 0.1) {
        throw new Error(`liveMod looks like bare offset (juliaC_x=${running.liveMod_juliaC_x}) when base was ${baseline.juliaC_x}; julia.* hijack may still be firing`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log(`\n✓ orbit LFO writes liveModulations for julia.juliaC_x/_y`);
    console.log(`  base juliaC: (${baseline.juliaC_x.toFixed(3)}, ${baseline.juliaC_y.toFixed(3)})`);
    console.log(`  live juliaC: (${running.liveMod_juliaC_x.toFixed(3)}, ${running.liveMod_juliaC_y.toFixed(3)})`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
