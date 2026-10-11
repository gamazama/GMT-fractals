/**
 * deep-zoom/renderer/index.ts — the typed front door of the deep-zoom renderer.
 *
 * PURPOSE
 *   The renderer is `core.js`: the script of the standalone Mandelbulb perturbation deep-zoom page
 *   (repo `mandelbulb_deepzoom`, index.html at commit 3b65946) ported into a module by
 *   `port/port.mjs`. That page is HISTORICAL and frozen; core.js is the copy that gets edited from
 *   2026-10-07 on. This file re-exports `createDeepZoom` with real types for the part a shell
 *   should use (the page's `window.__dz` host handle, here `instance.api.dz`) and leaves the other
 *   ~75 handles reachable but loosely typed.
 *
 * THE SEAM
 *   Who calls it: the gmt-shell in `deep-zoom/` (one call per mounted canvas) and the dev harness
 *   (`deep-zoom-harness.html` -> `harness.ts`).
 *   What it needs: a `<canvas>` that is in the document and has a parent element. By default the
 *   parent supplies the available size (the page read the window) and receives the hidden scaffold
 *   element that holds the page's developer panel, HUD and loading box. Pass `sizeElement` /
 *   `scaffoldParent` to choose others.
 *   What it gives back: `{ canvas, api, frameCount, disposed, step(now), dispose() }`.
 *     - `api.name` is what the page called `window.__name`. `api.dz` is the product surface.
 *     - `autoStart: false` + `step(now)` lets the engine's tick drive the frame; the module then
 *       never calls requestAnimationFrame for its frame loop.
 *     - `dispose()` stops the loop, removes the six window listeners, the document listener, the
 *       canvas listener, the panel-sync interval and the scaffold.
 *
 * PITFALLS
 *   - The canvas is styled by the caller. The module only adds / removes the class `fit1to1` and
 *     an inline width / height when its 1:1 view is on (grep `updateCanvasDisplay` in core.js).
 *   - THE DEFAULTS ARE THE PAGE'S, AND THE PAGE OWNED ITS WINDOW. A shell must pass the option
 *     seams (all in core.d.ts) or it inherits these:
 *       keyboard  `keydown` / `keyup` are on `window` with no focus, text-field or modifier check and
 *                 no preventDefault. Typing in a shell field flies the camera; R, Escape, Y, S
 *                 collide with engine shortcuts; Ctrl+X in deep mode starts a 2560 px export.
 *                 -> `keyTarget: <focusable viewport element>` and, if the engine dispatcher owns
 *                 the keys, `shortcuts: false`. Modifiers are still not checked: with shortcuts on,
 *                 Ctrl+C inside the viewport still cycles the colour mode.
 *       drops     any file dropped anywhere in the window is loaded as a gradient (and the default
 *                 is prevented), next to the engine's SceneFileDropZone. -> `dropTarget: null`.
 *       pointer   every canvas click takes the pointer. -> `pointerLock: false`.
 *                 `api.lockInput(true)` does NOT release a pointer lock already held and the
 *                 mouse-look listener does not check it: call `document.exitPointerLock()` too.
 *                 With `look.compare` on, the divider follows the mouse over anything in the
 *                 canvas's horizontal span (panels included) and restarts the still.
 *       resize    the size element is read every frame, so a dock resize is followed, but the page
 *                 never restarted its still for it. -> `resetStillOnResize: true`.
 *   - REMOUNTING. `dispose()` frees no GL object unless `loseContextOnDispose` is set. A JSX
 *     `<canvas ref>` is the SAME node across StrictMode's mount, unmount, mount, so the second
 *     `createDeepZoom` gets the same context back holding two sets of programs and textures and two
 *     deep compiles. Create the canvas imperatively inside the effect, pass
 *     `loseContextOnDispose: true`, and remove the canvas in the cleanup. A canvas whose context
 *     was lost that way cannot be used again. (Without the flag, re-creating on the same canvas
 *     works — the parity smoke did it until it was retired, 2026-10-11 — and leaks until the canvas
 *     is collected.)
 *   - CONTEXT LOSS is not restored. The file's own notes record device resets from large deep
 *     draws. After one, draws are no-ops, `thumbnail()` is black and telemetry still says ready;
 *     `instance.contextLost` / `onContextLost` are the only signal. Dispose and mount fresh.
 *   - BLOCKING COMPILES. The three small programs compile synchronously inside `createDeepZoom`,
 *     and without KHR_parallel_shader_compile so does the deep shader (about 20 s cold). These
 *     block the caller until a build that is still in flight has finished: `api.setRayMarch(bits,
 *     opt, true)` and `api.setRayDefs` (the bulb's program), `api.dz.renderFrame` on the Mandelbox
 *     (its program), `api.stats` and `api.marchProbe` (the counter variants, built on first use).
 *     (The skip table's `api.setBla(true)` was the other one; it went 2026-10-11 with BLA.)
 *   - SIZE. A size element of 0 x 0 (hidden tab, display:none) renders 2 x 2. The 1:1 view writes
 *     an inline width / height on the canvas, so the size element must not shrink-wrap the canvas.
 *     The size element is captured at create; re-parenting the canvas later is not followed.
 *   - With `autoStart: false` only the frame loop is host-driven. The export's frame
 *     waits and `diveTo` still tick on the browser's requestAnimationFrame, as in the page.
 *     `api.dz.renderFrame` is the exception: its waits are a message channel (a hidden tab stops
 *     animation frames, and a long render must go on behind another window).
 *   - `api.dz.thumbnail()` draws through the live GL state and restarts the still's convergence.
 *   - Views carry the camera as BigInt decimal STRINGS (fixed point, P = 256 bits). Never parse
 *     them to numbers; pass them back verbatim.
 *   - A module is strict-mode code, the page's script was not. port.mjs proves the port has no
 *     undeclared names; a later hand edit that assigns to one will throw instead of leaking a global.
 *   - The first `createDeepZoom` compiles the deep shader in the background: THE RAY MARCH's
 *     program, the bulb's only one since 2026-10-11 (about 20 s cold on the machine it was
 *     measured on). `api.dz.telemetry().ready` turns true when it lands; until then the f32
 *     picture is shown and NOTHING draws a deep picture of the bulb. If it cannot be built,
 *     `telemetry().error` carries the compiler's log, `ready` never turns true and
 *     `api.rayMarchState()` says 'failed': an error for the host to show, not another march
 *     (the owner, 2026-10-11: a machine that cannot build it would not survive the bulb at depth
 *     by another route either).
 *
 * @invariant the GPU kernel's distance estimate agrees with a BigInt fixed-point march that shares
 *   no maths with it, to 1e-3, at 11 depths from 1e-5 to 1e-50 and on two 13 x 13 grids of
 *   off-centre rays, IN THE RAY MARCH'S PROGRAM (the only one the bulb has) — proven by: npm run
 *   smoke:deep-zoom-direct ("N/11 depths ...", the "off-centre rays ... rebase to the origin"
 *   lines). Falsified 2026-10-11 ON THE RAY PROGRAM: the kernel's estimate changed from
 *   `0.5 * rF * log(rF)` to `0.4 * ...` in core.js -> exit 1, 0/11 depths (each "worst
 *   GPUvsHP=2.0e-1 FAIL") and both gated off-centre grids FAIL (169 of 169 rays over 1e-2). The
 *   far hand-off lines of that proof are another invariant (grep FAR HAND-OFF in core.js; they
 *   read the referee at the hit and stayed PASS). Green before and after, with every printed
 *   number equal to the run in the page's own program the day before.
 * @assumption Retiring the page's march (2026-10-11) moved no picture that the ray march, the
 *   Mandelbox or the shell draws. Measured at each step of the retirement by a before / after
 *   comparison of 41 pictures (debug/scratch/r7/pictures.mts, git-ignored), and by the text of
 *   every kept shader program being what it was (debug/scratch/r7/shader-diff.mjs); there is no
 *   standing guard. WHAT THIS REPLACES: core.js NO LONGER DRAWS WHAT THE HISTORICAL PAGE DRAWS.
 *   Until that day this header held "@invariant core.js draws the same picture and returns the
 *   same numbers as the historical page at 3b65946", proven by the parity smoke
 *   (debug/smoke-deep-zoom-parity.mts: 20 pictures, two lines of numbers; falsified 2026-10-07
 *   with the estimate's 0.5 changed to 0.4 -> 24 lines red). The owner retired the page's march
 *   program and that smoke with it; its last run, on the tree before, was 52 of 52.
 * @see docs/adr/0137-the-deep-zoomers-mandelbulb-has-one-program.md
 * @assumption With `autoStart: false` the frame runs only when `step()` is called, and
 *   create -> dispose -> create leaves one loop, the same 8 listeners and one scaffold. The parity
 *   smoke's "lifecycle ..." lines checked exactly this and passed until that smoke was retired
 *   (2026-10-11); they were never run against a deliberately broken wrapper. NOTHING CHECKS IT NOW
 *   in the module; the shell's own mount is watched by npm run smoke:deep-zoom ("exactly one
 *   canvas#dz-render-canvas ... (StrictMode left one)", "host.frameCount() rises while the engine
 *   loop runs").
 * @assumption A disposed instance publishes nothing on `window`, and `loseContextOnDispose` loses
 *   the old context while a fresh canvas starts clean. The parity smoke's "lifecycle manual: a
 *   disposed instance publishes nothing late" and "lifecycle lose-context ..." lines checked this
 *   until 2026-10-11 (never against a wrapper with the fix removed). Nothing checks it now.
 * @assumption The option seams `keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`,
 *   `resetStillOnResize` and `onContextLost` do what core.d.ts says. They were added after review
 *   by reading; the shell's smoke drives a key in a text field, a shortcut key and a resize through
 *   three of them (npm run smoke:deep-zoom, stage 1), nothing drives a drop, a click or a context loss.
 * @assumption The HISTORICAL page differs from itself: two runs of it can disagree in up to
 *   ~0.7 % of pixels once a setting has been changed away from its default (seen 2026-10-07 at
 *   detail 8; the default picture was identical every time). The parity smoke printed that floor
 *   beside every picture line. The cause was not investigated.
 * @assumption `sizeElement.clientWidth / clientHeight` stand in for the page's `window.innerWidth /
 *   innerHeight`. Equal in the harness (the parent is a full-window body); a shell whose canvas
 *   parent is smaller than the window gets a picture sized to that parent, which is the intent but
 *   is not covered by a test.
 * @assumption The page read `--panel-w` from the document root for its docked-panel width and fell
 *   back to 400. core.js still does; a host stylesheet that defines `--panel-w` would change the
 *   renderer's aspect maths when `embed` is false. Not tested.
 * @assumption The loose handle signatures typed in `DeepZoomApi` below were read from core.js on
 *   2026-10-07 and are not checked by the compiler (core.js is untyped JavaScript).
 * @assumption The historical suites read only `window.__name` handles. Top-level names of the
 *   page's script (`cam`, `hp`, ...) were page globals and are closure state here; a suite body
 *   that reads one bare would fail against the harness. Not swept.
 */
