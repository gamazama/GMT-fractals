/**
 * kalibox-orbit check: KaliBox's per-pixel orbit on the CPU (`boxOrbitJS` with the abs table in the box fold's
 * place, reached through `pertOrbitJS`; grep KALIBOX in deep-zoom/renderer/core.js) against exact fixed-point
 * orbits of the same points. Node only: no browser, no GPU, about a minute.
 *
 *   npx tsx debug/deep-zoom-checks/kalibox-orbit.mts        (npm run check:deep-zoom-kalibox-orbit)
 *
 * WHAT IS UNDER TEST. KaliBox is drawn by the Mandelbox's kernel with another fold: the camera's own orbit in
 * fixed point (`buildBoxOrbit`, at a folding limit of 0) plus a delta whose fold goes by Burning's case table.
 * This check runs that step on points from 1e-32 to 30 units from the camera - c = the point and Julia mode,
 * both signs of scale, with a rotation - and compares the distance estimate, the escape flag and the iteration
 * count with an orbit of the explicit point. The same function is what the navigation's rays march on and what
 * the GPU's proof lines are refereed against (the "kalibox, ..." lines of debug/deep-zoom-direct-check.mts).
 *
 * THE REFEREE shares no code with it: its own fixed-point arithmetic and the map as GMT's shader writes it
 * (engine-gmt/formulas/KaliBox.ts: `p = abs(p) + uVec3A`, `k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0)`,
 * `p *= k`, `p = p * (scale / minRad2) + c`, `dr = dr * k * (abs(scale) / minRad2) + 1.0`), no reference orbit,
 * no delta, no regions. For a view with a rotation it is handed the renderer's matrix (at depth two matrices that
 * differ in the 16th digit are two different fractals); the matrix itself is checked against the shader's
 * `p *= uKB_rot`. Escape at 1000 and the estimate (|z| - 1) / dr are the renderer's own for this kernel.
 *
 * HOW IT REACHES THE CODE: as box-orbit.mts does - spans of core.js lifted as TEXT. PLACES are found here, by
 * the referee alone: its estimate marched down a ray from outside, half of itself a step, in fixed point, until
 * it reads the wanted depth; the first of a few aims that gets there is the place. KALI_PRINT_PLACES=1 prints
 * them in the form the direct proof takes.
 *
 * FALSIFICATION RECORD, 2026-10-12, one break in deep-zoom/renderer/core.js, restored byte for byte (sha-256):
 *   - `boxOrbitJS`, the abs fold's opposite-side case cut (`burnDeltaJS(GH[a][m], d, -1)` -> `GH[a][m] < 0 ? -d : d`
 *     on the three axes: a pixel across an abs plane from the reference folded as if it stood on the reference's
 *     side) -> 12 red: every "kalibox twin = exact" line (the four from outside, the six at depth, the one beside
 *     the plane x = 0: 94 to 1,036 of 1,134 estimates over 1e-6) and "ray: half way there ...".
 *   Not broken on purpose, so no more than green: the seam lines, the rotation's matrix, the two "far:" lines.
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

const TOL = 1e-6, FINE = 1e-6;
type V3 = [number, number, number];
interface KaliParams { kaliScale?: number; kaliMinRad2?: number; kaliTrans?: number[]; kaliRot?: number; julia?: boolean; c?: number[] }
interface Orbit { len: number; Rk: number[]; DRk: number[]; GH?: Float64Array[]; box?: { R: number[][]; hasRot: boolean; kali?: boolean; scale: number; m2: number } }
interface Twin { de: number; escaped: boolean; r: number; it: number }
interface Sense { near: number; second: number; hits: number; open: number; inside: boolean; marched: boolean }
interface Lib {
    hp: { fromNum(x: number): bigint; toNum(v: bigint): number };
    buildRefOrbit(cam: bigint[], lenMax: number): Orbit;
    pertOrbitJS(O: Orbit, dc: V3, maxIter: number, fixed?: boolean): Twin;
    rayFreeJS(O: Orbit, rd: V3, maxIter: number, tol: number, maxSteps: number): { t: number; kind: number; steps: number };
    senseBundle(axis: V3 | null, opt?: { slot?: string }): Sense;
    applyFormula(kind: string, params?: object): boolean;
    boxFar(): number;
    formula(): string;
    box(): { scale: number; minR: number };
    setCam(c: bigint[], iters: number, yaw: number, pitch: number): void;
}

// ── lift the spans (the same four box-orbit.mts lifts) ──
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
    return { hp, buildRefOrbit, pertOrbitJS, rayFreeJS, senseBundle, applyFormula, boxFar, formula: () => dzFormula, box: () => ({ scale: box.scale, minR: box.minR }),
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
const babs = (x: bigint): bigint => (x < 0n ? -x : x);
interface Fixed { sOverM: bigint; aSOverM: number; m: bigint; T: bigint[]; R: bigint[][] | null; K: bigint[] | null }
function exactOrbit(pos: bigint[], cap: number, F: Fixed): Twin {
    const c = F.K ?? pos;
    let z = pos.slice(), dr = 1, it = 0, escaped = false, z2 = 0;
    while (it < cap) {
        const u = F.R ? F.R.map((r) => mul(r[0], z[0]) + mul(r[1], z[1]) + mul(r[2], z[2])) : z;       // p *= uKB_rot
        const p = u.map((x, i) => babs(x) + F.T[i]);                                                    // p = abs(p) + uVec3A
        const r2 = mul(p[0], p[0]) + mul(p[1], p[1]) + mul(p[2], p[2]);
        let k = r2 === 0n ? ONE : div(F.m, r2);                                                         // k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0)
        if (k < F.m) k = F.m;
        if (k > ONE) k = ONE;
        z = p.map((x, i) => mul(mul(x, k), F.sOverM) + c[i]);                                           // p *= k; p = p * (scale / minRad2) + c
        dr = dr * num(k) * F.aSOverM + 1; it++;                                                         // dr = dr * k * (abs(scale) / minRad2) + 1.0
        z2 = num(mul(z[0], z[0]) + mul(z[1], z[1]) + mul(z[2], z[2]));
        if (z2 > 1e6) { escaped = true; break; }
    }
    const r = Math.sqrt(z2);
    return { de: (r - 1) / dr, escaped, r, it };
}

// ── places ──
const unit = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
interface Place { cam: bigint[]; fwd: V3; D: number; cap: number; ownEscape: number }
/** A camera whose exact estimate reads `depth`: the referee's estimate marched down a ray from `from`, half of
 *  itself a step, in fixed point. Null when the ray leaves or steps into the solid. `hold`: an axis kept where it starts. */
