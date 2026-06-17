---
source: engine-gmt/engine/ShaderBuilder.ts
lines: 635
last_verified_sha: 2f66a9680c6f07f5e334d9172c763ffcc8727462
additional_sources:
  - engine-gmt/engine/SDFShaderBuilder.ts
  - engine-gmt/engine/ShaderFactory.ts
  - engine-gmt/engine/ShaderConfig.ts
  - engine-gmt/engine/UniformSchema.ts
  - engine-gmt/engine/UniformNames.ts
  - engine-gmt/engine/managers/UniformManager.ts
  - engine-gmt/engine/managers/ConfigManager.ts
audited: 2026-05-20T09:09:19Z
audited_by: claude-opus-4-7
public_api:
  - ShaderBuilder
  - RenderVariant
  - ShaderFactory
  - ShaderConfig
  - UniformDefinition
  - GLSLType
  - UNIFORM_SCHEMA
  - UNIFORM_DEFAULTS
  - createUniforms
  - UniformManager
  - ConfigManager
  - ConfigUpdateResult
  - MeshShaderConfig
  - MeshInterlaceConfig
  - DEType
  - classifyDEType
  - buildMeshSDFShader
  - buildMeshEscapeShader
  - buildMeshNewtonShader
  - buildMeshColorShader
  - buildMeshPreviewShader
  - MESH_SDF_VERT
  - MESH_FORMULA_UNIFORMS
depends_on:
  - e01-feature-system
  - e04-shader-builder
---

# engine-gmt / shader-pipeline

The GMT shader composition layer: a 17-position GLSL assembler (`ShaderBuilder`), the single dispatch entry (`ShaderFactory`), the typed shader configuration object (`ShaderConfig`), the base + feature-merged uniform schema (`UniformSchema`), the per-frame uniform writer (`UniformManager`), the React-to-engine config diff (`ConfigManager`), and a fully separate mesh-export GLSL generator (`SDFShaderBuilder`). The eight files in this subsystem cover every step between a feature definition + Zustand state and the final fragment shader the worker sends to the GPU.

## Public API

### Main GLSL assembler — `engine-gmt/engine/ShaderBuilder.ts`

| Symbol | Kind | Location | Role |
|---|---|---|---|
| `RenderVariant` | type alias | `engine-gmt/engine/ShaderBuilder.ts:39` | `'Main' \| 'Physics' \| 'Histogram' \| 'Mesh'` |
| `ShaderBuilder` | class | `engine-gmt/engine/ShaderBuilder.ts:42` | Variant-dispatched GLSL string assembler |
| `setRotation` | method | `engine-gmt/engine/ShaderBuilder.ts:96` | Toggle inclusion of rotation chunks in math GLSL |
| `setRenderMode` | method | `engine-gmt/engine/ShaderBuilder.ts:100` | `'Direct'` vs `'PathTracing'` (gates `traceSceneLean`) |
| `setQuality` | method | `engine-gmt/engine/ShaderBuilder.ts:104` | `isLite` + `precisionMode` for trace chunk selection |
| `setMaxLights` | method | `engine-gmt/engine/ShaderBuilder.ts:109` | Passed to fragment-main generator |
| `addDefine` | method | `engine-gmt/engine/ShaderBuilder.ts:117` | Position 1 |
| `addUniform` | method | `engine-gmt/engine/ShaderBuilder.ts:121` | Position 2 (extra uniforms beyond base schema) |
| `addHeader` | method | `engine-gmt/engine/ShaderBuilder.ts:125` | Position 3 |
| `addPreamble` | method | `engine-gmt/engine/ShaderBuilder.ts:130` | Position 7, dedupes by string equality |
| `addFunction` | method | `engine-gmt/engine/ShaderBuilder.ts:138` | Position 8 (pre-DE), dedupes |
| `setFormula` | method | `engine-gmt/engine/ShaderBuilder.ts:162` | Position 9: per-iter body, init, dist func |
| `setDistOverride` | method | `engine-gmt/engine/ShaderBuilder.ts:170` | Position 9: Modular DE override slots |
| `addHybridFold` | method | `engine-gmt/engine/ShaderBuilder.ts:186` | Position 9: hybrid init/preLoop/inLoop |
| `addPostDEFunction` | method | `engine-gmt/engine/ShaderBuilder.ts:146` | Position 10, dedupes |
| `addIntegrator` | method | `engine-gmt/engine/ShaderBuilder.ts:154` | Position 15, dedupes |
| `addPostMapCode` | method | `engine-gmt/engine/ShaderBuilder.ts:202` | Position 9 accumulative, inside `map()` |
| `addPostDistCode` | method | `engine-gmt/engine/ShaderBuilder.ts:209` | Position 9 accumulative, inside `mapDist()` |
| `addMaterialLogic` | method | `engine-gmt/engine/ShaderBuilder.ts:195` | Position 11 |
| `addMissLogic` | method | `engine-gmt/engine/ShaderBuilder.ts:248` | Position 12 |
| `addVolumeTracing` | method | `engine-gmt/engine/ShaderBuilder.ts:272` | Position 14: two-slot (march, finalize) |
| `requestShading` | method | `engine-gmt/engine/ShaderBuilder.ts:224` | Position 15: defers `getShadingGLSL` to `buildFragment` |
| `addShadingLogic` | method | `engine-gmt/engine/ShaderBuilder.ts:234` | Position 15 sub-slot: reflection code |
| `addPostProcessLogic` | method | `engine-gmt/engine/ShaderBuilder.ts:217` | Position 16 |
| `addCompositeLogic` | method | `engine-gmt/engine/ShaderBuilder.ts:241` | Position 17 |
| `buildMeshSDFLibrary` | method | `engine-gmt/engine/ShaderBuilder.ts:304` | Mesh-variant library output (no `#version`, no `main`) |
| `buildFragment` | method | `engine-gmt/engine/ShaderBuilder.ts:395` | Final assembly; dispatches on `variant` |

