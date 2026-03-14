# Fractal Path Tracing: State of the Art Research (2024-2026)

Compiled for GMT (GPU Mandelbulb Tracer) -- practical techniques for browser-based fractal rendering.

---

## 1. GPU Raymarching & Path Tracing Optimizations

### 1.1 Enhanced Sphere Tracing (Over-Relaxation)

The standard sphere tracing algorithm (Inigo Quilez / John Hart) takes conservative steps equal to the SDF value. Enhanced sphere tracing uses **over-relaxation** -- stepping *further* than the SDF distance by a factor omega (typically 1.2-1.8). If the next step reveals we overshot (the combined previous and current SDF values would overlap), the algorithm falls back to the conservative step size and proceeds normally.

**Practical impact:** 30-70% fewer ray steps on smooth geometry. Particularly effective for fractal SDFs where the distance estimate is often conservative. The key is that Mandelbulb/Mandelbox distance estimators already underestimate the true distance, so even modest over-relaxation helps significantly.

**Implementation:** Track previous step size and previous SDF value. If `prev_sdf + current_sdf < prev_step_size`, you overshot -- revert to conservative mode for this step.

**Applicability to GMT:** Directly implementable in your `pathtracer.ts` raymarching loop. The omega parameter could be a uniform exposed as a quality slider -- lower omega = safer/slower, higher = faster but risks artifacts on thin features.

### 1.2 Cone Tracing / Beam Tracing for Fractals

Instead of tracing infinitesimal rays, cone tracing sends a cone whose radius grows with distance. For fractal LOD, this enables:

- **Early termination:** When the cone footprint exceeds the SDF detail level, stop marching. The fractal detail below cone resolution is invisible.
- **Anti-aliasing:** The cone naturally integrates detail within its footprint.
- **Adaptive iteration count:** Fractal iteration depth can decrease as the cone widens, since fine detail is invisible at distance.

**Practical tip:** The cone half-angle is `atan(pixelSize / focalLength)`. At distance d from camera, the footprint is `d * tan(halfAngle)`. When `footprint > sdf_value`, the detail level is subpixel and further iteration refinement is wasted.

### 1.3 Analytical Gradient SDFs (Eliminating Numerical Normals)

IQ's analytical gradient technique (iquilezles.org/articles/distgradfunctions2d) co-computes the SDF value AND its gradient simultaneously, reusing intermediate terms. For fractals specifically:

- The Mandelbulb distance estimator already computes the running derivative `dr` for distance estimation. This derivative chain can be extended to produce an analytical gradient (surface normal) with minimal extra ALU cost.
- Eliminates 4-6 extra SDF evaluations for the tetrahedron/central difference normal computation.
- **Savings:** For a Mandelbulb with 12 iterations, this saves ~48-72 trig operations per pixel for normal computation.

**Applicability to GMT:** Your formulas already compute `dr`. Extending them to track the full Jacobian for analytical normals is the single highest-impact optimization for path tracing, where normals are evaluated at every bounce.

### 1.4 Trigonometric Elimination for Mandelbulb

IQ's optimization (iquilezles.org/articles/mandelbulb) replaces sin/cos calls with polynomial identity chains using doubled-angle formulas applied iteratively:

- `cos(2a) = 2*cos(a)^2 - 1`, `sin(2a) = 2*sin(a)*cos(a)`
- Applied 3 times for power-8 Mandelbulb (8x = 2^3)
- **5x speedup** over direct trigonometric approach

**Applicability to GMT:** Check if `formulas/Mandelbulb.ts` already uses this. If not, this is a massive free speedup.

### 1.5 Primary Surface Replacement (PSR)

From NVIDIA's real-time path tracing work: instead of stopping the ray at the first mirror/glass surface, trace the specular reflection/refraction ray and store THAT hit in the G-buffer. This allows the denoiser to work on the reflected surface as if it were primary geometry.

- Enables temporal stability for reflections
- Supports recursive mirror/glass chains
- Works with checkerboarded split-frame rendering for dual-path pixels

---

## 2. SDF Acceleration Structures for Fractals

### 2.1 Bounding Volume Hierarchies for SDFs

IQ describes hierarchical bounding volumes (iquilezles.org/articles/sdfbounding) for complex SDFs:

- Wrap expensive SDF sub-trees in cheap bounding spheres/boxes
- Evaluate bounding volume first; skip sub-tree if ray is outside
- Can be nested recursively for complex scenes
- **Caution on WebGL:** Branch divergence on GPU can negate benefits. Works best when large screen regions are bounded.

