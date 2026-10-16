/**
 * deep-zoom/routeSmooth.ts - the rules of the smoothing pass, as pure functions: no store, no host, no DOM.
 * `deep-zoom/route.ts` reads the route and the rays and writes what these work out (`smoothRoute` there).
 *
 * WHAT THE PASS IS (plans/deep-zoom-shell/SMOOTHING.md, "The tool, as decided" and the study's four rounds;
 * every rule below is the owner's decision of 2026-10-16 - do not re-derive them)
 *   It RETIMES a route, so that how fast the MIDDLE OF THE PICTURE moves follows itself averaged, and it
 *   smooths the turn. POSITIONS NEVER MOVE: a keyframe keeps its camera to the digit, and between two
 *   keyframes the camera runs the same path at another rate.
 *   1. THE PICTURE'S SPEED (`pictureSpeed`). 45 rays across the picture (`PICTURE_GRID_U` x
 *      `PICTURE_GRID_V`, picture heights from its centre, through `viewRay`). A surface at distance r in
 *      direction d, the camera moving at V and turning at W, crosses the picture at
 *      |-(V - (V.d) d) / r - W x d|, over `DZ_FOV_SCALE` for picture heights a second; a ray that meets
 *      nothing moves with the turn alone. The middle is the median of the 45. (Checked in the study
 *      against the optical flow of rendered frames: correlation 0.87 to 0.93, within 10 % in scale.)
 *      Rays are read every third frame (`PICTURE_READ_EVERY`); between two read frames the picture's
 *      speed PER UNIT OF THE CAMERA'S SPEED is interpolated in log, times the camera's own speed, which
 *      the path gives exactly (`fillPictureSpeed`).
 *   2. THE WARP (`paceChange`, `warpRoute`). The speed in log, smoothed over 0.05 s (the rays jitter
 *      about 10 % a frame). The TARGET: a 1 s running median of that (no single rush sets it), then a
 *      Gaussian of the strength in seconds, worked out over the WHOLE route even for a section; a strength
 *      of the selection's length or more is ONE even pace. Each old frame lasts (speed / target) new
 *      frames. Over a RANGE of legs the change (in log) is eased from nothing at each edge to all of it
 *      over the strength, but over no more than a quarter of the range (smoothstep): a section then crosses
 *      its edges as the route did before it (measured: at keyframes 51 to 57 of the owner's route x1.43 /
 *      x0.87 against x1.49 / x0.87; with the target from inside the section alone, x0.50). Nothing outside
 *      the range is retimed; everything after it moves by its change of length. Keyframes land on whole
 *      frames, strictly increasing.
 *   3. THE CLOCK (`paceSpan`). The path's scale is the depth track TIMES the Pace track. To keep the camera
 *      on its path through a retime, the clock at a new frame is the old clock at the old frame shown there
 *      times the warp's rate (old frames a new one); the Pace track is that over the new depth track, fitted
 *      a LEG AT A TIME at `PACE_FIT_DECADES` (in log), so every keyframe has a pace key and a later pass
 *      over a range splices at its keyframes exactly (`splicePace`). On the owner's route: about 750 to 900
 *      keys, the camera's speed within 2.3 %.
 *   4. THE TURN (`smoothAims`). The route's orientation a frame at a time, low-passed (a Gaussian of
 *      `TURN_SMOOTHING` s, the mean taken in each frame's own tangent space by two Karcher steps); each
 *      keyframe's aim moved onto it by at most the miss allowed. Pinned aims (K keyframes, a selection's two
 *      ends, everything outside it) stay to the digit. Three passes, each from the ORIGINAL aims through the
 *      curve the last made, so a miss never grows past the allowance.
 *   5. THE FREE LOOK (`carryLook`). Carried through the warp, sampled a whole frame at a time and fitted
 *      again at the recorder's own tolerance; when asked, low-passed first, the smoothing eased to the
 *      hand's own values over two sigma at each end of what is resampled. It never sets the pace (the
 *      owner: "Don't count the free look: pace by the route's own picture" - unless the pass is asked to
 *      pace by the picture with the look on top).
 *   6. CLOSE KEYFRAMES (`closeLegs`). Legs under half a second are listed; a merge (route.ts) drops the
 *      keyframe whose removal moves the path least.
 *
 * PITFALLS
 *   - A FRAME'S STEP AT DEPTH IS UNDER ONE OF THE CAMERA'S OWN STEPS: at 1e-77 a frame moves about 4e-79,
 *     a twentieth of 2^-256. The camera's speed is measured on a path with `FINE_BITS` more fractional
 *     bits (`pathMotion`), never off the renderer's positions.
 *   - THE ORIENTATION BETWEEN KEYFRAMES advances with the keyframes' times (engine/animation/zoomPath.ts),
 *     not with the warp: inside a leg whose pace changes the turn is spread a little differently from
 *     when the rays were read. Measured in the study: the result still strays in a few frames only.
 *   - A RANGE'S TARGET needs the speed beyond its edges (`speedMargin`): read that far, the result inside
 *     is the whole route's to the bit (the windows never reach past what was read but at the route's ends).
 *   - THE PATH IS NOT QUITE THE OLD ONE: a key's tangent mixes its two legs by their lengths in time
 *     (zoomPath's Catmull-Rom on uneven knots), and a retime changes those. The study measured the path
 *     moved by a few hundredths of a depth between keyframes; the keyframes themselves never move.
 *
 * @see plans/deep-zoom-shell/SMOOTHING.md
 * @invariant A RANGE changes nothing outside it and nothing at its edges; inside, the change is the whole
 *   route's own to the bit (the speed read only `speedMargin` beyond), eased in over the strength but no
 *   more than a quarter of the range; so a range crosses its edges as the route did before it - proven by:
 *   npm run check:deep-zoom-route ("smooth: a range: nothing outside it changes, nothing at its edges ...",
 *   "smooth: a range crosses its edges as the route did before it ..."). Falsified 2026-10-16: the change
 *   not eased (`w` always 1 in `paceChange`) -> both lines red (across the edges x1.05 / x0.95, where the
 *   route crossed them at x1.27 / x1.07).
 * @assumption The other rules have green lines in the same check and were not broken on their own (three
 *   breaks were the stage's allowance): a picture at one speed left alone, a rush played slower, a strength
 *   of the selection's length one even pace; keyframes on whole frames, rising, the map between the
 *   timings both ways; the clock keeping each leg's share of the camera's way (within 1.1e-3) and the
 *   clock within 0.006 decades; the look carried within 0.05 degrees; the picture's speed as the median of
 *   45 rays' rates worked out by hand; aims moved by the miss at most, pinned ones to the digit.
 *   ON THE OWNER'S ROUTE, in the app (2026-10-16, his s7zzzooom, 105 keyframes, 192 s; the route's own
 *   picture read every frame by `routePictureSpeed` and scored as the study's evalbuilt.mts scores, to
 *   keyframe 100): the middle strays over 25 % from its own 3 s average in 82 frames after a pass at 4 s
 *   with a miss of 5 degrees and the look at 0.5 s (1,161 as rendered; the study's scene-R4.json, read
 *   the same way, 86; the pass's own reckoning 3, R4's 4), the route 203.3 s (R4 203.2); a range at
 *   keyframes 51 to 57 crosses its edges at x1.24 / x0.85 (2 s) and x1.23 / x0.86 (4 s), where the route
 *   as rendered crosses them at x1.30 / x0.88, its frames off inside 116 -> 6 and 17.
 */
