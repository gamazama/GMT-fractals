/**
 * Guard: engine/animation/zoomPath.ts - a camera path whose scale changes by many decades.
 *
 * Node only. Every distance below is divided by the scale AT THAT MOMENT ("of the scale there"),
 * because that is what is seen: an error of 1e-40 is nothing at scale 1 and four views at 1e-41.
 *
 *   [1] a route of four keys (in, out and in again, uneven times, two headings) passes through
 *       its keys, with the closed-form scale and with the same scale handed in as a function;
 *   [2] its velocity is continuous at the keys, and a key with a heading is left along it;
 *   [3] the same keys in reverse order (times mirrored, headings negated) retrace it;
 *   [4] 30-degree steps round a point at one scale stay within 2.5 % of the circle;
 *   [5] a two-key leg of 30 decades ends EXACTLY on its deeper key, diving and climbing;
 *   [6] 77 decades: the numeric integral against the closed form, all along the leg;
 *   [7] a leg eased by the engine's own log-space Bezier against a brute-force sum;
 *   [8] one evaluation of a numeric leg costs under 50 microseconds;
 *   [9] orientation: through its keys, turning rate continuous at a key with uneven times, and
 *       two keys alone are the plain slerp (half the turn at half the time);
 *  [10] the on-screen length of a straight dive is its depth in e-folds;
 *  [11] a key whose scale is 0 does not throw (the path runs once a frame): the leg holds it;
 *  [12] a scale function rough in its last digits (float32 inside, say) still builds its leg in
 *       bounded time, and the path is right to that roughness.
 *
 * THE UNIT is 2^320 steps to 1.0, finer than an app's 256 bits, so that 1e-9 of the deepest
 * scale used here (1e-77) is still 2e10 steps. The path's arithmetic does not depend on it.
 *
 * Run: `npm run test:zoom-path`
 *
 * ── FALSIFIED 2026-10-11 ─────────────────────────────────────────────────
 *   Measuring from the SHALLOW key instead (in zoomPath.ts, `deepEnd: b.scale < a.scale` turned
 *   to `>`; the curve is the same, only the key it is written out from changes): 19 red of the
 *   30 checks [1]-[10] make.
 *   [5] the deep end of the 30-decade leg is 1.00 of the scale there off - the deep key's own
 *   1e-30 is below the last digit of a number near 1 and is simply gone - and one frame away it
 *   is 0.79 of a scale off instead of 0.23; [6] 1.5 scales off; [7] 1.0; [1] a key 0.26 off;
 *   [2] the velocity jumps by all of itself; [3] the reversed route 0.5 to 1.25 scales away.
 *   [4] [8] [9] [10] do not move: one scale, the clock's cost, orientation, a length.
 *   And without the no-scale guard (grep `L.I0 === Infinity` in zoomPath.ts): [11] red, "it threw".
 *   And without the panel budget (grep `MAX_PANELS` there, its clause set to `false`): [12] never
 *   returns - stopped by hand after 75 s, still building the rough leg (with it: 16 ms).
 */
import { buildZoomPath, zoomPathPosition, zoomPathOrientation, zoomLegOnScreen } from '../engine/animation/zoomPath';
import type { ZoomKey, ZoomPath, Vec3, Quat, FixedVec3 } from '../engine/animation/zoomPath';
import { AnimationMath } from '../engine/math/AnimationMath';
import type { Keyframe } from '../types';

const UNIT = 2 ** 320;
const BAR = 1e-9;                                    // of the scale there

let pass = 0;
const fails: string[] = [];
const show = (x: number): string => x.toExponential(2);
const ck = (name: string, ok: boolean, detail = ''): void => { if (ok) pass++; else fails.push(detail ? `${name}: ${detail}` : name); };

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const angleDeg = (a: Vec3, b: Vec3): number => Math.acos(Math.min(1, Math.max(-1, dot(a, b) / (len(a) * len(b))))) * 180 / Math.PI;
/** b - a in world units. */
const between = (a: FixedVec3, b: FixedVec3): Vec3 => [Number(b[0] - a[0]) / UNIT, Number(b[1] - a[1]) / UNIT, Number(b[2] - a[2]) / UNIT];
const moved = (p: FixedVec3, v: Vec3): FixedVec3 => [p[0] + BigInt(Math.round(v[0] * UNIT)), p[1] + BigInt(Math.round(v[1] * UNIT)), p[2] + BigInt(Math.round(v[2] * UNIT))];
const ring = (deg: number): Vec3 => [Math.cos(deg * Math.PI / 180), 0, Math.sin(deg * Math.PI / 180)];

