/**
 * Fly smoke - app-gmt in Fly mode: holding W moves the scene ALONG THE VIEW, holding S moves it
 * back the other way.
 *
 *   npm run dev                       (port 3400), then
 *   npm run smoke:fly
 *   ENGINE_URL=http://localhost:3410/app-gmt.html npm run smoke:fly
 *
 * WHY IT EXISTS. The fly integrator (`engine/plugins/navigation/FlyIntegrator.ts`) hands each
 * displacement to a sink; GMT's sink is one function in `engine-gmt/navigation/Navigation.tsx`
 * (grep `emitOffsetShift`) that emits `offset_shift`. `npm run test:nav-replay` pins the
 * integrator's numbers to the last bit but drives it directly: it never opens Navigation.tsx. This
 * is the guard for the call site - the real key handler, the real frame loop, the real sink, the
 * worker's virtual space - read back as `window.__gmtProxy.sceneOffset`.
 *
 * What it asserts:
 *   1. W held for 1.2 s moves `sceneOffset` (the view is not stuck);
 *   2. the move points along the camera's forward axis (the store's `cameraRot` applied to
 *      (0, 0, -1)): cosine above 0.9 - a sink that swaps or flips an axis fails here;
 *   3. S held the same time moves it the opposite way: cosine below -0.9;
 *   4. no page error.
 *
 * What it does NOT prove: speed (only direction and "not zero"), strafe, vertical, roll, the wheel,
 * drag-look, the sticks. The integrator's maths for those is the replay's; their wiring through the
 * input hook is unguarded until the hook has its own guard.
 *
 * FALSIFIED 2026-10-08, each reverted:
 *   - `emitOffsetShift` emitting `z: -z`          -> exit 1, "W moved the scene off the view axis"
 *   - `emitOffsetShift` emitting nothing          -> exit 1, "W did not move the scene"
 *   - the `translate` line removed at the call site would be a type error (the setting is required).
 *
 * Every page.evaluate takes a STRING body: tsx injects `__name` into function callbacks.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const HOLD_MS = 1200;

interface V3 { x: number; y: number; z: number }
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const fmt = (a: V3): string => `(${a.x.toFixed(4)}, ${a.y.toFixed(4)}, ${a.z.toFixed(4)})`;

async function main() {
    const browser = await chromium.launch({ args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'] });
    const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
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

    await page.evaluate("window.__store.getState().setCameraMode('Fly')");
    await page.waitForTimeout(800);
    const mode = await page.evaluate('window.__store.getState().cameraMode');
    if (mode !== 'Fly') throw new Error(`could not switch to Fly mode (cameraMode is ${String(mode)})`);

    // The pointer over the picture, no button down: keys go to the navigation, nothing is dragged.
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2, vp.height / 2);

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
    const hold = async (key: string): Promise<V3> => {
        const before = await settledOffset();
        await page.keyboard.down(key);
        await page.waitForTimeout(HOLD_MS);
        await page.keyboard.up(key);
        return sub(await settledOffset(), before);
    };

    const forward = await readForward();
    const w = await hold('w');
    console.log(`forward axis ${fmt(forward)}`);
    console.log(`W for ${HOLD_MS} ms moved sceneOffset by ${fmt(w)}  length ${len(w).toExponential(3)}`);
    if (!(len(w) > 1e-4)) throw new Error(`W did not move the scene (sceneOffset delta ${len(w).toExponential(3)})`);
    const cosW = dot(w, forward) / (len(w) * len(forward));
    if (!(cosW > 0.9)) throw new Error(`W moved the scene off the view axis (cosine to forward ${cosW.toFixed(3)}, wanted above 0.9)`);

    const s = await hold('s');
    console.log(`S for ${HOLD_MS} ms moved sceneOffset by ${fmt(s)}  length ${len(s).toExponential(3)}`);
    if (!(len(s) > 1e-4)) throw new Error(`S did not move the scene (sceneOffset delta ${len(s).toExponential(3)})`);
    const cosS = dot(s, forward) / (len(s) * len(forward));
    if (!(cosS < -0.9)) throw new Error(`S did not move the scene back along the view axis (cosine to forward ${cosS.toFixed(3)}, wanted below -0.9)`);

    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`\n✓ in Fly mode W moves the scene along the view (cosine ${cosW.toFixed(3)}) and S back (cosine ${cosS.toFixed(3)})`);
    await browser.close();
}

main().catch((e) => { console.error('\n✗ ' + (e instanceof Error ? e.message : String(e))); process.exit(1); });
