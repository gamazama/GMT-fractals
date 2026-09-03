/**
 * modeRegistry — the FROZEN mode plug-in seam for the fullscreen gradient overlay.
 *
 * A "fullscreen mode" is a self-contained way to render the active gradient full-bleed.
 * Shipped today, in selector order (grep `registerFullscreenMode` in `modes/index.ts` —
 * that file is the ground truth, not this list): Linear / Radial / Conic / Arched
 * (cpuField) · Spline (glQuad) · Fractal / Liquify / Parallax (ownCanvas) ·
 * Gradient map (cpuRaster).
 * The overlay dispatches PURELY on this registry: it never hard-codes a mode.
 * A new mode is added by calling {@link registerFullscreenMode} from its own module — no
 * edit to the overlay core — so the parallel mode streams don't collide.
 *
 * ── A mode declares three things (the seam's three faces) ───────────────────────────────
 *   (a) PARAMS  — `paramFields`: which flat-optional `GeometryParams` fields it reads, with
 *                 UI metadata. Threads through the GATE shape (palette/core/rampGeometry).
 *   (b) RENDER  — ONE of the four `FullscreenModeKind`s:
 *        • 'cpuField'  — a pure `field(ctx) → {pos, cov}` producer (see GeometryField). The
 *          harness samples the LUT at the FLOAT position and error-diffusion-dithers before
 *          the 8-bit write. THIS is what the four geometry modes use, and it is the right
 *          kind for anything that maps a 1D gradient across a 2D field.
 *        • 'cpuRaster' — a pure `raster(ctx) → RGBA` producer, uploaded and presented
 *          through the shared dither tail. Pre-quantises to 8-bit, so the dither cannot
 *          recover banding — only for modes that genuinely own their pixels (an imported
 *          image). ONE mode uses it since 2026-09-03: `gradientMap`, which recolours the
 *          Extract image through the ramp. For gradient-over-position modes prefer 'cpuField'.
 *        • 'glQuad'    — a fragment `fragBody` defining `vec3 modeColor(vec2 uv)`. The
 *          harness wraps it (standard preamble + `sampleLut` + dither tail), compiles once,
 *          and renders a fullscreen quad. Reads the gradient via `uLut`. Extra uniforms via
 *          `fragUniforms` + `uniformNames` + `setUniforms`. (Spline.)
 *        • 'ownCanvas' — the escape hatch: the mode mounts + drives its OWN canvas/renderer/
 *          RAF (Fractal, Liquify, Parallax — all three need custom GL or a CPU sim). It
 *          bypasses the compositor and bakes its own dither (include `DITHER_TAIL_GLSL` in
 *          its display shader if it bands).
 *   (c) CONTROLS — `Controls`: a self-contained React panel (reads the store + registry).
 *
 * ── Contracts (FROZEN — parallel sessions rely on these) ────────────────────────────────
 * All four are `@assumption`, not `@invariant`: no command in the repo goes red if a new
 * mode breaks one. Read that as a standing worklist, not as reassurance.
 *
 * @assumption `id` is the stable mode key persisted in `fullscreenStore.geom` and used in
 *   export filenames (`{stem}-{id}.png`). Renaming a shipped id silently orphans saved
 *   state; nothing detects it.
 * @assumption cpuField `field` / cpuRaster `raster` stay pure + deterministic; side
 *   effects / RAF / DOM belong in 'ownCanvas'. Note what IS pinned and what is not:
 *   `debug/test-palette-rampgeometry.mts` (in the `test:palette` chain) renders every
 *   geometry twice and asserts byte-identical output — grep
 *   `identical inputs → byte-identical output`. But it calls `renderGeometry` in
 *   palette/core DIRECTLY, never through a registered mode, so it pins `sampleGeometry`
 *   and only covers today's geometry modes because their `field` is a bare delegation to
 *   it. A mode whose own `field` body pulled in Math.random or a frame counter would pass
 *   that harness untouched. Nothing pins cpuRaster at all: `gradientMap`'s `raster` is
 *   deterministic for a given (image, ctx) but reads the image from `palette/store/imageStore`
 *   rather than from `ctx` — see its own `@assumption`, which is the honest statement of that
 *   deviation. The seam carries no image channel.
 * @assumption A mode reads gradient data ONLY from `ctx` (never the store directly) so the
 *   same mode renders correctly for the snapshot (fullscreen) AND the live hero (split)
 *   source. Reaching into the store instead still renders in fullscreen, which is why this
 *   one breaks quietly — in split only.
 * @assumption `setUniforms` does not touch the reserved preamble uniforms (see ditherTail.ts).
 *
 * @see gradient-explorer/fullscreen/modes/index.ts  (which modes are registered, in order)
 * @see gradient-explorer/fullscreen/ditherTail.ts   (the wrapper + shared dither tail)
 * @see gradient-explorer/fullscreen/FullscreenCompositor.ts (compiles + presents)
 * @see palette/core/rampGeometry.ts                  (the flat-optional GeometryParams gate)
 */