/** A point all of whose 320 bits are in use, so a lost digit shows. */
const TARGET: FixedVec3 = [BigInt('0x' + '5a3c96e1'.repeat(10)), -BigInt('0x' + '1f0e2d4b'.repeat(10)), BigInt('0x' + '7b219c55'.repeat(10))];
/** A key `depth` away from the target, in direction `dir` from it. */
const at = (time: number, dir: Vec3, depth: number, heading?: Vec3): ZoomKey => ({ time, scale: depth, position: moved(TARGET, scl(dir, depth)), heading });

/** The log-linear scale between a route's keys: what the path uses when no `scaleAt` is given. */
const logLinear = (keys: readonly ZoomKey[]) => (t: number): number => {
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].time <= t) i++;
    const a = keys[i], b = keys[i + 1], x = Math.min(1, Math.max(0, (t - a.time) / (b.time - a.time)));
    return Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * x);
};
const off = (P: ZoomPath, t: number, from: FixedVec3): Vec3 => between(from, zoomPathPosition(P, t));

// ── [1] [2] [3]  a route: in to 1e-20, out to 1e-12 on another line, in again to 1e-28 ──
const route: ZoomKey[] = [
    at(0, ring(0), 1e-10),
    at(10, ring(20), 1e-20, [-0.6, 0.3, -0.74]),
    at(16, ring(60), 1e-12),
    at(30, ring(75), 1e-28, [0.2, -0.1, -0.97]),
];
const routeScale = logLinear(route);
const closedRoute = buildZoomPath(route, { unit: UNIT });
const numericRoute = buildZoomPath(route, { unit: UNIT, scaleAt: routeScale });

for (const [label, P] of [['closed form', closedRoute], ['scale as a function', numericRoute]] as const) {
    let worst = 0;
    route.forEach((k) => { worst = Math.max(worst, len(off(P, k.time, k.position)) / k.scale); });
    ck(`[1] ${label}: the route passes through its keys`, worst <= BAR, `a key is ${show(worst)} of the scale there off`);

    // The velocity either side of a key, from two points 1e-8 of a leg apart. That close because the
    // third key is where the route turns from out to in: the path bends hard there, and a wider
    // difference reads the bend as a jump (at 1e-6 of a leg it measured 1.1e-3).
    let worstJump = 0, worstAim = 0;
    for (let i = 1; i < route.length - 1; i++) {
        const k = route[i], hIn = 1e-8 * (k.time - route[i - 1].time), hOut = 1e-8 * (route[i + 1].time - k.time);
        const vIn = scl(between(zoomPathPosition(P, k.time - 2 * hIn), zoomPathPosition(P, k.time - hIn)), 1 / hIn);
        const vOut = scl(between(zoomPathPosition(P, k.time + hOut), zoomPathPosition(P, k.time + 2 * hOut)), 1 / hOut);
        worstJump = Math.max(worstJump, len(sub(vOut, vIn)) / len(vOut));
        if (k.heading) worstAim = Math.max(worstAim, angleDeg(vOut, k.heading));
    }
    ck(`[2] ${label}: velocity is continuous at the keys`, worstJump <= 1e-3, `it jumps by ${show(worstJump)} of itself`);
    ck(`[2] ${label}: a key with a heading is left along it`, worstAim <= 0.01, `${worstAim.toFixed(4)} degrees off the heading`);
    console.log(`[1] [2] ${label}: keys ${show(worst)} of the scale there off; velocity jump at a key ${show(worstJump)}; ${worstAim.toFixed(5)} degrees off a heading`);
}
{
    let worst = 0;
    for (let k = 0; k <= 600; k++) {
        const t = 30 * k / 600;
        worst = Math.max(worst, len(between(zoomPathPosition(closedRoute, t), zoomPathPosition(numericRoute, t))) / routeScale(t));
    }
    ck('[1] the numeric route is the closed-form route', worst <= BAR, `a position is ${show(worst)} of the scale there off`);

    const total = route[route.length - 1].time;
    const back = [...route].reverse().map((k): ZoomKey => ({ ...k, time: total - k.time, heading: k.heading && scl(k.heading, -1) }));
    for (const [label, F, B] of [
        ['closed form', closedRoute, buildZoomPath(back, { unit: UNIT })],
        ['scale as a function', numericRoute, buildZoomPath(back, { unit: UNIT, scaleAt: (t: number) => routeScale(total - t) })],
    ] as const) {
        let apart = 0;
        for (let k = 0; k <= 600; k++) {
            const t = total * k / 600;
            apart = Math.max(apart, len(between(zoomPathPosition(F, t), zoomPathPosition(B, total - t))) / routeScale(t));
        }
        ck(`[3] ${label}: the keys in reverse order retrace the route`, apart <= BAR, `a position is ${show(apart)} of the scale there off`);
    }
}

