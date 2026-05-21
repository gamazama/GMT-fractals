---
source: engine/ShaderBuilder.ts
lines: 136
last_verified_sha: b19fe093c132443ec194e0c0817d759e6d4886fa
additional_sources:
  - engine/ShaderFactory.ts
  - engine/ShaderConfig.ts
  - engine/UniformSchema.ts
  - engine/UniformNames.ts
audited: 2026-05-20T12:30:00Z
audited_by: claude-opus-4-7
public_api:
  - type RenderVariant
  - ShaderBuilder
  - addDefine
  - addUniform
  - addHeader
  - addPreamble
  - addFunction
  - addSection
  - getDefines
  - getUniforms
  - getHeaders
  - getPreambles
  - getFunctions
  - getSections
  - getAllSectionNames
  - getVariant
  - buildDefinesBlock
  - buildUniformsBlock
  - buildFragment
  - ShaderFactory
  - generateFragmentShader
  - ShaderConfig
  - type GLSLType
  - UniformDefinition
  - UNIFORM_SCHEMA
  - UNIFORM_DEFAULTS
  - createUniforms
  - Uniforms
  - type UniformName
depends_on:
  - e01-feature-system
---

# Shader Builder + ShaderFactory + Uniform Schema

The engine-core shader assembly substrate: a pipeline-agnostic `ShaderBuilder` that exposes five generic primitives (`defines`, `uniforms`, `headers`, `preambles`, `functions`) plus a multi-valued named-`sections` escape hatch; a `ShaderFactory` that walks the feature registry to drive a single `inject(builder, config, variant)` pass; an open-ended `ShaderConfig` that the engine treats as opaque; and a `UniformSchema` / `UniformNames` pair that defines the engine's BASE uniform slots and the string-table of canonical GLSL identifiers. The core engine never interprets section names or `renderMode` values — those are app-layer plugin concerns (the live GMT raymarcher in `engine-gmt/engine/ShaderBuilder.ts` ignores the generic section API entirely and ships its own typed-method builder; see q-032 and q-033 in `plans/doc-audit-state/survey/_followups/`).

## Public API

### `engine/ShaderBuilder.ts` — generic assembly with section escape hatch

| Symbol | Kind | Site |
|--------|------|------|
| `type RenderVariant = 'Main' \| 'Physics' \| 'Histogram' \| 'Mesh'` | type alias | `engine/ShaderBuilder.ts:22` |
| `class ShaderBuilder` | class, ctor takes `variant: RenderVariant = 'Main'` | `engine/ShaderBuilder.ts:24`, `engine/ShaderBuilder.ts:32` |
| `addDefine(name, value='1')` | mutator — Map keyed by name; later writes overwrite | `engine/ShaderBuilder.ts:36-38` |
| `addUniform(name, type, arraySize?)` | mutator — Map keyed by name; later writes overwrite | `engine/ShaderBuilder.ts:40-42` |
| `addHeader(code)` | mutator — dedup on exact-duplicate string | `engine/ShaderBuilder.ts:44-46` |
| `addPreamble(code)` | mutator — dedup on exact-duplicate string | `engine/ShaderBuilder.ts:48-50` |
| `addFunction(code)` | mutator — dedup on exact-duplicate string | `engine/ShaderBuilder.ts:52-54` |
| `addSection(name, code)` | multi-valued append; **no dedup** | `engine/ShaderBuilder.ts:67-70` |
| `getDefines()` | read-back | `engine/ShaderBuilder.ts:74` |
| `getUniforms()` | read-back | `engine/ShaderBuilder.ts:75` |
| `getHeaders()` | read-back | `engine/ShaderBuilder.ts:76` |
| `getPreambles()` | read-back | `engine/ShaderBuilder.ts:77` |
| `getFunctions()` | read-back | `engine/ShaderBuilder.ts:78` |
| `getSections(name)` | read-back — order-of-insertion | `engine/ShaderBuilder.ts:79` |
| `getAllSectionNames()` | read-back | `engine/ShaderBuilder.ts:80` |
| `getVariant()` | read-back | `engine/ShaderBuilder.ts:81` |
| `buildDefinesBlock()` | assembly helper | `engine/ShaderBuilder.ts:86-90` |
| `buildUniformsBlock()` | assembly helper | `engine/ShaderBuilder.ts:93-101` |
| `buildFragment()` | default whole-shader assembler — intended to be bypassed | `engine/ShaderBuilder.ts:111-135` |

