/**
 * fly-camera check: GMT's fly integrator driving the deep renderer's yaw / pitch camera
 * (`deep-zoom/flyCamera.ts`), and the rule the speed follows (`deep-zoom/flyPace.ts`). Node only,
 * no browser.
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
 *   - the stride limit removed (`const k = 1`)                         -> 1 red ("stride: speed 8 with Shift ...": 1.6 of the distance)
 *
 * FALSIFICATION RECORD, 2026-10-09 (the "sense:" and "pace:" lines), one break per run:
 *   deep-zoom/flyCamera.ts
 *   - `Math.min(unit * pace, limit)` -> `unit * pace`                  -> 2 red ("sense: a frame never moves more than the limit ...", "sense: a pace or a limit that is 0 ...")
 *   - `distEstimate: 1` -> `distEstimate: frame.distance` (new path)    -> 2 red ("sense: one frame moves pace x speed x delta ...", "... the old distance is not read")
 *   - the new rule sharing the old rule's integrator (`paced.update` -> `integrator.update`)
 *                                                                       -> 1 red ("sense: after the old rule at 1e-30 ...": the first frame moved 2 % of its pace)
 *   - `if (length > 0)` -> `if (true)`                                  -> 1 red ("sense: a pace or a limit that is 0 or not a number moves nothing")
 *   deep-zoom/flyPace.ts
 *   - no fall (`Math.min(target, pace * ...)` -> `pace * ...`)          -> 6 red ("pace: a nearer target is taken at once", "pace: and stops on the target", four more)
 *   - the rise uncapped (`pace = target` in the else branch)            -> 4 red ("pace: it rises by 4 decades a second ...": 22 in a second; "pace: three wrong frames ..."; two more)
 *   - `(f.boost ? DZ_PACE_BOOST : 1)` -> `1`                            -> 1 red ("pace: Shift rises four times as fast")
 *   - `Math.min(look, ahead)` -> `look`                                 -> 1 red ("pace: the nearer of the two readings ...")
 *   - `reset()` a no-op                                                 -> 1 red ("pace: after reset the next reading is taken as it is")
 *   - the delta not cut (`DZ_PACE_MAX_DELTA` -> `Infinity`)             -> 1 red ("pace: a ten-second frame rises as an eighth of a second")
 *   - `paceReading`: `s.hits === 0 && s.near > DZ_SENSE_FAR` -> `false` -> 1 red ("reading: with nothing that way at all the fallback stands in")
 *   - `lookDistance`: `s.hits < 2` -> `s.hits < 1`                      -> 1 red ("reading: the readout wants two rays on a surface")
 *   - `lookDistance`: `s.open > 0 ||` removed                           -> 1 red ("reading: with a ray unfinished the readout waits ...")
 *   - `paceReading`: `* DZ_PACE_SHARE` removed (the whole distance)     -> 3 red (the three "reading:" lines that name a third)
 */
import { DZ_NAV_MAX_DELTA, DZ_NAV_MAX_STRIDE, createFlyCamera } from '../../deep-zoom/flyCamera.ts';
import { DZ_PACE_BOOST, DZ_PACE_MAX_DELTA, DZ_PACE_SHARE, createPace, lookDistance, paceReading } from '../../deep-zoom/flyPace.ts';
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
    // the top of the owner's speed range, with Shift, on a slow frame: 8 x 4 x 0.05 = 1.6 distances
    const fast = moveOf(1.14, 0.29, { forward: true, boost: true }, 1e-30, 0.05, 8);
    check(!!fast.d && Math.abs(len(fast.d) / 1e-30 - DZ_NAV_MAX_STRIDE) < 1e-9 && off(fast.d, rendererBasis(1.14, 0.29).fwd) < 1e-12,
        `stride: speed 8 with Shift on a 0.05 s frame moves ${DZ_NAV_MAX_STRIDE} of the distance, along the view`, fast.d ? String(len(fast.d) / 1e-30) : 'no move');
    const usual = moveOf(1.14, 0.29, { forward: true, boost: true }, 1e-30, 0.05, 3.6).d;
    check(!!usual && Math.abs(len(usual) / 1e-30 - 0.72) < 1e-9, 'stride: at the default speed the limit does not bite (0.72 of the distance)', usual ? String(len(usual) / 1e-30) : 'no move');
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

