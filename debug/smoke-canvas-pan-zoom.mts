/**
 * Smoke test for canvas pan/zoom gestures.
 *
 * Exercises the three paths added in FluidPointerLayer:
 *   1. wheel          → scene camera zoom advances (cursor-anchored).
 *   2. right-drag     → scene camera center advances, context menu
 *                       suppressed after drag.
 *   3. right-click    → context menu opens (no drag).
 *
 * ⚠ Two blind spots measured in the 2026-07-29 guard sweep, both reverted:
 *
 *   - **The wheel fixture was DEGENERATE for the anchoring half.** It dispatched
 *     the WheelEvent at the exact canvas centre, where `u = v = 0.5` and the
 *     whole anchor term `(u*2-1) * aspect * dzoom` is identically zero. Deleting
 *     cursor anchoring outright (`dx = dy = 0` in
 *     fluid-toy/pointer/gestures/wheel.ts) left this smoke exit 0 with
 *     byte-identical output. The off-centre wheel below is the fix; keep the
 *     centred one, it is what pins the zoom DIRECTION.
 *   - **Only `centerX` was asserted on the pan.** Zeroing `dVert` in
 *     gestures/pan.ts — vertical panning gone, and the axis the `transpose`
 *     branch swaps — moved centerY from 0.178 to 0 and the smoke stayed green.
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

    // The 2D scene camera lives on the julia slice now (center + zoom).
    const read = () => page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            centerX: s.julia?.center?.x,
            centerY: s.julia?.center?.y,
            zoom: s.julia?.zoom,
            menuVisible: s.contextMenu?.visible,
        };
    });

    const baseline = await read();
    console.log('baseline:     ', JSON.stringify(baseline));

    // ── 1. Wheel zoom ────────────────────────────────────────────────
    // Playwright's page.mouse.wheel does NOT trigger the canvas's
    // {passive:false} wheel listener in headless Chromium, so dispatch a
    // real WheelEvent on the canvas instead. The handler debounces a
    // commit to the store on a 100ms idle timer, so wait for julia.zoom
    // to actually change rather than racing a fixed timeout.
    await page.evaluate(({ x, y }) => {
        const c = document.querySelector('canvas')!;
        c.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -200, clientX: x, clientY: y, bubbles: true, cancelable: true,
        }));
    }, { x: cx, y: cy });
    await page.waitForFunction(
        (z0) => (window as any).__store.getState().julia.zoom !== z0,
        baseline.zoom,
        { timeout: 3000 },
    ).catch(() => { /* fall through to the assertion below for a clear message */ });
    const afterWheel = await read();
    console.log('after wheel:  ', JSON.stringify(afterWheel));
    if (afterWheel.zoom === baseline.zoom) {
        throw new Error(`wheel did not change zoom (still ${afterWheel.zoom})`);
    }
    if (afterWheel.zoom > baseline.zoom) {
        throw new Error(`wheel up should zoom IN (smaller zoom value), got ${afterWheel.zoom} > ${baseline.zoom}`);
    }

    // ── 1b. Wheel is CURSOR-ANCHORED ─────────────────────────────────
    // The centred wheel above cannot see this: at u = v = 0.5 the anchor term
    // is multiplied by zero. Zoom in with the cursor up and to the right of
    // centre and the world point under it must stay put, which means the centre
    // moves toward it — +x and +y (v is y-flipped, so a cursor ABOVE centre
    // gives v > 0.5). See the header.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ center: { x: 0, y: 0 }, centerLow: { x: 0, y: 0 }, zoom: 1.5 });
    });
    await page.waitForTimeout(250); // outlast the wheel handler's 100ms commit timer
    const anchorBase = await read();
    await page.evaluate(({ x, y }) => {
        const c = document.querySelector('canvas')!;
        c.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -400, clientX: x, clientY: y, bubbles: true, cancelable: true,
        }));
    }, { x: box.x + box.width * 0.75, y: box.y + box.height * 0.25 });
    await page.waitForFunction(
        () => (window as any).__store.getState().julia.zoom !== 1.5,
        undefined,
        { timeout: 3000 },
    ).catch(() => { /* assertions below give the clear message */ });
    const afterAnchored = await read();
    console.log('after off-centre wheel:', JSON.stringify(afterAnchored));
    if (!(afterAnchored.zoom < anchorBase.zoom)) {
        throw new Error(`off-centre wheel up should still zoom IN: ${anchorBase.zoom} → ${afterAnchored.zoom}`);
    }
    const dCx = afterAnchored.centerX - anchorBase.centerX;
    const dCy = afterAnchored.centerY - anchorBase.centerY;
    console.log(`anchor shift: dx=${dCx} dy=${dCy}`);
    if (!(dCx > 1e-6) || !(dCy > 1e-6)) {
        throw new Error(
            `wheel is not cursor-anchored — zooming in at (0.75w, 0.25h) must pull the centre toward that point ` +
            `(+x and +y), got dx=${dCx} dy=${dCy}. A centred wheel cannot detect this: the anchor term is ` +
            `multiplied by (u*2-1), which is 0 at the centre.`,
        );
    }

    // Reset so the drag test starts from a known state.
    await page.evaluate(() => {
        (window as any).__store.getState().setJulia({ center: { x: 0, y: 0 }, centerLow: { x: 0, y: 0 }, zoom: 1.5 });
        (window as any).__store.getState().closeContextMenu();
    });
    await page.waitForTimeout(250);

    // ── 2. Right-drag pan (travel > threshold) ───────────────────────
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx + 200, cy + 50, { steps: 10 });
    const duringDrag = await read();
    console.log('during drag:  ', JSON.stringify(duringDrag));
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(150);
    const afterDrag = await read();
    console.log('after drag:   ', JSON.stringify(afterDrag));

    // Pan bypasses the store during the gesture and commits one setJulia on
    // pointerup (see pointer/handlers.ts), so assert on the committed value.
    if (!afterDrag.centerX || Math.abs(afterDrag.centerX) < 1e-9) {
        throw new Error(`pan did not move center (after drag still ${afterDrag.centerX})`);
    }
    // Both axes. The drag is (+200, +50) px, so centerY must move too — and it
    // is the axis gestures/pan.ts's `transpose` branch swaps.
    if (!afterDrag.centerY || Math.abs(afterDrag.centerY) < 1e-9) {
        throw new Error(`pan moved centerX but not centerY (${afterDrag.centerY}) — the vertical half of the gesture is dead; grep dVert in fluid-toy/pointer/gestures/pan.ts`);
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
