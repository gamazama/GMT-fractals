---
source: engine-gmt/engine/FractalEngine.ts
lines: 958
last_verified_sha: fc8b7e4e48b66f448bea68ab8bfa7b5e36abb257
additional_sources:
  - engine-gmt/engine/MaterialController.ts
  - engine-gmt/engine/SceneController.ts
  - engine-gmt/engine/CompileScheduler.ts
  - engine-gmt/engine/PrecisionMath.ts
  - engine-gmt/engine/HardwareDetection.ts
  - engine-gmt/engine/LoadingRendererCPU.ts
  - engine-gmt/engine/worker/WorkerProxy.ts
  - engine-gmt/engine/worker/WorkerProtocol.ts
  - engine-gmt/engine/worker/ViewportRefs.ts
  - engine-gmt/engine/worker/WorkerExporter.ts
  - engine-gmt/engine/worker/WorkerHistogram.ts
  - engine-gmt/engine/worker/WorkerDepthReadback.ts
  - engine-gmt/engine/worker/renderWorker.ts
  - engine-gmt/engine/worker/handleRenderTick.ts
audited: 2026-05-20T08:55:00Z
audited_by: claude-opus-4-7
public_api:
  - FractalEngine
  - EngineInputEvent
  - EngineRenderState
  - getEngine
  - engine
  - handleInput
  - markInteraction
  - preloadConfig
  - bootWithConfig
  - registerCamera
  - registerRenderer
  - syncCameraFromMatrix
  - awaitCompile
  - resolveLightPosition
  - setUniform
  - setRenderState
  - update
  - compute
  - render
  - pipelineRender
  - captureSnapshot
  - captureEnvMap
  - pickWorldPosition
  - pickWorldPositionFast
  - measureDistanceAtScreenPoint
  - getCompiledFragmentShader
  - getTranslatedFragmentShader
  - checkHalfFloatAlphaSupport
  - fireCompile
  - setPreviewSampleCap
  - updateTexture
  - resetAccumulation
  - syncFrame
  - MaterialController
  - materialDirect
  - materialPT
  - histogramMaterial
  - displayMaterial
  - exportMaterial
  - mainUniforms
  - histogramUniforms
  - shaderDirty
  - isPreviewActive
  - mainMaterial
  - getMaterial
  - getLastFrag
  - updateConfig
  - compilePreview
  - buildFullMaterial
  - swapFullMaterial
  - getUniform
  - loadTexture
  - rebuildEnvCDF
  - setGradient
  - syncModularUniforms
  - syncConfigUniforms
  - SceneController
  - CompileScheduler
  - CompileSchedulerDeps
  - isCompiling
  - hasCompiledShader
  - lastDuration
  - schedule
  - fire
  - dispose
  - VirtualSpace
  - detectHardwareProfile
  - detectHardwareProfileMainThread
  - LoadingRendererCPU
  - WorkerProxy
  - getProxy
  - SerializedCamera
  - SerializedOffset
  - WorkerShadowState
  - MainToWorkerMessage
  - WorkerToMainMessage
  - WorkerExporter
  - ExportPostFn
  - WorkerDepthReadback
  - handleHistogramReadback
  - RenderTickRefs
  - RenderTickHooks
  - handleRenderTick
depends_on:
  - e02-tick-registry
  - e04-shader-builder
  - e05-render-pipeline
  - e06-adaptive-resolution
  - g02-shader-pipeline
  - g06-bucket-render
---

# engine-gmt/renderer — FractalEngine, MaterialController, SceneController, Worker Bridge

GMT's renderer subsystem. Wires the per-frame render loop, the two-stage shader compile (preview + async full), the main-thread <-> worker bridge, and the OffscreenCanvas worker entry. Public surface centres on `FractalEngine` (worker-side conductor) and `WorkerProxy` (main-thread façade that satisfies the same UI contract via message passing).

## Public API

### `FractalEngine` (`engine-gmt/engine/FractalEngine.ts:118`)

Singleton-shaped class instantiated lazily via `getEngine()` (`engine-gmt/engine/FractalEngine.ts:950`); the bottom-of-module `export const engine = getEngine()` (`engine-gmt/engine/FractalEngine.ts:958`) forces immediate construction for any importer of `engine`. New code should prefer `getEngine()`.

| Field / accessor | Where | Notes |
|------------------|-------|-------|
| `materials` | `engine-gmt/engine/FractalEngine.ts:201` | `MaterialController` instance |
| `sceneCtrl` | `engine-gmt/engine/FractalEngine.ts:202` | `SceneController` instance |
| `virtualSpace` | `engine-gmt/engine/FractalEngine.ts:179` | Split-float coordinate system (re-export shim, see below) |
| `pipeline` | `engine-gmt/engine/FractalEngine.ts:203` | `RenderPipeline` instance (null on main thread in worker mode) |
| `renderer` | `engine-gmt/engine/FractalEngine.ts:351` | Set lazily by `registerRenderer`; null on main thread |
| `state: EngineRenderState` | `engine-gmt/engine/FractalEngine.ts:118-145` | Per-tick state pulled from React/Zustand via the bridge |
| `isBooted` | `engine-gmt/engine/FractalEngine.ts:160` | Use this (not `renderer`) to gate worker-mode code |
| `isPaused`, `shouldSnapCamera`, `lastMeasuredDistance`, `dirty` | `engine-gmt/engine/FractalEngine.ts:152-158` | Public mutable flags |
| `isGizmoInteracting` / `cameraInUse` | `engine-gmt/engine/FractalEngine.ts:147-151` | Accessors delegating to `state` |

