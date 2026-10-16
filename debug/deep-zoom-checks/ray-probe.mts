/**
 * ray-probe check: the free distance along a ray, as navigation asks the renderer for it
 * (`api.dz.sense` / `api.dz.freeDistance`; grep THE FREE DISTANCE ALONG A RAY in
 * deep-zoom/renderer/core.js). Node only: no browser, no GPU, about 2 s.
 *
 *   npx tsx debug/deep-zoom-checks/ray-probe.mts        (npm run check:deep-zoom-ray-probe)
 *
 * HOW IT REACHES THE CODE. core.js is one closure that needs a WebGL context to start, so this
 * check lifts two spans of it as TEXT - the fixed-point reference-orbit builder and the CPU kernel
 * with the probe - and runs them with the handful of names they close over (the power, the phase,
 * the camera). It throws if a span's first or last words are no longer in the file. What it cannot
 * see: `api.dz.sense` itself (two lines over `senseBundle`) and the choice of reference orbit
 * while a frame is being drawn (`probeOrbit` returns the frame's own; here it always builds one).
 *
 * THE REFEREE is not the code under test: the renderer's older scalar estimate (`pertOrbitJS`),
 * stepped at a tenth of itself and halved back onto the solid when a sample lands inside.
 *
 * VIEWS: the owner's kept places (deep-zoom/data/places.ts), the starter views
 * (deep-zoom/data/starters.ts) - the last of them is his power-4 place, 3.4e-76 from a surface that
 * is BEHIND the camera - and the start view.
 *
 * FALSIFICATION RECORD, 2026-10-09, one break per run in deep-zoom/renderer/core.js:
 *   - `pushJetJS`: `A*ca-B*sa` -> `A*ca+B*sa`                              -> 6 red (both "jet:" lines, relative error 31; then the rays it steers)
 *   - `pushJetJS`: the phase left out of `a` (`NP*th+phaseTheta` -> `NP*th`) -> 1 red ("jet: and with a phase ...", error 0.59)
 *   - `rayFreeJS`: the halving back onto the solid removed                  -> 1 red ("drawn surface: and the ray still ends on the drawn
 *                                                                              surface": the ray 2.1e-27, the referee 5.1e-30). The first
 *                                                                              version of this check had no such line and stayed GREEN:
 *                                                                              at the saved views no sample of a ray lands inside.
 *   - `rayFreeJS`: the step `*0.5` -> `*4`                                  -> 7 red (39 rays past the surface, the worst at 34 times the distance)
 *   - `senseBundle`: `near: k.near - moved` -> `near: k.near`               -> 1 red ("kept: after a move of 2 % ...")
 *   - `senseBundle`: the `k.iters === cam.iters` test removed               -> 1 red ("kept: a changed iteration count ...")
 *   - `senseBundle`: an open ray not carried on (`open.length >= 0`)        -> 1 red ("wall behind: asked again it reads on ...": 5.6e-71 after 40 asks)
 *   - `senseRead`: `second: ts[1]` -> `second: ts[0]`                       -> 1 red ("bundle: near is the nearest ...")
 *   - `pertOrbitJetJS`: `ray: Math.max(E, G)` -> `ray: E` (the ray estimate alone, as it was until the owner's
 *     power-9 place)                                                        -> 2 red ("gradient: on the pole axis ...", "gradient: and a ray sideways ...")
 *   - `pullGradJS`: `-kp*y` -> `+kp*y`                                      -> 1 red ("gradient: along the ray it equals ...")
 *   - `senseRead`: `open` counting every open ray (the `r.t <= SENSE_FAR` test removed)
 *                                                                           -> 1 red ("open: away from the bulb ... and finished")
 * 2026-10-11, the three "iterations: ..." lines at the foot (the iteration ceiling; five one-liners of core.js
 * lifted as text, nothing to do with the ray probe), one break, restored byte for byte (sha-256):
 *   - `api.dz.setView`: `Math.min(itersMax(), v.iters|0)` -> `Math.min(boxOn() ? BOX_ITER_MAX : 160, v.iters|0)`
 *     (as it was until that day)                                            -> 1 red ("iterations: under the ray march ...": 300,400,160,160,4)
 *   The ray-bits-0 line and the Mandelbox line passed in that run too and were not broken on purpose.
 * 2026-10-16, THE NAVIGATION'S JUMP (grep it in core.js: each orbit of the ray starts where its delta stops mapping
 * linearly; the referee's orbits are whole), two breaks, restored byte for byte (sha-256):
 *   - `BULB_JUMP_TAU` 1e-5 -> 1 (every jump far too long)                  -> 1 red ("ray: no ray ends past the surface ...": 7 rays, the worst at 1.27)
 *   - the jet at the jump left as rd (`jet = mv3(M, rd)` -> `jet = rd.slice()`) -> 8 red ("jet: and with a phase ...", the pole-axis
 *                                                                              gradient line, "ray: no ray ends past ...": 39 rays, the worst at 16.3)
 */
