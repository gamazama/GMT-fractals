---
source: mesh-export/pipeline/mesh-pipeline.ts
lines: 1-820
last_verified_sha: 00190e8beb49a925ef781e78fb0e70f83e00f229
additional_sources:
  - mesh-export/main.tsx
  - mesh-export/pipeline/types.ts
  - mesh-export/store/meshExportStore.ts
  - mesh-export/algorithms/dc-core.ts
  - mesh-export/algorithms/sparse-grid.ts
  - mesh-export/algorithms/sdf-eval.ts
  - mesh-export/algorithms/sdf-filter.ts
  - mesh-export/algorithms/mesh-postprocess.ts
  - mesh-export/algorithms/mesh-writers.ts
  - mesh-export/algorithms/vdb-writer.ts
  - mesh-export/gpu/gpu-pipeline.ts
  - mesh-export/preview/mesh-preview.ts
  - mesh-export/preview/preview-camera.ts
  - mesh-export/components/MeshExportApp.tsx
  - mesh-export/components/MeshExportPage.tsx
  - mesh-export/components/ExportPanel.tsx
  - mesh-export/components/PipelineControls.tsx
  - mesh-export/components/FormulaSelector.tsx
  - mesh-export/components/PreviewCanvas.tsx
  - mesh-export/components/BoundsPanel.tsx
  - mesh-export/components/FormulaParams.tsx
  - mesh-export/components/ProgressPanel.tsx
audited: 2026-05-20T09:18:18Z
audited_by: claude-opus-4-7
public_api:
  - runMeshPipeline
  - runExportMesh
  - MeshPipelineParams
  - MeshPipelineResult
  - VDBExportParams
  - ExportResult
  - PipelineCallbacks
  - MeshWithColors
  - PipelineTimings
  - MeshExportApp
  - MeshExportPage
  - useMeshExportStore
  - registerSlicePreview
  - unregisterSlicePreview
  - emitSlicePreview
  - DEFAULT_QUALITY
  - ExportPanel
  - PipelineControls
  - FormulaSelector
  - PreviewCanvas
  - BoundsPanel
  - FormulaParams
  - ProgressPanel
  - loadGMFIntoStore
  - buildDefaultParams
  - dualContour
  - dualContourSparse
  - SparseSDFGrid
  - buildNarrowBand
  - forEachBandBlock
  - initWebGL
  - setupSDFPipeline
  - bindPipelineUniforms
  - coarsePrePass
  - sampleSliceWithSubZ
  - sampleDenseGrid
  - sampleSparseGrid
  - generateVDB
  - sampleEscapeTest
  - gpuNewtonProject
  - colorizeVerticesGPU
  - autoFitBounds
  - locateFormulaUniforms
  - applyMinFeatureDense
  - applyMinFeatureSparse
  - morphCloseDense
  - morphCloseSparse
  - cavityFillDense
  - cavityFillDilate
  - separableFilter
  - postProcessMesh
  - taubinSmooth
  - mergeCloseVertices
  - removeDegenerateFaces
  - computeVertexNormals
  - ensureConsistentWinding
  - exportGLB
  - exportSTL
  - estimateExportSize
  - downloadBlob
  - BinaryWriter
  - createTree
  - addLeafBlock
  - optimizeTree
  - serializeVDB
  - serializeMultiGridVDB
  - createVec3Tree
  - addVec3LeafBlock
  - optimizeVec3Tree
  - floatToHalf
  - BYTE_TO_HALF
  - meshPreviewRender
  - createMeshPreviewState
  - meshPreviewSetMesh
  - orthoCamBasis
  - orthoProject
  - findAxisSnap
depends_on:
  - g02-shader-pipeline
  - g03-fractal-registry
  - g08-save-load-gmf
  - g11-ddfs-features
---

# Mesh Export (g07)

Standalone TypeScript + React app that turns a `FractalDefinition` into a dual-contoured triangle mesh (GLB / STL) or a sparse OpenVDB volume. Lives at the top-level `mesh-export/` directory and is served by Vite as a separate entry point from the main GMT app.

The orchestrator is `runMeshPipeline` (mesh-export/pipeline/mesh-pipeline.ts:91), a five-phase async function: GPU SDF sampling → SDF filters → dual contouring → optional GPU Newton projection → post-process → optional GPU vertex colouring. Format encoding goes through a second entry point `runExportMesh` (mesh-export/pipeline/mesh-pipeline.ts:727) which handles GLB, STL, and VDB.

