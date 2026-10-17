/**
 * deep-zoom/trail.ts - the trail: what the app remembers of how the camera was flown, and how a
 * route is cut from it.
 *
 * WORDS
 *   The TRAIL is the record of an exploration: the camera's exact views in the order they were
 *   flown. A ROUTE (the camera move on the timeline, `deep-zoom/route.ts`) can be cut from it
 *   afterwards. It is session memory: never in a scene, a link or storage. The record button on
 *   the Route tab switches it; only that choice is remembered (`gmt.deepZoom.trail`).
 *
 * WHAT IS KEPT (`createTrail`: no store, no host, no clock of its own)
 *   A SAMPLE is one exact view (the renderer's own 256-bit position, yaw, pitch, roll), the time on
 *   the trail's clock, the depth the app showed then and the iteration count in force.
 *   - One is taken when the camera has MOVED `TRAIL_STEP` of the present depth from the last one.
 *     A turn alone takes none: it refreshes the look kept for the place the camera stands at.
 *   - Past `TRAIL_CAP` samples, every second one of the older half goes.
 *   - The clock runs while the camera flies; a pause counts for `TRAIL_PAUSE_SECONDS` at most.
 *   - The camera as it stands is the trail's last point: it is read when a route is cut.
 *   - A view that is SET (`setView`: the route's own frame, an undo) is not flown. It is kept
 *     aside; when the camera next flies, that place joins the trail if the trail has been there
 *     (the sample is marked `gap`, and the cut joins it), and otherwise the trail ends there as it
 *     does at a jump. Recording switched off and on again leaves a `gap` and never ends it.
 *   - It ENDS at a jump, a change of formula and a loaded scene (`trailEnds`, called by
 *     `deep-zoom/locations.ts` and `deep-zoom/presetFields.ts` BEFORE the view is set). One deeper
 *     than `TRAIL_KEEP_DECADES` is then kept as the previous trail - one only - and a toast says
 *     so, once a session (the owner, F13, 2026-10-17: not at every jump).
 *   - THE PREVIOUS TRAIL KEEPS THE FORMULA IT WAS FLOWN IN (`previousTrailFormula`): the store's
 *     formula slice as of the trail's last followed move, and the view's Julia constant while that
 *     mode is on. With the camera of a sample that is a place, as a saved location is one: a route
 *     made from the previous trail jumps back to it first (`routeFromTrail` in deep-zoom/route.ts).
 *     Read at the move, not when the trail ends: a switch of formula ends the trail AFTER the
 *     store holds the new one, and an undo of a jump has put the old one back by the time it ends
 *     the trail flown since. This file cannot import the store (presetFields.ts imports it before
 *     the store exists): `installLocations` hands it the reader (`setTrailFormulaReader`); without
 *     one (the node checks) no formula is kept and nothing is jumped to.
 *
 * CUTTING A ROUTE (three pure functions; `deep-zoom/route.ts` writes what they give)
 *   `cutDetours`     where the trail comes back to a place it had been - within `TRAIL_REACH` depths,
 *                    at a similar depth, by a way `TRAIL_DETOUR` times longer than the straight one -
 *                    the stretch in between goes. A dive that backed out keeps only the way to here.
 *   `pickKeyframes`  the first and the last sample, then the sample furthest from the route, again
 *                    and again, until none is further than the tolerance (its distance to the route
 *                    as it plays, a point a frame, over the depth at that sample). The route is
 *                    the engine's own (`engine/animation/zoomPath.ts`) with the depth curve the
 *                    timeline will hold (`depthCurve`), so what is measured is what plays.
 *                    BEFORE THAT, the depth: while the route's depth curve is more than
 *                    `TRAIL_DEPTH_SLACK` decades from the depth of a sample it passes, that sample
 *                    is made a keyframe (see PITFALLS: WHAT IS LOOKED AT CAN JUMP).
 *   `trailFrames`    a leg takes the time its stretch of the trail takes: at the even pace (the
 *                    length on screen of the way that was FLOWN, sample to sample), or on the
 *                    trail's own clock. `evenFrames` is the same pace for a route with no trail
 *                    behind it: each leg by the straight line between its two keyframes.
 *   `reverseTrail`   the trail the other way, for a route that was reversed (`reverseRoute` in
 *                    `deep-zoom/route.ts`): a cut route reversed runs its trail backwards, and
 *                    `routeSource` hands it this instead, so the smoothing and "As flown" go on
 *                    working.
 *
 * THE SEAM
 *   - `followTrail`, `trailTurned`, `trailViewSet`: from `deep-zoom/route.ts` (a move, a turn, a
 *     set view) and, while a dive flies, from the navigation tick. `trailEnds`: see above.
 *   - `trailToHere`, `previousTrail`, `previousTrailFormula`, `trailHeadingNow`: read by
 *     `deep-zoom/route.ts`. `setTrailFormulaReader`: from `deep-zoom/locations.ts`, once.
 *   - `useTrail`: the record button and its line (`deep-zoom/components/RoutePanel.tsx`).
 *   - The depth of a sample is the depth the app shows (`deep-zoom/navigationState.ts`), published
 *     8 times a second: no ray is marched for the trail.
 *
 * PITFALLS
 *   - POSITIONS ARE BIGINT and never pass through `Number()`; only a DIFFERENCE of two does.
 *     `String(p[j])` is the renderer's own camera string, to the digit.
 *   - THE DEPTH SHOWN LAGS a set view by up to 125 ms: until it changes (or a quarter second has
 *     passed) nothing is taken, or the first sample at a place would carry the depth of the last.
 *   - "DEPTH" IS WHAT IS LOOKED AT (`deep-zoom/depthNow.ts`). Looking past a near wall at a far one
 *     makes the same place read decades shallower: the spacing, the reach and the tolerance all
 *     follow that number.
 *   - THE CAP FORGETS THE START FIRST. Each time it bites, what is left of the first 2,000 samples
 *     halves again (simulated 2026-10-11): 1,000 at the first bite (4,097 samples flown: 84 depths
 *     of travel, or a straight dive of 36 decades), 128 a third of the depth apart at the fourth
 *     (7,169 flown), 16 at the seventh (10,241 flown), each 2.6 depths from the next. Legs across
 *     such a stretch are straight.
 *   - WHAT IS LOOKED AT CAN JUMP. Where the view slips past an edge the depth shown rises a decade
 *     between two samples (the owner's recorded dive has one such step: 4.5e-13 to 4.4e-12 in one
 *     view). A route whose keyframes straddle it has a depth curve a decade below the depth flown
 *     there; timed by the straight line between them (the engine's `zoomLegOnScreen`, what K
 *     uses), that leg took 18.7 s for a stretch flown in 3.4 s. Hence the two rules above: the
 *     depth curve is held within half a decade, and a leg is timed along the way that was flown.
 *     On that dive (2026-10-11, at tolerances 0.01, 0.05 and 0.2): 43, 30 and 21 keyframes, 89.5 s
 *     each, the picture moving at 0.41 to 0.61 decades a second throughout; without the two rules
 *     39, 25 and 18 keyframes taking 94, 108 and 141 s.
 *   - THE PICK IS MEASURED AT THE EVEN PACE. "As flown" moves key times only; where the hands
 *     changed speed abruptly the played path leaves the measured one by a little.
 *   - `cutDetours` compares every sample with every earlier one: 8 million pairs at the cap, 0.2 s
 *     when the whole trail is at one depth (measured 2026-10-11: the trail check prints it). It
 *     runs when a route is cut, never while flying.
 *
 * @invariant A sample is taken a `TRAIL_STEP` of the depth apart and never for a turn; past the cap
 *   the older half thins; a jump ends the trail and a deep one becomes the previous; a set view
 *   the trail has been at joins it and one it has not been at ends it; switched off, nothing is
 *   taken; `cutDetours` drops a detour and keeps the way to here; every sample lies within the
 *   tolerance of the picked route, whose depth curve is within `TRAIL_DEPTH_SLACK` of the depth
 *   flown, and a tighter tolerance never picks fewer keyframes; a leg takes the time of the way
 *   that was flown; a pause counts half a second; the heading ignores a tap back and follows a
 *   retreat - proven by: npm run check:deep-zoom-trail (the "thin: ...", "turn: ...", "end: ...",
 *   "cut: ...", "pick: ...", "time: ...", "heading: ..." lines). Falsified 2026-10-11: see the
 *   check's header.
 * @assumption `reverseTrail` holds the same views the other way, each gap on its step, the clock
 *   starting where it did with every step as long as it was, the directions of travel negated to
 *   the digit, and reversed twice is the trail it was: green lines in check:deep-zoom-trail
 *   ("reverse: a trail reversed ...", "reverse: its clock ...", "reverse: and reversed twice
 *   ..."), none broken on its own (the stage's three breaks went to route.ts and the engine).
 * @assumption The previous trail keeps the formula it was flown in, a route made from it puts that
 *   formula back first, and the kept toast is said once a session: no check line (the node checks
 *   hand the trail no formula reader). Tried once in the app, 2026-10-17: Surface (the bulb), Arches
 *   (a Mandelbox), "Route from the previous trail": the bulb again at 1.08e-6, 9 keyframes, no leg
 *   through the solid, the camera on the route; a second deep trail kept later said nothing.
 * @assumption The staleness guard (PITFALLS: THE DEPTH SHOWN LAGS) holds for a quarter second at
 *   most. One line of the check opens it ("end: after a view is set, nothing is taken while the
 *   depth shown is still that of the place left"); it was not seen red.
 */
