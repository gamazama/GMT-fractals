/**
 * smoke:statelibrary-drop — drag/drop contract for <StateLibraryPanel> rows.
 *
 * Two assertions, driven against app-gmt's Camera Manager (the primitive's
 * biggest consumer) at http://localhost:3400/:
 *
 *   1. REORDER — a drag started from a row's drag handle and dropped on
 *      another row calls `onReorder`, so `savedCameras` order changes.
 *      Guards the intra-list drag path.
 *
 *   2. PASSTHROUGH — an OS *file* drop landing on a row must NOT be claimed
 *      by the panel. `SceneFileDropZone` (window-level) defers to any inner
 *      target that already called `preventDefault()`
 *      (`if (e.defaultPrevented) return`), so a row that preventDefaults
 *      every drop silently swallows scene-file drops that land on it — no
 *      load, no warning toast, which reads to the user as "the drop broke".
 *      The row must therefore only claim drags IT started.
 *
 * These two pull in opposite directions — that is the point. A fix for (2)
 * that over-reaches breaks (1), and a fix for (1) that preventDefaults
 * unconditionally breaks (2).
 *
 * In-page code is passed as STRINGS on purpose: tsx's transform injects a
 * `__name` helper into serialized closures, which does not exist in the page.
 *
 * Run: `npm run smoke:statelibrary-drop` (needs `npm run dev` on :3400).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

const ROW_SEL = `[title="Drag to reorder"]`;

const SEED = `(() => {
    window.__store.setState({
        savedCameras: [
            { id: 'sl-a', label: 'Alpha', state: {}, createdAt: 1 },
            { id: 'sl-b', label: 'Beta',  state: {}, createdAt: 2 },
        ],
        activeCameraId: null,
    });
    const tp = window.__store.getState().togglePanel;
    if (tp) tp('Camera Manager', true);
    return true;
})()`;

const INSTALL = `(() => {
    window.__slRows = function () {
        return Array.prototype.map.call(
            document.querySelectorAll('${ROW_SEL}'),
            function (h) { return h.parentElement; },
        );
    };
    window.__slDT = new DataTransfer();
    window.__slFire = function (type, index, useFile) {
        var dt;
        if (useFile) {
            dt = new DataTransfer();
            dt.items.add(new File(['x'], 'zzz-not-a-scene.txt', { type: 'text/plain' }));
        } else {
            dt = window.__slDT;
        }
        var rows = window.__slRows();
        var row = rows[index];
        if (!row) return { error: 'no row ' + index };
        var target = type === 'dragstart' ? row.querySelector('${ROW_SEL}') : row;
        var seen = null;
        var spy = function (e) { seen = e.defaultPrevented; };
        window.addEventListener('drop', spy, false);
        target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
        window.removeEventListener('drop', spy, false);
        return { seenAtWindow: seen };
    };
    window.__slLabels = function () {
        return window.__store.getState().savedCameras.map(function (c) { return c.label; }).join(',');
    };
    window.__slWarned = function () { return document.body.innerText.indexOf("Can't load") >= 0; };
    return true;
})()`;

let failures = 0;
const check = (name: string, ok: boolean, detail: string) => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  — ${detail}`);
};

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('pageerror:', e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!window.__store', null, { timeout: 60000 });
    await page.waitForTimeout(4000);

    await page.evaluate(SEED);
    await page.waitForTimeout(1200);

    const rows = await page.evaluate(`document.querySelectorAll('${ROW_SEL}').length`);
    if (rows !== 2) throw new Error(`expected 2 Camera Manager rows, saw ${rows} — smoke cannot run`);
    await page.evaluate(INSTALL);

    // ── 1. REORDER ──────────────────────────────────────────────────────
    // Separate evaluate calls so React flushes each drag event's state
    // update before the next one is dispatched (a real drag has gaps too).
    const before = await page.evaluate(`window.__slLabels()`);
    await page.evaluate(`window.__slFire('dragstart', 0, false)`);
    await page.waitForTimeout(120);
    await page.evaluate(`window.__slFire('dragover', 1, false)`);
    await page.waitForTimeout(120);
    await page.evaluate(`window.__slFire('drop', 1, false)`);
    await page.waitForTimeout(300);
    const after = await page.evaluate(`window.__slLabels()`);
    check('reorder: drag row 0 onto row 1 swaps order', before === 'Alpha,Beta' && after === 'Beta,Alpha',
        `before=${before} after=${after}`);

    // ── 2. PASSTHROUGH ──────────────────────────────────────────────────
    // Control first: the same file dropped on <body> must warn, proving
    // SceneFileDropZone is live and the synthetic event is well-formed.
    await page.evaluate(`(() => {
        var dt = new DataTransfer();
        dt.items.add(new File(['x'], 'zzz-not-a-scene.txt', { type: 'text/plain' }));
        document.body.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        return true;
    })()`);
    await page.waitForTimeout(700);
    const controlWarned = await page.evaluate(`window.__slWarned()`);
    check('passthrough control: file drop on <body> warns', controlWarned === true,
        `warned=${controlWarned}`);

    await page.waitForTimeout(4500); // let the toast expire
    const cleared = await page.evaluate(`!window.__slWarned()`);
    if (!cleared) throw new Error('control toast never cleared — cannot measure the row case');

    await page.evaluate(`window.__slFire('drop', 0, true)`);
    await page.waitForTimeout(700);
    const rowWarned = await page.evaluate(`window.__slWarned()`);
    check('passthrough: file drop on a row is NOT claimed by the panel', rowWarned === true,
        `warned=${rowWarned} (false = the row swallowed the OS file drop)`);

    await browser.close();

    if (failures > 0) {
        console.error(`\n${failures} StateLibraryPanel drop case(s) failed`);
        process.exit(1);
    }
    console.log('\nAll StateLibraryPanel drop cases passed');
}

main().catch((e) => { console.error('SMOKE FAILED:', e.message); process.exit(1); });
