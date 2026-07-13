---
source: engine-gmt/features/index.ts
lines: 109
last_verified_sha: 014731eeefbe00d82118faf651c84740f28be80b
additional_sources:
  - engine-gmt/features/types.ts
  - engine-gmt/features/ui.tsx
  - engine-gmt/features/core_math.ts
  - engine-gmt/features/lighting/index.ts
  - engine-gmt/features/lighting/light_spheres.ts
  - engine-gmt/features/geometry/index.ts
  - engine-gmt/features/geometry/folds/index.ts
  - engine-gmt/features/coloring/index.ts
  - engine-gmt/features/volumetric/index.ts
  - engine-gmt/features/interlace/index.ts
  - engine-gmt/features/interlace/glslRewriter.ts
  - engine-gmt/features/fragmentarium_import/index.ts
  - engine-gmt/features/atmosphere/index.ts
  - engine-gmt/features/ao/index.ts
  - engine-gmt/features/reflections/index.ts
  - engine-gmt/features/drawing/index.ts
  - engine-gmt/features/engine/index.ts
  - engine-gmt/features/camera_manager/index.ts
  - engine-gmt/features/droste/index.ts
  - engine-gmt/features/materials.ts
  - engine-gmt/features/texturing.ts
  - engine-gmt/features/quality.ts
  - engine-gmt/features/navigation.ts
  - engine-gmt/features/optics.ts
  - engine-gmt/features/water_plane.ts
audited: 2026-05-20T09:30:00Z
audited_by: claude-opus-4-7
public_api:
  - registerFeatures
  - registerGmtUi
  - FeatureStateMap
  - FeatureCustomActions
  - CoreMathFeature
  - GeometryFeature
  - InterlaceFeature
  - LightingFeature
  - LightSpheresFeature
  - AOFeature
  - ReflectionsFeature
  - AtmosphereFeature
  - VolumetricFeature
  - MaterialFeature
  - WaterPlaneFeature
  - ColoringFeature
  - TexturingFeature
  - QualityFeature
  - DrosteFeature
  - OpticsFeature
  - NavigationFeature
  - CameraManagerFeature
  - DrawingFeature
  - EngineSettingsFeature
  - FOLD_LIST
  - REFL_MODE_OFF
  - REFL_MODE_ENV
  - REFL_MODE_RAYMARCH
  - detectFormulaV3
  - transformFormulaV3
  - analyzeSource
  - generateFormula
  - FormulaWorkshop
  - buildWorkshopParams
depends_on:
  - e01-feature-system
  - g02-shader-pipeline
  - g09-modular-graph
---

# engine-gmt features

GMT-specific DDFS (Data-Driven Feature System) registrations: every feature, widget, panel, and overlay-phase tick that GMT layers on top of the engine-core feature system. Boot-time entry points are two zero-argument functions: `registerFeatures()` populates the `featureRegistry` with 26 feature definitions (20 GMT-local + 6 engine-core shared by module identity), and `registerGmtUi()` populates the `componentRegistry` with GMT-specific widgets and bespoke panels.

## Public API