import { readFileSync } from 'node:fs';
import { PLACES } from '../../deep-zoom/data/places.ts';
import { STARTERS } from '../../deep-zoom/data/starters.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

type V3 = [number, number, number];
interface View { cam: string[]; yaw: number; pitch: number; iters: number; power: number; phase?: number[] }
interface Orbit { len: number; Rk: number[]; DRk: number[] }
interface OrbitOut { de: number; escaped: boolean; r: number; it: number; z: V3; jet: V3; E: number; grad: V3; G: number; ray: number }
interface Sense { near: number; second: number; hits: number; open: number; inside: boolean; marched: boolean }
interface Lib {
    buildRefOrbit(cam: bigint[], lenMax: number): Orbit;
    pertOrbitJS(O: Orbit, dc: V3, maxIter: number, fixed?: boolean): { de: number; escaped: boolean };
    pertOrbitJetJS(O: Orbit, dc: V3, rd: V3, maxIter: number, fixed?: boolean): OrbitOut;
    rayFreeJS(O: Orbit, rd: V3, maxIter: number, tol: number, maxSteps: number, t0?: number, prev0?: number): { t: number; prev: number; kind: number; steps: number };
    senseBundle(axis: V3 | null, opt?: { slot?: string; reuse?: number; tol?: number; maxSteps?: number }): Sense;
    senseDirs(axis: V3): V3[];
    place(v: View, phase?: [number, number]): void;
    move(d: V3): void;
    setIters(n: number): void;
    iters(): number;
    camHP(): bigint[];
}

// ── lift the two spans ──
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
    return { buildRefOrbit, pertOrbitJS, pertOrbitJetJS, rayFreeJS, senseBundle, senseDirs,
        place: (v, phase) => { nPower = v.power; phaseTheta = phase ? phase[0] : (v.phase ? v.phase[0] : 0); phasePhi = phase ? phase[1] : (v.phase ? v.phase[1] : 0);
            camHP = v.cam.map(BigInt); cam.iters = v.iters; cam.yaw = v.yaw; cam.pitch = v.pitch; },
        move: (d) => { camHP = camHP.map((c, j) => c + hp.fromNum(d[j])); },
        setIters: (n) => { cam.iters = n; },
        iters: () => cam.iters,
        camHP: () => camHP };
