/**
 * smoke:deep-zoom - the Deep Zoom shell (`deep-zoom.html`) on the REAL GPU. This file is the
 * RUNNER: it launches Chrome, finds every `debug/deep-zoom-smoke/stage*.mts` at run time and runs
 * their steps. It holds no step of its own. A stage adds ONE FILE of steps and never edits this one.
 *
 *   npm run dev                                            (port 3400), then
 *   npm run smoke:deep-zoom                                every stage
 *   ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom
 *   npm run smoke:deep-zoom -- --stage 1                   one stage (repeatable, or 1,2)
 *   npm run smoke:deep-zoom -- --stage 1 --step "hold W"   the steps whose name contains the text
 *                                                          (repeatable; any case)
 *   npm run smoke:deep-zoom -- --list                      print every step, its owner and how it
 *                                                          was seen red; opens no browser
 *
 * The address in the environment is the dev server: its origin (`http://localhost:3410`) or the
 * page's full address. Only the origin is used; the page is always `/deep-zoom.html`.
 * Exit 0 all green, 1 any FAIL or "not proven", 2 the harness could not run (no server, a software
 * renderer, a bad stage file, a bad argument).
 *
 * WHY HEADED CHROME ON ANGLE D3D11. Headless Chromium without a GPU is SwiftShader: the deep
 * (perturbation) shader takes minutes to compile there, or draws something that proves nothing.
 * The runner prints the WebGL renderer first and refuses a software one. For the same reason this
 * smoke is not in `debug/run-smokes.mts` (smoke:all). One real-GPU smoke at a time on a machine.
 *
 * WINDOWLESS RUNS. A headed run opens a Chrome window that takes the keyboard: whatever is typed
 * while it is in front lands in the page under test. `DZ_HEADLESS=1 npm run smoke:deep-zoom` runs
 * the same Chrome with no window, and since stage N5 (nothing captures the pointer any more) no
 * step needs a window. It is only a valid run if the first line still names the real GPU (the
 * software-renderer refusal applies unchanged).
 *
 * DEV SERVER ONLY. A step reaches the renderer through the host, which the page publishes as
 * `globalThis.__appHandles['deep-zoom.host'].ref.current` under `import.meta.env.DEV` alone (grep
 * `__appHandles` in `engine/appHandles.ts`). Against a build no host is ever found and the boot
 * says so. `ctx.host` / `ctx.withHost` / `ctx.HOST` hide that path: stage files never spell it.
 *
 * ── BEFORE ADDING A STEP ────────────────────────────────────────────────────────────────────────
 * A step has to earn its place: it costs real-GPU seconds on every run, for good. The default for
 * a change is NO new step - try it once by hand and say what it showed. Add one only for a seam
 * nothing cheaper can see (the GPU, a panel that has to open, storage across a reload, the boot),
 * that is new ground (not a second way into code a step already opens; not a default, a label or
 * a rate), and whose failure nobody would see at once. The bar and where it comes from (the
 * owner, 2026-10-09): `plans/deep-zoom-shell/BUILD-PLAN.md`, "Smoke growth".
 *
 * ── HOW A STAGE ADDS ITS FILE ───────────────────────────────────────────────────────────────────
 * Create `debug/deep-zoom-smoke/stage<id>.mts` (`stage2.mts`, `stage6a.mts`, `stageN5.mts`) with
 * ONE export, `stage`. Nothing else is needed: no list to edit, no npm script. Files run in name
 * order with numbers by value (stage1, stage2, ..., stage6a, stage6b, stage7, stageL5, stageN5).
 *
 *   import type { DzStage } from '../smoke-deep-zoom.mts';     // TYPE import only (see PITFALLS)
 *
 *   export const stage: DzStage = {
 *       id: '2',                                   // the file name without `stage` and `.mts`
 *       title: 'every look control is an engine panel, with undo',
 *       steps: [
 *           {
 *               name: 'drag Detail: host.getParams().detail changed',   // unique in the file
 *               owner: 'S2-3',                     // the package that owns the BEHAVIOUR
 *               falsified: '2026-10-09: dropped `detail` from paramMap.ts -> "detail 2 -> 2"',
 *               async run(ctx) {
 *                   const before = await ctx.host<number>('getParams().detail');
 *                   // ... drive the page through ctx.page ...
 *                   ctx.check((await ctx.host<number>('getParams().detail')) !== before, 'detail changed');
 *               },
 *           },
 *       ],
 *   };
 *
 * THE STEP SHAPE (`DzStep`, below):
 *   name       what the step proves. Unique in its file. `--step` matches a part of it.
 *   owner      the package that owns the behaviour, so a red step has one owner (BUILD-PLAN,
 *              "Rules for every package").
 *   falsified  how the step was SEEN RED: what was broken, what the step printed, the date. A step
 *              nobody could turn red says `not falsified: <why>`. Never claim a red you did not see.
 *   timeoutMs  optional, default 120 s. A step that runs over is a FAIL and the page is replaced.
 *   run(ctx)   the step. It passes when it made at least one `ctx.check`, every check was true,
 *              it reported no `ctx.notProven`, it did not throw, and no page error or console
 *              error arrived while it ran.
 *
 * THE CONTEXT (`DzCtx`, below, with a comment on every member). In short:
 *   page, context, origin, url, root, HOST            the raw material
 *   boot(opts?) -> DzBoot, bootInfo                   a fresh app; the timings of the last boot
 *   ev<T>(body), host<T>(member), withHost<T>(body), store<T>(path)
 *   until(body, ms), untilHost(cond, ms), sleep(ms)
 *   focusPicture(), holdKey(key, ms), pictureCentre()
 *   check(ok, what), notProven(what), note(what), shot(name)
 *   pageErrors, consoleLines, consoleErrors, expectConsoleError(pattern, why)
 *   downloads, dialogs(mode), dialogLog
 *
 * ISOLATION. One browser for the run. Each STAGE FILE gets a fresh browser context (so
 * localStorage, IndexedDB and session state never pass from one stage to the next) and one page,
 * which the runner boots before the first step. STEPS OF A STAGE SHARE THAT PAGE, in file order:
 * a step sees the camera, the panels and the storage the steps before it left. So write each step
 * to stand alone (it may be run alone with `--step`): set the state it needs at its start, and
 * call `await ctx.boot()` when it needs a fresh app (same context, so storage survives the reload;
 * `ctx.boot({ clearStorage: true })` wipes it first). Before every step the runner puts the
 * viewport back to 1280 x 800. Nothing else is reset.
 *
 * WHAT FAILS BESIDES A CHECK. Any `pageerror`; any console line of type `error`; any console
 * line that starts `[TickRegistry] tick "<name>" threw` at any level (`engine/TickRegistry.ts`
 * catches a throwing tick and logs it once, so a `step` that throws every frame raises no page
 * error). Each is charged to the step it arrived in; one that arrives during the boot or between
 * steps fails the stage's closing line. Console WARNINGS never fail: in deep mode Chrome prints
 * dozens of `performance warning: READ-usage buffer` lines for the renderer's readbacks. A step
 * that provokes an error on purpose calls `ctx.expectConsoleError(pattern, why)` first.
 *
 * "NOT PROVEN". A step that cannot establish its own precondition (something the browser or the
 * machine decides, not the shell) calls `ctx.notProven(what)` and returns. Not proven counts as a
 * FAILURE, never as a pass. (It was written for pointer lock, which left at stage N5.)
 *
 * PITFALLS
 *   - EVERY `page.evaluate` TAKES A STRING. tsx wraps a function callback in a `__name` helper
 *     that does not exist in the page. `ctx.ev`, `ctx.host`, `ctx.withHost`, `ctx.store` and
 *     `ctx.until` take strings for that reason; do the same with `ctx.page.evaluate`. Values come
 *     back through JSON-like cloning: return plain data, not the host or a DOM node.
 *   - A stage file imports this file's TYPES only (`import type`). A value import would load the
 *     runner a second time; it is guarded (the runner only starts when it is the entry script),
 *     but there is nothing here to import: everything a step needs is on `ctx`.
 *   - Never keep the host across an `await` in page code written by hand: the holder is emptied
 *     and refilled by a context-loss remount. `ctx.host` reads it fresh on every call.
 *   - One Bash call on the build machine is capped at 10 minutes and this smoke grows with every
 *     stage: run it a stage at a time (`--stage`). Measured 2026-10-08 on the dev server: the
 *     first load of a run takes 6 to 8 s (the browser fetches every module), a `ctx.boot()` after
 *     it about 1 s, and stage 1's 19 steps about 20 s in all.
 *   - The engine's text fields stop their own key events (`stopNavKeys`, and `ProjectName`'s
 *     input), so "a key typed in a field does not reach the renderer" is true twice over and a
 *     step about a field cannot prove the renderer's key target. Test that with the focus on the
 *     page body (stage 1 does).
 *   - A step's screenshots go to `debug/scratch/deep-zoom-shell-<name>.png` (git-ignored). A
 *     failing step gets one automatically: `deep-zoom-shell-fail-<stage>-<step number>.png`.
 *   - Do not add a dive that must ARRIVE to a step before the module's distance estimate is
 *     fixed: measured 2026-10-08, `host.diveTo` from the boot view lands about 250 times off its
 *     target (the estimate flips between the f32 and deep modes near 1e-4).
 *   - `check:rule-guards` resolves this smoke to the app it boots from the default address in the
 *     `DEFAULT_ADDRESS` line below. Keep `/deep-zoom.html` in that literal.
 *
 * @assumption The runner's own rules hold: a fresh context per stage file, storage kept by
 *   `boot()` and wiped by `clearStorage`, a throwing step / a step with no check / a console
 *   error / a page error / a step over its time each a FAIL charged to that step, an expected
 *   console error not, a late check of an abandoned step counted nowhere, the page replaced after
 *   a timeout, the viewport put back before each step, "not proven" a failure.
 *   NO STANDING TEST runs the runner itself. Seen once, on 2026-10-08, with a throwaway pair of
 *   stage files (12 steps: the 7 written to pass passed, the 5 written to fail failed, each for
 *   its own reason), and "not proven" with the shell's `requestPointerLock` call removed. If you
 *   change the running code below, write such a pair again (a step named for the outcome it
 *   expects is enough), run it with `--stage`, and delete it.
 */
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Download, Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ── The shapes a stage file codes against ────────────────────────────────────────────────────────

