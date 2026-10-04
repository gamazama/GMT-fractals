/**
 * framePerf — the render worker's opt-in frame-cost probe.
 *
 * The main thread cannot see what a frame costs: it dispatches RENDER_TICKs and
 * counts FRAME_READYs, and both of those are cadences, not costs. This module
 * is the worker-side half — it measures the frame where the frame happens and
 * posts one `PERF_STATS` summary per second while enabled.
 *
 * It replaces the compile-time `DEBUG_FRAME_TIMING` block that used to live in
 * `handleRenderTick.ts` (source edit to enable, worker console only), so a
 * harness or the `?perf` probe can read the same numbers without a rebuild.
 *
 * WHAT EACH NUMBER MEANS
 *   gpuMs    GPU time for the whole frame (trace + bloom + display blit), from
 *            `EXT_disjoint_timer_query_webgl2` TIME_ELAPSED queries. This is
 *            the continuous cost figure. On ANGLE/D3D11 it is wall time between
 *            two points in this context's command stream, so GPU work another
 *            process interleaves shows up in it too — which is what a
 *            contention hunt wants. Absent (count 0) where the extension is.
 *   gpuTraceMs / gpuPostMs  the same frame split in two back-to-back queries:
 *            `engine.compute()` (the trace) and everything after it (bloom +
 *            display blit). gpuMs is their sum per frame.
 *   fenceMs  submit → fence-signalled, as OBSERVED by the frames-in-flight
 *            gate. Polled, so it rounds UP to the next poll (see the retry
 *            timer in `renderWorker.ts`); it bounds how long the gate held the
 *            next frame back, it is not a cost.
 *   gapMs    time between successive RENDERED ticks — the achieved cadence.
 *   cpuMs    worker CPU inside one rendered tick, entry → return.
 *   computeMs  the `engine.compute()` part of that (CPU submit only; the GPU
 *            runs async).
 *   phaseMs  mean CPU per rendered tick in each stage — `update`
 *            (engine.update: uniform sync, adaptive, resize), `compute`,
 *            `display` (bloom + blit + flush) and `readback` (depth probe).
 *            A stage that suddenly costs milliseconds is a GPU sync point:
 *            the call blocked until the driver caught up.
 *   traceArea  mean fraction of the screen the trace covered (the render
 *            region, 1 = full frame). Progressive tiling renders one band per
 *            tick, so a "frame" there is a fraction of an image — and its
 *            gpuMs is that fraction of a full frame's. Read gpuMs with this
 *            beside it, or a band reads as a mysteriously cheap frame.
 *   heldFrames  ticks where the pipeline was holding (no trace at all, the
 *            previous image re-blitted).
 *   skips    gate polls that found the GPU still busy and rendered nothing.
 *   msgs     messages received by type, and `msgCpuMs`, the CPU spent handling
 *            them — the per-frame UNIFORM traffic of a modulated scene lands
 *            here.
 *
 * READING IT (the diagnosis the old block's comment carried):
 *   gapMs + computeMs both low-variance → the worker renders uniformly; judder
 *     is a PRESENTATION beat against vsync.
 *   computeMs variance high → the trace itself stalls (GPU command-queue
 *     back-pressure under ANGLE, or GC).
 *   gapMs variance high, computeMs flat → the wait BETWEEN ticks varies
 *     (dispatch / present back-pressure).
 *   gpuMs flat while frames/s drops → the gate or the dispatch is pacing, not
 *     the GPU.
 *
 * @see docs/adr/0131-nothing-on-the-page-repaints-every-frame.md
 *
 * @assumption Zero cost when off. Every call site is guarded by `framePerf.on`
 *   (one boolean read); nothing is allocated, no query is created and no
 *   message is posted until `setEnabled(true)`.
 * @assumption Only one TIME_ELAPSED query is ever active, and nothing else in
 *   the worker issues timer queries (three.js does not). `gpuBegin` closes a
 *   query a thrown frame left open rather than nesting one.
 */

/** One series, summarised. All values in ms. */
export interface PerfSeries { n: number; mean: number; p50: number; p95: number; max: number }