import * as THREE from 'three';
import { animationEngine } from '../engine/AnimationEngine';
import { buildZoomPath, zoomPathOrientation, zoomPathPosition } from '../engine/animation/zoomPath';
import type { FixedVec3, Quat, TurnKey, ZoomKey } from '../engine/animation/zoomPath';
import { fitSamplesToKeys, spliceSpan } from '../utils/CurveFitting';
import type { Keyframe, Track } from '../types';
import type { DzOrientation } from './host/DeepZoomHost';
import { DZ_FOV_SCALE, viewRay } from './orbitCamera';
import type { V3 } from './orbitCamera';

/** The picture's grid, in picture heights from its centre: u to the right, v up (16:9 reaches u = 0.89). */
export const PICTURE_GRID_U = [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8] as const;
export const PICTURE_GRID_V = [-0.4, -0.2, 0, 0.2, 0.4] as const;
/** How each ray is followed (`host.freeDistance`): what the study measured with. */
export const PICTURE_RAY = { tol: 0.02, maxSteps: 800 } as const;
/** The rays are read every this many frames of the route. (Every sixth strayed in 39 frames, every third in 20.) */
export const PICTURE_READ_EVERY = 3;
/** The Pace track is fitted to this, in decades (about 2.3 % of the camera's speed). */
export const PACE_FIT_DECADES = 0.01;
/** The turn's low-pass, seconds. */
export const TURN_SMOOTHING = 1;
const TURN_PASSES = 3;
/** Legs shorter than this (seconds) are close keyframes: warned, and a merge offered. */
export const CLOSE_LEG_SECONDS = 0.5;
/** Fractional bits the camera's motion is measured with beyond the camera's own 256 (PITFALLS). */
export const FINE_BITS = 64n;
/** No picture moves slower than this (picture heights a second): the log of nothing is no target. */
const SPEED_FLOOR = 1e-4;
/** The rays jitter about 10 % a frame: the speed is smoothed over this (seconds). 0.15 s blunted the wall passes. */
const SPEED_SMOOTHING = 0.05;
/** The target's running median, seconds. */
const TARGET_MEDIAN = 1;

