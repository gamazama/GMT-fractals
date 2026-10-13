/**
 * burning-orbit check: BURNING on the Mandelbulb on the CPU (grep BURNING in deep-zoom/renderer/core.js) - the
 * per-pixel delta orbit (`pertOrbitJS` on a reference built with Burning on) against exact fixed-point orbits
 * of the same points under z -> fold(z)^n + c, fold(x) = x for x >= 0 and (1 - 2 mix) x below it (mix 1: abs).
 * Node only: no browser, no GPU, about two minutes.
 *
 *   npx tsx debug/deep-zoom-checks/burning-orbit.mts        (npm run check:deep-zoom-burning-orbit)
 *   BURN_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/burning-orbit.mts     also prints every place found, as the
 *                                                           data debug/deep-zoom-direct-check.mts carries its views in
 *
 * WHAT IS UNDER TEST. With Burning on the camera's reference orbit is the orbit of the folded map, and a pixel's
 * delta goes through the fold BY CASES before the bulb's own power step: per axis, the reference and the pixel on
 * the same side of the plane (the delta times that side's factor) or on opposite sides (a form with the
 * reference's own signed coordinate in it). The jet takes the pixel's side as a factor, the gradient is pulled
 * back through it. The same functions are what `api.dz.sense`, `freeDistance`, `estimateAt` and `lookPoint` march
 * on, and what the GPU's probes are refereed against (debug/deep-zoom-direct-check.mts, the "burning, ..." lines).
 *
 * THE REFEREE shares no code with it: its own fixed-point arithmetic, no reference orbit, no delta, the bulb's
 * power by complex multiplication (the renderer uses Chebyshev recurrences), the fold written here.
 *
 * HOW IT REACHES THE CODE: as julia-orbit.mts does - the same four spans of core.js lifted as TEXT and run with
 * the few names they close over. It throws if a span's first or last words are gone.
 *
 * PLACES are found here, by the referee alone: a point that stays bounded 300 iterations, a ray at it from 1.9
 * out, the referee's estimate marched down that ray three tenths of itself a step (halved back when a step lands
 * inside), in fixed point, until it reads the wanted depth (1e-3, 1e-10, 1e-30, 1e-60 along each ray). A ray that
 * does not reach every depth is dropped and another is drawn (a fixed seed: the same places every run).
 * ONE PLACE IS MADE, NOT FOUND: "beside the plane x = 0" - a camera 1e-40 on the positive side of that plane, in
 * a view whose pixels are 1e-10 apart, so that half of them stand on the other side of it from the very first
 * iteration. That is the case the reference's signed coordinate has to be right for.
 *
 * WHICH POINTS ARE GATED: julia-orbit.mts's rules, unchanged - a point in a crevice finer than 1e-6 of its
 * distance, or inside, is counted and not gated; nor is one that f64 cannot settle (the twin run three times
 * more with the offset moved by 1e-13 of its length along each axis: an estimate that moves by more than 1e-9
 * for any of them is "ill-conditioned").
 *
 * A MIX UNDER 1 HAS LITTLE GROUND TO STAND ON. At mix 0.5 (and less so at 0.25) the estimate does not fall
 * smoothly towards most of what it calls a surface: an orbit can creep for hundreds of iterations on a folded
 * axis while its running derivative grows 8 times an iteration, and the estimate drops from 5e-4 to 1e-308 in one
 * step (seen in the finder, 2026-10-12). Such a point is no place (findPlace drops it), a ray at a mix under 1 is
 * kept as deep as it got, and power 2 at mix 0.5 has no line: ten rays found none.
 *
 * FALSIFICATION RECORD, 2026-10-12, one break in deep-zoom/renderer/core.js, restored byte for byte (sha-256):
 *   - the opposite-side case of the fold's delta cut (`burnDeltaJS`: `return fr === fp ? fp * d : fp * p - fr * Z;`
 *     -> `return fp * d;`: a pixel across a fold plane from the reference is folded as if it stood beside it)
 *     -> 27 red of 58: every "burning twin = exact" line but three (at power 8, mix 1, 1.5e-31: "367 iteration
 *       counts differ, 58 estimates over 1e-6 (worst 1.5e+1)"), all three views beside the plane x = 0 (power 2:
 *       "1134 iteration counts differ"), both Julia lines and "burning ray, mix 1" (the ray read 5.4e-18 at a
 *       depth of 1.5e-31). Green in that run: the seam, the two controls, the jet and gradient lines (their
 *       points do not cross a plane) and three twin lines whose grid has no crossing either (power 8 at mix 0.5,
 *       1.0e-10, and at mix 0.25, 1.0e-60; power 2 at mix 0.25, 3.6e-14).
 *   Not broken on purpose (the build's three breaks were spent elsewhere): the jet's sides, the gradient's pull
 *   back through the fold, the fixed-point fold of the reference, the factor held away from 0.
 *   The GPU's fold was broken the same way: debug/deep-zoom-direct-check.mts.
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type V3 = [number, number, number];
interface FormulaParams { julia?: boolean; c?: unknown; burning?: boolean; burnMix?: number; scale?: number }
interface Orbit { len: number; rows?: number; data: Float32Array; Rk: number[]; DRk: number[]; julia?: boolean; burn?: number; box?: unknown }
interface Twin { de: number; escaped: boolean; r: number; it: number }
interface JetOut extends Twin { z: V3; jet: V3; grad: V3; ray: number }
interface Lib {
    buildRefOrbit(cam: bigint[], lenMax: number): Orbit;
    pertOrbitJS(O: Orbit, dc: V3, maxIter: number, fixed?: boolean): Twin;
    pertOrbitJetJS(O: Orbit, dc: V3, rd: V3, maxIter: number, fixed?: boolean): JetOut;
    rayFreeJS(O: Orbit, rd: V3, maxIter: number, tol: number, maxSteps: number): { t: number; kind: number; steps: number };
    applyFormula(kind: string, params?: FormulaParams): boolean;
    burn(): { on: boolean; mix: number; neg: number };
    setBulb(power: number): void;
    setCam(c: bigint[], iters: number): void;
}

// ── lift the spans (the same four ray-probe.mts, box-orbit.mts and julia-orbit.mts lift) ──
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
    return { buildRefOrbit, pertOrbitJS, pertOrbitJetJS, rayFreeJS, applyFormula,
        burn: () => ({ on: burnOn, mix: burnMix, neg: burnNeg }),
        setBulb: (power) => { nPower = power; phaseTheta = 0; phasePhi = 0; },
        setCam: (c, iters) => { camHP = c.slice(); cam.iters = iters; } };
`)() as Lib;

// ── the referee: its own fixed point (256 fractional bits, as the camera) ──
const PB = 256n, ONE = 1n << PB, SC = 2 ** 256;
const mul = (a: bigint, b: bigint): bigint => (a * b) >> PB;
const div = (a: bigint, b: bigint): bigint => (a << PB) / b;
function isqrt(n: bigint): bigint { if (n < 2n) return n < 0n ? 0n : n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; }
const fsqrt = (a: bigint): bigint => isqrt(a << PB);
/** An f64 as fixed point, exactly. */
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
const addFix = (p: bigint[], d: number[]): bigint[] => p.map((c, j) => c + fix(d[j]));
const norm2 = (v: bigint[]): bigint => mul(v[0], v[0]) + mul(v[1], v[1]) + mul(v[2], v[2]);
type C2 = [bigint, bigint];
const cmul = (a: C2, b: C2): C2 => [mul(a[0], b[0]) - mul(a[1], b[1]), mul(a[0], b[1]) + mul(a[1], b[0])];
const cpow = (a: C2, n: number): C2 => { let r: C2 = [ONE, 0n]; for (let i = 0; i < n; i++) r = cmul(r, a); return r; };
/** The triplex power, phase 0: (z + i rho)^n = r^n (cos n theta + i sin n theta), ((x + i y) / rho)^n = cos n phi + i sin n phi. */
function bulbPow(v: bigint[], n: number): bigint[] {
    const [x, y, z] = v, rho = fsqrt(mul(x, x) + mul(y, y)), a = cpow([z, rho], n);
    if (rho === 0n) return [0n, 0n, a[0]];
    const b = cpow([div(x, rho), div(y, rho)], n);
    return [mul(a[1], b[0]), mul(a[1], b[1]), a[0]];
}
/** What a negative coordinate is multiplied by at a mix: 1 - 2 mix, as the single-precision number the shader
 *  holds (so the CPU, the GPU and this referee fold by one and the same factor). mix 1: -1, the plain abs. */
