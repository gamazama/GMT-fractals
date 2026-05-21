---
source: engine/worker/WorkerProxy.ts
lines: 303
last_verified_sha: 4b09ae1f221ca875c42802401d897b6adc35e602
additional_sources:
  - engine/worker/ViewportRefs.ts
audited: 2026-05-20T09:01:16Z
audited_by: claude-opus-4-7
public_api:
  - WorkerProxy
  - type EngineRenderState
  - type BucketRenderConfig
  - type SerializedCamera
  - type SerializedOffset
  - setProxy
  - getProxy
  - setViewportCamera
  - setViewportCanvas
  - getViewportCamera
  - getViewportCanvas
  - snapshotDisplayCamera
  - getDisplayCamera
  - setMouseOverCanvas
  - isMouseOverCanvas
depends_on: []
---

# Worker Contract (engine-core stub + viewport refs)

`WorkerProxy` is the engine-core no-op stub of what used to be a Web-Worker-backed proxy fronting `FractalEngine` + OffscreenCanvas. The engine extraction stripped the render worker wholesale; this stub preserves the API surface so downstream code (store slices, UI components, hooks) compiles without cascading edits (engine/worker/WorkerProxy.ts:1-15). Apps that want real worker offload install a real implementation over the stub via the `setProxy` / `getProxy` registry pair so generic dev/ code and the host app share one singleton (engine/worker/WorkerProxy.ts:282-303).

`ViewportRefs` is the R3F-side bridge for DOM overlays (light gizmos, drawing tools) that sit outside `<Canvas>` and can't use `useThree()`; it lives in `engine/worker/` for historical reasons (the original camera ref was fed straight into the render worker via the proxy) (engine/worker/ViewportRefs.ts:1-14).

## Public API

### Types (engine/worker/WorkerProxy.ts)

| Symbol | Shape / role | Where |
|---|---|---|
| `EngineRenderState` | `Record<string, unknown>` — opaque per-frame engine state; the real shape lives in engine-gmt | engine/worker/WorkerProxy.ts:25 |
| `BucketRenderConfig` | `{ bucketSize, outputWidth, outputHeight, tileCols, tileRows, convergenceThreshold, accumulation, samplesPerBucket }` | engine/worker/WorkerProxy.ts:26-35 |
| `SerializedCamera` | `{ position: [3], quaternion: [4], fov }` — worker-side camera message shape | engine/worker/WorkerProxy.ts:36-40 |
| `SerializedOffset` | `{ x, y, z, xL, yL, zL }` — double-precision split scene origin (hi/lo pairs) | engine/worker/WorkerProxy.ts:41 |

### Class `WorkerProxy implements AccumulationController`

Declared at engine/worker/WorkerProxy.ts:43 and implementing `AccumulationController` so it can stand in wherever animation/accumulation expects that contract.

Inert refs (`null` in the stub; UI code guards on truthiness):

| Field | Type | Where |
|---|---|---|
| `activeCamera` | `THREE.PerspectiveCamera \| null` | engine/worker/WorkerProxy.ts:45 |
| `virtualSpace` | `unknown \| null` | engine/worker/WorkerProxy.ts:46 |
| `renderer` | `THREE.WebGLRenderer \| null` | engine/worker/WorkerProxy.ts:47 |
| `pipeline` | `unknown \| null` | engine/worker/WorkerProxy.ts:48 |

Public mutable fields:

| Field | Purpose | Where |
|---|---|---|
| `pendingTeleport: CameraState \| null` | Initial-camera queue consumed by the tick scene at boot | engine/worker/WorkerProxy.ts:80 |
| `modulations: Record<string, number>` | Per-frame offsets written by AnimationSystem; the real worker reads it on `sendRenderTick` | engine/worker/WorkerProxy.ts:83 |

Lifecycle:

| Method | Stub behaviour | Where |
|---|---|---|
| `initWorkerMode(canvas, config, w, h, dpr, isMobile, initialCamera?)` | No-op (no worker to boot) | engine/worker/WorkerProxy.ts:87-97 |
| `restart(newConfig, initialCamera?)` | No-op | engine/worker/WorkerProxy.ts:99-102 |
| `bootWithConfig(config, initialCamera?)` | Sets `_bootSent = true`, `_shadow.isBooted = true`, fires `onBooted` synchronously | engine/worker/WorkerProxy.ts:104-112 |
| `terminateWorker()` | No-op | engine/worker/WorkerProxy.ts:114 |

