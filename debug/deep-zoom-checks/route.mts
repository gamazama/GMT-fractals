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
import {
    ROUTE_ITERATIONS_TRACK, ROUTE_MAX_LEG_SECONDS, ROUTE_MIN_LEG_SECONDS, ROUTE_SOLID_SAMPLES, ROUTE_TRACK, ROUTE_UNIT,
    cameraOnRoute, deleteKeyframe, headingNow, installRoute, legFrames, legInSolid, noteMove, playLeg, replaceKeyframe,
    returnToRoute, routeDrives, routeKeys, routeViewAt, setKeyframe, stopRoutePlayback, useRoute,
} from '../../deep-zoom/route';
import type { RouteKey, RoutePayload } from '../../deep-zoom/route';

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
type Call = { name: 'setView'; view: DzView } | { name: 'setParams'; patch: DzParams } | { name: 'estimateAtPoint'; cam: string[]; iters: number | undefined };
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
check(!calls.some((c) => c.name === 'setParams' && 'dzFormula.power' in c.patch), 'drive: (a formula value written by hand waits its 90 ms)');
scrub(450);
const powerAt = calls.findIndex((c) => c.name === 'setParams' && c.patch['dzFormula.power'] === 5), viewAt = calls.findIndex((c) => c.name === 'setView');
check(powerAt >= 0 && viewAt > powerAt, 'drive: a formula value the sync was holding is sent before the frame\'s view', `setParams at ${powerAt}, setView at ${viewAt}`);
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

stopSync();
console.log(failed === 0 ? '\nroute: all green' : `\nroute: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
