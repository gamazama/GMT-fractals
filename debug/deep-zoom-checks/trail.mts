/**
 * trail check: the trail (`deep-zoom/trail.ts`) and the route cut from it (`deep-zoom/route.ts`).
 * Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/trail.mts        (npm run check:deep-zoom-trail)
 *
 * TWO HALVES. The first drives `createTrail()` and the three cutting functions directly: no store,
 * no host, a clock that is a number. The second is the app's own wiring, as the route check has
 * it: the real animation store and engine, the engine store with the `dzFormula` and `camera`
 * features, the host sync, and a fake host (a camera of three strings and three angles, a depth, an
 * iteration count, a log of every `setView`). There the depth the app shows is published by hand
 * (`setReadings`) and `performance.now` is the check's own clock.
 *
 * THE SCENE. A floor: the depth is the camera's height above it, so a dive is straight down and a
 * flight at one depth is a flight sideways. The flown dive of most groups winds about its axis
 * (0.3 of the depth off it, a turn every 1.8 decades), half a percent of the depth a frame.
 *
 *   thin     a sample 2 % of the depth apart; past the cap the older half thins and nothing else
 *   turn     a turn alone takes no sample; the look kept for a place is the latest
 *   end      an ending trail: shallow, it is gone; deep, it is the previous one (one only); a view
 *            set where the trail has been joins it, one set elsewhere ends it; off takes nothing
 *   cut      a dead end is dropped and the way to here kept; a straight dive, a wide turn untouched
 *   pick     every sample within the tolerance; a tighter tolerance never fewer keyframes; the cap
 *   time     the even pace against the trail's clock; a pause is half a second; a gap is even
 *   heading  a tap back does not turn it, a retreat does; with the trail off, the same
 *   route    "Route to here" in the app: one undo step, no view set, the camera on the route
 *   exact    its keyframes are trail samples to the digit, each with its iteration key
 *   smooth   the smoothing cuts it again from the same trail, and back
 *   picture  (2026-10-12) the keyframes of a cut route get their pictures: each of its own view with its own count, a
 *            frame run before it is taken and the renderer's iteration rule held off meanwhile; the camera is put back
 *            to the digit; the trail, the route and the undo stack are told nothing; a route cut again draws only the
 *            samples that are new. NOT FALSIFIED: green lines only.
 *            A ROUTE THAT ARRIVES with a loaded scene (`setSequence`: five keyframes under other ids) is owed its
 *            pictures and gets them from the same pass: not while a formula's shader builds, the camera and the undo
 *            stack as they were, each keyframe tried once. FALSIFIED 2026-10-12, route.ts, the `owePictures` listener on
 *            the route's track taken out of `installRoute` -> 4 red: "picture: a route that arrives with a loaded scene
 *            ..." (0 owed), the two lines after it, and "a keyframe whose picture could not be drawn ..." (0 of 5 pictured).
 *   follow   an iteration key follows its keyframe on the timeline: moved, deleted, across another
 *   reverse  (2026-10-16, stage Z1 of plans/deep-zoom-shell/ZOOM-OUTS.md) `reverseTrail`: the same views the other way,
 *            each gap on its step, the clock mirrored, the directions negated, twice the trail it was. In the app: the
 *            cut route reversed still knows its trail (the trail reversed); "As flown" times each leg as flown, the
 *            other way round; the smoothing cuts again from the trail reversed, with the pictures its samples had, and
 *            turned back gives the reversed route; reversed again it reads the very trail it was cut from.
 *            FALSIFIED 2026-10-16, route.ts, `routeSource` never turning the trail round -> 4 red: "reverse: a route cut
 *            from the trail, reversed ...", "reverse: the smoothing slider cuts it again ..." (the route ran forwards
 *            again), "reverse: and turned back ...", "reverse: reversed again ...". "As flown" stayed green: timed off the
 *            trail forwards with the samples descending, each leg is the same size. Two later lines ("heading: a
 *            keyframe set by hand after it ...", "end: a route is made from the previous trail ...") went red too: they
 *            stood on the playhead the broken block left. The block has put the playhead back since; that run was not
 *            repeated. NOT FALSIFIED: the three lines of `reverseTrail` alone, and the pictures.
 *
 * MEASURED HERE, 2026-10-11 (this machine, node; the two "cost:" lines the check prints):
 * `cutDetours` on 3767 samples that are all at one depth - its worst case, every sample compared
 * with every other - 190 ms; `pickKeyframes` on 691 samples at six tolerances, 60 ms in all.
 *
 * FALSIFICATION RECORD, 2026-10-11, one break per run, in deep-zoom/trail.ts unless route.ts is
 * named; both files were put back byte for byte afterwards (their checksums compared). The break,
 * then what went red:
 *   - thin:    a sample taken for any move (`moved >= TRAIL_STEP * depth` -> `>= 0`)      -> 8 red: three "thin:" lines (steps of 0.005,
 *              459 samples a decade, an older half 1 % apart), and five that count samples elsewhere
 *   - thin:    the cap thinning the NEWER half (`i < half` -> `i >= half` in `thinOlder`)  -> 1 red: "thin: it is the older half that lost ..."
 *   - thin:    no cap (`samples.length > TRAIL_CAP` -> `> TRAIL_CAP * 9`)                  -> 2 red: "thin: the trail never holds more than
 *              4096 samples ..." (most 4104) and the line after it
 *   - turn:    `turned` pushing a sample instead of refreshing the last one's look         -> 7 red: the four "turn:" lines ("20 more"), "route:
 *              a turn where the camera stands takes no sample", and two "exact:" lines
 *   - end:     no trail deep enough to keep (`TRAIL_KEEP_DECADES` -> 99)                   -> 5 red: "end: one four decades deep becomes the
 *              previous trail ...", the two after it, and in the app "a jump ends the trail ..." and "a route is made from the previous trail ..."
 *   - end:     a set view always joining (`placeOf(...) >= 0` -> `>= -1`), and `follow`
 *              not asking whether the trail is on (two breaks, one run)                    -> 3 red: "end: a view set where it has never been
 *              ends it there ..." (234 samples), "end: switched off, nothing is taken ..." (30 more), "end: switched on again ..."
 *   - cut:     no way back a detour (`TRAIL_DETOUR` 3 -> 3e9)                              -> 3 red: "cut: ... the dead end is gone" (kept out
 *              to 2.255), "cut: one sample is marked ...", "cut: a view set 0.8 of a depth from a place ..."
 *   - pick:    the pick stopping at three times the tolerance                              -> 4 red: "pick: at each of six tolerances ..." (0.80
 *              at 0.5, 0.13 at 0.05), "route: every sample of the trail lies within the smoothing ...", two "smooth:" lines
 *   - pick:    the depth curve not held (`TRAIL_DEPTH_SLACK` 0.5 -> 0.5e9)                 -> 2 red: "pick: where the depth shown steps a decade
 *              ..." (2 keyframes, the curve 0.75 decades off) and the line after it
 *   - time:    a pause not clipped (`TRAIL_PAUSE_SECONDS` 0.5 -> 0.5e9)                    -> 2 red: "time: ten seconds of standing still count
 *              half a second ..." (32.9 s against 23.4), "time: as flown, the leg flown twice as fast ..."
 *   - time:    the even pace measured along the straight line from the trail's first sample
 *              (in `trailTimes`), not sample to sample                                     -> 3 red: "time: a leg of a cut route takes the time
 *              of the way that was flown ..." (52 frames along the half circle, 52 across it), "time: a stretch that was not flown ...",
 *              "pick: and at the even pace the stretch seen from ten times further ..."
 *   - time:    route.ts, `retimeRoute` handing `trailFrames` false for `flown`             -> 1 red: "time: "As flown" times the route by the
 *              trail's clock ..." (13.9 s against 46.0)
 *   - heading: no look back (`TRAIL_HEADING_TRAVEL` 0.25 -> 0.25e-9; the stand-in of
 *              route.ts reads the same constant)                                           -> 4 red: "heading: a tap back of a twentieth of the
 *              depth does not turn it" ([-1,0,0]), the same with the trail on and with it off, and the keyframe set by hand after it
 *   - route:   route.ts, `cutRoute` without `anim().snapshot()`                            -> 4 red: "route: "Route to here" makes the route in
 *              one undo step" (0 steps), two "smooth:" lines, "end: a route is made from the previous trail, in one undo step ..."
 *   - route:   route.ts, `cutRoute` not noting that the camera stands on the last keyframe
 *              (`lastSet = null`)                                                          -> 1 red: "route: no view is set by it ..." (1 setView)
 *   - exact:   route.ts, a keyframe one fixed-point step off its sample (`s.p[0] + 1n`)    -> 9 red: the "exact:" lines but one, and five lines
 *              that look for the route's keyframes among the trail's samples
 *   - smooth:  route.ts, `setRouteSmoothing` cutting at the first smoothing whatever is asked -> 4 red: the four "smooth:" lines but "turned back"
 *   - follow:  route.ts, the follower writing nothing                                      -> 3 red: "follow: a keyframe moved in time ...",
 *              "dragged across another keyframe ...", "a keyframe deleted on the timeline ..."
 *   - follow:  route.ts, the follower acting when the iteration keys changed too (the
 *              `counts.some(...)` test out)                                                -> 3 red: "follow: a keyframe dropped on another one's
 *              frame and undone ..." (two counts on frame 48), and the two "time:" lines that write both tracks at once
 *   NOT RED, and why: with `follow` ignoring the off switch, "heading: (the trail switched off ...)" stays green - the app's own
 *   `followTrail` asks first.
 */
