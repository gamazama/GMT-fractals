/**
 * smoke:deep-zoom, stage 2 - every look control is an engine panel, with undo.
 *
 *   ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage 2
 *
 * What the steps lean on (deep-zoom/panels.ts, deep-zoom/useHostSync.ts, deep-zoom/host/paramMap.ts):
 *   - A dock tab is `button[data-gx-mode-tab="<panel id>"]`. A slider row is
 *     `[data-help-id^="<feature>.<param> "]` and holds a `[data-role="thumb"]`.
 *   - The store's values reach the renderer only after `host.ready`; `host.getParams()` holds the
 *     module's own keys (`detail`, `color`, ...) and the mapped params by id (`dzLight.keyElevation`).
 *   - Light and Colour change pixels in DEEP mode only (the f32 path has no light or colour input),
 *     and forcing precision to Deep at a shallow depth draws one flat colour. So a step about the
 *     picture first calls `enterDeepView` (a view that is deep by itself).
 *   - Two thumbnails of one unchanged view are not byte-identical (the still restarts and the
 *     samples are jittered), so picture steps compare mean colour and carry a control: the same
 *     measure with nothing changed.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import { enterDeepView } from './stage1.mts';
import { STARTERS } from '../../deep-zoom/data/starters.ts';

const FEATURES = ['dzFormula', 'dzQuality', 'dzInspect', 'dzLight', 'dzColour'];
const DEPTH_TEXT = /^\d\.\d\de-?\d+$/;

/** Mean R, G, B (0..255) of `host.thumbnail(48)`, decoded in the page. */
async function meanColour(ctx: DzCtx): Promise<[number, number, number]> {
    return ctx.withHost<[number, number, number]>(`
        const url = host.thumbnail(48);
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let r = 0, gr = 0, b = 0; const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
        return [r / n, gr / n, b / n];
    `);
}
const dist = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const fmt = (c: number[]) => c.map((v) => v.toFixed(1)).join(' / ');

/** Wait until the still has gathered `n` samples (deep mode only). */
const settle = (ctx: DzCtx, n = 24) => ctx.untilHost('host.telemetry().accumN >= ' + n, 15_000, 50);

/** Put the store back to the feature defaults this stage touches. */
const RESET = `(() => { const s = window.__store.getState();
    s.setDzQuality({ detail: 1, precision: 0 }); s.setDzLight({ shading: 1, lightType: 0, keyElevation: 40 });
    s.setDzColour({ plain: true, mode: 0, scale: 1 }); return true; })()`;

