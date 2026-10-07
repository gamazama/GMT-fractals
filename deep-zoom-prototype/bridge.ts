/**
 * deep-zoom-prototype/bridge.ts — the typed seam between the React shell and the standalone Mandelbulb
 * perturbation renderer.
 *
 * PURPOSE
 *   The renderer is one self-contained HTML page (master copy: the `mandelbulb_deepzoom` repo;
 *   engine copy: `public/deep-zoom-prototype-core/index.html`, refreshed by
 *   `npm run sync:deep-zoom-prototype-core`).
 *   The shell embeds it in a same-origin iframe opened with `?embed=1` and drives it ONLY through
 *   this file. Nothing else in `deep-zoom-prototype/` should touch `iframe.contentWindow` directly: every
 *   handle name the core exposes is spelled exactly once, here.
 *
 * THE SEAM
 *   - `window.__dz` (version 1) in the core: telemetry / settings / getView / setView / thumbnail /
 *     diveTo. Grep `HOST HANDLE` in the core page.
 *   - The core's older loose `window.__*` handles (`__setSurf`, `__setReach`, `__renderPath`, ...).
 *     `connectCore` wraps each in a named method so the panels never see a `__` name.
 *   - `connectCore(iframe)` resolves once the core has finished compiling its deep shader
 *     (`__deepReady === true`) and `__dz` exists; it rejects on a compile error or after 120 s.
 *
 * PITFALLS
 *   - Same origin is required. The iframe src must be RELATIVE (`deep-zoom-prototype-core/index.html?embed=1`)
 *     because the build uses `base: './'`; a leading slash breaks the `/dev` preview deploy.
 *   - Keyboard focus: the fly controls listen on the iframe's window. After any click on a shell
 *     overlay the keys go to the shell; call `bridge.focus()` to hand them back.
 *   - `exportStill` / `renderPath` return `{ error }` (they do not throw) when the core is busy or
 *     has no deep reference orbit yet (shallow views run the f32 path). Check the result.
 *   - `thumbnail()` draws through the live GL state and restarts the still's convergence.
 *   - Views carry the camera as BigInt decimal STRINGS (fixed point, P = 256 bits). Never parse
 *     them to numbers; pass them back verbatim.
 *
 * @assumption The core page is version 1 of `__dz` and keeps every loose handle named below.
 *   Nothing fails at build time if the vendored copy drifts; `connectCore` checks `__dz.version`
 *   and each wrapper throws a named error when its handle is missing. Guarded only by the headed
 *   smoke `npm run smoke:deep-zoom-prototype`, which has not been falsified against a broken core.
 * @assumption With `?embed=1` the core does not download the path JSON when a recording stops;
 *   the shell reads `lastPath()` instead (grep `EMBED` in the core's `__recordToggle`).
 */

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

/** A loose record of the core's look settings. */
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

export interface DzBridge {
    win: Window;
    telemetry(): DzTelemetry;
    settings(): DzSettings;
    getView(): DzView;
    setView(v: DzView): void;
    thumbnail(size?: number): string;
    diveTo(depth: number): Promise<void>;

    setMode(m: 'auto' | 'deep' | 'f32'): void;
    setDetail(x: number): void;
    setReach(k: number): void;
    setPower(n: number): void;
    setPhase(theta: number, phi: number): void;
    setColor(mode: number, scale?: number): void;
    loadGradientFile(): Promise<unknown>;
    clearGradient(): void;
    setLight(mode: number, falloff?: number): void;
    look(): DzLook;
    setLook(p: Partial<DzLook>): void;
    setFrame(longEdgePx: number): void;
    setAccum(on: boolean): void;

    /** Returns the new recording state. */
    recordToggle(): boolean;
    recording(): boolean;
    lastPath(): DzPath;
    smoothPath(p: DzPath, passes?: number, alpha?: number): DzPath;
    samplePath(p: DzPath, tSeconds: number): void;
    playPath(p: DzPath, o?: { frames?: number; fps?: number }): Promise<unknown>;
    stopPlay(): void;

