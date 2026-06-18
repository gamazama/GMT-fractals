# ADR-0072: Sky background softens subtly with camera blur (additive mip-LOD)

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/main.ts` (Direct background), `engine-gmt/shaders/chunks/pathtracer.ts` (PT bounce-0 sky)

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
