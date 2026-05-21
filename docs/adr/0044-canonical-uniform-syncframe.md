# ADR-0044: Single canonical per-frame uniform writer (`UniformManager.syncFrame`)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/managers/UniformManager.ts`

## Context

GMT's uniform set is large (>80 entries spanning camera basis,
virtual-space split, fog linearization, light packing, rotation
matrices) and many uniforms have non-trivial CPU-side derivations:

- ACES tonemap quadratic for fog linear color (avoids per-pixel `sqrt`).
- Euler→matrix builds for the 3-stage pre/post/world rotation.
- Per-light Euler-to-direction packing with optional camera-quaternion
  composition for headlamp lights.
- Adaptive resolution decisions (scale + buffer resize) gated on
  multiple flags.

Scattering these writes across per-feature systems caused stale-frame
bugs (e.g. light direction written before camera basis when headlamp
lights need the camera quaternion that was just zeroed). The
path-traced renderer also needs adaptive resolution decisions every
frame.

## Decision

A single ordered pipeline in `UniformManager.syncFrame`
(`engine-gmt/engine/managers/UniformManager.ts:64`) runs all per-frame
uniform writes in load-bearing order:

1. Adaptive resize (delegated to engine-core
   `engine/AdaptiveResolution.ts:tickAdaptiveResolution`)
2. Image-tile sync (copy resolution into `uFullOutputResolution` when
   not tiled, so blue-noise lookups stay continuous)
3. Camera basis (apply rotation modulations, build
   `uCamBasisX/Y/Forward` scaled by `tanFov` or `orthoScale/2`, zero
   `uCameraPosition`)
4. `uPixelSizeBase` (pre-computed from `height * 2.0 / viewportY`,
   anchored to the POST-adaptive viewport)
5. Virtual-space update (split camera position into
   `uSceneOffsetHigh`/`uSceneOffsetLow`)
6. Time + env rotation (`uTime`, CPU `mat2` derivation from scalar
   `uEnvRotation`)
7. Fog linearization (solve ACES quadratic per-channel into
   `uFogColorLinear`)
8. Light packing (`uLightType`/Position/Direction/Falloff/Radius/etc.
   — direction stored TOWARD-light, negated at boundary)
9. 3-stage rotation matrices (`uPreRotMatrix`, `uPostRotMatrix`,
   `uWorldRotMatrix` via Z·X·Y Euler; identity when disabled)

Adaptive resolution state is delegated to the generic engine-core
`engine/AdaptiveResolution.ts` module via `tickAdaptiveResolution` so
the same algorithm drives any iterative renderer.

## Consequences

- Adding a new uniform requires deciding which step it belongs to, not
  where to wire a new tick callback.
- The fork divergence is intentional: `engine/managers/` (engine-core)
  carries only `ConfigManager.ts`; `UniformManager` is engine-gmt-only
  because the steps above are GMT-renderer-specific.
- **`uLightDir[i]` stored toward-light** (negated at the boundary) is a
  downstream-API invariant — every shader chunk depends on the
  convention. Reversing it forces touch-ups in every consumer
  (NdotL, shadows, volumetrics, reflections).
- `runtimeState.adaptiveSuppressed` hard-forces full res when the
  bucket-render dialog or export is in flight — without this gate, the
  FBO resizes mid-export and briefly displays the cleared buffer.
- `_adaptive.selfResized` is written at line 137 so the algorithm
  doesn't observe its OWN resize as user activity. Removing this
  causes adaptive to re-engage immediately after every settle.
