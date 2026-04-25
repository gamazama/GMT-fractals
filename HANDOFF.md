# gmt-engine — Session Handoff

**Location:** `h:/GMT/gmt-engine/`
**Origin:** Forked from `h:/GMT/gmt-0.8.5` (kept as `upstream` remote)
**Status:** ✅ **GMT fully ported to the engine (2026-04-26).** All three apps boot. `app-gmt.html` is functionally equivalent to gmt-0.8.5: full worker renderer, path tracing, Orbit/Fly navigation, all 26 DDFS features, 42 formulas, all 10 manifest-driven panels, light gizmos, drawing tools, webcam overlay, state debugger, Formula Workshop, GMT loading screen, Share Link, save/load (PNG + GMF + JSON), Camera Manager, formula gallery. `npx tsc --noEmit` → 0 errors.

**📋 2026-04-26 — GMT port complete. Final wiring pass:**
- **Loading screen** — GMT-branded splash with CPU Julia spinner, formula picker dropdown, Load From File, Lite Render toggle ported to `app-gmt/LoadingScreen.tsx`. Replaces the minimal engine stub.
- **Share Link** — `ShareLinkButton` topbar component with Copied!/N/A/Long URL feedback. Workshop formula detection. URL length guard strips animations if >4096 chars.
- **Adaptive warmup** — first sample window after interaction seed uses 200ms (not 500ms) and jumps directly to `idealScale` (no EMA). Subsequent windows revert to normal 500ms + 0.7/0.3 smoothing.
- **Drawing tools** — `DrawingPanel` registered as `'panel-drawing'`; manifest switched from `features:` to `component:`. Drawing overlay and tick registered.
- **Formula Workshop** — wired from stub to `openWorkshop()`; mounted as left-dock replacement (same as gmt-0.8.5 layout).
- **Webcam overlay + State Debugger** — registered in componentRegistry; State Debugger appears under System → Advanced.
- **`getExtraMenuItems()`** — was never called in topbar.tsx; added loop so features using `menuItems[]` (not `menuConfig`) get system-menu entries.
- **Mesh Export** — saves scene to localStorage + opens `public/mesh-export/index.html` in new tab.
- **Public assets** — `public/formulas/` (manifest.json + dec.json + frag library), `public/gmf/` (gallery.json + fragmentarium GMFs), `public/mesh-export/` (full pipeline) all committed.
- **Scene loading fixed** — PNG (`FractalData` key) + GMF (`<Scene>` block) both parse correctly.
- **FPS counter unified** — `GmtRendererTickDriver` feeds real FPS to `viewport.reportFps()`.
- **Formula panel migration** — last bespoke panel converted to manifest `items:`. `FormulaPanel.tsx` deleted. All 10 GMT panels now manifest-driven.
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/`. `DomOverlays` in all three app layouts.
- **F16/F17/F18** — TopBar snapshot, GLSLToJS dead require, dual singleton — all fixed/closed.

**📋 2026-04-25 (continued) — Formula panel migration, scene loading, FPS, light gizmos:**
- **Formula panel migration** — last bespoke panel converted to manifest-driven `items:` array. `FormulaPanel.tsx` deleted. Per-formula params (iterations + `FractalRegistry`-driven scalar/vec controls) extracted to `FormulaParamsWidget` registered as `'formula-params'`. `LfoList` registered as `'lfo-list'`. `geometry` feature gained `panelConfig` for Hybrid Box Fold compilable section. Julia group uses `showIf` predicate (hidden when `formulaDef.juliaType === 'none'`). All 10 GMT panels are now manifest-driven — no bespoke panel components remain except the genuinely domain-specific ones (LightPanelControls, EnginePanel, CameraManagerPanel). `PanelRouter` separator updated to match `SectionDivider` visual treatment (raised block + gradient, not a thin white line).
- **Scene loading** — all GMT PNG and `.gmf` saves now load correctly. Two root causes: (1) wrong iTXt key — gmt-0.8.5 saves under `'FractalData'`, engine looked for `'SceneData'`; added fallback. (2) GMF format unhandled — `parseSceneJson` now detects `<!--` prefix, extracts `<Scene>` block, parses its JSON. `.gmf` added to SceneIO file-input accept list.

**📋 2026-04-25 (continued) — light gizmos, FPS unification, engine-core promotion:**
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/` (were in `engine-gmt/`). Re-export shims keep existing consumers working. `DomOverlays` component (renders `featureRegistry.getViewportOverlays().filter(type==='dom')`) added to all three app layouts. `overlay-lighting` + `lightGizmoTick` wired in `registerGmtUi()`. Gizmos tested and working.
- **FPS counter** — `GmtRendererTickDriver` was tracking FPS privately in `throttleRef` but never calling `viewport.reportFps()`, so `useViewportFps()` / `FpsCounter` always showed the default 60. Fixed: `viewport.reportFps(t.fps)` on each 500ms sample window. `fluid-toy` was already correct (called `viewport.frameTick()` via `onFrameEnd`).
- **F16/F17/F18** — all fixed/closed (commit `f2b119d`). TopBar snapshot now returns `_rev`; GLSLToJS dead require path corrected; dual AnimationEngine confirmed non-issue (no local copy exists).

