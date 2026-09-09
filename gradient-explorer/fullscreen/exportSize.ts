/**
 * exportSize — the PURE size arithmetic behind Wallpaper's "export at size" panel.
 *
 * Everything here is a plain function of its arguments: no DOM, no store, no canvas. The
 * overlay/compositor does the pixels; this module decides HOW MANY pixels, in which
 * orientation, at what supersample factor, and what the resulting file is called. Keeping
 * it separate is what makes the 4K cap testable on node in milliseconds
 * (`npm run test:gx-export`) instead of only observable by exporting a wallpaper.
 *
 * ── The size model ──────────────────────────────────────────────────────────────────────
 *   preset (or a custom W×H) → orientation swap → CLAMP to the 4K budget → the PNG size.
 *   The PNG size × the supersample factor → the RENDER size (what the compositor is asked
 *   for; it is downsampled back to the PNG size afterwards).
 *
 * ── The 4K cap (owner decision 2026-09-03: cap at 4K, no tiling) ────────────────────────
 * Two limits, both applied by ONE aspect-preserving scale so a clamped request keeps its
 * shape: no edge longer than {@link MAX_EXPORT_EDGE} (3840), and no more pixels than
 * {@link MAX_EXPORT_PIXELS} (3840×2160). Together they admit 4K in EITHER orientation
 * (3840×2160 and 2160×3840) plus the 2048² square preset, and clamp anything genuinely
 * larger. There is no tiled/bucket path — a request past the cap comes back smaller, and
 * the caller says so.
 *
 * Supersampling has its own, larger budget ({@link MAX_RENDER_PIXELS}): ×2 at 4K would be
 * 33 MPx of CPU error diffusion, so the factor DEGRADES to 1 rather than hanging the tab.
 * `supersampleDropped` reports that, so the panel can explain it instead of silently lying.
 *
 * @invariant `clampExportSize` returns, for EVERY finite input, a size with
 *   `width <= MAX_EXPORT_EDGE`, `height <= MAX_EXPORT_EDGE` and
 *   `width * height <= MAX_EXPORT_PIXELS` — and `resolveExportSize` never emits a plan
 *   whose PNG size breaks that or whose RENDER size exceeds `MAX_RENDER_PIXELS`.
 *   — proven by: `npm run test:gx-export` (section [2], "clamp: no output exceeds the 4K
 *   pixel budget", swept over ~2,600 shapes incl. every preset and both orientations).
 *   Falsified 2026-09-03 three ways, each reverted: dropping the pixel-budget term from the
 *   scale → 4 assertions red (51 sweep cases over budget, 16 plans), exit 1; `Math.round`
 *   instead of `Math.floor` on the quantisation → 1 red (20 cases rounding back over the
 *   budget); `canSupersample` returning true for 'ownCanvas' → 1 red in [3].
 *
 * @see plans/ge-v2-design.md §5.7 (Wallpaper — export at size)
 * @see gradient-explorer/fullscreen/exportRender.ts (the impure half: offscreen pixels)
 */

import type { FullscreenModeKind } from './modeRegistry';

// ── budgets ─────────────────────────────────────────────────────────────────────────────

/** Longest edge any exported wallpaper may have (4K's long edge). */
export const MAX_EXPORT_EDGE = 3840;
/** Pixel budget: one 4K frame. Caps square/odd aspects that slip under the edge limit. */
export const MAX_EXPORT_PIXELS = 3840 * 2160;
/** Render-side budget (pre-downsample). Chosen so ×2 supersampling stays available up to a
 *  2048² / 1080p export and degrades to ×1 at 4K rather than melting the main thread. */
export const MAX_RENDER_PIXELS = 16_777_216;
/** Smallest edge a size can clamp down to (a degenerate aspect must still be an image). */
export const MIN_EXPORT_EDGE = 16;

// ── presets ─────────────────────────────────────────────────────────────────────────────

export type ExportPresetId = 'phone' | 'square' | 'hd' | 'uhd' | 'custom';
export type ExportOrientation = 'landscape' | 'portrait';

