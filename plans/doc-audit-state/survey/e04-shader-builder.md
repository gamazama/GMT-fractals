---
subsystem_id: e04-shader-builder
audited_at: 2026-05-19T14:32:00Z
files:
  - path: engine/ShaderBuilder.ts
    blob_sha: b19fe093c132443ec194e0c0817d759e6d4886fa
    lines_read: [1, 136]
  - path: engine/ShaderFactory.ts
    blob_sha: 7191f183dc93d4180b4a068a8594f251ce977472
    lines_read: [1, 36]
  - path: engine/ShaderConfig.ts
    blob_sha: 2346faac1ad0b755590bab73fd9375a53f3a0ed4
    lines_read: [1, 28]
  - path: engine/UniformSchema.ts
    blob_sha: fdb3384330e24d65e3ae299ec99fad320b3ee6ce
    lines_read: [1, 104]
  - path: engine/UniformNames.ts
    blob_sha: 444824b2c0f464cdd170d3096dbc236de8ca93cb
    lines_read: [1, 95]
---

## Public API surface

- `type RenderVariant = 'Main' | 'Physics' | 'Histogram' | 'Mesh'` — engine/ShaderBuilder.ts:22
- `class ShaderBuilder` with public field `variant: RenderVariant` (constructor param, defaults `'Main'`) — engine/ShaderBuilder.ts:24, 32
  - Mutators: `addDefine(name, value='1')`, `addUniform(name, type, arraySize?)`, `addHeader(code)`, `addPreamble(code)`, `addFunction(code)`, `addSection(name, code)` — engine/ShaderBuilder.ts:36-70
  - Read-back: `getDefines()`, `getUniforms()`, `getHeaders()`, `getPreambles()`, `getFunctions()`, `getSections(name)`, `getAllSectionNames()`, `getVariant()` — engine/ShaderBuilder.ts:74-81
  - Assembly helpers: `buildDefinesBlock()`, `buildUniformsBlock()`, `buildFragment()` — engine/ShaderBuilder.ts:86-135
- `class ShaderFactory` with one static `generateFragmentShader(config: ShaderConfig, variant: RenderVariant = 'Main'): string` — engine/ShaderFactory.ts:19-35
- Re-export: `export type { ShaderConfig } from './ShaderConfig'` — engine/ShaderFactory.ts:17
- `interface ShaderConfig` — open-ended index signature `[key: string]: any` plus optional `formula`, `pipelineRevision`, `msaaSamples`, `previewMode`, `maxSteps`, `renderMode`, `compilerHardCap` — engine/ShaderConfig.ts:11-28
- `type GLSLType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'mat3' | 'mat2'` — engine/UniformSchema.ts:10
- `interface UniformDefinition { name, type, default, arraySize?, precision?, comment?, backingOnly? }` — engine/UniformSchema.ts:12-22
- `const UNIFORM_SCHEMA: UniformDefinition[]` — concatenation of `BASE_SCHEMA` + feature-registry uniforms — engine/UniformSchema.ts:83
- `const UNIFORM_DEFAULTS: Record<string, any>` — name→default map derived from `UNIFORM_SCHEMA` — engine/UniformSchema.ts:85-88
- `const createUniforms()` — returns Three.js-style `{ [name]: { value } }` map with deep-cloned defaults — engine/UniformSchema.ts:90-104
- `const Uniforms` — frozen `as const` string table mapping logical names (e.g. `Time`) to GLSL identifier strings (`'uTime'`) — engine/UniformNames.ts:2-93
- `type UniformName = typeof Uniforms[keyof typeof Uniforms]` — engine/UniformNames.ts:95

## Architecture

