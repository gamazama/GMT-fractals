---
subsystem_id: g02-shader-pipeline
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine-gmt/engine/SDFShaderBuilder.ts
    blob_sha: a5563b2599e95d074d84ec89c7ded0df1e47b5e5
    lines_read: 714
  - path: engine-gmt/engine/ShaderBuilder.ts
    blob_sha: 2f66a9680c6f07f5e334d9172c763ffcc8727462
    lines_read: 634
  - path: engine-gmt/engine/ShaderFactory.ts
    blob_sha: dfbe7acd7b8c755b6132066c19022fc66667e3dd
    lines_read: 62
  - path: engine-gmt/engine/ShaderConfig.ts
    blob_sha: f99f140fa57b7bfeb354d95ef02470a9d84aca6d
    lines_read: 26
  - path: engine-gmt/engine/UniformSchema.ts
    blob_sha: 267fbb91591adf2202ceba758067113e4026e5a9
    lines_read: 104
  - path: engine-gmt/engine/UniformNames.ts
    blob_sha: 0196f8049588cbe987de7b4e44df393a5da8a365
    lines_read: 2
  - path: engine-gmt/engine/managers/UniformManager.ts
    blob_sha: 70aa9254afd43a2a76c59a27598ac2a9faf8c7d2
    lines_read: 413
  - path: engine-gmt/engine/managers/ConfigManager.ts
    blob_sha: 00ed5c89aa1a9523bc21de9c3991139e50015bae
    lines_read: 258
confidence:
  SDFShaderBuilder.ts: full
  ShaderBuilder.ts: full
  ShaderFactory.ts: full
  ShaderConfig.ts: full
  UniformSchema.ts: full
  UniformNames.ts: full
  UniformManager.ts: full
  ConfigManager.ts: full
---

## Public API surface

**`SDFShaderBuilder.ts`** (standalone mesh-export GLSL generator — independent of `ShaderBuilder`):
- `MeshShaderConfig` interface (SDFShaderBuilder.ts:50-56) — `{ definition, deType, deSamples?, interlace?, estimator? }`.
- `MeshInterlaceConfig` interface (SDFShaderBuilder.ts:42-48).
- `DEType` = `'power' | 'ifs' | 'custom'` (SDFShaderBuilder.ts:58).
- `classifyDEType(def)` (SDFShaderBuilder.ts:65) — heuristic auto-detect from formula GLSL body (boxFold/sphereFold → ifs; Sierpinski-like dr accumulation → ifs; abs(z)+dr scaling → ifs; else power).
- `buildMeshSDFShader(config)` (SDFShaderBuilder.ts:278) — full `#version 300 es` voxel SDF sampling fragment.
- `buildMeshEscapeShader(config)` (SDFShaderBuilder.ts:390) — interior/exterior classifier (1/0 output).
- `buildMeshNewtonShader(config)` (SDFShaderBuilder.ts:437) — vertex Newton-projection with MRT (`outPosition`, `outNormal`).
- `buildMeshColorShader(config)` (SDFShaderBuilder.ts:526) — orbit-trap false-color vertex coloring.
- `buildMeshPreviewShader(config)` (SDFShaderBuilder.ts:580) — orthographic raymarcher with diffuse + AO.
- `MESH_SDF_VERT` (SDFShaderBuilder.ts:263) — shared fullscreen-quad vertex (uses `gl_VertexID`).
- `MESH_FORMULA_UNIFORMS` (SDFShaderBuilder.ts:698) — name list for `getUniformLocation` lookup; includes formula params + interlace + quality + bounds.

