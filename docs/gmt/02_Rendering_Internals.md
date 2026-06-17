
# Rendering Internals
> Last updated: 2026-04-08 | GMT v0.9.1

GMT uses a Fullscreen Quad Raymarcher. There is no traditional geometry; the entire scene is a mathematical volume rendered on two triangles covering the screen.

## 1. Coordinate Precision (The Treadmill)

Standard 32-bit floats (`float32`) have 7 digits of precision. This limits zoom to about $10^5$. Fractals require $10^{15}$.

**Solution: Split-Float Emulation (Double-Double)**
*   **VirtualSpace:** We represent the "World Origin" using two floats: `High` (Integer) + `Low` (Fractional).
*   **The Treadmill:** The camera never moves far from $(0,0,0)$ in actual GLSL space. Instead, we move the *Fractal Formula* in the opposite direction using the high-precision offset.
*   **Math:** `shaders/chunks/math.ts` provides `applyPrecisionOffset()` to reconstruct absolute fractal space position from split-precision context. The CPU-side `VirtualSpace` class in `engine/PrecisionMath.ts` handles coordinate splitting and normalization.

## 2. Rendering Modes

### A. Direct Rendering (SDF)
*   **Technique:** Sphere Tracing.
*   **Lighting:** Cook-Torrance PBR (GGX distribution + Smith-GGX geometry + Schlick Fresnel) with Soft Shadows (SDF-based). Single-bounce reflection tracing with roughness-gated cutoff.
*   **Performance:** 60 FPS.
*   **Use Case:** Exploration, Animation, Editing.

### B. Path Tracing (Monte Carlo)
*   **Technique:** Unidirectional Path Tracing with Next Event Estimation (NEE).
*   **Lighting:** Global Illumination, Area Lights, Emissive Geometry.
*   **Performance:** Iterative. Renders noisy frames that accumulate over time.
*   **Use Case:** High-quality stills, Photorealism.

## 2.1 Visible Light Spheres

Lights can optionally be rendered as physical emissive spheres visible in the viewport (both Direct and Path Tracing modes). Controlled per-light via the **Sphere Radius** and **Edge Softness** sliders in the Light panel.

### Sphere Intersection

Light spheres are a **compile-time feature** (`lightSpheres` param, `onUpdate: 'compile'`, ~150ms). When enabled, the `LIGHT_SPHERES` define is set and all sphere GLSL is injected via DDFS — no light sphere code exists in core shader files.

`intersectLightSphere(ro, rd, radiusJitter)` in `shaders/chunks/lighting/shared.ts` tests a ray against all active point lights with `radius > 0`. Returns `vec3(fade, lightIndex, insideFlag)`.

**Chord-based thickness** — uses actual ray-sphere intersection, not perpendicular distance. The chord length through the sphere determines opacity: rays through the center are brightest, edges taper naturally in 3D.

**Softness curve** — `pow(thickness, 0.15 + soft * 1.4)`:
- `softness = 0`: solid orb, sharp edge (exponent 0.15 flattens brightness).
- `softness = 0-1`: edge gradient widens inward, sphere size stays at radius `r`.
- `softness > 1`: halo extends beyond `r` with energy conservation (`fade *= r/testR`) so it reads as "softer" not "bigger".

**Inside-sphere behavior** — when the camera enters the sphere, the view is tinted with the light color (60% max blend, Hermite S-curve falloff).

**Stochastic AA** — primary ray compositing (`compositeLightSpheres`) jitters the radius ±2% per frame using `stochasticSeed`. Disabled during navigation (`uBlendFactor >= 0.99`). Accumulation averages into smooth anti-aliased edges.

### DDFS Injection (satellite feature)

Light spheres are a **satellite feature** (`features/lighting/light_spheres.ts`) with `dependsOn: ['lighting']`. All GLSL is self-contained — zero sphere code exists in core shader files. The feature depends on Lighting's uniform arrays (`uLightPos`, `uLightColor`, etc.) and per-light UI controls (radius/softness sliders embedded in `LightControls.tsx`).

| GLSL Constant | Injection Hook | Purpose |
|--------------|----------------|---------|
| `LIGHT_SPHERE_INTERSECTION_GLSL` | `addPostDEFunction()` | `intersectLightSphere()` definition |
| `getLightSphereCompositeGLSL()` | `addIntegrator()` | `compositeLightSpheres()` for primary ray depth compositing |
| `LIGHT_SPHERE_MISS_GLSL` | `addMissLogic()` | Override env map with sphere color on ray miss |
| call site string | `addCompositeLogic()` | Invokes composite in `renderPixel()` |

### Key Files

| File | Role |
|------|------|
| `features/lighting/light_spheres.ts` | DDFS satellite feature definition + `lightSpheres` compile-time param |
| `shaders/chunks/lighting/shared.ts` | All light sphere GLSL (intersection, miss, composite) |
| `features/lighting/components/LightControls.tsx` | Sphere Radius / Edge Softness sliders |
| `engine/UniformNames.ts` | `LightRadius`, `LightSoftness` uniforms |

### Parameters

| Param | Uniform | Notes |
|-------|---------|-------|
| Light Spheres | compile-time | Engine panel toggle, default on, ~150ms compile cost |
| Sphere Radius | `uLightRadius[i]` | 0 = light is invisible. Slider: 0.001–1.0 |
| Edge Softness | `uLightSoftness[i]` | 0 = hard edge, 0-1 = gradient inward, >1 = halo with energy conservation |

## 2.2 Direct Lighting Pipeline

The direct renderer's shading pipeline (`shaders/chunks/lighting/shading.ts`) evaluates per-pixel:

### PBR Specular Model (`shaders/chunks/lighting/pbr.ts`)

Uses full Cook-Torrance microfacet BRDF:
- **Distribution (D):** GGX / Trowbridge-Reitz — tighter highlight core with natural long tail.
- **Geometry (G):** Schlick-GGX (`k = a/2`) — consistent across Direct and Path Tracing modes.
- **Fresnel (F):** `fresnelSchlick()` from shared helpers — per-light using `HdotV`.
- **NdotV** is hoisted outside the light loop (constant per-pixel).

### Reflection Tracing (`features/reflections/`)

Reflections are a fully self-contained DDFS feature. Two modes are available:

- **Environment Map** (default): Fresnel-weighted env sampling with fog. Zero extra shader cost.
- **Raymarched (Quality)**: Single-bounce raymarched reflections. ~7-9s compile time.

All reflection evaluation GLSL is owned by `features/reflections/index.ts` and injected into `calculateShading()` via `builder.addShadingLogic()`. The trace function (`traceReflectionRay`) is injected via `addPostDEFunction()`. Zero reflection code exists in core shader files — `shading.ts` provides a `${reflectionBlock}` injection point with a simple env-map fallback when no feature injects.

**Deferred generation pattern:** Lighting calls `builder.requestShading()` (not `getShadingGLSL()` directly). Reflections, registered later, calls `builder.addShadingLogic()`. In `buildFragment()`, the collected shading logic is passed to `getShadingGLSL(reflectionCode)` which generates the final `calculateShading()` function.

#### Raymarched mode details:

1. **Adaptive bias:** Reflection ray origin offset scales with `pixelSizeScale * cameraDist` where `cameraDist = length(p_ray)` (camera-to-point distance in camera-local space). This ensures the bias reflects the actual pixel footprint regardless of how far the reflection ray traveled. Previously used `pixelSizeScale * d` (reflection travel distance), which collapsed the bias for close hits in concave geometry.
2. **Roughness jitter:** Blue noise (B/A/R channels) jitters the reflection ray proportional to roughness. Skipped when camera is moving (`uBlendFactor >= 0.99`).
3. **Roughness cutoff:** `uReflRoughnessCutoff` (default 0.62) skips the trace for rough surfaces — falls back to env map lookup.
4. **Throughput early-out:** `dot(F * uSpecular, ...) < 0.01` skips the trace when Fresnel contribution is negligible.
5. **Normal orientation:** `if (dot(r_n, -currRd) < 0.0) r_n = -r_n` — flips the SDF gradient normal to face the incoming reflection ray, fixing back-face lighting in concave fractal geometry.
6. **Bounce shadows:** When enabled (`REFL_BOUNCE_SHADOWS` define), shadows are always computed on reflected surfaces for visual consistency between navigation and accumulation.
7. **Hit refinement:** On hit, the tracer retreats by `d * 0.5` before evaluating full orbit traps, reducing color noise at glancing angles.
8. **Miss path:** `sampleMissEnv()` calls the builder-generated `sampleMiss()` (which includes any feature-injected miss logic, e.g. light spheres), then applies env fog.
9. **Raymarch Mix:** `uReflStrength` blends between raymarched reflections (1.0) and simple env map lookup (0.0). Both paths use matched Fresnel weighting.