`)() as Lib;

// ── the views, each with the iteration count the renderer's own rule would have raised it to ──
/** A coordinate as the camera holds it: 256 fractional bits, as a decimal string. */
const fixed = (x: number): string => String(BigInt(Math.round(x * 2 ** 40)) << 216n);
// Never exactly on the z axis: an azimuth does not exist there (grep POLE GUARD in core.js).
const START: View = { cam: [fixed(1e-9), '0', fixed(2.6)], yaw: -Math.PI / 2, pitch: 0, iters: 14, power: 8 };
const views: Array<{ name: string; v: View }> = [
    { name: 'the start view', v: START },
    ...STARTERS.map((s) => ({ name: s.name, v: s.view as View })),
    ...PLACES.map((p) => ({ name: p.name, v: p.state.view as View })),
];
const forward = (v: View): V3 => { const cp = Math.cos(v.pitch); return [cp * Math.cos(v.yaw), Math.sin(v.pitch), cp * Math.sin(v.yaw)]; };
const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
/** The renderer's estimate at the camera (grep "distance probe" in core.js). */
function cameraEstimate(O: Orbit): number {
    let ke = O.len - 1;
    for (let k = 0; k < O.len; k++) if (O.Rk[k] > 2) { ke = k; break; }
    return Math.max(0, 0.5 * O.Rk[ke] * Math.log(Math.max(O.Rk[ke], 1e-300)) / O.DRk[ke]);
}
/** Place the camera at a view; returns its reference orbit and the estimate at the camera. */
function enter(v: View, phase?: [number, number]): { O: Orbit; estimate: number } {
    lib.place(v, phase);
    let O = lib.buildRefOrbit(lib.camHP(), lib.iters() + 2), estimate = cameraEstimate(O);
    const auto = estimate > 0 ? Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(estimate)))) : lib.iters();
    if (auto > lib.iters()) { lib.setIters(auto); O = lib.buildRefOrbit(lib.camHP(), auto + 2); estimate = cameraEstimate(O); }
    return { O, estimate };
}
/** The referee ray: a tenth of the scalar estimate a step, halved back onto the solid. */
function referee(O: Orbit, rd: V3, iters: number): { t: number; kind: 'hit' | 'open' | 'inside' } {
    let t = 0, prev = 0, cap = 0;
    for (let s = 0; s < 200000; s++) {
        const o = lib.pertOrbitJS(O, scl(rd, t), iters);
        if (!o.escaped || !(o.de > 0)) {
            if (t === 0) return { t: 0, kind: 'inside' };
            let lo = prev, hi = t;
            for (let b = 0; b < 60 && hi - lo > 1e-4 * hi; b++) { const tm = 0.5 * (lo + hi), om = lib.pertOrbitJS(O, scl(rd, tm), iters); if (!om.escaped || !(om.de > 0)) hi = tm; else lo = tm; }
            return { t: lo, kind: 'hit' };
        }
        if (t > 0 && o.de < 2e-3 * t) return { t, kind: 'hit' };
        if (t > 8) return { t, kind: 'open' };
        let step = o.de * 0.1;
        if (cap === 0) cap = o.de * 0.05;
        if (step > Math.max(cap, t)) step = Math.max(cap, t);
        cap *= 1.25;
        prev = t;
        t += step;
    }
    return { t, kind: 'open' };
}

// ── jet: the carried vector is the derivative of the iterate along the ray ──
function jetError(v: View, phase?: [number, number]): number {
    const { O } = enter(v, phase);
    const rd = forward(v), iters = lib.iters();
    const hit = lib.rayFreeJS(O, rd, iters, 0.05, 64);
    let worst = 0;
    for (const share of [0, 0.3, 0.7, 0.95]) {
        const t = hit.t * share;
        const o = lib.pertOrbitJetJS(O, scl(rd, t), rd, iters);
        if (!o.escaped) continue;
        const h = Math.max(o.E, 1e-300) * 1e-4;
        const a = lib.pertOrbitJetJS(O, scl(rd, t + h), rd, o.it, true).z, b = lib.pertOrbitJetJS(O, scl(rd, t - h), rd, o.it, true).z;
        const fd: V3 = [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h), (a[2] - b[2]) / (2 * h)];
        worst = Math.max(worst, len([fd[0] - o.jet[0], fd[1] - o.jet[1], fd[2] - o.jet[2]]) / len(o.jet));
    }
    return worst;
}
{
    let worst = 0;
    for (const { v } of views) worst = Math.max(worst, jetError(v));
    check(worst < 1e-4, `jet: the vector carried with the orbit equals the finite difference of the iterate along the ray, at ${views.length} views (powers 2, 4, 8)`, `worst relative error ${worst.toExponential(2)}`);
    let phased = 0;
    for (const { v } of views.slice(0, 4)) phased = Math.max(phased, jetError(v, [0.3, -0.2]));
    check(phased < 1e-4, 'jet: and with a phase on both angles', `worst relative error ${phased.toExponential(2)}`);
}

// ── gradient: the second estimate a ray steps by, and the place that needed it ──
{
    // grad . rd and z^ . jet are the same number (how fast the escaping radius changes along the ray), reached two ways.
    let worst = 0;
    for (const [i, { v }] of views.entries()) {
        const { O } = enter(v, i < 4 ? [0.3, -0.2] : undefined);
        const rd = forward(v), o = lib.pertOrbitJetJS(O, [0, 0, 0], rd, lib.iters());
        if (!o.escaped) continue;
        const along = o.grad[0] * rd[0] + o.grad[1] * rd[1] + o.grad[2] * rd[2], radial = (o.z[0] * o.jet[0] + o.z[1] * o.jet[1] + o.z[2] * o.jet[2]) / o.r;
        worst = Math.max(worst, Math.abs(along - radial) / Math.max(Math.abs(radial), len(o.jet) * 1e-6));
    }
    check(worst < 1e-8, `gradient: along the ray it equals the radial part of the carried vector, at ${views.length} views (four with a phase)`, `worst relative difference ${worst.toExponential(2)}`);

    // The owner's "navigation error" place, 2026-10-09: power 9, a theta phase, the camera 3e-5 from the pole axis.
    // The ray estimate alone read 7.9e-5 ahead (the solid is 2.3e-4 away) and 5.7e-7 sideways (0.53 away).
    const POLE: View = { power: 9, iters: 14, yaw: 4.672714459592559, pitch: -0.125782234694118,
        cam: ['1045507870444327203643905949574513453933117855847290941416464801270333440', '3187620729426300654784347974141872565367634436226280355534665186973581312', '107572381174902257437865052021319054150741217940668403970679567291730098126848'] };
    const { O } = enter(POLE, [-1.552, 0]);
    const iters = lib.iters(), f = forward(POLE), side: V3 = [Math.sin(POLE.yaw), 0, -Math.cos(POLE.yaw)];
    const ahead = lib.rayFreeJS(O, f, iters, 0.05, 64), aheadRef = referee(O, f, iters);
    const beside = lib.rayFreeJS(O, side, iters, 0.05, 400), besideRef = referee(O, side, iters);
    check(ahead.kind === 1 && aheadRef.kind === 'hit' && ahead.t > 0.7 * aheadRef.t && ahead.t < 1.02 * aheadRef.t,
        'gradient: on the pole axis under a theta phase the ray ahead reads the solid, not the iterate\'s swing round the axis', `${ahead.t.toExponential(2)} in ${ahead.steps} steps, the referee ${aheadRef.t.toExponential(2)}`);
    // Sideways the nearest thing is a graze 0.45 away (inside the ray's twentieth, outside the referee's 500th).
    check(beside.t > 0.1 && (besideRef.kind !== 'hit' || beside.t < 1.02 * besideRef.t),
        'gradient: and a ray sideways from there runs a tenth of a unit or more (it stopped at 5.6e-7)', `${beside.t.toExponential(2)} in ${beside.steps} steps, the referee ${besideRef.kind} ${besideRef.t.toExponential(2)}`);
}

// ── ray: the cheap ray against the referee ──
{
    let rays = 0, beyond = 0, off = 0, steps = 0, worstBeyond = 0, worstOff = 0, kinds = 0;
    for (const { name, v } of views) {
        const { O } = enter(v);
        const iters = lib.iters();
        for (const rd of lib.senseDirs(forward(v))) {
            const got = lib.rayFreeJS(O, rd, iters, 0.05, 64), ref = referee(O, rd, iters);
            rays++; steps += got.steps;
            const gotKind = got.kind === 1 ? 'hit' : got.kind === 2 ? 'inside' : 'open';
            if (ref.kind === 'hit' && gotKind === 'open' && got.t <= ref.t) continue;   // out of steps short of the surface: a lower bound, as promised
            if (gotKind !== ref.kind) { kinds++; console.log(`        ${name}: the ray says ${gotKind} at ${got.t.toExponential(2)}, the referee ${ref.kind} at ${ref.t.toExponential(2)}`); continue; }
            if (ref.kind !== 'hit') continue;
            const ratio = got.t / ref.t;
            if (ratio > 1.02) { beyond++; worstBeyond = Math.max(worstBeyond, ratio); }
            if (ratio < 0.7) { off++; worstOff = Math.min(worstOff || 1, ratio); }
        }
    }
    check(kinds === 0, `ray: ${rays} rays (7 a view) end the way the referee's do: on the surface, open, or inside`, `${kinds} differ`);
    check(beyond === 0, 'ray: no ray ends past the surface the referee finds (2 % allowed)', `${beyond} rays, the worst at ${worstBeyond.toFixed(3)} of the distance`);
    check(off === 0, 'ray: every ray lands on the last 30 % of the way to it (a ray may stop short, never long)', `${off} rays, the shortest at ${worstOff.toFixed(2)} of the distance`);
    check(steps / rays < 64, `ray: ${(steps / rays).toFixed(0)} orbit runs a ray on average, under the 64 it is allowed`);
}

