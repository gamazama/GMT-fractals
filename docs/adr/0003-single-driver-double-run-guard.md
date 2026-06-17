# ADR-0003: Exactly one tick driver per realm, enforced by a 1ms double-run guard

**Date:** 2026-05-20 _(retroactive — captures a guard added during the F14
fragility-audit pass after `RenderLoopDriver` + `GmtRendererTickDriver`
double-mount was observed in practice.)_
**Status:** Accepted
**Scope:** `engine/TickRegistry.ts`

## Context

Two RAF-driven tick drivers mounted in the same app call `runTicks` twice per
frame, making `dt`-based work advance at 2× wall-clock. The historical
collision was `RenderLoopDriver` + `GmtRendererTickDriver` both being mounted
during the engine extraction transition; the symptom (animation timeline and
modulation advancing 2× faster) is silent unless someone notices.

Apps that intentionally use a custom driver (worker-driven, headless test
harness) must still be able to call `runTicks` from their own loop — so the
solution can't reject a single legitimate driver, only the second one within
a frame.

## Decision

A double-run guard suppresses any `runTicks` call that arrives within
`DOUBLE_RUN_WINDOW_MS = 1` of the previous one. The second call is silently
dropped; in DEV mode a one-shot `console.warn` fires explicitly naming the
canonical RenderLoopDriver + GmtRendererTickDriver collision case
(`engine/TickRegistry.ts:89-94`, `99-113`).

## Consequences

- Sub-millisecond double-mount is caught and surfaces a clear DEV warning.
- A future driver that lands on **staggered timing** (e.g. two RAF loops at
  60Hz drifting 0-16ms apart) sits well outside the 1ms window and is NOT
  caught. This is acceptable today because no such configuration is wired,
  but it's the next failure mode if anyone adds a worker-side RAF.
- The DEV warning is one-shot — once `_warnedDoubleRun` flips, no further
  warnings fire in the same module lifetime. HMR may or may not reset this
  depending on whether the module is re-executed.
- See followup q-023 (`plans/doc-audit-state/survey/_followups/q-023.md`) for
  the audit-time investigation.
