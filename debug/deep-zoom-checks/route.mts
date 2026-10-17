/**
 * route check: the route's logic (`deep-zoom/route.ts`) against a fake host. Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/route.mts        (npm run check:deep-zoom-route)
 *
 * What is real: the animation store, the animation engine and its scrub, the engine store with the
 * `dzFormula` and `camera` features, the host sync (`deep-zoom/useHostSync.ts`), the engine's zoom
 * path. What is fake: the host - a camera that is three strings and three angles, a depth, an
 * iteration count, a log of every call, and a ball that counts as the solid. A "flight" here puts
 * the fake camera somewhere and tells the route which way it went, as the navigation does.
 *
 * The scene: a straight dive at a point S along a line, so a keyframe's depth is its distance to S
 * and what the path does between two keyframes can be said in closed form.
 *
 *   set      K with no keyframe, K again (after the last), K on an earlier keyframe (replaces),
 *            Key Cam between two (goes in), K on the last (still adds), one undo step a press
 *   leg      a new leg's frames from its length on screen at 0.5 decades a second; the two limits
 *   payload  the camera, its heading and the K mark only (K, Key Cam and a row's replace write the mark; a scene from
 *            before it has none); a JSON round trip gives the same route, to the digit
 *   drive    each keyframe's stored view at its frame; one setView for a new view, none for the
 *            same one; the ends held; between two keyframes, between them; the renderer's own look
 *            values handed back; the sync's held values sent before the view; the iteration rule
 *            held off while the route drives; a re-scrub of the same frame leaves a camera the user
 *            took
 *   heading  the last move; cleared by a jump; kept by a keyframe; kept when a keyframe takes a new view
 *            (SINCE 2026-10-11 the heading is read off the trail when the trail can say, and otherwise from
 *            the moves counted in depths: debug/deep-zoom-checks/trail.mts, its "heading:" lines. Nothing
 *            here publishes a depth, so no trail is written and one move is the whole of it: these lines
 *            hold as they did. What the record below calls `heading` in route.ts is `drift` there now.)
 *   solid    nine points of a leg asked with the count keyed there; a leg through the ball is found
 *   play     a leg played from the Route tab stops on its keyframe; a hand stops the timeline
 *   render   while the route is rendered nothing changes it or plays it; the render's own scrub still sets the camera
 *   look     FREE LOOK (stage R5, 2026-10-11): a turn while the route plays goes on top of the route's rotation, in the
 *            camera's own frame, and playback goes on; it is gone when playback stops by itself, and kept when a fly key
 *            stops it; with Record on a pass writes the three look tracks (a key a frame, thinned when it ends, one undo
 *            step, the route's own keys untouched) and a scrub plays it back; a keyframe set under a recorded look shows
 *            what was on screen; Clear. The navigation is played by hand here: `lookTurned` with the orientation it
 *            would have turned to, `stopRoutePlayback` for a fly key. Every rotation a line compares against is put
 *            together in this file (axis-angle quaternions, Hamilton's product, the renderer's forward and up).
 *   delete   (2026-10-12; another scene: five keyframes half way round a ball that is the solid) keyframes deleted in the
 *            Route tab, and on the timeline, leave the route a FRESH route of the keyframes left would be - the view at
 *            every half frame, the depth curve, the count, the handles; several deleted together are one undo step; the
 *            keyframes that stay keep their times, and the leg that swallowed the others passes through the ball
 *   clear    Clear route: every keyframe, its iteration key and a recorded free look in one undo step; the playhead at
 *            frame 0; the camera the user's; undone, all of it is back
 *   seconds  a typed leg moves its keyframe and every later one by the same frames; time only; a frame at least
 *   reverse  (2026-10-16, stage Z1 of plans/deep-zoom-shell/ZOOM-OUTS.md; another scene: five keyframes on the line and
 *            off it, a shaped handle, two Linear depth keys, a recorded look) Reverse is one undo step; the keyframes the
 *            other way round with their ids, views and negated headings; the view, the depth curve, the count and the
 *            look at mirrored frames as they were; the playhead mirrored and the picture kept; reversed twice is the
 *            route to the digit; a look key past the route dropped, an iteration key past it kept
 *   engine   (2026-10-16, stage S1 of plans/deep-zoom-shell/SMOOTHING.md) the engine's key lookup, a binary search now,
 *            against the scan it replaced, on random tracks: the same values to the bit
 *   pace     the Pace track: the path's clock is the depth track times it, to the digit; none or x1 changes nothing;
 *            a typed leg, Even, a drag on the timeline, Reverse and Clear route take it along
 *   smooth   the pass's rules on the pure functions (deep-zoom/routeSmooth.ts: the warp, a range, the clock, the look),
 *            then the pass itself (`smoothRoute`) on a scene whose rays meet a cone narrowing to a passage near 1e-7 -
 *            the fake host's `freeDistance` - (the rush evened, one undo step, positions to the digit, K keyframes and
 *            the ends kept, aims within the miss, the look and other tracks carried, even, a range and its edges)
 *   read     the reader: every third frame from the route's own view with its keyed count, 45 rays, no frame run, the
 *            camera put back on its very view; the picture's speed against the rule worked out by hand
 *   pin      the K mark set and taken by hand
 *   close    legs under half a second listed; a merge drops the keyframe that moves the path least, never a K one
 *   dialog   (2026-10-16, stage S2 of plans/deep-zoom-shell/SMOOTHING.md) the Smooth... dialog's logic
 *            (deep-zoom/smoothDialog.ts): the strength's scale and its far end, what is smoothed (rows, the
 *            timeline's keys, a frame range), the graph's columns and range, the study's stray score, the close
 *            keyframes' rows; the run (read before, the pass, read after) and its readings kept by what the route
 *            is (an undo shows the before again without a ray); Cancel while the rays are read, and after the pass
 *
 * FALSIFICATION RECORD, 2026-10-11, one break per run in deep-zoom/route.ts, the file put back
 * byte for byte after each. The break, then what went red:
 *   - set:     `setKeyframe` made to replace whatever keyframe is under the playhead (the
 *              "parked on the LAST one it still adds" test taken out)        -> 3 red, then the check stops: "set: K with the
 *              playhead on the last keyframe adds one after it" (keys 1), "the timeline grows", "a third after the second"
 *   - set:     `ROUTE_PACE = 0.5` -> `1`                                      -> 8 red, every "set:" line that counts on a leg's
 *              frames (0, 300, 600 where 0, 600, 1200 are meant), then the check stops
 *   - leg:     the longest leg not held (`Math.min(ROUTE_MAX_LEG_SECONDS, ...)` out) -> 1 red: "leg: two keyframes at depth ..." (2.6e21 frames)
 *   - leg:     the shortest leg not held (`Math.max(ROUTE_MIN_LEG_SECONDS, ...)` out) -> 1 red: "leg: a leg that goes nowhere ..." (1 frame)
 *   - payload: `iters: v.iters` also written into the payload's view          -> 1 red: "payload: a key holds the camera ..." (stray keys: iters)
 *   - drive:   the line that hands back a keyframe's stored view at its own frame removed
 *                                                                             -> 2 red: "drive: at keyframe 2's frame ... to the digit" (another
 *              camera string, and a roll of -7e-18 where there is none), "play: a leg starts on the keyframe before it"
 *   - drive:   `flushHostSync()` removed from the hook                        -> 1 red: "drive: a formula value the sync was holding is sent before the frame's view"
 *   - sync:    the hold started again by every change, as the 90 ms wait was until 2026-10-12
 *                                                                             -> 1 red: "sync: a formula value that keeps changing is sent while it changes" (never sent in 30 writes)
 *   - heading: `heading = null` removed from the `viewSet` listener           -> 3 red: "heading: a view set by the route clears it",
 *              "a jump clears it", "a keyframe set with no move since the last jump has none"
 *   - solid:   the iteration count not handed to `estimateAtPoint`            -> 1 red: "solid: a leg is asked at 9 points, each with the count ..."
 *   - play:    the leg's end never acted on (`ctx.frame >= stopAt || ...` -> `false`) -> 1 red: "play: and stops on its own keyframe" (still playing at frame 1800)
 *   - play:    `stopRoutePlayback` without its pause                           -> 1 red: "play: a hand on the controls stops the timeline"
 *   - drive:   the hook's "same view as the last one set: nothing to do" line removed
 *                                                                             -> 4 red: the three "drive: scrubbed again at the same frame,
 *              nothing is set" and "drive: and a later frame, the same view, sets nothing"
 *   - drive:   past the last keyframe the FIRST one's view handed back         -> 3 red: "drive: at keyframe 3's frame ...", "drive: past the
 *              last keyframe its view is held", "play: and stops on its own keyframe"
 *   - drive:   `holdAutoIterations(next.iters > 0)` removed                   -> 2 red: "drive: a flight takes the camera: the renderer's own
 *              iteration rule is back ...", "drive: Return puts it back on the route, and the iteration rule is held off again"
 *   - drive:   the hook's "same frame, and the user holds the camera: leave it" line removed
 *                                                                             -> 3 red: "drive: after an edit, the scrub of the same frame leaves
 *              a camera the user took where it is" and the two lines after it. (The first version of that line scrubbed the
 *              same frame with NO edit in between and stayed green with the rule gone: the view was the last one set anyway.)
 *   - heading: a keyframe that takes a new view given the heading of the moment -> 1 red: "heading: a keyframe that takes a new view keeps
 *              the heading it had ..."
 *   - install: `registerLogTrack(ROUTE_TRACK)` removed                        -> 2 red: "install: ...", "drive: half way along a ten-decade
 *              leg ..." (the depth there reads 1e-10: the track eased in plain values)
 *   - render (2026-10-11, stage R6a; the four "render: ..." lines, the route held while it is rendered): the `routeRendering()` test
 *              taken out of `write`                                             -> 3 red: "render: while the route is rendered K, a
 *              replace and a delete change nothing ..." (K answered a key id, 4 keyframes, 2 undo steps) and the two lines after
 *              "render: and nothing plays", which then stand on a changed route. The guards of `deleteKeyframe`, `playSpan`, the
 *              cut from the trail and the two timings were not taken out one by one.
 *   - look (2026-10-11, stage R5; THREE breaks, the stage's allowance, each in deep-zoom/route.ts and put back byte for byte):
 *     1. the look multiplied on the OTHER side in `routeShownAt` (`.multiply(look)` -> `.premultiply(look)`: a turn about the
 *        world's axes, not the camera's own)                                    -> 5 red: "look: a turn while the route plays is shown
 *        at once ..." (0.16 rad apart), "look: 200 frames on, the view is the route's rotation THERE times the same turn ..."
 *        (0.17 rad; the line prints that the other order is 6e-16 apart), "look: a scrub shows the route with the recorded turn
 *        on top ..." (20.26 deg), "look: and the camera counts as on the route where it stands", "look: scrubbed away and back,
 *        that keyframe shows what was on screen ..." (1.73 rad)
 *     2. the listener on `isPlaying` in `installRoute` emptied (nothing settles the look when playback stops)
 *                                                                             -> 3 red: "look: playback stops with no hand on the
 *        camera ..." (0 setView), "look: a recorded pass writes keys on the three tracks, thinned when it ends ..." (301, 301,
 *        301 keys), "look: (and redone, it is back)"
 *     3. `if (looked) takeCamera()` out of `stopRoutePlayback`                 -> 1 red: "look: a fly key during playback stops it
 *        and the camera keeps its turn ..." (1 setView, kept false, drives true)
 *     NOT FALSIFIED, green only: every other "look:" line (no look and zero keys to the digit, Record on with no turn, the
 *     pass as one undo step, the playback within the fitter's tolerance, the route's keys untouched, the second pass, Key Cam
 *     writing no look key, the keyframe's stored rotation, K in the middle of a free look, Record coming on over a turn and
 *     going off in the middle, Clear). AFTER break 2 the pass's sampling was changed (a frame is sampled when the next one is
 *     shown, and the first key is a frame earlier): the "thinned when it ends" line was seen red before that change and
 *     green after it, and was not broken again.
 *   - delete, clear, seconds (2026-10-12; THREE breaks, the stage's allowance, each in deep-zoom/route.ts and put back byte
 *     for byte, the file's checksum compared):
 *     1. a second `anim().snapshot()` in `clearRoute`, before the tracks go        -> 3 red: "clear: Clear route takes every
 *        keyframe and its iteration key in ONE undo step ..." (2 steps), "clear: a recorded free look goes with the route, in
 *        the same step ..." (2 steps), "clear: with no keyframe it does nothing, and leaves no step"
 *     2. `setLegSeconds` moving the leg's own keyframe only (`j < i ? f : f + by` -> `j === i ? f + by : f`)
 *                                                                             -> 3 red: "seconds: a leg given five seconds ..."
 *        (frames 0, 40, 190, 208), "seconds: only time changes ..." (counts at 0, 40, 190, 168, 208), "seconds: the least is one
 *        frame" (0, 40, 190, 191)
 *     3. `deleteKeyframes` taking a step a keyframe                               -> 1 red: "delete: three keyframes deleted
 *        together are ONE undo step ..." (3 steps). ("delete: and that one step undone brings all three back" stayed green:
 *        the extra steps hold the same route.)
 *     NOT FALSIFIED, green only: every other "delete:", "clear:" and "seconds:" line and the last "render:" line.
 *     THE "deleted ON THE TIMELINE" LINES were written after their fix (the neighbours' handles worked out again by the
 *     follower in `installRoute`). The same comparison, run as a scratch on the tree before the fix
 *     (debug/scratch/route-fixes/delete-measure.mts, git-ignored), was red: 252 of 417 half frames differed from the fresh
 *     route with the third keyframe deleted, 403 with the middle three, 414 with the second and the fourth; the depth curve
 *     by up to 0.048 decades. The Route tab's own delete was 0 of 417 in all three, before the stage and after.
 *   - reverse (2026-10-16, stage Z1; THREE breaks, the stage's allowance, the third in route.ts for the trail check; each
 *     file put back byte for byte, its checksum compared):
 *     1. route.ts, `reverseRoute` leaving every heading as it was                 -> 3 red: "reverse: ONE undo step; the keyframes
 *        the other way round ..." (the headings), "reverse: at every mirrored frame the camera is where it was ..." (2.9 depths
 *        off between keyframes), "reverse: between two keyframes the camera is put on the mirrored frame ..." (2.1); and in
 *        check:deep-zoom-trail "reverse: and turned back to the smoothing it had ..."
 *     2. engine/math/AnimationMath.ts, `mirrorKeyframes` letting each key keep its own interpolation
 *                                                                               -> 3 red: "reverse: at every mirrored frame the camera
 *        is where it was ..." (0.10 of the depth), "reverse: the depth curve at mirrored frames ..." (0.034 decades), "reverse:
 *        between two keyframes ..." (0.013)
 *     3. (check:deep-zoom-trail's lines; see its header)
 *     NOT FALSIFIED, green only: the one undo step, reversed twice, each step undone, the count and the look at mirrored
 *     frames, the playhead on a keyframe, the camera the user holds, the keys outside the span, and nothing while a route
 *     renders or with one keyframe.
 *   - engine, pace, smooth (2026-10-16, stage S1 of SMOOTHING.md; THREE breaks, the stage's allowance, each file put back
 *     byte for byte, its checksum compared):
 *     1. engine/AnimationEngine.ts, the search taking the pair that STARTS on a key's frame (`>` for `>=`)
 *                                                                               -> 1 red: "engine: the key lookup is a binary
 *        search ..." (360 of 28,534 values differ)
 *     2. route.ts, `route()` building the path from the depth track alone       -> 3 red: "pace: the path's scale is the depth
 *        track times the Pace track ..." (0 of 1,437 half frames), "smooth: a strength of the route's length or more is one
 *        even pace ..." (x1.281), "smooth: a range (keyframes 4 to 6) ..." (the legs beside it)
 *     3. routeSmooth.ts, a range's change not eased (`w` always 1 in `paceChange`) -> 2 red: "smooth: a range: nothing
 *        outside it changes ...", "smooth: a range crosses its edges as the route did before it ..." (x1.05 / x0.95 against
 *        x1.27 / x1.07)
 *     NOT FALSIFIED, green only: every other "pace:", "smooth:", "read:", "pin:" and "close:" line, and the two new
 *     "payload:" lines (the K mark).
 *   - dialog (2026-10-16, stage S2 of SMOOTHING.md; THREE breaks, the stage's allowance - the first in route.ts for the
 *     trail check's "picture:" lines, see its header; each file put back byte for byte, its checksum compared):
 *     2. route.ts, `readRouteRays` not looking at the signal                  -> 2 red: "dialog: Cancel while the rays are
 *        read stops the reading at once ..." (22,860 rays asked, 12,375 when it was cancelled at 21 of 254 frames), "dialog:
 *        Cancel while the route is read after the pass keeps the pass ..." (the reading after it finished)
 *     3. smoothDialog.ts, `strengthFor` handing 4 s for `EVEN`                -> 1 red: "dialog: the strength is one log slider
 *        from 4 s ..."
 *     NOT FALSIFIED, green only: every other "dialog:" line.
 *   - record (2026-10-17, stage 1 of plans/deep-zoom-shell/STREAMLINE.md, A4: Record goes off when playback stops after a
 *     recorded pass; route.ts put back byte for byte, its checksum compared): the `passed` line taken out of the `isPlaying`
 *     listener in `installRoute`                                            -> 2 red: "look: Record stays on after a playback
 *     with no turn, and goes off when playback stops after a recorded pass ..." (on after the pass true), "look: a second pass
 *     over part of the first ..." (the line before it turns Record on again, which then turned it off). The two passes and the
 *     lines after them turn Record on again by hand where it went off, so they run as they did before the rule.
 */
import { featureRegistry } from '../../engine/FeatureSystem';
import { DzFormulaFeature } from '../../deep-zoom/features/formula';
import { DzCameraFeature } from '../../deep-zoom/features/camera';
import { useEngineStore, bindStoreToEngine } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { animationEngine } from '../../engine/AnimationEngine';
import { isPayloadTrack } from '../../engine/animation/payloadTrackRegistry';
import { isLogTrack } from '../../engine/animation/logTrackRegistry';
import { captureCameraKeyFrame } from '../../engine/animation/cameraKeyRegistry';
import { setHost } from '../../deep-zoom/host/current';
import type { DeepZoomHost, DzParams, DzView } from '../../deep-zoom/host/DeepZoomHost';
import { startHostSync } from '../../deep-zoom/useHostSync';
import * as THREE from 'three';
import { toOrientation } from '../../deep-zoom/orbitCamera';
import {
    LOOK_FIT_TOLERANCE, LOOK_TRACKS, ROUTE_ITERATIONS_TRACK, ROUTE_MAX_LEG_SECONDS, ROUTE_MIN_LEG_SECONDS, ROUTE_PACE_TRACK, ROUTE_SOLID_SAMPLES, ROUTE_TRACK, ROUTE_UNIT,
    cameraOnRoute, clearLook, clearRoute, closeKeyframes, deleteKeyframe, deleteKeyframes, headingNow, installRoute, legFrames, legInSolid, lookKeyed, lookTurned,
    mergeCloseKeyframes, noteMove, pinKeyframe, playLeg, replaceKeyframe, retimeRoute, returnToRoute, reverseRoute, routeDrives, routeKeys, routePaceAt,
    routePictureSpeed, routeShownAt, routeViewAt, scrubRouteTo, setKeyframe, setLegSeconds, setRouteRendering, smoothRoute, stopRoutePlayback, unpinKeyframe, useRoute,
} from '../../deep-zoom/route';
import type { RouteKey, RoutePayload } from '../../deep-zoom/route';
import { carryLook, paceChange, paceSpan, speedMargin, warpRoute } from '../../deep-zoom/routeSmooth';
import {
    EVEN, STRENGTH_MIN, closeRows, keyframeMap, knownPace, paceColumns, paceRange, routeSignature, runSmooth, smoothSpan, strayFrames, strayShare, strengthFor, strengthFromSlider,
    strengthScale, timelinePicked,
} from '../../deep-zoom/smoothDialog';
import type { SmoothPhase } from '../../deep-zoom/smoothDialog';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import { AnimationMath } from '../../engine/math/AnimationMath';
import { buildZoomPath, zoomPathPosition } from '../../engine/animation/zoomPath';
import type { Keyframe, Track } from '../../types';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

