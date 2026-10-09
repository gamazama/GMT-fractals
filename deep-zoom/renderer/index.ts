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
 *     works — the parity smoke does it — and leaks until the canvas is collected.)
 *   - CONTEXT LOSS is not restored. The file's own notes record device resets from large deep
 *     draws. After one, draws are no-ops, `thumbnail()` is black and telemetry still says ready;
 *     `instance.contextLost` / `onContextLost` are the only signal. Dispose and mount fresh.
 *   - BLOCKING COMPILES. `api.setBla(true)` compiles the heavier BLA shader synchronously: in the
 *     caller's stack when the deep shader is ready, otherwise inside the first `step()` after it
 *     lands. A shell should only call `setBla('auto')` or `setBla(false)`; for "on", call
 *     `setBla('auto')`, wait until `api.compileMs().PB` is defined, then `setBla(true)`. The three
 *     small programs compile synchronously inside `createDeepZoom`, and without
 *     KHR_parallel_shader_compile so does the deep shader (about 15 s cold).
 *   - SIZE. A size element of 0 x 0 (hidden tab, display:none) renders 2 x 2. The 1:1 view writes
 *     an inline width / height on the canvas, so the size element must not shrink-wrap the canvas.
 *     The size element is captured at create; re-parenting the canvas later is not followed.
 *   - With `autoStart: false` only the frame loop is host-driven. Path preview, the export's frame
 *     waits and `diveTo` still tick on the browser's requestAnimationFrame, as in the page.
 *   - `api.dz.thumbnail()` draws through the live GL state and restarts the still's convergence.
 *   - Views carry the camera as BigInt decimal STRINGS (fixed point, P = 256 bits). Never parse
 *     them to numbers; pass them back verbatim.
 *   - A module is strict-mode code, the page's script was not. port.mjs proves the port has no
 *     undeclared names; a later hand edit that assigns to one will throw instead of leaking a global.
 *   - The first `createDeepZoom` compiles the deep shader in the background (about 15 s cold).
 *     `api.dz.telemetry().ready` turns true when it lands; until then the f32 picture is shown.
 *
 * @invariant core.js draws the same picture and returns the same numbers as the historical page at
 *   3b65946 — proven by: npx tsx debug/smoke-deep-zoom-parity.mts ("picture ... harness = historical",
 *   "numbers ... GPU values equal"). Falsified 2026-10-07: with the kernel's distance estimate
 *   changed from `0.5 * rF * log(rF)` to `0.4 * ...` in core.js, 24 lines went red (all 20
 *   pictures, both number lines, the export's mean level, the re-created picture) and
 *   `port.mjs --check` reported the hand edit.
 * @assumption With `autoStart: false` the frame runs only when `step()` is called, and
 *   create -> dispose -> create leaves one loop, the same 8 listeners and one scaffold. The parity
 *   smoke's "lifecycle ..." lines check exactly this and pass, but they have not been run against
 *   a deliberately broken wrapper, so this is not yet an @invariant.
 * @assumption A disposed instance publishes nothing on `window`, and `loseContextOnDispose` loses
 *   the old context while a fresh canvas starts clean. The parity smoke's "lifecycle manual: a
 *   disposed instance publishes nothing late" and "lifecycle lose-context ..." lines check this and
 *   pass; they were not run against a wrapper with the fix removed, so not yet an @invariant.
 * @assumption The option seams `keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`,
 *   `resetStillOnResize` and `onContextLost` do what core.d.ts says. They were added after review
 *   by reading; no test drives a key, a drop, a click, a resize or a context loss through them.
 *   The parity smoke proves only that with the defaults nothing changed.
 * @assumption The page differs from itself: two runs of the HISTORICAL page can disagree in up to
 *   ~0.7 % of pixels once a setting has been changed away from its default (seen 2026-10-07 at
 *   detail 8; the default picture was identical every time). The smoke prints that floor beside
 *   every picture line. The cause was not investigated in this pass.
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
import type { DeepZoomCoreInstance, DeepZoomCoreOptions } from './core.js';

/** A camera view. Exactly the fields a recorded keyframe has, so a bookmark and a path frame are
 *  interchangeable. (Shapes copied from deep-zoom-prototype/bridge.ts, the iframe prototype's seam.) */
export interface DzView {
    /** BigInt fixed-point decimal strings, exactly as the recorder's keyframes store them. */
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
    recording: boolean;
    playing: boolean;
    exporting: boolean;
    pathFrames: number;
    bla: boolean;
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
    /** Fly straight ahead until the surface distance is about `depth`; resolves on arrival,
     *  on a fly key / Esc, or after 20 s. */
    diveTo(depth: number): Promise<void>;
    /** Who flies the camera. 'module' (the default): the page's own keys and captured-mouse look.
     *  'host': the module reads no key and no mouse; the host moves it with `api.moveAlong` and
     *  turns it with `setYawPitch`. The distance probe and auto iterations run either way.
     *  (Added 2026-10-08. grep `HOST INPUT` in core.js.)
     *  @invariant under 'host' a held fly key does not move the camera, and `api.moveAlong` /
     *  `setYawPitch` still do - proven by: npm run smoke:deep-zoom-parity ("host input: with the
     *  host owning it, holding W leaves the camera strings unchanged"). Falsified 2026-10-08: the
     *  owner test removed from the keydown listener -> red. The captured-mouse look under 'host'
     *  is NOT opened by any test (a pointer lock needs a real gesture). */
    setInputOwner(owner: 'module' | 'host'): void;
    inputOwner(): 'module' | 'host';
    /** The surface distance of the last frame, UNSMOOTHED (telemetry `depth` is eased when it
     *  rises). For a host whose own integrator eases the distance: feed it this, not `depth`. */
    rawDistance(): number;
    /** The look angles, in radians. Cheap: unlike `getView` it formats no camera strings. */
    yawPitch(): { yaw: number; pitch: number };
    /** Turn the camera. Pitch is clamped to +-1.55. Restarts the still; the reference orbit stays. */
    setYawPitch(yaw: number, pitch: number): void;
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
    /** `true` BLOCKS on a shader compile (see BLOCKING COMPILES above); a shell uses 'auto' / false. */
    setBla(on: boolean | 'auto'): void;
    /** Compile times in ms by variant key; `PB` is defined once the BLA variant has been built. */
    compileMs(): Record<string, number | undefined>;
    loadGradient(file: File): Promise<unknown>;
    setMode(mode: 'auto' | 'deep' | 'f32'): void;
    setGate(on: boolean): void;
    setFrame(longEdgePx: number): void;
    /** Whole number, clamped 2..16. Rebuilds the reference orbit. */
    setPower(n: number): void;
    /** Radians, absolute, always both. Rebuilds the reference orbit. */
    setPhase(theta: number, phi: number): void;
    /** Clamped 4..160. Rebuilds the reference orbit. With auto iterations on this is the floor:
     *  the module raises the count with depth and never lowers it. (Added 2026-10-08.) */
    setIters(n: number): void;
    setAutoIters(on: boolean): void;
    autoIters(): boolean;
    /** 0 screen-space / 1 3-tap / 2 4-tap / 3 from depth / 4 the hit orbit's own gradient (added
     *  2026-10-08: no extra orbits, but it needs the J shader variant - grep `TRUE-GRADIENT
     *  ESTIMATE` in core.js - which builds in the background; 4-tap is drawn until it is there).
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
    /** TRUE-GRADIENT ESTIMATE (added 2026-10-08, 0 = off = the page; grep the name in core.js). A
     *  second distance estimate built on the orbit's real 3x3 derivative. Bits: 1 = the march
     *  steps by the smaller of the two estimates, so no place needs a hand-set step; 2 = the
     *  surface normal is that gradient whatever the normal mode (a tool's switch: a host asks
     *  for the gradient with `setNormalMode(4)`); 4 = the hit test uses the
     *  smaller estimate too (it moves the surface). The picture switches when the variant has
     *  compiled, in the background (about 19 s; 36 s with BLA) - `jacobianState()` says when.
     *  `floor`: never shorten a step below this share of the page's (0 = no floor). `now`: build
     *  it at once, BLOCKING - for a measuring tool. */
    setJacobian(bits: number, floor?: number, now?: boolean): void;
    jacobianState(): 'off' | 'building' | 'on' | 'failed';
    /** A referee's read of both estimates on the centre ray at `t`; null unless `setJacobian` is on. */
    jacProbeAt(t: number): { t: number; de: number; escaped: boolean; gde: number; gradPacked: number } | null;
    /** THE RAY ESTIMATE AND RAY-COHERENT ORBITS (a prototype, added 2026-10-09, 0 = off = the page;
     *  grep the name in core.js). Bits: 1 = the march steps by 0.5 r ln r / |J v|, the escaping
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
     *  MARGIN). The picture switches when the variant has
     *  compiled, in the background - `rayMarchState()` says when; `now` builds it BLOCKING. While
     *  it is on, BLA and the true-gradient bits are not used. */
    setRayMarch(bits: number, opt?: { factor?: number; hit?: number; tol?: number; floor?: number; line?: number; detail?: number }, now?: boolean): void;
    rayMarchState(): 'off' | 'building' | 'on' | 'failed';
    rayMarch(): { bits: number; factor: number; hit: number; tol: number; floor: number; line: number; detail: number };
    marchLevers(): { stepRelax: number; capRelax: number; mode: 'auto' | 'deep' | 'f32'; hitRefine: number; rebaseOrigin: boolean; farHandOff: number; jacobian: number };
    blaMode(): 'off' | 'auto' | 'on';
    /** The live look record `setLook` writes into. Read only. */
    look: DzLook;
    lockInput(locked: boolean): void;
    samplePath(path: DzPath, tau: number): number[] | null;
    stopPlay(): void;
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
