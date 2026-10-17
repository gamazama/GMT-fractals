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
 *     it with `setOrientation`; nothing here listens for a pointer lock any more (stage N5).
 *   - `step(now)` forwards a TIMESTAMP in milliseconds. Everything polled here (`ready`, telemetry,
 *     `compile`, `progress`, the dive) runs from `step` and stops with it.
 *   - The dive advances only after a frame that RAN (`instance.frameCount` rose). While a render
 *     owns the context the module's frame returns early and its distance goes stale.
 *   - THE MODULE'S RECORDER, PATH PREVIEW AND PATH RENDER ARE GONE (2026-10-11), and with them the
 *     seven members that reached them (`setRecording`, `takePath`, `smoothPath`, `seekPath`, `play`,
 *     `stopPlay`, `renderPathZip`): nothing in the shell called one. The last of it went the same
 *     day in a second step: the calls of `api.stopPlay()` before a frame render and in `cancel`
 *     (the module no longer has it), the `recordingChanged` event, and the "frame N/M" numbers of
 *     `progress`, which only the module's path render wrote.
 *   - `thumbnail()` draws through the live GL state. It answers '' during a render instead of
 *     drawing into the render's state, and it restarts the still.
 *   - A RAY MARCH THAT CANNOT BE BUILT IS THE APP'S BOOT FAILURE, NOT ANOTHER MARCH (2026-10-11; grep
 *     `DZ_RAY_FAILED_TEXT`). The bulb has one program. When the module says it failed
 *     (`api.rayMarchState()` 'failed', telemetry `error` set), `poll` says `compile` failed twice
 *     (by name, and what 'deep') and calls `failBoot` with that line and the compiler's own words
 *     under it: the fatal `error` event, the mount's `onError` (the surface takes the host down
 *     and shows its failure card), `ready` rejected. The owner: "If the ray shader fails to build
 *     on a machine, that machine is likely gonna die trying to render the mandelbulb at high zoom
 *     - so I wouldnt want an alternative based on that, rather an error". (For some hours that
 *     day the host was left up instead, with a notice and a toast over the plain picture: `ready`
 *     never resolved there, so no control moved anything. Do not bring that back.)
 *   - After a lost context nothing is restored and telemetry still says ready. This file only
 *     reports it (`contextLost`, once); the surface disposes and mounts fresh.
 *
 * INTERIMS - what each one waits for
 *   - `setParam` / `setParams` take ids `<feature>.<key>` and reach the module's own setters
 *     through `host/looseParams.ts` (one table, `host/paramMap.ts`), until M1 gives the module
 *     set-by-id. `getParams` / `bootParams` return the module's own settings keys AND the mapped
 *     params by id (the ids hold a dot, the module's keys do not).
 *   - `ready`, telemetry, `compile`, `progress` are polled at 8 Hz: events
 *     from the module, M3. `progress` is read off the module's status line in its hidden scaffold
 *     (`statusLineOf`): M3. `compile` sees the deep shader - the ray march's program, also said
 *     under that name - and the Mandelbox's, built from the first switch to it.
 *   - `renderFramePixels` and `exportStill` are absent: M4 (the still's blob M4 or M6). `pause` is
 *     absent: M5. `renderFrameBlob` is there for the current view only (stage R6a, 2026-10-11),
 *     over `api.dz.renderFrame`; its width and height are read off the PNG's own header.
 *   - `LooseHandles` (`moveAlong`) is still untyped in the module: M1.
 *   - The 1:1 view has no rule of its own here (the page centred `.fit1to1`): M1, with the
 *     parameter that turns it on.
 *
 * @invariant `getView` returns the module's `cam` strings, and `setView` and `setPendingView` hand
 *   the module the caller's, byte for byte - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("views: ..." lines). Falsified 2026-10-08: the "cam
 *   strings" group in the check's header.
 * @invariant `viewParked()` is true from the moment a view is parked until it is applied at ready,
 *   or the slot is emptied, and never after ready - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("views: the host says a view is parked from the moment
 *   one is ...", "views: a view is parked for as long as the renderer builds ..."). Falsified
 *   2026-10-12: see the "parked" group in the check's header.
 * @invariant `shellOptions` returns `autoStart:false, shortcuts:false, dropTarget:null,
 *   pointerLock:false, mode:'deep', farLook:true, rebaseOrigin:true, farHandOff:0.5, holdEstimate:true, resetStillOnResize:true, loseContextOnDispose:true` and
 *   `keyTarget === frame` - proven by: npx tsx debug/deep-zoom-checks/module-host.mts ("options: ..." lines).
 *   Falsified 2026-10-08: the "options" group in the check's header, all seven; `rebaseOrigin` the same day
 *   (the line removed from `shellOptions` -> "options: rebaseOrigin is true" FAIL), `farHandOff` likewise, and
 *   `holdEstimate` on 2026-10-09 (the line removed -> "options: holdEstimate is true" FAIL and "options: every
 *   option core.d.ts declares is set here" FAIL). (`rayMarch:true` was in this list from 2026-10-09 until the
 *   module lost the option, 2026-10-11: the ray march is the bulb's only program.)
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
 *   `rawDistance`, `orientation`, `setOrientation`, `sense`, `freeDistance` and `estimateAt` reach
 *   the module's own handles unchanged; `focus()` focuses the frame, not the canvas - proven by: npx
 *   tsx debug/deep-zoom-checks/module-host.mts ("dive: no move while the module's frame does not
 *   run", "dive: before ready ...", "input: ..." lines). Falsified 2026-10-08: the "input" group
 *   and the two "host:" lines of the "dive" group in the check's header; `sense` / `freeDistance`
 *   on 2026-10-09 and `setOrientation` on 2026-10-10 (the same group).
 * @assumption `lookPoint` and `wholeObject` (2026-10-12, for "Julia from this place") reach the
 *   module's own handles unchanged, and a view's `julia` strings pass through `setView` /
 *   `getView` byte for byte. The check has lines for all three ("input: lookPoint ...", "input:
 *   wholeObject ...", "views: a view's Julia constant ..."); none was broken on purpose.
 * @assumption `setView` tells the param pusher of a Julia constant the view BROUGHT (one that is not
 *   the constant the module already held), so the Constant row put back onto its doubles sends its
 *   strings (host/looseParams.ts, THE CONSTANT). The check has one line ("views: a Julia constant
 *   that came with a view is kept exact ..."), not broken on purpose; the pusher's own half is
 *   proven in check:deep-zoom-param-map.
 * @invariant A dive closes on the free distance AHEAD (the nearest of seven rays about the view
 *   axis), not on the estimate at the camera: with a wall close behind and the surface ahead far
 *   away it flies; inside the solid, or with nothing ahead at all, it ends at once; rays that ran
 *   out of steps are asked on before a distance is read - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("dive: it closes on what is ahead ...", "dive: nothing
 *   ahead ...", "dive: unfinished rays ...") and, on the real GPU at the power-4 place,
 *   `npm run smoke:deep-zoom -- --stage N5` ("a dive from there closes on what is ahead").
 *   Falsified 2026-10-09, see the check's header and the step's own record.
 * @invariant `renderFrameBlob` is refused while another render runs ('busy') without asking the
 *   module, and a disposed host renders nothing - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("render: renderFrameBlob while a render runs is busy
 *   ...", "render: a disposed host renders no frame"). Falsified 2026-10-11: the `exporting` test
 *   removed -> both red.
 * @invariant `building()` names the ray march only while `api.rayMarchState()` says 'building' and
 *   null once that shader is there, has failed or is not asked for - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("input: building() names the ray march while its
 *   shader builds, and nothing once it is there, has failed or is off"). Falsified 2026-10-11:
 *   `=== 'building'` made `!== 'on'` -> that line red.
 * @invariant A ray march that cannot be built is the boot failure, said with `DZ_RAY_FAILED_TEXT`:
 *   one fatal `error` event and one call of the mount's `onError`, both with a message that begins
 *   with that line, and `ready` rejected with it - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("boot: a ray march that cannot be built is the boot
 *   failure ...", "... rejects ready with that line ..."). Falsified 2026-10-11: the test
 *   `!isReady && rayNow === 'failed'` in `poll` made always false (the ray failure worded as any
 *   other shader's) -> those two lines red, the other 163 green.
 * @invariant `setLevers` hands the module the levers a patch names and no other, each by the
 *   module's own setter - a ray number with the bits in force and without the other five numbers -
 *   and `diagnostics()` gives no gate reading while the gate is off - proven by: npx tsx
 *   debug/deep-zoom-checks/module-host.mts ("levers: setLevers hands the module the one lever a
 *   patch names, by its own setter, and no other", "levers: a ray number goes with the bits in
 *   force and no other number; the bits go alone", "levers: the gate, the path and the rebase reach
 *   their setters; with the gate off there is no reading"). Falsified 2026-10-12, one break a
 *   line: the far hand-off's line taken out of `setLevers`; a ray patch sent with all six numbers
 *   read back; the `!gateOn` test taken out of the reading. 1 red each.
 * @assumption THE GATE'S SWITCH IS KEPT HERE, AND STARTS ON. The module has `setGate` and no
 *   read-back, so `diagnostics().levers.gate` is what this host last set, true before it set
 *   anything - which is what the module starts with (grep `let gateOn` in renderer/core.js, read
 *   2026-10-12). Should the module's start value change, the Diagnostics tab's switch is wrong
 *   until it is first clicked. Its reading comes from `api.gate`, a record `DeepZoomApi` does not
 *   type (grep `api.gate = gate`): three finite numbers or no reading.
 * @assumption What the user then sees - the failure card with that line, no picture, no chip - was
 *   seen once in the app with the real module and a browser made to refuse that one program
 *   (debug/scratch/r7/ray-fail.mts, git-ignored, 2026-10-11). No standing guard opens that page.
 * @assumption The rest of `building()` - the Mandelbox answered from `api.formulaState()` alone, a
 *   disposed host waiting for nothing - is the same file's two other "input: ... building ..." /
 *   "input: a disposed host ..." lines, which pass and were not broken on purpose. That the real
 *   module's two state handles say 'building' from the moment a variant is asked for until it is
 *   there (never 'off' in between, so a wait on this cannot be skipped) was read in core.js (grep
 *   `api.rayMarchState`, `api.formulaState`) and seen in the app: debug/scratch/r6/first-minute.mts.
 * @assumption The rest of `renderFrameBlob` - the module's own blob handed back with the size in
 *   its PNG header, a cancel and a rejection as results, 'frame' as its progress job - is checked
 *   by the same file's other six "render: ... frame ..." lines, which pass and were not broken
 *   on purpose. What the real `api.dz.renderFrame` draws was measured in the app
 *   (debug/scratch/r6/, git-ignored).
 * @assumption The signatures in `LooseHandles`, and what this file expects each `api.*` call to do,
 *   were read from core.js on 2026-10-08. core.js is untyped; only the fake instance of the check
 *   and the stage smoke stand behind them. The stage-1 smoke exercises `ready`, `frameCount`,
 *   `getView`, `getParams`, `telemetry` and the option seams, and the stage-2 smoke a dive and
 *   the thumbnail; `progress` has not met the real module in a standing check.
 * @assumption The classes `absolute inset-0 block h-full w-full` exist in the app's stylesheet
 *   (Tailwind scans `deep-zoom/**`), so the canvas fills `#dz-frame`. Not checked in a browser by
 *   this package.
 */
import { pngSize } from '../../engine/export/frameFolder';
import { createDeepZoom } from '../renderer';
import type { DeepZoomApi, DeepZoomInstance, DeepZoomOptions } from '../renderer';
import type {
    DeepZoomHost,
    DzEvents,
    DzParams,
    DzProgress,
    DzTelemetry,
    DzView,
    Unsubscribe,
} from './DeepZoomHost';
import { DZ_CANVAS_ID, DZ_RAY_FAILED_TEXT } from './current';
import { createDive } from './dive';
import { createParamPusher } from './looseParams';
import { readParams } from './paramMap';
import { DZ_TELEMETRY_HZ, DZ_TELEMETRY_INTERVAL_MS, resetTelemetry, writeTelemetry } from './telemetry';

/** How long `ready` waits for the deep shader, counted over frames that ran (a gap between two
 *  steps counts for at most a second, so a background tab does not use it up). */
export const DZ_READY_TIMEOUT_MS = 120_000;

/** The slot the dive's bundle is kept under in the renderer, and how often it is asked on while
 *  rays are unfinished (64 steps an ask: 16 asks carry a ray 1000 steps). */
const DZ_DIVE_SLOT = 'dive';
const DZ_DIVE_ASKS = 16;
/** The share of its nearest ray the camera may have moved for the dive's kept bundle to be taken
 *  again: none that a move can be. A kept bundle is every ray shortened by the distance moved,
 *  which is exact for the middle ray only, and a dive decides its ARRIVAL by this reading: with the
 *  renderer's default (a twentieth) a dive to 1e-60 once stopped 1.7 % short of it (2026-10-09,
 *  smoke stage N5 on a busy machine; three runs alone landed on it). So a camera that has moved is
 *  marched afresh, and only one standing where it stood is answered from the kept rays - which is
 *  what lets unfinished rays go on (0 would switch that off too: it means "always march"). */
const DZ_DIVE_REUSE = 1e-9;

/** What `mountDeepZoom` reports to the component that mounted it. All optional. */
export interface DeepZoomMountHooks {
    /** The module's own messages (the page's `alert(...)` texts). Without it they go to console.warn. */
    onNotice?(message: string): void;
    /** The browser took the WebGL context. Also the host event `contextLost`. Dispose, mount fresh. */
    onContextLost?(): void;
    /** A boot failure: the deep shader could not be built (the ray march's program: the message
     *  begins with `DZ_RAY_FAILED_TEXT`; or the Mandelbox's) or did not land within 120 s. Also the
     *  host event `error` with `fatal: true`, and the reason `ready` rejects with. */
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

/**
 * Signatures read from core.js on 2026-10-08. Each line names its grep target. They sit behind
 * `DeepZoomApi`'s index signature as `unknown`; `looseHandles` proves each is a function.
 * (Until 2026-10-11 the recorder's six handles were here too; they went with the module's path code.)
 */
interface LooseHandles {
    /** grep `api.moveAlong = `. Adds `dir[j] * dist` to the fixed-point camera, marks the orbit dirty. */
    moveAlong(dir: [number, number, number], dist: number): void;
}

const LOOSE_NAMES = ['moveAlong'] as const;

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

/** `45%` out of the status line, when it is there. (Until 2026-10-11 also `frame 3/120`, which only
 *  the module's own path render wrote; the shell counts its route's frames itself.) */
function progressOf(job: DzProgress['job'], text: string): DzProgress {
    const progress: DzProgress = { job, text };
    const percent = /(\d+)%/.exec(text);
    if (percent) progress.fraction = parseInt(percent[1], 10) / 100;
    return progress;
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
    let liveHeld = false;   // `holdLive`: `step` polls but does not draw
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
    // What a dive closes on: the nearest of seven rays about the view axis, as of the camera now.
    // 0 inside the solid (the dive ends); NaN when no ray met anything (nothing ahead: it ends too).
    // A ray that ran out of steps is a LOWER BOUND, not a distance - read as one, a dive from beside
    // a wall saw "already that deep" and never took off (seen 2026-10-09 at the power-4 place: the
    // first ask reads 5.6e-71, the surface ahead is at 3e-54). So unfinished rays are asked on, the
    // camera standing still, until they have met the surface or left the scene; that costs a few
    // asks once, at take-off, and nothing in flight (the camera is then away from the wall).
    const aheadOf = (): number => {
        const ask = () => dz.sense(null, { slot: DZ_DIVE_SLOT, reuse: DZ_DIVE_REUSE });
        let s = ask();
        for (let i = 0; i < DZ_DIVE_ASKS && s.open > 0 && !s.inside; i++) s = ask();
        if (s.inside) return 0;
        return s.hits === 0 ? NaN : s.near;
    };
    const dive = createDive({
        depth: aheadOf,
        look: () => dz.getView(),
        moveAlong: (dir, distance) => loose.moveAlong(dir, distance),
        keyTarget: frame,
    });

    // ── the developer levers ──
    // The gate has a setter and no read-back in the module, so its switch is kept here, starting
    // where the module starts (grep `let gateOn` in renderer/core.js: on). Its last reading is the
    // module's own record `api.gate` (grep `api.gate = gate`), which `DeepZoomApi` does not type:
    // read with care, and a reading that is not three finite numbers is no reading.
    let gateOn = true;
    const gateReading = (): { relT: number; gpu: number; cpu: number } | null => {
        if (!gateOn) return null;
        const g = api.gate as { relT?: unknown; tGPU?: unknown; tCPU?: unknown } | null | undefined;
        const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
        return g && fin(g.relT) && fin(g.tGPU) && fin(g.tCPU) ? { relT: g.relT, gpu: g.tGPU, cpu: g.tCPU } : null;
    };

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
    let raySaid: 'compiling' | 'ready' | 'failed' = 'ready';      // the ray march's shader (the bulb's one program): said from the first poll, while it builds
    let boxSaid: 'compiling' | 'ready' | 'failed' = 'ready';      // the Mandelbox's, likewise: it builds from the first switch to that formula
    let kaliSaid: 'compiling' | 'ready' | 'failed' = 'ready';     // and KaliBox's (its own variant of the box's program)
    let jobShown = false;
    let lastStatus = '';
    /** `renderFrameBlob` calls in flight: tells a frame from a still in `progress`. */
    let frames = 0;

    function failBoot(message: string): void {
        if (bootFailed) return;
        bootFailed = true;
        emit('error', { message, fatal: true });
        env.onError?.(message);
        if (!disposed) rejectReady(new Error(message));
    }

    function poll(t: DzTelemetry): void {
        // The ray march's shader is the bulb's one program and builds in the background from the moment the module
        // is created; the plain picture is drawn until it is there. `compile` events with what 'variant' let the shell
        // say WHAT is building (the owner, 2026-10-09: "it needs some indication").
        const rayNow = api.rayMarchState();
        const raySay = rayNow === 'building' ? 'compiling' : rayNow === 'failed' ? 'failed' : 'ready';
        if (raySay !== raySaid) { raySaid = raySay; emit('compile', { state: raySay, what: 'variant', variant: 'rayMarch' }); }
        // The Mandelbox's shader, the same way. `formulaState` speaks for the SELECTED formula, and for the bulb that
        // is the deep shader itself, which `what: 'deep'` already reports: it is asked only while the box is selected.
        const kindNow = api.formula().kind;
        const boxNow = kindNow === 'mandelbox' ? api.formulaState() : 'on';
        const boxSay = boxNow === 'building' ? 'compiling' : boxNow === 'failed' ? 'failed' : 'ready';
        if (boxSay !== boxSaid) { boxSaid = boxSay; emit('compile', { state: boxSay, what: 'variant', variant: 'mandelbox' }); }
        // KaliBox's, the same way again: a third program, named so the shell can say which one is building.
        const kaliNow = kindNow === 'kalibox' ? api.formulaState() : 'on';
        const kaliSay = kaliNow === 'building' ? 'compiling' : kaliNow === 'failed' ? 'failed' : 'ready';
        if (kaliSay !== kaliSaid) { kaliSaid = kaliSay; emit('compile', { state: kaliSay, what: 'variant', variant: 'kalibox' }); }
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
                // The bulb's one program, before it was ever ready: the boot failure, in the line that says what it
                // means (see PITFALLS), with the compiler's own words under it. Any other telemetry error (today: the
                // Mandelbox's shader) keeps the wording it always had.
                failBoot(!isReady && rayNow === 'failed'
                    ? `${DZ_RAY_FAILED_TEXT}\n\n${t.error.slice(0, 400)}`
                    : `The deep renderer failed to compile: ${t.error.slice(0, 400)}`);
            }
        } else {
            if (compileSaid === null) {
                compileSaid = 'compiling';
                emit('compile', { state: 'compiling', what: 'deep' });
            }
            if (waitedMs > DZ_READY_TIMEOUT_MS) failBoot('The deep renderer did not finish compiling within 120 s.');
        }

        if (t.exporting) {
            const text = env.statusLine?.() ?? '';
            if (!jobShown || text !== lastStatus) {
                jobShown = true;
                lastStatus = text;
                emit('progress', progressOf(frames > 0 ? 'frame' : 'still', text));
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
            const brought = Array.isArray(v.julia) ? v.julia.join() : null;
            const held = brought === null ? null : api.formula().c.join();
            dz.setView(v);
            // A Julia constant this view BROUGHT is kept exact for the Constant row's undo (looseParams.ts, THE
            // CONSTANT). One the renderer already held is not noted again: a route's frame hands back the view it
            // read, and a keyed constant would otherwise fill the eight places in eight frames.
            if (brought !== null && brought !== held) params.constantArrived();
            emit('viewSet', null);
        },
        setPendingView(v) {
            if (v && isReady) { host.setView(v); return; }
            pendingView = v;
        },
        viewParked: () => pendingView !== null,
        // host input (stage N): the shell's navigation flies the camera through these
        setInputOwner: (owner) => dz.setInputOwner(owner),
        rawDistance: () => dz.rawDistance(),
        orientation: () => dz.orientation(),
        setOrientation: (yaw, pitch, roll) => dz.setOrientation(yaw, pitch, roll),
        sense: (axis, opt) => dz.sense(axis, opt),
        freeDistance: (dir, opt) => dz.freeDistance(dir, opt),
        estimateAt: (offset) => dz.estimateAt(offset),
        estimateAtPoint: (cam, iters) => dz.estimateAtPoint(cam, iters),
        lookPoint: (opt) => dz.lookPoint(opt),
        wholeObject: () => dz.wholeObject(),
        // The same two questions `poll` asks for the `compile` event, answered now. The box draws with a variant of
        // its own and the ray march is not in force under it, so one of the two is asked, never both. A build that
        // FAILED answers null: nothing is being waited for (and the host is about to be taken down).
        building() {
            if (disposed) return null;
            const kind = api.formula().kind;
            if (kind === 'mandelbox' || kind === 'kalibox') return api.formulaState() === 'building' ? kind : null;
            return api.rayMarchState() === 'building' ? 'rayMarch' : null;
        },
        holdLive(on) { liveHeld = !!on; },
        // the developer levers: the module's own typed setters and read-backs, nothing kept here but the gate's switch
        diagnostics() {
            const march = api.marchLevers();
            const compileMs: Record<string, number> = {};
            for (const [key, ms] of Object.entries(api.compileMs())) if (typeof ms === 'number') compileMs[key] = ms;
            return {
                levers: { gate: gateOn, mode: march.mode, rebaseOrigin: march.rebaseOrigin, farHandOff: march.farHandOff, ray: { ...api.rayMarch() } },
                rayMarch: api.rayMarchState(),
                formula: api.formulaState(),
                compileMs,
                gate: gateReading(),
            };
        },
        setLevers(patch) {
            if (disposed) return;
            if (patch.gate !== undefined) { gateOn = !!patch.gate; api.setGate(gateOn); }
            if (patch.mode !== undefined) api.setMode(patch.mode);
            if (patch.rebaseOrigin !== undefined) api.setRebaseOrigin(!!patch.rebaseOrigin);
            if (patch.farHandOff !== undefined) api.setFarHandOff(patch.farHandOff);
            if (patch.ray) {
                // One setter takes the bits and, by name, the numbers; a number it is not given stays.
                const { bits, ...numbers } = patch.ray;
                api.setRayMarch(bits ?? api.rayMarch().bits, numbers);
            }
        },
        moveAlong: (dir, distance) => loose.moveAlong(dir, distance),
        diveTo(depth) {
            // Not before the deep shader: until then the module flies on its f32 distance, good to
            // about 1e-13, and the prototype's loop never ran in that state (its bridge did not
            // exist before ready). The dive gives up at once; the caller sees the depth unchanged.
            if (disposed || !isReady) return Promise.resolve('stopped');
            return dive.start(depth);
        },
        // gradient: texels straight to the module's strip, at once. The colour mode is not touched
        // (grep `setGradientTexels` in renderer/core.js); the promise is the contract's shape.
        setGradientRamp(rgba, width) {
            if (!disposed) {
                if (rgba) api.setGradientTexels(rgba, width);
                else api.clearGradient();
            }
            return Promise.resolve();
        },

        snapshot: () => (disposed ? null : dz.snapshot()),
        thumbnail(size) {
            // A render owns the GL state between its rows; a thumbnail drawn into it corrupts the frame.
            if (dz.telemetry().exporting) return '';
            return dz.thumbnail(size);
        },

        // output
        async renderFrameBlob(r) {
            if (disposed) return { ok: false, reason: 'cancelled' };
            if (r.path) return { ok: false, reason: 'error', message: 'renderFrameBlob renders the current view only.' };
            if (!isReady) return { ok: false, reason: 'no-deep-orbit' };
            if (dz.telemetry().exporting) return { ok: false, reason: 'busy' };
            dive.cancel();
            frames++;
            try {
                const png = await dz.renderFrame({ longEdge: r.longEdge, samples: r.samples, tile: r.tile, aspect: r.aspect });
                if (!png) return { ok: false, reason: 'cancelled' };
                const size = await pngSize(png);
                return { ok: true, data: png, width: size?.width ?? 0, height: size?.height ?? 0 };
            } catch (err) {
                return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
            } finally {
                frames--;
            }
        },
        cancel() {
            dive.cancel();
            api.cancelRender();
        },

        // surface and input
        canvas: () => canvas,
        focus: () => frame?.focus({ preventScroll: true }),

        // lifecycle
        step(now) {
            if (disposed) return;
            const before = instance.frameCount;
            if (!liveHeld) instance.step(now);   // a render run holds the live picture between its frames (`holdLive`)
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
        embed: true,                    // the module's own panels never open
        autoStart: false,               // the engine tick calls step; the module schedules no frame of its own
        publishOnWindow: false,         // nothing on window
        keyTarget: frame,               // keys reach the module only while the picture has focus
        shortcuts: false,               // the engine's dispatcher owns every one-shot key
        dropTarget: null,               // the engine's drop zone owns drops
        pointerLock: false,             // no click listener in the module; nothing takes the pointer
        mode: 'deep',                   // the deep path at every depth; f32 only until its shader has compiled
        farLook: true,                  // far ground (all of a shallow view) takes the palette, not the page's grey
        rebaseOrigin: true,             // the kernel's precision repair (grep REBASE TO THE ORIGIN in renderer/core.js); the page's kernel draws grain where orbits pass the origin
        // (no `rayMarch` row since 2026-10-11: the ray march is the bulb's only program and the module no longer has the option)
        farHandOff: 0.5,                // the deep march carries a ray this far before the f32 far-field march takes it (grep FAR HAND-OFF); the page's 1e-3 leaves noisy hits in views shallower than about 1e-2
        holdEstimate: true,             // a count too low for the camera's orbit to escape keeps the last distance instead of reading 0 (grep HOLD THE ESTIMATE in renderer/core.js): without it a still that starts while the count recovers shows a faint second picture
        formula: 'mandelbulb',          // the module starts on its default; the store's choice (dzFormula.kind) is sent with every other value at ready (useHostSync.ts)
        formulaParams: undefined,       // likewise: the box's numbers arrive through setFormula, not at create
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