// ── the scene ────────────────────────────────────────────────────────────────────────────────────
type V3 = [number, number, number];
const UNIT = 2n ** 256n;
/** A coordinate as the camera holds it. */
const fixed = (x: number): bigint => BigInt(Math.round(x * 2 ** 40)) << 216n;
/** The point the dive closes on, and the unit vector from it back to the camera. */
const S: [bigint, bigint, bigint] = [fixed(0.31), fixed(-0.12), fixed(0.94)];
const BACK: V3 = [0.48, 0.6, 0.64];
const INWARD: V3 = [-BACK[0], -BACK[1], -BACK[2]];
/** The camera `depth` away from S along the line. */
const at = (depth: number): [string, string, string] =>
    [0, 1, 2].map((j) => String(S[j] + BigInt(Math.round(depth * BACK[j] * 2 ** 256)))) as [string, string, string];
/** The count the renderer's own rule would stand at for a depth. */
const countFor = (depth: number): number => 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(depth)));
const fromS = (cam: readonly string[]): V3 => [0, 1, 2].map((j) => Number(BigInt(cam[j]) - S[j]) / ROUTE_UNIT) as V3;

// ── the fake host ────────────────────────────────────────────────────────────────────────────────
type Call = { name: 'setView'; view: DzView } | { name: 'setParams'; patch: DzParams } | { name: 'estimateAtPoint'; cam: string[]; iters: number | undefined }
    | { name: 'setOrientation' } | { name: 'freeDistance'; cam: string; iters: number } | { name: 'step' };
/** What the rays of the smoothing lines meet: given the camera (from S) and a ray, how far. Null: nothing anywhere. */
let world: ((cam: V3, dir: V3) => number) | null = null;
const calls: Call[] = [];
const viewSetListeners = new Set<() => void>();
let depthHere = 1;
let view: DzView = { cam: at(1), yaw: -1.2, pitch: 0.3, iters: countFor(1), power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 };
/** The solid of this scene: a ball about a point of the line between depths 1e-4 and 1e-5 (off until a test turns it on). */
let ball: { centre: [bigint, bigint, bigint]; radius: number } | null = null;
const host = {
    ready: Promise.resolve(),
    bootParams: () => ({}),
    getView: (): DzView => ({ ...view, cam: [view.cam[0], view.cam[1], view.cam[2]], phase: [view.phase[0], view.phase[1]] }),
    setView: (v: DzView): void => {
        calls.push({ name: 'setView', view: v });
        view = { ...v, cam: [v.cam[0], v.cam[1], v.cam[2]] };
        if (!v.roll) delete view.roll;
        depthHere = Math.hypot(...fromS(v.cam));
        for (const fn of [...viewSetListeners]) fn();
    },
    setParams: (patch: DzParams): void => { calls.push({ name: 'setParams', patch: { ...patch } }); },
    orientation: () => ({ yaw: view.yaw, pitch: view.pitch, roll: view.roll ?? 0 }),
    // A turn, as the navigation makes one: the angles only, and no `viewSet`.
    setOrientation: (yaw: number, pitch: number, roll: number): void => {
        calls.push({ name: 'setOrientation' });
        view = { ...view, yaw, pitch };
        if (roll) view.roll = roll; else delete view.roll;
    },
    telemetry: () => ({ depth: depthHere, iters: view.iters }),
    sense: () => ({ near: depthHere, second: depthHere, hits: 7, open: 0, inside: false, marched: true }),
    thumbnail: () => `picture of ${view.cam[0].slice(0, 12)}`,
    estimateAtPoint: (cam: [string, string, string], iters?: number): number => {
        calls.push({ name: 'estimateAtPoint', cam, iters });
        if (!ball) return 1;
        const off = [0, 1, 2].map((j) => Number(BigInt(cam[j]) - (ball as { centre: bigint[] }).centre[j]) / ROUTE_UNIT);
        return Math.hypot(off[0], off[1], off[2]) < ball.radius ? 0 : 1;
    },
    on: (type: string, fn: () => void) => { if (type === 'viewSet') viewSetListeners.add(fn); return () => { viewSetListeners.delete(fn); }; },
    // One ray from the camera as it stands (the smoothing lines): what `world` says, the camera and its count noted.
    freeDistance: (dir: [number, number, number]) => {
        calls.push({ name: 'freeDistance', cam: view.cam.join(), iters: view.iters });
        const t = world ? world(fromS(view.cam), dir) : Infinity;
        return Number.isFinite(t) ? { t, kind: 'hit' as const } : { t: 8, kind: 'open' as const };
    },
    // A frame of the renderer: the reader must never run one.
    step: (): void => { calls.push({ name: 'step' }); },
} as unknown as DeepZoomHost;

/** The hands fly the camera to `depth` on the line, looking as given: no `setView`, a move told to the route. */
function flyTo(depth: number, look: { yaw: number; pitch: number; roll?: number }): void {
    view = { ...view, cam: at(depth), yaw: look.yaw, pitch: look.pitch, iters: countFor(depth) };
    if (look.roll) view.roll = look.roll; else delete view.roll;
    depthHere = depth;
    noteMove(INWARD[0] * depth, INWARD[1] * depth, INWARD[2] * depth);
}
const setViews = (): DzView[] => calls.filter((c): c is Extract<Call, { name: 'setView' }> => c.name === 'setView').map((c) => c.view);
const anim = () => useAnimationStore.getState();
const depthKeys = () => anim().sequence.tracks[ROUTE_TRACK]?.keyframes ?? [];
const countKeys = () => anim().sequence.tracks[ROUTE_ITERATIONS_TRACK]?.keyframes ?? [];
/** What the timeline does when the playhead is put on a frame. */
const scrub = (frame: number): void => { anim().seek(frame); animationEngine.scrub(frame); };
const sameCamera = (a: { cam: readonly string[]; yaw: number; pitch: number; roll?: number }, b: { cam: readonly string[]; yaw: number; pitch: number; roll?: number }): boolean =>
    a.cam[0] === b.cam[0] && a.cam[1] === b.cam[1] && a.cam[2] === b.cam[2] && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
/** Two directions, the same to fifteen digits. */
const sameWay = (a: readonly number[] | null | undefined, b: readonly number[]): boolean => !!a && a.length === 3 && a.every((v, i) => Math.abs(v - b[i]) < 1e-15);

// ── boot, as main.tsx does it ────────────────────────────────────────────────────────────────────
featureRegistry.register(DzFormulaFeature);
featureRegistry.register(DzCameraFeature);
useEngineStore.getState();
bindStoreToEngine();
installRoute();
setHost(host);
const stopSync = startHostSync();
await tick();
await tick();
check(isPayloadTrack(ROUTE_TRACK) && isLogTrack(ROUTE_TRACK), 'install: the route\'s track is a payload track and a log track');

// ── set ──────────────────────────────────────────────────────────────────────────────────────────
const undoBefore = anim().undoStack.length;
const first = setKeyframe();
let keys = routeKeys();
check(!!first && keys.length === 1 && keys[0].frame === 0 && keys[0].depth === 1 && anim().currentFrame === 0, 'set: the first keyframe goes at frame 0, with the depth as its value',
    `keys ${keys.length}, frame ${keys[0]?.frame}, depth ${keys[0]?.depth}`);
check(anim().undoStack.length === undoBefore + 1, 'set: one press is one undo step', `${anim().undoStack.length - undoBefore} steps`);
check(countKeys().length === 1 && countKeys()[0].frame === 0 && countKeys()[0].value === countFor(1) && countKeys()[0].interpolation === 'Linear',
    'set: the iteration count in force is keyed at the same frame, as an ordinary linear key', JSON.stringify(countKeys().map((k) => [k.frame, k.value, k.interpolation])));
check(useRoute.getState().thumbnails[keys[0].id]?.startsWith('picture of') === true, 'set: a picture of the keyframe is kept under its id');

flyTo(1e-10, { yaw: -1.1, pitch: 0.25 });
setKeyframe();                                   // the playhead is on the first keyframe, which is also the last: it adds
keys = routeKeys();
check(keys.length === 2 && keys[1].frame === 600 && keys[1].depth === 1e-10 && anim().currentFrame === 600,
    'set: K with the playhead on the last keyframe adds one after it, and the playhead moves there', `keys ${keys.length}, frames ${keys.map((k) => k.frame)}`);
check(anim().durationFrames === 600, 'set: the timeline grows to hold it', `length ${anim().durationFrames}`);
flyTo(1e-20, { yaw: -1.0, pitch: 0.2, roll: 0.25 });
setKeyframe();
keys = routeKeys();
check(keys.length === 3 && keys[2].frame === 1200 && keys[2].view.roll === 0.25 && !('roll' in keys[1].view), 'set: a third after the second; a roll is kept, and left out where there is none',
    `frames ${keys.map((k) => k.frame)}, rolls ${keys.map((k) => k.view.roll)}`);

// On an earlier keyframe K replaces it.
scrub(600);
const secondId = keys[1].id, undoAt = anim().undoStack.length;
flyTo(1e-9, { yaw: -1.15, pitch: 0.22 });
setKeyframe();
keys = routeKeys();
check(keys.length === 3 && keys[1].frame === 600 && keys[1].depth === 1e-9 && keys[1].view.cam[0] === at(1e-9)[0] && keys[1].view.yaw === -1.15,
    'set: K with the playhead on an earlier keyframe replaces that keyframe\'s view and keeps its time', `keys ${keys.length}, depth ${keys[1]?.depth}, frame ${keys[1]?.frame}`);
check(anim().undoStack.length === undoAt + 1 && countKeys().length === 3 && countKeys()[1].value === countFor(1e-9), 'set: a replace is one undo step too, and its iteration key follows',
    `steps ${anim().undoStack.length - undoAt}, counts ${countKeys().map((k) => k.value)}`);
anim().undo();
check(routeKeys()[1].id === secondId && routeKeys()[1].depth === 1e-10 && countKeys()[1].value === countFor(1e-10), 'set: that step undone puts the keyframe and its count back');

// Key Cam, at the playhead between two keyframes.
anim().seek(300);
flyTo(1e-4, { yaw: -1.18, pitch: 0.28 });
captureCameraKeyFrame(300);
keys = routeKeys();
check(keys.length === 4 && keys.map((k) => k.frame).join() === '0,300,600,1200' && keys[1].depth === 1e-4, 'set: Key Cam at a frame between two keyframes puts one in between',
    `frames ${keys.map((k) => k.frame)}`);
check(countKeys().find((k) => k.frame === 300)?.value === countFor(1e-4), 'set: and its count is the count in force, not the curve\'s', `${countKeys().find((k) => k.frame === 300)?.value}`);
flyTo(3e-4, { yaw: -1.18, pitch: 0.28 });
captureCameraKeyFrame(300.3);
check(routeKeys().length === 4 && routeKeys()[1].depth === 3e-4, 'set: Key Cam on a keyframe replaces it', `keys ${routeKeys().length}, depth ${routeKeys()[1].depth}`);
deleteKeyframe(routeKeys()[1].id);
keys = routeKeys();
check(keys.length === 3 && keys.map((k) => k.frame).join() === '0,600,1200' && !countKeys().some((k) => k.frame === 300), 'set: a deleted keyframe takes its iteration key with it',
    `frames ${keys.map((k) => k.frame)}, counts at ${countKeys().map((k) => k.frame)}`);
// The row's own "replace" works on the last keyframe too.
flyTo(2e-20, { yaw: -1.0, pitch: 0.2, roll: 0.25 });
replaceKeyframe(keys[2].id);
check(routeKeys().length === 3 && routeKeys()[2].depth === 2e-20 && routeKeys()[2].frame === 1200, 'set: a row\'s replace takes the last keyframe as well');
flyTo(1e-20, { yaw: -1.0, pitch: 0.2, roll: 0.25 });
replaceKeyframe(routeKeys()[2].id);
keys = routeKeys();

// ── leg ──────────────────────────────────────────────────────────────────────────────────────────
const k0 = keys[0];
check(legFrames(k0, { depth: 1e-10, view: { ...k0.view, cam: at(1e-10) } }, 30) === 600, 'leg: ten decades straight in, at 0.5 decades a second, are 600 frames at 30 a second',
    `${legFrames(k0, { depth: 1e-10, view: { ...k0.view, cam: at(1e-10) } }, 30)}`);
check(legFrames(k0, { depth: 1e-3, view: { ...k0.view, cam: at(1e-3) } }, 24) === 144, 'leg: three decades at 24 frames a second are 144', `${legFrames(k0, { depth: 1e-3, view: { ...k0.view, cam: at(1e-3) } }, 24)}`);
check(ROUTE_MIN_LEG_SECONDS === 0.2 && legFrames(k0, { depth: 1, view: k0.view }, 30) === 6, 'leg: a leg that goes nowhere is the shortest leg, a fifth of a second',
    `${legFrames(k0, { depth: 1, view: k0.view }, 30)} frames`);
const deep: RouteKey = { ...keys[2], view: { ...keys[2].view } };
check(ROUTE_MAX_LEG_SECONDS === 180 && legFrames(deep, { depth: 1e-20, view: { ...deep.view, cam: at(1) } }, 30) === 5400, 'leg: two keyframes at depth, a whole unit apart, are the longest leg and no more',
    `${legFrames(deep, { depth: 1e-20, view: { ...deep.view, cam: at(1) } }, 30)} frames`);

// ── payload ──────────────────────────────────────────────────────────────────────────────────────
const payloads = depthKeys().map((k) => k.payload as RoutePayload);
const stray = payloads.flatMap((p) => [...Object.keys(p).filter((key) => key !== 'view' && key !== 'heading' && key !== 'exact'), ...Object.keys(p.view).filter((key) => !['cam', 'yaw', 'pitch', 'roll'].includes(key))]);
check(payloads.length === 3 && stray.length === 0 && payloads.every((p) => p.view.cam.every((c) => typeof c === 'string')),
    'payload: a key holds the camera, its heading and the K mark, nothing else, and the position as strings', `stray keys: ${stray.join()}`);
check(payloads.every((p) => p.exact === true) && routeKeys().every((k) => k.exact === true),
    'payload: K, Key Cam and a row\'s replace each mark the keyframe they write exact (the K mark: `exact: true`)', JSON.stringify(payloads.map((p) => p.exact)));
{
    const older = JSON.parse(JSON.stringify(anim().sequence));
    for (const k of older.tracks[ROUTE_TRACK].keyframes) delete k.payload.exact;
    const was = JSON.stringify(anim().sequence);
    anim().setSequence(older);
    check(routeKeys().length === 3 && routeKeys().every((k) => !('exact' in k)), 'payload: a scene saved before the mark has none: every keyframe of it may be missed');
    anim().setSequence(JSON.parse(was));
}
const wanted = [0, 300, 450.5, 600, 900, 1200].map((f) => JSON.stringify(routeViewAt(f)));
const saved = JSON.stringify(anim().sequence);
anim().setSequence(JSON.parse(saved));
check(JSON.stringify(anim().sequence) === saved && [0, 300, 450.5, 600, 900, 1200].every((f, i) => JSON.stringify(routeViewAt(f)) === wanted[i]),
    'payload: the sequence through JSON and back is the same route, to the digit');
keys = routeKeys();

// ── drive ────────────────────────────────────────────────────────────────────────────────────────
// The hands hold the camera here (the last thing above was a flight). Scrub to each keyframe.
for (const [i, key] of keys.entries()) {
    const before = setViews().length;
    scrub(key.frame);
    const got = setViews().slice(before);
    check(got.length === 1 && sameCamera(got[0], key.view), `drive: at keyframe ${i + 1}'s frame the host is handed its stored view, to the digit, once`,
        `${got.length} setView; ${got[0] ? JSON.stringify([got[0].cam[0] === key.view.cam[0], got[0].yaw, key.view.yaw, got[0].roll, key.view.roll]) : ''}`);
    scrub(key.frame);
    check(setViews().length === before + 1, `drive: scrubbed again at the same frame, nothing is set`);
}
check(routeDrives() && cameraOnRoute(), 'drive: the route drives now, and the camera is on it');
let n = setViews().length;
scrub(300);
const mid = setViews()[n];
const off = mid ? fromS(mid.cam) : [0, 0, 0] as V3, far = Math.hypot(off[0], off[1], off[2]);
const along = (off[0] * BACK[0] + off[1] * BACK[1] + off[2] * BACK[2]) / far;
check(setViews().length === n + 1 && Math.abs(far / 1e-5 - 1) < 1e-6 && along > 1 - 1e-12,
    'drive: half way along a ten-decade leg the camera is on the line, five decades in', `${setViews().length - n} setView; depth ${far.toExponential(9)}, along ${along}`);
check(!!mid && mid.yaw < -1.1 && mid.yaw > -1.2 && mid.pitch > 0.25 && mid.pitch < 0.3, 'drive: and it looks between the two keyframes\' looks', `${mid?.yaw}, ${mid?.pitch}`);
check(!!mid && mid.power === 8 && mid.light === 0 && mid.falloff === 4 && mid.cscale === 1 && mid.surf === 1 && mid.phase.join() === '0,0', 'drive: every look value handed back is the renderer\'s own');
check(!!mid && mid.iters === Math.trunc((countFor(1) + countFor(1e-10)) / 2), 'drive: the iteration count is the one keyed for that frame', `${mid?.iters}`);
n = setViews().length;
anim().setDuration(2000);
scrub(1500);
check(setViews().length === n + 1 && sameCamera(setViews()[n], keys[2].view), 'drive: past the last keyframe its view is held');
scrub(1800);
check(setViews().length === n + 1, 'drive: and a later frame, the same view, sets nothing');

