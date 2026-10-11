/**
 * box-orbit check: the Mandelbox's per-pixel orbit on the CPU (`boxOrbitJS`, reached through
 * `pertOrbitJS`; grep THE FORMULA SEAM in deep-zoom/renderer/core.js) against exact fixed-point
 * orbits of the same points. Node only: no browser, no GPU, a few seconds.
 *
 *   npx tsx debug/deep-zoom-checks/box-orbit.mts        (npm run check:deep-zoom-box-orbit)
 *
 * WHAT IS UNDER TEST. The renderer draws a pixel as the camera's own orbit (fixed point, built by
 * `buildBoxOrbit`) plus a delta. Where the pixel stands on the other side of a fold from the camera's
 * orbit the delta step goes by cases. This check runs that step on points from 1e-59 to 30 units
 * from the camera and compares the distance estimate, the escape flag and the iteration count with
 * an orbit of the explicit point. The same function is what `api.dz.sense`, `freeDistance` and
 * `estimateAt` march on, and what the GPU probes are refereed against.
 *
 * THE REFEREE shares no code with it: its own fixed-point arithmetic, the map written as GMT's
 * shader writes it (engine-gmt/formulas/AmazingBox.ts: `clamp(z, -L, L) * 2 - z`, then
 * `k = clamp(fixedR2 / r2, 1, fixedR2 / minR2)`), no reference orbit, no delta, no regions. For the
 * views with a pre-rotation it is handed the renderer's matrix (at depth two matrices that differ
 * in the 16th digit are two different fractals); the matrix itself is checked against the shader's
 * three rotations at a shallow view.
 *
 * HOW IT REACHES THE CODE: as ray-probe.mts does - two spans of core.js lifted as TEXT and run with
 * the few names they close over. It throws if a span's first or last words are gone.
 *
 * PLACES are found here, by the referee alone: its estimate marched down a ray from outside the box,
 * half of itself a step, in fixed point, until it reads the wanted depth. The iteration cap is the
 * camera orbit's own escape plus 9 plus the margin the CPU study measured (24 at scale 2, 44 at -1.5;
 * debug/scratch/formula-study/box-still.mjs).
 *
 * FALSIFICATION RECORD, 2026-10-09, one break per run in deep-zoom/renderer/core.js (19 breaks, 19 red):
 *   `boxFoldJS`, the reference between the planes:
 *     - the pixel past +L: `pr === 1 ? -gh` -> `? d`                       -> 6 red (5 deep views + "ray: and where it ends")
 *     - the pixel past -L: `: -gl` -> `: d`                                -> 5 red (the deep views)
 *   `boxFoldJS`, the reference past a plane:
 *     - past +L, the pixel between: `pr === 0 ? ph` -> `? d`               -> 8 red
 *     - past +L, the pixel past -L: `-L2` -> `0`                           -> 7 red (from outside: 414 counts differ at scale 2)
 *     - past -L, the pixel between: `pr === 0 ? pl` -> `? d`               -> 5 red
 *   `boxOrbitJS`, the sphere fold, reference region / pixel region:
 *     - shell / shell: `-F2 * q / (r2 * r2p)` -> 0                         -> 5 red (1012 of 1134 estimates at scale 2, 1e-41)
 *     - inside minR / shell: `-F2 * pm / (r2p * m2)` -> 0                  -> 1 red (the rotated deep view: 2 counts differ)
 *     - inside minR / outside fixedR: `1 - kA` -> 0                        -> 1 red (the rotated deep view)
 *     - shell / inside minR: `F2 * gm / (m2 * r2)` -> 0                    -> 3 red
 *     - shell / outside: `gF / r2` -> 0                                    -> 5 red
 *     - outside / shell: `-pF / r2p` -> 0                                  -> 8 red
 *     - outside / inside minR: `kA - 1` -> 0                               -> 6 red
 *   `boxOrbitJS`, the rest:
 *     - the rotation of the delta left out (`if (R)` -> `if (false)`)      -> 2 red (both rotated views)
 *     - the rebase left out (the `z2 < ...` half of its test)              -> 1 red (scale -1.7 at 1e-30: one estimate 2.6e-5 off)
 *     - `dr = dr * kp * aS + 1` without `kp`                               -> 8 red (every view)
 *   `buildBoxOrbit` / `makeHP`:
 *     - the fold distances as f64 differences (`hp.toNum(q.u[a]) - p.fold`) -> 2 red ("... from the fold plane x = L": 474 and 421 estimates)
 *     - the sphere distances as f64 differences (`hp.toNum(q.r2) - p.m2`)   -> 1 red ("... |z|² - fixedR² ... at the first fold")
 *       Until section 4b was added both of these stayed GREEN: no ordinary place has its reference within 1e-16 of a fold surface.
 *     - `kA: fdiv(F2, m2)` -> `fromNum(p.kA)` (the f64 quotient)             -> 1 red (the rotated deep view: all 1133 counts differ)
 *     - `boxParts`: the inversion shell's `fdiv(B.F2, r2)` left out          -> 8 red
 *   The counts above are from the first pass. All 19 were run again after section 4b moved to 1e-50 (the same places
 *   then serve the GPU's proof, debug/deep-zoom-direct-check.mts): 19 red again, most with two or three lines more
 *   (the three places of 4b cross folds too).
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

const TOL = 1e-6, FINE = 1e-6;
type V3 = [number, number, number];
interface BoxParams { scale?: number; minR?: number; fold?: number; fixedR?: number; rot?: number[] }
interface Orbit { len: number; Rk: number[]; DRk: number[]; box?: { R: number[][]; hasRot: boolean } }
interface Twin { de: number; escaped: boolean; r: number; it: number }
interface Sense { near: number; second: number; hits: number; open: number; inside: boolean; marched: boolean }
interface Lib {
    hp: { fromNum(x: number): bigint; toNum(v: bigint): number };
    buildRefOrbit(cam: bigint[], lenMax: number): Orbit;
    pertOrbitJS(O: Orbit, dc: V3, maxIter: number, fixed?: boolean): Twin;
    rayFreeJS(O: Orbit, rd: V3, maxIter: number, tol: number, maxSteps: number): { t: number; kind: number; steps: number };
    senseBundle(axis: V3 | null, opt?: { slot?: string }): Sense;
    applyFormula(kind: string, params?: BoxParams): boolean;
    boxFar(): number;
    formula(): string;
    setCam(c: bigint[], iters: number, yaw: number, pitch: number): void;
}

// ── lift the spans (the same four ray-probe.mts lifts) ──
const core = readFileSync(new URL('../../deep-zoom/renderer/core.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function cut(from: string, to: string, keepEnd = false): string {
    const a = core.indexOf(from), b = a < 0 ? -1 : core.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error(`deep-zoom/renderer/core.js no longer holds "${from}" .. "${to}": this check lifts that span as text`);
    return core.slice(a, keepEnd ? b + to.length : b);
}
const lib = new Function(`"use strict";
    let nPower = 8, phaseTheta = 0, phasePhi = 0;
    let curOrbit = null, deepActive = false, orbitDirty = true;
    const cam = { iters: 14, yaw: 0, pitch: 0 };
    let camHP = [0n, 0n, 0n];
    ${cut('const binom = (n) =>', '\n')}
    ${cut('function basis(){', '\n}\n', true)}
    ${cut('function makeHP(P) {', '/* ════════ uniforms set before each deep draw')}
    ${cut('/* ════════ CPU f64 perturbed march', '/* probe FBO: 1×1 RGBA32F readback')}
    return { hp, buildRefOrbit, pertOrbitJS, rayFreeJS, senseBundle, applyFormula, boxFar, formula: () => dzFormula,
        setCam: (c, iters, yaw, pitch) => { camHP = c.slice(); cam.iters = iters; cam.yaw = yaw; cam.pitch = pitch; } };
`)() as Lib;

// ── the referee: its own fixed point, GMT's shader text as written ──
const PB = 256n, ONE = 1n << PB, SC = 2 ** 256;
const mul = (a: bigint, b: bigint): bigint => (a * b) >> PB;
const div = (a: bigint, b: bigint): bigint => (a << PB) / b;
/** An f64 as fixed point, exactly (every bit of its mantissa that lies above 2^-256). */
function fix(x: number): bigint {
    if (x === 0) return 0n;
    const neg = x < 0, a = Math.abs(x);
    let e = Math.floor(Math.log2(a));
    while (a / 2 ** e >= 2) e++;
    while (a / 2 ** e < 1) e--;
    const m = BigInt(a / 2 ** (e - 52)), sh = 256 + e - 52;
    const v = sh >= 0 ? m << BigInt(sh) : m >> BigInt(-sh);
    return neg ? -v : v;
}
const num = (v: bigint): number => Number(v) / SC;
interface Fixed { S: bigint; aS: number; L: bigint; m2: bigint; F2: bigint; kMax: bigint; R: bigint[][] | null }
function fixedParams(p: Required<BoxParams>, R: number[][] | null): Fixed {
    const m2 = fix(p.minR * p.minR), F2 = fix(p.fixedR * p.fixedR);
    return { S: fix(p.scale), aS: Math.abs(p.scale), L: fix(p.fold), m2, F2, kMax: div(F2, m2), R: R ? R.map((r) => r.map(fix)) : null };
}
function exactStep(z: bigint[], c: bigint[], F: Fixed): { z: bigint[]; k: bigint } {
    const u = F.R ? F.R.map((r) => mul(r[0], z[0]) + mul(r[1], z[1]) + mul(r[2], z[2])) : z;
    const w = u.map((x) => { const cl = x > F.L ? F.L : x < -F.L ? -F.L : x; return 2n * cl - x; });       // clamp(z, -L, L) * 2 - z
    const r2 = mul(w[0], w[0]) + mul(w[1], w[1]) + mul(w[2], w[2]);
    let k = r2 === 0n ? F.kMax : div(F.F2, r2);                                                              // clamp(fixedR2 / r2, 1, fixedR2 / minR2)
    if (k < ONE) k = ONE;
    if (k > F.kMax) k = F.kMax;
    return { z: w.map((x, i) => mul(mul(x, k), F.S) + c[i]), k };
}
function exactOrbit(pos: bigint[], cap: number, F: Fixed): Twin {
    let z = pos.slice(), dr = 1, it = 0, escaped = false, z2 = 0;
    while (it < cap) {
        const s = exactStep(z, pos, F);
        z = s.z; dr = dr * num(s.k) * F.aS + 1; it++;
        z2 = num(mul(z[0], z[0]) + mul(z[1], z[1]) + mul(z[2], z[2]));
        if (z2 > 1e6) { escaped = true; break; }
    }
    const r = Math.sqrt(z2);
    return { de: (r - 1) / dr, escaped, r, it };
}
/** The iteration on which the orbit of `pos` escapes, -1 if not within `cap`. */
const escapesOn = (pos: bigint[], cap: number, F: Fixed): number => { const o = exactOrbit(pos, cap, F); return o.escaped ? o.it : -1; };

