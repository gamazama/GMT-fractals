# ADR-0033: WorkerProxy stub-after-extraction with registry singleton

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/worker/WorkerProxy.ts`

## Context

In stable, `WorkerProxy` fronted a real Web Worker that owned
`FractalEngine` + OffscreenCanvas. The engine extraction (dev/)
stripped the render worker wholesale. Downstream consumers — store
slices, UI components, hooks, ~30 files outside `engine/worker/` —
could not be cascade-edited without breaking the engine-extraction
milestone.

## Decision

Preserve the full API surface as a no-op stub in engine-core. Apps
that want real worker offload install over the stub via `setProxy`
/ `getProxy` — one shared singleton across imports. Generic dev/
code and engine-gmt's real-worker code both call `getProxy()` and
see the same instance.

## Consequences

- Generic code compiles and runs against the stub (picks return
  null, exports reject, `gpuInfo === 'Stub (no worker)'`).
- The host app's install site must run BEFORE any caller captures a
  reference, or stub / real diverge.
- The cross-fork `setEngineProxy(proxy as any)` cast at
  `engine-gmt/renderer/install.ts:61` is a structural-typing escape
  hatch; a shared `EngineProxy` interface would close that gap
  (followup q-078).
