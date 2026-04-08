# Mesh Export Prototype — Architecture & Reference

> Standalone browser tool for converting GMT fractals (SDF) into triangle meshes (GLB/STL).
> Located in `public/mesh-export/` — `index.html` loads 8 JS modules via `<script>` tags. Accessible from the app via System Menu → Advanced → Mesh Export.
> No bundler, no React — runs as plain HTML + ES2020 scripts.

---

## File Structure

| File | Lines | Role |
|------|-------|------|
| `mesh-export.html` | ~400 | HTML/CSS, UI state, logging, cancel support, `generate()` orchestrator, mesh preview |
| `dc-core.js` | ~370 | Growable typed arrays, dense uniform-grid dual contouring (≤256³) |
| `sdf-eval.js` | ~160 | CPU SDF evaluators for Mandelbulb/KaliBox (float64 Newton) |
| `sparse-grid.js` | ~550 | `SparseSDFGrid`, narrow-band construction, sparse DC, growable typed arrays |
| `mesh-postprocess.js` | ~280 | Smoothing, degenerate removal, normals, winding, vertex merge |
| `mesh-writers.js` | ~240 | `BinaryWriter`, GLB export (FLOAT VEC4 colors), STL export |
| `formula-system.js` | ~550 | GMF parser, built-in formulas, GLSL shader builders, dynamic UI, uniform binding |
| `gpu-pipeline.js` | ~300 | WebGL helpers, SDF pipeline setup, shared sampling helpers (`bindPipelineUniforms`, `coarsePrePass`, `sampleSliceWithSubZ`), dense/sparse sampling, GPU Newton, GPU coloring, VDB generation |

Scripts are loaded in dependency order: `dc-core → sdf-eval → sparse-grid → mesh-postprocess → mesh-writers → formula-system → gpu-pipeline`. A single WebGL2 context is created once in `generate()` and passed to all GPU phases; `loseContext()` is called only at the end.

---

## Pipeline Overview

The exporter runs a 6-phase pipeline, each isolated with its own try/catch and progress tracking:

```
Phase 1: GPU SDF Sampling → Phase 2: Dual Contouring → Phase 3: Newton Projection
→ Phase 4: Post-processing → Phase 5: Vertex Coloring → Phase 6: GLB/STL Export
```

---

## Phase 1: GPU SDF Volume Sampling

### Dense Mode (≤256³)
A single `Float32Array(N³)` stores the full SDF grid. Each Z-slice is rendered via a fullscreen quad fragment shader that evaluates `formulaDE()` at each voxel center with configurable supersampling (1³–4³ samples per voxel).

### Narrow-Band Mode (>256³)
Two-pass approach to avoid allocating the full N³ grid:

1. **Coarse pass** — 128³ dense grid identifies where the surface is.
2. **Band construction** — `buildNarrowBand()` in `sparse-grid.js` flags coarse cells near sign changes, maps them to fine-resolution blocks (block size 8), allocates only those blocks.
3. **Fine pass** — `sampleSparseGrid()` in `gpu-pipeline.js` renders only Z-slices that contain allocated blocks, and within each slice only reads back the bounding region of active blocks (not the full N×N). The readback buffer is pre-allocated once at the maximum region size across all slices (not per-slice).

The sparse grid uses block-sparse storage: a `Map<blockKey, Float32Array(blockSize³)>`. `blockKey = bz * bpa² + by * bpa + bx` where `bpa = N / blockSize`.

### SDF Shader Composition (formula-system.js)
`buildSDFFrag(config, deSamples)` assembles the fragment shader from:
- `GLSL_UNIFORMS` — standard GMT uniform declarations (uParamA–F, uVec2A–C, uVec3A–C, uVec4A–C, uJulia, uJuliaMode, uEscapeThresh, uDistanceMetric, plus `#define uIterations uIters` alias and `vec4 g_orbitTrap` variable)
- `GLSL_HELPERS` — sphereFold, boxFold, getLength, snoise (full simplex noise), rotation stubs (identity)
- `config.shaderPreamble` — formula-specific global variables and helper functions (e.g., Sierpinski pre-computed rotation)
- `config.shaderFunction` — the `void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)` function
- `config.shaderInit` — code that runs before the iteration loop (e.g., calling preamble init functions)
- `config.shaderLoop` — the iteration body (typically `formula_NAME(z, dr, trap, c);`)
- `config.shaderDist` — optional custom distance estimator block
- `formulaDE()` wrapper — handles three DE types with the appropriate return logic
- `main()` — voxel center computation, supersampling loop, inside/outside classification

