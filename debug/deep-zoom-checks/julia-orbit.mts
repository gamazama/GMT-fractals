/**
 * julia-orbit check: JULIA MODE of both formulas on the CPU (grep JULIA MODE in deep-zoom/renderer/core.js) -
 * the per-pixel delta orbit (`pertOrbitJS`, `boxOrbitJS` on a reference built in Julia mode) against exact
 * fixed-point orbits of the same points under z -> f(z) + K. Node only: no browser, no GPU, about a minute.
 *
 *   npx tsx debug/deep-zoom-checks/julia-orbit.mts        (npm run check:deep-zoom-julia-orbit)
 *
 * WHAT IS UNDER TEST. In Julia mode the camera's reference orbit adds one constant K where it added the camera's
 * own point, and a pixel's delta is no longer given "+ dc" every iteration: the pixel's offset only STARTS it.
 * The same functions are what `api.dz.sense`, `freeDistance`, `estimateAt`, `lookPoint` march on, and what the
 * GPU's probes are refereed against (debug/deep-zoom-direct-check.mts, the "julia, ..." lines).
 *
 * THE REFEREE shares no code with it: its own fixed-point arithmetic, no reference orbit, no delta. The bulb's
 * power by complex multiplication ((z + i rho)^n and (x + i y)^n; the renderer uses Chebyshev recurrences),
 * the box as GMT's shader writes it (engine-gmt/formulas/AmazingBox.ts). Both keep GMT's "+ 1" in the running
 * derivative, as the renderer does in Julia mode.
 *
 * HOW IT REACHES THE CODE: as ray-probe.mts and box-orbit.mts do - the same four spans of core.js lifted as
 * TEXT and run with the few names they close over. It throws if a span's first or last words are gone.
 *
 * PLACES are found here, by the referee alone: its estimate marched down a ray from outside the Julia set,
 * three tenths of itself a step (halved back when a step lands inside), in fixed point, until it reads the
 * wanted depth (1e-3, 1e-10, 1e-30, 1e-60 along each ray). The constants K: one inside each formula's set, and deep places of the app's own data taken
 * AS constants (a starter's and a kept place's camera point: constants on the surface, to 1e-17 and beyond).
 *
 * WHICH POINTS ARE GATED. As in box-orbit.mts a point in a crevice finer than 1e-6 of its distance, or inside,
 * is counted and not gated. One more rule here, for the bulb: a point is gated only where f64 can settle it,
 * and that is MEASURED, not assumed - the twin is run three times more, the offset moved by 1e-13 of its length
 * along each axis, and a point whose estimate moves by more than 1e-9 for any of them is "ill-conditioned" and
 * counted apart (rounding is 1e-16 a step, in every direction and at every iteration: at 1e-7 a place still had 12 points 3e-6 off). The bulb's Julia
 * orbits at constants ON its surface have many such points at depth - there the orbit stretches space up to
 * 1e7 times more in one direction than in the next (the study of 2026-10-11) - so a place of that kind is
 * gated on as little as a twentieth of its points. A wrong step is not a matter of a twentieth: it moves every
 * point. The box has one or two such points a place, of 1134: where the nudge carries the point across a fold.
 *
 * FALSIFICATION RECORD, 2026-10-12, one break in deep-zoom/renderer/core.js, restored byte for byte (sha-256):
 *   - the reference orbit adding the camera's own point where it must add K
 *     (`const cOfHP = (P) => (juliaOn ? juliaHP : P);` -> `(P) => (P)`)       -> 62 red of 86: all 60 "julia twin =
 *       exact" lines (every gated point off, or the camera's orbit read as never escaping), "julia jet" (relative
 *       error 1.0) and "julia ray". The seam lines, the two controls, the "places" and the "far" lines stay green:
 *       none of them runs a reference orbit in Julia mode against the referee.
 *   Not broken on purpose here (the build's three breaks were spent): the pixel's "+ dc" left in (`pertOrbitJS`,
 *   `boxOrbitJS`), the jet's "+ v", the gradient's sum. The GPU's factor was: debug/deep-zoom-direct-check.mts.
 * 2026-10-12, THE CONSTANT'S ROW (deep-zoom/features/formula.ts), one break, restored byte for byte (sha-256):
 *   - `juliaRowsOf` (the shell's three numbers for a constant held as strings) made to answer 0, 0, 0
 *     -> 1 red of 89: "rows: what the Constant row shows for a deep constant is the three doubles the renderer
 *       reads it as ..." (0 0 0 against 0.3 -1.25 1e-9).
 *   Not broken on purpose: the two "seam: three finite numbers ..." lines (`setJuliaC` taking numbers).
 * BEFORE IT WAS A CHECK the same comparison ran as a study (debug/scratch/formula-next/julia-twin.mts, 2026-10-11,
 * on text patches of the kernel as it then was): 54 box places and 62 bulb places.
 */