// ── places ──
const unit = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
interface Place { cam: bigint[]; fwd: V3; D: number; cap: number; ownEscape: number }
/** A camera whose exact estimate reads `depth`, looking at the surface: the referee's estimate marched down a ray
 *  from outside, half of itself a step, in fixed point. Null when the ray leaves the box or steps into the solid. */
function findPlace(F: Fixed, from: number[], aim: number[], depth: number, margin: number): Place | null {
    const fwd = unit(aim.map((x, i) => x - from[i]));
    let pos = from.map(fix), gone = 0;
    for (let s = 0; s < 6000 && gone < 60; s++) {
        const o = exactOrbit(pos, 900, F);
        if (!o.escaped || !(o.de > 0) || o.de < 0.02 * depth) return null;
        if (o.de <= depth) return { cam: pos, fwd, D: o.de, cap: o.it + 9 + margin, ownEscape: o.it };
        pos = pos.map((c, j) => c + fix(0.5 * o.de * fwd[j]));
        gone += 0.5 * o.de;
    }
    return null;
}

// ── one view: a cone of rays, a ladder of distances on each, twin against exact ──
/* WHICH POINTS ARE GATED. Rounding in f64 is 1e-16 of the delta while the delta is small, and from where the pixel's
   orbit has left the reference it grows with the map: by the time the orbit escapes it has grown by about
   1000 t / de (t = the point's distance from the camera, de = its estimate). So a point whose estimate is under
   FINE of its own distance - or whose orbit never escapes - is beyond what f64 can settle: seen at scale 2, 13 such
   points of 832, orbits that ran 25 to 33 iterations on after the camera's own escaped, the worst 8 % off, and at
   scale -1.5 one of 1134 whose escape flag differed. Such a point is a hit at every detail setting. The two orbits
   must still AGREE that it is one (`kindMis`); beyond that it is counted, not gated. */