## Public API

### Entry & orchestration

| Symbol | Location | Role |
|---|---|---|
| `MeshExportApp` | mesh-export/components/MeshExportApp.tsx:12 | React root; mounted from `mesh-export/main.tsx:13`. Side-effect imports `app-gmt/registerFeatures` at `mesh-export/components/MeshExportApp.tsx:10`. |
| `MeshExportPage` | mesh-export/components/MeshExportPage.tsx:136 | Three-column layout shell (export/pipeline/bounds — preview/progress — formula/params). |
| `runMeshPipeline(params, ui)` | mesh-export/pipeline/mesh-pipeline.ts:91 | Five-phase mesh generation. Returns `MeshPipelineResult`. |
| `runExportMesh(format, lastMesh, lastBaseName, vdbParams, ui)` | mesh-export/pipeline/mesh-pipeline.ts:727 | Encodes to GLB / STL / VDB. |
| `MeshPipelineParams` | mesh-export/pipeline/types.ts:22 | Pipeline input shape (resolution, iters, bounds, quality, interlace, etc.). |
| `MeshPipelineResult` | mesh-export/pipeline/types.ts:67 | Return shape (mesh + timings + smoothingSkipped + useNarrowBand + gl). |
| `VDBExportParams` | mesh-export/pipeline/mesh-pipeline.ts:702 | VDB-specific subset (no mesh; needs definition + bounds). |
| `ExportResult` | mesh-export/pipeline/types.ts:76 | `{ blob, filename }`. |
| `PipelineCallbacks` | mesh-export/pipeline/types.ts:9 | All UI interaction goes through this — `log`, `setStatus`, `setPhase`, `setProgress`, `memAlloc`, `memFree`, `tick`, `checkCancel`, `onSlicePreview`, `MEM_COLORS`. |
| `MeshWithColors` | mesh-export/pipeline/types.ts:52 | `DCMeshResult` + optional `colors: Uint8Array` RGBA. |
| `PipelineTimings` | mesh-export/pipeline/types.ts:56 | Per-phase timings: `total / sdf / coarse / fine / dc / newton / post / color`. |

### Store

| Symbol | Location | Role |
|---|---|---|
| `useMeshExportStore` | mesh-export/store/meshExportStore.ts:205 | Zustand store. App-local — not shared with main `fractalStore`. |
| `DEFAULT_QUALITY` | mesh-export/store/meshExportStore.ts:43 | Default `MeshQualitySettings` (estimator=0, distanceMetric=0, surfaceThreshold=0). |
| `registerSlicePreview(cb)` | mesh-export/store/meshExportStore.ts:117 | Module-scoped slice-preview callback registry — bypasses Zustand to avoid React re-renders on every slice tick. |
| `unregisterSlicePreview()` | mesh-export/store/meshExportStore.ts:122 | Clear the registry slot. |
| `emitSlicePreview(imageData, w, h)` | mesh-export/store/meshExportStore.ts:127 | Pipeline-side push (called from `gpuCallbacks.onSlicePreview`). |

### Components

| Symbol | Location | Role |
|---|---|---|
| `ExportPanel` | mesh-export/components/ExportPanel.tsx:20 | Orchestrator UI — assembles `MeshPipelineParams`, calls `runMeshPipeline`/`runExportMesh`, handles cancel (both modules). |
| `PipelineControls` | mesh-export/components/PipelineControls.tsx:17 | Resolution preset + freeform 16–8192 custom; estimator/distance-metric; SS knobs; cavity-fill mode dropdown. |
| `FormulaSelector` | mesh-export/components/FormulaSelector.tsx:122 | Formula picker + GMF file loader. |
| `loadGMFIntoStore(text, filename?)` | mesh-export/components/FormulaSelector.tsx:39 | Parses a GMF blob and populates the store (formula, params, quality, interlace). |
| `buildDefaultParams(def)` | mesh-export/components/FormulaSelector.tsx:10 | Default param record from a `FractalDefinition`. |
| `PreviewCanvas` | mesh-export/components/PreviewCanvas.tsx:102 | 512² canvas, three modes (fractal raymarch / live SDF slice / mesh wireframe). |
| `BoundsPanel` | mesh-export/components/BoundsPanel.tsx:11 | Bbox centre / size sliders + auto-fit button (calls `autoFitBounds`). |
| `FormulaParams` | mesh-export/components/FormulaParams.tsx:17 | Auto-rendered param sliders driven by `def.params`. |
| `ProgressPanel` | mesh-export/components/ProgressPanel.tsx:14 | Status / phase / log / per-block memory bar (driven by `memAlloc`/`memFree`). |

