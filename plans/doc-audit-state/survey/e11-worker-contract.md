---
subsystem_id: e11-worker-contract
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/worker/WorkerProxy.ts
    blob_sha: 4b09ae1f221ca875c42802401d897b6adc35e602
    lines: 1-303
  - path: engine/worker/ViewportRefs.ts
    blob_sha: 846013fb07d236890682b075e3beba4d0d42dcfe
    lines: 1-122
---

## Public API surface

### engine/worker/WorkerProxy.ts

**Types (re-exportable):**
- `EngineRenderState = Record<string, unknown>` — opaque placeholder for per-frame engine state (`engine/worker/WorkerProxy.ts:25`).
- `BucketRenderConfig` — `{ bucketSize, outputWidth, outputHeight, tileCols, tileRows, convergenceThreshold, accumulation, samplesPerBucket }` (`engine/worker/WorkerProxy.ts:26-35`).
- `SerializedCamera` — `{ position: [3], quaternion: [4], fov }` (`engine/worker/WorkerProxy.ts:36-40`).
- `SerializedOffset` — `{ x, y, z, xL, yL, zL }` (double-precision split offset shape) (`engine/worker/WorkerProxy.ts:41`).

**Class `WorkerProxy implements AccumulationController` (`engine/worker/WorkerProxy.ts:43`):**

*Inert refs (`engine/worker/WorkerProxy.ts:45-48`):* `activeCamera`, `virtualSpace`, `renderer`, `pipeline` — all `null`.

*Lifecycle (`engine/worker/WorkerProxy.ts:87-114`):*
- `initWorkerMode(canvas, config, w, h, dpr, isMobile, initialCamera?)` — no-op.
- `restart(newConfig, initialCamera?)` — no-op.
- `bootWithConfig(config, initialCamera?)` — sets `_bootSent = true`, `_shadow.isBooted = true`, fires `onBooted` callback.
- `terminateWorker()` — no-op.

*Callback setters (`engine/worker/WorkerProxy.ts:118-123`):*
- `set onCompiling`, `set onCompileTime`, `set onShaderCode`, `set onBooted`, `set onCrash`, `registerFrameCounter(cb)`.

*Messaging (`engine/worker/WorkerProxy.ts:127`):* `post(msg, transfer?)` — no-op.

*Shadow-state accessors (`engine/worker/WorkerProxy.ts:131-155`):* `isBooted`, `isCompiling`, `isExporting`, `isBucketRendering`, `sceneOffset`, `lastGeneratedFrag`, `accumulationCount`, `convergenceValue`, `frameCount`, `lastCompileDuration`, `lastMeasuredDistance` (get/set), `hasCompiledShader`, `dirty` (get/set), `isPaused` (get/set), `shouldSnapCamera` (get/set — always false), `isGizmoInteracting` (get/set), `cameraInUse` (get/set — always false), `bootSent`, `gpuInfo` (defaults `'Stub (no worker)'`).

*Commands (`engine/worker/WorkerProxy.ts:159-184`):* `setUniform`, `setPreviewSampleCap`, `resetAccumulation`, `markInteraction`, `updateTexture`, `queueOffsetSync`, `setShadowOffset`, `applyOffsetShift`, `resolveLightPosition` (returns input position unchanged), `measureDistanceAtScreenPoint` (returns last cached value).

*Picks / probes (`engine/worker/WorkerProxy.ts:188-209`):*
- `pickWorldPosition(x, y)` overload — sync returns `null`; `pickWorldPosition(x, y, true, fast?)` async returns `Promise<null>`.
- `startFocusPick(x, y) → Promise<-1>`, `sampleFocusPick(x, y) → Promise<-1>`, `endFocusPick()` no-op.
- `captureSnapshot() → Promise<null>`.
- `requestHistogramReadback(source) → Promise<empty Float32Array>`.
- `getCompiledFragmentShader() → Promise<null>`, `getTranslatedFragmentShader() → Promise<null>`.
- `checkHalfFloatAlphaSupport() → true`.

