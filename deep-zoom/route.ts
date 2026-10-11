/**
 * deep-zoom/route.ts - the route: the camera move on the timeline, made of keyframes set as you dive.
 *
 * WORDS
 *   A ROUTE is the camera move on the timeline. A KEYFRAME is one exact view on it. A LEG is the
 *   stretch between two keyframes. One route a scene. ("Flight" and "dive" mean other things in
 *   this app: a hand-flown undo step, and the Dive-to-depth action.)
 *
 * WHAT A KEYFRAME IS
 *   One key on the track `camera.depth` (`ROUTE_TRACK`; the param is declared in
 *   `deep-zoom/features/camera.ts`). Its VALUE is the depth there - what is looked at, the nearest
 *   surface when nothing is (`deep-zoom/depthNow.ts`) - which the timeline draws and eases in log
 *   space. Its PAYLOAD (`RoutePayload`) is the camera and nothing else: the three 256-bit position
 *   strings, yaw, pitch, the roll when there is one, and the HEADING - the direction it was
 *   travelling when it was set. Never iterations, power, phase, light or colour.
 *   Setting a keyframe also writes an ordinary key on `dzFormula.iterations` at the same frame,
 *   with the iteration count in force.
 *
 * THE SEAM
 *   - `installRoute()` once, from main.tsx, before anything can load a sequence: it registers the
 *     track as a payload track and a log track, as the timeline's camera track (held while the
 *     camera is recorded), hands Key Cam its capture function, and registers one post-scrub hook.
 *   - IN: `setKeyframe()` (the K key, "Add keyframe") and `setKeyframe(frame)` (the timeline's Key
 *     Cam). `noteMove` / `takeCamera` / `stopRoutePlayback` from the navigation
 *     (`deep-zoom/DeepZoomNavigation.tsx`), `diveBegan` from a dive (`deep-zoom/diveControl.ts`).
 *   - OUT: the post-scrub hook hands the host ONE `setView` for a scrubbed frame, and only when the
 *     view differs from the last one it set - a parked playhead leaves the still to gather. The
 *     path between keyframes is the engine's (`engine/animation/zoomPath.ts`), with time in frames
 *     and the scale read off the depth track as the engine eases it.
 *   - The Route tab is `deep-zoom/components/RoutePanel.tsx`; it reads `useRoute` and the
 *     animation store.
 *   - Saving: the sequence travels in a scene file with its payloads (the engine's doing). A share
 *     link carries no route (`deep-zoom/share.ts`).
 *
 * WHO HOLDS THE CAMERA
 *   The route DRIVES from the moment the hook sets a view until somebody else moves the camera:
 *   a navigation move or turn, a dive, or a `setView` that is not the hook's own (a jump, an undo,
 *   a loaded scene). While it drives, the renderer's own iteration rule is held off
 *   (`holdAutoIterations`), so a played, a scrubbed and a rendered frame have one count, and the
 *   depth toasts are silent (`deep-zoom/milestones.ts`). It never takes the camera back by
 *   itself: a scrub of the SAME frame (what the timeline does after an edit) sets nothing while
 *   the user holds the camera. A scrub to another frame, Play, a row of the Route tab and
 *   "Return" do take it.
 *
 * PITFALLS
 *   - CAMERA STRINGS never pass through `Number()`. The path's arithmetic is bigint; the strings
 *     of a keyframe are handed back as they were stored.
 *   - AT A KEYFRAME'S OWN FRAME THE VIEW IS THE STORED ONE, not the path's: the path ends exactly
 *     on a leg's DEEPER keyframe only (its shallower end is right to 16 digits of its own scale),
 *     and an orientation read back through a quaternion moves in its last bit.
 *   - `host.setView` also writes iterations, power, phase, light and colour. The hook hands back
 *     the renderer's own values for all of them (`host.getView()`), after `flushHostSync()` has
 *     sent whatever the timeline wrote this frame; the iteration count alone is taken from its
 *     track, because the renderer raises that one by itself and the sync does not re-send a value
 *     it thinks is there.
 *   - NO ITERATION KEYS, NO HOLD: with the iterations track empty the renderer's own rule stays as
 *     the store has it and the count is left alone.
 *   - THE ITERATION KEYS ARE ORDINARY KEYS. Moving a keyframe in time on the timeline does not
 *     move its iteration key; deleting it from the Route tab does delete the one at its frame.
 *   - THE HEADING IS THE LAST MOVE'S DIRECTION, whatever its size, since the last `setView` (the
 *     hook's own included: a keyframe set where the route itself put the camera has none, and the
 *     path then enters it along the mean of its two legs). So a tap of S before a NEW keyframe
 *     gives it a heading that points back the way it came, and the path hooks past it: seen in the
 *     app on 2026-10-11, where that leg was then marked as passing through the solid. A keyframe
 *     that takes a new view (K on it, its row's button, Key Cam on it) keeps the heading it had:
 *     the nudge that framed it is not the way the route goes.
 *   - HANDLES. A keyframe's handles on the depth curve are the timeline's own (auto) until somebody
 *     shapes them. While they are, they are worked out again when the keyframe takes a new view
 *     (it is written as a new key: its id changes) and when a neighbour is deleted; left as they
 *     were, a much deeper view makes the depth dip and rise on the way. Shaped handles are never
 *     touched here.
 *   - `host.thumbnail` restarts the still. It is called when a keyframe is set, never on a timer.
 *   - The solid check asks the renderer for one reference orbit a sample (milliseconds at depth):
 *     it runs a moment after a keyframe changes, a leg a task, never per frame. It reads the
 *     formula as the renderer has it THEN: a change of power or phase does not run it again.
 *
 * @invariant K adds a keyframe after the last one, a leg's on-screen length at `ROUTE_PACE` decades
 *   a second later, also with the playhead ON the last one; with the playhead on an earlier
 *   keyframe that keyframe takes the view and keeps its time; Key Cam at a frame between two puts
 *   one in between. A payload holds the camera and its heading, nothing else, and survives JSON
 *   exactly. The hook hands the
 *   host each keyframe's stored view at its frame, one `setView` for a frame whose view changed
 *   and none for one that did not, holds the first and the last, sends the values the sync was
 *   holding BEFORE the view, and leaves a camera the user took where it is when the same frame is
 *   scrubbed again. The heading is the last move, is cleared by a jump, and stays with a keyframe
 *   that takes a new view. A leg is asked at `ROUTE_SOLID_SAMPLES` points with the count keyed
 *   there. A leg played from its row stops on its keyframe - proven by: npm run
 *   check:deep-zoom-route (the "set: ...", "leg: ...", "payload: ...", "drive: ...",
 *   "heading: ...", "solid: ...", "play: ..." lines). Falsified 2026-10-11: see the check's header.
 * @assumption A keyed count above the renderer's own ceiling for `setView` (160 on the Mandelbulb:
 *   grep `v.iters|0` in deep-zoom/renderer/core.js) is cut to it, while the renderer's own rule can
 *   reach 400 under the ray march. A power-2 route deeper than about 1e-38 therefore plays with too
 *   few iterations. Nothing here works around it.
 */