### Algorithms — dual contouring

| Symbol | Location | Role |
|---|---|---|
| `dualContour(grid, N, gridMin, gridMax, _maxDepth, onProgress)` | mesh-export/algorithms/dc-core.ts:238 | Dense-array DC. |
| `dualContourSparse(...)` | mesh-export/algorithms/sparse-grid.ts:242 | Block-sparse DC — per-block edge dedup + progressive sign compression. |
| `SparseSDFGrid` | mesh-export/algorithms/sparse-grid.ts:34 | Block-sparse SDF storage (`Map<blockKey, Float32Array(blockSize³)>`). |
| `buildNarrowBand(...)` | mesh-export/algorithms/sparse-grid.ts:132 | Identifies surface-adjacent blocks from a coarse grid. |
| `forEachBandBlock(...)` | mesh-export/algorithms/sparse-grid.ts:224 | Iterator over allocated blocks. |

### Algorithms — GPU pipeline (mesh-export/gpu/gpu-pipeline.ts)

| Symbol | Line | Role |
|---|---|---|
| `initWebGL()` | mesh-export/gpu/gpu-pipeline.ts:256 | Create headless WebGL2 context (off-DOM canvas). |
| `setupSDFPipeline(...)` | mesh-export/gpu/gpu-pipeline.ts:283 | Builds the SDF fragment shader from `ShaderFactory.generateMeshSDFLibrary` + a local supersampling main. |
| `bindPipelineUniforms(...)` | mesh-export/gpu/gpu-pipeline.ts:405 | Threads `formulaParams` + bounds + interlace into the SDF program. |
| `coarsePrePass(...)` | mesh-export/gpu/gpu-pipeline.ts:439 | 128³ probe to clip the Z range before the fine dense pass. |
| `sampleSliceWithSubZ(...)` | mesh-export/gpu/gpu-pipeline.ts:525 | Z sub-slice averaging for band-artifact suppression. |
| `sampleDenseGrid(...)` | mesh-export/gpu/gpu-pipeline.ts:617 | Fine-resolution dense Float32 SDF readback. |
| `sampleSparseGrid(...)` | mesh-export/gpu/gpu-pipeline.ts:735 | Narrow-band sparse sampling (one block at a time). |
| `generateVDB(...)` | mesh-export/gpu/gpu-pipeline.ts:866 | Slab-by-slab VDB build (8 slices per slab) + optional batched RGBA32F colour pass. |
| `sampleEscapeTest(...)` | mesh-export/gpu/gpu-pipeline.ts:1266 | Per-block escape bitmap used by the "Escape Test" cavity-fill mode (narrow-band only). |
| `gpuNewtonProject(...)` | mesh-export/gpu/gpu-pipeline.ts:1428 | GPU Newton projection (MRT). Soft-fails — caller continues without projection. |
| `colorizeVerticesGPU(...)` | mesh-export/gpu/gpu-pipeline.ts:1547 | Vertex colouring via Fibonacci-sphere jittered samples into RGBA32F FBO. |
| `autoFitBounds(...)` | mesh-export/gpu/gpu-pipeline.ts:1689 | One-shot 64³ probe in `[-3,3]³`, returns centre + size with 15% padding. |
| `locateFormulaUniforms(...)` | mesh-export/gpu/gpu-pipeline.ts:272 | Pre-cache `gl.getUniformLocation` handles for the runtime param slots. |

### Algorithms — SDF filters (mesh-export/algorithms/sdf-filter.ts)

| Symbol | Line |
|---|---|
| `applyMinFeatureDense` | mesh-export/algorithms/sdf-filter.ts:16 |
| `applyMinFeatureSparse` | mesh-export/algorithms/sdf-filter.ts:28 |
| `separableFilter` | mesh-export/algorithms/sdf-filter.ts:46 |
| `morphCloseDense` | mesh-export/algorithms/sdf-filter.ts:100 |
| `morphCloseSparse` | mesh-export/algorithms/sdf-filter.ts:124 |
| `cavityFillDense` | mesh-export/algorithms/sdf-filter.ts:182 |
| `cavityFillDilate` | mesh-export/algorithms/sdf-filter.ts:296 |

### Algorithms — post-process (mesh-export/algorithms/mesh-postprocess.ts)

