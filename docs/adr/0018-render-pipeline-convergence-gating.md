# ADR-0018: Render pipeline convergence measurement gating

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/RenderPipeline.ts`

## Context

Convergence measurement (1 render + 2 setRenderTarget swaps + sync
readPixels every 8 samples) is pure waste when no UI consumer is
mounted.

## Decision

Gate behind `_convergenceNeeded` (default false), toggled by the
`SET_CONVERGENCE_NEEDED` worker message. Only consumer today is
engine-gmt's `RegionOverlay`.

## Consequences

- Forgetting to call `setConvergenceNeeded(true)` from a new consumer
  yields a stale 1.0 reading forever.
- Forgetting to clear it = wasted work.
- No runtime warning; reviewer discipline only.
