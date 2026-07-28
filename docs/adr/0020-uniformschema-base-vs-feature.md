# ADR-0020: UniformSchema base vs feature merge

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/UniformSchema.ts`, `engine/UniformNames.ts`, `engine/FeatureSystem.ts`

> **Update 2026-07-27 (implementation changed; base-vs-feature split unchanged):**
> the Decision below describes collision handling that no longer exists. Commit
> `36ad672c` (2026-05-21) replaced the silent base-vs-feature filter with two
> boot-time `throw` checks — feature-vs-base and feature-vs-feature — at
> `engine/UniformSchema.ts:113-131` (engine-gmt twin at
> `engine-gmt/engine/UniformSchema.ts:117-136`). `UNIFORM_DEFAULTS`'s last-wins
> reduce is therefore never reached with a duplicate name, and the "Future
> cleanup: surface a dev-mode warning" consequence is closed — the implementation
> went further than a warning. Note the checks live in `UniformSchema`, not in the
> harvester: `featureRegistry.getUniformDefinitions()` still returns duplicates
> unfiltered. The BASE-vs-feature partition and the three BASE sub-categories
> described below are unchanged. See `docs/policy/uniform-plugin-contract.md` I3.

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