**📋 2026-04-25 sweep (see `docs/engine/20_Fragility_Audit.md` F5–F15 entries):**
- **F5 closed** — AnimationEngine camera tracks moved to GMT-side binder module; engine pipeline is camera-shape-agnostic.
- **F7 closed** — `window.useAnimationStore` was leftover scaffolding (no real cycle). Direct imports everywhere.
- **F14 fixed** — Duplicate `ViewportRefs.ts` in `engine/worker/` and `engine-gmt/engine/worker/` had separate module-level `_camera`. Capture path used one copy, dirty-check used the other. Collapsed to a re-export shim. The whole class of "engine-gmt overlay duplicates an engine-core module" is now an audit target.
- **F15 deferred** — Worker `_localOffset` reads zeros for ~20ms at boot before preset values arrive; flagged via Key Cam logging, no visible symptoms.
- **Verbatim ports** — Adaptive resolution badge, Key Cam keyframe body, RenderPopup (video render), GMT logo all ported from `gmt-0.8.5/` rather than reinvented. Lesson saved: when fixing GMT-specific behaviour, the working code is upstream; copy + rewrite imports beats bending engine-core generics.
- **Lifecycle-in-unmounted-components** — Modulation-record overrides cleanup, timeline-hover scope push, `setMouseOverCanvas` for adaptive's settle-on-canvas all moved off legacy `<ViewportArea>` useEffects to plugin-tick or `ViewportFrame` DOM handlers.
- **Panel-manifest** gained `compilable` item type so `<CompilableFeatureSection>` can drive volume scatter / hybrid box / interlace from items lists, not bespoke JSX.
- **State-library plugin** validated by 2nd-app reuse: fluid-toy's "Views" + GMT's "Camera Manager" share `StateLibraryPanel` + `installStateLibrary` (slice + slot shortcuts + topbar menu in one call). View Manager dock-left default, GMT-style preset button grid, ActiveSnapshotFeatures footer helper.
- **Help system** — `helpId` on PanelDefinition / ParamConfig / GroupConfig / PanelItem; `?` button next to hint copy; right-click context-menu DOM walk.

**📐 Architecture baseline committed (2026-04-22).** 12 engine-scope docs written under `docs/01_*` through `docs/20_*`. Start any session with `docs/DOCS_INDEX.md`; the table in `CLAUDE.md` maps "working on X" → "read Y". All design decisions (core+plugins model, feature isolation, unified undo, auto-binding animation, bridges/derived) live in those docs. Any architectural change goes in a doc before it goes in code.

## What this is

An experiment in extracting a reusable application engine (DDFS + animation + UI framework + save/load + worker stub + shader assembly) from GMT. The first goal is to port toy-fluid onto this engine as a proof, then eventually rebuild GMT's raymarching pipeline on top as a plugin.

**Core principle:** strip fractal/raymarching content, preserve every generic pattern with plugin seams so the stripped capabilities can be re-introduced cleanly later.

