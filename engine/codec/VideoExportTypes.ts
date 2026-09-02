/**
 * Render pass for multi-pass export.
 * - `beauty`: normal tone-mapped sRGB color (the default, single-pass content).
 * - `alpha`:  binary surface/sky mask derived from the HDR alpha channel (camera distance vs MAX_SKY_DISTANCE).
 * - `depth`:  linear camera distance normalized to [0,1] against MAX_SKY_DISTANCE, emitted as greyscale luminance.
 * The alpha/depth branches bypass tone mapping and feature color injections — see `shaders/chunks/post_process.ts`.
 */
export type ExportPass = 'beauty' | 'alpha' | 'depth';

/** Video export configuration — shared between WorkerProxy, WorkerProtocol, and WorkerExporter. */
export interface VideoExportConfig {
    width: number;
    height: number;
    /**
     * OUTPUT framerate — what the encoded file plays back at. This is NOT the
     * timeline's fps whenever `frameStep > 1`: callers pass `timelineFps / frameStep`
     * so a stepped export keeps its real-world duration instead of becoming a
     * time-lapse. Every consumer here wants the output rate (container framerate,
     * per-frame timestamp and duration), so the division belongs at the caller.
     *
     * @assumption Sample the TIMELINE at `timelineFps` and encode at
     *   `timelineFps / frameStep`. Getting this wrong desyncs audio: the mixer is
     *   given the full timeline span, so if the video is compressed N-fold the
     *   audio track is N× longer and drifts linearly from frame 0.
     */
    fps: number;
    bitrate: number;
    samples: number;
    startFrame: number;
    endFrame: number;
    /** Render every Nth timeline frame. A cost reduction for previews, not a speed ramp. */
    frameStep: number;
    formatIndex: number;
    internalScale?: number;
    /** VIDEO mode — which render pass to emit for this export invocation. Defaults to `beauty`.
     *  For video containers the main-thread pump runs `startExport` once per selected pass and
     *  saves each pass to its own file with a `_{pass}` suffix in the name. Ignored for image sequences. */
    pass?: ExportPass;
    /** IMAGE-SEQUENCE mode — all passes to emit in a single export session. The worker loops over
     *  these per frame and combines the outputs per the format rules (PNG: beauty+alpha → RGBA;
     *  JPG: one file per pass; depth is always a separate file). Ignored for video containers. */
    passes?: ExportPass[];
    /** Near clip for depth-pass normalization (world units). Defaults to 0. */
    depthMin?: number;
    /** Far clip for depth-pass normalization (world units). Defaults to 5. */
    depthMax?: number;
    /** Base filename for image-sequence output (without extension). Frame number is appended as
     *  `_0001`, `_0002`, …. Only used in image-sequence mode; video mode uses the save-picker name. */
    imageSequenceBaseName?: string;
}