import { create } from 'zustand';
import { AnimationMath } from '../engine/math/AnimationMath';
import { buildZoomPath, zoomLegOnScreen, zoomPathPosition } from '../engine/animation/zoomPath';
import type { ZoomKey, ZoomPath } from '../engine/animation/zoomPath';
import { showToast } from '../engine/store/toastStore';
import { safeLocalGet, safeLocalSet } from '../store/safeLocalStorage';
import type { Keyframe } from '../types';
import { getHost } from './host/current';
import { useDzNavigation } from './navigationState';
import type { V3 } from './orbitCamera';
import type { DzFormulaSlice } from './storeTypes';

/** Fixed-point steps in one world unit: the camera's 256 fractional bits. */
export const FIXED_UNIT = 2 ** 256;
/** A sample is taken when the camera has moved this share of the present depth from the last one. */
export const TRAIL_STEP = 0.02;
/** Past this many samples the older half loses every second one. */
export const TRAIL_CAP = 4096;
/** The most a pause adds to the trail's clock. */
export const TRAIL_PAUSE_SECONDS = 0.5;
/** A trail deeper than this is kept as the previous trail when it ends. */
export const TRAIL_KEEP_DECADES = 3;
/** "A place it had been": within this many depths (of the shallower of the two), at a depth within
 *  a factor `TRAIL_SAME_DEPTH`. A view that was SET is taken for a place within `TRAIL_SET_REACH`:
 *  a route cut at the widest smoothing lies half a depth off its trail. */
