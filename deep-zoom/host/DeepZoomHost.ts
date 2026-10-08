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
 *     `setPendingView(`   one parked view, applied by `setView` when `ready` resolves (at once if
 *                         it already has).
 *     `diveTo(`           the host's own loop (`host/dive.ts`) over `moveAlong`, not the module's dive.
 *     `setRecording(` `takePath()` `smoothPath(` `play(` `stopPlay()`   the module's recorder and
 *                         path preview. `takePath` and `smoothPath` return copies.
 *     `seekPath(`         LIVE BUT BY TIME until module package M4: it places the camera at
 *                         `u x the last frame's t`, which is not the arc fraction that `play` and a
 *                         render use, and `ease` is ignored. Fine to look at; not frame-matched.
 *     `renderPathZip(`    the module's own path render. The one member that downloads: the module
 *                         saves the ZIP parts itself.
 *     `cancel()`          ends a render, a path preview and a dive.
 *     `canvas()` `focus()` `setInputEnabled(` `step(` `frameCount()` `dispose()` `on(`
 *     `isCaptured()`      true while the pointer is locked on the canvas. LEAVES AT N5 together with
 *                         the `captureChanged` event, when the engine's navigation takes the input.
 *
 *   OPTIONAL - undefined until the named package. Test before calling (`host.pause?.(true)`) and
 *   show no control for a member that is not there:
 *     `pause?`               M5. The module has no pause today.
 *     `setGradientRamp?`     stage 5 (the PNG interim), then M2.
 *     `renderFramePixels?`   M4. The module cannot render one frame to memory today.
 *     `renderFrameBlob?`     M4.
 *     `exportStill?`         needs a module change: today the module's still export saves the PNG
 *                            itself and hands no blob back, so "the shell saves the blob" cannot be
 *                            honoured. Present once the module returns the blob (M4 or M6).
 *   Optional is the rule for anything the module cannot do yet: a later package adds the
 *   implementation and no existing caller changes.
 *
 *   EVENTS (`on(type, fn)`) in stage 1:
 *     `captureChanged`    live. Leaves at N5.
 *     `contextLost`       live, from the module's context-loss option.
 *     `error`             live for a failed deep compile (`fatal: true`).
 *     `compile`           live for the deep shader only; BLA and variant compiles are not visible
 *                         until M5.
 *     `recordingChanged`  live, found by comparing telemetry samples, so up to 125 ms late.
 *     `progress`          live but read off the module's own status line; `text` is always set,
 *                         the numbers when they can be parsed. Events from the module at M3.
 *     `paramChanged`      never fires in stage 1. From stage 2 by comparing `getParams()`
 *                         (`cause: 'unknown'`), from M3 as an event.
 *
 *   NOT HERE YET, named so nobody adds them twice: `setInputOwner('module' | 'host')` and
 *   `rawDistance()` arrive at N4.
 *
 * PITFALLS
 *   - CAMERA STRINGS. `DzView.cam` holds three BigInt fixed-point numbers (256 fractional bits) as
 *     decimal STRINGS. They never pass through `Number()`, `parseFloat`, a slider or JSON number
 *     syntax: one round trip through a float moves a deep camera off its location. Copy the
 *     strings verbatim. Depth for display comes from telemetry, never from `cam`.
 *   - `thumbnail()` draws through the live GL state and RESTARTS the still's convergence. Do not
 *     call it on a timer or from a render path.
 *   - `setView` is a second writer of look values: besides the camera it sets iterations, power,
 *     phase, light, falloff, colour, colour scale and detail. A jump applies the look through the
 *     feature setters first and hands the host a view whose look fields already equal them.
 *   - `step(now)` takes a TIMESTAMP in milliseconds (`performance.now()`). The engine tick hands
 *     its callback a DELTA in seconds: do not forward it.
 *   - The frame and the dive are tick-driven: a dive advances once after each frame the renderer
 *     ran, so it waits while the engine loop is stopped or a render owns the context. A path
 *     preview and a render's frame waits still run on the browser's own animation frames and keep
 *     going while the engine loop is stopped.
 *   - In stage 1 `ready`, telemetry, `recordingChanged` and `progress` are all read from inside
 *     `step`. With the engine loop stopped none of them arrives.
 *   - `ready` can reject. The implementation attaches its own empty catch so that a rejection
 *     nobody looked at is not an unhandled rejection (the smoke fails on any page error), but a
 *     caller that chains `.then` must add its own `.catch`. A host disposed before it was ready
 *     never settles `ready`.
 *   - `play` and `renderPathZip` force the module's precision mode to deep and never put it back.
 *     The host sends the stored precision again when either resolves.
 *   - `setRecording(true)` throws the previous take away. Take it first.
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
 * A whole view. Exactly the fields a recorded keyframe has, so a saved location and a path frame
 * are interchangeable.
 */