**Shared shader helpers**: `_buildGetDistBlock()`, `_buildDEReturn()`, and `_buildIterationLoop()` are used by both `buildSDFFrag` and `buildNewtonFrag` to avoid duplication of the iteration loop and DE return logic.

### DE Types

| Type | Detection | Distance Return |
|------|-----------|-----------------|
| `power` | Default / `pow()` in loop | `0.5 * log(r) * r / safeDr` if orbit escaped (`r > 2.0`), else `-1.0` (interior sentinel) |
| `ifs` | `boxFold`/`sphereFold` in code, or linear `dr = dr * scale` without `pow()` | `(r - 1.0) / safeDr - threshold` where threshold = half voxel in world space |
| `custom` | `shaderDist` block present | Delegates to `_getDistCustom()`, optionally subtracts IFS threshold |

**Key quirk — IFS fractals**: The DE for IFS fractals (KaliBox, Sierpinski, Mandelbox) never truly crosses zero because `dr` grows exponentially, making DE values ~1e-10 near the surface. The iso-threshold subtraction (`DE - 0.5 * voxelSize`) creates artificial sign changes that dual contouring can detect.

**Key quirk — Power fractals**: The orbit must escape (`r > 2.0`) for the analytic log-based DE to be valid. Non-escaped orbits are interior and return `-1.0` as a sentinel. An earlier bug returned DE for non-escaped orbits (`r > 1e-5`), which caused the outer sphere to get cut off at low iterations.

### DE Supersampling
Configurable N³ samples per voxel (N = 1, 2, 3, or 4). Compiled as `const int SS = N` in GLSL — the GPU unrolls loops at compile time, so there's no branch overhead. Samples are placed on a uniform sub-grid within the voxel with slight jitter for anti-banding. The SDF value is computed as:
- All outside → average distance
- All inside → negative (scaled by inside ratio)
- Mixed → lerp between `-minOutside` and `+minOutside` based on outside ratio

### Live Preview
The SDF preview canvas (left, 512×512) updates during sampling, showing a live cross-section sweep:
- **Dense mode**: Updates every Z-slice with full grid data. Green contour lines show the surface, red tint shows interior.
- **Narrow-band mode**: Shows the narrow-band region with SDF visualization (green contours, red interior). Unsampled regions outside the band are shown in dark gray. Updates every 8 Z-slices for performance.

Preview resolution is capped at min(N, 512) and downsampled to canvas size.

---

## Phase 2: Dual Contouring

### Dense DC (`dualContour` in dc-core.js)
Standard dual contouring on a uniform grid, using `GrowableFloat32`/`GrowableUint32` for positions, normals, and indices:
1. **Phase 1 (vertices)**: Iterate all cells, check 8 corners for sign changes, find edge crossings via 8-iteration binary search on trilinearly interpolated SDF, solve QEF (quadratic error function) to place vertex within cell, store gradient-based normal.
2. **Phase 2 (faces)**: For each vertex cell, check 12 edges for sign changes, deduplicate edges via a `Set`, find 4 neighboring cells sharing each edge, emit 2 triangles per quad.

### Sparse DC (`dualContourSparse` in sparse-grid.js)
Same algorithm but operating on block-sparse storage:
- **Vertex index storage**: Per-block `Int32Array(blockSize³)` initialized to -1, stored in `blockVertexMaps` Map. Replaces a global Map which would hit V8's 2²⁴ entry limit at high resolutions.
- **Edge dedup**: Per-block `Uint8Array(blockSize³)` with 3 bit flags per cell (one per axis), stored in `blockEdgeMaps`.
- **Phase 2 iteration**: Iterates `blockVertexMaps` entries directly (recovering block coordinates from the key), avoiding the need for a separate `cellCoords` array.

### Memory Optimization
`GrowableFloat32` and `GrowableUint32` (defined in `dc-core.js`, used by both dense and sparse DC) are typed arrays that double in capacity on overflow, storing values at 4 bytes each vs ~8 bytes for boxed JS array doubles. This saves ~1.4 GB at 20M vertices.

