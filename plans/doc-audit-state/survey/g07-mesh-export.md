---
subsystem_id: g07-mesh-export
audited_at: 2026-05-20T00:00:00Z
files:
  - path: mesh-export/main.tsx
    blob_sha: 4011b0f2e40af3f1fc7fd89cf81c0536fe1e8a2d
    lines_read: [1, 15]
  - path: mesh-export/pipeline/types.ts
    blob_sha: 5bafeef9ad3619c84c4794f99a7e3a205c0a8a89
    lines_read: [1, 79]
  - path: mesh-export/pipeline/mesh-pipeline.ts
    blob_sha: 00190e8beb49a925ef781e78fb0e70f83e00f229
    lines_read: [1, 820]
  - path: mesh-export/store/meshExportStore.ts
    blob_sha: d87d3b9d41cdcd4e4349d61e4e894fbd63edfcda
    lines_read: [1, 340]
  - path: mesh-export/algorithms/dc-core.ts
    blob_sha: 87e648cab15880773abfa26d4c174abcf0ba2c21
    lines_read: [1, 407]
  - path: mesh-export/algorithms/sparse-grid.ts
    blob_sha: 309a205ee8aca1d6a11d1a9de278e0e2890585af
    lines_read: [1, 550]
  - path: mesh-export/algorithms/sdf-eval.ts
    blob_sha: 4cb95937bb077a3d81c48dbb077a676cb0de2857
    lines_read: [1, 194]
  - path: mesh-export/algorithms/sdf-filter.ts
    blob_sha: 1b2ef5ff57d9400fbc306f2ace54bf65ec509f20
    lines_read: [1, 532]
  - path: mesh-export/algorithms/mesh-postprocess.ts
    blob_sha: 88ed52499684eb03ed22c7262ec881b6299698c5
    lines_read: [1, 297]
  - path: mesh-export/algorithms/mesh-writers.ts
    blob_sha: 90d8f6a955d28e19fa7fb23f95245e28821c6e82
    lines_read: [1, 329]
  - path: mesh-export/algorithms/vdb-writer.ts
    blob_sha: fc35a0edb9befea848b4b45497d51033dbbf3c5d
    lines_read: [1, 100]
  - path: mesh-export/gpu/gpu-pipeline.ts
    blob_sha: 840b39278b4b8c73bdc27929f871efd7735cabe8
    lines_read: [1, 1766]
  - path: mesh-export/preview/mesh-preview.ts
    blob_sha: 88bf5c4c8dae9e0a9132825246201e8d04d6cd96
    lines_read: [1, 105]
  - path: mesh-export/preview/preview-camera.ts
    blob_sha: 21479f280f8cd2c46c438c5fa055e90580b7bd22
    lines_read: [1, 147]
  - path: mesh-export/components/MeshExportApp.tsx
    blob_sha: 8da3b64067e16545840b4303f197a3d9543316b2
    lines_read: [1, 43]
  - path: mesh-export/components/MeshExportPage.tsx
    blob_sha: 86236912264fe8252f22f30ad7928085c0684e60
    lines_read: [1, 209]
  - path: mesh-export/components/ExportPanel.tsx
    blob_sha: 8b230b3f8b35c5fd350243f52442205fcb904a3e
    lines_read: [1, 243]
  - path: mesh-export/components/PipelineControls.tsx
    blob_sha: 15fd8fcbeb32a5b17c7c22ec6d429eb74dccfe9a
    lines_read: [1, 235]
  - path: mesh-export/components/FormulaSelector.tsx
    blob_sha: ae650feb78e71eccc10fffec6831af942a4e30b9
    lines_read: [1, 80]
  - path: mesh-export/components/PreviewCanvas.tsx
    blob_sha: 801b2ff07fac130afa203fe3442b5eb81cfd93e1
    lines_read: [0, 0]
  - path: mesh-export/components/BoundsPanel.tsx
    blob_sha: 10f4008efdd7e39371633ed37c0989a36562a8b9
    lines_read: [0, 0]
  - path: mesh-export/components/FormulaParams.tsx
    blob_sha: 885eae263d26082e897ef1d380d4924913870c43
    lines_read: [0, 0]
  - path: mesh-export/components/ProgressPanel.tsx
    blob_sha: b45c3fb453b87d769b1149156955260da2c974f4
    lines_read: [0, 0]
---

## Public API surface

