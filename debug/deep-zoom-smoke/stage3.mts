/**
 * smoke:deep-zoom, stage 3 - locations, scene files, links.
 *
 *   ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage 3
 *
 * What the steps lean on (deep-zoom/locations.ts, components/LocationsPanel.tsx, StarterDives.tsx):
 *   - The Locations tab is `button[data-gx-mode-tab="Locations"]`; a starter card is
 *     `[data-dz-starter]`; the save button is `[data-dz-save-location]`; a row's depth line is
 *     `[data-dz-location-depth]`.
 *   - The list is `store.savedLocations` (each row `{ id, label, thumbnail, state: { view, look,
 *     depth } }`) and is mirrored to `localStorage['gmt.deepZoom.locations']`.
 *   - Slot digits are positions in the STORED list (the first place saved is 1), whatever order
 *     the panel shows. They act only with the pointer free.
 *   - Camera values are compared as strings, byte for byte.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import { DEEP_VIEW, enterDeepView } from './stage1.mts';

const DEPTH_TEXT = /^\d\.\d\de-?\d+$/;
const cam = (ctx: DzCtx) => ctx.host<string[]>('getView().cam');
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const rows = (ctx: DzCtx) => ctx.ev<Array<{ id: string; label: string; depth: string; cam: string[]; thumb: string }>>(
    "(window.__store.getState().savedLocations || []).map((r) => ({ id: r.id, label: r.label, depth: r.state.depth, cam: r.state.view.cam, thumb: (r.thumbnail || '').slice(0, 22) }))");
const openLocations = async (ctx: DzCtx) => { await ctx.page.locator('button[data-gx-mode-tab="Locations"]').click(); await ctx.sleep(150); };

/** A fresh app with no saved places, the picture focused. */
async function fresh(ctx: DzCtx): Promise<void> {
    await ctx.boot({ clearStorage: true });
    await openLocations(ctx);
}

/** Save the current view with B and wait for the row and its thumbnail. */
async function saveWithB(ctx: DzCtx, expectCount: number): Promise<boolean> {
    await ctx.focusPicture();
    await ctx.page.keyboard.press('b');
    const ok = (await ctx.until('(window.__store.getState().savedLocations || []).length === ' + expectCount + " && !!(window.__store.getState().savedLocations[" + (expectCount - 1) + '].thumbnail)', 6000)) >= 0;
    return ctx.check(ok, 'B saved a location (' + expectCount + ' in the list, with its thumbnail)');
}

