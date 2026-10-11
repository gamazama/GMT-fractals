/**
 * deep-zoom/host/DeepZoomHost.ts - the host contract: the one seam between the Deep Zoom shell and
 * its renderer.
 *
 * PURPOSE
 *   The shell (panels, shortcuts, scene files, the timeline) never touches the renderer's
 *   internals. It talks to a `DeepZoomHost`. This file is that interface plus the data shapes that
 *   cross it. Types only: no runtime code and no dependency on any other file, so a node check, a
 *   fake host in a test and the shell all read the same file and none of them pulls the renderer in.
 *
 * THE SEAM
 *   - Implemented by `deep-zoom/host/moduleHost.ts`: `createModuleHost(instance, canvas)` is the
 *     pure adapter over the object `createDeepZoom` returns, `mountDeepZoom(frame, hooks)` is the
 *     DOM half. One implementation; there is no switch between two.
 *   - Who may load `deep-zoom/renderer`: files under `deep-zoom/host/`, and nobody else.
 *     `createDeepZoom`, `instance.api` and `api.dz` appear only there. Every other file in
 *     `deep-zoom/` uses three things: this file (as `import type`), the holder
 *     `deep-zoom/host/current.ts` (`getHost()`, `useHost()`, `subscribeHost()`) and the telemetry
 *     store `deep-zoom/host/telemetry.ts` (`useDzTelemetry(selector)`). `DeepZoomSurface.tsx` is
 *     the one file that also calls `mountDeepZoom`.
 *   - Who drives it: the engine tick. `DeepZoomSurface.tsx` registers one tick that calls
 *     `host.step(performance.now())`; the renderer never schedules its own frame.
 *   - Two DOM ids are part of this contract. The constants live in `deep-zoom/host/current.ts`
 *     (this file holds no values):
 *       `#dz-frame`          `DZ_FRAME_ID`   the focusable div the shell renders inside the engine's
 *                            viewport frame (`<div id="dz-frame" tabIndex={0}>`). It is the key
 *                            target, the size element, the scaffold parent and the canvas's parent.
 *                            It must not shrink-wrap the canvas and must not be 0 x 0 at mount.
 *       `#dz-render-canvas`  `DZ_CANVAS_ID`  the canvas the renderer draws on. Made in code by
 *                            `mountDeepZoom`, appended to `#dz-frame`, removed by `dispose()`.
 *                            Exactly one exists at a time. Never a JSX `<canvas>`: that node
 *                            survives StrictMode's remount and would be handed the old context.
 *   - Dev and smoke access: `globalThis.__appHandles['deep-zoom.host'].ref.current` is the mounted
 *     host or null. Dev server only (grep `__appHandles` in `engine/appHandles.ts`).
 *
 * EVERY MEMBER, AND WHAT IT DOES IN STAGE 1
 *   Three kinds. A later package changes a member's kind by editing this table and the member's
 *   own comment in the same change.
 *
 *   LIVE - required, implemented over a handle the module has today:
 *     `ready`             resolves once the deep shader has compiled (the module's telemetry says
 *                         ready); rejects with a readable message on a compile error or after 120 s
 *                         of running loop (a gap between two steps counts for a second at most).
 *     `setParam(` `setParams(`   store values by id `<feature>.<key>` (an enum param is its option
 *                         index, colour `mode` is GMT's number). The host converts and calls the
 *                         module's own setters (`host/paramMap.ts`, `host/looseParams.ts`); a value
 *                         equal to the last one pushed is dropped, so whole slices may be sent.
 *     `getParams()`       a COPY holding two things: the module's own settings under its own keys
 *                         (detail, reach, power, phase, color, cscale, light, falloff, normals, land,
 *                         frame, accum, lookMode) and, by id, every mapped param the module can
 *                         read back, as the store would hold it. The ids hold a dot; the module's
 *                         keys do not.
 *     `bootParams()`      null until `ready` resolves; from then on one frozen copy of what
 *                         `getParams()` returned at that moment, before the shell pushed anything.
 *     `telemetry()`       the module's sample, read now.
 *     `onTelemetry(`      the same sample as a stream, 8 a second by default, sent from `step`.
 *     `getView()` `setView(` `moveAlong(` `thumbnail(`   straight through to the module.
 *     `setInputOwner(` `rawDistance()` `orientation()` `setOrientation(`   host input (stage N): the
 *                         shell's navigation flies the camera through `moveAlong` and
 *                         `setOrientation` once it has called `setInputOwner('host')`; `rawDistance`
 *                         is the unsmoothed distance its integrator eases itself.
 *     `sense(` `freeDistance(`   the free distance along rays, from the camera as it is now to the
 *                         solid as it is drawn (2026-10-09): `sense` seven rays about an axis, the
 *                         view's by default; `freeDistance` one ray. What the navigation's speed,
 *                         the one-frame limit of a move, the depth readout and the dive go by.
 *     `estimateAt(`       the renderer's own distance estimate at a point beside the camera: the
 *                         nearest surface in any direction, there. Orbit mode's clearance.
 *     `building()`        which shader variant the picture is still waiting for, asked NOW (the
 *                         `compile` event says the same up to 125 ms late): 'rayMarch' or 'mandelbox'
 *                         while it builds in the background and the older march, or the box's plain
 *                         picture, is drawn; null once it is there, has failed, or is not asked
 *                         for. What a render waits on before a frame (`deep-zoom/routeRender.tsx`):
 *                         asked for a frame meanwhile, the renderer holds the whole page until the
 *                         build is done.
 *     `holdLive(on)`      no live frame is drawn while on (`step` still polls), so the canvas keeps
 *                         the last finished frame of a render run between its frames. Off while a
 *                         shader builds: only a frame that runs notices a finished build.
 *     `estimateAtPoint(`  the same estimate at any exact position (camera strings), with a given
 *                         iteration count: 0 inside the solid. What the route asks along each leg
 *                         (`deep-zoom/route.ts`); the camera stays where it is.
 *     `snapshot()`        the picture as a 2D canvas, read back by the renderer itself (a saved PNG).
 *     `setPendingView(`   one parked view, applied by `setView` when `ready` resolves (at once if
 *                         it already has).
 *     `diveTo(`           the host's own loop (`host/dive.ts`) over `moveAlong`, not the module's dive.
 *     `cancel()`          ends a render and a dive.
 *     `canvas()` `focus()` `step(` `frameCount()` `dispose()` `on(`
 *   GONE AT N5 (2026-10-08), with the pointer capture: `isCaptured()`, `setInputEnabled(` and the
 *   `captureChanged` event. Nothing locks the pointer; whether the hands are flying is the
 *   shell's own state (`deep-zoom/navigationState.ts`).
 *   GONE 2026-10-11, with the module's recorder, path preview and path render, which no file of
 *   the shell ever called (the shell flies, keys and renders a route of its own: `deep-zoom/route.ts`,
 *   `routeRender.tsx`): the recorder's switch, the take and its smoothing, the seek along a path,
 *   the preview with its stop, and the render of a path to ZIP parts - seven members - and the two
 *   shapes only they used (the sequence request and its result). The `recordingChanged` event and
 *   the telemetry fields `recording`, `playing` and `pathFrames` are still declared: the module
 *   keeps those three telemetry keys, which now never change.
 *
 *   OPTIONAL - undefined until the named package. Test before calling (`host.pause?.(true)`) and
 *   show no control for a member that is not there:
 *     `pause?`               M5. The module has no pause today.
 *     `setGradientRamp?`     THERE since stage 5 (2026-10-09). Optional in the type only because
 *                            a host without a palette is still a host; `deep-zoom/GradientSync.tsx`
 *                            is its one caller.
 *     `renderFramePixels?`   M4. Nobody needs the raw pixels yet.
 *     `renderFrameBlob?`     THERE since stage R6a (2026-10-11), for the CURRENT view: one frame as
 *                            a PNG blob that depends on the view and the look and nothing else
 *                            (grep `ONE FRAME TO MEMORY` in renderer/core.js). A request that names
 *                            a `path` is refused: the shell's route sets the view itself. Optional
 *                            in the type only so that a fake host in a check need not render.
 *                            `deep-zoom/routeRender.ts` is its one caller.
 *     `exportStill?`         needs a module change: today the module's still export saves the PNG
 *                            itself and hands no blob back, so "the shell saves the blob" cannot be
 *                            honoured. Present once the module returns the blob (M4 or M6).
 *   Optional is the rule for anything the module cannot do yet: a later package adds the
 *   implementation and no existing caller changes.
 *
 *   EVENTS (`on(type, fn)`) in stage 1:
 *     `contextLost`       live, from the module's context-loss option.
 *     `error`             live for a failed deep compile (`fatal: true`).
 *     `compile`           live for the deep shader (`what: 'deep'`) and for the two shaders built
 *                         later, in the background (`what: 'variant'`, named by `variant`): the ray
 *                         march's (`compiling` for the 20 or so seconds it builds while the page's
 *                         march is drawn, then `ready`, or `failed`) and the Mandelbox's (about 5 s
 *                         from the first switch to it; its plain picture is drawn meanwhile).
 *     `recordingChanged`  found by comparing telemetry samples, so up to 125 ms late. Never sent
 *                         since 2026-10-11: the module records nothing any more (see GONE above).
 *     `progress`          live but read off the module's own status line; `text` is always set,
 *                         the numbers when they can be parsed. Events from the module at M3.
 *     `paramChanged`      never fires in stage 1. From stage 2 by comparing `getParams()`
 *                         (`cause: 'unknown'`), from M3 as an event.
 *     `viewSet`           live (2026-10-09): every `setView`, after the module has taken the view.
 *
 *
 * PITFALLS
 *   - CAMERA STRINGS. `DzView.cam` holds three BigInt fixed-point numbers (256 fractional bits) as
 *     decimal STRINGS. They never pass through `Number()`, `parseFloat`, a slider or JSON number
 *     syntax: one round trip through a float moves a deep camera off its location. Copy the
 *     strings verbatim. Depth for display comes from telemetry, never from `cam`.
 *   - `thumbnail()` draws through the live GL state and RESTARTS the still's convergence. Do not
 *     call it on a timer or from a render path.
 *   - `setView` is a second writer of look values: besides the camera it sets iterations, power,
 *     phase, light, falloff, colour, colour scale and detail. A jump writes the formula through
 *     its feature setter first and hands the host a view whose look fields are the store's own
 *     (`viewForHost` in deep-zoom/locations.ts): a place brings a camera and a formula, no more.
 *   - `step(now)` takes a TIMESTAMP in milliseconds (`performance.now()`). The engine tick hands
 *     its callback a DELTA in seconds: do not forward it.
 *   - The frame and the dive are tick-driven: a dive advances once after each frame the renderer
 *     ran, so it waits while the engine loop is stopped or a render owns the context.
 *     (`renderFrameBlob` waits on neither the tick nor an animation frame: it goes on in a hidden
 *     tab, where animation frames stop.)
 *   - In stage 1 `ready`, telemetry, `recordingChanged` and `progress` are all read from inside
 *     `step`. With the engine loop stopped none of them arrives.
 *   - `ready` can reject. The implementation attaches its own empty catch so that a rejection
 *     nobody looked at is not an unhandled rejection (the smoke fails on any page error), but a
 *     caller that chains `.then` must add its own `.catch`. A host disposed before it was ready
 *     never settles `ready`.
 *   - After `contextLost` nothing is restored and telemetry still says ready. Dispose and mount a
 *     fresh host; do not keep calling the old one.
 *   - `getHost()` is null before the surface mounts, between StrictMode's two mounts and across a
 *     context-loss remount. Read it again after every `await`; never keep a host in a closure.
 *
 * @invariant This file has no import, holds only type declarations, and names no browser-window
 *   type, no page-document type and not the renderer's instance type; the only two DOM types in it
 *   are `HTMLCanvasElement` and `Blob` - proven by: npx tsx debug/deep-zoom-checks/host-contract.mts
 *   ("contract: 0 import lines", "contract: types only", the three "contract: no identifier ..."
 *   lines, "contract: the only outside types are HTMLCanvasElement and Blob"). Falsified
 *   2026-10-08, see the check's header.
 * @invariant `DzView`, `DzTelemetry` and `DzPath` here are field for field the shapes the module
 *   exports under the same names, and the module's settings fit `DzParams`, so the adapter passes
 *   them through with no conversion - proven by: npx tsx debug/deep-zoom-checks/host-contract.mts
 *   ("types: the contract's shapes equal the module's"). Falsified 2026-10-08, see the check's header.
 * @assumption The stage-1 column above is what `deep-zoom/host/moduleHost.ts` does. It was written
 *   before that file existed (package S1-0 precedes S1-1), from the module's source. The adapter's
 *   own behaviour is checked against a fake instance by
 *   `npx tsx debug/deep-zoom-checks/module-host.mts`; nothing compares that check with this column
 *   line by line.
 */