The `cellCoords` array (which stored `[ix, iy, iz]` per vertex for phase 2) was eliminated entirely — phase 2 now iterates the block vertex maps directly, recovering cell coordinates from block position + local index.

### Sign Compression (sparse DC)
Between DC phase 1 (vertex generation) and phase 2 (face generation), the sparse grid's Float32 SDF data is compressed to a bit-packed sign map (1 bit per cell) and the float data is freed. This saves ~3 GB at 2048³ — phase 2 only needs to know whether each cell is positive or negative for edge crossing detection and winding direction, not the actual SDF values. The sign maps use `(blockCellCount + 7) >> 3` bytes per block (~64 bytes for blockSize=8) vs 2048 bytes for the original Float32Array.

### Async Yielding & Cancellation
Both DC functions are `async` and yield to the browser every 64 blocks (sparse) or 8 Z-slices (dense) via `setTimeout(0)`. This prevents Chrome's "page unresponsive" dialog during multi-minute DC runs. At each yield point, the global `cancelRequested` flag is checked, throwing `CANCELLED` to abort the pipeline cleanly.

---

## Phase 3: Newton Projection

Projects DC vertices onto the true isosurface for sub-voxel accuracy.

### CPU Path (builtins only)
For Mandelbulb and KaliBox, the formula is implemented in JavaScript (`sdf-eval.js`) using float64. Each vertex gets 6 Newton steps: evaluate SDF, compute gradient via central differences, step along gradient by `-d * g`. Safety checks: max projection distance = 2 voxels, divergence detection (abort if |d| grows by >1.5×).

### GPU Path (all formulas including GMF)
`buildNewtonFrag(config)` in `formula-system.js` assembles a shader identical to the SDF shader but reading vertex positions from a `RGBA32F` texture and outputting refined positions + normals via MRT (2 color attachments). Vertices are packed into a square texture (`texW = ceil(sqrt(vertexCount))`). The shader runs the same `formulaDE()` and `sdfGradient()` as the SDF pass (via shared `_buildIterationLoop` / `_buildDEReturn` helpers).

`gpuNewtonProject(gl, mesh, ...)` in `gpu-pipeline.js` accepts the existing WebGL context (no new context created), uploads vertex data, runs the Newton shader, reads back refined positions + normals, and cleans up GPU resources (textures, FBO, program) without calling `loseContext()`.

**Quirk**: At 20M vertices, the Newton texture is ~4500×4500 × 16 bytes × 3 textures ≈ 960 MB of GPU memory. This can exceed VRAM on some cards.

---

## Phase 4: Post-processing

All post-processing lives in `mesh-postprocess.js`. The pipeline function `postProcessMesh(mesh, options)` runs the steps below with automatic large-mesh guards.

### Taubin Smoothing
Laplacian smoothing with alternating positive/negative factors (λ=0.5, μ=-0.53) to avoid shrinkage. Requires building an adjacency structure (per-vertex `Set` of neighbors → `Uint32Array`).

**Memory limit**: `buildAdjacency` creates one `Set` per vertex (~100+ bytes overhead each). At >5M vertices this exceeds 500 MB, so smoothing is automatically skipped for large meshes with a warning logged.

### Degenerate Face Removal
Removes zero-area triangles (cross product magnitude < 1e-20). Also skipped for meshes >5M faces to avoid JS array overhead.

### Vertex Merge
`mergeCloseVertices(mesh, epsilon)` uses spatial hashing (cell size = epsilon) to merge vertices within epsilon distance. Checks the 3×3×3 neighborhood of grid cells for each vertex. Produces a new mesh with deduplicated positions/normals and remapped indices.

### Vertex Normal Recomputation
Area-weighted face normals accumulated per vertex, then normalized. Always runs regardless of mesh size (operates on existing typed arrays, no extra allocations).

### Winding Consistency
`ensureConsistentWinding(mesh)` orients triangle winding so face normals point outward from the mesh centroid.

---

## Phase 5: Vertex Coloring (GPU)

Runs the formula iteration loop on each vertex position to compute orbit trap values, maps to a false-color palette (dark blue → orange → gold → white). Vertex positions are packed into a `RGBA32F` texture, colorized via a fragment shader, read back as `RGBA8`.

`buildColorFrag(config)` in `formula-system.js` builds the color shader. `colorizeVerticesGPU(gl, mesh, ...)` in `gpu-pipeline.js` handles the GPU pipeline (accepts the shared GL context).