// ── the picture's speed ──────────────────────────────────────────────────────────────────────────

/** The 45 rays of the picture, unit vectors in world axes, for the camera turned `o`. */
export function pictureDirections(o: DzOrientation): V3[] {
    const out: V3[] = [];
    for (const v of PICTURE_GRID_V) for (const u of PICTURE_GRID_U) out.push(viewRay(o, u, v));
    return out;
}

/** The turn from `a` to `b` in `dt` seconds, as an angular velocity in world axes (radians a second). */
export function turnVelocity(a: THREE.Quaternion, b: THREE.Quaternion, dt: number): V3 {
    const d = a.clone().invert().multiply(b);
    if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
    const s = Math.hypot(d.x, d.y, d.z);
    if (s < 1e-15 || !(dt > 0)) return [0, 0, 0];
    const k = (2 * Math.atan2(s, d.w)) / s / dt;
    const w = new THREE.Vector3(d.x * k, d.y * k, d.z * k).applyQuaternion(a);       // the camera's own axes to the world's
    return [w.x, w.y, w.z];
}

/**
 * How fast the MIDDLE of the picture moves, in picture heights a second: the median of the 45 rays' rates.
 * `dist[i]`: how far ray `dirs[i]` meets a surface (Infinity: it meets nothing). `V`: the camera's velocity
 * (world units a second), `W`: its turn (`turnVelocity`).
 */
export function pictureSpeed(dirs: readonly V3[], dist: ArrayLike<number>, V: V3, W: V3): number {
    const rates = new Float64Array(dirs.length);
    dirs.forEach((d, i) => {
        const r = dist[i], along = V[0] * d[0] + V[1] * d[1] + V[2] * d[2], k = r > 0 && r < Infinity ? -1 / r : 0;
        const x = k * (V[0] - along * d[0]) - (W[1] * d[2] - W[2] * d[1]);
        const y = k * (V[1] - along * d[1]) - (W[2] * d[0] - W[0] * d[2]);
        const z = k * (V[2] - along * d[2]) - (W[0] * d[1] - W[1] * d[0]);
        rates[i] = Math.hypot(x, y, z) / DZ_FOV_SCALE;
    });
    rates.sort();
    return rates[rates.length >> 1];
}

/** The frames (indices from the route's first keyframe) whose rays are read for the frames `[lo, hi)` of a
 *  route of `n` frames: every `PICTURE_READ_EVERY`th from the route's start, and its last. Frame i's rays
 *  are read at frame i, its motion is the step to frame i + 1. */
export function readFrames(lo: number, hi: number, n: number, every = PICTURE_READ_EVERY): number[] {
    const out: number[] = [];
    if (n < 1 || hi <= lo) return out;
    for (let f = Math.max(0, lo - (lo % every)); ; f += every) {
        if (f >= n - 1) { out.push(n - 1); break; }
        out.push(f);
        if (f >= hi - 1) break;
    }
    return out;
}

/**
 * The picture's speed at every frame of `[lo, hi)` (NaN elsewhere) from the frames read (`read`: frame index
 * -> speed there; `readFrames(lo, hi, n)` of them): between two read frames the speed per unit of the camera's
 * speed (`speeds`, a frame's step over its time) interpolated in log, times the camera's own speed there. Where
 * the camera stands still the speed itself is interpolated. Never under `SPEED_FLOOR`.
 */
