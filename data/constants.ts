
// Layout Constants
export const TIMELINE_SIDEBAR_WIDTH = 220;
export const TIMELINE_RULER_HEIGHT = 24;
export const TIMELINE_TRACK_HEIGHT = 32;
export const TIMELINE_GROUP_HEIGHT = 24;

export const GRAPH_RULER_HEIGHT = 24;
export const GRAPH_LEFT_GUTTER_WIDTH = 50;

// Engine Constants
export const FORMULA_ID_GENERIC = 0;
export const FORMULA_ID_MODULAR = 14;

export const MAX_MODULAR_PARAMS = 64;
export const MAX_LIGHTS = 8;

/** Default MAX_HARD_ITERATIONS for desktop GPUs — safety loop cap for ray/DE loops. */
export const DEFAULT_HARD_CAP = 2000;
/** Reduced loop cap for mobile GPUs to prevent GPU hangs. */
export const MOBILE_HARD_CAP = 256;

export const DEFAULT_PIPELINE_REVISION = 1;

/** Maximum valid depth — anything ≥ this is treated as a sky hit (no surface). */
export const MAX_SKY_DISTANCE = 50.0;

// MP4 Export Configuration
export const VIDEO_CONFIG = {
    BITRATE_MULTIPLIER: 1_000_000, // Mbps to bps
    DEFAULT_BITRATE: 40, // 40 Mbps for high-detail fractals
    DEFAULT_SAMPLES: 16
};

/**
 * Supported export formats.
 * - Video containers (`mp4`, `webm`) run one encoder per selected pass and produce one video file per pass.
 * - Image sequences (`png`, `jpg`) write individual frame files into a user-chosen directory. They're
 *   gated by the File System Access API (Chrome/Edge only). PNG combines beauty+alpha into RGBA when both
 *   passes are selected; JPG always emits a separate file per pass; depth is a separate file in both.
 */
export const VIDEO_FORMATS = [
    { label: 'MP4 (H.264) - Universal', container: 'mp4', codec: 'avc', ext: 'mp4', mime: 'video/mp4', imageSequence: false },
    { label: 'MP4 (H.265/HEVC) - High Quality', container: 'mp4', codec: 'hevc', ext: 'mp4', mime: 'video/mp4', imageSequence: false },
    { label: 'MP4 (AV1) - Best Compression', container: 'mp4', codec: 'av1', ext: 'mp4', mime: 'video/mp4', imageSequence: false },
    { label: 'WebM (VP9) - Web Standard', container: 'webm', codec: 'vp9', ext: 'webm', mime: 'video/webm', imageSequence: false },
    { label: 'PNG Sequence (RGBA)', container: 'png', codec: 'png', ext: 'png', mime: 'image/png', imageSequence: true },
    { label: 'JPG Sequence (per pass)', container: 'jpg', codec: 'jpg', ext: 'jpg', mime: 'image/jpeg', imageSequence: true },
];