### Dispatch entry — `engine-gmt/engine/ShaderFactory.ts`

| Symbol | Kind | Location | Role |
|---|---|---|---|
| `ShaderFactory` | class | `engine-gmt/engine/ShaderFactory.ts:9` | Static methods, one per `RenderVariant` |
| `generateFragmentShader` | static | `engine-gmt/engine/ShaderFactory.ts:11` | Main full-pipeline shader |
| `generatePhysicsShader` | static | `engine-gmt/engine/ShaderFactory.ts:15` | Physics-probe variant |
| `generateHistogramShader` | static | `engine-gmt/engine/ShaderFactory.ts:19` | Histogram-analysis variant |
| `generateMeshSDFLibrary` | static | `engine-gmt/engine/ShaderFactory.ts:26` | Mesh GLSL library (wrapped externally) |

### Config + uniform contracts

| Symbol | Kind | Location | Role |
|---|---|---|---|
| `ShaderConfig` | interface | `engine-gmt/engine/ShaderConfig.ts:12` | Inputs to `ShaderFactory` + feature `inject()` |
| `GLSLType` | type alias | `engine-gmt/engine/UniformSchema.ts:10` | Allowed uniform GLSL types |
| `UniformDefinition` | interface | `engine-gmt/engine/UniformSchema.ts:12` | Name/type/default/arraySize/precision/backingOnly |
| `UNIFORM_SCHEMA` | const | `engine-gmt/engine/UniformSchema.ts:83` | Base + deduped feature uniforms |
| `UNIFORM_DEFAULTS` | const | `engine-gmt/engine/UniformSchema.ts:85` | Name → default map |
| `createUniforms` | function | `engine-gmt/engine/UniformSchema.ts:90` | Clones defaults into Three.js IUniform records |

### Per-frame writer + config diff

| Symbol | Kind | Location | Role |
|---|---|---|---|
| `UniformManager` | class | `engine-gmt/engine/managers/UniformManager.ts:18` | Per-frame uniform sync (engine-gmt only) |
| `ConfigUpdateResult` | interface | `engine-gmt/engine/managers/ConfigManager.ts:9` | 4-flag diff result |
| `ConfigManager` | class | `engine-gmt/engine/managers/ConfigManager.ts:16` | Authoritative config + uniform back-fill |

### Mesh-export shader generator — `engine-gmt/engine/SDFShaderBuilder.ts`

A self-contained generator that does **not** use `ShaderBuilder`. Assembles raw GLSL strings from a `FractalDefinition.shader` to emit five distinct fragment shaders for the mesh-export pipeline.

| Symbol | Kind | Location | Role |
|---|---|---|---|
| `MeshShaderConfig` | interface | `engine-gmt/engine/SDFShaderBuilder.ts:50` | Definition + DE type + optional interlace + estimator |
| `MeshInterlaceConfig` | interface | `engine-gmt/engine/SDFShaderBuilder.ts:42` | Secondary-formula interlace block |
| `DEType` | type alias | `engine-gmt/engine/SDFShaderBuilder.ts:58` | `'power' \| 'ifs' \| 'custom'` |
| `classifyDEType` | function | `engine-gmt/engine/SDFShaderBuilder.ts:65` | Heuristic auto-detect (boxFold/sphereFold/abs(z)+dr → ifs) |
| `buildMeshSDFShader` | function | `engine-gmt/engine/SDFShaderBuilder.ts:278` | Multi-sample voxel SDF sampling fragment |
| `buildMeshEscapeShader` | function | `engine-gmt/engine/SDFShaderBuilder.ts:390` | Interior/exterior (1/0) classifier |
| `buildMeshNewtonShader` | function | `engine-gmt/engine/SDFShaderBuilder.ts:437` | Vertex Newton projection with MRT (position + normal) |
| `buildMeshColorShader` | function | `engine-gmt/engine/SDFShaderBuilder.ts:526` | Orbit-trap false-color vertex coloring |
| `buildMeshPreviewShader` | function | `engine-gmt/engine/SDFShaderBuilder.ts:580` | Orthographic raymarched preview with AO |
| `MESH_SDF_VERT` | const | `engine-gmt/engine/SDFShaderBuilder.ts:263` | Shared fullscreen-quad vertex via `gl_VertexID` |
| `MESH_FORMULA_UNIFORMS` | const | `engine-gmt/engine/SDFShaderBuilder.ts:698` | Name list for `getUniformLocation` lookup |

## Architecture

### `ShaderFactory` is the single dispatch entry

