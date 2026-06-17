/**
 * Fluid-toy app handles — typed singletons for cross-tree state.
 *
 * Three purpose-bound handles using `defineAppHandles<T>()` from the
 * engine, replacing the old grab-bag `engineHandles` object:
 *
 *   engineRef          — the running FluidEngine instance (nullable; set
 *                        at boot, cleared at dispose).
 *   brushHandles       — brush runtime (particles, stroke state, rainbow
 *                        phase) + the cached palette LUT.
 *   cursorHandles      — latest pointer UV / velocity / dragging flag
 *                        shared between FluidPointerLayer (writes) and
 *                        the RAF loop (reads).
 *
 * Each has the same API surface: `ref.current` for imperative R/W,
 * `useSnapshot()` for React, `subscribe`/`notify` for fine-grained
 * non-React listeners. See engine/appHandles.ts for the contract.
 */

import type { FluidEngine } from './fluid/FluidEngine';
import { defineAppHandles } from '../engine/appHandles';
import { createBrushRuntime, type BrushRuntime } from './brush';

// ── engine ref ───────────────────────────────────────────────────────
// Access via `appEngine.ref.current` — nullable (the engine boots async
// and clears on dispose).
export const appEngine = defineAppHandles<FluidEngine | null>('fluid-toy.engine', null);

// ── brush ────────────────────────────────────────────────────────────
export interface BrushHandles {
    /** Per-frame + per-splat runtime (particles, stroke-t, hue phase). */
    runtime: BrushRuntime;
    /** Most recent baked palette LUT. Null until the first palette bake. */
    gradientLut: Uint8Array | null;
}

export const brushHandles = defineAppHandles<BrushHandles>('fluid-toy.brush', {
    runtime: createBrushRuntime(),
    gradientLut: null,
});

// ── cursor ───────────────────────────────────────────────────────────
export interface CursorState {
    /** True while the user is mid-drag with the splat pointer mode. */
    dragging: boolean;
    /** Last-known cursor UV (0..1). null if no move event yet. */
    uv: { u: number; v: number } | null;
    /** Last measured cursor velocity in UV/sec. */
    velUv: { vx: number; vy: number } | null;
}

export const cursorHandles = defineAppHandles<CursorState>('fluid-toy.cursor', {
    dragging: false,
    uv: null,
    velUv: null,
});
