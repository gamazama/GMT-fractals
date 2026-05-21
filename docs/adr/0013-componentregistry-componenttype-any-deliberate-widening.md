# ADR-0013: ComponentRegistry ComponentType<any> deliberate widening

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `components/registry/ComponentRegistry.tsx`

## Context

An earlier signature was `ComponentType<FeatureComponentProps> |
ComponentType<any>`. The union failed TypeScript's variance check —
the compiler couldn't pick a branch and forced an `as any` cast at
every register call site (28 across the project at the time).

## Decision

Widen the registry's component type to plain
`React.ComponentType<any>`. Bespoke panels (StateLibrary,
FormulaSelect, etc.) register with arbitrary prop shapes alongside
DDFS feature components; the registry doesn't try to type-narrow.
DDFS-driven panels still receive typed `FeatureComponentProps` by
virtue of how `AutoFeaturePanel` constructs the props object.

## Consequences

- Losing per-component prop typing at the registry boundary; gained
  28 dropped casts.
- The trade is documented at the component-type declaration
  (`components/registry/ComponentRegistry.tsx:15-21`).