### `engine/ShaderFactory.ts` — feature-registry dispatch

| Symbol | Kind | Site |
|--------|------|------|
| `class ShaderFactory` with one static `generateFragmentShader(config, variant='Main')` | dispatch | `engine/ShaderFactory.ts:19-35` |
| Re-export `export type { ShaderConfig } from './ShaderConfig'` | type re-export | `engine/ShaderFactory.ts:17` |

### `engine/ShaderConfig.ts` — opaque-to-engine config record

| Symbol | Kind | Site |
|--------|------|------|
| `interface ShaderConfig` with index signature `[key: string]: any` | type | `engine/ShaderConfig.ts:11-28` |
| Engine-recognized structural fields: `formula`, `pipelineRevision`, `msaaSamples`, `previewMode`, `maxSteps`, `renderMode`, `compilerHardCap` | optional fields | `engine/ShaderConfig.ts:14-22` |

### `engine/UniformSchema.ts` — schema, defaults, Three.js uniform factory

| Symbol | Kind | Site |
|--------|------|------|
| `type GLSLType` | union of GLSL primitive types | `engine/UniformSchema.ts:10` |
| `interface UniformDefinition` | `{ name, type, default, arraySize?, precision?, comment?, backingOnly? }` | `engine/UniformSchema.ts:12-22` |
| `const UNIFORM_SCHEMA` | concatenation of `BASE_SCHEMA` + dedup'd feature uniforms | `engine/UniformSchema.ts:83` |
| `const UNIFORM_DEFAULTS` | name → default map derived from schema | `engine/UniformSchema.ts:85-88` |
| `const createUniforms()` | returns Three.js `{ [name]: { value } }` map with deep-cloned defaults | `engine/UniformSchema.ts:90-104` |

### `engine/UniformNames.ts` — canonical GLSL identifier table

| Symbol | Kind | Site |
|--------|------|------|
| `const Uniforms` | frozen `as const` map from logical name (`Time`) to GLSL identifier (`'uTime'`) | `engine/UniformNames.ts:2-93` |
| `type UniformName` | string-literal union of `typeof Uniforms[keyof typeof Uniforms]` | `engine/UniformNames.ts:95` |

## Architecture

### `ShaderBuilder` — five generics + multi-valued section hatch

`ShaderBuilder` is intentionally pipeline-agnostic. Five storage containers cover every GLSL primitive a shader needs: two Maps (`defines`, `uniforms`) keyed by name with overwrite-on-rewrite semantics, and three dedup'd arrays (`headers`, `preambles`, `functions`) where exact-string duplicates are silently dropped at insert (`engine/ShaderBuilder.ts:25-29`, `engine/ShaderBuilder.ts:44-54`). A sixth container — `sections: Map<string, string[]>` — is the only multi-valued one: each `addSection(name, code)` appends to the named bucket and **never deduplicates**, even on identical input (`engine/ShaderBuilder.ts:30`, `engine/ShaderBuilder.ts:67-70`). Reads return in registration order, which plugin assemblers depend on (`engine/ShaderBuilder.ts:79`).

The class JSDoc at `engine/ShaderBuilder.ts:1-20` explicitly lists fractal-specific section names (`postMapCode`, `missHandler`, `hybridFold`, `materialLogic`, `shadingLogic`, `volumetricTracing`, `compositeLogic`) and `engine/ShaderBuilder.ts:63-65` mentions further ones (`volumeBody`, `integrator`) — these strings are illustrative only. The engine never interprets them; a plugin assembler is expected to read its own section names back via `getSections(name)` and stitch them into its own GLSL template.

