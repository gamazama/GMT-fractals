# 11 — TSAA: Temporal Super-Sampling, Accumulation, Adaptive Resolution

The unified protocol + algorithm shared by every renderer plugin that
accumulates frames over time (path tracer, fluid sim, particle system).
Two cooperating engine-core modules:

| Module | Concern |
|---|---|
| [`engine/AccumulationController.ts`](../../engine/AccumulationController.ts) | Protocol — pause / cap / count / reset surface. |
| [`engine/AdaptiveResolution.ts`](../../engine/AdaptiveResolution.ts) | Algorithm — FPS-driven quality decision (pure module, no DOM/THREE/worker). |

The pieces that bind these to the store:

| Module | Concern |
|---|---|
| [`store/slices/installAccumulationBindings.ts`](../../store/slices/installAccumulationBindings.ts) | One-call helper: subscribes `isPaused` / `sampleCap` from `renderControlSlice` to a controller. |
| [`store/slices/viewportSlice.ts`](../../store/slices/viewportSlice.ts) (`reportFps`) | Drives `qualityFraction` — used by main-thread renderers (fluid-toy, fractal-toy). |
| [`engine-gmt/engine/managers/UniformManager.ts`](../../engine-gmt/engine/managers/UniformManager.ts) (`syncFrame`) | Drives worker-side render-target size — used by GMT. |

Both consumers call `tickAdaptiveResolution(state, input)` per frame; same algorithm, different application layer.

## Why a shared module

Before unification the same logic lived in two places:

- `viewportSlice.reportFps` (main thread) — drove `qualityFraction`. Used by fluid-toy / fractal-toy.
- `UniformManager.syncFrame` (worker thread) — drove the worker's render-target size. Used by GMT.

Each had its own rolling FPS measurement, EMA, grace period, seeding from idle FPS, hold-during-export gate. The two diverged: GMT's worker version had deep-accumulation protection and accumCount-driven activity detection; the slice version had a 200ms first-window jump-to-ideal seed and a hold-grace mechanism. Drift was inevitable; behaviour was inconsistent.

After unification:
- One algorithm, one set of tuning constants, one place to fix bugs.
- App-level toggles (alwaysActive for live sims, suppressed for export, holdUntilMs for accumulation start) are uniform regardless of which renderer the app uses.
- New apps that want TSAA quality scaling get it for free by:
  1. Implementing `AccumulationController` on their renderer surface.
  2. Calling `installAccumulationBindings(useEngineStore, controller)` once.
  3. Either consuming `qualityFraction` (main-thread drivers) OR calling `tickAdaptiveResolution` themselves (worker-internal drivers).

## AccumulationController

```ts
export interface AccumulationController {
    readonly accumulationCount: number;
    readonly convergenceValue: number;       // optional; renderers without one return 1
    isPaused: boolean;
    setPreviewSampleCap(n: number): void;     // historic name — generic semantics
    resetAccumulation(): void;
}
```