*Worker comms (`engine/worker/WorkerProxy.ts:213-233`):* `sendRenderTick`, `resizeWorker`, `sendConfig`, `registerFormula({ function, loopBody, loopInit?, getDist?, preamble?, selfContainedSDE? })` — all no-op.

*Export (`engine/worker/WorkerProxy.ts:237-260`):* `startExport`, `renderExportFrame`, `finishExport` — all reject with `Error('Export not available: no render worker installed')`. `cancelExport()` only flips `_isExporting`.

*Bucket render (`engine/worker/WorkerProxy.ts:264-279`):* `startBucketRender`, `stopBucketRender`, `setPreviewRegion`, `clearPreviewRegion` — no-op.

*Public mutable fields:* `pendingTeleport: CameraState | null = null` (`engine/worker/WorkerProxy.ts:80`); `modulations: Record<string, number> = {}` (`engine/worker/WorkerProxy.ts:83`).

**Module-level singleton registry (`engine/worker/WorkerProxy.ts:294-303`):**
- `setProxy(proxy: WorkerProxy): void` — installs a real implementation over the stub.
- `getProxy(): WorkerProxy` — returns installed proxy, else lazily constructs the stub.

### engine/worker/ViewportRefs.ts

**Module-level mutable state (`engine/worker/ViewportRefs.ts:19-29`, `:120`):** `_camera`, `_canvasElement`, `_displayPerspCamera`, `_displayOrthoCamera`, `_isOrthoActive`, `_mouseOverCanvas` — all module-private singletons.

**Exports:**
- `setViewportCamera(camera: THREE.Camera)` (`engine/worker/ViewportRefs.ts:32`).
- `setViewportCanvas(canvas: HTMLCanvasElement)` (`engine/worker/ViewportRefs.ts:37`).
- `getViewportCamera(): THREE.Camera | null` (`engine/worker/ViewportRefs.ts:42`).
- `getViewportCanvas(): HTMLCanvasElement | null` (`engine/worker/ViewportRefs.ts:47`).
- `snapshotDisplayCamera(cam: THREE.Camera)` — clones live camera into persp- or ortho-display camera based on `optics.camType` (`engine/worker/ViewportRefs.ts:60-103`).
- `getDisplayCamera(): THREE.Camera | null` — returns the snapshotted display camera (ortho or persp), falling back to live `_camera` (`engine/worker/ViewportRefs.ts:113-116`).
- `setMouseOverCanvas(over: boolean)`, `isMouseOverCanvas(): boolean` (`engine/worker/ViewportRefs.ts:121-122`).

## Architecture