App-level entry:
- `MeshExportApp` (mesh-export/components/MeshExportApp.tsx:12) — mounted from `main.tsx:13`. Side-effect imports `app-gmt/registerFeatures` (MeshExportApp.tsx:10) to populate the shared `registry`/feature tables before any shader generation.
- `MeshExportPage` (components/MeshExportPage.tsx:136) — layout shell.

Pipeline entry points:
- `runMeshPipeline(params: MeshPipelineParams, ui: PipelineCallbacks): Promise<MeshPipelineResult>` (pipeline/mesh-pipeline.ts:91).
- `runExportMesh(format, lastMesh, lastBaseName, vdbParams: VDBExportParams, ui): Promise<ExportResult>` (pipeline/mesh-pipeline.ts:727).
- Cancellation: `requestCancel` / `resetCancel` exported from both `algorithms/dc-core.ts:220-221` and `algorithms/sparse-grid.ts:21-22` (two independent module-level flags; ExportPanel resets/raises both — ExportPanel.tsx:8-9, 107, 129).

GPU pipeline (mesh-export/gpu/gpu-pipeline.ts):
- `initWebGL` (:256), `setupSDFPipeline` (:283), `bindPipelineUniforms` (:405), `coarsePrePass` (:439), `sampleSliceWithSubZ` (:525), `sampleDenseGrid` (:617), `sampleSparseGrid` (:735), `generateVDB` (:866), `sampleEscapeTest` (:1266), `gpuNewtonProject` (:1428), `colorizeVerticesGPU` (:1547), `autoFitBounds` (:1689).
- `locateFormulaUniforms` (:272).

Algorithms:
- DC: `dualContour` (algorithms/dc-core.ts:238), `dualContourSparse` (algorithms/sparse-grid.ts:242), supporting growable arrays (`GrowableFloat32`, `GrowableUint32`), `EDGE_TABLE`, `solveQEF`, `sdfAt/sdfLerp/sdfGradient`, `gridToWorld/worldToGrid` (dc-core.ts:16-127).
- Sparse storage: `SparseSDFGrid` class + `buildNarrowBand` + `forEachBandBlock` (algorithms/sparse-grid.ts:34-236).
- Filters: `applyMinFeatureDense/Sparse`, `separableFilter`, `morphCloseDense/Sparse`, `cavityFillDense`, `cavityFillDilate` (algorithms/sdf-filter.ts:16-532).
- Post-process: `postProcessMesh`, `taubinSmooth`, `mergeCloseVertices`, `removeDegenerateFaces`, `computeVertexNormals`, `ensureConsistentWinding` (algorithms/mesh-postprocess.ts:83-296).
- Writers: `exportGLB` (mesh-writers.ts:119), `exportSTL` (:245), `estimateExportSize` (:306), `downloadBlob` (:321), `BinaryWriter` (:24).
- VDB: scalar half-float tree `createTree/addLeafBlock/optimizeTree/serializeVDB` and vec3s color tree `createVec3Tree/addVec3LeafBlock/optimizeVec3Tree/serializeMultiGridVDB`, plus `floatToHalf` / `BYTE_TO_HALF` (algorithms/vdb-writer.ts:67-79, 158-589). CPU `sdf-eval.ts` is exported but appears unused by the React pipeline (see Open questions).

Store + UI bridge:
- `useMeshExportStore` (store/meshExportStore.ts:205) — Zustand store, app-local (not shared with main `fractalStore`).
- `registerSlicePreview` / `unregisterSlicePreview` / `emitSlicePreview` (store/meshExportStore.ts:117-129) — module-scoped callback registry kept *outside* Zustand to avoid React re-renders on every slice tick.
- `loadGMFIntoStore` / `buildDefaultParams` (components/FormulaSelector.tsx:10, 39).

## Architecture