export const TRAIL_REACH = 0.5;
export const TRAIL_SET_REACH = 1;
export const TRAIL_SAME_DEPTH = 2;
/** A way back to such a place is a detour when it is this many times longer than the straight one. */
export const TRAIL_DETOUR = 3;
/** The heading of a view: from where the camera was this share of the depth of travel ago. */
export const TRAIL_HEADING_TRAVEL = 0.25;
/** A cut route's depth curve stays within this many decades of the depth flown, whatever the smoothing. */
export const TRAIL_DEPTH_SLACK = 0.5;

/** How long the depth shown may still be that of the place a set view left (it is published 8 times a second). */
const DEPTH_WAIT_SECONDS = 0.25;
/** A sum of steps is trusted while the way is this many depths at most; beyond it the two positions are subtracted exactly. */
const SUM_GOOD_DEPTHS = 1e9;
/** The route is measured a point a frame; of those, every `MEASURE_STRIDE`th first, then the segments about the nearest. */
const MEASURE_STRIDE = 4;

export type Fixed3 = readonly [bigint, bigint, bigint];

/** One exact view of the trail. */
export interface TrailSample {
    /** The camera's position, as the renderer holds it: `String(p[j])` is its camera string. */
    p: Fixed3;
    yaw: number;
    pitch: number;
    /** Left out when it is 0. */
    roll?: number;
    /** Seconds on the trail's clock: time in flight. */
    t: number;
    /** The depth the app showed then. */
    depth: number;
    /** The iteration count in force then. */
    iters: number;
    /** The camera was not flown here from the sample before: a view was set, the recording was off, or a detour was cut. */
    gap?: true;
}

/** What the trail reads of a view (the host's `DzView` has it all). */
export interface TrailView {
    cam: readonly string[];
    yaw: number;
    pitch: number;
    roll?: number;
    iters: number;
}

const apart = (a: Fixed3, b: Fixed3): V3 => [Number(b[0] - a[0]) / FIXED_UNIT, Number(b[1] - a[1]) / FIXED_UNIT, Number(b[2] - a[2]) / FIXED_UNIT];
const len = (v: V3): number => Math.hypot(v[0], v[1], v[2]);
const far = (a: Fixed3, b: Fixed3): number => len(apart(a, b));
const same = (a: Fixed3, b: Fixed3): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const alike = (a: number, b: number): boolean => a <= TRAIL_SAME_DEPTH * b && b <= TRAIL_SAME_DEPTH * a;
const fixed = (cam: readonly string[]): Fixed3 => [BigInt(cam[0]), BigInt(cam[1]), BigInt(cam[2])];
const sampleOf = (v: TrailView, depth: number, t: number): TrailSample =>
    ({ p: fixed(v.cam), yaw: v.yaw, pitch: v.pitch, ...(v.roll ? { roll: v.roll } : {}), t, depth, iters: v.iters });
/** `s` with another look (a roll of 0 is left out). */
function withLook(s: TrailSample, o: { yaw: number; pitch: number; roll?: number }): TrailSample {
    const { roll: _was, ...rest } = s;
    return { ...rest, yaw: o.yaw, pitch: o.pitch, ...(o.roll ? { roll: o.roll } : {}) };
}

// ── reading a trail ──────────────────────────────────────────────────────────────────────────────

/** Decades between the shallowest and the deepest view of a trail. */
export function trailDecades(samples: readonly TrailSample[]): number {
    let shallow = 0, deep = Infinity;
    for (const s of samples) { if (s.depth > shallow) shallow = s.depth; if (s.depth < deep) deep = s.depth; }
    return samples.length > 0 ? Math.log10(shallow / deep) : 0;
}

/** Seconds of flight from a trail's first sample to its last. */
export const trailSeconds = (samples: readonly TrailSample[]): number =>
    (samples.length > 0 ? samples[samples.length - 1].t - samples[0].t : 0);

/** The first sample that is the same place as `p`: within `reach` depths of it, at a similar depth. -1: none. */
function placeOf(samples: readonly TrailSample[], p: Fixed3, depth: number, reach: number): number {
    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (alike(s.depth, depth) && far(s.p, p) <= reach * Math.min(s.depth, depth)) return i;
    }
    return -1;
}

/**
 * The direction of travel at `here`, the camera as it stands at the end of `samples`: from where
 * it was `TRAIL_HEADING_TRAVEL` of `depth` of travel ago. Null when it has not flown to where it is.
 */