**`ShaderBuilder.ts`** (main DDFS GLSL composer):
- `RenderVariant` = `'Main' | 'Physics' | 'Histogram' | 'Mesh'` (ShaderBuilder.ts:39).
- `class ShaderBuilder(variant)` (ShaderBuilder.ts:42).
- Generic primitives: `addDefine` (117), `addUniform(name, type, arraySize?)` (121), `addHeader` (125), `addPreamble` (130 — dedupes), `addFunction` (138 — pre-DE, dedupes).
- DE config: `setFormula(loopBody, init, distFunc)` (162), `setDistOverride({init?, inLoopFull?, inLoopGeom?, postFull?, postGeom?})` (170), `addHybridFold(init, preLoop, inLoop)` (186).
- Late-stage: `addPostDEFunction` (146), `addIntegrator` (154).
- Logic slot injectors: `addPostMapCode` (202), `addPostDistCode` (209), `addMaterialLogic` (195), `addCompositeLogic` (241), `addMissLogic` (248), `addVolumeTracing(marchCode, finalizeCode)` (272), `addPostProcessLogic` (217), `addShadingLogic` (234), `requestShading()` (224).
- Builder config: `setRotation` (96), `setRenderMode` (100), `setQuality(isLite, precisionMode)` (104), `setMaxLights` (109).
- Assembly: `buildFragment()` (395) — variant-dispatched; `buildMeshSDFLibrary()` (304) — no `#version`/`void main`, intended to be wrapped by GPU pipeline.

**`ShaderFactory.ts`**:
- `class ShaderFactory` with static `generateFragmentShader(config)` (11), `generatePhysicsShader(config)` (15), `generateHistogramShader(config)` (19), `generateMeshSDFLibrary(config)` (26).
- Re-exports `ShaderConfig` type (ShaderFactory.ts:6-7).
- Private `buildShader(config, variant)` (30) — instantiates `ShaderBuilder`, configures from `config.lighting` + `config.quality`, iterates `featureRegistry.getAll()` and calls every `feat.inject(builder, config, variant)` (always, even when disabled, per comment at 50-53).

**`ShaderConfig.ts`**:
- `interface ShaderConfig` (ShaderConfig.ts:12) — typed fields: `formula: string` (required), optional `pipeline?: PipelineNode[]`, `graph?: FractalGraph`, required `pipelineRevision: number`, optional `msaaSamples`, `previewMode`, `maxSteps`, `renderMode?: 'Direct' | 'PathTracing'`, `compilerHardCap`, `shadows`. Index signature `[key: string]: any` for feature state.

**`UniformSchema.ts`**:
- `GLSLType` type (UniformSchema.ts:10).
- `UniformDefinition` interface (UniformSchema.ts:12-22) — adds `backingOnly` flag for Three uniforms with no GLSL declaration.
- `UNIFORM_SCHEMA` array (UniformSchema.ts:83) = `BASE_SCHEMA` (26-75) ++ deduped `featureRegistry.getUniformDefinitions()`.
- `UNIFORM_DEFAULTS` map (UniformSchema.ts:85).
- `createUniforms()` factory (UniformSchema.ts:90) — clones Vector/Color defaults; copies Float32Array.

**`UniformNames.ts`** (engine-gmt):
- 2-line shim: `export * from '../../engine/UniformNames'` (UniformNames.ts:2) — pure re-export, no GMT-specific names.

**`managers/UniformManager.ts`**:
- `class UniformManager(uniforms, virtualSpace, pipeline)` (UniformManager.ts:18).
- `getAdaptiveGrace()` (UniformManager.ts:50) — exposes FPS-scaled grace window for `FractalEngine` accumulation hold.
- `syncFrame(camera, state, renderer, runtimeState, optics, lighting, modulations, materials, geometry)` (UniformManager.ts:64) — per-frame uniform write: adaptive resize, camera basis, virtual-space offsets, time, fog linearization, lights, 3-stage rotation matrices.
- `private buildRotMatrix(rx, ry, rz, uniformKey)` (UniformManager.ts:398) — Z·X·Y order Euler→mat3.

