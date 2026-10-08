/**
 * module-host - the check for package S1-1: `deep-zoom/host/moduleHost.ts` (the one implementation
 * of the host contract) and `deep-zoom/host/dive.ts`. Node only: no browser, no WebGL, about 2 s.
 *
 *   npx tsx debug/deep-zoom-checks/module-host.mts      (exit 1 on any FAIL)
 *
 * Everything runs against a FAKE instance (`makeRig` below): an object with the members
 * `createDeepZoom` returns, whose `api` records every call. The fake copies what was read in
 * `deep-zoom/renderer/core.js` on 2026-10-08 (its `api.smoothPath` smooths in place, its
 * `api.lastPath` hands out the live array, its distance is refreshed only by a frame that ran).
 * So this proves the ADAPTER, not the module: what the real module does behind each handle is
 * listed as `@assumption` in `moduleHost.ts` and belongs to the stage smoke.
 *
 *   [1] options    `shellOptions`: the six values of the BUILD-PLAN row, `keyTarget === frame`,
 *                  the two callbacks, and a decision for every option `core.d.ts` declares.
 *   [2] views      three 80-digit `cam` strings byte-identical through `getView`, `setView`,
 *                  `setPendingView`, `takePath`, `smoothPath`, `seekPath`, `play`, `renderPathZip`.
 *   [3] boot       `bootParams`, `ready` (resolve, reject, never settle, 120 s), `compile`, `error`.
 *   [4] step       the timestamp, `frameCount`, the store at 8 Hz, `onTelemetry`, context loss.
 *   [5] input      `focus`, `isCaptured`, `captureChanged`, `setInputEnabled`.
 *   [6] flight     recording, copies, seek by time, one preview at a time.
 *   [7] render     the result mapping, `progress`, `cancel`, `thumbnail`.
 *   [8] dive       `dive.ts` alone, then through the host.
 *   [9] dispose    the order, twice, listeners gone.
 *   [10] mount     the DOM half with a fake `create`.
 *   [11] params    the stage-1 no-op.
 *   [12] seam      who under `deep-zoom/host/` loads the renderer.
 *
 * FALSIFIED 2026-10-08: 54 breaks, each applied alone to `moduleHost.ts` or `dive.ts`. The check
 * exited 1 every time and the file was restored byte for byte afterwards (sha-256 compared). The
 * break, then how many lines went red and which:
 *   cam strings (the build plan's "wrap one in `Number()`")
 *     `getView` returns `String(Number(cam[0]))` -> 2: "views: getView returns the module's three
 *       cam strings byte-identical", "views: getView after setView ..."
 *     `setView` sends it -> 4: "views: setView hands the module ...", "... getView after setView",
 *       both "views: a parked view ..." / "a view parked after ready ..." lines
 *     `copyFrame` makes it -> 2: "views: takePath returns the take ...", "views: smoothPath hands ..."
 *     `timedPath` makes it -> 1: "views: seekPath on a path without times ..."
 *     `play` / `renderPathZip` hand the module a copy of the path -> 2 / 1: "views: play hands ...",
 *       "views: renderPathZip hands ..."
 *     `smoothPath` without its copy -> 1: "views: smoothPath returns a new path ..."
 *     `seekPath` made a no-op -> 3: the three "views: seekPath ..." lines that sample
 *   options (the build plan's "flip one"; all seven were flipped)
 *     shortcuts true, dropTarget frame, autoStart true, pointerLock true, loseContextOnDispose
 *       false -> 1 each: its own "options: <name> is <value>"
 *     keyTarget dropped -> 3: "options: keyTarget === frame", "options: every option core.d.ts
 *       declares is set here", "mount: create receives shellOptions(frame, hooks)"
 *     resetStillOnResize dropped -> 2: its own line and "options: every option ..."
 *     the host slot not called from onContextLost -> 1: "options: onContextLost reaches the host slot ..."
 *   dispose and mount (the build plan's "remove the canvas before the instance's dispose")
 *     `canvas.remove()` before `instance.dispose()` -> 2: "dispose: the instance's dispose runs
 *       BEFORE the canvas is removed", "mount: host.dispose() disposes the instance, then ..."
 *     a failed create leaves the canvas -> 1: "mount: and the canvas it made is removed ..."
 *     the canvas appended after create -> 1: "mount: the canvas is in the frame before create ..."
 *     inline width / height written on the canvas -> 1: "mount: the canvas is taken out of the flow ..."
 *     the pointerlockchange listener left on -> 2: "dispose: the pointerlockchange listener is
 *       removed", "dispose: no event and no store write after dispose"
 *   boot
 *     the snapshot taken after the parked view -> 1: "boot: the snapshot is the module's settings ..."
 *     not frozen -> 1: "boot: bootParams is frozen ..."; answering before ready -> 3: "boot:
 *       bootParams is null before the first step" and two more
 *     the host's own catch on `ready` removed -> 3: "boot: a rejected ready that nobody chained on
 *       raises no unhandled rejection", the error-hook line, "the whole run raised ..."
 *     rejecting although disposed -> 1: "boot: a host disposed from its own error hook ..."
 *     a compile error that does not reject -> 2; no 120 s limit -> 1: "boot: ready rejects after
 *       120 s ..."; a gap counted in full -> 2: "boot: a ten-minute gap ..." and the next line
 *   step
 *     telemetry written on every step -> 1: "step: one second of 63 steps writes the telemetry
 *       store 8 times (8 Hz)"
 *     the timestamp not forwarded -> 1; `frameCount()` a constant -> 1; context loss not polled
 *       -> 1; a throwing listener not caught -> 2: "step: a listener that throws ..." and the next
 *   input
 *     no `exitPointerLock` -> 4: "input: setInputEnabled(false) also exits the pointer lock" first
 *     `lockInput(on)` instead of `(!on)` -> 2; `focus()` on the canvas -> 2: "input: focus()
 *       focuses the frame ...", "mount: host.focus() focuses the frame"
 *   flight and render
 *     `setRecording` always toggles -> 3; previews not serialised -> 2: "flight: a second play
 *       stops the preview in flight first ..."; a render that does not stop a preview -> 1;
 *       `thumbnail` drawn during a render -> 1; the whole loading box instead of its first line
 *       -> 1: "mount: progress reads the first line ..."; `setParam` saying so every time -> 1
 *   dive
 *     host: advancing without a frame that ran -> 2: "dive: no move while the module's frame does
 *       not run ...", "dive: and it resumes ..."; host: a dive allowed before ready -> 1
 *     no 0.95 x target clamp -> 3: "dive: six head-on dives each land ...", the 1e-77 line, the
 *       host line; half the distance per frame -> 1: "dive: no move is more than a fifth ..."
 *     `cancel` a no-op -> 5; keys ignored -> 3; no time limit -> 1; no 1e-77 floor -> 1; a gap
 *       counted in full -> 1; a finished dive not cleared -> 7
 *   seam
 *     `dive.ts` given a type import of the renderer -> 2: both "seam: ..." lines about the tree
 * NOT falsified: every line not named above (among them the result mapping of `renderPathZip`
 * line by line, `recordingChanged`, `captureChanged`, `compile`'s order, the forward vector, and
 * "a module without a handle the host needs"). They pass; nothing here has shown they can fail.
 * NOT checked at all, by anything in node: what the real module does behind each handle. See the
 * `@assumption` lines in `deep-zoom/host/moduleHost.ts`.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { DZ_CANVAS_ID } from '../../deep-zoom/host/current';
import { DZ_DIVE_MIN_DEPTH, DZ_DIVE_TIME_LIMIT_MS, createDive } from '../../deep-zoom/host/dive';
import { DZ_READY_TIMEOUT_MS, createModuleHost, mountDeepZoom, shellOptions } from '../../deep-zoom/host/moduleHost';
import { getTelemetry, subscribeTelemetry } from '../../deep-zoom/host/telemetry';
import type { DeepZoomHost, DzPath, DzProgress, DzTelemetry, DzView } from '../../deep-zoom/host/DeepZoomHost';
import type { DeepZoomInstance, DeepZoomOptions, createDeepZoom } from '../../deep-zoom/renderer';

/** The third argument of `mountDeepZoom`: the check hands it a fake so no WebGL is needed. */
type Create = typeof createDeepZoom;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let failures = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? `\n       ${detail}` : ''}`);
    if (!ok) failures++;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
/** What a promise has done after `ms`. Attaches handlers, so use it only after the unhandled test. */
const stateOf = (p: Promise<unknown>, ms = 20): Promise<'pending' | 'resolved' | 'rejected'> =>
    Promise.race([p.then(() => 'resolved' as const, () => 'rejected' as const), sleep(ms).then(() => 'pending' as const)]);
/** The message a promise rejected with, or `(resolved)` / `(pending)`. Never waits for a promise
 *  that does not settle, so a host whose `ready` hangs is a FAIL line and not a stuck run. */
const rejectionOf = (p: Promise<unknown>, ms = 20): Promise<string> =>
    Promise.race([p.then(() => '(resolved)', (e: unknown) => (e instanceof Error ? e.message : String(e))), sleep(ms).then(() => '(pending)')]);

const unhandled: unknown[] = [];
process.on('unhandledRejection', (reason) => { unhandled.push(reason); });

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────

/** Three 80-digit fixed-point strings. Each differs from its nearest double far below the top
 *  digits, so one trip through a float changes it. */
const CAM_A: [string, string, string] = [
    '12345678901234567890123456789012345678901234567890123456789012345678901234567891',
    '-98765432109876543210987654321098765432109876543210987654321098765432109876543219',
    '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
];
const CAM_B: [string, string, string] = [
    '-55555555555555555555555555555555555555555555555555555555555555555555555555555557',
    '31415926535897932384626433832795028841971693993751058209749445923078164062862089',
    '27182818284590452353602874713526624977572470936999595749669676277240766303535475',
];
const CAM_C: [string, string, string] = [
    '99999999999999999999999999999999999999999999999999999999999999999999999999999999',
    '-10000000000000000000000000000000000000000000000000000000000000000000000000000003',
    '40000000000000000000000000000000000000000000000000000000000000000000000000000007',
];

const view = (cam: [string, string, string], over: Partial<DzView> = {}): DzView => ({
    cam: [cam[0], cam[1], cam[2]], yaw: 0, pitch: 0, iters: 48, power: 8, phase: [0, 0],
    light: 1, falloff: 1, color: 0, cscale: 1, surf: 1, ...over,
});
const pathOf = (cams: Array<[string, string, string]>, times?: number[]): DzPath => ({
    format: 'gmt-mbulb-path', P: 256, fovScale: 1.1,
    frames: cams.map((cam, i) => (times ? { ...view(cam), t: times[i], move: 0.4, rot: 0.1 } : view(cam))),
});
const sameCam = (got: unknown, want: [string, string, string]): boolean =>
    Array.isArray(got) && got.length === 3 && got.every((s, i) => typeof s === 'string' && s === want[i]);

/** An EventTarget that counts who is listening, so "the listener was removed" can be asserted. */
class CountingTarget extends EventTarget {
    private counts = new Map<string, number>();
    override addEventListener(type: string, fn: EventListenerOrEventListenerObject | null, o?: AddEventListenerOptions | boolean): void {
        this.counts.set(type, this.count(type) + 1);
        super.addEventListener(type, fn, o);
    }
    override removeEventListener(type: string, fn: EventListenerOrEventListenerObject | null, o?: EventListenerOptions | boolean): void {
        this.counts.set(type, this.count(type) - 1);
        super.removeEventListener(type, fn, o);
    }
    count(type: string): number { return this.counts.get(type) ?? 0; }
}
function key(target: EventTarget, code: string): void {
    const e = new Event('keydown');
    Object.defineProperty(e, 'code', { value: code });
    target.dispatchEvent(e);
}

interface FakeCanvas {
    id: string;
    className: string;
    /** The module owns the canvas's inline width / height; the host must leave them alone. */
    style: { width: string; height: string; cssText: string };
    ownerDocument: FakeDocument;
    parentElement: FakeFrame | null;
    focusCalls: number;
    focus(): void;
    remove(): void;
}
class FakeDocument extends CountingTarget {
    pointerLockElement: unknown = null;
    exits = 0;
    constructor(private log: string[]) { super(); }
    exitPointerLock(): void {
        this.exits++;
        this.pointerLockElement = null;
        this.dispatchEvent(new Event('pointerlockchange'));
    }
    lock(element: unknown): void {
        this.pointerLockElement = element;
        this.dispatchEvent(new Event('pointerlockchange'));
    }
    createElement(tag: string): FakeCanvas {
        const log = this.log;
        const canvas: FakeCanvas = {
            id: '', className: '', style: { width: '', height: '', cssText: '' }, ownerDocument: this, parentElement: null, focusCalls: 0,
            focus() { this.focusCalls++; },
            remove() {
                log.push('canvas.remove');
                if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
                this.parentElement = null;
            },
        };
        log.push(`createElement(${tag})`);
        return canvas;
    }
}
class FakeFrame extends CountingTarget {
    children: FakeCanvas[] = [];
    focusCalls = 0;
    /** The module's loading box inside its scaffold: null = no scaffold in the frame. */
    loading: { style: { display: string }; box: { innerHTML: string } } | null = null;
    constructor(readonly ownerDocument: FakeDocument, private log: string[]) { super(); }
    appendChild(canvas: FakeCanvas): FakeCanvas {
        this.log.push('frame.appendChild');
        canvas.parentElement = this;
        this.children.push(canvas);
        return canvas;
    }
    focus(): void { this.focusCalls++; }
    querySelector(selector: string): unknown {
        const loading = this.loading;
        if (selector !== '[data-deep-zoom-scaffold] #loading' || !loading) return null;
        return { style: loading.style, querySelector: (inner: string) => (inner === '.box' ? loading.box : null) };
    }
}

type RenderScript = (data: DzPath, opts: unknown) => Promise<unknown>;

/** One fake instance with its document, frame and canvas. `calls[name]` is every argument list a
 *  handle was called with; `log` is the order of the calls that matter for ordering. */
function makeRig() {
    const log: string[] = [];
    const calls: Record<string, unknown[][]> = {};
    const note = (name: string, ...args: unknown[]): void => { (calls[name] ??= []).push(args); log.push(name); };
    const count = (name: string): number => calls[name]?.length ?? 0;

    const doc = new FakeDocument(log);
    const frame = new FakeFrame(doc, log);
    const canvas = doc.createElement('canvas');
    canvas.parentElement = frame;
    frame.children.push(canvas);

    const state = {
        ready: false,
        error: '',
        /** What telemetry reports. Refreshed from `trueDepth` only by a frame that ran, as in the module. */
        depth: 1,
        trueDepth: 1,
        frameN: 0,
        frameRuns: true,
        contextLost: false,
        disposed: false,
        recording: false,
        playing: false,
        exporting: false,
        mode: 'auto',
        tick: 0,
        view: view(CAM_A),
        settings: {
            detail: 1, reach: 1, power: 8, phase: [0.25, 0.5] as [number, number], color: 0, cscale: 1, light: 1,
            falloff: 1, normals: 2, land: false, frame: 960, accum: true, lookMode: 1,
        },
        recPath: [] as DzPath['frames'],
        smoothSaw: [] as string[][],
        playEnd: null as ((result: unknown) => void) | null,
        renderScript: (async () => ({ frames: 1, zips: 1, cancelled: false })) as RenderScript,
    };

    const api = {
        dz: {
            version: 1 as const,
            telemetry: (): DzTelemetry => ({
                ready: state.ready, error: state.error, mode: 'f32', depth: state.depth, fps: state.tick++,
                frameW: 960, frameH: 540, iters: 48, power: state.settings.power, accumN: 0, accumMax: 64,
                recording: state.recording, playing: state.playing, exporting: state.exporting,
                pathFrames: state.recPath.length, bla: false,
            }),
            settings: () => ({ ...state.settings, phase: [state.settings.phase[0], state.settings.phase[1]] as [number, number] }),
            getView: (): DzView => ({ ...state.view, cam: [state.view.cam[0], state.view.cam[1], state.view.cam[2]] }),
            setView: (v: DzView): void => {
                note('setView', v);
                state.view = { ...v, cam: [v.cam[0], v.cam[1], v.cam[2]] };
                state.settings.power = v.power;   // the module's setView writes look values too
            },
            thumbnail: (size?: number): string => { note('thumbnail', size); return 'data:image/png;base64,AAAA'; },
            diveTo: (depth: number): Promise<void> => { note('dz.diveTo', depth); return Promise.resolve(); },
        },
        lockInput: (locked: boolean): void => { note('lockInput', locked); },
        samplePath: (data: DzPath, tau: number): number[] | null => { note('samplePath', data, tau); return [0, 0, 0]; },
        stopPlay: (): void => {
            note('stopPlay');
            const end = state.playEnd;
            state.playEnd = null;
            state.playing = false;
            end?.({ frames: 2, stopped: true });
        },
        cancelRender: (): void => { note('cancelRender'); },
        moveAlong: (dir: [number, number, number], dist: number): void => {
            note('moveAlong', dir, dist);
            state.trueDepth -= dist;   // a head-on approach: every unit flown is a unit closer
        },
        recordToggle: (): boolean => {
            note('recordToggle');
            state.recording = !state.recording;
            if (state.recording) state.recPath = [];
            return state.recording;
        },
        recording: (): boolean => state.recording,
        lastPath: (): DzPath => ({ format: 'gmt-mbulb-path', P: 256, fovScale: 1.1, frames: state.recPath }),
        smoothPath: (data: DzPath, passes?: number, alpha?: number): DzPath => {
            note('smoothPath', data, passes, alpha);
            state.smoothSaw = data.frames.map((f) => [...f.cam]);
            for (const f of data.frames) f.cam = ['0', '0', '0'];   // in place, as the module
            return data;
        },
        playPath: (data: DzPath, opts?: unknown): Promise<unknown> => {
            note('playPath', data, opts);
            if (data.frames.length === 0) return Promise.resolve({ error: 'empty path' });
            state.playing = true;
            return new Promise((resolve) => { state.playEnd = resolve; });
        },
        renderPath: (data: DzPath, opts: unknown): Promise<unknown> => { note('renderPath', data, opts); return state.renderScript(data, opts); },
        // What host/looseParams.ts pushes through and host/paramMap.ts reads back (stage 2).
        look: { mode: 1, view: 0, compare: 0, nrmTap: 1, keyElev: 40, keyTurn: 0, tint: 0.5, shadow: 1, ao: 1, sky: 0.3, rough: 0.75, haze: 0 } as Record<string, unknown>,
        setLook: (o: Record<string, unknown>): void => { note('setLook', o); Object.assign(api.look, o); },
        setSurf: (m: number): void => { note('setSurf', m); state.settings.detail = m; },
        setPower: (n: number): void => { note('setPower', n); state.settings.power = n; },
        setMode: (m: string): void => { note('setMode', m); state.mode = m; },
        autoIters: (): boolean => true,
        marchLevers: () => ({ stepRelax: 0, capRelax: 1, mode: state.mode }),
        blaMode: (): string => 'auto',
        compileMs: (): Record<string, number | undefined> => ({}),
    };

    const instance = {
        canvas,
        api,
        get frameCount() { return state.frameN; },
        get disposed() { return state.disposed; },
        get contextLost() { return state.contextLost; },
        step(now?: number): void {
            note('instance.step', now);
            if (state.disposed || !state.frameRuns) return;
            state.frameN++;
            state.depth = state.trueDepth;
        },
        dispose(): void { note('instance.dispose'); state.disposed = true; },
    };

    return {
        log, calls, count, doc, frame, state, api,
        // The fakes carry only the members the host uses; the DOM and module types ask for the rest.
        canvas: canvas as unknown as HTMLCanvasElement,
        fakeCanvas: canvas,
        instance: instance as unknown as DeepZoomInstance,
        /** End the fake's running preview the way the module does when the path is done. */
        finishPlay(): void {
            const end = state.playEnd;
            state.playEnd = null;
            state.playing = false;
            end?.({ frames: 2 });
        },
    };
}

/** Step the host from `from` to below `to`, every `every` ms. */
function run(host: DeepZoomHost, from: number, to: number, every = 16): void {
    for (let t = from; t < to; t += every) host.step(t);
}

// ── [1] options ──────────────────────────────────────────────────────────────────────────────────
console.log('[1] options   shellOptions(frame, hooks)');
{
    const frame = { fake: 'frame' } as unknown as HTMLElement;   // only its identity is used
    const notices: string[] = [];
    let hookLost = 0;
    let slotLost = 0;
    const options = shellOptions(
        frame,
        { onNotice: (m) => { notices.push(m); }, onContextLost: () => { hookLost++; } },
        { current: () => { slotLost++; } },
    );
    const record = options as Record<string, unknown>;
    const want: Array<[keyof DeepZoomOptions, unknown]> = [
        ['autoStart', false], ['shortcuts', false], ['dropTarget', null], ['pointerLock', false],
        ['resetStillOnResize', true], ['loseContextOnDispose', true], ['embed', true], ['publishOnWindow', false],
    ];
    for (const [name, value] of want) {
        check(name in record && record[name] === value, `options: ${name} is ${String(value)}`, `got ${String(record[name])}`);
    }
    check(options.keyTarget === frame, 'options: keyTarget === frame');
    check(options.sizeElement === frame && options.scaffoldParent === frame, 'options: sizeElement and scaffoldParent are the frame');

    options.onNotice?.('a notice');
    check(notices.length === 1 && notices[0] === 'a notice', 'options: onNotice reaches hooks.onNotice', notices.join(' | '));
    options.onContextLost?.();
    check(slotLost === 1 && hookLost === 1, 'options: onContextLost reaches the host slot and hooks.onContextLost', `slot ${slotLost}, hook ${hookLost}`);
    check(shellOptions(frame).onNotice === undefined, 'options: with no hooks.onNotice the module keeps its own console.warn');
    let threw = false;
    try { shellOptions(frame).onContextLost?.(); } catch { threw = true; }
    check(!threw, 'options: onContextLost with no hook and no slot does nothing');

    const dts = readFileSync(path.join(ROOT, 'deep-zoom/renderer/core.d.ts'), 'utf8');
    const body = /export interface DeepZoomCoreOptions \{([\s\S]*?)\n\}/.exec(dts)?.[1] ?? '';
    const declared = [...body.matchAll(/^\s{4}(\w+)\?:/gm)].map((m) => m[1]);
    const undecided = declared.filter((name) => !(name in record));
    check(declared.length >= 13 && undecided.length === 0,
        `options: every option core.d.ts declares is set here (${declared.length} options)`,
        `not set: ${undecided.join(', ') || '(the option list was not found in core.d.ts)'}`);
}

// ── [2] views ────────────────────────────────────────────────────────────────────────────────────
console.log('[2] views     the cam strings, byte for byte');
{
    const all = [...CAM_A, ...CAM_B, ...CAM_C];
    check(all.every((s) => s.replace('-', '').length === 80 && String(BigInt(s)) === s && String(Number(s)) !== s),
        'views: the fixture is nine 80-digit strings, each changed by one trip through a float');

    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);

    check(sameCam(host.getView().cam, CAM_A), 'views: getView returns the module\'s three cam strings byte-identical',
        JSON.stringify(host.getView().cam));

    const v = view(CAM_B, { yaw: 0.5 });
    host.setView(v);
    const got = rig.calls.setView?.[0]?.[0] as DzView | undefined;
    check(rig.count('setView') === 1 && sameCam(got?.cam, CAM_B) && got?.yaw === 0.5,
        'views: setView hands the module the caller\'s three cam strings byte-identical', JSON.stringify(got?.cam));
    check(sameCam(host.getView().cam, CAM_B), 'views: getView after setView returns the same strings');

    // takePath: a copy whose strings are the module's
    rig.state.recPath = pathOf([CAM_A, CAM_B], [0, 2]).frames;
    const take = host.takePath();
    check(take.frames.length === 2 && sameCam(take.frames[0].cam, CAM_A) && sameCam(take.frames[1].cam, CAM_B)
        && take.format === 'gmt-mbulb-path' && take.P === 256 && take.fovScale === 1.1,
        'views: takePath returns the take with its cam strings byte-identical');
    check(take.frames !== rig.state.recPath && take.frames[0] !== rig.state.recPath[0] && take.frames[0].cam !== rig.state.recPath[0].cam,
        'views: takePath returns a copy (frames, each frame, each cam array)');

    // smoothPath: the module gets a copy with the caller's strings; the caller's path is untouched
    const src = pathOf([CAM_A, CAM_B, CAM_C], [0, 2, 4]);
    const smoothed = host.smoothPath(src, 3, 0.5);
    const smoothArgs = rig.calls.smoothPath?.[0] ?? [];
    check(rig.state.smoothSaw.length === 3 && sameCam(rig.state.smoothSaw[0], CAM_A) && sameCam(rig.state.smoothSaw[1], CAM_B)
        && sameCam(rig.state.smoothSaw[2], CAM_C) && smoothArgs[1] === 3 && smoothArgs[2] === 0.5,
        'views: smoothPath hands the module the cam strings byte-identical, with passes and alpha');
    check(smoothed !== src && sameCam(src.frames[0].cam, CAM_A) && sameCam(src.frames[1].cam, CAM_B) && sameCam(src.frames[2].cam, CAM_C)
        && sameCam(smoothed.frames[1].cam, ['0', '0', '0']),
        'views: smoothPath returns a new path and leaves the caller\'s untouched (the module smooths in place)');

    // seekPath: by time; a path with times goes through as the caller's object
    host.seekPath(src, 0.5);
    let seek = rig.calls.samplePath?.[0] ?? [];
    check(seek[0] === src && seek[1] === 2, 'views: seekPath(p, 0.5) on a timed path samples the caller\'s own path at half its last time',
        `tau ${String(seek[1])}`);
    host.seekPath(src, 7);
    host.seekPath(src, -1);
    host.seekPath(src, Number.NaN);
    check(rig.calls.samplePath?.[1]?.[1] === 4 && rig.calls.samplePath?.[2]?.[1] === 0 && rig.calls.samplePath?.[3]?.[1] === 0,
        'views: seekPath clamps u to 0..1 (7 -> the end, -1 and NaN -> the start)');
    const untimed = pathOf([CAM_A, CAM_B, CAM_C]);
    host.seekPath(untimed, 0.5);
    seek = rig.calls.samplePath?.[4] ?? [];
    const sampled = seek[0] as DzPath | undefined;
    check(!!sampled && sampled !== untimed && sampled.frames.length === 3
        && sameCam(sampled.frames[0].cam, CAM_A) && sameCam(sampled.frames[1].cam, CAM_B) && sameCam(sampled.frames[2].cam, CAM_C)
        && sampled.frames[2].t === 2.8 && Math.abs((seek[1] as number) - 1.4) < 1e-12 && untimed.frames[2].t === undefined,
        'views: seekPath on a path without times samples an evenly timed copy with the same cam strings, and leaves the caller\'s untimed');
    const before = rig.count('samplePath');
    host.seekPath(pathOf([]), 0.5);
    check(rig.count('samplePath') === before, 'views: seekPath on an empty path calls nothing');

    // play and renderPathZip: the caller's path object itself
    const playing = host.play(src, { frames: 90, fps: 30 });
    await sleep(0);
    const playArgs = rig.calls.playPath?.[0] ?? [];
    check(playArgs[0] === src && JSON.stringify(playArgs[1]) === '{"frames":90,"fps":30}', 'views: play hands the module the caller\'s path object and options');
    rig.finishPlay();
    await playing;
    await host.renderPathZip(src, { frames: 4, fps: 24, longEdge: 320, samples: 2, tile: 64 });
    const renderArgs = rig.calls.renderPath?.[0] ?? [];
    check(renderArgs[0] === src && JSON.stringify(renderArgs[1]) === '{"frames":4,"fps":24,"longEdge":320,"samples":2,"tile":64}',
        'views: renderPathZip hands the module the caller\'s path object and frames, fps, longEdge, samples, tile',
        JSON.stringify(renderArgs[1]));
    host.dispose();
}

// ── [3] boot ─────────────────────────────────────────────────────────────────────────────────────
console.log('[3] boot      ready, bootParams, compile, error');
{
    // ready resolves; the snapshot is taken first
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    const compile: string[] = [];
    host.on('compile', (e) => { compile.push(`${e.what}:${e.state}`); });
    check(host.bootParams() === null, 'boot: bootParams is null before the first step');
    const parked = view(CAM_C, { power: 5 });
    host.setPendingView(view(CAM_B));
    host.setPendingView(parked);   // one slot: the later call replaces the first
    host.step(0);
    check(host.bootParams() === null && rig.count('setView') === 0 && compile.join() === 'deep:compiling',
        'boot: while the deep shader compiles bootParams stays null, the parked view waits, compile says compiling', compile.join());
    rig.state.settings.detail = 3;
    rig.state.ready = true;
    host.step(200);
    const boot = host.bootParams();
    check(boot !== null && Object.isFrozen(boot) && Object.isFrozen(boot.phase), 'boot: bootParams is frozen after ready, its arrays too');
    check(boot?.detail === 3 && boot?.power === 8 && JSON.stringify(boot?.phase) === '[0.25,0.5]',
        'boot: the snapshot is the module\'s settings at ready, taken BEFORE the parked view is applied (which changes power)',
        JSON.stringify(boot));
    const applied = rig.calls.setView?.[0]?.[0] as DzView | undefined;
    check(rig.count('setView') === 1 && applied === parked && sameCam(applied?.cam, CAM_C),
        'views: a parked view reaches the module at ready, the last one parked, byte-identical');
    check(await stateOf(host.ready) === 'resolved' && compile.join() === 'deep:compiling,deep:ready',
        'boot: ready resolves and compile says ready', compile.join());
    rig.state.settings.detail = 9;
    check(host.bootParams() === boot && host.bootParams()?.detail === 3, 'boot: a later change in the module does not move the snapshot');
    const params = host.getParams();
    check(params.detail === 9 && params !== host.getParams() && params.lookMode === 1 && params.land === false,
        'boot: getParams returns the module\'s settings now, under the module\'s keys, a new object each call');
    host.setPendingView(view(CAM_A));
    check(rig.count('setView') === 2 && sameCam((rig.calls.setView[1][0] as DzView).cam, CAM_A),
        'views: a view parked after ready is applied at once, byte-identical');
    run(host, 400, 2000, 200);
    check(compile.length === 2, 'boot: compile is said once per state', compile.join());
    host.dispose();
}
{
    // ready rejects on a compile error, and nobody has to be listening
    const rig = makeRig();
    const hookErrors: string[] = [];
    const host = createModuleHost(rig.instance, rig.canvas, { onError: (m) => { hookErrors.push(m); } });
    const errors: Array<{ message: string; fatal: boolean }> = [];
    const compile: string[] = [];
    host.on('error', (e) => { errors.push(e); });
    host.on('compile', (e) => { compile.push(`${e.state}:${e.error ?? ''}`); });
    rig.state.error = 'ERROR: 0:12: syntax error';
    host.step(0);
    await sleep(20);
    check(unhandled.length === 0, 'boot: a rejected ready that nobody chained on raises no unhandled rejection',
        unhandled.map(String).join(' | '));
    const message = await rejectionOf(host.ready);
    check(message.includes('failed to compile') && message.includes('ERROR: 0:12: syntax error'),
        'boot: ready rejects with a readable message that carries the module\'s error', message);
    run(host, 200, 1000, 200);
    check(errors.length === 1 && errors[0].fatal === true && errors[0].message === message && hookErrors.length === 1 && hookErrors[0] === message,
        'boot: the error event (fatal) and the onError hook fire once with that message', `${errors.length} events, ${hookErrors.length} hook calls`);
    check(compile.join() === 'failed:ERROR: 0:12: syntax error' && host.bootParams() === null,
        'boot: compile says failed with the module\'s text, and bootParams stays null', compile.join());
    host.dispose();
}
{
    // disposed first: never settles
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    host.step(0);
    host.dispose();
    rig.state.ready = true;
    host.step(200);
    check(await stateOf(host.ready) === 'pending', 'boot: a host disposed before ready never settles ready');
    check(rig.count('instance.step') === 1, 'step: after dispose step does not reach the instance', `${rig.count('instance.step')} calls`);

    const rig2 = makeRig();
    const host2: DeepZoomHost = createModuleHost(rig2.instance, rig2.canvas, { onError: () => { host2.dispose(); } });
    rig2.state.error = 'boom';
    host2.step(0);
    await sleep(20);
    check(await stateOf(host2.ready) === 'pending' && unhandled.length === 0,
        'boot: a host disposed from its own error hook leaves ready pending, with no unhandled rejection');
}
{
    // 120 s, counted over steps
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    const errors: string[] = [];
    host.on('error', (e) => { errors.push(e.message); });
    run(host, 0, DZ_READY_TIMEOUT_MS - 500, 100);
    check(errors.length === 0 && await stateOf(host.ready) === 'pending', 'boot: ready is still pending just before 120 s of steps');
    run(host, DZ_READY_TIMEOUT_MS - 500, DZ_READY_TIMEOUT_MS + 1000, 100);
    const message = await rejectionOf(host.ready);
    check(DZ_READY_TIMEOUT_MS === 120_000 && message.includes('120 s') && errors.length === 1,
        'boot: ready rejects after 120 s of steps without a deep shader', `${message} (${errors.length} error events)`);
    host.dispose();

    const rig2 = makeRig();
    const host2 = createModuleHost(rig2.instance, rig2.canvas);
    host2.step(0);
    host2.step(600_000);   // ten minutes with no step (a background tab) count as one second
    check(await stateOf(host2.ready) === 'pending', 'boot: a ten-minute gap between two steps does not use the 120 s up');
    rig2.state.ready = true;
    host2.step(600_200);
    check(await stateOf(host2.ready) === 'resolved', 'boot: and ready still resolves afterwards');
    host2.dispose();
}

// ── [4] step ─────────────────────────────────────────────────────────────────────────────────────
console.log('[4] step      the timestamp, frameCount, 8 Hz, context loss');
{
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    host.step(1234.5);
    check(rig.calls['instance.step']?.[0]?.[0] === 1234.5, 'step: forwards the timestamp to the instance', String(rig.calls['instance.step']?.[0]?.[0]));
    const one = host.frameCount();
    rig.state.frameN = 41;
    check(one === 1 && host.frameCount() === 41, 'step: frameCount() follows the instance', `${one}, then ${host.frameCount()}`);
    check(host.canvas() === rig.canvas, 'step: canvas() is the canvas the host was made with');
    host.dispose();
}
{
    // The fake's fps changes on every read, so every write to the store changes it and is counted.
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    let writes = 0;
    const stop = subscribeTelemetry(() => { writes++; });
    let streamed = 0;
    let slow = 0;
    let fast = 0;
    const samples: DzTelemetry[] = [];
    host.onTelemetry((t) => { streamed++; samples.push(t); });
    host.onTelemetry(() => { slow++; }, 2);
    const stopFast = host.onTelemetry(() => { fast++; }, 1000);
    run(host, 0, 1000, 16);   // 63 steps in one second
    check(rig.count('instance.step') === 63 && writes === 8, 'step: one second of 63 steps writes the telemetry store 8 times (8 Hz)',
        `${writes} writes in ${rig.count('instance.step')} steps`);
    check(getTelemetry().live === true && getTelemetry().frameW === 960, 'step: the store holds the module\'s sample and is live');
    check(streamed === 8 && samples[0].depth === 1 && samples[0].frameH === 540, 'step: onTelemetry sends the sample 8 times a second by default', `${streamed}`);
    check(slow === 2 && fast === 63, 'step: onTelemetry(fn, hz) follows hz, at most once a step', `2 Hz: ${slow}, 1000 Hz: ${fast}`);
    stopFast();
    stopFast();
    run(host, 1000, 1100, 16);
    check(fast === 63, 'step: the unsubscribe stops the stream and is safe to call twice', `${fast}`);
    check(host.telemetry().frameW === 960 && host.telemetry().depth === 1, 'step: telemetry() is the module\'s sample, read now');

    // context loss: once, from the instance flag
    let lost = 0;
    host.on('contextLost', (e) => { if (e === null) lost++; });
    rig.state.contextLost = true;
    run(host, 1100, 1300, 16);
    check(lost === 1, 'step: a lost context is reported once, as the contextLost event', `${lost} events`);

    host.dispose();
    check(getTelemetry().live === false && getTelemetry().captured === false, 'step: dispose resets the telemetry store');
    const after = writes;
    const streamedBefore = streamed;
    host.step(5000);
    check(writes === after && streamed === streamedBefore, 'step: a disposed host writes nothing more and streams nothing more');
    stop();
}
{
    // a listener that throws does not stop the others, nor the step
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    const realError = console.error;
    let reported = 0;
    console.error = () => { reported++; };
    let second = 0;
    let escaped = false;
    try {
        host.on('compile', () => { throw new Error('bad listener'); });
        host.on('compile', () => { second++; });
        rig.state.ready = true;
        host.step(0);
    } catch {
        escaped = true;
    } finally {
        console.error = realError;
    }
    check(!escaped && second === 1 && reported === 1 && await stateOf(host.ready) === 'resolved',
        'step: a listener that throws is reported and neither the step, the next listener nor ready is lost',
        `escaped ${escaped}, second ${second}, reported ${reported}`);
    const unsub = host.on('recordingChanged', () => { second += 100; });
    unsub();
    unsub();
    rig.state.recording = true;
    host.step(200);
    check(second === 1, 'step: on() returns an unsubscribe that is safe to call twice');
    host.dispose();
}

// ── [5] input ────────────────────────────────────────────────────────────────────────────────────
console.log('[5] input     focus, pointer lock, setInputEnabled');
{
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    host.focus();
    check(rig.frame.focusCalls === 1 && rig.fakeCanvas.focusCalls === 0, 'input: focus() focuses the frame (the key target), not the canvas',
        `frame ${rig.frame.focusCalls}, canvas ${rig.fakeCanvas.focusCalls}`);

    const capture: boolean[] = [];
    host.on('captureChanged', (e) => { capture.push(e.captured); });
    check(host.isCaptured() === false, 'input: isCaptured() is false with no pointer lock');
    rig.doc.lock(rig.fakeCanvas);
    check(host.isCaptured() === true && capture.join() === 'true' && getTelemetry().captured === true,
        'input: a lock on the canvas turns isCaptured() true, fires captureChanged and writes the store', capture.join());
    rig.doc.dispatchEvent(new Event('pointerlockchange'));
    check(capture.length === 1, 'input: a pointerlockchange that changes nothing fires nothing');

    host.setInputEnabled(false);
    check(rig.count('lockInput') === 1 && rig.calls.lockInput[0][0] === true, 'input: setInputEnabled(false) locks the module\'s input (api.lockInput(true))');
    check(rig.doc.exits === 1 && host.isCaptured() === false, 'input: setInputEnabled(false) also exits the pointer lock', `${rig.doc.exits} exits`);
    check(capture.join() === 'true,false' && getTelemetry().captured === false, 'input: and captureChanged says false', capture.join());

    host.setInputEnabled(true);
    check(rig.count('lockInput') === 2 && rig.calls.lockInput[1][0] === false && rig.doc.exits === 1,
        'input: setInputEnabled(true) unlocks the input and leaves the pointer alone');

    rig.doc.lock({ other: 'element' });
    host.setInputEnabled(false);
    check(rig.doc.exits === 1 && host.isCaptured() === false, 'input: a lock held by another element is not ours: not captured, not released');
    host.dispose();
}

// ── [6] flight ───────────────────────────────────────────────────────────────────────────────────
console.log('[6] flight    recording and the path preview');
{
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    const rec: string[] = [];
    host.on('recordingChanged', (e) => { rec.push(`${e.recording}:${e.frames}`); });
    host.step(0);
    host.setRecording(false);
    check(rig.count('recordToggle') === 0, 'flight: setRecording(false) while not recording toggles nothing');
    host.setRecording(true);
    host.setRecording(true);
    check(rig.count('recordToggle') === 1 && rig.state.recording === true, 'flight: setRecording(true) toggles once, however often it is called');
    check(rec.length === 0, 'flight: recordingChanged is not sent before the next poll');
    host.step(200);
    rig.state.recPath = pathOf([CAM_A, CAM_B], [0, 2]).frames;
    host.step(400);
    check(rec.join() === 'true:0', 'flight: recordingChanged says recording at the next poll, once', rec.join());
    host.setRecording(false);
    host.step(600);
    check(rig.count('recordToggle') === 2 && rec.join() === 'true:0,false:2', 'flight: stopping toggles once and recordingChanged carries the frame count', rec.join());

    // the preview
    const empty = await host.play(pathOf([]));
    check(empty.stopped === true && rig.count('playPath') === 0, 'flight: play on an empty path resolves stopped at once and calls nothing');
    const a = pathOf([CAM_A, CAM_B], [0, 2]);
    const b = pathOf([CAM_B, CAM_C], [0, 2]);
    const first = host.play(a);
    await sleep(0);
    rig.finishPlay();
    check((await first).stopped === false, 'flight: a preview that runs to its end resolves stopped false');

    const second = host.play(a);
    await sleep(0);
    const third = host.play(b);
    await sleep(5);
    check(rig.count('stopPlay') === 1 && (await second).stopped === true && rig.count('playPath') === 3 && rig.calls.playPath[2][0] === b,
        'flight: a second play stops the preview in flight first, then starts its own',
        `${rig.count('stopPlay')} stops, ${rig.count('playPath')} starts`);
    host.stopPlay();
    check((await third).stopped === true && rig.count('stopPlay') === 2, 'flight: stopPlay ends the preview and play resolves stopped true');
    host.dispose();
}

// ── [7] render ───────────────────────────────────────────────────────────────────────────────────
console.log('[7] render    the path render, progress, cancel, thumbnail');
{
    const rig = makeRig();
    const status = { text: null as string | null };
    const host = createModuleHost(rig.instance, rig.canvas, { statusLine: () => status.text });
    const p = pathOf([CAM_A, CAM_B], [0, 2]);
    const request = { frames: 12, fps: 30, longEdge: 1280, samples: 8 };

    const none = await host.renderPathZip(pathOf([]), request);
    check(none.ok === false && none.reason === 'empty-path' && rig.count('renderPath') === 0, 'render: an empty path is refused before the module is called');

    const cases: Array<[string, unknown, string]> = [
        ['busy', { error: 'not ready / busy' }, '{"ok":false,"reason":"busy","message":"not ready / busy"}'],
        ['the module\'s empty-path answer', { error: 'empty path' }, '{"ok":false,"reason":"empty-path","message":"empty path"}'],
        ['another error', { error: '1280x720 is too large' }, '{"ok":false,"reason":"error","message":"1280x720 is too large"}'],
        ['cancelled before a frame', { cancelled: true, framesRendered: 0 }, '{"ok":false,"reason":"cancelled"}'],
        ['a finished render', { frames: 12, fps: 30, longEdge: 1280, samples: 8, cancelled: false, zips: 1 }, '{"ok":true,"frames":12,"zips":1,"cancelled":false}'],
        ['a cancelled render with frames', { frames: 5, fps: 30, longEdge: 1280, samples: 8, cancelled: true, zips: 1 }, '{"ok":true,"frames":5,"zips":1,"cancelled":true}'],
    ];
    for (const [name, answer, want] of cases) {
        rig.state.renderScript = async () => answer;
        const got = JSON.stringify(await host.renderPathZip(p, request));
        check(got === want, `render: ${name} maps to ${want}`, got);
    }
    rig.state.renderScript = async () => { throw new Error('GL went away'); };
    const thrown = JSON.stringify(await host.renderPathZip(p, request));
    check(thrown === '{"ok":false,"reason":"error","message":"GL went away"}', 'render: a throw inside the module becomes a result, not a rejection', thrown);
    check(rig.count('stopPlay') === rig.count('renderPath'), 'render: every render stops a path preview first', `${rig.count('stopPlay')} of ${rig.count('renderPath')}`);

    // progress, polled from step
    const progress: Array<DzProgress | null> = [];
    host.on('progress', (e) => { progress.push(e); });
    let finish: (r: unknown) => void = () => undefined;
    rig.state.renderScript = () => new Promise((resolve) => { finish = resolve; });
    const rendering = host.renderPathZip(p, request);
    rig.state.exporting = true;
    host.step(0);
    check(JSON.stringify(progress) === '[{"job":"sequence","text":""}]', 'render: a render that shows no status line yet reports progress with an empty text',
        JSON.stringify(progress));
    status.text = 'rendering path... frame 3/120';
    host.step(200);
    check(JSON.stringify(progress[1]) === '{"job":"sequence","text":"rendering path... frame 3/120","frame":3,"total":120}',
        'render: frame and total are read off the status line', JSON.stringify(progress[1]));
    status.text = 'frame 4/120 - 1280x720... 45%';
    host.step(400);
    host.step(600);
    check(progress.length === 3 && progress[2]?.frame === 4 && progress[2]?.total === 120 && progress[2]?.fraction === 0.45,
        'render: the fraction is read too, and an unchanged line is not sent twice', JSON.stringify(progress.slice(2)));
    rig.state.exporting = false;
    finish({ frames: 12, zips: 1, cancelled: false });
    await rendering;
    host.step(800);
    host.step(1000);
    check(progress.length === 4 && progress[3] === null, 'render: progress null when the job ends, once', JSON.stringify(progress.slice(3)));
    rig.state.exporting = true;
    status.text = 'exporting 2560x1440... 10%';
    host.step(1200);
    check(progress[4]?.job === 'still' && progress[4]?.fraction === 0.1, 'render: a job the host did not start as a sequence is a still', JSON.stringify(progress[4]));
    rig.state.exporting = false;
    host.step(1400);

    // thumbnail
    check(host.thumbnail(128) === 'data:image/png;base64,AAAA' && rig.calls.thumbnail[0][0] === 128, 'render: thumbnail(size) is the module\'s, with the size');
    rig.state.exporting = true;
    check(host.thumbnail(64) === '' && rig.count('thumbnail') === 1, 'render: during a render thumbnail() returns an empty string and draws nothing');
    rig.state.exporting = false;

    // cancel
    const cancelsBefore = rig.count('cancelRender');
    const stopsBefore = rig.count('stopPlay');
    host.cancel();
    check(rig.count('cancelRender') === cancelsBefore + 1 && rig.count('stopPlay') === stopsBefore + 1, 'render: cancel() ends a render and a path preview');
    host.moveAlong([0, 1, 0], 2.5e-30);
    const move = rig.calls.moveAlong?.[rig.count('moveAlong') - 1] ?? [];
    check(JSON.stringify(move) === '[[0,1,0],2.5e-30]', 'render: moveAlong(dir, distance) goes straight to the module', JSON.stringify(move));
    host.dispose();
    const late = await host.renderPathZip(p, request);
    const latePlay = await host.play(p);
    check(late.ok === false && late.reason === 'cancelled' && latePlay.stopped === true,
        'render: a disposed host starts neither a render nor a preview');
}

// ── [8] dive ─────────────────────────────────────────────────────────────────────────────────────
console.log('[8] dive      dive.ts alone, then through the host');
{
    /** A dive over a plain number: a head-on approach whose distance is always fresh. */
    const rigOf = (d0: number, glancing = false) => {
        const s = { depth: d0, yaw: 0, pitch: 0, moves: [] as Array<{ dir: number[]; dist: number; from: number }> };
        const keys = new CountingTarget();
        const dive = createDive({
            depth: () => s.depth,
            look: () => ({ yaw: s.yaw, pitch: s.pitch }),
            moveAlong: (dir, dist) => { s.moves.push({ dir, dist, from: s.depth }); if (!glancing) s.depth -= dist; },
            keyTarget: keys,
        });
        return { s, keys, dive };
    };
    /** Advance every 100 ms until the dive ends; returns the time of the advance that ended it. */
    const fly = (r: ReturnType<typeof rigOf>, limitMs = 120_000): number => {
        let t = 0;
        while (r.dive.active && t <= limitMs) { r.dive.advance(t); t += 100; }
        return t - 100;
    };

    const landed: string[] = [];
    let landings = 0;
    let biggestShare = 0;
    let straight = true;
    let movedAfter = 0;
    for (const target of [1e-7, 3.3e-12, 7.7e-30, 2e-3, 5.5e-9, 1.25e-20]) {
        const r = rigOf(1);
        const done = r.dive.start(target);
        fly(r);
        const resolved = await stateOf(done, 5) === 'resolved';
        const ok = resolved && r.s.depth <= target && r.s.depth >= target * 0.95 * (1 - 1e-9);
        if (ok) landings++;
        landed.push(`${target} -> ${r.s.depth.toExponential(4)}${resolved ? '' : ' (not resolved)'}`);
        for (const m of r.s.moves) {
            biggestShare = Math.max(biggestShare, m.dist / m.from);
            if (m.dir[0] !== 1 || m.dir[1] !== 0 || Math.abs(m.dir[2]) > 1e-15 || !(m.dist > 0)) straight = false;
        }
        const n = r.s.moves.length;
        for (let t = 500_000; t < 500_500; t += 100) r.dive.advance(t);
        movedAfter += r.s.moves.length - n;
        if (r.keys.count('keydown') !== 0) straight = false;
    }
    check(landings === 6, 'dive: six head-on dives each land between 0.95 x target and target', landed.join(' | '));
    check(biggestShare <= 0.2 + 1e-12 && biggestShare > 0.05, 'dive: no move is more than a fifth of the distance at that moment', `largest ${biggestShare}`);
    check(straight, 'dive: every move is forward (yaw 0, pitch 0 -> +x) by a positive distance, and the key listener is gone at the end');
    check(movedAfter === 0, 'dive: nothing moves after the dive has resolved', `${movedAfter} moves`);

    {
        // The module's distance can read far too small for ONE frame where it switches between its
        // f32 and deep paths. One such frame must not count as arrival; three in a row do.
        const r = rigOf(1);
        const done = r.dive.start(1e-6);
        r.dive.advance(0);
        r.dive.advance(100);
        const real = r.s.depth;
        r.s.depth = 3e-7;                 // one bogus frame under the target
        r.dive.advance(200);
        const stillFlying = r.dive.active && r.s.moves.every((m) => m.from !== 3e-7);
        r.s.depth = real;
        r.dive.advance(300);
        const resumed = r.dive.active && r.s.moves[r.s.moves.length - 1].from === real;
        r.s.depth = 5e-7;
        r.dive.advance(400);
        r.dive.advance(500);
        const twoIsNotEnough = r.dive.active;
        r.dive.advance(600);
        check(stillFlying && resumed && twoIsNotEnough && !r.dive.active && await stateOf(done, 5) === 'resolved',
            'dive: one frame under the target is not arrival and nothing moves on it; three frames in a row are',
            `${stillFlying} ${resumed} ${twoIsNotEnough} ${r.dive.active}`);
    }

    {
        const r = rigOf(1);
        r.s.yaw = Math.PI / 2;
        void r.dive.start(1e-3);
        r.dive.advance(0);
        r.dive.advance(100);
        const sideways = r.s.moves[0]?.dir ?? [];
        r.s.yaw = 0;
        r.s.pitch = Math.PI / 6;
        r.dive.advance(200);
        const up = r.s.moves[1]?.dir ?? [];
        check(r.s.moves.length === 2 && Math.abs(sideways[0]) < 1e-12 && sideways[1] === 0 && Math.abs(sideways[2] - 1) < 1e-12
            && Math.abs(up[0] - Math.cos(Math.PI / 6)) < 1e-12 && Math.abs(up[1] - 0.5) < 1e-12 && Math.abs(up[2]) < 1e-12,
            'dive: the first advance moves nothing, and the direction is read each frame as [cos p cos y, sin p, cos p sin y]',
            JSON.stringify(r.s.moves.map((m) => m.dir)));
        r.dive.cancel();
    }
    {
        const r = rigOf(1e-70);
        const done = r.dive.start(1e-100);
        fly(r);
        check(DZ_DIVE_MIN_DEPTH === 1e-77 && await stateOf(done, 5) === 'resolved' && r.s.depth <= 1e-77 && r.s.depth >= 0.95e-77 * (1 - 1e-9),
            'dive: a target below 1e-77 is flown to 1e-77 and no deeper', r.s.depth.toExponential(4));
    }
    {
        const r = rigOf(0.5);
        const done = r.dive.start(1);
        check(await stateOf(done, 5) === 'resolved' && !r.dive.active && r.keys.count('keydown') === 0 && r.s.moves.length === 0,
            'dive: already that deep resolves at once, moves nothing and listens to nothing');
    }
    {
        const r = rigOf(1);
        const done = r.dive.start(1e-9);
        for (let t = 0; t < 500; t += 100) r.dive.advance(t);
        const n = r.s.moves.length;
        check(n > 0 && await stateOf(done, 5) === 'pending' && r.keys.count('keydown') === 1, 'dive: a dive in flight is pending and listens for keys');
        r.dive.cancel();
        for (let t = 500; t < 1000; t += 100) r.dive.advance(t);
        check(await stateOf(done, 5) === 'resolved' && r.s.moves.length === n && r.keys.count('keydown') === 0 && r.s.depth > 1e-9,
            'dive: cancel() resolves it, stops the moves short of the target and removes the key listener', `${r.s.moves.length - n} moves after`);
    }
    {
        const r = rigOf(1);
        const done = r.dive.start(1e-9);
        r.dive.advance(0);
        key(r.keys, 'KeyB');
        key(r.keys, 'Space');
        const stillFlying = r.dive.active;
        key(r.keys, 'KeyW');
        check(stillFlying && !r.dive.active && await stateOf(done, 5) === 'resolved', 'dive: a fly key ends it; B and Space do not');
        const again = r.dive.start(1e-9);
        key(r.keys, 'Escape');
        check(await stateOf(again, 5) === 'resolved', 'dive: Escape ends it');
        const older = r.dive.start(1e-9);
        const newer = r.dive.start(1e-6);
        check(await stateOf(older, 5) === 'resolved' && await stateOf(newer, 5) === 'pending' && r.keys.count('keydown') === 1,
            'dive: a newer dive ends the one in flight');
        r.dive.cancel();
    }
    {
        const r = rigOf(1, true);   // a ray that never gets closer
        const done = r.dive.start(1e-9);
        const endedAt = fly(r);
        check(DZ_DIVE_TIME_LIMIT_MS === 45_000 && await stateOf(done, 5) === 'resolved' && endedAt > 45_000 && endedAt <= 45_200,
            'dive: a dive that never arrives gives up after 45 s of flight', `ended at ${endedAt} ms`);
        const r2 = rigOf(1, true);
        void r2.dive.start(1e-9);
        r2.dive.advance(0);
        r2.dive.advance(600_000);
        check(r2.dive.active, 'dive: a ten-minute gap between two advances counts as one second of flight');
        r2.s.depth = 0;
        r2.dive.advance(600_100);
        check(!r2.dive.active, 'dive: a camera that got inside (depth 0) ends the dive');
    }

    // through the host
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    host.step(0);
    const early = host.diveTo(1e-6);
    host.step(200);
    check(await stateOf(early, 5) === 'resolved' && rig.count('moveAlong') === 0, 'dive: before ready the host gives up at once and moves nothing');
    rig.state.ready = true;
    host.step(400);

    const dive = host.diveTo(1e-6);
    run(host, 500, 30_000, 16);
    check(await stateOf(dive, 5) === 'resolved' && rig.state.trueDepth <= 1e-6 && rig.state.trueDepth >= 0.95e-6 * (1 - 1e-9),
        'dive: host.diveTo flies the module to between 0.95 x target and target', rig.state.trueDepth.toExponential(4));
    check(rig.count('dz.diveTo') === 0, 'dive: the module\'s own diveTo is never called');

    // a frame that did not run must not move the camera: the distance is stale
    const deeper = host.diveTo(1e-12);
    run(host, 30_000, 30_200, 16);
    const movesBefore = rig.count('moveAlong');
    const depthBefore = rig.state.trueDepth;
    rig.state.frameRuns = false;
    run(host, 30_200, 32_200, 16);
    check(movesBefore > 0 && rig.count('moveAlong') === movesBefore && rig.state.trueDepth === depthBefore,
        'dive: no move while the module\'s frame does not run (a render owns the context)',
        `${rig.count('moveAlong') - movesBefore} moves on a stale distance, depth ${rig.state.trueDepth.toExponential(3)}`);
    rig.state.frameRuns = true;
    run(host, 32_200, 32_400, 16);
    check(rig.count('moveAlong') > movesBefore && await stateOf(deeper, 5) === 'pending', 'dive: and it resumes with the frames');

    host.setView(view(CAM_B));
    check(await stateOf(deeper, 5) === 'resolved', 'dive: setView ends a dive');
    rig.state.trueDepth = 1;
    host.step(32_500);
    const third = host.diveTo(1e-9);
    key(rig.frame, 'KeyS');
    check(await stateOf(third, 5) === 'resolved', 'dive: a fly key on the frame ends a host dive');
    const fourth = host.diveTo(1e-9);
    host.cancel();
    check(await stateOf(fourth, 5) === 'resolved', 'dive: host.cancel() ends a dive');
    const fifth = host.diveTo(1e-9);
    const sixth = host.diveTo(1e-9);
    void host.play(pathOf([CAM_A, CAM_B], [0, 2]));
    check(await stateOf(fifth, 5) === 'resolved' && await stateOf(sixth, 5) === 'resolved', 'dive: a newer dive and a path preview each end a dive');
    const last = host.diveTo(1e-9);
    host.dispose();
    check(await stateOf(last, 5) === 'resolved' && rig.frame.count('keydown') === 0, 'dive: dispose ends a dive and removes its key listener');
    check(await stateOf(host.diveTo(1e-9), 5) === 'resolved', 'dive: a disposed host gives up at once');
}

// ── [9] dispose ──────────────────────────────────────────────────────────────────────────────────
console.log('[9] dispose   order, twice, listeners');
{
    const rig = makeRig();
    const host = createModuleHost(rig.instance, rig.canvas);
    let events = 0;
    host.on('compile', () => { events++; });
    host.on('captureChanged', () => { events++; });
    check(rig.doc.count('pointerlockchange') === 1, 'dispose: (before) the host listens for pointerlockchange on the canvas\'s document');
    host.dispose();
    const disposedAt = rig.log.indexOf('instance.dispose');
    const removedAt = rig.log.indexOf('canvas.remove');
    check(disposedAt >= 0 && removedAt >= 0 && disposedAt < removedAt, 'dispose: the instance\'s dispose runs BEFORE the canvas is removed',
        rig.log.filter((l) => l === 'instance.dispose' || l === 'canvas.remove').join(' -> '));
    check(rig.fakeCanvas.parentElement === null && rig.frame.children.length === 0, 'dispose: the canvas is out of the frame');
    host.dispose();
    check(rig.count('instance.dispose') === 1 && rig.log.filter((l) => l === 'canvas.remove').length === 1, 'dispose: a second dispose does nothing');
    check(rig.doc.count('pointerlockchange') === 0, 'dispose: the pointerlockchange listener is removed');
    rig.state.ready = true;
    host.step(0);
    rig.doc.lock(rig.fakeCanvas);
    check(events === 0 && getTelemetry().captured === false && getTelemetry().live === false, 'dispose: no event and no store write after dispose');
}

// ── [10] mount ───────────────────────────────────────────────────────────────────────────────────
console.log('[10] mount    the DOM half, with a fake create');
{
    const rig = makeRig();   // its instance is what the fake create returns; the canvas comes from mountDeepZoom
    const log = rig.log;
    log.length = 0;
    rig.frame.children = [];
    const frame = rig.frame as unknown as HTMLElement;   // a fake: only the members mountDeepZoom and the host use
    let made: { canvas: FakeCanvas; options: DeepZoomOptions; inFrame: boolean } | null = null;
    const notices: string[] = [];
    let hookLost = 0;
    const create: Create = (canvas, options = {}) => {
        log.push('create');
        const fake = canvas as unknown as FakeCanvas;
        made = { canvas: fake, options, inFrame: rig.frame.children.includes(fake) };
        return rig.instance;
    };

    const host = mountDeepZoom(frame, { onNotice: (m) => { notices.push(m); }, onContextLost: () => { hookLost++; } }, create);
    const m = made as { canvas: FakeCanvas; options: DeepZoomOptions; inFrame: boolean } | null;
    check(!!m && m.canvas.id === DZ_CANVAS_ID && DZ_CANVAS_ID === 'dz-render-canvas' && rig.frame.children.length === 1 && rig.frame.children[0] === m.canvas,
        'mount: exactly one canvas#dz-render-canvas is made in code and is a child of the frame');
    check(!!m && m.inFrame && log.indexOf('frame.appendChild') < log.indexOf('create') && log.indexOf('createElement(canvas)') === 0,
        'mount: the canvas is in the frame before create is called (the module reads its parent at create)', log.slice(0, 4).join(' -> '));
    check(!!m && /\babsolute\b/.test(m.canvas.className) && /\bh-full\b/.test(m.canvas.className) && /\bw-full\b/.test(m.canvas.className)
        && m.canvas.style.width === '' && m.canvas.style.height === '' && m.canvas.style.cssText === '',
        'mount: the canvas is taken out of the flow and sized by classes, with no inline width or height (the module writes those)',
        `class "${m?.canvas.className}", style ${JSON.stringify(m?.canvas.style)}`);
    const expected = shellOptions(frame, {});
    const sameOptions = !!m && (Object.keys(expected) as Array<keyof DeepZoomOptions>).every((k) =>
        typeof expected[k] === 'function' || k === 'onNotice' ? typeof m.options[k] === 'function' : m.options[k] === expected[k]);
    check(sameOptions && m?.options.keyTarget === frame, 'mount: create receives shellOptions(frame, hooks)',
        `got the options ${Object.keys(m?.options ?? {}).join(', ')}`);
    check(host.canvas() === (m?.canvas as unknown as HTMLCanvasElement), 'mount: host.canvas() is that canvas');

    let lost = 0;
    host.on('contextLost', () => { lost++; });
    m?.options.onContextLost?.();
    rig.state.contextLost = true;
    host.step(0);
    host.step(200);
    check(lost === 1 && hookLost === 1, 'mount: the module\'s onContextLost reaches the host\'s contextLost event and hooks.onContextLost, once each',
        `event ${lost}, hook ${hookLost}`);
    m?.options.onNotice?.('Gradient load failed: nope');
    check(notices.join() === 'Gradient load failed: nope', 'mount: the module\'s notice reaches hooks.onNotice');

    // progress through the real reader of the module's loading box
    const progress: Array<DzProgress | null> = [];
    host.on('progress', (e) => { progress.push(e); });
    rig.frame.loading = {
        style: { display: 'flex' },
        box: { innerHTML: '<span class="spin">◓</span> rendering path… frame 3/120<br><small style="color:#9ab">1280px ×8 — press Esc to cancel · ZIP downloads when done</small>' },
    };
    rig.state.exporting = true;
    host.step(400);
    check(progress[0]?.text === 'rendering path… frame 3/120' && progress[0]?.frame === 3 && progress[0]?.total === 120,
        'mount: progress reads the first line of the module\'s loading box (frame 3 of 120, not 1201280; the page\'s Esc hint is dropped)',
        JSON.stringify(progress[0]));
    rig.frame.loading.style.display = 'none';
    host.step(600);
    check(progress[1]?.text === '', 'mount: a hidden loading box reads as no status line', JSON.stringify(progress[1]));
    rig.state.exporting = false;

    host.focus();
    check(rig.frame.focusCalls === 1, 'mount: host.focus() focuses the frame');
    log.length = 0;
    host.dispose();
    check(log.join(' -> ') === 'instance.dispose -> canvas.remove' && rig.frame.children.length === 0,
        'mount: host.dispose() disposes the instance, then removes the canvas from the frame', log.join(' -> '));
    m?.options.onContextLost?.();
    check(lost === 1, 'mount: a context loss after dispose reaches no host');
}
{
    const rig = makeRig();
    rig.log.length = 0;
    rig.frame.children = [];
    const failure = new Error('WebGL2 unavailable');
    const create: Create = () => { throw failure; };
    let caught: unknown = null;
    try { mountDeepZoom(rig.frame as unknown as HTMLElement, {}, create); } catch (e) { caught = e; }
    check(caught === failure, 'mount: a failed create is rethrown as it was (WebGL2 unavailable)', String(caught));
    check(rig.frame.children.length === 0 && rig.log.includes('canvas.remove'), 'mount: and the canvas it made is removed from the frame',
        `${rig.frame.children.length} canvas left`);

    // a module that lost a handle: named error, instance disposed, canvas removed
    const rig2 = makeRig();
    rig2.log.length = 0;
    rig2.frame.children = [];
    delete (rig2.api as Record<string, unknown>).recordToggle;
    delete (rig2.api as Record<string, unknown>).playPath;
    let named = '';
    const createBroken: Create = () => rig2.instance;
    try { mountDeepZoom(rig2.frame as unknown as HTMLElement, {}, createBroken); } catch (e) { named = (e as Error).message; }
    check(named.includes('api.recordToggle') && named.includes('api.playPath') && rig2.count('instance.dispose') === 1 && rig2.frame.children.length === 0
        && rig2.log.indexOf('instance.dispose') < rig2.log.indexOf('canvas.remove'),
        'mount: a module without a handle the host needs fails with the handle\'s name, disposed and with no canvas left', named);
}

// ── [11] params ──────────────────────────────────────────────────────────────────────────────────
console.log('[11] params   by id, through host/looseParams.ts (the pushes themselves: param-map.mts)');
{
    const rigA = makeRig();
    const rigB = makeRig();
    const a = createModuleHost(rigA.instance, rigA.canvas);
    const b = createModuleHost(rigB.instance, rigB.canvas);
    const realWarn = console.warn;
    const warned: string[] = [];
    console.warn = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
    try {
        a.setParam('dzQuality.detail', 4);
        a.setParams({ 'dzQuality.detail': 4, 'dzFormula.power': 6 });
        a.setParam('detail', 9);          // the module's own key is not an id
        a.setParam('detail', 9);
        b.setParam('dzQuality.detail', 2);
    } finally {
        console.warn = realWarn;
    }
    check(rigA.count('setSurf') === 1 && rigA.state.settings.detail === 4 && rigA.count('setPower') === 1 && rigA.state.settings.power === 6,
        'params: an id reaches the setter of the module once; the same value sent again is dropped', rigA.log.join(', '));
    check(rigB.count('setSurf') === 1 && rigB.state.settings.detail === 2, 'params: each host has its own pusher');
    check(warned.length === 1 && warned[0].includes('"detail"'), 'params: an id with no map row is named once and pushes nothing', `${warned.length} lines`);
    const got = a.getParams();
    check(got.detail === 4 && got['dzQuality.detail'] === 4 && got['dzFormula.power'] === 6 && got['dzLight.keyElevation'] === 40,
        'params: getParams holds the keys of the module and the mapped params by id');
    check(a.pause === undefined && a.setGradientRamp === undefined && a.renderFramePixels === undefined && a.renderFrameBlob === undefined && a.exportStill === undefined,
        'params: the five optional members are absent in stage 1 (pause, setGradientRamp, renderFramePixels, renderFrameBlob, exportStill)');
    a.dispose();
    b.dispose();
}

// ── [12] seam ────────────────────────────────────────────────────────────────────────────────────
console.log('[12] seam     who under deep-zoom/host/ loads the renderer');
{
    const hostDir = path.join(ROOT, 'deep-zoom', 'host');
    /** Every module a source refers to: import, export-from, `import('x')` as a call or a type. */
    const specifiers = (text: string): string[] => {
        const out: string[] = [];
        const visit = (n: ts.Node): void => {
            if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
                out.push(n.moduleSpecifier.text);
            } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
                out.push(n.argument.literal.text);
            } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
                out.push(n.arguments[0].text);
            }
            ts.forEachChild(n, visit);
        };
        visit(ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true));
        return out;
    };
    const loaders: string[] = [];
    let diveImports = -1;
    for (const name of readdirSync(hostDir).filter((n) => /\.tsx?$/.test(n)).sort()) {
        const specs = specifiers(readFileSync(path.join(hostDir, name), 'utf8'));
        if (specs.some((s) => /(^|\/)renderer(\/|$)/.test(s))) loaders.push(name);
        if (name === 'dive.ts') diveImports = specs.length;
    }
    check(specifiers("import { a } from '../renderer';\nimport type {\n    B,\n} from '../renderer/index';\nexport * from './x';\nconst m = await import('../renderer');\n// import '../renderer' in a comment").length === 4,
        'seam: the scanner sees an import, a type import over several lines, a re-export and a dynamic import, and not a comment');
    // Stage 2: paramMap.ts and looseParams.ts are typed against the module's api. A type import
    // loads nothing; moduleHost.ts stays the one file that imports a VALUE from the renderer.
    const typeOnly = (name: string): boolean =>
        [...readFileSync(path.join(hostDir, name), 'utf8').matchAll(/^import\s+(type\s+)?[^;]*?from\s+'[^']*renderer[^']*';/gm)].every((m) => m[1] !== undefined);
    check(loaders.join() === 'looseParams.ts,moduleHost.ts,paramMap.ts' && typeOnly('looseParams.ts') && typeOnly('paramMap.ts') && !typeOnly('moduleHost.ts'),
        'seam: under deep-zoom/host/ only moduleHost.ts loads deep-zoom/renderer; paramMap.ts and looseParams.ts import its types only', loaders.join(', '));
    check(diveImports === 0, 'seam: dive.ts loads nothing at all', `${diveImports} imports`);
}

check(unhandled.length === 0, 'the whole run raised no unhandled rejection', unhandled.map(String).join(' | '));

// Printed so a falsification run can show which files it ran against.
const digest = (rel: string): string => createHash('sha256').update(readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 12);
console.log(`\nmoduleHost.ts ${digest('deep-zoom/host/moduleHost.ts')}  dive.ts ${digest('deep-zoom/host/dive.ts')}`);
console.log(failures === 0 ? 'module-host: all green' : `module-host: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