function findPlace(F: Fixed, from: bigint[], fwd: V3, depth: number, margin: number): Place | null {
    let pos = from.slice(), gone = 0;
    for (let s = 0; s < 6000 && gone < 60; s++) {
        const o = exactOrbit(pos, 900, F);
        if (!o.escaped || !(o.de > 0) || o.de < 0.02 * depth) return null;
        if (o.de <= depth) return { cam: pos, fwd, D: o.de, cap: o.it + 9 + margin, ownEscape: o.it };
        pos = pos.map((c, j) => c + fix(0.5 * o.de * fwd[j]));
        gone += 0.5 * o.de;
    }
    return null;
}

// ── one view: a cone of rays, a ladder of distances on each, twin against exact (box-orbit.mts's, with its gating) ──
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
            if (exFine !== twFine && !(Math.abs(tw.de - ex.de) < TOL * Math.abs(ex.de))) { T.kindMis++; continue; }
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
const PRESET = { kaliScale: 2.04348, kaliMinRad2: 0.3492, kaliTrans: [0.0365, -1.9183, 0.0365], kaliRot: 0 };
const K_PRESET = [-0.6691, -1.3028, -0.45775];
const full = (p: KaliParams): Required<KaliParams> => ({ ...PRESET, julia: false, c: [0, 0, 0], ...p });
function enter(p: KaliParams): { P: Required<KaliParams>; F: Fixed } {
    const P = full(p);
    lib.applyFormula('kalibox', P);
    const probe = lib.buildRefOrbit([fix(3), fix(2), fix(1)], 3), R = probe.box && probe.box.hasRot ? probe.box.R : null;
    return { P, F: { sOverM: div(fix(P.kaliScale), fix(P.kaliMinRad2)), aSOverM: Math.abs(P.kaliScale) / P.kaliMinRad2, m: fix(P.kaliMinRad2), T: P.kaliTrans.map(fix), R: R ? R.map((r) => r.map(fix)) : null, K: P.julia ? P.c.map(fix) : null } };
}
const say = (T: Tally): string => `${T.n} points, ${T.gated} gated: ${T.kindMis} read differently, ${T.countMis} iteration counts differ, ${T.over} estimates over ${TOL.toExponential(0)} (worst ${T.worst.toExponential(1)})`
    + `; ${T.fine} in a crevice or inside, not gated` + (T.fineOff ? ` (${T.fineOff} of them differ)` : '');