    /** Downloads ZIPs of PNG frames. */
    renderPath(p: DzPath, o: { frames: number; fps: number; longEdge: number; samples: number }): Promise<unknown>;
    /** Downloads a PNG. */
    exportStill(longEdge: number, samples: number): Promise<unknown>;
    cancelRender(): void;
    /** Keyboard focus back to the fly controls. */
    focus(): void;
}

/** How long `connectCore` waits for the core to compile before giving up. */
export const CORE_READY_TIMEOUT_MS = 120_000;

// The core window is untyped by nature (an inline script in a vendored page).
type CoreWindow = Window & Record<string, any>;

function waitForLoad(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise((resolve) => {
        let doc: Document | null = null;
        try { doc = iframe.contentDocument; } catch { doc = null; }
        const href = (() => { try { return iframe.contentWindow?.location.href ?? ''; } catch { return ''; } })();
        // An iframe starts on about:blank, which reports 'complete' before the real page loads.
        if (doc && doc.readyState === 'complete' && href && href !== 'about:blank') { resolve(); return; }
        iframe.addEventListener('load', () => resolve(), { once: true });
    });
}

/**
 * Connect to the renderer inside `iframe`. Resolves when the deep shader has compiled and
 * `window.__dz` exists; rejects with a readable message on a compile error or a 120 s timeout.
 */