| Symbol | Line |
|---|---|
| `postProcessMesh` | mesh-export/algorithms/mesh-postprocess.ts:273 |
| `taubinSmooth` | mesh-export/algorithms/mesh-postprocess.ts:83 |
| `mergeCloseVertices` | mesh-export/algorithms/mesh-postprocess.ts:105 |
| `removeDegenerateFaces` | mesh-export/algorithms/mesh-postprocess.ts:177 |
| `computeVertexNormals` | mesh-export/algorithms/mesh-postprocess.ts:204 |
| `ensureConsistentWinding` | mesh-export/algorithms/mesh-postprocess.ts:236 |

### Algorithms — writers (GLB / STL)

| Symbol | Location |
|---|---|
| `exportGLB(mesh)` | mesh-export/algorithms/mesh-writers.ts:119 |
| `exportSTL(mesh, onProgress?)` | mesh-export/algorithms/mesh-writers.ts:245 |
| `estimateExportSize(mesh, format)` | mesh-export/algorithms/mesh-writers.ts:306 |
| `downloadBlob(blob, filename)` | mesh-export/algorithms/mesh-writers.ts:321 |
| `BinaryWriter` | mesh-export/algorithms/mesh-writers.ts:24 |

### Algorithms — VDB writer (mesh-export/algorithms/vdb-writer.ts)

| Symbol | Line | Tree |
|---|---|---|
| `createTree` | mesh-export/algorithms/vdb-writer.ts:158 | scalar half-float density |
| `addLeafBlock` | mesh-export/algorithms/vdb-writer.ts:177 | scalar |
| `optimizeTree` | mesh-export/algorithms/vdb-writer.ts:212 | scalar |
| `serializeVDB` | mesh-export/algorithms/vdb-writer.ts:531 | scalar only |
| `createVec3Tree` | mesh-export/algorithms/vdb-writer.ts:262 | vec3s colour |
| `addVec3LeafBlock` | mesh-export/algorithms/vdb-writer.ts:286 | vec3s |
| `optimizeVec3Tree` | mesh-export/algorithms/vdb-writer.ts:323 | vec3s |
| `serializeMultiGridVDB` | mesh-export/algorithms/vdb-writer.ts:589 | density (half) + Cd (vec3s); destructive — frees leaf data |
| `floatToHalf` | mesh-export/algorithms/vdb-writer.ts:67 | F32→F16 packing |
| `BYTE_TO_HALF` | mesh-export/algorithms/vdb-writer.ts:78 | 256-entry LUT for byte colours |

### Preview helpers

| Symbol | Location |
|---|---|
| `meshPreviewRender(state, ctx, w, h)` | mesh-export/preview/mesh-preview.ts:58 |
| `createMeshPreviewState()` | mesh-export/preview/mesh-preview.ts:22 |
| `meshPreviewSetMesh(...)` | mesh-export/preview/mesh-preview.ts:32 |
| `orthoCamBasis(angle, pitch)` | mesh-export/preview/preview-camera.ts:51 |
| `orthoProject(...)` | mesh-export/preview/preview-camera.ts:70 |
| `findAxisSnap(...)` | mesh-export/preview/preview-camera.ts:123 |

## Architecture

### Bootstrap

1. `mesh-export/main.tsx:10` mounts `<MeshExportApp />` under `React.StrictMode`.
2. `MeshExportApp` (mesh-export/components/MeshExportApp.tsx:12) side-effect-imports `app-gmt/registerFeatures` at line 10 — this is the **critical coupling** that populates the shared `registry` + DDFS feature tables before any shader generation.
3. The first effect (mesh-export/components/MeshExportApp.tsx:15) tries `localStorage.getItem('gmt-mesh-export-scene')` first (the hand-off slot the main GMT app writes when the user picks "Advanced → Mesh Export"); on miss it seeds `loadedDefinition` from `registry.get(state.selectedFormulaId)` with the default `'Mandelbulb'` (mesh-export/store/meshExportStore.ts:207).
4. `<MeshExportPage />` (mesh-export/components/MeshExportPage.tsx:136) renders the three-column layout.

### Five-phase pipeline (`runMeshPipeline`)

`useNarrowBand` is hardcoded as `N > 256` at mesh-export/pipeline/mesh-pipeline.ts:147. Each phase is wrapped in its own try/catch with `ui.checkCancel()` between them.