export function fillPictureSpeed(read: ReadonlyMap<number, number>, speeds: ArrayLike<number>, lo: number, hi: number): Float64Array {
    const out = new Float64Array(speeds.length).fill(NaN), at = [...read.keys()].sort((x, y) => x - y);
    let j = 0;
    for (let i = lo; i < hi; i++) {
        while (j + 1 < at.length && at[j + 1] <= i) j++;
        const a = at[j], b = at[Math.min(at.length - 1, a === i ? j : j + 1)];
        const pa = Math.max(SPEED_FLOOR, read.get(a) as number), pb = Math.max(SPEED_FLOOR, read.get(b) as number);
        if (a === i || b === a) { out[i] = a === i ? pa : pb; continue; }
        const t = (i - a) / (b - a), va = speeds[a], vb = speeds[b], v = speeds[i];
        out[i] = Math.max(SPEED_FLOOR, va > 0 && vb > 0 && v > 0
            ? Math.exp((1 - t) * Math.log(pa / va) + t * Math.log(pb / vb)) * v
            : Math.exp((1 - t) * Math.log(pa) + t * Math.log(pb)));
    }
    return out;
}

/**
 * The camera's motion along a route of `n` frames from `first`, measured on a path `FINE_BITS` finer than the
 * camera's own (PITFALLS): for each frame i of `[lo, hi)`, the step to frame i + 1 as a velocity (world units a
 * second), and its length (`speed`, NaN outside `[lo, hi)`). `keys` and `scaleAt` are the route's path as
 * route.ts builds it, positions in `unit` steps.
 */
export function pathMotion(keys: readonly ZoomKey[], unit: number, scaleAt: (frame: number) => number, first: number, n: number, lo: number, hi: number, fps: number): { speed: Float64Array; velocity: (i: number) => V3 } {
    const per = unit * 2 ** Number(FINE_BITS);
    const fine = buildZoomPath(keys.map((k) => ({ ...k, position: [k.position[0] << FINE_BITS, k.position[1] << FINE_BITS, k.position[2] << FINE_BITS] as const })), { unit: per, scaleAt });
    const steps: V3[] = new Array(Math.max(0, hi - lo)), speed = new Float64Array(n).fill(NaN);
    let a = zoomPathPosition(fine, first + lo);
    for (let i = lo; i < hi; i++) {
        const b = zoomPathPosition(fine, first + i + 1);
        const v: V3 = [Number(b[0] - a[0]) / per * fps, Number(b[1] - a[1]) / per * fps, Number(b[2] - a[2]) / per * fps];
        steps[i - lo] = v;
        speed[i] = Math.hypot(v[0], v[1], v[2]);
        a = b;
    }
    return { speed, velocity: (i) => steps[i - lo] };
}

// ── the warp ─────────────────────────────────────────────────────────────────────────────────────

/** A Gaussian of `sigma` samples over `xs`, normalised over the samples that are there. */
function gaussian(xs: Float64Array, sigma: number): Float64Array {
    if (!(sigma > 0)) return xs.slice();
    const R = Math.ceil(3 * sigma), w = new Float64Array(2 * R + 1), out = new Float64Array(xs.length);
    for (let j = -R; j <= R; j++) w[j + R] = Math.exp(-0.5 * (j / sigma) ** 2);
    for (let i = 0; i < xs.length; i++) {
        let s = 0, n = 0;
        for (let j = Math.max(-R, -i); j <= R && i + j < xs.length; j++) { s += w[j + R] * xs[i + j]; n += w[j + R]; }
        out[i] = s / n;
    }
    return out;
}

/** The running median over `half` samples each side, as many as are there. */
function runningMedian(xs: Float64Array, half: number): Float64Array {
    const out = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) {
        const w = xs.slice(Math.max(0, i - half), Math.min(xs.length, i + half + 1)).sort();
        out[i] = w[w.length >> 1];
    }
    return out;
}

/** How far beyond a selection (frames) the picture's speed must be known for the target inside it to be the
 *  whole route's: the target's Gaussian, its median, the speed's own smoothing and a read frame's reach. */
export function speedMargin(fps: number, strength: number): number {
    return Math.ceil(3 * strength * fps) + Math.round((TARGET_MEDIAN * fps) / 2) + Math.ceil(3 * SPEED_SMOOTHING * fps) + PICTURE_READ_EVERY;
}