export function trailHeading(samples: readonly TrailSample[], here: Fixed3, depth: number): V3 | null {
    let from = here, travel = 0, back: Fixed3 | null = null;
    for (let i = samples.length - 1; i >= 0; i--) {
        travel += far(samples[i].p, from);
        from = back = samples[i].p;
        // A sample the camera was not flown to: the way before it is not the way here.
        if (travel >= TRAIL_HEADING_TRAVEL * depth || samples[i].gap) break;
    }
    if (!back) return null;
    const d = apart(back, here), l = len(d);
    return l > 0 ? [d[0] / l, d[1] / l, d[2] / l] : null;
}

/** The direction of travel at each sample: from the samples either side of it, as far as they were flown. */
export function trailDirections(samples: readonly TrailSample[]): (V3 | undefined)[] {
    return samples.map((s, i) => {
        const before = i > 0 && !s.gap ? samples[i - 1] : s;
        const after = i + 1 < samples.length && !samples[i + 1].gap ? samples[i + 1] : s;
        const d = apart(before.p, after.p), l = len(d);
        return l > 0 ? [d[0] / l, d[1] / l, d[2] / l] : undefined;
    });
}

// ── writing it ───────────────────────────────────────────────────────────────────────────────────

/** Over the cap: every second sample of the older half goes (a dropped `gap` passes to the next one kept). */
function thinOlder(samples: readonly TrailSample[]): TrailSample[] {
    const half = samples.length >> 1, out: TrailSample[] = [];
    let gap = false;
    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (i < half && i % 2 === 1) { gap ||= !!s.gap; continue; }
        out.push(gap && !s.gap ? { ...s, gap: true } : s);
        gap = false;
    }
    return out;
}

/**
 * A trail and the previous one. Every call is handed what it needs: the view (the host's), the
 * depth the app shows, the time in seconds. `kept` is called when a trail becomes the previous.
 */
export function createTrail(opts: { on?: boolean; kept?: () => void } = {}) {
    let on = opts.on !== false;
    let samples: TrailSample[] = [];
    let previous: readonly TrailSample[] | null = null;
    /** A view that was SET: the camera has not flown since. `depth` is what was shown as it was set. */
    let placed: { view: TrailView; depth: number; at: number } | null = null;
    /** The recording was off for a while: the next sample was not flown to from the last. */
    let loose = false;
    /** The camera stands exactly on the last sample. */
    let standing = false;
    let clock = 0, flew = NaN, shallow = 0, deep = Infinity;

    const push = (s: TrailSample): void => {
        samples.push(s);
        if (s.depth > shallow) shallow = s.depth;
        if (s.depth < deep) deep = s.depth;
        if (samples.length > TRAIL_CAP) samples = thinOlder(samples);
    };
    const close = (): boolean => {
        const done = samples;
        samples = []; placed = null; loose = false; standing = false; shallow = 0; deep = Infinity;
        if (done.length < 2 || trailDecades(done) <= TRAIL_KEEP_DECADES) return false;
        previous = done;
        opts.kept?.();
        return true;
    };
    /** The camera stands where it was PUT: that place begins the trail, joins it, or (the trail has never been there) ends it. */
    const settle = (depth: number): void => {
        if (!placed) return;
        const s = sampleOf(placed.view, depth, clock), end = samples[samples.length - 1];
        placed = null;
        if (!end) push(s);
        else if (same(end.p, s.p)) samples[samples.length - 1] = withLook(end, s);
        else if (placeOf(samples, s.p, depth, TRAIL_SET_REACH) >= 0) push({ ...s, gap: true });
        else { close(); push(s); }
        standing = true;
    };

    return {
        get on(): boolean { return on; },
        /** The trail as it stands (the camera's own place is not in it until it is a `TRAIL_STEP` away). */
        samples: (): readonly TrailSample[] => samples,
        previous: (): readonly TrailSample[] | null => previous,
        /** How deep and how long the trail is; null with fewer than two samples. */
        span: (): { decades: number; seconds: number } | null =>
            (samples.length > 1 ? { decades: Math.log10(shallow / deep), seconds: clock - samples[0].t } : null),

        /** Switch the recording. Off: nothing is taken and the trail stays. On again: `view` is where the camera stands. */
        setOn(next: boolean, view: TrailView | null, depth: number, now: number): void {
            if (on === next) return;
            on = next;
            placed = null;
            flew = NaN;
            if (!on) return;
            if (samples.length > 0) loose = true;
            else if (view) placed = { view, depth: NaN, at: now };
        },

        /** The camera may have flown: a hand's move, or a dive in flight. */
        follow(view: TrailView, depth: number, now: number): void {
            if (!on || !(depth > 0) || !Number.isFinite(depth)) return;
            if (placed && depth === placed.depth && now < placed.at + DEPTH_WAIT_SECONDS) return;   // PITFALLS: THE DEPTH SHOWN LAGS
            clock += Math.min(Math.max(0, now - flew) || 0, TRAIL_PAUSE_SECONDS);
            flew = now;
            settle(depth);
            const here = sampleOf(view, depth, clock), end = samples[samples.length - 1];
            const moved = end ? far(end.p, here.p) : Infinity;
            if (moved === 0) standing = true;
            else if (!end || loose || moved >= TRAIL_STEP * depth) { push(end && loose ? { ...here, gap: true } : here); standing = true; }
            else standing = false;
            if (standing) loose = false;
        },

        /** The camera turned where it stands: the latest look at a place is the one kept. */
        turned(o: { yaw: number; pitch: number; roll: number }): void {
            if (placed) placed.view = { ...placed.view, yaw: o.yaw, pitch: o.pitch, roll: o.roll };
            else if (on && standing && samples.length > 0) samples[samples.length - 1] = withLook(samples[samples.length - 1], o);
        },

        /** A view was SET (`setView`). `depth` is what the app shows now: the depth of the place just left. */
        set(view: TrailView, depth: number, now: number): void {
            standing = false;
            placed = on ? { view, depth, at: now } : null;
        },

        /**
         * The trail ends: a jump, another formula, a loaded scene. `view` is the camera as it
         * stands, before it is taken away. True: the trail was deep, and is now the previous one.
         */
        end(view: TrailView | null, depth: number): boolean {
            const tail = samples[samples.length - 1];
            if (view && on && !placed && tail) {
                const here = sampleOf(view, depth > 0 && Number.isFinite(depth) ? depth : tail.depth, clock);
                if (same(tail.p, here.p)) samples[samples.length - 1] = withLook(tail, here);
                else push(loose ? { ...here, gap: true } : here);
            }
            return close();
        },

        /** The trail from its start to the camera as it stands (`view`), as a new list. Null: there is no way to cut a route from. */
        toHere(view: TrailView, depth: number): TrailSample[] | null {
            const known = depth > 0 && Number.isFinite(depth);
            if (known) settle(depth);
            const out = samples.slice(), tail = out[out.length - 1];
            if (!tail) return null;
            if (!placed) {
                const here = sampleOf(view, known ? depth : tail.depth, clock);
                if (same(tail.p, here.p)) out[out.length - 1] = withLook(tail, here);
                else out.push(loose || !on ? { ...here, gap: true } : here);
            }
            return out.length > 1 ? out : null;
        },

        /** The direction of travel at the camera as it stands, from the trail; null when it did not fly to where it is. */
        heading(cam: readonly string[], depth: number): V3 | null {
            const tail = samples[samples.length - 1];
            if (!on || placed || loose || !tail) return null;
            return trailHeading(samples, fixed(cam), depth > 0 && Number.isFinite(depth) ? depth : tail.depth);
        },
    };
}