All four `RenderVariant` values funnel through `ShaderFactory.buildShader` (`engine-gmt/engine/ShaderFactory.ts:30`). It instantiates a fresh `ShaderBuilder(variant)`, calls `setRenderMode` from `config.renderMode` / `config.lighting.renderMode` (`engine-gmt/engine/ShaderFactory.ts:34-38`), `setQuality` from `config.quality.precisionMode` (`engine-gmt/engine/ShaderFactory.ts:41-44`), then iterates `featureRegistry.getAll()` and calls `feat.inject(builder, config, variant)` for **every** feature regardless of enabled state (`engine-gmt/engine/ShaderFactory.ts:49-57`). The comment at `engine-gmt/engine/ShaderFactory.ts:51-54` justifies the always-inject contract: disabled features must still emit empty stubs so downstream functions (e.g. `calculateShading`) don't get undefined references.

### The 17-position assembly order

The canonical contract for `RenderVariant === 'Main'` is the inline comment block at `engine-gmt/engine/ShaderBuilder.ts:1-26`. It enumerates positions 1-17 with the method that writes each. Followup q-032 (`plans/doc-audit-state/survey/_followups/q-032.md:18-37`) is the authoritative cross-reference for storage fields and ordering.

| Position | Section | Injection method | Storage field |
|---|---|---|---|
| 1 | Defines | `addDefine` (`engine-gmt/engine/ShaderBuilder.ts:117`) | `defines` (Map) |
| 2 | Uniforms | `addUniform` (`engine-gmt/engine/ShaderBuilder.ts:121`) | `uniforms` (Map) |
| 3 | Headers | `addHeader` (`engine-gmt/engine/ShaderBuilder.ts:125`) | `headers[]` |
| 4-6 | Math / Blue Noise / Coloring | core (always present, via `getMathGLSL`, `BLUE_NOISE`, `COLORING`) | n/a |
| 7 | Preambles | `addPreamble` (`engine-gmt/engine/ShaderBuilder.ts:130`) | `preambles[]` |
| 8 | Pre-DE functions | `addFunction` (`engine-gmt/engine/ShaderBuilder.ts:138`) | `preDEFunctions[]` |
| 9 | DE body | `setFormula`, `setDistOverride`, `addHybridFold`, `addPostMapCode`, `addPostDistCode` | `formula*`, `distOverride*`, `hybridInit/PreLoop/InLoop[]`, `postMapCode[]`, `postDistCode[]` |
| 10 | Post-DE functions | `addPostDEFunction` (`engine-gmt/engine/ShaderBuilder.ts:146`) | `postDEFunctions[]` |
| 11 | Material eval | `addMaterialLogic` (`engine-gmt/engine/ShaderBuilder.ts:195`) | `materialLogic[]` |
| 12 | Miss handler | `addMissLogic` (`engine-gmt/engine/ShaderBuilder.ts:248`) | `missLogic[]` |
| 13 | Ray generation | core (`getRayGLSL`) | n/a |
| 14 | Volumetric trace body + finalize | `addVolumeTracing(march, finalize)` (`engine-gmt/engine/ShaderBuilder.ts:272`) | `volumeBody[]`, `volumeFinalize[]` |
| 15 | Integrators (+ deferred shading) | `addIntegrator` (`engine-gmt/engine/ShaderBuilder.ts:154`); `requestShading` + `addShadingLogic` (`engine-gmt/engine/ShaderBuilder.ts:224-236`) | `integrators[]`, `needsShading`, `shadingReflectionCode[]` |
| 16 | Post processing | `addPostProcessLogic` (`engine-gmt/engine/ShaderBuilder.ts:217`) | `postProcessLogic[]` |
| 17 | Main fragment composite | `addCompositeLogic` (`engine-gmt/engine/ShaderBuilder.ts:241`) | `compositeLogic[]` |

Final Main-variant template literal at `engine-gmt/engine/ShaderBuilder.ts:603-632` is the byte-level source of ordering truth. The deferred shading integrator is appended at `engine-gmt/engine/ShaderBuilder.ts:404-408`: if `needsShading` was set by `requestShading`, the accumulated `shadingReflectionCode` is passed to `getShadingGLSL` and pushed onto `integrators[]` before assembly.

### Variant gates

`buildFragment` (`engine-gmt/engine/ShaderBuilder.ts:395`) dispatches:

- **`'Mesh'`** → `buildMeshSDFLibrary` (`engine-gmt/engine/ShaderBuilder.ts:304`). Emits positions 1-9 only, wraps DE with stub uniforms (`uSceneOffsetLow`, `uSceneOffsetHigh`, `uCameraPosition`, `uColorIter`, `uColorMode`, etc., `engine-gmt/engine/ShaderBuilder.ts:358-367`), a no-op `applyPrecisionOffset` (`engine-gmt/engine/ShaderBuilder.ts:373`), and a `formulaDE(pos) = mapDist(pos)` entry point (`engine-gmt/engine/ShaderBuilder.ts:388-390`). Returns a GLSL library without `#version` or `void main` — `gpu-pipeline.ts` (mesh-export tool) wraps it.
- **`'Physics'`** → positions 1-10 plus a hand-inlined simplified `traceScene` and a minimal `main` (`engine-gmt/engine/ShaderBuilder.ts:431-506`). No material, miss, integrator, post, composite.
- **`'Histogram'`** → positions 1-10 plus core trace + core ray-gen + a minimal `main` that calls `getMappingValue` (`engine-gmt/engine/ShaderBuilder.ts:509-561`).
- **`'Main'`** → all 17 positions (`engine-gmt/engine/ShaderBuilder.ts:563-633`). Only variant that emits material eval, miss handler, integrators, post, composite. `traceSceneLean` is appended only when `renderMode === 'PathTracing'` (`engine-gmt/engine/ShaderBuilder.ts:569-571`), with empty volume body and `functionName='traceSceneLean'`.

