/**
 * deep-zoom/host/moduleHost.ts - the one implementation of the host contract
 * (`deep-zoom/host/DeepZoomHost.ts`), over the object `createDeepZoom` returns.
 *
 * PURPOSE
 *   The shell talks to a `DeepZoomHost`; the renderer is the ported page script behind
 *   `deep-zoom/renderer` (`createDeepZoom`, `instance.api`, `api.dz`). This file is the only place
 *   the two meet. Two halves, so the first can be checked in node with a fake instance:
 *     `createModuleHost(instance, canvas, env?)`  the adapter. Touches no global: the frame is
 *                                                 `canvas.parentElement` (or `env.frame`).
 *     `mountDeepZoom(frame, hooks, create?)`      the DOM half: makes the canvas, appends it to
 *                                                 `frame`, calls `createDeepZoom` with
 *                                                 `shellOptions(frame, hooks)`, returns the host.
 *
 * THE SEAM
 *   - THE ONLY FILE THAT LOADS `deep-zoom/renderer`. `host/dive.ts` gets three functions from here
 *     and loads nothing. Everything else in `deep-zoom/` uses the contract, the holder
 *     (`host/current.ts`) and the telemetry store (`host/telemetry.ts`).
 *   - Called by `deep-zoom/DeepZoomSurface.tsx` (one `mountDeepZoom` per mount, one tick that
 *     calls `host.step(performance.now())`, cleanup `clearHost(host)` then `host.dispose()`).
 *   - `shellOptions(frame, hooks)` is the option table of BLUEPRINT section 7. Every row answers a
 *     PITFALL in the header of `deep-zoom/renderer/index.ts`; do not drop one without reading it.
 *   - Writes the telemetry store: `writeTelemetry` from `step` at most every
 *     `DZ_TELEMETRY_INTERVAL_MS`, `resetTelemetry` in `dispose`.
 *   - Handles the module does not type (`LooseHandles` below) are narrowed here, each with its
 *     grep target in `deep-zoom/renderer/core.js`, and are checked to be functions at mount.
 *
 * PITFALLS - what a maintainer of this file must not undo
 *   - CAMERA STRINGS. `DzView.cam` and every path frame's `cam` are BigInt decimal STRINGS. They go
 *     through here by reference or by copying the string itself. No `Number()`, no `parseFloat`,
 *     no template that re-formats, no JSON round trip.
 *   - THE CANVAS IS MADE HERE, NEVER IN JSX, AND NEVER USED TWICE. A JSX canvas is the same node
 *     across StrictMode's mount, unmount, mount; with `loseContextOnDispose` (which frees the
 *     programs and textures) a disposed canvas has no context left. One mount, one fresh canvas.
 *   - DISPOSE ORDER. `instance.dispose()` first, then `canvas.remove()`: the module releases a
 *     pointer lock, removes its listeners and loses the context while the canvas is still in the
 *     document.
 *   - THE CANVAS IS SIZED BY CLASSES, NOT INLINE STYLE. The module writes `canvas.style.width /
 *     height` itself: empty at its first frame, pixels while its 1:1 view is on (grep
 *     `updateCanvasDisplay` in core.js). An inline 100 % here would be wiped at the first frame.
 *     The classes also take the canvas out of the flow, so the frame cannot shrink-wrap it.
 *   - WHO FLIES. The module starts on its own keys. The shell's navigation calls
 *     `setInputOwner('host')` once per host and from then on moves it with `moveAlong` and turns
 *     it with `setYawPitch`; nothing here listens for a pointer lock any more (stage N5).
 *   - `step(now)` forwards a TIMESTAMP in milliseconds. Everything polled here (`ready`, telemetry,
 *     `compile`, `recordingChanged`, `progress`, the dive) runs from `step` and stops with it.
 *   - The dive advances only after a frame that RAN (`instance.frameCount` rose). While a render
 *     owns the context the module's frame returns early and its distance goes stale.
 *   - `api.lastPath()` hands out the module's live recording array and `api.smoothPath` smooths in
 *     place: `takePath` and `smoothPath` copy.
 *   - `api.playPath` and `api.renderPath` set the module's precision mode to deep and leave it
 *     there - which is where this shell keeps it anyway (`mode: 'deep'` in `shellOptions`; the
 *     shell has had no Precision control since 2026-10-08). They, and the module's dive, tick on
 *     the browser's own animation frames.
 *   - Two previews at once fight over the camera (the first one's end stops the second), and a
 *     preview running under a render moves the camera between rows. `play` ends the one in flight
 *     first; `renderPathZip` stops a preview.
 *   - `thumbnail()` draws through the live GL state. It answers '' during a render instead of
 *     drawing into the render's state, and it restarts the still.
 *   - Never send `api.setBla(true)` from here: it blocks on a shader compile (index.ts, BLOCKING
 *     COMPILES). The parameter table of S2-3 owns that wait.
 *   - After a lost context nothing is restored and telemetry still says ready. This file only
 *     reports it (`contextLost`, once); the surface disposes and mounts fresh.
 *
 * INTERIMS - what each one waits for
 *   - `setParam` / `setParams` take ids `<feature>.<key>` and reach the module's own setters
 *     through `host/looseParams.ts` (one table, `host/paramMap.ts`), until M1 gives the module
 *     set-by-id. `getParams` / `bootParams` return the module's own settings keys AND the mapped
 *     params by id (the ids hold a dot, the module's keys do not).
 *   - `ready`, telemetry, `compile`, `recordingChanged`, `progress` are polled at 8 Hz: events
 *     from the module, M3. `progress` is read off the module's status line in its hidden scaffold
 *     (`statusLineOf`): M3. `compile` sees the deep shader only: BLA and variants, M5.
 *   - `seekPath` goes by time (`api.samplePath`) and ignores `ease`: seek by arc, M4.
 *   - `renderFramePixels`, `renderFrameBlob`, `exportStill` are absent: M4 (the still's blob M4 or
 *     M6). `pause` is absent: M5. `setGradientRamp` is absent: stage 5, then M2.
 *   - `renderPathZip`, `play` and their frame waits run on the browser's animation frames: M4
 *     moves the render path onto `step`.
 *   - `LooseHandles` (`moveAlong` and the recorder) are still untyped in the module: M1.
 *   - The 1:1 view has no rule of its own here (the page centred `.fit1to1`): M1, with the
 *     parameter that turns it on.
 *
 * @invariant `getView` returns the module's `cam` strings, and `setView`, `setPendingView`,
 *   `takePath`, `smoothPath`, `seekPath`, `play` and `renderPathZip` hand the module the caller's,
 *   byte for byte - proven by: npx tsx debug/deep-zoom-checks/module-host.mts ("views: ..." lines).
 *   Falsified 2026-10-08: the "cam strings" group in the check's header.
 * @invariant `shellOptions` returns `autoStart:false, shortcuts:false, dropTarget:null,
 *   pointerLock:false, mode:'deep', farLook:true, resetStillOnResize:true, loseContextOnDispose:true` and
 *   `keyTarget === frame` - proven by: npx tsx debug/deep-zoom-checks/module-host.mts ("options: ..." lines).
 *   Falsified 2026-10-08: the "options" group in the check's header, all seven.
 * @invariant `dispose()` calls the instance's `dispose` before the canvas is removed; a failed
 *   create leaves no canvas behind; the canvas is in the frame before create runs and carries no
 *   inline width or height - proven by: npx tsx debug/deep-zoom-checks/module-host.mts ("dispose:
 *   the instance's dispose runs BEFORE ...", "mount: ..." lines). Falsified 2026-10-08: the
 *   "dispose and mount" group in the check's header.
 * @invariant `bootParams()` is null before ready and a frozen copy taken before the parked view is
 *   applied; a `ready` that rejects, or whose host is disposed from its own error hook, raises no
 *   unhandled rejection; the telemetry store is written at most 8 times a second - proven by:
 *   npx tsx debug/deep-zoom-checks/module-host.mts ("boot: ..." lines, "step: one second of 63
 *   steps ..."). Falsified 2026-10-08: the "boot" and "step" groups in the check's header.
 * @invariant The dive moves only after a frame that ran and not before ready; `setInputOwner`,
 *   `rawDistance`, `yawPitch` and `setYawPitch` reach the module's own handles unchanged;
 *   `focus()` focuses the frame, not the canvas - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("dive: no move while the module's frame does not run",
 *   "dive: before ready ...", "input: ..." lines). Falsified 2026-10-08: the "input" group and
 *   the two "host:" lines of the "dive" group in the check's header.
 * @assumption The signatures in `LooseHandles`, and what this file expects each `api.*` call to do,
 *   were read from core.js on 2026-10-08. core.js is untyped; only the fake instance of the check
 *   and the stage smoke stand behind them. The stage-1 smoke exercises `ready`, `frameCount`,
 *   `getView`, `getParams`, `telemetry` and the option seams; recording, preview, render, dive,
 *   thumbnail and progress have not met the real module.
 * @assumption The classes `absolute inset-0 block h-full w-full` exist in the app's stylesheet
 *   (Tailwind scans `deep-zoom/**`), so the canvas fills `#dz-frame`. Not checked in a browser by
 *   this package.
 */
