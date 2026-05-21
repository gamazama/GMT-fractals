# ADR-0042: `_offsetGuarded` drift-converged sync (no timeout fallback)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/worker/WorkerProxy.ts`

## Context

Main-thread overlays (gizmos, picking rays, distance-measure pills)
draw against the camera offset; the worker renders against its own
offset value transmitted via RENDER_TICK. After a `setShadowOffset`
(e.g. orbit-mode camera absorb, fly-mode teleport, preset load), there
is a window where the worker's `FRAME_READY` echoes the OLD offset value
while the new one is still being applied. A naive sync would race and
the overlay would briefly snap-back to the pre-set position.

Initial design used a 2-second auto-clear on `_offsetGuarded`. That
caused an F15 fly-mode bug: a slow worker tick could deliver a stale
`FRAME_READY` past the 2s mark, and the overlay would re-sync to the
old offset, overwriting a fresh teleport.

## Decision

`WorkerProxy._offsetGuarded` is set when `setShadowOffset` fires and
cleared ONLY when the worker's reported offset converges within 0.001
of the set value. No timeout, no auto-clear. While guarded, FRAME_READY
does NOT update `_localOffset`. (`engine-gmt/engine/worker/WorkerProxy.ts:51-53,
208-222, 554-567`.)

## Consequences

- Cleanly handles orbit-mode camera absorb, fly-mode teleport, and any
  path that imperatively writes a new offset.
- The previous 2s auto-clear is gone — F15 fly-mode no longer regresses
  on slow ticks.
- Trade-off: if the worker NEVER reports the converged offset (worker
  crash, suspended tab), `_offsetGuarded` stays set forever. The
  gizmo overlay would then stick at the last set value and ignore all
  subsequent FRAME_READY data. Mitigation: `terminateWorker` clears
  every pending Map including this state on hard teardown. The
  `_handleWorkerCrash` path also clears it.
- Future code that adds a new "set offset and stop listening for a
  while" pattern should reuse this guard rather than introducing a
  parallel one.
