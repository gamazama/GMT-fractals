/**
 * modeRegistry — the FROZEN mode plug-in seam for the fullscreen gradient overlay.
 *
 * A "fullscreen mode" is a self-contained way to render the active gradient full-bleed
 * (Linear / Radial / … / live Fractal / future Splitscreen-wipe / Spline / Liquify /
 * Parallax). The overlay dispatches PURELY on this registry: it never hard-codes a mode.
 * A new mode is added by calling {@link registerFullscreenMode} from its own module — no
 * edit to the overlay core — so the parallel mode streams don't collide.
 *
 * ── A mode declares three things (the seam's three faces) ───────────────────────────────
 *   (a) PARAMS  — `paramFields`: which flat-optional `GeometryParams` fields it reads, with
 *                 UI metadata. Threads through the GATE shape (palette/core/rampGeometry).
 *   (b) RENDER  — ONE of three `kind`s:
 *        • 'cpuRaster' — a pure `raster(ctx) → RGBA` producer. The harness uploads it and
 *          presents through the shared dither tail. (The 6 geometry modes.)
 *        • 'glQuad'    — a fragment `fragBody` defining `vec3 modeColor(vec2 uv)`. The
 *          harness wraps it (standard preamble + `sampleLut` + dither tail), compiles once,
 *          and renders a fullscreen quad. Reads the gradient via `uLut`. Extra uniforms via
 *          `fragUniforms` + `uniformNames` + `setUniforms`. (Spline / splitscreen-wipe.)
 *        • 'ownCanvas' — the escape hatch: the mode mounts + drives its OWN canvas/renderer/
 *          RAF (the live Fractal; a future Liquify/Parallax that needs custom GL or a CPU
 *          sim). It bypasses the compositor and bakes its own dither (include
 *          `DITHER_TAIL_GLSL` in its display shader if it bands).
 *   (c) CONTROLS — `Controls`: a self-contained React panel (reads the store + registry).
 *
 * ── Invariants (FROZEN — parallel sessions rely on these) ───────────────────────────────
 *   • `id` is the stable mode key persisted in `fullscreenStore.geom` and used in export
 *     filenames (`{stem}-{id}.png`). Don't rename a shipped id.
 *   • cpuRaster `raster` MUST stay pure + deterministic (it's pinned by the determinism
 *     harness via `renderGeometry`). Side effects / RAF / DOM belong in 'ownCanvas'.
 *   • A mode reads gradient data ONLY from `ctx` (never the store directly) so the same mode
 *     renders correctly for the snapshot (fullscreen) AND the live hero (split) source.
 *   • `setUniforms` must not touch the reserved preamble uniforms (see ditherTail.ts).
 *
 * @see gradient-explorer/fullscreen/ditherTail.ts   (the wrapper + shared dither tail)
 * @see gradient-explorer/fullscreen/FullscreenCompositor.ts (compiles + presents)
 * @see palette/core/rampGeometry.ts                  (the flat-optional GeometryParams gate)
 */

import type React from 'react';
import type { RGB } from '../../palette/core/oklab';
import type { GeometryParams } from '../../palette/core/rampGeometry';

export type FullscreenModeKind = 'cpuRaster' | 'glQuad' | 'ownCanvas';

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

  // ── kind: 'cpuRaster' ──
  /** Pure pixel producer; uploaded + presented through the shared dither tail. */
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
  // (no extra fields — the mode owns its canvas lifecycle + controls; the overlay hosts it.)

  // ── controls ──
  /** Self-contained controls panel (optional). */
  Controls?: React.FC;
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