/** Call it to stop listening. Safe to call twice. */
export type Unsubscribe = () => void;

// ── data that crosses the seam ───────────────────────────────────────────────────────────────────

/**
 * A whole view. The fields a recorded keyframe has, so a saved location and a path frame are
 * interchangeable, plus the roll.
 */
export interface DzView {
    /** Camera position: three BigInt fixed-point decimal STRINGS. Never parse them to numbers. */
    cam: [string, string, string];
    yaw: number;
    pitch: number;
    /** A turn about the view axis, in radians. Left out when it is 0, and read as 0 when it is not
     *  there, so every view from before the roll is as it was. */
    roll?: number;
    iters: number;
    power: number;
    phase: [number, number];
    light: number;
    falloff: number;
    color: number;
    cscale: number;
    surf: number;
}

/** Which way the camera faces, in radians: the yaw and the pitch of its view axis (pitch within
 *  +-pi/2) and the roll about that axis. */
export interface DzOrientation {
    yaw: number;
    pitch: number;
    roll: number;
}

/** A recorded flight, in the module's own file shape. */
export interface DzPath {
    format: 'gmt-mbulb-path';
    P: number;
    fovScale: number;
    frames: Array<DzView & { t?: number; move?: number; rot?: number }>;
}

/** One sample of the renderer's live state. Every field is a primitive. */
export interface DzTelemetry {
    /** True once the deep shader has compiled. Until then the f32 picture is shown. */
    ready: boolean;
    /** The deep shader's compile error, or ''. */
    error: string;
    mode: 'deep' | 'f32';
    /** Camera distance to the surface = the zoom depth. */
    depth: number;
    fps: number;
    /** The drawn frame's size in pixels. */
    frameW: number;
    frameH: number;
    /** The live iteration count (auto iterations raise it with depth). */
    iters: number;
    power: number;
    /** The still's progress: `accumN` of `accumMax` samples. It drops back when the still restarts. */
    accumN: number;
    accumMax: number;
    /** `recording`, `playing` and `pathFrames`: false, false and 0 for good since 2026-10-11 (the
     *  module records and previews no path any more). The module keeps the three keys. */
    recording: boolean;
    playing: boolean;
    exporting: boolean;
    pathFrames: number;
    bla: boolean;
}

