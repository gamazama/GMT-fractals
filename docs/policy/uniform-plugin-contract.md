---
source: engine/UniformSchema.ts
lines: 104
last_verified_sha: fdb3384330e24d65e3ae299ec99fad320b3ee6ce
additional_sources:
  - engine/FeatureSystem.ts
  - engine-gmt/engine/UniformSchema.ts
  - engine-gmt/engine/managers/UniformManager.ts
  - engine/UniformNames.ts
  - engine-gmt/features/lighting/index.ts
  - engine-gmt/features/core_math.ts
  - engine-gmt/features/optics.ts
  - engine-gmt/features/interlace/index.ts
  - engine-gmt/features/materials.ts
  - engine-gmt/features/atmosphere/index.ts
  - shaders/chunks/uniforms.ts
  - engine-gmt/shaders/chunks/uniforms.ts
audited: 2026-05-20T10:20:00Z
audited_by: claude-opus-4-7
public_api:
  - UniformDefinition
  - type GLSLType
  - BASE_SCHEMA
  - UNIFORM_SCHEMA
  - UNIFORM_DEFAULTS
  - createUniforms
  - backingOnly
  - extraUniforms
  - getUniformDefinitions
  - featureRegistry
  - UniformManager
  - Uniforms
depends_on: []
---

# Uniform plugin contract — when and how to contribute uniforms

This document is the canonical reference for contributors who need to add or change a uniform in the GMT shader pipeline. The contract today is **distributed across four contribution paths** (the BASE schema, two feature-side mechanisms harvested by `featureRegistry.getUniformDefinitions()`, and direct write-side registration in `UniformManager`), with no single in-source overview. Drift across these paths is real: feature-vs-feature uniform-name collisions are silent (`engine/UniformSchema.ts:80-81`, `engine/FeatureSystem.ts:512-538`), the `backingOnly` flag is declared in one tree and enforced in another (`engine/UniformSchema.ts:19-21` vs `shaders/chunks/uniforms.ts:8`), and several `UniformDefinition` fields (`precision`, `comment`) have no consumer at all. This doc gives a decision tree per path, the must-hold invariants, and the known footguns so future shader-extension work has a citable single reference.

## Existing contribution paths (catalog)

Four paths contribute a uniform to the final GLSL `uniform …;` declarations and the Three.js `material.uniforms` map. All four feed the same downstream consumers (the static preamble producer at `shaders/chunks/uniforms.ts:7-14`, the schema-driven Three.js backing factory at `engine/UniformSchema.ts:90-104`, and the engine-gmt per-frame writer at `engine-gmt/engine/managers/UniformManager.ts:64-395`).