### `SDFShaderBuilder` — a parallel mesh path

`engine-gmt/engine/SDFShaderBuilder.ts` is a fully separate generator (it does not instantiate `ShaderBuilder` and is not invoked from `ShaderFactory`). It assembles raw GLSL strings directly from `FractalDefinition.shader` (`function`, `preamble`, `loopBody`, `loopInit`, `getDist`) and emits five complete `#version 300 es` fragment shaders for the mesh-export GPU pipeline. The shared iteration loop builder at `engine-gmt/engine/SDFShaderBuilder.ts:209` wires interlace (`buildInterlaceLoopGLSL` from the interlace feature, `engine-gmt/engine/SDFShaderBuilder.ts:221`) and conditionally initializes cutting-plane accumulators (`engine-gmt/engine/SDFShaderBuilder.ts:234-236`).

`buildEstimatorMath` (`engine-gmt/engine/SDFShaderBuilder.ts:100`) supports five DE estimators (0 Log, 1 Linear, 2 Pseudo, 3 Dampened, 4 Linear2) plus 5 Cutting Plane (`engine-gmt/engine/SDFShaderBuilder.ts:124-125`). When CP is requested but the formula does not declare `supportsCuttingPlane`, the path falls back to Linear at `engine-gmt/engine/SDFShaderBuilder.ts:101`. `pairSupportsCP` (`engine-gmt/engine/SDFShaderBuilder.ts:204`) gates `cp_*` global emission on primary-or-interlace-secondary declaring CP support.

### `UniformSchema` — base + feature merge

`UNIFORM_SCHEMA` (`engine-gmt/engine/UniformSchema.ts:83`) is built once at module load. `BASE_SCHEMA` (`engine-gmt/engine/UniformSchema.ts:26-75`) holds 30 entries scoped to pipeline / camera / region / progressive / scale / rotation matrices. `featureUniforms` is pulled from `featureRegistry.getUniformDefinitions()` (`engine-gmt/engine/UniformSchema.ts:77`) and filtered by name against `BASE_SCHEMA` (`engine-gmt/engine/UniformSchema.ts:80-81`). `registerFeatures()` is forced at module load via the side-effecting import at `engine-gmt/engine/UniformSchema.ts:5-8` so the registry is populated before the schema array materializes.

`createUniforms` (`engine-gmt/engine/UniformSchema.ts:90`) clones defaults: `val.clone()` for THREE objects, element-clone for arrays of THREE objects, fresh `Float32Array` copy for typed arrays.

`UniformDefinition.backingOnly` (`engine-gmt/engine/UniformSchema.ts:19-21`) creates a Three.js uniform backing without emitting a GLSL declaration — used by `uModularParams` so the slot exists for all formulas but only the Modular path emits the GLSL.

### `UniformManager` — per-frame writer (engine-gmt only)

The engine-core sibling `engine/managers/` directory has only `ConfigManager.ts`; `UniformManager` is engine-gmt-only (verified in followup q-099, `plans/doc-audit-state/survey/_followups/q-099.md:23-25`). `syncFrame` (`engine-gmt/engine/managers/UniformManager.ts:64`) is a fat ordered pipeline:

1. **Adaptive resize** (`engine-gmt/engine/managers/UniformManager.ts:78-154`) gated on `!isExporting && !isBucketRendering`. Delegates the scale decision to `tickAdaptiveResolution` from `engine/AdaptiveResolution.ts` (`engine-gmt/engine/managers/UniformManager.ts:96-109`), then translates the scale into integer pixel dimensions, applies a 5% delta guard in smart mode (`engine-gmt/engine/managers/UniformManager.ts:118`), and sets `_adaptive.selfResized` (`engine-gmt/engine/managers/UniformManager.ts:137`) so the algorithm doesn't observe its own resize as user activity. The `adaptiveSuppressed` flag (`engine-gmt/engine/managers/UniformManager.ts:108`) hard-forces full res when the bucket-render dialog or export is in flight — without it, the FBO resizes mid-export and briefly displays the cleared buffer.
2. **Image-tile sync** (`engine-gmt/engine/managers/UniformManager.ts:160-164`) — copies resolution into `uFullOutputResolution` when no tile is active so cross-tile blue-noise lookups stay continuous.
3. **Camera basis** (`engine-gmt/engine/managers/UniformManager.ts:166-205`) — applies rotation modulations, builds `uCamBasisX/Y/Forward` (scaled by `tanFov` or `orthoScale/2`), zeros `uCameraPosition`.
4. **`uPixelSizeBase`** (`engine-gmt/engine/managers/UniformManager.ts:213-214`) — pre-computed `height * 2.0 / viewportY` where `viewportY = uResolution.y * adaptive.scale`. Anchored to the *pre-adaptive* viewport so trace precision, normal epsilon, and shadow bias stay screen-pixel-invariant under adaptive downscale.
5. **Virtual-space update** (`engine-gmt/engine/managers/UniformManager.ts:225-229`) — splits camera position into `uSceneOffsetHigh`/`uSceneOffsetLow`.
6. **Time + env rotation** (`engine-gmt/engine/managers/UniformManager.ts:231-239`) — `uTime`, plus a CPU `mat2` derivation from scalar `uEnvRotation` into `uEnvRotationMatrix`.
7. **Fog linearization** (`engine-gmt/engine/managers/UniformManager.ts:241-258`) — solves the ACES tonemap quadratic per-channel to produce `uFogColorLinear`, eliminating per-pixel `sqrt`+clamp in `InverseACESFilm`.
8. **Light packing** (`engine-gmt/engine/managers/UniformManager.ts:260-358`) — writes `uLightType` (0=Point, 1=Directional, 2=Sphere, `engine-gmt/engine/managers/UniformManager.ts:290`), position via `VirtualSpace.getLightShaderVector`, falloff polynomial coefficients (linear vs quadratic via `range`-derived k, `engine-gmt/engine/managers/UniformManager.ts:307-317`), radius/softness/`hideEmitter`. Direction is computed YXZ-Euler, optionally re-applied via camera quaternion for headlamp lights (`engine-gmt/engine/managers/UniformManager.ts:350-352`), then negated before write (`engine-gmt/engine/managers/UniformManager.ts:354-356`) so the shader reads "toward-light".
9. **3-stage rotation matrices** (`engine-gmt/engine/managers/UniformManager.ts:360-394`) — when `geometry.preRotMaster && preRotEnabled`, writes `uPreRotMatrix`, `uPostRotMatrix`, `uWorldRotMatrix` via `buildRotMatrix` (`engine-gmt/engine/managers/UniformManager.ts:398-412`) using Z·X·Y Euler ordering; otherwise identity.

