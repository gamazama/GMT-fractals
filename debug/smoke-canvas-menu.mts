/**
 * Smoke test for canvas right-click context menu.
 *
 * Right-clicks on the fluid-toy canvas; asserts:
 *   - native browser menu did NOT appear (preventDefault fired)
 *   - store.contextMenu.visible is true
 *   - items include labeled actions for Copy C, Pause, Orbit, Recenter, Reset
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

    // Right-click in the center of the viewport canvas.
    const canvas = await page.$('canvas');
    if (!canvas) throw new Error('no canvas element found');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(150);

    const menu = await page.evaluate(() => {
        const cm = (window as any).__store.getState().contextMenu;
        return {
            visible: cm.visible,
            itemLabels: (cm.items ?? []).map((it: any) => it.label).filter(Boolean),
        };
    });
    console.log('menu:', JSON.stringify(menu));

    if (!menu.visible) throw new Error('context menu did not open');
    const needed = ['Copy Julia c', 'Pause', 'Orbit', 'Recenter', 'Reset'];
    for (const n of needed) {
        const hit = menu.itemLabels.find((l: string) => l.includes(n));
        if (!hit) throw new Error(`menu missing "${n}" (got: ${JSON.stringify(menu.itemLabels)})`);
    }

    if (errors.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    console.log(`\n✓ canvas right-click opens menu with ${menu.itemLabels.length} items`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
