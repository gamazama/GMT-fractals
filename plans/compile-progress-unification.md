# Compile Progress Unification

> **Status: SHIPPED (2026-05-01).** This document is the design record. See the *What shipped* section at the bottom for what landed and any deltas from the original plan. For ongoing reference, the canonical doc lives in `docs/gmt/02_Rendering_Internals.md` § *Compile Spinner Gate*.

## Problem

Two independent spinner systems with overlapping responsibilities, no shared state, and a boot path that bypasses the progress machinery entirely.

### Current systems

**LoadingScreen** (`app-gmt/LoadingScreen.tsx`)
- Visible from page load until `isReady` (worker booted + first compile done).
- Progress bar = pure 2.5 s linear timer (`dt * 100/2500` per rAF). Cosmetic only.
- After 100 % the bar idles while waiting on `isReady`.
- Has its own boot-trigger logic that is currently dead in `dev/` because `AppGmt.tsx` passes `bootEngine={() => {}}` and `isHydrated={true}`.

**CompilingIndicator** (`components/CompilingIndicator.tsx`)
- Toast at top-center, z-99999 (sits above LoadingScreen).
- Progress = exponential approach to 95 %: `p = 95 * (1 - exp(-3 * elapsed / estimateMs))`.
- Snaps to 100 % when worker emits `IS_COMPILING(false)`.
- Estimate comes from `compile_estimate` event (`ConfigManager.flushRebuildLog`). Default 15 s before first delivery.
- Cycle is **only** started when `compileGate.consumeNewCycle()` returns true — i.e. when a store action called `compileGate.queue()`.

### Verified bugs

1. **Boot bypasses CompileGate.** `gmtRenderer.boot()` is called from a top-level `setTimeout(100ms)` in `app-gmt/main.tsx`. The worker compiles and emits `IS_COMPILING('Loading Preview…')`, but `compileGate.queue()` was never called, so `consumeNewCycle()` returns false and the indicator's `setInterval` is never started. Result: toast shows "Loading Preview… 0 %" frozen for the entire 12-23 s Firefox compile, snaps to 100 % when done.

2. **Two visible spinners during boot.** LoadingScreen 2.5 s timer ticks 0→100 underneath while CompilingIndicator sits at 0 % above. Visually contradictory.

3. **First compile uses 15 s default estimate.** `compile_estimate` is fired during `ConfigManager.flushRebuildLog`, *during* a rebuild. For boot-time compile the indicator never enters a cycle so the event is ignored. For subsequent recompiles the estimate arrives in time.

4. **`AppGmt.tsx` bypasses `useAppStartup`.** Real hook exists at `dev/hooks/useAppStartup.ts` but is not wired in. Boot is fired top-level instead of from React lifecycle. Hardcoded `isHydrated={true}` defeats LoadingScreen's hydration gate.

5. **CompileGate's queue/flush is asymmetric.** `queue()` always emits `IS_COMPILING`; `flush()` is best-effort via `pingRef → rAF → setTimeout(0)` plus a 300 ms safety timer. If the spinner DOM never commits (component unmount before paint), the queued work fires anyway via the safety timer — but if the work is never flushed, the IS_COMPILING was already emitted with no matching `false`.

6. **`IS_COMPILING` payload (`boolean | string`) doesn't distinguish "new cycle" from "phase change".** CompilingIndicator heuristically derives this from `(consumeNewCycle, wasActive, awaitingFlush)`, which is brittle.

## Goal

One state machine. Both views read from it. Boot path enters it. Real estimate from frame 1.

## Design: `CompileProgressStore`

A small Zustand store. The progress *formula* is a derived selector — both views can render it however they like (linear bar in LoadingScreen, exp-curve in CompilingIndicator) but they read the same elapsed/estimate/done state.

```ts
// store/CompileProgressStore.ts
interface CompileProgressState {
    phase: 'idle' | 'compiling' | 'done';
    message: string;            // 'Loading Preview…' | 'Compiling Lighting…' | …
    startedAt: number | null;   // performance.now() at start
    estimateMs: number;         // current estimate
    doneAt: number | null;      // performance.now() at finish
    cycleId: number;            // increments per cycle — used for ref-callback dep keying

    // Actions
    start(message: string, estimateMs: number): void;
    setMessage(message: string): void;
    finish(): void;
    reset(): void;              // hard reset back to idle
}
```