export interface PaceOptions {
    fps: number;
    /** How long a change of pace may take, seconds: the target's Gaussian. At the selection's length or more: one even pace. */
    strength: number;
    /** The frames retimed, [from, to), as indices from the route's first keyframe (a frame is its step to the next). */
    from: number;
    to: number;
    /** There is route beyond that edge: the change is eased in from nothing there. */
    easeFrom: boolean;
    easeTo: boolean;
}

/**
 * THE WARP'S CHANGE, frame by frame: log(new frames an old frame lasts) - log(speed / target) inside
 * `[from, to)`, eased at its edges, 0 everywhere else. `speed`: the picture's speed a frame
 * (`fillPictureSpeed`), known at least `speedMargin` beyond the selection or to the route's ends.
 */
export function paceChange(speed: ArrayLike<number>, o: PaceOptions): Float64Array {
    const n = speed.length, g = new Float64Array(n), width = o.to - o.from;
    if (width <= 0) return g;
    // What was read: the run of known speeds about the selection.
    let lo = o.from, hi = o.to;
    while (lo > 0 && Number.isFinite(speed[lo - 1])) lo--;
    while (hi < n && Number.isFinite(speed[hi])) hi++;
    const L = new Float64Array(hi - lo);
    for (let i = lo; i < hi; i++) L[i - lo] = Math.log(Math.max(SPEED_FLOOR, speed[i]));
    const smooth = gaussian(L, SPEED_SMOOTHING * o.fps), median = runningMedian(smooth, Math.round((TARGET_MEDIAN * o.fps) / 2));
    let target: Float64Array;
    if (o.strength * o.fps >= width) {
        // One even pace: the limit of the Gaussian over the selection, the median's mean in log.
        let s = 0;
        for (let i = o.from; i < o.to; i++) s += median[i - lo];
        target = new Float64Array(median.length).fill(s / width);
    } else target = gaussian(median, o.strength * o.fps);
    const ease = Math.max(1, Math.min(o.strength * o.fps, width / 4));
    for (let i = o.from; i < o.to; i++) {
        const d = Math.min(o.easeFrom ? i - o.from : Infinity, o.easeTo ? o.to - 1 - i : Infinity) / ease;
        const w = d >= 1 ? 1 : d * d * (3 - 2 * d);
        g[i] = w * (smooth[i - lo] - target[i - lo]);
    }
    return g;
}

/** A route's timing played through a warp: the keyframes' frames before and after, and the map between. */
export interface RouteWarp {
    was: readonly number[];
    now: readonly number[];
    /** Everything after the selection moves by this many frames. */
    delta: number;
    /** A frame of the old timing in the new: a keyframe's own exactly, whole or not between. */
    fwd(f: number): number;
    /** The old frame shown at new frame `t`, and the warp's rate there (old frames a new one plays). */
    back(t: number): { f: number; rate: number };
}

/**
 * The route through the warp `g` (`paceChange`, frames from `was[0]`): keyframes `a + 1 .. b` on whole
 * frames, strictly increasing; those before `a` as they were, those after `b` later by `b`'s move. Inside a leg
 * the old frames are spread as the warp spreads them, scaled to the leg's whole frames.
 */
