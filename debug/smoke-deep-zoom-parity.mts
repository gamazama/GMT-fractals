/**
 * Parity smoke: the ported deep-zoom renderer (deep-zoom/renderer/core.js, through
 * deep-zoom-harness.html) against the HISTORICAL standalone page it was ported from
 * (mandelbulb_deepzoom index.html at commit 3b65946), on the REAL GPU.
 *
 *   npx tsx debug/smoke-deep-zoom-parity.mts
 *   PORT=3400 npx tsx debug/smoke-deep-zoom-parity.mts     use a dev server that is already running
 *
 * Without PORT it starts its own Vite dev server on 3478 (log: debug/scratch/deep-zoom-parity-vite.log)
 * and stops it at the end. Headed Chrome on ANGLE/d3d11: headless means SwiftShader, which cannot
 * compile the perturbation shader in reasonable time. For the same reason this is not in smoke:all.
 *
 * The historical page is the engine's synced copy, public/deep-zoom-prototype-core/index.html, after
 * checking it is the pinned file apart from its one "SYNCED COPY" comment line. If it is not, the
 * pinned file is written to debug/scratch/deep-zoom-pinned/ and served from there.
 *
 * Checks (one line each, exit 1 on any FAIL):
 *   (a) pictures  — __renderThumb(160) at four positions of the page's sample flight under five
 *                   settings; pass = mean |difference| < 0.3 of 255 AND < 1.5 % of pixels more than
 *                   2 levels apart. The same two numbers for historical-against-historical are
 *                   printed beside each line: the page is known to differ from itself slightly.
 *   (b) numbers   — __directCheckHP GPU values equal to 1e-9 relative at two deep views;
 *                   __dz.telemetry() / settings() have the same keys and the same deterministic values.
 *   (c) the still — accumulation reaches its 64 samples with no WebGL error; __exportTimed(640, 4)
 *                   gives the same size and a mean level within 1.0.
 *   (d) lifecycle — with ?manual=1 frames advance only while step() is called; create, dispose,
 *                   create leaves one loop, the same listeners, one scaffold, and a correct picture.
 *
 * Every page.evaluate takes a STRING body: tsx injects `__name` into function callbacks.
 */
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'debug', 'scratch');
const SOURCE_REPO = process.env.DZ_SOURCE_REPO || 'H:/GMT/workspace-gmt/mandelbulb_deepzoom';
const SOURCE_COMMIT = '3b65946';
const OWN_PORT = 3478;
const READY_MS = 180_000;
const THUMB = 160;
const TAUS = [0.1, 0.5, 0.75, 0.95];
const NUMBER_TAUS = [0.75, 0.95];
const MEAN_MAX = 0.3;            // of 255
const OVER_MAX = 1.5;            // % of pixels more than 2 levels apart
const REL_MAX = 1e-9;

/** name, and the handle calls that differ from the page's defaults (D = the defaults read at boot) */
const SETTINGS: Array<[string, string]> = [
    ['defaults', ''],
    ['classic look', 'window.__setLook({ mode: 0 });'],
    ['reach short', 'window.__setReach(0);'],
    ['colour orbit-trap', 'window.__setColor(2, 1);'],
    ['detail 8', 'window.__setSurf(8);'],
];
const RESTORE = 'window.__setLook({ mode: D.look }); window.__setReach(D.s.reach); window.__setColor(D.s.color, D.s.cscale); window.__setSurf(D.s.detail);';
const PIN = 'window.__lockInput(true); window.__setGate(false); window.__setAccum(false); window.__setBla(false);';
const GL_ERR = "document.getElementById('gl').getContext('webgl2').getError()";