// The sync's held values go before the view; the iteration rule is held off while the route drives.
calls.length = 0;
useEngineStore.getState().setDzFormula({ power: 5 });
check(!calls.some((c) => c.name === 'setParams' && 'dzFormula.power' in c.patch), 'drive: (a formula value written by hand waits its frame)');
scrub(450);
const powerAt = calls.findIndex((c) => c.name === 'setParams' && c.patch['dzFormula.power'] === 5), viewAt = calls.findIndex((c) => c.name === 'setView');
check(powerAt >= 0 && viewAt > powerAt, 'drive: a formula value the sync was holding is sent before the frame\'s view', `setParams at ${powerAt}, setView at ${viewAt}`);
// A hand on a slider: thirty writes with no pause as long as the old 90 ms wait. The value has to arrive while it moves.
calls.length = 0;
let sentAtWrite = -1;
for (let i = 0; i < 30; i++) {
    useEngineStore.getState().setDzFormula({ power: 2 + (i % 2) });
    await new Promise<void>((resolve) => setTimeout(resolve, 4));
    if (sentAtWrite < 0 && calls.some((c) => c.name === 'setParams' && 'dzFormula.power' in c.patch)) sentAtWrite = i;
}
check(sentAtWrite >= 0 && sentAtWrite < 29, 'sync: a formula value that keeps changing is sent while it changes', `first seen after write ${sentAtWrite} of 30`);
useEngineStore.getState().setDzFormula({ power: 8 });
calls.length = 0;
flyTo(4e-8, { yaw: -1.1, pitch: 0.2 });
const handedBack = calls.some((c) => c.name === 'setParams' && c.patch['dzFormula.autoIterations'] === true);
check(!routeDrives() && handedBack && !cameraOnRoute(), 'drive: a flight takes the camera: the renderer\'s own iteration rule is back, and the camera is off the route');
calls.length = 0;
// An edit on the timeline (a keyframe dragged later), and the scrub of the playhead's own frame the timeline makes after it.
anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: keys[1].id, patch: { frame: 630 } }]);
scrub(450);
check(setViews().length === 0 && !routeDrives(), 'drive: after an edit, the scrub of the same frame leaves a camera the user took where it is', `${setViews().length} setView`);
returnToRoute();
const heldOff = calls.some((c) => c.name === 'setParams' && c.patch['dzFormula.autoIterations'] === false);
check(setViews().length === 1 && routeDrives() && cameraOnRoute() && heldOff, 'drive: Return puts it back on the route, and the iteration rule is held off again',
    `${setViews().length} setView, drives ${routeDrives()}, held off ${heldOff}`);
anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: keys[1].id, patch: { frame: 600 } }]);
scrub(450);
check(setViews().length === 2 && cameraOnRoute(), 'drive: while the route drives, the same scrub after an edit carries the camera with the edit', `${setViews().length} setView`);

// ── heading ──────────────────────────────────────────────────────────────────────────────────────
check(headingNow() === null, 'heading: a view set by the route clears it');
noteMove(0, 3e-12, 4e-12);
check(sameWay(headingNow(), [0, 0.6, 0.8]), 'heading: it is the direction of the last move, as a unit vector', JSON.stringify(headingNow()));
noteMove(0, 0, 0);
check(sameWay(headingNow(), [0, 0.6, 0.8]), 'heading: a move of nothing leaves it');
host.setView(host.getView());                    // a jump: Home, a place, an undo
check(headingNow() === null && !routeDrives(), 'heading: a jump clears it, and takes the camera from the route');
check(sameWay((depthKeys()[1].payload as RoutePayload).heading, INWARD), 'heading: a keyframe carries the direction it was flown in at', JSON.stringify((depthKeys()[1].payload as RoutePayload).heading));
scrub(600);
noteMove(BACK[0] * 1e-11, BACK[1] * 1e-11, BACK[2] * 1e-11);     // a tap backwards, to frame it
replaceKeyframe(keys[1].id);
check(sameWay((depthKeys()[1].payload as RoutePayload).heading, INWARD), 'heading: a keyframe that takes a new view keeps the heading it had, whatever nudge framed it',
    JSON.stringify((depthKeys()[1].payload as RoutePayload).heading));
scrub(900);
captureCameraKeyFrame(900);                      // a keyframe set where the route itself put the camera
const fresh = depthKeys().find((k) => k.frame === 900)?.payload as RoutePayload | undefined;
check(!!fresh && !('heading' in fresh), 'heading: a keyframe set with no move since the last jump has none');
deleteKeyframe(routeKeys().find((k) => k.frame === 900)?.id ?? '');
keys = routeKeys();

// ── solid ────────────────────────────────────────────────────────────────────────────────────────
calls.length = 0;
check(!legInSolid(1) && !legInSolid(2), 'solid: with nothing in the way no leg passes through it');
const asked = calls.filter((c): c is Extract<Call, { name: 'estimateAtPoint' }> => c.name === 'estimateAtPoint');
const expectCount = (frame: number): number => Math.trunc(animationEngine.evaluateTrack(anim().sequence.tracks[ROUTE_ITERATIONS_TRACK], frame));
check(asked.length === 2 * ROUTE_SOLID_SAMPLES && asked[0].iters === expectCount(60) && asked[ROUTE_SOLID_SAMPLES - 1].iters === expectCount(540),
    `solid: a leg is asked at ${ROUTE_SOLID_SAMPLES} points, each with the count keyed for its frame`, `${asked.length} asks; ${asked[0]?.iters} / ${expectCount(60)}`);
const inLeg = routeViewAt(300);
ball = { centre: [BigInt(inLeg?.cam[0] ?? 0), BigInt(inLeg?.cam[1] ?? 0), BigInt(inLeg?.cam[2] ?? 0)], radius: 2e-6 };
check(legInSolid(1) && !legInSolid(2), 'solid: a ball on the first leg is found there, and not on the second');
ball = null;

// ── play ─────────────────────────────────────────────────────────────────────────────────────────
flyTo(7e-3, { yaw: -1.1, pitch: 0.2 });          // the hands hold the camera, somewhere off the route
n = setViews().length;
playLeg(keys[2].id);
check(anim().isPlaying && anim().currentFrame === 600 && sameCamera(setViews()[n], keys[1].view), 'play: a leg starts on the keyframe before it, whoever held the camera');
let ticks = 0;
while (anim().isPlaying && ticks++ < 400) animationEngine.tick(0.1);
check(!anim().isPlaying && anim().currentFrame === 1200 && sameCamera(host.getView(), keys[2].view), 'play: and stops on its own keyframe, the camera exactly there',
    `playing ${anim().isPlaying}, frame ${anim().currentFrame}, ticks ${ticks}`);
anim().seek(700);
anim().play();
stopRoutePlayback();
check(!anim().isPlaying, 'play: a hand on the controls stops the timeline');

// ── render ───────────────────────────────────────────────────────────────────────────────────────
// While the route is rendered (deep-zoom/routeRender.tsx) nothing changes it or plays it; the
// render's own scrub still sets the camera.
keys = routeKeys();
const heldKeys = JSON.stringify(keys), heldUndo = anim().undoStack.length;
setRouteRendering(true);
flyTo(3e-4, { yaw: 0.4, pitch: -0.1 });
const refused = setKeyframe();
replaceKeyframe(keys[1].id);
deleteKeyframe(keys[0].id);
check(refused === null && JSON.stringify(routeKeys()) === heldKeys && anim().undoStack.length === heldUndo,
    'render: while the route is rendered K, a replace and a delete change nothing and leave no undo step',
    `K answered ${String(refused)}, ${routeKeys().length} keyframes, ${anim().undoStack.length - heldUndo} undo steps`);
anim().seek(0);
playLeg(keys[1].id);
check(!anim().isPlaying, 'render: and nothing plays');
n = setViews().length;
scrubRouteTo(keys[1].frame);
check(setViews().length === n + 1 && sameCamera(host.getView(), keys[1].view) && anim().currentFrame === keys[1].frame,
    'render: the render\'s own scrub still puts the camera on the route');
setRouteRendering(false);
check(setKeyframe() !== null && anim().undoStack.length === heldUndo + 1, 'render: when it has ended a keyframe can be set again');

// ── look ─────────────────────────────────────────────────────────────────────────────────────────
// Free look: a turn on top of the route while it plays. What the navigation does is done here by
// hand: it reads the orientation on screen, turns it, and tells the route (`lookTurned`); a fly key
// is `stopRoutePlayback`. Every rotation the lines compare against is put together HERE, from
// axis-angle quaternions and Hamilton's product, and compared as the two directions the renderer
// draws with (its forward and its up, by its own formula) - not with route.ts's own arithmetic.
type Q = [number, number, number, number];
type Look = { yaw: number; pitch: number; roll?: number };
const axisQ = (x: number, y: number, z: number, angle: number): Q => { const s = Math.sin(angle / 2); return [x * s, y * s, z * s, Math.cos(angle / 2)]; };
const mul = (a: Q, b: Q): Q => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const conj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]];
const turnBy = (q: Q, v: V3): V3 => { const r = mul(mul(q, [v[0], v[1], v[2], 0]), conj(q)); return [r[0], r[1], r[2]]; };
/** An orientation as a turn of the identity camera (forward -Z, up +Y): yaw about Y, then pitch about X, then roll about Z. */
const routeQ = (o: Look): Q => mul(mul(axisQ(0, 1, 0, -(o.yaw + Math.PI / 2)), axisQ(1, 0, 0, o.pitch)), axisQ(0, 0, 1, o.roll ?? 0));
/** A look in the camera's own frame: pan about its up, then tilt about its right, then roll about its view axis. */
const lookQ = (a: readonly number[]): Q => mul(mul(axisQ(0, 1, 0, -a[0]), axisQ(1, 0, 0, a[1])), axisQ(0, 0, 1, a[2]));
/** The renderer's forward and up for an orientation (grep `function basis()` in deep-zoom/renderer/core.js). */
const drawnWith = (o: Look): { fwd: V3; up: V3 } => {
    const cp = Math.cos(o.pitch), r = o.roll ?? 0;
    const fwd: V3 = [cp * Math.cos(o.yaw), Math.sin(o.pitch), cp * Math.sin(o.yaw)], right: V3 = [-Math.sin(o.yaw), 0, Math.cos(o.yaw)];
    const up0: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    return { fwd, up: [up0[0] * Math.cos(r) - right[0] * Math.sin(r), up0[1] * Math.cos(r) - right[1] * Math.sin(r), up0[2] * Math.cos(r) - right[2] * Math.sin(r)] };
};
/** How far, in radians, the picture drawn with `o` is from the one the turn `q` draws. */
const apart = (o: Look, q: Q): number => {
    const d = drawnWith(o), f = turnBy(q, [0, 0, -1]), u = turnBy(q, [0, 1, 0]);
    return Math.max(Math.hypot(d.fwd[0] - f[0], d.fwd[1] - f[1], d.fwd[2] - f[2]), Math.hypot(d.up[0] - u[0], d.up[1] - u[1], d.up[2] - u[2]));
};
/** The orientation the navigation would hand over for a turn `q` (the angles nearest the ones on screen). */
const orientationOf = (q: Q): { yaw: number; pitch: number; roll: number } => toOrientation(new THREE.Quaternion(q[0], q[1], q[2], q[3]), host.orientation().yaw);
const lookKeys = (): Keyframe[][] => LOOK_TRACKS.map((id) => anim().sequence.tracks[id]?.keyframes ?? []);
const play = (frames: number): void => { for (let i = 0; i < frames; i++) animationEngine.tick(1 / 30); };
const sameStrings = (a: readonly string[], b: readonly string[] | undefined): boolean => !!b && a.every((c, i) => c === b[i]);
const degrees = (radians: number): string => `${(radians * 180 / Math.PI).toFixed(4)} deg`;

anim().deleteAllTracks();
anim().setDuration(2000);
flyTo(1, { yaw: -1.2, pitch: 0.3 });
setKeyframe();
flyTo(1e-10, { yaw: -1.1, pitch: 0.25 });
setKeyframe();
flyTo(1e-20, { yaw: -1.0, pitch: 0.2, roll: 0.25 });
setKeyframe();
keys = routeKeys();
check(keys.length === 3 && keys.map((k) => k.frame).join() === '0,600,1200' && anim().fps === 30, 'look: (a route of three keyframes, 30 frames a second)', `frames ${keys.map((k) => k.frame)}, fps ${anim().fps}`);
check(apart(keys[2].view, routeQ(keys[2].view)) < 1e-15 && apart({ yaw: 0.4, pitch: -1.1, roll: 2 }, routeQ({ yaw: 0.4, pitch: -1.1, roll: 2 })) < 1e-15,
    'look: (the turn put together by hand draws with the renderer\'s own forward and up)');

// No look: the route's view as it is.
check([0, 150.5, 600, 900, 1200, 1500].every((f) => JSON.stringify(routeShownAt(f)) === JSON.stringify(routeViewAt(f))), 'look: with no free look the view shown is the route\'s own, to the digit');

// A turn while the route plays: on top of it, and playback goes on.
scrubRouteTo(0);
anim().play();
play(10);
const handTurn = lookQ([0.3, -0.2, 0.15]);
let lookAtFrame = anim().currentFrame;
n = setViews().length;
lookTurned(orientationOf(mul(routeQ(host.orientation()), handTurn)));
check(setViews().length === n && anim().isPlaying && routeDrives() && lookAtFrame === 10
    && apart(host.orientation(), mul(routeQ(routeViewAt(lookAtFrame) as Look), handTurn)) < 1e-12 && sameStrings(host.getView().cam, routeViewAt(lookAtFrame)?.cam),
    'look: a turn while the route plays is shown at once, with no setView; the timeline plays on and the position is the route\'s',
    `${setViews().length - n} setView, playing ${anim().isPlaying}, drives ${routeDrives()}, ${apart(host.orientation(), mul(routeQ(routeViewAt(lookAtFrame) as Look), handTurn))} apart`);
play(200);
lookAtFrame = anim().currentFrame;
const routeThere = routeViewAt(lookAtFrame) as Look & { cam: string[] };
check(lookAtFrame === 210 && apart(routeThere, routeQ(routeViewAt(10) as Look)) > 1e-3
    && apart(host.orientation(), mul(routeQ(routeThere), handTurn)) < 1e-12 && sameStrings(host.getView().cam, routeThere.cam),
    'look: 200 frames on, the view is the route\'s rotation THERE times the same turn in the camera\'s own frame (put together by hand)',
    `frame ${lookAtFrame}, ${apart(host.orientation(), mul(routeQ(routeThere), handTurn))} apart; the other order is ${apart(host.orientation(), mul(handTurn, routeQ(routeThere)))} apart`);
n = setViews().length;
anim().pause();
check(setViews().length === n + 1 && sameCamera(host.getView(), routeViewAt(lookAtFrame) as Look & { cam: string[] }) && routeDrives() && cameraOnRoute(),
    'look: playback stops with no hand on the camera: the hand\'s turn is gone and the view is the route\'s again, to the digit, one setView',
    `${setViews().length - n} setView, drives ${routeDrives()}, on the route ${cameraOnRoute()}`);

// A fly key during playback: it stops, and the camera keeps the turn.
anim().play();
play(10);
lookTurned(orientationOf(mul(routeQ(host.orientation()), handTurn)));
const turnedOnScreen = host.getView();
n = setViews().length;
stopRoutePlayback();                             // what a held W does (DeepZoomNavigation: a move)
check(!anim().isPlaying && setViews().length === n && sameCamera(host.getView(), turnedOnScreen) && !routeDrives()
    && !sameCamera(host.getView(), routeViewAt(anim().currentFrame) as Look & { cam: string[] }),
    'look: a fly key during playback stops it and the camera keeps its turn, exactly as it was on screen; the camera is the user\'s',
    `playing ${anim().isPlaying}, ${setViews().length - n} setView, kept ${sameCamera(host.getView(), turnedOnScreen)}, drives ${routeDrives()}`);
returnToRoute();
check(sameCamera(host.getView(), routeViewAt(anim().currentFrame) as Look & { cam: string[] }), 'look: Return puts it back on the route, the turn forgotten');

// Recorded. Record on and nothing turned: nothing is written.
const routeHeld = JSON.stringify(depthKeys()), countsHeld = JSON.stringify(countKeys());
anim().toggleRecording();
check(anim().isRecording && anim().recordCamera, 'look: (Record is on, and the camera is recorded)');
scrubRouteTo(0);
let lookUndo = anim().undoStack.length;
anim().play();
play(30);
anim().pause();
const armedAfterNoTurn = anim().isRecording;
check(anim().undoStack.length === lookUndo && !lookKeyed() && lookKeys().every((k) => k.length === 0), 'look: Record on and no turn: nothing is written, and no undo step is left',
    `${anim().undoStack.length - lookUndo} steps, keys ${lookKeys().map((k) => k.length)}`);
// A pass of 300 frames, ten seconds, in the app's own order: the timeline's tick shows a frame, then
// the navigation's turns the view. The look on screen with frame n is `turnAt(n)`: a pan that runs
// past half a turn (4 radians), a tilt up and back, a roll.
const turnAt = (frame: number): V3 => { const s = Math.min(1, frame / 300), e = s * s * (3 - 2 * s); return [4 * e, 0.6 * Math.sin(Math.PI * s), -0.8 * e * e]; };
/** One frame of a pass: the timeline moves on a frame, and the hand turns the view to `look(frame)` there. */
const passFrame = (look: (frame: number) => V3): void => {
    animationEngine.tick(1 / 30);
    lookTurned(orientationOf(mul(routeQ(routeViewAt(anim().currentFrame) as Look), lookQ(look(anim().currentFrame)))));
};
scrubRouteTo(0);
lookUndo = anim().undoStack.length;
anim().play();
let denseAt150 = 0;
for (let f = 0; f < 300; f++) {
    passFrame(turnAt);
    if (anim().currentFrame === 150) denseAt150 = Math.min(...lookKeys().map((k) => k.length));
}
// At frame 150 the frames 0 (the one before the pass began) to 149 are written: a frame is sampled when the next one is shown.
check(anim().currentFrame === 300 && anim().isPlaying && denseAt150 === 150, 'look: while a pass runs every played frame is a key on each of the three tracks', `frame ${anim().currentFrame}, ${denseAt150} keys at frame 150`);
anim().pause();
check(armedAfterNoTurn && !anim().isRecording, 'look: Record stays on after a playback with no turn, and goes off when playback stops after a recorded pass (this app\'s rule, A4)',
    `on after no turn ${armedAfterNoTurn}, on after the pass ${anim().isRecording}`);
anim().toggleRecording();                                            // on again, for the passes below
const thinned = lookKeys().map((k) => k.length);
check(anim().undoStack.length === lookUndo + 1 && thinned.every((c) => c >= 2 && c < 60),
    `look: a recorded pass writes keys on the three tracks, thinned when it ends, in one undo step (${thinned.join(', ')} keys for 301 frames, ten seconds)`,
    `${anim().undoStack.length - lookUndo} steps, keys ${thinned}`);