| Method | Where | Role |
|--------|-------|------|
| `handleInput(event: EngineInputEvent)` | `engine-gmt/engine/FractalEngine.ts:235` | Non-Navigation input path (Navigation drives the camera directly) |
| `markInteraction()` | `engine-gmt/engine/FractalEngine.ts:254` | Stamp `_lastCameraInUseTime` for adaptive grace |
| `preloadConfig(config)` / `bootWithConfig(config)` | `engine-gmt/engine/FractalEngine.ts:260,265` | Initial config plumbing |
| `registerCamera(camera)` / `registerRenderer(renderer)` | `engine-gmt/engine/FractalEngine.ts:339,351` | Late wiring from app shell |
| `syncCameraFromMatrix(camera)` | `engine-gmt/engine/FractalEngine.ts:360` | Pull camera world-matrix into engine state |
| `awaitCompile(timeoutMs = 30000)` | `engine-gmt/engine/FractalEngine.ts:380` | Promise — resolves when scheduler idle |
| `resolveLightPosition(currentPos, wasFixed)` | `engine-gmt/engine/FractalEngine.ts:384` | Light-anchor utility |
| `setUniform(key, value, noReset = false)` | `engine-gmt/engine/FractalEngine.ts:449` | Uniform set + accumulation reset gate |
| `setRenderState(partial)` | `engine-gmt/engine/FractalEngine.ts:455` | Bulk merge into `EngineRenderState` |
| `update(camera, delta, state, isInteracting)` | `engine-gmt/engine/FractalEngine.ts:468` | Smoothing, dirty detection, jitter advance, calls `syncFrame` |
| `compute(renderer)` | `engine-gmt/engine/FractalEngine.ts:529` | Actual per-frame render (hold/jitter + `pipelineRender`) |
| `pipelineRender(renderer)` | `engine-gmt/engine/FractalEngine.ts:524` | Direct pipeline kick (used by `CompileScheduler` for preview/two-stage) |
| `render(renderer)` | `engine-gmt/engine/FractalEngine.ts:586` | Legacy stub for export paths (calls `compute` + blit) |
| `captureSnapshot()` | `engine-gmt/engine/FractalEngine.ts:786` | Post-process FBO blob (forces `uEncodeOutput=1`, restores on exit) |
| `captureEnvMap(maxEdge = 1024, quality = 0.85)` | `engine-gmt/engine/FractalEngine.ts:614` | HDR (Radiance .hdr) vs LDR (ACES JPEG) branched by source type |
| `pickWorldPosition(x, y)` / `pickWorldPositionFast(x, y)` | `engine-gmt/engine/FractalEngine.ts:843,848` | Picking via `PickingController` |
| `measureDistanceAtScreenPoint(x, y, renderer, camera)` | `engine-gmt/engine/FractalEngine.ts:839` | Distance probe |
| `getCompiledFragmentShader()` / `getTranslatedFragmentShader()` | `engine-gmt/engine/FractalEngine.ts:862,876` | Reach into private Three API for diagnostics — fragile (see Known issues) |
| `checkHalfFloatAlphaSupport()` | `engine-gmt/engine/FractalEngine.ts:894` | Worker-side capability probe (no internal callers today — see Known issues) |
| `fireCompile()` / `setPreviewSampleCap(n)` | `engine-gmt/engine/FractalEngine.ts:446,337` | Compile trigger / PT preview sample cap |
| `updateTexture(type, dataUrl)` | `engine-gmt/engine/FractalEngine.ts:327` | Color / env texture upload |
| `resetAccumulation()` | `engine-gmt/engine/FractalEngine.ts:331` | Does NOT set `dirty` — comment at `engine-gmt/engine/FractalEngine.ts:331-336` |
| `syncFrame(camera, state)` | `engine-gmt/engine/FractalEngine.ts:834` | Single canonical per-frame uniform writeback (delegates to `UniformManager`) |

Public types: `EngineInputEvent` (`engine-gmt/engine/FractalEngine.ts:81`), `EngineRenderState` (`engine-gmt/engine/FractalEngine.ts:85`).

### `MaterialController` (`engine-gmt/engine/MaterialController.ts:46`)

Owns the five Three.js `ShaderMaterial` slots used by the renderer.

| Field | Where |
|-------|-------|
| `materialDirect` / `materialPT` | `engine-gmt/engine/MaterialController.ts:48-49` |
| `histogramMaterial` | `engine-gmt/engine/MaterialController.ts:52` |
| `displayMaterial` / `exportMaterial` | `engine-gmt/engine/MaterialController.ts:53-54` |
| `mainUniforms` / `histogramUniforms` | `engine-gmt/engine/MaterialController.ts:56-57` |
| `shaderDirty` / `isPreviewActive` | `engine-gmt/engine/MaterialController.ts:74,77` |
| `mainMaterial` (getter) | `engine-gmt/engine/MaterialController.ts:138` — picks `materialDirect` vs `materialPT` from current mode |

| Method | Where | Role |
|--------|-------|------|
| `getMaterial(mode)` | `engine-gmt/engine/MaterialController.ts:142` | Explicit mode-keyed material lookup |
| `getLastFrag()` | `engine-gmt/engine/MaterialController.ts:191` | Last-generated fragment source (for shader-source debug) |
| `updateConfig(config)` | `engine-gmt/engine/MaterialController.ts:193` | Full rebuild (current entrypoint when `compilePreview` returns false) |
| `compilePreview(config)` | `engine-gmt/engine/MaterialController.ts:261` | Returns `false` when lighting already off (preview == full) — drops scheduler to single-stage |
| `buildFullMaterial(config)` | `engine-gmt/engine/MaterialController.ts:311` | Returns a freshly compiled material (with `_gmtMode` metadata) for `swapFullMaterial` |
| `swapFullMaterial(fullMat)` | `engine-gmt/engine/MaterialController.ts:348` | Disposes the old material and reassigns `materialDirect` / `materialPT` |
| `getUniform(key)` / `setUniform(key, value)` | `engine-gmt/engine/MaterialController.ts:381,385` | Uniform read/write across four maps (see Architecture below) |
| `loadTexture(type, dataUrl)` | `engine-gmt/engine/MaterialController.ts:476` | Color / env upload |
| `rebuildEnvCDF(tex)` | `engine-gmt/engine/MaterialController.ts:509` | Env-luminance CDF for PT_ENV_MIS_IS |
| `setGradient(stops, layer)` | `engine-gmt/engine/MaterialController.ts:551` | Gradient layers 1, 2, 3 |
| `syncModularUniforms(pipeline, edges)` | `engine-gmt/engine/MaterialController.ts:561` | Modular-graph parameter sync (skipped in `keepCurrent` strategy) |
| `syncConfigUniforms(config, skipModularSync)` | `engine-gmt/engine/MaterialController.ts:568` | Push config values into uniforms |

