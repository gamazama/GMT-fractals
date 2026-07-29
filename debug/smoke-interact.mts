/**
 * Interaction smoke test — prove DDFS state flow end-to-end.
 *
 * Opens the engine, manipulates the Demo feature state via the
 * exposed window.__store, and verifies the DemoOverlay reacts.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/demo.html';

/**
 * The values written by the single setDemo call below, and the values every
 * assertion checks for — one literal so a fixture edit cannot drift away from
 * what is asserted. Deliberately distinctive and asymmetric: position.x !==
 * position.y and both are non-zero, so an axis swap or a dropped component is
 * visible; color is full-scale in R and zero in G, which survives any sRGB /
 * linear transfer function exactly (f(0) = 0, f(1) = 1).
 */
const MUTATED = { color: '#ff00aa', position: { x: 0.5, y: -0.3 }, size: 200, opacity: 0.6 };

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    // Page-error gate, matching every other smoke in this family. Without it a
    // DemoOverlay that throws on every render left this smoke at exit 0 —
    // measured 2026-07-29 — while the docstring claimed it "verifies the
    // DemoOverlay reacts". Nothing here can assert on the overlay's pixels, but
    // an overlay that cannot render at all is now a failure.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Confirm the demo state slice exists
    const initialDemo = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return s?.demo;
    });
    console.log('initial demo state:', JSON.stringify(initialDemo));
    if (!initialDemo || typeof initialDemo.size !== 'number') {
        throw new Error('demo slice missing from store');
    }

    // 2. Mutate state via the DDFS auto-generated setter
    await page.evaluate((m) => {
        const s = (window as any).__store?.getState?.();
        s.setDemo({ ...m });
    }, MUTATED);
    await page.waitForTimeout(200);

    const afterMutate = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return s?.demo;
    });
    console.log('after mutate:', JSON.stringify(afterMutate));
    // color is auto-sanitized to a THREE.Color instance by createFeatureSlice,
    // so we check the numeric fields (size + position + opacity) and accept
    // either a hex string or a {r,g,b} object for color.
    if (afterMutate.size !== 200 || afterMutate.opacity !== 0.6) {
        throw new Error('state mutation did not persist');
    }
    // The two params the scalar check above cannot see. Both were being mutated
    // and neither was asserted: the guard sweep on 2026-07-29 made
    // createFeatureSlice's vec2 branch write Vector2(0, 0) and its color branch
    // write a hard-coded green, and this smoke exited 0 both times printing
    // "setters work, save roundtrip captures state". vec2 and color are exactly
    // the two branches of that sanitiser most likely to break, since they are
    // the ones that construct a new object rather than passing the value through.
    if (afterMutate.position?.x !== MUTATED.position.x || afterMutate.position?.y !== MUTATED.position.y) {
        throw new Error(`vec2 param did not persist: position is ${JSON.stringify(afterMutate.position)}, expected ${JSON.stringify(MUTATED.position)}`);
    }
    // '#ff00aa' → r = 1, g = 0 exactly, whatever the transfer function. b is
    // left unasserted here precisely because it is the component colour
    // management moves (0xaa reads back as 0.402 linear); the preset check
    // below pins the full value in hex, where the round-trip is exact.
    if (afterMutate.color?.r !== 1 || afterMutate.color?.g !== 0) {
        throw new Error(`color param did not persist: got ${JSON.stringify(afterMutate.color)}, expected r=1 g=0 from ${MUTATED.color}`);
    }

    // 3. Capture the mutated viewport
    await page.screenshot({ path: 'debug/scratch/engine-boot.png' });

    // 4. Roundtrip save → parse via SceneFormat (via store.getPreset)
    const sceneJson = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        const preset = s.getPreset({ includeScene: true });
        return JSON.stringify(preset);
    });
    const parsed = JSON.parse(sceneJson);
    console.log('getPreset features.demo:', JSON.stringify(parsed.features?.demo));
    if (!parsed.features?.demo || parsed.features.demo.size !== 200) {
        throw new Error('save roundtrip did not include mutated demo state');
    }
    // Serialising ONE scalar proved nothing about the two params that need a
    // conversion on the way out — the vec2 and the THREE.Color → hex.
    const d = parsed.features.demo;
    for (const [key, want] of [['opacity', MUTATED.opacity], ['color', MUTATED.color]] as [string, unknown][]) {
        if (d[key] !== want) throw new Error(`save roundtrip lost ${key}: got ${JSON.stringify(d[key])}, expected ${JSON.stringify(want)}`);
    }
    if (d.position?.x !== MUTATED.position.x || d.position?.y !== MUTATED.position.y) {
        throw new Error(`save roundtrip lost position: got ${JSON.stringify(d.position)}, expected ${JSON.stringify(MUTATED.position)}`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ state slice exists, setters work, save roundtrip captures state (size, opacity, vec2 position, color)');
    await browser.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