Callback setters: `onCompiling`, `onCompileTime`, `onShaderCode`, `onBooted`, `onCrash`, `registerFrameCounter(cb)` (engine/worker/WorkerProxy.ts:118-123).

Messaging: `post(msg, transfer?)` — no-op in stub (engine/worker/WorkerProxy.ts:127).

Shadow-state accessors (getters mirror what a real worker would push back; some setters are silently dropped — see Invariants):

| Accessor | Kind | Where |
|---|---|---|
| `isBooted`, `isCompiling`, `isExporting`, `isBucketRendering` | get | engine/worker/WorkerProxy.ts:131-134 |
| `sceneOffset`, `lastGeneratedFrag` | get | engine/worker/WorkerProxy.ts:135-136 |
| `accumulationCount`, `convergenceValue`, `frameCount` | get | engine/worker/WorkerProxy.ts:137-139 |
| `lastCompileDuration` | get | engine/worker/WorkerProxy.ts:140 |
| `lastMeasuredDistance` | get / set | engine/worker/WorkerProxy.ts:141-142 |
| `hasCompiledShader` | get | engine/worker/WorkerProxy.ts:143 |
| `dirty`, `isPaused`, `isGizmoInteracting` | get / set | engine/worker/WorkerProxy.ts:144-151 |
| `shouldSnapCamera`, `cameraInUse` | get returns `false`; setter accepts but drops | engine/worker/WorkerProxy.ts:148-153 |
| `bootSent` | get | engine/worker/WorkerProxy.ts:154 |
| `gpuInfo` | get; defaults `'Stub (no worker)'` when empty | engine/worker/WorkerProxy.ts:155 |

Commands (all no-op in the stub except as noted):

| Method | Stub behaviour | Where |
|---|---|---|
| `setUniform(key, value, noReset?)` | No-op | engine/worker/WorkerProxy.ts:159 |
| `setPreviewSampleCap(n)` | No-op | engine/worker/WorkerProxy.ts:160 |
| `resetAccumulation()` | No-op | engine/worker/WorkerProxy.ts:161 |
| `markInteraction()` | No-op | engine/worker/WorkerProxy.ts:162 |
| `updateTexture(type, dataUrl)` | No-op | engine/worker/WorkerProxy.ts:163 |
| `queueOffsetSync(offset)` | Copies `offset` into `_localOffset` | engine/worker/WorkerProxy.ts:165-167 |
| `setShadowOffset(offset)` | Copies `offset` into `_localOffset` | engine/worker/WorkerProxy.ts:169-171 |
| `applyOffsetShift(dx, dy, dz)` | No-op | engine/worker/WorkerProxy.ts:173 |
| `resolveLightPosition(currentPos, wasFixed)` | Returns `currentPos` unchanged | engine/worker/WorkerProxy.ts:175-177 |
| `measureDistanceAtScreenPoint(x, y, renderer, camera)` | Returns cached `_shadow.lastMeasuredDistance` | engine/worker/WorkerProxy.ts:179-184 |

Picks / probes (all inert in the stub):

| Method | Stub behaviour | Where |
|---|---|---|
| `pickWorldPosition(x, y)` (sync overload) | Returns `null` | engine/worker/WorkerProxy.ts:188, 196 |
| `pickWorldPosition(x, y, true, fast?)` (async overload) | Resolves `null` | engine/worker/WorkerProxy.ts:189, 197 |
| `startFocusPick(x, y)` | Resolves `-1` | engine/worker/WorkerProxy.ts:200 |
| `sampleFocusPick(x, y)` | Resolves `-1` | engine/worker/WorkerProxy.ts:201 |
| `endFocusPick()` | No-op | engine/worker/WorkerProxy.ts:202 |
| `captureSnapshot()` | Resolves `null` | engine/worker/WorkerProxy.ts:203 |
| `requestHistogramReadback(source)` | Resolves empty `Float32Array` | engine/worker/WorkerProxy.ts:204-206 |
| `getCompiledFragmentShader()` | Resolves `null` | engine/worker/WorkerProxy.ts:207 |
| `getTranslatedFragmentShader()` | Resolves `null` | engine/worker/WorkerProxy.ts:208 |
| `checkHalfFloatAlphaSupport()` | Returns `true` | engine/worker/WorkerProxy.ts:209 |

