/**
 * deep-zoom/renderer/core.d.ts — loose types for core.js (the ported page script).
 *
 * core.js is plain JavaScript on purpose: it is a verbatim port of the standalone page and is not
 * converted to TypeScript (see its header). This file only says what goes in and what comes out.
 * The typed product surface is index.ts; import from there, not from here.
 */

/** The Mandelbox's parameters (GMT's `AmazingBox`; grep `THE FORMULA SEAM` in core.js). Each is optional and
 *  keeps its last value: scale 2, minR 0.5, fold 1, fixedR 1, no rotation at the start. */
export interface DeepZoomBoxParams {
    /** May be NEGATIVE. |scale| is held at or above 1.02 (at 1 nothing escapes) and at or below 8. */
    scale?: number;
    /** Min radius of the sphere fold. Held at or above 3.2e-5 (GMT floors its square at 1e-9). */
    minR?: number;
    /** Folding limit of the box fold. */
    fold?: number;
    /** Fixed radius of the sphere fold. Held at or above `minR`. */
    fixedR?: number;
    /** Pre-rotation about x, y, z in radians, applied in that order every iteration. */
    rot?: [number, number, number];
    /** BURNING (grep the name in core.js), the Mandelbulb's: at the top of every iteration a negative coordinate
     *  is multiplied by 1 - 2 `burnMix` (0 to 1; 1 = the plain abs). Kept from call to call, also while the box
     *  is drawn. The first time it is on, a variant of the ray program builds in the background. */
    burning?: boolean;
    burnMix?: number;
    /** JULIA MODE (grep the name in core.js), for EITHER formula: true = c is one constant and the point looked
     *  at starts the orbit; false = c is the point itself. Kept from call to call. */
    julia?: boolean;
    /** The Julia constant: three fixed-point decimal strings, as a view's `cam` - or three finite numbers (a
     *  host's number rows; the constant is then those doubles, exactly). Anything else is refused. */
    c?: [string, string, string] | [number, number, number];
}