const negOf = (mix: number): number => { const n = Math.fround(1 - 2 * mix); return Math.abs(n) < 2 ** -20 ? 2 ** -20 : n; };   // never 0: grep THE FACTOR IS NEVER 0 in core.js
/** An orbit of the explicit point `pos` under z -> fold(z)^n + c: c is K (Julia mode), or the point itself when
 *  K is null. neg = 1: no fold, the plain bulb. GMT's running derivative, from the radius of the FOLDED point. */
interface Formula { exact(pos: bigint[], cap: number, upto?: number): Twin & { z: bigint[] } }
function burnFormula(power: number, neg: number, K: bigint[] | null): Formula {
    const negF = fix(neg);
    return { exact(pos, cap, upto = -1) {
        const c = K ?? pos;
        let z = pos.slice(), dr = 1, it = 0, escaped = false, r = Math.sqrt(num(norm2(z)));
        while (it < cap) {
            if (upto >= 0 && it === upto) break;
            const zb = neg === 1 ? z : z.map((x) => (x < 0n ? mul(x, negF) : x));
            dr = power * Math.pow(Math.sqrt(num(norm2(zb))), power - 1) * dr + 1;
            const w = bulbPow(zb, power);
            z = [w[0] + c[0], w[1] + c[1], w[2] + c[2]]; it++;
            r = Math.sqrt(num(norm2(z)));
            if (upto < 0 && r > 2) { escaped = true; break; }
        }
        return { de: 0.5 * r * Math.log(Math.max(r, 1e-300)) / dr, escaped, r, it, z };
    } };
}