/** One stage file's export: `export const stage: DzStage = { ... }`. */
export interface DzStage {
    /** The file name without `stage` and `.mts`: `'1'`, `'6a'`, `'N5'`. Checked against the file. */
    id: string;
    /** One line: what the stage adds. Printed as the stage's heading. */
    title: string;
    /** Run in this order, on one page. At least one. */
    steps: DzStep[];
}

/** One step. See THE STEP SHAPE in the header. */
export interface DzStep {
    name: string;
    owner: string;
    falsified: string;
    timeoutMs?: number;
    run(ctx: DzCtx): Promise<void>;
}

/** What `ctx.boot()` measured. Times are milliseconds from the navigation. */
export interface DzBoot {
    /** Until a host was in the holder. */
    hostMs: number;
    /** `host.ready` resolved. */
    ready: boolean;
    /** Until `host.ready` resolved; -1 when it did not. */
    readyMs: number;
    /** '' when ready, else why not (rejected with a message, still pending, no frame ran). */
    readyError: string;
    /** Until `#dz-boot-splash` left the document; -1 when it was still there. */
    splashMs: number;
    /** `host.frameCount()` when the boot returned. */
    frames: number;
}

export interface DzBootOptions {
    /** Appended to the address: `'?x=1'`. */
    search?: string;
    /** Appended after the search: `'#...'`. */
    hash?: string;
    /** Wipe this origin's localStorage, IndexedDB and caches before loading. */
    clearStorage?: boolean;
}