import { featureRegistry } from '../../engine/FeatureSystem';
import { DzFormulaFeature } from '../../deep-zoom/features/formula';
import { DzCameraFeature } from '../../deep-zoom/features/camera';
import { useEngineStore, bindStoreToEngine } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { buildZoomPath, zoomPathPosition } from '../../engine/animation/zoomPath';
import type { ZoomKey } from '../../engine/animation/zoomPath';
import { setHost } from '../../deep-zoom/host/current';
import type { DeepZoomHost, DzParams, DzView } from '../../deep-zoom/host/DeepZoomHost';
import { startHostSync } from '../../deep-zoom/useHostSync';
import { setReadings } from '../../deep-zoom/navigationState';
import {
    ROUTE_ITERATIONS_TRACK, ROUTE_SMOOTHING, ROUTE_TRACK, cameraOnRoute, headingNow, installRoute, noteMove, noteTurn, retimeRoute, reverseRoute,
    routeDrives, routeFromTrail, routeHandSet, routeKeys, routeSource, routeViewAt, setKeyframe, setRouteSmoothing, takeOwedPictures, useRoute,
} from '../../deep-zoom/route';
import type { RoutePayload } from '../../deep-zoom/route';
import {
    FIXED_UNIT, TRAIL_CAP, TRAIL_DEPTH_SLACK, createTrail, cutDetours, depthCurve, evenFrames, pickKeyframes, previousTrail, reverseTrail, setTrailOn,
    trailDecades, trailDirections, trailEnds, trailFrames, trailHeading, trailSamples, trailSeconds, useTrail,
} from '../../deep-zoom/trail';
import type { TrailPick, TrailSample, TrailView } from '../../deep-zoom/trail';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