## Current tree

```
engine/           FeatureSystem, FractalEvents, TickRegistry, AnimationEngine,
                  BezierMath, UniformSchema, UniformNames, HardwareDetection,
                  ShaderBuilder (generic 5-primitive + addSection),
                  ShaderFactory (generic, iterates features), ConfigManager
                  (generic DDFS diffing), ConfigDefaults (generic),
                  RenderPipeline (ping-pong + accumulation), BloomPass,
                  worker/ (WorkerProxy STUB + ViewportRefs), codec/,
                  algorithms/, math/, utils/

store/            fractalStore (generic composition shell, 260 lines),
                  createFeatureSlice, CompileGate, animationStore,
                  animation/, slices/ (ui, renderer, history — generic)

utils/            colorUtils, pngMetadata, fileUtils, helpUtils, CurveFitting,
                  ConstrainedSmoothing, GraphUtils + GraphRenderer (animation
                  keyframe curve editor), keyframeViewBounds, timelineUtils
                  (generic), PresetLogic (generic), Sharing, UrlStateEncoder,
                  histogramUtils

features/         index, types, ui, audioMod, modulation, webcam, debug_tools,
                  color_grading, post_effects
                  — all generic. Fractal-leaning features (camera_manager,
                  coloring, navigation, optics, droste, drawing) deleted.

components/       App shell (App.tsx, LoadingScreen, ViewportArea generic),
                  primitives (Slider, Knob, Dropdown, ToggleSwitch, TabBar,
                  Popover, CollapsibleSection, PanelHeader, StatusDot, etc.),
                  inputs/, vector-input/, pickers, gradient/, timeline/
                  (DopeSheet, KeyframeInspector, TrackRow, minimal
                  TimelineToolbar stub), graph/ (animation keyframe curve
                  editor), layout/ (Dock, DropZones), viewport/ (Composition
                  Overlay, FixedResolutionControls), AutoFeaturePanel,
                  CompilableFeatureSection, PanelRouter, AnimationSystem,
                  KeyframeButton, Histogram, ParameterSelector,
                  PopupSliderSystem, DraggableWindow, ComponentRegistry,
                  GlobalContextMenu, HelpBrowser, CompilingIndicator,
                  MobileControls, PerformanceMonitor,
                  contexts/StoreCallbacksContext

toy-fluid/        Kept as reference; first port target

docs/             Preserved as reference (all fractal-documented — read-only
                  for patterns, don't treat as engine truth)

HANDOFF.md        This doc
```

## What's done

**Git history on top of GMT (15 commits):**

1–11. Delete-by-domain stages (formulas, mesh export, Fragmentarium, raymarching shader chunks, fractal DDFS features, fractal engine internals, modular graph, prototypes/test harnesses, misc ephemera, fractal UI, 4 truly fractal files).

12. Genericize stage — ShaderBuilder rewritten to 5 generic primitives + `addSection`, ShaderFactory/ConfigManager/historySlice/engineStore/PresetLogic all stripped to their generic kernel. FractalEngine, MaterialController, SceneController, UniformManager, controllers/, overlay/, FormulaFormat, remaining shader chunks deleted.

13. **Fix pass to zero tsc errors** — deleted remaining fractal-leaning features (camera_manager, coloring, navigation, optics, droste, drawing), stubbed the worker subsystem (WorkerProxy as in-memory stub; internals deleted), rewrote App/LoadingScreen/ViewportArea/useAppStartup as minimal generic shells, property-access-cast all downstream feature consumers, fixed type mismatches (QualityState typed numerics, WorkerProxy overloads, Timeline onZoom, registry stub shape).

**Verified:** `npx tsc --noEmit` exits 0.

## Plugin seams designed in

Where a future fractal plugin (or any other app) re-installs its capabilities:

