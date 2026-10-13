/**
 * orbit-camera check: Orbit mode's three moves as displacements (`deep-zoom/orbitCamera.ts`).
 * Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/orbit-camera.mts        (npm run check:deep-zoom-orbit-camera)
 *
 * The camera here is a plain point in doubles and the pivot a point in front of it; every move is
 * applied by adding it. That is all the real renderer does with a move too (it adds it to a
 * 256-bit position), so what holds here for a pivot at 1e-60 holds there. The renderer's basis is
 * copied from `function basis()` in deep-zoom/renderer/core.js, roll included, so the "ray:" lines
 * and the two "turn: with ..." lines compare the module against the renderer's own formula and not
 * against itself.
 *
 * FALSIFICATION RECORD, one break per run in deep-zoom/orbitCamera.ts. The first five were made on
 * 2026-10-09 and made again on 2026-10-10 against this version of the check (the counts are that run's):
 *   - `orbitTurn`: `before[0] - after[0]` -> `after[0] - before[0]`      -> 6 red (the three "turn: the pivot stays ..." lines, the pole one, and the two "turn: with ..." lines)
 *   - `DZ_FOV_SCALE`: `Math.tan(0.5 * 1.1)` -> `Math.tan(0.5)`            -> 3 red (both "ray:" lines, "turn: with no roll and no pitch ...")
 *   - `orbitZoom`: `(1 - factor)` -> `factor`                             -> 3 red (all three "zoom:" lines)
 *   - `orbitDrag`: `-depth` -> `depth`                                    -> 1 red ("drag: the pivot lands under the dragged point": 0.36 picture heights off)
 *   - `orbitDrag`: `depth` -> `pivot.distance` (no correction off-centre) -> 1 red (the same line: 0.019 picture heights off)
 * 2026-10-10, the roll and the turn about the camera's own axes:
 *   - `toQuaternion`: `o.roll` -> `-o.roll`                               -> 2 red ("ray: ... the roll included", "turn: with a roll ...")
 *   - `toOrientation`: `roll: euler.z` -> `roll: 0`                       -> 2 red ("turn: carried over a pole ...": not upside down, "turn: with a roll ...")
 *   - `orbitTurn`: the turn put before the camera's own (`.multiply` -> `.premultiply`: about the world's axes)
 *                                                                         -> 3 red ("turn: carried over a pole ...", "turn: with no roll and no pitch ...", "turn: with a roll ...")
 *   - `orbitTurn`: `-across` -> `across`                                  -> 2 red ("turn: with no roll and no pitch ...": yaw 0.4 -> 0.1, "turn: with a roll ...")
 *   - `orbitTurn`: the line that hands a zero turn straight back removed  -> 1 red ("turn: no turn, no move")
 */
import { DZ_FOV_SCALE, orbitDrag, orbitTurn, orbitZoom, viewBasis, viewRay } from '../../deep-zoom/orbitCamera.ts';
import type { OrbitPivot, V3 } from '../../deep-zoom/orbitCamera.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type Look = { yaw: number; pitch: number; roll: number };

/** `function basis()` of deep-zoom/renderer/core.js: the page's, then its ROLL about the view axis. */
function rendererBasis(o: Look): { fwd: V3; right: V3; up: V3 } {
    const cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
    const fwd: V3 = [cp * cy, sp, cp * sy];
    const right: V3 = [Math.cos(o.yaw + Math.PI / 2), 0, Math.sin(o.yaw + Math.PI / 2)];
    const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    if (!o.roll) return { fwd, right, up };
    const cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    return { fwd, right: right.map((v, i) => v * cr + up[i] * sr) as V3, up: up.map((v, i) => v * cr - right[i] * sr) as V3 };
}
/** The renderer's ray through a point of the picture: `normalize(fwd + tan(0.55) (u right + v up))`. */
function rendererRay(o: Look, u: number, v: number): V3 {
    const { fwd, right, up } = rendererBasis(o), f = Math.tan(0.5 * 1.1);
    const d: V3 = [0, 1, 2].map((k) => fwd[k] + f * (u * right[k] + v * up[k])) as V3;
    const l = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / l, d[1] / l, d[2] / l];
}
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
/** Where a world point is seen from a camera: its point of the picture and its distance. */
function seen(camera: V3, o: Look, point: V3): { u: number; v: number; distance: number } {
    const { fwd, right, up } = viewBasis(o);
    const rel = sub(point, camera), z = dot(rel, fwd);
    return { u: dot(rel, right) / z / DZ_FOV_SCALE, v: dot(rel, up) / z / DZ_FOV_SCALE, distance: len(rel) };
}
/** A fixed sequence of numbers in 0..1 (no Math.random: the same cases every run). */
let seed = 12345;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
/** Any orientation: every yaw and roll, a pitch short of the poles by 0.07. */
const anyLook = (): Look => ({ yaw: (rnd() - 0.5) * 14, pitch: (rnd() - 0.5) * 3, roll: (rnd() - 0.5) * 6.2 });