/** One console message of the page. `during` is the step it arrived in, or `(boot)` / `(between steps)`. */
export interface DzConsoleLine {
    type: string;
    text: string;
    during: string;
    /** Set when a step said beforehand that this error was coming: the reason it gave. */
    expected?: string;
}

/** What a step is handed. Every string `body` is evaluated IN THE PAGE. */
export interface DzCtx {
    /** The stage's page. Read it afresh after `boot()`; do not keep it across steps. */
    readonly page: Page;
    /** The stage's browser context (fresh per stage file). */
    readonly context: BrowserContext;
    /** The dev server: `http://localhost:3410`. */
    readonly origin: string;
    /** The shell's address: origin + `/deep-zoom.html`. */
    readonly url: string;
    /** The repository root on disk, for a step that reads source files. */
    readonly root: string;
    /** A page-side EXPRESSION for the mounted host (or null), to build a body by hand:
     *  `ctx.ev('(' + ctx.HOST + ').frameCount()')`. Prefer `host` / `withHost`. */
    readonly HOST: string;

    /** Load a fresh app in this stage's page: navigate to `/deep-zoom.html`, wait for a host in
     *  the holder (60 s, throws if none) and for `host.ready` (120 s, reported in the result, not
     *  thrown). Storage survives unless `clearStorage` is set. */
    boot(opts?: DzBootOptions): Promise<DzBoot>;
    /** The result of the last boot of this page (the runner's own boot before the first step). */
    readonly bootInfo: DzBoot;

    /** Evaluate an expression in the page: `await ctx.ev<number>('window.innerWidth')`. */
    ev<T>(body: string): Promise<T>;
    /** Evaluate `host.<member>`: `await ctx.host<number>('frameCount()')`,
     *  `await ctx.host<string[]>('getView().cam')`. Throws when no host is mounted. */
    host<T>(member: string): Promise<T>;
    /** Run statements with `host` in scope, in an async function; `return` the value:
     *  `await ctx.withHost<number>('host.setView(' + JSON.stringify(v) + '); return host.telemetry().depth;')`. */
    withHost<T>(body: string): Promise<T>;
    /** Read the engine store: `await ctx.store<number>('renderFps')` is
     *  `window.__store.getState().renderFps`. */
    store<T>(path: string): Promise<T>;
    /** Poll a page expression until it is truthy. Returns the milliseconds waited, or -1 on the
     *  timeout. A throwing expression counts as false. Default poll 100 ms. */
    until(body: string, timeoutMs: number, pollMs?: number): Promise<number>;
    /** `until` for a condition on the host, with `host` in scope (false while none is mounted):
     *  `await ctx.untilHost('host.telemetry().accumN > 32', 15000)`. */
    untilHost(cond: string, timeoutMs: number, pollMs?: number): Promise<number>;
    sleep(ms: number): Promise<void>;

    /** Give `#dz-frame` the keyboard. Returns whether it has focus. */
    focusPicture(): Promise<boolean>;
    /** `keyboard.down(key)`, wait, `keyboard.up(key)`. A held key, not a typed character. */
    holdKey(key: string, ms: number): Promise<void>;
    /** The centre of `#dz-frame` in viewport pixels. */
    pictureCentre(): Promise<{ x: number; y: number }>;

    /** One assertion. Prints `ok` / `FAIL`; a false one fails the step. Returns `ok`. */
    check(ok: boolean, what: string): boolean;
    /** The step could not establish its precondition. Fails the step, printed as NOT PROVEN. */
    notProven(what: string): void;
    /** A line of output that is neither. */
    note(what: string): void;
    /** Screenshot to `debug/scratch/deep-zoom-shell-<name>.png`. */
    shot(name: string): Promise<void>;

    /** Every `pageerror` of this stage so far (boot included), newest last. */
    readonly pageErrors: readonly string[];
    /** Every console message of this stage so far, all levels. */
    readonly consoleLines: readonly DzConsoleLine[];
    /** The console lines that fail a run: type `error`, or a throwing-tick line; not the expected ones. */
    readonly consoleErrors: readonly DzConsoleLine[];
    /** Say that the rest of THIS step will log a console error matching `pattern`, and why. Such
     *  a line is kept in `consoleLines` with `expected` set and fails nothing. */
    expectConsoleError(pattern: RegExp, why: string): void;