// ── the scene ────────────────────────────────────────────────────────────────────────────────────
type V3 = [number, number, number];
type P3 = readonly [bigint, bigint, bigint];
const fixedOf = (x: number): bigint => BigInt(Math.round(x * 2 ** 40)) << 216n;
/** A point of the floor: every position below is this plus a small offset, and the depth is the offset's height. */
const O: P3 = [fixedOf(0.31), fixedOf(-0.12), fixedOf(0.94)];
const camAt = (v: V3): [string, string, string] => [0, 1, 2].map((j) => String(O[j] + BigInt(Math.round(v[j] * FIXED_UNIT)))) as [string, string, string];
const offsetOf = (p: P3): V3 => [Number(p[0] - O[0]) / FIXED_UNIT, Number(p[1] - O[1]) / FIXED_UNIT, Number(p[2] - O[2]) / FIXED_UNIT];
const gapBetween = (a: P3, b: P3): number => Math.hypot(Number(b[0] - a[0]) / FIXED_UNIT, Number(b[1] - a[1]) / FIXED_UNIT, Number(b[2] - a[2]) / FIXED_UNIT);
const camOf = (s: TrailSample): string[] => [String(s.p[0]), String(s.p[1]), String(s.p[2])];
/** The count the renderer's own rule would stand at for a depth. */
const countFor = (depth: number): number => 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(depth)));
/** A dive that winds about its axis: `u` e-folds down. */
const spiral = (u: number): V3 => { const z = Math.exp(-u); return [0.3 * z * Math.sin(1.5 * u), 0.3 * z * (1 - Math.cos(1.5 * u)), z]; };
const straight = (a: V3, b: V3) => (u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const viewAt = (v: V3, u = 0): TrailView => ({ cam: camAt(v), yaw: -1.2 + 0.05 * u, pitch: 0.3 - 0.01 * u, iters: countFor(v[2]) });
const TIMING = { fps: 30, pace: 0.5, maxLegSeconds: 180 };

/** A recorder and its clock. */
interface Flown { trail: ReturnType<typeof createTrail>; t: number }
const flown = (opts?: Parameters<typeof createTrail>[0]): Flown => ({ trail: createTrail(opts), t: 0 });
/** Fly `path` from `u0` to `u1` in `steps` frames of `dt` seconds. */
function along(f: Flown, path: (u: number) => V3, u0: number, u1: number, steps: number, dt = 1 / 60): void {
    for (let i = 1; i <= steps; i++) {
        const u = u0 + ((u1 - u0) * i) / steps, v = path(u);
        f.t += dt;
        f.trail.follow(viewAt(v, u), v[2], f.t);
    }
}

/** How far the worst sample lies from the route of a pick, measured the slow way: every frame, exactly, from the sample itself. */
function worstOff(samples: readonly TrailSample[], pick: TrailPick): number {
    const directions = trailDirections(samples);
    const keys: ZoomKey[] = pick.index.map((i, j) => ({ time: pick.frames[j], scale: samples[i].depth, position: samples[i].p, heading: directions[i] }));
    const path = buildZoomPath(keys, { unit: FIXED_UNIT, scaleAt: depthCurve(pick.frames, keys.map((k) => k.scale)).at });
    let worst = 0;
    for (let l = 0; l + 1 < pick.index.length; l++) {
        const line: P3[] = [];
        for (let f = pick.frames[l]; f <= pick.frames[l + 1]; f++) line.push(zoomPathPosition(path, f));
        for (let i = pick.index[l] + 1; i < pick.index[l + 1]; i++) worst = Math.max(worst, offLine(samples[i], line));
    }
    return worst;
}
/** The distance from a sample to a line of points, in depths at the sample. */
function offLine(s: TrailSample, line: readonly P3[]): number {
    const rel = line.map((q): V3 => [Number(q[0] - s.p[0]) / FIXED_UNIT, Number(q[1] - s.p[1]) / FIXED_UNIT, Number(q[2] - s.p[2]) / FIXED_UNIT]);
    let least = Math.hypot(...rel[0]);
    for (let j = 0; j + 1 < rel.length; j++) {
        const a = rel[j], d: V3 = [rel[j + 1][0] - a[0], rel[j + 1][1] - a[1], rel[j + 1][2] - a[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
        const u = l2 > 0 ? Math.min(1, Math.max(0, -(a[0] * d[0] + a[1] * d[1] + a[2] * d[2]) / l2)) : 0;
        least = Math.min(least, Math.hypot(a[0] + d[0] * u, a[1] + d[1] * u, a[2] + d[2] * u));
    }
    return least / s.depth;
}

// ══ the first half: the recorder and the cutting functions alone ═════════════════════════════════

// ── thin ─────────────────────────────────────────────────────────────────────────────────────────
{
    const f = flown();
    let z = 1, most = 0, dropped = 0, lengthAfter = 0;
    const down = (): void => { z *= 0.995; f.t += 1 / 60; f.trail.follow(viewAt([0, 0, z]), z, f.t); };
    while (f.trail.samples().length < 600) down();
    let s = f.trail.samples();
    const steps = s.slice(1).map((b, i) => gapBetween(s[i].p, b.p) / b.depth);
    check(Math.min(...steps) >= 0.02 && Math.max(...steps) < 0.021, 'thin: flown half a percent a frame, a sample is taken every fourth frame: 2 % of the depth from the last one',
        `steps ${Math.min(...steps)} .. ${Math.max(...steps)}`);
    const perDecade = (s.length - 1) / Math.log10(s[0].depth / s[s.length - 1].depth);
    check(Math.abs(perDecade - 114.9) < 0.5 && Math.abs((f.trail.span()?.decades ?? 0) - Math.log10(s[0].depth / s[s.length - 1].depth)) < 1e-12,
        'thin: that is 115 samples a decade of a straight dive, and the trail knows how deep it is', `${perDecade} a decade, ${f.trail.span()?.decades}`);
    const first = s[0];
    while (dropped === 0 && f.trail.samples().length < TRAIL_CAP + 8) {
        const before = f.trail.samples().length;
        down();
        const now = f.trail.samples().length;
        most = Math.max(most, now);
        if (now < before) { dropped = before - now; lengthAfter = now; }
    }
    s = f.trail.samples();
    const old = s.slice(1, 1024).map((b, i) => gapBetween(s[i].p, b.p) / b.depth), young = s.slice(1025).map((b, i) => gapBetween(s[1024 + i].p, b.p) / b.depth);
    check(most === TRAIL_CAP && lengthAfter === TRAIL_CAP + 1 - TRAIL_CAP / 4, `thin: the trail never holds more than ${TRAIL_CAP} samples; the one after makes it ${TRAIL_CAP + 1 - TRAIL_CAP / 4}`,
        `most ${most}, then ${lengthAfter}`);
    check(s[0] === first && Math.min(...old) > 0.04 && Math.max(...old) < 0.042 && Math.max(...young) < 0.021,
        'thin: it is the older half that lost every second sample (4 % apart now), the first sample stays, the newer half is as it was',
        `older ${Math.min(...old)} .. ${Math.max(...old)}, newer up to ${Math.max(...young)}`);
    check(Math.abs((f.trail.span()?.decades ?? 0) - Math.log10(first.depth / s[s.length - 1].depth)) < 1e-9, 'thin: and the trail is as deep as it was');
}

// ── turn ─────────────────────────────────────────────────────────────────────────────────────────
{
    const f = flown();
    along(f, straight([0, 0, 1], [0, 0, 0.5]), 0, 1, 160);
    let z = f.trail.samples()[f.trail.samples().length - 1].depth;
    // on to the next sample, so that the camera stands on one
    for (let before = f.trail.samples().length; f.trail.samples().length === before;) { z *= 0.999; f.t += 1 / 60; f.trail.follow(viewAt([0, 0, z]), z, f.t); }
    const count = f.trail.samples().length;
    for (let i = 0; i < 20; i++) f.trail.turned({ yaw: 1 + i * 0.01, pitch: 0.1, roll: 0.3 });
    const last = f.trail.samples()[count - 1];
    check(f.trail.samples().length === count, 'turn: twenty turns in a row take no sample', `${f.trail.samples().length - count} more`);
    check(last.yaw === 1.19 && last.pitch === 0.1 && last.roll === 0.3, 'turn: the look kept for the place the camera stands at is the latest one', JSON.stringify([last.yaw, last.pitch, last.roll]));
    z *= 0.999; f.t += 1 / 60;
    f.trail.follow({ ...viewAt([0, 0, z]), yaw: 1.19 }, z, f.t);   // a move too short for a sample: the camera is off the last one
    f.trail.turned({ yaw: 2, pitch: -0.4, roll: 0 });
    const kept = f.trail.samples()[count - 1];
    check(f.trail.samples().length === count && kept.yaw === 1.19 && kept.roll === 0.3, 'turn: a turn somewhere else leaves the look of the last sample as it was');
    const here = f.trail.toHere({ ...viewAt([0, 0, z]), yaw: 2, pitch: -0.4 }, z);
    const end = here?.[here.length - 1];
    check(!!here && here.length === count + 1 && end?.yaw === 2 && end.pitch === -0.4 && !('roll' in end) && camOf(end).join() === camAt([0, 0, z]).join(),
        'turn: the trail to here ends on the camera as it stands, with the look it has now', `${here?.length} against ${count + 1}`);
}

// ── end ──────────────────────────────────────────────────────────────────────────────────────────
{
    let kept = 0;
    const f = flown({ kept: () => { kept++; } });
    along(f, spiral, 0, 2.3, 460);                                       // one decade
    check(f.trail.end(viewAt(spiral(2.3)), Math.exp(-2.3)) === false && f.trail.previous() === null && f.trail.samples().length === 0 && kept === 0,
        'end: a trail one decade deep that ends is gone, and nothing is kept', `kept ${kept}, previous ${f.trail.previous()?.length}`);
    along(f, spiral, 0, 9.2, 1840);                                      // four decades
    const deep = f.trail.samples().length, stood = spiral(9.201);
    const became = f.trail.end(viewAt(stood, 9.201), stood[2]);
    const previous = f.trail.previous();
    check(became && kept === 1 && !!previous && previous.length === deep + 1 && f.trail.samples().length === 0,
        'end: one four decades deep becomes the previous trail, and the trail is empty', `kept ${kept}, previous ${previous?.length} of ${deep + 1}`);
    check(!!previous && camOf(previous[previous.length - 1]).join() === camAt(stood).join() && Math.abs(trailDecades(previous) - 9.2 / Math.LN10) < 0.02,
        'end: its last point is the camera as it stood when it ended', `${previous ? trailDecades(previous) : ''} decades`);
    along(f, spiral, 0, 2.3, 460);
    f.trail.end(viewAt(spiral(2.3)), Math.exp(-2.3));
    check(f.trail.previous() === previous && kept === 1, 'end: a shallow trail that ends after it does not take its place');

    // A view that is SET where the trail has been (an undo of a flight) joins it; one set elsewhere ends it.
    along(f, spiral, 0, 4.6, 920);
    const before = f.trail.samples().length, back = f.trail.samples()[200];
    f.trail.set({ cam: camOf(back), yaw: back.yaw, pitch: back.pitch, iters: back.iters }, Math.exp(-4.6), f.t);
    f.t += 1 / 60;
    f.trail.follow(viewAt(spiral(4.6)), Math.exp(-4.6), f.t);              // the depth shown is still the old place's
    check(f.trail.samples().length === before, 'end: after a view is set, nothing is taken while the depth shown is still that of the place left');
    const on = offsetOf(back.p), next: V3 = [on[0], on[1], on[2] * 0.97];
    f.t += 1 / 60;
    f.trail.follow(viewAt(next), next[2], f.t);
    let s = f.trail.samples();
    check(s.length === before + 2 && s[before].gap === true && camOf(s[before]).join() === camOf(back).join() && !s[before + 1].gap,
        'end: a view set where the trail has been joins it, marked as not flown to; the flight from there goes on', `${s.length - before} more, gap ${s[before]?.gap}`);
    const elsewhere: V3 = [3, 3, on[2]];
    f.trail.set(viewAt(elsewhere), next[2], f.t);
    f.t += 1;
    f.trail.follow(viewAt([3, 3, on[2] * 0.97]), on[2] * 0.97, f.t);
    s = f.trail.samples();
    check(s.length === 2 && camOf(s[0]).join() === camAt(elsewhere).join() && !s[0].gap && f.trail.previous() === previous,
        'end: a view set where it has never been ends it there, and a new trail begins at that view', `${s.length} samples`);

    // The record button.
    const off = f.trail.samples().length;
    f.trail.setOn(false, null, 0, f.t);
    along(f, straight([3, 3, on[2] * 0.97], [3, 3, on[2] * 0.5]), 0, 1, 200);
    check(f.trail.samples().length === off, 'end: switched off, nothing is taken and the trail so far stays', `${f.trail.samples().length - off} more`);
    f.trail.setOn(true, viewAt([3, 3, on[2] * 0.5]), on[2] * 0.5, f.t);
    along(f, straight([3, 3, on[2] * 0.5], [3, 3, on[2] * 0.45]), 0, 1, 30);
    s = f.trail.samples();
    check(s.length > off && s[off].gap === true && !s[off + 1]?.gap && f.trail.previous() === previous, 'end: switched on again it goes on, the first sample marked as not flown to',
        `${s.length - off} more, gap ${s[off]?.gap}`);
}

// ── cut ──────────────────────────────────────────────────────────────────────────────────────────
{
    // Along the floor to x = 5, back the same way to x = 2, then down from there.
    const f = flown();
    along(f, straight([0, 0, 1], [5, 0, 1]), 0, 1, 1000);
    along(f, straight([5, 0, 1], [2, 0, 1]), 0, 1, 600);
    along(f, straight([2, 0, 1], [2, 0, 0.01]), 0, 1, 198 * 5);
    const raw = f.trail.samples(), cut = cutDetours(raw);
    const xs = (list: readonly TrailSample[]): number[] => list.map((s) => offsetOf(s.p)[0]);
    const order = cut.map((s) => raw.findIndex((r) => r.p === s.p));
    check(Math.max(...xs(raw)) > 4.9 && Math.max(...xs(cut)) < 2.03, 'cut: a flight to a dead end and back: the dead end is gone',
        `flown out to ${Math.max(...xs(raw))}, kept out to ${Math.max(...xs(cut))}`);
    check(cut[0] === raw[0] && cut[cut.length - 1] === raw[raw.length - 1] && order.every((i, j) => i >= 0 && (j === 0 || i > order[j - 1])),
        'cut: the way to here is kept: the first and the last sample, and every one kept is a sample of the trail, in its order');
    const gaps = cut.filter((s) => s.gap).length, kept = order.filter((i) => i > 250).length, after = raw.length - 1 - raw.findIndex((r) => offsetOf(r.p)[2] < 0.999);
    check(gaps === 1 && Math.abs(kept - after) <= 2, 'cut: one sample is marked where the two ends meet, and nothing of the dive after it is lost', `${gaps} marked; ${kept} kept of ${after}`);

    const dive = flown();
    along(dive, spiral, 0, 9.2, 1840);
    const whole = cutDetours(dive.trail.samples());
    check(whole.length === dive.trail.samples().length && whole.every((s, i) => s === dive.trail.samples()[i]), 'cut: a winding dive with no way back in it is left as it is', `${whole.length} of ${dive.trail.samples().length}`);

    // Out, a wide turn, and back on a lane 1.2 depths from the first: not the same place.
    const wide = flown();
    along(wide, straight([0, 0, 1], [3, 0, 1]), 0, 1, 600);
    along(wide, (u) => [3 + 0.6 * Math.sin(Math.PI * u), 0.6 - 0.6 * Math.cos(Math.PI * u), 1], 0, 1, 380);
    along(wide, straight([3, 1.2, 1], [0, 1.2, 1]), 0, 1, 600);
    check(cutDetours(wide.trail.samples()).length === wide.trail.samples().length, 'cut: a turn that comes back more than half a depth from the way out is not a detour');

    // A view that was set 0.8 of a depth from where the trail had been: nearer than a set view has to be.
    const set = flown();
    along(set, straight([0, 0, 1], [4, 0, 1]), 0, 1, 800);
    const far = set.trail.samples().length;
    set.trail.set(viewAt([1, 0.8, 1]), 1, set.t);
    set.t += 1;
    set.trail.follow(viewAt([1, 0.8, 0.98]), 0.98, set.t);
    along(set, straight([1, 0.8, 0.98], [1, 0.8, 0.5]), 0, 1, 140);
    const joined = cutDetours(set.trail.samples());
    check(set.trail.samples()[far].gap === true && Math.max(...xs(joined)) < 1.03 && joined[joined.length - 1] === set.trail.samples()[set.trail.samples().length - 1],
        'cut: a view set 0.8 of a depth from a place of the trail goes on from that place, and what was flown beyond it is gone', `kept out to ${Math.max(...xs(joined))}`);

    // What it costs at the cap, in the worst case: a flight at one depth, where every sample has to be compared with every other.
    const hover = flown();
    along(hover, (u) => [80 * u, 3 * Math.sin(40 * u), 1], 0, 1, 16400);
    const t0 = performance.now(), kept2 = cutDetours(hover.trail.samples()).length;
    console.log(`  cost: cutDetours on ${hover.trail.samples().length} samples at one depth: ${(performance.now() - t0).toFixed(0)} ms (${kept2} kept)`);
}

// ── reverse: the trail the other way ─────────────────────────────────────────────────────────────
{
    // The dead end of the "cut:" lines again: one gap, where the way back met the way out.
    const f = flown();
    along(f, straight([0, 0, 1], [5, 0, 1]), 0, 1, 1000);
    along(f, straight([5, 0, 1], [2, 0, 1]), 0, 1, 600);
    along(f, straight([2, 0, 1], [2, 0, 0.01]), 0, 1, 198 * 5);
    const cut = cutDetours(f.trail.samples()), m = cut.length, back = reverseTrail(cut), marked = cut.findIndex((s) => s.gap);
    const forward = trailDirections(cut), backward = trailDirections(back);
    check(marked > 0 && back.length === m && back.every((s, i) => s.p === cut[m - 1 - i].p && s.depth === cut[m - 1 - i].depth && s.yaw === cut[m - 1 - i].yaw && s.iters === cut[m - 1 - i].iters)
        && back.every((s, i) => s.gap === (i === 0 ? cut[0].gap : cut[m - i].gap)) && back[m - marked].gap === true && back.filter((s) => s.gap).length === 1,
        'reverse: a trail reversed holds the same views the other way, its gap on the same step (the one into the other end of it)', `gap at ${marked} -> ${back.findIndex((s) => s.gap)} of ${m}`);
    check(back[0].t === cut[0].t && back.every((s, i) => i === 0 || Math.abs((s.t - back[i - 1].t) - (cut[m - i].t - cut[m - 1 - i].t)) < 1e-9)
        && backward.every((d, i) => { const a = forward[m - 1 - i]; return !a ? !d : !!d && d.every((v, j) => v === -a[j]); }),
        'reverse: its clock starts where it did and every step takes as long as it did; the direction of travel at each sample is negated, to the digit');
    const twice = reverseTrail(back);
    check(twice.every((s, i) => s.p === cut[i].p && s.gap === cut[i].gap && Math.abs(s.t - cut[i].t) < 1e-9), 'reverse: and reversed twice it is the trail it was');
}

// ── pick ─────────────────────────────────────────────────────────────────────────────────────────
{
    const f = flown();
    f.trail.set(viewAt(spiral(0)), NaN, 0);
    along(f, spiral, 0, 13.8, 2760);                                     // six decades
    const samples = cutDetours(f.trail.toHere(viewAt(spiral(13.8), 13.8), Math.exp(-13.8)) ?? []);
    const tolerances = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01];
    const t0 = performance.now();
    const picks = tolerances.map((tolerance) => pickKeyframes(samples, { ...TIMING, tolerance, cap: 300 }));
    console.log(`  cost: pickKeyframes on ${samples.length} samples, six tolerances: ${(performance.now() - t0).toFixed(0)} ms; keyframes ${picks.map((p) => p.index.length).join(', ')}`);
    const exact = picks.map((p) => worstOff(samples, p));
    check(picks.every((p, i) => p.worst <= tolerances[i] && exact[i] <= tolerances[i] * (1 + 1e-9)),
        'pick: at each of six tolerances, 0.5 to 0.01, every sample lies within it of the route (measured again the slow way, frame by frame)',
        exact.map((e, i) => `${tolerances[i]}: ${e.toFixed(4)} / ${picks[i].worst.toFixed(4)}`).join('; '));
    check(picks.every((p, i) => i === 0 || p.index.length >= picks[i - 1].index.length) && picks[5].index.length > picks[0].index.length,
        'pick: a tighter tolerance never gives fewer keyframes', picks.map((p) => p.index.length).join());
    check(picks.every((p, i) => i === 0 || picks[i - 1].index.every((k) => p.index.includes(k))), 'pick: and its keyframes hold every keyframe of a looser one');
    check(picks.every((p) => p.index[0] === 0 && p.index[p.index.length - 1] === samples.length - 1 && p.index.every((k, j) => j === 0 || k > p.index[j - 1])
        && p.frames[0] === 0 && p.frames.every((fr, j) => Number.isInteger(fr) && (j === 0 || fr > p.frames[j - 1]))),
        'pick: the first and the last sample are keyframes, and the frames are whole and rise');
    const capped = pickKeyframes(samples, { ...TIMING, tolerance: 1e-6, cap: 20 });
    check(capped.index.length === 20 && capped.worst > 1e-6, 'pick: it stops at the cap, and says how far off the worst sample still is', `${capped.index.length} keyframes, worst ${capped.worst}`);
    const again = pickKeyframes(samples, { ...TIMING, tolerance: 0.05, cap: 300 });
    check(again.index.join() === picks[3].index.join() && again.frames.join() === picks[3].frames.join(), 'pick: the same trail gives the same keyframes');
    const line = flown();
    for (let z = 1; z > 1e-8; z *= 0.995) { line.t += 1 / 60; line.trail.follow(viewAt([0, 0, z]), z, line.t); }
    check(pickKeyframes(line.trail.samples(), { ...TIMING, tolerance: 0.01, cap: 300 }).index.length === 2, 'pick: a dive straight down is two keyframes, however deep');
    check(picks.every((p) => p.deep <= TRAIL_DEPTH_SLACK), 'pick: the route\'s depth curve is within half a decade of the depth of every sample it passes', picks.map((p) => p.deep.toFixed(2)).join());

    // A flight in a straight line, on which what is looked at steps ten times further away half way along.
    const step = flown();
    step.trail.set(viewAt([0, 0, 1]), NaN, 0);
    for (let x = 0.005; x < 4; x += 0.005) { step.t += 1 / 60; step.trail.follow(viewAt([x, 0, 1]), x < 2 ? 1 : 10, step.t); }
    const stepped = step.trail.samples(), across = pickKeyframes(stepped, { ...TIMING, tolerance: 0.05, cap: 300 });
    const sides = across.index.map((i) => stepped[i].depth).join();
    check(across.index.length === 4 && sides === '1,1,10,10' && across.index[2] === across.index[1] + 1 && across.deep <= TRAIL_DEPTH_SLACK && across.worst < 1e-6,
        'pick: where the depth shown steps a decade on a straight flight, the samples either side of the step are keyframes, though none is off the line',
        `${across.index.length} keyframes at depths ${sides}, depth curve ${across.deep.toFixed(2)} decades off`);
    check(Math.abs(across.frames[1] - 2 / Math.LN10 * 60) < 3 && across.frames[3] - across.frames[2] < 8 && across.frames[3] - across.frames[2] > 2,
        'pick: and at the even pace the stretch seen from ten times further takes a tenth of the time', `frames ${across.frames}`);
}

// ── time ─────────────────────────────────────────────────────────────────────────────────────────
{
    // Straight down: two decades at half a percent a frame, ten seconds of standing still, two more at one percent a frame.
    const f = flown();
    f.trail.set(viewAt([0, 0, 1]), NaN, 0);
    /** The flight's seconds as the check counts them: a frame a sixtieth, the pause half a second; and what they were at the last sample taken. */
    let z = 1, flight = -1 / 60, atLastSample = 0;
    const frame = (factor: number, pause = 0): void => {
        z *= factor; f.t += pause + 1 / 60; flight += pause > 0 ? 0.5 : 1 / 60;
        const before = f.trail.samples().length;
        f.trail.follow(viewAt([0, 0, z]), z, f.t);
        if (f.trail.samples().length > before) atLastSample = flight;
    };
    while (z > 1e-2) frame(0.995);
    const slow = f.trail.samples().length - 1;
    frame(0.99, 10);
    while (z > 1e-4) frame(0.99);
    const samples = f.trail.samples(), last = samples.length - 1;
    check(Math.abs(trailSeconds(samples) - atLastSample) < 1e-9 && f.t - trailSeconds(samples) > 9.4,
        'time: ten seconds of standing still count half a second on the trail\'s clock', `${trailSeconds(samples)} s against ${atLastSample}, of ${f.t} s`);
    const index = [0, slow, last];
    const asFlown = trailFrames(samples, index, TIMING, true), even = trailFrames(samples, index, TIMING);
    const byLine = evenFrames(index.map((i) => ({ time: 0, scale: samples[i].depth, position: samples[i].p })), TIMING);
    const decades = [Math.log10(samples[0].depth / samples[slow].depth), Math.log10(samples[slow].depth / samples[last].depth)];
    check(even[1] === Math.round(decades[0] * 60) && even[2] - even[1] === Math.round(decades[1] * 60) && byLine.join() === even.join(),
        'time: the even pace gives a leg its decades at 0.5 a second, however fast it was flown (on a straight dive, measured along the trail or along the line)',
        `${even} and ${byLine} for ${decades.map((d) => d.toFixed(3))} decades`);
    check(asFlown[1] === Math.round(samples[slow].t * 30) && asFlown[2] - asFlown[1] === Math.round((samples[last].t - samples[slow].t) * 30)
        && asFlown[2] - asFlown[1] < 0.6 * asFlown[1] && asFlown[2] - asFlown[1] > 0.5 * asFlown[1],
        'time: as flown, the leg flown twice as fast takes half the time and the pause\'s half second', `${asFlown}`);
    const marked = samples.map((s, i) => (i === slow + 1 ? { ...s, gap: true as const } : s));
    const withGap = trailFrames(marked, index, TIMING, true);
    const hop = (2 * Math.log10(samples[slow].depth / samples[slow + 1].depth) - (samples[slow + 1].t - samples[slow].t)) * 30;
    check(Math.abs((withGap[2] - withGap[1]) - (asFlown[2] - asFlown[1]) - hop) <= 1, 'time: a stretch that was not flown takes its time at the even pace, not from the clock',
        `${withGap[2] - withGap[1]} against ${asFlown[2] - asFlown[1]} and a hop of ${hop.toFixed(1)}`);
    check(trailFrames(samples, [0, 1, 2], TIMING, true).join() === '0,2,4' && trailFrames(samples, [0, 1, 2], TIMING).join() === '0,1,2'
        && evenFrames([0, 0].map(() => ({ time: 0, scale: 1, position: samples[0].p })), TIMING).join() === '0,1', 'time: a leg is a frame at least');
    const bend = flown();
    bend.trail.set(viewAt([0, 0, 1]), NaN, 0);
    along(bend, (u) => [Math.sin(Math.PI * u), 1 - Math.cos(Math.PI * u), 1], 0, 1, 640);   // half a circle of radius 1, at one depth
    const round = bend.trail.samples(), ends = [0, round.length - 1];
    const alongIt = trailFrames(round, ends, TIMING)[1], acrossIt = evenFrames(ends.map((i) => ({ time: 0, scale: 1, position: round[i].p })), TIMING)[1];
    check(Math.abs(alongIt / acrossIt - Math.PI / 2) < 0.03, 'time: a leg of a cut route takes the time of the way that was flown, not of the straight line between its ends',
        `${alongIt} frames along the half circle, ${acrossIt} across it`);
    check(evenFrames([0, 0].map(() => ({ time: 0, scale: 1, position: samples[0].p })), TIMING, [40, 55]).join() === '40,55',
        'time: timed again at the even pace, the first key keeps its frame and a turn in place keeps its length');
}

// ── heading ──────────────────────────────────────────────────────────────────────────────────────
{
    const f = flown();
    f.trail.set(viewAt([0, 0, 1]), NaN, 0);
    along(f, straight([0, 0, 1], [1, 0, 1]), 0, 1, 200);
    const fixed = (v: V3): P3 => { const c = camAt(v); return [BigInt(c[0]), BigInt(c[1]), BigInt(c[2])]; };
    const forward = trailHeading(f.trail.samples(), fixed([1.003, 0, 1]), 1);
    check(!!forward && forward[0] > 0.999, 'heading: after a flight it is the way the camera went', JSON.stringify(forward));
    along(f, straight([1, 0, 1], [0.95, 0, 1]), 0, 1, 10);                // a tap back, a twentieth of the depth
    const tapped = trailHeading(f.trail.samples(), fixed([0.95, 0, 1]), 1);
    check(!!tapped && tapped[0] > 0.999, 'heading: a tap back of a twentieth of the depth does not turn it', JSON.stringify(tapped));
    along(f, straight([0.95, 0, 1], [0, 0, 1]), 0, 1, 190);               // a retreat of a whole depth
    const retreated = trailHeading(f.trail.samples(), fixed([0, 0, 1]), 1);
    check(!!retreated && retreated[0] < -0.999, 'heading: a retreat of a whole depth does', JSON.stringify(retreated));
    const s = f.trail.samples(), cut = [{ ...s[0] }, { ...s[40], gap: true as const }, s[41], s[42]];
    const fromGap = trailHeading(cut, s[43].p, 1);
    const want = [0, 1, 2].map((j) => Number(s[43].p[j] - s[40].p[j]));
    check(!!fromGap && Math.abs(fromGap[0] - want[0] / Math.hypot(...want)) < 1e-12, 'heading: it does not look back past a sample the camera was not flown to');
    check(trailHeading([s[0]], s[0].p, 1) === null && trailHeading([], s[0].p, 1) === null, 'heading: a camera that has not moved has none');
    check(f.trail.heading(camAt([0, 0, 1]), 1)?.[0] === retreated?.[0] && (f.trail.set(viewAt([0, 0, 1]), 1, f.t), f.trail.heading(camAt([0, 0, 1]), 1)) === null,
        'heading: and the trail gives none for a view that was set');
}

// ══ the second half: the app's wiring ════════════════════════════════════════════════════════════

const calls: DzView[] = [];
/** Frames run by hand (`host.step`), and how many since the last view was set. */
let stepped = 0, sinceSet = 0;
/** The developer lever that says how the renderer draws, and every value `dzFormula.autoIterations` was sent with. */
let drawMode: 'deep' | 'auto' = 'deep';
/** What `host.building()` answers: the shader of a formula a loaded scene brought, while it builds. */
let building: 'mandelbox' | null = null;
/** When set, `host.thumbnail()` answers '' for a view at this camera: a picture that cannot be drawn. */
let noPictureAt = '';
const autoSent: unknown[] = [];
const viewSetListeners = new Set<() => void>();
let at: V3 = spiral(0);
let view: DzView = { cam: camAt(at), yaw: -1.2, pitch: 0.3, iters: countFor(1), power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 };
const host = {
    ready: Promise.resolve(),
    bootParams: () => ({}),
    getView: (): DzView => ({ ...view, cam: [view.cam[0], view.cam[1], view.cam[2]], phase: [view.phase[0], view.phase[1]] }),
    setView: (v: DzView): void => {
        calls.push(v);
        sinceSet = 0;
        view = { ...v, cam: [v.cam[0], v.cam[1], v.cam[2]] };
        if (!v.roll) delete view.roll;
        at = offsetOf([BigInt(v.cam[0]), BigInt(v.cam[1]), BigInt(v.cam[2])]);
        for (const fn of [...viewSetListeners]) fn();
    },
    setParams: (patch: DzParams): void => { if ('dzFormula.autoIterations' in patch) autoSent.push(patch['dzFormula.autoIterations']); },
    diagnostics: () => ({ levers: { mode: drawMode } }),
    building: () => building,
    orientation: () => ({ yaw: view.yaw, pitch: view.pitch, roll: view.roll ?? 0 }),
    telemetry: () => ({ depth: at[2], iters: view.iters, ready: true, error: '', mode: 'deep' }),
    sense: () => ({ near: at[2], second: at[2], hits: 7, open: 0, inside: false, marched: true }),
    step: (): void => { stepped++; sinceSet++; },
    // What it is a picture of: the camera, the count, and how many frames were run since the view was set.
    thumbnail: () => (view.cam.join() === noPictureAt ? '' : `${view.cam.join()} | ${view.yaw} ${view.pitch} | ${view.iters} | ${sinceSet}`),
    estimateAtPoint: () => 1,
    on: (type: string, fn: () => void) => { if (type === 'viewSet') viewSetListeners.add(fn); return () => { viewSetListeners.delete(fn); }; },
} as unknown as DeepZoomHost;

/** The check's own clock: what `performance.now()` answers from here on. */
let clockMs = 1000;
Object.defineProperty(globalThis.performance, 'now', { value: () => clockMs, configurable: true });
/** One frame of the hands: the fake camera is moved to `to`, the depth is shown, and the route is told, as the navigation does it. */
function moveTo(to: V3, look?: { yaw: number; pitch: number }, frameMs = 1000 / 60): void {
    const d: V3 = [to[0] - at[0], to[1] - at[1], to[2] - at[2]];
    at = to;
    view = { ...view, cam: camAt(to), iters: countFor(to[2]), ...(look ?? {}) };
    clockMs += frameMs;
    setReadings(to[2], true, to[2]);
    noteMove(d[0], d[1], d[2]);
}
function fly(path: (u: number) => V3, u0: number, u1: number, steps: number, frameMs?: number): void {
    for (let i = 1; i <= steps; i++) { const u = u0 + ((u1 - u0) * i) / steps; moveTo(path(u), { yaw: -1.2 + 0.05 * u, pitch: 0.3 - 0.01 * u }, frameMs); }
}
const anim = () => useAnimationStore.getState();
const depthKeys = () => anim().sequence.tracks[ROUTE_TRACK]?.keyframes ?? [];
const countKeys = () => anim().sequence.tracks[ROUTE_ITERATIONS_TRACK]?.keyframes ?? [];
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const sameCamera = (a: { cam: readonly string[]; yaw: number; pitch: number; roll?: number }, b: { cam: readonly string[]; yaw: number; pitch: number; roll?: number }): boolean =>
    a.cam[0] === b.cam[0] && a.cam[1] === b.cam[1] && a.cam[2] === b.cam[2] && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);
/** How far the worst sample of the trail the route came from lies from the route as `routeViewAt` plays it, frame by frame. */
function worstOffRoute(): number {
    const trail = routeSource()?.trail ?? [], keys = routeKeys();
    const sampleOf = keys.map((k) => trail.findIndex((s) => camOf(s).join() === k.view.cam.join()));
    let worst = 0;
    for (let l = 0; l + 1 < keys.length; l++) {
        const line: P3[] = [];
        for (let f = keys[l].frame; f <= keys[l + 1].frame; f++) { const c = routeViewAt(f)?.cam ?? keys[l].view.cam; line.push([BigInt(c[0]), BigInt(c[1]), BigInt(c[2])]); }
        for (let i = sampleOf[l] + 1; i < sampleOf[l + 1]; i++) worst = Math.max(worst, offLine(trail[i], line));
    }
    return worst;
}

// Boot, as main.tsx does it.
featureRegistry.register(DzFormulaFeature);
featureRegistry.register(DzCameraFeature);
useEngineStore.getState();
bindStoreToEngine();
installRoute();
setHost(host);
const stopSync = startHostSync();
await tick();
await tick();
const startView = host.getView();

// ── route ────────────────────────────────────────────────────────────────────────────────────────
check(useTrail.getState().on && useTrail.getState().line === '' && trailSamples().length === 0, 'route: the trail records from the start, and is empty before anything is flown');
fly(spiral, 0, 13.8, 2760);                                              // six decades down, 46 seconds of it
const flownSamples = trailSamples().length;
check(flownSamples > 600 && flownSamples < 800 && useTrail.getState().line === '6.0 decades · 46 s', 'route: a dive of six decades is on the trail, and its line says how deep and how long',
    `${flownSamples} samples, "${useTrail.getState().line}"`);
const turned = trailSamples().length;
view = { ...view, yaw: 0.4, pitch: -0.2 };
noteTurn();
check(trailSamples().length === turned, 'route: a turn where the camera stands takes no sample');
const undoBefore = anim().undoStack.length;
calls.length = 0;
const made = routeFromTrail();
let keys = routeKeys();
check(made === keys.length && made > 8 && made < 80 && anim().undoStack.length === undoBefore + 1, '"Route to here" makes the route in one undo step'.replace(/^/, 'route: '),
    `${made} keyframes, ${anim().undoStack.length - undoBefore} steps`);
check(calls.length === 0 && cameraOnRoute() && anim().currentFrame === keys[keys.length - 1].frame && anim().durationFrames >= keys[keys.length - 1].frame,
    'route: no view is set by it: the camera stands on the last keyframe, the playhead is there, and the timeline holds the route', `${calls.length} setView, frame ${anim().currentFrame}`);
check(routeSource()?.smoothing === ROUTE_SMOOTHING.initial && !routeHandSet(), 'route: it knows it came from the trail, at the smoothing first offered');
const offBy = worstOffRoute();
check(offBy <= ROUTE_SMOOTHING.initial && offBy > 0.005, 'route: every sample of the trail lies within the smoothing of the route as it plays', `worst ${offBy}`);

// ── exact ────────────────────────────────────────────────────────────────────────────────────────
{
    const trail = routeSource()?.trail ?? [], payloads = depthKeys().map((k) => k.payload as RoutePayload);
    const sampleOf = payloads.map((p) => trail.find((s) => camOf(s).join() === p.view.cam.join()));
    check(sampleOf.every((s, i) => !!s && s.yaw === payloads[i].view.yaw && s.pitch === payloads[i].view.pitch && s.depth === depthKeys()[i].value),
        'exact: each keyframe is a sample of the trail, to the digit: its camera strings, its look, its depth');
    check(sameCamera(keys[0].view, startView) && sameCamera(keys[keys.length - 1].view, host.getView()),
        'exact: the first is the view the renderer started with, the last the camera as it stands');
    const stray = payloads.flatMap((p) => [...Object.keys(p).filter((key) => key !== 'view' && key !== 'heading'), ...Object.keys(p.view).filter((key) => !['cam', 'yaw', 'pitch', 'roll'].includes(key))]);
    const along1 = payloads[3].heading, flew = [0, 1, 2].map((j) => Number(BigInt(payloads[4].view.cam[j]) - BigInt(payloads[2].view.cam[j])));
    check(stray.length === 0 && payloads.every((p) => !!p.heading) && !!along1 && (along1[0] * flew[0] + along1[1] * flew[1] + along1[2] * flew[2]) / Math.hypot(...flew) > 0.8,
        'exact: a keyframe holds the camera and the way it was travelling there, nothing else', `stray ${stray.join()}`);
    check(countKeys().length === keys.length && countKeys().every((c, i) => c.frame === keys[i].frame && c.value === sampleOf[i]?.iters && c.interpolation === 'Linear'),
        'exact: and each has its iteration key, the count in force when it was flown', countKeys().map((c) => c.value).join());
}

// ── smooth ───────────────────────────────────────────────────────────────────────────────────────
{
    const first = JSON.stringify(depthKeys().map((k) => [k.frame, (k.payload as RoutePayload).view.cam[2]])), trail = routeSource()?.trail, undoAt = anim().undoStack.length;
    setRouteSmoothing(0.2);
    const loose = routeKeys().length, looseOff = worstOffRoute();
    check(loose < keys.length && routeSource()?.smoothing === 0.2 && routeSource()?.trail === trail && anim().undoStack.length === undoAt + 1,
        'smooth: a wider smoothing cuts the route again from the same trail, with fewer keyframes, in one undo step', `${loose} against ${keys.length}`);
    check(looseOff <= 0.2 && looseOff > ROUTE_SMOOTHING.initial && cameraOnRoute(), 'smooth: every sample lies within the new one, and the camera is still on the route', `worst ${looseOff}`);
    setRouteSmoothing(0.01);
    const tight = routeKeys().length;
    check(tight > keys.length && worstOffRoute() <= 0.01, 'smooth: a narrower one makes more keyframes', `${tight} against ${keys.length}, worst ${worstOffRoute()}`);
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    check(JSON.stringify(depthKeys().map((k) => [k.frame, (k.payload as RoutePayload).view.cam[2]])) === first, 'smooth: and turned back it is the route it was');
    const steps = anim().undoStack.length;
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    setRouteSmoothing(7);
    check(anim().undoStack.length === steps + 1 && routeSource()?.smoothing === ROUTE_SMOOTHING.max, 'smooth: the same smoothing again is no step; one past the range is the widest');
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    keys = routeKeys();
}

// ── picture ──────────────────────────────────────────────────────────────────────────────────────
{
    const pictures = (): Record<string, string> => useRoute.getState().thumbnails;
    const own = (k: { view: { cam: readonly string[]; yaw: number; pitch: number }; frame: number }, frames = 1): string =>
        `${k.view.cam.join()} | ${k.view.yaw} ${k.view.pitch} | ${countKeys().find((c) => c.frame === k.frame)?.value} | ${frames}`;
    check(keys.length > 8 && keys.every((k) => !pictures()[k.id]), 'picture: (a route cut from the trail has no picture at first: none of its keyframes was on screen as one)');
    const stood = JSON.stringify(host.getView()), samples = trailSamples().length, line = useTrail.getState().line, steps = anim().undoStack.length, heading = JSON.stringify(headingNow()), drove = routeDrives();
    calls.length = 0;
    stepped = 0;
    autoSent.length = 0;
    const left = takeOwedPictures();
    check(left === 0 && keys.every((k) => pictures()[k.id] === own(k)),
        'picture: every keyframe gets a picture: of its own view, with the count keyed there, a frame run before it is taken', `${left} owed, ${keys.filter((k) => pictures()[k.id] !== own(k)).length} of ${keys.length} wrong`);
    check(JSON.stringify(host.getView()) === stood && calls.length === keys.length + 1 && JSON.stringify(calls[calls.length - 1]) === stood && stepped === keys.length + 1,
        'picture: the camera is put back where it stood, the very view it was, and one frame of it is run', `${calls.length} setView for ${keys.length} keyframes, ${stepped} frames, back ${JSON.stringify(host.getView()) === stood}`);
    check(autoSent.join() === 'false,true', 'picture: the renderer\'s own iteration rule is held off while they are taken, and handed back after', `sent ${autoSent.join()}`);
    check(trailSamples().length === samples && useTrail.getState().line === line && anim().undoStack.length === steps && JSON.stringify(headingNow()) === heading && routeDrives() === drove && cameraOnRoute(),
        'picture: the trail, the heading, the undo stack and who holds the camera are as they were', `${trailSamples().length - samples} samples, ${anim().undoStack.length - steps} steps, heading ${JSON.stringify(headingNow())} was ${heading}`);
    calls.length = 0;
    check(takeOwedPictures() === 0 && calls.length === 0, 'picture: with none owed, nothing is set');
    // Cut again from the same trail: the samples that had a picture keep it, only the new keyframes are drawn.
    setRouteSmoothing(0.2);
    const loose = routeKeys();
    calls.length = 0;
    check(loose.length < keys.length && loose.every((k) => pictures()[k.id] === own(k)) && takeOwedPictures() === 0 && calls.length === 0,
        'picture: a wider smoothing: every keyframe is a sample that had its picture, and nothing is drawn again', `${loose.filter((k) => !pictures()[k.id]).length} of ${loose.length} without, ${calls.length} setView`);
    setRouteSmoothing(0.01);
    const tight = routeKeys(), fresh = tight.filter((k) => !pictures()[k.id]);
    calls.length = 0;
    stepped = 0;
    drawMode = 'auto';                               // the developer lever off 'deep': the frame after a jump is drawn the last depth's way
    const leftTight = takeOwedPictures();
    drawMode = 'deep';
    check(tight.length > keys.length && fresh.length === tight.length - keys.length && leftTight === 0 && calls.length === fresh.length + 1 && JSON.stringify(host.getView()) === stood
        && tight.every((k) => pictures()[k.id] === own(k, fresh.includes(k) ? 2 : 1)) && stepped === 2 * (fresh.length + 1),
        'picture: a narrower one: only the keyframes that are new are drawn (two frames each, and two back, when the renderer does not draw every depth one way), and the camera is back again',
        `${fresh.length} without of ${tight.length} (${keys.length} before), ${calls.length} setView, ${stepped} frames`);
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    keys = routeKeys();
    check(keys.every((k) => pictures()[k.id] === own(k)), 'picture: and turned back, every keyframe has its picture at once');

    // A route that ARRIVES (2026-10-12): a scene loaded over this one. Five keyframes of the route as a scene's text
    // holds them, under other key ids: none has a picture, and none came from a trail. `setSequence` is how a loaded
    // scene's timeline is applied (utils/PresetLogic.ts), and it is the load's own undo step.
    const cutSequence = anim().sequence, cutUndo = anim().undoStack, cutRedo = anim().redoStack;
    const sceneWith = (tag: string): typeof cutSequence => {
        const scene = JSON.parse(JSON.stringify(cutSequence)) as typeof cutSequence;
        for (const id of [ROUTE_TRACK, ROUTE_ITERATIONS_TRACK]) scene.tracks[id].keyframes = scene.tracks[id].keyframes.slice(0, 5).map((k, i) => ({ ...k, id: `${tag}-${id}-${i}` }));
        return scene;
    };
    calls.length = 0;
    stepped = 0;
    building = 'mandelbox';                          // the scene brought another formula: its shader is still building
    anim().setSequence(sceneWith('loaded'));
    const loaded = routeKeys(), stepsLoaded = anim().undoStack.length, stoodLoaded = JSON.stringify(host.getView());
    const waiting = takeOwedPictures();
    check(loaded.length === 5 && routeHandSet() && waiting === 5 && calls.length === 0 && loaded.every((k) => !pictures()[k.id]),
        'picture: a route that arrives with a loaded scene is owed its pictures, and none is taken while the shader of the scene\'s formula still builds', `${loaded.length} keyframes, ${waiting} owed, ${calls.length} setView`);
    building = null;
    const leftLoaded = takeOwedPictures();
    check(leftLoaded === 0 && loaded.every((k) => pictures()[k.id] === own(k)),
        'picture: then each of its keyframes gets its picture: of its own view, with the count keyed there', `${leftLoaded} owed, ${loaded.filter((k) => pictures()[k.id] !== own(k)).length} of ${loaded.length} wrong`);
    check(JSON.stringify(host.getView()) === stoodLoaded && calls.length === loaded.length + 1 && anim().undoStack.length === stepsLoaded && trailSamples().length === samples,
        'picture: and the camera is the very view it was, with no undo step and no trail sample added', `${calls.length} setView, ${anim().undoStack.length - stepsLoaded} steps, back ${JSON.stringify(host.getView()) === stoodLoaded}`);
    calls.length = 0;
    check(takeOwedPictures() === 0 && calls.length === 0, 'picture: asked again, nothing is set: they are taken once');
    // Once, also for a picture that cannot be drawn: the keyframe keeps its number, and a later change of the track does not try it again.
    const second = sceneWith('second');
    noPictureAt = (second.tracks[ROUTE_TRACK].keyframes[2].payload as RoutePayload).view.cam.join();
    anim().setSequence(second);
    takeOwedPictures();
    const blank = routeKeys()[2], last = routeKeys()[4];
    calls.length = 0;
    anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: last.id, patch: { frame: last.frame + 3 } }]);      // any change of the route's track
    const tried = takeOwedPictures();
    noPictureAt = '';
    check(!pictures()[blank.id] && routeKeys().filter((k) => !!pictures()[k.id]).length === 4 && tried === 0 && calls.length === 0,
        'picture: a keyframe whose picture could not be drawn keeps its number, and the next change of the track does not try it again', `${routeKeys().filter((k) => !!pictures()[k.id]).length} of 5 pictured, ${tried} owed, ${calls.length} setView`);
    // The cut route again, as it was, for the lines below.
    useAnimationStore.setState({ sequence: cutSequence, undoStack: cutUndo, redoStack: cutRedo });
    check(routeKeys().length === keys.length && routeKeys().every((k, i) => k.id === keys[i].id) && !routeHandSet(), 'picture: (the cut route is put back for the lines below)');
}

