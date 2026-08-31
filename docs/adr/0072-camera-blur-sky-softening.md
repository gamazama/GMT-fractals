# ADR-0072: Sky background softens subtly with camera blur (additive mip-LOD)

> **Update 2026-07-10 (curve strengthened; mechanism unchanged):** the "capped to stay subtle"
> `min(0.4, sqrt(strength)·0.35)` curve was calibrated before the aperture slider's practical range
> was understood — it's a LOG slider used at 0.001–0.1, where sqrt yields lod < 0.5 (invisible).
> Owner verdict: camera blur must blur the background MEANINGFULLY. Both sites now use
> `min(0.85, strength^0.25 · 0.9)` (0.005 → lod ≈ 2.4, 0.05 → ≈ 4.3, 1.0 → ≈ 8.5). The additive
> mip-LOD mechanism, jittered-ray grain rationale, and bounce-0-only PT scope all stand. Related
> same-day fixes that made ANY sky blur visible on HDR maps: DataTexture magFilter was Nearest
> (blocky base), and GetEnvMap gained a 4-tap bicubic base filter + Repeat wrapS for low-res
> equirects.

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/main.ts` (Direct background), `engine-gmt/shaders/chunks/pathtracer.ts` (PT bounce-0 sky)

> **Update 2026-08-31 (bicubic taps must be explicit-LOD; decision unchanged):** the
> 4-tap bicubic base filter named at the end of the 2026-07-10 update fetched with
> `texture()` — implicit, derivative-selected LOD — on a MIPMAPPED env texture. Its
> tap coordinates c0/c1 jump +0.8 texels at every base-texel boundary: the Sigg &
> Hadwiger construction keeps the RESULT continuous through compensating g0/g1
> weights, not the coordinates. The hardware read that saw-tooth as its
> minification estimate — about 2.4 mips of LOD noise, quantised to 2x2 quads.
> Owner reported it 2026-08-31 as hard stair-stepped edges in mirror reflections;
> it also produced a 2px band of flat average colour along the equirect seam, where
> `atan` wraps and the derivative saturates. Taps now use `textureLod(..., 0.0)`,
> which is what this filter's header comment always claimed it did. Measured cost
> on the reporting scene: 0.04% of GPU time per draw, smaller than the spread
> between two runs of the same build (`bench:shader` A/B on d3d11, branch proven
> live by a magenta canary). Note also that the gate `lod < 1` is a ROUGHNESS test
> carrying no pixel footprint, so it fires on near-mirror reflections — the
> maximally MINIFIED case, not the magnified one this filter targets. That is
> recorded as an @assumption in `npm run test:env-sampling`, which guards the taps.

## Context

Camera blur is thin-lens DoF via stochastic aperture jitter on the camera ray
(`ray.ts`). The background sky was sampled sharp (`GetEnvMap(rd, 0.0)`) along the
jittered direction, so the only sky softening came from jitter averaging across
accumulation frames — geometrically tiny for a point at infinity
(≈ `uDOFStrength/uDOFFocus`) and grainy. Result: the sky stayed effectively sharp
while the fractal defocused.

We now have a prefiltered env mip chain + `textureLod` (ADR-0069), so the sky can
be blurred analytically by selecting a mip level — one sample, no extra rays, no
accumulation.

## Decision

Default-on: soften the **primary-ray** sky with a small mip-LOD blur scaled by the
DoF aperture, **added on top of** the existing aperture-jittered sample (not a
replacement):

```glsl
float skyBlur = min(0.4, sqrt(uDOFStrength) * 0.35);
// Direct:  GetEnvMap(rd, skyBlur)
// PT b0:   sampleMiss(currentRo, currentRd, skyBlur)
```

- Uses the **jittered** `rd` (not `rdClean`), so the sky keeps the same grain as
  the fractal's DoF rather than reading as an artificially clean plate — a clean
  analytic-only sky looked wrong against the noisy fractal defocus.
- `sqrt` makes modest apertures responsive ("sensitive to camera blur"); the
  `0.4` cap keeps it subtle.
- `uDOFStrength == 0` → `skyBlur == 0` → no change, so this only engages when
  Camera Blur is in use. No new uniform/control — it's a built-in default;
  promote to a slider later if tuning is wanted.
- Applies only to the directly-seen background (Direct miss; PT bounce-0 miss).
  Indirect bounce-miss env and sky *reflections* are unaffected (those already
  blur by surface roughness through the same chain).

## Consequences

- The sky now defocuses with the camera, performantly (one extra `textureLod`),
  while retaining noise character consistent with the fractal's DoF.
- Heuristic, not a physically-exact CoC: the `sqrt`/`0.35`/`0.4` curve is an
  artistic default. The physically-tied form would divide by `uDOFFocus`; that
  was dropped for predictability and stronger sensitivity. The constants are a
  one-line tune / future slider.