import { createDeepZoom } from '../renderer';
import type { DeepZoomApi, DeepZoomInstance, DeepZoomOptions } from '../renderer';
import type {
    DeepZoomHost,
    DzEvents,
    DzParams,
    DzPath,
    DzProgress,
    DzSequenceResult,
    DzTelemetry,
    DzView,
    Unsubscribe,
} from './DeepZoomHost';
import { DZ_CANVAS_ID } from './current';
import { createDive } from './dive';
import { createParamPusher } from './looseParams';
import { readParams } from './paramMap';
import { DZ_TELEMETRY_HZ, DZ_TELEMETRY_INTERVAL_MS, resetTelemetry, writeTelemetry } from './telemetry';

/** How long `ready` waits for the deep shader, counted over frames that ran (a gap between two
 *  steps counts for at most a second, so a background tab does not use it up). */
export const DZ_READY_TIMEOUT_MS = 120_000;

/** Seconds a segment of a path without times is given by `seekPath`: the module's own fallback
 *  (grep `(ks.length-1)*1.4` in core.js). */
const UNTIMED_SEGMENT_S = 1.4;

/** What `mountDeepZoom` reports to the component that mounted it. All optional. */
export interface DeepZoomMountHooks {
    /** The module's own messages (the page's `alert(...)` texts). Without it they go to console.warn. */
    onNotice?(message: string): void;
    /** The browser took the WebGL context. Also the host event `contextLost`. Dispose, mount fresh. */
    onContextLost?(): void;
    /** A boot failure: the deep shader failed to compile or did not land in time. Also the host
     *  event `error` with `fatal: true`, and the reason `ready` rejects with. */
    onError?(message: string): void;
}

