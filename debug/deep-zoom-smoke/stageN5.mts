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
 *   - Since 2026-10-09 the speed follows what is looked at and what lies ahead of the move
 *     (deep-zoom/flyPace.ts; the rays are the renderer's, `npm run check:deep-zoom-ray-probe`).
 *     The last three steps prove THAT is wired, at the one saved place where it differs from the
 *     old rule by 22 decades: the owner's power-4 place (the last starter), 3.4e-76 from a wall
 *     that is behind the camera, looking at a scene about 1e-54 away.
 *   - Orbit mode (Tab) is read the way a move is: the camera's move as the difference of its
 *     position strings, against what the maths of `deep-zoom/orbitCamera.ts` says a turn about the
 *     picked point or a wheel notch towards it must be. That module is loaded IN THE PAGE (by its
 *     dev-server address), so the step and the app use one copy of the formula; the formula itself
 *     is pinned in node by `npm run check:deep-zoom-orbit-camera`.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import { DEEP_VIEW, enterDeepView } from './stage1.mts';
import { STARTERS } from '../../deep-zoom/data/starters.ts';

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
/** How far the camera moved from `a` to `b`, in world units (the strings are 256-bit fixed point). */
function moveLength(a: string[], b: string[]): number {
    const d = [0, 1, 2].map((j) => Number(BigInt(b[j]) - BigInt(a[j])) / 2 ** 256);
    return Math.hypot(d[0], d[1], d[2]);
}
/** The owner's power-4 place: 3.4e-76 from a wall BEHIND the camera, a scene about 1e-54 away ahead. */
const WALL_BEHIND = STARTERS[STARTERS.length - 1].view;
const readoutText = (ctx: DzCtx, attr: string) => ctx.ev<string>(`(document.querySelector('[${attr}]') || { textContent: '' }).textContent.trim()`);
const undoDepth = (ctx: DzCtx) => ctx.ev<number>('window.__store.getState().paramUndoStack.length');
const cameraMode = (ctx: DzCtx) => ctx.ev<string>("window.__store.getState().cameraMode");
/** The move from `a` to `b` in world units, per axis. */
function moveOf(a: string[], b: string[]): V3 {
    return [0, 1, 2].map((j) => Number(BigInt(b[j]) - BigInt(a[j])) / 2 ** 256) as V3;
}
/** What is under a point of the picture, `dx` / `dy` CSS pixels from its centre: the point as the
 *  orbit maths names it (u right, v up, in picture heights), the ray through it and how far the
 *  surface is along that ray - all worked out in the page, with the app's own module. */
async function under(ctx: DzCtx, dx: number, dy: number): Promise<{ u: number; v: number; ray: V3; distance: number; kind: string; height: number }> {
    return ctx.withHost(`
        const m = await import('/deep-zoom/orbitCamera.ts');
        const rect = host.canvas().getBoundingClientRect();
        const u = ${dx} / rect.height, v = ${-dy} / rect.height;
        const look = host.yawPitch();
        const ray = m.viewRay(look.yaw, look.pitch, u, v);
        const hit = host.freeDistance(ray, { tol: 0.005, maxSteps: 512 });
        return { u, v, ray, distance: hit.t, kind: hit.kind, height: rect.height };`);
}
/** Jump to the wall-behind place and wait until the readout has read through to the scene. */
async function enterWallBehind(ctx: DzCtx): Promise<boolean> {
    await ctx.withHost('host.setView(' + JSON.stringify(WALL_BEHIND) + '); return true;');
    const drawn = await ctx.untilHost("host.telemetry().mode === 'deep' && host.telemetry().depth < 1e-70", 20_000, 50);
    if (!ctx.check(drawn >= 0, 'the place is drawn, and the nearest surface is under 1e-70 (' + (await ctx.host<number>('rawDistance()')).toExponential(2) + ')')) return false;
    const settled = await ctx.until("/e-5[2-6]$/.test((document.querySelector('[data-dz-depth]') || { textContent: '' }).textContent.trim())", 10_000, 100);
    return ctx.check(settled >= 0, 'the depth readout reads through to what is looked at, about 1e-54 ("' + (await readoutText(ctx, 'data-dz-depth')) + '"' + (settled >= 0 ? ', after ' + settled + ' ms)' : ', not after 10 s)'));
}
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
        {
            name: 'with a wall close behind, the depth shown is what is looked at, and W flies at its pace',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each: the old rule forced in deep-zoom/DeepZoomNavigation.tsx (`sense: nav.followView && false ? ...`) -> red, 'three seconds of W moved the camera 1.96e-74' (5.09e-57 under the rule); `if (look > 0)` made `if (look > 1e300)` in deep-zoom/depthNow.ts (the nearest surface shown) -> red, the readout stayed at '3.38e-76', 'not after 10 s'.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterWallBehind(ctx))) return;
                const nearest = await readoutText(ctx, 'data-dz-nearest');
                ctx.check(/nearest surface \de-7[5-7]/.test(nearest), 'a second line says where the nearest surface is ("' + nearest + '")');
                const looked = await ctx.host<{ near: number; second: number; hits: number; inside: boolean }>("sense(null, { slot: 'look' })");
                ctx.check(looked.hits === 7 && !looked.inside && looked.second > 1e-56 && looked.second < 1e-52, 'host.sense: all seven rays met the scene, ' + looked.second.toExponential(2) + ' away');
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 3000);
                await ctx.sleep(300);
                const moved = moveLength(c0, await cam(ctx));
                ctx.check(moved > 1e-66, 'three seconds of W moved the camera ' + moved.toExponential(2) + ' (more than 1e-66; by the nearest surface it moves about 1e-74)');
                ctx.check(moved < looked.second, 'and not as far as what it flies at (' + looked.second.toExponential(2) + ')');
                const after = await ctx.host<{ inside: boolean }>('sense(null)');
                ctx.check(!after.inside && (await ctx.host<number>('rawDistance()')) > 0, 'the camera is not inside the solid');
                const pace = await readoutText(ctx, 'data-dz-pace');
                ctx.check(/^pace \de-\d+$/.test(pace), 'the readout shows the pace ("' + pace + '")');
            },
        },
        {
            name: 'a dive from there closes on what is ahead: Dive to 1e-60 arrives at 1e-60',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each, both in deep-zoom/host/moduleHost.ts: `depth: aheadOf` made `depth: () => dz.telemetry().depth` (the estimate at the camera) -> red, 'the dive took off and ended (it did not)'; the ask-on loop in `aheadOf` removed -> red the same way, 'the nearest ray ahead is at the target, 1e-60 (5.602e-71)': a ray that had run out of steps was read as already under the target. The second is how this step failed the first time it ran.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterWallBehind(ctx))) return;
                const c0 = await cam(ctx);
                const field = ctx.page.locator('[data-dz-dive-exponent]');
                await field.fill('60');
                await field.press('Enter');
                const began = await ctx.until("!!document.querySelector('[data-dz-diving]')", 3000, 50);
                const ended = began >= 0 ? await ctx.until("!document.querySelector('[data-dz-diving]')", 40_000, 100) : -1;
                ctx.check(began >= 0 && ended >= 0, 'the dive took off and ended (' + (ended >= 0 ? ended + ' ms' : 'it did not') + ')');
                const ahead = await ctx.host<{ near: number; inside: boolean }>('sense(null)');
                ctx.check(!ahead.inside && ahead.near <= 1.001e-60 && ahead.near >= 0.5e-60, 'the nearest ray ahead is at the target, 1e-60 (' + ahead.near.toExponential(3) + ')');
                ctx.check(moveLength(c0, await cam(ctx)) > 1e-56, 'and the camera flew there');
            },
        },
        {
            name: 'a flight is one undo step: Ctrl+Z puts the camera back where it took off; a look alone is none',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each: `flightEnded();` taken out of `onFlyEnd` in deep-zoom/DeepZoomNavigation.tsx -> red, 'the flight left one undo entry (0 -> 0)' and Ctrl+Z left the camera where it landed; the merge test in `flightEnded` (deep-zoom/locations.ts) made never true -> red, 'two more taps right after it are the same flight' (three entries), and Ctrl+Z then went back one tap, not to the take-off.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                await ctx.focusPicture();
                const c0 = await cam(ctx);
                const u0 = await undoDepth(ctx);
                await ctx.holdKey('w', 400);
                await ctx.sleep(400);
                const c1 = await cam(ctx);
                const u1 = await undoDepth(ctx);
                ctx.check(!same(c0, c1) && u1 === u0 + 1, 'W flew, and the flight left one undo entry (' + u0 + ' -> ' + u1 + ')');
                // A second and a third take-off within a second and a half of the last landing: the same flight.
                await ctx.holdKey('w', 150);
                await ctx.sleep(300);
                await ctx.holdKey('d', 150);
                await ctx.sleep(400);
                const c2 = await cam(ctx);
                ctx.check(!same(c1, c2) && (await undoDepth(ctx)) === u1, 'two more taps right after it are the same flight: still one entry');
                await ctx.sleep(1700);
                await lookDrag(ctx, 120, 0, 300);
                ctx.check((await undoDepth(ctx)) === u1, 'a look drag alone leaves no entry');
                await ctx.page.keyboard.press('Control+z');
                await ctx.sleep(500);
                ctx.check(same(await cam(ctx), c0), 'Ctrl+Z put the camera back where the flight took off');
                await ctx.page.keyboard.press('Control+y');
                await ctx.sleep(500);
                ctx.check(same(await cam(ctx), c2), 'and redo returned it to where it landed');
            },
        },
        {
            name: 'the speed rule is a setting: off, W crawls by the nearest surface; on, it flies by the view; both rows are remembered',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each, both in deep-zoom/navigationState.ts: `setFollowView` only remembering, not switching (its `setState` line removed) -> red, with the switch off the pace read 'pace 2e-67' and two seconds of W moved the camera 2.25e-60 (5.08e-75 by the nearest surface); the rise limit not remembered (`remember(PACE_RISE_KEY, ...)` removed) -> red, 'after a reload the rule is on and the rise limit is 16 (true, 4)'.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterWallBehind(ctx))) return;
                /** A row of the engine's Settings panel, through the registry the panel draws from. */
                const row = (id: string, write?: string) => ctx.ev<{ found: boolean; value: unknown; shown: boolean; kind: string; min?: number; max?: number }>(`(async () => {
                    const m = await import('/store/settingsRegistry.ts');
                    const d = m.getSettings().find((x) => x.id === '${id}');
                    if (!d) return { found: false, value: null, shown: false, kind: '' };
                    ${write ? `d.set(${write});` : ''}
                    return { found: true, value: d.get(), shown: !d.when || d.when(), kind: d.control.kind, min: d.control.min, max: d.control.max };
                })()`);
                const follow = await row('deep-zoom.speed-follows-view');
                const rise = await row('deep-zoom.speed-rise-limit');
                ctx.check(follow.found && follow.value === true && follow.kind === 'boolean', 'Settings has "Speed follows the view", and it is on');
                ctx.check(rise.found && rise.value === 4 && rise.shown && rise.kind === 'number' && rise.min === 0.5 && rise.max === 16, 'and "Speed rise limit": 4 decades a second, 0.5 to 16');
                // Off: the old rule. The pace shown is the nearest surface, and W crawls by it.
                await row('deep-zoom.speed-follows-view', 'false');
                await ctx.sleep(400);
                ctx.check((await ctx.ev<string | null>("localStorage.getItem('gmt.deepZoom.followView')")) === '0' && !(await row('deep-zoom.speed-rise-limit')).shown, 'switched off, it is remembered and the rise limit row is hidden');
                const paceOff = await readoutText(ctx, 'data-dz-pace');
                ctx.check(/^pace \de-7[5-7]$/.test(paceOff), 'the pace is then the nearest surface ("' + paceOff + '")');
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 2000);
                await ctx.sleep(300);
                const c1 = await cam(ctx);
                const crawl = moveLength(c0, c1);
                ctx.check(crawl > 0 && crawl < 1e-70, 'two seconds of W moved the camera ' + crawl.toExponential(2) + ': by the nearest surface, under 1e-70');
                // On again: the view's rule takes over from where the camera is.
                await row('deep-zoom.speed-follows-view', 'true');
                await ctx.sleep(400);
                await ctx.holdKey('w', 3000);
                await ctx.sleep(300);
                const flown = moveLength(c1, await cam(ctx));
                ctx.check(flown > 1e-66, 'switched on again, three seconds of W moved it ' + flown.toExponential(2) + ' (more than 1e-66)');
                // Both are remembered across a reload.
                await row('deep-zoom.speed-rise-limit', '16');
                await ctx.boot();
                const after = [await row('deep-zoom.speed-follows-view'), await row('deep-zoom.speed-rise-limit')];
                ctx.check(after[0].value === true && after[1].value === 16, 'after a reload the rule is on and the rise limit is 16 (' + after[0].value + ', ' + after[1].value + ')');
                await ctx.ev("(() => { localStorage.removeItem('gmt.deepZoom.followView'); localStorage.removeItem('gmt.deepZoom.paceRise'); return true; })()");
            },
        },
        {
            name: 'Tab is Orbit mode: a drag turns the camera about the point under the pointer, which stays where it is',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, four breaks, one run each: the Tab binding's handler emptied in deep-zoom/hotkeys.ts -> red, 'Tab switched to Orbit mode' false (and four lines after it); in `orbitFrame` of deep-zoom/DeepZoomNavigation.tsx the turn's `translate(...)` line removed -> red, 'the camera moved by distance x (ray before - ray after), to 1.0e+0 of that move (0.00e+0)' and the picked point 26 % farther away; the yaw's sign flipped there -> red, yaw -1.0131 -> -1.1820; the tick's Orbit branch disabled (`if (false)`) -> red, 'W does not fly in Orbit mode' false and nothing turned.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterDeepView(ctx))) return;
                await ctx.focusPicture();
                ctx.check((await cameraMode(ctx)) === 'Fly', 'the app starts in Fly mode');
                await ctx.page.keyboard.press('Tab');
                await ctx.sleep(200);
                ctx.check((await cameraMode(ctx)) === 'Orbit' && (await readoutText(ctx, 'data-dz-mode')).startsWith('orbit'), 'Tab switched to Orbit mode, and the readout says so ("' + (await readoutText(ctx, 'data-dz-mode')) + '")');
                // The fly keys do nothing here.
                const c0 = await cam(ctx);
                await ctx.holdKey('w', 300);
                await ctx.sleep(200);
                ctx.check(same(c0, await cam(ctx)), 'W does not fly in Orbit mode');
                // A drag that begins 60 px right of and 40 px below the picture's centre.
                const start = await under(ctx, 60, 40);
                if (!ctx.check(start.kind === 'hit' && start.distance > 0, 'a surface is under the pointer, ' + start.distance.toExponential(2) + ' away')) return;
                const l0 = await look(ctx);
                const u0 = await undoDepth(ctx);
                const c = await ctx.pictureCentre();
                await ctx.page.mouse.move(c.x + 60, c.y + 40);
                await ctx.page.mouse.down();
                let reticle = '';
                try {
                    await ctx.page.mouse.move(c.x + 60 + 20, c.y + 40 - 10, { steps: 8 });
                    await ctx.sleep(400);
                    reticle = await ctx.ev<string>("(document.querySelector('[data-dz-reticle]') || { style: {} }).style.opacity || ''");
                } finally {
                    await ctx.page.mouse.up();
                }
                await ctx.sleep(400);
                const l1 = await look(ctx);
                const c1 = await cam(ctx);
                ctx.check(l1.yaw > l0.yaw + 0.05 && l1.pitch > l0.pitch + 0.02, 'a drag right and up raised the yaw and the pitch (' + fx(l0.yaw) + ', ' + fx(l0.pitch) + ' -> ' + fx(l1.yaw) + ', ' + fx(l1.pitch) + ')');
                ctx.check(reticle === '1', 'the pivot is marked while the drag is held');
                // The camera moved by exactly what keeps the picked point where it was: distance x (ray before - ray after).
                const end = await under(ctx, 60, 40);
                const want: V3 = [0, 1, 2].map((j) => start.distance * (start.ray[j] - end.ray[j])) as V3;
                const got = moveOf(c0, c1);
                const off = Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]) / Math.hypot(want[0], want[1], want[2]);
                ctx.check(off < 1e-6, 'the camera moved by distance x (ray before - ray after), to ' + off.toExponential(1) + ' of that move (' + Math.hypot(got[0], got[1], got[2]).toExponential(2) + ')');
                ctx.check(end.kind === 'hit' && end.distance < start.distance * 1.02 && end.distance > start.distance * 0.5, 'the picked point is still under that spot of the picture, no farther than it was (' + start.distance.toExponential(3) + ' -> ' + end.distance.toExponential(3) + '; nearer only if something now stands in front of it)');
                ctx.check((await undoDepth(ctx)) === u0 + 1, 'the drag is one undo step');
                await ctx.page.keyboard.press('Control+z');
                await ctx.sleep(500);
                ctx.check(same(await cam(ctx), c0), 'Ctrl+Z put the camera back where the drag began');
                await ctx.page.keyboard.press('Tab');
                await ctx.sleep(200);
                ctx.check((await cameraMode(ctx)) === 'Fly', 'Tab again is Fly mode');
            },
        },
        {
            name: 'in Orbit mode a turn keeps its clearance: swept through its whole range, the camera never comes nearer to a surface than a share of the pivot\'s distance',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each, both in `orbitFrame` of deep-zoom/DeepZoomNavigation.tsx: the clearance test made always true -> red, the pitch ran to its upper limit (1.5500, where the rule stops it at 0.6764), the nearest surface came to 2.61e-18 (the clearance: 2.64e-18) and the mark never filled in; the test made impossible to pass with no way back out (1000 times the clearance, the 'no nearer than here' clause removed) -> red, the drag turned nothing (pitch -0.4122 throughout). NOTE: at this pivot the orbit only just dips under the clearance, so the 'never nearer' line is held to a thousandth - with the rule on it holds to rounding (2.75e-18).",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterDeepView(ctx))) return;
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Tab');
                await ctx.sleep(200);
                // The pivot: what is in the middle of the picture. A sweep of the pitch through its whole range (177
                // degrees about that point) must cross the surface the point lies on somewhere.
                const start = await under(ctx, 0, 0);
                if (!ctx.check(start.kind === 'hit' && start.distance > 0, 'a surface is in the middle of the picture, ' + start.distance.toExponential(2) + ' away')) return;
                const clearance = 0.08 * start.distance;
                const nearest = () => ctx.host<number>('estimateAt([0, 0, 0])');
                const before = await nearest();
                if (!ctx.check(before > clearance, 'the camera starts clear: the nearest surface is ' + before.toExponential(2) + ' away, the clearance is ' + clearance.toExponential(2))) return;
                let least = before, inside = false, held = false;
                const sample = async (): Promise<void> => {
                    const d = await nearest();
                    least = Math.min(least, d);
                    if (!(d > 0)) inside = true;
                    if (await ctx.ev<boolean>("!!document.querySelector('[data-dz-reticle]') && document.querySelector('[data-dz-reticle]').classList.contains('bg-warn/70')")) held = true;
                };
                const c = await ctx.pictureCentre();
                const H = start.height;
                const l0 = await look(ctx);
                let highest = l0.pitch, lowest = l0.pitch;
                await ctx.page.mouse.move(c.x, c.y);
                await ctx.page.mouse.down();
                try {
                    // Up by a third of the picture (the pitch towards its upper limit), then down by 0.55 of it.
                    for (let i = 1; i <= 40; i++) { await ctx.page.mouse.move(c.x, c.y - 0.33 * H * (i / 40)); await ctx.sleep(40); await sample(); }
                    highest = (await look(ctx)).pitch;
                    for (let i = 1; i <= 60; i++) { await ctx.page.mouse.move(c.x, c.y - 0.33 * H + 0.55 * H * (i / 60)); await ctx.sleep(40); await sample(); }
                    lowest = (await look(ctx)).pitch;
                } finally {
                    await ctx.page.mouse.up();
                }
                await ctx.sleep(300);
                ctx.check(highest > l0.pitch + 0.1 && lowest < highest - 0.1, 'the drag turned the camera up and then down (pitch ' + fx(l0.pitch) + ' -> ' + fx(highest) + ' -> ' + fx(lowest) + ')');
                ctx.check(!inside, 'the camera was never inside the solid');
                ctx.check(least >= 0.999 * clearance, 'the nearest surface was never nearer than the clearance: at least ' + least.toExponential(2) + ' away throughout (the clearance: ' + clearance.toExponential(2) + ')');
                ctx.check(held, 'and the turn was held back on the way (the pivot\'s mark filled in)');
                await ctx.page.keyboard.press('Tab');
            },
        },
        {
            name: 'in Orbit mode the wheel flies along the pointer\'s ray: a notch covers 14 % of the way to the point under it',
            owner: 'nav-2026-10-09',
            falsified: "2026-10-09, two breaks, one run each, both in deep-zoom/DeepZoomNavigation.tsx: `wheel.log +=` made `-=` -> red, 'five notches towards moved the camera along the pointer's ray (-1.0000000)', 111.7 % of the way the wrong way; the input hook told the mode is always Fly (`mode: DZ_MODE_FLY`) -> red, 'the wheel did not change the fly speed' false.",
            async run(ctx) {
                await ctx.boot({ clearStorage: true });
                if (!(await enterDeepView(ctx))) return;
                await ctx.focusPicture();
                await ctx.page.keyboard.press('Tab');
                await ctx.sleep(200);
                const speed0 = await storedSpeed(ctx);
                const start = await under(ctx, -70, 30);
                if (!ctx.check(start.kind === 'hit' && start.distance > 0, 'a surface is under the pointer, ' + start.distance.toExponential(2) + ' away')) return;
                const c0 = await cam(ctx);
                const c = await ctx.pictureCentre();
                await ctx.page.mouse.move(c.x - 70, c.y + 30);
                for (let i = 0; i < 5; i++) { await ctx.page.mouse.wheel(0, -100); await ctx.sleep(120); }
                await ctx.sleep(600);
                const c1 = await cam(ctx);
                const got = moveOf(c0, c1);
                const along = (got[0] * start.ray[0] + got[1] * start.ray[1] + got[2] * start.ray[2]) / Math.hypot(got[0], got[1], got[2]);
                ctx.check(along > 0.999999, 'five notches towards moved the camera along the pointer\'s ray (' + along.toFixed(7) + ')');
                const share = Math.hypot(got[0], got[1], got[2]) / start.distance, want = 1 - Math.exp(-0.75);
                ctx.check(Math.abs(share - want) < 0.01, 'by ' + (share * 100).toFixed(1) + ' % of the way: five notches of 14 % leave e^-0.75 (' + (want * 100).toFixed(1) + ' %)');
                const end = await under(ctx, -70, 30);
                ctx.check(end.kind === 'hit' && Math.abs(end.distance / (start.distance * Math.exp(-0.75)) - 1) < 0.03, 'the same point is under the pointer, at ' + (end.distance / start.distance).toFixed(3) + ' of its distance');
                ctx.check((await storedSpeed(ctx)) === speed0, 'the wheel did not change the fly speed');
                for (let i = 0; i < 5; i++) { await ctx.page.mouse.wheel(0, 100); await ctx.sleep(120); }
                await ctx.sleep(600);
                const back = moveLength(c0, await cam(ctx)) / start.distance;
                ctx.check(back < 0.02, 'five notches back returned it to where it was (' + (back * 100).toFixed(2) + ' % of the distance off)');
                await ctx.page.keyboard.press('Tab');
            },
        },
    ],
};