// ── ray ──
{
    let worst = 0;
    for (let i = 0; i < 200; i++) {
        const o = anyLook(), u = (rnd() - 0.5) * 1.7, v = rnd() - 0.5;
        worst = Math.max(worst, len(sub(viewRay(o, u, v), rendererRay(o, u, v))));
    }
    check(worst < 1e-14, "ray: a point of the picture gives the direction of the renderer's own formula, at 200 orientations, the roll included", `worst ${worst.toExponential(2)}`);
    const level: Look = { yaw: 1.14, pitch: 0.29, roll: 0 };
    check(len(sub(viewRay(level, 0.3, -0.2), rendererRay(level, 0.3, -0.2))) < 1e-15 && len(sub(viewRay(level, 0, 0), viewBasis(level).fwd)) < 1e-15,
        "ray: with no roll it is the page's ray, and the middle of the picture is the view axis");
}

// ── turn: the pivot stays where it is in the picture, at its distance ──
function turnError(distance: number, steps: number): { where: number; far: number } {
    let where = 0, far = 0;
    for (let i = 0; i < 200; i++) {
        let o: Look = { yaw: (rnd() - 0.5) * 14, pitch: (rnd() - 0.5) * 2.4, roll: (rnd() - 0.5) * 6.2 };
        const pivot: OrbitPivot = { u: (rnd() - 0.5) * 1.7, v: rnd() - 0.5, distance };
        const across = (rnd() - 0.5) * 1.2 / steps, up = (rnd() - 0.5) * 0.6 / steps;
        let camera: V3 = [0, 0, 0];
        const point = scl(viewRay(o, pivot.u, pivot.v), distance);
        for (let s = 0; s < steps; s++) {
            const t = orbitTurn(o, pivot, across, up);
            camera = add(camera, t.move); o = t;
        }
        const now = seen(camera, o, point);
        where = Math.max(where, Math.hypot(now.u - pivot.u, now.v - pivot.v));
        far = Math.max(far, Math.abs(now.distance / distance - 1));
    }
    return { where, far };
}
{
    const one = turnError(1, 1);
    check(one.where < 1e-12 && one.far < 1e-12, 'turn: the pivot stays at its point of the picture and its distance, for 200 pivots, orientations and turns', `moved ${one.where.toExponential(2)} picture heights, distance off by ${one.far.toExponential(2)}`);
    const deep = turnError(3e-60, 1);
    check(deep.where < 1e-12 && deep.far < 1e-12, 'turn: the same with the pivot 3e-60 away', `moved ${deep.where.toExponential(2)}, distance off by ${deep.far.toExponential(2)}`);
    const long = turnError(3e-60, 1000);
    check(long.where < 1e-9 && long.far < 1e-9, 'turn: the pivot stays put through a drag of 1000 small steps (nothing drifts)', `moved ${long.where.toExponential(2)}, distance off by ${long.far.toExponential(2)}`);
    // nothing stops at a pole: carried over the top the pitch comes back down, and the pivot still stays put
    const pivot: OrbitPivot = { u: 0.3, v: -0.2, distance: 2 };
    const from: Look = { yaw: 0.4, pitch: 1.5, roll: 0.3 };
    const t = orbitTurn(from, pivot, 0, 0.4);
    const now = seen(t.move, t, scl(viewRay(from, pivot.u, pivot.v), 2));
    check(Math.abs(t.pitch) < 1.5 && viewBasis(t).up[1] < 0 && Math.hypot(now.u - pivot.u, now.v - pivot.v) < 1e-12, 'turn: carried over a pole the camera goes on (it is upside down, its pitch back under 1.5) and the pivot still stays put',
        `pitch ${t.pitch}, up.y ${viewBasis(t).up[1]}, moved ${Math.hypot(now.u - pivot.u, now.v - pivot.v).toExponential(2)}`);
    // with no roll and no pitch it is the turntable Orbit mode was before the roll: the two angles added
    const flat: Look = { yaw: 0.4, pitch: 0, roll: 0 }, table: Look = { yaw: 0.4 + 0.3, pitch: 0.2, roll: 0 };
    const tt = orbitTurn(flat, pivot, 0.3, 0.2);
    const tableMove = scl(sub(rendererRay(flat, pivot.u, pivot.v), rendererRay(table, pivot.u, pivot.v)), 2);
    check(Math.abs(tt.yaw - table.yaw) < 1e-12 && Math.abs(tt.pitch - table.pitch) < 1e-12 && Math.abs(tt.roll) < 1e-12 && len(sub(tt.move, tableMove)) < 1e-12,
        'turn: with no roll and no pitch a turn is the yaw and the pitch added, and its move the turntable\'s', `yaw ${tt.yaw}, pitch ${tt.pitch}, roll ${tt.roll}, move off by ${len(sub(tt.move, tableMove)).toExponential(2)}`);
    // with a roll the turn is about the camera's OWN axes: for the middle of the picture, a turn across by a carries
    // the camera by distance x ((1 - cos a) forward - sin a right) and leaves its up where it was; a turn up does the
    // same along its own up and leaves its right
    const rolled: Look = { yaw: -2.2, pitch: 0.4, roll: 0.9 }, b = rendererBasis(rolled), centre: OrbitPivot = { u: 0, v: 0, distance: 5e-30 }, a = 0.05;
    const along = (move: V3, axis: V3): number => dot(move, axis) / centre.distance;
    const ta = orbitTurn(rolled, centre, a, 0), tu = orbitTurn(rolled, centre, 0, a);
    const offAcross = Math.max(Math.abs(along(ta.move, b.right) + Math.sin(a)), Math.abs(along(ta.move, b.up)), Math.abs(along(ta.move, b.fwd) - (1 - Math.cos(a))), len(sub(rendererBasis(ta).up, b.up)));
    const offUp = Math.max(Math.abs(along(tu.move, b.up) + Math.sin(a)), Math.abs(along(tu.move, b.right)), Math.abs(along(tu.move, b.fwd) - (1 - Math.cos(a))), len(sub(rendererBasis(tu).right, b.right)));
    check(offAcross < 1e-12 && offUp < 1e-12, "turn: with a roll, a turn across is about the camera's own up and carries it along its own right, a turn up about its own right and along its own up (the renderer's, rolled), not the world's",
        `across off by ${offAcross.toExponential(2)}, up off by ${offUp.toExponential(2)}`);
    const none = orbitTurn({ yaw: 0.4, pitch: 0.2, roll: 0.3 }, pivot, 0, 0);
    check(len(none.move) === 0 && none.yaw === 0.4 && none.pitch === 0.2 && none.roll === 0.3, 'turn: no turn, no move');
    // a pivot at distance 0 is a look in place
    check(len(orbitTurn({ yaw: 0.4, pitch: 0.2, roll: 0 }, { u: 0, v: 0, distance: 0 }, 0.3, 0.1).move) === 0, 'turn: with no distance to the pivot it is a look in place');
}