import { createDeepZoom as createCore } from './core.js';
import type { DeepZoomBoxParams, DeepZoomCoreInstance, DeepZoomCoreOptions } from './core.js';

export type { DeepZoomBoxParams };
/** Which formula the renderer draws (grep `THE FORMULA SEAM` in core.js). */
export type DzFormulaKind = 'mandelbulb' | 'mandelbox';

/** A camera view. The fields a recorded keyframe has, so a bookmark and a path frame are
 *  interchangeable, plus the roll. (Shapes copied from deep-zoom-prototype/bridge.ts, the iframe prototype's seam.) */
export interface DzView {
    /** BigInt fixed-point decimal strings, exactly as the recorder's keyframes store them. */
    cam: [string, string, string];
    yaw: number;
    pitch: number;
    /** A turn about the view axis, in radians (grep `ROLL` in core.js). `getView` leaves it out when it
     *  is 0, and `setView` reads a view without it as 0: every view from before the roll is as it was. */
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

export interface DzTelemetry {
    ready: boolean;
    error: string;
    mode: 'deep' | 'f32';
    /** Camera distance to the surface = the zoom depth. */
    depth: number;
    fps: number;
    frameW: number;
    frameH: number;
    iters: number;
    power: number;
    accumN: number;
    accumMax: number;
    /** A render owns the context (the page's export, `renderFrame`): the frame loop draws nothing. */
    exporting: boolean;
    // 12 keys. The page had 16: `recording`, `playing`, `pathFrames` (its recorder and path preview:
    // grep `CAMERA PATHS` in core.js) and `bla` (the skip table) went on 2026-10-11 with the parity
    // smoke, which had compared the 16.
}

export interface DzSettings {
    detail: number;
    /** 0 short, 1 relaxed, 2 full. */
    reach: number;
    power: number;
    phase: [number, number];
    color: number;
    cscale: number;
    light: number;
    falloff: number;
    normals: number;
    land: boolean;
    frame: number;
    accum: boolean;
    lookMode: number;
}

export interface DzPath {
    format: 'gmt-mbulb-path';
    P: number;
    fovScale: number;
    frames: Array<DzView & { t?: number; move?: number; rot?: number }>;
}

/** A loose record of the renderer's look settings. */
export interface DzLook {
    mode?: number;
    view?: number;
    compare?: number;
    ao?: number;
    shadow?: number;
    haze?: number;
    sky?: number;
    rough?: number;
    keyElev?: number;
    keyTurn?: number;
    tint?: number | number[] | string;
    [key: string]: unknown;
}

/** The product surface: the page's `window.__dz` (version 1). Grep `HOST HANDLE` in core.js. */
export interface DzHostHandle {
    version: 1;
    telemetry(): DzTelemetry;
    settings(): DzSettings;
    getView(): DzView;
    setView(v: DzView): void;
    /** The current view as a square PNG data URL ('' when nothing can be drawn yet). */
    thumbnail(size?: number): string;
    /** The picture as it is on the canvas now, as a new 2D canvas of the frame's size; null while
     *  a render owns the context. Use THIS to save the picture, never a copy of the canvas after
     *  a step: once the still is done that copy is empty (the browser's owed clear lands on the
     *  read; grep `SNAPSHOT` in core.js for the order that avoids it).
     *  (Added 2026-10-08.) */
    snapshot(): HTMLCanvasElement | null;
    /** ONE FRAME TO MEMORY (added 2026-10-11; grep the name in core.js): the current view and look
     *  as a PNG blob, `longEdge` pixels on its long side (both sides made even), `samples` jittered
     *  samples a pixel, at `aspect` (width over height) or, without one, the canvas's own shape
     *  now - pass it to hold a sequence's frames to one size while the window may change. Resolves null when cancelled
     *  (`api.cancelRender()`). Rejects when it cannot start (not ready, a render already running)
     *  or the picture is too large for the look. `telemetry().exporting` is true while it runs, and
     *  the frame loop draws nothing. Its waits are a message channel, so it goes on in a hidden
     *  tab. It may block on the Mandelbox's shader build when asked before that variant is there
     *  (the bulb's one program is what "ready" means, so there is nothing to wait for).
     *  @assumption A frame depends on the view and the look and nothing else. BY CONSTRUCTION:
     *  every value the picture is drawn from is worked out from the view inside the call. BY
     *  MEASUREMENT (the app, the real GPU, 2026-10-11; debug/scratch/r6/, git-ignored; numbers in
     *  core.js under the name above) only where the picture is smooth: there a frame alone and the
     *  same frame after another are equal pixel for pixel. Where the picture is grain the renderer
     *  does not draw one view the same twice - its own still export does not either - so equality
     *  cannot be shown there. No standing guard: the owner declined a new smoke for it. */
    renderFrame(req: { longEdge: number; samples: number; tile?: number; aspect?: number }): Promise<Blob | null>;
    /** Fly straight ahead until the surface distance is about `depth`; resolves on arrival,
     *  on a fly key / Esc, or after 20 s. */
    diveTo(depth: number): Promise<void>;
    /** Who flies the camera. 'module' (the default): the page's own keys and captured-mouse look.
     *  'host': the module reads no key and no mouse; the host moves it with `api.moveAlong` and
     *  turns it with `setYawPitch` or `setOrientation`. The distance probe and auto iterations run either way.
     *  (Added 2026-10-08. grep `HOST INPUT` in core.js.)
     *  @assumption under 'host' a held fly key does not move the camera, and `api.moveAlong` /
     *  `setYawPitch` still do. An @invariant until 2026-10-11, proven by the parity smoke ("host
     *  input: with the host owning it, holding W leaves the camera strings unchanged"; falsified
     *  2026-10-08: the owner test removed from the keydown listener -> red). That smoke is retired
     *  and no other guard opens the module's own key listener under 'host': the shell's smoke
     *  flies with the shell's keys (stage N5). The captured-mouse look under 'host' was never
     *  opened by any test (a pointer lock needs a real gesture). */
    setInputOwner(owner: 'module' | 'host'): void;
    inputOwner(): 'module' | 'host';
    /** The surface distance of the last frame, UNSMOOTHED (telemetry `depth` is eased when it
     *  rises). For a host whose own integrator eases the distance: feed it this, not `depth`. */
    rawDistance(): number;
    /** The look angles, in radians. Cheap: unlike `getView` it formats no camera strings. */
    yawPitch(): { yaw: number; pitch: number };
    /** Turn the camera. Pitch is clamped to +-1.55, the roll stays as it is. Restarts the still; the
     *  reference orbit stays. */
    setYawPitch(yaw: number, pitch: number): void;
    /** The whole orientation, in radians: `yawPitch` and the roll about the view axis. */
    orientation(): { yaw: number; pitch: number; roll: number };
    /** Set the whole orientation. NOTHING IS CLAMPED: a pitch within +-pi/2 is the caller's promise
     *  (the basis is well defined at the poles; beyond them the picture is upside down). Restarts
     *  the still; the reference orbit stays.
     *  @assumption with the roll at 0 the picture is what it was before the camera had a roll,
     *  pixel for pixel. An @invariant until 2026-10-11, proven by the parity smoke's 20 "picture
     *  ..." lines against the frozen page (falsified 2026-10-10: the camera started with a roll of
     *  0.1 in core.js -> 22 lines red). That smoke is retired with the page's march; nothing
     *  compares a roll-free picture with anything now. */
    setOrientation(yaw: number, pitch: number, roll: number): void;
    /** THE FREE DISTANCE ALONG A RAY (added 2026-10-09; grep the name in core.js): seven rays about
     *  `axis` (a unit vector in world axes; null or absent = the view axis), marched on the CPU from
     *  the camera as it is NOW to the solid as it is DRAWN. What a host's navigation flies by,
     *  instead of the estimate at the camera (`rawDistance`), which is the nearest surface in any
     *  direction and reads the true fractal rather than the drawn one. Draws nothing, moves nothing.
     *  @invariant the vector carried with the orbit is the iterate's derivative along the ray; no ray
     *  ends past the surface an independent referee finds, also next to the drawn surface where the
     *  estimate at the camera reads many times the free distance; a kept bundle reads shorter by the
     *  move and is marched again when the iteration count changes - proven by: npm run
     *  check:deep-zoom-ray-probe ("jet: ...", "ray: no ray ends past ...", "drawn surface: ...",
     *  "kept: ..." lines). Falsified 2026-10-09: the eight breaks in the check's header. */
    sense(axis?: [number, number, number] | null, opt?: DzSenseOptions): DzSense;
    /** One such ray on its own (a pick under the pointer: pass `tol: 0.005`). `kind` 'open': no
     *  surface within the steps allowed or within 8 units; `t` is then how far it was followed. */
    freeDistance(dir: [number, number, number], opt?: { tol?: number; maxSteps?: number }): { t: number; kind: 'hit' | 'open' | 'inside' };
    /** The distance estimate at the camera moved by `offset` (world units): the nearest surface in
     *  any direction as the estimate reads it there; 0 inside the drawn solid. `rawDistance()` is
     *  this at no offset. One orbit on the CPU. A comfort distance (it under-reads on ordinary
     *  ground and can over-read beside the drawn surface), not a limit to trust a move to.
     *  (Added 2026-10-09.) */
    estimateAt(offset: [number, number, number]): number;
    /** The same estimate at ANY exact position (three fixed-point decimal strings, as a view's
     *  `cam`), with `iters` iterations (0 or absent: the count in force): 0 inside the solid as it
     *  would be drawn with that count. `estimateAt` cannot answer for a point decades deeper than
     *  the camera: its offset is a double. Builds one reference orbit for the call (milliseconds at
     *  depth); the camera, the frame's orbit and the picture are not touched. (Added 2026-10-11.)
     *  @assumption It reads what `estimateAt([0, 0, 0])` reads when handed the camera's own strings
     *  and the count in force, and 0 at the bulb's centre: measured in the app on 2026-10-11
     *  (debug/scratch/r3/app-route.mts), no standing guard. */
    estimateAtPoint(position: [string, string, string], iters?: number): number;
}

/** What a bundle of rays read (`DzHostHandle.sense`). Distances are in world units from the camera. */
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

/** `api`: every handle the page published as `window.__name`. Only the members a shell is likely
 *  to need are typed; the rest (test studies, probes, levers) are reachable through the index
 *  signature and are `unknown` until narrowed. */
export interface DeepZoomApi {
    dz: DzHostHandle;
    /** undefined while the deep shader compiles, then true (or false with `deepErr` set). */
    deepReady?: boolean;
    deepErr?: string;
    setLook(o: DzLook): void;
    /** 0 short, 1 relaxed, 2 full. */
    setReach(k: number): void;
    setSurf(mul: number): void;
    setColor(mode: number, scale?: number): void;
    setAccum(on: boolean): void;
    /** Compile times in ms by program key: `S` (pass S), `PR` (the bulb's program, the ray march),
     *  `X` (the Mandelbox), `PTR` / `XT` (their counter variants). A key is defined once built. */
    compileMs(): Record<string, number | undefined>;
    loadGradient(file: File): Promise<unknown>;
    /** One row of RGBA texels as the palette, at once (added 2026-10-09). `width` defaults to the
     *  row's own length. It does NOT touch the colour mode, where `loadGradient` flips Plain to
     *  Orbit trap. The texels are the surface's albedo as they are - hand them over linear. */
    setGradientTexels(rgba: Uint8Array, width?: number): void;
    /** Back to the built-in cosine palette. */
    clearGradient(): void;
    setMode(mode: 'auto' | 'deep' | 'f32'): void;
    setGate(on: boolean): void;
    setFrame(longEdgePx: number): void;
    /** Whole number, clamped 2..16. Rebuilds the reference orbit. */
    setPower(n: number): void;
    /** Radians, absolute, always both. Rebuilds the reference orbit. */
    setPhase(theta: number, phi: number): void;
    /** Clamped to 4 .. the ceiling in force: 400 for the bulb under the ray march, 500 while the box
     *  is drawn, the page's 160 with ray bits 0 (grep `const itersMax` in core.js; `dz.setView`
     *  holds a view's count under the same number). Until 2026-10-11 the bulb was held at 160
     *  whatever marched it. Rebuilds the reference orbit. With auto iterations on this is the
     *  floor: the module raises the count with depth and never lowers it. (Added 2026-10-08.) */
    setIters(n: number): void;
    /** THE FORMULA SEAM (added 2026-10-09; grep the name in core.js). 'mandelbulb' is the page;
     *  'mandelbox' is GMT's AmazingBox in Mandelbrot mode, with the parameters given (each optional,
     *  each kept from call to call, also while the bulb is drawn). The camera and every setting stay;
     *  the reference orbit and the still restart. Selecting the box for the first time starts its
     *  shader variant building in the background (4.4 s measured, cold): its plain single-precision picture
     *  is drawn until then, `dz.telemetry().ready` is false and `formulaState()` says 'building'.
     *  The box always steps by the page's rule, in its own program: the ray march
     *  and the rebase to the origin are the bulb's, stay as they were asked, and apply again when
     *  the bulb is selected (`rayMarch().bits` is the ask; `rayMarchState()` says 'off' meanwhile).
     *  Selecting the box raises the iteration count to the least that draws it; with auto iterations
     *  the box then counts by its own rule, up to 500 (grep `ITERATIONS AS A MARGIN` in core.js).
     *  The formula is NOT part of a view (`DzView` is unchanged): a host that saves a place saves
     *  `formula()` beside it.
     *  @invariant the box's orbit on the CPU - what `dz.sense`, `dz.freeDistance`, `dz.estimateAt`
     *  and the probes' referee run - equals an exact fixed-point orbit of the same point, fold
     *  crossings included - proven by: npm run check:deep-zoom-box-orbit ("twin = exact ..." lines).
     *  Falsified 2026-10-09: the 19 breaks in that file's header.
     *  @invariant the GPU kernel (BOX_KERNEL) computes what that CPU orbit computes, and what a
     *  fixed-point orbit of the explicit point gives: from outside and at depth, both signs of scale,
     *  and with the camera 3e-51 from a fold plane, where the reference's distance to that plane must
     *  reach the shader as mantissa and exponent - proven by: npm run smoke:deep-zoom-direct ("mandelbox,
     *  ... GPU vs twin: 0 over 1e-3 ... GPU vs direct: 0 over 1e-3 ... PASS", five lines). Falsified
     *  2026-10-09: three breaks, each exit 1 - one case of the box fold in the shader (the three deep
     *  lines FAIL), the sphere fold's shell case (two FAIL), and the fold distances uploaded as plain
     *  floats (only the fold-plane line FAILS). The record is in that script's header. */
    setFormula(kind: DzFormulaKind, params?: DeepZoomBoxParams): void;
    /** What is selected, and the box's parameters as they are held (after the limits). */
    formula(): { kind: DzFormulaKind; scale: number; minR: number; fold: number; fixedR: number; rot: [number, number, number] };
    /** Whether the deep shader of the SELECTED formula is there. */
    formulaState(): 'building' | 'on' | 'failed';
    setAutoIters(on: boolean): void;
    autoIters(): boolean;
    /** 0 screen-space / 1 3-tap / 2 4-tap / 3 from depth. (A mode 4, the hit orbit's own gradient,
     *  went on 2026-10-11 with the shader variant it needed: grep `TRUE-GRADIENT ESTIMATE` in core.js.)
     *  Does NOT restart the still: follow it with `setLook({})`. */
    setNormalMode(mode: number): void;
    setLand(on: boolean): void;
    /** 0 direct / 1 lamp / 2 both. A falsy `falloff` leaves the falloff as it is; an undefined
     *  `mode` sets Direct - always pass both. */
    setLight(mode: number, falloff?: number): void;
    /** March step factor; 0 means the default 0.85. */
    setStepRelax(r: number): void;
    /** Scales the deep resolution cap; 1 is the shipped cap. */
    setCapRelax(m: number): void;
    /** HIT REFINE (added 2026-10-08, 0 = OFF by default; grep `HIT REFINE` in core.js): halve each
     *  hit's last march step `n` times (0..12) onto the level the hit was meant to land on. It
     *  removes the terraces a hit "wherever the last step fell" leaves in the depth, at one orbit
     *  per halving on rays that hit. It moves the surface, so with it on the picture differs from
     *  the frozen page. `setLook({ compare: 3 })` shows it on the right of the divider only (with
     *  4 halvings when this is 0), same samples on both sides.
     *  NOT KEPT, for whoever thinks of it next: Mandelbulb3D's overstep clamp and step damper
     *  (GMT's `mb3dPreHit`) were ported and measured the same day on the view that prompted this -
     *  57.1 % of pixels wrong without, 56.0 % with. That guard reacts to a distance that falls
     *  faster than the step along the ray; a ray grazing a ridge never sees that.
     *  It refines far-field hits too: the same halving, on plain f32 numbers. */
    setHitRefine(n: number): void;
    /** MARCH PROBE (added 2026-10-08; a measuring handle, nothing draws through it): `n` x `n` rays
     *  of the current view marched as a picture `pixH` rows tall marches them, read back raw - four
     *  floats a ray: where it ended, steps + 65536 x kind, march orbits, kernel passes. Layout and
     *  proof: grep `MARCH PROBE` in core.js. The tool on it: `npm run bench:deep-zoom-march`. */
    marchProbe(n?: number, pixH?: number): Float32Array | null;
    /** Read-back for the settings above that had setters only. (Added 2026-10-08.) */
    /** REBASE TO THE ORIGIN (added 2026-10-08, off by default = the page's kernel; the create option
     *  `rebaseOrigin` sets it from the start). A precision repair, not a look: grep the name in
     *  core.js for the fault it cures and its proof (`npm run smoke:deep-zoom-direct`). */
    setRebaseOrigin(on: boolean): void;
    /** FAR HAND-OFF (added 2026-10-08; 1e-3 = the page, clamped 1e-3 .. 12; the create option
     *  `farHandOff` sets it from the start): how far the deep march carries a ray before the plain
     *  f32 far-field march takes it. grep the name in core.js. */
    setFarHandOff(t: number): void;
    /** THE LOOK LEVEL (an experiment, added 2026-10-09; 0 = off = the page; grep the name in core.js).
     *  The detail setting says both how close a ray stops and how far apart the normal's taps stand.
     *  A normal detail `d` below the detail setting, with 4-tap normals: the ray still stops where the
     *  detail setting says, but its normal is taken as detail `d` would take it, where the ray crossed
     *  that coarser level - fine geometry, a calmer surface. */
    setNormalDetail(d: number): void;
    normalDetail(): number;
    /** THE RAY ESTIMATE AND RAY-COHERENT ORBITS (added 2026-10-09; the bulb's ONLY program since
     *  2026-10-11, on from the start at bits 5, floor 256, line 2; grep the name in core.js). A
     *  shell has no reason to call this: the proofs and the bench do. Bits 8 is a measuring mode
     *  (carry the jet, march as the page does); bits 0 leaves nothing of the ray march in force
     *  inside the same program (the page's step rule, the page's iteration rules) - it is no longer
     *  "the page's program". Bits: 1 = the march steps by 0.5 r ln r / |J v|, the escaping
     *  iterate's speed along the ray - a first-order estimate of the distance left along it,
     *  measured safe on the test views (not proven), so no step setting; 2 = a hit is tested by it at a fixed share of a display pixel (`hit`, default
     *  1/64), so no detail setting; 4 = each sample resumes the previous sample's orbit and runs
     *  only the last few iterations again. `tol`: how far, in display pixels, a resumed orbit's
     *  point may stand from the true one (default 0.05). `floor`: with the page's hit test (bit 2
     *  off), also a hit once the ray estimate is under a display pixel / this (0 = none) - it ends
     *  the creeping of rays that pass very near something. `line`: THE LINE AGAINST THE BALL (grep
     *  it in core.js) - the longer step that rule allows is taken, with this multiple of the bend
     *  measure as its allowance (0 = off; 2 is the tested value). `detail`: above 0, the hit level is a
     *  display pixel / this whatever `setSurf` says (default 0 = follow `setSurf`). With
     *  auto iterations the cap stands a margin above the camera orbit's own escape (grep ITERATIONS AS A
     *  MARGIN). The program is built at load, in the background - `rayMarchState()` says when it
     *  is there; `now` waits for that build, BLOCKING. */
    setRayMarch(bits: number, opt?: { factor?: number; hit?: number; tol?: number; floor?: number; line?: number; detail?: number }, now?: boolean): void;
    /** The bulb's program: 'building' from create until it is there ('on'), 'failed' for good if it
     *  could not be built (`dz.telemetry().error` has the log; nothing else draws the bulb deep).
     *  'off' while the Mandelbox is drawn, or with bits 0. */
    rayMarchState(): 'off' | 'building' | 'on' | 'failed';
    rayMarch(): { bits: number; factor: number; hit: number; tol: number; floor: number; line: number; detail: number };
    marchLevers(): { stepRelax: number; capRelax: number; mode: 'auto' | 'deep' | 'f32'; hitRefine: number; rebaseOrigin: boolean; farHandOff: number };
    /** The live look record `setLook` writes into. Read only. */
    look: DzLook;
    lockInput(locked: boolean): void;
    /** Put the camera at time `tau` along a recorded path (the sample flight: the march bench places
     *  its views with it). What is left of the page's path code: grep `CAMERA PATHS` in core.js. */
    samplePath(path: DzPath, tau: number): number[] | null;
    cancelRender(): void;
    [name: string]: unknown;
}

export type DeepZoomOptions = DeepZoomCoreOptions;

export interface DeepZoomInstance extends Omit<DeepZoomCoreInstance, 'api'> {
    readonly api: DeepZoomApi;
}

/**
 * Start a renderer on `canvas`. Throws `Error('WebGL2 unavailable')` when the canvas cannot give
 * a WebGL2 context (the scaffold is removed first, nothing is left behind).
 */
export function createDeepZoom(canvas: HTMLCanvasElement, options: DeepZoomOptions = {}): DeepZoomInstance {
    // core.js is untyped JavaScript: its `api` is declared as a record of unknowns. The shape above
    // is what the ported script assigns (grep `api.dz = {` in core.js), so this is a type-graft.
    return createCore(canvas, options) as unknown as DeepZoomInstance;
}
