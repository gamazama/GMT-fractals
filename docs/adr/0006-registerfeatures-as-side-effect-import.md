# ADR-0006: registerFeatures as a side-effect import

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `app-gmt/main.tsx`, `app-gmt/registerFeatures.ts`, `store/createFeatureSlice.ts`

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