// ── sense: the speed rule since 2026-10-09 - the caller answers a pace and a one-frame limit ──
{
    const b = rendererBasis(1.14, 0.29);
    /** One frame under the new rule: the move, how often `sense` was asked, and with what. */
    function sensed(move: Partial<MoveInputState>, pace: number, limit: number, opt: { delta?: number; speed?: number; distance?: number; cam?: ReturnType<typeof createFlyCamera> } = {}) {
        let d: V3 | null = null, asks = 0, asked: V3 | null = null;
        (opt.cam ?? createFlyCamera()).step({
            delta: opt.delta ?? 1 / 60, yaw: 1.14, pitch: 0.29, inputs: inputs(move), speed: opt.speed ?? 3.6, distance: opt.distance ?? 123,
            sense: (direction) => { asks++; asked = direction; return { pace, limit }; },
            translate: (x, y, z) => { d = [x, y, z]; },
        });
        return { d: d as V3 | null, asks, asked: asked as V3 | null };
    }
    const one = sensed({ forward: true }, 2e-30, Infinity);
    check(!!one.d && Math.abs(len(one.d) / (2e-30 * 3.6 / 60) - 1) < 1e-12 && off(one.d, b.fwd) < 1e-12 && one.asks === 1 && off(one.asked, b.fwd) < 1e-12,
        'sense: one frame moves pace x speed x delta along the view, and sense is asked once, with that direction', one.d ? `${len(one.d)}, ${one.asks} asks` : 'no move');
    const other = sensed({ forward: true }, 2e-30, Infinity, { distance: 1e-60 });
    check(!!one.d && !!other.d && len(other.d) === len(one.d), 'sense: the old distance is not read under the new rule');
    const boosted = sensed({ forward: true, boost: true }, 2e-30, Infinity);
    check(!!one.d && !!boosted.d && Math.abs(len(boosted.d) / len(one.d) - 4) < 1e-12, 'sense: Shift is four times that');
    const side = sensed({ right: true, up: true }, 1, Infinity);
    const diag: V3 = [b.right[0] + b.up[0], b.right[1] + b.up[1], b.right[2] + b.up[2]];
    check(off(side.asked, diag.map((c) => c / len(diag)) as V3) < 1e-12 && off(side.d, diag.map((c) => c / len(diag)) as V3) < 1e-12, 'sense: a diagonal (D + Space) is asked about, and moved along, as one direction');
    const capped = sensed({ forward: true, boost: true }, 1e-30, 0.25e-30, { delta: 0.05, speed: 8 });
    check(!!capped.d && Math.abs(len(capped.d) / 0.25e-30 - 1) < 1e-12 && off(capped.d, b.fwd) < 1e-12, 'sense: a frame never moves more than the limit sense answers, and keeps its direction', capped.d ? String(len(capped.d)) : 'no move');
    const none = [sensed({ forward: true }, NaN, 1), sensed({ forward: true }, 1, 0), sensed({ forward: true }, 0, 1), sensed({ forward: true }, 1, NaN)];
    check(none.every((r) => r.d === null && r.asks === 1), 'sense: a pace or a limit that is 0 or not a number moves nothing');
    const idle = sensed({}, 1, 1);
    check(idle.d === null && idle.asks === 0, 'sense: no key, no move, and sense is not asked');
    // The pace's ease is the caller's: a pace 1000 times farther is flown at once.
    const cam = createFlyCamera();
    const near = sensed({ forward: true }, 1e-30, Infinity, { cam });
    const far = sensed({ forward: true }, 1e-27, Infinity, { cam });
    check(!!near.d && !!far.d && Math.abs(len(far.d) / len(near.d) / 1000 - 1) < 1e-9, 'sense: a pace 1000 times farther is flown at once (its ease is the caller\'s)',
        near.d && far.d ? `x${(len(far.d) / len(near.d)).toFixed(1)}` : 'no move');
    // Switching rules in flight: the old rule leaves ITS integrator's eased distance at 1e-30; the new rule must not start from it.
    const both = createFlyCamera();
    for (let i = 0; i < 30; i++) both.step({ delta: 1 / 60, yaw: 1.14, pitch: 0.29, inputs: inputs({ forward: true }), speed: 3.6, distance: 1e-30, translate: () => undefined });
    const after = sensed({ forward: true }, 2e-30, Infinity, { cam: both });
    check(!!after.d && Math.abs(len(after.d) / (2e-30 * 3.6 / 60) - 1) < 1e-12, 'sense: after the old rule at 1e-30, the first frame under the new rule moves by its pace (the rules do not share an eased distance)',
        after.d ? `${(len(after.d) / (2e-30 * 3.6 / 60)).toPrecision(3)} of it` : 'no move');
    // A turn is read back the same way under both rules.
    const turnOld = createFlyCamera().step({ delta: 1 / 60, yaw: 1, pitch: 0.2, inputs: inputs({}, { x: 0.5, y: 0.25 }), speed: 3.6, distance: 1, translate: () => undefined });
    const turnNew = createFlyCamera().step({ delta: 1 / 60, yaw: 1, pitch: 0.2, inputs: inputs({}, { x: 0.5, y: 0.25 }), speed: 3.6, distance: 1, sense: () => ({ pace: 1, limit: 1 }), translate: () => undefined });
    check(!!turnOld && !!turnNew && turnOld.yaw === turnNew.yaw && turnOld.pitch === turnNew.pitch && turnNew.yaw !== 1, 'sense: a look drag turns the camera exactly as under the old rule');
}