### `buildFragment()` is a stub

The default `buildFragment()` (`engine/ShaderBuilder.ts:111-135`) emits a fixed `#version 300 es` / `precision highp float;` header, then defines, headers, uniforms, preambles, functions, an `out vec4 pc_fragColor;`, and a `void main()` whose body is `getSections('main').join('\n')` with a black-fragment fallback. The JSDoc at `engine/ShaderBuilder.ts:105-110` makes the intent explicit: real apps bypass this and read sections directly. `buildUniformsBlock()` only honors `arraySize` from the uniform descriptor — `precision` and `comment` from `UniformDefinition` are not emitted here (see Invariants).

### `ShaderFactory` — thin feature-registry orchestrator

`ShaderFactory.generateFragmentShader(config, variant)` (`engine/ShaderFactory.ts:19-35`) instantiates a `ShaderBuilder(variant)`, iterates `featureRegistry.getAll()`, invokes each feature's optional `inject(builder, config, variant)`, and returns `builder.buildFragment()`. Feature order inside the loop is whatever the registry returns; registration topologically sorts on `dependsOn` / `after` (handled in `e01-feature-system`).

### `ShaderConfig` — opaque to engine, widened by apps

`ShaderConfig` (`engine/ShaderConfig.ts:11-28`) recognizes six structural fields the engine layer uses for cache invalidation (`pipelineRevision`), MSAA setup, preview-mode toggling, step caps, and `renderMode` — but it is **otherwise opaque**: an `[key: string]: any` index signature (`engine/ShaderConfig.ts:27`) lets app-layer plugins widen the interface via declaration merging to carry their own well-typed `formula`, `graph`, etc. The engine never branches on `renderMode` (`engine/ShaderConfig.ts:20`) and never bumps `pipelineRevision` itself — that is the app layer's responsibility.

### `UniformSchema` — base + feature-registry merge with eager registration

`UniformSchema.ts` performs an eager import-time side effect: `registerFeatures()` is called at module top level (`engine/UniformSchema.ts:5-8`) to populate the feature registry **before** the module reads `featureRegistry.getUniformDefinitions()` at `engine/UniformSchema.ts:77`. The merge filters feature uniforms whose names collide with `BASE_SCHEMA` (`engine/UniformSchema.ts:80-81`); the deferred-action comment at line 79 says "shouldn't happen with correct separation" — see Invariants below for the contract.

`BASE_SCHEMA` (`engine/UniformSchema.ts:26-75`) covers time/frame/resolution, double-precision scene offset (hi/lo), camera basis, region/tile rectangles for bucket render, accumulation/history sampler, blue-noise sampler, histogram layer, internal-scale, pixel-size base, multi-pass export (beauty/alpha/depth), three precomputed rotation matrices, plus `EnvRotationMatrix` and `FogColorLinear`. The last two are CPU-derived caches of feature-owned source uniforms (`uEnvRotation` from materials, `uFogColor` from atmosphere) hoisted to BASE so multiple consumer features can read them unconditionally with safe identity/zero defaults — see q-028 in `plans/doc-audit-state/survey/_followups/` for the rationale.

### `createUniforms()` — deep-cloned Three.js uniform map

`createUniforms()` (`engine/UniformSchema.ts:90-104`) walks `UNIFORM_SCHEMA` and produces a Three.js-style `{ [name]: { value } }` map with deep-cloned defaults: `.clone()` for Three vectors/matrices, `.map(v => v.clone?.() ?? v)` for arrays of clonable values, `new Float32Array(val)` for typed arrays, and primitives / `null` pass through. Sampler defaults are `null` (`engine/UniformSchema.ts:51`, `engine/UniformSchema.ts:54`), so consumers must bind a real texture before drawing. The walker does **not** check `backingOnly` — every schema entry, including backing-only ones, gets a Three.js slot.

### `UniformNames` — rename pivot