- `WorkerProxy` is the **engine-core stub** of what used to be a Web-Worker-backed proxy fronting `FractalEngine` + OffscreenCanvas; the engine extraction stripped the render worker wholesale, leaving only the API surface so downstream code compiles (`engine/worker/WorkerProxy.ts:1-15`).
- The stub **synthesizes immediate boot** in `bootWithConfig`, flipping `isBooted` and invoking `onBooted` synchronously, so generic UI doesn't spin forever on a "compiling" indicator when no real worker is installed (`engine/worker/WorkerProxy.ts:104-112`).
- `WorkerProxy` implements `AccumulationController` (`engine/AccumulationController.ts:19`), letting it stand in wherever the animation/accumulation layer expects that contract (`engine/worker/WorkerProxy.ts:43`).
- The module exposes a **registry pattern** via `setProxy`/`getProxy`: a real Worker-backed proxy is installed over the stub by the host app, so all callers — both generic dev/ code and engine-gmt — share one singleton instance (`engine/worker/WorkerProxy.ts:282-303`).
- Without the registry the two singletons diverged: dev/ code saw a perpetually-unbooted stub while the real worker ran behind a separate import path (`engine/worker/WorkerProxy.ts:286-293`).
- The real Worker-backed implementation lives in `engine-gmt/engine/worker/` and is out of scope for this audit; coupling here is one-way (engine-core defines the contract, app installs the real one).
- Type stubs `EngineRenderState`, `BucketRenderConfig`, `SerializedCamera`, `SerializedOffset` are deliberately opaque so apps re-introducing a real engine can swap richer types without touching the contract (`engine/worker/WorkerProxy.ts:22-41`).
- The proxy keeps a **shadow-state object** (`_shadow`) mirroring fields the worker would normally push back: booted, compiling, accumulation count, convergence, frame count, last measured distance (`engine/worker/WorkerProxy.ts:51-62`). Reads are pure getters; writes happen via worker message handlers in real implementations.
- A **local offset cache** (`_localOffset: SerializedOffset`) holds the double-precision split scene origin and is updated by `queueOffsetSync`/`setShadowOffset` (`engine/worker/WorkerProxy.ts:63`, `:165-171`).
- Export and bucket-render methods are **structurally present but inert**: exports reject with a clear message; bucket render commands silently no-op (`engine/worker/WorkerProxy.ts:235-279`).
- `pickWorldPosition` exposes both sync and async overloads (`engine/worker/WorkerProxy.ts:188-198`) — the sync form returns `null`, the async form resolves `null`.
- `pendingTeleport` is a public mutable field consumed by the tick scene at boot, providing a way to queue an initial camera before the worker is ready (`engine/worker/WorkerProxy.ts:80`).
- `modulations` is a public mutable field that `AnimationSystem` writes per-frame offsets into; the worker reads it on `sendRenderTick` in real implementations (`engine/worker/WorkerProxy.ts:83`).
- `ViewportRefs` is an **R3F-side bridge** for DOM overlays (light gizmos, drawing tools) that sit outside `<Canvas>` and can't use `useThree()` (`engine/worker/ViewportRefs.ts:1-14`).
- It holds **two parallel display cameras** (perspective + orthographic) and snapshots whichever matches the current `optics.camType` from `engineStore`, so overlays project consistently within a single tick cycle (`engine/worker/ViewportRefs.ts:22-30`, `:60-103`).
- The orthographic display camera is **synthesized from `optics.orthoScale`** on every snapshot — left/right/top/bottom recomputed from aspect ratio (`engine/worker/ViewportRefs.ts:67-87`).
- `getDisplayCamera()` falls back to the live `_camera` before the first snapshot has run (`engine/worker/ViewportRefs.ts:113-116`).
- `setMouseOverCanvas`/`isMouseOverCanvas` is used by adaptive resolution to discriminate canvas hovers from UI hovers (`engine/worker/ViewportRefs.ts:118-122`).
- `ViewportRefs` is the only file in `engine/worker/` that **reads `engineStore`** directly — it imports `optics.camType` and `optics.orthoScale` to drive the persp-vs-ortho snapshot decision (`engine/worker/ViewportRefs.ts:17`, `:61-67`).
- `WorkerProxy` imports `ShaderConfig` from `engine/ShaderFactory`, `CameraState` from `types/common`, and `AccumulationController` from `engine/AccumulationController` — no store import in the stub itself (`engine/worker/WorkerProxy.ts:17-20`).

## Invariants and gotchas