export interface WorkerPerfStats {
    /** Length of the window these numbers cover, ms. */
    windowMs: number;
    frames: number;
    skips: number;
    /** Mean traced fraction of the screen per rendered tick (1 = full frame). */
    traceArea: number;
    /** Rendered ticks on which the pipeline was holding (nothing traced). */
    heldFrames: number;
    /** Mean internal render-target megapixels per rendered tick. Adaptive
     *  resolution moves the target between ticks; `renderW`/`renderH` below are
     *  one sample at flush time and can miss that entirely. */
    meanMP: number;
    /** Rendered ticks on which progressive tiling owned the region. */
    tiledFrames: number;
    /** Rendered ticks the worker saw `isSceneAnimating` on. A scene that is
     *  being modulated must read frames == animatingFrames and tiledFrames 0;
     *  anything else means bands are being painted from different moments. */
    animatingFrames: number;
    /** Rendered ticks that left the sample count where it was — the display
     *  pass ran but nothing was traced (holding, capped, or skipped). */
    untracedFrames: number;
    /** Rendered ticks that ADDED a sample onto existing history rather than
     *  starting fresh. While something is modulated every one of these blends
     *  two different moments of the scene into one image. */
    blendedFrames: number;
    gapMs: PerfSeries;
    cpuMs: PerfSeries;
    computeMs: PerfSeries;
    /** Mean CPU ms per rendered tick, by stage. */
    phaseMs: { update: number; compute: number; display: number; readback: number };
    fenceMs: PerfSeries;
    gpuMs: PerfSeries;
    /** The trace half of gpuMs — `engine.compute()`. */
    gpuTraceMs: PerfSeries;
    /** The rest of gpuMs — bloom + display blit. */
    gpuPostMs: PerfSeries;
    /** Timer-query results discarded because the GPU reported a disjoint
     *  event (context switch / throttle) — they are not trustworthy. */
    gpuDisjoint: number;
    /** False when `EXT_disjoint_timer_query_webgl2` is unavailable. */
    gpuTimerAvailable: boolean;
    msgs: Record<string, number>;
    msgCpuMs: number;
    /** Internal render-target size at flush time (adaptive resolution moves it). */
    renderW: number;
    renderH: number;
    accumulationCount: number;
}

const EMPTY: PerfSeries = { n: 0, mean: 0, p50: 0, p95: 0, max: 0 };

function summarise(a: number[]): PerfSeries {
    const n = a.length;
    if (!n) return EMPTY;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += a[i];
    const s = a.slice().sort((x, y) => x - y);
    const q = (p: number) => s[Math.min(n - 1, Math.floor(p * n))];
    return { n, mean: sum / n, p50: q(0.5), p95: q(0.95), max: s[n - 1] };
}

type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

class FramePerf {
    /** The one flag every call site reads. */
    public on = false;

    private gap: number[] = [];
    private cpu: number[] = [];
    private compute: number[] = [];
    private fence: number[] = [];
    private gpu: number[] = [];
    private gpuTrace: number[] = [];
    private gpuPost: number[] = [];
    private frames = 0;
    private skips = 0;
    private traceAreaSum = 0;
    private held = 0;
    private mpSum = 0;
    private tiled = 0;
    private animating = 0;
    private untraced = 0;
    private blended = 0;
    private disjoint = 0;
    private msgs: Record<string, number> = {};
    private msgCpuMs = 0;
    private phase = { update: 0, compute: 0, display: 0, readback: 0 };
    private lastEntry = 0;
    private windowStart = 0;

    /** undefined = not probed yet, null = extension unavailable. */
    private ext: TimerExt | null | undefined = undefined;
    private active: WebGLQuery | null = null;
    private activeTag: 'trace' | 'post' = 'trace';
    private pending: { q: WebGLQuery; tag: 'trace' | 'post' }[] = [];
    /** Trace ms of the frame whose post query is still outstanding. */
    private traceHeld = -1;

    public setEnabled(on: boolean): void {
        if (on === this.on) return;
        this.on = on;
        this.resetWindow();
        this.lastEntry = 0;
        // Drop query handles without GL calls: the context they belong to may
        // be gone, and a leaked handful of queries is harmless.
        this.active = null;
        this.pending.length = 0;
        this.ext = undefined;
    }

    private resetWindow(): void {
        this.gap.length = 0; this.cpu.length = 0; this.compute.length = 0;
        this.fence.length = 0; this.gpu.length = 0; this.gpuTrace.length = 0; this.gpuPost.length = 0;
        this.frames = 0; this.skips = 0; this.disjoint = 0;
        this.traceAreaSum = 0; this.held = 0; this.mpSum = 0; this.tiled = 0; this.animating = 0; this.untraced = 0; this.blended = 0;
        this.msgs = {}; this.msgCpuMs = 0;
        this.phase = { update: 0, compute: 0, display: 0, readback: 0 };
        this.windowStart = performance.now();
    }

    public noteSkip(): void { this.skips++; }
    public noteTrace(area: number, holding: boolean, pixels: number, tiling: boolean, animating: boolean,
                     accumBefore: number, accumAfter: number): void {
        this.traceAreaSum += area; if (holding) this.held++; this.mpSum += pixels / 1e6;
        if (tiling) this.tiled++;
        if (animating) this.animating++;
        // A tick that advanced the sample count traced; one that left it alone did not.
        if (accumAfter === accumBefore) this.untraced++;
        if (accumBefore > 0 && accumAfter > accumBefore) this.blended++;
    }
    public notePhase(name: 'update' | 'compute' | 'display' | 'readback', ms: number): void { this.phase[name] += ms; }
    public noteFence(ms: number): void { this.fence.push(ms); }
    public noteMessage(type: string, ms: number): void {
        this.msgs[type] = (this.msgs[type] ?? 0) + 1;
        this.msgCpuMs += ms;
    }