`Uniforms` (`engine/UniformNames.ts:2-93`) is the single source of truth for GLSL identifier strings; `BASE_SCHEMA` entries reference it (e.g. `Uniforms.Time`), so renaming flows through schema and any caller that uses the constant. `UniformName` (`engine/UniformNames.ts:95`) is the string-literal union derived from the values, giving callsites a typed "valid uniform identifier" check. **Section-header comments in `UniformNames.ts` are organizational only** — for example `EnvRotationMatrix` (`engine/UniformNames.ts:53`) lives under the `// Environment` header but is actually in `BASE_SCHEMA` (`engine/UniformSchema.ts:73`), not feature-contributed (see q-031).

## Invariants

- **Engine never interprets section names.** The strings hard-coded in the `ShaderBuilder` JSDoc (`engine/ShaderBuilder.ts:11-14`, `engine/ShaderBuilder.ts:63-65`) are illustrative. Plugin assemblers own the canonical name list and ordering contract. In the live GMT raymarcher (`engine-gmt/engine/ShaderBuilder.ts`) the entire generic section API is **unused** and the canonical contract is typed methods; see q-032 / q-033.
- **Engine never interprets `renderMode`.** `engine/ShaderConfig.ts:20` is explicit: engine treats the value as an opaque tag. Reading it for pass-through to a feature is fine; branching on it inside engine code is not.
- **`ShaderConfig` index signature defeats typo detection.** `[key: string]: any` (`engine/ShaderConfig.ts:27`) means `config.fromula` does not error. Apps that widen via declaration merging restore typo safety.
- **`addSection` does not dedup; the other array mutators do.** `engine/ShaderBuilder.ts:44-54` vs `engine/ShaderBuilder.ts:67-70`. Repeat-calling `addSection(name, code)` with identical strings accumulates duplicates.
- **`buildFragment()` is a stub.** Real apps bypass it (`engine/ShaderBuilder.ts:105-110`). Changes to `buildFragment()` rarely affect real renders; tests that lean on it cover only the toy path.
- **`buildUniformsBlock()` honors `arraySize` only.** `UniformDefinition.precision` and `.comment` are silently dropped (`engine/ShaderBuilder.ts:93-101`). See Known issues for the consumer survey.
- **`backingOnly` is declared here but enforced elsewhere.** `UniformDefinition.backingOnly` (`engine/UniformSchema.ts:19-21`) is a flag intended to create a Three.js uniform backing without emitting a GLSL `uniform` declaration. Neither `ShaderBuilder.buildUniformsBlock()` nor `createUniforms()` check it. The single enforcement site is `shaders/chunks/uniforms.ts:8` (and its `engine-gmt/shaders/chunks/uniforms.ts:8` mirror), which skips emit when the flag is true; see q-026.
- **Eager registration on `UniformSchema` import.** Importing `engine/UniformSchema.ts` for any reason — including a types-only import of `UniformDefinition` — triggers `registerFeatures()` (`engine/UniformSchema.ts:8`). `engine/FeatureSystem.ts` already imports `UniformDefinition` from this file, which would be circular if not for the lazy TS type-import; the runtime side effect still fires on first concrete import.
- **Uniform-name collision is silent.** The `BASE_SCHEMA` vs feature dedup at `engine/UniformSchema.ts:80-81` drops feature uniforms whose names collide with base **without warning**, and the upstream `featureRegistry.getUniformDefinitions()` lets two features push the same name (last-feature-wins via the `UNIFORM_DEFAULTS` reduce at `engine/UniformSchema.ts:85-88`). No runtime guard exists in dev or prod. Convention only: base uses generic names (`uTime`, `uResolution`), features use themed prefixes (`uPT…`, `uLight…`, `uModular…`). See q-029.
- **Sampler defaults are `null`.** `engine/UniformSchema.ts:51`, `engine/UniformSchema.ts:54`. Consumers must bind a real texture before draw or accept undefined-sampler behavior.
- **`UniformNames.ts` section headers are non-binding.** They group logically related uniforms but do **not** correlate with the BASE vs feature-contributed split. `EnvRotationMatrix` and `FogColorLinear` sit under `// Environment` (`engine/UniformNames.ts:53`, `engine/UniformNames.ts:59`) but are in `BASE_SCHEMA` (`engine/UniformSchema.ts:73`, `engine/UniformSchema.ts:74`) — see q-031.

