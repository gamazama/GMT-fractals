---
subsystem_id: g01-renderer
audited_at: 2026-05-19T21:42:21Z
files:
  - path: engine-gmt/engine/FractalEngine.ts
    blob_sha: fc8b7e4e48b66f448bea68ab8bfa7b5e36abb257
    lines_read: [1, 958]
    tier: A
  - path: engine-gmt/engine/MaterialController.ts
    blob_sha: 72ee88d8c9f588fb518dc0b58e01c94df93fad73
    lines_read: [1, 606]
    tier: A
  - path: engine-gmt/engine/SceneController.ts
    blob_sha: e99e8c1549a478aeeb6bf67368fe4c8580b2fefb
    lines_read: [1, 54]
    tier: A
  - path: engine-gmt/engine/CompileScheduler.ts
    blob_sha: 286d10fe67676121970eb6fc8eeac4f21d5d95b5
    lines_read: [1, 338]
    tier: A
  - path: engine-gmt/engine/PrecisionMath.ts
    blob_sha: c589c121d41fa889af9cdd77de66f87f2a0ea1b0
    lines_read: [1, 12]
    tier: A
  - path: engine-gmt/engine/HardwareDetection.ts
    blob_sha: 69ef2ff776917ba96090a0ab5a18b696e0c8430f
    lines_read: [1, 64]
    tier: B
  - path: engine-gmt/engine/LoadingRendererCPU.ts
    blob_sha: 42a81ab1f66af667dc00a14332a13bf761e89f48
    lines_read: [1, 131]
    tier: B
  - path: engine-gmt/engine/worker/WorkerProxy.ts
    blob_sha: dbdeb11ee0c8c05414d9f4e651c52568310a6eb9
    lines_read: [1, 879]
    tier: A
  - path: engine-gmt/engine/worker/WorkerProtocol.ts
    blob_sha: 1373fd0ae96c4837ba6deb4c28569e6fe090ad3b
    lines_read: [1, 130]
    tier: A
  - path: engine-gmt/engine/worker/ViewportRefs.ts
    blob_sha: f82e124296fff6dbd2536c47624dbf1eaba0b2c0
    lines_read: [1, 22]
    tier: C
  - path: engine-gmt/engine/worker/WorkerExporter.ts
    blob_sha: 3ad294b7a1bc4feb7252ab54c05096430a915015
    lines_read: [1, 60]
    tier: C
  - path: engine-gmt/engine/worker/WorkerHistogram.ts
    blob_sha: 726f7b0f6fb236f49c49028bf8af89bdbcccc94a
    lines_read: [1, 40]
    tier: C
  - path: engine-gmt/engine/worker/WorkerDepthReadback.ts
    blob_sha: 57a4918d9dbed116fb7ae6e6426e396b4c64e232
    lines_read: [1, 40]
    tier: C
  - path: engine-gmt/engine/worker/renderWorker.ts
    blob_sha: 12ae03838f682ce88eee6b738dd938953c6b1d27
    lines_read: [1, 120]
    tier: C
  - path: engine-gmt/engine/worker/handleRenderTick.ts
    blob_sha: fbb55be5dae3ac344dfdaa0ae61d26f411aefc44
    lines_read: [1, 60]
    tier: C
---

## Public API surface

**FractalEngine** (`engine-gmt/engine/FractalEngine.ts`):
- Class instantiated via lazy singleton `getEngine()` (FractalEngine.ts:950); deprecated re-export `engine` at :958.
- Public fields: `materials`, `sceneCtrl`, `virtualSpace`, `renderer` (set lazily), `pipeline`, `modulations`, `state: EngineRenderState` (FractalEngine.ts:118-145).
- Public accessors: `isGizmoInteracting`, `cameraInUse`, `isPaused`, `shouldSnapCamera`, `lastMeasuredDistance`, `dirty`, `isBooted`; getters proxying `materials`/`sceneCtrl`/`compiler` (FractalEngine.ts:147-292).
- Methods: `handleInput`, `markInteraction`, `preloadConfig`, `bootWithConfig`, `registerCamera`, `registerRenderer`, `syncCameraFromMatrix`, `awaitCompile`, `resolveLightPosition`, `setUniform`, `setRenderState`, `update`, `compute`, `render`, `pipelineRender`, `captureSnapshot`, `captureEnvMap`, `pickWorldPosition`, `pickWorldPositionFast`, `measureDistanceAtScreenPoint`, `getCompiledFragmentShader`, `getTranslatedFragmentShader`, `checkHalfFloatAlphaSupport`, `fireCompile`, `setPreviewSampleCap`, `updateTexture`, `resetAccumulation`, `syncFrame` (FractalEngine.ts:235-944).
- Public type exports: `EngineInputEvent`, `EngineRenderState` (FractalEngine.ts:81-108).