### Fresnel — Two Variants

The codebase uses two intentionally different Schlick formulas:
- **Per-light (shared.ts → pbr.ts, pathtracer.ts):** `fresnelSchlick(cosTheta, F0)` = `F0 + (1-F0) * pow(1-cosTheta, 5)` — standard Schlick, defined once in `shaders/chunks/lighting/shared.ts` and used by all integrators.
- **Reflection throughput (shading.ts):** `F0 + (max(1-roughness, F0) - F0) * pow(1-NdotV, 5)` — Schlick-Roughness, which clamps grazing Fresnel so rough surfaces don't produce unrealistically strong reflections. Intentionally inline (not shared) because it uses a different formula.

### Fog System

Fog color is pre-linearized on the CPU as `uFogColorLinear` (InverseACESFilm applied once per frame in `UniformManager.ts`), eliminating a per-pixel quadratic solve (`sqrt` + clamp) at every fog evaluation.

Two fog helpers in `shading.ts` (both gated by `uFogIntensity < 0.001` early-out):
- `applyEnvFog(env)` — treats environment as at infinity; blends toward `uFogColorLinear` proportional to `uFogIntensity`.
- `applyDistanceFog(col, dist)` — distance-based smoothstep scaled by `uFogIntensity`.

Reflection hits do **not** apply their own fog — `applyPostProcessing()` applies a single primary-distance fog pass to the composed pixel, avoiding double-fogging.

All fog, glow, and volumetric scatter compositing is feature-injected into `applyPostProcessing()` via `addPostProcessLogic()`. The `post.ts` core file is a minimal shell — Atmosphere injects fog + glow, Volumetric injects scatter. Registration order controls execution order.

### Key Files

| File | Role |
|------|------|
| `shaders/chunks/lighting/shared.ts` | `buildTangentBasis()`, `fresnelSchlick()` — shared helpers; light sphere GLSL (feature-injected) |
| `shaders/chunks/lighting/pbr.ts` | Cook-Torrance PBR with GGX + Schlick-GGX |
| `shaders/chunks/lighting/shading.ts` | Direct lighting integrator (`calculateShading`), fog helpers, `${reflectionBlock}` injection point |
| `features/reflections/index.ts` | DDFS definition + all reflection evaluation GLSL (env map, raymarched modes) |
| `features/reflections/shader.ts` | `traceReflectionRay()` — lightweight SDF marcher with hit refinement |
| `engine/UniformNames.ts` | `uFogColorLinear` derived uniform |
| `engine/managers/UniformManager.ts` | CPU-side InverseACESFilm derivation |

## 2.3 Path Tracer Quality Modes

Four compile-time options in the `LightingFeature` / `EngineSettingsFeature` control PT quality vs cost trade-offs. All are `onUpdate: 'compile'` — toggling any one triggers a full shader rebuild.

### PT_NEE_ALL_LIGHTS (`ptNEEAllLights`)

**Default off.** By default the PT bounce loop samples one randomly-chosen active light per bounce (standard stochastic NEE). When this define is set, **every active light** is evaluated per bounce.

- Trade-off: N× more shadow rays per bounce (N = active light count), but shadow noise on all lights converges in parallel rather than accumulating independently.
- Best for: scenes with 2-3 lights where per-light shadow quality matters more than raw frame rate.

### PT_ENV_NEE (`ptEnvNEE`)

**Default off.** Adds a direct-sample of the environment map as an additional NEE contributor each bounce. One extra `traceSceneLean` call is issued per bounce to shadow-test the env sample.

- Large noise reduction for open, sky-dominated scenes.
- Cost: +1 shadow trace per bounce (lean variant, no volume accumulation).

### PT_VOLUMETRIC (`ptVolumetric`)

**Default off.** Replaces absorption-only fog in the PT bounce loop with Henyey-Greenstein single-scatter volumetric lighting. Injected via `builder.addVolumeTracing(VOLUMETRIC_SCATTER_BODY)` in `features/lighting/index.ts`.

See **Section 2.6** for full technical details.

### Firefly Clamp (`ptMaxLuminance`)

**Uniform `uPTMaxLuminance`, default 10.0.** Per-sample luminance is clamped to this value before accumulation. Suppresses bright firefly spikes caused by high-variance paths (e.g., very small solid-angle lights or caustic-like geometry). Lower values are cleaner but introduce slight bias; raise toward 200 to effectively disable clamping.

### Rim Light — Bounce 0 Only

The rim-light contribution (`uRim * pow(1 - NdotV, uRimExponent)`) is now guarded by `if (bounce == 0)`. Prior to this fix, rim light was added on every bounce, causing incorrectly bright rim halos in indirect lighting paths (visible as light-colored fringing on reflective surfaces).

### Lean Bounce Tracer (`traceSceneLean`)

In PT mode, the shader emits a second `traceSceneLean()` function alongside the full `traceScene()`. The lean variant is generated by `getTraceGLSL()` with empty volume body/finalize code and a custom `functionName` parameter. Bounce rays and env NEE visibility tests call `traceSceneLean()`, skipping per-step volume accumulation (density sampling, glow, scatter) that would be discarded anyway. The primary camera ray still uses the full `traceScene()`.

### Bounce Bias (Self-Intersection Avoidance)

The bounce origin is offset along the surface normal by `biasEps * 2.0` to prevent self-intersection. `biasEps` is computed using the **camera-to-point distance** (`length(p_ray)`, where `p_ray` is in camera-local space), not the bounce ray's travel distance `d`.

This is critical for fractals: bounce rays in concave regions often hit nearby geometry (small `d`). If the bias scaled with `d`, it would collapse for close hits, causing cascading self-intersection on subsequent bounces (visible as black patches in concave areas). Using camera distance ensures the bias matches the pixel footprint at that depth — consistent with Mandelbulber's `CalcDistThresh` approach.

The same principle applies to direct-mode reflections (`features/reflections/index.ts`) and to the `d` parameter passed to `getSurfaceMaterial()` for reflected hits (controls normal epsilon).

### PT_AREA_LIGHTS (`ptAreaLights`)

**Default off.** Compile-gates the new sphere-area-light integration path. When on:

- **NEE samples a point on the sphere surface** (uniform area sampling, Marsaglia 1972) instead of treating the light as a delta point. The sample direction `lDir` and `distToLight` go to the sampled surface point, and the per-direction PDF (`pdfSphereLightDir` — solid-angle measure, with `activeCount` selection-probability divisor folded in) replaces the delta-light `activeCount` compensation factor.
- **Bounce rays test against sphere lights via `tracePTBounce`**, a wrapper around `traceSceneLean` that runs `intersectAreaLight` alongside the fractal march and returns the closer hit. When the bounce lands on a sphere light, the next iter's `!hit` branch reads `lightHit >= 0` and adds the light's emission via the BSDF estimator.
- **MIS combines both estimators** with Veach 1995 power-heuristic (β=2) via the `misPower2(pdfA, pdfB)` helper. NEE-side weight uses `pdfSphereLightDir` and `pdfBSDF`; BSDF-side weight reads previous-bounce surface state (`n_prev`/`viewDir_prev`/`roughness_prev`/`probSpec_prev`, captured before each bounce trace) to evaluate the BSDF PDF at the direction now hitting the light. Delta lights (Point, Directional) collapse to `w_nee = 1, w_bsdf = 0` automatically — no special-casing.
- **Shadow path forks for sphere lights.** `GetHardShadow(shadowRo, lDir, distToLight)` is forced for type-2 lights regardless of `ptStochasticShadows`/`areaLights` settings — accumulation across frames produces the correct soft shadow from sphere sampling alone. Skipping this would either double-soften (`GetSoftShadow` adds penumbra on top of sphere sampling) or defeat sphere sampling (the stochastic-jitter path overwrites `lDir` with a `uLightPos`-relative target). Runtime branch is gated by `PT_AREA_LIGHTS` so default builds still emit only one shadow path.
- **env-NEE call site uses `tracePTBounce` too** so a sphere light correctly occludes the env visibility ray. Sky contribution is gated on `!envHit && envLightHit < 0`.