// ── cutting a route: the dead ends ───────────────────────────────────────────────────────────────

/**
 * The trail without its dead ends. A sample that comes back to a place the trail had been (see
 * `TRAIL_REACH`), by a way at least `TRAIL_DETOUR` times the straight one, follows that place
 * directly - the earliest such place - and is marked `gap`; everything in between goes.
 */
export function cutDetours(samples: readonly TrailSample[]): TrailSample[] {
    const out: TrailSample[] = [];
    /** For each kept sample: the step from the one kept before it, and that step's length. */
    const steps: V3[] = [], lengths: number[] = [];
    for (const s of samples) {
        const reach = s.gap ? TRAIL_SET_REACH : TRAIL_REACH, top = out.length - 1;
        let back = -1;
        if (top >= 0) {
            // From out[k] to `s`: the straight way as a sum of steps, and the way along the kept trail.
            let [x, y, z] = apart(out[top].p, s.p), travel = Math.hypot(x, y, z);
            for (let k = top; k >= 0; k--) {
                const e = out[k];
                if (k < top && alike(e.depth, s.depth)) {
                    const floor = Math.min(e.depth, s.depth);
                    const straight = travel < SUM_GOOD_DEPTHS * floor ? Math.hypot(x, y, z) : far(e.p, s.p);
                    if (straight <= reach * floor && travel >= TRAIL_DETOUR * straight) back = k;
                }
                x += steps[k][0]; y += steps[k][1]; z += steps[k][2];
                travel += lengths[k];
            }
        }
        if (back >= 0) { out.length = back + 1; steps.length = back + 1; lengths.length = back + 1; }
        const step: V3 = out.length > 0 ? apart(out[out.length - 1].p, s.p) : [0, 0, 0];
        out.push(back >= 0 && !s.gap ? { ...s, gap: true } : s);
        steps.push(step);
        lengths.push(len(step));
    }
    return out;
}

// ── a reversed route: the trail the other way ────────────────────────────────────────────────────

/**
 * The trail flown the other way: the same views in the opposite order. The clock is mirrored (the
 * first sample keeps its time, and every step takes as long as it did), and a `gap` stays on its
 * step: it marks the step INTO a sample, so it moves to the sample at that step's other end. The
 * first sample, which no step arrives at, takes the mark that marked no step before (the old first
 * one's), as `AnimationMath.mirrorKeyframes` does with an interpolation. The directions of travel
 * (`trailDirections`) come out negated, to the digit.
 */