// ── vectors, places, the cone ──
const unit = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scl = (a: number[], s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
let seed = 20261012; const rnd = (): number => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
interface Place { cam: bigint[]; D: number; ownEscape: number }
function findPlace(F: Formula, from: bigint[], fwd: V3, depth: number): Place | null {
    let pos = from.slice(), gone = 0, o = F.exact(pos, 500);
    if (!o.escaped || !(o.de > 0)) return null;
    for (let steps = 0; steps < 20000 && gone < 8; ) {
        // a place is one the estimate FELL to: where it drops a million times in one step (a mix under 1 has such
        // ground: an orbit that creeps for hundreds of iterations while its derivative grows) there is nothing to compare
        if (o.de <= depth) return o.de < 1e-6 * depth ? null : { cam: pos, D: o.de, ownEscape: o.it };
        let step = 0.3 * o.de, next = pos, on = o, ok = false;
        for (let h = 0; h < 12; h++, step *= 0.5) {
            next = addFix(pos, scl(fwd, step)); on = F.exact(next, 500); steps++;
            if (on.escaped && on.de > 0) { ok = true; break; }
        }
        if (!ok) return null;
        pos = next; o = on; gone += step;
    }
    return null;
}
/** plain f64: does the point stay bounded 300 iterations (a target for a ray) */
function boundedF(power: number, neg: number, c: number[]): boolean {
    let z = c.slice();
    for (let i = 0; i < 300; i++) {
        const zb = z.map((x) => (x < 0 ? x * neg : x)), r = Math.hypot(zb[0], zb[1], zb[2]);
        if (r === 0) { z = c.slice(); continue; }
        const th = Math.acos(Math.max(-1, Math.min(1, zb[2] / r))) * power, ph = Math.atan2(zb[1], zb[0]) * power, rn = Math.pow(r, power);
        z = [rn * Math.sin(th) * Math.cos(ph) + c[0], rn * Math.sin(th) * Math.sin(ph) + c[1], rn * Math.cos(th) + c[2]];
        if (z[0] * z[0] + z[1] * z[1] + z[2] * z[2] > 4) return false;
    }
    return true;
}
const DEPTHS = [1e-3, 1e-10, 1e-30, 1e-60];
/** A ray and the places along it, deepest last. At mix 1 (and for the plain bulb) one that reaches every depth.
 *  At a mix under 1 the ray comes from the all-positive octant at a target in it (elsewhere the start is often
 *  inside the solid, or the estimate does not see the wall) and may stop short: the ray that got deepest in
 *  ten tries is kept, with the places it did reach. */
function dive(F: Formula, power: number, neg: number): { fwd: V3; places: Place[] } | null {
    const whole = neg === -1 || neg === 1;
    let best: { fwd: V3; places: Place[] } | null = null;
    for (let tries = 0; tries < (whole ? 40 : 10); tries++) {
        let target: number[] | null = null;
        for (let q = 0; q < 20000 && !target; q++) {
            const p = whole ? [(rnd() * 2 - 1) * 1.2, (rnd() * 2 - 1) * 1.2, (rnd() * 2 - 1) * 1.2] : [rnd() * 1.1 + 0.05, rnd() * 1.1 + 0.05, rnd() * 1.1 + 0.05];
            if (Math.max(p[0], p[1], p[2]) > 0.05 && boundedF(power, neg, p)) target = p;
        }
        if (!target) return best;
        const dir = whole ? [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5] : [rnd() + 0.2, rnd() + 0.2, rnd() + 0.2];
        const from = scl(unit(dir), 1.9), fwd = unit(target.map((x, j) => x - from[j]));
        const places: Place[] = []; let pos: bigint[] | null = from.map(fix);
        for (const depth of DEPTHS) { const p: Place | null = pos ? findPlace(F, pos, fwd, depth) : null; if (!p) { pos = null; break; } pos = p.cam; places.push(p); }
        if (places.length === DEPTHS.length) return { fwd, places };
        if (!whole && places.length > (best ? best.places.length : 0)) best = { fwd, places };
    }
    return best;
}
/** the renderer's margin rule (grep ITERATIONS AS A MARGIN in core.js), read off the camera's own orbit */
function marginCap(cam: bigint[], esc: number): number {
    const O = lib.buildRefOrbit(cam, esc + 4);
    let ke = -1;
    for (let k = 0; k < O.len; k++) if (O.Rk[k] > 2) { ke = k; break; }
    if (ke < 0) return Math.min(400, esc + 40);
    const grow = ke > 0 ? Math.log(Math.max(O.DRk[ke], 2)) / ke : 2;
    return Math.min(400, ke + 2 + Math.ceil(20.7 / Math.max(grow, 0.2)));
}
const TOL = 1e-6, FINE = 1e-6;
interface Tally { n: number; gated: number; kindMis: number; countMis: number; worst: number; over: number; fine: number; ill: number }
/** twin against exact on a 9 x 9 cone of rays, 14 distances a ray, from a hundredth of the depth to 8 times it */
function compare(O: Orbit, camFix: bigint[], fwd: V3, D: number, cap: number, F: Formula): Tally {
    const right = unit(cross(fwd, Math.abs(fwd[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), up = cross(right, fwd);
    const T: Tally = { n: 0, gated: 0, kindMis: 0, countMis: 0, worst: 0, over: 0, fine: 0, ill: 0 };
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
        const rd = unit([0, 1, 2].map((j) => fwd[j] + ((x + 0.5 - 4.5) / 9) * right[j] + ((y + 0.5 - 4.5) / 9) * up[j]));
        for (let s = 0; s < 14; s++) {
            const t = 0.01 * D * Math.pow(800, s / 13), dc = scl(rd, t);
            const tw = lib.pertOrbitJS(O, dc, cap), ex = F.exact(addFix(camFix, dc), cap);
            T.n++;
            const exFine = !ex.escaped || ex.de < FINE * t, twFine = !tw.escaped || tw.de < FINE * t;
            if (exFine !== twFine && !(Math.abs(tw.de - ex.de) < TOL * Math.abs(ex.de))) { T.kindMis++; continue; }
            if (exFine) { T.fine++; continue; }
            // can f64 settle this point? the same orbit with the offset moved by 1e-13 of its length along each axis (see the header)
            let settled = true;
            for (let a = 0; a < 3 && settled; a++) {
                const nudged = lib.pertOrbitJS(O, dc.map((v, j) => v + (j === a ? 1e-13 * t : 0)) as V3, cap);
                if (nudged.it !== tw.it || !(Math.abs(nudged.de - tw.de) < 1e-9 * Math.abs(tw.de))) settled = false;
            }
            if (!settled) { T.ill++; continue; }
            T.gated++;
            if (tw.it !== ex.it) { T.countMis++; continue; }
            const rel = Math.abs(tw.de - ex.de) / Math.abs(ex.de);
            if (rel > T.worst) T.worst = rel;
            if (!(rel < TOL)) T.over++;
        }
    }
    return T;
}
const say = (T: Tally): string => `${T.n} points, ${T.gated} gated: ${T.kindMis} read differently, ${T.countMis} iteration counts differ, ${T.over} estimates over ${TOL.toExponential(0)} (worst ${T.worst.toExponential(1)})`
    + `; not gated: ${T.fine} in a crevice or inside, ${T.ill} ill-conditioned`;
const good = (T: Tally, share: number): boolean => T.gated >= share * T.n && T.kindMis === 0 && T.countMis === 0 && T.over === 0;
/** BURN_PRINT_PLACES=1: every place found, in the form debug/deep-zoom-direct-check.mts carries its burning views as data */
const printPlace = (name: string, formula: Record<string, unknown>, p: Place, fwd: V3, cap: number): void => {
    if (process.env.BURN_PRINT_PLACES) console.log('PLACE ' + JSON.stringify({ name, ...formula, view: { cam: p.cam.map(String), yaw: Math.atan2(fwd[2], fwd[0]), pitch: Math.asin(fwd[1]), iters: cap }, depth: p.D }));
};

// 1. the seam
{
    const P = [fix(0.3), fix(0.2), fix(0.1)];
    check(lib.burn().on === false && lib.burn().neg === 1, 'seam: the renderer starts with Burning off');
    const plain = lib.buildRefOrbit(P, 20);
    check(plain.burn === undefined && (plain.rows ?? 4) === 4, 'seam: an orbit built with Burning off carries no fold and has the bulb\'s four rows');
    check(lib.applyFormula('mandelbulb', { burning: true }) === true && lib.burn().on && lib.burn().mix === 1 && lib.burn().neg === -1, 'seam: Burning on reports a change, at mix 1: a negative coordinate is multiplied by -1');
    check(lib.applyFormula('mandelbulb', { burning: true }) === false, 'seam: the same again reports none');
    const on = lib.buildRefOrbit(P, 20);
    check(on.burn === -1 && on.rows === 6 && on.data.length === on.len * 6 * 4, 'seam: an orbit built with Burning on carries its factor and has six rows');
    check(lib.applyFormula('mandelbulb', { burnMix: 0.5 }) === true && lib.burn().neg === 2 ** -20 && lib.buildRefOrbit(P, 20).burn === 2 ** -20, 'seam: mix 0.5 reports a change: a negative coordinate is multiplied by 2^-20, never by 0');
    check(lib.applyFormula('mandelbulb', { burnMix: 7 }) === true && lib.burn().mix === 1 && lib.applyFormula('mandelbulb', { burnMix: -3 }) === true && lib.burn().mix === 0, 'seam: a mix outside 0 to 1 is held to it');
    check(lib.buildRefOrbit(P, 20).burn === undefined, 'seam: at mix 0 there is no fold: the orbit is the plain bulb\'s');
    lib.applyFormula('mandelbulb', { burnMix: 1 });
    check(lib.applyFormula('mandelbox', { scale: 2 }) === true && lib.burn().neg === 1 && lib.buildRefOrbit(P, 20).burn === undefined && lib.burn().on, 'seam: the Mandelbox takes no fold, and the switch is kept for the bulb');
    check(lib.applyFormula('mandelbulb', {}) === true && lib.burn().neg === -1, 'seam: back on the bulb the fold is in force again');
    check(lib.applyFormula('mandelbulb', { burning: false }) === true && lib.buildRefOrbit(P, 20).burn === undefined, 'seam: Burning off, and an orbit carries none');
    // with Burning off the reference's texels are the plain bulb's, whatever the mix was left at
    lib.applyFormula('mandelbulb', { burnMix: 0.5 });
    const again = lib.buildRefOrbit(P, 20);
    check(again.data.length === plain.data.length && again.data.every((v, i) => Object.is(v, plain.data[i])), 'seam: with Burning off the reference orbit is the plain bulb\'s, texel for texel');
    lib.applyFormula('mandelbulb', { burnMix: 1 });
}

// 2. the control: Burning off, the same harness and the same finder
for (const power of [8, 2]) {
    lib.setBulb(power); lib.applyFormula('mandelbulb', { burning: false });
    const F = burnFormula(power, 1, null), d = dive(F, power, 1);
    if (!d) { check(false, `control, the plain bulb, power ${power}: no ray reached every depth`); continue; }
    const p = d.places[2], cap = marginCap(p.cam, p.ownEscape), T = compare(lib.buildRefOrbit(p.cam, cap + 2), p.cam, d.fwd, p.D, cap, F);
    for (const q of d.places) printPlace(`plain bulb power ${power} (the control)`, { power, mix: 0 }, q, d.fwd, marginCap(q.cam, q.ownEscape));
    check(good(T, 0.5), `control, the plain bulb, power ${power}, ${p.D.toExponential(1)} from the surface (cap ${cap}): ${say(T)}`);
}

// 3. the burning bulb: powers 8 and 2, mix 1, 0.5 and 0.25, two rays a case, four depths a ray
const kept: Record<string, { power: number; cam: bigint[]; fwd: V3 }> = {};
// (power 2 at mix 0.5 is left out: ten rays found no place the estimate falls to smoothly, 2026-10-12)
for (const [power, mix] of [[8, 1], [8, 0.5], [8, 0.25], [2, 1], [2, 0.25]] as Array<[number, number]>) {
    const neg = negOf(mix), rays = mix === 1 ? 2 : 1;
    lib.setBulb(power); lib.applyFormula('mandelbulb', { burning: true, burnMix: mix, julia: false });
    const F = burnFormula(power, neg, null);
    let places = 0;
    for (let ray = 0; ray < rays; ray++) {
        const d = dive(F, power, neg);
        if (!d) continue;
        for (const p of d.places) {
            places++;
            const cap = marginCap(p.cam, p.ownEscape), T = compare(lib.buildRefOrbit(p.cam, cap + 2), p.cam, d.fwd, p.D, cap, F);
            printPlace(`bulb power ${power}, mix ${mix}, ray ${ray + 1}`, { power, mix }, p, d.fwd, cap);
            check(good(T, 0.3), `burning twin = exact, power ${power}, mix ${mix}, ray ${ray + 1}, ${p.D.toExponential(1)} from the surface (own orbit escapes on ${p.ownEscape}, cap ${cap}): ${say(T)}`);
        }
        if (power === 8 && ray === 0) kept[String(mix)] = { power, cam: d.places[Math.min(2, d.places.length - 1)].cam, fwd: d.fwd };
    }
    if (mix === 1) check(places === 8, `burning places, power ${power}, mix 1: ${places} found on 2 rays x 4 depths`);
    else check(places >= 1, `burning places, power ${power}, mix ${mix}: ${places} found on 1 ray (a mix under 1 has little ground the estimate falls to smoothly: the ray is kept as deep as it got)`);
}

// 4. beside the plane x = 0: half the pixels stand on the other side of it from the first iteration
for (const [power, mix] of [[8, 1], [2, 1], [8, 0.5]] as Array<[number, number]>) {
    const neg = negOf(mix);
    lib.setBulb(power); lib.applyFormula('mandelbulb', { burning: true, burnMix: mix, julia: false });
    const F = burnFormula(power, neg, null), X = fix(1e-40);
    // a ray IN the plane (its x is 1e-40 all the way), from outside at a point of it that stays bounded
    let place: Place | null = null, fwd: V3 = [0, 0, 1];
    for (let tries = 0; tries < 200 && !place; tries++) {
        const target = mix === 1 ? [0, (rnd() * 2 - 1) * 1.1, (rnd() * 2 - 1) * 1.1] : [0, rnd() * 1.1 + 0.05, rnd() * 1.1 + 0.05];
        if (Math.max(target[1], target[2]) < 0.05 || !boundedF(power, neg, target)) continue;
        const a = mix === 1 ? rnd() * 2 * Math.PI : (0.1 + 0.8 * rnd()) * Math.PI / 2, from = [0, 1.9 * Math.cos(a), 1.9 * Math.sin(a)];
        fwd = unit(target.map((x, j) => x - from[j]));
        place = findPlace(F, [X, fix(from[1]), fix(from[2])], fwd, mix === 1 ? 1e-10 : 1e-3);
    }
    if (!place) { check(false, `beside the plane x = 0, power ${power}, mix ${mix}: no place found`); continue; }
    const cap = marginCap(place.cam, place.ownEscape), O = lib.buildRefOrbit(place.cam, cap + 2), T = compare(O, place.cam, fwd, place.D, cap, F);
    printPlace(`bulb power ${power}, mix ${mix}, 1e-40 from the plane x = 0`, { power, mix }, place, fwd, cap);
    check(good(T, 0.3), `burning twin = exact, power ${power}, mix ${mix}, the camera 1e-40 from the plane x = 0 at ${place.D.toExponential(1)} (cap ${cap}): ${say(T)}`);
    // how many of the cone's points really stand across the plane from the camera at the first iteration (its x is 1e-40)
    const right = unit(cross(fwd, Math.abs(fwd[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), up = cross(right, fwd); let across = 0;
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (fwd[0] + ((x + 0.5 - 4.5) / 9) * right[0] + ((y + 0.5 - 4.5) / 9) * up[0] < 0) across++;
    check(across >= 20 && across <= 61, `beside the plane x = 0, power ${power}, mix ${mix}: ${across} of the cone's 81 rays lie across the plane from the camera`);
}

// 5. the jet, the gradient and the navigation's ray with Burning on
{
    for (const mix of [1, 0.5]) {
        const k = kept[String(mix)], neg = negOf(mix);
        if (!k) { check(false, `burning jet, gradient and ray, mix ${mix}: no place was kept for them`); continue; }
        const { power, cam, fwd } = k;
        lib.setBulb(power); lib.applyFormula('mandelbulb', { burning: true, burnMix: mix, julia: false });
        const F = burnFormula(power, neg, null), here = F.exact(cam, 900);
        const cap = marginCap(cam, here.it), D = here.de, O = lib.buildRefOrbit(cam, cap + 2), o = lib.pertOrbitJetJS(O, [0, 0, 0], fwd, cap), h = D * 1e-5;
        const a = lib.pertOrbitJetJS(O, scl(fwd, h), fwd, o.it, true).z, b = lib.pertOrbitJetJS(O, scl(fwd, -h), fwd, o.it, true).z;
        const fd = [0, 1, 2].map((j) => (a[j] - b[j]) / (2 * h)), jl = Math.hypot(o.jet[0], o.jet[1], o.jet[2]);
        const jerr = Math.hypot(fd[0] - o.jet[0], fd[1] - o.jet[1], fd[2] - o.jet[2]) / jl;
        check(o.escaped && jerr < 1e-4, `burning jet, mix ${mix}: the vector carried with the orbit equals the finite difference of the iterate along the ray`, `relative error ${jerr.toExponential(2)}`);
        const along = o.grad[0] * fwd[0] + o.grad[1] * fwd[1] + o.grad[2] * fwd[2], radial = (o.z[0] * o.jet[0] + o.z[1] * o.jet[1] + o.z[2] * o.jet[2]) / o.r;
        check(Math.abs(along - radial) < 1e-8 * Math.max(Math.abs(radial), jl * 1e-6), `burning gradient, mix ${mix}: along the ray it equals the radial part of the carried vector`, `${along} against ${radial}`);
        lib.setCam(cam, cap);
        const ray = lib.rayFreeJS(O, fwd, cap, 0.05, 4000), at = (t: number): Twin => F.exact(addFix(cam, scl(fwd, t)), cap);
        // the end, by one of the ray's three rules (grep rayFreeJS): on a level a twentieth of its distance away; the drawn
        // solid (an orbit that does not escape within the count) just beyond it; or a creep - the larger of the ray
        // estimate and the gradient's under an eighth of that level, which on a straight dive it is long before the scalar one
        const half = at(0.5 * ray.t), end = at(ray.t), beyond = at(1.02 * ray.t), creep = lib.pertOrbitJetJS(O, scl(fwd, ray.t), fwd, cap).ray < 0.05 * 0.125 * ray.t * 1.001;
        check(ray.kind === 1 && half.escaped && half.de > 0.05 * 0.5 * ray.t && end.escaped && (end.de < 0.1 * ray.t || !beyond.escaped || creep),
            `burning ray, mix ${mix}: the navigation's ray ends on the drawn solid (${ray.t.toExponential(2)} at depth ${D.toExponential(1)}, ${ray.steps} steps)`, `half ${half.de.toExponential(2)}, end ${end.de.toExponential(2)}, kind ${ray.kind}`);
    }
}

// 6. Burning in Julia mode: one constant inside, two depths
{
    const K = [fix(0.25), fix(0.1), fix(0.05)], power = 8;
    lib.setBulb(power); lib.applyFormula('mandelbulb', { burning: true, burnMix: 1, julia: true, c: K.map(String) });
    const F = burnFormula(power, -1, K);
    let places = 0;
    const from = scl(unit([1, 0.6, 0.4]), 1.9), fwd = unit([0.05, -0.03, 0.02].map((x, j) => x - from[j]));
    let pos: bigint[] | null = from.map(fix);
    for (const depth of [1e-10, 1e-30]) {
        const p: Place | null = pos ? findPlace(F, pos, fwd, depth) : null;
        if (!p) { pos = null; continue; }
        pos = p.cam; places++;
        const cap = marginCap(p.cam, p.ownEscape), T = compare(lib.buildRefOrbit(p.cam, cap + 2), p.cam, fwd, p.D, cap, F);
        printPlace('bulb power 8, mix 1, Julia mode, K = (0.25, 0.1, 0.05)', { power, mix: 1, c: K.map(String) }, p, fwd, cap);
        check(good(T, 0.2), `burning twin = exact, Julia mode, power 8, K inside (0.25, 0.1, 0.05), ${p.D.toExponential(1)} from the surface (cap ${cap}): ${say(T)}`);
    }
    check(places === 2, `burning places, Julia mode: ${places} found on 1 ray x 2 depths`);
}
lib.applyFormula('mandelbulb', { burning: false, julia: false });

console.log(failed ? `burning-orbit: ${failed} FAILED` : 'burning-orbit: all green');
process.exit(failed ? 1 : 0);