| # | Phase | Path | Code |
|---|---|---|---|
| 1 | GPU SDF (dense) | `coarsePrePass` → `sampleDenseGrid` | mesh-export/pipeline/mesh-pipeline.ts:209-322 |
| 1 | GPU SDF (narrow-band) | 128³ coarse → `buildNarrowBand` → `sampleSparseGrid` | mesh-export/pipeline/mesh-pipeline.ts:209-322 |
| 1b | Filters | `cavityFillDilate` / `cavityFillDense` / `sampleEscapeTest`, then `applyMinFeature{Dense,Sparse}`, then `morphClose{Dense,Sparse}` | mesh-export/pipeline/mesh-pipeline.ts:336-475 |
| 2 | Dual contouring | `dualContourSparse` (narrow-band) or `dualContour` (dense); frees SDF / sparseGrid after | mesh-export/pipeline/mesh-pipeline.ts:482-542 |
| 3 | GPU Newton | `gpuNewtonProject`; **soft-failing** (warning logged, continues without projection) | mesh-export/pipeline/mesh-pipeline.ts:552-578 |
| 4 | Post-process | `postProcessMesh`; smoothing auto-skipped above 5 M vertices | mesh-export/pipeline/mesh-pipeline.ts:586-614 |
| 5 | Vertex colour | `colorizeVerticesGPU`; reinit on lost context (mesh-export/pipeline/mesh-pipeline.ts:628-631); non-fatal failure | mesh-export/pipeline/mesh-pipeline.ts:622-647 |

The WebGL2 context returned in `MeshPipelineResult.gl` (mesh-export/pipeline/types.ts:73) is kept alive across phases and only force-lost on the error path (mesh-export/pipeline/mesh-pipeline.ts:686-693).

### Shader composition

mesh-export consumes engine-gmt's `SDFShaderBuilder` family (`MESH_SDF_VERT`, `MESH_FORMULA_UNIFORMS`, `buildMeshEscapeShader`, `buildMeshNewtonShader`, `buildMeshColorShader`) + `ShaderFactory.generateMeshSDFLibrary` (mesh-export/gpu/gpu-pipeline.ts:10-19). The local helper `buildMeshShaderConfig` (mesh-export/gpu/gpu-pipeline.ts:33-55) constructs a minimal `ShaderConfig` with the interlace block populated when an interlace config is present. `interlaceCompiled: true` is marked CRITICAL at mesh-export/gpu/gpu-pipeline.ts:43 — `Interlace.inject()` silently no-ops if false.

### Export paths (`runExportMesh`)

| Format | Behaviour |
|---|---|
| GLB | `exportGLB(lastMesh)` — vertex colours encoded as `FLOAT VEC4` (mesh-export/algorithms/mesh-writers.ts:110-117), PBR material with `baseColorFactor: [1,1,1,1]`. |
| STL | `exportSTL(lastMesh, onProgress)` — 64K-face chunked `BlobPart[]` to dodge the browser ~2 GB single-allocation cap (mesh-export/algorithms/mesh-writers.ts:259-296). |
| VDB | Bypasses the mesh pipeline. Fresh `initWebGL` → `generateVDB` → force-lose the context (mesh-export/pipeline/mesh-pipeline.ts:767, 782-784). |

`generateVDB` (mesh-export/gpu/gpu-pipeline.ts:866) streams 8 slices into `slabBuf[bs]` and flushes via `addLeafBlock`. Optional colour pass (`vdbColor: true` — mesh-export/pipeline/mesh-pipeline.ts:780) walks active voxels by popcount, packs world positions into an RGBA32F texture capped at 2048×2048 voxels per batch (mesh-export/gpu/gpu-pipeline.ts:1021-1025), runs `buildMeshColorShader`, scatters back via `addVec3LeafBlock`. `serializeMultiGridVDB` frees leaf data while serialising to lower peak memory.

### Slice-preview callback registry

The pipeline streams `ImageData` slice previews via `ui.onSlicePreview` → `emitSlicePreview` (mesh-export/store/meshExportStore.ts:127). PreviewCanvas is the sole consumer: it calls `registerSlicePreview` on mount (mesh-export/store/meshExportStore.ts:117). The registry deliberately lives **outside** Zustand so 60Hz GPU readbacks don't trash store subscribers.

### Preview canvas