`getAdaptiveGrace` (`engine-gmt/engine/managers/UniformManager.ts:50`) exposes the FPS-scaled grace window so `FractalEngine` can hold accumulation until adaptive resolution has settled at full res.

### `ConfigManager` — owns `ShaderConfig` + classifies diffs

The class (`engine-gmt/engine/managers/ConfigManager.ts:16`) holds the authoritative `ShaderConfig` and a `uniformToPath` Map (`engine-gmt/engine/managers/ConfigManager.ts:19`) resolving uniform name → `{ featureId, paramId, isCompileTime }`. `update(newConfig, runtimeState)` (`engine-gmt/engine/managers/ConfigManager.ts:132`) diffs incoming config and returns a `ConfigUpdateResult` with four flags:

- `rebuildNeeded` — set whenever a `compileTime` param changes, `formula` changes, `compilerHardCap` changes, `isMobile` changes, or (Modular only) `pipelineRevision` changes.
- `uniformUpdate` — set when any feature slice was merged (uniforms need writing this frame).
- `modeChanged` — set when `lighting.renderMode` or root `renderMode` flips Direct ↔ PathTracing.
- `needsAccumReset` — set when any non-`noReset` param changes.

Compile-trigger changes batch via a 50ms `setTimeout` (`engine-gmt/engine/managers/ConfigManager.ts:205-206`); `flushRebuildLog` (`engine-gmt/engine/managers/ConfigManager.ts:49-59`) emits `compile_estimate` via `FractalEvents` using `detectEngineProfile` + `estimateCompileTime` from `features/engine/profiles`.

`syncUniform` (`engine-gmt/engine/managers/ConfigManager.ts:61`) is the reverse path — when an outside writer (e.g. `Uniforms.set()`) touches a uniform, `ConfigManager` mirrors the value into the right feature slice. Skips `isCompileTime` params (would silently miss the rebuild trigger) and values with `isGradientBuffer === true` (`engine-gmt/engine/managers/ConfigManager.ts:69-70`) since gradient textures are derived `Uint8Array` buffers, not source `GradientStop[]`.

`areValuesEqual` (`engine-gmt/engine/managers/ConfigManager.ts:80`) supports numeric tolerance (1e-6), THREE Color/Vector3/Vector2 (component compare), cross-compare with plain `{x,y,z}` deserialized objects (lifts the plain side into THREE), and arrays (length plus `JSON.stringify`).

Modular pipeline rebuild gate: only when `formula === 'Modular'` does a `pipelineRevision` bump force `rebuildNeeded` (`engine-gmt/engine/managers/ConfigManager.ts:243-249`). Bare `pipeline` updates with no revision bump set `uniformUpdate` + `needsAccumReset` only (`engine-gmt/engine/managers/ConfigManager.ts:250-254`) so structural changes recompile but param-only changes stay runtime.

## Invariants