// ── [4]  four 30-degree steps round a point, every key 1e-30 from it ──
for (const [label, wobble] of [['one scale', 0], ['scales a billionth apart', 1e-9]] as const) {
    const R = 1e-30;
    const keys = [0, 30, 60, 90, 120].map((deg, j) => at(j * 2, ring(deg), R * (1 + wobble * j)));
    const P = buildZoomPath(keys, { unit: UNIT });
    let offCircle = 0;
    for (let k = 0; k <= 800; k++) offCircle = Math.max(offCircle, Math.abs(len(off(P, 8 * k / 800, TARGET)) / R - 1));
    ck(`[4] ${label}: 30-degree steps stay on the circle`, offCircle <= 0.025, `${(offCircle * 100).toFixed(2)} % off it`);
    console.log(`[4] ${label}: at most ${(offCircle * 100).toFixed(2)} % off the circle`);
}

// ── [5]  one leg of 30 decades ends exactly on its deeper key ──
for (const [label, shallowFirst] of [['diving', true], ['climbing', false]] as const) {
    const shallow = { scale: 1, position: moved(TARGET, [0.45, -0.2, 1]) }, deep = { scale: 1e-30, position: moved(TARGET, [0, 0, 1e-30]) };
    const keys: ZoomKey[] = shallowFirst ? [{ time: 0, ...shallow }, { time: 300, ...deep }] : [{ time: 0, ...deep }, { time: 300, ...shallow }];
    const deepTime = shallowFirst ? 300 : 0, scaleAt = logLinear(keys);
    for (const [how, P] of [['closed form', buildZoomPath(keys, { unit: UNIT })], ['scale as a function', buildZoomPath(keys, { unit: UNIT, scaleAt })]] as const) {
        const atDeep = len(off(P, deepTime, deep.position)) / deep.scale, atShallow = len(off(P, 300 - deepTime, shallow.position)) / shallow.scale;
        ck(`[5] ${label}, ${how}: the leg ends on its deeper key`, atDeep <= BAR, `the deep end is ${show(atDeep)} of the scale there off`);
        ck(`[5] ${label}, ${how}: and on its shallow key`, atShallow <= BAR, `the shallow end is ${show(atShallow)} of the scale there off`);
        // and it arrives there smoothly: one frame (a tenth of a decade) from the deep key it is 0.23 of a scale away
        const near = deepTime === 300 ? 299 : 1, gap = len(off(P, near, deep.position)) / scaleAt(near);
        ck(`[5] ${label}, ${how}: one frame from the deep key it is a fraction of a view away`, gap > 0.2 && gap < 0.26, `${show(gap)} of the scale there`);
    }
}

// ── [6]  77 decades: the numeric integral against the closed form ──
{
    const keys: ZoomKey[] = [at(0, ring(10), 1), at(770, ring(40), 1e-77, [0.1, 0.2, -0.97]), at(900, ring(70), 1e-70)];
    const scaleAt = logLinear(keys);
    const closedP = buildZoomPath(keys, { unit: UNIT }), numericP = buildZoomPath(keys, { unit: UNIT, scaleAt });
    let worst = 0, where = 0;
    for (let k = 0; k <= 3600; k++) {
        const t = 900 * k / 3600, e = len(between(zoomPathPosition(closedP, t), zoomPathPosition(numericP, t))) / scaleAt(t);
        if (e > worst) { worst = e; where = t; }
    }
    ck('[6] 77 decades: numeric against closed form', worst <= BAR, `at time ${where} a position is ${show(worst)} of the scale there off`);
    console.log(`[6] 77 decades, numeric against closed form: worst ${show(worst)} of the scale there`);
}