### `SceneController` (`engine-gmt/engine/SceneController.ts:6`)

Thin holder for the two Three.js scenes (main render, post-process display) plus a perspective `fallbackCamera` used when no external camera is registered. Methods: `setMaterial`, `registerCamera`, `getCamera`, `updateFallback` (all in the 54-line file).

### `CompileScheduler` (`engine-gmt/engine/CompileScheduler.ts:49`)

200 ms-debounced compile pipeline with three strategies. Constructed with a `CompileSchedulerDeps` callback bag (`engine-gmt/engine/CompileScheduler.ts:32`).

| Member | Where | Role |
|--------|-------|------|
| `isCompiling` / `hasCompiledShader` / `lastDuration` | `engine-gmt/engine/CompileScheduler.ts:52,56,58` | Status flags + telemetry |
| `schedule()` | `engine-gmt/engine/CompileScheduler.ts:74` | Debounce + wait for `CONFIG_DONE` or fallback timer |
| `fire()` | `engine-gmt/engine/CompileScheduler.ts:97` | Poll renderer-ready every 50 ms, then run `perform` |
| `awaitCompile(timeoutMs = 30000)` | `engine-gmt/engine/CompileScheduler.ts:118` | Promise drain |
| `dispose()` | `engine-gmt/engine/CompileScheduler.ts:136` | Cancel timers |

### `PrecisionMath` (`engine-gmt/engine/PrecisionMath.ts:12`)

Twelve-line re-export shim — `VirtualSpace` truly lives in `engine/plugins/navigation/core/VirtualSpace` (engine-core, since the 2026-04-24 navigation extraction).

### `HardwareDetection` (`engine-gmt/engine/HardwareDetection.ts`)

| Function | Where | Notes |
|----------|-------|-------|
| `detectHardwareProfile(gl?)` | `engine-gmt/engine/HardwareDetection.ts:13` | Probes Float32 RGBA32F FBO completion; sets `precisionMode` (0 High / 1 Standard), `bufferPrecision` (0 Float32 / 1 HalfFloat16), tier (`low`/`mid`/`high`), and `compilerHardCap` (`MOBILE_HARD_CAP` vs `DEFAULT_HARD_CAP`) |
| `detectHardwareProfileMainThread()` | `engine-gmt/engine/HardwareDetection.ts:62` | No-GL fallback (mobile UA heuristic only); used by `FractalEngine` constructor at `engine-gmt/engine/FractalEngine.ts:188` |

### `LoadingRendererCPU` (`engine-gmt/engine/LoadingRendererCPU.ts:7`)

CPU Canvas2D Julia spinner with cosine palette; renders at canvas client size with `imageData` recreated on resize. Methods: `render(time, progress)` (`engine-gmt/engine/LoadingRendererCPU.ts:17`), `dispose()` (`engine-gmt/engine/LoadingRendererCPU.ts:127`). No internal callers in this subsystem — sole consumer is `app-gmt`.

### `WorkerProxy` (`engine-gmt/engine/worker/WorkerProxy.ts:23`)

Main-thread façade implementing `AccumulationController` (engine-core) and exposing the same UI-facing shape as `FractalEngine`. Lazy singleton via `getProxy()` (`engine-gmt/engine/worker/WorkerProxy.ts:876`). Header comment (`engine-gmt/engine/worker/WorkerProxy.ts:1-9`) explains the deliberate `import type` of FractalEngine to avoid TDZ.

| Surface | Where | Notes |
|---------|-------|-------|
| Stub fields `activeCamera`, `virtualSpace`, `renderer`, `pipeline` | `engine-gmt/engine/worker/WorkerProxy.ts:27-30` | Always null — UI code must guard |
| `_shadow: WorkerShadowState` | `engine-gmt/engine/worker/WorkerProxy.ts:33-38` | Cached worker state mirror |
| `_localOffset` / `_offsetGuarded` | `engine-gmt/engine/worker/WorkerProxy.ts:51,53` | Drift-converged sync (see Invariants) |
| `initWorkerMode`, `restart`, `bootWithConfig` | `engine-gmt/engine/worker/WorkerProxy.ts:141-485` | Lifecycle; `restart` is the Firefox sync-compile cancel escape hatch |
| `setUniform`, `setPreviewSampleCap`, `resetAccumulation`, `markInteraction` | `engine-gmt/engine/worker/WorkerProxy.ts:225-499` | Per-frame plumbing |
| `updateTexture` | `engine-gmt/engine/worker/WorkerProxy.ts:503` | HDR → ArrayBuffer (TEXTURE_HDR), LDR → ImageBitmap (TEXTURE) |
| `queueOffsetSync`, `setShadowOffset`, `applyOffsetShift`, `resolveLightPosition` | `engine-gmt/engine/worker/WorkerProxy.ts:541-577` | Camera-offset bridge (atomic absorb, drift guard) |
| `measureDistanceAtScreenPoint`, `pickWorldPosition`, focus-pick trio, `captureSnapshot`, `captureEnvMap`, `requestHistogramReadback` | `engine-gmt/engine/worker/WorkerProxy.ts:351-869` | Generic `_pendingRequest` id-keyed request/response pattern |
| `getCompiledFragmentShader`, `getTranslatedFragmentShader`, `getUniformsSnapshot`, `getRenderInfo` | `engine-gmt/engine/worker/WorkerProxy.ts:632-869` | Diagnostic round-trips |
| `setConvergenceNeeded`, `sendRenderTick`, `resizeWorker`, `sendConfig`, `registerFormula` | `engine-gmt/engine/worker/WorkerProxy.ts:656-869` | Hot-loop / config plumbing |
| Export trio + bucket / preview region | `engine-gmt/engine/worker/WorkerProxy.ts:471-869` | `startExport` / `renderExportFrame` / `finishExport` / `cancelExport`, `startBucketRender` / `stopBucketRender`, `setPreviewRegion` / `clearPreviewRegion` |
| `terminateWorker` | `engine-gmt/engine/worker/WorkerProxy.ts:412` | Hard teardown; clears every pending Map |