// ── next to the drawn surface: the estimate reads the true fractal, the ray must end on what is drawn ──
{
    // The power-2 place, flown towards its surface in ten strides of 0.9 of the way (iterations as saved, 86): by
    // then the drawn solid is the 86-iteration one and the estimate at the camera reads many times the free distance.
    const v = PLACES[0].state.view as View;
    const rd = forward(v);
    let { O, estimate } = enter(v);
    const iters = lib.iters();
    for (let i = 0; i < 10; i++) {
        const free = referee(O, rd, iters);
        if (free.kind !== 'hit') break;
        lib.move(scl(rd, free.t * 0.9));
        O = lib.buildRefOrbit(lib.camHP(), iters + 2);
        estimate = cameraEstimate(O);
    }
    const ref = referee(O, rd, iters), got = lib.rayFreeJS(O, rd, iters, 0.05, 64);
    check(ref.kind === 'hit' && estimate > ref.t * 3, 'drawn surface: ten strides in at the power-2 place, the estimate at the camera reads more than 3 times the free distance',
        `estimate ${estimate.toExponential(2)}, free ${ref.t.toExponential(2)} (${ref.kind})`);
    check(got.kind === 1 && got.t <= ref.t * 1.02 && got.t >= ref.t * 0.5, 'drawn surface: and the ray still ends on the drawn surface, not past it',
        `ray ${got.t.toExponential(3)} (kind ${got.kind}), referee ${ref.t.toExponential(3)}`);
}

