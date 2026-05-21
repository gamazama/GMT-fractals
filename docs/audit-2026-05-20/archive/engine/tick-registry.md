---
source: engine/TickRegistry.ts
lines: 138
last_verified_sha: 6b23e85eac534ebed2161a0ad6d13adec5ff64e9
additional_sources:
  - engine/plugins/RenderLoop.tsx
audited: 2026-05-20T07:20:00Z
audited_by: claude-opus-4-7
public_api:
  - TICK_PHASE
  - type TickPhase
  - registerTick
  - runTicks
  - getTickManifest
  - RenderLoopDriver
  - RenderLoopDriverProps
depends_on: []
---

# Tick Registry + Render Loop

The tick registry is the engine's single source of per-frame ordering on the main thread. Every subsystem that does work each frame (animation, overlays, monitors) calls `registerTick(name, phase, fn)` against a module-scope singleton, and exactly one driver per realm calls `runTicks(delta)` to fan them out in fixed phase order (SNAPSHOT → ANIMATE → OVERLAY → UI). The bundled `<RenderLoopDriver />` plugin is the default RAF caller; apps with their own loop (R3F-based GMT, headless harness) skip the plugin and call `runTicks` themselves.

## Public API

- **`TICK_PHASE`** — frozen const object literal `{ SNAPSHOT: 0, ANIMATE: 1, OVERLAY: 2, UI: 3 }` whose numeric values define within-frame execution order; phases are integers so the sort comparator is `(a,b) => a.phase - b.phase` (engine/TickRegistry.ts:23-28).
- **`type TickPhase`** — `typeof TICK_PHASE[keyof typeof TICK_PHASE]`, i.e. `0 | 1 | 2 | 3`. Callers should use the `TICK_PHASE.*` constants, not raw integers (engine/TickRegistry.ts:30).
- **`registerTick(name, phase, fn): () => void`** — Adds a uniquely-named handler to the global registry, lazily flips the sort flag, and returns a disposer that splices the entry on cleanup. Silently no-ops (returns a no-op disposer) on duplicate names so HMR re-execution and double-mounted React effects don't accumulate ghosts (engine/TickRegistry.ts:53-87).
- **`runTicks(delta): void`** — Iterates the (lazily sorted) entry array and calls each `fn(delta)`. The `delta` argument is **seconds** per the R3F `useFrame` convention. The registry forwards it opaquely — no validation, no clamping, no per-handler try/catch (engine/TickRegistry.ts:98-122).
- **`getTickManifest(): Array<{phase, name}>`** — Debug helper. Returns the entries in execution order with phase names stringified for `console.table()` (engine/TickRegistry.ts:128-138).
- **`RenderLoopDriver`** — React component (renders `null`) that mounts a `requestAnimationFrame` loop and calls `runTicks(dtSec)` each frame. Optional `paused` predicate is held in a ref so the RAF loop never resubscribes when the predicate identity changes (engine/plugins/RenderLoop.tsx:27-56).
- **`interface RenderLoopDriverProps`** — `{ paused?: () => boolean }`. When `paused()` returns true, `runTicks` is skipped for the frame but the RAF loop itself keeps running, so play/pause has no resubscription cost (engine/plugins/RenderLoop.tsx:20-25).

## Architecture