export const stage: DzStage = {
    id: '3',
    title: 'locations, scene files, links',
    steps: [
        {
            name: 'the Locations tab shows the six starter dives and an empty list',
            owner: 'S3-3 / S3-5',
            falsified: '2026-10-08: the `dz-starters` widget removed from the Locations panel in deep-zoom/panels.ts -> red, "six starter cards" false.',
            async run(ctx) {
                await fresh(ctx);
                ctx.check((await ctx.ev<number>("document.querySelectorAll('[data-dz-starter]').length")) === 6, 'six starter cards');
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('No saved locations yet')"), 'the list says it is empty');
                ctx.check(await ctx.ev<boolean>("!!document.querySelector('[data-dz-save-location]')"), 'and offers Save this view');
            },
        },
        {
            name: 'B saves a location with a thumbnail and its depth; a rename keeps the depth; it survives a reload',
            owner: 'S3-1',
            falsified: '2026-10-08: the `deep-zoom.save-location` key changed from b to F8 in deep-zoom/hotkeys.ts -> red, "B saved a location" false.',
            async run(ctx) {
                await fresh(ctx);
                if (!(await saveWithB(ctx, 1))) return;
                const [row] = await rows(ctx);
                const live = await cam(ctx);
                ctx.check(same(row.cam, live), 'the saved camera strings equal the live ones (' + row.cam.map((v) => v.length).join(', ') + ' characters)');
                ctx.check(row.thumb.startsWith('data:image/jpeg'), 'the thumbnail is a JPEG (' + row.thumb + ')');
                ctx.check(DEPTH_TEXT.test(row.label), 'the default name is the depth (' + row.label + ')');
                const line = () => ctx.ev<string>("(document.querySelector('[data-dz-location-depth]') || {}).textContent || ''");
                ctx.check(DEPTH_TEXT.test((await line()).trim()), 'the row shows its depth (' + (await line()).trim() + ')');
                await ctx.ev("window.__store.getState().updateLocation(" + JSON.stringify(row.id) + ", { label: 'My place' })");
                await ctx.sleep(200);
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('My place')"), 'renamed to "My place"');
                ctx.check(DEPTH_TEXT.test((await line()).trim()), 'and the depth line is still there');
                ctx.check(await ctx.ev<boolean>("(JSON.parse(localStorage.getItem('gmt.deepZoom.locations') || '[]')[0] || {}).label === 'My place'"), 'the list is mirrored to storage');
                await ctx.boot();
                await openLocations(ctx);
                const after = await rows(ctx);
                ctx.check(after.length === 1 && after[0].label === 'My place' && same(after[0].cam, row.cam), 'after a reload the place is still there, same strings');
            },
        },
        {
            name: 'a deeper place sorts below a shallower one; digit 1 recalls the first saved, exactly; Ctrl+Z goes back',
            owner: 'S3-1 / S3-0',
            falsified: '2026-10-08: `viewForHost` in deep-zoom/locations.ts made to change the last digit of one camera string -> red, "digit 1 recalled the first place saved: the camera strings equal the deep view exactly" false.',
            async run(ctx) {
                await fresh(ctx);
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(400);
                if (!(await saveWithB(ctx, 1))) return;                       // slot 1: the deep view
                await ctx.withHost('host.moveAlong([0, 1, 0], 2); return true;'); // far from the surface
                await ctx.sleep(600);
                if (!(await saveWithB(ctx, 2))) return;                       // slot 2: a shallow view
                const saved = await rows(ctx);
                ctx.check(Number(saved[0].depth) < Number(saved[1].depth), 'stored order: deep first (' + saved[0].depth + '), then shallow (' + saved[1].depth + ')');
                const shown = await ctx.ev<string[]>("[...document.querySelectorAll('[data-dz-location-depth]')].map((e) => e.textContent.trim())");
                ctx.check(shown.length === 2 && Number(shown[0]) > Number(shown[1]), 'shown order: shallow above deep (' + shown.join(', ') + ')');
                const before = await cam(ctx);
                await ctx.focusPicture();
                await ctx.page.keyboard.press('1');
                await ctx.sleep(300);
                ctx.check(same(await cam(ctx), DEEP_VIEW.cam), 'digit 1 recalled the first place saved: the camera strings equal the deep view exactly');
                await ctx.page.keyboard.press('Control+z');
                await ctx.sleep(300);
                ctx.check(same(await cam(ctx), before), 'Ctrl+Z: the strings from before the jump are back');
            },
        },
        {
            name: 'with the pointer captured a slot digit does not move the camera',
            owner: 'S3-0 / S3-1',
            falsified: '2026-10-08: the `when` removed from `slotShortcuts` in deep-zoom/locations.ts -> red, "captured: after 1 the camera strings are unchanged" false.',
            async run(ctx) {
                await fresh(ctx);
                if (!(await saveWithB(ctx, 1))) return;
                await ctx.withHost('host.moveAlong([0, 1, 0], 0.5); return true;');
                await ctx.sleep(300);
                if (!(await ctx.capture())) return;
                ctx.check((await ctx.until("(document.querySelector('[data-dz-depth-readout]') || {}).className.includes('opacity-35')", 2000, 20)) >= 0, 'the shell shows the capture');
                const before = await cam(ctx);
                await ctx.page.keyboard.press('1');
                await ctx.sleep(300);
                if (!(await ctx.ev<boolean>('!!document.pointerLockElement'))) { ctx.notProven('the pointer lock was lost while the key was pressed'); return; }
                ctx.check(same(await cam(ctx), before), 'captured: after 1 the camera strings are unchanged');
                await ctx.release();
                await ctx.focusPicture();
                await ctx.page.keyboard.press('1');
                await ctx.sleep(300);
                ctx.check(!same(await cam(ctx), before), 'pointer free: 1 recalls the place');
            },
        },
        {
            name: 'a starter card jumps to its start view and dives; Home and Backspace jump back',
            owner: 'S3-3',
            falsified: '2026-10-08: `snapDist = true` removed from the renderer\'s setView (deep-zoom/renderer/core.js) -> red, "the depth reads the home view at once" false (4.74e-1 after 0.4 s).',
            timeoutMs: 90_000,
            async run(ctx) {
                await fresh(ctx);
                const home = await cam(ctx);
                await ctx.page.locator('[data-dz-starter="1e-6"]').click();
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-diving]')", 5000)) >= 0, 'the card started a dive');
                ctx.check(!same(await cam(ctx), home), 'from its own start view, not the home view');
                const waited = await ctx.until("!document.querySelector('[data-dz-diving]')", 60_000, 200);
                const depth = await ctx.host<number>('telemetry().depth');
                ctx.check(waited >= 0 && depth <= 1e-5 && depth >= 1e-7, 'the dive ended within a decade of 1e-6 (' + depth.toExponential(2) + ' after ' + (waited / 1000).toFixed(1) + ' s)');
                const deep = await cam(ctx);
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Home');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), home), 'Home: the start view, exactly');
                // 0.4 s after the jump. Without the renderer's snap on setView the distance eases up
                // from the dive's 1e-6 and reads about 0.4 here; with it, the home view's own 1.1.
                const homeDepth = await ctx.host<number>('telemetry().depth');
                ctx.check(homeDepth > 0.8, 'and the depth reads the home view at once (' + homeDepth.toExponential(2) + ' after 0.4 s)');
                await ctx.page.keyboard.press('Backspace');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), deep), 'Backspace: back where the dive ended, exactly');
            },
        },
    ],
};