- App bootstraps as a standalone React tree: `main.tsx:10-15` mounts `MeshExportApp` under StrictMode. The first effect (`MeshExportApp.tsx:15-40`) reads a one-shot GMF blob from `localStorage['gmt-mesh-export-scene']` (the hand-off slot the main GMT app writes when the user picks Advanced → Mesh Export); on miss, it falls back to seeding `loadedDefinition` from `registry.get(selectedFormulaId)` (default `'Mandelbulb'` — store:207).
- Feature registration is *side-effect-imported* from app-gmt (`MeshExportApp.tsx:10`). This is the critical coupling that lets `ShaderFactory.generateMeshSDFLibrary` resolve DDFS feature `inject()` hooks the same way the main app does.
- Layout (MeshExportPage.tsx:136-208): three-column flex — left (ExportPanel + PipelineControls + BoundsPanel), centre (PreviewCanvas + ProgressPanel), right (FormulaSelector + iterations + FormulaParams + InterlaceControls). Donate widget pinned bottom-right (:67-134).
- Store (store/meshExportStore.ts:52-188) is one giant flat slice: formula + GMF + quality + pipeline config + bbox + runtime progress + last-mesh result + last-export-blob. No DDFS feature slices — quality settings live in `qualitySettings` (lines 34-50) and pipeline knobs live as individual flat fields (lines 64-87).
- Slice-preview wiring deliberately lives *outside* Zustand (store/meshExportStore.ts:111-129): the pipeline pushes ImageData via `emitSlicePreview`, the canvas registers via `registerSlicePreview`. This bypasses React rendering so 60Hz GPU readbacks don't trash store subscribers. PreviewCanvas is the sole consumer.
- ExportPanel is the orchestrator (components/ExportPanel.tsx:102-161): `handleGenerate` calls `runMeshPipeline`, `handleExport` calls `runExportMesh`, `handleCancel` calls `requestCancel` on both DC and sparse modules (:129). Param assembly (`buildParams`, :35-79) reads the store snapshot via `getState()` (not subscribed) and constructs `MeshPipelineParams` including the `MeshInterlaceConfig` if `interlaceState` is present (:52-60).
- `runMeshPipeline` (pipeline/mesh-pipeline.ts:91-695) is a single async function with five named phases, each in its own try/catch with `ui.checkCancel()` between them:
  - Phase 1 — GPU SDF (:209-322): chooses dense vs narrow-band by `useNarrowBand = N > 256` (:147). Narrow-band runs a 128³ coarse pass via `setupSDFPipeline`+`sampleDenseGrid`, calls `buildNarrowBand` (sparse-grid.ts:132), then a fine pass via `sampleSparseGrid`. Dense path runs `coarsePrePass` (gpu-pipeline.ts:439) to clip the Z range, then `sampleDenseGrid` (gpu-pipeline.ts:617). Both paths share IFS auto-threshold logic that detects all-positive DE and shifts the grid by `min + voxelSize*2` (lines 240-259 narrow-band, 306-321 dense, 378-397 inline filter phase).
  - Phase 1b — filters (:336-475): `cavityFillDilate` / `cavityFillDense` / `sampleEscapeTest` (escape mode only available with sparse path, :406-412), then `applyMinFeature{Dense,Sparse}`, then `morphClose{Dense,Sparse}`.
  - Phase 2 — DC (:482-542): `dualContourSparse` (narrow-band) or `dualContour` (dense), then frees the SDF/sparseGrid memory blocks.
  - Phase 3 — GPU Newton (:552-578): `gpuNewtonProject` (gpu-pipeline.ts:1428). Soft-failing — caught error logs warning but continues without projection (:569-577).
  - Phase 4 — post (:586-614): `postProcessMesh` (mesh-postprocess.ts:273). Smoothing auto-skips when `vertexCount > 5_000_000` (mesh-postprocess.ts:288-290) and `mesh-pipeline.ts:592` mirrors the threshold for the `smoothingSkipped` flag.
  - Phase 5 — colour (:622-647): `colorizeVerticesGPU` (gpu-pipeline.ts:1547). Recovers from a lost context by reinit (:628-631). Failures are non-fatal — mesh exports without vertex colours (:646).
