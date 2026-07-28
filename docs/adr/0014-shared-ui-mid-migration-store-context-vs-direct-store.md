# ADR-0014: Shared UI mid-migration — store context vs direct store

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `components/` shared UI primitives, `components/contexts/StoreCallbacksContext.tsx`

> **Update 2026-07-28 (migration progressed; decision unchanged):** The status
> snapshot in *Decision* is stale. `useStoreCallbacks()` is now consumed by
> `components/Slider.tsx:163,206`, `components/AutoFeaturePanel.tsx:116`,
> `components/Dropdown.tsx:27`, `components/EmbeddedColorPicker.tsx:255`,
> `components/KeyframeButton.tsx:52`, `components/AdvancedGradientEditor.tsx:131`
> and `hooks/useHelpContextMenu.ts:13` — not "only `Slider`". Still on direct
> store access: `components/Knob.tsx:177-178`,
> `components/vector-input/index.tsx:55-56,196-197,352-353`,
> `components/layout/Dock.tsx:33ff`, `components/layout/DropZones.tsx:9ff`.
> `AutoFeaturePanel` is now **mixed**: it takes
> `handleInteractionStart`/`handleInteractionEnd` from the context (`:116`) but
> still reads the third callback directly as
> `useEngineStore(s => s.openContextMenu)` (`:181`) even though the same context
> supplies it — a one-line cleanup. The precondition this ADR gated the migration
> on ("each host's callbacks are memoised") now holds for **all five** hosts:
> `App.tsx:74`, `app-gmt/AppGmt.tsx:188`, `fluid-toy/FluidToyApp.tsx:86`,
> `fractal-toy/FractalToyApp.tsx:55`, `gradient-explorer/GradientExplorerApp.tsx:268`
> — the last being a host that did not exist when this ADR was written. All five
> wire `openContextMenu: state.openContextMenu` verbatim, so the context value and
> the direct store read are the same function today and the remaining migrations
> are behaviour-neutral. The incremental-migration decision stands.

## Context

Primitives in `components/` initially read `useEngineStore` directly.
A target design ("pure primitives, store via opt-in context") was
sketched in `docs/history/engine/05_Shared_UI.md` with five contexts
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
  `docs/history/engine/05_Shared_UI.md` is aspirational, not enforced.
- Migration risk is per-host re-render correctness — must be tested
  empirically (fluid-toy max-depth-guard cascade is the historical
  pain point).
- This ADR captures the deliberate incremental approach so future
  agents don't "fix" the inconsistency in one sweep.