check(JSON.stringify(depthKeys()) === routeHeld && JSON.stringify(countKeys()) === countsHeld, 'look: the route\'s own keys, their payloads and the iteration keys are untouched by it');
let worstTrack = 0;
for (let f = 0; f <= 300; f++) LOOK_TRACKS.forEach((id, j) => { worstTrack = Math.max(worstTrack, Math.abs(animationEngine.evaluateTrack(anim().sequence.tracks[id], f) - turnAt(f)[j])); });
check(worstTrack <= LOOK_FIT_TOLERANCE * 1.02 && animationEngine.evaluateTrack(anim().sequence.tracks[LOOK_TRACKS[0]], 300) > Math.PI,
    `look: the three tracks play the pass back within the fitter's tolerance, the pan running on past half a turn (worst ${degrees(worstTrack)} of ${degrees(LOOK_FIT_TOLERANCE)})`,
    `worst ${degrees(worstTrack)}`);
let worstView = 0, onPath = true;
for (const f of [0, 37, 150, 222.5, 300, 450, 600]) {
    scrubRouteTo(f);
    worstView = Math.max(worstView, apart(host.orientation(), mul(routeQ(routeViewAt(f) as Look), lookQ(turnAt(f)))));
    onPath = onPath && sameStrings(host.getView().cam, routeViewAt(f)?.cam);
}
check(worstView < 3 * LOOK_FIT_TOLERANCE && onPath && cameraOnRoute(),
    `look: a scrub shows the route with the recorded turn on top, and holds it past the pass; the position is the route's (worst ${degrees(worstView)} from the turn put together by hand)`,
    `worst ${degrees(worstView)}, on the path ${onPath}`);
anim().undo();
check(!lookKeyed() && JSON.stringify(depthKeys()) === routeHeld, 'look: that one step undone takes the whole pass away, and nothing of the route');
anim().redo();
check(lookKeys().map((k) => k.length).join() === thinned.join(), 'look: (and redone, it is back)');

// A second pass over frames 100 to 160: the keys in its span are replaced, the others stay.
const outside = (ks: Keyframe[][]): string => JSON.stringify(ks.map((k) => k.filter((key) => key.frame < 100 || key.frame > 160).map((key) => [key.frame, key.value])));
const before2 = outside(lookKeys());
scrubRouteTo(100);
anim().play();
for (let f = 100; f < 160; f++) passFrame((frame) => { const was = turnAt(frame); return [was[0] + 0.2 * Math.sin(Math.PI * (frame - 100) / 60), was[1], was[2]]; });
anim().pause();
anim().toggleRecording();                                            // (Record went off with the pass: on again, as the lines below had it)
const panAt130 = animationEngine.evaluateTrack(anim().sequence.tracks[LOOK_TRACKS[0]], 130);
check(outside(lookKeys()) === before2 && Math.abs(panAt130 - (turnAt(130)[0] + 0.2)) <= LOOK_FIT_TOLERANCE * 1.02 && JSON.stringify(depthKeys()) === routeHeld,
    'look: a second pass over part of the first replaces the keys in its span and leaves every key outside it at its frame and value',
    `outside the same ${outside(lookKeys()) === before2}, pan at 130 ${panAt130} for ${turnAt(130)[0] + 0.2}`);

// A keyframe set over a recorded look: what was on screen is what it shows.
flyTo(1e-4, { yaw: 0.7, pitch: -0.4, roll: 0.3 });  // the hands take the camera and frame something
const framed = host.getView(), lookHeld = JSON.stringify(lookKeys());
const lookThere = LOOK_TRACKS.map((id) => animationEngine.evaluateTrack(anim().sequence.tracks[id], 200));
captureCameraKeyFrame(200);                         // Key Cam, inside the recorded look
const keyed = routeKeys().find((k) => k.frame === 200);
check(JSON.stringify(lookKeys()) === lookHeld, 'look: Key Cam keys the route only: no look key is written or moved');
check(!!keyed && sameStrings(keyed.view.cam, framed.cam) && apart(keyed.view, mul(routeQ(framed), conj(lookQ(lookThere)))) < 1e-12 && apart(keyed.view, routeQ(framed)) > 0.5,
    'look: a keyframe set over a recorded look holds the rotation that, with the look on top, is the one on screen (put together by hand)',
    keyed ? `${apart(keyed.view, mul(routeQ(framed), conj(lookQ(lookThere))))} apart; from the view on screen ${apart(keyed.view, routeQ(framed))}` : 'no keyframe');
check(cameraOnRoute() && apart(host.orientation(), routeQ(framed)) < 1e-12, 'look: and the camera counts as on the route where it stands');
scrubRouteTo(0);
scrubRouteTo(200);
check(sameStrings(host.getView().cam, framed.cam) && apart(host.orientation(), routeQ(framed)) < 1e-12,
    'look: scrubbed away and back, that keyframe shows what was on screen when it was set', `${apart(host.orientation(), routeQ(framed))} apart`);

// Clear: the three tracks go, in one step, and a keyframe's frame shows its stored view again.
lookUndo = anim().undoStack.length;
clearLook();
check(!lookKeyed() && LOOK_TRACKS.every((id) => !anim().sequence.tracks[id]) && anim().undoStack.length === lookUndo + 1, 'look: Clear removes the three tracks, in one undo step',
    `${anim().undoStack.length - lookUndo} steps`);
// Tracks that hold keys and turn nothing are no look either: the stored view, not one taken through a quaternion.
useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, ...Object.fromEntries(LOOK_TRACKS.map((id) => [id, {
    id, type: 'float' as const, label: id, keyframes: [0, 1200].map((frame) => ({ id: `${id}-${frame}`, frame, value: 0, interpolation: 'Linear' as const, autoTangent: false, brokenTangents: false })),
}])) } } }));
keys = routeKeys();
let toTheDigit = lookKeyed();
for (const key of keys) { scrubRouteTo(key.frame); toTheDigit = toTheDigit && sameCamera(host.getView(), key.view); }
check(toTheDigit, 'look: with look keys that turn nothing, each keyframe\'s frame still hands the host its stored view, to the digit');
clearLook();
anim().toggleRecording();

// K in the middle of a free look (Record is off): what is on screen is keyed, the turn included.
scrubRouteTo(0);
anim().play();
play(10);
lookTurned(orientationOf(mul(routeQ(host.orientation()), handTurn)));
const seen = host.getView(), keysWere = routeKeys().length;
setKeyframe();
const added = routeKeys()[routeKeys().length - 1];
check(!anim().isPlaying && routeKeys().length === keysWere + 1 && sameCamera(added.view, seen) && sameCamera(host.getView(), seen) && !lookKeyed(),
    'look: K in the middle of a free look stops the timeline and keys what is on screen, the turn included', `playing ${anim().isPlaying}, ${routeKeys().length - keysWere} added`);
deleteKeyframe(added.id);

// Record comes on over a turn the hand already holds, the display runs at 1.5 frames a tick, and
// Record goes off again while the timeline plays. The look on screen with frame f: a pan of
// 0.3 + 0.004 a frame from frame 5 on.
const panAt = (frame: number): V3 => [0.3 + 0.004 * (frame - 5), 0, 0];
scrubRouteTo(0);
anim().play();
play(5);
lookTurned(orientationOf(mul(routeQ(host.orientation()), lookQ(panAt(5)))));
lookUndo = anim().undoStack.length;
anim().toggleRecording();
for (let i = 0; i < 40; i++) {
    animationEngine.tick(0.05);
    lookTurned(orientationOf(mul(routeQ(routeViewAt(anim().currentFrame) as Look), lookQ(panAt(anim().currentFrame)))));
}
const denseSkipped = lookKeys()[0].map((k) => k.frame);
anim().toggleRecording();
let worstSkipped = 0;
for (let f = 5; f <= 65; f++) worstSkipped = Math.max(worstSkipped, Math.abs(animationEngine.evaluateTrack(anim().sequence.tracks[LOOK_TRACKS[0]], f) - panAt(f)[0]));
check(anim().currentFrame === 65 && denseSkipped.join() === Array.from({ length: 60 }, (_, i) => i + 4).join() && worstSkipped <= LOOK_FIT_TOLERANCE * 1.02
    && animationEngine.evaluateTrack(anim().sequence.tracks[LOOK_TRACKS[0]], 4) === 0,
    'look: Record coming on over a turn already in the hand begins the pass with it, and the whole frames a slow display skips are filled in',
    `frame ${anim().currentFrame}, keys at ${denseSkipped[0]}..${denseSkipped[denseSkipped.length - 1]} (${denseSkipped.length}), worst ${degrees(worstSkipped)}`);
const afterOff = lookKeys().map((k) => k.length);
animationEngine.tick(0.05);
check(anim().isPlaying && anim().undoStack.length === lookUndo + 1 && afterOff.every((c) => c >= 2 && c < 20)
    && apart(host.orientation(), mul(routeQ(routeViewAt(anim().currentFrame) as Look), lookQ(panAt(65)))) < 3 * LOOK_FIT_TOLERANCE,
    `look: Record going off while the timeline plays ends the pass there (thinned to ${afterOff.join(', ')} keys, one undo step), and the timeline plays on with the look it recorded`,
    `playing ${anim().isPlaying}, ${anim().undoStack.length - lookUndo} steps, keys ${afterOff}`);
anim().pause();
clearLook();

// ── delete, clear, seconds (2026-10-12) ──────────────────────────────────────────────────────────
// Another scene: the solid is a ball of radius R about S, and the route goes half way round it.
// Five keyframes 2 R from its centre, an eighth of a turn apart (the third nearer, 1.3 R), set
// with K as the hands fly from one to the next: frames 0, 40, 104, 168, 208.
const R = 1e-3;
const roundAt = (turn: number, r: number): [string, string, string] => {
    const a = turn * 2 * Math.PI, p: V3 = [r * Math.cos(a), 0, r * Math.sin(a)];
    return [0, 1, 2].map((j) => String(S[j] + BigInt(Math.round(p[j] * 2 ** 256)))) as [string, string, string];
};
function flyRound(turn: number, r: number, iters: number): void {
    const was = fromS(view.cam), cam = roundAt(turn, r), now = fromS(cam);
    view = { ...view, cam, yaw: Math.atan2(-now[2], -now[0]), pitch: 0, iters };
    delete view.roll;
    depthHere = r - R;                              // what is looked at: the ball's surface
    noteMove(now[0] - was[0], now[1] - was[1], now[2] - was[2]);
}
function keyRound(): void {
    anim().deleteAllTracks();
    useAnimationStore.setState({ undoStack: [], redoStack: [] });   // the stack holds 50 steps and no more: counted from empty here

    host.setView({ ...host.getView(), cam: roundAt(0, 2 * R), yaw: Math.PI, pitch: 0, roll: 0, iters: 40 });   // a jump to the start
    depthHere = R;
    ([[0, 2, 40], [0.125, 2, 44], [0.25, 1.3, 52], [0.375, 2, 46], [0.5, 2, 41]] as const).forEach(([turn, r, iters], i) => { if (i > 0) flyRound(turn, r * R, iters); setKeyframe(); });
}
/** Everything that plays: the view at every half frame, the depth curve, the count, and the depth keys as the track holds them (ids apart). */
function played(): string {
    const ks = routeKeys(), d = anim().sequence.tracks[ROUTE_TRACK], c = anim().sequence.tracks[ROUTE_ITERATIONS_TRACK], out: unknown[] = [];
    for (let f = ks[0].frame; f <= ks[ks.length - 1].frame; f += 0.5) out.push([routeViewAt(f), animationEngine.evaluateTrack(d, f), animationEngine.evaluateTrack(c, f)]);
    return JSON.stringify([out, depthKeys().map((k) => [k.frame, k.value, k.interpolation, k.autoTangent, k.leftTangent, k.rightTangent, k.payload]), countKeys().map((k) => [k.frame, k.value])]);
}
/** The same keyframes written FRESH: an empty timeline, each key through the store as a K writes it, in time order. */
function freshRoute(depth: Keyframe[], counts: Keyframe[]): string {
    anim().deleteAllTracks();
    useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks,
        [ROUTE_TRACK]: { id: ROUTE_TRACK, type: 'float' as const, label: 'Depth', keyframes: [] }, [ROUTE_ITERATIONS_TRACK]: { id: ROUTE_ITERATIONS_TRACK, type: 'float' as const, label: 'Iterations', keyframes: [] } } } }));
    for (const k of depth) { anim().addKeyframe(ROUTE_TRACK, k.frame, k.value, 'Bezier', k.payload); anim().addKeyframe(ROUTE_ITERATIONS_TRACK, k.frame, counts.find((c) => c.frame === k.frame)?.value ?? 0, 'Linear'); }
    return played();
}
/** How many half frames of two `played()` routes show another view, depth or count. */
const halfFramesApart = (a: string, b: string): string => {
    const x = (JSON.parse(a) as [unknown[]])[0], y = (JSON.parse(b) as [unknown[]])[0];
    return `${x.filter((v, i) => JSON.stringify(v) !== JSON.stringify(y[i])).length} of ${x.length} half frames differ`;
};
ball = { centre: [S[0], S[1], S[2]], radius: R };
anim().setDuration(300);
keyRound();
const roundFrames = routeKeys().map((k) => k.frame), roundDepth = depthKeys().map((k) => ({ ...k })), roundCounts = countKeys().map((k) => ({ ...k }));
check(roundFrames.join() === '0,40,104,168,208' && [1, 2, 3, 4].every((i) => !legInSolid(i)), 'delete: (five keyframes half way round a ball, frames 0, 40, 104, 168, 208; no leg passes through it)', `frames ${roundFrames}`);

// A keyframe deleted in the Route tab, one row's trash button after another, against a fresh route of the keyframes left.
for (const [name, out] of [['the third', [2]], ['the middle three', [1, 2, 3]], ['the second and the fourth', [1, 3]]] as [string, number[]][]) {
    keyRound();
    const ids = routeKeys().map((k) => k.id);
    for (const i of out) deleteKeyframe(ids[i]);
    const byTab = played(), left = roundDepth.filter((_, i) => !out.includes(i)), want = freshRoute(left, roundCounts);
    check(byTab === want, `delete: ${name} deleted in the Route tab: the route is the one a fresh route of the keyframes left would be - views, depth curve, counts and handles, to the digit`, halfFramesApart(byTab, want));
    // The same keys selected on the timeline's Depth track, and its own Delete.
    keyRound();
    const whole = JSON.stringify(anim().sequence), ids2 = depthKeys().map((k) => k.id), stepsAt = anim().undoStack.length;
    anim().selectKeyframes(out.map((i) => `${ROUTE_TRACK}::${ids2[i]}`), false);
    anim().deleteSelectedKeyframes();
    const byTimeline = played();
    check(byTimeline === want && anim().undoStack.length === stepsAt + 1, `delete: ${name} deleted ON THE TIMELINE: the same route again (its neighbours' handles are worked out again, its iteration key goes), still one undo step`,
        `${halfFramesApart(byTimeline, want)}, ${anim().undoStack.length - stepsAt} steps`);
    anim().undo();
    check(JSON.stringify(anim().sequence) === whole, `delete: (and that step undone brings ${name} back as it was)`);
}

// The rows selected, and deleted together.
keyRound();
{
    const whole = JSON.stringify(anim().sequence), ids = routeKeys().map((k) => k.id), stepsAt = anim().undoStack.length;
    const went = deleteKeyframes([ids[3], ids[1], ids[2], 'no such keyframe']);
    const together = played();
    check(went === 3 && routeKeys().map((k) => k.id).join() === [ids[0], ids[4]].join() && countKeys().map((k) => k.frame).join() === '0,208' && anim().undoStack.length === stepsAt + 1,
        'delete: three keyframes deleted together are ONE undo step, their iteration keys with them', `${went} went, ${routeKeys().length} left, counts at ${countKeys().map((k) => k.frame)}, ${anim().undoStack.length - stepsAt} steps`);
    check(routeKeys().map((k) => k.frame).join() === '0,208' && legInSolid(1), 'delete: the keyframes that stay keep their times - one leg of 208 frames - and that leg now passes through the ball, which the solid check finds',
        `frames ${routeKeys().map((k) => k.frame)}, through ${legInSolid(1)}`);
    const auto = legFrames(routeKeys()[0], routeKeys()[1], 30);
    console.log(`     (that leg: 208 frames where K would time it ${auto}; the pace along it ${[0.1, 0.5, 0.9].map((u) => routePaceAt(208 * u, 30).toFixed(2)).join(', ')} decades a second)`);
    anim().undo();
    check(JSON.stringify(anim().sequence) === whole && routeKeys().length === 5, 'delete: and that one step undone brings all three back');
    const want = freshRoute([roundDepth[0], roundDepth[4]], roundCounts);
    check(together === want, 'delete: deleted together they leave the route a fresh one of the two keyframes left would be, to the digit', halfFramesApart(together, want));
}

// Clear route.
keyRound();
{
    const stepsAt = anim().undoStack.length;
    scrubRouteTo(104);                               // the route drives the camera
    const stood = host.getView();
    calls.length = 0;
    clearRoute();
    check(routeKeys().length === 0 && Object.keys(anim().sequence.tracks).length === 0 && anim().undoStack.length === stepsAt + 1 && anim().currentFrame === 0,
        'clear: Clear route takes every keyframe and its iteration key in ONE undo step, and the playhead is back at frame 0',
        `${routeKeys().length} keyframes, tracks ${Object.keys(anim().sequence.tracks)}, ${anim().undoStack.length - stepsAt} steps, frame ${anim().currentFrame}`);
    check(setViews().length === 0 && sameCamera(host.getView(), stood) && !routeDrives() && calls.some((c) => c.name === 'setParams' && c.patch['dzFormula.autoIterations'] === true),
        'clear: the camera stays where it is and is the user\'s: no view is set, and the renderer\'s own iteration rule is back', `${setViews().length} setView, drives ${routeDrives()}`);
    anim().undo();
    check(routeKeys().length === 5 && routeKeys().map((k) => k.frame).join() === roundFrames.join() && countKeys().length === 5, 'clear: that one step undone brings the whole route back');
    // With a recorded free look, and a count keyed by hand on no keyframe's frame.
    useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, ...Object.fromEntries(LOOK_TRACKS.map((id) => [id, {
        id, type: 'float' as const, label: id, keyframes: [0, 208].map((frame) => ({ id: `${id}-${frame}`, frame, value: 0.1, interpolation: 'Linear' as const, autoTangent: false, brokenTangents: false })),
    }])) } } }));
    anim().addKeyframe(ROUTE_ITERATIONS_TRACK, 20, 43, 'Linear');
    const whole = JSON.stringify(anim().sequence), stepsThen = anim().undoStack.length;
    clearRoute();
    check(routeKeys().length === 0 && !lookKeyed() && LOOK_TRACKS.every((id) => !anim().sequence.tracks[id]) && countKeys().map((k) => `${k.frame}:${k.value}`).join() === '20:43' && anim().undoStack.length === stepsThen + 1,
        'clear: a recorded free look goes with the route, in the same step; a count keyed on no keyframe\'s frame stays', `look ${lookKeyed()}, counts ${countKeys().map((k) => k.frame)}, ${anim().undoStack.length - stepsThen} steps`);
    clearRoute();
    check(anim().undoStack.length === stepsThen + 1, 'clear: with no keyframe it does nothing, and leaves no step');
    anim().undo();
    check(JSON.stringify(anim().sequence) === whole, 'clear: and one undo brings keyframes, counts and the free look back, as they were');
}

