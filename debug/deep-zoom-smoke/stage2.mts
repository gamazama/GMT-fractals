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
 *   - The deep path is the picture at EVERY depth since 2026-10-08 (the shell starts the renderer
 *     with `mode: 'deep'`); the f32 baseline, which has no light or colour input, shows only until
 *     the deep shader has compiled. The start view sits exactly on the bulb's z axis, where the
 *     deep path used to draw one flat colour: the renderer's POLE GUARD keeps the camera off it,
 *     and one step here looks at that picture. Far ground (every hit of a shallow view) takes the
 *     palette too, because the shell asks for it (`farLook: true`); that step checks it.
 *   - Two thumbnails of one unchanged view are not byte-identical (the still restarts and the
 *     samples are jittered), so picture steps compare mean colour and carry a control: the same
 *     measure with nothing changed. With Accumulate OFF one view draws the same picture every
 *     time (measured: 0.00 % of pixels differ), which is what the Hit refine step leans on.
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
/** `host.thumbnail(size)` as RGBA bytes, decoded in the page. */
async function pixels(ctx: DzCtx, size = 96): Promise<number[]> {
    return ctx.withHost<number[]>(`
        const url = host.thumbnail(${size});
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        return Array.from(g.getImageData(0, 0, c.width, c.height).data);
    `);
}
/** The share (0..100) of pixels whose colour differs by more than 12 levels. */
function shareChanged(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 100;
    let off = 0;
    for (let i = 0; i < a.length; i += 4) {
        if ((Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3 > 12) off++;
    }
    return (100 * off) / (a.length / 4);
}
const fmt = (c: number[]) => c.map((v) => v.toFixed(1)).join(' / ');

/** Wait until the still has gathered `n` samples (deep mode only). */
const settle = (ctx: DzCtx, n = 24) => ctx.untilHost('host.telemetry().accumN >= ' + n, 15_000, 50);

/** Put the store back to the feature defaults this stage touches. */
const RESET = `(() => { const s = window.__store.getState();
    s.setDzQuality({ detail: 1 }); s.setDzLight({ shading: 1, lightType: 0, keyElevation: 40 });
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
            name: 'the deep path is the picture at every depth: Light changes the start view, and Light and Colour a deep one',
            owner: 'S2-3',
            falsified: '2026-10-08, two breaks, one run each, for the start-view half: `mode: \'deep\'` removed from `shellOptions` in host/moduleHost.ts -> red, "at the start view the picture is the deep path" false (it was f32, with the notice up, and the light changed nothing); the POLE GUARD in renderer/core.js made dead -> red, "it is a picture, not one flat colour" false (levels 145 to 145); `farLook: true` removed from `shellOptions` -> red, "Palette colours the start view" false (channel spread 2.9 -> 2.9); the far loop\'s refinement made dead in renderer/core.js -> red, "Hit refine 4 moves far hits too" false (0.0 %). For the deep-view half, the same day and before: `useHostSync()` removed from deep-zoom/DeepZoomApp.tsx -> red, "key elevation 40 -> 85 changes the picture" and the colour line false.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Light"]').click();
                // The start view: depth about 1.2, where f32 used to draw, and exactly on the z axis.
                ctx.check((await ctx.untilHost("host.telemetry().mode === 'deep'", 20_000, 50)) >= 0, 'at the start view the picture is the deep path (depth ' + (await ctx.host<number>('telemetry().depth')).toFixed(2) + ')');
                ctx.check((await ctx.until("!document.querySelector('[data-dz-mode-notice]')", 5000)) >= 0, 'and the "still starting" notice is not shown');
                await settle(ctx);
                const start = await pixels(ctx, 64);
                let lo = 255, hi = 0;
                for (let i = 0; i < start.length; i += 4) { const v = (start[i] + start[i + 1] + start[i + 2]) / 3; if (v < lo) lo = v; if (v > hi) hi = v; }
                ctx.check(hi - lo > 60, 'it is a picture, not one flat colour (levels ' + Math.round(lo) + ' to ' + Math.round(hi) + ')');
                const s1 = await meanColour(ctx);
                await settle(ctx);
                const startNoise = dist(s1, await meanColour(ctx));
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 85 })');
                await ctx.sleep(200);
                await settle(ctx);
                const s2 = await meanColour(ctx);
                ctx.check(dist(s1, s2) > Math.max(2, startNoise * 4), 'key elevation 40 -> 85 changes the start view (' + dist(s1, s2).toFixed(1) + ' levels; the control: ' + startNoise.toFixed(2) + ')');
                await ctx.ev('window.__store.getState().setDzLight({ keyElevation: 40 })');
                // Far ground (every hit of this view) takes the palette: before 2026-10-08 it was one grey.
                const chromaOf = (v: number[]) => Math.max(...v) - Math.min(...v);
                await ctx.sleep(200);
                await settle(ctx);
                const plain = await meanColour(ctx);
                await ctx.ev('window.__store.getState().setDzColour({ plain: false })');
                await ctx.sleep(200);
                await settle(ctx);
                const coloured = await meanColour(ctx);
                ctx.check(chromaOf(coloured) > chromaOf(plain) + 6, 'Colour: Palette colours the start view (channel spread ' + chromaOf(plain).toFixed(1) + ' -> ' + chromaOf(coloured).toFixed(1) + ')');
                await ctx.ev('window.__store.getState().setDzColour({ plain: true })');
                // Hit refine reaches far hits as well.
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: false, hitRefine: 0 })');
                await ctx.sleep(800);
                const coarse = await pixels(ctx);
                const same = shareChanged(coarse, await pixels(ctx));
                await ctx.ev('window.__store.getState().setDzQuality({ hitRefine: 4 })');
                await ctx.sleep(800);
                const refined = shareChanged(coarse, await pixels(ctx));
                ctx.check(refined > Math.max(1, same * 4), 'Hit refine 4 moves far hits too: ' + refined.toFixed(1) + ' % of the start view changes (the control: ' + same.toFixed(2) + ' %)');
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: true, hitRefine: 0 })');
                if (!(await enterDeepView(ctx))) return;
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
            name: 'Step size and Hit refine are on the Quality tab without advanced mode; the backtick key and the Settings row switch the advanced rows',
            owner: 'owner, 2026-10-08',
            falsified: '2026-10-08, four breaks, one run each: `isAdvanced: true` put back on `stepSize` in deep-zoom/features/quality.ts -> red, "Step size is shown" false; the backtick binding removed from deep-zoom/hotkeys.ts -> red, "the backtick key turns advanced mode on" false; the Settings row given a `set` that does nothing (deep-zoom/settings.ts) -> red, "switched off there ..." false; `registerDeepZoomSettings()` removed from deep-zoom/main.tsx -> red, "Settings has an Advanced mode row" false. On its first run the step was red for a wrong reason of its own: it looked for the Precision row by `data-help-id`, which option rows do not carry.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                await ctx.sleep(300);
                const has = (param: string) => ctx.ev<boolean>(`!!document.querySelector('[data-help-id^="dzQuality.${param} "]')`);
                ctx.check((await ctx.store<boolean>('advancedMode')) === false, 'advanced mode starts off');
                ctx.check(await has('stepSize'), 'Step size is shown');
                ctx.check(await has('hitRefine'), 'Hit refine is shown');
                // A slider row carries its param in `data-help-id`; an option row (BLA) does not, so
                // that one is looked for by the first words of its description.
                const labelled = (label: string) => ctx.ev<boolean>(`document.body.innerText.includes(${JSON.stringify(label)})`);
                ctx.check(!(await has('resolutionCap')) && !(await labelled('Bivariate linear approximation')), 'Resolution cap and BLA (advanced) are hidden');
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Backquote');
                await ctx.sleep(300);
                ctx.check((await ctx.store<boolean>('advancedMode')) === true, 'the backtick key turns advanced mode on');
                ctx.check((await has('resolutionCap')) && (await labelled('Bivariate linear approximation')), 'and Resolution cap and BLA are shown');
                // The Settings row is the same flag (the panel that draws it is the engine's own).
                const row = await ctx.ev<{ found: boolean; value: unknown }>(`(async () => {
                    const m = await import('/store/settingsRegistry.ts');
                    const d = m.getSettings().find((x) => x.id === 'deep-zoom.advanced-mode');
                    if (!d) return { found: false, value: null };
                    const value = d.get();
                    d.set(false);
                    return { found: true, value };
                })()`);
                ctx.check(row.found && row.value === true, 'Settings has an Advanced mode row and it reads on');
                await ctx.sleep(300);
                ctx.check((await ctx.store<boolean>('advancedMode')) === false && !(await has('resolutionCap')), 'switched off there, the advanced rows are hidden again');
                ctx.check(await has('stepSize'), 'and Step size is still shown');
            },
        },
        {
            name: 'Hit refine reaches the renderer and moves where rays land; back at off the picture is as it was',
            owner: 'renderer',
            falsified: '2026-10-08, two breaks, one run each: the `hitRefine` push made a no-op in deep-zoom/host/looseParams.ts -> red, "the renderer holds 4 halvings" false and 0.0 % of the pixels changed; the refine branch of the shader made dead (`if (false && refine > 0 ...)` in renderer/core.js) -> red, the renderer held 4 and 0.0 % of the pixels changed.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterDeepView(ctx))) return;
                // One sample per frame: with the still accumulating, jitter hides what this changes.
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: false, hitRefine: 0 })');
                await ctx.sleep(900);
                const a = await pixels(ctx);
                await ctx.sleep(300);
                const control = shareChanged(a, await pixels(ctx));
                ctx.note('control: the same view twice differs in ' + control.toFixed(2) + ' % of pixels');
                await ctx.ev('window.__store.getState().setDzQuality({ hitRefine: 4 })');
                await ctx.sleep(700);
                ctx.check((await ctx.host<number>("getParams()['dzQuality.hitRefine']")) === 4, 'the renderer holds 4 halvings');
                const b = await pixels(ctx);
                const moved = shareChanged(a, b);
                ctx.check(moved > Math.max(2, control * 4), 'Hit refine 4 changes ' + moved.toFixed(1) + ' % of the pixels (the control: ' + control.toFixed(2) + ' %)');
                await ctx.ev('window.__store.getState().setDzQuality({ hitRefine: 0 })');
                await ctx.sleep(700);
                const back = shareChanged(a, await pixels(ctx));
                ctx.check(back <= control + 0.5, 'back at off the picture is the first one again (' + back.toFixed(2) + ' % differ)');
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: true })');
            },
        },
        {
            name: 'True-gradient march and Normals: Gradient reach the renderer apart; the gradient builds without stopping the picture and changes it; back at 4-tap and off the picture is as it was',
            owner: 'owner, 2026-10-08 ("yes lets see it in flight") and 2026-10-09 ("im not sure which normals are being shown as there is no option for gradient map normals")',
            falsified: '2026-10-08: the `jacobian` push made a no-op in deep-zoom/host/looseParams.ts -> red, "the renderer holds the setting" false and the picture never changed (timed out at 120 s). 2026-10-09, after Gradient became a Normals option: normal mode 4 made to ask for nothing (`jacNormal = false` in `api.setNormalMode`, renderer/core.js) -> red, the picture never changed (timed out at 120 s) although the march switch was on.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                await ctx.sleep(300);
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('True-gradient march')"), 'the row is shown without advanced mode');
                if (!(await enterDeepView(ctx))) return;
                // the ray march is the default and does not use the true-gradient bits: this step is about the page's march
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: false, trueGradient: false, normals: 2, rayMarch: false })');
                await ctx.sleep(900);
                const a = await pixels(ctx);
                await ctx.sleep(300);
                const control = shareChanged(a, await pixels(ctx));
                const frames0 = await ctx.host<number>('frameCount()');
                await ctx.ev('window.__store.getState().setDzQuality({ trueGradient: true })');
                await ctx.sleep(700);
                ctx.check((await ctx.host<boolean>("getParams()['dzQuality.trueGradient']")) === true, 'the renderer holds the march setting');
                ctx.check((await ctx.host<number>("getParams()['dzQuality.normals']")) === 2, 'and the normals are still 4-tap: the march switch does not change them');
                // Normals: Gradient is the fifth option. Its variant compiles in the background
                // (about 20 s here): 4-tap keeps being drawn, then the picture changes.
                await ctx.ev('window.__store.getState().setDzQuality({ normals: 4 })');
                await ctx.sleep(700);
                ctx.check((await ctx.host<number>("getParams()['dzQuality.normals']")) === 4, 'Normals: Gradient reaches the renderer');
                let moved = 0, waited = 0, stalled = 0, last = await ctx.host<number>('frameCount()');
                while (waited < 120 && moved <= Math.max(2, control * 4)) {
                    await ctx.sleep(1000); waited++;
                    const now = await ctx.host<number>('frameCount()');
                    if (now === last) stalled++;
                    last = now;
                    moved = shareChanged(a, await pixels(ctx));
                }
                ctx.check(moved > Math.max(2, control * 4), 'after ' + waited + ' s the picture changed: ' + moved.toFixed(1) + ' % of the pixels (the control: ' + control.toFixed(2) + ' %)');
                ctx.check(last > frames0 && stalled <= 2, 'the picture kept being drawn while it built (' + stalled + ' of ' + waited + ' seconds without a frame)');
                await ctx.ev('window.__store.getState().setDzQuality({ trueGradient: false, normals: 2 })');
                await ctx.sleep(900);
                ctx.check((await ctx.host<boolean>("getParams()['dzQuality.trueGradient']")) === false, 'switched off, the renderer holds off');
                const back = shareChanged(a, await pixels(ctx));
                ctx.check(back <= control + 0.5, 'and the picture is the first one again (' + back.toFixed(2) + ' % differ)');
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: true, rayMarch: true })');
            },
        },
        {
            name: 'Normal detail shades the surface as a lower Detail would; at 0 the picture is Detail\'s own again',
            owner: 'owner, 2026-10-09 ("detail 32 seems too much in many instances, where it just makes the surface very rough")',
            falsified: '2026-10-09: the `normalDetail` push made a no-op in deep-zoom/host/looseParams.ts -> red, "the renderer holds the setting" false and "shaded differently" at 0.0 % of the pixels.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                await ctx.sleep(300);
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('Normal detail')"), 'the row is shown without advanced mode');
                if (!(await enterDeepView(ctx))) return;
                // on the page's march: the ray march's shader may still be building, and the picture must not change under the step for that reason
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: false, rayMarch: false, normals: 2, detail: 16, normalDetail: 0 })');
                await ctx.sleep(1500);
                const a = await pixels(ctx);
                await ctx.sleep(300);
                const control = shareChanged(a, await pixels(ctx));
                await ctx.ev('window.__store.getState().setDzQuality({ normalDetail: 2 })');
                await ctx.sleep(900);
                ctx.check((await ctx.host<number>("getParams()['dzQuality.normalDetail']")) === 2, 'the renderer holds the setting');
                const moved = shareChanged(a, await pixels(ctx));
                ctx.check(moved > Math.max(2, control * 4), 'the surface is shaded differently: ' + moved.toFixed(1) + ' % of the pixels (the control: ' + control.toFixed(2) + ' %)');
                await ctx.ev('window.__store.getState().setDzQuality({ normalDetail: 0 })');
                await ctx.sleep(900);
                const back = shareChanged(a, await pixels(ctx));
                ctx.check(back <= control + 0.5, 'at 0 the picture is the first one again (' + back.toFixed(2) + ' % differ)');
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: true, detail: 1, rayMarch: true })');
            },
        },
        {
            name: 'Ray march is on from the start, says so while its shader builds, and changes where rays land; off and on again the renderer follows',
            owner: 'owner, 2026-10-09 ("go ahead with the gpu prototype")',
            falsified: '2026-10-09: the `rayMarch` push made a no-op in deep-zoom/host/looseParams.ts -> red, "the renderer holds the setting" false and the picture never changed (timed out). Again the same day as the default: `rayMarch: true` taken out of `shellOptions` (deep-zoom/host/moduleHost.ts) -> red, "on from the start" false.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Quality"]').click();
                await ctx.sleep(300);
                ctx.check(await ctx.ev<boolean>("document.body.innerText.includes('Ray march')"), 'the row is shown without advanced mode');
                ctx.check((await ctx.host<boolean>("getParams()['dzQuality.rayMarch']")) === true, 'on from the start: the renderer holds it before anything is pushed');
                if (!(await enterDeepView(ctx))) return;
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: false, rayMarch: false, trueGradient: false, normals: 2, detail: 8 })');
                await ctx.sleep(1200);
                ctx.check((await ctx.host<boolean>("getParams()['dzQuality.rayMarch']")) === false, 'switched off, the renderer holds off');
                const a = await pixels(ctx);
                await ctx.sleep(300);
                const control = shareChanged(a, await pixels(ctx));
                const frames0 = await ctx.host<number>('frameCount()');
                await ctx.ev('window.__store.getState().setDzQuality({ rayMarch: true })');
                await ctx.sleep(700);
                ctx.check((await ctx.host<boolean>("getParams()['dzQuality.rayMarch']")) === true, 'switched on again, the renderer holds the setting');
                // its variant builds in the background from the first deep frame (about 20 s the first time): the page's march is drawn until it is there
                let moved = 0, waited = 0, stalled = 0, last = await ctx.host<number>('frameCount()');
                while (waited < 150 && moved <= Math.max(1, control * 4)) {
                    await ctx.sleep(1000); waited++;
                    const now = await ctx.host<number>('frameCount()');
                    if (now === last) stalled++;
                    last = now;
                    moved = shareChanged(a, await pixels(ctx));
                }
                ctx.check(moved > Math.max(1, control * 4), 'the picture is another one than the page march' + String.fromCharCode(39) + 's: ' + moved.toFixed(1) + ' % of the pixels (the control: ' + control.toFixed(2) + ' %)');
                // its shader built in the background (the top bar says "ray march: building" meanwhile - seen with a fresh browser profile, debug/scratch/ray-chip.mjs); by now it draws
                ctx.check(!(await ctx.ev<boolean>("!!document.querySelector('[data-dz-status-ray]')")), 'and the top bar does not say it is building any more');
                ctx.check(last > frames0 && stalled <= 2, 'the picture kept being drawn (' + stalled + ' of ' + waited + ' seconds without a frame)');
                await ctx.ev('window.__store.getState().setDzQuality({ rayMarch: false })');
                await ctx.sleep(900);
                const back = shareChanged(a, await pixels(ctx));
                ctx.check(back <= control + 0.5, 'off again the picture is the page march' + String.fromCharCode(39) + 's again (' + back.toFixed(2) + ' % differ)');
                await ctx.ev('window.__store.getState().setDzQuality({ accumulate: true, detail: 1, rayMarch: true })');
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