Worker communication (no-op in the stub; real implementations send messages to the worker):

| Method | Stub behaviour | Where |
|---|---|---|
| `sendRenderTick(camera, offset, delta, renderState)` | No-op | engine/worker/WorkerProxy.ts:213-218 |
| `resizeWorker(width, height, dpr)` | No-op | engine/worker/WorkerProxy.ts:220 |
| `sendConfig(config)` | No-op | engine/worker/WorkerProxy.ts:221 |
| `registerFormula(id, { function, loopBody, loopInit?, getDist?, preamble?, selfContainedSDE? })` | No-op | engine/worker/WorkerProxy.ts:223-233 |

Export lifecycle (rejects rather than no-ops — callers must catch):

| Method | Stub behaviour | Where |
|---|---|---|
| `startExport(config, stream, dirHandle?)` | Rejects `Error('Export not available: no render worker installed')` | engine/worker/WorkerProxy.ts:237-243 |
| `renderExportFrame(frameIndex, time, camera, offset, renderState, modulations)` | Rejects with same error | engine/worker/WorkerProxy.ts:245-254 |
| `finishExport()` | Rejects with same error | engine/worker/WorkerProxy.ts:256-258 |
| `cancelExport()` | Flips `_isExporting = false` (no rejection of in-flight promises) | engine/worker/WorkerProxy.ts:260 |

Bucket render (inert):

| Method | Stub behaviour | Where |
|---|---|---|
| `startBucketRender(exportImage, config, exportData?)` | No-op | engine/worker/WorkerProxy.ts:264-268 |
| `stopBucketRender()` | No-op | engine/worker/WorkerProxy.ts:270 |
| `setPreviewRegion(region, outputWidth, outputHeight, sampleCap)` | No-op | engine/worker/WorkerProxy.ts:272-277 |
| `clearPreviewRegion()` | No-op | engine/worker/WorkerProxy.ts:279 |

### Singleton registry (engine/worker/WorkerProxy.ts)

| Symbol | Role | Where |
|---|---|---|
| `setProxy(proxy)` | Installs a real implementation over the stub | engine/worker/WorkerProxy.ts:296-298 |
| `getProxy()` | Returns the installed proxy, or lazily constructs a stub if none installed | engine/worker/WorkerProxy.ts:300-303 |

### Viewport refs (engine/worker/ViewportRefs.ts)

| Symbol | Role | Where |
|---|---|---|
| `setViewportCamera(camera)` | Call from inside R3F `<Canvas>` to register the active camera | engine/worker/ViewportRefs.ts:32-34 |
| `setViewportCanvas(canvas)` | Call from inside R3F `<Canvas>` to register the canvas DOM element | engine/worker/ViewportRefs.ts:37-39 |
| `getViewportCamera()` | Returns the live R3F camera or `null` | engine/worker/ViewportRefs.ts:42-44 |
| `getViewportCanvas()` | Returns the canvas DOM element or `null` | engine/worker/ViewportRefs.ts:47-49 |
| `snapshotDisplayCamera(cam)` | SNAPSHOT-phase hook: clones the live camera into a persp or ortho display camera based on `optics.camType` | engine/worker/ViewportRefs.ts:60-103 |
| `getDisplayCamera()` | Returns the snapshotted display camera (ortho or persp); falls back to live `_camera` before first snapshot | engine/worker/ViewportRefs.ts:113-116 |
| `setMouseOverCanvas(over)` / `isMouseOverCanvas()` | Ref-based hover signal for adaptive resolution (deliberately not store-backed) | engine/worker/ViewportRefs.ts:120-122 |

## Architecture