import * as THREE from 'three';
import { create } from 'zustand';
import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import type { ScrubContext } from '../engine/AnimationEngine';
import { AnimationMath } from '../engine/math/AnimationMath';
import { registerPayloadTrack } from '../engine/animation/payloadTrackRegistry';
import { registerLogTrack } from '../engine/animation/logTrackRegistry';
import { registerCameraKeyTracks, setCameraKeyCaptureFn } from '../engine/animation/cameraKeyRegistry';
import { buildZoomPath, zoomLegOnScreen, zoomPathOrientation, zoomPathPosition } from '../engine/animation/zoomPath';
import type { TurnKey, ZoomKey, ZoomPath } from '../engine/animation/zoomPath';
import { showToast } from '../engine/store/toastStore';
import type { Track } from '../types';
import { getHost, subscribeHost } from './host/current';
import type { DeepZoomHost } from './host/DeepZoomHost';
import { readDepth } from './depthNow';
import { validDepth } from './components/depthFormat';
import { toOrientation, toQuaternion } from './orbitCamera';
import type { V3 } from './orbitCamera';
import { flushHostSync, holdAutoIterations } from './useHostSync';

/** The route's track: one key a keyframe. */
export const ROUTE_TRACK = 'camera.depth';
/** Where the iteration count of each keyframe is keyed. */
export const ROUTE_ITERATIONS_TRACK = 'dzFormula.iterations';
/** The pace a new leg is timed at, in decades a second. */
export const ROUTE_PACE = 0.5;
/** A new leg is never shorter than this, nor longer than `ROUTE_MAX_LEG_SECONDS` (two keyframes
 *  at depth that are far apart measure an absurd length on screen). */