import type React from 'react';
import type { RGB } from '../../palette/core/oklab';
import type { GeometryParams } from '../../palette/core/rampGeometry';

export type FullscreenModeKind = 'cpuField' | 'cpuRaster' | 'glQuad' | 'ownCanvas';

/** A per-pixel ramp-position (`pos`) + coverage (`cov`) field — the output of the pure
 *  `sampleGeometry`. Rendered by sampling the LUT at the FLOAT position in GL (smooth, no
 *  256-step banding) and dithering before the 8-bit write. This is the right primitive for
 *  "a 1D gradient mapped across a 2D field" (the geometry modes). */
export interface GeometryField {
  pos: Float32Array;
  cov: Float32Array;
}

/** Per-present inputs the harness hands a mode's render path. Gradient data is RESOLVED
 *  by the overlay (snapshot in fullscreen, live last-modified hero in split) — a mode
 *  must read it from here, never from the store, so both sources work unchanged. */
export interface FullscreenModeContext {
  /** Active gradient ramp — 256 RGB entries (for cpuRaster CPU sampling). */
  ramp: RGB[];
  /** Active gradient LUT — 256×4 RGBA8 (1024 bytes), the same colours as `ramp` (for GL upload). */
  lut: Uint8Array;
  /** The flat-optional params object; a mode reads the fields it declared in `paramFields`. */
  params: GeometryParams;
  /** Backing-store size in device pixels. */
  width: number;
  height: number;
}

/**
 * OwnCanvasHost — the environment the overlay hands an `ownCanvas` mode at {@link FullscreenMode.mount}
 * time. The mode mounts + drives its OWN canvas/renderer/RAF inside `container`, reads colour ONLY
 * via `getContext()` (the overlay resolves it — the open-time snapshot in fullscreen, the live
 * last-modified hero in split), and reports first-frame readiness / a fatal failure through the
 * callbacks (the overlay shows a generic spinner until `onReady`, an error panel after `onError`).
 *
 * This is the seam's escape-hatch face: the overlay knows nothing mode-specific — it just provides
 * an empty positioned container + the resolved colour source + lifecycle signalling. A mode owns its
 * canvas DOM, RAF, gestures, and (via a ResizeObserver on `container`) its own resize.
 */
export interface OwnCanvasHost {
  /** An empty, positioned (`absolute inset-0`) element to mount the canvas into. Fills the stage. */
  container: HTMLElement;
  /** The current render context (resolved colour source + size). Read at mount + lazily per-frame. */
  getContext: () => FullscreenModeContext;
  /** Call once the first frame has painted — clears the overlay's loading spinner. */
  onReady: () => void;
  /** Call on a fatal mount failure (e.g. no WebGL2) — shows the overlay's error panel. */
  onError: (err: unknown) => void;
}

/**
 * OwnCanvasHandle — the lifecycle handle a mode returns from {@link FullscreenMode.mount}. The
 * overlay drives the few cross-cutting events every ownCanvas mode shares; the mode owns everything
 * else internally. All callbacks are optional except {@link dispose}.
 */
export interface OwnCanvasHandle {
  /** The resolved colour source changed (snapshot replaced, or the live hero updated in split) —
   *  re-read `ctx.lut` / `ctx.ramp` and re-upload. */
  onContext?: (ctx: FullscreenModeContext) => void;
  /** The shared Dither toggle changed. */
  setDither?: (on: boolean) => void;
  /** Return the canvas to read for PNG export (the mode should render a fresh frame first). */
  exportCanvas?: () => HTMLCanvasElement | null;
  /**
   * OPTIONAL "export at size" (ADDITIVE, 2026-09-03 — S4 Wallpaper): render ONE frame at
   * `w × h` DEVICE pixels and resolve a PNG blob. The overlay's Export panel calls this
   * instead of snapshotting the on-screen canvas, so a wallpaper is exported at the
   * requested resolution rather than at whatever the window happens to be.
   *
   * The contract, in three parts:
   *   • Render OFFSCREEN, or into a temporarily resized backing store that is RESTORED (and
   *     repainted) before resolving. The visible canvas must look unchanged afterwards.
   *   • Do not disturb mode state the user can see or feel: the Liquify soft body, the
   *     Fractal's centre/zoom, the Parallax field's positions and energy all stay put. Only
   *     the projection changes.
   *   • It MAY produce fewer pixels than asked when the mode's own renderer caps itself (the
   *     Fractal renderer caps its buffer at 1600 px on the long edge). The caller reads the
   *     true size back off the PNG header (`readPngSize` in `exportSize.ts`) and names the
   *     file from THAT, so under-delivering is honest rather than silent.
   *
   * A mode that omits this falls back to the on-screen export, and the panel says so.
   */
  renderAt?: (w: number, h: number) => Promise<Blob | null>;
  /** Tear down — dispose the renderer, cancel RAF, remove listeners, and remove the canvas. */
  dispose: () => void;
}