- **Stub-first contract.** The engine-core module ships a fully-typed no-op implementation. Generic dev/ code (engineStore, components, hooks) imports the symbols and compiles regardless of whether a real worker is installed. The header comment at engine/worker/WorkerProxy.ts:1-15 records this rationale.
- **Synthesised immediate boot.** `bootWithConfig` on the stub flips `_shadow.isBooted = true` and invokes `onBooted` synchronously, so generic UI doesn't spin forever on a "compiling" indicator when no real worker is installed (engine/worker/WorkerProxy.ts:104-112).
- **`AccumulationController` contract.** `WorkerProxy implements AccumulationController` lets it stand in wherever the animation/accumulation layer expects that contract (engine/worker/WorkerProxy.ts:43, imported at engine/worker/WorkerProxy.ts:20).
- **Registry-pattern singleton.** `setProxy` / `getProxy` deliberately share one singleton across imports — a real Worker-backed proxy is installed over the stub by the host app, so all callers (generic dev/ code AND engine-gmt) see the same instance. Without this, generic code saw a perpetually-unbooted stub while engine-gmt operated the real worker behind a separate import path (engine/worker/WorkerProxy.ts:282-303).
- **Opaque types are deliberate.** `EngineRenderState`, `BucketRenderConfig`, `SerializedCamera`, and `SerializedOffset` are intentionally minimal so apps re-introducing a real engine can swap richer types without touching the contract (engine/worker/WorkerProxy.ts:22-41).
- **Shadow-state cache.** The proxy keeps a `_shadow` object mirroring fields the worker would normally push back: booted, compiling, has-compiled-shader, paused, dirty, last-compile-duration, last-measured-distance, accumulation count, convergence value, frame count. Reads are pure getters; writes happen via worker message handlers in real implementations (engine/worker/WorkerProxy.ts:51-62).
- **Local offset cache.** `_localOffset` holds the double-precision split scene origin in hi/lo pairs (`x/xL`, etc.) and is updated by `queueOffsetSync` and `setShadowOffset` (engine/worker/WorkerProxy.ts:63, 165-171).
- **Pick overloads.** `pickWorldPosition` exposes both sync and async overloads — the sync form returns `null`, the async form resolves `null`. Real implementations replace both (engine/worker/WorkerProxy.ts:188-198).
- **Two parallel display cameras.** `ViewportRefs` snapshots either a perspective or an orthographic clone based on the current `optics.camType` from `engineStore`, so overlays project consistently within a single tick cycle (engine/worker/ViewportRefs.ts:22-30, 60-103).
- **Orthographic clone synthesised from `orthoScale`.** Left/right/top/bottom are recomputed from aspect ratio every snapshot; clip planes are hard-coded `0.001 / 10000` (engine/worker/ViewportRefs.ts:65-87).
- **Ref-based mouse-over signal.** `_mouseOverCanvas` is a module-scope `let`, not a store value — intentionally so pointer hover never triggers React reconciliation in the adaptive-resolution hot path. The setter/getter are plain function calls, not store dispatch / hook subscriptions (engine/worker/ViewportRefs.ts:118-122; followup q-043 confirms this is doc-worthy invariant, not drift).
- **Only `ViewportRefs.ts` reads `engineStore`** within `engine/worker/`. The WorkerProxy stub itself imports `ShaderConfig`, `CameraState`, and `AccumulationController` only — no store dependency (engine/worker/WorkerProxy.ts:17-20).

## Invariants