**MaterialController** (`engine-gmt/engine/MaterialController.ts:46`):
- Public: `materialDirect`, `materialPT`, `histogramMaterial`, `displayMaterial`, `exportMaterial`, `mainUniforms`, `histogramUniforms`, `shaderDirty`, `isPreviewActive`, `mainMaterial` getter (:138).
- Methods: `getMaterial`, `getLastFrag`, `updateConfig`, `compilePreview`, `buildFullMaterial`, `swapFullMaterial`, `getUniform`, `setUniform`, `loadTexture`, `rebuildEnvCDF`, `setGradient`, `syncModularUniforms`, `syncConfigUniforms` (MaterialController.ts:142-605).

**SceneController** (`engine-gmt/engine/SceneController.ts:6`):
- Fields: `mainScene`, `mainCamera` (Ortho), `mainMesh`, `displayScene`, `displayMesh`, `activeCamera`, `fallbackCamera` (Perspective).
- Methods: `setMaterial`, `registerCamera`, `getCamera`, `updateFallback`.

**CompileScheduler** (`engine-gmt/engine/CompileScheduler.ts:49`):
- Fields: `isCompiling`, `hasCompiledShader`, `lastDuration`.
- Methods: `schedule`, `fire`, `awaitCompile`, `dispose`.
- Constructed with `CompileSchedulerDeps` callback interface (CompileScheduler.ts:32).

**PrecisionMath** (`engine-gmt/engine/PrecisionMath.ts:12`): re-export shim — `VirtualSpace` actually lives in `engine/plugins/navigation/core/VirtualSpace` (engine-core).

**HardwareDetection** (`engine-gmt/engine/HardwareDetection.ts`):
- `detectHardwareProfile(gl?)` (:13), `detectHardwareProfileMainThread()` (:62) — return `HardwareProfile` from `../types/viewport`.

**LoadingRendererCPU** (`engine-gmt/engine/LoadingRendererCPU.ts:7`): `render(time, progress)`, `dispose()`. CPU Julia spinner.

**WorkerProxy** (`engine-gmt/engine/worker/WorkerProxy.ts:23`):
- Implements `AccumulationController` (engine-core), exposes the same shape as `FractalEngine` for the UI but message-passes everything to the worker.
- `getProxy()` lazy singleton (:876).
- Stub fields: `activeCamera`, `virtualSpace`, `renderer`, `pipeline` all `null` (:27-30).
- Methods: `initWorkerMode`, `restart`, `bootWithConfig`, `setUniform`, `setPreviewSampleCap`, `resetAccumulation`, `markInteraction`, `updateTexture`, `queueOffsetSync`, `setShadowOffset`, `applyOffsetShift`, `resolveLightPosition`, `measureDistanceAtScreenPoint`, `pickWorldPosition` (sync stub + async promise), `startFocusPick`/`sampleFocusPick`/`endFocusPick`, `captureSnapshot`, `captureEnvMap`, `requestHistogramReadback`, `getCompiledFragmentShader`/`getTranslatedFragmentShader`, `getUniformsSnapshot`, `getRenderInfo`, `setConvergenceNeeded`, `sendRenderTick`, `resizeWorker`, `sendConfig`, `registerFormula`, `startExport`/`renderExportFrame`/`finishExport`/`cancelExport`, `startBucketRender`/`stopBucketRender`, `setPreviewRegion`/`clearPreviewRegion`, `terminateWorker` (WorkerProxy.ts:96-869).

**WorkerProtocol** (`engine-gmt/engine/worker/WorkerProtocol.ts`):
- `SerializedCamera`, `SerializedOffset`, `WorkerShadowState` interfaces (:15-41).
- Discriminated unions `MainToWorkerMessage` (:45-96) and `WorkerToMainMessage` (:100-130).

