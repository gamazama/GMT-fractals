# ADR-0097: Per-direction fog radiance from the environment map (aerial perspective)

> **Update 2026-07-13 (env-lighting fog re-couples uEnvStrength AT THE APPLICATION SITE;
> decision unchanged):** Update #3 decoupled `fogRadiance` from `uEnvStrength` so the VISIBLE fog
> (background sky, primary + reflected distance fog) matches the sky even with the dome light
> dialed down — that stands. But `applyEnvFog` and the raymarched reflection env-fills use that
> same unscaled radiance to fog SURFACE IRRADIANCE, whose base is `sky * uEnvStrength`. With the
> dome dimmed/off, a little fog therefore re-injected the sky at FULL strength as ambient +
> reflected light — the fractal "lit up" as if an env light switched on (hard pop 0 → 0.1, owner
> repro). Fix: at the lighting sites only, mix toward `fogRadiance(dir) * uEnvStrength` (shading.ts
> `applyEnvFog`; reflections' new `reflFogLit = reflFogRad * uEnvStrength`). Fog now TINTS the
> received irradiance toward the fog colour without adding energy the dome never emitted; identical
> at `uEnvStrength 1`. `fogRadiance` itself is untouched, so every VISIBLE-fog term (the unscaled
> `reflFogRad` still drives the reflected-segment distance fog) renders exactly as before.

> **Update 2026-07-10 #5 (compile-cost pass; decision unchanged, one scoped approximation):**
> fxc inlines the `fogRadiance -> env-sample` chain at EVERY call site (~260ms cold each —
> §2.6.2 of the compile policy doc). Two changes: (1) `fogRadiance` now samples via
> `envSampleCore(dir, fogRough, baseFilter=false)` — the bicubic base filter DCEs out of fog
> instances (it was dead at runtime there anyway: fogRough ≥ 0.5 → lod ≥ 1 on any real map).
> (2) The RAYMARCHED REFLECTION block hoists ONE `fogRadiance(reflDir)` sample shared by all its
> fogged terms (segment fog, env fills, miss env, simpleEnv — 7 inlines → 1). Inside reflections
> the fog in-scatter direction is therefore the pixel's reflection direction rather than each
> term's own — sub-perceptual at the fog sample's max-blur lod. All PRIMARY-view fog terms
> (sky, Ambient IBL, light spheres, post fog) keep exact per-direction sampling; fog-off output
> is bit-exact (the hoisted weight replicates applyEnvFog's gate). the dial flipped.
> `fogEnvTint` ("Sky Tint", 0 = flat colour) became `fogTint` ("Fog Tint", uniform `uFogTint`):
> fog now follows the SKY per direction **by default** (`fogRadiance = mix(sky, fogColor, tint)`),
> and the dial blends toward the custom Fog Color — which nests UNDER the tint slider in the UI,
> revealed while tint > 0 (the colour appears exactly when something uses it). For SOLID skies the
> tint is hidden entirely (sky already equals the colour, the mix endpoints coincide) and the same
> param surfaces as 'Sky Color' at the top of Background & Sky (manifest `liftChildrenOf` +
> `labelOverrides`). Migration v6 pins pre-existing scenes to `fogTint 1` (their flat-colour look);
> new scenes default to aerial perspective.

> **Update 2026-07-10 #3 (final layout — 'one sky, three consumers'; decision unchanged):**
> `fogRadiance` DROPPED the `uEnvStrength` scaling: the tint follows the VISIBLE sky definition,
> not the env-light strength (a sunset backdrop with the dome light at 0 should still be matchable
> by the fog; the HDR knee bounds brightness). With the coupling gone, the param moved BACK to
> `atmosphere.fogEnvTint` ("Sky Tint", Fog group, gated on fog intensity only) — update #2's
> materials/env placement is superseded. Scene panel restructured into 'Background & Sky'
> (Background Color [atmosphere group `background`] → Sky Visibility → Environment Light → un-gated
> Source/Upload/Rotation) + 'Fog' (Intensity → Fog Range dual-thumb RangeSlider [new generic
> `rangePairWith` param pairing] → Sky Tint → Density).

> **Update 2026-07-10 #2 (owner UX pass + HDR fix; decision unchanged):** the param moved from
> `atmosphere.fogEnvTint` to `materials.fogEnvTint` ("Tint Fog"), nested under the env-light
> strength in the Environment group — it scales with `uEnvStrength`, so it belongs under the thing
> it follows (same-day move, no preset migration shipped). `fogRadiance` gained an HDR soft knee
> (the clampReflLum curve with t = 1, asymptote 2): blurred HDR sun regions still carry luminance
> 10–50+, and fog radiance multiplies into every fogged term, so bright domes blew the scene out
> with only a little tint. Related relabels: `fogColor` → "Background Color" (first in the Fog
> group, always visible), BG Visibility un-gated from env-light strength (the backdrop reads it
> independently).

> **Update 2026-07-10 (sampling corrected same day; decision unchanged):** `fogRadiance` no longer
> samples at roughness 1.0 — for image env maps GetEnvMap's terminal LOD blends to the
> direction-INDEPENDENT solid-angle average (the ADR-0069 avgMix window), so tinted fog came out
> one flat colour (owner repro; gradient/procedural skies were unaffected). It now samples the
> blurriest mip BELOW that window (`lod = uEnvMaxMip − 4`, i.e. `roughness = 1 − 4/uEnvMaxMip`,
> clamped [0.5, 1]) — maximally soft but still directional. The formula below reads
> `GetEnvMap(dir, 1.0)`; the shipped code uses this corrected roughness.

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Follows the fog-over-env consistency
pass (commit `ab472eb`); closes the biggest remaining gap between GMT's fog and the physical
model.

## Context

Physically, fog in-scatter is not a constant colour — it is the atmosphere *lit by the dome*:
roughly the heavily-blurred environment radiance in the viewing direction, brighter toward the
bright side of the sky. GMT used a single author-picked `uFogColorLinear` everywhere, so an HDR
sunset dome plus a flat gray fog visibly disagreed — the fog read as a separate substance rather
than the atmosphere of that sky. (The transmittance side — smoothstep ramps per segment — was
already consistent after `ab472eb`; only the in-scatter colour was flat.)

## Decision

One helper, `fogRadiance(dir)` in `shaders/chunks/lighting/env.ts` (beside `GetEnvMap`):

```
fogRadiance(dir) = mix(uFogColorLinear, GetEnvMap(dir, 1.0) * uEnvStrength, uFogEnvTint)
```

- `GetEnvMap(dir, 1.0)` is the max-blur sample — it rides the ADR-0069 blend to the
  solid-angle-correct average, so it is cheap (one low-mip lookup) and pole-safe. The env side
  scales with `uEnvStrength`: a dim dome lights dim fog.
- New runtime param `atmosphere.fogEnvTint` ("Sky Tint", 0–1, uniform `uFogEnvTint`,
  **default 0**): 0 is the legacy flat colour with an early-out (zero extra cost, no scene
  shifts); 1 derives the fog colour fully from the sky. No recompile — it's a uniform.
- Every fog in-scatter site now goes through it: the atmosphere post-process distance +
  volumetric-density fog (the `applyPostProcessing` seam gains `rd` — position-16 scope
  documented in ShaderBuilder), `applyEnvFog` (gains a `dir` param; all env-sample sites pass
  their sample direction), the primary miss background (`main.ts` bgCol — a fogged sky keeps its
  gradient instead of flattening), the reflected-segment fog, the light-sphere self-fog in
  `sampleMiss`, and the PT bounce-0 miss fog.
- NOT routed through it: PT's volumetric absorption add (`radiance += uFogColorLinear · (1−trans)`,
  deep PT internals) and PT env-NEE (unfogged by PT's own model) — unchanged, tracked as the
  PT fog gap.

## Consequences

- With Sky Tint up, fog gains aerial perspective: horizon haze picks up the sunset, fog brightens
  toward the sun side, and the "gray soup vs orange sky" mismatch disappears. At tint 0 every
  scene renders exactly as before.
- `applyEnvFog(env)` → `applyEnvFog(env, dir)` and `applyPostProcessing(col, d, …)` →
  `(col, d, rd, …)` are seam signature changes; each had all call sites updated in-tree
  (single caller for the latter). Position-16 injections may now read `rd`.
- Cost: `fogRadiance` early-outs at tint 0; at tint > 0 it adds one low-mip env lookup per
  fogged term — negligible next to the march.
- The fog colour can now legitimately be BRIGHT (a sun-side sky sample). Firefly clamps do not
  apply to fog terms; if a very bright HDR dome makes tinted fog bloom, the lever is the tint
  slider, not a clamp.