export interface DzView {
    /** Camera position: three BigInt fixed-point decimal STRINGS. Never parse them to numbers. */
    cam: [string, string, string];
    yaw: number;
    pitch: number;
    iters: number;
    power: number;
    phase: [number, number];
    light: number;
    falloff: number;
    color: number;
    cscale: number;
    surf: number;
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
    recording: boolean;
    playing: boolean;
    exporting: boolean;
    pathFrames: number;
    bla: boolean;
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
    what: 'deep' | 'bla' | 'variant';
    error?: string;
};

/** Progress of a long job. `text` is the renderer's own status line as plain text. */
export type DzProgress = {
    job: 'still' | 'frame' | 'sequence';
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
    /** Pointer lock on the render canvas. Leaves at N5. */
    captureChanged: { captured: boolean };
    /** The browser took the WebGL context. No detail: nothing is restored, mount a fresh host. */
    contextLost: null;
    error: { message: string; fatal: boolean };
}

/** One frame rendered to memory. Omit `path` and `u` for the current view. */
export interface DzFrameRequest {
    path?: DzPath;
    /** Arc fraction 0..1 along `path`. */
    u?: number;
    /** True = the ease in and out the module's own playback uses. Off whenever the shell drives `u`. */
    ease?: boolean;
    longEdge: number;
    samples: number;
    tile?: number;
}

export type DzFrameResult<T> =
    | { ok: true; data: T; width: number; height: number }
    | { ok: false; reason: 'busy' | 'no-deep-orbit' | 'cancelled' | 'error'; message?: string };

/** The module's own path render: `frames` frames at `fps`, packed into ZIP parts of PNGs. */
export interface DzSequenceRequest {
    frames: number;
    fps: number;
    longEdge: number;
    samples: number;
    tile?: number;
}

export type DzSequenceResult =
    /** `cancelled: true` with `frames` above 0 = the finished frames were saved as a partial ZIP. */
    | { ok: true; frames: number; zips: number; cancelled: boolean }
    | { ok: false; reason: 'busy' | 'empty-path' | 'cancelled' | 'error'; message?: string };

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
     * say which: compare `telemetry().depth` afterwards. Also ended by `seekPath`, `play`,
     * `renderPathZip` and `dispose`. Before `ready` it resolves at once and moves nothing.
     */
    diveTo(depth: number): Promise<void>;
    /** The current view as a square PNG data URL, 8..512 px ('' when nothing can be drawn yet, or while a render runs). Restarts the still. */
    thumbnail(size?: number): string;

    // gradient
    /**
     * One row of RGBA texels, `width` wide (256 from the palette editor). null = the built-in
     * palette. Resolves when the renderer has taken the ramp: the upload can be asynchronous, and
     * the colour mode must be pushed AFTER it resolves, because loading a ramp flips the module's
     * colour mode by itself. Optional until stage 5.
     */
    setGradientRamp?(rgba: Uint8Array | null, width?: number): Promise<void>;

    // flight
    /** Turning it on throws the previous take away. */
    setRecording(on: boolean): void;
    /** A COPY of the last take (no frames when nothing was recorded). */
    takePath(): DzPath;
    /** Returns a NEW smoothed path; `p` is not changed. */
    smoothPath(p: DzPath, passes?: number, alpha?: number): DzPath;
    /**
     * Place the camera at arc fraction `u` (0..1) along `p`. No frame loop, no clock.
     * Until module package M4 it seeks by TIME and ignores `ease` (see the header).
     */
    seekPath(p: DzPath, u: number, o?: { ease?: boolean }): void;
    /** The module's own eased preview. An empty path resolves at once with `stopped: true`. */
    play(p: DzPath, o?: { frames?: number; fps?: number }): Promise<{ stopped: boolean }>;
    stopPlay(): void;

    // output
    /** RGBA, top row first. Optional until M4. */
    renderFramePixels?(r: DzFrameRequest): Promise<DzFrameResult<Uint8ClampedArray>>;
    /** image/png. Optional until M4. */
    renderFrameBlob?(r: DzFrameRequest): Promise<DzFrameResult<Blob>>;
    /**
     * A still of the current view as a PNG blob. The host never downloads; the shell saves the
     * blob. Optional until the module can hand the blob back (see the header).
     */
    exportStill?(o: { longEdge: number; samples: number; tile?: number }): Promise<DzFrameResult<Blob>>;
    /**
     * The module's own path render with its own smooth-step timing. THE ONE MEMBER THAT DOWNLOADS:
     * the module saves the ZIP parts itself, and a cancelled render still saves the finished frames.
     */
    renderPathZip(p: DzPath, o: DzSequenceRequest): Promise<DzSequenceResult>;
    /** Ends a render, a path preview and a dive. */
    cancel(): void;

    // surface and input
    /** The render canvas (`#dz-render-canvas`). */
    canvas(): HTMLCanvasElement;
    /** Keyboard focus to the picture (`#dz-frame`), so the fly keys reach the renderer. */
    focus(): void;
    /** True while the pointer is locked on the canvas. LEAVES AT N5. */
    isCaptured(): boolean;
    /**
     * false = the renderer ignores keys and mouse (a modal or a text field has the user): held fly
     * keys are dropped and a pointer lock is released. true = back to normal.
     */
    setInputEnabled(on: boolean): void;
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