// The seconds field: the length of the leg that arrives at a keyframe.
keyRound();
{
    anim().setDuration(250);
    const ids = routeKeys().map((k) => k.id), views = JSON.stringify(routeKeys().map((k) => [k.depth, k.view, k.heading])), counts = countKeys().map((k) => k.value).join(), stepsAt = anim().undoStack.length;
    setLegSeconds(ids[2], 5);                        // the leg 2 -> 3 was 64 frames; five seconds are 150
    const now = routeKeys().map((k) => k.frame);
    check(now.join() === '0,40,190,254,294' && anim().undoStack.length === stepsAt + 1,
        'seconds: a leg given five seconds: its keyframe and every later one move by the same 86 frames, the earlier ones stay, in one undo step', `frames ${now}, ${anim().undoStack.length - stepsAt} steps`);
    check(JSON.stringify(routeKeys().map((k) => [k.depth, k.view, k.heading])) === views && routeKeys().map((k) => k.id).join() === ids.join()
        && countKeys().map((k) => k.frame).join() === now.join() && countKeys().map((k) => k.value).join() === counts && anim().durationFrames === 294,
        'seconds: only time changes: the same keyframes, views, depths and counts, each iteration key on its keyframe, and the timeline grows to hold the route', `counts at ${countKeys().map((k) => k.frame)}, length ${anim().durationFrames}`);
    setLegSeconds(ids[2], 5);
    setLegSeconds(ids[0], 3);
    setLegSeconds(ids[1], Number.NaN);
    check(anim().undoStack.length === stepsAt + 1 && routeKeys().map((k) => k.frame).join() === now.join(), 'seconds: the same length again, the first keyframe (no leg arrives at it) and no number at all change nothing and leave no step');
    setLegSeconds(ids[4], 0);
    check(routeKeys().map((k) => k.frame).join() === '0,40,190,254,255', 'seconds: the least is one frame', `frames ${routeKeys().map((k) => k.frame)}`);
    anim().undo();
    anim().undo();
    check(routeKeys().map((k) => k.frame).join() === roundFrames.join() && countKeys().map((k) => k.frame).join() === roundFrames.join(), 'seconds: two undos put every keyframe and count back where it was');
    // While a route renders, none of the three changes it.
    const held = JSON.stringify(anim().sequence), heldSteps = anim().undoStack.length;
    setRouteRendering(true);
    deleteKeyframes([ids[1], ids[2]]);
    setLegSeconds(ids[2], 9);
    clearRoute();
    setRouteRendering(false);
    check(JSON.stringify(anim().sequence) === held && anim().undoStack.length === heldSteps, 'render: while the route is rendered a delete of several, a typed leg and Clear route change nothing and leave no step');
}
ball = null;

// ── reverse (2026-10-16, stage Z1 of plans/deep-zoom-shell/ZOOM-OUTS.md) ─────────────────────────
// Five keyframes set with K, on the line and off it, legs of uneven length, turning and rolling;
// the first has no heading (it was set right after a jump). One depth key's handles are shaped by
// hand, the fourth depth key is Linear (the leg after it runs straight in log) and so is the last
// (whose interpolation leads nowhere). The iteration keys are the ones K writes. A recorded free
// look: pan and roll Linear keys, tilt Bezier keys with shaped handles, all inside the route's span.
{
    const off = (depth: number, side: V3): [string, string, string] =>
        [0, 1, 2].map((j) => String(S[j] + BigInt(Math.round(depth * (BACK[j] + side[j]) * 2 ** 256)))) as [string, string, string];
    /** The hands fly to `cam`, `depth` from what is looked at there, looking as given: a move told to the route, the way it went. */
    const flyThere = (cam: [string, string, string], depth: number, look: Look): void => {
        const was = fromS(view.cam), now = fromS(cam);
        view = { ...view, cam, yaw: look.yaw, pitch: look.pitch, iters: countFor(depth) };
        if (look.roll) view.roll = look.roll; else delete view.roll;
        depthHere = depth;
        noteMove(now[0] - was[0], now[1] - was[1], now[2] - was[2]);
    };
    anim().deleteAllTracks();
    useAnimationStore.setState({ undoStack: [], redoStack: [] });
    anim().setDuration(300);
    host.setView({ ...host.getView(), cam: at(1), yaw: -1.2, pitch: 0.3, roll: 0, iters: countFor(1) });   // a jump to the start
    depthHere = 1;
    setKeyframe();
    flyThere(off(1e-3, [0.4, -0.3, 0.2]), 1e-3, { yaw: -1.1, pitch: 0.25 });
    setKeyframe();
    flyThere(off(1e-6, [-0.5, 0.2, 0.3]), 1e-6, { yaw: -0.9, pitch: 0.1, roll: 0.2 });
    setKeyframe();
    flyThere(off(1e-12, [0.1, 0.6, -0.4]), 1e-12, { yaw: -1.3, pitch: 0.35, roll: -0.1 });
    setKeyframe();
    flyThere(at(1e-20), 1e-20, { yaw: -1.0, pitch: 0.2, roll: 0.25 });
    setKeyframe();
    const ks = depthKeys();
    anim().updateKeyframes([
        { trackId: ROUTE_TRACK, keyId: ks[2].id, patch: { autoTangent: false, leftTangent: { x: -0.45 * (ks[2].frame - ks[1].frame), y: 1.2 }, rightTangent: { x: 0.2 * (ks[3].frame - ks[2].frame), y: -2.5 } } },
        { trackId: ROUTE_TRACK, keyId: ks[3].id, patch: { interpolation: 'Linear' } },
        { trackId: ROUTE_TRACK, keyId: ks[4].id, patch: { interpolation: 'Linear' } },     // leads nowhere: it is the one a reverse hands round to the end
    ]);
    const was = routeKeys().map((k) => ({ ...k })), first = was[0].frame, last = was[4].frame, F = first + last;
    check(was.length === 5 && !was[0].heading && was.slice(1).every((k) => !!k.heading) && !depthKeys()[2].autoTangent && depthKeys()[3].interpolation === 'Linear'
        && depthKeys()[4].interpolation === 'Linear' && countKeys().length === 5,
        `reverse: (five keyframes at frames ${was.map((k) => k.frame).join(', ')}, the first with no heading; shaped handles, two Linear keys, five counts)`);
    // On a keyframe, the route driving the camera, no free look yet.
    scrubRouteTo(was[3].frame);
    let n = setViews().length;
    reverseRoute();
    check(anim().currentFrame === F - was[3].frame && setViews().length === n && sameCamera(host.getView(), was[3].view) && routeDrives() && cameraOnRoute(),
        'reverse: the playhead goes to the mirrored frame; standing on a keyframe, the camera shows the very view it did and nothing is set',
        `frame ${anim().currentFrame}, ${setViews().length - n} setView, drives ${routeDrives()}`);
    anim().undo();
    const linear =(id: string, frame: number, value: number): Keyframe => ({ id: `${id}-${frame}`, frame, value, interpolation: 'Linear', autoTangent: false, brokenTangents: false });
    const bent = (id: string, frame: number, value: number, l: number, r: number): Keyframe =>
        ({ id: `${id}-${frame}`, frame, value, interpolation: 'Bezier', autoTangent: false, brokenTangents: true, leftTangent: { x: -0.3 * l, y: 0.1 }, rightTangent: { x: 0.25 * r, y: -0.05 } });
    const part = (u: number): number => Math.round(first + (last - first) * u);
    const lookTracks: Keyframe[][] = [
        [linear('pan', part(0), 0), linear('pan', part(0.3), 0.4), linear('pan', part(0.7), -0.3), linear('pan', part(1), 0.1)],
        [bent('tilt', part(0.1), 0.05, part(0.1) - first, part(0.5) - part(0.1)), bent('tilt', part(0.5), 0.25, part(0.5) - part(0.1), part(0.9) - part(0.5)), bent('tilt', part(0.9), -0.1, part(0.9) - part(0.5), last - part(0.9))],
        [linear('roll', part(0.2), 0), linear('roll', part(0.6), 0.3)],
    ];
    useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, ...Object.fromEntries(LOOK_TRACKS.map((id, j) => [id, { id, type: 'float' as const, label: id, keyframes: lookTracks[j] }])) } } }));
    useAnimationStore.setState({ undoStack: [], redoStack: [] });
    check(lookKeyed() && LOOK_TRACKS.every((id, j) => anim().sequence.tracks[id].keyframes.length === lookTracks[j].length), 'reverse: (and now a recorded look)');

    // What plays before: the view, the depth curve, the count and the look, at every 3.5 frames of the span and at each keyframe.
    const frames = [...Array.from({ length: Math.floor((last - first) / 3.5) + 1 }, (_, i) => first + 3.5 * i), ...was.map((k) => k.frame)];
    const playing = (frame: number) => {
        const tracks = anim().sequence.tracks;
        return { view: routeViewAt(frame) as Look & { cam: [string, string, string] }, depth: animationEngine.evaluateTrack(tracks[ROUTE_TRACK], frame),
            count: animationEngine.evaluateTrack(tracks[ROUTE_ITERATIONS_TRACK], frame), look: LOOK_TRACKS.map((id) => animationEngine.evaluateTrack(tracks[id], frame)) };
    };
    const before = frames.map(playing), whole = JSON.stringify(anim().sequence);

    // On a keyframe again, now under the recorded look.
    scrubRouteTo(was[3].frame);
    const shown = host.getView();
    n = setViews().length;
    reverseRoute();
    const now = routeKeys(), once = JSON.stringify(anim().sequence);
    const negated = (a: V3 | undefined, b: V3 | undefined): boolean => (!a ? !b : !!b && b.every((v, j) => v === -a[j]));
    check(anim().undoStack.length === 1 && now.length === 5 && now.every((k, j) => {
        const old = was[4 - j];
        return k.id === old.id && k.frame === F - old.frame && k.depth === old.depth && JSON.stringify(k.view) === JSON.stringify(old.view) && negated(old.heading, k.heading);
    }), 'reverse: ONE undo step; the keyframes the other way round, frame f at first + last - f, each with its id and its view to the digit, every heading negated (and none where there was none)',
    `${anim().undoStack.length} steps, frames ${now.map((k) => k.frame)}, ids ${now.map((k) => was.findIndex((o) => o.id === k.id))}`);
    check(anim().currentFrame === F - was[3].frame && setViews().length <= n + 1 && sameStrings(host.getView().cam, shown.cam) && apart(host.orientation(), routeQ(shown)) < 1e-12 && routeDrives() && cameraOnRoute(),
        `reverse: under a recorded look too: on the keyframe's own place, turned as it was (within ${apart(host.orientation(), routeQ(shown)).toExponential(1)} rad: the look is read at the mirrored frame)`,
        `frame ${anim().currentFrame}, ${setViews().length - n} setView, drives ${routeDrives()}`);
    let worstAt = 0, worstTurn = 0, worstDepth = 0, worstCount = 0, worstLook = 0, keyed = true, counted = true;
    frames.forEach((f, i) => {
        const a = before[i], b = playing(F - f);
        const gap = [0, 1, 2].map((j) => Number(BigInt(b.view.cam[j]) - BigInt(a.view.cam[j])) / ROUTE_UNIT);
        worstAt = Math.max(worstAt, Math.hypot(gap[0], gap[1], gap[2]) / a.depth);
        worstTurn = Math.max(worstTurn, apart(b.view, routeQ(a.view)));
        worstDepth = Math.max(worstDepth, Math.abs(Math.log10(b.depth / a.depth)));
        worstCount = Math.max(worstCount, Math.abs(b.count - a.count));
        counted = counted && Math.trunc(b.count) === Math.trunc(a.count);
        worstLook = Math.max(worstLook, ...a.look.map((v, j) => Math.abs(b.look[j] - v)));
        if (i >= frames.length - was.length) keyed = keyed && JSON.stringify(b.view) === JSON.stringify(a.view);
    });
    check(keyed && worstAt < 1e-9, `reverse: at every mirrored frame the camera is where it was: at the keyframes to the digit, between them within ${worstAt.toExponential(1)} of the depth there (${frames.length} frames)`,
        `keyframes ${keyed}, worst ${worstAt}`);
    check(worstTurn < 2e-3, `reverse: and it looks the way it did, within ${worstTurn.toExponential(1)} rad (the orientation curve is not quite the same played backwards: it turns about the keyframes' own frames)`, `worst ${worstTurn}`);
    check(worstDepth < 1e-9, `reverse: the depth curve at mirrored frames is the one before, the shaped handles mirrored and the Linear leg Linear still (within ${worstDepth.toExponential(1)} decades)`, `worst ${worstDepth}`);
    check(counted && worstCount < 1e-9, `reverse: the iteration count at mirrored frames is the one before (within ${worstCount.toExponential(1)})`, `worst ${worstCount}, whole counts the same ${counted}`);
    check(worstLook < 1e-9, `reverse: the recorded look at mirrored frames is the one before, its values as they were (within ${worstLook.toExponential(1)} rad)`, `worst ${worstLook}`);

    reverseRoute();
    check(JSON.stringify(anim().sequence) === whole && anim().undoStack.length === 2 && anim().currentFrame === was[3].frame,
        'reverse: reversed twice is the route to the digit: keys, ids, frames, handles, interpolations, payloads, counts and the look, in a second undo step',
        `same ${JSON.stringify(anim().sequence) === whole}, ${anim().undoStack.length} steps, frame ${anim().currentFrame}`);
    anim().undo();
    const undoneOnce = JSON.stringify(anim().sequence);
    anim().undo();
    check(undoneOnce === once && JSON.stringify(anim().sequence) === whole, 'reverse: each step undone brings back the route it replaced');

    // Between two keyframes: the camera follows to the mirrored frame, the same place.
    const between = was[1].frame + 0.4 * (was[2].frame - was[1].frame);
    scrubRouteTo(between);
    const stood = host.getView(), depthThere = animationEngine.evaluateTrack(anim().sequence.tracks[ROUTE_TRACK], between);
    n = setViews().length;
    reverseRoute();
    const moved = [0, 1, 2].map((j) => Number(BigInt(host.getView().cam[j]) - BigInt(stood.cam[j])) / ROUTE_UNIT), movedBy = Math.hypot(moved[0], moved[1], moved[2]) / depthThere;
    check(anim().currentFrame === F - between && setViews().length <= n + 1 && movedBy < 1e-9 && apart(host.orientation(), routeQ(stood)) < 2e-3 && cameraOnRoute(),
        `reverse: between two keyframes the camera is put on the mirrored frame: the same place (${movedBy.toExponential(1)} of the depth), turned by ${apart(host.orientation(), routeQ(stood)).toExponential(1)} rad`,
        `frame ${anim().currentFrame}, ${setViews().length - n} setView`);
    anim().undo();

    // The user holds the camera: it stays, and so does a scrub of the same frame after it.
    flyThere(off(1e-7, [0.2, 0.2, 0.2]), 1e-7, { yaw: 0.4, pitch: -0.1 });
    const theirs = host.getView(), playhead = anim().currentFrame;
    n = setViews().length;
    reverseRoute();
    scrub(anim().currentFrame);
    check(anim().currentFrame === F - Math.min(last, Math.max(first, playhead)) && setViews().length === n && sameCamera(host.getView(), theirs) && !routeDrives(),
        'reverse: a camera the user holds stays where it is, also when the timeline scrubs the same frame after the edit', `${setViews().length - n} setView, drives ${routeDrives()}`);
    anim().undo();

    // Outside the span: a look key is dropped, an iteration key stays.
    anim().setDuration(last + 400);
    anim().addKeyframe(LOOK_TRACKS[0], last + 300, 0.9, 'Linear');
    anim().addKeyframe(ROUTE_ITERATIONS_TRACK, last + 300, 77, 'Linear');
    const outside = countKeys().find((c) => c.frame === last + 300);
    reverseRoute();
    const pan = anim().sequence.tracks[LOOK_TRACKS[0]].keyframes;
    check(pan.length === 4 && pan.every((k) => k.frame >= first && k.frame <= last) && countKeys().find((c) => c.frame === last + 300) === outside && countKeys().length === 6,
        'reverse: a look key past the end of the route is dropped (the look in the span is mirrored); an iteration key past it stays as it was',
        `pan at ${pan.map((k) => k.frame)}, counts at ${countKeys().map((k) => k.frame)}`);
    anim().undo();

    // While the route renders, and with one keyframe: nothing.
    const held = JSON.stringify(anim().sequence), heldSteps = anim().undoStack.length;
    setRouteRendering(true);
    reverseRoute();
    setRouteRendering(false);
    const rendered = JSON.stringify(anim().sequence) === held && anim().undoStack.length === heldSteps;
    deleteKeyframes(routeKeys().slice(1).map((k) => k.id));
    const oneKey = JSON.stringify(anim().sequence);
    reverseRoute();
    check(rendered && JSON.stringify(anim().sequence) === oneKey && anim().undoStack.length === heldSteps + 1,
        'reverse: while the route is rendered, and with one keyframe, it changes nothing and leaves no step', `rendered ${rendered}, ${anim().undoStack.length - heldSteps} steps`);
    anim().undo();
}

