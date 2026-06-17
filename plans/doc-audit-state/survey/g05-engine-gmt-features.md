---
subsystem_id: g05-engine-gmt-features
audited_at: 2026-05-20T00:00:00Z
files:
  - path: engine-gmt/features/index.ts
    blob_sha: 014731eeefbe00d82118faf651c84740f28be80b
    lines_read: [1, 109]
    tier: A
  - path: engine-gmt/features/types.ts
    blob_sha: 2960caec22353e8bd70ba35ba9524955f1e6c49a
    lines_read: [1, 63]
    tier: A
  - path: engine-gmt/features/ui.tsx
    blob_sha: ca3c72e2db87a7311748d307c6787fd704f7057b
    lines_read: [1, 177]
    tier: A
  - path: engine-gmt/features/core_math.ts
    blob_sha: 270d7336837f2bbd005043fa245f12cefaed33a5
    lines_read: [1, 236]
    tier: A
  - path: engine-gmt/features/lighting/index.ts
    blob_sha: 7b60ad290e875789c6a3ad140990e3a306a4e9da
    lines_read: [1, 486]
    tier: B
  - path: engine-gmt/features/lighting/light_spheres.ts
    blob_sha: a4089e5b898c47474b1554084dd2fd08c713a502
    lines_read: [1, 72]
    tier: B
  - path: engine-gmt/features/geometry/index.ts
    blob_sha: a0fa6b5c91c79d244dcca4757d1ee146fef969d8
    lines_read: [1, 505]
    tier: B
  - path: engine-gmt/features/geometry/folds/index.ts
    blob_sha: da1aa485171423ed5b8e37d8e79976853dd3d525
    lines_read: [1, 30]
    tier: B
  - path: engine-gmt/features/coloring/index.ts
    blob_sha: c6da2e993610e9850e2a8c4d0d890a6ea824edf6
    lines_read: [1, 403]
    tier: B
  - path: engine-gmt/features/volumetric/index.ts
    blob_sha: 461b69a5b6a07672eefa2316875b1eb9d3313d05
    lines_read: [1, 165]
    tier: B
  - path: engine-gmt/features/interlace/index.ts
    blob_sha: c7e091cbd5950b7496dba855871574a03e1fd04c
    lines_read: [1, 390]
    tier: B
  - path: engine-gmt/features/interlace/glslRewriter.ts
    blob_sha: 3bdede720c8fc90010893a5d293353b8534afa61
    lines_read: [1, 60]
    tier: B
  - path: engine-gmt/features/fragmentarium_import/index.ts
    blob_sha: 97e43428a65d4d40da2bf4ff125d12da0cb779c6
    lines_read: [1, 24]
    tier: B
  - path: engine-gmt/features/atmosphere/index.ts
    blob_sha: 91601b6b23b96d4107809b42648b6be7ac8bbb25
    lines_read: [1, 40]
    tier: C
  - path: engine-gmt/features/ao/index.ts
    blob_sha: 3230bd1ba0794000529aae504cc68196643128f7
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/reflections/index.ts
    blob_sha: f0b1024e5342289ee149d3f08f8c80ffa01206d2
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/drawing/index.ts
    blob_sha: b149b2da195d717d3298dba99ee66b2994880914
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/engine/index.ts
    blob_sha: 8ef1bd0b7adc0b94df106da250db118ff3b8ab00
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/camera_manager/index.ts
    blob_sha: 7f2ef2b6af6ed8f3d277c601e688ec1b1ca4aa33
    lines_read: [1, 16]
    tier: C
  - path: engine-gmt/features/droste/index.ts
    blob_sha: f2cab1d7ec1e7afba3b46c1e89e541353109d999
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/materials.ts
    blob_sha: 6d3d4187457911dbc1047a0d38c21f017addf46d
    lines_read: [1, 30]
    tier: C
  - path: engine-gmt/features/texturing.ts
    blob_sha: fb27fbc60f7cbdd8c553a3c9755f704514ca2bf1
    lines_read: [1, 40]
    tier: C
  - path: engine-gmt/features/quality.ts
    blob_sha: f4b53008cb570e801ebf4a9cf4756346fa430549
    lines_read: [1, 40]
    tier: C
  - path: engine-gmt/features/navigation.ts
    blob_sha: 05117cc9960dac1a85d6f8462c28d914de4372ea
    lines_read: [1, 27]
    tier: C
  - path: engine-gmt/features/optics.ts
    blob_sha: d194bf6217bccbc5cbefd4bfbe5d0898643ba58d
    lines_read: [1, 50]
    tier: C
  - path: engine-gmt/features/water_plane.ts
    blob_sha: df2a2e8bce5f5f91ae3a7126fbe6ad42609392c9
    lines_read: [1, 35]
    tier: C
  - path: engine-gmt/features/coloring/MappingModes.ts
    blob_sha: 773614da3116e2f19a9f57b9ede5c54a71f625af
    lines_read: [0, 0]
    tier: C
  - path: engine-gmt/features/geometry/transforms.ts
    blob_sha: b9fae93060ed8a637482eaf030ac0ef61ca1a122
    lines_read: [0, 0]
    tier: C
  - path: engine-gmt/features/geometry/types.ts
    blob_sha: 16323f18d0b8f152f6f689b8fec7b394678faf92
    lines_read: [0, 0]
    tier: C