export const ROUTE_MIN_LEG_SECONDS = 0.2;
export const ROUTE_MAX_LEG_SECONDS = 180;
/** Fixed-point steps in one world unit: the camera's 256 fractional bits. */
export const ROUTE_UNIT = 2 ** 256;
/** How many points of a leg are asked "is this inside the solid". */
export const ROUTE_SOLID_SAMPLES = 9;

const THUMBNAIL_PX = 96;
const SOLID_CHECK_DELAY_MS = 250;
/** How often a depth reading is asked on while its rays are unfinished (as a dive does at take-off). */
const DEPTH_ASKS = 16;

/** The camera of a keyframe. `cam` is three 256-bit fixed-point decimal STRINGS. */
export interface RouteView {
    cam: [string, string, string];
    yaw: number;
    pitch: number;
    /** Left out when it is 0. */
    roll?: number;
}

/** What a key of the route carries (`Keyframe.payload`): the camera, and which way it was going. */
export interface RoutePayload {
    view: RouteView;
    /** A unit vector in the renderer's world axes. Absent: nothing had moved since the last jump. */
    heading?: V3;
}

/** A keyframe as the route reads it off the track. */
export interface RouteKey {
    id: string;
    frame: number;
    depth: number;
    view: RouteView;
    heading?: V3;
}

interface RouteUi {
    /** Bumped when the camera changes hands, so a reader can ask `cameraOnRoute()` again. */
    rev: number;
    /** A picture of each keyframe, by key id, taken when it was set. This session only. */
    thumbnails: Record<string, string>;
    /** By key id: the leg that ARRIVES at this keyframe passes through the solid. */
    solid: Record<string, boolean>;
}
export const useRoute = create<RouteUi>()(() => ({ rev: 0, thumbnails: {}, solid: {} }));
const bump = (): void => useRoute.setState((s) => ({ rev: s.rev + 1 }));

// ── reading the route off the timeline ───────────────────────────────────────────────────────────

const anim = () => useAnimationStore.getState();

function isPayload(p: unknown): p is RoutePayload {
    const v = (p as RoutePayload | null | undefined)?.view;
    return !!v && Array.isArray(v.cam) && v.cam.length === 3 && v.cam.every((c) => typeof c === 'string' && /^-?\d+$/.test(c))
        && Number.isFinite(v.yaw) && Number.isFinite(v.pitch);
}

interface Built {
    depth: Track | undefined;
    iters: Track | undefined;
    keys: RouteKey[];
    path: ZoomPath | null;
    turns: TurnKey[];
}
let built: Built | null = null;
const scratch = new THREE.Quaternion();

/** The route as it stands, rebuilt only when one of its two tracks is another object. */
function route(): Built {
    const tracks = anim().sequence.tracks;
    const depth = tracks[ROUTE_TRACK], iters = tracks[ROUTE_ITERATIONS_TRACK];
    if (built && built.depth === depth && built.iters === iters) return built;
    const keys: RouteKey[] = [];
    for (const k of depth?.keyframes ?? []) {
        // A key nothing here wrote (no camera in it), one with no depth, or a second one at a frame, is not a keyframe.
        if (!isPayload(k.payload) || !validDepth(k.value) || (keys.length > 0 && k.frame <= keys[keys.length - 1].frame)) continue;
        keys.push({ id: k.id, frame: k.frame, depth: k.value, view: k.payload.view, ...(k.payload.heading ? { heading: k.payload.heading } : {}) });
    }
    const zoomKeys: ZoomKey[] = keys.map(zoomKey);
    const turns: TurnKey[] = keys.map((k) => {
        const q = toQuaternion({ yaw: k.view.yaw, pitch: k.view.pitch, roll: k.view.roll ?? 0 }, scratch);
        return { time: k.frame, orientation: [q.x, q.y, q.z, q.w] };
    });
    const path = depth && keys.length > 0
        ? buildZoomPath(zoomKeys, { unit: ROUTE_UNIT, scaleAt: (frame) => animationEngine.evaluateTrack(depth, frame) })
        : null;
    built = { depth, iters, keys, path, turns };
    return built;
}

