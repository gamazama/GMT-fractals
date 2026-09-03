/**
 * perfProbe — the `?perf` diagnostic for "why is the frame rate half of what it
 * should be". One line per second in the console, mirrored in a corner readout,
 * kept in `window.__perfProbe.log` (last 120 s) with `copy()` for pasting.
 *
 * Built for the open 30-fps-while-focused report (`@bug PRODUCTION` on
 * `connectSystemAudio` in engine/features/audioMod/AudioTransport.ts). The
 * worker renders only on RENDER_TICK from the main-thread frame loop, and the
 * hover pre-pick (Navigation.tsx) forces a GPU readback on the worker, so
 * "30 fps" can come from at least three different places. Each line splits
 * them apart:
 *
 *   focus / over   document.hasFocus(), pointer over the canvas — the two
 *                  conditions the report correlated with
 *   audio          live input kind (none / mic / system) and whether the
 *                  worklet currently sees signal
 *   raf N/s        how often the main thread's rAF ran; gap p50 / p95 / max
 *                  say whether it is evenly 60 or stuttering
 *   long N/s max   PerformanceObserver long tasks (>50 ms) on the main thread
 *   ticks N/s      RENDER_TICKs actually dispatched to the worker
 *   frames N/s     FRAME_READYs delivered back (proxy.frameCount delta)
 *   picks N/s lat  hover pre-picks issued and their mean round-trip
 *
 * Reading it: raf 60 + ticks 60 + frames 30 → the WORKER is the bottleneck
 * (GPU-bound, or blocked by readbacks — look at picks). raf 30 → the MAIN
 * THREAD is (long tasks name the culprit's size). ticks 30 with raf 60 → the
 * convergence gate or the yield branch is skipping dispatches on purpose.
 *
 * Zero cost when the flag is absent: nothing is imported or installed
 * (app-gmt/main.tsx loads this module only on `?perf`).
 *
 * @bug PRODUCTION: the probe itself lowered the frame rate on the owner's
 *   machine (2026-09-02), which taints its own readings. Not measured, but
 *   the two things it did per second that the app does not are a console
 *   line (expensive with DevTools open) and a `position: fixed` readout over
 *   the canvas (a compositor layer that can cost the canvas its direct
 *   scanout path on Windows). Both are now opt-in: `?perf` collects silently
 *   into `window.__perfProbe.log` and prints a summary every 10 s;
 *   `?perf=live` restores the per-second line and the overlay. If `?perf`
 *   alone still costs frames, the remaining per-frame work is the rAF gap
 *   sampler and the two wrapped methods, and the profiling session should
 *   start by measuring with the probe off.
 */
import { isMouseOverCanvas } from '../../engine/worker/ViewportRefs';
import { audioAnalysisEngine } from '../../engine/features/audioMod/AudioAnalysisEngine';

interface ProbeHandle { log: string[]; copy: () => Promise<void> | void; stop: () => void }

/**
 * @param proxy the live render proxy (`getProxy()` after the renderer is
 *   installed). Typed loosely on purpose: the probe wraps two methods on the
 *   instance and reads `frameCount`, and the engine-core stub / engine-gmt
 *   real proxy split makes a shared static type more trouble than it is worth
 *   for a diagnostic.
 */
