/**
 * smoke:deep-zoom, stage N5 - the shell flies with GMT's navigation.
 *
 *   DZ_HEADLESS=1 ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage N5
 *
 * What the steps lean on (deep-zoom/DeepZoomNavigation.tsx, flyCamera.ts, navigationState.ts):
 *   - Nothing captures the pointer, so every step runs headless: real key and mouse events
 *     through the engine's input hook, the fly integrator, and `host.moveAlong` /
 *     `host.setYawPitch`.
 *   - A move is read off the camera strings as a DIRECTION: the difference of two 256-bit
 *     integers per axis, as a float (their scale cancels), against the renderer's own forward
 *     for the current yaw and pitch (`function basis()` in renderer/core.js).
 *   - The fly speed is a preference in `localStorage['gmt.deepZoom.flySpeed']` and the last line
 *     of the depth readout (`[data-dz-fly-speed]`).
 *   - The maths of the adapter (basis, turntable turn, zero floors) is pinned in node by
 *     `npm run check:deep-zoom-fly-camera`; these steps prove it is WIRED.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import { DEEP_VIEW, enterDeepView } from './stage1.mts';

type V3 = [number, number, number];
const cam = (ctx: DzCtx) => ctx.host<string[]>('getView().cam');
const look = (ctx: DzCtx) => ctx.host<{ yaw: number; pitch: number }>('yawPitch()');
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
/** The move from `a` to `b` as a unit direction (null when nothing moved). */
function direction(a: string[], b: string[]): V3 | null {
    const d = [0, 1, 2].map((j) => Number(BigInt(b[j]) - BigInt(a[j])));
    const len = Math.hypot(d[0], d[1], d[2]);
    return len > 0 ? [d[0] / len, d[1] / len, d[2] / len] : null;
}
/** The renderer's forward for a yaw and pitch. */
function forward(yaw: number, pitch: number): V3 {
    const cp = Math.cos(pitch);
    return [cp * Math.cos(yaw), Math.sin(pitch), cp * Math.sin(yaw)];
}
const dot = (a: V3 | null, b: V3): number => (a ? a[0] * b[0] + a[1] * b[1] + a[2] * b[2] : NaN);
const fx = (v: number): string => (Number.isFinite(v) ? v.toFixed(4) : String(v));
const speedText = (ctx: DzCtx) => ctx.ev<string>("(document.querySelector('[data-dz-fly-speed]') || { textContent: '' }).textContent.trim()");
const storedSpeed = (ctx: DzCtx) => ctx.ev<number>("Number(localStorage.getItem('gmt.deepZoom.flySpeed'))");

/** Press and hold the left button at the picture's centre, move by (dx, dy) pixels, hold, release. */
async function lookDrag(ctx: DzCtx, dx: number, dy: number, holdMs: number, during?: () => Promise<void>): Promise<void> {
    const c = await ctx.pictureCentre();
    await ctx.page.mouse.move(c.x, c.y);
    await ctx.page.mouse.down();
    try {
        await ctx.page.mouse.move(c.x + dx, c.y + dy, { steps: 6 });
        await ctx.sleep(holdMs);
        if (during) await during();
    } finally {
        await ctx.page.mouse.up();
    }
    await ctx.sleep(700);   // the turn eases out: about 0.4 s from a full drag to rest
}