// ── time (the two buttons) ───────────────────────────────────────────────────────────────────────
{
    const even = keys.map((k) => k.frame), ids = depthKeys().map((k) => k.id).join(), values = JSON.stringify(depthKeys().map((k) => [k.value, k.payload])), undoAt = anim().undoStack.length;
    retimeRoute(false);
    check(anim().undoStack.length === undoAt, 'time: "Even pace" on a route that is at the even pace changes nothing, and is no undo step');
    retimeRoute(true);
    const asFlown = routeKeys().map((k) => k.frame), trail = routeSource()?.trail ?? [];
    const seconds = (asFlown[asFlown.length - 1] - asFlown[0]) / 30;
    check(asFlown.join() !== even.join() && Math.abs(seconds - trailSeconds(trail)) < 0.5 && anim().undoStack.length === undoAt + 1,
        'time: "As flown" times the route by the trail\'s clock, in one undo step', `${seconds} s against ${trailSeconds(trail)}`);
    check(depthKeys().map((k) => k.id).join() === ids && JSON.stringify(depthKeys().map((k) => [k.value, k.payload])) === values
        && countKeys().every((c, i) => c.frame === asFlown[i]) && !!routeSource() && cameraOnRoute() && anim().currentFrame === asFlown[asFlown.length - 1],
        'time: only key times move: the same keys, views and counts, each iteration key on its keyframe, the playhead with the camera');
    setRouteSmoothing(0.1);
    const cutFlown = routeKeys().map((k) => k.frame);
    check(Math.abs((cutFlown[cutFlown.length - 1] - cutFlown[0]) / 30 - trailSeconds(trail)) < 0.5, 'time: cut again, the route is still timed as flown');
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    retimeRoute(false);
    check(routeKeys().map((k) => k.frame).join() === even.join(), 'time: "Even pace" puts every leg back at 0.5 decades a second', `${routeKeys().map((k) => k.frame)} against ${even}`);
    keys = routeKeys();
}