#### Helpers (all in `shaders/chunks/pathtracer.ts`)

| Helper | Purpose |
|--------|---------|
| `intersectAreaLight(ro, rd, tMax, out outIdx)` | Closest-hit test against type-2 lights; reuses `intersectSphere` from `math.ts` |
| `pdfSphereLightDir(lDir, sphereOutNormal, dist, radius, activeCount)` | Solid-angle PDF for uniform-area sphere sampling; activeCount divides out selection-probability |
| `pdfVNDF(n, v, l, roughness)` | Heitz 2018 §3 eq. 17 — VNDF half-vector PDF in solid-angle measure for arbitrary L |
| `pdfBSDF(n, v, l, roughness, probSpec)` | Mixture density combining VNDF specular lobe + cosine-weighted diffuse lobe; **must** match the bounce-direction sampler |
| `misPower2(pdfA, pdfB)` | Veach 1995 power-heuristic, β=2 |
| `tracePTBounce(...)` | Bounce-ray trace that also tests sphere area lights; returns `lightHit >= 0` if a light is closer than the fractal hit |

#### State carried across bounce iterations

Function-scope declarations (above the bounce loop) so the next iter's `!hit` branch can read what the previous iter's trace saw:

- `lightHit: int = -1`
- `n_prev: vec3`, `viewDir_prev: vec3`, `roughness_prev: float`, `probSpec_prev: float` — surface state from the bounce that *emitted* the current ray, needed for the BSDF-side MIS weight
- `activeCount: int`, `activeIndices: int[3]` — loop-invariant, hoisted out of the bounce loop (depends only on uniforms)

#### Compile-gate behavior

- `ptAreaLights = false` (default): `#ifdef PT_AREA_LIGHTS` regions are stripped at GPU compile. `tracePTBounce` becomes a passthrough to `traceSceneLean`. Default builds are bit-identical to before this feature landed.
- `ptAreaLights = true`: emits `intersectAreaLight`, `pdfSphereLightDir`, the type-2 NEE branch, the BSDF-side emission branch, the sphere-light shadow override, and the MIS weights. ~600 ms compile cost. Per-bounce GPU cost scales with sphere-light count; default 3-light scenes pay only what's used.

#### Direct mode behavior

Sphere lights in Direct (non-PT) mode fall through to the Point-light branch in `pbr.ts` and `volumetric_scatter.ts` — they integrate as a Point at the sphere center. The visible emitter still renders. The per-light popover surfaces an amber warning when type=Sphere is set without PT mode + ptAreaLights both on.

### Key Files

| File | Role |
|------|------|
| `features/lighting/index.ts` | Defines and injects `PT_NEE_ALL_LIGHTS`, `PT_ENV_NEE`, `PT_VOLUMETRIC`, `PT_AREA_LIGHTS` defines; injects `LIGHTING_SHARED` |
| `shaders/chunks/pathtracer.ts` | Compile-gated branches for each define; sphere-light NEE / BSDF / MIS; calls `traceSceneLean` (or `tracePTBounce` wrapper when `PT_AREA_LIGHTS`) for bounces |
| `shaders/chunks/lighting/shared.ts` | Visible emitter render (`intersectLightSphere`); type-2 included, gated on `uLightHideEmitter` |
| `shaders/chunks/lighting/pbr.ts` | Direct-mode shading; Sphere lights treated as Point at sphere center |
| `shaders/chunks/lighting/volumetric_scatter.ts` | God-ray scatter; same Sphere-as-Point fall-through |
| `shaders/chunks/trace.ts` | `getTraceGLSL()` — parameterized `functionName` for lean variant |
| `engine/ShaderBuilder.ts` | Emits `traceSceneLean` alongside `traceScene` in PT mode |
| `engine/managers/UniformManager.ts` | Writes `uLightType[i] = 2.0` for Sphere; writes `uLightHideEmitter[i]` |
| `engine/UniformSchema.ts` | `uPTMaxLuminance`, `uLightHideEmitter` uniform definitions |

## 2.6 Volumetric Scatter (God Rays)

> Significantly revised 2026-05-03. Earlier text referenced `uFogDensity` /
> `uPTFogG` / `uFogEmissiveStrength` from the pre-extraction GMT codebase; the
> engine-gmt fork uses dedicated `uVol*` uniforms owned by
> `features/volumetric/`. This section reflects the current implementation.

Primary-ray single-scatter volumetric lighting. Injected into `traceScene`'s
march loop via `builder.addVolumeTracing()`. Active in both Direct and Path
Tracing modes. UI panel: **Volumetric Scatter** in the engine settings group.

### Architecture

The feature is a self-contained DDFS module at
[engine-gmt/features/volumetric/](../../engine-gmt/features/volumetric/) plus
the GLSL body at
[engine-gmt/shaders/chunks/lighting/volumetric_scatter.ts](../../engine-gmt/shaders/chunks/lighting/volumetric_scatter.ts).
DDFS auto-derives the `uVol*` uniforms from the param `uniform` fields, so
adding a new knob is a one-line edit to `index.ts` — no manual uniform plumbing.

The body is injected into the trace loop's per-step block via
`builder.addVolumeTracing(VOLUMETRIC_SCATTER_BODY, '')` (Position 14 in the
ShaderBuilder assembly order). The compositing line `col += fogScatter;` is
injected into `applyPostProcessing()` via `addPostProcessLogic()` (Position 16).

### Per-step body — control flow

```
PT_VOLUMETRIC compile-gate (ptVolumetric: onUpdate=compile)
└── uVolEnabled > 0.5 runtime gate
    └── uVolDensity > 0.001  OR  uVolEmissive > 0.001        (work-to-do guard)
        └── stochastic firing gate (P scaled by uVolQuality)
            ├── DENSITY scatter — per-light shadow ray, HG phase, Beer-Lambert
            └── EMISSIVE scatter — orbit-trap gradient lookup (no shadow rays)
```

The two contributions (density and emissive) are independent and stack — you
can run pure-emissive (cheap, no shadow rays) or pure-density (expensive god
rays) or both.

### Stochastic sampling — uVolQuality slider

```glsl
// 1/128 at slider 0, 1/8 at slider 1, exponential interpolation between.
float _gateP = exp2(-7.0 + 4.0 * uVolQuality);
// Cap during interaction so a high-quality setting can't tank nav FPS.
if (uBlendFactor >= 0.99) _gateP = min(_gateP, 0.03125);
// Energy-conserved: seg = 1/gateP. Total expected radiance is invariant.
float _seg = 1.0 / _gateP;
if (fract(_volSeed * 7.43 + d * 1.0) < _gateP) { ... seg-weighted contribution ... }
```

Both extremes are unbiased estimators of the same integral. Slider only trades
**per-frame cost vs frames-to-converge**:

| `uVolQuality` | Gate P | Per-frame cost vs full | Frames to converge vs full |
|---|---|---|---|
| 0.00 (default) | 1/128 | ~16× cheaper | ~16× more |
| 0.25           | 1/64  | ~8× cheaper  | ~8× more  |
| 0.50           | 1/32  | ~4× cheaper  | ~4× more  |
| 0.75           | 1/16  | ~2× cheaper  | ~2× more  |
| 1.00           | 1/8   | full         | reference |

The default 0.0 (1/128) is calibrated for **interactive artist work**: cheap
per-frame preview that accumulates to the same final image as 1.0. Bump to
1.0 for short-accumulation final renders where you want minimum frames to
hit noise floor.

