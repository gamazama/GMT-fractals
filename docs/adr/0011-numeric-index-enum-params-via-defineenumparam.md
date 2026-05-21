# ADR-0011: Numeric-index enum params via defineEnumParam

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/defineEnumParam.ts`

## Context

Slice values for "enum" params (e.g. estimator mode, precision mode)
need a compact representation. String-typed enums require a separate
`ParamType` variant and special handling in sanitisation, uniform
routing, and the auto-setter. Numeric indices are uniform with
`float` params throughout the pipeline and trivially serialisable.

## Decision

No string-typed enum codepath. `defineEnumParam(values, label, opts)`
synthesises a `type: 'float'` `ParamConfig` with `options: [{label,
value: i, hint}]` and returns `fromIndex` that clamps NaN /
out-of-range back to the default. Apps map the integer to the
canonical string at the engine boundary (e.g. before emitting a
`formula` to the worker).

## Consequences

- One extra indirection at every consumer site that needs the string
  form.
- Serialised presets carry integers, not enum names — preset
  migrations must remap if the tuple order changes.
- Type safety is opt-in via `EnumParam<typeof Values>`.