/** What a bundle of rays read (`DeepZoomHost.sense`). Distances are in world units from the camera. */
export interface DzSense {
    /** The nearest of the seven rays: what one frame's move along the axis must stay inside. */
    near: number;
    /** The second nearest: what the speed follows. One stray ray, or a hole one ray wide, cannot set it. */
    second: number;
    /** How many of the seven met the drawn solid. A ray that did not is "open": its distance is how
     *  far it was followed, a LOWER bound. Under 2, `second` is not a distance to anything. */
    hits: number;
    /** How many are open because they ran out of steps short of the far limit: UNFINISHED rays. While
     *  this is above 0, `near` and `second` may be lower bounds; asked again with the camera where it
     *  stood, those rays go on from where they stopped. (An open ray past the far limit is finished:
     *  nothing lies that way.) */
    open: number;
    /** The camera itself is inside the drawn solid (every distance is then 0). */
    inside: boolean;
    /** False: nothing was marched; the answer is the kept bundle, shortened by the camera's move. */
    marched: boolean;
}

export interface DzSenseOptions {
    /** Keep the bundle under this name between calls: asked again for the same axis with the camera
     *  moved less than `reuse` of its nearest ray, it is not marched again; with the camera not
     *  moved at all, rays that ran out of steps go on from where they stopped. */
    slot?: string;
    /** Default 0.05. 0: always march. */
    reuse?: number;
    /** A ray ends where the estimate is under this share of its distance. Default 0.05. */
    tol?: number;
    /** Steps a ray may take in one call. Default 64. */
    maxSteps?: number;
}

