
# Code Health Report

**Status:** Stable (Post-DDFS Refactor & Cleanup)
**Last Updated:** 2026-04-09

## 1. Architecture ✅
The codebase has been successfully migrated to the **Data-Driven Feature System (DDFS)**.
*   **Redundancy:** Removed. Legacy manual event subscriptions in `fractalStore.ts` have been replaced by the automated `createFeatureSlice` logic which handles `onUpdate: 'compile'` triggers generically.
*   **Extensibility:** High. Adding a new feature no longer requires touching the Engine or UI core.
*   **Uniformity:** "Lite Mode" and many mobile-related precision checks have been unified into the `quality` feature (`precisionMode`, `bufferPrecision`). Note: a runtime `isMobile` hint still flows through the config/engine (used by `FractalEngine`/`ConfigManager` and some shader chunks) — it was not fully removed. Use the `quality` feature for precision decisions and treat `isMobile` as a runtime capability hint.
*   **Viewport Quality System:** The old flat `ENGINE_PROFILES` approach has been superseded by a per-subsystem scalability system (`types/viewport.ts`, `store/slices/scalabilitySlice.ts`). Quality is now controlled via a top-bar dropdown (`ViewportQuality.tsx`) with master presets and per-subsystem tier overrides. Hardware params (`precisionMode`, `bufferPrecision`, `compilerHardCap`) are hidden from the Engine Panel and managed via a dedicated Hardware Preferences modal. The Engine Panel toggle has been moved to the advanced mode section of the System Menu. See `docs/01_System_Architecture.md` §2.3 for architectural details.

## 2. Completed Refactors ✅
*   **Visual Slice Removal:** `store/slices/visualSlice.ts` has been deleted. Lighting state is now managed by the `lighting` feature module (`features/lighting`).
*   **Lite Render Unification:** Moved logic from `uiSlice` and `FractalEngine` flags into the `QualityFeature` state. This allows granular control over precision (Float32 vs Float16) and Ray Epsilon via the DDFS.
*   **Subscription Cleanup:** Removed ~20 lines of manual `subscribe` calls in `bindStoreToEngine`. The system now automatically detects parameters that require shader recompilation based on their DDFS config.
*   **Shader Builder:** Implemented `ShaderBuilder.ts` with feature `inject()` contract for cleaner shader composition.
*   **`shaderGenerator` Removed:** Dead property removed from `FeatureDefinition` — was never read by any engine code.
*   **`shader` → `postShader` Rename:** `FeatureDefinition.shader` renamed to `postShader` for self-documenting clarity. `inject()` targets the raymarching shader; `postShader` targets the screen-space post-process pass. Empty stubs removed from audioMod, drawing, texturing.
*   **`ShaderConfig` Extracted:** Moved from `ShaderFactory.ts` to `engine/ShaderConfig.ts`. Now imports `PipelineNode` and `FractalGraph` from `types/graph.ts` instead of `any`. Re-exported from `ShaderFactory.ts` for backwards compatibility.
*   **`FeatureDefinition` Interface Documented:** All properties annotated with inline comments explaining purpose, pipeline target, and relationship to adjacent properties.
*   **Category 2 `any` Fixes:** `ParamCondition.eq/neq`, `ParamOption.value`, `ParamConfig.format`, `inject()` config param, `FractalEngine.compileTimer`, and `handleInput` event all given precise types. `EngineInputEvent` is now a discriminated union.
*   **Deprecated Feature Removed:** Removed `features/stress_test.ts` placeholder.
*   **Debug Console Logs Removed:** Cleaned up debug logs from startup and config management (kept compile-time logs).

## 2.4 Recent Fixes (2026-03-05) ✅