export const stage: DzStage = {
    id: '2',
    title: 'every look control is an engine panel, with undo',
    steps: [
        {
            name: 'the four dock tabs exist and each shows slider rows',
            owner: 'S2-7',
            falsified: '2026-10-08: the Colour panel given another id in deep-zoom/panels.ts -> red, "Colour is a panel in the right dock" and "Colour: tab button present" false.',
            async run(ctx) {
                const panels = await ctx.ev<string[]>("Object.values(window.__store.getState().panels).map((p) => p.id + ':' + p.location)");
                for (const [id, dock] of [['Formula', 'left'], ['Light', 'right'], ['Colour', 'right'], ['Quality', 'right']]) {
                    ctx.check(panels.includes(id + ':' + dock), id + ' is a panel in the ' + dock + ' dock');
                }
                const rowsOf = (feature: string) => ctx.ev<number>(
                    `[...document.querySelectorAll('[data-help-id^="${feature}."]')].filter((r) => r.querySelector('[data-role="thumb"]')).length`);
                // Formula shares the left dock with Locations (the default tab since stage 3).
                await ctx.page.locator('button[data-gx-mode-tab="Formula"]').click();
                await ctx.sleep(250);
                ctx.check((await rowsOf('dzFormula')) >= 3, 'Formula shows 3 slider rows or more (' + (await rowsOf('dzFormula')) + ')');
                // With Colour on Plain the tab is one switch: the mapping and scale rows show for Palette.
                await ctx.ev('window.__store.getState().setDzColour({ plain: false })');
                for (const [tab, feature, min] of [['Light', 'dzLight', 4], ['Colour', 'dzColour', 1], ['Quality', 'dzQuality', 2]] as Array<[string, string, number]>) {
                    const button = ctx.page.locator(`button[data-gx-mode-tab="${tab}"]`);
                    if (!ctx.check((await button.count()) === 1, tab + ': tab button present')) continue;
                    await button.click();
                    await ctx.sleep(250);
                    const n = await rowsOf(feature);
                    ctx.check(n >= min, tab + ' shows ' + min + ' slider rows or more (' + n + ')');
                }
                await ctx.shot('stage2-tabs');
                await ctx.ev(RESET);
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
            },
        },
        {
            name: 'no panel widget is missing from the component registry',
            owner: 'S2-7',
            falsified: '2026-10-08: `dz-frame-readout` misspelt in deep-zoom/panels.ts -> red, 1 "[PanelRouter] ..." line and the Quality readout absent.',
            async run(ctx) {
                await ctx.boot();
                for (const tab of ['Colour', 'Quality', 'Light']) {
                    await ctx.page.locator(`button[data-gx-mode-tab="${tab}"]`).click();
                    await ctx.sleep(200);
                }
                const missing = ctx.consoleLines.filter((l) => /not in componentRegistry|\[PanelRouter\]/.test(l.text));
                ctx.check(missing.length === 0, 'no "[PanelRouter] ... not in componentRegistry" console line (' + missing.length + ')');
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-frame-readout]')", 3000)) >= 0, 'the Quality tab shows the drawn-size readout');
                await ctx.page.locator('button[data-gx-mode-tab="Formula"]').click();
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-iteration-readout]')", 3000)) >= 0, 'the Formula tab shows the live iteration readout');
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
            },
        },
        {
            name: 'every mapped feature default equals what the module holds at ready',
            owner: 'S2-1 / S2-2',
            falsified: '2026-10-08: `dzQuality.detail` default 1 -> 2 in deep-zoom/features/quality.ts -> red, "dzQuality.detail module 1 store 2".',
            async run(ctx) {
                const boot = await ctx.boot({ clearStorage: true });
                if (!ctx.check(boot.ready, 'host.ready resolved')) return;
                const r = await ctx.withHost<{ compared: number; differ: string[] }>(`
                    const st = window.__store.getState(); const boot = host.bootParams(); const differ = []; let compared = 0;
                    for (const f of ${JSON.stringify(FEATURES)}) for (const k of Object.keys(st[f] || {})) {
                        const id = f + '.' + k; if (!(id in boot)) continue; compared++;
                        if (boot[id] !== st[f][k]) differ.push(id + ' module ' + boot[id] + ' store ' + st[f][k]);
                    }
                    return { compared, differ };`);
                ctx.check(r.compared >= 28, r.compared + ' params read back from the module at ready (28 or more)');
                ctx.check(r.differ.length === 0, 'none differs from its feature default' + (r.differ.length ? ': ' + r.differ.join('; ') : ''));
            },
        },
        {
            name: 'drag the Detail slider: the module follows, and Ctrl+Z puts it back',
            owner: 'S2-3',
            falsified: '2026-10-08: the `detail` push removed from host/looseParams.ts -> red, "the module follows the store" false (store 7.46, module 1).',
            async run(ctx) {
                await ctx.ev(RESET);
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                const row = ctx.page.locator('[data-help-id^="dzQuality.detail "]');
                if (!ctx.check((await row.count()) === 1, 'the Detail row is in the Quality tab')) return;
                const track = row.locator('[data-role="thumb"]').locator('xpath=..');
                const box = await track.boundingBox();
                if (!box) { ctx.check(false, 'the Detail track has a box'); return; }
                const y = box.y + box.height / 2;
                await ctx.page.mouse.move(box.x + box.width * 0.3, y);
                await ctx.page.mouse.down();
                await ctx.page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
                await ctx.page.mouse.move(box.x + box.width * 0.7, y, { steps: 6 });
                await ctx.page.mouse.up();
                await ctx.sleep(300);
                const stored = await ctx.store<number>('dzQuality.detail');
                const module = await ctx.host<number>('getParams().detail');
                ctx.check(stored !== 1, 'the drag changed the store (detail 1 -> ' + stored + ')');
                ctx.check(module === stored, 'the module follows the store (store ' + stored + ', module ' + module + ')');
                await ctx.page.keyboard.press('Control+z');
                await ctx.sleep(300);
                const undone = await ctx.store<number>('dzQuality.detail');
                const moduleUndone = await ctx.host<number>('getParams().detail');
                ctx.check(undone === 1 && moduleUndone === 1, 'Ctrl+Z: store ' + undone + ', module ' + moduleUndone + ' (both back at 1)');
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
            },
        },
        {
            name: 'a row is shown only when the shading reads it',
            owner: 'S2-2',
            falsified: '2026-10-08: the `condition` removed from `keyElevation` in deep-zoom/features/light.ts -> red, "Classic: Key elevation hidden" false.',
            async run(ctx) {
                await ctx.ev(RESET);
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
                const has = (param: string) => ctx.ev<boolean>(`!!document.querySelector('[data-help-id^="dzLight.${param} "]')`);
                await ctx.sleep(200);
                ctx.check(await has('keyElevation'), 'New shading: Key elevation shown');
                ctx.check(!(await has('lampFalloff')), 'light type Direct: Lamp falloff hidden');
                await ctx.ev('window.__store.getState().setDzLight({ shading: 0, lightType: 1 })');
                await ctx.sleep(250);
                ctx.check(!(await has('keyElevation')), 'Classic: Key elevation hidden');
                ctx.check(await has('lampFalloff'), 'light type Lamp: Lamp falloff shown');
                ctx.check((await ctx.host<number>('getParams().lookMode')) === 0 && (await ctx.host<number>('getParams().light')) === 1, 'the module has shading Classic and light type Lamp');
                await ctx.ev(RESET);
            },
        },
        {
            name: 'in a deep view Light and Colour change the picture; in f32 the tabs say they do not',
            owner: 'S2-3',
            falsified: '2026-10-08: `useHostSync()` removed from deep-zoom/DeepZoomApp.tsx -> red, "key elevation 40 -> 85 changes the picture" and the colour line false (both under the control\'s difference).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-mode-notice]')", 5000)) >= 0, 'f32 at boot: the Light tab shows the deep-mode notice');
                if (!(await enterDeepView(ctx))) return;
                ctx.check((await ctx.until("!document.querySelector('[data-dz-mode-notice]')", 5000)) >= 0, 'deep view: the notice is gone');
                await settle(ctx);
                const a = await meanColour(ctx);
                await settle(ctx);
                const a2 = await meanColour(ctx);
                const noise = dist(a, a2);
                ctx.note('control: the same view twice differs by ' + noise.toFixed(2) + ' levels (' + fmt(a) + ' vs ' + fmt(a2) + ')');
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 85 })');
                await ctx.sleep(200);
                await settle(ctx);
                const b = await meanColour(ctx);
                ctx.check(dist(a, b) > Math.max(2, noise * 4), 'key elevation 40 -> 85 changes the picture (' + dist(a, b).toFixed(1) + ' levels: ' + fmt(a) + ' -> ' + fmt(b) + ')');
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 40 }); window.__store.getState().setDzColour({ plain: false })');
                await ctx.sleep(200);
                await settle(ctx);
                const c = await meanColour(ctx);
                const chroma = (v: number[]) => Math.max(...v) - Math.min(...v);
                ctx.check(Math.abs(chroma(c) - chroma(a)) > 4 || dist(a, c) > Math.max(4, noise * 4), 'Colour: Palette changes the picture (' + fmt(a) + ' -> ' + fmt(c) + ')');
                await ctx.shot('stage2-deep-palette');
                await ctx.ev(RESET);
            },
        },
        {
            name: 'the depth instruments are on the picture, and Overlays None leaves the top-bar depth',
            owner: 'S2-5',
            falsified: '2026-10-08: the `hud.register` of `deep-zoom.depth` removed from deep-zoom/main.tsx -> red, 3 lines (no depth text, no decades line, no readout under Depth only).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                const readout = await ctx.ev<string>("(document.querySelector('[data-dz-depth-readout]') || {}).innerText || ''");
                const depthText = await ctx.ev<string>("(document.querySelector('[data-dz-depth]') || {}).textContent || ''");
                ctx.check(DEPTH_TEXT.test(depthText.trim()), 'the readout shows the depth as ' + depthText.trim());
                ctx.check(/decades to the 1e-77 floor/.test(readout) && /magnification 10\^\d/.test(readout), 'with the decades to the floor and the magnification');
                ctx.check(await ctx.ev<boolean>("!!document.querySelector('[data-dz-depth-scale] [data-dz-depth-marker]')"), 'the depth scale is on the picture with its live marker');
                const chip = await ctx.ev<string>("(document.querySelector('[data-dz-status]') || {}).innerText || ''");
                ctx.check(/it \d+/.test(chip) && /\d+ x \d+/.test(chip), 'the top-bar chip shows iterations and the drawn size (' + chip.replace(/\s+/g, ' ') + ')');
                await ctx.ev('window.__store.getState().setDzInspect({ overlays: 2 })');
                await ctx.sleep(250);
                ctx.check(!(await ctx.ev<boolean>("!!document.querySelector('[data-dz-depth-readout]') || !!document.querySelector('[data-dz-depth-scale]')")), 'Overlays None: the readout and the scale are gone');
                ctx.check(DEPTH_TEXT.test((await ctx.ev<string>("(document.querySelector('[data-dz-status-depth]') || {}).textContent || ''")).trim()), 'and the top-bar chip still shows the depth');
                await ctx.ev('window.__store.getState().setDzInspect({ overlays: 1 })');
                await ctx.sleep(250);
                ctx.check(await ctx.ev<boolean>("!!document.querySelector('[data-dz-depth-readout]') && !document.querySelector('[data-dz-depth-scale]')"), 'Overlays Depth only: the readout without the scale');
                await ctx.ev('window.__store.getState().setDzInspect({ overlays: 0 })');
            },
        },
        {
            name: 'a dive from the Grain of sand view to 1e-30 arrives and stays there',
            owner: 'S1-1 (host/dive.ts)',
            falsified: '2026-10-08: red before a starter view was used - from the boot view the dive ran out its 45 s at 1.44e-5 ("within a decade of 1e-6" false). NOT falsified for the three-frame arrival rule: with DZ_DIVE_ARRIVAL_FRAMES = 1 this dive still arrived; that rule is pinned by debug/deep-zoom-checks/module-host.mts.',
            timeoutMs: 100_000,
            async run(ctx) {
                // A dive flies straight ahead, so it needs a view whose forward ray meets the surface.
                // This is the fourth starter: it starts at 1.1e-17, in crisp structure, and goes 13
                // decades down. (Until 2026-10-08 this step dived from the outside view to 1e-6,
                // through the grainy f32 picture; the owner asked for a dive where there is something
                // to see. The f32 / deep switch near 1e-4 is pinned by module-host.mts instead.)
                const starter = STARTERS[3];
                await ctx.boot({ clearStorage: true });
                await ctx.withHost('host.setView(' + JSON.stringify(starter.view) + '); return true;');
                await ctx.sleep(800);
                const from = await ctx.host<number>('telemetry().depth');
                ctx.check(from < 1e-15 && from > 1e-19, 'the starter view is near 1e-17 (' + from.toExponential(2) + ', ' + (await ctx.host<string>('telemetry().mode')) + ')');
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                if (!ctx.check((await field.count()) === 1, 'the readout has its Dive field')) return;
                await field.fill('30');
                await field.press('Enter');
                ctx.check((await ctx.until("!!document.querySelector('[data-dz-diving]')", 3000)) >= 0, 'the readout says a dive is in flight');
                const waited = await ctx.until("!document.querySelector('[data-dz-diving]')", 70_000, 200);
                const depth = await ctx.host<number>('telemetry().depth');
                const mode = await ctx.host<string>('telemetry().mode');
                ctx.note('ended after ' + (waited / 1000).toFixed(1) + ' s at ' + depth.toExponential(2) + ' (' + mode + ')');
                ctx.check(waited >= 0, 'the dive ended by itself');
                ctx.check(depth <= 1e-29 && depth >= 1e-36, 'at or under 1e-30, and not through the surface (the distance reading falls in cliffs at depth, so a dive can end decades under its target) (' + depth.toExponential(2) + ')');
                await ctx.sleep(1500);
                const later = await ctx.host<number>('telemetry().depth');
                ctx.check(later <= 1e-29, 'and it is still there 1.5 s later (' + later.toExponential(2) + '), not a one-frame reading');
                await ctx.shot('stage2-dive-1e-30');
            },
        },
    ],
};
