/**
 * Smoke test for Julia-c auto-orbit via LFO modulation.
 *
 * Auto-orbit is no longer a bespoke toggle/orbitTick — it's expressed as
 * two normal Sine LFOs at 90° phase on `julia.juliaC_x` / `_y` (authored
 * via the Modulation panel; presets ship the same two LFOs through
 * presets/apply.ts). AnimationSystem's generic vec-component handler does
 * a *relative add* — liveModulations[target] = authored juliaC + offset —
 * so the orbit circles the current c base rather than snapping to a bare
 * offset.
 *
 * This smoke pushes those two LFOs directly (faster than clicking through
 * the lfo-list widget) and asserts the store's `liveModulations` map gains
 * finite values for both juliaC components, each within the orbit radius
 * of the base — proving the no-uniform DDFS vec path populates
 * liveModulations (not silently hijacked by GMT's `geometry`-gated branch).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';
const RADIUS = 0.2;

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
            animationsCount: (s.animations ?? []).length,
        };
    });
    console.log('baseline:', JSON.stringify(baseline));

    // Install the two-LFO orbit (Sine on juliaC_x/_y, 90° apart). This is
    // exactly what presets/apply.ts ships for "legacy auto-orbit" presets.
    await page.evaluate((r) => {
        const s = (window as any).__store.getState();
        s.setAnimations([
            { id: 'orbit-x', enabled: true, target: 'julia.juliaC_x', shape: 'Sine', period: 0.5, amplitude: r, baseValue: 0, phase: 0,    smoothing: 0 },
            { id: 'orbit-y', enabled: true, target: 'julia.juliaC_y', shape: 'Sine', period: 0.5, amplitude: r, baseValue: 0, phase: 0.25, smoothing: 0 },
        ]);
    }, RADIUS);
    // Give RAF + modulationTick a few frames to compute the first offsets.
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
        throw new Error(`orbit LFOs not registered (count=${running.animationsCount})`);
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
    if (dx > RADIUS + 0.05 || dy > RADIUS + 0.05) {
        throw new Error(`liveMod orbit too far from base (dx=${dx}, dy=${dy}); expected within radius=${RADIUS}`);
    }

    // Verify the orbit is a RELATIVE add (base + offset), not the bare
    // offset (base=0). The liveMod value should sit near the base, not 0.
    if (Math.abs(running.liveMod_juliaC_x) < 0.05 && Math.abs(baseline.juliaC_x) > 0.1) {
        throw new Error(`liveMod looks like bare offset (juliaC_x=${running.liveMod_juliaC_x}) when base was ${baseline.juliaC_x}; the relative-add vec path may be broken`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log(`\n✓ two-LFO orbit writes liveModulations for julia.juliaC_x/_y (relative add)`);
    console.log(`  base juliaC: (${baseline.juliaC_x.toFixed(3)}, ${baseline.juliaC_y.toFixed(3)})`);
    console.log(`  live juliaC: (${running.liveMod_juliaC_x.toFixed(3)}, ${running.liveMod_juliaC_y.toFixed(3)})`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
