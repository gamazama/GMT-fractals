/**
 * debug/deep-zoom-direct-check.mts — the historical page's NON-CIRCULAR referee, pointed at the port.
 *
 * Run:   npx tsx debug/deep-zoom-direct-check.mts            (starts Vite on 3478, stops it after)
 *        PORT=3478 npx tsx debug/deep-zoom-direct-check.mts  (use a dev server already running)
 *        MANUAL=1 ...                                        (harness with ?manual=1: the host-driven loop)
 *        (the historical suite's BLA=1 went on 2026-10-11 with the skip table)
 *
 * This is `mandelbulb_deepzoom/direct-check.test.mjs` (repo pinned at 3b65946) with ONE change: the
 * page it opens. The historical suite opens file://.../index.html; this opens /deep-zoom-harness.html,
 * which builds deep-zoom/renderer/core.js with publishOnWindow so the same window.__ handles exist.
 * Depths, rays, iteration budget, probe distances, pass criterion (worst GPU-vs-BigInt < 1e-3) and
 * every printed line are copied unchanged, so the two outputs can be diffed line for line.
 *
 * What it proves: the ported renderer's GPU perturbed distance estimate agrees with a BigInt
 * fixed-point direct march that shares no math with the shader kernel, at 11 depths from 1e-5 to 1e-50.
 * It exits non-zero unless all 11 depths ran and passed.
 *
 * ADDED HERE, not in the historical suite (2026-10-08): `ORIGIN=1` runs the 11 depths with the
 * kernel's rebase to the origin on, and a last section, OFF-CENTRE RAYS, checks 13 x 13 grids of
 * rays - the historical probes are all on the centre ray, close to the camera, and never saw the
 * two faults that section is about. It gates too: 4 grids must pass (2 deep views for the kernel's
 * rebase to the origin, 2 shallow views for the far hand-off).
 *
 * ADDED 2026-10-09: THE MANDELBOX (grep THE FORMULA SEAM in deep-zoom/renderer/core.js), a last section
 * of five 13 x 13 grids. The renderer's second formula has a kernel of its own in the shader (BOX_KERNEL)
 * and a twin of it on the CPU (boxOrbitJS, itself held to an exact orbit by
 * `npm run check:deep-zoom-box-orbit`). Each grid marches its rays carefully, then asks the GPU's estimate
 * at 0.5 and 0.97 of every hit's distance and compares it with the twin AND with the fixed-point orbit of
 * the explicit point (`__directCheckHP` answers all three). Both signs of scale, from outside (deltas the
 * size of the box) and at depth, and one view whose camera stands 0.3 of its depth (3e-51) from the fold
 * plane x = L, so that half its rays cross that plane at the first iteration: the case in which the
 * reference's distance to a fold surface has to reach the shader as mantissa and exponent.
 * It gates too: all five must pass. Its falsification record is at the foot of this header.
 *
 * Real GPU only: headed Chrome through ANGLE/d3d11 (SwiftShader cannot compile this shader in time).
 *
 * MOVED ONTO THE RAY MARCH'S PROGRAM, 2026-10-11. Until that day the harness page drew the bulb with the page's
 * own program and every number here was read in it. That program is gone: the bulb has ONE program, the ray
 * march's (grep "deep program variants" in core.js), and this proof runs in it. WHAT IT REFEREES DID NOT CHANGE:
 * the same points, the same tolerances, the same lines. The probes behind `__directCheckHP` and `__dive` always
 * run the page's orbit, whatever the march (grep `gRay is 0 outside the march`). Two things had to be said to
 * the module, and they are the whole of the change:
 *   - `__setRayMarch(0)` at the start, held for the whole run. With any ray bit set the module raises the
 *     iteration count by the ray march's own rule (grep ITERATIONS AS A MARGIN), between frames; the counts this
 *     script sets, and the views' own, would not be the counts the probes then run, and the points would not
 *     be the same points. Bits 0 leaves the page's iteration rules in force, as they were.
 *   - the careful march that FINDS the hits of the grids (`__setReach(2)`, 16384 steps, a step of a tenth of
 *     the estimate, 8 hit-refine halvings: `__readGbuf`) runs as the ray program's MEASURING MODE, bit 8 with no
 *     creep floor and no line rule - the jet is carried, the march is the page's - and bits 0 are put back
 *     after it, inside the same evaluate, so that no frame runs with a ray bit set.
 * The Mandelbox's grids are untouched: its program is its own.
 * SEEN RED ON THE RAY PROGRAM, 2026-10-11: see the foot of this header.
 *
 * THE MANDELBOX SECTION SEEN RED, 2026-10-09 (one break in deep-zoom/renderer/core.js per run, restored after):
 *   - GLSL `boxFoldD`, the reference between the planes and the pixel past +L: `pr == 1 ? -gh` -> `? d`
 *       -> exit 1, the three deep grids FAIL ("scale -1.5, deep ... GPU vs twin: 120 over 1e-3, worst 1.2e+1",
 *       "scale 2, deep ... 170 over 1e-3", "... from the fold plane x = L ... 191 over 1e-3"); the two views from
 *       outside stay PASS (their hits are far away: few of those deltas cross a plane that way).
 *   - `buildBoxOrbit`: the fold distances uploaded as plain floats (`put(2 + a, k, [Math.fround(O.GH[a][k]), 0,
 *       Math.fround(O.GL[a][k]), 0])`) -> exit 1, and ONLY the fold-plane view FAILS ("101 over 1e-3, worst
 *       2.0e+2"): a distance of 3e-51 is 0 in an f32. Every other view passes, which is the point of that view.
 *   - GLSL sphere fold, reference and pixel both in the inversion shell: `-F2 * Q / (r2 * r2p)` -> `0.0`
 *       -> exit 1, both plain deep grids FAIL ("scale -1.5, deep ... escape flags differ 338", "scale 2, deep ...
 *       338 over 1e-3, worst 2.7e+8").
 *   The bulb's 11 depths and 4 grids stayed green through all three.
 *
 * THE BULB'S LINES SEEN RED ON THE RAY PROGRAM, 2026-10-11 (one break, restored byte for byte, sha-256):
 *   - GLSL, the kernel's estimate: `hdrFromFloat(0.5 * rF * log(rF))` -> `0.4 * ...` (the `vec2 de =` line of
 *       KERNEL_CORE) -> exit 1: 0/11 depths, every one "worst GPUvsHP=2.0e-1 FAIL" (the dive certifies no ray
 *       either); both gated off-centre grids FAIL ("169 over 1e-3  169 over 1e-2  worst 2.0e-1"). The two gated
 *       far hand-off lines stay PASS (they read the referee's estimate at the hit, not the GPU's), and so do the
 *       Mandelbox's five (its kernel is its own).
 *   Green on the same tree before and after: 11/11, 4/4, 5/5, every printed number equal, to the last digit, to
 *   the run of the day before in the page's own program (79 lines, one differs: the line that names the path).
 *
 * THE KLEINIAN CARD'S NUMBERS (added 2026-10-12; deep-zoom/data/boxStarters.ts). GMT's "Kleinian" is the Mandelbox
 * with no inner radius: scale 1.8, fixed radius sqrt(1.2), min radius at the renderer's floor, so the sphere fold's
 * inner factor is 1.2e9 where the box's own lines have 4. Two more Mandelbox lines, the last two of that list:
 *   deep (9.3e-31, a place box-orbit.mts finds), GATED: 0 of 338 points over 1e-3, worst 2.3e-4.
 *   the whole box from outside, PRINTED AND NOT GATED: 16 of 338 points more than 1e-3 off the twin, the worst
 *   3.2e-3, from 22 units out; 43 of 154 (worst 3.6e-3) from the card's own 45 units (one measurement,
 *   2026-10-12). None is over 1e-2 and the picture shows nothing of it, but it is over the grids' bar of a
 *   fiftieth, and the standard box's whole view reads 0 over 1e-3 (worst 3.7e-4) in the same run. The farther
 *   the camera, the more points: single-precision rounding of a far reference, carried through a fold that
 *   can multiply by 1.2e9. Not looked into further; the CPU twin is exact at these numbers
 *   (check:deep-zoom-box-orbit, three lines).
 *
 * JULIA MODE (added 2026-10-12; deep-zoom/renderer/core.js, grep JULIA MODE). In Julia mode c is one constant K
 * and the point looked at starts the orbit: on the GPU a factor of 0 on the vector both kernels add each
 * iteration (`C *= uAddC`) and on the jet's "+ v". The "julia, ..." lines hold both kernels to it: the same
 * grid as the Mandelbox's - 13 x 13 rays, the careful march's hits, two points a ray - and at each point the
 * GPU's estimate against the CPU twin (`pertOrbitJS` / `boxOrbitJS` on a reference built in Julia mode) and
 * against `hpDirectDE` / `boxDirectHP`, a fixed-point orbit of the explicit point that adds K. The bar is the
 * Mandelbox grids' own. Each line also checks that a view read in Julia mode carries the constant string for
 * string. THE REBASE TO THE ORIGIN IS ASKED FOR in these lines, as the shell asks for it: in Julia mode the
 * renderer must hold it off itself (grep `juliaOn ? 0 : rebaseOrigin`). Every deep view and its constant is
 * printed by `JULIA_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/julia-orbit.mts`.
 *   THE BOX, six GATED lines: at scale 2 (K inside the set) and at scale -1.5 (K = the "Arches" card's camera, a
 *   deep place of the box) the whole Julia set from outside, 1e-10 and 1e-30. First run: 0 points over 1e-3 on
 *   every line, the worst 1.5e-4.
 *   THE BULB, one GATED line: a constant INSIDE the bulb at 1e-10 (0 of 338 over 1e-3, worst 8.2e-5).
 *   THE BULB, four lines PRINTED AND NOT GATED, because they do not meet that bar (first run, 2026-10-12):
 *       the constant inside the bulb at 1e-30                 113 of 338 points over 1e-3, the worst 5.9e-3
 *       a constant ON the bulb's surface (the "Grain of sand" starter's camera point) at 1e-3
 *                                                              25 of 338, the worst 1.8e-2
 *       the same at 1e-10                                      12 of 338, the worst 4.8e-3
 *       the same at 1e-30                                     131 of 338, the worst 1e22 (noise)
 *   It is the grain of the PLAIN REBASE, the only valid one in Julia mode: the same kernel in Mandelbrot
 *   mode with the plain rebase reads 23 and 37 of 169 rays over 1e-3 at the two flight views ("the page's
 *   kernel ... (not gated)", above) and 0 with the rebase to the origin. The Julia form of that repair is a
 *   second reference, the orbit of K itself; it is not built. (The CPU study's 24-bit emulation had put its
 *   gain at a fifth; on the GPU the rebase to the origin takes the Mandelbrot lines from 14 and 22 % to 0.)
 *   There is NO whole-object line for the bulb: from outside its set every hit is the f32 far field's and
 *   the kernel is not what draws there (a first try read garbage against the twin at 5.6 units: the first
 *   step of a delta from a camera that far is all cancellation, in either mode).
 * What these lines do not hold: the ray march's own step in Julia mode (a grid's hits come from the careful
 * march, as everywhere in this file), the f32 baseline and the far field (`cOf` in the shaders), any picture.
 * The Mandelbrot-mode lines above are untouched: 74 printed lines, the same to the character as before.
 * SEEN RED, 2026-10-12 (one break, restored byte for byte, sha-256): the factor left at 1 in Julia mode
 * (`gl.uniform1f(x.addC, juliaOn ? 0 : 1)` -> `gl.uniform1f(x.addC, 1)` in setPowerUniforms: the GPU adds the
 * pixel's c after all, the CPU does not) -> exit 1, all seven gated Julia lines FAIL (the box's deep lines with
 * every escape flag different or every point off, "338 over 1e-3, worst 9.9e-1"; the bulb's "338 over 1e-3,
 * worst 8.1e-1"), and the 74 Mandelbrot-mode lines print as they did.
 *
 * ADDED 2026-10-12: FAR VIEWS (grep A VIEW FROM FAR in deep-zoom/renderer/core.js), a last section of five lines.
 * Every line above stands at or by the surface. The specks the owner saw are a view from OUTSIDE the bulb, where
 * the camera's reference orbit is no use to a point by the bulb and the march read the kernel's rubbish as hits
 * (the note above, "NO whole-object line for the bulb", is that fault seen from the kernel's side). These lines do
 * not referee the kernel: they referee the PICTURE'S MARCH, which from there must not ask it. Each is a 24 x 24
 * picture marched AS THE SHELL SETS IT (ray bits 5 for the one read, bits 0 again before a frame runs; hand-off
 * 0.5; the hit level of a 1080-row picture) against a referee that shares nothing with either kernel: the point's
 * own orbit in f64, marched ray by ray on the CPU, a fifth of its estimate a step, the crossing halved ten times.
 * Gated, all five: no stray hit (a hit on a ray that the referee keeps more than 2 pixels clear of the bulb: one
 * that passes nearer is the silhouette's, and is counted beside it), holes in at most 2 % of the rays the referee
 * hits, at most 5 % of them more than 2 pixels of depth off.
 *   power 8 from 3.2, 5.2 and 7.2 off the centre   the far field alone (the gate), from the ball
 *   power 2 from 6.2                               the reference is still good: the deep march, started at the ball
 *   power 8, Julia mode, from 4.2                  the gate on the Julia reference
 * The 88 lines above are untouched: the same to the character as before.
 * First run, all five PASS: stray hits 0 on every line (one hit at power 2 lies on a ray that passes within 2
 * pixels of the bulb), holes 0, and 4, 0, 0, 3 and 1 hits more than 2 pixels of depth off.
 * SEEN RED, 2026-10-12, two breaks in deep-zoom/renderer/core.js, one a run, each restored byte for byte (sha-256);
 * the 88 earlier lines printed as they did in both:
 *   - `const REF_FAR = 512` -> `1e30` (the gate never taken: the deep march is asked at the ball's surface)
 *       -> exit 1, three FAIL: "power 8, 3.2 from the centre ... stray hits 1 ... off 7", "power 8, 7.2 ... stray
 *       hits 12 ... off 7", "Julia mode ... stray hits 116 ... off 180". The 5.2 line and the power-2 line stayed
 *       PASS (power 2's reference is good there; at 5.2 the kernel happened to give no bad point on the ball).
 *   - `holdBall` made to answer 0 (`? rho : 0` -> `? 0 : 0`: no start at the ball)
 *       -> exit 1, two FAIL: "power 8, 7.2 from the centre ... more than 2 pixels of depth off 23" (the far
 *       field's own first stride lands in the solid from there) and "power 2, 6.2 from the centre ... holes 44
 *       ... off 95" (the deep march's first stride). The other three stayed PASS.
 * NOT seen red: the Julia line by the second break, the 3.2 and 5.2 lines by it, and the count of silhouette
 * rays beside "stray hits".
 *
 * ADDED 2026-10-12: BURNING (grep BURNING in deep-zoom/renderer/core.js), a last section of twelve lines. GMT's
 * Burning Mode on the bulb - a fold of every negative coordinate at the top of each iteration, by a factor of
 * 1 - 2 mix (mix 1: the plain abs) - is a VARIANT of the ray program (USE_BURN): the fold as a delta by cases in
 * the kernel's pass, with the reference's signed coordinates as mantissa and exponent (two more rows of the orbit
 * texture), and in the direct pass after a rebase to the origin. The "burning, ..." lines hold that kernel to it
 * as the Julia lines hold theirs: the same grid - 13 x 13 rays, the careful march's hits, two points a ray - and
 * at each point the GPU's estimate against the CPU twin (`pertOrbitJS` on a reference built with Burning on,
 * itself held to an exact orbit by `npm run check:deep-zoom-burning-orbit`) and against `hpDirectDE`, a
 * fixed-point orbit of the explicit point with the fold in it. The bar is the Mandelbox grids' own. Each line
 * also checks that the module reads its Burning back as it was told. The rebase to the origin is asked for, as
 * the shell asks for it. Every view is printed by `BURN_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/burning-orbit.mts`.
 *   GATED, ten lines (first run: 0 points over 1e-3 on every one, the worst 8.4e-4):
 *       mix 1      power 8 at 7.8e-11 and 9.6e-61, power 2 at 9.8e-31
 *       mix 0.5    power 8 at 9.6e-4 and 1.0e-10 (the deepest place the finder has for that mix)
 *       mix 0.25   power 8 at 2.3e-31
 *       the camera 1e-40 from the plane x = 0, so that half the rays stand across a fold plane from it at the
 *                  first iteration: power 8 at mix 1 (2.2e-11) and at mix 0.5 (3.8e-4). The case the
 *                  reference's signed coordinate has to reach the shader as mantissa and exponent for.
 *       Julia mode with Burning, mix 1, a constant inside the bulb, at 8.9e-11 and 8.9e-31
 *   PRINTED AND NOT GATED, two lines, because they do not meet that bar (first run, 2026-10-12):
 *       power 8, mix 1, at 1.5e-31    63 of 338 points over 1e-3, the worst 1.4
 *       power 2, mix 1, at 1.8e-11     7 of 338, the worst 1.6e-2
 *   ONE MEASUREMENT WAS MADE OF THEM AND NO MORE (debug/scratch/burning/nudge.mts, git-ignored): at every point
 *   of the grid the f64 twin was run again with its input moved by what an f32 holds of it (the ray turned
 *   1.2e-7 rad, t longer by 1.2e-7 of itself). At the 1.5e-31 place the 63 points the GPU has wrong are the ones
 *   that nudge moves most - their median moves 1.6e-4, the grid's 4.6e-6, and 13 of them move more than 1e-3 by
 *   that one nudge alone; at the power-2 place the 7 points' median moves 1.9e-4 against 1.3e-6. They are also the
 *   two places where the node check counts the most points f64 itself cannot settle (46 and 9 of 1,134, where
 *   the ten gated places have 0 to 7). So: orbits single precision does not settle, which the kernel rounds at
 *   every one of its iterations. NOT shown: that the fold adds nothing of its own there. The control - the same
 *   grid on the PLAIN bulb at six places found the same way, 9.6e-4 to 6.0e-61 - has no point over 1e-3.
 * What these lines do not hold: the ray march's own step with Burning on and its jet's sides on the GPU (a
 * grid's hits come from the careful march, as everywhere in this file), the f32 baseline and the far field.
 * The 100 lines above are untouched: the same to the character as before.
 * SEEN RED, 2026-10-12 (one break in deep-zoom/renderer/core.js, restored byte for byte, sha-256): the shader's
 * opposite-side case cut (`burnFoldD`: `return side == fr ? side * d : side * p - fr * zs;` -> `return side * d;`:
 * a pixel across a fold plane from the reference is folded as if it stood beside it)
 *   -> exit 1, eight of the ten gated lines FAIL: mix 1 at all three depths ("140 over 1e-3, worst 2.5e+3",
 *   "169 over 1e-3", "escape flags differ 205"), mix 0.5 at 9.6e-4 ("305 over 1e-3"), both views beside the plane
 *   ("304 over 1e-3, worst 1.0e+4" and "escape flags differ 5 ... 5 over 1e-3") and both Julia lines ("escape
 *   flags differ 166" and "292"). Two stayed PASS with every digit as it was - mix 0.5 at 1.0e-10 and mix 0.25
 *   at 2.3e-31: at those places no pixel of the grid stands across a plane. The 100 earlier lines printed as
 *   they did.
 * NOT seen red: the reference's signed coordinates uploaded as plain floats (the view beside the plane is there
 * for it, as the Mandelbox's fold-plane view is; that break was not spent), the direct pass after a rebase with
 * the fold left out, and the read-back of Burning beside each line.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'debug', 'scratch');
const OWN_PORT = 3478;

const DEPTHS = [1e-5, 1e-6, 1e-8, 1e-9, 1e-11, 1e-12, 1e-15, 1e-20, 1e-30, 1e-40, 1e-50];

async function reachable(origin: string): Promise<boolean> {
    try { const r = await fetch(origin + '/deep-zoom-harness.html'); return r.ok; } catch { return false; }
}

async function server(): Promise<{ origin: string; stop: () => void }> {
    if (process.env.PORT) {
        const origin = `http://localhost:${process.env.PORT}`;
        if (!(await reachable(origin))) throw new Error(`no dev server answers at ${origin} (PORT was given)`);
        return { origin, stop: () => {} };
    }
    const origin = `http://localhost:${OWN_PORT}`;
    if (await reachable(origin)) throw new Error(`port ${OWN_PORT} is already serving; stop that server or pass PORT=${OWN_PORT}`);
    fs.mkdirSync(SCRATCH, { recursive: true });
    const log = fs.openSync(path.join(SCRATCH, 'deep-zoom-direct-check-vite.log'), 'w');
    const require = createRequire(import.meta.url);
    const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
    const child: ChildProcess = spawn(process.execPath, [viteBin, '--port', String(OWN_PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', log, log] });
    for (let i = 0; i < 120; i++) {
        if (child.exitCode !== null) throw new Error(`vite exited with code ${child.exitCode}; see debug/scratch/deep-zoom-direct-check-vite.log`);
        if (await reachable(origin)) return { origin, stop: () => { child.kill(); } };
        await new Promise((r) => setTimeout(r, 500));
    }
    child.kill();
    throw new Error('vite did not answer within 60 s; see debug/scratch/deep-zoom-direct-check-vite.log');
}

const srv = await server();
const PAGE = srv.origin + '/deep-zoom-harness.html' + (process.env.MANUAL === '1' ? '?manual=1' : '');
console.log('page:', PAGE);

/** Two views of the frozen page's sample flight (3b65946:sample-flight.json, at 0.28 and 0.81 of
 *  its length), as plain data so this check needs no other repo. The first is where the page's
 *  kernel was found 2 to 89 % wrong in the bottom tenth of the picture; the second had it mildly
 *  (a fifth of its rays more than 1e-3 off). */
