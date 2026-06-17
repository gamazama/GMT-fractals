/**
 * AccumulationController — generic protocol for any renderer that
 * accumulates samples over multiple frames (path tracers, fluid sims,
 * particle systems, progressive raymarchers).
 *
 * Engine-core's `renderControlSlice` carries the user-facing control
 * state (`isPaused`, `sampleCap`) and the readout (`accumulationCount`,
 * `convergenceValue`). This interface is what the slice binds TO — any
 * renderer plugin that satisfies it becomes drivable by the generic
 * UI / store / animation layers without bespoke wiring.
 *
 * Today this is implemented by:
 *   - engine/worker/WorkerProxy (engine-core stub: inert no-ops)
 *   - engine-gmt/engine/worker/WorkerProxy (real GMT worker bridge)
 *
 * A future fluid-sim accumulator or main-thread renderer would
 * implement the same shape and reuse `installAccumulationBindings`.
 */
export interface AccumulationController {
    /** Current sample count (frames accumulated since last reset). */
    readonly accumulationCount: number;

    /** Convergence estimate. Renderers without one may always return 1.
     *  Lower = more converged; threshold is set per-app. */
    readonly convergenceValue: number;

    /** Whether the renderer is currently held (no new samples added).
     *  Setting this should pause/resume immediately. */
    isPaused: boolean;

    /** Hard cap on accumulation. When `accumulationCount >= n` the
     *  renderer should stop adding samples. Use 0 / Infinity for uncapped.
     *
     *  Method name is historic ("preview" cap in GMT, where it gated the
     *  interactive viewport vs export rendering). The semantics today are
     *  generic: a sample cap that applies whenever the renderer is
     *  accumulating. Kept as-is to avoid a wide rename. */
    setPreviewSampleCap(n: number): void;

    /** Discard accumulated samples and start fresh on the next frame. */
    resetAccumulation(): void;
}