function zoomKey(k: { frame: number; depth: number; view: RouteView; heading?: V3 }): ZoomKey {
    return { time: k.frame, scale: k.depth, position: [BigInt(k.view.cam[0]), BigInt(k.view.cam[1]), BigInt(k.view.cam[2])], heading: k.heading };
}

/** The route's keyframes, in time order. */
export function routeKeys(): readonly RouteKey[] {
    return route().keys;
}

/** The iteration count keyed for `frame`, or 0 when no count is keyed. */
function itersAt(r: Built, frame: number): number {
    return r.iters && r.iters.keyframes.length > 0 ? Math.max(0, Math.trunc(animationEngine.evaluateTrack(r.iters, frame))) : 0;
}

/**
 * The camera the route gives at `frame`: at a keyframe's own frame its stored view, to the digit;
 * before the first and after the last keyframe, that keyframe's. Null when there is no keyframe.
 * Nothing is set.
 */
export function routeViewAt(frame: number): RouteView | null {
    const r = route(), keys = r.keys, last = keys.length - 1;
    if (last < 0 || !r.path) return null;
    if (frame <= keys[0].frame) return keys[0].view;
    if (frame >= keys[last].frame) return keys[last].view;
    let i = 0, hi = last;                                            // the leg [keys[i], keys[i + 1]] that holds `frame`
    while (hi - i > 1) { const mid = (i + hi) >> 1; if (keys[mid].frame <= frame) i = mid; else hi = mid; }
    if (frame === keys[i].frame) return keys[i].view;
    const p = zoomPathPosition(r.path, frame), q = zoomPathOrientation(r.turns, frame);
    const o = toOrientation(scratch.set(q[0], q[1], q[2], q[3]), keys[i].view.yaw);
    return { cam: [String(p[0]), String(p[1]), String(p[2])], yaw: o.yaw, pitch: o.pitch, ...(o.roll ? { roll: o.roll } : {}) };
}

/**
 * How fast the picture moves at `frame`, in decades a second: the camera's speed over its depth
 * (what `ROUTE_PACE` is a number of). 0 outside the keyframes and with fewer than two.
 */
export function routePaceAt(frame: number, fps: number): number {
    const r = route();
    if (!r.path || !r.depth || r.keys.length < 2 || !(fps > 0)) return 0;
    const a = zoomPathPosition(r.path, frame), b = zoomPathPosition(r.path, frame + 0.5);
    const moved = Math.hypot(Number(b[0] - a[0]), Number(b[1] - a[1]), Number(b[2] - a[2])) / ROUTE_UNIT;
    const depth = animationEngine.evaluateTrack(r.depth, frame + 0.25);
    return moved > 0 && depth > 0 ? (moved / depth) * (fps / 0.5) / Math.LN10 : 0;
}

/** A new leg's length in frames: its length on screen at `ROUTE_PACE` decades a second. */
export function legFrames(from: RouteKey, to: { depth: number; view: RouteView }, fps: number): number {
    const onScreen = zoomLegOnScreen(zoomKey(from), zoomKey({ frame: from.frame + 1, ...to }), ROUTE_UNIT);
    const seconds = Number.isFinite(onScreen) ? onScreen / Math.LN10 / ROUTE_PACE : 0;
    return Math.max(1, Math.round(Math.min(ROUTE_MAX_LEG_SECONDS, Math.max(ROUTE_MIN_LEG_SECONDS, seconds)) * fps));
}

// ── who holds the camera ─────────────────────────────────────────────────────────────────────────

