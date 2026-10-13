/**
 * smoke:deep-zoom, stage 4 - keys.
 *
 *   DZ_HEADLESS=1 ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage 4
 *
 * What the steps lean on (deep-zoom/hotkeys.ts):
 *   - Every look key writes a store value through its feature setter; the store-to-renderer sync
 *     then carries it. "Once" is checked on both sides: the store moved by one step, and the
 *     renderer holds the same value (a second writer would move it twice).
 *   - The fly keys (W A S D, Q E, Space, C, Shift, Alt) are not shortcuts and are not here:
 *     stage N5's file. `C` was "next colouring" until N5; it is `V` now.
 *   - Help topics, the shortcuts page and the first-dive lesson are not built yet; when they are,
 *     their steps join this file.
 */
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';

const cam = (ctx: DzCtx) => ctx.host<string[]>('getView().cam');
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const RESET = `(() => { const s = window.__store.getState();
    s.setDzQuality({ detail: 1 }); s.setDzFormula({ power: 8, iterations: 14, autoIterations: true });
    s.setDzLight({ lightType: 0, lampFalloff: 4 }); s.setDzColour({ plain: true, mode: 0, scale: 1 }); s.setDzInspect({ overlays: 0 }); return true; })()`;

async function press(ctx: DzCtx, key: string): Promise<void> {
    await ctx.page.keyboard.press(key);
    await ctx.sleep(220);   // past the sync's 90 ms hold on orbit-rebuilding values
}

export const stage: DzStage = {
    id: '4',
    title: 'keys',
    steps: [
        {
            name: 'each look key moves its store value by one step and the renderer follows, once',
            owner: 'S4-1',
            falsified: '2026-10-08: red before each look key was wrapped in a param transaction - "Ctrl+Z undoes the last key" false (a bare setter leaves no undo entry). The "once" half was not falsified: it would need a second writer.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.ev(RESET);
                await ctx.focusPicture();
                await press(ctx, 'g');
                ctx.check(near(await ctx.store<number>('dzQuality.detail'), 1.5) && near(await ctx.host<number>('getParams().detail'), 1.5), 'G: detail 1 -> 1.5 in the store and in the renderer');
                await press(ctx, 'f');
                await press(ctx, 'f');
                ctx.check(near(await ctx.store<number>('dzQuality.detail'), 1 / 1.5) && near(await ctx.host<number>('getParams().detail'), 1 / 1.5), 'F twice: detail 1.5 -> 0.667');
                await press(ctx, '=');
                ctx.check((await ctx.store<number>('dzFormula.power')) === 9 && (await ctx.host<number>('getParams().power')) === 9, '=: power 8 -> 9');
                await press(ctx, '-');
                ctx.check((await ctx.store<number>('dzFormula.power')) === 8 && (await ctx.host<number>('getParams().power')) === 8, '-: power back to 8');
                await press(ctx, ']');
                ctx.check((await ctx.store<number>('dzFormula.iterations')) === 15, ']: iterations 14 -> 15');
                await press(ctx, '[');
                ctx.check((await ctx.store<number>('dzFormula.iterations')) === 14, '[: iterations back to 14');
                await press(ctx, 'i');
                ctx.check((await ctx.store<boolean>('dzFormula.autoIterations')) === false && (await ctx.host<boolean>("getParams()['dzFormula.autoIterations']")) === false, 'I: auto iterations off, in the renderer too');
                const colours: number[] = [];
                for (let i = 0; i < 3; i++) { await press(ctx, 'v'); colours.push(await ctx.host<number>('getParams().color')); }
                ctx.check(colours.join() === '1,2,0', 'V three times: the renderer colouring goes 1, 2, 0 (' + colours.join(', ') + ')');
                await press(ctx, 'l');
                ctx.check((await ctx.store<number>('dzLight.lightType')) === 1 && (await ctx.host<number>('getParams().light')) === 1, 'L: light type Direct -> Lamp');
                await press(ctx, 'o');
                ctx.check((await ctx.store<number>('dzInspect.overlays')) === 1 && !(await ctx.ev<boolean>("!!document.querySelector('[data-dz-depth-scale]')")), 'O: overlays Depth only, the scale is gone');
                await press(ctx, 'Control+z');
                ctx.check((await ctx.store<number>('dzInspect.overlays')) === 0, 'Ctrl+Z undoes the last key');
                await ctx.ev(RESET);
            },
        },
        {
            name: 'a look key typed in a text field does nothing',
            owner: 'S4-1',
            falsified: "not falsified: that a key typed in a text field does nothing is the dispatcher's own rule (grep DEFAULT_IGNORE_SELECTOR in engine/plugins/Shortcuts.ts); this step only shows this app did not opt out of it.",
            async run(ctx) {
                await ctx.boot();
                await ctx.ev(RESET);
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                await field.click();
                await field.press('g');
                await field.press('v');
                await ctx.sleep(250);
                ctx.check(near(await ctx.store<number>('dzQuality.detail'), 1) && (await ctx.host<number>('getParams().color')) === 0, 'G and V typed in the Dive field change nothing');
                await ctx.focusPicture();
                await press(ctx, 'j');
                ctx.check(await ctx.ev<boolean>("document.activeElement === document.querySelector('[data-dz-dive-exponent]')"), 'J: the Dive field has the keyboard');
            },
        },
        {
            name: 'Escape stops a dive in flight, with the keyboard off the picture too',
            owner: 'S4-1',
            falsified: '2026-10-08: the Escape binding\'s `when` made always false in deep-zoom/hotkeys.ts -> red, "Escape ended it" false (with the keyboard on a dock tab; with it on the picture the dive hears Escape itself and the step stayed green).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                await field.fill('20');
                await field.press('Enter');
                if (!ctx.check((await ctx.until("!!document.querySelector('[data-dz-diving]')", 3000)) >= 0, 'a dive is in flight')) return;
                await ctx.sleep(500);
                // With the keyboard on the picture the dive hears Escape itself (host/dive.ts). The
                // engine shortcut is for everywhere else: put the keyboard on a dock tab first.
                await ctx.page.locator('button[data-gx-mode-tab="Formula"]').click();
                ctx.check(await ctx.ev<boolean>("document.activeElement !== document.getElementById('dz-frame') && !!document.querySelector('[data-dz-diving]')"), 'the keyboard is off the picture and the dive is still in flight');
                await ctx.page.keyboard.press('Escape');
                ctx.check((await ctx.until("!document.querySelector('[data-dz-diving]')", 2000, 50)) >= 0, 'Escape ended it');
                const depth = await ctx.host<number>('telemetry().depth');
                ctx.check(depth > 1e-10, 'well short of its 1e-20 target (' + depth.toExponential(2) + ')');
            },
        },
    ],
};
