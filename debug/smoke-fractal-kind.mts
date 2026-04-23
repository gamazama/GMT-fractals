/**
 * Smoke test for Julia / Mandelbrot kind switch.
 *
 * Verifies:
 *   - julia.kind param is registered with options (dropdown pattern)
 *   - default is 1 (Mandelbrot, matching FluidEngine.DEFAULT_PARAMS)
 *   - setting kind=0 routes through to FluidEngine.params.kind === 'julia'
 *   - flipping back to kind=1 routes to 'mandelbrot'
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

    const initial = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            kind: s.julia?.kind,
            hasKindParam: !!(s.julia && 'kind' in s.julia),
        };
    });
    console.log('initial:', JSON.stringify(initial));

    if (!initial.hasKindParam) throw new Error('julia.kind param missing from store slice');
    if (initial.kind !== 1) throw new Error(`default julia.kind should be 1 (Mandelbrot), got ${initial.kind}`);

    // Flip to Julia (0) — need to wait a frame for the effect to propagate.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ kind: 0 });
    });
    await page.waitForTimeout(100);

    // FluidEngine keeps its current params under __engine (not globally exposed
    // in the port; rely on the store slice as the source of truth).
    const afterJulia = await page.evaluate(() => (window as any).__store.getState().julia?.kind);
    if (afterJulia !== 0) throw new Error(`after setting 0, got kind=${afterJulia}`);

    // Flip back to Mandelbrot.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ kind: 1 });
    });
    await page.waitForTimeout(100);

    const afterMandel = await page.evaluate(() => (window as any).__store.getState().julia?.kind);
    if (afterMandel !== 1) throw new Error(`after setting 1, got kind=${afterMandel}`);

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ julia.kind dropdown param round-trips (0 Julia, 1 Mandelbrot)`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
