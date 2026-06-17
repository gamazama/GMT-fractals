---
subsystem_id: e02-tick-registry
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/TickRegistry.ts
    blob_sha: 6b23e85eac534ebed2161a0ad6d13adec5ff64e9
    lines_read: [1, 138]
  - path: engine/plugins/RenderLoop.tsx
    blob_sha: 58d5cc91c06439a53b903ea0fdf1686c82721637
    lines_read: [1, 56]
---

## Public API surface

- `TICK_PHASE` — const object literal `{ SNAPSHOT:0, ANIMATE:1, OVERLAY:2, UI:3 }` (engine/TickRegistry.ts:23-28)
- `type TickPhase = typeof TICK_PHASE[keyof typeof TICK_PHASE]` (engine/TickRegistry.ts:30)
- `registerTick(name: string, phase: TickPhase, fn: (delta:number) => void): () => void` — returns an unregister disposer (engine/TickRegistry.ts:53-87)
- `runTicks(delta: number): void` — runs all entries in phase order (engine/TickRegistry.ts:98-122)
- `getTickManifest(): Array<{phase: string; name: string}>` — debug helper, ordered (engine/TickRegistry.ts:128-138)
- `interface RenderLoopDriverProps { paused?: () => boolean }` (engine/plugins/RenderLoop.tsx:20-25)
- `const RenderLoopDriver: React.FC<RenderLoopDriverProps>` — mounts a RAF loop calling `runTicks(dtSec)` (engine/plugins/RenderLoop.tsx:27-56)

## Architecture

- Phases are encoded as numeric constants, not strings, and `runTicks` sorts entries by ascending `phase` integer (engine/TickRegistry.ts:23-28, 116).
- Sorting is lazy: `_needsSort` is flipped on registration and consumed on the next `runTicks` (or `getTickManifest`) call (engine/TickRegistry.ts:39, 82, 115-118, 130-133).
- Within a phase, execution order is registration order — there is NO secondary "priority" parameter; sort is a plain `(a,b) => a.phase - b.phase` which is not stable across engines in general but Array.prototype.sort in V8/SpiderMonkey is stable, so registration order is preserved (engine/TickRegistry.ts:116).
- Duplicate names are silently dropped on re-registration — registry returns a no-op disposer in that case, making it HMR-safe (engine/TickRegistry.ts:79).
- The disposer captures the entry object and uses `indexOf` + `splice` to remove (engine/TickRegistry.ts:83-86).
- Module-level state: a single shared `_entries` array — the registry is a process-wide singleton, not per-engine-instance (engine/TickRegistry.ts:38).
- Dev-only "no ticks" warning is armed on the first `registerTick` call; if `_lastTickTime` is still 0 after 3000 ms a console.warn fires once (engine/TickRegistry.ts:44-46, 61-77).
- The warn message explicitly directs users to mount `<RenderLoopDriver />` from `engine/plugins/RenderLoop` (engine/TickRegistry.ts:66-72).
- Double-driver guard: if two `runTicks` calls happen within `DOUBLE_RUN_WINDOW_MS = 1` ms of each other, the second is suppressed and a one-shot dev warning fires (engine/TickRegistry.ts:93-94, 99-113).
- Delta unit contract is "seconds" per R3F `useFrame` convention; `RenderLoopDriver` converts RAF milliseconds with `dtMs / 1000` before calling `runTicks` (engine/plugins/RenderLoop.tsx:40-44).
- `RenderLoopDriver` exposes an optional `paused` predicate; when it returns true the RAF keeps running but `runTicks` is skipped that frame (engine/plugins/RenderLoop.tsx:22-25, 43-44).
- `paused` is held in a ref synced via `useEffect` so the RAF loop never resubscribes when the predicate identity changes (engine/plugins/RenderLoop.tsx:30-33).
- The RAF loop captures the first frame's `t` into `lastTimeRef` so the very first dt is 0 rather than a huge value relative to navigation-start (engine/plugins/RenderLoop.tsx:36-37).
- Cleanup cancels the pending RAF on unmount (engine/plugins/RenderLoop.tsx:50-52).
- The driver component renders `null` — it is purely an effect host (engine/plugins/RenderLoop.tsx:55).
- The module header explicitly carves out the DISPATCH step (sendRenderTick) as staying in `WorkerTickScene` because it needs R3F camera serialization and proxy access (engine/TickRegistry.ts:12-13).
- The header also notes Navigation's `useFrame` is intentionally separate at R3F priority 0, running BEFORE the registry (engine/TickRegistry.ts:15-16).

## Invariants and gotchas

