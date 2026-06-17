# ADR-0034: Opaque types at the worker boundary

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/worker/WorkerProxy.ts`

## Context

`EngineRenderState`, `BucketRenderConfig`, `SerializedCamera`,
`SerializedOffset` could carry richer types (the real worker fills
`EngineRenderState` with many fields), but the stub doesn't know
them and freezing the shapes would force engine-core changes every
time the real engine grew a field.

## Decision

Keep the four shapes deliberately minimal —
`EngineRenderState = Record<string, unknown>`,
`virtualSpace: unknown | null`, `pipeline: unknown | null`. The real
worker fills the gaps; the stub stays generic.

## Consequences

- Apps re-introducing a real engine swap richer types without
  touching the contract.
- No compile-time validation of `EngineRenderState` shape — callers
  rely on convention.