The color shader uses the same `GLSL_UNIFORMS + GLSL_HELPERS + shaderPreamble + shaderFunction` as the SDF shader, but runs the iteration without computing DE — just accumulates `trap = min(trap, length(z.xyz))`.

**Color supersampling**: At high iterations, orbit trap values become chaotic — tiny position changes produce wildly different colors, causing splotchy vertex colors. The `colorSamples` parameter (1–64, default 8) renders multiple passes with jittered positions and accumulates into a `RGBA32F` FBO using additive blending. Jitter offsets use a Fibonacci sphere distribution with volume-filling radius scaling (`cbrt` falloff), covering a sphere of radius `0.5 × voxelSize` around each vertex. The accumulated colors are averaged on readback. Cost scales linearly with sample count.

---

## Phase 6: Export

### GLB (glTF Binary)
- Positions: `VEC3 FLOAT` with min/max bounds
- Normals: `VEC3 FLOAT`
- Vertex colors: `VEC4 FLOAT` (not `UNSIGNED_BYTE` normalized — C4D has known issues with that)
- Indices: `SCALAR UNSIGNED_INT`
- Material: PBR with `baseColorFactor: [1,1,1,1]`, `metallicFactor: 0.0` — required for vertex colors to display in Cinema 4D
- `BinaryWriter` class handles little-endian encoding with grow-on-demand buffer

