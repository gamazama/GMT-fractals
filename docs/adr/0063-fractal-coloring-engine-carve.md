# ADR-0063: Carve fractal+gradient rendering into a host-agnostic `engine/fractal` library

**Status:** Accepted
**Date:** 2026-06-07

> **Update 2026-06-07 (deep-zoom incorporated; decision unchanged):** The deep-zoom
> precision stack (`deepZoom/*` worker — perturbation + LA + AT + BigInt reference
> orbit — and `DeepZoomController`) was promoted into `engine/fractal/deepZoom/` and
> `engine/fractal/DeepZoomController.ts` (same move + fluid-toy re-export-shim pattern;
> `benchmark.ts`/`diagnostics.ts` stay in fluid-toy as they're fluid/react-coupled).
> `FractalColorRenderer` now drives it: `setDeepZoomEnabled()` + `rebuildDeepZoom()`
> (off-thread orbit build via the shared worker → `DeepZoomController` upload), DD
> (double-double) pan via the shared `ddAddF64`, and a lifted zoom floor
> (`MANDEL_DEEP_MIN_ZOOM = 1e-100`). The GX overlay exposes a "Deep zoom" toggle and
> rebuilds the orbit on gesture-settle. Verified: deep ON resolves 2822 distinct
> colours at zoom 1e-9 where the f32 path collapses to 1 (`smoke-gx-fractal-deepzoom`);
> fluid-toy's deep zoom unaffected (`smoke:deep-zoom-orbit`/`-la` green). The "shallow
> ⊂ deep, no throwaway" phasing held exactly. Consequence #3's deferred-follow-up note
> below is now realised.
**Context tags:** engine-core, fluid-toy, gradient-explorer, WebGL, share-not-fork

## Context

The Gradient Explorer wanted a "see your gradient in action" feature: colour a live
Mandelbrot with the user's current 256-step ramp. fluid-toy already renders exactly
this (a Mandelbrot/Julia coloured by a 256×1 RGBA8 LUT), but the renderer was welded
into the ~1900-line monolithic `FluidEngine` alongside the fluid sim, dye, velocity,
bloom, and a deep-zoom (perturbation + LA + AT + BigInt worker) precision stack.

Key findings from the scope probe (`plans/gx-live-fractal-coloring-scope.md`):

- The gradient mapping is **already** a `setColormap(rgba256)` shape — the GX ramp
  seam `renderStopsToBuffer()` is byte-identical to what fluid-toy's `GradientLutManager`
  uploads. No palette seam needed.
- The fractal kernel (`FRAG_JULIA`) is decoupled from the fluid sim, but the *display*
  pass and the MRT/TSAA state are interwoven with sim consumers in `FluidEngine`.
- The deep-zoom precision stack is an XL lift; a **shallow float32** Mandelbrot is a
  strict subset (same shader, deep path toggled off) and delivers ~90% of the value.

Two engine principles bear directly: **"genericize, don't fork"** and **"one engine,
many apps."** A second copy of the fractal kernel in the Explorer would be a fork that
drifts.

## Decision

1. **Carve the genuinely-shared, host-agnostic leaf modules into `engine/fractal/`**
   and have fluid-toy consume them via re-export shims — the same extract-in-place
   pattern as the `gmtGradient` collapse (single source, no fork):
   - `shaders/fractalKernel.ts` (`FRAG_JULIA`) — the iteration + gradient-mapping kernel.
   - `shaders/gradientSample.ts` (`OKLAB_GLSL`, `GRADIENT_SAMPLE_GLSL`, `VERT_FULLSCREEN`).
   - `shaders/tsaaBlend.ts` (`FRAG_TSAA_BLEND`) — generic MRT accumulator blend.
   - `GradientLutManager.ts` + `FRACTAL_GRADIENT_LUT_WIDTH` (the LUT width, one source).
   fluid-toy's `fluid/shaders/{common,julia,display}.ts`, `fluid/GradientLutManager.ts`,
   and `constants.ts` become thin re-exports; `FluidEngine` is otherwise untouched.

2. **Add a new standalone host `FractalColorRenderer`** (NEW; ~370 lines) that owns its
   own WebGL2 context, one MRT + TSAA accumulator, a trivial display blit
   (`fractalDisplay.ts`), and the public API `setRenderSize / setColormap / setParams /
   pan / zoomAt / render / dispose`. It does NOT delegate from `FluidEngine` (whose
   render path is interwoven with the sim) — it reuses the shared *kernel + sampler +
   LUT manager*, exactly the gmtGradient model (shared modules, not shared stateful
   objects).

3. **Shallow float32 only this round.** The kernel's deep-zoom uniforms are bound to
   inert OFF defaults inline; the `deepZoom/*` worker stack stays entirely in fluid-toy
   (NOT carved). Zoom is clamped to `MANDEL_MIN_ZOOM = 1e-4` (10× above fluid-toy's
   proven shallow floor) so the f32 path never visibly quantises, even on weaker
   ANGLE/D3D11 GPUs. Deep-zoom is a clean follow-on (flip the toggle, wire the worker).

4. **Integration is scoped + opt-in.** The Explorer mounts the GL canvas ONLY inside the
   fullscreen overlay's `'fractal'` geometry, disposed on close — never a shell viewport
   (the no-viewport principle holds). The gradient stays FROZEN (the snapshot's ramp);
   the live, animatable knobs are `phase / repeats / mapping-mode` (cheap kernel
   uniforms) + pan/zoom + a palette-cycling toggle.

## Consequences

- **One kernel, two hosts.** fluid-toy and the Explorer render the same fractal+gradient
  maths; a kernel improvement benefits both. No drift surface.
- **fluid-toy is behaviourally unchanged.** The carve is a move + re-export; gated by
  `smoke:fluid-toy`, `smoke:orbit`, and `smoke:deep-zoom-orbit` (all green) plus tsc 0.
- **Known intentional duplication:** ~90 lines of low-level WebGL2 plumbing
  (`detectFormat`/`linkProgram`/`createMrt`/`drawQuad`/`bindTex`) are near-identical to
  `FluidEngine`'s privates. Kept duplicated to keep this carve's blast radius OFF
  `FluidEngine`. A shared host-agnostic `engine/utils` WebGL2 helper consumed by BOTH
  (the `BloomChain` hook-bundle is the precedent) is the deferred follow-up.
- **Deep zoom is deferred, not foreclosed** — the shallow MVP is a strict subset, so no
  throwaway work. Promoting `deepZoom/*` into `engine/fractal` is the Phase-2 lift.

## See also

- `plans/gx-live-fractal-coloring-scope.md` — the scope/design probe.
- `engine/fractal/FractalColorRenderer.ts` — the renderer host.
- `gradient-explorer/FullscreenGradientOverlay.tsx` — the integration.
- `debug/smoke-gx-fractal.mts` — runtime "it actually renders" smoke.