## Interactions with other subsystems

- **`e01-feature-system`** — `ShaderFactory.generateFragmentShader` calls `featureRegistry.getAll()` and `feat.inject(builder, config, variant)` (`engine/ShaderFactory.ts:28-32`); `UniformSchema.ts` calls `featureRegistry.getUniformDefinitions()` (`engine/UniformSchema.ts:77`) and `registerFeatures()` (`engine/UniformSchema.ts:8`). Both contribution paths for feature uniforms — `extraUniforms: UniformDefinition[]` on the feature definition, and `params.<key>.uniform: string` on a param descriptor — are harvested by `featureRegistry.getUniformDefinitions()` in the feature-system layer (see q-031 for the full mapping). The feature `inject` hook signature is declared on the feature registry, not on `ShaderBuilder` itself.
- **`engine-gmt/` raymarching builder (out of scope for e04, covered by g02-shader-pipeline).** `engine-gmt/engine/ShaderBuilder.ts` is a **parallel, API-incompatible** class — typed dedicated injection methods (`setFormula`, `addPostMapCode`, `addMaterialLogic`, `addMissLogic`, `addVolumeTracing`, `addIntegrator`, `requestShading`, `addCompositeLogic`, etc.) and a 17-position assembly contract documented in its file header. It does not consume the generic `addSection`/`getSections` API; no caller in `engine-gmt/features/**` invokes the generic section names. See `plans/doc-audit-state/survey/_followups/q-032.md` and `q-033.md`.
- **Shader-chunk producer (out of scope for e04).** `shaders/chunks/uniforms.ts:8` and `engine-gmt/shaders/chunks/uniforms.ts:8` are the only sites that consume `backingOnly`. They walk `UNIFORM_SCHEMA` themselves to emit the static GLSL preamble — they do **not** route through `ShaderBuilder.buildUniformsBlock()`. The chunk hard-codes `precision highp float / int` in its preamble and reads only `name`, `type`, `arraySize`, `backingOnly` per entry (q-026, q-027).
- **`UniformManager` write-side (out of scope for e04).** `engine-gmt/engine/managers/UniformManager.update()` derives `uEnvRotationMatrix` from `uEnvRotation` and `uFogColorLinear` from `uFogColor` once per frame, both guarded by `if (sourceUniform)` so a build that omits the source feature leaves the derived slot at its identity/zero default (q-028).
- **App-level Zustand store / `MaterialController`.** `UNIFORM_SCHEMA` / `UNIFORM_DEFAULTS` / `createUniforms` are **not consumed inside `engine/`** itself; the only call sites are `shaders/chunks/uniforms.ts`, `engine-gmt/shaders/chunks/uniforms.ts`, and `engine-gmt/engine/MaterialController.ts`. The engine produces the schema and downstream apps consume it.

## Known issues / Phase 2 carry-in

