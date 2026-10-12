/**
 * debug/deep-zoom-march-study.mts - what share of a deep-zoom view's rays land on the wrong surface
 * under the ray march, and what it costs. The measuring tool for the march.
 *
 *   npm run bench:deep-zoom-march                                  kept places + sample flight, Detail 32, the ray march as the shell has it
 *   npm run bench:deep-zoom-march -- --views places --detail saved --ray 5:1:64:0.05:256:2,7:1
 *
 * SINCE 2026-10-11 THE BULB HAS ONE PROGRAM, THE RAY MARCH'S (grep "deep program variants" in core.js), and this
 * tool follows it. Its REFEREE is still the careful page-style march (a step of a tenth of the page's estimate,
 * 8 hit-refine halvings, 16384 steps), now run as that program's MEASURING MODE: bit 8, no creep floor, no line
 * rule - the jet is carried, the march is the page's. The ROWS THAT SWEPT THE PAGE'S OWN MARCH ARE GONE
 * (`--steps`, `--refine`, `--reach`, `--budget`, and each kept place's "as saved" row): there is no page march
 * to sweep. What is left is one row per `--ray` setting. Recorded on the day before, with the referee in the
 * page's program: the ray march's wrong share at the three kept places 1.7 %, 1.7 % and 0.7 %.
 *
 *   --views    places | flight | all (default) | any text: views whose label contains it
 *   --detail   list of Detail values, or `saved` = each view's own            (default 32)
 *   --rays     the grid is rays x rays                                        (default 128)
 *   --display  the picture height the hit tolerance is taken for              (default 1080)
 *   --ref      the careful march: step,refine,budget                          (default 0.1,8,16384)
 *   --wrongpx  a ray is wrong when it ends more than this many DISPLAY PIXELS of depth from the careful ray
 *              (default 2). One measure at every Detail: the same distance on screen.
 *   --cones    the older measure, in pixel cones of the Detail in use (a cone = a display pixel / Detail);
 *              given, it replaces --wrongpx. The studies of 2026-10-08 used 4.
 *   --rebase   page (default) | origin: the kernel's rebase (grep REBASE TO THE ORIGIN in core.js)
 *   --ray      the settings marched (THE RAY ESTIMATE: grep it in core.js); default 5:1:64:0.05:256:2, the
 *              module's own and the shell's. A list of
 *              bits:factor[:hit[:tol[:floor]]] - bits 1 = step by it, 2 = hit test by it, 4 = orbits
 *              resumed along the ray; factor = the step as a share of the estimate; hit = the hit
 *              level is a display pixel / this (64); tol = pixels a resumed orbit may be off (0.05);
 *              floor = with the page's hit test, also a hit under a display pixel / this (0 = none).
 *              A sixth field, line = THE LINE AGAINST THE BALL's allowance as a multiple of Q (0 = off).
 *              e.g. --ray 3:1,7:1. Each gets two more columns, against the SAME rule marched at
 *              factor 0.25 with whole orbits: passed = ends more than 2 display pixels of depth
 *              behind it (or misses where it hits), early = more than 2 in front.
 *   --raybudget  the step budget of the ray settings, which the shader multiplies by 4  (default 512, the shell's)
 *   --json     where the machine-readable result goes       (default debug/scratch/march-study.json)
 *
 * HOW IT MEASURES. Everything happens inside the page, in one task per view: set the view, run one
 * frame (the reference orbit), then one `api.marchProbe` draw per setting (grep MARCH PROBE in
 * deep-zoom/renderer/core.js). A probe is the picture's own march read back raw: where each ray
 * ended, how it ended, and the work it took. Only a few numbers per setting leave the page.
 *   unsettled  rays the careful march and one twice as careful (half the step, two more halvings,
 *            twice the budget) put on different surfaces. No step size has a say there: where it
 *            was traced (the 3.5e-16 flight view) the GPU's single-precision distance estimate was
 *            itself off by up to 89 % against the BigInt referee - the fault `--rebase origin`
 *            repairs (4.1 % of that view's rays unsettled without it, 0.01 % with). Left out of
 *            wrong and rough.
 *   wrong    of the settled rays, those on ANOTHER SURFACE than the careful march's: both hit but
 *            more than --cones pixel cones apart, or one hit and the other did not. A smaller step
 *            is what cures it. `behind` (JSON, and printed for the ray settings) is the part of it
 *            that lies deeper than the careful ray, or missed what that hit: a surface stepped
 *            through. The rest stopped in front of it.
 *   rough    settled rays on the right surface that landed 0.5 to --cones pixel cones off it: the scatter
 *            of "wherever the last step fell". Shading from depth draws it as terraces; Hit refine
 *            is what cures it. (The studies of 2026-10-08 compared shaded pixels, which counts
 *            rough and wrong together: their "5 to 32 % wrong" along the flight is almost all rough.)
 *   ran out  rays that used the whole step budget (of all rays). A small step needs a larger budget.
 *   cost     kernel passes per ray (`work`): counted by the shader, so the same on a busy GPU.
 *            `ms` is one draw + read on the wall clock, for orientation only; it is not in the JSON.
 * The JSON holds no time and no date: two runs of the same sweep must diff empty.
 * Every run also draws each view once through the picture's own path, with the first `--ray` setting, and
 * compares its G-buffer with the probe's rays; any difference is exit 1 (the probe is a separate shader
 * variant: PTR, where the picture is PR). Until 2026-10-11 that comparison marched a page setting.
 *
 * NEEDS the worktree's dev server (preview `dz-worktree-dev`; ENGINE_URL, default
 * http://localhost:3410) and Chrome on the real GPU. No window unless DZ_HEADLESS=0. The Chrome
 * profile is kept in debug/scratch/.march-chrome so the deep shader and its counter variant come
 * from the shader cache: about 8 s of compiling on the first run ever (17 to 20 s before 2026-10-12; and after any edit of the
 * deep shader), under a second afterwards.
 * The sample flight is read from the frozen page's repo (DZ_SOURCE_REPO); without it, places only.
 *
 * ONE MEASURE (2026-10-09). Wrong is counted in display pixels of depth, the same distance on screen at
 * every Detail, and the default sweep runs at Detail 32. The ray march
 * follows --detail as the page's march did (for some hours that day it had a fixed level of its own; the
 * owner found 32 too rough in many places and Detail applies again). Numbers from before that day were
 * taken at Detail 1 or 8 in cones, of the page's march: that sweep cannot be run any more.
 *
 * PITFALLS
 *   - `--display` is not the grid: 128 rays at --display 1080 march a 1080-row picture's tolerance
 *     on a sparse grid (128 x 128 rays read within 0.2 points of 360 x 360). The first studies of
 *     2026-10-08 were 360 px thumbnails: `--display 360` is their tolerance, three times blunter
 *     than the picture on screen.
 *   - A pixel cone shrinks with Detail, so the same `wrong` at Detail 8 is an eighth of the distance.
 *   - The in-page function is sent as text. It must not use anything from this file's scope.
 *   - AUTO ITERATIONS ARE OFF for the whole run: every view is marched with its own count. With them on, and a
 *     ray bit set, the module raises the count between two marches (grep ITERATIONS AS A MARGIN).
 *   - A result file from before 2026-10-11 has rows this one does not write: the page's step sweep, and
 *     `saved` on a kept place's own row.
 *   - A `--jac` argument (rows with the true-gradient estimate's bits) went on 2026-10-11 with the
 *     renderer's J variant; a result file from before then has a `jac` key this one does not write.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACES } from '../deep-zoom/data/places';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = (process.env.ENGINE_URL || 'http://localhost:3410') + '/deep-zoom-harness.html?manual=1';
const SOURCE_REPO = process.env.DZ_SOURCE_REPO || 'H:/GMT/workspace-gmt/mandelbulb_deepzoom';
const FLIGHT_TAUS = [0.10, 0.14, 0.18, 0.23, 0.28, 0.33, 0.40, 0.47, 0.55, 0.63, 0.72, 0.81, 0.90, 1.0];

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string): string => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback; };
const nums = (text: string): number[] => text.split(',').map(Number);
const RAYS = Number(arg('rays', '128')), DISPLAY = Number(arg('display', '1080')), CONES_ARG = arg('cones', ''), WRONG_PX = Number(arg('wrongpx', '2'));
const [refStep, refRefine, refBudget] = nums(arg('ref', '0.1,8,16384'));
const WHICH = arg('views', 'all'), DETAIL = arg('detail', '32'), ORIGIN = arg('rebase', 'page') === 'origin';
const JSON_OUT = path.resolve(ROOT, arg('json', 'debug/scratch/march-study.json'));
const RAY = arg('ray', '5:1:64:0.05:256:2'), RAY_BUDGET = Number(arg('raybudget', '512'));
for (const gone of ['steps', 'refine', 'reach', 'budget']) if (argv.includes('--' + gone)) { console.error(`--${gone} swept the page's own march, which went on 2026-10-11 (see the header)`); process.exit(1); }

/** `ray`: the bits of a row. `measure`: the referee - the ray program's measuring mode (bit 8), stepping by `step` of the page's estimate. */
interface Setting { step: number; refine: number; reach: number; budget?: number; farRelax?: number; measure?: boolean; ray?: number; hitDiv?: number; tol?: number; floor?: number; line?: number }
interface Target { label: string; view?: unknown; tau?: number; detail: number }

