/**
 * Smoke test: the deep-zoom tool (deep-zoom.html) on the REAL GPU.
 *
 *   npm run dev                      (port 3400), then
 *   npm run smoke:deep-zoom
 *   or against another port:  ENGINE_URL=http://localhost:3477 npm run smoke:deep-zoom
 *
 * Headed Chrome on ANGLE/d3d11, not the default headless Chromium: headless means SwiftShader,
 * and the perturbation shader either takes minutes to compile there or renders something that
 * proves nothing. For that reason this smoke is NOT in `debug/run-smokes.mts` (smoke:all).
 *
 * Checks, in order:
 *   1. the shell boots and the core reports ready within 120 s (store.bridge set, no error card);
 *   2. telemetry flows (two samples, a finite depth, the frame has a size);
 *   3. one bridge round trip (set detail, read it back through settings());
 *   4. the centre of a thumbnail is not black;
 *   5. each side panel opens through a TopBar button and closes on Escape (screenshot of each);
 *   6. a starter dive from the Locations panel changes the depth;
 *   7. "Save this view" adds a bookmark, it persists, and setView restores the camera;
 *   8. a flight is recorded through the Record panel while the camera moves (win.__moveAlong),
 *      lands in the store, and Preview plays it;
 *   9. no pageerror in the page or the frame, no error-boundary fallback.
 *
 * Screenshots go to debug/scratch/deep-zoom-*.png.
 * Every page.evaluate takes a STRING body: tsx injects `__name` into function callbacks.
 */
import { chromium } from 'playwright';

const ORIGIN = (process.env.ENGINE_URL || 'http://localhost:3400').replace(/\/+$/, '');
const URL = ORIGIN + '/deep-zoom.html';
const READY_TIMEOUT_MS = 120_000;
const SHOT = 'debug/scratch/deep-zoom-';

const PANELS: Array<[string, RegExp]> = [
    ['locations', /location|bookmark|places/i],
    ['record', /record|flight|path/i],
    ['look', /look|render|quality|colou?r/i],
    ['help', /help|keys|\?/i],
];