/** The last view the hook handed the host, with the iteration count it carried (0: none keyed). */
type SetView = RouteView & { iters: number };
let lastSet: SetView | null = null;
let lastFrame = NaN;
/** The route drives: `lastSet` is still what the camera shows. */
let driving = false;
/** True while the hook's own `setView` runs: the `viewSet` it raises is not somebody else's. */
let own = false;
/** The next scrub sets the camera whoever holds it (a row, Return, Play). */
let forced = false;
/** The direction of the last move since the last `setView`. */
let heading: V3 | null = null;
/** How many `setView`s there have been (a dive that one of them ended leaves no heading). */
let jumps = 0;

const sameCamera = (a: RouteView, b: RouteView): boolean =>
    a.cam[0] === b.cam[0] && a.cam[1] === b.cam[1] && a.cam[2] === b.cam[2]
    && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);

/** Somebody else moves the camera from here on (the navigation turned it, a dive took off, a jump). */
export function takeCamera(): void {
    if (!driving) return;
    driving = false;
    holdAutoIterations(false);
    bump();
}

/** The route is driving the camera: the last view came from the timeline and nobody has moved it since. */
export const routeDrives = (): boolean => driving;
/** The hook's own `setView` is running (for a `viewSet` listener that must tell it from a jump). */
export const routeSetsView = (): boolean => own;
/** The timeline is playing a route. With no keyframe there is no route: the timeline may play
 *  its other tracks while the hands fly, as it always could. */
export const routePlays = (): boolean => anim().isPlaying && route().keys.length > 0;

/** The navigation moved the camera by (dx, dy, dz): the heading, and the camera is the hands'. */
export function noteMove(dx: number, dy: number, dz: number): void {
    const length = Math.hypot(dx, dy, dz);
    if (length > 0) heading = [dx / length, dy / length, dz / length];
    takeCamera();
}

/** The direction of the last move since the last jump, or null. */
export const headingNow = (): V3 | null => heading;

/** A hand is on the controls: a timeline that is playing a route stops, and the camera is the user's from where it is. */
export function stopRoutePlayback(): void {
    stopAt = null;
    if (routePlays()) anim().pause();
}

/**
 * A dive takes off (`deep-zoom/diveControl.ts`): as for a hand on the controls. Call what it
 * returns when the dive has ended: if it moved the camera and no jump ended it, the view's own
 * direction - what a dive flies along - is the heading.
 */
export function diveBegan(): () => void {
    stopRoutePlayback();
    takeCamera();
    const from = getHost()?.getView().cam, at = jumps;
    return () => {
        const host = getHost();
        if (!host || !from || at !== jumps || host.getView().cam.every((c, i) => c === from[i])) return;
        const look = host.orientation(), across = Math.cos(look.pitch);
        noteMove(across * Math.cos(look.yaw), Math.sin(look.pitch), across * Math.sin(look.yaw));
    };
}

/** True when the camera stands exactly where the route puts it at the playhead (or there is no route). */
export function cameraOnRoute(): boolean {
    const host = getHost(), want = routeViewAt(anim().currentFrame);
    return !host || !want || sameCamera(host.getView(), want);
}

/** One scrubbed frame: the view the route gives there, handed to the host if it is a new one. */
function drive(frame: number): void {
    const host = getHost(), r = route(), view = routeViewAt(frame);
    const sameFrame = frame === lastFrame;
    lastFrame = frame;
    if (!host || !view || !host.bootParams()) return;
    // A scrub of the frame the playhead is on is the timeline tidying up after an edit, not a move
    // of the playhead: it follows the edit only while the camera is the route's.
    if (sameFrame && !driving && !forced) return;
    flushHostSync();                                                 // what the timeline wrote this frame, before its view
    const next: SetView = { ...view, iters: itersAt(r, frame) };
    if (!forced && lastSet && lastSet.iters === next.iters && sameCamera(lastSet, next)) return;
    const { roll: _roll, ...now } = host.getView();                  // every look value as the renderer has it: nothing else changes
    own = true;
    try {
        host.setView({ ...now, cam: view.cam, yaw: view.yaw, pitch: view.pitch, ...(view.roll ? { roll: view.roll } : {}), iters: next.iters || now.iters });
    } finally {
        own = false;
    }
    lastSet = next;
    holdAutoIterations(next.iters > 0);
    if (!driving) { driving = true; bump(); }
}