const grid: Setting[] = [];
for (const item of RAY.split(',')) { const [bits, factor, hit, tol, floor, line] = item.split(':').map(Number);
    if (!(bits > 0 && bits < 8)) { console.error(`--ray ${item}: the bits of a row are 1 to 7 (8 is the referee's measuring mode)`); process.exit(1); }
    grid.push({ step: factor || 1, refine: 0, reach: 2, budget: RAY_BUDGET, ray: bits, hitDiv: hit || 64, tol: tol === undefined || Number.isNaN(tol) ? 0.05 : tol, floor: floor || 0, line: line || 0 }); }

let flight: { frames: Array<{ t: number }> } | null = null;
if (WHICH !== 'places') {
    try { flight = JSON.parse(execFileSync('git', ['-C', SOURCE_REPO, 'show', '3b65946:sample-flight.json'], { encoding: 'utf8', maxBuffer: 1 << 26 })); }
    catch { console.log(`(no sample flight: ${SOURCE_REPO} at 3b65946 is not readable - kept places only)`); }
}
const targets: Target[] = [];
const details = (own: number): number[] => DETAIL === 'saved' ? [own] : nums(DETAIL);
for (const place of PLACES) {
    for (const detail of details(place.state.view.surf)) targets.push({ label: place.name, view: place.state.view, detail });
}
if (flight) { const end = flight.frames[flight.frames.length - 1].t; for (const tau of FLIGHT_TAUS) for (const detail of details(1)) targets.push({ label: 'flight ' + tau.toFixed(2), tau: tau * end, detail }); }
const chosen = targets.filter((t) => WHICH === 'all' || (WHICH === 'places' ? !!t.view : WHICH === 'flight' ? t.tau !== undefined : t.label.toLowerCase().includes(WHICH.toLowerCase())));
if (!chosen.length) { console.error(`no view matches --views ${WHICH}`); process.exit(1); }