    /** Files the page handed to the browser in this stage (`await d.path()`, `d.suggestedFilename()`). */
    readonly downloads: readonly Download[];
    /** What to do with an alert / confirm / prompt for the rest of THIS step. Default `'dismiss'`. */
    dialogs(mode: 'accept' | 'dismiss'): void;
    /** Every dialog of this stage: `confirm: Delete this?`. */
    readonly dialogLog: readonly string[];
}

// ── Configuration ────────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE_DIR = path.join(ROOT, 'debug', 'deep-zoom-smoke');
const SHOT_PREFIX = 'debug/scratch/deep-zoom-shell-';
const PAGE_PATH = '/deep-zoom.html';
/** The default names the page so `debug/check-rule-guards.mjs` can tell which app this smoke boots. */
const DEFAULT_ADDRESS = process.env.ENGINE_URL || 'http://localhost:3400/deep-zoom.html';
/** '' when the address is not an http(s) one; `main` reports that. */
const ORIGIN = (() => {
    try {
        const o = new URL(DEFAULT_ADDRESS).origin;
        return o.startsWith('http') ? o : '';
    } catch { return ''; }
})();
const PAGE_URL = ORIGIN + PAGE_PATH;

const VIEWPORT = { width: 1280, height: 800 };
const HOST_TIMEOUT_MS = 60_000;
/** `DZ_READY_TIMEOUT_MS` in deep-zoom/host/moduleHost.ts: the host's own limit for the deep shader. */
const READY_TIMEOUT_MS = 120_000;
/** A host that has drawn no frame this long after it appeared is not being stepped: stop waiting. */
const NO_FRAME_MS = 15_000;
const STEP_TIMEOUT_MS = 120_000;

/** The mounted host, or null. The holder exists on the dev server only. */
const HOST = "(globalThis.__appHandles && globalThis.__appHandles['deep-zoom.host'] ? globalThis.__appHandles['deep-zoom.host'].ref.current : null)";
const FRAME_SEL = '#dz-frame';
const TICK_THREW = /^\[TickRegistry\] tick "[^"]+" threw/;
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render/i;

const LAUNCH_ARGS = [
    '--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu',
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
];

/** Attaches to the CURRENT host's `ready` promise once and answers `pending`, `resolved`,
 *  `rejected: <message>` or `no host`. Re-attaches when the holder holds another host. */
const READY_PROBE = '(() => { const h = ' + HOST + "; if (!h) return 'no host';"
    + " if (window.__dzSmokeReadyHost !== h) { window.__dzSmokeReadyHost = h; window.__dzSmokeReady = 'pending';"
    + " h.ready.then(() => { if (window.__dzSmokeReadyHost === h) window.__dzSmokeReady = 'resolved'; },"
    + " (e) => { if (window.__dzSmokeReadyHost === h) window.__dzSmokeReady = 'rejected: ' + ((e && e.message) || e); }); }"
    + ' return window.__dzSmokeReady; })()';

/** Why no host appeared: the error boundary, the shell's own failure card, or not a dev server. */
const WHY_NO_HOST = '(() => { const out = [];'
    + " const b = window.__lastBoundaryError; if (b) out.push('the error boundary caught: ' + (b.message || b));"
    + " const card = document.querySelector('[data-dz-boot=failed]'); if (card) out.push('the failure card shows: ' + card.innerText.replace(/\\s+/g, ' ').slice(0, 200));"
    + " if (!globalThis.__appHandles) out.push('globalThis.__appHandles does not exist: the holder is published on the dev server only, never by a build');"
    + " if (!document.querySelector('" + FRAME_SEL + "')) out.push('no " + FRAME_SEL + " in the document');"
    + " return out.join(' | '); })()";

const FRAME_COUNT = '(' + HOST + ').frameCount()';
const SPLASH_GONE = "!document.getElementById('dz-boot-splash')";

// ── Small helpers ────────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const secs = (ms: number) => (ms / 1000).toFixed(1) + ' s';
const firstLine = (e: unknown) => String((e as Error)?.message ?? e).split('\n')[0];
const oneLine = (s: string, max = 300) => s.replace(/\s+/g, ' ').trim().slice(0, max);

const evOn = <T,>(page: Page, body: string) => page.evaluate(body) as Promise<T>;

async function untilOn(page: Page, body: string, timeoutMs: number, pollMs = 100, alive: () => void = () => undefined): Promise<number> {
    const t0 = Date.now();
    while (true) {
        alive();
        if (await page.evaluate('!!(' + body + ')').catch(() => false)) return Date.now() - t0;
        if (Date.now() - t0 >= timeoutMs) return -1;
        await sleep(pollMs);
    }
}

function argValues(argv: string[], flag: string, splitCommas: boolean): string[] {
    const out: string[] = [];
    argv.forEach((a, i) => {
        let v: string | undefined;
        if (a === flag) v = argv[i + 1];
        else if (a.startsWith(flag + '=')) v = a.slice(flag.length + 1);
        if (v === undefined) return;
        if (splitCommas) out.push(...v.split(','));
        else out.push(v);
    });
    return out.map((s) => s.trim()).filter(Boolean);
}

/** The run cannot start or go on: exit 2, not a failed step. */
class HarnessError extends Error {}

// ── Stage files ──────────────────────────────────────────────────────────────────────────────────

interface StageFile { file: string; id: string; rel: string }
interface LoadedStage { file: StageFile; stage: DzStage }