- `registerFeatures()` — boot-time registration entry. Calls `featureRegistry.register(...)` for 20 GMT-local features plus 6 engine-core features (`PostEffectsFeature`, `ColorGradingFeature`, `AudioFeature`, `ModulationFeature`, `WebcamFeature`, `DebugToolsFeature`) re-imported by module identity. (`engine-gmt/features/index.ts:43-79`)
- `registerGmtUi()` — UI-component registration entry, called once at app boot after engine-core's `registerUI()`. Registers GMT widgets (`coloring-histogram`, `julia-randomize`, `formula-select`, …), overlay components and their OVERLAY-phase ticks (`overlay-lighting` + `lightGizmoTick`, `overlay-drawing` + `drawingOverlayTick`), and bespoke `panel-*` components (`panel-engine`, `panel-cameramanager`, `panel-graph`). (`engine-gmt/features/ui.tsx:139-177`)
- `FeatureStateMap` — type-level master state map (19 slices). Consumed by `createFeatureSlice` and store typing. (`engine-gmt/features/types.ts:26-46`)
- `FeatureCustomActions` — union interface mixing `DrawingActions`, `ModulationActions`, `LightingActions`. (`engine-gmt/features/types.ts:49-50`)
- Per-feature state types are re-exported via `export type { … }` for store typing — `isolatedModules` requirement. (`engine-gmt/features/index.ts:85-109`)
- `FOLD_LIST` — ordered fold-definition array (9 folds; index = `hybridFoldType` param value). (`engine-gmt/features/geometry/folds/index.ts:14-24`)
- `REFL_MODE_OFF` / `REFL_MODE_ENV` / `REFL_MODE_RAYMARCH` — reflection-mode constants used by `ReflectionsFeature` inject. Value `2.0` was SSR (removed; legacy presets fold to `ENV`). (`engine-gmt/features/reflections/index.ts:7-10`)
- `fragmentarium_import` barrel — public-facing V3-importer API. Not a registered feature. Exports `detectFormulaV3`, `transformFormulaV3`, `analyzeSource`, `generateFormula`, the `FormulaWorkshop` React entry, `buildWorkshopParams` + helpers, and importer types. (`engine-gmt/features/fragmentarium_import/index.ts:1-24`)

## Architecture

Three registration surfaces are paired and only co-touched when a feature needs new state typing or new components:

1. **State features** — `engine-gmt/features/index.ts:43-79`. Every `FeatureDefinition` instance enters here.
2. **UI components** — `engine-gmt/features/ui.tsx:139-177`. Widgets, overlays, and bespoke panels enter the `componentRegistry` here. Two ticks (`lightGizmoTick`, `drawingOverlayTick`) register into the OVERLAY phase of the engine's `TickRegistry`. (`engine-gmt/features/ui.tsx:158, 161`)
3. **Type augmentations** — `engine-gmt/features/types.ts:26-50`. State-slice and action-union typing.

**Engine-core sharing by module identity.** `PostEffectsFeature`, `ColorGradingFeature`, `AudioFeature`, `ModulationFeature`, `WebcamFeature`, `DebugToolsFeature` are imported directly from `engine/features/*` rather than copied. `featureRegistry.register` short-circuits on identical refs (`existing === def`). The 26–34 line comment block documents that the prior "carry GMT copies" approach produced six "Replacing definition" warnings AND a subtle Map insertion-order regression that broke `uToneMapping` declaration order during post-pass compile. (`engine-gmt/features/index.ts:26-40`)

**CoreMath = formula injection orchestrator.** `CoreMathFeature.inject` (`engine-gmt/features/core_math.ts:152-235`) consumes `config.formula`, `config.quality.estimator`, `config.pipeline`, `config.graph`, `config.interlace.*` and emits the `formula_*()` function + `loopBody` + `loopInit` + `getDist`. The `generateGetDist(estimatorType, supportsCuttingPlane)` selector at `engine-gmt/features/core_math.ts:33-100` covers five estimators (Analytic / Linear / Pseudo / Dampened / Linear2) plus a 5th cutting-plane DE branch that reads `cp_dmin`/`cp_trap` written by formula bodies — falls back to Linear if the formula lacks `shader.supportsCuttingPlane`.

**Cutting-plane preamble dedup contract.** `engine-gmt/features/core_math.ts:110-120` declares `cp_dmin/cp_scale/cp_trap` globals via `builder.addPreamble(CP_PREAMBLE)` whenever EITHER side of an interlace pair has `shader.supportsCuttingPlane` (`engine-gmt/features/core_math.ts:186-225`). A mirror exists in `engine/SDFShaderBuilder.ts` for the mesh-export path; both must declare identically. `addPreamble` dedupes by exact string, so multiple call paths are safe.

**Modular formula special-casing.** When `formula === 'Modular'`, CoreMath adds the `PIPELINE_REV` define (forces recompile on graph edits), declares `uModularParams[MAX_MODULAR_PARAMS]`, calls `compileGraph(pipeline, graph.edges)` → `formula_Modular()`, and installs a `distOverride` short-circuit hook so Modular nodes can break the iteration loop with `distOverride < 999.0`. (`engine-gmt/features/core_math.ts:157-208`)

