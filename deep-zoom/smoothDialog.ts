/**
 * deep-zoom/smoothDialog.ts - the Smooth... dialog's logic, with no React, so node reaches all of it
 * (check:deep-zoom-route, the "dialog: ..." lines). The dialog is deep-zoom/components/SmoothDialog.tsx,
 * opened from the Route tab; the pass is `smoothRoute` in deep-zoom/route.ts, its rules deep-zoom/routeSmooth.ts's.
 * Every option is the owner's call of 2026-10-16 (plans/deep-zoom-shell/SMOOTHING.md, "The tool, as decided"
 * and his answers under it): do not re-decide them here.
 *
 * WHAT IT HOLDS
 *   - WHAT IS SMOOTHED (`smoothSpan`): the whole route; the legs selected (the rows of the Route tab, or the
 *     route's keys on the timeline: from the first keyframe selected to the last, every leg between - a pass
 *     smooths a run of legs, so a selection with gaps is taken whole); or a frame range (the legs that hold
 *     it: a pass works on whole legs, so the range is widened to the keyframes about it). Pauses inside are
 *     smoothed - the owner: "remember its a smooth tool where you can select which legs to smooth"; to keep
 *     one, leave its legs out.
 *   - THE STRENGTH (`strengthScale`, `strengthFor`): ONE logarithmic slider from 4 s (`STRENGTH_MIN`) to the
 *     length of what is smoothed, and at that length ONE EVEN PACE (the owner: "log slider at 4s its
 *     averaged over 4s, at clip's full length its an even pace"). The slider's far end is held as 'even'
 *     (`EVEN`), not as a number of seconds, so a selection that grows stays even; a selection 4 s long or
 *     less can only be even.
 *   - THE MISS ALLOWED at a keyframe and THE FREE LOOK'S SMOOTHING: optional sliders (his answers 4 and 5);
 *     off, every keyframe's aim stays (every keyframe exact) and the look is carried as it is.
 *   - THE PACE GRAPH (`readPace`, `paceColumns`, `keyframeMap`, `paceRange`, `strayFrames`, `strayShare`): how fast the
 *     middle of the picture moves along the route, as the reader reads it (`routePictureSpeed`: every third frame, the
 *     picture chosen in "Even out by", which was "Pace by" until 2026-10-17), BEFORE the pass and AFTER it. Its score is
 *     a SHARE of the frames read (`strayShare`), not a count, which grows with a longer route (the owner, STREAMLINE.md
 *     stage 6). AFTER IS THE ROUTE READ AGAIN as the engine
 *     plays it, not the pass's own reckoning (`SmoothResult.speedAfter`): S1 measured the two apart on the
 *     owner's route (82 frames off against 3; the path between keyframes moves a little with a retime).
 *     The reading before is drawn on the route's timing after, through the keyframes (`keyframeMap`): the two
 *     lines meet at every keyframe, so a section's edges are one place in both.
 *     A reading is kept by WHAT THE ROUTE IS (`routeSignature`: its three tracks, the free look's when the
 *     look sets the pace, the formula's values, the frame rate), so an undo or a redo of a pass shows its
 *     graph again without a ray read.
 *   - CLOSE KEYFRAMES (`closeRows`): legs under half a second (`CLOSE_LEG_SECONDS`), each with whether a
 *     merge can take one of its two keyframes (never a K one, never an end: `mergeCloseKeyframes`). His
 *     call: "warn, merge" - a warning and a Merge offered, never a merge by the pass itself.
 *   - THE RUN (`runSmooth`): the picture before (read unless known), the pass, the picture after, each
 *     with its progress. CANCEL (`signal`) stops whichever is running between two of the reader's tasks:
 *     before the pass writes, nothing changes and no undo step is left; once the pass has written, Cancel
 *     only stops the reading after it (the pass stands, one undo on the timeline takes it back).
 *
 * PITFALLS
 *   - A READING IS OF ONE "EVEN OUT BY". The graph's before and after are read the same way, so the change it
 *     shows is the pass's; switching "Even out by" reads the route again.
 *   - THE SIGNATURE IS A STRING OF EVERY KEY of the three tracks (about 200 KB on the owner's route of 105
 *     keyframes and 911 pace keys): build it when the route changes, not every render.
 *   - A reading made while the user changed a formula value under it is kept under the values it started
 *     with: it is that route's reading, give or take what changed.
 *   - THE READER KEYS THE COUNT, NOT THE FORMULA: `readRouteRays` puts the camera on each frame with the
 *     iteration count keyed there and every other formula value as the renderer has it at the time (the
 *     playhead's). A route that keys power or a box value is read with one value throughout; the signature
 *     holds such a value's keys, so a reading is kept by the route, not by where the playhead stood.
 *
 * @invariant The strength slider runs from 4 s to the length of what is smoothed, on a log scale, and its far
 *   end is one even pace - the length itself, and still the length when the selection grows - proven by: npm run
 *   check:deep-zoom-route ("dialog: the strength is one log slider from 4 s ..."). Falsified 2026-10-16:
 *   `strengthFor` handing 4 s for `EVEN` -> that line red.
 * @invariant Cancel while the rays are read stops the reading at once, and the route is as it was with no undo
 *   step and the camera where it stood - proven by: npm run check:deep-zoom-route ("dialog: Cancel while the
 *   rays are read ..."). Falsified 2026-10-16: `readRouteRays` not looking at the signal -> 2 red (22,860 rays
 *   asked where 12,375 had been at the Cancel; and "dialog: Cancel while the route is read after the pass ...").
 * @assumption What is smoothed (the legs between the first and the last keyframe selected, the legs that hold a
 *   frame range), a run's three phases and its readings kept by signature through an undo and a redo, the graph's
 *   columns and range, the stray score against the check's own (its share too), and the close keyframes' rows have green lines in
 *   the same check ("dialog: ..."), none broken on its own (three breaks were the stage's allowance).
 */
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { getHost } from './host/current';
import { LOOK_TRACKS, ROUTE_ITERATIONS_TRACK, ROUTE_PACE_TRACK, ROUTE_TRACK, routeKeys, routePictureSpeed, smoothRoute } from './route';
import type { PaceBy, RouteKey, SmoothResult } from './route';
import { PICTURE_READ_EVERY } from './routeSmooth';