| Capability | Re-entry via |
|-----------|--------------|
| Named shader pipeline stages (post-map, miss-handler, integrator, …) | `ShaderBuilder.addSection(name, code)` + `getSections(name)` — plugin registers its pipeline DSL, its own assembler reads sections back |
| Feature state (any shape) | `FeatureRegistry.register(def)` + generic `createFeatureSlice` auto-generates Zustand slice + `AutoFeaturePanel` auto-generates UI |
| Render engine / render loop | Not supplied by engine. App instantiates its own, consuming the store + the shader built by ShaderFactory |
| Worker offload | `WorkerProxy` is an in-memory stub. Apps subclass or replace the singleton with a Worker-backed implementation |
| Compile scheduling | `CompileGate.queue(msg, fn)` — generic two-phase trigger with spinner |
| Config diffing | `ConfigManager.update(newConfig, runtimeState)` → `{rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset}` |
| Preset save/load | `PresetLogic.applyPresetState` iterates feature registry + invokes feature setters. `utils/pngMetadata` for PNG embed. `utils/Sharing` + `UrlStateEncoder` for URL state |
| Undo/redo | `historySlice` — snapshots ALL feature state via registry iteration, automatic for any future plugin |
| Animation engine | `engine/AnimationEngine.ts` with `connect(animStore, hostStore)` injection; no direct store coupling |
| TickRegistry phases | SNAPSHOT → ANIMATE → OVERLAY → UI |
| UI componentRegistry | Apps register panel + overlay components by string ID; DDFS feature defs reference them |
| Custom camera controller | Not supplied. Apps install their own Navigation component |
| FormulaType | `type FormulaType = string` — apps narrow via declaration merging |
| ShaderConfig | `Record<string, any>` with engine-level scalar fields — apps widen via declaration merging |

## Phase progress

### ✅ Phase 0 — Architecture baseline (2026-04-22, stages 14-15)
- Feature-residuals cleaned, SceneFormat.ts generic, default panel config genericized.
- Runtime boot verified; `debug/smoke-boot.mts` passes.
- `PanelId: string` + `AutoFeaturePanel` registered as `'auto-feature-panel'`.
- Demo add-on in `demo/` proves the three-step plugin contract end-to-end.
- Fragilities F1 (96a4b5f), F2 (96a4b5f), F3 (a4e7d6b), F4 (c6ee640) — all 🟢 Fixed.

### ✅ Phase 1 — Fractal-toy (2026-04-22, commits `4830a2c` … `b9d13f9`)
- `fractal-toy/` — minimal Mandelbulb playground: one formula, orbit+fly camera, directional light. Used `ShaderBuilder.addSection` as the escape hatch's first real load.

### ✅ Phase 2 — Viewport plugin (2026-04-22, `610b4e0` … `2f73612`)
- `@engine/viewport` (`engine/plugins/Viewport.tsx`) with GMT's production adaptive-quality loop ported and genericized.
- `<ViewportFrame>`, `<ViewportModeControls>`, `<FixedResolutionControls>`, `<AdaptiveResolutionBadge>` — shared plugin components.
- Immediate quality drop on interaction; `smoke:viewport` passes.

### ✅ Phase 3 — Toy-fluid port (2026-04-22, `4830a2c` … `205745a`)
- `fluid-toy/` — engine-native port of the reference `toy-fluid/`. FluidEngine mounts via `<ViewportFrame>` + `qualityFraction`; pointer→splat interaction layer; julia-c auto-orbit via modulation-style tick.
- `@engine/topbar` (`engine/plugins/TopBar.tsx`) — slot-based host + default items (ProjectName, FpsCounter).
- `@engine/scene-io` (`engine/plugins/SceneIO.tsx`) — Save + Load via topbar slot registration, delegates to `utils/SceneFormat.ts`.
- `<TimelineHost>` — shared animation-timeline chrome with GMT's 317-line TimelineToolbar ported as reusable engine chrome.