function discoverStages(): StageFile[] {
    if (!fs.existsSync(STAGE_DIR)) return [];
    return fs.readdirSync(STAGE_DIR)
        .filter((f) => /^stage[^.]+\.mts$/.test(f))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
        .map((f) => ({ file: path.join(STAGE_DIR, f), id: f.slice('stage'.length, -'.mts'.length), rel: 'debug/deep-zoom-smoke/' + f }));
}

/** Import one stage file and check its export has the shape the header describes. */
async function loadStage(file: StageFile): Promise<LoadedStage> {
    const mod = (await import(pathToFileURL(file.file).href)) as { stage?: unknown };
    const bad = (why: string) => new HarnessError(file.rel + ': ' + why);
    const stage = mod.stage as DzStage | undefined;
    if (!stage || typeof stage !== 'object') throw bad('no `export const stage`');
    if (stage.id !== file.id) throw bad('exports id ' + JSON.stringify(stage.id) + ', the file name says ' + JSON.stringify(file.id));
    if (typeof stage.title !== 'string' || !stage.title.trim()) throw bad('`title` is empty');
    if (!Array.isArray(stage.steps) || stage.steps.length === 0) throw bad('`steps` is empty');
    const names = new Set<string>();
    stage.steps.forEach((s, i) => {
        const at = 'step ' + (i + 1) + (s && typeof s.name === 'string' ? ' ("' + s.name + '")' : '');
        if (!s || typeof s !== 'object') throw bad(at + ' is not an object');
        for (const key of ['name', 'owner', 'falsified'] as const) {
            if (typeof s[key] !== 'string' || !s[key].trim()) throw bad(at + ': `' + key + '` is empty (every step names its owner and how it was seen red)');
        }
        if (typeof s.run !== 'function') throw bad(at + ': `run` is not a function');
        if (names.has(s.name)) throw bad(at + ': the name is used twice in this file');
        names.add(s.name);
    });
    return { file, stage };
}

// ── One stage: its context, its page, what the page said ─────────────────────────────────────────

interface StepState {
    label: string;
    checks: number;
    failures: string[];
    notProven: string[];
    expected: Array<{ re: RegExp; why: string }>;
    dialogMode: 'accept' | 'dismiss';
    /** Set when the step ran over its time: its context refuses every further call. */
    abandoned: boolean;
}

const newStepState = (label: string): StepState => (
    { label, checks: 0, failures: [], notProven: [], expected: [], dialogMode: 'dismiss', abandoned: false }
);

/** A page error or a failing console line, and whether a step has been charged for it. */
interface Incident { text: string; during: string; charged: boolean }

function isFatal(line: DzConsoleLine): boolean {
    return line.type === 'error' || TICK_THREW.test(line.text);
}

class StageSession {
    page!: Page;
    bootInfo: DzBoot = { hostMs: -1, ready: false, readyMs: -1, readyError: 'not booted', splashMs: -1, frames: 0 };
    readonly pageErrors: string[] = [];
    readonly consoleLines: DzConsoleLine[] = [];
    readonly incidents: Incident[] = [];
    readonly downloads: Download[] = [];
    readonly dialogLog: string[] = [];
    /** The step whose page activity is being recorded; a placeholder outside steps. */
    current: StepState = newStepState('(boot)');

    constructor(readonly context: BrowserContext) {}

    /** A new page with the listeners on it; the previous one is closed. */
    async openPage(): Promise<void> {
        const old = this.page as Page | undefined;
        if (old && !old.isClosed()) await old.close().catch(() => undefined);
        const page = await this.context.newPage();
        page.on('pageerror', (err) => {
            const text = oneLine(String((err && err.stack) || err), 600);
            this.pageErrors.push(text);
            this.incidents.push({ text: 'pageerror: ' + text, during: this.current.label, charged: false });
        });
        page.on('console', (msg) => {
            const text = msg.text();
            const line: DzConsoleLine = { type: msg.type(), text, during: this.current.label };
            if (isFatal(line)) {
                const hit = this.current.expected.find((x) => x.re.test(text));
                if (hit) line.expected = hit.why;
                else this.incidents.push({ text: 'console ' + line.type + ': ' + oneLine(text), during: line.during, charged: false });
            }
            this.consoleLines.push(line);
        });
        page.on('download', (d) => { this.downloads.push(d); });
        page.on('dialog', (d) => {
            this.dialogLog.push(d.type() + ': ' + oneLine(d.message(), 200));
            (this.current.dialogMode === 'accept' ? d.accept() : d.dismiss()).catch(() => undefined);
        });
        this.page = page;
    }

    get consoleErrors(): DzConsoleLine[] {
        return this.consoleLines.filter((l) => isFatal(l) && !l.expected);
    }