**Self-contained SDE bridge.** Formulas with `shader.selfContainedSDE` (MandelTerrain et al.) emit `SKIP_PRE_BAILOUT` + `SELF_CONTAINED_SDE` defines. Downstream features (geometry burning at `engine-gmt/features/geometry/index.ts:456-461`, coloring orbit-trap pre/post inject at `engine-gmt/features/coloring/index.ts:377-389`) gate themselves off `SELF_CONTAINED_SDE` to prevent outer-loop contamination of the formula's inner coordinate system. (`engine-gmt/features/core_math.ts:171-175`)

**DDFS `panelConfig` drives the compile/runtime UI split.** Features with a compile-toggle plus runtime-toggle pair declare `panelConfig: { compileParam, runtimeToggleParam, compileSettingsParams[], runtimeGroup, label, compileMessage, helpId }`. `CompilableFeatureSection` reads this and renders the recompile pill. Examples: geometry's `hybridCompiled` + `hybridMode` (`engine-gmt/features/geometry/index.ts:201-210`), volumetric's `ptVolumetric` + `volEnabled` (`engine-gmt/features/volumetric/index.ts:39-45`), interlace's `interlaceCompiled` + `interlaceEnabled` (`engine-gmt/features/interlace/index.ts:132-139`).

## Invariants

- **Registration order matters.** `LightSpheresFeature` MUST register after `LightingFeature` (declares its uniform arrays). The 9–22 line comment in `engine-gmt/features/lighting/light_spheres.ts:9-22` is the contract; `LightSpheresFeature.dependsOn = ['lighting']` enforces it.
- **Engine-core feature sharing requires module identity, not duplication.** Re-importing into engine-gmt causes "Replacing definition" warnings AND has historically broken Map insertion order during post-pass compile. (`engine-gmt/features/index.ts:26-40`)
- **`isolatedModules` requires `export type` for state re-exports.** Mixing value/type re-exports without explicit `type` keyword breaks Vite emit. (`engine-gmt/features/index.ts:82-109`)
- **Cutting-plane preamble must mirror `SDFShaderBuilder`.** `engine-gmt/features/core_math.ts:107-109` explicitly states `CP_PREAMBLE_GLOBALS` + cp_* init line must be kept in sync with `engine/SDFShaderBuilder.ts`. Mesh-export coupling.
- **Interlace cannot mix with Modular OR self-contained SDEs on either side.** All four refusal branches at `engine-gmt/features/interlace/index.ts:321-333`.
- **Geometric orbit-trap pre/post inject gated off `SELF_CONTAINED_SDE`.** Self-contained formulas accumulate the trap in their own inner loop; mixing outer-loop samples would corrupt the `min`. (`engine-gmt/features/coloring/index.ts:377-389`)
- **Hybrid Box runtime uniform `uHybrid` guards the pre-loop fold; interleaved swap is compile-baked** to avoid runtime branches the ANGLE/D3D11 optimizer was poorly predicating. (`engine-gmt/features/geometry/index.ts:430-501`)
- **AreaLights toggle triggers recompile** despite being labeled "runtime" — empirical fix for ANGLE/D3D11 predicating both `GetSoftShadow` and `GetHardShadow` paths inside the runtime `if (uAreaLights > 0.5)` branch. (`engine-gmt/features/lighting/index.ts:288-431`)
- **`ptEnvNEE` is a legacy migration shim** kept so old scenes load. Boot-time migration in `lighting.inject`: if `ptReflMode` is undefined AND `ptEnvNEE === true`, auto-promote to `ptReflMode=1.0` (Env MIS). Explicit `ptReflMode` writes win. (`engine-gmt/features/lighting/index.ts:31-39`)
- **`InterlaceFeature.dependsOn = ['coreMath', 'geometry']`** — interlace rewrite depends on geometry's rotation matrix and CoreMath's `distOverride` hooks. (`engine-gmt/features/interlace/index.ts:122`)
- **Mesh-variant interlace plumbing.** `MESH_GLSL_UNIFORMS` only covers primary uniforms — interlace inject explicitly adds `uInterlace*` declarations via `builder.addUniform()` when `variant === 'Mesh'`. Coupling to mesh-export subsystem. (`engine-gmt/features/interlace/index.ts:336-345`)
- **`CameraManagerFeature` has empty `params`** — its state lives in `cameraSlice` (not in the DDFS feature slice). Don't add params here without considering the duplication. (`engine-gmt/features/camera_manager/index.ts:7-16`)
- **Direct `LfoList` component registration is redundant** with `installModulationUI()` but kept for audit traceability — both register `'lfo-list'`. Removing the engine-gmt registration would also need `setLfoListConfig` defaults moved. (`engine-gmt/features/ui.tsx:45-51, 156`)
- **`registerGmtUi()` registers two OVERLAY-phase ticks.** `lightGizmoTick` and `drawingOverlayTick` — bypassing this for ad-hoc `useFrame` hooks breaks engine tick orchestration. (`engine-gmt/features/ui.tsx:158, 161`)