export function reverseTrail(samples: readonly TrailSample[]): TrailSample[] {
    const n = samples.length, start = n > 0 ? samples[0].t : 0, end = n > 0 ? samples[n - 1].t : 0;
    return samples.map((_, j) => {
        const { gap: _gap, ...s } = samples[n - 1 - j], marked = samples[j === 0 ? 0 : n - j].gap;
        return { ...s, t: start + (end - s.t), ...(marked ? { gap: true as const } : {}) };
    });
}

// ── cutting a route: its keyframes and their times ───────────────────────────────────────────────

/** How a route is timed: the timeline's frame rate, the even pace in decades a second, the longest leg. */
export interface RouteTiming {
    fps: number;
    pace: number;
    maxLegSeconds: number;
}

const zoomKeyOf = (s: TrailSample, heading?: V3): ZoomKey => ({ time: 0, scale: s.depth, position: s.p, heading });
/** Seconds between two views at the even pace: their length on screen (two views at depth, far apart, measure an absurd one: the longest leg). */
function evenSeconds(a: ZoomKey, b: ZoomKey, o: RouteTiming): number {
    const seconds = zoomLegOnScreen(a, b, FIXED_UNIT) / Math.LN10 / o.pace;
    return Number.isFinite(seconds) ? Math.min(o.maxLegSeconds, seconds) : 0;
}

/**
 * The frame of each key when every leg takes its length on screen at `pace` decades a second: a
 * frame at least. `held` (the frames the keys have now): the first key keeps its frame, and a leg
 * that goes nowhere - a turn in place has no pace - keeps its length.
 */
export function evenFrames(keys: readonly ZoomKey[], o: RouteTiming, held?: readonly number[]): number[] {
    const frames = [held ? held[0] : 0];
    for (let i = 1; i < keys.length; i++) {
        const even = evenSeconds(keys[i - 1], keys[i], o) * o.fps;
        frames.push(frames[i - 1] + Math.max(1, held && even < 0.5 ? held[i] - held[i - 1] : Math.round(even)));
    }
    return frames;
}

/**
 * Seconds from the first sample to each one. At the even pace: the length ON SCREEN of the way
 * that was flown, sample to sample (not of the straight line between two keyframes: where what is
 * looked at changes by a decade between them, that line's length says nothing). `flown`: on the
 * trail's own clock, a stretch that was not flown (`gap`) at the even pace.
 */
function trailTimes(samples: readonly TrailSample[], o: RouteTiming, flown: boolean): Float64Array {
    const at = new Float64Array(samples.length);
    for (let i = 1; i < samples.length; i++) {
        at[i] = at[i - 1] + (flown && !samples[i].gap ? Math.max(0, samples[i].t - samples[i - 1].t) : evenSeconds(zoomKeyOf(samples[i - 1]), zoomKeyOf(samples[i]), o));
    }
    return at;
}
const framesAt = (times: Float64Array, index: readonly number[], o: RouteTiming, first: number): number[] => {
    const frames = [first];
    for (let j = 1; j < index.length; j++) frames.push(frames[j - 1] + Math.max(1, Math.round(Math.min(o.maxLegSeconds, Math.abs(times[index[j]] - times[index[j - 1]])) * o.fps)));
    return frames;
};

/**
 * The frame of each picked sample (`index`, into `samples`), from frame `first`: a leg takes the
 * time its stretch of the trail takes - at the even pace, or (`flown`) on the trail's own clock.
 */
export function trailFrames(samples: readonly TrailSample[], index: readonly number[], o: RouteTiming, flown = false, first = 0): number[] {
    return framesAt(trailTimes(samples, o, flown), index, o, first);
}

/**
 * The depth track between keyframes as the timeline holds it: Bezier keys whose handles are the
 * timeline's own (auto, worked out in log space, as `addKeyframe` does on a log track). `keys`
 * carry no id and no payload yet; `at(frame)` is the engine's own evaluation of them.
 */
export function depthCurve(frames: readonly number[], depths: readonly number[]): { keys: Keyframe[]; at: (frame: number) => number } {
    const bare: Keyframe[] = frames.map((frame, i) => ({ id: '', frame, value: depths[i], interpolation: 'Bezier', autoTangent: true, brokenTangents: false }));
    const keys = bare.map((k, i) => {
        const { l, r } = AnimationMath.calculateTangents(k, bare[i - 1], bare[i + 1], 'Auto', true);
        return { ...k, leftTangent: l, rightTangent: r };
    });
    const last = keys.length - 1;
    return {
        keys,
        at: (frame) => {
            if (last < 1 || frame < keys[0].frame) return keys[0].value;
            if (frame > keys[last].frame) return keys[last].value;
            let lo = 0, hi = last;                                       // the first segment that holds `frame`, as the engine takes it
            while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (keys[mid].frame < frame) lo = mid; else hi = mid; }
            return AnimationMath.interpolate(frame, keys[lo], keys[hi], false, true);
        },
    };
}

/** By leg: the trail sample furthest from the route, and how far, in depths at that sample; and the
 *  one whose depth the route's depth curve is furthest from where it passes it, in decades. */
interface LegWorst { worst: number; at: number; deep: number; deepAt: number }