export interface ExportSize {
  width: number;
  height: number;
}

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  /** `null` for `custom` — the caller supplies the numbers. */
  size: ExportSize | null;
}

/** The size presets, in panel order. Phone is a 19.5:9 handset (iPhone-class); Square is the
 *  social-post size; 1080p and 4K are the display sizes. Orientation is applied on top, so
 *  every preset is reachable in both. */
export const EXPORT_PRESETS: readonly ExportPreset[] = [
  { id: 'phone', label: 'Phone', size: { width: 1170, height: 2532 } },
  { id: 'square', label: 'Square', size: { width: 2048, height: 2048 } },
  { id: 'hd', label: '1080p', size: { width: 1920, height: 1080 } },
  { id: 'uhd', label: '4K', size: { width: 3840, height: 2160 } },
  { id: 'custom', label: 'Custom', size: null },
];

/** The preset a size id names (null for an unknown id). */
export const getExportPreset = (id: ExportPresetId): ExportPreset | null =>
  EXPORT_PRESETS.find((p) => p.id === id) ?? null;

/** The natural orientation of a preset's own numbers — the panel seeds its toggle from this
 *  so picking "Phone" lands portrait and "4K" lands landscape without a second click. */
export const naturalOrientation = (size: ExportSize): ExportOrientation =>
  size.height > size.width ? 'portrait' : 'landscape';

// ── the two pure operations ─────────────────────────────────────────────────────────────

/** Put a size into `orientation` by swapping its edges when they disagree. A square is
 *  unchanged either way. */
export const orientSize = (size: ExportSize, orientation: ExportOrientation): ExportSize => {
  const long = Math.max(size.width, size.height);
  const short = Math.min(size.width, size.height);
  return orientation === 'portrait'
    ? { width: short, height: long }
    : { width: long, height: short };
};

export interface ClampedSize extends ExportSize {
  /** True when the request did not fit the budget and was scaled down. */
  clamped: boolean;
}

/**
 * Fit a requested size inside the 4K budget, PRESERVING ASPECT (one scale on both edges).
 * Non-finite / sub-pixel inputs are coerced to {@link MIN_EXPORT_EDGE} first, so this never
 * returns NaN, 0, or a negative edge. `floor` (not round) does the final quantisation so the
 * result can never round back over a limit.
 *
 * See the file-header `@invariant` — this is the function it names.
 */
export const clampExportSize = (width: number, height: number): ClampedSize => {
  const w0 = Number.isFinite(width) ? Math.max(MIN_EXPORT_EDGE, Math.round(width)) : MIN_EXPORT_EDGE;
  const h0 = Number.isFinite(height) ? Math.max(MIN_EXPORT_EDGE, Math.round(height)) : MIN_EXPORT_EDGE;
  const scale = Math.min(
    1,
    MAX_EXPORT_EDGE / Math.max(w0, h0),
    Math.sqrt(MAX_EXPORT_PIXELS / (w0 * h0)),
  );
  if (scale >= 1) return { width: w0, height: h0, clamped: false };
  const w = Math.max(MIN_EXPORT_EDGE, Math.min(MAX_EXPORT_EDGE, Math.floor(w0 * scale)));
  const h = Math.max(MIN_EXPORT_EDGE, Math.min(MAX_EXPORT_EDGE, Math.floor(h0 * scale)));
  return { width: w, height: h, clamped: true };
};

/** Supersampling renders on the CPU and downsamples, so it only applies to the CPU kinds.
 *  A `glQuad` mode already renders at the requested resolution on the GPU and an `ownCanvas`
 *  mode owns its own pipeline — the panel greys the toggle out for both. */
export const canSupersample = (kind: FullscreenModeKind): boolean =>
  kind === 'cpuField' || kind === 'cpuRaster';

// ── the plan ────────────────────────────────────────────────────────────────────────────

