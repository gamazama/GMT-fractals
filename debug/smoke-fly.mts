/**
 * Fly smoke - app-gmt in Fly mode, through the real key handler, wheel handler, drag handler,
 * frame loop, displacement sink and worker: the scene must move the way the hands say.
 *
 *   npm run dev                       (port 3400), then
 *   npm run smoke:fly
 *   ENGINE_URL=http://localhost:3410/app-gmt.html npm run smoke:fly
 *
 * WHY IT EXISTS. The fly integrator (`engine/plugins/navigation/FlyIntegrator.ts`) hands each
 * displacement to a sink; GMT's sink is one function in `engine-gmt/navigation/Navigation.tsx`
 * (grep `emitOffsetShift`). GMT's input hook (`engine-gmt/navigation/useInputController.ts`) turns
 * keys, the wheel and a look drag into the integrator's inputs. `npm run test:nav-replay` pins the
 * integrator's numbers to the last bit but drives it directly: it opens neither file. This is the
 * guard for both - everything is read back as `window.__gmtProxy.sceneOffset` and the store.
 *
 * What it asserts (each line names what would have to break):
 *   1. W moves the scene along the camera's forward axis (the store's `cameraRot` applied to
 *      (0, 0, -1)), S moves it back                         - the sink's axes and signs, KeyW / KeyS
 *   2. D moves it at right angles to forward, A the other way        - KeyD / KeyA
 *   3. Space moves it at right angles to both, C the other way       - Space / KeyC
 *   4. Shift+W covers more than twice the ground of W               - the boost key
 *   5. three wheel notches up raise `navigation.flySpeed`, three down lower it   - the wheel's speed law
 *   6. W held while a text field has the keyboard moves nothing      - the typing-target rule
 *   7. after a left-drag across the picture, W no longer points along the old forward   - drag-look
 *   8. the store's `interacting` flag is true while W is held and false after   - the hook's
 *      per-frame half (`frame(delta)`), which opens and closes the ADR-0061 camera session
 *   9. no page error.
 *
 * What it does NOT prove: exact speeds (only directions, "not zero" and one ratio), roll (Q / E),
 * Alt, the on-screen sticks, invert-Y, the orthographic wheel branch, Orbit mode's wheel. The
 * integrator's maths for those is the replay's.
 *
 * FALSIFIED 2026-10-08, each reverted (see the record at the end of this header).
 *
 * Every page.evaluate takes a STRING body: tsx injects `__name` into function callbacks.
 *
 * FALSIFICATION RECORD (2026-10-08; one break each, this smoke red, restored, green again)
 *   the sink, in `engine-gmt/navigation/Navigation.tsx` (`emitOffsetShift`):
 *     emits `z: -z`                       -> "W moves the scene along the view" (cosine -1.000)
 *     emits nothing                       -> "W moves the scene along the view" (length 0)
 *   the input hook, in `engine-gmt/navigation/useInputController.ts` (before it became a wrapper):
 *     KeyD mapped to `left`               -> "A moves it the other way" (cosine to D 1.000)
 *     the Space case does nothing         -> "Space moves it at right angles to both", "C moves it the other way"
 *     Shift does not set `boost`          -> "Shift+W covers more than twice the ground of W" (0.76 times)
 *     the wheel keeps the old speed       -> "three wheel notches up raise the fly speed" (0.5 -> 0.500)
 *     no typing-target test on keydown    -> "W typed in a text field moves nothing" (displacement 5.7e-1)
 *     mouse down does not start a drag    -> "after a left-drag across the picture W points elsewhere" (cosine 1.000)
 *   after the hook moved to `engine/plugins/navigation/useNavigationInput.ts` (same day):
 *     engine hook: KeyD mapped to `left`, the wheel keeping the old speed, mouse down not starting a
 *       drag                              -> the same three lines red
 *     GMT's wrapper passing `isLocked: () => true`   -> 3 lines red (boost, wheel, drag)
 *     GMT's wrapper never running `frame(delta)`     -> "the store's interaction session is open while
 *       W is held" (before line 8 existed this break was GREEN: nothing saw the per-frame half)
 */
