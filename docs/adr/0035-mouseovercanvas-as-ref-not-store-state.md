# ADR-0035: mouseOverCanvas is a ref, not store state

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/worker/ViewportRefs.ts`, `engine/AdaptiveResolution.ts`, `engine/plugins/viewport/AdaptiveResolutionBadge.tsx`

> **Update 2026-07-28 (component + input-path drift; decision unchanged):** the
> `Scope` line and the Context / Consequences sections name
> `engine/plugins/viewport/AdaptiveResolutionBadge.tsx` as the component that
> would re-render on hover. That component does not import `isMouseOverCanvas` —
> the only live reader is `engine-gmt/topbar/AdaptiveResolution.tsx:30`, which
> uses it to choose the badge's "Auto" (pointer on canvas) vs "Always" (pointer
> off canvas) label. Separately, `engine/AdaptiveResolution.ts` no longer reads
> its `mouseOverCanvas` input at all (optional since ADR-0061 P5 — engagement is
> activity-driven, not pointer-position-driven), though
> `store/slices/viewportSlice.ts:196` still evaluates `isMouseOverCanvas()` once
> per frame inside `reportFps`, driven by
> `engine-gmt/renderer/GmtRendererTickDriver.tsx:302`. The per-frame-poll
> rationale for keeping the value ref-backed therefore still holds and the
> decision stands. The closing "documented in both the worker-contract and
> adaptive-resolution module docs" now resolves to
> `docs/history/audit-2026-05-20/archive/engine/{worker-contract,adaptive-resolution}.md`;
> the live documentation is the JSDoc on `engine/worker/ViewportRefs.ts`.

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