/**
 * A renderer parameter id. LOOSE ON PURPOSE in stage 1: any string, because `getParams()` hands
 * back the module's settings under the module's own keys. The package that lands
 * `host/paramMap.ts` (S2-3), or module package M1, narrows this to the union of real ids; code
 * that spells an id as a literal keeps compiling when it does, code that builds ids from strings
 * will not.
 */
export type DzParamId = string;
export type DzParamValue = number | boolean | string | number[];
/** A set of parameter values by id. Also the shape of a patch. */
export type DzParams = Partial<Record<DzParamId, DzParamValue>>;

export type DzCompileState = {
    state: 'compiling' | 'ready' | 'failed';
    what: 'deep' | 'variant';
    /** With `what: 'variant'`: which one. Absent means the ray march's (the only one until 2026-10-09). */
    variant?: 'rayMarch' | 'mandelbox';
    error?: string;
};

/** Progress of a long job. `text` is the renderer's own status line as plain text. */
export type DzProgress = {
    /** 'frame': a `renderFrameBlob` in flight. 'still': any other render of the module's. */
    job: 'still' | 'frame';
    frame?: number;
    total?: number;
    /** 0..1 within the current frame or still. */
    fraction?: number;
    text?: string;
};

export interface DzEvents {
    /** The RENDERER changed a parameter by itself (a view jump, playback, auto iterations). */
    paramChanged: { changes: DzParams; cause: 'key' | 'view' | 'path' | 'auto' | 'unknown' };
    recordingChanged: { recording: boolean; frames: number };
    compile: DzCompileState;
    /** null = the job ended. */
    progress: DzProgress | null;
    /** The browser took the WebGL context. No detail: nothing is restored, mount a fresh host. */
    contextLost: null;
    /** The view was SET (`setView`: a jump to a place, an undo, a loaded scene). Not sent for a
     *  move or a turn. Whoever eases something by the camera's own travel starts afresh on it. */
    viewSet: null;
    error: { message: string; fatal: boolean };
}

