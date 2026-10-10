/**
 * fly-camera check: GMT's fly integrator driving the deep renderer's camera of three angles
 * (`deep-zoom/flyCamera.ts`), and the rule the speed follows (`deep-zoom/flyPace.ts`). Node only,
 * no browser.
 *
 *   npx tsx debug/deep-zoom-checks/fly-camera.mts        (npm run check:deep-zoom-fly-camera)
 *
 * The renderer's basis is copied here from `function basis()` in deep-zoom/renderer/core.js, roll
 * included, so the "basis:" lines compare the adapter against the renderer's own formula, not
 * against itself. The "turn:" lines fly a second camera beside the adapter's: a three.js object
 * turned by the engine's integrator and NEVER taken apart into angles. What the adapter hands back,
 * read through the renderer's formula, must be that camera.
 *
 * FALSIFICATION RECORD, one break per run in deep-zoom/flyCamera.ts. First made 2026-10-08 (when the
 * read-back was a turntable and E / Q were up / down; those lines went on 2026-10-10) and made again
 * on 2026-10-11 against this version - the counts are that run's, all four in the old rule's call:
 *   - `minSpeed: 0` removed (the engine's 1e-6 floor applies)         -> 2 red ("deep: Shift is four times that there too ...": 8.00e-41 both times, "stride: at the default speed the limit does not bite": 0.8 - the stride cut catches what the floor throws)
 *   - `Math.min(frame.delta, DZ_NAV_MAX_DELTA)` -> `frame.delta`      -> 1 red ("delta: ...": 0.36 instead of 0.18)
 *   - `boostMinDistance: 0` removed (the engine's 1e-4 floor applies) -> 2 red (the same two lines)
 *   - the stride limit removed (`const k = 1`)                         -> 1 red ("stride: speed 8 with Shift ...": 1.6 of the distance)
 *
 * FALSIFICATION RECORD, 2026-10-10 (the roll: the "basis:", "keys:" and "turn:" lines), one break per run:
 *   deep-zoom/orbitCamera.ts (the mapping the adapter is built on)
 *   - `toQuaternion`: `-(o.yaw + Math.PI / 2)` -> `-(o.yaw)`          -> 14 red (all four "basis:" lines, "stride: ... along the view", "keys: the roll is the engine's own ...", five "turn:" lines, three "sense:" lines)
 *   - `toQuaternion`: `o.roll` -> `-o.roll`                            -> 6 red ("basis: D ...", "basis: Space ...", "keys: Q turns ...", "keys: the roll is the engine's own ...", "turn: with the pitch off zero ...", "turn: read through the renderer's formula ...": 1.99 off)
 *   - `toOrientation`: `roll: euler.z` -> `roll: 0`                    -> 6 red (three "keys:" lines, "turn: with the pitch off zero ...", "turn: read through ...", "turn: straight over a pole ...")
 *   - `toOrientation`: the yaw not brought back near the one it had    -> 2 red ("turn: on the level a drag to the right ...": yaw 1 -> -4.3253, "turn: a drag to the left ...")
 *   deep-zoom/flyCamera.ts
 *   - the roll keys also shown to the integrator that moves (`Object.assign(move, held)`)
 *                                                                      -> 3 red ("keys: the roll is the engine's own ...": 101 degrees in a second, "keys: Shift rolls four times ...", "turn: read through ...")
 *   - `DZ_NAV_ROLL_GEAR = 7.2` -> `1`                                   -> 2 red ("keys: the roll is the engine's own ...": 88.8 degrees in a second, "keys: Shift rolls four times ...")
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
import * as THREE from 'three';
import { DZ_NAV_MAX_DELTA, DZ_NAV_MAX_STRIDE, DZ_NAV_ROLL_GEAR, createFlyCamera } from '../../deep-zoom/flyCamera.ts';
import { DZ_PACE_BOOST, DZ_PACE_MAX_DELTA, DZ_PACE_SHARE, createPace, lookDistance, paceReading } from '../../deep-zoom/flyPace.ts';
import { FlyIntegrator } from '../../engine/plugins/navigation/FlyIntegrator.ts';
import type { FlyInputs, MoveInputState } from '../../engine/plugins/navigation/FlyIntegrator.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type V3 = [number, number, number];
type Look = { yaw: number; pitch: number; roll: number };

/** `function basis()` of deep-zoom/renderer/core.js: the page's, then its ROLL about the view axis. */
function rendererBasis(yaw: number, pitch: number, roll = 0): { fwd: V3; right: V3; up: V3 } {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const fwd: V3 = [cp * cy, sp, cp * sy];
    const right: V3 = [Math.cos(yaw + Math.PI / 2), 0, Math.sin(yaw + Math.PI / 2)];
    const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    if (!roll) return { fwd, right, up };
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return { fwd, right: right.map((v, i) => v * cr + up[i] * sr) as V3, up: up.map((v, i) => v * cr - right[i] * sr) as V3 };
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
function moveOf(yaw: number, pitch: number, move: Partial<MoveInputState>, distance = 1, delta = 1 / 60, speed = 3.6, roll = 0): { d: V3 | null; turned: boolean } {
    let d: V3 | null = null;
    const turned = createFlyCamera().step({
        delta, yaw, pitch, roll, inputs: inputs(move), speed, distance,
        translate: (x, y, z) => { d = [x, y, z]; },
    });
    return { d, turned: turned !== null };
}
const len = (v: V3): number => Math.hypot(v[0], v[1], v[2]);
/** The largest component difference between `v / |v|` and the unit vector `u`. */
const off = (v: V3 | null, u: V3): number => (v ? Math.max(...v.map((c, i) => Math.abs(c / len(v) - u[i]))) : Infinity);

// ── basis: the three move keys against the renderer's own formula, at several looks, three of them rolled ──
const LOOKS: Array<[number, number, number]> = [[-Math.PI / 2, 0, 0], [0, 0, 0], [1.14, 0.29, 0], [-6.6, -0.18, 0.7], [2.5, 1.2, -2.1], [-0.7, -1.5, 3]];
let worstW = 0, worstD = 0, worstUp = 0;
for (const [yaw, pitch, roll] of LOOKS) {
    const b = rendererBasis(yaw, pitch, roll);
    worstW = Math.max(worstW, off(moveOf(yaw, pitch, { forward: true }, 1, 1 / 60, 3.6, roll).d, b.fwd));
    worstD = Math.max(worstD, off(moveOf(yaw, pitch, { right: true }, 1, 1 / 60, 3.6, roll).d, b.right));
    worstUp = Math.max(worstUp, off(moveOf(yaw, pitch, { up: true }, 1, 1 / 60, 3.6, roll).d, b.up));
}
check(worstW < 1e-12, `basis: W moves along the renderer's forward at ${LOOKS.length} looks, three of them rolled`, `worst ${worstW.toExponential(2)}`);
check(worstD < 1e-12, "basis: D moves along the renderer's right, the roll included", `worst ${worstD.toExponential(2)}`);
check(worstUp < 1e-12, "basis: Space moves along the renderer's up (the camera's, not the world's), the roll included", `worst ${worstUp.toExponential(2)}`);
{
    // No roll in and nothing that turns: the page's own basis, and no orientation handed back (the renderer keeps its roll of 0).
    const page = rendererBasis(1.14, 0.29), d = moveOf(1.14, 0.29, { right: true }), up = moveOf(1.14, 0.29, { up: true });
    check(off(d.d, page.right) < 1e-12 && off(up.d, page.up) < 1e-12 && !d.turned && !up.turned,
        "basis: with no roll and nothing that turns, D and Space move along the page's right and up and no orientation is handed back");
}

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

// ── the camera beside the adapter's: a three.js object the engine's integrators turn, never taken apart into angles ──
/** The object for an orientation: `Euler(pitch, -(yaw + pi/2), roll, 'YXZ')`, the mapping deep-zoom/orbitCamera.ts writes out. */
const objectOf = (o: Look): THREE.Object3D => { const b = new THREE.Object3D(); b.quaternion.setFromEuler(new THREE.Euler(o.pitch, -(o.yaw + Math.PI / 2), o.roll, 'YXZ')); return b; };
const axisOf = (b: THREE.Object3D, x: number, y: number, z: number): V3 => { const v = new THREE.Vector3(x, y, z).applyQuaternion(b.quaternion); return [v.x, v.y, v.z]; };
const apart = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const nowhere = (): void => undefined;
/**
 * `frames` frames of the adapter with these keys and this drag, its camera keeping what it is handed back (as the
 * renderer does), flown beside the reference camera: the look by one integrator, the roll keys by one told the
 * speed over the gear, both on the object itself. `worst`: the most the adapter's camera, read through the
 * renderer's formula, ever stood off the reference's forward and up. `jump`: the largest change of the yaw
 * handed back in one frame.
 */
function flyBeside(start: Look, frames: number, keys: Partial<MoveInputState>, drag?: { x: number; y: number }, speed = 3.6) {
    const cam = createFlyCamera(), ref = objectOf(start), look = new FlyIntegrator(), roll = new FlyIntegrator();
    let o = start, worst = 0, jump = 0, moved = false, turnedFrames = 0;
    for (let i = 0; i < frames; i++) {
        const next = cam.step({ delta: 1 / 60, ...o, inputs: inputs(keys, drag), speed, distance: 1, translate: () => { moved = true; } });
        if (next) {
            jump = Math.max(jump, Math.abs(Math.atan2(Math.sin(next.yaw - o.yaw), Math.cos(next.yaw - o.yaw))));
            o = next;
            turnedFrames++;
        }
        look.update(ref, 1 / 60, inputs({ ...keys, rollLeft: false, rollRight: false }, drag), { baseSpeed: speed, distEstimate: 1, autoSlow: true, minSpeed: 0, boostMinDistance: 0, translate: nowhere });
        roll.update(ref, 1 / 60, inputs({ rollLeft: !!keys.rollLeft, rollRight: !!keys.rollRight, boost: !!keys.boost }), { baseSpeed: speed / DZ_NAV_ROLL_GEAR, distEstimate: 1, autoSlow: true, translate: nowhere });
        const b = rendererBasis(o.yaw, o.pitch, o.roll);
        worst = Math.max(worst, apart(b.fwd, axisOf(ref, 0, 0, -1)), apart(b.up, axisOf(ref, 0, 1, 0)));
    }
    return { o, worst, jump, moved, turnedFrames };
}
const degrees = (r: number): string => (r * 180 / Math.PI).toFixed(1);

// ── Q / E: roll ──
{
    const start: Look = { yaw: 1.14, pitch: 0.29, roll: 0 };
    const q = flyBeside(start, 60, { rollLeft: true }), e = flyBeside(start, 60, { rollRight: true });
    const b0 = rendererBasis(start.yaw, start.pitch), bq = rendererBasis(q.o.yaw, q.o.pitch, q.o.roll);
    check(apart(bq.fwd, b0.fwd) < 1e-12 && apart(bq.up, b0.up) > 0.1 && q.o.roll > 0.1 && !q.moved,
        'keys: Q turns the camera about its view axis (forward stays, up turns, the roll rises) and moves nothing', `roll ${q.o.roll}, forward off by ${apart(bq.fwd, b0.fwd).toExponential(2)}, moved ${q.moved}`);
    check(Math.abs(e.o.roll + q.o.roll) < 1e-12 && !e.moved, 'keys: E rolls the other way by as much, and moves nothing', `Q ${q.o.roll}, E ${e.o.roll}`);
    check(q.worst < 1e-9 && e.worst < 1e-9 && 3.6 / DZ_NAV_ROLL_GEAR === 0.5,
        `keys: the roll is the engine's own, told the speed over ${DZ_NAV_ROLL_GEAR}: the default 3.6 rolls as GMT's default 0.5 does (a second of Q: ${degrees(q.o.roll)} degrees so far)`, `off the reference by ${Math.max(q.worst, e.worst).toExponential(2)}`);
    const shift = flyBeside(start, 60, { rollLeft: true, boost: true });
    check(Math.abs(shift.o.roll / q.o.roll - 4) < 1e-9, 'keys: Shift rolls four times as fast', `x${(shift.o.roll / q.o.roll).toFixed(4)}`);
}

// ── turn: a look drag, about the camera's own axes, read back whole ──
{
    const level = flyBeside({ yaw: 1.0, pitch: 0, roll: 0 }, 60, {}, { x: 0.5, y: 0 });
    check(level.o.yaw > 1.0 + 0.5 && Math.abs(level.o.pitch) < 1e-12 && Math.abs(level.o.roll) < 1e-12, 'turn: on the level a drag to the right raises the yaw and leaves the pitch and the roll alone',
        `yaw 1 -> ${level.o.yaw.toFixed(4)}, pitch ${level.o.pitch}, roll ${level.o.roll}`);
    const left = flyBeside({ yaw: 1.0, pitch: 0, roll: 0 }, 60, {}, { x: -0.5, y: 0 });
    check(Math.abs((1.0 - left.o.yaw) - (level.o.yaw - 1.0)) < 1e-9, 'turn: a drag to the left lowers it by the same amount');
    const up = flyBeside({ yaw: 1.0, pitch: 0.1, roll: 0 }, 60, {}, { x: 0, y: 0.25 });
    check(up.o.pitch > 0.1 + 0.2 && Math.abs(up.o.yaw - 1.0) < 1e-9 && Math.abs(up.o.roll) < 1e-9, 'turn: a drag up raises the pitch and leaves the yaw and the roll alone',
        `pitch 0.1 -> ${up.o.pitch.toFixed(4)}, yaw 1 -> ${up.o.yaw}, roll ${up.o.roll}`);
    // With the pitch off zero a drag across is about the camera's OWN up: that axis stays where it was, and the horizon tilts.
    const steep = flyBeside({ yaw: 1.0, pitch: 0.6, roll: 0 }, 60, {}, { x: 0.5, y: 0 });
    const upMoved = apart(rendererBasis(steep.o.yaw, steep.o.pitch, steep.o.roll).up, rendererBasis(1.0, 0.6).up);
    check(upMoved < 1e-9 && Math.abs(steep.o.roll) > 0.1, "turn: with the pitch off zero a drag across is about the camera's own up (that axis stays) and tilts the horizon, as in GMT",
        `up moved ${upMoved.toExponential(2)}, roll ${steep.o.roll}`);
    // Over a pole: the angles jump, the camera does not. Straight over the top (no roll), past it with a roll, and
    // under the bottom while rolling and turning.
    const over = flyBeside({ yaw: 1.0, pitch: 1.5, roll: 0 }, 60, {}, { x: 0, y: 1 });
    const beside = flyBeside({ yaw: 1.0, pitch: 1.5, roll: 0.4 }, 60, {}, { x: 0, y: 1 });
    const under = flyBeside({ yaw: -2.2, pitch: -1.45, roll: -1.1 }, 90, { rollLeft: true }, { x: 0.4, y: -1 });
    const worst = Math.max(level.worst, left.worst, up.worst, steep.worst, over.worst, beside.worst, under.worst);
    check(worst < 1e-9, "turn: read through the renderer's formula, what is handed back is the camera that was never taken apart into angles - four drags, and three carried past a pole",
        `worst ${worst.toExponential(2)} (over ${over.worst.toExponential(2)}, beside ${beside.worst.toExponential(2)}, under ${under.worst.toExponential(2)})`);
    check(Math.abs(over.jump - Math.PI) < 1e-9 && Math.abs(Math.abs(over.o.roll) - Math.PI) < 1e-9 && Math.abs(over.o.pitch) < 1 && Math.max(level.jump, up.jump, steep.jump) < 0.1,
        'turn: straight over a pole the yaw handed back jumps by half a turn in one frame, the roll with it, and the pitch comes back down; away from the poles nothing jumps',
        `jump ${over.jump}, roll ${over.o.roll}, pitch ${over.o.pitch.toFixed(3)}; elsewhere ${Math.max(level.jump, up.jump, steep.jump).toFixed(4)}`);
    check(flyBeside({ yaw: 1.0, pitch: 0.6, roll: 0.3 }, 5, {}).turnedFrames === 0, 'turn: no drag and no roll key, no turn');
}

// ── sense: the speed rule since 2026-10-09 - the caller answers a pace and a one-frame limit ──
{
    const b = rendererBasis(1.14, 0.29);
    /** One frame under the new rule: the move, how often `sense` was asked, and with what. */
    function sensed(move: Partial<MoveInputState>, pace: number, limit: number, opt: { delta?: number; speed?: number; distance?: number; cam?: ReturnType<typeof createFlyCamera> } = {}) {
        let d: V3 | null = null, asks = 0, asked: V3 | null = null;
        (opt.cam ?? createFlyCamera()).step({
            delta: opt.delta ?? 1 / 60, yaw: 1.14, pitch: 0.29, roll: 0, inputs: inputs(move), speed: opt.speed ?? 3.6, distance: opt.distance ?? 123,
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
    for (let i = 0; i < 30; i++) both.step({ delta: 1 / 60, yaw: 1.14, pitch: 0.29, roll: 0, inputs: inputs({ forward: true }), speed: 3.6, distance: 1e-30, translate: () => undefined });
    const after = sensed({ forward: true }, 2e-30, Infinity, { cam: both });
    check(!!after.d && Math.abs(len(after.d) / (2e-30 * 3.6 / 60) - 1) < 1e-12, 'sense: after the old rule at 1e-30, the first frame under the new rule moves by its pace (the rules do not share an eased distance)',
        after.d ? `${(len(after.d) / (2e-30 * 3.6 / 60)).toPrecision(3)} of it` : 'no move');
    // A turn is read back the same way under both rules.
    const turnOld = createFlyCamera().step({ delta: 1 / 60, yaw: 1, pitch: 0.2, roll: 0, inputs: inputs({}, { x: 0.5, y: 0.25 }), speed: 3.6, distance: 1, translate: () => undefined });
    const turnNew = createFlyCamera().step({ delta: 1 / 60, yaw: 1, pitch: 0.2, roll: 0, inputs: inputs({}, { x: 0.5, y: 0.25 }), speed: 3.6, distance: 1, sense: () => ({ pace: 1, limit: 1 }), translate: () => undefined });
    check(!!turnOld && !!turnNew && turnOld.yaw === turnNew.yaw && turnOld.pitch === turnNew.pitch && turnOld.roll === turnNew.roll && turnNew.yaw !== 1, 'sense: a look drag turns the camera exactly as under the old rule');
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
