/**
 * Orbit smoke — verifies that a left-drag in app-gmt orbits the scene
 * (installNavigation() + <OrbitMode />) and that the engine keeps
 * accumulating afterwards.
 *
 * Asserts against `window.__gmtProxy` (the engine→worker shadow proxy):
 *   1. an orbit drag changes `sceneOffset` (hi+lo combined) — the view
 *      actually moved, not a no-op;
 *   2. `accumulationCount` advances after the interaction settles — the
 *      path-traced accumulation resumed rather than stalling.
 *
 * (The old rev read `window.__r3fCamera` / `__getOrbitTarget`, which never
 * existed on window — those reads are gone.)
 *
 * FALSIFIED 2026-07-29 (guard sweep, after the ACCUM_TIMEOUT_MS repair below).
 * Both assertions go red on a targeted break of the code they govern:
 *   · gate out `absorbOrbitPosition`'s body (grep `absorbOrbitPosition` in
 *     engine-gmt/navigation/Navigation.tsx) so camera.position is never folded
 *     into sceneOffset → exit 1, "orbit drag did not move the scene —
 *     sceneOffset delta 0.000 < 0.5".
 *   · force `holdActive = true` (grep `holdActive` in
 *     engine-gmt/engine/FractalEngine.ts) so the accumulation hold never
 *     releases after the gesture → exit 1, "accumulation did not advance after
 *     orbit settled (1 → 1) in 45s".
 * Both reverted. Assertion 1 fails fast; assertion 2 costs the full
 * ACCUM_TIMEOUT_MS before it can report.
 *
 * MEASURED BLIND SPOT — what a green run does NOT prove. `accumulationCount`
 * is not a render counter in this app. When progressive tiling is active
 * (the idle path in app-gmt), `engine-gmt/engine/FractalEngine.ts` assigns
 * `pipeline.accumulationCount = band.sampleCount` from the band scheduler,
 * OUTSIDE `RenderPipeline.render()` — grep `band.sampleCount`. So a hard
 * `return` at the top of `engine/RenderPipeline.ts`'s `render()`, i.e. the
 * whole accumulation pipeline dead, leaves this smoke GREEN: measured
 * 2026-07-29, exit 0, accumulation 7 → 8 in 0.0 s (a clean tree takes ~13 s
 * for the same step — the broken build is 50× "faster" because it does no
 * work). `frameCount` does not discriminate either (it is the worker's tick
 * count, and it climbed 128 → 186 on the same break), nor does
 * `convergenceValue` (1.0 in both). Only the pixels differ: the render
 * canvas screenshots to a 562 KB PNG on a clean tree and 127 KB on that
 * break. This smoke covers the ORBIT GESTURE and the accumulation-hold
 * RELEASE; it does not cover whether anything was actually rendered.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

async function main() {
    const browser = await chromium.launch({
        args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);

    const readOffset = () => page.evaluate(`(function() {
        const p = window.__gmtProxy;
        if (!p) return null;
        const o = p.sceneOffset;
        return { x: o.x + o.xL, y: o.y + o.yL, z: o.z + o.zL };
    })()`) as Promise<{ x: number; y: number; z: number } | null>;

    const before = await readOffset();
    console.log('sceneOffset BEFORE drag:', JSON.stringify(before));
    if (!before) throw new Error('window.__gmtProxy not present — engine shadow proxy missing');

    // Orbit drag: press near centre, sweep right + down.
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport');
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    await page.mouse.move(cx - 150, cy);
    await page.mouse.down({ button: 'left' });
    for (let i = 1; i <= 12; i++) {
        await page.mouse.move(cx - 150 + i * 25, cy + i * 8, { steps: 1 });
        await page.waitForTimeout(30);
    }
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(500);

    const after = await readOffset();
    console.log('sceneOffset AFTER drag: ', JSON.stringify(after));
    if (!after) throw new Error('window.__gmtProxy disappeared after drag');

    const delta = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
    console.log(`sceneOffset delta: ${delta.toFixed(3)}`);
    if (delta < 0.5) {
        throw new Error(`orbit drag did not move the scene — sceneOffset delta ${delta.toFixed(3)} < 0.5`);
    }

    // The orbit interaction resets the path-trace accumulation; confirm the
    // render loop resumes by polling for the count to climb.
    //
    // ACCUM_TIMEOUT_MS — do not lower without re-measuring. The comment this
    // replaced said "a few frames/sec", and that is wrong by two orders of
    // magnitude here: headless Chromium falls back to SwiftShader (gpuInfo
    // reads "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…"), so
    // one 1200×800 path-trace sample costs SECONDS, not milliseconds. It is
    // slower still AFTER the gesture settles than during boot, because the
    // adaptive-resolution grace period has expired by then and the pipeline is
    // back at full res (see `holdForAdaptive` / `getAdaptiveGrace` in
    // engine-gmt/engine/FractalEngine.ts).
    //
    // Measured 2026-07-29 on this machine, 6 consecutive clean trials driving
    // exactly the sequence below: time from the post-settle read to the first
    // increment was 13.2 / 14.7 / 15.2 / 13.5 / 14.5 / 13.5 s — 6/6 advanced,
    // none under 13 s. The old 8000 ms window could never be met, which is why
    // this smoke was PERMANENTLY RED on pristine main from at least cycle 7
    // (2026-07-28) and could not distinguish a regression from its baseline.
    // 45 s is ~3× the worst observed. The assertion itself is unchanged.
    const ACCUM_TIMEOUT_MS = 45_000;
    const accum1 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`) as number | null;
    if (typeof accum1 !== 'number') {
        throw new Error(`accumulationCount unavailable on __gmtProxy (${accum1})`);
    }
    const tAccum = Date.now();
    const advanced = await page.waitForFunction(
        (a0) => {
            const p = (window as any).__gmtProxy;
            return !!p && typeof p.accumulationCount === 'number' && p.accumulationCount > a0;
        },
        accum1,
        { timeout: ACCUM_TIMEOUT_MS, polling: 250 },
    ).then(() => true).catch(() => false);
    const accumMs = Date.now() - tAccum;
    const accum2 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`) as number | null;
    console.log(`accumulationCount: ${accum1} → ${accum2} (advanced within ${ACCUM_TIMEOUT_MS / 1000}s: ${advanced}, took ${(accumMs / 1000).toFixed(1)}s)`);
    if (!advanced) {
        throw new Error(`accumulation did not advance after orbit settled (${accum1} → ${accum2}) in ${ACCUM_TIMEOUT_MS / 1000}s — render loop stalled?`);
    }

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b/.test(e));
        if (fatal.length > 0) throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ orbit drag moves sceneOffset and accumulation resumes');
    console.log(`  sceneOffset delta ${delta.toFixed(2)}, accumulation ${accum1} → ${accum2}`);
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