/* counts what the harness page asks of the browser, so the lifecycle checks can see loops and listeners */
const INIT_SCRIPT = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__parity = { frameReqs: 0, listeners: 0 };
  window.requestAnimationFrame = function (cb) { if (cb && cb.name === 'frame') window.__parity.frameReqs++; return raf(cb); };
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  const TYPES = ['keydown', 'keyup', 'mousemove', 'dragover', 'drop', 'pointerlockchange', 'click'];
  const watched = (t) => t === window || t === document || (t && t.id === 'gl');
  EventTarget.prototype.addEventListener = function (type, h, o) { if (watched(this) && TYPES.includes(type)) window.__parity.listeners++; return add.call(this, type, h, o); };
  EventTarget.prototype.removeEventListener = function (type, h, o) { if (watched(this) && TYPES.includes(type)) window.__parity.listeners--; return rem.call(this, type, h, o); };
})()`;

interface Shot { tau: number; setting: string; px: number[] | null; depth: number; iters: number; err: number; tel: Record<string, unknown>; set: Record<string, unknown> }
interface Probe { t: number; gpu: number; pert: number; direct: number; escG: boolean; escD: boolean; rel: number }
interface Numbers { tau: number; tvals: number[]; pts: Probe[] }
interface Still { reached: boolean; accumN: number; accumMax: number; errAccum: number; errExport: number; exp: { W?: number; H?: number; samples?: number; ms?: number; litFrac?: number; meanLevel?: number; error?: string } }
interface Shoot { label: string; defaults: { s: Record<string, unknown>; t: Record<string, unknown>; look: number }; shots: Shot[]; numbers: Numbers[]; still: Still; errors: string[]; readySec: number }

const failures: string[] = [];
function check(ok: boolean, what: string): boolean {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
    if (!ok) failures.push(what);
    return ok;
}
const info = (what: string) => console.log('      ' + what);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ev = async <T,>(page: Page, body: string) => (await page.evaluate(body)) as T;
const evJson = async <T,>(page: Page, body: string) => JSON.parse(await ev<string>(page, `JSON.stringify(${body})`)) as T;
const fx = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));

function pinnedFile(name: string): Buffer {
    return execFileSync('git', ['-C', SOURCE_REPO, 'show', `${SOURCE_COMMIT}:${name}`], { maxBuffer: 64 * 1024 * 1024 });
}

/** mean |difference| over RGB (of 255), % of pixels whose worst channel differs by more than 2, worst */
function compare(a: number[] | null, b: number[] | null): { mean: number; over: number; worst: number; level: number } {
    if (!a || !b || a.length !== b.length || a.length === 0) return { mean: NaN, over: NaN, worst: NaN, level: NaN };
    const n = a.length / 4;
    let sum = 0, over = 0, worst = 0, level = 0;
    for (let p = 0; p < n; p++) {
        let m = 0;
        for (let c = 0; c < 3; c++) { const d = Math.abs(a[p * 4 + c] - b[p * 4 + c]); sum += d; if (d > m) m = d; level += a[p * 4 + c]; }
        if (m > worst) worst = m;
        if (m > 2) over++;
    }
    return { mean: sum / (n * 3), over: 100 * over / n, worst, level: level / (n * 3) };
}
const within = (d: { mean: number; over: number }) => d.mean < MEAN_MAX && d.over < OVER_MAX;

async function reachable(origin: string): Promise<boolean> {
    try { const r = await fetch(origin + '/deep-zoom-harness.html'); return r.ok; } catch { return false; }
}

async function startServer(): Promise<{ origin: string; child: ChildProcess | null }> {
    if (process.env.PORT) {
        const origin = `http://localhost:${process.env.PORT}`;
        if (!(await reachable(origin))) throw new Error(`no dev server answers at ${origin} (PORT was given)`);
        return { origin, child: null };
    }
    const origin = `http://localhost:${OWN_PORT}`;
    if (await reachable(origin)) throw new Error(`port ${OWN_PORT} is already serving; stop that server or pass PORT=${OWN_PORT}`);
    fs.mkdirSync(SCRATCH, { recursive: true });
    const log = fs.openSync(path.join(SCRATCH, 'deep-zoom-parity-vite.log'), 'w');
    const require = createRequire(import.meta.url);
    const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
    const child = spawn(process.execPath, [viteBin, '--port', String(OWN_PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', log, log] });
    for (let i = 0; i < 120; i++) {
        if (child.exitCode !== null) throw new Error(`vite exited with code ${child.exitCode}; see debug/scratch/deep-zoom-parity-vite.log`);
        if (await reachable(origin)) return { origin, child };
        await sleep(500);
    }
    child.kill();
    throw new Error('vite did not answer within 60 s; see debug/scratch/deep-zoom-parity-vite.log');
}

/** The URL path of the historical page, after proving the served file is the pinned one. */
function historicalPath(): string {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const pinned = pinnedFile('index.html');
    const synced = path.join(ROOT, 'public', 'deep-zoom-prototype-core', 'index.html');
    if (fs.existsSync(synced)) {
        const lines = norm(fs.readFileSync(synced, 'utf8')).split('\n');
        const marks = lines.filter((l) => l.includes('SYNCED COPY')).length;
        const rest = lines.filter((l) => !l.includes('SYNCED COPY')).join('\n');
        if (marks === 1 && rest === norm(pinned.toString('utf8'))) {
            check(true, `historical page: public/deep-zoom-prototype-core/index.html is ${SOURCE_COMMIT}:index.html apart from its SYNCED COPY line`);
            return '/deep-zoom-prototype-core/index.html?embed=1';
        }
    }
    const dir = path.join(SCRATCH, 'deep-zoom-pinned');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pinned);
    check(true, `historical page: the synced copy differs from ${SOURCE_COMMIT}; serving the pinned file from debug/scratch/deep-zoom-pinned/`);
    return '/debug/scratch/deep-zoom-pinned/index.html?embed=1';
}

async function openReady(ctx: BrowserContext, url: string, errors: string[], instrument: boolean): Promise<{ page: Page; readySec: number }> {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    if (instrument) await page.addInitScript(INIT_SCRIPT);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction('window.__deepReady !== undefined', undefined, { timeout: READY_MS, polling: 200 });
    const ready = await ev<boolean>(page, 'window.__deepReady === true');
    if (!ready) errors.push('deep shader did not compile: ' + (await ev<string>(page, 'String(window.__deepErr)')));
    return { page, readySec: (Date.now() - t0) / 1000 };
}

async function thumbAt(page: Page, flightLastT: number, tau: number): Promise<void> {
    await ev(page, `(() => { window.__samplePath(window.__parityFlight, ${tau * flightLastT}); window.__setMode('deep'); })()`);
    await page.waitForTimeout(1500);
}

async function shoot(ctx: BrowserContext, label: string, url: string, flightJson: string, lastT: number, tvalsIn: number[][] | null, instrument: boolean): Promise<{ result: Shoot; page: Page }> {
    const errors: string[] = [];
    const { page, readySec } = await openReady(ctx, url, errors, instrument);
    await ev(page, `(() => { window.__parityFlight = ${flightJson}; })()`);
    await ev(page, `(() => { ${PIN} })()`);
    const defaults = await evJson<Shoot['defaults']>(page, '({ s: window.__dz.settings(), t: window.__dz.telemetry(), look: window.__look.mode })');
    await ev(page, `(() => { window.__parityDefaults = ${JSON.stringify(defaults)}; })()`);

    const shots: Shot[] = [];
    const numbers: Numbers[] = [];
    for (const tau of TAUS) {
        await thumbAt(page, lastT, tau);
        for (const [name, apply] of SETTINGS) {
            await ev(page, `(() => { const D = window.__parityDefaults; ${RESTORE} ${apply} })()`);
            await page.waitForTimeout(400);
            const r = await evJson<Omit<Shot, 'tau' | 'setting'>>(page,
                `({ px: window.__renderThumb(${THUMB}), depth: window.__smoothedDist(), iters: window.__cam.iters, err: ${GL_ERR}, tel: window.__dz.telemetry(), set: window.__dz.settings() })`);
            shots.push({ tau, setting: name, ...r });
        }
        await ev(page, `(() => { const D = window.__parityDefaults; ${RESTORE} })()`);
        const ni = NUMBER_TAUS.indexOf(tau);
        if (ni >= 0) {
            await page.waitForTimeout(300);
            let tvals: number[];
            if (tvalsIn) tvals = tvalsIn[ni];
            else {
                const p0 = await evJson<Probe[]>(page, 'window.__directCheckHP([0])');
                const ps = Math.abs(p0[0].direct);
                tvals = [0, ps * 1e-3, ps * 0.1, ps * 0.5];
            }
            const pts = await evJson<Probe[]>(page, `window.__directCheckHP(${JSON.stringify(tvals)})`);
            numbers.push({ tau, tvals, pts });
        }
    }

    /* the still: accumulation on, wait for its samples, then a small tiled export */
    await ev(page, 'window.__setAccum(true)');
    let reached = false, accumN = 0, accumMax = 0;
    for (let i = 0; i < 360 && !reached; i++) {
        await page.waitForTimeout(250);
        const t = await evJson<{ accumN: number; accumMax: number }>(page, 'window.__dz.telemetry()');
        accumN = t.accumN; accumMax = t.accumMax;
        reached = accumMax > 0 && accumN >= accumMax;
    }
    const errAccum = await ev<number>(page, GL_ERR);
    const exp = JSON.parse(await ev<string>(page, '(async () => JSON.stringify(await window.__exportTimed(640, 4)))()')) as Still['exp'];
    const errExport = await ev<number>(page, GL_ERR);
    await ev(page, 'window.__setAccum(false)');

    return { result: { label, defaults, shots, numbers, still: { reached, accumN, accumMax, errAccum, errExport, exp }, errors, readySec }, page };
}

/** telemetry / settings members that do not depend on timing */
const TEL_DET = ['ready', 'error', 'mode', 'depth', 'frameW', 'frameH', 'iters', 'power', 'accumMax', 'recording', 'playing', 'exporting', 'pathFrames', 'bla'];
function sameValue(a: unknown, b: unknown): boolean {
    if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= REL_MAX * Math.max(Math.abs(a), Math.abs(b));
    return JSON.stringify(a) === JSON.stringify(b);
}
function mismatches(A: Shoot, B: Shoot): string[] {
    const out: string[] = [];
    for (let i = 0; i < A.shots.length; i++) {
        const a = A.shots[i], b = B.shots[i];
        for (const k of TEL_DET) if (!sameValue(a.tel[k], b.tel[k])) out.push(`tau ${a.tau} ${a.setting}: telemetry.${k} ${JSON.stringify(a.tel[k])} vs ${JSON.stringify(b.tel[k])}`);
        for (const k of Object.keys(a.set)) if (!sameValue(a.set[k], b.set[k])) out.push(`tau ${a.tau} ${a.setting}: settings.${k} ${JSON.stringify(a.set[k])} vs ${JSON.stringify(b.set[k])}`);
    }
    return out;
}
function worstRel(a: Numbers, b: Numbers): { rel: number; flags: boolean } {
    let rel = 0, flags = true;
    for (let i = 0; i < a.pts.length; i++) {
        const x = a.pts[i], y = b.pts[i];
        if (x.escG !== y.escG) flags = false;
        /* a NaN arrives as null through JSON: null === null counts as equal, null against a number does not */
        const d = x.gpu === y.gpu ? 0 : Math.abs(x.gpu - y.gpu) / Math.max(Math.abs(x.gpu), Math.abs(y.gpu), 1e-300);
        rel = Math.max(rel, Number.isFinite(d) ? d : Infinity);
    }
    return { rel, flags };
}

async function loopRatio(page: Page, counter: string, ms: number): Promise<{ ratio: number; frames: number; ticks: number }> {
    const a = await evJson<{ f: number; t: number }>(page, `({ f: ${counter}, t: window.__harness.ticks() })`);
    await page.waitForTimeout(ms);
    const b = await evJson<{ f: number; t: number }>(page, `({ f: ${counter}, t: window.__harness.ticks() })`);
    return { ratio: (b.f - a.f) / Math.max(1, b.t - a.t), frames: b.f - a.f, ticks: b.t - a.t };
}

async function main(): Promise<void> {
    const flightText = pinnedFile('sample-flight.json').toString('utf8');
    const flight = JSON.parse(flightText) as { frames: Array<{ t: number }> };
    const lastT = flight.frames[flight.frames.length - 1].t;
    const flightJson = JSON.stringify(flight);

    const server = await startServer();
    let browser: Browser | null = null;
    try {
        const histUrl = server.origin + historicalPath();
        const harnessUrl = server.origin + '/deep-zoom-harness.html';
        console.log(`-> historical ${histUrl}`);
        console.log(`-> harness    ${harnessUrl}`);

        browser = await chromium.launch({
            channel: 'chrome',
            // DZ_HEADLESS=1: no window, so nothing typed elsewhere lands in the page (2026-10-08: two lines
            // went red when the person at the machine typed into the test window). Same Chrome, same GPU flags.
            headless: process.env.DZ_HEADLESS === '1',
            args: [
                '--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu',
                '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
            ],
        });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

        /* three passes over the same views: historical, historical again (the floor), the port */
        const h1 = await shoot(ctx, 'historical', histUrl, flightJson, lastT, null, false);
        await h1.page.close();
        const tvals = h1.result.numbers.map((n) => n.tvals);
        const h2 = await shoot(ctx, 'historical (second run)', histUrl, flightJson, lastT, tvals, false);
        await h2.page.close();
        const p = await shoot(ctx, 'harness', harnessUrl, flightJson, lastT, tvals, true);
        const H = h1.result, H2 = h2.result, P = p.result;
        info(`deep shader ready: historical ${H.readySec.toFixed(1)} s, again ${H2.readySec.toFixed(1)} s, harness ${P.readySec.toFixed(1)} s`);

        /* (a) pictures */
        let lit = 0;
        for (let i = 0; i < H.shots.length; i++) {
            const a = H.shots[i], b = P.shots[i], c = H2.shots[i];
            const d = compare(a.px, b.px), floor = compare(a.px, c.px);
            if (d.level > 5) lit++;
            check(within(d) && a.err === 0 && b.err === 0,
                `picture tau ${a.tau.toFixed(2)} depth ${a.depth.toExponential(1)} ${a.setting.padEnd(17)} harness = historical: mean ${fx(d.mean)} of 255, ${fx(d.over, 2)} % over 2 levels (worst ${d.worst})`
                + `  | floor, historical twice: mean ${fx(floor.mean)}, ${fx(floor.over, 2)} %` + (a.err || b.err ? `  GL error ${a.err}/${b.err}` : ''));
        }
        check(lit >= H.shots.length / 2, `pictures are not blank (${lit} of ${H.shots.length} have a mean level above 5)`);

        /* (b) numbers */
        for (let i = 0; i < H.numbers.length; i++) {
            const a = H.numbers[i], b = P.numbers[i], c = H2.numbers[i];
            const w = worstRel(a, b), floor = worstRel(a, c);
            check(w.rel <= REL_MAX && w.flags,
                `numbers tau ${a.tau.toFixed(2)} __directCheckHP GPU values equal: ${a.pts.length} probes, worst relative difference ${w.rel.toExponential(1)}, escape flags ${w.flags ? 'equal' : 'DIFFER'}`
                + `  | floor ${floor.rel.toExponential(1)}  (gpu ${a.pts.map((q) => q.gpu.toExponential(6)).join(', ')})`);
        }
        const keys = (o: Record<string, unknown>) => Object.keys(o).sort().join(',');
        check(keys(H.defaults.t) === keys(P.defaults.t), `__dz.telemetry() has the same ${Object.keys(H.defaults.t).length} keys`);
        check(keys(H.defaults.s) === keys(P.defaults.s), `__dz.settings() has the same ${Object.keys(H.defaults.s).length} keys`);
        check(JSON.stringify(H.defaults.s) === JSON.stringify(P.defaults.s) && H.defaults.look === P.defaults.look,
            `boot settings are equal (${JSON.stringify(P.defaults.s)})`);
        const mm = mismatches(H, P), mmFloor = mismatches(H, H2);
        check(mm.length === 0, `deterministic telemetry / settings values equal at all ${H.shots.length} views (${TEL_DET.length} telemetry + ${Object.keys(H.defaults.s).length} settings members)`
            + (mm.length ? `: ${mm.length} differ, first: ${mm.slice(0, 3).join(' ; ')}` : '') + `  | floor: ${mmFloor.length} differ` + (mmFloor.length ? ` (${mmFloor[0]})` : ''));

        /* (c) the still */
        for (const S of [H, P]) {
            check(S.still.reached && S.still.errAccum === 0,
                `still ${S.label}: accumulation reached ${S.still.accumN} of ${S.still.accumMax} samples, WebGL error ${S.still.errAccum}`);
        }
        const eh = H.still.exp, ep = P.still.exp, eh2 = H2.still.exp;
        check(!eh.error && !ep.error && eh.W === ep.W && eh.H === ep.H && H.still.errExport === 0 && P.still.errExport === 0,
            `still __exportTimed(640, 4): same size (${eh.W}x${eh.H} vs ${ep.W}x${ep.H}), WebGL error ${H.still.errExport}/${P.still.errExport}` + (eh.error || ep.error ? `  error: ${eh.error || ep.error}` : ''));
        check(Math.abs((eh.meanLevel ?? NaN) - (ep.meanLevel ?? NaN)) <= 1.0,
            `still __exportTimed(640, 4): mean level within 1.0 (historical ${fx(eh.meanLevel ?? NaN)}, harness ${fx(ep.meanLevel ?? NaN)}`
            + `  | floor: historical again ${fx(eh2.meanLevel ?? NaN)})`);

        /* (d) lifecycle, own loop (autoStart): one frame request per display tick, before and after a re-create */
        const page = p.page;
        await ev(page, "window.__setMode('auto')");
        const one = await loopRatio(page, 'window.__parity.frameReqs', 1200);
        check(one.ratio > 0.9 && one.ratio < 1.05, `lifecycle autoStart: one frame per display tick (${one.frames} frames in ${one.ticks} ticks)`);
        await ev(page, 'window.__harness.recreate()');
        const goneDz = await ev<boolean>(page, 'window.__deepReady === undefined');
        await page.waitForFunction('window.__deepReady === true', undefined, { timeout: READY_MS, polling: 200 });
        const prev0 = await ev<number>(page, 'window.__harness.previousFrameCount()');
        const two = await loopRatio(page, 'window.__parity.frameReqs', 1200);
        const prev1 = await ev<number>(page, 'window.__harness.previousFrameCount()');
        check(two.ratio > 0.9 && two.ratio < 1.05 && prev1 === prev0 && goneDz,
            `lifecycle autoStart: create, dispose, create leaves exactly one loop (${two.frames} frames in ${two.ticks} ticks; the disposed instance stayed at frame ${prev1})`);
        check(P.errors.length === 0 && H.errors.length === 0 && H2.errors.length === 0,
            `no page errors (historical ${H.errors.length + H2.errors.length}, harness ${P.errors.length})` + [...H.errors, ...H2.errors, ...P.errors].slice(0, 2).map((e) => '  ' + e).join(''));
        await page.close();

        /* (d) lifecycle, host-driven (?manual=1) */
        const merr: string[] = [];
        const m = await openReady(ctx, harnessUrl + '?manual=1', merr, true);
        const mp = m.page;
        const live = await evJson<{ l: number; s: number }>(mp, "({ l: window.__parity.listeners, s: document.querySelectorAll('[data-deep-zoom-scaffold]').length })");
        const driven = await loopRatio(mp, 'window.__harness.frameCount()', 800);
        check(driven.frames > 5 && driven.ratio > 0.9 && driven.ratio < 1.05, `lifecycle manual: frames advance while step() is called (${driven.frames} frames in ${driven.ticks} ticks)`);
        await ev(mp, 'window.__harness.pause()');
        await mp.waitForTimeout(150);
        const paused = await loopRatio(mp, 'window.__harness.frameCount()', 800);
        check(paused.frames === 0 && paused.ticks > 5, `lifecycle manual: frames stop when step() is not called (${paused.frames} frames in ${paused.ticks} ticks)`);
        await ev(mp, 'window.__harness.resume()');
        const resumed = await loopRatio(mp, 'window.__harness.frameCount()', 600);
        check(resumed.frames > 5, `lifecycle manual: frames resume with step() (${resumed.frames} frames in ${resumed.ticks} ticks)`);
        await ev(mp, 'window.__harness.dispose()');
        const dead = await evJson<{ l: number; s: number; dz: boolean; ready: boolean }>(mp,
            "({ l: window.__parity.listeners, s: document.querySelectorAll('[data-deep-zoom-scaffold]').length, dz: window.__dz === undefined, ready: window.__deepReady === undefined })");
        check(live.l - dead.l === 8 && live.s === 1 && dead.s === 0 && dead.dz && dead.ready,
            `lifecycle manual: dispose removes its 8 window / document / canvas listeners (${live.l} -> ${dead.l}), the scaffold (${live.s} -> ${dead.s}) and the window handles`);
        /* an instance disposed in the task that created it: its deep-shader callback must not publish later */
        await ev(mp, '(() => { window.__harness.create(); window.__harness.dispose(); })()');
        await mp.waitForTimeout(3000);
        const late = await evJson<string[]>(mp, "Object.keys(window).filter((k) => k.startsWith('__') && ['__deepReady', '__deepErr', '__dz', '__look'].includes(k))");
        check(late.length === 0, `lifecycle manual: a disposed instance publishes nothing late (window handles 3 s after create + dispose: ${late.length ? late.join(' ') : 'none'})`);
        await ev(mp, 'window.__harness.create()');
        await mp.waitForFunction('window.__deepReady === true', undefined, { timeout: READY_MS, polling: 200 });
        const again =await evJson<{ l: number; s: number }>(mp, "({ l: window.__parity.listeners, s: document.querySelectorAll('[data-deep-zoom-scaffold]').length })");
        const q0 = await ev<number>(mp, 'window.__harness.previousFrameCount()');
        const re = await loopRatio(mp, 'window.__harness.frameCount()', 1200);
        const q1 = await ev<number>(mp, 'window.__harness.previousFrameCount()');
        const selfScheduled = await ev<number>(mp, 'window.__parity.frameReqs');
        check(re.ratio > 0.9 && re.ratio < 1.05 && q1 === q0 && again.l === live.l && again.s === 1,
            `lifecycle manual: create, dispose, create leaves exactly one loop (${re.frames} frames in ${re.ticks} ticks; disposed instance stayed at frame ${q1}; listeners ${again.l}, scaffolds ${again.s})`);
        check(selfScheduled === 0, `lifecycle manual: the module never scheduled its own frame (${selfScheduled} requestAnimationFrame(frame) calls)`);
        /* the re-created instance, on the same canvas, still draws the historical picture */
        await ev(mp, `(() => { window.__parityFlight = ${flightJson}; ${PIN} })()`);
        await thumbAt(mp, lastT, 0.5);
        await mp.waitForTimeout(400);
        const rePx = await evJson<{ px: number[] | null; err: number }>(mp, `({ px: window.__renderThumb(${THUMB}), err: ${GL_ERR} })`);
        const ref = H.shots.find((s) => s.tau === 0.5 && s.setting === 'defaults');
        const rd = compare(ref ? ref.px : null, rePx.px);
        check(within(rd) && rePx.err === 0, `lifecycle manual: the re-created instance draws the historical picture (tau 0.50 defaults: mean ${fx(rd.mean)}, ${fx(rd.over, 2)} % over 2 levels, WebGL error ${rePx.err})`);
        check(merr.length === 0, `lifecycle manual: no page errors (${merr.length})` + merr.slice(0, 2).map((e) => '  ' + e).join(''));
        await mp.close();

        /* (d) lifecycle, loseContextOnDispose (?lose=1): the remount path a shell uses — dispose drops the
           GL context, the next create gets a fresh canvas */
        const lerr: string[] = [];
        const lo = await openReady(ctx, harnessUrl + '?lose=1', lerr, true);
        const lp = lo.page;
        await ev(lp, "(() => { window.__parityOldGl = document.getElementById('gl').getContext('webgl2'); window.__harness.dispose(); })()");
        await lp.waitForTimeout(300);
        const oldLost = await ev<boolean>(lp, 'window.__parityOldGl.isContextLost()');
        await ev(lp, 'window.__harness.create()');
        await lp.waitForFunction('window.__deepReady === true', undefined, { timeout: READY_MS, polling: 200 });
        const fresh = await evJson<{ same: boolean; lost: boolean; canvases: number; s: number }>(lp,
            "(() => { const g = document.getElementById('gl').getContext('webgl2'); return { same: g === window.__parityOldGl, lost: g.isContextLost(), canvases: document.querySelectorAll('canvas').length, s: document.querySelectorAll('[data-deep-zoom-scaffold]').length }; })()");
        check(oldLost && !fresh.same && !fresh.lost && fresh.canvases === 1 && fresh.s === 1,
            `lifecycle lose-context: dispose loses the old context (${oldLost}), the next create runs on a fresh canvas and context (lost ${fresh.lost}, canvases ${fresh.canvases}, scaffolds ${fresh.s})`);
        await ev(lp, `(() => { window.__parityFlight = ${flightJson}; ${PIN} })()`);
        await thumbAt(lp, lastT, 0.5);
        await lp.waitForTimeout(400);
        const loPx = await evJson<{ px: number[] | null; err: number }>(lp, `({ px: window.__renderThumb(${THUMB}), err: ${GL_ERR} })`);
        const ld = compare(ref ? ref.px : null, loPx.px);
        check(within(ld) && loPx.err === 0, `lifecycle lose-context: the instance on the fresh canvas draws the historical picture (tau 0.50 defaults: mean ${fx(ld.mean)}, ${fx(ld.over, 2)} % over 2 levels, WebGL error ${loPx.err})`);
        check(lerr.length === 0, `lifecycle lose-context: no page errors (${lerr.length})` + lerr.slice(0, 2).map((e) => '  ' + e).join(''));
        await lp.close();
    } finally {
        if (browser) await browser.close().catch(() => undefined);
        if (server.child) server.child.kill();
    }

    console.log(failures.length ? `\nFAILED: ${failures.length} check(s)` : '\nPASS: the port matches the historical page');
    process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error('FAILED: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
