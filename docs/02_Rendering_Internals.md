
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

### Key Files

| File | Role |
|------|------|
| `features/lighting/index.ts` | Defines and injects `PT_NEE_ALL_LIGHTS`, `PT_ENV_NEE`, `PT_VOLUMETRIC` defines; injects `LIGHTING_SHARED` |
| `shaders/chunks/pathtracer.ts` | Compile-gated branches for each define; calls `traceSceneLean` for bounces |
| `shaders/chunks/trace.ts` | `getTraceGLSL()` — parameterized `functionName` for lean variant |
| `engine/ShaderBuilder.ts` | Emits `traceSceneLean` alongside `traceScene` in PT mode |
| `engine/UniformSchema.ts` | `uPTMaxLuminance` uniform definition |

## 2.6 Volumetric Scatter (God Rays)

Primary-ray single-scatter volumetric lighting. Injected into `traceScene`'s march loop via `builder.addVolumeTracing()`. Active in both Direct and Path Tracing modes. Controlled via **Scene → Fog → Volumetric Density**.

### Technique

At each march step, a stochastic gate fires with probability 1/8 (spatially distributed, decoupled from DE iteration count to prevent orbit-trap banding in sky). When fired:

1. **Beer-Lambert transmittance** `T = exp(-σ·d)` attenuates contribution from camera to scatter point. Early-out when `T < 0.001`.
2. **Per-light shadow ray** with jitter proportional to `h.x` (the DE distance at that step):
   - Near the surface (`h.x` small) → minimal jitter → hard god-ray edges.
   - Open sky (`h.x` large) → large jitter → temporal accumulation blurs the fractal silhouette, eliminating iteration-count banding.
3. **Henyey-Greenstein phase function** `p(θ) = (1−g²) / (4π·(1+g²−2g·cosθ)^1.5)` — controlled by **Anisotropy (g)**:
   - `g=0`: isotropic scatter (uniform glow).
   - `g>0`: forward scatter (classic god rays toward lights).
   - `g<0`: back scatter.
4. **Surface Color Scatter** (optional): at the same stochastic sample, evaluates the fractal's Layer 1 orbit-trap color field via `getMappingValue` + `uGradientTexture` — no extra `map()` call needed since `h.yzw` is already in scope. Adds colored volumetric haze driven by the fractal's own gradient palette.

### Key Files

| File | Role |
|------|------|
| `shaders/chunks/lighting/volumetric_scatter.ts` | Full GLSL body, injected into march loop |
| `shaders/chunks/trace.ts` | `traceScene` accumulates `accScatter`, outputs `fogScatter` |
| `shaders/chunks/main.ts` | `renderPixel` calls `applyPostProcessing` for final compositing |
| `shaders/chunks/pathtracer.ts` | PT bounce fog uses `exp(-uFogDensity·d)` Beer-Lambert; bounce traces use `traceSceneLean` (no volume) |
| `features/atmosphere/index.ts` | UI params: Density, Anisotropy, Surface Color Scatter |
| `features/volumetric/index.ts` | Injects `#define PT_VOLUMETRIC`, `addVolumeTracing()`, and scatter compositing via `addPostProcessLogic()` |

### Parameters

| Param | Uniform | Range | Notes |
|-------|---------|-------|-------|
| Fog Intensity | `uFogIntensity` | 0–1 | Master switch for fog section visibility |
| Volumetric Density (σ) | `uFogDensity` | 0–0.5 (log) | Beer-Lambert extinction. Sweet spot ~0.005–0.05 |
| Anisotropy (g) | `uPTFogG` | −0.99–0.99 | HG phase. Default 0.3 (mild forward) |
| Surface Color Scatter | `uFogEmissiveStrength` | 0–2 (log) | Layer 1 orbit trap color injected into fog |

### Stochastic Sampling Strategy

- **Gate**: `fract(stochasticSeed × 7.43 + d × 1.0) < 0.125` — spatial, not iteration-indexed.
- **Segment weight**: `_seg = 8.0` (unbiased: 8× contribution compensates 1/8 sampling rate).
- **Why spatial not iterative**: DE step sizes follow the fractal's level-set structure. Iteration-indexed sampling creates visible banding correlated with orbit counts, especially visible in sky regions. Distance-based sampling (`d × K`) is uniform in world space.

### Path Tracer Fog Fixes

Two bugs in `shaders/chunks/pathtracer.ts` were fixed alongside the volumetric scatter work:

1. **Bounce fog Beer-Lambert**: The PT bounce loop previously applied `exp(-volumetric * 2.0)` where `2.0` was an arbitrary artistic constant. Changed to `exp(-uFogDensity * d)` — proper Beer-Lambert using the actual march distance `d` and the same density uniform as the primary scatter, giving physically consistent fog attenuation across all bounces.

2. **envNEE traceScene call**: The `PT_ENV_NEE` branch called `traceScene` with 7 arguments after the signature was extended to 8 (`out vec3 fogScatter`). Fixed by adding the missing `vec3 envScatter = vec3(0.0)` output argument.

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

### Stale Compile Cancellation

A generation counter (`_compileGeneration`) increments on each compile request. If a user rapidly switches formulas, stale compiles are detected and discarded when they complete.

### UI Feedback

`CompilingIndicator.tsx` shows status centered under the top bar:
- "Compiling Lighting..." — two-stage (preview is rendering)
- "Compiling Shader..." — keepCurrent path

### Key Files

| File | Role |
|------|------|
| `engine/MaterialController.ts` | `compilePreview()`, `buildFullMaterial()`, `swapFullMaterial()` |
| `engine/FractalEngine.ts` | `performCompilation()` — three-path dispatch |
| `features/lighting/index.ts` | Preview shader stub (colored N·L) |
| `components/CompilingIndicator.tsx` | Compile status UI |

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
2.  **Scissor:** The projection matrix is skewed to render *only* that tiny window.
3.  **Accumulation:** The engine renders that bucket until it converges (noise-free).
4.  **Composite:** The result is copied to a final canvas. (may need more work to ensure it can handle large files)
5.  **Repeat:** Move to next bucket.

### 6.1 Bucket Renderer Architecture (Updated 2026-03)

The bucket renderer handles high-resolution output (4K-10K+):

#### Key Components:
- **Composite Buffer**: A separate Float32 render target stores the final accumulated image
- **Scissor Compositing**: Each completed bucket is copied to the composite buffer using a GL scissor rect with integer pixel bounds — guarantees pixel-perfect tile boundaries with no float precision gaps
- **Integer Pixel Bounds**: Each bucket stores both UV-space bounds (for the render shader) and integer pixel coordinates (`pixelX/pixelY/pixelW/pixelH`) for the scissor rect
- **Half-Pixel Region Expansion**: The render shader's `uRegionMin`/`uRegionMax` are expanded by 0.5 pixels in each direction to ensure boundary pixels are always rendered. The scissor rect does the precise clipping, so slight over-render is harmless.
- **Adaptive Convergence**: Each tile renders until converged (noise-free) or max samples reached

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
- `canvasPixelSize` in the store (set by `WorkerDisplay` ResizeObserver) provides accurate resolution for VRAM estimation; in Fixed resolution mode, the estimate uses `fixedResolution * dpr` directly

#### Export Scale:
- `1x` = Viewport resolution
- `2x` = 4K from 1080p viewport
- `4x` = 8K from 1080p viewport
- `8x` = 10K+ from 1080p viewport

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
