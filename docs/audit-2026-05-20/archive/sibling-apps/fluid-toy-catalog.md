---
source: fluid-toy/main.tsx
lines: 288
last_verified_sha: 19b2425a1311b8be66692962180929d4d08b4987
additional_sources:
  - fluid-toy/README.md
  - fluid-toy/CODE_MAP.md
  - fluid-toy/FluidToyApp.tsx
  - fluid-toy/storeTypes.ts
  - fluid-toy/registerFeatures.ts
  - fluid-toy/setup.ts
  - fluid-toy/migrations.ts
  - fluid-toy/panels.ts
  - fluid-toy/hotkeys.ts
  - fluid-toy/constants.ts
  - fluid-toy/engineHandles.ts
  - fluid-toy/useFluidEngine.ts
  - fluid-toy/useEngineSync.ts
  - fluid-toy/useDeepZoomOrbit.ts
  - fluid-toy/FluidPointerLayer.tsx
  - fluid-toy/viewLibrary.ts
  - fluid-toy/brush/index.ts
  - fluid-toy/brush/emitter.ts
  - fluid-toy/brush/color.ts
  - fluid-toy/brush/particles.ts
  - fluid-toy/brush/readParams.ts
  - fluid-toy/features/julia.ts
  - fluid-toy/features/deepZoom.ts
  - fluid-toy/features/coupling.ts
  - fluid-toy/features/palette.ts
  - fluid-toy/features/collision.ts
  - fluid-toy/features/fluidSim.ts
  - fluid-toy/features/postFx.ts
  - fluid-toy/features/composite.ts
  - fluid-toy/features/brush.ts
  - fluid-toy/features/presets.ts
  - fluid-toy/presets/data.ts
  - fluid-toy/presets/apply.ts
  - fluid-toy/bucket/FluidBucketController.ts
  - fluid-toy/components/RenderDialog/exportRunner.ts
  - fluid-toy/pointer/handlers.ts
  - fluid-toy/pointer/types.ts
  - fluid-toy/pointer/modifiers.ts
  - fluid-toy/pointer/contextMenu.ts
  - fluid-toy/pointer/gestures/types.ts
  - fluid-toy/pointer/gestures/pan.ts
  - fluid-toy/pointer/gestures/zoom.ts
  - fluid-toy/pointer/gestures/wheel.ts
  - fluid-toy/pointer/gestures/splat.ts
  - fluid-toy/pointer/gestures/pickC.ts
  - fluid-toy/pointer/gestures/resizeBrush.ts
  - fluid-toy/pointer/gestures/zoomBounds.ts
  - fluid-toy/fluid/FluidEngine.ts
  - fluid-toy/fluid/DeepZoomController.ts
  - fluid-toy/fluid/BloomChain.ts
  - fluid-toy/fluid/GpuTimerManager.ts
  - fluid-toy/fluid/GradientLutManager.ts
  - fluid-toy/fluid/shaders/index.ts
  - fluid-toy/fluid/shaders/common.ts
  - fluid-toy/fluid/shaders/julia.ts
  - fluid-toy/fluid/shaders/sim.ts
  - fluid-toy/fluid/shaders/display.ts
  - fluid-toy/fluid/shaders/utility.ts
  - fluid-toy/deepZoom/HDRFloat.ts
  - fluid-toy/deepZoom/HighPrecComplex.ts
  - fluid-toy/deepZoom/dd.ts
  - fluid-toy/deepZoom/referenceOrbit.ts
  - fluid-toy/deepZoom/laBuilder.ts
  - fluid-toy/deepZoom/LAInfoDeep.ts
  - fluid-toy/deepZoom/laParameters.ts
  - fluid-toy/deepZoom/atBuilder.ts
  - fluid-toy/deepZoom/deepZoomWorker.ts
  - fluid-toy/deepZoom/laRuntime.ts
  - fluid-toy/deepZoom/diagnostics.ts
  - fluid-toy/deepZoom/benchmark.ts
  - fluid-toy/components/DomOverlays.tsx
  - fluid-toy/components/HotkeysCheatsheet.tsx
  - fluid-toy/components/JuliaCPicker.tsx
  - fluid-toy/components/MandelbrotPicker.tsx
  - fluid-toy/components/PresetGrid.tsx
  - fluid-toy/components/QualityBadge.tsx
  - fluid-toy/components/ViewLibraryPanel.tsx
  - fluid-toy/components/DeepZoomStatus.tsx
  - fluid-toy/components/DeepZoomBench.tsx
audited: 2026-05-20T09:30:50Z
audited_by: claude-opus-4-7
public_api:
  - FluidToyApp
  - setupFluidToy
  - FluidToyPanels
  - registerFluidToyHotkeys
  - installFluidToyViewLibrary
  - appEngine
  - brushHandles
  - cursorHandles
  - FluidBucketController
  - runVideoExport
  - FluidEngine
  - JuliaFeature
  - DeepZoomFeature
  - CouplingFeature
  - PaletteFeature
  - CollisionFeature
  - FluidSimFeature
  - PostFxFeature
  - CompositeFeature
  - BrushFeature
  - PresetsFeature
  - syncJuliaToEngine
  - syncJuliaCToEngine
  - syncDeepZoomToEngine
  - syncPaletteToEngine
  - syncCollisionToEngine
  - syncFluidSimToEngine
  - syncPostFxToEngine
  - syncCompositeToEngine
  - applyRefPreset
  - createBrushRuntime
  - stepBrush
  - emitStrokeSplat
  - emitPressSplat
  - beginStroke
  - readBrushParams
  - getDeepZoomRuntime
depends_on:
  - a01-boot-shell
  - e01-feature-system
  - e02-tick-registry
  - e03-animation
  - e06-adaptive-resolution
  - e07-plugins-host
  - e08-shortcuts-undo
  - e09-camera-plugin
  - e13-shared-ui
---

# Fluid Toy — Julia/Mandelbrot-driven fluid sim, engine-native sibling app

`fluid-toy/` is the engine-as-library showcase. A real-time 2D fluid simulation whose force field is computed from the Julia / Mandelbrot iteration kernel, ported off the standalone prototype at `stable/toy-fluid/` onto the shared engine surface (`fluid-toy/main.tsx:1-15`). Every generic concern — DDFS, viewport, save/load, animation, undo, shortcuts, topbar, camera/views, render-dialog — is reused from `engine/`; what stays app-local is the bespoke WebGL2 fluid pipeline (`fluid-toy/fluid/FluidEngine.ts`), the artist brush + particle emitter (`fluid-toy/brush/`), pointer gestures (`fluid-toy/pointer/`), the deep-zoom perturbation worker (`fluid-toy/deepZoom/`), and the 9-slice DDFS feature surface that drives them.

The canonical onboarding entry point remains `fluid-toy/README.md` and the file index `fluid-toy/CODE_MAP.md` — this module doc supplements them with API + architecture depth.

