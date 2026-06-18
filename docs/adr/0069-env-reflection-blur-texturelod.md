# ADR-0069: Env reflection roughness-blur uses textureLod, not a LOD bias

**Date:** 2026-06-18
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/lighting/env.ts` (`GetEnvMap`), `engine/UniformNames.ts`, `engine-gmt/features/lighting/index.ts` (uniform schema), `engine-gmt/engine/MaterialController.ts` + `engine-gmt/engine/worker/renderWorker.ts` (env upload sites)

## Context

`GetEnvMap(dir, roughness)` blurred environment reflections by roughness using
the **LOD-bias** form of the texture fetch:

```glsl
float bias = roughness * 6.0;   // intent: up to 6 mip levels of blur
col = texture(uEnvMapTexture, uv, bias).rgb;
```

The third argument of `texture(sampler, uv, bias)` is a LOD *bias*, and the GPU
clamps it to `GL_MAX_TEXTURE_LOD_BIAS`. On ANGLE/D3D11 and many other drivers
that limit is **2.0**, so `roughness * 6` could never push the sample past ~2
mip levels regardless of roughness — rough reflections stayed visibly sharp.

The artifact was most obvious on **matte / metallic-off** surfaces: there the
Fresnel specular reflection is weak and the diffuse Ambient IBL term
(`GetEnvMap(n, 1.0)`, `shading.ts` step 7) dominates. That term wants a fully
blurred irradiance lookup (bias 6) but got clamped to ~2, so a near-sharp
environment was mapped by the surface normal onto a matte surface and read as a
wrong "sharp reflection." With metallic on, `kD → 0` suppresses the diffuse
ambient and the colored specular reflection (also under-blurred) looks like an
intended reflection, masking the bug.

The codebase already sidestepped the cap in one place: `sampleEnvAtCDFMip` uses
`textureLod` with an absolute LOD precisely because the bias form is
unreliable.

## Decision

Blur via an **absolute LOD** with `textureLod`, immune to the bias cap, with the
LOD held a few levels below the degenerate top mips:

```glsl
float maxBlurLod = max(0.0, uEnvMaxMip - 4.0);
float lod = roughness * maxBlurLod;
col = textureLod(uEnvMapTexture, uv, lod).rgb;
```

The `-4.0` cap exists because a box-filtered equirectangular mip chain collapses
to a **pole-biased global average** at its smallest mips — dark and
non-directional. Once `textureLod` actually reached those mips (the bias form
never could), it flattened and darkened the diffuse Ambient IBL
(`GetEnvMap(n, 1.0)`) on matte surfaces and pulled rough reflections toward that
dim mean. Stopping ~4 levels up (≈16 px) keeps even fully-rough samples
directional and energy-honest while still strongly blurred.

- New uniform `uEnvMaxMip = floor(log2(max(W, H)))` — the env's top mip level —
  set at all three env-upload sites (`MaterialController.loadTexture` main
  thread, `renderWorker` `TEXTURE` LDR and `TEXTURE_HDR` paths). Default 8.0 as
  a safe pre-load fallback; `textureLod` additionally auto-clamps the LOD to the
  texture's real max mip, so any unset path still degrades gracefully.
- Fixes every env consumer at once (it all routes through `GetEnvMap`): balanced
  env-map mode, the raymarched env fallback, the reflection env-fill (ADR-0068),
  and the PT env lookups. `roughness 0 → lod 0`, so sharp background / mirror
  reflections are unchanged. The gradient and procedural-sky branches don't use
  this texture path and are untouched.

## Consequences

- Rough env reflections (and the diffuse ambient) now blur correctly across the
  full roughness range on all drivers, independent of `GL_MAX_TEXTURE_LOD_BIAS`.
- `textureLod` ignores screen-space-derivative minification AA. Acceptable and
  standard for an environment treated as being at infinity (matches the IBL
  prefilter-LOD convention); the previous bias form's derivative AA is not
  meaningfully lost for env-at-infinity sampling.
- The roughness→LOD map is linear (`roughness * maxBlurLod`) over box-filtered
  mips, not a physically-derived GGX prefilter. The proper fix — which would
  also remove the `-4.0` cap — is a convolved/prefiltered env (split-sum IBL
  radiance mips + an irradiance map/SH for the diffuse ambient), generated once
  per env load. Deferred; the cap is the cheap, robust stand-in that keeps
  matte/rough surfaces honestly bright.