- `runExportMesh` (pipeline/mesh-pipeline.ts:727-820) handles three formats. VDB is the odd one out: it bypasses the entire mesh pipeline, freshly `initWebGL`s a context, calls `generateVDB` (gpu-pipeline.ts:866), and force-loses the context on the way out (:782-784). GLB/STL just call `exportGLB`/`exportSTL` on the cached `lastMesh`.
- `generateVDB` (gpu-pipeline.ts:866-1255) streams 8 slices into `slabBuf[bs]` (line 906-907), and every 8th slice flushes the slab into VDB leaf blocks via `addLeafBlock` (:954). Optional `enableColor` path (:998-1210) walks active voxels by popcount, packs world positions into an RGBA32F texture, runs `buildMeshColorShader` once and scatters back per-leaf via `addVec3LeafBlock`. Batches cap at 2048×2048 voxels (:1021-1025).
- Shader composition uses `engine-gmt`'s `SDFShaderBuilder` family (`MESH_SDF_VERT`, `MESH_FORMULA_UNIFORMS`, `buildMeshEscapeShader`, `buildMeshNewtonShader`, `buildMeshColorShader`) plus `ShaderFactory.generateMeshSDFLibrary` (gpu-pipeline.ts:11-19, 299). The local helper `buildMeshShaderConfig` (gpu-pipeline.ts:33-55) constructs a minimal `ShaderConfig` with `interlaceCompiled: true` (line 44, marked CRITICAL — Interlace.inject() silently skips when false).
- Sparse DC (algorithms/sparse-grid.ts:242-550) is the memory-critical path: phase 1 fills `blockVertexTemp: Map<bk, {locals[], globals[]}>` then compacts to typed-array pairs and binary-searches by local index (:271-288); between phases it compresses Float32 SDF blocks to 1-bit sign maps and frees the floats progressively (:405-424). Edge dedup is per-block via `blockEdgeMaps: Map<bk, Uint8Array>` with 3-bit-per-cell flags (:291-307).
- `cavityFillDilate` (algorithms/sdf-filter.ts:296-532) is a 4-step BFS: build sign map → dilate interior by `radius` voxels → flood from boundary through non-dilated cells → fill unreachable positives. Two growable Int32 queues with separate caps (dilate keeps distance bytes, flood is coords-only). Sparse blocks' `floodVisited` map mirrors the allocation set so any visit outside the band is automatically a no-op via `if (!fv) continue` (:500-501).
- Preview (components/PreviewCanvas.tsx) is a 3-mode canvas (`fractal`/`slice`/`mesh`) that switches by pipeline state. Mode is selected from `isRunning`/`lastMesh`/`loadedDefinition` (lines 104-106) and pre-emptively cleared on Generate (ExportPanel.tsx:104-105: `setMesh(null,'')` + `setExportBlob(null,'')`). Camera math comes from `preview/preview-camera.ts` (orthographic basis + axis snap, lines 51-147); mesh wireframe drawing comes from `preview/mesh-preview.ts:58-105` with a `maxDraw = 150000` stride cap (line 84).
- `autoFitBounds` (gpu-pipeline.ts:1689-1765): one-shot 64³ probe inside `[-3,3]³`, threshold `< voxelSize*2`, returns centre + size with 15% padding (line 1750), used by BoundsPanel auto-fit.
- TypeScript-only path: legacy `algorithms/sdf-eval.ts` (194 lines, CPU mandelbulbDE/kaliboxDE/newtonProject) is exported but no longer imported by the pipeline — Newton runs exclusively GPU (`gpuNewtonProject`, gpu-pipeline.ts:1428). Holdover from prototype.

## Invariants and gotchas