// ── engine (2026-10-16, stage S1 of plans/deep-zoom-shell/SMOOTHING.md) ──────────────────────────
// The engine finds a track's key by a binary search now (`evaluateCurveInternal`). Against the scan it
// replaced, written out here as it was: the FIRST pair of keys about the frame.
{
    let seed = 20261016;
    const rand = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    const scanned = (track: Track, frame: number): number => {
        const ks = track.keyframes;
        if (ks.length === 0) return 0;
        const isRotation = track.id.startsWith('camera.rotation') || track.id.includes('rot') || track.id.includes('phase') || track.id.includes('twist');
        const isLog = isLogTrack(track.id), last = ks[ks.length - 1];
        if (frame > last.frame) return last.value;                        // Hold
        if (frame < ks[0].frame) return ks[0].value;
        for (let i = 0; i < ks.length - 1; i++) if (frame >= ks[i].frame && frame <= ks[i + 1].frame) return AnimationMath.interpolate(frame, ks[i], ks[i + 1], isRotation, isLog);
        return last.value;
    };
    const made = (id: string, n: number, log: boolean): Track => {
        const keys: Keyframe[] = [];
        let frame = rand() * 10;
        for (let i = 0; i < n; i++) {
            frame += rand() < 0.15 ? 0 : rand() < 0.5 ? Math.ceil(rand() * 20) : rand() * 20;   // keys that share a frame, whole and fractional frames
            const kind = rand(), value = log ? 10 ** (-rand() * 30) : (rand() - 0.5) * 7;
            keys.push({ id: `${id}-${i}`, frame, value, interpolation: kind < 0.6 ? 'Bezier' : kind < 0.85 ? 'Linear' : 'Step', autoTangent: false, brokenTangents: true,
                leftTangent: { x: -rand() * 6, y: (rand() - 0.5) * 3 }, rightTangent: { x: rand() * 6, y: (rand() - 0.5) * 3 } });
        }
        return { id, type: 'float', label: id, keyframes: keys } as Track;
    };
    const tracks = [made(ROUTE_TRACK, 300, true), made('dzFormula.power', 300, false), made('demo.rotY', 200, false), made(ROUTE_TRACK, 2, true), made('dzFormula.power', 1, false)];
    const shuffled = made('dzFormula.power', 60, false);
    shuffled.keyframes = shuffled.keyframes.map((k) => ({ k, r: rand() })).sort((x, y) => x.r - y.r).map((x) => x.k);   // out of order: scanned, as before
    tracks.push(shuffled);
    let evaluated = 0, differ = 0, worst = '';
    for (const t of tracks) {
        const ks = t.keyframes, lo = Math.min(...ks.map((k) => k.frame)), hi = Math.max(...ks.map((k) => k.frame));
        const frames = [...ks.map((k) => k.frame), ...ks.map((k) => k.frame + 0.5), lo - 1, hi + 1, -0, NaN, ...Array.from({ length: 400 }, () => lo + (hi - lo) * rand())];
        for (const f of frames) {
            evaluated++;
            const a = animationEngine.evaluateTrack(t, f), b = scanned(t, f);
            if (!Object.is(a, b)) { differ++; worst ||= `${t.id} at ${f}: ${a} against ${b}`; }
        }
    }
    // What it costs: a clock of 2,033 keys (as the study's scenes held the owner's route), a quarter frame at a time.
    const clockKeys: Keyframe[] = Array.from({ length: 2033 }, (_, i) => ({ id: `c${i}`, frame: i * 3, value: 10 ** (-i * 78 / 2033), interpolation: 'Bezier', autoTangent: true, brokenTangents: false }));
    clockKeys.forEach((k, i) => { const { l, r } = AnimationMath.calculateTangents(k, clockKeys[i - 1], clockKeys[i + 1], 'Auto', true); k.leftTangent = l; k.rightTangent = r; });
    const clock = { id: ROUTE_TRACK, type: 'float', label: 'clock', keyframes: clockKeys } as Track, count = 4 * 6096;
    const searched = new Float64Array(count), scans = new Float64Array(count);
    let t0 = performance.now();
    for (let i = 0; i < count; i++) searched[i] = animationEngine.evaluateTrack(clock, i / 4);
    const searchMs = performance.now() - t0;
    t0 = performance.now();
    for (let i = 0; i < count; i++) scans[i] = scanned(clock, i / 4);
    const scanMs = performance.now() - t0;
    for (let i = 0; i < count; i++) { evaluated++; if (!Object.is(searched[i], scans[i])) { differ++; worst ||= `the clock at ${i / 4}`; } }
    check(differ === 0,
        `engine: the key lookup is a binary search: the same values to the bit as the scan from the start it replaced (${evaluated} frames on ${tracks.length + 1} tracks - exponential, plain, an angle; keys sharing a frame; on a key, between, outside, NaN; keys out of order scanned as before); a clock of 2,033 keys a quarter frame at a time: ${searchMs.toFixed(0)} ms, the scan ${scanMs.toFixed(0)} ms`,
        `${differ} differ: ${worst}`);
}

// ── pace (2026-10-16, stage S1 of plans/deep-zoom-shell/SMOOTHING.md) ────────────────────────────
// The Pace track: the path's clock is the depth track times it. A straight dive of four keyframes set with K.
const paceTrack = (keyframes: Keyframe[]): void => useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [ROUTE_PACE_TRACK]: { id: ROUTE_PACE_TRACK, type: 'float' as const, label: 'Pace', keyframes } } } }));
const paceKeys = (): Keyframe[] => anim().sequence.tracks[ROUTE_PACE_TRACK]?.keyframes ?? [];
const plain = (id: string, frame: number, value: number): Keyframe => ({ id, frame, value, interpolation: 'Linear', autoTangent: false, brokenTangents: false });
/** The camera's place at every half frame of `[from, to]`, as strings. */
const places = (from: number, to: number): string[] => { const out: string[] = []; for (let f = from; f <= to; f += 0.5) out.push((routeViewAt(f) as { cam: string[] }).cam.join()); return out; };
{
    anim().deleteAllTracks();
    useAnimationStore.setState({ undoStack: [], redoStack: [] });
    anim().setDuration(300);
    host.setView({ ...host.getView(), cam: at(1), yaw: -1.2, pitch: 0.3, roll: 0, iters: countFor(1) });
    depthHere = 1;
    setKeyframe();
    for (const [depth, yaw] of [[1e-4, -1.15], [1e-9, -1.1], [1e-12, -1.05]]) { flyTo(depth, { yaw, pitch: 0.25 }); setKeyframe(); }
    const ks = routeKeys(), was = places(0, 720);
    check(ks.map((k) => k.frame).join() === '0,240,540,720' && isLogTrack(ROUTE_PACE_TRACK), `pace: (four keyframes at frames ${ks.map((k) => k.frame).join(', ')}; the Pace track is a log track)`);
    paceTrack([]);
    const empty = places(0, 720);
    paceTrack([plain('one-a', 0, 1), plain('one-b', 333, 1), plain('one-c', 720, 1)]);
    check(empty.every((p, i) => p === was[i]) && places(0, 720).every((p, i) => p === was[i]),
        'pace: with no Pace track, an empty one, or one at x1 throughout, the camera at every half frame is where it was, to the digit');
    // A pace of x3 in the middle of the first leg and of x0.5 in the last.
    const keyed = [plain('p0', 0, 1), plain('p1', 120, 3), plain('p2', 240, 1), plain('p3', 241, 1), plain('p4', 540, 1), plain('p5', 630, 0.5), plain('p6', 720, 1)];
    paceTrack(keyed);
    const depth = anim().sequence.tracks[ROUTE_TRACK], pace = anim().sequence.tracks[ROUTE_PACE_TRACK];
    const engine = buildZoomPath(ks.map((k) => ({ time: k.frame, scale: k.depth * animationEngine.evaluateTrack(pace, k.frame), position: [BigInt(k.view.cam[0]), BigInt(k.view.cam[1]), BigInt(k.view.cam[2])] as const, heading: k.heading })),
        { unit: ROUTE_UNIT, scaleAt: (f) => animationEngine.evaluateTrack(depth, f) * animationEngine.evaluateTrack(pace, f) });
    let same = 0, all = 0, moved = 0;
    for (let f = 0.5; f < 720; f += 0.5) {
        if (ks.some((k) => k.frame === f)) continue;
        all++;
        const p = zoomPathPosition(engine, f), got = (routeViewAt(f) as { cam: string[] }).cam;
        if (got.every((c, j) => c === String(p[j]))) same++;
        moved = Math.max(moved, Math.abs(Math.log(Math.hypot(...fromS(got)) / Math.hypot(...fromS(was[2 * f].split(','))))));
    }
    check(same === all && moved > 0.05, `pace: the path's scale is the depth track times the Pace track: at every half frame the camera is the engine's own path with that scale, to the digit (${all} half frames; a pace of x3 and of x0.5 moves the camera by up to ${(Math.exp(moved) - 1).toFixed(2)} of its distance)`,
        `${same} of ${all} the same`);

    // A typed leg, then Even: the pace keys go with the keyframes, in proportion and not rounded.
    setLegSeconds(ks[2].id, 5);
    const typed = paceKeys().map((k) => k.frame).join();
    check(typed === '0,120,240,240.5,390,480,570', 'pace: a typed leg takes the pace keys with the keyframes: those of its leg in proportion (not rounded: a clock\'s keys would meet), those after it by its frames',
        typed);
    retimeRoute(false);
    check(paceKeys().map((k) => k.frame).join() === keyed.map((k) => k.frame).join() && routeKeys().map((k) => k.frame).join() === '0,240,540,720',
        'pace: and Even takes them back with the keyframes, to where they were', paceKeys().map((k) => k.frame).join());
    anim().undo();
    anim().undo();
    // Reverse: the Pace track mirrored, the camera where it was at every mirrored frame.
    const before = Array.from({ length: 1441 }, (_, i) => routeViewAt(i / 2) as { cam: string[] });
    reverseRoute();
    let worstAt = 0;
    before.forEach((v, i) => {
        const b = routeViewAt(720 - i / 2) as { cam: string[] }, gap = [0, 1, 2].map((j) => Number(BigInt(b.cam[j]) - BigInt(v.cam[j])) / ROUTE_UNIT);
        worstAt = Math.max(worstAt, Math.hypot(gap[0], gap[1], gap[2]) / Math.hypot(...fromS(v.cam)));
    });
    check(paceKeys().map((k) => k.frame).join() === keyed.map((k) => 720 - k.frame).reverse().join() && worstAt < 1e-9,
        `pace: Reverse mirrors the Pace track: at every mirrored half frame the camera is where it was, within ${worstAt.toExponential(1)} of its distance`, `pace at ${paceKeys().map((k) => k.frame)}; worst ${worstAt}`);
    anim().undo();
    // A keyframe dragged on the timeline (which takes its own step first): its two legs' pace keys go with it, in proportion; the others stay.
    anim().snapshot();
    anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: ks[2].id, patch: { frame: 500 } }]);
    const nine = (xs: number[]): string => xs.map((x) => (+x.toFixed(9)).toString()).join();
    check(nine(paceKeys().map((k) => k.frame)) === nine([0, 120, 240, 240 + 260 / 300, 500, 500 + 90 * 220 / 180, 720]) && countKeys().some((c) => c.frame === 500),
        'pace: a keyframe dragged on the timeline takes the pace keys of its two legs with it, in proportion, as its iteration key; the others stay', nine(paceKeys().map((k) => k.frame)));
    anim().undo();
    const steps = anim().undoStack.length;
    clearRoute();
    check(!anim().sequence.tracks[ROUTE_PACE_TRACK] && anim().undoStack.length === steps + 1, 'pace: Clear route takes the Pace track, in its one step');
    anim().undo();
    check(paceKeys().length === keyed.length && routeKeys().length === 4, 'pace: (undone, it is back)');
}

// ── the pass's rules on the pure functions (deep-zoom/routeSmooth.ts) ────────────────────────────
// A route of five keyframes, its picture's speed made up: a rush in the middle, and a jitter.
{
    const fps = 30, was = [0, 50, 130, 160, 260], n = 260;
    const speed = Float64Array.from({ length: n }, (_, i) => 0.5 * (1 + 2 * Math.exp(-(((i - 140) / 12) ** 2))) * (1 + 0.1 * Math.sin(i * 2.1)));
    const whole = paceChange(speed, { fps, strength: 1, from: 0, to: n, easeFrom: false, easeTo: false });
    const flat = paceChange(new Float64Array(n).fill(0.4), { fps, strength: 1, from: 0, to: n, easeFrom: false, easeTo: false });
    const played = Array.from(speed, (s, i) => s / Math.exp(whole[i]));
    const spreadOf = (xs: number[]): number => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(0.95 * s.length)] / s[Math.floor(0.05 * s.length)]; };
    check(flat.every((g) => Math.abs(g) < 1e-12) && spreadOf(played) < spreadOf(Array.from(speed)) / 1.5,
        `smooth: the warp: a picture moving at one speed is left alone; one that rushes is played slower there (the speed as played, p95 over p5: x${spreadOf(Array.from(speed)).toFixed(2)} -> x${spreadOf(played).toFixed(2)})`);
    // (The jitter of a frame stays: the warp follows the speed smoothed over 0.05 s. Without it, one even pace.)
    const steady = speed.map((_, i) => 0.5 * (1 + 2 * Math.exp(-(((i - 140) / 12) ** 2))));
    const even = paceChange(steady, { fps, strength: 1000, from: 0, to: n, easeFrom: false, easeTo: false });
    const evenPlayed = Array.from(steady, (s, i) => s / Math.exp(even[i]));
    check(spreadOf(evenPlayed) < 1.02 && spreadOf(Array.from(steady)) > 2.5, `smooth: a strength of the selection's length or more is one even pace (the speed as played within x${spreadOf(evenPlayed).toFixed(4)}, p95 over p5, where it was x${spreadOf(Array.from(steady)).toFixed(2)})`);
    // A range: frames 50 to 160 (keyframes 2 to 4), the speed known only as far as `speedMargin` beyond it.
    const margin = speedMargin(fps, 1), known = speed.map((s, i) => (i >= 50 - margin && i < 160 + margin ? s : NaN));
    const ranged = paceChange(known, { fps, strength: 1, from: 50, to: 160, easeFrom: true, easeTo: true });
    const ease = Math.min(30, 110 / 4);
    const outside = ranged.every((g, i) => (i < 50 || i >= 160 ? g === 0 : true)) && Object.is(Math.abs(ranged[50]), 0) && Object.is(Math.abs(ranged[159]), 0);
    const middle = Array.from({ length: 160 - 50 }, (_, j) => 50 + j).filter((i) => i - 50 >= ease && 159 - i >= ease);
    check(outside && middle.length > 0 && middle.every((i) => ranged[i] === whole[i]) && Math.abs(ranged[50 + Math.round(ease / 2)] / whole[50 + Math.round(ease / 2)] - 0.5) < 0.1,
        `smooth: a range: nothing outside it changes, nothing at its edges; inside, the whole route's own change to the bit (its speed read only ${margin} frames beyond), eased in over the strength but no more than a quarter of it (${ease.toFixed(1)} frames)`);
    // The warp of keyframes 2 to 4, and the clock that keeps the camera's share of each leg.
    const warp = warpRoute(ranged, was, 1, 3), delta = warp.now[3] - was[3];
    check(warp.now.every((f, i) => Number.isInteger(f) && (i === 0 || f > warp.now[i - 1])) && warp.now[0] === 0 && warp.now[1] === 50 && warp.now[4] === was[4] + delta
        && was.every((f, i) => warp.fwd(f) === warp.now[i]) && [3.3, 70.25, 140, 200.5].every((f) => Math.abs(warp.back(warp.fwd(f)).f - f) < 1e-9) && warp.back(20).f === 20 && warp.back(240).f === 240 - delta,
        `smooth: keyframes on whole frames, rising; before the range where they were, after it later by its change (${delta} frames); old and new frames map both ways`, warp.now.join());
    const key = (id: string, frame: number, value: number): Keyframe => ({ id, frame, value, interpolation: 'Bezier', autoTangent: true, brokenTangents: false });
    const withHandles = (keys: Keyframe[]): Track => {
        keys.forEach((k, i) => { const { l, r } = AnimationMath.calculateTangents(k, keys[i - 1], keys[i + 1], 'Auto', true); k.leftTangent = l; k.rightTangent = r; });
        return { id: ROUTE_TRACK, type: 'float', label: '', keyframes: keys } as Track;
    };
    const depths = [1, 1e-3, 1e-5, 1e-6, 1e-9];
    const oldDepth = withHandles(depths.map((d, i) => key(`d${i}`, was[i], d))), newDepth = withHandles(depths.map((d, i) => key(`d${i}`, warp.now[i], d)));
    const oldPace = { id: ROUTE_PACE_TRACK, type: 'float', label: '', keyframes: [plain('q0', 0, 1), plain('q1', 100, 2), plain('q2', 200, 0.7), plain('q3', 260, 1)] } as Track;
    const clockOld = (f: number): number => animationEngine.evaluateTrack(oldDepth, f) * animationEngine.evaluateTrack(oldPace, f);
    const span = paceSpan(warp, 0, 4, clockOld, (t) => animationEngine.evaluateTrack(newDepth, t), 'x');
    const newPace = { id: ROUTE_PACE_TRACK, type: 'float', label: '', keyframes: span } as Track;
    const clockNew = (t: number): number => animationEngine.evaluateTrack(newDepth, t) * animationEngine.evaluateTrack(newPace, t);
    /** The share of a leg's clock behind each point of it, by quarter frames. */
    const share = (clockAt: (f: number) => number, a: number, b: number): ((f: number) => number) => {
        const cum = [0];
        for (let f = a; f < b - 1e-9; f += 0.25) cum.push(cum[cum.length - 1] + (clockAt(f) + 4 * clockAt(f + 0.125) + clockAt(f + 0.25)) / 24);
        return (f) => { const x = (f - a) * 4, i = Math.min(cum.length - 2, Math.max(0, Math.floor(x))); return (cum[i] + (x - i) * (cum[i + 1] - cum[i])) / cum[cum.length - 1]; };
    };
    let worstShare = 0, worstSpeed = 0;
    for (let j = 0; j < 4; j++) {
        const sOld = share(clockOld, was[j], was[j + 1]), sNew = share(clockNew, warp.now[j], warp.now[j + 1]);
        for (let t = warp.now[j]; t <= warp.now[j + 1]; t += 0.5) worstShare = Math.max(worstShare, Math.abs(sNew(t) - sOld(warp.back(t).f)));
        for (let t = warp.now[j]; t <= warp.now[j + 1]; t++) { const { f, rate } = warp.back(t); worstSpeed = Math.max(worstSpeed, Math.abs(Math.log10(clockNew(t) / (clockOld(f) * rate)))); }
    }
    check(worstShare < 3e-3 && worstSpeed <= 0.0101 && warp.now.every((f) => span.some((k) => k.frame === f)),
        `smooth: the clock: the new depth times the Pace track written keeps the camera's share of every leg as it was at the old frame shown (within ${worstShare.toExponential(1)}), the clock within ${worstSpeed.toFixed(4)} decades of the old one times the warp's rate; a pace key on every keyframe (${span.length} keys)`);
    // The look through the same warp: what it showed at the old frame, within the recorder's own tolerance.
    const look = { id: LOOK_TRACKS[0], type: 'float', label: '', keyframes: [plain('a', 10, 0), plain('b', 90, 0.4), plain('c', 150, -0.2), plain('d', 230, 0.3), plain('e', 250, 0.1)] } as Track;
    const carried = { ...look, keyframes: carryLook(look, warp, was[1], was[3], fps, LOOK_FIT_TOLERANCE, 0, 'l') } as Track;
    let lookOff = 0;
    for (let t = 0; t <= 260 + delta; t++) lookOff = Math.max(lookOff, Math.abs(animationEngine.evaluateTrack(carried, t) - animationEngine.evaluateTrack(look, warp.back(t).f)));
    check(lookOff <= LOOK_FIT_TOLERANCE * 1.01 && carried.keyframes.some((k) => k.id === 'a' && k.frame === 10) && carried.keyframes.some((k) => k.id === 'd' && k.frame === 230 + delta),
        `smooth: the free look through the warp shows what it showed at the old frame, within ${degrees(lookOff)} at every frame; its keys before the range stay, those after move with the route`);
}