import { readFileSync } from 'node:fs';
import { PLACES } from '../../deep-zoom/data/places.ts';
import { STARTERS } from '../../deep-zoom/data/starters.ts';
import { BOX_STARTERS } from '../../deep-zoom/data/boxStarters.ts';
import { juliaRowsOf } from '../../deep-zoom/features/formula.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type V3 = [number, number, number];
interface BoxParams { scale?: number; minR?: number; fold?: number; fixedR?: number; rot?: number[] }
interface FormulaParams extends BoxParams { julia?: boolean; c?: unknown }
interface Orbit { len: number; Rk: number[]; DRk: number[]; julia?: boolean; box?: unknown }
interface Twin { de: number; escaped: boolean; r: number; it: number }
interface JetOut extends Twin { z: V3; jet: V3; grad: V3 }
interface Lib {
    buildRefOrbit(cam: bigint[], lenMax: number): Orbit;
    pertOrbitJS(O: Orbit, dc: V3, maxIter: number, fixed?: boolean): Twin;
    pertOrbitJetJS(O: Orbit, dc: V3, rd: V3, maxIter: number, fixed?: boolean): JetOut;
    rayFreeJS(O: Orbit, rd: V3, maxIter: number, tol: number, maxSteps: number): { t: number; kind: number; steps: number };
    applyFormula(kind: string, params?: FormulaParams): boolean;
    boxFar(): number;
    julia(): { on: boolean; c: string[]; f: number[] };
    setBulb(power: number): void;
    setCam(c: bigint[], iters: number): void;
}

