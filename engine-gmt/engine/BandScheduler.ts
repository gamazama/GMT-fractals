/**
 * Tiled progressive idle renderer — band scheduler (M2).
 *
 * Splits the screen into N horizontal bands and hands out ONE band per render
 * tick (center-out order), so each frame's expensive trace is confined to a
 * fraction of the screen and the compositor can interleave UI paints between
 * frames. The whole screen advances one sample at a time, uniformly
 * ("coordinated accumulation"): every band in a pass uses the same
 * blend = 1/(passIndex+1), so when the cursor wraps, every pixel has received
 * exactly its (passIndex+1)-th sample — no per-band brightness seams.
 *
 * Consumed by FractalEngine.compute(), which drives RenderPipeline via:
 *   - uRegionMin/uRegionMax → the active band (the shader confines the trace to
 *     it and copies history forward elsewhere, keeping the buffer complete).
 *   - pipeline.setTiledBlend(blend) → pass-indexed temporal blend.
 *   - pipeline.accumulationCount = sampleCount → jitter index + sample-cap gate.
 *
 * See plans/tiled-progressive-rendering.md (§4, §5).
 */
export interface BandStep {
    /** Band bounds in UV (y0 < y1, full width). */
    y0: number;
    y1: number;
    /** Temporal blend for this sample (1.0 on the first pass, else 1/(pass+1)). */
    blend: number;
    /** Samples-per-pixel once this band is drawn (= passIndex + 1). */
    sampleCount: number;
}

/** Center-out visiting order for `n` bands (middle first, expanding outward). */
function centerOutOrder(n: number): number[] {
    const mid = (n - 1) / 2;
    return Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
}

export class BandScheduler {
    private passIndex = 0;
    private cursor = 0;
    private order: number[];
    private pendingNBands: number;

    constructor(private nBands = 24) {
        this.order = centerOutOrder(nBands);
        this.pendingNBands = nBands;
    }

    /** Bands the screen is currently split into. */
    get bandCount(): number { return this.nBands; }

    /**
     * Request a new band count (M5b adaptive sizing). Applied at the next pass
     * boundary (cursor 0) — NEVER mid-pass, or the pass would mix two band layouts
     * and leave gaps/overlaps where the old and new band edges don't line up. The
     * running mean is unaffected: every pass still covers every pixel exactly once
     * at a constant blend, regardless of how many bands that pass used.
     */
    setBandCount(n: number) {
        this.pendingNBands = Math.max(1, Math.min(64, Math.floor(n)));
    }

    /** Apply a pending band-count change. Only safe at a pass boundary. */
    private applyPending() {
        if (this.pendingNBands !== this.nBands) {
            this.nBands = this.pendingNBands;
            this.order = centerOutOrder(this.nBands);
        }
    }

    /** Restart from the first sample. Call whenever accumulation resets. */
    reset() {
        this.applyPending();
        this.passIndex = 0;
        this.cursor = 0;
    }

    /**
     * Resume tiling after a full-frame interlude (e.g. a display-only slider that
     * flipped the interaction signal off→on, standing tiling down for a few
     * frames). Those full-frame renders advanced the global sample count uniformly
     * over the WHOLE screen, so continue from there — start a fresh pass (cursor 0)
     * at that sample count instead of the frozen pre-interlude passIndex.
     *
     * This keeps the sample count MONOTONIC across the full-frame↔tiled transition,
     * which the adaptive accum-drop heuristic relies on: a backward jump in
     * accumulationCount reads as a buffer-invalidating gesture → phantom downscale →
     * resetAccumulation → full restart (the "every no-reset param restarts
     * accumulation" bug). Never moves passIndex backward.
     */
    resumeFrom(samples: number) {
        this.applyPending();
        this.passIndex = Math.max(this.passIndex, Math.floor(samples));
        this.cursor = 0;
    }

    /** Complete passes finished so far = samples every pixel already has. */
    get passCount(): number {
        return this.passIndex;
    }

    /**
     * Pick the next band and advance the cursor. All bands within a pass share
     * the same blend; passIndex only advances when the cursor wraps, so the
     * whole screen converges uniformly.
     */
    next(): BandStep {
        const band = this.order[this.cursor];
        const y0 = band / this.nBands;
        const y1 = (band + 1) / this.nBands;
        const sampleCount = this.passIndex + 1;
        const blend = 1.0 / sampleCount;

        this.cursor++;
        if (this.cursor >= this.nBands) {
            this.cursor = 0;
            this.passIndex++;
            this.applyPending(); // pass boundary — safe to re-layout the bands
        }
        return { y0, y1, blend, sampleCount };
    }
}