### ✅ Phase 4 — Input + undo + camera (2026-04-23, `8662447` … `2b8b6f9`)
- **4a** `engine/animation/modulationTick.ts` — canonical modulation tick; orbit refactored to register LFO animations via `setAnimations` instead of its own per-frame tick.
- **4b** `@engine/shortcuts` (`engine/plugins/Shortcuts.ts`) — scope-based keyboard dispatcher with priority resolution, text-input guard, rebinding hook.
- **4c** `@engine/undo` (`engine/plugins/Undo.tsx`) — unified transaction stack with scoped shortcuts (`Mod+Z` global, `Mod+Z` in `timeline-hover` scope routes to animation undo). Topbar Undo/Redo buttons. (F2b — 🟢 Fixed.)
- **4d** `@engine/camera` (`engine/plugins/Camera.ts`) — adapter-based slot plugin. Apps register a `CameraAdapter` with `captureState`/`applyState`; slots 1-9 save/recall via Ctrl+1..9 / 1..9. Preset round-trip via `camera/presetField.ts` side-effect module (F3 registry).

### ✅ Phase 5 — Animation plumbing (2026-04-23, commit `b82dc18`)
- `engine/animation/modulationTick.ts` now **delegates to GMT's AnimationSystem.tick** via `TickRegistry.ANIMATE`. No reinvention — same code path GMT uses, so keyframe playback, LFO modulation, audio-reactive rules, and resolved liveModulations all work identically.
- `engine/animation/cameraKeyRegistry.ts` — generic Key Cam track list. Default capture path-resolves scalar paths in DDFS store; apps override via `setCameraKeyCaptureFn`.
- `engine/AnimationEngine.ts` extended binder resolution: generic 3-part vec paths (`feature.param.x/y/z/w`) alongside GMT's legacy `vec[23][ABC]_axis` convention.
- `store/engineStore.ts` eagerly imports `animationStore` so `window.useAnimationStore` is set before `bindStoreToEngine()` runs → `animationEngine.connect(animStore, hostStore)` always succeeds.
- Both toys now mount `<EngineBridge />`, `<RenderLoopDriver />`, `<GlobalContextMenu />` from the GMT chrome — not reinvented, just mounted.

**Verified via `debug/smoke-anim-play.mts`:** playback advances frame 0 → 73.5 in 700ms; a 2-keyframe track on `julia.power` (2 → 6 over 30 frames) drives the bound param correctly.

### ✅ Phase 6 — GMT vertical slice (2026-04-24)