// ── reverse (in the app; 2026-10-16, stage Z1 of plans/deep-zoom-shell/ZOOM-OUTS.md) ─────────────
// The cut route reversed (`reverseRoute`): its keyframes now run the trail backwards, so what the
// route came from is the trail reversed - the smoothing cuts again from that, and "As flown" is
// the flown clock mirrored.
{
    const pictures = (): Record<string, string> => useRoute.getState().thumbnails;
    const legsOf = (frames: readonly number[]): number[] => frames.slice(1).map((f, i) => f - frames[i]);
    const trail = routeSource()?.trail ?? [], n = trail.length, sequence = anim().sequence, stack = anim().undoStack, again = anim().redoStack, playhead = anim().currentFrame;
    retimeRoute(true);
    const flownLegs = legsOf(routeKeys().map((k) => k.frame));
    retimeRoute(false);
    const steps = anim().undoStack.length, first = keys[0].frame;
    reverseRoute();
    const from = routeSource(), back = from?.trail ?? [];
    check(anim().undoStack.length === steps + 1 && !!from && !routeHandSet() && from.smoothing === ROUTE_SMOOTHING.initial && back !== trail && back.length === n
        && back.every((s, i) => s.p === trail[n - 1 - i].p) && routeKeys().every((k, j) => camOf(back[from.samples[j]]).join() === k.view.cam.join()),
        'reverse: a route cut from the trail, reversed in one undo step, still knows it came from the trail: the trail reversed, each keyframe its sample, at the smoothing it had');
    retimeRoute(true);
    const reversedFlown = routeKeys().map((k) => k.frame), reversedLegs = legsOf(reversedFlown), mirroredLegs = [...flownLegs].reverse();
    const legsOff = reversedLegs.filter((l, i) => l !== mirroredLegs[i]).length;
    check(reversedFlown[0] === first && reversedLegs.length === mirroredLegs.length && reversedLegs.every((l, i) => Math.abs(l - mirroredLegs[i]) <= 1)
        && Math.abs((reversedFlown[reversedFlown.length - 1] - first) / 30 - trailSeconds(trail)) < 0.5 && anim().undoStack.length === steps + 2,
        `reverse: "As flown" on the reversed route: every leg takes the time it was flown in, the other way round (${legsOff} of ${reversedLegs.length} legs a frame apart), in one undo step`,
        `${legsOff} legs differ, ${(reversedFlown[reversedFlown.length - 1] - first) / 30} s against ${trailSeconds(trail)}`);
    retimeRoute(false);
    const cutBefore = routeKeys();
    setRouteSmoothing(0.2);
    const loose = routeKeys(), now = routeSource(), carried = loose.filter((k) => pictures()[k.id]?.startsWith(`${k.view.cam.join()} | `)).length;
    check(now?.trail === back && now.smoothing === 0.2 && loose.length < cutBefore.length && sameCamera(loose[0].view, cutBefore[0].view)
        && sameCamera(loose[loose.length - 1].view, cutBefore[cutBefore.length - 1].view) && worstOffRoute() <= 0.2 && cameraOnRoute(),
        `reverse: the smoothing slider cuts it again from the trail reversed: from where the route ended to where it began, ${loose.length} keyframes, every sample within the smoothing`,
        `${loose.length} keyframes, worst ${worstOffRoute()}, on the route ${cameraOnRoute()}`);
    check(carried === loose.length, `reverse: and the pictures taken at the trail's samples go with them: ${carried} of ${loose.length} keyframes have theirs at once`);
    setRouteSmoothing(ROUTE_SMOOTHING.initial);
    const recut = routeKeys();
    check(JSON.stringify(recut.map((k) => [k.frame, k.view, k.heading])) === JSON.stringify(cutBefore.map((k) => [k.frame, k.view, k.heading])),
        'reverse: and turned back to the smoothing it had, it is the reversed route again: the same views and headings at the same frames', `${recut.length} keyframes against ${cutBefore.length}`);
    reverseRoute();
    check(routeSource()?.trail === trail && sameCamera(routeKeys()[0].view, keys[0].view) && sameCamera(routeKeys()[routeKeys().length - 1].view, keys[keys.length - 1].view),
        'reverse: reversed again, the route reads the very trail it was cut from, and runs the way it was flown');
    anim().undo();
    check(routeSource()?.trail === back, 'reverse: (and that reverse undone, it reads the trail reversed again)');
    // The cut route as it was, the playhead on its last keyframe, for the lines below.
    useAnimationStore.setState({ sequence, undoStack: stack, redoStack: again });
    anim().seek(playhead);
    check(routeKeys().every((k, i) => k.id === keys[i].id) && routeSource()?.trail === trail && cameraOnRoute(), 'reverse: (the cut route is put back for the lines below)');
}