| # | Path | Where declared | When to use | Footguns |
|---|------|----------------|-------------|----------|
| 1 | **`BASE_SCHEMA` entry** | `engine/UniformSchema.ts:26-75` (engine-core) and the parametrisation-hook twin at `engine-gmt/engine/UniformSchema.ts:26-75` | A uniform that must always be declarable in GLSL regardless of which features are compiled. Three legitimate sub-categories: true engine core (camera, time, resolution, pipeline state); tool/export slots that no-op at their defaults (image-tile, histogram, multi-pass); CPU-derived caches of feature uniforms that multiple consumer features read unconditionally (`uEnvRotationMatrix` at `engine/UniformSchema.ts:73`, `uFogColorLinear` at `engine/UniformSchema.ts:74`). | The `// Base Schema (Pure Core)` header comment at `engine/UniformSchema.ts:24-25` is stale — the file already contains the three categories above, not just "pure core". A naive reader expecting only camera/time uniforms here will mis-categorise. |
| 2 | **`FeatureDefinition.extraUniforms: UniformDefinition[]`** | Field on the feature literal at `engine/FeatureSystem.ts:224-225`; harvested by `getUniformDefinitions()` at `engine/FeatureSystem.ts:533-536`. Producer example: `engine-gmt/features/lighting/index.ts:124-143` (15 light/CDF uniforms). | Array-typed slots (`arraySize`), sampler/texture slots whose Three.js default needs control (`null` for `sampler2D`), and `backingOnly: true` slots whose GLSL declaration is feature-injected on demand. Anything where the param-to-uniform 1:1 binding of path 3 does not fit. | Two features that both declare the same `name` in `extraUniforms` (or one in `extraUniforms` and one in `params.*.uniform`) BOTH appear in the registry's output — `getUniformDefinitions()` at `engine/FeatureSystem.ts:512-538` does no feature-vs-feature collision check. The `UNIFORM_DEFAULTS` reduce at `engine/UniformSchema.ts:85-88` is last-wins, silently. |
| 3 | **`params.<key>.uniform: string`** on a `ParamConfig` | Optional `uniform?: string` field at `engine/FeatureSystem.ts:60`; harvested by `getUniformDefinitions()` at `engine/FeatureSystem.ts:515-531`. Producer examples: `engine-gmt/features/optics.ts:23` (`uCamType`), `engine-gmt/features/core_math.ts:134-150` (scalar + vec parameters), `engine-gmt/features/interlace/index.ts:169-180` (`uInterlaceEnabled` and friends), `engine-gmt/features/materials.ts:211` (`uEnvMapTexture` via an `image`-typed param), `engine-gmt/features/atmosphere/index.ts:99-123` (fog params). | Single-param 1:1 bindings that change from React/Zustand state. This is the **preferred path** for any uniform that already has a corresponding DDFS param — it gets free CONFIG-event routing, `composeFrom` support, animation track auto-derivation, undo snapshotting, and preset round-trip. | The harvester normalises types: `color` → `vec3`, `boolean` → `float` (1.0 / 0.0), `image`/`gradient` → `sampler2D` with `null` default (`engine/FeatureSystem.ts:520-528`). A feature that declares `type: 'gradient'` and expects a `sampler2D` GLSL slot will get one — but the param's runtime value is a `GradientConfig`, not a texture; the texture is built by the gradient-buffer pipeline in `store/createFeatureSlice.ts` and routed via the `texture` event channel, NOT via the schema. |
| 4 | **Direct write into `material.uniforms` via `UniformManager`** | The engine-gmt-only writer at `engine-gmt/engine/managers/UniformManager.ts:18`. Examples: `uEnvRotationMatrix` derivation at `engine-gmt/engine/managers/UniformManager.ts:233-239`, `uFogColorLinear` derivation at `engine-gmt/engine/managers/UniformManager.ts:242-258`, light-array packing at `engine-gmt/engine/managers/UniformManager.ts:260-358`, 3-stage rotation matrices at `engine-gmt/engine/managers/UniformManager.ts:360-394`. | CPU-derived caches that compute once per frame from another uniform's source value (e.g. `mat2(cos,sin,-sin,cos)` from a scalar radians input), packed array writes from a Zustand state shape that does not map 1:1 to a `params.*.uniform` (the light array), and per-frame derived values like `uPixelSizeBase` and `uCamBasisX/Y` (`engine-gmt/engine/managers/UniformManager.ts:202-214`). | Direct `UniformManager` registration ONLY makes sense in engine-gmt — the engine-core sibling `engine/managers/` has only `ConfigManager.ts`; there is no `engine/managers/UniformManager.ts` (verified at `plans/doc-audit-state/survey/_followups/q-099.md:23-25`). A new non-GMT app would write its own per-frame writer module rather than reuse this one. Also: the GLSL slot must still come from one of paths 1-3 (the writer touches `material.uniforms` keyed by name, but the GLSL `uniform …;` line is produced by the schema walker at `shaders/chunks/uniforms.ts:7-14`, which has no idea this writer exists). |

The downstream merge sequence: `BASE_SCHEMA` + (feature `params.*.uniform` harvested via the path-3 mechanism, then feature `extraUniforms` appended via the path-2 mechanism) → name-collision filter at `engine/UniformSchema.ts:80-81` drops feature uniforms whose names collide with base → `UNIFORM_SCHEMA` (`engine/UniformSchema.ts:83`) → `createUniforms()` walk at `engine/UniformSchema.ts:90-104` produces the Three.js `material.uniforms` map → `shaders/chunks/uniforms.ts:7-14` walks the same schema to emit the static GLSL preamble (skipping `backingOnly` entries).

## Rules for adding a new uniform

