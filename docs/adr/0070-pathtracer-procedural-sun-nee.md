# ADR-0070: Path tracer importance-samples the procedural sky's sun (mixture NEE)

**Date:** 2026-06-18
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/pathtracer.ts` (`sampleEnvDirection` / `pdfEnvSample` / new `sampleProceduralEnv` / `pdfProceduralEnv`), `engine-gmt/shaders/chunks/lighting/env.ts` (`proceduralSunDir`)

## Context

The path tracer's environment NEE (`#ifdef PT_ENV_MIS`) samples the environment
as a direct light, MIS-paired with BSDF sampling. Its direction sampler
`sampleEnvDirection` had two modes:

- **`PT_ENV_MIS_IS`** — luminance-CDF importance sampling. Built CPU-side from
  the env texture (`env_cdf.buildEnvCDF`), so it exists **only for texture
  environments**.
- **otherwise** — uniform sphere, pdf `1/(4π)`.

The **procedural sky** therefore always fell to uniform-sphere sampling, even
though it contains a concentrated sun: `pow(dot(dir, sunDir), 100) * 0.8` at
`sunDir = normalize(vec3(1,4,2))` (`env.ts` procedural branch) — a ~7° bright
spot. Uniform-sphere NEE hits that cone <1% of the time, so the sun's
contribution to rough/diffuse surfaces was noisy (the bounce/BSDF ray catching
it is a lottery). The sun is only ~8× the surrounding sky, so this is noise, not
hard fireflies — but procedural sky is the no-upload default, so it matters for
the default look whenever Env MIS is enabled.

## Decision

Importance-sample the procedural sun with a **mixture** estimator, runtime-
selected when the env is procedural (`uEnvSource < 0.5 && uUseEnvMap < 0.5`):

- With probability `PROC_SUN_PROB` (0.5), sample a uniform cone of half-angle
  ~11° (`PROC_SUN_COS_MAX = 0.98`) around `proceduralSunDir()`; otherwise sample
  the uniform sphere.
- The returned pdf is the **full mixture density**
  `α·pdf_cone·[inside] + (1-α)·1/(4π)`, identical in `sampleProceduralEnv` and
  `pdfProceduralEnv`, so the existing env-vs-BSDF power-heuristic MIS stays
  exactly correct. The NEE block and its `clampByLuminance` are unchanged — only
  the sampling density improves; radiance still comes from `GetEnvMap`.
- `proceduralSunDir()` is added to `env.ts` and used by both the sky and the
  sampler — single source of truth for the sun direction (no drift).

The branch lives inside the existing `#ifdef PT_ENV_MIS` region (the sampler
functions are only compiled there), so there is **zero compile/runtime cost on
the Balanced profile or any non-PT shader**. No new compile gate and no new
uniform — the procedural-vs-texture test is a runtime read of existing uniforms,
mirroring `GetEnvMap` itself.

## Consequences

- Rough/diffuse surfaces under the procedural sky with Env MIS enabled converge
  noticeably cleaner; gradient sky (smooth, no sun) and texture env (CDF path)
  are unaffected — the runtime branch only fires for procedural.
- Engages only when **Env MIS** (`ptReflMode ≥ 1`) is on; default PT
  (`ptReflMode = Off`) has no env NEE and is unchanged. This is the correct
  scope — the fix belongs to the env-NEE estimator.
- The cone is fixed (~11°) to the sun's visible lobe; the uniform-sphere half of
  the mixture plus BSDF MIS cover the tail and the rest of the sky, so the
  estimator stays unbiased regardless of cone size.
- Texture envs keep the CDF path; this does not attempt to unify procedural and
  texture importance sampling.

## Follow-on (same session): cheaper env-NEE visibility ray

The env-NEE block tested occlusion by routing its shadow ray through
`tracePTBounce` → `traceSceneLean`, a full march that also computes color, trap,
glow and volumetric data the env-NEE immediately discards. Replaced with a
dedicated geometry-only any-hit march, `envVisibility` (marches `DE_Dist` alone,
early-outs at the first hit, returns true at `MAX_DIST`). Sphere-light occlusion
is preserved with an explicit `intersectAreaLight` test under `PT_AREA_LIGHTS`
(the env contribution is added only when *nothing* intercepts — geometry or
light). It is intentionally **not** `GetHardShadow` (that stubs to `1.0` when the
shadow feature isn't compiled, which would leak the environment through solid
geometry). Tradeoff: visibility now uses the shadow-march budget (`uShadowSteps`)
rather than the full trace's, matching how the engine tests occlusion elsewhere;
on budget exhaustion it returns visible, like `GetHardShadow`. The main bounce
ray still uses `tracePTBounce` (it needs the full shaded result).