**`managers/ConfigManager.ts`**:
- `interface ConfigUpdateResult` (ConfigManager.ts:9) — `{ rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset }`.
- `class ConfigManager(initialConfig)` (ConfigManager.ts:16).
- `rebuildMap()` (ConfigManager.ts:29) — re-resolve uniformName → featureId/paramId map.
- `syncUniform(uniformName, value)` (ConfigManager.ts:61) — back-fill config from a runtime uniform write; skips compile-time params and `isGradientBuffer` derived values.
- `update(newConfig, runtimeState)` (ConfigManager.ts:132) — diff incoming config, classify into 4 flags; batches compile-trigger log via 50ms `setTimeout` flush; emits `compile_estimate` via `FractalEvents`.

## Architecture (file:line)

- `ShaderFactory.buildShader` is the single entry point for all four variants (ShaderFactory.ts:30) — only differentiation is `RenderVariant` passed to `ShaderBuilder` constructor; per-feature inject() can switch on `variant`.
- `ShaderFactory.buildShader` always calls `feat.inject()` even for disabled features (ShaderFactory.ts:50-56) — the comment at 51-54 justifies this: disabled features still need to inject empty stubs so `calculateShading` etc. don't get undefined function references.
- `ShaderConfig` is partially typed: structural fields are first-class, feature state goes through `[key: string]: any` until a `FeatureStateMap` intersection is built (ShaderConfig.ts:23-25). `formula` and `pipelineRevision` are required; everything else is optional.
- `ShaderConfig.renderMode` is the only literal-typed string in the interface (`'Direct' | 'PathTracing'`, ShaderConfig.ts:20).
- `ShaderBuilder` documents a 17-position assembly order in a top-of-file comment block (ShaderBuilder.ts:1-25), enumerating which method writes into which position. This is the single source of truth for inject ordering.
- `ShaderBuilder.buildFragment` dispatches on `variant`: `'Mesh'` returns library-only (ShaderBuilder.ts:396); `'Physics'` returns a stripped trace + ray-gen probe (431-506); `'Histogram'` returns trace + getMappingValue read (509-561); `'Main'` is the full pipeline with material eval, miss handler, ray-gen, trace, trace-lean (PT only), integrators, post, main (563-633).
- `traceSceneLean` is generated only when `renderMode === 'PathTracing'` (ShaderBuilder.ts:569-571) with empty volume body and `functionName='traceSceneLean'`. Matches doc §2.5.
- Main variant logs section sizes via a `sections: [name, str][]` array (ShaderBuilder.ts:577-601), assembled but not currently written anywhere — `profile` and `totalSize` locals are computed but unused. Likely intentional dev hook (look up by setting a breakpoint) but is dead code at runtime.
- `requestShading()` defers shading generation: features call `addShadingLogic()` between request and assemble; in `buildFragment()` at line 405-408 the accumulated `shadingReflectionCode` is passed to `getShadingGLSL()` and pushed onto `integrators`.
- The Mesh variant path produces a *library*, not a complete shader (ShaderBuilder.ts:302-303 comment) — `gpu-pipeline.ts` wraps it with `#version`, pass-specific uniforms, and `void main`. Stub uniforms (`uSceneOffsetLow`, `uCameraPosition`, etc., 358-367) and a no-op `applyPrecisionOffset` (372) keep `DE_MASTER`-generated code compilable in mesh context. `formulaDE(pos) = mapDist(pos)` (388-390).
- `SDFShaderBuilder.ts` is a *separate, parallel* shader generator that does NOT use `ShaderBuilder`. It assembles raw GLSL strings from `FractalDefinition.shader` (function/preamble/loopBody/loopInit), wires interlace via `glslRewriter`, and emits 5 distinct fragment shaders (SDF/escape/Newton/color/preview). The two builders MUST stay in sync via `CP_PREAMBLE_GLOBALS` and `core_math.ts` `CP_PREAMBLE`/`CP_INIT` (SDFShaderBuilder.ts:28-30).
- `SDFShaderBuilder.buildEstimatorMath` (SDFShaderBuilder.ts:100) handles five DE estimators (0=Log, 1=Linear, 2=Pseudo, 3=Dampened, 4=Linear2) + estimator 5 (Cutting Plane). Falls back to Linear when CP is requested on a non-CP formula (101).
- `pairSupportsCP` (SDFShaderBuilder.ts:204) gates `cp_*` global emission on either primary or interlace secondary declaring `supportsCuttingPlane` — needed for hybrid CP pairs.
- `buildIterationLoop` (SDFShaderBuilder.ts:209) builds shared loop scaffolding used by all four mesh fragment shaders; injects `interlacePreLoop`/`interlaceInLoop` from `buildInterlaceLoopGLSL`, gates main-formula body on `skipMainFormula` when interlace is active (228-230), inits `cp_*` accumulators conditionally (234-236).
- `UniformSchema.UNIFORM_SCHEMA` is built once at module load (UniformSchema.ts:7-8 force-imports `registerFeatures()`), then is immutable. `featureRegistry.getUniformDefinitions()` provides the per-feature contributions (77).
- `createUniforms()` (UniformSchema.ts:90) clones defaults: `val.clone()` for THREE objects, element-clone for arrays of THREE objects, `new Float32Array(val)` for Float32Array.
- `UniformNames.ts` in engine-gmt is a 2-line re-export of `engine/UniformNames.ts` (UniformNames.ts:1-2). Verbatim shim — confirms "no GMT-specific content" claim.
- `UniformManager.syncFrame` is the per-frame uniform writer: it owns adaptive resize (UniformManager.ts:78-154), virtual-space offset, camera basis, `uPixelSizeBase` derivation, fog inverse-ACES, light packing (point/sphere/directional → uniform arrays), and 3-stage rotation matrices.
- Adaptive resize is gated on `!isExporting && !isBucketRendering` (UniformManager.ts:78) and on `adaptiveSuppressed` flag for bucket-render dialog (108) — without the suppression flag, the FBO resizes mid-export and briefly shows the cleared buffer.
- Light direction is stored **toward the light** in `uLightDir[i]` (UniformManager.ts:354-356) — shaders use directly for NdotL/shadows without per-consumer negation. Matches CLAUDE.md "Shader Conventions".
- Sphere lights write `uLightType[i] = 2.0` (UniformManager.ts:290) and use the same point-light position/falloff/radius/softness/hideEmitter slots.
- 3-stage rotation matrices (pre/post/world) are written from `geometry` state when `preRotMaster && preRotEnabled` (UniformManager.ts:364), else identity (388-393). Each rotation order is Z·X·Y (398-407). `EnvRotationMatrix` is a `mat2` written from scalar `uEnvRotation` (233-239).
- `ConfigManager` owns the authoritative `ShaderConfig`. `syncUniform` is the reverse path: when an outside writer (e.g. `Uniforms.set()`) touches a uniform, ConfigManager mirrors the value into the right feature slice (ConfigManager.ts:61-78).
- `update()` (ConfigManager.ts:132) returns four flags; compile-trigger changes are batched via a 50ms `setTimeout` and flushed by `flushRebuildLog` (49-59) which emits `compile_estimate` via `FractalEvents` and uses `detectEngineProfile` + `estimateCompileTime` from `features/engine/profiles`.
- Modular pipeline rebuild gate: only when `formula === 'Modular'` does a `pipelineRevision` bump force `rebuildNeeded` (ConfigManager.ts:243-249). Bare `pipeline` updates with no revision bump set `uniformUpdate` + `needsAccumReset` only (250-254) — param-only changes stay runtime.
- `areValuesEqual` (ConfigManager.ts:80) supports: number tolerance (1e-6), THREE Color/Vector3/Vector2 (component compare), THREE-vs-plain-object cross compare (lifts plain into THREE), arrays (length + JSON.stringify).