### Shader / Uniform Optimizations
*   **`PixelSizeBase` CPU Pre-Compute:** `uPixelSizeBase` uniform added (`engine/UniformNames.ts`, `engine/UniformSchema.ts`). The value `length(uCamBasisY) / resolution.y * 2.0` (used in the PT bounce loop's bias epsilon) is now computed on the CPU each frame in `UniformManager.updateCamera()` and uploaded once, eliminating a redundant per-fragment square-root in the hot path of `calculatePathTracedColor`.
*   **UniformManager Resize Log Removed:** `console.log` in the resolution resize path deleted — was firing every frame during interactive resize.

### Vector Formula Parameters (CoreMath)
*   **Six new `coreMath` params** added to `features/core_math.ts`: `vec2A`, `vec2B`, `vec2C` (`{x,y}`), `vec3A`, `vec3B`, `vec3C` (`{x,y,z}`). Each maps to a uniform (`uVec2A` … `uVec3C`) and renders in `FormulaPanel` via the new `VectorInput` / `Vector2Input` / `Vector3Input` components.
*   **Formulas reference these as** `uniform vec3 uVec3A;` etc. — the DDFS auto-declares and uploads them per frame.

### AnimationSystem Vector Component Support
*   `components/AnimationSystem.tsx` now handles component-level LFO/keyframe targeting for vector params using the `(coreMath|geometry).(vec[23][ABC])_(x|y|z)` key pattern (e.g., `coreMath.vec3A_x`). Each axis can be independently keyframed and modulated. The full vec3 is reconstructed and written to the uniform after per-axis offset application.

### ParameterSelector Vec2/Vec3 Expansion
*   `components/ParameterSelector.tsx` expands `vec2` and `vec3` params into their component sub-targets (e.g., `coreMath.vec3A_x`) so the animation system's "Add Track" picker shows individual axis entries per vector param.

## 2.5 Recent Fixes (2026-02-18 to 2026-02-22) ✅

### Mobile Support Improvements
*   **Mobile Black Screen Fix:** Removed WebGL context check for HalfFloat16 support on iOS - now uses HalfFloat16 directly on mobile.
*   **Light Gizmo Mobile Offset:** Changed from `devicePixelRatio` calculation to `getBoundingClientRect()` for accurate screen projection.
*   **Mobile Panel Layout:** Engine and Camera Manager panels now redirect to right dock on mobile devices.
*   **Mobile Drag Handles:** Hidden tab drag handles on mobile (no drag-and-drop reordering).

### Performance Fixes
*   **FPS Drop Fix:** Reused typed array buffers in `RenderPipeline.ts` and `usePhysicsProbe.ts` to avoid per-frame GC pressure.
*   **Bucket Render Bleeding:** Added `clearTargets()` call between bucket tiles to prevent artifacts.

### UI/UX Improvements
*   **Composition Overlays:** Added configurable grid divisions, spiral ratio (golden ratio default), and color picker.
*   **Light Temperature:** Removed presets, added "Temperature" label, color picker first.
*   **Histogram:** Added stale indicator, refresh button, and 0-1 normalization toggle.
*   **Tooltips:** Added keyboard shortcuts in square brackets format.
*   **Mandelorus Naming:** Fixed formula name from "HyperTorus" to "Mandelorus".
*   **Snapshot Indicator:** Shows "Capturing..." before snapshot is taken.

## 2.6 Recent Fixes (2026-02-24) ✅

### Video Export Improvements
*   **Bitrate Scaling:** Default bitrate increased to 40 Mbps for 1080p (from 12 Mbps). Bitrate now auto-scales with resolution using linear pixel-based calculation.
*   **Viewport Restoration:** Added resolution mode, fixed resolution, and AA level to export state capture/restore for proper viewport return after render.

### Slider Precision Improvements
*   **Roughness Slider:** Removed log scaling, changed min from 0.01 to 0.001, step from 0.01 to 0.001 for finer control.
*   **AO Spread Slider:** Removed log scaling, changed min from 0.01 to 0.001, step from 0.01 to 0.001.
*   **AO Intensity Slider:** Removed log scaling for more intuitive control.

### Graph Editor Fix
*   **Drag Prevention:** Added `onDragOver`, `onDrop` handlers and `draggable={false}` to prevent browser's default drag-to-copy image behavior when scrubbing the graph canvas.

### Quality Panel Improvements
*   **Dynamic Max for Ray Steps:** Added `dynamicMaxRef` property to ParamConfig interface. Max Ray Steps slider now dynamically uses the Hard Loop Cap value as its maximum.
*   **Overstep Fix Visibility:** Removed `isAdvanced: true` from Overstep Fix parameter - now visible without enabling advanced mode.

## 2.7 Recent Fixes (2026-03-20) ✅

### Input Drag Responsiveness — Direct DOM Updates
*   **Problem:** Vector/scalar input displays (text and fill bars) lagged during drag because updates went through React's render cycle (`setState` → reconciliation → DOM commit).
*   **Solution:** Three-layer direct DOM update pattern:
    1. **DraggableNumber** updates its own `displayRef.textContent` on every pointer move using `immediateValueRef` from `useDragValue`.
    2. **ScalarInput** receives `onImmediateChange(value)` callback, updates fill bar refs (`fillBarRef`, `fullTrackFillRef`, `rangeInputRef`) synchronously.
    3. **BaseVectorInput** uses `pushAxisToDOM(axisIndex, value)` for cases where the drag source isn't the DraggableNumber itself (DualAxisPad, linked mode, rotation heliotrope). Queries by `data-axis-index` / `data-role` attributes.
*   **Shared utility:** `computePercentage()` extracted to `FormatUtils.ts` — used by both ScalarInput and BaseVectorInput for fill bar width calculation.
*   **React state still updated** alongside DOM push for consistency (next React render overwrites DOM with same values).
*   **Quirk:** `pushAxisToDOM` uses `querySelector` on the slider row container — acceptable because the subtree has only 4–8 elements. If axis cell count grows significantly, consider caching refs.

### Vec4 Type Fix
*   Added `vec4A/B/C` to `FractalParameter.id` union and `'vec4'` to `type` union in `types/fractal.ts`. Resolves 4 TS errors in `FormulaPanel.tsx`.

## 2.8 Recent Work (2026-03-17 to 2026-04-09)

### Formula System Expansion
*   **42 native formulas** now in `formulas/` — 13 new formulas added (polyhedra series: Cuboctahedron, RhombicDodecahedron, TruncatedIcosahedron, etc.; PseudoKleinianAdvanced; Claude; KaliBox).
*   **Formula Audit** completed — all formulas reviewed for naming, math correctness, descriptions, params, DE compliance. See `docs/23_Formula_Audit.md`.
*   **Formula Interlace System** — hybrid two-formula interlace with shared Rodrigues rotation helpers, preambleVars contract, mesh export support. See `docs/24_Formula_Interlace_System.md`.

### Mesh Export Tool
*   **Standalone mesh export** at `public/mesh-export/` — HTML + ES2020 (no React). 6-phase GPU pipeline: SDF sampling → dual contouring → Newton projection → post-processing → vertex coloring → export.
*   **VDB export with color grids** — `Tree_float_5_4_3` density + optional `Cd` `Tree_vec3s_5_4_3` color grid.
*   **Preview camera overhaul** — orbit, pan, zoom, preset views, controls hint overlay.

### Viewport Quality System
*   **Per-subsystem scalability** replaces flat ENGINE_PROFILES. Four subsystems (Shadows, Reflections, Lighting, Atmosphere) with ordered tiers.
*   **Hardware detection** at boot — Float32 probe, mobile detection, GPU string analysis.
*   **Engine Panel moved** to advanced mode; hardware params managed via dedicated modal.

### CompilableFeatureSection Pattern
*   **Reusable DDFS UI component** for features with compile/runtime split (`panelConfig` declarative config).
*   Applied to Volumetric Scatter and Hybrid Box Fold.

### Area Lights Two-Level Control
*   Compile-time `ptStochasticShadows` + runtime `areaLights` uniform toggle.

## 2.9 Bundle Optimization (2026-04-09)

### Formula Chunk Split
*   **Formula definitions deferred to async chunk.** All 42 formula files (403KB raw) were eagerly bundled into the `index` chunk via `FormulaGallery.tsx → formulas/index.ts` import chain. Fixed by:
    1. Extracted `PREDEFINED_CATEGORIES` to `formulas/categories.ts` using string literal IDs (no formula imports)
    2. Changed `FormulaGallery.tsx` to import from `formulas/categories` instead of `formulas/`
    3. Changed formula registration in `useAppStartup.ts` to `import('../formulas').then(...)` — formulas load as a separate async chunk before boot
*   **Impact:** `index` chunk: 600KB → 268KB raw (144KB → 54KB gzip). Formulas in separate 332KB async chunk (89KB gzip), loaded before boot.

### Vendor Chunk Cleanup
*   **`reactflow` removed from `manualChunks`** — only used by lazy-loaded `FlowEditor`. Now bundled with its consumer (-48KB gzip from initial load).
*   **`mediabunny` removed from `manualChunks`** — only used by lazy-loaded `Timeline/RenderPopup` and worker. Now bundled with consumers (-3KB gzip from initial load).

### Overall Initial Load Reduction
*   **630KB → 484KB gzip (-23%)** for blocking initial load chunks.
*   Files: `vite.config.ts`, `formulas/categories.ts` (NEW), `formulas/index.ts`, `components/panels/formula/FormulaGallery.tsx`, `hooks/useAppStartup.ts`, `components/LoadingScreen.tsx`

## 3. Technical Debt

### High Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **`any` Type Usage** | 452→~320: C1 ~30 leave, **C2 ✅ fixed**, C3 ~175 deferred, C4 ~110 leave, C5 ~40 leave (Section 4) | Type safety erosion | C2 done; defer C3 until FeatureStateMap |
| **`@ts-ignore` Usage** | ✅ All 22 converted to `@ts-expect-error` with context comments | Resolved | 5 fixable types remain for future work |
| **Engine–React Coupling** | ✅ Resolved. `CPUDistanceEstimator.ts` deleted (dead code). `VideoExporter.ts` deleted (superseded by WorkerExporter). `AnimationEngine.ts` refactored to injected `connect()` pattern. Zero engine files import Zustand. | Resolved | — |

### Medium Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Console Statements** | ✅ 12 removed, 15 gated behind `import.meta.env.DEV`; ~52 keep (errors/warnings) | Resolved | Production console is clean |
| **File Complexity** | 9 files > 700 lines (see Section 8) | Maintenance burden, review difficulty | Split top candidates (FormulaSelect, RenderPopup, exporters) |
| **Exporter Code Duplication** | ✅ Resolved. `VideoExporter.ts` deleted (dead code). Shared `H264Converter` + `halton` extracted to `engine/codec/`. | Resolved | — |
| **Silent Error Swallowing** | ✅ 2 HIGH-severity catches fixed (AudioAnalysisEngine, FormulaWorkshop); 12 justified | Resolved | Error handling grade: A- |

### Low Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Camera State Duplication** | ✅ Unified coordinate system (Section 10). Canonical form: `cameraPos=(0,0,0)`, all position in `sceneOffset`, `targetDistance`=surface distance. Mode-agnostic engine. | ✅ `isOrbit` branching removed from VirtualSpace; animation/camera manager/presets fully mode-agnostic | Remaining: rapid teleport collision (MEDIUM) |
| **Boot Timing Heuristic** | `useAppStartup.ts:31` — 50ms setTimeout | Fragile assumption; works in practice | Replace with explicit ready signal if issues arise |
| **Mobile UI** | Auto-generated panels | Cramped layout on vertical screens | CSS tuning needed |
| **Duplicate JSX Types** | `types.ts` lines 14-75 | Maintenance overhead | Consider using `@react-three/fiber` types |
| **Shader Magic Numbers** | 80+ literals across 19 shader files (see Section 11) | Partially fixed: 30+ comments added, `INV_TAU`/`INV_PI` extracted | Remaining: extract `PRECISION_RATIO_HIGH`, `GGX_EPSILON`, use `MAX_DIST` consistently |
| **`three-stdlib` Dependency** | Single type import in `Navigation.tsx` | Transitive dep of drei — direct dep is redundant but harmless | Keep: explicit pinning prevents version drift (see Section 12.2) |

## 4. `any` Type Analysis — Full Per-File Triage (2026-03-13)

**Total: 452 instances across 98 files.** Every instance in the top files has been read and categorized.

| Area | Count | Top files |
|------|-------|-----------|
| **engine/** | ~62 | `FractalEngine.ts` (21), `MaterialController.ts` (15), `ConfigManager.ts` (14), `renderWorker.ts` (12) |
| **components/** | 179 | `RenderPopup.tsx` (21), `AnimationSystem.tsx` (16), `BaseVectorInput.tsx` (14), `EnginePanel.tsx` (13), `AutoFeaturePanel.tsx` (12) |
| **store/** | 30 | `fractalStore.ts` (13), `createFeatureSlice.ts` (8) |
| **hooks/** | 25 | `useGraphTools.ts` (8), `useDopeSheetInteraction.ts` (8), `useInputController.ts` (5) |
| **utils/** | 30 | `UrlStateEncoder.ts` (12), `PresetLogic.ts` (11) |
| **features/** | 44 | `FormulaWorkshop.tsx` (11), `ast-parser.ts` (5) |

### Category Summary

| Cat | Description | Count | Action |
|-----|-------------|-------|--------|
| **C1** | Third-party / browser API gaps | ~30 | Leave as-is |
| **C2** | Fixable lazy typing | ~95 | Fix individually |
| **C3** | Structural DDFS dynamics | ~175 | Deferred — needs `FeatureStateMap` |
| **C4** | Inherently generic plumbing | ~110 | Leave — generic by design |
| **C5** | Mediabunny / codec interop | ~40 | Leave — untyped third-party API |

### Category 1: Third-party / browser API gaps (~30) — Leave as-is

| File | Instances | Pattern |
|------|-----------|---------|
| `PrecisionMath.ts` | 4 | `(rot as any)._x/._y/._z/._w` — Three.js Quaternion internal fields |
| `MaterialController.ts` | 6 | `value.buffer as any` (×4 DataTexture), `(this.renderer as any).properties`, `(fullMat as any)._gmtChecksum` |
| `renderWorker.ts` | 3 | `canvas as any` (OffscreenCanvas), `msg.bitmap as any`, `(self as any).postMessage` |
| `FractalEngine.ts` | 2 | `(this.renderer as any).properties`, `gl1 as any` (WebGL context cast) |
| `WorkerProxy.ts` | 3 | `(fsStream as any).write/close/abort` — File System Access API |
| `UniformSchema.ts` | 2 | `v.clone ? v.clone() : v` array cloning |
| `LoadingScreen.tsx` | 2 | `registry.get(formulaId as any)` — FormulaType narrowing |
| Misc | ~8 | `(e as any).pointerType`, `(colArr[i] as any).isColor`, etc. |

### Category 2: Fixable lazy typing — ✅ FIXED

**Fixed (2026-03-03):** ~40 instances on developer-facing API surfaces (inject, ParamCondition, ParamOption, ParamConfig.format, compileTimer, handleInput).

**Fixed (2026-03-13):** ~95 remaining instances across 10 files + 12 `catch (e: any)` patterns:

| File | Count | What was done |
|------|-------|---------------|
| `UrlStateEncoder.ts` | 12 | Added `DictEntry`, `Dict`, `JsonVal` types; replaced all `any` in class methods |
| `PresetLogic.ts` | 11 | `sanitizeFeatureState` → `Record<string, unknown>`, typed set/get, `FormulaType` cast |
| `BaseVectorInput.tsx` | 14 | Added `VecIndexable` type, replaced 14 `as any` with `as VecIndexable` |
| `EnginePanel.tsx` | 10 | `Record<string, unknown>` for pending/virtual state, proper slice extraction |
| `FormulaSelect.tsx` | 6 | Typed updates/geoUpdates, narrowed `cur` access with `Record<string, unknown>` |
| `useDopeSheetInteraction.ts` | 8 | `AnimationSequence`, `Partial<Keyframe>`, removed redundant type annotations |
| `useGraphTools.ts` | 8 | `AnimationSequence`, typed refs and updates array, `Keyframe` filter annotations |
| `useInputController.ts` | 5 | `Record<string, RefObject<HTMLElement>>`, `CustomEvent` narrowing |
| `historySlice.ts` | 4 | Removed `| any` from union, kept DDFS `@ts-expect-error` |
| `catch (e: any)` | 12 | All replaced with `catch (e)` + `instanceof Error` narrowing across 8 files |

**Remaining `as any` in FormulaSelect.tsx (4):** `loadPreset()` takes `Preset` but receives partial objects — these are load-path casts that match the function's internal tolerance for partial data. Would require changing `loadPreset` signature to `Partial<Preset>` to fix properly.

### Category 3: Structural DDFS dynamics (~175) — Deferred

All `(state as any)[feat.id]` / `(storeState as any).featureName` patterns. Cannot be fixed without a `FeatureStateMap` type.

**Top concentrations:**

| File | Count | Pattern |
|------|-------|---------|
| `AnimationSystem.tsx` | 16 | `(storeState as any).modulation/audio/coloring/geometry/lighting` |
| `ConfigManager.ts` | 14 | `(this.config as any)[feat.id]` and `(newConfig as any)[feat.id]` |
| `RenderPopup.tsx` | 14 | `(storeState as any).modulation/coloring/geometry/optics/lighting/quality` |
| `fractalStore.ts` | 10 | `(currentState as any)[feat.id]`, `(state as any)[feat.id]` |
| `createFeatureSlice.ts` | 8 | `slice: any = {}`, `set((state: any) => ...)` — store builder inherently untyped |
| `FractalEngine.ts` | 7 | `(newConfig as any).quality`, `config.lighting as any` |
| `WorkerTickScene.tsx` | 5 | `(storeState as any).optics/lighting/quality/geometry` |
| `StandaloneTickLoop.ts` | 5 | Same pattern as WorkerTickScene |
| `AutoFeaturePanel.tsx` | 5 | `(state as any)[featureId]`, `(actions as any)[setterName]` |
| `AnimationEngine.ts` | 4 | `(actions as any)[setterName]`, `getState() as any` |
| Remaining (~87) | Various | Same pattern across ~30 files |

**Fix:** A `FeatureStateMap` interface in `features/types.ts` mapping all feature IDs to state types, then intersect with `ShaderConfig` and `FractalStoreState`. This single type would eliminate ~175 instances.

**Why deferred:** Adding this map requires a new entry per feature. Since feature authoring is the primary developer activity, adding friction there has outsized cost. Revisit if engine contributors increase.

### Category 4: Inherently generic plumbing (~110) — Leave as-is

These are generic by design — they handle arbitrary values across the DDFS system:

| Pattern | Count | Rationale |
|---------|-------|-----------|
| `setUniform(key, value: any)` / `syncUniform(name, value: any)` | ~12 | Uniforms are floats, vectors, textures — genuinely polymorphic |
| `ParamConfig.default: any` / `FeatureDefinition.state/actions: any` | ~12 | Feature definitions are inherently heterogeneous |
| `Record<string, any>` for config objects, param maps, engine state | ~30 | Used in builders, condition evaluators, generic panels |
| `evaluateCondition(cond, slice: any, global: any)` | ~6 | Condition evaluator receives arbitrary feature state |
| `handleParamChange(feat, param, value: any)`, `onChangeOverride` | ~10 | Generic value passing across UI ↔ store boundary |
| `FractalEvents` listener types | ~4 | Event payloads vary by event type |
| Misc generic params | ~36 | `syncFrame(camera, state: any)`, `updatePostProcessUniforms(state: any)`, etc. |

### Category 5: Mediabunny / codec interop (~13) — Leave as-is

| File | Count | Pattern |
|------|-------|---------|
| `WorkerExporter.ts` | 8 | `rawBuffer as any`, `packet as any`, `stableMeta as any` — Mediabunny types incomplete |
| `RenderPopup.tsx` | 2 | `Mediabunny.canEncodeVideo(codec as any, ...)`, `fileStream: any` |
| `renderWorker.ts` | 3 | `msg.id as any`, `(engine as any).pipeline?._qualityState` |

### 4.1 `@ts-ignore` Audit — Full Classification (2026-03-13)

22 instances across 16 files (some files since deleted). Each has been read in context and classified. All converted to `@ts-expect-error` with descriptive comments.

**Cat 3 DDFS — `@ts-expect-error` with comment (9):**

| File | Line(s) | Context |
|------|---------|---------|
| `store/slices/historySlice.ts` | 40, 44, 142, 169, 191 | Dynamic slice key access: `s[feat.id]`, `snap[feat.id]`, `diff[key]` |
| `features/engine/profiles.ts` | 203 | `slice[key]` — dynamic profile param access |
| `App.tsx` | 77 | `state.applyPreset` — action on dynamic store |
| `components/topbar/SystemMenu.tsx` | 219 | `state.applyPreset({ mode, actions })` |
| `features/audioMod/AudioSpectrum.tsx` | 20 | `store.updateModulation(...)` — dynamic action |
| `features/audioMod/AudioLinkControls.tsx` | 17 | Same pattern |

**Browser API gaps — annotate and keep (3):**

| File | Line | Context |
|------|------|---------|
| `features/audioMod/AudioAnalysisEngine.ts` | 122 | `navigator.mediaDevices.getDisplayMedia({ audio })` |
| `components/timeline/RenderPopup.tsx` | 382 | `window.showSaveFilePicker(...)` — File System Access API |
| `store/animationStore.ts` | 17 | `window.useAnimationStore = ...` — custom global |

**Window global access — keep (2):**

| File | Line | Context |
|------|------|---------|
| `store/fractalStore.ts` | 279, 390 | `window.useAnimationStore?.getState?.()` — cross-store without import cycle |

**Fixable — ✅ All Fixed (2026-03-13):**

| File | Fix applied |
|------|-------------|
| `components/ToggleSwitch.tsx` | `onChange(!value as T)` — cast avoids suppression (×2) |
| `components/PopupSliderSystem.tsx` | Typed `paramMap` as `Record<string, { key, setter, val }>` enables string indexing (×2) |
| `components/ShaderDebugger.tsx` | Inline `Window & { openShaderDebugger }` intersection type |
| `components/panels/EnginePanel.tsx` | `mode as keyof typeof ENGINE_PROFILES`, `params as Record<string, unknown>` |
| `features/lighting/components/LightControls.tsx` | `axis.toLowerCase() as 'x' \| 'y' \| 'z'` |

### 4.2 `eslint-disable` Comments (4 instances) — No action needed
All 4 are `react-hooks/exhaustive-deps` suppressions in `useAppStartup.ts`, `FormulaWorkshop.tsx` (×2), and `GlslEditor.tsx`. These are intentional dependency omissions — justified.

## 5. Console Statement Audit — ✅ Completed (2026-03-13)

**Original audit:** 89 statements across 38 files. All REMOVE and GATE actions have been applied.

### What was done
- **12 REMOVE** statements deleted (8 were in `VideoExporter.ts` which was later deleted entirely; 2 `UrlStateEncoder.ts` debug dumps; 1 `ui.tsx` registry log; 1 `RenderPopup.tsx` init log)
- **14 GATE** shader/compile/boot logs gated behind `import.meta.env.DEV`
- **52 KEEP** statements confirmed as essential error handlers or diagnostic warnings

### Remaining console statements (~49)

All remaining statements are essential error handlers (~34) or diagnostic warnings (~15). No further cleanup needed.

## 6. Optimization Opportunities

### Shader Permutation ✅ Already Implemented
`ShaderFactory.ts` conditionally injects feature code based on `engineConfig.toggleParam`. Features with this config (ao, atmosphere, geometry, lighting, quality, reflections, water_plane) are only injected when enabled — skipped features produce zero GPU code. Features without a toggle param have no on/off concept and are always injected, which is correct.

The `engineConfig.mode` field distinguishes cost: `'compile'` triggers a full shader rebuild on toggle; `'runtime'` is handled in-shader via uniforms.

## 7. Recommended Actions

### Completed ✅
1. ✅ Removed `features/stress_test.ts`
2. ✅ Conditional shader chunk inclusion implemented in `ShaderFactory.ts`
3. ✅ `utils/FragmentariumParser.ts` duplicate removed — single source in `features/fragmentarium_import/`
4. ✅ `FeatureDefinition.shaderGenerator` removed — was never read by any engine code
5. ✅ Dead `shader` sub-properties removed (`mainHeader`, `material`, `volumeFunctions`, `volumeBody`, `volumeFinalize`) — post_process.ts only reads `uniforms`, `functions`, `main`, `mainUV`
6. ✅ `shader:` renamed to `postShader:` in `FeatureDefinition` — self-documenting: `inject()` targets the raymarching shader, `postShader` targets the screen-space post-process pass. Empty `shader:{}` stubs removed from audioMod, drawing, texturing.
7. ✅ `FeatureDefinition` interface fully documented — all properties have inline comments explaining purpose, pipeline target, and relationship to adjacent properties
8. ✅ Debug `console.log` statements removed — active debug dumps (stack traces, progress logs) cleaned up. Compile time log timing fixed (measures GPU render only). See Section 5 for what remains.
9. ✅ `FeatureShaderLibrary` / `shaderLibrary` removed from `FeatureDefinition` — was a migration stepping stone, never used by any feature. `inject()` supersedes it completely.

### Quick Wins (Low Effort) ✅
1. ✅ Fix `AudioAnalysisEngine.ts:135` silent catch — added `console.error` + `alert()` matching `connectMicrophone()` pattern
2. ✅ Fix `FormulaWorkshop.tsx:230` silent catch — added `console.warn('[Workshop] Transform preview failed:', _)`
3. ✅ `worker.onerror` handler already existed in `WorkerProxy` (lines 113-116 and 175-178)
4. ✅ Added 30s timeout to `WorkerTickScene.tsx` boot-polling loop (300 iterations × 100ms)
5. ✅ Removed 12 debug console statements (VideoExporter finalize → single log, UrlStateEncoder debug dumps, ui.tsx registry log, RenderPopup init log)
6. ✅ Converted all 22 `@ts-ignore` → `@ts-expect-error` with descriptive context comments (zero `@ts-ignore` remaining)
7. ✅ Gated 15 shader/compile/boot console.logs behind `import.meta.env.DEV` (FractalEngine, MaterialController, ShaderBuilder, ConfigManager, useAppStartup)
8. ✅ Sync engine camera → store on animation stop: `AnimationEngine.tick()` now scrubs final frame before stopping; `bindStoreToEngine()` subscribes to animation store's `isPlaying` and force-saves camera to camera manager on stop
9. ✅ Offset guard timeout: `WorkerProxy.setShadowOffset()` now auto-clears `_offsetGuarded` after 2s to prevent stuck gizmo overlays

### Short Term (Medium Effort)
1. Create typed state accessor utility for DDFS (reduce `any` instances)
2. ✅ Split `FormulaSelect.tsx` → `FormulaContextMenu.tsx` + `FormulaGallery.tsx` (see Section 8)
3. ✅ Extract shared `H264Converter` + `halton` from both exporters → `engine/codec/H264Converter.ts`
4. ✅ Extract `applyExportModulations` + time helpers from `RenderPopup.tsx` (see Section 8)

### Long Term (High Effort)
1. Generate TypeScript types from `FeatureRegistry` for full type safety
2. **Implement test suite** — No automated tests exist yet. The frag importer has its own test scripts (`debug/test-frag-*.mts`) but the core engine/store/compiler has zero tests. Highest ROI candidates for a first test suite:
   - **`utils/GraphCompiler.ts`** — Pure function (`compileGraph` → GLSL string). Easy to test, critical correctness, catches regressions in modular formula compilation.
   - **`engine/math/AnimationMath.ts`** — Stateless math (Bezier tangents, curve interpolation, soft selection falloff). Pure inputs/outputs, no mocking needed.
   - **`utils/FormulaFormat.ts`** — GMF parse/serialize roundtrip tests. Ensures save/load fidelity across format versions.
   - **`utils/graphAlg.ts`** — Cycle detection, topological sort. Small, deterministic, critical for modular graph correctness.
   - **`store/createFeatureSlice.ts`** — DDFS slice generation. Verifies that feature definitions produce correct store shape and setter behavior.
3. Consider migrating to `@react-three/fiber` built-in JSX types
4. ✅ Engine–React decoupling: `CPUDistanceEstimator.ts` + `VideoExporter.ts` deleted (dead code); `AnimationEngine.ts` refactored to `connect()` injection
5. Establish explicit camera ownership model with sync-back events (see Section 10.5)

## 8. File Complexity Analysis (2026-03-13)

### Overview
40+ files exceed 400 lines; 9 files exceed 700 lines. Analysis below covers the largest files with split recommendations.

### Files > 700 Lines

| File | Lines | `any` | Console | Split? |
|------|-------|-------|---------|--------|
| `components/timeline/RenderPopup.tsx` | ✅ 748 (split) | 21 | 4 | **Done** |
| `components/panels/formula/FormulaSelect.tsx` | ✅ 187 (split) | 4 | 2 | **Done** |
| `engine/FractalEngine.ts` | 851 | 21 | 9 | No |
| `engine/VideoExporter.ts` | ✅ Deleted (dead code, superseded by WorkerExporter) | — | — | **Removed** |
| `engine/worker/renderWorker.ts` | 829 | 12 | 0 | Moderate (not yet done) |
| `features/fragmentarium_import/FormulaWorkshop.tsx` | 750 | 11 | 0 | No |
| `engine/worker/WorkerProxy.ts` | 735 | 7 | 9 | No |
| `features/fragmentarium_import/parsers/dec-preprocessor.ts` | 717 | 0 | 0 | No |
| `components/AdvancedGradientEditor.tsx` | 715 | 2 | 1 | No |

### Split Plan: FormulaSelect.tsx (901 → 187 main) ✅ DONE

| File | Content | Lines |
|------|---------|-------|
| `FormulaContextMenu.tsx` | `buildFormulaContextMenu()`, `RandomizeSection`, `MiniSlider`, log-scale helpers | 270 |
| `FormulaGallery.tsx` | `PortalDropdown` component (dropdown UI, gallery fetch, lazy thumbnails, layout logic, `LazyThumbnail`) | 461 |
| `FormulaSelect.tsx` | Main select button, import/export, file input, workshop link + re-exports | 187 |

**Re-export:** `FormulaSelect.tsx` re-exports `buildFormulaContextMenu` from `FormulaContextMenu.tsx` for backwards compatibility.

### Split Plan: RenderPopup.tsx (903 → 748 main) ✅ DONE

| File | Content | Lines |
|------|---------|-------|
| `exportModulations.ts` | `applyExportModulations()` — pure logic, no React. Handles coloring, julia, camera, vector, and DDFS param offsets. | 131 |
| `exportHelpers.ts` | `formatTimeWithUnits()`, `formatDurationMs()` | 23 |
| `RenderPopup.tsx` | Component, state, effects, UI, `handleVideoExport()` orchestration | 748 |

**Why not split further:** `handleVideoExport()` is deeply coupled to 8+ refs and state setters. The two UI branches (rendering vs config) share all state declarations. Splitting would require a context or shared parent.

### Exporter Consolidation ✅ DONE

`VideoExporter.ts` deleted — it was dead code, superseded by `WorkerExporter.ts` in the worker architecture. `VideoExportConfig` interface moved to `engine/codec/VideoExportTypes.ts`.

| File | Content | Lines |
|------|---------|-------|
| `engine/codec/H264Converter.ts` | `H264Converter` class (NALU parsing, AnnexB → AVCC conversion) + `halton()` (TAA jitter sequence) | 80 |
| `engine/codec/VideoExportTypes.ts` | `VideoExportConfig` interface (shared by WorkerExporter, WorkerProxy, WorkerProtocol) | 13 |
| `engine/worker/WorkerExporter.ts` | Worker-thread exporter (sole exporter, imports shared codec) | 509 |

### Split Plan: renderWorker.ts (829 → ~560 main)

**Moderate value.** Histogram and depth readback are self-contained subsystems that could be extracted.

| Extract to | Content | Lines |
|------------|---------|-------|
| `workerHistogram.ts` | Histogram resources, `initHistogramResources()`, `handleHistogramReadback()` | ~100 |
| `workerDepth.ts` | PBO/fence depth readback, half-float decoding, focus pick state machine | ~170 |
| Keep in `renderWorker.ts` | Boot, render tick, display blit, message dispatch switch | ~560 |

### Files Left As-Is (Justified)

| File | Lines | Rationale |
|------|-------|-----------|
| `FractalEngine.ts` | 851 | Core orchestrator — delegates to MaterialController, ConfigManager, UniformManager, RenderPipeline. Splitting would create artificial boundaries. |
| `WorkerProxy.ts` | 735 | 1:1 method-to-protocol mapping — each method is short and self-documenting. |
| `FormulaWorkshop.tsx` | 750 | Domain-specific import wizard — complex but cohesive. |
| `dec-preprocessor.ts` | 717 | Parser transforms — 0 `any`, 0 console. Clean code, just long. |
| `AdvancedGradientEditor.tsx` | 715 | Canvas + interaction — only 2 `any`. Low debt density. |

### Dead Code (2026-03-13) ✅ Clean
- **Deleted file references:** `features/sonification/*` removed cleanly (zero dangling imports). `features/geometry.ts` refactored to `features/geometry/` directory (all imports updated). `components/MandelbulbScene.tsx` removed cleanly.
- **Unused exports:** Minimal — `applyBias()` in `colorUtils.ts` is internal-only (not a real issue).
- **Unused dependencies:** None. `three-stdlib` is a transitive dep of `@react-three/drei`; direct dep kept for explicit version pinning (see Section 12.2).
- **Duplicate utilities:** ✅ Fixed — `GraphAlgorithms.ts` renamed to `keyframeViewBounds.ts` (see Section 12.1). `graphAlg.ts` is the actual graph algorithm file.
- **Commented-out code blocks:** None found. All large comment blocks are documentation.

## 9. Error Handling Audit (2026-03-13)

### 9.1 Silent Error Swallowing — Bare `catch {}` Blocks

**14 instances** across 7 files. Categorized by severity.

#### HIGH — User-facing operations silently fail

| File | Line | Context | Swallowed Error | Risk | Recommendation |
|------|------|---------|-----------------|------|----------------|
| `features/audioMod/AudioAnalysisEngine.ts` | 135 | `connectSystemAudio()` — `getDisplayMedia()` for system audio capture | Permission denied, no audio tracks | User clicks "System Audio", nothing happens, no feedback | Add `console.error` + user-facing alert (matches `connectMicrophone()` pattern at line 112) |
| `features/fragmentarium_import/FormulaWorkshop.tsx` | 230 | `buildTransformResult()` in transform preview effect | Parse errors, invalid AST, missing mappings | Workshop shows stale output, user doesn't know transform failed | At minimum `console.warn('[Workshop] Transform failed:', _)` |

#### MEDIUM — Graceful degradation but zero visibility

| File | Line | Context | Swallowed Error | Risk | Recommendation |
|------|------|---------|-----------------|------|----------------|
| `engine/worker/renderWorker.ts` | 259 | Boot: `WEBGL_debug_renderer_info` query | Extension unsupported or GL context lost | GPU info returns `undefined` → main thread handles it | **OK as-is** — non-critical optional info. Add `// GPU info is optional` comment. |
| `engine/worker/renderWorker.ts` | 760 | `GPU_INFO` message handler — same extension query | Same as above | Same as above | **OK as-is** — same justification. |
| `engine/worker/WorkerExporter.ts` | 557 | `cancel()` — `encoder.close()` | Encoder already closed or errored | Cancel is a cleanup path; throwing would prevent `cleanup()` call | **OK as-is** — defensive teardown. Add `// encoder may already be closed` comment. |
| `utils/FormulaFormat.ts` | 101 | `parseGMF()` JSON fallback — `JSON.parse()` | Invalid JSON in legacy format attempt | Intentional: falls through to `throw new Error("Invalid GMF")` on next line | **OK as-is** — error IS propagated. Pattern is correct. |
| `features/fragmentarium_import/workshop/detection.ts` | 40 | V1 parser fallback — `GenericFragmentariumParser.parse()` | Unsupported syntax in legacy parser | Intentional: V1 parse is optional, V2 AST parser runs regardless | **OK as-is** — `v1Doc` stays `undefined`, handled downstream. |
| `features/fragmentarium_import/parsers/ast-parser.ts` | 396 | Helper function loop extraction — `parse(helper.raw)` | Malformed GLSL in helper | Intentional: loop info is optional enhancement | **OK as-is** — candidate still pushed, just without loop info. |

#### LOW — Fire-and-forget / best-effort

| File | Line | Context | Swallowed Error | Risk | Recommendation |
|------|------|---------|-----------------|------|----------------|
| `index.tsx` | 14 | Service worker cleanup `.catch(() => {})` | SW API unavailable | None — cleanup of legacy SW | **OK as-is** |
| `components/ShaderDebugger.tsx` | 95, 122 | `navigator.clipboard.writeText().catch(() => {})` | Clipboard API blocked by permissions | Already handled: `document.execCommand('copy')` runs first as fallback | **OK as-is** |

#### Summary

| Severity | Count | Action needed |
|----------|-------|---------------|
| HIGH | 2 | Add error logging/user feedback |
| MEDIUM | 6 | 2 need comments, 4 are correct patterns |
| LOW | 3 | No action needed |
| **Total** | **13** | **2 require fixes** |

### 9.2 Unhandled Async — `await` Without Error Handling

Audited **60+ `await` calls** across 19 files. Most are properly wrapped. Notable gaps:

#### Unprotected async paths

| File | Line(s) | Async call | Wrapper | Risk | Recommendation |
|------|---------|------------|---------|------|----------------|
| `components/topbar/RenderTools.tsx` | 88 | `toggleRenderMode()` — `await setTimeout` then `state.setRenderMode()` | None | `setRenderMode()` is sync Zustand, the `await` is just a yield — no error possible | **OK as-is** — cosmetic async |
| `components/topbar/SystemMenu.tsx` | 106 | `handleFileSelect()` — `await setTimeout` before try/catch | None around the initial `setTimeout` | The `setTimeout` cannot reject; real work is inside `try` block | **OK as-is** |
| `components/WorkerTickScene.tsx` | 69-89 | `checkReady()` — polling loop with `await setTimeout` | None | Infinite loop if `proxy.isBooted` never becomes true | Add a timeout counter (e.g., 30s max) to prevent zombie polling |
| `components/timeline/RenderPopup.tsx` | 417 | `await setTimeout(100)` before export try/catch | None around the yield | Cannot reject | **OK as-is** |

#### Well-handled async (audit confirms coverage)

| File | Pattern | Notes |
|------|---------|-------|
| `engine/FractalEngine.ts` | `performCompilation()` | Wrapped in try/catch at line 400, emits `IS_COMPILING false` on error |
| `engine/worker/WorkerExporter.ts` | `finish()` | try/catch at line 530, posts `EXPORT_ERROR` message on failure |
| `components/panels/formula/FormulaSelect.tsx` | `fetchGallery()`, `handleGallerySelect()` | Both wrapped, with user alerts on failure |
| `components/LoadingScreen.tsx` | `handleFile()` | Wrapped, alerts on failure |
| `components/topbar/SystemMenu.tsx` | `handleFileSelect()` | Wrapped, shows error status |
| `components/topbar/CameraTools.tsx` | `handleSnapshot()` | Double-wrapped: inner catch for metadata, outer for snapshot. Fallback to raw image. |
| `engine/BucketRenderer.ts` | `toBlob` callback | Wrapped, falls back to `canvas.toDataURL()` |
| `engine/worker/WorkerProxy.ts` | `injectMetadata` | Wrapped, same fallback pattern |
| `engine/worker/WorkerProxy.ts` | Texture transfer `.catch()` | Logs error with `[WorkerProxy]` prefix |
| `features/audioMod/AudioAnalysisEngine.ts` | `connectMicrophone()` | Wrapped, alerts user on denial |
| `features/webcam/WebcamOverlay.tsx` | `getUserMedia()` | Wrapped, shows error message in UI |

### 9.3 Worker Error Propagation

The worker communication layer has **good error propagation**:

| Path | Mechanism | Coverage |
|------|-----------|----------|
| `renderWorker.ts` top-level message handler | Outer `catch` at line 826 → posts `{ type: 'ERROR', message }` | Catches any unhandled error in the entire message switch |
| Export frame rendering | `catch` at line 786 → posts `{ type: 'EXPORT_ERROR', message }` | Per-frame error reporting |
| `WorkerExporter.finish()` | `catch` at line 544 → posts `{ type: 'EXPORT_ERROR', message }` + calls `cleanup()` | Clean teardown on finalize failure |
| `WorkerExporter` muxer chain | `catch` at line 517 → logs + calls `cancel()` | Prevents stuck export on mux errors |
| `WorkerProxy` main-thread receiver | Message type switch handles `ERROR` and `EXPORT_ERROR` types | Surfaces worker errors to UI layer |

**No gaps remaining.** `worker.onerror` handler exists in `WorkerProxy` (lines 113-116 and 175-178).

### 9.4 Overall Assessment

| Area | Grade | Notes |
|------|-------|-------|
| Video export pipeline | **A** | Both exporters have try/catch at every async boundary, error messages propagated to UI |
| File I/O (load/save) | **A** | All paths wrapped with user-facing error messages + fallbacks |
| Worker communication | **A** | Good message-level error propagation; `worker.onerror` handler in place |
| Shader compilation | **A** | Generation counter prevents stale compiles; errors caught and emitted |
| Audio subsystem | **A** | ✅ Fixed — `connectSystemAudio()` now has error handling matching `connectMicrophone()` |
| Frag importer workshop | **A-** | ✅ Fixed — Transform preview now logs warnings on failure |
| Silent catch blocks | **A-** | 11 of 13 are justified patterns; 2 HIGH fixes applied |

### 9.5 Recommended Fixes — ✅ All Applied

1. ✅ **`AudioAnalysisEngine.ts:135`** — Added `console.error` + `alert()` matching `connectMicrophone()` pattern
2. ✅ **`FormulaWorkshop.tsx:230`** — Added `console.warn('[Workshop] Transform preview failed:', _)`
3. ✅ **`WorkerProxy` constructor** — `worker.onerror` handler already existed (lines 113-116, 175-178)
4. ✅ **`WorkerTickScene.tsx:69`** — Added 30s timeout (300 iterations × 100ms) to boot-polling loop

## 10. Camera State & Initialization Audit (2026-03-16)

### 10.1 Unified Camera Coordinate System (Completed)

As of 2026-03-16, the camera coordinate system has been **unified across Orbit and Fly modes**. See `docs/01_System_Architecture.md` Section 6 for the full architecture.

**Key invariants established:**
- `cameraPos` in store is always `{0, 0, 0}` — all world position lives in `sceneOffset`
- `targetDistance` always means physics-based surface distance (never orbit radius)
- `VirtualSpace.updateSmoothing()` has no `isOrbit` parameter — unified path
- Engine, animation, camera manager, and preset system are fully mode-agnostic
- `cameraMode` in `renderState` is informational only — zero engine-level branching

**Camera state locations (post-unification):**

| State | Zustand Store | Engine (VirtualSpace) | WorkerProxy Shadow | R3F Camera |
|-------|--------------|----------------------|-------------------|------------|
| Position | `cameraPos` (always 0,0,0) | — | — | `camera.position` (0 between orbit interactions) |
| Rotation | `cameraRot` | — | — | `camera.quaternion` |
| Scene Offset | `sceneOffset` | `virtualSpace.offset` | `_localOffset` | (implicit via shadow unified ref) |
| Target Distance | `targetDistance` (surface) | `lastMeasuredDistance` | `_shadow.lastMeasuredDistance` | `distAverageRef` |

**Source of truth (unchanged):**
- **Interactive orbit/fly:** R3F camera → engine (via RENDER_TICK) → store (debounced, normalized)
- **Teleport (undo/preset/camera switch):** Store → `camera_teleport` event → R3F + engine simultaneously
- **Animation playback:** Engine updates directly, store synced on stop

### 10.2 Remaining Issues

#### ✅ RESOLVED — Stale store state during animation

Fixed: `AnimationEngine.tick()` scrubs final frame; `bindStoreToEngine()` force-saves camera on animation stop.

#### ✅ RESOLVED — `targetDistance` semantic ambiguity

Fixed: `targetDistance` is now **always** physics-based surface distance. The orbit-radius override (`if (mode === 'Orbit') dist = camera.position.length()`) has been removed from Navigation.tsx. The debounced store write always uses `engine.lastMeasuredDistance` with a sky/miss sentinel guard (`>= 1000.0`). `orbitRadiusRef` tracks orbit radius as a local Navigation ref, never persisted to store.

#### ✅ RESOLVED — `isOrbit` branching in VirtualSpace

Fixed: `updateSmoothing()` in `PrecisionMath.ts` no longer takes an `isOrbit` parameter. Both modes use the unified lerp path. The `isOrbit` argument was also removed from the call site in `FractalEngine.ts`.

#### ✅ RESOLVED — `cameraPos` store field was always (0,0,0)

Fixed: Removed `cameraPos` from `FractalStoreState`. World position lives exclusively in `sceneOffset`. The field remains in the `Preset` type (`types/fractal.ts`) for backwards-compatible serialization — formula defaults carry non-zero `cameraPos` which `applyPresetState()` absorbs into `sceneOffset` on load. All runtime consumers (scene_widgets, CameraManagerPanel, timelineUtils, Navigation, WorkerDisplay, useAppStartup) were updated to use `sceneOffset` directly.

#### MEDIUM — Offset guard has no timeout

**Location:** [WorkerProxy.ts:44-46](engine/worker/WorkerProxy.ts#L44-L46)

`_offsetGuarded` prevents `FRAME_READY` from overwriting `_localOffset` during teleports. Guard is set by `setShadowOffset()` and cleared by first `FRAME_READY` after sync. If the worker crashes or hangs, the guard persists forever — gizmo overlays render at stale position.

**Fix:** Add a timeout (e.g., 2s) that auto-clears the guard.

#### MEDIUM — Rapid teleport collision during preset load

**Sequence:**
1. `loadPreset()` calls `applyPresetState()` → emits `camera_teleport`
2. `selectCamera()` → emits another `camera_teleport`
3. Both events fire in same microtask → Navigation's `onTeleport` handler runs twice
4. Second update may overwrite with saved camera state before first fully propagated

**Impact:** Rare but can cause a 1-frame camera jump during preset load.

### 10.3 Store Initialization Race Conditions

#### Boot Sequence (actual order)

```
1. App.tsx renders
   ├─ EngineBridge mounts → bindStoreToEngine() (subscriptions created)
   ├─ ViewportArea mounts → WorkerDisplay mounts → initWorkerMode()
   └─ useAppStartup effect → loadPreset() (synchronous Zustand update)
2. LoadingScreen triggerBoot() → bootEngine() → setTimeout(50ms)
3. After 50ms: read store → proxy.bootWithConfig(config)
4. Worker receives BOOT → engine.bootWithConfig() → shader compile → BOOTED
5. WorkerTickScene detects isBooted → rendering begins
```

#### RC-1: Subscriptions created before worker exists

**Location:** [EngineBridge.tsx:16-22](components/EngineBridge.tsx#L16-L22) → [fractalStore.ts:378-412](store/fractalStore.ts#L378-L412)

`bindStoreToEngine()` creates Zustand subscriptions immediately on mount. These forward state to the worker via `proxy.post()`. But the worker doesn't exist yet — `initWorkerMode()` hasn't run.

**Mitigation (already in place):** `WorkerProxy.post()` at line 312 silently no-ops when `_worker` is null. Messages are lost but this is acceptable because the initial config is sent via the BOOT message.

**Residual risk:** LOW — the BOOT message includes full config. Lost subscription-driven messages before boot are redundant.

#### RC-2: loadPreset timing vs. initWorkerMode

**Location:** [useAppStartup.ts:63-109](hooks/useAppStartup.ts#L63-L109) vs [WorkerDisplay.tsx:36-81](components/WorkerDisplay.tsx#L36)

Both run as empty-dep `useEffect` hooks in different components. React does NOT guarantee execution order for effects across components. `WorkerDisplay.initWorkerMode()` reads store state to build an initial config — but `useAppStartup.loadPreset()` may not have hydrated the store yet.

**Mitigation (already in place):** The worker doesn't compile from the INIT config. It waits for the BOOT message (sent after the 50ms delay), which reads the fully-hydrated store.

**Residual risk:** LOW — INIT only creates the GL context. BOOT carries the real config.

#### RC-3: 50ms setTimeout boot assumption

**Location:** [useAppStartup.ts:31](hooks/useAppStartup.ts#L31)

`bootEngine()` uses `setTimeout(50ms)` to yield to other effects. The comment explicitly acknowledges this:
> "Yield to allow other useEffects to hydrate the store before we read it."

**Risk:** If any effect takes >50ms (unlikely for synchronous store operations, but possible with slow `parseShareString()` from URL), boot reads incomplete state.

**Practical risk:** LOW — `loadPreset()` is synchronous and runs in a same-tick effect. The 50ms is more than enough. But the pattern is fragile.

**Fix (if ever needed):** Replace setTimeout with explicit "store hydrated" signal (e.g., a ref set by `useAppStartup` that `bootEngine` checks).

#### RC-4: renderMode subscription without fireImmediately guard

**Location:** [fractalStore.ts:407-412](store/fractalStore.ts#L407-L412)

```ts
useFractalStore.subscribe(state => (state as any).lighting?.renderMode, (val) => {
    const mode = val === 1.0 ? 'PathTracing' : 'Direct';
    if (useFractalStore.getState().renderMode !== mode) {
        useFractalStore.setState({ renderMode: mode });
    }
});
```

No `{ fireImmediately: false }` specified. If `lighting` feature hasn't initialized its `renderMode` yet, `val` is `undefined` → `mode` resolves to `'Direct'` → no-op if store already has `'Direct'`. Practically safe due to the equality check, but should have an explicit guard.

#### RC-5: Dual OFFSET_SET on boot

**Locations:** [useAppStartup.ts:47-55](hooks/useAppStartup.ts#L47-L55) and [WorkerDisplay.tsx:70-79](components/WorkerDisplay.tsx)

Both send `OFFSET_SET` to the worker during initialization. If they read different store states (due to RC-2 timing), the worker receives conflicting offsets.

**Practical risk:** LOW — both read the same store snapshot (Zustand is synchronous). But the duplication is unnecessary.

### 10.4 Summary

| # | Severity | Issue | Impact | Fix Effort |
|---|----------|-------|--------|------------|
| 1 | ✅ | Store camera stale after animation | Fixed: `AnimationEngine.tick()` scrubs final frame; `bindStoreToEngine()` force-saves camera on animation stop | Done |
| 2 | ✅ | `targetDistance` semantic ambiguity | Fixed: always surface distance, orbit-radius override removed, debounced write uses `engine.lastMeasuredDistance` | Done |
| 3 | ✅ | Offset guard no timeout | Fixed: `WorkerProxy.setShadowOffset()` auto-clears after 2s | Done |
| 4 | ✅ | `isOrbit` branching in VirtualSpace | Fixed: `updateSmoothing()` unified, no mode parameter | Done |
| 5 | ✅ | Unified canonical state | Fixed: store always writes `cameraPos=(0,0,0)`, all position in `sceneOffset` | Done |
| 6 | ✅ | Rapid teleport collision | Not an issue: `applyPresetState` sets `activeCameraId` via direct `set()`, not `selectCamera()` — no second teleport event | N/A |
| 7 | LOW | Subscriptions before worker | Messages lost silently | Already mitigated — BOOT carries config |
| 8 | LOW | loadPreset vs initWorkerMode order | Worker INIT with stale config | Already mitigated — BOOT is authoritative |
| 9 | LOW | 50ms setTimeout assumption | Fragile but practically safe | Low — add explicit ready signal |
| 10 | ✅ | renderMode subscription timing | Fixed: added `if (val === undefined) return` guard in `fractalStore.ts` | Done |
| 11 | ✅ | Dual OFFSET_SET on boot | Fixed: removed duplicate from `WorkerDisplay.tsx` — `useAppStartup.ts` is authoritative | Done |

### 10.5 Architectural Observation

The codebase uses **event-driven synchronization** (via `FractalEvents`) with clear ownership rules:
- **R3F camera** = truth during interactive input (orbit or fly)
- **Engine/worker** = truth during animation playback and export
- **Store** = truth for persistence (presets, undo, camera manager)

The unified coordinate system ensures all three agree on canonical form: `position=(0,0,0)`, world position in `sceneOffset`, `targetDistance` = surface distance. Navigation's debounced store write normalizes on every interaction end. Teleport events propagate canonical state to all consumers simultaneously.

**Remaining gap:** During orbit interactions, `camera.position` is temporarily non-zero. The store is not updated until the debounced write fires (~100ms after interaction end). Code reading `store.cameraPos` during an orbit drag will see stale `(0,0,0)`. This is acceptable because the shadow unified offset in Navigation and `VirtualSpace.getUnifiedCameraState()` always return the correct live position.

## 11. Shader Magic Numbers Audit (2026-03-13)

### Overview

Audited all 19 shader chunk files (`shaders/chunks/` and `shaders/chunks/lighting/`). Found **80+ undocumented or insufficiently explained numeric literals**. Classified by impact and acted on the highest-value items directly.

### Fixes Applied (Small Wins)

#### Named Constants Added (`math.ts`)
- `INV_TAU` (0.15915494 = 1/2π) and `INV_PI` (0.31830989 = 1/π) defined as `#define` constants
- Replaced **7 raw literals** across 4 files: `de.ts` (3), `coloring.ts` (1), `material_eval.ts` (2), `lighting/env.ts` (1)

#### Source Attribution Comments Added
| File | Function/Algorithm | Source |
|------|--------------------|--------|
| `math.ts` | `ign_noise()` | Jimenez 2014, "Next Generation Post Processing in Call of Duty" |
| `math.ts` | `hash21()` | Dave Hoskins (shadertoy.com/view/4djSRW) |
| `math.ts` | `taylorInvSqrt()` | Perlin's fast approximation to 1/sqrt |
| `math.ts` | `snoise()` | Stefan Gustavson (github.com/stegu/webgl-noise) |
| `math.ts` | Simplex constants (42.0, 1/7, 7×7 grid) | Perlin's empirical normalization |
| `math.ts` | `getLength()` distance metrics | Documented: Euclidean, Chebyshev, Manhattan (with 1/√3 scale), Quartic |

#### Inline Comments Added (30+ locations)
| File | Constants Documented |
|------|---------------------|
| `de.ts` | Bailout +100 buffer rationale, color mode 8 = LLI decomposition |
| `trace.ts` | Adaptive precision ratios (5e-7 = 0.5ppm, 1e-5 = 10ppm), convergeFactor 0.8, hash constants (127.1, 31.7) |
| `pathtracer.ts` | min roughness 0.04 (GGX stability), F0 = 0.04 (dielectric reflectance), Russian roulette parameters, firefly clamp, specular probability tuning |
| `material_eval.ts` | Precision floor 0.5ppm, bump gradient step size, 10x bump amplification |
| `main.ts` | Sanitize clamp 200.0 (HDR range for tone mapping) |
| `post.ts` | Fog threshold 990 < MAX_DIST(1000) |
| `lighting/env.ts` | Full procedural sky annotated: sun/rim power ranges, desaturation, mip bias = 6 levels |
| `lighting/pbr.ts` | Directional light distance 100, degenerate light skip |
| `lighting/shadows.ts` | Hard shadow hit threshold 0.05% of ray distance |

### Remaining (Not Yet Documented)

#### High Impact — Should Be Named Constants

| Literal | Files | Purpose | Recommended Name |
|---------|-------|---------|-----------------|
| `5.0e-7` | `trace.ts`, `material_eval.ts`, `pathtracer.ts` | Precision ratio | `PRECISION_RATIO_HIGH` |
| `1.0e-5` | `trace.ts` | Low-precision ratio | `PRECISION_RATIO_LOW` |
| `0.0001` | `pathtracer.ts`, `pbr.ts` (×4) | GGX denominator safety | `GGX_EPSILON` |
| `1000.0` | `main.ts`, `trace.ts`, `post.ts`, `shading.ts` | Miss/far distance | Use `MAX_DIST` consistently |
| `100.0` | `pbr.ts`, `pathtracer.ts` | Directional light distance | `DIR_LIGHT_DIST` |

#### Medium Impact — Should Have Comments

| Category | Count | Examples |
|----------|-------|---------|
| Noise decorrelation seeds | ~12 | `17.123`, `23.456`, `7.31`, `11.17`, `7.43` in pathtracer/volumetric |
| PBR tuning parameters | ~8 | Schlick-GGX 0.5 factor, specular probability 0.4 blend, clamp range 0.05–0.95 |
| Hardcoded colors | ~4 | Rim light `vec3(0.5, 0.7, 1.0)`, sky gradients |
| Bokeh parameters | 3 | 6-blade polygon, 0.26 rotation, 1.3 anamorphic squash |

#### Low Impact — Acceptable As-Is

| Category | Count | Reason |
|----------|-------|--------|
| ACES coefficients | 5 | Industry-standard, well-known |
| Luminance weights (BT.709) | 3 | Documented standard |
| Simplex geometry constants | 4 | Standard from Gustavson's reference |
| Standard clamp/remap patterns | ~10 | `x * 0.5 + 0.5`, `step(0.5, x)`, etc. |

### Recommended Next Steps

1. ✅ **Extract precision ratios, GGX_EPSILON, DIR_LIGHT_DIST, MISS_DIST** into `math.ts` — replaced 12 scattered literals across `trace.ts`, `material_eval.ts`, `pbr.ts`, `pathtracer.ts`, `main.ts`, `post.ts`
2. ✅ **Document noise seeds** — coprime decorrelation comment added at `pathtracer.ts` bounce loop; explains 17.123/23.456/7.31/11.17 as mutually irrational Halton-style offsets

## 12. Minor Cleanup Audit (2026-03-13)

### 12.1 `GraphAlgorithms.ts` vs `graphAlg.ts` — Naming Confusion ✅ Fixed

**Problem:** Two files with similar names but unrelated responsibilities:
- `utils/GraphAlgorithms.ts` — `calculateViewBounds()` for keyframe dope sheet view bounds. **Not a graph algorithm.**
- `utils/graphAlg.ts` — actual graph algorithms: `hasCycle()`, `topologicalSort()`, `pipelineToGraph()`, `isStructureEqual()`

**Fix applied:** Renamed `GraphAlgorithms.ts` → `keyframeViewBounds.ts`. Updated the single import in `components/GraphEditor.tsx`.

### 12.2 `three-stdlib` Dependency — Assessed, No Action

**Status:** `package.json` lists `three-stdlib` as a direct dependency. Only one source file imports from it:
- `components/Navigation.tsx:5` — `import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'`

**Finding:** `@react-three/drei` (already a dependency) **itself depends on `three-stdlib`** and re-exports `OrbitControlsImpl` as the ref type of its `<OrbitControls>` component. The direct `package.json` dep is technically redundant since it's a transitive dep of drei.

**Decision:** Keep the direct dependency. Removing it risks version mismatch if drei's internal `three-stdlib` version drifts from what the type import expects. The cost is zero (already installed via drei), and pinning it directly makes the dependency explicit.

Added a comment to `Navigation.tsx` explaining the provenance of the type.

### 12.3 Audit Complete — Final Inventory

All planned audit sections have been completed:

| Section | Audit | Status |
|---------|-------|--------|
| S1+S2 | `any` types (452) + `@ts-ignore` (22) | ✅ Full per-file triage |
| S3 | Console statements (89) | ✅ Keep/gate/remove classified |
| S4 | File complexity (9 files > 700 lines) | ✅ Split plans documented |
| S6 | Error handling gaps (60+ await calls) | ✅ Coverage confirmed |
| S7 | Minor cleanup | ✅ GraphAlgorithms renamed, three-stdlib assessed |
| S9 | Silent error swallowing (14 bare catches) | ✅ 2 HIGH, 12 justified |
| S10 | Camera state duplication | ✅ 4 locations mapped, sync gaps documented |
| S11 | Shader magic numbers (80+ literals) | ✅ 30+ comments added, `INV_TAU`/`INV_PI` extracted |
| S12 | Store initialization races (9 potential) | ✅ Most mitigated, 2 real gaps documented |