For fractals specifically, the fractal itself has a natural bounding sphere, but internal acceleration is harder since the SDF is procedural, not composed of discrete primitives.

### 2.2 Sparse Voxel Structures (Octree / VDB-style)

Pre-bake the fractal SDF into a sparse voxel octree or VDB-like structure:

- Store distance values at octree nodes
- During raymarching, traverse the octree to skip large empty regions
- Hybrid approach: use octree for initial skip, then precise SDF evaluation near surfaces

**Trade-offs:** Memory usage, bake time, doesn't work for animated/parametric fractals that change every frame. Better suited for static high-quality renders or as a "coarse pass" acceleration.

### 2.3 Lipschitz Bound Exploitation

The Lipschitz constant of an SDF determines the maximum rate of change. For a true SDF, the Lipschitz constant is 1.0 (gradient magnitude = 1 everywhere). For fractal distance estimators that UNDERESTIMATE:

- If you know the Lipschitz constant L of your DE function, you can step by `sdf_value / L` instead of `sdf_value`.
- For Mandelbulb, the DE is known to underestimate, so L > 1. Empirically, values of L = 0.5-0.8 (meaning you can step by sdf/0.5 = 2*sdf) work for many parameter ranges.
- This is mathematically equivalent to over-relaxation but framed differently.

**Practical approach:** Expose a "step multiplier" parameter (equivalent to 1/L or omega in over-relaxation) that users can tune per formula. Conservative = 1.0, aggressive = 1.5-2.0.

### 2.4 Distance Field Caching / Brick Maps

Cache SDF evaluations in a 3D texture (brick map):
- Divide space into small bricks, each containing an 8x8x8 grid of SDF values
- Allocate only bricks near the surface (sparse)
- Trilinear interpolation for intermediate lookups
- **Huge speedup** for secondary rays (AO, GI bounces) that re-evaluate near already-computed surfaces

**Applicability to GMT:** This could work as a "pre-pass" that bakes the current fractal's near-surface SDF into a 3D texture, then path tracing bounces use the cached texture instead of re-evaluating the expensive fractal formula. Requires a compute shader pass (ideal for WebGPU).

---

## 3. Neural Radiance Caching & AI-Assisted Denoising

### 3.1 Neural Radiance Caching (NRC) - NVIDIA Research 2021+

NVIDIA's Neural Radiance Caching trains a small neural network DURING rendering to cache indirect lighting:

- Path tracer traces 1-2 bounces explicitly
- At the terminal bounce, query the neural cache instead of tracing further
- The neural network is trained online using full-length paths from a subset of pixels
- Uses a compact hash-grid encoding (similar to instant-NGP) for fast inference

**Key result:** Achieves quality equivalent to 8-16 bounce path tracing while only explicitly tracing 1-2 bounces. The neural network learns the light transport function for the current scene in real-time.

**Applicability to GMT:** This is currently impractical in WebGL (no compute shader for neural network inference). With WebGPU compute shaders, a simplified version using a small MLP with hash-grid encoding could potentially be implemented. However, the complexity is very high for a browser application.

### 3.2 Real-Time Denoising: SVGF and A-SVGF

The current state of the art for real-time path tracing denoising:

**SVGF (Spatiotemporal Variance-Guided Filtering):**
- Temporal reprojection using motion vectors (screen-space velocity)
- Bilateral spatial filtering guided by normals, depth, albedo
- A-trous wavelet decomposition for efficient large-kernel filtering
- Variance estimation drives adaptive filter strength
- Used in Minecraft RTX, Quake II RTX

**A-SVGF (Adaptive SVGF):**
- Improves temporal reuse by adapting based on variance changes
- Moment buffer drives both filtering and accumulation
- Reduces ghosting compared to plain SVGF

**Key implementation elements:**
- G-buffer prepass: normals, depth, albedo, velocity vectors, object/material IDs
- History management: accumulation factor based on temporal stability
- Disocclusion detection: plane distance test, normal comparison, mesh ID matching
- Firefly rejection: variance-based clamping of extreme samples

**Applicability to GMT:** SVGF is the most practical denoiser for your architecture. Your current accumulation buffer approach (progressive refinement) is essentially temporal-only. Adding spatial filtering (a-trous bilateral with normal/depth guidance) would dramatically improve 1-4 spp quality. The main challenge is computing reliable motion vectors in a fractal scene (no mesh, so must use screen-space reprojection from camera delta).