/* Runs IN THE PAGE (sent as text): one view, every setting, compared against the careful march. */
function study(a: any): any {
    const w = window as any, dz = w.__dz, t0 = performance.now();
    if (a.tau !== undefined) { w.__samplePath(w.__flight, a.tau); dz.setView(dz.getView()); } else dz.setView(a.view);
    w.__setSurf(a.detail); w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    w.__harness.instance().step(performance.now());             // one frame: the reference orbit, and the surface distance snapped
    const tel = dz.telemetry(), N = a.rays * a.rays, pixAng = Math.tan(0.55) / a.display / a.detail;
    const run = (s: any) => {
        w.__setReach(s.reach);
        if (s.budget) w.__setMarch({ maxSteps: s.budget });
        if (s.farRelax !== undefined) w.__setMarch({ farRelax: s.farRelax });
        w.__setStepRelax(s.measure ? s.step : 0); w.__setHitRefine(s.refine);
        /* the referee: bit 8, the ray program's measuring mode - the jet carried, the march the page's (its step
           is the step size just set), no creep floor and no line rule. A row: its own bits and options. */
        if (s.measure) w.__setRayMarch(8, { factor: 1, hit: 64, tol: 0.05, floor: 0, line: 0 }, true);
        else w.__setRayMarch(s.ray, { factor: s.step, hit: s.hitDiv, tol: s.tol, floor: s.floor || 0, line: s.line || 0 }, true);
        const t = performance.now(), px = w.__marchProbe(a.rays, s.own ? a.rays : a.display);
        return { px, ms: performance.now() - t, budget: w.__march.maxSteps };
    };
    const pct = (count: number, of: number) => Math.round(1e4 * count / Math.max(of, 1)) / 100;
    const kindOf = (px: Float32Array, i: number) => Math.floor(px[i * 4 + 1] / 65536);
    const cost = (r: any) => {
        let steps = 0, work = 0, top = 0, out = 0, hit = 0, far = 0;
        for (let i = 0; i < N; i++) {
            const kind = kindOf(r.px, i), st = r.px[i * 4 + 1] - kind * 65536;
            steps += st; work += r.px[i * 4 + 3];
            if (st > top) top = st; if (kind === 3) out++; if (kind === 1 || kind === 2) hit++; if (kind === 2) far++;
        }
        return { hit: pct(hit, N), far: pct(far, N), ranOut: pct(out, N), steps: Math.round(10 * steps / N) / 10, stepsMax: top, work: Math.round(work / N), ms: r.ms };
    };
    /* ray i of march r against the same ray of march q: 0 same place, 1 rough, 2 another surface */
    const apart = (r: any, q: any, i: number) => {
        const kr = kindOf(r.px, i), kq = kindOf(q.px, i), hr = kr === 1 || kr === 2, hq = kq === 1 || kq === 2;
        if (hr !== hq) return 2;
        if (!hr) return 0;
        const e = Math.abs((Math.pow(2, r.px[i * 4] - q.px[i * 4]) - 1) / pixAng);
        return e > a.cones ? 2 : e > 0.5 ? 1 : 0;
    };
    /* of two rays on different surfaces: +1 when r lies BEHIND q (deeper, or r missed what q hit), -1 in front */
    const side = (r: any, q: any, i: number) => {
        const kr = kindOf(r.px, i), kq = kindOf(q.px, i), hr = kr === 1 || kr === 2, hq = kq === 1 || kq === 2;
        return hr !== hq ? (hq ? 1 : -1) : r.px[i * 4] > q.px[i * 4] ? 1 : -1;
    };
    const careful = { step: a.ref[0], refine: a.ref[1], reach: 2, budget: a.ref[2], measure: true };
    const ref = run(careful), ref2 = run({ step: a.ref[0] / 2, refine: a.ref[1] + 2, reach: 2, budget: a.ref[2] * 2, measure: true });
    const settled = new Uint8Array(N); let nSettled = 0;
    for (let i = 0; i < N; i++) if (apart(ref, ref2, i) < 2) { settled[i] = 1; nSettled++; }
    /* the ray settings' own truth: the ray rule at a quarter of the estimate, whole orbits, per hit level */
    const rayRef: any = {};
    const settings = a.settings.map((s: any) => {
        const r = run(s); let wrong = 0, rough = 0, behind = 0;
        for (let i = 0; i < N; i++) if (settled[i]) { const d = apart(r, ref, i); if (d === 2) { wrong++; if (side(r, ref, i) > 0) behind++; } else if (d === 1) rough++; }
        const row: any = { ...s, budget: r.budget, wrong: pct(wrong, nSettled), behind: pct(behind, nSettled), rough: pct(rough, nSettled), ...cost(r) };
        if (s.ray) {
            const key = ((s.ray & 2) ? 'r' + s.hitDiv : 's' + (s.floor || 0));
            const q = rayRef[key] || (rayRef[key] = run({ step: 0.25, refine: 0, reach: 2, budget: s.budget * 4, ray: (s.ray & 2) ? 3 : 1, hitDiv: s.hitDiv, tol: 0, floor: s.floor || 0 }));
            let passed = 0, early = 0; const px1 = Math.tan(0.55) / a.display;
            for (let i = 0; i < N; i++) { const kr = kindOf(r.px, i), kq = kindOf(q.px, i), hr = kr === 1 || kr === 2, hq = kq === 1 || kq === 2;
                if (hq && !hr) passed++; else if (hr && hq) { const e = (Math.pow(2, r.px[i * 4] - q.px[i * 4]) - 1) / px1; if (e > 2) passed++; else if (e < -2) early++; } }
            row.passed = pct(passed, N); row.early = pct(early, N);
        }
        return row;
    });
    /* is the probe's march the picture's? The same rays through the picture's own draw (its G-buffer), with the
       first row's setting: the ray march as the picture marches it */
    const own = run({ ...a.settings[0], own: true }).px, picture = w.__readGbuf(a.rays);
    let unlike = 0;
    for (let i = 0; i < N; i++) if (own[i * 4] !== picture[i * 4] || kindOf(own, i) !== Math.floor(picture[i * 4 + 2] / 256) % 4) unlike++;
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0); w.__setRayMarch(5, { factor: 1, hit: 64, tol: 0.05, floor: 256, line: 2 });   // the module's own start values
    return { unlike, depth: tel.depth, power: tel.power, iters: tel.iters, mode: tel.mode,
        ref: { ...careful, ...cost(ref), unsettled: pct(N - nSettled, N) }, settings, ms: performance.now() - t0 };
}