/** One slot the host fills with its "the context is gone" trigger. The option object has to exist
 *  before the instance, so before the host; this is how the option reaches the host anyway. */
export interface DzContextLostRef {
    current: (() => void) | null;
}

/** What `createModuleHost` takes besides the instance and its canvas. */
export interface ModuleHostEnv {
    /** The module's key target: what `focus()` focuses and where a dive hears the fly keys.
     *  Default: the canvas's parent. */
    frame?: Pick<HTMLElement, 'focus' | 'addEventListener' | 'removeEventListener'> | null;
    /** The module's status line as plain text, or null when it shows none. Without it a `progress`
     *  event carries an empty `text` and no numbers. */
    statusLine?: (() => string | null) | null;
    /** Filled with the host's context-loss trigger, emptied by `dispose`. */
    contextLost?: DzContextLostRef;
    /** See `DeepZoomMountHooks.onError`. */
    onError?(message: string): void;
}

// ── handles the module assigns and `DeepZoomApi` does not type ───────────────────────────────────

/** What `api.renderPath` resolves with (grep `api.renderPath = ` in core.js): `{ error }` when not
 *  ready, busy, empty or too large; `{ cancelled, framesRendered: 0 }` when cancelled before a
 *  frame finished; otherwise the counts, with `cancelled: true` for a partial ZIP. */
