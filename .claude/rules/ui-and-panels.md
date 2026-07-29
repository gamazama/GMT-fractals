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

**Known coverage gap — read before trusting a green run.** `smoke:ui-primitives`
is often cited here. It is a genuine guard, not a dead one, but it is narrow: it
exercises `clampToViewport` (`components/ui/viewportClamp.ts`) and nothing else,
renders no React component, and reaches **1 of the 129 files this rule scopes** —
measured, not estimated (`check:rule-guards --verbose` prints the ratio). Its home
is [`layers-zindex.md`](./layers-zindex.md), which scopes `components/ui/**`, and
the citation was moved there on 2026-07-29.

What *does* reach a manifest-composed panel, and exactly how far it goes:
`smoke:engine-demo` mounts the demo dock and asserts two DDFS param labels plus at
least one `ScalarInput` thumb actually rendered; `smoke:engine-demo-modulation`
asserts `applyPanelManifest` swept an entry into `store.panels`. Both of those
assertions were added by the 2026-07-29 guard sweep — before it, they were logged
and never checked. Neither asserts manifest **structure**: item order, sections,
separators, collapsibles and `component:` widget items are all unchecked, and both
run against the demo entry, not app-gmt's manifest. `smoke:boot` only proves the
tree renders without throwing. So changes to `AutoFeaturePanel` / `PanelManifest`
item handling still need a manual pass.

(Guard names in this paragraph are deliberately written without the `npm run`
prefix: `check:rule-guards` parses that prefix out of the whole rule body, so
prefixing a name here would mint a citation from a sentence explaining a gap.)
