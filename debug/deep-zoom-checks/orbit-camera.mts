/**
 * orbit-camera check: Orbit mode's three moves as displacements (`deep-zoom/orbitCamera.ts`).
 * Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/orbit-camera.mts        (npm run check:deep-zoom-orbit-camera)
 *
 * The camera here is a plain point in doubles and the pivot a point in front of it; every move is
 * applied by adding it. That is all the real renderer does with a move too (it adds it to a
 * 256-bit position), so what holds here for a pivot at 1e-60 holds there. The renderer's basis is
 * copied from `function basis()` in deep-zoom/renderer/core.js, so the "ray:" lines compare the
 * module against the renderer's own formula and not against itself.
 *
 * FALSIFICATION RECORD, 2026-10-09, one break per run in deep-zoom/orbitCamera.ts:
 *   - `orbitTurn`: `before[0] - after[0]` -> `after[0] - before[0]`      -> 4 red (the three "turn: the pivot stays ..." lines and the pitch-limit one: 9 picture heights off)
 *   - `orbitTurn`: the pitch not clamped                                 -> 1 red ("turn: at the pitch limit ...": pitch 1.9)
 *   - `DZ_FOV_SCALE`: `Math.tan(0.5 * 1.1)` -> `Math.tan(0.5)`            -> 1 red ("ray: a point of the picture ... the renderer's own formula")
 *   - `orbitZoom`: `(1 - factor)` -> `factor`                             -> 3 red (all three "zoom:" lines)
 *   - `orbitDrag`: `-depth` -> `depth`                                    -> 1 red ("drag: the pivot lands under the dragged point")
 *   - `orbitDrag`: `depth` -> `pivot.distance` (no correction off-centre) -> 1 red (the same line: 0.015 picture heights off)
 */
import { DZ_FOV_SCALE, DZ_PITCH_LIMIT, orbitDrag, orbitTurn, orbitZoom, viewBasis, viewRay } from '../../deep-zoom/orbitCamera.ts';
import type { OrbitPivot, V3 } from '../../deep-zoom/orbitCamera.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