- **Always-inject contract.** `ShaderFactory.buildShader` calls `feat.inject()` for every registered feature regardless of enabled state (`engine-gmt/engine/ShaderFactory.ts:50-56`). Features that have a `toggleParam` MUST defensively emit empty stubs when disabled, or other code that references their functions (`calculateShading`, miss handler, post-process) will fail GL compile.
- **Dedupe by reference string.** `addPreamble`, `addFunction`, `addPostDEFunction`, `addIntegrator` all gate on `includes(code)` (`engine-gmt/engine/ShaderBuilder.ts:131-133, 139-141, 147-149, 155-157`). Two features emitting semantically-identical-but-textually-different strings both inject → duplicate function definitions → GL compile error. Convention: features emit a single canonical chunk constant, not a per-call template.
- **`Mesh` variant is a library, not a shader.** `buildMeshSDFLibrary` (`engine-gmt/engine/ShaderBuilder.ts:304`) emits no `#version`, no `void main`. Callers (the mesh-export `gpu-pipeline.ts`) must wrap it. Reached via either `variant === 'Mesh'` on `buildFragment` (`engine-gmt/engine/ShaderBuilder.ts:396`) or `ShaderFactory.generateMeshSDFLibrary` (`engine-gmt/engine/ShaderFactory.ts:26-28`).
- **`SDFShaderBuilder` ↔ `core_math.ts` CP-globals mirror.** The `CP_PREAMBLE_GLOBALS` constant (`engine-gmt/engine/SDFShaderBuilder.ts:31-36`) must stay byte-shape-compatible with `CP_PREAMBLE` / `CP_INIT` in `engine-gmt/features/core_math.ts`. The mirror is called out at `engine-gmt/engine/SDFShaderBuilder.ts:28-30`. Drift silently breaks Cutting Plane DE for one path or the other.
- **`UniformSchema` registration is side-effecting at module load.** `registerFeatures()` is invoked at `engine-gmt/engine/UniformSchema.ts:8` before `UNIFORM_SCHEMA` is built. Any import cycle that touches `UniformSchema` before features finish side-effects must be safe — registration is idempotent but timing-sensitive.
- **Silent uniform name collisions** (followup q-029, `plans/doc-audit-state/survey/_followups/q-029.md:19-29`). `engine-gmt/engine/UniformSchema.ts:79-81` filters feature-vs-base collisions with no warning and no log. `featureRegistry.getUniformDefinitions()` upstream does no feature-vs-feature collision check, so two features declaring the same `param.uniform` both appear, and `UNIFORM_DEFAULTS`' reduce at `engine-gmt/engine/UniformSchema.ts:85-88` overwrites last-wins. Convention is base uses generic names (`uTime`, `uResolution`, `uCameraPosition`) and features use themed prefixes (`uPT…`, `uLight…`, `uModular…`); enforce in review.
- **Light direction stored toward-light.** `dirArr[i]` is `.negate().normalize()` before write (`engine-gmt/engine/managers/UniformManager.ts:354-356`). Every shader consumer (NdotL, shadows, volumetrics) uses it without per-consumer negation. Reversing the convention forces touch-ups in every chunk.
- **`syncFrame` ordering is load-bearing.** Resize → image-tile sync → camera basis → `uPixelSizeBase` → virtual-space → time → fog → lights → rotations (`engine-gmt/engine/managers/UniformManager.ts:78-394`). `uPixelSizeBase` derivation at line 213-214 needs the *post-adaptive* `viewportY` value; lights need `uCameraPosition` zeroed first (line 205); virtual-space update needs `uSceneOffsetHigh/Low` value handles wired before `updateShaderUniforms` runs.
- **`ConfigManager.syncUniform` skips gradient buffers.** Storing the derived `Uint8Array` would corrupt the config; the source `GradientStop[]` lives elsewhere. Gate at `engine-gmt/engine/managers/ConfigManager.ts:69-70`.
- **`ConfigManager` compile-log batching survives synchronous rebuilds.** The 50ms `setTimeout` (`engine-gmt/engine/managers/ConfigManager.ts:205-206`) and shared `pendingLogChanges` (`engine-gmt/engine/managers/ConfigManager.ts:21`) collapse a synchronous chain of `update()` calls into one grouped log even if a shader rebuild happens between them.
- **`pipelineRevision` is the modular-rebuild trigger.** Without a bump, even a `pipeline` array change won't rebuild — only updates uniforms. Tools that need a structural rebuild must increment the revision. Engine-gmt's `ShaderConfig.pipelineRevision` is typed required (`engine-gmt/engine/ShaderConfig.ts:16`) but the `[key: string]: any` index signature at `engine-gmt/engine/ShaderConfig.ts:25` defeats compiler enforcement — discipline confirmed at all construction sites in followup q-101 (`plans/doc-audit-state/survey/_followups/q-101.md:24-29`).
- **`ShaderConfig.formula` is structurally typed, feature slices are `any`.** Comment at `engine-gmt/engine/ShaderConfig.ts:23-25` flags the unfinished work as a `FeatureStateMap` intersection. Status per followup q-100 (`plans/doc-audit-state/survey/_followups/q-100.md:22-29`): `FeatureStateMap` itself exists; the intersection is deferred (Code-Health Category 3). The engine-core fork has moved past this model to per-app declaration merging (see `docs/engine/16_Type_Augmentation.md` and `engine/ShaderConfig.ts:5-10`).

## Interactions with other subsystems