// ── pace: what the speed is multiplied by, and how fast it may change (deep-zoom/flyPace.ts) ──
{
    const frame = (look: number, ahead = NaN, delta = 1 / 60, boost = false) => ({ delta, look, ahead, rise: 4, boost });
    let p = createPace();
    check(Number.isNaN(p.value()) && p.step(frame(1e-20)) === 1e-20, 'pace: the first reading is taken as it is');
    check(p.step(frame(1e-25)) === 1e-25, 'pace: a nearer target is taken at once');
    // rise: 4 decades a second, whatever the gap
    let v = 0;
    for (let i = 0; i < 60; i++) v = p.step(frame(1e-3));
    check(Math.abs(Math.log10(v / 1e-25) - 4) < 1e-9, 'pace: it rises by 4 decades a second towards a target 22 decades away', `rose ${Math.log10(v / 1e-25).toFixed(3)} decades in a second`);
    for (let i = 0; i < 60 * 6; i++) v = p.step(frame(1e-3));
    check(v === 1e-3, 'pace: and stops on the target');
    p = createPace(); p.step(frame(1e-30));
    for (let i = 0; i < 3; i++) v = p.step(frame(1e-10));
    check(v / 1e-30 < 1.6 && v / 1e-30 > 1.5, 'pace: three wrong frames (a reading 20 decades too far) raise it 1.6 times, no more', `x${(v / 1e-30).toFixed(3)}`);
    p = createPace(); p.step(frame(1e-30));
    const plain = p.step(frame(1, NaN, 1 / 60, false));
    p = createPace(); p.step(frame(1e-30));
    const shift = p.step(frame(1, NaN, 1 / 60, true));
    check(Math.abs(Math.log10(shift / 1e-30) / Math.log10(plain / 1e-30) - DZ_PACE_BOOST) < 1e-9, 'pace: Shift rises four times as fast');
    p = createPace();
    check(p.step(frame(1e-20, 1e-22)) === 1e-22 && p.step(frame(1e-25, 1e-22)) === 1e-25, 'pace: the nearer of the two readings (what is looked at, what lies ahead of the move) is the target');
    p = createPace(); p.step(frame(1e-20));
    check(p.step(frame(NaN, NaN)) === 1e-20 && p.step(frame(NaN, 1e-21)) === 1e-21, 'pace: nothing read, the pace stands; one reading alone is the target');
    p = createPace(); p.step(frame(1e-30)); p.reset();
    check(Number.isNaN(p.value()) && p.step(frame(1e-3)) === 1e-3, 'pace: after reset the next reading is taken as it is (a jump out of a deep place)');
    p = createPace(); p.step(frame(1e-30));
    check(p.step(frame(0)) === 0 && p.step(frame(1e-12)) === 1e-12, 'pace: inside the solid it is 0, and the first reading outside is taken at once');
    p = createPace(); p.step(frame(1e-30));
    const long = p.step(frame(1, NaN, 10));
    check(Math.abs(Math.log10(long / 1e-30) - 4 * DZ_PACE_MAX_DELTA) < 1e-9, 'pace: a ten-second frame rises as an eighth of a second', `${Math.log10(long / 1e-30).toFixed(3)} decades`);

    const s = (near: number, second: number, hits: number, inside = false, open = 0) => ({ near, second, hits, open, inside, marched: true });
    check(DZ_PACE_SHARE === 1 / 3 && paceReading(s(1e-30, 3e-30, 7), 9) === 3e-30 * DZ_PACE_SHARE && paceReading(s(0, 0, 0, true), 9) === 0, 'reading: a third of the second nearest ray; 0 inside the solid');
    check(paceReading(s(8.5, 9, 0), 1.25) === 1.25, 'reading: with nothing that way at all the fallback stands in, as it is');
    check(paceReading(s(1e-20, 3e-20, 0), 1.25) === 3e-20 * DZ_PACE_SHARE, 'reading: rays that only ran out of steps give a third of their lower bound');
    check(lookDistance(s(1e-30, 2e-30, 7)) === 2e-30 && lookDistance(s(1e-30, 2e-30, 1)) === 0 && lookDistance(s(0, 0, 7, true)) === 0, 'reading: the readout wants two rays on a surface, and shows nothing from inside');
    check(lookDistance(s(1e-30, 2e-30, 5, false, 2)) === 0 && paceReading(s(1e-30, 2e-30, 5, false, 2), 9) === 2e-30 * DZ_PACE_SHARE, 'reading: with a ray unfinished the readout waits (it may be a lower bound); the pace may follow it');
}

console.log(failed === 0 ? 'fly-camera: all green' : `fly-camera: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