### 3.3 ReSTIR (Reservoir-Based Spatiotemporal Importance Resampling)

**Original ReSTIR (SIGGRAPH 2020):**
- Handles millions of dynamic light sources in real-time
- Reservoir sampling reuses light sample statistics across pixels and frames
- 6-60x faster than prior methods (unbiased), 35-65x (biased)
- 3.4 million emissive triangles rendered in under 50ms with max 8 rays/pixel

**ReSTIR GI (HPG 2021):**
- Extends ReSTIR to indirect illumination / global illumination
- Resamples multi-bounce indirect lighting paths across space and time
- At 1 spp per frame: 9.3x to 166x MSE improvement vs naive path tracing
- Combined with denoising, achieves real-time path traced GI

**Applicability to GMT:** ReSTIR is primarily valuable for scenes with many light sources. For fractal rendering with 1-4 lights, the overhead may not be justified. However, ReSTIR GI's concept of reusing indirect bounce samples across neighboring pixels and frames is highly relevant -- it's essentially a more principled version of spatial/temporal filtering for indirect lighting.

### 3.4 Intel Open Image Denoise (OIDN)

Machine learning autoencoder that takes noisy image + albedo + normals to produce denoised output. Not real-time in the browser, but the architectural concept (auxiliary buffer guidance) is valuable. The key insight: **auxiliary feature buffers (albedo, normals) are noise-free and dramatically improve denoiser quality** even with trivial spatial filters.

### 3.5 Blue Noise Sampling

Blue noise sampling patterns significantly improve both visual quality and denoiser effectiveness:

- Spatially uniform error distribution (no clumping artifacts)
- Better temporal stability than white noise
- Screen-space blue noise diffusion hierarchically orders pixels for Monte Carlo sampling
- Can be implemented as a precomputed blue noise texture sampled per-pixel

**Applicability to GMT:** Replacing white noise with blue noise in your path tracer's random sampling is a simple, high-impact change. Load a 128x128 blue noise texture and use `texelFetch(blueNoise, ivec2(gl_FragCoord.xy) % 128, 0)` as your random seed.

---

## 4. WebGPU Compute Shader Advantages Over WebGL

### 4.1 Key Advantages for Raymarching

| Feature | WebGL | WebGPU |
|---------|-------|--------|
| Compute shaders | No (fragment shader hacks) | Native compute pipelines |
| Storage buffers (read/write) | No | Yes |
| Workgroup shared memory | No | Yes |
| Buffer readback | Slow (readPixels) | Efficient mapping |
| Multi-pass without texture ping-pong | No | Yes (storage buffers) |
| Indirect dispatch | No | Yes |
| Explicit resource binding | No (global state) | Yes (bind groups) |

### 4.2 Performance Numbers

- TensorFlow.js: **3x performance gain** moving from WebGL to WebGPU (GPU compute workloads)
- Babylon.js: "Snapshot Rendering" scenes submitted **10x faster** than WebGL 2
- Physics simulation: 14,000 objects within 16ms budget on M1 MacBook
- Workgroup sizes: up to 256 invocations, recommended default 64

### 4.3 Specific Benefits for Fractal Path Tracing

1. **Compute shader raymarching:** Write ray results to storage buffers instead of render targets. Enables arbitrary data per ray (hit position, normal, iteration count, orbit trap values) without packing into RGBA.

2. **Tile-based adaptive rendering:** Compute shader can classify tiles (converged vs. noisy) and dispatch work only to noisy tiles via indirect dispatch. Massive savings for progressive rendering where center regions converge first.

3. **SDF caching:** Write SDF evaluations to a 3D storage texture from compute, read during subsequent path trace passes.

4. **Denoiser passes:** SVGF spatial filtering with workgroup shared memory for the a-trous filter is much more efficient than fragment-shader ping-pong.

5. **Neural network inference:** Small MLPs for radiance caching could run as compute shaders with shared memory for weight storage.

### 4.4 Browser Support Status (as of 2025-2026)

- Chrome 113+: Windows, ChromeOS, macOS (stable since May 2023)
- Firefox: Nightly/Beta, progressing toward stable
- Safari/WebKit: Available in Safari 18+ (macOS Sequoia, iOS 18)
- Android Chrome: Available
- The spec is mature via W3C "GPU for the Web" working group