`PreviewCanvas` (mesh-export/components/PreviewCanvas.tsx:102) is a 512² (mesh-export/components/PreviewCanvas.tsx:99) canvas in one of three modes — fractal raymarch / live SDF slice / mesh wireframe — selected from `isRunning` / `lastMesh` / `loadedDefinition` (mesh-export/components/PreviewCanvas.tsx:104-106). Bbox/params/interlace/iters/quality are subscribed only as re-render triggers; the actual values are read inside callbacks via `useMeshExportStore.getState()` to avoid stale-closure bugs in the `useCallback` chain. Mesh wireframe drawing (mesh-export/preview/mesh-preview.ts:58) has a hard `maxDraw = 150000` stride cap (mesh-export/preview/mesh-preview.ts:84). Camera math (orthographic basis + axis snap) is `mesh-export/preview/preview-camera.ts:51-147`.

### Store shape

`useMeshExportStore` (mesh-export/store/meshExportStore.ts:205) is one flat slice covering formula + GMF + quality + pipeline config + bbox + runtime progress + last-mesh result + last-export-blob. No DDFS feature slices — quality settings live in `qualitySettings` (mesh-export/store/meshExportStore.ts:34-50) and pipeline knobs are individual flat fields (mesh-export/store/meshExportStore.ts:64-87). `resetMeshResult` (mesh-export/store/meshExportStore.ts:335-339) nulls the cached mesh, blob, gl handle, log and memory blocks.

## Invariants

- **`useNarrowBand = N > 256`** is hardcoded in `runMeshPipeline` (mesh-export/pipeline/mesh-pipeline.ts:147). The two paths have separate cavity-fill, min-feature, morph-close, and DC implementations.
- **Two cancellation flags**, one per module. `requestCancel`/`resetCancel` are exported from both `mesh-export/algorithms/dc-core.ts:220-221` and `mesh-export/algorithms/sparse-grid.ts:21-22`. `ExportPanel` must reset/raise both (mesh-export/components/ExportPanel.tsx:107, 129).
- **Interlace compile gate**: `buildMeshShaderConfig` must set `interlaceCompiled: true` when an interlace config exists or `Interlace.inject()` silently no-ops. Commented CRITICAL at mesh-export/gpu/gpu-pipeline.ts:43.
- **IFS auto-threshold**: when `negCount === 0 && sdfMin > 0 && sdfMin < 10.0`, the pipeline shifts the SDF by `sdfMin + voxelSize*2` to create an artificial zero-crossing for IFS fractals (three sites: mesh-export/pipeline/mesh-pipeline.ts:378-397, 240-259, 306-321). Estimator `2` ("Pseudo Raw") is force-overridden to `1` for IFS at mesh-export/pipeline/mesh-pipeline.ts:128-132 because Pseudo Raw produces always-positive DE values for IFS orbits — no zero-crossing.
- **5 M vertex smoothing cliff**: `postProcessMesh` skips Taubin smoothing above 5 M vertices because `buildAdjacency` allocates one `Set` per vertex (mesh-export/algorithms/mesh-postprocess.ts:287-290). `mesh-export/pipeline/mesh-pipeline.ts:592` mirrors the same threshold for the `smoothingSkipped` flag.
- **5 M face degenerate-removal cliff**: `removeDegenerateFaces` is skipped above 5 M faces (mesh-export/algorithms/mesh-postprocess.ts:281-283).
- **GLB FLOAT VEC4 colour encoding** (16 bytes/vertex), not `UNSIGNED_BYTE` normalized — comment cites Cinema 4D / older Blender import bugs at mesh-export/algorithms/mesh-writers.ts:110-117. PBR material with `baseColorFactor: [1,1,1,1]` is required for DCCs to wire vertex colours to the colour channel.
- **STL streaming**: triangles encoded in 64 K-face chunks (~3.2 MB each) into a `BlobPart[]` to avoid the browser's ~2 GB single-allocation cap (mesh-export/algorithms/mesh-writers.ts:259-296).
- **VDB density is half-float** (`Tree_float_5_4_3_HalfFloat` via `floatToHalf` LUT — mesh-export/algorithms/vdb-writer.ts:67-79). Optional colour grid is `Tree_vec3s_5_4_3` (full float32 per channel). `serializeMultiGridVDB` is destructive — leaf data is freed during serialisation to reduce peak memory.
- **Slice preview registry is single-slot**: a second `registerSlicePreview` call overwrites the first; no fan-out (mesh-export/store/meshExportStore.ts:114-129).
- **WebGL context survives the mesh pipeline** (`MeshPipelineResult.gl` — mesh-export/pipeline/types.ts:73). VDB export always builds a *new* context and force-loses it on the way out (mesh-export/pipeline/mesh-pipeline.ts:767, 782-784) — it does not share the mesh pipeline's context.
- **`MEM_COLORS` palette** is hand-rolled in `ExportPanel` (mesh-export/components/ExportPanel.tsx:13-16) and threaded through `PipelineCallbacks.MEM_COLORS` (mesh-export/pipeline/types.ts:19) so the pipeline can call `ui.memAlloc(id, label, mb, ui.MEM_COLORS.sdfGrid)` without importing the UI palette directly.
- **Custom resolution allowed**: PipelineControls exposes a freeform 16–8192 input alongside the preset dropdown (mesh-export/components/PipelineControls.tsx:97-107); resolutions outside the preset list display as `${N}³ (custom)`.
- **Quality estimator 5 (Cutting Plane)** is gated on `loadedDef?.shader.supportsCuttingPlane` (mesh-export/components/PipelineControls.tsx:22, 38); other estimators always available.
- **`lastMesh` retention** (answered q-115): `lastMesh` is **not** GPU memory — it's `Float32Array`/`Uint32Array` heap buffers. It is freed by (a) the next Generate (mesh-export/components/ExportPanel.tsx:104-105 nulls `lastMesh` + `lastBlob`), (b) formula change via `FormulaSelector.handleSelect` calling `resetMeshResult` at mesh-export/components/FormulaSelector.tsx:142, gated by `confirmReset()` (mesh-export/components/FormulaSelector.tsx:132-138), or (c) tab close. No idle / `visibilitychange` eviction — by design, to avoid silently destroying a freshly-generated 20 M-vertex mesh.