---

## Public API surface

- `registerFeatures()` — sole registration entry, called once at boot from `app-gmt/main.tsx`. Calls `featureRegistry.register(...)` for each GMT feature plus 6 engine-core-shared features (PostEffects, ColorGrading, Audio, Modulation, Webcam, DebugTools) re-imported by module identity to keep `existing === def` fast-path and avoid "Replacing definition" warnings. `engine-gmt/features/index.ts:43-79`.
- `registerGmtUi()` — UI-component registration entry, called once at app boot AFTER engine-core's `registerUI()` populates generic entries (`auto-feature-panel`, etc.). Registers GMT-specific widgets (`coloring-histogram`, `julia-randomize`, `formula-select`, etc.), overlay components + their OVERLAY-phase ticks (`overlay-lighting` + `lightGizmoTick`, `overlay-drawing` + `drawingOverlayTick`), and bespoke `panel-*` components (`panel-engine`, `panel-cameramanager`, `panel-graph`). `engine-gmt/features/ui.tsx:139-177`.
- `FeatureStateMap` / `FeatureCustomActions` — type-level state map + actions union consumed by `createFeatureSlice` and store typing. Composes 19 state slices and 3 action interfaces (`DrawingActions`, `ModulationActions`, `LightingActions`). `engine-gmt/features/types.ts:26-50`.
- Per-feature state types are re-exported via `export type { … }` from `index.ts:85-109` for store typing (`isolatedModules` requirement).
- `fragmentarium_import/index.ts` is a public-facing barrel (not a `FeatureDefinition`): exports V3 pipeline (`detectFormulaV3`, `transformFormulaV3`, `analyzeSource`, `generateFormula`), `FormulaWorkshop` UI, workshop param builders, and importer types. `engine-gmt/features/fragmentarium_import/index.ts:1-24`.

## Architecture

