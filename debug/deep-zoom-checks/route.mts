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
 *   payload  the camera only; a JSON round trip gives the same route, to the digit
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
    LOOK_FIT_TOLERANCE, LOOK_TRACKS, ROUTE_ITERATIONS_TRACK, ROUTE_MAX_LEG_SECONDS, ROUTE_MIN_LEG_SECONDS, ROUTE_SOLID_SAMPLES, ROUTE_TRACK, ROUTE_UNIT,
    cameraOnRoute, clearLook, deleteKeyframe, headingNow, installRoute, legFrames, legInSolid, lookKeyed, lookTurned, noteMove, playLeg, replaceKeyframe,
    returnToRoute, routeDrives, routeKeys, routeShownAt, routeViewAt, scrubRouteTo, setKeyframe, setRouteRendering, stopRoutePlayback, useRoute,
} from '../../deep-zoom/route';
import type { RouteKey, RoutePayload } from '../../deep-zoom/route';
import type { Keyframe } from '../../types';

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
    | { name: 'setOrientation' };
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
const stray = payloads.flatMap((p) => [...Object.keys(p).filter((key) => key !== 'view' && key !== 'heading'), ...Object.keys(p.view).filter((key) => !['cam', 'yaw', 'pitch', 'roll'].includes(key))]);
check(payloads.length === 3 && stray.length === 0 && payloads.every((p) => p.view.cam.every((c) => typeof c === 'string')),
    'payload: a key holds the camera and its heading, nothing else, and the position as strings', `stray keys: ${stray.join()}`);
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

stopSync();
console.log(failed === 0 ? '\nroute: all green' : `\nroute: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
