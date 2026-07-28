# ADR-0006: registerFeatures as a side-effect import

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `app-gmt/main.tsx`, `app-gmt/registerFeatures.ts`, `store/createFeatureSlice.ts`

> **Update 2026-07-28 (freeze trigger corrected; decision unchanged):** The
> Decision section below says subsequent imports "trigger store construction,
> which freezes the registry". That is not the mechanism. `store/engineStore.ts`
> keeps the store lazy — `let _store: EngineStore | null = null` behind
> `ensureStore()` — and `createFeatureSlice` (the only caller of
> `featureRegistry.freeze()`) is reachable solely from `storeFactory` →
> `_makeStore()` → `ensureStore()`. So the freeze fires on the first store
> ACCESS (hook call / `getState` / `setState` / `subscribe`), not on module
> load. Importing `engineStore` is harmless: `app-gmt/registerFeatures.ts`
> imports it itself, hoisted above its own `registerGmtFeatures()` call, and
> app-gmt boots clean — if the documented mechanism were real, every boot would
> throw. Correspondingly, the first Consequences bullet describes the wrong
> failure: a direct `registerGmtFeatures()` call below the imports would not
> freeze the registry empty — it would run after some other module's first store
> access and throw `FeatureRegistryFrozenError` in dev (warn-and-no-op in prod).
> The decision — register via a side-effect import at the top of `main.tsx` — is
> unchanged and still correct: it is the only ordering that guarantees
> registration precedes any first access.

## Context

`createFeatureSlice` calls `featureRegistry.freeze()` immediately
after building slices. Any feature that registers after freeze is
invisible to the store. ES module import hoisting means the order
of `import` statements determines what runs before the first
`useEngineStore` access.

## Decision

Register all GMT features and formulas via a side-effect import at
the top of `app-gmt/main.tsx` (`import './registerFeatures'`). The
file's only job is its side-effects; it exports nothing. Subsequent
imports (`AppGmt → engineStore`) trigger store construction, which
freezes the registry.

## Consequences

- A future "call `registerGmtFeatures()` directly" refactor would
  silently freeze the registry empty — registry contract relies on
  import ordering being load-bearing.
- Not enforceable from TypeScript; documented in the boot-shell module
  doc.
