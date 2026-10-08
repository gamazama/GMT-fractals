/**
 * fly-camera check: GMT's fly integrator driving the deep renderer's yaw / pitch camera
 * (`deep-zoom/flyCamera.ts`). Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/fly-camera.mts        (npm run check:deep-zoom-fly-camera)
 *
 * The renderer's basis is copied here from `function basis()` in deep-zoom/renderer/core.js, so
 * the "basis:" lines compare the adapter against the renderer's own formula, not against itself.
 *
 * FALSIFICATION RECORD, 2026-10-08, one break per run in deep-zoom/flyCamera.ts:
 *   - `-(frame.yaw + Math.PI / 2)` -> `-(frame.yaw)`                 -> 4 red (the three "basis:" lines, "keys: E moves up and Q down")
 *   - the Euler order 'YXZ' -> 'XYZ'                                  -> 4 red (the same four)
 *   - `frame.yaw - euler.y` -> `frame.yaw + euler.y`                  -> 1 red ("turn: a drag to the right ...": yaw 1 -> 0.04)
 *   - `frame.pitch + euler.x` -> `frame.pitch - euler.x`              -> 2 red ("turn: a drag up ...", "turn: pushed past the pole ...")
 *   - `move.up = held.up || held.rollRight` -> `move.up = held.up`    -> 1 red ("keys: E moves up and Q down")
 *   - the roll flags passed through (`{ ...frame.inputs }`, no `move`) -> 2 red ("keys: E moves up ...", "keys: Q and E turn nothing": 60 frames turned)
 *   - `minSpeed: 0` removed (the engine's 1e-6 floor applies)         -> 1 red ("deep: ...": the frame moved 1.67e-8 with the surface at 1e-40)
 *   - `Math.min(frame.delta, DZ_NAV_MAX_DELTA)` -> `frame.delta`      -> 1 red ("delta: ...": 0.36 instead of 0.18)
 *   - `boostMinDistance: 0` removed (the engine's 1e-4 floor applies) -> 1 red ("deep: Shift is four times that there too ...")
 */
import { DZ_NAV_MAX_DELTA, createFlyCamera } from '../../deep-zoom/flyCamera.ts';
import type { FlyInputs, MoveInputState } from '../../engine/plugins/navigation/FlyIntegrator.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type V3 = [number, number, number];

/** `function basis()` of deep-zoom/renderer/core.js. */
function rendererBasis(yaw: number, pitch: number): { fwd: V3; right: V3; up: V3 } {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const fwd: V3 = [cp * cy, sp, cp * sy];
    const right: V3 = [Math.cos(yaw + Math.PI / 2), 0, Math.sin(yaw + Math.PI / 2)];
    const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    return { fwd, right, up };
}

const noKeys = (): MoveInputState => ({
    forward: false, backward: false, left: false, right: false, up: false, down: false,
    rollLeft: false, rollRight: false, boost: false, precise: false,
});
const inputs = (move: Partial<MoveInputState> = {}, drag?: { x: number; y: number }): FlyInputs => ({
    move: { ...noKeys(), ...move },
    look: { x: 0, y: 0 },
    moveJoy: { x: 0, y: 0 },
    isDragging: !!drag,
    dragDelta: drag ?? { x: 0, y: 0 },
    invertY: false,
});

/** One frame with these keys from a fresh camera: the move handed to the sink. */
function moveOf(yaw: number, pitch: number, move: Partial<MoveInputState>, distance = 1, delta = 1 / 60, speed = 3.6): { d: V3 | null; turned: boolean } {
    let d: V3 | null = null;
    const turned = createFlyCamera().step({
        delta, yaw, pitch, inputs: inputs(move), speed, distance,
        translate: (x, y, z) => { d = [x, y, z]; },
    });
    return { d, turned: turned !== null };
}
const len = (v: V3): number => Math.hypot(v[0], v[1], v[2]);
/** The largest component difference between `v / |v|` and the unit vector `u`. */
const off = (v: V3 | null, u: V3): number => (v ? Math.max(...v.map((c, i) => Math.abs(c / len(v) - u[i]))) : Infinity);

// ── basis: the three move keys against the renderer's own formula, at several looks ──
const LOOKS: Array<[number, number]> = [[-Math.PI / 2, 0], [0, 0], [1.14, 0.29], [-6.6, -0.18], [2.5, 1.2], [-0.7, -1.5]];
let worstW = 0, worstD = 0, worstUp = 0;
for (const [yaw, pitch] of LOOKS) {
    const b = rendererBasis(yaw, pitch);
    worstW = Math.max(worstW, off(moveOf(yaw, pitch, { forward: true }).d, b.fwd));
    worstD = Math.max(worstD, off(moveOf(yaw, pitch, { right: true }).d, b.right));
    worstUp = Math.max(worstUp, off(moveOf(yaw, pitch, { up: true }).d, b.up));
}
check(worstW < 1e-12, `basis: W moves along the renderer's forward at ${LOOKS.length} looks`, `worst ${worstW.toExponential(2)}`);
check(worstD < 1e-12, "basis: D moves along the renderer's right", `worst ${worstD.toExponential(2)}`);
check(worstUp < 1e-12, "basis: Space moves along the renderer's up (the camera's, not the world's)", `worst ${worstUp.toExponential(2)}`);