Implementations today:
- `engine/worker/WorkerProxy.ts` — engine-core stub (inert no-ops; satisfies the contract for apps that haven't installed a renderer yet).
- `engine-gmt/engine/worker/WorkerProxy.ts` — full GMT worker bridge.

A future fluid accumulator or main-thread renderer satisfies the same shape; nothing else needs to change for the rest of the engine to drive it.

### What goes through the protocol vs the event bus

| Direction | Mechanism | Why |
|---|---|---|
| `isPaused`, `sampleCap` (store → controller) | `installAccumulationBindings` (store subscription) | Imperative commands, no broadcast needed. |
| `accumulationCount` (controller → store) | Renderer's tick driver calls `reportAccumulationToStore(store, controller)` periodically | Only the renderer knows when frames advance. |
| `RESET_ACCUM` events | `FRACTAL_EVENTS.RESET_ACCUM` event bus | Already broadcast (UI changes, AA toggles, etc.); renderer-side listener calls `controller.resetAccumulation()`. |

### Initial-state push

Workers boot asynchronously: `installAccumulationBindings` subscribes to *changes*, but the initial values may be needed before any change occurs. For renderers where messages can race the worker engine creation (GMT's classic case — `engine?.setPreviewSampleCap()` silent no-op pre-boot), apps wrap the worker's `onBooted` callback to re-push state from the store. See [`engine-gmt/renderer/install.ts`](../../engine-gmt/renderer/install.ts).

## AdaptiveResolution algorithm

Pure module: inputs in, decision out. State mutated in place to avoid per-frame allocations.

```ts
const result = tickAdaptiveResolution(state, {
    now: performance.now(),
    accumCount,                         // 0 if renderer doesn't track
    isInteracting,                       // gizmo / camera / slider drag
    mouseOverCanvas,
    dynamicScaling,                      // master enable
    adaptiveTarget,                      // 0 = manual mode
    interactionDownsample,               // fixed factor when manual

    // Optional features:
    minQuality,                          // default 0.25 (max scale 4)
    alwaysActive,                        // default false (live sims set true)
    holdUntilMs,                         // default 0 (no hold)
    suppressed,                          // default false (export forces this)
    accumThreshold,                      // override deep-accum threshold (e.g. floor(sampleCap*0.5))
    gateOnAccumOnly,                     // default false; true = accum drop is the only adaptive trigger
});
// result.scale, result.needsAdaptive, result.grace
```

### Algorithm steps each frame

1. **Activity tracking** — bumps `lastActivityTime` on `isInteracting`, *or* on an external `accumCount` drop (something invalidated the buffer). The renderer's `selfResized` flag suppresses self-caused drops.

2. **Deep-accumulation protection** — only samples accumulated at full res count toward a threshold. The caller may pass `accumThreshold` to override (apps with a known sampleCap typically pass `floor(sampleCap * 0.5)` so "halfway accumulated" is the cutoff); when omitted, the FPS-scaled default applies (8–50). Past threshold, adaptive is suppressed everywhere — protects partial high-quality results when the user moves the mouse off the canvas mid-render.

3. **Adaptive-on decision**:
   - Suppressed → off (force scale 1).
   - Deep accumulation → off.
   - `alwaysActive` → on (no idle settle — live sims).
   - `gateOnAccumOnly = true` → on only while `timeSinceActivity < grace` (i.e. the renderer's accumCount actually just dropped). `isInteracting` and `mouseOverCanvas` are ignored. Use for apps where the accumulator is the truth signal — fluid-toy: dragging the vorticity slider doesn't invalidate the fractal accumulator, so it shouldn't drop quality either.
   - Otherwise (the default GMT-style path): on while interacting OR mouse-off-canvas OR within grace window.

4. **Scale computation (smart, `adaptiveTarget > 0`)**:
   - First window after seed: 200ms + jump-to-ideal (no EMA lag).
   - Subsequent windows: 500ms + 0.7/0.3 EMA toward target FPS via `sqrt(targetFps/actualFps)`.
   - Hold gate: while `now < holdUntilMs`, skip scale increases (preserve quality during holds).
   - Clamped to `[1, 1/minQuality]`.

5. **Scale computation (manual, `adaptiveTarget === 0`)**:
   - `scale = max(1, interactionDownsample)` — fixed factor.

6. **Idle: still-FPS measurement** — when not adaptive, count frames over rolling 500ms windows. Used to seed the next disturbance's initial scale (`scale = sqrt(target/stillFps)`).

### Grace period — FPS-scaled

`getAdaptiveGrace(stillFps) = clamp(2000 / max(1, stillFps), 100, 3000)`

- 30 fps+ → 100 ms (snappy settle)
- 10 fps → 200 ms
- 1 fps → 2000 ms (slow scenes get more time before ratcheting back to full res)

Replaces the old fixed `cfg.activityGraceMs` value (which `viewportSlice` used to consult and `UniformManager` ignored). The config field `activityGraceMs` is now consulted only as the default multiplier for `holdAdaptive(durationMs?)`.

## How GMT consumes it

```
GmtRendererTickDriver.useFrame
    runTicks(ANIMATE / OVERLAY / UI)
    proxy.sendRenderTick(camera, offset, delta, renderState)
                                                  └── adaptiveSuppressed plumbed via renderState
worker (RENDER_TICK)
    handleRenderTick
        engine.setRenderState(renderState)
        engine.update(camera, delta, ...)
            uniformManager.syncFrame(...)
                tickAdaptiveResolution(_adaptive, { ...inputs, suppressed }) ──┐
                                                                                │
                if needsAdaptive: pipeline.resize(w/scale, h/scale) ◀───────────┘
                                  pipeline.resetAccumulation()
                                  _adaptive.selfResized = true
        engine.compute(renderer)
        ...
```

The worker is the source of truth for adaptive scale in GMT. Main-thread `viewportSlice.reportFps` *also* runs the algorithm, but its output (`qualityFraction`) is currently only used for the topbar `<AdaptiveResolutionBadge>` UI — GMT's render path doesn't subscribe to it. (Main-thread and worker decisions don't compete: each layer applies the same algorithm to its own concern.)

## How fluid-toy consumes it

```
FluidEngine.useFrame
    viewport.frameTick()
        viewportSlice.reportFps(0)
            tickAdaptiveResolution(_adaptive, {
                ...inputs,
                accumCount: store.accumulationCount,        // pushed by useFluidEngine RAF
                accumThreshold: floor(sampleCap * 0.5),     // halfway → adaptive locked off
                gateOnAccumOnly: true,                      // only fractal-invalidating activity engages adaptive
            }) ──┐
                  │
            qualityFraction = 1 / result.scale ◀──┘
            store.set({ qualityFraction })

FluidToyApp resize useEffect:
    engine.setSimAspect(physW / physH)                      // sim grid aspect from unscaled CSS, not canvas
    engine.resize(logicalW * quality, logicalH * quality)   // canvas/fractal target only
    engine.redraw()                                         // suppress black-flash on adaptive nudge

FluidToyApp setParams useEffect:
    engine.setParams({ tsaaSampleCap: store.sampleCap })    // 0 = infinite (engine-side semantic)
```

Two scales, decoupled:
- **Fractal/canvas render target** scales with `qualityFraction`. Adaptive only engages when the fractal accumulator actually resets (Julia c, zoom, palette mapping, etc.); unrelated UI activity has no effect.
- **Sim grid (dye, velocity, pressure)** runs at the user's chosen `simResolution` full-time. Aspect is locked to the unscaled CSS aspect via `setSimAspect()` so adaptive-induced canvas-dimension drift can't trip a sim FBO reallocation that would wipe dye.

Fluid-toy has no worker; the algorithm runs on the main thread and the renderer reads `qualityFraction` from the store. The Pause popover's `sampleCap` (default 64 for fluid-toy, set via `setSampleCap(64)` at boot) is the source of truth for both `engine.tsaaSampleCap` (when the fractal stops re-rendering) and the adaptive deep-accum gate (`sampleCap/2`).

> **FluidEngine does not implement AccumulationController.** The interface's `isPaused` is documented as "no new samples added" — designed around path tracers where pause == accumulator pause. Fluid-toy has three independent controls (`accumulation` TSAA toggle, `isPaused` *sim* pause, `sampleCap`) and pause means "freeze the dye/velocity sim while the fractal keeps accumulating." Force-fitting this onto AccumulationController would conflate two distinct controls under one name. The current direct wiring (`reportAccumulation` from the RAF loop, three small `setParams` forwarders in FluidToyApp) is shorter and more honest about the semantics. Worth revisiting if a second main-thread accumulating renderer arrives and a shared shape becomes empirical.

## Authoring a new accumulating renderer

1. **Implement the controller**:
   ```ts
   class MyRenderer implements AccumulationController {
       get accumulationCount() { return this._sampleCount; }
       get convergenceValue() { return 1; }
       get isPaused() { return this._paused; }
       set isPaused(v) { this._paused = v; }
       setPreviewSampleCap(n: number) { this._cap = n; }
       resetAccumulation() { this._sampleCount = 0; this._fbo.clear(); }
   }
   ```

2. **Wire to the store** at install time:
   ```ts
   const disposer = installAccumulationBindings(useEngineStore, myRenderer);
   ```

3. **Choose a quality-scaling layer**:
   - Main-thread loop: subscribe to `qualityFraction` from `viewportSlice` and apply.
   - Worker-internal loop: maintain your own `AdaptiveResolutionState`, call `tickAdaptiveResolution` per frame, apply the result to your render target / sim grid.

4. **Report accumulation back** periodically:
   ```ts
   reportAccumulationToStore(useEngineStore, myRenderer);  // ~500ms cadence
   ```

5. **For async-bootable renderers**, push initial `isPaused` / `sampleCap` after boot — store subscriptions only fire on changes, and pre-boot messages may be silently dropped.

## Plumbing pitfalls (audit checklist)

A store flag that gates worker render behaviour must be reachable by the worker. Two channels exist; pick one:

- **Event-bus for broadcasts**: `bindings.ts` subscribes to a store field, emits a `FRACTAL_EVENTS.*` event, GmtRendererTickDriver bridges to a proxy method. Used for CONFIG, UNIFORM, RESET_ACCUM, etc.
- **`renderState` payload for per-tick state**: include the field in the `renderState` object built in `GmtRendererTickDriver.sendRenderTick(...)`. The worker calls `engine.setRenderState(partial)` on RENDER_TICK; UniformManager / FractalEngine reads it. Used for `cameraMode`, `optics`, `lighting`, `quality`, `geometry`, **`adaptiveSuppressed`**.

A field that exists in the store but is missing from BOTH channels is a silent bug — the worker never sees it. Past instance: `adaptiveSuppressed` was added to `renderControlSlice` for export-popup behaviour, but never plumbed through `renderState`. Symptom: bucket-render dialog opening triggered black-frame flashes because the worker kept adaptive-scaling (each scale change → resize → cleared FBO briefly visible). Fixed 2026-04-26 by adding the field to `EngineRenderState` and the renderState payload.

## Cross-refs

- Viewport plugin: [10_Viewport.md](10_Viewport.md)
- Render-control state: `store/slices/renderControlSlice.ts`
- Worker protocol: `engine-gmt/engine/worker/WorkerProtocol.ts`
- Bucket-render flow: `engine-gmt/topbar/BucketRenderControls.tsx`, `engine-gmt/engine/worker/renderWorker.ts` (`PREVIEW_REGION_SET`/`CLEAR`)