interface Tally { n: number; gated: number; kindMis: number; countMis: number; worst: number; over: number; fine: number; fineOff: number }
function compare(O: Orbit, camFix: bigint[], fwd: V3, reach: number, cap: number, F: Fixed, tMin: number): Tally {
    const right = unit(cross(fwd, Math.abs(fwd[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), up = cross(right, fwd);
    const T: Tally = { n: 0, gated: 0, kindMis: 0, countMis: 0, worst: 0, over: 0, fine: 0, fineOff: 0 };
    const G = 9, STEPS = 14;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
        const a = (x + 0.5 - G / 2) / G, b = (y + 0.5 - G / 2) / G;
        const rd = unit([0, 1, 2].map((j) => fwd[j] + a * right[j] + b * up[j]));
        for (let s = 0; s < STEPS; s++) {
            const t = tMin * Math.pow(reach / tMin, s / (STEPS - 1)), dc: V3 = [rd[0] * t, rd[1] * t, rd[2] * t];
            const tw = lib.pertOrbitJS(O, dc, cap), ex = exactOrbit(camFix.map((c, j) => c + fix(dc[j])), cap, F);
            T.n++;
            const exFine = !ex.escaped || ex.de < FINE * t, twFine = !tw.escaped || tw.de < FINE * t;
            if (exFine !== twFine && !(Math.abs(tw.de - ex.de) < TOL * Math.abs(ex.de))) { T.kindMis++; continue; }   // (an estimate right on the line may fall either side)
            if (exFine) { T.fine++; if (tw.escaped !== ex.escaped || tw.it !== ex.it || !(Math.abs(tw.de - ex.de) < TOL * Math.abs(ex.de))) T.fineOff++; continue; }
            T.gated++;
            if (tw.it !== ex.it) { T.countMis++; continue; }
            const rel = Math.abs(tw.de - ex.de) / Math.abs(ex.de);
            if (rel > T.worst) T.worst = rel;
            if (!(rel < TOL)) T.over++;
        }
    }
    return T;
}
const full = (p: BoxParams): Required<BoxParams> => ({ scale: 2, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0], ...p });
function enter(p: BoxParams): { P: Required<BoxParams>; R: number[][] | null; F: Fixed } {
    const P = full(p);
    lib.applyFormula('mandelbox', P);
    const probe = lib.buildRefOrbit([fix(3), fix(2), fix(1)], 3), R = probe.box && probe.box.hasRot ? probe.box.R : null;
    return { P, R, F: fixedParams(P, R) };
}
const say = (T: Tally): string => `${T.n} points, ${T.gated} gated: ${T.kindMis} read differently, ${T.countMis} iteration counts differ, ${T.over} estimates over ${TOL.toExponential(0)} (worst ${T.worst.toExponential(1)})`
    + `; ${T.fine} in a crevice or inside, not gated` + (T.fineOff ? ` (${T.fineOff} of them differ)` : '');
const good = (T: Tally): boolean => T.gated >= 0.2 * T.n && T.kindMis === 0 && T.countMis === 0 && T.over === 0;

// 1. the seam itself
check(lib.formula() === 'mandelbulb', 'seam: the formula starts as the bulb');
check(lib.applyFormula('mandelbox', { scale: -1.5 }) === true && lib.formula() === 'mandelbox', 'seam: selecting the box reports a change');
check(lib.applyFormula('mandelbox', { scale: -1.5 }) === false, 'seam: the same formula and parameters again report none');
{ const O = lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20); check(!!O.box, 'seam: an orbit built with the box selected carries its formula'); }
check(lib.applyFormula('mandelbulb') === true, 'seam: back to the bulb');
{ const O = lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20); check(!O.box, 'seam: and the bulb\'s orbit carries none'); }