Selector:

```ts
// Returns 0..100. Asymptotic to 95 % until finish() is called, then 100.
export const selectProgress = (s: CompileProgressState, now: number): number => {
    if (s.phase === 'idle') return 0;
    if (s.phase === 'done') return 100;
    if (!s.startedAt) return 0;
    const t = (now - s.startedAt) / Math.max(1, s.estimateMs);
    return Math.min(95, 95 * (1 - Math.exp(-3 * t)));
};
```

Both views poll `selectProgress(state, performance.now())` per rAF (or per `setInterval(60ms)`).

### Lifecycle

```
                                 ┌──────────────────────┐
   compileGate.queue(msg, work)──┤ start(msg, estimate) │
   gmtRenderer.boot()────────────┤ phase: compiling      │
                                 └──────────┬───────────┘
                                            │
   worker IS_COMPILING(string) ─────────────┤ setMessage(string)
                                            │
                                 ┌──────────▼───────────┐
   worker IS_COMPILING(false) ───┤ finish()             │
                                 │ phase: done          │
                                 │ doneAt: now          │
                                 └──────────┬───────────┘
                                            │ (consumers fade out)
                                 ┌──────────▼───────────┐
   reset() (after fade) ─────────┤ phase: idle          │
                                 └──────────────────────┘
```

## Plan

### Phase 1 — wire boot through CompileGate (smallest change, fixes the 0 % bug)

**Touch:** `app-gmt/main.tsx`, `engine-gmt/engine/managers/ConfigManager.ts` (or new helper), `store/CompileGate.ts` (no behavioral change yet).

1. In `main.tsx`, before the setTimeout(100ms), compute the boot estimate:
   ```ts
   const bootEstimateMs = estimateCompileTime(useEngineStore.getState());
   FractalEvents.emit('compile_estimate', bootEstimateMs);
   compileGate.queue('Loading Preview…', () => gmtRenderer.boot(config, cam));
   ```
2. Push the offset-set inside the `queue()` work closure too, so it fires after spinner paints:
   ```ts
   compileGate.queue('Loading Preview…', () => {
       gmtRenderer.boot(config, cam);
       proxy.setShadowOffset(precise);
       proxy.post({ type: 'OFFSET_SET', offset: precise });
   });
   ```
3. Verify on Firefox: the CompilingIndicator now animates from 0 → 95 % over the estimated boot time, snaps to 100 when done.

**Risk:** `gmtRenderer.boot()` was previously synchronous-from-main. Now it's deferred until after the indicator's first paint (`pingRef → rAF → setTimeout(0)`). That's a few hundred ms at most. The LoadingScreen itself still renders normally during this delay. No race because `proxy.initWorkerMode` already ran from `<GmtRendererCanvas />` mount before `setTimeout(100ms)` fires.

**Test plan:**
- [ ] Firefox: on page load, top-center spinner animates 0→95 % → snap 100 % rather than freezing at 0 %.
- [ ] Chrome: behavior unchanged (compile finishes inside parallel, snap to 100 fast).
- [ ] Formula switch from a hot state (post-boot): no regression.
- [ ] Scene load via drag/drop: no regression.

### Phase 2 — wire `useAppStartup` into AppGmt

**Touch:** `app-gmt/AppGmt.tsx`, `app-gmt/main.tsx`.