### `WorkerProtocol` (`engine-gmt/engine/worker/WorkerProtocol.ts`)

Single source of truth for worker message shapes — discriminated unions plus three interfaces.

| Symbol | Where |
|--------|-------|
| `SerializedCamera` | `engine-gmt/engine/worker/WorkerProtocol.ts:15` |
| `SerializedOffset` | `engine-gmt/engine/worker/WorkerProtocol.ts:22` |
| `WorkerShadowState` | `engine-gmt/engine/worker/WorkerProtocol.ts:29` |
| `MainToWorkerMessage` | `engine-gmt/engine/worker/WorkerProtocol.ts:45` |
| `WorkerToMainMessage` | `engine-gmt/engine/worker/WorkerProtocol.ts:100` |

### Worker internals

| Symbol | File | Where | Role |
|--------|------|-------|------|
| `ViewportRefs` re-export | `engine-gmt/engine/worker/ViewportRefs.ts:13` | 22-line shim — see Invariants |
| `handleRenderTick` | `engine-gmt/engine/worker/handleRenderTick.ts:48` | Seven-step per-frame body |
| `RenderTickRefs`, `RenderTickHooks` | `engine-gmt/engine/worker/handleRenderTick.ts:27,41` | Tick interfaces |
| `WorkerExporter`, `ExportPostFn` | `engine-gmt/engine/worker/WorkerExporter.ts:81,79` | Video + image-sequence session |
| `handleHistogramReadback` | `engine-gmt/engine/worker/WorkerHistogram.ts:43` | Histogram pipeline (HISTOGRAM_SIZE = 128) |
| `WorkerDepthReadback` | `engine-gmt/engine/worker/WorkerDepthReadback.ts:24` | Async PBO depth readback + focus-pick state machine |

Worker entry (`engine-gmt/engine/worker/renderWorker.ts`) owns the `FractalEngine` + `WebGLRenderer` + `OffscreenCanvas`; deferred INIT/BOOT pattern at `engine-gmt/engine/worker/renderWorker.ts:86-100`.

## Architecture

### Constructor wiring

`FractalEngine` wires seven collaborators in the constructor (`engine-gmt/engine/FractalEngine.ts:200-219`): `ConfigManager`, `MaterialController`, `SceneController`, `RenderPipeline`, `PickingController`, `UniformManager`, `CompileScheduler`. The process-singleton `bucketRenderer.init(this)` (`engine-gmt/engine/FractalEngine.ts:230`) means only one engine can drive bucket rendering at a time — main-thread and worker-side each get their own singleton because they run in separate JS contexts.

### Inbound event channel

`bindEvents` subscribes to seven FractalEvents (`engine-gmt/engine/FractalEngine.ts:294-325`): `UNIFORM`, `CONFIG`, `RESET_ACCUM`, `OFFSET_SHIFT`, `OFFSET_SET`, `CAMERA_ABSORB`, `CAMERA_SNAP`, `CAMERA_TELEPORT`. This is the engine's React/Zustand-to-render-loop boundary.

### Per-frame flow

`update(camera, delta, state, isInteracting)` (`engine-gmt/engine/FractalEngine.ts:468`) performs smoothing, dirty detection, jitter index advance, and ends in `syncFrame` -> `UniformManager.syncFrame` (`engine-gmt/engine/FractalEngine.ts:834-837`), the single canonical uniform writeback point per frame. `compute(renderer)` (`engine-gmt/engine/FractalEngine.ts:529`) is the actual render call: it builds the hold/jitter state then calls `pipelineRender(renderer)`. The legacy `render(renderer)` (`engine-gmt/engine/FractalEngine.ts:586`) is a thin stub that calls `compute` + a display blit — kept for export paths.

The hold extends through the adaptive-resolution grace window (~grace + 50 ms) via `_lastCameraInUseTime` to avoid a double-kick at the reduced->full transition — see comment at `engine-gmt/engine/FractalEngine.ts:546-557`.

### Jitter

Halton(2,3) of length 2048 is precomputed at module load (`engine-gmt/engine/FractalEngine.ts:111-116`) and consumed mod-N by `accumulationCount` (`engine-gmt/engine/FractalEngine.ts:565-572`). For Uniforms.FrameCount, `_totalFrames` (continuous) vs `accumulationCount` (per-bucket) is selected based on `isBucketRendering` (`engine-gmt/engine/FractalEngine.ts:473-479`) — bucket rendering gets a deterministic R2 noise sequence per bucket.

### Env-map capture

`captureEnvMap` branches HDR vs LDR by source `THREE.HalfFloatType | FloatType` (`engine-gmt/engine/FractalEngine.ts:614-784`); the HDR path writes Radiance `.hdr` via the inlined `encodeRadianceHDR` encoder (`engine-gmt/engine/FractalEngine.ts:33-77`), the LDR path tonemaps with ACES to a sRGB FBO and emits JPEG. `captureSnapshot` (`engine-gmt/engine/FractalEngine.ts:786-832`) uses the post-process display chain at FBO resolution and force-toggles `uEncodeOutput=1` on entry, restoring on exit.