// ── [7]  eased by the engine's own log-space Bezier, against a brute-force sum ──
const easedA: Keyframe = { id: 'a', frame: 0, value: 1, interpolation: 'Bezier', rightTangent: { x: 100, y: 0 } };
const easedB: Keyframe = { id: 'b', frame: 300, value: 1e-30, interpolation: 'Bezier', leftTangent: { x: -100, y: 20 } };
const easedScale = (f: number): number => AnimationMath.interpolate(f, easedA, easedB, false, true);
const easedKeys: ZoomKey[] = [{ time: 0, scale: 1, position: moved(TARGET, [0.45, -0.2, 1]) }, { time: 300, scale: 1e-30, position: moved(TARGET, [0, 0, 1e-30]) }];
const easedPath = buildZoomPath(easedKeys, { unit: UNIT, scaleAt: easedScale });
{
    // Simpson's rule on 600 000 even steps, summed outwards from the deep key (smallest terms first)
    const N = 600000, h = 300 / N, fromDeep = new Float64Array(N / 2 + 1);
    let fRight = easedScale(300);
    for (let j = N / 2 - 1; j >= 0; j--) {
        const t = 2 * j * h, fLeft = easedScale(t), fMid = easedScale(t + h);
        fromDeep[j] = fromDeep[j + 1] + (h / 3) * (fLeft + 4 * fMid + fRight);
        fRight = fLeft;
    }
    // two keys and no heading: the curve is the straight chord, deep key + (shallow - deep) * share
    const dp = between(easedKeys[1].position, easedKeys[0].position);
    let worst = 0, where = 0;
    for (let j = 0; j <= N / 2; j += 250) {
        const t = 2 * j * h, want = scl(dp, fromDeep[j] / fromDeep[0]);
        const e = len(sub(off(easedPath, t, easedKeys[1].position), want)) / easedScale(t);
        if (e > worst) { worst = e; where = t; }
    }
    ck('[7] eased leg against a brute-force sum', worst <= BAR, `at frame ${where} a position is ${show(worst)} of the scale there off`);
    console.log(`[7] eased 30-decade leg against brute force: worst ${show(worst)} of the scale there`);
}

// ── [8]  the cost of one evaluation ──
{
    const N = 20000;
    zoomPathPosition(easedPath, 150);                                  // the leg's table is built on first use
    const t0 = performance.now();
    for (let k = 0; k < N; k++) zoomPathPosition(easedPath, 300 * ((k * 7919) % N) / N);
    const micros = (performance.now() - t0) / N * 1000;
    ck('[8] one evaluation of a numeric leg costs under 50 microseconds', micros < 50, `${micros.toFixed(1)} microseconds`);
    const fresh = buildZoomPath(easedKeys, { unit: UNIT, scaleAt: easedScale }), t1 = performance.now();
    zoomPathPosition(fresh, 150);
    console.log(`[8] ${micros.toFixed(2)} microseconds an evaluation; building the leg's table once: ${(performance.now() - t1).toFixed(2)} ms`);
}