## Interactions with other subsystems

- **g02-shader-pipeline** (engine-gmt `ShaderFactory` + `SDFShaderBuilder`) — mesh-export consumes `ShaderFactory.generateMeshSDFLibrary` plus the `MESH_SDF_VERT` / `MESH_FORMULA_UNIFORMS` / `buildMeshEscapeShader` / `buildMeshNewtonShader` / `buildMeshColorShader` family at mesh-export/gpu/gpu-pipeline.ts:10-19. The mesh-export interlace block must keep `interlaceCompiled: true` (mesh-export/gpu/gpu-pipeline.ts:43); the mesh-export interlace implementation is a parallel branch of engine-gmt's main-app interlace and the two MUST be kept in sync (called out in `docs/gmt/24_Formula_Interlace_System.md`).
- **g03-fractal-registry** — `registry` lookup at mesh-export/components/MeshExportApp.tsx:5, mesh-export/components/ExportPanel.tsx:3. Default formula `'Mandelbulb'` at mesh-export/store/meshExportStore.ts:207.
- **g11-ddfs-features** — `app-gmt/registerFeatures` is side-effect-imported at mesh-export/components/MeshExportApp.tsx:10. This populates the DDFS feature table so `ShaderFactory.generateMeshSDFLibrary` resolves `inject()` hooks the same way the main app does. **Skip this import and shader composition silently produces a feature-stripped library.**
- **g08-save-load-gmf** — `loadGMFIntoStore` (mesh-export/components/FormulaSelector.tsx:39) is the parser entry. Two callers: auto-load from `localStorage['gmt-mesh-export-scene']` at mesh-export/components/MeshExportApp.tsx:24, and the file picker inside `FormulaSelector`. Hand-off slot is written by the main app when the user picks "Advanced → Mesh Export".

## Known issues / Phase 2 carry-in