The interaction clamp (`uBlendFactor >= 0.99 → P ≤ 1/32`) means even at
quality=1.0, navigation frames still cap at 1/32 sampling. Once camera
stops, the slider's full rate kicks in for accumulation.

### Critical dependency — stochasticSeed via blue noise

The gate hash `fract(_volSeed * 7.43 + d * 1.0)` relies on per-pixel variation
in `_volSeed` (which derives from `stochasticSeed`). If `stochasticSeed` is
the same value across all pixels, the gate fires identically for every pixel
at every iter → screen-wide banding synced to fixed `d`-values.

`stochasticSeed` is generated in [engine-gmt/shaders/chunks/ray.ts](../../engine-gmt/shaders/chunks/ray.ts)
inside `getCameraRay()`:

```glsl
stochasticSeed = 0.5;  // default safe value
bool needNoise = false;
${noiseLogic}
if (needNoise) {
    stochasticSeed = isMoving ? getStableBlueNoise4(noisePixel).r
                              : getBlueNoise4(noisePixel).r;
}
```

`needNoise` is set by feature-specific runtime checks in `noiseLogic`. The
clauses currently are:

```glsl
if (uDOFStrength > 0.00001) needNoise = true;
if (!isMoving)              needNoise = true;
if (uAreaLights > 0.5)      needNoise = true;
if (uVolEnabled > 0.5)      needNoise = true;   // ← required for volumetric
```

**The `uVolEnabled` clause is mandatory.** Without it, during nav with DOF
and area lights off, `needNoise` stays false, `stochasticSeed = 0.5` for
every pixel, `_volSeed = 0.5` regardless of `uVolStepJitter`, and the gate
collapses to a function of `d` only. This was the root cause of a long
debugging detour through the gate hash itself — no amount of mixing-constant
tuning helps if the seed is uniform.

### Henyey-Greenstein phase function

`p(θ) = (1−g²) / (4π · (1+g² − 2g·cosθ)^1.5)`, where `g = uVolAnisotropy`:
- `g=0`: isotropic scatter (uniform glow).
- `g>0`: forward scatter (classic god rays toward lights).
- `g<0`: back scatter.

### Beer-Lambert transmittance

`T = exp(-σ_eff · d)` attenuates contribution from camera to scatter point.
σ_eff includes the optional height-fog modulation (`uVolHeightFalloff` /
`uVolHeightOrigin`). Early-out when `T < 0.001`.

### Surface color scatter (cheap path)

When `uVolEmissive > 0.001`, the same firing gate also evaluates the
fractal's Layer-1 orbit-trap color field via `getMappingValue` +
`uGradientTexture`. No extra `map()` call needed — `h.yzw` is already in
scope from the trace's per-step DE evaluation. Adds colored volumetric haze
driven by the fractal's gradient palette without firing any shadow rays.

### Shadow-ray jitter (god-ray softness)

Shadow ray direction is jittered by `_jDir * _jScale` where:
- `_jScale = min(h.x * 0.2, 0.35)` — scales with DE distance, so near-surface
  samples (small `h.x`) get hard god-ray edges and open-sky samples get
  softer scatter that temporally averages the fractal silhouette away.
- `_jDir` — a per-pixel-per-step ALU hash (`fract(stochasticSeed*K + d*K)`
  with coprime constants 127.1 / 31.7 / 47.1 / 73.7 / 13.3).

### Directional-light shadow-march cap

Directional lights use `_ld = DIR_LIGHT_DIST` (=100, defined in
[math.ts](../../engine-gmt/shaders/chunks/math.ts)) — same sentinel that
surface-shadow rays use in
[pbr.ts](../../engine-gmt/shaders/chunks/lighting/pbr.ts). The earlier value
(`10000.0`) was an outlier that made `GetHardShadow` march to its full step
budget every fire even when the loop's `t > lightDist` early-out should
have terminated sooner. Bench-invisible on point-light-only scenes (the
default Mandelbulb), but matters on scenes with at least one directional
light.

### Key files

| File | Role |
|------|------|
| [features/volumetric/index.ts](../../engine-gmt/features/volumetric/index.ts) | DDFS def: params, groups, panel, compile + runtime gates, body injection |
| [shaders/chunks/lighting/volumetric_scatter.ts](../../engine-gmt/shaders/chunks/lighting/volumetric_scatter.ts) | The injected per-step body (single template literal) |
| [shaders/chunks/trace.ts](../../engine-gmt/shaders/chunks/trace.ts) | `traceScene` accumulates `accScatter`, outputs `fogScatter` (line 47/152/208/218) |
| [shaders/chunks/post.ts](../../engine-gmt/shaders/chunks/post.ts) | `applyPostProcessing` shell receives the `col += fogScatter;` injection |
| [shaders/chunks/main.ts](../../engine-gmt/shaders/chunks/main.ts) | `renderPixel` calls `applyPostProcessing` for compositing |
| [shaders/chunks/ray.ts](../../engine-gmt/shaders/chunks/ray.ts) | `noiseLogic` includes `uVolEnabled > 0.5 → needNoise = true` |
| [shaders/chunks/lighting/shadows.ts](../../engine-gmt/shaders/chunks/lighting/shadows.ts) | `GetHardShadow` (used by density path; early-outs on `t > lightDist`) |
| [shaders/chunks/pathtracer.ts](../../engine-gmt/shaders/chunks/pathtracer.ts) | PT bounce traces use `traceSceneLean` — no volume on bounces, primary only |

### Parameters

All `uVol*` uniforms are auto-derived by DDFS from the feature def's `uniform`
fields — `engine/UniformSchema.ts` calls `featureRegistry.getUniformDefinitions()`.

| Param | Uniform | Type / Range | Notes |
|-------|---------|--------------|-------|
| Volume Scatter (compile gate) | `ptVolumetric` (define `PT_VOLUMETRIC`) | bool | `onUpdate: 'compile'`, recompiles to inject the body |
| Enabled (runtime gate) | `uVolEnabled` | bool | Hidden; controlled by `CompilableFeatureSection` |
| **Quality** | `uVolQuality` | float 0–1, default 0 | 0=1/128 sampling (cheap preview), 1=1/8 (final). Exponential mapping. Both ends converge to same image |
| Density (σ) | `uVolDensity` | float 0.001–5.0 (log), default 0.01 | Beer-Lambert extinction; sweet spot 0.005–0.05 |
| Anisotropy (g) | `uVolAnisotropy` | float -0.99–0.99, default 0.3 | HG phase parameter |
| Light Sources | `uVolMaxLights` | float 1–3, default 1 | Cap on shadow-ray count per fire (cost scales linearly) |
| Scatter Tint | `uVolScatterTint` | color, default white | Multiplicative tint on scattered radiance |
| Color Scatter | `uVolEmissive` | float 0–100 (log), default 0 | Cheap path; enables the orbit-trap gradient lookup |
| Surface Falloff | `uVolEmissiveFalloff` | float 0–5 (log), default 0 | Concentrates color near fractal surface (parent: `volEmissive>0`) |
| Step Jitter | `uVolStepJitter` | float 0–1, default 1.0 | 1.0 = stochastic seed (smooth via accumulation), 0.0 = fixed seed (artistic banded fog) |
| Height Falloff | `uVolHeightFalloff` | float 0–5 (log), default 0 | Density modulation by Y distance from origin |
| Height Origin | `uVolHeightOrigin` | float -5–5, default 0 | Y level where height-modulated density peaks (parent: `volHeightFalloff>0`) |

### Performance characteristics

Bench (1280×720, RTX 2070, Mandelbulb default + 1 vol light, ANGLE/D3D11):

| Configuration | p50 GPU | vs vol-off (~6,700 µs) |
|---|---|---|
| vol off | 6,670 µs | — |
| vol on, Quality=1.0 (1/8), accumulating | ~18,800 µs | +12,100 µs |
| vol on, Quality=0.0 (1/128), accumulating | ~7,500 µs | +800 µs |
| vol on, any Quality, **navigation frame** (clamped to 1/32) | ~7,500 µs | +800 µs |
| emissive-only (no shadow rays) | ~7,800 µs | +1,100 µs |

