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

    // ── Is it actually ORBITING? ──────────────────────────────────────────────
    // Everything above is one-sided: an offset of exactly ZERO is trivially
    // within the radius, and the relative-add check only fires when the live
    // value lands near 0. The guard sweep on 2026-07-29 replaced the Sine case
    // in ModulationEngine with `rawWave = 0` — a completely frozen LFO — and
    // this smoke printed "✓ two-LFO orbit writes liveModulations (relative add)"
    // and exited 0, with live juliaC identical to base to every decimal.
    //
    // The two LFOs are a QUADRATURE PAIR: same amplitude and period, phases 0
    // and 0.25. So dx = R·sin(θ) and dy = R·sin(θ + π/2) = R·cos(θ), and
    // hypot(dx, dy) = R for EVERY θ — a sample-time-independent invariant, which
    // is what makes it assertable in a smoke with nondeterministic timing.
    // Measured 0.2000 and 0.19999 on two unmodified runs against RADIUS = 0.2.
    //
    // Several samples, not one: with a single sample a dead Y axis still reads
    // hypot = R whenever |sin θ| = 1, and a stalled clock reads hypot = R
    // forever at whatever θ it froze on. SAMPLES points spread over more than
    // one LFO period pin both axes AND prove the phase is advancing (the max
    // pairwise separation approaches the diameter once the point has gone round).
    //
    // MIN_ORBIT_SPREAD is deliberately far below what a healthy run produces.
    // Two samples 170ms apart were tried first and rejected: measured 0.3792,
    // 0.0777, 0.3639, 0.3583 over four clean runs — the headless tick clock is
    // jittery enough that one pair advanced only ~22° instead of ~122°, leaving
    // 1.5x of margin. The 6-sample spread below measured 0.3826-0.4000 over five
    // clean runs, i.e. essentially the full diameter every time.
    const ORBIT_RADIUS_TOL = 0.02;   // 10% of RADIUS
    const SAMPLES = 6;
    const SAMPLE_GAP_MS = 120;       // 6 x 120ms = 720ms > the 0.5s LFO period
    const MIN_ORBIT_SPREAD = 0.08;   // 0.4 diameter measured; ~5x margin
    const sampleOffset = () => page.evaluate((b) => {
        const s = (window as any).__store.getState();
        return {
            dx: (s.liveModulations?.['julia.juliaC_x'] ?? NaN) - b.x,
            dy: (s.liveModulations?.['julia.juliaC_y'] ?? NaN) - b.y,
        };
    }, { x: baseline.juliaC_x, y: baseline.juliaC_y });

    const samples: { dx: number; dy: number }[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        if (i > 0) await page.waitForTimeout(SAMPLE_GAP_MS);
        samples.push(await sampleOffset());
    }
    const radii = samples.map(s => Math.hypot(s.dx, s.dy));
    let spread = 0;
    for (let i = 0; i < samples.length; i++)
        for (let j = i + 1; j < samples.length; j++)
            spread = Math.max(spread, Math.hypot(samples[j].dx - samples[i].dx, samples[j].dy - samples[i].dy));
    console.log(`orbit:    radii=[${radii.map(r => r.toFixed(4)).join(', ')}] (expect ${RADIUS}) spread=${spread.toFixed(4)}`);

    radii.forEach((r, i) => {
        if (!(Math.abs(r - RADIUS) <= ORBIT_RADIUS_TOL)) {
            throw new Error(`sample ${i}: orbit offset magnitude ${r.toFixed(4)} is not the LFO amplitude ${RADIUS} (±${ORBIT_RADIUS_TOL}) — the quadrature pair is not driving both juliaC axes (a frozen LFO reads 0; one dead axis reads below R)`);
        }
    });
    if (spread < MIN_ORBIT_SPREAD) {
        throw new Error(`orbit never moved across ${SAMPLES} samples over ${(SAMPLES - 1) * SAMPLE_GAP_MS}ms (max separation ${spread.toFixed(4)}, need >${MIN_ORBIT_SPREAD}) — the offsets are pinned, so the LFO phase is not advancing`);
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