R1. **If the uniform is tied to a feature's params and changes per-frame from store state, use `params.<key>.uniform` (path 3).** Do NOT add it to `extraUniforms` and do NOT add it to `BASE_SCHEMA`. The DDFS routing in `store/createFeatureSlice.ts` already handles uniform emit, CONFIG-event diff, gradient-buffer texture path, and animation/undo/preset round-trip for path-3 uniforms; the other paths do not. Cite: `engine/FeatureSystem.ts:55-125` (ParamConfig), `engine/FeatureSystem.ts:515-531` (harvester branch).

R2. **If the uniform is an array, a sampler the feature owns, or needs `backingOnly: true`, use `extraUniforms` (path 2).** Path 3's auto-derivation does not carry `arraySize`; it never sets `backingOnly`; and `image`/`gradient` types route through dedicated texture channels rather than schema. Cite: `engine/FeatureSystem.ts:224-225`, `engine-gmt/features/lighting/index.ts:124-143`, `engine-gmt/features/core_math.ts:128-132`.

R3. **`BASE_SCHEMA` (path 1) is reserved for three sub-categories only:** true engine-core uniforms (camera/time/resolution); tool/export slots whose defaults are a no-op identity (bucket-render tile, histogram layer, multi-pass output); and CPU-derived caches of feature uniforms that multiple consumer features read with safe identity defaults (the two examples at `engine/UniformSchema.ts:73-74` are the precedent). Adding anything else to `BASE_SCHEMA` is a contract violation — see q-028 for the full rationale (`plans/doc-audit-state/survey/_followups/q-028.md`).

R4. **Engine-core uniforms with no GMT coupling go in `engine/UniformSchema.ts` BASE_SCHEMA; GMT-specific uniforms go via a feature in the engine-gmt tree.** The engine-core and engine-gmt copies of `UniformSchema.ts` are a Pattern C parametrisation-hook fork (see `docs/modules/engine-fork-rules.md`): each `BASE_SCHEMA` literal is byte-identical, and the divergence is the import-path of `registerFeatures()` at line 5, which composes a different sibling `features/` set per tree. Editing only one copy of `BASE_SCHEMA` will silently desync the two engines — keep them byte-identical or move the change into a path-2/path-3 feature.

R5. **Avoid direct `UniformManager.update()` writes (path 4) for new uniforms unless the value is a CPU-derived per-frame cache of another uniform's value.** Direct writes bypass the schema-driven validation, the CONFIG-event diff in `engine-gmt/engine/managers/ConfigManager.ts`, and the animation/undo/preset round-trip. The legitimate uses are precisely the per-frame derivations enumerated in path-4 above (`engine-gmt/engine/managers/UniformManager.ts:202-258` for camera basis + env rotation + fog linearisation, `engine-gmt/engine/managers/UniformManager.ts:260-358` for light packing). Cite the source feature uniform (paths 1-3) and have `UniformManager` derive into a BASE slot — the `if (sourceUniform) { … }` guard pattern at `engine-gmt/engine/managers/UniformManager.ts:233-239` is the canonical defensive shape.

R6. **Names MUST follow the prefix convention.** `BASE_SCHEMA` uses short generic names (`uTime`, `uResolution`, `uCameraPosition`, `uPixelSizeBase`); features use themed prefixes (`uPT…` for pathtracer, `uLight…` for lighting, `uModular…` for the modular pipeline, `uInterlace…` for interlace, `uEnv…` for materials env, `uFog…` for atmosphere). There is **no runtime check** — see Invariant I3 below. The convention is enforced only at code review.

R7. **Always add the canonical identifier to `engine/UniformNames.ts` (`Uniforms.X = 'uX'`) and reference it by `Uniforms.X` in the schema entry, NOT a string literal.** Cite: `engine/UniformNames.ts:2-93`. The `UniformName` string-literal union derived at `engine/UniformNames.ts:95` is the typed "valid uniform identifier" check downstream code uses; bypassing it with a raw string defeats it. Note that the section-header comments in `UniformNames.ts` (e.g. `// Environment`) are organisational only — they do NOT correlate with the BASE-vs-feature partition; `EnvRotationMatrix` sits under `// Environment` but is in `BASE_SCHEMA` (see q-031 in `plans/doc-audit-state/survey/_followups/q-031.md`).

