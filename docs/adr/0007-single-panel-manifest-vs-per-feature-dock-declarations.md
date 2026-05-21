# ADR-0007: Single panel manifest, not per-feature dock declarations

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/PanelManifest.ts`, `engine-gmt/panels.ts`, app panel manifests

## Context

Earlier feature-system designs had each feature declare its own
dock target / order / panel slot via `FeatureTabConfig` fields
(`dock`, `order`, `defaultActive`). Multi-panel features and panels
with non-feature children (Graph, Audio, Drawing, Engine) couldn't
be expressed cleanly — features had to fight for ordering.

## Decision

Move panel layout to a single `PanelManifest` array per app, consumed
by `applyPanelManifest`. `FeatureTabConfig` keeps only
`label / iconId / condition`; dock-positional fields are stripped.
Features can appear in multiple panels (Coloring shows in both
Gradient and Scene; Geometry appears 4× in Formula as separate
compilables). Bespoke panels (Graph, Engine, …) use a `component:`
id resolved through `componentRegistry`.

## Consequences

- Adding a feature no longer auto-creates a panel — the panel
  manifest must opt it in.
- Sibling apps own their own manifests (fluid-toy and fractal-toy
  use the `features:` shorthand; GMT does not).
- Compile-spinner ownership now lives in `CompileScheduler`, not in
  panel UI, so toggling a compilable section never emits an
  optimistic "compiling…" flash.