// ── the bundle's two numbers ──
{
    const v = PLACES[PLACES.length - 1].state.view as View;
    const { O } = enter(v);
    const axis = forward(v);
    const each = lib.senseDirs(axis).map((rd) => lib.rayFreeJS(O, rd, lib.iters(), 0.05, 64).t).sort((a, b) => a - b);
    const s = lib.senseBundle(axis);
    const same = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * b;   // the bundle normalises its axis once more: the last bits differ
    check(each.length === 7 && each[1] > each[0] * 1.001 && same(s.near, each[0]) && same(s.second, each[1]), 'bundle: near is the nearest of the seven rays and second the second nearest',
        `near ${s.near}, second ${s.second}, rays ${each.slice(0, 3).join(', ')}`);
}

// ── the estimate beside the camera (`api.dz.estimateAt` is this orbit, 0 when it does not escape) ──
{
    let worst = 0;
    for (const { v } of views) {
        const { O, estimate } = enter(v);
        const here = lib.pertOrbitJS(O, [0, 0, 0], lib.iters());
        worst = Math.max(worst, Math.abs(here.de / estimate - 1));
    }
    // Not to the last bit everywhere: with the camera outside radius 2 (the start view, 2.6 from the origin) the
    // renderer's probe reads its formula on the camera's own point and the kernel on the first iterate - 0.1 % apart.
    // So a caller that compares "there" with "here" asks the kernel for both.
    check(worst < 5e-3, "estimate: the kernel's estimate at no offset is the renderer's own probe at the camera, to half a percent at every view", `worst ${worst.toExponential(2)}`);
    // Stepping towards the surface it falls; at a point in the body of the bulb the orbit does not escape.
    const v = PLACES[PLACES.length - 1].state.view as View;
    const { O, estimate } = enter(v);
    const rd = forward(v), free = referee(O, rd, lib.iters()).t;
    const near = lib.pertOrbitJS(O, scl(rd, free * 0.9), lib.iters());
    check(near.escaped && near.de > 0 && near.de < estimate, 'estimate: nine tenths of the way to the surface it reads less than at the camera',
        `camera ${estimate.toExponential(2)}, near ${near.de.toExponential(2)}`);
    const start = enter(START);
    const body = lib.pertOrbitJS(start.O, [0, 0, -2.3], lib.iters());         // from (0, 0, 2.6) to (0, 0, 0.3): inside the bulb
    check(!(body.escaped && body.de > 0), 'estimate: at a point in the body of the bulb the orbit does not escape (the handle answers 0 there)');
}

