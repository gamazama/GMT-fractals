/**
 * Tunable numeric constants for the toy. Every "magic number" that controls
 * feel / thresholds / bounds should live here so the behaviour surface is
 * audit-friendly in one place.
 */

// ── Viewport / camera ────────────────────────────────────────────────────────
/** Deepest zoom reachable via scroll-wheel, middle-drag, and the Zoom slider. */
export const MIN_ZOOM = 0.00001;
export const MAX_ZOOM = 8;

// ── Pointer interaction ──────────────────────────────────────────────────────
/** Minimum cursor travel (in pixels) before a right-click press is treated as a
 *  drag-to-pan rather than a tap-to-open-menu. */
export const PAN_DRAG_THRESHOLD_PX = 5;

/** Wheel deltaY multiplier for zoom. Smaller = gentler zoom per tick. */
export const WHEEL_ZOOM_SENSITIVITY = 0.002;

/** Middle-click vertical-drag deltaY multiplier for smooth zoom. */
export const MIDDLE_DRAG_ZOOM_SENSITIVITY = 0.005;

/** Shift precision multiplier (5× coarser) — matches GMT's convention. */
export const PRECISION_SHIFT_MULT = 5.0;

/** Alt precision multiplier (0.2× finer) — matches GMT's convention. */
export const PRECISION_ALT_MULT = 0.2;

/** Mouse-drag splat: gaussian radius in UV-squared units. */
export const SPLAT_RADIUS_UV = 0.002;

// ── Rendering ────────────────────────────────────────────────────────────────
/** 1D LUT width for the gradient texture (256 × 1 RGBA). */
export const GRADIENT_LUT_WIDTH = 256;

/** Bloom extract soft-knee above threshold — controls feather width. */
export const BLOOM_SOFT_KNEE = 0.5;

// ── Default orbit state (used before any preset has assigned one) ───────────
export const DEFAULT_ORBIT = { enabled: false, radius: 0.02, speed: 0.4 };

// ── Preset submission (Option C v1) ──────────────────────────────────────────
/**
 * Backend endpoint for community preset submissions. Set when the
 * gmt-gallery-backend route is live; leave `null` to keep the Submit feature
 * gracefully disabled (the modal will show a "not yet enabled" message and
 * point the user to Save PNG + send manually).
 *
 * Wire contract (POST, multipart/form-data):
 *   state  : JSON string — full SavedState from savedState.ts
 *   image  : file        — PNG of the canvas (≤ 2 MB)
 *   name   : string      — user-chosen preset name (1–60 chars)
 *   author : string?     — optional alias (≤ 60 chars)
 *   notes  : string?     — optional description (≤ 500 chars)
 *
 * Response (200): { ok: true, id: string }
 * Response (400 / 429 / 5xx): { ok: false, error: string }
 */
export const PRESET_SUBMIT_ENDPOINT: string | null = null;

/** Minimum seconds between submissions from the same browser (client-side throttle). */
export const PRESET_SUBMIT_COOLDOWN_SEC = 30;

/** Upper bound on the PNG we send (matches typical backend limits). */
export const PRESET_SUBMIT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