- **`UniformDefinition.precision` is vestigial.** No producer sets it anywhere in the codebase; no consumer reads it. Pure dead type-surface (q-027). Safe to delete in one commit; alternatively the interface JSDoc at `engine/UniformSchema.ts:17` should be updated to acknowledge it as documentation-only.
- **`UniformDefinition.comment` is documentation-only.** Three producers exist (`engine/UniformSchema.ts:62`, `engine/UniformSchema.ts:65`, `engine/UniformSchema.ts:74`); zero consumers. Strings serve as inline doc for whoever reads the schema file but are never emitted into GLSL, logged, or exposed at runtime (q-027). Could be converted to plain `//` comments without loss.
- **`BASE_SCHEMA` "Pure Core" comment is stale.** The header at `engine/UniformSchema.ts:24-25` claims base contains "only uniforms required by the RenderPipeline and Camera logic", but the file already contains image-tile export uniforms (`engine/UniformSchema.ts:45-48`), the histogram layer slot (`engine/UniformSchema.ts:58`), and the `// Optimizations (Shared by Geometry & Lighting)` block (`engine/UniformSchema.ts:69-74`) that includes feature-derived CPU caches. The comment should be updated to describe the three legitimate base categories (true engine core; tool/export slots that no-op at defaults; CPU-derived caches of feature uniforms). See q-028 for the proposed replacement text.
- **`UniformDefinition.backingOnly` JSDoc is incomplete.** The comment at `engine/UniformSchema.ts:19-21` says the flag "skips GLSL declaration" without pointing at the enforcement site. A one-line addition naming `shaders/chunks/uniforms.ts` as the consumer and noting that features needing the declaration must call `builder.addUniform(…)` in their own `inject()` would close the loop (q-026).
- **Uniform-name collisions warn nowhere.** No runtime guard exists for feature-vs-base or feature-vs-feature name collisions (`engine/UniformSchema.ts:80-81`, and the upstream `getUniformDefinitions` blind-pushes — see q-029). The convention is review-only and is not documented in `docs/`. Consider adding a `console.warn` in dev for collisions and a one-line section in this doc / `docs/03_Modular_System.md` describing the naming prefixes.
- **`ShaderConfig` index signature defeats typo detection.** `[key: string]: any` (`engine/ShaderConfig.ts:27`) — apps that widen via declaration merging are responsible for restoring typo safety on their own well-typed fields. Engine-side, `config.fromula` will not error.

## Historical context

No existing doc covered this subsystem; this is the canonical reference going forward. The in-source design-rationale comments that future reformats must preserve:

- `engine/ShaderBuilder.ts:1-20` — class JSDoc explaining the five-generic-primitives + section-escape-hatch design, with examples of the fractal-specific section names a plugin might register.
- `engine/ShaderBuilder.ts:56-66` — the "Plugin Escape Hatch" section header with the worked example of a raymarching plugin defining and reading section names.
- `engine/ShaderBuilder.ts:103-110` — `buildFragment()` JSDoc declaring it a stub that real apps should bypass.
- `engine/ShaderFactory.ts:1-12` — class JSDoc declaring the engine has "no knowledge of render modes" and that variant-specific shaders are a plugin concern.
- `engine/ShaderFactory.ts:24-27` — inline comment naming both contribution paths (generic primitives and section escape hatch) for feature `inject` calls.
- `engine/ShaderConfig.ts:2-10` — interface JSDoc declaring the config opaque to engine and widenable by apps via declaration merging.
- `engine/ShaderConfig.ts:13` / `engine/ShaderConfig.ts:15` / `engine/ShaderConfig.ts:20` — per-field comments labelling `formula` as "opaque identifier", `pipelineRevision` as "bumped by app-layer code", and `renderMode` as "engine treats as opaque tag".
- `engine/UniformSchema.ts:7` — `// Ensure features are registered before schema is built` — the rationale for the eager top-level `registerFeatures()` call.
- `engine/UniformSchema.ts:19-21` — `UniformDefinition.backingOnly` JSDoc (note: needs the q-026 follow-up addition naming the enforcement site).
- `engine/UniformSchema.ts:24-25` — `// Base Schema (Pure Core)` (stale — see Known issues; the file currently contains three categories beyond pure core).
- `engine/UniformSchema.ts:69` — `// Optimizations (Shared by Geometry & Lighting)` — the actual category for `EnvRotationMatrix` / `FogColorLinear` (q-028).
- `engine/UniformSchema.ts:79` — `// Deduplicate in case a feature defines a uniform that's also in base (shouldn't happen with correct separation)` — the only acknowledgement that collision is possible (q-029).
- `engine/UniformNames.ts:53` / `engine/UniformNames.ts:59` — `// CPU Optimization` / `// CPU: InverseACESFilm(uFogColor)` — annotations marking the two BASE-hoisted feature-derived caches.
- `engine/UniformNames.ts:64` — `// Geometry Transforms (CPU Optimization — branchless 3-stage rotation)` — explains why three rotation matrices live in BASE.