const started = performance.now();
const context = await chromium.launchPersistentContext(path.join(ROOT, 'debug', 'scratch', '.march-chrome'), {
    channel: 'chrome', headless: process.env.DZ_HEADLESS !== '0', viewport: { width: 640, height: 400 },
    args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'],
});
const page = context.pages()[0] || await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(URL);
// A fresh Chrome starts compiling before its shader cache is loaded and misses it; a reload a moment later hits it.
const ready = (ms: number) => page.waitForFunction('window.__deepReady === true', null, { timeout: ms });
await ready(1500).catch(async () => { await page.reload(); await ready(180_000); });
const gpu = await page.evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2'), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })()`) as string;
if (/swiftshader|llvmpipe/i.test(gpu)) { console.error('software renderer, not the real GPU: ' + gpu); await context.close(); process.exit(1); }
await page.evaluate(`(() => { window.__harness.pause(); window.__lockInput(true); window.__setMode('deep'); window.__setAccum(false); window.__setGate(false); window.__setAutoIters(false); window.__setFrame(64); window.__setRebaseOrigin(${ORIGIN}); })()`);
if (flight && chosen.some((t) => t.tau !== undefined)) await page.evaluate(`window.__flight = ${JSON.stringify(flight)}`);
const startupMs = performance.now() - started;