async function main() {
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
        args: [
            '--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu',
            '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
        ],
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
    const page = await ctx.newPage();

    const errors: string[] = [];
    const consoleErrors: string[] = [];
    const failures: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const check = (ok: boolean, what: string) => {
        console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
        if (!ok) failures.push(what);
    };
    const shot = async (name: string) => {
        await page.screenshot({ path: SHOT + name + '.png' }).catch(() => undefined);
        console.log('     shot ' + SHOT + name + '.png');
    };
    const ev = async <T,>(body: string) => (await page.evaluate(body)) as T;
    const depth = () => ev<number>("window.__dzStore.getState().bridge.telemetry().depth");

    console.log(`-> GET ${URL}`);
    await page.goto(URL, { waitUntil: 'load' });

    // 1. ready
    const t0 = Date.now();
    let ready = false;
    try {
        await page.waitForFunction(
            "(() => { const s = window.__dzStore && window.__dzStore.getState(); return !!(s && s.bridge) || !!document.querySelector('[data-dz-slot=error]'); })()",
            undefined, { timeout: READY_TIMEOUT_MS, polling: 250 },
        );
        ready = await ev<boolean>("!!window.__dzStore.getState().bridge");
    } catch { ready = false; }
    check(ready, `shell connected to the core (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    if (!ready) {
        const card = await ev<string>("(document.querySelector('[data-dz-slot=error]') || document.body).innerText.slice(0, 600)");
        console.log('     page says: ' + String(card).replace(/\s+/g, ' '));
    }

    if (ready) {
        // First run: the guide is on screen.
        await page.waitForTimeout(800);
        await shot('first-run');
        check((await page.locator('[data-dz-slot=onboarding] > *').count()) > 0, 'first run shows the guide');
        await ev("window.__dzStore.getState().setOnboarded(true)");

        // The deep shader may still be compiling behind an f32 picture.
        try {
            await page.waitForFunction("window.__dzStore.getState().bridge.telemetry().ready === true", undefined,
                { timeout: READY_TIMEOUT_MS, polling: 250 });
        } catch { /* reported by the check below */ }
        console.log(`     deep shader ready after ${((Date.now() - t0) / 1000).toFixed(1)} s`);

        // 2. telemetry
        const tA = await ev<string>("JSON.stringify(window.__dzStore.getState().telemetry)");
        await page.waitForTimeout(1500);
        const tB = await ev<string>("JSON.stringify(window.__dzStore.getState().telemetry)");
        const tel = JSON.parse(tB || 'null');
        console.log('     telemetry: ' + tB);
        check(!!tel && tel.ready === true, 'telemetry.ready');
        check(!!tel && Number.isFinite(tel.depth) && tel.depth > 0, 'telemetry.depth is a positive number');
        check(!!tel && tel.frameW > 0 && tel.frameH > 0, 'telemetry reports a frame size');
        check(!!tel && tel.fps > 0, 'telemetry.fps > 0 (the render loop is running)');
        check(!!tA && !!tB, 'two telemetry samples arrived');
        await shot('default');

        // 3. round trip
        const detail = await ev<number>(
            "(() => { const b = window.__dzStore.getState().bridge; const was = b.settings().detail; b.setDetail(3); const now = b.settings().detail; b.setDetail(was); return now; })()",
        );
        check(detail === 3, `bridge round trip: setDetail(3) reads back ${detail}`);

        // 4. picture
        const lum = await ev<number>(
            "(async () => { const url = window.__dzStore.getState().bridge.thumbnail(64); if (!url) return -1;"
            + " const img = new Image(); img.src = url; await img.decode();"
            + " const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.drawImage(img, 0, 0);"
            + " const d = g.getImageData(0, 0, 64, 64).data; let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i], d[i+1], d[i+2]); return m; })()",
        );
        check(lum > 8, `thumbnail is not black (brightest channel ${lum})`);

        // 5. panels through the top bar
        const bar = page.locator('[data-dz-slot=topbar]');
        check((await bar.locator('button').count()) > 0, 'the top bar has buttons');
        for (const [id, label] of PANELS) {
            await ev("window.__dzStore.getState().setPanel('none')");
            let btn = bar.locator(`[data-panel="${id}"], [data-dz-panel-button="${id}"]`).first();
            if ((await btn.count()) === 0) btn = bar.getByRole('button', { name: label }).last();
            if ((await btn.count()) === 0) { check(false, `top bar has a button for the ${id} panel`); continue; }
            await btn.click();
            await page.waitForTimeout(400);
            const open = await ev<string>("window.__dzStore.getState().panel");
            check(open === id, `top bar opens the ${id} panel (store.panel = ${open})`);
            const drawn = await page.locator(`[data-dz-slot=panel][data-dz-panel="${id}"] > *`).count();
            check(drawn > 0, `the ${id} panel rendered`);
            await shot('panel-' + id);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(150);
            const after = await ev<string>("window.__dzStore.getState().panel");
            check(after === 'none', `Escape closes the ${id} panel`);
        }

        // 6. a starter dive from the Locations panel
        await ev("window.__dzStore.getState().setPanel('locations')");
        await page.waitForTimeout(300);
        const panel = page.locator('[data-dz-slot=panel]');
        const dBefore = await depth();
        const dive = panel.getByRole('button', { name: 'Dive', exact: true }).nth(1);   // the second starter (1e-6)
        if ((await dive.count()) === 0) check(false, 'the Locations panel lists starter dives');
        else {
            await dive.click();
            let said = '';
            for (let i = 0; i < 90 && !said; i++) {
                await page.waitForTimeout(500);
                const txt = await panel.innerText();
                const m = txt.match(/(Arrived|Stopped at|Dive failed).*/);
                if (m) said = m[0];
            }
            await page.waitForTimeout(1000);
            const dAfter = await depth();
            console.log(`     starter dive: depth ${dBefore.toExponential(2)} -> ${dAfter.toExponential(2)} · panel says "${said}"`);
            check(dAfter > 0 && dAfter < 1e-5 && dAfter > 1e-7, `the 1e-6 starter dive lands within a decade of its target (${dAfter.toExponential(2)})`);
            check(/^Arrived/.test(said), `the panel reports arrival ("${said}")`);
            await shot('starter-dive');
        }

        // 7. bookmark through the panel button
        const n0 = await ev<number>("window.__dzStore.getState().bookmarks.length");
        await panel.getByRole('button', { name: /Save this view/ }).first().click();
        await page.waitForTimeout(600);
        const count = await ev<number>("window.__dzStore.getState().bookmarks.length");
        check(count === n0 + 1, `"Save this view" added a bookmark (${count} in the store)`);
        const stored = await ev<number>("(JSON.parse(localStorage.getItem('gmt.deepzoom.bookmarks.v1') || '[]')).length");
        check(stored === count, `bookmarks persisted (${stored} in localStorage)`);
        const thumbOk = await ev<boolean>("(() => { const b = window.__dzStore.getState().bookmarks[0]; return !!b && typeof b.thumb === 'string' && b.thumb.indexOf('data:image') === 0; })()");
        check(thumbOk, 'the bookmark carries a thumbnail');
        await shot('bookmark');
        const view = await ev<boolean>(
            "(() => { const s = window.__dzStore.getState(); const bm = s.bookmarks[0]; s.bridge.setView(bm.view); return JSON.stringify(s.bridge.getView().cam) === JSON.stringify(bm.view.cam); })()",
        );
        check(view, 'setView(bookmark.view) restores the exact camera strings');

        // 7b. the tool's keys (B saves a view, 2 opens Record, / opens Help, Esc closes)
        await ev("(() => { const s = window.__dzStore.getState(); s.setPanel('none'); s.bridge.focus(); })()");
        await page.waitForTimeout(200);
        await page.keyboard.press('b');
        await page.waitForTimeout(600);
        const afterB = await ev<number>("window.__dzStore.getState().bookmarks.length");
        check(afterB === count + 1, `the B key saves a view (${afterB} in the store)`);
        await page.keyboard.press('2');
        await page.waitForTimeout(300);
        check((await ev<string>("window.__dzStore.getState().panel")) === 'record', 'the 2 key opens the Record panel');
        await page.keyboard.press('/');
        await page.waitForTimeout(300);
        check((await ev<string>("window.__dzStore.getState().panel")) === 'help', 'the / key opens Help');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        check((await ev<string>("window.__dzStore.getState().panel")) === 'none', 'Escape closes it');

        // 8. record a flight while the camera moves, then preview it
        await ev("window.__dzStore.getState().setPanel('record')");
        await page.waitForTimeout(400);
        const rec = panel.getByRole('button', { name: /^Record \(M\)/ }).first();
        if ((await rec.count()) === 0) check(false, 'the Record panel has a Record button');
        else {
            await rec.click();
            await page.waitForTimeout(300);
            check(await ev<boolean>("window.__dzStore.getState().bridge.recording()"), 'recording started');
            // Fly: 30 small steps straight ahead, each 2% of the distance to the surface.
            for (let i = 0; i < 30; i++) {
                await ev(
                    "(() => { const b = window.__dzStore.getState().bridge; const v = b.getView(); const d = b.telemetry().depth;"
                    + " const cp = Math.cos(v.pitch), f = [cp * Math.cos(v.yaw), Math.sin(v.pitch), cp * Math.sin(v.yaw)];"
                    + " const w = b.win; const fwd = (w.__basis && w.__basis().fwd) || f; w.__moveAlong(fwd, d * 0.02); })()",
                );
                await page.waitForTimeout(80);
            }
            await shot('recording');
            await panel.getByRole('button', { name: /^Stop \(M\)/ }).first().click();
            await page.waitForTimeout(800);
            check(!(await ev<boolean>("window.__dzStore.getState().bridge.recording()")), 'recording stopped');
            const keys = await ev<number>("(() => { const p = window.__dzStore.getState().path; return p && p.frames ? p.frames.length : 0; })()");
            check(keys >= 2, `the flight landed in the store (${keys} keys)`);
            await page.waitForTimeout(1500);   // the panel reads the depth curve
            await shot('panel-record-flight');
            const prev = panel.getByRole('button', { name: /^Preview$/ }).first();
            if ((await prev.count()) === 0) check(false, 'the Record panel has a Preview button');
            else {
                await prev.scrollIntoViewIfNeeded();
                let enabled = false;
                for (let i = 0; i < 40 && !enabled; i++) { enabled = await prev.isEnabled(); if (!enabled) await page.waitForTimeout(250); }
                if (!enabled) {
                    console.log('     Preview is disabled: ' + (await prev.getAttribute('title')) + ' · ' + (await ev<string>("JSON.stringify(window.__dzStore.getState().bridge.telemetry())")));
                }
                await prev.click({ timeout: 3000, force: !enabled });
                let played = false;
                for (let i = 0; i < 20 && !played; i++) {
                    await page.waitForTimeout(100);
                    played = await ev<boolean>("window.__dzStore.getState().bridge.telemetry().playing === true");
                }
                check(played, 'Preview plays the flight (telemetry.playing)');
                await ev("window.__dzStore.getState().bridge.stopPlay()");
                await page.waitForTimeout(400);

                // 9. a short render: the top bar must show the frame count (the core's own
                //    progress box is hidden in the embed, so the shell reads it out).
                await ev(
                    "(() => { window.__dzSeen = []; window.__dzSeenId = setInterval(() => {"
                    + " const el = document.querySelector('[data-dz-slot=topbar]'); const m = el && /frame (\\d+)\\/(\\d+) /.exec(el.textContent || '');"
                    + " if (m) window.__dzSeen.push(m[1] + '/' + m[2]); }, 40);"
                    + " const s = window.__dzStore.getState();"
                    + " window.__dzRender = s.bridge.renderPath(s.path, { frames: 8, fps: 30, longEdge: 1280, samples: 4 }).then((r) => { window.__dzRenderDone = JSON.stringify(r || {}).slice(0, 200); }, (e) => { window.__dzRenderDone = 'ERR ' + e; }); })()",
                );
                let renderDone = '';
                for (let i = 0; i < 240 && !renderDone; i++) {
                    await page.waitForTimeout(500);
                    renderDone = (await ev<string>("window.__dzRenderDone || ''")) || '';
                }
                const seen = await ev<string[]>("(() => { clearInterval(window.__dzSeenId); return Array.from(new Set(window.__dzSeen)); })()");
                console.log(`     render: ${renderDone} · top bar showed ${JSON.stringify(seen)}`);
                check(!!renderDone && !/^ERR|"error"/.test(renderDone), 'an 8-frame render finished');
                check(seen.length > 0 && seen.every((x) => x.endsWith('/8')), `the top bar showed frame progress out of 8 (${seen.length} distinct readings)`);
            }
        }
        await ev("window.__dzStore.getState().setPanel('none')");
    }

    // 9. errors
    await page.waitForTimeout(500);
    const boundary = await ev<string>("window.__lastBoundaryError ? String(window.__lastBoundaryError.message || window.__lastBoundaryError) : ''");
    check(!boundary, 'no error-boundary fallback' + (boundary ? `: ${boundary}` : ''));
    check(errors.length === 0, `no pageerror (${errors.length})`);
    for (const e of errors) console.log('     ' + e);
    if (consoleErrors.length) {
        console.log(`  note ${consoleErrors.length} console.error line(s) (not a failure):`);
        for (const e of consoleErrors.slice(0, 8)) console.log('     ' + e.slice(0, 300));
    }

    await shot('smoke');
    await browser.close();

    if (failures.length) {
        console.log(`\nFAILED (${failures.length}):`);
        for (const f of failures) console.log('  - ' + f);
        process.exit(1);
    }
    console.log('\nPASS smoke:deep-zoom');
}

main().catch((err) => {
    console.error('smoke-deep-zoom crashed:', err);
    process.exit(2);
});