// 2. from outside: deltas the size of the box, every jump across both planes of a fold and both spheres
for (const [name, p, camPos] of [
    ['scale 2', { scale: 2 }, [15.3, 11.6, 9.9]],
    ['scale -1.5', { scale: -1.5 }, [6.56, 4.99, 4.27]],
    ['scale 2.566 with GMT\'s default pre-rotation', { scale: 2.566, minR: 1.026, fold: 1.445, fixedR: 1.637, rot: [3.14, 0, 1.57] }, [9.5, 7.3, 6.1]],
] as Array<[string, BoxParams, number[]]>) {
    const { F } = enter(p), camFix = camPos.map(fix), fwd = unit(camPos.map((x) => -x)), dist = Math.hypot(camPos[0], camPos[1], camPos[2]);
    const O = lib.buildRefOrbit(camFix, 62), T = compare(O, camFix, fwd, 1.6 * dist, 60, F, 0.02 * dist);
    check(good(T), `twin = exact, ${name}, the whole box from ${dist.toFixed(1)} away: ${say(T)}`);
}

// 3. the pre-rotation is the shader's three rotations, in its order
{
    const { P, R } = enter({ scale: 2.566, minR: 1.026, fold: 1.445, fixedR: 1.637, rot: [0.7, -0.4, 1.1] });
    const sx = Math.sin(P.rot[0]), cx = Math.cos(P.rot[0]), sy = Math.sin(P.rot[1]), cy = Math.cos(P.rot[1]), sz = Math.sin(P.rot[2]), cz = Math.cos(P.rot[2]);
    const v = [0.31, -0.72, 0.55];
    let y = cx * v[1] + sx * v[2], z = -sx * v[1] + cx * v[2], x = v[0];        // z3.yz = mat2(cx, -sx, sx, cx) * z3.yz   (column-major)
    { const nx = cy * x + sy * z, nz = -sy * x + cy * z; x = nx; z = nz; }      // z3.xz = mat2(cy, -sy, sy, cy) * z3.xz
    { const nx = cz * x + sz * y, ny = -sz * x + cz * y; x = nx; y = ny; }      // z3.xy = mat2(cz, -sz, sz, cz) * z3.xy
    const m = R ? R.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) : v, err = Math.hypot(m[0] - x, m[1] - y, m[2] - z);
    check(!!R && err < 1e-14, 'rotation: the matrix is the shader\'s X, then Y, then Z rotation', `off by ${err.toExponential(1)}`);
}