### MaterialController two-stage compile

Direct + PathTracing materials are kept in parallel and share `mainUniforms` (`engine-gmt/engine/MaterialController.ts:46-153`) — switching mode is a Three.js material swap with no uniform recopy. The two-stage compile uses three material slots:

- Preview written by `compilePreview` with lighting forced off (`engine-gmt/engine/MaterialController.ts:261-310`).
- Full built by `buildFullMaterial` (`engine-gmt/engine/MaterialController.ts:311-347`) and returned to `CompileScheduler`.
- `swapFullMaterial` (`engine-gmt/engine/MaterialController.ts:348-380`) disposes the old material and reassigns `materialDirect` / `materialPT`. Mode is read from the `_gmtMode` metadata attached by `buildFullMaterial`.

Histogram material always recompiles from a forced Direct, `lighting.renderMode=0` config (`engine-gmt/engine/MaterialController.ts:127-134`, `engine-gmt/engine/MaterialController.ts:294-300`) — guarantees the histogram never path-traces.

### Uniform propagation

`MaterialController.setUniform` propagates writes to four uniform maps (`mainUniforms`, `histogramUniforms`, `displayMaterial.uniforms`, `exportMaterial.uniforms`) and handles plain-object fallbacks for `postMessage`-stripped THREE types — including `Matrix3`/`Matrix4` arriving as `{elements:[…]}` (`engine-gmt/engine/MaterialController.ts:405-473`). Display / export materials reach into `mainUniforms` BY REFERENCE for shared keys (uTime etc.), so updates via `mainUniforms[key].value = …` propagate without `setUniform` (`engine-gmt/engine/MaterialController.ts:155-189`).

`rebuildEnvCDF` builds an env-luminance CDF for `PT_ENV_MIS_IS` via `buildEnvCDF` / `extractEnvImageSource`; the 1x1 fallback path is handled in GLSL as a uniform-sphere PDF (`engine-gmt/engine/MaterialController.ts:509-549`).

### CompileScheduler strategies

| Strategy | When | Where |
|----------|------|-------|
| `keepCurrent` | Same formula, parallel compile available, prior compile done — keep current shader on screen during async swap; modular uniform sync deferred until after `swapFullMaterial` to avoid corrupting the still-rendering shader's slot mapping | `engine-gmt/engine/CompileScheduler.ts:190` (selection); `engine-gmt/engine/CompileScheduler.ts:249-256` (defer comment) |
| `twoStage` | Parallel compile + new formula — preview while full builds | `engine-gmt/engine/CompileScheduler.ts:192-232` |
| `singleStage` | Firefox (sync GPU-thread compile despite extension) or lighting already off | `engine-gmt/engine/CompileScheduler.ts:172-178` (Firefox force-detect); `engine-gmt/engine/CompileScheduler.ts:204-244` |

Stage 2 of `twoStage` builds `fullMat`, runs `compileAsync` on a hidden scene, hot-swaps via `materials.swapFullMaterial`, then syncs modular uniforms only after swap because the previous shader's pipeline param layout differs (`engine-gmt/engine/CompileScheduler.ts:279-322`).

`formulaChanged` key includes the interlace formula id when `interlaceCompiled` is true (`engine-gmt/engine/CompileScheduler.ts:185-189`).

The generation counter (`this.generation` vs captured `generation`, `engine-gmt/engine/CompileScheduler.ts:60-61`, `engine-gmt/engine/CompileScheduler.ts:276-310`) drops in-flight compiles when newer ones arrive — but only protects post-yield code.

`hasCompiledShader` and `lastCompiledFormula` are set BEFORE the first async yield so a concurrent `perform()` sees updated state (`engine-gmt/engine/CompileScheduler.ts:221-227`). Spinner messaging differs between two-stage ("Loading Preview…") and single-stage ("Compiling Shader…") (`engine-gmt/engine/CompileScheduler.ts:200-202`). Compile telemetry log lines at `engine-gmt/engine/CompileScheduler.ts:238-239` and `engine-gmt/engine/CompileScheduler.ts:330-331` are marked do-not-remove — used as profiling waypoints.

### Worker entry and tick

`renderWorker.ts` (`engine-gmt/engine/worker/renderWorker.ts:1-807`) is the worker entry. INIT (`engine-gmt/engine/worker/renderWorker.ts:93-96`) only stashes the message and returns `READY`; heavy WebGL setup is deferred to `setupEngine()` triggered by BOOT (`engine-gmt/engine/worker/renderWorker.ts:98-100`). Resize messages between INIT and BOOT are buffered in `_pendingResize`. This lets a terminated worker's GPU compile drain without blocking re-init.

`renderer.outputColorSpace = THREE.LinearSRGBColorSpace` (`engine-gmt/engine/worker/renderWorker.ts:117`) is set deliberately so Three.js compiles identical shader programs for canvas and FBO rendering — GMT manages sRGB encoding manually via `uEncodeOutput` in the post-process shader. Without this, the program hash diverges between FBO and canvas.

`handleRenderTick` (`engine-gmt/engine/worker/handleRenderTick.ts:48`) is the seven-step body — header comment at `engine-gmt/engine/worker/handleRenderTick.ts:1-15` is the canonical order: camera + offset application, engine update + compute, optional held-final-frame fast path (`BucketRenderer` post-render hold), multi-pass bloom, display blit + GL flush, shadow-state back to main, depth readback / focus-pick tick.

### WorkerProxy offset sync

`_localOffset` + `_offsetGuarded` (`engine-gmt/engine/worker/WorkerProxy.ts:51-53`) keep the gizmo overlay matching the rendered image: `FRAME_READY` updates `_localOffset` unless `setShadowOffset` just fired; the guard clears when the worker's reported offset converges within 0.001 of the set value (`engine-gmt/engine/worker/WorkerProxy.ts:208-222`, `engine-gmt/engine/worker/WorkerProxy.ts:554-567`).