interface ModuleRenderResult {
    error?: string;
    cancelled?: boolean;
    framesRendered?: number;
    frames?: number;
    zips?: number;
}

/**
 * Signatures read from core.js on 2026-10-08. Each line names its grep target. They sit behind
 * `DeepZoomApi`'s index signature as `unknown`; `looseHandles` proves each is a function.
 */
interface LooseHandles {
    /** grep `api.moveAlong = `. Adds `dir[j] * dist` to the fixed-point camera, marks the orbit dirty. */
    moveAlong(dir: [number, number, number], dist: number): void;
    /** grep `api.recordToggle = `. Flips recording and returns the NEW state. Starting empties the
     *  take; stopping times and smooths it and, with `embed`, downloads nothing. */
    recordToggle(): boolean;
    /** grep `api.recording = `. */
    recording(): boolean;
    /** grep `api.lastPath = `. `frames` is the module's LIVE array. */
    lastPath(): DzPath;
    /** grep `api.smoothPath = `. Smooths `data.frames` IN PLACE and returns `data`. Defaults: 2
     *  passes, alpha 0.4. */
    smoothPath(data: DzPath, passes?: number, alpha?: number): DzPath;
    /** grep `api.playPath = `. `{ error: 'empty path' }` for no frames; else resolves when the
     *  preview ends, `stopped: true` when `api.stopPlay()` ended it. Sets the mode to deep. */
    playPath(data: DzPath, opts?: { frames?: number; fps?: number }): Promise<{ frames?: number; stopped?: boolean; error?: string }>;
    /** grep `api.renderPath = `. Downloads the ZIP parts itself. Sets the mode to deep. */
    renderPath(
        data: DzPath,
        opts: { frames?: number; fps?: number; longEdge?: number; samples?: number; tile?: number },
    ): Promise<ModuleRenderResult>;
}

const LOOSE_NAMES = ['moveAlong', 'recordToggle', 'recording', 'lastPath', 'smoothPath', 'playPath', 'renderPath'] as const;

function looseHandles(api: DeepZoomApi): LooseHandles {
    const missing = LOOSE_NAMES.filter((name) => typeof api[name] !== 'function');
    if (missing.length > 0) {
        throw new Error(`The deep renderer has no api.${missing.join(', api.')} (core.js changed; see LooseHandles in deep-zoom/host/moduleHost.ts).`);
    }
    // A type-graft, not a conversion: core.js is untyped JavaScript and these members are `unknown`
    // behind DeepZoomApi's index signature. The object is the same, so calls keep `api` as `this`.
    return api as unknown as LooseHandles;
}

// ── small pure helpers ───────────────────────────────────────────────────────────────────────────

type PathFrame = DzPath['frames'][number];

/** A frame of its own. The `cam` strings are the same strings, not re-made. */
function copyFrame(f: PathFrame): PathFrame {
    return { ...f, cam: [f.cam[0], f.cam[1], f.cam[2]], phase: [f.phase[0], f.phase[1]] };
}

function copyPath(p: DzPath): DzPath {
    return { ...p, frames: p.frames.map(copyFrame) };
}

/** `p` when its frames carry times (a finished take does), else a copy timed at an even pace. */
function timedPath(p: DzPath): DzPath {
    const last = p.frames[p.frames.length - 1]?.t;
    if (p.frames.length < 2 || (typeof last === 'number' && last > 0)) return p;
    return { ...p, frames: p.frames.map((f, i) => ({ ...f, t: i * UNTIMED_SEGMENT_S })) };
}

