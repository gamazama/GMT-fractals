---
source: mesh-export/pipeline/mesh-pipeline.ts
lines: 1-820
last_verified_sha: 00190e8beb49a925ef781e78fb0e70f83e00f229
additional_sources:
  - mesh-export/main.tsx
  - mesh-export/pipeline/types.ts
  - mesh-export/store/meshExportStore.ts
audited: 2026-05-20T16:00:00Z
audited_by: claude-opus-4-7
public_api: []
depends_on:
  - g02-shader-pipeline
  - g01-renderer
---

# mesh-export — overview

Standalone tool: extracts 3D meshes (GLB / STL / VDB) from the GMT fractal SDF via dual-contouring on the GPU. Mounted as a separate page (`mesh-export.html`) but reuses the engine-gmt SDF shader composition. ~23 files across algorithms / gpu / pipeline / preview / store.

## Where to start

| If you're touching... | Read |
|---|---|
| Boot / entry | JSDoc on `mesh-export/main.tsx` |
| The 5-phase mesh pipeline (the load-bearing logic) | JSDoc on `mesh-export/pipeline/mesh-pipeline.ts` |
| Dual contouring | `mesh-export/algorithms/dc-core.ts` + `mesh-export/algorithms/sparse-grid.ts` |
| GPU SDF sampling | `mesh-export/gpu/*` |
| Preview canvas | `mesh-export/preview/*` |
| Engine-gmt shader integration | JSDoc on `engine-gmt/engine/ShaderBuilder.ts` (the `Mesh` variant emits a LIBRARY without #version/main; mesh-export wraps it) |

## Architecture (1-line summary)

`main.tsx` mounts the React UI → user picks formula → `runMeshPipeline()` in `pipeline/mesh-pipeline.ts` produces an in-memory mesh → the user then picks a format and `runExportMesh()` encodes + downloads it. Generate and export are two separate calls from `components/ExportPanel.tsx`, not one pass; the mesh is held in the store between them (`lastMesh`).

`runMeshPipeline` phases, as labelled by its own `ui.setPhase` / `[Phase n]` logs:

| Phase | What |
|---|---|
| 1 | GPU SDF sampling — dense below N≤256, coarse 128³ + narrow-band sparse above |
| 1b | SDF filtering — cavity fill, min-feature clamp, morphological closing (only if any is enabled) |
| 2 | Dual contouring — `dualContour` (dense) or `dualContourSparse` |
| 3 | Newton projection on GPU (optional; failure is non-fatal) |
| 4 | Post-processing — degenerate-face removal, Taubin smoothing, vertex normals |
| 5 | Vertex colouring on GPU (optional; failure is non-fatal, mesh ships uncoloured) |

Export (`runExportMesh`) is *not* a pipeline phase. GLB and STL encode the mesh from phase 4/5; **VDB does not use the mesh at all** — it re-samples the SDF from scratch via `generateVDB()` and writes a voxel grid, so VDB export ignores smoothing, Newton projection and every other mesh-stage setting.

The pipeline is entirely separate from the worker bucket-render path (ADR-0045).

## Historical context

The full file catalog + invariant list is archived at [`docs/history/audit-2026-05-20/archive/sibling-apps/mesh-export-catalog.md`](../../audit-2026-05-20/archive/sibling-apps/mesh-export-catalog.md). Pre-audit doc at `docs/history/gmt/30_Mesh_Export_Prototype.md` is the original design doc — kept as a historical record but doesn't reflect current TypeScript implementation (was the HTML+ES2020-scripts prototype).

Cross-cutting decisions:
- ADR-0045 — export pipeline runs separate from bucket render
- ADR-0043 — 17-position shader assembly (mesh-export depends on the engine-gmt ShaderBuilder's Mesh variant emitting a library shape)
- Engine-gmt shader rules: [`docs/policy/engine-fork-rules.md`](../../policy/engine-fork-rules.md)