export const stage: DzStage = {
    id: 'N5',
    title: "GMT's navigation flies the deep renderer",
    steps: [
        {
            name: 'W flies along the view and S back, with the keyboard anywhere; nothing moves once the key is up',
            owner: 'N5',
            falsified: '2026-10-08: the sink\'s sign flipped in deep-zoom/DeepZoomNavigation.tsx (`host.moveAlong([-dx, -dy, -dz], 1)`) -> red, three lines: "W moved the camera along the view (direction . forward = -1.0000)", the surface farther (1.24 -> 3.31), S forward. Also red with `<DeepZoomNavigation />` taken out of DeepZoomApp.tsx: nothing moved (the own keys of the renderer module need the picture focused, and this step holds W with the keyboard on the page body).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                // The keyboard on the page body: the fly keys are heard on the window.
                await ctx.ev("(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return true; })()");
                const l = await look(ctx);
                const f = forward(l.yaw, l.pitch);
                const d0 = await ctx.host<number>('rawDistance()');
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 400);
                await ctx.sleep(200);
                const c1 = await cam(ctx);
                const along = dot(direction(c0, c1), f);
                ctx.check(along > 0.9999, 'W moved the camera along the view (direction . forward = ' + fx(along) + ')');
                const d1 = await ctx.host<number>('rawDistance()');
                ctx.check(d1 < d0, 'and the surface is nearer (' + d0.toExponential(2) + ' -> ' + d1.toExponential(2) + ')');
                await ctx.sleep(300);
                ctx.check(same(c1, await cam(ctx)), 'with the key up the camera strings stay as they are');
                await ctx.holdKey('s', 400);
                await ctx.sleep(200);
                const back = dot(direction(c1, await cam(ctx)), f);
                ctx.check(back < -0.9999, 'S moved it back along the view (' + fx(back) + ')');
                ctx.check(!(await ctx.ev<boolean>('!!document.pointerLockElement')), 'no pointer is captured');
            },
        },
        {
            name: 'a drag on the picture turns the camera: right raises the yaw, up raises the pitch, and it does not move',
            owner: 'N5',
            falsified: '2026-10-08: the `host.setYawPitch(turned.yaw, turned.pitch)` line removed from DeepZoomNavigation.tsx -> red, yaw -1.5708 -> -1.5708 and pitch 0 -> 0. Also red on its first run for a real reason: the yaw was read 250 ms after the drag, while the turn was still easing out (the wait is 700 ms now).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                const c0 = await cam(ctx);
                const l0 = await look(ctx);
                let reticle = '';
                await lookDrag(ctx, 160, 0, 500, async () => {
                    reticle = await ctx.ev<string>("(document.querySelector('[data-dz-reticle]') || { style: {} }).style.opacity || ''");
                });
                const l1 = await look(ctx);
                ctx.check(l1.yaw > l0.yaw + 0.05, 'a drag to the right raised the yaw (' + fx(l0.yaw) + ' -> ' + fx(l1.yaw) + ')');
                ctx.check(Math.abs(l1.pitch - l0.pitch) < 1e-6, 'and left the pitch alone (' + fx(l0.pitch) + ' -> ' + fx(l1.pitch) + ')');
                ctx.check(reticle === '1', 'the reticle shows while the drag is held (opacity "' + reticle + '")');
                await lookDrag(ctx, 0, -120, 500);
                const l2 = await look(ctx);
                ctx.check(l2.pitch > l1.pitch + 0.05, 'a drag up raised the pitch (' + fx(l1.pitch) + ' -> ' + fx(l2.pitch) + ')');
                ctx.check(Math.abs(l2.yaw - l1.yaw) < 1e-6, 'and left the yaw alone');
                ctx.check(same(c0, await cam(ctx)), 'the camera strings are unchanged: a look does not move');
                ctx.check((await ctx.ev<string>("(document.querySelector('[data-dz-reticle]') || { style: {} }).style.opacity || ''")) === '0', 'the reticle is gone after the drag');
                // W now flies along the NEW view.
                const f = forward(l2.yaw, l2.pitch);
                await ctx.holdKey('w', 300);
                await ctx.sleep(200);
                const along = dot(direction(c0, await cam(ctx)), f);
                ctx.check(along > 0.9999, 'W then flies along the turned view (' + fx(along) + ')');
            },
        },
        {
            name: 'the wheel changes the fly speed by a tenth a notch, within its range, and it is remembered',
            owner: 'N5',
            falsified: "2026-10-08, two breaks, one run each: `wheelStep: dzWheelStep` removed (the engine's additive law applies) -> red, one notch gave 3.58 and the notches up stopped far short of the top; the `localStorage.setItem` line removed from deep-zoom/navigationState.ts -> red, nothing stored and 3.6 again after the reload.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                ctx.check((await speedText(ctx)).includes('3.6'), 'the readout starts at the default speed ("' + (await speedText(ctx)) + '")');
                const c = await ctx.pictureCentre();
                await ctx.page.mouse.move(c.x, c.y);
                await ctx.page.mouse.wheel(0, 100);
                await ctx.sleep(200);
                const one = await storedSpeed(ctx);
                ctx.check(Math.abs(one - 3.6 / 1.1) < 1e-9, 'one notch down: 3.6 -> 3.6 / 1.1 (' + one + ')');
                ctx.check((await speedText(ctx)).includes('3.3'), 'the readout follows ("' + (await speedText(ctx)) + '")');
                for (let i = 0; i < 12; i++) { await ctx.page.mouse.wheel(0, -100); await ctx.sleep(60); }
                await ctx.sleep(200);
                ctx.check((await storedSpeed(ctx)) === 8, 'twelve notches up stop at the top of the range, 8 (' + (await storedSpeed(ctx)) + ')');
                await ctx.boot();
                ctx.check((await speedText(ctx)).includes('8.0'), 'after a reload the speed is still 8 ("' + (await speedText(ctx)) + '")');
                await ctx.ev("(() => { localStorage.removeItem('gmt.deepZoom.flySpeed'); return true; })()");
            },
        },
        {
            name: 'at 1e-23 W flies by a share of the depth, and S gives it back',
            owner: 'N5',
            falsified: "2026-10-08: `minSpeed: 0` removed from deep-zoom/flyCamera.ts (the engine's 1e-6 floor applies) -> red, a quarter second of W took the surface from 1.14e-17 to 5.51e-11: thrown six decades out.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(600);
                const d0 = await ctx.host<number>('rawDistance()');
                if (!ctx.check(d0 > 0 && d0 < 1e-15, 'the view is deep (surface at ' + d0.toExponential(2) + ')')) return;
                const f = forward(DEEP_VIEW.yaw, DEEP_VIEW.pitch);
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 250);
                await ctx.sleep(400);
                const c1 = await cam(ctx);
                const d1 = await ctx.host<number>('rawDistance()');
                const along = dot(direction(c0, c1), f);
                ctx.check(along > 0.9999, 'W moved along the view (' + fx(along) + ')');
                ctx.check(d1 < d0 && d1 > d0 * 0.02, 'the surface came nearer by a share of the depth, not by decades (' + d0.toExponential(2) + ' -> ' + d1.toExponential(2) + ')');
                await ctx.holdKey('s', 250);
                await ctx.sleep(400);
                const d2 = await ctx.host<number>('rawDistance()');
                ctx.check(d2 > d1 && d2 < d0 * 50, 'S backed away again (' + d1.toExponential(2) + ' -> ' + d2.toExponential(2) + ')');
            },
        },
        {
            name: 'a fly key typed in a text field moves nothing; a click on the picture takes the keyboard back',
            owner: 'N5',
            falsified: '2026-10-08: `tabIndex={0}` removed from #dz-frame in DeepZoomSurface.tsx -> red, "a click on the picture gives #dz-frame the keyboard" false. The first half (a key in a field moves nothing) is the input hook\'s own rule (grep `isTypingTarget` in engine/plugins/navigation/useNavigationInput.ts) and was not falsified here.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                await field.click();
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 400);
                await ctx.holdKey('Space', 300);
                await ctx.sleep(200);
                ctx.check(same(c0, await cam(ctx)), 'W and Space held in the Dive field leave the camera strings unchanged');
                const c = await ctx.pictureCentre();
                await ctx.page.mouse.click(c.x, c.y);
                ctx.check(await ctx.ev<boolean>("document.activeElement === document.getElementById('dz-frame')"), 'a click on the picture gives #dz-frame the keyboard');
                ctx.check(!(await ctx.ev<boolean>('!!document.pointerLockElement')), 'and captures no pointer');
                await ctx.holdKey('w', 300);
                await ctx.sleep(200);
                ctx.check(!same(c0, await cam(ctx)), 'W then flies');
            },
        },
        {
            name: 'a look drag steers a dive in flight; a fly key ends it',
            owner: 'N5',
            falsified: '2026-10-08: the `if (useDive.getState().dive) stopDive();` line removed from the sink in DeepZoomNavigation.tsx -> red, "S ended the dive" false (with the keyboard on the page body; on #dz-frame the host\'s own dive listener ends it and the step would stay green).',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                await field.fill('20');
                await field.press('Enter');
                if (!ctx.check((await ctx.until("!!document.querySelector('[data-dz-diving]')", 3000)) >= 0, 'a dive is in flight')) return;
                const c = await ctx.pictureCentre();
                await ctx.page.mouse.click(c.x, c.y);   // the keyboard out of the field
                const l0 = await look(ctx);
                await lookDrag(ctx, 60, 0, 300);
                const l1 = await look(ctx);
                ctx.check(l1.yaw > l0.yaw + 0.01 && (await ctx.ev<boolean>("!!document.querySelector('[data-dz-diving]')")), 'a look drag turned the camera and the dive is still in flight');
                // The keyboard on the page body: the host's own dive listener sits on #dz-frame and
                // would end the dive by itself there. From the body only the navigation can.
                await ctx.ev("(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return true; })()");
                ctx.check(await ctx.ev<boolean>("document.activeElement === document.body && !!document.querySelector('[data-dz-diving]')"), 'the keyboard is on the page body and the dive is still in flight');
                await ctx.holdKey('s', 200);
                ctx.check((await ctx.until("!document.querySelector('[data-dz-diving]')", 2000, 50)) >= 0, 'S ended the dive');
            },
        },
        {
            name: 'Space and E fly up, C and Q down; C no longer changes the colouring, V does; Space does not play the timeline',
            owner: 'N5',
            falsified: '2026-10-08, three breaks, one run each: the `cameraMode: \'Fly\'` line removed from deep-zoom/setup.ts -> red, "Space on the picture did not start the timeline" false; the colouring key put back on `c` in deep-zoom/hotkeys.ts -> red, "C did not change the colouring" false; `move.up = held.up` in deep-zoom/flyCamera.ts -> red, "Space and E raised the camera" false.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.focusPicture();
                // At the start view (yaw -pi/2, pitch 0) the camera's up is the world's +Y.
                const y = async () => BigInt((await cam(ctx))[1]);
                // The key is held until the camera has moved (3 s at most), not for a fixed time: on a
                // busy machine a 250 ms hold can fall between two frames (seen once, 2026-10-08, with
                // the owner rendering a heavy view in his own browser on the same GPU).
                const moved = async (key: string): Promise<bigint> => {
                    const before = await y();
                    await ctx.page.keyboard.down(key);
                    try {
                        const start = Date.now();
                        while (Date.now() - start < 3000 && (await y()) === before) await ctx.sleep(50);
                    } finally {
                        await ctx.page.keyboard.up(key);
                    }
                    await ctx.sleep(200);
                    return (await y()) - before;
                };
                const up = await moved('Space');
                const down = await moved('c');
                const e = await moved('e');
                const q = await moved('q');
                ctx.check(up > 0n && e > 0n, 'Space and E raised the camera');
                ctx.check(down < 0n && q < 0n, 'C and Q lowered it');
                ctx.check((await ctx.host<number>('getParams().color')) === 0, 'C did not change the colouring');
                await ctx.page.keyboard.press('v');
                await ctx.sleep(250);
                ctx.check((await ctx.host<number>('getParams().color')) === 1, 'V is the next colouring');
                // A timeline with a track: without the fly mode on the store, Space would play it.
                const playing = await ctx.ev<boolean>(`(async () => {
                    const m = await import('/store/animationStore.ts');
                    const s = m.useAnimationStore.getState();
                    m.useAnimationStore.setState({ sequence: { ...s.sequence, tracks: { 'dzQuality.detail': { id: 'dzQuality.detail', type: 'float', label: 'Detail', keyframes: [] } } } });
                    return m.useAnimationStore.getState().isPlaying;
                })()`);
                ctx.check(playing === false, 'a track exists and the timeline is stopped');
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Space');
                await ctx.sleep(250);
                const after = await ctx.ev<boolean>("(async () => (await import('/store/animationStore.ts')).useAnimationStore.getState().isPlaying)()");
                ctx.check(after === false, 'Space on the picture did not start the timeline');
                await ctx.ev("(async () => { const m = await import('/store/animationStore.ts'); m.useAnimationStore.getState().pause(); const s = m.useAnimationStore.getState(); m.useAnimationStore.setState({ sequence: { ...s.sequence, tracks: {} } }); return true; })()");
                await ctx.ev("(() => { window.__store.getState().setDzColour({ plain: true, mode: 0 }); return true; })()");
            },
        },
        {
            name: 'while a fly key is held a slot digit does not recall a place',
            owner: 'N5',
            falsified: '2026-10-08: the `when` removed from `slotShortcuts` in deep-zoom/locations.ts -> red, "with W and S held, 1 left the camera where it was" false. The first version of this step held D alone and stayed GREEN under the same break (the camera flies on after a recall), which is why it holds two opposite keys.',
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.page.locator('button[data-gx-mode-tab="Locations"]').click();
                await ctx.focusPicture();
                await ctx.page.keyboard.press('b');
                if (!ctx.check((await ctx.until('(window.__store.getState().savedLocations || []).length === 1', 4000, 50)) >= 0, 'B saved the start view as place 1')) return;
                const saved = await cam(ctx);
                await ctx.holdKey('s', 400);
                await ctx.sleep(200);
                const away = await cam(ctx);
                ctx.check(!same(saved, away), 'S flew away from it');
                // W and S together: the hands are flying and the camera goes nowhere, so a recall
                // is the only thing that could change the strings. (With one key held the camera
                // moves on after a recall and the two cases look alike: seen 2026-10-08, the step
                // stayed green with the `when` removed.)
                await ctx.page.keyboard.down('w');
                await ctx.page.keyboard.down('s');
                let held: string[] = [];
                try {
                    await ctx.sleep(200);
                    await ctx.page.keyboard.press('1');
                    await ctx.sleep(300);
                    held = await cam(ctx);
                } finally {
                    await ctx.page.keyboard.up('s');
                    await ctx.page.keyboard.up('w');
                }
                ctx.check(same(held, away), 'with W and S held, 1 left the camera where it was');
                await ctx.sleep(300);
                await ctx.page.keyboard.press('1');
                await ctx.sleep(400);
                ctx.check(same(await cam(ctx), saved), 'with the keys up, 1 recalls it (the camera strings are the saved ones)');
            },
        },
    ],
};