// ── follow ───────────────────────────────────────────────────────────────────────────────────────
{
    const a = depthKeys()[2], b = depthKeys()[3], countA = countKeys()[2], countB = countKeys()[3], before = JSON.stringify(anim().sequence);
    // A keyframe dragged on the timeline: a snapshot, then the depth key alone is moved.
    anim().snapshot();
    anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: a.id, patch: { frame: a.frame + 7 } }]);
    const moved = countKeys().find((c) => c.id === countA.id);
    check(moved?.frame === a.frame + 7 && moved.value === countA.value && countKeys().length === keys.length, 'follow: a keyframe moved in time on the timeline takes its iteration key with it',
        `count at ${moved?.frame}, keyframe at ${a.frame + 7}`);
    anim().undo();
    check(JSON.stringify(anim().sequence) === before, 'follow: and one undo puts both back');
    // Dragged past the next keyframe, and on beyond it.
    anim().snapshot();
    for (const frame of [b.frame, b.frame + 5]) anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: a.id, patch: { frame } }]);
    const pastA = countKeys().find((c) => c.id === countA.id), pastB = countKeys().find((c) => c.id === countB.id);
    check(pastA?.frame === b.frame + 5 && pastB?.frame === b.frame, 'follow: dragged across another keyframe, each iteration key stays with its own', `${pastA?.frame} and ${pastB?.frame}`);
    for (const frame of [b.frame, a.frame]) anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: a.id, patch: { frame } }]);
    check(countKeys().find((c) => c.id === countA.id)?.frame === a.frame && countKeys().find((c) => c.id === countB.id)?.frame === b.frame, 'follow: and back across it the other way');
    anim().undo();
    // Deleted on the timeline.
    anim().removeKeyframe(ROUTE_TRACK, a.id);
    check(!countKeys().some((c) => c.id === countA.id) && countKeys().length === keys.length - 1 && routeKeys().length === keys.length - 1, 'follow: a keyframe deleted on the timeline takes its iteration key with it',
        `${countKeys().length} counts for ${routeKeys().length} keyframes`);
    anim().undo();
    check(JSON.stringify(anim().sequence) === before, 'follow: and one undo brings both back');
    // Both dragged together, and an undo, are left alone.
    anim().snapshot();
    anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: a.id, patch: { frame: a.frame + 3 } }, { trackId: ROUTE_ITERATIONS_TRACK, keyId: countA.id, patch: { frame: a.frame + 3 } }]);
    check(countKeys().find((c) => c.id === countA.id)?.frame === a.frame + 3, 'follow: a keyframe and its iteration key dragged together end on the same frame');
    anim().undo();
    anim().redo();
    check(countKeys().find((c) => c.id === countA.id)?.frame === a.frame + 3 && depthKeys().find((k) => k.id === a.id)?.frame === a.frame + 3, 'follow: an undo and a redo are left as they are');
    anim().undo();
    // Dropped on another keyframe's frame, then undone: the undo puts both tracks back, and nothing is moved after it.
    anim().snapshot();
    anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: a.id, patch: { frame: b.frame } }]);
    anim().undo();
    check(JSON.stringify(anim().sequence) === before, 'follow: a keyframe dropped on another one\'s frame and undone: both iteration keys are where they were',
        `counts at ${countKeys().map((c) => c.frame).slice(0, 5)} for keyframes at ${depthKeys().map((k) => k.frame).slice(0, 5)}`);
}