- **`getProxy()` lazily creates a stub if no `setProxy()` has fired** — a forgotten install silently downgrades to no-op rather than crashing (engine/worker/WorkerProxy.ts:300-303). Symptoms: perpetual unbooted state, picks return null, exports reject. `gpuInfo` returning the literal `'Stub (no worker)'` is the useful tell that the stub is still active (engine/worker/WorkerProxy.ts:155).
- **`setProxy()` must run before any caller has captured a reference from `getProxy()`** — otherwise different consumers can capture different references (the stub vs the real proxy). The host installs early enough that this holds in practice; the install site is out of scope here (see Interactions).
- **Stub `bootWithConfig` synthesises immediate `isBooted = true`** (engine/worker/WorkerProxy.ts:108-112). Real subclasses replacing this method must take care not to lose that semantic if generic dev/ code waits on `onBooted`.
- **Export methods reject rather than no-op** (engine/worker/WorkerProxy.ts:237-258). Callers must `.catch` or attach `try/await`, otherwise the rejection surfaces as an unhandled promise.
- **`cancelExport()` only flips `_isExporting = false`** without rejecting in-flight promises — there are none in the stub, but real implementations must not rely on this stub's behaviour (engine/worker/WorkerProxy.ts:260).
- **`shouldSnapCamera` and `cameraInUse` setters are silently dropped** even though they accept values (the getters are hard `false`). UI code that toggles them on the stub loses the write (engine/worker/WorkerProxy.ts:148-153).
- **`pendingTeleport` and `modulations` are public mutable fields** — direct writes are the supported API, not action dispatch (engine/worker/WorkerProxy.ts:80, 83).
- **`ViewportRefs` is module-level singleton state.** Multiple `<Canvas>` instances would clobber each other; there is no per-canvas isolation (engine/worker/ViewportRefs.ts:19-29, 120).
- **`snapshotDisplayCamera` reads `engineStore` via an `(as any)` cast** at engine/worker/ViewportRefs.ts:61. If `optics` is absent, the snapshot silently treats the camera as perspective (`isOrtho = false`).
- **The persp-source assumption.** The snapshot reads `src.fov` and `src.aspect` with non-null casts (engine/worker/ViewportRefs.ts:95-100). An orthographic source camera would skip the FOV update branch — fine because GMT only ever drives the live R3F camera as `PerspectiveCamera`.
- **Magic-constant ortho test.** The ortho-mode test is `camType > 0.5 && camType < 1.5` (engine/worker/ViewportRefs.ts:62) — encoding `camType == 1.0`. Brittle if more camera types are added.
- **Lazy display-camera allocation, never freed.** `_displayPerspCamera` and `_displayOrthoCamera` are allocated on first use and survive for the module's lifetime (engine/worker/ViewportRefs.ts:73, 90). Fine for a singleton, but anyone iterating `ViewportRefs` in tests should know.
- **`getDisplayCamera()` falls back to live `_camera` before first snapshot** (engine/worker/ViewportRefs.ts:113-116). Overlays consuming the result before SNAPSHOT has run will get a perspective camera — wrong projection if ortho is active.

## Interactions with other subsystems

Outgoing imports:

- `three` (`THREE` namespace) — for camera types in both files (engine/worker/WorkerProxy.ts:17, engine/worker/ViewportRefs.ts:16).
- `engine/ShaderFactory` (`ShaderConfig` type) (engine/worker/WorkerProxy.ts:18).
- `types/common` (`CameraState` type) (engine/worker/WorkerProxy.ts:19).
- `engine/AccumulationController` (the contract this proxy implements) (engine/worker/WorkerProxy.ts:20).
- `store/engineStore` — ONLY consumed by `ViewportRefs.snapshotDisplayCamera` to read `optics.camType` / `optics.orthoScale` (engine/worker/ViewportRefs.ts:17, 61-67). `WorkerProxy.ts` does NOT import the store.

`depends_on: []` because none of the above are themselves Phase 1 subsystem ids; this module is a leaf substrate at the engine-core boundary.

Incoming (representative; the contract MUST stay stable for these consumers):

- **g01-renderer** owns the real Worker-backed `WorkerProxy` implementation at `engine-gmt/engine/worker/WorkerProxy.ts` and installs it over the stub at boot via `setProxy(...)`. The installer itself lives at `engine-gmt/renderer/install.ts` and is out of scope here — followup q-078 confirms g01 covers the real implementation file but flags that the installer (in `engine-gmt/renderer/`) is likely a g06 gap, not e11 scope.
- **e06-adaptive-resolution** consumes `setMouseOverCanvas` / `isMouseOverCanvas` from a pointer-hover handler (`<ViewportFrame>`) and an adaptive-resolution badge poll respectively (engine/worker/ViewportRefs.ts:120-122). The ref-based design is the load-bearing contract — see Invariants and followup q-043.
- **e03-animation** writes per-frame offsets into the public `modulations: Record<string, number>` field; the real worker reads it on `sendRenderTick` (engine/worker/WorkerProxy.ts:83).
- The survey enumerated ~30 files outside `engine/worker/` that import these modules — primarily under `engine-gmt/`, plus `store/engineStore.ts`, `store/slices/historySlice.ts`, `store/slices/viewportSlice.ts`, `components/timeline/exportModulations.ts`, `utils/timelineUtils.ts`, `app-gmt/renderDialogExtras.tsx`. They are the consumer set whose contract this module must keep stable.