function frozenParams(p: DzParams): DzParams {
    const out: DzParams = {};
    for (const [key, value] of Object.entries(p)) {
        // Frozen at run time; the contract's value type has no readonly array to say so.
        out[key] = Array.isArray(value) ? (Object.freeze([...value]) as number[]) : value;
    }
    return Object.freeze(out);
}

/** The module's status line as the first line of plain text: the spinner and the page's own hint
 *  under it (which names keys the shell has switched off) are dropped. */
function statusText(html: string): string {
    return html
        .split(/<br\s*\/?>/i)[0]
        .replace(/<span class="spin">[^<]*<\/span>/i, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** `frame 3/120` and `45%` out of the status line, when they are there. */
function progressOf(job: DzProgress['job'], text: string): DzProgress {
    const progress: DzProgress = { job, text };
    const frame = /frame (\d+)\/(\d+)/.exec(text);
    if (frame) {
        progress.frame = parseInt(frame[1], 10);
        progress.total = parseInt(frame[2], 10);
    }
    const percent = /(\d+)%/.exec(text);
    if (percent) progress.fraction = parseInt(percent[1], 10) / 100;
    return progress;
}

function sequenceResult(r: ModuleRenderResult | null | undefined): DzSequenceResult {
    if (!r) return { ok: false, reason: 'error', message: 'The renderer returned nothing.' };
    if (typeof r.error === 'string') {
        if (r.error === 'empty path') return { ok: false, reason: 'empty-path', message: r.error };
        if (/busy|not ready/.test(r.error)) return { ok: false, reason: 'busy', message: r.error };
        return { ok: false, reason: 'error', message: r.error };
    }
    const frames = r.frames ?? 0;
    if (!(frames > 0)) return { ok: false, reason: r.cancelled ? 'cancelled' : 'error' };
    return { ok: true, frames, zips: r.zips ?? 0, cancelled: !!r.cancelled };
}

function reportThrow(what: string, err: unknown): void {
    console.error(`[deep-zoom] ${what} threw`, err);
}

// ── the adapter ──────────────────────────────────────────────────────────────────────────────────

/**
 * The host over one instance. Pure adapter: it makes no element and reaches no global. `canvas` is
 * the canvas the instance was created on; `dispose()` removes it.
 */
export function createModuleHost(instance: DeepZoomInstance, canvas: HTMLCanvasElement, env: ModuleHostEnv = {}): DeepZoomHost {
    const api = instance.api;
    const dz = api.dz;
    const loose = looseHandles(api);
    const params = createParamPusher(api);
    /** The module's own settings keys, with the mapped params by id over them (see `getParams`). */
    const currentParams = (): DzParams => ({ ...dz.settings(), ...readParams(api) });
    const frame = env.frame === undefined ? canvas.parentElement : env.frame;

    let disposed = false;
    let isReady = false;
    let bootFailed = false;
    let boot: DzParams | null = null;
    let pendingView: DzView | null = null;

    let resolveReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    // The host's own catch (contract, PITFALLS): a rejection nobody chained on must not surface as
    // an unhandled rejection. StrictMode's first mount is disposed before anyone looks at `ready`.
    ready.catch(() => undefined);

    // ── events ──
    // One map for every event. A set is stored as `(e: never) => void` because the payload type
    // depends on the key; `on` only ever adds a listener of the key's own event.
    const listeners = new Map<keyof DzEvents, Set<(e: never) => void>>();
    function emit<K extends keyof DzEvents>(type: K, e: DzEvents[K]): void {
        const set = listeners.get(type);
        if (!set) return;
        for (const fn of [...set]) {
            try { (fn as (e: DzEvents[K]) => void)(e); } catch (err) { reportThrow(`a "${type}" listener`, err); }
        }
    }

    interface TelemetrySub { fn(t: DzTelemetry): void; everyMs: number; last: number }
    const telemetrySubs = new Set<TelemetrySub>();

    // ── the dive ──
    const dive = createDive({
        depth: () => dz.telemetry().depth,
        look: () => dz.getView(),
        moveAlong: (dir, distance) => loose.moveAlong(dir, distance),
        keyTarget: frame,
    });

    // ── context loss ──
    let lostSent = false;
    const signalContextLost = (): void => {
        if (lostSent || disposed) return;
        lostSent = true;
        emit('contextLost', null);
    };
    if (env.contextLost) env.contextLost.current = signalContextLost;

    // ── what `step` polls ──
    let lastPoll = -Infinity;
    let lastStep: number | null = null;
    let waitedMs = 0;
    let compileSaid: 'compiling' | 'ready' | 'failed' | null = null;
    let wasRecording = false;
    let jobShown = false;
    let lastStatus = '';
    /** `renderPathZip` calls in flight: tells a sequence from a still in `progress`. */
    let sequences = 0;
    let playRun: Promise<unknown> | null = null;

    function failBoot(message: string): void {
        if (bootFailed) return;
        bootFailed = true;
        emit('error', { message, fatal: true });
        env.onError?.(message);
        if (!disposed) rejectReady(new Error(message));
    }

    function poll(t: DzTelemetry): void {
        if (t.ready) {
            if (!isReady) {
                isReady = true;
                // Before the parked view (which writes look values) and before anyone hears "ready".
                boot = frozenParams(currentParams());
                const parked = pendingView;
                pendingView = null;
                if (parked) host.setView(parked);
                compileSaid = 'ready';
                emit('compile', { state: 'ready', what: 'deep' });
                if (!disposed) resolveReady();
            }
        } else if (t.error) {
            if (compileSaid !== 'failed') {
                compileSaid = 'failed';
                emit('compile', { state: 'failed', what: 'deep', error: t.error });
                failBoot(`The deep renderer failed to compile: ${t.error.slice(0, 400)}`);
            }
        } else {
            if (compileSaid === null) {
                compileSaid = 'compiling';
                emit('compile', { state: 'compiling', what: 'deep' });
            }
            if (waitedMs > DZ_READY_TIMEOUT_MS) failBoot('The deep renderer did not finish compiling within 120 s.');
        }

        if (t.recording !== wasRecording) {
            wasRecording = t.recording;
            emit('recordingChanged', { recording: t.recording, frames: t.pathFrames });
        }

        if (t.exporting) {
            const text = env.statusLine?.() ?? '';
            if (!jobShown || text !== lastStatus) {
                jobShown = true;
                lastStatus = text;
                emit('progress', progressOf(sequences > 0 ? 'sequence' : 'still', text));
            }
        } else if (jobShown) {
            jobShown = false;
            lastStatus = '';
            emit('progress', null);
        }
    }

    const host: DeepZoomHost = {
        ready,

        // parameters: ids `<feature>.<key>` through host/looseParams.ts (see INTERIMS)
        setParam: (id, value) => params.push({ [id]: value }),
        setParams: (patch) => params.push(patch),
        getParams: currentParams,
        bootParams: () => boot,

        telemetry: () => dz.telemetry(),
        onTelemetry(fn, hz) {
            const rate = typeof hz === 'number' && hz > 0 ? hz : DZ_TELEMETRY_HZ;
            const sub: TelemetrySub = { fn, everyMs: 1000 / rate, last: -Infinity };
            telemetrySubs.add(sub);
            return () => { telemetrySubs.delete(sub); };
        },

        // view: the objects go through untouched (CAMERA STRINGS)
        getView: () => dz.getView(),
        setView(v) {
            dive.cancel();
            dz.setView(v);
        },
        setPendingView(v) {
            if (v && isReady) { host.setView(v); return; }
            pendingView = v;
        },
        // host input (stage N): the shell's navigation flies the camera through these
        setInputOwner: (owner) => dz.setInputOwner(owner),
        rawDistance: () => dz.rawDistance(),
        yawPitch: () => dz.yawPitch(),
        setYawPitch: (yaw, pitch) => dz.setYawPitch(yaw, pitch),
        moveAlong: (dir, distance) => loose.moveAlong(dir, distance),
        diveTo(depth) {
            // Not before the deep shader: until then the module flies on its f32 distance, good to
            // about 1e-13, and the prototype's loop never ran in that state (its bridge did not
            // exist before ready). The dive gives up at once; the caller sees the depth unchanged.
            if (disposed || !isReady) return Promise.resolve();
            return dive.start(depth);
        },
        snapshot: () => (disposed ? null : dz.snapshot()),
        thumbnail(size) {
            // A render owns the GL state between its rows; a thumbnail drawn into it corrupts the frame.
            if (dz.telemetry().exporting) return '';
            return dz.thumbnail(size);
        },

        // flight
        setRecording(on) {
            if (loose.recording() !== on) loose.recordToggle();
        },
        takePath: () => copyPath(loose.lastPath()),
        smoothPath(p, passes, alpha) {
            const copy = copyPath(p);
            loose.smoothPath(copy, passes, alpha);
            return copy;
        },
        seekPath(p, u) {
            if (p.frames.length === 0) return;
            dive.cancel();
            const timed = timedPath(p);
            const end = timed.frames[timed.frames.length - 1].t ?? 0;
            api.samplePath(timed, (u > 0 ? Math.min(1, u) : 0) * end);
        },
        async play(p, o) {
            if (disposed || p.frames.length === 0) return { stopped: true };
            dive.cancel();
            // One preview at a time: the module's loops share one flag (see PITFALLS).
            while (playRun) {
                api.stopPlay();
                await playRun;
            }
            if (disposed) return { stopped: true };
            const run = loose.playPath(p, o);
            const settled = run.then(() => undefined, () => undefined);
            playRun = settled;
            try {
                const r = await run;
                return { stopped: !!(r && (r.stopped || r.error)) };
            } finally {
                if (playRun === settled) playRun = null;
            }
        },
        stopPlay: () => api.stopPlay(),

        // output
        async renderPathZip(p, o) {
            if (disposed) return { ok: false, reason: 'cancelled' };
            if (p.frames.length === 0) return { ok: false, reason: 'empty-path' };
            dive.cancel();
            api.stopPlay();
            sequences++;
            try {
                return sequenceResult(await loose.renderPath(p, {
                    frames: o.frames, fps: o.fps, longEdge: o.longEdge, samples: o.samples, tile: o.tile,
                }));
            } catch (err) {
                return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
            } finally {
                sequences--;
            }
        },
        cancel() {
            dive.cancel();
            api.cancelRender();
            api.stopPlay();
        },

        // surface and input
        canvas: () => canvas,
        focus: () => frame?.focus({ preventScroll: true }),

        // lifecycle
        step(now) {
            if (disposed) return;
            const before = instance.frameCount;
            instance.step(now);
            if (instance.frameCount !== before) dive.advance(now);
            if (instance.contextLost) signalContextLost();
            if (disposed) return;   // a listener may have disposed the host

            if (!isReady && !bootFailed && lastStep !== null) waitedMs += Math.min(1000, Math.max(0, now - lastStep));
            lastStep = now;

            const pollDue = now - lastPoll >= DZ_TELEMETRY_INTERVAL_MS;
            const subsDue = [...telemetrySubs].filter((sub) => now - sub.last >= sub.everyMs);
            if (!pollDue && subsDue.length === 0) return;
            const t = dz.telemetry();
            if (pollDue) {
                lastPoll = now;
                writeTelemetry(t);
                poll(t);
            }
            for (const sub of subsDue) {
                if (disposed) return;
                if (!telemetrySubs.has(sub)) continue;
                sub.last = now;
                try { sub.fn(t); } catch (err) { reportThrow('a telemetry listener', err); }
            }
        },
        frameCount: () => instance.frameCount,
        dispose() {
            if (disposed) return;
            disposed = true;
            dive.cancel();
            params.dispose();
            if (env.contextLost) env.contextLost.current = null;
            listeners.clear();
            telemetrySubs.clear();
            try {
                instance.dispose();   // first: see DISPOSE ORDER
            } finally {
                canvas.remove();
                resetTelemetry();
            }
        },

        on(type, fn): Unsubscribe {
            let set = listeners.get(type);
            if (!set) listeners.set(type, (set = new Set()));
            set.add(fn);
            let live = true;   // a second call must not remove a later subscription of the same function
            return () => {
                if (!live) return;
                live = false;
                listeners.get(type)?.delete(fn);
            };
        },
    };
    return host;
}

// ── the DOM half ─────────────────────────────────────────────────────────────────────────────────

/**
 * The options the shell creates the module with: BLUEPRINT section 7's table. `hostContextLost` is
 * the slot `createModuleHost` fills, so the module's context-loss callback reaches the host event.
 */
export function shellOptions(frame: HTMLElement, hooks: DeepZoomMountHooks = {}, hostContextLost?: DzContextLostRef): DeepZoomOptions {
    return {
        embed: true,                    // the module's own panels never open; a stopped recording stays in memory
        autoStart: false,               // the engine tick calls step; the module schedules no frame of its own
        publishOnWindow: false,         // nothing on window
        keyTarget: frame,               // keys reach the module only while the picture has focus
        shortcuts: false,               // the engine's dispatcher owns every one-shot key
        dropTarget: null,               // the engine's drop zone owns drops
        pointerLock: false,             // no click listener in the module; nothing takes the pointer
        mode: 'deep',                   // the deep path at every depth; f32 only until its shader has compiled
        farLook: true,                  // far ground (all of a shallow view) takes the palette, not the page's grey
        resetStillOnResize: true,       // a dock resize restarts the still
        loseContextOnDispose: true,     // a remount frees every program and texture; each mount gets a fresh canvas
        sizeElement: frame,
        scaffoldParent: frame,
        onNotice: hooks.onNotice ? (message) => hooks.onNotice?.(message) : undefined,
        onContextLost: () => {
            hostContextLost?.current?.();
            hooks.onContextLost?.();
        },
    };
}

/** Reads the module's status line out of its hidden scaffold (grep `function showProg` and
 *  `data-deep-zoom-scaffold` in core.js). Interim until the module sends progress itself (M3). */
function statusLineOf(frame: HTMLElement): () => string | null {
    return () => {
        const loading = frame.querySelector<HTMLElement>('[data-deep-zoom-scaffold] #loading');
        if (!loading || loading.style.display === 'none') return null;
        return statusText(loading.querySelector('.box')?.innerHTML ?? '');
    };
}

/**
 * Mount the renderer in `frame` (the shell's `#dz-frame`: focusable, sized by its own layout, not
 * 0 x 0). Throws `Error('WebGL2 unavailable')` when the browser gives no WebGL2 context; nothing is
 * left in `frame` then. `create` is `createDeepZoom`; the check passes a fake.
 */
export function mountDeepZoom(
    frame: HTMLElement,
    hooks: DeepZoomMountHooks = {},
    create: typeof createDeepZoom = createDeepZoom,
): DeepZoomHost {
    const canvas = frame.ownerDocument.createElement('canvas');
    canvas.id = DZ_CANVAS_ID;
    // Classes, not inline width / height (see PITFALLS).
    canvas.className = 'absolute inset-0 block h-full w-full';
    frame.appendChild(canvas);

    const hostContextLost: DzContextLostRef = { current: null };
    let instance: DeepZoomInstance;
    try {
        instance = create(canvas, shellOptions(frame, hooks, hostContextLost));
    } catch (err) {
        canvas.remove();
        throw err;
    }
    try {
        return createModuleHost(instance, canvas, {
            frame,
            statusLine: statusLineOf(frame),
            contextLost: hostContextLost,
            onError: hooks.onError,
        });
    } catch (err) {
        try { instance.dispose(); } finally { canvas.remove(); }
        throw err;
    }
}