// ── the size of a move ──
{
    const one = moveOf(1.14, 0.29, { forward: true }, 1, 1 / 60, 3.6).d;
    const boosted = moveOf(1.14, 0.29, { forward: true, boost: true }, 1, 1 / 60, 3.6).d;
    check(!!one && Math.abs(len(one) - 3.6 / 60) < 1e-12, 'size: one frame at speed 3.6 and distance 1 moves 3.6 / 60', one ? String(len(one)) : 'no move');
    check(!!one && !!boosted && Math.abs(len(boosted) / len(one) - 4) < 1e-12, 'size: Shift is four times that');
    const deep = moveOf(1.14, 0.29, { forward: true }, 1e-40, 1 / 60, 3.6).d;
    check(!!deep && len(deep) > 1e-42 && len(deep) < 1e-40, 'deep: with the surface at 1e-40 one frame moves a share of 1e-40, not an absolute floor', deep ? len(deep).toExponential(2) : 'no move');
    const deepBoost = moveOf(1.14, 0.29, { forward: true, boost: true }, 1e-40, 1 / 60, 3.6).d;
    check(!!deep && !!deepBoost && Math.abs(len(deepBoost) / len(deep) - 4) < 1e-9, 'deep: Shift is four times that there too, not a floor distance', deepBoost ? len(deepBoost).toExponential(2) : 'no move');
    const slow = moveOf(1.14, 0.29, { forward: true }, 1, 0.5, 3.6).d;
    check(!!slow && Math.abs(len(slow) - 3.6 * DZ_NAV_MAX_DELTA) < 1e-12, `delta: a half-second frame moves as a ${DZ_NAV_MAX_DELTA} s one`, slow ? String(len(slow)) : 'no move');
    check(moveOf(0, 0, {}).d === null, 'size: no key, no move');
}

// ── Q / E ──
{
    const b = rendererBasis(1.14, 0.29);
    const e = moveOf(1.14, 0.29, { rollRight: true });
    const q = moveOf(1.14, 0.29, { rollLeft: true });
    check(off(e.d, b.up) < 1e-12 && off(q.d, [-b.up[0], -b.up[1], -b.up[2]]) < 1e-12, 'keys: E moves up and Q down');
    // Roll builds up over frames: hold both for a second of frames and watch the angles.
    const cam = createFlyCamera();
    let turned = 0;
    for (let i = 0; i < 60; i++) {
        if (cam.step({ delta: 1 / 60, yaw: 0.4, pitch: 0.3, inputs: inputs({ rollLeft: i < 30, rollRight: i >= 30 }), speed: 3.6, distance: 1, translate: () => undefined })) turned++;
    }
    check(turned === 0, 'keys: Q and E turn nothing (the renderer has no roll)', `${turned} frames turned`);
}

// ── turn: a look drag, read back as a turntable ──
function dragFor(frames: number, drag: { x: number; y: number }, yaw: number, pitch: number): { yaw: number; pitch: number } {
    const cam = createFlyCamera();
    for (let i = 0; i < frames; i++) {
        const next = cam.step({ delta: 1 / 60, yaw, pitch, inputs: inputs({}, drag), speed: 3.6, distance: 1, translate: () => undefined });
        if (next) { yaw = next.yaw; pitch = next.pitch; }
    }
    return { yaw, pitch };
}
{
    const right = dragFor(60, { x: 0.5, y: 0 }, 1.0, 0.6);
    check(right.yaw > 1.0 + 0.5 && Math.abs(right.pitch - 0.6) < 1e-9, 'turn: a drag to the right raises the yaw and leaves the pitch alone',
        `yaw 1 -> ${right.yaw.toFixed(4)}, pitch 0.6 -> ${right.pitch}`);
    const left = dragFor(60, { x: -0.5, y: 0 }, 1.0, 0.6);
    check(Math.abs((1.0 - left.yaw) - (right.yaw - 1.0)) < 1e-9, 'turn: a drag to the left lowers it by the same amount');
    const up = dragFor(60, { x: 0, y: 0.25 }, 1.0, 0.1);
    check(up.pitch > 0.1 + 0.2 && Math.abs(up.yaw - 1.0) < 1e-9, 'turn: a drag up raises the pitch and leaves the yaw alone',
        `pitch 0.1 -> ${up.pitch.toFixed(4)}, yaw 1 -> ${up.yaw}`);
    // The same drag turns the yaw as fast near the pole as on the level: a turntable.
    const level = dragFor(30, { x: 0.5, y: 0 }, 0, 0).yaw;
    const steep = dragFor(30, { x: 0.5, y: 0 }, 0, 1.5).yaw;
    check(Math.abs(level - steep) < 1e-9, 'turn: the yaw turns as fast at pitch 1.5 as on the level', `level ${level.toFixed(5)}, steep ${steep.toFixed(5)}`);
    // Over the pole: the pitch runs on (the renderer clamps it), the yaw does not jump.
    const over = dragFor(60, { x: 0, y: 1 }, 1.0, 1.5);
    check(over.pitch > 1.6 && Math.abs(over.yaw - 1.0) < 1e-9, 'turn: pushed past the pole the pitch runs on and the yaw does not flip', `yaw ${over.yaw}, pitch ${over.pitch.toFixed(3)}`);
    check(dragFor(5, { x: 0, y: 0 }, 1.0, 0.6).yaw === 1.0, 'turn: no drag, no turn');
}

console.log(failed === 0 ? 'fly-camera: all green' : `fly-camera: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