// 4. at depth: the delta is 1e-20 to 1e-58 of the reference, and only the last iterations part from it.
//    name, parameters, where the ray starts, what it is aimed at, the depth, the margin of iterations above the camera's own escape
const deep: Array<[string, BoxParams, number[], number[], number, number]> = [
    ['scale 2', { scale: 2 }, [15.3, 11.6, 9.9], [0.4, 0.3, -0.2], 1e-41, 24],
    ['scale -1.5', { scale: -1.5 }, [6.56, 4.99, 4.27], [0.2, 0.1, -0.1], 3e-20, 44],
    ['scale -1.5', { scale: -1.5 }, [6.56, 4.99, 4.27], [0.2, 0.1, -0.1], 1e-58, 44],
    ['scale -1.7, min radius 0.35, fold 0.9, fixed radius 1.2', { scale: -1.7, minR: 0.35, fold: 0.9, fixedR: 1.2 }, [5.1, -4.2, 3.3], [0.1, 0.2, 0.1], 1e-30, 40],
    ['scale 2.566 with GMT\'s default pre-rotation', { scale: 2.566, minR: 1.026, fold: 1.445, fixedR: 1.637, rot: [3.14, 0, 1.57] }, [9.5, 7.3, 6.1], [0.3, -0.2, 0.4], 1e-25, 24],
];
let lastDeep: { place: Place; F: Fixed } | null = null;
for (const [name, p, from, aim, depth, margin] of deep) {
    const { F } = enter(p), place = findPlace(F, from, aim, depth, margin);
    if (!place) { check(false, `twin = exact, ${name}, at depth ${depth.toExponential(0)}: no place found`); continue; }
    const O = lib.buildRefOrbit(place.cam, place.cap + 2), T = compare(O, place.cam, place.fwd, 8 * place.D, place.cap, F, 0.01 * place.D);
    check(good(T), `twin = exact, ${name}, ${place.D.toExponential(1)} from the surface (own orbit escapes on ${place.ownEscape}, cap ${place.cap}): ${say(T)}`);
    if (name === 'scale -1.5' && depth < 1e-50) lastDeep = { place, F };
}