## Interactions with other subsystems

- **e01-feature-system** — every feature here is a `FeatureDefinition` consumed by `featureRegistry` and `createFeatureSlice`. The `FeatureStateMap` / `FeatureCustomActions` types parameterize the store slice.
- **g02-shader-pipeline** — `inject(builder, config, variant)` hooks are the primary surface. Builder methods used here include `addUniform`, `addDefine`, `addPreamble`, `addFunction`, `setFormula`, `setDistOverride`, `addPostDEFunction`, `addIntegrator`, `addMissLogic`, `addCompositeLogic`, `addShadingLogic`, `addVolumeTracing`, `addPostProcessLogic`.
- **g09-modular-graph** — `CoreMathFeature.inject` calls `compileGraph(config.pipeline, config.graph.edges)` when `formula === 'Modular'` and installs the `distOverride` hook so graph nodes can break the iteration loop. (`engine-gmt/features/core_math.ts:197-208`)
- **Mesh export** — `engine/SDFShaderBuilder.ts` must mirror the cutting-plane preamble dedup contract and accept the `uInterlace*` uniforms added by `engine-gmt/features/interlace/index.ts:336-345`. Drift between the two would silently break mesh export.
- **Engine-core feature sharing** — `engine/features/post_effects`, `engine/features/color_grading`, `engine/features/audioMod`, `engine/features/modulation`, `engine/features/webcam`, `engine/features/debug_tools` are imported by module identity (`engine-gmt/features/index.ts:35-40`). Their state types are re-exported via the same path.
- **g11-gmt-camera-manager** (forthcoming) — the `engine-gmt/features/camera_manager/*` files are dual-claimed. This doc covers the 16-line `index.ts` (pure tab registration); g11 will document the real implementation in `engine-gmt/store/cameraSlice.ts` and `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`.

## Feature catalog

### Core (formula math + iteration)

`CoreMath`, `Geometry`, `Interlace` register first (`engine-gmt/features/index.ts:44-47`). They drive formula injection, iteration-loop transforms, and per-iteration alternation between two formulas.

| Feature | File | Highlights |
|---------|------|-----------|
| `CoreMathFeature` | `engine-gmt/features/core_math.ts:122` | Iterations + scalar/vector params (paramA–F, vec2/3/4 A–C). Five-estimator `getDist` selector, cutting-plane 5th branch, Modular `PIPELINE_REV` + `distOverride` hook, self-contained-SDE bridge. |
| `GeometryFeature` | `engine-gmt/features/geometry/index.ts:168` | Pre/post/world rotations, Julia mode + Julia coordinate picker, Hybrid Box folds (9 types via `FOLD_LIST`), Burning Mode (`mix(z, abs(z), uBurningRuntime * uBurningMix)` — compile-gated, runtime fade only). Compile/runtime split via `panelConfig`. |
| `InterlaceFeature` | `engine-gmt/features/interlace/index.ts:117` | Secondary formula rewriter. Pulls secondary's `function`/`preamble`/`loopBody`/`loopInit` through `engine-gmt/features/interlace/glslRewriter.ts` — renames `uParamA→uInterlaceParamA` via word-boundary regex and prefixes `preambleVars` with `interlace_`. UI mirrors secondary params via `dynamicConfig`/`dynamicVisible`. Refuses Modular + any `selfContainedSDE`. |
| Fold modules | `engine-gmt/features/geometry/folds/index.ts:14-24` | 9 fold definitions (standard / mirror / half / decoupled / kali / tetra / octa / icosa / menger). Each defines GLSL + `rotMode` ('wrap'\|'post') + optional `selfContained` + `extraParams`. |

