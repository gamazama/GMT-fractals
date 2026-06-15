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

    constructor(private nBands = 24) {
        this.order = centerOutOrder(nBands);
    }

    /** Restart from the first sample. Call whenever accumulation resets. */
    reset() {
        this.passIndex = 0;
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
        }
        return { y0, y1, blend, sampleCount };
    }
}