## Known issues / Phase 2 carry-in

- **subsystem-gap / pending follow-ups.** q-079, q-080, q-081, q-082 are pending in Sub-phase B; this doc may need a regen pass once they land. They are filed against this subsystem but their bodies were not available at write time, so the contract surface here was drafted from the survey + answered followups (q-043, q-078) alone.
- **subsystem-gap (q-078).** The `setEngineProxy` install pattern at `engine-gmt/renderer/install.ts` (lines 30 and 61 per the followup) is out of scope for e11 and out of scope for g01 (which only covers files under `engine-gmt/engine/...`). It is likely a g06 gap. The `as any` cast at line 61 (`setEngineProxy(proxy as any)`) is a structural-typing escape hatch — the engine-core `setProxy` parameter type and the engine-gmt `WorkerProxy` shape are not declared compatible. A shared `EngineProxy` interface in engine-core that both the stub and the real proxy implement would close this gap. Originating: followup q-078.
- **drift / doc-worthy invariant (q-043).** `mouseOverCanvas` is ref-based, not store-based, intentionally so pointer hover never triggers React reconciliation in the adaptive-resolution hot path (engine/worker/ViewportRefs.ts:120-122). Already captured in this module doc's Invariants and Architecture sections; the `phase-2-carry-in.json` entry routes the same finding into the adaptive-resolution module doc. Originating: followup q-043.
- **drift / cross-fork** — engine-gmt fork divergence. The real Worker-backed `WorkerProxy` lives in `engine-gmt/engine/worker/WorkerProxy.ts` and is structurally distinct from this stub (different lifetime, different message-handling layer). Per the cross-cutting "engine vs engine-gmt fork divergence" theme in `phase-2-carry-in.json`, the rule is "engine/ stays generic; engine-gmt/ keeps GMT-specific behaviour" — do NOT back-port worker-specific code into the stub.
- **open question (survey).** `ViewportRefs` is filed under `engine/worker/` despite being a pure R3F-camera bridge with no Worker semantics. The directory naming reflects history (it used to live next to the WorkerProxy that fed the worker camera). A future refactor could relocate it under a more honestly-named module — not actionable in Phase 2 (engine/worker/ViewportRefs.ts:1-14).
- **open question (survey).** `EngineRenderState = Record<string, unknown>` and the `unknown | null` typing on `virtualSpace` / `pipeline` are deliberately opaque (engine/worker/WorkerProxy.ts:25, 46, 48). Future apps may want a typed interface here.

## Historical context

No prior dedicated audit doc existed for engine-core worker primitives. The rationale lives entirely in the source headers:

- `engine/worker/WorkerProxy.ts:1-15` explains the stub-after-extraction shape: "In GMT this class fronted a Web Worker that owned FractalEngine + OffscreenCanvas. The engine extraction stripped the render worker wholesale; this stub preserves the API surface so downstream consumers (store slices, UI components) compile without cascading edits."
- `engine/worker/WorkerProxy.ts:282-293` documents the registry-pattern rationale verbatim: "Apps that have a real Worker-backed engine (engine-gmt) install over the stub at boot via `setProxy()`, so all `getProxy()` calls — both from generic dev/ code and from engine-gmt code — return the SAME instance. Without this, the two singletons diverged: dev/ saw a perpetually-unbooted stub while engine-gmt operated the real worker."
- `engine/worker/ViewportRefs.ts:1-14` records the R3F-overlay bridge rationale: "Provides access to the R3F camera and canvas element for DOM overlays (light gizmos, drawing tools, etc.) that sit outside the `<Canvas>` and can't use `useThree()`. Set from inside the Canvas (WorkerTickScene). Read from DOM overlays (LightGizmo, SingleLightGizmo, DrawingOverlay, etc.)."

The historical references the survey flagged (`HANDOFF.md:393`, `docs/CHANGELOG_DEV.md:148`, `docs/gmt/08_File_Structure.md:41`) are scattered mentions, not a coherent earlier doc. This module doc is the first dedicated audit.
