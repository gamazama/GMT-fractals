---
paths:
  - "components/**"
  - "engine/PanelManifest.ts"
  - "**/panels.ts"
---

# Shared UI primitives + the panel manifest

Read first: JSDoc on `components/AutoFeaturePanel.tsx` and `engine/PanelManifest.ts`,
plus [`docs/policy/shared-ui-coupling-rules.md`](../../docs/policy/shared-ui-coupling-rules.md).

Decisions: **ADR-0007** (single panel manifest, not per-feature dock declarations),
ADR-0021 (plugin slot registries), ADR-0057 (topbar Camera menu opts out with
`menu: null`), ADR-0013 (`componentRegistry` `ComponentType<any>` widening),
**ADR-0014** (store-context vs direct store in `components/`), ADR-0032
(StateLibrary primitives are fully controlled).

For the floating-surface primitives under `components/ui/**` — `<Layer>`, Modal,
FloatingPanel, AnchoredMenu, the tier table — see
[`layers-zindex.md`](./layers-zindex.md) and ADR-0060/0081/0082.

## Invariants

- **Purity is scoped to the `components/ui/` subtree — not to all of `components/`.**
  `components/ui/**` is the pure primitive layer: zero store imports, enforced by
  the `PreToolUse` hook in `.claude/hooks/guard.mjs`. Capabilities arrive via
  props or opt-in React context (`components/contexts/StoreCallbacksContext.tsx`).
  The **rest** of `components/` is store-aware by design — roughly 29 of the 68
  top-level `components/*.tsx` read `useEngineStore` directly, and that is not a
  violation. ADR-0014 records this explicitly: the blanket "primitives must not
  import the store" line in `docs/history/engine/05_Shared_UI.md` is *aspirational,
  not enforced*, and the migration to `useStoreCallbacks()` is incremental. Don't
  "fix" a store-aware composed panel; do keep new `components/ui/**` code pure.
- **Panels are declarative compositions** of features, widgets, sections,
  separators and collapsibles. Layout decisions live in the manifest, not in
  hand-written panel components.

## The anti-pattern that matters

**Don't `component: 'panel-X'` your way out of a manifest gap.** That's how five
escape hatches become five forks. If a panel can't be expressed via `items`,
extend the manifest — a new item type, or a new prop on an existing one — so that
it can, in a way another app could also use.

## Never create a parallel component

If a widget nearly does what you need, find the master component and improve it.
Do not add a second near-identical one alongside it.

Self-contained widgets ported from GMT (FormulaSelect, AudioSpectrum, FlowEditor,
EnginePanel) were ported **verbatim** with path rewrites and registered in
`componentRegistry`. Don't rewrite their internals.

## Guards

```
npm run typecheck
npm run smoke:boot        # renders the whole panel tree headlessly; fails on pageerrors
npm run smoke:interact    # DDFS state flow end-to-end (demo feature)
```

**Known coverage gap — read before trusting a green run.** `npm run smoke:ui-primitives`
is often cited here; it exercises **only** `clampToViewport` (`components/ui/viewportClamp.ts`)
and renders no React component at all, so it guards nothing in this rule's scope.
There is currently **no** guard that mounts a manifest-composed panel and asserts
its structure — `smoke:boot` only proves the tree renders without throwing. Changes
to `AutoFeaturePanel` / `PanelManifest` item handling need a manual pass.