/** The strength slider starts here, in seconds (the owner: "log slider at 4s its averaged over 4s"). */
export const STRENGTH_MIN = 4;
/** The strength's far end: one even pace over what is smoothed, however long that is. */
export const EVEN = 'even' as const;
export type Strength = number | typeof EVEN;
/** The miss allowed at a keyframe, degrees: the slider's range and where it starts (the study's 5; 2 barely helped, 10 calmed the turn twice as much). */
export const MISS = { min: 1, max: 15, initial: 5 } as const;
/** The free look's own smoothing, seconds (the study: 0.5 s moves it 5 degrees at most; 1 s flattens a quick glance by up to 14). */
export const LOOK_SMOOTHING = { min: 0.1, max: 2, initial: 0.5 } as const;
/** The far end of the slider is caught within this share of the track's length: a drag to the end means even. */
const EVEN_CATCH = 0.005;

// ── what is smoothed ─────────────────────────────────────────────────────────────────────────────

/** The whole route, the legs selected, or a frame range. */
export type SmoothScope = 'route' | 'legs' | 'frames';

/** What a pass will smooth: keyframes `a` to `b` of the route (indices), the range `smoothRoute` takes
 *  (absent: the whole route), and how long that is. */
export interface SmoothSpan {
    a: number;
    b: number;
    range?: readonly [string, string];
    frames: number;
    seconds: number;
}

/**
 * What is smoothed, or null when there is nothing to smooth: fewer than two keyframes, legs asked for with
 * fewer than two keyframes selected, a frame range that holds no leg. `picked`: the ids of the keyframes
 * selected (`timelinePicked` turns the timeline's selection into these). `frames`: the range, both ends in
 * timeline frames.
 */