// 4b. the camera 0.3 of its depth from a fold surface: the reference's distance to that surface is then far below
//     f64's reach as a difference of two numbers of size 1 (1 + 3e-51 is 1), and half the rays cross it at iteration 0
{
    // 1e-50: below what a plain f32 holds too, so the same places serve the GPU's proof (debug/deep-zoom-direct-check.mts
    // carries the scale-2 one as data; BOX_PRINT_PLACES=1 prints them in the form it takes)
    const depth = 1e-50;
    for (const [name, p, from, aim] of [
        ['scale 2', { scale: 2 }, [1, 9, 7.5], [1, 0.3, -0.2]],
        ['scale -1.5', { scale: -1.5 }, [1, 4.2, 3.6], [1, 0.2, -0.1]],
    ] as Array<[string, BoxParams, number[], number[]]>) {
        const { F } = enter(p), start = from.slice();
        const fwd = unit(aim.map((x, i) => x - from[i]));                       // no x part: the camera stays in its plane
        let pos = start.map(fix), place: Place | null = null;
        pos[0] += fix(0.3 * depth);                                             // x = L + 0.3 depth, exactly, all the way down
        for (let s = 0, gone = 0; s < 6000 && gone < 60; s++) {
            const o = exactOrbit(pos, 900, F);
            if (!o.escaped || !(o.de > 0) || o.de < 0.02 * depth) break;
            if (o.de <= depth) { place = { cam: pos, fwd, D: o.de, cap: o.it + 9 + 24, ownEscape: o.it }; break; }
            pos = pos.map((c, j) => c + fix(0.5 * o.de * fwd[j])); gone += 0.5 * o.de;
        }
        if (!place) { check(false, `twin = exact, ${name}, beside a fold plane: no place found`); continue; }
        const O = lib.buildRefOrbit(place.cam, place.cap + 2) as Orbit & { GH: Float64Array[] };
        if (process.env.BOX_PRINT_PLACES) console.log('PLACE ' + JSON.stringify({ name, cam: place.cam.map(String), yaw: Math.atan2(place.fwd[2], place.fwd[0]), pitch: Math.asin(place.fwd[1]), iters: place.cap, depth: place.D }));
        const T = compare(O, place.cam, place.fwd, 8 * place.D, place.cap, F, 0.01 * place.D);
        check(good(T) && Math.abs(O.GH[0][0] - 0.3 * depth) < 1e-3 * depth,
            `twin = exact, ${name}, ${place.D.toExponential(1)} from the surface and ${O.GH[0][0].toExponential(1)} from the fold plane x = L: ${say(T)}`);
    }
    /* and beside the fixed-radius sphere: the camera on a circle of radius fixedR (1 + 0.3 depth), walked in fixed point
       by the rational parameter s -> ((1 - s²) / (1 + s²), 2 s / (1 + s²)) */
    let done = false;
    for (const [name, p] of [['scale 3', { scale: 3 }]] as Array<[string, BoxParams]>) {      // (at scale 2 and -1.5 the whole unit sphere is inside the set)
        const { P, F } = enter(p), rad = fix(P.fixedR) + fix(P.fixedR * 0.3 * depth);
        for (const plane of [[0, 1, 2], [0, 2, 1], [1, 2, 0]]) for (const s0 of [0.05, 0.4, 0.9, 1.6, -0.3, -1.1]) {
            if (done) break;
            const at = (s: bigint): bigint[] => { const s2 = mul(s, s), den = ONE + s2, out = [0n, 0n, 0n];
                out[plane[0]] = mul(rad, div(ONE - s2, den)); out[plane[1]] = mul(rad, div(2n * s, den)); return out; };
            let s = fix(s0), place: Place | null = null, tangent: V3 = [0, 0, 0];
            for (let n = 0, gone = 0; n < 6000 && gone < 3; n++) {
                const pos = at(s), o = exactOrbit(pos, 900, F), sf = num(s);
                if (!o.escaped || !(o.de > 0) || o.de < 0.02 * depth) break;                // (a start already in the set to the last bit is no place)
                const a = [0, 0, 0]; a[plane[0]] = -2 * sf; a[plane[1]] = 1 - sf * sf; tangent = unit(a);    // the way the walk goes: d/ds of the circle
                if (o.de <= depth) { place = { cam: pos, fwd: tangent, D: o.de, cap: o.it + 9 + 44, ownEscape: o.it }; break; }
                s += fix(0.5 * o.de * (1 + sf * sf) / (2 * P.fixedR)); gone += 0.5 * o.de;
            }
            if (!place) continue;
            const O = lib.buildRefOrbit(place.cam, place.cap + 2) as Orbit & { GF: Float64Array };
            const T = compare(O, place.cam, place.fwd, 8 * place.D, place.cap, F, 0.01 * place.D);
            const want = 2 * P.fixedR * P.fixedR * 0.3 * depth;
            check(good(T) && Math.abs(O.GF[0] - want) < 1e-3 * want,
                `twin = exact, ${name}, ${place.D.toExponential(1)} from the surface and |z|² - fixedR² = ${O.GF[0].toExponential(1)} at the first fold: ${say(T)}`);
            done = true;
        }
    }
    if (!done) check(false, 'twin = exact, beside the fixed-radius sphere: no place found');
}