const good = (T: Tally): boolean => T.gated >= 0.2 * T.n && T.kindMis === 0 && T.countMis === 0 && T.over === 0;
const printPlace = (name: string, P: Required<KaliParams>, place: Place): void => {
    if (process.env.KALI_PRINT_PLACES) console.log('PLACE ' + JSON.stringify({ name, params: { kaliScale: P.kaliScale, kaliMinRad2: P.kaliMinRad2, kaliTrans: P.kaliTrans, kaliRot: P.kaliRot }, ...(P.julia ? { c: P.c.map((x) => String(fix(x))) } : {}),
        view: { cam: place.cam.map(String), yaw: Math.atan2(place.fwd[2], place.fwd[0]), pitch: Math.asin(place.fwd[1]), iters: place.cap }, depth: place.D }));
};

// 1. the seam itself
check(lib.formula() === 'mandelbulb', 'seam: the formula starts as the bulb');
{ const before = lib.box();
  check(lib.applyFormula('kalibox', { kaliScale: 1.8 }) === true && lib.formula() === 'kalibox', 'seam: selecting KaliBox reports a change');
  check(lib.applyFormula('kalibox', { kaliScale: 1.8 }) === false, 'seam: the same formula and numbers again report none');
  const O = lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20);
  check(!!O.box && O.box.kali === true && O.box.scale === 1.8, 'seam: an orbit built with KaliBox selected carries its record and its scale');
  check(lib.applyFormula('kalibox', { kaliMinRad2: 1.7 }) === true && lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20).box!.m2 === 1, 'seam: MinRad2 is held at or under 1');
  check(lib.box().scale === before.scale && lib.box().minR === before.minR, 'seam: KaliBox\'s numbers leave the Mandelbox\'s where they were');
  check(lib.applyFormula('mandelbox') === true && !lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20).box!.kali, 'seam: the Mandelbox\'s orbit carries no KaliBox record');
  check(lib.applyFormula('mandelbulb') === true && !lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20).box, 'seam: and the bulb\'s carries none'); }

// 2. from outside: deltas the size of the set, every jump across an abs plane and both spheres
for (const [name, p, camPos, aim] of [
    ['Scale 1.8, c = the point', { kaliScale: 1.8 }, [2.84, 2.52, 3.14], [-2.4, -1.0, -2.5]],
    ['GMT\'s preset (Julia mode)', { julia: true, c: K_PRESET }, [5.6, 2.2, 3.9], [0, -0.8, 0]],
    ['Scale -1.5, c = the point', { kaliScale: -1.5 }, [-3.2, -3.6, -2.7], [1.5, 0.5, 1.5]],     // (a negative scale: the solid is the octant on the other side)
    ['Scale 1.8, c = the point, Rotation 0.6', { kaliScale: 1.8, kaliRot: 0.6 }, [2.84, 2.52, 3.14], [-2.4, -1.0, -2.5]],
] as Array<[string, KaliParams, number[], number[]]>) {
    const { P, F } = enter(p), camFix = camPos.map(fix), fwd = unit(aim.map((x, i) => x - camPos[i])), dist = Math.hypot(camPos[0] - aim[0], camPos[1] - aim[1], camPos[2] - aim[2]);
    const O = lib.buildRefOrbit(camFix, 82), T = compare(O, camFix, fwd, 1.6 * dist, 80, F, 0.02 * dist);
    check(good(T), `kalibox twin = exact, ${name}, from ${dist.toFixed(1)} away: ${say(T)}`);
    printPlace(`${name}, from outside`, P, { cam: camFix, fwd, D: dist, cap: 80, ownEscape: 0 });
}