- **Three registration surfaces:** state features (`features/index.ts`), UI components (`features/ui.tsx`), type augmentations (`features/types.ts`). All three are paired — adding a feature requires touching all three only when state needs typing or new components are introduced.
- **Engine-core sharing by module identity:** PostEffects, ColorGrading, Audio, Modulation, Webcam, DebugTools are imported directly from `../../engine/features/*` rather than copied — `featureRegistry.register` short-circuits on identical refs. Comment block at `index.ts:26-34` documents that the previous "carry GMT copies" approach caused subtle Map-order regressions during post-pass compile (broke `uToneMapping` declaration order). Treat the 6 shared features as a foreign subsystem coupling.
- **`registerGmtUi()` deferred ports:** FormulaPanel, ScenePanel, RenderPanel, ColoringPanel, QualityPanel, LightPanel, FlowEditor, AudioPanel, DrawingPanel are *not* ported — `PanelManifest` replaces them with `AutoFeaturePanel` stacks + widget slots. Ports gated on manifest gaps (`ui.tsx:18-26`).
- **CoreMath = formula injection orchestrator:** `coreMath.inject` (`core_math.ts:152-235`) consumes `config.formula`, `config.quality.estimator`, `config.pipeline`, `config.graph`, `config.interlace.*` and emits the `formula_*()` function + `loopBody` + `loopInit` + `getDist`. Houses the `generateGetDist(estimatorType, supportsCuttingPlane)` selector (5 estimators: Analytic/Linear/Pseudo/Dampened/Linear2/CuttingPlane), with cutting-plane treated as a 5th DE that reads `cp_dmin`/`cp_trap` written by formula bodies — falls back to Linear if formula lacks `shader.supportsCuttingPlane`.
- **Cutting-plane preamble dedup contract:** `core_math.ts:110-120` declares `cp_dmin/cp_scale/cp_trap` globals via `builder.addPreamble(CP_PREAMBLE)` whenever EITHER side of an interlace pair has `shader.supportsCuttingPlane` (`:186-190`). Mirror exists in `engine/SDFShaderBuilder.ts` (mesh export); both must declare identically. `addPreamble` dedupes by exact string so multiple call paths are safe.
- **Modular formula special-casing in CoreMath:** when `formula === 'Modular'`, CoreMath adds `PIPELINE_REV` define (forces recompile on graph changes), declares `uModularParams[MAX_MODULAR_PARAMS]`, calls `compileGraph(pipeline, graph.edges)` → `formula_Modular()`, and installs a `distOverride` short-circuit hook so Modular nodes can break the iteration loop with `distOverride < 999.0`. `core_math.ts:157-208`.
- **Self-contained SDE bridge:** formulas with `shader.selfContainedSDE` (MandelTerrain et al) emit `SKIP_PRE_BAILOUT` + `SELF_CONTAINED_SDE` defines (`core_math.ts:171-175`). Downstream features (geometry burning, coloring orbit-trap pre/post inject) gate themselves off `SELF_CONTAINED_SDE` to prevent contamination of the formula's inner-loop coordinate system. `geometry/index.ts:456-461`, `coloring/index.ts:377-389`.
- **Hybrid Box (geometry) compile/runtime split:** `hybridCompiled` gates DXBC emission; `hybridMode` is a runtime uniform toggle. `hybridFoldType` (0-8 via `FOLD_LIST`), `hybridComplex` (interleaved fold↔formula), `hybridPermute` (c-axis swizzle), and `hybridSwap` are compile-time (force recompile). Per-iter parameters (`hybridIter`, `hybridScale`, `hybridShift`, …) stay runtime. Interleaved mode bakes `hybridSwap` to eliminate runtime branches inside the per-iter block. `geometry/index.ts:430-501`.
- **Fold definitions live as plug-in modules:** `FOLD_LIST` in `geometry/folds/index.ts:14-24` orders 9 folds (standard/mirror/half/decoupled/kali/tetra/octa/icosa/menger). Each fold defines its GLSL + `rotMode` (`'wrap'` vs `'post'`) + optional `selfContained` + `extraParams`. `buildFoldExtraParams()` (`geometry/index.ts:149-166`) auto-injects fold-specific params with `condition: hybridFoldType eq <i>`.
- **Burning Mode compile gate:** the `mix(z, abs(z), uBurningRuntime * uBurningMix)` line is dead-code-eliminated when `burningEnabled=false`; when compiled in, the runtime uniforms fade between original/abs coordinates without re-compile. Skipped on `SELF_CONTAINED_SDE`. `geometry/index.ts:285-310, 456-461`.
- **Lighting feature = dual integrator selector:** Direct (PBR) vs Path Tracing branches on `state.renderMode === 1.0`. Direct path uses `getLightingPBRSimple` (Blinn-Phong) or `getLightingPBRFull` (Cook-Torrance GGX, gated by `specularModel`). PT path adds `getPathTracerGLSL` with compile-time defines `PT_NEE_ALL_LIGHTS`, `PT_AREA_LIGHTS`, `PT_ENV_MIS`, `PT_ENV_MIS_IS`, `PT_SOBOL_BOUNCE`. `lighting/index.ts:432-449`.
- **Lighting → variant stubs:** when `variant !== 'Main'`, lighting emits `GetSoftShadow=1.0`, `GetHardShadow=1.0`, `calculateShading=vec3(0)`, `calculatePathTracedColor=vec3(0)` stubs. When `advancedLighting=false`, emits a no-lighting `calculateShading` that still derives albedo from Layer 1 gradient — preserves preview look. `lighting/index.ts:335-380`.
- **Light spheres = satellite feature:** `lightSpheres` is registered as a separate `FeatureDefinition` (`light_spheres.ts`) so its compile-time toggle is independent of the lighting engine's master switch. Depends on Lighting's uniform arrays (declared as `extraUniforms` on `LightingFeature`). Sphere radius/softness UI is embedded in per-light `LightControls.tsx` because they're per-light not per-feature. `light_spheres.ts:1-30`.
- **Env CDF importance sampling:** `Uniforms.EnvCDFMarginal/EnvCDFConditional/EnvCDFSize/EnvLumIntegral/EnvCDFMipBias` are stub 1×1 samplers by default; `env_cdf.buildEnvCDF` populates them when `ptReflMode === 2.0` (Env MIS + IS). `lighting/index.ts:137-143`.
- **Legacy migration in lighting:** `ptEnvNEE` is deprecated/hidden but kept so old scenes load. Boot-time migration in inject: if `ptReflMode` is undefined AND `ptEnvNEE === true`, auto-promote to `ptReflMode=1.0` (Env MIS). Explicit `ptReflMode` writes win. `lighting/index.ts:266-270, 410-418`.
- **Coloring = two-layer gradient + noise + geometric trap.** Layer 1 (`mode/scale/offset/.../gradient`) + Layer 2 (`mode2/.../gradient2`) blend modes via `uBlendMode` (mix/add/multiply/overlay/screen/bump). Layer 3 is procedural simplex noise compiled in via `LAYER3_ENABLED`. Geometric Orbit Trap is a compile-gated per-iter `min`-accumulator (`g_geomTrap`) with shape (point/sphere/cross/plane). `coloring/index.ts:44-403`.
- **Coloring trap global lifecycle:** `g_geomTrap` accumulates inside `map()` and `mapDist()` (both reset per call); `g_geomTrapFinal` captures the value `map()` left so `mapDist` (normals/shadows/AO) doesn't overwrite it. Two-phase pre/post inject around the formula step is documented at `coloring/index.ts:354-389`; iter==0 contribution covered by the post-formula block.
- **Volumetric scatter:** compile-time `ptVolumetric` (est ~5500ms) compiles Henyey-Greenstein single scatter in. Runtime `volEnabled` instant toggle. `volQuality` knob trades per-frame sampling rate (1/128 → 1/8) for convergence speed — both unbiased, same final image. Adds `addVolumeTracing(VOLUMETRIC_SCATTER_BODY)` + `addPostProcessLogic('col += fogScatter')`. `volumetric/index.ts:53-164`.
- **Interlace = secondary formula rewriter.** Compile-time `interlaceCompiled` + `interlaceFormula` (dropdown excludes Modular). Pulls secondary's `function`, `preamble`, `loopBody`, `loopInit` through `glslRewriter.ts` which renames `uParamA→uInterlaceParamA` etc. via word-boundary regex and prefixes `preambleVars` with `interlace_`. Auto-detects top-level symbols in preamble/function/loopInit to avoid identity-pair redeclaration. Refuses Modular on either side and refuses any `selfContainedSDE`. `interlace/index.ts:117-389`.
- **Interlace UI parameter mirroring:** secondary params surface as `interlaceParam{A..F}` / `interlaceVec{2,3,4}{A..C}` with `dynamicConfig(key)` returning the secondary formula's label/min/max/step/options at runtime, and `dynamicVisible(key)` hiding slots the secondary doesn't use. `onSet` callback on `interlaceFormula` loads defaults from the chosen secondary. `interlace/index.ts:93-115, 153-164`.
- **Mesh-variant interlace plumbing:** `MESH_GLSL_UNIFORMS` only covers primary uniforms — interlace inject explicitly adds `uInterlace*` declarations via `builder.addUniform()` when `variant === 'Mesh'`. `interlace/index.ts:336-345`. Coupling point to mesh export subsystem.
- **DDFS panelConfig drives compile/runtime UI split.** Features with two-stage compile (`hybridCompiled` + `hybridMode`, `ptVolumetric` + `volEnabled`, `interlaceCompiled` + `interlaceEnabled`) declare `panelConfig: { compileParam, runtimeToggleParam, compileSettingsParams[], runtimeGroup, label, compileMessage, helpId }`. `CompilableFeatureSection` reads this and renders the recompile pill. `geometry/index.ts:201-210`, `volumetric/index.ts:39-45`, `interlace/index.ts:132-139`.
- **EngineSettings: pure tab + action carrier.** No params except `showEngineTab` (hidden default-false). `applyPreset({mode: 'fastest'|'lite'|'balanced'|'ultra'})` action loads from `ENGINE_PROFILES`. `engine/index.ts:1-30`.
- **CameraManager: pure tab registration.** No params; state is owned by `cameraSlice` in the store (not via DDFS). Tab is always-on. `camera_manager/index.ts:6-16`.
- **Flat-file features summary (10 of 26):**
  - `coreMath` (`core_math.ts:122`) — formula+estimator+interlace orchestrator above.
  - `materials` (`materials.ts:7+`) — diffuse/reflection/specular/roughness/rim + env map (HDR equirect, color-space switch, env gradient fallback) + emission. Injects `LIGHTING_ENV`.
  - `texturing` (`texturing.ts:15+`) — image-texture layer with compile-gated `active`, separate `mapU`/`mapV` mapping modes, scale + offset.
  - `quality` (`quality.ts:28+`) — engine quality master + per-render-pass knobs (fudgeFactor, stepRelaxation, refinementSteps, maxSteps, precisionMode, bufferPrecision, estimator selector, overstepTolerance, dynamicScaling, adaptiveTarget FPS).
  - `optics` (`optics.ts:12-50`) — camera projection (perspective/ortho/360 skybox), FOV, DOF strength + focus distance.
  - `navigation` (`navigation.ts:10-27`) — flySpeed, auto-slow on collision, orbit-around-cursor toggle.
  - `waterPlane` (`water_plane.ts:1+`) — compile-gated `waterEnabled` + runtime `active`. Multi-octave wave height function injected as GLSL.
  - `droste` (`droste/index.ts:25+`) — Droste-effect post UV remap (tiling/center/radii/periodicity/strands/hyperDroste). Math chunk imported from `./shader`.
  - `lighting` (`lighting/index.ts:101`) — see detailed bullets above.
  - `lightSpheres` (`light_spheres.ts:27+`) — visible emitter spheres satellite of lighting.
