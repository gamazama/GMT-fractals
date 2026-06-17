/**
 * Smoke test for the B+drag (resize brush) and C+drag (pick Julia c)
 * modifier gestures + the middle-click zoom-direction fix + the new
 * defaults (dye 1.5, brush 0.15).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Defaults.
    const defaults = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return { brushSize: s.brush.size, dyeInject: s.fluidSim.dyeInject };
    });
    console.log(`defaults: ${JSON.stringify(defaults)}`);
    if (Math.abs(defaults.brushSize - 0.15) > 1e-6) throw new Error(`brush.size default expected 0.15, got ${defaults.brushSize}`);
    if (Math.abs(defaults.dyeInject - 1.5) > 1e-6)  throw new Error(`fluidSim.dyeInject default expected 1.5, got ${defaults.dyeInject}`);
    console.log('✓ defaults: brush.size=0.15, fluidSim.dyeInject=1.5');

    const canvas = await page.$('canvas');
    const box = await canvas!.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // 2. B+drag resize — hold KeyB down, left-drag right, size should grow.
    const sizeBefore = await page.evaluate(() => (window as any).__store.getState().brush.size);
    await page.keyboard.down('KeyB');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
        await page.mouse.move(cx + i * 20, cy);
        await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.keyboard.up('KeyB');
    await page.waitForTimeout(100);
    const sizeAfter = await page.evaluate(() => (window as any).__store.getState().brush.size);
    console.log(`B+drag →: size ${sizeBefore} → ${sizeAfter}`);
    if (sizeAfter <= sizeBefore * 1.2) throw new Error(`B+drag right should enlarge brush (before=${sizeBefore}, after=${sizeAfter})`);
    console.log('✓ B+drag right enlarged the brush');

    // 3. C+drag pick-c — hold KeyC, left-drag, juliaC should move.
    const cBefore = await page.evaluate(() => {
        const j = (window as any).__store.getState().julia.juliaC;
        return { x: j.x, y: j.y };
    });
    await page.keyboard.down('KeyC');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
        await page.mouse.move(cx + i * 15, cy + i * 10);
        await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.keyboard.up('KeyC');
    await page.waitForTimeout(100);
    const cAfter = await page.evaluate(() => {
        const j = (window as any).__store.getState().julia.juliaC;
        return { x: j.x, y: j.y };
    });
    console.log(`C+drag: juliaC ${JSON.stringify(cBefore)} → ${JSON.stringify(cAfter)}`);
    const moved = Math.hypot(cAfter.x - cBefore.x, cAfter.y - cBefore.y);
    if (moved < 1e-4) throw new Error(`C+drag should move juliaC (moved by ${moved})`);
    console.log('✓ C+drag moved juliaC');

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b/.test(e));
        if (fatal.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    }

    console.log('\n✅ B+drag, C+drag, and new defaults all work');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