/** A dive gives up after this long; the caller compares the depth and may dive again. */
const DIVE_TIMEOUT_MS = 45_000;
/** The core's fly keys, plus Escape: touching any of them takes the camera back from a dive. */
const DIVE_CANCEL_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'Escape',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export async function connectCore(iframe: HTMLIFrameElement): Promise<DzBridge> {
    await waitForLoad(iframe);
    const t0 = performance.now();

    const w = await new Promise<CoreWindow>((resolve, reject) => {
        const tick = () => {
            let win: CoreWindow | null = null;
            try { win = iframe.contentWindow as CoreWindow | null; } catch { win = null; }
            if (!win) { reject(new Error('The deep renderer frame is not reachable (not same-origin?).')); return; }
            let ready: unknown, err: unknown, dz: unknown;
            try { ready = win.__deepReady; err = win.__deepErr; dz = win.__dz; }
            catch { reject(new Error('The deep renderer frame is not reachable (not same-origin?).')); return; }
            if (ready === false && err) {
                reject(new Error('The deep renderer failed to compile: ' + String(err).slice(0, 400)));
                return;
            }
            if (ready === true && dz) { resolve(win); return; }
            if (performance.now() - t0 > CORE_READY_TIMEOUT_MS) {
                reject(new Error(
                    ready === undefined
                        ? 'The deep renderer did not start within 120 s (is deep-zoom-prototype-core/index.html present? run npm run sync:deep-zoom-prototype-core).'
                        : dz
                            ? 'The deep renderer did not finish compiling within 120 s.'
                            : 'The deep renderer is ready but has no __dz handle (the vendored core is older than the shell; run npm run sync:deep-zoom-prototype-core).',
                ));
                return;
            }
            window.setTimeout(tick, 100);
        };
        tick();
    });

    const dz = w.__dz;
    if (dz.version !== 1) {
        throw new Error(`The deep renderer speaks handle version ${String(dz.version)}; this shell needs version 1.`);
    }

    /** Bumped by every diveTo and setView; a running dive stops when it no longer holds the token. */
    let diveToken = 0;

    /** Call a loose core handle by name, with a named error if the vendored core lacks it. */
    const call = (name: string, ...args: unknown[]): any => {
        const fn = w[name];
        if (typeof fn !== 'function') throw new Error(`deep-zoom core is missing ${name}`);
        return fn(...args);
    };

    return {
        win: w,
        telemetry: () => dz.telemetry() as DzTelemetry,
        settings: () => dz.settings() as DzSettings,
        getView: () => dz.getView() as DzView,
        setView: (v) => { diveToken++; dz.setView(v); },   // a jump ends any dive in progress
        thumbnail: (size) => dz.thumbnail(size) as string,
        // The dive is flown from HERE, not by the core's own __dz.diveTo. The core's version catches up
        // with its schedule by moving 40-70% of the distance estimate in one frame; in deep mode that
        // estimate comes from a reference orbit with a bailout of 2 and can be well over the true
        // distance, so a dive from a starter view overshot by two decades or ran through the surface
        // (depth reads 0). Here every frame moves a small fixed share of the CURRENT estimate, so the
        // approach is exponential and cannot jump. It ends on arrival, on a fly key or Escape, on a newer
        // dive or setView, when the camera is inside (depth 0), or after DIVE_TIMEOUT_MS.
        diveTo: (depth) => new Promise<void>((resolve) => {
            const target = Math.max(1e-77, +depth || 1e-6);
            const id = ++diveToken;
            const read = (): number => {
                try { return Number((dz.telemetry() as DzTelemetry).depth); } catch { return NaN; }
            };
            const d0 = read();
            if (!(d0 > target)) { resolve(); return; }
            const decades = Math.max(1, Math.log10(d0 / target));
            const rate = (Math.LN10 * decades) / Math.min(40, Math.max(3, decades * 0.6));   // e-folds a second
            let cancelled = false;
            const onKey = (e: KeyboardEvent) => { if (DIVE_CANCEL_KEYS.has(e.code)) cancelled = true; };
            try { w.addEventListener('keydown', onKey); } catch { /* frame gone */ }
            const finish = () => {
                try { w.removeEventListener('keydown', onKey); } catch { /* frame gone */ }
                resolve();
            };
            const t0 = performance.now();
            let prev = t0;
            const step = () => {
                const now = performance.now();
                const d = read();
                if (cancelled || diveToken !== id || !(d > target) || now - t0 > DIVE_TIMEOUT_MS) { finish(); return; }
                const dt = Math.min(0.1, Math.max(0, (now - prev) / 1000));
                prev = now;
                const frac = Math.min(0.2, 1 - Math.exp(-rate * dt));
                const want = Math.min(d * frac, d - target * 0.95);
                if (want > 0) {
                    try {
                        const v = dz.getView() as DzView;
                        const cp = Math.cos(v.pitch);
                        call('__moveAlong', [cp * Math.cos(v.yaw), Math.sin(v.pitch), cp * Math.sin(v.yaw)], want);
                    } catch { finish(); return; }
                }
                w.requestAnimationFrame(step);
            };
            w.requestAnimationFrame(step);
        }),

        setMode: (m) => { call('__setMode', m); },
        setDetail: (x) => { call('__setSurf', x); },
        setReach: (k) => { call('__setReach', k); },
        setPower: (n) => { call('__setPower', n); },
        setPhase: (theta, phi) => { call('__setPhase', theta, phi); },
        setColor: (mode, scale) => { call('__setColor', mode, scale); },
        loadGradientFile: () => Promise.resolve(call('__loadGradientFile')),
        clearGradient: () => { call('__clearGradient'); },
        setLight: (mode, falloff) => { call('__setLight', mode, falloff); },
        // `__look` is the live settings object, not a function; hand out a copy.
        look: () => ({ ...(w.__look as DzLook) }),
        setLook: (p) => { call('__setLook', p); },
        setFrame: (px) => { call('__setFrame', px); },
        setAccum: (on) => { call('__setAccum', on); },

        recordToggle: () => !!call('__recordToggle'),
        recording: () => !!call('__recording'),
        lastPath: () => {
            // Copy the frames: the core reuses its recording array for the next take.
            const p = call('__lastPath') as DzPath;
            return { ...p, frames: p.frames.map((f) => ({ ...f })) };
        },
        smoothPath: (p, passes, alpha) => call('__smoothPath', p, passes, alpha) as DzPath,
        samplePath: (p, tSeconds) => { call('__samplePath', p, tSeconds); },
        playPath: (p, o) => Promise.resolve(call('__playPath', p, o)),
        stopPlay: () => { call('__stopPlay'); },

        renderPath: (p, o) => Promise.resolve(call('__renderPath', p, o)),
        exportStill: (longEdge, samples) => Promise.resolve(call('__export', longEdge, samples)),
        cancelRender: () => { call('__cancelRender'); },
        focus: () => {
            try { iframe.focus(); w.focus(); } catch { /* frame gone */ }
        },
    };
}
