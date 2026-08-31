# ADR-0069: Env reflection roughness-blur uses textureLod, not a LOD bias

**Date:** 2026-06-18
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/lighting/env.ts` (`GetEnvMap`), `engine/UniformNames.ts`, `engine-gmt/features/lighting/index.ts` (uniform schema), `engine-gmt/engine/MaterialController.ts` + `engine-gmt/engine/worker/renderWorker.ts` (env upload sites)

> **Update 2026-06-19 (solid-angle prefilter; the `-4` cap is now a fallback):**
> The deferred "proper prefilter" is implemented as a **correct-average blend**
> (the robust subset of approach A). `buildEnvCDF` now also returns the sinθ-
> weighted solid-angle average of the env (`avgColor`, raw texel space — the same
> extraction/weighting pass already used for the CDF); `MaterialController.rebuildEnvCDF`
> uploads it as `uEnvAvgColor`. `GetEnvMap` blends the box-mip sample toward
> `uEnvAvgColor` over the top LODs (`smoothstep(maxMip-4, maxMip, lod)`), so the
> rough/diffuse end converges to the honest solid-angle mean instead of the
> pole-biased, dark box-mip global average — and the LOD runs to the full
> `uEnvMaxMip`, no longer capped. The `-4` LOD cap survives only as the fallback
> when pixel extraction fails (`uEnvAvgColor.r < 0` sentinel). A full custom
> manual-mipmap chain (sinθ-weighted downsample per level) was deliberately NOT
> done — it needs finicky manual-mipmap upload (unverifiable without a GPU here)
> and heavy transient memory on large envs, for the same visible goal. That
> remains the only path to mid-range (not just top-end) box-mip correction if
> ever needed.

> **Update 2026-08-31 (minification term still absent; decision unchanged):** the
> Consequences bullet accepting the loss of derivative minification AA ("not
> meaningfully lost for env-at-infinity sampling") holds for slowly-varying normals
> and fails for a near-mirror over high-curvature geometry, where the reflected
> direction sweeps far per pixel and minification dominates. Owner reported hard
> stair-stepped mirror reflections. The visible cause turned out to be a SEPARATE
> defect in the near-base bicubic added 2026-07-10 — see ADR-0072's update of this
> date — now fixed. This ADR's own tradeoff is untouched: grep `envSampleCore` and
> the LOD is still `roughness * uEnvMaxMip` with no footprint term, so mirrors are
> sharp rather than footprint-filtered. Closing that means threading a pixel
> footprint through `GetEnvMap`, or supplying analytic gradients to `textureGrad`
> (which keeps LOD selection in fixed function and needs no screen-space
> derivatives — relevant because `calculateShading` runs inside `if (hit)`, where
> `fwidth` would be undefined). Deliberately deferred, not forgotten.

> **Update 2026-09-01 (the deferred minification term is implemented; decision
> unchanged):** the previous update said closing this needed a footprint threaded
> through `GetEnvMap` or analytic gradients. Implemented as the former, and as a
> LOD floor rather than `textureGrad`: grep `envConeLod`, which converts an
> angular cone into the equirect texel span it covers and returns the mip that
> filters it, and `g_envConeAngle`, the cone the reflection block publishes. The
> sample takes `max(roughness * uEnvMaxMip, envConeLod(...))` — roughness blur and
> minification are both claims about how wide the filter must be, and the wider
> wins. This keeps the single `textureLod` fetch this ADR chose; no SampleGrad.
>
> The cone comes from CURVATURE, not pixel size: `reflect()` doubles the normal's
> rate of change, so on a fractal mirror the reflected direction sweeps orders of
> magnitude faster than the pixel's own angular size (measured on the reporting
> scene: pixel angle 0.0017 rad contributes LOD 0.00, and the term only bites past
> ~0.002 rad of normal change per pixel). It is measured directly — re-estimate
> the normal one pixel-footprint along the surface and take |dn| — rather than via
> a Laplacian, because fractal DEs are Lipschitz bounds and not true SDFs. No
> screen-space derivatives are involved, which matters because `calculateShading`
> runs inside `if (hit)` where `fwidth` would be undefined at every silhouette.
>
> Costs one `GetNormal` = 4 DE taps, on a compile gate (`reflections.coneAA`,
> "Reflection Filtering") whose OFF form is byte-identical to the pre-feature
> source. Measured 0.5-0.7% of GPU time per draw on the reporting scene
> (`bench:shader`, d3d11). A probe render painting the pixels where the cone term
> wins shows it firing on thin high-curvature creases and ridges and nowhere else
> — the right target. Honest limit: on a 256-frame CONVERGED render of that scene
> the visible difference is near zero (mean |diff| 0.000/255, max 37 on a few
> hundred pixels), because accumulation jitter already anti-aliases much of it and
> the 2026-08-31 bicubic fix removed the gross artifact. The expected benefit is
> mostly in the UNCONVERGED preview, which a converged A/B cannot show. Guarded by
> `npm run test:env-sampling` blocks E and F.

> **Update 2026-09-01b (compile cost measured; coneAA now defaults OFF):** the
> update above quoted only RUNTIME cost. The compile cost was never measured and
> the param carried an invented `estCompileMs: 150`. Measured cold on d3d11 with
> the ANGLE shader disk cache disabled, median of 3 fresh browsers per variant:
> **8620ms off -> 9574ms on, +954ms (+11.1%)**. That is the expected shape — one
> `GetNormal` is 4 `DE_Dist` inlines, i.e. a whole new DE call site, and
> `accurateColors` costs 600ms for one. `estCompileMs` corrected to 950.
>
> Consequence: **coneAA defaults OFF.** A second of extra compile on every mode
> toggle is not worth a difference a converged render of the reference scene
> cannot show. The gate stays, the OFF form stays byte-identical, and anyone who
> wants it in the live preview can switch it on. Note `bench:shader` does NOT
> pass `--disable-gpu-shader-disk-cache`, so its own `compileTiming` can come back
> warm; use the launch args from `measure-direct-costmap.mts` for compile numbers.
>
> The cheap version, if this is ever wanted on by default: the tetrahedron
> `GetNormal` already evaluates the four DE taps whose SUM is the discrete
> Laplacian (first order cancels — the four tetrahedron offsets sum to zero), so
> curvature could come out of the existing call for ~free instead of a second
> one. It needs `getSurfaceMaterial` to emit curvature as an extra out, which
> touches the path-tracer's single-estimator arrangement (ADR-0075), and the
> Laplacian-to-curvature step assumes a true SDF where fractal DEs are only
> Lipschitz bounds. Not attempted; recorded so the option is not rediscovered.

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