export interface DeepZoomCoreOptions {
    /** Default true. True is the page's `?embed=1`: its own panels never open. */
    embed?: boolean;
    /** Default true: the module runs its own requestAnimationFrame loop. False: the host calls
     *  `instance.step(now)` every frame and the module never schedules itself. */
    autoStart?: boolean;
    /** Default false. True also writes every `api.name` to `window.__name`, as the page did
     *  (the dev harness sets it so the historical suites run unchanged). */
    publishOnWindow?: boolean;
    /** Where the hidden scaffold element goes. Default: the canvas's parent. */
    scaffoldParent?: HTMLElement | null;
    /** The element whose size is the picture's available area (the page used the window).
     *  Default: the canvas's parent. */
    sizeElement?: HTMLElement | null;
    /** Where the page's `alert(...)` messages go. Default: console.warn. */
    onNotice?: (message: string) => void;
    /** Where `keydown` / `keyup` listen. Default `window` (the page: every key typed anywhere in
     *  the window reaches the renderer). Pass a focusable element (tabIndex 0) so keys arrive only
     *  while it has focus; held fly keys are then also released when it, or the window, loses focus. */
    keyTarget?: HTMLElement | Window | null;
    /** Default true (the page). False: keys are still recorded for flying (W A S D Q E, Shift) and
     *  for cancelling a dive (Escape), but none of the page's single-key shortcuts acts — the host
     *  owns them and calls the `api` setters. */
    shortcuts?: boolean;
    /** Where `dragover` / `drop` listen for a gradient file. Default `window` (the page: any file
     *  dropped anywhere is loaded as a gradient). `null`: no drop listeners; the host calls
     *  `api.loadGradient(file)` itself. */
    dropTarget?: HTMLElement | Window | null;
    /** Default true (the page): a click on the canvas takes the pointer for mouse-look. False: no
     *  click listener; the host calls `canvas.requestPointerLock()` when it wants mouse-look. */
    pointerLock?: boolean;
    /** Default false (the page). True: a change in the size element's width or height restarts the
     *  still, so a dock resize cannot leave a half-converged picture in a target of the old size. */
    resetStillOnResize?: boolean;
    /** Default false. True: `dispose()` also loses the WebGL context, which frees every program and
     *  texture this instance made and abandons a deep compile in flight. The canvas CANNOT be used
     *  again afterwards — give each mount a fresh canvas. */
    loseContextOnDispose?: boolean;
    /** Which path draws, from the first frame: 'auto' (the default, the page: the f32 baseline while
     *  the surface is farther than 1e-4, the deep path below), 'deep' (the deep path at every
     *  depth; the f32 baseline only until the deep shader has compiled) or 'f32'. `api.setMode`
     *  changes it later. */
    mode?: 'auto' | 'deep' | 'f32';
    /** Default false (the page): far ground - a hit farther than about 1e-3 from the camera, which
     *  is every hit of a shallow view - is drawn in one mid grey. True: it takes the palette and
     *  the near surface's albedo (grep `FAR LOOK` in core.js). */
    farLook?: boolean;
    /** Default false (the page's kernel). True: an orbit that the kernel rebases is carried onto the
     *  origin instead of onto the reference's first point, which keeps single precision where orbits
     *  pass the origin and run on (grep `REBASE TO THE ORIGIN` in core.js). The same orbit, so the
     *  picture moves only by rounding. `api.setRebaseOrigin` changes it later. */
    rebaseOrigin?: boolean;
    /** Default 1e-3 (the page). The distance from the camera at which a ray without a hit leaves the
     *  deep march for the plain f32 far-field march (grep `FAR HAND-OFF` in core.js). Just past
     *  1e-3 the f32 march's hits are noise; the shell passes 0.5. Clamped to 1e-3 .. 12.
     *  `api.setFarHandOff` changes it later. */
    farHandOff?: number;
    /** Default false (the page). True: while the iteration count is too low for the camera's own orbit
     *  to escape, the distance at the camera keeps its last value instead of reading 0, and the first
     *  real one is taken at once instead of eased towards over seconds - a still started meanwhile
     *  otherwise shows a faint second picture (grep `HOLD THE ESTIMATE` in core.js). The Mandelbox
     *  does this whatever the option says. */
    holdEstimate?: boolean;
    /* NO `rayMarch` OPTION SINCE 2026-10-11. It chose between the page's march (the default then) and THE RAY
     * MARCH (grep `THE RAY ESTIMATE` in core.js). The ray march is now the bulb's only program, on from the
     * start as the shell had it: steps by the ray estimate and the line rule, orbits resumed along the ray,
     * iterations as a margin. Its shader builds in the background from the moment the module is created
     * (about 8 s cold since 2026-10-12, about 20 s before) and IS what `ready` waits for; nothing else draws a deep picture of the bulb meanwhile,
     * and a build that fails is an error (`api.dz.telemetry().error`), not another march. core.js does not
     * read the key: a JavaScript caller that still passes it gets the ray march. */
    /** Default 'mandelbulb' (the page). 'mandelbox': start on the Mandelbox (grep `THE FORMULA SEAM` in
     *  core.js); its deep shader variant starts to build at once, beside the bulb's. The box steps by the
     *  page's rule: the ray march is the bulb's, stays as it was asked and applies again when the bulb is
     *  selected. `api.setFormula` changes it later. */
    formula?: 'mandelbulb' | 'mandelbox';
    /** The box's parameters from the start (they are kept while the bulb is drawn). */
    formulaParams?: DeepZoomBoxParams;
    /** Called once if the browser takes the WebGL context away (`instance.contextLost` turns true).
     *  Nothing is restored: dispose and mount a fresh canvas. */
    onContextLost?: () => void;
}

export interface DeepZoomCoreInstance {
    readonly canvas: HTMLCanvasElement;
    /** What the page put on `window` as `window.__name`, here as `api.name`. Most members are
     *  functions; a few are live objects or flags (`cam`, `look`, `deepReady`, ...). */
    readonly api: Record<string, unknown>;
    /** Frames the loop has run so far. */
    readonly frameCount: number;
    readonly disposed: boolean;
    /** True once the browser has taken the WebGL context. Draws are then no-ops while
     *  `api.dz.telemetry()` keeps reporting `ready`; dispose and mount a fresh canvas. */
    readonly contextLost: boolean;
    /** Run one frame now. For a host that passed `autoStart: false`. */
    step(now?: number): void;
    /** Stop the loop, remove every window / document / canvas listener and the scaffold. */
    dispose(): void;
}

export function createDeepZoom(canvas: HTMLCanvasElement, options?: DeepZoomCoreOptions): DeepZoomCoreInstance;