### 4.5 Migration Strategy for GMT

A practical path:
1. Feature-detect WebGPU availability
2. Run fractal SDF evaluation as compute shader writing to storage texture
3. Path tracing accumulation via compute (eliminates texture ping-pong)
4. Denoiser as compute pass with shared memory
5. Final compositing via render pipeline to screen
6. Fall back to current WebGL pipeline when WebGPU unavailable

---

## 5. Fractal-Specific Rendering Breakthroughs

### 5.1 Adaptive Iteration Depth

The most impactful fractal-specific optimization: reduce the iteration count of the fractal formula based on distance from camera:

```
int maxIter = int(mix(MAX_ITER, MIN_ITER, clamp(distance / fadeDistance, 0.0, 1.0)));
```

- Near camera: full iteration count for detail
- Far from camera: reduced iterations (detail is subpixel anyway)
- Combined with cone tracing, this provides principled LOD

### 5.2 Orbit Trap Caching

For path tracing with orbit traps (coloring), the orbit trap values from the primary ray hit can be cached and reused for secondary rays hitting nearby surfaces, avoiding redundant orbit trap computation during bounces.

### 5.3 Distance Estimator Refinement

For power-N Mandelbulb, the standard DE uses:
```
de = 0.5 * r * log(r) / dr
```

Common refinements:
- **Scaling factor:** Multiply by a user-controllable factor (0.5-2.0) to trade accuracy for speed
- **Bailout optimization:** Lower bailout radius for distance-only evaluation (no orbit traps needed for secondary rays)
- **Early exit:** If `r > bailout` before max iterations, the point is definitely exterior -- return immediately without completing all iterations

### 5.4 Polynomial Mandelbulb (Trig-Free)

The doubled-angle identity trick (Section 1.4) eliminates all trigonometric functions:
- Power-8: Apply `cos(2a)/sin(2a)` identity 3 times
- Power-4: Apply 2 times
- Arbitrary power-2^N: Apply N times
- Non-power-of-2 powers still need trig, but hybrid approaches exist

### 5.5 Continuous LOD via Smooth Iteration Count

For coloring, the smooth iteration count `n - log2(log2(r))` provides continuous rather than banded coloring. This also serves as a distance proxy that can guide adaptive sampling -- regions where the smooth iteration count varies rapidly have more geometric detail and need more samples.

---

## 6. Hardware Ray Tracing (RT Cores) Applied to Distance Fields

### 6.1 AABB Proxy Approach

The most practical method for using RT cores with SDFs:

1. Build a BVH of Axis-Aligned Bounding Boxes (AABBs) over the scene
2. Use hardware BVH traversal to find ray-AABB intersections
3. In the intersection shader, perform sphere tracing within the AABB
4. Report hit/miss back to the BVH traversal

**For fractals:** Create a uniform grid of small AABBs covering the fractal bounding volume. RT cores handle the spatial culling; intersection shaders do the local raymarching. This combines hardware acceleration for spatial queries with software flexibility for SDF evaluation.

### 6.2 Sparse AABB Grid

Optimization: only generate AABBs where the fractal surface exists. Pre-evaluate the SDF at grid centers; if the distance is larger than the AABB diagonal, the box is empty and can be culled. This creates a sparse acceleration structure.

### 6.3 Current Limitations for Web

- WebGPU does not yet expose ray tracing extensions
- Vulkan Ray Tracing extensions exist but are not in the WebGPU spec
- No timeline for WebGPU ray tracing pipeline
- **Conclusion:** RT core acceleration is not currently viable for browser-based rendering

---

## 7. Temporal Reprojection & Accumulation Improvements

### 7.1 Disocclusion Detection Methods

For fractal rendering, standard mesh-ID based disocclusion fails (no meshes). Instead:

- **Depth-based:** Compare reprojected depth with current depth. If difference exceeds threshold, invalidate history.
- **Normal-based:** Compare reprojected normal with current normal. Threshold on dot product.
- **Plane distance test:** Project current position onto the plane defined by the reprojected point and normal. More robust than pure depth comparison at grazing angles.
- **SDF value test (fractal-specific):** If the SDF value at the reprojected 3D position is significantly different from zero, the surface has moved and history is invalid.

### 7.2 Variance-Driven Accumulation

Instead of fixed-alpha blending between current and history:
- Estimate per-pixel variance from temporal moments (first moment = mean, second moment = mean of squares)
- High variance pixels: weight current sample more heavily (need fresh data)
- Low variance pixels: weight history more heavily (converged, preserve)
- This creates adaptive convergence rates across the image