### Rendering and shading

| Feature | File | Highlights |
|---------|------|-----------|
| `LightingFeature` | `engine-gmt/features/lighting/index.ts:101` | Dual integrator: Direct (PBR Blinn-Phong or Cook-Torrance GGX via `specularModel`) vs Path Tracing (`renderMode === 1.0`). PT adds `PT_NEE_ALL_LIGHTS`, `PT_AREA_LIGHTS`, `PT_ENV_MIS`, `PT_ENV_MIS_IS`, `PT_SOBOL_BOUNCE` compile defines. Emits variant stubs when `variant !== 'Main'`. Env CDF importance sampling (`engine-gmt/features/reflections/env_cdf.ts`) populates `Uniforms.EnvCDFMarginal/Conditional/Size/LumIntegral/MipBias` when `ptReflMode === 2.0`. |
| `LightSpheresFeature` | `engine-gmt/features/lighting/light_spheres.ts:28` | Visible emitter spheres — compile-gated satellite of lighting. `dependsOn: ['lighting']`. Injects via `addPostDEFunction` + `addIntegrator` + `addMissLogic` + `addCompositeLogic`. |
| `AOFeature` | `engine-gmt/features/ao/index.ts:17` | Ambient occlusion compile-toggle, intensity / spread / samples / maxSamples, stochastic-CP option, AO color tint. GLSL via `getAOGLSL`. |
| `ReflectionsFeature` | `engine-gmt/features/reflections/index.ts` | Three modes (`REFL_MODE_OFF=0`, `REFL_MODE_ENV=1`, `REFL_MODE_RAYMARCH=3`). 2.0 was SSR (removed; legacy maps to ENV). Two shading-integration GLSL blocks: env-only Fresnel sample vs full raymarched reflection ray. |
| `AtmosphereFeature` | `engine-gmt/features/atmosphere/index.ts` | Fog (near/far/intensity, volumetric density absorption, env-background blend) + glow (intensity uniform-guarded) + atmospheric volume body. Injected via `addPostProcessLogic`. |
| `VolumetricFeature` | `engine-gmt/features/volumetric/index.ts:27` | Henyey-Greenstein single scatter. Compile-time `ptVolumetric` (~5500ms est), runtime `volEnabled` instant toggle. `volQuality` knob trades per-frame sampling rate (1/128 → 1/8) for convergence speed (both unbiased). |
| `MaterialFeature` | `engine-gmt/features/materials.ts:7` | Diffuse / reflection / specular / roughness / rim + env map (HDR equirect, color-space switch, env gradient fallback) + emission (`emissionMode` 0=albedo / 1=col1 / 2=col2 / 3=noise). Injects `LIGHTING_ENV`. |
| `WaterPlaneFeature` | `engine-gmt/features/water_plane.ts:5` | Compile-gated `waterEnabled` + runtime `active`. Multi-octave wave height function (`getWaterHeight`) — rolling swell (sine) + organic surface (simplex noise) layers. |

### Coloring and texturing