/** One frame rendered to memory. Omit `path` and `u` for the current view (the only kind
 *  `renderFrameBlob` takes today). */
export interface DzFrameRequest {
    path?: DzPath;
    /** Arc fraction 0..1 along `path`. */
    u?: number;
    /** True = eased in and out along the path. Off whenever the shell drives `u`. */
    ease?: boolean;
    longEdge: number;
    samples: number;
    tile?: number;
    /** The frame's width over its height. Absent: the picture's own shape at that moment. A
     *  sequence passes one number for all its frames, so a window resized halfway changes nothing. */
    aspect?: number;
}

export type DzFrameResult<T> =
    | { ok: true; data: T; width: number; height: number }
    | { ok: false; reason: 'busy' | 'no-deep-orbit' | 'cancelled' | 'error'; message?: string };

// ── the interface ────────────────────────────────────────────────────────────────────────────────

/** The file header says, member by member, what each one does in stage 1. */
export interface DeepZoomHost {
    /** Resolves when the deep shader has compiled; rejects with a readable message. */
    readonly ready: Promise<void>;

    // parameters
    /** Stage 1: a no-op (see the header). */
    setParam(id: DzParamId, value: DzParamValue): void;
    /** Stage 1: a no-op (see the header). */
    setParams(patch: DzParams): void;
    /** Every parameter the renderer has, read back, as a copy. Stage 1: the module's settings, unmapped. */
    getParams(): DzParams;
    /** The renderer's own values at `ready`, before the shell pushed anything. null before `ready`. */
    bootParams(): DzParams | null;

