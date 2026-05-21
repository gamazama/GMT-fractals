# ADR-0037: Two registration manifolds — `registerFeatures()` and `registerUI()`

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine/features/index.ts`, `engine/features/ui.tsx`

## Context

The engine extract ships six bundled features (`postEffects`,
`colorGrading`, `audio`, `modulation`, `webcam`, `debugTools`). Each
feature has TWO distinct concerns:

- **Engine-side data** — params, state, actions, shader chunks, viewport
  configs. Consumed by the store auto-wiring, `ShaderFactory.buildShader`,
  the `UniformSchema`, and the `ConfigManager` diff.
- **React UI bindings** — `componentId` -> React component map plus the
  engine's Tailwind `@apply` utility classes (`t-btn`, `t-section-*`,
  `glass-panel`, `icon-btn`).

A single `registerFeaturesAndUI()` entry point would force any app that
wants engine-side data (a headless test harness, a Tauri host, a
future server-side renderer) to also drag in React + the styles
injection.

## Decision

Split into two entry points called from per-app `main.tsx`:

- `registerFeatures()` (`engine/features/index.ts:17-27`) — registers the
  six bundled `FeatureDefinition`s into `featureRegistry`. No React, no
  styles, no DOM.
- `registerUI()` (`engine/features/ui.tsx:37-58`) — calls
  `injectEngineStyles()` to install the engine's Tailwind `@apply` rules
  into the host page's stylesheet AND registers six `componentId` ->
  React component bindings in `componentRegistry`.

## Consequences

- Apps choose React surface independently. Headless callers register
  features only; React apps register both.
- The two are independent — calling `registerFeatures()` without
  `registerUI()` produces a working engine surface; calling
  `registerUI()` without `registerFeatures()` produces panels that
  display feature metadata but no state (the feature has not been added
  to the store).
- The split is also a useful boot-order signal: a missing
  `registerUI()` produces "panel exists but components unmount" rather
  than a hard crash.
- The styles injection inside `registerUI()` is idempotent (browser
  CSSStyleSheet ops dedupe by selector) but runs once per call.
