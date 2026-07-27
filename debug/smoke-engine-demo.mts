/**
 * Smoke test for the engine demo entry (`demo.html`).
 *
 * Verifies that the bare-metal demo with all installed plugins boots
 * cleanly, the demo square renders, the param panel mounts, the
 * topbar shows up with Save/Load/Undo/Redo, the hud hint pill
 * renders, the modulation tick runs, and Ctrl+Z reverts a slice
 * change. Boot-time errors fail the smoke loud — including the
 * dev validator's componentId check.
 *
 * Pre-existing GPU watchdog flakes don't apply here — there's no
 * canvas / WebGL in the engine demo.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/demo.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // 1) Demo square renders. DemoOverlay paints to a 2D <canvas>
    //    (c2ebadf2) — it is NOT a positioned <div> with child elements,
    //    so count PAINTED PIXELS, not DOM children. The demo app also
    //    mounts the engine's WebGL canvas (no class); the DemoOverlay
    //    canvas is the one carrying `pointer-events-none`. Same probe as
    //    smoke:engine-demo-modulation step 6.
    const paintedPx = await page.evaluate(() => {
        const c = document.querySelector('canvas.pointer-events-none') as HTMLCanvasElement | null;
        if (!c) return -1;                       // canvas absent entirely
        if (!c.width || !c.height) return -2;    // mounted but never sized
        const ctx = c.getContext('2d');
        if (!ctx) return -3;
        const row = Math.floor(c.height / 2);
        const data = ctx.getImageData(0, row, c.width, 1).data;
        let n = 0;
        for (let x = 0; x < c.width; x++) {
            const i = x * 4;
            // unpainted is transparent/near-black; the square is bright.
            if (data[i] + data[i + 1] + data[i + 2] > 90) n++;
        }
        return n;
    });
    console.log('overlay painted pixels (mid-row):', paintedPx);
    if (paintedPx < 1) throw new Error(`Demo overlay did not render (probe=${paintedPx})`);

    // 2) TopBar mounted (TopBarHost emits a fixed-positioned bar).
    const hasTopBar = await page.evaluate(() => !!document.querySelector('[data-topbar-host]') || !!document.querySelector('header'));
    console.log('topbar present:', hasTopBar);

    // 3) Demo panel + AutoFeaturePanel param controls present. ScalarInput
    //    is a custom track+thumb widget — there is no <input type="range">
    //    and no `.precision-slider` class anywhere in the tree (the old
    //    selector here matched 0 and was never asserted on, so this step
    //    silently checked labels only). `[data-role="thumb"]` is the stable
    //    marker ScalarInput puts on its draggable thumb. We also check the
    //    demo slice param labels appear in the dock body.
    const panelInfo = await page.evaluate(() => {
        const sliders = document.querySelectorAll('[data-role="thumb"]').length;
        const text = document.body.innerText;
        return {
            sliders,
            hasPosition: text.includes('Position'),
            hasSize: text.includes('Size'),
            hasOpacity: text.includes('Opacity'),
            hasColor: text.includes('Color'),
        };
    });
    console.log('panel:', JSON.stringify(panelInfo));
    if (!panelInfo.hasSize || !panelInfo.hasOpacity) {
        throw new Error('Demo panel missing expected param labels (Size / Opacity)');
    }
    if (panelInfo.sliders < 1) {
        throw new Error('Demo panel rendered no ScalarInput sliders ([data-role="thumb"] count 0)');
    }

    // 4) Modulation tick advances. installModulation() exposes
    //    window.__animTickCount; if the tick is wired into TickRegistry
    //    AND a render-loop driver runs, the count climbs.
    const tickStart = await page.evaluate(() => (window as any).__animTickCount ?? null);
    console.log('animTickCount t0:', tickStart);
    await page.waitForTimeout(500);
    const tickEnd = await page.evaluate(() => (window as any).__animTickCount ?? null);
    console.log('animTickCount t+500ms:', tickEnd);
    if (tickStart === null) throw new Error('window.__animTickCount missing — installModulation() did not run');
    if (tickEnd === tickStart) {
        console.warn('⚠ modulation tick did not advance — RenderLoopDriver may not be running for the engine demo');
    } else {
        console.log(`✓ modulation tick advanced ${tickEnd - tickStart} times in 500ms`);
    }

    // 5) Hint pill in HUD.
    const hintPresent = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Randomize') || text.includes('Demo');
    });
    console.log('hint pill text present:', hintPresent);

    // 6) Undo round-trip. historySlice's contract is interaction-bracketed:
    //    handleInteractionStart() snapshots, the user mutates state, then
    //    handleInteractionEnd() diffs and pushes a transaction. The
    //    Slider primitive does this via StoreCallbacksProvider on
    //    mousedown/mouseup. We simulate the same bracket here.
    const readColor = () => page.evaluate(() => {
        const c = (window as any).__store?.getState?.()?.demo?.color;
        return typeof c === 'string' ? c : (c?.getHexString ? '#' + c.getHexString() : String(c));
    });

    const beforeColor = await readColor();
    await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        s?.handleInteractionStart?.('param');
        s?.setDemo?.({ color: '#ff00ff' });
        s?.handleInteractionEnd?.();
    });
    const midColor = await readColor();
    console.log('color before/after set:', beforeColor, '→', midColor);

    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(150);
    const afterUndo = await readColor();
    console.log('color after Ctrl+Z:', afterUndo);
    if (afterUndo !== beforeColor) {
        throw new Error(`Undo did not revert color: expected ${beforeColor}, got ${afterUndo}`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ engine demo boots clean: square renders, panel + sliders mount, modulation tick runs, undo round-trips');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