// ── the wall behind: what is looked at is not what is nearest ──
{
    const v = STARTERS[STARTERS.length - 1].view as View;
    const { estimate } = enter(v);
    // 22 decades away: a ray runs out of its 64 steps on the way. The first ask says "open" with a lower bound; asked
    // again with the camera where it stood, each ray goes on from where it stopped.
    const first = lib.senseBundle(forward(v), { slot: 'look' });
    let ahead = first, asks = 1;
    while (ahead.hits < 7 && asks < 40) { ahead = lib.senseBundle(forward(v), { slot: 'look' }); asks++; }
    const back = lib.senseBundle(scl(forward(v), -1));
    check(first.hits === 0 && first.open === 7 && first.second > estimate * 100 && first.second < 1e-60, 'wall behind: the first ask ends unfinished on every ray (open 7), at a lower bound well past the wall',
        `second ${first.second.toExponential(2)}, ${first.hits} hits, ${first.open} open`);
    check(estimate > 1e-77 && estimate < 1e-74, 'wall behind: at the power-4 place the estimate at the camera reads about 3e-76', estimate.toExponential(2));
    check(ahead.second > 1e-56 && ahead.second < 1e-52 && ahead.hits === 7 && ahead.open === 0 && asks <= 12, 'wall behind: asked again it reads on to what is looked at: about 1e-54 away, 22 decades farther', `second ${ahead.second.toExponential(2)}, ${ahead.hits} hits after ${asks} asks`);
    check(back.near < 1e-74 && back.near > 0, 'wall behind: and a bundle about the opposite direction finds the wall', back.near.toExponential(2));
}

// ── inside, and open ──
{
    lib.place({ cam: [fixed(1e-6), '0', fixed(0.3)], yaw: 0, pitch: 0, iters: 40, power: 8 });
    const inside = lib.senseBundle([1, 0, 0]);
    check(inside.inside && inside.near === 0 && inside.second === 0, 'inside: a camera inside the drawn solid reads 0 on every ray and says so');
    enter(START);
    const away = lib.senseBundle([0, 0, 1]);                         // the start view looks along -z; this is the other way
    check(!away.inside && away.hits === 0 && away.open === 0 && away.near > 8, 'open: away from the bulb every ray ends open past 8 units, and finished (nothing lies that way)', `near ${away.near}, ${away.hits} hits, ${away.open} open`);
    const at = lib.senseBundle(forward(START));
    check(at.hits === 7 && at.near > 1 && at.second >= at.near && at.second < 2.6, 'open: towards it all seven meet it, the second nearest not nearer than the nearest', `near ${at.near}, second ${at.second}`);
}