## Invariants and gotchas

- `SDFShaderBuilder.ts` and `engine-gmt/features/core_math.ts` MUST emit matching `cp_*` declarations + init shape. The mirror is called out at SDFShaderBuilder.ts:28-30. Drift here silently breaks Cutting Plane DE.
- `ShaderBuilder.addPreamble` / `addFunction` / `addPostDEFunction` / `addIntegrator` all dedupe by reference-string equality (`includes(code)`). Two features producing semantically-identical but textually-different strings will both inject, producing duplicate function definitions and a GL compile error.
- `ShaderFactory.buildShader` always calls `feat.inject()`; features must defensively stub their own functions when disabled. Skipping inject is a footgun (ShaderFactory.ts:51-54).
- `ShaderBuilder.buildFragment` Main variant computes `profile` and `totalSize` but never uses them (ShaderBuilder.ts:597-601) — dead at runtime; do not delete without checking dev-tools debugging usage.
- `Mesh` variant returns a *library*, not a shader — caller must wrap. `buildMeshSDFLibrary` is reached via `variant === 'Mesh'` (ShaderBuilder.ts:396) AND via `ShaderFactory.generateMeshSDFLibrary` (ShaderFactory.ts:26-28).
- `UniformSchema.ts` calls `registerFeatures()` at module load (UniformSchema.ts:8). Any import cycle that touches UniformSchema before feature side-effects must be safe — registering is idempotent but timing-sensitive.
- `UniformNames.ts` is a re-export shim — engine-gmt has NO local uniform name additions (UniformNames.ts:1-2). All names live in engine-core's `engine/UniformNames.ts`.
- `UniformManager.syncFrame` is a fat, ordered function: resize → camera basis → time/env → fog → lights → rotation matrices. Reordering breaks invariants — e.g. `uPixelSizeBase` derivation (213-214) needs the *post-adaptive* viewportY.
- `UniformManager` light dir is negated before write (354-356) — change here would force per-consumer negation in every shader chunk. Convention guarded by CLAUDE.md.
- Adaptive resize uses `_adaptive.selfResized = true` flag (UniformManager.ts:137) so it doesn't observe its own resize as user activity. Removing the flag re-triggers the adaptive loop.
- `ConfigManager.syncUniform` skips uniforms with `value.isGradientBuffer === true` (ConfigManager.ts:69-70) — storing them would corrupt the config because they're derived `Uint8Array` textures, not the source `GradientStop[]`.
- `ConfigManager` rebuild log batches via `setTimeout(50)` (ConfigManager.ts:205-206). A synchronous `update()` chain produces one grouped log; the flush survives a synchronous shader rebuild that happens between two `update` calls.
- `pipelineRevision` is the modular-formula rebuild trigger; without a bump, even a `pipeline` array change won't rebuild (only updates uniforms). Tools that need a structural rebuild must bump revision.
- `ShaderConfig` is structurally typed but feature state is `any` — TypeScript can't catch typos in feature slice keys until `FeatureStateMap` lands (ShaderConfig.ts:24-25).