- **Directory-feature summary (16 of 26):**
  - `geometry` (`geometry/index.ts:168`) — pre/post/world rotations, Julia mode + Julia coordinate picker (`interaction-picker` + `julia-randomize`), Hybrid Box folds (9 types), Burning Mode. See above.
  - `interlace` (`interlace/index.ts:117`) — see detailed bullets.
  - `coloring` (`coloring/index.ts:44`) — see detailed bullets.
  - `volumetric` (`volumetric/index.ts:27`) — see detailed bullets.
  - `ao` (`ao/index.ts:17+`) — ambient occlusion compile-toggle, intensity/spread/samples/maxSamples, stochastic CP option, AO color tint. GLSL via `getAOGLSL`.
  - `atmosphere` (`atmosphere/index.ts`) — fog (near/far/intensity, volumetric density absorption, env-background blend) + glow (intensity uniform-guarded) + atmospheric volume body. Injected via `addPostProcessLogic`.
  - `reflections` (`reflections/index.ts:1+`) — `REFL_MODE_OFF/ENV/RAYMARCH` (2.0 SSR removed, legacy presets map to ENV). Two shading-integration GLSL blocks (env-only Fresnel sample vs full raymarched reflection ray). Env CDF helper lives at `reflections/env_cdf.ts`.
  - `drawing` (`drawing/index.ts:1+`) — drawn rect/circle shapes (precise vec3 center + orientation quaternion), overlay tool + tick (`overlay-drawing` + `drawingOverlayTick`), `DrawingPanel` registered as `panel-drawing`. Owns `DrawingActions` interface in `FeatureCustomActions`.
  - `engineSettings` (`engine/index.ts:5`) — Engine tab + `applyPreset` action loading `ENGINE_PROFILES`.
  - `cameraManager` (`camera_manager/index.ts:6`) — Camera Manager tab; state owned by `cameraSlice`. Bespoke `CameraManagerPanel` component registered as `panel-cameramanager`.
  - `fragmentarium_import` — NOT a registered feature; barrel exposing V3 importer pipeline (`detectFormulaV3`/`transformFormulaV3`/`analyzeSource`/`generateFormula`), `FormulaWorkshop` UI, workshop param builders, and types. Subdirs: `parsers/`, `transform/`, `v3/`, `v4/`, `workshop/`, plus `formula-library.ts`, `passing-formulas.ts`, `random-formulas.ts`. See subsystem doc-audit for V4 pipeline.
  - `lighting/components/` — `LightControls`, `LightDirectionControl`, `ShadowControls`, `SingleLightGizmo` (sub-components of the lighting panel; not registered as features).
  - `lighting/utils/` — `GizmoMath`, `lightMenuUtils` (helpers, no feature registration).
  - `geometry/folds/` — 9 fold modules + barrel; consumed by `GeometryFeature` (see above).