// ── read, smooth, pin, close (2026-10-16, stage S1 of plans/deep-zoom-shell/SMOOTHING.md) ────────
// THE WORLD of these lines: a cone about the line, its apex at S, narrowing to a passage about 1e-7 from S - what
// a wall pass is to the picture: the walls come close and the picture rushes. A ray from the camera (on the line,
// `D` from S) meets the wall where s |d across| = (D + s d.BACK) w, w the cone's width (radius over distance).
const coneWidth = (distance: number): number => 0.6 - 0.45 * Math.exp(-(((Math.log10(Math.max(1e-300, distance)) + 7) / 0.35) ** 2));
const cone = (cam: V3, dir: V3): number => {
    const D = cam[0] * BACK[0] + cam[1] * BACK[1] + cam[2] * BACK[2], along = dir[0] * BACK[0] + dir[1] * BACK[1] + dir[2] * BACK[2];
    const sideways = Math.hypot(dir[0] - along * BACK[0], dir[1] - along * BACK[1], dir[2] - along * BACK[2]);
    let s = 0;
    for (let i = 0; i < 40; i++) { const w = coneWidth(D + s * along); s = (D * w) / (sideways - along * w); }
    return s > 0 ? s : Infinity;
};
/** Looking down the line. */
const downTheLine = { yaw: Math.atan2(INWARD[2], INWARD[0]), pitch: Math.asin(INWARD[1]) };
/** Frames where a picture's speed strays over 25 % from its own 3 s average (the study's score: evalbuilt.mts). */
const strays = (speed: ArrayLike<number>): number => {
    const L = Array.from(speed, (x) => Math.log(Math.max(1e-4, x))), s = 1.5 * 30, R = Math.ceil(3 * s);
    let n = 0;
    for (let i = 0; i < L.length; i++) {
        let a = 0, w = 0;
        for (let j = -R; j <= R; j++) { const k = i + j; if (k < 0 || k >= L.length) continue; const g = Math.exp(-0.5 * (j / s) ** 2); a += g * L[k]; w += g; }
        const r = Math.exp(L[i] - a / w);
        if (r > 1.25 || r < 0.8) n++;
    }
    return n;
};
/** The change of a picture's speed across frame `t` (3 to 9 frames after over 3 to 9 before, geometric means): the study's edge measure. */
const across = (speed: ArrayLike<number>, t: number): number => {
    const g = (a: number, b: number): number => { let s = 0; for (let i = a; i < b; i++) s += Math.log(speed[i]); return s / (b - a); };
    return Math.exp(g(t + 3, t + 9) - g(t - 9, t - 3));
};
/** The angle between two aims, degrees. */
const aimsApart = (a: Look, b: Look): number => {
    const p = routeQ(a), q = routeQ(b);
    return 2 * Math.acos(Math.min(1, Math.abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]))) * 180 / Math.PI;
};
/** Nine keyframes down the line from 1 to 1e-12, legs timed unevenly, aims that wobble; the 3rd and 7th with the K mark. */
const SMOOTH_DEPTHS = [0, 2, 3.5, 5, 6.5, 7.5, 9, 10.5, 12].map((decades) => 10 ** -decades);
const SMOOTH_FRAMES = [0, 140, 200, 330, 400, 470, 560, 680, 760];
function smoothScene(): void {
    anim().deleteAllTracks();
    anim().setDuration(900);
    const keys: Keyframe[] = SMOOTH_DEPTHS.map((d, i) => ({
        id: `s${i}`, frame: SMOOTH_FRAMES[i], value: d, interpolation: 'Bezier', autoTangent: true, brokenTangents: false,
        payload: { view: { cam: at(d), yaw: downTheLine.yaw + 0.05 * (i % 2 ? 1 : -1), pitch: downTheLine.pitch + 0.03 * ((i % 3) - 1) }, heading: [...INWARD], ...(i === 2 || i === 6 ? { exact: true } : {}) } as RoutePayload,
    }));
    keys.forEach((k, i) => { const { l, r } = AnimationMath.calculateTangents(k, keys[i - 1], keys[i + 1], 'Auto', true); k.leftTangent = l; k.rightTangent = r; });
    const track = (id: string, label: string, keyframes: Keyframe[]) => ({ id, type: 'float' as const, label, keyframes });
    useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: {
        [ROUTE_TRACK]: track(ROUTE_TRACK, 'Depth', keys),
        [ROUTE_ITERATIONS_TRACK]: track(ROUTE_ITERATIONS_TRACK, 'Iterations', SMOOTH_DEPTHS.map((d, i) => plain(`c${i}`, SMOOTH_FRAMES[i], countFor(d)))),
        [LOOK_TRACKS[0]]: track(LOOK_TRACKS[0], 'Look pan', [plain('l0', 0, 0), plain('l1', 250, 0.2), plain('l2', 520, -0.1), plain('l3', 760, 0.05), plain('l4', 800, 0.1)]),
        // Another track: a key before the passage, one on keyframe 5, one between keyframes 5 and 6, one past the route.
        'dzFormula.power': track('dzFormula.power', 'Power', [plain('w0', 300, 8), plain('w1', 400, 7), plain('w2', 430, 7.5), plain('w3', 850, 6)]),
        // And one keyed every frame of the first leg, which the pass shortens: rounded, two of its keys would meet.
        'dzFormula.boxScale': track('dzFormula.boxScale', 'Box scale', Array.from({ length: 121 }, (_, i) => plain(`b${i}`, 10 + i, 2 + Math.sin(i / 9)))),
    } } }));
    useAnimationStore.setState({ undoStack: [], redoStack: [] });
    world = cone;
}
{
    smoothScene();
    scrubRouteTo(400);
    const stood = host.getView(), drives = routeDrives(), heading = JSON.stringify(headingNow()), ks = routeKeys(), n = ks[ks.length - 1].frame - ks[0].frame;
    calls.length = 0;
    const read = await routePictureSpeed('route', 3);
    const rays = calls.filter((c): c is Extract<Call, { name: 'freeDistance' }> => c.name === 'freeDistance');
    const readAt = Array.from({ length: n }, (_, i) => i).filter((i) => i % 3 === 0 || i === n - 1), own = readAt.map((i) => routeViewAt(ks[0].frame + i) as RouteKey['view']);
    const placed = setViews().filter((v) => !sameCamera(v, stood));
    check(!!read && read.speed.length === n && rays.length === 45 * readAt.length && placed.length === readAt.length && placed.every((v, j) => sameCamera(v, own[j]))
        && own.some((v, j) => !sameCamera(v, routeShownAt(readAt[j]) as RouteKey['view'])) && !calls.some((c) => c.name === 'step'),
        `read: every third frame of the route and its last (${readAt.length} of ${n}), 45 rays a frame, the camera put on the route's OWN view there (not the one the free look shows); no frame of the renderer run`,
        `${rays.length} rays, ${placed.length} views placed, ${calls.filter((c) => c.name === 'step').length} steps`);
    const iters = anim().sequence.tracks[ROUTE_ITERATIONS_TRACK];
    check(rays.every((c, j) => c.iters === Math.trunc(animationEngine.evaluateTrack(iters, ks[0].frame + readAt[Math.floor(j / 45)])) && c.cam === own[Math.floor(j / 45)].cam.join()),
        'read: each frame\'s rays asked from its place with the iteration count keyed there');
    check(sameCamera(host.getView(), stood) && host.getView().iters === stood.iters && routeDrives() === drives && JSON.stringify(headingNow()) === heading && sameCamera(setViews()[setViews().length - 1], stood),
        'read: and the camera is back on the very view it had, the route holding it as before, the heading untouched: nobody saw it move');
    // The speed against the rule worked out here: the camera's step off the route, its turn from the route's aims, each ray's rate.
    const fps = anim().fps, i = 300, a = routeViewAt(ks[0].frame + i) as Look & { cam: string[] }, b = routeViewAt(ks[0].frame + i + 1) as Look & { cam: string[] };
    const V = [0, 1, 2].map((j) => (Number(BigInt(b.cam[j]) - BigInt(a.cam[j])) / ROUTE_UNIT) * fps) as V3;
    const qa = routeQ(a), d0 = mul(conj(qa), routeQ(b)), d = d0[3] < 0 ? d0.map((x) => -x) as Q : d0, sn = Math.hypot(d[0], d[1], d[2]), k = sn > 0 ? (2 * Math.atan2(sn, d[3]) * fps) / sn : 0;
    const W = turnBy(qa, [d[0] * k, d[1] * k, d[2] * k]), fov = Math.tan(0.55), rates: number[] = [];
    for (const v of [-0.4, -0.2, 0, 0.2, 0.4]) for (const u of [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]) {
        const raw = turnBy(qa, [fov * u, fov * v, -1]), l = Math.hypot(...raw), dir = raw.map((x) => x / l) as V3;
        const r = cone(fromS(a.cam), dir), vd = V[0] * dir[0] + V[1] * dir[1] + V[2] * dir[2];
        const tr = [0, 1, 2].map((j) => -(V[j] - vd * dir[j]) / r), wx = [W[1] * dir[2] - W[2] * dir[1], W[2] * dir[0] - W[0] * dir[2], W[0] * dir[1] - W[1] * dir[0]];
        rates.push(Math.hypot(tr[0] - wx[0], tr[1] - wx[1], tr[2] - wx[2]) / fov);
    }
    const middle = rates.sort((x, y) => x - y)[22], got = read?.speed[i] ?? NaN;
    check(Math.abs(got / middle - 1) < 1e-6, `read: the picture's speed is the middle of the 45 rays' rates, |-(V - (V.d) d) / r - W x d| over the field of view, as worked out here: ${got.toFixed(4)} picture heights a second at frame ${i} (by hand ${middle.toFixed(4)})`);
    // While a render runs nothing is read; a route that changes under the reading stops it, the camera where it was.
    setRouteRendering(true);
    const whileRendering = await routePictureSpeed('route', 3);
    setRouteRendering(false);
    world = (cam, dir) => { const t1 = performance.now(); while (performance.now() - t1 < 0.05) { /* a march at depth */ } return cone(cam, dir); };
    let tasks = 0;
    const edited = await routePictureSpeed('route', 1, () => { if (++tasks === 1) anim().updateKeyframes([{ trackId: ROUTE_ITERATIONS_TRACK, keyId: 'c1', patch: { value: 61 } }]); });
    world = cone;
    check(whileRendering === null && edited === null && tasks === 1 && sameCamera(host.getView(), stood),
        'read: nothing while the route is rendered; a route changed between two of its tasks stops it (null), the camera back where it was', `rendering ${!!whileRendering}, edited ${!!edited}, tasks ${tasks}`);
}
{
    // THE PASS, over the whole route: strength 4 s, a miss of 5 degrees, the look carried.
    smoothScene();
    const fps = anim().fps, before = await routePictureSpeed('route', 1), ks = routeKeys(), old = JSON.stringify(anim().sequence);
    const turnsBefore = Array.from({ length: 760 }, (_, f) => aimsApart(routeViewAt(f) as Look, routeViewAt(f + 1) as Look) * fps);
    /** How far the camera is from S at a frame: where it is on its way down the line. */
    const along = (f: number): number => Math.hypot(...fromS((routeViewAt(f) as { cam: string[] }).cam));
    const was300 = along(300), was430 = along(430);
    const steps = anim().undoStack.length, t0 = performance.now();
    const done = await smoothRoute({ strength: 4, miss: 5 });
    const ms = performance.now() - t0, now = routeKeys(), after = await routePictureSpeed('route', 1);
    const strayBefore = before ? strays(before.speed) : -1, strayAfter = after ? strays(after.speed) : -1;
    check(!!done && anim().undoStack.length === steps + 1 && strayBefore > 40 && strayAfter * 4 < strayBefore,
        `smooth: ONE undo step; the middle of the picture strays over 25 % from its own 3 s average in ${strayAfter} frames, ${strayBefore} before (the passage at 1e-7); ${done?.seconds.map((s) => s.toFixed(1)).join(' s -> ')} s, in ${ms.toFixed(0)} ms`,
        `${anim().undoStack.length - steps} steps, strays ${strayBefore} -> ${strayAfter}`);
    check(now.length === ks.length && now.every((k, i) => k.id === ks[i].id && sameStrings(k.view.cam, ks[i].view.cam) && sameWay(k.heading, ks[i].heading as number[]) && k.depth === ks[i].depth),
        'smooth: positions never move: every keyframe keeps its camera to the digit, its heading and its depth reading');
    const missed = now.map((k, i) => aimsApart(k.view, ks[i].view));
    check(now.every((k, i) => ([0, 2, 6, 8].includes(i) ? JSON.stringify(k.view) === JSON.stringify(ks[i].view) : missed[i] <= 5 + 1e-9)) && missed.filter((m) => m > 0.5).length >= 3
        && done?.aimsMoved.every((m, i) => Math.abs(m - missed[i]) < 1e-4),
        `smooth: the K keyframes and the two ends keep their aims to the digit; the others move by the miss at most (${missed.map((m) => m.toFixed(2)).join(', ')} degrees)`, `reported ${done?.aimsMoved.map((m) => m.toFixed(6)).join(', ')}; measured ${missed.map((m) => m.toFixed(6)).join(', ')}`);
    const turnsAfter = Array.from({ length: now[8].frame }, (_, f) => aimsApart(routeViewAt(f) as Look, routeViewAt(f + 1) as Look) * fps);
    const change = (xs: number[]): number => { const c = xs.slice(1).map((x, j) => Math.abs(x - xs[j]) * fps).sort((x, y) => x - y); return c[Math.floor(0.95 * c.length)]; };
    check(change(turnsAfter) < change(turnsBefore), `smooth: the turn changes less: its change of rate, p95, ${change(turnsBefore).toFixed(1)} -> ${change(turnsAfter).toFixed(1)} degrees a second a second`);
    const paced = paceKeys();
    check(now.every((k, i) => Number.isInteger(k.frame) && (i === 0 || k.frame > now[i - 1].frame)) && now[0].frame === 0 && now.every((k) => paced.some((p) => p.frame === k.frame))
        && countKeys().every((c, i) => c.frame === now[i].frame && c.value === countFor(SMOOTH_DEPTHS[i])) && done?.paceKeys === paced.length,
        `smooth: keyframes on whole frames, rising, the first where it was; a pace key on each (${paced.length} keys); each iteration key on its keyframe`, now.map((k) => k.frame).join());
    const delta = now[8].frame - ks[8].frame, lookNow = anim().sequence.tracks[LOOK_TRACKS[0]], power = anim().sequence.tracks['dzFormula.power'].keyframes;
    const lookOld = { id: LOOK_TRACKS[0], type: 'float', label: '', keyframes: JSON.parse(old).tracks[LOOK_TRACKS[0]].keyframes } as Track;
    const lookOff = Math.max(...now.map((k, j) => Math.abs(animationEngine.evaluateTrack(lookNow, k.frame) - animationEngine.evaluateTrack(lookOld, ks[j].frame))));
    check(lookOff <= LOOK_FIT_TOLERANCE * 1.001 && lookNow.keyframes.some((k) => k.frame === 800 + delta && k.value === 0.1),
        `smooth: the free look carried with the route (at every keyframe within ${degrees(lookOff)} of what it was there), its key past the route later by the route's change (${delta} frames)`,
        `look off ${lookOff}; look keys ${lookNow.keyframes.map((k) => k.frame)}`);
    const pw = power.map((k) => k.frame), at300 = Math.abs(Math.log10(along(pw[0]) / was300)), at430 = Math.abs(Math.log10(along(pw[2]) / was430));
    check(pw.every(Number.isInteger) && pw[0] > now[2].frame && pw[0] < now[3].frame && pw[1] === now[4].frame && pw[2] > now[4].frame && pw[2] < now[5].frame
        && pw[3] === 850 + delta && Math.max(at300, at430) < 0.03 && power.map((k) => k.value).join() === '8,7,7.5,6',
        `smooth: another track's keys go with the route (the owner: "Move other tracks' keys later with the route after a section"): one on a keyframe stays on it, one between two keyframes lands on a whole frame where the camera is where it was at the old one (within ${Math.max(at300, at430).toFixed(4)} decades), one past the route later by its change`,
        `power at ${pw}; keyframes at ${now.map((k) => k.frame)}`);
    const dense = anim().sequence.tracks['dzFormula.boxScale'].keyframes, denseWas = JSON.parse(old).tracks['dzFormula.boxScale'].keyframes as Keyframe[];
    check(now[1].frame < ks[1].frame && dense.length === 121 && dense.every((k, j) => j === 0 || k.frame > dense[j - 1].frame) && dense.some((k) => !Number.isInteger(k.frame))
        && dense.every((k, j) => k.value === denseWas[j].value) && dense[0].frame > 0 && dense[0].frame < 10 && dense[120].frame < 130,
        `smooth: a track keyed every frame of a leg the pass shortens (${ks[1].frame} -> ${now[1].frame} frames) keeps every key, rising: where two would meet on a whole frame the track takes the warp's own frames`,
        `${dense.length} keys, first ${dense[0].frame}, last ${dense[120]?.frame}`);
    let offLine = 0, backwards = 0, prev = Infinity;
    for (let f = 0; f <= now[8].frame; f += 0.5) {
        const p = fromS((routeViewAt(f) as { cam: string[] }).cam), D = p[0] * BACK[0] + p[1] * BACK[1] + p[2] * BACK[2];
        offLine = Math.max(offLine, Math.hypot(p[0] - D * BACK[0], p[1] - D * BACK[1], p[2] - D * BACK[2]) / D);
        if (D > prev) backwards++;
        prev = D;
    }
    check(offLine < 1e-9 && backwards === 0, `smooth: the camera keeps to its path: on the line at every half frame (within ${offLine.toExponential(1)} of its distance), never backwards`, `${backwards} steps back`);
    check(done?.close.length === 0 && closeKeyframes().length === 0, 'smooth: (no leg under half a second after it)');
    anim().undo();
    check(JSON.stringify(anim().sequence) === old, 'smooth: undone, the route is the one it was, to the digit');

    // EVEN: a strength of the route's length or more is one pace.
    const even = await smoothRoute({ strength: 1000, miss: null });
    const evenSpeed = await routePictureSpeed('route', 1);
    const spreadOf = (xs: ArrayLike<number> | undefined): number => { const s = Array.from(xs ?? [1, 9]).slice(30, -30).sort((x, y) => x - y); return s[Math.floor(0.95 * s.length)] / s[Math.floor(0.05 * s.length)]; };
    const spread = spreadOf(evenSpeed?.speed), spreadBefore = spreadOf(before?.speed);
    check(!!even && spread < 1.15 && spreadBefore > 2.5 && even.aimsMoved.every((m) => m === 0) && routeKeys().every((k, j) => JSON.stringify(k.view) === JSON.stringify(ks[j].view)),
        `smooth: a strength of the route's length or more is one even pace (the middle of the picture as played within x${spread.toFixed(3)}, p95 over p5 a second from each end, where it was x${spreadBefore.toFixed(2)}: what is left is the path's own, its keys' tangents mixing their legs by their lengths in time); with no miss every aim stays to the digit`);
    anim().undo();

    // A RANGE: keyframes 4 to 6 (the passage), strength 2 s.
    const head = places(0, ks[1].frame), tail = places(ks[7].frame, ks[8].frame), sides = [...places(ks[1].frame, ks[2].frame), ...places(ks[6].frame, ks[7].frame)];
    const range = await smoothRoute({ strength: 2, miss: 5, range: [ks[3].id, ks[5].id] });
    const inRange = routeKeys(), rangeSpeed = await routePictureSpeed('route', 1), d = inRange[5].frame - ks[5].frame;
    const sidesNow = [...places(ks[1].frame, ks[2].frame), ...places(ks[6].frame + d, ks[7].frame + d)];
    const offBy = (was: string[], now: string[]): number => Math.max(...was.map((p, j) => { const x = p.split(','), y = now[j].split(','), g = [0, 1, 2].map((c) => Number(BigInt(y[c]) - BigInt(x[c])) / ROUTE_UNIT); return Math.hypot(...g) / Math.hypot(...fromS(x)); }));
    const sideOff = offBy(sides, sidesNow), tailOff = offBy(tail, places(ks[7].frame + d, ks[8].frame + d));
    check(!!range && inRange.every((k, j) => (j <= 3 ? k.frame === ks[j].frame : j >= 5 ? k.frame === ks[j].frame + d : true))
        && head.every((p, j) => p === places(0, ks[1].frame)[j]) && tailOff < 1e-12 && sideOff < 1e-3
        && JSON.stringify(inRange.slice(0, 4).map((k) => k.view)) === JSON.stringify(ks.slice(0, 4).map((k) => k.view)) && JSON.stringify(inRange.slice(5).map((k) => k.view)) === JSON.stringify(ks.slice(5).map((k) => k.view)),
        `smooth: a range (keyframes 4 to 6): nothing before it is retimed, everything after it later by its change of length (${d} frames), the aims outside it and at its ends kept; the camera before keyframe 2 to the digit, after keyframe 8 within ${tailOff.toExponential(1)} of its distance (a leg played later is integrated at other frames), on the two legs beside the range within ${sideOff.toExponential(1)}`,
        JSON.stringify({ frames: inRange.map((k) => k.frame), was: ks.map((k) => k.frame), tailOff, sideOff }));
    const lookAfter = anim().sequence.tracks[LOOK_TRACKS[0]].keyframes, powerAfter = anim().sequence.tracks['dzFormula.power'].keyframes;
    check(countKeys().every((c, j) => c.frame === inRange[j].frame) && lookAfter.some((k) => k.frame === 800 + d && k.value === 0.1) && lookAfter.some((k) => k.frame === 250 && k.value === 0.2)
        && powerAfter[0].frame === 300 && powerAfter[1].frame === inRange[4].frame && powerAfter[2].frame > inRange[4].frame && powerAfter[2].frame < inRange[5].frame && powerAfter[3].frame === 850 + d,
        'smooth: with a range the iteration keys, the free look and the keys of other tracks go with the route - inside it through the warp, after it later by its change; before it they stay as they were',
        `power at ${powerAfter.map((k) => k.frame)}; keyframes at ${inRange.map((k) => k.frame)}`);
    const edges = before && rangeSpeed ? [across(before.speed, ks[3].frame), across(rangeSpeed.speed, inRange[3].frame), across(before.speed, ks[5].frame), across(rangeSpeed.speed, inRange[5].frame)] : [0, 1, 0, 1];
    check(Math.abs(Math.log(edges[1] / edges[0])) < Math.log(1.1) && Math.abs(Math.log(edges[3] / edges[2])) < Math.log(1.1),
        `smooth: a range crosses its edges as the route did before it (the change of the picture's speed across each: x${edges[1].toFixed(2)} / x${edges[3].toFixed(2)}, before the pass x${edges[0].toFixed(2)} / x${edges[2].toFixed(2)})`);
    anim().undo();

    // The look smoothed: eased to the hand's own values at the ends of what is resampled.
    await smoothRoute({ strength: 4, miss: 5, look: 0.5 });
    const lookSmoothed = anim().sequence.tracks[LOOK_TRACKS[0]];
    check(Math.abs(animationEngine.evaluateTrack(lookSmoothed, 0)) <= LOOK_FIT_TOLERANCE && Math.abs(animationEngine.evaluateTrack(lookSmoothed, routeKeys()[8].frame) - 0.05) <= LOOK_FIT_TOLERANCE,
        'smooth: the free look smoothed when asked, and at both ends of the route its own values still');
    anim().undo();

    // While the route renders, and with a range the wrong way round: nothing.
    const held = anim().undoStack.length;
    setRouteRendering(true);
    const rendering = await smoothRoute({ strength: 4, miss: 5 });
    setRouteRendering(false);
    const backwardsRange = await smoothRoute({ strength: 4, range: [ks[5].id, ks[3].id] });
    check(rendering === null && backwardsRange === null && anim().undoStack.length === held && JSON.stringify(anim().sequence) === old,
        'smooth: while the route is rendered, or given a range the wrong way round, it does nothing and leaves no step');

    // PIN: the K mark set and taken by hand.
    const loose = ks[3].id, stepsPin = anim().undoStack.length;
    const pinned = pinKeyframe(loose), pinnedAgain = pinKeyframe(loose), kept = routeKeys()[3];
    check(pinned && !pinnedAgain && kept.exact === true && JSON.stringify(kept.view) === JSON.stringify(ks[3].view) && anim().undoStack.length === stepsPin + 1,
        'pin: a keyframe pinned has the K mark, its view untouched, in one undo step; pinned again, nothing and no step');
    const unpinned = unpinKeyframe(loose);
    setRouteRendering(true);
    const whileRendered = pinKeyframe(loose);
    setRouteRendering(false);
    check(unpinned && !('exact' in routeKeys()[3]) && !('exact' in (depthKeys()[3].payload as RoutePayload)) && !whileRendered && anim().undoStack.length === stepsPin + 2,
        'pin: let go, the mark is gone from its payload, in one step; nothing while the route is rendered');
}
{
    // THE DIALOG'S LOGIC (deep-zoom/smoothDialog.ts), on the scene of the pass.
    smoothScene();
    const fps = anim().fps, ks = routeKeys(), length = (ks[8].frame - ks[0].frame) / fps;
    // The strength: one log slider from 4 s to the length of what is smoothed; its far end one even pace.
    const scale = strengthScale(length), slide = createLogMapping(scale.min, scale.max, { reserveZero: false }), mid = slide.fromDisplay(50);
    const atEnd = strengthFromSlider(slide.fromDisplay(100), length), atStart = strengthFromSlider(slide.fromDisplay(0), length), atMid = strengthFromSlider(mid, length);
    check(scale.min === STRENGTH_MIN && scale.max === length && scale.slides && atEnd === EVEN && strengthFor(atEnd, length) === length && Math.abs((atStart as number) - 4) < 1e-9
        && Math.abs((atMid as number) - Math.sqrt(4 * length)) < 1e-6 && strengthFor(EVEN, 2 * length) === 2 * length && strengthFor(2, length) === 4
        && !strengthScale(3.5).slides && strengthFromSlider(3.5, 3.5) === EVEN && strengthFor(EVEN, 3.5) === 3.5,
        `dialog: the strength is one log slider from 4 s to the length of what is smoothed (${length.toFixed(1)} s; its middle ${(atMid as number).toFixed(2)} s, the geometric mean); its far end is one even pace, the length itself, and stays even when the selection grows; under 4 s only even`,
        `ends ${String(atStart)} / ${String(atEnd)}, middle ${String(atMid)}`);
    // What is smoothed.
    const whole = smoothSpan(ks, 'route', [], [0, 0], fps), rows = smoothSpan(ks, 'legs', ['s5', 's3', 's4'], [0, 0], fps), one = smoothSpan(ks, 'legs', ['s6', 'gone'], [0, 0], fps);
    const timeline = smoothSpan(ks, 'legs', timelinePicked([`${ROUTE_TRACK}::s6`, `${ROUTE_ITERATIONS_TRACK}::c3`, `${ROUTE_TRACK}::s2`]), [0, 0], fps);
    const range = smoothSpan(ks, 'frames', [], [420, 350], fps), exact = smoothSpan(ks, 'frames', [], [330, 400], fps), tail = smoothSpan(ks, 'frames', [], [700, 900], fps);
    const outside = smoothSpan(ks, 'frames', [], [800, 900], fps), before = smoothSpan(ks, 'frames', [], [-50, -10], fps);
    check(!!whole && whole.a === 0 && whole.b === 8 && !whole.range && whole.seconds === length && rows?.a === 3 && rows.b === 5 && rows.range?.join() === 's3,s5'
        && one === null && timeline?.a === 2 && timeline.b === 6 && range?.a === 3 && range.b === 5 && exact?.a === 3 && exact.b === 4 && tail?.a === 7 && tail.b === 8
        && outside === null && before === null,
        'dialog: what is smoothed: the whole route; the legs from the first keyframe selected to the last (the rows in any order, or the route\'s keys among the timeline\'s); the legs that hold a frame range; nothing for one keyframe or a range that holds no leg',
        JSON.stringify({ rows, timeline, range, exact, tail }));
    // The graph: columns, range.
    const cols = paceColumns([1, 4, NaN, NaN, 2, 8], 3), wide = paceRange([1, 1, 1, 1, 100], [0.5, 2]);
    const map = keyframeMap([0, 10, 30], [0, 20, 40]), zoomed = paceColumns([1, 4, 9, 16], 2, 20, 40, (i) => map(10 + i * 5));
    check(Math.abs(cols[0] - 2) < 1e-12 && Number.isNaN(cols[1]) && Math.abs(cols[2] - 4) < 1e-12 && wide.lo < 0.5 && wide.hi > 100 && wide.hi < 200
        && [map(-5), map(5), map(20), map(35)].join() === '-5,10,30,45' && Math.abs(zoomed[0] - 2) < 1e-12 && Math.abs(zoomed[1] - 12) < 1e-12,
        'dialog: the graph\'s columns are the mean in log of the frames that fall in each (none: no line there), over a window of the route; the reading before a pass drawn on the timing after it through the keyframes; its range the 1st to 99th percentile, widened by a tenth',
        `${Array.from(cols)} ${Array.from(zoomed)} ${JSON.stringify(wide)}`);

    // THE RUN: the route read before, the pass, the route read after; readings kept by what the route is.
    const read = await routePictureSpeed('route', 3), sigBefore = routeSignature('route'), steps = anim().undoStack.length, phases: SmoothPhase[] = [];
    calls.length = 0;
    const run = await runSmooth({ strength: strengthFor(4, length), miss: 5, look: null, paceBy: 'route' }, (phase) => { if (phases[phases.length - 1] !== phase) phases.push(phase); });
    const readBefore = calls.filter((c) => c.name === 'freeDistance').length, readAfter = await routePictureSpeed('route', 3);
    check(!!run && phases.join() === 'before,pass,after' && anim().undoStack.length === steps + 1 && run.beforeSig === sigBefore && run.afterSig === routeSignature('route') && run.afterSig !== sigBefore
        && run.framesBefore.join() === ks.map((k) => k.frame).join() && run.framesAfter.join() === routeKeys().map((k) => k.frame).join()
        && !!read && !!run.before && run.before.speed.every((v, i) => v === read.speed[i]) && !!readAfter && !!run.after && run.after.speed.length === readAfter.speed.length && run.after.speed.every((v, i) => v === readAfter.speed[i]),
        `dialog: a run reads the route before the pass, runs it (one undo step), and reads the route again after it - the route as it now plays, not the pass's own reckoning (${run?.result.seconds.map((s) => s.toFixed(1)).join(' s -> ')} s)`,
        `phases ${phases}, steps ${anim().undoStack.length - steps}, rays ${readBefore}`);
    // Given as a share of the frames read (2026-10-17, STREAMLINE.md stage 6: a count grows with a longer route).
    const shareOf = (s: ArrayLike<number>): number => strays(s) / Array.from(s).filter((v) => v > 0).length;
    check(!!run?.before && !!run.after && strayFrames(run.after.speed, fps) * 4 < strayFrames(run.before.speed, fps) && strayFrames(run.before.speed, fps) === strays(run.before.speed)
        && strayFrames(run.after.speed, fps) === strays(run.after.speed)
        && strayShare(run.before.speed, fps) === shareOf(run.before.speed) && strayShare(run.after.speed, fps) === shareOf(run.after.speed) && strayShare([NaN, 0], fps) === null,
        `dialog: its score is the study's (the middle of the picture off its own 3 s average by over 25 %), given as a share of the frames read: ${run?.before ? strayFrames(run.before.speed, fps) : '-'} frames before (${run?.before ? Math.round(100 * (strayShare(run.before.speed, fps) ?? 0)) : '-'} %), ${run?.after ? strayFrames(run.after.speed, fps) : '-'} after (${run?.after ? Math.round(100 * (strayShare(run.after.speed, fps) ?? 0)) : '-'} %)`);
    calls.length = 0;
    anim().undo();
    const undone = knownPace('route'), undoneRays = calls.filter((c) => c.name === 'freeDistance').length;
    anim().redo();
    const redone = knownPace('route');
    check(undone === run?.before && redone === run?.after && undoneRays === 0 && calls.filter((c) => c.name === 'freeDistance').length === 0,
        'dialog: undone, the route\'s reading is the one from before the pass, redone the one after it: kept by what the route is, no ray read again');
    anim().undo();

    // CANCEL while the pass reads its rays (a march at depth: 0.05 ms a ray, so the reading takes several tasks).
    const old = JSON.stringify(anim().sequence), stepsCancel = anim().undoStack.length, stood = host.getView();
    world = (cam, dir) => { const t1 = performance.now(); while (performance.now() - t1 < 0.05) { /* a march at depth */ } return cone(cam, dir); };
    const ctl = new AbortController();
    let cancelledAt = -1, of = 0, doneAt = 0;
    calls.length = 0;
    const cancelled = await runSmooth({ strength: 2, miss: 5, look: null, paceBy: 'path' }, (phase, done, n) => {
        if (phase === 'pass' && done > 0 && cancelledAt < 0) { cancelledAt = calls.filter((c) => c.name === 'freeDistance').length; of = n; doneAt = done; ctl.abort(); }
    }, ctl.signal);
    const asked = calls.filter((c) => c.name === 'freeDistance').length;
    world = cone;
    check(cancelled === null && cancelledAt >= 0 && JSON.stringify(anim().sequence) === old && anim().undoStack.length === stepsCancel && sameCamera(host.getView(), stood)
        && asked === cancelledAt && doneAt < of,
        'dialog: Cancel while the rays are read stops the reading at once (no ray asked after it): nothing changes, no undo step, the camera back where it stood',
        `run ${cancelled ? 'done' : 'null'}, ${asked} rays asked, ${cancelledAt} when cancelled (${doneAt} of ${of} frames read), steps ${anim().undoStack.length - stepsCancel}`);
    // CANCEL while the route is read after the pass: the pass stands, the reading after it is left unread.
    const ctlAfter = new AbortController();
    const kept = await runSmooth({ strength: 3, miss: 5, look: null, paceBy: 'route' }, (phase) => { if (phase === 'after') ctlAfter.abort(); }, ctlAfter.signal);
    check(!!kept && kept.after === null && anim().undoStack.length === stepsCancel + 1 && knownPace('route') === null,
        'dialog: Cancel while the route is read after the pass keeps the pass (one undo step); the reading after it is left unread');
    anim().undo();
}
{
    // CLOSE KEYFRAMES: five keyframes off the line, a leg of nine frames.
    const off = (depth: number, side: V3): [string, string, string] => [0, 1, 2].map((j) => String(S[j] + BigInt(Math.round(depth * (BACK[j] + side[j]) * 2 ** 256)))) as [string, string, string];
    const spots: Array<[number, V3, number]> = [[1, [0, 0, 0], 0], [1e-2, [0.3, -0.2, 0.1], 90], [1e-3, [-0.4, 0.3, 0.2], 180], [1.1e-3, [0.1, -0.5, 0.3], 189], [1e-5, [0, 0.1, -0.1], 280]];
    anim().deleteAllTracks();
    const keys: Keyframe[] = spots.map(([d, side, frame], i) => ({ id: `m${i}`, frame, value: d, interpolation: 'Bezier', autoTangent: true, brokenTangents: false,
        payload: { view: { cam: off(d, side), yaw: downTheLine.yaw, pitch: downTheLine.pitch } } as RoutePayload }));
    keys.forEach((k, i) => { const { l, r } = AnimationMath.calculateTangents(k, keys[i - 1], keys[i + 1], 'Auto', true); k.leftTangent = l; k.rightTangent = r; });
    useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { [ROUTE_TRACK]: { id: ROUTE_TRACK, type: 'float' as const, label: 'Depth', keyframes: keys },
        [ROUTE_ITERATIONS_TRACK]: { id: ROUTE_ITERATIONS_TRACK, type: 'float' as const, label: 'Iterations', keyframes: spots.map(([d, , f], i) => plain(`n${i}`, f, countFor(d))) } } } }));
    useAnimationStore.setState({ undoStack: [], redoStack: [] });
    check(closeKeyframes().join() === 'm3', 'close: a leg under half a second is listed, by the keyframe it arrives at', closeKeyframes().join());
    const rowsClose = closeRows(routeKeys(), closeKeyframes(), anim().fps);
    check(rowsClose.length === 1 && rowsClose[0].number === 4 && Math.abs(rowsClose[0].seconds - 9 / anim().fps) < 1e-12 && rowsClose[0].merge,
        'dialog: its row in the dialog: the keyframe it arrives at (4), its length, and a merge offered', JSON.stringify(rowsClose));
    // What dropping each of the two would cost, measured here: how far the route without it passes from where it stood, in its depths.
    const passes = (j: number): number => {
        const k = routeKeys()[j], span = routeKeys()[j + 1].frame - routeKeys()[j - 1].frame;
        deleteKeyframes([k.id]);
        let best = Infinity;
        for (let f = k.frame - span; f <= k.frame + span; f += span / 400) {
            const p = (routeViewAt(f) as { cam: string[] }).cam, gap = [0, 1, 2].map((c) => Number(BigInt(p[c]) - BigInt(k.view.cam[c])) / ROUTE_UNIT);
            best = Math.min(best, Math.hypot(gap[0], gap[1], gap[2]) / k.depth);
        }
        anim().undo();
        return best;
    };
    const costs = [passes(2), passes(3)], cheaper = costs[0] <= costs[1] ? 'm2' : 'm3', other = cheaper === 'm2' ? 'm3' : 'm2';
    const steps = anim().undoStack.length, merged = mergeCloseKeyframes();
    check(merged.join() === cheaper && routeKeys().length === 4 && anim().undoStack.length === steps + 1 && countKeys().length === 4 && closeKeyframes().length === 0,
        `close: a merge drops the keyframe whose removal moves the path least (${cheaper}: ${Math.min(...costs).toFixed(3)} depths, against ${Math.max(...costs).toFixed(3)}), with its iteration key, in one undo step`,
        `merged ${merged}, steps ${anim().undoStack.length - steps}, costs ${costs}`);
    anim().undo();
    pinKeyframe(cheaper);
    check(mergeCloseKeyframes().join() === other, 'close: a keyframe with the K mark is never dropped: the other one goes');
    anim().undo();
    pinKeyframe(other);
    check(closeRows(routeKeys(), closeKeyframes(), anim().fps).every((r) => !r.merge) && mergeCloseKeyframes().length === 0,
        'dialog: a leg whose two keyframes are both K keyframes (or ends) offers no merge, and a merge leaves it');
}

stopSync();
console.log(failed === 0 ? '\nroute: all green' : `\nroute: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