    async boot(opts: DzBootOptions = {}, alive: () => void = () => undefined): Promise<DzBoot> {
        const page = this.page;   // this page throughout, even if the session is given another meanwhile
        // Through a blank page: an address that differs only in its hash would not reload.
        await page.goto('about:blank');
        if (opts.clearStorage) {
            const cdp = await this.context.newCDPSession(page);
            await cdp.send('Storage.clearDataForOrigin', {
                origin: ORIGIN,
                storageTypes: 'local_storage,indexeddb,websql,cache_storage,service_workers,file_systems',
            }).catch(() => undefined);
            await cdp.detach().catch(() => undefined);
        }
        const whyNoHost = () => evOn<string>(page, WHY_NO_HOST).catch((e) => 'the page is not answering (' + firstLine(e) + ')');
        const t0 = Date.now();
        await page.goto(PAGE_URL + (opts.search ?? '') + (opts.hash ?? ''), { waitUntil: 'domcontentloaded', timeout: HOST_TIMEOUT_MS });

        if ((await untilOn(page, HOST, HOST_TIMEOUT_MS, 50, alive)) < 0) {
            const why = await whyNoHost();
            throw new Error('no host in the holder ' + secs(HOST_TIMEOUT_MS) + ' after loading ' + PAGE_URL + (why ? ': ' + why : ''));
        }
        const hostMs = Date.now() - t0;
        const tHost = Date.now();

        let state = 'pending';
        let splashMs = -1;
        let noHostSince = 0;
        while (true) {
            alive();
            state = await evOn<string>(page, READY_PROBE).catch((e) => 'the page is not answering (' + firstLine(e) + ')');
            if (splashMs < 0 && await evOn<boolean>(page, SPLASH_GONE).catch(() => false)) splashMs = Date.now() - t0;
            if (state === 'no host') {
                // The holder is empty for a moment across a remount; a host that stays away has failed.
                if (!noHostSince) noHostSince = Date.now();
                if (Date.now() - noHostSince > 5000) { state = 'the host left the holder: ' + (await whyNoHost()); break; }
            } else {
                noHostSince = 0;
                if (state !== 'pending') break;
                if (Date.now() - tHost > NO_FRAME_MS && (await evOn<number>(page, FRAME_COUNT).catch(() => -1)) === 0) {
                    state = 'no frame ran in the ' + secs(NO_FRAME_MS) + ' after the host appeared: nothing is stepping it (host.ready is polled from host.step)';
                    break;
                }
            }
            if (Date.now() - t0 > READY_TIMEOUT_MS) { state = 'host.ready is still pending ' + secs(READY_TIMEOUT_MS) + ' after loading'; break; }
            await sleep(100);
        }
        const ready = state === 'resolved';
        const readyMs = ready ? Date.now() - t0 : -1;
        if (splashMs < 0 && (await untilOn(page, SPLASH_GONE, 3000, 50, alive)) >= 0) splashMs = Date.now() - t0;
        const frames = await evOn<number>(page, FRAME_COUNT).catch(() => 0);
        this.bootInfo = { hostMs, ready, readyMs, readyError: ready ? '' : state, splashMs, frames };
        return this.bootInfo;
    }

    /** Before a step: the default viewport. Nothing else is reset (see ISOLATION). */
    async tidy(): Promise<void> {
        const vp = this.page.viewportSize();
        if (!vp || vp.width !== VIEWPORT.width || vp.height !== VIEWPORT.height) await this.page.setViewportSize(VIEWPORT);
    }
}

/** The object a step is handed. Its checks land in that step's own state, and once the step is
 *  abandoned (it ran over its time) every call throws, so a step still running in the background
 *  can neither write into the next step nor drive the next step's page. */
function makeCtx(session: StageSession, state: StepState, log: (line: string) => void): DzCtx {
    const alive = () => { if (state.abandoned) throw new Error('this step ran over its time and was abandoned'); };
    const ev = <T,>(body: string): Promise<T> => { alive(); return evOn<T>(session.page, body); };
    const hostBody = (inner: string) =>
        '(async (host) => { if (!host) throw new Error("no host is mounted (the holder is empty)"); ' + inner + ' })(' + HOST + ')';
    const until = (body: string, timeoutMs: number, pollMs?: number) => { alive(); return untilOn(session.page, body, timeoutMs, pollMs, alive); };
    const ctx: DzCtx = {
        get page() { alive(); return session.page; },
        context: session.context,
        origin: ORIGIN,
        url: PAGE_URL,
        root: ROOT,
        HOST,
        boot: (opts) => { alive(); return session.boot(opts, alive); },
        get bootInfo() { return session.bootInfo; },
        ev,
        host: (member) => ev(hostBody('return host.' + member + ';')),
        withHost: (body) => ev(hostBody(body)),
        store: (p) => ev('window.__store.getState().' + p),
        until,
        untilHost: (cond, timeoutMs, pollMs) => until('((host) => !!host && (' + cond + '))(' + HOST + ')', timeoutMs, pollMs),
        sleep,
        async focusPicture() {
            alive();
            await session.page.focus(FRAME_SEL, { timeout: 2000 }).catch(() => undefined);
            return ev<boolean>("!!document.activeElement && document.activeElement.id === 'dz-frame'");
        },
        async holdKey(key, ms) {
            alive();
            const page = session.page;
            await page.keyboard.down(key);
            try { await sleep(ms); } finally { await page.keyboard.up(key).catch(() => undefined); }
        },
        async pictureCentre() {
            const box = await ev<{ x: number; y: number } | null>(
                "(() => { const f = document.querySelector('" + FRAME_SEL + "'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()",
            );
            if (!box) throw new Error('no ' + FRAME_SEL + ' in the document');
            return box;
        },
        check(ok, what) {
            alive();
            state.checks++;
            log((ok ? '       ok    ' : '       FAIL  ') + what);
            if (!ok) state.failures.push(what);
            return ok;
        },
        notProven(what) {
            alive();
            log('       NOT PROVEN  ' + what);
            state.notProven.push(what);
        },
        note(what) { if (!state.abandoned) log('             ' + what); },
        async shot(name) {
            alive();
            const file = SHOT_PREFIX + name + '.png';
            await session.page.screenshot({ path: path.join(ROOT, file) }).catch(() => undefined);
            log('             shot ' + file);
        },
        get pageErrors() { return session.pageErrors; },
        get consoleLines() { return session.consoleLines; },
        get consoleErrors() { return session.consoleErrors; },
        expectConsoleError(pattern, why) { state.expected.push({ re: pattern, why }); },
        get downloads() { return session.downloads; },
        dialogs(mode) { state.dialogMode = mode; },
        get dialogLog() { return session.dialogLog; },
    };
    return ctx;
}