## Drift from existing doc (dev/docs/gmt/02_Rendering_Internals.md)

The existing doc is post-extraction (references `engine-gmt/` paths in §2.6 and §2.5 file tables) but only sparsely covers the audit set — most subsystems are not documented at the file:line granularity. The doc focuses on rendering math/algorithms; the builder API surface and ConfigManager/UniformManager internals are largely untouched.

| Doc claim | Code says | Status |
|---|---|---|
| §2.2 "ShaderBuilder.ts emits traceSceneLean alongside traceScene in PT mode" (line 236) | Confirmed at ShaderBuilder.ts:569-571 | OK |
| §2.2 "Lighting calls `builder.requestShading()` ... in `buildFragment()`, the collected shading logic is passed to `getShadingGLSL(reflectionCode)`" (line 100) | Confirmed at ShaderBuilder.ts:224-226 + 405-408 | OK |
| §2.6 "addVolumeTracing(...) Position 14 in ShaderBuilder assembly order" (line 261-262) | Confirmed — comment at ShaderBuilder.ts:14 lists Trace at Position 14 with volume body/finalize injected | OK |
| §2.2 "UniformManager.ts CPU-side InverseACESFilm derivation" (line 142) | Confirmed at UniformManager.ts:242-258 | OK |
| §2.2 "fog color pre-linearized on the CPU as uFogColorLinear (InverseACESFilm applied once per frame in UniformManager.ts)" (line 122) | Confirmed at UniformManager.ts:245-258 | OK |
| §2.5 "UniformManager writes uLightType[i] = 2.0 for Sphere; writes uLightHideEmitter[i]" (line 237) | Confirmed at UniformManager.ts:290, 320 | OK |
| Implicit "UniformNames.ts" is the central name registry (referenced at lines 69, 141, 238) | engine-gmt/engine/UniformNames.ts is a 2-line re-export of engine/UniformNames.ts (UniformNames.ts:1-2) | Partial — the doc cites the engine-gmt path but the names actually live in engine-core; harmless because the re-export keeps `Uniforms.X` working |
| `ShaderBuilder` 17-step assembly order, `RenderVariant`, `addUniform/addHeader/addPreamble/addFunction/addPostDEFunction/addIntegrator/addPostMapCode/addPostDistCode/addMaterialLogic/addCompositeLogic/addMissLogic/addVolumeTracing/addPostProcessLogic/addShadingLogic/addHybridFold/setFormula/setDistOverride/setRotation/setRenderMode/setQuality/setMaxLights` | All present at line refs in Public API section above | Missing — doc never enumerates the builder API surface or the 17-position order; this is a documentation gap, not drift |
| `ShaderFactory.generateMeshSDFLibrary` exists, and `ShaderBuilder.buildMeshSDFLibrary` wraps `DE_MASTER` with mesh-context stubs | Confirmed at ShaderFactory.ts:26 + ShaderBuilder.ts:304-391 | Missing — doc has no Mesh-variant section |
| `SDFShaderBuilder.ts` (separate, parallel) emits 5 fragment shaders for mesh export (`buildMeshSDFShader`, `buildMeshEscapeShader`, `buildMeshNewtonShader`, `buildMeshColorShader`, `buildMeshPreviewShader`) and shares `MESH_FORMULA_UNIFORMS` for GL location lookup | Confirmed at SDFShaderBuilder.ts:278/390/437/526/580/698 | Missing — covered partially by docs/gmt/30_Mesh_Export_Prototype.md per CLAUDE.md table; not in 02_Rendering_Internals |
| `ShaderConfig` interface shape (`formula: string`, `pipelineRevision: number` both required) | Confirmed at ShaderConfig.ts:17-19 | Missing — no doc table |
| `UNIFORM_SCHEMA = BASE_SCHEMA ++ feature uniforms`, deduped by name, with `backingOnly` flag | Confirmed at UniformSchema.ts:12-22 + 77-83 | Missing |
| `UniformManager.syncFrame` performs adaptive resize, virtual-space offset, fog linearization, light packing, 3-stage rotations | Confirmed at UniformManager.ts:64-395 | Partial — doc mentions adaptive resize at lines 720+/735 (FPS / scale adjustment), but the full responsibility scope of `syncFrame` is not laid out |
| `ConfigManager.update` returns `{ rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset }`; batches compile log via 50ms setTimeout; modular pipelineRevision is the rebuild trigger | Confirmed at ConfigManager.ts:9-14, 132, 205-206, 243-249 | Missing — `ConfigManager` is not described in the doc at all |
| `ConfigManager` references `features/engine/profiles` for `detectEngineProfile` + `estimateCompileTime` and emits `compile_estimate` via FractalEvents | Confirmed at ConfigManager.ts:4-5, 54-58 | Missing |