R8. **For an array-typed slot, default to a typed array (`Float32Array(N)`) or `new Array(N).fill(new THREE.Vector3())`** — `createUniforms` deep-clones `Float32Array` (`new Float32Array(val)` at `engine/UniformSchema.ts:98`) and array-of-Three (`.map(v => v.clone?.() ?? v)` at `engine/UniformSchema.ts:97`). A bare-object default like `{ x: 0 }` will pass through as a primitive at line 100 and break array indexing on the shader side. Producer example: `engine-gmt/features/lighting/index.ts:126-136`.

R9. **Do not set `UniformDefinition.precision` or `UniformDefinition.comment` expecting any runtime effect.** Both fields are interface-declared at `engine/UniformSchema.ts:17-18` but have zero consumers: the chunk emitter at `shaders/chunks/uniforms.ts:7-14` reads only `name`, `type`, `arraySize`, `backingOnly`, and the Three.js factory at `engine/UniformSchema.ts:90-104` reads only `name` and `default`. The precision preamble is hard-coded to `precision highp float; precision highp int;` at `shaders/chunks/uniforms.ts:5`. See q-027 in `plans/doc-audit-state/survey/_followups/q-027.md`.

R10. **`backingOnly: true` requires a paired feature `inject()` call to `builder.addUniform(name, type, arraySize?)`.** The flag tells the schema walker at `shaders/chunks/uniforms.ts:8` to skip emitting the static GLSL `uniform …;` declaration (the Three.js backing is still created by `createUniforms` at `engine/UniformSchema.ts:90-104`, which does NOT check the flag). To actually use the uniform in GLSL, the feature must add the declaration on demand from its own `inject()` — see `engine-gmt/features/core_math.ts:157-161` for the canonical `'Modular'`-only emission of `uModularParams`. Without the paired `addUniform`, `backingOnly` produces a Three.js slot that no shader can read.

## Invariants

I1. **`BASE_SCHEMA` is the single source of truth for engine-core uniforms.** Both `engine/UniformSchema.ts:26-75` and `engine-gmt/engine/UniformSchema.ts:26-75` MUST stay byte-identical (Pattern C parametrisation-hook fork — see `docs/modules/engine-fork-rules.md`). A change to BASE in one tree without the same change in the other silently desyncs the two engines.

I2. **The `featureRegistry.getUniformDefinitions()` harvester is the single funnel for feature-side uniforms.** Both `extraUniforms` (path 2) and `params.*.uniform` (path 3) feed through `engine/FeatureSystem.ts:512-538`; downstream code in `engine/UniformSchema.ts:77` and `engine-gmt/engine/UniformSchema.ts:77` consumes only the funnel output. New feature-contribution paths MUST extend the funnel, not bypass it.

I3. **Uniform-name collisions are silent.** `engine/UniformSchema.ts:80-81` filters feature uniforms whose names collide with `BASE_SCHEMA` without log, throw, or dev warning; `engine/FeatureSystem.ts:512-538` does no feature-vs-feature collision check; the `UNIFORM_DEFAULTS` reduce at `engine/UniformSchema.ts:85-88` is last-wins. Convention is the only defence. See q-029 in `plans/doc-audit-state/survey/_followups/q-029.md`.

I4. **`backingOnly` is declared in `engine/UniformSchema.ts:19-21` and enforced only in `shaders/chunks/uniforms.ts:8` (and the engine-gmt mirror at `engine-gmt/shaders/chunks/uniforms.ts:8`).** No other layer checks the flag. `createUniforms` at `engine/UniformSchema.ts:90-104` and `engine-gmt/engine/UniformSchema.ts:90-104` ignore it. Adding a new enforcement site (e.g. a `UniformManager`-level skip) without coordinating with the chunk emitter will produce inconsistent behaviour. See q-026 in `plans/doc-audit-state/survey/_followups/q-026.md`.

I5. **`UniformSchema.ts` triggers `registerFeatures()` at import time** (`engine/UniformSchema.ts:7-8`, `engine-gmt/engine/UniformSchema.ts:7-8`). Any module that imports anything from `UniformSchema` — even a type-only import of `UniformDefinition` — fires the side effect. Adding a new contribution path that participates in this top-level pre-build MUST be deterministic and not depend on subsequent imports.