/** A flat-optional `GeometryParams` field a mode reads, with the metadata a generic panel
 *  needs to render a control for it. `default` should mirror `GEOM_DEFAULTS[key]`. */
export interface FullscreenParamField {
  key: keyof GeometryParams;
  label: string;
  min: number;
  max: number;
  step?: number;
  default: number;
}

export interface FullscreenMode {
  /** Stable key — persisted in the store + used in export filenames. */
  id: string;
  label: string;
  kind: FullscreenModeKind;
  /** Flat-optional `GeometryParams` fields this mode reads (declarative). */
  paramFields?: readonly FullscreenParamField[];

  // ── kind: 'cpuField' ──
  /** Pure position+coverage field producer (e.g. `sampleGeometry`). The harness LINEAR-samples
   *  the LUT at the float position and applies CPU **error-diffusion** dither before the 8-bit
   *  write (the smoothest still-gradient result — column average tracks the input, WIGGLE→0).
   *  MUST stay pure + deterministic. */
  field?: (ctx: FullscreenModeContext) => GeometryField;

  // ── kind: 'cpuRaster' ──
  /** Pure pixel producer; uploaded + presented through the shared dither tail. Use `cpuField`
   *  instead for gradient-over-position modes — `cpuRaster` pre-quantises to 8-bit so the
   *  dither can't recover banding. For modes that genuinely own their pixels (e.g. an
   *  imported image). */
  raster?: (ctx: FullscreenModeContext) => Uint8ClampedArray;

  // ── kind: 'glQuad' ──
  /** Fragment BODY defining `vec3 modeColor(vec2 uv)` (+ any helpers). */
  fragBody?: string;
  /** Extra `uniform …;` declarations the body reads (beyond the reserved preamble set). */
  fragUniforms?: string;
  /** Names of the extra uniforms to resolve locations for, so `setUniforms` can set them. */
  uniformNames?: readonly string[];
  /** Set this mode's per-present uniforms. `loc(name)` resolves a cached location. */
  setUniforms?: (
    gl: WebGL2RenderingContext,
    loc: (name: string) => WebGLUniformLocation | null,
    ctx: FullscreenModeContext,
  ) => void;

  // ── kind: 'ownCanvas' ──
  /** Mount the mode's OWN canvas/renderer/RAF into `host.container`; returns a lifecycle handle.
   *  The overlay calls this once when the mode becomes active and `dispose()`s it on exit / mode
   *  switch. Required for `kind === 'ownCanvas'` (the live Fractal; Liquify; Parallax). The mode
   *  bakes its own dither (include `DITHER_TAIL_GLSL` in its display shader). */
  mount?: (host: OwnCanvasHost) => OwnCanvasHandle;
  /** A one-line hint shown bottom-right of the stage (e.g. 'drag to pan · scroll to zoom'). The
   *  overlay falls back to a generic display-only hint when absent (and to the split hint in split). */
  hint?: string;

  // ── controls ──
  /** Self-contained controls panel (optional). */
  Controls?: React.FC;
  /**
   * Optional React layer rendered INSIDE the stage, above the canvas and below the hint —
   * for a mode's own empty state or on-image annotation. Mounted only while the mode is
   * active, like {@link Controls}. It is DOM, not canvas, so it can never bake into a PNG
   * export (the same reason the geometry handles live in their own layer).
   *
   * Added 2026-09-03 for `gradientMap`, which has nothing to draw until an image is loaded
   * and needs to say so where the user is looking. Set `pointer-events-none` unless the
   * layer is genuinely interactive.
   */
  Stage?: React.FC;
}

// ── registry ────────────────────────────────────────────────────────────────────────────
// A Map preserves insertion order, so the toolbar order = registration order. Builtins
// register in a fixed order from `modes/index.ts`; a parallel mode registers itself there
// (or via its own import) to slot into the selector.

const REGISTRY = new Map<string, FullscreenMode>();

/** Register a mode. Idempotent on `id` (re-registering replaces — handy for HMR). */
export const registerFullscreenMode = (mode: FullscreenMode): void => {
  REGISTRY.set(mode.id, mode);
};

/** Look up a mode by id (null if unknown — the overlay falls back to the first mode). */
export const getFullscreenMode = (id: string): FullscreenMode | null => REGISTRY.get(id) ?? null;

/** All registered modes in registration order (drives the selector). */
export const listFullscreenModes = (): FullscreenMode[] => [...REGISTRY.values()];