    /** A tick that rendered: entry timestamp, compute ms, and now. */
    public noteFrame(entry: number, computeMs: number): void {
        const now = performance.now();
        if (this.lastEntry > 0) this.gap.push(entry - this.lastEntry);
        this.lastEntry = entry;
        this.compute.push(computeMs);
        this.cpu.push(now - entry);
        this.frames++;
    }

    // ── GPU timer query ─────────────────────────────────────────────────────

    public gpuBegin(gl: WebGL2RenderingContext): void {
        try {
            if (this.ext === undefined) {
                this.ext = (gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null) ?? null;
            }
            const ext = this.ext;
            if (!ext) return;
            // A frame that threw between begin and end leaves a query open;
            // close it rather than nest (nesting is INVALID_OPERATION).
            if (this.active) { gl.endQuery(ext.TIME_ELAPSED_EXT); this.pending.push({ q: this.active, tag: this.activeTag }); this.active = null; }
            // Results arrive a frame or two late. If they have stopped arriving
            // (lost context), stop issuing rather than grow without bound.
            if (this.pending.length > 16) return;
            const q = gl.createQuery();
            if (!q) return;
            gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            this.active = q;
            this.activeTag = 'trace';
        } catch { this.active = null; }
    }

    /** End the trace query and start the post one. Back-to-back, never nested. */
    public gpuMark(gl: WebGL2RenderingContext): void {
        const ext = this.ext;
        if (!ext || !this.active || this.activeTag !== 'trace') return;
        try {
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            this.pending.push({ q: this.active, tag: 'trace' });
            this.active = null;
            const q = gl.createQuery();
            if (!q) return;
            gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            this.active = q;
            this.activeTag = 'post';
        } catch { this.active = null; }
    }

    public gpuEnd(gl: WebGL2RenderingContext): void {
        const ext = this.ext;
        if (!ext || !this.active) return;
        try { gl.endQuery(ext.TIME_ELAPSED_EXT); this.pending.push({ q: this.active, tag: this.activeTag }); } catch { /* dead context */ }
        this.active = null;
    }

    /** Collect any finished queries. Cheap; call once per tick or poll. */
    public gpuPoll(gl: WebGL2RenderingContext): void {
        const ext = this.ext;
        if (!ext) return;
        try {
            while (this.pending.length) {
                const { q, tag } = this.pending[0];
                if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
                const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
                const ms = (gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6;
                gl.deleteQuery(q);
                this.pending.shift();
                if (disjoint) { this.disjoint++; if (tag === 'trace') this.traceHeld = -1; continue; }
                // Queries complete in order, so a frame's trace result always
                // lands before its post result.
                if (tag === 'trace') { this.gpuTrace.push(ms); this.traceHeld = ms; }
                else {
                    this.gpuPost.push(ms);
                    if (this.traceHeld >= 0) this.gpu.push(this.traceHeld + ms);
                    this.traceHeld = -1;
                }
            }
        } catch { this.pending.length = 0; this.traceHeld = -1; }
    }

    // ── Flush ───────────────────────────────────────────────────────────────

    /** Build the window's summary and start a new window. */
    public take(renderW: number, renderH: number, accumulationCount: number): WorkerPerfStats {
        const now = performance.now();
        const stats: WorkerPerfStats = {
            windowMs: now - this.windowStart,
            frames: this.frames,
            skips: this.skips,
            traceArea: this.frames ? this.traceAreaSum / this.frames : 0,
            heldFrames: this.held,
            meanMP: this.frames ? this.mpSum / this.frames : 0,
            tiledFrames: this.tiled,
            animatingFrames: this.animating,
            untracedFrames: this.untraced,
            blendedFrames: this.blended,
            gapMs: summarise(this.gap),
            cpuMs: summarise(this.cpu),
            computeMs: summarise(this.compute),
            phaseMs: {
                update: this.phase.update / (this.frames || 1), compute: this.phase.compute / (this.frames || 1),
                display: this.phase.display / (this.frames || 1), readback: this.phase.readback / (this.frames || 1),
            },
            fenceMs: summarise(this.fence),
            gpuMs: summarise(this.gpu),
            gpuTraceMs: summarise(this.gpuTrace),
            gpuPostMs: summarise(this.gpuPost),
            gpuDisjoint: this.disjoint,
            gpuTimerAvailable: !!this.ext,
            msgs: this.msgs,
            msgCpuMs: this.msgCpuMs,
            renderW, renderH, accumulationCount,
        };
        this.resetWindow();
        return stats;
    }
}

export const framePerf = new FramePerf();