- Phases are encoded as numeric constants, not strings, and ordering is via integer compare on the `phase` field (engine/TickRegistry.ts:23-28, 116).
- Sorting is lazy: `_needsSort` is flipped on every registration and consumed the next time `runTicks` or `getTickManifest` runs (engine/TickRegistry.ts:39, 82, 115-118, 130-133).
- Within a phase, execution order is registration order. There is no second "priority" parameter; the comparator only inspects `phase`, and V8/SpiderMonkey `Array.prototype.sort` is stable, so registration order is preserved (engine/TickRegistry.ts:53-57, 116).
- The registry is a module-scope singleton: `_entries`, `_needsSort`, `_firstRegisterTime`, `_lastTickTime`, `_warnedNoTicks`, and `_warnedDoubleRun` are all `let`/`const` bindings shared by every import of the module (engine/TickRegistry.ts:38-46, 93).
- The sibling module `engine-gmt/engine/TickRegistry.ts` is a re-export shim — `export * from '../../engine/TickRegistry'` — so the engine and engine-gmt forks share the one registry rather than each owning a private singleton. This is the F14 duplicate-module-state fix; see "Known issues" (engine/TickRegistry.ts:38).
- Duplicate names are silently dropped on re-registration: `_entries.some(e => e.name === name)` short-circuits the push, and the function returns a no-op disposer (engine/TickRegistry.ts:79).
- The disposer captures the entry object by reference and removes it via `indexOf` + `splice` so order of unregistration does not matter (engine/TickRegistry.ts:83-86).
- Dev-only "no ticks" warning: armed on the first `registerTick` call. If `_lastTickTime` is still 0 after a 3000 ms `setTimeout`, a single `console.warn` fires telling the developer to mount `<RenderLoopDriver />` or call `runTicks` themselves (engine/TickRegistry.ts:44-46, 58-77).
- Dev-only "double driver" guard: if two `runTicks` calls happen within `DOUBLE_RUN_WINDOW_MS = 1` ms of each other, the second is suppressed and a one-shot `console.warn` fires explicitly naming the `RenderLoopDriver + GmtRendererTickDriver` collision (engine/TickRegistry.ts:89-94, 99-113).
- The header carves out two ticks that intentionally live outside the registry: the DISPATCH step (`sendRenderTick`) stays in `WorkerTickScene` / `GmtRendererTickDriver` because it needs R3F camera serialization and `WorkerProxy` access; Navigation's `useFrame` runs at R3F priority 0 ahead of the registry because it handles camera physics tied to React hooks and refs (engine/TickRegistry.ts:12-16).
- `RenderLoopDriver` converts RAF milliseconds to seconds with an explicit `dtMs / 1000`, commented "TickRegistry consumers use seconds (R3F useFrame convention)" (engine/plugins/RenderLoop.tsx:36-44).
- First-frame dt: `lastTimeRef` is initialised on the very first RAF tick rather than at mount time, so the first `delta` is 0 instead of a multi-second value relative to navigation-start (engine/plugins/RenderLoop.tsx:29, 36-37).
- `paused` is mirrored into a ref via `useEffect`; the main RAF effect has an empty dependency array, so it never resubscribes when the predicate's identity changes (engine/plugins/RenderLoop.tsx:30, 33, 35, 53).
- Unmount cancels the pending RAF; the loop does not survive component removal (engine/plugins/RenderLoop.tsx:50-52).
- `RenderLoopDriver` renders `null`. It is purely an effect host (engine/plugins/RenderLoop.tsx:55).

## Invariants