/** The samples between keys `a` and `b` (indices into `samples`) that the route between frames `from` and `to` serves worst. */
function measure(samples: readonly TrailSample[], a: number, b: number, path: ZoomPath, depthAt: (frame: number) => number, from: number, to: number): LegWorst {
    if (b - a < 2) return { worst: 0, at: -1, deep: 0, deepAt: -1 };
    // Measured from the leg's deeper key, as the path itself is: a double holds what is added to it.
    const origin = samples[samples[b].depth < samples[a].depth ? b : a].p;
    const n = Math.max(1, Math.round(to - from)), line = new Float64Array(3 * (n + 1));
    for (let j = 0; j <= n; j++) {
        const q = zoomPathPosition(path, from + ((to - from) * j) / n);
        line[3 * j] = Number(q[0] - origin[0]) / FIXED_UNIT;
        line[3 * j + 1] = Number(q[1] - origin[1]) / FIXED_UNIT;
        line[3 * j + 2] = Number(q[2] - origin[2]) / FIXED_UNIT;
    }
    let worst = 0, at = -1, deep = 0, deepAt = -1;
    for (let i = a + 1; i < b; i++) {
        const s = samples[i];
        const x = Number(s.p[0] - origin[0]) / FIXED_UNIT, y = Number(s.p[1] - origin[1]) / FIXED_UNIT, z = Number(s.p[2] - origin[2]) / FIXED_UNIT;
        let best = Infinity, near = 0;
        for (let j = 0; ; j = Math.min(n, j + MEASURE_STRIDE)) {
            const d = (line[3 * j] - x) ** 2 + (line[3 * j + 1] - y) ** 2 + (line[3 * j + 2] - z) ** 2;
            if (d < best) { best = d; near = j; }
            if (j === n) break;
        }
        let least = best, where = near;                                 // the route's nearest point to the sample, in segments from `from`
        for (let j = Math.max(0, near - MEASURE_STRIDE); j < Math.min(n, near + MEASURE_STRIDE); j++) {
            const ax = line[3 * j] - x, ay = line[3 * j + 1] - y, az = line[3 * j + 2] - z;
            const dx = line[3 * j + 3] - x - ax, dy = line[3 * j + 4] - y - ay, dz = line[3 * j + 5] - z - az, l2 = dx * dx + dy * dy + dz * dz;
            const u = l2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy + az * dz) / l2)) : 0;
            const d = (ax + dx * u) ** 2 + (ay + dy * u) ** 2 + (az + dz * u) ** 2;
            if (d < least) { least = d; where = j + u; }
        }
        const off = Math.sqrt(least) / s.depth, decades = Math.abs(Math.log10(depthAt(from + ((to - from) * where) / n) / s.depth));
        if (off > worst) { worst = off; at = i; }
        if (decades > deep) { deep = decades; deepAt = i; }
    }
    return { worst, at, deep, deepAt };
}

/** What `pickKeyframes` gives. */
export interface TrailPick {
    /** The samples that are keyframes: indices into the trail, rising. */
    index: number[];
    /** Their frames at the even pace, from 0. */
    frames: number[];
    /** How far the worst sample lies from the route, in depths at that sample. */
    worst: number;
    /** How far the route's depth curve is from the depth of the worst sample where it passes it, in decades. */
    deep: number;
}

/**
 * The keyframes of a route through `samples` (a trail, its dead ends cut): the first and the last;
 * then, while the route's depth curve is more than `TRAIL_DEPTH_SLACK` decades from the depth of a
 * sample it passes, that sample; then the sample furthest from the route, until none is further
 * than `tolerance`. It stops at `cap` keyframes. The order they are made in does not depend on the
 * tolerance, so a tighter one never makes fewer.
 */
export function pickKeyframes(samples: readonly TrailSample[], o: RouteTiming & { tolerance: number; cap: number }): TrailPick {
    const n = samples.length, directions = trailDirections(samples), times = trailTimes(samples, o, false);
    const index = n > 1 ? [0, n - 1] : n === 1 ? [0] : [];
    const legs: (LegWorst | null)[] = new Array<LegWorst | null>(Math.max(0, index.length - 1)).fill(null);
    for (;;) {
        const frames = framesAt(times, index, o, 0);
        const keys = index.map((i, j): ZoomKey => ({ ...zoomKeyOf(samples[i], directions[i]), time: frames[j] }));
        const curve = depthCurve(frames, keys.map((k) => k.scale));
        const path = buildZoomPath(keys, { unit: FIXED_UNIT, scaleAt: curve.at });
        let worst = 0, leg = -1, deep = 0, deepLeg = -1;
        for (let l = 0; l < legs.length; l++) {
            const m = legs[l] ??= measure(samples, index[l], index[l + 1], path, curve.at, frames[l], frames[l + 1]);
            if (m.worst > worst) { worst = m.worst; leg = l; }
            if (m.deep > deep) { deep = m.deep; deepLeg = l; }
        }
        // The depth first: a route whose depth is a decade off the depth flown crawls or races there, wherever it runs.
        const depthFirst = deep > TRAIL_DEPTH_SLACK;
        if ((!depthFirst && (leg < 0 || worst <= o.tolerance)) || index.length >= o.cap) return { index, frames, worst, deep };
        if (depthFirst) leg = deepLeg;
        index.splice(leg + 1, 0, depthFirst ? (legs[leg] as LegWorst).deepAt : (legs[leg] as LegWorst).at);
        legs.splice(leg, 1, null, null);
        // A new key bends its neighbours too: the depth curve's handles two keys either side, the
        // path's tangents one further. Six legs are measured again.
        for (let l = Math.max(0, leg - 2); l <= Math.min(legs.length - 1, leg + 3); l++) legs[l] = null;
    }
}

