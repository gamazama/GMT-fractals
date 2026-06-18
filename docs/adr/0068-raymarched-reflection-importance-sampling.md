# ADR-0068: Raymarched reflections use VNDF importance sampling + env/AO fill

**Date:** 2026-06-18
**Status:** Accepted
**Scope:** `engine-gmt/features/reflections/index.ts` (`REFL_RAYMARCH_SHADING`), `engine-gmt/features/reflections/shader.ts` (`getReflectionsGLSL`)

> **Update 2026-06-19 (sampler unified with the PT path; decision unchanged):**
> The bounded spherical-cap VNDF sampler is now a single source of truth in
> `engine-gmt/shaders/chunks/vndf.ts` (`getVNDFSamplerGLSL(fnName)`), emitted as
> `sampleReflVNDF` in the reflection chunk and as `sampleGGXVNDF` in the path
> tracer (`pathtracer.ts`), which **replaces the PT's former Heitz 2018
> sampler**. The emitter is self-contained (inlines a Duff 2017 ONB) so it can be
> emitted under either name into the mutually-exclusive PT / Direct shaders with
> no collision and no Balanced-profile cost. The now-orphaned `importanceSampleGGX`
> half-vector sampler was removed from `pathtracer.ts`. The technique choice
> (bounded spherical-cap VNDF) is unchanged — it now also governs PT bounces.

## Context

The raymarched reflection mode (`reflectionMode === REFL_MODE_RAYMARCH`,
the "Raymarched (Quality)" option, only compiled under the Ultra profile)
shaded glossy reflections by perturbing the mirror direction with a uniform
blue-noise cone scaled by `roughness * 0.8`, tracing one ray, and weighting
the result by `F * uSpecular`. Three structural defects made it noisy and
firefly-prone:

1. **It was not importance sampling.** The cone distribution does not match
   the GGX lobe, and the weight omitted the geometry (Smith) term entirely —
   so the single-sample estimator was both wrong-shaped and high-variance,
   and convergence rested entirely on temporal accumulation.
2. **No firefly clamp.** A jittered ray landing on a bright highlight spiked
   with nothing to cap it. The PT integrator clamps every radiance site via
   `clampByLuminance(uPTMaxLuminance)`; this path had no equivalent.
3. **No environment at the reflection hit.** The hit was shaded with
   `r_emission + calculatePBRContribution` (direct lights only). The primary
   surface receives Ambient IBL (`shading.ts` step 7) + AO (step 8); the
   reflection hit received neither, so reflected cavities where lights are
   occluded rendered **black** even though the identical cavity reads fine on
   the primary surface.

The PT path already solved (1)+(2) with VNDF + MIS + clamp + roughness
regularization, but those helpers live inside the PT shader chunk
(`getPathTracerGLSL`), which is a *mutually exclusive* integrator with the
Direct-mode `calculateShading` that hosts the raymarched reflection block
(`if (isPathTracing) … else …` in `lighting/index.ts`). The Balanced profile
uses `reflectionMode === REFL_MODE_ENV`, a different injection
(`REFL_ENV_SHADING`), and a hard constraint was: **add no compile time to the
Balanced path.**

## Decision

Overhaul the raymarched reflection shading. All new GLSL lives inside the
raymarched-only injection (`getReflectionsGLSL` via `addPostDEFunction`, and
`REFL_RAYMARCH_SHADING` via `addShadingLogic`), so Balanced/Env-map compile
cost is unchanged. Helpers are `refl`-prefixed and self-contained (no
dependency on whichever `LIGHTING_SHARED*` variant compiled); because the PT
chunk and the Direct shading chunk never coexist in one shader, there is no
symbol collision with the PT path's `sampleGGXVNDF` / `clampByLuminance` even
under Ultra (PT compiled + raymarch active).

1. **VNDF importance sampling.** Replace the cone jitter with bounded
   spherical-cap GGX visible-normal sampling — Dupuy & Benyoub 2023,
   "Sampling Visible GGX Normals with Spherical Caps," with the bounded cap of
   Eto & Tokuyoshi 2024, "Bounded VNDF Sampling for the Smith-GGX BRDF"
   (`sampleReflVNDF`). The single-sample specular weight becomes `F * G1(L)`
   (bounded → no grazing-angle fireflies), and accumulated samples converge on
   the true glossy lobe. Perfect-mirror surfaces and in-motion frames keep the
   deterministic `reflDir`. Micro-facet Fresnel at the sampled half-vector
   replaces the macro NdotV Fresnel.
2. **Firefly clamp.** Clamp the per-frame reflection sample before
   accumulation via `clampReflLum`, reusing the existing `uPTMaxLuminance`
   "Firefly Clamp" uniform (always declared — `UNIFORM_SCHEMA` collects all
   feature-param uniforms unconditionally). Left at its default; not surfaced
   as a separate Direct-mode control.
3. **Roughness regularization.** Floor the lobe roughness (`max(·, 0.04)`,
   prevents the degenerate `alpha = 0` GGX basis) and the reflected surface's
   own roughness (`max(·, 0.08)`, removes a secondary highlight-firefly
   source). Mirrors the PT path.
4. **Environment fill at the hit.** Add deterministic Ambient IBL —
   `kD`-weighted diffuse irradiance (`GetEnvMap(r_n, 1.0)`) plus a
   Fresnel-weighted specular env lobe (`GetEnvMap(reflect(currRd, r_n),
   r_rough)`) — so reflected cavities are lit by the environment and reflected
   surfaces show the env, not just point lights. Deterministic mip lookups add
   fill light, not noise (a stochastic env-MIS would have reintroduced the
   variance just removed).
5. **AO at the hit.** Apply `GetAO(p_next, r_n, …)` with the `uAOColor` tint
   exactly as the primary surface does (`shading.ts` step 8), so the env fill
   occludes in cavities instead of reading flat. `GetAO` is a safe `1.0` stub
   when the AO feature is off.

## Consequences

- Glossy raymarched reflections converge much faster and are firefly-free;
  reflected cavities are environment-lit and AO-occluded, matching the primary
  surface.
- Glossy reflections read slightly **dimmer** than before — the previously
  omitted `G1(L)` geometry term is now correctly applied. This is a
  correctness change, not a regression.
- Runtime cost rises on the raymarched path (VNDF math, extra `GetEnvMap`
  fetches, one `GetAO` per reflection hit). This path is Ultra-only and
  already expensive; the cost is accepted. **Balanced/Env-map and the PT
  integrator are byte-for-byte unaffected.**
- The bound (Eto & Tokuyoshi 2024) reduces to the unbounded spherical cap when
  `k = 1`; its main benefit is fewer occluded samples on rough surfaces, where
  this path mostly does not operate (`uReflRoughnessCutoff` defaults to 0.62).
  It is retained as the SOTA-correct, no-downside form.
- Deferred: importance-sampled (stochastic) env-MIS at the reflection hit, and
  exposing the Firefly Clamp as a Direct-mode control — neither needed given
  the deterministic env fill and the default clamp.