// ── heading (in the app) ─────────────────────────────────────────────────────────────────────────
{
    const z = at[2], here = at, ahead: V3 = [here[0] + z, here[1], z];
    const way = (): number => headingNow()?.[0] ?? NaN;
    fly(straight(here, ahead), 0, 1, 200);
    const flew = way();
    fly(straight(ahead, [ahead[0] - 0.05 * z, ahead[1], z]), 0, 1, 10);
    const tapped = way();
    check(flew > 0.999 && tapped > 0.999, 'heading: with the trail on, a tap back of a twentieth of the depth does not turn it', `${flew}, then ${tapped}`);
    setKeyframe();
    const set = depthKeys()[depthKeys().length - 1].payload as RoutePayload;
    check(routeKeys().length === keys.length + 1 && (set.heading?.[0] ?? 0) > 0.999 && routeHandSet() && routeSource() === null,
        'heading: a keyframe set by hand after it carries the way the camera went; the route now holds one no trail made');
    const steps = anim().undoStack.length, timed = routeKeys().map((k) => k.frame);
    retimeRoute(true);
    check(anim().undoStack.length === steps && routeKeys().map((k) => k.frame).join() === timed.join(), 'time: "As flown" does nothing to a route that holds a keyframe set by hand');
    retimeRoute(false);
    const byLine = routeKeys().map((k) => k.frame);
    check(anim().undoStack.length === steps + 1 && byLine[0] === timed[0] && byLine.join() !== timed.join() && byLine.every((f, i) => Number.isInteger(f) && (i === 0 || f > byLine[i - 1]))
        && countKeys().every((c, i) => c.frame === byLine[i]) && cameraOnRoute(),
        'time: "Even pace" times it by the straight line between its keyframes, in one undo step, iteration keys and playhead with it', `${timed} -> ${byLine}`);
    anim().undo();
    fly(straight([ahead[0] - 0.05 * z, ahead[1], z], [here[0] - 0.05 * z, here[1], z]), 0, 1, 200);
    check(way() < -0.999, 'heading: a retreat of a whole depth turns it', `${way()}`);
    setTrailOn(false);
    const stays = trailSamples().length;
    fly(straight([here[0] - 0.05 * z, here[1], z], [here[0] - 0.05 * z, here[1] + z, z]), 0, 1, 200);
    const off = headingNow();
    fly(straight([here[0] - 0.05 * z, here[1] + z, z], [here[0] - 0.05 * z, here[1] + 0.95 * z, z]), 0, 1, 10);
    const offTapped = headingNow();
    check(!useTrail.getState().on && trailSamples().length === stays, 'heading: (the trail switched off: a flight of a whole depth adds nothing to it)', `${trailSamples().length - stays} more`);
    check((off?.[1] ?? 0) > 0.99 && (offTapped?.[1] ?? 0) > 0.99, 'heading: with the trail off, it is the way the camera went, and a tap back does not turn it', `${JSON.stringify(off)}, then ${JSON.stringify(offTapped)}`);
    fly(straight([here[0] - 0.05 * z, here[1] + 0.95 * z, z], [here[0] - 0.05 * z, here[1] - 0.05 * z, z]), 0, 1, 200);
    check((headingNow()?.[1] ?? 0) < -0.99, 'heading: and a retreat of a whole depth does', JSON.stringify(headingNow()));
    setTrailOn(true);
}