// ── lift the spans (the same four ray-probe.mts and box-orbit.mts lift) ──
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
    return { buildRefOrbit, pertOrbitJS, pertOrbitJetJS, rayFreeJS, applyFormula, boxFar,
        julia: () => ({ on: juliaOn, c: juliaHP.map(String), f: juliaF.slice() }),
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
/** An orbit of the explicit point `pos`: c is K (Julia mode), or the point itself when K is null. */
interface Formula { exact(pos: bigint[], cap: number): Twin; far: number }
function bulbFormula(power: number, K: bigint[] | null): Formula {
    return { far: 8, exact(pos, cap) {
        const c = K ?? pos;
        let z = pos.slice(), dr = 1, it = 0, escaped = false, r = Math.sqrt(num(norm2(z)));
        while (it < cap) {
            dr = power * Math.pow(r, power - 1) * dr + 1;                                  // GMT's rule, the "+ 1" kept in both modes
            const w = bulbPow(z, power);
            z = [w[0] + c[0], w[1] + c[1], w[2] + c[2]]; it++;
            r = Math.sqrt(num(norm2(z)));
            if (r > 2) { escaped = true; break; }
        }
        return { de: 0.5 * r * Math.log(Math.max(r, 1e-300)) / dr, escaped, r, it };
    } };
}
function boxFormula(p: Required<BoxParams>, K: bigint[] | null): Formula {
    const m2 = fix(p.minR * p.minR), F2 = fix(p.fixedR * p.fixedR), kMax = div(F2, m2), S = fix(p.scale), aS = Math.abs(p.scale), L = fix(p.fold);
    return { far: 60, exact(pos, cap) {
        const c = K ?? pos;
        let z = pos.slice(), dr = 1, it = 0, escaped = false, z2 = 0;
        while (it < cap) {
            const w = z.map((x) => { const cl = x > L ? L : x < -L ? -L : x; return 2n * cl - x; });       // clamp(z, -L, L) * 2 - z
            const r2 = norm2(w);
            let k = r2 === 0n ? kMax : div(F2, r2);                                                    // clamp(fixedR2 / r2, 1, fixedR2 / minR2)
            if (k < ONE) k = ONE;
            if (k > kMax) k = kMax;
            z = w.map((x, i) => mul(mul(x, k), S) + c[i]); dr = dr * num(k) * aS + 1; it++;
            z2 = num(norm2(z));
            if (z2 > 1e6) { escaped = true; break; }
        }
        const r = Math.sqrt(z2);
        return { de: (r - 1) / dr, escaped, r, it };
    } };
}

// ── vectors, places, the cone ──
const unit = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scl = (a: number[], s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
interface Place { cam: bigint[]; D: number; ownEscape: number }
function findPlace(F: Formula, from: bigint[], fwd: V3, depth: number): Place | null {
    let pos = from.slice(), gone = 0, o = F.exact(pos, 900);
    if (!o.escaped || !(o.de > 0)) return null;
    for (let steps = 0; steps < 20000 && gone < F.far; ) {
        if (o.de <= depth) return { cam: pos, D: o.de, ownEscape: o.it };
        let step = 0.3 * o.de, next = pos, on = o, ok = false;
        for (let h = 0; h < 12; h++, step *= 0.5) {
            next = addFix(pos, scl(fwd, step)); on = F.exact(next, 900); steps++;
            if (on.escaped && on.de > 0) { ok = true; break; }
        }
        if (!ok) return null;
        pos = next; o = on; gone += step;
    }
    return null;
}
/** the renderer's margin rule (grep ITERATIONS AS A MARGIN in core.js), read off the camera's own orbit */
function marginCap(cam: bigint[], esc: number, escR: number, ceiling: number): number {
    const O = lib.buildRefOrbit(cam, esc + 4);
    let ke = -1;
    for (let k = 0; k < O.len; k++) if (O.Rk[k] > escR) { ke = k; break; }
    if (ke < 0) return Math.min(ceiling, esc + 40);
    const grow = ke > 0 ? Math.log(Math.max(O.DRk[ke], 2)) / ke : 2;
    return Math.min(ceiling, ke + 2 + Math.ceil(20.7 / Math.max(grow, 0.2)));
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
const fullBox = (p: BoxParams): Required<BoxParams> => ({ scale: 2, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0], ...p });
const str = (K: bigint[]): string[] => K.map(String);
const DIRS: V3[] = [unit([1, 0.6, 0.4]), unit([0.2, -1, 0.35])];
const DEPTHS = [1e-3, 1e-10, 1e-30, 1e-60];
/** JULIA_PRINT_PLACES=1: every place found, in the form debug/deep-zoom-direct-check.mts carries its Julia views as data */
const printPlace = (name: string, formula: Record<string, unknown>, K: bigint[], p: Place, fwd: V3, cap: number): void => {
    if (process.env.JULIA_PRINT_PLACES) console.log('PLACE ' + JSON.stringify({ name, ...formula, c: str(K), view: { cam: p.cam.map(String), yaw: Math.atan2(fwd[2], fwd[0]), pitch: Math.asin(fwd[1]), iters: cap }, depth: p.D }));
};

// 1. the seam
{
    const K = [fix(0.25), fix(0.1), fix(0.05)];
    check(lib.julia().on === false, 'seam: the renderer starts in Mandelbrot mode');
    check(lib.applyFormula('mandelbulb', { julia: true, c: str(K) }) === true && lib.julia().on, 'seam: Julia mode with a constant reports a change');
    check(lib.applyFormula('mandelbulb', { julia: true, c: str(K) }) === false, 'seam: the same mode and constant again report none');
    check(lib.julia().c.join() === str(K).join(), 'seam: the constant comes back string for string');
    check(lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20).julia === true, 'seam: an orbit built in Julia mode carries its mode');
    check(lib.applyFormula('mandelbulb', { c: ['1', '2'] }) === false && lib.applyFormula('mandelbulb', { c: [0.3, '1', 2] }) === false && lib.applyFormula('mandelbulb', { c: [0.3, NaN, 0.05] }) === false
        && lib.applyFormula('mandelbulb', { c: ['0.25', '1', '2'] }) === false && lib.julia().c.join() === str(K).join(),
        'seam: a constant that is neither three whole numbers written as text nor three finite numbers is refused and changes nothing');
    // THE CONSTANT'S ROW (2026-10-12; deep-zoom/features/formula.ts): a host's number rows set the constant from doubles
    // and show it as doubles. Until that day three numbers were refused.
    const N: V3 = [0.3, -1.25, 1e-9];
    check(lib.applyFormula('mandelbulb', { c: N }) === true && lib.julia().c.join() === str(N.map(fix)).join() && lib.julia().f.join() === N.join(),
        'seam: three finite numbers are taken as the constant - each the fixed-point number of that double - and read back as the same doubles', lib.julia().c.join());
    check(lib.applyFormula('mandelbulb', { c: N }) === false, 'seam: the same three numbers again report no change');
    const DEEP = [fix(0.3) + 12345n, fix(-1.25) - 7n, fix(1e-9) + 3n], rows = juliaRowsOf(str(DEEP) as [string, string, string]);
    check(lib.applyFormula('mandelbulb', { c: str(DEEP) }) === true && lib.julia().c.join() === str(DEEP).join()
        && rows.juliaX === lib.julia().f[0] && rows.juliaY === lib.julia().f[1] && rows.juliaZ === lib.julia().f[2] && rows.juliaX === 0.3,
        'rows: what the Constant row shows for a deep constant is the three doubles the renderer reads it as (rows that show it send nothing)',
        `${rows.juliaX} ${rows.juliaY} ${rows.juliaZ} against ${lib.julia().f.join(' ')}`);
    check(lib.applyFormula('mandelbulb', { c: str([fix(0.3), fix(0.1), fix(0.05)]) }) === true, 'seam: a new constant alone reports a change');
    check(lib.applyFormula('mandelbulb', { julia: false }) === true && lib.buildRefOrbit([fix(0.3), fix(0.2), fix(0.1)], 20).julia === false, 'seam: back in Mandelbrot mode an orbit carries none');
}

// 2. the control: Mandelbrot mode, the same harness, two of the renderer's own places
for (const [name, v] of [[STARTERS[3].name, STARTERS[3].view], [PLACES[2].name, PLACES[2].state.view]] as Array<[string, { cam: string[]; yaw: number; pitch: number; power: number }]>) {
    lib.applyFormula('mandelbulb', { julia: false }); lib.setBulb(v.power);
    const F = bulbFormula(v.power, null), cam = v.cam.map(BigInt), here = F.exact(cam, 900), cap = marginCap(cam, here.it, 2, 400);
    const cp = Math.cos(v.pitch), fwd: V3 = [cp * Math.cos(v.yaw), Math.sin(v.pitch), cp * Math.sin(v.yaw)];
    const T = compare(lib.buildRefOrbit(cam, cap + 2), cam, fwd, here.de, cap, F);
    check(good(T, 0.5), `control, Mandelbrot mode, "${name}" (${here.de.toExponential(1)}): ${say(T)}`);
}

// 3. the bulb in Julia mode
let lastBulb: { cam: bigint[]; fwd: V3; D: number; cap: number; F: Formula } | null = null;
const BULB_K: Array<[string, number, bigint[], number]> = [
    ['K inside the bulb (0.25, 0.1, 0.05)', 8, [fix(0.25), fix(0.1), fix(0.05)], 0.2],
    [`K = the starter "${STARTERS[3].name}" camera`, 8, STARTERS[3].view.cam.map(BigInt), 0.05],
    [`K = the starter "${STARTERS[5].name}" camera`, 4, STARTERS[5].view.cam.map(BigInt), 0.05],
    [`K = the kept place "${PLACES[0].name}" camera`, 2, PLACES[0].state.view.cam.map(BigInt), 0.05],
];
for (const [label, power, K, share] of BULB_K) {
    lib.setBulb(power); lib.applyFormula('mandelbulb', { julia: true, c: str(K) });
    const F = bulbFormula(power, K);
    let places = 0;
    for (const [di, d] of DIRS.entries()) {
        const from = scl(d, 1.9), fwd = unit([0.05, -0.03, 0.02].map((x, j) => x - from[j]));
        let pos: bigint[] | null = from.map(fix);
        for (const depth of DEPTHS) {
            const p: Place | null = pos ? findPlace(F, pos, fwd, depth) : null;
            if (!p) { pos = null; continue; }
            pos = p.cam; places++;
            const cap = marginCap(p.cam, p.ownEscape, 2, 400), T = compare(lib.buildRefOrbit(p.cam, cap + 2), p.cam, fwd, p.D, cap, F);
            printPlace(`bulb power ${power}, ${label}, ray ${di + 1}`, { kind: 'mandelbulb', power }, K, p, fwd, cap);
            check(good(T, share), `julia twin = exact, bulb power ${power}, ${label}, ray ${di + 1}, ${p.D.toExponential(1)} from the surface (own orbit escapes on ${p.ownEscape}, cap ${cap}): ${say(T)}`);
            if (power === 8 && label.startsWith('K inside') && depth === 1e-30) lastBulb = { cam: p.cam, fwd, D: p.D, cap, F };
        }
    }
    check(places >= (power === 2 ? 3 : 6), `julia places, bulb power ${power}, ${label}: ${places} found on 2 rays x 4 depths`);
}

// 4. the jet, the gradient and the navigation's ray in Julia mode (a well-conditioned place: K inside the bulb)
if (lastBulb) {
    const { cam, fwd, D, cap, F } = lastBulb;
    lib.setBulb(8); lib.applyFormula('mandelbulb', { julia: true, c: str([fix(0.25), fix(0.1), fix(0.05)]) });
    const O = lib.buildRefOrbit(cam, cap + 2), o = lib.pertOrbitJetJS(O, [0, 0, 0], fwd, cap), h = D * 1e-5;
    const a = lib.pertOrbitJetJS(O, scl(fwd, h), fwd, o.it, true).z, b = lib.pertOrbitJetJS(O, scl(fwd, -h), fwd, o.it, true).z;
    const fd = [0, 1, 2].map((j) => (a[j] - b[j]) / (2 * h)), jl = Math.hypot(o.jet[0], o.jet[1], o.jet[2]);
    const jerr = Math.hypot(fd[0] - o.jet[0], fd[1] - o.jet[1], fd[2] - o.jet[2]) / jl;
    check(o.escaped && jerr < 1e-4, 'julia jet: the vector carried with the orbit equals the finite difference of the iterate along the ray (no "+ v")', `relative error ${jerr.toExponential(2)}`);
    const along = o.grad[0] * fwd[0] + o.grad[1] * fwd[1] + o.grad[2] * fwd[2], radial = (o.z[0] * o.jet[0] + o.z[1] * o.jet[1] + o.z[2] * o.jet[2]) / o.r;
    check(Math.abs(along - radial) < 1e-8 * Math.max(Math.abs(radial), jl * 1e-6), 'julia gradient: along the ray it equals the radial part of the carried vector (no sum over the iterations)', `${along} against ${radial}`);
    lib.setCam(cam, cap);
    const ray = lib.rayFreeJS(O, fwd, cap, 0.05, 4000), at = (t: number): Twin => F.exact(addFix(cam, scl(fwd, t)), cap);
    const half = at(0.5 * ray.t), end = at(ray.t);
    check(ray.kind === 1 && half.escaped && half.de > 0.05 * 0.5 * ray.t && end.escaped && end.de < 0.1 * ray.t,
        `julia ray: the navigation's ray ends on the drawn solid (${ray.t.toExponential(2)} at depth ${D.toExponential(1)}, ${ray.steps} steps)`, `half ${half.de.toExponential(2)}, end ${end.de.toExponential(2)}, kind ${ray.kind}`);
} else check(false, 'julia jet, gradient and ray: no place was kept for them');

// 5. the box in Julia mode
const BOX_K: Array<[string, BoxParams, bigint[]]> = [
    ['scale 2, K inside (0.1, 0.2, 0.1)', { scale: 2 }, [fix(0.1), fix(0.2), fix(0.1)]],
    [`scale 2, K = the card "${BOX_STARTERS[3].name}" camera`, { scale: 2 }, BOX_STARTERS[3].view.cam.map(BigInt)],
    ['scale -1.5, K inside (0.1, 0.2, 0.1)', { scale: -1.5 }, [fix(0.1), fix(0.2), fix(0.1)]],
    [`scale -1.5, K = the card "${BOX_STARTERS[1].name}" camera`, { scale: -1.5 }, BOX_STARTERS[1].view.cam.map(BigInt)],
];
for (const [label, bp, K] of BOX_K) {
    const P = fullBox(bp), aS = Math.abs(P.scale), bound = (2 * Math.sqrt(3) * P.fold * aS + Math.hypot(...K.map(num))) / (aS - 1);
    lib.applyFormula('mandelbox', { ...P, julia: true, c: str(K) });
    const F = boxFormula(P, K); F.far = 2.5 * bound;
    let places = 0;
    for (const [di, d] of DIRS.entries()) {
        const from = scl(d, 1.15 * bound), fwd = unit([0.05, -0.03, 0.02].map((x, j) => x - from[j]));
        let pos: bigint[] | null = from.map(fix);
        for (const depth of DEPTHS) {
            const p: Place | null = pos ? findPlace(F, pos, fwd, depth) : null;
            if (!p) { pos = null; continue; }
            pos = p.cam; places++;
            const cap = marginCap(p.cam, p.ownEscape, 1000, 500), T = compare(lib.buildRefOrbit(p.cam, cap + 2), p.cam, fwd, p.D, cap, F);
            printPlace(`box ${label}, ray ${di + 1}`, { kind: 'mandelbox', scale: P.scale }, K, p, fwd, cap);
            check(good(T, 0.5), `julia twin = exact, box ${label}, ray ${di + 1}, ${p.D.toExponential(1)} from the surface (own orbit escapes on ${p.ownEscape}, cap ${cap}): ${say(T)}`);
        }
    }
    check(places === 8, `julia places, box ${label}: ${places} found on 2 rays x 4 depths`);
    // THE BOX'S JULIA SET IS LARGER THAN THE BOX: the far distance must hold the proven ball, wherever the camera stands
    lib.setCam([0n, 0n, 0n], 14);
    check(lib.boxFar() >= bound && lib.boxFar() < 1.2 * bound, `julia far, box ${label}: from the origin a ray is given up ${lib.boxFar().toFixed(1)} out, beyond the ball of radius ${bound.toFixed(1)} that holds every bounded orbit`);
}
{
    // seen in the study: at scale -1.5 with a small K a point 6 units out is INSIDE the Julia set (the box itself ends near 2.2)
    const P = fullBox({ scale: -1.5 }), K = [fix(0.1), fix(0.2), fix(0.1)], at = scl(unit([1, 0.6, 0.4]), 6).map(fix);
    check(!boxFormula(P, K).exact(at, 900).escaped && boxFormula(P, null).exact(at, 900).escaped, 'julia far: a point 6 units out is in the scale -1.5 Julia set of a small K, and outside the Mandelbox itself');
}
lib.applyFormula('mandelbulb', { julia: false });

console.log(failed ? `julia-orbit: ${failed} FAILED` : 'julia-orbit: all green');
process.exit(failed ? 1 : 0);
