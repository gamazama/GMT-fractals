/**
 * EXT_disjoint_timer_query_webgl2 wrapper for the Julia render pass.
 *
 * Async by design: a query opened this frame becomes readable a few
 * frames later. The engine wraps the Julia draw call with `begin()` /
 * `end()`; `poll()` runs once per frame after rendering to drain any
 * completed queries into the EWMA-smoothed `getMs()` reading.
 *
 * Optional — `EXT_disjoint_timer_query_webgl2` isn't on every WebGL2
 * driver (some mobile, privacy-conscious extension blocklists). When
 * absent, all methods are no-ops and `getMs()` stays 0.
 */

interface TimerExt {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
}

const RING_SIZE = 3;

export class GpuTimerManager {
    private ext: TimerExt | null;
    private queries: (WebGLQuery | null)[] = new Array(RING_SIZE).fill(null);
    private inFlight: boolean[] = new Array(RING_SIZE).fill(false);
    private cursor = 0;
    private msEwma = 0;
    private open = false;

    constructor(private gl: WebGL2RenderingContext) {
        this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
        if (this.ext) {
            for (let i = 0; i < RING_SIZE; i++) this.queries[i] = gl.createQuery();
        }
    }

    /** True when the GPU timer extension is available. */
    available(): boolean { return this.ext !== null; }

    /** Latest smoothed measurement in ms (0 when unavailable / no
     *  measurement yet). EWMA α = 0.2 — smooths but tracks workload
     *  changes in ~10 frames. */
    getMs(): number { return this.msEwma; }

    /** Open a timer query around the next draw call. No-op when the
     *  ext is missing or the previous query at this slot hasn't
     *  completed (skips rather than overwrite an in-flight result). */
    begin(): void {
        if (!this.ext || this.open) return;
        const slot = this.queries[this.cursor];
        if (!slot || this.inFlight[this.cursor]) return;
        this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, slot);
        this.open = true;
        this.inFlight[this.cursor] = true;
    }

    /** Close the open query and advance the ring cursor. */
    end(): void {
        if (!this.ext || !this.open) return;
        this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
        this.cursor = (this.cursor + 1) % RING_SIZE;
        this.open = false;
    }

    /** Drain any completed queries into the EWMA. Cheap when no
     *  queries are ready — just polls QUERY_RESULT_AVAILABLE. */
    poll(): void {
        if (!this.ext) return;
        const gl = this.gl;
        // GPU_DISJOINT signals a timing-disjoint event (e.g. throttle).
        // Discard all in-flight queries when it fires.
        if (gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
            for (let i = 0; i < RING_SIZE; i++) this.inFlight[i] = false;
            return;
        }
        for (let i = 0; i < RING_SIZE; i++) {
            if (!this.inFlight[i]) continue;
            const q = this.queries[i];
            if (!q) continue;
            const ready = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) as boolean;
            if (!ready) continue;
            const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
            const ms = ns / 1e6;
            this.msEwma = this.msEwma === 0 ? ms : (this.msEwma * 0.8 + ms * 0.2);
            this.inFlight[i] = false;
        }
    }

    dispose(): void {
        const gl = this.gl;
        for (const q of this.queries) {
            if (q) gl.deleteQuery(q);
        }
    }
}