// 3. the rotation is the shader's: mat3 built column by column, the vector on the left
{
    const a = 0.6, { F } = enter({ kaliScale: 1.8, kaliRot: a }), R = F.R ? F.R.map((r) => r.map(num)) : null;
    const ax = Math.SQRT1_2, ay = Math.SQRT1_2, az = 0, s = Math.sin(a), c = Math.cos(a), oc = 1 - c;
    const col = [[oc * ax * ax + c, oc * ax * ay - az * s, oc * az * ax + ay * s], [oc * ax * ay + az * s, oc * ay * ay + c, oc * ay * az - ax * s], [oc * az * ax - ay * s, oc * ay * az + ax * s, oc * az * az + c]];
    const v = [0.31, -0.72, 0.55], want = col.map((cj) => v[0] * cj[0] + v[1] * cj[1] + v[2] * cj[2]);     // (v * M)[j] = dot(v, column j)
    const got = R ? R.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) : v, err = Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]);
    check(!!R && err < 1e-14, 'rotation: the matrix is the shader\'s `p *= uKB_rot` about (1, 1, 0)', `off by ${err.toExponential(1)}`);
}

// 4. at depth: name, numbers, where the rays start, the aims tried in turn, the depth, the margin of iterations above the camera's own escape
const AIMS_POINT = [[-2.4, -1.0, -2.5], [-1.2, -0.4, -1.3], [-0.9, 0.9, -1.0], [-3.0, -2.0, -1.0], [-1.0, -2.5, -3.0], [-2.0, 1.5, -2.0]];
const AIMS_JULIA = [[0, -0.8, 0], [0.3, -0.2, 0.2], [-0.4, -1.5, 0.3], [0.2, 0.6, -0.3], [0.5, -2.0, -0.4], [0, 0, 0]];
const deep: Array<[string, KaliParams, number[], number[][], number, number]> = [
    ['Scale 1.8, c = the point', { kaliScale: 1.8 }, [2.84, 2.52, 3.14], AIMS_POINT, 1e-8, 33],
    ['Scale 1.8, c = the point', { kaliScale: 1.8 }, [2.84, 2.52, 3.14], AIMS_POINT, 1e-30, 33],
    ['GMT\'s preset (Julia mode)', { julia: true, c: K_PRESET }, [5.6, 2.2, 3.9], AIMS_JULIA, 1e-10, 33],
    ['GMT\'s preset (Julia mode)', { julia: true, c: K_PRESET }, [5.6, 2.2, 3.9], AIMS_JULIA, 1e-30, 33],
    ['Scale -1.5, c = the point', { kaliScale: -1.5 }, [-3.2, -3.6, -2.7], [[1.5, 0.5, 1.5], [0.5, -1.5, 0.5], [2, 2, 2], [1, 3, 1], [3, 0, 1], [0.3, 0.3, 3]], 1e-20, 44],
    ['Scale 1.8, c = the point, Rotation 0.6', { kaliScale: 1.8, kaliRot: 0.6 }, [2.84, 2.52, 3.14], AIMS_POINT, 1e-20, 33],
];
let lastDeep: { place: Place; p: KaliParams } | null = null;
for (const [name, p, from, aims, depth, margin] of deep) {
    const { P, F } = enter(p);
    let place: Place | null = null;
    for (const aim of aims) { place = findPlace(F, from.map(fix), unit(aim.map((x, i) => x - from[i])), depth, margin); if (place) break; }
    if (!place) { check(false, `kalibox twin = exact, ${name}, at depth ${depth.toExponential(0)}: no place found`); continue; }
    const O = lib.buildRefOrbit(place.cam, place.cap + 2), T = compare(O, place.cam, place.fwd, 8 * place.D, place.cap, F, 0.01 * place.D);
    check(good(T), `kalibox twin = exact, ${name}, ${place.D.toExponential(1)} from the surface (own orbit escapes on ${place.ownEscape}, cap ${place.cap}): ${say(T)}`);
    printPlace(`${name}, ${depth.toExponential(0)}`, P, place);
    if (name === 'Scale 1.8, c = the point' && depth < 1e-20) lastDeep = { place, p };
}