export function warpRoute(g: Float64Array, was: readonly number[], a: number, b: number): RouteWarp {
    const first = was[0], n = g.length, tau = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) tau[i + 1] = tau[i] + Math.exp(g[i]);
    const now = was.slice();
    for (let j = a + 1; j <= b; j++) now[j] = Math.max(now[j - 1] + 1, first + Math.round(tau[was[j] - first]));
    const delta = now[b] - was[b];
    for (let j = b + 1; j < was.length; j++) now[j] = was[j] + delta;
    const tauAt = (x: number): number => { const i = Math.min(n - 1, Math.max(0, Math.floor(x))); return tau[i] + (x - i) * (tau[i + 1] - tau[i]); };
    const leg = (frames: readonly number[], x: number): number => {
        let j = a, hi = b;
        while (hi - j > 1) { const mid = (j + hi) >> 1; if (frames[mid] <= x) j = mid; else hi = mid; }
        return j;
    };
    return {
        was, now, delta,
        fwd: (f) => {
            if (f <= was[a]) return f;
            if (f >= was[b]) return f + delta;
            const j = leg(was, f), u0 = tau[was[j] - first], u1 = tau[was[j + 1] - first];
            return now[j] + ((tauAt(f - first) - u0) / (u1 - u0)) * (now[j + 1] - now[j]);
        },
        back: (t) => {
            if (t <= now[a]) return { f: t, rate: 1 };
            if (t >= now[b]) return { f: t - delta, rate: 1 };
            const j = leg(now, t), u0 = tau[was[j] - first], u1 = tau[was[j + 1] - first];
            const u = u0 + ((t - now[j]) * (u1 - u0)) / (now[j + 1] - now[j]);
            let lo = was[j] - first, hi = was[j + 1] - first;
            while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tau[mid] <= u) lo = mid; else hi = mid; }
            // The rate is the warp's own, the same on both sides of a keyframe: a leg's rounding to whole
            // frames is a constant in that leg, which the leg's own clock does not see (zoomPath: m(t)).
            return { f: first + lo + (u - tau[lo]) / (tau[lo + 1] - tau[lo]), rate: 1 / (tau[lo + 1] - tau[lo]) };
        },
    };
}

// ── the clock ────────────────────────────────────────────────────────────────────────────────────

/**
 * THE PACE TRACK over keyframes `s0 .. s1` of the retimed route: at each whole new frame, the old clock
 * (`clockOld`, the old depth times the old pace) at the old frame shown there, times the warp's rate, over the
 * new depth there (`depthNew`); fitted a leg at a time in log at `PACE_FIT_DECADES`. The key two legs share
 * is one key, each leg's own handle on its side. `edge`: the old pace at an end that has route beyond it
 * (the sample there is that, to the digit: nothing changes at the edge of what is retimed).
 */
export function paceSpan(warp: RouteWarp, s0: number, s1: number, clockOld: (f: number) => number, depthNew: (t: number) => number,
    idPrefix: string, edge: { from?: number; to?: number } = {}): Keyframe[] {
    const now = warp.now, out: Keyframe[] = [];
    for (let j = s0; j < s1; j++) {
        const samples: number[] = [];
        for (let t = now[j]; t <= now[j + 1]; t++) { const { f, rate } = warp.back(t); samples.push((clockOld(f) * rate) / depthNew(t)); }
        if (j === s0 && edge.from !== undefined) samples[0] = edge.from;
        if (j === s1 - 1 && edge.to !== undefined) samples[samples.length - 1] = edge.to;
        const keys = fitSamplesToKeys(samples, now[j], PACE_FIT_DECADES * Math.LN10, `${idPrefix}-${j}`, true);
        if (out.length > 0) { const joint = out[out.length - 1]; out[out.length - 1] = { ...joint, rightTangent: keys[0].rightTangent }; keys.shift(); }
        out.push(...keys);
    }
    return out;
}

/**
 * A pace span (`paceSpan`, new frames `lo .. hi`) put into the old Pace track: the old keys before `lo` as
 * they are, those after the span's old end `hiWas` later by `delta`. Where the old track has a key exactly at
 * an end of the span (a pass's own keys sit on every keyframe), the joint is that key, its outer handle and
 * value as they were: the curve outside is the old one to the digit. Elsewhere the seam is healed as a
 * spliced span's is (`spliceSpan`).
 */
export function splicePace(old: readonly Keyframe[], span: Keyframe[], lo: number, hi: number, hiWas: number, delta: number): Keyframe[] {
    const before = old.filter((k) => k.frame < lo), after = old.filter((k) => k.frame > hiWas).map((k) => ({ ...k, frame: k.frame + delta }));
    if (before.length === 0 && after.length === 0) return span;
    const merged = spliceSpan([...before, ...after], lo, hi, span, true, true) ?? span;
    const atLo = before.length > 0 ? old.find((k) => k.frame === lo) : undefined, atHi = after.length > 0 ? old.find((k) => k.frame === hiWas) : undefined;
    return merged.map((k) => {
        if (atLo && k.frame === lo) return { ...k, id: atLo.id, value: atLo.value, leftTangent: atLo.leftTangent };
        if (atHi && k.frame === hi) return { ...k, id: atHi.id, value: atHi.value, rightTangent: atHi.rightTangent };
        return k;
    });
}

// ── the turn ─────────────────────────────────────────────────────────────────────────────────────