/** Where a play started here ends, and the last frame it showed. */
let stopAt: number | null = null;
let played = 0;

function onScrub(ctx: ScrubContext): void {
    if (stopAt !== null) {
        if (!ctx.isPlaying) stopAt = null;                           // stopped by hand: a later Play is the timeline's own
        else if (ctx.frame >= stopAt || ctx.frame < played) {        // the end, or the timeline looped past it
            const end = stopAt;
            stopAt = null;
            anim().pause();
            anim().seek(end);
            animationEngine.scrub(end);
            return;
        }
        played = ctx.frame;
    }
    drive(ctx.frame);
}

/** Put the playhead on `frame` and the camera on the route there, whoever held it. */
export function scrubRouteTo(frame: number): void {
    anim().seek(frame);
    forced = true;
    try { animationEngine.scrub(anim().currentFrame); } finally { forced = false; }
}

/** The camera back on the route at the playhead. */
export function returnToRoute(): void {
    scrubRouteTo(anim().currentFrame);
}

function playSpan(from: number, to: number): void {
    anim().pause();
    scrubRouteTo(from);
    stopAt = to;
    played = from;
    anim().play();
}

/** Play from the playhead to the last keyframe and stop there; from the first keyframe when the
 *  playhead is already at or past the last. */
export function playRoute(): void {
    const keys = route().keys;
    if (keys.length < 2) return;
    const end = keys[keys.length - 1].frame, at = anim().currentFrame;
    playSpan(at >= end ? keys[0].frame : at, end);
}

/** Play the leg that arrives at this keyframe - from the one before it - and stop. */
export function playLeg(id: string): void {
    const keys = route().keys, i = keys.findIndex((k) => k.id === id);
    if (i > 0) playSpan(keys[i - 1].frame, keys[i].frame);
}

// ── setting, replacing and deleting a keyframe ───────────────────────────────────────────────────

function ensureTrack(id: string, label: string): void {
    // Not `addTrack`: it takes an undo snapshot of its own, and a keyframe is one step.
    useAnimationStore.setState((s) => (s.sequence.tracks[id] ? s
        : { sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [id]: { id, type: 'float', label, keyframes: [] } } } }));
}

/** The view on screen as a keyframe holds it, with the heading `h`; null when no depth can be read here. */
function capture(host: DeepZoomHost, h: V3 | null | undefined): { depth: number; iters: number; payload: RoutePayload } | null {
    // Unfinished rays read the nearest surface instead of what is looked at: ask on, the camera standing still.
    let reading = readDepth(host);
    for (let i = 0; i < DEPTH_ASKS && reading.sense.open > 0 && !reading.sense.inside; i++) reading = readDepth(host);
    if (!validDepth(reading.depth)) return null;
    const v = host.getView();
    return {
        depth: reading.depth,
        iters: v.iters,
        payload: {
            view: { cam: [v.cam[0], v.cam[1], v.cam[2]], yaw: v.yaw, pitch: v.pitch, ...(v.roll ? { roll: v.roll } : {}) },
            ...(h ? { heading: [h[0], h[1], h[2]] } : {}),
        },
    };
}

/**
 * Set a keyframe from the view on screen. One animation-undo step.
 *   no `frame` (the K key, "Add keyframe"): a new keyframe after the last one, a leg's length away
 *     (the first at frame 0); the timeline grows to hold it and the playhead moves to it. With the
 *     playhead parked on an EARLIER keyframe, that keyframe takes this view instead and keeps its
 *     time. (Parked on the LAST one it still adds: that is where setting a keyframe, and playing
 *     the route, leave the playhead, and "K, fly on, K" has to grow the route.)
 *   `frame` (the timeline's Key Cam): at that frame - the keyframe there, the last included, takes
 *     this view, or a new one goes in at it.
 * Returns the keyframe's id, or null when nothing was set.
 */
