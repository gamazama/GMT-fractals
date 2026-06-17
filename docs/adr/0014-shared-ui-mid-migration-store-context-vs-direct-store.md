# ADR-0014: Shared UI mid-migration — store context vs direct store

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `components/` shared UI primitives, `components/contexts/StoreCallbacksContext.tsx`

## Context

Primitives in `components/` initially read `useEngineStore` directly.
A target design ("pure primitives, store via opt-in context") was
sketched in `docs/engine/05_Shared_UI.md` with five contexts
(Animation / Undo / ContextMenu / Shortcut / FeatureCompile).
Migrating all primitives at once is high-risk.

## Decision

Adopt the opt-in context pattern incrementally. Today only `Slider`
consumes the single landed context (`StoreCallbacksContext`).
`Knob`, `Vector*Input`, `Dock`, `DropZones`, and `AutoFeaturePanel`
keep direct store access until each host's callbacks are memoised
and the granular-selector pattern can be retired. Followup q-088
spells out the one-line `Knob` migration once host memoisation is
audited.

## Consequences

- The "primitives must not import the store" rule from the original
  `docs/engine/05_Shared_UI.md` is aspirational, not enforced.
- Migration risk is per-host re-render correctness — must be tested
  empirically (fluid-toy max-depth-guard cascade is the historical
  pain point).
- This ADR captures the deliberate incremental approach so future
  agents don't "fix" the inconsistency in one sweep.