`_pendingOffsetSync` is the atomic-absorb mechanism — orbit-mode camera absorb posts the new offset embedded in the next `RENDER_TICK` with `syncOffset: true`, avoiding a one-frame camera/offset mismatch (`engine-gmt/engine/worker/WorkerProxy.ts:541-549`, `engine-gmt/engine/worker/WorkerProxy.ts:668-678`).

`restart()` (`engine-gmt/engine/worker/WorkerProxy.ts:141-197`) is the Firefox sync-compile cancel escape hatch — `transferControlToOffscreen` is one-shot so the canvas must be replaced; the proxy stashes `_container` and `_lastInitArgs` on first init to support this.

`_pendingRequest` (`engine-gmt/engine/worker/WorkerProxy.ts:351-366`) is the generic id-keyed request/response/timeout pattern shared by snapshots, env maps, picks, focus picks, histograms, shader source, uniforms snapshot, and render info. `_handleWorkerCrash` (`engine-gmt/engine/worker/WorkerProxy.ts:396-429`) clears every pending Map + resolves with null/empty so callers can finish; invoked from both `onerror` and `terminateWorker`.

`updateTexture` is the texture transfer choke: HDR (RGBE) -> `ArrayBuffer` via TEXTURE_HDR, LDR -> `ImageBitmap` via TEXTURE with `flipY` orientation (`engine-gmt/engine/worker/WorkerProxy.ts:503-535`).

### Re-export shims

`PrecisionMath.ts` is a 12-line re-export shim — `VirtualSpace` lives in engine-core's navigation plugin since the 2026-04-24 navigation extraction (`engine-gmt/engine/PrecisionMath.ts:1-12`). `ViewportRefs.ts` (`engine-gmt/engine/worker/ViewportRefs.ts:1-22`) is a 22-line shim that fixed a duplicate-module-state bug — the gmt copy used to hold its own `_camera` field, so `timelineUtils` saw null on key-cam dirty check; gmt code must go through this re-export (or engine-core's true module) and never declare its own `_camera`.

## Invariants

