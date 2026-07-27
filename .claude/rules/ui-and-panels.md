---
paths:
  - "components/*.tsx"
  - "engine/PanelManifest.ts"
  - "**/panels.ts"
---

# Shared UI primitives + the panel manifest

Read first: JSDoc on `components/AutoFeaturePanel.tsx` and `engine/PanelManifest.ts`,
plus [`docs/policy/shared-ui-coupling-rules.md`](../../docs/policy/shared-ui-coupling-rules.md).

Decisions: ADRs 0008-0010 (primitives), ADR-0011 (manifest + topbar slots).

## Invariants

- **UI primitives are pure.** No primitive imports the store. Animation, undo,
  shortcuts and context-menu capabilities are opt-in via React context.
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
npm run smoke:ui-primitives
```