export function smoothSpan(keys: readonly RouteKey[], scope: SmoothScope, picked: readonly string[], frames: readonly [number, number], fps: number): SmoothSpan | null {
    const last = keys.length - 1;
    if (last < 1 || !(fps > 0)) return null;
    let a = 0, b = last;
    if (scope === 'legs') {
        const at = [...new Set(picked.map((id) => keys.findIndex((k) => k.id === id)).filter((i) => i >= 0))];
        if (at.length < 2) return null;
        a = Math.min(...at);
        b = Math.max(...at);
    } else if (scope === 'frames') {
        const lo = Math.min(frames[0], frames[1]), hi = Math.max(frames[0], frames[1]);
        if (!(hi > lo)) return null;
        // The legs that hold the range: from the last keyframe at or before its start to the first at or after its end.
        keys.forEach((k, i) => { if (k.frame <= lo) a = i; });
        for (let i = last; i >= 0; i--) if (keys[i].frame >= hi) b = i;
        if (b <= a) return null;
    }
    const n = keys[b].frame - keys[a].frame;
    return { a, b, ...(scope === 'route' ? {} : { range: [keys[a].id, keys[b].id] as const }), frames: n, seconds: n / fps };
}

/** The route's keyframes among the timeline's selected keys (`selectedKeyframeIds`, "track::key"). */
export function timelinePicked(selected: readonly string[]): string[] {
    const prefix = `${ROUTE_TRACK}::`;
    return selected.filter((s) => s.startsWith(prefix)).map((s) => s.slice(prefix.length));
}

// ── the strength ─────────────────────────────────────────────────────────────────────────────────

/** The strength slider for what is `seconds` long: logarithmic from `STRENGTH_MIN` to the length. `slides`
 *  false: it is 4 s or shorter, and only one even pace can be asked for. */
export function strengthScale(seconds: number): { min: number; max: number; slides: boolean } {
    return seconds > STRENGTH_MIN ? { min: STRENGTH_MIN, max: seconds, slides: true } : { min: seconds, max: seconds, slides: false };
}

/** The seconds the pass is given for a strength over what is `seconds` long: held to the scale, and the
 *  length itself - one even pace (`smoothRoute`: a strength of the selection's length or more) - for `EVEN`
 *  and at the slider's far end. */
export function strengthFor(strength: Strength, seconds: number): number {
    return strength === EVEN ? seconds : Math.min(seconds, Math.max(STRENGTH_MIN, strength));
}

/** What the slider's value means once the hand lets go: `EVEN` within `EVEN_CATCH` of the far end (a log
 *  mapping gives the end back only to the last digit), the seconds otherwise. */
export function strengthFromSlider(value: number, seconds: number): Strength {
    const { min, max, slides } = strengthScale(seconds);
    if (!slides || Math.log(value / min) >= (1 - EVEN_CATCH) * Math.log(max / min)) return EVEN;
    return Math.max(min, value);
}

/** The strength in words: "4.0 s", "12 s", or "Even pace". */
export function strengthText(strength: Strength, seconds: number): string {
    const s = strengthFor(strength, seconds);
    if (strength === EVEN || s >= seconds) return 'Even pace';
    return s < 10 ? `${s.toFixed(1)} s` : `${Math.round(s)} s`;
}

// ── the pace graph ───────────────────────────────────────────────────────────────────────────────

/** A reading of the route: the middle of the picture's speed (picture heights a second) at every frame from
 *  the route's first keyframe (`first`), read by `by`. */
export interface PaceReading {
    by: PaceBy;
    first: number;
    fps: number;
    speed: Float64Array;
}