- **`e01-feature-system` — parametrisation hook.** `featureRegistry.getAll()` is iterated by `ShaderFactory.buildShader` (`engine-gmt/engine/ShaderFactory.ts:47`); `featureRegistry.getUniformDefinitions()` is consumed by `UNIFORM_SCHEMA` (`engine-gmt/engine/UniformSchema.ts:77`). `ConfigManager.buildUniformMap` (`engine-gmt/engine/managers/ConfigManager.ts:34-47`) walks every feature param to build the uniform-name → path index. The two `engine/UniformSchema.ts` ↔ `engine-gmt/engine/UniformSchema.ts` copies differ only at the `registerFeatures` import path (`'./features'` vs `'../features'`); the divergence is a parametrisation hook over sibling `features/` directories, not duplicated logic — see followup q-097 (`plans/doc-audit-state/survey/_followups/q-097.md:19-27`) and `docs/modules/engine-fork-rules.md`.
- **`e04-shader-builder` — divergent fork.** The engine-core `engine/ShaderBuilder.ts` (136 lines, generic 5-primitive `addSection`/`getSections` plugin API) and this subsystem's `engine-gmt/engine/ShaderBuilder.ts` (635 lines, typed 17-position assembler) share the class name but are structurally unrelated. The GMT builder has no `addSection` / `getSections`; the engine-core `RenderVariant` enum anticipates GMT's variant set but the engine-core base carries no variant-specific assembly logic. Followups q-032 (`plans/doc-audit-state/survey/_followups/q-032.md:46-49`) and q-096 (`plans/doc-audit-state/survey/_followups/q-096.md:21-29`) are the cross-references. Recommended rename `engine-gmt/engine/ShaderBuilder.ts` → `GmtShaderBuilder.ts` per `docs/engine/21_Code_Review_2026-04-25.md:168` has not been applied. See `docs/modules/engine-fork-rules.md` for the broader fork pattern.
- **`UniformNames` — re-export shim.** `engine-gmt/engine/UniformNames.ts:1-2` is a 2-line `export * from '../../engine/UniformNames'` — no GMT-specific uniform names. Canonical example of the re-export pattern (contrast with `UniformSchema`'s parametrisation hook). See `docs/modules/engine-fork-rules.md`.
- **`ConfigManager` divergence.** The engine-core sibling `engine/managers/ConfigManager.ts` is genericized (~184 lines); engine-gmt's copy (`engine-gmt/engine/managers/ConfigManager.ts`, 259 lines) carries four deliberate couplings stripped from the extract: `detectEngineProfile` + `estimateCompileTime` (`engine-gmt/engine/managers/ConfigManager.ts:4`), `FractalEvents.emit('compile_estimate')` (`engine-gmt/engine/managers/ConfigManager.ts:58`), batched compile log (`engine-gmt/engine/managers/ConfigManager.ts:21-22, 49-59, 201-207`), and lighting/Modular special cases (`engine-gmt/engine/managers/ConfigManager.ts:161-167, 243-254`). Intentional fork choice — see followup q-098 (`plans/doc-audit-state/survey/_followups/q-098.md:17-25`).
- **`UniformManager` is engine-gmt-only.** No sibling exists in `engine/managers/`; followup q-099 (`plans/doc-audit-state/survey/_followups/q-099.md:23-25`) confirms the directory contains only `ConfigManager.ts` on the engine-core side. Adaptive-resolution state is delegated to the generic engine-core `engine/AdaptiveResolution.ts` module via `tickAdaptiveResolution` (`engine-gmt/engine/managers/UniformManager.ts:11-16, 96-109`) so the same algorithm can drive any iterative renderer.
- **`g01-renderer` — consumer.** `FractalEngine` instantiates `ConfigManager` and `MaterialController`, calls `UniformManager.syncFrame` per tick, drives `ShaderFactory.generateFragmentShader` through `MaterialController`'s two-stage compile, and reads `MESH_FORMULA_UNIFORMS` indirectly through the mesh-export tool. See `docs/modules/engine-gmt/renderer.md`.
- **Mesh export (`g07-mesh-export`) — consumes both paths.** The `Mesh` variant of `ShaderBuilder` (via `ShaderFactory.generateMeshSDFLibrary`) produces a wrapped GLSL library; the parallel `SDFShaderBuilder` produces five complete shaders. Both coexist; `plans/mesh-export-unification.md` (untracked at repo root) is the natural home for any future unification.
- **Interlace (`features/interlace/`)** — `SDFShaderBuilder` consumes `rewriteFormulaFunction`, `rewriteLoopBody`, `rewriteLoopInit`, `rewritePreamble`, `buildInterlaceLoopGLSL`, `INTERLACE_UNIFORM_NAMES` from `engine-gmt/features/interlace/glslRewriter` (`engine-gmt/engine/SDFShaderBuilder.ts:12-19`). `MESH_FORMULA_UNIFORMS` (`engine-gmt/engine/SDFShaderBuilder.ts:698-714`) spreads the interlace name lists for WebGL location lookup.

## Known issues / Phase 2 carry-in

| Question | Kind | Summary |
|---|---|---|
| q-029 (`plans/doc-audit-state/survey/_followups/q-029.md`) | drift | Two silent uniform-name collision paths (base-vs-feature filter at `engine-gmt/engine/UniformSchema.ts:77-83`; feature-vs-feature last-wins via `UNIFORM_DEFAULTS` reduce at `engine-gmt/engine/UniformSchema.ts:85-88`). Convention `uPT*`/`uLight*`/`uModular*` prefixes is enforced only at code review. |
| q-032 (`plans/doc-audit-state/survey/_followups/q-032.md`) | doc-rewrite | 17-position assembly contract + variant-gate behaviour. Architectural anchor; canonical source is the comment block at `engine-gmt/engine/ShaderBuilder.ts:1-26` and the Main template at `engine-gmt/engine/ShaderBuilder.ts:603-632`. |
| q-095 (`plans/doc-audit-state/survey/_followups/q-095.md`) | orphan-sweep | Dead profiling block in `ShaderBuilder.buildFragment` Main variant at `engine-gmt/engine/ShaderBuilder.ts:577-601`. Builds an 18-entry `sections` array and derives `profile`/`totalSize` but never reads them. Either delete or wire to `console.debug`. |
| q-096 (`plans/doc-audit-state/survey/_followups/q-096.md`) | drift | Class-name collision between `engine/ShaderBuilder.ts` (136L generic) and `engine-gmt/engine/ShaderBuilder.ts` (635L assembler). `21_Code_Review:168` recommends rename to `GmtShaderBuilder` — not done. `docs/gmt/08_File_Structure.md:20` describes the GMT semantics under the engine-core path (silent path-vs-semantics mismatch). |
| q-097 (`plans/doc-audit-state/survey/_followups/q-097.md`) | drift | Original survey called `UniformSchema.ts` "verbatim copy, convert to re-export". Refuted: the one-line import-path divergence (`'./features'` vs `'../features'`) is a parametrisation hook over sibling `features/` directories. Re-export would compose the wrong registry. Optional future refactor: extract `BASE_SCHEMA` constant + `composeSchema(registerFn, registry)` factory. |
| q-098 (`plans/doc-audit-state/survey/_followups/q-098.md`) | drift | `ConfigManager` 74-line delta vs engine-core is intentional. Engine-gmt carries `detectEngineProfile`, `FractalEvents`, batched compile log, lighting/Modular special cases. JSDoc on engine-core file is canonical contract; do NOT back-port to engine-gmt. |
| q-099 (`plans/doc-audit-state/survey/_followups/q-099.md`) | drift | Six concrete `docs/gmt/02_Rendering_Internals.md` (×3), `docs/specs/10_Shaped_Emission.md` (×2), `docs/gmt/43_Bucket_Render_Overhaul.md` (×1) references drop the `engine-gmt/` prefix from `engine/managers/UniformManager.ts` paths and would 404. Two `docs/CHANGELOG_DEV.md` entries are correctly left alone (historical). |
| q-100 (`plans/doc-audit-state/survey/_followups/q-100.md`) | cleanup | Stale TODO comment in `engine-gmt/engine/ShaderConfig.ts:23-25` lags engine-core direction. `FeatureStateMap` is implemented; unfinished work is the intersection. Engine-core has moved to per-app declaration merging. Tracked under Code-Health Category 3, not a new debt item. |
| q-101 (`plans/doc-audit-state/survey/_followups/q-101.md`) | drift | `pipelineRevision` typed required in engine-gmt (`engine-gmt/engine/ShaderConfig.ts:16`); legacy engine still optional. `[key: string]: any` defeats strict checking but discipline holds at all 4 observed construction sites. |
| Survey open question (`plans/doc-audit-state/survey/g02-shader-pipeline.md:178-185`) | aspirational | The unfinished `FeatureStateMap` intersection on `ShaderConfig` is the principal source of `any` Category 3 (~175 instances). Deferred per `docs/gmt/07_Code_Health.md` rationale: friction on primary developer activity. |

## Historical context

This subsystem's `preserve-with-pointer` disposition (`plans/doc-audit-state/phase-2-disposition.json` entry for `docs/gmt/02_Rendering_Internals.md`) keeps the existing rendering-internals doc as design-rationale reference and captures the current API + composition plumbing here. See `docs/gmt/02_Rendering_Internals.md` for design rationale — the doc is canonical for hard-won rendering math and quirks that this module doc does not duplicate:

> Two-Schlick-formula rationale (per-light vs reflection throughput); fog color pre-linearization rationale; lean bounce tracer (traceSceneLean) emitted alongside traceScene for PT bounces; bounce bias biasEps = pixelSizeScale * length(p_ray); volumetric stochastic gate exp2(-7+4*uVolQuality); warp coherence load-bearing (small mixing constants 7.43/1.0 keep warps coherent); two-stage compile spec; Henyey-Greenstein phase function; Beer-Lambert; sphere-area-light MIS Veach 1995 power-heuristic (β=2); stochasticSeed must have per-pixel variation via blue noise (mandatory); PT bounces don't accumulate vol (design); bench harness flag list; three-layer bucket render lock; async convergence via gl.fenceSync; tile bloom/CA seam handling.

(Quoted preservable signal from `plans/doc-audit-state/phase-2-disposition.json` entry.)

The doc-audit survey (`plans/doc-audit-state/survey/g02-shader-pipeline.md:144-173`) reports that `docs/gmt/02_Rendering_Internals.md` confirms rendering math at file:line in 8 rows ("OK") and has 8 "Missing" gaps for the composition plumbing — the builder API surface, ConfigManager internals, UniformManager `syncFrame` scope, Mesh variant path. This new module doc covers the gaps; the existing doc remains the source for rendering algorithms.

Cross-references:
- `docs/modules/engine-fork-rules.md` — the engine vs engine-gmt fork patterns. `ShaderBuilder` is the divergent-fork exemplar; `UniformSchema` is the parametrisation-hook exemplar; `UniformNames` is the re-export shim exemplar; `UniformManager` is the engine-gmt-only exemplar.
- `docs/modules/engine-gmt/renderer.md` — `FractalEngine` + `MaterialController` driving this pipeline.
- `docs/gmt/03_Modular_System.md` — Modular formula's `uModularParams` + `backingOnly` flag + structural-vs-param diff semantics (consumed by `ConfigManager.update`).
- `docs/gmt/24_Formula_Interlace_System.md` — interlace system + `preambleVars` contract (consumed by `SDFShaderBuilder` via `glslRewriter`).
- `docs/gmt/30_Mesh_Export_Prototype.md` — mesh export tool + VDB writer + pipeline (consumes `MESH_FORMULA_UNIFORMS` and the five `buildMesh*Shader` functions).
