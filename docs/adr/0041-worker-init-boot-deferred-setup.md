# ADR-0041: Worker `INIT`/`BOOT` deferred-setup pattern

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/worker/renderWorker.ts`,
`engine-gmt/engine/worker/WorkerProxy.ts`

## Context

The render worker owns `FractalEngine` + `WebGLRenderer` +
`OffscreenCanvas`. Two timing problems:

- A Firefox sync-compile in flight can pin the GPU thread for tens of
  seconds. Any re-init during that window (preset load, hot-reload,
  restart()) would either deadlock waiting for the GPU or race with
  the in-flight compile.
- `OffscreenCanvas.transferControlToOffscreen` is one-shot. The proxy
  cannot reuse a canvas across worker tear-down/recreate, so it must
  know when to swap canvases vs reuse.

Apps also want to mount the WorkerDisplay component (and have it post
INIT) BEFORE the user has committed to a specific formula, to avoid a
visible "starting worker…" beat at first paint.

## Decision

Split worker startup into two messages:

- **`INIT`** — only stashes the init params in `_deferredInit` and
  replies `READY`. No engine, no renderer, no compile. Resize messages
  arriving between INIT and BOOT buffer in `_pendingResize`.
- **`BOOT`** — triggers `setupEngine()` which creates the renderer,
  engine, and starts the first compile.

`WorkerProxy.bootWithConfig` automatically calls `restart()` when
`_bootSent` is already true — replacing the canvas, terminating the
old worker (whose GPU compile drains on its own), creating a fresh one.
`_container` and `_lastInitArgs` are stashed during the first init for
the recursive restart path.

## Consequences

- Firefox users can cancel a stuck compile by triggering any path that
  reaches `bootWithConfig` (preset load, formula switch in some
  paths). The cost is one full worker tear-down + creation per cancel
  — acceptable vs a 14-second viewport freeze.
- The "INIT just stashes the message" rule is fragile: anything that
  handles a non-`INIT`/`BOOT` message before BOOT must defer or queue.
  The bucket-render-in-flight gate at
  `engine-gmt/engine/worker/renderWorker.ts:266-269` is the canonical
  example.
- Recursive restart loses the camera if `_container`/`_lastInitArgs`
  weren't set during init.
- Apps that want zero-spinner first paint mount WorkerDisplay early
  (INIT) and call `bootWithConfig` only after the formula picker
  resolves.
