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
 *     the panel shows. They do nothing while the hands are flying (stage N5's file has that step).
 *   - Camera values are compared as strings, byte for byte.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import fs from 'node:fs';
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import { DEEP_VIEW, enterDeepView } from './stage1.mts';
import { PLACES } from '../../deep-zoom/data/places.ts';

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
            quick: true,
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
            name: 'a starter card jumps to its start view and dives; Home and Backspace jump back',
            owner: 'S3-3',
            falsified: '2026-10-08: `snapDist = true` removed from the renderer\'s setView (deep-zoom/renderer/core.js) -> red, "the depth reads the home view at once" false (4.74e-1 after 0.4 s). 2026-10-09 (the dive closes on the rays ahead since then, ADR-0134): the dive made to read the estimate at the camera again (`depth: () => dz.telemetry().depth` in deep-zoom/host/moduleHost.ts) -> red, "the dive ended on its target" false: 7.432e-35 ahead after 17.2 s.',
            timeoutMs: 90_000,
            async run(ctx) {
                await fresh(ctx);
                const home = await cam(ctx);
                await ctx.page.locator('[data-dz-starter="1e-30"]').click();
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-diving]')", 5000)) >= 0, 'the card started a dive');
                ctx.check(!same(await cam(ctx), home), 'from its own start view, not the home view');
                const waited = await ctx.until("!document.querySelector('[data-dz-diving]')", 60_000, 200);
                // The nearest ray ahead, which is what a dive closes on (see the dive step of stage 2).
                const ahead = await ctx.host<{ near: number; inside: boolean }>('sense(null)');
                ctx.check(waited >= 0 && !ahead.inside && ahead.near <= 1.001e-30 && ahead.near >= 0.5e-30, 'the dive ended on its target, 1e-30, and not through the surface (' + ahead.near.toExponential(3) + ' ahead after ' + (waited / 1000).toFixed(1) + ' s)');
                const deep = await cam(ctx);
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Home');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), home), 'Home: the start view, exactly');
                // 0.4 s after the jump. Without the renderer's snap on setView the distance eases up
                // from the dive's depth and reads about 0.4 here; with it, the home view's own 1.1.
                const homeDepth = await ctx.host<number>('telemetry().depth');
                ctx.check(homeDepth > 0.8, 'and the depth reads the home view at once (' + homeDepth.toExponential(2) + ' after 0.4 s)');
                await ctx.page.keyboard.press('Backspace');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), deep), 'Backspace: back where the dive ended, exactly');
            },
        },
        {
            name: 'a kept place brings its camera and its formula and leaves the light, the colour, the detail and the march as they were; a location saved there holds the camera and the formula only',
            owner: 'owner, 2026-10-10 (a place is a camera and a formula)',
            falsified: '2026-10-08: the `dz-places` widget removed from the Locations panel in deep-zoom/panels.ts -> red, 0 cards for 3 places. 2026-10-10, when a place became a camera and a formula, four breaks in deep-zoom/locations.ts, one run each: `applyFormula(state)` taken out of `jumpTo` -> red, "with its formula (power 8 -> 8)" false; `applyFormula` made to write the view\'s own detail to the store as well -> red, "and nothing else: ... detail 32 ..." and "in the renderer too: detail 32 ..." false; `viewForHost` handing on the view\'s own `surf` -> red, "in the renderer too: detail 32 ..." false alone (the store still said 3); `captureLocation` made to save the light too -> red, "a location saved there holds its formula and no light ... (its look holds: dzFormula, dzLight)" false. 2026-10-11: the step no longer sets a Step size by hand, nor compares it with the place\'s saved march (the field went from deep-zoom/data/places.ts; the bulb has no step setting); Hit refine stands in its place in the "in the renderer too" line. Not seen red since: the four breaks above were of lines whose checks did not change.',
            async run(ctx) {
                await fresh(ctx);
                const cards = await ctx.ev<string[]>("[...document.querySelectorAll('[data-dz-place]')].map((b) => b.getAttribute('data-dz-place'))");
                ctx.check(cards.length === PLACES.length && cards.length >= 3, 'the Locations tab shows the kept places (' + cards.length + ' cards for ' + PLACES.length + ' places)');
                const place = PLACES[0];
                const power = place.state.look!.dzFormula.power;
                // What the hands set and no place may change. None of it is what this place's own view says. (Until 2026-10-11 a Step
                // size was set by hand here too, against the place's saved march: a place carries none now, and the bulb has no step.)
                await ctx.ev('(() => { const s = window.__store.getState(); s.setDzQuality({ hitRefine: 1, reach: 1, detail: 3 }); s.setDzLight({ keyElevation: 55 }); s.setDzColour({ plain: false, scale: 1.5 }); return true; })()');
                await ctx.sleep(300);
                const held = () => ctx.ev<{ refine: number; reach: number; detail: number; key: number; plain: boolean; scale: number; power: number }>(
                    '(() => { const s = window.__store.getState(); return { refine: s.dzQuality.hitRefine, reach: s.dzQuality.reach, detail: s.dzQuality.detail, key: s.dzLight.keyElevation, plain: s.dzColour.plain, scale: s.dzColour.scale, power: s.dzFormula.power }; })()');
                const sameLook = (a: Awaited<ReturnType<typeof held>>, b: Awaited<ReturnType<typeof held>>) =>
                    a.refine === b.refine && a.reach === b.reach && a.detail === b.detail && a.key === b.key && a.plain === b.plain && a.scale === b.scale;
                const before = await held();
                if (!ctx.check(before.power !== power && before.detail !== place.state.view.surf && before.scale !== place.state.view.cscale,
                    'the hands set a look that is not the place\'s (power ' + before.power + ', detail ' + before.detail + ', colour scale ' + before.scale + ')')) return;
                await ctx.page.locator('[data-dz-place="' + place.name + '"]').click();
                await ctx.sleep(1000);
                ctx.check(same(await cam(ctx), place.state.view.cam), 'a click jumps to its camera strings, byte for byte');
                const after = await held();
                ctx.check(after.power === power, 'with its formula (power ' + before.power + ' -> ' + after.power + ')');
                ctx.check(sameLook(after, before), 'and nothing else: hit refine ' + after.refine + ', reach ' + after.reach + ', detail ' + after.detail + ', key elevation ' + after.key + ' and colour scale ' + after.scale + ' are as the hands left them');
                const params = await ctx.host<Record<string, number>>('getParams()');
                const drawn = { detail: params.detail, cscale: params.cscale, refine: params['dzQuality.hitRefine'] };
                ctx.check(drawn.detail === before.detail && drawn.cscale === before.scale && drawn.refine === before.refine,
                    'in the renderer too: detail ' + drawn.detail + ', colour scale ' + drawn.cscale + ' and hit refine ' + drawn.refine + ', not the detail ' + place.state.view.surf + ' and colour scale ' + place.state.view.cscale + ' this place\'s own view carries');
                // A location saved here is the camera and the formula, and a recall changes nothing else.
                if (!(await saveWithB(ctx, 1))) return;
                const saved = await ctx.ev<{ look: string[]; power: number }>("(() => { const st = window.__store.getState().savedLocations[0].state; return { look: Object.keys(st.look || {}), power: st.look.dzFormula.power }; })()");
                ctx.check(saved.look.join() === 'dzFormula' && saved.power === power, 'a location saved there holds its formula and no light, colour, detail or march (its look holds: ' + saved.look.join(', ') + ')');
                await ctx.ev('window.__store.getState().setDzQuality({ hitRefine: 0 })');
                await ctx.withHost('host.moveAlong([0, 1, 0], host.rawDistance() * 0.5); return true;');
                await ctx.sleep(400);
                const left = await held();
                ctx.check(left.refine === 0 && !same(await cam(ctx), place.state.view.cam), 'left: moved away, hit refine 0');
                await ctx.focusPicture();
                await ctx.page.keyboard.press('1');
                await ctx.sleep(800);
                ctx.check(same(await cam(ctx), place.state.view.cam), 'recalled with 1, the saved location brings the camera strings back');
                ctx.check(sameLook(await held(), left), 'and leaves the refine and the rest of the look as they were left');
            },
        },
        {
            name: 'a scene carries the view, the look, its version and the saved places, and loads back exactly',
            owner: 'S3-2',
            falsified: '2026-10-08: `dzView.serialize` in deep-zoom/presetFields.ts made to return nothing -> red, 3 lines (no camera in the scene, no depth text, the load does not bring the camera back).',
            async run(ctx) {
                await fresh(ctx);
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(300);
                if (!(await saveWithB(ctx, 1))) return;
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 70 })');
                await ctx.sleep(200);
                const scene = await ctx.ev<string>('JSON.stringify(window.__store.getState().getPreset({ includeScene: true, includeDocuments: true }))');
                const parsed = JSON.parse(scene);
                ctx.check(same(parsed.dzView?.cam ?? [], DEEP_VIEW.cam), 'the scene holds the camera as the same three strings');
                ctx.check(typeof parsed.dzView?.depth === 'string' && Number(parsed.dzView.depth) < 1e-9, 'and the depth as text (' + parsed.dzView?.depth + ')');
                ctx.check(parsed.dzSceneVersion === 1, 'scene version 1');
                ctx.check(parsed.features?.dzLight?.keyElevation === 70, 'the look (key elevation 70)');
                ctx.check(Array.isArray(parsed.documents?.['deep-zoom.locations']) && parsed.documents['deep-zoom.locations'].length === 1, 'and the saved place, as a document');
                // Leave: move, change the look, delete the place.
                const id = (await rows(ctx))[0].id;
                await ctx.withHost('host.moveAlong([0, 1, 0], 1.5); return true;');
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 20 }); window.__store.getState().deleteLocation(' + JSON.stringify(id) + ')');
                await ctx.sleep(300);
                ctx.check(!same(await cam(ctx), DEEP_VIEW.cam) && (await rows(ctx)).length === 0, 'moved away, look changed, place deleted');
                await ctx.ev('window.__store.getState().loadPreset(JSON.parse(' + JSON.stringify(scene) + '))');
                await ctx.sleep(600);
                ctx.check(same(await cam(ctx), DEEP_VIEW.cam), 'after the load the camera strings are the saved ones, byte for byte');
                ctx.check((await ctx.store<number>('dzLight.keyElevation')) === 70 && (await ctx.host<number>("getParams()['dzLight.keyElevation']")) === 70, 'the look is back in the store and in the renderer');
                ctx.check((await rows(ctx)).length === 1, 'and the saved place is back in the list');
            },
        },
        {
            name: 'a share link opens the same view and look in a clean browser, and holds no saved places',
            owner: 'S3-3',
            falsified: '2026-10-08: red on the first version of the preset field, which cleared the parked view as soon as it handed it to a host: React\'s first (disposed) mount took it and the link opened at the start view ("the camera strings are equal, byte for byte" false).',
            async run(ctx) {
                await fresh(ctx);
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(300);
                if (!(await saveWithB(ctx, 1))) return;
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 65 })');
                await ctx.sleep(200);
                const link = await ctx.ev<string>("location.origin + location.pathname + '#s=' + window.__store.getState().getShareString()");
                ctx.check(link.includes('#s=') && link.length > ctx.url.length + 20, 'the link carries a scene (' + link.length + ' characters)');
                await ctx.ev('localStorage.clear()');
                await ctx.page.goto('about:blank');
                await ctx.page.goto(link);
                ctx.check((await ctx.untilHost('host.telemetry().ready', 60_000, 100)) >= 0, 'the link opens the app');
                ctx.check((await ctx.untilHost('host.getView().cam[0] === ' + JSON.stringify(DEEP_VIEW.cam[0]), 5000, 50)) >= 0 && same(await cam(ctx), DEEP_VIEW.cam),
                    'at the same view: the camera strings are equal, byte for byte');
                ctx.check((await ctx.store<number>('dzLight.keyElevation')) === 65, 'with the same look (key elevation 65)');
                ctx.check((await rows(ctx)).length === 0, 'and no saved place came with it');
            },
        },
        {
            name: 'Copy location and Paste location go through the clipboard; last week\'s text jumps too; other text is refused',
            owner: 'S3-3',
            falsified: '2026-10-08: `applyLocationText` in deep-zoom/share.ts made to return before the jump -> red, "Paste location jumped to it" and the last-week line false.',
            async run(ctx) {
                await ctx.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ctx.origin });
                await fresh(ctx);
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(300);
                await ctx.page.locator('[data-dz-copy-location]').click();
                await ctx.sleep(300);
                const text = await ctx.ev<string>('navigator.clipboard.readText()');
                ctx.check(DEEP_VIEW.cam.every((c) => text.includes('"' + c + '"')), 'Copy location wrote the three camera strings as text');
                await ctx.withHost('host.moveAlong([0, 1, 0], 1.5); return true;');
                await ctx.sleep(300);
                const away = await cam(ctx);
                await ctx.page.locator('[data-dz-paste-location]').click();
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), DEEP_VIEW.cam), 'Paste location jumped to it, byte for byte');
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Control+z');
                await ctx.sleep(300);
                ctx.check(same(await cam(ctx), away), 'and Ctrl+Z went back');
                const lastWeek = JSON.stringify({ ...DEEP_VIEW, depth: 1.14e-17, name: 'from last week' });
                await ctx.ev('navigator.clipboard.writeText(' + JSON.stringify(lastWeek) + ')');
                await ctx.page.locator('[data-dz-paste-location]').click();
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), DEEP_VIEW.cam), 'last week\'s flat text jumps too');
                await ctx.withHost('host.moveAlong([0, 1, 0], 1.5); return true;');
                await ctx.sleep(300);
                const before = await cam(ctx);
                await ctx.ev("navigator.clipboard.writeText('hello there')");
                await ctx.page.locator('[data-dz-paste-location]').click();
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), before), 'text that is not a location moves nothing');
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('not a location')"), 'and a toast says why');
            },
        },
        {
            name: 'Alt+S saves a PNG that holds the picture and the scene, while the still gathers AND once it is done, and moves nothing',
            owner: 'S3-5',
            falsified: '2026-10-08, three breaks, one run each: the one-pixel read before the frame removed from `snapshot` in renderer/core.js -> red, "still done: the picture is not blank" false (mean level 0.0), with "still gathering" green; `sceneCanvas` in deep-zoom/share.ts put back to a step and a `drawImage` of the canvas -> red, the same line; the Ctrl / Alt / Cmd test removed from `keysSuppressed` in DeepZoomNavigation.tsx -> red, "neither save moved the camera" false. HISTORY: until this date the step saved only while the still was gathering and never looked at the camera afterwards - it was green while the owner\'s PNGs of a finished still were blank and Alt+S flew him backwards. Before N5: red with SceneIO given the renderer\'s own canvas (mean level 0.0).',
            async run(ctx) {
                await fresh(ctx);
                if (!(await enterDeepView(ctx))) return;
                const save = async (when: string): Promise<void> => {
                    const had = ctx.downloads.length;
                    await ctx.focusPicture();
                    await ctx.page.keyboard.press('Alt+s');
                    const start = Date.now();
                    while (ctx.downloads.length === had && Date.now() - start < 8000) await ctx.sleep(100);
                    if (!ctx.check(ctx.downloads.length > had, when + ': a file was downloaded')) return;
                    const bytes = fs.readFileSync(await ctx.downloads[ctx.downloads.length - 1].path());
                    fs.writeFileSync(ctx.root + '/debug/scratch/deep-zoom-shell-stage3-scene.png', bytes);   // kept for a look
                    ctx.check(bytes.length > 8 && bytes.subarray(1, 4).toString('latin1') === 'PNG', when + ': it is a PNG (' + bytes.length + ' bytes)');
                    ctx.check(bytes.includes(Buffer.from('dzView')) && bytes.includes(Buffer.from(DEEP_VIEW.cam[0].replace('-', ''))), when + ': the scene is inside it, camera strings included');
                    const mean = await ctx.ev<number[]>(`(async () => {
                        const img = new Image();
                        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = 'data:image/png;base64,${bytes.toString('base64')}'; });
                        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
                        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
                        const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0, hi = 0;
                        for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > hi) hi = v; }
                        return [img.width, img.height, s / (d.length / 4) / 3, hi / 3];
                    })()`);
                    ctx.check(mean[2] > 8 && mean[3] > 60, when + ': the picture is not blank (' + mean[0] + ' x ' + mean[1] + ', mean level ' + mean[2].toFixed(1) + ', brightest ' + mean[3].toFixed(0) + ')');
                };
                await ctx.untilHost('host.telemetry().accumN >= 16', 15_000, 50);
                const before = await cam(ctx);
                await save('still gathering');
                // The case that came out blank for the owner on 2026-10-08: a FINISHED still is shown by
                // one blit a frame, and the read that followed it cleared the buffer first.
                if (!ctx.check((await ctx.untilHost('host.telemetry().accumN >= host.telemetry().accumMax', 40_000, 100)) >= 0, 'the still is done')) return;
                await ctx.sleep(500);
                await save('still done');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), before), 'and neither save moved the camera (S is a fly key; with Alt it is not)');
            },
        },
    ],
};