| Feature | File | Highlights |
|---------|------|-----------|
| `ColoringFeature` | `engine-gmt/features/coloring/index.ts:44` | Two-layer gradient (`mode/scale/offset/.../gradient` + `mode2/.../gradient2`) blended via `uBlendMode` (mix/add/multiply/overlay/screen/bump). Layer 3 procedural simplex noise compiled in via `LAYER3_ENABLED`. Geometric Orbit Trap is a compile-gated per-iter `min`-accumulator (`g_geomTrap`) with shape (point / sphere / cross / plane). Two-phase pre/post inject around the formula step; gated off `SELF_CONTAINED_SDE` (`engine-gmt/features/coloring/index.ts:377-389`). |
| `TexturingFeature` | `engine-gmt/features/texturing.ts:15` | Image-texture layer with compile-gated `active`, separate `mapU` / `mapV` mapping modes, scale + offset. Compile-gated so the runtime `if()` doesn't predicate `getTextureColor()` on every surface eval. |
| `MappingModes` | `engine-gmt/features/coloring/MappingModes.ts` | Shader chunk generator for the mapping-mode dropdown. |

### Scene and camera

| Feature | File | Highlights |
|---------|------|-----------|
| `OpticsFeature` | `engine-gmt/features/optics.ts:12` | Camera projection (perspective / ortho / 360 skybox), FOV, ortho scale, DOF strength + focus distance. |
| `NavigationFeature` | `engine-gmt/features/navigation.ts:10` | `flySpeed`, `autoSlow` on collision, `orbitCursorAnchor` (orbit-around-cursor toggle, hidden — exposed inline with the DST HUD pill). |
| `CameraManagerFeature` | `engine-gmt/features/camera_manager/index.ts:7` | Pure tab registration. No params; state owned by `cameraSlice`. Bespoke `CameraManagerPanel` (`engine-gmt/features/camera_manager/CameraManagerPanel.tsx`) registered as `panel-cameramanager`. **Dual-claim with g11-gmt-camera-manager** — see Interactions. |
| `DrosteFeature` | `engine-gmt/features/droste/index.ts:25` | Droste-effect post UV remap: tiling, center, inside/outside radii, periodicity, strands, hyperDroste, twist, fractalPoints. Math chunk imported from `engine-gmt/features/droste/shader.ts`. |

### Quality and engine

| Feature | File | Highlights |
|---------|------|-----------|
| `QualityFeature` | `engine-gmt/features/quality.ts:28` | Engine-quality master + per-render-pass knobs (`fudgeFactor`, `stepRelaxation`, `stepJitter`, `refinementSteps`, `maxSteps`, `precisionMode`, `bufferPrecision`, `estimator`, `overstepTolerance`, `dynamicScaling`, `adaptiveTarget` FPS). |
| `EngineSettingsFeature` | `engine-gmt/features/engine/index.ts:5` | Engine tab (hidden by default via `showEngineTab`). `applyPreset({mode: 'fastest'\|'lite'\|'balanced'\|'ultra'})` loads from `ENGINE_PROFILES` (`engine-gmt/features/engine/profiles.ts`). |

### Drawing (overlay)

| Feature | File | Highlights |
|---------|------|-----------|
| `DrawingFeature` | `engine-gmt/features/drawing/index.ts:1+` | Drawn rect / circle shapes (precise vec3 center + orientation quaternion). Overlay tool + tick (`overlay-drawing` + `drawingOverlayTick`); `DrawingPanel` registered as `panel-drawing`. Owns the `DrawingActions` interface in `FeatureCustomActions`. |

### Importer (non-feature barrel)

| Module | File | Highlights |
|--------|------|-----------|
| `fragmentarium_import` | `engine-gmt/features/fragmentarium_import/index.ts` | NOT a registered feature. Barrel exposing the V3 pipeline (`detectFormulaV3`, `transformFormulaV3`, `analyzeSource`, `generateFormula`), the `FormulaWorkshop` React UI, workshop param builders (`buildWorkshopParams`, `buildFractalParams`, `filterDeadParams`), and importer types. V4 pipeline lives at `engine-gmt/features/fragmentarium_import/v4/` — see the separate frag-importer subsystem doc-audit. |

### Engine-core shared features (registered by module identity)

These are imported directly from `engine/features/*` and re-registered into the GMT registry. The `featureRegistry.register` short-circuit on identical refs keeps them no-op when engine-core registers them again. (`engine-gmt/features/index.ts:35-78`)