// ── end (in the app) ─────────────────────────────────────────────────────────────────────────────
{
    const stood = host.getView(), deep = useTrail.getState().line;
    check(useTrail.getState().previous === '' && previousTrail() === null, 'end: (no previous trail is kept so far)');
    trailEnds();                                                         // as a jump does, before it sets the view
    host.setView({ ...stood, cam: camAt(spiral(0)), yaw: -1.2, pitch: 0.3 });
    const previous = previousTrail();
    check(!!previous && sameCamera({ cam: camOf(previous[previous.length - 1]), yaw: previous[previous.length - 1].yaw, pitch: previous[previous.length - 1].pitch }, stood)
        && trailSamples().length === 0 && useTrail.getState().line === '' && /^6\.0 decades · \d+ s$/.test(useTrail.getState().previous),
        'end: a jump ends the trail: six decades deep, it is the previous trail, to the view the camera stood at; the trail is empty', `"${deep}" -> previous "${useTrail.getState().previous}"`);
    const undoAt = anim().undoStack.length;
    calls.length = 0;
    const count = routeFromTrail(true);
    check(count > 8 && anim().undoStack.length === undoAt + 1 && calls.length === 0 && !cameraOnRoute() && sameCamera(routeKeys()[routeKeys().length - 1].view, stood),
        'end: a route is made from the previous trail, in one undo step; the camera stays where the jump put it', `${count} keyframes, ${calls.length} setView`);
    fly(straight(spiral(0), [0, 0, 0.5]), 0, 1, 140);
    trailEnds();
    check(previousTrail() === previous, 'end: a shallow trail that ends after it leaves the previous one kept');
    check(routeFromTrail() === 0, 'end: with nothing flown since, there is no trail to make a route from');
}

stopSync();
console.log(failed === 0 ? '\ntrail: all green' : `\ntrail: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