export function setKeyframe(frame?: number, opts: { skipSnapshot?: boolean } = {}): string | null {
    const keys = route().keys, whole = Math.max(0, Math.round(frame ?? anim().currentFrame));
    const under = keys.find((k) => Math.abs(k.frame - whole) < 0.5);
    const on = frame === undefined && under === keys[keys.length - 1] ? undefined : under;
    return write(on, frame === undefined ? null : whole, opts.skipSnapshot);
}

/** This keyframe takes the view on screen and keeps its time. One animation-undo step. */
export function replaceKeyframe(id: string): void {
    const key = route().keys.find((k) => k.id === id);
    if (key) write(key, key.frame);
}

/** `on`: the keyframe that takes the view. Without one: a new keyframe at `frame`, or (null) after the last. */
function write(on: RouteKey | undefined, frame: number | null, skipSnapshot = false): string | null {
    const host = getHost();
    if (!host) return null;
    stopAt = null;
    if (anim().isPlaying) anim().pause();                            // setting a keyframe is not done to a running timeline
    const r = route(), keys = r.keys;
    // A keyframe that takes a new VIEW keeps the heading it had: the nudge that framed it is not the way the route goes.
    const shot = capture(host, on ? on.heading : heading);
    if (!shot) { showToast('No depth can be read here: no keyframe was set', 'warning'); return null; }
    if (!skipSnapshot) anim().snapshot();

    let target: number;
    const shaped = on && r.depth?.keyframes.find((k) => k.id === on.id && !(k.interpolation === 'Bezier' && k.autoTangent));
    if (on && shaped) {
        // Handles somebody shaped stay as they are.
        target = on.frame;
        anim().updateKeyframes([{ trackId: ROUTE_TRACK, keyId: on.id, patch: { value: shot.depth, payload: shot.payload } }]);
    } else {
        // A new key; or one whose handles are still the timeline's own, which are worked out again for
        // the new depth (left as they were, a much deeper view would make the curve dip and rise).
        target = on ? on.frame : frame !== null ? frame
            : keys.length === 0 ? 0 : keys[keys.length - 1].frame + legFrames(keys[keys.length - 1], { depth: shot.depth, view: shot.payload.view }, anim().fps);
        ensureTrack(ROUTE_TRACK, 'Depth');
        anim().addKeyframe(ROUTE_TRACK, target, shot.depth, 'Bezier', shot.payload);
    }
    // The count in force, as an ordinary key. Linear: a count has no business overshooting between two keyframes.
    ensureTrack(ROUTE_ITERATIONS_TRACK, 'Iterations');
    const counted = anim().sequence.tracks[ROUTE_ITERATIONS_TRACK].keyframes.find((k) => Math.abs(k.frame - target) < 0.5);
    if (counted) anim().updateKeyframes([{ trackId: ROUTE_ITERATIONS_TRACK, keyId: counted.id, patch: { value: shot.iters } }]);
    else anim().addKeyframe(ROUTE_ITERATIONS_TRACK, target, shot.iters, 'Linear');

    const key = route().keys.find((k) => k.frame === target);
    if (!key) return null;
    const picture = host.thumbnail(THUMBNAIL_PX);
    if (picture) useRoute.setState((s) => ({ thumbnails: { ...s.thumbnails, [key.id]: picture } }));
    if (target > anim().durationFrames) anim().setDuration(target);
    anim().seek(target);
    // The camera already stands on this keyframe: the scrub brings the timeline's values level and sets no view.
    lastSet = { ...key.view, iters: itersAt(route(), target) };
    animationEngine.scrub(target);
    bump();
    const number = route().keys.indexOf(key) + 1;
    showToast(on ? `Keyframe ${number} replaced` : `Keyframe ${number} added`, 'success');
    return key.id;
}