### 7.3 Hit Point Reprojection for Reflections

For path-traced reflections on fractal surfaces:
- Store the 3D hit point of the reflected ray
- Reproject using the REFLECTED point's world position (not the primary surface)
- This provides much better temporal coherence for indirect lighting
- Use surface curvature to decide between primary and secondary reprojection

### 7.4 Tile-Based Convergence Detection

Divide the screen into tiles (8x8 or 16x16). Track per-tile variance:
- Converged tiles: skip path tracing, reuse accumulated result
- High-variance tiles: allocate more samples
- This creates adaptive sample allocation without per-pixel overhead
- Particularly effective for fractal rendering where smooth surfaces converge quickly but detailed edges need many more samples

### 7.5 Temporal Anti-Aliasing Integration

TAA and path tracing accumulation can be unified:
- Jitter camera position each frame (standard TAA)
- Accumulate path tracing samples across jittered frames
- Use velocity-based rejection to invalidate stale samples
- The jitter provides spatial anti-aliasing while temporal accumulation provides noise reduction
- **Key insight for fractals:** Camera-relative jitter in NDC space translates to different subpixel positions on the fractal surface, providing both AA and importance sampling diversity.

---

## 8. Practical Recommendations for GMT

Ranked by impact-to-effort ratio for your browser-based fractal renderer:

### High Impact, Low Effort
1. **Blue noise sampling** -- Replace white noise with blue noise texture. Simple texture load, dramatic visual improvement at low spp.
2. **Over-relaxation / step multiplier** -- Add a `uStepMultiplier` uniform (default 1.0, range 0.5-2.0). Multiply ray step by this factor. Instant speedup with user control.
3. **Adaptive iteration depth** -- Reduce fractal iteration count based on ray distance from camera. 2-4x speedup for distant geometry.
4. **Trigonometric elimination** -- If Mandelbulb.ts still uses sin/cos, switch to polynomial identity chain. 5x formula evaluation speedup.
5. **Analytical normals** -- Extend derivative tracking in DE to produce normals. Eliminates 4-6 extra SDF evaluations per normal.

### High Impact, Medium Effort
6. **SVGF-lite denoiser** -- Add spatial a-trous bilateral filter guided by normals and depth. Even 2-3 filter passes dramatically clean up 1-4 spp output.
7. **Tile-based convergence** -- Skip fully converged tiles during progressive rendering. Large savings after first few seconds.
8. **Improved disocclusion detection** -- Add plane-distance test and normal comparison to your temporal accumulation. Reduces ghosting artifacts during camera movement.

### High Impact, High Effort
9. **WebGPU compute pipeline** -- Migrate raymarching to compute shaders. Enables SDF caching, tile-based dispatch, efficient denoising, and storage buffers.
10. **SDF brick cache** -- Pre-evaluate and cache SDF values in a 3D texture for secondary ray reuse. Requires compute shader (WebGPU).
11. **ReSTIR-style indirect sample reuse** -- Share bounce samples between neighboring pixels across frames. Significant quality boost for GI at 1 spp.

### Future / Experimental
12. **Neural radiance caching** -- Requires WebGPU compute, complex implementation. Wait for WebNN API maturation.
13. **RT core acceleration** -- Not available in browsers. Monitor WebGPU ray tracing proposals.
14. **DLSS-style super resolution** -- Requires vendor-specific hardware. Not viable in web context.

---

## Sources Consulted

- iquilezles.org -- SDF techniques, Mandelbulb optimization, bounding volumes, analytical gradients, normals
- NVIDIA Research -- ReSTIR (SIGGRAPH 2020), ReSTIR GI (HPG 2021), Neural Radiance Caching, PSR
- WebGPU spec (gpuweb.github.io) -- Compute pipeline capabilities
- Chrome Developer Blog -- WebGPU features and browser support
- surma.dev -- WebGPU compute shader performance analysis
- alain.xyz -- Ray tracing denoising survey (SVGF, A-SVGF, OIDN, ReSTIR)
- diharaw.github.io -- Hybrid rendering with temporal/spatial denoising implementation
- webgpufundamentals.org -- WebGPU compute shader architecture
- SIGGRAPH 2023/2024 Advances in Real-Time Rendering course materials
- OpenVDB project -- Sparse volumetric data structures