export function installPerfProbe(proxy: any, opts: { live?: boolean } = {}): ProbeHandle {
    const live = !!opts.live;
    // ── counters reset every second ──
    let ticks = 0;
    let picks = 0, pickDone = 0, pickLatSum = 0;
    let longTasks = 0, longMax = 0;
    const gaps: number[] = [];

    // Wrap dispatch + pick on the instance so every caller is counted.
    const origTick = proxy.sendRenderTick.bind(proxy);
    proxy.sendRenderTick = (...args: unknown[]) => { ticks++; return origTick(...args); };
    const origPick = proxy.pickWorldPosition.bind(proxy);
    proxy.pickWorldPosition = (...args: unknown[]) => {
        picks++;
        const t0 = performance.now();
        const r = origPick(...args);
        if (r && typeof (r as Promise<unknown>).then === 'function') {
            (r as Promise<unknown>).then(() => { pickDone++; pickLatSum += performance.now() - t0; }, () => { pickDone++; });
        }
        return r;
    };

    // Independent rAF loop: measures the main thread's frame cadence even if
    // the tick driver is not mounted.
    let last = performance.now();
    let rafId = 0;
    const loop = (t: number) => { gaps.push(t - last); last = t; rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);

    let observer: PerformanceObserver | null = null;
    try {
        observer = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) { longTasks++; longMax = Math.max(longMax, e.duration); }
        });
        observer.observe({ type: 'longtask', buffered: false });
    } catch { observer = null; }

    // Corner readout — only in live mode (see the @bug above): a fixed layer
    // over the canvas is itself a compositor cost.
    let el: HTMLDivElement | null = null;
    if (live) {
        el = document.createElement('div');
        el.setAttribute('data-perf-probe', '');
        Object.assign(el.style, {
            position: 'fixed', left: '8px', bottom: '8px', zIndex: '99999', pointerEvents: 'none',
            font: '11px/1.4 ui-monospace, Consolas, monospace', color: '#e6e8ee',
            background: 'rgba(11,13,18,0.85)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'pre',
        } as Partial<CSSStyleDeclaration>);
        document.body.appendChild(el);
    }
    let seconds = 0;

    let lastFrames = Number(proxy.frameCount ?? 0);
    const log: string[] = [];
    const timer = setInterval(() => {
        const sorted = [...gaps].sort((a, b) => a - b);
        const q = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);
        const frameCount = Number(proxy.frameCount ?? 0);
        const frames = Math.max(0, frameCount - lastFrames);
        lastFrames = frameCount;
        let audio = 'none';
        try { audio = `${audioAnalysisEngine.inputKind}${audioAnalysisEngine.hasSignal() ? '+sig' : ''}`; } catch { /* audio not initialised */ }
        const line =
            `focus=${document.hasFocus() ? 1 : 0} over=${isMouseOverCanvas() ? 1 : 0} audio=${audio} ` +
            `raf=${gaps.length}/s gap p50=${q(0.5).toFixed(1)} p95=${q(0.95).toFixed(1)} max=${(sorted[sorted.length - 1] ?? 0).toFixed(1)}ms ` +
            `long=${longTasks}/s max=${longMax.toFixed(0)}ms ticks=${ticks}/s frames=${frames}/s ` +
            `picks=${picks}/s lat=${pickDone ? (pickLatSum / pickDone).toFixed(1) : '-'}ms`;
        log.push(`${new Date().toISOString().slice(11, 19)} ${line}`);
        if (log.length > 120) log.shift();
        seconds++;
        // Quiet by default: one console line per 10 s (the last second's
        // reading); live mode prints every second and updates the overlay.
        if (live || seconds % 10 === 0) console.log('[perf] ' + line);
        if (el) el.textContent = line.replace(/ (raf|long|ticks|picks)=/g, '\n$1=');
        gaps.length = 0; ticks = 0; picks = 0; pickDone = 0; pickLatSum = 0; longTasks = 0; longMax = 0;
    }, 1000);

    const stop = () => {
        clearInterval(timer);
        cancelAnimationFrame(rafId);
        observer?.disconnect();
        el?.remove();
        proxy.sendRenderTick = origTick;
        proxy.pickWorldPosition = origPick;
        delete (window as any).__perfProbe;
    };
    const handle: ProbeHandle = {
        log,
        copy: () => navigator.clipboard?.writeText(log.join('\n')),
        stop,
    };
    (window as any).__perfProbe = handle;
    console.log(live
        ? '[perf] probe armed (live) — one line per second + overlay; window.__perfProbe.copy() puts the last 120 s on the clipboard'
        : '[perf] probe armed (quiet) — sampling every second, printing every 10 s; window.__perfProbe.copy() puts the last 120 s on the clipboard; ?perf=live for per-second output');
    return handle;
}