- **Pending q-116**: `mesh-export/components/PreviewCanvas.tsx` is 916 lines and combines three rendering modes, camera math, and bbox handle dragging. Future split candidate (bbox handle layer vs SDF preview vs mesh wireframe). Not deep-read in the audit.
- **Orphan-sweep candidate: `mesh-export/algorithms/sdf-eval.ts`** — entire CPU SDF evaluator (`mandelbulbDE` at mesh-export/algorithms/sdf-eval.ts:43, `kaliboxDE` at mesh-export/algorithms/sdf-eval.ts:69, `newtonProject` at mesh-export/algorithms/sdf-eval.ts:137, `projectMeshVertices` at mesh-export/algorithms/sdf-eval.ts:165) is exported but no file in `mesh-export/` imports it. Newton runs exclusively GPU via `gpuNewtonProject` (mesh-export/pipeline/mesh-pipeline.ts:564). `setActiveFormula` / `setActiveFormulaParams` (mesh-export/algorithms/sdf-eval.ts:32, 36) are never called. Either retire to `legacy/` or document the prototype-parity intent in a header comment.
- **Duplicated cancellation state**: two module-level `cancelRequested` flags (mesh-export/algorithms/dc-core.ts:218, mesh-export/algorithms/sparse-grid.ts:20). ExportPanel must reset and raise both (mesh-export/components/ExportPanel.tsx:8-9, 107, 129). Consolidation candidate.
- **`postProcessMesh` does not wire `mergeCloseVertices` or `ensureConsistentWinding`** (mesh-export/algorithms/mesh-postprocess.ts:105, 236) — only `removeDegenerateFaces` + `taubinSmooth` + `computeVertexNormals` run inside the pipeline at mesh-export/algorithms/mesh-postprocess.ts:273-296. Either expose them as `PostProcessOptions` flags or remove.
- **Soft-failing Newton has no result-side signal**: callers cannot distinguish "Newton was off" from "Newton crashed and was skipped" (mesh-export/pipeline/mesh-pipeline.ts:569-577). Consider returning a `newtonApplied` flag in `MeshPipelineResult` similar to `smoothingSkipped`.
- **`ExportPanel.handleGenerate` does not call `resetMeshResult`** — only nulls `lastMesh`/`lastBlob` (mesh-export/components/ExportPanel.tsx:104-105). Log entries and memory blocks from the previous run survive into the next generate. Minor, but inconsistent with the formula-change path which clears everything via mesh-export/store/meshExportStore.ts:335-339.
- **`resetMeshResult` does not reset `useNarrowBand`** (compare the `setTimings` shape at mesh-export/store/meshExportStore.ts:332 against `resetMeshResult` at mesh-export/store/meshExportStore.ts:335-339) — the flag carries over from the previous run.
- **`loadGMFIntoStore` reachable from auto-load without a preceding `resetMeshResult`** (mesh-export/components/MeshExportApp.tsx:24). Safe today because `lastMesh` is null at mount, but a leak if auto-load ever runs more than once per tab.

## Historical context

This module doc **supersedes `docs/gmt/30_Mesh_Export_Prototype.md`** (preserved as the original prototype-era reference). That doc described an entirely different architecture: "plain HTML + 8 ES2020 scripts under `public/mesh-export/`", no bundler, no React, no Zustand store, CPU Newton path live, and shader composition done locally in a `formula-system.js` file. The current implementation is a TypeScript + React + Zustand + Vite app at top-level `mesh-export/` with 23 files across `algorithms/`, `gpu/`, `pipeline/`, `preview/`, `store/`, `components/`; shader composition has been promoted into engine-gmt (`ShaderFactory.generateMeshSDFLibrary` + the `SDFShaderBuilder` family) so the mesh path and the main render path share builders; the CPU Newton path is no longer wired and `sdf-eval.ts` is a holdover; and two orthogonal quality axes (`estimator` 0-5, `distanceMetric` 0-3) plus a third "Escape Test" cavity-fill mode have been added since the prototype.

Preservable signal from the old doc (still accurate as design intent and well worth reading there for the rationale):

> 6-phase pipeline overview and ordering; DE-type auto-detection rules (custom/ifs/power) + IFS iso-threshold trick; power-fractal escape sentinel; sign-compression technique (~3 GB-at-2048³ rescue); block-sparse storage scheme + V8 2²⁴ entry limit workaround; GLB FLOAT VEC4 color decision (C4D compatibility); VDB binary format documentation (half-float density + optional vec3s color, byte-layout differences); memory-budget table at 20 M vertices; smoothing-skip 5 M threshold; shared sampling helpers + Z sub-slice averaging; known-limitations roadmap.

The 6-phase pipeline (now described as five named phases in this doc) and the named techniques (IFS iso-threshold, escape sentinel, sign compression, block-sparse storage, GLB FLOAT VEC4, VDB binary format) are all still implemented as described in the old doc — only the surrounding plumbing (HTML+scripts → React+TS, local `formula-system.js` → engine-gmt builders) has changed. The 20 M-vertex memory-budget table and the "1600/1600 currently compile" baseline are prototype-era numbers; they have not been re-measured for 2048³ runs on the current code.

Also referenced: `docs/gmt/24_Formula_Interlace_System.md` for the `interlaceCompiled` contract and for the note that the mesh-export interlace path is a parallel branch of the main-app interlace and the two must be kept in sync.