/** `function basis()` of deep-zoom/renderer/core.js, and its ray: `normalize(fwd + tan(0.55) (u right + v up))`. */
function rendererRay(yaw: number, pitch: number, u: number, v: number): V3 {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const fwd: V3 = [cp * cy, sp, cp * sy];
    const right: V3 = [Math.cos(yaw + Math.PI / 2), 0, Math.sin(yaw + Math.PI / 2)];
    const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const f = Math.tan(0.5 * 1.1);
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
function seen(camera: V3, yaw: number, pitch: number, point: V3): { u: number; v: number; distance: number } {
    const { fwd, right, up } = viewBasis(yaw, pitch);
    const rel = sub(point, camera), z = dot(rel, fwd);
    return { u: dot(rel, right) / z / DZ_FOV_SCALE, v: dot(rel, up) / z / DZ_FOV_SCALE, distance: len(rel) };
}
/** A fixed sequence of numbers in 0..1 (no Math.random: the same cases every run). */
let seed = 12345;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// ── ray ──
{
    let worst = 0;
    for (let i = 0; i < 200; i++) {
        const yaw = (rnd() - 0.5) * 14, pitch = (rnd() - 0.5) * 3, u = (rnd() - 0.5) * 1.7, v = rnd() - 0.5;
        const a = viewRay(yaw, pitch, u, v), b = rendererRay(yaw, pitch, u, v);
        worst = Math.max(worst, len(sub(a, b)));
    }
    check(worst < 1e-14, "ray: a point of the picture gives the direction of the renderer's own formula, at 200 looks", `worst ${worst.toExponential(2)}`);
    const centre = viewRay(1.14, 0.29, 0, 0), b = viewBasis(1.14, 0.29);
    check(len(sub(centre, b.fwd)) < 1e-15, 'ray: the middle of the picture is the view axis');
}

// ── turn: the pivot stays where it is in the picture, at its distance ──
function turnError(distance: number, steps: number): { where: number; far: number } {
    let where = 0, far = 0;
    for (let i = 0; i < 200; i++) {
        let yaw = (rnd() - 0.5) * 14, pitch = (rnd() - 0.5) * 2.4;
        const pivot: OrbitPivot = { u: (rnd() - 0.5) * 1.7, v: rnd() - 0.5, distance };
        const dYaw = (rnd() - 0.5) * 1.2 / steps, dPitch = (rnd() - 0.5) * 0.6 / steps;
        let camera: V3 = [0, 0, 0];
        const point = scl(viewRay(yaw, pitch, pivot.u, pivot.v), distance);
        for (let s = 0; s < steps; s++) {
            const t = orbitTurn(yaw, pitch, pivot, dYaw, dPitch);
            camera = add(camera, t.move); yaw = t.yaw; pitch = t.pitch;
        }
        const now = seen(camera, yaw, pitch, point);
        where = Math.max(where, Math.hypot(now.u - pivot.u, now.v - pivot.v));
        far = Math.max(far, Math.abs(now.distance / distance - 1));
    }
    return { where, far };
}
{
    const one = turnError(1, 1);
    check(one.where < 1e-12 && one.far < 1e-12, 'turn: the pivot stays at its point of the picture and its distance, for 200 pivots, looks and turns', `moved ${one.where.toExponential(2)} picture heights, distance off by ${one.far.toExponential(2)}`);
    const deep = turnError(3e-60, 1);
    check(deep.where < 1e-12 && deep.far < 1e-12, 'turn: the same with the pivot 3e-60 away', `moved ${deep.where.toExponential(2)}, distance off by ${deep.far.toExponential(2)}`);
    const long = turnError(3e-60, 1000);
    check(long.where < 1e-9 && long.far < 1e-9, 'turn: the pivot stays put through a drag of 1000 small steps (nothing drifts)', `moved ${long.where.toExponential(2)}, distance off by ${long.far.toExponential(2)}`);
    // at the pitch limit the angle is clamped, and the move is the one for the clamped angle
    const pivot: OrbitPivot = { u: 0.3, v: -0.2, distance: 2 };
    const t = orbitTurn(0.4, 1.5, pivot, 0, 0.4);
    const point = scl(viewRay(0.4, 1.5, pivot.u, pivot.v), 2);
    const now = seen(t.move, t.yaw, t.pitch, point);
    check(t.pitch === DZ_PITCH_LIMIT && Math.hypot(now.u - pivot.u, now.v - pivot.v) < 1e-12, 'turn: at the pitch limit the pitch stops there and the pivot still stays put', `pitch ${t.pitch}, moved ${Math.hypot(now.u - pivot.u, now.v - pivot.v).toExponential(2)}`);
    const none = orbitTurn(0.4, 0.2, pivot, 0, 0);
    check(len(none.move) === 0 && none.yaw === 0.4 && none.pitch === 0.2, 'turn: no turn, no move');
    // a pivot at distance 0 is a look in place
    check(len(orbitTurn(0.4, 0.2, { u: 0, v: 0, distance: 0 }, 0.3, 0.1).move) === 0, 'turn: with no distance to the pivot it is a look in place');
}

// ── zoom ──
{
    const pivot: OrbitPivot = { u: -0.4, v: 0.25, distance: 5e-41 };
    const ray = viewRay(2.2, -0.7, pivot.u, pivot.v), point = scl(ray, pivot.distance);
    const z = orbitZoom(2.2, -0.7, pivot, 0.86);
    const now = seen(z.move, 2.2, -0.7, point);
    check(Math.abs(len(z.move) / (0.14 * pivot.distance) - 1) < 1e-12 && len(sub(scl(z.move, 1 / len(z.move)), ray)) < 1e-12,
        'zoom: a factor of 0.86 moves 14 % of the distance, along the pivot\'s ray');
    check(Math.abs(z.distance / (0.86 * pivot.distance) - 1) < 1e-12 && Math.abs(now.distance / z.distance - 1) < 1e-12 && Math.hypot(now.u - pivot.u, now.v - pivot.v) < 1e-12,
        'zoom: the pivot is then 0.86 of the distance away, at the same point of the picture', `${now.distance}, ${now.u}, ${now.v}`);
    const back = orbitZoom(2.2, -0.7, pivot, 1.25);
    check(dot(back.move, ray) < 0 && Math.abs(back.distance / (1.25 * pivot.distance) - 1) < 1e-12, 'zoom: a factor above 1 backs away along the same ray');
}

// ── drag ──
{
    let worst = 0;
    for (let i = 0; i < 100; i++) {
        const yaw = (rnd() - 0.5) * 14, pitch = (rnd() - 0.5) * 2.4;
        const pivot: OrbitPivot = { u: (rnd() - 0.5) * 1.5, v: (rnd() - 0.5) * 0.9, distance: 7e-33 };
        const du = (rnd() - 0.5) * 0.3, dv = (rnd() - 0.5) * 0.3;
        const point = scl(viewRay(yaw, pitch, pivot.u, pivot.v), pivot.distance);
        const now = seen(orbitDrag(yaw, pitch, pivot, du, dv), yaw, pitch, point);
        worst = Math.max(worst, Math.hypot(now.u - (pivot.u + du), now.v - (pivot.v + dv)));
    }
    check(worst < 1e-12, 'drag: the pivot lands under the dragged point, for 100 pivots and drags', `worst ${worst.toExponential(2)} picture heights off`);
    const { fwd } = viewBasis(0.3, 0.2);
    check(Math.abs(dot(orbitDrag(0.3, 0.2, { u: 0.2, v: 0.1, distance: 1 }, 0.1, -0.05), fwd)) < 1e-15, 'drag: the camera moves in the picture\'s plane, not along the view');
}

console.log(failed === 0 ? 'orbit-camera: all green' : `orbit-camera: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
