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

`main.tsx` mounts the React UI → user picks formula → `pipeline/mesh-pipeline.ts` runs the 5-phase pipeline (init → sample SDF on GPU → dual-contour → post-process → export GLB/STL/VDB) → writes the result to disk. The pipeline is entirely separate from the worker bucket-render path (ADR-0045).

## Historical context

The full file catalog + invariant list is archived at [`docs/audit-2026-05-20/archive/sibling-apps/mesh-export-catalog.md`](../../audit-2026-05-20/archive/sibling-apps/mesh-export-catalog.md). Pre-audit doc at `docs/gmt/30_Mesh_Export_Prototype.md` is the original design doc — kept as a historical record but doesn't reflect current TypeScript implementation (was the HTML+ES2020-scripts prototype).

Cross-cutting decisions:
- ADR-0045 — export pipeline runs separate from bucket render
- ADR-0043 — 17-position shader assembly (mesh-export depends on the engine-gmt ShaderBuilder's Mesh variant emitting a library shape)
- Engine-gmt shader rules: [`docs/policy/engine-fork-rules.md`](../../policy/engine-fork-rules.md)