The "real confidence anchor" previously flagged in Remaining Work has landed: GMT runs end-to-end on the engine. **app-gmt/** boots the full worker renderer, compiles the Mandelbulb shader, renders with path tracing, and responds to Orbit/Fly navigation. All 26 GMT DDFS features + 42 formulas are registered. Key landmarks:

- **Renderer plugin** (`engine-gmt/renderer/`) — `installGmtRenderer` + `GmtRendererCanvas` (OffscreenCanvas + worker) + `GmtRendererTickDriver`.
- **Navigation ported verbatim** (`engine-gmt/navigation/`) — `GmtNavigation`, `useInputController`, `usePhysicsProbe`, `HudOverlay`. No logic edits, only path rewrites.
- **Store hydration via preset** — app-gmt's boot loads `registry.get('Mandelbulb').defaultPreset` through `loadScene()` so every DDFS slice is populated before the worker compiles. Without this the worker booted with a half-formed config and rendered black. Mirrors GMT's `useAppStartup` exactly.
- **Declaration-merged DDFS slices** (`engine-gmt/storeTypes.ts`) — `FeatureStateMap` augmented so the 18 GMT slices (coloring, lighting, geometry, …) typecheck on the root store without local copy-type drift.

### ✅ Panel manifest migration (2026-04-24)

Dock panels moved from "each feature declares its own tab" to "apps declare a PanelManifest". The old tabConfig path suited fluid-toy (9 features, 1:1 panels) but blocked the GMT port (26 features → 10 curated panels composing 2-9 features each). New model:

- **`engine/PanelManifest.ts`** — `PanelDefinition` type with `features[]` stacking, `component` path for bespoke panels (Graph/FlowEditor), `widgets.before/after/between` slotting, and `showIf` predicates (string path or function). See `docs/engine/14_Panel_Manifest.md`.
- **`applyPanelManifest(m)` + `addPanel(def)`** — merge-seed `state.panels`; dynamic additions (fractal-toy formulas) survive regardless of call order.
- **`PanelRouter` rewritten** — three render paths (bespoke component / feature stack with widgets / empty). No hardcoded Graph/CameraManager/Engine special-cases.
- **`Dock.tsx` filters via `evalShowIf`** — hardcoded `Graph if Modular` / `Light if advanced` / `Audio if enabled` / `Drawing if enabled` conditionals pulled out, now declared in each app's manifest.
- **Both docks now mount unconditionally** in AppGmt + FluidToyApp. Fixes the "julia disappears on left-dock drop" bug (panels moved to left had nowhere to render).
- **`FeatureTabConfig` reduced to `{label, iconId?, condition?}`** — `dock / order / componentId / defaultActive / aggregatesFrom` removed from 22 feature files and the type.
- **`applyDefaultPanelLayout.ts` + `featureRegistry.getTabs()` deleted** — no consumers.

App manifests:
- `engine-gmt/panels.ts` — 10 panels (Formula / Scene / Shader / Gradient / Quality / Light / Audio / Drawing / Graph / Engine).
- `fluid-toy/panels.ts` — 9 panels, 1:1 with features.
- `fractal-toy/panels.ts` — 2 static + formulas via `addPanel`.

### Known gaps after panel migration

(Most of these closed in the subsequent topbar / compile / camera / formula-picker passes — see below.)

### ✅ Topbar port — Passes 1-3 (2026-04-24)

- **Pass 1 (inline items + menus)**: Playing badge (left, pulsing green when animating), PT toggle (left, flips `renderMode` between Direct + PathTracing), **Camera menu** (Reset Position, Camera Manager stub, 9 slots with click-to-recall / save-on-empty), **System menu** (Advanced Mode, Invert Look Y, Hide Interface, Force Mobile UI, Formula Workshop stub), extended Menu plugin with `disabled?` on button/toggle items.
- **Pass 2 — Light Studio**: Ported `CenterHUD` verbatim — 3-orb collapsed / 8-light 3×3 expanded, shadow toggle + popup, light-gizmo toggle. Registered into the TopBar's `'center'` slot. LightControls / LightDirectionControl / ShadowControls / SingleLightGizmo were already in `engine-gmt/features/lighting/components/`.
- **Pass 3 — Viewport Quality**: Ported `ViewportQuality.tsx` verbatim (PT-aware per-subsystem tier controls + master preset + compile-time batching).
- **Scalability slice** — Ported `scalabilitySlice.ts` from gmt-0.8.5 to `store/slices/`. Root types already declared `scalability` + `hardwareProfile` but nothing initialised them, so ViewportQuality crashed until this landed.

### ✅ Compile pipeline + formula switching (2026-04-24)

- **`engineStore.setFormula` rewritten** to mirror GMT's full flow: clone defaultPreset → preserve compile-time engine params marked `onUpdate:'compile'` → honour `lockSceneOnSwitch` → `loadPreset` → `CONFIG_DONE` event → worker immediate compile.
- **`setFormulaPresetResolver(fn)`** — engine-core stays decoupled from any specific formula registry; apps register their own resolver (engine-gmt-based apps pull from `engine-gmt/engine/FractalRegistry`).
- **`FRACTAL_EVENTS.CONFIG_DONE`** — new generic event; `engine-gmt/renderer/GmtRendererTickDriver` bridges it to `proxy.post({type:'CONFIG_DONE'})` so the worker fires immediate compile without the 200ms scheduleCompile debounce.
- **CompilingIndicator** mounted in AppGmt — IS_COMPILING events (forwarded by WorkerProxy from the worker's FractalEngine) now drive a visible spinner.
- **PT toggle** flips `state.renderMode` (not `ptEnabled`) — the bindings.ts subscription forwards to `setLighting({ renderMode })`, which is the compile-triggering DDFS write GMT expects. `ptEnabled` stays always-on to avoid a second compile hop.

### ✅ Formula picker (2026-04-24)

- Ported GMT's `FormulaSelect` + `FormulaGallery` (full thumbnail-grid dropdown with category sections + type-to-filter + preview) + `FormulaContextMenu` into `engine-gmt/components/panels/formula/`. Registered as `'formula-select'` componentId and slotted via `widgets.before: ['formula-select']` on the Formula panel — matches GMT's layout exactly (picker at the top of the Formula panel, not in the topbar).
- Copied 42 formula thumbnails into `public/thumbnails/` so the gallery preview works.

### ✅ Camera round-trip (2026-04-24)

All three broken flows fixed:

- **Initial load**: after bootWithConfig, `proxy.setShadowOffset(precise)` + `proxy.post({type:'OFFSET_SET'})` so the worker's sceneOffset matches the hydrated preset from frame 1 (mirrors GMT's `useAppStartup`).
- **Formula switch / preset load**: `engineStore.loadPreset` emits both `CAMERA_TELEPORT` AND `OFFSET_SET` directly — Navigation warps the R3F camera, the OFFSET_SET bridge pushes sceneOffset to the worker.
- **Navigation movement**: app-gmt's `setSceneOffset` prop emits `OFFSET_SET` so orbit-absorb and fly-controller keep the worker offset in sync.
- **Reset Position** (Camera menu): restores the current formula's `defaultPreset.{cameraRot, sceneOffset, targetDistance}` via CAMERA_TELEPORT.
- **Preset fields**: `sceneOffset` and `cameraMode` added to `presetFieldRegistry` — save/load now preserves them.

### ✅ Widget registrations (2026-04-24)

- **ColoringHistogram** (per-layer, driven by HistogramProbe readbacks)
- **scene_widgets**: `OpticsControls`, `OpticsDofControls`, `NavigationControls`, `ColorGradingHistogram`
- **HybridAdvancedLock**, **JuliaRandomize**, **InteractionPicker** (Julia c / Mandelbrot c-param picker)
- **EnginePanel** (bespoke, registered as `'panel-engine'`) — surfaces compile-time feature toggles in its own layout. Visibility currently gated on `engineSettings.showEngineTab`; GMT exposes that toggle in the Advanced subsection of the System menu — not yet wired.
- **CameraManagerPanel** (bespoke, `'panel-cameramanager'`) — registered but the manifest entry + menu-button invocation are disabled until GMT's `cameraSlice` (addCamera / deleteCamera / savedCameras / undoCamera / redoCamera) gets ported.

### ✅ Interaction picker (2026-04-24)

- Ported `useInteractionManager` hook (focus picking + Julia picking with drag + lerp + record-keyframes) verbatim.
- Mounted in AppGmt with a `viewportRef` on the ViewportFrame's inner wrapper.
- Added `'picking_julia'` to root `InteractionMode` type (extraction drop).

### ✅ Menu plugin — live store subscription (2026-04-24)

- Menu plugin now subscribes to `useEngineStore` and bumps its notify rev on every store change, so toggle items' `isActive()` re-evaluates on each render. Previously the badge stayed stale until a menu-item re-registration. Advanced Mode badge flips correctly now.

### ✅ Post-phase-5 cleanup (2026-04-23 afternoon)

Everything flagged as "known gaps after Phase 5" has landed:

- **F12** 🟢 — UNDERSCORE vec binder in `AnimationEngine.getBinder` via shared `writeVecAxis` helper. Camera Key Cam + AutoFeaturePanel vec2/3/4 all line up on one convention. (commit `be62d7d`)
- **F13** 🟢 — GMT-specific target hijacks (`julia.*` / `coloring.*` / `geometry.*Rot`) in `AnimationSystem.tsx` gated on their slices. Generic DDFS vec + scalar fallback populates `liveModulations` without requiring a `uniform` declaration. (commit `be62d7d`)
- **trackBinding helper** extracted to `engine/animation/trackBinding.ts`. `deriveTrackBinding()` + `readLiveVec()` are the canonical track-ID derivation — AutoFeaturePanel's four branches all route through it. (commit `252060a`)
- **Canvas right-click menu** wired on fluid-toy (Copy Julia c / Pause / Orbit / Recenter / Reset). (commit `ae13ce2`)
- **Canvas pan + wheel + middle-drag zoom** in `FluidPointerLayer.tsx`. Right-drag pans, wheel zooms cursor-anchored, middle-drag zooms click-point-anchored. (commits `e518f47`, `bf1ba8d`)
- **Julia/Mandelbrot kind switch** as a DDFS enum param. (commit `3549d4e`)
- **Vec2 keyframe buttons** in AutoFeaturePanel (the missing `trackKeys` prop on Vector2Input). (commit `acb530c` — immediately superseded by the trackBinding refactor.)
- **Screenshot folded into scene-io** — standalone camera button + `Alt+S` hotkey + dropdown "Save PNG…" all route through one `saveCurrentPng` helper. `Ctrl+Shift+S` is browser-reserved, never reaches JS. (commit `a6795da`)

## Remaining work

### Active backlog

**Visual / features:**
- **Orbit-trap gradient mapping in GMT** — fluid-toy has richer trap-gradient coloring modes (multi-stop, radial, angular) that would benefit GMT renders. Port is a compile-permutation addition; benchmark FPS impact before enabling by default.
- **Fluid-toy polish** — gesture-mode switcher (brush/emitter/pick-c/pan-zoom), MandelbrotPicker overlay, ~34 DDFS params not yet ported (tone mapping, bloom, orbit-trap coloring, etc.).

**Structural integrity (low effort, low urgency):**
- **F14 remaining shims** — `RenderPipeline.ts`, `BezierMath.ts`, `BloomPass.ts`, `UniformNames.ts` are verbatim copies in engine-gmt with no GMT-specific content. Replace with one-line re-exports each. No state, no bugs, just drift risk.
- **Onboarding** — README describes the wrong product (fractal explorer, wrong port 5173 vs 3400). `demo/README.md` omits `registerFeatures.ts`. 18/28 smoke tests not wired into `package.json`. `package.json` `"name"` is `"gmt-fractal"`, `express` in wrong deps section.

### Deferred (no visible symptoms, cosmetic or architectural cleanup)
- **F5/F6** — camera binder cleanup. Functional via legacy path; clean fix is `@engine/camera` registering binders through `binderRegistry`.
- **F9** — `componentId` references not validated at registry freeze (dev-mode guard).
- **F8** — UI state undo (panel collapse, timeline scroll position).
- **F10/F11** — `formula` field rename to `mode` + `FractalEvents` → `EngineEvents` rename pass. One commit, cosmetic only. Bundle together.
- **F15** — Worker `_localOffset` guard-clear race. Flagged but no visible symptoms in normal use.

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -30          # full stage progression
npm run typecheck              # should exit 0
npm run dev                    # plain vite on localhost:3400

# Entry points:
#   http://localhost:3400/               — engine shell (demo add-on)
#   http://localhost:3400/fractal-toy.html — minimal Mandelbulb playground (phase 1)
#   http://localhost:3400/fluid-toy.html   — engine-native fluid toy port (phases 3-5)

# In another shell — smoke checks:
npm run smoke:boot             # headless boot, fail on pageerrors
npm run smoke:interact         # state-flow + save round-trip
npm run smoke:screenshot       # visual baseline → debug/scratch/engine-boot.png
npm run smoke:viewport         # adaptive-quality viewport plugin
# Direct:
npx tsx debug/smoke-anim-play.mts  # timeline playback (phase 5)
```

Note: the `dev` script is now plain `vite`. GMT's custom Express
`server/server.js` was removed in stage 16 — it ran Vite in
middleware mode without attaching HMR to the HTTP server, which
caused full-page reloads every 1-2s. Plain `vite` works out of
the box.

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the experiment turns out not to work: `rm -rf h:/GMT/gmt-engine`. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why clone-and-strip beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_gmt_engine_extraction.md` — pointer to this repo + HANDOFF.md

## Code review

`docs/engine/21_Code_Review_2026-04-25.md` — independent multi-agent source survey (2026-04-25). Records what matches the architecture docs, where docs overstate, three live bugs (F16–F18), and the full dual-tree inventory. Read before touching `engine/plugins/`, the dual-tree (`engine-gmt/engine/`), or the onboarding surfaces (README, demo, package.json).