/** Remove a keyframe, and the iteration key at its frame. One animation-undo step. */
export function deleteKeyframe(id: string): void {
    const r = route(), key = r.keys.find((k) => k.id === id);
    if (!key || !r.depth) return;
    anim().snapshot();
    const at = r.depth.keyframes.findIndex((k) => k.id === id), left = r.depth.keyframes.filter((k) => k.id !== id);
    // Its two neighbours' handles, where they are still the timeline's own, pointed at it: worked out again.
    for (const j of [at - 1, at]) {
        const k = left[j];
        if (!k || k.interpolation !== 'Bezier' || !k.autoTangent) continue;
        const { l, r: right } = AnimationMath.calculateTangents(k, left[j - 1], left[j + 1], 'Auto', true);
        left[j] = { ...k, leftTangent: l, rightTangent: right };
    }
    const swaps = [{ trackId: ROUTE_TRACK, newKeys: left }];
    const kept = r.iters?.keyframes.filter((k) => Math.abs(k.frame - key.frame) >= 0.5);
    if (r.iters && kept && kept.length !== r.iters.keyframes.length) swaps.push({ trackId: ROUTE_ITERATIONS_TRACK, newKeys: kept });
    anim().replaceKeyframes(swaps);
    if (driving) animationEngine.scrub(anim().currentFrame);         // the camera is the route's: it follows the edit
    bump();
}

// ── does a leg pass through the solid ────────────────────────────────────────────────────────────

/** Does the leg that arrives at keyframe `index` pass through the solid? `ROUTE_SOLID_SAMPLES`
 *  points along it, each asked of the renderer with the iteration count keyed there. */
export function legInSolid(index: number, host: DeepZoomHost | null = getHost()): boolean {
    const r = route(), a = r.keys[index - 1], b = r.keys[index];
    if (!host || !r.path || !a || !b) return false;
    for (let j = 1; j <= ROUTE_SOLID_SAMPLES; j++) {
        const frame = a.frame + ((b.frame - a.frame) * j) / (ROUTE_SOLID_SAMPLES + 1);
        const p = zoomPathPosition(r.path, frame);
        if (!(host.estimateAtPoint([String(p[0]), String(p[1]), String(p[2])], itersAt(r, frame)) > 0)) return true;
    }
    return false;
}

let solidRun = 0;
/** Ask every leg again, a moment from now and a leg a task; a newer call drops this one. */
function checkLegsSoon(): void {
    const run = ++solidRun;
    const found: Record<string, boolean> = {};
    const step = (index: number): void => {
        const host = getHost(), keys = route().keys;
        if (run !== solidRun || !host || !host.bootParams()) return;   // not ready: `installRoute` asks again at ready
        if (index >= keys.length) {
            const was = useRoute.getState().solid;
            const same = Object.keys(was).length === Object.keys(found).length && Object.keys(found).every((id) => was[id] === found[id]);
            if (!same) useRoute.setState({ solid: found });
            return;
        }
        if (legInSolid(index, host)) found[keys[index].id] = true;
        setTimeout(() => step(index + 1), 0);
    };
    setTimeout(() => step(1), SOLID_CHECK_DELAY_MS);
}

// ── install ──────────────────────────────────────────────────────────────────────────────────────

let installed = false;

/** Call once, after the store exists and before anything can load a sequence. */
export function installRoute(): void {
    if (installed) return;
    installed = true;
    registerPayloadTrack(ROUTE_TRACK);
    registerLogTrack(ROUTE_TRACK);
    registerCameraKeyTracks([{ id: ROUTE_TRACK, releaseOnRecord: false }]);
    setCameraKeyCaptureFn((frame, _tracks, opts) => { setKeyframe(frame, opts); });
    animationEngine.registerScrubHook('post', onScrub);

    // Every `setView` is a jump as far as the heading goes; one that is not the hook's own also takes the camera.
    let offViewSet: (() => void) | null = null;
    const adopt = (host: DeepZoomHost | null): void => {
        offViewSet?.();
        offViewSet = null;
        lastSet = null;                                              // another renderer: nothing set on the old one is on it
        heading = null;
        takeCamera();
        if (!host) return;
        offViewSet = host.on('viewSet', () => {
            heading = null;
            jumps++;
            if (own) return;
            takeCamera();
            bump();
        });
        void host.ready.then(() => { if (getHost() === host) checkLegsSoon(); }, () => undefined);
    };
    subscribeHost(adopt);
    adopt(getHost());

    useAnimationStore.subscribe((s) => s.sequence.tracks[ROUTE_TRACK], checkLegsSoon);
    useAnimationStore.subscribe((s) => s.sequence.tracks[ROUTE_ITERATIONS_TRACK], checkLegsSoon);
}
