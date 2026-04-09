# GMT Development Changelog (v0.9.1 dev)

Chronological log of significant changes during the v0.9.1 development cycle (uncommitted on `dev` branch).

## 2026-04-09

### Tutorial Hints — Contextual Whisper System
- **Behavior-adaptive hints**: 32 contextual tips that surface in the HUD based on user activity — tracks panels opened, parameters changed, formulas switched, snapshots taken, and session age
- **Progressive disclosure**: Hints are prioritized and gated by preconditions (e.g. "discover panels" only fires if the user hasn't opened any yet; "path tracing" only after advanced mode + lighting engagement)
- **Persistence**: Behavioral profile and show counts persist to localStorage; hints respect `maxShows` limits and cooldowns to avoid repetition
- **Smooth transitions**: `HintDisplay` component fades between hints; falls back to static navigation cheat-sheet when no contextual hint is active
- **Dismiss to advance**: Clicking a hint skips to the next eligible one; dismissed hints are excluded from the current rotation cycle
- **Help integration**: Hints with `helpTopicId` show a "?" button that opens the relevant help topic
- **Reset Tips**: New button in System Menu clears all hint history and behavioral profile via `getResetHintsFn()` module-level ref
- Files: `data/tutorialHints.ts` (NEW), `hooks/useTutorialHints.ts` (NEW), `components/tutorial/HintDisplay.tsx` (NEW), `App.tsx`, `components/ViewportArea.tsx`, `components/HudOverlay.tsx`, `components/topbar/SystemMenu.tsx`

### HUD Overlay — Split Fade Timing
- **Two-layer fade**: Crosshair fades after 2s of inactivity (unchanged), bottom pill cluster (speed, distance, hints, reset button) now stays visible for 10s before fading
- **Independent refs**: `crosshairFadeTimeout` and `bottomFadeTimeout` replace the single `fadeTimeout`; `bottomClusterRef` wraps the bottom section as a separate opacity target
- Files: `components/HudOverlay.tsx`

### ScalarInput — Custom Track Interaction
- **Replaced `<input type="range">`** with pointer-capture drag system for consistent cross-browser behavior
- **Click-to-set**: Clicking anywhere on the track jumps to that value immediately, then transitions to drag mode
- **Precision modifiers**: Hold Shift for 10× speed, Alt for 0.1× precision — modifier changes mid-drag re-anchor correctly
- **Custom thumb**: `data-role="thumb"` element with `cursor-ew-resize` replaces browser-native slider thumb
- Files: `components/inputs/ScalarInput.tsx`

### Quality Panel — Grouped Raymarching Controls
- **Whitelist-based grouping**: Raymarching section now uses `whitelistParams` to show controls in logical groups: Max Ray Steps | Step tuning (fudge, relaxation, jitter) | Detail & threshold | Distance metric & estimator
- **Max Steps always visible**: Removed `isAdvanced: true` from `maxSteps` param — now shown in all modes
- Files: `components/panels/QualityPanel.tsx`, `features/quality.ts`

### Hard Cap Constants
- **Extracted magic numbers**: `DEFAULT_HARD_CAP` (2000) and `MOBILE_HARD_CAP` (256) defined in `data/constants.ts`, replacing scattered `500`/`2000`/`256` literals across engine, store, and UI code
- Files: `data/constants.ts`, `engine/FractalEngine.ts`, `engine/HardwareDetection.ts`, `engine/managers/ConfigManager.ts`, `features/quality.ts`, `store/fractalStore.ts`, `components/panels/HardwarePreferences.tsx`

## 2026-04-08

### Mesh Export — Preview Camera Overhaul
- **Pan support**: Right-click or middle-click drag pans the view in both SDF and mesh preview modes
- **Camera preset toolbar**: Bottom-bar buttons for Front/Back/Left/Right/Top/Bottom views plus Center (reset pan)
- **Controls hint overlay**: Shows "LMB orbit · RMB pan · Scroll zoom · Shift snap" below the toolbar
- **Mesh preview pan**: Right-click/middle-click pans the wireframe preview; camera presets sync to mesh rotation
- **Preview reset on re-generate**: Clicking Generate now clears the previous mesh result, switching back to slice preview mode instead of staying stuck on the old mesh wireframe

### Mesh Export — VDB Color Grids
- **Optional Cd vec3s grid**: "Include color grids" checkbox in the export panel (off by default for performance)
- **GPU orbit-trap color sampling**: After SDF pass, walks all active density voxels, packs positions into a texture, runs the color shader, and builds a `Vec3VDBTree`
- **Standard OpenVDB format**: Color exported as a single `Cd` grid with type `Tree_vec3s_5_4_3` — loads natively in Houdini, Blender, and other VDB-compatible tools
- **Multi-grid interleaved layout**: Descriptor + offsets + data written per grid (not batched), matching the OpenVDB spec
- **vec3s tree writer**: New `Vec3LeafNode`, `Vec3Node4`, `Vec3VDBTree` types with `addVec3LeafBlock()`, `optimizeVec3Tree()`, and `_writeVec3Tree()` serializer (12-byte Vec3f background, `u8(6)` compression enum, 3×float32 per voxel)
- **VDB filenames**: Now include resolution, content tag (`-density` or `-density-color`), and timestamp

### Mesh Export — Preview Fixes
- **Missing uniform locations**: Quality uniforms (`uFudgeFactor`, `uDetail`, `uPixelThreshold`) and bounds uniforms (`uClipBounds`, `uBoundsMin`, `uBoundsMax`) were declared in the shader and set each frame, but their locations were never looked up — WebGL silently returned null, so all quality sliders had no effect
- **Quality slider labels**: Changed from `variant="compact"` (no label) to `variant="full"` so Surface Threshold, Fudge Factor, Ray Detail, and Pixel Threshold are visible with labels
- **Quality changes now trigger re-render**: `_qualitySettings` was subscribed but missing from the `useEffect` dependency array that calls `requestRender()`
- **Ortho fudge compensation**: Preview applies 0.75× multiplier on fudge factor to compensate for orthographic ray overshooting (parallel rays are more prone to missing thin features than perspective rays)

### Mesh Export — Shader Cache-Busting
- `Date.now()` timestamp comment embedded in generated SDF, color, and preview GLSL source to prevent stale browser/driver shader caches

## 2026-03-27

### Bucket Renderer Fixes

- **Scissor-based compositing** replaces shader UV discard for tile compositing. Each bucket stores integer pixel bounds (`pixelX/pixelY/pixelW/pixelH`); compositing uses `gl.setScissor()` for pixel-perfect boundaries. Eliminates 1px black stripe artifacts between adjacent tiles caused by float precision mismatch between render and composite shader `vUv` computations.
- **Half-pixel render region expansion**: `uRegionMin`/`uRegionMax` are padded by 0.5px in UV space so boundary pixels are always rendered. The scissor rect clips precisely.
- **State lock during bucket render**: Three-layer protection prevents mid-render corruption: (1) worker message filter drops all messages except `BUCKET_STOP`/`RENDER_TICK`, (2) main thread sets `isExporting=true` to lock camera/UI via `selectMovementLock`, (3) WorkerDisplay ResizeObserver skips during `isBucketRendering`.
- **Accurate size estimation**: New `canvasPixelSize` store field tracked by WorkerDisplay ResizeObserver. In Fixed resolution mode, UI components use `fixedResolution * dpr` directly instead of relying on observer timing. Fixes wrong output size shown in bucket render panel and video export time estimation.
- **Popover stays open**: Bucket render controls popover no longer closes on outside click while rendering.

### Viewport Quality System

- **New per-subsystem scalability system** replaces the old flat ENGINE_PROFILES approach. The store always holds the user's full-quality authored intent; a per-subsystem tier overlay controls what actually compiles. Switching viewport quality writes tier overrides to the store via DDFS feature setters — the existing CONFIG pipeline handles recompilation automatically.
- **Four rendering subsystems** with ordered quality tiers: Shadows (Off/Hard/Soft/Full), Reflections (Off/Env Map/Raymarched/Full), Lighting (Preview/Path Traced/PT+NEE), Atmosphere (Off/Fast Glow/Color Glow/Volumetric). Each tier defines a sparse override map of feature params.
- **Six master presets**: Preview (instant compile, no advanced lighting), Fastest, Lite, Balanced (default), Full, Ultra. Ultra and the Lighting subsystem are advanced-mode only.
- **Top-bar ViewportQuality dropdown** with master preset selection, per-subsystem tier dropdowns, compile time estimates, and Apply button for batched recompilation. PT-aware: when path tracer is active, direct-render subsystems (Shadows, Reflections) dim, and a purple Path Tracer section appears with editable controls for Max Bounces (runtime slider), GI Strength (runtime slider), Sample All Lights (compile toggle), and Environment NEE (compile toggle).
- **Hardware detection** at boot via `detectHardwareProfileMainThread()` — probes Float32 render target support, mobile detection via pointer/viewport heuristics, GPU renderer string analysis. Sets hardware caps (precision, buffer format, loop cap) that are applied as a ceiling in `getShaderConfigFromState()` Stage 3.
- **Hardware Preferences modal** accessible from System Menu — lets users override detected precision, buffer format, and hard loop cap. Renders via `createPortal` to `document.body` for correct stacking context.
- **Engine Panel moved to advanced mode.** The toggle is now inside the Advanced Mode section of the System Menu. The old ENGINE_PROFILES dropdown has been removed from SystemMenu.
- **Quality feature hardware params hidden** (`precisionMode`, `bufferPrecision`, `compilerHardCap`) — marked `hidden: true` in DDFS, managed by Hardware Preferences modal instead of Engine Panel.
- **Three-layer config pipeline**: Stage 1 (authored state) → Stage 2 (subsystem tier overrides, written directly to store) → Stage 3 (hardware caps, applied as overlay in `getShaderConfigFromState()`).
- **TSS toggle removed** from top bar and Quality panel. Accumulation is always on — the toggle was not wired to anything useful and confused users.
- **Top bar layout reorganized**: FPS counter → Pause button → divider → Viewport Quality dropdown → Path Tracer toggle. Previously the PT toggle was separated from the quality controls.
- **Preview preset** shows "lighting disabled" inline label and has corrected compile time estimate (~2s instead of ~4s).
- Files: `types/viewport.ts` (NEW), `store/slices/scalabilitySlice.ts` (NEW), `engine/HardwareDetection.ts` (NEW), `components/topbar/ViewportQuality.tsx` (NEW), `components/panels/HardwarePreferences.tsx` (NEW), `store/fractalStore.ts`, `types/store.ts`, `components/topbar/RenderTools.tsx`, `components/topbar/SystemMenu.tsx`, `components/panels/EnginePanel.tsx`, `components/panels/QualityPanel.tsx`, `features/quality.ts`, `hooks/useAppStartup.ts`

## 2026-03-21

### GMF as Primary Save Format

- **GMF replaces JSON for all scene saves.** System Menu "Save Scene" now produces `.gmf` files containing formula shader code + full scene state (camera, lighting, features, animations). JSON is retained for backward-compatible loading only.
- **PNG metadata now embeds GMF** instead of JSON. Snapshots and bucket renders embed the full GMF string, so imported/custom formulas survive PNG roundtrips.
- **Formula-only GMF loading improved.** FormulaGallery and FormulaSelect now use `loadGMFScene()` with full scene preset application (camera, features) instead of formula-switch-only.
- **URL sharing disabled for imported formulas.** Share button shows "N/A (Imported)" tooltip for Workshop-imported formulas (shader code too large for URL).
- **Legacy support preserved.** Old `.json` presets, old formula-only `.gmf` files, and old PNGs with JSON metadata all load correctly.
- **Worker registration.** Loading a GMF with an unknown formula now emits `REGISTER_FORMULA` to sync the worker thread's registry.
- **GMF API docs updated.** The embedded shader API reference now documents vec2/3/4 params, distance metrics, and rotation helpers.
- Files: `utils/FormulaFormat.ts`, `components/topbar/SystemMenu.tsx`, `components/topbar/CameraTools.tsx`, `components/LoadingScreen.tsx`, `components/panels/formula/FormulaGallery.tsx`, `components/panels/formula/FormulaSelect.tsx`, `engine/BucketRenderer.ts`, `engine/worker/WorkerProxy.ts`, `store/fractalStore.ts`

### Bucket Rendering: Offline Post-Processing & SSAA

- **Offline post-processing pipeline:** Each bucket accumulates raw linear HDR without tone mapping or bloom. After all buckets complete, the full post-processing chain (Bloom → Chromatic Aberration → Color Grading → Tone Mapping) runs once on the composited image. Ensures spatial effects work correctly across the full image rather than per-bucket.
- **SSAA pixelSizeBase override:** During supersampled bucket renders (upscale > 1×), `FractalEngine` overrides `uPixelSizeBase` each frame to keep trace precision, normals, and shadow computation at viewport resolution. Prevents double-precision artifacts from inflated render targets.
- **Center-first spiral bucket order:** Buckets now render in a spiral from the center outward instead of bottom-left to top-right, giving faster visual feedback on the important region.
- **Bucket-aware frame count:** During bucket rendering, `uFrameCount` uses per-bucket `accumulationCount` for deterministic R2 noise sequences. `resetAccumulation()` is skipped during bucket rendering (managed by BucketRenderer).
- Files: `engine/BucketRenderer.ts`, `engine/FractalEngine.ts`, `engine/RenderPipeline.ts`

### Async Convergence Measurement

- **GPU fence-based readback:** New `startAsyncConvergence()` method renders the convergence diff pass and inserts a GL sync fence. `pollConvergenceResult()` checks fence status without blocking the GPU pipeline. Cached `lastConvergenceResult` returned on subsequent frames.
- **Dynamic convergence target sizing:** Convergence render target now resizes to match the measured region's actual pixel dimensions (capped at 256×256). Previously hardcoded at 64×64, which sampled only ~0.2% of a 1080p viewport. Both bucket rendering and viewport convergence benefit.
- **Viewport convergence polling:** `RenderPipeline.render()` now runs periodic async convergence measurement every 8 frames during normal accumulation. Reads active render region from `uRegionMin`/`uRegionMax` uniforms. Skipped during bucket rendering. Result exposed via `WorkerShadowState.convergenceValue`.
- **Default convergence threshold** changed from 0.1% to 0.25%.
- **Legacy path preserved:** `measureConvergence()` kept for non-bucket paths where synchronous readback is acceptable.
- Files: `engine/RenderPipeline.ts`, `engine/BucketRenderer.ts`, `engine/worker/WorkerProtocol.ts`, `engine/worker/WorkerProxy.ts`, `engine/worker/renderWorker.ts`

### Region Rendering Overhaul

- **Region overlay with live stats:** New `RegionOverlay` component in `ViewportArea.tsx` shows pixel dimensions, live sample count, click-to-cycle sample cap, live convergence value vs threshold, and clear button. Replaces the old minimal "Active Region" label.
- **Resize handles:** 8 directional handles (`n/s/e/w/ne/nw/se/sw`) with `data-handle` attributes, visible on hover. Previously the hook checked for handles but no DOM elements existed.
- **Draw preview:** Region is now visible while drawing (dashed cyan border) via `drawPreview` from `useRegionSelection`. Previously the overlay was hidden during the selection phase (`!isSelectingRegion` guard).
- **Sample cap boot sync:** `sampleCap` is now re-sent to the worker in the `onBooted` callback, fixing a race where the initial `SET_SAMPLE_CAP` message arrived before the worker engine existed, leaving the pipeline at infinite samples.
- Files: `components/ViewportArea.tsx`, `hooks/useRegionSelection.ts`, `store/fractalStore.ts`

### Formula Library & Runtime Discovery

- **`public/formulas/` directory:** Runtime formula library with `manifest.json`, `dec.json` (316 DEC formulas), and 178 passing `.frag` files organized by author folder.
- **Build pipeline:** `build-formula-manifest.mts` generates the manifest; `build-passing-lists.mts` generates `passing-formulas.ts` from validator JSONL results.
- **`formula-library.ts`:** Curated registry with category inference, author attribution, and random formula picker. Used by FormulaGallery and Workshop "Random" buttons.
- **Shader validator:** `debug/shader-validator.mts` — live GLSL + WebGL GPU validation tool with web dashboard. Tests all frag + DEC sources through the V3 pipeline with an ENGINE_SCAFFOLD mirroring the real GMT shader context. Results: 238/271 frag GLSL pass, 316/333 DEC pass, 181 WebGL GPU verified.
- Files: `features/fragmentarium_import/formula-library.ts`, `features/fragmentarium_import/passing-formulas.ts`, `features/fragmentarium_import/random-formulas.ts`, `public/formulas/`, `debug/shader-validator.mts`, `debug/build-formula-manifest.mts`, `debug/build-passing-lists.mts`

### Frag Importer V3 Rewrite (V2 Removed)

- **V3 pipeline:** New `features/fragmentarium_import/v3/` with `analyze/` (globals, params, preprocess, functions, init) and `generate/` (full-de, get-dist, init, loop-body, patterns, rename, slots, uniforms) modules.
- **V3 improvements:** HLSL alias handling, multi-line global declarations, literal inits at file scope, engine function collision rename, deterministic slot assignment, scalar DR accumulator detection, for-loop increment extraction, paren-aware comma splitting.
- **V2 removed:** Deleted `ast-parser.ts`, `uniform-parser.ts`, `code-generator.ts`, `init-generator.ts`, `loop-extractor.ts`, `pattern-detector.ts`, `detection.ts`, `preview.ts`. V3 compat adapter (`v3/compat.ts`) bridges to the Workshop.
- **Test suites:** `test-frag-integration.mts` (full pipeline), `test-frag-v3-analysis.mts`, `test-frag-v3-generation.mts`, `test-dec-formulas.mts` (339 DEC functions).
- Files: `features/fragmentarium_import/v3/`, `features/fragmentarium_import/types.ts`, `features/fragmentarium_import/index.ts`, `features/fragmentarium_import/transform/variable-renamer.ts`, `debug/test-frag-*.mts`

### UI Component Library

- **`CategoryPickerMenu.tsx`:** Generic two-column portal dropdown with viewport-aware positioning (smart flipping, spillover handling). Supports categorized items with disabled/selected states. Used by ParameterSelector and LFO target picker.
- **`DynamicList.tsx`:** Reusable list component family (container, item, group, search) with accent theme system (cyan/purple/amber). Used by LfoList.
- **`data/theme.ts`:** Centralized semantic theme tokens for Tailwind classes — accent, secondary, warning, danger, surface, text, borders. Composite tokens for common patterns (tabActive, nestedContainer, etc.). Enables single-file theme changes.
- **ParameterSelector refactor:** Extracted `buildCategories()` helper, uses CategoryPickerMenu, proper feature ordering (priority list then alphabetical), `MAX_LIGHTS` instead of hardcoded 3.
- **LfoList refactor:** Converted to DynamicList + DynamicListItem with purple accent. Declarative layout replaces manual div nesting.
- Files: `components/CategoryPickerMenu.tsx`, `components/DynamicList.tsx`, `data/theme.ts`, `components/ParameterSelector.tsx`, `components/panels/formula/LfoList.tsx`

### Drawing Overlay Projection Refactor

- **`OverlayProjection.ts`:** Shared 3D→2D projection utilities for overlays (light gizmos, drawing tools). Pre-allocated temp vectors eliminate per-frame GC pressure. Consistent behind-camera culling, view-depth calculation, screen coordinate safety clamping.
- **DrawingOverlay.tsx:** Refactored to use centralized projection via `getOverlayViewport`, `projectWorldToXY`, `preciseToWorld`. Removed duplicated projection math and per-frame Vector3/Quaternion allocations.
- Files: `engine/overlay/OverlayProjection.ts`, `features/drawing/DrawingOverlay.tsx`

### Misc Cleanup

- **Deleted stray files:** `LICENSE.txt` (GPL-3.0 defined in package.json), `googlef57afa274804ba8c.html` (Google verification), `debug/trace-dec.mts` (replaced by test-dec-formulas.mts).
- **Theme token integration:** `CollapsibleSection`, `SectionLabel`, `ToggleSwitch`, `Icons`, `LoadingScreen`, `GradientContextMenu` updated to use `data/theme.ts` tokens.
- **GizmoMath refactor:** Consolidated gizmo math utilities in `features/lighting/utils/GizmoMath.ts`.
- **Legacy preset support:** `fractalStore.ts` now registers embedded `_formulaDef` from old JSON presets into the runtime formula registry.
- **ReSTIR GI prototype:** `prototype/restir-gi/` — WIP global illumination prototype (not integrated).

## 2026-03-20

### Formula Workshop Cleanup & Degree/Radian Fix

- **Degree/radian bug fixed:** `param-builder.ts` was converting isDegrees params to radians (dividing by π), but Fragmentarium GLSL expects degrees. Introduced `scale: 'degrees'` mode — keeps internal values in degrees, displays π notation in UI (`360° → "2.00π"`). Distinct from DDFS `scale: 'pi'` where internal values are radians.
- **Workshop UI touchup:** Toolbar (Browse Library, Random Frag, Random DEC, Load File) moved outside source section so buttons are always visible. Source editor now resizable via drag handle (100–800px). Preview button restored (was defined but missing from JSX — regression).
- **Workshop code cleanup:** Extracted `runTransform()` helper deduplicating 3× V3→V2 fallback patterns. Extracted `ParamTable` component with memoized grouping. All handlers wrapped in `useCallback`. Removed debug console.logs and dead code.
- **formula-library.ts cleanup:** Imports moved to top, regex fix (`2\.0?` → `2(?:\.0)?`), array spread optimization in `inferDECCategory`.
- **FormulaPanel degrees scale:** New `scale: 'degrees'` handler with `customMapping` (toSlider/fromSlider using 1/180 factor) and `overrideInputText` for π display.
- Files: `features/fragmentarium_import/FormulaWorkshop.tsx`, `features/fragmentarium_import/workshop/param-builder.ts`, `components/panels/FormulaPanel.tsx`, `features/fragmentarium_import/formula-library.ts`, `components/vector-input/types.ts`

### Canvas Resolution Fix on Initial Load

- **Physical pixel mismatch:** `setupEngine()` in `renderWorker.ts` was setting `uResolution` and `pipeline.resize()` with CSS pixels instead of physical pixels (CSS × DPR). The bloom pass already used the correct `initPhysW`/`initPhysH` values — now the pipeline and uniforms do too.
- **Stale closure in post-compile resize:** `WorkerTickScene`'s `checkReady` effect captured `size` and `dpr` at mount time (empty deps `[]`). During the long async shader compilation, the viewport could change (layout shifts, dock panels). The post-compile re-push then overwrote correct dimensions with stale values. Fixed by tracking the latest size in a `useRef`.
- Files: `engine/worker/renderWorker.ts`, `components/WorkerTickScene.tsx`

### Distance Probe Sky Threshold & Cleanup

- **Sky threshold capped at 10.0:** Depth values ≥ 10 are now treated as sky hits (was 1000). Prevents navigation speed explosions when looking at open space.
- **Sky fallback behavior:** When looking at sky with no prior valid measurement, defaults to DST 1.0. When a valid measurement exists, keeps it unchanged. HUD shows `DST X.XXXX (sky)` instead of `DST INF`.
- **Consistent threshold:** Updated in `usePhysicsProbe.ts`, `WorkerDepthReadback.ts`, and `WorkerExporter.ts`.
- **usePhysicsProbe cleanup:** Removed unused imports (`useEffect`, `THREE`), unused refs (`camera`, `shaderCompiledRef`, `depthBuffer`), dead `distMinRef` (always mirrored `distAverageRef`, never consumed). Extracted HUD helpers (`formatDist`, `updateDistHud`, `updateResetButton`, `updateSpeedHud`). ~247 → ~160 lines.
- Files: `hooks/usePhysicsProbe.ts`, `engine/worker/WorkerDepthReadback.ts`, `engine/worker/WorkerExporter.ts`

### Instant Drag Feedback (Direct DOM Updates)

- **DraggableNumber instant display:** During drag, the display text is updated via direct DOM manipulation (`displayRef.textContent`) on every pointer move, bypassing the React render cycle. The `onImmediateChange` callback propagates the raw value to the parent for fill bar updates.
- **ScalarInput fill bar sync:** Fill bars (`fillBarRef`, `fullTrackFillRef`) and range input track are updated synchronously during drag via `handleImmediateChange`. Uses refs attached to the compact fill bar (`data-role="fill"`) and full track bar.
- **BaseVectorInput `pushAxisToDOM`:** For DualAxisPad drag, linked-mode drag, direction mode, and rotation heliotrope — where the drag source isn't the DraggableNumber itself — BaseVectorInput queries the container (`sliderRowRef`) for axis cells by `data-axis-index` attribute, then updates `[data-role="value"]` text and `[data-role="fill"]` width directly.
- **`computePercentage` utility:** Extracted to `FormatUtils.ts` — shared percentage calculation (value → 0-100% with optional mapping) used by both ScalarInput and BaseVectorInput's DOM push.
- **`useDragValue` hook:** Now exposes `immediateValueRef` (a ref updated synchronously during drag) so DraggableNumber can read the latest value without waiting for React state.
- **Type fix:** Added `vec4A/B/C` to `FractalParameter.id` union and `'vec4'` to `type` union in `types/fractal.ts`.
- Files: `components/inputs/primitives/DraggableNumber.tsx`, `components/inputs/ScalarInput.tsx`, `components/inputs/hooks/useDragValue.ts`, `components/vector-input/BaseVectorInput.tsx`, `components/vector-input/VectorAxisCell.tsx`, `components/inputs/primitives/FormatUtils.ts`, `types/fractal.ts`

## 2026-03-19

### Vec4 Input Support

- **Vector input components now support vec4 (XYZW):** Both `BaseVectorInput` (THREE.Vector4) and `VectorInput` (plain object `{x,y,z,w}`) detect a W component and render a fourth axis.
- **W axis styling:** Purple (`#a855f7`) following the X=red, Y=green, Z=blue convention. Added to `AXIS_CONFIG` in both type files.
- **WZ dual axis pad:** Draggable 2D pad between Z and W sliders for simultaneous manipulation.
- **`Vector4Input` connected component:** Full animation/keyframe support matching `Vector2Input`/`Vector3Input` pattern.
- **AutoFeaturePanel `vec4` case:** Features declaring `type: 'vec4'` params in DDFS now auto-render with 4 axes, track keys, and `composeFrom` decomposition.
- **Type updates:** `VectorInputProps`, `BaseVectorInputProps`, axis bounds/mapping/update functions, toggle mode, and linked mode all extended to accept `'w'` axis.
- Files: `components/inputs/types.ts`, `components/inputs/VectorInput.tsx`, `components/vector-input/types.ts`, `components/vector-input/BaseVectorInput.tsx`, `components/vector-input/index.tsx`, `components/AutoFeaturePanel.tsx`

## 2026-03-17

### Area Lights Compile/Runtime Split

- **Two-level control:** `ptStochasticShadows` (compile-time, `onUpdate: 'compile'`) gates stochastic shadow code generation. `areaLights` (runtime, `uAreaLights` uniform) toggles stochastic path at runtime.
- **Defaults:** Compiled on init (`ptStochasticShadows: true`), but turned off (`areaLights: false`). Balanced preset enables both; Lite disables compile.
- **UI:** Runtime "Area" toggle button in shadow popup (top bar), hidden when not compiled. Compile toggle in Engine panel.
- **Removed:** Area lights switch from Quality panel (now controlled by compile toggle + runtime toggle).
- Files: `features/lighting/index.ts`, `features/lighting/components/ShadowControls.tsx`, `features/engine/profiles.ts`, `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/pathtracer.ts`, `shaders/chunks/ray.ts`, `components/panels/QualityPanel.tsx`

### CompilableFeatureSection Component

- **New reusable component** (`components/CompilableFeatureSection.tsx`): DDFS-driven UI for features with compile/runtime split. Reads `panelConfig` from feature registry or accepts explicit props.
- **Pattern:** Runtime toggle (instant on/off) + compile gate (shader rebuild) + compile settings sub-section + runtime params. Status dots (active/pending). Compile bar with Compile button + engine icon button.
- **Engine queue integration:** Engine icon opens Engine panel and queues compile flag + any pending compile settings via `engine_queue` event pattern.
- **`panelConfig` added to `FeatureDefinition`:** Declarative UI configuration for compilable sections.
- **Applied to:** Volumetric Scatter (via `panelConfig`), Hybrid Box Fold (via explicit props).
- Files: `components/CompilableFeatureSection.tsx`, `engine/FeatureSystem.ts`, `features/volumetric/index.ts`, `components/panels/ScenePanel.tsx`, `components/panels/FormulaPanel.tsx`

### DDFS Overhaul (P1-P2)

- **P1 — ShaderBuilder assembly order:** Added comprehensive assembly order comment block (positions 1-17) and JSDoc comments on all injection API methods with scope variables and usage examples.
- **P2 — Named params:** `setDistOverride()` now takes a named object (`init`, `inLoopFull`, `inLoopGeom`, `postFull`, `postGeom`). `addVolumeTracing(marchCode, finalizeCode)` and `addHybridFold(init, preLoop, inLoop)` use named params. Internal field names updated to match.
- **P3 — Accumulative hooks:** `addPostMapCode()` and `addPostDistCode()` added for accumulative injection inside `map()`/`mapDist()`.
- **P4 — Water plane extraction:** All water-specific code removed from `de.ts` and `material_eval.ts`. Water feature now injects via `addPostMapCode`, `addPostDistCode`, `addMaterialLogic`, and `addDefine`.
- Files: `engine/ShaderBuilder.ts`, `features/core_math.ts`, `features/volumetric/index.ts`, `features/geometry/index.ts`, `features/water_plane.ts`, `shaders/chunks/de.ts`, `shaders/chunks/material_eval.ts`

## 2026-03-16

### Unified Camera Coordinate System

**Architecture:**
- **Canonical camera state:** `cameraPos` has been removed from the store entirely — it was always `(0,0,0)`. All world position lives in `sceneOffset` (high-precision `PreciseVector3`). The field remains in the `Preset` type for backwards-compatible serialization; `applyPresetState()` absorbs it into `sceneOffset` on load. Navigation's debounced store write normalizes by folding `camera.position` into `sceneOffset` after every interaction.
- **`targetDistance` unified:** Always means physics-based surface distance (from raymarching probe), never orbit radius. Removed the orbit-mode override that wrote `camera.position.length()` to `targetDistance`.
- **`isOrbit` removed from VirtualSpace:** `updateSmoothing()` in `PrecisionMath.ts` no longer takes an `isOrbit` parameter. Both modes use the same lerp-based smoothing path. Removed from `FractalEngine.ts` call site as well.
- **Shadow unified offset:** Navigation computes `sceneOffset + camera.position` every frame as a shadow ref, so canonical world position is always available for reads regardless of orbit interaction state.
- **`initOrbitPivot()` helper:** Unified orbit setup used on initial load, mode switch, camera unlock, teleport, and animation stop. Sets orbit target at `camera.position + forward * surfaceDistance` without manipulating `sceneOffset` (avoids `OFFSET_SET` to worker which resets accumulation).
- **Mode-agnostic engine:** `cameraMode` in `renderState` is informational only (HUD display). Zero engine-level branching on camera mode in VirtualSpace, FractalEngine, renderWorker, animation, camera manager, or preset system.
- **Simplified mode switching:** `absorbOrbitPosition()` folds residual orbit position into offset on Orbit→Fly switch. Fly→Orbit just calls `initOrbitPivot()`. Removed `syncOrbitTargetToCamera()` and forced OrbitControls remount (`orbitControlsKey`).
- **Mode-agnostic `useInteractionManager`:** Light drag position absorption now checks `cam.position.lengthSq() > 1e-8` instead of `state.cameraMode === 'Fly'`.

**Impact:**
- Animation timeline, camera manager, preset system, and undo/redo no longer need to know about Orbit vs Fly mode.
- Camera saves from Orbit mode load correctly in Fly mode (and vice versa) with consistent surface distance.
- No visual jumps or accumulation resets during orbit interactions.

- Files: `components/Navigation.tsx`, `engine/PrecisionMath.ts`, `engine/FractalEngine.ts`, `hooks/useInteractionManager.ts`, `types/common.ts`

### Camera Manager Overhaul

**New features:**
- **Drag-to-reorder:** Saved cameras can be reordered via drag handles in the camera list.
- **Update camera button:** Active cameras show an amber overwrite button when the view has drifted from the saved state, with a `*` modified indicator.
- **Smooth transitions:** Switching between saved cameras now lerps position (smoothstep) and slerps rotation over 0.5s. User input cancels the transition instantly.
- **Thumbnails:** New cameras auto-capture a 128x128 thumbnail from the current render. Displayed in the camera list for visual identification.
- **Duplicate camera:** Copy button clones a saved camera with all state (position, rotation, optics) and "(copy)" suffix.
- **Keyboard shortcuts:** `Ctrl+1` through `Ctrl+9` instantly switch to saved camera slots 1-9. Shortcut hints shown in the camera list.
- **Unified position display:** Collapsible section showing live XYZ position and rotation in unified coordinates (high-precision).
- **Export/Import cameras:** Export saved cameras as JSON, import from file. Cameras are also persisted in presets and PNG snapshot metadata.
- **Frame fractal button:** Auto-adjusts camera distance based on the physics probe's distance estimate for comfortable framing.
- **Delete confirmation:** Delete now requires a second click within 3s to confirm, preventing accidental camera loss.

**Store fixes:**
- **Undo stack cap:** Camera undo/redo stacks now capped at 50 entries (was unbounded).
- **Clear undo on formula change:** Camera undo/redo stacks cleared when switching formulas (old positions are meaningless for new fractals).
- **Typed optics accessor:** Replaced `as any` casts for `setOptics` with a typed helper function `getSetOptics()` in cameraSlice.

**Architecture:**
- New `camera_transition` event in FractalEvents for smooth animated camera moves (distinct from instant `camera_teleport`).
- `duplicateCamera` and `reorderCameras` actions added to cameraSlice and FractalActions interface.
- `savedCameras` field added to `Preset` type — cameras now persist in presets, share strings, and PNG snapshots.

### Gradient Editor Improvements

**Bug fixes:**
- **Step interpolation mismatch:** GPU texture generation used `t < 0.5 ? 0 : 1` (midpoint switch) while the CSS preview held the left color until the boundary. Texture now uses `t = 0` to match the preview — step mode holds each stop's color for its full segment.
- **Histogram phase preview broken:** `backgroundPosition: ${phase * 100}%` used CSS percentage semantics (relative to `container - tile`) which gives zero shift for `repeats=1` and wrong values for all other repeat counts. Replaced with a clipped inner div using `translateX` for correct phase visualization at all repeat values.
- **Undo flooding on gradient sliders:** Position and Bias sliders called `handleInteractionStart`/`End` on every onChange tick, but the Slider component already manages its own drag lifecycle snapshots. Removed the redundant wrapping so only one undo snapshot is created per drag operation.

**UX:**
- **Gradient section padding:** Added horizontal padding so edge knot handles and drag selections aren't clipped.
- **Step-aware knot creation:** Clicking to add a knot in a Step segment now inherits the held color instead of interpolating.
- **Ctrl+Drag to duplicate:** Ctrl+drag a knot handle or the multi-selection drag area to duplicate knots.
- **Multi-selection redesign:** Replaced the bottom-hanging purple bracket with inline cyan selection: tinted background with dashed bottom edge for drag affordance, and `[` `]` bracket handles for scaling. Dragging a bracket past the opposite side inverts knot positions.
- **Bias handles hidden for Step:** Diamond bias handles are suppressed for step-interpolated segments where they have no effect.
- **Distinct cursor for selection drag:** Selection drag area uses `cursor-move` (four-way arrows) to differentiate from individual knot handles (`cursor-grab`).
- **Presets button visibility:** Presets button now has a visible border and text label ("Presets") instead of just an icon.

- Files: `components/AdvancedGradientEditor.tsx`, `components/Histogram.tsx`, `utils/colorUtils.ts`, `data/help/topics/ui.ts`

## 2026-03-14

### Light Gizmo Improvements

**Bug fixes:**
- **Headlamp mode flip during drag:** `useInteractionManager.ts` unconditionally set `fixed: false` on every pointermove during CenterHUD panel drag, overriding headlamp mode for already-visible lights. Now only forces world-space when placing an inactive light for the first time.
- **Anchor icon lag:** Gizmo label read `fixed` from React props (potentially stale during drag). Now subscribes directly to the store via `useFractalStore` selector.
- **DrawnShape SyntaxError:** `features/types.ts` and `types/store.ts` used value imports for type-only symbols, causing esbuild to emit missing exports. All type-only imports/re-exports now use `import type` / `export type`.

**Architecture:**
- **Stable light IDs:** Added `id: string` to `LightParams` with monotonic `generateLightId()` counter. Gizmo refs keyed by ID instead of array index. `draggedLightIndex` changed from `number` to `string` (light ID) across store, CenterHUD, and useInteractionManager. One-time migration via `ensureLightIds()` for legacy state.
- **uLightDir sign convention:** Direction negated once at boundary in `UniformManager.ts` (now stores "toward light"). Removed per-consumer negation from `pbr.ts`, `pathtracer.ts`, and `volumetric_scatter.ts`. Updated CLAUDE.md shader conventions.
- **Skip unused uniforms:** `UniformManager.ts` skips falloff/falloffType/position/radius/softness for directional lights (shader ignores them).

**Performance:**
- **Visibility culling in tick:** `LightGizmo.tick()` reads lights once and skips hidden/directional lights entirely (no function call overhead). Added `hide()` method to SingleLightGizmo imperative handle.

**UX:**
- **Gizmo visibility outside canvas:** Removed `overflow-hidden` from LightGizmo container and DomOverlays wrapper in `ViewportArea.tsx`.
- **Snap/grid support:** Shift-drag snaps light position to 0.25 world-unit grid increments.
- **Light duplication:** New `duplicateLight(index)` action. Duplicate button (copy icon) added to light settings popup header.

- Files: `features/lighting/LightGizmo.tsx`, `features/lighting/components/SingleLightGizmo.tsx`, `features/lighting/components/LightControls.tsx`, `features/lighting/index.ts`, `types/graphics.ts`, `types/store.ts`, `store/slices/uiSlice.ts`, `hooks/useInteractionManager.ts`, `components/topbar/CenterHUD.tsx`, `components/ViewportArea.tsx`, `engine/managers/UniformManager.ts`, `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/pathtracer.ts`, `shaders/chunks/lighting/volumetric_scatter.ts`, `features/types.ts`, `CLAUDE.md`

## 2026-03-13

### Code Splitting (React.lazy)
Main index bundle reduced from ~1,768 KB to ~915 KB (~48% reduction).
- **App.tsx**: Timeline, FormulaWorkshop, HelpBrowser converted to `React.lazy()` with `<Suspense fallback={null}>`
- **features/ui.tsx**: `lazify()` helper wraps lazy components with Suspense for the component registry. FlowEditor, AudioPanel, AudioSpectrum, DebugToolsOverlay lazified.
- **DebugToolsOverlay.tsx**: ShaderDebugger and StateDebugger lazy-loaded internally
- **AutoFeaturePanel.tsx**: AdvancedGradientEditor lazy-loaded
- Unused AdvancedGradientEditor imports removed from RenderPanel and ColoringHistogram
- VideoExporter already used dynamic `import()` — no change needed
- Files: `App.tsx`, `features/ui.tsx`, `features/debug_tools/DebugToolsOverlay.tsx`, `components/AutoFeaturePanel.tsx`, `components/panels/RenderPanel.tsx`, `components/panels/gradient/ColoringHistogram.tsx`

### Dead Code & Param Cleanup
- Deleted `components/App.tsx` (stale duplicate, not imported anywhere — root `App.tsx` is the real entry)
- Removed dead `scaleX`/`scaleY` params from `features/texturing.ts` (no uniform → rendered in UI but had no shader effect). Working control is `textureScale` (vec2, `uTextureScale`).

### Documentation & Help System
- Version bump to 0.8.9 (package.json, CLAUDE.md, docs)
- About page: version display, Claude credit, tech stack, fractal reference links
- Help topics added: Reflections, Volumetric Scatter, Water Plane, Geometry & Transforms (9 fold types), Camera Manager, Webcam Overlay, Borromean/KaliBox/MandelMap formulas
- Keyboard shortcuts documented: Backtick (Advanced Mode), B (Broadcast), Space (Play/Pause)
- `docs/01_System_Architecture.md`: TickRegistry section added, WorkerProxy path fixed
- `docs/08_File_Structure.md`: comprehensive rewrite (worker/, geometry/folds/, volumetric/, new primitives, removed stale entries)
- `.gitignore`: added `fractal_generator_*.glsl` pattern
- Stale `MandelbulbScene.tsx` comment reference removed from `shaders/chunks/post.ts`

## 2026-03-12

### Path Tracer Cleanup & Performance
Major refactor of `shaders/chunks/pathtracer.ts` addressing bugs, duplication, and performance.

**Bug fixes:**
- **Fog on sky miss always maxed out:** `smoothstep(uFogNear, uFogFar, uFogFar)` always returned 1.0 — added `uFogFar < 1000.0` guard and changed input to `uFogFar * 0.95` so fog responds to settings
- **Russian roulette random correlation:** Termination decision reused `randType` (already consumed by spec/diff bounce selection), biasing termination per bounce type. Now uses a decorrelated `fract(blueNoise.r * 1.618 + 0.7)`

**Shared helpers extracted** (`shaders/chunks/lighting/shared.ts`, injected as `LIGHTING_SHARED`):
- `buildTangentBasis(n, out t, out b)` — consistent tangent frame used by cosine hemisphere, GGX importance sampling, and shadow jitter (replaced 3 inconsistent inline constructions)
- `fresnelSchlick(cosTheta, F0)` — single Schlick implementation shared across pbr.ts, pathtracer.ts, and env NEE (replaced 5+ inline `pow(1-x, 5)` expressions)
- `intersectLightSphere(ro, rd)` → `vec2(fade, index)` — shared ray-sphere test for visible light spheres (replaced ~25-line duplicated blocks in pathtracer.ts and shading.ts)

**Hoisted Fresnel computation:** `F0`, `F_surface`, `viewDir`, `NdotV` computed once per bounce before NEE. Previously F0/F were computed 3 times (NEE, env NEE, bounce selection) with identical inputs.

**Unified Smith-GGX:** Path tracer used height-correlated Smith (`2n/(n + sqrt(a² + (1-a²)n²))`, 2× `sqrt` per term). Replaced with Schlick-GGX (`n/(n(1-k) + k)`, `k = a/2`) matching pbr.ts — eliminates visual discrepancy between Direct and PT modes and removes per-term `sqrt`.

**Lean bounce tracer (`traceSceneLean`):**
- `getTraceGLSL()` now accepts optional `functionName` parameter
- In PT mode, `ShaderBuilder` emits a second `traceSceneLean()` with empty volume body/finalize code
- Bounce rays and env NEE visibility tests call `traceSceneLean`, skipping per-step volume accumulation (density, glow, scatter) that was being computed and discarded
- Primary camera ray still uses full `traceScene()` with volume effects

**PI/TAU constants:** Added `#define PI 3.14159265` and `#define TAU 6.28318530` in `math.ts`. Replaced all `3.14159` / `6.283185` / local `float pi` literals across pathtracer.ts, pbr.ts, volumetric_scatter.ts, and ray.ts. `phi` (golden ratio) already existed as a global const.

- Files: `shaders/chunks/pathtracer.ts`, `shaders/chunks/lighting/shared.ts` (new), `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/lighting/shading.ts`, `shaders/chunks/lighting/volumetric_scatter.ts`, `shaders/chunks/math.ts`, `shaders/chunks/ray.ts`, `shaders/chunks/trace.ts`, `engine/ShaderBuilder.ts`, `features/lighting/index.ts`

## 2026-03-11

### PBR Specular Upgrade (Cook-Torrance)
- Replaced Blinn-Phong specular with GGX distribution + Smith-GGX geometry term
- Tighter highlight core with natural long tail at all roughness levels
- Geometry attenuation correctly darkens specular at grazing angles
- `NdotV` hoisted outside light loop (was recomputed per-light)
- Files: `shaders/chunks/lighting/pbr.ts`

### Reflection/Metallic Fixes
- **Metallic on bounces:** Reflection bounce PBR was hardcoded to `metallic=0.0` — now uses `uReflection` so reflected surfaces show correct metallic shading
- **Normal orientation:** Added `dot(r_n, -currRd) < 0` flip to fix back-face lighting in concave fractal geometry (caused asymmetric "lit from inside" on one side)
- **Bounce shadows:** Enabled shadow computation on reflection hits, gated by `!isMoving` for performance (accumulates when still, skipped during interaction)
- **Fresnel weighting mismatch:** `simpleEnv` fallback was missing `F * uSpecular` weighting — created brightness discontinuity when Raymarch Mix < 1.0
- **Adaptive reflection bias:** Replaced hardcoded `0.01` offset with `max(0.001, pixelSizeScale * d * 2.0)` — prevents self-intersection at deep zoom and detachment when zoomed out
- **Cached reflect direction:** `reflect(-v, n)` computed once, reused for trace and simpleEnv (was computed twice)
- **Hit refinement:** Reflection tracer retreats by `d * 0.5` at hit before evaluating orbit traps — reduces color noise at glancing angles
- **Roughness cutoff default:** Changed from 0.5 to 0.62
- Files: `shaders/chunks/lighting/shading.ts`, `features/reflections/shader.ts`, `features/reflections/index.ts`

### Fog System Cleanup
- **`uFogColorLinear` uniform:** `InverseACESFilm(uFogColor)` precomputed on CPU once per frame, replacing 5+ per-pixel quadratic solves across shading, post, main, and pathtracer
- **Env fog consistency:** Replaced hardcoded `0.8` blend with `smoothstep(uFogNear, uFogFar, uFogFar)` — env fog now responds to fog range settings
- **Pathtracer sky fog:** Replaced hardcoded distance `100.0` with `uFogFar`
- **Double-fog fix:** Removed distance fog from reflection HIT path — `post.ts` applies single primary-distance fog to composed pixel
- **Fog helpers:** `applyEnvFog()` and `applyDistanceFog()` extracted in shading.ts
- Files: `shaders/chunks/lighting/shading.ts`, `shaders/chunks/post.ts`, `shaders/chunks/main.ts`, `shaders/chunks/pathtracer.ts`, `engine/UniformNames.ts`, `engine/UniformSchema.ts`, `engine/managers/UniformManager.ts`

### Shading Code Cleanup
- Extracted `sampleLightSphereOrEnv()` helper from inline 35-line light sphere intersection block
- Removed unused `isMobile` parameter from `getShadingGLSL()`
- Added Fresnel variant documentation comments (Schlick vs Schlick-Roughness)
- Files: `shaders/chunks/lighting/shading.ts`, `features/lighting/index.ts`

## 2026-03-10

### Two-Stage Shader Compilation
- Solves 14-19s compile block on Windows/Chrome (fxc inlines formula 10+ times)
- Preview shader with colored N·L lighting stubs compiles in <1s, renders immediately
- Full shader compiles async via `KHR_parallel_shader_compile` + 1x1 FBO dummy scene
- Three paths in `performCompilation()`: two-stage (formula change), keepCurrent (engine settings), single-stage (fallback)
- Generation counter (`_compileGeneration`) cancels stale compiles on rapid formula switches
- `CompilingIndicator.tsx`: "Compiling Lighting..." (two-stage) or "Compiling Shader..." (keepCurrent)
- Bug fixes: `buildFullMaterial` uses local `targetMode` stored as `_gmtMode`; `modeChanged` gated with `!rebuildNeeded`

### Step Jitter Parameter
- Exposed hardcoded stochastic ray jitter as `stepJitter` quality param (uniform `uStepJitter`)
- Files: `features/quality.ts`, `shaders/chunks/trace.ts`

## 2026-03-09

### Worker Frame Transfer Optimization (Session 4+5)
- Auto-presenting OffscreenCanvas replaces `transferToImageBitmap()` (eliminated 26ms GPU stall)
- PBO async depth readback avoids `glFinish()`
- MessageChannel tick scheduling

### Bucket Render Worker Migration (Session 4+5)
- Full protocol: BUCKET_START/STOP/STATUS/IMAGE
- `BucketRenderControls.tsx` rewritten to use WorkerProxy
- `compositeCurrentBucket()` disables `gl.autoClear` during render

### Video Export Fixes (Session 4+5)
- `FileSystemWritableFileStream` wrapped in plain `WritableStream` proxy (not transferable via postMessage)
- Matrix3/4 serialization: `MaterialController.setUniform` handles plain `{elements: [...]}` from structured clone

### Focus Pick & Light Gizmos (Session 3)
- Focus pick depth snapshot system (3-phase protocol: START → capture depth buffer → SAMPLE from stored buffer → END)
- Focus Lock toggle: replaces "Auto-Centre", syncs `dofFocus = lastMeasuredDistance` in `usePhysicsProbe`
- Light gizmo cleanup: removed dead `engine.virtualSpace` branches, fixed worker-mode coordinate conversion
- Fly mode light drag-in offset absorption (`lightDragSyncedRef` in useInteractionManager)
- R3F camera FOV sync from `optics.camFov` each frame

### Blue Noise Overhaul (Session 2)
- Replaced grayscale 128x128 PNG with `LDR_RGBA_0.png` (4 independent channels)
- Fixed `createImageBitmap` premultiplied alpha corruption (`premultiplyAlpha: 'none'`)
- Fixed R2 temporal offset (old `fract(n*PHI)` identical for integer n → 45° streaks)
- Worker fetch URL derives page base from worker URL for production

### TickRegistry (Session 2)
- Phase-based tick orchestrator replacing hardcoded sequence in WorkerTickScene
- Phases: SNAPSHOT → ANIMATE → OVERLAY → UI
- Light gizmo fixes: prefer worker shadow state over stale store offset during fly mode
- RenderPopup fix: use `engine.accumulationCount` shadow state (not `engine.pipeline`)

### Worker Phase 2 Features (Session 1)
- Histogram probe RPC, GPU info via BOOTED message, perf monitor via shadow state
- Accumulation flash fix: removed `wasActiveRef` dirty kick — engine threshold detection handles deceleration
- Post-param accumulation fix: removed `isUserInteracting` from `isCameraInteracting`
- Snapshot fix: `!engine.isBooted` guard (renderer is always null in worker mode)

## 2026-03-07

### Shadow Regression Fix
- Root cause 1: `lVec = uLightDir[i]` negation removed in `pbr.ts` → restored `lVec = -uLightDir[i]`
- Root cause 2: Quilez 2015 soft shadow formula drove `res` too low → reverted to simple formula
- Root cause 3: Directional `distToLight = 10000.0` accumulated near-misses → reduced to `100.0`
- Threshold tightened from `t * 0.0005` to `t * 0.0001` in `GetSoftShadow`
- Same direction fix applied to `pathtracer.ts` for PT mode

### Volumetric Scatter
- Beer-Lambert fog with HG phase function, stochastic sampling
- Emissive surface color scatter via orbit trap layer 1
- `fogAnisotropy` (uPTFogG) moved to atmosphere fog section
- `fogDensity` uses log scale, max 0.5

### Engine Panel Tooltip Fix
- Portal-based tooltip detects panel side and opens on opposite side with correct arrow

## 2026-03-06

### Fragmentarium Importer Refactor
- Old monolithic `GenericFragmentariumParserV2.ts` split into `parsers/`, `transform/`, `workshop/`
- Entry: `FormulaWorkshop.tsx` → `detection.ts` → `ast-parser.ts` → `code-generator.ts`
- getDist generation: 3 paths (accumulator, expression, fallback)
- Test suite: 40/40 passing (`npx tsx debug/test-frag-importer.mts`)
- Docs 13/15/16/17/18 (obsolete) deleted

### Vec Formula Parameters
- `vec2A/B/C`, `vec3A/B/C` (uniforms `uVec2A-C`, `uVec3A-C`)
- Per-axis animation targeting

### Unified Input System
- `components/inputs/` + `components/vector-input/` replaces deleted Vector2Pad / Vector3Input

## 2026-03-05

### PT Quality Parameters
- Rim light fix (bounce 0 only), visible light spheres, PixelSizeBase uniform

## 2026-03-03

### Vector Controls Enhancement
- Rotation mode with heliotrope direction visualizer
- Unit toggle (degrees/radians) via right-click context menu
- Double-click axis labels to reset to default
- Alt-drag skips step quantization for full precision
- Fixed double-mapping bug in slider min/max

### Code Health
- `shaderGenerator` removed from FeatureDefinition (dead code)
- `shader` → `postShader` rename in FeatureDefinition
- `ShaderConfig` extracted to `engine/ShaderConfig.ts`
- Category 2 `any` fixes: inject config, ParamCondition, ParamOption, EngineInputEvent, compileTimer
- `utils/FragmentariumParser.ts` duplicate removed