import { chromium } from 'playwright';
import type { Page } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const HOLD_MS = 1000;

interface V3 { x: number; y: number; z: number }
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cos = (a: V3, b: V3): number => dot(a, b) / (len(a) * len(b));
const fmt = (a: V3): string => `(${a.x.toFixed(3)}, ${a.y.toFixed(3)}, ${a.z.toFixed(3)})`;

const failures: string[] = [];
function check(ok: boolean, what: string): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
    if (!ok) failures.push(what);
}

async function main() {
    const browser = await chromium.launch({ args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'] });
    const page: Page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!window.__gmtProxy && !!window.__store', null, { timeout: 60_000 });
    await page.waitForTimeout(6000);

    const readOffset = () => page.evaluate(`(function() {
        const o = window.__gmtProxy.sceneOffset;
        return { x: o.x + o.xL, y: o.y + o.yL, z: o.z + o.zL };
    })()`) as Promise<V3>;
    /** The camera's forward axis in world space: the store's rotation applied to (0, 0, -1). */
    const readForward = () => page.evaluate(`(function() {
        const q = window.__store.getState().cameraRot;
        const x = q.x, y = q.y, z = q.z, w = q.w;
        return { x: -2 * (x * z + w * y), y: -2 * (y * z - w * x), z: -(1 - 2 * (x * x + y * y)) };
    })()`) as Promise<V3>;
    const flySpeed = () => page.evaluate('window.__store.getState().navigation.flySpeed') as Promise<number>;

    await page.evaluate("window.__store.getState().setCameraMode('Fly')");
    await page.waitForTimeout(800);
    const mode = await page.evaluate('window.__store.getState().cameraMode');
    if (mode !== 'Fly') throw new Error(`could not switch to Fly mode (cameraMode is ${String(mode)})`);

    // The pointer over the picture, no button down: keys go to the navigation, nothing is dragged.
    const vp = page.viewportSize()!;
    const cx = vp.width / 2, cy = vp.height / 2;
    await page.mouse.move(cx, cy);

    /** The offset once it has stopped changing (the proxy's copy trails the worker by a few frames,
     *  and a headless frame can take a third of a second). */
    const settledOffset = async (): Promise<V3> => {
        let last = await readOffset();
        for (let quiet = 0, tries = 0; quiet < 3 && tries < 40; tries++) {
            await page.waitForTimeout(250);
            const now = await readOffset();
            quiet = len(sub(now, last)) === 0 ? quiet + 1 : 0;
            last = now;
        }
        return last;
    };
    /** Hold the keys for HOLD_MS; the scene's displacement. */
    const hold = async (...keys: string[]): Promise<V3> => {
        const before = await settledOffset();
        for (const k of keys) await page.keyboard.down(k);
        await page.waitForTimeout(HOLD_MS);
        for (const k of [...keys].reverse()) await page.keyboard.up(k);
        return sub(await settledOffset(), before);
    };
    const moved = (d: V3): boolean => len(d) > 1e-4;

    // 1. forward and back
    const forward = await readForward();
    const w = await hold('w');
    console.log(`     forward axis ${fmt(forward)}; W moved ${fmt(w)}`);
    check(moved(w) && cos(w, forward) > 0.9, `W moves the scene along the view (length ${len(w).toExponential(2)}, cosine ${moved(w) ? cos(w, forward).toFixed(3) : 'n/a'})`);
    const s = await hold('s');
    check(moved(s) && cos(s, forward) < -0.9, `S moves it back (cosine ${moved(s) ? cos(s, forward).toFixed(3) : 'n/a'})`);

    // 2. strafe
    const d = await hold('d');
    check(moved(d) && Math.abs(cos(d, forward)) < 0.2, `D moves it at right angles to the view (cosine ${moved(d) ? cos(d, forward).toFixed(3) : 'n/a'})`);
    const a = await hold('a');
    check(moved(a) && moved(d) && cos(a, d) < -0.9, `A moves it the other way (cosine to D ${moved(a) && moved(d) ? cos(a, d).toFixed(3) : 'n/a'})`);

    // 3. vertical
    const up = await hold('Space');
    check(moved(up) && Math.abs(cos(up, forward)) < 0.2 && moved(d) && Math.abs(cos(up, d)) < 0.2,
        `Space moves it at right angles to both (cosine to forward ${moved(up) ? cos(up, forward).toFixed(3) : 'n/a'}, to D ${moved(up) && moved(d) ? cos(up, d).toFixed(3) : 'n/a'})`);
    const down = await hold('c');
    check(moved(down) && moved(up) && cos(down, up) < -0.9, `C moves it the other way (cosine to Space ${moved(down) && moved(up) ? cos(down, up).toFixed(3) : 'n/a'})`);

    // 4. boost: back to the start between the two, so both cover the same ground
    const w1 = await hold('w');
    await hold('s');
    const boosted = await hold('Shift', 'w');
    await hold('Shift', 's');
    check(moved(w1) && len(boosted) > 2 * len(w1), `Shift+W covers more than twice the ground of W (${(len(boosted) / Math.max(len(w1), 1e-12)).toFixed(2)} times)`);

    // 5. the wheel changes the fly speed
    const speed0 = await flySpeed();
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
    const speedUp = await flySpeed();
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(60); }
    const speedBack = await flySpeed();
    check(speedUp > speed0 + 0.03 && Math.abs(speedBack - speed0) < 1e-9, `three wheel notches up raise the fly speed and three down put it back (${speed0} -> ${speedUp.toFixed(3)} -> ${speedBack.toFixed(3)})`);

    // 6. a text field takes the keys
    await page.evaluate(`(function() { const i = document.createElement('input'); i.id = 'smoke-fly-field'; i.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999'; document.body.appendChild(i); i.focus(); })()`);
    const typed = await hold('w');
    await page.evaluate("document.getElementById('smoke-fly-field').remove()");
    check(!moved(typed), `W typed in a text field moves nothing (displacement ${len(typed).toExponential(2)})`);
    await page.mouse.move(cx, cy);

    // 7. drag-look turns the view
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(cx + 260, cy, { steps: 8 });
    await page.waitForTimeout(900);
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(500);
    const turned = await hold('w');
    check(moved(turned) && cos(turned, forward) < 0.97, `after a left-drag across the picture W points elsewhere (cosine to the old forward ${moved(turned) ? cos(turned, forward).toFixed(3) : 'n/a'})`);

    // 8. the interaction session: open while a fly key is held, closed after (the hook's per-frame half)
    await page.mouse.move(cx, cy);
    const idleBefore = await page.evaluate('window.__store.getState().interacting');
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    const whileHeld = await page.evaluate('window.__store.getState().interacting');
    await page.keyboard.up('w');
    let closed = false;
    for (let i = 0; i < 20 && !closed; i++) { await page.waitForTimeout(150); closed = !(await page.evaluate('window.__store.getState().interacting')); }
    check(idleBefore === false && whileHeld === true && closed, `the store's interaction session is open while W is held and closed after (before ${idleBefore}, held ${whileHeld}, closed after ${closed})`);

    check(errors.length === 0, `no page error (${errors.length})${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await browser.close();
    if (failures.length) { console.error(`\n✗ ${failures.length} failed:\n  - ` + failures.join('\n  - ')); process.exit(1); }
    console.log('\n✓ app-gmt flies: W/S, A/D, Space/C, Shift, the wheel, a text field and drag-look all behave');
}

main().catch((e) => { console.error('\n✗ ' + (e instanceof Error ? e.message : String(e))); process.exit(1); });