const GRID_VIEWS: Array<[string, unknown]> = [
    ['flight view A', { cam: ['-19106688270107589239900731000824630997268179563911966325659783872820568426676', '2056390632353064852223937457677118491523808047665681090998789597348598489238', '106035815535807823749833402101018299423493735995136270043159830313984249367966'],
        yaw: -1.2423396513222302, pitch: -0.20912409747792154, iters: 54, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
    ['flight view B', { cam: ['-19106688270107543539847685334123376502389289999276832103627022535307503912317', '2056390632353040684939008940473484011303878643906907968396164569726249960005', '106035815535807683251647607458977423429431001610281789023943266795617768965116'],
        yaw: -1.0246361075243915, pitch: -0.5258098005280843, iters: 77, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
];
/** Two shallower views of the same flight (at 0.050 and 0.055 of its length): the camera is 1.2e-3 and
 *  4.2e-4 from the surface, so all or some of the picture lies past t = 1e-3, where the page hands a
 *  ray to its f32 far-field march. */
const SHALLOW_VIEWS: Array<[string, unknown]> = [
    ['shallow view C', { cam: ['-19046732671432570394081773715976993863903469215868497208446644796296350924885', '2076379810595939072153399088115487453004718385024755700255671128216884750421', '106281771504106054999210185471751680430396782842107932182700956172180423070672'],
        yaw: -1.8394566450409213, pitch: -0.12603781373864897, iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
    ['shallow view D', { cam: ['-19082505205565731662293154145790470885708412737629538703027974520364685036758', '2066148842953800398734239597330608173677951087521164826145490763161441423825', '106130557879253810564053022231711737571045729746810109130847397159932640350757'],
        yaw: -1.858332816430437, pitch: -0.13825757920665438, iters: 38, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }],
];
const GRIDS = GRID_VIEWS.length + SHALLOW_VIEWS.length;

/** THE MANDELBOX's views. `at`: a camera given as numbers and looking at the origin (the whole box; auto
 *  iterations pick the count). `view`: a deep camera, 256-bit strings, with the count it is drawn at.
 *  Sources: the scale -1.5 deep view is the CPU study's third still (debug/scratch/formula-study/box-still.mjs
 *  dive -1.5, 1e-58); the scale 2 deep view is the shell's "Block city" card (deep-zoom/data/boxStarters.ts);
 *  the fold-plane view is printed by `BOX_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/box-orbit.mts`. */
interface BoxGridView { name: string; scale: number; minR?: number; fixedR?: number; minRays: number; gated?: boolean; at?: [number, number, number]; view?: { cam: [string, string, string]; yaw: number; pitch: number; iters: number } }
const BOX_VIEWS: BoxGridView[] = [
    { name: 'scale 2, the whole box from outside', scale: 2, minRays: 100, at: [21.4, 13.9, 16.3] },
    { name: 'scale -1.5, the whole box from outside', scale: -1.5, minRays: 60, at: [9.2, 6.0, 7.0] },
    { name: 'scale -1.5, deep', scale: -1.5, minRays: 100, view: { cam: ['231340084820589872264388682860465312343363597714993760880392389129696058445824', '-115505690266144237118182651262838104948196147110281983144364981469154730405568', '-224938163884098067862185448294517667743563675066854994226828080189985687099904'], yaw: 2.8862143657279002, pitch: 0.0013931332160032532, iters: 294 } },
    { name: 'scale 2, deep', scale: 2, minRays: 100, view: { cam: ['667951163547858345227662796364357847661243279945297544068252618814681339920384', '-517624135418796263310132574026070401466220011117613386313111658529175032037376', '-616403708235521093231712781108458524603977757626083392057256071077627630190592'], yaw: 2.652738625702473, pitch: 0.9092279035626659, iters: 175 } },
    { name: 'scale 2, 0.3 of its depth from the fold plane x = L', scale: 2, minRays: 100, view: { cam: ['115792089237316195423570985008687907853269984665640911415725295956502046048256', '684268342233395210033453236002781633172082314627674986642572796134748896362496', '551713594688047412232560182166680140904148522016028729629067015228366381907968'], yaw: -1.5707963267948966, pitch: -0.8462983716754363, iters: 209 } },
    // THE KLEINIAN CARD's numbers (deep-zoom/data/boxStarters.ts, 2026-10-12): the box with no inner radius - GMT's "Kleinian".
    // The last two of the list, so the five lines above print as they always did. Places: BOX_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/box-orbit.mts.
    { name: 'the Kleinian card\'s numbers (scale 1.8, min radius 3.1623e-5, fixed radius 1.0954), the whole box from outside', scale: 1.8, minR: 3.1623e-5, fixedR: 1.0954451150103321, minRays: 100, gated: false, at: [14.7, 9.6, 13.6] },
    { name: 'the Kleinian card\'s numbers, deep', scale: 1.8, minR: 3.1623e-5, fixedR: 1.0954451150103321, minRays: 100, view: { cam: ['788072726516279883012006933276407507453137152198061818225240135795927383277568', '604674356441839265869099570002805128393873172986988055031863833518089550430208', '471345509366772405144724121080975964553536705466804893088322570618897510170624'], yaw: -2.5535900500422257, pitch: -0.5688274275078773, iters: 166 } },
];
/** JULIA MODE's views (grep JULIA MODE in deep-zoom/renderer/core.js): a formula, a constant K (three 256-bit
 *  strings) and either `whole` - the camera is put outside the ball `__dz.wholeObject()` finds, looking at its
 *  centre, auto iterations picking the count - or a deep `view` with its count. Every deep view and its constant
 *  is printed by `JULIA_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/julia-orbit.mts`, found there by a
 *  fixed-point referee alone. The constants: one inside each formula's set, and two deep places of the app's own
 *  data taken AS constants (the Mandelbox card "Arches", 1.2e-20 from the box; the starter "Grain of sand",
 *  1.1e-17 from the bulb). */
interface JuliaGridView { name: string; kind: 'mandelbox' | 'mandelbulb'; scale?: number; power?: number; minRays: number; gated?: boolean; c: [string, string, string]; whole?: boolean; view?: { cam: [string, string, string]; yaw: number; pitch: number; iters: number } }
const JULIA_VIEWS: JuliaGridView[] = [
    { name: 'box scale 2, K = (0.1, 0.2, 0.1), the whole set from outside', kind: 'mandelbox', scale: 2, minRays: 60, c: ['11579208923731620185132316204464901002111835403029097412826955913908447084544', '23158417847463240370264632408929802004223670806058194825653911827816894169088', '11579208923731620185132316204464901002111835403029097412826955913908447084544'], whole: true },
    { name: 'box scale 2, K = (0.1, 0.2, 0.1), deep', kind: 'mandelbox', scale: 2, minRays: 100, c: ['11579208923731620185132316204464901002111835403029097412826955913908447084544', '23158417847463240370264632408929802004223670806058194825653911827816894169088', '11579208923731620185132316204464901002111835403029097412826955913908447084544'], view: { cam: ['467028093280172783619957061215632266807316310232808403554726197505655163584512', '277436568428139190977687696843458275562717692782740999039263723961906685280256', '186811237312069126507272219434897816097105649153757750113045149525207681073152'], yaw: -2.761086276477428, pitch: -0.5146462982364081, iters: 75 } },
    { name: 'box scale 2, K = (0.1, 0.2, 0.1), deeper', kind: 'mandelbox', scale: 2, minRays: 100, c: ['11579208923731620185132316204464901002111835403029097412826955913908447084544', '23158417847463240370264632408929802004223670806058194825653911827816894169088', '11579208923731620185132316204464901002111835403029097412826955913908447084544'], view: { cam: ['467028093257175321755994712103122701636739863386073215487624304594006579347456', '277436568414132934380721301884502643433079116220822334635452229605641273999360', '186811237302870141761687282035751700175622277750705199674451852088111353823232'], yaw: -2.761086276477428, pitch: -0.5146462982364081, iters: 141 } },
    { name: 'box scale -1.5, K = the "Arches" card\'s camera, the whole set from outside', kind: 'mandelbox', scale: -1.5, minRays: 30, c: ['105133227900455499701300868468310676970769101121820030482997042997629227630592', '224205250848645760082472614631644373655887713607800908119944522723394800582656', '231582939326469722564091680479486627488378211150615742408566556672015225323520'], whole: true },
    { name: 'box scale -1.5, K = the "Arches" card\'s camera, deep', kind: 'mandelbox', scale: -1.5, minRays: 100, c: ['105133227900455499701300868468310676970769101121820030482997042997629227630592', '224205250848645760082472614631644373655887713607800908119944522723394800582656', '231582939326469722564091680479486627488378211150615742408566556672015225323520'], view: { cam: ['416059908618045569116845885703603977433272668760460648529942860549365283422208', '244317976923260027858574011539986447874429838578404726230039019730075910144000', '166423963447218126284446201615733137834104028537938514140540841798839346135040'], yaw: -2.761086276477428, pitch: -0.5110772271837977, iters: 80 } },
    { name: 'box scale -1.5, K = the "Arches" card\'s camera, deeper', kind: 'mandelbox', scale: -1.5, minRays: 100, c: ['105133227900455499701300868468310676970769101121820030482997042997629227630592', '224205250848645760082472614631644373655887713607800908119944522723394800582656', '231582939326469722564091680479486627488378211150615742408566556672015225323520'], view: { cam: ['416059908574415760838204871050103769041559140873614878607882786590685319397376', '244317976896908849178871229195543843215189999428438012946828777330997339357184', '166423963429766202972989791196533419741906059537039269175867911958605655441408'], yaw: -2.761086276477428, pitch: -0.5110772271837977, iters: 120 } },
    { name: 'bulb power 8, K = (0.25, 0.1, 0.05) inside the bulb, deep', kind: 'mandelbulb', power: 8, minRays: 60, c: ['28948022309329048855892746252171976963317496166410141009864396001978282409984', '11579208923731620185132316204464901002111835403029097412826955913908447084544', '5789604461865810092566158102232450501055917701514548706413477956954223542272'], view: { cam: ['93769811716764352987926902245866735853152071410209762860715199978661480497152', '52854566921576359436630791228694317582481567623519787716344383728339919044608', '37507924686705742725300860363379165082292873426758411251601463493877506768896'], yaw: -2.761086276477428, pitch: -0.536326162184031, iters: 23 } },
    { name: 'bulb power 8, K = (0.25, 0.1, 0.05) inside the bulb, deeper', kind: 'mandelbulb', power: 8, minRays: 60, gated: false, c: ['28948022309329048855892746252171976963317496166410141009864396001978282409984', '11579208923731620185132316204464901002111835403029097412826955913908447084544', '5789604461865810092566158102232450501055917701514548706413477956954223542272'], view: { cam: ['93769811696824970039053191523226710163539833028447744510177005116344376492032', '52854566908810395707030234817996626729023831842167359732828098086682440499200', '37507924678729989545751375089629521494369642692148802951356552112186266222592'], yaw: -2.761086276477428, pitch: -0.536326162184031, iters: 47 } },
    { name: 'bulb power 8, K = the "Grain of sand" starter as a camera point, from just outside', kind: 'mandelbulb', power: 8, minRays: 60, gated: false, c: ['-19106688270107545123610310944093228319268234083931764161217485625786859879978', '2056390632353041980388441420253193046898375110266709396020905008395931668174', '106035815535807686550824900054021630250672589610944549407697460964969796977517'], view: { cam: ['24993834202170599708882831589874292610352664032906371070899623762682743619584', '-113464322632846250297569921178950955972777021330078525082493988117265661296640', '40209313192364663045422933169569012270039840783146637393933960148239043788800'], yaw: -2.039865313527242, pitch: 1.2022142226399175, iters: 15 } },
    { name: 'bulb power 8, K = the "Grain of sand" starter as a camera point, deep', kind: 'mandelbulb', power: 8, minRays: 60, gated: false, c: ['-19106688270107545123610310944093228319268234083931764161217485625786859879978', '2056390632353041980388441420253193046898375110266709396020905008395931668174', '106035815535807686550824900054021630250672589610944549407697460964969796977517'], view: { cam: ['24956568696536676362202681661888324705713272581499641389271257262746767458304', '-113250887681945508489524916561555419291406694173423766919163219708080910499840', '40135781507349156550886944262605599021547258228535078774164609086100302987264'], yaw: -2.039865313527242, pitch: 1.2022142226399175, iters: 29 } },
    { name: 'bulb power 8, K = the "Grain of sand" starter as a camera point, deeper', kind: 'mandelbulb', power: 8, minRays: 60, gated: false, c: ['-19106688270107545123610310944093228319268234083931764161217485625786859879978', '2056390632353041980388441420253193046898375110266709396020905008395931668174', '106035815535807686550824900054021630250672589610944549407697460964969796977517'], view: { cam: ['24956568693025588442137350424273187340582356448787877458924250448999537967104', '-113250887661836056998676183822999357604023610669783086123757699411600513957888', '40135781500421135406180615138098238129634792476371660982013466743056334061568'], yaw: -2.039865313527242, pitch: 1.2022142226399175, iters: 102 } },
];
/** FAR VIEWS: the camera `r` from the centre along `dir`, looking at the centre; `c` = a Julia constant (Julia mode). */
interface FarView { name: string; power: number; r: number; dir: [number, number, number]; c?: [number, number, number]; minHits: number }
const FAR_DIR: [number, number, number] = [0.31, -0.25, 0.92];
const FAR_VIEWS: FarView[] = [
    { name: 'power 8, 3.2 from the centre', power: 8, r: 3.2, dir: FAR_DIR, minHits: 200 },
    { name: 'power 8, 5.2 from the centre', power: 8, r: 5.2, dir: FAR_DIR, minHits: 100 },
    { name: 'power 8, 7.2 from the centre', power: 8, r: 7.2, dir: FAR_DIR, minHits: 50 },
    { name: 'power 2, 6.2 from the centre', power: 2, r: 6.2, dir: FAR_DIR, minHits: 50 },
    { name: 'power 8, Julia mode, K = (0.25, 0.1, 0.05), 4.2 from the centre', power: 8, r: 4.2, dir: FAR_DIR, c: [0.25, 0.1, 0.05], minHits: 100 },
];
/** BURNING's views (grep BURNING in deep-zoom/renderer/core.js): the bulb with the fold at a power and a mix, in
 *  Julia mode when `c` is there, each a deep `view` with its count. Every one is printed by
 *  `BURN_PRINT_PLACES=1 npx tsx debug/deep-zoom-checks/burning-orbit.mts`, found there by a fixed-point referee alone. */
interface BurnGridView { name: string; power: number; mix: number; minRays: number; gated?: boolean; c?: [string, string, string]; view: { cam: [string, string, string]; yaw: number; pitch: number; iters: number } }
const BURN_VIEWS: BurnGridView[] = [
    { name: 'power 8, mix 1, ray 1', power: 8, mix: 1, minRays: 60, view: { cam: ['727332762902078700943890508971084350981752948517633631759489304571599126528', '-58631620484718059471604888322870828785402196326076456709757529312385017315328', '99932852464130365039759685067551044616158558997662991506234531631831558651904'], yaw: -0.9118776416064391, pitch: 0.8336178325273291, iters: 23 } },   // 7.8e-11
    { name: 'power 8, mix 1, ray 1', power: 8, mix: 1, minRays: 60, gated: false, view: { cam: ['727332768827106494421742678862283005568241954609613382050226453646114029568', '-58631620474059437837843993784005661372228199772831842556087079033423943172096', '99932852456478984903184272711006813345442190027572272191250843290351152660480'], yaw: -0.9118776416064391, pitch: 0.8336178325273291, iters: 76 } },   // 1.5e-31
    { name: 'power 8, mix 1, ray 2', power: 8, mix: 1, minRays: 60, view: { cam: ['-50476728608545932719199331690135249362119530280246180304933239572552836110572', '-37121921098966729414509411036540425369755911542196517932603855805815820148436', '61506801089987384663224334129087283804193486378372386611226754707297751784940'], yaw: -0.710807449189311, pitch: 0.4132197077542007, iters: 98 } },   // 9.6e-61
    { name: 'power 2, mix 1, ray 1', power: 2, mix: 1, minRays: 60, gated: false, view: { cam: ['49272363211176065482339681284258673926378373377875508768857419027274608410624', '-67297913977909288506000743828913090012842392064664735546552816151947477254144', '-58252088732044924787510789531338054357291717521923270689113960452545702789120'], yaw: -2.9350256758189497, pitch: 0.6046978248269632, iters: 89 } },   // 1.8e-11
    { name: 'power 2, mix 1, ray 2', power: 2, mix: 1, minRays: 60, view: { cam: ['38784878211264088095756145932031877482178119161746895212356823602330295336960', '-7720809026605841474007479989639870813090648987689557121172219700276774305792', '49381879960072649649768657405321432494702728398350554838620871343366004015104'], yaw: -3.0386627808160704, pitch: -0.2639905400045149, iters: 166 } },   // 9.8e-31
    { name: 'power 8, mix 0.5, ray 1', power: 8, mix: 0.5, minRays: 60, view: { cam: ['30312452861475016932445545969964830136533789677192577709381149223223518298112', '88416040783386520724328818170795750591543478000756767842867689358414565081088', '19522515212912735121984277293854255841341606995651738273957195542121397878784'], yaw: -2.2606702933431997, pitch: -1.1119548888595376, iters: 15 } },   // 9.6e-4
    { name: 'power 8, mix 0.5, ray 1', power: 8, mix: 0.5, minRays: 60, view: { cam: ['30153696677983550176606388076492216373067536490417965346036269804044186288128', '87911100043949495962980515185244822326559112970111520315020552721745921966080', '19330112450603269227728817285375248519319765853092279588167519220844279627776'], yaw: -2.2606702933431997, pitch: -1.1119548888595376, iters: 26 } },   // 1.0e-10
    { name: 'power 8, mix 0.25, ray 1', power: 8, mix: 0.25, minRays: 60, view: { cam: ['41063348330849448272408277377551346320230958708326862823325011775173534154752', '19237383025529786286698798533013107206928926976906445599428959518278197182464', '70825656901602699393343955737612977408666175137134611023035055538317297713152'], yaw: -2.1991282616111674, pitch: -0.5008097766921208, iters: 116 } },   // 2.3e-31
    { name: 'power 8, mix 1, 1e-40 from the plane x = 0', power: 8, mix: 1, minRays: 60, view: { cam: ['11579208923731618723624576676593139712', '7541659157635493826332269135534033432246293726295501822100483564229713985536', '89391053456294210598542344432597095275094366641074605754557481423280606806016'], yaw: -1.5707963267948966, pitch: 0.705583279501836, iters: 31 } },   // 2.2e-11
    { name: 'power 8, mix 0.5, 1e-40 from the plane x = 0', power: 8, mix: 0.5, minRays: 60, view: { cam: ['11579208923731618723624576676593139712', '92425034126609857612577223310813441291160675268653108980321002640538026901504', '59410701738624536318316361483740806696692542157315976945487011189546161274880'], yaw: -1.5707963267948966, pitch: -1.1154716105977134, iters: 17 } },   // 3.8e-4
    { name: 'power 8, mix 1, Julia mode, K = (0.25, 0.1, 0.05)', power: 8, mix: 1, c: ['28948022309329048855892746252171976963317496166410141009864396001978282409984', '11579208923731620185132316204464901002111835403029097412826955913908447084544', '5789604461865810092566158102232450501055917701514548706413477956954223542272'], minRays: 60, view: { cam: ['94229599180515835181281469026992039421767283178295391478616653449384496726016', '53148940629159321404624787034588271250359280150860773870651306211715156279296', '37691839672206335621225989868048022588324101579525002899703152517684901445632'], yaw: -2.761086276477428, pitch: -0.536326162184031, iters: 22 } },   // 8.9e-11
    { name: 'power 8, mix 1, Julia mode, K = (0.25, 0.1, 0.05)', power: 8, mix: 1, c: ['28948022309329048855892746252171976963317496166410141009864396001978282409984', '11579208923731620185132316204464901002111835403029097412826955913908447084544', '5789604461865810092566158102232450501055917701514548706413477956954223542272'], minRays: 60, view: { cam: ['94229599157004323183788846110779192509408819354251213571510310628974380711936', '53148940614106342575858515783392668694613532606052368826345057073316598120448', '37691839662801730822228939704192233671973341204315324673124281153706394648576'], yaw: -2.761086276477428, pitch: -0.536326162184031, iters: 46 } },   // 8.9e-31
];
const ORIGIN = process.env.ORIGIN === '1';

let pass = 0, ran = 0, gridPass = 0, gridRan = 0, boxPass = 0, boxRan = 0, juliaPass = 0, juliaRan = 0, farPass = 0, farRan = 0, burnPass = 0, burnRan = 0;
const pageErrors: string[] = [];
// DZ_HEADLESS=1: no window (same Chrome, same GPU flags).
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.DZ_HEADLESS === '1',
  args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__deepReady !== undefined, null, { timeout: 180000 });
  if (!(await page.evaluate(() => (window as any).__deepReady === true))) { console.log('THE RAY MARCH\'S SHADER DID NOT BUILD:\n' + (await page.evaluate(() => String((window as any).__deepErr)))); process.exit(1); }
  // ---- from here to the summary line: the historical suite, unchanged but for the two lines below ----
  // The referee (__directCheckHP, BigInt direct) shares ZERO math with the kernel.
  // Bits 0, held for the whole run: the iteration count stays the page's (see the header). The historical
  // suite's line here was `__setBla(false)`, and its BLA=1 switch; the skip table went on 2026-10-11.
  await page.evaluate(() => { const window = globalThis as any; window.__lockInput(true); window.__setRayMarch(0); });
  console.log('program: the ray march\'s (the bulb\'s only one); bits 0 between the careful marches, the measuring mode (bit 8) inside them');
  if (ORIGIN) { await page.evaluate('window.__setRebaseOrigin(true)'); console.log('rebase: to the ORIGIN (ORIGIN=1; the default is the page\'s)'); }   // not in the historical suite
  for (const depth of DEPTHS) {
    // base 32: +8 margin over escape time so boundary points don't sit at the budget
    // edge (measured at 1e-50: iters=92 flipped the escape flag, 96+ agreed)
    const iters = Math.min(120, 32 + Math.ceil(1.35 * -Math.log10(depth)));
    // placement is ray-specific (thin folds / near-critical parking) — same fallback
    // list as harness-dive.test.mjs; certification itself is the BigInt referee below
    const RAYS = [
      { pos: [0.1, 0.15, 2.6], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [0.4, 0.3, 2.5], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [-0.3, 0.2, 2.6], yaw: -Math.PI / 2, pitch: 0 },
      { pos: [2.6, 0.15, 0.1], yaw: Math.PI, pitch: 0 },
    ];
    let dv: any = null, rayUsed = -1;
    for (let ri = 0; ri < RAYS.length; ri++) {
      const c = RAYS[ri];
      await page.evaluate(({ p, yaw, pitch, it }) => { const window = globalThis as any; window.__setCamHP(p); window.__cam.yaw = yaw; window.__cam.pitch = pitch; window.__cam.iters = it; }, { p: c.pos, yaw: c.yaw, pitch: c.pitch, it: iters });
      dv = await page.evaluate((d) => (window as any).__dive(d), depth);
      if (!dv.error && dv.relDE < 1e-3) { rayUsed = ri; break; }
    }
    let placeNote = rayUsed > 0 ? `  [ray ${rayUsed}]` : '';
    if (dv.error) placeNote = `  [dive: ${dv.error} — certifying at ACHIEVED depth]`;
    else if (rayUsed < 0) placeNote = '  [no ray certified clean — using last placement]';
    // achieved depth from the BigInt referee at t=0 (non-circular by construction)
    const probe0: any[] = await page.evaluate(() => (window as any).__directCheckHP([0]));
    const deAch = Math.abs(probe0[0].direct);
    if (!(deAch > 0) || deAch > 1e-2) { console.log(`depth ${depth.toExponential(0).padStart(6)}  SKIP — camera not deep (achieved de=${deAch.toExponential(1)})${placeNote}`); continue; }
    // probes exercise δ≠0 at increasing reach AT THE RENDERING-RELEVANT SCALE: pixels at
    // depth d are ~d apart, so probe at min(deAch, depth) — when the dive parks in a
    // crevice (de at camera ≫ requested depth), deAch-scaled probes would overshoot into
    // fold-crossings that no pixel at this depth ever samples.
    const ps = Math.min(deAch, depth);
    const tProbe = [0, ps * 1e-3, ps * 0.1, ps * 0.5];
    const ptsHP: any[] = await page.evaluate((tv) => (window as any).__directCheckHP(tv), tProbe);
    ran++;
    // dive-gate semantics: escape-flag mismatch = 1; both-unescaped = garbage-vs-garbage,
    // flag agreement IS the test (skip rel); both-escaped: min(raw rel, |diff|/de(t=0)).
    const de0 = Math.max(Math.abs(ptsHP[0].direct), 1e-300);
    let worstHP = -1;
    for (const p of ptsHP) {
      if (p.escG !== p.escD) worstHP = Math.max(worstHP, 1);
      else if (p.escG) worstHP = Math.max(worstHP, Math.min(p.rel, Math.abs(p.gpu - p.direct) / de0));
    }
    if (worstHP < 0) worstHP = 1;
    let xval = '';
    if (depth >= 1e-12) {           // overlap region: cross-validate the two referees
      const ptsF64: any[] = await page.evaluate((tv) => (window as any).__directCheck(tv), tProbe);
      const xrel = Math.max(...ptsF64.map((p, i) => (p.escD && ptsHP[i].escD) ? Math.abs(p.direct - ptsHP[i].direct) / Math.max(Math.abs(ptsHP[i].direct), 1e-300) : 0));
      xval = `  refXval f64-vs-HP=${xrel.toExponential(1)}`;
    }
    const ok = worstHP < 1e-3;
    if (ok) pass++;
    console.log(`depth ${depth.toExponential(0).padStart(6)} it=${String(iters).padStart(3)} achieved=${deAch.toExponential(1)}  worst GPUvsHP=${worstHP.toExponential(1)}  ${ok ? 'PASS' : 'FAIL'}${xval}${placeNote}`);
    for (const p of ptsHP)
      console.log(`        t=${p.t.toExponential(2)}  gpu=${p.gpu.toExponential(6)}  direct=${p.direct.toExponential(6)}  pert=${p.pert.toExponential(6)}  esc G/D=${p.escG}/${p.escD}  rel=${p.rel.toExponential(1)}`);
  }
  console.log(`\n${pass}/${ran} depths: GPU perturbed de matches the INDEPENDENT BigInt direct referee.`);

  // ---- OFF-CENTRE RAYS (added 2026-10-08; not in the historical suite) ----
  // Everything above probes the centre ray, within half a surface distance of the camera. A
  // picture's rays end 4 to 20 surface distances out and in every direction. Here a 13 x 13 grid
  // of rays is marched carefully, then the centre ray is aimed along each ray that hit (the camera
  // does not move, so the reference orbit is the same) and the BigInt referee is asked at `at` x
  // that ray's hit distance. Two things are gated on it, each printed beside the page's own
  // behaviour, which is the fault and is not gated:
  //   the kernel       GPU de against the referee just in front of the hit (grep REBASE TO THE ORIGIN)
  //   the far hand-off the referee's de AT the hit against the level a hit stands on, tolerance x t
  //                    (grep FAR HAND-OFF): a hit of the f32 far-field march just past 1e-3 does not
  const grid = (view: unknown, origin: boolean, far: number, rows: number, at: number): Promise<any> => page.evaluate(`(async () => {
    const w = window, G = 13, f = Math.tan(0.55), pa = f / ${rows};
    w.__setRebaseOrigin(${origin}); w.__setFarHandOff(${far}); w.__dz.setView(${JSON.stringify(view)}); w.__setSurf(${rows} / G);   // the hit tolerance of a picture that many rows tall, on 13 rays
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))));
    w.__setReach(2); w.__setMarch({ maxSteps: 16384 }); w.__setStepRelax(0.1); w.__setHitRefine(8);
    w.__setRayMarch(8, { floor: 0, line: 0 });                                // the careful march, as the ray program's measuring mode (see the header)
    const g = w.__readGbuf(G);
    w.__setRayMarch(0);                                                       // before any frame runs
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    const v0 = w.__dz.getView(), dist = w.__dz.telemetry().depth, refE = Math.floor(Math.log2(dist));
    const cp = Math.cos(v0.pitch), sp = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cp * cy, sp, cp * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const rays = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4;
      if (kind !== 1 && kind !== 2) continue;                              // 1 = a hit of the deep march, 2 = of the f32 far-field march
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((c) => c / len);
      w.__dz.setYawPitch(Math.atan2(d[2], d[0]), Math.asin(d[1]));
      const q = w.__directCheckHP([Math.pow(2, g[i] + refE) * ${at}])[0];
      rays.push({ kind, rel: q.escG === q.escD ? q.rel : 1, level: q.escD ? q.direct / (pa * q.t) : -1 });
    }
    w.__dz.setView(v0); w.__setSurf(1); w.__setRebaseOrigin(${ORIGIN}); w.__setFarHandOff(1e-3);
    return { depth: dist, rays };
  })()`);
  for (const [name, view] of GRID_VIEWS) {
    for (const origin of [false, true]) {
      const r = await grid(view, origin, 1e-3, 360, 0.97);
      const near = r.rays.filter((q: any) => q.kind === 1), over3 = near.filter((q: any) => q.rel > 1e-3).length, over2 = near.filter((q: any) => q.rel > 1e-2).length;
      const ok = !origin || (near.length >= 100 && over2 === 0 && over3 <= 0.02 * near.length);
      if (origin) { gridRan++; if (ok) gridPass++; }
      console.log(`off-centre rays, ${name} (${r.depth.toExponential(1)}), ${origin ? 'rebase to the origin' : "the page's kernel     "}: ${near.length} rays  ${String(over3).padStart(3)} over 1e-3  ${String(over2).padStart(3)} over 1e-2  worst ${Math.max(...near.map((q: any) => q.rel)).toExponential(1)}  ${origin ? (ok ? 'PASS' : 'FAIL') : '(not gated)'}`);
    }
  }
  for (const [name, view] of SHALLOW_VIEWS) {
    for (const far of [1e-3, 0.5]) {
      const r = await grid(view, true, far, 1080, 1);
      const off = r.rays.filter((q: any) => q.level < 0.5 || q.level > 1.5).length, byFar = r.rays.filter((q: any) => q.kind === 2).length;
      const ok = far === 1e-3 || (r.rays.length >= 100 && off <= 0.02 * r.rays.length);
      if (far !== 1e-3) { gridRan++; if (ok) gridPass++; }
      console.log(`far hand-off, ${name} (${r.depth.toExponential(1)}), ${far === 1e-3 ? "at 1e-3 (the page's)" : 'at 0.5              '}: ${r.rays.length} hits, ${String(byFar).padStart(3)} by the f32 march  ${String(off).padStart(3)} more than half off their level  ${far === 1e-3 ? '(not gated)' : ok ? 'PASS' : 'FAIL'}`);
    }
  }

  // ---- THE MANDELBOX (added 2026-10-09; see the header) ----
  console.log('\nTHE MANDELBOX: the GPU kernel against its CPU twin and against a fixed-point orbit of the explicit point');
  const boxGrid = (v: BoxGridView): Promise<any> => page.evaluate(`(async () => {
    const w = window, v = ${JSON.stringify(v)}, G = 13, f = Math.tan(0.55);
    const frames = (n) => new Promise((done) => { const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done()); tick(); });
    w.__setFormula('mandelbox', { scale: v.scale, minR: v.minR === undefined ? 0.5 : v.minR, fold: 1, fixedR: v.fixedR === undefined ? 1 : v.fixedR, rot: [0, 0, 0] });
    for (let i = 0; i < 1500 && w.__formulaState() === 'building'; i++) await new Promise((r) => setTimeout(r, 40));
    if (w.__formulaState() !== 'on') return { error: 'the Mandelbox variant did not build: ' + JSON.stringify(w.__variantErr()) };
    w.__setMode('deep'); w.__setRebaseOrigin(false); w.__setFarHandOff(0.5);
    if (v.at) { const l = Math.hypot(v.at[0], v.at[1], v.at[2]); w.__setAutoIters(true); w.__setIters(4); w.__setCamHP(v.at); w.__cam.yaw = Math.atan2(-v.at[2], -v.at[0]); w.__cam.pitch = Math.asin(-v.at[1] / l); }
    else { w.__setAutoIters(false); w.__setIters(v.view.iters); w.__dz.setView({ cam: v.view.cam, yaw: v.view.yaw, pitch: v.view.pitch, iters: v.view.iters, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }); }
    w.__setSurf(360 / G);                                                   // the hit tolerance of a picture 360 rows tall, on 13 rays
    await frames(14);
    w.__setReach(2); w.__setMarch({ maxSteps: 16384 }); w.__setStepRelax(0.1); w.__setHitRefine(8);
    const g = w.__readGbuf(G);
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    const v0 = w.__dz.getView(), dist = w.__dz.telemetry().depth, iters = w.__dz.telemetry().iters, refE = Math.floor(Math.log2(dist));
    const cp = Math.cos(v0.pitch), sp = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cp * cy, sp, cp * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const pts = []; let rays = 0;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4;
      if (kind !== 1 && kind !== 2) continue;
      rays++;
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((c) => c / len);
      w.__dz.setYawPitch(Math.atan2(d[2], d[0]), Math.asin(d[1]));
      for (const q of w.__directCheckHP([0.5, 0.97].map((a) => Math.pow(2, g[i] + refE) * a))) pts.push({ gpu: q.gpu, twin: q.pert, direct: q.direct, escG: q.escG, escD: q.escD });
    }
    w.__dz.setView(v0); w.__setSurf(1);
    return { depth: dist, iters, rays, pts };
  })()`);
  for (const v of BOX_VIEWS) {
    const r = await boxGrid(v);
    boxRan++;
    if (r.error) { console.log(`mandelbox, ${v.name}: ${r.error}  FAIL`); continue; }
    const esc = r.pts.filter((q: any) => q.escG && q.escD), flags = r.pts.length - esc.length;
    const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);
    const twin = esc.map((q: any) => rel(q.gpu, q.twin)), direct = esc.map((q: any) => rel(q.gpu, q.direct));
    const over = (xs: number[], lim: number): number => xs.filter((x) => !(x <= lim)).length, worst = (xs: number[]): number => xs.reduce((m, x) => (x > m || !(x === x) ? x : m), 0);
    // the bulb's own bar for a grid: none over 1e-2, at most a fiftieth over 1e-3 - against the twin and against the direct orbit
    const held = r.rays >= v.minRays && flags === 0 && over(twin, 1e-2) === 0 && over(direct, 1e-2) === 0 && over(twin, 1e-3) <= 0.02 * esc.length && over(direct, 1e-3) <= 0.02 * esc.length;
    const ok = v.gated === false || held;                                  // a view marked `gated: false` is printed with its numbers only (the Kleinian card's whole view: see the header)
    if (ok) boxPass++;
    console.log(`mandelbox, ${v.name} (${r.depth.toExponential(1)}, ${r.iters} iterations): ${String(r.rays).padStart(3)} rays, ${r.pts.length} points  escape flags differ ${flags}`
      + `  GPU vs twin: ${String(over(twin, 1e-3)).padStart(3)} over 1e-3, worst ${worst(twin).toExponential(1)}  GPU vs direct: ${String(over(direct, 1e-3)).padStart(3)} over 1e-3, worst ${worst(direct).toExponential(1)}  ${v.gated === false ? '(not gated)' : ok ? 'PASS' : 'FAIL'}`);
  }
  await page.evaluate(`(() => { window.__setFormula('mandelbulb'); window.__setAutoIters(true); })()`);

  // ---- JULIA MODE (added 2026-10-12; see the header) ----
  console.log('\nJULIA MODE: the GPU kernels against their CPU twins and against a fixed-point orbit of the explicit point under z -> f(z) + K');
  const juliaGrid = (v: JuliaGridView): Promise<any> => page.evaluate(`(async () => {
    const w = window, v = ${JSON.stringify(v)}, G = 13, f = Math.tan(0.55);
    const frames = (n) => new Promise((done) => { const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done()); tick(); });
    if (v.kind === 'mandelbox') w.__setFormula('mandelbox', { scale: v.scale, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0], julia: true, c: v.c });
    else { w.__setFormula('mandelbulb', { julia: true, c: v.c }); w.__setPower(v.power); }
    for (let i = 0; i < 1500 && w.__formulaState() === 'building'; i++) await new Promise((r) => setTimeout(r, 40));
    if (w.__formulaState() !== 'on') return { error: 'the program did not build: ' + JSON.stringify(w.__variantErr()) };
    // the rebase to the origin is ASKED FOR, as the shell asks for it: in Julia mode the renderer must hold it off itself
    w.__setMode('deep'); w.__setRebaseOrigin(true); w.__setFarHandOff(0.5);
    if (v.whole) {
      const b = w.__dz.wholeObject();
      if (!b) return { error: 'the renderer found no solid for this constant' };
      const dir = [0.66, 0.43, 0.61], l = Math.hypot(dir[0], dir[1], dir[2]), d = 2.4 * b.radius;
      w.__setAutoIters(true); w.__setIters(4); w.__setCamHP(b.center.map((c, j) => c + dir[j] / l * d));
      w.__cam.yaw = Math.atan2(-dir[2], -dir[0]); w.__cam.pitch = Math.asin(-dir[1] / l);
    } else { w.__setAutoIters(false); w.__setIters(v.view.iters); w.__dz.setView({ cam: v.view.cam, yaw: v.view.yaw, pitch: v.view.pitch, iters: v.view.iters, power: v.power || 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 }); }
    w.__setSurf(360 / G);                                                   // the hit tolerance of a picture 360 rows tall, on 13 rays
    await frames(14);
    w.__setReach(2); w.__setMarch({ maxSteps: 16384 }); w.__setStepRelax(0.1); w.__setHitRefine(8);
    const g = w.__readGbuf(G);
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    const v0 = w.__dz.getView(), dist = w.__dz.telemetry().depth, iters = w.__dz.telemetry().iters, refE = Math.floor(Math.log2(dist));
    const cp = Math.cos(v0.pitch), sp = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cp * cy, sp, cp * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const pts = []; let rays = 0;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4;
      if (kind !== 1 && kind !== 2) continue;
      rays++;
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((c) => c / len);
      w.__dz.setYawPitch(Math.atan2(d[2], d[0]), Math.asin(d[1]));
      for (const q of w.__directCheckHP([0.5, 0.97].map((a) => Math.pow(2, g[i] + refE) * a))) pts.push({ gpu: q.gpu, twin: q.pert, direct: q.direct, escG: q.escG, escD: q.escD });
    }
    const constantBack = (v0.julia || []).join() === v.c.join();          // a view read in Julia mode carries the constant, string for string
    w.__dz.setView(v0); w.__setSurf(1);
    return { depth: dist, iters, rays, pts, constantBack };
  })()`);
  for (const v of JULIA_VIEWS) {
    const r = await juliaGrid(v);
    juliaRan++;
    if (r.error) { console.log(`julia, ${v.name}: ${r.error}  FAIL`); continue; }
    const esc = r.pts.filter((q: any) => q.escG && q.escD), flags = r.pts.length - esc.length;
    const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);
    const twin = esc.map((q: any) => rel(q.gpu, q.twin)), direct = esc.map((q: any) => rel(q.gpu, q.direct));
    const over = (xs: number[], lim: number): number => xs.filter((x) => !(x <= lim)).length, worst = (xs: number[]): number => xs.reduce((m, x) => (x > m || !(x === x) ? x : m), 0);
    // the bar of the Mandelbox's grids: none over 1e-2, at most a fiftieth over 1e-3 - against the twin and against the direct orbit
    const held = r.rays >= v.minRays && flags === 0 && over(twin, 1e-2) === 0 && over(direct, 1e-2) === 0 && over(twin, 1e-3) <= 0.02 * esc.length && over(direct, 1e-3) <= 0.02 * esc.length;
    const ok = r.constantBack && (v.gated === false || held);              // a line marked `gated: false` is printed with its numbers and held only to carrying its constant
    if (ok) juliaPass++;
    console.log(`julia, ${v.name} (${r.depth.toExponential(1)}, ${r.iters} iterations): ${String(r.rays).padStart(3)} rays, ${r.pts.length} points  escape flags differ ${flags}`
      + `  GPU vs twin: ${String(over(twin, 1e-3)).padStart(3)} over 1e-3, worst ${worst(twin).toExponential(1)}  GPU vs direct: ${String(over(direct, 1e-3)).padStart(3)} over 1e-3, worst ${worst(direct).toExponential(1)}${r.constantBack ? '' : '  THE VIEW DOES NOT CARRY THE CONSTANT'}  ${v.gated === false && r.constantBack ? '(not gated)' : ok ? 'PASS' : 'FAIL'}`);
  }
  await page.evaluate(`(() => { window.__setFormula('mandelbulb', { julia: false }); window.__setPower(8); window.__setRebaseOrigin(${ORIGIN}); window.__setAutoIters(true); })()`);

  // ---- FAR VIEWS (added 2026-10-12; see the header) ----
  console.log('\nFAR VIEWS: the picture\'s march from outside the bulb, as the shell sets it, against the direct f64 orbit marched ray by ray on the CPU');
  const farGrid = (v: FarView): Promise<any> => page.evaluate(`(async () => {
    const w = window, v = ${JSON.stringify(v)}, G = 24, f = Math.tan(0.55), pa = f / 1080, P = v.power, C = v.c || null;
    const frames = (n) => new Promise((done) => { const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done()); tick(); });
    w.__setFormula('mandelbulb', C ? { julia: true, c: C } : { julia: false }); w.__setPower(P);
    w.__setMode('deep'); w.__setRebaseOrigin(true); w.__setFarHandOff(0.5);
    const l = Math.hypot(v.dir[0], v.dir[1], v.dir[2]), cp = v.dir.map((c) => c / l * v.r);
    w.__setAutoIters(false); w.__setIters(14); w.__setCamHP(cp);
    w.__cam.yaw = Math.atan2(-v.dir[2], -v.dir[0]); w.__cam.pitch = Math.asin(-v.dir[1] / l);
    w.__setSurf(1080 / G);                                                  // the hit tolerance of a picture 1080 rows tall, on 24 rays
    await frames(14);
    w.__setReach(1); w.__setMarch({ maxSteps: 512 }); w.__setStepRelax(0); w.__setHitRefine(0);
    w.__setRayMarch(5, { factor: 1, hit: 64, tol: 0.05, floor: 256, line: 2 });   // the march as the shell sets it (grep \`let rayAsk\` in core.js)
    const g = w.__readGbuf(G);
    w.__setRayMarch(0);                                                     // before any frame runs
    const far = w.__farView ? w.__farView() : null;
    const v0 = w.__dz.getView(), IT = w.__dz.telemetry().iters, refE = Math.floor(Math.log2(Math.max(w.__smoothedDist(), 1e-300)));
    /* the referee: the point's own orbit in f64, no reference, no delta (the far field's rule: an iterate past radius 2 has escaped) */
    const DE = (x, y, z) => { let zx = x, zy = y, zz = z, dr = 1, r = 0, esc = false; const cx = C ? C[0] : x, cy = C ? C[1] : y, cz = C ? C[2] : z;
      for (let i = 0; i < IT; i++) { r = Math.hypot(zx, zy, zz); if (r > 2) { esc = true; break; }
        const rp = Math.pow(r, P - 1); dr = rp * P * dr + 1; const th = Math.acos(Math.max(-1, Math.min(1, zz / r))) * P, ph = Math.atan2(zy, zx) * P, zr = rp * r;
        zx = zr * Math.sin(th) * Math.cos(ph) + cx; zy = zr * Math.sin(ph) * Math.sin(th) + cy; zz = zr * Math.cos(th) + cz; }
      if (!esc) { r = Math.hypot(zx, zy, zz); esc = r > 2; }
      return esc ? 0.5 * Math.log(r) * r / dr : -1; };
    const cpi = Math.cos(v0.pitch), spi = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cpi * cy, spi, cpi * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const c = { rays: G * G, real: 0, hits: 0, stray: 0, graze: 0, holes: 0, off: 0, byFar: 0 };
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((q) => q / len);
      const at = (t) => DE(cp[0] + t * d[0], cp[1] + t * d[1], cp[2] + t * d[2]);
      let t = 0, tp = 0, ref = -1, clear = 1e30;                            // a fifth of the estimate a step, the hit level a pixel, the crossing halved 10 times
      for (let s = 0; s < 20000; s++) { const e = at(t); if (t > 0) clear = Math.min(clear, e / (pa * t));   // clear: how many pixels the ray stays off the bulb at its nearest
        if (e < 0 || (t > 0 && e < pa * t)) { let lo = tp, hi = t; for (let h = 0; h < 10; h++) { const m = 0.5 * (lo + hi), em = at(m); if (em < 0 || em < pa * m) hi = m; else lo = m; } ref = hi; break; }
        if (t > 12) break;
        tp = t; t += 0.2 * e; }
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4, hit = kind === 1 || kind === 2;
      if (ref > 0) c.real++; if (hit) { c.hits++; if (kind === 2) c.byFar++; }
      if (hit && !(ref > 0)) { if (clear > 2) c.stray++; else c.graze++; } else if (!hit && ref > 0) c.holes++;   // a hit on a ray the referee has within 2 pixels of the bulb is the silhouette's, not a stray
      else if (hit && Math.abs(Math.pow(2, g[i] + refE) / ref - 1) > 2 * pa) c.off++;
    }
    w.__setSurf(1); w.__setFormula('mandelbulb', { julia: false }); w.__setPower(8); w.__setFarHandOff(1e-3); w.__setRebaseOrigin(${ORIGIN}); w.__setAutoIters(true);
    return { c, far, iters: IT };
  })()`);
  for (const v of FAR_VIEWS) {
    const r = await farGrid(v), c = r.c;
    farRan++;
    // a far view is right when nothing is hit beside the bulb, next to none of it is missed, and its hits stand where the referee's do
    const ok = c.real >= v.minHits && c.stray === 0 && c.holes <= 0.02 * c.real && c.off <= 0.05 * c.real;
    if (ok) farPass++;
    console.log(`far view, ${v.name} (${r.far ? `the reference's next point ${r.far.z1.toExponential(1)}: ${r.far.farOnly ? 'the far field alone' : 'the deep march'}, ${r.far.holdR ? 'from the ball' : 'from the camera'}` : 'no far rule in this renderer'}): `
      + `${c.rays} rays, ${String(c.real).padStart(3)} on the bulb  stray hits ${String(c.stray).padStart(3)}  (and ${c.graze} on a ray that passes within 2 pixels of it)  holes ${String(c.holes).padStart(3)}  more than 2 pixels of depth off ${String(c.off).padStart(3)}  ${ok ? 'PASS' : 'FAIL'}`);
  }

  // ---- BURNING (added 2026-10-12; see the header) ----
  console.log('\nBURNING: the bulb\'s kernel with the fold (its own variant of the ray program) against its CPU twin and against a fixed-point orbit of the explicit point');
  const burnGrid = (v: BurnGridView): Promise<any> => page.evaluate(`(async () => {
    const w = window, v = ${JSON.stringify(v)}, G = 13, f = Math.tan(0.55);
    const frames = (n) => new Promise((done) => { const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done()); tick(); });
    w.__setFormula('mandelbulb', v.c ? { julia: true, c: v.c, burning: true, burnMix: v.mix } : { julia: false, burning: true, burnMix: v.mix }); w.__setPower(v.power);
    for (let i = 0; i < 1500 && w.__formulaState() === 'building'; i++) await new Promise((r) => setTimeout(r, 40));
    if (w.__formulaState() !== 'on') return { error: 'the Burning variant did not build: ' + JSON.stringify(w.__variantErr()) };
    // the rebase to the origin is asked for, as the shell asks for it (in Julia mode the renderer holds it off itself)
    w.__setMode('deep'); w.__setRebaseOrigin(true); w.__setFarHandOff(0.5);
    w.__setAutoIters(false); w.__setIters(v.view.iters); w.__dz.setView({ cam: v.view.cam, yaw: v.view.yaw, pitch: v.view.pitch, iters: v.view.iters, power: v.power, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 });
    w.__setSurf(360 / G);                                                   // the hit tolerance of a picture 360 rows tall, on 13 rays
    await frames(14);
    w.__setReach(2); w.__setMarch({ maxSteps: 16384 }); w.__setStepRelax(0.1); w.__setHitRefine(8);
    const g = w.__readGbuf(G);
    w.__setReach(1); w.__setStepRelax(0); w.__setHitRefine(0);
    const v0 = w.__dz.getView(), dist = w.__dz.telemetry().depth, iters = w.__dz.telemetry().iters, refE = Math.floor(Math.log2(dist));
    const cp = Math.cos(v0.pitch), sp = Math.sin(v0.pitch), cy = Math.cos(v0.yaw), sy = Math.sin(v0.yaw);
    const fwd = [cp * cy, sp, cp * sy], right = [Math.cos(v0.yaw + Math.PI / 2), 0, Math.sin(v0.yaw + Math.PI / 2)];
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const pts = []; let rays = 0;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = (y * G + x) * 4, kind = Math.floor(g[i + 2] / 256) % 4;
      if (kind !== 1 && kind !== 2) continue;
      rays++;
      const ux = (x + 0.5 - G / 2) / G, uy = (y + 0.5 - G / 2) / G;
      let d = [0, 1, 2].map((j) => fwd[j] + f * (ux * right[j] + uy * up[j])); const len = Math.hypot(d[0], d[1], d[2]); d = d.map((c) => c / len);
      w.__dz.setYawPitch(Math.atan2(d[2], d[0]), Math.asin(d[1]));
      for (const q of w.__directCheckHP([0.5, 0.97].map((a) => Math.pow(2, g[i] + refE) * a))) pts.push({ gpu: q.gpu, twin: q.pert, direct: q.direct, escG: q.escG, escD: q.escD });
    }
    const held = w.__formula(), carried = held.burning === true && held.burnMix === v.mix;   // the module reads back what it was told
    w.__dz.setView(v0); w.__setSurf(1);
    return { depth: dist, iters, rays, pts, carried };
  })()`);
  for (const v of BURN_VIEWS) {
    const r = await burnGrid(v);
    burnRan++;
    if (r.error) { console.log(`burning, ${v.name}: ${r.error}  FAIL`); continue; }
    const esc = r.pts.filter((q: any) => q.escG && q.escD), flags = r.pts.length - esc.length;
    const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);
    const twin = esc.map((q: any) => rel(q.gpu, q.twin)), direct = esc.map((q: any) => rel(q.gpu, q.direct));
    const over = (xs: number[], lim: number): number => xs.filter((x) => !(x <= lim)).length, worst = (xs: number[]): number => xs.reduce((m, x) => (x > m || !(x === x) ? x : m), 0);
    // the bar of the Mandelbox's grids: none over 1e-2, at most a fiftieth over 1e-3 - against the twin and against the direct orbit
    const held = r.rays >= v.minRays && flags === 0 && over(twin, 1e-2) === 0 && over(direct, 1e-2) === 0 && over(twin, 1e-3) <= 0.02 * esc.length && over(direct, 1e-3) <= 0.02 * esc.length;
    const ok = r.carried && (v.gated === false || held);                   // a line marked `gated: false` is printed with its numbers only
    if (ok) burnPass++;
    console.log(`burning, ${v.name} (${r.depth.toExponential(1)}, ${r.iters} iterations): ${String(r.rays).padStart(3)} rays, ${r.pts.length} points  escape flags differ ${flags}`
      + `  GPU vs twin: ${String(over(twin, 1e-3)).padStart(3)} over 1e-3, worst ${worst(twin).toExponential(1)}  GPU vs direct: ${String(over(direct, 1e-3)).padStart(3)} over 1e-3, worst ${worst(direct).toExponential(1)}${r.carried ? '' : '  THE MODULE DOES NOT READ BACK ITS BURNING'}  ${v.gated === false && r.carried ? '(not gated)' : ok ? 'PASS' : 'FAIL'}`);
  }
  await page.evaluate(`(() => { window.__setFormula('mandelbulb', { julia: false, burning: false, burnMix: 1 }); window.__setPower(8); window.__setRebaseOrigin(${ORIGIN}); window.__setAutoIters(true); })()`);
} finally { await browser.close(); srv.stop(); }

// The historical suite only prints; as a guard for the port this one also gates.
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ` + pageErrors.slice(0, 5).join('\n  '));
const allOk = pass === DEPTHS.length && ran === DEPTHS.length && gridPass === GRIDS && gridRan === GRIDS
  && boxPass === BOX_VIEWS.length && boxRan === BOX_VIEWS.length && juliaPass === JULIA_VIEWS.length && juliaRan === JULIA_VIEWS.length && farPass === FAR_VIEWS.length && farRan === FAR_VIEWS.length
  && burnPass === BURN_VIEWS.length && burnRan === BURN_VIEWS.length && pageErrors.length === 0;
if (!allOk) console.log(`FAIL: expected ${DEPTHS.length}/${DEPTHS.length} depths, ${GRIDS}/${GRIDS} off-centre grids, ${BOX_VIEWS.length}/${BOX_VIEWS.length} Mandelbox grids, ${JULIA_VIEWS.length}/${JULIA_VIEWS.length} Julia grids, ${FAR_VIEWS.length}/${FAR_VIEWS.length} far views, ${BURN_VIEWS.length}/${BURN_VIEWS.length} Burning grids and no page errors`);
process.exit(allOk ? 0 : 1);