**ViewportRefs** (`engine-gmt/engine/worker/ViewportRefs.ts`): re-export shim — true source in engine-core's `engine/worker/ViewportRefs`.

**Worker internals (Tier C)**:
- `renderWorker.ts` — worker entry; owns FractalEngine + WebGLRenderer + OffscreenCanvas (:23-27); dispatches `MainToWorkerMessage` to handlers; deferred-init pattern at :86-100.
- `handleRenderTick.ts` — extracted hot-loop tick body (`handleRenderTick` export at :48).
- `WorkerExporter.ts` — video + image-sequence export session (class `WorkerExporter`, session iface :20-78).
- `WorkerHistogram.ts` — module-level histogram pipeline + `handleHistogramReadback` (HISTOGRAM_SIZE=128, :14).
- `WorkerDepthReadback.ts` — async PBO depth readback + focus-pick state machine (class `WorkerDepthReadback`, :24-34).

## Architecture (file:line citations)

- FractalEngine wires six collaborators in the constructor: `ConfigManager`, `MaterialController`, `SceneController`, `RenderPipeline`, `PickingController`, `UniformManager`, `CompileScheduler`, plus singleton `bucketRenderer.init(this)` (FractalEngine.ts:200-230).
- `EngineRenderState` holds the per-tick state pulled from React/Zustand (`cameraMode`, `optics`, `lighting`, `quality`, `geometry`, `bucketConfig`, `adaptiveSuppressed`, `cameraInUse`, …) — explicitly NOT mutated outside `setRenderState`/the message bridge (FractalEngine.ts:85-108).
- `cameraInUse` is a unified hold gate that ORs user-input AND animation playback/scrubbing; the bridge owns the OR — animationStore-side `isCameraInteracting` stays user-only (FractalEngine.ts:90-96).
- `FRACTAL_EVENTS` subscriptions in `bindEvents` are the inbound channel: `UNIFORM`, `CONFIG`, `RESET_ACCUM`, `OFFSET_SHIFT`, `OFFSET_SET`, `CAMERA_ABSORB`, `CAMERA_SNAP`, `CAMERA_TELEPORT` (FractalEngine.ts:294-325).
- `update()` does smoothing, dirty detection, jitter index advance, and calls `syncFrame` → `UniformManager.syncFrame` which is the single canonical uniform writeback point per frame (FractalEngine.ts:468-521, :834-837).
- `compute()` is the actual render call: builds the hold/jitter state, then `pipelineRender(renderer)`. Hold extends through adaptive-resolution grace (~grace+50 ms) to avoid double accumulation reset (FractalEngine.ts:529-583). Comment at :547-552 details the bug.
- Jitter is precomputed Halton (2,3) of length 2048 at module load, then consumed mod-N by accumulationCount (FractalEngine.ts:111-116, :565-572).
- `_totalFrames` (continuous) vs `accumulationCount` (per-bucket) is selected for `Uniforms.FrameCount` based on `isBucketRendering` — bucket gets deterministic R2 noise sequences per bucket (FractalEngine.ts:473-479).
- `captureEnvMap` branches HDR vs LDR by source `THREE.HalfFloatType|FloatType` → `captureEnvMapAsHDR` writes Radiance .hdr; LDR path tonemaps with ACES to a sRGB FBO + JPEG (FractalEngine.ts:614-784, :33-77 RGBE encoder).
- `captureSnapshot` uses the post-process display chain at the FBO resolution; it forces `uEncodeOutput=1` and restores on exit (FractalEngine.ts:786-832).
- `MaterialController` keeps Direct + PathTracing materials in parallel and shares `mainUniforms` between them — switching mode is a Three.js material swap with no uniform recopy (MaterialController.ts:46-153).
- Two-stage compile uses three material slots: preview = `materialDirect|materialPT` written by `compilePreview` (lighting forced off), full = `buildFullMaterial` returned to CompileScheduler then `swapFullMaterial`'d in (MaterialController.ts:261-370).
- `swapFullMaterial` disposes the old material and reassigns `materialDirect`/`materialPT` to the freshly compiled one; mode is read from `_gmtMode` metadata attached by `buildFullMaterial` (MaterialController.ts:336-369).
- Histogram material always recompiles from a forced Direct, lighting.renderMode=0 config — guarantees the histogram never path-traces (MaterialController.ts:127-134, :294-300).
- `MaterialController.setUniform` propagates writes to four uniform maps (`mainUniforms`, `histogramUniforms`, `displayMaterial.uniforms`, `exportMaterial.uniforms`) and handles plain-object fallbacks for postMessage-stripped THREE types including `Matrix3`/`Matrix4` (MaterialController.ts:405-473, :447-455).
- `display`/`exportMaterial` post-process materials share uniform refs with `mainUniforms` (only their own `map`/`uResolution`/`uEncodeOutput`/`uBloomTexture`/`uPreviewBoxTaps` are local), so `uTime`/etc. propagate without copying (MaterialController.ts:155-189, :170-179 comment).
- `rebuildEnvCDF` builds an env-luminance CDF for PT_ENV_MIS_IS via `buildEnvCDF`/`extractEnvImageSource`; falls back to a 1×1 stub which GLSL handles as uniform-sphere PDF (MaterialController.ts:509-549).
- `SceneController` is a thin holder; the main render mesh, display mesh, and a `fallbackCamera` PerspectiveCamera (used when no external camera is registered) live here (SceneController.ts:6-53).
- `CompileScheduler.schedule` debounces 200 ms and waits for `CONFIG_DONE` (or fallback timer) before firing — coalesces rapid CONFIG bursts (CompileScheduler.ts:74-93).
- `CompileScheduler.fire` polls `getRenderer()` every 50 ms until renderer ready, then runs `perform` (CompileScheduler.ts:97-114).
- `perform` chooses one of three strategies: `keepCurrent` (same formula, parallel compile available, prior compile done → keep current shader on screen during async swap), `twoStage` (parallel compile + new formula → preview-while-full-builds), `singleStage` (Firefox or lighting already off — synchronous) (CompileScheduler.ts:180-205).
- Firefox is force-detected and excluded from parallel-compile path because its KHR exposure compiles synchronously on GPU thread (CompileScheduler.ts:172-178).
- `formulaChanged` key includes interlace formula id when `interlaceCompiled` is true (CompileScheduler.ts:185-189).
- `hasCompiledShader` and `lastCompiledFormula` are set BEFORE async yields so concurrent perform() invocations see updated state (CompileScheduler.ts:222-227 comment).
- Stage 2 builds `fullMat`, runs `compileAsync` on a hidden scene, hot-swaps via `materials.swapFullMaterial`, then syncs modular uniforms ONLY AFTER swap because the previous shader's pipeline param layout differs (CompileScheduler.ts:279-322, :249-256 comment).
- Generation counter (`this.generation` vs captured `generation`) drops in-flight compiles when newer ones arrive (CompileScheduler.ts:60-61, :276-277, :307-310).
- Compile telemetry: `console.log('[Compile] Single-stage'/Two-stage…')` is marked "do not remove" — used as a profiling waypoint (CompileScheduler.ts:238-239, :330-331).
- `PrecisionMath.ts` is a 12-line re-export shim; `VirtualSpace` truly lives in `engine/plugins/navigation/core/VirtualSpace` since the 2026-04-24 navigation extraction (PrecisionMath.ts:1-12).
- `HardwareDetection.detectHardwareProfile(gl?)` probes Float32 RGBA32F FBO completion to decide `supportsFloat32`; tier is `low` if mobile+!Float32, `mid` if mobile, else `high` (HardwareDetection.ts:13-56).
- Hardware caps drive `precisionMode`, `bufferPrecision` (0 Float32 / 1 HalfFloat16), and `compilerHardCap` (`MOBILE_HARD_CAP` vs `DEFAULT_HARD_CAP`) (HardwareDetection.ts:50-55).
- FractalEngine constructor uses main-thread `detectHardwareProfileMainThread` (no GL context — mobile heuristics only) to set `state.isMobile`, then forces `precisionMode=1`, `bufferPrecision=1` on mobile (FractalEngine.ts:188, :194-198).
- `LoadingRendererCPU` is a CPU Canvas2D Julia spinner with cosine palette; renders at canvas client size with `imageData` recreated on resize (LoadingRendererCPU.ts:7-131).
- WorkerProxy is the singleton main-thread façade implementing `AccumulationController` from engine-core; it deliberately uses `import type` to avoid TDZ on FractalEngine (WorkerProxy.ts:8-23, header comment :1-9).
- `_shadow: WorkerShadowState` is the cached mirror of worker state that satisfies `engine.isCompiling`/`accumulationCount`/etc. without round-tripping (WorkerProxy.ts:33-38).
- `_localOffset` + `_offsetGuarded` are a 2026-era invention to make the gizmo overlay match the rendered image: FRAME_READY syncs unless a setShadowOffset just fired; guard clears when worker's reported offset converges within 0.001 of the set value (WorkerProxy.ts:40-51, :208-222, :554-567).
- `_pendingOffsetSync` is the atomic-absorb mechanism — orbit-mode camera absorb posts the new offset embedded in the next RENDER_TICK with `syncOffset: true`, avoiding a 1-frame camera/offset mismatch (WorkerProxy.ts:541-549, :668-678).
- `restart()` is the Firefox sync-compile cancel escape hatch: terminate worker, replace canvas (`transferControlToOffscreen` is one-shot), re-init + re-boot (WorkerProxy.ts:141-197).
- `_pendingRequest` is the generic id-keyed request/response/timeout pattern shared by snapshots, env maps, picks, focus picks, histograms, shader source, uniforms snapshot, render info (WorkerProxy.ts:351-366).
- `_handleWorkerCrash` clears every pending Map + resolves with null/empty so callers can finish; called by both `onerror` and `terminateWorker` (WorkerProxy.ts:396-429).
- `updateTexture` is the texture transfer choke: HDR (RGBE/.hdr) → `ArrayBuffer` via TEXTURE_HDR, LDR → `ImageBitmap` via TEXTURE with `flipY` orientation (WorkerProxy.ts:503-535).
- `WorkerProtocol` is the single source of truth for message shapes — engineering-grade discriminated unions; both files import it (WorkerProtocol.ts:45-130).
- `WorkerShadowState` includes `accumulationCount`, `convergenceValue`, `frameCount`, `sceneOffset`, `dirty`, `isCompiling`, `lastCompileDuration`, `lastMeasuredDistance`, `isPaused`, `isBooted`, `hasCompiledShader` — all backed by getters on FractalEngine (WorkerProtocol.ts:29-41).
- `ViewportRefs.ts` is a 22-line re-export shim that fixed a duplicate-module-state bug — the gmt copy held its own `_camera`, so timelineUtils saw null on key-cam dirty check (ViewportRefs.ts:1-23 header comment).
- `renderWorker.ts` defers heavy WebGL setup until BOOT — INIT only stashes the message; this lets terminated workers' GPU compiles drain without blocking re-init (renderWorker.ts:84-100 + comment).
- `renderWorker.ts` sets `renderer.outputColorSpace = LinearSRGBColorSpace` because GMT manages sRGB encoding via `uEncodeOutput` in post-process — avoids program hash divergence between canvas and FBO programs (renderWorker.ts:117 + comment).
- `handleRenderTick.ts` is the seven-step per-frame body (camera + offset → engine.update/compute → optional held final frame → bloom → display blit + flush → shadow state → depth readback/focus pick) — header comment is the canonical order (handleRenderTick.ts:1-15).
- `BucketRenderer` is the engine-side singleton initialized from FractalEngine constructor (`bucketRenderer.init(this)`, FractalEngine.ts:230). Worker-side `WorkerExporter` is a class instance owned by `renderWorker.ts` (renderWorker.ts:27).

