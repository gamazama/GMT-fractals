# GMT's shading chunks as something a deferred pass could reuse

Reader: gmt-shading-chunks. Read-only pass, 2026-10-07. Nothing was compiled or run.
Paths are relative to the worktree `H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom/`.

## The short answer

Yes: the deep zoomer's shading pass can be assembled from GMT's own chunks, and that is the
right way to make the Light Studio, materials and environment drive it with GMT's uniforms.
About two thirds of what a pixel's colour depends on already needs only
(position, normal, view direction, albedo, roughness, depth). The pieces that march the
fractal again are already separate, named GLSL functions injected through builder slots, and
two of them (`GetAO`, `GetSoftShadow`) already ship with a constant stub variant - so the
"pluggable provider" seam half-exists.

Three things stand in the way, all in GMT's code, none of them deep-zoom-specific:

1. `calculateShading` fuses "find the surface" with "shade the surface" in one function.
2. Zoom-dependent thresholds and all absolute distances are computed inside the lighting code
   from the marcher's own uniforms, in f32 world units.
3. `ShaderBuilder.buildFragment` can only emit a whole marcher; there is no way to ask it for
   "the shading half only".

Today the page avoids all three by carrying a hand-copied twin of GMT's Blinn-Phong
(`mandelbulb_deepzoom/index.html` line ~1278, the comment reads "GMT's Direct shading,
Blinn-Phong variant (stable/engine-gmt/shaders/chunks/lighting: grep calculatePBRContribution,
calculateShading)"). In the historical page that is fine. In the shell's renderer module it is
a parallel copy of a GMT component, which the owner's standing rule forbids going forward.

## Facts, with file and symbol

### How the shader is assembled

- `engine-gmt/engine/ShaderBuilder.ts`, `buildFragment()` (the "VARIANT: MAIN" branch). The
  final string is, in order: `defines, uniforms, headers, math, BLUE_NOISE, COLORING, preambles,
  userFunctions, de, postDEFunctions, materialEval, missHandler, rayGLSL, traceGLSL,
  traceLeanGLSL, integrators, postGLSL, mainGLSL`. It is called from
  `engine-gmt/engine/ShaderFactory.ts` (`return builder.buildFragment();`).
- Features push text into slots. Read at the call sites:
  - `features/lighting/index.ts`: `builder.addPostDEFunction(getShadowsGLSL(shadowsCompiled))`,
    `builder.addIntegrator(useCookTorrance ? getLightingPBRFull(...) : getLightingPBRSimple(...))`,
    `builder.requestShading()`.
  - `features/ao/index.ts`: `builder.addPostDEFunction(getAOGLSL(enabled, stochastic, maxSamples))`,
    and when off `builder.addPostDEFunction('float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }')`.
  - `features/reflections/index.ts`: `builder.addShadingLogic(reflEnvShading(...))` or
    `builder.addPostDEFunction(getReflectionsGLSL(...))` + `builder.addShadingLogic(reflRaymarchShading(...))`.
  - `features/materials.ts`: `builder.addHeader(MAIN_HEADER)`, `builder.addMaterialLogic(MATERIAL_LOGIC)`,
    `builder.addFunction(LIGHTING_ENV)`.
  - `features/atmosphere/index.ts`: `builder.addPostProcessLogic(FOG_POST_PROCESS)`,
    `addPostProcessLogic(GLOW_POST_PROCESS)`, `addVolumeTracing(ATMOSPHERE_VOLUME_BODY, ...)`.
- `buildFragment` already has other variants (Physics, Histogram, Mesh are named in the file's
  comments and code). So "one more variant" is an existing pattern, not a new idea.
- Entry point per pixel: `shaders/chunks/main.ts`, `renderPixel` -> `traceScene(...)` ->
  `calculateShading(ro, rd, d, result, stochasticSeed)` -> `applyPostProcessing(col, d, rd, glow,
  volumetric, fogScatter)`.

### Group A - needs only surface inputs (no distance estimate)

| Function / block | Where | Signature and inputs |
|---|---|---|
| Blinn-Phong per light | `lighting/pbr.ts`, `getLightingPBRSimple` body | inside the light loop: `h = normalize(l + v)`, `spec = pow(NdotH, bpShininess) * bpSpecNorm`, `Lo += (diffuseTerm + specular * uSpecular) * radiance * NdotL`. Inputs: n, v, l, albedo, roughness, metallic; uniforms `uDiffuse`, `uSpecular`. |
| Cook-Torrance per light | `lighting/pbr.ts`, `getLightingPBRFull` body | GGX D, Smith G, `fresnelSchlick(HdotV, F0)`. Same inputs. |
| Light loop, attenuation | `lighting/pbr.ts`, `getLoopOpen` | `lVec = isDirectional ? uLightDir[i] : (uLightPos[i] - p)`; `att = 1.0 / (1.0 + uLightFalloff[i] * d2 + uLightFalloffType[i] * distToLight)`. Needs p only for point lights. Uniforms `uLightCount, uLightIntensity[], uLightType[], uLightDir[], uLightPos[], uLightColor[], uLightFalloff[], uLightFalloffType[], uLightShadows[]`. |
| Fresnel (surface) | `lighting/shading.ts`, `calculateShading` step 4 | `F = F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0)`; `F0 = mix(vec3(0.04), albedo, uReflection)`. |
| Fresnel (per light) | `lighting/shared.ts`, `vec3 fresnelSchlick(float cosTheta, vec3 F0)` | pure. |
| Env ambient (dome light) | `calculateShading` step 7 | `applyEnvFog(GetEnvMap(n, 1.0) * uEnvStrength, n)`, then `kD * albedo * envIrradiance * uDiffuse`. Inputs n, albedo, F. |
| Env reflection, default | `shading.ts` `reflectionBlock` fallback and `features/reflections/index.ts` `reflEnvShading(false)` | `applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir)`; `reflectionLighting = envColor * F * uSpecular`. Inputs n, v, roughness. |
| Env sampling | `lighting/env.ts`: `vec3 GetEnvMap(vec3 dir, float roughness)`, `vec3 envSampleCore(vec3 dir, float roughness, bool baseFilter)`, `vec3 fogRadiance(vec3 dir)` | direction only. Uniforms `uEnvSource, uEnvRotationMatrix, uEnvGradient, uEnvMapTexture, uUseEnvMap, uEnvMaxMip, uFogColorLinear, uFogTint`. |
| Rim | `calculateShading` step 6 | `pow(1.0 - NdotV, uRimExponent)`, `uRimColor * fresnelTerm * uRim`. |
| Emission | `features/materials.ts`, `MATERIAL_LOGIC` | `emission = emitSource * uEmission`; `emitSource` is albedo, `col1`, `col2`, layer-3 noise or `uEmissionColor` by `uEmissionMode`. Pure once the colours exist. |
| Roughness | same | `roughness = clamp(uRoughness, 0.02, 1.0)`. |
| AO tint | `calculateShading` step 8 | `finalColor *= mix(uAOColor, vec3(1.0), ao)`. Takes the AO number, does not care where it came from. |
| Distance fog | `features/atmosphere/index.ts`, `FOG_POST_PROCESS` | `fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity`; `col = mix(col, fogRadiance(rd), fogFactor)` when `d < MISS_DIST - 10.0`. Inputs depth and ray direction. |
| Background | `main.ts`, `renderPixel` | `mix(GetEnvMap(rd, skyBlur) * uEnvBackgroundStrength, fogRadiance(rd), clamp(uFogIntensity, 0.0, 1.0))`. Direction only. |
| Glow composite | `GLOW_POST_PROCESS` | `col += glow * uGlowIntensity`. Pure, but `glow` comes from group B. |

### Group B - calls the distance estimate again

| Function | Where | Signature | Distance-estimate calls |
|---|---|---|---|
| Normal | `chunks/material_eval.ts`, `vec3 GetNormal(vec3 p_ray, float eps)`, `vec3 GetFastNormal(vec3 p, float eps)` | called from `getSurfaceMaterial` | 4 x `DE_Dist` each. Direct mode uses `GetFastNormal(p_ray, eps * 1.5)`. |
| Soft shadow | `lighting/shadows.ts`, `float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise, float surfEps, float epsRate)` | called once per shadow-casting light from `calculatePBRContribution` | one `DE_Dist` per step, up to `uShadowSteps`, hard cap `MAX_SHADOW_STEPS = 512`. |
| Hard shadow | `lighting/shadows.ts`, `float GetHardShadow(vec3 ro, vec3 rd, float lightDist, float surfEps, float epsRate)` | path tracer only (file comment) | same loop. |
| AO | `features/ao/shader.ts`, `float GetAO(vec3 p_ray, vec3 n, float seed)` | called once from `calculateShading` step 3 | one `DE_Dist` per sample, `uAOSamples` up to `maxSamples` (default 32). |
| Raymarched reflection | `features/reflections/shader.ts`, `vec4 traceReflectionRay(vec3 ro, vec3 rd, float dPrimary, out float reflFade)` | from `reflRaymarchShading` | `DE_Dist(pos)` per step, an optional bisection `DE_Dist`, an optional full `map()` at the hit ("Accurate Colors"); then `getSurfaceMaterial` + `calculatePBRContribution` again at the hit. |
| Env reflection cone filter | `features/reflections/index.ts`, `reflEnvShading(true)` | optional | one extra `GetNormal` = 4 `DE_Dist`. |
| Glow and fog-density accumulation | `features/atmosphere/shader.ts`, `ATMOSPHERE_VOLUME_BODY` | runs per step inside `traceScene` | uses the march's own `h.x`; no extra calls, but it exists only while marching. |
| Path tracer | `chunks/pathtracer.ts`, `calculatePathTracedColor`, `tracePTBounce`, `envVisibility` | bodies not read | re-traces by construction. |

### Where the fusion is

`lighting/shading.ts`, `calculateShading`:

```glsl
vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
    ...
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, false);
    vec3 v = normalize(-rd);
    vec3 directLighting = calculatePBRContribution(p_ray, n, v, albedo, roughness, uReflection, stochasticSeed, true);
    float ao = GetAO(p_ray, n, stochasticSeed);
```

Everything after the `getSurfaceMaterial` line is "shade a surface I have been handed". The
line itself and the two above it are "work out the surface from a march result". A deferred
pass has the surface already and must skip exactly those three lines.

`chunks/material_eval.ts`, `getSurfaceMaterial(vec3 p_ray_in, vec3 p_fractal_in, vec4 result,
float d, out vec3 albedo, out vec3 n, out vec3 emission, out float roughness, bool highQuality)`
does three unrelated jobs in one body: the normal (group B), the colour
(`getMappingValue(uColorMode, p_fractal, result, n, uColorScale)` plus
`gmt_colorSpiral(p_fractal, uColorTwist, uColorTwistArms)` into `uGradientTexture`, then layer 2
and layer 3), and the injected emission/roughness. The emission code reads the locals `col1`,
`col2`, `noiseVal`, so it cannot be lifted out without those names.

### What assumes absolute f32 world positions or world-unit constants

All quoted from the files named.

1. Absolute position rebuilt in f32. `shading.ts`: `p_fractal = p_ray + uCameraPosition +
   uSceneOffsetLow + uSceneOffsetHigh`. Same sum in `pbr.ts` (`distFromFractalOrigin =
   length(p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh)`) and
   `reflections/shader.ts` (`worldOriginOffset`). An f32 sum is good to about 7 digits.
2. The precision floor. `chunks/math.ts`: `#define PRECISION_RATIO_HIGH 5.0e-7`. `pbr.ts`:
   `floatLimit = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH)`;
   `surfEps = max(orthoCam ? epsPerDist : epsPerDist * cameraDist, floatLimit)`. Near the
   Mandelbulb (|p| about 1) the floor is about 5e-7. That is correct for an f32 marcher and it
   is why GMT stops near 1e6. In a pass whose surface is 1e-77 away it would be 70 orders of
   magnitude too large. Same floor in `material_eval.ts` (`eps = max(floatLimit, visualLimit)`).
3. Hard floors below which f32 cannot go anyway: `cameraDist = max(1.0e-12, length(p))`,
   `1.0e-20`, `if (distToLight < 0.0001) continue;`, `dot(n, n) < 1.0e-20`. f32 itself bottoms
   out near 1e-38, so no world-unit quantity at depth 1e-77 can be passed as a float at all.
   The page already works around this: its depth is a log relative to the view scale.
4. Light positions. `pbr.ts`: `lVec = isDirectional ? uLightDir[i] : (uLightPos[i] - p)`, with
   `p` camera-local world units. `engine-gmt/engine/managers/UniformManager.ts` fills it with
   `this.virtualSpace.getLightShaderVector(effectivePos, l.fixed, cam, posArr[i])`. The default
   rig in `features/lighting/index.ts` is point lights at `(-2, 1, 2)`, `(2, -1, 1)`,
   `(0, -5, 2)`. Seen from a surface patch 1e-30 wide, every such light is a directional light
   whose direction never changes as you fly.
5. Falloff in world units: `att = 1.0 / (1.0 + uLightFalloff[i] * d2 + uLightFalloffType[i] * distToLight)`;
   `UniformManager.ts` packs `k = 99.0 / (range * range)`.
6. `#define DIR_LIGHT_DIST 100.0`, `#define MISS_DIST 1000.0`, `#define BOUNDING_RADIUS 400.0`
   (`chunks/math.ts`). Shadow rays stop at `t > lightDist`.
7. Fog: `smoothstep(uFogNear, uFogFar, d)` and the sentinel `uFogFar >= 1000.0` in `applyEnvFog`.
8. AO reach: `h = (0.1 + 0.125 * float(i)) * spread + jitterBias` - world units times a slider.
   This is not zoom-aware even in GMT today.
9. Bump: `vec2 e = vec2(0.01, 0.0); // Fixed-size finite difference step ... (world-space units)`
   and `noiseP = p_fractal * uLayer3Scale` (`material_eval.ts`).
10. Colour twist: `twist * log(max(length(p), 1.0e-3))` (`chunks/coloring.ts`, `gmt_colorSpiral`).
11. Marcher uniforms read inside lighting: `uPixelSizeBase, uPixelThreshold, uDetail,
    uInternalScale, uCamType, uFudgeFactor, uMb3dDEsub, uBlendFactor`.

What is already scale-free: the shadow march itself. Since ADR-0093 every constant in
`GetSoftShadow` is a multiple of the `surfEps` argument ("every constant in this march is in
multiples of surfEps"). The only scale-bound part is who computes `surfEps` - the caller,
from items 1, 2 and 11.

## Settling the question

**Can the deferred pass be built from GMT's chunks with pluggable providers?** Yes, in three
generic steps, each of which leaves GMT's emitted shader the same text or the same maths.

**R1. A shading entry point that takes surface inputs.** Split `calculateShading` at the
`getSurfaceMaterial` line. New function, same chunk:
`vec3 shadeSurface(vec3 p, vec3 n, vec3 v, vec3 albedo, vec3 emission, float roughness, float surfEps, float epsRate, float seed)`
holding today's steps 2 to 8. `calculateShading` keeps its signature and becomes "resolve the
surface, then call `shadeSurface`". Nothing about it names a renderer. GMT's reflection-hit
shading (`reflRaymarchShading`) and the path tracer can call the same entry later instead of
re-deriving it.

**R2. The footprint is an argument, not a computation inside lighting.** Move the
`surfEps` / `epsRateBase` block out of `calculatePBRContribution` into one small function
supplied by whoever found the surface (`surfaceFootprint(p, out surfEps, out epsRate)`); the
marcher's version is today's code verbatim, including `PRECISION_RATIO_HIGH`. Along with it,
state the contract in the chunk's JSDoc: shading runs in a camera-local frame whose unit is
chosen by the caller; `uLightPos`, falloff, fog near/far and AO reach are in that unit. In GMT
the unit is 1 world unit, so nothing changes. A depth-buffer caller picks "1 = the view
scale", which is exactly what the page's G-buffer already stores.

**R3. Providers by name, and a builder variant that emits only the shading half.**
`GetSoftShadow` and `GetAO` are already whole functions pushed through
`addPostDEFunction`, and both already have a second implementation (the `return 1.0` stubs).
The reflection block is already an injected string (`addShadingLogic`). What is missing is
only that `buildFragment` always emits `de`, `traceGLSL` and `mainGLSL` around them. Add a
variant in which the surface comes from a caller-supplied "surface source" block instead of
`traceScene` (the block fills p, n, v, albedo, emission, roughness, depth, hit), and `de` /
trace / ray chunks are not emitted. Then the visibility providers are whatever the assembler
registered: GMT's marched `GetSoftShadow` / `GetAO`, or screen-space ones reading a depth
texture with the same signatures. The page's `shadowed(ivec2 c, float Lc, vec3 rdC, vec3 n,
vec3 Ldir, float seed)` and `occlusion(c, g.x, rd, n)` (index.html ~1158-1191) are the
depth-buffer providers; they need a thin wrapper to GMT's signatures (pixel coordinate from
`gl_FragCoord`, depth texture as a global).

GMT gains from R3 too: a deferred or screen-space mode is the standard route to cheap
shadows/AO while navigating, and a G-buffer source is what a denoiser or relight-without-remarch
needs. None of that is required to justify the change, but it is why the change is generic.

**Will it look identical?** The lighting model, materials, environment, rim, emission and fog
colour will be the same code and the same uniforms, so yes for those. Shadows and AO will not
be pixel-identical to GMT's marched ones - depth-buffer versions cannot see occluders outside
the picture or behind the first surface. That is inherent, and the page already documents it
("a light behind a nearer surface, casts nothing").

**Risks to GMT.** (a) Shader compile time: this repo measures fxc inlining in hundreds of
milliseconds per call site (see the comments on `sampleMissEnvPre` and ADR-0075). Splitting a
function adds a call boundary. Mitigation: do the split as template composition so the Direct
build's emitted GLSL stays byte-identical where possible, and measure cold compile before and
after. (b) Any change to the order of float operations in `surfEps` shifts shadows by a hair;
keep the block verbatim. (c) Saved scenes are untouched - no parameter or uniform changes.

## Table

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Per-light BRDF (Blinn-Phong, Cook-Torrance) - `pbr.ts` loop bodies | n, v, l, albedo, roughness, metallic | AS-IS (once R1/R2 land) | none in the body | 0 | - |
| Light loop + shadow threshold - `calculatePBRContribution` | computes `surfEps` from marcher uniforms and the absolute f32 position; `PRECISION_RATIO_HIGH` floor | REWORK | R2: footprint (`surfEps`, `epsRate`) is supplied by the surface source; lighting stops reading camera/offset uniforms | 0.5 session | Gain: lighting no longer coupled to the marcher's precision model. Risk: shadow drift if the block is not moved verbatim |
| Shading entry - `calculateShading` | surface is found inside it (`getSurfaceMaterial`) | REWORK | R1: a shading entry point that takes surface inputs; `calculateShading` becomes resolve + call | 1 session incl. compile-time check | Gain: one entry reusable by reflection hits and PT. Risk: cold compile time |
| Fresnel, rim, AO tint, compose | n, v, albedo, roughness, uniforms | AS-IS | inside R1's function | 0 | - |
| Env ambient + default env reflection - `GetEnvMap`, `applyEnvFog`, `reflEnvShading(false)` | direction only; rotation is a 2x2 on xz (`uEnvRotationMatrix`), world Y is up | ADAPTER | the shell rotates n / reflDir into its own "up" frame (the fitted plane) before the call; no GMT change | 0.25 session in the shell | none |
| Environment textures and sky - `LIGHTING_ENV`, background in `renderPixel` | direction only | AS-IS | - | 0 | - |
| Soft shadow provider - `GetSoftShadow` | marches `DE_Dist`; already in `surfEps` multiples | ADAPTER (after R3) | a depth-buffer function with the same signature, registered instead of the marched one | 0.5 session in the renderer module | none |
| AO provider - `GetAO` | marches `DE_Dist`; reach in absolute units x `uAOSpread` | ADAPTER (after R3) | depth-buffer function with the same signature; reach read in the caller's unit (R2 contract) | 0.5 session in the renderer module | none |
| Provider seam + shading-only assembly - `ShaderBuilder.buildFragment` | always emits `de` + trace + `main` | REWORK | R3: a builder variant where the surface comes from a pluggable surface-source block and DE/trace chunks are omitted | 1-1.5 sessions | Gain: opens screen-space / G-buffer modes for GMT. Risk: a fourth variant to keep in step (the file already warns about three emit sites drifting) |
| Raymarched reflections - `traceReflectionRay`, `reflRaymarchShading` | re-marches and re-shades at the hit | NOT-NOW | applies when there is a second-ray provider (screen-space reflection, or a perturbation march along the reflected ray). Until then the env reflection block is used | - | - |
| Reflection cone filter - `reflEnvShading(true)` | one extra `GetNormal` (4 DE taps) | NOT-NOW | applies once a normal-difference from the G-buffer is offered as the curvature source | - | - |
| Normal - `GetNormal` / `GetFastNormal` | 4 `DE_Dist` taps | ADAPTER | the surface source supplies n (the G-buffer's packed normal); falls out of R1 | 0 | - |
| Albedo / colouring - `getSurfaceMaterial` colour part, `getMappingValue`, `gmt_colorSpiral` | `result` (trap, iteration, decomposition) and absolute `p_fractal` in f32 | ADAPTER for the gradient lookup (`uGradientTexture`, scale, offset, bias applied to the G-buffer's palette parameter); NOT-NOW for the other mapping modes, layer 2, twist | other modes apply when the G-buffer carries the values they read (trap, decomposition) and position-based modes get a position that survives f32 | 0.25 session adapter | none |
| Layer 3 noise and bump - `material_eval.ts` | `p_fractal * uLayer3Scale`, step `0.01` world units | NOT-NOW | applies when noise is evaluated in a caller-defined local frame (R2's unit) instead of absolute position | - | - |
| Emission, roughness - `MATERIAL_LOGIC` | reads locals `col1`, `col2`, `noiseVal` of `getSurfaceMaterial` | ADAPTER for modes "albedo" and "solid colour"; NOT-NOW for layer-based modes | the surface source declares the same locals or passes emission in (R1 signature already takes it) | small | none |
| Point lights, falloff, light spheres - `uLightPos`, `uLightFalloff`, `LIGHT_SPHERE_*` | positions and ranges in f32 world units, camera-local | ADAPTER | the shell feeds positions in the caller's unit (R2 contract): rig hung off the fitted plane, headlamp = GMT's `fixed` light. Absolute-world point lights degrade to directional by geometry, not by code | 0.5 session in the shell | none |
| Light uniform packing - `UniformManager.ts` (falloff coefficients, direction negate, `fixed`) | inline in the worker's uniform manager | REWORK (small) | lift the light-array packing into a pure exported function so any renderer fed by the lighting feature's state produces the same arrays | 0.5 session | Gain: one source of truth for light packing. Risk: low |
| Distance fog - `FOG_POST_PROCESS` | `uFogNear` / `uFogFar` world units; `MISS_DIST 1000`, `uFogFar >= 1000` sentinels | ADAPTER | depth handed over in the caller's unit; miss flagged by the surface source | small | none |
| Glow and density fog - `ATMOSPHERE_VOLUME_BODY` | accumulated per march step | NOT-NOW | applies when the first pass writes an accumulated glow / density channel into its G-buffer; the composite lines are then AS-IS | - | - |
| Volumetric scatter - `lighting/volumetric_scatter.ts` | not read; expected to march | NOT-NOW | same condition as glow | - | - |
| Path tracer - `pathtracer.ts` | re-traces every bounce | NOT-NOW | needs a ray-cast provider against the deep surface | - | - |

Total GMT-side rework (R1 + R2 + R3 + light packing): about 3 to 3.5 sessions, plus one
session of compile-time and visual A/B on GMT itself. Shell/renderer-side adapters: about 2
sessions. The order that keeps GMT safe: R2, then R1, then light packing, then R3.

## Unverified

- `engine-gmt/shaders/chunks/coloring.ts` body of `getMappingValue` (only the prototype and
  `gmt_colorSpiral` lines were read): which modes need only the iteration value is unverified.
- `engine-gmt/shaders/chunks/trace.ts`, `ray.ts`, `de.ts`, `pathtracer.ts`,
  `lighting/volumetric_scatter.ts`, `features/lighting/light_spheres.ts`: bodies not opened.
- `reflRaymarchShading` beyond its first lines; `getReflectionsGLSL` only by grep.
- `VirtualSpace.getLightShaderVector`: only its call site in `UniformManager.ts` was read;
  that it returns camera-local positions is inferred from the `pbr.ts` comment "p is
  camera-local".
- How separable `UniformManager` and the uniform schema (`UniformSchema.ts`, `UniformNames.ts`)
  are from `FractalEngine` and the worker: not read. If the shell cannot reuse them, feeding
  GMT's uniforms to a second GL context is extra adapter work not sized above.
- The other `buildFragment` variants (Physics / Histogram / Mesh): seen by name only.
- Compile-time effect of R1 on fxc/ANGLE: not measured (no builds allowed in this job).
- The page's shading pass: lines ~1158-1300 skimmed, not read in full; the claim that its
  `shadowed` / `occlusion` can be wrapped to GMT's signatures is a design judgement.
- `plans/deep-zoom-shell/BLUEPRINT.md`: only grepped (no mention of Light Studio or chunks found).