I6. **`UniformManager` is engine-gmt-only.** The engine-core `engine/managers/` directory contains only `ConfigManager.ts`. A new non-GMT app contributing uniforms via path 4 MUST write its own per-frame writer; there is no shared substrate to reuse. Verified at `plans/doc-audit-state/survey/_followups/q-099.md:23-25`.

I7. **Sampler defaults are `null`.** Producers using path 1 or path 2 with `type: 'sampler2D'` MUST default `value` to `null` (see `engine/UniformSchema.ts:51,54` for BASE precedent and `engine-gmt/features/lighting/index.ts:139-140` for the env-CDF samplers). Consumers MUST bind a real texture before the first draw or accept undefined-sampler GL behaviour.

I8. **`UniformNames.ts` section headers are non-binding.** The `// Environment`, `// Lighting`, `// Modular` comments at `engine/UniformNames.ts` group identifiers logically but do NOT correlate with the BASE-vs-feature contribution path. `EnvRotationMatrix` and `FogColorLinear` sit under `// Environment` (`engine/UniformNames.ts:53` area) but are in `BASE_SCHEMA` (`engine/UniformSchema.ts:73-74`), not feature-contributed. See q-031.

## Interactions with other subsystems

- **`docs/modules/engine/feature-system.md`** — owns the registration-side contract: `FeatureDefinition.extraUniforms` and `ParamConfig.uniform` are introduced there; `getUniformDefinitions()` is the funnel. Read that doc first for the registration semantics; this doc is the cross-cutting "which path to pick" overlay.
- **`docs/modules/engine/shader-builder.md`** — owns the engine-core schema surface (`engine/UniformSchema.ts`, `engine/UniformNames.ts`, `engine/ShaderBuilder.ts`). This doc complements it by enumerating the four contribution paths; the shader-builder doc covers the schema-as-data surface.
- **`docs/modules/engine-gmt/shader-pipeline.md`** — owns the engine-gmt downstream consumers: `UniformManager.syncFrame` (per-frame writer), `ConfigManager.update` (uniform-back-fill from CONFIG diffs), and the 17-position `ShaderBuilder` assembler that decides which GLSL declarations actually reach the shader. Path-4 (direct `UniformManager` writes) is exclusively a GMT-side concern.
- **`docs/audit-2026-05-20/archive/engine/plugins-host.md`** — does not currently contribute uniforms (plugins host owns UI chrome, not the render contract), but the "no uniform plugin contract" carry-in note at `plans/doc-audit-state/survey/e07-plugins-host.md:187` is what motivated this doc. Plugin authors who need a uniform should pick a path 1-3 in a feature definition, not invent a fifth.
- **`docs/modules/engine-fork-rules.md`** — `UniformSchema.ts` is the canonical Pattern C (parametrisation-hook) exemplar; `UniformNames.ts` is the canonical Pattern A (re-export shim) exemplar; `UniformManager.ts` is the canonical Pattern D (engine-gmt-only) exemplar. R4 above is the uniform-specific application of those patterns.

## Known issues / Phase 2 carry-in