- `ShaderBuilder` is intentionally pipeline-agnostic: five "generic primitives" (`defines`, `uniforms`, `headers`, `preambles`, `functions`) plus a named-`sections` escape hatch that the engine never interprets — engine/ShaderBuilder.ts:1-20, 56-70.
- Generic primitives are stored as `Map`/array with dedup on insert (`headers`/`preambles`/`functions` ignore exact-duplicate strings; `defines`/`uniforms` use Map keyed by name so later writes overwrite) — engine/ShaderBuilder.ts:25-29, 44-54.
- The `sections` map is multi-valued (`Map<string, string[]>`): each `addSection(name, code)` appends, never deduplicates — engine/ShaderBuilder.ts:30, 67-70. This is the only multi-write container.
- Plugin assemblers are expected to drive their own shader template by calling `getSections(name)` and stitching; the engine ships only a minimal default `buildFragment()` that apps with non-trivial pipelines should bypass — engine/ShaderBuilder.ts:56-66, 105-110.
- `buildFragment()` emits a fixed `#version 300 es` / `precision highp float;` header, then defines, headers, uniforms, preambles, functions, an `out vec4 pc_fragColor;`, and a `void main()` whose body is `getSections('main').join('\n')` (fallback: clear to opaque black) — engine/ShaderBuilder.ts:111-135.
- `buildUniformsBlock()` emits `uniform TYPE NAME;` or `uniform TYPE NAME[N];` per Map entry — `arraySize` is the only modifier; `precision`/`comment` from `UniformDefinition` are NOT honored here (those metadata fields are consumed elsewhere — see Open questions) — engine/ShaderBuilder.ts:93-101, vs engine/UniformSchema.ts:17-18.
- `ShaderFactory.generateFragmentShader` is a thin orchestrator: instantiate `ShaderBuilder(variant)`, iterate `featureRegistry.getAll()`, invoke each feature's optional `inject(builder, config, variant)`, then return `builder.buildFragment()` — engine/ShaderFactory.ts:19-35.
- Feature ordering inside `generateFragmentShader` is whatever `featureRegistry.getAll()` returns; the registry topologically sorts on `dependsOn`/`after` — engine/FeatureSystem.ts:230, 444.
- The feature `inject` hook has signature `(builder: any, config: ShaderConfig, variant: RenderVariant) => void` declared on the feature registry, so `ShaderBuilder` itself is not the typed contract — engine/FeatureSystem.ts:243.
- `ShaderConfig` is engine-opaque: it carries six engine-recognized structural fields (`formula`, `pipelineRevision`, `msaaSamples`, `previewMode`, `maxSteps`, `renderMode`, `compilerHardCap`) but is otherwise an `[key: string]: any` index signature that apps widen via declaration merging — engine/ShaderConfig.ts:2-28.
- `renderMode` is explicitly tagged as opaque to the engine — only app-layer interprets it — engine/ShaderConfig.ts:20.
- `pipelineRevision` is the documented signal to invalidate caches/recompile when structural state changes; the engine itself does not bump it (app layer's responsibility) — engine/ShaderConfig.ts:15.
- `UniformSchema.ts` performs an eager side effect at import time: `registerFeatures()` is called at module top level to ensure the feature registry is populated before `featureRegistry.getUniformDefinitions()` is read — engine/UniformSchema.ts:5-8, 77.
- `UNIFORM_SCHEMA` is a frozen-at-module-load concatenation of `BASE_SCHEMA` and feature uniforms, with feature uniforms dedup'd against base names (filter on `existingNames` set) — engine/UniformSchema.ts:77-83.
- `BASE_SCHEMA` covers strictly engine-pipeline concerns: time/frame/resolution, double-precision scene offset (hi/lo), camera basis, region/tile rectangles for bucket render, accumulation/history sampler, blue-noise sampler, histogram layer, internal-scale, pixel-size base, multi-pass export (beauty/alpha/depth), and three precomputed rotation matrices — engine/UniformSchema.ts:26-75.
- `BASE_SCHEMA` already includes feature-domain uniforms — `EnvRotationMatrix` (env mapping) and `FogColorLinear` — annotated as "Shared by Geometry & Lighting" CPU optimizations, which violates the "BASE_SCHEMA = engine-only" claim at engine/UniformSchema.ts:24-25 — engine/UniformSchema.ts:69-75.
- `createUniforms()` deep-clones object defaults: `.clone()` for `THREE.Vector*`/`Matrix*`, `.map(.clone())` for arrays of clonable, fresh `Float32Array` copy for typed arrays; primitives and `null` pass through — engine/UniformSchema.ts:90-104. Sampler defaults are `null` (engine/UniformSchema.ts:51, 54) so consumers must bind a real texture before draw.
- `feat.extraUniforms` flow through `featureRegistry.getUniformDefinitions()` unchanged, while `param.uniform`-linked uniforms get type coercion: `color → vec3`, `boolean → float` (default 0/1), `image|gradient → sampler2D` (default `null`) — engine/FeatureSystem.ts:515-535.
- `Uniforms` is a single source-of-truth lookup table for GLSL identifier strings; `BASE_SCHEMA` entries reference it (e.g. `Uniforms.Time`) so renaming flows through both schema and any consumer that uses the constant — engine/UniformNames.ts:2-93, engine/UniformSchema.ts:28-74.
- `UniformName` is a string-literal union derived from the values of `Uniforms`, giving callsites a typed "valid uniform identifier" check — engine/UniformNames.ts:95.
- `UNIFORM_SCHEMA`/`UNIFORM_DEFAULTS`/`createUniforms` are NOT consumed inside `engine/` — the only call sites are `shaders/chunks/uniforms.ts`, `engine-gmt/shaders/chunks/uniforms.ts`, and `engine-gmt/engine/MaterialController.ts` (search: `UNIFORM_SCHEMA|createUniforms`). The core engine produces this data and downstream apps consume it.

## Invariants and gotchas

- **Eager import side effect.** Importing `engine/UniformSchema.ts` triggers `registerFeatures()` (engine/UniformSchema.ts:8). Anything that imports `UniformSchema` for type-only purposes (e.g. `import { UniformDefinition }`) still pays the registration cost. `FeatureSystem.ts:5` does exactly this — `import { UniformDefinition } from './UniformSchema'` — which would be a circular hazard if `UniformSchema.ts` weren't careful (it imports `featureRegistry` from `FeatureSystem` and `registerFeatures` from `./features`). Order: TS resolves the type import lazily, but the runtime side effect still fires on first concrete import.
- **`backingOnly` is declared but not enforced here.** `UniformDefinition.backingOnly` (engine/UniformSchema.ts:19-21) is intended to create a Three.js uniform without emitting a GLSL `uniform` declaration. Neither `ShaderBuilder.buildUniformsBlock()` nor `createUniforms()` check this flag — enforcement must live downstream (Open questions).
- **`UniformDefinition.precision`/`comment` are metadata only.** `buildUniformsBlock()` ignores both (engine/ShaderBuilder.ts:93-101). Schema-level precision qualifiers are silently dropped unless a downstream assembler reads `UNIFORM_SCHEMA` directly.
- **Default `buildFragment()` is a stub.** Real apps almost never use it — the comment at engine/ShaderBuilder.ts:105-110 is explicit. Consequence: changes to `buildFragment()` rarely affect real renders; tests that lean on it test only the toy path.
- **Section storage is order-of-insertion.** Section reads return arrays in registration order (`getSections` at engine/ShaderBuilder.ts:79). Plugin assemblers depend on this; reordering would corrupt assembled output.
- **`addSection` does NOT dedup.** Unlike `addHeader`/`addPreamble`/`addFunction` (engine/ShaderBuilder.ts:44-54), repeat calls to `addSection(name, code)` with identical code accumulate duplicates.
- **`renderMode` is opaque to engine.** Engine code MUST NOT branch on the value (engine/ShaderConfig.ts:20). Reading it is fine for pass-through to plugins.
- **`ShaderConfig` index signature defeats typo detection.** `[key: string]: any` (engine/ShaderConfig.ts:27) means `config.fromula` does not error. Apps relying on the declaration-merging widening are responsible for restoring typo safety.
- **Engine-core is the "generic" sibling, engine-gmt is the diverged one.** Glob confirms `engine-gmt/engine/{ShaderFactory,ShaderConfig,UniformSchema,UniformNames}.ts` exist plus `engine-gmt/engine/SDFShaderBuilder.ts` (SDF-specialized variant, named differently). `engine-gmt/engine/MaterialController.ts` imports `createUniforms` from `engine-gmt/engine/UniformSchema.ts`, and `engine-gmt/shaders/chunks/uniforms.ts` mirrors `shaders/chunks/uniforms.ts`. Pattern: core `ShaderBuilder` exposes only generic primitives + section hatch; the diverged `SDFShaderBuilder` is the raymarcher-specialized assembler. Reserved for g02.
- **`Uniforms` table is the rename pivot.** Refactors that touch uniform names must update `engine/UniformNames.ts` first; both schema and any callsite using the constant will follow. Plain-string literals in shaders or app code are not protected.

## Drift from existing doc

(no existing doc — skip)

## Open questions

- Where is `UniformDefinition.backingOnly` actually enforced? Likely in a `MaterialController` or `UniformManager` outside the 5 audited files (engine-gmt's `MaterialController.ts` is a candidate per the import).
- Where are `UniformDefinition.precision` and `.comment` consumed, if anywhere? `ShaderBuilder.buildUniformsBlock()` ignores both; presumably an alternative assembler reads `UNIFORM_SCHEMA` directly.
- Why does `BASE_SCHEMA` contain `EnvRotationMatrix` and `FogColorLinear` despite the "Pure Core" header comment (engine/UniformSchema.ts:24-25)? These look like environment/lighting feature concerns that leaked into base, or are legitimately shared CPU-side optimization slots — clarify ownership.
- The dedup at engine/UniformSchema.ts:80-81 silently drops feature uniforms whose names collide with base. Is there a runtime warning anywhere, or is collision considered impossible-by-convention?
- `Uniforms.CamType` (engine/UniformNames.ts:15) has no corresponding `BASE_SCHEMA` entry — it must be contributed by a feature's `extraUniforms`. Verify which.
- `Uniforms.ModularParams`, `LightCount`/`LightType`/etc., `EnvMapTexture`, env CDF samplers, `InterlaceEnabled`/`InterlaceInterval`/`InterlaceStartIter`, `Vec2A`..`Vec4C` (engine/UniformNames.ts:28-92) appear in the names table but not in `BASE_SCHEMA` — they're feature-contributed. Reserved for the relevant feature subsystems to confirm.
- Plugin sections used by the raymarching assembler (`postMapCode`, `missHandler`, `hybridFold`, `materialLogic`, `shadingLogic`, `volumetricTracing`, `compositeLogic` per engine/ShaderBuilder.ts:11-14, `volumeBody`, `integrator` per engine/ShaderBuilder.ts:63-65) — confirm the canonical name list and ordering contract lives in the raymarching plugin (out of scope for e04).
- Cross-reference with `engine-gmt/engine/SDFShaderBuilder.ts` and `engine-gmt/engine/ShaderFactory.ts` to map exactly which generic-vs-specialized hooks GMT depends on — reserved for g02.