const MEASURE = CONES_ARG ? `${CONES_ARG} pixel cones` : `${WRONG_PX} display pixels of depth`;
console.log(`${chosen.length} views x ${grid.length} settings   ${RAYS} x ${RAYS} rays as a ${DISPLAY}-row picture   wrong = more than ${MEASURE} from the careful march, rough = from half a cone up to that (step ${refStep}, refine ${refRefine}, ${refBudget} steps)`);
console.log(gpu + (ORIGIN ? '   kernel: rebase to the origin' : ''));
const pad = (v: unknown, n: number) => String(v).padStart(n);
const rows: unknown[] = [];
let pageMs = 0, unlike = 0;
const sweepStart = performance.now();
for (const t of chosen) {
    const settings = grid;
    const r = await page.evaluate(`(() => { const __name = (f) => f; return (${study.toString()})(${JSON.stringify({ view: t.view, tau: t.tau, detail: t.detail, rays: RAYS, display: DISPLAY, cones: CONES_ARG ? Number(CONES_ARG) : WRONG_PX * t.detail, ref: [refStep, refRefine, refBudget], settings })}); })()`) as any;
    pageMs += r.ms; unlike += r.unlike;
    console.log(`\n${t.label}   depth ${r.depth.toExponential(1)}   power ${r.power}   iters ${r.iters}   detail ${t.detail}` + (r.mode === 'deep' ? '' : '   NOT DEEP'));
    console.log(`  careful march (the measuring mode): ${r.ref.hit} % hit (${r.ref.far} % far ground), ${r.ref.ranOut} % ran out, ${r.ref.steps} steps a ray (most ${r.ref.stepsMax}), work ${r.ref.work}, ${r.ref.ms.toFixed(0)} ms.  UNSETTLED ${r.ref.unsettled} %`);
    console.log('   step refine reach  wrong %  rough %  ran out %   steps   work   x cost    ms      (x cost: against the first row)');
    const base = r.settings[0].work;
    for (const s of r.settings) {
        console.log(pad(s.step, 7) + pad(s.refine, 7) + pad(s.reach, 6) + pad(s.wrong.toFixed(2), 9) + pad(s.rough.toFixed(2), 9) + pad(s.ranOut.toFixed(2), 11) + pad(s.steps, 8) + pad(s.work, 7) + pad((s.work / base).toFixed(2), 9) + pad(s.ms.toFixed(0), 6)
            + (s.ray ? `   <- ray ${s.ray}, hit 1/${s.hitDiv} px, tol ${s.tol}, floor ${s.floor ? '1/' + s.floor + ' px' : 'none'}, line ${s.line || 'off'}: of wrong, behind ${s.behind.toFixed(2)} %; against its own careful march passed ${s.passed.toFixed(2)} %, early ${s.early.toFixed(2)} %` : ''));
        delete s.ms;
    }
    delete r.ref.ms; delete r.ms; delete r.unlike;
    rows.push({ view: t.label, detail: t.detail, ...r });
}
const sweepMs = performance.now() - sweepStart;
await context.close();
console.log('');
console.log(`probe = picture: ${unlike} of ${chosen.length * RAYS * RAYS} rays end elsewhere, or otherwise, in the picture's own G-buffer` + (unlike ? '   <- THE PROBE IS NOT MARCHING WHAT THE PICTURE MARCHES' : ''));
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify({ rays: RAYS, display: DISPLAY, ...(CONES_ARG ? { cones: Number(CONES_ARG) } : { wrongPx: WRONG_PX }), ref: [refStep, refRefine, refBudget], rebase: ORIGIN ? 'origin' : 'page', rows }, null, 1) + '\n');
console.log(`startup ${(startupMs / 1000).toFixed(1)} s   sweep ${(sweepMs / 1000).toFixed(1)} s (${(pageMs / 1000).toFixed(1)} s in the page) for ${chosen.length * (grid.length + 2)} marches   ->  ${path.relative(ROOT, JSON_OUT)}`);
if (unlike) process.exit(1);
