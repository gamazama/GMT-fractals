# ADR-0040: Two-stage shader compile (preview + async full) with three strategies

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/CompileScheduler.ts`,
`engine-gmt/engine/MaterialController.ts`

## Context

Heavy GMT shaders take 3-15 seconds to compile under
`KHR_parallel_shader_compile`-supported browsers, and synchronously up
to ~14 seconds on Firefox where the extension's behaviour is degraded.
A single-stage compile freezes the viewport for the duration. Apps
want sub-second visual feedback after every formula switch.

Multiple compile triggers must be served:

- **Formula switch** — full rebuild needed; user has committed to the
  new fractal.
- **Param-only change** — current shader still valid; recompile, but the
  user is still looking at the old shader's last frame.
- **Mode flip** (Direct↔PathTracing) — recompile, mode-only state change.

## Decision

`CompileScheduler` runs three strategies:

- **`keepCurrent`** — parallel compile + same formula + prior compile
  done — keep current shader on screen during async swap; modular uniform
  sync deferred until AFTER `swapFullMaterial` to avoid corrupting the
  still-rendering shader's slot mapping.
- **`twoStage`** — parallel compile + new formula — swap to lighting-off
  preview material in ~1 frame (compiles in <1s on Windows/Chrome
  because fxc DCEs all formula copies from lighting paths), build full
  on a hidden scene, hot-swap when `compileAsync` resolves.
- **`singleStage`** — Firefox sync compile OR lighting already off
  (preview == full). The viewport blocks, the spinner shows "Compiling
  Shader…".

A generation counter discards in-flight compiles when newer ones arrive,
but only protects post-async-yield code. `lastCompiledFormula` includes
the interlace formula id so hybrid-id changes trigger rebuilds
correctly. Spinner messaging differs between strategies ("Loading
Preview…" vs "Compiling Shader…").

## Consequences

- Shader compile is no longer a viewport-freezing event under
  Chrome/Edge. Firefox users still see the freeze (no parallel-compile
  workaround possible).
- The modular-uniform-sync-after-swap rule is load-bearing — syncing
  during async compile corrupts the still-rendering old shader's slot
  mapping. `keepCurrent` defers sync, then runs it inside
  `swapFullMaterial` callback.
- Compile-telemetry log lines at
  `engine-gmt/engine/CompileScheduler.ts:238-239,330-331` are marked
  do-not-remove (used as profiling waypoints in `debug/bench-shader.mts`).
- Adding a fourth strategy requires picking carefully where in the
  branch tree it fits and what its sync rules are; the three strategies
  are not interchangeable.
- The `MaterialController.compilePreview()` returning `false` (preview
  == full) is the load-bearing signal that drops to single-stage —
  scheduler callers must respect the return.
