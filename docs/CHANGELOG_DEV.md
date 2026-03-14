# GMT Development Changelog (v0.8.9 dev)

Chronological log of significant changes during the v0.8.9 development cycle (uncommitted on `dev` branch).

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