## Invariants and gotchas

- `engine.renderer` and `engine.pipeline` are null on the main thread under worker mode — code must guard via `engine.isBooted` or use the shadow state on `WorkerProxy` (FractalEngine.ts:126-127, WorkerProxy.ts:29-30; matches CLAUDE.md "What NOT to Do").
- Singleton `getEngine()` instantiates `FractalEngine` lazily but `export const engine = getEngine()` at module bottom forces immediate construction — anyone importing `engine` triggers the singleton (FractalEngine.ts:948-958). New code should use `getEngine()`.
- `resetAccumulation` deliberately does NOT set `this.dirty = true` to avoid infinite-loop with `update()` (FractalEngine.ts:331-336 comment).
- `EngineRenderState.cameraInUse` is a "is the camera being moved by ANY source" gate (user OR animation OR scrubbing); `animationStore.isCameraInteracting` stays user-only. The bridge `GmtRendererTickDriver` ORs them (FractalEngine.ts:90-96 comment).
- Mode swap inside `updateConfigInternal` is conditional: only swap synchronously when `modeChanged && !rebuildNeeded`. Doing it when `rebuildNeeded` triggers lazy synchronous PT compilation in `getMaterial()` which fxc'd a 14 s freeze on Windows (FractalEngine.ts:408-418 comment).
- Halton jitter array is module-scope and shared across all engines/instances — fine since it's read-only.
- `bucketRenderer` is a process-singleton, initialized from FractalEngine constructor; only one engine can drive it. Worker mode initializes a worker-side singleton independently (FractalEngine.ts:230).
- `_lastCameraInUseTime` extends compute() hold through the adaptive-resolution grace window (~grace + 50 ms) to avoid double-kick at reduced→full transition (FractalEngine.ts:546-557 comment).
- During bucket rendering, hold/accumulation reset logic is bypassed because BucketRenderer manages its own per-bucket cycle (FractalEngine.ts:502-516).
- Two-stage compile only kicks in when `compilePreview()` returns true; if `lighting.advancedLighting` is already false (preview === full) it returns false and the path drops to single-stage (MaterialController.ts:272-274, CompileScheduler.ts:205-206).
- `swapFullMaterial` disposes the old material — anything that cached a reference to `materialDirect`/`materialPT` (outside `mainMaterial` getter) is at risk. Mesh is reassigned via `sceneCtrl.setMaterial` in scheduler (MaterialController.ts:352-364, CompileScheduler.ts:314).
- `MaterialController.setUniform` propagates to FOUR uniform maps but skips when target lacks the key — so adding a uniform to mainUniforms doesn't automatically reach display/export materials unless they share refs (MaterialController.ts:405-473, :175-179 comment).
- Post-process materials reach into `mainUniforms` BY REFERENCE for shared keys (uTime etc.), so updates via `mainUniforms[key].value = …` propagate without `setUniform` (MaterialController.ts:175-179).
- After `postMessage`, THREE Vector/Matrix types arrive as plain `{x,y,z}` or `{elements:[]}` — `MaterialController.setUniform` handles both, but new uniform types must add fallback paths (MaterialController.ts:427-455).
- `lastCompiledFormula` includes interlace formula id when `interlaceCompiled` is true — formula switch detection must include both halves of the hybrid id (CompileScheduler.ts:185-189).
- Compile spinner messaging differentiates two-stage ("Loading Preview…") from single-stage ("Compiling Shader…") to avoid misleading users on Firefox/same-formula recompile (CompileScheduler.ts:192-202 comment).
- `keepCurrent` skips modular uniform sync (would zero+refill the array, corrupting the still-rendering old shader's slot mapping); modular sync deferred until after `swapFullMaterial` (CompileScheduler.ts:249-256 comment).
- Generation counter only protects post-yield code — synchronous portions can still race with rapid CONFIG bursts.
- `WorkerProxy.bootWithConfig` automatically `restart()`s when `_bootSent` is already true — sole way to cancel a Firefox synchronous compile (WorkerProxy.ts:471-485).
- `_offsetGuarded` clears via drift-converged check ONLY — no timeout fallback (the previous 2 s auto-clear caused F15 fly-mode bug where stale FRAME_READY data overwrote a fresh teleport) (WorkerProxy.ts:551-567 comment).
- `applyOffsetShift` is a no-op on main thread — relies on FRAME_READY for `_localOffset` sync (WorkerProxy.ts:570-577 comment).
- `restart()` requires `_container` and `_lastInitArgs` set during init — recursive restart would lose camera; tests must respect this.
- `_pendingTeleport` (FractalEngine) and `WorkerProxy.pendingTeleport` (camera stash) are independent — main-thread `applyPresetState` writes to the proxy field, then `WorkerTickScene` boot-ready handler consumes it.
- `setConvergenceNeeded(false)` saves one render + two setRenderTarget swaps + one sync readPixels per 8 samples when RegionOverlay isn't mounted (WorkerProxy.ts:656-663 comment).
- Worker `INIT` is lazy (just stash + `READY`); `BOOT` triggers `setupEngine()` heavy work (renderWorker.ts:86-100). Resize between INIT and BOOT is buffered in `_pendingResize`.
- `LinearSRGBColorSpace` is set on `WebGLRenderer` deliberately so program hash matches between canvas and FBO compiles — `uEncodeOutput` does sRGB manually (renderWorker.ts:112-117).
- `PrecisionMath` is purely a shim — the real `VirtualSpace` is engine-core's navigation plugin; new code should import from there directly (PrecisionMath.ts:1-12 comment).
- `ViewportRefs` is a shim that fixed cross-module state divergence — gmt code MUST go through this re-export (or engine-core's true module), not declare its own `_camera` (ViewportRefs.ts:1-22 header comment).
- `WorkerProxy.checkHalfFloatAlphaSupport() { return true; }` is a permanent stub — main-thread can't probe a worker's GL context; the real probe runs in the worker's FractalEngine (WorkerProxy.ts:664, FractalEngine.ts:894-944).

## Drift from existing doc (dev/docs/gmt/01_System_Architecture.md)

| Doc claim | Actual | Status |
|-----------|--------|--------|
| §3 "FractalEngine class acts as the conductor … `update()` … `render()`" (lines 142-154) | API has split into `update()` → `compute()` → `render()` with `compute()` being the actual render call; `render()` is a legacy stub that calls `compute()` + blit for export paths (FractalEngine.ts:468-597) | DRIFT |
| §3 step 3 "If **Accumulating** (TSS): Blends the new frame with the previous … If **Moving**: Renders a single fast frame." | Accumulation/hold is now controlled by `pipeline.setHold` driven by `cameraInUse || holdForAdaptive` + DoF override; not a simple binary (FractalEngine.ts:540-557) | DRIFT |
| §4.1 diagram lists "Main Thread … EngineBridge", "WorkerTickScene", "Navigation", "WorkerProxy" | EngineBridge / WorkerTickScene / Navigation are app-side (`app-gmt`), not part of engine-gmt; engine-gmt exposes only `WorkerProxy` + the worker entry (`renderWorker.ts`) (WorkerProxy.ts:1-9, renderWorker.ts:1-8) | OK conceptually, but doc conflates app + engine layers — diagram should label which side owns each box |
| §4.2 protocols table lists `HISTOGRAM_REQUEST/RESULT` | Actual messages are `HISTOGRAM_READBACK` (main→worker) + `HISTOGRAM_RESULT` (worker→main) (WorkerProtocol.ts:68, :111) | DRIFT |
| §4.2 protocols table omits PreviewRegion / Bucket / RenderInfo / GpuInfo / FocusPick (only Bucket and FocusPick mentioned) | `PREVIEW_REGION_SET/CLEAR`, `BUCKET_START/STOP/STATUS/IMAGE`, `GET_RENDER_INFO`/`RENDER_INFO`, `GET_GPU_INFO`/`GPU_INFO`, `FOCUS_PICK_START/SAMPLE/END`/`FOCUS_RESULT`, `SET_CONVERGENCE_NEEDED`, `REGISTER_FORMULA`, `TEXTURE`/`TEXTURE_HDR`, `GET_SHADER_SOURCE`/`SHADER_SOURCE_RESULT`, `GET_UNIFORMS_SNAPSHOT`/`UNIFORMS_SNAPSHOT_RESULT`, `CAPTURE_ENV_MAP`/`ENV_MAP_RESULT` all unmentioned (WorkerProtocol.ts:55-130) | DRIFT (major) |
| §4.3 mentions `useAppStartup`, `LoadingScreen` | Both live in app-gmt layer, not in engine-gmt; out of scope for this subsystem but the prose treats them as engine-level | OK (cross-layer narration), drift only if §4.3 is meant to describe engine-gmt |
| §4.4 "Vite config requires `worker: { format: 'es' }`" | Still true — confirmed via WorkerProxy `new Worker(new URL('./renderWorker.ts'), { type: 'module' })` (WorkerProxy.ts:112-114, :176-178) | OK |
| §4.4 "Matrix3/Matrix4 from worker arrive as plain `{elements: [...]}` — MaterialController.setUniform handles this" | Confirmed at MaterialController.ts:448-455 | OK |
| Doc never mentions: (a) two-stage compile (preview + async full), (b) keepCurrent strategy, (c) Firefox parallel-compile disablement, (d) generation counter, (e) `_offsetGuarded`/drift-converged sync, (f) `_pendingOffsetSync` atomic-absorb, (g) `restart()` Firefox sync-compile cancel, (h) compile spinner messaging differentiation, (i) HDR vs LDR env-map readback (Radiance + ACES JPEG), (j) `LinearSRGBColorSpace` rationale, (k) deferred INIT+BOOT in renderWorker, (l) `setConvergenceNeeded` cost-gating | All implemented in current code | DRIFT (major) |
| §2.3 / §6 reference `HardwareDetection` and `VirtualSpace` as engine-side helpers | `HardwareDetection.ts` lives at engine-gmt root; `VirtualSpace` is in engine-core (`engine/plugins/navigation/core/VirtualSpace`) — `PrecisionMath.ts` is a 12-line shim (PrecisionMath.ts:1-12) | DRIFT — doc references appear correct conceptually but the path/file ownership has shifted post-extraction |
| §3 "Input Handling: components/Navigation.tsx drives the camera math" | engine-gmt exposes its own `handleInput(EngineInputEvent)` for non-Navigation flows (FractalEngine.ts:235-252); Navigation is app-side. Both paths coexist. | DRIFT — `handleInput` undocumented |
| §7 mentions state slices but not the EngineRenderState shape | `EngineRenderState` (FractalEngine.ts:85-108) is the bridge contract from React → engine via RENDER_TICK; worth documenting at engine-doc level | DRIFT — missing |

**Recommendation:** The doc (`docs/gmt/01_System_Architecture.md`, last updated 2026-03-27) predates the engine extraction (engine-gmt vs engine-core split), the two-stage compile, the worker offset-sync redesign, and the WorkerProtocol expansion. >10 rows of drift and most of §3 / §4 needs a rewrite. Recommend a fresh `docs/engine-gmt/01_renderer.md` keyed to the actual files under `engine-gmt/engine/` rather than patching the old doc — the old doc is a narrative product overview, the new audit-driven doc should be a structural reference. The narrative doc can keep §1 (Engine-Bridge), §2 (DDFS), §5 (TickRegistry), §6 (Coordinate System), §7 (State) as-is and link out to the new renderer doc for §3-§4.

## Open questions

- Why does `LoadingRendererCPU` live at engine-gmt root rather than under a `loading/` or `splash/` subfolder? No imports of it surface from the audited files — likely consumed by `app-gmt`. Worth confirming sole-caller in g02-app sweep.
- `EngineRenderState.bucketConfig` default in FractalEngine.ts:143 hard-codes `bucketSize: 512, outputWidth: 1920, outputHeight: 1080, tileCols: 1, tileRows: 1, convergenceThreshold: 0.25, accumulation: true, samplesPerBucket: 64`. Is this still in sync with `BucketRenderer`'s expected defaults? Out of scope; flag for the bucket-renderer audit.
- `FractalEngine.getCompiledFragmentShader` / `getTranslatedFragmentShader` reach into `this.renderer.properties` (private Three API) — fragile across Three upgrades. Should this be documented as a known-fragility?
- `WorkerProxy.checkHalfFloatAlphaSupport() { return true; }` — main-thread stub always returns true. If the real worker probe fails on a device, the proxy lies. Is there a code path that needs the real value on the main thread? (Probably not — config is set worker-side, but worth a sanity check during the quality-feature audit.)
- Orphan-sweep candidate: `engine-gmt/engine/PrecisionMath.ts` — 12-line shim, comment says "Delete this shim once the engine-gmt import sites migrate." Worth a grep for residual `import … PrecisionMath` users.
- Orphan-sweep candidate: `engine-gmt/engine/worker/ViewportRefs.ts` — 22-line shim with same delete-on-migration story (ViewportRefs.ts header). Audit how many gmt-side files still import this vs the engine-core source.
- Orphan-sweep candidate: `engine-gmt/engine/LoadingRendererCPU.ts` — adjacent file with no engine internal references; if app-gmt is its sole consumer, consider moving under `app-gmt/components/`.
- The FractalEngine RGBE encoder (`encodeRadianceHDR`, FractalEngine.ts:33-77) is a self-contained file-format encoder — pure utility, would fit under `utils/` or `codec/`. Adjacent unclaimed responsibility worth flagging for code-org cleanup.