// 4b. the camera 0.3 of its depth from the abs plane x = 0, in Julia mode (whose set is its own mirror image in that
//     plane): the reference's first coordinate is 3e-51 - below what a plain f32 holds, so the same place serves the
//     GPU's proof - and half the rays cross the plane at iteration 0
{
    const depth = 1e-50, { P, F } = enter({ julia: true, c: K_PRESET });
    let place: Place | null = null;
    for (const [from, aim] of [[[0, 2.2, 3.9], [0, -0.8, 0]], [[0, 4.0, 3.0], [0, -1.5, 0.3]], [[0, -5.0, 2.5], [0, -1.0, 0]], [[0, 1.0, -5.0], [0, -0.5, 0.2]], [[0, 5.0, 0.4], [0, -1.0, 0.1]], [[0, -2.0, 5.0], [0, 0.5, 0]]] as number[][][]) {
        const start = from.map(fix); start[0] += fix(0.3 * depth);          // x = 0.3 depth, exactly, all the way down: the rays have no x part
        place = findPlace(F, start, unit(aim.map((x, i) => x - from[i])), depth, 33);
        if (place) break;
    }
    if (!place) check(false, 'kalibox twin = exact, beside the abs plane x = 0: no place found');
    else {
        const O = lib.buildRefOrbit(place.cam, place.cap + 2), T = compare(O, place.cam, place.fwd, 8 * place.D, place.cap, F, 0.01 * place.D);
        check(good(T) && Math.abs(O.GH![0][0] - 0.3 * depth) < 1e-3 * depth,
            `kalibox twin = exact, GMT's preset (Julia mode), ${place.D.toExponential(1)} from the surface and ${O.GH![0][0].toExponential(1)} from the abs plane x = 0: ${say(T)}`);
        printPlace('beside the abs plane x = 0', P, place);
    }
}

// 5. the navigation's ray on KaliBox, at the deepest place with c = the point: it ends on the drawn solid, not past it
if (lastDeep) {
    const { F } = enter(lastDeep.p), place = lastDeep.place, yaw = Math.atan2(place.fwd[2], place.fwd[0]), pitch = Math.asin(place.fwd[1]);
    lib.setCam(place.cam, place.cap, yaw, pitch);
    const O = lib.buildRefOrbit(place.cam, place.cap + 2), ray = lib.rayFreeJS(O, place.fwd, place.cap, 0.05, 4000);
    const at = (t: number): Twin => exactOrbit(place.cam.map((c, j) => c + fix(t * place.fwd[j])), place.cap, F);
    const half = at(0.5 * ray.t), end = at(ray.t), past = at(1.5 * ray.t);
    check(ray.kind === 1 && ray.t > 0.5 * place.D && ray.t < 200 * place.D, `ray: along the view axis the free distance is of the size of the depth (${ray.t.toExponential(2)} at depth ${place.D.toExponential(1)}, ${ray.steps} steps)`);
    check(half.escaped && half.de > 0.05 * 0.5 * ray.t, 'ray: half way there the exact orbit is outside and not yet within tolerance', `de ${half.de.toExponential(2)}`);
    check(end.escaped && end.de < 0.1 * ray.t && (!past.escaped || past.de < 0.6 * ray.t), 'ray: and where it ends the exact estimate is within tolerance of the surface', `end ${end.de.toExponential(2)}, past ${past.escaped ? past.de.toExponential(2) : 'inside'}`);
    const b = lib.senseBundle(null, { slot: 'look' });
    check(b.marched && b.hits >= 5 && !b.inside && b.near > 0 && b.near <= b.second, `bundle: seven rays about the view axis, ${b.hits} meet the solid`);
    const camDist = Math.hypot(...place.cam.map(num));
    check(Math.abs(lib.boxFar() - camDist - 40) < 1e-9, `far: with c = the point a ray is followed 40 past the camera's own distance from the origin (${lib.boxFar().toFixed(1)}), a number set by hand`);
    lib.setCam([fix(90), fix(80), fix(100)], place.cap, yaw, pitch);
    { const d = Math.hypot(90, 80, 100); check(Math.abs(lib.boxFar() - 9 * d) < 1e-9, `far: and from far out, 8 times the camera's own distance past it (${lib.boxFar().toFixed(0)} from ${d.toFixed(0)}): the octant has no end to cut at`); }
    lib.setCam(place.cam, place.cap, yaw, pitch);
    enter({ julia: true, c: K_PRESET });
    check(lib.boxFar() - camDist > 5.2 && lib.boxFar() - camDist < 6.5, `far: in Julia mode the preset's ball is ${(lib.boxFar() - camDist).toFixed(2)} wide (the bound, and a tenth more)`);
}

console.log(failed ? `kalibox-orbit: ${failed} FAILED` : 'kalibox-orbit: all green');
process.exit(failed ? 1 : 0);