## Public API

### App entry + plugin install

| Symbol | Location | Purpose |
|---|---|---|
| `FluidToyApp` | `fluid-toy/FluidToyApp.tsx:45` | React root component. Thin shell that wires `useFluidEngine` + `useEngineSync` + `useDeepZoomOrbit`, mounts `<ViewportFrame>` + `<canvas>` + `<FluidPointerLayer>` + `<DomOverlays>` + conditional `<DeepZoomStatus>` / `<DeepZoomBench>`, and threads pixel-size → engine.setRenderSize per the resolution effect at `fluid-toy/FluidToyApp.tsx:130-142`. |
| `setupFluidToy` | `fluid-toy/setup.ts:18` | Applies `FluidToyPanels` via `applyPanelManifest` and un-collapses the left dock (overrides the engine's default `isLeftDockCollapsed: true`). Called once from `fluid-toy/main.tsx:278`. |
| `FluidToyPanels` | `fluid-toy/panels.ts:23` | Static dock manifest — see [File catalog → Panels](#panels). |
| `registerFluidToyHotkeys` | `fluid-toy/hotkeys.ts:25` | Registers Space / R / O / Home shortcuts against `@engine/shortcuts`. Called from `fluid-toy/useFluidEngine.ts:113` after the engine boots so `R` can close over the engine ref for `resetFluid()`. |
| `installFluidToyViewLibrary` | `fluid-toy/viewLibrary.ts:221` | Single-call install of the saved-views state-library binding (`installStateLibrary<JuliaViewState>`). Wires slice CRUD, slot shortcuts (`Ctrl+1..9` save, `1..9` recall), seeded defaults, and the topbar Camera menu (`fluid-toy/viewLibrary.ts:222-266`). Consumed only from `fluid-toy/main.tsx:264`. |

### Cross-tree handles (typed singletons)

| Symbol | Location | Carries |
|---|---|---|
| `appEngine` | `fluid-toy/engineHandles.ts:27` | `FluidEngine \| null`. The cross-tree IO point — anyone outside this folder needing the live engine reads `appEngine.ref.current`. |
| `brushHandles` | `fluid-toy/engineHandles.ts:37` | `{ runtime: BrushRuntime; gradientLut: Uint8Array \| null }`. Shared by the RAF brush tick (`fluid-toy/useFluidEngine.ts:65`) and per-pointer-event splatting (`fluid-toy/pointer/gestures/splat.ts`). |
| `cursorHandles` | `fluid-toy/engineHandles.ts:52` | `{ dragging; uv; velUv }`. Written by the pointer layer, read by the RAF brush tick. |

All three use the `defineAppHandles<T>()` factory from the engine, with a uniform `ref.current` / `useSnapshot()` / `subscribe`/`notify` API (`fluid-toy/engineHandles.ts:1-18`).

### DDFS features and their sync functions

Each entry exports a `FeatureDefinition` plus a `sync<X>ToEngine(engine, slice, …)` function that pushes the slice into `FluidEngine.setParams`. See [File catalog → Features](#features) for the per-slice param surfaces.

| Feature | Slice id | Sync function | Defined in |
|---|---|---|---|
| `JuliaFeature` | `julia` | `syncJuliaToEngine` (`fluid-toy/features/julia.ts:135`), `syncJuliaCToEngine` (`fluid-toy/features/julia.ts:166`) | `fluid-toy/features/julia.ts:37` |
| `DeepZoomFeature` | `deepZoom` | `syncDeepZoomToEngine` (`fluid-toy/features/deepZoom.ts:113`) | `fluid-toy/features/deepZoom.ts:27` |
| `CouplingFeature` | `coupling` | (folded into `syncFluidSimToEngine`) | `fluid-toy/features/coupling.ts:77` |
| `PaletteFeature` | `palette` | `syncPaletteToEngine` (`fluid-toy/features/palette.ts:243`) | `fluid-toy/features/palette.ts:133` |
| `CollisionFeature` | `collision` | `syncCollisionToEngine` (`fluid-toy/features/collision.ts:89`) | `fluid-toy/features/collision.ts:36` |
| `FluidSimFeature` | `fluidSim` | `syncFluidSimToEngine` (`fluid-toy/features/fluidSim.ts:118`) | `fluid-toy/features/fluidSim.ts:22` |
| `PostFxFeature` | `postFx` | `syncPostFxToEngine` (`fluid-toy/features/postFx.ts:109`) | `fluid-toy/features/postFx.ts:35` |
| `CompositeFeature` | `composite` | `syncCompositeToEngine` (`fluid-toy/features/composite.ts:77`) | `fluid-toy/features/composite.ts:40` |
| `BrushFeature` | `brush` | (no sync — `FluidEngine.brush()` is invoked imperatively from the brush emitter) | `fluid-toy/features/brush.ts:42` |
| `PresetsFeature` | `presets` | (no params; UI-only via `PresetGrid`) | `fluid-toy/features/presets.ts:18` |

### Plug-in controllers + runners

| Symbol | Location | Role |
|---|---|---|
| `FluidBucketController` | `fluid-toy/bucket/FluidBucketController.ts:95` | Implements engine `BucketRenderController`; passed to `installBucketRender` at `fluid-toy/main.tsx:117-122`. Two nested loops — image-tile → GPU sub-bucket (`fluid-toy/bucket/FluidBucketController.ts:198-323`). |
| `runVideoExport` | `fluid-toy/components/RenderDialog/exportRunner.ts:46` | `RenderDialogRunner` impl passed to `installRenderDialog` at `fluid-toy/main.tsx:276`. Deterministic per-frame TSAA-convergence + sim-step + encode ratchet. |
| `applyRefPreset` | `fluid-toy/presets/apply.ts:68` | Reference-preset → DDFS slice setters dispatcher. Reaches the store via `(globalThis as any).__store` at call time to dodge the boot-order trap (`fluid-toy/presets/apply.ts:17-23`). |

### Brush runtime API (re-exported from `fluid-toy/brush/index.ts`)

| Symbol | Location | Purpose |
|---|---|---|
| `createBrushRuntime` | `fluid-toy/brush/emitter.ts:39` | Allocates the stroke-state container (particles, hue phase, spacing accumulator, spawn accumulator). |
| `stepBrush` | `fluid-toy/brush/emitter.ts:83` | Per-frame tick — advances rainbow phase, spawns + steps particles, paints each via `engine.brush()`. |
| `emitStrokeSplat` | `fluid-toy/brush/emitter.ts:178` | Per-pointer-move splat with arc-length spacing gate. Bails when `particleEmitter` is on (particles paint instead). |
| `emitPressSplat` | `fluid-toy/brush/emitter.ts:194` | Unconditional click-time splat. |
| `beginStroke` | `fluid-toy/brush/emitter.ts:227` | Resets stroke-local state on pointer-down. |
| `readBrushParams` | `fluid-toy/brush/readParams.ts:26` | NOT re-exported from `fluid-toy/brush/index.ts` — imported directly from `../brush/readParams`. See [Invariants → Boot-order trap](#invariants). |

### Deep-zoom runtime accessor

| Symbol | Location | Purpose |
|---|---|---|
| `getDeepZoomRuntime` | `fluid-toy/deepZoom/laRuntime.ts` | Main-thread singleton wrapper around the deep-zoom worker. Used by `fluid-toy/useDeepZoomOrbit.ts:39`. |

### Type-augmentations (declare-merge)

| Augmented module | What's added | Site |
|---|---|---|
| `engine/typedSlices` | `AppFeatureSlices` gets 9 fluid-toy slice keys | `fluid-toy/storeTypes.ts:42-54` |
| `engine/features/types` | `FeatureStateMap` gets the same 9 keys (auto-generates `setJulia`, `setBrush`, …) | `fluid-toy/storeTypes.ts:60-72` |
| `types/store` | `EngineStoreState` gets `savedViews`, `activeViewId`, `savedViews_savedToast`, etc.; `EngineActions` gets `addView`, `selectView`, `saveViewToSlot`, … | `fluid-toy/viewLibrary.ts:39-57` |

## Architecture

### Engine-as-library: what's reused vs. what's bespoke

`fluid-toy/main.tsx:32-59` installs the full engine plugin lineup verbatim — `installViewport`, `installTopBar`, `installPwaUpdate`, `installPauseControls`, `installBucketRender`, `installSceneIO`, `installModulation`, `installModulationUI`, `installShortcuts`, `installUndo`, `installCamera`, `installMenu`, `installHelp`, `installHud`, `installFluidToyViewLibrary`, `installRenderDialog`. Each one is a load-bearing standard engine plugin and the app supplies only adapter glue (the bucket controller, the render-dialog runner, the saved-views capture/apply). The only app-local additions to the topbar HUD are `HotkeysCheatsheet` (`fluid-toy/main.tsx:243-251`) and `QualityBadge` (`fluid-toy/main.tsx:253-258`).

What stays bespoke:

| Concern | Generic engine path | fluid-toy's bespoke path | Why |
|---|---|---|---|
| Render orchestrator | `engine/FractalEngine` (raymarcher) | `fluid-toy/fluid/FluidEngine.ts` (~1901 lines, WebGL2 fluid pipeline) | Stam-style fluid sim + Julia MRT + TSAA + bloom + bucket render is an entirely different pipeline. Cannot be a plugin to the raymarcher engine. |
| Pointer gestures | engine has no canvas gestures (each app owns its own) | `fluid-toy/pointer/` (8 gesture files) | Each app has different gesture semantics; engine prescribes only `handleInteractionStart/End`. |
| Brush | n/a | `fluid-toy/brush/` (color resolver + particle CPU sim + emitter) | Painting-into-a-fluid is unique to this app. |
| Deep zoom | n/a | `fluid-toy/deepZoom/` (BigInt fixed-point + LA + AT + worker) | Perturbation kernel is fluid-toy's own (FractalShark-derived). |
| Bucket render | `engine/plugins/topbar/installBucketRender` (panel) | `fluid-toy/bucket/FluidBucketController.ts` (controller impl) | Engine prescribes the controller contract; app supplies the impl. |
| Video export | `engine/plugins/RenderDialog` (UI + flags) | `fluid-toy/components/RenderDialog/exportRunner.ts` (runner impl) | Same split — engine owns the dialog, app owns the per-frame ratchet. |

### Boot order (strict)

The boot order at `fluid-toy/main.tsx:21-278` is load-bearing — the engine's feature/component registries freeze on the first store touch, so anything that runs after the first `useEngineStore.getState()` call cannot register a new feature. The ordering:

1. Side-effect imports of feature registrations (`fluid-toy/main.tsx:21-26`): `./registerFeatures`, `./migrations`, `../engine/plugins/camera/presetField`.
2. `registerUI()` and the override of `setSampleCap(64)` (`fluid-toy/main.tsx:70-78`) — first store touch is here; registries freeze.
3. Plugin installs (`fluid-toy/main.tsx:91-237`) — viewport, topbar, pause, bucket, scene-io, animation tracks, modulation, shortcuts, undo, camera, menu, help, hud.
4. `installFluidToyViewLibrary()` at `fluid-toy/main.tsx:264` — must run AFTER `installMenu` / `installShortcuts` (their registries exist) and BEFORE `setupFluidToy` (so the Views panel finds the slice). Confirmed by README's "Where to look when something breaks" table at `fluid-toy/README.md:259`.
5. `componentRegistry.register('panel-views', ViewLibraryPanel)` at `fluid-toy/main.tsx:271` — registered AFTER the store boots because `ViewLibraryPanel` pulls `useEngineStore` into the import graph; `panel-views` is referenced from the panel manifest by `component:`, not by `customUI`, so this is safe (`fluid-toy/registerFeatures.ts:36-42` documents the rule).
6. `installRenderDialog` and `setupFluidToy()` (`fluid-toy/main.tsx:276-278`).
7. `ReactDOM.createRoot().render(<FluidToyApp/>)` (`fluid-toy/main.tsx:284-288`).

### App shell delegation

`fluid-toy/FluidToyApp.tsx` is ~215 lines and intentionally thin — every selector is granular (no no-arg `useEngineStore()`, see the header comment at `fluid-toy/FluidToyApp.tsx:46-51`). All imperative engine plumbing lives in three hooks:

| Hook | Owns | Site |
|---|---|---|
| `useFluidEngine` | `FluidEngine` boot + RAF loop + per-frame `stepBrush` + deterministic-playback clock + 10 Hz `reportAccumulation` throttle + hotkey registration | `fluid-toy/useFluidEngine.ts:24-125` |
| `useEngineSync` | The 9 slice→engine `useEffect`s; folds `liveModulations` via `applyLiveMod`; splits julia sync into a full + a c-only variant | `fluid-toy/useEngineSync.ts:25-69` |
| `useDeepZoomOrbit` | Worker-built reference orbit / LA / AT rebuild loop + GPU-time poll for diagnostics | `fluid-toy/useDeepZoomOrbit.ts:22-153` |

The render-size flow at `fluid-toy/FluidToyApp.tsx:130-142` is a single effect: `base (CSS px) × renderScale × quality → engine.setRenderSize`. Both the canvas drawing buffer and the fluid sim grid share that one resolution.

### Modulation merge

`fluid-toy/useEngineSync.ts:46-51` folds `liveModulations` into each slice via `applyLiveMod(slice, featureId, liveMod)` — `applyLiveMod` returns the original slice reference when no mod touches it, so the per-slice `useEffect` only re-fires when either the slice actually changes or an active LFO drives one of its keys. The critical split at `fluid-toy/useEngineSync.ts:58-62`: the `julia` slice has TWO sync effects — a slice-driven one that pushes the whole slice (incl. center / zoom) WITHOUT depending on `liveMod`, and a `liveMod`-driven one that pushes only juliaC. Without this split, per-frame modulation ticks would clobber gesture-set `engine.params.center`/`zoom` mid-pan/zoom.

### Pointer pipeline

`fluid-toy/FluidPointerLayer.tsx:37-46` is a 0-DOM React shell that mounts three hooks: `useModifierKeys` (`fluid-toy/pointer/modifiers.ts:30`), `useCanvasContextMenu` (`fluid-toy/pointer/contextMenu.ts:15`), `useCanvasPointerHandlers` (`fluid-toy/pointer/handlers.ts:32`). The dispatcher at `fluid-toy/pointer/handlers.ts:55-71` switches on `e.button` + `mods.b/c` to one of the six gesture entries:

| `e.button` | Modifier | Gesture | Entry |
|---|---|---|---|
| 2 (right) | — | pan (DD-precision) | `fluid-toy/pointer/gestures/pan.ts` |
| 1 (middle) | — | exponential zoom around click-point | `fluid-toy/pointer/gestures/zoom.ts` |
| 0 (left) | `mods.c` | drag Julia c | `fluid-toy/pointer/gestures/pickC.ts` |
| 0 (left) | `mods.b` | log-scaled brush resize | `fluid-toy/pointer/gestures/resizeBrush.ts` |
| 0 (left) | — | splat (brush emit) | `fluid-toy/pointer/gestures/splat.ts` |
| wheel | — | cursor-anchored zoom (commit timer) | `fluid-toy/pointer/gestures/wheel.ts` |

Right-click without drag → context menu (suppressed if `rightDragged` was set during a pan).

### Store-bypass during pan/zoom/wheel

Pan, middle-drag, and wheel write `engine.setParams({ center, zoom })` directly during the gesture and stash the pending value in `pendingViewRef`; the store gets one `setJulia` commit on pointerup (drag, at `fluid-toy/pointer/handlers.ts:87-103`'s `onUp`) or after a 100 ms idle (wheel, in `fluid-toy/pointer/gestures/wheel.ts:23-25`). Documented in README `fluid-toy/README.md:189-200`. Reason: per-pointermove `setJulia` triggers Zustand's full subscriber notification; with dozens of `useEngineStore` consumers across the panel tree, the cascading re-renders trip React 18's max-depth guard.

### Deep-zoom rebuild loop

`fluid-toy/useDeepZoomOrbit.ts:32-139` watches julia view / iter / kind / power / juliaC AND deepZoom flags. When `deepZoom.enabled`, it kicks off a worker build via `runtime.computeReferenceOrbit(...)` and pushes the result onto `engine.deepZoom.*`. Cancel-via-closure at `fluid-toy/useDeepZoomOrbit.ts:84` + cleanup at `:135` handles superseded builds. LA and AT are gated to `kind === 'mandelbrot'` AND `power === 2` only (`fluid-toy/useDeepZoomOrbit.ts:80-82`); higher powers fall back to PO-only.

### View library smooth tween

`fluid-toy/viewLibrary.ts:81-128` implements a 500 ms tween between saved views: log-space lerp on `zoom`, linear lerp on `center` / `juliaC` / `power`, `kind` and `maxIter` snap immediately. Default seeded views (`fluid-toy/viewLibrary.ts:186-197`) populate on first boot; returning users with `savedViews.length > 0` are never touched.

### Camera-pair binding

`fluid-toy/main.tsx:166-170` pairs `julia.center_x/_y` with `julia.zoom` (and the DD lo-words `julia.centerLow_x/_y` with the pair). `AnimationEngine` then interpolates pan via the linear-in-zoom formula `c(f) = c0 + (c1-c0)·(z(f)-z0)/(z1-z0)`, so a deep-zoom flythrough keeps visual pan velocity constant. `julia.zoom` is also registered as a log-track at `fluid-toy/main.tsx:157` so the timeline scrubs zoom uniformly across decades.

### FluidEngine sub-controllers

`fluid-toy/fluid/FluidEngine.ts` is ~1901 lines and owns four sub-controllers, all imported at the top of the file (`fluid-toy/fluid/FluidEngine.ts:21-25`):

| Sub-controller | Owns | Site |
|---|---|---|
| `DeepZoomController` | Reference-orbit texture, LA merge-tree texture + stage table, AT scalar payload; per-frame `bindUniforms()` push | `fluid-toy/fluid/DeepZoomController.ts:1-12` |
| `GpuTimerManager` | `EXT_disjoint_timer_query_webgl2` ring of 3 queries; EWMA-smoothed `getMs()` | `fluid-toy/fluid/GpuTimerManager.ts:21-43` |
| `GradientLutManager` | Two 1-D LUT slots (`main`, `collision`); `version` counter for accumulator invalidation | `fluid-toy/fluid/GradientLutManager.ts:19-26` |
| `BloomChain` | Jimenez 2-level dual-filter bloom (3 programs + 3 scratch FBOs) | `fluid-toy/fluid/BloomChain.ts:41-59` |

Public type unions for cross-app use originate at the top of `fluid-toy/fluid/FluidEngine.ts:28-46`: `ForceMode`, `ForceSource`, `ShowMode`, `FractalKind`, `DyeBlend`, `DyeDecayMode`.

### Preset apply pipeline

`fluid-toy/presets/apply.ts:36-51`'s `buildDefaultSlice(featureId)` rebuilds each slice from its feature's authored defaults and merges the preset patch on top, dispatching one `set<Slice>` per slice. This prevents field leakage when switching A → B if B doesn't override a field A set. Animations are replaced wholesale at `fluid-toy/presets/apply.ts:112-114`; render-control toggles (`isPaused`, `accumulation`) are re-established to sane defaults at `:188-193` so a previously-loaded benchmark preset doesn't leak its frozen state.

### Bucket render

`fluid-toy/bucket/FluidBucketController.ts:198-323` is two nested loops: image tiles (output split into N×M PNG files) and GPU sub-buckets (within each tile, render through TSAA via `uRegionMin/Max` shader discard). The canvas is held at full tile size for the whole tile (`fluid-toy/bucket/FluidBucketController.ts:246`) so `uAspect` is forced to the full-output aspect via `setBucketOutputSize` and every sub-bucket samples the same world rect. RGBA8 stitch via `preserveDrawingBuffer: true` (no Float32 HDR — fluid-toy has no bloom inside per-tile composite).

### Video export

`fluid-toy/components/RenderDialog/exportRunner.ts` is a deterministic per-frame ratchet (`fluid-toy/components/RenderDialog/exportRunner.ts:1-22`): scrub, apply mods, yield to React, force-pause sim and converge TSAA via `engine.frame()` spam, then advance sim clock by exactly `1/fps` and encode. Saved/restored across the run: render size, `params.paused`, force-pause state, animation `currentFrame` + `isPlaying`.

## Invariants

### Boot-order traps

| Invariant | Site | Why |
|---|---|---|
| `fluid-toy/brush/index.ts` MUST NOT re-export `readBrushParams` | `fluid-toy/brush/index.ts:48-58` | `readBrushParams` imports `useEngineStore`. Several feature files (e.g. `palette`) reach the brush barrel transitively via `engineHandles` for `brushHandles`. Importing the store before registry registration completes freezes the registry. Consumers import directly from `fluid-toy/brush/readParams.ts:26`. |
| `fluid-toy/presets/apply.ts` MUST NOT eagerly import `useEngineStore` | `fluid-toy/presets/apply.ts:17-23` | Same trap — apply is reached transitively from `registerFeatures.ts` via `PresetGrid`. Apply grabs the store at call time via `(globalThis as any).__store` (set up by `store/engineStore.ts:526`). See followup q-119 — this is a deliberate load-order workaround, not a recommended convention. |
| Components for `customUI` slots MUST be registered BEFORE store boot | `fluid-toy/registerFeatures.ts:28-31, 34-42` | `julia-c-picker`, `preset-grid` register in `registerFeatures.ts` since they ride alongside feature registrations. `panel-views` and similar components that import `useEngineStore` register POST-boot in `fluid-toy/main.tsx:271`. |
| `useEngineStore()` no-arg subscription is forbidden in `FluidToyApp` | `fluid-toy/FluidToyApp.tsx:46-51` | React-cascade max-depth. Every read must be a granular selector. |

### Gesture / store coupling

| Invariant | Site | Why |
|---|---|---|
| `syncJuliaToEngine` effect deps deliberately exclude `liveMod` | `fluid-toy/useEngineSync.ts:53-58` | Per-frame modulation ticks would clobber gesture-set `engine.params.center` / `zoom` mid-pan/zoom. A separate effect at `fluid-toy/useEngineSync.ts:62` writes only juliaC from liveMod. |
| Pan / middle-drag / wheel bypass the store during the gesture | `fluid-toy/pointer/handlers.ts:87-103` + per-gesture files | Single `setJulia` commit on pointerup (drag) or 100 ms idle (wheel). Reason: React 18 max-depth guard. |
| `useLiveModulations()` returns a frozen `EMPTY_MODS` when no mods exist | (engine-side hook in `engine/typedSlices.ts`, referenced from README `fluid-toy/README.md:202-207`) | `useEngineStore((s) => s.liveModulations ?? {})` would mint a fresh object every selector eval, defeating reference-equality re-render gating. |
| `sync<X>ToEngine` lives in the feature file, not the app | each `fluid-toy/features/*.ts` | One-file-per-feature contract. Co-locates the slice→engine mapping with the param defaults. |

### Deep-zoom precision

| Invariant | Site | Why |
|---|---|---|
| `julia.centerLow_*` is the sub-f64 lo word of a Dekker double-double accumulator | `fluid-toy/features/julia.ts:100-107`, `fluid-toy/deepZoom/dd.ts:1-22` | Reaches zoom ~1e-30 cleanly. Skipping it loses keyframes to f64 ulp quantisation for zoom < 1e-15. Registered hidden in camera tracks at `fluid-toy/main.tsx:148-149` so Key Cam captures them. |
| LA / AT require `kind === 'mandelbrot'` AND `power === 2` | `fluid-toy/useDeepZoomOrbit.ts:80-82` | AT's `dc = 0` collapses for Julia; LA's rebase formula assumes `Z[0] = 0` (Mandelbrot convention). Step rules are d=2-specific. |
| Pre-step finite-diff probes use TWO radii (inner + outer) | `fluid-toy/brush/particles.ts:140-150` | Inner probe (`ND = 0.01`) handles fat walls; outer (`ND2 = ND·3`) catches 1-cell-wide walls where the inner gradient would otherwise be zero. |

### Camera coexistence

| Invariant | Site | Why |
|---|---|---|
| `installCamera({ hideShortcuts: true })` at `fluid-toy/main.tsx:202` | `fluid-toy/main.tsx:194-220` | `installFluidToyViewLibrary()` at `fluid-toy/main.tsx:264` registers the same `Ctrl+1..9` / `1..9` bindings against `savedViews`. The camera plugin's preset-field round-trip stays active for backwards compat on `cameraSlots[]`; only its shortcuts are silenced. See followup q-065 for the canonical split. |
| TSAA sample cap is overridden to 64 (default 256) | `fluid-toy/main.tsx:78` | GMT's path tracer needs deeper accumulation; fluid-toy's TSAA reaches a clean image at 64. Deep-accum gate (`sampleCap / 2 = 32`) prevents adaptive from re-engaging too eagerly. |

### State machinery

| Invariant | Site | Why |
|---|---|---|
| Migration v1 handles the 2026-04-23 tab-parity restructure | `fluid-toy/migrations.ts:25-80` | `dye → palette` rename, `palette.collision* → collision.*`, `palette.dye* → fluidSim.*`, `orbit.* → coupling.orbit*`, `sceneCamera → julia`. Any future slice rename/move requires a new `registerMigration` entry. |
| View library seeds 5 defaults on empty store and auto-selects the first | `fluid-toy/viewLibrary.ts:186-219` | Returning users with `savedViews.length > 0` are never touched. |
| Deterministic-playback wipes dye + accumulator on play-from-start | `fluid-toy/useFluidEngine.ts:82-93` | Without this the preview opens on whatever crud the live sim had; with it, "play" matches a fresh export from frame 0. |
| `accumulation === undefined` treated as `true` in `tsaaSampleCap` calc | `fluid-toy/FluidToyApp.tsx:110-118` | `accumulation ?? true`. Topbar accumulation=off forces cap=1 (TSAA disabled, no jitter). |

## Interactions with other subsystems

| Engine subsystem | Touch points |
|---|---|
| a01-boot-shell | Reuses engine startup machinery; first store touch is `useEngineStore.getState().setSampleCap(64)` at `fluid-toy/main.tsx:78`. |
| e01-feature-system | 10 features registered side-effect via `featureRegistry.register` at `fluid-toy/registerFeatures.ts:47-91`. Slices declare-merged into `AppFeatureSlices` + `FeatureStateMap` at `fluid-toy/storeTypes.ts:42-72`. |
| e02-tick-registry | The RAF loop is owned by `fluid-toy/useFluidEngine.ts:60-106` and calls `engine.frame(t)` directly; the engine's TickRegistry is reused via plugins (modulation tick, viewport frame tick), not driven from this file. |
| e03-animation | `installModulation` (`fluid-toy/main.tsx:176`), `installModulationUI` (`:183`), `registerCameraKeyTracks` (`:140-151`), `registerLogTrack('julia.zoom')` (`:157`), `registerCameraPair` (`:166-170`). Animations array driven by presets via `s.setAnimations(preset.animations ?? [])` at `fluid-toy/presets/apply.ts:112-114`. |
| e06-adaptive-resolution | `installViewport` with `engageOnAccumOnly: true` (`fluid-toy/main.tsx:91-98`). Resolution computed at `fluid-toy/FluidToyApp.tsx:130-142`. |
| e07-plugins-host | Every plugin install in `fluid-toy/main.tsx:91-237` plus `installBucketRender` with controller (`:117-122`), `installSceneIO` (`:127-129`), `installRenderDialog` (`:276`). |
| e08-shortcuts-undo | `installShortcuts` + `installUndo` (`fluid-toy/main.tsx:188-192`). App hotkeys registered at `fluid-toy/hotkeys.ts:25-66`. |
| e09-camera-plugin | `installCamera({ hideShortcuts: true })` at `fluid-toy/main.tsx:202` plus `camera.register(...)` at `:208-220`. Coexists with `installStateLibrary` driven by `installFluidToyViewLibrary` (`fluid-toy/viewLibrary.ts:221-271`). See followup q-065. |
| e13-shared-ui | Reuses `Dock` / `DropZones` / `DraggableWindow` / `PanelRouter` / `StoreCallbacksProvider` / `TimelineHost` / `EngineBridge` / `RenderLoopDriver` / `GlobalContextMenu` / `HelpOverlay` (`fluid-toy/FluidToyApp.tsx:23-34`). `ViewLibraryPanel` wraps `<StateLibraryPanel>` + `<ActiveSnapshotFeatures>` + `<CompositionOverlayControls>` (`fluid-toy/components/ViewLibraryPanel.tsx:13-22`). |

## File catalog

### Boot + shell

| File | Role |
|---|---|
| `fluid-toy/main.tsx` | Entry — side-effect registrations, plugin installs, panel manifest apply, `ReactDOM.render`. 288 lines. |
| `fluid-toy/FluidToyApp.tsx` | Thin React shell. 215 lines. |
| `fluid-toy/FluidPointerLayer.tsx` | Mounts the three pointer hooks; 0-DOM React shell. 46 lines. |
| `fluid-toy/useFluidEngine.ts` | Engine boot + RAF loop + brush tick + hotkey reg. 125 lines. |
| `fluid-toy/useEngineSync.ts` | Slice → engine push effects (9 slices + julia-c split). 69 lines. |
| `fluid-toy/useDeepZoomOrbit.ts` | Orbit/LA/AT rebuild loop + GPU-time poll. 153 lines. |

### State & registry

| File | Role |
|---|---|
| `fluid-toy/registerFeatures.ts` | Side-effect `featureRegistry.register(...)` for the 10 features + 2 component registrations. 91 lines. |
| `fluid-toy/storeTypes.ts` | Type-only — declares slices into `AppFeatureSlices` + `FeatureStateMap`. 72 lines. |
| `fluid-toy/migrations.ts` | `registerMigration` v1 (tab-parity restructure). 80 lines. |
| `fluid-toy/engineHandles.ts` | Typed `defineAppHandles` singletons (`appEngine`, `brushHandles`, `cursorHandles`). 56 lines. |
| `fluid-toy/viewLibrary.ts` | `installFluidToyViewLibrary` + view tween + thumbnail capture + seeded defaults + `EngineStoreState`/`EngineActions` augmentations. 271 lines. |
| `fluid-toy/setup.ts` | One-call `applyPanelManifest` + dock un-collapse. 21 lines. |
| `fluid-toy/hotkeys.ts` | Space / R / O / Home registrations. 67 lines. |
| `fluid-toy/constants.ts` | Pixel thresholds, zoom bounds, drag sensitivities, preset-submission endpoint stub. 73 lines. |

### Panels

| File | Role |
|---|---|
| `fluid-toy/panels.ts` | `FluidToyPanels` manifest. Left dock: View / Fractal (hidden) / Deep Zoom / Palette / Modulation / Presets. Right dock: Coupling / Fluid / Collision / Brush / Post-FX / Composite. Multi-section tabs use `items: [{type:'section'}, {type:'feature', whitelistParams}]` to subdivide a feature's params (`fluid-toy/panels.ts:57-69` Palette example; `fluid-toy/panels.ts:88-98` Fluid example). 135 lines. |

### Features (`fluid-toy/features/`)

| File | Slice id | Tab | Notable |
|---|---|---|---|
| `fluid-toy/features/julia.ts` | `julia` | Fractal (hidden) / View | Carries kind / juliaC / center / centerLow (DD lo) / zoom / maxIter / power. Two sync functions for the gesture-vs-mod split. 174 lines. |
| `fluid-toy/features/deepZoom.ts` | `deepZoom` | Deep Zoom | Master toggle + useLA / useAT / maxRefIter / deepMaxIter / showStats / disableFluid. 135 lines. |
| `fluid-toy/features/coupling.ts` | `coupling` | Coupling | 5 forceMode operators × 5 forceSource channels + intensity knobs. 115 lines. |
| `fluid-toy/features/palette.ts` | `palette` | Palette | Gradient + 14 colorMapping modes + trap shape params + colorIter + escapeR + interiorColor. Also owns `dyeBlendParam` + `dyeDecayModeParam` for cross-feature index sharing. 272 lines. |
| `fluid-toy/features/collision.ts` | `collision` | Collision | enabled / gradient / repeat / phase / preview. 100 lines. |
| `fluid-toy/features/fluidSim.ts` | `fluidSim` | Fluid | Vorticity / dissipation / pressureIters / dyeInject / dyeBlend / dye-decay subsection / timeScale / paused. 145 lines. |
| `fluid-toy/features/postFx.ts` | `postFx` | Post-FX | 4 tone-map modes + bloom / aberration / refraction (smooth + roughness) / caustics / exposure / vibrance. 122 lines. |
| `fluid-toy/features/composite.ts` | `composite` | Composite | 4 show modes + juliaMix / dyeMix / velocityViz. 84 lines. |
| `fluid-toy/features/brush.ts` | `brush` | Brush | 4 modes × 4 colorMode × particle-emitter subsection (8 params). 168 lines. |
| `fluid-toy/features/presets.ts` | `presets` | Presets | No params — UI-only chip grid via `customUI: [{componentId: 'preset-grid'}]`. 42 lines. |

### Pointer dispatch (`fluid-toy/pointer/`)

| File | Role |
|---|---|
| `fluid-toy/pointer/handlers.ts` | `useCanvasPointerHandlers` — attaches DOM listeners, switches on button + modifiers + mode. Owns pointerup commit of `pendingViewRef → setJulia`. 133 lines. |
| `fluid-toy/pointer/types.ts` | `PointerMode`, `PointerState` (with DD anchors), `PendingView`. 79 lines. |
| `fluid-toy/pointer/modifiers.ts` | `useModifierKeys` + `mods.b/c` singleton + `precisionMultiplier`. Bails on text-input focus. 57 lines. |
| `fluid-toy/pointer/contextMenu.ts` | `useCanvasContextMenu` — right-click menu items (copy c, pause sim, auto-orbit toggle, recenter, reset fluid). 70 lines. |

### Pointer gestures (`fluid-toy/pointer/gestures/`)

| File | Role |
|---|---|
| `fluid-toy/pointer/gestures/types.ts` | `GestureCtx` (refs + callbacks bag). 19 lines. |
| `fluid-toy/pointer/gestures/pan.ts` | Right-drag pan with DD-precision centre via `ddAddF64`. Pan-pending → pan transition fires after `PAN_DRAG_THRESHOLD_PX`. 72 lines. |
| `fluid-toy/pointer/gestures/zoom.ts` | Middle-drag exponential zoom. Anchor captured as DD at pointerdown. 83 lines. |
| `fluid-toy/pointer/gestures/wheel.ts` | Cursor-anchored wheel zoom. Factory with 100 ms idle commit timer. 88 lines. |
| `fluid-toy/pointer/gestures/splat.ts` | Left-drag brush emit. Press emits one splat at click point. 70 lines. |
| `fluid-toy/pointer/gestures/pickC.ts` | C+drag drag-Julia-c. 37 lines. |
| `fluid-toy/pointer/gestures/resizeBrush.ts` | B+drag log-scaled brush resize. 31 lines. |
| `fluid-toy/pointer/gestures/zoomBounds.ts` | `effectiveMinZoom()` — drops to `MIN_ZOOM_DEEP = 1e-300` when deepZoom enabled, else `MIN_ZOOM = 1e-5`. 15 lines. |

### Brush + particle emitter (`fluid-toy/brush/`)

| File | Role |
|---|---|
| `fluid-toy/brush/index.ts` | Barrel — re-exports `color`, `particles`, `emitter` types. NOT `readBrushParams` (boot-order trap). 58 lines. |
| `fluid-toy/brush/color.ts` | 4 colour modes (rainbow / solid / gradient / velocity); HSL↔RGB; hue-jitter. Pure functions. 131 lines. |
| `fluid-toy/brush/particles.ts` | CPU particle system. `PARTICLE_HARD_CAP = 300`. Spawn + step + wall-bounce with finite-diff mask gradient. 184 lines. |
| `fluid-toy/brush/emitter.ts` | `BrushRuntime` + `stepBrush` (per-frame) + `emitStrokeSplat` (per-move with spacing) + `emitPressSplat` (unconditional click) + `beginStroke`. 230 lines. |
| `fluid-toy/brush/readParams.ts` | `readBrushParams()` — snapshots brush slice + cached LUT + applies `liveMod`. Imports `useEngineStore`. 54 lines. |

### Render core (`fluid-toy/fluid/`)

| File | Role |
|---|---|
| `fluid-toy/fluid/FluidEngine.ts` | WebGL2 orchestrator. Public type unions, shader compile, FBO lifecycle, sim step, render passes, MRT TSAA, bucket-render mode toggles. ~1901 lines. |
| `fluid-toy/fluid/DeepZoomController.ts` | Reference-orbit + LA + AT GPU state; `bindUniforms()` per frame; HDR `(mantissa, exp)` packing for f32-underflow values. 286 lines. |
| `fluid-toy/fluid/BloomChain.ts` | Jimenez 2-level dual-filter bloom; 3 programs + 3 scratch FBOs. 147 lines. |
| `fluid-toy/fluid/GpuTimerManager.ts` | `EXT_disjoint_timer_query_webgl2` wrapper. Ring of 3 queries. EWMA-smoothed reading. 94 lines. |
| `fluid-toy/fluid/GradientLutManager.ts` | Two LUT slots (`main`, `collision`). `version` counter feeds the engine's TSAA paramHash. 81 lines. |

### Shaders (`fluid-toy/fluid/shaders/`)

| File | Role |
|---|---|
| `fluid-toy/fluid/shaders/index.ts` | Re-exports every shader constant. 38 lines. |
| `fluid-toy/fluid/shaders/common.ts` | OKLab ↔ sRGB, `GRADIENT_SAMPLE_GLSL`, `VERT_FULLSCREEN`. 119 lines. |
| `fluid-toy/fluid/shaders/julia.ts` | `FRAG_JULIA` — fractal MRT kernel (main + fx attachments) with deep-zoom + LA + AT paths. 877 lines. |
| `fluid-toy/fluid/shaders/sim.ts` | Motion / advect / divergence / curl / vorticity / pressure / gradient-subtract / splat / addforce / inject-dye. 461 lines. |
| `fluid-toy/fluid/shaders/display.ts` | Composite, bloom extract / down / up, TSAA blend, post-FX (tone-map, aberration, refraction, caustics). 365 lines. |
| `fluid-toy/fluid/shaders/utility.ts` | Clear / copy / copy-MRT / reproject (camera change mid-frame). 77 lines. |

### Deep zoom (`fluid-toy/deepZoom/`)

| File | Role |
|---|---|
| `fluid-toy/deepZoom/HighPrecComplex.ts` | BigInt fixed-point complex arithmetic. `HPReal.fromNumber` extracts IEEE-754 mantissa/exp so DD lo words survive. 197 lines. |
| `fluid-toy/deepZoom/HDRFloat.ts` | `(mantissa, exp)` pair for shader uniforms past 1e-38. 48 lines. |
| `fluid-toy/deepZoom/dd.ts` | Dekker double-double primitives (`twoSum`, `ddAddF64`, `ddSub`). 48 lines. |
| `fluid-toy/deepZoom/referenceOrbit.ts` | Orbit builder (Mandelbrot + Julia, power 2..8). RGBA32F texel layout. 125 lines. |
| `fluid-toy/deepZoom/laBuilder.ts` | LA merge tree — two-pass (Stage 0 leaf + Stage N+1 composite) ported from FractalShark. 484 lines. |
| `fluid-toy/deepZoom/LAInfoDeep.ts` | LA node algebra. 266 lines. |
| `fluid-toy/deepZoom/laParameters.ts` | LA tuning defaults (FractalShark Detection Method 2). 41 lines. |
| `fluid-toy/deepZoom/atBuilder.ts` | AT front-load — picks outermost LA stage whose `|dc|²` ≤ threshold covers the screen. 154 lines. |
| `fluid-toy/deepZoom/deepZoomWorker.ts` | Worker entry — orbit + LA + AT serialise to transferable buffers. 226 lines. |
| `fluid-toy/deepZoom/laRuntime.ts` | Main-thread proxy + singleton. 179 lines. |
| `fluid-toy/deepZoom/diagnostics.ts` | Tiny pub/sub for `DeepZoomDiag` (outside the Zustand store on purpose). 65 lines. |
| `fluid-toy/deepZoom/benchmark.ts` | A/B perf bench matrix. Only consumed by `DeepZoomBench` (dev-only). 279 lines. |

### Presets (`fluid-toy/presets/`)

| File | Role |
|---|---|
| `fluid-toy/presets/data.ts` | 7 curated reference presets. String-enum payload (legacy reference toy format). 604 lines. |
| `fluid-toy/presets/apply.ts` | `applyRefPreset` — string-enum → numeric-index translation, per-slice default-merge dispatch, animations replace, render-control re-establish. 194 lines. |

### Components (`fluid-toy/components/`)

| File | Role |
|---|---|
| `fluid-toy/components/DomOverlays.tsx` | Renders every feature's `viewportConfig` DOM overlay. 41 lines. |
| `fluid-toy/components/HotkeysCheatsheet.tsx` | Bottom-left HUD pill — expanded panel + collapsed `? hotkeys` pill. Registered via `help.registerHudHint` at `fluid-toy/main.tsx:243-251`. 63 lines. |
| `fluid-toy/components/JuliaCPicker.tsx` | DDFS-native wrapper around `MandelbrotPicker`. Registered as `julia-c-picker`. 36 lines. |
| `fluid-toy/components/MandelbrotPicker.tsx` | Bottom-right preview canvas — click-to-pick Julia c. Module-scope memoised raster (~190 KB × 16 cap). 295 lines. |
| `fluid-toy/components/PresetGrid.tsx` | Chip grid for the Presets tab. Calls `applyRefPreset` + `engine.resetFluid()`. 46 lines. |
| `fluid-toy/components/QualityBadge.tsx` | HUD `q<NN>%` badge reading `useQualityFraction()`. 21 lines. |
| `fluid-toy/components/ViewLibraryPanel.tsx` | Wraps `<StateLibraryPanel>` + `<ActiveSnapshotFeatures>` + `<CompositionOverlayControls>`. Registered as `panel-views` POST-boot. 131 lines. |
| `fluid-toy/components/DeepZoomStatus.tsx` | Diagnostics overlay — orbit length, LA stats, GPU ms. Only mounted when `deepZoom.enabled` (`fluid-toy/FluidToyApp.tsx:180-192`). Imports `useEngineStore` — mounted directly in `FluidToyApp`, not via componentRegistry (`fluid-toy/registerFeatures.ts:28-31`). 58 lines. |
| `fluid-toy/components/DeepZoomBench.tsx` | A/B benchmark panel — same `useEngineStore` boot-order constraint. Lone consumer of `fluid-toy/deepZoom/benchmark.ts`. 145 lines. |
| `fluid-toy/components/RenderDialog/exportRunner.ts` | Deterministic per-frame video-export ratchet. 232 lines. |

### Bucket render (`fluid-toy/bucket/`)

| File | Role |
|---|---|
| `fluid-toy/bucket/FluidBucketController.ts` | `BucketRenderController` impl — image-tile × GPU-sub-bucket nested loop. 328 lines. |

## Known issues / Phase 2 carry-in

### Answered followups

| Followup | Subject | Resolution |
|---|---|---|
| q-065 | `@engine/camera` vs `installStateLibrary` future | NOT a deprecation pair. `@engine/camera` is the lightweight default (slot-only); `installStateLibrary` is the heavyweight upgrade (named/labeled snapshots + thumbnails + panel). fluid-toy installs both — `installCamera({hideShortcuts:true})` for `cameraSlots[]` preset-field round-trip + `window.__camera` dev access, `installFluidToyViewLibrary()` for the Views panel. Documented at `fluid-toy/main.tsx:194-220` + `fluid-toy/viewLibrary.ts:221-271`. |
| q-119 | `__store` lookup in `presets/apply.ts` | `window.__store` is NOT canonical — it's a narrowly-scoped load-order workaround in `fluid-toy/presets/apply.ts:69`. Canonical cross-tree pattern is `defineAppHandles<T>()` in `fluid-toy/engineHandles.ts:27,37,52`. New code should use `defineAppHandles` for cross-tree state and import `useEngineStore` lazily for store access. Lazy-import inside `applyRefPreset`'s body would be the cheapest fix. |

### Open / corollary items

| Item | Site | Severity |
|---|---|---|
| Wheel commit-timer claim "100 ms idle timer" (README `fluid-toy/README.md:189-200`) verified end-to-end | `fluid-toy/pointer/gestures/wheel.ts:23-25` | minor — needs spot-confirm |
| `PresetGrid → engine.resetFluid()` caller-responsibility claim (apply.ts header) | `fluid-toy/presets/apply.ts:13`, `fluid-toy/components/PresetGrid.tsx` | minor — needs spot-confirm |
| `fluid-toy/viewLibrary.ts:39-57` declare-merges `_viewIsModified` onto `EngineStoreState`. Possibly stale optional helper field; worth verifying it's still consumed. | `fluid-toy/viewLibrary.ts:45` | trivial — optional cleanup |
| Orphan-sweep candidates: `MandelbrotPicker.tsx` (only invoked transitively by `JuliaCPicker`), `DeepZoomBench.tsx` (gated on `deepZoom.enabled`), `deepZoom/benchmark.ts` (only consumed by gated bench) | various | dev-only surface |
| `FluidEngine.ts` size (~1901 lines) — already factored out the 4 sub-controllers but further display-vs-sim split is plausible | `fluid-toy/fluid/FluidEngine.ts` | refactoring opportunity, no concrete pressure point |

## Historical context

The canonical onboarding doc remains `fluid-toy/README.md` (read-only per Phase 2 disposition `keep-as-is`). It carries the architecture overview, the 5-step "How to add a feature" recipe (`fluid-toy/README.md:143-167`), the "Things that look weird but are deliberate" tour (`fluid-toy/README.md:171-222`), and the "Where to look when something breaks" symptom table (`fluid-toy/README.md:247-260`). `fluid-toy/CODE_MAP.md` is the canonical per-file index. This module doc supplements both with API-level depth (every public symbol's site + signature row), the full per-area file table, and Phase 2 followup resolutions; it does not supersede them.

The app was ported from `stable/toy-fluid/` (the original useState/RAF prototype, kept frozen as a visual-parity reference per `fluid-toy/README.md:9-11`) onto the engine surface. The 2026-04-23 tab-parity restructure is captured in `fluid-toy/migrations.ts:8-23`. The deep-zoom pipeline is FractalShark-derived (`fluid-toy/deepZoom/LAInfoDeep.ts:10-11`, `fluid-toy/deepZoom/atBuilder.ts:18-22`); LA and AT remain Mandelbrot-and-power-2 only.