- **`useNarrowBand = N > 256`** is hardcoded in `runMeshPipeline` (mesh-pipeline.ts:147). Dense path uses `coarsePrePass` Z-clipping; sparse path uses `buildNarrowBand` instead. The two paths have separate cavity-fill, min-feature, morph-close, and DC implementations.
- **Two cancellation flags**, one per module (`dc-core.ts:218` and `sparse-grid.ts:20`). ExportPanel must `requestCancel` + `requestCancelSparse` together (ExportPanel.tsx:129) and `resetCancel` + `resetCancelSparse` before each run (:107).
- **Interlace compile gate**: `buildMeshShaderConfig` must set `interlaceCompiled: true` when an interlace config exists, or `Interlace.inject()` silently no-ops (gpu-pipeline.ts:44, commented CRITICAL).
- **IFS auto-threshold**: triggers when `negCount === 0 && sdfMin > 0 && sdfMin < 10.0`, shifts SDF by `sdfMin + voxelSize*2` (mesh-pipeline.ts:378-397, 240-259, 306-321). Surface threshold may be auto-overridden for IFS regardless of user setting (:122-132 — estimator 2 “Pseudo Raw” is overridden to 1 for IFS).
- **Smoothing cliff at 5M vertices**: `postProcessMesh` skips Taubin (mesh-postprocess.ts:288-290) because `buildAdjacency` allocates one `Set` per vertex (line 27-28 warning comment). `mesh-pipeline.ts:592` independently sets the `smoothingSkipped` flag using the same threshold.
- **Degenerate-face removal also gated at 5M faces** (mesh-postprocess.ts:281-283) — uses `Array.push`, would blow the heap above that.
- **GLB colour encoding**: vertex colours stored as `FLOAT VEC4` (16 bytes/vertex), not `UNSIGNED_BYTE` normalized — comment cites Cinema 4D / older Blender bugs (mesh-writers.ts:110-117, 132-134). A PBR material with `baseColorFactor: [1,1,1,1]` is required for vertex colours to actually show in DCC apps (:180-189).
- **STL streaming**: triangles encoded in 64K-face chunks (~3.2 MB each) into a `BlobPart[]` (mesh-writers.ts:259-296) to avoid the browser's ~2 GB single-allocation cap.
- **VDB encodes density as half-float**: scalar tree is `Tree_float_5_4_3_HalfFloat` via `floatToHalf` LUT (vdb-writer.ts:67-79). Vec3 colour tree is `Tree_vec3s_5_4_3` (full float32 per channel). `serializeMultiGridVDB` is destructive — frees leaf data during serialization to reduce peak memory (called from gpu-pipeline.ts:1229).
- **Slice preview is registry-based, not store-based** (store/meshExportStore.ts:111-129). If you wire a second consumer, the second `registerSlicePreview` call overwrites the first — there's no fan-out.
- **PreviewCanvas reads bbox/params from `getState()` inside callbacks**, with reactive subscriptions only used as a re-render trigger (PreviewCanvas.tsx:107-114). Reason given in the file header (lines 5-7): avoids stale-closure bugs in the useCallback chain.
- **WebGL context survives the mesh pipeline** (mesh-pipeline.ts:676-683 returns `gl`); cleanup is only forced on the error path (:686-693). Colour pass reinits GL if the context died mid-run (:628-631).
- **VDB path always builds a new GL context** and force-loses it after (`runExportMesh`, mesh-pipeline.ts:767, :782-784). Does *not* share the mesh pipeline's context.
- **MEM_COLORS is a hand-rolled palette** in ExportPanel.tsx:13-16, threaded through `PipelineCallbacks.MEM_COLORS` (pipeline/types.ts:19) so the pipeline can call `ui.memAlloc(id, label, mb, ui.MEM_COLORS.sdfGrid)` without importing the UI palette directly.
- **Custom resolution allowed**: PipelineControls (PipelineControls.tsx:97-107) exposes a freeform 16–8192 input alongside the preset dropdown; resolutions that aren't in the preset list show as `${N}³ (custom)`.
- **Quality estimator 5 (Cutting Plane)** is gated on `loadedDef?.shader.supportsCuttingPlane` (PipelineControls.tsx:22, 38). Other estimators always available.

## Drift from existing doc (dev/docs/gmt/30_Mesh_Export_Prototype.md)