/** FNV-1a over a string, two lanes: a short name for a long signature. */
function hash(s: string): string {
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ s.length;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x5bd1e995);
    }
    return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}-${s.length.toString(36)}`;
}

/**
 * WHAT THE ROUTE IS, as far as a reading by `by` goes: the depth track (its keyframes' views and depths), the
 * Pace track, the iteration keys, the free look's tracks when the look sets the pace, the formula (the rays march
 * its orbit: its values, and the keys of a value keyed on the timeline), the iteration count in force when none is
 * keyed, and the frame rate. Two routes with one signature read the same - give or take the reader's own way with a
 * keyed formula value (PITFALLS).
 */
export function routeSignature(by: PaceBy): string {
    const a = useAnimationStore.getState(), tracks = a.sequence.tracks;
    const keysOf = (id: string): unknown => tracks[id]?.keyframes ?? null;
    const iters = tracks[ROUTE_ITERATIONS_TRACK]?.keyframes.length ? null : getHost()?.getView().iters ?? null;
    // A formula value keyed on the timeline is the route's: its keys, not the value the playhead has now (the
    // pass moves the playhead, and an undo does not move it back).
    const keyed = Object.keys(tracks).filter((id) => id.startsWith('dzFormula.') && id !== ROUTE_ITERATIONS_TRACK && tracks[id].keyframes.length > 0).sort();
    const { iterations: _i, autoIterations: _a, ...formula } = ((useEngineStore.getState() as unknown as { dzFormula?: Record<string, unknown> }).dzFormula ?? {});
    const unkeyed = Object.entries(formula).filter(([p]) => !keyed.includes(`dzFormula.${p}`));
    return hash(JSON.stringify([by, a.fps, keysOf(ROUTE_TRACK), keysOf(ROUTE_PACE_TRACK), keysOf(ROUTE_ITERATIONS_TRACK), by === 'look' ? LOOK_TRACKS.map(keysOf) : null,
        unkeyed, keyed.map((id) => [id, keysOf(id)]), iters]));
}

/** The readings made, by signature, the newest last; no more than `READINGS_KEPT`. */
const readings = new Map<string, PaceReading>();
const READINGS_KEPT = 8;

function keepReading(sig: string, reading: PaceReading): void {
    readings.delete(sig);
    readings.set(sig, reading);
    for (const key of readings.keys()) { if (readings.size <= READINGS_KEPT) break; readings.delete(key); }
}

/** The reading of the route as it stands by `by`, when one was made; null otherwise. `sig`: its signature, when known. */
export function knownPace(by: PaceBy, sig = routeSignature(by)): PaceReading | null {
    return readings.get(sig) ?? null;
}

/**
 * The route as it stands, read by `by` (`routePictureSpeed`, every third frame): the reading kept for this
 * route when there is one, read otherwise, a task at a time with `onProgress`. Null when it could not be read:
 * fewer than two keyframes, no renderer, a render running, the route changed under it, `signal` aborted.
 */
export async function readPace(by: PaceBy, onProgress?: (done: number, of: number) => void, signal?: AbortSignal): Promise<PaceReading | null> {
    const sig = routeSignature(by), known = readings.get(sig);
    if (known) return known;
    const fps = useAnimationStore.getState().fps;
    const read = await routePictureSpeed(by, PICTURE_READ_EVERY, onProgress, signal);
    if (!read) return null;
    const reading: PaceReading = { by, first: read.first, fps, speed: read.speed };
    keepReading(sig, reading);
    return reading;
}

/**
 * A reading as `columns` columns over the frames `[lo, hi)` of the timing the graph is drawn in (frames from the
 * route's first keyframe): each the mean, in log, of the frames that fall in it (NaN where none does). `at` places
 * frame i of the reading in that timing - for a reading of the route before a pass, `keyframeMap` through the
 * keyframes, so that both lines meet at every keyframe; a frame falls in column floor((at(i) - lo) * columns / (hi - lo)).
 */
export function paceColumns(speed: ArrayLike<number>, columns: number, lo = 0, hi = speed.length, at: (i: number) => number = (i) => i): Float64Array {
    const sum = new Float64Array(columns), count = new Float64Array(columns), out = new Float64Array(columns).fill(NaN);
    if (!(hi > lo) || columns < 1) return out;
    for (let i = 0; i < speed.length; i++) {
        const v = speed[i], c = Math.floor(((at(i) - lo) * columns) / (hi - lo));
        if (!(v > 0) || c < 0 || c >= columns) continue;
        sum[c] += Math.log(v);
        count[c]++;
    }
    for (let c = 0; c < columns; c++) if (count[c] > 0) out[c] = Math.exp(sum[c] / count[c]);
    return out;
}

/**
 * One timing of the route into another, through its keyframes: `was` and `now` are the same keyframes' frames in
 * the two, in route order (a pass moves keyframes in time, never adds or drops one). Linear between two keyframes;
 * before the first and past the last, moved as that keyframe was.
 */
export function keyframeMap(was: readonly number[], now: readonly number[]): (f: number) => number {
    const n = Math.min(was.length, now.length);
    return (f) => {
        if (n === 0) return f;
        if (f <= was[0]) return f - was[0] + now[0];
        if (f >= was[n - 1]) return f - was[n - 1] + now[n - 1];
        let j = 0, hi = n - 1;
        while (hi - j > 1) { const mid = (j + hi) >> 1; if (was[mid] <= f) j = mid; else hi = mid; }
        return now[j] + ((f - was[j]) * (now[j + 1] - now[j])) / (was[j + 1] - was[j]);
    };
}

/** The graph's vertical range for these readings: their 1st to 99th percentile, in log, widened by a tenth
 *  each way (one wall pass must not flatten the rest). Picture heights a second. */
export function paceRange(...speeds: ArrayLike<number>[]): { lo: number; hi: number } {
    const all: number[] = [];
    for (const s of speeds) for (let i = 0; i < s.length; i++) if (s[i] > 0) all.push(Math.log(s[i]));
    if (all.length === 0) return { lo: 0.1, hi: 1 };
    all.sort((x, y) => x - y);
    const lo = all[Math.floor(0.01 * (all.length - 1))], hi = all[Math.ceil(0.99 * (all.length - 1))], pad = Math.max(0.1, hi - lo) * 0.1;
    return { lo: Math.exp(lo - pad), hi: Math.exp(hi + pad) };
}

/**
 * FRAMES WHERE THE MIDDLE OF THE PICTURE STRAYS over 25 % from its own 3 s average (a Gaussian of 1.5 s, in
 * log): the study's score (SMOOTHING.md; debug/scratch/route-smooth/evalbuilt.mts), the one number the
 * dialog gives beside the graph. Frames not read (NaN) are left out of it. Only the frames `[lo, hi)` are
 * counted (what is smoothed); each is still judged against its average over the frames about it, wherever they lie.
 */
export function strayFrames(speed: ArrayLike<number>, fps: number, lo = 0, hi = speed.length): number {
    const n = speed.length, L = new Float64Array(n), ok = new Uint8Array(n), sigma = 1.5 * fps, R = Math.ceil(3 * sigma);
    for (let i = 0; i < n; i++) { const v = speed[i]; ok[i] = v > 0 ? 1 : 0; L[i] = Math.log(Math.max(1e-4, v)); }
    let strays = 0;
    for (let i = Math.max(0, Math.floor(lo)); i < Math.min(n, Math.ceil(hi)); i++) {
        if (!ok[i]) continue;
        let a = 0, w = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) { if (!ok[j]) continue; const g = Math.exp(-0.5 * ((j - i) / sigma) ** 2); a += g * L[j]; w += g; }
        const r = Math.exp(L[i] - a / w);
        if (r > 1.25 || r < 0.8) strays++;
    }
    return strays;
}

/**
 * The share of the frames `[lo, hi)` that were read (frames not read, NaN, are left out) which stray
 * (`strayFrames`): 0 to 1, null when none was read. What the dialog gives - a share, not a count, which grows
 * with a longer route.
 */
export function strayShare(speed: ArrayLike<number>, fps: number, lo = 0, hi = speed.length): number | null {
    let read = 0;
    for (let i = Math.max(0, Math.floor(lo)); i < Math.min(speed.length, Math.ceil(hi)); i++) if (speed[i] > 0) read++;
    return read > 0 ? strayFrames(speed, fps, lo, hi) / read : null;
}

// ── close keyframes ──────────────────────────────────────────────────────────────────────────────

/** A leg under half a second, by the keyframe it arrives at (`number`, from 1): how long it is, and whether
 *  a merge can take one of its two keyframes (one that is not an end and has no K mark). */
export interface CloseRow {
    id: string;
    number: number;
    seconds: number;
    merge: boolean;
}

/** The rows of the close keyframes `ids` (`closeKeyframes`, `SmoothResult.close`), in the order given. */
export function closeRows(keys: readonly RouteKey[], ids: readonly string[], fps: number): CloseRow[] {
    const last = keys.length - 1, out: CloseRow[] = [];
    for (const id of ids) {
        const i = keys.findIndex((k) => k.id === id);
        if (i < 1) continue;
        out.push({ id, number: i + 1, seconds: (keys[i].frame - keys[i - 1].frame) / fps, merge: [i - 1, i].some((j) => j > 0 && j < last && !keys[j].exact) });
    }
    return out;
}

// ── the run ──────────────────────────────────────────────────────────────────────────────────────

/** What the run is doing: reading the picture before the pass, the pass (its rays, then writing), reading it after. */
export type SmoothPhase = 'before' | 'pass' | 'after';

export interface SmoothAsk {
    /** Seconds (`strengthFor`): the selection's length or more is one even pace. */
    strength: number;
    /** Degrees, or null: every keyframe exact. */
    miss: number | null;
    /** Seconds, or null: the free look carried as it is. */
    look: number | null;
    paceBy: PaceBy;
    /** Two keyframes' ids, or absent: the whole route. */
    range?: readonly [string, string];
}

/** A pass the dialog ran: what it did, and the route's readings before and after it (null where one was not finished). */
export interface SmoothRun {
    result: SmoothResult;
    before: PaceReading | null;
    after: PaceReading | null;
    /** The keyframes' frames before and after the pass, in route order: the graph draws the reading before on the
     *  route's timing after (`keyframeMap`). */
    framesBefore: number[];
    framesAfter: number[];
    /** The route's signatures before and after the pass: the graph shows the before line while the route is the after one. */
    beforeSig: string;
    afterSig: string;
}

/** The last pass run from the dialog, this session. */
let lastRun: SmoothRun | null = null;
export const lastSmoothRun = (): SmoothRun | null => lastRun;

/**
 * THE RUN: the route read before (unless known), the pass, the route read after - each phase told to
 * `onPhase` with its progress. Resolves to the run, or null when nothing was done: Cancel (`signal`) before
 * the pass wrote, the reading before could not be made, or the pass did nothing (see `smoothRoute`).
 * A Cancel during the reading after keeps the pass (`after` is null then).
 */
export async function runSmooth(ask: SmoothAsk, onPhase: (phase: SmoothPhase, done: number, of: number) => void, signal?: AbortSignal): Promise<SmoothRun | null> {
    const beforeSig = routeSignature(ask.paceBy), framesBefore = routeKeys().map((k) => k.frame);
    onPhase('before', 0, 1);
    const before = await readPace(ask.paceBy, (done, of) => onPhase('before', done, of), signal);
    if (!before || signal?.aborted) return null;
    onPhase('pass', 0, 1);
    const result = await smoothRoute({
        strength: ask.strength, miss: ask.miss, look: ask.look, paceBy: ask.paceBy, ...(ask.range ? { range: ask.range } : {}),
        onProgress: (done, of) => onPhase('pass', done, of), signal,
    });
    if (!result) return null;
    const afterSig = routeSignature(ask.paceBy);
    lastRun = { result, before, after: null, beforeSig, afterSig, framesBefore, framesAfter: routeKeys().map((k) => k.frame) };
    onPhase('after', 0, 1);
    const after = await readPace(ask.paceBy, (done, of) => onPhase('after', done, of), signal);
    lastRun = { ...lastRun, after };
    return lastRun;
}