// 5. the navigation's ray on the box, at the deepest place: it ends on the drawn solid, not past it
if (lastDeep) {
    enter({ scale: -1.5 });
    const { place, F } = lastDeep, yaw = Math.atan2(place.fwd[2], place.fwd[0]), pitch = Math.asin(place.fwd[1]);
    lib.setCam(place.cam, place.cap, yaw, pitch);
    const O = lib.buildRefOrbit(place.cam, place.cap + 2), ray = lib.rayFreeJS(O, place.fwd, place.cap, 0.05, 4000);
    const at = (t: number): Twin => exactOrbit(place.cam.map((c, j) => c + fix(t * place.fwd[j])), place.cap, F);
    const half = at(0.5 * ray.t), end = at(ray.t), past = at(1.5 * ray.t);
    check(ray.kind === 1 && ray.t > 0.5 * place.D && ray.t < 50 * place.D, `ray: along the view axis the free distance is of the size of the depth (${ray.t.toExponential(2)} at depth ${place.D.toExponential(1)}, ${ray.steps} steps)`);
    check(half.escaped && half.de > 0.05 * 0.5 * ray.t, 'ray: half way there the exact orbit is outside and not yet within tolerance', `de ${half.de.toExponential(2)}`);
    check(end.escaped && end.de < 0.1 * ray.t && (!past.escaped || past.de < 0.6 * ray.t), 'ray: and where it ends the exact estimate is within tolerance of the surface', `end ${end.de.toExponential(2)}, past ${past.escaped ? past.de.toExponential(2) : 'inside'}`);
    const b = lib.senseBundle(null, { slot: 'look' });
    check(b.marched && b.hits >= 5 && !b.inside && b.near > 0 && b.near <= b.second, `bundle: seven rays about the view axis, ${b.hits} meet the solid`);
    check(lib.senseBundle(null, { slot: 'look' }).marched === (b.open > 0), 'kept: asked again with nothing changed, the bundle is not marched');
    lib.applyFormula('mandelbox', { scale: -1.5, minR: 0.5000001 });
    check(lib.senseBundle(null, { slot: 'look' }).marched === true, 'kept: a changed parameter is marched again (the fractal moved)');
    check(lib.boxFar() > 4 && lib.boxFar() < 40, `far: a ray is given up ${lib.boxFar().toFixed(1)} from the camera`);
}

console.log(failed ? `box-orbit: ${failed} FAILED` : 'box-orbit: all green');
process.exit(failed ? 1 : 0);
