/**
 * Smoke test for @engine/camera slot save/recall + preset round-trip.
 *
 * Verifies:
 *   1. saveSlot(n) captures adapter's current state
 *   2. mutating the camera then recallSlot(n) restores
 *   3. slot state round-trips via getPreset / loadPreset
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

    // Expose camera plugin on window for smoke testing.
    await page.addInitScript(`
        window.__cameraPlugin = null;
    `);

    // Step 1: set an initial camera state and save to slot 3.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setSceneCamera({ center: { x: 0.5, y: -0.25 }, zoom: 2 });
    });
    await page.waitForTimeout(100);

    const initialCam = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return { ...s.sceneCamera };
    });
    console.log('initial camera:', JSON.stringify(initialCam));

    // Trigger saveSlot via the camera plugin. We import it via a dynamic
    // expression since it's not exposed on window.
    const savedOk = await page.evaluate(() => {
        return (window as any).__camera.saveSlot(3, 'Test slot');
    });
    console.log('saveSlot(3):', savedOk);
    if (!savedOk) throw new Error('saveSlot returned false');

    const slotsAfterSave = await page.evaluate(() => (window as any).__store.getState().cameraSlots);
    console.log('cameraSlots after save:', JSON.stringify(slotsAfterSave?.[3]));
    if (!slotsAfterSave?.[3]) throw new Error('slot 3 empty after save');
    if (slotsAfterSave[3].label !== 'Test slot') throw new Error('label mismatch');

    // Step 2: mutate the camera to something different.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setSceneCamera({ center: { x: -1, y: 1 }, zoom: 0.5 });
    });
    await page.waitForTimeout(100);

    // Step 3: recall slot 3 → camera should return to initial.
    await page.evaluate(() => {
        (window as any).__camera.recallSlot(3);
    });
    await page.waitForTimeout(100);

    const afterRecall = await page.evaluate(() => ({ ...(window as any).__store.getState().sceneCamera }));
    console.log('after recall:', JSON.stringify(afterRecall));
    if (Math.abs(afterRecall.center.x - initialCam.center.x) > 1e-6) {
        throw new Error(`recall failed for center.x: expected ${initialCam.center.x}, got ${afterRecall.center.x}`);
    }
    if (Math.abs(afterRecall.zoom - initialCam.zoom) > 1e-6) {
        throw new Error(`recall failed for zoom: expected ${initialCam.zoom}, got ${afterRecall.zoom}`);
    }

    // Step 4: preset round-trip — capture preset, mutate, load preset, verify slot survived.
    const preset = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return JSON.stringify(s.getPreset({ includeScene: true }));
    });
    const parsed = JSON.parse(preset);
    if (!parsed.cameraSlots || !parsed.cameraSlots[3]) {
        throw new Error('preset does not include cameraSlots[3]');
    }

    // Mutate slots, then load preset → slot 3 should restore.
    await page.evaluate(() => {
        (window as any).__camera.clearSlot(3);
    });
    await page.evaluate((json: string) => {
        (window as any).__store.getState().loadPreset(JSON.parse(json));
    }, preset);
    await page.waitForTimeout(150);

    const afterLoad = await page.evaluate(() => (window as any).__store.getState().cameraSlots?.[3]);
    if (!afterLoad || afterLoad.label !== 'Test slot') {
        throw new Error(`loadPreset did not restore slot 3 (got ${JSON.stringify(afterLoad)})`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ camera slot save → recall → preset roundtrip all exact');
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
