# ADR-0035: mouseOverCanvas is a ref, not store state

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/worker/ViewportRefs.ts`, `engine/AdaptiveResolution.ts`, `engine/plugins/viewport/AdaptiveResolutionBadge.tsx`

## Context

Adaptive resolution polls hover state every frame. Driving hover
through Zustand would trigger React reconciliation on every
mouse-cross and on every subscriber re-render (the
`AdaptiveResolutionBadge` would re-render on every hover).

## Decision

`_mouseOverCanvas` is a module-scope `let` accessed via plain
`setMouseOverCanvas` / `isMouseOverCanvas` functions. Not a hook,
not a selector, not store-backed.

## Consequences

- The badge does NOT re-render automatically when the mouse crosses
  the canvas — only when the next adaptive state change fires.
- This is the load-bearing contract; future "make it reactive"
  refactors would regress the adaptive-resolution hot path
  (followup q-043).
- Documented in both the worker-contract and adaptive-resolution
  module docs.
