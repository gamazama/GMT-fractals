
# Code Health Report

**Status:** Stable (Post-DDFS Refactor & Cleanup)
**Last Updated:** 2026-03-03

## 1. Architecture ✅
The codebase has been successfully migrated to the **Data-Driven Feature System (DDFS)**.
*   **Redundancy:** Removed. Legacy manual event subscriptions in `fractalStore.ts` have been replaced by the automated `createFeatureSlice` logic which handles `onUpdate: 'compile'` triggers generically.
*   **Extensibility:** High. Adding a new feature no longer requires touching the Engine or UI core.
*   **Uniformity:** "Lite Mode" and many mobile-related precision checks have been unified into the `quality` feature (`precisionMode`, `bufferPrecision`). Note: a runtime `isMobile` hint still flows through the config/engine (used by `FractalEngine`/`ConfigManager` and some shader chunks) — it was not fully removed. Use the `quality` feature for precision decisions and treat `isMobile` as a runtime capability hint.

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

## 3. Technical Debt

### High Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **`any` Type Usage (Category 3)** | ~85 instances in engine plumbing (`ConfigManager`, `UniformManager`, `fractalStore`, `AnimationEngine`) | Type safety in engine internals | Implement `FeatureStateMap` — deferred intentionally, see Section 4 |

### Medium Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Console Statements** | ~17 instances in engine folder | Debug noise in production | Review remaining logs; keep error handlers |

### Low Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Mobile UI** | Auto-generated panels | Cramped layout on vertical screens | CSS tuning needed |
| **Duplicate JSX Types** | `types.ts` lines 14-75 | Maintenance overhead | Consider using `@react-three/fiber` types |

## 4. `any` Type Analysis

`any` instances are categorised into three groups:

### Category 1: Third-party library gaps (~15 instances) — Leave as-is
`(this.renderer as any).properties`, `(rot as any)._x`, `value.buffer as any`. These access Three.js internals or untyped library APIs. Not worth fighting.

### Category 2: Lazy typing (~40 instances) — ✅ Fixed 2026-03-03
All developer-facing API surfaces have been given precise types:
- `inject(config: ShaderConfig)` — was `any`
- `ParamCondition.eq/neq: string | number | boolean` — was `any`
- `ParamOption.value: string | number | boolean` — was `any`
- `ParamConfig.format: (value: unknown) => string` — was `any`
- `FractalEngine.compileTimer: ReturnType<typeof setTimeout> | null` — was `any`
- `handleInput(event: EngineInputEvent)` — was `any`; now a discriminated union

### Category 3: Structural DDFS dynamics (~85 instances) — Deferred
Every `(state as any)[feat.id]` in `ConfigManager`, `UniformManager`, `fractalStore`, `AnimationEngine`. These exist because no type maps feature IDs (`'lighting'`, `'ao'`) to their state types at compile time.

**Fix:** A `FeatureStateMap` interface in `features/types.ts` mapping all feature IDs to state types, then intersect with `ShaderConfig` and `FractalStoreState`.

**Why deferred:** Adding this map requires a new entry per feature. Since feature authoring is the primary developer activity, adding friction there has outsized cost. Revisit if engine contributors increase.

## 5. Console Statement Analysis ✅ Cleaned up 2026-03-03

Active debug dumps (getMaterial stack trace, recompilation trace, scheduleCompile/performCompilation progress logs, UniformManager resize) removed. Compile time log timing fixed to measure GPU rendering only.

### Compile-Time Logs (Kept)
| File | Purpose |
|------|---------|
| `engine/FractalEngine.ts` | GPU shader compile time (measured from first render call only) |
| `engine/MaterialController.ts` | Shader generation size/hash for Direct and PathTracing modes |
| `engine/ConfigManager.ts` | Logs which param triggered a shader rebuild; formula change |
| `engine/FractalEngine.ts` | Boot message (once per session) |
| `engine/FractalEngine.ts` | HalfFloat16 alpha support capability check (once per session) |

### Error Handlers (Keep)
| File | Purpose |
|------|---------|
| `utils/UrlStateEncoder.ts` | URL encoding/decoding errors |
| `utils/Sharing.ts` | Share string errors |
| `engine/VideoExporter.ts` | Video export errors + finalization progress |
| `engine/LoadingRenderer.ts` | Shader compile error |
| `engine/BucketRenderer.ts` | Metadata injection error |
| `features/audioMod/AudioAnalysisEngine.ts` | Mic access denied |

### Warnings (Keep)
| File | Purpose |
|------|---------|
| `engine/FractalRegistry.ts` | Unknown alias registration |
| `engine/AnimationEngine.ts` | Missing setter warning |
| `engine/VideoExporter.ts` | SPS/PPS wait warning |
| `engine/BucketRenderer.ts` | Bucket render warnings |
| `engine/RenderPipeline.ts` | Pixel readback failure |
| `engine/GLSLToJS.ts` | Formula DE extraction failure |

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

### Short Term (Medium Effort)
1. Create typed state accessor utility for DDFS (reduce 141+ `any` instances)

### Long Term (High Effort)
1. Generate TypeScript types from `FeatureRegistry` for full type safety
2. Implement comprehensive test suite
3. Consider migrating to `@react-three/fiber` built-in JSX types