// ── [9]  orientation ──
{
    const axisAngle = (axis: Vec3, deg: number): Quat => { const a = deg * Math.PI / 360, s = Math.sin(a) / len(axis); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(a)]; };
    const qmul = (a: Quat, b: Quat): Quat => [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
    /** The turn from a to b as a rotation vector (radians), in a's frame. */
    const turnBetween = (a: Quat, b: Quat): Vec3 => {
        const d = qmul([-a[0], -a[1], -a[2], a[3]], b), s = d[3] < 0 ? -1 : 1, v = Math.hypot(d[0], d[1], d[2]);
        const k = v < 1e-15 ? 2 * s : 2 * s * Math.atan2(v, s * d[3]) / v;
        return [d[0] * k, d[1] * k, d[2] * k];
    };
    const turns = [
        { time: 0, orientation: axisAngle([0, 1, 0], 0) },
        { time: 4, orientation: axisAngle([0, 1, 0.3], 70) },
        { time: 5, orientation: qmul(axisAngle([0, 1, 0.3], 70), axisAngle([1, 0, 0], -40)) },
        { time: 12, orientation: qmul(axisAngle([0.2, 1, 0], 160), axisAngle([0, 0, 1], 25)) },
    ];
    let worstKey = 0, worstRate = 0;
    turns.forEach((k) => { worstKey = Math.max(worstKey, len(turnBetween(k.orientation, zoomPathOrientation(turns, k.time)))); });
    for (let i = 1; i < turns.length - 1; i++) {
        const t = turns[i].time, h = 1e-5;
        const before = scl(turnBetween(zoomPathOrientation(turns, t - 2 * h), zoomPathOrientation(turns, t - h)), 1 / h);
        const after = scl(turnBetween(zoomPathOrientation(turns, t + h), zoomPathOrientation(turns, t + 2 * h)), 1 / h);
        worstRate = Math.max(worstRate, len(sub(after, before)) / len(after));
    }
    ck('[9] the orientation passes through its keys', worstKey <= 1e-12, `${show(worstKey)} radians off`);
    ck('[9] the turning rate is continuous at the keys', worstRate <= 1e-3, `it jumps by ${show(worstRate)} of itself`);
    const two = [turns[0], { time: 10, orientation: axisAngle([0.3, 1, -0.2], 130) }];
    const whole = turnBetween(two[0].orientation, two[1].orientation), half = turnBetween(two[0].orientation, zoomPathOrientation(two, 5));
    ck('[9] two keys alone are the slerp: half the turn at half the time', len(sub(scl(whole, 0.5), half)) <= 1e-12, `${show(len(sub(scl(whole, 0.5), half)))} radians off`);
}

// ── [10]  the on-screen length of a straight dive is its depth in e-folds ──
{
    const a = at(0, ring(33), 1e-3), b = at(1, ring(33), 1e-20), want = Math.log(1e17);
    const got = zoomLegOnScreen(a, b, UNIT);
    ck('[10] a straight dive of 17 decades is 39.14 e-folds on screen', Math.abs(got / want - 1) <= 1e-9, `${got} against ${want}`);
}

// ── [11]  a leg with no usable scale holds its deeper key ──
{
    const keys: ZoomKey[] = [at(0, ring(0), 1e-3), { ...at(10, ring(5), 1e-9), scale: 0 }];
    let got: FixedVec3 | null = null;
    try { got = zoomPathPosition(buildZoomPath(keys, { unit: UNIT }), 5); } catch { got = null; }
    ck('[11] a key whose scale is 0 does not throw: the leg holds that key', !!got && got.every((v, j) => v === keys[1].position[j]), got ? 'it is somewhere else' : 'it threw');
}

// ── [12]  a scale function that is rough in its last digits still builds, and is as right as it can be ──
{
    const keys: ZoomKey[] = [{ time: 0, scale: 1, position: moved(TARGET, [0.45, -0.2, 1]) }, { time: 300, scale: 1e-30, position: moved(TARGET, [0, 0, 1e-30]) }];
    const smooth = logLinear(keys), rough = (t: number): number => (t <= 0 || t >= 300 ? smooth(t) : smooth(t) * (1 + 1e-7 * Math.sin(1e9 * t)));
    const exactP = buildZoomPath(keys, { unit: UNIT }), roughP = buildZoomPath(keys, { unit: UNIT, scaleAt: rough });
    const t0 = performance.now();
    zoomPathPosition(roughP, 150);
    const ms = performance.now() - t0;
    let worst = 0;
    for (let k = 1; k < 300; k++) worst = Math.max(worst, len(between(zoomPathPosition(exactP, k), zoomPathPosition(roughP, k))) / smooth(k));
    ck('[12] a scale rough at 1e-7 builds its leg in bounded time', ms < 2000, `${ms.toFixed(0)} ms`);
    ck('[12] ...and the path is right to the roughness', worst <= 1e-5, `a position is ${show(worst)} of the scale there off`);
    console.log(`[12] a scale rough at 1e-7: the leg's table in ${ms.toFixed(1)} ms, positions ${show(worst)} of the scale there from the smooth path`);
}

if (fails.length > 0) {
    console.error(`\n${fails.length} failed (${pass} passed):`);
    for (const f of fails) console.error('  FAIL: ' + f);
    process.exit(1);
}
console.log(`\nzoom-path: ${pass} checks passed`);
