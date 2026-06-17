# ADR-0020: UniformSchema base vs feature merge

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/UniformSchema.ts`, `engine/UniformNames.ts`, `engine/FeatureSystem.ts`

## Context

Every feature wants to push uniforms; some uniforms (Time,
Resolution, scene-offset, region rectangles) belong to the engine
regardless. The engine also CPU-derives a few cached uniforms from
feature-owned sources (EnvRotationMatrix from materials'
`uEnvRotation`; FogColorLinear from atmosphere's `uFogColor`).

## Decision

`BASE_SCHEMA` covers true engine core PLUS tool/export slots that
no-op at defaults PLUS CPU-derived caches hoisted so multiple
consumers can read with safe defaults. Feature uniforms are merged
via `featureRegistry.getUniformDefinitions()` with feature-vs-base
collisions silently dropped and feature-vs-feature collisions
resolved as last-wins through the `UNIFORM_DEFAULTS` reduce.

## Consequences

- Review-only collision discipline (convention: features use themed
  prefixes like `uPT…`, `uLight…`); no runtime guard.
- Future cleanup: surface a dev-mode warning when a feature uniform
  collides with `BASE_SCHEMA` or with an earlier-registered feature
  uniform.