// ── kept: a bundle is not marched again for a small move ──
{
    const v = PLACES[PLACES.length - 1].state.view as View;
    enter(v);
    const axis = forward(v);
    const first = lib.senseBundle(axis, { slot: 'look' });
    const again = lib.senseBundle(axis, { slot: 'look' });
    check(first.marched && !again.marched && again.near === first.near && again.second === first.second, 'kept: asked again with nothing changed, the bundle is not marched and reads the same');
    const step = first.near * 0.02;
    lib.move(scl(axis, step));
    const moved = lib.senseBundle(axis, { slot: 'look' });
    check(!moved.marched && Math.abs(moved.near - (first.near - step)) < first.near * 1e-9 && Math.abs(moved.second - (first.second - step)) < first.second * 1e-9,
        'kept: after a move of 2 % of the nearest ray it is still not marched, and reads shorter by the move', `near ${first.near} -> ${moved.near}, marched ${moved.marched}`);
    lib.move(scl(axis, first.near * 0.2));
    const far = lib.senseBundle(axis, { slot: 'look' });
    check(far.marched && far.near < first.near * 0.9, 'kept: after a move of a fifth more it is marched again');
    const turned = lib.senseBundle([axis[2], axis[1], -axis[0]], { slot: 'look' });
    check(turned.marched, 'kept: another axis is marched');
    lib.senseBundle(axis, { slot: 'look' });
    lib.setIters(lib.iters() + 8);
    check(lib.senseBundle(axis, { slot: 'look' }).marched, 'kept: a changed iteration count is marched again (the drawn solid moved)');
    check(lib.senseBundle(axis, { slot: 'look', reuse: 0 }).marched && lib.senseBundle(axis).marched, 'kept: reuse 0, or no slot, always marches');
}

// ── THE ITERATION CEILING (added 2026-10-11, R7b-2). Not the ray probe's business, but this is the check that
// lifts core.js as text, and the rule is five one-liners of it: the two ceilings, `itersMax`, `api.setIters` and
// the line of `api.dz.setView` that takes a view's count. Until that day the last two held the Mandelbulb at
// the page's 160 whatever marched it, and a route's keyed count above 160 was cut (deep-zoom/route.ts).
{
    const it = new Function(`"use strict";
        const cam = { iters: 14 }, api = {}; let orbitDirty = false, rayUse = 5, dzFormula = 'mandelbulb';
        ${cut('const boxOn = () =>', '\n')}
        ${cut('const BOX_ITER_MAX = ', '\n')}
        ${cut('const RAY_ITER_REACH = ', '\n')}
        ${cut('const itersMax = ', '\n')}
        ${cut('api.setIters = ', '\n')}
        const viewCount = (v) => {
            ${cut('if (v.iters) cam.iters = ', '\n')}
        };
        return { set: (n) => { api.setIters(n); return cam.iters; }, view: (n) => { viewCount({ iters: n }); return cam.iters; }, dirty: () => orbitDirty,
            state: (bits, formula) => { dzFormula = formula; rayUse = formula === 'mandelbox' ? 0 : bits; } };
    `)() as { set(n: number): number; view(n: number): number; dirty(): boolean; state(bits: number, formula: string): void };
    it.state(5, 'mandelbulb');
    const ray = [it.set(300), it.set(1000), it.view(240), it.view(999), it.set(1)];
    check(ray.join() === '300,400,240,400,4' && it.dirty(),
        'iterations: under the ray march a view\'s count and a set count arrive whole up to 400 (300, 240), are held at 400 above it, and at 4 below', ray.join());
    it.state(0, 'mandelbulb');
    const page = [it.set(300), it.view(240), it.set(120)];
    check(page.join() === '160,160,120', 'iterations: with ray bits 0 (the state the direct proof holds) the page\'s 160 still holds', page.join());
    it.state(5, 'mandelbox');
    const box = [it.set(450), it.set(999), it.view(450)];
    check(box.join() === '450,500,450', 'iterations: the Mandelbox takes its own 500, as before', box.join());
}

console.log(failed === 0 ? 'ray-probe: all green' : `ray-probe: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
