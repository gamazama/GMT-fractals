# ADR-0030: Adapter-opaque JSON for camera state, not a canonical shape

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Camera.ts`

## Context

Toy apps have radically different camera shapes — fluid-toy's 2D
`{ center, zoom }`, fractal-toy's 3D orbit
`{ orbitTheta, orbitPhi, distance, fov, target }`, GMT's 6-DOF
camera. A canonical-shape plugin would force bad abstractions.

## Decision

Apps register a `CameraAdapter { featureId, captureState,
applyState }`. The plugin stores `Record<string, any>` and never
interprets it. No DDFS knowledge, no feature-state shape, no
Three.js dependency.

## Consequences

- A headless test harness, a VR app, or a 2D side-scroller all plug
  in with the same API.
- Type safety inside slots is the adapter's responsibility — the
  plugin can't enforce shape compatibility across save / load.