| Kind | Item | Site | Source |
|------|------|------|--------|
| design-gap | Silent uniform-name collision (feature-vs-base and feature-vs-feature) has no runtime guard in dev or prod. Convention `uPT*`/`uLight*`/`uModular*` prefixes enforced at review only. Future work: dev-only `console.warn` in `engine/UniformSchema.ts:77-83` and a feature-vs-feature pre-merge check in `engine/FeatureSystem.ts:512-538`. | `engine/UniformSchema.ts:80-81`, `engine/FeatureSystem.ts:512-538` | q-029 |
| drift | Two contribution paths for feature uniforms (`extraUniforms` and `params.*.uniform`) are not jointly documented anywhere besides this file. q-030 missed the `extraUniforms` path entirely; q-031 corrected it. | `engine/FeatureSystem.ts:224-225,515-536`, `engine-gmt/features/lighting/index.ts:124-143` | q-030, q-031 |
| drift | `UniformDefinition.precision` and `.comment` are vestigial — no consumer reads them, no producer sets `precision` anywhere in the tree, `comment` has three producers in `BASE_SCHEMA` (`engine/UniformSchema.ts:62,65,74`) that serve as inline docs. Safe to delete `precision` field; convert `comment` to plain `//` lines. Until then, R9 is the contract. | `engine/UniformSchema.ts:17-18` | q-027 |
| drift | `// Base Schema (Pure Core)` header comment at `engine/UniformSchema.ts:24-25` is stale; the file already contains three legitimate categories (true core, tool/export slots, CPU-derived caches). Update the comment to match the three-category contract in R3. | `engine/UniformSchema.ts:24-25` | q-028 |
| drift | `UniformDefinition.backingOnly` JSDoc at `engine/UniformSchema.ts:19-21` does not name the enforcement site (`shaders/chunks/uniforms.ts:8`) or the paired-`addUniform` requirement (R10). One-line addition would close the loop. | `engine/UniformSchema.ts:19-21` | q-026 |
| drift | `UniformManager` is engine-gmt-only but `docs/gmt/02_Rendering_Internals.md` (three sites), `docs/gmt/43_Bucket_Render_Overhaul.md` (one), and `docs/specs/10_Shaped_Emission.md` (two) reference the file without the `engine-gmt/` prefix; relative links from `docs/gmt/` would 404. Fix when a doc-refresh window opens. | (out of scope — read-only docs) | q-099 |
| structure | Interlace uniforms have a duplicate-declaration risk: the `params.*.uniform` descriptors at `engine-gmt/features/interlace/index.ts:169-180` are the source of truth for the Three.js binding, but the GLSL declaration ordering is pinned by a hardcoded reserved-name list in `engine-gmt/engine/SDFShaderBuilder.ts` (`'uInterlaceEnabled'`, `'uInterlaceInterval'`, `'uInterlaceStartIter'`) that must stay in sync. If a new interlace uniform is added at path 3 without also touching the SDFShaderBuilder list, mesh export will silently miss the declaration. | `engine-gmt/features/interlace/index.ts:169-180` | q-031 |

## Historical context

No existing module doc covered the uniform contribution contract — the surveyor's closing note carried into `docs/audit-2026-05-20/archive/engine/plugins-host.md:238` ("no uniform plugin contract") is what motivated this file. The in-source comments that this doc consolidates and that future reformats MUST preserve:

- `engine/UniformSchema.ts:7` — `// Ensure features are registered before schema is built`. The rationale for the eager top-level `registerFeatures()` call that makes I5 load-bearing.
- `engine/UniformSchema.ts:19-21` — `UniformDefinition.backingOnly` JSDoc (needs the q-026 enforcement-site addition to fully document R10).
- `engine/UniformSchema.ts:24-25` — `// Base Schema (Pure Core)` (stale; R3 documents the actual three categories).
- `engine/UniformSchema.ts:69` — `// Optimizations (Shared by Geometry & Lighting)`. The accurate category label for the CPU-derived caches at `engine/UniformSchema.ts:70-74`.
- `engine/UniformSchema.ts:79` — `// Deduplicate in case a feature defines a uniform that's also in base (shouldn't happen with correct separation)`. The only in-source acknowledgement that I3's silent-collision contract exists.
- `engine/FeatureSystem.ts:224` — `// extraUniforms: complex uniforms (arrays, structs) that aren't 1:1 with a param entry`. The one-line in-source description of path 2.
- `engine-gmt/features/core_math.ts:129-131` — `// backingOnly: Three.js uniform object always exists for syncModularUniforms(), but GLSL declaration is injected conditionally in inject() only for Modular formula`. The canonical worked example of R10's paired-`addUniform` pattern.

The four-path contract emerged organically across the lifetime of the codebase. Path 1 (BASE_SCHEMA) is the oldest; path 2 (extraUniforms) was added when the lighting feature outgrew the 1:1 binding; path 3 (params.*.uniform) is the DDFS-era preferred path that subsumed most new uniforms; path 4 (UniformManager direct writes) is a render-loop concern that predates the DDFS framing and persists for legitimate per-frame CPU-derivation cases. Future shader-extension work (cf. `plans/mesh-export-unification.md` for one downstream consumer) should pick path 3 by default and treat paths 1-2 as escape hatches gated by the rules above.