- **Singleton scope is intentional but single-instance, not multi-instance.** Module-scope state means two engine boots in the same JS realm would share one tick list and the double-run guard would actively drop the second driver's calls — the multi-engine shape is not supported. Fork the worker instead. (engine/TickRegistry.ts:38-46, 93-113; see followup q-025).
- **Delta is seconds.** Every real caller passes seconds (`RenderLoopDriver` divides by 1000; `GmtRendererTickDriver` uses R3F's `useFrame` delta, which is already seconds, and clamps to `0.1`). The registry itself never inspects or rescales `delta`. A future driver that passes milliseconds would silently break every time-dependent tick. (engine/TickRegistry.ts:98-122, engine/plugins/RenderLoop.tsx:40-44; see followup q-022).
- **Exactly one tick driver per realm.** The double-run guard at `DOUBLE_RUN_WINDOW_MS = 1` catches the historical `RenderLoopDriver` + `GmtRendererTickDriver` footgun (both main-thread RAF, back-to-back within microseconds) but is not a defence against a future cross-context driver (e.g. worker-side RAF) landing on staggered timing — two RAFs at 60 Hz drift 0–16 ms apart, well outside the 1 ms window. (engine/TickRegistry.ts:89-94, 99-113; see followup q-023).
- **Duplicate `registerTick(name, ...)` returns a no-op disposer**, not an error. Caller code that relies on the disposer to clean up something else (e.g. close over an external listener) will silently fail on the duplicate path. The current consumers don't rely on this; future ones must be aware. (engine/TickRegistry.ts:79).
- **No phase boundary between handlers.** There is no per-phase setup/teardown, no try/catch, and no time-budget gate. A throw inside one tick aborts the rest of the frame's ticks. (engine/TickRegistry.ts:119-121).
- **Warn-once flags never reset.** `_warnedNoTicks` and `_warnedDoubleRun` are armed for the module's lifetime; an HMR cycle that doesn't re-execute the module won't re-warn after a fix-and-retry. (engine/TickRegistry.ts:46, 73, 93, 110).
- **`_lastTickTime` doubles as the no-ticks gate.** Every successful `runTicks` updates it, so as long as one driver is running, the 3-second "did you forget to mount the driver?" warning will not fire. This composition is correct but undocumented in the source (engine/TickRegistry.ts:65, 114).
- **No `installRenderLoop()` function exists.** The plugin ships as a JSX component (`<RenderLoopDriver />`), mounted in the React tree alongside other plugin components. Several existing docs (docs/engine/01_Architecture.md:90; docs/engine/03_Plugin_Contract.md:43,54) reference an imperative `installRenderLoop({ store })` that does not exist; see followup q-021. (engine/plugins/RenderLoop.tsx:27).
- **`paused` predicate is called every frame** while the RAF runs; expensive predicates will pay a per-frame cost even when paused. (engine/plugins/RenderLoop.tsx:43).

## Interactions with other subsystems

Outgoing: none. `TickRegistry.ts` imports nothing. `RenderLoop.tsx` imports `react` and the sibling `../TickRegistry`. The tick registry is a leaf substrate — every other engine subsystem depends on it, not the other way around. Hence `depends_on: []`.

Incoming (representative consumers; not exhaustive):

- **e03-animation** — `engine/animation/modulationTick.ts` registers `engine.animation` into `TICK_PHASE.ANIMATE` and forwards `delta` to `animationSystemTick` (the canonical timeline/LFO/modulation advancer). This is the per-frame work most sensitive to the seconds-vs-milliseconds contract.
- **g01-renderer** — `engine-gmt/renderer/GmtRendererTickDriver.tsx` is GMT's alternative driver (R3F `useFrame` instead of bare RAF); it also calls `runTicks(clampedDelta)`. Exactly one of `RenderLoopDriver` and `GmtRendererTickDriver` should be mounted per app — the double-run guard exists for this collision.
- **a01-boot-shell** (and sibling-app boots) — apps mount one driver. Today: `App.tsx` mounts `<RenderLoopDriver />`, `app-gmt/AppGmt.tsx` mounts `<GmtRendererTickDriver />`, `fluid-toy/FluidToyApp.tsx` mounts `<RenderLoopDriver />`. No app mounts two.

## Known issues / Phase 2 carry-in

- **drift / doc-rewrite-target** — `docs/engine/01_Architecture.md:83` describes `runTicks(deltaMs)`; the contract is seconds, not milliseconds (engine/TickRegistry.ts:98; engine/plugins/RenderLoop.tsx:40-44). Originating: followup q-022; also recorded in `phase-2-carry-in.json` under both `e02-tick-registry` and `e10-engine-features`.
- **drift / doc-rewrite-target** — `docs/engine/04_Core_Plugins.md:206` shows a synthetic example `runTicks(16.67)` which only makes sense if the unit were milliseconds; treated as seconds it's a 16.67-second frame. Originating: followup q-022. Suggested rewrite: `runTicks(1/60)`.
- **drift / doc-rewrite-target** — `docs/engine/01_Architecture.md:90` and `docs/engine/03_Plugin_Contract.md:43,54` reference an imperative `installRenderLoop({ store })` that does not exist anywhere in the source tree. Doc 04 (line 197) already acknowledges this with a comment; docs 01 and 03 were not updated to match. Originating: followup q-021. (engine/plugins/RenderLoop.tsx:27).
- **drift / doc-rewrite-target** — The dev-warning string at `engine/TickRegistry.ts:71` cites `docs/01_Architecture.md § render-loop`. No `docs/01_Architecture.md` exists at the docs root; the canonical path is `docs/engine/01_Architecture.md` and the canonical heading is `## The render-loop contract` (line 81). Originating: followup q-024.
- **cleanup** — Warn-once flags (`_warnedNoTicks`, `_warnedDoubleRun`) never reset across the module's lifetime. After a fix-and-retry inside a single dev session, the warning is silent forever. Low-priority developer-experience nick. (engine/TickRegistry.ts:46, 93; observed in followup q-023).
- **doc-rewrite-target** — The single-instance contract (one realm, one engine, one driver, one registry) is implicit. It is true in the `engine-gmt/engine/TickRegistry.ts` re-export shim header, the double-run warn message, and the F14 audit's framing of duplicate module-state as a bug — but no doc page states it out loud. `docs/engine/01_Architecture.md § The render-loop contract` is the obvious home. Originating: followup q-025.

## Historical context

For the design rationale behind the tick-registry — five engine design principles, the three-tier model (core / core-plugins / apps), the "opinions we're NOT holding" list, the GMT-as-senior-dependency framing for porting, and the aspiration that GMT itself eventually ports as a plugin onto the engine — see `docs/engine/01_Architecture.md` (the section `## The render-loop contract` at line 81 is the direct counterpart to this module doc).

That doc preserves several rationale items not duplicated here:

- The five rules ("generic by default, hoist patterns at first duplicate, no duplicate UX, follow GMT patterns when porting, apps write features") and their rationale, especially "hoist patterns at first duplicate" with `trackBinding.ts` as the canonical example.
- The explicit "opinions we're NOT holding" list (renderer, routing, theming, state library, build tool).
- The rejection rationale for minimal-core and opinionated-engine alternatives, and the GMT-as-senior-dependency framing.
- The aspiration that GMT itself eventually ports onto the engine as a plugin with minimal formula-specific rewriting.

That doc is foundational architecture rationale and is preserved as-is. This module doc supersedes it only for the API surface and current-code invariants of the tick registry; design-rationale claims stay there.
