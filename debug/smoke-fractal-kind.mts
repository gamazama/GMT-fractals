/**
 * Smoke test for Julia / Mandelbrot kind switch.
 *
 * Verifies:
 *   - julia.kind param is registered with options (dropdown pattern)
 *   - the KIND_MODES index->string contract: 0 julia, 1 mandelbrot
 *   - the DDFS param default is 1, read off JuliaFeature itself
 *   - the value julia.kind actually boots with is 1 (a different subject —
 *     see below)
 *   - setting kind=0 routes through to FluidEngine.params.kind === 'julia'
 *   - flipping back to kind=1 routes to 'mandelbrot'
 *
 * ⚠ Three corrections from the 2026-07-29 guard sweep, each measured:
 *
 * 1. **The observed boot value is NOT the DDFS default and NOT
 *    FluidEngine.DEFAULT_PARAMS.** `installFluidToyViewLibrary` seeds
 *    DEFAULT_VIEWS and auto-selects the first ("Mandelbrot · Home", kind 1),
 *    which writes julia.kind a few frames after boot — grep `seedDefaultViews`
 *    in fluid-toy/viewLibrary.ts. Proof: setting `defaultIndex: 0` on the enum
 *    param left the store reading 1 while the param's own `default` read 0.
 *    Flipping that seeded view's kind to 0 is what reds the boot assertion. So
 *    the two are asserted separately now; each has exactly one owner.
 *
 * 2. **The index->string map was completely unguarded.** Swapping the first two
 *    entries of KIND_MODES — so kind 0 renders Mandelbrot and every save file
 *    and seeded view means the opposite — left this smoke exit 0, printing the
 *    banner "(0 Julia, 1 Mandelbrot)" that had just become false.
 *
 * 3. **The engine IS reachable.** The old comment "FluidEngine keeps its
 *    current params under __engine (not globally exposed in the port; rely on
 *    the store slice as the source of truth)" is stale:
 *    `__appHandles['fluid-toy.engine'].ref.current.params.kind` reads
 *    'mandelbrot' / 'julia' / 'phoenix' as the store index changes. Reading the
 *    store back after writing it proves only that Zustand works; the routing
 *    claim in the list above is now actually checked.
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
    // Subject: the view-library seed (see correction 1 in the header), NOT the
    // DDFS default. Owner: DEFAULT_VIEWS[0] in fluid-toy/viewLibrary.ts.
    if (initial.kind !== 1) throw new Error(`julia.kind at boot should be 1 (the auto-selected "Mandelbrot · Home" seed), got ${initial.kind}`);

    // Subject: the DDFS default and the enum's index->string contract. Owner:
    // the defineEnumParam call in fluid-toy/features/julia.ts. Neither of these
    // is observable from the store, because the seed above overwrites it.
    const paramFacts = await page.evaluate(async () => {
        const m: any = await import('/fluid-toy/features/julia.ts');
        return {
            defaultIndex: m.JuliaFeature?.params?.kind?.default,
            modes: m.KIND_MODES,
            fromIndex0: m.kindFromIndex?.(0),
            fromIndex1: m.kindFromIndex?.(1),
        };
    });
    console.log('param facts:', JSON.stringify(paramFacts));
    if (paramFacts.defaultIndex !== 1) {
        throw new Error(`JuliaFeature.params.kind.default should be 1 (Mandelbrot, matching FluidEngine.DEFAULT_PARAMS), got ${paramFacts.defaultIndex}`);
    }
    if (paramFacts.fromIndex0 !== 'julia' || paramFacts.fromIndex1 !== 'mandelbrot') {
        throw new Error(`KIND_MODES index contract broken — kindFromIndex(0)='${paramFacts.fromIndex0}' (want 'julia'), kindFromIndex(1)='${paramFacts.fromIndex1}' (want 'mandelbrot'). Save files and DEFAULT_VIEWS store the INDEX, so reordering this tuple silently reinterprets every one of them. Full order: ${JSON.stringify(paramFacts.modes)}`);
    }

    // The engine's own view of `kind`. The old comment here said FluidEngine's
    // params were not globally exposed and told the reader to trust the store;
    // that is stale (header correction 3), and reading the store back after
    // writing it proves only that Zustand works.
    const engineKind = () => page.evaluate(() => {
        const eng = (globalThis as any).__appHandles?.['fluid-toy.engine']?.ref?.current;
        return eng ? (eng.params?.kind ?? '(engine has no params.kind)') : '(no engine handle)';
    });
    const bootEngineKind = await engineKind();
    if (bootEngineKind !== 'mandelbrot') {
        throw new Error(`FluidEngine.params.kind at boot is '${bootEngineKind}', expected 'mandelbrot' — the store index never reached the engine (grep syncJuliaToEngine in fluid-toy/features/julia.ts)`);
    }

    // Flip to Julia (0) — need to wait a frame for the effect to propagate.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ kind: 0 });
    });
    await page.waitForTimeout(300);

    const afterJulia = await page.evaluate(() => (window as any).__store.getState().julia?.kind);
    if (afterJulia !== 0) throw new Error(`after setting 0, got kind=${afterJulia}`);
    const engJulia = await engineKind();
    console.log(`kind=0 -> engine '${engJulia}'`);
    if (engJulia !== 'julia') throw new Error(`after setting kind=0 the engine reports '${engJulia}', expected 'julia'`);

    // Flip back to Mandelbrot.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ kind: 1 });
    });
    await page.waitForTimeout(300);

    const afterMandel = await page.evaluate(() => (window as any).__store.getState().julia?.kind);
    if (afterMandel !== 1) throw new Error(`after setting 1, got kind=${afterMandel}`);
    const engMandel = await engineKind();
    console.log(`kind=1 -> engine '${engMandel}'`);
    if (engMandel !== 'mandelbrot') throw new Error(`after setting kind=1 the engine reports '${engMandel}', expected 'mandelbrot'`);

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ julia.kind dropdown param round-trips (0 Julia, 1 Mandelbrot)`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