// ── zoom ──
{
    const pivot: OrbitPivot = { u: -0.4, v: 0.25, distance: 5e-41 }, o: Look = { yaw: 2.2, pitch: -0.7, roll: 1.3 };
    const ray = viewRay(o, pivot.u, pivot.v), point = scl(ray, pivot.distance);
    const z = orbitZoom(o, pivot, 0.86);
    const now = seen(z.move, o, point);
    check(Math.abs(len(z.move) / (0.14 * pivot.distance) - 1) < 1e-12 && len(sub(scl(z.move, 1 / len(z.move)), ray)) < 1e-12,
        'zoom: a factor of 0.86 moves 14 % of the distance, along the pivot\'s ray');
    check(Math.abs(z.distance / (0.86 * pivot.distance) - 1) < 1e-12 && Math.abs(now.distance / z.distance - 1) < 1e-12 && Math.hypot(now.u - pivot.u, now.v - pivot.v) < 1e-12,
        'zoom: the pivot is then 0.86 of the distance away, at the same point of the picture', `${now.distance}, ${now.u}, ${now.v}`);
    const back = orbitZoom(o, pivot, 1.25);
    check(dot(back.move, ray) < 0 && Math.abs(back.distance / (1.25 * pivot.distance) - 1) < 1e-12, 'zoom: a factor above 1 backs away along the same ray');
}

// ── drag ──
{
    let worst = 0;
    for (let i = 0; i < 100; i++) {
        const o: Look = { yaw: (rnd() - 0.5) * 14, pitch: (rnd() - 0.5) * 2.4, roll: (rnd() - 0.5) * 6.2 };
        const pivot: OrbitPivot = { u: (rnd() - 0.5) * 1.5, v: (rnd() - 0.5) * 0.9, distance: 7e-33 };
        const du = (rnd() - 0.5) * 0.3, dv = (rnd() - 0.5) * 0.3;
        const point = scl(viewRay(o, pivot.u, pivot.v), pivot.distance);
        const now = seen(orbitDrag(o, pivot, du, dv), o, point);
        worst = Math.max(worst, Math.hypot(now.u - (pivot.u + du), now.v - (pivot.v + dv)));
    }
    check(worst < 1e-12, 'drag: the pivot lands under the dragged point, for 100 pivots, orientations and drags', `worst ${worst.toExponential(2)} picture heights off`);
    const o: Look = { yaw: 0.3, pitch: 0.2, roll: -0.8 };
    check(Math.abs(dot(orbitDrag(o, { u: 0.2, v: 0.1, distance: 1 }, 0.1, -0.05), viewBasis(o).fwd)) < 1e-15, 'drag: the camera moves in the picture\'s plane, not along the view');
}

console.log(failed === 0 ? 'orbit-camera: all green' : `orbit-camera: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