export interface ExportSizeRequest {
  preset: ExportPresetId;
  /** Only read when `preset === 'custom'`. */
  customWidth: number;
  customHeight: number;
  orientation: ExportOrientation;
  /** The user's Supersample ×2 toggle (may be unavailable / dropped — see the plan). */
  supersample: boolean;
  /** The active mode's render kind. */
  kind: FullscreenModeKind;
}

export interface ExportSizePlan {
  /** The PNG's size — post-orientation, post-clamp. */
  width: number;
  height: number;
  /** What the renderer is asked for: the PNG size × {@link factor}. */
  renderWidth: number;
  renderHeight: number;
  /** 1 or 2. */
  factor: number;
  /** The requested size did not fit the 4K budget and was scaled down. */
  clamped: boolean;
  /** This mode kind can supersample at all. */
  supersampleAvailable: boolean;
  /** Supersample was asked for and available, but the render budget refused it. */
  supersampleDropped: boolean;
}

/** Resolve a panel state into the exact numbers the export path uses. Pure; the ONE place
 *  preset/orientation/clamp/supersample compose, so the readout in the panel and the pixels
 *  on disk can never disagree. */
export const resolveExportSize = (req: ExportSizeRequest): ExportSizePlan => {
  const preset = getExportPreset(req.preset);
  const requested: ExportSize =
    preset?.size ?? { width: req.customWidth, height: req.customHeight };
  const oriented = orientSize(
    {
      width: Number.isFinite(requested.width) ? requested.width : MIN_EXPORT_EDGE,
      height: Number.isFinite(requested.height) ? requested.height : MIN_EXPORT_EDGE,
    },
    req.orientation,
  );
  const { width, height, clamped } = clampExportSize(oriented.width, oriented.height);

  const supersampleAvailable = canSupersample(req.kind);
  const wants = req.supersample && supersampleAvailable;
  const fits = width * height * 4 <= MAX_RENDER_PIXELS;
  const factor = wants && fits ? 2 : 1;

  return {
    width,
    height,
    renderWidth: width * factor,
    renderHeight: height * factor,
    factor,
    clamped,
    supersampleAvailable,
    supersampleDropped: wants && !fits,
  };
};

// ── naming ──────────────────────────────────────────────────────────────────────────────

/** Filename stem from a gradient's display name: lowercase, spaces → dashes, nothing exotic
 *  left that a filesystem could object to. Falls back to `gradient` for an empty name. */
export const slugifyName = (name: string): string => {
  const slug = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'gradient';
};

/** `{stem}-{mode}-{w}x{h}.png` — the size is in the name because a mode may render SMALLER
 *  than asked (see `readPngSize`: the caller names the file from the real pixels, not the
 *  request), and a folder of wallpapers is unusable without the size on the file. */
export const exportFileName = (
  name: string,
  modeId: string,
  width: number,
  height: number,
): string => `${slugifyName(name)}-${modeId}-${Math.round(width)}x${Math.round(height)}.png`;

// ── PNG introspection ───────────────────────────────────────────────────────────────────

/**
 * Read a PNG's true pixel size out of its IHDR header — the first 24 bytes are enough.
 *
 * Why the export path needs this: a mode's `renderAt` may legitimately produce FEWER pixels
 * than asked (the Fractal renderer caps its own buffer at 1600 px on the long edge). Rather
 * than trusting the request, the caller reads the size back off the finished PNG, so the
 * filename and the "Exported W×H" toast always describe the file that actually landed.
 *
 * Returns null when the bytes are not a PNG (or the header is truncated).
 */
export const readPngSize = (bytes: Uint8Array): ExportSize | null => {
  if (bytes.length < 24) return null;
  // 8-byte signature: 137 P N G \r \n 26 \n
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) return null;
  // Bytes 12..15 must spell IHDR (the first chunk type).
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) return null;
  const be32 = (o: number): number =>
    ((bytes[o] << 24) >>> 0) + (bytes[o + 1] << 16) + (bytes[o + 2] << 8) + bytes[o + 3];
  const width = be32(16);
  const height = be32(20);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
};
