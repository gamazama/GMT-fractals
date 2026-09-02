---
paths:
  - "engine/worker/**"
  - "engine-gmt/engine/worker/**"
---

# Worker contract

Read first: JSDoc on `engine/worker/WorkerProxy.ts` (proxy stub + `getProxy`/
`setProxy` registry, `EngineRenderState`), `engine/worker/ViewportRefs.ts`
(camera/canvas refs, display-camera snapshot, `mouseOverCanvas`) and
`engine-gmt/engine/worker/WorkerExporter.ts` (bucket export).

Decisions: ADRs 0034-0035, 0041-0042, ADR-0045 (bucket render + export).

## Invariants

- **Don't bypass the event bus to talk to the worker.** `engine.setUniform` on the
  engine-core stub is a no-op. UI and animation code goes through `FRACTAL_EVENTS`
  so engine-gmt's bridge forwards it.
- **Capabilities are a formal wire contract.** `REGISTER_FORMULA` carries them;
  they used to be silently dropped. `supportsDifs` is now the `estimator:difs`
  token. Adding a capability means updating the wire contract, not a side channel.
- Engine-core stub vs engine-gmt real is a genuine type-graft. Casts here are
  sometimes legitimate — document why at the cast site.
- **Never `const engine = getProxy()` at module scope.** `setProxy()` (called
  from `engine-gmt/renderer/install.ts`) only redirects LATER calls; a
  module-scope capture freezes the no-op stub forever. This is live today in
  `store/engineStore.ts:29` and `store/slices/historySlice.ts:43` — see the
  `@bug PRODUCTION:` on `setProxy` in `engine/worker/WorkerProxy.ts`. Call
  `getProxy()` inside the function that needs it.

## Guards

```
npm run smoke:compile-failed    # boots app-gmt: a failed compile sets proxy.lastCompileFailed
                                # (ERROR postMessage → COMPILE_FAILED) and a good one clears it
npm run smoke:export-watchdog   # boots app-gmt: the per-frame export stall watchdog
                                # (WorkerProxy) and the EXPORT_HEARTBEAT it keys on
                                # (WorkerExporter), plus one real frame on the live worker
```

`renderExportFrame` had no timeout until 2026-09-02: a dropped EXPORT_FRAME_DONE
left the export dialog pending forever. The watchdog is a NO-PROGRESS window
(60 s default, `opts.stallMs`), not a ceiling — a frame that keeps beating is
never aborted however long a 4K path-traced frame takes. Heartbeats come from
inside the sample loop about once per second of GPU time.

## Main thread must mirror worker reality

Two render-loop stall bugs both came from main-thread gates that had drifted from
what the worker was actually doing. If you add a gate on one side, check the other.