/** A unit quaternion as a rotation vector, the short way round. */
const qlog = (d: THREE.Quaternion): THREE.Vector3 => {
    const s = d.w < 0 ? -1 : 1, v = Math.hypot(d.x, d.y, d.z), k = v < 1e-12 ? 2 * s : (2 * s * Math.atan2(v, s * d.w)) / v;
    return new THREE.Vector3(d.x * k, d.y * k, d.z * k);
};
const qexp = (r: THREE.Vector3): THREE.Quaternion => {
    const a = r.length(), k = a < 1e-12 ? 0.5 : Math.sin(a / 2) / a;
    return new THREE.Quaternion(r.x * k, r.y * k, r.z * k, Math.cos(a / 2));
};
const quat = (q: Quat): THREE.Quaternion => new THREE.Quaternion(q[0], q[1], q[2], q[3]);

/**
 * THE TURN RULE: each keyframe's aim (`turns`, at the keyframes' frames) moved onto the route's turn
 * low-passed - by `missDeg` degrees at most, the `pinned` ones not at all. Returns the aims and how far each
 * moved (degrees). A pinned aim, and one the low-pass leaves where it is, is the very quaternion given.
 */
export function smoothAims(turns: readonly TurnKey[], fps: number, missDeg: number, pinned: ReadonlySet<number>): { aims: Quat[]; moved: number[] } {
    const first = turns[0].time, last = turns[turns.length - 1].time, cap = (missDeg * Math.PI) / 180;
    const sigma = TURN_SMOOTHING * fps, R = Math.ceil(3 * sigma), w = new Float64Array(2 * R + 1);
    for (let j = -R; j <= R; j++) w[j + R] = Math.exp(-0.5 * (j / sigma) ** 2);
    const original = turns.map((k) => quat(k.orientation));
    let aims: Quat[] = turns.map((k) => k.orientation), moved = turns.map(() => 0);
    for (let pass = 0; pass < TURN_PASSES; pass++) {
        const curve = aims.map((q, i) => ({ time: turns[i].time, orientation: q })), seen = new Map<number, THREE.Quaternion>();
        const at = (f: number): THREE.Quaternion => {
            const c = Math.min(last, Math.max(first, f));
            let q = seen.get(c);
            if (!q) { q = quat(zoomPathOrientation(curve, c)); seen.set(c, q); }
            return q;
        };
        const next: Quat[] = [], by: number[] = [];
        turns.forEach((k, i) => {
            if (pinned.has(i) || cap <= 0) { next.push(k.orientation); by.push(0); return; }
            // The low-passed turn at this keyframe's frame: two Karcher steps in that frame's own tangent space.
            let m = at(k.time).clone();
            for (let it = 0; it < 2; it++) {
                const acc = new THREE.Vector3(), inv = m.clone().invert();
                let n = 0;
                for (let j = -R; j <= R; j++) { acc.addScaledVector(qlog(inv.clone().multiply(at(k.time + j))), w[j + R]); n += w[j + R]; }
                m = m.multiply(qexp(acc.multiplyScalar(1 / n))).normalize();
            }
            const d = qlog(original[i].clone().invert().multiply(m));
            if (d.length() > cap) d.multiplyScalar(cap / d.length());
            if (d.length() === 0) { next.push(k.orientation); by.push(0); return; }
            const q = original[i].clone().multiply(qexp(d)).normalize();
            next.push([q.x, q.y, q.z, q.w]);
            by.push((d.length() * 180) / Math.PI);
        });
        aims = next;
        moved = by;
    }
    return { aims, moved };
}

// ── the free look ────────────────────────────────────────────────────────────────────────────────

/**
 * A free-look track (one of route.ts's `LOOK_TRACKS`) through a retime: what it holds between the old frames
 * `from` and `to` sampled a whole new frame at a time through the warp and fitted again at `tolerance`
 * (`fitSamplesToKeys`) - low-passed first when `smoothSec` > 0, the smoothing eased to the hand's own values
 * over two sigma at each end of what is retimed (the recording's ends, or the selection's edges; forcing the
 * end sample alone left a step of a frame there). What is resampled runs out to the track's own keys about
 * `from` and `to`, and the two keys it ends on keep their values and their outer handles: the curve outside is
 * the old one, keys before `from` where they were, keys after `to` later with the route. (Spliced in the
 * middle of a segment instead, a Linear key beside it bent the look by 3.7 degrees: measured 2026-10-16.)
 */