- `engine.renderer` and `engine.pipeline` are null on the main thread under worker mode — code must guard via `engine.isBooted` or use the shadow state on `WorkerProxy` (`engine-gmt/engine/FractalEngine.ts:126-127`, `engine-gmt/engine/worker/WorkerProxy.ts:29-30`). This matches the project rule in `docs/gmt/01_System_Architecture.md:120` ("What NOT to Do").
- Singleton `getEngine()` is lazy, but `export const engine = getEngine()` at module bottom forces construction on import. New code should call `getEngine()` rather than import `engine` directly (`engine-gmt/engine/FractalEngine.ts:948-958`).
- `resetAccumulation()` deliberately does NOT set `dirty = true` — would infinite-loop with `update()`. Documented at `engine-gmt/engine/FractalEngine.ts:331-336`.
- `EngineRenderState.cameraInUse` is "the camera is being moved by ANY source" (user OR animation playback OR scrubbing). The bridge `GmtRendererTickDriver` (app-gmt) ORs them; `animationStore.isCameraInteracting` stays user-only. See `engine-gmt/engine/FractalEngine.ts:90-96`.
- Mode swap inside `updateConfigInternal` is conditional: only swap synchronously when `modeChanged && !rebuildNeeded`. Swapping while `rebuildNeeded` triggers lazy synchronous PT compilation inside `getMaterial()` which historically froze Windows for 14 s (`engine-gmt/engine/FractalEngine.ts:408-418`).
- The Halton jitter array is module-scope and shared across all engine instances — fine because it is read-only.
- `bucketRenderer` is a process-singleton initialized from `FractalEngine` constructor (`engine-gmt/engine/FractalEngine.ts:230`); only one engine can drive it. Worker mode initializes a worker-side singleton independently.
- During bucket rendering, the hold/accumulation reset logic in `compute()` is bypassed because `BucketRenderer` manages its own per-bucket cycle (`engine-gmt/engine/FractalEngine.ts:502-516`).
- Two-stage compile only kicks in when `compilePreview()` returns true; if `lighting.advancedLighting` is already false (preview == full) it returns false and the path drops to single-stage (`engine-gmt/engine/MaterialController.ts:272-274`, `engine-gmt/engine/CompileScheduler.ts:205-206`).
- `swapFullMaterial` disposes the old material — anything that cached a reference to `materialDirect` / `materialPT` (outside the `mainMaterial` getter) is at risk. The scheduler reassigns the mesh via `sceneCtrl.setMaterial` (`engine-gmt/engine/MaterialController.ts:348-380`, `engine-gmt/engine/CompileScheduler.ts:314`).
- `MaterialController.setUniform` propagates to FOUR uniform maps but skips when the target lacks the key — adding a uniform to `mainUniforms` does not automatically reach display/export materials unless they share refs (`engine-gmt/engine/MaterialController.ts:405-473`).
- Post-process materials reach into `mainUniforms` BY REFERENCE for shared keys (uTime etc.), so updates via `mainUniforms[key].value = …` propagate without `setUniform` (`engine-gmt/engine/MaterialController.ts:155-189`).
- After `postMessage`, THREE Vector / Matrix types arrive as plain `{x,y,z}` or `{elements:[…]}` — `MaterialController.setUniform` handles both; new uniform types must add fallback paths (`engine-gmt/engine/MaterialController.ts:427-455`).
- `lastCompiledFormula` includes the interlace formula id when `interlaceCompiled` is true — formula-switch detection must include both halves of the hybrid id (`engine-gmt/engine/CompileScheduler.ts:185-189`).
- `keepCurrent` skips modular uniform sync (would zero+refill the array, corrupting the still-rendering old shader's slot mapping); modular sync deferred until after `swapFullMaterial` (`engine-gmt/engine/CompileScheduler.ts:249-256`).
- The generation counter only protects post-yield code — synchronous portions can still race with rapid CONFIG bursts (`engine-gmt/engine/CompileScheduler.ts:60-61`).
- `WorkerProxy.bootWithConfig` automatically `restart()`s when `_bootSent` is already true — the sole way to cancel a Firefox synchronous compile (`engine-gmt/engine/worker/WorkerProxy.ts:471-485`).
- `_offsetGuarded` clears via drift-converged check ONLY — no timeout fallback. The previous 2 s auto-clear caused an F15 fly-mode bug where stale FRAME_READY data overwrote a fresh teleport (`engine-gmt/engine/worker/WorkerProxy.ts:551-567`).
- `applyOffsetShift` is a no-op on main thread — relies on FRAME_READY for `_localOffset` sync (`engine-gmt/engine/worker/WorkerProxy.ts:570-577`).
- `restart()` requires `_container` and `_lastInitArgs` set during init — recursive restart loses the camera if these are missing.
- `_pendingTeleport` (FractalEngine) and `WorkerProxy.pendingTeleport` (camera stash) are independent — main-thread `applyPresetState` writes to the proxy field, then `WorkerTickScene` boot-ready handler consumes it.
- `setConvergenceNeeded(false)` saves one render + two `setRenderTarget` swaps + one sync readPixels per 8 samples when RegionOverlay isn't mounted (`engine-gmt/engine/worker/WorkerProxy.ts:656-663`).
- `WorkerProxy.checkHalfFloatAlphaSupport()` is a permanent stub returning `true` — main thread cannot probe a worker's GL context (`engine-gmt/engine/worker/WorkerProxy.ts:664`). The real probe lives in the worker's `FractalEngine` (`engine-gmt/engine/FractalEngine.ts:894-944`); per q-094 it has no live consumer (see Known issues).
- Worker INIT is intentionally lazy (`engine-gmt/engine/worker/renderWorker.ts:93-96`) — only BOOT triggers `setupEngine()` heavy work (`engine-gmt/engine/worker/renderWorker.ts:98-100`).
- `LinearSRGBColorSpace` on the `WebGLRenderer` is mandatory — program hash must match between canvas and FBO compiles; `uEncodeOutput` does sRGB manually (`engine-gmt/engine/worker/renderWorker.ts:112-117`).

## Interactions with other subsystems

| Subsystem | Boundary | Notes |
|-----------|----------|-------|
| `e02-tick-registry` | `update -> syncFrame` is called from the per-tick driver (app-gmt's `GmtRendererTickDriver`); engine itself runs no clock | TickRegistry phase ordering documented in `docs/gmt/01_System_Architecture.md:120` |
| `e04-shader-builder` | `MaterialController.buildFullMaterial` / `compilePreview` consume `ShaderConfig` produced by `ShaderFactory` / `ShaderBuilder` | See `engine-gmt/engine/MaterialController.ts:261-347` |
| `e05-render-pipeline` | `FractalEngine.pipeline: RenderPipeline` constructed at `engine-gmt/engine/FractalEngine.ts:203` and driven by `compute -> pipelineRender` | Hold gate / sample cap / convergence live in `RenderPipeline` |
| `e06-adaptive-resolution` | `_lastCameraInUseTime` grace window extends hold through reduced->full transition (`engine-gmt/engine/FractalEngine.ts:546-557`); `state.adaptiveSuppressed` flows in via `EngineRenderState` | |
| `g02-shader-pipeline` | `ConfigManager` / `UniformManager` / `UniformSchema` are the lower half of this stack; `UniformManager.syncFrame` is the engine's single per-frame uniform writeback (`engine-gmt/engine/FractalEngine.ts:834-837`) | See `docs/gmt/02_Rendering_Internals.md:1` |
| `g06-bucket-render` | `bucketRenderer.init(this)` (`engine-gmt/engine/FractalEngine.ts:230`) is a process-singleton; `EngineRenderState.bucketConfig` (`engine-gmt/engine/FractalEngine.ts:143`) hard-codes a fallback that matches the runner + store seed (per q-092 — no drift today) | Worker mode initializes a worker-side singleton independently |
| `app-gmt` (bridge) | `EngineRenderState` is the React/Zustand -> engine contract via `RENDER_TICK`; bridge lives in `GmtRendererTickDriver` (app-gmt), not in this subsystem | `bindEvents` at `engine-gmt/engine/FractalEngine.ts:294-325` is the inbound side |
| Animation (`engine-gmt/animation`) | Modulations forwarded via `WorkerProxy.modulations` field (`engine-gmt/engine/worker/WorkerProxy.ts:74`), included in `EXPORT_RENDER_FRAME` messages | |

## Known issues / Phase 2 carry-in

- **q-091 (pending followup, skipped defensively).** Not enumerated in this doc's drift table; revisit when answered. Carry-in JSON cites no q-091 item for this subsystem.
- **q-092 (cleanup).** `EngineRenderState.bucketConfig` default at `engine-gmt/engine/FractalEngine.ts:143` agrees byte-for-byte with `BucketRunner.config` and `renderControlSlice` today — intentionally redundant for resilience, but easy to drift. Three sites must be touched together. Optional type-tightening targets: `BucketRenderConfig.samplesPerBucket` is typed optional but every call site sets it; the store does not seed `accumulation` even though engine + runner default it to `true`.
- **q-093 (drift / fragility).** `getCompiledFragmentShader()` and `getTranslatedFragmentShader()` (`engine-gmt/engine/FractalEngine.ts:862,876`) reach into `(renderer as any).properties.get(material)` — the internal `WeakMap`-backed material cache. Shape (`program`, `currentProgram`, `fragmentShader` as string vs `WebGLShader` handle) is undocumented Three.js implementation detail. We are pinned at `three: ^0.162.0`, so a caret-resolved minor bump can silently flip both methods to `null`. `getTranslatedFragmentShader` adds a second fragility: depends on `WEBGL_debug_shaders` extension (`engine-gmt/engine/FractalEngine.ts:879`) and defensively type-checks `fragmentShader` (`engine-gmt/engine/FractalEngine.ts:885-886`). Blast radius is diagnostic-only (`debug/bench-shader.mts`, `debug/inspect-state.mts`, `GET_SHADER_SOURCE` handler), but failure is silent. Add a Fragility Audit entry pointing at the Three version pin.
- **q-094 (cleanup).** `WorkerProxy.checkHalfFloatAlphaSupport(): true` (`engine-gmt/engine/worker/WorkerProxy.ts:664`) is a permanent stub. The real probe (`engine-gmt/engine/FractalEngine.ts:894-944`) has zero internal callers — return value is logged in dev and discarded. Three vestigial layers total (proxy stub, worker probe, no consumer). Harmless today; correct fix when a quality-feature path wants the truth is to publish a one-shot capability message from worker -> main on boot (e.g. extend `GPU_INFO`), then cache it main-side.
- **q-078 (out of scope, flagged).** `setEngineProxy` install at `engine-gmt/renderer/install.ts` is referenced by carry-in but lives outside this subsystem's claimed file set — likely a `g06-bucket-render` or app-gmt gap.
- **Cross-cutting (engine vs engine-gmt fork divergence).** Carry-in flags `PrecisionMath.ts` and `ViewportRefs.ts` as shims that look like duplication but exist deliberately (parametrisation hook in the case of `UniformSchema`; bug-fix shim in the case of `ViewportRefs`). Do NOT dedupe blindly. Header comments at `engine-gmt/engine/PrecisionMath.ts:1-12` and `engine-gmt/engine/worker/ViewportRefs.ts:1-22` are canonical.

## Historical context

This doc supersedes `docs/gmt/01_System_Architecture.md` for current API and invariants. The original is preserved for design rationale and aspirations:

- **Engine-Bridge pattern** — `docs/gmt/01_System_Architecture.md:120` is the canonical narrative: state changes flow Zustand -> FractalEvents -> engine; engine never imports stores; React never binds uniforms in useFrame. Renderer code does NOT contradict this; the per-frame contract is just more granular than the original §3 described.
- **DDFS, ShaderBuilder hook catalog (18 hooks x position x scope), `requestShading()` + `addShadingLogic()` deferred-generation pattern, satellite features (`LightSpheres dependsOn: ['lighting']`)** — preserved verbatim in `docs/gmt/01_System_Architecture.md` and covered by `g02-shader-pipeline` for the live-code surface.
- **Three-layer scalability pipeline** (Authored / Tier Overrides / Hardware Caps) — hardware caps applied as ceiling in `getShaderConfigFromState()` Stage 3; covered by `e06-adaptive-resolution`.
- **TickRegistry phase orchestration** (`SNAPSHOT -> ANIMATE -> OVERLAY -> UI`) — covered by `e02-tick-registry`.
- **Unified Camera Coordinate System** — split-float "treadmill" precision via CPU `VirtualSpace` + GLSL `applyPrecisionOffset()`; canonical `cameraPos = (0,0,0)`, world position in `sceneOffset` as `PreciseVector3`, `targetDistance = surface distance`, never orbit radius. The `engine-gmt/engine/PrecisionMath.ts:1-12` shim points at the engine-core source.

Key drift the original doc has against current code (a more compact form of the survey table at `plans/doc-audit-state/survey/g01-renderer.md:199`):

| Doc claim | Actual |
|-----------|--------|
| §3 "FractalEngine class acts as the conductor … `update()` … `render()`" (`docs/gmt/01_System_Architecture.md:142`) | API split into `update() -> compute() -> render()` (compute is the actual render call; render is a legacy stub for export) |
| §3 step 3 binary "Accumulating (TSS) vs Moving" | Accumulation/hold is `pipeline.setHold` driven by `cameraInUse || holdForAdaptive` + DoF override, not a simple binary |
| §4.1 diagram conflates app + engine layers (EngineBridge, WorkerTickScene, Navigation listed under "Main Thread") | EngineBridge / WorkerTickScene / Navigation are app-side (`app-gmt`); engine-gmt only exposes `WorkerProxy` + the worker entry |
| §4.2 protocol table lists `HISTOGRAM_REQUEST/RESULT` | Actual messages are `HISTOGRAM_READBACK` (main->worker, `engine-gmt/engine/worker/WorkerProtocol.ts:68`) and `HISTOGRAM_RESULT` (worker->main, `engine-gmt/engine/worker/WorkerProtocol.ts:111`) |
| §4.2 lists only Bucket + FocusPick | Actual protocol covers PreviewRegion, Bucket, RenderInfo, GpuInfo, FocusPick, Convergence gating, REGISTER_FORMULA, TEXTURE / TEXTURE_HDR, GET_SHADER_SOURCE / GET_UNIFORMS_SNAPSHOT, CAPTURE_ENV_MAP — all undocumented in the original |
| Doc never mentions | Two-stage compile (preview + async full), keepCurrent strategy, Firefox parallel-compile disablement, generation counter, `_offsetGuarded` drift-converged sync, `_pendingOffsetSync` atomic-absorb, `restart()` Firefox sync-compile cancel, compile spinner messaging differentiation, HDR vs LDR env-map readback, `LinearSRGBColorSpace` rationale, deferred INIT+BOOT, `setConvergenceNeeded` cost-gating |
| §3 "Input Handling: components/Navigation.tsx drives the camera math" | `engine-gmt` exposes its own `handleInput(EngineInputEvent)` (`engine-gmt/engine/FractalEngine.ts:235`) for non-Navigation flows; both paths coexist |

The original doc's §1 (Engine-Bridge), §2 (DDFS), §5 (TickRegistry), §6 (Coordinate System), and §7 (State) remain valid as narrative product overview and can be linked from this doc for the "why" layer.
