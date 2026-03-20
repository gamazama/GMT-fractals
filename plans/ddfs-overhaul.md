# DDFS Overhaul — COMPLETED

## Status: All planned work complete (v0.9.0)

This plan was drafted during the Light Sphere migration. All viable items have been implemented across multiple sessions. This file is retained as an archive.

---

## Completed

| Priority | Item | Session |
|----------|------|---------|
| P1 | Assembly order documentation — comment block + JSDoc on all 17 hooks in ShaderBuilder.ts | 1 |
| P2 | API cleanup — `setDistOverride` object form, `addVolumeTracing`, `addHybridFold`, internal field renames | 1 |
| P3 | Accumulative DE hooks — `addPostMapCode()`, `addPostDistCode()` | 1 |
| P4 | Water plane extraction — fully self-contained, de.ts and material_eval.ts are generic | 1 |
| P5 | Post-processing hook — `addPostProcessLogic()` with injection in `applyPostProcessing()` | 2 |
| P5b | Post-processing unification — fog, glow, scatter extracted from post.ts into features | 2 |
| — | Light spheres extraction — satellite feature with `dependsOn: ['lighting']` | Pre-plan |
| — | Feature dependency system — `dependsOn` + topological sort (Kahn's) in FeatureRegistry | 1 |
| — | Reflections extraction — `requestShading()` + `addShadingLogic()` deferred pattern | 2 |
| — | SSR removal — removed unimplemented mode, legacy presets fall through to ENV | 2 |
| — | Bounce shadows fix — always compute (no brightness pop nav/accumulation) | 2 |
| — | Volumetric step jitter — `uVolStepJitter` with slider control | 2 |
| — | Docs updated — 01_System_Architecture, 02_Rendering_Internals, 10_Shader_Architecture_Refactor | 2 |

## Decided Against

- **Renaming `addPostDEFunction`, `addIntegrator`, `addMissLogic`, `addCompositeLogic`** — trades positional clarity for semantic narrowness
- **Declarative `stubs` field on FeatureDefinition** — manual approach in inject() is more flexible
- **`addDEOverride` concept** — wrong; used `addPostMapCode`/`addPostDistCode` instead

## Deferred (No Concrete Pain Point)

- **Lighting monolith split** — extract ShadowsFeature, PathTracerFeature. High risk (shared uniforms/state, render mode gating). See analysis below.
- **UI gaps** — multi-param widgets, layout customization, validation. Aspirational.

---

## Lighting Monolith Split — Analysis

### Current State (~370 lines)
LightingFeature owns 5 systems: light management, PBR direct shading, shadows, path tracing, and render mode selection. Well-organized with clear sections.

### What Could Be Split

| Candidate | Risk | Benefit | Blocking Issue |
|-----------|------|---------|----------------|
| ShadowsFeature | Medium | ~100 lines + 60 GLSL out of lighting | Shadow UI interleaved in LightPanel |
| PathTracerFeature | High | ~80 lines + pathtracer.ts decoupled | Render mode branching must stay in Lighting; PT defines set by multiple features |
| LightSpheresFeature | Done | Already extracted as satellite feature | — |

### Why It's a Monolith
1. **Render mode as gateway** — `renderMode` selects direct vs path tracer, baked into inject()
2. **Deferred shading** — `requestShading()` delays generation until reflections inject; lighting must own the composition decision
3. **Compile-time gate tower** — 4 interdependent compile switches (advancedLighting, shadowsCompile, ptEnabled, specularModel)
4. **Atomic uniform sync** — UniformManager.syncFrame reads lighting.lights and syncs 10 uniform arrays atomically

### Recommendation
**Keep as single feature.** The coupling is architectural, not incidental. Splitting would create satellite features that can't independently decide their shader strategy. Revisit only if a concrete pain point emerges (e.g., new render mode that doesn't fit the current branching).

---

## Reference Features

These demonstrate the full DDFS pattern for new development:

| Feature | Demonstrates |
|---------|-------------|
| **Water Plane** (`features/water_plane.ts`) | `addPostMapCode`/`addPostDistCode`, `addMaterialLogic`, `addDefine`, compile-time toggle |
| **Light Spheres** (`features/lighting/light_spheres.ts`) | Satellite (`dependsOn`), `addPostDEFunction`, `addMissLogic`, `addCompositeLogic`, stochastic AA |
| **Reflections** (`features/reflections/index.ts`) | `addShadingLogic` (deferred injection), `addPostDEFunction`, compile-time mode switching |
| **Atmosphere** (`features/atmosphere/index.ts`) | `addVolumeTracing`, `addPostProcessLogic`, runtime uniform gating |
| **Volumetric** (`features/volumetric/index.ts`) | `addVolumeTracing`, `addPostProcessLogic`, stochastic jitter control |