export function carryLook(track: Track, warp: RouteWarp, from: number, to: number, fps: number, tolerance: number, smoothSec: number, idPrefix: string): Keyframe[] {
    const keys = track.keyframes, last = keys.length - 1;
    if (last < 1) return keys.map((k) => ({ ...k, frame: Math.round(warp.fwd(k.frame)) }));
    // The keys the resampled stretch ends on: the last at or before `from`, the first at or after `to`.
    let i0 = 0, i1 = last;
    keys.forEach((k, i) => { if (k.frame <= from) i0 = i; });
    for (let i = last; i >= 0; i--) if (keys[i].frame >= to) i1 = i;
    const start = keys[i0], end = keys[i1];
    if (end.frame <= start.frame || keys[last].frame <= from || keys[0].frame >= to) return keys.map((k) => (k.frame > to ? { ...k, frame: Math.round(warp.fwd(k.frame)) } : k));
    const a = Math.round(warp.fwd(start.frame)), b = Math.round(warp.fwd(end.frame)), sigma = smoothSec * fps, pad = Math.ceil(3 * sigma), raw: number[] = [];
    for (let t = a - pad; t <= b + pad; t++) raw.push(animationEngine.evaluateTrack(track, warp.back(Math.min(b, Math.max(a, t))).f));
    let samples = raw.slice(pad, raw.length - pad);
    if (sigma > 0) {
        // Smoothed only where it is retimed: from the later of the recording's start and `from`, to the earlier of its end and `to`.
        const s0 = Math.max(a, Math.round(warp.fwd(Math.max(from, keys[0].frame)))), s1 = Math.min(b, Math.round(warp.fwd(Math.min(to, keys[last].frame))));
        const smooth = gaussian(Float64Array.from(raw), sigma), ramp = Math.max(1, 2 * sigma);
        samples = samples.map((v, i) => {
            const e = Math.max(0, Math.min(1, (a + i - s0) / ramp, (s1 - a - i) / ramp));
            return v + (smooth[i + pad] - v) * e * e * (3 - 2 * e);
        });
    }
    const span = fitSamplesToKeys(samples, a, tolerance, idPrefix);
    span[0] = { ...span[0], id: start.id, value: start.value, leftTangent: start.leftTangent };
    span[span.length - 1] = { ...span[span.length - 1], id: end.id, value: end.value, interpolation: end.interpolation, rightTangent: end.rightTangent };
    return [...keys.slice(0, i0), ...span, ...keys.slice(i1 + 1).map((k) => ({ ...k, frame: Math.round(warp.fwd(k.frame)) }))];
}

// ── close keyframes ──────────────────────────────────────────────────────────────────────────────

/** How far a path (`keys`, `scaleAt`, positions in `unit` steps) passes from `position`, in `depth`s: the
 *  nearest of 49 points of it across `span` frames about `frame`, measured `FINE_BITS` finer. A merge's cost:
 *  the path without a keyframe, from that keyframe's own place. */
export function routePassesFrom(keys: readonly ZoomKey[], unit: number, scaleAt: (frame: number) => number, position: FixedVec3, frame: number, span: number, depth: number): number {
    const per = unit * 2 ** Number(FINE_BITS), fine = (p: FixedVec3): FixedVec3 => [p[0] << FINE_BITS, p[1] << FINE_BITS, p[2] << FINE_BITS];
    const path = buildZoomPath(keys.map((k) => ({ ...k, position: fine(k.position) })), { unit: per, scaleAt }), at = fine(position);
    let best = Infinity;
    for (let j = -24; j <= 24; j++) {
        const p = zoomPathPosition(path, frame + (j * span) / 48);
        best = Math.min(best, Math.hypot(Number(p[0] - at[0]) / per, Number(p[1] - at[1]) / per, Number(p[2] - at[2]) / per));
    }
    return best / depth;
}

/** The legs shorter than `seconds` (each by the index of the keyframe it leaves), shortest first. */
export function closeLegs(frames: readonly number[], fps: number, seconds = CLOSE_LEG_SECONDS): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < frames.length; i++) if (frames[i + 1] - frames[i] < seconds * fps) out.push(i);
    return out.sort((x, y) => frames[x + 1] - frames[x] - (frames[y + 1] - frames[y]) || x - y);
}