// ── Running ──────────────────────────────────────────────────────────────────────────────────────

interface StepResult { stageId: string; index: number; step: DzStep; ok: boolean; why: string[]; ms: number }

const stepTag = (stageId: string, index: number) => '[' + stageId + '.' + String(index + 1).padStart(2, '0') + ']';
const log = (line: string) => console.log(line);

async function failShot(session: StageSession, name: string): Promise<void> {
    await session.page.screenshot({ path: path.join(ROOT, SHOT_PREFIX + name + '.png') }).catch(() => undefined);
    log('             shot ' + SHOT_PREFIX + name + '.png');
}

/** One stage file: a fresh context, one page, the picked steps in order. `closing` lists the page
 *  errors and console errors that no step was charged for (the boot, the gaps between steps). */
async function runStage(browser: Browser, loaded: LoadedStage, picked: number[]): Promise<{ results: StepResult[]; closing: string[] }> {
    const { stage, file } = loaded;
    const results: StepResult[] = [];
    log('\n── stage ' + stage.id + ' · ' + stage.title + '  (' + file.rel + ')');

    const context = await browser.newContext({ viewport: VIEWPORT, acceptDownloads: true });
    const session = new StageSession(context);
    const notRun = (why: string) => {
        for (const index of picked) {
            if (results.some((r) => r.index === index)) continue;
            log(stepTag(stage.id, index) + ' ' + stage.steps[index].name + '\n     => FAIL  not run: ' + why);
            results.push({ stageId: stage.id, index, step: stage.steps[index], ok: false, why: ['not run: ' + why], ms: 0 });
        }
    };
    const uncharged = () => session.incidents.filter((x) => !x.charged).map((x) => x.text + '  [arrived ' + x.during + ']');

    try {
        await session.openPage();
        try {
            const b = await session.boot();
            log('     boot: host in the holder after ' + b.hostMs + ' ms · '
                + (b.ready ? 'host.ready after ' + b.readyMs + ' ms' : 'host.ready NOT resolved (' + b.readyError + ')')
                + ' · ' + (b.splashMs >= 0 ? 'splash gone after ' + b.splashMs + ' ms' : 'splash still up'));
        } catch (err) {
            await failShot(session, 'fail-' + stage.id + '-boot');
            notRun('the app did not boot: ' + firstLine(err));
            return { results, closing: uncharged() };
        }

        for (const index of picked) {
            const step = stage.steps[index];
            const tag = stepTag(stage.id, index);
            const state = newStepState(tag);
            log(tag + ' ' + step.name + '  (owner ' + step.owner + ')');
            const t0 = Date.now();
            const why: string[] = [];
            await session.tidy().catch(() => undefined);
            const incidentsBefore = session.incidents.length;
            session.current = state;

            const limit = step.timeoutMs ?? STEP_TIMEOUT_MS;
            let timedOut = false;
            const run = (async () => { await step.run(makeCtx(session, state, log)); })();
            run.catch(() => undefined);   // a step abandoned after its timeout must not raise an unhandled rejection
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                await Promise.race([
                    run,
                    new Promise<void>((resolve) => { timer = setTimeout(() => { timedOut = true; resolve(); }, limit); }),
                ]);
            } catch (err) {
                why.push('threw: ' + firstLine(err));
            } finally {
                if (timer) clearTimeout(timer);
            }
            if (timedOut) {
                state.abandoned = true;
                why.push('timed out after ' + secs(limit));
            } else {
                await sleep(150);   // an error the last action caused is still this step's
            }

            const printed = new Set(state.failures);
            for (const f of state.failures) why.push(f);
            for (const n of state.notProven) why.push('not proven: ' + n);
            for (const incident of session.incidents.slice(incidentsBefore)) {
                incident.charged = true;
                why.push(incident.text);
            }
            if (!why.length && state.checks === 0) why.push('the step made no check');
            session.current = newStepState('(between steps)');

            const ok = why.length === 0;
            if (!ok) {
                for (const w of why) if (!printed.has(w) && !w.startsWith('not proven: ')) log('       FAIL  ' + w);
                await failShot(session, 'fail-' + stage.id + '-' + String(index + 1).padStart(2, '0'));
            }
            log('     => ' + (ok ? 'ok  ' : 'FAIL') + '  (' + secs(Date.now() - t0) + ')');
            results.push({ stageId: stage.id, index, step, ok, why, ms: Date.now() - t0 });

            if (timedOut) {
                // The abandoned step may still be inside a call on the page: the next step gets a new one.
                try {
                    await session.openPage();
                    await session.boot();
                } catch (err) {
                    notRun('the app did not boot again after a step timed out: ' + firstLine(err));
                    break;
                }
            }
        }
        await sleep(300);
        return { results, closing: uncharged() };
    } finally {
        await context.close().catch(() => undefined);
    }
}