**Recommendation:** Existing doc covers rendering math/algorithms but barely touches the shader composition layer. A new doc section (or refresh of `01_System_Architecture` / `02_Rendering_Internals`) should add:
1. The ShaderBuilder 17-position assembly order table (copy from comment block at ShaderBuilder.ts:1-25 verbatim).
2. The full builder API surface (every inject method, what it inserts at which position).
3. A diagram of `ShaderFactory.buildShader` → feature inject loop → `buildFragment` variant dispatch.
4. The Mesh variant path: `generateMeshSDFLibrary` produces a library, GPU pipeline wraps it.
5. The separate `SDFShaderBuilder.ts` (mesh export) and the `core_math.ts` ↔ `SDFShaderBuilder` CP-globals mirror invariant.
6. `ConfigManager` responsibilities (4-flag diff result, batched compile log, modular rebuild gate, syncUniform reverse path).
7. `UniformManager.syncFrame` ordered phases (resize → camera → time → fog → lights → rotation).

12 row table with 8 OK/Partial and 7 Missing. Drift table itself is mostly "Missing" — the existing doc is descriptive of rendering algorithms, not the composition plumbing. Recommendation is to document, not to fix code-side drift.

## Open questions

- **Orphan-sweep candidate: dead profiling block.** `ShaderBuilder.buildFragment` Main variant builds a `sections` array and computes `profile`/`totalSize` (ShaderBuilder.ts:577-601) but never reads or returns them. Either wire to a debug uniform/console, or delete. Prefix: `orphan-sweep: ShaderBuilder section-size profile dead-code`.
- **Confusion-risk validation:** `engine/ShaderBuilder.ts` (engine-core) is genericized (136 lines, generic primitives only) while `engine-gmt/engine/ShaderBuilder.ts` (634 lines) is the full GMT raymarcher. Same class name. Per `21_Code_Review` this is intentional but a new contributor reading just one of the files won't realize the other exists. Document the split in `08_File_Structure.md` (currently no callout there for this pair).
- **Verbatim-copy claim revision:** `21_Code_Review` flagged `UniformSchema.ts` + `UniformNames.ts` as "verbatim copies (re-export shim candidates)". Current state:
  - `UniformNames.ts` IS a re-export shim (2 lines, already minimal).
  - `UniformSchema.ts` is NOT a re-export — the two files differ only by import path (`'./features'` vs `'../features'`) but maintaining two copies of a 104-line schema is duplicate state. Candidate for converting engine-gmt's copy to `export * from '../../engine/UniformSchema'` if the import path divergence can be unified.
- **`ConfigManager` divergence audit:** engine-core has a 184-line genericized version; engine-gmt has 258 lines with `features/engine/profiles` + `FractalEvents` couplings. The engine-core version was extracted with a JSDoc class comment that engine-gmt lacks. Confirm intentional and document the divergence in `21_Code_Review` (or apply the doc comment back to engine-gmt's copy).
- **`UniformManager` is engine-gmt only:** engine-core has no `managers/UniformManager.ts` (verified via `ls engine/managers/`). The CLAUDE.md docs reference `engine/managers/UniformManager.ts` paths but the file only exists under `engine-gmt/engine/managers/UniformManager.ts`. Cross-reference and update any doc that drops the `engine-gmt/` prefix.
- **`ShaderConfig` `FeatureStateMap` TODO:** Comment at ShaderConfig.ts:23-25 says "Replace with FeatureStateMap intersection type when that is implemented." Is this scheduled? If not, capture as a tech-debt item in `07_Code_Health.md`.
- **`pipelineRevision` required field:** ShaderConfig.ts:17 declares `pipelineRevision: number` (not optional). All initial config builders must supply a value (typically 0). Confirm this is enforced at every construction site — easy to break with `Partial<ShaderConfig>`.