Density paths are dominated by `GetHardShadow` cost (one full SDF march per
shadow-ray fire). Emissive-only is essentially free because it skips shadow
rays entirely.

### Gotchas

- **`uVolEnabled` must trigger `needNoise=true`** in ray.ts. If you add new
  scenarios that bypass the noise path (e.g. a new render variant), confirm
  the gate hash still has per-pixel variation.
- **`stepJitter = 1.0` during nav** ([trace.ts:181](../../engine-gmt/shaders/chunks/trace.ts#L181)) — the primary march is deterministic during nav (no random advance per step). All pixels at the same iter see identical `d`. The volumetric gate's `d * 1.0` term then doesn't decorrelate per-pixel; only the `_volSeed * 7.43` term does. This is the design — don't try to add stronger d-mixing to the gate (see "What didn't work" below).
- **Warp coherence is load-bearing** for performance. The gate hash uses
  small constants (7.43, 1.0) that produce somewhat coherent firing patterns
  across pixels in a warp. Decorrelating with larger constants (tested with
  127.1/31.7) made the bench 2.4× slower because warps fan out — every iter
  where any lane fires, the whole warp pays the shadow-ray cost. The "bands
  visible during interaction" people sometimes notice are the visible side
  of warp coherence; randomizing breaks it.
- **PT bounces don't accumulate vol** — `traceSceneLean` (used for bounces
  and env-NEE shadow rays) is generated with empty volume body/finalize.
  Volumetric only applies to the primary camera ray. Documented design;
  avoiding it would multiply PT bounce cost.

### What didn't work (logged so future sessions don't redo)

- **Loop-invariant hoists** (world-pos sum cached once per gate-fire,
  `pow(x, 1.5) → x*sqrt(x)`): bench-neutral. ANGLE/D3D11 already CSEs across
  the two `if` branches and lowers `pow` efficiently.
- **Stronger gate-hash mixing** (`fract(_volSeed * 127.1 + d * 31.7)`):
  2.4× slower (warp divergence) AND visually worse (slabbing banding at
  d-period 1/31.7 ≈ 0.032).
- **Per-frame phase shift** (`+ float(uFrameCount) * 0.137`) for temporal
  decorrelation: rejected — design rule is per-pixel jitter, not per-frame
  (per-frame produces visible flicker without helping convergence under
  uBlendFactor=1.0 history-replace).
- **Item B set** (`applyPrecisionOffset` for emissive lookup, smoothstep
  `_jScale`, blue-noise shadow-ray jitter via `getBlueNoise4`): +1.5–3.3%
  perf cost for marginal visual change. Reverted; the perf cost wasn't
  earning the visual difference at typical accumulation lengths.

### Bench harness

The volumetric scenes are exercised via [debug/bench-shader.mts](../../debug/bench-shader.mts):

```bash
npx tsx debug/bench-shader.mts --volumetric=on --vol-density=0.01 --vol-lights=1 --tag=my-tag
```

Flags: `--volumetric=on|off`, `--vol-density=N`, `--vol-emissive=N`,
`--vol-lights=N`, `--vol-anisotropy=N`. Vol scenes auto-skip the reference
diff (the locked `GMT_Mandelbulb_v1.png` reference is calibrated for vol
off); bench saves a per-tag PNG so you can side-by-side compare runs.

### Path Tracer Fog Fixes (historical)

Two bugs in [shaders/chunks/pathtracer.ts](../../engine-gmt/shaders/chunks/pathtracer.ts) were fixed alongside the volumetric scatter work:

1. **Bounce fog Beer-Lambert**: The PT bounce loop previously applied
   `exp(-volumetric * 2.0)` where `2.0` was an arbitrary artistic constant.
   Changed to use the actual march distance `d` and the same density signal
   as the primary scatter, giving physically consistent attenuation across
   all bounces.
2. **envNEE traceScene call**: The `PT_ENV_NEE` branch called `traceScene`
   with 7 arguments after the signature was extended to 8 (`out vec3
   fogScatter`). Fixed by adding the missing output argument.

## 2.7 Two-Stage Shader Compilation

Formula changes trigger a full shader rebuild. On Windows/Chrome, the `fxc` compiler inlines the formula 10+ times, causing 14-19s compile blocks. Two-stage compilation solves this.

### How It Works

1. **Preview shader** (<1s compile): `MaterialController.compilePreview()` builds a stub shader with simplified lighting (colored N·L shading tuned for ACES pipeline, not flat gray). This renders immediately while the full shader compiles in the background.
2. **Full shader** (async): `MaterialController.buildFullMaterial()` builds the real shader on a separate `ShaderMaterial`. Uses `compileAsync` + `KHR_parallel_shader_compile` on a dummy scene with a dedicated 1x1 FBO (`getCompileTarget()`) to match the MRT program hash.
3. **Hot-swap**: Once compiled, `swapFullMaterial()` replaces the preview material seamlessly.

### Three Compilation Paths

`performCompilation()` in `FractalEngine` chooses:

| Path | Trigger | Behavior |
|------|---------|----------|
| Two-stage | Formula change | Preview → async full → swap |
| keepCurrent | Same formula, engine setting change | Keep current material visible, compile new one async |
| Single-stage | Fallback (first boot, errors) | Traditional blocking compile |

### Compile Spinner Gate (Main Thread → Worker Handshake)

The preview shader compile is GPU-blocking — the worker thread stalls for 1-23s (Firefox single-stage compiles can take 20+s). To ensure the compile spinner is visible before this stall, the main thread and worker use an event-driven handshake plus a unified state machine:

```
Main Thread                                   Worker Thread
┌─────────────────────────────────┐           ┌─────────────────────────┐
│ setFormula / loadScene / boot    │           │                         │
│  → compileGate.queue(msg, work)  │           │                         │
│    • CompileProgressStore.start()│           │                         │
│    • emit IS_COMPILING (legacy)  │           │                         │
│    • stash work                  │           │                         │
│    • start 500ms safety timer    │           │                         │
│                                  │           │                         │
│ CompilingIndicator + LoadingScreen│          │                         │
│  subscribe to store, animate bar │           │                         │
│ pingRef fires (DOM committed)    │           │                         │
│ rAF → setTimeout(0)              │           │                         │
│ Browser PAINTS spinner            │          │                         │
│                                  │           │                         │
│ compileGate.flush()              │           │                         │
│  → CONFIG #1..#N ───────────────────────────▶│ handleConfigChange ×N   │
│  → CONFIG_DONE  ────────────────────────────▶│ fireCompile()           │
│                                  │           │  → performCompilation() │
│                                  │           │    emits IS_COMPILING(s)│
│ WorkerProxy COMPILING handler   │◀───────────│ via postMessage         │
│  • string while idle  → start()  │           │                         │
│  • string while compiling →      │           │                         │
│    setMessage()                  │           │                         │
│  • false → finish()              │◀───────────│ IS_COMPILING(false)    │
│                                  │           │                         │
│ Bar snaps to 100, 800ms fade     │           │                         │
└─────────────────────────────────┘           └─────────────────────────┘
```

**Key design decisions:**

- **`CompileProgressStore`** (`store/CompileProgressStore.ts`) is the single source of truth: `{ phase: 'idle' | 'compiling' | 'done', message, startedAt, estimateMs, doneAt, cycleId }`. Both `LoadingScreen` and `CompilingIndicator` are pure views over it. Progress is computed on demand by `selectProgress(state, performance.now())` — exponential approach to 95 % over `estimateMs`, snaps to 100 on `finish()`.
- **Bar fill uses `transform: scaleX`** rather than `width: %`. Transforms run on the compositor thread so the bar keeps animating even when the worker's synchronous WebGL compile starves main-thread paint (notably Firefox).
- **`compileGate.queue(message, work)`** opens a cycle on the store, emits IS_COMPILING (legacy bus consumers), and stashes `work`. Returns a `Promise<void>` resolved on flush (rejects with `'superseded'` if another `queue()` arrives first). A 500 ms safety timer flushes the work even if the indicator's `pingRef` never paints (e.g. unmounted).
- **`pingRef`** in `CompilingIndicator` fires when the spinner DOM commits. After `rAF → setTimeout(0)` (guarantees browser has painted), it calls `compileGate.flush()` which runs the queued work (sending CONFIGs + `CONFIG_DONE` to the worker).
- **`CONFIG_DONE`** tells the worker all CONFIGs have arrived; `fireCompile()` cancels its 200 ms debounce and starts immediately.
- **Worker `IS_COMPILING` events** are bridged into the store by `WorkerProxy._handleWorkerMessage('COMPILING')`: string → `setMessage()` (or `start()` if store is idle, defensive); `false` → `finish()`.
- **Per-cycle estimate refresh.** `engineStore.setCompileEstimator(fn)` registers an app-specific estimator (engine-gmt's `estimateCompileTime`). `setFormula` and `loadScene` call it before `compileGate.queue`. `useAppStartup.bootEngine` does the same via its `estimateBootCompileMs` option. The store applies estimate updates via the `compile_estimate` event listener in `CompileProgressStore.ts`.
- **Initial message is context-aware.** `CompileScheduler.perform()` emits `'Loading Preview...'` only on genuine two-stage path (parallel-compile-capable browser + new formula). Otherwise emits `'Compiling Shader...'`. This avoids the "Loading Preview" misnomer on Firefox single-stage compiles and quality-preset switches.

### Stale Compile Cancellation

A generation counter (`_compileGeneration`) increments on each `scheduleCompile` call. If a user rapidly switches formulas, stale compiles are detected and discarded at yield points. Generation check early-returns do NOT emit `IS_COMPILING false` — the newer `scheduleCompile` already owns the spinner state. `_lastCompiledFormula` is set immediately after the first `pipelineRender` (before any yields) so concurrent `performCompilation` calls see the updated formula and take the `keepCurrent` path instead of redundantly compiling the preview.

### UI Feedback

Two views render off the same `CompileProgressStore`:

- **`LoadingScreen`** (boot screen, top-of-app cover) — visible until `isReady && phase === 'done'`. Bar fill from `selectProgress`. CPU Julia spinner in front of the bar. Uses `transform: scaleX` for the bar fill.
- **`CompilingIndicator`** (post-boot toast at top-center) — visible while `phase === 'compiling' || 'done'`. Same selector, same `scaleX` fill. Holds 800 ms after `done` then fades, then calls `reset()` to return the store to `idle`.

Status messages:
- `'Loading Preview...'` — only when genuinely doing two-stage with a new formula on a parallel-compile-capable browser (Chrome). Mid-flight phase change to `'Compiling Lighting...'` for Stage 2.
- `'Compiling Shader...'` — single-stage compiles (Firefox; same-formula recompiles like quality preset switching) and `keepCurrent` recompiles.

### Permanent Compile Timing Logs

Always-on `console.log` entries (not DEV-gated — do not remove):
- `[Compile] Single-stage: Xms (Formula)` — single-stage done (final time)
- `[Compile] Two-stage: Xms (Formula, gen=Xms, gpu=Xms)` — two-stage done (final time, with breakdown)

### Key Files

| File | Role |
|------|------|
| `store/CompileProgressStore.ts` | Unified state machine: phase / message / startedAt / estimateMs / cycleId. `selectProgress(s, now)` selector. Both views read from this. |
| `store/CompileGate.ts` | `compileGate.queue(msg, work)` opens a store cycle + stashes work; `flush()` runs the work after spinner paints. 500 ms safety net. |
| `hooks/useAppStartup.ts` | Generic boot hook: hardware detect, hydration flag, `bootEngine` that routes through `compileGate.queue`. Takes `bootRenderer` / `pushOffset` / `estimateBootCompileMs` callbacks via options so it stays decoupled from any specific renderer. |
| `engine/FractalEngine.ts` | `scheduleCompile()`, `fireCompile()`, `performCompilation()` — three-path dispatch |
| `engine/CompileScheduler.ts` | `perform()` chooses `'Loading Preview...'` vs `'Compiling Shader...'` based on `hasParallelCompile && formulaChanged`. |
| `engine/MaterialController.ts` | `compilePreview()`, `buildFullMaterial()`, `swapFullMaterial()` |
| `engine/worker/renderWorker.ts` | `CONFIG_DONE` handler calls `fireCompile()` |
| `engine/worker/WorkerProxy.ts` (engine-gmt) | `_handleWorkerMessage('COMPILING')` bridges worker IS_COMPILING events into the store via `start()` / `setMessage()` / `finish()`. |
| `features/lighting/index.ts` | Preview shader stub (colored N·L) |
| `components/CompilingIndicator.tsx` | Compile status toast — store-driven, scaleX bar, owns flush via pingRef. |
| `app-gmt/LoadingScreen.tsx` | Boot screen — store-driven, scaleX bar wrapping the CPU Julia spinner. |

## 2.8 TickRegistry — Frame Orchestration

The main-thread frame loop is organized by `engine/TickRegistry.ts`, a phase-based tick orchestrator.

### Phases (Fixed Order)

```
SNAPSHOT → ANIMATE → OVERLAY → UI
```

1. **SNAPSHOT**: Capture display camera state (`getDisplayCamera()`), sync R3F camera FOV
2. **ANIMATE**: Animation engine updates, parameter interpolation
3. **OVERLAY**: Drawing overlay, light gizmo updates
4. **UI**: UI-driven per-frame updates

### Integration

- `WorkerTickScene.tsx` registers all ticks at module level, calls `runTicks(delta)` in its `useFrame` hook
- **DISPATCH** (`sendRenderTick`) runs inline after `runTicks()` — it needs R3F camera serialization that's only available in the R3F frame callback
- `Navigation.tsx` has a separate `useFrame` at **priority 0** (camera physics) — runs before TickRegistry
- Light gizmos read `getDisplayCamera()` (snapshotted in SNAPSHOT phase) + worker shadow offset (preferred over store offset, which is stale during fly mode)

### Debugging

`getTickManifest()` returns the full execution order for console inspection.

## 3. The Pipeline (`RenderPipeline.ts`)

To achieve high quality in a real-time browser environment, we use **Temporal Super Sampling (TSS)**.

### 3.1 Ping-Pong Buffers
We maintain two floating-point textures: `TargetA` and `TargetB`.
*   Frame N: Read `TargetB`, Write `TargetA`.
*   Frame N+1: Read `TargetA`, Write `TargetB`.

### 3.2 Accumulation Logic
```glsl
// Inside Shader
vec3 current = renderScene();
vec3 history = texture(uHistory, uv).rgb;
float blend = uBlendFactor; // 1.0/FrameCount
vec3 final = mix(history, current, blend);
```
*   **Moving:** `blend = 1.0` (History discarded, instant feedback, noisy shadows).
*   **Still:** `blend` decreases ($1/2, 1/3, \dots$). Noise averages out to zero.

## 4. Distance Probe (Navigation Speed)

The distance probe measures the distance to the fractal surface at the screen center. This drives navigation speed (closer = slower, farther = faster) and orbit controls.

### 4.1 Depth Buffer Readback

Distance is read from the **alpha channel of the main render target** (MRT location 1), which stores the raymarched distance at each pixel. No separate render pass is needed.

**Worker mode** (`WorkerDepthReadback.ts`): Uses async PBO + fence sync to read the center pixel every 3rd frame with zero GPU stall. Falls back to synchronous `readPixels` on WebGL1.

**Direct mode** (`usePhysicsProbe.ts`): Reads a 3×3 pixel neighborhood around center from the previous frame's render target and averages valid samples. This reduces noise when DOF is enabled.

### 4.2 Sky Threshold

> **Update 2026-05-28 — sky reset popup + `centerIsSky`.** The "Sky hit behavior" below was the source of a bug: in **worker mode** the probe consumes `engine.lastMeasuredDistance`, which is only written on a *valid hit* (the worker retains the last valid distance so navigation keeps working over sky). That means a sky frame never reads as a sky value on the main thread, so the **Reset Camera popup** — which the sky branch is supposed to surface — never appeared (direct mode worked because it feeds `Infinity` to `processDepthData`). Fixed by adding a `centerIsSky: boolean` to `WorkerShadowState` (set in `WorkerDepthReadback`, read by the worker-mode branch of `usePhysicsProbe`, which then routes through `processDepthData(Infinity)`). Two other current-state notes: the surface-hit predicate is now the shared `isSurfaceHit(d)` helper in `data/constants.ts` (replaces the inline `d > 0 && d < MAX_SKY_DISTANCE && Number.isFinite(d)` copies); and the files in the §4 Key Files table moved during the engine-fork split — `usePhysicsProbe.ts` and `Navigation.tsx` now live under `engine-gmt/navigation/`, not `hooks/` / `components/`.

`MAX_SKY_DISTANCE = 50.0` (in `data/constants.ts`) — any depth value ≥ 50 is treated as a sky hit (open space, no surface). This prevents navigation speed from exploding when the camera looks at empty space. Shared by `usePhysicsProbe`, `WorkerDepthReadback`, and `WorkerExporter`.

**Sky hit behavior:**
- If no valid measurement has ever been received → defaults to `1.0`
- If a previous valid measurement exists → keeps the last valid distance (no update)
- HUD shows `DST X.XXXX (sky)` in gray

The same threshold is applied consistently across: `usePhysicsProbe.ts`, `WorkerDepthReadback.ts`, and `WorkerExporter.ts`.

### 4.3 Asymmetric Smoothing (Two Layers)

Panning from a close surface to open space can cause a 100× distance jump in one frame. Two layers of smoothing prevent this:

**Layer 1 — Probe smoothing** (`usePhysicsProbe.processDepthData`):
- **Distance increases > 1.5×**: Blends at 8% per frame (~60 frames to converge)
- **Distance decreases**: Responds at 40% per frame (fast, for safety near surfaces)

**Layer 2 — Camera controller** (`CameraController.update`):
- **Distance increases**: Exponential lerp at rate 1.2 (~2.5s to 95% of target)
- **Distance decreases**: Immediate response

The result: approaching a surface is instant (safety), but speed ramps up gradually when looking away.

### 4.4 Probe Modes

| Mode | Value | Description |
|------|-------|-------------|
| GPU (Depth Buffer) | 0 (default) | Reads from MRT alpha, no extra render pass |
| CPU Calc | 1 | Same depth buffer readback path |
| Manual | 2 | Fixed user-specified distance, no calculation |

### 4.5 Focus Lock

When `focusLock` is enabled in the store, the probe syncs `dofFocus` to the smoothed distance whenever it changes by more than 1%. This keeps depth-of-field focus tracking the surface under the crosshair.

### Key Files

| File | Role |
|------|------|
| `hooks/usePhysicsProbe.ts` | Main-thread probe: 3×3 sampling, smoothing, HUD, focus lock |
| `engine/worker/WorkerDepthReadback.ts` | Worker-side async PBO readback + focus pick |
| `engine/controllers/CameraController.ts` | Second smoothing layer, speed calculation |
| `components/Navigation.tsx` | Consumes `distAverageRef` for camera physics |

## 5. Adaptive Resolution

Context-aware dynamic resolution scaling, enabled by default. Adjusts the internal render resolution to maintain a target FPS (default 30), then restores full resolution when idle.

### Behavior

Depends on mouse position (tracked via `mouseOverCanvas` in the render state):
- **Mouse on canvas:** Active during camera/gizmo interaction. After interaction stops, an FPS-based grace period runs before restoring full resolution (1fps→2s, 10fps→200ms, 30fps+→100ms minimum).
- **Mouse on UI** (panels, menus, timelines): Always-on — keeps resolution reduced so slider drags and menu interactions stay responsive. Any accumulation reset (parameter change, formula switch) is detected as activity.

### FPS Control Loop

Runs inside `UniformManager.syncFrame()` every frame:
1. **Measure FPS** every 500ms using frame timestamps.
2. **Adjust scale** proportionally: `idealScale = currentScale * sqrt(targetFPS / measuredFPS)`, smoothed with 70/30 blend to avoid oscillation.
3. **Dead zone:** Skip resize if resulting pixel dimensions change by less than 5% — avoids constant accumulation resets from tiny fluctuations.
4. **Seed on start:** When interaction begins, immediately seed the scale from the still-frame FPS so the first frame renders at an appropriate resolution (no slow ramp-up).
5. **Clamp** between 1x (full res) and 4x downscale.

### Safety

Disabled during bucket rendering and video export (`isExporting || isBucketRendering` guard in `UniformManager.syncFrame()`). Self-caused accumulation resets (from resolution changes) are flagged via `_selfResized` to prevent feedback loops. **Full-res accumulation guard:** once the scene has accumulated ~1s of full-resolution frames (FPS-scaled threshold, 8–50 samples), adaptive locks off globally — moving the mouse to click snapshot or other UI buttons won't destroy the quality result. Only full-res samples count (`_fullResAccum`); reduced-res accumulation is ignored, preventing flicker cycles.

### Key Files

| File | Role |
|------|------|
| `engine/managers/UniformManager.ts` | FPS measurement, scale adjustment, resolution application |
| `features/quality.ts` | `dynamicScaling`, `adaptiveTarget`, `interactionDownsample` params |
| `components/topbar/AdaptiveResolution.tsx` | Top bar toggle icon (cyan=auto, amber=always) |
| `engine/worker/ViewportRefs.ts` | `mouseOverCanvas` tracking |
| `components/PerformanceMonitor.tsx` | Low FPS warning with "Adaptive Resolution" suggestion |

## 6. Bucket Renderer
For resolutions higher than the GPU limit (e.g., 8K), or to prevent TDR (Timeout Detection Recovery) crashes:
1.  **Tiling:** The screen is divided into small buckets (e.g., 128x128).
2.  **Region mask:** `uRegionMin`/`uRegionMax` limits the shader to only render that tiny window.
3.  **Accumulation:** The engine renders that bucket until it converges (noise-free).
4.  **Composite:** The result is copied to a composite buffer via GL scissor.
5.  **Repeat:** Move to next bucket until the image (or current image tile) is complete.

### 6.1 Bucket Renderer Architecture (Updated 2026-04-20)

Two orthogonal concepts the renderer composes:

- **GPU bucket** — internal rectangular chunk (64/128/256/512 px) used as a VRAM/TDR safety knob. Multiple buckets make up one image tile.
- **Image tile** — an output sub-image saved as its own PNG. `tileCols × tileRows` image tiles make up the full output. For `tileCols=tileRows=1` the output is a single file (default).

Sizing is controlled by explicit **Output Width / Output Height** pixel inputs (plus optional preset dropdown + "lock to viewport aspect" toggle). The older `bucketUpscale` multiplier has been replaced.

#### Key Components:
- **Per-tile Composite Buffer**: A Float32 render target sized to the *current image tile* stores its accumulated HDR image. For single-image output (1×1), this is the full output.
- **Scissor Compositing**: Each completed GPU bucket is copied into the current tile's composite buffer using a GL scissor rect with integer pixel bounds — guarantees pixel-perfect bucket boundaries with no float precision gaps.
- **Integer Pixel Bounds**: Each bucket stores both UV-space bounds (for the render shader) and integer pixel coordinates (`pixelX/pixelY/pixelW/pixelH`) for the scissor rect.
- **Half-Pixel Region Expansion**: The render shader's `uRegionMin`/`uRegionMax` are expanded by 0.5 pixels in each direction to ensure boundary pixels are always rendered. The scissor rect does the precise clipping, so slight over-render is harmless.
- **Adaptive Convergence**: Each bucket renders until converged (noise-free) or max samples reached.
- **Output-aspect Override**: At the start of a bucket render, `cam.aspect` is set to `outputWidth/outputHeight` so primary-ray basis vectors frame the full output. Restored on cleanup.

### 6.1a Image-Tile Loop (Split-Output Rendering)

When `tileCols × tileRows > 1` the render produces separate PNG files for each tile, suitable for massive prints that would otherwise exceed VRAM. The outer loop wraps the existing bucket loop:

```
for each image tile (row, col):
    - set tile-local uniforms (uImageTileOrigin, uImageTileSize,
      uTilePixelOrigin, uFullOutputResolution)
    - resize pipeline + composite buffer to tile's pixel size
    - run the inner bucket loop (unchanged)
    - run post-processing (bloom/CA/tone-map) on this tile's composite
    - save as PNG with "_rXXcYY" filename suffix
```

**UV remap for rays** (`shaders/chunks/ray.ts`):
```glsl
vec2 uvFull = uImageTileOrigin + uvCoord * uImageTileSize;
vec2 uv     = uvFull * 2.0 - 1.0;
```
Each tile's fullscreen quad covers its slice of full-image NDC while the camera basis stays configured for full-output aspect — primary rays are seamless by construction.

**Blue-noise continuity**: blue-noise lookups use `noiseCoord * uFullOutputResolution` (instead of `* uResolution`), so noise patterns are globally consistent across adjacent tiles — path-traced seams at tile boundaries collapse to <1-sample variance.

**Defaults are no-ops**: `uImageTileOrigin = (0,0)`, `uImageTileSize = (1,1)`, `uFullOutputResolution = uResolution`, `uTilePixelOrigin = (0,0)`. Single-image renders behave identically to the pre-tiling code path. `UniformManager.syncFrame` keeps `uFullOutputResolution` synced to `uResolution` whenever `uImageTileSize == (1,1)`.

**Known seam**: bloom and chromatic aberration are spatial post-process effects and run on each tile independently — they sample black outside the current tile, producing visible seams at tile boundaries. The UI shows a warning when tiling is active with bloom/CA on. The v2 plan (see [docs/43_Bucket_Render_Overhaul.md](43_Bucket_Render_Overhaul.md)) renders bloom once from the viewport and samples it per-tile.

**Filename**: single-image → `name_v{n}_WxH.png`. Multi-tile → `name_v{n}_WxH_r01c02.png` (zero-padded so alphabetic sort matches scan order).

#### Adaptive Convergence Sampling:
The bucket renderer uses **adaptive convergence-based sampling**:
1. Each tile renders a minimum number of samples (16 or 1/4 of max)
2. After minimum samples, measures max pixel difference between frames via async GPU fence readback
3. When delta < threshold, tile is considered converged and moves to next
4. Max samples acts as a safety limit for difficult tiles

**Convergence Threshold** (default 0.25%):
- `0.1%` = Production quality (more samples, cleaner)
- `0.25%` = Default — good balance of quality and speed
- `0.5%` = Balanced quality
- `1.0%` = Fast preview (fewer samples, some noise)

**Max Samples Per Bucket**:
- Safety limit for tiles that don't converge quickly
- Tiles that converge early use fewer samples
- Typical values: 64-1024

#### State Locking During Bucket Render:
The bucket renderer locks the application to prevent mid-render corruption:
- **Worker message lock** (`renderWorker.ts`): Only `BUCKET_STOP` and `RENDER_TICK` messages pass through; all others (`RESIZE`, `CONFIG`, `UNIFORM`, `OFFSET_SET/SHIFT`, etc.) are dropped
- **Main thread UI lock**: `isExporting` is set `true` on the store during bucket render, which locks camera movement (via `selectMovementLock`), blocks parameter changes, and disables performance monitoring
- **Resize guard**: `WorkerDisplay`'s ResizeObserver skips resize messages while `isBucketRendering` is true
- **Popover persistence**: The bucket render controls popover stays open during render (click-outside handler is suppressed)

Note: The worker's own `engine.state.isExporting` stays `false` so `update()` and `compute()` continue running the bucket frame loop.

#### Memory Management:
- Bucket size controls memory usage (smaller = less VRAM)
- Composite buffer uses Float32 for HDR quality
- Supports up to 10K+ resolution with appropriate bucket sizes
- `canvasPixelSize` in the store (set by `ViewportArea`'s ResizeObserver on the flex-1 viewport div, so it always reflects the post-sidebar canvas area) drives VRAM estimation. Consumers read via `getCanvasPhysicalPixelSize(state)` which handles the Fixed-mode case by deriving from `fixedResolution × dpr` (avoiding ResizeObserver lag after a Fixed-mode switch). See [docs/06_Troubleshooting_and_Quirks.md](06_Troubleshooting_and_Quirks.md#reading-canvas-physical-pixel-size).

#### Output Size:
- Explicit pixel dimensions (width × height) via the bucket render panel.
- Presets cover common viewport sizes (HD/FHD/QHD/4K/5K/8K), squares (2K/4K), portraits/verticals, and print sizes (A3-A0 at 300 DPI).
- "Lock to viewport aspect" checkbox auto-adjusts height when width changes (or vice-versa) to preserve the current ratio.
- "Match viewport" button sets output to the current canvas pixel size.

### 6.2 Region Rendering

The viewport supports a **render region** — a user-drawn rectangle that constrains accumulation to a sub-area while preserving the rest of the image from history.

#### Uniforms:
- `uRegionMin` / `uRegionMax` (vec2, normalized 0-1): Define the active region bounds
- Default: `(0,0)` to `(1,1)` = full viewport

#### Shader Logic (`shaders/chunks/main.ts`):
```glsl
if (vUv.x < uRegionMin.x || vUv.y < uRegionMin.y ||
    vUv.x > uRegionMax.x || vUv.y > uRegionMax.y) {
    pc_fragColor = history;  // Outside: keep history unchanged
    return;
}
// Inside: full ray trace + accumulation blend
```

#### Interaction (`hooks/useRegionSelection.ts`):
- **Draw**: Click crop icon, drag on viewport → pixel coords converted to normalized UV
- **Move**: Drag inside the region box
- **Resize**: 8 directional handles (n/s/e/w/ne/nw/se/sw) with `data-handle` attributes
- **Clear**: Click ✕ on the region header or click crop icon again

#### Region Overlay HUD (`components/ViewportArea.tsx`):
The region overlay displays live stats:
- **Pixel dimensions** of the selected area
- **Sample count** (polled from `engine.accumulationCount` every 100ms)
- **Sample cap** with click-to-cycle control (0/64/128/256/512/1024/2048/4096)
- **Live convergence** value vs threshold — turns green when converged

### 6.3 Convergence Measurement

A single convergence system shared by both bucket rendering and viewport accumulation.

#### Architecture:
1. **Diff pass**: Renders a fullscreen quad that computes `max(abs(A - B))` per pixel between ping-pong targets A and B
2. **Dynamic target sizing**: Convergence render target resizes to match the measured region's pixel dimensions (capped at 256×256 for CPU readback performance)
3. **Region-aware bounds**: `uBoundsMin`/`uBoundsMax` remap UV to measure only the active region, not always the full viewport

#### Async Path (bucket + viewport):
- `startAsyncConvergence()` renders the diff pass and inserts a GL fence via `gl.fenceSync()`
- `pollConvergenceResult()` checks fence status with zero-timeout `clientWaitSync()` — no GPU stall
- Result cached in `lastConvergenceResult`, exposed to UI via `WorkerShadowState.convergenceValue`

#### Viewport Convergence:
- Runs automatically every 8 accumulated frames during normal viewport rendering
- Skipped during bucket rendering (BucketRenderer manages its own per-bucket measurements)
- Reads `uRegionMin`/`uRegionMax` from uniforms to measure only the active region
- Result synced to main thread via shadow state → polled by RegionOverlay at 100ms intervals

#### Key Files:
| File | Role |
|------|------|
| `engine/RenderPipeline.ts` | Convergence diff shader, async fence readback, dynamic target sizing |
| `engine/BucketRenderer.ts` | Per-bucket convergence polling, bucket advancement |
| `hooks/useRegionSelection.ts` | Region draw/move/resize interaction |
| `components/ViewportArea.tsx` | RegionOverlay component with live stats |
| `store/slices/rendererSlice.ts` | `setRenderRegion()` — syncs uniforms + resets accumulation |
