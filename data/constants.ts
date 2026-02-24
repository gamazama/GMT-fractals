
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

export const DEFAULT_PIPELINE_REVISION = 1;

// MP4 Export Configuration
export const VIDEO_CONFIG = {
    BITRATE_MULTIPLIER: 1_000_000, // Mbps to bps
    DEFAULT_BITRATE: 40, // 40 Mbps for high-detail fractals
    DEFAULT_SAMPLES: 16
};

export const VIDEO_FORMATS = [
    { label: 'MP4 (H.264) - Universal', container: 'mp4', codec: 'avc', ext: 'mp4', mime: 'video/mp4' },
    { label: 'MP4 (H.265/HEVC) - High Quality', container: 'mp4', codec: 'hevc', ext: 'mp4', mime: 'video/mp4' },
    { label: 'MP4 (AV1) - Best Compression', container: 'mp4', codec: 'av1', ext: 'mp4', mime: 'video/mp4' },
    { label: 'WebM (VP9) - Web Standard', container: 'webm', codec: 'vp9', ext: 'webm', mime: 'video/webm' },
];
