# ADR-0017: Render pipeline async convergence readback

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/RenderPipeline.ts`

## Context

Synchronous `glReadPixels` on convergence stalls the GPU and the
per-8-sample measurement loop visibly hitches.

## Decision

Use WebGL2 `fenceSync` + `gl.flush()` + non-blocking
`clientWaitSync(timeout=0)` to poll for completion across frames. A
synchronous fallback exists for environments without `fenceSync`.

## Consequences

- Convergence readback is cheap when GPU is idle.
- Deployment targets without `fenceSync` silently degrade to the very
  stall the async API exists to avoid.
