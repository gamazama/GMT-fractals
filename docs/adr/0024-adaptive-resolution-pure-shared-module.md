# ADR-0024: Pure adaptive-resolution decision module shared by worker + main thread

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/AdaptiveResolution.ts`, `engine-gmt/engine/managers/UniformManager.ts`, `store/slices/viewportSlice.ts`

## Context

GMT's worker had a downsample feedback loop in
`UniformManager.syncFrame`; main-thread apps (fluid-toy, fractal-toy)
needed the same algorithm without the worker substrate.

## Decision

Extract `engine/AdaptiveResolution.ts` as a pure module — no DOM, no
THREE, no worker assumptions — and call it verbatim from both
`UniformManager` and `viewportSlice`. State is per-caller, mutated in
place; caller owns buffer resize and accumulation reset.

## Consequences

- One algorithm to maintain.
- The caller-owns-`selfResized` contract is load-bearing — without it,
  the caller's own accumulation reset reads as scene activity and
  adaptive re-engages immediately.
- Only `UniformManager.ts:137` writes it today; the main-thread slice
  doesn't need it because it doesn't synchronously reset accumulation
  in response to scale changes (followup q-042).