## Invariants and gotchas

- **Registration order matters:** `LightSpheresFeature` MUST be registered after `LightingFeature` (declares its uniform arrays). Comment at `light_spheres.ts:11-20` is the contract.
- **Engine-core feature sharing requires module identity, not duplication.** Re-importing into engine-gmt causes "Replacing definition" warnings AND has historically broken Map insertion order during post-pass compile (`features/index.ts:26-34`). When adding a feature usable by both engine-core and engine-gmt, keep one copy in engine-core and import it.
- **`isolatedModules` requires `export type` for state re-exports** (`features/index.ts:82-109`). Mixing value/type re-exports without explicit `type` keyword breaks Vite emit.
- **Cutting-plane preamble must mirror SDFShaderBuilder.** `core_math.ts:108-110` explicitly states `CP_PREAMBLE_GLOBALS` + cp_init line must be kept in sync with `engine/SDFShaderBuilder.ts`. Mesh export coupling.
- **Interlace cannot mix with Modular OR self-contained SDEs on either side.** All 4 refusal branches at `interlace/index.ts:321-333`.
- **Geometric orbit-trap pre/post inject gated off `SELF_CONTAINED_SDE`** (`coloring/index.ts:377-389`) — self-contained formulas accumulate the trap in their own inner loop using their own coordinate system; mixing outer-loop samples would corrupt the min.
- **Hybrid Box runtime uniform `uHybrid` guards pre-loop fold; interleaved swap is compile-baked** to avoid runtime branches the optimizer was poorly predicating (`geometry/index.ts:467-501`).
- **AreaLights toggle triggers recompile** despite being labeled "runtime" — empirical fix for ANGLE/D3D11 predicating both `GetSoftShadow` and `GetHardShadow` paths inside the runtime `if (uAreaLights > 0.5)` branch. `lighting/index.ts:288-299, 425-431`.
- **GMT-only burning compile gate emits a `mix()` line that costs 1 ALU per iter** when compiled in (`geometry/index.ts:458-461`). Cost is paid only when compiled in; toggle to runtime is fade-only.
- **`ptEnvNEE` is a legacy migration shim** — fresh scenes always write `ptReflMode` explicitly; auto-promote runs only when ptReflMode is `undefined`. Explicitly turning ptReflMode off sticks even with the orphan field still set. `lighting/index.ts:266-270, 405-418`.
- **`registerGmtUi()` registers two OVERLAY-phase ticks** (`lightGizmoTick`, `drawingOverlayTick`) — bypassing this for ad-hoc useFrame hooks breaks the engine's tick orchestration.
- **`InterlaceFeature` declares `dependsOn: ['coreMath', 'geometry']`** — interlace rewrite depends on geometry's rotation matrix and coreMath's distOverride hooks. `interlace/index.ts:122`.
- **Interlace's mesh variant adds uniforms via `addUniform()` only because MESH_GLSL_UNIFORMS covers primary params only** — duplicate declaration error if main shader takes the same path. `interlace/index.ts:335-345`.
- **`CameraManagerFeature` has empty params** — its state lives in `cameraSlice` (not in the DDFS feature slice). Don't add params here without considering the duplication. `camera_manager/index.ts:14`.
- **Direct LfoList component registration is redundant** with `installModulationUI()` but kept for audit traceability — both register `'lfo-list'`. Don't remove the engine-gmt registration without also moving `setLfoListConfig` defaults. `ui.tsx:46-51, 156`.
- **`lighting/index.ts:46` (DrawingActions in FeatureCustomActions) is the actions-union pattern** — adding a feature with custom actions requires extending its `*Actions` interface AND adding it to `FeatureCustomActions` in `features/types.ts:49`.

