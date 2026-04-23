/**
 * Smoke test for canvas pan/zoom gestures.
 *
 * Exercises the three paths added in FluidPointerLayer:
 *   1. wheel          → scene camera zoom advances (cursor-anchored).
 *   2. right-drag     → scene camera center advances, context menu
 *                       suppressed after drag.
 *   3. right-click    → context menu opens (no drag).
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

    const canvas = await page.$('canvas');
    if (!canvas) throw new Error('no canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas bbox');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const read = () => page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            centerX: s.sceneCamera?.center?.x,
            centerY: s.sceneCamera?.center?.y,
            zoom: s.sceneCamera?.zoom,
            menuVisible: s.contextMenu?.visible,
        };
    });

    const baseline = await read();
    console.log('baseline:     ', JSON.stringify(baseline));

    // ── 1. Wheel zoom ────────────────────────────────────────────────
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -200);  // scroll up → zoom in
    await page.waitForTimeout(100);
    const afterWheel = await read();
    console.log('after wheel:  ', JSON.stringify(afterWheel));
    if (afterWheel.zoom === baseline.zoom) {
        throw new Error(`wheel did not change zoom (still ${afterWheel.zoom})`);
    }
    if (afterWheel.zoom > baseline.zoom) {
        throw new Error(`wheel up should zoom IN (smaller zoom value), got ${afterWheel.zoom} > ${baseline.zoom}`);
    }

    // Reset so the drag test starts from a known state.
    await page.evaluate(() => {
        (window as any).__store.getState().setSceneCamera({ center: { x: 0, y: 0 }, zoom: 1.5 });
        (window as any).__store.getState().closeContextMenu();
    });
    await page.waitForTimeout(50);

    // ── 2. Right-drag pan (travel > threshold) ───────────────────────
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx + 200, cy + 50, { steps: 10 });
    const duringDrag = await read();
    console.log('during drag:  ', JSON.stringify(duringDrag));
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(100);
    const afterDrag = await read();
    console.log('after drag:   ', JSON.stringify(afterDrag));

    if (duringDrag.centerX === 0) {
        throw new Error(`pan did not move center during drag (still ${duringDrag.centerX})`);
    }
    if (afterDrag.menuVisible) {
        throw new Error(`context menu opened after pan drag — should be suppressed`);
    }

    // ── 3. Right-click without drag opens the menu ───────────────────
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(100);
    const afterClick = await read();
    console.log('after click:  ', JSON.stringify(afterClick));
    if (!afterClick.menuVisible) {
        throw new Error(`right-click without drag should open menu; it didn't`);
    }

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ wheel zoom, right-drag pan, right-click menu all behave correctly`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