async function main(): Promise<number> {
    const argv = process.argv.slice(2);
    const known = ['--stage', '--step', '--list'];
    const unknown = argv.filter((a) => a.startsWith('--') && !known.some((k) => a === k || a.startsWith(k + '=')));
    if (unknown.length) throw new HarnessError('unknown argument ' + unknown.join(', ') + ' (known: --stage <ids>, --step <text>, --list)');
    const onlyStages = argValues(argv, '--stage', true).map((s) => s.toLowerCase());
    const onlySteps = argValues(argv, '--step', false).map((s) => s.toLowerCase());
    const listOnly = argv.includes('--list');
    if (!ORIGIN) throw new HarnessError('the address is not an http one: ' + DEFAULT_ADDRESS);

    const files = discoverStages();
    if (!files.length) throw new HarnessError('no stage file in debug/deep-zoom-smoke/ (stage*.mts)');
    const missing = onlyStages.filter((id) => !files.some((f) => f.id.toLowerCase() === id));
    if (missing.length) throw new HarnessError('no stage ' + missing.join(', ') + ' (found: ' + files.map((f) => f.id).join(', ') + ')');
    const wanted = files.filter((f) => !onlyStages.length || onlyStages.includes(f.id.toLowerCase()));

    const stages: LoadedStage[] = [];
    for (const f of wanted) stages.push(await loadStage(f));
    const plan = stages.map((loaded) => ({
        loaded,
        picked: loaded.stage.steps.map((_, i) => i)
            .filter((i) => !onlySteps.length || onlySteps.some((t) => loaded.stage.steps[i].name.toLowerCase().includes(t))),
    })).filter((p) => p.picked.length > 0);
    if (!plan.length) throw new HarnessError('no step matches --step ' + onlySteps.join(', '));

    if (listOnly) {
        for (const { loaded, picked } of plan) {
            log('\nstage ' + loaded.stage.id + ' · ' + loaded.stage.title + '  (' + loaded.file.rel + ')');
            for (const i of picked) {
                const s = loaded.stage.steps[i];
                log(stepTag(loaded.stage.id, i) + ' ' + s.name + '\n       owner      ' + s.owner + '\n       falsified  ' + s.falsified);
            }
        }
        return 0;
    }

    try {
        const res = await fetch(PAGE_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (err) {
        throw new HarnessError('no dev server answers at ' + PAGE_URL + ' (' + firstLine(err) + '). Run `npm run dev`, or pass the address in ENGINE_URL.');
    }

    const t0 = Date.now();
    // DZ_HEADLESS=1: no window (see the header, WINDOWLESS RUNS). Still Chrome, still the same GPU flags;
    // the renderer line printed below is what says whether this run is on the real GPU.
    const browser = await chromium.launch({ channel: 'chrome', headless: process.env.DZ_HEADLESS === '1', args: LAUNCH_ARGS });
    const all: StepResult[] = [];
    const closingFails: string[] = [];
    try {
        const probe = await browser.newPage();
        const renderer = await evOn<string>(probe, "(() => { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'no WebGL2'; const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unknown'; })()").catch(() => 'unknown');
        await probe.close();
        log('[smoke:deep-zoom] ' + PAGE_URL + ' · ' + plan.length + ' stage' + (plan.length === 1 ? '' : 's') + ' · WebGL: ' + renderer);
        if (renderer === 'no WebGL2' || SOFTWARE_RENDERER.test(renderer)) {
            throw new HarnessError('this is not the real GPU (' + renderer + '): the smoke proves nothing on a software renderer');
        }

        for (const { loaded, picked } of plan) {
            const tStage = Date.now();
            const { results, closing } = await runStage(browser, loaded, picked);
            all.push(...results);
            const bad = results.filter((r) => !r.ok).length;
            if (closing.length) {
                log('     FAIL  stage ' + loaded.stage.id + ': a page error or console error that no step was charged for');
                for (const c of closing) log('             ' + c);
                closingFails.push('stage ' + loaded.stage.id + ', outside any step: ' + closing.join(' | '));
            }
            log('   stage ' + loaded.stage.id + ': ' + (results.length - bad) + ' ok, ' + (bad + (closing.length ? 1 : 0)) + ' FAIL  (' + secs(Date.now() - tStage) + ')');
        }
    } finally {
        await browser.close().catch(() => undefined);
    }

    const failed = all.filter((r) => !r.ok);
    const failCount = failed.length + closingFails.length;
    if (failCount) {
        log('\nFAILED (' + failCount + '):');
        for (const r of failed) {
            log('  ' + stepTag(r.stageId, r.index) + ' ' + r.step.name + '  (owner ' + r.step.owner + ')');
            for (const w of r.why) log('         - ' + w);
            log('         how this step was seen red before: ' + r.step.falsified);
        }
        for (const c of closingFails) log('  ' + c);
    }
    log('\nsmoke:deep-zoom: ' + (all.length - failed.length) + ' ok, ' + failCount + ' FAIL  (' + all.length + ' step' + (all.length === 1 ? '' : 's')
        + ' of ' + plan.length + ' stage' + (plan.length === 1 ? '' : 's') + ', ' + secs(Date.now() - t0) + ')');
    return failCount ? 1 : 0;
}

// Only when this file is the script being run: a stage file that imports it by mistake as a value
// must not start a second run.
const samePath = (a: string, b: string) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && samePath(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
    main().then(
        // exitCode, not exit(): exit() on a piped stdout can drop the summary just printed
        (code) => { process.exitCode = code; },
        (err) => {
            if (err instanceof HarnessError) console.error('[smoke:deep-zoom] ' + err.message);
            else console.error('[smoke:deep-zoom] the harness crashed:', err);
            process.exitCode = 2;
        },
    );
}