// ── the app's trail ──────────────────────────────────────────────────────────────────────────────

/** The formula a trail was flown in (THE PREVIOUS TRAIL KEEPS THE FORMULA in the header). */
export interface TrailFormula {
    formula: DzFormulaSlice;
    /** The Julia constant of the view, while that mode is on: three strings, as a view holds it. */
    julia?: [string, string, string];
}
let readFormula: () => DzFormulaSlice | undefined = () => undefined;
/** What the trail as it stands was last flown in, and what the previous one was; the kept toast is said once a session. */
let flownIn: TrailFormula | null = null, previousIn: TrailFormula | null = null, toldKept = false;

const TRAIL_KEY = 'gmt.deepZoom.trail';
const trail = createTrail({
    on: safeLocalGet(TRAIL_KEY) !== '0',
    kept: () => {
        previousIn = flownIn;
        if (!toldKept) showToast('The trail so far is kept as the previous trail (Route tab)', 'info', 5000);
        toldKept = true;
    },
});

interface TrailUi {
    /** The trail is recording. */
    on: boolean;
    /** How deep and how long the trail is (`36.8 decades · 1 min 32 s`); '' with nothing flown yet. */
    line: string;
    /** The same of the previous trail; '' when none is kept. */
    previous: string;
}
export const useTrail = create<TrailUi>()(() => ({ on: trail.on, line: '', previous: '' }));

const shown = (): number => useDzNavigation.getState().depth;
const seconds = (): number => performance.now() / 1000;
function spanText(decades: number, flight: number): string {
    const s = Math.round(flight);
    return `${decades.toFixed(1)} decades · ${s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`}`;
}
let describedPrevious: readonly TrailSample[] | null = null;
let previousText = '';
/** Bring the two lines level; nothing is notified while neither changed. */
function publish(): void {
    const now = trail.span(), was = trail.previous();
    if (was !== describedPrevious) { describedPrevious = was; previousText = was ? spanText(trailDecades(was), trailSeconds(was)) : ''; }
    const line = now ? spanText(now.decades, now.seconds) : '', ui = useTrail.getState();
    if (ui.line !== line || ui.previous !== previousText) useTrail.setState({ line, previous: previousText });
}

/** The camera may have flown (a hand's move, a dive in flight): the trail follows. Microseconds: no ray, no reading. */
export function followTrail(): void {
    const host = getHost();
    if (!host || !trail.on) return;
    const view = host.getView(), formula = readFormula();
    trail.follow(view, shown(), seconds());
    // After the follow: a trail that this call ended (a set view it had never been at) keeps what it was flown in.
    flownIn = formula ? { formula, ...(view.julia ? { julia: view.julia } : {}) } : null;
    publish();
}

/** How the trail reads the formula in force: `installLocations` hands it the store's (see the header). */
export function setTrailFormulaReader(read: () => DzFormulaSlice): void {
    readFormula = read;
}

/** The camera turned. */
export function trailTurned(): void {
    const host = getHost();
    if (host) trail.turned(host.orientation());
}

/** A view was set on the host (every `setView`, the route's own included), or a host became ready. */
export function trailViewSet(): void {
    const host = getHost();
    if (host) trail.set(host.getView(), shown(), seconds());
}

/** A jump, a change of formula, a loaded scene: the trail ends where the camera stands. Call BEFORE the view is set. */
export function trailEnds(): void {
    trail.end(getHost()?.getView() ?? null, shown());
    publish();
}

/** The record button. The choice is remembered on this device. */
export function setTrailOn(on: boolean): void {
    if (on === trail.on) return;
    trail.setOn(on, getHost()?.getView() ?? null, shown(), seconds());
    safeLocalSet(TRAIL_KEY, on ? '1' : '0');
    useTrail.setState({ on });
}

/** The trail from its start to the camera as it stands; null when there is nothing to cut a route from. */
export function trailToHere(): TrailSample[] | null {
    const host = getHost(), out = host ? trail.toHere(host.getView(), shown()) : null;
    publish();
    return out;
}

/** The trail as it is kept now, and the one the last jump ended (null: none deep enough was). */
export const trailSamples = (): readonly TrailSample[] => trail.samples();
export const previousTrail = (): readonly TrailSample[] | null => trail.previous();
/** The formula the previous trail was flown in; null when none is kept or it is not known. */
export const previousTrailFormula = (): TrailFormula | null => (trail.previous() ? previousIn : null);

/** The direction of travel at the camera as it stands, read off the trail; null when the trail cannot say. */
export function trailHeadingNow(): V3 | null {
    const host = getHost();
    return host ? trail.heading(host.getView().cam, shown()) : null;
}