    // telemetry
    telemetry(): DzTelemetry;
    /** A coalesced stream sent from `step`. `hz` defaults to 8. */
    onTelemetry(fn: (t: DzTelemetry) => void, hz?: number): Unsubscribe;

    // view
    getView(): DzView;
    /** Jump. Also ends a dive, and writes the view's look fields (see the header). */
    setView(v: DzView): void;
    /**
     * Park one view for the host to apply as soon as it can show it: by `setView` when `ready`
     * resolves, at once if it already has. One slot: a later call replaces the parked view, null
     * empties it.
     */
    setPendingView(v: DzView | null): void;
    /** An exact move of `distance` world units along the unit direction `dir`. */
    moveAlong(dir: [number, number, number], distance: number): void;
    /**
     * Fly straight ahead until the surface distance is about `depth`. Resolves on arrival, on a fly
     * key or Escape, on a newer dive or `setView`, on `cancel()`, or when it gives up. It does not
     * say which: compare `telemetry().depth` afterwards. Also ended by `renderFrameBlob` and
     * `dispose`. Before `ready` it resolves at once and moves nothing.
     */
    diveTo(depth: number): Promise<void>;
    /**
     * Who flies the camera: 'module' (its own keys and captured-mouse look) or 'host' (the shell's
     * navigation moves it with `moveAlong` and turns it with `setOrientation`; the module then
     * reads no key and no mouse). The module starts on 'module'.
     */
    setInputOwner(owner: 'module' | 'host'): void;
    /** The surface distance of the last frame, unsmoothed. Telemetry `depth` is eased when it rises. */
    rawDistance(): number;
    /** Which way the camera faces. Cheap: it formats no camera strings. */
    orientation(): DzOrientation;
    /** Turn the camera. Nothing is clamped: a pitch within +-pi/2 is the caller's promise. Restarts the still. */
    setOrientation(yaw: number, pitch: number, roll: number): void;
    /**
     * Seven rays about `axis` (a unit vector in world axes; null or absent: the view axis), marched
     * on the CPU from the camera as it is NOW to the solid as it is DRAWN. Unlike `rawDistance` it
     * looks one way, and it cannot read past the drawn surface. Costs up to a few milliseconds;
     * draws nothing and moves nothing. Works before `ready`.
     */
    sense(axis?: [number, number, number] | null, opt?: DzSenseOptions): DzSense;
    /** One such ray (a pick under the pointer: `tol: 0.005`). `kind` 'open': no surface within the
     *  steps allowed or within 8 units, and `t` is how far the ray was followed. */
    freeDistance(dir: [number, number, number], opt?: { tol?: number; maxSteps?: number }): { t: number; kind: 'hit' | 'open' | 'inside' };
    /**
     * The renderer's distance estimate at the camera moved by `offset` (world units): the nearest
     * surface in ANY direction as the estimate reads it there, 0 inside the drawn solid.
     * `rawDistance()` is this at no offset. What Orbit mode keeps the camera's clearance by. It is
     * a comfort distance - it under-reads on ordinary ground and can over-read beside the drawn
     * surface - so a move is never trusted to it; `sense` is what stops a move.
     */
    estimateAt(offset: [number, number, number]): number;
    /**
     * The same estimate at ANY exact position (three fixed-point decimal strings, as `DzView.cam`),
     * with `iters` iterations (absent: the count in force): 0 inside the solid as it would be drawn
     * with that count. For a point the camera is not at: `estimateAt` takes a double, which cannot
     * reach a point decades deeper than the camera. One reference orbit is built for the call
     * (milliseconds at depth: not for a render path). Moves nothing and draws nothing.
     */
    estimateAtPoint(cam: [string, string, string], iters?: number): number;
    /**
     * The shader variant the picture is waiting for, right now: it is being built in the background
     * and something else is drawn meanwhile. null: none (built, failed, or not asked for). Cheap,
     * draws nothing, works before `ready` (the deep shader itself is `ready`'s business, not this).
     */
    building(): 'rayMarch' | 'mandelbox' | null;
    /**
     * Hold the live picture: while on, `step` still polls (telemetry, progress, compile) but the
     * renderer draws no live frame, so the canvas keeps what was last put on it. A render run
     * holds it between its frames - otherwise each finished frame is followed by a low-resolution
     * live one, and by an empty canvas when the next frame starts. Release it to wait on a shader
     * (a build is only noticed by a frame that runs) and when the run ends.
     */
    holdLive(on: boolean): void;
    /**
     * The picture as it is on screen now, as a new 2D canvas of the frame's own size; null when it
     * cannot be drawn (no renderer, a render in flight). What a saved PNG is made from. Do not
     * copy `canvas()` yourself: once the still is done that copy is empty.
     */
    snapshot(): HTMLCanvasElement | null;
    /** The current view as a square PNG data URL, 8..512 px ('' when nothing can be drawn yet, or while a render runs). Restarts the still. */
    thumbnail(size?: number): string;