| Topic | Existing doc (2026-04-08) | Current code (2026-05-20) | Recommendation |
|---|---|---|---|
| Location & runtime | "Located in `public/mesh-export/` — `index.html` loads 8 JS modules via `<script>` tags. No bundler, no React — plain HTML + ES2020 scripts." (30_Mesh_Export_Prototype.md:5-6) | TypeScript React app at `mesh-export/`, mounted from `main.tsx:10-15` via `MeshExportApp`, served by Vite. Side-effect imports `app-gmt/registerFeatures` (MeshExportApp.tsx:10). | Rewrite intro — the prototype's HTML/script-tag architecture is gone. New doc should anchor to `mesh-export/main.tsx` and the directory tree (`algorithms/`, `gpu/`, `pipeline/`, `preview/`, `store/`, `components/`). |
| File table | Lists `.js` files in `public/mesh-export/`, e.g. `dc-core.js ~370`, `formula-system.js ~550`, `mesh-export.html ~400`. | All ported to TypeScript under `mesh-export/`. `formula-system.js` is gone — its responsibilities live in `engine-gmt/engine/SDFShaderBuilder.ts` + `ShaderFactory.generateMeshSDFLibrary` (imported at gpu-pipeline.ts:11-19). New files: `sdf-filter.ts` (532 lines), `vdb-writer.ts` (631 lines), `gpu-pipeline.ts` (1766 lines — much bigger than the old 300-line version since VDB + colour + escape + autoFit folded in), `pipeline/mesh-pipeline.ts` (820 lines as orchestrator), `store/meshExportStore.ts` (340 lines, Zustand), and 9 React components. | Replace the file table with the 23-file inventory by tier (algorithms/gpu/pipeline/preview/store/components). Note that `sdf-eval.ts` is the lone CPU SDF holdover and may be dead code (see Open questions). |
| Shader composition | Describes `buildSDFFrag(config, deSamples)` assembling `GLSL_UNIFORMS + GLSL_HELPERS + shaderPreamble + shaderFunction + shaderInit + shaderLoop + shaderDist` locally in `formula-system.js`. | Composition has moved to engine-gmt: `ShaderFactory.generateMeshSDFLibrary(buildMeshShaderConfig(...))` produces the library, then mesh-export wraps it with a local fragment template that adds `uSurfaceThreshold` plus the supersampling main (gpu-pipeline.ts:283-401). The local `buildMeshShaderConfig` (:33-55) is where interlace gets wired. | Re-document the new shader plumbing: mesh-export consumes engine-gmt builders, supplies its own SS loop in main, threads `quality.estimator` and `quality.distanceMetric` through `buildMeshShaderConfig`. Reference `docs/gmt/24_Formula_Interlace_System.md` for the `interlaceCompiled` invariant. |
| Phase 3 Newton | "CPU Path (builtins only): For Mandelbulb and KaliBox, the formula is implemented in JavaScript (`sdf-eval.js`) using float64." (30_Mesh_Export_Prototype.md:123-124) | CPU path no longer wired. `runMeshPipeline` calls only `gpuNewtonProject` (mesh-pipeline.ts:564). `sdf-eval.ts` is exported but no callers; only `setActiveFormula`/`setActiveFormulaParams` would activate it (sdf-eval.ts:32-38) and nobody calls them. | Drop the CPU Newton section; replace with a note that `sdf-eval.ts` is a prototype-era CPU evaluator retained but unused (orphan-sweep candidate). Document GPU Newton's MRT setup (gpu-pipeline.ts:1472-1477) and the texture-size memory warning (texW = ceil(sqrt(vertexCount))). |
| Colour grids / VDB | Mentions optional `Cd` vec3s grid with format quirks. Doc reflects code shape but predates the batched-by-leaf colour pass cap at 2048×2048 voxels and the popcount-based active-voxel count. | Implementation matches doc but adds: max batch dim from `gl.getParameter(MAX_TEXTURE_SIZE)` capped to 2048 (gpu-pipeline.ts:1021-1025), preallocated `posData`/`colPixels`/`batchVdbIdx`/`batchLeafIdx` per batch (:1048-1058), and `vdbColor` boolean stored in the Zustand store (store:81, 234) wired through `runExportMesh` (mesh-pipeline.ts:780). | Update VDB section to mention the batched colour pass details and the destructive serialization (`serializeMultiGridVDB` frees leaf data — gpu-pipeline.ts:1235-1237). |
| Cavity fill | Doc covers dense and sparse, but doesn't surface the "escape test" mode. | `sampleEscapeTest` (gpu-pipeline.ts:1266) runs a GPU escape-shader, returns a per-block bit map, which the pipeline uses to flip positive cells negative (mesh-pipeline.ts:406-425). Only available when narrow-band is active (sparse + GL present). UI exposes it as `Cavity Fill = "Escape Test"` (PipelineControls.tsx:168). | Add an "Escape Test" subsection. Note narrow-band-only constraint. |
| Surface threshold + estimator | Doc treats DE type as a single switch (power/ifs/custom). | Two new orthogonal axes: `qualitySettings.estimator` (0-5) and `qualitySettings.distanceMetric` (0-3), threaded all the way to the SDF/escape/Newton/colour shaders via `quality` arg (gpu-pipeline.ts:36-55, 291). `surfaceThreshold` is per-run user override (store:37) but can be auto-raised for IFS fractals (mesh-pipeline.ts:122-132, 240-259, 306-321). Estimator 2 ("Pseudo Raw") is force-overridden to 1 for IFS (:128-132). | Add a Quality section explaining the six estimators, four distance metrics, the IFS estimator-2 override, and the auto-threshold heuristics (one in each of the three places they fire). |
| Preview canvas | "preview canvas (512×512) supports three modes ... wireframe visualization of the generated mesh." | Mode is selected by `isRunning`/`lastMesh`/`loadedDefinition` (PreviewCanvas.tsx:104-106). All draw callbacks read state via `useMeshExportStore.getState()` (the file header lines 5-7 explicitly call this out as a stale-closure mitigation). Slice preview uses an out-of-store callback registry (store/meshExportStore.ts:111-129). | Document the registry-based slice-preview hand-off and the deliberate use of `getState()` for non-reactive reads — this is a non-obvious pattern when porting components. |
| Cancellation | "Sets `cancelRequested = true`, which is checked at every async yield point." | True, but the flag lives in *two* module-level globals (`dc-core.ts:218`, `sparse-grid.ts:20`). ExportPanel must reset and raise both (ExportPanel.tsx:8-9, 107, 129). | Note the duplicated cancel state — a refactor candidate. |
| Memory budget table | Numbers calibrated to 20M verts / 768³ on the prototype path. | Largely still accurate for the dense path; sparse path additionally has the bit-packed sign map (sparse-grid.ts:405-424) and per-block edge dedup (:291-307) — both already in the doc. New: `MEM_COLORS` palette + `memAlloc/memFree` UI bookkeeping driven from `ProgressPanel`. | Update the memory budget table once if/when re-measured for 2048³ on the current code; otherwise mark numbers as prototype-era. |
| Auto-fit bounds | Doc mentions "Auto-fit button uses a coarse 64³ SDF probe." | Confirmed: `autoFitBounds` (gpu-pipeline.ts:1689-1765) — single-context, 6.0-wide search box, 15% padding, minimum size 0.5. Threading interlace + quality through. | Cite the function. Same shape as before. |