1. Move the boot logic out of main.tsx top-level into `useAppStartup` (the dev/ hook already exists and mirrors stable's).
2. AppGmt:
   ```tsx
   const { startupMode, bootEngine, isHydrated } = useAppStartup(isSceneReady);
   …
   <LoadingScreen
       isReady={isSceneReady}
       onFinished={handleLoadingFinished}
       startupMode={startupMode}
       bootEngine={bootEngine}
       isHydrated={isHydrated}
   />
   ```
3. `useAppStartup.bootEngine` calls `compileGate.queue('Loading Preview…', () => engine.bootWithConfig(...))` (uses Phase 1 plumbing).
4. Delete the top-level setTimeout in main.tsx.

**Risk:** main.tsx's bootPreset hydration runs before React mounts (top-level `loadScene({ preset })`); useAppStartup also runs hydration in a useEffect. Need to either:
   - keep main.tsx's hydration and have useAppStartup detect "already hydrated" via `_hydratedRef`, OR
   - move hydration into useAppStartup entirely (matches stable).

Recommendation: move into useAppStartup. Stable does this and the pattern is documented to work.

**Test plan:**
- [ ] Page loads with default formula; LoadingScreen fades when ready (no 30 s polling timeout).
- [ ] `#s=` URL boot: shared scene loads correctly.
- [ ] Formula picker in LoadingScreen: switching before progress hits 100 % defers boot to selected formula (mirrors stable's `handleSelectFormula` flow which currently has dead `bootEngine` calls in dev/).

### Phase 3 — introduce `CompileProgressStore`

**Touch:** new file `store/CompileProgressStore.ts`. CompileGate, CompilingIndicator, LoadingScreen, WorkerProxy, ConfigManager.

1. Create the store as sketched above.
2. Refactor `CompileGate.queue()` to call `compileProgress.start(message, estimateRef.current)` in addition to emitting IS_COMPILING. Keep IS_COMPILING for backward compat (other listeners).
3. Refactor `CompilingIndicator` to subscribe to `useCompileProgress()`:
   ```tsx
   const phase = useCompileProgress(s => s.phase);
   const message = useCompileProgress(s => s.message);
   // animation loop reads selectProgress(state, performance.now()) per rAF
   ```
   Drop: `setInterval`, `cycleGen`, `awaitingFlushRef`, `hasFlushedRef`. Keep: `pingRef → flush()` for the queued work.
4. Refactor `LoadingScreen`:
   - Remove the 2.5 s linear timer.
   - Read progress from `useCompileProgress` via the same selector.
   - On `phase === 'idle'` (before any compile started — shouldn't happen with Phase 1, but defensive), keep showing 0 %.
   - On `isReady`, fade out as today.
5. `WorkerProxy._handleWorkerMessage('COMPILING')`:
   - On `msg.status === false` → `compileProgress.finish()`.
   - On `msg.status === string` → `compileProgress.setMessage(msg.status)`.
   - Boot-init case: if `phase === 'idle'` when first string arrives, also start a cycle (defensive — shouldn't trigger after Phase 1).
6. `ConfigManager.flushRebuildLog` keeps emitting `compile_estimate`; CompileGate or CompileProgressStore listens and updates `estimateMs` for the *next* cycle.

**Risk:** the LoadingScreen losing its 2.5 s timer means the bar might hit 95 % much faster than today (Fastest profile ~3 s) or much slower (Ultra ~17 s+). User-visible behavior change. Acceptable because it's now *honest*.

**Test plan:**
- [ ] Cold boot Fastest preset: bar progresses smoothly to 95 % over ~3 s, snaps to 100 % when ready.
- [ ] Cold boot Ultra preset: bar progresses over ~17 s, doesn't appear stuck.
- [ ] Cold boot custom heavy preset on Firefox: bar tracks the actual long compile, no "stuck at 100 %" idle period.
- [ ] Switching formulas while LoadingScreen still visible: cycle restarts with new estimate.

### Phase 4 — robustness cleanup

**Touch:** `engine/worker/WorkerProtocol.ts`, `engine-gmt/engine/CompileScheduler.ts`, `engine/worker/WorkerProxy.ts`, `store/CompileGate.ts`.

1. Replace `IS_COMPILING: boolean | string` with a structured payload:
   ```ts
   COMPILING: { type: 'COMPILING'; status: 'start' | 'phase' | 'end'; message: string }
   ```
   - `CompileScheduler.perform()` emits `start` once, `phase` for "Compiling Lighting…", `end` on completion.
   - WorkerProxy maps each to the corresponding `compileProgress.*` action.
   - Backward-compat helpers: `IS_COMPILING` event is still emitted on FractalEvents bus (consumers like SHADER_CODE display might read it), but with cleaner semantics.
2. Make `CompileGate.queue()` return a thenable that resolves on flush, rejects on reset/cancel:
   ```ts
   queue(message, work): Promise<void>
   ```
   Lets callers `await` the spinner-paint cycle if needed.
3. Drop the 300 ms safety timer in `CompilingIndicator.pingRef` once (2) is in place — explicit cancel via `compileProgress.reset()` covers unmount.
4. Add a unit test for `CompileProgressStore`:
   - cycleId increments on each start
   - selectProgress monotonically non-decreasing within a cycle
   - finish() snaps to 100 regardless of elapsed
   - new start() before finish() → previous cycle's `doneAt` is null, new cycleId, progress restarts

**Test plan:**
- [ ] Existing render/shader tests pass.
- [ ] No console error during rapid formula switching.

### Phase 5 — fold `compile_estimate` into the store

**Touch:** `engine-gmt/engine/managers/ConfigManager.ts`, `store/CompileProgressStore.ts`.

1. Make `CompileProgressStore` subscribe to `compile_estimate` directly (or have ConfigManager call `compileProgress.setEstimate(ms)`).
2. Remove the `estimateRef` from CompilingIndicator.
3. Boot path: instead of emitting `compile_estimate` manually before `queue()`, have `compileGate.queue()` accept an optional `estimateMs` and pass through.

## Files touched

| Phase | File | Change |
|-------|------|--------|
| 1 | `app-gmt/main.tsx` | Wrap boot in `compileGate.queue` |
| 1 | `engine-gmt/engine/managers/ConfigManager.ts` | (optional) early `compile_estimate` |
| 2 | `app-gmt/AppGmt.tsx` | Wire `useAppStartup` |
| 2 | `app-gmt/main.tsx` | Move hydration into `useAppStartup` |
| 2 | `hooks/useAppStartup.ts` | Have `bootEngine` go through `compileGate.queue` |
| 3 | `store/CompileProgressStore.ts` | New store |
| 3 | `store/CompileGate.ts` | Forward to `compileProgress.start` |
| 3 | `components/CompilingIndicator.tsx` | Subscribe to store, drop local interval |
| 3 | `app-gmt/LoadingScreen.tsx` | Subscribe to store, drop 2.5 s timer |
| 3 | `engine-gmt/engine/worker/WorkerProxy.ts` | Map COMPILING → store actions |
| 4 | `engine/worker/WorkerProtocol.ts` | Structured COMPILING payload |
| 4 | `engine-gmt/engine/CompileScheduler.ts` | Emit start/phase/end |
| 4 | `engine-gmt/engine/worker/renderWorker.ts` | Bridge new payload |
| 4 | `store/CompileGate.ts` | `queue()` returns Promise |
| 5 | `engine-gmt/engine/managers/ConfigManager.ts` | Direct store call instead of event |
| 5 | `components/CompilingIndicator.tsx` | Drop local estimateRef |

## Out of scope

- `<GmtRendererTickDriver>`'s `checkReady` polling loop (still 30 s timeout-based). Replace with `proxy.onBooted` callback in a follow-up — orthogonal to spinner unification.
- Compile-cancel UX (e.g. Cancel button on the long Firefox compile). Worker has a `restart()` path for this; UI hook is a separate task.
- Breaking up `setupEngine` into staged messages so the worker can post intermediate progress. Out-of-scope; today's "Loading Preview…" / "Compiling Lighting…" string flips are sufficient.

## Order of operations

Phase 1 first — small, fixes the visible bug, low risk. Ship and verify on Firefox before continuing.

Phase 2 next — restores the boot wiring that was lost in extraction. After this, formula switching from the LoadingScreen picker (currently partly broken in dev/) works again.

Phase 3 is the architectural change. Worth landing as one PR so the two-spinner state isn't half-migrated.

Phase 4 + 5 are cleanup — can be deferred or skipped if Phase 3 leaves things in good enough shape.

## Open questions

- Does `CompilingIndicator` continue to render *during* LoadingScreen, or hide behind it? Currently z-99999 puts it above. Once both share the same store, redundant — the LoadingScreen should hide CompilingIndicator while it's still visible. One-line fix: `if (loadingVisible) return null;` in CompilingIndicator, or render CompilingIndicator only `!loadingVisible`. **Resolved: kept both visible per user preference.**

- Should the LoadingScreen's progress bar be the single source of truth and CompilingIndicator only render *after* boot? That's the simplest UX: one boot bar (LoadingScreen), then a smaller toast for subsequent recompiles (CompilingIndicator). Aligns naturally with the store's lifecycle. **Resolved: not done — both views ride the same store, both render.**

---

## What shipped

All five phases landed plus several mid-implementation discoveries. Final state:

### Architecture

- **`store/CompileProgressStore.ts`** (Zustand) — single source of truth: `phase | message | startedAt | estimateMs | doneAt | cycleId`. `selectProgress(state, now)` returns 0-100. Both views poll it via rAF.
- **`store/CompileGate.ts`** — `queue(message, work)` returns `Promise<void>`, opens a store cycle, emits legacy `IS_COMPILING` event, stashes work, starts a 500 ms safety timer. `flush()` runs work, resolves the promise, clears the timer. Superseded queues reject the prior promise with `'superseded'`.
- **`hooks/useAppStartup.ts`** — generic boot hook. Takes `bootRenderer / pushOffset / isBootedOrRequested / estimateBootCompileMs` callbacks via options. App-agnostic. AppGmt wires these to engine-gmt's `gmtRenderer.boot` and `getProxy()`.
- **`engine-gmt/engine/worker/WorkerProxy.ts`** — `_handleWorkerMessage('COMPILING')` bridges worker IS_COMPILING events into the store: string-while-idle → `start()`; string-while-compiling → `setMessage()`; `false` → `finish()`.

### Visible improvements

- **Bar fill uses `transform: scaleX`** (compositor thread) instead of `width: %` (main render thread). Bar animates even when worker's synchronous WebGL compile starves main-thread paint on Firefox.
- **Per-cycle compile estimate.** `engineStore.setCompileEstimator(fn)` registers an app-specific estimator (engine-gmt's `estimateCompileTime`). `setFormula` and `loadScene` call `refreshCompileEstimate(state)` before `compileGate.queue`. `useAppStartup.bootEngine` does the same via the `estimateBootCompileMs` option. The store applies updates via the `compile_estimate` event listener inside `CompileProgressStore.ts`.
- **Context-aware compile messages.** `CompileScheduler.perform()` emits `'Loading Preview...'` only on genuine two-stage path (parallel-compile-capable browser + new formula). Otherwise emits `'Compiling Shader...'`. Fixes the "Loading Preview" misnomer on Firefox single-stage compiles and on quality-preset switches.

### Out-of-plan discoveries

- **Stub vs real WorkerProxy bug.** `engine/worker/WorkerProxy.ts` (no-op stub from extraction) and `engine-gmt/engine/worker/WorkerProxy.ts` (real worker-backed) were two different singletons. Pre-extraction code in `dev/` (engineStore, components, hooks) imported the stub; engine-gmt code imported the real one. Phase 2's first cut wired `useAppStartup.bootEngine` to call `bootWithConfig` on the **stub**, so the real worker never received BOOT — boot timed out at 30 s. **Fix:** the stub became a registry. `setProxy(realProxy)` is called from `installGmtRenderer` so `getProxy()` returns the same singleton from both files. fluid-toy / test harnesses get the no-op fallback.

- **StrictMode dev double-mount kills `setInterval`.** Phase 1's first cut started a `setInterval` for the bar inside the IS_COMPILING listener. StrictMode's mount → cleanup → remount called `cancelTimers` after the cycle started, killing the interval; the bar froze at 0 % but the cycle "finished" branch still fired at the end → bar popped to 100 %. **Fix:** progress is now driven by a `useEffect` keyed on `cycleId` running an rAF loop, which re-arms cleanly on remount and reads from refs that survive cleanup.

- **`triggerBoot` was being called from two places.** The old LoadingScreen called `triggerBoot()` on every rAF tick once `isHydrated && progress >= 100`. Cleaned up: boot is triggered exclusively by the `[isHydrated]` effect now. The rAF loop is purely a view.

### What was dropped vs the plan

- **Phase 4 structured COMPILING payload (`{ status: 'start' | 'phase' | 'end' }`).** Skipped — the WorkerProxy's main-thread bridge already differentiates start vs phase via `cp.phase !== 'compiling'`. The wire format `boolean | string` was kept.
- **Worker-side `compile_estimate` bridging** through ConfigManager.flushRebuildLog. Skipped — main-thread emissions from `setFormula` / `loadScene` / `bootEngine` cover the cases that matter; ConfigManager's worker-side emit was always going to a separate event bus.

### Permanent compile timing logs

- `[Compile] Single-stage: Xms (Formula)` — final time
- `[Compile] Two-stage: Xms (Formula, gen=Xms, gpu=Xms)` — final time with breakdown

The intermediate `[Compile] Preview: …ms` log was removed (not a final time).