    // gradient
    /**
     * One row of RGBA texels, `width` wide (256 from the palette editor). null = the built-in
     * palette. The texels are the surface's albedo as they are, so they arrive LINEAR (a
     * gradient whose `colorSpace` is 'linear' bakes that way). Resolves when the renderer has
     * taken the row; the module host takes it at once and leaves the colour mode alone.
     */
    setGradientRamp?(rgba: Uint8Array | null, width?: number): Promise<void>;

    // output
    /** RGBA, top row first. Optional until M4. */
    renderFramePixels?(r: DzFrameRequest): Promise<DzFrameResult<Uint8ClampedArray>>;
    /**
     * The current view and look as an image/png blob, `longEdge` pixels on its long side at the
     * picture's own aspect. `reason` 'cancelled' after `cancel()`, 'busy' while another render
     * runs, 'no-deep-orbit' before `ready`; a request with `path` is an 'error' (see the header).
     * It never rejects. Telemetry `exporting` is true while it runs, and it does not need `step`.
     */
    renderFrameBlob?(r: DzFrameRequest): Promise<DzFrameResult<Blob>>;
    /**
     * A still of the current view as a PNG blob. The host never downloads; the shell saves the
     * blob. Optional until the module can hand the blob back (see the header).
     */
    exportStill?(o: { longEdge: number; samples: number; tile?: number }): Promise<DzFrameResult<Blob>>;
    /** Ends a render and a dive. */
    cancel(): void;

    // surface and input
    /** The render canvas (`#dz-render-canvas`). */
    canvas(): HTMLCanvasElement;
    /** Keyboard focus to the picture (`#dz-frame`): it leaves whatever text field had it. */
    focus(): void;
    /** Stop and resume drawing. Optional until M5. */
    pause?(on: boolean): void;

    // lifecycle
    /** Run one frame. `now` is a timestamp in milliseconds (`performance.now()`), not a delta. */
    step(now: number): void;
    /** Frames the renderer has run. It rises only while something calls `step`. */
    frameCount(): number;
    /** Stop, free the GL context, remove the canvas. Safe to call twice; `step` does nothing afterwards. */
    dispose(): void;

    on<K extends keyof DzEvents>(type: K, fn: (e: DzEvents[K]) => void): Unsubscribe;
}