| Feature | Source | Notes |
|---------|--------|-------|
| `PostEffectsFeature` | `engine/features/post_effects` | Re-imported; state type re-exported at `engine-gmt/features/index.ts:89`. |
| `ColorGradingFeature` | `engine/features/color_grading` | State type re-exported at `engine-gmt/features/index.ts:90`. |
| `AudioFeature` | `engine/features/audioMod` | State type re-exported at `engine-gmt/features/index.ts:85`. |
| `ModulationFeature` | `engine/features/modulation` | Owns `ModulationActions` in `FeatureCustomActions`. State + actions imported in `engine-gmt/features/types.ts:20`. |
| `WebcamFeature` | `engine/features/webcam` | State type re-exported at `engine-gmt/features/index.ts:87`. |
| `DebugToolsFeature` | `engine/features/debug_tools` | State type re-exported at `engine-gmt/features/index.ts:88`. |

## Known issues / Phase 2 carry-in

- **q-062 (subsystem gap, deferred to g11-gmt-camera-manager):** g05 only audits the 16-line `engine-gmt/features/camera_manager/index.ts` (pure tab registration). The real Camera Manager implementation lives in `engine-gmt/store/cameraSlice.ts` (~310 lines) and `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`. A new slice `g11-gmt-camera-manager` is recommended; per a prior decision these files are dual-claimed (this doc covers the registration manifold; g11 will cover the slice + panel).
- **Orphan-sweep candidates (from survey).** Several deferred UI ports in `registerGmtUi()` may have dead imports — `FormulaPanel` / `ScenePanel` / `RenderPanel` / `ColoringPanel` / `QualityPanel` / `LightPanel` / `FlowEditor` / `AudioPanel` / `DrawingPanel` are all gated on PanelManifest gaps (`engine-gmt/features/ui.tsx:16-26`). `EnginePanel` registered as `'panel-engine'` and `FlowEditor` as `'panel-graph'` need confirmation that the manifest still references them (`engine-gmt/features/ui.tsx:174, 176`). `HybridAdvancedLock` registered as `'hybrid-advanced-lock'` at `engine-gmt/features/ui.tsx:146` — geometry's `customUI` list does not reference it; may be slotted via PanelManifest only.
- **`engineStore` typing.** `engine-gmt/features/ui.tsx:84-135` heavily uses `(s as any).histogramData` / `registerHistogram` / `refreshHistogram` / `setColoring` / `registerSceneHistogram`. The `as any` casts suggest these slice fields live outside `FeatureStateMap` — confirm whether typing should be tightened.

## Historical context

The 26–34 line comment block in `engine-gmt/features/index.ts:26-34` is the primary historical record for this subsystem: a previous approach "carried GMT copies" of `PostEffects`, `ColorGrading`, `Audio`, `Modulation`, `Webcam`, `DebugTools` under `engine-gmt/features/`. Those copies were diff-identical to engine-core but triggered six "Replacing definition for X" warnings AND a subtle Map insertion-order change broke `uToneMapping` declaration during post-pass compile. The current import-by-module-identity approach eliminates both issues.

Other in-source rationale of note:

- `engine-gmt/features/core_math.ts:107-109` documents the cutting-plane preamble mirror with `engine/SDFShaderBuilder.ts` — a coupling that has historically caused silent mesh-export breakage when drifted.
- `engine-gmt/features/lighting/light_spheres.ts:9-22` documents why Light Spheres is a satellite feature: independent compile gate from the lighting master switch, but with `dependsOn: ['lighting']` because it consumes lighting's uniform arrays.
- `engine-gmt/features/ui.tsx:45-51` documents the deliberate redundancy of the `'lfo-list'` registration between this entry and `installModulationUI()` — kept for audit traceability.
- `engine-gmt/features/texturing.ts:34-38` documents the compile-gate rationale: a runtime `if(uUseTexture)` would predicate `getTextureColor()` on every surface eval; the compile gate mirrors the `burningEnabled` pattern.