### STL (Binary)
Standard 80-byte header + per-face normal + 3 vertices + attribute byte count. No vertex colors (STL spec doesn't support them).

### VDB (OpenVDB)
VDB export runs a standalone pipeline in `generateVDB()` (`mesh-export/gpu/gpu-pipeline.ts`) — separate from the mesh pipeline. It samples the SDF slice-by-slice via GPU and builds a VDB tree directly, never allocating a full grid or mesh.

**VDB file format**: Files follow the OpenVDB binary format (version 224). Each grid is written as interleaved descriptor + stream offsets + data block. The format is:

```
[File header: magic, version, UUID, metadata count, grid count]
For each grid:
  [Descriptor: name, type string, instance parent (empty)]
  [3x int64: gridPos, blockPos, endPos]
  [Data: compression flag, metadata, AffineMap transform, tree topology + leaf buffers]
```

**Density grid**: Scalar half-float (`Tree_float_5_4_3_HalfFloat`). 5-4-3 tree with 32768 N5 entries, 4096 N4 entries, 8^3 leaf blocks. Values are `uint16` half-float. `is_saved_as_half_float: true`.

**Color grid (optional)**: When "Include color grids" is enabled, a second `Cd` grid is written as `vec3s` float (`Tree_vec3s_5_4_3`). Each voxel stores RGB as 3x `float32` (0.0–1.0). The color pass:
1. Walks all active voxels in the density tree to collect world positions
2. Packs positions into a GPU texture
3. Runs the orbit-trap color shader (same as mesh vertex coloring)
4. Builds a `Vec3VDBTree` with matching leaf topology
5. Serializes as a standard OpenVDB `vec3s` grid named `Cd`

Key vec3s format differences from scalar:
- Background value is 12 bytes (3 floats) vs 4 bytes (1 float) in the tree header
- Tile values: N5 = 32768×3 floats, N4 = 4096×3 floats
- Leaf data: 512×3 floats (interleaved AoS: `[r0,g0,b0, r1,g1,b1, ...]`)
- Compression metadata byte is always `6` (`NO_MASK_AND_ALL_VALS` enum), not a size
- `is_saved_as_half_float: false`

**VDB filenames** include resolution, content tag, and timestamp: `mandelbulb-512-density-color-202604081430.vdb`.

**Tree optimization**: `optimizeTree()` / `optimizeVec3Tree()` promotes uniform leaf blocks to N4 tiles, and uniform N4s to N5 tiles, reducing file size for solid interior and uniform-color regions.

### Shared Sampling Helpers (gpu-pipeline.ts)
Both the dense mesh and VDB pipelines share three helpers extracted to avoid code duplication:

- **`bindPipelineUniforms()`**: Sets common SDF uniforms (power, iters, invRes, boundsMin, boundsRange, formula params, FBO). Used by dense, sparse, and VDB sampling paths.
- **`coarsePrePass()`**: At resolutions >128³, samples a fast 128³ coarse SDF grid to detect the Z range containing fractal data. Returns `{zSliceMin, zSliceMax}` aligned to block boundaries (multiples of 8). At 2048³ this typically skips 30–50% of slices. Used by both dense mesh and VDB paths (the sparse mesh path has its own narrow-band coarse pass).
- **`sampleSliceWithSubZ()`**: Samples one Z-slice into a flat `Float32Array(N*N)` slab. Handles GPU tiling for `N > tileSize`. When `zSubSlices > 1`, samples multiple sub-Z positions within the voxel and averages. Used by both dense mesh and VDB paths.

**Z sub-slice averaging**: Configurable 1–16 sub-slices per voxel layer. For each Z layer, the GPU renders multiple sub-Z positions evenly spaced within the voxel, and the SDF values are averaged. This smooths inter-voxel Z transitions that otherwise appear as visible contour/banding artifacts in both mesh and volume exports. Default is 4 sub-slices. Cost scales linearly with sub-slice count.

**Density conversion**: SDF → density uses a linear falloff: interior (`sdf < 0`) maps to 255 (full density), exterior maps to `255 * (1 - sdf / (voxelSize * 2.5))` clamped to [0, 255]. The 2.5-voxel transition band provides a smooth surface in volume renders.

---

## Formula System (formula-system.js)

### Built-in Formulas
`BUILTIN_MANDELBULB` and `BUILTIN_KALIBOX` are defined as pseudo-GMF config objects with the same structure as parsed GMF files. They include `shaderFunction`, `shaderLoop`, metadata with parameters and `defaultPreset`.

### GMF Loading
`parseGMFStandalone()` extracts XML-like tags from `.gmf` files:
- `<Metadata>` — JSON with name, parameters array, defaultPreset
- `<Shader_Preamble>` — global GLSL variables/helpers (e.g., pre-computed rotation)
- `<Shader_Function>` — the formula function
- `<Shader_Loop>` — iteration body
- `<Shader_Init>` — pre-loop initialization
- `<Shader_Dist>` — custom DE block
- `<Scene>` — full scene state (coreMath values overlaid onto defaultPreset so UI shows actual saved values, not factory defaults)

### DE Type Auto-Detection
`classifyDEType(config)` examines the GLSL source:
- Has `shaderDist` → `custom`
- Contains `boxFold`/`sphereFold` → `ifs`
- Contains `dr = dr * scale` without `pow()` → `ifs` (catches Sierpinski-type)
- Contains `abs(z` + `dr *=` without `pow()` → `ifs`
- Otherwise → `power`

### Parameter UI
`buildFormulaUI(config)` dynamically generates input elements from `metadata.parameters`. Supports scalar (`paramA`–`paramF`), `vec2` (2 component inputs), `vec3` (3 components), `vec4` (4 components). Values are read from the `<Scene>` block's coreMath if present, falling back to `defaultPreset`, then parameter defaults.

`readFormulaParams()` reads all UI inputs back into a flat params object with arrays for vector types: `{ paramA: 8, vec3B: [0.1, 0.2, 0.3], julia: [x, y, z], juliaMode: true, ... }`.

### Uniform Binding
`setFormulaUniforms(gl, loc, params)` maps the params object to GL uniform calls. Uses `!== undefined` checks (not `|| 0`) so that intentional zero values are passed through correctly. All standard GMT uniform types are supported: `uParamA–F` (float), `uVec2A–C` (vec2), `uVec3A–C` (vec3), `uVec4A–C` (vec4), `uJulia` (vec3), `uJuliaMode` (float), `uEscapeThresh` (float), `uDistanceMetric` (float).

---

## UI & Logging

### Log Panel
On-screen log at bottom of page with timestamped, color-coded entries. Each line includes JS heap size (via `performance.memory`). Types: `phase` (green bold), `data` (blue), `warn` (orange), `error` (red bold), `mem` (purple), `success` (green). Copy Log button writes all raw lines to clipboard.

### Progress Bars
- **Main bar** (green gradient) — overall pipeline progress 0–100%
- **Phase bar** (blue gradient, thinner) — current phase progress with label. All phases now correctly update both bars: SDF sampling, DC, Newton projection, post-processing, coloring, and export.

### Cancel Button
A Cancel button replaces the Generate button during export. It sets `cancelRequested = true`, which is checked at every async yield point (sampling, DC, Newton). The pipeline uses `try/finally` to ensure WebGL context cleanup and button state reset on cancel, error, or completion.

### Preview Canvas
The preview canvas (512×512) supports three modes that switch automatically based on pipeline state:

**SDF Preview** (`mode: 'fractal'`): WebGL2 raymarched preview of the fractal formula with orthographic camera. Supports bounding box overlay with draggable size/center handles.

**Slice Preview** (`mode: 'slice'`): 2D grayscale display of SDF sampling progress during generation.

**Mesh Preview** (`mode: 'mesh'`): Wireframe visualization of the generated mesh. For large meshes (>150K faces), faces are sampled at uniform stride to prevent spatial clustering artifacts.

**Camera controls** (shared by SDF and Mesh modes):
- **Left mouse drag**: Orbit (angle/pitch)
- **Right mouse / middle mouse drag**: Pan (translates camera target)
- **Scroll wheel**: Zoom (0.5×–20× for SDF, 0.1×–10× for mesh)
- **Shift + drag**: Snap to nearest cardinal axis (Front/Back/Left/Right/Top/Bottom)
- **Camera preset toolbar**: Bottom bar with F/B/L/R/T/D buttons for instant axis views, C to reset pan
- **Controls hint**: Overlay shows "LMB orbit · RMB pan · Scroll zoom · Shift snap"

The preview switches back to SDF mode when Generate is clicked again (previous mesh result is cleared).

### Error Handling
- Each pipeline phase has its own try/catch with error + stack trace logged
- Shader compile errors log the offending GLSL source lines
- Non-critical phases (Newton, coloring) continue on failure
- Global `window.error` and `unhandledrejection` handlers catch uncaught errors

---

## Memory Budget (at 20M vertices / 768³)

| Component | Size | Notes |
|-----------|------|-------|
| Sparse grid (phase 1) | ~460 MB | Block-sparse Float32 storage (freed before phase 2) |
| Sign maps (phase 2) | ~12 MB | Bit-packed sign data, replaces Float32 grid |
| Block vertex maps | ~480 MB | Int32Array per allocated block |
| GrowableFloat32 positions | ~240 MB | 20M × 3 × 4 bytes |
| GrowableFloat32 normals | ~240 MB | Same |
| GrowableUint32 faces | ~480 MB | 40M × 3 × 4 bytes |
| **DC total** | **~1.5 GB** | Within Chrome's ~4 GB tab limit |
| Post-processing | Skipped | >5M vertices, adjacency too large |
| Color texture | ~320 MB | RGBA32F for vertex positions |
| GLB binary | ~1.3 GB | positions + normals + colors + indices |

**Sign compression**: Between DC phase 1 and phase 2, the sparse grid's Float32 data is compressed to 1-bit-per-cell sign maps and freed. At 2048³ with 1.5M blocks, this saves ~3 GB (from ~3 GB Float32 to ~96 MB bit-packed signs). This was the key fix for OOM crashes at 2048³ resolution — the old approach kept the full Float32 grid alive during face generation, pushing total memory to ~8 GB and exceeding system limits.

Previous implementation used JS arrays (8 bytes/boxed double) which consumed ~3.4 GB for DC intermediates alone, causing tab crashes at 768³.

---

## Known Limitations & Future Work

- **Formula-specific uniforms** (e.g., `uSierpinski_rotCos`): Formulas that declare global GLSL variables in their preamble work fine, but if a formula references a uniform not in the standard set, it will fail to compile. The preamble system handles the common case of pre-computed values.
- **Smoothing disabled for large meshes**: >5M vertices skips Taubin smoothing due to adjacency memory. Could be replaced with a spatial hash-based smoother.
- **No mesh decimation**: High-res exports can produce 20M+ vertex meshes. A simplification pass would be valuable.
- **Auto bounding box**: Auto-fit button uses a coarse 64³ SDF probe to detect occupied region. Manual adjustment via draggable handles in preview.
- **GPU Newton memory**: At 20M vertices, Newton textures consume ~960 MB GPU memory. Could be batched.
- **Single-threaded DC**: The async yielding prevents UI freezing but doesn't parallelize. A Web Worker approach would allow true background processing.
- **VDB XY banding**: Z sub-slicing smooths Z-axis banding, but equivalent XY banding may be visible. The in-shader DE supersampling (deSamples) helps but operates within single voxels. A similar sub-pixel averaging approach could be applied to XY if needed.