## Drift from existing doc

(no existing doc — skip)

## Open questions

- Orphan-sweep candidate: engine-gmt/features/ui.tsx (`FormulaPanel`/`ScenePanel`/`RenderPanel`/`ColoringPanel`/`QualityPanel`/`LightPanel`/`FlowEditor`/`AudioPanel` are explicitly deferred — confirm in app-gmt that PanelManifest still serves their needs and there are no dangling imports of the original hand-written panels in the app shell.)
- Orphan-sweep candidate: engine-gmt/components/panels/EnginePanel (bespoke panel, registered only as `'panel-engine'` via `componentRegistry.register` in `ui.tsx:174` — verify the manifest still references it; if not, the import is dead.)
- Orphan-sweep candidate: engine-gmt/components/panels/flow/FlowEditor (registered as `'panel-graph'` at `ui.tsx:176` — comment at `ui.tsx:22-24` says FlowEditor port is gated on the flow/ subsystem; if flow/ is not yet ported the registration may be dead.)
- Orphan-sweep candidate: engine/features/post_effects, engine/features/color_grading, engine/features/audioMod, engine/features/modulation, engine/features/webcam, engine/features/debug_tools (engine-core foreign imports re-registered into the GMT registry via module-identity short-circuit — `features/index.ts:35-40`. Cross-subsystem coupling; engine-core audit should know GMT depends on stability of these exports.)
- Orphan-sweep candidate: engine-gmt/components/panels/HybridAdvancedLock (registered as `'hybrid-advanced-lock'` widget at `ui.tsx:146` — find which feature's customUI slot consumes it; geometry/index.ts customUI list does not reference it, may be slotted via PanelManifest only.)
- Orphan-sweep candidate: engine-gmt/components/widgets/JuliaRandomize (registered as `'julia-randomize'`; consumed by GeometryFeature.customUI at `geometry/index.ts:188-193`. Internal widget — ensure no duplicate copy in app-gmt or stable.)
- Orphan-sweep candidate: engine/SDFShaderBuilder.ts (mesh-export sibling that MUST mirror the cutting-plane preamble + interlace uniform additions in `core_math.ts:108-110` and `interlace/index.ts:335-345`. Drift between the two would silently break mesh export — flag for cross-subsystem invariant check.)
- Orphan-sweep candidate: engine-gmt/features/fragmentarium_import (entire subtree is the V3/V4 formula importer — separate doc-audit subsystem; called out here only as a barrel re-exporter. Confirm that `index.ts:1-24` is the sole public-facing API surface and that `FormulaWorkshop` is the only React entry-point.)
- Orphan-sweep candidate: engine-gmt/store/engineStore (heavily referenced from `ui.tsx:84-135` via `(s as any).histogramData`/`registerHistogram`/`refreshHistogram`/`setColoring`/`registerSceneHistogram` — the `as any` casts suggest these slice fields are not in `FeatureStateMap`. Confirm whether they live in a separate non-DDFS slice and whether typing should be tightened.)
