# ADR-0100: Navigation renders the same integrand as the final image

**Date:** 2026-07-13
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/ray.ts`, `engine-gmt/shaders/chunks/trace.ts`, `engine-gmt/shaders/chunks/lighting/shared.ts`, `engine-gmt/features/reflections/index.ts`

## Context

The Direct-mode shader carried a set of branches keyed on `uBlendFactor >= 0.99`
(named `isMoving` in `ray.ts`) that rendered a **different, cheaper integrand
while the camera moves** than while accumulating:

- **Reflections** (`REFL_RAYMARCH_SHADING`) used the deterministic mirror
  `reflDir` in motion, switching to jittered VNDF sampling only in accumulation.
- **DE step-jitter** (`trace.ts`) was forced to `1.0` (off) in motion.
- **Light-sphere radius jitter** (`shared.ts`) was forced to `0.0` (sharp edge)
  in motion.
- **Volumetric scatter** (`volumetric_scatter.ts`) clamped its stochastic gate
  probability to 1/32 in motion for FPS — noted for completeness but an *unbiased*
  estimator, so it is left unchanged (see Decision).
- **Ray-gen seeding** (`ray.ts`) left `stochasticSeed` at a flat `0.5` in motion
  unless DOF / area-lights / volumetrics were on.

`uBlendFactor` is `1 / accumulationCount` — so it is `1.0` (i.e. `isMoving`) not
only during genuine navigation but also on the **first sample of every fresh,
stationary accumulation**, and (via the band scheduler, ADR pass-0) on the whole
first screen sweep. That first sample is written at full weight and then eroded
only at `1/N`. The result: the aliased, mirror-reflection, un-dithered navigation
frame **seeds** the accumulation buffer, and for reflections it is a
*geometrically different* integrand (sharp mirror vs. glossy lobe), so it does
not merely fade — it **biases** the running mean toward a sharp-mirror ghost
that persists across the accumulation. This was the user-reported "aliased
navigation render leaking into accumulation" on glossy/raymarched reflections.

The shader has no signal for "the camera is *actually* moving" — only
`uBlendFactor`. Plumbing a real interaction uniform (the InteractionSession,
ADR-0061, is the CPU source of truth) was one option; making the two modes
render the same integrand was the other.

## Decision

Render the **same integrand** in navigation and accumulation. Remove the
`isMoving`/`uBlendFactor >= 0.99` integrand branches; where a stochastic effect
needs decorrelated noise, select the noise *source* by motion instead of gating
the effect on/off — stable (frozen, non-animated) blue noise while moving,
animated once accumulating. This is the pre-existing DOF / `stochasticSeed`
idiom (`isMoving ? getStableBlueNoise4 : getBlueNoise4`), generalised:

1. **Reflections** — glossy surfaces (`roughness > 0.05`) run VNDF in both modes;
   the VNDF seed is stable in motion. Perfect mirrors (`roughness <= 0.05`) keep
   `reflDir`. (ADR-0068 updated.)
2. **Step-jitter** and **light-sphere radius jitter** — always applied; their
   `stochasticSeed`/`seed` is frozen in motion, so the dither / soft edge is
   stable (no shimmer) and animates only in accumulation.
3. **Ray-gen** — `stochasticSeed` is seeded unconditionally (both render modes),
   so the effects above get a proper per-pixel blue-noise seed in motion instead
   of a flat `0.5`. This makes the Direct ray-gen identical to the PT ray-gen.

The **volumetric scatter** in-motion gate clamp (1/32, `volumetric_scatter.ts`)
is deliberately **left as-is**. Unlike the reflection branch it is an *unbiased*
estimator — `seg = 1/gateP` compensates, so the converged image is identical
with or without the clamp. The nav frame is merely noisier, not a different
integrand, so it does not bias the running mean; it fades at `1/N` like any
other single-sample noise. Removing the clamp would only cost nav FPS for zero
convergence benefit, so it stays.

Primary-ray sub-pixel jitter (`uJitter`, `ray.ts`) is **left accumulation-only**
and is deliberately NOT unified: it is a sample-*position* offset, not an
integrand difference, so it does not bias the seed (a single sample is un-
anti-aliased by nature regardless of where in the pixel it lands). It is also
structurally gated off in motion on the CPU side (`uJitter = 0` while
`accumulationCount <= 1`, `FractalEngine`), and forcing an *animated* offset in
motion would vibrate the whole viewport by ±0.5 px per frame.

## Consequences

- The accumulation seed is now a valid sample of the final estimator for every
  effect above — the reflection sharp-mirror bias is gone, and step-banding /
  sharp light-sphere edges no longer pop between the nav frame and accumulation.
- **Trade (accepted, owner call 2026-07-13):** while the camera moves, a glossy
  surface shows a single stable-noise glossy reflection instead of the old crisp
  mirror preview — it reads *soft*, not boiling (stable noise doesn't crawl). The
  old mirror preview was itself misleading (it never matched the converged look).
- Single-sample **edge** aliasing on the seed frame is unchanged — anti-aliasing
  is inherently multi-sample. Reflected-silhouette AA still rides the primary
  Halton jitter (`count >= 2`); the reflection march is still deterministic
  (`shader.ts`). If reflected-edge crawl during *early* accumulation remains a
  complaint, adding a per-sample sub-pixel offset inside `traceReflectionRay` is
  the separate follow-up lever.
- Minor: one extra blue-noise fetch per pixel per frame during navigation in
  Direct mode when no stochastic feature is otherwise active (negligible). The
  removed branches also trim a small amount of `fxc`/HLSL compile surface (one
  fewer select per site; the mirror in-motion fallback path is gone).
- Direct and PT ray-generation are now byte-identical; `getRayGLSL`'s
  `renderMode` parameter is retained for call-site clarity but no longer
  branches.
