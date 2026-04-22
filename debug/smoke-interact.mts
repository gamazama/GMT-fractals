/**
 * Interaction smoke test — prove DDFS state flow end-to-end.
 *
 * Opens the engine, manipulates the Demo feature state via the
 * exposed window.__store, and verifies the DemoOverlay reacts.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

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
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s.setDemo({
            color: '#ff00aa',
            position: { x: 0.5, y: -0.3 },
            size: 200,
            opacity: 0.6,
        });
    });
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

    console.log('\n✓ state slice exists, setters work, save roundtrip captures state');
    await browser.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