- `getProxy()` lazily creates a stub if no `setProxy()` has fired — meaning a forgotten install silently downgrades to no-op rather than crashing (`engine/worker/WorkerProxy.ts:300-303`). Symptoms: perpetual unbooted state, picks return null, exports reject.
- `setProxy()` must run **before** any UI code calls `getProxy()` and caches it, otherwise different consumers can capture different references. The current call site is `engine-gmt/renderer/install.ts:30` during boot.
- `bootWithConfig` on the stub synthesizes an immediate `isBooted = true` (`engine/worker/WorkerProxy.ts:108-112`). Real subclasses replacing this method must take care not to lose that semantic if generic dev/ code waits on `onBooted`.
- `gpuInfo` returns the literal string `'Stub (no worker)'` when empty — a useful tell that the stub is still active rather than a real proxy (`engine/worker/WorkerProxy.ts:155`).
- Export methods **reject** rather than no-op (`engine/worker/WorkerProxy.ts:237-258`); callers must catch or the rejection surfaces as an unhandled promise.
- `cancelExport()` only flips `_isExporting = false` without rejecting in-flight promises — there are none in the stub, but real implementations must not rely on this stub's behavior (`engine/worker/WorkerProxy.ts:260`).
- `shouldSnapCamera` and `cameraInUse` setters are no-op even though they accept values — UI code that toggles them on the stub silently loses the write (`engine/worker/WorkerProxy.ts:148-153`).
- `ViewportRefs` uses **module-level singletons** — no per-canvas isolation; multiple `<Canvas>` instances would clobber each other.
- `snapshotDisplayCamera` reads `engineStore.getState().optics` on every snapshot via `(... as any)` cast (`engine/worker/ViewportRefs.ts:61`) — if `optics` is absent the snapshot silently treats it as perspective (`isOrtho = false`).
- The display-camera snapshot **only handles `PerspectiveCamera` source cameras** correctly — `src.fov` and `src.aspect` are read with non-null casts (`engine/worker/ViewportRefs.ts:95-100`). Orthographic source cameras would skip the FOV update branch.
- Orthographic clip planes are hard-coded `0.001 / 10000` (`engine/worker/ViewportRefs.ts:75`) — not driven by scene scale.
- `_displayPerspCamera` and `_displayOrthoCamera` are lazily allocated and **never freed** — fine for a singleton, but anyone iterating ViewportRefs in tests should know.
- `getDisplayCamera()` returns whichever display camera matches `_isOrthoActive`, falling back to live `_camera` — so orthographic overlays consuming the result before the first snapshot will get a perspective camera and project wrongly (`engine/worker/ViewportRefs.ts:113-116`).
- The ortho-mode test is `camType > 0.5 && camType < 1.5` (`engine/worker/ViewportRefs.ts:62`) — a magic constant encoding "camType == 1.0", brittle if more camera types are added.

## Drift from existing doc

No existing per-subsystem doc for engine-core worker primitives — skip. (Related references exist in `HANDOFF.md:393`, `docs/CHANGELOG_DEV.md:148`, and `docs/gmt/08_File_Structure.md:41`, but no dedicated audit doc.)

## Open questions

- The real Worker-backed `WorkerProxy` lives in `engine-gmt/engine/worker/WorkerProxy.ts` and is **out of scope** here per the prompt. It is installed via `engine-gmt/renderer/install.ts:30` calling `setEngineProxy(...)`. Audit coverage for that surface should belong to g01/g06; this audit confirms the **contract** at the engine-core boundary, not the implementation.
- 30 files outside `engine/worker/` import these modules (mostly from `engine-gmt/`, plus generic `store/engineStore.ts`, `store/slices/historySlice.ts`, `store/slices/viewportSlice.ts`, `components/timeline/exportModulations.ts`, `utils/timelineUtils.ts`, `app-gmt/renderDialogExtras.tsx`) — these are out of scope per audit prompt but worth noting as the consumer set the contract must keep stable.
- `ViewportRefs` is filed under `engine/worker/` despite being a pure R3F-camera bridge with no Worker semantics — the directory naming reflects history (it used to live next to the WorkerProxy that fed the worker camera). Consider whether this belongs in a more honestly-named module under a future refactor (open question, not a finding).
- `EngineRenderState = Record<string, unknown>` is opaque — the real shape lives in `engine-gmt` and the contract here is "anything"; this is intentional per the doc comment but means TypeScript provides no help across the boundary (`engine/worker/WorkerProxy.ts:25`).
- The `unknown | null` types on `virtualSpace` and `pipeline` (`engine/worker/WorkerProxy.ts:46`, `:48`) are similarly opaque; future apps may want a typed interface here.