## Open questions

- Orphan-sweep candidate: mesh-export/algorithms/sdf-eval.ts — entire CPU SDF evaluator + `projectMeshVertices` (sdf-eval.ts:165-194). No file in `mesh-export/` imports it; Newton is GPU-only via `gpuNewtonProject` (mesh-pipeline.ts:564). `setActiveFormula`/`setActiveFormulaParams` (sdf-eval.ts:32-38) are never called. If retained, should be moved under a `legacy/` subdir or deleted; if kept for parity with prototype docs, that intent should be commented at the top.
- Orphan-sweep candidate: mesh-export/algorithms/dc-core.ts — `requestCancel`/`resetCancel`/cancelRequested (dc-core.ts:218-221). The dense DC path is still wired (`dualContour`, called from mesh-pipeline.ts:498), but the cancel pair is duplicated with the sparse version (sparse-grid.ts:20-22). Consolidating into a single `cancel` module would simplify ExportPanel.tsx:107-129 and make the two-flag reset less error-prone.
- Orphan-sweep candidate: mesh-export/algorithms/mesh-postprocess.ts — `mergeCloseVertices` (:105) and `ensureConsistentWinding` (:236). Not invoked from `postProcessMesh` (:273-297), which only runs `removeDegenerateFaces` + `taubinSmooth` + `computeVertexNormals`. Either re-enable them under an option or remove.
- Orphan-sweep candidate: mesh-export/algorithms/sdf-filter.ts — `separableFilter` (:46) is exported and used internally by `morphCloseDense` (:111) only. Not consumed externally; could be `function` instead of `export function`. Low priority.
- Orphan-sweep candidate: mesh-export/pipeline/mesh-pipeline.ts — `useNewton` (params field, types.ts:26) and `newtonSteps` (:27) are read at mesh-pipeline.ts:552-578 but the soft-failure path (lines 569-577) means callers cannot reliably tell whether Newton ran. Consider returning a `newtonApplied` flag in `MeshPipelineResult` so the UI can surface it, similar to `smoothingSkipped`.
- Open: store/meshExportStore.ts `lastMesh` retains the GPU vertex/index/normal/colour buffers as a single object (line 100, 254). When a new generate starts, ExportPanel clears it explicitly (ExportPanel.tsx:104). If a tab is left open with a 20M-vertex mesh, the store holds ~1 GB indefinitely — should `resetMeshResult` (store:335-339) also be called on formula change?
- Open: mesh-export/components/PreviewCanvas.tsx (916 lines, not fully read). This file is the largest component by 4× and combines three rendering modes, camera math, and bbox handle dragging. Doc audit should not deep-read it, but a future split candidate is the bbox handle layer vs SDF preview vs mesh wireframe.