- **Singleton state**: `_entries`, `_needsSort`, and the warn flags are module-scope; two engine instances in the same JS realm share one tick list. Tests that import the module multiple times via re-execution will re-register but be de-duped by name (engine/TickRegistry.ts:38-46, 79).
- **No phase boundary between handlers**: there's no per-phase setup/teardown, no try/catch, and a throw inside one tick aborts the rest of the frame's ticks (engine/TickRegistry.ts:119-121).
- **Delta is whatever the caller passes** — registry doesn't validate or clamp. `RenderLoopDriver` passes seconds; a worker driver could pass anything and break time-dependent ticks (engine/TickRegistry.ts:98, engine/plugins/RenderLoop.tsx:41-44).
- **Double-run window is hard-coded to 1 ms** — any two drivers running within the same frame will trip it, but two drivers running at slight offsets (e.g. one in worker rAF + one in main rAF) might NOT trigger the guard and silently double-tick (engine/TickRegistry.ts:94, 99-113).
- **Warn-once flags never reset** — `_warnedNoTicks` and `_warnedDoubleRun` are armed for the lifetime of the module; HMR that doesn't re-execute the module won't re-warn (engine/TickRegistry.ts:46, 93).
- **`registerTick` with same name returns no-op disposer** — caller code that relies on the disposer to clean up will silently fail on the duplicate path (engine/TickRegistry.ts:79).
- **No "priority within phase" parameter** despite the doc claim — only `phase` (engine/TickRegistry.ts:53-57).
- **`paused` predicate is called every frame** while RAF runs; expensive predicates will cost a per-frame call (engine/plugins/RenderLoop.tsx:43).

## Drift from existing doc (dev/docs/engine/01_Architecture.md)

| Doc claim | Current code | Severity |
|---|---|---|
| "Plugins register via `tickRegistry.register(phase, priority, handler)`" (01_Architecture.md:101) | Export is `registerTick(name, phase, fn)` — there is no `tickRegistry` namespace and no `priority` parameter (engine/TickRegistry.ts:53-57) | break |
| "Within a phase, lower priority runs first." (01_Architecture.md:101) | No priority concept exists; within-phase order is registration order via stable sort (engine/TickRegistry.ts:116) | break |
| "`tickRegistry.runTicks(deltaMs)` each frame" (01_Architecture.md:83) | Function is exported as bare `runTicks` and consumers use **seconds**, not ms — the `dtMs / 1000` conversion in RenderLoopDriver is explicit about this (engine/TickRegistry.ts:98, engine/plugins/RenderLoop.tsx:40-44) | break |
| "phase order SNAPSHOT → ANIMATE → OVERLAY → UI" (01_Architecture.md:83, 95-99) | Matches: SNAPSHOT=0, ANIMATE=1, OVERLAY=2, UI=3 (engine/TickRegistry.ts:23-28) | info |
| "Default `@engine/render-loop` plugin … mounts a `<RenderLoopDriver />` component" (01_Architecture.md:87-91) | Component exists and is exported (engine/plugins/RenderLoop.tsx:27) | info |
| "One line at boot: `installRenderLoop({ store: engineStore });`" (01_Architecture.md:88-91) | No `installRenderLoop` function found in this module — only `RenderLoopDriver` JSX component. Either `installRenderLoop` lives elsewhere or the doc shows API that doesn't exist in this file | warn |
| "assertion in dev that warns after 3 seconds of no ticks" (01_Architecture.md:93) | Implemented exactly (engine/TickRegistry.ts:61-77) | info |
| "engine does not spawn a RAF loop … core does NOT drive RAF" (01_Architecture.md:83, 175) | TickRegistry itself spawns nothing; RAF lives in the plugin (engine/plugins/RenderLoop.tsx:36-49) | info |

## Open questions

- Where is `installRenderLoop({ store })` defined? It's referenced in 01_Architecture.md:90 but not present in engine/plugins/RenderLoop.tsx. Is it a barrel re-export, a helper in `engine/plugins/index.ts`, or stale doc?
- Does any app pass a non-second `delta` into `runTicks` (e.g. a worker-driven tick using milliseconds), and if so are the tick callers tolerant?
- Is the 1 ms double-run window wide enough in practice? If two drivers run on staggered RAFs (e.g. main + offscreen), the guard might never trigger.
- The dev warning message at TickRegistry.ts:71 cites `docs/01_Architecture.md § render-loop` — is that the canonical path now that docs live at `docs/engine/01_Architecture.md`?
- Is the singleton module-scope state intentional for multi-engine-instance scenarios (e.g. multiple Three.js canvases in one page)? If so, how do apps avoid cross-engine tick bleed?
