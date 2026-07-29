/**
 * TSAA smoke test — fluid-toy with TSAA enabled.
 *
 * Verifies:
 *   1. Page loads without errors.
 *   2. Blue-noise texture + tsaa fbos allocated (no WebGL errors).
 *   3. Screenshot captures the fractal with TSAA on.
 *   4. Toggle accumulation=false, confirm screenshot captures without
 *      sub-pixel averaging (raw jittered single-frame sample).
 *
 * The rendered image diff between on/off is hard to assert headlessly
 * because TSAA converges over 60+ frames; we just confirm no errors and
 * capture both screenshots for manual compare.
 *
 * ⚠ **READ THIS BEFORE TRUSTING A GREEN RUN. Despite the name, nothing here
 * looks at TSAA output.** Measured in the 2026-07-29 guard sweep, both reverted:
 *   - `runTsaaBlend()` given an unconditional early return — TSAA completely
 *     dead, no accumulation, no blend — exit 0.
 *   - `this.blueNoise` forced to null, i.e. item 2 of the checklist above
 *     ("blue-noise texture allocated") false — exit 0.
 * Both are `fluid-toy/fluid/FluidEngine.ts`. This is a BOOT CANARY plus a
 * screenshot capture for a human A/B, and the two PNGs it writes are TRACKED
 * files — `git checkout` them after a run or they land in your next commit.
 * A TSAA regression needs the visual pass; do not cite this as covering one.
 *
 * What its exit status does turn on, after the same sweep: any `pageerror` or
 * `console.error` (the latter was collected into an unused `logs` array and
 * silently dropped until then — every sibling smoke collects it), the probe
 * fields existing and being sane, and the `setAccumulation` round-trip actually
 * landing in the store. Before that the probe was printed and never checked, so
 * `sampleCap` could vanish entirely and the run stayed green.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
// Was `logs.push(...)` into an array nothing ever read, so a console.error could
// not fail this smoke. Measured clean (0 console errors) on a healthy boot before
// this was wired up, 2026-07-29.
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

// Probe TSAA state.
const probe = await page.evaluate(`(function() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };
    const s = window.__store && window.__store.getState();
    return {
        accumulation: s && s.accumulation,
        sampleCap: s && s.sampleCap,
        canvasW: canvas.width, canvasH: canvas.height,
    };
})()`);

console.log('probe:', JSON.stringify(probe));
console.log('errors:', errors.length);
errors.forEach((e) => console.log('  ', e));

// The probe was printed and never checked. Assert it — this is what makes a
// vanished store field or an unsized canvas fail rather than print `undefined`
// and sail past. Measured healthy 2026-07-29: accumulation true, sampleCap 64,
// canvas 520x744 (viewport 1200x800 minus the docked panels, x DPR).
const p = probe as { error?: string; accumulation?: unknown; sampleCap?: unknown; canvasW?: number; canvasH?: number };
const bad: string[] = [];
if (p.error) bad.push(p.error);
if (typeof p.accumulation !== 'boolean') bad.push(`store.accumulation is ${JSON.stringify(p.accumulation)}, expected a boolean`);
if (p.accumulation !== true) bad.push('store.accumulation should default true — this smoke toggles it OFF below, so a false default makes that half a no-op');
if (typeof p.sampleCap !== 'number' || !Number.isFinite(p.sampleCap) || p.sampleCap <= 1) {
    bad.push(`store.sampleCap is ${JSON.stringify(p.sampleCap)}, expected a finite number > 1 (cap 1 means TSAA is OFF — grep tsaaActive in fluid-toy/fluid/FluidEngine.ts)`);
}
if (!p.canvasW || !p.canvasH) bad.push(`canvas is ${p.canvasW}x${p.canvasH} — nothing was sized, so both screenshots below are meaningless`);
if (bad.length > 0) {
    console.error('✗ probe assertions failed:\n  ' + bad.join('\n  '));
    await browser.close();
    process.exit(1);
}

// Let TSAA converge for a couple seconds, then snapshot.
await page.waitForTimeout(2000);
await page.screenshot({ path: 'debug/fluid-tsaa-on.png' });
console.log('[tsaa on] screenshot → debug/fluid-tsaa-on.png');

// Toggle off. The setter was called and the result never read, so a
// setAccumulation that silently dropped its argument passed.
await page.evaluate(`window.__store.getState().setAccumulation(false)`);
await page.waitForTimeout(1500);
const accumOff = await page.evaluate(`window.__store.getState().accumulation`);
console.log('accumulation after setAccumulation(false):', accumOff);
if (accumOff !== false) {
    console.error(`✗ setAccumulation(false) did not land in the store — accumulation is ${JSON.stringify(accumOff)}`);
    await browser.close();
    process.exit(1);
}
await page.screenshot({ path: 'debug/fluid-tsaa-off.png' });
console.log('[tsaa off] screenshot → debug/fluid-tsaa-off.png');

await browser.close();

if (errors.length > 0) {
    console.error('✗ smoke FAILED');
    process.exit(1);
}
console.log('✓ fluid-toy TSAA smoke — no page errors');
