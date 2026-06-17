# ADR-0015: Animation log-value-space and camera-pair linear-in-zoom

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/animation/logTrackRegistry.ts`, `engine/animation/cameraPairRegistry.ts`, `engine/AnimationEngine.ts`

## Context

Two related precision problems in animation:

1. Linear lerp on `julia.zoom` 1 → 1e-30 collapses 99.999% of the
   timeline to one extreme; constant-rate-of-change in scale matches
   perception, not linear-in-value.
2. Pan whips at deep zoom because world-units-per-frame stays
   constant while the visible world shrinks exponentially; lerping
   `(hi, lo)` independently below ~1e-15 leaves ULP-level shake.

## Decision

- Tracks registered via `logTrackRegistry` lerp in `log(v)` and `exp`
  back. Tangent y-values live in absolute value-space so Bezier is
  NOT supported on log tracks — they evaluate as linear-in-log
  regardless of stored interpolation type.
- Pan tweens evaluate as closed-form linear-in-zoom:
  `pan = c0 + (c1 - c0) * (zT - z0) / (z1 - z0)`,
  routed through `evaluateDDPairAxis` with DD-precision two-sum +
  Veltkamp-split two-product so hi/lo channels stay coherent past
  zoom 1e-30. Routing is unconditional even when no `panLow` track
  exists.

## Consequences

- Constant rate-of-change in scale and constant-screen-space pan
  velocity match what the eye expects.
- Below ~1e-15, independent lerping would leave ULP-level shake which
  DD-lerping eliminates.
- Linear-in-log behaviour overrides stored interpolation type — users
  authoring Bezier curves on log tracks will see linear motion.
