# Archive — Historical Documentation

These documents capture design decisions, completed work, and superseded implementations.
For current documentation, start at [DOCS_INDEX.md](../DOCS_INDEX.md).

## Completed / Reference

| File | Topic | Status |
|------|-------|--------|
| [09_Mapping_Modes_Report.md](09_Mapping_Modes_Report.md) | Color mapping mode decoupling proposal | Implemented |
| [10_Shader_Architecture_Refactor.md](10_Shader_Architecture_Refactor.md) | ShaderBuilder pattern, DDFS overhaul | Implemented — still referenced by CLAUDE.md |
| [12_Vector_Uniform_Requirements.md](12_Vector_Uniform_Requirements.md) | Vec2/Vec3 uniform spec | Implemented in v0.8.5 |
| [context2.md](context2.md) | Project state snapshot | Historical snapshot (March 2026) |

## Frag Importer History

The importer went through three generations: V1 (regex), V2 (AST), V3 (current).
For current status, see [21_Frag_Importer_Current_Status.md](../21_Frag_Importer_Current_Status.md).

| File | Topic | Status |
|------|-------|--------|
| [11_Fragmentarium_Conversion.md](11_Fragmentarium_Conversion.md) | Early .frag → GMF conversion guide | **Superseded** by docs 21, 22, 25 |
| [14_Fragmentarium_Examples_Analysis.md](14_Fragmentarium_Examples_Analysis.md) | Pattern catalog from 100+ .frag files | Reference material (patterns now handled by V3) |
| [19_GLSL_Parser_Integration_Summary.md](19_GLSL_Parser_Integration_Summary.md) | @shaderfrog/glsl-parser PoC | **Superseded** — parser integrated in V3 |
| [20_Fragmentarium_Importer_Formula_Analysis.md](20_Fragmentarium_Importer_Formula_Analysis.md) | V2 parser test matrix | **Superseded** by V3 test suite (64/64 passing) |
| [20_Fragmentarium_Importer_V2.md](20_Fragmentarium_Importer_V2.md) | V2 architecture documentation | **Superseded** by V3 — has own warning header |
