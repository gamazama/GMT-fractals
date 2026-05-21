# ADR-0036: `defineFeature` identity helper preserves param literal types

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine/features/setFeature.ts`, all bundled `engine/features/*` files

## Context

`setFeature(feature, patch)` and `getFeature(feature)` aim to provide
typed access to feature state: autocomplete on param keys, compile-time
validation of patch values, no `(state as any)` casts. The naive
declaration

    export const DemoFeature: FeatureDefinition = { id: 'demo', params: {…}, … };

widens the `params` field to `Record<string, ParamConfig>` and erases
the per-key value types. `setFeature` then degrades to `Partial<unknown>`-
shaped patches with no autocomplete and no compile-time validation.

Alternatives considered:

- **Generic factory function** with required generic param: forces every
  call site to supply the generic, defeating inference.
- **Type-only helper** (`type DefineFeature<…> = …`): can't be applied to
  a value declaration, only a type.
- **Identity function with inferred generic** (chosen path).

## Decision

Ship `defineFeature<P>(def)` as a no-op identity helper
(`engine/features/setFeature.ts:52-54`):

    export const defineFeature = <P extends Record<string, ParamConfig>>(
        def: Omit<FeatureDefinition, 'params'> & { params: P },
    ): typeof def => def;

Authors call `defineFeature({ id: …, params: {…}, … })` instead of
annotating the variable with `: FeatureDefinition`. The generic `P
extends Record<string, ParamConfig>` captures the literal `params` shape
so `FeatureState<F>` mapped types resolve correctly.

## Consequences

- Two APIs coexist: `defineFeature(…)` for typed access, `: FeatureDefinition`
  for legacy. The six bundled feature files (`post_effects.ts`,
  `color_grading.ts`, `audioMod/index.ts`, `modulation/index.ts`,
  `webcam/index.ts`, `debug_tools/index.ts`) still use the legacy
  annotation — the helper is offered for new app/plugin features rather
  than back-applied.
- Typed `setFeature(…)` access only works for features authored with
  `defineFeature(…)`. Bundled features still use untyped patch shapes;
  this is acceptable because the bundled set is closed-set and small.
- Zero runtime cost — identity function returns its argument unchanged.
