/**
 * deep-zoom/renderer/core.d.ts — loose types for core.js (the ported page script).
 *
 * core.js is plain JavaScript on purpose: it is a verbatim port of the standalone page and is not
 * converted to TypeScript (see its header). This file only says what goes in and what comes out.
 * The typed product surface is index.ts; import from there, not from here.
 */

export interface DeepZoomCoreOptions {
    /** Default true. True is the page's `?embed=1`: its own panels never open and stopping a
     *  recording keeps the path in memory instead of downloading it. */
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
